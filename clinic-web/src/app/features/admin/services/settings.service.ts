import { Injectable, inject } from '@angular/core';
import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';
import { ApiService } from '../../../core/services/api.service';
import { environment } from '../../../../environments/environment';
import { ClinicSettings, UpdateSettingsRequest } from '../models/settings.model';
import { MOCK_CLINIC_SETTINGS } from '../mocks/settings.mocks';

@Injectable({ providedIn: 'root' })
export class SettingsService {
  private api = inject(ApiService);

  getFullSettings(): Observable<ClinicSettings> {
    if (environment.useMocks) return of(MOCK_CLINIC_SETTINGS).pipe(delay(500));
    return this.api.get<ClinicSettings>('/api/v1/settings/full');
  }

  updateSettings(payload: UpdateSettingsRequest): Observable<void> {
    if (environment.useMocks) {
      Object.assign(MOCK_CLINIC_SETTINGS, payload);
      return of(void 0).pipe(delay(600));
    }
    return this.api.put<void>('/api/v1/settings', payload);
  }
}
