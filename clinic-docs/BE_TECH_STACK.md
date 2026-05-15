# CLINIC SYSTEM — BE_TECH_STACK.md
> Backend technology decisions, conventions, and patterns. All backend code must follow this document.

---

## TECH STACK

| Layer | Technology |
|---|---|
| Runtime | .NET 8 |
| Framework | ASP.NET Core 8 Web API |
| Architecture | Clean Architecture (5 layers) |
| ORM | Entity Framework Core 8 |
| Database | SQL Server (LocalDB for dev, full SQL Server for prod) |
| Auth | JWT + Refresh Tokens + Google OAuth + Facebook OAuth |
| Validation | FluentValidation |
| Mapping | Mapster |
| Mediator | MediatR |
| Email | SMTP (MailKit) |
| Push Notifications | Firebase FCM (free tier) |
| File Storage | Cloudinary |
| PDF Generation | QuestPDF |
| Logging | Serilog + Seq |
| Health Checks | ASP.NET Core Health Checks |
| Background Jobs | No Hangfire — lazy expiry + external cron + Task.Run |
| Containerization | Docker + docker-compose |

---

## SOLUTION STRUCTURE

```
ClinicSystem.sln
└── src/
    ├── ClinicSystem.Domain/
    ├── ClinicSystem.Application/
    ├── ClinicSystem.Infrastructure/
    ├── ClinicSystem.Persistence/
    └── ClinicSystem.API/
```

### Layer Rules
- **Domain** — pure C#, zero dependencies. Entities, Enums, Domain Events, Value Objects.
- **Application** — depends only on Domain. MediatR Commands/Queries, DTOs, Interfaces, FluentValidation Validators.
- **Infrastructure** — implements Application interfaces. Email, Push, Cloudinary, OAuth, QuestPDF. Never references Persistence.
- **Persistence** — EF Core DbContext, Repositories, Migrations, Seeders. Implements repository interfaces from Application.
- **API** — ASP.NET Core controllers, middleware, DI registration, Program.cs. References all layers for wiring only.

---

## ENTITY CONVENTIONS

```csharp
// Base entity — all entities inherit this
public abstract class BaseEntity
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

// Soft-deletable entities also inherit this
public abstract class SoftDeletableEntity : BaseEntity
{
    public bool IsDeleted { get; set; } = false;
    public DateTime? DeletedAt { get; set; }
}
```

- All primary keys are `Guid`
- All timestamps are `DateTime` in UTC
- Soft delete via `IsDeleted` + `DeletedAt` — never hard delete except where noted
- EF Core global query filters applied to all `SoftDeletableEntity` types: `.HasQueryFilter(e => !e.IsDeleted)`

---

## MEDIATR PATTERN

Every use case is a MediatR Command or Query. No business logic in controllers.

```
Application/
└── Features/
    └── Bookings/
        ├── Commands/
        │   ├── CreateBooking/
        │   │   ├── CreateBookingCommand.cs
        │   │   ├── CreateBookingCommandHandler.cs
        │   │   └── CreateBookingCommandValidator.cs
        │   └── ConfirmBooking/
        │       ├── ConfirmBookingCommand.cs
        │       └── ConfirmBookingCommandHandler.cs
        └── Queries/
            ├── GetBookings/
            │   ├── GetBookingsQuery.cs
            │   └── GetBookingsQueryHandler.cs
            └── GetAvailableSlots/
                ├── GetAvailableSlotsQuery.cs
                └── GetAvailableSlotsQueryHandler.cs
```

### MediatR Pipeline Behaviors (in order)
1. `LoggingBehavior` — logs request name + execution time
2. `ValidationBehavior` — runs FluentValidation, throws `ValidationException` on failure
3. `TransactionBehavior` — wraps Commands (not Queries) in a DB transaction

---

## CONTROLLER CONVENTIONS

```csharp
[ApiController]
[Route("api/v1/[controller]")]
public class BookingsController : ControllerBase
{
    private readonly ISender _sender;

    public BookingsController(ISender sender) => _sender = sender;

    [HttpPost]
    [Authorize(Roles = "Patient")]
    public async Task<IActionResult> Create([FromBody] CreateBookingCommand command)
    {
        var result = await _sender.Send(command);
        return Ok(result);
    }
}
```

