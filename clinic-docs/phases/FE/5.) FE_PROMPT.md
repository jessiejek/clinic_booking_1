# PHASE 5 — FE_PROMPT.md
## Medical Records: Patient Profile, Consultation Form, Vitals Charts, Diagnoses, Allergies

---

## CONTEXT

Phase 5 implements the frontend for medical records: the full patient profile view, consultation creation/editing form, vital signs entry and trend charts, diagnoses with ICD-10 search, allergy management, and amendment logging. Doctors and Staff access these screens. Patients see a read-only version via the portal (Phase 7).

---

## REFERENCE DOCUMENTS
- `PROJECT.md` — Medical Records System, access control table, consultation fields, amendment rules
- `FE_TECH_STACK.md` — Angular 17 standalone conventions, Signals, ApiService

---

## PAGES TO BUILD

```
features/doctor/
├── patients/
│   ├── patient-list.page.ts
│   ├── patient-list.page.html
│   ├── patient-list.page.scss
│   └── patient-detail/
│       ├── patient-detail.page.ts
│       ├── patient-detail.page.html
│       ├── patient-detail.page.scss
│       └── components/
│           ├── allergy-alerts/
│           ├── active-diagnoses/
│           ├── vitals-chart/
│           └── consultation-list/
├── consultations/
│   ├── consultation-form/
│   │   ├── consultation-form.page.ts
│   │   ├── consultation-form.page.html
│   │   └── consultation-form.page.scss
│   ├── consultation-detail/
│   │   ├── consultation-detail.page.ts
│   │   ├── consultation-detail.page.html
│   │   └── consultation-detail.page.scss
│   └── amendment-modal/
│       ├── amendment-modal.component.ts
│       ├── amendment-modal.component.html
│       └── amendment-modal.component.scss

features/staff/
└── patients/              (same patient list + detail — staff view, no consultation creation)
    ├── patient-list.page.ts
    └── patient-detail/
```

---

## SERVICES (Angular)

```typescript
// features/medical/services/consultation.service.ts
getConsultations(patientId: string): Observable<Consultation[]>
getConsultationById(patientId: string, id: string): Observable<ConsultationDetail>
createConsultation(patientId: string, payload: CreateConsultationRequest): Observable<{ id: string }>
updateConsultation(patientId: string, id: string, payload: UpdateConsultationRequest): Observable<void>
amendConsultation(patientId: string, id: string, payload: AmendmentRequest): Observable<void>
getAmendments(patientId: string, consultationId: string): Observable<Amendment[]>

// features/medical/services/vitals.service.ts
getVitals(patientId: string): Observable<VitalSigns[]>
createVitals(patientId: string, payload: CreateVitalsRequest): Observable<void>

// features/medical/services/diagnosis.service.ts
getDiagnoses(patientId: string): Observable<Diagnosis[]>
createDiagnosis(patientId: string, payload: CreateDiagnosisRequest): Observable<void>
updateDiagnosis(patientId: string, id: string, payload: UpdateDiagnosisRequest): Observable<void>
deleteDiagnosis(patientId: string, id: string): Observable<void>
searchICD10(query: string): Observable<ICD10Code[]>

// features/medical/services/allergy.service.ts
getAllergies(patientId: string): Observable<Allergy[]>
createAllergy(patientId: string, payload: CreateAllergyRequest): Observable<void>
updateAllergy(patientId: string, id: string, payload: UpdateAllergyRequest): Observable<void>
deleteAllergy(patientId: string, id: string): Observable<void>

// features/medical/services/patient-medical.service.ts
getTimeline(patientId: string): Observable<PatientTimeline>
```

---

## MODELS

