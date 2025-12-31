const express = require('express');
const {
  getPosts,
  getPost,
  createPost,
  updatePost,
  deletePost
} = require('../controllers/blogController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.route('/')
  .get(getPosts)
  .post(protect, authorize('admin'), createPost);

router.route('/:id')
  .get(getPost)
  .put(protect, authorize('admin'), updatePost)
  .delete(protect, authorize('admin'), deletePost);

module.exports = router;