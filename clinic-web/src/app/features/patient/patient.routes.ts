import { Routes } from '@angular/router';

import { PatientLayoutComponent } from './patient-layout/patient-layout.component';

export const PATIENT_ROUTES: Routes = [
  {
    path: '',
    component: PatientLayoutComponent,
    children: [
      {
        path: 'home',
        loadComponent: () => import('./portal/portal.page').then(m => m.PortalPage)
      },
      {
        path: 'my-bookings',
        loadComponent: () => import('./my-bookings/my-bookings.page').then(m => m.MyBookingsPage)
      },
      {
        path: 'records',
        loadComponent: () => import('./portal/portal.page').then(m => m.PortalPage) // Placeholder
      },
      {
        path: 'prescriptions',
        loadComponent: () => import('./portal/portal.page').then(m => m.PortalPage) // Placeholder
      },
      {
        path: 'receipts',
        loadComponent: () => import('./portal/portal.page').then(m => m.PortalPage) // Placeholder
      },
      {
        path: 'profile',
        loadComponent: () => import('./portal/portal.page').then(m => m.PortalPage) // Placeholder
      },
      {
        path: '',
        redirectTo: 'home',
        pathMatch: 'full'
      }
    ]
  }
];
