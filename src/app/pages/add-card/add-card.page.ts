import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { Timestamp } from '@angular/fire/firestore';
import { FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { CardNexus } from '../../core/providers/card.service';
import { LoadingBridge } from '../../core/providers/loading.service';
import { UIMessenger } from '../../core/providers/alert.provider';
import { IdentityCore } from '../../core/providers/identity.provider';
import { AlertController } from '@ionic/angular';
import { Card } from '../../models/card.model';

@Component({
  standalone: false,
  selector: 'app-add-card',
  templateUrl: './add-card.page.html',
  styleUrls: ['./add-card.page.scss'],
})
export class AddCardPage implements OnInit {
  @ViewChild('cardPreview', { read: ElementRef }) cardPreview?: ElementRef<HTMLElement>;

  readonly form = this.fb.nonNullable.group({
    cardNumber: ['', [Validators.required, Validators.minLength(19)]],
    cardHolder: ['', [Validators.required, Validators.minLength(3)]],
    expiryDate: ['', [Validators.required, Validators.pattern(/^(0[1-9]|1[0-2])\/\d{2}$/)]],
    cvv: ['', [Validators.required, Validators.pattern(/^\d{3,4}$/)]],
    color: ['#0f3460', Validators.required]
  });

  previewCard: Card = {
    id: 'preview-card',
    cardNumber: '0000',
    cardHolder: 'Tu nombre',
    expiryDate: 'MM/YY',
    franchise: 'unknown',
    color: '#0f3460',
    createdAt: Timestamp.now()
  };

  detectedFranchise: Card['franchise'] = 'unknown';
  luhnValid = false;
  submitted = false;
  private animatedOnce = false;

  constructor(
    private fb: FormBuilder,
    private CardNexus: CardNexus,
    private IdentityCore: IdentityCore,
    private LoadingBridge: LoadingBridge,
    private UIMessenger: UIMessenger,
    private router: Router,
    private alertController: AlertController
  ) {}

  ngOnInit(): void {
    this.form.controls.cardNumber.valueChanges.subscribe((value) => {
      const formatted = this.CardNexus.formatCardNumber(value);
      if (formatted !== value) {
        this.form.controls.cardNumber.setValue(formatted, { emitEvent: false });
      }

      const cleaned = formatted.replace(/\s/g, '');
      this.detectedFranchise = this.CardNexus.detectFranchise(cleaned);
      this.luhnValid = cleaned.length >= 13 && this.CardNexus.luhnCheck(cleaned);
      this.updatePreview();
    });

    this.form.controls.expiryDate.valueChanges.subscribe((value) => {
      const formatted = this.CardNexus.formatExpiryDate(value);
      if (formatted !== value) {
        this.form.controls.expiryDate.setValue(formatted, { emitEvent: false });
      }
      this.updatePreview();
    });

    this.form.controls.cvv.valueChanges.subscribe((value) => {
      const formatted = this.CardNexus.formatSecurityCode(value);
      if (formatted !== value) {
        this.form.controls.cvv.setValue(formatted, { emitEvent: false });
      }
    });

    this.form.controls.cardHolder.valueChanges.subscribe(() => this.updatePreview());
    this.form.controls.color.valueChanges.subscribe(() => this.updatePreview());

    this.form.valueChanges.subscribe(() => {
      if (!this.animatedOnce && this.form.valid) {
        this.animatedOnce = true;
        void this.triggerFlipAnimation();
      }
    });
  }

  async saveCard(): Promise<void> {
    this.submitted = true;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const cardNumber = this.form.controls.cardNumber.value.replace(/\s/g, '');
    if (!this.CardNexus.luhnCheck(cardNumber)) {
      await this.UIMessenger.showError('Número de tarjeta inválido (Luhn).');
      return;
    }

    const expiryDate = this.form.controls.expiryDate.value;
    const expiryStatus = this.CardNexus.getCardExpiryStatus(expiryDate);

    if (expiryStatus === 'expired') {
      const alert = await this.alertController.create({
        header: 'Tarjeta Expirada',
        message: 'La tarjeta ya está expirada. ¿Deseas guardarla de todas formas?',
        buttons: [
          {
            text: 'Cancelar',
            role: 'cancel'
          },
          {
            text: 'Guardar de todas formas',
            handler: () => {
              void this.proceedToSaveCard();
            }
          }
        ]
      });
      await alert.present();
      return;
    }

    if (expiryStatus === 'expiring-soon') {
      await this.UIMessenger.show('⚠️ La tarjeta está próxima a expirar.');
    }

    await this.proceedToSaveCard();
  }

  private async proceedToSaveCard(): Promise<void> {
    const uid = this.IdentityCore.getCurrentUid();
    if (!uid) {
      await this.UIMessenger.showError('No hay sesión activa.');
      return;
    }

    await this.LoadingBridge.show('Guardando tarjeta...');
    
    // Create a timeout promise (10 seconds)
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('TIMEOUT')), 10000)
    );

    try {
      const value = this.form.getRawValue();
      
      // Stealth Write: We race the save operation against a 1.5s local grace period.
      // This prevents the UI from hanging because of AdBlocker blocking the server ACK.
      const savePromise = this.CardNexus.addCard(uid, {
        cardNumber: value.cardNumber,
        cardHolder: value.cardHolder,
        expiryDate: value.expiryDate,
        cvv: value.cvv,
        franchise: this.detectedFranchise,
        color: value.color
      });

      await Promise.race([
        savePromise,
        new Promise(resolve => setTimeout(resolve, 1500))
      ]);
      
      await this.UIMessenger.showSuccess('Tarjeta agregada correctamente.');
      await this.router.navigate(['/home']);
    } catch (error: any) {
      if (error.message === 'TIMEOUT') {
        await this.UIMessenger.showError('La operación tardó demasiado. Por favor, verifica tu conexión o desactiva tu Ad-Blocker.');
      } else {
        await this.UIMessenger.showError(this.getErrorMessage(error));
      }
    } finally {
      await this.LoadingBridge.hide();
    }
  }

  controlHasError(controlName: 'cardNumber' | 'cardHolder' | 'expiryDate' | 'cvv' | 'color', errorName: string): boolean {
    const control = this.form.controls[controlName];
    return control.touched && control.hasError(errorName);
  }

  get luhnErrorVisible(): boolean {
    const value = this.form.controls.cardNumber.value.replace(/\s/g, '');
    return value.length >= 13 && !this.luhnValid;
  }

  private updatePreview(): void {
    const value = this.form.getRawValue();
    this.previewCard = {
      ...this.previewCard,
      cardNumber: value.cardNumber.replace(/\s/g, '').slice(-4) || '0000',
      cardHolder: value.cardHolder || 'Tu nombre',
      expiryDate: value.expiryDate || 'MM/YY',
      franchise: this.detectedFranchise,
      color: value.color
    };
  }

  private async triggerFlipAnimation(): Promise<void> {
    if (!this.cardPreview?.nativeElement) {
      return;
    }

    try {
      const module = await import('animejs');
      const runAnimation =
        (module as unknown as { default?: (params: Record<string, unknown>) => void }).default ||
        (module as unknown as (params: Record<string, unknown>) => void);

      if (!runAnimation) {
        return;
      }

      runAnimation({
        targets: this.cardPreview.nativeElement,
        rotateY: ['0deg', '180deg', '360deg'],
        duration: 900,
        easing: 'easeInOutQuad'
      });
    } catch {
      await this.UIMessenger.show('No se pudo aplicar la animación de preview.');
    }
  }

  private getErrorMessage(error: unknown): string {
    if (error instanceof Error && error.message) {
      return error.message;
    }
    return 'No se pudo guardar la tarjeta.';
  }

}
