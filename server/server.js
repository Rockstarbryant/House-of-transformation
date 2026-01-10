const express = require('express');
const path = require('path');
const dotenv = require('dotenv');
const cors = require('cors');
const connectDB = require('./config/database');
const errorHandler = require('./middleware/errorHandler');
const { apiLimiter, authLimiter, signupLimiter } = require('./middleware/rateLimiter');

// ✅ ADD THIS LINE - Initialize Cloudinary config at startup
require('./config/cloudinaryConfig');

// Load env vars
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const auditMiddleware = require('./middleware/auditMiddleware');

// Connect to database
connectDB();

const app = express();

// ===== TRUST PROXY (CRITICAL FOR RENDER) =====
app.set('trust proxy', 1);

// ===== BODY PARSER =====
app.use(express.json());
app.use(express.urlencoded({ extended: true }));



// ===== CORS CONFIGURATION =====
const allowedOrigins = process.env.NODE_ENV === 'development' 
  ? [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:5001',
      'http://127.0.0.1:3000'   
    ]
  : [
      process.env.FRONTEND_URL,
      'https://comfy-gumdrop-df8b26.netlify.app',
      'https://house-of-transformation.vercel.app',
      'https://houseoftransformation-nextjs.vercel.app'
    ];

app.use('/api', auditMiddleware);

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
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

// Auth routes (MUST be first)
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/signup', signupLimiter);
app.use('/api/auth', require('./routes/authRoutes'));

// Content routes
app.use('/api/sermons', require('./routes/sermonRoutes'));
app.use('/api/blog', require('./routes/blogRoutes'));
app.use('/api/events', require('./routes/eventRoutes'));
app.use('/api/gallery', require('./routes/galleryRoutes'));

// User routes
app.use('/api/users', require('./routes/userRoutes'));

// Volunteer routes
app.use('/api/volunteers', require('./routes/volunteerRoutes'));

// Feedback routes
app.use('/api/feedback', require('./routes/feedbackRoutes'));

app.use('/api/livestreams', require('./routes/livestreamRoutes'));

app.use('/api/audit', require('./routes/auditRoutes'));

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
  console.log(`  - General API: 100 requests per 15 minutes`);
  console.log(`  - Login: 5 attempts per 15 minutes`);
  console.log(`  - Signup: 3 attempts per 15 minutes`);
});

module.exports = app;