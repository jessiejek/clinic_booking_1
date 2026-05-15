# PHASE 6 — FE_PROMPT.md
## Prescriptions, Lab Attachments, Vaccinations

---

## CONTEXT

Phase 6 implements the frontend for prescription writing, lab result attachments, and vaccination records. Doctors write prescriptions with allergy warning alerts. Staff and doctors can upload lab attachments. Staff logs vaccinations. All these appear on the patient detail page (Phase 5) as new tabs.

---

## REFERENCE DOCUMENTS
- `PROJECT.md` — Prescriptions section, allergy warning behavior, PatientAttachments, VaccinationRecords, access control
- `FE_TECH_STACK.md` — Angular 17 standalone, Signals, ApiService

---

## PAGES / COMPONENTS TO BUILD

Extend the Patient Detail page from Phase 5 with new tabs and modals:

```
features/doctor/patients/patient-detail/
└── components/
    ├── prescriptions-tab/
    │   ├── prescriptions-tab.component.ts
    │   ├── prescriptions-tab.component.html
    │   └── prescriptions-tab.component.scss
    ├── prescription-form-modal/
    │   ├── prescription-form-modal.component.ts
    │   ├── prescription-form-modal.component.html
    │   └── prescription-form-modal.component.scss
    ├── attachments-tab/
    │   ├── attachments-tab.component.ts
    │   ├── attachments-tab.component.html
    │   └── attachments-tab.component.scss
    ├── attachment-upload-modal/
    │   ├── attachment-upload-modal.component.ts
    │   ├── attachment-upload-modal.component.html
    │   └── attachment-upload-modal.component.scss
    ├── vaccinations-tab/
    │   ├── vaccinations-tab.component.ts
    │   ├── vaccinations-tab.component.html
    │   └── vaccinations-tab.component.scss
    └── vaccination-form-modal/
        ├── vaccination-form-modal.component.ts
        ├── vaccination-form-modal.component.html
        └── vaccination-form-modal.component.scss
```

---

## SERVICES (Angular)

```typescript
// features/medical/services/prescription.service.ts
getPrescriptions(patientId: string): Observable<Prescription[]>
getPrescriptionById(patientId: string, id: string): Observable<PrescriptionDetail>
createPrescription(patientId: string, payload: CreatePrescriptionRequest): Observable<CreatePrescriptionResult>
cancelPrescription(patientId: string, id: string): Observable<void>
getPrescriptionPdfUrl(patientId: string, id: string): Observable<{ url: string }>

// features/medical/services/attachment.service.ts
getAttachments(patientId: string, consultationId?: string): Observable<PatientAttachment[]>
uploadAttachment(patientId: string, formData: FormData): Observable<PatientAttachment>
updateAttachment(patientId: string, id: string, payload: UpdateAttachmentRequest): Observable<void>
deleteAttachment(patientId: string, id: string): Observable<void>

// features/medical/services/vaccination.service.ts
getVaccinations(patientId: string): Observable<VaccinationRecord[]>
createVaccination(patientId: string, payload: CreateVaccinationRequest): Observable<void>
deleteVaccination(patientId: string, id: string): Observable<void>
```

---

## MODELS

```typescript
export interface Prescription {
  id: string;
  prescriptionDate: string;
  status: 'Active' | 'Filled' | 'Expired' | 'Cancelled';
  doctorName: string;
  itemCount: number;
  consultationId: string | null;
}

export interface PrescriptionDetail extends Prescription {
  notes: string | null;
  items: PrescriptionItem[];
}

export interface PrescriptionItem {
  id: string;
  genericName: string;
  brandName: string | null;
  dosageForm: string;
  strength: string;
  quantity: number;
  sig: string;
  isControlledSubstance: boolean;
}

export interface CreatePrescriptionResult {
  prescriptionId: string;
  warnings: string[];
}

export interface PatientAttachment {
  id: string;
  attachmentType: AttachmentType;
  fileName: string;
  fileUrl: string;
  mimeType: string;
  fileSizeBytes: number;
  dateTaken: string | null;
  remarks: string | null;
  interpretationNotes: string | null;
  uploadedBy: string;
  createdAt: string;
}

export type AttachmentType = 'CBC' | 'Urinalysis' | 'XRay' | 'ECG' | 'Ultrasound' | 'ReferralLetter' | 'MedCert' | 'VisitSummary' | 'PaymentReceipt' | 'Other';

export interface VaccinationRecord {
  id: string;
  vaccineName: string;
  brandName: string | null;
  doseNumber: number;
  lotNumber: string | null;
  dateAdministered: string;
  administeredBy: string;
  nextDoseDate: string | null;
  nextDoseReminderSent: boolean;
}
```

---

## PATIENT DETAIL — NEW TABS

Add these tabs to the Phase 5 patient detail `ion-segment`:

**Tab 6 — Prescriptions**
**Tab 7 — Lab Results / Attachments**
**Tab 8 — Vaccinations**

---

## PRESCRIPTIONS TAB

