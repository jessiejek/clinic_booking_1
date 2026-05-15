import { Injectable, inject } from '@angular/core';
import { Observable, of, delay } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ApiService } from '../../../core/services/api.service';
import { 
  Booking, 
  TimeSlot, 
  CreateBookingRequest, 
  BookingResult, 
  SubmitProofRequest 
} from '../models/booking.model';
import { MOCK_SLOTS, MOCK_BOOKINGS } from '../mocks/booking.mocks';

@Injectable({ providedIn: 'root' })
export class BookingService {
  private api = inject(ApiService);

  getAvailableSlots(doctorId: string, date: string): Observable<TimeSlot[]> {
    if (environment.useMocks) {
      const slots = MOCK_SLOTS[doctorId] || [];
      return of(slots).pipe(delay(500));
    }
    return this.api.get<TimeSlot[]>(`/api/v1/bookings/slots?doctorId=${doctorId}&date=${date}`);
  }

  createBooking(payload: CreateBookingRequest): Observable<BookingResult> {
    if (environment.useMocks) {
      const result: BookingResult = {
        bookingId: 'new-booking-' + Date.now(),
        queueNumber: payload.paymentMode === 'PayAtClinic' ? 5 : null,
        status: payload.paymentMode === 'PayAtClinic' ? 'Confirmed' : 'Pending'
      };
      return of(result).pipe(delay(600));
    }
    return this.api.post<BookingResult>('/api/v1/bookings', payload);
  }

  submitProof(bookingId: string, payload: SubmitProofRequest): Observable<void> {
    if (environment.useMocks) {
      return of(undefined).pipe(delay(500));
    }
    return this.api.post<void>(`/api/v1/bookings/${bookingId}/proof`, payload);
  }

  cancelBooking(bookingId: string, reason?: string): Observable<void> {
    if (environment.useMocks) {
      return of(undefined).pipe(delay(400));
    }
    return this.api.post<void>(`/api/v1/bookings/${bookingId}/cancel`, { reason });
  }

  getMyBookings(): Observable<Booking[]> {
    if (environment.useMocks) {
      return of(MOCK_BOOKINGS).pipe(delay(500));
    }
    return this.api.get<Booking[]>('/api/v1/bookings/my');
  }

  getBookingById(id: string): Observable<Booking> {
    if (environment.useMocks) {
      const booking = MOCK_BOOKINGS.find(b => b.id === id) || MOCK_BOOKINGS[0];
      return of(booking).pipe(delay(400));
    }
    return this.api.get<Booking>(`/api/v1/bookings/${id}`);
  }
}