```typescript
export interface Consultation {
  id: string;
  patientId: string;
  doctorName: string;
  consultationDate: string;
  chiefComplaint: string;
  isLocked: boolean;
  followUpDate: string | null;
}

export interface ConsultationDetail extends Consultation {
  historyOfPresentIllness: string | null;
  peGeneralFindings: string | null;
  peHEENTFindings: string | null;
  peChestFindings: string | null;
  peAbdomenFindings: string | null;
  peExtremitiesFindings: string | null;
  peNeurologicalFindings: string | null;
  assessment: string | null;
  plan: string | null;
  vitalSigns: VitalSigns | null;
  diagnoses: Diagnosis[];
  amendments: Amendment[];
  visitSummaryUrl: string | null;
}

export interface VitalSigns {
  id: string;
  bloodPressureSystolic: number | null;
  bloodPressureDiastolic: number | null;
  heartRate: number | null;
  respiratoryRate: number | null;
  temperature: number | null;
  oxygenSaturation: number | null;
  weight: number | null;
  height: number | null;
  bmi: number | null;
  createdAt: string;
}

export interface Diagnosis {
  id: string;
  icd10Code: string;
  icd10Description: string;
  diagnosisType: 'Primary' | 'Secondary' | 'Comorbidity';
  isActive: boolean;
  resolvedDate: string | null;
}

export interface Allergy {
  id: string;
  allergenName: string;
  allergenType: 'Drug' | 'Food' | 'Environmental' | 'Other';
  severity: 'Mild' | 'Moderate' | 'Severe';
  reactionDescription: string | null;
}

export interface Amendment {
  id: string;
  fieldName: string;
  oldValue: string | null;
  newValue: string | null;
  amendedBy: string;
  amendedAt: string;
  reason: string;
}
```

---

## PATIENT LIST PAGE (Doctor & Staff)

Route: `/doctor/patients` and `/staff/patients`

- Search bar: search by name, PatientCode, contact
- `ion-list` of patients: PatientCode, full name, contact, last visit date
- Pull-to-refresh
- Tap → navigate to Patient Detail page
- Doctor view: only shows accessible patients (backend-filtered)
- Staff view: all patients

---

## PATIENT DETAIL PAGE

Route: `/doctor/patients/:id`

Tabbed layout using `ion-segment`:

### Tab 1 — Overview
- Patient info card: name, PatientCode, DOB, sex, blood type, contact, PhilHealth, HMO
- **Allergy Alerts** — prominent warning card at top if allergies exist:
  ```
  ⚠️ KNOWN ALLERGIES
  • Penicillin (Drug) — Severe — Rash, anaphylaxis
  • Peanuts (Food) — Moderate
  ```
  Use `ion-card` with `color="danger"` background
- **Active Diagnoses** — `ion-chip` list of active diagnoses
- Upcoming Appointment card (if any Confirmed booking exists)
- "New Consultation" button (Doctor only) → navigates to Consultation Form

### Tab 2 — Consultations
- List of consultations: date, doctor, chief complaint, locked badge
- Locked badge: `ion-badge color="medium"` with 🔒 icon
- Tap → navigate to Consultation Detail page

### Tab 3 — Vitals
- Vitals chart (see Vitals Chart Component below)
- "Add Vitals" button (Doctor/Staff) → opens Add Vitals Modal

### Tab 4 — Diagnoses
- List of diagnoses grouped: Active | Resolved
- Each item: ICD-10 code badge, description, type badge
- "Add Diagnosis" button (Doctor/Admin) → opens ICD-10 search modal
- Mark as Resolved button per active diagnosis

### Tab 5 — Allergies
- List of allergies with severity badge
- Severity badge: Mild = success, Moderate = warning, Severe = danger
- FAB "Add Allergy" → opens form
- Swipe-left: Edit / Delete

---

## VITALS CHART COMPONENT

```typescript
// features/doctor/patients/components/vitals-chart/vitals-chart.component.ts
@Input() patientId: string;
```

Uses Chart.js to display:
- **BP Trend** — line chart (systolic + diastolic) over time
- **Weight Trend** — line chart over time
- **Heart Rate Trend** — line chart over time