Lists all prescriptions:
- Each card: date, status badge, doctor, item count
- Status badge: Active = success, Filled = primary, Expired = medium, Cancelled = danger
- Tap → expand to show items list OR navigate to prescription detail
- "Download PDF" button per prescription
- "Cancel" button (Doctor/Admin — own, Active only) with confirm alert
- FAB "Write Prescription" (Doctor/Admin only) → opens Prescription Form Modal

---

## PRESCRIPTION FORM MODAL

Multi-section form using `ion-list`:

**Header Section**
- Prescription Date (date picker, defaults today)
- Link to Consultation (optional select from patient's consultations)
- Notes (textarea, optional)

**Medications Section**
- Dynamic list of medication items
- "Add Medication" button adds a new row
- Each medication row:
  - Generic Name (required text input with real-time allergy check)
  - Brand Name (optional)
  - Dosage Form (select: Tablet / Capsule / Syrup / Injection / Cream / Drops / Inhaler / Patch / Other)
  - Strength (text: e.g. "500mg")
  - Quantity (number)
  - Sig / Instructions (textarea: e.g. "1 tablet 3x daily after meals")
  - Controlled Substance toggle
  - Delete row button

### Real-Time Allergy Warning

As the Doctor types in the Generic Name field:
- Debounce 400ms
- Compare typed value against loaded patient allergies (Drug type only — loaded when modal opens)
- If match found (case-insensitive, partial): show inline warning below the field:
  ```
  ⚠️ Patient has a known allergy to [AllergenName] (Severity: Severe)
  ```
  Use `ion-note` with `color="danger"`
- This is a warning, not a block — doctor can still submit

On form submit:
- If backend returns `warnings[]`: show a prominent `ion-alert` dialog before confirming save:
  ```
  ⚠️ Drug Allergy Warning
  The following medications may cause allergic reactions:
  • Amoxicillin — Patient is allergic to Penicillin (Severe)
  Proceed anyway?
  [Cancel]  [Proceed]
  ```
- Doctor must explicitly confirm to proceed

---

## ATTACHMENTS TAB

Grid or list view of all attachments:
- If image (JPEG/PNG): show thumbnail
- If PDF: show PDF icon
- Each item: type badge, filename, date taken, remarks
- Type badge colors: CBC = primary, XRay = secondary, ECG = tertiary, etc.
- Tap → opens full image in `ion-modal` or opens PDF in new tab
- "Add Notes" button: opens interpretation notes modal (Doctor)
- FAB "Upload" (Doctor/Staff/Admin) → opens Upload Modal

### Upload Attachment Modal

- Attachment Type select (CBC / Urinalysis / XRay / ECG / Ultrasound / Other)
- Date Taken (date picker, optional)
- Remarks (textarea, optional)
- File input:
  - Accept: image/jpeg, image/png, application/pdf
  - Max size: 10MB (validate client-side before upload)
  - Show file name and size preview after selection
  - Progress indicator during upload
- If file > 10MB: show error "File too large. Maximum size is 10MB." before attempting upload
- Upload progress: show `ion-progress-bar` during upload

### Interpretation Notes Modal (Doctor only)
- Read-only: attachment info
- Editable: Interpretation Notes (textarea)
- Save button

---

## VACCINATIONS TAB

List of vaccination records:
- Each item: vaccine name, brand, dose number, date given, given by
- If NextDoseDate set: show chip "Next dose: [date]"
- If NextDoseDate approaching (within 7 days): chip color = warning
- FAB "Add Vaccination" (Doctor/Staff/Admin) → opens Vaccination Form Modal
- Delete (Admin only) with confirm alert

### Vaccination Form Modal

Fields:
- Vaccine Name (required, text)
- Brand Name (optional)
- Dose Number (number, min 1)
- Lot Number (optional)
- Date Administered (required, date picker)
- Next Dose Date (optional, date picker)

On success: toast "Vaccination record added" + refresh list.

---

## PATIENT PORTAL — MY PRESCRIPTIONS PAGE (EXTEND)

Route: `/portal/my-prescriptions`

Built in placeholder in Phase 1 routing — now implement:

- List of all patient's prescriptions
- Each card: date, status badge, doctor, items summary
- Status badge with correct colors
- "Download PDF" button → calls `GET /api/v1/patients/{id}/prescriptions/{id}/pdf` → opens URL in new tab
- Only shows Active and Filled prescriptions prominently; Expired/Cancelled in collapsed section

---

## TASK

Build prescriptions, attachments, and vaccinations UI. Build on Phases 1–5.

Result must:
1. Doctor can create a prescription with multiple medication items
2. Real-time allergy warning appears inline as doctor types a drug name matching patient allergy
3. Backend allergy warning triggers a confirmation dialog before saving
4. Prescription PDF download button generates and opens PDF
5. Expired prescriptions (>30 days) show `Expired` badge automatically
6. Staff can upload a lab attachment (JPEG, PNG, or PDF)
7. File over 10MB is rejected client-side with error message
8. Uploaded images show thumbnails in the attachments tab
9. Vaccination records list with next dose date chips
10. Patient can download their own prescriptions from My Prescriptions page
