# PHASE 7 — BE_PROMPT.md
## Notifications & Background Jobs: In-App, Email, Push (FCM), Cron Reminders

---

## CONTEXT

Phase 7 completes the notification system. The fire-and-forget infrastructure was scaffolded in Phase 1 and notification sends have been triggered throughout Phases 3–6. This phase formalizes the full notification service, ensures all triggers are wired, implements the cron reminder job endpoint, and adds the in-app notification feed endpoints.

---

## REFERENCE DOCUMENTS
- `PROJECT.md` — Notifications section, full trigger table, notification channels, fire-and-forget pattern
- `BE_TECH_STACK.md` — Notification service pattern, Task.Run fire-and-forget

---

## DATABASE TABLE

### Notifications (already exists from Phase 1 scaffold)
```
- Id (Guid)
- UserId (FK → Users)
- Title (max 200)
- Message (max 1000)
- IsRead (bool, default false)
- CreatedAt
```

No UpdatedAt or soft delete on Notifications — they are append-only.

---

## INFRASTRUCTURE — NOTIFICATION SERVICE

### Full INotificationService Interface

```csharp
public interface INotificationService
{
    Task SendAsync(NotificationRequest request);
}

public class NotificationRequest
{
    public Guid? UserId { get; set; }                    // null = skip in-app
    public string Title { get; set; }
    public string Message { get; set; }
    public NotificationChannel Channel { get; set; } = NotificationChannel.All;
    public string? EmailTo { get; set; }                 // override email address
    public string? EmailSubject { get; set; }
    public string? EmailHtmlBody { get; set; }           // override html body
    public byte[]? EmailAttachment { get; set; }         // for PDF attachments
    public string? EmailAttachmentName { get; set; }
    public string? FcmDeviceToken { get; set; }         // for targeted push
}

public enum NotificationChannel
{
    InApp,
    Email,
    Push,
    All         // In-app + Email + Push
}
```

### NotificationService Implementation

```csharp
public class NotificationService : INotificationService
{
    public async Task SendAsync(NotificationRequest request)
    {
        var tasks = new List<Task>();

        // In-App
        if ((request.Channel == NotificationChannel.InApp || request.Channel == NotificationChannel.All)
            && request.UserId.HasValue)
        {
            tasks.Add(SaveInAppNotificationAsync(request));
        }

        // Email
        if ((request.Channel == NotificationChannel.Email || request.Channel == NotificationChannel.All)
            && !string.IsNullOrEmpty(request.EmailTo))
        {
            tasks.Add(_emailService.SendAsync(
                request.EmailTo,
                request.EmailSubject ?? request.Title,
                request.EmailHtmlBody ?? request.Message,
                request.EmailAttachment,
                request.EmailAttachmentName));
        }

        // Push (FCM)
        if ((request.Channel == NotificationChannel.Push || request.Channel == NotificationChannel.All)
            && !string.IsNullOrEmpty(request.FcmDeviceToken))
        {
            tasks.Add(_fcmService.SendAsync(request.FcmDeviceToken, request.Title, request.Message));
        }

        await Task.WhenAll(tasks);
    }

    private async Task SaveInAppNotificationAsync(NotificationRequest request)
    {
        var notification = new Notification
        {
            UserId = request.UserId!.Value,
            Title = request.Title,
            Message = request.Message
        };
        await _context.Notifications.AddAsync(notification);
        await _context.SaveChangesAsync();
    }
}
```

### Fire-and-Forget Pattern (always used)

```csharp
// In command handlers — never await the notification send
_ = _notificationService.SendAsync(notificationRequest)
    .ContinueWith(t => _logger.LogError(t.Exception, "Notification failed: {Title}", notificationRequest.Title),
                  TaskContinuationOptions.OnlyOnFaulted);
```

---

## EMAIL TEMPLATES

Create HTML email templates for each notification type. All templates include clinic branding header (name, logo from ClinicSettings):

