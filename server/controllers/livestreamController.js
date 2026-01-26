const Livestream = require('../models/livestreamModel');
const asyncHandler = require('express-async-handler');
const { validationResult } = require('express-validator');
const { processCaptionsForStream } = require('../services/captionWorker');
const { extractYouTubeTranscript, extractFacebookTranscript } = require('../services/transcriptService');
const { generateSummaryFromTranscript } = require('../services/aiSummaryFromTranscript');

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

// ===== HELPER: Check validation errors =====
const handleValidationErrors = (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      errors: errors.array().map(err => ({
        field: err.param,
        message: err.msg
      }))
    });
  }
};

/**
 * GET /api/livestreams/active
 * Get currently live stream (PUBLIC)
 */
exports.getActiveStream = asyncHandler(async (req, res) => {
  try {
    const activeStream = await Livestream.findOne({
      status: 'live',
      isPublic: true
    }).populate('preachers', 'name');

    if (!activeStream) {
      return res.status(404).json({ 
        success: false, 
        message: 'No active stream' 
      });
    }

    res.json({ success: true, data: activeStream });
  } catch (error) {
    console.error('Error fetching active stream:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch active stream' 
    });
  }
});

/**
 * GET /api/livestreams/archives
 * Get archived livestreams with filters (PUBLIC)
 */
exports.getArchives = asyncHandler(async (req, res) => {
  try {
    const { type, preacher, sortBy = '-startTime', limit = 20, skip = 0, includeScheduled } = req.query;

    // Validate query params
    const queryLimit = Math.min(parseInt(limit) || 20, 100); // Max 100 per request
    const querySkip = Math.max(parseInt(skip) || 0, 0);

    const filter = { isPublic: true };
    
    if (!includeScheduled) {
      filter.status = 'archived';
    } else {
      filter.status = { $in: ['archived', 'live', 'scheduled'] };
    }
    
    if (type && ['sermon', 'praise_worship', 'full_service', 'sunday_school', 'special_event'].includes(type)) {
      filter.type = type;
    }
    if (preacher) filter.preachers = preacher;

    const archives = await Livestream.find(filter)
      .populate('preachers', 'name')
      .sort(sortBy)
      .limit(queryLimit)
      .skip(querySkip)
      .lean();

    const total = await Livestream.countDocuments(filter);

    res.json({
      success: true,
      data: archives || [],
      pagination: { 
        total, 
        limit: queryLimit, 
        skip: querySkip,
        hasMore: (querySkip + queryLimit) < total
      }
    });
  } catch (error) {
    console.error('Error fetching archives:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch archives' 
    });
  }
});

/**
 * GET /api/livestreams/:id
 * Get single livestream (PUBLIC - only if public)
 */
exports.getStreamById = asyncHandler(async (req, res) => {
  try {
    const stream = await Livestream.findOne({
      _id: req.params.id,
      isPublic: true
    }).populate('preachers', 'name');

    if (!stream) {
      return res.status(404).json({ 
        success: false, 
        message: 'Livestream not found or not public' 
      });
    }

    res.json({ success: true, data: stream });
  } catch (error) {
    console.error('Error fetching stream:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch stream' 
    });
  }
});

/**
 * POST /api/livestreams
 * Create new livestream (ADMIN ONLY)
 */
exports.createStream = asyncHandler(async (req, res) => {
  try {
    // Check validation
    if (handleValidationErrors(req, res)) return;

    const { title, type, youtubeUrl, facebookUrl, startTime, preacherNames, scriptures, description, status, isPublic } = req.body;

    // ✅ Input validation
    if (!title || title.trim().length === 0) {
      return res.status(400).json({ success: false, message: 'Title is required' });
    }
    if (title.length > 200) {
      return res.status(400).json({ success: false, message: 'Title too long (max 200 chars)' });
    }
    if (!['sermon', 'praise_worship', 'full_service', 'sunday_school', 'special_event'].includes(type)) {
      return res.status(400).json({ success: false, message: 'Invalid stream type' });
    }
    if (!startTime) {
      return res.status(400).json({ success: false, message: 'Start time is required' });
    }
    if (new Date(startTime) < new Date()) {
      return res.status(400).json({ success: false, message: 'Start time must be in the future' });
    }

    // Validate arrays
    if (Array.isArray(preacherNames) && preacherNames.length > 10) {
      return res.status(400).json({ success: false, message: 'Max 10 preachers allowed' });
    }
    if (Array.isArray(scriptures) && scriptures.length > 20) {
      return res.status(400).json({ success: false, message: 'Max 20 scriptures allowed' });
    }

    const youtubeVideoId = youtubeUrl ? extractVideoId(youtubeUrl, 'youtube') : null;
    const facebookVideoId = facebookUrl ? extractVideoId(facebookUrl, 'facebook') : null;

    const livestream = new Livestream({
      title: title.trim(),
      type,
      youtubeUrl,
      facebookUrl,
      youtubeVideoId,
      facebookVideoId,
      startTime,
      preacherNames: (preacherNames || []).filter(p => p && p.trim()),
      scriptures: (scriptures || []).filter(s => s && s.trim()),
      description: description ? description.trim().substring(0, 2000) : '',
      status: status || 'scheduled',
      isPublic: isPublic !== false,
      createdBy: req.user._id
    });

    await livestream.save();
    await livestream.populate('preachers', 'name');

    res.status(201).json({ 
      success: true, 
      data: livestream, 
      message: 'Livestream created successfully' 
    });
  } catch (error) {
    console.error('Error creating stream:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to create livestream' 
    });
  }
});

