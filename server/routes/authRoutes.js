const express = require('express');
const {
  signup,
  login,
  verifyToken,
  refreshToken,
  verifyEmail,
  resendVerificationEmail,
  forgotPassword,
  resetPassword,
  logout
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const { validateSignup, validateLogin } = require('../middleware/validation');

const router = express.Router();

// ===== PUBLIC ROUTES =====
// Signup with email verification
router.post('/signup', validateSignup, signup);

// Login
router.post('/login', validateLogin, login);

// Email verification
router.get('/verify-email/:token', verifyEmail);

// Resend verification email
router.post('/resend-verification', resendVerificationEmail);

// Forgot password
router.post('/forgot-password', forgotPassword);

// Reset password
router.post('/reset-password/:token', resetPassword);

// Refresh token
router.post('/refresh', refreshToken);

// ===== PROTECTED ROUTES =====
// Get current user
router.get('/verify', protect, verifyToken);

// Logout
router.post('/logout', protect, logout);

module.exports = router;