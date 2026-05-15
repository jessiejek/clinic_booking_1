import { Injectable, inject } from '@angular/core';
import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';
import { ApiService } from '../../../core/services/api.service';
import { environment } from '../../../../environments/environment';
import { Service, CreateServiceRequest, UpdateServiceRequest } from '../models/service.model';
import { MOCK_SERVICES } from '../mocks/service.mocks';

@Injectable({ providedIn: 'root' })
export class ServiceAdminService {
  private api = inject(ApiService);

  getServices(): Observable<Service[]> {
    if (environment.useMocks) return of(MOCK_SERVICES).pipe(delay(400));
    return this.api.get<Service[]>('/api/v1/services');
  }

  createService(payload: CreateServiceRequest): Observable<void> {
    if (environment.useMocks) {
      MOCK_SERVICES.push({ ...payload, id: crypto.randomUUID() });
      return of(void 0).pipe(delay(500));
    }
    return this.api.post<void>('/api/v1/services', payload);
  }

  updateService(id: string, payload: UpdateServiceRequest): Observable<void> {
    if (environment.useMocks) {
      const index = MOCK_SERVICES.findIndex(s => s.id === id);
      if (index > -1) {
        MOCK_SERVICES[index] = { ...MOCK_SERVICES[index], ...payload };
      }
      return of(void 0).pipe(delay(500));
    }
    return this.api.put<void>(`/api/v1/services/${id}`, payload);
  }

  deleteService(id: string): Observable<void> {
    if (environment.useMocks) {
      const index = MOCK_SERVICES.findIndex(s => s.id === id);
      if (index > -1) {
        MOCK_SERVICES.splice(index, 1);
      }
      return of(void 0).pipe(delay(500));
    }
    return this.api.delete<void>(`/api/v1/services/${id}`);
  }
}
