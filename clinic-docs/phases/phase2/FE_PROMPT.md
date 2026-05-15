# PHASE 2 — FE_PROMPT.md
## Clinic Setup: Admin Pages — Doctors, Services, Schedules, Staff, Settings, Announcements

---

## CONTEXT

Phase 2 builds on the Phase 1 auth foundation. The goal is to implement all Admin-facing clinic configuration pages: manage doctors, manage services, link services to doctors, set schedules, add blocked dates, manage staff accounts, clinic settings/branding, and announcements.

At the end of this phase, an Admin can fully configure the clinic instance through the UI.

---

## REFERENCE DOCUMENTS
- `PROJECT.md` — business rules, access control, API endpoints
- `FE_TECH_STACK.md` — Angular 17 standalone conventions, folder structure, ApiService, naming

---

## PAGES TO BUILD

```
features/admin/
├── admin.routes.ts
├── dashboard/                    (placeholder from Phase 1 — leave as-is)
├── doctors/
│   ├── doctors.page.ts
│   ├── doctors.page.html
│   ├── doctors.page.scss
│   └── components/
│       ├── doctor-form/          (ion-modal form — create/edit)
│       ├── schedule-form/        (ion-modal — set working days/hours)
│       └── blocked-dates/        (ion-modal — manage blocked dates)
├── services/
│   ├── services.page.ts
│   ├── services.page.html
│   ├── services.page.scss
│   └── components/
│       └── service-form/
├── staff/
│   ├── staff.page.ts
│   ├── staff.page.html
│   ├── staff.page.scss
│   └── components/
│       └── staff-form/
├── announcements/
│   ├── announcements.page.ts
│   ├── announcements.page.html
│   └── announcements.page.scss
└── settings/
    ├── settings.page.ts
    ├── settings.page.html
    └── settings.page.scss
```

---

## SERVICES (Angular)

```typescript
// features/admin/services/doctor-admin.service.ts
getDoctors(): Observable<Doctor[]>
getDoctorById(id: string): Observable<DoctorDetail>
createDoctor(payload: CreateDoctorRequest): Observable<void>
updateDoctor(id: string, payload: UpdateDoctorRequest): Observable<void>
deleteDoctor(id: string): Observable<void>
setSchedule(doctorId: string, schedules: DoctorSchedule[]): Observable<void>
addBlockedDate(doctorId: string, date: string, reason?: string): Observable<void>
removeBlockedDate(doctorId: string, dateId: string): Observable<void>
linkService(doctorId: string, serviceId: string): Observable<void>
unlinkService(doctorId: string, serviceId: string): Observable<void>
setDayStatus(doctorId: string, payload: DayStatusRequest): Observable<void>

// features/admin/services/service-admin.service.ts
getServices(): Observable<Service[]>
createService(payload: CreateServiceRequest): Observable<void>
updateService(id: string, payload: UpdateServiceRequest): Observable<void>
deleteService(id: string): Observable<void>

// features/admin/services/staff-admin.service.ts
getStaff(): Observable<StaffMember[]>
createStaff(payload: CreateStaffRequest): Observable<void>
deactivateStaff(id: string): Observable<void>
resendInvite(id: string): Observable<void>

// features/admin/services/settings.service.ts
getFullSettings(): Observable<ClinicSettings>
updateSettings(payload: UpdateSettingsRequest): Observable<void>

// features/admin/services/announcement.service.ts
getAnnouncements(): Observable<Announcement[]>
createAnnouncement(payload: CreateAnnouncementRequest): Observable<void>
updateAnnouncement(id: string, payload: UpdateAnnouncementRequest): Observable<void>
deleteAnnouncement(id: string): Observable<void>
```

---

## MODELS

```typescript
export interface Doctor {
  id: string;
  fullName: string;
  specialization: string;
  bio: string | null;
  profilePhotoUrl: string | null;
  consultationFee: number;
  slotDurationMinutes: number;
  slotCapacity: number;
  dailyPatientLimit: number | null;
  licenseNumber: string | null;
  ptrNumber: string | null;
  s2Number: string | null;
  status: 'Active' | 'Inactive' | 'OnLeave';
  services: Service[];
  averageRating: number;
}

export interface DoctorSchedule {
  dayOfWeek: number; // 0–6
  startTime: string; // "08:00"
  endTime: string;   // "17:00"
  isActive: boolean;
}

export interface Service {
  id: string;
  name: string;
  description: string | null;
  estimatedDurationMinutes: number;
  price: number;
}

export interface StaffMember {
  id: string;
  userId: string;
  fullName: string;
  email: string;
  isActive: boolean;
  createdAt: string;
}

export interface ClinicSettings {
  clinicName: string;
  logoUrl: string | null;
  primaryColor: string;
  secondaryColor: string;
  address: string;
  phone: string;
  email: string;
  facebookUrl: string | null;
  instagramUrl: string | null;
  cancellationDeadlineHours: number;
  isPayAtClinicMode: boolean;
  payAtClinicNoShowWindowMinutes: number;
  patientPortalEnabled: boolean;
  vaccinationReminderEnabled: boolean;
  documentHeaderHtml: string | null;
  documentFooterHtml: string | null;
}
```

