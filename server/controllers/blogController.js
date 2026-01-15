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
// @route   POST /api/blog
// @access  Private
exports.createBlog = asyncHandler(async (req, res) => {
  console.log('\n========================================');
  console.log('📝 CREATE BLOG REQUEST');
  console.log('========================================');
  console.log('Request Body:', JSON.stringify(req.body, null, 2));
  console.log('User Object Keys:', Object.keys(req.user));
  console.log('User Role:', req.user?.role);
  console.log('========================================\n');
  
  const { title, content, category, description, image } = req.body;

  // Check for required fields
  if (!title || !content || !category) {
    console.log('❌ Missing required fields:', { 
      title: !!title, 
      content: !!content, 
      category: !!category 
    });
    return res.status(400).json({
      success: false,
      message: 'Please provide title, content, and category',
      missing: {
        title: !title,
        content: !content,
        category: !category
      }
    });
  }

  // Get user ID (MongoDB uses _id, not id)
  const userId = req.user._id || req.user.id;
  if (!userId) {
    console.log('❌ User ID missing from req.user');
    console.log('Available keys:', Object.keys(req.user));
    return res.status(400).json({
      success: false,
      message: 'User ID not found in request'
    });
  }
  console.log('✅ User ID:', userId);

  // Check if user has role
  if (!req.user.role) {
    console.log('❌ User role missing from req.user');
    return res.status(400).json({
      success: false,
      message: 'User role not found in request'
    });
  }

  // Check if user can post in this category
  console.log('🔍 Checking category permission...');
  console.log('   User Role:', req.user.role);
  console.log('   Category:', category);
  
  if (!canPostInCategory(req.user.role, category)) {
    console.log('❌ User cannot post in category:', category);
    return res.status(403).json({
      success: false,
      message: `Your role (${req.user.role}) cannot post in ${category} category`,
      allowedCategories: ['member', 'volunteer', 'usher', 'worship_team'].includes(req.user.role) 
        ? ['testimonies'] 
        : ['testimonies', 'events', 'teaching', 'news']
    });
  }

  console.log('✅ Permission check passed');
  console.log('📤 Creating blog document...');

  try {
    const blog = await Blog.create({
      title,
      content,
      category,
      description,
      image,
      author: userId,  // ✅ Fixed: using userId which handles both _id and id
      authorRole: req.user.role,
      approved: req.user.role === 'admin' ? true : false
    });

    console.log('✅ Blog created with ID:', blog._id);

    const populatedBlog = await blog.populate('author', 'name username role');

    console.log('✅ Blog created successfully!');
    console.log('========================================\n');

    res.status(201).json({
      success: true,
      message: req.user.role === 'admin' 
        ? 'Blog created and approved' 
        : 'Blog submitted for approval',
      blog: populatedBlog
    });
  } catch (error) {
    console.error('❌ Error creating blog:', error.message);
    console.log('========================================\n');
    throw error;
  }
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

  // ✅ Fixed: Use _id for comparison
  const userId = req.user._id?.toString() || req.user.id?.toString();
  
  // Check authorization
  if (blog.author.toString() !== userId && req.user.role !== 'admin') {
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

  // ✅ Fixed: Use _id for comparison
  const userId = req.user._id?.toString() || req.user.id?.toString();

  // Check authorization
  if (blog.author.toString() !== userId && req.user.role !== 'admin') {
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
  // ✅ Fixed: Use _id
  const userId = req.user._id || req.user.id;
  
  const blog = await Blog.findByIdAndUpdate(
    req.params.id,
    { 
      approved: true,
      approvedBy: userId
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