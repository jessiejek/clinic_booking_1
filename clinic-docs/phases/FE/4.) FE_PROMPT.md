# PHASE 4 — FE_PROMPT.md
## Payment & Receipts: Payment Settings UI, Receipt Download, Visit Summary Download

---

## CONTEXT

Phase 4 implements the frontend for payment settings management (Admin), receipt/document download in the Patient Portal, and receipt viewing in the Admin/Staff booking management screens. PDF generation happens on the backend — the frontend only needs to display download links and trigger generation endpoints.

---

## REFERENCE DOCUMENTS
- `PROJECT.md` — Receipts & Document Generation section, Patient Portal pages, access control
- `FE_TECH_STACK.md` — Angular 17 standalone conventions, ApiService, Signals

---

## PAGES / COMPONENTS TO BUILD

```
features/admin/
└── settings/
    └── (extend existing settings page with Payment Settings tab)

features/patient/
├── my-receipts/
│   ├── my-receipts.page.ts
│   ├── my-receipts.page.html
│   └── my-receipts.page.scss
└── my-bookings/
    └── (extend existing — add receipt download button)

features/admin/
└── bookings/
    └── (extend booking detail modal — add receipt view/download)
```

---

## SERVICES (Angular)

```typescript
// features/admin/services/payment-settings.service.ts
getPaymentSettings(): Observable<PaymentSettings>
updatePaymentSettings(payload: UpdatePaymentSettingsRequest): Observable<void>

// features/patient/services/receipt.service.ts
getMyReceipts(): Observable<Receipt[]>
downloadReceipt(bookingId: string): Observable<string>     // returns URL

// features/admin/services/document.service.ts
generateReceipt(bookingId: string): Observable<{ url: string }>
generateVisitSummary(consultationId: string): Observable<{ url: string }>
generateMedCert(payload: MedCertRequest): Observable<{ url: string }>
generateReferral(payload: ReferralRequest): Observable<{ url: string }>
```

---

## MODELS

```typescript
export interface PaymentSettings {
  gcashQrImageUrl: string | null;
  gcashAccountName: string | null;
  gcashNumber: string | null;
  mayaQrImageUrl: string | null;
  mayaAccountName: string | null;
  mayaNumber: string | null;
  bankName: string | null;
  bankAccountName: string | null;
  bankAccountNumber: string | null;
  isPayAtClinicMode: boolean;
}

export interface Receipt {
  bookingId: string;
  orNumber: string | null;
  doctorName: string;
  serviceName: string;
  appointmentDate: string;
  totalFee: number;
  paymentStatus: PaymentStatus;
  receiptUrl: string | null;
  visitSummaryUrl: string | null;
  createdAt: string;
}
```

---

## PAYMENT SETTINGS — ADMIN

Extend the existing Settings page (`/admin/settings`) with a **"Payment" section**:

**Online Payment Methods**
- GCash: Account Name input, GCash Number input, QR Image URL input
- Maya: Account Name input, Maya Number input, QR Image URL input
- Bank Transfer: Bank Name, Account Name, Account Number

**Clinic-Wide Payment Mode**
- Toggle: "Pay at Clinic Mode" — when enabled, all online bookings skip payment proof and go straight to Confirmed

Each section has a Save button (or one global Save for all settings).

Show a preview card of how payment instructions will look to patients:
```
┌────────────────────────────────────┐
│  Pay via GCash                     │
│  Account Name: [name]              │
│  Number: [number]                  │
│  [QR Code Image]                   │
└────────────────────────────────────┘
```

---

## PROOF SUBMISSION PAGE — UPDATE

Extend the Phase 3 proof submission page to **load and display payment details** from `GET /api/v1/payments/settings`:

- If GCash is configured: show GCash section with account name, number, and QR image
- If Maya is configured: show Maya section
- If Bank Transfer is configured: show bank section
- Use `ion-segment` to switch between payment methods if multiple are available
- If PayAtClinic mode is active: the proof submission step is skipped entirely (handled in Phase 3 flow already — just ensure it's respected)

---

## MY RECEIPTS PAGE (Patient Portal)

Route: `/portal/my-receipts`

Display two sections:

### Payment Receipts
- List of all bookings with `receiptUrl` set
- Each item: OR Number, Doctor, Service, Date, Amount, Status badge
- "Download Receipt" button → opens PDF in new tab (`window.open(receiptUrl)`)

### Visit Summaries
- List of all bookings with a `visitSummaryUrl` set (from linked consultation)
- Each item: Doctor, Date, Visit Summary label
- "Download Summary" button → opens PDF in new tab

Both sections use `ion-list` with `ion-item`. Empty state illustration if no receipts yet.

---

## MY BOOKINGS — EXTEND (Patient Portal)

Extend the existing My Bookings page from Phase 3:

On each confirmed/completed booking card, add:
- **Download Receipt** button (shown only if `receiptUrl` is not null)
- **Download Visit Summary** button (shown only if `visitSummaryUrl` is not null)

Both open the URL in a new browser tab.

---

## ADMIN BOOKING DETAIL MODAL — EXTEND

Extend the Phase 3 Booking Detail Modal:

Add a "Documents" section at the bottom:
- If `receiptUrl` exists: "View Receipt" button → opens in new tab
- If `receiptUrl` is null and booking is Confirmed/Completed: "Generate Receipt" button → calls `POST /api/v1/documents/receipt/{bookingId}` → shows toast "Receipt generated" → updates modal with new URL
- If `visitSummaryUrl` exists: "View Visit Summary" button
- If `visitSummaryUrl` is null and booking is Completed: "Generate Visit Summary" button

---

## PROOF SUBMISSION — PAYMENT METHOD DISPLAY HELPER

Create a shared component:

```typescript
// shared/components/payment-methods-display/payment-methods-display.component.ts
@Input() settings: PaymentSettings;
// Displays GCash, Maya, Bank Transfer sections with QR images
// Used in: proof submission page
```

---

## PDF DOWNLOAD UTILITY

Create a shared utility for downloading PDFs:

```typescript
// shared/utils/pdf-download.util.ts
export function openPdfInNewTab(url: string): void {
  window.open(url, '_blank', 'noopener,noreferrer');
}
```

Use this everywhere instead of inline `window.open` calls.

---

## TASK

Build payment settings UI and receipt download functionality. Build on Phase 1 + 2 + 3.

Result must:
1. Admin can configure GCash, Maya, and Bank Transfer payment details in Settings
2. Pay at Clinic Mode toggle works and is saved
3. Patient sees payment method details (QR codes, account info) on the proof submission page
4. Patient can view their payment receipts in My Receipts page
5. Patient can view their visit summaries in My Receipts page
6. Patient can download receipts from My Bookings and My Receipts pages
7. Admin can view and download receipts from the Booking Detail Modal
8. Admin can trigger receipt regeneration if missing
9. OR number displayed on receipt cards and booking cards where available
10. Empty states shown when no receipts exist yet
