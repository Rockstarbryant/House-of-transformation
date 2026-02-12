const Role = require('../models/Role');
const User = require('../models/User');

// ===== SECURITY HELPER FUNCTIONS =====

/**
 * Check if user has manage:roles permission
 * Defense in depth - verify even if middleware already checked
 */
const hasManageRolesPermission = (user) => {
  if (!user || !user.role) return false;
  
  // Admin bypass
  if (user.role.name === 'admin') return true;
  
  // Check permission
  return user.role.permissions && 
         user.role.permissions.includes('manage:roles');
};

/**
 * Check if user is admin
 */
const isAdmin = (user) => {
  return user?.role?.name === 'admin';
};

// ============================================
// GET ALL AVAILABLE PERMISSIONS (for UI)
// ============================================
exports.getAvailablePermissions = async (req, res) => {
  try {
    // ✅ CRITICAL: Only authenticated users with manage:roles should see permission list
    if (!req.user || !hasManageRolesPermission(req.user)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: Insufficient permissions',
        requiredPermissions: ['manage:roles'],
        userPermissions: req.user?.role?.permissions || [],
        userRole: req.user?.role?.name || 'none'
      });
    }

    // Get enum values directly from schema (correct path for array type)
    const permissionsPath = Role.schema.path('permissions');
    const permissionsEnum = permissionsPath.caster 
      ? permissionsPath.caster.enumValues 
      : permissionsPath.enumValues;

    // Group permissions by category
    const grouped = {
      broad: [],
      events: [],
      sermons: [],
      gallery: [],
      donations: [],
      feedback: [],
      users: [],
      roles: [],
      blog: [],
      livestream: [],
      volunteers: [],
      settings: [],
      analytics: []
    };

    permissionsEnum.forEach(perm => {
      if (perm.startsWith('manage:')) {
        grouped.broad.push(perm);
      } else if (perm.includes('campaign') || perm.includes('pledge') || perm.includes('payment') || perm.includes('donation')) {
        grouped.donations.push(perm);
      } else if (perm.includes('feedback')) {
        grouped.feedback.push(perm);
      } else if (perm.includes('event')) {
        grouped.events.push(perm);
      } else if (perm.includes('sermon')) {
        grouped.sermons.push(perm);
      } else if (perm.includes('gallery')) {
        grouped.gallery.push(perm);
      } else if (perm.includes('user')) {
        grouped.users.push(perm);
      } else if (perm.includes('role')) {
        grouped.roles.push(perm);
      } else if (perm.includes('blog')) {
        grouped.blog.push(perm);
      } else if (perm.includes('livestream')) {
        grouped.livestream.push(perm);
      } else if (perm.includes('volunteer')) {
        grouped.volunteers.push(perm);
      } else if (perm.includes('setting')) {
        grouped.settings.push(perm);
      } else if (perm.includes('analytics') || perm.includes('audit')) {
        grouped.analytics.push(perm);
      }
    });

    res.json({
      success: true,
      permissions: {
        all: permissionsEnum,
        grouped
      }
    });

  } catch (error) {
    console.error('[ROLE-PERMISSIONS] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch permissions'
    });
  }
};

// ============================================
// GET ALL ROLES
// ============================================
exports.getAllRoles = async (req, res) => {
  try {
    // ✅ CRITICAL: Only users with manage:roles permission can see all roles
    if (!req.user || !hasManageRolesPermission(req.user)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: Insufficient permissions',
        requiredPermissions: ['manage:roles'],
        userPermissions: req.user?.role?.permissions || [],
        userRole: req.user?.role?.name || 'none'
      });
    }

    console.log('[ROLE-GET-ALL] Fetching all roles');

    const roles = await Role.find().sort({ createdAt: -1 });

    res.json({
      success: true,
      count: roles.length,
      roles
    });

  } catch (error) {
    console.error('[ROLE-GET-ALL] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch roles'
    });
  }
};

// ============================================
// GET ROLE BY ID
// ============================================
exports.getRoleById = async (req, res) => {
  try {
    // ✅ CRITICAL: Only users with manage:roles permission can see role details
    if (!req.user || !hasManageRolesPermission(req.user)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: Insufficient permissions',
        requiredPermissions: ['manage:roles'],
        userPermissions: req.user?.role?.permissions || [],
        userRole: req.user?.role?.name || 'none'
      });
    }

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
      message: 'Failed to fetch role'
    });
  }
};

