import { Component, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-quick-actions',
  standalone: false,
  templateUrl: './quick-actions.component.html',
  styleUrls: ['./quick-actions.component.scss']
})
export class QuickActionsComponent {
  @Output() action = new EventEmitter<'pay' | 'add' | 'history'>();

  onAction(type: 'pay' | 'add' | 'history'): void {
    this.action.emit(type);
  }
}
