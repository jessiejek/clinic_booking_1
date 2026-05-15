# PHASE 2 — BE_PROMPT.md
## Clinic Setup: Doctors, Services, Schedules, Blocked Dates, Staff Management, Clinic Settings, Branding

---

## CONTEXT

Phase 2 builds on the Phase 1 auth foundation. The goal is to implement all clinic configuration endpoints: managing doctors, services, doctor-service links, schedules, blocked dates, running late flags, staff accounts (with invite flow), and clinic settings/branding.

At the end of this phase, an Admin can fully configure a clinic instance — add doctors, set schedules, add services, create staff accounts, and set clinic branding — all via API.

---

## REFERENCE DOCUMENTS
- `PROJECT.md` — business rules, access control tables, DB schema, API endpoints
- `BE_TECH_STACK.md` — Clean Architecture conventions, MediatR pattern, EF Core, repository pattern

---

## DATABASE TABLES TO ADD

### Doctors
```
- Id (Guid)
- UserId (FK → Users, nullable — doctor may not have a portal login yet)
- FullName (string, max 200)
- Specialization (string, max 200)
- Bio (string, max 2000, nullable)
- ProfilePhotoUrl (string, nullable)
- ConsultationFee (decimal 18,2)
- SlotDurationMinutes (int)
- SlotCapacity (int, default 1)
- DailyPatientLimit (int, nullable — null = no limit)
- LicenseNumber (string, max 100, nullable)
- PTRNumber (string, max 100, nullable)
- S2Number (string, max 100, nullable)
- Status (enum: Active / Inactive / OnLeave)
- CreatedAt, UpdatedAt, IsDeleted, DeletedAt
```

### Services
```
- Id, Name (max 200), Description (max 1000, nullable)
- EstimatedDurationMinutes (int)
- Price (decimal 18,2)
- CreatedAt, UpdatedAt, IsDeleted, DeletedAt
```

### DoctorServices (many-to-many join)
```
- Id, DoctorId (FK → Doctors), ServiceId (FK → Services)
- CreatedAt
- Unique constraint: (DoctorId, ServiceId)
```

### DoctorSchedules
```
- Id, DoctorId (FK → Doctors)
- DayOfWeek (int, 0=Sunday, 6=Saturday)
- StartTime (TimeSpan)
- EndTime (TimeSpan)
- IsActive (bool, default true)
- CreatedAt, UpdatedAt
```

### DoctorBlockedDates
```
- Id, DoctorId (FK → Doctors)
- BlockedDate (DateTime — date only)
- Reason (string, max 500, nullable)
- CreatedAt
```

### DoctorDayStatuses
```
- Id, DoctorId (FK → Doctors)
- StatusDate (DateTime — date only)
- RunningLate (bool, default false)
- EstimatedDelayMinutes (int, nullable)
- SetByUserId (FK → Users)
- CreatedAt, UpdatedAt
- Unique constraint: (DoctorId, StatusDate)
```

### StaffAccounts
```
- Id, UserId (FK → Users)
- AddedByAdminId (FK → Users)
- IsActive (bool, default true)
- CreatedAt
```

### Announcements
```
- Id, Title (max 200), Body (max 5000)
- ImageUrl (string, nullable)
- IsActive (bool, default true)
- CreatedAt, UpdatedAt
```

### ClinicSettings
```
- Id (single row per deployment)
- ClinicName (max 200)
- LogoUrl (string, nullable)
- PrimaryColor (string, max 20, default "#275226")
- SecondaryColor (string, max 20)
- Address, Phone, Email, FacebookUrl, InstagramUrl, LicenseNumber
- CancellationDeadlineHours (int, default 24)
- PatientPortalEnabled (bool, default true)
- VaccinationReminderEnabled (bool, default true)
- IsPayAtClinicMode (bool, default false)
- PayAtClinicNoShowWindowMinutes (int, default 60)
- DocumentHeaderHtml (string, nullable)
- DocumentFooterHtml (string, nullable)
- ORSequence (int, default 0)
- UpdatedAt
```

---

## APPLICATION LAYER — USE CASES

### Doctors

**GetDoctorsQuery** (public)
- Returns list of active doctors with: Id, FullName, Specialization, Bio, ProfilePhotoUrl, ConsultationFee, Status, average rating
- Filter by: specialization (optional), serviceId (optional)

**GetDoctorByIdQuery** (public)
- Returns doctor details + linked services + average rating + review count
- Includes today's DoctorDayStatus (RunningLate, EstimatedDelayMinutes) if exists

