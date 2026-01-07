const Livestream = require('../models/livestreamModel');
const asyncHandler = require('express-async-handler');

// ===== HELPER: Extract Video ID from URL =====
const extractVideoId = (url, platform) => {
  if (platform === 'youtube') {
    const match = url.match(/(?:youtube\.com\/embed\/|youtu\.be\/|youtube\.com\/watch\?v=)([^&\n?#]+)/);
    return match ? match[1] : null;
  }
  if (platform === 'facebook') {
    const match = url.match(/\/(\d+)/);
    return match ? match[1] : null;
  }
  return null;
};

/**
 * GET /api/livestreams/active
 * Get currently live stream (PUBLIC)
 */
exports.getActiveStream = asyncHandler(async (req, res) => {
  const activeStream = await Livestream.findOne({
    status: 'live'
  }).populate('preachers', 'name');

  if (!activeStream) {
    return res.status(404).json({ success: false, message: 'No active stream' });
  }

  res.json({ success: true, data: activeStream });
});

/**
 * GET /api/livestreams/archives
 * Get archived livestreams with filters (PUBLIC)
 */
exports.getArchives = asyncHandler(async (req, res) => {
  const { type, preacher, sortBy = '-startTime', limit = 20, skip = 0, includeScheduled } = req.query;

  const filter = { isPublic: true };
  
  // If includeScheduled is true, show live + scheduled. Otherwise show only archived
  if (!includeScheduled) {
    filter.status = 'archived';
  } else {
    // Show archived AND live AND scheduled (exclude ended)
    filter.status = { $in: ['archived', 'live', 'scheduled'] };
  }
  
  if (type) filter.type = type;
  if (preacher) filter.preachers = preacher;

  const archives = await Livestream.find(filter)
    .populate('preachers', 'name')
    .sort(sortBy)
    .limit(parseInt(limit))
    .skip(parseInt(skip));

  const total = await Livestream.countDocuments(filter);

  res.json({
    success: true,
    data: archives,
    pagination: { total, limit: parseInt(limit), skip: parseInt(skip) }
  });
});

/**
 * GET /api/livestreams/:id
 * Get single livestream (PUBLIC)
 */
exports.getStreamById = asyncHandler(async (req, res) => {
  const stream = await Livestream.findById(req.params.id).populate('preachers', 'name');

  if (!stream) {
    return res.status(404).json({ success: false, message: 'Livestream not found' });
  }

  res.json({ success: true, data: stream });
});

/**
 * POST /api/livestreams
 * Create new livestream (ADMIN ONLY)
 */
exports.createStream = asyncHandler(async (req, res) => {
  const { title, type, youtubeUrl, facebookUrl, startTime, preachers, preacherNames, scriptures, description, status } = req.body;

  // Validate required fields
  if (!title || !type || !startTime) {
    return res.status(400).json({ 
      success: false, 
      message: 'Title, type, and startTime are required' 
    });
  }

  const youtubeVideoId = youtubeUrl ? extractVideoId(youtubeUrl, 'youtube') : null;
  const facebookVideoId = facebookUrl ? extractVideoId(facebookUrl, 'facebook') : null;

  const livestream = new Livestream({
    title,
    type,
    youtubeUrl,
    facebookUrl,
    youtubeVideoId,
    facebookVideoId,
    startTime,
    preachers: preachers || [],
    preacherNames: preacherNames || [],
    scriptures: scriptures || [],
    description,
    status: status || 'scheduled',
    isPublic: true,
    createdBy: req.user._id
  });

  await livestream.save();
  await livestream.populate('preachers', 'name');

  res.status(201).json({ success: true, data: livestream, message: 'Livestream created successfully' });
});

/**
 * PUT /api/livestreams/:id
 * Update livestream (ADMIN ONLY)
 */
exports.updateStream = asyncHandler(async (req, res) => {
  const { title, type, youtubeUrl, facebookUrl, status, endTime, preachers, preacherNames, scriptures, description } = req.body;

  const livestream = await Livestream.findById(req.params.id);
  if (!livestream) {
    return res.status(404).json({ success: false, message: 'Livestream not found' });
  }

  if (title) livestream.title = title;
  if (type) livestream.type = type;
  if (youtubeUrl) {
    livestream.youtubeUrl = youtubeUrl;
    livestream.youtubeVideoId = extractVideoId(youtubeUrl, 'youtube');
  }
  if (facebookUrl) {
    livestream.facebookUrl = facebookUrl;
    livestream.facebookVideoId = extractVideoId(facebookUrl, 'facebook');
  }
  if (status) {
    livestream.status = status;
    if (status === 'ended') livestream.endTime = new Date();
  }
  if (endTime) livestream.endTime = endTime;
  if (preachers) livestream.preachers = preachers;
  if (preacherNames) livestream.preacherNames = preacherNames;
  if (scriptures) livestream.scriptures = scriptures;
  if (description !== undefined) livestream.description = description;

  livestream.updatedBy = req.user._id;
  await livestream.save();
  await livestream.populate('preachers', 'name');

  res.json({ success: true, data: livestream, message: 'Livestream updated successfully' });
});

/**
 * PUT /api/livestreams/:id/archive
 * Archive livestream when it ends (ADMIN ONLY)
 */
exports.archiveStream = asyncHandler(async (req, res) => {
  const { archiveUrl, viewCount, peakConcurrentViewers } = req.body;

  const livestream = await Livestream.findById(req.params.id);
  if (!livestream) {
    return res.status(404).json({ success: false, message: 'Livestream not found' });
  }

  livestream.status = 'archived';
  livestream.archivedAt = new Date();
  livestream.archiveUrl = archiveUrl || livestream.youtubeUrl || livestream.facebookUrl;
  if (viewCount) livestream.viewCount = viewCount;
  if (peakConcurrentViewers) livestream.peakConcurrentViewers = peakConcurrentViewers;
  if (!livestream.endTime) livestream.endTime = new Date();

  await livestream.save();
  res.json({ success: true, message: 'Livestream archived', data: livestream });
});

/**
 * PUT /api/livestreams/:id/ai-summary
 * Add AI-generated summary to livestream (ADMIN ONLY)
 */
exports.addAISummary = asyncHandler(async (req, res) => {
  const { summary, keyPoints } = req.body;

  if (!summary) {
    return res.status(400).json({ 
      success: false, 
      message: 'Summary is required' 
    });
  }

  const livestream = await Livestream.findById(req.params.id);
  if (!livestream) {
    return res.status(404).json({ success: false, message: 'Livestream not found' });
  }

  livestream.aiSummary = {
    summary,
    keyPoints: keyPoints || [],
    generatedAt: new Date(),
    aiModel: 'claude-3'
  };

  await livestream.save();
  res.json({ success: true, data: livestream, message: 'AI summary added successfully' });
});

/**
 * DELETE /api/livestreams/:id
 * Delete livestream (ADMIN ONLY)
 */
exports.deleteStream = asyncHandler(async (req, res) => {
  const livestream = await Livestream.findByIdAndDelete(req.params.id);

  if (!livestream) {
    return res.status(404).json({ success: false, message: 'Livestream not found' });
  }

  res.json({ success: true, message: 'Livestream deleted successfully' });
});

/**
 * GET /api/livestreams/admin/analytics
 * Get livestream analytics (ADMIN ONLY)
 */
exports.getAnalytics = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;

  const filter = {};
  if (startDate || endDate) {
    filter.startTime = {};
    if (startDate) filter.startTime.$gte = new Date(startDate);
    if (endDate) filter.startTime.$lte = new Date(endDate);
  }

  const streams = await Livestream.find(filter);

  const analytics = {
    totalStreams: streams.length,
    archivedStreams: streams.filter(s => s.status === 'archived').length,
    liveStreams: streams.filter(s => s.status === 'live').length,
    scheduledStreams: streams.filter(s => s.status === 'scheduled').length,
    totalViews: streams.reduce((sum, s) => sum + (s.viewCount || 0), 0),
    avgViews: streams.length ? Math.round(streams.reduce((sum, s) => sum + (s.viewCount || 0), 0) / streams.length) : 0,
    topStreams: streams.sort((a, b) => b.viewCount - a.viewCount).slice(0, 5),
    byType: {
      sermon: streams.filter(s => s.type === 'sermon').length,
      praise_worship: streams.filter(s => s.type === 'praise_worship').length,
      full_service: streams.filter(s => s.type === 'full_service').length,
      sunday_school: streams.filter(s => s.type === 'sunday_school').length,
      special_event: streams.filter(s => s.type === 'special_event').length
    }
  };

  res.json({ success: true, data: analytics });
});