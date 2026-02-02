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

const router = express.Router();

// ============================================
// PUBLIC ROUTES
// ============================================
router.get('/stats', getUserStats);
router.get('/', getAllUsersWithPagination);
router.get('/search', searchUsers);
router.get('/role/:role', getUsersByRole);
router.post('/check-ban', checkBanStatus); // Check if email/IP is banned
router.get('/:id', getUserById);

// ============================================
// PROTECTED ROUTES (Authenticated Users)
// ============================================
router.use(protect); // All routes below require authentication

// User's own profile
router.get('/me/profile', getMyProfile);
router.put('/:id', updateUser); // Users can update own profile, admin can update any
router.delete('/me/delete-account', deleteSelfAccount); // User self-deletion

// ============================================
// ADMIN ROUTES
// ============================================
router.post('/bulk/role-update', authorize('admin'), bulkUpdateRoles);
router.post('/notifications/send', authorize('admin'), sendBulkNotification);
router.post('/manual-register', authorize('admin'), manualRegisterUser); // NEW: Manual registration
router.put('/:id/role', authorize('admin'), updateUserRole);
router.delete('/:id', authorize('admin'), deleteUser); // Hard delete
router.post('/:id/ban', authorize('admin'), banUser); // NEW: Ban user

module.exports = router;