# PHASE 1 — FE_PROMPT.md
## Foundation: App Scaffold, Routing, Auth Pages, Login, Register, Set Password

---

## CONTEXT

This is Phase 1 of the Clinic System frontend. The goal is to scaffold the entire Angular 17 standalone Ionic Angular project and implement the authentication system — login, register, forgot password, reset password, set password (invite flow), email verification banner, and post-login role-based routing.

At the end of this phase, a user can register, log in, and be redirected to the correct dashboard shell based on their role. The dashboard shells are empty placeholders — the content is built in later phases.

---

## TECH STACK

- Angular 17 (standalone components — no NgModule)
- Ionic Angular 7
- TypeScript strict mode
- SCSS
- Angular Signals (local state)
- NgRx SignalStore (global auth state)
- Angular Reactive Forms
- Angular Router with lazy-loaded routes
- HttpClient + custom ApiService wrapper
- auth.interceptor.ts + refresh.interceptor.ts

---

## PROJECT STRUCTURE TO SCAFFOLD

```
src/
└── app/
    ├── app.component.ts
    ├── app.routes.ts
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
    │   ├── stores/
    │   │   └── auth.store.ts
    │   └── models/
    │       └── auth.models.ts
    ├── shared/
    │   ├── components/
    │   │   └── loading-spinner/
    │   └── pipes/
    │       └── ph-date.pipe.ts
    └── features/
        ├── auth/
        │   ├── auth.routes.ts
        │   ├── login/
        │   │   ├── login.page.ts
        │   │   ├── login.page.html
        │   │   └── login.page.scss
        │   ├── register/
        │   │   ├── register.page.ts
        │   │   ├── register.page.html
        │   │   └── register.page.scss
        │   ├── forgot-password/
        │   │   ├── forgot-password.page.ts
        │   │   ├── forgot-password.page.html
        │   │   └── forgot-password.page.scss
        │   ├── reset-password/
        │   │   ├── reset-password.page.ts
        │   │   ├── reset-password.page.html
        │   │   └── reset-password.page.scss
        │   └── set-password/
        │       ├── set-password.page.ts
        │       ├── set-password.page.html
        │       └── set-password.page.scss
        ├── admin/
        │   ├── admin.routes.ts
        │   └── dashboard/
        │       ├── dashboard.page.ts
        │       ├── dashboard.page.html
        │       └── dashboard.page.scss
        ├── staff/
        │   ├── staff.routes.ts
        │   └── dashboard/
        │       ├── dashboard.page.ts
        │       ├── dashboard.page.html
        │       └── dashboard.page.scss
        ├── doctor/
        │   ├── doctor.routes.ts
        │   └── dashboard/
        │       ├── dashboard.page.ts
        │       ├── dashboard.page.html
        │       └── dashboard.page.scss
        └── patient/
            ├── patient.routes.ts
            └── portal/
                ├── portal.page.ts
                ├── portal.page.html
                └── portal.page.scss
```

---

## MODELS

```typescript
// core/models/auth.models.ts

export interface AuthUser {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
  avatarUrl: string | null;
  isFirstLogin: boolean;
  isEmailVerified: boolean;
}

export type UserRole = 'Admin' | 'Staff' | 'Doctor' | 'Patient';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error: string | null;
}
```

---

## STORAGE SERVICE

```typescript
// core/services/storage.service.ts
// Wraps localStorage for token storage

@Injectable({ providedIn: 'root' })
export class StorageService {
  private readonly ACCESS_TOKEN_KEY = 'access_token';
  private readonly REFRESH_TOKEN_KEY = 'refresh_token';

  setTokens(accessToken: string, refreshToken: string): void
  getAccessToken(): string | null
  getRefreshToken(): string | null
  clearTokens(): void
}
```

---

## API SERVICE

```typescript
// core/services/api.service.ts
@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly baseUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  get<T>(endpoint: string, params?: HttpParams): Observable<T>
  post<T>(endpoint: string, body: unknown): Observable<T>
  put<T>(endpoint: string, body: unknown): Observable<T>
  delete<T>(endpoint: string): Observable<T>
}
```

