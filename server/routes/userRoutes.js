const express = require('express');
const {
  getAllUsers,
  getUserById,
  getMyProfile,
  updateUser,
  updateUserRole,
  searchUsers,
  getUsersByRole,
  deleteUser
} = require('../controllers/userController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// Public routes
router.get('/', getAllUsers);
router.get('/search', searchUsers);
router.get('/role/:role', getUsersByRole);
router.get('/:id', getUserById);

// Protected routes
router.get('/me/profile', protect, getMyProfile);
router.put('/:id', protect, updateUser);

// Admin routes
router.put('/:id/role', protect, authorize('admin'), updateUserRole);
router.delete('/:id', protect, authorize('admin'), deleteUser);

module.exports = router;