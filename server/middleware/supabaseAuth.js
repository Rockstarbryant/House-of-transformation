const { createClient } = require('@supabase/supabase-js');
const config = require('../config/env');
const Sentry = require('../config/sentry');

// Initialize Supabase with ANON_KEY for verification
const supabase = createClient(
  config.SUPABASE_URL,
  config.SUPABASE_ANON_KEY
);

/**
 * ✅ PROTECTED ROUTE - Verify Supabase JWT
 * Verifies token and attaches Supabase user + MongoDB profile to req.user.
 * Also calls Sentry.setUser() so every subsequent error in the same request
 * is tagged with the authenticated user's ID, email, and role — making it
 * trivial to search "all errors for user X" in the Sentry dashboard.
 */
exports.protect = async (req, res, next) => {
  let token;

  // Extract token from Authorization header
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  // No token provided
  if (!token) {
    Sentry.setUser(null);
    return res.status(401).json({ 
      success: false,
      message: 'Not authorized to access this route' 
    });
  }

  try {
    console.log('[AUTH-MIDDLEWARE] Verifying token...');

    // Verify Supabase JWT
    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data.user) {
      console.error('[AUTH-MIDDLEWARE] Token verification failed:', error);
      Sentry.setUser(null);
      return res.status(401).json({ 
        success: false,
        message: 'Invalid or expired token' 
      });
    }

    const supabaseUser = data.user;
    console.log('[AUTH-MIDDLEWARE] Token verified for:', supabaseUser.email);

    // Fetch MongoDB user profile
    const User = require('../models/User');
    const mongoUser = await User.findOne({ supabase_uid: supabaseUser.id });

    if (!mongoUser) {
      console.error('[AUTH-MIDDLEWARE] MongoDB profile not found for:', supabaseUser.id);
      Sentry.setUser(null);
      return res.status(401).json({ 
        success: false,
        message: 'User profile not found' 
      });
    }

    // Attach to request — populate role
    const userWithRole = await User.findById(mongoUser._id).populate('role');
    req.user = userWithRole.toObject();
    req.user.supabase_uid = supabaseUser.id;
    req.user.email = supabaseUser.email;

    // Tag this request's Sentry scope with the authenticated user.
    // Any error thrown after this point will include user context in Sentry.
    Sentry.setUser({
      id:    req.user._id.toString(),
      email: req.user.email,
      role:  req.user.role?.name,
    });

    console.log('[AUTH-MIDDLEWARE] User authenticated:', req.user.email);
    next();

  } catch (error) {
    console.error('[AUTH-MIDDLEWARE] Token verification error:', error);
    // Clear user context from Sentry so the error isn't attributed to a stale user
    Sentry.setUser(null);
    return res.status(401).json({ 
      success: false,
      message: 'Token verification failed' 
    });
  }
};

/**
 * ✅ OPTIONAL AUTH - Attach user if token exists
 * Doesn't fail if no token — continues with req.user = null.
 * Sets Sentry user context when a valid token is present.
 */
exports.optionalAuth = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    // No token — continue as guest, clear any stale Sentry user context
    if (!token) {
      req.user = null;
      Sentry.setUser(null);
      return next();
    }

    // Verify token
    const { data } = await supabase.auth.getUser(token);

    if (!data.user) {
      req.user = null;
      Sentry.setUser(null);
      return next();
    }

    // Get MongoDB user
    const User = require('../models/User');
    const mongoUser = await User.findOne({ supabase_uid: data.user.id });

    if (mongoUser) {
      req.user = mongoUser.toObject();
      req.user.supabase_uid = data.user.id;
      // Set Sentry user context for optional-auth routes too
      Sentry.setUser({
        id:    req.user._id.toString(),
        email: data.user.email,
      });
    } else {
      req.user = null;
      Sentry.setUser(null);
    }

    next();

  } catch (error) {
    console.error('[AUTH-MIDDLEWARE] Optional auth error:', error);
    Sentry.setUser(null);
    req.user = null;
    next();
  }
};

/**
 * ✅ ROLE-BASED AUTHORIZATION
 * Must be used AFTER protect middleware.
 * Usage: router.post('/admin', protect, authorize('admin'), controller)
 */
exports.authorize = (...roleNames) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ 
          success: false,
          message: 'User not authenticated' 
        });
      }

      if (roleNames.includes('admin') || roleNames.includes('pastor') || roleNames.includes('bishop')) {
        const User = require('../models/User');
        const fullUser = await User.findById(req.user._id).populate('role');
        
        if (!fullUser || !fullUser.role) {
          return res.status(403).json({ 
            success: false,
            message: 'User has no role assigned',
            requiredRoles: roleNames
          });
        }

        if (!roleNames.includes(fullUser.role.name)) {
          return res.status(403).json({ 
            success: false,
            message: `This action requires one of these roles: ${roleNames.join(', ')}`,
            requiredRoles: roleNames,
            userRole: fullUser.role.name
          });
        }

        req.user = fullUser.toObject();
        next();
      } else {
        next();
      }
    } catch (error) {
      console.error('[AUTH] authorize() error:', error);
      res.status(500).json({
        success: false,
        message: 'Authorization check failed'
      });
    }
  };
};