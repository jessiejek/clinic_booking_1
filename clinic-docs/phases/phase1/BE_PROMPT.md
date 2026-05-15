# PHASE 1 — BE_PROMPT.md
## Foundation: Auth, Users, Roles, JWT, Refresh Tokens, Seeder

---

## CONTEXT

This is Phase 1 of the Clinic System backend. The goal is to scaffold the entire Clean Architecture solution and implement the authentication system — registration, login, JWT, refresh tokens, Google/Facebook OAuth, email verification, password reset, invite flow for Admin-created accounts, and account lockout.

At the end of this phase, the API must be runnable with seed data and all auth endpoints must be testable via Swagger.

---

## TECH STACK

- .NET 8, ASP.NET Core 8 Web API
- Clean Architecture: Domain / Application / Infrastructure / Persistence / API
- EF Core 8, SQL Server (LocalDB for dev)
- MediatR + FluentValidation + Mapster
- JWT (15 min access token) + Refresh Tokens (7 days, BCrypt hashed)
- BCrypt (work factor 12)
- Serilog + Seq
- Docker + docker-compose
- QuestPDF (install but do not implement documents yet)
- Cloudinary (install but do not implement uploads yet)

---

## SOLUTION SCAFFOLD

Create the solution with these projects:

```
ClinicSystem.sln
└── src/
    ├── ClinicSystem.Domain/
    ├── ClinicSystem.Application/
    ├── ClinicSystem.Infrastructure/
    ├── ClinicSystem.Persistence/
    └── ClinicSystem.API/
```

### Project References
- Domain → (none)
- Application → Domain
- Infrastructure → Application
- Persistence → Application
- API → Application, Infrastructure, Persistence

---

## DOMAIN LAYER

### Base Entities

```csharp
public abstract class BaseEntity
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

public abstract class SoftDeletableEntity : BaseEntity
{
    public bool IsDeleted { get; set; } = false;
    public DateTime? DeletedAt { get; set; }
}
```

### User Entity

```
Users
- Id (Guid)
- FullName (string, max 200)
- Email (string, max 200, unique)
- PasswordHash (string, nullable — null for OAuth-only accounts)
- Provider (enum: Local / Google / Facebook)
- ProviderId (string, nullable)
- Role (enum: Admin / Staff / Doctor / Patient)
- AvatarUrl (string, nullable)
- IsEmailVerified (bool, default false)
- EmailVerificationToken (string, nullable)
- PasswordResetToken (string, nullable)
- PasswordResetExpiresAt (datetime, nullable)
- RefreshToken (string, nullable — BCrypt hashed)
- RefreshTokenExpiresAt (datetime, nullable)
- FailedLoginAttempts (int, default 0)
- LockoutUntil (datetime, nullable)
- IsFirstLogin (bool, default true — for Admin-created accounts)
- InviteToken (string, nullable — hashed set-password token)
- InviteTokenExpiresAt (datetime, nullable)
- CreatedAt, UpdatedAt, IsDeleted, DeletedAt
```

### Enums

```csharp
public enum UserRole { Admin, Staff, Doctor, Patient }
public enum AuthProvider { Local, Google, Facebook }
```

---

## PERSISTENCE LAYER

### DbContext

- `ClinicDbContext` with `DbSet<User>`
- Global soft delete query filter: `.HasQueryFilter(e => !e.IsDeleted)`
- `SaveChangesAsync` override to auto-set `UpdatedAt`

### User Configuration (Fluent API)

```csharp
public class UserConfiguration : IEntityTypeConfiguration<User>
{
    public void Configure(EntityTypeBuilder<User> builder)
    {
        builder.HasIndex(u => u.Email).IsUnique();
        builder.Property(u => u.FullName).HasMaxLength(200).IsRequired();
        builder.Property(u => u.Email).HasMaxLength(200).IsRequired();
        builder.Property(u => u.Role).HasConversion<string>();
        builder.Property(u => u.Provider).HasConversion<string>();
    }
}
```

