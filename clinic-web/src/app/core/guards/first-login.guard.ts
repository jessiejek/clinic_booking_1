import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthStore } from '../stores/auth.store';

export const firstLoginGuard: CanActivateFn = () => {
  const store = inject(AuthStore);
  const router = inject(Router);

  if (store.user()?.isFirstLogin) {
    router.navigate(['/auth/set-password']);
    return false;
  }

  return true;
};
