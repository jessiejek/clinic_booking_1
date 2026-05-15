# PHASE 3 — BE_PROMPT.md
## Booking System: Slot Availability, Online Booking Flow, Concurrency Safety, Lazy Expiry

---

## CONTEXT

Phase 3 implements the core booking engine. This includes slot availability calculation, the online patient booking flow (slot hold → proof submission → confirmation), booking status state machine, lazy expiry pattern, concurrency safety, and the patient registry (for linking portal patients to patient records).

This is the most complex phase. Read the business rules carefully before writing any code.

---

## REFERENCE DOCUMENTS
- `PROJECT.md` — full booking flow, status definitions, timer rules, concurrency safety, lazy expiry pattern
- `BE_TECH_STACK.md` — Clean Architecture, MediatR, repository pattern, lazy expiry implementation

---

## DATABASE TABLES TO ADD

### Patients
```
- Id (Guid)
- PatientCode (string, unique, auto-generated: PT-{YEAR}-{SEQ:5})
- FirstName (max 100), MiddleName (max 100, nullable), LastName (max 100)
- DateOfBirth (DateTime, nullable), Sex (string, max 10, nullable)
- CivilStatus (string, max 50, nullable)
- Address, City, ZipCode (all nullable strings)
- ContactNumber (max 20, nullable), Email (max 200, nullable)
- EmergencyContactName, EmergencyContactNumber, EmergencyContactRelationship (all nullable)
- BloodType (max 10, nullable), PhilHealthNumber (max 50, nullable)
- HMOProvider (max 100, nullable), HMOCardNumber (max 100, nullable)
- UserId (FK → Users, nullable — links to portal account)
- IsGuest (bool, default false)
- CreatedAt, UpdatedAt, IsDeleted, DeletedAt
```

### Bookings
```
- Id (Guid)
- PatientId (FK → Patients)
- DoctorId (FK → Doctors)
- ServiceId (FK → Services)
- AppointmentDate (DateTime — date only)
- SlotStartTime (TimeSpan)
- SlotEndTime (TimeSpan)
- Status (enum: Pending/ProofSubmitted/Confirmed/OnHold/Cancelled/Completed/Expired/NoShow)
- PaymentStatus (enum: Unpaid/Paid/Waived/Refunded)
- PaymentMode (enum: Online/PayAtClinic)
- QueueNumber (int, nullable — assigned on Confirmed)
- IsWalkIn (bool, default false)
- ReminderSent24hr (bool, default false)
- ReminderSent1hr (bool, default false)
- ReceiptUrl (string, nullable)
- TotalFee (decimal 18,2)
- ProofType (enum: ReferenceNumber/Screenshot, nullable)
- ProofValue (string, nullable — reference number text)
- ProofImageUrl (string, nullable — screenshot URL)
- ProofSubmittedAt (DateTime, nullable)
- CancellationReason (string, nullable)
- Notes (string, nullable)
- RowVersion (byte[], concurrency token)
- CreatedAt, UpdatedAt, IsDeleted, DeletedAt
```

### Payments
```
- Id (Guid)
- BookingId (FK → Bookings, unique — one payment record per booking)
- Amount (decimal 18,2)
- PaymentMethod (enum: GCash/Maya/BankTransfer/PayAtClinic)
- ReferenceNumber (string, nullable)
- ProofImageUrl (string, nullable)
- Status (enum: Pending/Verified/Rejected/Refunded)
- ORNumber (string, max 30, nullable)
- ORSequence (int, nullable)
- VerifiedByUserId (FK → Users, nullable)
- VerifiedAt (DateTime, nullable)
- CreatedAt, UpdatedAt
```

### PaymentSettings
```
- Id (single row)
- GCashQrImageUrl (nullable), GCashAccountName (nullable), GCashNumber (nullable)
- MayaQrImageUrl (nullable), MayaAccountName (nullable), MayaNumber (nullable)
- BankName (nullable), BankAccountName (nullable), BankAccountNumber (nullable)
- IsPayAtClinicMode (bool, default false)
- UpdatedAt
```

---

## LAZY EXPIRY — CRITICAL IMPLEMENTATION

Implement `ResolveStaleBookingsAsync(Guid doctorId, DateTime date)` as a shared private method in the booking handlers. Call it at the start of any handler that reads booking or slot data:

