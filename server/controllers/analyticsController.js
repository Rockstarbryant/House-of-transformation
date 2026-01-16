// server/controllers/analyticsController.js
const User = require('../models/User');
const Event = require('../models/Event');
const Sermon = require('../models/Sermon');
const Blog = require('../models/Blog');
const Volunteer = require('../models/Volunteer');
const Feedback = require('../models/Feedback');
const Gallery = require('../models/Gallery');
const Livestream = require('../models/livestreamModel');
const AuditLog = require('../models/AuditLog');
const asyncHandler = require('../middleware/asyncHandler');

// ============================================
// OVERVIEW DASHBOARD
// ============================================

// @desc    Get dashboard overview stats
// @route   GET /api/analytics/overview
// @access  Private (view:analytics permission)
exports.getOverview = asyncHandler(async (req, res) => {
  try {
    console.log('[ANALYTICS-OVERVIEW] Fetching overview stats');

    const [
      totalUsers,
      totalEvents,
      totalSermons,
      totalBlogs,
      totalVolunteers,
      totalFeedback,
      totalGallery,
      totalLivestreams,
      activeUsers,
      upcomingEvents,
      recentSermons,
      pendingVolunteers
    ] = await Promise.all([
      User.countDocuments(),
      Event.countDocuments(),
      Sermon.countDocuments(),
      Blog.countDocuments(),
      Volunteer.countDocuments(),
      Feedback.countDocuments(),
      Gallery.countDocuments(),
      Livestream.countDocuments(),
      User.countDocuments({ isActive: true }),
      Event.countDocuments({ date: { $gte: new Date() } }),
      Sermon.countDocuments({ date: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } }),
      Volunteer.countDocuments({ status: 'pending' })
    ]);

    res.json({
      success: true,
      stats: {
        users: { total: totalUsers, active: activeUsers },
        events: { total: totalEvents, upcoming: upcomingEvents },
        sermons: { total: totalSermons, recent: recentSermons },
        blogs: { total: totalBlogs },
        volunteers: { total: totalVolunteers, pending: pendingVolunteers },
        feedback: { total: totalFeedback },
        gallery: { total: totalGallery },
        livestreams: { total: totalLivestreams }
      }
    });
  } catch (error) {
    console.error('[ANALYTICS-OVERVIEW] Error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch overview', error: error.message });
  }
});

// ============================================
// USER ANALYTICS
// ============================================

// @desc    Get user analytics
// @route   GET /api/analytics/users
// @access  Private
exports.getUserAnalytics = asyncHandler(async (req, res) => {
  try {
    console.log('[ANALYTICS-USERS] Fetching user analytics');

    const [roleDistribution, statusDistribution, growthData] = await Promise.all([
      User.aggregate([
        { $lookup: { from: 'roles', localField: 'role', foreignField: '_id', as: 'roleData' } },
        { $unwind: { path: '$roleData', preserveNullAndEmptyArrays: true } },
        { $group: { _id: '$roleData.name', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]),
      User.aggregate([
        { $group: { _id: '$isActive', count: { $sum: 1 } } }
      ]),
      User.aggregate([
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' }
            },
            count: { $sum: 1 }
          }
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } },
        { $limit: 12 }
      ])
    ]);

    res.json({
      success: true,
      analytics: {
        roleDistribution,
        statusDistribution,
        growthData
      }
    });
  } catch (error) {
    console.error('[ANALYTICS-USERS] Error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch user analytics', error: error.message });
  }
});

// ============================================
// CONTENT ANALYTICS
// ============================================

