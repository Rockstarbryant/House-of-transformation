const { createClient } = require('@supabase/supabase-js');
const config = require('../config/env');

// Initialize Supabase with ANON_KEY for verification
const supabase = createClient(
  config.SUPABASE_URL,
  config.SUPABASE_ANON_KEY
);

/**
 * ✅ PROTECTED ROUTE - Verify Supabase JWT
 * Verifies token and attaches Supabase user + MongoDB profile to req.user
 * Usage: router.get('/protected', protect, controller)
 */
exports.protect = async (req, res, next) => {
  let token;

  // Extract token from Authorization header
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  // No token provided
  if (!token) {
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
      return res.status(401).json({ 
        success: false,
        message: 'User profile not found' 
      });
    }

    // Attach to request - POPULATE ROLE
      const userWithRole = await User.findById(mongoUser._id).populate('role');
      req.user = userWithRole.toObject();
      req.user.supabase_uid = supabaseUser.id;
      req.user.email = supabaseUser.email;

    console.log('[AUTH-MIDDLEWARE] User authenticated:', req.user.email);
    next();

  } catch (error) {
    console.error('[AUTH-MIDDLEWARE] Token verification error:', error);
    return res.status(401).json({ 
      success: false,
      message: 'Token verification failed' 
    });
  }
};

/**
 * ✅ OPTIONAL AUTH - Attach user if token exists
 * Doesn't fail if no token - continues with req.user = null
 * Usage: router.get('/public', optionalAuth, controller)
 */
exports.optionalAuth = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    // If no token, continue as guest
    if (!token) {
      req.user = null;
      return next();
    }

    // Verify token
    const { data } = await supabase.auth.getUser(token);

    if (!data.user) {
      req.user = null;
      return next();
    }

    // Get MongoDB user
    const User = require('../models/User');
    const mongoUser = await User.findOne({ supabase_uid: data.user.id });

    if (mongoUser) {
      req.user = mongoUser.toObject();
      req.user.supabase_uid = data.user.id;
    } else {
      req.user = null;
    }

    next();

  } catch (error) {
    console.error('[AUTH-MIDDLEWARE] Optional auth error:', error);
    req.user = null;
    next();
  }
};

/**
 * ✅ ROLE-BASED AUTHORIZATION
 * Must be used AFTER protect middleware
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

      // Check if roleNames includes the string 'admin' or other legacy names
      // If so, do simple string check on user object
      if (roleNames.includes('admin') || roleNames.includes('pastor') || roleNames.includes('bishop')) {
        // NEW: Populate role and check role.name
        const User = require('../models/User');
        const fullUser = await User.findById(req.user._id).populate('role');
        
        if (!fullUser || !fullUser.role) {
          return res.status(403).json({ 
            success: false,
            message: 'User has no role assigned',
            requiredRoles: roleNames
          });
        }

        // Check if user's role name matches any of the required role names
        if (!roleNames.includes(fullUser.role.name)) {
          return res.status(403).json({ 
            success: false,
            message: `This action requires one of these roles: ${roleNames.join(', ')}`,
            requiredRoles: roleNames,
            userRole: fullUser.role.name
          });
        }

        // Attach populated role to request
        req.user = fullUser.toObject();
        next();
      } else {
        // If checking permissions instead, pass to requirePermission
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