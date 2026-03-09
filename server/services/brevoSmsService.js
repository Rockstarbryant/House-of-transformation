/**
 * Brevo SMS Service — @getbrevo/brevo v4
 * Confirmed namespace: c.transactionalSms
 */
const { BrevoClient } = require('@getbrevo/brevo');

let _client = null;

const getClient = () => {
  if (_client) return _client;
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) throw new Error('BREVO_API_KEY environment variable is not set');
  _client = new BrevoClient({ apiKey });
  return _client;
};

const SMS_SENDER     = process.env.BREVO_SMS_SENDER || 'HOT Church';
const SMS_MAX_LENGTH = 155;
const SMS_DELAY_MS   = 200;

/**
 * Normalise phone to E.164 digits without '+'.
 * Handles Kenyan local format: 07XXXXXXXX → 2547XXXXXXXX
 * Also handles: +254XXXXXXXXX, 254XXXXXXXXX, 07XXXXXXXX, 7XXXXXXXX
 */
const normalisePhone = (phone) => {
  if (!phone || typeof phone !== 'string') return { valid: false, normalized: null };

  let cleaned = phone.trim().replace(/[\s\-().]/g, '');

  // Remove leading +
  if (cleaned.startsWith('+')) cleaned = cleaned.slice(1);

  // Kenya-specific: 07XXXXXXXX or 01XXXXXXXX (10 digits starting with 0)
  if (/^0[0-9]{9}$/.test(cleaned)) {
    cleaned = '254' + cleaned.slice(1); // 0771301385 → 254771301385
  }

  // Kenya-specific: 7XXXXXXXX (9 digits starting with 7 — missing country code)
  if (/^[71][0-9]{8}$/.test(cleaned)) {
    cleaned = '254' + cleaned; // 771301385 → 254771301385
  }

  // Final check: must be 7–15 digits
  if (!/^\d{7,15}$/.test(cleaned)) return { valid: false, normalized: null };

  return { valid: true, normalized: cleaned };
};

const buildSmsMessage = (announcement) => {
  const prefix = `[HOT Church] ${announcement.priority?.toUpperCase() === 'URGENT' ? '🚨 URGENT: ' : ''}`;
  const body   = `${announcement.title}: ${announcement.content}`;
  const full   = `${prefix}${body}`;
  if (full.length <= SMS_MAX_LENGTH) return full;
  const maxBody = SMS_MAX_LENGTH - prefix.length - 3;
  return `${prefix}${body.slice(0, maxBody)}...`;
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const sendAnnouncementSms = async (announcement, recipients) => {
  if (!recipients?.length) {
    console.log('[BrevoSMS] No recipients — skipping');
    return { sent: 0, failed: 0, skipped: 0, total: 0 };
  }

  const client  = getClient();
  const message = buildSmsMessage(announcement);
  let sent = 0, failed = 0, skipped = 0;
  const total = recipients.length;

  for (const recipient of recipients) {
    const { valid, normalized } = normalisePhone(recipient.phone);

    if (!valid) {
      skipped++;
      console.warn(`[BrevoSMS] ⚠️  Invalid phone — skipping:`, recipient.phone);
      continue;
    }

    try {
      // ✅ CONFIRMED namespace: transactionalSms
      await client.transactionalSms.sendTransacSms({
        sender:    SMS_SENDER,
        recipient: normalized,
        content:   message,
        type:      'transactional',
      });
      sent++;
    } catch (err) {
      failed++;
      console.error(`[BrevoSMS] ❌ Failed to ${normalized}:`, err?.message || err);
    }

    await sleep(SMS_DELAY_MS);
  }

  console.log(`[BrevoSMS] ✅ Done — sent:${sent} failed:${failed} skipped:${skipped} total:${total}`);
  return { sent, failed, skipped, total };
};

/**
 * Send SMS with per-recipient success tracking.
 * Used by notificationService to record individual delivery results.
 */
const sendAnnouncementSmsWithTracking = async (announcement, recipients) => {
  if (!recipients?.length) return { results: [], skipped: 0 };

  const client  = getClient();
  const message = buildSmsMessage(announcement);
  const results = [];
  let skipped   = 0;

  for (const recipient of recipients) {
    const { valid, normalized } = normalisePhone(recipient.phone);

    if (!valid) {
      skipped++;
      console.warn(`[BrevoSMS] ⚠️  Invalid phone — skipping:`, recipient.phone);
      results.push({ ...recipient, success: false, error: 'invalid_phone' });
      continue;
    }

    try {
      await client.transactionalSms.sendTransacSms({
        sender:    SMS_SENDER,
        recipient: normalized,
        content:   message,
        type:      'transactional',
      });
      results.push({ ...recipient, phone: normalized, success: true });
    } catch (err) {
      const errorMsg = err?.message || String(err);
      console.error(`[BrevoSMS] ❌ Failed to ${normalized}:`, errorMsg);
      results.push({ ...recipient, phone: normalized, success: false, error: errorMsg });
    }

    await sleep(SMS_DELAY_MS);
  }

  const sent   = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  console.log(`[BrevoSMS] ✅ Done — sent:${sent} failed:${failed} skipped:${skipped}`);

  return { results, skipped };
};

// Update module.exports at the bottom:
module.exports = {
  sendAnnouncementSms,
  sendAnnouncementSmsWithTracking,
  normalisePhone,
  buildSmsMessage,
};

module.exports = { sendAnnouncementSms, normalisePhone, buildSmsMessage };