import { Component, OnDestroy, OnInit } from '@angular/core';
import { User } from '@angular/fire/auth';
import { ActivatedRoute, Router } from '@angular/router';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { Subscription, filter, firstValueFrom, take } from 'rxjs';
import { IdentityCore } from '../../core/providers/identity.provider';
import { CardNexus } from '../../core/providers/card.service';
import { LoadingBridge } from '../../core/providers/loading.service';
import { ModalService } from '../../core/providers/modal.service';
import { SignalBridge } from '../../core/providers/signal.provider';
import { VaultEngine } from '../../core/providers/vault.provider';
import { UIMessenger } from '../../core/providers/alert.provider';
import { ProfileManager } from '../../core/providers/profile.provider';
import { Card } from '../../models/card.model';
import { UserProfile } from '../../models/user.model';
import { PaymentSimulatorComponent } from '../../shared/components/payment-simulator/payment-simulator.component';

@Component({
  standalone: false,
  selector: 'app-payment',
  templateUrl: './payment.page.html',
  styleUrls: ['./payment.page.scss'],
})
export class PaymentPage implements OnInit, OnDestroy {
  cards: Card[] = [];
  selectedCardId: string | null = null;
  flippingCardId: string | null = null;
  userProfile: UserProfile | null = null;
  loading = true;
  processing = false;

  private uid: string | null = null;
  private cardsSub?: Subscription;
  private profileSub?: Subscription;
  private flipResetTimer?: ReturnType<typeof setTimeout>;