```csharp
private async Task ResolveStaleBookingsAsync(Guid doctorId, DateTime date)
{
    var bookings = await _context.Bookings
        .Where(b => b.DoctorId == doctorId
                 && b.AppointmentDate.Date == date.Date
                 && !b.IsDeleted)
        .ToListAsync();

    var settings = await _context.ClinicSettings.FirstAsync();
    bool changed = false;

    foreach (var b in bookings)
    {
        if (b.Status == BookingStatus.Pending &&
            b.CreatedAt < DateTime.UtcNow.AddMinutes(-10))
        {
            b.Status = BookingStatus.Expired;
            b.UpdatedAt = DateTime.UtcNow;
            changed = true;
        }

        if (b.Status == BookingStatus.ProofSubmitted &&
            b.ProofSubmittedAt.HasValue &&
            b.ProofSubmittedAt.Value < DateTime.UtcNow.AddHours(-1))
        {
            b.Status = BookingStatus.OnHold;
            b.UpdatedAt = DateTime.UtcNow;
            changed = true;
        }

        if (b.Status == BookingStatus.Confirmed &&
            b.PaymentMode == PaymentMode.PayAtClinic &&
            b.PaymentStatus == PaymentStatus.Unpaid &&
            settings.PayAtClinicNoShowWindowMinutes > 0)
        {
            var slotDateTime = b.AppointmentDate.Date.Add(b.SlotStartTime);
            if (slotDateTime < DateTime.UtcNow.AddMinutes(-settings.PayAtClinicNoShowWindowMinutes))
            {
                b.Status = BookingStatus.NoShow;
                b.UpdatedAt = DateTime.UtcNow;
                changed = true;
            }
        }
    }

    if (changed) await _context.SaveChangesAsync();
}
```

---

## CONCURRENCY SAFETY — CRITICAL

Booking creation uses a **serializable transaction** to prevent double-booking:

```csharp
using var transaction = await _context.Database.BeginTransactionAsync(
    System.Data.IsolationLevel.Serializable);

try
{
    // 1. Check slot occupancy
    var slotCount = await _context.Bookings
        .CountAsync(b => b.DoctorId == request.DoctorId
                      && b.AppointmentDate.Date == request.AppointmentDate.Date
                      && b.SlotStartTime == request.SlotStartTime
                      && !b.IsDeleted
                      && b.Status != BookingStatus.Expired
                      && b.Status != BookingStatus.Cancelled);

    if (slotCount >= doctor.SlotCapacity)
        throw new ConflictException("This slot is fully booked.");

    // 2. Check daily patient limit
    if (doctor.DailyPatientLimit.HasValue)
    {
        var dailyCount = await _context.Bookings
            .CountAsync(b => b.DoctorId == request.DoctorId
                          && b.AppointmentDate.Date == request.AppointmentDate.Date
                          && !b.IsDeleted
                          && b.Status != BookingStatus.Expired
                          && b.Status != BookingStatus.Cancelled);

        if (dailyCount >= doctor.DailyPatientLimit.Value)
            throw new ConflictException("Doctor has reached their daily patient limit.");
    }

    // 3. Create booking
    var booking = new Booking { ... Status = BookingStatus.Pending };
    await _context.Bookings.AddAsync(booking);
    await _context.SaveChangesAsync();

    await transaction.CommitAsync();
    return booking.Id;
}
catch
{
    await transaction.RollbackAsync();
    throw;
}
```

---

## APPLICATION LAYER — USE CASES

### GetAvailableSlotsQuery (public)
- Input: DoctorId, Date
- Call `ResolveStaleBookingsAsync(doctorId, date)` first
- Check: doctor exists, is Active, date is not blocked, doctor has a schedule for that DayOfWeek
- Generate all time slots from Schedule.StartTime to Schedule.EndTime with SlotDurationMinutes steps
- For each slot: count non-expired/non-cancelled bookings → determine slot status:
  - count == 0 → Available
  - 0 < count < SlotCapacity → Available (with remaining count)
  - count >= SlotCapacity → Full
  - count > 0 and includes Pending → Pending (yellow)
