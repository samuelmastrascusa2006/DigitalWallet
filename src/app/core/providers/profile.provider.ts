import { Injectable, inject } from '@angular/core';
import { DataConnector } from './nexus.provider';
import { UserProfile } from '../../models/user.model';
import { Observable } from 'rxjs';
import { Timestamp, setDoc } from '@angular/fire/firestore';

@Injectable({
  providedIn: 'root'
})
export class ProfileManager {

  private connector = inject(DataConnector);

  /**
   * Sync Profile from Cloud
   */
  getUserProfile(uid: string): Observable<UserProfile> {
    return this.connector.streamEntry<UserProfile>(`users/${uid}`);
  }

  /**
   * Commit New Profile
   */
  async createUserProfile(data: Omit<UserProfile, 'createdAt'>): Promise<void> {
    const payload: UserProfile = {
      ...data,
      biometricEnabled: false,
      createdAt: Timestamp.now()
    };
    const ref = this.connector.getEntry(`users/${data.uid}`);
    await setDoc(ref, payload);
  }

  /**
   * Update Profile Fragments
   */
  async updateUserProfile(uid: string, data: Partial<UserProfile>): Promise<void> {
    return this.connector.commitEntry(`users/${uid}`, data);
  }

  async toggleBiometric(uid: string, enabled: boolean): Promise<void> {
    return this.updateUserProfile(uid, { biometricEnabled: enabled });
  }

  async syncFcmToken(uid: string, token: string): Promise<void> {
    return this.updateUserProfile(uid, { fcmToken: token } as any);
  }

  /**
   * Ensure Persistence (Lazy Creation)
   */
  async ensureUserProfileExists(uid: string, email: string, name?: string): Promise<void> {
    try {
      const existing = await this.connector.getSnapshot<UserProfile>(`users/${uid}`);
      
      if (!existing) {
        console.log('[ProfileManager] No profile found. Initializing lazy creation...');
        const parts = name ? name.split(' ') : [];
        const first = parts[0] || 'User';
        const last = parts.slice(1).join(' ') || '';

        const payload: Omit<UserProfile, 'createdAt'> = {
          uid,
          nombre: first,
          apellido: last,
          email,
          tipoDocumento: 'CC',
          numeroDocumento: 'UNSET',
          pais: 'Global',
          biometricEnabled: false
        };

        await this.createUserProfile(payload);
      }
    } catch (err: any) {
      console.error('[ProfileManager] Persistence Failure:', err);
      if (err.message?.toLowerCase().includes('offline')) {
        throw new Error('No se pudo conectar con la base de datos de NovaVault. Por favor, desactiva cualquier AdBlocker (McAfee, Avira, Blur) para poder iniciar sesión.');
      }
      throw err;
    }
  }
}
