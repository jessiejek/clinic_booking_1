# PHASE 8 — FE_PROMPT.md
## Dashboards: Admin Dashboard, Doctor Dashboard, Booking Calendar, Unpaid Report

---

## CONTEXT

Phase 8 replaces the placeholder dashboards from Phase 1 with the real, data-driven dashboards. This includes stat cards, today's appointment list, the monthly booking calendar, the running late banner, the unpaid report, and the doctor's own schedule view.

---

## REFERENCE DOCUMENTS
- `PROJECT.md` — Dashboards section (Admin/Staff Dashboard, Doctor Dashboard)
- `FE_TECH_STACK.md` — Angular 17 standalone, Signals, Chart.js

---

## PAGES TO BUILD

```
features/admin/
├── dashboard/
│   ├── dashboard.page.ts           (replace Phase 1 placeholder)
│   ├── dashboard.page.html
│   ├── dashboard.page.scss
│   └── components/
│       ├── stat-card/
│       ├── today-appointments-list/
│       ├── booking-calendar/
│       └── running-late-banner/

features/doctor/
└── dashboard/
    ├── dashboard.page.ts           (replace Phase 1 placeholder)
    ├── dashboard.page.html
    ├── dashboard.page.scss
    └── components/
        ├── today-schedule/
        └── week-upcoming/
```

---

## SERVICES (Angular)

```typescript
// features/admin/services/dashboard.service.ts
getAdminDashboard(): Observable<AdminDashboard>
getBookingCalendar(year: number, month: number): Observable<CalendarDay[]>
getUnpaidReport(): Observable<UnpaidBooking[]>

// features/doctor/services/doctor-dashboard.service.ts
getDoctorDashboard(): Observable<DoctorDashboard>
```

---

## MODELS

```typescript
export interface AdminDashboard {
  totalAppointmentsToday: number;
  totalAppointmentsThisMonth: number;
  totalRevenueToday: number;
  totalRevenueThisMonth: number;
  pendingVerificationCount: number;
  onHoldCount: number;
  unpaidCompletedTodayCount: number;
  noShowCountToday: number;
  totalPatientsRegistered: number;
  newPatientsThisMonth: number;
  totalConsultationsToday: number;
  totalConsultationsThisMonth: number;
  activePrescriptionsCount: number;
  upcomingVaccinationReminders: number;
  mostBookedDoctorName: string | null;
  mostBookedServiceName: string | null;
  todayAppointments: TodayAppointment[];
  runningLateDoctors: DoctorRunningLate[];
}

export interface TodayAppointment {
  bookingId: string;
  queueNumber: number | null;
  patientName: string;
  doctorName: string;
  serviceName: string;
  slotStartTime: string;
  status: BookingStatus;
  paymentStatus: PaymentStatus;
}

export interface DoctorRunningLate {
  doctorName: string;
  estimatedDelayMinutes: number | null;
}

export interface CalendarDay {
  date: string;
  totalBookings: number;
  confirmedCount: number;
  pendingCount: number;
  onHoldCount: number;
  cancelledCount: number;
  completedCount: number;
}

export interface UnpaidBooking {
  bookingId: string;
  patientName: string;
  patientCode: string;
  doctorName: string;
  serviceName: string;
  appointmentDate: string;
  slotStartTime: string;
  totalFee: number;
  isWalkIn: boolean;
}

export interface DoctorDashboard {
  todayAppointments: TodayAppointment[];
  upcomingThisWeek: TodayAppointment[];
  totalPatientsSeen: number;
  totalPatientsSeenToday: number;
}
```

---

## ADMIN DASHBOARD PAGE

Layout: responsive grid of stat cards + lists + calendar.

### Section 1 — Action Required (top, high visibility)

Use `ion-card` with `color="warning"` or `color="danger"` for non-zero values:

```
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│  ⏳ Pending      │ │  ⚠️ On Hold      │ │  💰 Unpaid Done  │
│  Verification   │ │                 │ │                 │
│      [N]        │ │      [N]        │ │      [N]        │
│  Needs Action   │ │  Needs Action   │ │  Collect Payment│
└─────────────────┘ └─────────────────┘ └─────────────────┘
```

Tapping each card navigates to the relevant filtered bookings list.

### Section 2 — Stat Cards (2x2 grid)

```
┌─────────────────┐ ┌─────────────────┐
│  Appointments   │ │  Revenue        │
│  Today: 12      │ │  Today: ₱6,500  │
│  Month: 287     │ │  Month: ₱142K   │
└─────────────────┘ └─────────────────┘
┌─────────────────┐ ┌─────────────────┐
│  Patients       │ │  Consultations  │
│  Total: 1,205   │ │  Today: 8       │
│  New: 34        │ │  Month: 201     │
└─────────────────┘ └─────────────────┘
```

### Section 3 — Running Late Banner

If `runningLateDoctors.length > 0`:
```html
<ion-card color="warning">
  <ion-card-header>
    <ion-card-title>⏰ Running Late Today</ion-card-title>
  </ion-card-header>
  <ion-card-content>
    @for (doctor of dashboard.runningLateDoctors; track doctor.doctorName) {
      <p>Dr. {{ doctor.doctorName }} — ~{{ doctor.estimatedDelayMinutes }} min delay</p>
    }
  </ion-card-content>
</ion-card>
```

