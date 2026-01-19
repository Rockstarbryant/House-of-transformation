// server/controllers/emailNotificationController.js
const User = require('../models/User');
const Role = require('../models/Role');
const EmailLog = require('../models/EmailLog');
const EmailTemplate = require('../models/EmailTemplate');
const ReceivedEmail = require('../models/ReceivedEmail');
const emailService = require('../services/emailService');
const asyncHandler = require('../middleware/asyncHandler');

// ============================================
// USER MANAGEMENT
// ============================================

// @desc    Get all users for email selection
// @route   GET /api/email-notifications/users
// @access  Private/Admin
exports.getUsers = asyncHandler(async (req, res) => {
  try {
    console.log('[EMAIL-NOTIFICATION] Fetching users for email selection');

    const users = await User.find()
      .select('name email role')
      .populate('role', 'name')
      .sort({ name: 1 });

    res.json({
      success: true,
      count: users.length,
      users
    });

  } catch (error) {
    console.error('[EMAIL-NOTIFICATION] Error fetching users:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch users',
      error: error.message
    });
  }
});

// @desc    Get all roles for filtering
// @route   GET /api/email-notifications/roles
// @access  Private/Admin
exports.getRoles = asyncHandler(async (req, res) => {
  try {
    console.log('[EMAIL-NOTIFICATION] Fetching roles');

    const roles = await Role.find().select('name description');

    res.json({
      success: true,
      count: roles.length,
      roles
    });

  } catch (error) {
    console.error('[EMAIL-NOTIFICATION] Error fetching roles:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch roles',
      error: error.message
    });
  }
});

// @desc    Get users by role
// @route   GET /api/email-notifications/users/role/:roleId
// @access  Private/Admin
exports.getUsersByRole = asyncHandler(async (req, res) => {
  try {
    const { roleId } = req.params;

    console.log('[EMAIL-NOTIFICATION] Fetching users for role:', roleId);

    const users = await User.find({ role: roleId })
      .select('name email role')
      .populate('role', 'name')
      .sort({ name: 1 });

    res.json({
      success: true,
      count: users.length,
      users
    });

  } catch (error) {
    console.error('[EMAIL-NOTIFICATION] Error fetching users by role:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch users by role',
      error: error.message
    });
  }
});

// ============================================
// EMAIL SENDING
// ============================================