- Controllers only: receive request → send to MediatR → return result
- No business logic in controllers
- Use `[Authorize(Roles = "...")]` for role-based access
- Use `[AllowAnonymous]` for public endpoints

---

## FLUENT VALIDATION CONVENTIONS

```csharp
public class CreateBookingCommandValidator : AbstractValidator<CreateBookingCommand>
{
    public CreateBookingCommandValidator()
    {
        RuleFor(x => x.DoctorId).NotEmpty();
        RuleFor(x => x.AppointmentDate).GreaterThan(DateTime.Today);
        RuleFor(x => x.ServiceId).NotEmpty();
    }
}
```

- One validator per Command
- Validators registered automatically via `AddValidatorsFromAssembly`
- `ValidationBehavior` pipeline behavior throws `ValidationException` — caught by global exception middleware

---

## MAPSTER CONVENTIONS

```csharp
// In Application layer — TypeAdapterConfig or [AdaptTo] attributes
public class BookingDto
{
    public Guid Id { get; set; }
    public string PatientName { get; set; }
    public DateTime AppointmentDate { get; set; }
    // ...
}

// In handler
var dto = booking.Adapt<BookingDto>();
```

- Use Mapster for all entity → DTO mappings
- Never return raw entities from handlers — always return DTOs
- Configure custom mappings in a `MappingConfig` class registered at startup

---

## JWT + AUTH CONVENTIONS

```
JWT Access Token:  15 minutes
Refresh Token:     7 days (hashed with BCrypt, stored in Users.RefreshToken)
Password Hash:     BCrypt work factor 12
```

### Token Claims
```csharp
// Standard claims in every JWT
sub    = userId (Guid)
email  = user email
role   = Admin | Staff | Doctor | Patient
jti    = unique token ID
```

### Refresh Token Flow
1. Client sends expired access token + refresh token to `POST /api/v1/auth/refresh`
2. API validates refresh token hash, issues new access token + new refresh token
3. Old refresh token is invalidated (rotation)

### Account Lockout
- `FailedLoginAttempts` incremented on each failed login
- On 5th failure: `LockoutUntil = DateTime.UtcNow.AddMinutes(5)`
- On successful login: reset `FailedLoginAttempts = 0`, `LockoutUntil = null`
- If `LockoutUntil > DateTime.UtcNow` → return `423 Locked` with remaining minutes

### Invite Flow (Admin-Created Accounts)
1. Admin creates Staff/Doctor → system generates `InviteToken` (GUID, hashed) + `InviteTokenExpiresAt = +24hrs`
2. Email sent with set-password link: `https://{domain}/set-password?token={raw-token}`
3. `POST /api/v1/auth/set-password` validates token, sets password, marks `IsFirstLogin = false`
4. Token expires after 24hrs — Admin can resend via `POST /api/v1/staff/{id}/resend-invite`

### First Login Force
- If `IsFirstLogin = true` → API returns `403` with code `FORCE_PASSWORD_CHANGE`
- Frontend redirects to change-password page
- After password changed → `IsFirstLogin = false`

---

## EF CORE CONVENTIONS

```csharp
// DbContext
public class ClinicDbContext : DbContext
{
    // Global soft delete filter applied in OnModelCreating
    // RowVersion concurrency token on Bookings
    // All string columns have explicit MaxLength
}
```

- Use **Fluent API** for all configuration (no Data Annotations except `[NotMapped]`)
- Each entity has its own `IEntityTypeConfiguration<T>` class in `Persistence/Configurations/`
- Migrations in `Persistence/Migrations/`
- Seeders in `Persistence/Seeders/` — run via `--seed` flag on startup
- Always use `.AsNoTracking()` on read-only queries
- Use serializable transactions for booking creation (concurrency safety)

```csharp
// Concurrency token on Bookings
builder.Property(b => b.RowVersion)
    .IsRowVersion()
    .IsConcurrencyToken();
```

---

## REPOSITORY PATTERN

