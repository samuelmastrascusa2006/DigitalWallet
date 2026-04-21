import { Component, OnInit, OnDestroy } from '@angular/core';
import { ModalController, AlertController } from '@ionic/angular';
import { BiometricCore, BiometricAvailability } from '../../../core/providers/biometric.service';
import { VaultEngine, PaymentRequest, PaymentResult } from '../../../core/providers/vault.provider';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

export interface PaymentConfirmationData {
  paymentRequest: PaymentRequest;
  biometricEnabled: boolean;
  userId: string;
}

@Component({
  selector: 'app-payment-confirmation',
  templateUrl: './payment-confirmation.component.html',
  styleUrls: ['./payment-confirmation.component.scss']
})
export class PaymentConfirmationComponent implements OnInit, OnDestroy {

  paymentRequest!: PaymentRequest;
  biometricEnabled = false;
  userId!: string;

  // Estados
  isLoading = false;
  isProcessing = false;
  biometricAvailable: BiometricAvailability | null = null;
  biometryTypeLabel = 'Biometría';
  paymentResult: PaymentResult | null = null;
  errorMessage: string | null = null;

  private destroy$ = new Subject<void>();

  constructor(
    private modalController: ModalController,
    private alertController: AlertController,
    private BiometricCore: BiometricCore,
    private VaultEngine: VaultEngine
  ) {}

  ngOnInit(): void {
    this.checkBiometricAvailability();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Verifica disponibilidad de biometría
   */
  private async checkBiometricAvailability(): Promise<void> {
    this.isLoading = true;
    try {
      const availability = await this.BiometricCore.checkBiometricAvailability();
      this.biometricAvailable = availability;
      this.biometryTypeLabel = this.BiometricCore.getBiometryTypeLabel(availability.biometryType);
    } catch (error) {
      console.error('Error verificando biometría:', error);
      this.biometricAvailable = null;
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Formatea el monto con separador de miles
   */
  formatAmount(amount: number): string {
    return `$${amount.toLocaleString('es-CO')}`;
  }

  /**
   * Procesa el pago con validación biométrica
   */
  async confirmPaymentWithBiometric(): Promise<void> {
    this.isProcessing = true;
    this.errorMessage = null;

    try {
      // Validar pago primero
      const validation = await this.VaultEngine.validatePayment(this.paymentRequest);
      if (!validation.valid) {
        throw new Error(validation.error || 'Validación fallida');
      }

      // Procesar pago con biometría
      const result = await this.VaultEngine.processPayment(
        this.userId,
        this.paymentRequest,
        this.biometricEnabled,
        true // Requiere biometría
      );

      if (result.success) {
        this.paymentResult = result;
        // Mostrar éxito durante 2 segundos y cerrar
        await this.showSuccessAnimation();
        setTimeout(() => {
          this.closeModal(result);
        }, 2000);
      } else {
        throw new Error(result.error || 'Error desconocido');
      }

    } catch (error: any) {
      console.error('Error en pago:', error);
      this.errorMessage = error?.message || 'Error procesando el pago';
      this.isProcessing = false;

      // Si el usuario canceló la biometría, es un error diferente
      if (error?.message?.includes('cancel') || error?.message?.includes('Cancel')) {
        this.errorMessage = 'Validación biométrica cancelada';
      }
    }
  }

  /**
   * Intenta procesar sin biometría (si está disponible)
   */
  async confirmPaymentWithoutBiometric(): Promise<void> {
    const alert = await this.alertController.create({
      header: 'Confirmar sin Biometría',
      message: 'Estás intentando procesar un pago sin validación biométrica. ¿Deseas continuar?',
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Confirmar',
          handler: async () => {
            this.isProcessing = true;
            try {
              const validation = await this.VaultEngine.validatePayment(this.paymentRequest);
              if (!validation.valid) {
                throw new Error(validation.error || 'Validación fallida');
              }

              const result = await this.VaultEngine.processPayment(
                this.userId,
                this.paymentRequest,
                false,
                false
              );

              if (result.success) {
                this.paymentResult = result;
                await this.showSuccessAnimation();
                setTimeout(() => {
                  this.closeModal(result);
                }, 2000);
              } else {
                throw new Error(result.error || 'Error desconocido');
              }
            } catch (error: any) {
              this.errorMessage = error?.message || 'Error procesando el pago';
              this.isProcessing = false;
            }
          }
        }
      ]
    });

    await alert.present();
  }

  /**
   * Muestra animación de éxito
   */
  private async showSuccessAnimation(): Promise<void> {
    // Aquí se podría agregar animación con Anime.js
    // Por ahora solo esperamos
    return new Promise(resolve => setTimeout(resolve, 500));
  }

  /**
   * Cancela la operación y cierra el modal
   */
  cancelPayment(): void {
    this.closeModal(null);
  }

  /**
   * Cierra el modal con resultado
   */
  private closeModal(result: PaymentResult | null): void {
    this.modalController.dismiss(result);
  }

  /**
   * Reintentar en caso de error
   */
  async retryPayment(): Promise<void> {
    this.errorMessage = null;
    this.paymentResult = null;
    await this.confirmPaymentWithBiometric();
  }

  /**
   * Obtiene el icono según el estado
   */
  getStatusIcon(): string {
    if (this.paymentResult?.success) {
      return 'checkmark-circle';
    }
    if (this.errorMessage) {
      return 'close-circle';
    }
    return 'shield-checkmark';
  }

  /**
   * Obtiene el color según el estado
   */
  getStatusColor(): string {
    if (this.paymentResult?.success) {
      return 'success';
    }
    if (this.errorMessage) {
      return 'danger';
    }
    return 'primary';
  }
}
