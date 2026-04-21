import { Injectable, inject } from '@angular/core';
import { LoadingController } from '@ionic/angular';

@Injectable({
  providedIn: 'root'
})
export class LoadingBridge {

  private loadingCtrl = inject(LoadingController);
  private currentLoader: HTMLIonLoadingElement | null = null;

  /**
   * Activate Loading Overlay
   */
  async show(msg: string = 'INITIALIZING...'): Promise<void> {
    if (this.currentLoader) return;

    this.currentLoader = await this.loadingCtrl.create({
      message: msg,
      spinner: 'dots',
      cssClass: 'nova-loader'
    });

    await this.currentLoader.present();
  }

  /**
   * Deactivate Loading Overlay
   */
  async hide(): Promise<void> {
    if (this.currentLoader) {
      await this.currentLoader.dismiss();
      this.currentLoader = null;
    }
  }
}
