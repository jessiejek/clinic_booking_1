import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { Router, RouterModule } from '@angular/router';
import { addIcons } from 'ionicons';
import { checkmarkCircleOutline, calendarOutline, timeOutline, personOutline } from 'ionicons/icons';
import { BookingFlowService } from '../../../booking/services/booking-flow.service';
import { BookingService } from '../../../booking/services/booking.service';
import { Booking } from '../../../booking/models/booking.model';

@Component({
  selector: 'app-booking-confirmation',
  standalone: true,
  imports: [CommonModule, IonicModule, RouterModule],
  templateUrl: './booking-confirmation.page.html',
  styleUrls: ['./booking-confirmation.page.scss'],
})
export class BookingConfirmationPage implements OnInit {
  private router = inject(Router);
  private bookingFlow = inject(BookingFlowService);
  private bookingService = inject(BookingService);

  booking = signal<Booking | null>(null);

  constructor() {
    addIcons({ checkmarkCircleOutline, calendarOutline, timeOutline, personOutline });
  }

  ngOnInit() {
    const bookingId = this.bookingFlow.createdBookingId();
    if (bookingId) {
      this.bookingService.getBookingById(bookingId).subscribe({
        next: (data) => this.booking.set(data)
      });
    } else {
      // For demo, just show something if we landed here without ID
      this.booking.set({
        id: 'DEMO-123',
        patientName: 'Juan dela Cruz',
        doctorName: this.bookingFlow.selectedDoctor()?.fullName || 'Dr. Maria Santos',
        serviceName: this.bookingFlow.selectedService()?.name || 'General Consultation',
        appointmentDate: this.bookingFlow.selectedDate() || new Date().toISOString(),
        slotStartTime: this.bookingFlow.selectedSlot()?.startTime || '09:00',
        slotEndTime: this.bookingFlow.selectedSlot()?.endTime || '09:30',
        status: 'Confirmed',
        paymentStatus: 'Paid',
        paymentMode: 'PayAtClinic',
        queueNumber: 5,
        totalFee: 500,
        isWalkIn: false,
        orNumber: null,
        receiptUrl: null,
        createdAt: new Date().toISOString()
      });
    }
  }

  viewMyBookings() {
    this.router.navigate(['/portal/my-bookings']);
  }

  formatDate(dateStr: string | undefined): string {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  }
}
