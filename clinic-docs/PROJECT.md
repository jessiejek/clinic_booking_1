# CLINIC SYSTEM — PROJECT.md
> Single source of truth. All backend, database, and frontend behavior must match this document.

---

## WHAT WE ARE BUILDING

A web application for clinics to manage appointment bookings, doctor schedules, patient medical records, prescriptions, lab results, and clinical documentation — all in one system.

This is a **standalone deployable app**. Every clinic gets their own separate instance — their own domain, their own database, their own data. There is no shared multi-tenant platform. The developer builds one codebase, then deploys a fresh copy per customer.

---

## WHO USES THE APP

### Admin (Clinic Owner / Clinic Manager)
- One admin account per deployment
- Full access to everything: doctors, services, schedules, bookings, payments, medical records, announcements, settings
- Only role that can delete records and view the audit log
- Cannot be created via registration — seeded on first run

### Staff (Receptionist / Nurse / Medical Assistant)
- Added by Admin only
- Can confirm/cancel appointments, process walk-ins, register new patients, encode vital signs, attach lab results, log vaccinations
- Can manually create bookings on behalf of walk-in patients
- Cannot manage staff accounts, change clinic settings, or write prescriptions

### Doctor
- Account created by Admin only
- Can view their own schedule and appointments
- Can create consultations, write prescriptions, add diagnoses, attach lab results
- Can only access patients they have personally consulted
- Doctor cross-access is **automatic** — if a patient books with Doctor A after previously seeing Doctor B, Doctor A automatically gains access to that patient's full record upon the patient's first consultation with Doctor A

### Patient
- Registers via Google, Facebook, or email/password
- Browses doctors and services, books appointments, submits payment proof
- Can view their own medical records via the patient portal (read-only)
- Can belong to multiple clinic deployments using the same account
- Email verification is **soft** — unverified patients see a warning banner but can still book

---

## ONBOARDING FLOW (Admin-Created Accounts)

When Admin creates a Staff or Doctor account:
1. System generates a secure set-password token (expires in 24 hours)
2. System sends an invite email with a set-password link
3. On first login, user is **forced to change their password** before accessing anything
4. If the invite link expires, Admin can resend it

---

## PASSWORD POLICY

- Minimum 8 characters
- At least 1 uppercase letter
- At least 1 number
- At least 1 special character
- Applied on registration, password reset, and forced first-login change

---

## ACCOUNT LOCKOUT

- Lock account after **5 consecutive failed login attempts**
- Lockout duration: **5 minutes**
- After lockout expires, attempt counter resets
- Lockout state stored in Users table (`LockoutUntil`, `FailedLoginAttempts`)

---

## CORE FEATURES

### 1. Doctor Management
- Admin can add unlimited doctors
- Each doctor has: full name, specialization, bio, profile photo, consultation fee, license number, PTR number, S2 number
- Doctor status: Active, Inactive, On Leave
- Each doctor has a **DailyPatientLimit** — max total bookings accepted per day across all slots. Once hit, the entire day closes to new bookings even if individual slots still have capacity.

### 2. Service Management
- Admin can add unlimited services (e.g. General Checkup, ECG, Ultrasound, Wound Dressing)
- Each service has: name, description, estimated duration, price
- A doctor can be linked to one or more services

### 3. Doctor Schedules
- Admin sets working days and hours per doctor
- Admin sets time slot duration per doctor (e.g. 15-min or 30-min slots)
- Admin sets maximum patients per slot (SlotCapacity)
- Admin sets maximum patients per day (DailyPatientLimit) — separate from slot capacity
- Admin can block dates per doctor (vacation, holidays, conferences)

### 4. Patient Registry
- Centralized list of all patients in the clinic
- Each patient has a unique auto-generated Patient ID (e.g. PT-2025-00001)
- Patient record includes: full name, date of birth, sex, civil status, address, contact number, email, emergency contact, blood type, PhilHealth number, HMO info
- Patients who register via the booking portal are automatically linked to a patient record
- Staff can manually create patient records for walk-in patients
- Admin can merge duplicate patient records

### 5. Announcements
- Admin can post clinic announcements (text + optional image)
- Visible to patients on the public portal
- Admin can add, edit, or remove announcements

### 6. Branding / Customization
- Admin uploads clinic logo and sets brand colors
- Admin sets clinic name, address, phone, email, social media links
- App reflects clinic branding throughout (including generated PDF documents)

---

## BOOKING SYSTEM

### Patient-Facing: Doctor & Service Discovery
- Patients see all active doctors with specialization, photo, consultation fee, and reviews
- Patients can browse available time slots per doctor per date
- Patients can filter by specialization or service

### Time Slot Visual (Patient View)
- Patient selects a doctor and a date
- A grid of time slots is shown based on the doctor's schedule and slot duration
- Slot colors:
  - **White** — available, clickable
  - **Red** — fully booked (slot capacity reached OR daily patient limit reached), not clickable
  - **Yellow** — pending (someone mid-booking), not clickable
  - **Blue** — currently selected by this patient
- If the doctor has a **RunningLate** status for today, a banner is shown: _"Dr. [Name] is running approximately [N] minutes behind schedule today."_

### Slot Selection Rules
- Patient selects one time slot per booking
- A slot can hold multiple patients if SlotCapacity > 1
- Once a slot reaches its capacity → shown as Booked/Full
- Once a doctor reaches their DailyPatientLimit → entire day shown as Full
- Summary bar shows: doctor, date, time, service, fee, queue number (assigned on confirmation)

