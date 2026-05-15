# PHASE 9 — FE_PROMPT.md
## Patient Portal: My Records (Read-Only), My Profile, Reviews, Portal Home

---

## CONTEXT

Phase 9 finalizes the patient-facing portal. The booking flow (Phase 3), My Bookings (Phase 3), My Receipts (Phase 4), and My Prescriptions (Phase 6) are already built. This phase completes the portal with: the portal home page, My Medical Records (read-only), My Profile (editable), and the doctor review submission flow. It also adds the Admin Audit Log page.

---

## REFERENCE DOCUMENTS
- `PROJECT.md` — Patient Portal section, Reviews section, Audit Trail
- `FE_TECH_STACK.md` — Angular 17 standalone, Signals, ApiService

---

## PAGES TO BUILD

```
features/patient/
├── portal/
│   ├── portal.page.ts          (replace Phase 1 placeholder — Portal Home)
│   ├── portal.page.html
│   └── portal.page.scss
├── my-records/
│   ├── my-records.page.ts
│   ├── my-records.page.html
│   ├── my-records.page.scss
│   └── components/
│       ├── consultation-card/
│       └── vitals-trend-chart/
└── my-profile/
    ├── my-profile.page.ts
    ├── my-profile.page.html
    └── my-profile.page.scss

features/admin/
└── audit-logs/
    ├── audit-logs.page.ts
    ├── audit-logs.page.html
    └── audit-logs.page.scss
```

---

## SERVICES (Angular)

```typescript
// features/patient/services/portal.service.ts
getPortalSummary(): Observable<PatientPortalSummary>
getMyRecords(): Observable<MyMedicalRecords>
updateMyProfile(payload: UpdateProfileRequest): Observable<void>
resendVerificationEmail(): Observable<void>

// features/patient/services/review.service.ts
getDoctorReviews(doctorId: string, page: number): Observable<PaginatedReviews>
submitReview(payload: CreateReviewRequest): Observable<void>
updateReview(id: string, payload: UpdateReviewRequest): Observable<void>
deleteReview(id: string): Observable<void>

// features/admin/services/audit-log.service.ts
getAuditLogs(filters: AuditLogFilters): Observable<PaginatedAuditLogs>
```

---

## MODELS

```typescript
export interface PatientPortalSummary {
  patientCode: string;
  fullName: string;
  isEmailVerified: boolean;
  nextUpcomingBooking: Booking | null;
  totalBookingsCount: number;
  activePrescriptionsCount: number;
  unreadNotificationsCount: number;
  latestAnnouncements: Announcement[];
}

export interface Review {
  id: string;
  patientName: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  isOwn?: boolean;
}

export interface PaginatedReviews {
  items: Review[];
  averageRating: number;
  totalReviews: number;
  hasMore: boolean;
}

export interface AuditLog {
  id: string;
  entityType: string;
  entityId: string;
  action: 'Create' | 'Update' | 'Delete';
  oldValues: string | null;
  newValues: string | null;
  performedByName: string;
  performedAt: string;
  ipAddress: string | null;
}
```

---

## PATIENT PORTAL NAV

Replace the Phase 1 portal placeholder with a proper side menu or tab bar. Use `ion-tabs` at the bottom for mobile-first feel:

```
Tab 1: 🏠 Home          → /portal
Tab 2: 📅 Bookings      → /portal/my-bookings
Tab 3: 🏥 Records       → /portal/my-records
Tab 4: 💊 Prescriptions → /portal/my-prescriptions
Tab 5: 🧾 Receipts      → /portal/my-receipts
Tab 6: 👤 Profile       → /portal/my-profile
```

Also keep notification bell in the toolbar.

---

## PORTAL HOME PAGE

Route: `/portal`

Calls `GET /api/v1/portal/summary` on load.

Layout:

**Welcome Card**
```
Good morning, [First Name]! 👋
Patient ID: PT-2025-00001
```
- Email verification banner (if not verified):
  ```
  ⚠️ Email not verified — [Resend Email]
  ```

**Next Appointment Card** (if exists)
```
📅 Upcoming Appointment
Dr. Maria Santos — General Consultation
Tuesday, June 3 · 10:00 AM
Queue #7
[View Details]
```
Use `ion-card` with `color="primary"`.

**Quick Stats Row**
```
📋 12 Bookings   |   💊 3 Active Rx   |   🔔 2 Unread
```

**Latest Announcements**
- Shows top 3 active announcements from `latestAnnouncements`
- Each as a small `ion-card`: title + truncated body (max 100 chars) + date

**Quick Action Buttons**
```
[Book Appointment]   [My Records]
```

