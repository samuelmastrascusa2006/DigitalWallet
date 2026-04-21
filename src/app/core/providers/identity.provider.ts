import { Injectable, Injector, signal, inject } from '@angular/core';
import {
  Auth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User,
  GoogleAuthProvider,
  signInWithCredential,
  EmailAuthProvider,
  reauthenticateWithCredential
} from '@angular/fire/auth';
import { Capacitor } from '@capacitor/core';
import { GoogleSignIn, SignInResult } from '@capawesome/capacitor-google-sign-in';
import { NativeBiometric } from 'capacitor-native-biometric';
import { toObservable } from '@angular/core/rxjs-interop';
import { environment } from '../../../environments/environment';
import { ProfileManager } from './profile.provider';

@Injectable({
  providedIn: 'root'
})
export class IdentityCore {

  // Using Signals for modern state management
  private userState = signal<User | null>(null);
  public readonly currentUser = this.userState.asReadonly();
  public readonly currentUser$ = toObservable(this.userState);
  
  private readonly biometricAnchor = 'nova-vault-auth-v1';
  private googleEngineReady = false;

  private auth = inject(Auth);
  private injector = inject(Injector);

  constructor() {
    onAuthStateChanged(this.auth, (user) => {
      this.userState.set(user);
    });
  }

  /**
   * Sync Accessors for Legacy Support
   */
  getCurrentUser(): User | null {
    return this.auth.currentUser;
  }

  getCurrentUid(): string | null {
    return this.auth.currentUser?.uid || null;
  }

  /**
   * Authenticate via secure credentials
   */
  async loginWithEmail(email: string, pass: string): Promise<User> {
    this.verifySystemConfig();
    const result = await signInWithEmailAndPassword(this.auth, email, pass);
    return result.user;
  }

  /**
   * Initialize new identity sequence
   */
  async register(email: string, pass: string): Promise<User> {
    this.verifySystemConfig();
    const result = await createUserWithEmailAndPassword(this.auth, email, pass);
    return result.user;
  }

  /**
   * Google Nexus Auth Integration
   */
  async nexusGoogleAuth(token: string): Promise<User> {
    this.verifySystemConfig();
    if (!token?.trim()) throw new Error('ID_TOKEN_NULL');

    try {
      const cred = GoogleAuthProvider.credential(token);
      const res = await signInWithCredential(this.auth, cred);
      
      const profile = this.injector.get(ProfileManager);
      await profile.ensureUserProfileExists(
        res.user.uid,
        res.user.email || '',
        res.user.displayName || undefined
      );

      return res.user;
    } catch (err: any) {
      this.handleAuthFailure(err);
      throw err;
    }
  }

  async startGoogleLogin(): Promise<User | 'redirecting'> {
    this.verifySystemConfig();
    await this.prepareGoogleEngine();

    if (Capacitor.getPlatform() === 'web') {
      void GoogleSignIn.signIn();
      return 'redirecting';
    }

    const timeoutPromise = new Promise<never>((_, reject) => 
      setTimeout(() => reject(new Error('TIMEOUT: El servicio de Google no respondió. Verifica tu conexión o AdBlocker.')), 15000)
    );

    const result = await Promise.race([GoogleSignIn.signIn(), timeoutPromise]) as SignInResult;
    return this.processGoogleResult(result);
  }

  async handleGoogleRedirectResult(): Promise<User | null> {
    if (Capacitor.getPlatform() !== 'web' || !this.isRedirectActive()) return null;

    this.verifySystemConfig();
    await this.prepareGoogleEngine();

    const timeoutPromise = new Promise<never>((_, reject) => 
      setTimeout(() => reject(new Error('TIMEOUT: No se recibió respuesta de Google. Tu AdBlocker (McAfee/Blur) podría estar bloqueando el retorno de datos.')), 15000)
    );

    const result = await Promise.race([GoogleSignIn.handleRedirectCallback(), timeoutPromise]) as SignInResult;
    return this.processGoogleResult(result);
  }

