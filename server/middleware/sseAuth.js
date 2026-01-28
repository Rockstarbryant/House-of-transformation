/**
 * SSE Authentication Middleware
 * EventSource doesn't support custom headers, so we accept token from query parameter
 */

const jwt = require('jsonwebtoken');
const User = require('../models/User');

exports.protectSSE = async (req, res, next) => {
  try {
    let token;

    // Check for token in query parameter (for SSE)
    if (req.query.token) {
      token = req.query.token;
    }
    // Fallback to Authorization header
    else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to access this route'
      });
    }

    try {
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Get user from database
      const user = await User.findById(decoded.id).populate('role');

      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'User not found'
        });
      }

      // Attach user to request
      req.user = user;
      next();

    } catch (error) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized, token failed'
      });
    }

  } catch (error) {
    console.error('[SSE-AUTH] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Authentication error'
    });
  }
};