// ============================================
// CREATE ROLE
// ============================================
exports.createRole = async (req, res) => {
  try {
    // ✅ CRITICAL: Only admins can create roles
    if (!isAdmin(req.user)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: Admin role required',
        userRole: req.user?.role?.name || 'none'
      });
    }

    const { name, description, permissions } = req.body;

    console.log('[ROLE-CREATE] Creating role:', name);
    console.log('[ROLE-CREATE] Permissions received:', permissions);

    // Validate required fields
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

    // Get valid permissions from schema enum (correct path for array type)
    const permissionsPath = Role.schema.path('permissions');
    const validPermissions = permissionsPath.caster 
      ? permissionsPath.caster.enumValues 
      : permissionsPath.enumValues;
    
    console.log('[ROLE-CREATE] Valid permissions count:', validPermissions ? validPermissions.length : 0);

    // Validate permissions
    if (permissions && Array.isArray(permissions)) {
      const invalidPerms = permissions.filter(p => !validPermissions.includes(p));
      
      if (invalidPerms.length > 0) {
        console.error('[ROLE-CREATE] Invalid permissions detected:', invalidPerms);
        return res.status(400).json({
          success: false,
          message: `Invalid permissions: ${invalidPerms.join(', ')}`,
          validPermissions: validPermissions
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

    console.log('[ROLE-CREATE] Role created successfully:', role._id);

    res.status(201).json({
      success: true,
      message: 'Role created successfully',
      role
    });

  } catch (error) {
    console.error('[ROLE-CREATE] Error:', error);
    
    // Handle MongoDB validation errors
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: messages.join(', ')
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to create role',
      error: error.message
    });
  }
};

// ============================================
// UPDATE ROLE (Add/Remove Permissions)
// ============================================
exports.updateRole = async (req, res) => {
  try {
    // ✅ CRITICAL: Only admins can update roles
    if (!isAdmin(req.user)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: Admin role required',
        userRole: req.user?.role?.name || 'none'
      });
    }

    const { id } = req.params;
    const { description, permissions } = req.body;

    console.log('[ROLE-UPDATE] Updating role:', id);
    console.log('[ROLE-UPDATE] New permissions:', permissions);

    const role = await Role.findById(id);

    if (!role) {
      return res.status(404).json({
        success: false,
        message: 'Role not found'
      });
    }

    // Get valid permissions from schema enum (correct path for array type)
    const permissionsPath = Role.schema.path('permissions');
    const validPermissions = permissionsPath.caster 
      ? permissionsPath.caster.enumValues 
      : permissionsPath.enumValues;
    
    console.log('[ROLE-UPDATE] Valid permissions count:', validPermissions ? validPermissions.length : 0);

    // Validate permissions if provided
    if (permissions && Array.isArray(permissions)) {
      const invalidPerms = permissions.filter(p => !validPermissions.includes(p));
      
      if (invalidPerms.length > 0) {
        console.error('[ROLE-UPDATE] Invalid permissions detected:', invalidPerms);
        console.error('[ROLE-UPDATE] First 10 valid permissions:', validPermissions.slice(0, 10));
        
        return res.status(400).json({
          success: false,
          message: `Invalid permissions: ${invalidPerms.join(', ')}`,
          hint: 'Check if permissions are correctly spelled and exist in the Role model',
          receivedCount: permissions.length,
          invalidCount: invalidPerms.length,
          sampleValid: validPermissions.slice(0, 20)
        });
      }

      role.permissions = permissions;
    }

    // Update description if provided
    if (description !== undefined) {
      role.description = description;
    }

    await role.save();

    console.log('[ROLE-UPDATE] Role updated successfully:', role._id);

    res.json({
      success: true,
      message: 'Role updated successfully',
      role
    });

  } catch (error) {
    console.error('[ROLE-UPDATE] Error:', error);
    
    // Handle MongoDB validation errors
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: messages.join(', ')
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to update role',
      error: error.message
    });
  }
};