  async logout(): Promise<void> {
    return signOut(this.auth);
  }

  async validateCurrentIdentity(pass: string): Promise<void> {
    const user = this.auth.currentUser;
    if (!user || !user.email) throw new Error('NO_ACTIVE_IDENTITY');
    
    const cred = EmailAuthProvider.credential(user.email, pass);
    await reauthenticateWithCredential(user, cred);
  }

  /**
   * Secure Biometric Integration
   */
  async activateBiometric(pass: string): Promise<void> {
    const user = this.auth.currentUser;
    if (!user || !user.email) throw new Error('NO_ACTIVE_IDENTITY');

    await this.validateCurrentIdentity(pass);
    await this.vaultBiometricKeys(user.email, pass);
  }

  async deactivateBiometric(): Promise<void> {
    if (!Capacitor.isNativePlatform()) return;
    await NativeBiometric.deleteCredentials({ server: this.biometricAnchor });
  }

  async canUseBiometricLogin(): Promise<boolean> {
    if (!Capacitor.isNativePlatform()) return false;
    const { isAvailable } = await NativeBiometric.isAvailable();
    if (!isAvailable) return false;

    try {
      await NativeBiometric.getCredentials({ server: this.biometricAnchor });
      return true;
    } catch { return false; }
  }

  async loginWithBiometric(): Promise<User> {
    if (!Capacitor.isNativePlatform()) throw new Error('NATIVE_REQUIRED');

    const { isAvailable } = await NativeBiometric.isAvailable();
    if (!isAvailable) throw new Error('BIOMETRIC_UNAVAILABLE');

    await NativeBiometric.verifyIdentity({
      reason: 'NovaVault Identity Verification',
      title: 'NovaVault'
    });

    const creds = await NativeBiometric.getCredentials({ server: this.biometricAnchor });
    const email = creds.username?.trim();
    const pass = creds.password;

    if (!email || !pass) throw new Error('KEYS_NOT_FOUND');
    return this.loginWithEmail(email, pass);
  }

  private async vaultBiometricKeys(email: string, pass: string): Promise<void> {
    if (!Capacitor.isNativePlatform()) throw new Error('NATIVE_REQUIRED');

    const normEmail = email.trim();
    if (!normEmail || !pass) throw new Error('INVALID_DATA');

    await NativeBiometric.setCredentials({
      username: normEmail,
      password: pass,
      server: this.biometricAnchor
    });
  }

  private async prepareGoogleEngine(): Promise<void> {
    if (this.googleEngineReady) return;

    const cid = environment.googleWebClientId?.trim();
    if (!cid || cid.includes('YOUR_')) throw new Error('GOOGLE_CONFIG_MISSING');

    const opts: any = { clientId: cid };
    if (Capacitor.getPlatform() === 'web') {
      opts.redirectUrl = environment.googleRedirectUrl?.trim() || `${window.location.origin}/login`;
    }

    await GoogleSignIn.initialize(opts);
    this.googleEngineReady = true;
  }

  private isRedirectActive(): boolean {
    const h = window.location.hash || '';
    return h.includes('id_token') || h.includes('error=');
  }

  private async processGoogleResult(res: SignInResult): Promise<User> {
    if (!res.idToken) throw new Error('TOKEN_NOT_RECEIVED');
    return this.nexusGoogleAuth(res.idToken);
  }

  private verifySystemConfig(): void {
    const cfg = environment.firebaseConfig;
    const values = [cfg.apiKey, cfg.authDomain, cfg.projectId, cfg.appId];

    if (values.some(v => !v || v.includes('YOUR_'))) {
      throw new Error('SYSTEM_NOT_CONFIGURED');
    }
  }

  private handleAuthFailure(err: any): void {
    console.error('[IdentityCore] Auth Failure:', err.code || err.message);
  }
}
