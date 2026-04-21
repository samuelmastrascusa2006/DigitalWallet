import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';

import { CardComponent } from './components/card/card.component';
import { TransactionListComponent } from './components/transaction-list/transaction-list.component';
import { TransactionItemComponent } from './components/transaction-item/transaction-item.component';
import { BalanceDisplayComponent } from './components/balance-display/balance-display.component';
import { QuickActionsComponent } from './components/quick-actions/quick-actions.component';
import { CustomInputComponent } from './components/custom-input/custom-input.component';
import { PaymentSimulatorComponent } from './components/payment-simulator/payment-simulator.component';
import { SkeletonLoadingComponent } from './components/skeleton-loading/skeleton-loading.component';
import { CalendarComponent } from './components/calendar/calendar.component';
import { PaymentConfirmationComponent } from './components/payment-confirmation/payment-confirmation.component';
import { EmojiPickerModalComponent } from './components/emoji-picker-modal/emoji-picker-modal.component';
import { PickerModule } from '@ctrl/ngx-emoji-mart';

@NgModule({
  declarations: [
    CardComponent,
    TransactionListComponent,
    TransactionItemComponent,
    BalanceDisplayComponent,
    QuickActionsComponent,
    CustomInputComponent,
    PaymentSimulatorComponent,
    SkeletonLoadingComponent,
    CalendarComponent,
    PaymentConfirmationComponent,
    EmojiPickerModalComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    IonicModule,
    PickerModule
  ],
  exports: [
    CardComponent,
    TransactionListComponent,
    TransactionItemComponent,
    BalanceDisplayComponent,
    QuickActionsComponent,
    CustomInputComponent,
    PaymentSimulatorComponent,
    SkeletonLoadingComponent,
    CalendarComponent,
    PaymentConfirmationComponent,
    EmojiPickerModalComponent
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class SharedModule {}
