import { Injectable, inject } from '@angular/core';
import { Observable, of, throwError, delay } from 'rxjs';
import { ApiService } from './api.service';
import { environment } from '../../../environments/environment';
import { MOCK_USERS, MOCK_PASSWORDS } from '../mocks/auth.mocks';
import { 
  AuthResponse, 
  LoginRequest, 
  RegisterRequest, 
  AuthUser 
} from '../models/auth.models';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private api = inject(ApiService);

  login(request: LoginRequest): Observable<AuthResponse> {
    if (environment.useMocks) {
      const user = MOCK_USERS[request.email];
      const expectedPassword = MOCK_PASSWORDS[request.email];

      if (!user || request.password !== expectedPassword) {
        return throwError(() => ({ 
          status: 401, 
          error: { error: 'Invalid email or password' } 
        }));
      }

      const mockResponse: AuthResponse = {
        accessToken: 'mock-access-token-' + user.role,
        refreshToken: 'mock-refresh-token',
        user,
      };
      return of(mockResponse).pipe(delay(500));
    }
    return this.api.post<AuthResponse>('/api/v1/auth/login', request);
  }

  register(request: RegisterRequest): Observable<AuthResponse> {
    if (environment.useMocks) {
      if (MOCK_USERS[request.email]) {
        return throwError(() => ({
          status: 409,
          error: { error: 'Email already in use' }
        }));
      }
      // Simulate successful registration
      const newUser: AuthUser = {
        id: crypto.randomUUID(),
        fullName: request.fullName,
        email: request.email,
        role: 'Patient',
        avatarUrl: null,
        isFirstLogin: false,
        isEmailVerified: false,
      };
      return of({ 
        accessToken: 'mock-token', 
        refreshToken: 'mock-refresh', 
        user: newUser 
      }).pipe(delay(600));
    }
    return this.api.post<AuthResponse>('/api/v1/auth/register', request);
  }

  forgotPassword(email: string): Observable<void> {
    if (environment.useMocks) return of(void 0).pipe(delay(400));
    return this.api.post<void>('/api/v1/auth/forgot-password', { email });
  }

  resetPassword(token: string, password: string, confirmPassword: string): Observable<void> {
    if (environment.useMocks) return of(void 0).pipe(delay(400));
    return this.api.post<void>('/api/v1/auth/reset-password', { token, password, confirmPassword });
  }

  setPassword(inviteToken: string, password: string, confirmPassword: string): Observable<AuthResponse> {
    if (environment.useMocks) {
      // Simulate invite set-password — return doctor user
      return of({
        accessToken: 'mock-token',
        refreshToken: 'mock-refresh',
        user: MOCK_USERS['dr.santos@clinic.ph'],
      }).pipe(delay(500));
    }
    return this.api.post<AuthResponse>('/api/v1/auth/set-password', { inviteToken, password, confirmPassword });
  }

  logout(): Observable<void> {
    if (environment.useMocks) return of(void 0).pipe(delay(200));
    return this.api.post<void>('/api/v1/auth/logout', {});
  }
}
