const User = require('../models/User');
const BannedUser = require('../models/BannedUser');
const Role = require('../models/Role');
const asyncHandler = require('../middleware/asyncHandler');
const { createClient } = require('@supabase/supabase-js');
const config = require('../config/env');

// Initialize Supabase Admin Client for user deletion
const supabaseAdmin = createClient(
  config.SUPABASE_URL,
  config.SUPABASE_SERVICE_KEY
);

// Helper function to get client IP address
const getClientIP = (req) => {
  return req.headers['x-forwarded-for']?.split(',')[0].trim() ||
         req.headers['x-real-ip'] ||
         req.connection.remoteAddress ||
         req.socket.remoteAddress ||
         'unknown';
};

// @desc    Get all users (for directory/members portal)
// @route   GET /api/users
// @access  Public
exports.getAllUsers = asyncHandler(async (req, res) => {
  const users = await User.find({ isBanned: false })
    .select('-password')
    .populate('role', 'name permissions')
    .sort({ createdAt: -1 });

  res.json({
    success: true,
    count: users.length,
    users
  });
});

// @desc    Get single user by ID
// @route   GET /api/users/:id
// @access  Public
exports.getUserById = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id)
    .select('-password')
    .populate('role', 'name permissions');

  if (!user) {
    return res.status(404).json({ success: false, message: 'User not found' });
  }

  if (user.isBanned) {
    return res.status(403).json({ success: false, message: 'User is banned' });
  }

  res.json({
    success: true,
    user
  });
});

// @desc    Get current user profile
// @route   GET /api/users/me/profile
// @access  Private
exports.getMyProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id)
    .select('-password')
    .populate('role', 'name permissions');

  if (!user) {
    return res.status(404).json({ success: false, message: 'User not found' });
  }

  if (user.isBanned) {
    return res.status(403).json({ 
      success: false, 
      message: 'Your account has been banned. Please contact support.' 
    });
  }

  res.json({
    success: true,
    user
  });
});

// @desc    Update user profile
// @route   PUT /api/users/:id
// @access  Private (own profile or admin)
exports.updateUser = asyncHandler(async (req, res) => {
  const { name, email, phone, bio, location, avatar, gender } = req.body;
   
  // Check if user is updating their own profile or is admin
  const isOwnProfile = req.user._id.toString() === req.params.id;
  const isAdmin = req.user.role?.name === 'admin';

  if (!isOwnProfile && !isAdmin) {
    return res.status(403).json({ 
      success: false, 
      message: 'Not authorized to update this profile' 
    });
  }

  // Build update object
  const updateData = {};
  if (name) updateData.name = name;
  if (phone !== undefined) updateData.phone = phone;
  if (bio !== undefined) updateData.bio = bio;
  if (location !== undefined) updateData.location = location;
  if (avatar !== undefined) updateData.avatar = avatar;
  if (gender && ['male', 'female'].includes(gender)) updateData.gender = gender;
  
  // Only admin can change email
  if (email && isAdmin) updateData.email = email;

  const user = await User.findByIdAndUpdate(
    req.params.id,
    updateData,
    { new: true, runValidators: true }
  )
  .select('-password')
  .populate('role', 'name permissions');

  if (!user) {
    return res.status(404).json({ success: false, message: 'User not found' });
  }

  res.json({
    success: true,
    message: 'Profile updated successfully',
    user
  });
});

