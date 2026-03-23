const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const User = require('../models/User');
const Role = require('../models/Role');
const config = require('../config/env');
const auditService = require('../services/auditService');
const { protect } = require('../middleware/supabaseAuth');
const { authLimiter, signupLimiter } = require('../middleware/rateLimiter');
const emailService = require('../services/emailService');

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
 * Email/password users: send verification email via Brevo
 * Google OAuth users: handled by /oauth-sync — no email needed
 */
router.post('/signup', signupLimiter, async (req, res) => {
  try {
    const { name, email, password } = req.body;

    console.log('[AUTH-SIGNUP] Request received for:', email);

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

    // Create user in Supabase WITHOUT auto-confirming email
    // email_confirm: false so Supabase marks them as unconfirmed
    // We will send the verification email ourselves via Brevo
    console.log('[AUTH-SIGNUP] Creating user in Supabase...');
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: false // ← do NOT auto-confirm; we send the email via Brevo
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

    // Get the 'member' role ObjectId
    const memberRole = await Role.findOne({ name: 'member' });
    if (!memberRole) {
      console.error('[AUTH-SIGNUP] Member role not found in database');
      await auditService.logAuth('signup', req, null, false, new Error('Member role not found'));
      return res.status(500).json({
        success: false,
        message: 'System error: Default role not configured'
      });
    }

    // Create MongoDB user profile
    console.log('[AUTH-SIGNUP] Creating MongoDB profile...');
    const user = await User.create({
      supabase_uid: supabaseUid,
      name,
      email,
      role: memberRole._id,
      isActive: true,
      authProvider: 'email'
    });

    console.log('[AUTH-SIGNUP] User profile created:', user._id);
    await auditService.logAuth('signup', req, user, true);

    // Generate email verification link via Supabase Admin API
    // This creates a secure one-time link — we send it ourselves via Brevo
    console.log('[AUTH-SIGNUP] Generating verification link...');
    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: 'signup',
      email,
      options: {
        redirectTo: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify-email`
      }
    });

    if (linkError) {
      // Non-fatal: user is created, we just couldn't send verification email
      console.error('[AUTH-SIGNUP] Failed to generate verification link:', linkError.message);
    } else {
      // Send the verification email via Brevo (not Supabase's own mailer)
      await emailService.sendVerificationEmail(email, name, linkData.properties.action_link);
      console.log('[AUTH-SIGNUP] Verification email sent via Brevo to:', email);
    }

    // Populate role for response
    const populatedUser = await User.findById(user._id).populate('role');

    res.status(201).json({
      success: true,
      message: 'Account created! Please check your email to verify your address before logging in.',
      requiresVerification: true,
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

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password required'
      });
    }

    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (authError || !authData.session) {
      console.error('[AUTH-LOGIN] Supabase error:', authError);
      await auditService.logAuth('login', req, null, false, authError);

      // Supabase returns "Email not confirmed" when verification is pending
      if (authError?.message?.toLowerCase().includes('email not confirmed')) {
        return res.status(401).json({
          success: false,
          message: 'Please verify your email before logging in. Check your inbox for the verification link.',
          code: 'EMAIL_NOT_VERIFIED'
        });
      }

      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

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
 * POST /api/auth/oauth-sync
 * Sync OAuth user with MongoDB (create if doesn't exist)
 * Google OAuth users are auto-verified by Google — no email verification needed
 */
router.post('/oauth-sync', async (req, res) => {
  try {
    const { supabase_uid, email, name, provider } = req.body;

    console.log('[AUTH-OAUTH-SYNC] Request for:', email, 'Provider:', provider);

    if (!supabase_uid || !email) {
      return res.status(400).json({
        success: false,
        message: 'Supabase UID and email required'
      });
    }

    let user = await User.findOne({ supabase_uid });

    if (!user) {
      console.log('[AUTH-OAUTH-SYNC] Creating new user for OAuth sign-in');

      const memberRole = await Role.findOne({ name: 'member' });
      if (!memberRole) {
        return res.status(500).json({
          success: false,
          message: 'System error: Default role not configured'
        });
      }

      user = await User.create({
        supabase_uid,
        name: name || email.split('@')[0],
        email,
        role: memberRole._id,
        isActive: true,
        authProvider: provider || 'google'
        // No emailVerified field needed — Google identity IS the verification
      });

      console.log('[AUTH-OAUTH-SYNC] New user created:', user._id);
      await auditService.logAuth('oauth-signup', req, user, true);

      // Send a welcome email only (no verification needed for OAuth)
      try {
        await emailService.sendWelcomeEmail(email, name || email.split('@')[0]);
      } catch (emailErr) {
        console.warn('[AUTH-OAUTH-SYNC] Welcome email failed (non-fatal):', emailErr.message);
      }
    } else {
      console.log('[AUTH-OAUTH-SYNC] Existing user found:', user._id);
      await auditService.logAuth('oauth-login', req, user, true);
    }

    const populatedUser = await User.findById(user._id).populate('role');

    res.json({
      success: true,
      user: {
        id: populatedUser._id,
        supabase_uid: populatedUser.supabase_uid,
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
    console.error('[AUTH-OAUTH-SYNC] Error:', error);
    await auditService.logError(req, error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/auth/resend-verification
 * Resend email verification link for email/password users only
 */
router.post('/resend-verification', authLimiter, async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, message: 'Email required' });
    }

    // Only applies to email/password users
    const user = await User.findOne({ email });
    if (!user) {
      // Return success anyway — don't reveal if account exists
      return res.json({ success: true, message: 'If an account exists, a verification email has been sent.' });
    }

    if (user.authProvider && user.authProvider !== 'email') {
      return res.status(400).json({
        success: false,
        message: 'This account uses Google sign-in. No email verification required.'
      });
    }

    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: 'signup',
      email,
      options: {
        redirectTo: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify-email`
      }
    });

    if (linkError) {
      console.error('[AUTH-RESEND] Link generation failed:', linkError.message);
      return res.status(500).json({ success: false, message: 'Failed to generate verification link' });
    }

    await emailService.sendVerificationEmail(email, user.name, linkData.properties.action_link);

    console.log('[AUTH-RESEND] Verification email resent to:', email);
    res.json({ success: true, message: 'Verification email sent. Please check your inbox.' });

  } catch (error) {
    console.error('[AUTH-RESEND] Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/auth/forgot-password
 * Send password reset email via Brevo (email/password users only)
 */
router.post('/forgot-password', authLimiter, async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, message: 'Email required' });
    }

    console.log('[AUTH-FORGOT] Password reset requested for:', email);

    // Check if this is an OAuth-only user — they don't have a password to reset
    const user = await User.findOne({ email });
    if (user && user.authProvider && user.authProvider !== 'email') {
      // Still return success — don't reveal account details
      // But log it so admins can see these attempts
      console.log('[AUTH-FORGOT] OAuth user requested password reset (skipped):', email);
      return res.json({
        success: true,
        message: 'If a password-based account exists, a reset link has been sent.'
      });
    }

    // Generate a secure password reset link via Supabase Admin API
    // We send this ourselves via Brevo instead of letting Supabase email it
    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: 'recovery',
      email,
      options: {
        redirectTo: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password`
      }
    });

    if (linkError) {
      console.error('[AUTH-FORGOT] Link generation failed:', linkError.message);
      // Still return success — don't reveal if account exists
    } else {
      await emailService.sendPasswordResetEmail(
        email,
        user?.name || null,
        linkData.properties.action_link
      );
      console.log('[AUTH-FORGOT] Reset email sent via Brevo to:', email);
    }

    // Always return success — security best practice (don't leak email existence)
    res.json({
      success: true,
      message: 'If a password-based account exists, a reset link has been sent.'
    });

  } catch (error) {
    console.error('[AUTH-FORGOT] Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/auth/refresh
 */
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ success: false, message: 'Refresh token required' });
    }

    const { data: newSession, error: refreshError } = await supabase.auth.refreshSession({
      refresh_token: refreshToken
    });

    if (refreshError || !newSession.session) {
      return res.status(401).json({ success: false, message: 'Refresh failed' });
    }

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
 * GET /api/auth/me
 */
router.get('/me', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate('role');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
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
    res.status(500).json({ success: false, message: 'Failed to fetch user profile' });
  }
});

/**
 * GET /api/auth/verify
 */
router.get('/verify', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate('role');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
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

console.log('[AUTH-ROUTES] Routes registered: /signup, /login, /oauth-sync, /resend-verification, /forgot-password, /refresh, /me, /verify, /logout');

module.exports = router;