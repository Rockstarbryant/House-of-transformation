// server/services/communicationService.js
const User          = require('../models/User');
const Communication = require('../models/Communication');

const SENDER_NAME  = process.env.BREVO_SENDER_NAME  || 'House of Transformation Church';
const SENDER_EMAIL = process.env.BREVO_SENDER_EMAIL || 'noreply@houseoftransformation.com';
const BATCH_SIZE   = parseInt(process.env.BREVO_EMAIL_BATCH_SIZE)  || 50;
const BATCH_DELAY  = parseInt(process.env.BREVO_BATCH_DELAY_MS)    || 1_000;

// ─────────────────────────────────────────────────────────────────────────────
// Email delivery via Brevo
// ─────────────────────────────────────────────────────────────────────────────

const sendEmailBatches = async (recipients, subject, htmlContent, textContent) => {
  if (!process.env.BREVO_API_KEY) {
    console.warn('[CommunicationService] BREVO_API_KEY not set — skipping email delivery');
    return { sent: 0, failed: recipients.length };
  }

  const { BrevoClient } = require('@getbrevo/brevo');
  const client = new BrevoClient({ apiKey: process.env.BREVO_API_KEY });

  let sent   = 0;
  let failed = 0;

  for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
    const batch  = recipients.slice(i, i + BATCH_SIZE);
    const toList = batch.map(r => ({ name: r.name || r.email, email: r.email }));

    try {
      await client.transactionalEmails.sendTransacEmail({
        sender:      { name: SENDER_NAME, email: SENDER_EMAIL },
        to:          toList,
        subject,
        htmlContent,
        textContent,
      });
      sent += batch.length;
      console.log(
        `[CommunicationService] Email batch ${Math.ceil((i + BATCH_SIZE) / BATCH_SIZE)}: ✅ sent ${batch.length}`
      );
    } catch (err) {
      console.error(`[CommunicationService] Email batch failed:`, err.message);
      failed += batch.length;
    }

    if (i + BATCH_SIZE < recipients.length) {
      await new Promise(res => setTimeout(res, BATCH_DELAY));
    }
  }

  return { sent, failed };
};

// ─────────────────────────────────────────────────────────────────────────────
// SMS delivery via Africa's Talking
// ─────────────────────────────────────────────────────────────────────────────

const normalizePhone = (phone) => {
  if (!phone) return null;
  const cleaned = String(phone).replace(/\s+/g, '').replace(/[^+\d]/g, '');
  if (cleaned.startsWith('0'))  return '+254' + cleaned.slice(1);
  if (cleaned.startsWith('254') && !cleaned.startsWith('+')) return '+' + cleaned;
  if (cleaned.startsWith('+')) return cleaned;
  return null;
};

const sendSmsBatches = async (recipients, message) => {
  if (!process.env.AT_API_KEY || !process.env.AT_USERNAME) {
    console.warn('[CommunicationService] Africa\'s Talking not configured — skipping SMS delivery');
    return { sent: 0, failed: recipients.length };
  }

  const AfricasTalking = require('africastalking');
  const at  = AfricasTalking({ username: process.env.AT_USERNAME, apiKey: process.env.AT_API_KEY });
  const sms = at.SMS;

  // Filter and normalise phone numbers
  const valid = recipients
    .map(r => ({ ...r, normalizedPhone: normalizePhone(r.phone) }))
    .filter(r => r.normalizedPhone);

  if (valid.length === 0) {
    console.warn('[CommunicationService] No valid phone numbers for SMS');
    return { sent: 0, failed: recipients.length };
  }

  // Enforce 160-char SMS limit with church branding prefix
  const prefix  = '[HOT Church] ';
  const maxBody = 160 - prefix.length - 3;
  const body    = message.length > maxBody ? message.substring(0, maxBody) + '...' : message;
  const smsText = prefix + body;

  let sent   = 0;
  let failed = 0;

  // Africa's Talking supports 1000 recipients per call
  const AT_BATCH = 1_000;
  for (let i = 0; i < valid.length; i += AT_BATCH) {
    const batch  = valid.slice(i, i + AT_BATCH);
    const phones = batch.map(r => r.normalizedPhone);

    try {
      const sendPayload = { to: phones, message: smsText };
        if (process.env.AT_SMS_SENDER) sendPayload.from = process.env.AT_SMS_SENDER;
        const result = await sms.send(sendPayload);
      const recipients = result?.SMSMessageData?.Recipients || [];
      const batchSent  = recipients.filter(r => r.status === 'Success').length;
      const batchFailed= recipients.length - batchSent;
      sent   += batchSent;
      failed += batchFailed;
      console.log(`[CommunicationService] SMS batch: ✅ ${batchSent} sent, ❌ ${batchFailed} failed`);
    } catch (err) {
      console.error(`[CommunicationService] SMS batch failed:`, err.message);
      failed += batch.length;
    }
  }

  return { sent, failed };
};

