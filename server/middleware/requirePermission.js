const User = require('../models/User');
const Role = require('../models/Role');

/**
 * Middleware to check if user has required permission(s)
 * Must be used AFTER protect middleware (which sets req.user)
 * Admin role bypasses all permission checks
 * 
 * Usage:
 * router.post('/events', protect, requirePermission('manage:events'), eventController.create)
 * router.post('/admin', protect, requirePermission('manage:users', 'manage:roles'), adminController)
 */
exports.requirePermission = (...requiredPermissions) => {
  return async (req, res, next) => {
    try {
      // Ensure user is authenticated (protect middleware should have set this)
      if (!req.user || !req.user._id) {
        return res.status(401).json({
          success: false,
          message: 'User not authenticated'
        });
      }

      console.log(`[PERMISSION] Checking ${requiredPermissions.join(', ')} for user:`, req.user.email);

      // Fetch full user with populated role
      const user = await User.findById(req.user._id).populate('role');

      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'User not found'
        });
      }

      // If user has no role assigned, deny access
      if (!user.role) {
        return res.status(403).json({
          success: false,
          message: 'User has no role assigned',
          requiredPermissions,
          userPermissions: []
        });
      }

      // ADMIN BYPASS - Admins have all permissions
      if (user.role.name === 'admin') {
        console.log('[PERMISSION] Admin bypass granted for user:', req.user.email);
        req.user = user.toObject();
        return next();
      }

      // Get user's permissions from role
      let userPermissions = user.role.permissions || [];

      console.log('[PERMISSION] User permissions:', userPermissions);
      console.log('[PERMISSION] Required permissions:', requiredPermissions);

      // BROAD PERMISSION EXPANSION
      // If user has manage:X, they automatically have all granular X permissions
      const expandedPermissions = [...userPermissions];
      
      if (userPermissions.includes('manage:feedback')) {
        expandedPermissions.push(
          'read:feedback:sermon', 'respond:feedback:sermon',
          'read:feedback:service', 'respond:feedback:service',
          'read:feedback:testimony', 'respond:feedback:testimony', 'publish:feedback:testimony', 'archive:feedback:testimony',
          'read:feedback:suggestion', 'respond:feedback:suggestion', 'archive:feedback:suggestion',
          'read:feedback:prayer', 'respond:feedback:prayer', 'archive:feedback:prayer',
          'read:feedback:general', 'respond:feedback:general', 'archive:feedback:general',
          'view:feedback:stats'
        );
      }

      // Donation permission expansion
if (userPermissions.includes('manage:donations')) {
  expandedPermissions.push(
    // Campaign permissions
    'view:campaigns',
    'create:campaigns',
    'edit:campaigns',
    'delete:campaigns',
    'activate:campaigns',
    'feature:campaigns',
    
    // Pledge permissions
    'view:pledges',
    'view:pledges:all',
    'approve:pledges',
    'edit:pledges',
    
    // Payment permissions
    'view:payments',
    'view:payments:all',
    'process:payments',
    'verify:payments',
    
    // Reports
    'view:donation:reports'
  );
}

      userPermissions = expandedPermissions;
      console.log('[PERMISSION] Expanded permissions:', userPermissions);

      // Check if user has at least one of the required permissions
      const hasPermission = requiredPermissions.some(permission => 
        userPermissions.includes(permission)
      );

      if (!hasPermission) {
        console.log('[PERMISSION] Access denied for user:', req.user.email);
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions',
          requiredPermissions,
          userPermissions,
          userRole: user.role.name
        });
      }

      console.log('[PERMISSION] Access granted for user:', req.user.email);
      
      // Attach full user data with role to request for use in controller
      req.user = user.toObject();
      next();

    } catch (error) {
      console.error('[PERMISSION] Error checking permissions:', error);
      res.status(500).json({
        success: false,
        message: 'Permission check failed',
        error: error.message
      });
    }
  };
};

/**
 * Quick helper middleware to check if user is admin
 * Usage: router.delete('/users/:id', protect, requireAdmin, userController.delete)
 */
exports.requireAdmin = async (req, res, next) => {
  try {
    if (!req.user || !req.user._id) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    const user = await User.findById(req.user._id).populate('role');

    if (!user || !user.role || user.role.name !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }

    req.user = user.toObject();
    next();

  } catch (error) {
    console.error('[ADMIN-CHECK] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Admin check failed'
    });
  }
};