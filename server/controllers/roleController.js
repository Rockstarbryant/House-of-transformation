const Role = require('../models/Role');
const User = require('../models/User');
const asyncHandler = require('../middleware/asyncHandler');

// ============================================
// PART A: ROLE CRUD OPERATIONS
// ============================================

// @desc    Get all roles
// @route   GET /api/roles
// @access  Public (admin can see all with details)
exports.getAllRoles = asyncHandler(async (req, res) => {
  try {
    console.log('[ROLE-GET-ALL] Fetching all roles');

    const roles = await Role.find().sort({ name: 1 });

    res.json({
      success: true,
      count: roles.length,
      roles
    });

  } catch (error) {
    console.error('[ROLE-GET-ALL] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch roles',
      error: error.message
    });
  }
});

// @desc    Get single role by ID
// @route   GET /api/roles/:id
// @access  Public
exports.getRoleById = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;

    console.log('[ROLE-GET] Fetching role:', id);

    const role = await Role.findById(id);

    if (!role) {
      return res.status(404).json({
        success: false,
        message: 'Role not found'
      });
    }

    res.json({
      success: true,
      role
    });

  } catch (error) {
    console.error('[ROLE-GET] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch role',
      error: error.message
    });
  }
});

// @desc    Create new role
// @route   POST /api/roles
// @access  Private/Admin
exports.createRole = asyncHandler(async (req, res) => {
  try {
    const { name, description, permissions } = req.body;

    console.log('[ROLE-CREATE] Creating role:', name);

    // Validate input
    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Role name is required'
      });
    }

    // Check if role already exists
    const existingRole = await Role.findOne({ name: name.toLowerCase() });
    if (existingRole) {
      return res.status(400).json({
        success: false,
        message: 'Role already exists'
      });
    }

    // Validate permissions array - MATCH Role model enum exactly
    const validPermissions = [
      // ===== BROAD PERMISSIONS =====
      'manage:events',
      'manage:sermons',
      'manage:gallery',
      'manage:donations',
      'manage:users',
      'manage:roles',
      'manage:blog',
      'manage:livestream',
      'manage:feedback',
      'manage:volunteers',
      'manage:settings',
      
      // ===== GRANULAR FEEDBACK PERMISSIONS (READ) =====
      'read:feedback:sermon',
      'read:feedback:service',
      'read:feedback:testimony',
      'read:feedback:suggestion',
      'read:feedback:prayer',
      'read:feedback:general',
      
      // ===== GRANULAR FEEDBACK PERMISSIONS (RESPOND) =====
      'respond:feedback:sermon',
      'respond:feedback:service',
      'respond:feedback:testimony',
      'respond:feedback:suggestion',
      'respond:feedback:prayer',
      'respond:feedback:general',
      
      // ===== GRANULAR FEEDBACK PERMISSIONS (PUBLISH) =====
      'publish:feedback:testimony',
      
      // ===== GRANULAR FEEDBACK PERMISSIONS (ARCHIVE) =====
      'archive:feedback:sermon',
      'archive:feedback:service',
      'archive:feedback:testimony',
      'archive:feedback:suggestion',
      'archive:feedback:prayer',
      'archive:feedback:general',
      
      // ===== FEEDBACK STATS =====
      'view:feedback:stats',
      
      // ===== OTHER =====
      'view:analytics',
      'view:audit_logs'
    ];

    if (permissions && Array.isArray(permissions)) {
      const invalidPerms = permissions.filter(p => !validPermissions.includes(p));
      if (invalidPerms.length > 0) {
        return res.status(400).json({
          success: false,
          message: `Invalid permissions: ${invalidPerms.join(', ')}`,
          validPermissions
        });
      }
    }

    // Create role
    const role = await Role.create({
      name: name.toLowerCase(),
      description: description || null,
      permissions: permissions || [],
      isSystemRole: false
    });

    console.log('[ROLE-CREATE] Role created:', role._id);

    res.status(201).json({
      success: true,
      message: 'Role created successfully',
      role
    });

  } catch (error) {
    console.error('[ROLE-CREATE] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create role',
      error: error.message
    });
  }
});

