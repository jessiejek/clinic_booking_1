# CLINIC SYSTEM — FE_TECH_STACK.md
> Frontend technology decisions, conventions, and patterns. All frontend code must follow this document.

---

## TECH STACK

| Layer | Technology |
|---|---|
| Framework | Angular 17 (standalone components) |
| UI Library | Ionic Angular 7 |
| Language | TypeScript (strict mode) |
| Styling | SCSS + Ionic CSS Variables |
| State Management | Angular Signals (local/component state) + NgRx SignalStore (global shared state) |
| HTTP | Angular HttpClient + custom ApiService wrapper |
| Auth Interceptors | `auth.interceptor.ts` (attach JWT) + `refresh.interceptor.ts` (handle 401 + token refresh) |
| Forms | Angular Reactive Forms |
| Routing | Angular Router with lazy-loaded standalone routes (`app.routes.ts`) |
| Icons | Ionicons |
| Charts | Chart.js (vitals trend charts) |
| PDF Download | Browser download via blob URL |
| Package Manager | npm |

---

## PROJECT STRUCTURE

```
src/
└── app/
    ├── app.component.ts          (standalone root component)
    ├── app.routes.ts             (root lazy routes)
    ├── core/
    │   ├── guards/
    │   │   ├── auth.guard.ts
    │   │   ├── role.guard.ts
    │   │   └── first-login.guard.ts
    │   ├── interceptors/
    │   │   ├── auth.interceptor.ts
    │   │   └── refresh.interceptor.ts
    │   ├── services/
    │   │   ├── api.service.ts
    │   │   ├── auth.service.ts
    │   │   └── storage.service.ts
    │   └── models/
    │       └── (shared interfaces/types)
    ├── shared/
    │   ├── components/
    │   │   ├── allergy-badge/
    │   │   ├── booking-status-badge/
    │   │   ├── loading-spinner/
    │   │   └── empty-state/
    │   └── pipes/
    │       ├── ph-date.pipe.ts
    │       └── peso.pipe.ts
    └── features/
        ├── auth/
        │   ├── login/
        │   │   ├── login.page.ts
        │   │   ├── login.page.html
        │   │   └── login.page.scss
        │   ├── register/
        │   ├── forgot-password/
        │   ├── reset-password/
        │   └── set-password/
        ├── admin/
        │   ├── dashboard/
        │   ├── doctors/
        │   ├── services/
        │   ├── staff/
        │   ├── bookings/
        │   ├── patients/
        │   ├── announcements/
        │   └── settings/
        ├── staff/
        │   ├── dashboard/
        │   ├── walk-in/
        │   ├── bookings/
        │   └── patients/
        ├── doctor/
        │   ├── dashboard/
        │   ├── schedule/
        │   ├── patients/
        │   └── consultations/
        └── patient/
            ├── portal/
            ├── booking/
            ├── my-bookings/
            ├── my-records/
            ├── my-prescriptions/
            ├── my-receipts/
            └── my-profile/
```

---

## PAGE FILE CONVENTION

Every page follows the `.page.ts / .page.html / .page.scss` naming convention:

```
features/booking/
├── booking.page.ts
├── booking.page.html
└── booking.page.scss
```

Sub-components within a feature (not full pages) use `.component.ts / .component.html / .component.scss`:

```
features/booking/
├── booking.page.ts
├── booking.page.html
├── booking.page.scss
└── components/
    ├── slot-grid/
    │   ├── slot-grid.component.ts
    │   ├── slot-grid.component.html
    │   └── slot-grid.component.scss
    └── booking-summary-bar/
        ├── booking-summary-bar.component.ts
        └── ...
```

---

## STANDALONE COMPONENT CONVENTION

Every component and page is standalone. No NgModule files anywhere.

```typescript
// booking.page.ts
import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';

@Component({
  standalone: true,
  selector: 'app-booking',
  templateUrl: './booking.page.html',
  styleUrls: ['./booking.page.scss'],
  imports: [CommonModule, IonicModule, RouterModule]
})
export class BookingPage implements OnInit {
  // use signals for local state
  isLoading = signal(false);
  bookings = signal<Booking[]>([]);

  ngOnInit() { ... }
}
```

---

## ROUTING CONVENTION

```typescript
// app.routes.ts — root routes with lazy loading
export const routes: Routes = [
  {
    path: '',
    redirectTo: 'auth/login',
    pathMatch: 'full'
  },
  {
    path: 'auth',
    loadChildren: () => import('./features/auth/auth.routes').then(m => m.AUTH_ROUTES)
  },
  {
    path: 'admin',
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['Admin'] },
    loadChildren: () => import('./features/admin/admin.routes').then(m => m.ADMIN_ROUTES)
  },
  {
    path: 'staff',
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['Staff'] },
    loadChildren: () => import('./features/staff/staff.routes').then(m => m.STAFF_ROUTES)
  },
  {
    path: 'doctor',
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['Doctor'] },
    loadChildren: () => import('./features/doctor/doctor.routes').then(m => m.DOCTOR_ROUTES)
  },
  {
    path: 'portal',
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['Patient'] },
    loadChildren: () => import('./features/patient/patient.routes').then(m => m.PATIENT_ROUTES)
  },
  {
    path: 'book',
    loadChildren: () => import('./features/patient/booking/booking.routes').then(m => m.BOOKING_ROUTES)
  }
];
```