/**
 * PUT /api/livestreams/:id
 * Update livestream (ADMIN ONLY - with ownership check)
 */
exports.updateStream = asyncHandler(async (req, res) => {
  try {
    if (handleValidationErrors(req, res)) return;

    const livestream = await Livestream.findById(req.params.id);
    
    if (!livestream) {
      return res.status(404).json({ 
        success: false, 
        message: 'Livestream not found' 
      });
    }

    // ✅ SECURITY: Check if user is creator or admin
    if (livestream.createdBy.toString() !== req.user._id.toString() && req.user.role?.name !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        message: 'Not authorized to update this stream' 
      });
    }

    const { title, type, youtubeUrl, facebookUrl, status, endTime, preacherNames, scriptures, description, isPublic } = req.body;

    // Validate inputs
    if (title && title.length > 200) {
      return res.status(400).json({ success: false, message: 'Title too long' });
    }
    if (type && !['sermon', 'praise_worship', 'full_service', 'sunday_school', 'special_event'].includes(type)) {
      return res.status(400).json({ success: false, message: 'Invalid stream type' });
    }
    if (Array.isArray(preacherNames) && preacherNames.length > 10) {
      return res.status(400).json({ success: false, message: 'Max 10 preachers allowed' });
    }

    if (title) livestream.title = title.trim();
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
    if (preacherNames) livestream.preacherNames = preacherNames.filter(p => p && p.trim());
    if (scriptures) livestream.scriptures = scriptures.filter(s => s && s.trim());
    if (description !== undefined) livestream.description = description.trim().substring(0, 2000);
    if (isPublic !== undefined) livestream.isPublic = isPublic;

    livestream.updatedBy = req.user._id;
    await livestream.save();
    await livestream.populate('preachers', 'name');

    res.json({ 
      success: true, 
      data: livestream, 
      message: 'Livestream updated successfully' 
    });
  } catch (error) {
    console.error('Error updating stream:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to update livestream' 
    });
  }
});

/**
 * PUT /api/livestreams/:id/archive
 * Archive livestream (ADMIN ONLY - with ownership check)
 */
exports.archiveStream = asyncHandler(async (req, res) => {
  try {
    const livestream = await Livestream.findById(req.params.id);
    
    if (!livestream) {
      return res.status(404).json({ 
        success: false, 
        message: 'Livestream not found' 
      });
    }

    // ✅ SECURITY: Check authorization
    if (livestream.createdBy.toString() !== req.user._id.toString() && req.user.role?.name !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        message: 'Not authorized' 
      });
    }

    const { archiveUrl, viewCount, peakConcurrentViewers } = req.body;

    livestream.status = 'archived';
    livestream.archivedAt = new Date();
    livestream.archiveUrl = archiveUrl || livestream.youtubeUrl || livestream.facebookUrl;
    if (viewCount && Number.isInteger(viewCount) && viewCount >= 0) livestream.viewCount = viewCount;
    if (peakConcurrentViewers && Number.isInteger(peakConcurrentViewers) && peakConcurrentViewers >= 0) {
      livestream.peakConcurrentViewers = peakConcurrentViewers;
    }
    if (!livestream.endTime) livestream.endTime = new Date();

    await livestream.save();

     processCaptionsForStream(livestream._id)
      .then(() => console.log('Captions generated successfully'))
      .catch(err => console.error('Background caption generation failed:', err));

    res.json({ 
      success: true, 
      message: 'Livestream archived', 
      data: livestream 
    });
  } catch (error) {
    console.error('Error archiving stream:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to archive livestream' 
    });
  }
});

