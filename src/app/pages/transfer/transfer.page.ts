import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { User } from '@angular/fire/auth';
import { Router } from '@angular/router';
import { Timestamp } from '@angular/fire/firestore';
import { Subscription, filter, firstValueFrom, take } from 'rxjs';
import { IdentityCore } from '../../core/providers/identity.provider';
import { CardNexus } from '../../core/providers/card.service';
import { UIMessenger } from '../../core/providers/alert.provider';
import { VaultEngine } from '../../core/providers/vault.provider';
import { Card } from '../../models/card.model';

@Component({
  standalone: false,
  selector: 'app-transfer',
  templateUrl: './transfer.page.html',
  styleUrls: ['./transfer.page.scss'],
})
export class TransferPage implements OnInit, OnDestroy {
  transferForm!: FormGroup;
  cards: Card[] = [];
  loading = true;
  processing = false;

  private uid: string | null = null;
  private cardsSub?: Subscription;

  constructor(
    private fb: FormBuilder,
    private IdentityCore: IdentityCore,
    private CardNexus: CardNexus,
    private UIMessenger: UIMessenger,
    private VaultEngine: VaultEngine,
    private router: Router
  ) {
    this.initializeForm();
  }

  async ngOnInit(): Promise<void> {
    await this.loadCards();
  }

  ngOnDestroy(): void {
    this.cardsSub?.unsubscribe();
  }

  private initializeForm(): void {
    this.transferForm = this.fb.group({
      cardId: ['', Validators.required],
      recipientAccount: ['', [Validators.required, Validators.minLength(10)]],
      amount: ['', [Validators.required, Validators.min(0.01)]],
      concept: ['Transferencia', Validators.required],
    });
  }

  private async loadCards(): Promise<void> {
    try {
      const user = await firstValueFrom(
        this.IdentityCore.currentUser$.pipe(
          filter((authUser: User | null): authUser is User => !!authUser),
          take(1)
        )
      );

      this.uid = user.uid;
      this.subscribeToCards();
    } catch (error) {
      this.loading = false;
      await this.UIMessenger.showError(this.getErrorMessage(error));
    }
  }

  private subscribeToCards(): void {
    if (!this.uid) {
      return;
    }

    this.cardsSub = this.CardNexus.getCards(this.uid).subscribe({
      next: (cards) => {
        this.cards = cards;
        if (cards.length > 0) {
          this.transferForm.patchValue({ cardId: cards[0].id });
        }
        this.loading = false;
      },
      error: async (error) => {
        this.loading = false;
        await this.UIMessenger.showError(this.getErrorMessage(error));
      }
    });
  }

  async onSubmit(): Promise<void> {
    if (!this.transferForm.valid || !this.uid) {
      await this.UIMessenger.show('Por favor completa todos los campos');
      return;
    }

    this.processing = true;

    try {
      const formValue = this.transferForm.value;
      const selectedCard = this.cards.find((c) => c.id === formValue.cardId);

      if (!selectedCard) {
        await this.UIMessenger.showError('Tarjeta no encontrada');
        this.processing = false;
        return;
      }

      // Crear una transacción de transferencia
      const transaction = {
        cardId: formValue.cardId,
        merchant: `Transferencia a ${formValue.recipientAccount}`,
        amount: parseFloat(formValue.amount),
        description: formValue.concept,
        category: 'transfer',
        date: Timestamp.now(),
        status: 'success' as const,
        emoji: ''
      };

      // Guardar la transacción
      await this.VaultEngine.saveTransaction(this.uid, transaction);

      await this.UIMessenger.show('✅ Transferencia realizada exitosamente');
      await this.router.navigate(['/home']);
    } catch (error) {
      await this.UIMessenger.showError(this.getErrorMessage(error));
    } finally {
      this.processing = false;
    }
  }

  async goBack(): Promise<void> {
    await this.router.navigate(['/home']);
  }

  async goToAddCard(): Promise<void> {
    await this.router.navigate(['/add-card']);
  }

  private getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    return 'Ocurrió un error inesperado';
  }
}
