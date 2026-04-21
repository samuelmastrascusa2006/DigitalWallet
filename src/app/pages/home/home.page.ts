import { Component, OnDestroy, OnInit } from '@angular/core';
import { User } from '@angular/fire/auth';
import { Timestamp } from '@angular/fire/firestore';
import { EmojiEvent } from '@ctrl/ngx-emoji-mart/ngx-emoji';
import { Subscription, filter, firstValueFrom, take } from 'rxjs';
import { Router } from '@angular/router';
import { AlertController, ModalController } from '@ionic/angular';
import { IdentityCore } from '../../core/providers/identity.provider';
import { BiometricCore } from '../../core/providers/biometric.service';
import { CardNexus, CardUpdateRequest } from '../../core/providers/card.service';
import { SignalBridge, NotificationSummary } from '../../core/providers/signal.provider';
import { VaultEngine } from '../../core/providers/vault.provider';
import { UIMessenger } from '../../core/providers/alert.provider';
import { ProfileManager } from '../../core/providers/profile.provider';
import { EmojiPickerModalComponent } from '../../shared/components/emoji-picker-modal/emoji-picker-modal.component';
import { AnalyticsVault, TransactionStats } from '../../core/providers/transaction-stats.service';
import { Card } from '../../models/card.model';
import { Transaction } from '../../models/transaction.model';
import { UserProfile } from '../../models/user.model';

@Component({
  standalone: false,
  selector: 'app-home',
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
})
export class HomePage implements OnInit, OnDestroy {
  userProfile: UserProfile | null = null;
  cards: Card[] = [];
  activeCardId: string | null = null;
  transactions: Transaction[] = [];
  allTransactions: Transaction[] = [];
  notifications: NotificationSummary[] = [];
  balance = 0;
  loadingCards = true;
  loadingTransactions = true;
  showEmojiPicker = false;
  showProfileModal = false;
  showNotificationsModal = false;
  showCardEditorModal = false;
  showAllMovements = false;
  selectedDateFilter: Date | null = null;
  profileBiometricEnabled = false;
  editCardHolder = '';
  editCardExpiryDate = '';
  editCardColor = '#0f3460';
  selectedTransaction: Transaction | null = null;
  
  // Estadísticas del mes actual
  currentMonthStats: TransactionStats = {
    totalSpent: 0,
    transactionCount: 0,
    averagePerTransaction: 0,
    transactions: []
  };
  loadingStats = true;
  
  private editingCardId: string | null = null;
  private authAccount: User | null = null;
  private profileBootstrapInProgress = false;

  private uid: string | null = null;
  private cardsSub?: Subscription;
  private allTransactionsSub?: Subscription;
  private cardTransactionsSub?: Subscription;
  private profileSub?: Subscription;
  private notificationsSub?: Subscription;
  private statsSub?: Subscription;

  constructor(
    private IdentityCore: IdentityCore,
    private ProfileManager: ProfileManager,
    private CardNexus: CardNexus,
    private BiometricCore: BiometricCore,
    private SignalBridge: SignalBridge,
    private VaultEngine: VaultEngine,
    private AnalyticsVault: AnalyticsVault,
    private UIMessenger: UIMessenger,
    private alertController: AlertController,
    private modalController: ModalController,
    private router: Router
  ) {}

  async ngOnInit(): Promise<void> {
    await this.loadDashboardData();
  }

  ngOnDestroy(): void {
    this.cardsSub?.unsubscribe();
    this.allTransactionsSub?.unsubscribe();
    this.cardTransactionsSub?.unsubscribe();
    this.profileSub?.unsubscribe();
    this.notificationsSub?.unsubscribe();
    this.statsSub?.unsubscribe();
  }

  async onAction(action: 'pay' | 'add' | 'history'): Promise<void> {
    if (action === 'pay') {
      const queryParams = this.activeCardId ? { cardId: this.activeCardId } : {};
      await this.router.navigate(['/payment'], { queryParams });
      return;
    }

    if (action === 'add') {
      await this.router.navigate(['/add-card']);
      return;
    }

    if (action === 'history') {
      this.showAllMovements = true;
      document.getElementById('transaction-section')?.scrollIntoView({ behavior: 'smooth' });
      return;
    }
  }

