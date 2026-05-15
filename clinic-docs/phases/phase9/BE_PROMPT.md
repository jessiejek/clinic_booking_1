# PHASE 9 — BE_PROMPT.md
## Patient Portal: Patient-Facing Endpoints, Reviews, Audit Log View

---

## CONTEXT

Phase 9 finalizes the patient-facing backend: the patient portal endpoints (own profile, own records, own bookings), the reviews system, and the Admin audit log. By this phase, all data already exists — this phase ensures patients can safely access only their own data, and adds the review layer on top of the completed booking flow.

---

## REFERENCE DOCUMENTS
- `PROJECT.md` — Patient Portal pages, Reviews section, Audit Trail, access control tables
- `BE_TECH_STACK.md` — Clean Architecture, role-based access, EF Core

---

## PATIENT-FACING ENDPOINTS — ACCESS CONTROL AUDIT

Review every existing endpoint and ensure the following patient-scope rules are enforced:

| Endpoint | Patient Access Rule |
|---|---|
| `GET /api/v1/bookings` | Own bookings only (filter by PatientId = currentUser.PatientId) |
| `GET /api/v1/bookings/{id}` | Only if booking.PatientId == currentUser.PatientId |
| `GET /api/v1/patients/{id}` | Only if id == currentUser.PatientId |
| `PUT /api/v1/patients/{id}/profile` | Only own profile, limited fields |
| `GET /api/v1/patients/{id}/consultations` | Own only |
| `GET /api/v1/patients/{id}/vitals` | Own only |
| `GET /api/v1/patients/{id}/diagnoses` | Own only |
| `GET /api/v1/patients/{id}/allergies` | Own only |
| `GET /api/v1/patients/{id}/prescriptions` | Own only |
| `GET /api/v1/patients/{id}/prescriptions/{id}/pdf` | Own only |
| `GET /api/v1/patients/{id}/attachments` | Own only |
| `GET /api/v1/patients/{id}/vaccinations` | Own only |
| `GET /api/v1/bookings/{id}/receipt` | Own booking only |

Patient `currentUser.PatientId` is resolved from JWT sub (UserId) → lookup in Patients table where `UserId = currentUserId`.

Add a helper in Application layer:
```csharp
public interface ICurrentUserService
{
    Guid UserId { get; }
    string Role { get; }
    Task<Guid?> GetPatientIdAsync(); // finds Patient.Id by UserId
}
```

---

## REVIEWS

### GetDoctorReviewsQuery (public)
- Input: DoctorId, page, pageSize
- Returns: paginated reviews with PatientName (first name + last initial only for privacy), Rating, Comment, CreatedAt
- Includes: averageRating, totalReviews
- Orders by CreatedAt desc

### CreateReviewCommand (Patient only)
- Input: BookingId, Rating (1–5), Comment
- Validate:
  - Booking status == Completed
  - Booking belongs to current patient
  - No existing review for this BookingId (unique constraint on Reviews.BookingId)
- Returns: ReviewId

### UpdateReviewCommand (Patient — own)
- Input: ReviewId, Rating, Comment
- Validate: review belongs to current patient
- Returns: success

### DeleteReviewCommand (Patient — own | Admin)
- Soft delete

---

## AUDIT LOG

### GetAuditLogsQuery (Admin only)
- Input: filters — patientId (optional), userId (optional), entityType (optional), dateFrom, dateTo, page, pageSize
- Returns paginated AuditLog entries ordered by PerformedAt desc
- Include: EntityType, EntityId, Action, OldValues (JSON), NewValues (JSON), PerformedByName, PerformedAt, IPAddress

---

## PATIENT PORTAL SUMMARY ENDPOINT

Add a convenience endpoint for the patient portal home page:

```
GET /api/v1/portal/summary
[Authorize(Roles = "Patient")]
```

Returns:
```csharp
public class PatientPortalSummaryDto
{
    public string PatientCode { get; set; }
    public string FullName { get; set; }
    public bool IsEmailVerified { get; set; }
    public BookingDto? NextUpcomingBooking { get; set; }      // nearest Confirmed booking
    public int TotalBookingsCount { get; set; }
    public int ActivePrescriptionsCount { get; set; }
    public int UnreadNotificationsCount { get; set; }
    public List<AnnouncementDto> LatestAnnouncements { get; set; } // top 3 active
}
```

---

## PATIENT PROFILE UPDATE — LIMITED FIELDS

`PUT /api/v1/patients/{id}/profile` — Patient can only update:
- ContactNumber
- Address, City, ZipCode
- EmergencyContactName, EmergencyContactNumber, EmergencyContactRelationship
- BloodType
- PhilHealthNumber
- HMOProvider, HMOCardNumber

Patient CANNOT update: FirstName, LastName, MiddleName, DateOfBirth, Sex, PatientCode, Email.

Validate: `{id}` must match `currentUser.PatientId` — throw ForbiddenException otherwise.

---

## EMAIL VERIFICATION RESEND

```
POST /api/v1/auth/resend-verification
[Authorize(Roles = "Patient")]
```

- Regenerates EmailVerificationToken
- Resends verification email
- Rate limit: max 3 resends per hour per user

---

## API ENDPOINTS

```
GET    /api/v1/portal/summary                              — Patient

GET    /api/v1/reviews/{doctorId}?page=&pageSize=          — public
POST   /api/v1/reviews                                      — Patient
PUT    /api/v1/reviews/{id}                                — Patient (own)
DELETE /api/v1/reviews/{id}                                — Patient (own) | Admin

GET    /api/v1/audit-logs                                   — Admin (paginated, filterable)

POST   /api/v1/auth/resend-verification                    — Patient
```

---

## DOCTOR AVERAGE RATING — UPDATE

Add average rating computation to the existing `GetDoctorsQuery` and `GetDoctorByIdQuery`:

```csharp
var averageRating = await _context.Reviews
    .Where(r => r.DoctorId == doctorId && !r.IsDeleted)
    .AverageAsync(r => (double?)r.Rating) ?? 0.0;

var totalReviews = await _context.Reviews
    .CountAsync(r => r.DoctorId == doctorId && !r.IsDeleted);
```

---

## SEED DATA TO ADD

For each sample patient:
- 1 review per seeded completed booking (one per doctor)
- Rating seeded from 3–5 stars

---

## TASK

Finalize the patient portal backend, implement reviews, and add the audit log endpoint. Build on Phases 1–8.

Result must:
1. `GET /api/v1/portal/summary` returns next upcoming booking, active prescriptions count, unread notifications
2. Patient cannot access another patient's data — returns 403
3. `POST /api/v1/reviews` creates review only for completed bookings belonging to the current patient
4. Duplicate review for same BookingId returns 409
5. Patient can edit and delete their own review
6. `GET /api/v1/reviews/{doctorId}` returns paginated reviews with average rating
7. Doctor list and detail endpoints include average rating and review count from Reviews table
8. `GET /api/v1/audit-logs` returns paginated audit log for Admin only
9. Patient profile update only updates allowed fields
10. `POST /api/v1/auth/resend-verification` resends email and respects rate limit
