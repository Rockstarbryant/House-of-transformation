const express = require('express');
const {
  getAllRoles,
  getRoleById,
  createRole,
  updateRole,
  deleteRole,
  assignRoleToUser,
  getUserWithRole,
  getUsersByRoleId,
  bulkAssignRole,
  getAvailablePermissions
} = require('../controllers/roleController');

const { protect } = require('../middleware/supabaseAuth');
const { requireAdmin, requirePermission } = require('../middleware/requirePermission');

const router = express.Router();

console.log('[ROLE-ROUTES] Initializing role routes...');

// ============================================
// ALL ROUTES REQUIRE AUTHENTICATION
// ============================================
router.use(protect); // Apply authentication to ALL routes

// ============================================
// ROUTES REQUIRING manage:roles PERMISSION
// (Controllers also verify permissions as defense-in-depth)
// ============================================

// Get all available permissions (for UI dropdowns)
// Controllers verify manage:roles permission
router.get('/permissions/list', getAvailablePermissions);

// Get all roles
// Controllers verify manage:roles permission
router.get('/', getAllRoles);

// Get single role by ID
// Controllers verify manage:roles permission
router.get('/:id', getRoleById);

// Get user with their role + permissions
// Controllers verify manage:roles OR manage:users permission
router.get('/user/:userId', getUserWithRole);

// Get all users with specific role
// Controllers verify manage:roles OR manage:users permission
router.get('/:roleId/users', getUsersByRoleId);

// ============================================
// ADMIN-ONLY ROUTES
// ============================================

// Create new role (admin only)
router.post('/', requireAdmin, createRole);

// Update role - add/remove permissions (admin only)
router.patch('/:id', requireAdmin, updateRole);

// Delete role (admin only, cannot delete system roles)
router.delete('/:id', requireAdmin, deleteRole);

// Assign role to single user (admin only)
router.patch('/assign-user', requireAdmin, assignRoleToUser);

// Bulk assign role to multiple users (admin only)
router.post('/bulk-assign', requireAdmin, bulkAssignRole);

console.log('[ROLE-ROUTES] ✅ Routes registered with proper security middleware');

module.exports = router;