// @desc    Update role (add/remove permissions)
// @route   PATCH /api/roles/:id
// @access  Private/Admin
exports.updateRole = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    const { description, permissions } = req.body;

    console.log('[ROLE-UPDATE] Updating role:', id);

    const role = await Role.findById(id);

    if (!role) {
      return res.status(404).json({
        success: false,
        message: 'Role not found'
      });
    }

    // Prevent modification of system roles (except permissions)
    if (role.isSystemRole && description !== undefined && description !== role.description) {
      return res.status(403).json({
        success: false,
        message: 'Cannot modify system role description'
      });
    }

    // Validate permissions if provided - MATCH Role model enum exactly
    const validPermissions = [
      // ===== BROAD PERMISSIONS =====
      'manage:events',
      'manage:sermons',
      'manage:gallery',
      'manage:donations',
      'manage:users',
      'manage:roles',
      'manage:blog',
      'manage:livestream',
      'manage:feedback',
      'manage:volunteers',
      'manage:settings',
      
      // ===== GRANULAR FEEDBACK PERMISSIONS (READ) =====
      'read:feedback:sermon',
      'read:feedback:service',
      'read:feedback:testimony',
      'read:feedback:suggestion',
      'read:feedback:prayer',
      'read:feedback:general',
      
      // ===== GRANULAR FEEDBACK PERMISSIONS (RESPOND) =====
      'respond:feedback:sermon',
      'respond:feedback:service',
      'respond:feedback:testimony',
      'respond:feedback:suggestion',
      'respond:feedback:prayer',
      'respond:feedback:general',
      
      // ===== GRANULAR FEEDBACK PERMISSIONS (PUBLISH) =====
      'publish:feedback:testimony',
      
      // ===== GRANULAR FEEDBACK PERMISSIONS (ARCHIVE) =====
      'archive:feedback:sermon',
      'archive:feedback:service',
      'archive:feedback:testimony',
      'archive:feedback:suggestion',
      'archive:feedback:prayer',
      'archive:feedback:general',
      
      // ===== FEEDBACK STATS =====
      'view:feedback:stats',
      
      // ===== OTHER =====
      'view:analytics',
      'view:audit_logs'
    ];

    if (permissions && Array.isArray(permissions)) {
      const invalidPerms = permissions.filter(p => !validPermissions.includes(p));
      if (invalidPerms.length > 0) {
        return res.status(400).json({
          success: false,
          message: `Invalid permissions: ${invalidPerms.join(', ')}`,
          validPermissions
        });
      }
      role.permissions = permissions;
    }

    // Update description if provided
    if (description !== undefined) {
      role.description = description;
    }

    await role.save();

    console.log('[ROLE-UPDATE] Role updated:', role._id);

    res.json({
      success: true,
      message: 'Role updated successfully',
      role
    });

  } catch (error) {
    console.error('[ROLE-UPDATE] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update role',
      error: error.message
    });
  }
});

