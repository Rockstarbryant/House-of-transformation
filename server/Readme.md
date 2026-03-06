# House of Transformation Church — Backend API

A RESTful API server powering the House of Transformation church management platform. Built with Node.js and Express, it handles authentication, content management, real-time announcements, M-Pesa payment processing, and a granular role-based permission system.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Tech Stack](#2-tech-stack)
3. [Architecture Overview](#3-architecture-overview)
4. [Project Folder Structure](#4-project-folder-structure)
5. [Database Models](#5-database-models)
6. [Authentication System](#6-authentication-system)
7. [Role & Permission System](#7-role--permission-system)
8. [Middleware Stack](#8-middleware-stack)
9. [API Routes Reference](#9-api-routes-reference)
10. [M-Pesa Integration](#10-m-pesa-integration)
11. [Email Service](#11-email-service)
12. [Real-Time Announcements (SSE)](#12-real-time-announcements-sse)
13. [AI Services](#13-ai-services)
14. [File Uploads](#14-file-uploads)
15. [Audit Logging](#15-audit-logging)
16. [Idempotency](#16-idempotency)
17. [Scheduled Jobs](#17-scheduled-jobs)
18. [Error Handling](#18-error-handling)
19. [Environment Variables](#19-environment-variables)
20. [Installation Guide](#20-installation-guide)
21. [Running the Server](#21-running-the-server)
22. [Deployment Notes](#22-deployment-notes)
23. [Security Considerations](#23-security-considerations)

---

## 1. Project Overview

This is the backend API for the House of Transformation (H.O.T) Church platform. It serves a Next.js frontend (see frontend README) through a single REST API mounted at `/api`.

Key responsibilities:

- Supabase JWT verification and user session management
- Granular role-based access control (RBAC) enforced at the middleware level
- Content management: sermons, blog, events, gallery, livestreams, feedback, volunteers
- M-Pesa STK Push payment processing with callback verification
- Real-time announcement delivery via Server-Sent Events (SSE)
- Email delivery via configurable SMTP (settings stored in MongoDB)
- AI-powered sermon caption and transcript summarization
- Audit trail for all API actions

---

## 2. Tech Stack

| Category | Technology |
|---|---|
| Runtime | Node.js 18.x / 20.x |
| Framework | Express.js 4.x |
| Database | MongoDB Atlas via Mongoose 7.x |
| Authentication | Supabase (`@supabase/supabase-js`) |
| Image Storage | Cloudinary (multer-storage-cloudinary) |
| Email | Nodemailer (SMTP, configurable via DB) |
| Payments | M-Pesa Daraja API (STK Push) |
| AI | Anthropic Claude SDK + Google Gemini |
| Rate Limiting | express-rate-limit |
| File Uploads | Multer |
| Content Security | isomorphic-dompurify |
| Unique IDs | uuid |
| Validation | express-validator, validator |
| Logging | morgan |
| Dev Server | nodemon |

---

## 3. Architecture Overview

```
┌─────────────────────────────────────────────────┐
│              Express Application                  │
│                                                   │
│  Trust Proxy → Body Parser → CORS → Static        │
│          ↓                                        │
│  auditMiddleware (all /api/* routes)              │
│          ↓                                        │
│  apiLimiter (1000 req / 15 min)                   │
│          ↓                                        │
│  ┌────────────┐  ┌──────────────┐  ┌───────────┐ │
│  │ Public     │  │ Mixed Auth   │  │ Protected │ │
│  │ Routes     │  │ Routes       │  │ Routes    │ │
│  │ (no JWT)   │  │ (optionalAuth│  │ (protect  │ │
│  │            │  │  or protectSSE│  │  required)│ │
│  └────────────┘  └──────────────┘  └───────────┘ │
│          ↓                                        │
│  requirePermission (per-route enforcement)        │
│          ↓                                        │
│  Controllers → Services → Mongoose Models         │
│                                                   │
│  404 Handler → Global Error Handler               │
└─────────────────────────────────────────────────┘
         │                        │
┌────────▼────────┐    ┌──────────▼──────────┐
│  MongoDB Atlas  │    │  Supabase Auth       │
│  (content, users│    │  (identity store,    │
│   roles, audit) │    │   JWT verification)  │
└─────────────────┘    └─────────────────────┘
         │
┌────────▼────────┐
│  Cloudinary     │
│  (image storage)│
└─────────────────┘
```

### Request Lifecycle

```
Incoming Request
  → Trust Proxy (reads X-Forwarded-For)
  → express.json() body parsing
  → CORS validation (origin whitelist)
  → auditMiddleware (logs action metadata)
  → apiLimiter (rate check)
  → Route-specific auth middleware (protect / optionalAuth / protectSSE)
  → requirePermission (permission string check)
  → asyncHandler (catches async errors)
  → Controller
  → Response
```

---

## 4. Project Folder Structure

```
server/
├── server.js                   # Entry point: middleware stack, route mounting, server start
├── package.json
├── config/
│   ├── database.js             # Mongoose connection with pool settings
│   ├── env.js                  # Centralised env var exports
│   ├── cloudinaryConfig.js     # Cloudinary SDK init + multer-cloudinary storage
│   └── validateEnv.js          # Startup env validation
├── middleware/
│   ├── supabaseAuth.js         # protect, optionalAuth, authorize (Supabase JWT verification)
│   ├── requirePermission.js    # Granular permission enforcement + admin bypass
│   ├── auditMiddleware.js      # Request-level audit logging
│   ├── sseAuth.js              # protectSSE (SSE-specific auth, token from query param)
│   ├── rateLimiter.js          # apiLimiter, authLimiter, signupLimiter
│   ├── idempotencyMiddleware.js # Duplicate payment prevention
│   ├── roleAuth.js             # Role name authorization helper
│   ├── errorHandler.js         # Global error handler (Mongoose + JWT + default)
│   ├── asyncHandler.js         # try/catch wrapper for async controllers
│   ├── upload.js               # Multer disk storage (local fallback)
│   └── validation.js           # express-validator rule sets
├── models/
│   ├── User.js                 # User schema (supabase_uid, role ref, ban fields)
│   ├── Role.js                 # Role schema (name, permissions enum array)
│   ├── Announcement.js         # Announcement schema (SSE-driven)
│   ├── Campaign.js             # Donation campaign schema
│   ├── Settings.js             # Singleton system settings (MPESA, email, features)
│   ├── Blog.js
│   ├── Sermon.js
│   ├── Event.js
│   ├── Gallery.js
│   ├── Feedback.js
│   ├── Volunteer.js
│   ├── BannedUser.js
│   ├── AuditLog.js
│   ├── TransactionAuditLog.js
│   ├── EmailLog.js
│   ├── EmailTemplate.js
│   ├── Notice.js
│   ├── ReceivedEmail.js
│   └── livestreamModel.js
├── controllers/
│   ├── authController.js       # signup, login, logout, refresh, forgotPassword, resetPassword
│   ├── userController.js       # CRUD, ban, self-delete, manual registration, bulk ops
│   ├── announcementController.js # CRUD + SSE stream endpoint
│   ├── analyticsController.js
│   ├── blogController.js
│   ├── campaignController.js
│   ├── contributionController.js
│   ├── donationAnalyticsController.js
│   ├── emailNotificationController.js
│   ├── eventController.js
│   ├── feedbackController.js
│   ├── galleryController.js
│   ├── livestreamController.js
│   ├── mpesaCallbackController.js
│   ├── noticeController.js
│   ├── paymentController.js
│   ├── pledgeController.js
│   ├── roleController.js
│   ├── sermonController.js
│   ├── settingsController.js
│   ├── transactionAuditController.js
│   └── volunteerController.js
├── routes/
│   ├── authRoutes.js
│   ├── userRoutes.js
│   ├── announcementRoutes.js
│   ├── analyticsRoutes.js
│   ├── blogRoutes.js
│   ├── campaignRoutes.js
│   ├── contributionRoutes.js
│   ├── donationAnalyticsRoutes.js
│   ├── emailNotificationRoutes.js
│   ├── eventRoutes.js
│   ├── feedbackRoutes.js
│   ├── galleryRoutes.js
│   ├── livestreamRoutes.js
│   ├── mpesaCallbackRoutes.js
│   ├── noticeRoutes.js
│   ├── paymentRoutes.js
│   ├── pledgeRoutes.js
│   ├── roleRoutes.js
│   ├── sermonRoutes.js
│   ├── settingsRoutes.js
│   ├── transactionAuditRoutes.js
│   └── volunteerRoutes.js
├── services/
│   ├── mpesaService.js         # STK Push, token caching, C2B URL registration
│   ├── mpesaVerificationService.js # Callback validation, receipt verification
│   ├── emailService.js         # Nodemailer singleton, SMTP settings from DB
│   ├── auditService.js         # Audit log write helpers
│   ├── aiCaptionsService.js    # Cloudinary caption generation via AI
│   ├── aiSummaryFromTranscript.js # Sermon transcript summarization
│   ├── transcriptService.js    # YouTube transcript extraction
│   └── captionWorker.js        # Background caption job worker
├── utils/
│   └── cleanupJobs.js          # Cron jobs (expired idempotency keys, etc.)
├── scripts/                    # One-time migration and seeding scripts
│   ├── seedRoles.js
│   ├── createAdmin.js
│   ├── migrateUserRoles.js
│   └── ...
└── uploads/
    └── gallery/                # Local upload fallback (not used in production)
```

---

## 5. Database Models

### User

```
supabase_uid    String  unique  ← primary auth link to Supabase identity
name            String  required
username        String  unique, auto-generated from email if not provided
email           String  unique, required
phone           String
location        String
bio             String
avatar          String (Cloudinary URL)
gender          Enum: male | female
role            ObjectId → Role  (populated on every auth request)
authProvider    Enum: email | google | facebook | apple  default: email
ministries      [String]
isActive        Boolean  default: true
isBanned        Boolean  default: false
bannedAt        Date
bannedBy        ObjectId → User
banReason       String
```

Pre-save hook automatically assigns the `member` role if none is set. `toJSON()` strips the password field.

Indexes: `email`, `supabase_uid`, `role`, `createdAt`, `isActive`, `isBanned`, `authProvider`.

---

### Role

```
name            String  unique, lowercase  (e.g. "admin", "member", "usher")
description     String
permissions     [String]  enum (see full list in Section 7)
isSystemRole    Boolean  (system roles cannot be deleted)
```

Pre-save hook prevents modification of system role names. The `admin` role bypasses all permission checks in `requirePermission`.

---

### Announcement

```
title           String  max 200
content         String
priority        Enum: low | normal | high | urgent
category        Enum: general | event | service | urgent | ministry | technical
targetAudience  Enum: all | members | volunteers | staff | specific_roles
targetRoles     [ObjectId → Role]
author          ObjectId → User  required
expiresAt       Date  (null = no expiration)
isActive        Boolean  default: true
isPinned        Boolean  default: false
attachments     [{fileName, fileUrl, fileType, fileSize}]
readBy          [{user: ObjectId, readAt: Date}]
statistics      {totalViews, totalReads}
scheduledFor    Date
emailSent       Boolean
smsSent         Boolean
```

Virtual `isExpired` computed from `expiresAt`. Instance methods: `markAsRead(userId)`, `isReadBy(userId)`. Static `getActiveForUser(userId, userRole)` returns non-expired active announcements filtered by audience.

---

### Campaign

```
title           String  max 100, required
description     String  required
goalAmount      Number  required, min 0
currentAmount   Number  default 0
campaignType    Enum: building | mission | event | equipment | benevolence | offering
startDate       Date  required (must be ≤ endDate)
endDate         Date  required
status          Enum: draft | active | completed | archived  default: draft
visibility      Enum: public | members-only  default: public
allowPledges    Boolean  default: true
isFeatured      Boolean  default: false
imageUrl        String
supabaseId      String  unique, sparse
impactStatement String
milestones      [{amount, description, achieved, achievedDate}]
createdBy       ObjectId → User  required
```

Indexes: `status`, `campaignType`, `createdAt`, `{isFeatured, status}`.

---

### Settings (Singleton)

A single document accessed via `Settings.getSettings()`, which creates it with defaults if it doesn't exist.

Top-level sections:

| Section | Contents |
|---|---|
| `emailSettings` | SMTP host, port, user, password, fromEmail, fromName |
| `notificationSettings` | email/SMS/push flags, notify-on-event triggers |
| `securitySettings` | session timeout, password rules, login attempt limits |
| `paymentSettings` | M-Pesa config (consumerKey, shortcode, passkey, environment, callbackUrl), Stripe, PayPal, Flutterwave configs |
| `donationSettings` | enable flags, offering types, receipt settings, pledge reminder days |
| `maintenanceMode` | enabled flag, message, allowedIPs, estimatedTime |
| `features` | per-feature enable flags (blog, events, sermons, gallery, donations, volunteers, testimonies, livestream) |
| `seoSettings` | Google Analytics ID, Facebook Pixel, meta defaults |
| `socialMedia` | Facebook, YouTube, Instagram, Twitter, WhatsApp URLs |
| `livestreamSettings` | platform, channel IDs, enable chat |

---

### Other Models

| Model | Purpose |
|---|---|
| `Blog` | Blog posts with likes, views, categories, slugs, author ref |
| `Sermon` | Sermons with type (text/video), likes, bookmarks, views |
| `Event` | Events with registration records, capacity, seat tracking |
| `Gallery` | Photos with Cloudinary URLs, category, likes |
| `Feedback` | All 5 feedback types with category, feedbackData, status lifecycle |
| `Volunteer` | Applications with ministry, status, approved hours |
| `BannedUser` | Banned email + IP records for signup/login blocking |
| `AuditLog` | Full audit trail of all API actions |
| `TransactionAuditLog` | Payment-specific audit trail |
| `Notice` | Sticky website notice bar content |
| `EmailLog` | Record of all sent emails |
| `EmailTemplate` | Reusable email templates |
| `livestreamModel` | Livestream sessions with embed URLs, status, metadata |

---

## 6. Authentication System

Authentication is handled entirely by **Supabase**. The backend does not issue its own JWTs — it verifies Supabase-issued tokens on every protected request.

### `protect` middleware (`middleware/supabaseAuth.js`)

```
1. Extract Bearer token from Authorization header
2. Call supabase.auth.getUser(token) — verifies signature + expiry with Supabase
3. Look up MongoDB user by supabase_uid
4. Populate the user's Role document
5. Attach to req.user (includes role.permissions array)
```

If any step fails, the middleware returns `401` immediately. The MongoDB lookup ensures only users with a valid platform profile can access protected resources.

### `optionalAuth` middleware

Same flow as `protect`, but sets `req.user = null` on failure instead of returning `401`. Used on public routes that optionally personalise the response for authenticated users.

### `authorize(...roleNames)` middleware

Role-name check used for admin-only sections. Checks `user.role.name` against a list of allowed role names. Example:

```js
router.delete('/users/:id', protect, authorize('admin'), userController.deleteUser);
```

### OAuth Flow (Google)

Google OAuth is handled entirely by Supabase on the frontend. When the user lands on `/auth/callback`, the frontend calls `POST /api/auth/oauth-sync` to sync the Supabase user identity into the MongoDB `User` collection. The backend creates the MongoDB record if it doesn't exist, or updates the `supabase_uid` if signing in with a previously email-registered account.

### Auth Endpoints

| Method | Route | Description |
|---|---|---|
| POST | `/api/auth/signup` | Register with email/password (creates Supabase + MongoDB user) |
| POST | `/api/auth/login` | Login (legacy — Supabase handles this; kept for audit logging) |
| POST | `/api/auth/logout` | Log audit event |
| POST | `/api/auth/oauth-sync` | Sync OAuth user to MongoDB |
| GET | `/api/auth/verify` | Verify current token, return user profile |
| POST | `/api/auth/refresh` | Issue new token from expired one |
| POST | `/api/auth/forgot-password` | Send password reset email |
| POST | `/api/auth/reset-password/:token` | Reset password with token |
| GET | `/api/auth/verify-email/:token` | Verify email address |
| POST | `/api/auth/resend-verification` | Resend verification email |

---

## 7. Role & Permission System

### Role Model

Every user holds a reference to one `Role` document. The `admin` role is a system role that bypasses all permission checks.

### Permission Strings

Permissions follow the pattern `action:resource` or `action:resource:subtype`. The full enum enforced by the `Role` schema:

**Broad Management Permissions**
```
manage:events          manage:sermons         manage:gallery
manage:donations       manage:users           manage:roles
manage:blog            manage:livestream      manage:feedback
manage:volunteers      manage:settings        manage:announcements
```

**Granular Campaign Permissions**
```
view:campaigns    create:campaigns    edit:campaigns
delete:campaigns  activate:campaigns  feature:campaigns
```

**Granular Pledge Permissions**
```
view:pledges      view:pledges:all    approve:pledges    edit:pledges
```

**Granular Payment Permissions**
```
view:payments     view:payments:all   process:payments   verify:payments
```

**Donation Reports**
```
view:donation:reports
```

**Granular Feedback Permissions** (per category)
```
read:feedback:sermon       respond:feedback:sermon
read:feedback:service      respond:feedback:service
read:feedback:testimony    respond:feedback:testimony    publish:feedback:testimony
read:feedback:suggestion   respond:feedback:suggestion   archive:feedback:suggestion
read:feedback:prayer       respond:feedback:prayer       archive:feedback:prayer
read:feedback:general      respond:feedback:general      archive:feedback:general
archive:feedback:testimony  archive:feedback:sermon  archive:feedback:service
view:feedback:stats
```

**Analytics & System**
```
view:analytics     view:audit_logs
```

### Permission Expansion (`requirePermission.js`)

When a user holds a broad permission, the middleware automatically expands it to all related granular permissions. This prevents needing to assign both `manage:feedback` and every `read:feedback:*` string to a role.

| Broad Permission | Expands To |
|---|---|
| `manage:feedback` | All `read:feedback:*`, `respond:feedback:*`, `archive:feedback:*`, `publish:feedback:testimony`, `view:feedback:stats` |
| `manage:donations` | All campaign, pledge, payment, and donation report permissions |
| `manage:announcements` | `view:announcements`, `create:announcements`, `edit:announcements`, `delete:announcements` |

### Admin Bypass

If `user.role.name === 'admin'`, `requirePermission` skips all checks and calls `next()` immediately.

### Usage in Routes

```js
// Single permission
router.post('/events', protect, requirePermission('manage:events'), eventController.create);

// Any one of multiple permissions (OR logic)
router.get('/feedback', protect, requirePermission('manage:feedback', 'read:feedback:sermon'), feedbackController.getAll);

// Admin only
router.delete('/users/:id', protect, requireAdmin, userController.deleteUser);
```

---

## 8. Middleware Stack

### Global Middleware (applied in `server.js`)

```
app.set('trust proxy', 1)         — reads real IP from X-Forwarded-For
express.json()                    — JSON body parsing
express.urlencoded({ extended })  — form body parsing
cors(allowedOrigins)              — origin whitelist (dev vs production)
app.use('/uploads', static)       — serve local upload fallback
app.use('/api', auditMiddleware)  — audit all API routes
app.use('/api/', apiLimiter)      — rate limit all API routes
```

### CORS Origins

**Development:**
`http://localhost:3000`, `http://127.0.0.1:3000`, Postman

**Production:**
`FRONTEND_URL` env var, Netlify URL, Vercel URLs for frontend and admin

### Rate Limiting

| Limiter | Window | Max Requests | Skip Successful |
|---|---|---|---|
| `apiLimiter` | 15 min | 1000 | No |
| `authLimiter` | 15 min | 10 | Yes |
| `signupLimiter` | 15 min | 5 | No |

`standardHeaders: true` returns `RateLimit-*` headers. `legacyHeaders: false` suppresses `X-RateLimit-*`.

### `auditMiddleware`

Applied to all `/api/*` routes before authentication. Captures request metadata (method, path, IP, user agent) and writes an `AuditLog` entry via `auditService`. Attaches audit context to `req` for controllers to enrich with business-level data.

### `errorHandler`

Global Express error handler — must be registered last. Handles:

| Error Type | Response |
|---|---|
| `CastError` (Mongoose) | 404 — Resource not found |
| `code: 11000` (duplicate key) | 400 — `{field} already exists` |
| `ValidationError` (Mongoose) | 400 — Array of validation messages |
| `JsonWebTokenError` | 401 — Invalid token |
| All others | 500 in production (bare message), full stack in development |

---

## 9. API Routes Reference

### Route Mounting Order (important)

The server mounts routes in a deliberate order to prevent middleware conflicts:

```
1. /api/auth              — public, no auth
2. /api/settings/public   — public, no auth, no maintenance check
3. Public content routes  — no auth required (optionalAuth used internally)
4. /api/announcements     — mixed: SSE endpoint uses protectSSE, others use protect
5. Protected routes       — require protect middleware
6. 404 handler
7. Error handler
```

### Route Groups

**Public Routes (no authentication required)**

| Prefix | Resource |
|---|---|
| `/api/sermons` | Sermon listing and detail |
| `/api/blog` | Blog posts |
| `/api/events` | Events and registration |
| `/api/gallery` | Gallery photos |
| `/api/campaigns` | Donation campaigns |
| `/api/contributions` | Standalone contributions |
| `/api/pledges` | Pledge creation and user pledges |
| `/api/payments` | Payment initiation and status |
| `/api/mpesa` | M-Pesa callback handler |
| `/api/donations/analytics` | Public donation stats |
| `/api/livestreams` | Livestream sessions |
| `/api/feedback` | Feedback submission |
| `/api/volunteers` | Volunteer applications |
| `/api/notices` | Active notice bar content |

> Note: "Public" means no JWT is required. Individual endpoints within these route files may still use `optionalAuth` or `protect` for write operations (e.g., creating a blog post within `/api/blog` requires `protect` + `requirePermission('manage:blog')`).

**Mixed Auth Routes**

| Prefix | Notes |
|---|---|
| `/api/announcements` | `GET /stream` uses `protectSSE`; all other endpoints use `protect` |

**Protected Routes (require `protect` middleware)**

| Prefix | Required Permission |
|---|---|
| `/api/users` | `manage:users` (enforced in controller, not route middleware) |
| `/api/roles` | `manage:roles` |
| `/api/settings` | `manage:settings` |
| `/api/analytics` | `view:analytics` |
| `/api/audit` | `view:audit_logs` |
| `/api/transaction-audit` | `view:audit_logs` |
| `/api/email-notifications` | `manage:users` or admin |
| `/api/email` | Admin only |

### User Routes Detail

The user controller applies permission checks programmatically rather than via route-level middleware:

| Method | Endpoint | Permission |
|---|---|---|
| GET | `/api/users` | `manage:users` |
| GET | `/api/users?page&limit&role&status&search` | `manage:users` |
| GET | `/api/users/me/profile` | Any authenticated user |
| GET | `/api/users/search?q=` | `manage:users` |
| GET | `/api/users/stats` | `manage:users` |
| GET | `/api/users/role/:role` | `manage:users` |
| GET | `/api/users/:id` | `manage:users` |
| PUT | `/api/users/:id` | Own profile or admin |
| PUT | `/api/users/:id/role` | Admin only |
| POST | `/api/users/bulk/role-update` | Admin only |
| DELETE | `/api/users/:id` | Admin only (deletes from Supabase + MongoDB) |
| POST | `/api/users/:id/ban` | Admin only (creates BannedUser + deletes from Supabase) |
| POST | `/api/users/check-ban` | Public |
| DELETE | `/api/users/me/delete-account` | Own account (password verified for email users) |
| POST | `/api/users/manual-register` | Admin only |
| POST | `/api/users/notifications/send` | Admin only |

### Health Check

```
GET /           → API info and endpoint map
GET /api/health → { success: true, message: 'Server is running' }
```

---

## 10. M-Pesa Integration

M-Pesa payments use the **Safaricom Daraja API** with STK Push (Lipa Na M-Pesa Online).

### `MpesaService` class (`services/mpesaService.js`)

Instantiated per request using the MPESA configuration loaded from the `Settings` singleton. This means MPESA credentials can be updated in the admin settings panel without a server restart.

**Token Management:**
- OAuth access token is requested from Safaricom
- Cached in-memory for 3500 seconds (expires at 3600, 100-second safety margin)
- Reused on subsequent calls without a new HTTP request

**STK Push Flow:**

```
1. Controller loads MPESA config from Settings.getSettings()
2. Instantiates MpesaService with config
3. Calls mpesaService.initiateSTKPush(phone, amount, accountRef, description)
4. Service generates timestamp (YYYYMMDDHHmmss) and base64 password
5. POSTs to Safaricom stkpush/v1/processrequest
6. Returns CheckoutRequestID to controller
7. Controller saves pending payment record to DB
8. Customer receives PIN prompt on their phone
```

**Callback Flow (`/api/mpesa` routes):**

```
1. Safaricom POSTs to callbackUrl (must be publicly reachable HTTPS)
2. mpesaCallbackController validates callback structure
3. MpesaVerificationService.extractCallbackMetadata() extracts receipt, amount, phone
4. If ResultCode === 0: marks payment as success, updates campaign currentAmount
5. If ResultCode !== 0: marks payment as failed
```

**STK Push Status Query:**

`MpesaService.querySTKPushStatus(checkoutRequestId)` allows polling the status of a pending STK Push. Used for payment verification if callback is delayed.

**Environments:**

| Setting | Sandbox | Production |
|---|---|---|
| Base URL | `https://sandbox.safaricom.co.ke` | `https://api.safaricom.co.ke` |
| Shortcode | Test shortcode | Live Paybill/Till |
| Auth | Test consumer key/secret | Live credentials |

The `environment` field in `Settings.paymentSettings.mpesa` controls which URL is used.

**Idempotency:** All payment initiation endpoints require an `Idempotency-Key` header (UUID format) to prevent duplicate STK Push requests. See [Section 16](#16-idempotency).

**`MpesaVerificationService`:**

- `validateCallbackStructure(body)` — confirms required fields exist
- `extractCallbackMetadata(body)` — safely parses `CallbackMetadata.Item` array
- `verifyCheckoutRequestId(id)` — re-queries Safaricom to confirm transaction legitimacy
- `verifyReceiptNumber(receipt)` — validates M-Pesa receipt format (`/^[A-Z0-9]+$/`)
- `validateCallbackIP(ip)` — IP whitelist check (stub, to be enforced in production)

---

## 11. Email Service

`services/emailService.js` exports a **singleton** `EmailService` instance.

### SMTP Configuration

SMTP credentials are loaded from the `Settings` collection on each send. The transporter is cached for **5 minutes** to avoid repeated DB reads. If settings change (e.g., SMTP password updated in admin panel), the cache expires naturally within 5 minutes.

```js
// Settings → emailSettings fields:
smtpHost, smtpPort, smtpUser, smtpPassword, fromEmail, fromName
```

If `notificationSettings.emailNotifications` is `false`, all sends return `{ success: false, reason: 'Email notifications disabled' }` without attempting SMTP.

### Available Methods

| Method | Description |
|---|---|
| `sendEmail({ to, subject, text, html })` | Generic send (all other methods call this) |
| `sendPasswordResetEmail(email, token, url)` | Reset link with 1-hour expiry note |
| `sendWelcomeEmail(email, name)` | Welcome message for new signups |
| `sendContactFormEmail(contactData)` | Forwards contact form to admin email |
| `sendAdminNotification(type, data)` | Triggers for: `donation`, `volunteer`, `user` events |
| `testConnection()` | Verifies SMTP connection without sending a message |

Admin notifications respect per-type enable flags:

```
notifyOnNewDonation   → triggers on type: 'donation'
notifyOnNewVolunteer  → triggers on type: 'volunteer'
notifyOnNewUser       → triggers on type: 'user'
```

### Email Logging

Sent emails are recorded in the `EmailLog` collection via the audit service for tracking delivery history.

---

## 12. Real-Time Announcements (SSE)

The announcement system uses **Server-Sent Events** to push real-time updates to connected portal clients.

### SSE Authentication (`middleware/sseAuth.js`)

Because `EventSource` does not support custom headers in all browsers, the SSE endpoint accepts the token via **query parameter**:

```
GET /api/announcements/stream?token=<supabase-jwt>
```

The `protectSSE` middleware:
1. Reads token from `req.query.token` or `Authorization` header
2. Verifies with `supabase.auth.getUser(token)`
3. Looks up MongoDB user
4. On failure: sets SSE headers (`Content-Type: text/event-stream`) and writes an error event before closing — prevents browser reconnect loops

### SSE Event Types

| Event Type | Payload | When Sent |
|---|---|---|
| `connected` | `{ type: 'connected', userId }` | On successful SSE connection |
| `unreadCount` | `{ type: 'unreadCount', count: N }` | On connect, after marking initial count |
| `new_announcement` | `{ type: 'new_announcement', announcement }` | When admin creates a new announcement |
| `announcement_updated` | `{ type: 'announcement_updated', announcement }` | When admin edits an announcement |
| `announcement_deleted` | `{ type: 'announcement_deleted', id }` | When admin deletes an announcement |
| `error` | `{ type: 'error', message }` | Auth failure or internal error |

### Connection Management

The announcement controller maintains an in-memory map of active SSE connections (`Map<userId, res>`). When a client disconnects, the `close` event removes it from the map. New announcements are broadcast to all open connections with appropriate audience filtering.

---

## 13. AI Services

The backend includes three AI-powered services for sermon content enhancement.

### `transcriptService.js`

Uses `youtube-transcript-api` to extract transcripts from YouTube sermon recordings by video ID.

### `aiSummaryFromTranscript.js`

Takes a raw YouTube transcript and generates a structured sermon summary using either:
- **Anthropic Claude** (`@anthropic-ai/sdk`)
- **Google Gemini** (`@google/generative-ai`)

The summary includes: title, main points, key scriptures, and a short paragraph summary.

### `aiCaptionsService.js`

Generates AI-written captions for gallery photos uploaded to Cloudinary. Uses image URL + context to produce descriptive captions.

### `captionWorker.js`

Background job worker that processes a queue of photos awaiting AI caption generation, preventing timeouts on the upload endpoint.

---

## 14. File Uploads

### Cloudinary (Primary — Production)

`config/cloudinaryConfig.js` initializes the Cloudinary SDK and creates a `CloudinaryStorage` instance:

```js
cloudinary.config({
  cloud_name: CLOUDINARY_CLOUD_NAME,
  api_key:    CLOUDINARY_API_KEY,
  api_secret: CLOUDINARY_API_SECRET
});

// Storage params:
folder:            'church-gallery'
resource_type:     'auto'
transformation:    [{ quality: 'auto' }]  // Auto compression
```

File constraints:
- Max size: **5MB**
- Allowed types: JPEG, PNG, GIF, WebP

### Local Storage (Fallback — `middleware/upload.js`)

Multer disk storage writes to `uploads/gallery/` with timestamp-based filenames. Used as a local development fallback.

Served statically at `/uploads`:
```js
app.use('/uploads', express.static('uploads'));
```

### Deletion

Cloudinary deletes require server-side API calls with the Cloudinary Admin API secret. The `cloudinary.uploader.destroy(publicId)` call is made from the gallery controller — the secret is never exposed to the browser.

---

## 15. Audit Logging

`auditMiddleware.js` is mounted before all route handlers on `/api/*`. It logs every request to the `AuditLog` collection via `auditService`.

Audit records capture:

- HTTP method and path
- Request IP address (reads `X-Forwarded-For` correctly via trust proxy)
- User agent
- User ID and email (if authenticated)
- Action type (`login`, `logout`, `signup`, `create`, `update`, `delete`)
- Success/failure status
- Response status code
- Timestamp

`auditService.js` provides specific helpers used in controllers:

```js
auditService.logAuth('login', req, user, success, error?)
auditService.logError(req, error)
```

Transaction-specific audits are stored separately in `TransactionAuditLog` for payment operations.

---

## 16. Idempotency

Payment endpoints use `idempotencyMiddleware.js` to prevent duplicate M-Pesa STK Push requests from network retries.

**How it works:**

1. Client sends request with `Idempotency-Key: <UUID>` header
2. Middleware validates UUID format
3. Checks Supabase `idempotency_keys` table for matching `(idempotency_key, user_id)` pair
4. If found and original succeeded: returns cached response immediately
5. If found and original failed (status ≥ 400): allows retry
6. If not found: intercepts `res.send` to capture the response, stores it in Supabase, then proceeds normally
7. Keys expire after **24 hours**

**Requirements:**
- `Idempotency-Key` header is **required** on payment endpoints; omitting it returns `400`
- Key must be a valid UUID (validated with regex)
- Uses Supabase Service Key (`SUPABASE_SERVICE_KEY`) for table access

**Cleanup:** `cleanupExpiredKeys()` is exported for use in scheduled jobs.

---

## 17. Scheduled Jobs

`utils/cleanupJobs.js` is initialized in `server.js` on startup:

```js
const { initializeCleanupJobs } = require('./utils/cleanupJobs');
initializeCleanupJobs();
```

Jobs managed include:

- Expired idempotency keys cleanup (Supabase `idempotency_keys` table)
- Expired announcement cleanup (announcements past `expiresAt`)
- Any other time-based maintenance tasks

---

## 18. Error Handling

All controller functions should be wrapped in `asyncHandler` from `middleware/asyncHandler.js`:

```js
const asyncHandler = require('../middleware/asyncHandler');

exports.create = asyncHandler(async (req, res) => {
  // Errors thrown here are caught and forwarded to errorHandler
});
```

The global `errorHandler` (registered last in `server.js`) processes all errors:

```
CastError      → 404  "Resource not found"
code 11000     → 400  "{field} already exists"
ValidationError → 400  [array of error messages]
JWTError       → 401  "Invalid token"
other          → 500  "Server error" (production) | full message (development)
```

In development, the full `error.message` and `stack` are included in the response. In production, only a generic message is returned for `500` errors.

---

## 19. Environment Variables

Create a `.env` file in the project root (one level up from the `server/` directory, loaded via `dotenv.config({ path: '../.env' })`):

```env
# Server
PORT=5000
NODE_ENV=development
FRONTEND_URL=https://yourdomain.com

# MongoDB
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/church_db

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-role-key

# Cloudinary
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# M-Pesa (override if not using Settings panel)
MPESA_CONSUMER_KEY=your-consumer-key
MPESA_CONSUMER_SECRET=your-consumer-secret
MPESA_SHORTCODE=174379
MPESA_PASSKEY=your-passkey

# Email (override if not using Settings panel)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your@gmail.com
EMAIL_PASS=your-app-password

# AI Services (optional)
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_AI_API_KEY=AIza...
```

> `SUPABASE_SERVICE_KEY` (Service Role key) is required for admin operations: deleting users from Supabase Auth, creating users via manual registration, and the idempotency Supabase table. Never expose this key to the browser.

---

## 20. Installation Guide

**Prerequisites:**

- Node.js 18.x or 20.x
- A MongoDB Atlas cluster
- A Supabase project with Email/Password and Google OAuth providers enabled
- A Cloudinary account
- A Safaricom Daraja developer account (for M-Pesa)

**Steps:**

```bash
# 1. Clone the repository
git clone https://github.com/your-org/house-of-transformation.git
cd house-of-transformation/server

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.example ../.env
# Edit ../.env with your values

# 4. Seed default roles (first-time setup only)
node scripts/seedRoles.js

# 5. Create admin user (first-time setup only)
node scripts/createAdmin.js
```

---

## 21. Running the Server

**Development (with hot reload):**

```bash
npm run dev
```

Uses `nodemon server.js`. The server starts on `PORT` (default `5000`).

On startup, the console confirms:
- MongoDB connection host
- Cloudinary configuration status
- Supabase credential presence
- CORS allowed origins
- Rate limiting configuration
- Trust proxy status

**Production:**

```bash
npm start
```

Uses `node server.js` directly.

---

## 22. Deployment Notes

### Environment

Set `NODE_ENV=production` in your hosting environment. This affects:
- Error response verbosity (stack traces suppressed in production)
- CORS origin list (uses production URLs)

### M-Pesa Callback URL

The M-Pesa callback URL (`MPESA_CALLBACK_URL` or configured in Settings) must be a **publicly reachable HTTPS endpoint**. During development, use `ngrok` or similar tunnelling:

```bash
ngrok http 5000
# Use the https:// forwarding URL as your callback
```

### MongoDB Connection Pool

Configured in `database.js`:
- `maxPoolSize: 10`
- `minPoolSize: 5`
- `maxIdleTimeMS: 45000`
- `serverSelectionTimeoutMS: 5000`
- `socketTimeoutMS: 45000`

These values are suitable for a medium-traffic church platform. Increase `maxPoolSize` for higher concurrency.

### Render / Railway / Fly.io

`app.set('trust proxy', 1)` is already set, so IP extraction from `X-Forwarded-For` works correctly on all major PaaS providers.

### Supabase Row Level Security (RLS)

The `idempotency_keys` table in Supabase requires RLS to be disabled or a policy added to allow the Service Role key to insert and select rows. The service role bypasses RLS by default.

---

## 23. Security Considerations

**Authentication**

- All tokens are verified with Supabase on every protected request — there is no local JWT verification that could be bypassed.
- The `protect` middleware populates the full `role.permissions` array from MongoDB on every request. There is no trust in client-submitted role data.

**Permission Enforcement**

- Backend permission checks are independent of frontend UI gating. A user cannot gain access to a feature by manipulating the frontend.
- Admin bypass is based on `user.role.name === 'admin'` read from the database, not from a token claim.

**Input Sanitization**

- `isomorphic-dompurify` and `dompurify` are available for HTML content sanitization before storage (blog posts, sermon content).
- `express-validator` is used for request validation on auth and critical endpoints.

**Ban System**

- Banned users are deleted from Supabase Auth, preventing re-login with the same credentials.
- A `BannedUser` record stores the email and IP address, checked on signup and login to block re-registration.
- Admins cannot ban themselves or other admins.

**M-Pesa Security**

- Callbacks are validated for structure before processing.
- `MpesaVerificationService.verifyCheckoutRequestId()` re-queries Safaricom to confirm the transaction independently of the callback — prevents spoofed callbacks.
- M-Pesa receipt number format is validated before marking a payment as successful.
- Idempotency keys prevent double-charging on network retries.

**User Deletion**

- Deleting a user removes them from both MongoDB and Supabase Auth.
- Self-deletion for email/password users requires password re-verification via Supabase sign-in.
- OAuth users (Google) can self-delete without a password since Supabase verifies their session.

**Secrets**

- `SUPABASE_SERVICE_KEY`, `CLOUDINARY_API_SECRET`, `MPESA_CONSUMER_SECRET`, and `EMAIL_PASS` are server-side only and must never be exposed in client-facing code or logs.
- MPESA credentials are stored in MongoDB `Settings` collection (encrypted at rest by MongoDB Atlas) and loaded at runtime — not hardcoded.

---

*Built by [Bryant](https://x.com/rockstarbryant)*