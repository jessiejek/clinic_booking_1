# PHASE 5 — BE_PROMPT.md
## Medical Records: Patients, Consultations, Vital Signs, Diagnoses, ICD-10, Amendments

---

## CONTEXT

Phase 5 implements the core EMR features: full patient profiles, consultation records, vital signs, diagnoses with ICD-10 coding, consultation locking (24hr), and the amendment log. This is the most data-intensive phase.

---

## REFERENCE DOCUMENTS
- `PROJECT.md` — Medical Records System section, access control table for medical records, DB schema for all medical record tables
- `BE_TECH_STACK.md` — lazy expiry pattern (consultation lock), EF Core conventions, audit trail

---

## DATABASE TABLES

All tables should already have migrations scaffolded. Verify these exist and are correctly configured:

### Consultations
```
- Id, PatientId (FK), DoctorId (FK), BookingId (FK, nullable)
- ConsultationDate (DateTime), ConsultationTime (TimeSpan)
- ChiefComplaint (max 1000), HistoryOfPresentIllness (max 5000, nullable)
- PEGeneralFindings (max 2000, nullable)
- PEHEENTFindings (max 2000, nullable)
- PEChestFindings (max 2000, nullable)
- PEAbdomenFindings (max 2000, nullable)
- PEExtremitiesFindings (max 2000, nullable)
- PENeurologicalFindings (max 2000, nullable)
- Assessment (max 2000, nullable)
- Plan (max 2000, nullable)
- FollowUpDate (DateTime, nullable)
- IsLocked (bool, default false)
- VisitSummaryUrl (string, nullable)
- CreatedAt, UpdatedAt, IsDeleted, DeletedAt
```

### ConsultationAmendments
```
- Id, ConsultationId (FK)
- FieldName (max 100)
- OldValue (max 5000, nullable)
- NewValue (max 5000, nullable)
- AmendedByUserId (FK → Users)
- AmendedAt (DateTime)
- Reason (max 1000)
```

### VitalSigns
```
- Id, ConsultationId (FK), PatientId (FK)
- BloodPressureSystolic (int, nullable)
- BloodPressureDiastolic (int, nullable)
- HeartRate (int, nullable)
- RespiratoryRate (int, nullable)
- Temperature (decimal 4,1, nullable)
- OxygenSaturation (int, nullable)
- Weight (decimal 5,2, nullable — kg)
- Height (decimal 5,2, nullable — cm)
- BMI (decimal 5,2, nullable — computed)
- CreatedAt
```

### Diagnoses
```
- Id, ConsultationId (FK), PatientId (FK)
- ICD10Code (max 20), ICD10Description (max 500)
- DiagnosisType (enum: Primary / Secondary / Comorbidity)
- IsActive (bool, default true)
- ResolvedDate (DateTime, nullable)
- CreatedAt, UpdatedAt
```

### ICD10Codes (lookup table, seeded)
```
- Id, Code (max 20, indexed), Description (max 500), Category (max 200)
```

### Allergies
```
- Id, PatientId (FK)
- AllergenName (max 200)
- AllergenType (enum: Drug / Food / Environmental / Other)
- Severity (enum: Mild / Moderate / Severe)
- ReactionDescription (max 1000, nullable)
- CreatedAt, UpdatedAt, IsDeleted, DeletedAt
```

---

## CONSULTATION LOCKING — LAZY EXPIRY

Apply lazy lock check on every consultation read:

```csharp
private void ApplyConsultationLock(Consultation consultation)
{
    if (!consultation.IsLocked &&
        consultation.CreatedAt < DateTime.UtcNow.AddHours(-24))
    {
        consultation.IsLocked = true;
        // save changes after
    }
}
```

Called in `GetConsultationByIdQueryHandler` before returning data. If IsLocked changes, save.

---

## DOCTOR ACCESS FILTER

Doctor cross-access is automatic based on consultation history:
```csharp
// When a Doctor queries patients or consultations:
// Return only patients where a Consultation with this DoctorId exists
var accessiblePatientIds = await _context.Consultations
    .Where(c => c.DoctorId == currentDoctorId && !c.IsDeleted)
    .Select(c => c.PatientId)
    .Distinct()
    .ToListAsync();
```

