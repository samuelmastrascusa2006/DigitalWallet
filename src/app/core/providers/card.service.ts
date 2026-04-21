import { Injectable, inject } from '@angular/core';
import { DataConnector } from './nexus.provider';
import { Card } from '../../models/card.model';
import { Observable } from 'rxjs';
import { collection, query, where, collectionData, Firestore, doc, deleteDoc, updateDoc, Timestamp } from '@angular/fire/firestore';
import { map } from 'rxjs/operators';

export interface CardUpdateRequest {
  cardHolder?: string;
  expiryDate?: string;
  color?: string;
  isDefault?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class CardNexus {

  private connector = inject(DataConnector);
  private store = inject(Firestore);

  /**
   * Stream Active Vaults
   */
  getCards(uid: string): Observable<Card[]> {
    const ref = collection(this.store, `users/${uid}/cards`);
    return (collectionData(ref, { idField: 'id' }) as Observable<Card[]>).pipe(
      map(cards => cards.map(c => ({
        ...c,
        cardHolder: c.cardHolder || 'VALUED_HOLDER'
      })))
    );
  }

  /**
   * Commit New Vault
   */
  async createCard(uid: string, card: Omit<Card, 'id' | 'createdAt'> & { createdAt?: Timestamp }): Promise<void> {
    const payload = {
      ...card,
      createdAt: card.createdAt || Timestamp.now()
    };
    await this.connector.commitFolder(`users/${uid}/cards`, payload);
  }

  /**
   * Pulse Vault Update
   */
  async updateCard(uid: string, cardId: string, updates: CardUpdateRequest): Promise<void> {
    const ref = doc(this.store, `users/${uid}/cards/${cardId}`);
    return updateDoc(ref, updates as any);
  }

  /**
   * Purge Vault
   */
  async deleteCard(uid: string, cardId: string): Promise<void> {
    const ref = doc(this.store, `users/${uid}/cards/${cardId}`);
    return deleteDoc(ref);
  }

  /**
   * Formatting Utility
   */
  formatExpiryDate(val: string): string {
    const clean = val.replace(/\D/g, '');
    if (clean.length >= 4) {
      return `${clean.slice(0, 2)}/${clean.slice(2, 4)}`;
    }
    return clean;
  }

  /**
   * Helper for Credit Card Formatting
   */
  formatCardNumber(val: string): string {
    const clean = val.replace(/\D/g, '');
    let formatted = '';
    for (let i = 0; i < clean.length; i++) {
      if (i > 0 && i % 4 === 0) formatted += ' ';
      formatted += clean[i];
    }
    return formatted.slice(0, 19);
  }

  /**
   * Franchise Detector
   */
  detectFranchise(cardNumber: string): Card['franchise'] {
    if (cardNumber.startsWith('4')) return 'visa';
    if (/^5[1-5]/.test(cardNumber)) return 'mastercard';
    return 'unknown';
  }

  /**
   * Luhn Algorithm
   */
  luhnCheck(num: string): boolean {
    let sum = 0;
    for (let i = 0; i < num.length; i++) {
      let digit = parseInt(num[num.length - 1 - i], 10);
      if (i % 2 === 1) {
        digit *= 2;
        if (digit > 9) digit -= 9;
      }
      sum += digit;
    }
    return sum % 10 === 0;
  }

  formatSecurityCode(val: string): string {
    return val.replace(/\D/g, '').slice(0, 4);
  }

  getCardExpiryStatus(expiry: string): 'valid' | 'expired' | 'expiring-soon' {
    if (!/^\d{2}\/\d{2}$/.test(expiry)) return 'expired';
    const [m, y] = expiry.split('/').map(n => parseInt(n, 10));
    const now = new Date();
    const expDate = new Date(2000 + y, m, 1);
    if (expDate < now) return 'expired';
    const threeMonths = 3 * 30 * 24 * 60 * 60 * 1000;
    if (expDate.getTime() - now.getTime() < threeMonths) return 'expiring-soon';
    return 'valid';
  }

  // Alias for compatibility
  async addCard(uid: string, card: Omit<Card, 'id' | 'createdAt'> & { createdAt?: Timestamp }): Promise<void> {
    return this.createCard(uid, card);
  }
}