// @desc    Send email to single user
// @route   POST /api/email-notifications/send-single
// @access  Private/Admin
exports.sendSingleEmail = asyncHandler(async (req, res) => {
  try {
    const { userId, subject, message, scheduledFor } = req.body;

    if (!userId || !subject || !message) {
      return res.status(400).json({
        success: false,
        message: 'userId, subject, and message are required'
      });
    }

    console.log('[EMAIL-NOTIFICATION] Sending single email to user:', userId);

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Create email log
    const emailLog = await EmailLog.create({
      sentBy: req.user._id,
      recipients: [{
        userId: user._id,
        email: user.email,
        name: user.name,
        status: 'pending'
      }],
      subject,
      message,
      type: 'single',
      totalRecipients: 1,
      status: scheduledFor ? 'scheduled' : 'sending',
      scheduledFor: scheduledFor || null
    });

    // If scheduled, don't send now
    if (scheduledFor) {
      return res.json({
        success: true,
        message: `Email scheduled for ${new Date(scheduledFor).toLocaleString()}`,
        emailLog
      });
    }

    // Send email immediately
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #8B1A1A;">House of Transformation</h2>
        <div style="margin: 20px 0;">
          ${message.replace(/\n/g, '<br>')}
        </div>
        <hr style="border: 1px solid #eee; margin: 20px 0;">
        <p style="color: #666; font-size: 12px;">
          Sent from House of Transformation Church Admin Portal
        </p>
      </div>
    `;

    const result = await emailService.sendEmail({
      to: user.email,
      subject: subject,
      text: message,
      html: htmlContent
    });

    // Update email log
    emailLog.recipients[0].status = result.success ? 'success' : 'failed';
    emailLog.recipients[0].error = result.error || null;
    emailLog.recipients[0].deliveredAt = result.success ? new Date() : null;
    emailLog.successCount = result.success ? 1 : 0;
    emailLog.failedCount = result.success ? 0 : 1;
    emailLog.status = result.success ? 'sent' : 'failed';
    emailLog.sentAt = new Date();
    emailLog.htmlContent = htmlContent;
    await emailLog.save();

    if (result.success) {
      console.log('[EMAIL-NOTIFICATION] ✅ Email sent successfully');
      res.json({
        success: true,
        message: `Email sent to ${user.name} (${user.email})`,
        emailLog
      });
    } else {
      console.error('[EMAIL-NOTIFICATION] ❌ Email sending failed');
      res.status(500).json({
        success: false,
        message: 'Failed to send email',
        error: result.error,
        emailLog
      });
    }

  } catch (error) {
    console.error('[EMAIL-NOTIFICATION] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send email',
      error: error.message
    });
  }
});

// @desc    Send bulk emails
// @route   POST /api/email-notifications/send-bulk
// @access  Private/Admin
exports.sendBulkEmails = asyncHandler(async (req, res) => {
  try {
    const { userIds, subject, message, scheduledFor } = req.body;

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'userIds array is required and must not be empty'
      });
    }

    if (!subject || !message) {
      return res.status(400).json({
        success: false,
        message: 'subject and message are required'
      });
    }

    console.log('[EMAIL-NOTIFICATION] Sending bulk emails to', userIds.length, 'users');

    const users = await User.find({ _id: { $in: userIds } });

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No users found'
      });
    }

    // Create email log
    const recipients = users.map(user => ({
      userId: user._id,
      email: user.email,
      name: user.name,
      status: 'pending'
    }));

    const emailLog = await EmailLog.create({
      sentBy: req.user._id,
      recipients,
      subject,
      message,
      type: 'bulk',
      totalRecipients: users.length,
      status: scheduledFor ? 'scheduled' : 'sending',
      scheduledFor: scheduledFor || null
    });

    // If scheduled, don't send now
    if (scheduledFor) {
      return res.json({
        success: true,
        message: `Bulk email scheduled for ${new Date(scheduledFor).toLocaleString()}`,
        emailLog
      });
    }

    // Send emails immediately
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #8B1A1A;">House of Transformation</h2>
        <div style="margin: 20px 0;">
          ${message.replace(/\n/g, '<br>')}
        </div>
        <hr style="border: 1px solid #eee; margin: 20px 0;">
        <p style="color: #666; font-size: 12px;">
          Sent from House of Transformation Church Admin Portal
        </p>
      </div>
    `;

    let successCount = 0;
    let failedCount = 0;

    for (let i = 0; i < users.length; i++) {
      const user = users[i];
      
      const result = await emailService.sendEmail({
        to: user.email,
        subject: subject,
        text: message,
        html: htmlContent
      });

      emailLog.recipients[i].status = result.success ? 'success' : 'failed';
      emailLog.recipients[i].error = result.error || null;
      emailLog.recipients[i].deliveredAt = result.success ? new Date() : null;

      if (result.success) {
        successCount++;
      } else {
        failedCount++;
      }
    }

    emailLog.successCount = successCount;
    emailLog.failedCount = failedCount;
    emailLog.status = 'sent';
    emailLog.sentAt = new Date();
    emailLog.htmlContent = htmlContent;
    await emailLog.save();

    console.log('[EMAIL-NOTIFICATION] ✅ Bulk email completed');

    res.json({
      success: true,
      message: `Sent ${successCount} emails successfully, ${failedCount} failed`,
      emailLog
    });

  } catch (error) {
    console.error('[EMAIL-NOTIFICATION] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send bulk emails',
      error: error.message
    });
  }
});

