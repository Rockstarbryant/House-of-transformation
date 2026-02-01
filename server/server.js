// ===== IN server.js - CORRECT MIDDLEWARE ORDER =====

const express = require('express');
const path = require('path');
const dotenv = require('dotenv');
const cors = require('cors');
const connectDB = require('./config/database');
const errorHandler = require('./middleware/errorHandler');
const { apiLimiter, authLimiter, signupLimiter } = require('./middleware/rateLimiter');

require('./config/cloudinaryConfig');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const config = require('./config/env');
console.log('\n🔐 Supabase Configuration Check:');
console.log('   SUPABASE_URL:', config.SUPABASE_URL ? '✓ Loaded' : '✗ MISSING');
console.log('   SUPABASE_ANON_KEY:', config.SUPABASE_ANON_KEY ? '✓ Loaded' : '✗ MISSING');
console.log('   SUPABASE_SERVICE_KEY:', config.SUPABASE_SERVICE_KEY ? '✓ Loaded' : '✗ MISSING');
console.log('   MONGODB_URI:', config.MONGODB_URI ? '✓ Loaded' : '✗ MISSING');
console.log('   NODE_ENV:', process.env.NODE_ENV || 'development');
console.log('');

const auditMiddleware = require('./middleware/auditMiddleware');
const { protect } = require('./middleware/supabaseAuth');
const maintenanceMiddleware = require('../backup/maintenanceMiddleware');

connectDB();

const app = express();

// ===== TRUST PROXY =====
app.set('trust proxy', 1);

// ===== BODY PARSER =====
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ===== CORS CONFIGURATION =====
const allowedOrigins = process.env.NODE_ENV === 'development' 
  ? [
      'http://localhost:3000',
      'https://yobra194-1035364.postman.co',
      'http://localhost:5001',
      'http://127.0.0.1:3000'   
    ]
  : [
      process.env.FRONTEND_URL,
      'https://comfy-gumdrop-df8b26.netlify.app',
      'https://hotadmin.vercel.app',
      'https://house-of-transformation.vercel.app',
      'https://houseoftransformation-nextjs.vercel.app'
    ];

app.use('/api', auditMiddleware);

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Idempotency-Key', 'X-Requested-With', 'X-CSRF-Token', 'Accept', 'Accept-Language', 'Authorization'],
  optionsSuccessStatus: 200
}));

// ===== STATIC FILES =====
app.use('/uploads', express.static('uploads'));

// ============================================
// HEALTH & INFO ROUTES (NO AUTH NEEDED)
// ============================================

app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to House of Transformation API',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      sermons: '/api/sermons',
      blog: '/api/blog',
      events: '/api/events',
      gallery: '/api/gallery',
      volunteers: '/api/volunteers',
      feedback: '/api/feedback',
      users: '/api/users',
      health: '/api/health'
    }
  });
});

app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'Server is running', cloudinary: 'configured' });
});

// ============================================
// API ROUTES (MOUNT THESE BEFORE ERROR HANDLER)
// ============================================

// Apply general API rate limiter to all /api routes
app.use('/api/', apiLimiter);

//  STEP 1: Auth routes MUST be first
app.use('/api/auth', require('./routes/authRoutes'));

//  STEP 2: Public settings endpoint - NO auth needed, NO maintenance check
app.use('/api/settings/public', require('./routes/settingsRoutes'));

//  STEP 3: Apply authentication to all remaining routes


// ⚠️ STEP 4: NOW apply maintenance middleware (req.user is populated!)
//app.use('/api/', maintenanceMiddleware);

//  STEP 5: Now all protected routes can use maintenance middleware
app.use('/api/sermons', require('./routes/sermonRoutes'));
app.use('/api/blog', require('./routes/blogRoutes'));
app.use('/api/events', require('./routes/eventRoutes'));
app.use('/api/gallery', require('./routes/galleryRoutes'));
app.use('/api/campaigns', require('./routes/campaignRoutes'));
app.use('/api/contributions', require('./routes/contributionRoutes'));
app.use('/api/pledges', require('./routes/pledgeRoutes'));
app.use('/api/payments', require('./routes/paymentRoutes'));
app.use('/api/donations/analytics', require('./routes/donationAnalyticsRoutes'));
// Livestream routes
app.use('/api/livestreams', require('./routes/livestreamRoutes'));
// Feedback routes
app.use('/api/feedback', require('./routes/feedbackRoutes'));
// Volunteer routes
app.use('/api/volunteers', require('./routes/volunteerRoutes'));
// Add with other routes (around line 80-100)
app.use('/api/announcements', require('./routes/announcementRoutes'));

app.use('/api/', protect);

// User routes
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/roles', require('./routes/roleRoutes'));
app.use('/api/settings', require('./routes/settingsRoutes'));
app.use('/api/analytics', require('./routes/analyticsRoutes'));

app.use('/api/audit', require('./routes/auditRoutes'));
app.use('/api/transaction-audit', require('./routes/transactionAuditRoutes'));

app.use('/api/email-notifications', require('./routes/emailNotificationRoutes'));

// In server.js, add after other routes:
app.use('/api/email', require('./routes/emailTestRoutes'));

// ============================================
// 404 HANDLER (BEFORE ERROR HANDLER)
// ============================================

app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
    path: req.path,
    method: req.method
  });
});

// ============================================
// ERROR HANDLER (MUST BE LAST)
// ============================================

app.use(errorHandler);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`✓ Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
  console.log(`✓ API Documentation: http://localhost:${PORT}/`);
  console.log(`✓ Trust Proxy: Enabled for ${process.env.NODE_ENV === 'production' ? 'Render/Production' : 'Development'}`);
  console.log(`✓ CORS enabled for: ${allowedOrigins.join(', ')}`);
  console.log(`✓ Cloudinary: Configured`);
  console.log(`✓ Rate limiting enabled:`);
  console.log(`  - General API: 1000 requests per 15 minutes`);
  console.log(`  - Login: 10 attempts per 15 minutes`);
  console.log(`  - Signup: 5 attempts per 15 minutes`);
});

module.exports = app;