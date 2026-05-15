# PHASE 4 — BE_PROMPT.md
## Payment & Receipts: OR Numbers, Payment Receipt PDF, Visit Summary PDF, Document Generation

---

## CONTEXT

Phase 4 implements the receipt and document generation system. This includes OR number generation, Payment Receipt PDF (triggered on booking confirmation), Visit Summary PDF (triggered on booking completion), and the on-demand document generation endpoints (prescriptions, medical certificates, referral letters, lab reports).

The PDF generation infrastructure (QuestPDF) was installed in Phase 1. This phase implements it.

---

## REFERENCE DOCUMENTS
- `PROJECT.md` — Receipts & Document Generation section, GeneratedDocuments table, notification triggers
- `BE_TECH_STACK.md` — PDF Generation (QuestPDF), OR Number Generation, Cloudinary upload

---

## OR NUMBER GENERATION

OR Number format: `OR-{YEAR}-{SEQ:D5}` → `OR-2025-00001`

Atomic generation using a row-level lock on ClinicSettings:

```csharp
public async Task<(string orNumber, int orSequence)> GenerateORNumberAsync()
{
    // Use raw SQL with UPDLOCK + ROWLOCK for atomic increment
    var settings = await _context.ClinicSettings
        .FromSqlRaw("SELECT TOP 1 * FROM ClinicSettings WITH (UPDLOCK, ROWLOCK)")
        .FirstAsync();

    settings.ORSequence++;
    settings.UpdatedAt = DateTime.UtcNow;
    await _context.SaveChangesAsync();

    var orNumber = $"OR-{DateTime.UtcNow.Year}-{settings.ORSequence:D5}";
    return (orNumber, settings.ORSequence);
}
```

This must be called inside the `ConfirmBookingCommand` and `MarkPaidCommand` transactions.

---

## DATABASE TABLES (Updates from Phase 3)

`GeneratedDocuments` table — ensure these fields exist:
```
- Id (Guid)
- PatientId (FK → Patients)
- ConsultationId (FK → Consultations, nullable)
- BookingId (FK → Bookings, nullable)
- DocumentType (enum: Prescription / MedCert / Referral / VisitSummary / LabReport / PaymentReceipt)
- FileUrl (string)
- GeneratedByUserId (FK → Users, nullable — null for system-generated)
- CreatedAt
```

---

## INFRASTRUCTURE — PDF GENERATION

### Shared PDF Base

All PDFs use clinic branding from `ClinicSettings`. Create a shared `ClinicBrandingData` DTO:

```csharp
public class ClinicBrandingData
{
    public string ClinicName { get; set; }
    public string? LogoUrl { get; set; }
    public string Address { get; set; }
    public string Phone { get; set; }
    public string Email { get; set; }
    public string? DocumentHeaderHtml { get; set; }
    public string? DocumentFooterHtml { get; set; }
}
```

### Payment Receipt Document (`PaymentReceiptDocument.cs`)

Content:
- Clinic logo + name + address (header)
- Title: "OFFICIAL RECEIPT"
- OR Number (prominent, e.g. `OR-2025-00001`)
- Date issued
- Patient Name, Patient Code
- Doctor Name
- Service Name
- Appointment Date + Time
- Queue Number
- Payment Method
- Amount Paid (formatted as ₱X,XXX.XX)
- Footer: clinic contact info

### Visit Summary Document (`VisitSummaryDocument.cs`)

Content:
- Clinic logo + name + address (header)
- Title: "VISIT SUMMARY"
- Date of visit
- Patient Name, Date of Birth, Sex
- Attending Doctor
- Chief Complaint
- Diagnoses (ICD-10 code + description)
- Prescriptions given (generic name, dosage, instructions)
- Plan / Advice
- Follow-up date (if set)
- OR Number (if payment was made)
- Amount paid
- Footer: clinic contact info

### Prescription Document (`PrescriptionDocument.cs`)

Content:
- Clinic header
- Title: "PRESCRIPTION"
- Date
- Patient name, age, sex
- Rx section: each medication (generic name, brand, dosage form, strength, quantity, sig)
- ⚠️ Note for controlled substances
- Doctor name, license number, PTR number, S2 number
- Digital signature placeholder (box with "Signature over Printed Name")

### Medical Certificate Document (`MedCertDocument.cs`)

Content:
- Clinic header
- Title: "MEDICAL CERTIFICATE"
- Patient name, age, sex, address
- Certification text (template): "This is to certify that [Patient Name] was examined on [Date] and was found to have [Diagnosis/Condition]..."
- Purpose field (editable on generation)
- Doctor signature block

### Referral Letter Document (`ReferralLetterDocument.cs`)

Content:
- Clinic header
- Title: "REFERRAL LETTER"
- Date
- To: [Referred To Doctor/Clinic] (editable on generation)
- Patient name, age, clinical summary, reason for referral
- Doctor signature block

