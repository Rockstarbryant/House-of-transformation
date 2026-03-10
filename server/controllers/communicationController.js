// server/controllers/communicationController.js
const User          = require('../models/User');
const Role          = require('../models/Role');
const Communication = require('../models/Communication');
const EmailTemplate = require('../models/EmailTemplate');
const asyncHandler  = require('../middleware/asyncHandler');
const { addCommunicationJob, scheduleJob } = require('../queues/communicationQueue');

// ── Permission helper ────────────────────────────────────────────────────────
const canSend = (req) => {
  const role = req.user?.role;
  return (
    role?.name === 'admin' ||
    role?.permissions?.includes('manage:emails') ||
    role?.permissions?.includes('send:emails') ||
    role?.permissions?.includes('manage:users')
  );
};

// ── User & Role lookups ──────────────────────────────────────────────────────

// GET /api/communications/users
exports.getUsers = asyncHandler(async (req, res) => {
  const users = await User.find({ isActive: true, isBanned: false })
    .select('name email phone role')
    .populate('role', 'name')
    .sort({ name: 1 });
  res.json({ success: true, count: users.length, users });
});

// GET /api/communications/roles
exports.getRoles = asyncHandler(async (req, res) => {
  const roles = await Role.find().select('name description').sort({ name: 1 });
  res.json({ success: true, count: roles.length, roles });
});

// GET /api/communications/users/role/:roleId
exports.getUsersByRole = asyncHandler(async (req, res) => {
  const users = await User.find({ role: req.params.roleId, isActive: true, isBanned: false })
    .select('name email phone')
    .sort({ name: 1 });
  res.json({ success: true, count: users.length, users });
});

// ── Send communication ───────────────────────────────────────────────────────

// POST /api/communications/send
exports.sendCommunication = asyncHandler(async (req, res) => {
  if (!canSend(req)) {
    return res.status(403).json({ success: false, message: 'Access denied: insufficient permissions' });
  }

  const {
    subject, message, channels,
    recipientType, targetRoles, targetUserIds,
    templateId, scheduledFor,
  } = req.body;

  // ── Validation ──────────────────────────────────────────────────────────
  if (!message?.trim()) {
    return res.status(400).json({ success: false, message: 'message is required' });
  }
  if (!Array.isArray(channels) || channels.length === 0) {
    return res.status(400).json({ success: false, message: 'At least one channel (email or sms) is required' });
  }
  const validChannels = ['email', 'sms'];
  if (channels.some(c => !validChannels.includes(c))) {
    return res.status(400).json({ success: false, message: 'Invalid channel — use "email" or "sms"' });
  }
  if (channels.includes('email') && !subject?.trim()) {
    return res.status(400).json({ success: false, message: 'subject is required when using the email channel' });
  }
  if (!['all', 'bulk', 'single', 'role'].includes(recipientType)) {
    return res.status(400).json({ success: false, message: 'recipientType must be all | bulk | single | role' });
  }
  if (['bulk', 'single'].includes(recipientType) && (!Array.isArray(targetUserIds) || targetUserIds.length === 0)) {
    return res.status(400).json({ success: false, message: 'targetUserIds required for bulk/single recipient types' });
  }
  if (recipientType === 'role' && (!Array.isArray(targetRoles) || targetRoles.length === 0)) {
    return res.status(400).json({ success: false, message: 'targetRoles required for role-based recipient type' });
  }

  // ── Create record ───────────────────────────────────────────────────────
  const isScheduled = scheduledFor && new Date(scheduledFor) > new Date();
  const comm = await Communication.create({
    subject:       subject?.trim() || 'Message from House of Transformation',
    message:       message.trim(),
    channels,
    recipientType,
    targetRoles:   targetRoles   || [],
    targetUserIds: targetUserIds || [],
    templateId:    templateId    || null,
    createdBy:     req.user._id,
    status:        isScheduled ? 'scheduled' : 'queued',
    scheduledFor:  scheduledFor  || null,
  });

  // ── Queue job ───────────────────────────────────────────────────────────
  let job;
  if (isScheduled) {
    const delayMs = new Date(scheduledFor).getTime() - Date.now();
    job = await scheduleJob(comm._id.toString(), delayMs);
  } else {
    job = await addCommunicationJob(comm._id.toString());
  }

  comm.jobId = job.id;
  await comm.save();

  const responseMsg = isScheduled
    ? `Communication scheduled for ${new Date(scheduledFor).toLocaleString()}`
    : 'Communication queued — delivery in progress';

  console.log(`[CommunicationController] ✅ ${responseMsg} | id: ${comm._id}`);

  res.status(202).json({
    success: true,
    message: responseMsg,
    communication: comm,
  });
});

// ── History ──────────────────────────────────────────────────────────────────