// @desc    Update user role (Admin only)
// @route   PUT /api/users/:id/role
// @access  Private/Admin
exports.updateUserRole = asyncHandler(async (req, res) => {
  const { roleId } = req.body;

  // Verify requester is admin
  if (req.user.role?.name !== 'admin') {
    return res.status(403).json({ 
      success: false, 
      message: 'Not authorized to update roles' 
    });
  }

  if (!roleId) {
    return res.status(400).json({ 
      success: false, 
      message: 'roleId is required' 
    });
  }

  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role: roleId },
      { new: true, runValidators: true }
    ).populate('role');

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({
      success: true,
      message: `User role updated to ${user.role.name}`,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: {
          id: user.role._id,
          name: user.role.name,
          permissions: user.role.permissions
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @desc    Search users by name or email
// @route   GET /api/users/search?q=query
// @access  Public
exports.searchUsers = asyncHandler(async (req, res) => {
  const { q } = req.query;

  if (!q || q.length < 2) {
    return res.status(400).json({ 
      success: false, 
      message: 'Search query must be at least 2 characters' 
    });
  }

  const users = await User.find({
    isBanned: false,
    $or: [
      { name: { $regex: q, $options: 'i' } },
      { email: { $regex: q, $options: 'i' } }
    ]
  })
    .select('-password')
    .populate('role', 'name')
    .limit(10);

  res.json({
    success: true,
    count: users.length,
    users
  });
});

// @desc    Get users by role
// @route   GET /api/users/role/:role
// @access  Public
exports.getUsersByRole = asyncHandler(async (req, res) => {
  const { role } = req.params;

  const validRoles = ['member', 'volunteer', 'usher', 'worship_team', 'pastor', 'bishop', 'admin'];
  if (!validRoles.includes(role)) {
    return res.status(400).json({ 
      success: false, 
      message: 'Invalid role' 
    });
  }

  // Get the role object from DB first
  const roleObj = await Role.findOne({ name: role.toLowerCase() });
  
  if (!roleObj) {
    return res.status(404).json({
      success: false,
      message: 'Role not found'
    });
  }

  // Query users by role ObjectId, exclude banned
  const users = await User.find({ 
    role: roleObj._id,
    isBanned: false 
  })
    .select('-password')
    .populate('role', 'name')
    .sort({ name: 1 });

  res.json({
    success: true,
    count: users.length,
    users
  });
});

// @desc    Delete user (Admin only) - SOFT DELETE, removes from both MongoDB and Supabase
// @route   DELETE /api/users/:id
// @access  Private/Admin
exports.deleteUser = asyncHandler(async (req, res) => {
  if (req.user.role?.name !== 'admin') {
    return res.status(403).json({ 
      success: false, 
      message: 'Not authorized' 
    });
  }

  const user = await User.findById(req.params.id);

  if (!user) {
    return res.status(404).json({ success: false, message: 'User not found' });
  }

  // Prevent admin from deleting themselves
  if (user._id.toString() === req.user._id.toString()) {
    return res.status(400).json({ 
      success: false, 
      message: 'You cannot delete your own account' 
    });
  }

  try {
    // Step 1: Delete from Supabase Auth
    if (user.supabase_uid) {
      try {
        const { error } = await supabaseAdmin.auth.admin.deleteUser(user.supabase_uid);
        
        if (error) {
          console.error('[DELETE-USER] Supabase deletion error:', error);
          // Continue with MongoDB deletion even if Supabase fails
        } else {
          console.log('[DELETE-USER] ✅ User deleted from Supabase:', user.email);
        }
      } catch (supabaseError) {
        console.error('[DELETE-USER] Supabase error:', supabaseError);
        // Continue with MongoDB deletion
      }
    }

    // Step 2: Delete from MongoDB
    await User.findByIdAndDelete(req.params.id);

    console.log('[DELETE-USER] ✅ User deleted from MongoDB:', user.email);

    res.json({
      success: true,
      message: 'User deleted successfully from both Supabase and MongoDB'
    });
  } catch (error) {
    console.error('[DELETE-USER] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete user',
      error: error.message
    });
  }
});

// @desc    Ban user permanently (Admin only)
// @route   POST /api/users/:id/ban
// @access  Private/Admin
exports.banUser = asyncHandler(async (req, res) => {
  const { reason } = req.body;

  if (req.user.role?.name !== 'admin') {
    return res.status(403).json({ 
      success: false, 
      message: 'Not authorized' 
    });
  }

  if (!reason || reason.trim().length < 5) {
    return res.status(400).json({
      success: false,
      message: 'Ban reason is required (minimum 5 characters)'
    });
  }

  const user = await User.findById(req.params.id).populate('role', 'name');

  if (!user) {
    return res.status(404).json({ success: false, message: 'User not found' });
  }

  // Prevent admin from banning themselves
  if (user._id.toString() === req.user._id.toString()) {
    return res.status(400).json({ 
      success: false, 
      message: 'You cannot ban yourself' 
    });
  }

  // Prevent banning other admins
  if (user.role?.name === 'admin') {
    return res.status(400).json({
      success: false,
      message: 'Cannot ban admin users'
    });
  }

  try {
    // Get client IP
    const clientIP = getClientIP(req);

    // Step 1: Create banned user record
    const bannedUser = await BannedUser.create({
      email: user.email.toLowerCase(),
      supabase_uid: user.supabase_uid,
      name: user.name,
      ipAddresses: [clientIP],
      reason: reason.trim(),
      bannedBy: req.user._id,
      originalUserData: {
        role: user.role?.name,
        phone: user.phone,
        location: user.location
      }
    });

    console.log('[BAN-USER] ✅ Banned user record created:', user.email);

    // Step 2: Delete from Supabase Auth
    if (user.supabase_uid) {
      try {
        const { error } = await supabaseAdmin.auth.admin.deleteUser(user.supabase_uid);
        
        if (error) {
          console.error('[BAN-USER] Supabase deletion error:', error);
        } else {
          console.log('[BAN-USER] ✅ User deleted from Supabase:', user.email);
        }
      } catch (supabaseError) {
        console.error('[BAN-USER] Supabase error:', supabaseError);
      }
    }

    // Step 3: Mark user as banned in MongoDB (keep record for audit)
    user.isBanned = true;
    user.bannedAt = new Date();
    user.bannedBy = req.user._id;
    user.banReason = reason.trim();
    user.isActive = false;
    await user.save();

    console.log('[BAN-USER] ✅ User marked as banned in MongoDB:', user.email);

    res.json({
      success: true,
      message: `User banned successfully. Email and IP address blocked.`,
      bannedUser: {
        email: bannedUser.email,
        name: bannedUser.name,
        reason: bannedUser.reason,
        bannedAt: bannedUser.bannedAt
      }
    });
  } catch (error) {
    console.error('[BAN-USER] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to ban user',
      error: error.message
    });
  }
});

// @desc    Check if email or IP is banned
// @route   POST /api/users/check-ban
// @access  Public
exports.checkBanStatus = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const clientIP = getClientIP(req);

  const emailBanned = await BannedUser.isEmailBanned(email);
  const ipBanned = await BannedUser.isIPBanned(clientIP);

  if (emailBanned || ipBanned) {
    const banDetails = await BannedUser.getBanDetails(email);
    
    return res.status(403).json({
      success: false,
      banned: true,
      message: 'This account has been banned from the system',
      reason: banDetails?.reason || 'Account violation',
      bannedAt: banDetails?.bannedAt
    });
  }

  res.json({
    success: true,
    banned: false
  });
});

