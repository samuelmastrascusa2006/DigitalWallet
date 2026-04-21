import { Timestamp } from '@angular/fire/firestore';

export interface Card {
  id: string;
  cardNumber: string;       // Solo últimos 4 dígitos para mostrar
  cardHolder: string;
  expiryDate: string;       // MM/YY
  franchise: 'visa' | 'mastercard' | 'unknown';
  color: string;            // HEX para personalización UI
  cvv?: string;             // Almacenado de forma segura (encriptado o local)
  isDefault?: boolean;      // Marcar como tarjeta por defecto
  createdAt: Timestamp;
}
