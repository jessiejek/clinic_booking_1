# PHASE 3 — FE_PROMPT.md
## Booking System: Patient Booking Flow, Slot Grid, Admin/Staff Booking Management

---

## CONTEXT

Phase 3 implements the patient-facing booking flow and the Admin/Staff booking management screens. Patients can browse doctors, view available slots, book an appointment, and submit payment proof. Admin/Staff can view all bookings, confirm/reject proof, create walk-in bookings, and manage booking statuses.

---

## REFERENCE DOCUMENTS
- `PROJECT.md` — full booking flow steps, slot colors, status definitions, timer behavior, walk-in flow
- `FE_TECH_STACK.md` — Angular 17 standalone conventions, ApiService, Signals

---

## PAGES TO BUILD

```
features/patient/
└── booking/
    ├── booking.routes.ts
    ├── doctor-list/
    │   ├── doctor-list.page.ts
    │   ├── doctor-list.page.html
    │   └── doctor-list.page.scss
    ├── doctor-detail/
    │   ├── doctor-detail.page.ts
    │   ├── doctor-detail.page.html
    │   └── doctor-detail.page.scss
    ├── slot-picker/
    │   ├── slot-picker.page.ts
    │   ├── slot-picker.page.html
    │   └── slot-picker.page.scss
    ├── booking-summary/
    │   ├── booking-summary.page.ts
    │   ├── booking-summary.page.html
    │   └── booking-summary.page.scss
    ├── proof-submission/
    │   ├── proof-submission.page.ts
    │   ├── proof-submission.page.html
    │   └── proof-submission.page.scss
    └── booking-confirmation/
        ├── booking-confirmation.page.ts
        ├── booking-confirmation.page.html
        └── booking-confirmation.page.scss

features/patient/
└── my-bookings/
    ├── my-bookings.page.ts
    ├── my-bookings.page.html
    └── my-bookings.page.scss

features/admin/
└── bookings/
    ├── bookings.page.ts
    ├── bookings.page.html
    ├── bookings.page.scss
    └── components/
        ├── booking-detail-modal/
        └── walk-in-modal/

features/staff/
└── bookings/              (same as admin/bookings — reuse or duplicate)
    └── walk-in/
```

---

## SERVICES (Angular)

```typescript
// features/booking/services/booking.service.ts
getAvailableSlots(doctorId: string, date: string): Observable<SlotAvailability>
createBooking(payload: CreateBookingRequest): Observable<BookingResult>
submitProof(bookingId: string, payload: SubmitProofRequest): Observable<void>
cancelBooking(bookingId: string, reason?: string): Observable<void>
getMyBookings(): Observable<Booking[]>
getBookingById(id: string): Observable<BookingDetail>

// features/admin/services/booking-admin.service.ts
getAllBookings(filters: BookingFilters): Observable<Booking[]>
confirmBooking(id: string): Observable<void>
rejectBooking(id: string, reason: string): Observable<void>
completeBooking(id: string): Observable<void>
markNoShow(id: string): Observable<void>
resolveHold(id: string, resolution: 'Confirm' | 'Cancel'): Observable<void>
markPaid(id: string): Observable<void>
markRefund(id: string): Observable<void>
createWalkInBooking(payload: WalkInBookingRequest): Observable<BookingResult>
getUnpaidReport(): Observable<UnpaidBooking[]>
searchPatients(query: string): Observable<PatientSearchResult[]>
createGuestPatient(payload: CreateGuestPatientRequest): Observable<PatientSearchResult>
```

---

## MODELS

```typescript
export interface SlotAvailability {
  doctorId: string;
  doctorName: string;
  date: string;
  runningLate: boolean;
  estimatedDelayMinutes: number | null;
  slots: TimeSlot[];
}

export interface TimeSlot {
  startTime: string;   // "08:00"
  endTime: string;     // "08:30"
  status: SlotStatus;  // 'Available' | 'Pending' | 'Full'
  remainingCapacity: number;
}

export type SlotStatus = 'Available' | 'Pending' | 'Full';

export interface Booking {
  id: string;
  patientName: string;
  doctorName: string;
  serviceName: string;
  appointmentDate: string;
  slotStartTime: string;
  slotEndTime: string;
  status: BookingStatus;
  paymentStatus: PaymentStatus;
  paymentMode: PaymentMode;
  queueNumber: number | null;
  totalFee: number;
  isWalkIn: boolean;
  orNumber: string | null;
  receiptUrl: string | null;
  createdAt: string;
}

export type BookingStatus = 'Pending' | 'ProofSubmitted' | 'Confirmed' | 'OnHold' | 'Cancelled' | 'Completed' | 'Expired' | 'NoShow';
export type PaymentStatus = 'Unpaid' | 'Paid' | 'Waived' | 'Refunded';
export type PaymentMode = 'Online' | 'PayAtClinic';
```

---

## PATIENT BOOKING FLOW (Multi-Step)

Use a multi-step flow. State managed via Angular Signals in a `BookingStateService` or directly in a parent component.

### Step 1 — Doctor List (`/book/doctors`)
- Grid or list of active doctors
- Show: photo, name, specialization, consultation fee, star rating
- Filter bar: by specialization, by service
- Tap doctor → navigate to Doctor Detail

### Step 2 — Doctor Detail (`/book/doctors/:id`)
- Shows doctor profile: photo, name, specialization, bio, consultation fee, services offered, reviews
- Date picker (defaults to today, min = today)
- On date select → calls `GET /api/v1/doctors/{id}/availability?date=` → loads slot grid
- If RunningLate: show `ion-banner` — "Dr. [Name] is running approximately [N] minutes behind schedule today."
- Slot Grid component (see below)