### Booking Flow (Online / Patient-Initiated)
```
Step 1  — Patient selects doctor + date + time slot + service
Step 2  — Patient taps "Proceed to Booking"
Step 3  — System holds the slot for 10 minutes (status = Pending)
Step 4  — Patient sees payment details: GCash QR / Maya QR / Bank account
          (Skipped entirely if clinic is in "Pay at Clinic" mode OR per-booking override is PayAtClinic)
Step 5  — Patient pays outside the app
Step 6  — Patient submits proof of payment:
            Option A: Type/paste reference number
            Option B: Upload screenshot
          (Skipped if PayAtClinic mode applies)
Step 7  — Slot hold extends by 30 minutes for admin/staff to verify
Step 8  — Admin or Staff receives notification, checks their payment app
Step 9a — Admin/Staff confirms → status = Confirmed ✅ → QueueNumber assigned → Patient notified → Payment Receipt generated + emailed
Step 9b — Admin/Staff rejects → status = Cancelled ❌ → Patient notified, must rebook
Step 9c — No action within 1 hour → status = On Hold ⚠️ → manual resolution required

(If PayAtClinic mode applies: Steps 4–7 are skipped, booking goes straight to Confirmed + QueueNumber assigned + Payment Receipt generated)
```

### Walk-In Booking Flow (Staff / Admin)
```
Step 1  — Staff opens the Walk-In screen
Step 2  — Staff searches for patient by name, contact number, or Patient ID
            Patient found → proceed to Step 4
            Patient not found → proceed to Step 3
Step 3  — Staff registers patient (two options):
            Option A: Quick Guest Entry
              — Name + contact number only
              — Patient record created with IsGuest = true
            Option B: Full Registration
              — Complete patient form (DOB, address, emergency contact, etc.)
Step 4  — Staff selects doctor + date + time slot + service
Step 5  — Staff selects Payment Mode:
            Option A: Pay at Clinic → PaymentStatus = Unpaid
            Option B: Online (paid externally, proof already in hand)
Step 6  — System creates booking with status = Confirmed immediately
Step 7  — QueueNumber assigned automatically (per doctor per day)
Step 8  — Payment Receipt generated automatically
Step 9  — If PaymentMode = PayAtClinic → Staff marks PaymentStatus = Paid when cash is collected → Receipt regenerated with Paid status
```

### Booking Status Definitions
| Status | Meaning |
|---|---|
| Pending | Slot held, waiting for patient to submit proof (10 min timer) |
| ProofSubmitted | Proof submitted, waiting for admin/staff to verify (1 hour window) |
| Confirmed | Payment verified (or PayAtClinic) — appointment is reserved |
| OnHold | Admin/staff did not act within 1 hour — needs manual resolution |
| Cancelled | Proof rejected, or patient/admin cancelled |
| Completed | Appointment done, marked by staff or doctor |
| Expired | Patient did not submit proof within 10 minutes — slot released |
| NoShow | Patient did not appear for a Confirmed appointment |

### Payment Status (separate from Booking Status)
| PaymentStatus | Meaning |
|---|---|
| Unpaid | Pay at Clinic booking — payment not yet collected by staff |
| Paid | Cash collected by staff, or online payment verified |
| Waived | Admin waived the consultation fee |
| Refunded | Payment was returned to the patient (manual) |

- Online bookings: PaymentStatus = Paid when Admin/Staff confirms proof
- PayAtClinic bookings: PaymentStatus starts as Unpaid; Staff sets to Paid when cash is collected
- If patient leaves without paying → booking can be Completed with PaymentStatus = Unpaid (flagged on dashboard)
- Admin can pull a report of all Completed bookings with PaymentStatus = Unpaid

### Payment Mode (two levels of control)
1. **Clinic-level default** — Admin sets clinic-wide default in ClinicSettings (`IsPayAtClinicMode`)
2. **Per-booking override** — Staff can override when creating a walk-in booking. Online patients follow the clinic default.

### Queue Numbers
- Each Confirmed booking is assigned a `QueueNumber` — auto-incremented per doctor per day
- Queue numbers reset to 1 each new day per doctor
- Queue number is shown to the patient in their booking confirmation and reminder notifications
- Example: _"You are #7 for Dr. Santos today — your appointment is at 10:00 AM"_

### Cancellation by Patient
- Patient can cancel if status is Pending or Confirmed
- If payment was already confirmed → Refund = Pending (processed manually by admin; PaymentStatus → Refunded)
- Admin sets cancellation deadline (e.g. must cancel at least 24 hours before)
- No automatic refund integration

### Booking Timers
- **10 minutes** — booking creation to proof submission deadline → Expired
- **1 hour** — proof submission to admin/staff verification deadline → On Hold

### Doctor Running Late
- Staff flags a doctor as running late for a specific date via `DoctorDayStatus`
- Staff sets estimated delay in minutes
- Banner displayed on public portal on the doctor's booking page
- Staff can update or clear the flag at any time
- Informational only — does not block or cancel bookings

### Reviews
- One review per patient per doctor per completed visit (enforced via unique constraint on `BookingId`)
- Patient can only review after booking status = Completed
- Patient can edit their own review
- No time limit to submit a review after completion
- Admin can delete any review

---

## RECEIPTS & DOCUMENT GENERATION

### Payment Receipt (OR)
- Generated automatically when a booking is **Confirmed** (online) or when **PaymentStatus is marked Paid** (walk-in)
- OR Number format: `OR-2025-00001` — auto-incremented per clinic, resets never
- OR Number stored in `Payments` table
- Receipt contains: OR number, patient name, doctor, service, appointment date/time, amount paid, payment method, queue number, clinic branding
- Receipt PDF stored to `GeneratedDocuments` table (`DocumentType = PaymentReceipt`)
- Receipt URL stored in `Bookings.ReceiptUrl`
- Delivered via: email to patient + downloadable in patient portal