// GET /api/communications
exports.getCommunications = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, status, channel } = req.query;
  const skip  = (parseInt(page) - 1) * parseInt(limit);
  const query = {};

  if (status)  query.status   = status;
  if (channel) query.channels = { $in: [channel] };

  const [communications, total] = await Promise.all([
    Communication.find(query)
      .populate('createdBy', 'name email')
      .populate('targetRoles', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit)),
    Communication.countDocuments(query),
  ]);

  res.json({
    success: true,
    communications,
    total,
    totalPages:  Math.ceil(total / parseInt(limit)),
    currentPage: parseInt(page),
  });
});

// GET /api/communications/stats
exports.getStats = asyncHandler(async (req, res) => {
  const [
    totalSent, totalQueued, totalFailed, totalScheduled,
    emailAgg, smsAgg, recentActivity,
  ] = await Promise.all([
    Communication.countDocuments({ status: 'sent' }),
    Communication.countDocuments({ status: { $in: ['queued', 'sending'] } }),
    Communication.countDocuments({ status: { $in: ['failed', 'partial'] } }),
    Communication.countDocuments({ status: 'scheduled' }),
    Communication.aggregate([
      { $match: { status: { $in: ['sent', 'partial'] } } },
      { $group: { _id: null, success: { $sum: '$emailSuccessCount' }, failed: { $sum: '$emailFailedCount' } } },
    ]),
    Communication.aggregate([
      { $match: { status: { $in: ['sent', 'partial'] } } },
      { $group: { _id: null, success: { $sum: '$smsSuccessCount' },   failed: { $sum: '$smsFailedCount' } } },
    ]),
    Communication.find({ status: { $in: ['sent', 'partial'] } })
      .populate('createdBy', 'name')
      .sort({ sentAt: -1 })
      .limit(5)
      .select('subject channels totalRecipients emailSuccessCount smsSuccessCount sentAt status'),
  ]);

  res.json({
    success: true,
    stats: {
      totalSent,
      totalQueued,
      totalFailed,
      totalScheduled,
      emailDelivered: emailAgg[0]?.success || 0,
      emailFailed:    emailAgg[0]?.failed  || 0,
      smsDelivered:   smsAgg[0]?.success   || 0,
      smsFailed:      smsAgg[0]?.failed    || 0,
      recentActivity,
    },
  });
});

// GET /api/communications/:id
exports.getCommunication = asyncHandler(async (req, res) => {
  const comm = await Communication.findById(req.params.id)
    .populate('createdBy', 'name email')
    .populate('targetRoles', 'name')
    .populate('targetUserIds', 'name email');
  if (!comm) return res.status(404).json({ success: false, message: 'Communication not found' });
  res.json({ success: true, communication: comm });
});

// DELETE /api/communications/:id
exports.deleteCommunication = asyncHandler(async (req, res) => {
  if (!canSend(req)) return res.status(403).json({ success: false, message: 'Access denied' });
  const comm = await Communication.findByIdAndDelete(req.params.id);
  if (!comm) return res.status(404).json({ success: false, message: 'Communication not found' });
  res.json({ success: true, message: 'Communication record deleted' });
});

// ── Templates ────────────────────────────────────────────────────────────────

// GET /api/communications/templates
exports.getTemplates = asyncHandler(async (req, res) => {
  const { category } = req.query;
  const query = { isActive: true };
  if (category) query.category = category;
  const templates = await EmailTemplate.find(query)
    .populate('createdBy', 'name')
    .sort({ usageCount: -1, createdAt: -1 });
  res.json({ success: true, count: templates.length, templates });
});

// POST /api/communications/templates
exports.createTemplate = asyncHandler(async (req, res) => {
  const { name, description, subject, message, category } = req.body;
  if (!name?.trim() || !message?.trim()) {
    return res.status(400).json({ success: false, message: 'name and message are required' });
  }
  const template = await EmailTemplate.create({
    name: name.trim(),
    description,
    subject,
    message,
    category:  category || 'other',
    createdBy: req.user._id,
  });
  res.status(201).json({ success: true, message: 'Template created', template });
});

// PUT /api/communications/templates/:id
exports.updateTemplate = asyncHandler(async (req, res) => {
  const template = await EmailTemplate.findById(req.params.id);
  if (!template) return res.status(404).json({ success: false, message: 'Template not found' });
  const allowed = ['name', 'description', 'subject', 'message', 'category', 'isActive'];
  allowed.forEach(key => { if (req.body[key] !== undefined) template[key] = req.body[key]; });
  await template.save();
  res.json({ success: true, message: 'Template updated', template });
});

// DELETE /api/communications/templates/:id
exports.deleteTemplate = asyncHandler(async (req, res) => {
  const template = await EmailTemplate.findByIdAndDelete(req.params.id);
  if (!template) return res.status(404).json({ success: false, message: 'Template not found' });
  res.json({ success: true, message: 'Template deleted' });
});