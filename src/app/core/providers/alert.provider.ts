import { Injectable, inject } from '@angular/core';
import { AlertController, ToastController } from '@ionic/angular';

@Injectable({
  providedIn: 'root'
})
export class UIMessenger {

  private alertCtrl = inject(AlertController);
  private toastCtrl = inject(ToastController);

  /**
   * Blast Alert Signal
   */
  async show(msg: string): Promise<void> {
    const toast = await this.toastCtrl.create({
      message: msg,
      duration: 2000,
      position: 'top',
      cssClass: 'nova-toast'
    });
    await toast.present();
  }

  async showSuccess(msg: string): Promise<void> {
    const toast = await this.toastCtrl.create({
      message: `✅ ${msg}`,
      duration: 3000,
      position: 'bottom',
      color: 'success',
      cssClass: 'nova-toast-success'
    });
    await toast.present();
  }

  async showError(msg: string): Promise<void> {
    const toast = await this.toastCtrl.create({
      message: `❌ ${msg}`,
      duration: 4000,
      position: 'bottom',
      color: 'danger',
      cssClass: 'nova-toast-error'
    });
    await toast.present();
  }

  async confirm(header: string, message: string): Promise<boolean> {
    return new Promise(async (resolve) => {
      const alert = await this.alertCtrl.create({
        header,
        message,
        cssClass: 'nova-alert',
        buttons: [
          { text: 'CANCEL', role: 'cancel', handler: () => resolve(false) },
          { text: 'CONFIRM', handler: () => resolve(true) }
        ]
      });
      await alert.present();
    });
  }
}