### Visit Summary Receipt
- Generated automatically when a booking is marked **Completed**
- Triggered by: `PUT /api/v1/bookings/{id}/complete`
- Contains: patient name, doctor, consultation date, chief complaint, diagnosis summary, prescription summary, next follow-up date, amount paid, OR number, clinic branding
- PDF stored to `GeneratedDocuments` table (`DocumentType = VisitSummary`)
- Visit Summary URL stored in `Consultations.VisitSummaryUrl`
- Delivered via: email to patient + downloadable in patient portal

### Other Generated Documents (on demand)
All documents use clinic branding (logo, name, address, configurable header/footer):

| Document | DocumentType Enum | Who Can Generate |
|---|---|---|
| Prescription | Prescription | Doctor, Admin |
| Medical Certificate | MedCert | Doctor, Admin |
| Referral Letter | Referral | Doctor, Admin |
| Patient Visit Summary | VisitSummary | Doctor, Staff, Admin |
| Lab Result Report | LabReport | Doctor, Staff, Admin |
| Payment Receipt | PaymentReceipt | System (auto) |

- All generated documents are automatically saved to the patient's `GeneratedDocuments` and linked to `PatientAttachments`

---

## PATIENT PORTAL

The patient portal is a dedicated view for authenticated patients. Pages:

| Page | Description |
|---|---|
| My Bookings | All bookings (upcoming + history), with status, queue number, and cancel option |
| My Medical Records | Read-only view of consultations, diagnoses, vitals trend charts |
| My Prescriptions | List of prescriptions with status; download PDF per prescription |
| My Receipts | List of payment receipts and visit summaries; download PDF |
| My Profile | Editable: name, contact number, address, emergency contact, blood type, PhilHealth, HMO |

- Patients cannot edit: DOB, sex, PatientCode
- Patients can update their password from their profile
- Patients can link/unlink Google or Facebook from their account

---

## PAYMENT

- **Methods:** GCash, Maya, Bank Transfer, Pay at Clinic
- **Manual flow** — admin sets up QR codes and account details in settings; no Xendit, no PayMongo
- Patient pays on their own app, submits proof, admin verifies manually
- Unpaid Pay at Clinic bookings tracked via `PaymentStatus = Unpaid` and flagged on Admin dashboard

---

## MEDICAL RECORDS SYSTEM

### Patient Profile
Each patient has a profile showing:
- Personal information
- Allergy alerts (displayed prominently with a warning badge)
- Active diagnoses and known conditions
- Visit history (all past consultations)
- Active prescriptions
- Upcoming appointments
- Attached documents (lab results, X-rays, referral letters, etc.)
- Vaccination history

### Consultation Records
- Each patient visit creates a Consultation Record, linked to the booking
- A consultation record contains:
  - Date and time, attending doctor
  - Chief complaint
  - History of present illness (HPI)
  - Vital signs: BP, HR, RR, temperature, O2 sat, weight, height, BMI (auto-computed)
  - Physical examination findings by system: General, HEENT, Chest, Abdomen, Extremities, Neurological
  - Assessment / Diagnosis (ICD-10 coded or free text)
  - Plan (treatment, advice, referrals)
  - Follow-up date
- Consultation records **lock after 24 hours** — edits after that are tracked as amendments
- Amendment log records: field name, old value, new value, who changed it, when, reason

### Prescriptions
- Doctor creates a prescription per consultation (or standalone)
- Contains: prescription date, patient details (auto-filled), medication list, doctor license/PTR/S2 numbers, digital signature placeholder
- Each medication line: generic name, brand name (optional), dosage form, strength, quantity, sig/instructions
- Prescription status: Active, Filled, Expired (auto after 30 days), Cancelled
- Only the prescribing doctor or Admin can cancel
- Downloadable as branded PDF

### Diagnoses & ICD-10 Coding
- Doctors add diagnoses per consultation via ICD-10 lookup (searchable, seeded in DB)
- Each diagnosis: ICD-10 code, description, type (Primary / Secondary / Comorbidity)
- Active diagnoses shown on the patient profile

### Allergy & Medication Alert
- Staff or Doctor adds allergy entries per patient
- Each allergy: allergen name, type (Drug / Food / Environmental / Other), severity (Mild / Moderate / Severe), reaction description
- When a doctor prescribes a drug matching an allergy → system shows a **warning** (not a hard block)

### Lab Results & Attachments
- Staff or Doctor attaches lab results or documents to a patient record
- Each attachment: type (CBC / Urinalysis / X-Ray / ECG / Ultrasound / Other), date taken, remarks, file upload (image or PDF)
- Doctor can add interpretation notes per result
- Files stored via Cloudinary
- Visible to patient via the patient portal

### Vaccination Records
- Staff logs vaccinations given at the clinic
- Each entry: vaccine name, brand, dose number, lot number, date given, administered by, next dose date
- System sends reminder to patient when next dose date is approaching (if enabled in ClinicSettings)

### Vital Signs Tracking
- Each consultation logs vital signs
- Vitals are viewable as a trend chart per patient over time (BP trend, weight trend, etc.)

---

## ACCESS CONTROL

