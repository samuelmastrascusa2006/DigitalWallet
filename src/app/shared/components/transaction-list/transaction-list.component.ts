import { Component, Input, Output, EventEmitter } from '@angular/core';
import { Transaction } from '../../../models/transaction.model';

@Component({
  selector: 'app-transaction-list',
  standalone: false,
  templateUrl: './transaction-list.component.html',
  styleUrls: ['./transaction-list.component.scss']
})
export class TransactionListComponent {
  @Input() transactions: Transaction[] = [];
  @Input() title: string = 'Últimos movimientos';
  @Input() loading: boolean = false;
  @Output() transactionLongPress = new EventEmitter<Transaction>();

  onTransactionLongPress(transaction: Transaction): void {
    this.transactionLongPress.emit(transaction);
  }
}
