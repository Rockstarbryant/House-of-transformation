const express = require('express');
const { signup, login, verifyToken } = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const { validateSignup, validateLogin } = require('../middleware/validation');

const router = express.Router();

// Public routes
router.post('/signup', validateSignup, signup);
router.post('/login', validateLogin, login);

// Protected routes
router.get('/verify', protect, verifyToken);
router.post('/logout', protect, (req, res) => {
  // Logout logic
  res.json({ success: true, message: 'Logged out' });
});

module.exports = router;