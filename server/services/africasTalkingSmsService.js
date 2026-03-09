/**
 * Africa's Talking SMS Service
 * Primary SMS provider — cheaper rates for Kenya
 * Brevo remains available as backup in brevoSmsService.js
 */

const AfricasTalking = require('africastalking');

// ── Client singleton ──────────────────────────────────────────────────────
let _smsClient = null;

const getSmsClient = () => {
  if (_smsClient) return _smsClient;

  const username = process.env.AT_USERNAME;
  const apiKey   = process.env.AT_API_KEY;

  if (!username) throw new Error('AT_USERNAME environment variable is not set');
  if (!apiKey)   throw new Error('AT_API_KEY environment variable is not set');

  const at = AfricasTalking({ username, apiKey });
  _smsClient = at.SMS;
  return _smsClient;
};

// ── Config ────────────────────────────────────────────────────────────────
const SMS_SENDER     = process.env.AT_SMS_SENDER || undefined; // undefined = shared shortcode
const SMS_MAX_LENGTH = 155;
const SMS_DELAY_MS   = 300;

// ── Phone normalisation ───────────────────────────────────────────────────
/**
 * Africa's Talking requires E.164 WITH the + prefix: +254712345678
 */
const normalisePhone = (phone) => {
  if (!phone || typeof phone !== 'string') return { valid: false, normalized: null };

  let cleaned = phone.trim().replace(/[\s\-().]/g, '');

  // Add + if missing
  if (!cleaned.startsWith('+')) {
    // If starts with 0, assume Kenya: 0712... → +254712...
    if (cleaned.startsWith('0')) cleaned = '+254' + cleaned.slice(1);
    // If starts with 254 (no +), add it
    else if (cleaned.startsWith('254')) cleaned = '+' + cleaned;
    // Otherwise prepend +
    else cleaned = '+' + cleaned;
  }

  // Validate E.164: + followed by 7-15 digits
  if (!/^\+\d{7,15}$/.test(cleaned)) return { valid: false, normalized: null };

  return { valid: true, normalized: cleaned };
};

// ── Message builder ───────────────────────────────────────────────────────
const buildSmsMessage = (announcement) => {
  const isUrgent = announcement.priority?.toUpperCase() === 'URGENT';
  const prefix   = `[HOT Church]${isUrgent ? ' 🚨 URGENT:' : ''} `;
  const body     = `${announcement.title}: ${announcement.content}`;
  const full     = `${prefix}${body}`;

  if (full.length <= SMS_MAX_LENGTH) return full;

  const maxBody = SMS_MAX_LENGTH - prefix.length - 3;
  return `${prefix}${body.slice(0, maxBody)}...`;
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ── Main send function ────────────────────────────────────────────────────
/**
 * Send announcement SMS to recipients via Africa's Talking.
 * AT supports bulk sending natively — we batch by 1000 (their limit).
 * @param {Object} announcement
 * @param {Array}  recipients   - Array of { phone, name }
 * @returns {{ sent, failed, skipped, total }}
 */
const sendAnnouncementSms = async (announcement, recipients) => {
  if (!recipients?.length) {
    console.log('[AT-SMS] No recipients — skipping');
    return { sent: 0, failed: 0, skipped: 0, total: 0 };
  }

  const sms     = getSmsClient();
  const message = buildSmsMessage(announcement);
  const total   = recipients.length;

  // Normalise and filter valid phones
  const validRecipients = [];
  let skipped = 0;

  for (const r of recipients) {
    const { valid, normalized } = normalisePhone(r.phone);
    if (valid) {
      validRecipients.push(normalized);
    } else {
      skipped++;
      console.warn(`[AT-SMS] ⚠️  Invalid phone — skipping:`, r.phone);
    }
  }

  if (!validRecipients.length) {
    console.log(`[AT-SMS] No valid recipients after normalisation`);
    return { sent: 0, failed: 0, skipped, total };
  }

  let sent = 0, failed = 0;
  const BATCH_SIZE = 1000; // AT's max per request

  for (let i = 0; i < validRecipients.length; i += BATCH_SIZE) {
    const batch = validRecipients.slice(i, i + BATCH_SIZE);

    try {
      const result = await sms.send({
        to:      batch,
        message,
        ...(SMS_SENDER && { from: SMS_SENDER }),
      });

      // AT returns per-recipient statuses
      const recipients_result = result?.SMSMessageData?.Recipients || [];

      recipients_result.forEach((r) => {
        if (r.status === 'Success') {
          sent++;
        } else {
          failed++;
          console.error(`[AT-SMS] ❌ Failed to ${r.number}: ${r.status} — ${r.statusCode}`);
        }
      });

      // If AT returns no recipients array, assume batch succeeded
      if (!recipients_result.length) {
        sent += batch.length;
      }

    } catch (err) {
      failed += batch.length;
      console.error(`[AT-SMS] ❌ Batch failed:`, err?.message || err);
    }

    if (i + BATCH_SIZE < validRecipients.length) await sleep(SMS_DELAY_MS);
  }

  console.log(`[AT-SMS] ✅ Done — sent:${sent} failed:${failed} skipped:${skipped} total:${total}`);
  return { sent, failed, skipped, total };
};

module.exports = { sendAnnouncementSms, normalisePhone, buildSmsMessage };