// @desc    Send email to all users
// @route   POST /api/email-notifications/send-all
// @access  Private/Admin
exports.sendToAllUsers = asyncHandler(async (req, res) => {
  try {
    const { subject, message, scheduledFor } = req.body;

    if (!subject || !message) {
      return res.status(400).json({
        success: false,
        message: 'subject and message are required'
      });
    }

    console.log('[EMAIL-NOTIFICATION] Sending emails to all users');

    const users = await User.find();

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No users found'
      });
    }

    const recipients = users.map(user => ({
      userId: user._id,
      email: user.email,
      name: user.name,
      status: 'pending'
    }));

    const emailLog = await EmailLog.create({
      sentBy: req.user._id,
      recipients,
      subject,
      message,
      type: 'all',
      totalRecipients: users.length,
      status: scheduledFor ? 'scheduled' : 'sending',
      scheduledFor: scheduledFor || null
    });

    if (scheduledFor) {
      return res.json({
        success: true,
        message: `Email to all users scheduled for ${new Date(scheduledFor).toLocaleString()}`,
        emailLog
      });
    }

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #8B1A1A;">House of Transformation</h2>
        <div style="margin: 20px 0;">
          ${message.replace(/\n/g, '<br>')}
        </div>
        <hr style="border: 1px solid #eee; margin: 20px 0;">
        <p style="color: #666; font-size: 12px;">
          Sent from House of Transformation Church Admin Portal
        </p>
      </div>
    `;

    let successCount = 0;
    let failedCount = 0;

    for (let i = 0; i < users.length; i++) {
      const user = users[i];
      
      const result = await emailService.sendEmail({
        to: user.email,
        subject: subject,
        text: message,
        html: htmlContent
      });

      emailLog.recipients[i].status = result.success ? 'success' : 'failed';
      emailLog.recipients[i].error = result.error || null;
      emailLog.recipients[i].deliveredAt = result.success ? new Date() : null;

      if (result.success) {
        successCount++;
      } else {
        failedCount++;
      }
    }

    emailLog.successCount = successCount;
    emailLog.failedCount = failedCount;
    emailLog.status = 'sent';
    emailLog.sentAt = new Date();
    emailLog.htmlContent = htmlContent;
    await emailLog.save();

    console.log('[EMAIL-NOTIFICATION] ✅ Send to all completed');

    res.json({
      success: true,
      message: `Sent ${successCount} emails successfully, ${failedCount} failed`,
      emailLog
    });

  } catch (error) {
    console.error('[EMAIL-NOTIFICATION] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send emails to all users',
      error: error.message
    });
  }
});

// @desc    Send email to users by role
// @route   POST /api/email-notifications/send-by-role
// @access  Private/Admin
exports.sendByRole = asyncHandler(async (req, res) => {
  try {
    const { roleId, subject, message, scheduledFor } = req.body;

    if (!roleId || !subject || !message) {
      return res.status(400).json({
        success: false,
        message: 'roleId, subject, and message are required'
      });
    }

    console.log('[EMAIL-NOTIFICATION] Sending emails to role:', roleId);

    const role = await Role.findById(roleId);
    if (!role) {
      return res.status(404).json({
        success: false,
        message: 'Role not found'
      });
    }

    const users = await User.find({ role: roleId });

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No users found with this role'
      });
    }

    const recipients = users.map(user => ({
      userId: user._id,
      email: user.email,
      name: user.name,
      status: 'pending'
    }));

    const emailLog = await EmailLog.create({
      sentBy: req.user._id,
      recipients,
      subject,
      message,
      type: 'role-based',
      targetRole: role.name,
      totalRecipients: users.length,
      status: scheduledFor ? 'scheduled' : 'sending',
      scheduledFor: scheduledFor || null
    });

    if (scheduledFor) {
      return res.json({
        success: true,
        message: `Email to ${role.name} role scheduled for ${new Date(scheduledFor).toLocaleString()}`,
        emailLog
      });
    }

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #8B1A1A;">House of Transformation</h2>
        <div style="margin: 20px 0;">
          ${message.replace(/\n/g, '<br>')}
        </div>
        <hr style="border: 1px solid #eee; margin: 20px 0;">
        <p style="color: #666; font-size: 12px;">
          Sent from House of Transformation Church Admin Portal
        </p>
      </div>
    `;

    let successCount = 0;
    let failedCount = 0;

    for (let i = 0; i < users.length; i++) {
      const user = users[i];
      
      const result = await emailService.sendEmail({
        to: user.email,
        subject: subject,
        text: message,
        html: htmlContent
      });

      emailLog.recipients[i].status = result.success ? 'success' : 'failed';
      emailLog.recipients[i].error = result.error || null;
      emailLog.recipients[i].deliveredAt = result.success ? new Date() : null;

      if (result.success) {
        successCount++;
      } else {
        failedCount++;
      }
    }

    emailLog.successCount = successCount;
    emailLog.failedCount = failedCount;
    emailLog.status = 'sent';
    emailLog.sentAt = new Date();
    emailLog.htmlContent = htmlContent;
    await emailLog.save();

    console.log('[EMAIL-NOTIFICATION] ✅ Role-based email completed');

    res.json({
      success: true,
      message: `Sent ${successCount} emails to ${role.name}, ${failedCount} failed`,
      emailLog
    });

  } catch (error) {
    console.error('[EMAIL-NOTIFICATION] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send role-based emails',
      error: error.message
    });
  }
});

