import { Routes } from '@angular/router';

export const BOOKING_ROUTES: Routes = [
  {
    path: '',
    redirectTo: 'doctors',
    pathMatch: 'full'
  },
  {
    path: 'doctors',
    loadComponent: () => import('./doctor-list/doctor-list.page').then(m => m.DoctorListPage)
  },
  {
    path: 'doctors/:id',
    loadComponent: () => import('./doctor-detail/doctor-detail.page').then(m => m.DoctorDetailPage)
  },
  {
    path: 'summary',
    loadComponent: () => import('./booking-summary/booking-summary.page').then(m => m.BookingSummaryPage)
  },
  {
    path: 'proof/:bookingId',
    loadComponent: () => import('./proof-submission/proof-submission.page').then(m => m.ProofSubmissionPage)
  },
  {
    path: 'confirmation',
    loadComponent: () => import('./booking-confirmation/booking-confirmation.page').then(m => m.BookingConfirmationPage)
  }
];
