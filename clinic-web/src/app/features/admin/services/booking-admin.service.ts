import { Injectable, inject } from '@angular/core';
import { Observable, of, delay } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ApiService } from '../../../core/services/api.service';
import { 
  Booking, 
  BookingFilters, 
  WalkInBookingRequest, 
  BookingResult, 
  PatientSearchResult 
} from '../../booking/models/booking.model';
import { MOCK_ALL_BOOKINGS } from '../../booking/mocks/booking.mocks';

@Injectable({ providedIn: 'root' })
export class BookingAdminService {
  private api = inject(ApiService);

  getAllBookings(filters: BookingFilters): Observable<Booking[]> {
    if (environment.useMocks) {
      let filtered = [...MOCK_ALL_BOOKINGS];
      if (filters.date) filtered = filtered.filter(b => b.appointmentDate === filters.date);
      if (filters.doctorId) filtered = filtered.filter(b => b.doctorName.includes(filters.doctorId!));
      if (filters.status) filtered = filtered.filter(b => b.status === filters.status);
      return of(filtered).pipe(delay(500));
    }
    return this.api.get<Booking[]>('/api/v1/admin/bookings', filters as any);
  }

  confirmBooking(id: string): Observable<void> {
    if (environment.useMocks) return of(undefined).pipe(delay(400));
    return this.api.post<void>(`/api/v1/admin/bookings/${id}/confirm`, {});
  }

  rejectBooking(id: string, reason: string): Observable<void> {
    if (environment.useMocks) return of(undefined).pipe(delay(400));
    return this.api.post<void>(`/api/v1/admin/bookings/${id}/reject`, { reason });
  }

  completeBooking(id: string): Observable<void> {
    if (environment.useMocks) return of(undefined).pipe(delay(400));
    return this.api.post<void>(`/api/v1/admin/bookings/${id}/complete`, {});
  }

  markNoShow(id: string): Observable<void> {
    if (environment.useMocks) return of(undefined).pipe(delay(400));
    return this.api.post<void>(`/api/v1/admin/bookings/${id}/no-show`, {});
  }

  markPaid(id: string): Observable<void> {
    if (environment.useMocks) return of(undefined).pipe(delay(400));
    return this.api.post<void>(`/api/v1/admin/bookings/${id}/mark-paid`, {});
  }

  createWalkInBooking(payload: WalkInBookingRequest): Observable<BookingResult> {
    if (environment.useMocks) {
      const result: BookingResult = {
        bookingId: 'walkin-' + Date.now(),
        queueNumber: 10,
        status: 'Confirmed'
      };
      return of(result).pipe(delay(600));
    }
    return this.api.post<BookingResult>('/api/v1/admin/bookings/walk-in', payload);
  }

  searchPatients(query: string): Observable<PatientSearchResult[]> {
    if (environment.useMocks) {
      const patients: PatientSearchResult[] = [
        { id: 'p-001', fullName: 'Juan dela Cruz', email: 'patient@clinic.ph', phone: '09171234567' }
      ];
      return of(patients.filter(p => p.fullName.toLowerCase().includes(query.toLowerCase()))).pipe(delay(300));
    }
    return this.api.get<PatientSearchResult[]>(`/api/v1/admin/patients/search?q=${query}`);
  }
}