### Booking Module
| Action | Admin | Staff | Doctor | Patient |
|---|---|---|---|---|
| View all bookings | ✅ | ✅ | ✅ (own patients) | ✅ (own only) |
| Create booking (online flow) | ✅ | ✅ | ❌ | ✅ |
| Create walk-in booking | ✅ | ✅ | ❌ | ❌ |
| Register walk-in patient (guest/full) | ✅ | ✅ | ❌ | ❌ |
| Override payment mode per booking | ✅ | ✅ | ❌ | ❌ |
| Mark PaymentStatus as Paid | ✅ | ✅ | ❌ | ❌ |
| Confirm / reject booking | ✅ | ✅ | ❌ | ❌ |
| Cancel booking | ✅ | ✅ | ❌ | ✅ (own, within deadline) |
| Mark complete / no show | ✅ | ✅ | ✅ | ❌ |
| Set doctor running late flag | ✅ | ✅ | ❌ | ❌ |
| View unpaid completed bookings report | ✅ | ✅ | ❌ | ❌ |
| Manage payment settings | ✅ | ❌ | ❌ | ❌ |
| Submit payment proof | ❌ | ❌ | ❌ | ✅ (own) |
| Download payment receipt | ✅ | ✅ | ❌ | ✅ (own) |

### Medical Records Module
| Action | Admin | Doctor | Staff | Patient |
|---|---|---|---|---|
| View patient list | ✅ | ✅ (own patients only) | ✅ | ❌ |
| View patient profile | ✅ | ✅ (own patients) | ✅ | ✅ (own only) |
| Create consultation | ✅ | ✅ | ❌ | ❌ |
| Edit consultation (within 24 hrs) | ✅ | ✅ (own) | ❌ | ❌ |
| Amend consultation (after 24 hrs) | ✅ | ✅ (own, logged) | ❌ | ❌ |
| Create prescription | ✅ | ✅ | ❌ | ❌ |
| Attach lab result | ✅ | ✅ | ✅ | ❌ |
| Log vaccination | ✅ | ✅ | ✅ | ❌ |
| Add allergy | ✅ | ✅ | ✅ | ❌ |
| Generate PDF documents | ✅ | ✅ | ✅ | ❌ |
| Download own prescriptions (PDF) | ❌ | ❌ | ❌ | ✅ |
| Download own visit summaries | ❌ | ❌ | ❌ | ✅ |
| Delete any record | ✅ | ❌ | ❌ | ❌ |
| View audit log | ✅ | ❌ | ❌ | ❌ |

### Reviews Module
| Action | Admin | Doctor | Staff | Patient |
|---|---|---|---|---|
| View reviews (public) | ✅ | ✅ | ✅ | ✅ |
| Submit review | ❌ | ❌ | ❌ | ✅ (Completed booking only, one per visit) |
| Edit own review | ❌ | ❌ | ❌ | ✅ |
| Delete review | ✅ | ❌ | ❌ | ✅ (own) |

---

## AUDIT TRAIL

All create, update, and delete actions on medical records are logged:
- Who (user ID + name)
- What (entity type + entity ID)
- What changed (old value → new value as JSON)
- When (timestamp + IP address)
- Audit log is read-only, cannot be deleted
- Admin can filter by patient, user, or date range

---

## NOTIFICATIONS

Notifications are delivered via three channels simultaneously:
- **In-app** — bell icon / notification feed (written to Notifications table)
- **Email** — via SMTP
- **Push** — via Firebase FCM (free tier)

Delivery is fire-and-forget using `Task.Run`. The API never waits for delivery before responding. Failures are logged but not retried.

### Notification Triggers
| Event | Who Gets Notified |
|---|---|
| New booking created | Admin + Staff |
| Payment proof submitted | Admin + Staff |
| Booking confirmed | Patient (includes Queue Number) |
| Booking rejected / cancelled | Patient |
| Booking expired (10 min) | Patient |
| Booking on hold | Admin |
| Payment receipt generated | Patient (email with PDF attachment) |
| Appointment reminder (24 hrs before) | Patient (includes Queue Number) |
| Appointment reminder (1 hr before) | Patient (includes Queue Number) |
| Booking marked as No Show | Patient |
| Refund marked as processed | Patient |
| Visit summary generated (on completion) | Patient (email with PDF attachment) |
| Vaccination next dose approaching (7 days) | Patient |
| New staff account created | Staff (invite email with set-password link) |
| New doctor account created | Doctor (invite email with set-password link) |
| Doctor running late flag set | Portal banner only — no push/email |
| Completed booking with PaymentStatus = Unpaid | Admin + Staff (daily summary) |

---

## DASHBOARDS

### Admin / Staff Dashboard
- Total appointments today and this month
- Total revenue today and this month (PaymentStatus = Paid only)
- Pending payment verifications (awaiting action)
- On hold bookings (requires attention)
- Unpaid completed visits today (PaymentStatus = Unpaid, Status = Completed) — collection alert
- No show count today
- Today's appointment list (filterable by doctor, shows QueueNumber + PaymentStatus)
- Most booked doctor and most booked service
- Total patients registered / new this month
- Total consultations today and this month
- Active prescriptions count
- Upcoming vaccination reminders (next dose within 7 days)
- Booking calendar (monthly view, all doctors)
- Doctor running late flags (active today)

### Doctor Dashboard
- Today's appointments (queue number, time, patient name, service, status)
- Upcoming appointments this week
- Total patients seen this month
- Calendar view of own schedule

---

## DATABASE TABLES

