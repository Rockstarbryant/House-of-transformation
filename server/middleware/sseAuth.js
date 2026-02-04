/**
 * SSE Authentication Middleware - JWT VERIFY METHOD
 * 
 * This uses jsonwebtoken library with proper algorithm support.
 * Requires SUPABASE_JWT_SECRET environment variable.
 * 
 * Setup:
 * 1. Get JWT Secret from Supabase Dashboard → Settings → API
 * 2. Add to .env: SUPABASE_JWT_SECRET=your-jwt-secret-here
 * 3. Restart server
 */

const jwt = require('jsonwebtoken');
const User = require('../models/User');

// ✅ Use Supabase's JWT secret (NOT the anon key!)
const SUPABASE_JWT_SECRET = process.env.SUPABASE_JWT_SECRET;

if (!SUPABASE_JWT_SECRET) {
  console.error('❌ CRITICAL: SUPABASE_JWT_SECRET is not defined in environment variables!');
  console.error('   Get it from: Supabase Dashboard → Settings → API → JWT Secret');
}

exports.protectSSE = async (req, res, next) => {
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
      res.writeHead(401, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'close'
      });
      res.write(': Unauthorized - no token provided\n\n');
      res.end();
      return;
    }

    // Check if JWT secret is configured
    if (!SUPABASE_JWT_SECRET) {
      console.error('[protectSSE] ❌ SUPABASE_JWT_SECRET not configured!');
      res.writeHead(500, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'close'
      });
      res.write(': Server configuration error\n\n');
      res.end();
      return;
    }

    // ✅ Verify JWT with Supabase secret and proper algorithm support
    let decoded;
    try {
      // Supabase tokens can use either HS256 or RS256
      // We support both to be safe
      decoded = jwt.verify(token, SUPABASE_JWT_SECRET, {
        algorithms: ['HS256', 'RS256'], // Accept both symmetric and asymmetric
        complete: false // We just need the payload
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
      
      // Provide helpful error messages
      let errorMessage = 'invalid token';
      if (err.name === 'TokenExpiredError') {
        errorMessage = 'token expired';
      } else if (err.name === 'JsonWebTokenError') {
        if (err.message.includes('invalid algorithm')) {
          errorMessage = 'invalid algorithm - check SUPABASE_JWT_SECRET';
        } else if (err.message.includes('invalid signature')) {
          errorMessage = 'invalid signature - check SUPABASE_JWT_SECRET';
        } else {
          errorMessage = err.message;
        }
      }
      
      res.writeHead(401, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'close'
      });
      res.write(`: Unauthorized - ${errorMessage}\n\n`);
      res.end();
      return;
    }

    // ✅ Extract user ID (Supabase typically uses 'sub' field)
    const userId = decoded.sub || decoded.id;

    if (!userId) {
      console.warn('[protectSSE] ❌ No user ID found in token payload');
      console.warn('[protectSSE] Token payload keys:', Object.keys(decoded));
      res.writeHead(401, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'close'
      });
      res.write(': Unauthorized - invalid token payload\n\n');
      res.end();
      return;
    }

    // Find user in MongoDB
    const user = await User.findById(userId)
      .select('_id name email role')
      .lean();

    if (!user) {
      console.warn('[protectSSE] ❌ User not found in MongoDB:', userId);
      res.writeHead(401, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'close'
      });
      res.write(': Unauthorized - user not found in database\n\n');
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
    
    res.writeHead(500, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'close'
    });
    res.write(': Internal authentication error\n\n');
    res.end();
  }
};