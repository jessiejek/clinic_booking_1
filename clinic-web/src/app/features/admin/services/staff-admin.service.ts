import { Injectable, inject } from '@angular/core';
import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';
import { ApiService } from '../../../core/services/api.service';
import { environment } from '../../../../environments/environment';
import { StaffMember, CreateStaffRequest } from '../models/staff.model';
import { MOCK_STAFF } from '../mocks/staff.mocks';

@Injectable({ providedIn: 'root' })
export class StaffAdminService {
  private api = inject(ApiService);

  getStaff(): Observable<StaffMember[]> {
    if (environment.useMocks) return of(MOCK_STAFF).pipe(delay(400));
    return this.api.get<StaffMember[]>('/api/v1/staff');
  }

  createStaff(payload: CreateStaffRequest): Observable<void> {
    if (environment.useMocks) {
      MOCK_STAFF.push({
        ...payload,
        id: `staff-${MOCK_STAFF.length + 1}`,
        userId: crypto.randomUUID(),
        isActive: true,
        createdAt: new Date().toISOString()
      });
      return of(void 0).pipe(delay(600));
    }
    return this.api.post<void>('/api/v1/staff', payload);
  }

  deactivateStaff(id: string): Observable<void> {
    if (environment.useMocks) {
      const staff = MOCK_STAFF.find(s => s.id === id);
      if (staff) staff.isActive = false;
      return of(void 0).pipe(delay(400));
    }
    return this.api.post<void>(`/api/v1/staff/${id}/deactivate`, {});
  }

  resendInvite(id: string): Observable<void> {
    if (environment.useMocks) return of(void 0).pipe(delay(400));
    return this.api.post<void>(`/api/v1/staff/${id}/resend-invite`, {});
  }
}
