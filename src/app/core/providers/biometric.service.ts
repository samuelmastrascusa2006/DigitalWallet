import { Injectable, signal, inject } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { NativeBiometric } from 'capacitor-native-biometric';

export interface BiometricAvailability {
  isAvailable: boolean;
  biometryType?: any;
  error?: string;
}

@Injectable({
  providedIn: 'root'
})
export class BiometricCore {

  // Reactive state for biometric status
  private lockStatus = signal<boolean>(false);
  public readonly isEnabled = this.lockStatus.asReadonly();

  /**
   * Check Device Capability
   */
  isNativeDevice(): boolean {
    return Capacitor.isNativePlatform();
  }

  async checkBiometricAvailability(): Promise<BiometricAvailability> {
    if (!this.isNativeDevice()) {
      return { isAvailable: false, error: 'WEB_PLATFORM_UNSUPPORTED' };
    }

    try {
      const res = await NativeBiometric.isAvailable();
      return { 
        isAvailable: res.isAvailable,
        biometryType: res.biometryType 
      };
    } catch (err: any) {
      return { isAvailable: false, error: err.message };
    }
  }

  /**
   * Helper for UI Labels
   */
  getBiometryTypeLabel(type: any): string {
    if (!type) return 'Biometría';
    // Mapeo simple para la UI
    const typeStr = String(type).toLowerCase();
    if (typeStr.includes('face')) return 'Face ID';
    if (typeStr.includes('finger') || typeStr.includes('touch')) return 'Touch ID';
    return 'Biometría';
  }

  /**
   * Identity Verification Sequence
   */
  async performSecurePaymentValidation(amount: number, merchant: string): Promise<void> {
    if (!this.isNativeDevice()) return;

    await NativeBiometric.verifyIdentity({
      reason: `Authorize payment of ${amount} to ${merchant}`,
      title: 'NovaVault Security',
      subtitle: 'Identify yourself to proceed',
      description: 'Encrypted biometric verification'
    });
  }

  /**
   * State Management
   */
  isBiometricEnabled(): boolean {
    return this.lockStatus();
  }

  setBiometricEnabled(enabled: boolean): void {
    this.lockStatus.set(enabled);
  }
}
