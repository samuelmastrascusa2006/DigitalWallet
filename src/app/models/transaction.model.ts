import { Timestamp } from '@angular/fire/firestore';

export interface Transaction {
  id: string;
  cardId: string;
  merchant: string;
  amount: number;
  date: Timestamp;
  emoji?: string;
  status: 'success' | 'failed';
  description?: string;
  category?: string;
}
