// server/controllers/analyticsController.js - COMPLETE ANALYTICS BACKEND
const User = require('../models/User');
const Sermon = require('../models/Sermon');
const Blog = require('../models/Blog');
const Event = require('../models/Event');
const Gallery = require('../models/Gallery');
const Feedback = require('../models/Feedback');
const Volunteer = require('../models/Volunteer');
const Livestream = require('../models/livestreamModel');
const Campaign = require('../models/Campaign');
const EmailLog = require('../models/EmailLog');
const Announcement = require('../models/Announcement');
const AuditLog = require('../models/AuditLog');
const BannedUser = require('../models/BannedUser');

const { createClient } = require('@supabase/supabase-js');
const config = require('../config/env');

const supabase = createClient(
  config.SUPABASE_URL,
  config.SUPABASE_SERVICE_KEY
);


// ✅ SECURITY HELPER
const hasAnalyticsPermission = (user) => {
  if (!user || !user.role) return false;
  if (user.role.name === 'admin') return true;
  return user.role.permissions && 
    user.role.permissions.includes('view:analytics');
};

/**
 * Get Overview Analytics
 * @route GET /api/analytics/overview
 * @access Private (Admin)
 */
exports.getOverview = async (req, res) => {
  try {
    // ✅ CRITICAL: Permission check
if (!hasAnalyticsPermission(req.user)) {
  return res.status(403).json({
    success: false,
    message: 'Access denied: Insufficient permissions',
    requiredPermissions: ['view:analytics'],
    userPermissions: req.user?.role?.permissions || [],
    userRole: req.user?.role?.name || 'none'
  });
}
    const [
      totalUsers,
      totalSermons,
      totalBlogs,
      totalEvents,
      totalGallery,
      totalFeedback,
      totalVolunteers,
      totalCampaigns
    ] = await Promise.all([
      User.countDocuments({ isActive: true, isBanned: false }),
      Sermon.countDocuments(),
      Blog.countDocuments(),
      Event.countDocuments(),
      Gallery.countDocuments(),
      Feedback.countDocuments({ isDeleted: false }),
      Volunteer.countDocuments(),
      Campaign.countDocuments()
    ]);

    // Calculate total donations from campaigns
    const campaignAggregation = await Campaign.aggregate([
      { $group: { _id: null, total: { $sum: '$currentAmount' } } }
    ]);
    const totalDonations = campaignAggregation[0]?.total || 0;

    res.json({
      success: true,
      data: {
        totalUsers,
        totalSermons,
        totalBlogs,
        totalEvents,
        totalGallery,
        totalFeedback,
        totalVolunteers,
        totalDonations
      }
    });
  } catch (error) {
    console.error('[Analytics] Overview error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch overview analytics'
    });
  }
};

/**
 * Get User Analytics
 * @route GET /api/analytics/users
 * @access Private (Admin)
 */
