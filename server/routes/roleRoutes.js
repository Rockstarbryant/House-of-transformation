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
// PUBLIC ROUTES (read-only)
// ============================================

// Get all available permissions (for UI dropdowns)
router.get('/permissions/list', getAvailablePermissions);

// Get all roles
router.get('/', getAllRoles);

// Get single role by ID
router.get('/:id', getRoleById);

// Get all users with specific role
router.get('/:roleId/users', getUsersByRoleId);

// ============================================
// PROTECTED ROUTES (authenticated users)
// ============================================

// Get user with their role + permissions
router.get('/user/:userId', protect, getUserWithRole);

// ============================================
// ADMIN ROUTES (require admin role)
// ============================================

// Create new role (admin only)
router.post('/', protect, requireAdmin, createRole);

// Update role - add/remove permissions (admin only)
router.patch('/:id', protect, requireAdmin, updateRole);

// Delete role (admin only, cannot delete system roles)
router.delete('/:id', protect, requireAdmin, deleteRole);

// Assign role to single user (admin only)
router.patch('/assign-user', protect, requireAdmin, assignRoleToUser);

// Bulk assign role to multiple users (admin only)
router.post('/bulk-assign', protect, requireAdmin, bulkAssignRole);

console.log('[ROLE-ROUTES] Routes registered: GET /, GET /:id, POST /, PATCH /:id, DELETE /:id, PATCH /assign-user, POST /bulk-assign, GET /:roleId/users, GET /user/:userId');

module.exports = router;