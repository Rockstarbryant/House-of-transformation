// ============================================
// FILE 14: middleware/authMiddleware.js (FIXED)
// ============================================
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export const authenticate = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ success: false, error: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ success: false, error: 'Invalid token' });
  }
};

export const adminOnly = (req, res, next) => {
  if (req.user?.role !== 'admin' && req.user?.role !== 'pastor' && req.user?.role !== 'secretary') {
    return res.status(403).json({ success: false, error: 'Admin access required' });
  }
  next();
};

// Optional authentication - attaches user if token exists, but doesn't require it
export const optionalAuth = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    // If no token, just continue without user
    if (!token) {
      req.user = null;
      return next();
    }

    try {
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Get user from token
      req.user = decoded;
      
      next();
    } catch (error) {
      // If token is invalid, just continue without user (don't throw error)
      req.user = null;
      next();
    }
  } catch (error) {
    req.user = null;
    next();
  }
};