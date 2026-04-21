import { Injectable } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { PaymentConfirmationComponent } from '../../shared/components/payment-confirmation/payment-confirmation.component';
import { PaymentRequest, PaymentResult } from './vault.provider';

@Injectable({
  providedIn: 'root'
})
export class ModalService {

  constructor(private modalController: ModalController) {}

  /**
   * Abre un modal con el componente indicado
   */
  async open(component: any, componentProps?: any, cssClass?: string): Promise<any> {
    const modal = await this.modalController.create({
      component,
      componentProps,
      cssClass: cssClass || 'custom-modal',
      backdropDismiss: true
    });

    await modal.present();

    const { data } = await modal.onDidDismiss();
    return data;
  }

  /**
   * Abre el modal de confirmación de pago con biometría
   * 
   * @param paymentRequest - Datos del pago a confirmar
   * @param userId - ID del usuario realizando el pago
   * @param biometricEnabled - Si la biometría está habilitada
   * @returns Resultado del pago o null si se canceló
   */
  async openPaymentConfirmation(
    paymentRequest: PaymentRequest,
    userId: string,
    biometricEnabled: boolean = false
  ): Promise<PaymentResult | null> {
    const modal = await this.modalController.create({
      component: PaymentConfirmationComponent,
      componentProps: {
        paymentRequest,
        userId,
        biometricEnabled
      },
      cssClass: 'payment-confirmation-modal',
      backdropDismiss: false, // Evitar cierre accidental
      canDismiss: true
    });

    await modal.present();

    const { data } = await modal.onDidDismiss();
    return data || null;
  }

  /**
   * Cierra el modal activo
   */
  async dismiss(data?: any): Promise<void> {
    await this.modalController.dismiss(data);
  }
}
