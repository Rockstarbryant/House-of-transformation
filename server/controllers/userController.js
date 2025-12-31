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