### Repository Interface (Application layer)

```csharp
public interface IUserRepository
{
    Task<User?> GetByIdAsync(Guid id);
    Task<User?> GetByEmailAsync(string email);
    Task<User?> GetByProviderAsync(AuthProvider provider, string providerId);
    Task AddAsync(User user);
    void Update(User user);
    Task<int> SaveChangesAsync();
}
```

### Seeder

Create `DatabaseSeeder` that runs when `--seed` flag is passed:

**Admin account**
- Email: admin@clinic.ph / Password: Admin@123456
- Role: Admin, IsEmailVerified: true, IsFirstLogin: false

**Staff account**
- Email: staff@clinic.ph / Password: Staff@123456
- Role: Staff, IsEmailVerified: true, IsFirstLogin: false

**Doctor accounts** (3)
- dr.santos@clinic.ph / Doctor@123456 — Dr. Maria Santos
- dr.reyes@clinic.ph / Doctor@123456 — Dr. Jose Reyes
- dr.cruz@clinic.ph / Doctor@123456 — Dr. Ana Cruz
- Role: Doctor, IsEmailVerified: true, IsFirstLogin: false

**Patient account**
- patient@clinic.ph / Patient@123456
- Role: Patient, IsEmailVerified: true

All passwords hashed with BCrypt work factor 12.

---

## APPLICATION LAYER — USE CASES

Implement the following MediatR Commands and Queries:

### RegisterCommand
- Input: FullName, Email, Password, ConfirmPassword
- Validates: email unique, password policy (min 8 chars, 1 uppercase, 1 number, 1 special char), passwords match
- Creates User with Role = Patient, Provider = Local, IsEmailVerified = false
- Generates EmailVerificationToken (random GUID)
- Fires email notification (fire-and-forget)
- Returns: UserId, Email, Role

### LoginCommand
- Input: Email, Password
- Validates: user exists, not deleted, password matches BCrypt hash
- Checks lockout: if `LockoutUntil > DateTime.UtcNow` → throw `LockoutException` with remaining minutes
- On failed password: increment `FailedLoginAttempts`; if count reaches 5, set `LockoutUntil = UtcNow + 5 minutes`
- On success: reset `FailedLoginAttempts = 0`, `LockoutUntil = null`
- Generates JWT access token (15 min) + refresh token (7 days, BCrypt hashed stored in DB)
- Returns: AccessToken, RefreshToken, User (Id, FullName, Email, Role, IsFirstLogin, AvatarUrl)

### RefreshTokenCommand
- Input: RefreshToken
- Finds user by matching BCrypt refresh token
- Validates: token not expired
- Issues new access token + new refresh token (rotation — old token invalidated)
- Returns: AccessToken, RefreshToken

### LogoutCommand
- Input: (authenticated user from JWT claims)
- Clears RefreshToken + RefreshTokenExpiresAt on user
- Returns: success

### VerifyEmailCommand
- Input: Token
- Finds user by EmailVerificationToken
- Sets IsEmailVerified = true, clears token
- Returns: success

### ForgotPasswordCommand
- Input: Email
- If user exists: generates PasswordResetToken (GUID), sets PasswordResetExpiresAt = UtcNow + 1 hour
- Sends reset email (fire-and-forget)
- Always returns success (never reveal if email exists)

### ResetPasswordCommand
- Input: Token, NewPassword, ConfirmPassword
- Finds user by PasswordResetToken where PasswordResetExpiresAt > UtcNow
- Validates password policy
- Sets new BCrypt hashed password, clears reset token
- Returns: success

### SetPasswordCommand (for invite flow)
- Input: InviteToken, NewPassword, ConfirmPassword
- Finds user by hashed InviteToken where InviteTokenExpiresAt > UtcNow
- Validates password policy
- Sets password, clears invite token, sets IsFirstLogin = false
- Returns: AccessToken, RefreshToken (logs user in immediately)