/**
 * PUT /api/livestreams/:id/ai-summary
 * Add AI-generated summary (ADMIN ONLY)
 */
exports.addAISummary = asyncHandler(async (req, res) => {
  try {
    const { summary, keyPoints, captions } = req.body;

    if (!summary || summary.trim().length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Summary is required' 
      });
    }
    if (summary.length > 5000) {
      return res.status(400).json({ 
        success: false, 
        message: 'Summary too long (max 5000 chars)' 
      });
    }

    const livestream = await Livestream.findById(req.params.id);
    if (!livestream) {
      return res.status(404).json({ 
        success: false, 
        message: 'Livestream not found' 
      });
    }

    livestream.aiSummary = {
      summary: summary.trim(),
      keyPoints: Array.isArray(keyPoints) ? keyPoints.slice(0, 10) : [],
      captions: Array.isArray(captions) ? captions : [],
      generatedAt: new Date(),
      aiModel: 'claude-3'
    };

    await livestream.save();
    res.json({ 
      success: true, 
      data: livestream, 
      message: 'AI summary added successfully' 
    });
  } catch (error) {
    console.error('Error adding summary:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to add AI summary' 
    });
  }
});

/**
 * DELETE /api/livestreams/:id
 * Delete livestream (ADMIN ONLY - with ownership check)
 */
exports.deleteStream = asyncHandler(async (req, res) => {
  try {
    const livestream = await Livestream.findById(req.params.id);
    
    if (!livestream) {
      return res.status(404).json({ 
        success: false, 
        message: 'Livestream not found' 
      });
    }

    // ✅ SECURITY: Check authorization
    if (livestream.createdBy.toString() !== req.user._id.toString() && req.user.role?.name !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        message: 'Not authorized to delete' 
      });
    }

    await Livestream.findByIdAndDelete(req.params.id);
    
    res.json({ 
      success: true, 
      message: 'Livestream deleted successfully' 
    });
  } catch (error) {
    console.error('Error deleting stream:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to delete livestream' 
    });
  }
});

/**
 * GET /api/livestreams/:id/transcript
 * Get transcript (raw + cleaned) - PUBLIC but only if stream is public
 */
exports.getTranscript = asyncHandler(async (req, res) => {
  try {
    const livestream = await Livestream.findOne({
      _id: req.params.id,
      isPublic: true
    });

    if (!livestream) {
      return res.status(404).json({ 
        success: false, 
        message: 'Livestream not found or not public' 
      });
    }

    res.json({
      success: true,
      data: {
        raw: livestream.transcript?.raw || null,
        cleaned: livestream.transcript?.cleaned || null,
        extractionStatus: livestream.transcript?.extractionStatus || 'pending',
        extractionError: livestream.transcript?.extractionError || null
      }
    });
  } catch (error) {
    console.error('Error fetching transcript:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch transcript' 
    });
  }
});

/**
 * PUT /api/livestreams/:id/transcript
 * Update cleaned transcript (ADMIN ONLY)
 */
exports.updateTranscript = asyncHandler(async (req, res) => {
  try {
    const { cleaned } = req.body;

    if (!cleaned || typeof cleaned !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Cleaned transcript is required and must be a string'
      });
    }

    if (cleaned.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Cleaned transcript cannot be empty'
      });
    }

    if (cleaned.length > 50000) {
      return res.status(400).json({
        success: false,
        message: 'Transcript too long (max 50,000 characters)'
      });
    }

    const livestream = await Livestream.findById(req.params.id);
    
    if (!livestream) {
      return res.status(404).json({ 
        success: false, 
        message: 'Livestream not found' 
      });
    }

    // âœ… SECURITY: Check authorization
    if (livestream.createdBy.toString() !== req.user._id.toString() && req.user.role?.name !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        message: 'Not authorized' 
      });
    }

    livestream.transcript = livestream.transcript || {};
    livestream.transcript.cleaned = cleaned.trim();
    livestream.transcript.lastUpdatedBy = req.user._id;
    livestream.transcript.lastUpdatedAt = new Date();
    livestream.transcript.extractionStatus = 'manual';

    await livestream.save();

    res.json({
      success: true,
      message: 'Transcript updated successfully',
      data: {
        cleaned: livestream.transcript.cleaned,
        lastUpdatedAt: livestream.transcript.lastUpdatedAt
      }
    });
  } catch (error) {
    console.error('Error updating transcript:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to update transcript' 
    });
  }
});

/**
 * POST /api/livestreams/:id/transcript/extract
 * Attempt to extract transcript from YouTube/Facebook (ADMIN ONLY)
 */