// ============================================
// DELETE ROLE
// ============================================
exports.deleteRole = async (req, res) => {
  try {
    // ✅ CRITICAL: Only admins can delete roles
    if (!isAdmin(req.user)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: Admin role required',
        userRole: req.user?.role?.name || 'none'
      });
    }

    const { id } = req.params;

    console.log('[ROLE-DELETE] Deleting role:', id);

    const role = await Role.findById(id);

    if (!role) {
      return res.status(404).json({
        success: false,
        message: 'Role not found'
      });
    }

    // Cannot delete system roles
    if (role.isSystemRole) {
      return res.status(403).json({
        success: false,
        message: 'Cannot delete system roles'
      });
    }

    // Check if any users have this role
    const usersWithRole = await User.countDocuments({ role: id });
    if (usersWithRole > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete role: ${usersWithRole} user(s) still assigned to this role`
      });
    }

    await Role.findByIdAndDelete(id);

    console.log('[ROLE-DELETE] Role deleted:', id);

    res.json({
      success: true,
      message: 'Role deleted successfully'
    });

  } catch (error) {
    console.error('[ROLE-DELETE] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete role'
    });
  }
};

// ============================================
// ASSIGN ROLE TO USER
// ============================================
exports.assignRoleToUser = async (req, res) => {
  try {
    // ✅ CRITICAL: Only admins can assign roles
    if (!isAdmin(req.user)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: Admin role required',
        userRole: req.user?.role?.name || 'none'
      });
    }

    const { userId, roleId } = req.body;

    console.log('[ROLE-ASSIGN] Assigning role', roleId, 'to user', userId);

    if (!userId || !roleId) {
      return res.status(400).json({
        success: false,
        message: 'User ID and Role ID are required'
      });
    }

    const role = await Role.findById(roleId);
    if (!role) {
      return res.status(404).json({
        success: false,
        message: 'Role not found'
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    user.role = roleId;
    await user.save();

    const updatedUser = await User.findById(userId).populate('role');

    console.log('[ROLE-ASSIGN] Role assigned successfully');

    res.json({
      success: true,
      message: 'Role assigned successfully',
      user: updatedUser
    });

  } catch (error) {
    console.error('[ROLE-ASSIGN] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to assign role'
    });
  }
};

// ============================================
// GET USER WITH ROLE
// ============================================
exports.getUserWithRole = async (req, res) => {
  try {
    // ✅ CRITICAL: Only users with manage:roles or manage:users can see user role details
    const hasPermission = req.user && (
      hasManageRolesPermission(req.user) || 
      (req.user.role?.permissions && req.user.role.permissions.includes('manage:users'))
    );

    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: Insufficient permissions',
        requiredPermissions: ['manage:roles', 'manage:users'],
        userPermissions: req.user?.role?.permissions || [],
        userRole: req.user?.role?.name || 'none'
      });
    }

    const { userId } = req.params;

    const user = await User.findById(userId).populate('role');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      user
    });

  } catch (error) {
    console.error('[ROLE-GET-USER] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user'
    });
  }
};

// ============================================
// GET USERS BY ROLE
// ============================================
exports.getUsersByRoleId = async (req, res) => {
  try {
    // ✅ CRITICAL: Only users with manage:roles or manage:users can see users by role
    const hasPermission = req.user && (
      hasManageRolesPermission(req.user) || 
      (req.user.role?.permissions && req.user.role.permissions.includes('manage:users'))
    );

    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: Insufficient permissions',
        requiredPermissions: ['manage:roles', 'manage:users'],
        userPermissions: req.user?.role?.permissions || [],
        userRole: req.user?.role?.name || 'none'
      });
    }

    const { roleId } = req.params;

    const users = await User.find({ role: roleId }).populate('role');

    res.json({
      success: true,
      count: users.length,
      users
    });

  } catch (error) {
    console.error('[ROLE-GET-USERS] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch users'
    });
  }
};

// ============================================
// BULK ASSIGN ROLE
// ============================================
exports.bulkAssignRole = async (req, res) => {
  try {
    // ✅ CRITICAL: Only admins can bulk assign roles
    if (!isAdmin(req.user)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: Admin role required',
        userRole: req.user?.role?.name || 'none'
      });
    }

    const { userIds, roleId } = req.body;

    console.log('[ROLE-BULK-ASSIGN] Assigning role', roleId, 'to', userIds?.length, 'users');

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'User IDs array is required'
      });
    }

    if (!roleId) {
      return res.status(400).json({
        success: false,
        message: 'Role ID is required'
      });
    }

    const role = await Role.findById(roleId);
    if (!role) {
      return res.status(404).json({
        success: false,
        message: 'Role not found'
      });
    }

    const result = await User.updateMany(
      { _id: { $in: userIds } },
      { $set: { role: roleId } }
    );

    console.log('[ROLE-BULK-ASSIGN] Bulk assignment complete:', result.modifiedCount, 'users updated');

    res.json({
      success: true,
      message: `Role assigned to ${result.modifiedCount} user(s)`,
      modifiedCount: result.modifiedCount
    });

  } catch (error) {
    console.error('[ROLE-BULK-ASSIGN] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to bulk assign role'
    });
  }
};