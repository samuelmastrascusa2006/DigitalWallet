import { Component, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-calendar',
  standalone: false,
  templateUrl: './calendar.component.html',
  styleUrls: ['./calendar.component.scss']
})
export class CalendarComponent {
  @Output() dateSelected = new EventEmitter<Date>();

  // Limitar calendario hasta el día de hoy
  maxDate: string = new Date().toISOString();

  onDateSelected(event: any): void {
    const rawValue = event?.detail?.value;
    if (!rawValue || typeof rawValue !== 'string') {
      return;
    }

    const normalizedDate = this.parseLocalCalendarDate(rawValue);
    if (normalizedDate) {
      this.dateSelected.emit(normalizedDate);
    }
  }

  private parseLocalCalendarDate(value: string): Date | null {
    const dateText = value.slice(0, 10);
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateText);
    if (!match) {
      return null;
    }

    const year = Number(match[1]);
    const month = Number(match[2]) - 1;
    const day = Number(match[3]);

    // Usar hora media para evitar desfaces por zona horaria/UTC.
    return new Date(year, month, day, 12, 0, 0, 0);
  }
}