exports.getUserAnalytics = async (req, res) => {
  try {
    // ✅ CRITICAL: Permission check
if (!hasAnalyticsPermission(req.user)) {
  return res.status(403).json({
    success: false,
    message: 'Access denied: Insufficient permissions',
    requiredPermissions: ['view:analytics'],
    userPermissions: req.user?.role?.permissions || [],
    userRole: req.user?.role?.name || 'none'
  });
}
    // Total counts
    const [total, active, banned] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ isActive: true, isBanned: false }),
      User.countDocuments({ isBanned: true })
    ]);

    // New users this month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    
    const newThisMonth = await User.countDocuments({
      createdAt: { $gte: startOfMonth }
    });

    // Users by role
    const byRole = await User.aggregate([
      { $match: { isActive: true, isBanned: false } },
      {
        $lookup: {
          from: 'roles',
          localField: 'role',
          foreignField: '_id',
          as: 'roleInfo'
        }
      },
      { $unwind: { path: '$roleInfo', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: { $ifNull: ['$roleInfo.name', 'member'] },
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);

    // Users by gender
    const byGender = await User.aggregate([
      { $match: { isActive: true, isBanned: false } },
      {
        $group: {
          _id: '$gender',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);

    // Users by auth provider
    const byAuthProvider = await User.aggregate([
      { $match: { isActive: true, isBanned: false } },
      {
        $group: {
          _id: '$authProvider',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);

    // Growth trend (last 12 months)
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

    const growthTrend = await User.aggregate([
      { $match: { createdAt: { $gte: twelveMonthsAgo } } },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    res.json({
      success: true,
      data: {
        total,
        active,
        banned,
        newThisMonth,
        byRole,
        byGender,
        byAuthProvider,
        growthTrend
      }
    });
  } catch (error) {
    console.error('[Analytics] User analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user analytics'
    });
  }
};

/**
 * Get Content Analytics
 * @route GET /api/analytics/content
 * @access Private (Admin)
 */
exports.getContentAnalytics = async (req, res) => {
  try {
    // ✅ CRITICAL: Permission check
if (!hasAnalyticsPermission(req.user)) {
  return res.status(403).json({
    success: false,
    message: 'Access denied: Insufficient permissions',
    requiredPermissions: ['view:analytics'],
    userPermissions: req.user?.role?.permissions || [],
    userRole: req.user?.role?.name || 'none'
  });
}
    // ========== SERMONS ==========
    const totalSermons = await Sermon.countDocuments();
    
    const sermonsByCategory = await Sermon.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    const sermonsByType = await Sermon.aggregate([
      { $group: { _id: '$type', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    const sermonLikesViews = await Sermon.aggregate([
      {
        $group: {
          _id: null,
          totalLikes: { $sum: '$likes' },
          totalViews: { $sum: '$views' }
        }
      }
    ]);

    const sermonTrend = await Sermon.aggregate([
      {
        $match: {
          date: { $gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$date' },
            month: { $month: '$date' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    // ========== BLOGS ==========
    const totalBlogs = await Blog.countDocuments();
    const approvedBlogs = await Blog.countDocuments({ approved: true });
    const pendingBlogs = await Blog.countDocuments({ approved: false });

    const blogsByCategory = await Blog.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    const blogLikes = await Blog.aggregate([
      {
        $group: {
          _id: null,
          totalLikes: { $sum: { $size: '$likes' } }
        }
      }
    ]);

    const blogTrend = await Blog.aggregate([
      {
        $match: {
          createdAt: { $gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    // ========== GALLERY ==========
    const totalGallery = await Gallery.countDocuments();

    const galleryByCategory = await Gallery.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    const galleryLikes = await Gallery.aggregate([
      {
        $group: {
          _id: null,
          totalLikes: { $sum: '$likes' }
        }
      }
    ]);

    const galleryTrend = await Gallery.aggregate([
      {
        $match: {
          createdAt: { $gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    // ========== EVENTS ==========
    const totalEvents = await Event.countDocuments();
    const now = new Date();
    const upcomingEvents = await Event.countDocuments({ date: { $gte: now } });
    const pastEvents = await Event.countDocuments({ date: { $lt: now } });

    const eventRegistrations = await Event.aggregate([
      {
        $project: {
          totalRegs: { $size: { $ifNull: ['$registrations', []] } },
          memberRegs: {
            $size: {
              $filter: {
                input: { $ifNull: ['$registrations', []] },
                as: 'reg',
                cond: { $eq: ['$$reg.isVisitor', false] }
              }
            }
          },
          visitorRegs: {
            $size: {
              $filter: {
                input: { $ifNull: ['$registrations', []] },
                as: 'reg',
                cond: { $eq: ['$$reg.isVisitor', true] }
              }
            }
          }
        }
      },
      {
        $group: {
          _id: null,
          totalRegistrations: { $sum: '$totalRegs' },
          memberRegistrations: { $sum: '$memberRegs' },
          visitorRegistrations: { $sum: '$visitorRegs' }
        }
      }
    ]);

    const eventTrend = await Event.aggregate([
      {
        $match: {
          createdAt: { $gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    // Add inside getContentAnalytics, before the res.json()

// ========== TOP PERFORMING SERMONS ==========
const topSermonsByViews = await Sermon.find()
  .sort({ views: -1 })
  .limit(10)
  .select('title pastor category type views likes date thumbnail')
  .lean();

const topSermonsByLikes = await Sermon.find()
  .sort({ likes: -1 })
  .limit(10)
  .select('title pastor category type views likes date thumbnail')
  .lean();

// ========== TOP GALLERY PHOTOS ==========
const topGalleryByLikes = await Gallery.find()
  .sort({ likes: -1 })
  .limit(15)
  .select('title category likes imageUrl caption createdAt')
  .lean();

// ========== TOP EVENTS BY REGISTRATIONS ==========
const topEventsByRegistrations = await Event.aggregate([
  {
    $project: {
      title: 1,
      date: 1,
      location: 1,
      totalRegistrations: { $size: { $ifNull: ['$registrations', []] } },
      memberRegistrations: {
        $size: {
          $filter: {
            input: { $ifNull: ['$registrations', []] },
            as: 'reg',
            cond: { $eq: ['$$reg.isVisitor', false] }
          }
        }
      },
      visitorRegistrations: {
        $size: {
          $filter: {
            input: { $ifNull: ['$registrations', []] },
            as: 'reg',
            cond: { $eq: ['$$reg.isVisitor', true] }
          }
        }
      },
      capacity: 1
    }
  },
  { $sort: { totalRegistrations: -1 } },
  { $limit: 10 }
]);

// ========== SERMON TREND BY PERIOD ==========
const periods = {
  week: new Date(now - 7 * 24 * 60 * 60 * 1000),
  month: new Date(now - 30 * 24 * 60 * 60 * 1000),
  year: new Date(now - 365 * 24 * 60 * 60 * 1000)
};

const topSermonsByViewsWeek = await Sermon.find({ date: { $gte: periods.week } })
  .sort({ views: -1 }).limit(10)
  .select('title pastor category views likes date').lean();

const topSermonsByViewsMonth = await Sermon.find({ date: { $gte: periods.month } })
  .sort({ views: -1 }).limit(10)
  .select('title pastor category views likes date').lean();

const topSermonsByViewsYear = await Sermon.find({ date: { $gte: periods.year } })
  .sort({ views: -1 }).limit(10)
  .select('title pastor category views likes date').lean();

const topSermonsByLikesWeek = await Sermon.find({ date: { $gte: periods.week } })
  .sort({ likes: -1 }).limit(10)
  .select('title pastor category views likes date').lean();

const topSermonsByLikesMonth = await Sermon.find({ date: { $gte: periods.month } })
  .sort({ likes: -1 }).limit(10)
  .select('title pastor category views likes date').lean();

const topSermonsByLikesYear = await Sermon.find({ date: { $gte: periods.year } })
  .sort({ likes: -1 }).limit(10)
  .select('title pastor category views likes date').lean();

// ========== BLOG ENGAGEMENT ==========
const topBlogsByLikes = await Blog.find({ approved: true })
  .sort({ 'likes': -1 })
  .limit(10)
  .select('title author category likes views createdAt')
  .lean();

// Category performance
const sermonCategoryPerformance = await Sermon.aggregate([
  {
    $group: {
      _id: '$category',
      totalViews: { $sum: '$views' },
      totalLikes: { $sum: '$likes' },
      count: { $sum: 1 },
      avgViews: { $avg: '$views' },
      avgLikes: { $avg: '$likes' }
    }
  },
  { $sort: { totalViews: -1 } }
]);

    res.json({
      success: true,
      data: {
        sermons: {
          total: totalSermons,
          byCategory: sermonsByCategory,
          byType: sermonsByType,
          totalLikes: sermonLikesViews[0]?.totalLikes || 0,
          totalViews: sermonLikesViews[0]?.totalViews || 0,
          recentTrend: sermonTrend,
          topByViews: topSermonsByViews,
          topByLikes: topSermonsByLikes,
          topByViewsWeek: topSermonsByViewsWeek,
          topByViewsMonth: topSermonsByViewsMonth,
          topByViewsYear: topSermonsByViewsYear,
          topByLikesWeek: topSermonsByLikesWeek,
          topByLikesMonth: topSermonsByLikesMonth,
          topByLikesYear: topSermonsByLikesYear,
          categoryPerformance: sermonCategoryPerformance

        },
        blogs: {
          total: totalBlogs,
          approved: approvedBlogs,
          pending: pendingBlogs,
          byCategory: blogsByCategory,
          totalLikes: blogLikes[0]?.totalLikes || 0,
          recentTrend: blogTrend,
           topByLikes: topBlogsByLikes
        },
        gallery: {
          total: totalGallery,
          byCategory: galleryByCategory,
          totalLikes: galleryLikes[0]?.totalLikes || 0,
          recentTrend: galleryTrend,
          topByLikes: topGalleryByLikes
        },
        events: {
          total: totalEvents,
          upcoming: upcomingEvents,
          past: pastEvents,
          totalRegistrations: eventRegistrations[0]?.totalRegistrations || 0,
          memberRegistrations: eventRegistrations[0]?.memberRegistrations || 0,
          visitorRegistrations: eventRegistrations[0]?.visitorRegistrations || 0,
          recentTrend: eventTrend,
          topByRegistrations: topEventsByRegistrations
        }
      }
    });
  } catch (error) {
    console.error('[Analytics] Content analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch content analytics'
    });
  }
};

/**
 * Get Engagement Analytics
 * @route GET /api/analytics/engagement
 * @access Private (Admin)
 */
exports.getEngagementAnalytics = async (req, res) => {
  try {
    // ✅ CRITICAL: Permission check
if (!hasAnalyticsPermission(req.user)) {
  return res.status(403).json({
    success: false,
    message: 'Access denied: Insufficient permissions',
    requiredPermissions: ['view:analytics'],
    userPermissions: req.user?.role?.permissions || [],
    userRole: req.user?.role?.name || 'none'
  });
}
    // ========== FEEDBACK ==========
    const totalFeedback = await Feedback.countDocuments({ isDeleted: false });

    const feedbackByCategory = await Feedback.aggregate([
      { $match: { isDeleted: false } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    const feedbackByStatus = await Feedback.aggregate([
      { $match: { isDeleted: false } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    const anonymousFeedback = await Feedback.countDocuments({
      isDeleted: false,
      isAnonymous: true
    });

    // Average response time (in hours)
    const responseTimeData = await Feedback.aggregate([
      {
        $match: {
          isDeleted: false,
          respondedAt: { $exists: true },
          submittedAt: { $exists: true }
        }
      },
      {
        $project: {
          responseTime: {
            $divide: [
              { $subtract: ['$respondedAt', '$submittedAt'] },
              1000 * 60 * 60 // Convert to hours
            ]
          }
        }
      },
      {
        $group: {
          _id: null,
          avgResponseTime: { $avg: '$responseTime' }
        }
      }
    ]);

    // ========== VOLUNTEERS ==========
    const totalVolunteers = await Volunteer.countDocuments();

    const volunteersByStatus = await Volunteer.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    const volunteersByMinistry = await Volunteer.aggregate([
      { $group: { _id: '$ministry', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    const totalHours = await Volunteer.aggregate([
      {
        $group: {
          _id: null,
          totalHours: { $sum: '$hours' }
        }
      }
    ]);

    // ========== LIVESTREAMS ==========
    const totalLivestreams = await Livestream.countDocuments();

    const livestreamsByStatus = await Livestream.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    const livestreamStats = await Livestream.aggregate([
      {
        $group: {
          _id: null,
          totalViews: { $sum: '$viewCount' },
          avgDuration: { $avg: '$duration' }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        feedback: {
          total: totalFeedback,
          byCategory: feedbackByCategory,
          byStatus: feedbackByStatus,
          anonymous: anonymousFeedback,
          avgResponseTime: Math.round(responseTimeData[0]?.avgResponseTime || 0)
        },
        volunteers: {
          total: totalVolunteers,
          byStatus: volunteersByStatus,
          byMinistry: volunteersByMinistry,
          totalHours: totalHours[0]?.totalHours || 0
        },
        livestreams: {
          total: totalLivestreams,
          byStatus: livestreamsByStatus,
          totalViews: livestreamStats[0]?.totalViews || 0,
          avgDuration: Math.round(livestreamStats[0]?.avgDuration || 0)
        }
      }
    });
  } catch (error) {
    console.error('[Analytics] Engagement analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch engagement analytics'
    });
  }
};

/**
 * Get Financial Analytics
 * @route GET /api/analytics/financial
 * @access Private (Admin)
 */
exports.getFinancialAnalytics = async (req, res) => {
  try {
    if (!hasAnalyticsPermission(req.user)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: Insufficient permissions',
        requiredPermissions: ['view:analytics'],
        userPermissions: req.user?.role?.permissions || [],
        userRole: req.user?.role?.name || 'none'
      });
    }

    // ========== CAMPAIGNS (MongoDB) ==========
    const totalCampaigns = await Campaign.countDocuments();
    const activeCampaigns = await Campaign.countDocuments({ status: 'active' });
    const completedCampaigns = await Campaign.countDocuments({ status: 'completed' });

    const campaignsByType = await Campaign.aggregate([
      { $group: { _id: '$campaignType', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    const campaignFinancials = await Campaign.aggregate([
      {
        $group: {
          _id: null,
          totalGoal: { $sum: '$goalAmount' },
          totalRaised: { $sum: '$currentAmount' }
        }
      }
    ]);

    const completionRate = campaignFinancials[0]?.totalGoal > 0
      ? Math.round((campaignFinancials[0]?.totalRaised / campaignFinancials[0]?.totalGoal) * 100)
      : 0;

    // ========== PLEDGES (Supabase) ==========
    const { count: totalPledges } = await supabase
      .from('pledges')
      .select('*', { count: 'exact', head: true });

    const { data: pledgeAmountData } = await supabase
      .from('pledges')
      .select('pledged_amount, status');

    const totalPledgeAmount = pledgeAmountData?.reduce((sum, p) => sum + (p.pledged_amount || 0), 0) || 0;

    // Group by status
    const pledgeStatusMap = {};
    pledgeAmountData?.forEach(p => {
      pledgeStatusMap[p.status] = (pledgeStatusMap[p.status] || 0) + 1;
    });
    const pledgesByStatus = Object.entries(pledgeStatusMap).map(([_id, count]) => ({ _id, count }));

    const fulfilledPledges = pledgeStatusMap['fulfilled'] || pledgeStatusMap['completed'] || 0;
    const fulfillmentRate = totalPledges > 0
      ? Math.round((fulfilledPledges / totalPledges) * 100)
      : 0;

    // ========== PAYMENTS (Supabase) ==========
    const { count: totalPayments } = await supabase
      .from('payments')
      .select('*', { count: 'exact', head: true });

    const { data: paymentData } = await supabase
      .from('payments')
      .select('amount, payment_method, status, created_at');

    const totalPaymentAmount = paymentData?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;

    // Group by payment method
    const methodMap = {};
    paymentData?.forEach(p => {
      methodMap[p.payment_method] = (methodMap[p.payment_method] || 0) + 1;
    });
    const paymentsByMethod = Object.entries(methodMap).map(([_id, count]) => ({ _id, count }));

    const successfulPayments = paymentData?.filter(p => p.status === 'success').length || 0;
    const successRate = totalPayments > 0
      ? Math.round((successfulPayments / totalPayments) * 100)
      : 0;

    // Monthly payment trend (last 12 months)
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

    const { data: trendData } = await supabase
      .from('payments')
      .select('amount, created_at')
      .gte('created_at', twelveMonthsAgo.toISOString());

    const trendMap = {};
    trendData?.forEach(p => {
      const date = new Date(p.created_at);
      const key = `${date.getFullYear()}-${date.getMonth() + 1}`;
      if (!trendMap[key]) {
        trendMap[key] = { 
          _id: { year: date.getFullYear(), month: date.getMonth() + 1 }, 
          count: 0, 
          totalAmount: 0 
        };
      }
      trendMap[key].count += 1;
      trendMap[key].totalAmount += p.amount || 0;
    });

    const monthlyTrend = Object.values(trendMap)
      .sort((a, b) => a._id.year - b._id.year || a._id.month - b._id.month);

    res.json({
      success: true,
      data: {
        campaigns: {
          total: totalCampaigns,
          active: activeCampaigns,
          completed: completedCampaigns,
          byType: campaignsByType,
          totalGoal: campaignFinancials[0]?.totalGoal || 0,
          totalRaised: campaignFinancials[0]?.totalRaised || 0,
          completionRate
        },
        pledges: {
          total: totalPledges || 0,
          totalAmount: totalPledgeAmount,
          byStatus: pledgesByStatus,
          fulfillmentRate
        },
        payments: {
          total: totalPayments || 0,
          totalAmount: totalPaymentAmount,
          byMethod: paymentsByMethod,
          successRate,
          monthlyTrend
        }
      }
    });
  } catch (error) {
    console.error('[Analytics] Financial analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch financial analytics'
    });
  }
};

/**
 * Get Communication Analytics
 * @route GET /api/analytics/communication
 * @access Private (Admin)
 */
exports.getCommunicationAnalytics = async (req, res) => {
  try {
    // ✅ CRITICAL: Permission check
if (!hasAnalyticsPermission(req.user)) {
  return res.status(403).json({
    success: false,
    message: 'Access denied: Insufficient permissions',
    requiredPermissions: ['view:analytics'],
    userPermissions: req.user?.role?.permissions || [],
    userRole: req.user?.role?.name || 'none'
  });
}
    // ========== EMAIL LOGS ==========
    const totalEmails = await EmailLog.countDocuments();

    const emailsByType = await EmailLog.aggregate([
      { $group: { _id: '$type', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    const emailStats = await EmailLog.aggregate([
      {
        $group: {
          _id: null,
          totalSent: { $sum: '$totalRecipients' },
          totalSuccess: { $sum: '$successCount' }
        }
      }
    ]);

    const successRate = emailStats[0]?.totalSent > 0
      ? Math.round((emailStats[0]?.totalSuccess / emailStats[0]?.totalSent) * 100)
      : 0;

    // ========== ANNOUNCEMENTS ==========
    const totalAnnouncements = await Announcement.countDocuments();
    const activeAnnouncements = await Announcement.countDocuments({
      isActive: true,
      $or: [
        { expiresAt: null },
        { expiresAt: { $gt: new Date() } }
      ]
    });

    const announcementsByPriority = await Announcement.aggregate([
      { $group: { _id: '$priority', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    const readRateData = await Announcement.aggregate([
      {
        $project: {
          totalViews: '$statistics.totalViews',
          totalReads: '$statistics.totalReads'
        }
      },
      {
        $group: {
          _id: null,
          avgViews: { $avg: '$totalViews' },
          avgReads: { $avg: '$totalReads' }
        }
      }
    ]);

    const avgReadRate = readRateData[0]?.avgViews > 0
      ? Math.round((readRateData[0]?.avgReads / readRateData[0]?.avgViews) * 100)
      : 0;

    res.json({
      success: true,
      data: {
        emails: {
          totalSent: emailStats[0]?.totalSent || 0,
          successRate,
          byType: emailsByType
        },
        announcements: {
          total: totalAnnouncements,
          active: activeAnnouncements,
          byPriority: announcementsByPriority,
          avgReadRate
        }
      }
    });
  } catch (error) {
    console.error('[Analytics] Communication analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch communication analytics'
    });
  }
};

/**
 * Get System Analytics
 * @route GET /api/analytics/system
 * @access Private (Admin)
 */
exports.getSystemAnalytics = async (req, res) => {
  try {
    // ✅ CRITICAL: Permission check
if (!hasAnalyticsPermission(req.user)) {
  return res.status(403).json({
    success: false,
    message: 'Access denied: Insufficient permissions',
    requiredPermissions: ['view:analytics'],
    userPermissions: req.user?.role?.permissions || [],
    userRole: req.user?.role?.name || 'none'
  });
}
    // ========== AUDIT LOGS ==========
    const auditStats = await AuditLog.getStats();

    // Recent activity (last 50)
    const recentActivity = await AuditLog.find()
      .sort({ timestamp: -1 })
      .limit(50)
      .select('action userName userEmail timestamp success statusCode endpoint')
      .lean();

    // Failed login attempts
    const failedLogins = await AuditLog.countDocuments({
      action: 'auth.login.failed',
      timestamp: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
    });

    // ========== BANNED USERS ==========
    const bannedUsers = await BannedUser.countDocuments({ isActive: true });

    res.json({
      success: true,
      data: {
        auditLogs: {
          totalActions: auditStats.totalActions,
          successRate: parseFloat(auditStats.successRate),
          topActions: auditStats.topActions,
          failedLogins
        },
        bannedUsers,
        recentActivity
      }
    });
  } catch (error) {
    console.error('[Analytics] System analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch system analytics'
    });
  }
};