| Template | Subject |
|---|---|
| BookingConfirmed | "Booking Confirmed — You are #[N] for Dr. [Name]" |
| BookingCancelled | "Booking Cancelled — [Clinic Name]" |
| BookingExpired | "Your booking slot has expired — [Clinic Name]" |
| PaymentReceiptGenerated | "Your Official Receipt — OR-[number]" |
| VisitSummaryGenerated | "Your Visit Summary from Dr. [Name]" |
| AppointmentReminder24hr | "Reminder: Your appointment is tomorrow" |
| AppointmentReminder1hr | "Reminder: Your appointment is in 1 hour" |
| VaccinationReminder | "Vaccination Reminder: [Vaccine Name] due soon" |
| InviteStaff | "You've been invited to [Clinic Name]" |
| InviteDoctor | "You've been invited to join [Clinic Name] as a Doctor" |
| ForgotPassword | "Reset Your Password" |
| EmailVerification | "Verify Your Email Address" |

Use simple, clean HTML with inline styles (no external CSS — email clients strip it).

---

## FCM SERVICE

```csharp
public interface IFcmService
{
    Task SendAsync(string deviceToken, string title, string body);
}

// Implementation using Firebase Admin SDK
public class FcmService : IFcmService
{
    public async Task SendAsync(string deviceToken, string title, string body)
    {
        var message = new Message
        {
            Token = deviceToken,
            Notification = new FirebaseAdmin.Messaging.Notification
            {
                Title = title,
                Body = body
            }
        };

        await FirebaseMessaging.DefaultInstance.SendAsync(message);
    }
}
```

FCM device token storage: add `FcmDeviceToken` field to Users table:
```sql
ALTER TABLE Users ADD FcmDeviceToken NVARCHAR(500) NULL;
```

Add endpoint to register/update FCM token:
```
POST /api/v1/notifications/register-device
Body: { "deviceToken": "..." }
[Authorize]
```

---

## COMPLETE NOTIFICATION TRIGGER WIRING

Verify all triggers are wired correctly in their respective command handlers. Missing triggers to add:

| Event | Handler | Trigger |
|---|---|---|
| New booking created | `CreateBookingCommandHandler` | Notify Admin + Staff (all staff in DB) |
| Proof submitted | `SubmitProofCommandHandler` | Notify Admin + Staff |
| Booking confirmed | `ConfirmBookingCommandHandler` | Notify Patient (QueueNumber, ORNumber) |
| Booking rejected | `RejectBookingCommandHandler` | Notify Patient |
| Booking cancelled | `CancelBookingCommandHandler` | Notify Patient |
| Booking expired | `ResolveStaleBookingsAsync` | Notify Patient (best effort) |
| Booking on hold | `ResolveStaleBookingsAsync` | Notify Admin + Staff |
| Payment receipt generated | `GeneratePaymentReceiptCommandHandler` | Email Patient with PDF |
| Visit summary generated | `GenerateVisitSummaryCommandHandler` | Email Patient with PDF |
| No show set | `NoShowCommandHandler` | Notify Patient |
| Refund processed | `MarkRefundCommandHandler` | Notify Patient |
| Staff invite | `CreateStaffCommandHandler` | Invite email to new Staff |
| Doctor invite | `CreateDoctorCommandHandler` | Invite email to new Doctor |
| Staff invite resent | `ResendStaffInviteCommandHandler` | Invite email resend |

---

## CRON JOB ENDPOINT

```csharp
// POST /api/v1/jobs/run-reminders
// Protected by X-Cron-Secret header (configured in appsettings)
// Called every 30 minutes by cron-job.org

[HttpPost("run-reminders")]
[AllowAnonymous] // guarded by secret header, not JWT
public async Task<IActionResult> RunReminders([FromHeader(Name = "X-Cron-Secret")] string secret)
{
    if (secret != _settings.CronSecret)
        return Unauthorized();

    await _sender.Send(new RunRemindersCommand());
    return Ok(new { message = "Reminders processed" });
}
```

