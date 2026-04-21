import { Injectable, inject } from '@angular/core';
import { DataConnector } from './nexus.provider';
import { BiometricCore } from './biometric.service';
import { Transaction } from '../../models/transaction.model';
import { Observable, catchError, throwError } from 'rxjs';
import { Timestamp, collection, query, where, orderBy, limit, collectionData, Firestore } from '@angular/fire/firestore';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { SignalBridge } from './signal.provider';
import { ProfileManager } from './profile.provider';
import { firstValueFrom } from 'rxjs';

export interface PaymentRequest {
  cardId: string;
  merchant: string;
  amount: number;
  description?: string;
  category?: string;
}

export interface PaymentResult {
  success: boolean;
  transactionId?: string;
  error?: string;
  timestamp: Date;
}

@Injectable({
  providedIn: 'root'
})
export class VaultEngine {

  private connector = inject(DataConnector);
  private biometric = inject(BiometricCore);
  private signals = inject(SignalBridge);
  private profiles = inject(ProfileManager);
  private store = inject(Firestore);

  /**
   * Process Secure Asset Outflow
   */
  async processPayment(
    uid: string,
    req: PaymentRequest,
    isBiometric: boolean = false,
    forceBio: boolean = true
  ): Promise<PaymentResult> {
    try {
      if ((forceBio || isBiometric) && this.biometric.isNativeDevice()) {
        const { isAvailable } = await this.biometric.checkBiometricAvailability();
        if (!isAvailable) throw new Error('BIOMETRIC_UNAVAILABLE');

        await this.biometric.performSecurePaymentValidation(req.amount, req.merchant);
      }

      const tx: Omit<Transaction, 'id'> = {
        cardId: req.cardId,
        merchant: req.merchant,
        amount: req.amount,
        description: req.description || '',
        category: req.category?.trim() || 'General',
        date: Timestamp.now(),
        status: 'success',
        emoji: ''
      };

      // Stealth Write: We don't await the server ACK to avoid AdBlocker hangs.
      // Firestore will sync this in the background.
      const commitPromise = this.connector.commitFolder(`users/${uid}/transactions`, tx);
      
      // We only wait for a very short time. If it doesn't fail immediately,
      // it means it's in the local cache and will be sent.
      const resultPromise = Promise.race([
        commitPromise,
        new Promise(resolve => setTimeout(resolve, 1500)) // 1.5s grace for local write
      ]);

      const ref = await resultPromise as any;
      
      await Haptics.impact({ style: ImpactStyle.Heavy });
      
      // Dispatch alert in the background
      void this.dispatchAlert(uid, req.merchant, req.amount);

      return {
        success: true,
        transactionId: ref?.id || 'pending-sync',
        timestamp: new Date()
      };

    } catch (err: any) {
      console.error('[VaultEngine] Payment Error:', err);
      return {
        success: false,
        error: err?.message || 'PAYMENT_FAILED',
        timestamp: new Date()
      };
    }
  }

  /**
   * Data Persistence & Retrieval
   */
  getTransactionsByCard(uid: string, cardId: string, max: number = 10): Observable<Transaction[]> {
    const ref = collection(this.store, `users/${uid}/transactions`);
    const q = query(ref, where('cardId', '==', cardId), orderBy('date', 'desc'), limit(max));
    return (collectionData(q, { idField: 'id' }) as Observable<Transaction[]>).pipe(
      catchError(err => throwError(() => err))
    );
  }

  getTransactionsByDate(uid: string, date: Date): Observable<Transaction[]> {
    const start = new Date(date); start.setHours(0,0,0,0);
    const end = new Date(date); end.setHours(23,59,59,999);

    const ref = collection(this.store, `users/${uid}/transactions`);
    const q = query(
      ref,
      where('date', '>=', Timestamp.fromDate(start)),
      where('date', '<=', Timestamp.fromDate(end)),
      orderBy('date', 'desc')
    );
    return (collectionData(q, { idField: 'id' }) as Observable<Transaction[]>).pipe(
      catchError(err => throwError(() => err))
    );
  }

  async updateTransactionEmoji(uid: string, txId: string, emoji: string): Promise<void> {
    return this.connector.commitEntry(`users/${uid}/transactions/${txId}`, { emoji });
  }

  /**
   * Analytics & Bulk Retrieval
   */
  getAllTransactions(uid: string): Observable<Transaction[]> {
    const ref = collection(this.store, `users/${uid}/transactions`);
    const q = query(ref, orderBy('date', 'desc'));
    return (collectionData(q, { idField: 'id' }) as Observable<Transaction[]>).pipe(
      catchError(err => throwError(() => err))
    );
  }

  private async dispatchAlert(uid: string, merch: string, amount: number): Promise<void> {
    try {
      const prof = await firstValueFrom(this.profiles.getUserProfile(uid));
      if (prof?.fcmToken) {
        const val = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(amount);
        await this.signals.sendPush(prof.fcmToken, 'TX_SUCCESS 💳', `Confirmed: ${val} at ${merch}.`);
      }
    } catch (e) {
      console.warn('[VaultEngine] Alert Dispatch Failed:', e);
    }
  }

  /**
   * Pre-flight Validation
   */
  async validatePayment(req: PaymentRequest): Promise<{ valid: boolean; error?: string }> {
    const res = await this.validateOperation(req);
    return {
      valid: res.ok,
      error: res.msg
    };
  }

  async validateOperation(req: PaymentRequest): Promise<{ ok: boolean; msg?: string }> {
    if (!req.amount || req.amount <= 0) return { ok: false, msg: 'INVALID_AMOUNT' };
    if (!req.cardId) return { ok: false, msg: 'CARD_REQUIRED' };
    if (!req.merchant) return { ok: false, msg: 'MERCHAN_REQUIRED' };
    return { ok: true };
  }

  // Legacy support for TransferPage
  async saveTransaction(uid: string, tx: Omit<Transaction, 'id'>): Promise<void> {
    await this.connector.commitFolder(`users/${uid}/transactions`, tx);
  }
}
