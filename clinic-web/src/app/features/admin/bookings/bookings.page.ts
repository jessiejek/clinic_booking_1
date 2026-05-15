import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, ModalController } from '@ionic/angular';
import { BookingAdminService } from '../services/booking-admin.service';
import { Booking, BookingFilters } from '../../booking/models/booking.model';
import { BookingStatusBadgeComponent } from '../../../shared/components/booking-status-badge/booking-status-badge.component';
import { addIcons } from 'ionicons';
import { filterOutline, walkOutline, calendarOutline, personOutline, medicalOutline, searchOutline } from 'ionicons/icons';
import { FormsModule } from '@angular/forms';
import { MOCK_DOCTORS } from '../mocks/doctor.mocks';

@Component({
  selector: 'app-bookings-admin',
  standalone: true,
  imports: [CommonModule, IonicModule, FormsModule, BookingStatusBadgeComponent],
  templateUrl: './bookings.page.html',
  styleUrls: ['./bookings.page.scss'],
})
export class BookingsPage implements OnInit {
  private bookingAdminService = inject(BookingAdminService);
  private modalCtrl = inject(ModalController);

  bookings = signal<Booking[]>([]);
  isLoading = signal(true);
  
  doctors = MOCK_DOCTORS;
  filters: BookingFilters = {
    date: new Date().toISOString().split('T')[0],
    doctorId: '',
    status: undefined
  };

  constructor() {
    addIcons({ filterOutline, walkOutline, calendarOutline, personOutline, medicalOutline, searchOutline });
  }

  ngOnInit() {
    this.loadBookings();
  }

  loadBookings() {
    this.isLoading.set(true);
    this.bookingAdminService.getAllBookings(this.filters).subscribe({
      next: (data) => {
        this.bookings.set(data);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });
  }

  onFilterChange() {
    this.loadBookings();
  }

  async openBookingDetail(booking: Booking) {
    const { BookingDetailModalComponent } = await import('./components/booking-detail-modal/booking-detail-modal.component');
    const modal = await this.modalCtrl.create({
      component: BookingDetailModalComponent,
      componentProps: { booking }
    });
    await modal.present();
    const { data } = await modal.onWillDismiss();
    if (data) this.loadBookings();
  }

  async openWalkInModal() {
    const { WalkInModalComponent } = await import('./components/walk-in-modal/walk-in-modal.component');
    const modal = await this.modalCtrl.create({
      component: WalkInModalComponent,
      cssClass: 'walk-in-modal'
    });
    await modal.present();
    const { data } = await modal.onWillDismiss();
    if (data) this.loadBookings();
  }

  getPaymentBadgeClass(status: string): string {
    return status === 'Paid' ? 'badge-confirmed' : 'badge-expired';
  }
}
