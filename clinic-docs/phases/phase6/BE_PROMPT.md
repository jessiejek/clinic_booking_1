# PHASE 6 — BE_PROMPT.md
## Prescriptions, Lab Attachments, Vaccinations

---

## CONTEXT

Phase 6 implements prescriptions (with allergy warnings and PDF export), lab result attachments (Cloudinary uploads), and vaccination records with reminder flags. These complete the core EMR feature set.

---

## REFERENCE DOCUMENTS
- `PROJECT.md` — Prescriptions section, allergy drug warning logic, PatientAttachments, VaccinationRecords, DB schema
- `BE_TECH_STACK.md` — Cloudinary upload, QuestPDF (prescription document already built in Phase 4)

---

## DATABASE TABLES

### Prescriptions
```
- Id, ConsultationId (FK, nullable), PatientId (FK), DoctorId (FK)
- PrescriptionDate (DateTime)
- Status (enum: Active / Filled / Expired / Cancelled)
- Notes (max 2000, nullable)
- CreatedAt, UpdatedAt, IsDeleted, DeletedAt
```

### PrescriptionItems
```
- Id, PrescriptionId (FK)
- GenericName (max 200), BrandName (max 200, nullable)
- DosageForm (max 100), Strength (max 100), Quantity (int), Sig (max 500)
- IsControlledSubstance (bool, default false)
```

### PatientAttachments
```
- Id, PatientId (FK), ConsultationId (FK, nullable)
- AttachmentType (enum: CBC/Urinalysis/XRay/ECG/Ultrasound/ReferralLetter/MedCert/VisitSummary/PaymentReceipt/Other)
- FileName (max 300), FileUrl (max 1000), MimeType (max 100), FileSizeBytes (long)
- DateTaken (DateTime, nullable), Remarks (max 1000, nullable)
- InterpretationNotes (max 2000, nullable)
- UploadedByUserId (FK → Users)
- CreatedAt, UpdatedAt, IsDeleted, DeletedAt
```

### VaccinationRecords
```
- Id, PatientId (FK)
- VaccineName (max 200), BrandName (max 200, nullable)
- DoseNumber (int), LotNumber (max 100, nullable)
- DateAdministered (DateTime)
- AdministeredByUserId (FK → Users)
- NextDoseDate (DateTime, nullable)
- NextDoseReminderSent (bool, default false)
- CreatedAt, UpdatedAt, IsDeleted, DeletedAt
```

---

## APPLICATION LAYER — USE CASES

### Prescriptions

**GetPrescriptionsQuery** (Admin | Doctor | Staff | Patient — own)
- Returns all non-deleted prescriptions for a patient
- Ordered by PrescriptionDate desc
- Apply lazy expiry: Active prescriptions older than 30 days → set Status = Expired on read

**GetPrescriptionByIdQuery**
- Returns prescription with all PrescriptionItems

**CreatePrescriptionCommand** (Doctor | Admin)
- Input: PatientId, ConsultationId (optional), PrescriptionDate, Notes, Items[]
- Each item: GenericName, BrandName, DosageForm, Strength, Quantity, Sig, IsControlledSubstance
- After creation: run allergy check via `IAllergyWarningService`
  - Check each item's GenericName against patient's Drug allergies
  - Return `warnings: string[]` in response (not a hard block)
- Return: PrescriptionId, warnings[]

**CancelPrescriptionCommand** (Doctor — own | Admin)
- Sets Status = Cancelled
- Validates: only Doctor who wrote it, or Admin

**GetPrescriptionPdfQuery** (Doctor | Admin | Staff | Patient — own)
- Generates prescription PDF via `PrescriptionDocument` (Phase 4)
- Uploads to Cloudinary if not already generated
- Returns: pdfUrl

### Prescription Lazy Expiry

```csharp
private void ApplyPrescriptionExpiry(Prescription prescription)
{
    if (prescription.Status == PrescriptionStatus.Active &&
        prescription.PrescriptionDate < DateTime.UtcNow.AddDays(-30))
    {
        prescription.Status = PrescriptionStatus.Expired;
    }
}
```

Called on each prescription before returning in `GetPrescriptionsQuery`.

### Lab Attachments

**GetAttachmentsQuery** (Admin | Doctor | Staff | Patient — own)
- Returns all non-deleted attachments for a patient
- Optionally filter by ConsultationId

**UploadAttachmentCommand** (Doctor | Staff | Admin)
- Input: PatientId, ConsultationId (optional), AttachmentType, DateTaken, Remarks, File
- Validate file: allowed MIME types (image/jpeg, image/png, application/pdf), max 10MB
- Upload file to Cloudinary: `/clinic-docs/{patientId}/attachments/{filename}`
- Store attachment record
- Return: AttachmentId, FileUrl

**UpdateAttachmentCommand** (Doctor | Staff | Admin)
- Updates: Remarks, InterpretationNotes, DateTaken

