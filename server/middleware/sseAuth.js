/**
 * SSE-specific authentication middleware.
 *
 * Because the browser's EventSource API cannot send custom headers,
 * the JWT token is passed as a query parameter: ?token=<supabase-jwt>
 *
 * On auth failure, this middleware sets SSE headers and writes an error
 * event before closing the connection. This prevents the browser from
 * entering a reconnect loop against an endpoint that will never succeed.
 */

const { createClient } = require('@supabase/supabase-js');
const User = require('../models/User');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Mirror the same origin logic used in server.js
const getAllowedOrigins = () =>
  process.env.NODE_ENV === 'development'
    ? [
        'http://localhost:3000',
        'http://127.0.0.1:3000',
        'https://yobra194-1035364.postman.co',
        'http://localhost:5001',
      ]
    : [
        process.env.FRONTEND_URL,
        'https://comfy-gumdrop-df8b26.netlify.app',
        'https://hotadmin.vercel.app',
        'https://house-of-transformation.vercel.app',
        'https://houseoftransformation-nextjs.vercel.app',
        'https://busiahouseoftransformation.netlify.app',
      ].filter(Boolean); // strip undefined if FRONTEND_URL is not set

const writeSSEError = (res, statusCode, message) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'close');
  res.status(statusCode);
  res.write(`data: ${JSON.stringify({ type: 'error', message })}\n\n`);
  res.end();
};

exports.protectSSE = async (req, res, next) => {
  // ── CORS headers ────────────────────────────────────────────────────────
  const origin         = req.headers.origin;
  const allowedOrigins = getAllowedOrigins();

  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Cache-Control');
    res.setHeader('Access-Control-Expose-Headers', 'Content-Type, Cache-Control, Connection');
  } else if (process.env.NODE_ENV === 'development') {
    // In dev, allow all origins for easier local testing
    res.setHeader('Access-Control-Allow-Origin', '*');
  }

  // ── Extract token ────────────────────────────────────────────────────────
  const token =
    req.query.token ||
    (req.headers.authorization?.startsWith('Bearer ')
      ? req.headers.authorization.split(' ')[1]
      : null);

  if (!token) {
    return writeSSEError(res, 401, 'Unauthorized — no token provided');
  }

  try {
    // ── Verify with Supabase ────────────────────────────────────────────────
    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data?.user) {
      console.warn('[protectSSE] Token verification failed:', error?.message);
      return writeSSEError(res, 401, 'Unauthorized — invalid token');
    }

    // ── Look up MongoDB user ────────────────────────────────────────────────
    const user = await User.findOne({ supabase_uid: data.user.id })
      .select('_id name email role')
      .populate('role', 'name permissions')
      .lean();

    if (!user) {
      return writeSSEError(res, 401, 'Unauthorized — user profile not found');
    }

    req.user = user;
    console.log('[protectSSE] ✅ Authenticated:', user.email);
    next();

  } catch (err) {
    console.error('[protectSSE] Unexpected error:', err.message);
    return writeSSEError(res, 500, 'Internal authentication error');
  }
};