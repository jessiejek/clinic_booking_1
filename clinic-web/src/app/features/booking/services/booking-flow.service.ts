import { Injectable, signal } from '@angular/core';
import { Doctor } from '../../admin/models/doctor.model';
import { Service } from '../../admin/models/service.model';
import { TimeSlot } from '../models/booking.model';

@Injectable({ providedIn: 'root' })
export class BookingFlowService {
  selectedDoctor = signal<Doctor | null>(null);
  selectedDate   = signal<string | null>(null);
  selectedSlot   = signal<TimeSlot | null>(null);
  selectedService = signal<Service | null>(null);
  createdBookingId = signal<string | null>(null);

  resetFlow() {
    this.selectedDoctor.set(null);
    this.selectedDate.set(null);
    this.selectedSlot.set(null);
    this.selectedService.set(null);
    this.createdBookingId.set(null);
  }
}