**DeleteAttachmentCommand** (Admin)
- Soft delete + delete from Cloudinary (optional — keep file for audit)

### Vaccinations

**GetVaccinationsQuery** (Admin | Doctor | Staff | Patient — own)
- Returns all non-deleted vaccination records for a patient
- Ordered by DateAdministered desc

**CreateVaccinationCommand** (Doctor | Staff | Admin)
- Input: PatientId, VaccineName, BrandName, DoseNumber, LotNumber, DateAdministered, NextDoseDate
- Sets AdministeredByUserId from JWT claims
- Sets NextDoseReminderSent = false
- Return: VaccinationId

**DeleteVaccinationCommand** (Admin)
- Soft delete

---

## VACCINATION REMINDER (Cron Job Integration)

In the existing `run-reminders` cron endpoint, add:

```csharp
// Find vaccinations due within 7 days where reminder not yet sent
var upcoming = await _context.VaccinationRecords
    .Where(v => !v.IsDeleted
             && !v.NextDoseReminderSent
             && v.NextDoseDate.HasValue
             && v.NextDoseDate.Value.Date <= DateTime.UtcNow.AddDays(7).Date
             && v.NextDoseDate.Value.Date >= DateTime.UtcNow.Date)
    .Include(v => v.Patient)
    .ToListAsync();

foreach (var vaccination in upcoming)
{
    // Send notification to patient
    _ = _notificationService.SendAsync(new NotificationRequest { ... });
    vaccination.NextDoseReminderSent = true;
}

await _context.SaveChangesAsync();
```

---

## CLOUDINARY UPLOAD — FILE VALIDATION

```csharp
private static readonly string[] AllowedMimeTypes = 
{
    "image/jpeg", "image/png", "application/pdf"
};
private const long MaxFileSizeBytes = 10 * 1024 * 1024; // 10MB

public void ValidateFile(IFormFile file)
{
    if (!AllowedMimeTypes.Contains(file.ContentType))
        throw new ValidationException("File type not allowed. Only JPEG, PNG, and PDF are accepted.");

    if (file.Length > MaxFileSizeBytes)
        throw new ValidationException("File size exceeds the 10MB limit.");
}
```

---

## API ENDPOINTS

```
GET    /api/v1/patients/{patientId}/prescriptions              — Admin | Doctor | Staff | Patient (own)
GET    /api/v1/patients/{patientId}/prescriptions/{id}        — Admin | Doctor | Staff | Patient (own)
POST   /api/v1/patients/{patientId}/prescriptions             — Doctor | Admin
PUT    /api/v1/patients/{patientId}/prescriptions/{id}/cancel — Doctor (own) | Admin
GET    /api/v1/patients/{patientId}/prescriptions/{id}/pdf    — Doctor | Admin | Staff | Patient (own)

GET    /api/v1/patients/{patientId}/attachments                — Admin | Doctor | Staff | Patient (own)
POST   /api/v1/patients/{patientId}/attachments               — Doctor | Staff | Admin  (multipart/form-data)
PUT    /api/v1/patients/{patientId}/attachments/{id}         — Doctor | Staff | Admin
DELETE /api/v1/patients/{patientId}/attachments/{id}         — Admin

GET    /api/v1/patients/{patientId}/vaccinations               — Admin | Doctor | Staff | Patient (own)
POST   /api/v1/patients/{patientId}/vaccinations              — Doctor | Staff | Admin
DELETE /api/v1/patients/{patientId}/vaccinations/{id}        — Admin
```

---

## SEED DATA TO ADD

For each of the 5 sample patients:
- 1–2 active prescriptions linked to seeded consultations (2–3 items each)
- 1 prescription PDF generated + URL stored
- 1–2 lab attachments (use placeholder Cloudinary URLs for seed)
- 1–2 vaccination records (e.g. Flu vaccine, Hepatitis B)
- 1 vaccination with NextDoseDate within 7 days (to test reminder trigger)

---

## TASK

Implement prescriptions, attachments, and vaccinations. Build on Phases 1–5.

Result must:
1. `POST /api/v1/patients/{patientId}/prescriptions` creates prescription and returns allergy warnings if drug matches patient allergy
2. Prescription with PrescriptionDate older than 30 days auto-expires to `Expired` status on next read
3. `GET /api/v1/patients/{patientId}/prescriptions/{id}/pdf` generates and returns prescription PDF URL
4. `POST /api/v1/patients/{patientId}/attachments` accepts multipart file upload, validates MIME type and size, uploads to Cloudinary
5. Files larger than 10MB return 400 with appropriate error
6. Non-allowed file types (e.g. .exe) return 400
7. Vaccination records created and listed correctly
8. Cron job `POST /api/v1/jobs/run-reminders` sends vaccination reminder for records with NextDoseDate within 7 days
9. `NextDoseReminderSent` set to true after reminder sent (prevents duplicate reminders)
10. Patient can access own prescriptions and attachments but cannot create them