---

## PAGE BEHAVIORS

### Doctors Page (`/admin/doctors`)

List view:
- `ion-list` of all doctors showing: photo, name, specialization, status badge, consultation fee
- Status badge colors: Active = success, Inactive = medium, OnLeave = warning
- FAB button "Add Doctor" → opens `DoctorFormModal`
- Each item: tap to open detail, swipe-left to reveal Edit/Delete actions
- Delete: `ion-alert` confirmation → soft delete

Doctor Form Modal (create/edit):
- Fields: Full Name, Specialization, Bio, Consultation Fee, Slot Duration (select: 15/30/45/60 min), Slot Capacity, Daily Patient Limit (optional), License Number, PTR Number, S2 Number, Status (select)
- On create: success toast "Doctor created and invite email sent"
- On edit: success toast "Doctor updated"

Schedule Form Modal:
- Checklist of days of week (Mon–Sun)
- For each checked day: Start Time + End Time pickers
- Submit replaces all schedules for that doctor

Blocked Dates Modal:
- Shows existing blocked dates in a list
- Date picker + reason field to add new
- Delete icon per row

Services Link Section (within doctor detail or modal tab):
- Shows currently linked services with unlink button
- Dropdown to select and add a service from the clinic's service list

### Services Page (`/admin/services`)

- `ion-list` of all services: name, duration, price
- FAB "Add Service"
- Service Form Modal: Name, Description, Estimated Duration, Price
- Swipe-left: Edit / Delete

### Staff Page (`/admin/staff`)

- `ion-list` of staff members: name, email, status badge (Active/Inactive)
- FAB "Add Staff"
- Staff Form Modal: Full Name, Email
- On create: success toast "Staff account created and invite email sent"
- Each item action: Deactivate, Resend Invite
- Resend Invite: only visible if staff is Active

### Announcements Page (`/admin/announcements`)

- `ion-list` of announcements: title, preview, active badge
- FAB "Add Announcement"
- Announcement Form Modal: Title, Body (textarea), Image URL (optional), Is Active toggle
- Swipe-left: Edit / Delete

### Settings Page (`/admin/settings`)

Single form page with sections:

**Clinic Info**
- Clinic Name, Address, Phone, Email, Facebook URL, Instagram URL

**Branding**
- Logo URL (text input — no upload in this phase)
- Primary Color (color picker or text input)
- Secondary Color

**Booking Settings**
- Cancellation Deadline (hours) — number input
- Pay at Clinic Mode (toggle) — clinic-wide default
- PayAtClinic No-Show Window (minutes) — number input

**Features**
- Patient Portal Enabled (toggle)
- Vaccination Reminder Enabled (toggle)

**Document Templates**
- Header HTML (textarea)
- Footer HTML (textarea)

Save button at bottom. Success toast on save.

---

## ADMIN NAVIGATION

Add a side menu or tab bar to the Admin shell (replace the Phase 1 placeholder) with links to:
- Dashboard (placeholder)
- Doctors
- Services
- Staff
- Announcements
- Settings
- Logout

Use `ion-menu` with `ion-list` and `ion-menu-button` in the toolbar.

---

## SHARED COMPONENTS TO CREATE

### StatusBadge Component
```typescript
// shared/components/status-badge/status-badge.component.ts
// Input: status string, outputs appropriate ion-badge color
@Input() status: string;
```

---

## ACCESS CONTROL

All admin pages are already protected by `AuthGuard + RoleGuard (Admin)` from Phase 1 routing. No additional guard work needed.

---

## TASK

Build all Admin clinic setup pages listed above. Build on the Phase 1 project without breaking auth. 

Result must:
1. Admin can log in and see the side menu with navigation links
2. Admin can add, edit, and delete doctors
3. Admin can set doctor schedules (days + hours)
4. Admin can add blocked dates per doctor
5. Admin can link/unlink services to doctors
6. Admin can add, edit, delete services
7. Admin can create staff accounts (invite email triggered on BE)
8. Admin can resend invites and deactivate staff
9. Admin can manage announcements
10. Admin can save clinic settings and see them reflected