// ============================================
// EMAIL HISTORY/LOGS
// ============================================

// @desc    Get email history
// @route   GET /api/email-notifications/history
// @access  Private/Admin
exports.getEmailHistory = asyncHandler(async (req, res) => {
  try {
    const { page = 1, limit = 20, status, type } = req.query;

    console.log('[EMAIL-NOTIFICATION] Fetching email history');

    const query = {};
    if (status) query.status = status;
    if (type) query.type = type;

    const emailLogs = await EmailLog.find(query)
      .populate('sentBy', 'name email')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const count = await EmailLog.countDocuments(query);

    res.json({
      success: true,
      emailLogs,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      total: count
    });

  } catch (error) {
    console.error('[EMAIL-NOTIFICATION] Error fetching history:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch email history',
      error: error.message
    });
  }
});

// @desc    Get single email log details
// @route   GET /api/email-notifications/history/:id
// @access  Private/Admin
exports.getEmailLogDetails = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;

    const emailLog = await EmailLog.findById(id)
      .populate('sentBy', 'name email')
      .populate('recipients.userId', 'name email');

    if (!emailLog) {
      return res.status(404).json({
        success: false,
        message: 'Email log not found'
      });
    }

    res.json({
      success: true,
      emailLog
    });

  } catch (error) {
    console.error('[EMAIL-NOTIFICATION] Error fetching email log:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch email log',
      error: error.message
    });
  }
});

// @desc    Get email statistics
// @route   GET /api/email-notifications/statistics
// @access  Private/Admin
exports.getEmailStatistics = asyncHandler(async (req, res) => {
  try {
    console.log('[EMAIL-NOTIFICATION] Fetching email statistics');

    const totalSent = await EmailLog.countDocuments({ status: 'sent' });
    const totalScheduled = await EmailLog.countDocuments({ status: 'scheduled' });
    const totalFailed = await EmailLog.countDocuments({ status: 'failed' });
    const totalDrafts = await EmailLog.countDocuments({ status: 'draft' });

    const successfulEmails = await EmailLog.aggregate([
      { $match: { status: 'sent' } },
      { $group: { _id: null, total: { $sum: '$successCount' } } }
    ]);

    const failedEmails = await EmailLog.aggregate([
      { $match: { status: 'sent' } },
      { $group: { _id: null, total: { $sum: '$failedCount' } } }
    ]);

    const recentActivity = await EmailLog.find({ status: 'sent' })
      .populate('sentBy', 'name')
      .sort({ sentAt: -1 })
      .limit(5)
      .select('subject type totalRecipients successCount sentAt');

    res.json({
      success: true,
      statistics: {
        totalSent,
        totalScheduled,
        totalFailed,
        totalDrafts,
        successfulEmails: successfulEmails[0]?.total || 0,
        failedEmails: failedEmails[0]?.total || 0,
        recentActivity
      }
    });

  } catch (error) {
    console.error('[EMAIL-NOTIFICATION] Error fetching statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch statistics',
      error: error.message
    });
  }
});

// ============================================
// EMAIL TEMPLATES
// ============================================

// @desc    Get all email templates
// @route   GET /api/email-notifications/templates
// @access  Private/Admin
exports.getTemplates = asyncHandler(async (req, res) => {
  try {
    const { category } = req.query;

    console.log('[EMAIL-NOTIFICATION] Fetching templates');

    const query = { isActive: true };
    if (category) query.category = category;

    const templates = await EmailTemplate.find(query)
      .populate('createdBy', 'name')
      .sort({ usageCount: -1, createdAt: -1 });

    res.json({
      success: true,
      count: templates.length,
      templates
    });

  } catch (error) {
    console.error('[EMAIL-NOTIFICATION] Error fetching templates:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch templates',
      error: error.message
    });
  }
});

