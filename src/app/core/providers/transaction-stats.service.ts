import { Injectable, inject } from '@angular/core';
import { DataConnector } from './nexus.provider';
import { Transaction } from '../../models/transaction.model';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface TransactionStats {
  totalSpent: number;
  transactionCount: number;
  averagePerTransaction: number;
  transactions: Transaction[];
}

@Injectable({
  providedIn: 'root'
})
export class AnalyticsVault {

  private connector = inject(DataConnector);

  /**
   * Analytics Pulse
   */
  getCurrentMonthStats(uid: string): Observable<TransactionStats> {
    return this.connector.streamFolder<Transaction>(`users/${uid}/transactions`).pipe(
      map(txs => {
        const now = new Date();
        const currentMonthTxs = txs.filter(tx => {
          const date = (tx.date as any)?.toDate ? (tx.date as any).toDate() : new Date(tx.date as any);
          return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
        });

        const totalSpent = currentMonthTxs.reduce((sum, tx) => sum + tx.amount, 0);
        
        return {
          totalSpent,
          transactionCount: currentMonthTxs.length,
          averagePerTransaction: currentMonthTxs.length > 0 ? totalSpent / currentMonthTxs.length : 0,
          transactions: currentMonthTxs
        };
      })
    );
  }
}