---

## API SERVICE WRAPPER

```typescript
// core/services/api.service.ts
@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly baseUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  get<T>(endpoint: string, params?: HttpParams): Observable<T> {
    return this.http.get<T>(`${this.baseUrl}${endpoint}`, { params });
  }

  post<T>(endpoint: string, body: unknown): Observable<T> {
    return this.http.post<T>(`${this.baseUrl}${endpoint}`, body);
  }

  put<T>(endpoint: string, body: unknown): Observable<T> {
    return this.http.put<T>(`${this.baseUrl}${endpoint}`, body);
  }

  delete<T>(endpoint: string): Observable<T> {
    return this.http.delete<T>(`${this.baseUrl}${endpoint}`);
  }
}
```

Feature services inject `ApiService`, never `HttpClient` directly:

```typescript
// features/booking/services/booking.service.ts
@Injectable({ providedIn: 'root' })
export class BookingService {
  constructor(private api: ApiService) {}

  getBookings(): Observable<Booking[]> {
    return this.api.get<Booking[]>('/api/v1/bookings');
  }

  createBooking(payload: CreateBookingRequest): Observable<BookingDto> {
    return this.api.post<BookingDto>('/api/v1/bookings', payload);
  }
}
```

---

## HTTP INTERCEPTORS

### auth.interceptor.ts
- Attaches `Authorization: Bearer {accessToken}` to every outgoing request
- Skips public endpoints (login, register, public doctors, public services, announcements)

```typescript
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const token = authService.getAccessToken();

  if (token) {
    req = req.clone({
      setHeaders: { Authorization: `Bearer ${token}` }
    });
  }

  return next(req);
};
```

### refresh.interceptor.ts
- Intercepts `401 Unauthorized` responses
- Calls `POST /api/v1/auth/refresh` with the stored refresh token
- If refresh succeeds: retries the original request with new access token
- If refresh fails (expired/invalid): logs user out, redirects to login

```typescript
export const refreshInterceptor: HttpInterceptorFn = (req, next) => {
  // ...handle 401, refresh, retry pattern
};
```

---

## STATE MANAGEMENT

### Angular Signals — local/component state

Use `signal()` and `computed()` for component-level state:

```typescript
export class BookingPage {
  selectedSlot = signal<TimeSlot | null>(null);
  isSubmitting = signal(false);
  availableSlots = signal<TimeSlot[]>([]);

  totalFee = computed(() => this.selectedSlot()?.fee ?? 0);
}
```

### NgRx SignalStore — global shared state

Use SignalStore only for state shared across multiple features:

```typescript
// core/stores/auth.store.ts
export const AuthStore = signalStore(
  { providedIn: 'root' },
  withState({
    user: null as AuthUser | null,
    accessToken: null as string | null,
    isAuthenticated: false,
  }),
  withMethods((store, authService = inject(AuthService)) => ({
    login: rxMethod<LoginRequest>(
      pipe(
        switchMap(credentials => authService.login(credentials)),
        tapResponse({
          next: (response) => patchState(store, {
            user: response.user,
            accessToken: response.accessToken,
            isAuthenticated: true
          }),
          error: console.error
        })
      )
    ),
    logout() {
      patchState(store, { user: null, accessToken: null, isAuthenticated: false });
    }
  }))
);
```

Global stores to create:
- `AuthStore` — current user, tokens, role
- `NotificationStore` — unread notification count, notification list
- `ClinicSettingsStore` — clinic name, logo, colors (loaded once on app start)

---

## AUTH GUARDS

```typescript
// core/guards/auth.guard.ts
export const AuthGuard: CanActivateFn = () => {
  const authStore = inject(AuthStore);
  const router = inject(Router);

  if (!authStore.isAuthenticated()) {
    router.navigate(['/auth/login']);
    return false;
  }
  return true;
};

// core/guards/role.guard.ts
export const RoleGuard: CanActivateFn = (route) => {
  const authStore = inject(AuthStore);
  const router = inject(Router);
  const requiredRoles = route.data['roles'] as string[];

  if (!requiredRoles.includes(authStore.user()?.role ?? '')) {
    router.navigate(['/unauthorized']);
    return false;
  }
  return true;
};

// core/guards/first-login.guard.ts
// Redirects to /set-password if IsFirstLogin = true
export const FirstLoginGuard: CanActivateFn = () => {
  const authStore = inject(AuthStore);
  const router = inject(Router);

  if (authStore.user()?.isFirstLogin) {
    router.navigate(['/auth/set-password']);
    return false;
  }
  return true;
};
```

