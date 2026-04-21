import { Timestamp } from '@angular/fire/firestore';

export interface UserProfile {
  uid: string;
  nombre: string;
  apellido: string;
  tipoDocumento: 'CC' | 'TI' | 'CE' | 'PASSPORT';
  numeroDocumento: string;
  pais: string;
  email: string;
  biometricEnabled: boolean;
  fcmToken?: string;
  createdAt: Timestamp;
}
