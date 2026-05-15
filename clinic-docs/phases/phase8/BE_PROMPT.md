# PHASE 8 — BE_PROMPT.md
## Dashboards & Reports: Admin Dashboard, Doctor Dashboard, Unpaid Report, Booking Calendar

---

## CONTEXT

Phase 8 implements all dashboard data endpoints and report queries. By this phase, all core data exists in the database — this phase is about aggregating it efficiently into the dashboard views and reports defined in PROJECT.md.

---

## REFERENCE DOCUMENTS
- `PROJECT.md` — Dashboards section (Admin/Staff Dashboard and Doctor Dashboard), booking calendar, unpaid report
- `BE_TECH_STACK.md` — EF Core, MediatR queries, AsNoTracking

---

## APPLICATION LAYER — USE CASES

### GetAdminDashboardQuery (Admin | Staff)

Returns all stats in a single API call. Use `.AsNoTracking()` on all reads.

```csharp
public class AdminDashboardDto
{
    // Appointments
    public int TotalAppointmentsToday { get; set; }
    public int TotalAppointmentsThisMonth { get; set; }

    // Revenue (PaymentStatus = Paid only)
    public decimal TotalRevenueToday { get; set; }
    public decimal TotalRevenueThisMonth { get; set; }

    // Action Required
    public int PendingVerificationCount { get; set; }      // Status = ProofSubmitted
    public int OnHoldCount { get; set; }                   // Status = OnHold
    public int UnpaidCompletedTodayCount { get; set; }     // Completed + Unpaid today

    // Today's Activity
    public int NoShowCountToday { get; set; }
    public List<TodayAppointmentDto> TodayAppointments { get; set; }  // for the list
    public List<DoctorRunningLateDto> RunningLateDoctors { get; set; }

    // Patients & Consultations
    public int TotalPatientsRegistered { get; set; }
    public int NewPatientsThisMonth { get; set; }
    public int TotalConsultationsToday { get; set; }
    public int TotalConsultationsThisMonth { get; set; }
    public int ActivePrescriptionsCount { get; set; }
    public int UpcomingVaccinationReminders { get; set; }   // NextDoseDate within 7 days

    // Top Stats
    public string? MostBookedDoctorName { get; set; }
    public string? MostBookedServiceName { get; set; }
}

public class TodayAppointmentDto
{
    public Guid BookingId { get; set; }
    public int? QueueNumber { get; set; }
    public string PatientName { get; set; }
    public string DoctorName { get; set; }
    public string ServiceName { get; set; }
    public string SlotStartTime { get; set; }
    public string Status { get; set; }
    public string PaymentStatus { get; set; }
}

public class DoctorRunningLateDto
{
    public string DoctorName { get; set; }
    public int? EstimatedDelayMinutes { get; set; }
}
```

Query strategy — run all in parallel with `Task.WhenAll`:
```csharp
var today = DateTime.UtcNow.Date;
var thisMonthStart = new DateTime(DateTime.UtcNow.Year, DateTime.UtcNow.Month, 1);

var (appointmentsToday, appointmentsMonth, revenueToday, revenueMonth, ...) = await (
    _context.Bookings.CountAsync(b => b.AppointmentDate.Date == today && !b.IsDeleted),
    _context.Bookings.CountAsync(b => b.AppointmentDate.Date >= thisMonthStart && !b.IsDeleted),
    ...
).WhenAll(); // use Task.WhenAll pattern for parallel execution
```

### GetDoctorDashboardQuery (Doctor)

Returns dashboard data scoped to the current doctor only:

```csharp
public class DoctorDashboardDto
{
    public List<TodayAppointmentDto> TodayAppointments { get; set; }
    public List<UpcomingAppointmentDto> UpcomingThisWeek { get; set; }
    public int TotalPatientsSeen { get; set; }         // Consultations this month
    public int TotalPatientsSeenToday { get; set; }    // Consultations today
}
```

### GetBookingCalendarQuery (Admin | Staff)

Returns bookings in a given month formatted for calendar display:

- Input: year, month
- Returns: List of `{ date: "2025-06-15", count: 5, hasConfirmed: true, hasOnHold: true }`
- Used to render the monthly booking calendar on the Admin dashboard
- One entry per date that has at least one booking

```csharp
public class CalendarDayDto
{
    public string Date { get; set; }           // "2025-06-15"
    public int TotalBookings { get; set; }
    public int ConfirmedCount { get; set; }
    public int PendingCount { get; set; }
    public int OnHoldCount { get; set; }
    public int CancelledCount { get; set; }
    public int CompletedCount { get; set; }
}
```

### GetUnpaidReportQuery (Admin | Staff)

Returns all Completed bookings where PaymentStatus = Unpaid, ordered by AppointmentDate desc:

```csharp
public class UnpaidBookingDto
{
    public Guid BookingId { get; set; }
    public string PatientName { get; set; }
    public string PatientCode { get; set; }
    public string DoctorName { get; set; }
    public string ServiceName { get; set; }
    public DateTime AppointmentDate { get; set; }
    public string SlotStartTime { get; set; }
    public decimal TotalFee { get; set; }
    public bool IsWalkIn { get; set; }
}
```

---

## MOST BOOKED LOGIC

```csharp
// Most booked doctor (this month)
var mostBookedDoctor = await _context.Bookings
    .Where(b => b.AppointmentDate >= thisMonthStart
             && b.Status != BookingStatus.Cancelled
             && b.Status != BookingStatus.Expired
             && !b.IsDeleted)
    .GroupBy(b => new { b.DoctorId, b.Doctor.FullName })
    .OrderByDescending(g => g.Count())
    .Select(g => g.Key.FullName)
    .FirstOrDefaultAsync();
```

---

## API ENDPOINTS

```
GET    /api/v1/admin/dashboard                         — Admin | Staff
GET    /api/v1/admin/bookings/calendar?year=&month=    — Admin | Staff
GET    /api/v1/admin/reports/unpaid                    — Admin | Staff
GET    /api/v1/doctor/dashboard                        — Doctor
```

---

## PERFORMANCE NOTES

- All dashboard queries use `.AsNoTracking()`
- Dashboard query must complete in under 500ms for a typical seeded dataset
- Use `Task.WhenAll` to run independent counts in parallel
- Add DB indexes if needed:
  - `Bookings(AppointmentDate, Status, IsDeleted)`
  - `Bookings(DoctorId, AppointmentDate, Status)`
  - `Consultations(DoctorId, ConsultationDate)`

---

## TASK

Implement all dashboard and report endpoints. Build on Phases 1–7.

Result must:
1. `GET /api/v1/admin/dashboard` returns all fields in under 500ms with seeded data
2. Total appointments today and this month match actual booking counts
3. Revenue totals only include PaymentStatus = Paid bookings
4. PendingVerificationCount correctly counts ProofSubmitted bookings
5. UnpaidCompletedTodayCount correctly counts today's Completed + Unpaid
6. Most booked doctor and service correctly identified this month
7. `GET /api/v1/admin/bookings/calendar` returns one entry per booking date in the requested month
8. `GET /api/v1/admin/reports/unpaid` returns all Completed + Unpaid bookings
9. `GET /api/v1/doctor/dashboard` only includes data for the requesting doctor
10. All queries use AsNoTracking and complete without N+1 query problems
