const express = require('express');
const {
  getAllUsers,
  getAllUsersWithPagination,  // NEW
  getUserById,
  getMyProfile,
  updateUser,
  updateUserRole,
  searchUsers,
  getUsersByRole,
  deleteUser,
  bulkUpdateRoles,            // NEW
  sendBulkNotification,        // NEW
  getUserStats                 // NEW
} = require('../controllers/userController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// Public routes
router.get('/stats', getUserStats);                    // NEW - before :id route
router.get('/', getAllUsersWithPagination);           // CHANGED - added pagination
router.get('/search', searchUsers);
router.get('/role/:role', getUsersByRole);
router.get('/:id', getUserById);

// Protected routes
router.get('/me/profile', protect, getMyProfile);
router.put('/:id', protect, updateUser);

// Admin routes
router.post('/bulk/role-update', protect, authorize('admin'), bulkUpdateRoles);        // NEW
router.post('/notifications/send', protect, authorize('admin'), sendBulkNotification); // NEW
router.put('/:id/role', protect, authorize('admin'), updateUserRole);
router.delete('/:id', protect, authorize('admin'), deleteUser);

module.exports = router;
