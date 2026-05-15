import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { AuthStore } from '../stores/auth.store';
import { environment } from '../../../environments/environment';

export const refreshInterceptor: HttpInterceptorFn = (req, next) => {
  const store = inject(AuthStore);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      // In mock mode, 401s should not happen from the mock service
      if (!environment.useMocks && error.status === 401) {
        // Logic for token refresh would go here
        // For Phase 1, we'll just logout on 401
        store.logout();
      }
      return throwError(() => error);
    })
  );
};
