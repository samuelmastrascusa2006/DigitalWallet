import { Component, Input } from '@angular/core';
import { ModalController } from '@ionic/angular';

@Component({
  selector: 'app-emoji-picker-modal',
  standalone: false,
  templateUrl: './emoji-picker-modal.component.html',
  styleUrls: ['./emoji-picker-modal.component.scss']
})
export class EmojiPickerModalComponent {
  @Input() currentEmoji?: string;

  constructor(private modalController: ModalController) {}

  selectEmoji(event: any): void {
    const emoji = event.emoji?.native;
    if (emoji) {
      this.modalController.dismiss(emoji, 'selected');
    }
  }

  close(): void {
    this.modalController.dismiss(null, 'cancel');
  }
}