- Check DailyPatientLimit → if daily count >= limit, all slots → Full
- Include today's DoctorDayStatus (RunningLate, EstimatedDelayMinutes) in response

### CreateBookingCommand (Patient)
- Input: DoctorId, ServiceId, AppointmentDate, SlotStartTime
- Validate: slot available (using serializable transaction — see above)
- Determine PaymentMode: use ClinicSettings.IsPayAtClinicMode
- If PayAtClinic: Status = Confirmed, PaymentStatus = Unpaid, QueueNumber assigned immediately
- If Online: Status = Pending, PaymentStatus = Unpaid
- QueueNumber assignment (on Confirmed only):
  ```csharp
  var nextQueue = await _context.Bookings
      .Where(b => b.DoctorId == doctorId
               && b.AppointmentDate.Date == date
               && b.Status == BookingStatus.Confirmed
               && !b.IsDeleted)
      .CountAsync() + 1;
  ```
- Notify Admin + Staff (fire-and-forget): "New booking created"
- Returns: BookingId, Status, QueueNumber (if assigned), TotalFee, PaymentMode

### SubmitProofCommand (Patient — own booking)
- Input: BookingId, ProofType (ReferenceNumber/Screenshot), ProofValue/ProofImageUrl
- Validate: booking belongs to patient, status == Pending
- Set Status = ProofSubmitted, ProofSubmittedAt = UtcNow
- If Screenshot: upload image to Cloudinary, store URL
- Notify Admin + Staff (fire-and-forget)
- Returns: success

### ConfirmBookingCommand (Admin | Staff)
- Input: BookingId
- Validate: status == ProofSubmitted
- Set Status = Confirmed, PaymentStatus = Paid
- Assign QueueNumber (next queue for this doctor+date)
- Generate OR Number (atomic via ClinicSettings.ORSequence + row lock)
- Create Payment record with ORNumber, Status = Verified
- Trigger PDF receipt generation (fire-and-forget)
- Notify patient (fire-and-forget): includes QueueNumber, OR number
- Returns: BookingId, QueueNumber, ORNumber

### RejectBookingCommand (Admin | Staff)
- Input: BookingId, CancellationReason
- Validate: status == ProofSubmitted
- Set Status = Cancelled
- Notify patient (fire-and-forget)
- Returns: success

### CancelBookingCommand (Patient | Admin | Staff)
- Patient: validate booking belongs to patient, status in [Pending, Confirmed], within cancellation deadline
- Admin/Staff: any status except Completed/NoShow
- If PaymentStatus == Paid → set PaymentStatus = Refunded (manual refund tracking)
- Set Status = Cancelled, CancellationReason
- Notify patient (fire-and-forget)

### CompleteBookingCommand (Admin | Staff | Doctor)
- Set Status = Completed
- Trigger Visit Summary PDF generation (fire-and-forget) — if consultation exists for this booking
- Returns: success

### NoShowCommand (Admin | Staff)
- Set Status = NoShow
- Notify patient (fire-and-forget)

### ResolveHoldCommand (Admin | Staff)
- Status = OnHold → Admin manually sets to Confirmed or Cancelled
- Input: BookingId, Resolution (Confirm/Cancel)

### MarkPaidCommand (Admin | Staff)
- Input: BookingId
- Validate: PaymentMode == PayAtClinic, PaymentStatus == Unpaid
- Set PaymentStatus = Paid
- Generate OR Number + Payment record
- Trigger PDF receipt generation (fire-and-forget)
- Notify patient (fire-and-forget)

### MarkRefundCommand (Admin)
- Set PaymentStatus = Refunded
- Notify patient

### GetBookingsQuery (role-filtered)
- Admin/Staff: all bookings with filters (date, doctorId, status, paymentStatus)
- Doctor: own patients only
- Patient: own bookings only
- Call `ResolveStaleBookingsAsync` for any today/future bookings being fetched
- Include: patient name, doctor name, service name, queueNumber, status, paymentStatus, ORNumber

### GetUnpaidReportQuery (Admin | Staff)
- Returns all Completed bookings where PaymentStatus == Unpaid
- Grouped by date, includes patient name, doctor name, fee

### GetBookingReceiptQuery (Admin | Staff | Patient — own)
- Returns receipt URL from Booking.ReceiptUrl

