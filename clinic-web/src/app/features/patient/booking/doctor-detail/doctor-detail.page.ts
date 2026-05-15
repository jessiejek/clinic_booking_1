import { Component, OnInit, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { addIcons } from 'ionicons';
import { arrowBackOutline, warningOutline, star, chevronDownOutline } from 'ionicons/icons';
import { Doctor } from '../../../admin/models/doctor.model';
import { Service } from '../../../admin/models/service.model';
import { BookingFlowService } from '../../../booking/services/booking-flow.service';
import { BookingService } from '../../../booking/services/booking.service';
import { TimeSlot } from '../../../booking/models/booking.model';
import { SlotPickerComponent } from '../components/slot-picker/slot-picker.component';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-doctor-detail',
  standalone: true,
  imports: [CommonModule, IonicModule, RouterModule, SlotPickerComponent, FormsModule],
  templateUrl: './doctor-detail.page.html',
  styleUrls: ['./doctor-detail.page.scss'],
})
export class DoctorDetailPage implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private bookingFlow = inject(BookingFlowService);
  private bookingService = inject(BookingService);

  doctor = signal<Doctor | null>(null);
  services = signal<Service[]>([]);
  selectedDate = signal<string>(new Date().toISOString());
  minDate = new Date().toISOString();
  
  slots = signal<TimeSlot[]>([]);
  isLoadingSlots = signal(false);
  
  selectedSlot = signal<TimeSlot | null>(null);
  selectedService = signal<Service | null>(null);

  summaryVisible = computed(() => !!this.selectedSlot() && !!this.selectedService());

  constructor() {
    addIcons({ arrowBackOutline, warningOutline, star, chevronDownOutline });
  }

  ngOnInit() {
    const doctorId = this.route.snapshot.paramMap.get('id');
    if (doctorId) {
      this.loadDoctor(doctorId);
    }
  }

  loadDoctor(id: string) {
    // In a real app, fetch from a doctor service. For now, use flow or mock.
    const flowDoctor = this.bookingFlow.selectedDoctor();
    if (flowDoctor && flowDoctor.id === id) {
      this.setupDoctor(flowDoctor);
    } else {
      // Import MOCK_DOCTORS if not in flow
      import('../../../admin/mocks/doctor.mocks').then(m => {
        const d = m.MOCK_DOCTORS.find(doc => doc.id === id);
        if (d) this.setupDoctor(d);
      });
    }
  }

  setupDoctor(d: Doctor) {
    this.doctor.set(d);
    this.services.set(d.services || []);
    if (this.services().length === 1) {
      this.selectedService.set(this.services()[0]);
    }
    this.loadSlots();
  }

  onDateChange() {
    this.selectedSlot.set(null);
    this.loadSlots();
  }

  loadSlots() {
    const d = this.doctor();
    if (!d) return;

    this.isLoadingSlots.set(true);
    this.bookingService.getAvailableSlots(d.id, this.selectedDate()).subscribe({
      next: (data) => {
        this.slots.set(data);
        this.isLoadingSlots.set(false);
      },
      error: () => this.isLoadingSlots.set(false)
    });
  }

  onSlotSelected(slot: TimeSlot) {
    this.selectedSlot.set(slot);
  }

  onServiceChange(ev: any) {
    const service = this.services().find(s => s.id === ev.detail.value);
    this.selectedService.set(service || null);
  }

  proceedToBook() {
    if (!this.summaryVisible()) return;
    
    this.bookingFlow.selectedDoctor.set(this.doctor());
    this.bookingFlow.selectedDate.set(this.selectedDate());
    this.bookingFlow.selectedSlot.set(this.selectedSlot());
    this.bookingFlow.selectedService.set(this.selectedService());
    
    this.router.navigate(['/book/summary']);
  }

  getInitials(name: string): string {
    return name?.split(' ').map(n => n[0]).join('').toUpperCase() || '';
  }
}
