import { Injectable } from '@angular/core';
import { AlertController } from '@ionic/angular';

@Injectable({
  providedIn: 'root'
})
export class DialogService {

  constructor(private alertController: AlertController) {}

  /**
   * Muestra un diálogo de confirmación con botones Aceptar/Cancelar
   */
  async confirm(header: string, message: string): Promise<boolean> {
    return new Promise(async (resolve) => {
      const alert = await this.alertController.create({
        header,
        message,
        buttons: [
          {
            text: 'Cancelar',
            role: 'cancel',
            handler: () => resolve(false)
          },
          {
            text: 'Aceptar',
            handler: () => resolve(true)
          }
        ]
      });

      await alert.present();
    });
  }

  /**
   * Muestra un diálogo informativo con solo botón OK
   */
  async alert(header: string, message: string): Promise<void> {
    const alert = await this.alertController.create({
      header,
      message,
      buttons: ['OK']
    });

    await alert.present();
  }

  /**
   * Muestra un diálogo con input para capturar texto (ej: contraseña para biometría)
   */
  async promptPassword(header: string, message: string): Promise<string | null> {
    return new Promise(async (resolve) => {
      const alert = await this.alertController.create({
        header,
        message,
        inputs: [
          {
            name: 'password',
            type: 'password',
            placeholder: 'Contraseña'
          }
        ],
        buttons: [
          {
            text: 'Cancelar',
            role: 'cancel',
            handler: () => resolve(null)
          },
          {
            text: 'Confirmar',
            handler: (data: any) => resolve(data.password)
          }
        ]
      });

      await alert.present();
    });
  }
}