**CreateDoctorCommand** (Admin)
- Creates Doctor entity
- Creates User account for doctor with Role = Doctor
- Generates InviteToken, sets InviteTokenExpiresAt = +24hrs
- Sends invite email (fire-and-forget)
- Returns: DoctorId

**UpdateDoctorCommand** (Admin)
- Updates doctor fields (FullName, Specialization, Bio, ConsultationFee, SlotDurationMinutes, SlotCapacity, DailyPatientLimit, LicenseNumber, PTRNumber, S2Number, Status)

**DeleteDoctorCommand** (Admin)
- Soft delete doctor
- Sets User.IsDeleted = true on linked user account

**SetDoctorScheduleCommand** (Admin)
- Creates or replaces DoctorSchedule records for a doctor
- Validates: StartTime < EndTime, no duplicate DayOfWeek

**AddDoctorBlockedDateCommand** (Admin)
- Adds a DoctorBlockedDate record

**RemoveDoctorBlockedDateCommand** (Admin)
- Deletes a DoctorBlockedDate record

**GetDoctorDayStatusQuery** (Admin | Staff)
- Returns DoctorDayStatus for a given doctor + date

**SetDoctorDayStatusCommand** (Admin | Staff)
- Creates or updates DoctorDayStatus for doctor + date
- Records SetByUserId from JWT claims

### Services

**GetServicesQuery** (public)
- Returns all non-deleted services

**CreateServiceCommand** (Admin)
- Creates Service

**UpdateServiceCommand** (Admin)
- Updates Service fields

**DeleteServiceCommand** (Admin)
- Soft delete

**LinkDoctorServiceCommand** (Admin)
- Creates DoctorService link (validates not duplicate)

**UnlinkDoctorServiceCommand** (Admin)
- Removes DoctorService link

### Staff

**GetStaffQuery** (Admin)
- Returns all active staff with user details

**CreateStaffCommand** (Admin)
- Creates User with Role = Staff, IsFirstLogin = true
- Creates StaffAccount record
- Generates InviteToken (GUID, BCrypt hashed), InviteTokenExpiresAt = +24hrs
- Sends invite email with set-password link (fire-and-forget)
- Returns: StaffId, UserId

**DeactivateStaffCommand** (Admin)
- Sets StaffAccount.IsActive = false, User.IsDeleted = true

**ResendStaffInviteCommand** (Admin)
- Regenerates InviteToken + InviteTokenExpiresAt = +24hrs
- Re-sends invite email

### Announcements

**GetAnnouncementsQuery** (public)
- Returns all active announcements ordered by CreatedAt desc

**CreateAnnouncementCommand** (Admin)
**UpdateAnnouncementCommand** (Admin)
**DeleteAnnouncementCommand** (Admin)

### Clinic Settings

**GetSettingsQuery** (public)
- Returns: ClinicName, LogoUrl, PrimaryColor, SecondaryColor, Address, Phone, Email, FacebookUrl, InstagramUrl
- Does NOT return sensitive/internal fields (ORSequence, DocumentHeaderHtml, etc.)

**GetFullSettingsQuery** (Admin only)
- Returns all settings fields

**UpdateSettingsCommand** (Admin)
- Updates all ClinicSettings fields
- If no settings row exists yet → creates it (first-run)

---

## API ENDPOINTS

### Doctors
```
GET    /api/v1/doctors                              — public
GET    /api/v1/doctors/{id}                        — public
POST   /api/v1/doctors                              — Admin
PUT    /api/v1/doctors/{id}                        — Admin
DELETE /api/v1/doctors/{id}                        — Admin
POST   /api/v1/doctors/{id}/schedule               — Admin
PUT    /api/v1/doctors/{id}/schedule/{schedId}     — Admin
POST   /api/v1/doctors/{id}/blocked-dates          — Admin
DELETE /api/v1/doctors/{id}/blocked-dates/{dateId} — Admin
GET    /api/v1/doctors/{id}/day-status?date=       — Admin | Staff
PUT    /api/v1/doctors/{id}/day-status             — Admin | Staff
POST   /api/v1/doctors/{id}/services/{serviceId}   — Admin (link service)
DELETE /api/v1/doctors/{id}/services/{serviceId}   — Admin (unlink service)
```