// @desc    Create email template
// @route   POST /api/email-notifications/templates
// @access  Private/Admin
exports.createTemplate = asyncHandler(async (req, res) => {
  try {
    const { name, description, subject, message, category } = req.body;

    if (!name || !subject || !message) {
      return res.status(400).json({
        success: false,
        message: 'name, subject, and message are required'
      });
    }

    console.log('[EMAIL-NOTIFICATION] Creating template:', name);

    const template = await EmailTemplate.create({
      name,
      description,
      subject,
      message,
      category,
      createdBy: req.user._id
    });

    res.status(201).json({
      success: true,
      message: 'Template created successfully',
      template
    });

  } catch (error) {
    console.error('[EMAIL-NOTIFICATION] Error creating template:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create template',
      error: error.message
    });
  }
});

// @desc    Update email template
// @route   PUT /api/email-notifications/templates/:id
// @access  Private/Admin
exports.updateTemplate = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, subject, message, category, isActive } = req.body;

    const template = await EmailTemplate.findById(id);

    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Template not found'
      });
    }

    if (name !== undefined) template.name = name;
    if (description !== undefined) template.description = description;
    if (subject !== undefined) template.subject = subject;
    if (message !== undefined) template.message = message;
    if (category !== undefined) template.category = category;
    if (isActive !== undefined) template.isActive = isActive;

    await template.save();

    res.json({
      success: true,
      message: 'Template updated successfully',
      template
    });

  } catch (error) {
    console.error('[EMAIL-NOTIFICATION] Error updating template:', error);
    res.status(500).json({success: false,
message: 'Failed to update template',
error: error.message
});
}
});
// @desc    Delete email template
// @route   DELETE /api/email-notifications/templates/:id
// @access  Private/Admin
exports.deleteTemplate = asyncHandler(async (req, res) => {
try {
const { id } = req.params;
const template = await EmailTemplate.findByIdAndDelete(id);

if (!template) {
  return res.status(404).json({
    success: false,
    message: 'Template not found'
  });
}

res.json({
  success: true,
  message: 'Template deleted successfully'
});
} catch (error) {
console.error('[EMAIL-NOTIFICATION] Error deleting template:', error);
res.status(500).json({
success: false,
message: 'Failed to delete template',
error: error.message
});
}
});
// ============================================
// DRAFTS
// ============================================
// @desc    Save email as draft
// @route   POST /api/email-notifications/drafts
// @access  Private/Admin
exports.saveDraft = asyncHandler(async (req, res) => {
try {
const { subject, message, recipients, type, targetRole } = req.body;
console.log('[EMAIL-NOTIFICATION] Saving draft');

const draft = await EmailLog.create({
  sentBy: req.user._id,
  subject: subject || 'Untitled Draft',
  message: message || '',
  recipients: recipients || [],
  type: type || 'single',
  targetRole,
  status: 'draft',
  totalRecipients: recipients?.length || 0
});

res.status(201).json({
  success: true,
  message: 'Draft saved successfully',
  draft
});
} catch (error) {
console.error('[EMAIL-NOTIFICATION] Error saving draft:', error);
res.status(500).json({
success: false,
message: 'Failed to save draft',
error: error.message
});
}
});
// @desc    Get all drafts
// @route   GET /api/email-notifications/drafts
// @access  Private/Admin
exports.getDrafts = asyncHandler(async (req, res) => {
try {
console.log('[EMAIL-NOTIFICATION] Fetching drafts');
const drafts = await EmailLog.find({ 
  status: 'draft',
  sentBy: req.user._id
})
  .sort({ updatedAt: -1 });

res.json({
  success: true,
  count: drafts.length,
  drafts
});
} catch (error) {
console.error('[EMAIL-NOTIFICATION] Error fetching drafts:', error);
res.status(500).json({
success: false,
message: 'Failed to fetch drafts',
error: error.message
});
}
});
// @desc    Delete draft
// @route   DELETE /api/email-notifications/drafts/:id
// @access  Private/Admin
exports.deleteDraft = asyncHandler(async (req, res) => {
try {
const { id } = req.params;
const draft = await EmailLog.findOneAndDelete({
  _id: id,
  status: 'draft',
  sentBy: req.user._id
});

if (!draft) {
  return res.status(404).json({
    success: false,
    message: 'Draft not found'
  });
}

res.json({
  success: true,
  message: 'Draft deleted successfully'
});
} catch (error) {
console.error('[EMAIL-NOTIFICATION] Error deleting draft:', error);
res.status(500).json({
success: false,
message: 'Failed to delete draft',
error: error.message
});
}
});
// ============================================
// RECEIVED EMAILS (INBOX)
// ============================================
// @desc    Get received emails (inbox)
// @route   GET /api/email-notifications/inbox
// @access  Private/Admin
exports.getInbox = asyncHandler(async (req, res) => {
try {
const { page = 1, limit = 20, status, category } = req.query;
console.log('[EMAIL-NOTIFICATION] Fetching inbox');

const query = {};
if (status) query.status = status;
if (category) query.category = category;

const emails = await ReceivedEmail.find(query)
  .populate('assignedTo', 'name email')
  .populate('repliedBy', 'name email')
  .sort({ createdAt: -1 })
  .limit(limit * 1)
  .skip((page - 1) * limit);

const count = await ReceivedEmail.countDocuments(query);
const unreadCount = await ReceivedEmail.countDocuments({ status: 'unread' });

res.json({
  success: true,
  emails,
  totalPages: Math.ceil(count / limit),
  currentPage: page,
  total: count,
  unreadCount
});
} catch (error) {
console.error('[EMAIL-NOTIFICATION] Error fetching inbox:', error);
res.status(500).json({
success: false,
message: 'Failed to fetch inbox',
error: error.message
});
}
});
// @desc    Create received email (manual entry)
// @route   POST /api/email-notifications/inbox
// @access  Private/Admin
exports.createReceivedEmail = asyncHandler(async (req, res) => {
try {
const { fromEmail, fromName, subject, message, category, priority } = req.body;
if (!fromEmail || !subject || !message) {
  return res.status(400).json({
    success: false,
    message: 'fromEmail, subject, and message are required'
  });
}

const email = await ReceivedEmail.create({
  from: {
    email: fromEmail,
    name: fromName
  },
  subject,
  message,
  category,
  priority: priority || 'medium'
});

res.status(201).json({
  success: true,
  message: 'Email added to inbox',
  email
});
} catch (error) {
console.error('[EMAIL-NOTIFICATION] Error creating received email:', error);
res.status(500).json({
success: false,
message: 'Failed to add email to inbox',
error: error.message
});
}
});
// @desc    Update received email status
// @route   PATCH /api/email-notifications/inbox/:id
// @access  Private/Admin
exports.updateReceivedEmail = asyncHandler(async (req, res) => {
try {
const { id } = req.params;
const { status, assignedTo, replyMessage, priority, internalNotes } = req.body;
const email = await ReceivedEmail.findById(id);

if (!email) {
  return res.status(404).json({
    success: false,
    message: 'Email not found'
  });
}

if (status !== undefined) email.status = status;
if (assignedTo !== undefined) email.assignedTo = assignedTo;
if (priority !== undefined) email.priority = priority;
if (internalNotes !== undefined) email.internalNotes = internalNotes;

if (replyMessage) {
  email.replyMessage = replyMessage;
  email.repliedBy = req.user._id;
  email.repliedAt = new Date();
  email.status = 'replied';
}

await email.save();

res.json({
  success: true,
  message: 'Email updated successfully',
  email
});
} catch (error) {
console.error('[EMAIL-NOTIFICATION] Error updating received email:', error);
res.status(500).json({
success: false,
message: 'Failed to update email',
error: error.message
});
}
});
// @desc    Delete received email
// @route   DELETE /api/email-notifications/inbox/:id
// @access  Private/Admin
exports.deleteReceivedEmail = asyncHandler(async (req, res) => {
try {
const { id } = req.params;
const email = await ReceivedEmail.findByIdAndDelete(id);

if (!email) {
  return res.status(404).json({
    success: false,
    message: 'Email not found'
  });
}

res.json({
  success: true,
  message: 'Email deleted successfully'
});
} catch (error) {
console.error('[EMAIL-NOTIFICATION] Error deleting received email:', error);
res.status(500).json({
success: false,
message: 'Failed to delete email',
error: error.message
});
}
});