### Section 4 — Today's Appointments List

`ion-list` with filter tabs: All | Pending | Confirmed | Completed | No Show

Each item shows:
- Queue# | Time | Patient Name | Doctor | Service | Status badge | Payment badge

Tap → opens Booking Detail Modal (from Phase 3).

### Section 5 — Booking Calendar

Custom monthly calendar component:

```typescript
// features/admin/dashboard/components/booking-calendar/booking-calendar.component.ts
@Input() year: number;
@Input() month: number;
// Output: day selected
@Output() daySelected = new EventEmitter<string>();
```

- Renders a 7-column calendar grid for the month
- Each day cell shows:
  - Date number
  - Colored dot indicators:
    - Blue dot = has Confirmed bookings
    - Yellow dot = has Pending/OnHold bookings
    - Red dot = has Cancelled/NoShow
  - Count badge if more than 5 bookings
- Previous/Next month navigation
- Today highlighted
- Tap a day → navigates to bookings list filtered by that date

```scss
.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 4px;
}

.calendar-day {
  min-height: 52px;
  padding: 4px;
  border-radius: 8px;
  cursor: pointer;

  &.today { background: var(--ion-color-primary-tint); font-weight: bold; }
  &.has-bookings { border: 1px solid var(--ion-color-primary); }
}

.dot {
  width: 6px; height: 6px;
  border-radius: 50%;
  display: inline-block;
  margin: 0 1px;

  &.confirmed { background: var(--ion-color-success); }
  &.pending   { background: var(--ion-color-warning); }
  &.cancelled { background: var(--ion-color-danger); }
}
```

### Section 6 — Quick Stats Row

Inline chips/badges row:
```
🔴 No Shows Today: 2   |   💊 Active Rx: 48   |   💉 Upcoming Vaccines: 5   |   ⭐ Most Booked: Dr. Santos
```

---

## UNPAID REPORT PAGE

Route: `/admin/bookings/unpaid` (accessible from the Unpaid stat card tap)

Full-page list:

- Filters: date range picker (defaults to last 30 days), doctor filter
- `ion-list` of unpaid completed bookings
- Each item: PatientCode | Patient Name | Doctor | Service | Date | Fee | Walk-In badge
- "Mark Paid" button per row → calls `PUT /api/v1/bookings/{id}/mark-paid` → removes from list
- Summary row at top: Total unpaid amount shown in red

Export button (future phase — placeholder button for now, disabled with tooltip "Export coming soon").

---

## DOCTOR DASHBOARD PAGE

Layout: clean schedule-focused view.

### Section 1 — Today's Schedule

```
📅 Today's Patients (12 scheduled)

┌───────────────────────────────────────────────────────┐
│  #1  08:00  Juan dela Cruz    General Consultation    │
│       Status: ✅ Confirmed    Payment: Paid           │
├───────────────────────────────────────────────────────┤
│  #2  08:30  Maria Santos      Annual Physical Exam    │
│       Status: ✅ Confirmed    Payment: Unpaid         │
└───────────────────────────────────────────────────────┘
```

- Ordered by queue number
- Tap → opens patient detail (read-only, doctor's view)
- "Start Consultation" button on confirmed appointments → navigates to consultation form pre-filled with booking

### Section 2 — This Week

Simplified list of upcoming appointments this week grouped by day:
```
Tomorrow — Tuesday, June 3
  #1 08:30  Ana Reyes — Pediatric Checkup
  #2 09:00  Marco Tan — General Consultation

Wednesday, June 4
  #1 08:00  Lisa Cruz — Prenatal Checkup
```

### Section 3 — Quick Stats

```
┌──────────────────┐ ┌──────────────────┐
│ Patients Today   │ │ Patients (Month) │
│      8           │ │      147         │
└──────────────────┘ └──────────────────┘
```

---

## STAFF DASHBOARD

Staff sees the same dashboard as Admin but without revenue stats and the Unpaid Report link. Apply role-based conditional rendering:

```typescript
isAdmin = computed(() => this.authStore.user()?.role === 'Admin');
```

Hide revenue cards and "Unpaid Report" link for Staff role.

---

## TASK

Replace placeholder dashboards with real data-driven screens. Build on Phases 1–7.

Result must:
1. Admin dashboard loads all stats in a single API call with loading skeleton
2. Pending Verification count is highlighted in warning color when non-zero
3. Unpaid Completed count is highlighted in danger color when non-zero
4. Revenue stats display ₱ formatted amounts (use peso pipe)
5. Running late banner shown when any doctor has RunningLate = true today
6. Today's appointments list loads and filters by status tab
7. Booking calendar renders the correct month with dot indicators per booking status
8. Tapping a calendar day navigates to bookings filtered by that date
9. Unpaid Report page lists all Completed + Unpaid bookings with Mark Paid action
10. Doctor dashboard shows their own today's schedule and this week's upcoming appointments
