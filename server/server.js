const express = require('express');
const path    = require('path');
const dotenv  = require('dotenv');
const cors    = require('cors');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const connectDB    = require('./config/database');
const errorHandler = require('./middleware/errorHandler');
const { apiLimiter, authLimiter, signupLimiter } = require('./middleware/rateLimiter');

const config = require('./config/env');
console.log('\n🔍 Supabase Configuration Check:');
console.log('   SUPABASE_URL:',        config.SUPABASE_URL        ? '✓ Loaded' : '✗ MISSING');
console.log('   SUPABASE_ANON_KEY:',   config.SUPABASE_ANON_KEY   ? '✓ Loaded' : '✗ MISSING');
console.log('   SUPABASE_SERVICE_KEY:',config.SUPABASE_SERVICE_KEY ? '✓ Loaded' : '✗ MISSING');
console.log('   MONGODB_URI:',         config.MONGODB_URI          ? '✓ Loaded' : '✗ MISSING');
console.log('   REDIS_URL:',           process.env.REDIS_URL        ? '✓ Loaded' : '⚠ Using default localhost');
console.log('   BREVO_API_KEY:',       process.env.BREVO_API_KEY    ? '✓ Loaded' : '⚠ Email/SMS notifications disabled');
console.log('   AT_API_KEY:',          process.env.AT_API_KEY       ? '✓ Loaded' : '⚠ SMS notifications disabled');
console.log('   NODE_ENV:',            process.env.NODE_ENV || 'development');
console.log('');

const auditMiddleware = require('./middleware/auditMiddleware');
const { protect } = require('./middleware/supabaseAuth');

require('./config/cloudinaryConfig');

connectDB();

// ── Start workers ─────────────────────────────────────────────────────────────
// Only initialise if Redis is configured.
let stopNotificationWorker  = async () => {};
let stopCommunicationWorker = async () => {};
let stopPledgeReminderWorker = async () => {};  // ✅ NEW

if (process.env.REDIS_URL || process.env.NODE_ENV === 'development') {

  // Existing announcement notification worker
  try {
    const { startNotificationWorker, stopNotificationWorker: _stop1 } = require('./workers/notificationWorker');
    startNotificationWorker();
    stopNotificationWorker = _stop1;
    console.log('✓ Notification worker started');
  } catch (err) {
    console.error('⚠  Notification worker failed to start:', err.message);
    console.error('   Announcements will still work — email/SMS notifications will not be sent');
  }

  // Communication broadcast worker
  try {
    const { startCommunicationWorker, stopCommunicationWorker: _stop2 } = require('./workers/communicationWorker');
    startCommunicationWorker();
    stopCommunicationWorker = _stop2;
    console.log('✓ Communication worker started');
  } catch (err) {
    console.error('⚠  Communication worker failed to start:', err.message);
    console.error('   Communications will still be queued — they will process once worker recovers');
  }

  // ✅ NEW: Pledge reminder worker + daily cron scheduler
  try {
    const { startPledgeReminderWorker, stopPledgeReminderWorker: _stop3 } = require('./workers/pledgeReminderWorker');
    const { startPledgeReminderScheduler } = require('./jobs/pledgeReminderScheduler');
    startPledgeReminderWorker();
    startPledgeReminderScheduler();
    stopPledgeReminderWorker = _stop3;
    console.log('✓ Pledge reminder worker and scheduler started (daily 08:00 EAT)');
  } catch (err) {
    console.error('⚠  Pledge reminder worker failed to start:', err.message);
    console.error('   Pledges still work — reminder notifications will not be sent automatically');
  }
}

const app = express();

// ── Trust proxy ───────────────────────────────────────────────────────────────
app.set('trust proxy', 1);

// ── Body parser ───────────────────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── CORS ──────────────────────────────────────────────────────────────────────
const allowedOrigins =
  process.env.NODE_ENV === 'development'
    ? [
        'http://localhost:3000',
        'https://yobra194-1035364.postman.co',
        'http://localhost:5001',
        'http://127.0.0.1:3000',
      ]
    : [
        process.env.FRONTEND_URL,
        'https://comfy-gumdrop-df8b26.netlify.app',
        'https://hotadmin.vercel.app',
        'https://house-of-transformation.vercel.app',
        'https://houseoftransformation-nextjs.vercel.app',
        'https://busiahouseoftransformation.netlify.app',
      ].filter(Boolean);

app.use(
  cors({
    origin:           allowedOrigins,
    credentials:      true,
    methods:          ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders:   ['Content-Type', 'Idempotency-Key', 'X-Requested-With', 'X-CSRF-Token', 'Accept', 'Accept-Language', 'Authorization'],
    optionsSuccessStatus: 200,
    exposedHeaders:   ['Content-Type', 'Authorization'],
  })
);

