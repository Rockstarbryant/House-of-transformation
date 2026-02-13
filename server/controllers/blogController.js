const Blog = require('../models/Blog');
const asyncHandler = require('../middleware/asyncHandler');

// @desc    Get all blogs or filter by category
// @route   GET /api/blog
// @route   GET /api/blog?category=news
// @access  Public
exports.getBlogs = asyncHandler(async (req, res) => {
  const { category } = req.query;
  
  console.log('[BLOG-GET] Fetching blogs');
  console.log('[BLOG-GET] Query params:', { category });

  // Build query - always filter by approved status
  let query = { approved: true };
  
  // Add category filter if provided
  if (category && category !== 'all' && category !== '') {
    const categoryLower = category.toLowerCase().trim();
    console.log('[BLOG-GET] Filtering by category:', categoryLower);
    query.category = categoryLower;
  }

  console.log('[BLOG-GET] Final query:', query);

  const blogs = await Blog.find(query)
    .populate('author', 'name username role')
    .sort({ createdAt: -1 });

  console.log('[BLOG-GET] Found blogs:', blogs.length);

  res.json({
    success: true,
    count: blogs.length,
    category: category || 'all',
    blogs
  });
});

// @desc    Get blogs by category (alternative route)
// @route   GET /api/blog/category/:category
// @access  Public
exports.getBlogsByCategory = asyncHandler(async (req, res) => {
  const { category } = req.params;

  console.log('[BLOG-CATEGORY] Fetching blogs for category:', category);

  if (!category || category === 'all') {
    // If "all" or empty, return all approved blogs
    const blogs = await Blog.find({ approved: true })
      .populate('author', 'name username role')
      .sort({ createdAt: -1 });

    return res.json({
      success: true,
      category: 'all',
      count: blogs.length,
      blogs
    });
  }

  const categoryLower = category.toLowerCase().trim();

  const blogs = await Blog.find({ 
    category: categoryLower,
    approved: true 
  })
    .populate('author', 'name username role')
    .sort({ createdAt: -1 });

  console.log('[BLOG-CATEGORY] Found blogs:', blogs.length);

  res.json({
    success: true,
    category: categoryLower,
    count: blogs.length,
    blogs
  });
});

// @desc    Get single blog
// @route   GET /api/blog/:id
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
// @access  Private (requires manage:blog permission)
exports.createBlog = asyncHandler(async (req, res) => {
  console.log('\n========================================');
  console.log('📝 CREATE BLOG REQUEST');
  console.log('========================================');
  console.log('Request Body:', JSON.stringify(req.body, null, 2));
  console.log('User Email:', req.user?.email);
  console.log('User ID:', req.user?._id);
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

  // Get user ID
  const userId = req.user._id;
  if (!userId) {
    console.log('❌ User ID missing from req.user');
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

  console.log('✅ User has role');

  try {
    // Note: Permission check is done by requirePermission middleware
    // This controller only creates the blog

    const blog = await Blog.create({
      title,
      content,
      category,
      description,
      image,
      author: userId,
      authorRole: req.user.role.name || req.user.role,
      approved: req.user.role.name === 'admin' ? true : false
    });

    console.log('✅ Blog created with ID:', blog._id);

    const populatedBlog = await blog.populate('author', 'name username role');

    console.log('✅ Blog created successfully!');
    console.log('========================================\n');

    res.status(201).json({
      success: true,
      message: req.user.role.name === 'admin' 
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
// @route   PUT /api/blog/:id
// @access  Private (requires manage:blog permission)
exports.updateBlog = asyncHandler(async (req, res) => {
  let blog = await Blog.findById(req.params.id);

  if (!blog) {
    return res.status(404).json({ 
      success: false, 
      message: 'Blog not found' 
    });
  }

  // Fixed: Use _id for comparison
  const userId = req.user._id?.toString() || req.user.id?.toString();
  const isAdmin = req.user.role?.name === 'admin';
  
  // Check authorization - author or admin can edit
  if (blog.author.toString() !== userId && !isAdmin) {
    return res.status(403).json({ 
      success: false, 
      message: 'Not authorized to update this blog' 
    });
  }

  blog = await Blog.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true, runValidators: true }
  ).populate('author', 'name username role');

  res.json({
    success: true,
    message: 'Blog updated successfully',
    blog
  });
});

// @desc    Delete blog (author or admin only)
// @route   DELETE /api/blog/:id
// @access  Private (requires manage:blog permission)
exports.deleteBlog = asyncHandler(async (req, res) => {
  const blog = await Blog.findById(req.params.id);

  if (!blog) {
    return res.status(404).json({ 
      success: false, 
      message: 'Blog not found' 
    });
  }

  // Fixed: Use _id for comparison
  const userId = req.user._id?.toString() || req.user.id?.toString();
  const isAdmin = req.user.role?.name === 'admin';

  // Check authorization - author or admin can delete
  if (blog.author.toString() !== userId && !isAdmin) {
    return res.status(403).json({ 
      success: false, 
      message: 'Not authorized to delete this blog' 
    });
  }

  await Blog.findByIdAndDelete(req.params.id);

  res.json({
    success: true,
    message: 'Blog deleted successfully'
  });
});

// @desc    Approve blog (admin only)
// @route   PUT /api/blog/:id/approve
// @access  Private/Admin
exports.approveBlog = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  
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
// @route   GET /api/blog/pending
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



// SEO ADDITION START
// @desc    Get single blog by slug (SEO-friendly)
// @route   GET /api/blog/slug/:slug
// @access  Public
exports.getBlogBySlug = asyncHandler(async (req, res) => {
  const { slug } = req.params;

  console.log('[BLOG-SLUG] Fetching blog by slug:', slug);

  const blog = await Blog.findOne({ 
    slug: slug.toLowerCase().trim(), 
    approved: true 
  })
    .populate('author', 'name username role')
    .populate('comments.user', 'name username');

  if (!blog) {
    return res.status(404).json({ 
      success: false, 
      message: 'Blog not found' 
    });
  }

  console.log('[BLOG-SLUG] Found blog:', blog.title);

  res.json({
    success: true,
    blog
  });
});