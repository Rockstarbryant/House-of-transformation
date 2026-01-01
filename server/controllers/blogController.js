const Blog = require('../models/Blog');
const asyncHandler = require('../middleware/asyncHandler');

// Check role permissions for blog category
const canPostInCategory = (userRole, category) => {
  const permissions = {
    'member': ['testimonies'],
    'volunteer': ['testimonies', 'events'],
    'usher': ['testimonies', 'events'],
    'worship_team': ['testimonies', 'events'],
    'pastor': ['testimonies', 'events', 'teaching', 'news'],
    'bishop': ['testimonies', 'events', 'teaching', 'news'],
    'admin': ['testimonies', 'events', 'teaching', 'news']
  };

  const allowedCategories = permissions[userRole] || [];
  return allowedCategories.includes(category);
};

// @desc    Get all blogs
// @route   GET /api/blogs
// @access  Public
exports.getBlogs = asyncHandler(async (req, res) => {
  const { category } = req.query;
  
  let query = { approved: true };
  if (category) {
    query.category = category;
  }

  const blogs = await Blog.find(query)
    .populate('author', 'name username role')
    .sort({ createdAt: -1 });

  res.json({
    success: true,
    count: blogs.length,
    blogs
  });
});

// @desc    Get blogs by category
// @route   GET /api/blogs/category/:category
// @access  Public
exports.getBlogsByCategory = asyncHandler(async (req, res) => {
  const { category } = req.params;

  const blogs = await Blog.find({ 
    category,
    approved: true 
  })
    .populate('author', 'name username role')
    .sort({ createdAt: -1 });

  res.json({
    success: true,
    category,
    count: blogs.length,
    blogs
  });
});

// @desc    Get single blog
// @route   GET /api/blogs/:id
// @access  Public
exports.getBlog = asyncHandler(async (req, res) => {
  const blog = await Blog.findById(req.params.id)
    .populate('author', 'name username role')
    .populate('comments.user', 'name username');

  if (!blog) {
    return res.status(404).json({ 
      success: false, 
      message: 'Blog not found' 
    });
  }

  res.json({
    success: true,
    blog
  });
});

// @desc    Create blog
// @route   POST /api/blogs
// @access  Private
exports.createBlog = asyncHandler(async (req, res) => {
  const { title, content, category, description, image } = req.body;

  // Check if user can post in this category
  if (!canPostInCategory(req.user.role, category)) {
    return res.status(403).json({
      success: false,
      message: `Your role (${req.user.role}) cannot post in ${category} category`,
      allowedCategories: ['member', 'volunteer', 'usher', 'worship_team'].includes(req.user.role) 
        ? ['testimonies'] 
        : ['testimonies', 'events', 'teaching', 'news']
    });
  }

  const blog = await Blog.create({
    title,
    content,
    category,
    description,
    image,
    author: req.user.id,
    authorRole: req.user.role,
    approved: req.user.role === 'admin' ? true : false
  });

  const populatedBlog = await blog.populate('author', 'name username role');

  res.status(201).json({
    success: true,
    message: req.user.role === 'admin' 
      ? 'Blog created and approved' 
      : 'Blog submitted for approval',
    blog: populatedBlog
  });
});

// @desc    Update blog (author or admin only)
// @route   PUT /api/blogs/:id
// @access  Private
exports.updateBlog = asyncHandler(async (req, res) => {
  let blog = await Blog.findById(req.params.id);

  if (!blog) {
    return res.status(404).json({ 
      success: false, 
      message: 'Blog not found' 
    });
  }

  // Check authorization
  if (blog.author.toString() !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({ 
      success: false, 
      message: 'Not authorized to update this blog' 
    });
  }

  // Check category permission if changing category
  if (req.body.category && req.body.category !== blog.category) {
    if (!canPostInCategory(req.user.role, req.body.category)) {
      return res.status(403).json({
        success: false,
        message: `Cannot move blog to ${req.body.category} category`
      });
    }
  }

  blog = await Blog.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true, runValidators: true }
  ).populate('author', 'name username role');

  res.json({
    success: true,
    blog
  });
});

// @desc    Delete blog (author or admin only)
// @route   DELETE /api/blogs/:id
// @access  Private
exports.deleteBlog = asyncHandler(async (req, res) => {
  const blog = await Blog.findById(req.params.id);

  if (!blog) {
    return res.status(404).json({ 
      success: false, 
      message: 'Blog not found' 
    });
  }

  // Check authorization
  if (blog.author.toString() !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({ 
      success: false, 
      message: 'Not authorized to delete this blog' 
    });
  }

  await Blog.findByIdAndDelete(req.params.id);

  res.json({
    success: true,
    message: 'Blog deleted'
  });
});

// @desc    Approve blog (admin only)
// @route   PUT /api/blogs/:id/approve
// @access  Private/Admin
exports.approveBlog = asyncHandler(async (req, res) => {
  const blog = await Blog.findByIdAndUpdate(
    req.params.id,
    { 
      approved: true,
      approvedBy: req.user.id
    },
    { new: true }
  ).populate('author', 'name username role');

  res.json({
    success: true,
    message: 'Blog approved',
    blog
  });
});

// @desc    Get pending blogs (admin only)
// @route   GET /api/blogs/pending
// @access  Private/Admin
exports.getPendingBlogs = asyncHandler(async (req, res) => {
  const blogs = await Blog.find({ approved: false })
    .populate('author', 'name username role')
    .sort({ createdAt: -1 });

  res.json({
    success: true,
    count: blogs.length,
    blogs
  });
});