---

## AUTH SERVICE

```typescript
// core/services/auth.service.ts
@Injectable({ providedIn: 'root' })
export class AuthService {
  constructor(private api: ApiService, private storage: StorageService) {}

  login(request: LoginRequest): Observable<AuthResponse>
  register(request: RegisterRequest): Observable<AuthResponse>
  logout(): Observable<void>
  refreshToken(refreshToken: string): Observable<AuthResponse>
  forgotPassword(email: string): Observable<void>
  resetPassword(token: string, password: string, confirmPassword: string): Observable<void>
  setPassword(inviteToken: string, password: string, confirmPassword: string): Observable<AuthResponse>
  verifyEmail(token: string): Observable<void>
  getAccessToken(): string | null
}
```

---

## AUTH STORE (NgRx SignalStore)

```typescript
// core/stores/auth.store.ts

export const AuthStore = signalStore(
  { providedIn: 'root' },
  withState({
    user: null as AuthUser | null,
    isAuthenticated: false,
    isLoading: false,
  }),
  withMethods((store, authService = inject(AuthService), storage = inject(StorageService), router = inject(Router)) => ({
    login: rxMethod<LoginRequest>(...),   // calls authService.login, stores tokens, patches state
    logout(): void,                        // clears tokens, resets state, navigates to /auth/login
    loadUserFromStorage(): void,           // on app init, restores user from stored token if valid
    redirectByRole(): void                 // navigates based on user.role
  }))
);
```

### Role-Based Redirect After Login
| Role | Redirect |
|---|---|
| Admin | `/admin/dashboard` |
| Staff | `/staff/dashboard` |
| Doctor | `/doctor/dashboard` |
| Patient | `/portal` |

---

## HTTP INTERCEPTORS

### auth.interceptor.ts
- Attaches `Authorization: Bearer {accessToken}` header to every request
- Skip list (no token attached): `/api/v1/auth/login`, `/api/v1/auth/register`, `/api/v1/auth/refresh`, `/api/v1/auth/forgot-password`, `/api/v1/auth/reset-password`, `/api/v1/auth/set-password`

### refresh.interceptor.ts
- Intercepts `401 Unauthorized` responses
- If refresh token exists in storage: calls `POST /api/v1/auth/refresh`
- On success: stores new tokens, retries original request
- On failure: calls `AuthStore.logout()`, navigates to `/auth/login`
- Uses a `BehaviorSubject` to queue multiple concurrent 401s during refresh

---

## GUARDS

### auth.guard.ts
- If not authenticated → redirect to `/auth/login`

### role.guard.ts
- Reads `route.data['roles']`
- If user role not in allowed roles → redirect to `/unauthorized`

### first-login.guard.ts
- If `user.isFirstLogin === true` → redirect to `/auth/set-password`

Apply `first-login.guard.ts` to all role-protected routes so Admin-created Staff/Doctor accounts are forced to set password before accessing any page.

---

## ROUTING

```typescript
// app.routes.ts
export const routes: Routes = [
  { path: '', redirectTo: 'auth/login', pathMatch: 'full' },
  {
    path: 'auth',
    loadChildren: () => import('./features/auth/auth.routes').then(m => m.AUTH_ROUTES)
  },
  {
    path: 'admin',
    canActivate: [AuthGuard, RoleGuard, FirstLoginGuard],
    data: { roles: ['Admin'] },
    loadChildren: () => import('./features/admin/admin.routes').then(m => m.ADMIN_ROUTES)
  },
  {
    path: 'staff',
    canActivate: [AuthGuard, RoleGuard, FirstLoginGuard],
    data: { roles: ['Staff'] },
    loadChildren: () => import('./features/staff/staff.routes').then(m => m.STAFF_ROUTES)
  },
  {
    path: 'doctor',
    canActivate: [AuthGuard, RoleGuard, FirstLoginGuard],
    data: { roles: ['Doctor'] },
    loadChildren: () => import('./features/doctor/doctor.routes').then(m => m.DOCTOR_ROUTES)
  },
  {
    path: 'portal',
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['Patient'] },
    loadChildren: () => import('./features/patient/patient.routes').then(m => m.PATIENT_ROUTES)
  },
  { path: 'unauthorized', loadComponent: () => import('./shared/pages/unauthorized.page').then(m => m.UnauthorizedPage) },
  { path: '**', redirectTo: 'auth/login' }
];
```

