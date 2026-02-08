/**
 * SSE Authentication Middleware - JWT VERIFY METHOD
 * With proper CORS headers
 */

const jwt = require('jsonwebtoken');
const User = require('../models/User');

const SUPABASE_JWT_SECRET = process.env.SUPABASE_JWT_SECRET;

if (!SUPABASE_JWT_SECRET) {
  console.error('❌ CRITICAL: SUPABASE_JWT_SECRET is not defined in environment variables!');
  console.error('   Get it from: Supabase Dashboard → Settings → API → JWT Secret');
}

exports.protectSSE = async (req, res, next) => {
  // ✅ CRITICAL: Set CORS headers FIRST, before any logic
  const origin = req.headers.origin;
  const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://127.0.0.1:3000',
    'https://comfy-gumdrop-df8b26.netlify.app',
    'https://hotadmin.vercel.app',
    'https://house-of-transformation.vercel.app',
    'https://busiahouseoftransformation.netlify.app'
  ];

  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Cache-Control');
    res.setHeader('Access-Control-Expose-Headers', 'Content-Type, Cache-Control, Connection');
  }

  try {
    let token;

    // 1. Get token from query param (for SSE - EventSource limitation)
    if (req.query.token) {
      token = req.query.token;
      console.log('[protectSSE] ✓ Token from query param');
    }
    // 2. Fallback to Authorization header
    else if (req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
      console.log('[protectSSE] ✓ Token from Authorization header');
    }

    // No token provided
    if (!token) {
      console.warn('[protectSSE] ❌ No token provided');
      
      // Set SSE error response headers
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'close');
      
      res.status(401);
      res.write('data: {"type":"error","message":"Unauthorized - no token"}\n\n');
      res.end();
      return;
    }

    // Check if JWT secret is configured
    if (!SUPABASE_JWT_SECRET) {
      console.error('[protectSSE] ❌ SUPABASE_JWT_SECRET not configured!');
      
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'close');
      
      res.status(500);
      res.write('data: {"type":"error","message":"Server configuration error"}\n\n');
      res.end();
      return;
    }

    // Verify JWT
    let decoded;
    try {
      decoded = jwt.verify(token, SUPABASE_JWT_SECRET, {
        algorithms: ['HS256', 'RS256', 'ES256'], // ← Add ES256!
        complete: false
      });
      
      console.log('[protectSSE] ✅ Token verified successfully');
      console.log('[protectSSE] Token info:', {
        userId: decoded.sub || decoded.id,
        email: decoded.email,
        role: decoded.role,
        exp: new Date(decoded.exp * 1000).toISOString()
      });
      
    } catch (err) {
      console.error('[protectSSE] ❌ Token verification failed:', err.message);
      
      let errorMessage = 'invalid token';
      if (err.name === 'TokenExpiredError') {
        errorMessage = 'token expired';
      } else if (err.name === 'JsonWebTokenError') {
        if (err.message.includes('invalid algorithm')) {
          errorMessage = 'invalid algorithm';
        } else if (err.message.includes('invalid signature')) {
          errorMessage = 'invalid signature';
        } else {
          errorMessage = err.message;
        }
      }
      
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'close');
      
      res.status(401);
      res.write(`data: {"type":"error","message":"Unauthorized - ${errorMessage}"}\n\n`);
      res.end();
      return;
    }

    // Extract user ID
    const userId = decoded.sub || decoded.id;

    if (!userId) {
      console.warn('[protectSSE] ❌ No user ID found in token payload');
      
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'close');
      
      res.status(401);
      res.write('data: {"type":"error","message":"Unauthorized - invalid token payload"}\n\n');
      res.end();
      return;
    }

    // Find user in MongoDB
    const user = await User.findById(userId)
      .select('_id name email role')
      .lean();

    if (!user) {
      console.warn('[protectSSE] ❌ User not found in MongoDB:', userId);
      
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'close');
      
      res.status(401);
      res.write('data: {"type":"error","message":"Unauthorized - user not found"}\n\n');
      res.end();
      return;
    }

    // Attach user to request
    req.user = user;
    console.log('[protectSSE] ✅ User authenticated successfully:', user.email);

    // Continue to next middleware
    next();

  } catch (error) {
    console.error('[protectSSE] ❌ Unexpected authentication error:', error);
    console.error('[protectSSE] Stack trace:', error.stack);
    
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'close');
    
    res.status(500);
    res.write('data: {"type":"error","message":"Internal authentication error"}\n\n');
    res.end();
  }
};