  get profileInitials(): string {
    const parts = this.accountDisplayName
      .split(' ')
      .map((part) => part.trim())
      .filter((part) => !!part);

    if (parts.length === 0) {
      return 'US';
    }

    if (parts.length === 1) {
      return parts[0].slice(0, 2).toUpperCase();
    }

    return `${parts[0].charAt(0)}${parts[1].charAt(0)}`.toUpperCase();
  }

  get greetingName(): string {
    const firstWord = this.accountDisplayName.split(' ')[0]?.trim();
    return firstWord || 'Usuario';
  }

  get accountDisplayName(): string {
    const profileName = `${this.userProfile?.nombre || ''} ${this.userProfile?.apellido || ''}`.trim();
    if (profileName) {
      return profileName;
    }

    const displayName = this.authAccount?.displayName?.trim();
    if (displayName) {
      return displayName;
    }

    const emailPrefix = this.authAccount?.email?.split('@')[0]?.trim();
    return emailPrefix || 'Usuario';
  }

  get accountEmail(): string {
    const profileEmail = this.userProfile?.email?.trim();
    if (profileEmail) {
      return profileEmail;
    }

    const authEmail = this.authAccount?.email?.trim();
    return authEmail || 'Sin correo disponible';
  }

  get latestNotification(): NotificationSummary | null {
    return this.notifications.length > 0 ? this.notifications[0] : null;
  }

  get activeCard(): Card | null {
    if (!this.activeCardId) {
      return null;
    }

    return this.cards.find((card) => card.id === this.activeCardId) || null;
  }

  get filteredAllTransactions(): Transaction[] {
    const selectedDate = this.selectedDateFilter;
    if (!selectedDate) {
      return this.allTransactions;
    }

    return this.allTransactions.filter((tx) => this.isSameDate(tx.date, selectedDate));
  }

  get groupedTransactions(): Array<{ date: Date; label: string; transactions: Transaction[] }> {
    const grouped = new Map<string, { date: Date; transactions: Transaction[] }>();

    this.filteredAllTransactions.forEach((tx) => {
      const txDate = this.toDate(tx.date);
      if (!txDate) {
        return;
      }

      const key = `${txDate.getFullYear()}-${txDate.getMonth()}-${txDate.getDate()}`;
      if (!grouped.has(key)) {
        grouped.set(key, { date: txDate, transactions: [] });
      }
      grouped.get(key)?.transactions.push(tx);
    });

    return Array.from(grouped.values())
      .sort((a, b) => b.date.getTime() - a.date.getTime())
      .map((group) => ({
        date: group.date,
        label: this.formatGroupDate(group.date),
        transactions: group.transactions
      }));
  }

  openProfileModal(): void {
    this.profileBiometricEnabled = !!this.userProfile?.biometricEnabled;
    this.showProfileModal = true;
  }

  closeProfileModal(): void {
    this.showProfileModal = false;
    this.profileBiometricEnabled = !!this.userProfile?.biometricEnabled;
  }

  async saveProfileSettings(): Promise<void> {
    if (!this.uid) {
      return;
    }

    const profileReady = await this.ensureProfileDocument(true);
    if (!profileReady || !this.userProfile) {
      return;
    }

    if (this.profileBiometricEnabled && !this.userProfile.biometricEnabled) {
      const availability = await this.BiometricCore.checkBiometricAvailability();
      if (!availability.isAvailable) {
        await this.UIMessenger.showError('La biometría no está disponible en este dispositivo.');
        this.profileBiometricEnabled = false;
        return;
      }
    }

    try {
      await this.ProfileManager.toggleBiometric(this.uid, this.profileBiometricEnabled);
      this.userProfile = {
        ...this.userProfile,
        biometricEnabled: this.profileBiometricEnabled
      };
      this.BiometricCore.setBiometricEnabled(this.profileBiometricEnabled);
      this.showProfileModal = false;
      await this.UIMessenger.showSuccess('Preferencias guardadas');
    } catch (error) {
      await this.UIMessenger.showError(this.getErrorMessage(error));
    }
  }

  openNotificationsModal(): void {
    this.showNotificationsModal = true;
  }

  closeNotificationsModal(): void {
    this.showNotificationsModal = false;
  }

