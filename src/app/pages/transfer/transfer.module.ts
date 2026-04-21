import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';

import { TransferRoutingModule } from './transfer-routing.module';
import { TransferPage } from './transfer.page';
import { SharedModule } from '../../shared/shared.module';

@NgModule({
  declarations: [
    TransferPage
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    IonicModule,
    TransferRoutingModule,
    SharedModule
  ]
})
export class TransferModule { }