```csharp
// Generic interface in Application layer
public interface IRepository<T> where T : BaseEntity
{
    Task<T?> GetByIdAsync(Guid id);
    Task<IReadOnlyList<T>> GetAllAsync();
    Task AddAsync(T entity);
    void Update(T entity);
    void Delete(T entity); // sets IsDeleted = true
    Task<int> SaveChangesAsync();
}

// Specific repository interfaces extend generic
public interface IBookingRepository : IRepository<Booking>
{
    Task<int> GetSlotOccupancyAsync(Guid doctorId, DateTime date, TimeSpan slotStart);
    Task<int> GetDailyPatientCountAsync(Guid doctorId, DateTime date);
    Task ResolveStaleBookingsAsync(Guid doctorId, DateTime date);
}
```

---

## LAZY EXPIRY PATTERN

Shared method `ResolveStaleBookingsAsync` called at top of any handler returning booking/slot data:

```csharp
private async Task ResolveStaleBookingsAsync(Guid doctorId, DateTime date)
{
    var stale = await _context.Bookings
        .Where(b => b.DoctorId == doctorId && b.AppointmentDate == date && !b.IsDeleted)
        .ToListAsync();

    foreach (var booking in stale)
    {
        // Pending > 10 min → Expired
        if (booking.Status == BookingStatus.Pending &&
            booking.CreatedAt < DateTime.UtcNow.AddMinutes(-10))
        {
            booking.Status = BookingStatus.Expired;
        }

        // ProofSubmitted > 1 hr → OnHold
        if (booking.Status == BookingStatus.ProofSubmitted &&
            booking.ProofSubmittedAt < DateTime.UtcNow.AddHours(-1))
        {
            booking.Status = BookingStatus.OnHold;
        }

        // PayAtClinic Confirmed Unpaid past window → NoShow
        if (booking.Status == BookingStatus.Confirmed &&
            booking.PaymentMode == PaymentMode.PayAtClinic &&
            booking.PaymentStatus == PaymentStatus.Unpaid &&
            booking.SlotStartTime < DateTime.UtcNow.AddMinutes(-_settings.PayAtClinicNoShowWindowMinutes))
        {
            booking.Status = BookingStatus.NoShow;
        }
    }

    await _context.SaveChangesAsync();
}
```

---

## PDF GENERATION (QuestPDF)

```csharp
// Infrastructure/Documents/PaymentReceiptDocument.cs
public class PaymentReceiptDocument : IDocument
{
    private readonly PaymentReceiptData _data;

    public void Compose(IDocumentContainer container)
    {
        container.Page(page =>
        {
            page.Header().Element(ComposeHeader);
            page.Content().Element(ComposeContent);
            page.Footer().Element(ComposeFooter);
        });
    }
}
```

- One document class per document type
- All documents use clinic branding from `ClinicSettings`
- Generated PDFs uploaded to Cloudinary → URL stored in `GeneratedDocuments` and `PatientAttachments`
- For `PaymentReceipt`: also stored in `Bookings.ReceiptUrl` and `Payments.ORNumber`
- For `VisitSummary`: also stored in `Consultations.VisitSummaryUrl`

---

## OR NUMBER GENERATION

```csharp
// Atomic OR number generation using DB sequence or locked increment
public async Task<string> GenerateORNumberAsync()
{
    // Get next sequence value — use SELECT + UPDATE with row lock
    var settings = await _context.ClinicSettings
        .FromSqlRaw("SELECT * FROM ClinicSettings WITH (UPDLOCK, ROWLOCK)")
        .FirstAsync();

    // ORSequence stored separately or as a field on ClinicSettings
    var nextSequence = ++settings.ORSequence;
    var year = DateTime.UtcNow.Year;
    await _context.SaveChangesAsync();

    return $"OR-{year}-{nextSequence:D5}"; // OR-2025-00001
}
```

---

## NOTIFICATION SERVICE