---

## IONIC CONVENTIONS

- Use Ionic components for all UI: `ion-header`, `ion-content`, `ion-card`, `ion-list`, `ion-item`, `ion-button`, etc.
- Use `ion-refresher` for pull-to-refresh on list pages
- Use `ion-infinite-scroll` for paginated lists
- Use `ion-loading` for async operations
- Use `ion-toast` for success/error feedback (not `alert()`)
- Use `ion-modal` for forms and detail views
- Use `ion-action-sheet` for multi-option actions (e.g. confirm/reject/cancel booking)
- Slot colors in the booking grid: use CSS classes mapped to Ionic color variables

```scss
// booking slot colors
.slot-available  { --background: var(--ion-color-light); }
.slot-pending    { --background: var(--ion-color-warning); }
.slot-booked     { --background: var(--ion-color-danger); }
.slot-selected   { --background: var(--ion-color-primary); }
```

---

## SCSS CONVENTIONS

- Use SCSS variables from `src/theme/variables.scss`
- Never use inline styles
- Use Ionic CSS custom properties for theming (`--ion-color-primary`, etc.)
- BEM naming for custom component classes: `.booking-card__header`, `.booking-card__status`
- Page-level styles scoped to their `.page.scss` file

---

## REACTIVE FORMS CONVENTION

```typescript
// Use FormBuilder in constructor
export class BookingPage {
  private fb = inject(FormBuilder);

  bookingForm = this.fb.group({
    doctorId: ['', Validators.required],
    serviceId: ['', Validators.required],
    appointmentDate: ['', Validators.required],
    slotStartTime: ['', Validators.required],
  });

  onSubmit() {
    if (this.bookingForm.invalid) return;
    // send to service
  }
}
```

---

## ERROR HANDLING CONVENTION

```typescript
// In services — let errors propagate as observables
createBooking(payload: CreateBookingRequest): Observable<BookingDto> {
  return this.api.post<BookingDto>('/api/v1/bookings', payload);
}

// In components — catch and display via ion-toast
this.bookingService.createBooking(payload).subscribe({
  next: (result) => {
    this.showToast('Booking created successfully', 'success');
    this.router.navigate(['/portal/my-bookings']);
  },
  error: (err) => {
    this.showToast(err.error?.error ?? 'Something went wrong', 'danger');
  }
});
```

---

## ENVIRONMENT CONFIG

```typescript
// src/environments/environment.ts
export const environment = {
  production: false,
  apiUrl: 'https://localhost:7001'
};

// src/environments/environment.prod.ts
export const environment = {
  production: true,
  apiUrl: 'https://api.yourclinic.com'
};
```

---

## SHARED PIPES

```typescript
// shared/pipes/peso.pipe.ts — formats number as Philippine Peso
// Usage: {{ 500 | peso }} → ₱500.00

// shared/pipes/ph-date.pipe.ts — formats date in PH locale
// Usage: {{ date | phDate }} → Jan 15, 2025
```

---

## PATIENT PORTAL PAGES

| Route | Page | Description |
|---|---|---|
| `/portal` | portal/portal.page | Home — upcoming booking, announcements |
| `/portal/my-bookings` | my-bookings.page | All bookings with status, cancel option |
| `/portal/my-records` | my-records.page | Read-only consultations, diagnoses, vitals charts |
| `/portal/my-prescriptions` | my-prescriptions.page | Prescriptions list + PDF download |
| `/portal/my-receipts` | my-receipts.page | Payment receipts + visit summaries + PDF download |
| `/portal/my-profile` | my-profile.page | Editable profile fields |
| `/book` | booking/booking.page | Public booking flow (doctor discovery → slot → payment proof) |

---

## NAMING CONVENTIONS SUMMARY

| Type | Convention | Example |
|---|---|---|
| Pages | `feature.page.ts` | `booking.page.ts` |
| Components | `feature.component.ts` | `slot-grid.component.ts` |
| Services | `feature.service.ts` | `booking.service.ts` |
| Stores | `feature.store.ts` | `auth.store.ts` |
| Guards | `name.guard.ts` | `auth.guard.ts` |
| Interceptors | `name.interceptor.ts` | `auth.interceptor.ts` |
| Pipes | `name.pipe.ts` | `peso.pipe.ts` |
| Interfaces | PascalCase, no `I` prefix | `Booking`, `Doctor`, `TimeSlot` |
| Enums | PascalCase | `BookingStatus`, `PaymentMode` |
| Signals | camelCase | `isLoading`, `selectedSlot` |