### Users
- Id, FullName, Email, PasswordHash, Provider (Local/Google/Facebook), ProviderId
- Role (Admin / Staff / Doctor / Patient)
- AvatarUrl, IsEmailVerified, EmailVerificationToken
- PasswordResetToken, PasswordResetExpiresAt
- RefreshToken, RefreshTokenExpiresAt
- **FailedLoginAttempts** (int, default 0)
- **LockoutUntil** (datetime, nullable)
- **IsFirstLogin** (bool, default true — for Admin-created accounts; forces password change)
- **InviteToken** (string, nullable — set-password link for Admin-created accounts)
- **InviteTokenExpiresAt** (datetime, nullable)
- CreatedAt, UpdatedAt, IsDeleted, DeletedAt

### Doctors
- Id, UserId (FK → Users), FullName, Specialization, Bio
- ProfilePhotoUrl, ConsultationFee, SlotDurationMinutes, SlotCapacity
- DailyPatientLimit (int, nullable — null = no limit)
- LicenseNumber, PTRNumber, S2Number
- Status (Active / Inactive / OnLeave)
- CreatedAt, UpdatedAt, IsDeleted, DeletedAt

### Services
- Id, Name, Description, EstimatedDurationMinutes, Price
- CreatedAt, UpdatedAt, IsDeleted, DeletedAt

### DoctorServices (many-to-many)
- Id, DoctorId, ServiceId, CreatedAt

### DoctorSchedules
- Id, DoctorId, DayOfWeek (0–6), StartTime, EndTime, IsActive
- CreatedAt, UpdatedAt

### DoctorBlockedDates
- Id, DoctorId, BlockedDate, Reason, CreatedAt

### DoctorDayStatuses
- Id, DoctorId, StatusDate
- RunningLate (bool), EstimatedDelayMinutes (int, nullable)
- SetByUserId (FK → Users), CreatedAt, UpdatedAt
- One record per Doctor per Date

### Patients
- Id, PatientCode (auto-generated, e.g. PT-2025-00001)
- FirstName, MiddleName, LastName, DateOfBirth, Sex, CivilStatus
- Address, City, ZipCode, ContactNumber, Email
- EmergencyContactName, EmergencyContactNumber, EmergencyContactRelationship
- BloodType, PhilHealthNumber, HMOProvider, HMOCardNumber
- UserId (FK → Users, nullable — links to patient portal account)
- IsGuest (bool — true for quick walk-in registrations with minimal info)
- CreatedAt, UpdatedAt, IsDeleted, DeletedAt

### Announcements
- Id, Title, Body, ImageUrl, IsActive, CreatedAt, UpdatedAt

### Bookings
- Id, PatientId (FK → Patients), DoctorId, ServiceId
- AppointmentDate, SlotStartTime, SlotEndTime
- Status (Pending / ProofSubmitted / Confirmed / OnHold / Cancelled / Completed / Expired / NoShow)
- PaymentStatus (Unpaid / Paid / Waived / Refunded)
- PaymentMode (Online / PayAtClinic)
- QueueNumber (int — assigned on Confirmed, per doctor per day)
- IsWalkIn (bool)
- ReminderSent24hr (bool, default false)
- ReminderSent1hr (bool, default false)
- **ReceiptUrl** (string, nullable — URL of generated payment receipt PDF)
- TotalFee, ProofType (ReferenceNumber / Screenshot / null), ProofValue, ProofSubmittedAt
- CancellationReason, Notes
- RowVersion (concurrency token)
- CreatedAt, UpdatedAt, IsDeleted, DeletedAt

### Payments
- Id, BookingId, Amount, PaymentMethod (GCash / Maya / BankTransfer / PayAtClinic)
- ReferenceNumber, ProofImageUrl
- Status (Pending / Verified / Rejected / Refunded)
- **ORNumber** (string, nullable — e.g. OR-2025-00001, assigned on Verified/Paid)
- **ORSequence** (int — auto-incremented globally per clinic instance)
- VerifiedByUserId, VerifiedAt
- CreatedAt, UpdatedAt

### PaymentSettings
- Id, GCashQrImageUrl, GCashAccountName, GCashNumber
- MayaQrImageUrl, MayaAccountName, MayaNumber
- BankName, BankAccountName, BankAccountNumber
- IsPayAtClinicMode (bool)
- UpdatedAt

### Reviews
- Id, PatientId, DoctorId, BookingId (UNIQUE — enforces one review per visit), Rating (1–5), Comment
- CreatedAt, UpdatedAt, IsDeleted, DeletedAt

### Consultations
- Id, PatientId, DoctorId, BookingId (nullable)
- ConsultationDate, ConsultationTime
- ChiefComplaint, HistoryOfPresentIllness
- PEGeneralFindings, PEHEENTFindings, PEChestFindings, PEAbdomenFindings
- PEExtremitiesFindings, PENeurologicalFindings
- Assessment, Plan, FollowUpDate
- IsLocked (bool — true after 24 hrs)
- **VisitSummaryUrl** (string, nullable — URL of generated visit summary PDF)
- CreatedAt, UpdatedAt, IsDeleted, DeletedAt

### ConsultationAmendments
- Id, ConsultationId, FieldName, OldValue, NewValue
- AmendedByUserId, AmendedAt, Reason

### VitalSigns
- Id, ConsultationId, PatientId
- BloodPressureSystolic, BloodPressureDiastolic, HeartRate, RespiratoryRate
- Temperature, OxygenSaturation, Weight, Height, BMI (computed)
- CreatedAt

### Diagnoses
- Id, ConsultationId, PatientId
- ICD10Code, ICD10Description
- DiagnosisType (Primary / Secondary / Comorbidity)
- IsActive, ResolvedDate
- CreatedAt, UpdatedAt

### ICD10Codes (seeded lookup table)
- Id, Code, Description, Category

