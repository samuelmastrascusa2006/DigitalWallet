import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { AddCardPageRoutingModule } from './add-card-routing.module';
import { SharedModule } from '../../shared/shared.module';

import { AddCardPage } from './add-card.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    IonicModule,
    SharedModule,
    AddCardPageRoutingModule
  ],
  declarations: [AddCardPage]
})
export class AddCardPageModule {}
