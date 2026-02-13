const express = require('express');
const { protect } = require('../middleware/supabaseAuth');
const { requirePermission, requireAdmin } = require('../middleware/requirePermission');
const {
  getBlogs,
  getBlogsByCategory,
  getBlog,
  getBlogBySlug,
  createBlog,
  updateBlog,
  deleteBlog,
  approveBlog,
  getPendingBlogs
} = require('../controllers/blogController');

const router = express.Router();

// ===== PUBLIC ROUTES =====
//router.get('/', getBlogs);
//router.get('/category/:category', getBlogsByCategory);
//router.get('/:id', getBlog);

router.get('/', getBlogs);
router.get('/category/:category', getBlogsByCategory);
router.get('/slug/:slug', getBlogBySlug); // SEO ADDITION: Must come before /:id
router.get('/:id', getBlog);

// ===== PROTECTED ROUTES (Auth + manage:blog permission) =====
router.post('/', protect, requirePermission('manage:blog'), createBlog);
router.put('/:id', protect, requirePermission('manage:blog'), updateBlog);
router.delete('/:id', protect, requirePermission('manage:blog'), deleteBlog);

// ===== ADMIN ONLY ROUTES =====
router.get('/pending', protect, requireAdmin, getPendingBlogs);
router.put('/:id/approve', protect, requireAdmin, approveBlog);

module.exports = router;