Toggle between charts using `ion-segment`.

Latest vitals summary card above charts:
```
BP: 120/80    HR: 72    Temp: 36.8°C    O2: 98%    BMI: 24.2
```

---

## CONSULTATION FORM PAGE

Route: `/doctor/patients/:patientId/consultation/new` and `.../consultation/:id/edit`

Sections using `ion-accordion` (collapsible):

**1. Basic Info**
- Consultation Date (date picker, defaults today)
- Consultation Time (time picker, defaults now)
- Chief Complaint (required, textarea)
- History of Present Illness (textarea)

**2. Vital Signs** (inline, not separate endpoint — submitted with consultation)
- BP Systolic + Diastolic (number inputs)
- Heart Rate, Respiratory Rate, O2 Saturation (number inputs)
- Temperature (decimal input)
- Weight (kg) + Height (cm) → BMI auto-computed and displayed in real-time
  ```typescript
  bmi = computed(() => {
    const w = this.weight();
    const h = this.height();
    if (!w || !h) return null;
    const hm = h / 100;
    return Math.round((w / (hm * hm)) * 10) / 10;
  });
  ```

**3. Physical Examination**
- General Findings (textarea)
- HEENT Findings (textarea)
- Chest/Lungs Findings (textarea)
- Abdomen Findings (textarea)
- Extremities Findings (textarea)
- Neurological Findings (textarea)

**4. Assessment & Plan**
- Assessment / Diagnosis (textarea)
- Plan (textarea)
- Follow-up Date (date picker, optional)

Submit button at bottom. On success: navigate to Consultation Detail.

Edit mode: if `IsLocked = true` → show locked banner, all fields disabled, "Add Amendment" button shown instead.

---

## CONSULTATION DETAIL PAGE

Route: `/doctor/patients/:patientId/consultations/:id`

- Displays all consultation fields in read-only card layout
- Locked badge shown if IsLocked = true
- Vitals summary section
- Diagnoses list (linked to this consultation)
- **Amendment Log** section (Doctor/Admin only): shows all amendments with old/new values, who, when, reason
- Action buttons:
  - Edit (Doctor/Admin — only if not locked)
  - Add Amendment (Doctor/Admin — only if locked)
  - Generate Visit Summary (Doctor/Admin/Staff)
  - Download Visit Summary (if visitSummaryUrl exists)

---

## AMENDMENT MODAL

Opens when Doctor taps "Add Amendment" on a locked consultation:

```
Field to amend: [select dropdown of consultation fields]
Current value: [auto-filled from current consultation data, read-only]
New value: [textarea]
Reason for amendment: [textarea, required]
```

On submit: calls `POST .../amend`, shows success toast, refreshes consultation detail.

---

## ICD-10 SEARCH MODAL

Opens when "Add Diagnosis" is tapped:

- Search input with debounce (300ms)
- Calls `GET /api/v1/icd10/search?q=` on each keystroke
- Results list: ICD-10 code badge + description
- Tap a result → pre-fills form
- Diagnosis Type select: Primary / Secondary / Comorbidity
- Add button

---

## VITALS ADD MODAL

Simple form with all vitals fields. BMI computed in real-time. Linked to selected consultation (optional).

---

## TASK

Build all medical record pages listed above. Build on Phases 1–4.

Result must:
1. Doctor can see only their accessible patients in the patient list
2. Patient detail shows allergy alerts prominently in danger color
3. Active diagnoses shown as chips on the overview tab
4. BMI auto-computes in real-time as weight/height are entered
5. Consultation form submits with vitals in one request
6. Locked consultations show the lock badge and disable edit mode
7. Amendment modal creates amendment log entry on locked consultation
8. ICD-10 search returns results within 300ms debounce
9. Vitals chart renders BP and weight trend lines using Chart.js
10. Staff can view patient detail and add vitals but cannot create consultations
