# 📢 Announcement Notification System

**House of Transformation Church — Backend Documentation**

This document covers the full multi-channel notification system built into the church management platform. It explains how everything works, how to configure it, and how to debug or maintain it.

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [File Structure](#file-structure)
4. [How It Works — Step by Step](#how-it-works)
5. [Environment Variables](#environment-variables)
6. [Email Notifications (Brevo)](#email-notifications-brevo)
7. [SMS Notifications (Africa's Talking)](#sms-notifications-africas-talking)
8. [Job Queue (BullMQ + Redis)](#job-queue-bullmq--redis)
9. [User Notification Preferences](#user-notification-preferences)
10. [API Endpoints](#api-endpoints)
11. [Database Schema Changes](#database-schema-changes)
12. [Frontend Integration](#frontend-integration)
13. [Deployment (Render.com)](#deployment-rendercom)
14. [Debugging Guide](#debugging-guide)
15. [Common Errors & Fixes](#common-errors--fixes)
16. [Maintenance Guide](#maintenance-guide)

---

## Overview

When an admin posts a church announcement, the system can automatically notify all eligible members via:

| Channel | Provider | Status |
|---------|----------|--------|
| 🔴 Real-time (SSE) | Built-in (Server-Sent Events) | Always on |
| 📧 Email | Brevo Transactional API | Opt-in per user |
| 📱 SMS | Africa's Talking | Opt-in per user |

Notifications are **non-blocking** — the admin gets an instant HTTP 201 response, and emails/SMS are sent in the background via a job queue.

---

## Architecture

```
Admin creates announcement
        │
        ▼
Announcement saved to MongoDB
        │
        ├──► SSE broadcast (real-time, instant, in-process)
        │
        ├──► addEmailNotificationJob(id) ──► BullMQ Queue ──► Worker ──► Brevo API ──► 📧
        │
        └──► addSmsNotificationJob(id)   ──► BullMQ Queue ──► Worker ──► Africa's Talking ──► 📱

Queue backed by Redis (persists jobs across restarts)
Worker concurrency: 2 jobs at a time
Rate limit: 10 jobs per 60 seconds
Retry: 3 attempts with exponential backoff (5s, 10s, 20s)
```

---

## File Structure

```
server/
├── config/
│   └── redis.js                        # IORedis singleton connection
│
├── queues/
│   └── notificationQueue.js            # BullMQ queue + job adder functions
│
├── workers/
│   └── notificationWorker.js           # BullMQ worker — processes jobs
│
├── services/
│   ├── notificationService.js          # Orchestrator — resolves recipients, calls providers
│   ├── brevoEmailService.js            # Brevo email sending (primary email)
│   ├── brevoSmsService.js              # Brevo SMS (BACKUP — requires paid credits)
│   └── africasTalkingSmsService.js     # Africa's Talking SMS (PRIMARY SMS)
│
├── models/
│   ├── Announcement.js                 # Added: notifyEmail, notifySMS fields
│   └── User.js                         # Added: notifications.email, notifications.sms fields
│
└── controllers/
    └── announcementController.js       # createAnnouncement, resendNotification, getNotificationStats
```

---

## How It Works

### 1. Admin Creates Announcement

`POST /api/announcements`

The request body can include:
```json
{
  "title": "Sunday Service",
  "content": "Service starts at 10am this Sunday.",
  "priority": "normal",
  "category": "worship",
  "audience": "all",
  "notifyEmail": true,
  "notifySMS": true
}
```

### 2. Controller Saves & Queues Jobs

In `announcementController.js → createAnnouncement`:

```javascript
// After saving announcement to MongoDB:
if (notifyEmail) await addEmailNotificationJob(announcement._id);
if (notifySMS)   await addSmsNotificationJob(announcement._id);
```

The HTTP response is returned immediately — the notification jobs run in the background.

### 3. Queue Stores Jobs in Redis

`queues/notificationQueue.js` adds jobs to a BullMQ queue named `announcement-notifications`.

Each job contains just the `announcementId` — the worker fetches the full data from MongoDB when it runs.

Job deduplication: job IDs are unique per announcement (`email-{id}`, `sms-{id}`), preventing duplicate sends if the endpoint is called twice.

### 4. Worker Processes Jobs

`workers/notificationWorker.js` picks up jobs and routes them:

```
job.name === 'send-email'  →  notificationService.processEmailNotification(id)
job.name === 'send-sms'    →  notificationService.processSmsNotification(id)
```

### 5. Notification Service Resolves Recipients

`services/notificationService.js`:

- Fetches the announcement from MongoDB
- Resolves eligible users based on `audience` field (all / members / volunteers / staff / specific_roles)
- Filters users who have opted in (`notifications.email === true` or `notifications.sms === true`)
- Calls the appropriate sending service with the recipient list

### 6. Sending Services Deliver

- **Email:** `brevoEmailService.js` sends via Brevo API in batches of 50
- **SMS:** `africasTalkingSmsService.js` sends via Africa's Talking API in batches of 1000

### 7. Announcement Updated

After successful delivery, the announcement document is updated:
- `emailSent: true`
- `smsSent: true`

---

## Environment Variables

Add all of these to your `.env` file (located one level above `/server`):

```env
# ── Redis (Job Queue) ──────────────────────────────────────────────────────
REDIS_URL=redis://localhost:6379               # Local development
# REDIS_URL=redis://red-xxxxxxxxx:6379         # Render.com internal URL (production)

# ── Brevo (Email) ──────────────────────────────────────────────────────────
BREVO_API_KEY=xkeysib-your-key-here
BREVO_SENDER_NAME=House of Transformation Church
BREVO_SENDER_EMAIL=noreply@yourdomain.com

# Optional Brevo tuning:
# BREVO_EMAIL_BATCH_SIZE=50      # Emails per batch (default: 50)
# BREVO_BATCH_DELAY_MS=1000      # Delay between batches in ms (default: 1000)

# ── Africa's Talking (SMS) ─────────────────────────────────────────────────
AT_USERNAME=busiahot                           # Your AT app username (not 'sandbox')
AT_API_KEY=atsk_your_live_api_key_here         # Live API key from AT Settings
AT_SMS_SENDER=                                 # Leave blank to use shared shortcode
AT_SANDBOX=false                               # true = sandbox mode, false = live

# ── Frontend URL (used in email links) ────────────────────────────────────
FRONTEND_URL=https://house-of-transformation.vercel.app
```

> ⚠️ **Never commit your `.env` file to Git.** Make sure it is in `.gitignore`.

---

## Email Notifications (Brevo)

### Provider
**Brevo** (formerly Sendinblue) — https://app.brevo.com

### SDK
`@getbrevo/brevo` v4+ — uses `BrevoClient` pattern (NOT the old `ApiClient.instance` pattern from v3).

### How the client is initialized

```javascript
const { BrevoClient } = require('@getbrevo/brevo');
const client = new BrevoClient({ apiKey: process.env.BREVO_API_KEY });

// Send email:
client.transactionalEmails.sendTransacEmail({ ... });
```

> **Important:** In `@getbrevo/brevo` v4, the namespace is `client.transactionalEmails` (not `client.TransactionalEmailsApi`). This changed from older versions.

### What gets sent

A branded HTML email including:
- Church logo header (dark red `#8B1A1A`)
- Priority badge (urgent / high / normal / low)
- Announcement title, category, date
- Full announcement content
- "View in Portal" button
- Unsubscribe footer link

### Batching

Emails are sent in configurable batches (default 50 per batch, 1 second delay between batches) to avoid rate limits.

### Setup checklist

- [ ] Create account at app.brevo.com
- [ ] Go to **SMTP & API → API Keys → Generate**
- [ ] Go to **Senders & IPs** → verify your sender email address (required)
- [ ] Add `BREVO_API_KEY`, `BREVO_SENDER_EMAIL`, `BREVO_SENDER_NAME` to `.env`

---

## SMS Notifications (Africa's Talking)

### Provider
**Africa's Talking** — https://africastalking.com  
Recommended for Kenya — cheaper rates (KES 0.40–0.60/SMS) and better local network support.

### SDK
`africastalking` npm package.

### How the client is initialized

```javascript
const AfricasTalking = require('africastalking');
const at = AfricasTalking({ username: process.env.AT_USERNAME, apiKey: process.env.AT_API_KEY });
const sms = at.SMS;

// Send SMS:
await sms.send({ to: ['+254712345678'], message: 'Hello!' });
```

### Phone number format

Africa's Talking requires **E.164 format with `+` prefix**: `+254712345678`

The service auto-normalises numbers:
- `0712345678` → `+254712345678`
- `254712345678` → `+254712345678`
- `+254712345678` → `+254712345678` (no change)

### SMS message format

Messages are capped at **155 characters** and auto-truncated with `...` if longer.

Format: `[HOT Church] Title: Content...`
Urgent format: `[HOT Church] 🚨 URGENT: Title: Content...`

### Sandbox vs Live

| Mode | AT_USERNAME | AT_API_KEY | AT_SANDBOX | Delivers to |
|------|-------------|------------|------------|-------------|
| Sandbox | `sandbox` | Sandbox key from AT | `true` | AT Simulator app only |
| Live | `busiahot` | Live key from AT Settings | `false` | Real phones |

### Setup checklist

- [ ] Create account at africastalking.com
- [ ] Create an app (e.g. `house-of-transformation`)
- [ ] Go to **Settings** → copy **API Key**
- [ ] Note your **Username** (shown on app dashboard)
- [ ] Top up wallet via **Billing** for live sending
- [ ] Add `AT_USERNAME`, `AT_API_KEY`, `AT_SANDBOX=false` to `.env`

### Brevo SMS (Backup)

`brevoSmsService.js` is kept as a backup SMS provider. To switch back:

In `services/notificationService.js`, change:
```javascript
// Current (Africa's Talking):
const { sendAnnouncementSms } = require('./africasTalkingSmsService');

// Backup (Brevo — requires paid SMS credits):
const { sendAnnouncementSms } = require('./brevoSmsService');
```

Brevo SMS uses namespace `client.transactionalSms.sendTransacSms(...)`.

---

## Job Queue (BullMQ + Redis)

### Why a queue?

Without a queue, sending 500 emails would block the HTTP response for minutes. The queue lets the API respond instantly and process notifications in the background, with automatic retries on failure.

### Queue configuration

```javascript
// Queue name:
'announcement-notifications'

// Job retry config:
{ attempts: 3, backoff: { type: 'exponential', delay: 5000 } }
// Retries at: 5s, 10s, 20s after failure

// Worker concurrency: 2 (processes 2 jobs simultaneously)
// Rate limit: 10 jobs per 60 seconds
```

### Job names

| Job Name | Handler |
|----------|---------|
| `send-email` | `notificationService.processEmailNotification` |
| `send-sms` | `notificationService.processSmsNotification` |

### Redis connection

`config/redis.js` creates a singleton IORedis connection:

```javascript
// Key options required for BullMQ compatibility:
{ maxRetriesPerRequest: null, enableReadyCheck: false }
```

Auto-detects `rediss://` prefix for TLS connections (used on Render.com).

### Worker lifecycle

The worker is started in `server.js` only if `REDIS_URL` is set:

```javascript
if (process.env.REDIS_URL || process.env.NODE_ENV === 'development') {
  startNotificationWorker();
}
```

On `SIGTERM`/`SIGINT` (server shutdown), the worker and queue are gracefully closed.

---

## User Notification Preferences

### Database field

Added to `User` model:

```javascript
notifications: {
  email: { type: Boolean, default: false },
  sms:   { type: Boolean, default: false }
}
```

Both default to `false` — users must explicitly opt in.

### How users opt in

Users go to **Portal → Profile → Notification Preferences** and toggle Email and/or SMS switches, then click **Save Preferences**.

This calls `PUT /api/users/:id` with:
```json
{ "notifications": { "email": true, "sms": true } }
```

The `userController.updateUser` uses MongoDB dot-notation to update only the specific sub-field:
```javascript
updateData['notifications.email'] = notifications.email;
updateData['notifications.sms']   = notifications.sms;
```

### SMS requirement

Users can only receive SMS if they have a phone number saved in their profile. The SMS toggle is disabled in the UI when no phone number exists.

---

## API Endpoints

### Create Announcement (with notification)

```
POST /api/announcements
Authorization: Bearer <token>
Permission: manage:announcements
```

**Body:**
```json
{
  "title": "string",
  "content": "string",
  "priority": "normal | high | urgent | low",
  "category": "string",
  "audience": "all | members | volunteers | staff",
  "notifyEmail": true,
  "notifySMS": false
}
```

---

### Resend Notification

```
POST /api/announcements/:id/resend
Authorization: Bearer <token>
Permission: manage:announcements
```

**Body:**
```json
{ "channel": "email | sms | both" }
```

Re-queues a notification for an existing announcement. Resets `emailSent`/`smsSent` flags to allow resend.

---

### Get Notification Stats

```
GET /api/announcements/:id/notification-stats
Authorization: Bearer <token>
Permission: manage:announcements
```

**Response:**
```json
{
  "announcementId": "...",
  "emailSent": true,
  "smsSent": false,
  "notifyEmail": true,
  "notifySMS": true
}
```

---

### Update User Notification Preferences

```
PUT /api/users/:id
Authorization: Bearer <token>
```

**Body:**
```json
{ "notifications": { "email": true, "sms": true } }
```

---

## Database Schema Changes

### Announcement Model additions

```javascript
notifyEmail: { type: Boolean, default: false },  // Should email be sent?
notifySMS:   { type: Boolean, default: false },  // Should SMS be sent?
emailSent:   { type: Boolean, default: false },  // Has email been sent?
smsSent:     { type: Boolean, default: false },  // Has SMS been sent?
```

### User Model additions

```javascript
notifications: {
  email: { type: Boolean, default: false },
  sms:   { type: Boolean, default: false }
}
```

### Bug fixed in Announcement queries

The original `getActiveForUser` and `getAllAnnouncements` had a **silent MongoDB bug** — duplicate `$or` keys in a plain JS object, where the second `$or` silently overwrote the first. Fixed by wrapping both conditions in `$and`:

```javascript
// WRONG (second $or silently overwrites first):
{ $or: [...expiryCondition], $or: [...audienceCondition] }

// CORRECT:
{ $and: [{ $or: [...expiryCondition] }, { $or: [...audienceCondition] }] }
```

---

## Frontend Integration

### Announcement Create Form

`/frontend/src/app/portal/announcements/create/page.jsx`

Added a **Notification Channels** section with toggle switches for Email and SMS. A warning banner appears when either channel is enabled. Both flags are included in the POST body on submit.

### Profile Page

`/frontend/src/app/portal/profile/page.jsx`

Added a **Notification Preferences** section showing:
- Email Notifications toggle (with email address displayed)
- SMS Notifications toggle (disabled if no phone number; shows phone number)
- Save Preferences button

### User Service

`/frontend/src/services/api/userService.js`

Added:
```javascript
updateNotificationPreferences(userId, { email: bool, sms: bool })
→ PUT /api/users/:id { notifications: { email, sms } }
```

---

## Deployment (Render.com)

### Redis Setup

1. Go to Render Dashboard → **New → Key Value** (Redis)
2. Name: `hot-church-redis`
3. Region: **must match** your backend service region (e.g. Frankfurt EU Central)
4. Plan: Free (25MB RAM, 50 connections)
5. Maxmemory policy: `allkeys-lru`
6. Copy the **Internal URL** (format: `redis://red-xxxxxxxxx:6379`)

### Backend Environment Variables on Render

Add these in your backend service → **Environment** tab:

```
REDIS_URL            = redis://red-xxxxxxxxx:6379     ← Internal URL only
BREVO_API_KEY        = xkeysib-...
BREVO_SENDER_NAME    = House of Transformation Church
BREVO_SENDER_EMAIL   = noreply@yourdomain.com
AT_USERNAME          = busiahot
AT_API_KEY           = atsk_...
AT_SMS_SENDER        =
AT_SANDBOX           = false
```

> ⚠️ The Internal Redis URL only works inside Render's network. Use `redis://localhost:6379` for local development.

---

## Debugging Guide

### Check if the queue is working

Look for these log lines after creating an announcement:

```
✅ Working correctly:
[NotificationQueue] ✅ Email job queued: email-xxxxx
[Worker] ▶ Processing job "send-email" | id: email-xxxxx | announcement: xxxxx
[NotificationService] Email: 1 recipients from 15 eligible
[BrevoEmail] ✅ Done — sent:1 failed:0 total:1
[Worker] ✅ Job completed: email-xxxxx (send-email)

❌ Something is wrong:
[Worker] ❌ Job failed: email-xxxxx (send-email) | attempt 1/3 <error message>
[Worker] 🚨 FINAL FAILURE — notification not delivered for announcement: xxxxx
```

### Check Redis connection

```
[Redis] ✅ Connected    ← Good
[Redis] ✅ Ready        ← Good

[Redis] ❌ Error        ← Redis is down or REDIS_URL is wrong
```

### Verify environment variables are loading

Run this from inside `/server`:

```bash
node -e "
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
console.log('BREVO_API_KEY:', process.env.BREVO_API_KEY ? '✅' : '❌ missing');
console.log('AT_USERNAME:', process.env.AT_USERNAME || '❌ missing');
console.log('AT_API_KEY:', process.env.AT_API_KEY ? '✅' : '❌ missing');
console.log('REDIS_URL:', process.env.REDIS_URL || '❌ missing');
"
```

### Check what Africa's Talking SDK exposes

```bash
node -e "
const AT = require('africastalking');
const at = AT({ username: 'sandbox', apiKey: 'test' });
console.log('SMS methods:', Object.keys(at.SMS));
"
```

### Check what Brevo SDK exposes

```bash
node -e "
const { BrevoClient } = require('@getbrevo/brevo');
const c = new BrevoClient({ apiKey: 'test' });
const proto = Object.getPrototypeOf(c);
console.log('Namespaces:', Object.getOwnPropertyNames(proto).filter(k => k !== 'constructor'));
"
```

---

## Common Errors & Fixes

### `AT_USERNAME environment variable is not set`
**Cause:** `.env` file not found, or variable not saved.
**Fix:** Confirm `.env` is at `~/house-of-transformation/.env` (one level above `/server`). Check `server.js` line: `dotenv.config({ path: path.resolve(__dirname, '../.env') })`.

---

### `Request failed with status code 401` (Africa's Talking)
**Cause:** Wrong API key — using sandbox key in live mode or vice versa.
**Fix:** When `AT_SANDBOX=false`, use the live API key from your live app Settings. When `AT_SANDBOX=true`, use the sandbox API key and `AT_USERNAME=sandbox`.

---

### `UserInBlacklist — 406` (Africa's Talking)
**Cause:** The recipient's phone number previously opted out of SMS from AT's platform (sent STOP), or the number is flagged.
**Fix:** Contact Africa's Talking live chat support and ask them to remove the number from the blacklist. Or test with a different number.

---

### `PaymentRequiredError — 402` (Brevo SMS)
**Cause:** No SMS credits in Brevo account.
**Fix:** Go to https://app.brevo.com/billing/addon/customize/sms and purchase SMS credits. Or switch to Africa's Talking (already configured as primary).

---

### `Brevo.TransactionalEmailsApi is not a constructor`
**Cause:** Using old import pattern with `@getbrevo/brevo` v4.
**Fix:** Use destructured named exports:
```javascript
// WRONG:
const Brevo = require('@getbrevo/brevo');
new Brevo.TransactionalEmailsApi()

// CORRECT:
const { BrevoClient } = require('@getbrevo/brevo');
const client = new BrevoClient({ apiKey });
client.transactionalEmails.sendTransacEmail(...)
```

---

### `Cast to ObjectId failed for value "xxxxx-resend-timestamp"`
**Cause:** The resend endpoint was passing the composite job ID string as the `announcementId` in job data.
**Fix:** Always pass the plain MongoDB ObjectId as `announcementId` in job data. The timestamp suffix belongs only in the `jobId` option for deduplication, not in the data payload.

---

### `Cannot read properties of undefined (reading 'instance')`
**Cause:** Old Brevo SDK pattern using `ApiClient.instance` (from `sib-api-v3-sdk` era).
**Fix:** Switch to `BrevoClient` as shown above.

---

### SSE not connecting in production
**Cause:** `sseAuth.js` had hardcoded empty `allowedOrigins = []`.
**Fix:** Already fixed — `sseAuth.js` now mirrors the same CORS origin logic as `server.js`.

---

### Duplicate SSE connections
**Cause:** `sseClients` was an Array, allowing multiple connections per user.
**Fix:** Already fixed — `sseClients` is now a `Map<userId, res>`, ensuring one connection per user with O(1) deduplication.

---

## Maintenance Guide

### Adding a new notification channel (e.g. WhatsApp)

1. Create `services/whatsappService.js` exporting `sendAnnouncementWhatsApp(announcement, recipients)`
2. Add `addWhatsAppNotificationJob(id)` to `queues/notificationQueue.js`
3. Add `'send-whatsapp'` handler in `workers/notificationWorker.js`
4. Add `processWhatsAppNotification(id)` in `services/notificationService.js`
5. Add `notifyWhatsApp: Boolean` field to `Announcement` model
6. Wire up in `announcementController.js → createAnnouncement`

### Switching SMS providers

Only one file needs to change — `services/notificationService.js`:

```javascript
// Change this one import line:
const { sendAnnouncementSms } = require('./africasTalkingSmsService');
// to:
const { sendAnnouncementSms } = require('./brevoSmsService');
// or any new provider that exports the same function signature
```

All providers must export `sendAnnouncementSms(announcement, recipients)` returning `{ sent, failed, skipped, total }`.

### Monitoring queue health

The `/api/health` endpoint returns queue status:

```json
{
  "status": "ok",
  "queue": "connected",
  "brevo": "configured"
}
```

### Clearing stuck jobs (Redis CLI)

```bash
# Connect to Redis
redis-cli

# List all BullMQ keys
KEYS bull:announcement-notifications:*

# Clear all failed jobs
DEL bull:announcement-notifications:failed
```

### Checking delivery logs

All job outcomes are logged to console:
```
[Worker] ✅ Job completed: email-xxxxx (send-email)
[Worker] ❌ Job failed: email-xxxxx (send-email) | attempt 2/3 <reason>
[Worker] 🚨 FINAL FAILURE — notification not delivered for announcement: xxxxx
```

For production, consider forwarding these to a logging service (Datadog, Logtail, etc.).

### Updating Brevo sender email

1. Go to app.brevo.com → **Senders & IPs**
2. Add and verify the new email address
3. Update `BREVO_SENDER_EMAIL` in `.env` / Render environment variables
4. Restart server

### Topping up Africa's Talking credits

1. Log into account.africastalking.com
2. Click **Billing** in the sidebar
3. Select **Top Up Wallet**
4. Minimum top-up: KES 10
5. Kenya SMS rate: ~KES 0.40–0.60 per message

---

## Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `bullmq` | latest | Job queue |
| `ioredis` | latest | Redis client |
| `@getbrevo/brevo` | v4+ | Email sending |
| `africastalking` | 0.7.x | SMS sending (Kenya) |

Install all:
```bash
npm install bullmq ioredis @getbrevo/brevo africastalking
```

---

*Last updated: March 2026 — House of Transformation Church, Busia Kenya*