```csharp
public interface INotificationService
{
    Task SendAsync(NotificationRequest request);
}

// Fire-and-forget pattern
_ = _notificationService.SendAsync(new NotificationRequest
{
    UserId = booking.PatientId,
    Title = "Booking Confirmed",
    Message = $"You are #{booking.QueueNumber} for Dr. {doctorName} today.",
    Channel = NotificationChannel.All // In-app + Email + Push
})
.ContinueWith(t => _logger.LogError(t.Exception, "Notification failed"),
              TaskContinuationOptions.OnlyOnFaulted);
```

---

## SERILOG CONFIGURATION

```csharp
// Program.cs
Log.Logger = new LoggerConfiguration()
    .ReadFrom.Configuration(builder.Configuration)
    .Enrich.FromLogContext()
    .Enrich.WithMachineName()
    .WriteTo.Console()
    .WriteTo.Seq("http://localhost:5341")
    .CreateLogger();
```

- Log all requests via `LoggingBehavior` pipeline behavior
- Log all unhandled exceptions via global exception middleware
- Never log: passwords, tokens, medical record content
- Log: request name, duration, user ID, IP address

---

## GLOBAL EXCEPTION MIDDLEWARE

```csharp
// Catches all unhandled exceptions — never expose stack traces
app.UseMiddleware<ExceptionHandlingMiddleware>();

// Returns consistent error envelope
{
  "status": 400,
  "error": "Validation failed",
  "details": ["DoctorId is required", "AppointmentDate must be in the future"]
}
```

| Exception Type | HTTP Status |
|---|---|
| `ValidationException` | 400 Bad Request |
| `NotFoundException` | 404 Not Found |
| `ForbiddenException` | 403 Forbidden |
| `ConflictException` | 409 Conflict |
| `LockoutException` | 423 Locked |
| `UnauthorizedException` | 401 Unauthorized |
| All others | 500 Internal Server Error |

---

## HEALTH CHECKS

```csharp
builder.Services.AddHealthChecks()
    .AddSqlServer(connectionString)
    .AddUrlGroup(new Uri("https://api.cloudinary.com"), "cloudinary");

app.MapHealthChecks("/health");
```

---

## DOCKER

```dockerfile
# Dockerfile
FROM mcr.microsoft.com/dotnet/aspnet:8.0
WORKDIR /app
COPY --from=build /app/publish .
ENTRYPOINT ["dotnet", "ClinicSystem.API.dll"]
```

```yaml
# docker-compose.yml
services:
  api:
    build: .
    ports:
      - "7001:8080"
    environment:
      - ASPNETCORE_ENVIRONMENT=Production
    depends_on:
      - db

  db:
    image: mcr.microsoft.com/mssql/server:2022-latest
    environment:
      - ACCEPT_EULA=Y
      - SA_PASSWORD=YourStrong@Password
```

---

## APPSETTINGS STRUCTURE

```json
{
  "JwtSettings": {
    "SecretKey": "",
    "Issuer": "ClinicSystem",
    "Audience": "ClinicSystemClients",
    "AccessTokenExpiryMinutes": 15,
    "RefreshTokenExpiryDays": 7
  },
  "SmtpSettings": {
    "Host": "",
    "Port": 587,
    "Username": "",
    "Password": "",
    "FromEmail": "",
    "FromName": ""
  },
  "Firebase": {
    "ProjectId": "",
    "ServiceAccountKeyPath": ""
  },
  "Cloudinary": {
    "CloudName": "",
    "ApiKey": "",
    "ApiSecret": ""
  },
  "CronSettings": {
    "Secret": ""
  },
  "Google": {
    "ClientId": "",
    "ClientSecret": ""
  },
  "Facebook": {
    "AppId": "",
    "AppSecret": ""
  }
}
```

---

## HOW TO RUN

```bash
# Install EF tools
dotnet tool install --global dotnet-ef

# Restore
dotnet restore

# Apply migrations
dotnet ef database update --project src/ClinicSystem.Persistence --startup-project src/ClinicSystem.API

# Seed
dotnet run --project src/ClinicSystem.API -- --seed

# Run
dotnet run --project src/ClinicSystem.API
```

API: `https://localhost:7001`
Swagger: `https://localhost:7001/swagger`
Health: `https://localhost:7001/health`
