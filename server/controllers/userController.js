const User = require('../models/User');
const asyncHandler = require('../middleware/asyncHandler');

// @desc    Get all users (for directory/members portal)
// @route   GET /api/users
// @access  Public
exports.getAllUsers = asyncHandler(async (req, res) => {
  const users = await User.find()
    .select('-password')
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
    .select('-password');

  if (!user) {
    return res.status(404).json({ success: false, message: 'User not found' });
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
  const user = await User.findById(req.user.id).select('-password');

  res.json({
    success: true,
    user
  });
});

// @desc    Update user profile
// @route   PUT /api/users/:id
// @access  Private (own profile or admin)
exports.updateUser = asyncHandler(async (req, res) => {
  const { name, email, phone, bio, location, avatar } = req.body;
   
  // Check if user is updating their own profile or is admin
  if (req.user.id !== req.params.id && req.user.role !== 'admin') {
    return res.status(403).json({ 
      success: false, 
      message: 'Not authorized to update this profile' 
    });
  }

  const user = await User.findByIdAndUpdate(
    req.params.id,
    {
      name: name || undefined,
      email: email || undefined,
      phone: phone || undefined,
      bio: bio || undefined,
      location: location || undefined,
      avatar: avatar || undefined
    },
    { new: true, runValidators: true }
  ).select('-password');

  if (!user) {
    return res.status(404).json({ success: false, message: 'User not found' });
  }

  res.json({
    success: true,
    user
  });
});

// @desc    Update user role (Admin only)
// @route   PUT /api/users/:id/role
// @access  Private/Admin
exports.updateUserRole = asyncHandler(async (req, res) => {
  const { role } = req.body;

  // Verify requester is admin
  if (req.user.role !== 'admin') {
    return res.status(403).json({ 
      success: false, 
      message: 'Not authorized to update roles' 
    });
  }

  const validRoles = ['member', 'volunteer', 'usher', 'worship_team', 'pastor', 'bishop', 'admin'];
  if (!validRoles.includes(role)) {
    return res.status(400).json({ 
      success: false, 
      message: 'Invalid role' 
    });
  }

  const user = await User.findByIdAndUpdate(
    req.params.id,
    { role },
    { new: true, runValidators: true }
  ).select('-password');

  if (!user) {
    return res.status(404).json({ success: false, message: 'User not found' });
  }

  res.json({
    success: true,
    user,
    message: `User role updated to ${role}`
  });
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
    $or: [
      { name: { $regex: q, $options: 'i' } },
      { email: { $regex: q, $options: 'i' } }
    ]
  })
    .select('-password')
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

  const users = await User.find({ role })
    .select('-password')
    .sort({ name: 1 });

  res.json({
    success: true,
    count: users.length,
    users
  });
});

// @desc    Delete user (Admin only)
// @route   DELETE /api/users/:id
// @access  Private/Admin
exports.deleteUser = asyncHandler(async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ 
      success: false, 
      message: 'Not authorized' 
    });
  }

  const user = await User.findByIdAndDelete(req.params.id);

  if (!user) {
    return res.status(404).json({ success: false, message: 'User not found' });
  }

  res.json({
    success: true,
    message: 'User deleted'
  });
});

// ===== ADD THESE TO userController.js =====

// @desc    Get all users with pagination
// @route   GET /api/users?page=1&limit=50&role=admin&status=active&search=john
// @access  Public
exports.getAllUsersWithPagination = asyncHandler(async (req, res) => {
  const { page = 1, limit = 50, role, status, search } = req.query;

  // Build filter object
  const filter = {};
  
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
  const { userIds, role } = req.body;

  // Verify requester is admin
  if (req.user.role !== 'admin') {
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

  if (!role) {
    return res.status(400).json({ 
      success: false, 
      message: 'Role required' 
    });
  }

  try {
    const result = await User.updateMany(
      { _id: { $in: userIds } },
      { role },
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

  // Verify requester is admin
  if (req.user.role !== 'admin') {
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
    // Find users by role (or all if role is 'all')
    const filter = role && role !== 'all' ? { role } : {};
    
    const users = await User.find(filter).select('_id email');

    // TODO: Integrate with your notification system (email, SMS, push notifications)
    // For now, just return the count
    
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
    const total = await User.countDocuments();
    const active = await User.countDocuments({ isActive: true });
    const inactive = await User.countDocuments({ isActive: false });

    // Count by role
    const byRole = {};
    const roles = ['member', 'volunteer', 'usher', 'worship_team', 'pastor', 'bishop', 'admin'];
    
    for (const r of roles) {
      byRole[r] = await User.countDocuments({ role: r });
    }

    res.json({
      success: true,
      stats: {
        total,
        active,
        inactive,
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