exports.extractTranscript = asyncHandler(async (req, res) => {
  try {
    const livestream = await Livestream.findById(req.params.id);
    
    if (!livestream) {
      return res.status(404).json({ 
        success: false, 
        message: 'Livestream not found' 
      });
    }

    // âœ… SECURITY: Check authorization
    if (livestream.createdBy.toString() !== req.user._id.toString() && req.user.role?.name !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        message: 'Not authorized' 
      });
    }

    const { transcriptService } = require('../services/transcriptService');
    let extractedText = null;
    let extractionStatus = 'failed';
    let extractionError = null;

    // Try YouTube first
    if (livestream.youtubeVideoId) {
      try {
        extractedText = await transcriptService.extractYouTubeTranscript(livestream.youtubeVideoId);
        if (extractedText) {
          extractionStatus = 'success';
        } else {
          extractionError = 'YouTube captions not available for this video';
        }
      } catch (error) {
        extractionError = `YouTube extraction failed: ${error.message}`;
      }
    }

    // Try Facebook if YouTube failed
    if (!extractedText && livestream.facebookUrl) {
      try {
        extractedText = await transcriptService.extractFacebookTranscript(livestream.facebookUrl);
        if (extractedText) {
          extractionStatus = 'success';
        } else {
          extractionError = 'Facebook transcript extraction not available. Please provide manually.';
        }
      } catch (error) {
        extractionError = `Facebook extraction failed: ${error.message}`;
      }
    }

    livestream.transcript = livestream.transcript || {};
    livestream.transcript.raw = extractedText;
    livestream.transcript.extractionAttempted = true;
    livestream.transcript.extractionStatus = extractionStatus;
    livestream.transcript.extractionError = extractionError || null;
    
    // If first time extracting, use raw as cleaned
    if (!livestream.transcript.cleaned && extractedText) {
      livestream.transcript.cleaned = extractedText;
    }

    await livestream.save();

    res.json({
      success: extractionStatus === 'success',
      message: extractionStatus === 'success' 
        ? 'Transcript extracted successfully' 
        : 'Transcript extraction failed. Please provide manually.',
      data: {
        raw: livestream.transcript.raw,
        cleaned: livestream.transcript.cleaned,
        extractionStatus: livestream.transcript.extractionStatus,
        extractionError: livestream.transcript.extractionError
      }
    });
  } catch (error) {
    console.error('Error extracting transcript:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to extract transcript' 
    });
  }
});

/**
 * POST /api/livestreams/:id/transcript/generate-summary
 * Generate AI summary from cleaned transcript (ADMIN ONLY)
 */
exports.generateSummaryFromTranscript = asyncHandler(async (req, res) => {
  try {
    const livestream = await Livestream.findById(req.params.id);
    
    if (!livestream) {
      return res.status(404).json({ 
        success: false, 
        message: 'Livestream not found' 
      });
    }

    // âœ… SECURITY: Check authorization
    if (livestream.createdBy.toString() !== req.user._id.toString() && req.user.role?.name !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        message: 'Not authorized' 
      });
    }

    const cleaned = livestream.transcript?.cleaned;
    if (!cleaned || cleaned.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Cleaned transcript is required. Please extract or provide transcript first.'
      });
    }

    const { generateSummaryFromTranscript } = require('../services/aiSummaryFromTranscript');
    
    const summary = await generateSummaryFromTranscript(livestream, cleaned);

    livestream.aiSummary = {
      summary: summary.summary,
      keyPoints: summary.keyPoints,
      captions: livestream.aiSummary?.captions || [],
      generatedAt: summary.generatedAt,
      aiModel: summary.aiModel
    };

    await livestream.save();

    res.json({
      success: true,
      message: 'AI summary generated successfully',
      data: {
        summary: livestream.aiSummary.summary,
        keyPoints: livestream.aiSummary.keyPoints,
        generatedAt: livestream.aiSummary.generatedAt
      }
    });
  } catch (error) {
    console.error('Error generating summary:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Failed to generate AI summary' 
    });
  }
});

/**
 * GET /api/livestreams/admin/analytics
 * Get livestream analytics (ADMIN ONLY)
 */
exports.getAnalytics = asyncHandler(async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const filter = {};
    if (startDate || endDate) {
      filter.startTime = {};
      if (startDate) filter.startTime.$gte = new Date(startDate);
      if (endDate) filter.startTime.$lte = new Date(endDate);
    }

    const streams = await Livestream.find(filter).lean();

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
  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch analytics' 
    });
  }
});