### Prescriptions
- Id, ConsultationId (nullable), PatientId, DoctorId
- PrescriptionDate, Status (Active / Filled / Expired / Cancelled), Notes
- CreatedAt, UpdatedAt, IsDeleted, DeletedAt

### PrescriptionItems
- Id, PrescriptionId
- GenericName, BrandName, DosageForm, Strength, Quantity, Sig
- IsControlledSubstance

### Allergies
- Id, PatientId
- AllergenName, AllergenType (Drug / Food / Environmental / Other)
- Severity (Mild / Moderate / Severe), ReactionDescription
- CreatedAt, UpdatedAt, IsDeleted, DeletedAt

### PatientAttachments
- Id, PatientId, ConsultationId (nullable)
- AttachmentType (CBC / Urinalysis / XRay / ECG / Ultrasound / ReferralLetter / MedCert / VisitSummary / PaymentReceipt / Other)
- FileName, FileUrl, MimeType, FileSizeBytes
- DateTaken, Remarks, InterpretationNotes, UploadedByUserId
- CreatedAt, UpdatedAt, IsDeleted, DeletedAt

### VaccinationRecords
- Id, PatientId, VaccineName, BrandName, DoseNumber, LotNumber
- DateAdministered, AdministeredByUserId, NextDoseDate, NextDoseReminderSent
- CreatedAt, UpdatedAt, IsDeleted, DeletedAt

### GeneratedDocuments
- Id, PatientId, ConsultationId (nullable), BookingId (nullable)
- DocumentType (Prescription / MedCert / Referral / VisitSummary / LabReport / PaymentReceipt)
- FileUrl, GeneratedByUserId, CreatedAt

### AuditLogs
- Id, EntityType, EntityId, Action (Create / Update / Delete)
- OldValues (JSON), NewValues (JSON)
- PerformedByUserId, PerformedByName, PerformedAt, IPAddress

### Notifications
- Id, UserId, Title, Message, IsRead, CreatedAt

### StaffAccounts
- Id, UserId, AddedByAdminId, IsActive, CreatedAt

### ClinicSettings
- Id, ClinicName, LogoUrl, PrimaryColor, SecondaryColor
- Address, Phone, Email, FacebookUrl, InstagramUrl, LicenseNumber
- CancellationDeadlineHours
- PatientPortalEnabled (bool)
- VaccinationReminderEnabled (bool)
- IsPayAtClinicMode (bool)
- PayAtClinicNoShowWindowMinutes (int, default 60)
- DocumentHeaderHtml, DocumentFooterHtml
- UpdatedAt

---

## API ENDPOINTS

### Auth
```
POST   /api/v1/auth/register
POST   /api/v1/auth/login
POST   /api/v1/auth/google
POST   /api/v1/auth/facebook
POST   /api/v1/auth/refresh
POST   /api/v1/auth/verify-email
POST   /api/v1/auth/forgot-password
POST   /api/v1/auth/reset-password
POST   /api/v1/auth/logout
POST   /api/v1/auth/set-password          — for Admin-created accounts (invite token)
POST   /api/v1/auth/resend-invite         — Admin only
```

### Doctors
```
GET    /api/v1/doctors                                      — public
GET    /api/v1/doctors/{id}                                — public
GET    /api/v1/doctors/{id}/availability                   — public
POST   /api/v1/doctors                                      — Admin
PUT    /api/v1/doctors/{id}                                — Admin
DELETE /api/v1/doctors/{id}                                — Admin
POST   /api/v1/doctors/{id}/schedule                       — Admin
PUT    /api/v1/doctors/{id}/schedule/{schedId}             — Admin
POST   /api/v1/doctors/{id}/blocked-dates                  — Admin
DELETE /api/v1/doctors/{id}/blocked-dates/{dateId}         — Admin
GET    /api/v1/doctors/{id}/day-status                     — Admin | Staff
PUT    /api/v1/doctors/{id}/day-status                     — Admin | Staff
```

### Services
```
GET    /api/v1/services                                     — public
POST   /api/v1/services                                     — Admin
PUT    /api/v1/services/{id}                               — Admin
DELETE /api/v1/services/{id}                               — Admin
```

### Bookings
```
GET    /api/v1/bookings                                     — Patient: own | Admin/Staff/Doctor: all
GET    /api/v1/bookings/{id}                               — Patient (own) | Admin | Staff | Doctor
POST   /api/v1/bookings                                     — Patient
POST   /api/v1/bookings/walk-in                            — Admin | Staff
POST   /api/v1/bookings/{id}/proof                         — Patient
PUT    /api/v1/bookings/{id}/confirm                       — Admin | Staff
PUT    /api/v1/bookings/{id}/reject                        — Admin | Staff
PUT    /api/v1/bookings/{id}/cancel                        — Patient (within deadline) | Admin | Staff
PUT    /api/v1/bookings/{id}/complete                      — Admin | Staff | Doctor
PUT    /api/v1/bookings/{id}/no-show                       — Admin | Staff
PUT    /api/v1/bookings/{id}/resolve-hold                  — Admin | Staff
PUT    /api/v1/bookings/{id}/refund                        — Admin
PUT    /api/v1/bookings/{id}/mark-paid                     — Admin | Staff
GET    /api/v1/bookings/unpaid-report                      — Admin | Staff
GET    /api/v1/bookings/{id}/receipt                       — Admin | Staff | Patient (own)
```

### Payments
```
GET    /api/v1/payments/settings                            — public
PUT    /api/v1/payments/settings                            — Admin
```

