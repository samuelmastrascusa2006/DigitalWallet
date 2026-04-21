import { Component, Input, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { faker } from '@faker-js/faker';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

@Component({
  selector: 'app-payment-simulator',
  standalone: false,
  templateUrl: './payment-simulator.component.html',
  styleUrls: ['./payment-simulator.component.scss']
})
export class PaymentSimulatorComponent implements OnInit {
  @Input() cardLastFour: string = '';
  
  merchantName: string = '';
  merchantCategory: string = '';
  amount: number = 0;

  constructor(private modalController: ModalController) {}

  ngOnInit() {
    this.generateNewRandomData();
  }

  generateNewRandomData(): void {
    this.merchantName = faker.company.name();
    this.merchantCategory = faker.commerce.department();
    const rawAmount = faker.finance.amount({ min: 5000, max: 500000, dec: 0 });
    this.amount = parseInt(rawAmount, 10);
  }

  getCurrentDate(): string {
    return new Date().toLocaleDateString('es-CO', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  }

  cancel(): void {
    this.modalController.dismiss(null, 'cancel');
  }

  async confirm(): Promise<void> {
    await Haptics.impact({ style: ImpactStyle.Light });
    this.modalController.dismiss({
      merchant: this.merchantName,
      amount: this.amount
    }, 'confirm');
  }
}