---

## MY MEDICAL RECORDS PAGE (Read-Only)

Route: `/portal/my-records`

**Tabs: Overview | Consultations | Vitals**

### Overview Tab
- Active Diagnoses: list of `ion-chip` per active diagnosis (ICD-10 code + description)
- Known Allergies: same as the allergy alert card from doctor view but read-only
- Vaccination Records: list with next dose date

### Consultations Tab
- List of past consultations (read-only)
- Each card: date, doctor name, chief complaint, locked badge
- Tap → expand to show: assessment, plan, diagnoses, prescription summary, follow-up date
- "Download Visit Summary" button if visitSummaryUrl exists

### Vitals Tab
- Vitals trend charts (reuse `vitals-chart` component from Phase 5)
- Latest vitals summary card

---

## MY PROFILE PAGE

Route: `/portal/my-profile`

**Read-only section** (greyed out, with label "Cannot be changed"):
- Full Name, Patient Code, Date of Birth, Sex

**Editable section** (Reactive Form):
- Contact Number
- Address, City, Zip Code
- Emergency Contact Name, Number, Relationship
- Blood Type (select)
- PhilHealth Number
- HMO Provider, HMO Card Number

**Account section**:
- Email (read-only display)
- "Change Password" button → opens `ion-modal` with: Current Password, New Password, Confirm Password form
- "Link Google Account" / "Unlink Google Account" toggle (future — placeholder button, disabled)

Save button for editable fields. Success toast on save.

---

## DOCTOR REVIEWS (Public + Patient Submission)

### On Doctor Detail Page (Booking Flow — Phase 3, extend)

Below the doctor's info, add a Reviews section:

- Star rating display (average out of 5)
- Total review count
- List of reviews (paginated, 5 per page, "Load more" button)
- Each review: patient name (first name + last initial), star rating, comment, date

### After Booking Completion (My Bookings Page — Phase 3, extend)

On completed bookings in My Bookings that have no review yet:
- Show "Leave a Review" button

### Review Form Modal

Opens from "Leave a Review" button:

```
Rate Dr. [Name]

★ ★ ★ ★ ★  (interactive star rating — tap to select 1–5)

Comment (optional)
[textarea, max 500 chars]

[Submit Review]
```

On success: toast "Thank you for your review!" + hide "Leave a Review" button for this booking.

Validation:
- Rating required (1–5)
- If no comment: still valid
- Cannot submit for same booking twice (backend returns 409 → show "You've already reviewed this visit")

### Edit / Delete Review

On My Bookings, completed bookings with existing reviews show:
- Star display + comment preview
- "Edit Review" link → opens review form pre-filled
- "Delete Review" link with confirm alert

---

## ADMIN AUDIT LOG PAGE

Route: `/admin/audit-logs`

Access: Admin only (add to Admin side menu)

Filters:
- Entity Type (select: Consultation / Diagnosis / Allergy / Prescription / All)
- Performed By (text search)
- Date Range (from/to date pickers)
- Page size: 20 per page

`ion-list` of audit entries:
- Each item: Entity Type badge | Entity ID | Action badge (Create=success, Update=warning, Delete=danger) | Performed By | Date
- Tap → expand to show OldValues / NewValues (formatted JSON display)

Paginated with "Load more" at bottom.

---

## STAR RATING COMPONENT

Create a reusable component:

```typescript
// shared/components/star-rating/star-rating.component.ts
@Input() value: number;              // current rating (1–5)
@Input() readonly: boolean = false;  // display-only mode
@Output() ratingChange = new EventEmitter<number>();
```

```html
@for (star of [1,2,3,4,5]; track star) {
  <ion-icon
    [name]="star <= value ? 'star' : 'star-outline'"
    [color]="star <= value ? 'warning' : 'medium'"
    (click)="!readonly && ratingChange.emit(star)">
  </ion-icon>
}
```

---

## TASK

Complete the patient portal and add the audit log page. Build on Phases 1–8.

Result must:
1. Portal home shows next upcoming appointment card, quick stats, and announcements
2. Email verification banner shown + Resend button works
3. My Medical Records shows active diagnoses, allergies, consultations, and vitals charts (read-only)
4. Patient cannot see edit buttons or create buttons anywhere in their portal
5. My Profile form saves only the allowed fields, read-only fields are visually locked
6. Patient can submit a review for a completed booking via star rating form
7. Review appears on doctor's public profile page with average rating updated
8. Patient can edit and delete their own review
9. Cannot submit duplicate review for same booking (shows appropriate error)
10. Admin can view paginated audit logs with old/new value JSON expandable on tap
