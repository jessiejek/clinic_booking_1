import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthStore } from '../stores/auth.store';

export const authGuard: CanActivateFn = () => {
  const store = inject(AuthStore);
  const router = inject(Router);

  // Load persisted user if not already loaded
  if (!store.isAuthenticated()) {
    store.loadUserFromStorage();
  }

  // Allow navigation if authenticated
  if (store.isAuthenticated()) {
    return true;
  }

  // Not authenticated: redirect to login
  router.navigate(['/auth/login']);
  return false;
};