// @desc    Manual user registration by admin
// @route   POST /api/users/manual-register
// @access  Private/Admin
exports.manualRegisterUser = asyncHandler(async (req, res) => {
  const { name, email, phone, location, gender, roleId } = req.body;

  // Verify requester is admin
  if (req.user.role?.name !== 'admin') {
    return res.status(403).json({ 
      success: false, 
      message: 'Not authorized' 
    });
  }

  // Validate required fields
  if (!name || !email) {
    return res.status(400).json({
      success: false,
      message: 'Name and email are required'
    });
  }

  // Check if email already exists in MongoDB
  const existingUser = await User.findOne({ email: email.toLowerCase() });
  if (existingUser) {
    return res.status(400).json({
      success: false,
      message: 'Email already registered'
    });
  }

  // Check if email is banned
  const isBanned = await BannedUser.isEmailBanned(email);
  if (isBanned) {
    return res.status(403).json({
      success: false,
      message: 'This email is banned from the system'
    });
  }

  try {
    // Generate a random password for Supabase
    const randomPassword = Math.random().toString(36).slice(-12) + 'Aa1!';

    // Step 1: Create user in Supabase
    const { data: supabaseUser, error: supabaseError } = await supabaseAdmin.auth.admin.createUser({
      email: email.toLowerCase(),
      password: randomPassword,
      email_confirm: true,
      user_metadata: {
        name: name,
        registered_by: 'admin',
        registered_by_id: req.user._id.toString()
      }
    });

    if (supabaseError) {
      console.error('[MANUAL-REGISTER] Supabase error:', supabaseError);
      
      if (supabaseError.message?.includes('already registered')) {
        return res.status(400).json({
          success: false,
          message: 'Email already exists in authentication system'
        });
      }
      
      throw new Error(supabaseError.message);
    }

    console.log('[MANUAL-REGISTER] ✅ User created in Supabase:', email);

    // Step 2: Create user in MongoDB
    let userRole = roleId;
    
    // If no role specified, default to member
    if (!userRole) {
      const memberRole = await Role.findOne({ name: 'member' });
      userRole = memberRole?._id;
    }

    const newUser = await User.create({
      supabase_uid: supabaseUser.user.id,
      name: name.trim(),
      email: email.toLowerCase(),
      phone: phone || undefined,
      location: location || undefined,
      gender: gender && ['male', 'female'].includes(gender) ? gender : undefined,
      role: userRole,
      isActive: true
    });

    const populatedUser = await User.findById(newUser._id)
      .populate('role', 'name permissions')
      .select('-password');

    console.log('[MANUAL-REGISTER] ✅ User created in MongoDB:', email);

    res.status(201).json({
      success: true,
      message: 'User registered successfully by admin',
      user: populatedUser,
      temporaryPassword: randomPassword,
      note: 'Please provide the temporary password to the user securely'
    });
  } catch (error) {
    console.error('[MANUAL-REGISTER] Error:', error);
    
    // Cleanup: If MongoDB creation fails, try to delete from Supabase
    if (supabaseUser?.user?.id) {
      try {
        await supabaseAdmin.auth.admin.deleteUser(supabaseUser.user.id);
        console.log('[MANUAL-REGISTER] Cleanup: Deleted user from Supabase');
      } catch (cleanupError) {
        console.error('[MANUAL-REGISTER] Cleanup error:', cleanupError);
      }
    }

    res.status(500).json({
      success: false,
      message: 'Failed to register user',
      error: error.message
    });
  }
});