---

## AUTH PAGES

### Login Page (`login.page.ts`)

Form fields:
- Email (required, email format)
- Password (required)

Behavior:
- On submit: calls `AuthStore.login()`
- On success: `AuthStore.redirectByRole()`
- On error `423 Locked`: show ion-toast with "Account locked. Try again in X minutes."
- On error `401`: show ion-toast "Invalid email or password"
- Links: "Forgot password?" → `/auth/forgot-password`, "Register" → `/auth/register`
- Show Google login button (calls `POST /api/v1/auth/google` with Google token)
- Show Facebook login button (calls `POST /api/v1/auth/facebook`)

### Register Page (`register.page.ts`)

Form fields:
- Full Name (required)
- Email (required, email format)
- Password (required, min 8 chars, hint about policy shown below field)
- Confirm Password (required, must match)

Behavior:
- On success: show ion-toast "Registration successful. Please check your email to verify your account." → navigate to `/auth/login`
- On error `409`: "Email already in use"
- Link: "Already have an account? Login"

### Forgot Password Page

Form fields:
- Email (required)

Behavior:
- On submit: always show success message (even if email not found — matches backend)
- "Check your email for a password reset link."

### Reset Password Page

- Reads `?token=` from query params
- Form: New Password + Confirm Password
- On success: navigate to login with toast "Password reset successfully"
- If token invalid/expired: show error state with link to forgot-password

### Set Password Page (Invite Flow)

- Reads `?token=` from query params
- Shown to Staff/Doctor accounts on first login
- Form: New Password + Confirm Password
- Password policy hint displayed
- On success: tokens stored, user redirected by role (they are now logged in)

---

## EMAIL VERIFICATION BANNER

On the Patient Portal pages, if `user.isEmailVerified === false`, show a dismissible `ion-banner` at the top:

```
⚠️ Your email is not verified. Please check your inbox.
[Resend Verification Email]
```

Do not block access — soft warning only.

---

## DASHBOARD SHELLS (Placeholders)

Create empty shells for each role. These will be filled in later phases:

### Admin Dashboard (`/admin/dashboard`)
```html
<ion-header>
  <ion-toolbar>
    <ion-title>Admin Dashboard</ion-title>
    <ion-buttons slot="end">
      <ion-button (click)="logout()">Logout</ion-button>
    </ion-buttons>
  </ion-toolbar>
</ion-header>
<ion-content>
  <div class="ion-padding">
    <h2>Welcome, {{ userName }}!</h2>
    <p>Admin dashboard — Phase 1 placeholder</p>
  </div>
</ion-content>
```

Same pattern for Staff, Doctor, and Patient portal shells. Each shell shows the user's name and role, and has a working Logout button.

---

## APP INIT

On app startup (`app.component.ts`), call `AuthStore.loadUserFromStorage()` to restore session from stored tokens. If access token is present and valid, user is restored without re-login.

---

## ENVIRONMENT

```typescript
// src/environments/environment.ts
export const environment = {
  production: false,
  apiUrl: 'http://localhost:7001'
};
```

---

## TASK

Scaffold the complete Angular 17 standalone Ionic project and implement all auth pages and flows listed above. The result must:

1. `ng serve` must run with zero errors
2. Navigate to `http://localhost:4200` → redirects to `/auth/login`
3. Login with `admin@clinic.ph / Admin@123456` (from Phase 1 BE seed) → redirects to `/admin/dashboard`
4. Login with `patient@clinic.ph / Patient@123456` → redirects to `/portal`
5. Logout works and redirects to login
6. Refresh token interceptor retries requests on 401
7. Role guard blocks wrong-role access
8. First login guard redirects Staff/Doctor with `isFirstLogin = true` to `/auth/set-password`
9. Register flow works end-to-end
10. Forgot password + reset password flow works end-to-end