// ─────────────────────────────────────────────────────────────────────────────
// Resolve recipients from MongoDB
// ─────────────────────────────────────────────────────────────────────────────

const resolveRecipients = async ({ recipientType, targetRoles, targetUserIds }) => {
  const query = { isActive: true, isBanned: false };

  if (recipientType === 'role' && targetRoles?.length > 0) {
    query.role = { $in: targetRoles };
  } else if ((recipientType === 'bulk' || recipientType === 'single') && targetUserIds?.length > 0) {
    query._id = { $in: targetUserIds };
  }
  // 'all' → no additional filter

  return User.find(query).select('name email phone').lean();
};

// ─────────────────────────────────────────────────────────────────────────────
// HTML email builder
// ─────────────────────────────────────────────────────────────────────────────

const buildHtml = (subject, message) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,sans-serif;">
  <div style="max-width:600px;margin:24px auto;background:#fff;border-radius:10px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">

    <!-- Header -->
    <div style="background:#8B1A1A;padding:28px 32px;text-align:center;">
      <h1 style="color:#fff;margin:0;font-size:22px;font-weight:bold;letter-spacing:0.5px;">
        House of Transformation
      </h1>
      <p style="color:#f5a0a0;margin:6px 0 0;font-size:13px;">Busia, Kenya</p>
    </div>

    <!-- Body -->
    <div style="padding:32px;">
      <h2 style="color:#1a1a1a;margin:0 0 18px;font-size:20px;line-height:1.3;">${subject}</h2>
      <div style="color:#4a4a4a;font-size:15px;line-height:1.8;">
        ${message.replace(/\n/g, '<br>')}
      </div>
    </div>

    <!-- Footer -->
    <div style="background:#f8f8f8;border-top:1px solid #eee;padding:18px 32px;text-align:center;">
      <p style="color:#999;font-size:12px;margin:0;">
        Sent via House of Transformation Church Communications Portal
      </p>
      <p style="color:#bbb;font-size:11px;margin:6px 0 0;">
        House of Transformation · Busia County, Kenya
      </p>
    </div>
  </div>
</body>
</html>`;

// ─────────────────────────────────────────────────────────────────────────────
// Main processor — called by the BullMQ worker
// ─────────────────────────────────────────────────────────────────────────────

const processCommunication = async (communicationId) => {
  const comm = await Communication.findById(communicationId);
  if (!comm) throw new Error(`Communication not found: ${communicationId}`);

  console.log(`[CommunicationService] ▶ Processing: ${communicationId} | channels: ${comm.channels.join('+')}`);

  comm.status = 'sending';
  await comm.save();

  try {
    const users = await resolveRecipients(comm);
    console.log(`[CommunicationService] Resolved ${users.length} recipients`);
    comm.totalRecipients = users.length;

    const sendEmail = comm.channels.includes('email');
    const sendSms   = comm.channels.includes('sms');

    if (sendEmail) {
      const emailRecipients = users.filter(u => u.email);
      if (emailRecipients.length > 0) {
        const subject     = comm.subject || 'Message from House of Transformation';
        const htmlContent = buildHtml(subject, comm.message);
        const { sent, failed } = await sendEmailBatches(emailRecipients, subject, htmlContent, comm.message);
        comm.emailSuccessCount = sent;
        comm.emailFailedCount  = failed;
        comm.htmlContent       = htmlContent;
        console.log(`[CommunicationService] Email done — sent: ${sent}, failed: ${failed}`);
      } else {
        console.warn('[CommunicationService] No email recipients with valid email addresses');
      }
    }

    if (sendSms) {
      const smsRecipients = users.filter(u => u.phone);
      if (smsRecipients.length > 0) {
        const { sent, failed } = await sendSmsBatches(smsRecipients, comm.message);
        comm.smsSuccessCount = sent;
        comm.smsFailedCount  = failed;
        console.log(`[CommunicationService] SMS done — sent: ${sent}, failed: ${failed}`);
      } else {
        console.warn('[CommunicationService] No SMS recipients with valid phone numbers');
      }
    }

    // Determine final status
    const totalSuccess = (comm.emailSuccessCount || 0) + (comm.smsSuccessCount || 0);
    const totalFailed  = (comm.emailFailedCount  || 0) + (comm.smsFailedCount  || 0);

    if (totalSuccess === 0 && totalFailed > 0) {
      comm.status = 'failed';
    } else if (totalFailed > 0) {
      comm.status = 'partial';
    } else {
      comm.status = 'sent';
    }

    comm.sentAt = new Date();
    await comm.save();

    console.log(`[CommunicationService] ✅ Done — status: ${comm.status} | recipients: ${users.length}`);

  } catch (err) {
    console.error(`[CommunicationService] ❌ Processing error:`, err.message);
    comm.status       = 'failed';
    comm.errorMessage = err.message;
    await comm.save();
    throw err; // Re-throw so BullMQ can retry
  }
};

module.exports = { processCommunication };