// @desc    User self-deletion - UPDATED to handle OAuth users
// @route   DELETE /api/users/me/delete-account
// @access  Private
exports.deleteSelfAccount = asyncHandler(async (req, res) => {
  const { password } = req.body;

  const user = await User.findById(req.user._id).populate('role');

  if (!user) {
    return res.status(404).json({ success: false, message: 'User not found' });
  }

  // Prevent admin from self-deleting
  if (user.role?.name === 'admin') {
    return res.status(400).json({
      success: false,
      message: 'Admin accounts cannot be self-deleted. Please contact another admin.'
    });
  }

  try {
    // ✨ NEW: Check if user signed up with OAuth (Google, Facebook, etc.)
    const isOAuthUser = user.authProvider && user.authProvider !== 'email';

    // Only verify password for email/password users
    if (!isOAuthUser) {
      // Require password for email/password accounts
      if (!password) {
        return res.status(400).json({
          success: false,
          message: 'Password is required to delete account'
        });
      }

      // Verify password by trying to sign in with Supabase
      const { createClient } = require('@supabase/supabase-js');
      const supabase = createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY);
      
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: password
      });

      if (signInError) {
        return res.status(401).json({
          success: false,
          message: 'Invalid password'
        });
      }
    } else {
      // ✨ OAuth users don't need password verification
      console.log('[SELF-DELETE] OAuth user detected, skipping password verification');
    }

    // Step 1: Delete from Supabase
    if (user.supabase_uid) {
      const { error } = await supabaseAdmin.auth.admin.deleteUser(user.supabase_uid);
      
      if (error) {
        console.error('[SELF-DELETE] Supabase deletion error:', error);
      } else {
        console.log('[SELF-DELETE] ✅ User deleted from Supabase:', user.email);
      }
    }

    // Step 2: Delete from MongoDB
    await User.findByIdAndDelete(user._id);

    console.log('[SELF-DELETE] ✅ User deleted from MongoDB:', user.email);

    res.json({
      success: true,
      message: 'Your account has been permanently deleted'
    });
  } catch (error) {
    console.error('[SELF-DELETE] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete account',
      error: error.message
    });
  }
});