### RunRemindersCommand

Processes in sequence:

**1. Appointment reminders (24 hours before)**
```csharp
var tomorrow = DateTime.UtcNow.AddHours(24);
var bookings = await _context.Bookings
    .Where(b => b.Status == BookingStatus.Confirmed
             && !b.ReminderSent24hr
             && !b.IsDeleted
             && b.AppointmentDate.Date == tomorrow.Date)
    .Include(b => b.Patient.User)
    .Include(b => b.Doctor)
    .ToListAsync();

foreach (var booking in bookings)
{
    _ = _notificationService.SendAsync(new NotificationRequest { ... });
    booking.ReminderSent24hr = true;
}
```

**2. Appointment reminders (1 hour before)**
```csharp
var inOneHour = DateTime.UtcNow.AddHours(1);
var bookings = await _context.Bookings
    .Where(b => b.Status == BookingStatus.Confirmed
             && !b.ReminderSent1hr
             && !b.IsDeleted
             && b.AppointmentDate.Date == inOneHour.Date
             && b.SlotStartTime <= inOneHour.TimeOfDay
             && b.SlotStartTime > DateTime.UtcNow.TimeOfDay)
    ...
```

**3. Vaccination reminders** (already implemented in Phase 6 — move here for centralization)

**4. Daily unpaid summary (once per day at 6 PM)**
```csharp
// Only run if current time is between 18:00 and 18:30 (cron fires every 30 min)
if (DateTime.UtcNow.Hour == 18)
{
    var unpaid = await _context.Bookings
        .Where(b => b.Status == BookingStatus.Completed
                 && b.PaymentStatus == PaymentStatus.Unpaid
                 && b.AppointmentDate.Date == DateTime.UtcNow.Date
                 && !b.IsDeleted)
        .CountAsync();

    if (unpaid > 0)
    {
        // Send summary to all Admin + Staff users
    }
}
```

All reminder sends are fire-and-forget. Save `ReminderSent` flags after all sends queued.

---

## IN-APP NOTIFICATION ENDPOINTS

```csharp
// GET /api/v1/notifications
// Returns paginated notifications for current user, newest first
// Query params: page=1&pageSize=20

// PUT /api/v1/notifications/{id}/read
// Sets IsRead = true

// PUT /api/v1/notifications/read-all
// Sets IsRead = true for all user's notifications

// GET /api/v1/notifications/unread-count
// Returns { count: N }
```

---

## API ENDPOINTS

```
GET    /api/v1/notifications                    — authenticated user
GET    /api/v1/notifications/unread-count       — authenticated user
PUT    /api/v1/notifications/{id}/read          — authenticated user
PUT    /api/v1/notifications/read-all           — authenticated user
POST   /api/v1/notifications/register-device   — authenticated user (FCM token)
POST   /api/v1/jobs/run-reminders              — X-Cron-Secret header
```

---

## TASK

Formalize and complete the full notification system. Build on Phases 1–6.

Result must:
1. All notification triggers listed in PROJECT.md are wired in their correct command handlers
2. `POST /api/v1/jobs/run-reminders` (with correct secret) sends 24hr and 1hr appointment reminders
3. `ReminderSent24hr` and `ReminderSent1hr` flags prevent duplicate reminders
4. Vaccination reminders fire for next dose dates within 7 days
5. Daily unpaid summary sent at 6 PM to Admin + Staff
6. `GET /api/v1/notifications` returns paginated in-app notifications for current user
7. `GET /api/v1/notifications/unread-count` returns correct unread count
8. `PUT /api/v1/notifications/read-all` marks all as read
9. Receipt and visit summary emails include the PDF as an attachment
10. Invalid cron secret returns 401 (never 403 — don't reveal the route exists)