// ── Static files ──────────────────────────────────────────────────────────────
app.use('/uploads', express.static('uploads'));

// ── Audit middleware ──────────────────────────────────────────────────────────
app.use('/api', auditMiddleware);

// ── Health & info ─────────────────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({
    message:  'Welcome to House of Transformation API',
    version:  '2.2.0',  // ✅ bumped
    features: [
      'SSE',
      'Email (Brevo)',
      'SMS (Africa\'s Talking)',
      'BullMQ Job Queue',
      'Communication Broadcasts',
      'Pledge Reminders',       // ✅ NEW
      'Campaign Thank-You Messages', // ✅ NEW
    ],
  });
});

app.get('/api/health', (req, res) => {
  res.json({
    success:        true,
    message:        'Server is running',
    queue:          process.env.REDIS_URL ? 'connected' : 'redis not configured',
    brevo:          process.env.BREVO_API_KEY ? 'configured' : 'not configured',
    africasTalking: process.env.AT_API_KEY   ? 'configured' : 'not configured',
  });
});

// ── Rate limiter ──────────────────────────────────────────────────────────────
app.use('/api/', apiLimiter);

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/auth',            require('./routes/authRoutes'));
app.use('/api/settings/public', require('./routes/settingsRoutes'));

// Public content routes
app.use('/api/sermons',            require('./routes/sermonRoutes'));
app.use('/api/blog',               require('./routes/blogRoutes'));
app.use('/api/events',             require('./routes/eventRoutes'));
app.use('/api/gallery',            require('./routes/galleryRoutes'));
app.use('/api/campaigns',          require('./routes/campaignRoutes'));
app.use('/api/contributions',      require('./routes/contributionRoutes'));
app.use('/api/pledges',            require('./routes/pledgeRoutes'));
app.use('/api/payments',           require('./routes/paymentRoutes'));
app.use('/api/mpesa',              require('./routes/mpesaCallbackRoutes'));
app.use('/api/donations/analytics',require('./routes/donationAnalyticsRoutes'));
app.use('/api/livestreams',        require('./routes/livestreamRoutes'));
app.use('/api/feedback',           require('./routes/feedbackRoutes'));
app.use('/api/volunteers',         require('./routes/volunteerRoutes'));
app.use('/api/notices',            require('./routes/noticeRoutes'));

// Announcements (mixed auth — SSE uses protectSSE, rest use protect)
app.use('/api/announcements', require('./routes/announcementRoutes'));

// Protected routes
app.use('/api/users',               require('./routes/userRoutes'));
app.use('/api/roles',               protect, require('./routes/roleRoutes'));
app.use('/api/settings',            protect, require('./routes/settingsRoutes'));
app.use('/api/analytics',           protect, require('./routes/analyticsRoutes'));
app.use('/api/audit',               protect, require('./routes/auditRoutes'));
app.use('/api/transaction-audit',   protect, require('./routes/transactionAuditRoutes'));

// Legacy email notifications (kept for backward compat)
app.use('/api/email-notifications', protect, require('./routes/emailNotificationRoutes'));
app.use('/api/email',               protect, require('./routes/emailTestRoutes'));

// Communication broadcasts
app.use('/api/communications',      protect, require('./routes/communicationRoutes'));

// ── 404 ───────────────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, error: 'Route not found', path: req.path, method: req.method });
});

// ── Global error handler ──────────────────────────────────────────────────────
app.use(errorHandler);

// ── Start server ──────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;

const { initializeCleanupJobs } = require('./utils/cleanupJobs');
initializeCleanupJobs();

const server = app.listen(PORT, () => {
  console.log(`\n✓ Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
  console.log(`✓ CORS origins: ${allowedOrigins.join(', ')}`);
  console.log(`✓ Rate limiting: 1000 req / 15 min`);
});

// ── Graceful shutdown ─────────────────────────────────────────────────────────
const gracefulShutdown = async (signal) => {
  console.log(`\n[Server] ${signal} received — shutting down gracefully`);

  server.close(async () => {
    console.log('[Server] HTTP server closed');

    // Stop all workers
    await stopNotificationWorker();
    await stopCommunicationWorker();
    await stopPledgeReminderWorker();   // ✅ NEW

    // Close all queues
    const { closeQueue: closeNotifQueue }         = require('./queues/notificationQueue');
    const { closeQueue: closeCommQueue }           = require('./queues/communicationQueue');
    const { closeQueue: closePledgeReminderQueue } = require('./queues/pledgeReminderQueue'); // ✅ NEW

    await closeNotifQueue();
    await closeCommQueue();
    await closePledgeReminderQueue();  // ✅ NEW

    process.exit(0);
  });

  setTimeout(() => {
    console.error('[Server] Forced shutdown after timeout');
    process.exit(1);
  }, 10_000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT',  () => gracefulShutdown('SIGINT'));

module.exports = app;