### Slot Grid Component
- Renders slots as a CSS grid of buttons
- Slot button styles:
  ```scss
  .slot-available { background: white; border: 1px solid var(--ion-color-medium); }
  .slot-pending   { background: var(--ion-color-warning-tint); cursor: not-allowed; }
  .slot-full      { background: var(--ion-color-danger-tint); cursor: not-allowed; }
  .slot-selected  { background: var(--ion-color-primary); color: white; }
  ```
- Only Available slots are clickable
- Selected slot highlighted in blue
- Below the grid: legend showing color meanings
- On slot select → shows summary bar (doctor, date, time, service, fee)
- Service selector shown when multiple services available for this doctor
- "Proceed to Book" button → only active when slot + service selected

### Step 3 — Booking Summary (`/book/summary`)
- Shows: doctor name, specialization, service, date, time, fee
- "Confirm Booking" button → calls `POST /api/v1/bookings`
- On success:
  - If PayAtClinic mode → navigate to Booking Confirmation (with PayAtClinic message)
  - If Online mode → navigate to Proof Submission

### Step 4 — Proof Submission (`/book/proof/:bookingId`)
- Shows: payment methods from clinic settings (GCash QR, Maya QR, Bank Transfer details)
- Two tabs: "Reference Number" | "Upload Screenshot"
- Reference Number tab: text input
- Screenshot tab: file input (image only)
- 10-minute countdown timer shown prominently
  ```
  ⏱ Time remaining to submit proof: 08:47
  ```
- Timer counts down in real-time (setInterval on component)
- On timer expire: show expired message, redirect to slot picker
- "Submit Proof" button → calls `POST /api/v1/bookings/{id}/proof`
- On success → navigate to Booking Confirmation

### Step 5 — Booking Confirmation (`/book/confirmation`)
- Shows:
  - ✅ "Booking Submitted Successfully!"
  - If PayAtClinic: "Please pay ₱[fee] at the clinic on your appointment date."
  - If Online: "Your payment proof has been submitted. We'll confirm your booking shortly."
  - If already Confirmed (PayAtClinic): "Booking Confirmed! Your queue number is #[N]"
- "View My Bookings" button

---

## MY BOOKINGS PAGE (Patient Portal)

Route: `/portal/my-bookings`

- Tabs: Upcoming | Past
- Each booking card shows:
  - Doctor name, service, date, time
  - Status badge (color-coded)
  - Queue number (if confirmed)
  - OR number (if paid)
  - Cancel button (only if status = Pending or Confirmed and within deadline)
  - Download Receipt button (if receiptUrl exists)
- Cancel: `ion-alert` confirmation with reason input
- Pull-to-refresh

Status badge colors:
| Status | Color |
|---|---|
| Pending | warning |
| ProofSubmitted | tertiary |
| Confirmed | success |
| OnHold | warning |
| Cancelled | medium |
| Completed | primary |
| Expired | danger |
| NoShow | danger |

---

## ADMIN/STAFF BOOKING MANAGEMENT

Route: `/admin/bookings`

### Bookings List Page
- Filter bar: date picker, doctor selector, status filter, payment status filter
- Default: today's bookings
- `ion-list` of bookings showing: queue#, patient name, doctor, service, time, status badge, payment status badge
- Tap → opens Booking Detail Modal
- "Walk-In" FAB button → opens Walk-In Modal

### Booking Detail Modal
- Shows all booking fields
- Action buttons based on current status:
  - `ProofSubmitted` → [Confirm] [Reject]
  - `OnHold` → [Confirm] [Cancel]
  - `Confirmed + PayAtClinic + Unpaid` → [Mark Paid]
  - `Confirmed` → [Complete] [No Show]
  - `Confirmed` → [Cancel]
- Reject: requires reason text input via `ion-alert`
- All actions call corresponding admin booking service methods

### Walk-In Modal (Admin | Staff)

Step 1 — Patient Search:
- Search bar: search by name, contact number, PatientCode
- Shows matching patients from `GET /api/v1/patients/search?q=`
- "Not found?" → shows two options:
  - Quick Guest Entry (name + contact only)
  - Full Registration (opens full patient form)

Step 2 — Slot Selection:
- Doctor selector + date picker
- Slot grid (reuse slot grid component)

Step 3 — Payment Mode:
- Toggle: Pay at Clinic / Already Paid Online
- Confirm Walk-In Booking → calls `POST /api/v1/bookings/walk-in`
- On success: shows BookingId, QueueNumber

---

## SHARED BOOKING STATUS BADGE COMPONENT

```typescript
// shared/components/booking-status-badge/booking-status-badge.component.ts
@Input() status: BookingStatus;
// renders ion-badge with appropriate color and label
```

---

## TASK

Build all booking pages and admin booking management listed above. Build on Phase 1 + Phase 2.

Result must:
1. Patient can browse doctors and see available slot grid
2. Slot colors correctly reflect Available (white), Pending (yellow), Full (red)
3. Running late banner shown when RunningLate = true
4. Patient can complete the full online booking flow through to Confirmation
5. 10-minute countdown timer shown on proof submission page
6. Patient can view their bookings in My Bookings with correct status badges
7. Patient can cancel a Pending or Confirmed booking
8. Admin/Staff can view today's bookings filtered by doctor/status
9. Admin/Staff can confirm, reject, complete, and mark no-show on bookings
10. Walk-in flow works end-to-end with patient search and guest registration
