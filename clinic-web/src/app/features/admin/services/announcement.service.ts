import { Injectable, inject } from '@angular/core';
import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';
import { ApiService } from '../../../core/services/api.service';
import { environment } from '../../../../environments/environment';
import { Announcement, CreateAnnouncementRequest, UpdateAnnouncementRequest } from '../models/announcement.model';
import { MOCK_ANNOUNCEMENTS } from '../mocks/announcement.mocks';

@Injectable({ providedIn: 'root' })
export class AnnouncementService {
  private api = inject(ApiService);

  getAnnouncements(): Observable<Announcement[]> {
    if (environment.useMocks) return of(MOCK_ANNOUNCEMENTS).pipe(delay(400));
    return this.api.get<Announcement[]>('/api/v1/announcements');
  }

  createAnnouncement(payload: CreateAnnouncementRequest): Observable<void> {
    if (environment.useMocks) {
      MOCK_ANNOUNCEMENTS.push({
        ...payload,
        id: `ann-${MOCK_ANNOUNCEMENTS.length + 1}`,
        createdAt: new Date().toISOString()
      });
      return of(void 0).pipe(delay(500));
    }
    return this.api.post<void>('/api/v1/announcements', payload);
  }

  updateAnnouncement(id: string, payload: UpdateAnnouncementRequest): Observable<void> {
    if (environment.useMocks) {
      const index = MOCK_ANNOUNCEMENTS.findIndex(a => a.id === id);
      if (index > -1) {
        MOCK_ANNOUNCEMENTS[index] = { ...MOCK_ANNOUNCEMENTS[index], ...payload };
      }
      return of(void 0).pipe(delay(500));
    }
    return this.api.put<void>(`/api/v1/announcements/${id}`, payload);
  }

  deleteAnnouncement(id: string): Observable<void> {
    if (environment.useMocks) {
      const index = MOCK_ANNOUNCEMENTS.findIndex(a => a.id === id);
      if (index > -1) {
        MOCK_ANNOUNCEMENTS.splice(index, 1);
      }
      return of(void 0).pipe(delay(500));
    }
    return this.api.delete<void>(`/api/v1/announcements/${id}`);
  }
}
