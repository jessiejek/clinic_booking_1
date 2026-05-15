import { Component, Input, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, ModalController, ActionSheetController, ToastController } from '@ionic/angular';
import { Booking } from '../../../../booking/models/booking.model';
import { BookingAdminService } from '../../../services/booking-admin.service';
import { BookingStatusBadgeComponent } from '../../../../../shared/components/booking-status-badge/booking-status-badge.component';
import { addIcons } from 'ionicons';
import { closeOutline, ellipsisVerticalOutline, checkmarkCircleOutline, closeCircleOutline, cashOutline, banOutline, checkmarkDoneOutline } from 'ionicons/icons';

@Component({
  selector: 'app-booking-detail-modal',
  standalone: true,
  imports: [CommonModule, IonicModule, BookingStatusBadgeComponent],
  templateUrl: './booking-detail-modal.component.html',
  styleUrls: ['./booking-detail-modal.component.scss']
})
export class BookingDetailModalComponent implements OnInit {
  @Input() booking!: Booking;

  private modalCtrl = inject(ModalController);
  private actionSheetCtrl = inject(ActionSheetController);
  private bookingAdminService = inject(BookingAdminService);
  private toastCtrl = inject(ToastController);

  constructor() {
    addIcons({ 
      closeOutline, 
      ellipsisVerticalOutline, 
      checkmarkCircleOutline, 
      closeCircleOutline, 
      cashOutline, 
      banOutline, 
      checkmarkDoneOutline 
    });
  }

  ngOnInit() {}

  dismiss(data?: any) {
    this.modalCtrl.dismiss(data);
  }

  async openActions() {
    const buttons = [];

    if (this.booking.status === 'ProofSubmitted') {
      buttons.push(
        { text: 'Confirm Payment', icon: 'checkmark-circle-outline', handler: () => this.confirmBooking() },
        { text: 'Reject Payment', icon: 'close-circle-outline', role: 'destructive', handler: () => this.rejectBooking() }
      );
    }

    if (this.booking.status === 'Confirmed') {
      if (this.booking.paymentStatus === 'Unpaid') {
        buttons.push({ text: 'Mark as Paid', icon: 'cash-outline', handler: () => this.markPaid() });
      }
      buttons.push(
        { text: 'Mark Completed', icon: 'checkmark-done-outline', handler: () => this.completeBooking() },
        { text: 'Mark No Show', icon: 'ban-outline', handler: () => this.markNoShow() }
      );
    }

    buttons.push({ text: 'Close', icon: 'close-outline', role: 'cancel' });

    const actionSheet = await this.actionSheetCtrl.create({
      header: 'Booking Actions',
      buttons: buttons as any
    });

    await actionSheet.present();
  }

  confirmBooking() {
    this.bookingAdminService.confirmBooking(this.booking.id).subscribe({
      next: () => {
        this.showToast('Booking confirmed');
        this.dismiss(true);
      }
    });
  }

  rejectBooking() {
    // In real app, prompt for reason. Here we just mock.
    this.bookingAdminService.rejectBooking(this.booking.id, 'Invalid proof').subscribe({
      next: () => {
        this.showToast('Booking rejected');
        this.dismiss(true);
      }
    });
  }

  completeBooking() {
    this.bookingAdminService.completeBooking(this.booking.id).subscribe({
      next: () => {
        this.showToast('Appointment completed');
        this.dismiss(true);
      }
    });
  }

  markNoShow() {
    this.bookingAdminService.markNoShow(this.booking.id).subscribe({
      next: () => {
        this.showToast('Marked as No Show');
        this.dismiss(true);
      }
    });
  }

  markPaid() {
    this.bookingAdminService.markPaid(this.booking.id).subscribe({
      next: () => {
        this.showToast('Marked as Paid');
        this.dismiss(true);
      }
    });
  }

  async showToast(message: string) {
    const toast = await this.toastCtrl.create({ message, duration: 2000 });
    await toast.present();
  }
}
