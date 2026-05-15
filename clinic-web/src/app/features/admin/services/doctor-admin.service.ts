import { Injectable, inject } from '@angular/core';
import { Observable, of } from 'rxjs';
import { delay, tap } from 'rxjs/operators';
import { ApiService } from '../../../core/services/api.service';
import { environment } from '../../../../environments/environment';
import { Doctor, DoctorSchedule, CreateDoctorRequest, UpdateDoctorRequest, BlockedDate } from '../models/doctor.model';
import { MOCK_DOCTORS } from '../mocks/doctor.mocks';

@Injectable({ providedIn: 'root' })
export class DoctorAdminService {
  private api = inject(ApiService);

  getDoctors(): Observable<Doctor[]> {
    if (environment.useMocks) return of(MOCK_DOCTORS).pipe(delay(400));
    return this.api.get<Doctor[]>('/api/v1/doctors');
  }

  getDoctorById(id: string): Observable<Doctor> {
    if (environment.useMocks) {
      const doctor = MOCK_DOCTORS.find(d => d.id === id);
      return of(doctor!).pipe(delay(300));
    }
    return this.api.get<Doctor>(`/api/v1/doctors/${id}`);
  }

  createDoctor(payload: CreateDoctorRequest): Observable<void> {
    if (environment.useMocks) {
      const newDoctor: Doctor = {
        ...payload,
        id: crypto.randomUUID(),
        status: payload.status || 'Active',
        services: [],
        averageRating: 0,
        profilePhotoUrl: null
      };
      MOCK_DOCTORS.push(newDoctor);
      return of(void 0).pipe(delay(600));
    }
    return this.api.post<void>('/api/v1/doctors', payload);
  }

  updateDoctor(id: string, payload: UpdateDoctorRequest): Observable<void> {
    if (environment.useMocks) {
      const index = MOCK_DOCTORS.findIndex(d => d.id === id);
      if (index > -1) {
        MOCK_DOCTORS[index] = { ...MOCK_DOCTORS[index], ...payload };
      }
      return of(void 0).pipe(delay(500));
    }
    return this.api.put<void>(`/api/v1/doctors/${id}`, payload);
  }

  deleteDoctor(id: string): Observable<void> {
    if (environment.useMocks) {
      const index = MOCK_DOCTORS.findIndex(d => d.id === id);
      if (index > -1) {
        MOCK_DOCTORS.splice(index, 1);
      }
      return of(void 0).pipe(delay(500));
    }
    return this.api.delete<void>(`/api/v1/doctors/${id}`);
  }

  setSchedule(doctorId: string, schedules: DoctorSchedule[]): Observable<void> {
    if (environment.useMocks) return of(void 0).pipe(delay(500));
    return this.api.post<void>(`/api/v1/doctors/${doctorId}/schedules`, { schedules });
  }

  addBlockedDate(doctorId: string, date: string, reason?: string): Observable<void> {
    if (environment.useMocks) return of(void 0).pipe(delay(400));
    return this.api.post<void>(`/api/v1/doctors/${doctorId}/blocked-dates`, { date, reason });
  }

  removeBlockedDate(doctorId: string, dateId: string): Observable<void> {
    if (environment.useMocks) return of(void 0).pipe(delay(400));
    return this.api.delete<void>(`/api/v1/doctors/${doctorId}/blocked-dates/${dateId}`);
  }

  linkService(doctorId: string, serviceId: string): Observable<void> {
    if (environment.useMocks) return of(void 0).pipe(delay(400));
    return this.api.post<void>(`/api/v1/doctors/${doctorId}/services/${serviceId}`, {});
  }

  unlinkService(doctorId: string, serviceId: string): Observable<void> {
    if (environment.useMocks) return of(void 0).pipe(delay(400));
    return this.api.delete<void>(`/api/v1/doctors/${doctorId}/services/${serviceId}`);
  }
}
