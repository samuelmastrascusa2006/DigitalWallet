import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-skeleton-loading',
  standalone: false,
  templateUrl: './skeleton-loading.component.html',
  styleUrls: ['./skeleton-loading.component.scss']
})
export class SkeletonLoadingComponent {
  @Input() count: number = 3;
}
