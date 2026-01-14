const express = require('express');
const {
  getBlogs,
  getBlogsByCategory,
  getBlog,
  createBlog,
  updateBlog,
  deleteBlog,
  approveBlog,
  getPendingBlogs
} = require('../controllers/blogController');
//const { protect } = require('../middleware/auth');
const { protect } = require('../middleware/supabaseAuth');
const authorize = require('../middleware/roleAuth');

const router = express.Router();

// Public routes
router.get('/', getBlogs);
router.get('/category/:category', getBlogsByCategory);
router.get('/:id', getBlog);

// Protected routes
router.post(
  '/',
  protect,
  authorize('member', 'volunteer', 'usher', 'worship_team', 'pastor', 'bishop', 'admin'),
  createBlog
);

router.put('/:id', protect, updateBlog);
router.delete('/:id', protect, deleteBlog);

// Admin routes
router.get('/pending', protect, authorize('admin'), getPendingBlogs);
router.put('/:id/approve', protect, authorize('admin'), approveBlog);

module.exports = router;