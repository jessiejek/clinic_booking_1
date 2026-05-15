import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BookingStatus } from '../../../features/booking/models/booking.model';

@Component({
  selector: 'app-booking-status-badge',
  standalone: true,
  imports: [CommonModule],
  template: `
    <span class="badge" [ngClass]="badgeClass">
      {{ status }}
    </span>
  `,
  styles: [`
    :host { display: inline-block; }
  `]
})
export class BookingStatusBadgeComponent {
  @Input() status!: BookingStatus;

  get badgeClass(): string {
    switch (this.status) {
      case 'Pending':       return 'badge-pending';
      case 'Confirmed':     return 'badge-confirmed';
      case 'Completed':     return 'badge-completed';
      case 'Cancelled':     return 'badge-cancelled';
      case 'Expired':       return 'badge-expired';
      case 'NoShow':        return 'badge-no-show';
      case 'OnHold':        return 'badge-on-hold';
      case 'ProofSubmitted': return 'badge-confirmed'; // Use confirmed color for now or define a new one
      default:              return 'badge-expired';
    }
  }
}
