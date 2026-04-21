import { Component, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { IdentityCore } from '../../core/providers/identity.provider';
import { LoadingBridge } from '../../core/providers/loading.service';
import { UIMessenger } from '../../core/providers/alert.provider';

@Component({
  standalone: false,
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
})
export class LoginPage implements OnInit {
  readonly loginForm = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]]
  });

  biometricQuickAccess = false;
  submitting = false;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private IdentityCore: IdentityCore,
    private LoadingBridge: LoadingBridge,
    private UIMessenger: UIMessenger
  ) {}

  async ngOnInit(): Promise<void> {
    await this.handleGoogleRedirectLogin();
    await this.checkBiometricQuickAccess();
  }

  async onSubmit(): Promise<void> {
    if (this.loginForm.invalid || this.submitting) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.submitting = true;
    await this.LoadingBridge.show('Iniciando sesión...');
    try {
      const { email, password } = this.loginForm.getRawValue();
      await this.IdentityCore.loginWithEmail(email, password);
      await this.router.navigate(['/home']);
    } catch (error) {
      await this.UIMessenger.showError(this.getErrorMessage(error));
    } finally {
      this.submitting = false;
      await this.LoadingBridge.hide();
    }
  }

  async loginWithGoogle(): Promise<void> {
    if (this.submitting) {
      return;
    }

    this.submitting = true;
    await this.LoadingBridge.show('Conectando con Google...');
    try {
      const result = await this.IdentityCore.startGoogleLogin();
      if (result === 'redirecting') {
        return;
      }
      await this.router.navigate(['/home']);
    } catch (error) {
      await this.UIMessenger.showError(this.getErrorMessage(error));
    } finally {
      this.submitting = false;
      await this.LoadingBridge.hide();
    }
  }

  async loginWithBiometric(): Promise<void> {
    if (!this.biometricQuickAccess || this.submitting) {
      return;
    }

    this.submitting = true;
    await this.LoadingBridge.show('Validando biometría...');
    try {
      await this.IdentityCore.loginWithBiometric();
      await this.router.navigate(['/home']);
    } catch (error) {
      await this.UIMessenger.showError(this.getErrorMessage(error));
    } finally {
      this.submitting = false;
      await this.LoadingBridge.hide();
    }
  }

  goToRegister(): void {
    void this.router.navigate(['/register']);
  }

  controlHasError(controlName: 'email' | 'password', errorName: string): boolean {
    const control = this.loginForm.controls[controlName];
    return control.touched && control.hasError(errorName);
  }

  private async checkBiometricQuickAccess(): Promise<void> {
    try {
      this.biometricQuickAccess = await this.IdentityCore.canUseBiometricLogin();
    } catch {
      this.biometricQuickAccess = false;
    }
  }

  private async handleGoogleRedirectLogin(): Promise<void> {
    const hash = window.location.hash || '';
    if (!hash.includes('id_token') && !hash.includes('error=')) {
      return;
    }

    this.submitting = true;
    await this.LoadingBridge.show('Completando acceso con Google...');
    try {
      const user = await this.IdentityCore.handleGoogleRedirectResult();
      if (user) {
        await this.router.navigate(['/home']);
      }
    } catch (error) {
      await this.UIMessenger.showError(this.getErrorMessage(error));
    } finally {
      this.submitting = false;
      await this.LoadingBridge.hide();
    }
  }

  private getErrorMessage(error: unknown): string {
    if (error instanceof Error && error.message) {
      return error.message;
    }
    return 'No fue posible iniciar sesión.';
  }
}
