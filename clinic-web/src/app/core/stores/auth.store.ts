import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { 
  patchState, 
  signalStore, 
  withMethods, 
  withState 
} from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { pipe, switchMap, tap } from 'rxjs';
import { tapResponse } from '@ngrx/operators';
import { AuthUser, LoginRequest, AuthResponse } from '../models/auth.models';
import { AuthService } from '../services/auth.service';
import { StorageService } from '../services/storage.service';

export interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
};

export const AuthStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withMethods((
    store, 
    authService = inject(AuthService), 
    storage = inject(StorageService), 
    router = inject(Router)
  ) => ({
    login: rxMethod<LoginRequest>(
      pipe(
        tap(() => patchState(store, { isLoading: true, error: null })),
        switchMap((credentials) => 
          authService.login(credentials).pipe(
            tapResponse({
              next: (response: AuthResponse) => {
                storage.setTokens(response.accessToken, response.refreshToken);
                storage.setUser(response.user);
                patchState(store, { 
                  user: response.user, 
                  isAuthenticated: true, 
                  isLoading: false 
                });
                // Navigation handled in component or here
              },
              error: (err: any) => {
                patchState(store, { 
                  isLoading: false, 
                  error: err.error?.message || 'Login failed' 
                });
              }
            })
          )
        )
      )
    ),

    loadUserFromStorage(): void {
      const user = storage.getUser();
      const token = storage.getAccessToken();
      if (user && token) {
        patchState(store, { user, isAuthenticated: true });
      }
    },

    logout(): void {
      authService.logout().subscribe(() => {
        storage.clearAll();
        patchState(store, initialState);
        router.navigate(['/auth/login']);
      });
    },

    redirectByRole(): void {
      const user = store.user();
      if (!user) return;

      switch (user.role) {
        case 'Admin':
          router.navigate(['/admin/dashboard']);
          break;
        case 'Staff':
          router.navigate(['/admin/dashboard']);
          break;
        case 'Doctor':
          router.navigate(['/doctor/dashboard']);
          break;
        case 'Patient':
          router.navigate(['/portal']);
          break;
      }
    }
  }))
);