// @desc    Delete role (except system roles)
// @route   DELETE /api/roles/:id
// @access  Private/Admin
exports.deleteRole = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;

    console.log('[ROLE-DELETE] Deleting role:', id);

    const role = await Role.findById(id);

    if (!role) {
      return res.status(404).json({
        success: false,
        message: 'Role not found'
      });
    }

    // Prevent deletion of system roles
    if (role.isSystemRole) {
      return res.status(403).json({
        success: false,
        message: 'Cannot delete system roles',
        roleId: role._id,
        roleName: role.name
      });
    }

    // Check if any users have this role
    const usersWithRole = await User.countDocuments({ role: role._id });
    if (usersWithRole > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete role. ${usersWithRole} user(s) currently have this role`,
        affectedUsers: usersWithRole
      });
    }

    await Role.findByIdAndDelete(id);

    console.log('[ROLE-DELETE] Role deleted:', id);

    res.json({
      success: true,
      message: 'Role deleted successfully',
      deletedRoleId: id
    });

  } catch (error) {
    console.error('[ROLE-DELETE] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete role',
      error: error.message
    });
  }
});


// ============================================
// PART B: USER ROLE ASSIGNMENT
// ============================================

// @desc    Assign role to user
// @route   PATCH /api/roles/assign-user
// @access  Private/Admin
exports.assignRoleToUser = asyncHandler(async (req, res) => {
  try {
    const { userId, roleId } = req.body;

    console.log('[ROLE-ASSIGN] Assigning role to user:', userId, 'Role:', roleId);

    // Validate input
    if (!userId || !roleId) {
      return res.status(400).json({
        success: false,
        message: 'userId and roleId are required'
      });
    }

    // Check if role exists
    const role = await Role.findById(roleId);
    if (!role) {
      return res.status(404).json({
        success: false,
        message: 'Role not found'
      });
    }

    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Assign role to user
    user.role = roleId;
    await user.save();

    // Fetch updated user with populated role
    const updatedUser = await User.findById(userId).populate('role');

    console.log('[ROLE-ASSIGN] Role assigned successfully. User:', updatedUser.email, 'Role:', role.name);

    res.json({
      success: true,
      message: `Role "${role.name}" assigned to user "${user.name}"`,
      user: {
        id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: {
          id: updatedUser.role._id,
          name: updatedUser.role.name,
          permissions: updatedUser.role.permissions
        }
      }
    });

  } catch (error) {
    console.error('[ROLE-ASSIGN] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to assign role',
      error: error.message
    });
  }
});

// @desc    Get user with role + permissions
// @route   GET /api/roles/user/:userId
// @access  Private
exports.getUserWithRole = asyncHandler(async (req, res) => {
  try {
    const { userId } = req.params;

    console.log('[ROLE-USER-GET] Fetching user with role:', userId);

    const user = await User.findById(userId).populate('role');

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
        name: user.name,
        email: user.email,
        supabase_uid: user.supabase_uid,
        role: user.role ? {
          id: user.role._id,
          name: user.role.name,
          description: user.role.description,
          permissions: user.role.permissions,
          isSystemRole: user.role.isSystemRole
        } : null
      }
    });

  } catch (error) {
    console.error('[ROLE-USER-GET] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user',
      error: error.message
    });
  }
});

// @desc    Get all users by role
// @route   GET /api/roles/:roleId/users
// @access  Public
exports.getUsersByRoleId = asyncHandler(async (req, res) => {
  try {
    const { roleId } = req.params;
    const { page = 1, limit = 50 } = req.query;

    console.log('[ROLE-USERS-GET] Fetching users for role:', roleId);

    // Check if role exists
    const role = await Role.findById(roleId);
    if (!role) {
      return res.status(404).json({
        success: false,
        message: 'Role not found'
      });
    }

    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 50;
    const skip = (pageNum - 1) * limitNum;

    // Get total count
    const total = await User.countDocuments({ role: roleId });

    // Get paginated users
    const users = await User.find({ role: roleId })
      .select('_id name email supabase_uid createdAt')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    const pages = Math.ceil(total / limitNum);

    res.json({
      success: true,
      role: {
        id: role._id,
        name: role.name
      },
      users,
      pagination: {
        total,
        pages,
        currentPage: pageNum,
        limit: limitNum
      }
    });

  } catch (error) {
    console.error('[ROLE-USERS-GET] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch users',
      error: error.message
    });
  }
});

// @desc    Bulk assign role to multiple users
// @route   POST /api/roles/bulk-assign
// @access  Private/Admin
exports.bulkAssignRole = asyncHandler(async (req, res) => {
  try {
    const { userIds, roleId } = req.body;

    console.log('[ROLE-BULK-ASSIGN] Bulk assigning role to users');

    // Validate input
    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'userIds array is required and must not be empty'
      });
    }

    if (!roleId) {
      return res.status(400).json({
        success: false,
        message: 'roleId is required'
      });
    }

    // Check if role exists
    const role = await Role.findById(roleId);
    if (!role) {
      return res.status(404).json({
        success: false,
        message: 'Role not found'
      });
    }

    // Perform bulk update
    const result = await User.updateMany(
      { _id: { $in: userIds } },
      { role: roleId },
      { runValidators: false }
    );

    console.log('[ROLE-BULK-ASSIGN] Updated', result.modifiedCount, 'users');

    res.json({
      success: true,
      message: `Role "${role.name}" assigned to ${result.modifiedCount} user(s)`,
      updatedCount: result.modifiedCount,
      totalRequested: userIds.length,
      role: {
        id: role._id,
        name: role.name
      }
    });

  } catch (error) {
    console.error('[ROLE-BULK-ASSIGN] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to bulk assign role',
      error: error.message
    });
  }
});

// @desc    Get all permissions list (for frontend dropdown/checkboxes)
// @route   GET /api/roles/permissions/list
// @access  Public

exports.getAvailablePermissions = asyncHandler(async (req, res) => {
  try {
    const permissionsList = [
      // ===== EVENTS =====
      { key: 'manage:events', label: 'Manage Events', category: 'Events' },
      
      // ===== SERMONS =====
      { key: 'manage:sermons', label: 'Manage Sermons', category: 'Content' },
      
      // ===== GALLERY =====
      { key: 'manage:gallery', label: 'Manage Gallery', category: 'Content' },
      
      // ===== BLOG =====
      { key: 'manage:blog', label: 'Manage Blog', category: 'Content' },
      
      // ===== LIVESTREAM =====
      { key: 'manage:livestream', label: 'Manage Livestream', category: 'Content' },
      
      // ===== DONATIONS (BROAD) =====
      { key: 'manage:donations', label: 'Manage All Donations', category: 'Finance' },
      
      // ===== DONATIONS (GRANULAR - CAMPAIGNS) =====
      { key: 'view:campaigns', label: 'View Campaigns', category: 'Finance' },
      { key: 'create:campaigns', label: 'Create Campaigns', category: 'Finance' },
      { key: 'edit:campaigns', label: 'Edit Campaigns', category: 'Finance' },
      { key: 'delete:campaigns', label: 'Delete Campaigns', category: 'Finance' },
      { key: 'activate:campaigns', label: 'Activate Campaigns', category: 'Finance' },
      { key: 'feature:campaigns', label: 'Feature Campaigns on Homepage', category: 'Finance' },
      
      // ===== DONATIONS (GRANULAR - PLEDGES) =====
      { key: 'view:pledges', label: 'View Own Pledges', category: 'Finance' },
      { key: 'view:pledges:all', label: 'View All Pledges (Admin)', category: 'Finance' },
      { key: 'approve:pledges', label: 'Approve Pledges', category: 'Finance' },
      { key: 'edit:pledges', label: 'Edit Pledges', category: 'Finance' },
      
      // ===== DONATIONS (GRANULAR - PAYMENTS) =====
      { key: 'view:payments', label: 'View Own Payments', category: 'Finance' },
      { key: 'view:payments:all', label: 'View All Payments (Admin)', category: 'Finance' },
      { key: 'process:payments', label: 'Process/Record Payments', category: 'Finance' },
      { key: 'verify:payments', label: 'Verify Payments', category: 'Finance' },
      
      // ===== DONATIONS (REPORTS) =====
      { key: 'view:donation:reports', label: 'View Donation Reports', category: 'Finance' },
      
      // ===== VOLUNTEERS =====
      { key: 'manage:volunteers', label: 'Manage Volunteers', category: 'Volunteers' },
      
      // ===== USERS =====
      { key: 'manage:users', label: 'Manage Users', category: 'Administration' },
      
      // ===== ROLES =====
      { key: 'manage:roles', label: 'Manage Roles', category: 'Administration' },
      
      // ===== SETTINGS =====
      { key: 'manage:settings', label: 'Manage Settings', category: 'Administration' },
      
      // ===== FEEDBACK (BROAD) =====
      { key: 'manage:feedback', label: 'Manage All Feedback', category: 'Feedback' },
      
      // ===== FEEDBACK (GRANULAR - READ) =====
      { key: 'read:feedback:sermon', label: 'Read Sermon Feedback', category: 'Feedback' },
      { key: 'read:feedback:service', label: 'Read Service Feedback', category: 'Feedback' },
      { key: 'read:feedback:testimony', label: 'Read Testimony Feedback', category: 'Feedback' },
      { key: 'read:feedback:suggestion', label: 'Read Suggestion Feedback', category: 'Feedback' },
      { key: 'read:feedback:prayer', label: 'Read Prayer Feedback', category: 'Feedback' },
      { key: 'read:feedback:general', label: 'Read General Feedback', category: 'Feedback' },
      
      // ===== FEEDBACK (GRANULAR - RESPOND) =====
      { key: 'respond:feedback:sermon', label: 'Respond to Sermon Feedback', category: 'Feedback' },
      { key: 'respond:feedback:service', label: 'Respond to Service Feedback', category: 'Feedback' },
      { key: 'respond:feedback:testimony', label: 'Respond to Testimony Feedback', category: 'Feedback' },
      { key: 'respond:feedback:suggestion', label: 'Respond to Suggestion Feedback', category: 'Feedback' },
      { key: 'respond:feedback:prayer', label: 'Respond to Prayer Feedback', category: 'Feedback' },
      { key: 'respond:feedback:general', label: 'Respond to General Feedback', category: 'Feedback' },
      
      // ===== FEEDBACK (GRANULAR - PUBLISH) =====
      { key: 'publish:feedback:testimony', label: 'Publish Testimonies', category: 'Feedback' },
      
      // ===== FEEDBACK (GRANULAR - ARCHIVE) =====
      { key: 'archive:feedback:sermon', label: 'Archive Sermon Feedback', category: 'Feedback' },
      { key: 'archive:feedback:service', label: 'Archive Service Feedback', category: 'Feedback' },
      { key: 'archive:feedback:testimony', label: 'Archive Testimony Feedback', category: 'Feedback' },
      { key: 'archive:feedback:suggestion', label: 'Archive Suggestion Feedback', category: 'Feedback' },
      { key: 'archive:feedback:prayer', label: 'Archive Prayer Feedback', category: 'Feedback' },
      { key: 'archive:feedback:general', label: 'Archive General Feedback', category: 'Feedback' },
      
      // ===== FEEDBACK (STATS) =====
      { key: 'view:feedback:stats', label: 'View Feedback Stats', category: 'Feedback' },
      
      // ===== ANALYTICS =====
      { key: 'view:analytics', label: 'View Analytics', category: 'Reporting' },
      { key: 'view:audit_logs', label: 'View Audit Logs', category: 'Security' }
    ];

    res.json({
      success: true,
      permissions: permissionsList,
      total: permissionsList.length
    });

  } catch (error) {
    console.error('[PERMISSIONS-LIST] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch permissions',
      error: error.message
    });
  }
});