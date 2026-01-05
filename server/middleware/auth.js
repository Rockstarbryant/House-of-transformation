const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * PROTECTED ROUTE - Requires valid JWT token
 * Attaches req.user to request object
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
    // Verify token signature and expiry
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Get user from database (exclude password)
    req.user = await User.findById(decoded.id).select('-password');
    
    // User was deleted after token was issued
    if (!req.user) {
      return res.status(401).json({ 
        success: false,
        message: 'User not found' 
      });
    }
    
    next();
  } catch (error) {
    // Handle token expiry separately
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        success: false,
        message: 'Token expired' 
      });
    }
    
    // Invalid token (malformed, wrong secret, etc)
    return res.status(401).json({ 
      success: false,
      message: 'Invalid token' 
    });
  }
};

/**
 * OPTIONAL AUTH - Attaches user if token exists, but doesn't require it
 * Used for public endpoints that show different content for logged-in users
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

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await User.findById(decoded.id).select('-password');
      next();
    } catch (error) {
      // Invalid token - just continue as guest
      req.user = null;
      next();
    }
  } catch (error) {
    req.user = null;
    next();
  }
};

/**
 * ROLE-BASED AUTHORIZATION
 * Check if user has required role
 * MUST be used AFTER protect middleware
 */
exports.authorize = (...roles) => {
  return (req, res, next) => {
    // protect middleware should have set req.user
    if (!req.user) {
      return res.status(401).json({ 
        success: false,
        message: 'User not authenticated' 
      });
    }

    // Check if user's role is in allowed roles
    if (!req.user.role || !roles.includes(req.user.role)) {
      return res.status(403).json({ 
        success: false,
        message: `This action requires one of these roles: ${roles.join(', ')}`,
        requiredRoles: roles,
        userRole: req.user.role || 'none'
      });
    }

    next();
  };
};

/**
 * LOGOUT - Clear token blacklist entry on production use Redis
 * For development, using in-memory Set is fine
 */
const tokenBlacklist = new Set();

exports.logout = (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (token) {
    tokenBlacklist.add(token);
    // In production, store in Redis with TTL = token expiry time
  }
  res.json({ success: true, message: 'Logged out successfully' });
};