### Patient Registry

**GetPatientsQuery** (Admin | Staff | Doctor — filtered for Doctor)
**GetPatientByIdQuery** (Admin | Staff | Doctor | Patient — own only)
**CreatePatientCommand** (Admin | Staff)
**CreateGuestPatientCommand** (Admin | Staff) — Name + Contact only, IsGuest = true
**UpdatePatientCommand** (Admin | Staff)
**SearchPatientsQuery** (Admin | Staff) — search by name, contact, PatientCode
**UpdateOwnProfileCommand** (Patient) — limited fields: ContactNumber, Address, City, ZipCode, EmergencyContact, BloodType, PhilHealthNumber, HMOProvider, HMOCardNumber

PatientCode generation:
```csharp
var seq = await _context.Patients.CountAsync() + 1;
var code = $"PT-{DateTime.UtcNow.Year}-{seq:D5}"; // PT-2025-00001
```

### Payment Settings

**GetPaymentSettingsQuery** (public)
**UpdatePaymentSettingsCommand** (Admin)

---

## API ENDPOINTS

```
GET    /api/v1/doctors/{id}/availability?date=         — public
GET    /api/v1/bookings                                 — role-filtered
GET    /api/v1/bookings/{id}                           — role-filtered
POST   /api/v1/bookings                                 — Patient
POST   /api/v1/bookings/{id}/proof                     — Patient (own)
PUT    /api/v1/bookings/{id}/confirm                   — Admin | Staff
PUT    /api/v1/bookings/{id}/reject                    — Admin | Staff
PUT    /api/v1/bookings/{id}/cancel                    — Patient (own) | Admin | Staff
PUT    /api/v1/bookings/{id}/complete                  — Admin | Staff | Doctor
PUT    /api/v1/bookings/{id}/no-show                   — Admin | Staff
PUT    /api/v1/bookings/{id}/resolve-hold              — Admin | Staff
PUT    /api/v1/bookings/{id}/mark-paid                 — Admin | Staff
PUT    /api/v1/bookings/{id}/refund                    — Admin
GET    /api/v1/bookings/unpaid-report                  — Admin | Staff
GET    /api/v1/bookings/{id}/receipt                   — Admin | Staff | Patient (own)

GET    /api/v1/patients                                 — Admin | Staff | Doctor
GET    /api/v1/patients/{id}                           — Admin | Staff | Doctor | Patient (own)
POST   /api/v1/patients                                 — Admin | Staff
POST   /api/v1/patients/guest                          — Admin | Staff
PUT    /api/v1/patients/{id}                           — Admin | Staff
DELETE /api/v1/patients/{id}                           — Admin
GET    /api/v1/patients/search?q=                      — Admin | Staff
PUT    /api/v1/patients/{id}/profile                   — Patient (own)

GET    /api/v1/payments/settings                        — public
PUT    /api/v1/payments/settings                        — Admin
```

---

## SEED DATA TO ADD

For each of the 5 sample patients:
- 2 completed bookings per doctor (PaymentStatus = Paid, QueueNumber assigned, ORNumber = OR-2025-0000X)
- 1 walk-in booking with PaymentStatus = Unpaid, Status = Completed
- Matching Payment records with ORNumbers

---

## TASK

Implement the full booking system on top of Phase 1 + Phase 2. This is the core engine of the system.

Result must:
1. `GET /api/v1/doctors/{id}/availability?date=2025-06-02` returns correct slots with colors (Available/Pending/Full)
2. `POST /api/v1/bookings` (Patient JWT) creates a Pending booking with 10-min expiry behavior
3. After 10 minutes without proof submission, `GET /api/v1/doctors/{id}/availability` shows slot as Available again (lazy expiry)
4. `POST /api/v1/bookings/{id}/proof` moves status to ProofSubmitted
5. `PUT /api/v1/bookings/{id}/confirm` moves to Confirmed, assigns QueueNumber and ORNumber, creates Payment record
6. Double-booking the same slot returns `409 Conflict`
7. DailyPatientLimit enforcement works
8. Unpaid report returns correct Completed + Unpaid records
9. Patient can cancel own Confirmed booking within deadline
10. PatientCode auto-generated correctly (PT-2025-00001 format)
