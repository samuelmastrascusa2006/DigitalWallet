import { Component, Input, Output, EventEmitter } from '@angular/core';
import { Timestamp } from '@angular/fire/firestore';
import { Transaction } from '../../../models/transaction.model';

@Component({
  selector: 'app-transaction-item',
  standalone: false,
  templateUrl: './transaction-item.component.html',
  styleUrls: ['./transaction-item.component.scss']
})
export class TransactionItemComponent {
  @Input() transaction!: Transaction;
  @Output() longPress = new EventEmitter<Transaction>();

  get transactionDate(): Date | null {
    return this.transaction?.date?.toDate ? this.transaction.date.toDate() : null;
  }

  private longPressTimer: ReturnType<typeof setTimeout> | null = null;

  onPressStart(): void {
    this.clearLongPressTimer();
    this.longPressTimer = setTimeout(() => {
      this.longPress.emit(this.transaction);
    }, 2000);
  }

  onPressEnd(): void {
    this.clearLongPressTimer();
  }

  private clearLongPressTimer(): void {
    if (this.longPressTimer) {
      clearTimeout(this.longPressTimer);
      this.longPressTimer = null;
    }
  }

  getDefaultEmoji(): string {
    return '💳';
  }

  formatDate(date: Timestamp): string {
    if (date?.toDate) {
      const d = date.toDate();
      return d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
    }
    return '';
  }

  formatAmount(amount: number): string {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(amount);
  }
}