// @desc    Get content analytics
// @route   GET /api/analytics/content
// @access  Private
exports.getContentAnalytics = asyncHandler(async (req, res) => {
  try {
    console.log('[ANALYTICS-CONTENT] Fetching content analytics');

    const [
      sermonsByCategory,
      sermonsByMonth,
      topSermons,
      blogsByCategory,
      topBlogs,
      galleryByCategory
    ] = await Promise.all([
      Sermon.aggregate([
        { $group: { _id: '$category', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]),
      Sermon.aggregate([
        {
          $group: {
            _id: { year: { $year: '$date' }, month: { $month: '$date' } },
            count: { $sum: 1 }
          }
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } },
        { $limit: 12 }
      ]),
      Sermon.find().sort({ views: -1, likes: -1 }).limit(10).select('title pastor views likes date'),
      Blog.aggregate([
        { $group: { _id: '$category', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]),
      Blog.find().sort({ 'likes': -1 }).limit(10).select('title category createdAt').populate('author', 'name'),
      Gallery.aggregate([
        { $group: { _id: '$category', count: { $sum: 1 }, totalLikes: { $sum: '$likes' } } },
        { $sort: { count: -1 } }
      ])
    ]);

    res.json({
      success: true,
      analytics: {
        sermons: { byCategory: sermonsByCategory, byMonth: sermonsByMonth, top: topSermons },
        blogs: { byCategory: blogsByCategory, top: topBlogs },
        gallery: { byCategory: galleryByCategory }
      }
    });
  } catch (error) {
    console.error('[ANALYTICS-CONTENT] Error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch content analytics', error: error.message });
  }
});

// ============================================
// ENGAGEMENT ANALYTICS
// ============================================

// @desc    Get engagement analytics
// @route   GET /api/analytics/engagement
// @access  Private
exports.getEngagementAnalytics = asyncHandler(async (req, res) => {
  try {
    console.log('[ANALYTICS-ENGAGEMENT] Fetching engagement analytics');

    const [
      feedbackStats,
      volunteerStats,
      eventRegistrations,
      livestreamStats
    ] = await Promise.all([
      Feedback.aggregate([
        {
          $facet: {
            byCategory: [{ $group: { _id: '$category', count: { $sum: 1 } } }],
            byStatus: [{ $group: { _id: '$status', count: { $sum: 1 } } }],
            recentCount: [
              { $match: { submittedAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } } },
              { $count: 'count' }
            ]
          }
        }
      ]),
      Volunteer.aggregate([
        {
          $facet: {
            byMinistry: [{ $group: { _id: '$ministry', count: { $sum: 1 } } }],
            byStatus: [{ $group: { _id: '$status', count: { $sum: 1 } } }],
            thisMonth: [
              { $match: { appliedAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } } },
              { $count: 'count' }
            ]
          }
        }
      ]),
      Event.aggregate([
        { $unwind: '$registrations' },
        {
          $group: {
            _id: {
              year: { $year: '$registrations.registeredAt' },
              month: { $month: '$registrations.registeredAt' }
            },
            count: { $sum: 1 }
          }
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } },
        { $limit: 12 }
      ]),
      Livestream.aggregate([
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            totalViews: { $sum: '$viewCount' },
            avgViews: { $avg: '$viewCount' }
          }
        }
      ])
    ]);

    res.json({
      success: true,
      analytics: {
        feedback: feedbackStats[0],
        volunteers: volunteerStats[0],
        eventRegistrations,
        livestreams: livestreamStats
      }
    });
  } catch (error) {
    console.error('[ANALYTICS-ENGAGEMENT] Error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch engagement analytics', error: error.message });
  }
});

// ============================================
// ACTIVITY TIMELINE
// ============================================

// @desc    Get recent activity timeline
// @route   GET /api/analytics/activity
// @access  Private
exports.getRecentActivity = asyncHandler(async (req, res) => {
  try {
    const { limit = 20 } = req.query;

    console.log('[ANALYTICS-ACTIVITY] Fetching recent activity');

    const recentLogs = await AuditLog.find({ success: true })
      .sort({ timestamp: -1 })
      .limit(parseInt(limit))
      .populate('user', 'name email')
      .lean();

    res.json({
      success: true,
      activity: recentLogs
    });
  } catch (error) {
    console.error('[ANALYTICS-ACTIVITY] Error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch activity', error: error.message });
  }
});

// ============================================
// GROWTH TRENDS
// ============================================

// @desc    Get growth trends over time
// @route   GET /api/analytics/trends
// @access  Private
exports.getGrowthTrends = asyncHandler(async (req, res) => {
  try {
    const { period = '6months' } = req.query;

    console.log('[ANALYTICS-TRENDS] Fetching growth trends for:', period);

    let startDate;
    switch (period) {
      case '7days':
        startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30days':
        startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '6months':
        startDate = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000);
        break;
      case '1year':
        startDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000);
    }

    const [userGrowth, sermonGrowth, eventGrowth, blogGrowth] = await Promise.all([
      User.aggregate([
        { $match: { createdAt: { $gte: startDate } } },
        {
          $group: {
            _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' }, day: { $dayOfMonth: '$createdAt' } },
            count: { $sum: 1 }
          }
        },
        { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
      ]),
      Sermon.aggregate([
        { $match: { createdAt: { $gte: startDate } } },
        {
          $group: {
            _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
            count: { $sum: 1 }
          }
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } }
      ]),
      Event.aggregate([
        { $match: { createdAt: { $gte: startDate } } },
        {
          $group: {
            _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
            count: { $sum: 1 }
          }
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } }
      ]),
      Blog.aggregate([
        { $match: { createdAt: { $gte: startDate } } },
        {
          $group: {
            _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
            count: { $sum: 1 }
          }
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } }
      ])
    ]);

    res.json({
      success: true,
      trends: {
        users: userGrowth,
        sermons: sermonGrowth,
        events: eventGrowth,
        blogs: blogGrowth
      }
    });
  } catch (error) {
    console.error('[ANALYTICS-TRENDS] Error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch trends', error: error.message });
  }
});