  openCardEditor(): void {
    const card = this.activeCard;
    if (!card) {
      return;
    }

    this.editingCardId = card.id;
    this.editCardHolder = card.cardHolder;
    this.editCardExpiryDate = card.expiryDate;
    this.editCardColor = card.color || '#0f3460';
    this.showCardEditorModal = true;
  }

  closeCardEditor(): void {
    this.showCardEditorModal = false;
    this.editingCardId = null;
    this.editCardHolder = '';
    this.editCardExpiryDate = '';
    this.editCardColor = '#0f3460';
  }

  onEditExpiryChanged(value: string): void {
    const formatted = this.CardNexus.formatExpiryDate(value);
    this.editCardExpiryDate = formatted;
  }

  async saveCardEdits(): Promise<void> {
    if (!this.uid || !this.editingCardId) {
      return;
    }

    const updates: CardUpdateRequest = {
      cardHolder: this.editCardHolder,
      expiryDate: this.editCardExpiryDate,
      color: this.editCardColor
    };

    try {
      await this.CardNexus.updateCard(this.uid, this.editingCardId, updates);
      this.cards = this.cards.map((card) => {
        if (card.id !== this.editingCardId) {
          return card;
        }

        return {
          ...card,
          cardHolder: updates.cardHolder?.trim() || card.cardHolder,
          expiryDate: this.CardNexus.formatExpiryDate(updates.expiryDate || card.expiryDate),
          color: updates.color || card.color
        };
      });

      this.closeCardEditor();
      await this.UIMessenger.showSuccess('Tarjeta actualizada correctamente');
    } catch (error) {
      await this.UIMessenger.showError(this.getErrorMessage(error));
    }
  }