Apply this filter inside query handlers whenever `currentUser.Role == Doctor`.

---

## APPLICATION LAYER — USE CASES

### Patient Queries/Commands

**GetPatientTimelineQuery** (Admin | Staff | Doctor — filtered)
- Returns full patient timeline: consultations, bookings, diagnoses, prescriptions, attachments, vaccinations
- Ordered by date descending
- Doctor: filtered to accessible patients only

**GetPatientAllergiesQuery** (Admin | Staff | Doctor | Patient — own)
- Returns all non-deleted allergies for a patient

### Consultations

**GetConsultationsQuery** (Admin | Staff | Doctor — filtered)
- Returns list of consultations for a patient
- Doctor: only if patient is accessible to that doctor
- Apply lazy lock on each consultation before returning

**GetConsultationByIdQuery** (Admin | Staff | Doctor — filtered)
- Apply lazy lock, save if changed
- Returns full consultation with: vital signs, diagnoses, amendments log (for Admin/Doctor only)

**CreateConsultationCommand** (Doctor | Admin)
- Input: PatientId, BookingId (optional), ConsultationDate, ConsultationTime, ChiefComplaint, HPI, PE findings, Assessment, Plan, FollowUpDate
- VitalSigns are included in the same command (optional)
- If VitalSigns provided: compute BMI automatically → `weight / (heightM * heightM)`
- Create Consultation + VitalSigns in same transaction
- If BookingId provided: link to booking
- Return: ConsultationId

**UpdateConsultationCommand** (Doctor — own, within 24hrs | Admin)
- Validate: IsLocked must be false (apply lazy lock check before validating)
- If locked: throw `ForbiddenException("Consultation is locked. Use amendment instead.")`
- Update fields directly (no amendment log — within 24hr window)

**AmendConsultationCommand** (Doctor — own | Admin)
- Can only amend locked consultations
- Input: ConsultationId, FieldName, NewValue, Reason
- Read current field value → store as OldValue
- Update the field on the Consultation entity
- Create ConsultationAmendment record
- Log to AuditLog

**GetAmendmentsQuery** (Doctor — own | Admin)
- Returns amendment log for a consultation

### Vital Signs

**GetVitalSignsQuery** (Admin | Doctor | Staff | Patient — own)
- Returns all vital sign records for a patient ordered by date
- Includes BMI computed values

**CreateVitalSignsCommand** (Doctor | Staff | Admin)
- Input: PatientId, ConsultationId, all vitals fields
- Compute BMI if Weight and Height provided: `BMI = weight / ((height/100) ^ 2)`
- Round BMI to 1 decimal

### Diagnoses

**GetDiagnosesQuery** (Admin | Doctor | Staff | Patient — own)
- Returns all diagnoses for a patient
- Active diagnoses first

**CreateDiagnosisCommand** (Doctor | Admin)
- Input: ConsultationId, PatientId, ICD10Code, ICD10Description, DiagnosisType
- ICD10Code can be from lookup or free-text (ICD10Description required if free-text)

**UpdateDiagnosisCommand** (Doctor — own | Admin)
- Can update: DiagnosisType, IsActive, ResolvedDate

**DeleteDiagnosisCommand** (Admin only)
- Hard delete (diagnosis records should not be soft-deleted in most EMR systems, but this is Admin-only)

**SearchICD10Query** (authenticated)
- Input: query string (min 2 chars)
- Search ICD10Codes by Code (starts with) OR Description (contains)
- Returns top 20 matches

### Allergies

**GetAllergiesQuery** (Admin | Doctor | Staff | Patient — own)
**CreateAllergyCommand** (Doctor | Staff | Admin)
**UpdateAllergyCommand** (Doctor | Staff | Admin)
**DeleteAllergyCommand** (Admin)

### Allergy Drug Warning

When a prescription item is being created (Phase 6), check allergies:
- Query patient allergies where AllergenType = Drug
- Compare PrescriptionItem.GenericName (case-insensitive) against AllergenName
- If match found: return a `warnings` array in the response (not a hard block)

Create `IAllergyWarningService` in Application layer:
```csharp
Task<List<string>> CheckDrugAllergiesAsync(Guid patientId, List<string> drugNames);
```

