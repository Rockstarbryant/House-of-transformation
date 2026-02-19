const { createClient } = require('@supabase/supabase-js');
const User = require('../models/User');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

exports.protectSSE = async (req, res, next) => {
  // Set CORS headers first (keep your existing CORS code)
  const origin = req.headers.origin;
  const allowedOrigins = [ /* your existing list */ ];
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Cache-Control');
    res.setHeader('Access-Control-Expose-Headers', 'Content-Type, Cache-Control, Connection');
  }

  try {
    let token = req.query.token || 
                (req.headers.authorization?.startsWith('Bearer ') 
                  ? req.headers.authorization.split(' ')[1] 
                  : null);

    if (!token) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'close');
      res.status(401);
      res.write('data: {"type":"error","message":"Unauthorized - no token"}\n\n');
      res.end();
      return;
    }

    // ✅ Use Supabase client instead of jwt.verify() directly
    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data.user) {
      console.error('[protectSSE] ❌ Token verification failed:', error?.message);
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'close');
      res.status(401);
      res.write('data: {"type":"error","message":"Unauthorized - invalid token"}\n\n');
      res.end();
      return;
    }

    // Find user in MongoDB
    const user = await User.findOne({ supabase_uid: data.user.id })
      .select('_id name email role')
      .lean();

    if (!user) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'close');
      res.status(401);
      res.write('data: {"type":"error","message":"Unauthorized - user not found"}\n\n');
      res.end();
      return;
    }

    req.user = user;
    console.log('[protectSSE] ✅ User authenticated:', user.email);
    next();

  } catch (error) {
    console.error('[protectSSE] ❌ Unexpected error:', error);
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'close');
    res.status(500);
    res.write('data: {"type":"error","message":"Internal authentication error"}\n\n');
    res.end();
  }
};