### GoogleLoginCommand
- Input: GoogleIdToken
- Validates token via Google OAuth API
- If user exists by ProviderId → login flow (generate JWT + refresh)
- If user does not exist → create new Patient account with Provider = Google
- Returns: AccessToken, RefreshToken, User

### FacebookLoginCommand
- Input: FacebookAccessToken
- Validates token via Facebook Graph API
- Same flow as Google
- Returns: AccessToken, RefreshToken, User

---

## API LAYER — CONTROLLERS

### AuthController

```
POST /api/v1/auth/register         → RegisterCommand
POST /api/v1/auth/login            → LoginCommand
POST /api/v1/auth/google           → GoogleLoginCommand
POST /api/v1/auth/facebook         → FacebookLoginCommand
POST /api/v1/auth/refresh          → RefreshTokenCommand
POST /api/v1/auth/verify-email     → VerifyEmailCommand
POST /api/v1/auth/forgot-password  → ForgotPasswordCommand
POST /api/v1/auth/reset-password   → ResetPasswordCommand
POST /api/v1/auth/logout           → LogoutCommand [Authorize]
POST /api/v1/auth/set-password     → SetPasswordCommand
```

All endpoints return consistent response envelope:
```json
{
  "success": true,
  "data": { ... },
  "error": null
}
```

---

## INFRASTRUCTURE LAYER

### Email Service (SMTP via MailKit)

```csharp
public interface IEmailService
{
    Task SendAsync(string to, string subject, string htmlBody);
}
```

Implement using MailKit. Email templates needed for Phase 1:
- Email verification
- Password reset
- Welcome / invite (for Staff/Doctor accounts — implemented in Phase 2)

### JWT Service

```csharp
public interface IJwtService
{
    string GenerateAccessToken(User user);
    ClaimsPrincipal? ValidateToken(string token);
}
```

Claims in token: `sub` (userId), `email`, `role`, `jti`

---

## MIDDLEWARE

### ExceptionHandlingMiddleware

Catches all unhandled exceptions and returns consistent error envelope:

```json
{ "status": 400, "error": "Validation failed", "details": ["..."] }
```

| Exception | Status |
|---|---|
| ValidationException | 400 |
| NotFoundException | 404 |
| ForbiddenException | 403 |
| ConflictException | 409 |
| LockoutException | 423 |
| UnauthorizedException | 401 |
| All others | 500 (log full exception, return generic message) |

### MediatR Pipeline Behaviors

1. `LoggingBehavior` — logs request name + execution time via Serilog
2. `ValidationBehavior` — runs FluentValidation, throws ValidationException
3. `TransactionBehavior` — wraps Commands in EF Core transaction

---

## SECURITY

- HTTPS enforced
- Rate limiting on auth endpoints: 10 requests/minute per IP
- JWT validation on all `[Authorize]` endpoints
- BCrypt work factor 12 for all password and token hashing
- Never return PasswordHash, RefreshToken (raw), or any hashed field in API responses
- Input validation via FluentValidation on all commands

---

## DOCKER

Create `Dockerfile` and `docker-compose.yml` as specified in BE_TECH_STACK.md.

---

## HEALTH CHECK

```
GET /health → checks SQL Server connectivity
```

---

## SWAGGER

- Enable Swagger in development
- Configure JWT Bearer authentication in Swagger UI
- All endpoints documented with request/response examples

---

## TASK

Scaffold the complete Clean Architecture solution and implement all auth endpoints listed above. The result must:

1. Build with `dotnet build` — zero errors, zero warnings
2. Apply migrations with `dotnet ef database update`
3. Seed with `dotnet run -- --seed`
4. All auth endpoints testable via Swagger at `https://localhost:7001/swagger`
5. Login with `admin@clinic.ph / Admin@123456` must return a valid JWT
6. JWT must be usable on `[Authorize]` endpoints
7. Lockout must trigger after 5 failed login attempts
8. Refresh token rotation must work
9. Docker compose must build and run
