const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const User = require('../models/User');
const Role = require('../models/Role');
const config = require('../config/env');
const auditService = require('../services/auditService');
const { protect } = require('../middleware/supabaseAuth');
const { authLimiter, signupLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

console.log('[AUTH-ROUTES] Routes file loaded');

// Initialize Supabase with SERVICE_KEY (for server-side operations)
const supabase = createClient(
  config.SUPABASE_URL,
  config.SUPABASE_SERVICE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

/**
 * POST /api/auth/signup
 * Create user in Supabase Auth + MongoDB profile
 */
router.post('/signup', signupLimiter, async (req, res) => {
  try {
    const { name, email, password } = req.body;

    console.log('[AUTH-SIGNUP] Request received for:', email);

    // Validate input
    if (!name || !email || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Name, email, and password required' 
      });
    }

    if (password.length < 8) {
      return res.status(400).json({ 
        success: false, 
        message: 'Password must be at least 8 characters' 
      });
    }

    // Check if user already exists in MongoDB
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      console.log('[AUTH-SIGNUP] User already exists:', email);
      await auditService.logAuth('signup', req, null, false, new Error('User already exists'));
      return res.status(400).json({ 
        success: false, 
        message: 'Email already registered' 
      });
    }

    // Create user in Supabase Auth
    console.log('[AUTH-SIGNUP] Creating user in Supabase...');
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true // Auto-confirm email
    });

    if (authError || !authData.user) {
      console.error('[AUTH-SIGNUP] Supabase error:', authError);
      await auditService.logAuth('signup', req, null, false, authError);
      return res.status(400).json({ 
        success: false, 
        message: authError?.message || 'Signup failed' 
      });
    }

    const supabaseUid = authData.user.id;
    console.log('[AUTH-SIGNUP] User created in Supabase:', supabaseUid);

    // FIX: Get the 'member' role ObjectId
    console.log('[AUTH-SIGNUP] Fetching member role...');
    const memberRole = await Role.findOne({ name: 'member' });
    
    if (!memberRole) {
      console.error('[AUTH-SIGNUP] Member role not found in database');
      await auditService.logAuth('signup', req, null, false, new Error('Member role not found'));
      return res.status(500).json({ 
        success: false, 
        message: 'System error: Default role not configured' 
      });
    }

    console.log('[AUTH-SIGNUP] Found member role:', memberRole._id);

    // Create MongoDB user profile with role ObjectId
    console.log('[AUTH-SIGNUP] Creating MongoDB profile...');
    const user = await User.create({
      supabase_uid: supabaseUid,
      name,
      email,
      role: memberRole._id, // FIX: Pass ObjectId, not string
      isActive: true
    });

    console.log('[AUTH-SIGNUP] User profile created:', user._id);
    await auditService.logAuth('signup', req, user, true);

    // Populate role for response
    const populatedUser = await User.findById(user._id).populate('role');

    res.status(201).json({
      success: true,
      message: 'Account created successfully!',
      user: {
        id: populatedUser._id,
        supabase_uid: supabaseUid,
        name: populatedUser.name,
        email: populatedUser.email,
        role: {
          id: populatedUser.role._id,
          name: populatedUser.role.name,
          permissions: populatedUser.role.permissions || []
        }
      }
    });

  } catch (error) {
    console.error('[AUTH-SIGNUP] Error:', error);
    await auditService.logError(req, error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/auth/login
 * Authenticate with Supabase
 */
router.post('/login', authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;

    console.log('[AUTH-LOGIN] Request received for:', email);

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email and password required' 
      });
    }

    // Authenticate with Supabase
    console.log('[AUTH-LOGIN] Authenticating with Supabase...');
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (authError || !authData.session) {
      console.error('[AUTH-LOGIN] Supabase error:', authError);
      await auditService.logAuth('login', req, null, false, authError);
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid email or password' 
      });
    }

    // Get MongoDB user profile with role populated
    console.log('[AUTH-LOGIN] Fetching MongoDB profile...');
    const user = await User.findOne({ supabase_uid: authData.user.id }).populate('role');

    if (!user) {
      console.error('[AUTH-LOGIN] User profile not found:', authData.user.id);
      await auditService.logAuth('login', req, null, false, new Error('User profile not found'));
      return res.status(404).json({ 
        success: false, 
        message: 'User profile not found' 
      });
    }

    console.log('[AUTH-LOGIN] Login successful for:', email);
    await auditService.logAuth('login', req, user, true);

    res.json({
      success: true,
      token: authData.session.access_token,
      refreshToken: authData.session.refresh_token,
      user: {
        id: user._id,
        supabase_uid: user.supabase_uid,
        name: user.name,
        email: user.email,
        role: user.role ? {
          id: user.role._id,
          name: user.role.name,
          permissions: user.role.permissions || []
        } : null
      }
    });

  } catch (error) {
    console.error('[AUTH-LOGIN] Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/auth/refresh
 * Refresh JWT token using refresh token
 */
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ 
        success: false, 
        message: 'Refresh token required' 
      });
    }

    console.log('[AUTH-REFRESH] Token refresh attempt');

    // Refresh session with Supabase
    const { data: newSession, error: refreshError } = await supabase.auth.refreshSession({
      refresh_token: refreshToken
    });

    if (refreshError || !newSession.session) {
      console.error('[AUTH-REFRESH] Refresh error:', refreshError);
      return res.status(401).json({ 
        success: false, 
        message: 'Refresh failed' 
      });
    }

    console.log('[AUTH-REFRESH] Token refreshed successfully');

    res.json({
      success: true,
      token: newSession.session.access_token,
      refreshToken: newSession.session.refresh_token
    });

  } catch (error) {
    console.error('[AUTH-REFRESH] Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/auth/forgot-password
 * Send password reset email
 */
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email required' 
      });
    }

    console.log('[AUTH-FORGOT] Password reset requested for:', email);

    // Send reset email
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password`
    });

    if (resetError) {
      console.error('[AUTH-FORGOT] Reset error:', resetError);
    }

    // Always return success (don't leak email existence)
    res.json({
      success: true,
      message: 'If account exists, password reset email has been sent'
    });

  } catch (error) {
    console.error('[AUTH-FORGOT] Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/auth/me
 * Get current authenticated user with role + permissions
 * Used by frontend to load portal
 */
router.get('/me', protect, async (req, res) => {
  try {
    console.log('[AUTH-ME] Fetching user profile:', req.user.email);

    const user = await User.findById(req.user._id).populate('role');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      user: {
        id: user._id,
        supabase_uid: user.supabase_uid,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        role: user.role ? {
          id: user.role._id,
          name: user.role.name,
          description: user.role.description,
          permissions: user.role.permissions || []
        } : null
      }
    });
  } catch (error) {
    console.error('[AUTH-ME] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user profile'
    });
  }
});

/**
 * GET /api/auth/verify
 * Get current authenticated user (protected route)
 */
router.get('/verify', protect, async (req, res) => {
  try {
    console.log('[AUTH-VERIFY] Token verification for:', req.user.email);

    // protect middleware already attached req.user
    const user = await User.findById(req.user._id).populate('role');

    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    res.json({
      success: true,
      user: {
        id: user._id,
        supabase_uid: user.supabase_uid,
        name: user.name,
        email: user.email,
        role: user.role ? {
          id: user.role._id,
          name: user.role.name,
          permissions: user.role.permissions || []
        } : null,
        avatar: user.avatar
      }
    });

  } catch (error) {
    console.error('[AUTH-VERIFY] Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/auth/logout
 * Logout user (token blacklist handled on frontend)
 */
router.post('/logout', protect, async (req, res) => {
  try {
    console.log('[AUTH-LOGOUT] Logout for user:', req.user.email);
    await auditService.logAuth('logout', req, req.user, true);
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    console.error('[AUTH-LOGOUT] Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

console.log('[AUTH-ROUTES] Routes registered: /health, /signup, /login, /refresh, /forgot-password, /verify, /logout');

module.exports = router;