  constructor(
    private IdentityCore: IdentityCore,
    private ProfileManager: ProfileManager,
    private CardNexus: CardNexus,
    private VaultEngine: VaultEngine,
    private SignalBridge: SignalBridge,
    private LoadingBridge: LoadingBridge,
    private UIMessenger: UIMessenger,
    private modalService: ModalService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  async ngOnInit(): Promise<void> {
    await this.loadData();
  }

  ngOnDestroy(): void {
    this.cardsSub?.unsubscribe();
    this.profileSub?.unsubscribe();
    if (this.flipResetTimer) {
      clearTimeout(this.flipResetTimer);
      this.flipResetTimer = undefined;
    }
  }

  get selectedCard(): Card | undefined {
    return this.cards.find((card) => card.id === this.selectedCardId);
  }

  onCardSelected(cardId: string): void {
    this.selectedCardId = cardId;
    this.flippingCardId = cardId;
    if (this.flipResetTimer) {
      clearTimeout(this.flipResetTimer);
    }

    this.flipResetTimer = setTimeout(() => {
      this.flippingCardId = null;
      this.flipResetTimer = undefined;
    }, 700);
  }

  async openSimulator(): Promise<void> {
    if (!this.uid || !this.selectedCard || this.processing) {
      return;
    }

    const result = await this.modalService.open(
      PaymentSimulatorComponent,
      { cardLastFour: this.selectedCard.cardNumber },
      'payment-simulator-modal'
    ) as PaymentModalResult | null;

    if (!result) {
      return;
    }

    await this.confirmPayment(result);
  }

  async goToAddCard(): Promise<void> {
    await this.router.navigate(['/add-card']);
  }

  private async loadData(): Promise<void> {
    try {
      const user = await firstValueFrom(
        this.IdentityCore.currentUser$.pipe(
          filter((authUser: User | null): authUser is User => !!authUser),
          take(1)
        )
      );

      this.uid = user.uid;
      this.subscribeUserProfile();
      this.subscribeCards();
    } catch (error) {
      await this.UIMessenger.showError(this.getErrorMessage(error));
    }
  }

  private subscribeUserProfile(): void {
    if (!this.uid) {
      return;
    }

    this.profileSub = this.ProfileManager.getUserProfile(this.uid).subscribe({
      next: (profile) => {
        this.userProfile = profile;
      },
      error: async (error) => {
        await this.UIMessenger.showError(this.getErrorMessage(error));
      }
    });
  }

  private subscribeCards(): void {
    if (!this.uid) {
      return;
    }

    this.cardsSub = this.CardNexus.getCards(this.uid).subscribe({
      next: (cards) => {
        this.cards = cards;
        this.loading = false;

        if (cards.length === 0) {
          this.selectedCardId = null;
          return;
        }

        const queryCardId = this.route.snapshot.queryParamMap.get('cardId');
        const validQueryCard = !!queryCardId && cards.some((card) => card.id === queryCardId);
        
        if (validQueryCard) {
          this.selectedCardId = queryCardId;
        } else {
          // Buscar tarjeta por defecto, o usar la primera
          const defaultCard = cards.find((card) => card.isDefault);
          this.selectedCardId = defaultCard ? defaultCard.id : cards[0].id;
        }
      },
      error: async (error) => {
        this.loading = false;
        await this.UIMessenger.showError(this.getErrorMessage(error));
      }
    });
  }

  private async confirmPayment(result: PaymentModalResult): Promise<void> {
    if (!this.uid || !this.selectedCard) {
      await this.UIMessenger.showError('Selecciona una tarjeta para continuar.');
      return;
    }

    this.processing = true;
    await this.LoadingBridge.show('Procesando pago...');
    
    // Create a timeout promise (35 seconds for sensitive transactions)
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('TIMEOUT_PAYMENT')), 35000)
    );

    try {
      console.log(`[Payment] Iniciando pago: $${result.amount} en ${result.merchant}`);
      
      const paymentResult = await Promise.race([
        this.VaultEngine.processPayment(this.uid, {
          cardId: this.selectedCard.id,
          merchant: result.merchant,
          amount: result.amount
        }, !!this.userProfile?.biometricEnabled),
        timeoutPromise
      ]) as any;

      // Verificar si el pago fue exitoso
      if (!paymentResult.success) {
        const errorMsg = paymentResult.error || 'Error al propremium el pago';
        console.error(`[Payment] Error: ${errorMsg}`);
        throw new Error(errorMsg);
      }

      console.log(`[Payment] ✅ Pago exitoso. ID: ${paymentResult.transactionId}`);
      
      console.log(`[Payment] ✅ Pago exitoso. ID: ${paymentResult.transactionId}`);
      
      // La notificación y los hápticos ya son manejados por el VaultEngine
      // de forma centralizada para asegurar que ocurran siempre en pagos exitosos.

      // Mostrar confirmación al usuario
      await this.UIMessenger.showSuccess(
        `Pago de $${this.formatCurrency(result.amount)} confirmado ✓`
      );
      
      // Navegar al home después de un pequeño delay para que vea el mensaje
      setTimeout(() => {
        void this.router.navigate(['/home']);
      }, 500);
    } catch (error: any) {
      console.error('[Payment] Error en confirmPayment:', error);
      
      if (error.message === 'TIMEOUT_PAYMENT') {
        await this.UIMessenger.showError('La confirmación tardó demasiado. Por favor, verifica tu saldo en el Inicio; es posible que la transacción ya se haya completado.');
        return;
      }

      // Diferenciar tipos de errores
      const errorMsg = this.getDetailedErrorMessage(error);
      await this.UIMessenger.showError(errorMsg);
    } finally {
      this.processing = false;
      await this.LoadingBridge.hide();
    }
  }

  private formatCurrency(amount: number): string {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(amount);
  }

  private getDetailedErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      const msg = error.message.toLowerCase();
      
      // Errores de biometría
      if (msg.includes('biometric') || msg.includes('fingerprint') || msg.includes('face')) {
        return '🔐 La biometría fue rechazada o cancelada. Por favor intenta nuevamente.';
      }
      
      // Errores de permiso
      if (msg.includes('permission')) {
        return '🚫 No tienes permiso para realizar esta operación.';
      }
      
      // Error genérico del usuario
      if (error.message) {
        return error.message;
      }
    }
    
    return '❌ No fue posible completar el pago. Intenta nuevamente.';
  }

  private getErrorMessage(error: unknown): string {
    if (error instanceof Error && error.message) {
      return error.message;
    }
    return 'Ocurrió un error inesperado.';
  }
}

interface PaymentModalResult {
  merchant: string;
  amount: number;
}