  async confirmDeleteActiveCard(): Promise<void> {
    const card = this.activeCard;
    if (!card) {
      return;
    }

    const alert = await this.alertController.create({
      header: 'Eliminar tarjeta',
      message: `¿Seguro que deseas eliminar la tarjeta terminada en ${card.cardNumber}?`,
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Eliminar',
          role: 'destructive',
          handler: () => {
            void this.deleteActiveCard(card);
          }
        }
      ]
    });

    await alert.present();
  }

  toggleMovementView(): void {
    this.showAllMovements = !this.showAllMovements;
    if (!this.showAllMovements) {
      this.selectedDateFilter = null;
    }
  }

  onDateSelected(date: Date): void {
    this.selectedDateFilter = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
      12,
      0,
      0,
      0
    );
    this.showAllMovements = true;
  }

  clearDateFilter(): void {
    this.selectedDateFilter = null;
  }

  formatNotificationTimestamp(date?: Date | null): string {
    if (!date) {
      return '';
    }

    return date.toLocaleString('es-CO', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  onCardSelected(cardId: string): void {
    this.activeCardId = cardId;
    this.subscribeToCardTransactions();
  }

  async onTransactionLongPress(transaction: Transaction): Promise<void> {
    this.selectedTransaction = transaction;
    
    const modal = await this.modalController.create({
      component: EmojiPickerModalComponent,
      componentProps: {
        currentEmoji: transaction.emoji
      },
      breakpoints: [0, 0.5, 0.7],
      initialBreakpoint: 0.5,
      handle: true,
      cssClass: 'emoji-picker-modal'
    });

    await modal.present();

    const { data, role } = await modal.onDidDismiss();
    if (role === 'selected' && data) {
      await this.saveEmojiSelection(data);
    }
    
    this.selectedTransaction = null;
  }

  private async saveEmojiSelection(emoji: string): Promise<void> {
    if (!this.uid || !this.selectedTransaction?.id) {
      return;
    }

    try {
      await this.VaultEngine.updateTransactionEmoji(
        this.uid,
        this.selectedTransaction.id,
        emoji
      );
      
      // Actualizar localmente para feedback inmediato si no se refresca por subscripción
      this.selectedTransaction.emoji = emoji;
      
      await this.UIMessenger.showSuccess('Reacción guardada');
    } catch (error) {
      await this.UIMessenger.showError(this.getErrorMessage(error));
    }
  }

  closeEmojiPicker(): void {
    this.showEmojiPicker = false;
    this.selectedTransaction = null;
  }

  async logout(): Promise<void> {
    try {
      this.showProfileModal = false;
      this.showNotificationsModal = false;
      this.showCardEditorModal = false;
      await this.IdentityCore.logout();
      await this.UIMessenger.show('✅ Sesión cerrada.');
      await this.router.navigate(['/login']);
    } catch (error) {
      await this.UIMessenger.showError(this.getErrorMessage(error));
    }
  }

  private async loadDashboardData(): Promise<void> {
    try {
      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('TIMEOUT: No se pudo conectar con el servidor. Revisa tu conexión o AdBlocker.')), 12000)
      );

      const user = await Promise.race([
        firstValueFrom(
          this.IdentityCore.currentUser$.pipe(
            filter((authUser: User | null): authUser is User => !!authUser),
            take(1)
          )
        ),
        timeoutPromise
      ]) as User;

      this.authAccount = user;
      this.uid = user.uid;
      this.subscribeToProfile();
      this.subscribeToNotifications();
      this.subscribeToCards();
      this.subscribeToAllTransactions();
      this.subscribeToCurrentMonthStats();
    } catch (error) {
      await this.UIMessenger.showError(this.getErrorMessage(error));
      // Parar spinners de carga si hay timeout
      this.loadingCards = false;
      this.loadingTransactions = false;
      this.loadingStats = false;
    }
  }

  private subscribeToCurrentMonthStats(): void {
    if (!this.uid) {
      return;
    }

    this.loadingStats = true;
    this.statsSub = this.AnalyticsVault.getCurrentMonthStats(this.uid).subscribe({
      next: (stats) => {
        this.currentMonthStats = stats;
        this.loadingStats = false;
      },
      error: async (error) => {
        console.error('Error loading monthly stats:', error);
        this.loadingStats = false;
        // No mostrar error del usuario para estadísticas, es opcional
      }
    });
  }

  private subscribeToProfile(): void {
    if (!this.uid) {
      return;
    }

    this.profileSub = this.ProfileManager.getUserProfile(this.uid).subscribe({
      next: (profile) => {
        const safeProfile = profile as UserProfile | null | undefined;
        if (!safeProfile) {
          this.userProfile = null;
          this.profileBiometricEnabled = false;
          void this.ensureProfileDocument();
          return;
        }

        this.userProfile = safeProfile;
        this.profileBiometricEnabled = safeProfile.biometricEnabled;
        this.BiometricCore.setBiometricEnabled(safeProfile.biometricEnabled);
      },
      error: async (error) => {
        await this.UIMessenger.showError(this.getErrorMessage(error));
      }
    });
  }

  private subscribeToNotifications(): void {
    this.notificationsSub = this.SignalBridge.notifications$.subscribe({
      next: (notifications) => {
        this.notifications = notifications;
      }
    });
  }

  private subscribeToCards(): void {
    if (!this.uid) {
      return;
    }

    this.loadingCards = true;
    this.cardsSub = this.CardNexus.getCards(this.uid).subscribe({
      next: (cards) => {
        this.cards = cards;
        if (cards.length === 0) {
          this.activeCardId = null;
          this.transactions = [];
          this.closeCardEditor();
          this.loadingCards = false;
          this.loadingTransactions = false;
          return;
        }

        // Buscar tarjeta por defecto, o usar la primera si no existe
        const defaultCard = cards.find((card) => card.isDefault);
        const cardStillExists = this.activeCardId
          ? cards.some((card) => card.id === this.activeCardId)
          : false;
        
        if (!cardStillExists) {
          this.activeCardId = defaultCard?.id || cards[0].id;
        }

        if (this.editingCardId && !cards.some((card) => card.id === this.editingCardId)) {
          this.closeCardEditor();
        }

        this.loadingCards = false;
        this.subscribeToCardTransactions();
      },
      error: async (error) => {
        this.loadingCards = false;
        await this.UIMessenger.showError(this.getErrorMessage(error));
      }
    });
  }

  private subscribeToAllTransactions(): void {
    if (!this.uid) {
      return;
    }

    this.allTransactionsSub = this.VaultEngine.getAllTransactions(this.uid).subscribe({
      next: (transactions) => {
        this.allTransactions = transactions;
        this.balance = transactions.reduce((acc, tx) => acc - tx.amount, 0);
      },
      error: async (error) => {
        await this.UIMessenger.showError(this.getErrorMessage(error));
      }
    });
  }

  private subscribeToCardTransactions(): void {
    if (!this.uid || !this.activeCardId) {
      this.transactions = [];
      this.loadingTransactions = false;
      return;
    }

    this.loadingTransactions = true;
    this.cardTransactionsSub?.unsubscribe();
    this.cardTransactionsSub = this.VaultEngine
      .getTransactionsByCard(this.uid, this.activeCardId, 10)
      .subscribe({
        next: (transactions) => {
          this.transactions = transactions;
          this.loadingTransactions = false;
        },
        error: async (error) => {
          this.loadingTransactions = false;
          await this.UIMessenger.showError(this.getErrorMessage(error));
        }
      });
  }

  private getErrorMessage(error: unknown): string {
    const msg = (error instanceof Error && error.message) ? error.message : String(error);
    
    if (msg.includes('requires an index') || msg.includes('FAILED_PRECONDITION')) {
      return '⚠️ Error: Falta un índice en Firestore para filtrar movimientos. Crea el índice en tu consola de Firebase para activar esta función.';
    }

    if (msg.includes('permission-denied')) {
      return '🚫 No tienes permiso para realizar esta operación.';
    }

    if (msg.includes('not-found')) {
      return '🔍 El recurso solicitado no fue encontrado.';
    }

    return msg || 'Ocurrió un error inesperado.';
  }

  private async deleteActiveCard(card: Card): Promise<void> {
    if (!this.uid || !card.id) {
      return;
    }

    try {
      await this.CardNexus.deleteCard(this.uid, card.id);
      if (this.editingCardId === card.id) {
        this.closeCardEditor();
      }
      await this.UIMessenger.showSuccess('Tarjeta eliminada correctamente');
    } catch (error) {
      await this.UIMessenger.showError(this.getErrorMessage(error));
    }
  }

  private isSameDate(timestamp: Timestamp | Date, selectedDate: Date): boolean {
    const txDate = this.toDate(timestamp);
    if (!txDate) {
      return false;
    }

    return txDate.getFullYear() === selectedDate.getFullYear()
      && txDate.getMonth() === selectedDate.getMonth()
      && txDate.getDate() === selectedDate.getDate();
  }

  private toDate(timestamp: Timestamp | Date): Date | null {
    if (timestamp instanceof Date) {
      return timestamp;
    }

    if (timestamp?.toDate) {
      return timestamp.toDate();
    }

    return null;
  }

  private formatGroupDate(date: Date): string {
    return date.toLocaleDateString('es-CO', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
  }

  private async ensureProfileDocument(showErrors: boolean = false): Promise<boolean> {
    if (!this.uid) {
      return false;
    }

    if (this.userProfile) {
      return true;
    }

    if (this.profileBootstrapInProgress) {
      return false;
    }

    this.profileBootstrapInProgress = true;
    try {
      const fallbackProfile = this.buildFallbackUserProfile(this.uid);
      await this.ProfileManager.createUserProfile(fallbackProfile);
      this.userProfile = {
        ...fallbackProfile,
        createdAt: Timestamp.now()
      };
      this.profileBiometricEnabled = false;
      this.BiometricCore.setBiometricEnabled(false);
      return true;
    } catch (error) {
      if (showErrors) {
        await this.UIMessenger.showError(this.getErrorMessage(error));
      }
      return false;
    } finally {
      this.profileBootstrapInProgress = false;
    }
  }

  private buildFallbackUserProfile(uid: string): Omit<UserProfile, 'createdAt'> {
    const displayName = this.authAccount?.displayName?.trim() || '';
    const nameParts = displayName
      .split(' ')
      .map((part) => part.trim())
      .filter((part) => !!part);

    const nombre = nameParts[0]
      || this.authAccount?.email?.split('@')[0]?.trim()
      || 'Usuario';
    const apellido = nameParts.slice(1).join(' ') || 'Google';
    const email = this.authAccount?.email?.trim() || 'sin-email@local';

    return {
      uid,
      nombre,
      apellido,
      tipoDocumento: 'CC',
      numeroDocumento: 'NO-REGISTRADO',
      pais: 'No especificado',
      email,
      biometricEnabled: false
    };
  }
}