---

## API ENDPOINTS

```
GET    /api/v1/patients/{id}/timeline                           — Admin | Staff | Doctor (filtered)
GET    /api/v1/patients/{patientId}/consultations               — Admin | Staff | Doctor (filtered)
GET    /api/v1/patients/{patientId}/consultations/{id}         — Admin | Staff | Doctor (filtered)
POST   /api/v1/patients/{patientId}/consultations              — Doctor | Admin
PUT    /api/v1/patients/{patientId}/consultations/{id}        — Doctor (own, unlocked) | Admin
POST   /api/v1/patients/{patientId}/consultations/{id}/amend  — Doctor (own) | Admin
GET    /api/v1/patients/{patientId}/consultations/{id}/amendments — Doctor (own) | Admin
DELETE /api/v1/patients/{patientId}/consultations/{id}        — Admin

GET    /api/v1/patients/{patientId}/vitals                     — Admin | Doctor | Staff | Patient (own)
POST   /api/v1/patients/{patientId}/vitals                     — Doctor | Staff | Admin

GET    /api/v1/patients/{patientId}/diagnoses                  — Admin | Doctor | Staff | Patient (own)
POST   /api/v1/patients/{patientId}/diagnoses                  — Doctor | Admin
PUT    /api/v1/patients/{patientId}/diagnoses/{id}            — Doctor | Admin
DELETE /api/v1/patients/{patientId}/diagnoses/{id}            — Admin

GET    /api/v1/icd10/search?q=                                 — authenticated

GET    /api/v1/patients/{patientId}/allergies                  — Admin | Doctor | Staff | Patient (own)
POST   /api/v1/patients/{patientId}/allergies                  — Doctor | Staff | Admin
PUT    /api/v1/patients/{patientId}/allergies/{id}            — Doctor | Staff | Admin
DELETE /api/v1/patients/{patientId}/allergies/{id}            — Admin
```

---

## AUDIT TRAIL

All create, update, delete on Consultations, Diagnoses, Allergies must log to `AuditLogs`:
```csharp
await _auditService.LogAsync(new AuditEntry
{
    EntityType = "Consultation",
    EntityId = consultation.Id.ToString(),
    Action = AuditAction.Update,
    OldValues = JsonSerializer.Serialize(oldValues),
    NewValues = JsonSerializer.Serialize(newValues),
    PerformedByUserId = currentUserId,
    PerformedByName = currentUserName,
    IPAddress = httpContext.Connection.RemoteIpAddress?.ToString()
});
```

---

## SEED DATA TO ADD

For each of the 5 sample patients, seed:
- 2–3 consultations with attending doctors from the seeded doctor set
- Vital signs per consultation (BP, HR, temp, weight, height, BMI)
- 1–2 active diagnoses per patient (use seeded ICD-10 codes)
- 1 allergy per patient (e.g. Penicillin — Drug — Severe)

ICD-10 Seed: include 500 common codes covering General Practice, Pediatrics, and OB-Gyn. Source from standard ICD-10-CM list. At minimum seed these categories:
- J00–J99 (Respiratory)
- K00–K95 (Digestive)
- M00–M99 (Musculoskeletal)
- O00–O9A (Pregnancy)
- P00–P96 (Perinatal)
- Z00–Z99 (Health status encounters)

---

## TASK

Implement the full medical records backend on top of Phases 1–4.

Result must:
1. `POST /api/v1/patients/{patientId}/consultations` creates a consultation with vitals in one request
2. BMI auto-computed correctly: weight 70kg, height 170cm → BMI 24.2
3. Consultation editable within 24hrs; after 24hrs returns 403 with LOCKED message
4. `POST /api/v1/patients/{patientId}/consultations/{id}/amend` creates amendment log entry
5. Doctor can only see patients they have consulted (cross-access filter works)
6. `GET /api/v1/icd10/search?q=fever` returns matching ICD-10 codes
7. Allergy warnings returned when drug name matches patient allergy
8. Audit log entries created for all medical record modifications
9. `GET /api/v1/patients/{patientId}/timeline` returns full patient history in chronological order
10. Staff can view and create vitals but cannot create consultations or diagnoses
