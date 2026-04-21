import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-balance-display',
  standalone: false,
  templateUrl: './balance-display.component.html',
  styleUrls: ['./balance-display.component.scss']
})
export class BalanceDisplayComponent {
  @Input() balance: number = 0;
  hidden: boolean = false;

  toggleVisibility(): void {
    this.hidden = !this.hidden;
  }

  formatAmount(amount: number): string {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(amount);
  }
}
