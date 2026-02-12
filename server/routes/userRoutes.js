const express = require('express');
const {
  getAllUsers,
  getAllUsersWithPagination,
  getUserById,
  getMyProfile,
  updateUser,
  updateUserRole,
  searchUsers,
  getUsersByRole,
  deleteUser,
  banUser,
  checkBanStatus,
  manualRegisterUser,
  deleteSelfAccount,
  bulkUpdateRoles,
  sendBulkNotification,
  getUserStats
} = require('../controllers/userController');
const { protect, authorize } = require('../middleware/supabaseAuth');
const { requirePermission } = require('../middleware/requirePermission');

const router = express.Router();

console.log('[USER-ROUTES] Initializing user routes...');

// ============================================
// PUBLIC ROUTES (NO AUTHENTICATION REQUIRED)
// ============================================

// Check if email/IP is banned (needed for signup/login validation)
router.post('/check-ban', checkBanStatus);

// ============================================
// PROTECTED ROUTES - Apply authentication to all routes below
// ============================================
router.use(protect); // ALL routes below require authentication

// ============================================
// USER'S OWN PROFILE (any authenticated user)
// ============================================

// Get own profile
router.get('/me/profile', getMyProfile);

// Delete own account
router.delete('/me/delete-account', deleteSelfAccount);

// Update profile (controller checks if user owns profile or is admin)
router.put('/:id', updateUser);

// ============================================
// ROUTES REQUIRING manage:users PERMISSION
// ============================================

// Get user statistics
router.get('/stats', requirePermission('manage:users'), getUserStats);

// Search users
router.get('/search', requirePermission('manage:users'), searchUsers);

// Get users by role
router.get('/role/:role', requirePermission('manage:users'), getUsersByRole);

// Get all users with pagination (MAIN USER LIST)
router.get('/', requirePermission('manage:users'), getAllUsersWithPagination);

// Get single user by ID
router.get('/:id', requirePermission('manage:users'), getUserById);

// ============================================
// ADMIN-ONLY ROUTES
// ============================================

// Bulk operations
router.post('/bulk/role-update', authorize('admin'), bulkUpdateRoles);
router.post('/notifications/send', authorize('admin'), sendBulkNotification);

// User management
router.post('/manual-register', authorize('admin'), manualRegisterUser);
router.put('/:id/role', authorize('admin'), updateUserRole);

// Deletion and banning
router.delete('/:id', authorize('admin'), deleteUser);
router.post('/:id/ban', authorize('admin'), banUser);

console.log('[USER-ROUTES] ✅ Routes registered with proper security middleware');

module.exports = router;