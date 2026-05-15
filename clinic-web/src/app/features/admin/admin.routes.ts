import { Routes } from '@angular/router';

export const ADMIN_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./admin-layout/admin-layout.component').then(m => m.AdminLayoutComponent),
    children: [
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
      },
      {
        path: 'dashboard',
        loadComponent: () => import('./dashboard/dashboard.page').then(m => m.DashboardPage)
      },
      {
        path: 'bookings',
        loadComponent: () => import('./bookings/bookings.page').then(m => m.BookingsPage)
      },
      {
        path: 'doctors',
        loadComponent: () => import('./doctors/doctors.page').then(m => m.DoctorsPage)
      },
      {
        path: 'services',
        loadComponent: () => import('./services/services.page').then(m => m.ServicesPage)
      },
      {
        path: 'staff',
        loadComponent: () => import('./staff/staff.page').then(m => m.StaffPage)
      },
      {
        path: 'announcements',
        loadComponent: () => import('./announcements/announcements.page').then(m => m.AnnouncementsPage)
      },
      {
        path: 'settings',
        loadComponent: () => import('./settings/settings.page').then(m => m.SettingsPage)
      }
    ]
  }
];