### Patients
```
GET    /api/v1/patients                                     — Admin | Staff | Doctor
GET    /api/v1/patients/{id}                               — Admin | Staff | Doctor | Patient (own)
POST   /api/v1/patients                                     — Admin | Staff
POST   /api/v1/patients/guest                              — Admin | Staff
PUT    /api/v1/patients/{id}                               — Admin | Staff
DELETE /api/v1/patients/{id}                               — Admin
GET    /api/v1/patients/{id}/timeline                      — Admin | Doctor | Staff
GET    /api/v1/patients/search?q=                          — Admin | Staff
PUT    /api/v1/patients/{id}/profile                       — Patient (own profile fields only)
```

### Consultations
```
GET    /api/v1/patients/{patientId}/consultations
GET    /api/v1/patients/{patientId}/consultations/{id}
POST   /api/v1/patients/{patientId}/consultations          — Doctor | Admin
PUT    /api/v1/patients/{patientId}/consultations/{id}    — Doctor (own, within 24 hrs) | Admin
POST   /api/v1/patients/{patientId}/consultations/{id}/amend — Doctor (own) | Admin
DELETE /api/v1/patients/{patientId}/consultations/{id}    — Admin
```

### Vital Signs
```
GET    /api/v1/patients/{patientId}/vitals                 — Admin | Doctor | Staff | Patient (own)
POST   /api/v1/patients/{patientId}/vitals                 — Doctor | Staff | Admin
```

### Diagnoses
```
GET    /api/v1/patients/{patientId}/diagnoses
POST   /api/v1/patients/{patientId}/diagnoses              — Doctor | Admin
PUT    /api/v1/patients/{patientId}/diagnoses/{id}        — Doctor | Admin
DELETE /api/v1/patients/{patientId}/diagnoses/{id}        — Admin
GET    /api/v1/icd10/search?q=                             — authenticated
```

### Prescriptions
```
GET    /api/v1/patients/{patientId}/prescriptions
GET    /api/v1/patients/{patientId}/prescriptions/{id}
POST   /api/v1/patients/{patientId}/prescriptions          — Doctor | Admin
PUT    /api/v1/patients/{patientId}/prescriptions/{id}/cancel — Doctor (own) | Admin
GET    /api/v1/patients/{patientId}/prescriptions/{id}/pdf — Doctor | Admin | Staff | Patient (own)
```

### Allergies
```
GET    /api/v1/patients/{patientId}/allergies
POST   /api/v1/patients/{patientId}/allergies              — Doctor | Staff | Admin
PUT    /api/v1/patients/{patientId}/allergies/{id}        — Doctor | Staff | Admin
DELETE /api/v1/patients/{patientId}/allergies/{id}        — Admin
```

### Attachments
```
GET    /api/v1/patients/{patientId}/attachments
POST   /api/v1/patients/{patientId}/attachments            — Doctor | Staff | Admin
PUT    /api/v1/patients/{patientId}/attachments/{id}      — Doctor | Staff | Admin
DELETE /api/v1/patients/{patientId}/attachments/{id}      — Admin
```

### Vaccinations
```
GET    /api/v1/patients/{patientId}/vaccinations
POST   /api/v1/patients/{patientId}/vaccinations           — Doctor | Staff | Admin
DELETE /api/v1/patients/{patientId}/vaccinations/{id}     — Admin
```

### Document Generation
```
POST   /api/v1/documents/prescription/{prescriptionId}    — Doctor | Admin | Staff
POST   /api/v1/documents/medical-certificate               — Doctor | Admin
POST   /api/v1/documents/referral-letter                   — Doctor | Admin
POST   /api/v1/documents/visit-summary/{consultationId}   — Doctor | Admin | Staff
POST   /api/v1/documents/receipt/{bookingId}               — System (auto) | Admin | Staff
```

### Reviews
```
GET    /api/v1/reviews/{doctorId}                          — public, paginated
POST   /api/v1/reviews                                      — Patient (Completed booking only)
PUT    /api/v1/reviews/{id}                                — Patient (own)
DELETE /api/v1/reviews/{id}                                — Patient (own) | Admin
```

### Announcements
```
GET    /api/v1/announcements                                — public
POST   /api/v1/announcements                               — Admin
PUT    /api/v1/announcements/{id}                          — Admin
DELETE /api/v1/announcements/{id}                          — Admin
```

### Notifications
```
GET    /api/v1/notifications                                — authenticated user
PUT    /api/v1/notifications/{id}/read                     — authenticated user
PUT    /api/v1/notifications/read-all                      — authenticated user
```

### Staff
```
GET    /api/v1/staff                                        — Admin
POST   /api/v1/staff                                        — Admin
PUT    /api/v1/staff/{id}                                  — Admin
DELETE /api/v1/staff/{id}                                  — Admin
POST   /api/v1/staff/{id}/resend-invite                    — Admin
```

### Audit Logs
```
GET    /api/v1/audit-logs                                   — Admin
```

### Dashboards
```
GET    /api/v1/admin/dashboard                              — Admin | Staff
GET    /api/v1/admin/bookings/calendar                     — Admin | Staff
GET    /api/v1/admin/reports/unpaid                        — Admin | Staff
GET    /api/v1/doctor/dashboard                            — Doctor
```

### Settings
```
GET    /api/v1/settings                                     — public
PUT    /api/v1/settings                                     — Admin
```

### Jobs (External Cron)
```
POST   /api/v1/jobs/run-reminders                          — X-Cron-Secret header only
```

---

## BOOKING CONCURRENCY SAFETY

