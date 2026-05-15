import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, AlertController, ToastController } from '@ionic/angular';
import { BookingService } from '../../booking/services/booking.service';
import { Booking } from '../../booking/models/booking.model';
import { BookingStatusBadgeComponent } from '../../../shared/components/booking-status-badge/booking-status-badge.component';
import { addIcons } from 'ionicons';
import { calendarOutline, timeOutline, personOutline, medicalOutline, receiptOutline, closeCircleOutline } from 'ionicons/icons';

@Component({
  selector: 'app-my-bookings',
  standalone: true,
  imports: [CommonModule, IonicModule, BookingStatusBadgeComponent],
  templateUrl: './my-bookings.page.html',
  styleUrls: ['./my-bookings.page.scss'],
})
export class MyBookingsPage implements OnInit {
  private bookingService = inject(BookingService);
  private alertCtrl = inject(AlertController);
  private toastCtrl = inject(ToastController);

  bookings = signal<Booking[]>([]);
  isLoading = signal(true);
  selectedSegment = signal<'upcoming' | 'past'>('upcoming');

  constructor() {
    addIcons({ calendarOutline, timeOutline, personOutline, medicalOutline, receiptOutline, closeCircleOutline });
  }

  ngOnInit() {
    this.loadBookings();
  }

  onSegmentChange(ev: any) {
    const val = ev.detail.value as 'upcoming' | 'past';
    this.selectedSegment.set(val);
  }

  loadBookings(event?: any) {
    this.isLoading.set(true);
    this.bookingService.getMyBookings().subscribe({
      next: (data) => {
        this.bookings.set(data);
        this.isLoading.set(false);
        if (event) event.target.complete();
      },
      error: () => {
        this.isLoading.set(false);
        if (event) event.target.complete();
      }
    });
  }

  get filteredBookings() {
    const now = new Date().toISOString().split('T')[0];
    if (this.selectedSegment() === 'upcoming') {
      return this.bookings().filter(b => b.status === 'Pending' || b.status === 'Confirmed' || b.status === 'ProofSubmitted' || b.status === 'OnHold');
    } else {
      return this.bookings().filter(b => b.status === 'Completed' || b.status === 'Cancelled' || b.status === 'Expired' || b.status === 'NoShow');
    }
  }

  async cancelBooking(booking: Booking) {
    const alert = await this.alertCtrl.create({
      header: 'Cancel Appointment',
      message: 'Are you sure you want to cancel this appointment?',
      inputs: [
        {
          name: 'reason',
          type: 'textarea',
          placeholder: 'Reason for cancellation (optional)'
        }
      ],
      buttons: [
        { text: 'Back', role: 'cancel' },
        {
          text: 'Cancel Appointment',
          cssClass: 'alert-button-confirm',
          handler: (data) => {
            this.executeCancel(booking.id, data.reason);
          }
        }
      ]
    });

    await alert.present();
  }

  executeCancel(id: string, reason: string) {
    this.bookingService.cancelBooking(id, reason).subscribe({
      next: () => {
        this.showToast('Appointment cancelled successfully');
        this.loadBookings();
      }
    });
  }

  async showToast(message: string) {
    const toast = await this.toastCtrl.create({ message, duration: 2000, position: 'bottom' });
    await toast.present();
  }

  formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  }
}
