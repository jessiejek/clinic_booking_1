import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthStore } from '../stores/auth.store';
import { UserRole } from '../models/auth.models';

export const roleGuard: CanActivateFn = (route) => {
  const store = inject(AuthStore);
  const router = inject(Router);
  const allowedRoles = route.data?.['roles'] as UserRole[];

  // Ensure user is loaded from storage if needed
  if (!store.isAuthenticated()) {
    store.loadUserFromStorage();
  }

  const user = store.user();
  if (user && allowedRoles.includes(user.role)) {
    return true;
  }

  router.navigate(['/unauthorized']);
  return false;
};
