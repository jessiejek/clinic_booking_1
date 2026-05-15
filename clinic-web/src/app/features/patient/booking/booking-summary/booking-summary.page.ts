import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, LoadingController, ToastController } from '@ionic/angular';
import { Router, RouterModule } from '@angular/router';
import { addIcons } from 'ionicons';
import { calendarOutline, timeOutline, medicalOutline, cashOutline, personOutline } from 'ionicons/icons';
import { BookingFlowService } from '../../../booking/services/booking-flow.service';
import { BookingService } from '../../../booking/services/booking.service';
import { CreateBookingRequest } from '../../../booking/models/booking.model';

@Component({
  selector: 'app-booking-summary',
  standalone: true,
  imports: [CommonModule, IonicModule, RouterModule],
  templateUrl: './booking-summary.page.html',
  styleUrls: ['./booking-summary.page.scss'],
})
export class BookingSummaryPage implements OnInit {
  private router = inject(Router);
  private bookingFlow = inject(BookingFlowService);
  private bookingService = inject(BookingService);
  private loadingCtrl = inject(LoadingController);
  private toastCtrl = inject(ToastController);

  doctor = this.bookingFlow.selectedDoctor;
  date = this.bookingFlow.selectedDate;
  slot = this.bookingFlow.selectedSlot;
  service = this.bookingFlow.selectedService;

  paymentMode = signal<'Online' | 'PayAtClinic'>('Online');

  constructor() {
    addIcons({ calendarOutline, timeOutline, medicalOutline, cashOutline, personOutline });
  }

  ngOnInit() {
    if (!this.doctor() || !this.slot() || !this.service()) {
      this.router.navigate(['/book/doctors']);
    }
  }

  setPaymentMode(mode: 'Online' | 'PayAtClinic') {
    this.paymentMode.set(mode);
  }

  async confirmBooking() {
    const loader = await this.loadingCtrl.create({ message: 'Creating booking...' });
    await loader.present();

    const payload: CreateBookingRequest = {
      doctorId: this.doctor()!.id,
      serviceId: this.service()!.id,
      appointmentDate: this.date()!,
      slotStartTime: this.slot()!.startTime,
      paymentMode: this.paymentMode()
    };

    this.bookingService.createBooking(payload).subscribe({
      next: (result) => {
        loader.dismiss();
        this.bookingFlow.createdBookingId.set(result.bookingId);
        
        if (this.paymentMode() === 'Online') {
          this.router.navigate(['/book/proof', result.bookingId]);
        } else {
          this.router.navigate(['/book/confirmation']);
        }
      },
      error: () => {
        loader.dismiss();
        this.showToast('Failed to create booking. Please try again.');
      }
    });
  }

  async showToast(message: string) {
    const toast = await this.toastCtrl.create({ message, duration: 2000, color: 'danger' });
    await toast.present();
  }

  formatDate(dateStr: string | null): string {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  }
}