### PDF Upload to Cloudinary

After generating each PDF:
1. Generate to a `MemoryStream`
2. Upload to Cloudinary under folder `/clinic-docs/{patientId}/`
3. Return the secure URL
4. Save URL to `GeneratedDocuments` table
5. Also save to `PatientAttachments` table

---

## APPLICATION LAYER — USE CASES

### GeneratePaymentReceiptCommand (System / Admin | Staff)
- Called internally by `ConfirmBookingCommand` and `MarkPaidCommand`
- Fetches booking, patient, doctor, service, payment (with ORNumber) from DB
- Fetches ClinicSettings for branding
- Generates PDF via `PaymentReceiptDocument`
- Uploads to Cloudinary
- Saves to `GeneratedDocuments` (DocumentType = PaymentReceipt, BookingId = bookingId)
- Saves to `PatientAttachments` (AttachmentType = PaymentReceipt)
- Updates `Bookings.ReceiptUrl` with the Cloudinary URL
- Sends email to patient with PDF attached (fire-and-forget via `IEmailService`)
- Returns: receiptUrl

### GenerateVisitSummaryCommand (System / Admin | Staff | Doctor)
- Called internally by `CompleteBookingCommand` (fire-and-forget)
- Also callable on demand via `POST /api/v1/documents/visit-summary/{consultationId}`
- Fetches consultation, patient, doctor, booking, diagnoses, prescriptions
- Generates PDF via `VisitSummaryDocument`
- Uploads to Cloudinary
- Saves to `GeneratedDocuments` (DocumentType = VisitSummary)
- Saves to `PatientAttachments`
- Updates `Consultations.VisitSummaryUrl`
- Sends email to patient with PDF attached (fire-and-forget)
- Returns: visitSummaryUrl

### GeneratePrescriptionPdfCommand (Doctor | Admin | Staff)
- Called via `GET /api/v1/patients/{patientId}/prescriptions/{id}/pdf`
- Generates PDF, uploads to Cloudinary
- Saves to `GeneratedDocuments`
- Returns: pdfUrl (for redirect/download)

### GenerateMedCertCommand (Doctor | Admin)
- Input: PatientId, ConsultationId (optional), Diagnosis, Purpose
- Generates PDF, uploads, saves to GeneratedDocuments + PatientAttachments
- Returns: pdfUrl

### GenerateReferralLetterCommand (Doctor | Admin)
- Input: PatientId, ConsultationId (optional), ReferredTo, ClinicalSummary, ReferralReason
- Generates PDF, uploads, saves
- Returns: pdfUrl

---

## API ENDPOINTS

```
POST   /api/v1/documents/receipt/{bookingId}               — Admin | Staff (manual regenerate)
POST   /api/v1/documents/visit-summary/{consultationId}    — Doctor | Admin | Staff
POST   /api/v1/documents/medical-certificate               — Doctor | Admin
POST   /api/v1/documents/referral-letter                   — Doctor | Admin
GET    /api/v1/patients/{patientId}/prescriptions/{id}/pdf — Doctor | Admin | Staff | Patient (own)
GET    /api/v1/bookings/{id}/receipt                       — Admin | Staff | Patient (own)
```

---

## NOTIFICATION TRIGGERS IN THIS PHASE

| Event | Action | Channel |
|---|---|---|
| Payment Receipt generated | Email patient with PDF attachment | Email |
| Visit Summary generated | Email patient with PDF attachment | Email |

---

## CLOUDINARY FOLDER STRUCTURE

```
/clinic-docs/{patientId}/receipts/OR-2025-00001.pdf
/clinic-docs/{patientId}/visit-summaries/{consultationId}.pdf
/clinic-docs/{patientId}/prescriptions/{prescriptionId}.pdf
/clinic-docs/{patientId}/medcerts/{id}.pdf
/clinic-docs/{patientId}/referrals/{id}.pdf
```

---

## TASK

Implement the full PDF generation system. Build on Phase 1 + 2 + 3.

Result must:
1. Confirming a booking (`PUT /api/v1/bookings/{id}/confirm`) triggers payment receipt PDF generation
2. Receipt uploaded to Cloudinary, URL stored in `Bookings.ReceiptUrl` and `Payments.ORNumber` set
3. Patient receives receipt email with PDF attached
4. Completing a booking (`PUT /api/v1/bookings/{id}/complete`) triggers visit summary PDF if consultation exists
5. `GET /api/v1/bookings/{id}/receipt` returns receipt URL for download
6. Prescription PDF endpoint generates branded prescription document
7. MedCert and Referral Letter endpoints work
8. All PDFs include clinic branding (name, logo, address) from ClinicSettings
9. OR Numbers are unique and correctly formatted (OR-2025-00001)
10. Concurrent receipt generation doesn't produce duplicate OR numbers
