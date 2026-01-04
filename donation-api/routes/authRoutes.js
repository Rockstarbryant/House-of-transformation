// ============================================
// FILE 13: routes/authRoutes.js (FIXED)
// ============================================
import express from 'express';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';

const router = express.Router();

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Too many login attempts, please try again later'
});

// Mock authentication (integrate with main API)
router.post('/login', limiter, (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email and password required' });
    }

    // Mock user - replace with actual auth from main API
    const user = {
      _id: '123456789',
      email,
      name: 'Test User',
      role: 'member',
      phone: '254712345678'
    };

    

    const token = jwt.sign(user, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE });

    res.json({
      success: true,
      token,
      user
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/verify-token', (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ success: false, error: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    res.json({ success: true, user: decoded });
  } catch (error) {
    res.status(401).json({ success: false, error: 'Invalid token' });
  }
});

export default router;