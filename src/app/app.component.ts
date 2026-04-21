import { Component, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { IdentityCore } from './core/providers/identity.provider';
import { SignalBridge } from './core/providers/signal.provider';
import { BiometricCore } from './core/providers/biometric.service';
import { App } from '@capacitor/app';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: false,
})
export class AppComponent implements OnDestroy {
  private readonly authSubscription: Subscription;

  constructor(
    private IdentityCore: IdentityCore,
    private SignalBridge: SignalBridge,
    private BiometricCore: BiometricCore
  ) {
    this.authSubscription = this.IdentityCore.currentUser$.subscribe((user) => {
      if (user) {
        void this.SignalBridge.initPushNotifications(user.uid);
        // Verificar bloqueo biométrico inicial si ya está autenticado
        void this.checkInitialLock();
        return;
      }

      void this.SignalBridge.clearPushSession();
    });

    this.initAppListeners();
  }

  private initAppListeners(): void {
    App.addListener('appStateChange', async ({ isActive }: { isActive: boolean }) => {
      if (isActive) {
        await this.checkInitialLock();
      }
    });
  }

  private async checkInitialLock(): Promise<void> {
    const user = this.IdentityCore.getCurrentUser();
    if (!user) return;

    const isEnabled = this.BiometricCore.isBiometricEnabled();
    if (!isEnabled) return;

    try {
      console.log('[AppLock] Solicitando validación biométrica para acceso rápido...');
      await this.BiometricCore.performSecurePaymentValidation(0, 'Acceso a la Billetera');
    } catch (error) {
      console.error('[AppLock] Fallo en la validación biométrica:', error);
      // Si falla, podrías forzar logout o pedir PIN, pero por ahora solo logueamos
      // El requerimiento dice "opcional pero recomendado".
    }
  }

  ngOnDestroy(): void {
    this.authSubscription.unsubscribe();
  }
}