- Booking creation → immediately set status to Pending and count toward slot occupancy AND daily count
- Slot availability queries exclude all non-Expired/Cancelled bookings
- Overlap detection runs inside a **serializable database transaction**
- EF Core `RowVersion` concurrency token on Bookings table
- If slot count >= SlotCapacity → return `409 Conflict`
- If daily count >= DailyPatientLimit (when not null) → return `409 Conflict`

---

## BACKGROUND JOBS (No Hangfire)

### Pattern 1 — Lazy Expiry (on query)
Shared `ResolveStaleBookings(doctorId, date)` method called at the top of any query returning booking or slot data.

| Condition | Action |
|---|---|
| Booking is `Pending` + `CreatedAt` older than 10 minutes | → set `Expired`, slot released |
| Booking is `ProofSubmitted` + `ProofSubmittedAt` older than 1 hour | → set `OnHold` |
| Booking is `Confirmed` + `PayAtClinic` + `PaymentStatus = Unpaid` + `SlotStartTime` past `PayAtClinicNoShowWindowMinutes` | → set `NoShow` |
| Consultation `IsLocked = false` + `CreatedAt` older than 24 hours | → set `IsLocked = true` on read |
| Prescription `Status = Active` + `PrescriptionDate` older than 30 days | → set `Expired` on read |

### Pattern 2 — External Cron (cron-job.org)
```
POST /api/v1/jobs/run-reminders
Header: X-Cron-Secret: {secret}
Schedule: every 30 minutes
```
- Sends 24hr appointment reminders (`ReminderSent24hr = false`)
- Sends 1hr appointment reminders (`ReminderSent1hr = false`)
- Sends vaccination reminders (NextDoseDate within 7 days, `NextDoseReminderSent = false`)
- Sends daily unpaid summary to Admin + Staff

### Pattern 3 — Fire-and-Forget (Task.Run)
```csharp
_ = _notificationService.SendAsync(notification)
      .ContinueWith(t => _logger.LogError(t.Exception, "Notification failed"),
                    TaskContinuationOptions.OnlyOnFaulted);
```
API returns `200 OK` immediately. Failures are logged, not retried.

---

## SECURITY

- JWT access tokens (15 min) + refresh tokens (7 days, hashed in DB)
- BCrypt password hashing (work factor 12)
- HTTPS enforced
- Rate limiting on auth endpoints
- Account lockout: 5 failed attempts → 5-minute lockout
- EF Core parameterized queries only (no raw string SQL)
- Global exception middleware — never expose stack traces to client
- Sensitive fields (tokens, hashes) never returned in API responses
- FluentValidation on all endpoints
- All access to patient medical records logged in AuditLogs
- Doctor cross-access automatic based on consultation history
- File uploads validated by MIME type and size before storing to Cloudinary

---

## CLEAN ARCHITECTURE LAYERS

```
ClinicSystem.Domain/          — Entities, Enums, Domain Events
ClinicSystem.Application/     — Use Cases (MediatR Commands/Queries), DTOs, Interfaces, Validators
ClinicSystem.Infrastructure/  — Email, Push, File Storage, OAuth, PDF Generation
ClinicSystem.Persistence/     — EF Core DbContext, Repositories, Migrations, Seeders
ClinicSystem.API/             — Controllers, Middleware, DI Registration, Program.cs
```

---

## SEED DATA

### Accounts
- Admin: admin@clinic.ph / Admin@123456
- Staff: staff@clinic.ph / Staff@123456
- Doctors: dr.santos@clinic.ph, dr.reyes@clinic.ph, dr.cruz@clinic.ph / Doctor@123456
- Patient: patient@clinic.ph / Patient@123456

### Sample Doctors
1. Dr. Maria Santos — General Practitioner — ₱500 — Mon–Fri 8AM–5PM — 30-min slots — SlotCapacity 1 — DailyPatientLimit 10
2. Dr. Jose Reyes — Pediatrics — ₱600 — Mon/Wed/Fri 9AM–4PM — 30-min slots — SlotCapacity 1 — DailyPatientLimit 8
3. Dr. Ana Cruz — OB-Gynecology — ₱700 — Tue/Thu 8AM–3PM — 30-min slots — SlotCapacity 1 — DailyPatientLimit 8

### Sample Services
1. General Consultation — ₱500 — 30 min
2. Pediatric Checkup — ₱600 — 30 min
3. Prenatal Checkup — ₱700 — 30 min
4. Annual Physical Exam — ₱1,500 — 60 min
5. Wound Dressing — ₱200 — 15 min

### Sample Patients (5)
PT-2025-00001 through PT-2025-00005 — IsGuest: false

### Sample Records Per Patient
- 2–3 past consultations with vital signs, diagnoses, and prescriptions
- 1–2 lab result attachments (placeholder files)
- 1 allergy entry
- 2 completed bookings per doctor (PaymentStatus = Paid, QueueNumber assigned, **ORNumber assigned e.g. OR-2025-00001**)
- 1 walk-in booking with PaymentStatus = Unpaid (demonstrates collection alert)
- 1 review per doctor
- Payment Receipt PDF generated for all Paid bookings
- Visit Summary PDF generated for all Completed bookings

### ICD-10 Codes
- 500 common codes for General Practice, Pediatrics, and OB-Gyn

---

## WHAT IS NOT IN SCOPE

- Mobile app (web only)
- Automatic payment verification (GCash/Maya API)
- SMS notifications
- Telemedicine / video consultation
- Recurring / standing appointments
- Waitlist for fully booked slots
- Online refund processing
- PhilHealth electronic claims (eClaims API)
- Real digital signatures / PKI
- DICOM imaging / radiology viewer
- Inventory management
- Billing and invoicing module
- Insurance claims processing
- HIS integration