### Services
```
GET    /api/v1/services                             — public
POST   /api/v1/services                             — Admin
PUT    /api/v1/services/{id}                       — Admin
DELETE /api/v1/services/{id}                       — Admin
```

### Staff
```
GET    /api/v1/staff                                — Admin
POST   /api/v1/staff                                — Admin
PUT    /api/v1/staff/{id}/deactivate               — Admin
POST   /api/v1/staff/{id}/resend-invite            — Admin
```

### Announcements
```
GET    /api/v1/announcements                        — public
POST   /api/v1/announcements                        — Admin
PUT    /api/v1/announcements/{id}                  — Admin
DELETE /api/v1/announcements/{id}                  — Admin
```

### Settings
```
GET    /api/v1/settings                             — public (safe fields only)
GET    /api/v1/settings/full                        — Admin
PUT    /api/v1/settings                             — Admin
```

---

## ACCESS CONTROL

| Action | Admin | Staff | Doctor | Patient |
|---|---|---|---|---|
| View doctors (public list) | ✅ | ✅ | ✅ | ✅ |
| Create / edit / delete doctor | ✅ | ❌ | ❌ | ❌ |
| Set schedule / blocked dates | ✅ | ❌ | ❌ | ❌ |
| Set running late flag | ✅ | ✅ | ❌ | ❌ |
| Create / edit staff | ✅ | ❌ | ❌ | ❌ |
| Create / edit services | ✅ | ❌ | ❌ | ❌ |
| Create / edit announcements | ✅ | ❌ | ❌ | ❌ |
| View public settings | ✅ | ✅ | ✅ | ✅ |
| Edit settings | ✅ | ❌ | ❌ | ❌ |

---

## SEED DATA TO ADD

Add to the Phase 1 seeder:

**Doctors** (3)
1. Dr. Maria Santos — General Practitioner — ₱500 — SlotDuration: 30 — SlotCapacity: 1 — DailyPatientLimit: 10
   - Schedule: Mon–Fri, 8:00–17:00
2. Dr. Jose Reyes — Pediatrics — ₱600 — SlotDuration: 30 — SlotCapacity: 1 — DailyPatientLimit: 8
   - Schedule: Mon/Wed/Fri, 9:00–16:00
3. Dr. Ana Cruz — OB-Gynecology — ₱700 — SlotDuration: 30 — SlotCapacity: 1 — DailyPatientLimit: 8
   - Schedule: Tue/Thu, 8:00–15:00

**Services** (5)
1. General Consultation — ₱500 — 30 min
2. Pediatric Checkup — ₱600 — 30 min
3. Prenatal Checkup — ₱700 — 30 min
4. Annual Physical Exam — ₱1,500 — 60 min
5. Wound Dressing — ₱200 — 15 min

**DoctorService links**
- Dr. Santos → General Consultation, Annual Physical Exam, Wound Dressing
- Dr. Reyes → Pediatric Checkup
- Dr. Cruz → Prenatal Checkup, Annual Physical Exam

**ClinicSettings** (single row)
- ClinicName: "Sample Clinic"
- PrimaryColor: "#275226"
- CancellationDeadlineHours: 24
- IsPayAtClinicMode: false
- PayAtClinicNoShowWindowMinutes: 60
- PatientPortalEnabled: true
- VaccinationReminderEnabled: true
- ORSequence: 0

---

## BUSINESS RULES

- A doctor's daily patient limit applies across ALL slots — once reached, the entire day shows as Full
- Blocked dates prevent any bookings for that doctor on that date
- DoctorDayStatus is per-doctor per-date — only one record can exist (upsert behavior)
- Staff accounts are created by Admin only — staff cannot self-register
- When Admin creates a doctor: User account is also created with Role = Doctor, invite email sent
- Clinic settings has exactly one row — always update, never insert a second row

---

## TASK

Implement all use cases, repositories, controllers, and EF Core migrations for Phase 2. Build on the existing Phase 1 solution without breaking any auth functionality.

Result must:
1. All listed API endpoints testable via Swagger
2. `GET /api/v1/doctors` returns the 3 seeded doctors
3. `GET /api/v1/services` returns the 5 seeded services
4. `POST /api/v1/doctors` (Admin JWT) creates a doctor and sends invite email
5. `POST /api/v1/staff` (Admin JWT) creates staff and sends invite email
6. `GET /api/v1/settings` returns clinic branding without admin-only fields
7. Running late flag can be set and retrieved per doctor per date
8. All access control rules enforced via `[Authorize(Roles = "...")]`
