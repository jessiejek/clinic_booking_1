import { Routes } from '@angular/router';

export const PATIENT_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./portal/portal.page').then(m => m.PortalPage)
  }
];