// @desc    Get all users with pagination
// @route   GET /api/users?page=1&limit=50&role=admin&status=active&search=john
// @access  Public
exports.getAllUsersWithPagination = asyncHandler(async (req, res) => {
  const { page = 1, limit = 50, role, status, search } = req.query;

  // Build filter object
  const filter = { isBanned: false };
  
  if (role && role !== 'all') {
    filter.role = role;
  }
  
  if (status === 'active') {
    filter.isActive = true;
  } else if (status === 'inactive') {
    filter.isActive = false;
  }
  
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
      { username: { $regex: search, $options: 'i' } },
      { phone: { $regex: search, $options: 'i' } }
    ];
  }

  try {
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 50;
    const skip = (pageNum - 1) * limitNum;

    // Get total count for pagination
    const total = await User.countDocuments(filter);

    // Get paginated data
    const users = await User.find(filter)
      .select('-password')
      .populate('role', 'name permissions')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    const pages = Math.ceil(total / limitNum);

    res.json({
      success: true,
      users,
      total,
      pages,
      currentPage: pageNum,
      limit: limitNum
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @desc    Bulk update user roles
// @route   POST /api/users/bulk/role-update
// @access  Private/Admin
exports.bulkUpdateRoles = asyncHandler(async (req, res) => {
  const { userIds, role: roleId } = req.body;

  if (req.user.role?.name !== 'admin') {
    return res.status(403).json({ 
      success: false, 
      message: 'Not authorized' 
    });
  }

  if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
    return res.status(400).json({ 
      success: false, 
      message: 'Invalid user IDs' 
    });
  }

  if (!roleId) {
    return res.status(400).json({ 
      success: false, 
      message: 'roleId required' 
    });
  }

  try {
    // Verify role exists
    const roleExists = await Role.findById(roleId);
    if (!roleExists) {
      return res.status(404).json({
        success: false,
        message: 'Role not found'
      });
    }

    const result = await User.updateMany(
      { _id: { $in: userIds }, isBanned: false },
      { role: roleId },
      { runValidators: true }
    );

    res.json({
      success: true,
      message: `Updated ${result.modifiedCount} users`,
      updatedCount: result.modifiedCount
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @desc    Send bulk notification
// @route   POST /api/users/notifications/send
// @access  Private/Admin
exports.sendBulkNotification = asyncHandler(async (req, res) => {
  const { role, message } = req.body;

  if (req.user.role?.name !== 'admin') {
    return res.status(403).json({ 
      success: false, 
      message: 'Not authorized' 
    });
  }

  if (!message || !message.trim()) {
    return res.status(400).json({ 
      success: false, 
      message: 'Message required' 
    });
  }

  try {
    let filter = { isBanned: false };
    
    if (role && role !== 'all') {
      const roleObj = await Role.findOne({ name: role.toLowerCase() });
      
      if (!roleObj) {
        return res.status(404).json({
          success: false,
          message: 'Role not found'
        });
      }
      
      filter.role = roleObj._id;
    }
    
    const users = await User.find(filter).select('_id email');

    res.json({
      success: true,
      message: `Notification sent to ${users.length} users`,
      sentCount: users.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @desc    Get user statistics
// @route   GET /api/users/stats
// @access  Public
exports.getUserStats = asyncHandler(async (req, res) => {
  try {
    const total = await User.countDocuments({ isBanned: false });
    const active = await User.countDocuments({ isActive: true, isBanned: false });
    const inactive = await User.countDocuments({ isActive: false, isBanned: false });
    const banned = await User.countDocuments({ isBanned: true });

    // Get all roles
    const roles = await Role.find({}, 'name');

    // Count users by role
    const byRole = {};
    for (const role of roles) {
      byRole[role.name] = await User.countDocuments({ 
        role: role._id,
        isBanned: false 
      });
    }

    res.json({
      success: true,
      stats: {
        total,
        active,
        inactive,
        banned,
        byRole
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});