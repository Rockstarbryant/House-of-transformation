/**
 * Notification Service — Orchestrator
 * Resolves eligible users, delegates to Brevo services,
 * records per-user delivery results on the announcement document.
 */

const User         = require('../models/User');
const Announcement = require('../models/Announcement');
const { sendAnnouncementEmail } = require('./brevoEmailService');
const { sendAnnouncementSms }   = require('./brevoSmsService');

// ── Audience resolver ─────────────────────────────────────────────────────
const buildAudienceFilter = (announcement) => {
  const base = { isActive: true, isBanned: false };
  switch (announcement.targetAudience) {
    case 'all':            return { ...base };
    case 'members':        return { ...base, _audienceFilter: 'members' };
    case 'volunteers':     return { ...base, _audienceFilter: 'volunteers' };
    case 'staff':          return { ...base, _audienceFilter: 'staff' };
    case 'specific_roles': return { ...base, role: { $in: announcement.targetRoles.map(r => r._id || r) } };
    default:               return base;
  }
};

const getEligibleUsers = async (announcement) => {
  const audienceFilter = buildAudienceFilter(announcement);
  const { _audienceFilter, ...mongoFilter } = audienceFilter;

  const users = await User.find(mongoFilter)
    .select('name email phone notifications role')
    .populate('role', 'name')
    .lean();

  if (!_audienceFilter) return users;

  return users.filter((u) => {
    const roleName = u.role?.name?.toLowerCase() || '';
    switch (_audienceFilter) {
      case 'members':    return roleName === 'member';
      case 'volunteers': return roleName === 'volunteer' || roleName === 'usher';
      case 'staff':      return ['staff', 'admin', 'pastor', 'leader'].includes(roleName);
      default:           return true;
    }
  });
};

// ── Email notifications ───────────────────────────────────────────────────
const processEmailNotification = async (announcementId) => {
  const announcement = await Announcement.findById(announcementId)
    .populate('targetRoles', '_id name')
    .lean();

  if (!announcement) throw new Error(`Announcement not found: ${announcementId}`);
  if (!announcement.notifyEmail) {
    console.log(`[NotificationService] notifyEmail=false — skipping`);
    return { skipped: true };
  }

  const allEligible = await getEligibleUsers(announcement);
  const emailRecipients = allEligible
    .filter(u => u.notifications?.email === true && u.email)
    .map(u => ({ userId: u._id, email: u.email, name: u.name }));

  console.log(`[NotificationService] Email: ${emailRecipients.length} recipients from ${allEligible.length} eligible`);

  const result = await sendAnnouncementEmail(announcement, emailRecipients);

  // ── Record deliveries on the announcement ────────────────────────────────
  const deliveries = emailRecipients.map((r, idx) => ({
    userId:  r.userId,
    name:    r.name,
    email:   r.email,
    sentAt:  new Date(),
    success: idx < result.sent, // approximate — batch result
  }));

  await Announcement.findByIdAndUpdate(announcementId, {
    emailSent: true,
    $push: { emailDeliveries: { $each: deliveries } },
  });

  return result;
};

// ── SMS notifications ─────────────────────────────────────────────────────
const processSmsNotification = async (announcementId) => {
  // ✅ Import the correct exported function name
  const { sendAnnouncementSms } = require('./brevoSmsService');
  //const { sendAnnouncementSms } = require('./africasTalkingSmsService');

  const announcement = await Announcement.findById(announcementId)
    .populate('targetRoles', '_id name')
    .lean();

  if (!announcement) {
    throw new Error(`Announcement not found: ${announcementId}`);
  }

  if (!announcement.notifySMS) {
    console.log(`[NotificationService] notifySMS=false for ${announcementId} — skipping`);
    return { skipped: true };
  }

  const allEligible = await getEligibleUsers(announcement);

  const smsRecipients = allEligible
    .filter((u) => u.notifications?.sms === true && u.phone)
    .map((u) => ({ phone: u.phone, name: u.name }));

  console.log(
    `[NotificationService] SMS: ${smsRecipients.length} recipients from ${allEligible.length} eligible`
  );

  // ✅ Correct function name
  const result = await sendAnnouncementSms(announcement, smsRecipients);

  await Announcement.findByIdAndUpdate(announcementId, { smsSent: true });

  return result;
};

module.exports = { processEmailNotification, processSmsNotification, getEligibleUsers };