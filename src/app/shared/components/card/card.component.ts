import { Component, Input, OnInit, ElementRef, ViewChild } from '@angular/core';
import anime from 'animejs';
import { Card } from '../../../models/card.model';

@Component({
  selector: 'app-card',
  standalone: false,
  templateUrl: './card.component.html',
  styleUrls: ['./card.component.scss']
})
export class CardComponent implements OnInit {
  @Input() card!: Card;

  constructor(private el: ElementRef) {}

  ngOnInit(): void {
    this.animateEntrance();
  }


  getCardGradient(): string {
    const baseColor = this.card?.color || '#00F5FF';
    return `linear-gradient(135deg, ${this.adjustColor(baseColor, -60)}, #0A0A0A)`;
  }

  getHolographicGlare(): string {
    const baseColor = this.card?.color || '#00F5FF';
    return `radial-gradient(circle at center, ${baseColor} 0%, transparent 70%)`;
  }

  private animateEntrance(): void {
    anime({
      targets: this.el.nativeElement.querySelector('.wallet-card'),
      scale: [0.95, 1],
      rotateX: [15, 0],
      opacity: [0, 1],
      easing: 'easeOutElastic(1, .8)',
      duration: 1500,
      delay: 200
    });
  }

  private adjustColor(hex: string, amount: number): string {
    let color = hex.replace('#', '');
    if (color.length === 3) color = color.split('').map(s => s + s).join('');
    const num = parseInt(color, 16);
    let r = Math.min(255, Math.max(0, (num >> 16) + amount));
    let g = Math.min(255, Math.max(0, ((num >> 8) & 0x00FF) + amount));
    let b = Math.min(255, Math.max(0, (num & 0x0000FF) + amount));
    return `#${(1 << 24 | r << 16 | g << 8 | b).toString(16).slice(1)}`;
  }
}
