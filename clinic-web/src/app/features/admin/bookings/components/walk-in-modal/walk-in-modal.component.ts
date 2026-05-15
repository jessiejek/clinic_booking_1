import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, ModalController, ToastController, LoadingController } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { BookingAdminService } from '../../../services/booking-admin.service';
import { BookingService } from '../../../../booking/services/booking.service';
import { PatientSearchResult, TimeSlot, WalkInBookingRequest } from '../../../../booking/models/booking.model';
import { Doctor } from '../../../models/doctor.model';
import { MOCK_DOCTORS } from '../../../mocks/doctor.mocks';
import { SlotPickerComponent } from '../../../../patient/booking/components/slot-picker/slot-picker.component';
import { addIcons } from 'ionicons';
import { closeOutline, searchOutline, personAddOutline, arrowBackOutline, arrowForwardOutline, checkmarkCircleOutline } from 'ionicons/icons';

@Component({
  selector: 'app-walk-in-modal',
  standalone: true,
  imports: [CommonModule, IonicModule, FormsModule, SlotPickerComponent],
  templateUrl: './walk-in-modal.component.html',
  styleUrls: ['./walk-in-modal.component.scss']
})
export class WalkInModalComponent implements OnInit {
  private modalCtrl = inject(ModalController);
  private bookingAdminService = inject(BookingAdminService);
  private bookingService = inject(BookingService);
  private toastCtrl = inject(ToastController);
  private loadingCtrl = inject(LoadingController);

  step = signal(1);
  
  // Step 1: Patient Search
  searchQuery = '';
  searchResults = signal<PatientSearchResult[]>([]);
  selectedPatient = signal<PatientSearchResult | null>(null);
  isGuest = signal(false);
  guestName = '';
  guestPhone = '';

  // Step 2: Slot Selection
  doctors = MOCK_DOCTORS;
  selectedDoctor = signal<Doctor | null>(null);
  selectedDate = signal(new Date().toISOString());
  slots = signal<TimeSlot[]>([]);
  selectedSlot = signal<TimeSlot | null>(null);
  isLoadingSlots = signal(false);

  // Step 3: Payment
  paymentMode = signal<'PayAtClinic' | 'Online'>('PayAtClinic');

  constructor() {
    addIcons({ closeOutline, searchOutline, personAddOutline, arrowBackOutline, arrowForwardOutline, checkmarkCircleOutline });
  }

  ngOnInit() {}

  dismiss(data?: any) {
    this.modalCtrl.dismiss(data);
  }

  searchPatients() {
    if (this.searchQuery.length < 2) return;
    this.bookingAdminService.searchPatients(this.searchQuery).subscribe({
      next: (results: PatientSearchResult[]) => this.searchResults.set(results)
    });
  }

  selectPatient(patient: PatientSearchResult) {
    this.selectedPatient.set(patient);
    this.isGuest.set(false);
    this.nextStep();
  }

  useGuest() {
    this.isGuest.set(true);
    this.selectedPatient.set(null);
  }

  onDoctorChange(ev: any) {
    const doctor = this.doctors.find((d: Doctor) => d.id === ev.detail.value);
    this.selectedDoctor.set(doctor || null);
    this.loadSlots();
  }

  onDateChange() {
    this.loadSlots();
  }

  loadSlots() {
    if (!this.selectedDoctor()) return;
    this.isLoadingSlots.set(true);
    this.bookingService.getAvailableSlots(this.selectedDoctor()!.id, this.selectedDate()).subscribe({
      next: (slots: TimeSlot[]) => {
        this.slots.set(slots);
        this.isLoadingSlots.set(false);
      },
      error: () => this.isLoadingSlots.set(false)
    });
  }

  onSlotSelected(slot: TimeSlot) {
    this.selectedSlot.set(slot);
  }

  nextStep() {
    if (this.step() === 1) {
      if (this.isGuest() && !this.guestName) {
        this.showToast('Please enter guest name');
        return;
      }
      if (!this.selectedPatient() && !this.isGuest()) {
        this.showToast('Please select a patient');
        return;
      }
    }
    if (this.step() === 2 && !this.selectedSlot()) {
      this.showToast('Please select a slot');
      return;
    }
    this.step.update(s => s + 1);
  }

  prevStep() {
    this.step.update(s => s - 1);
  }

  async createWalkIn() {
    const loader = await this.loadingCtrl.create({ message: 'Creating walk-in...' });
    await loader.present();

    const payload: WalkInBookingRequest = {
      doctorId: this.selectedDoctor()!.id,
      serviceId: this.selectedDoctor()!.services[0].id,
      appointmentDate: this.selectedDate(),
      slotStartTime: this.selectedSlot()!.startTime,
      paymentMode: this.paymentMode(),
      patientId: this.selectedPatient()?.id,
      guestName: this.isGuest() ? this.guestName : undefined,
      guestPhone: this.isGuest() ? this.guestPhone : undefined
    };

    this.bookingAdminService.createWalkInBooking(payload).subscribe({
      next: (result: any) => {
        loader.dismiss();
        this.showToast(`Walk-in created! Queue #${result.queueNumber}`, 'success');
        this.dismiss(true);
      },
      error: () => {
        loader.dismiss();
        this.showToast('Failed to create walk-in', 'danger');
      }
    });
  }

  async showToast(message: string, color: string = 'primary') {
    const toast = await this.toastCtrl.create({ message, duration: 2000, color });
    await toast.present();
  }
}
