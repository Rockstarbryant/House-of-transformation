/**
 * Brevo Email Service — @getbrevo/brevo v4
 * sendTransacEmail confirmed on c.transactionalEmails prototype
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

const SENDER = {
  name:  process.env.BREVO_SENDER_NAME  || 'House of Transformation Church',
  email: process.env.BREVO_SENDER_EMAIL || 'noreply@yourdomain.com',
};
const BATCH_SIZE  = parseInt(process.env.BREVO_EMAIL_BATCH_SIZE || '50', 10);
const BATCH_DELAY = parseInt(process.env.BREVO_BATCH_DELAY_MS   || '1000', 10);

const buildAnnouncementHtml = ({ title, content, priority, category, siteUrl }) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <title>${title}</title>
  <style>
    body{margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif}
    .wrapper{max-width:600px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08)}
    .header{background:#8B1A1A;padding:28px 32px}
    .header h1{color:#fff;margin:0;font-size:22px;font-weight:800}
    .header p{color:#fbbaba;margin:4px 0 0;font-size:13px}
    .body{padding:32px}
    .badge{display:inline-block;padding:4px 12px;border-radius:20px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;margin-bottom:20px}
    .urgent{background:#fee2e2;color:#b91c1c}.high{background:#fef3c7;color:#b45309}
    .normal{background:#f1f5f9;color:#475569}.low{background:#e0f2fe;color:#0369a1}
    h2{color:#0f172a;font-size:26px;font-weight:900;margin:0 0 16px;line-height:1.25}
    p{color:#475569;font-size:15px;line-height:1.7;margin:0 0 20px;white-space:pre-wrap}
    .meta{background:#f8fafc;border-radius:8px;padding:14px 16px;font-size:12px;color:#94a3b8;margin-bottom:24px}
    .cta{display:inline-block;background:#8B1A1A;color:#fff;text-decoration:none;padding:14px 28px;border-radius:8px;font-weight:700;font-size:15px}
    .footer{border-top:1px solid #e2e8f0;padding:20px 32px;text-align:center;font-size:12px;color:#94a3b8}
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <h1>House of Transformation Church</h1>
      <p>Church Announcement</p>
    </div>
    <div class="body">
      <span class="badge ${priority || 'normal'}">${priority || 'normal'} priority</span>
      <h2>${title}</h2>
      <div class="meta">
        <span>📂 ${category || 'General'}</span>
        <span style="margin-left:16px">📅 ${new Date().toLocaleDateString('en-US',{weekday:'long',year:'numeric',month:'long',day:'numeric'})}</span>
      </div>
      <p>${content}</p>
      ${siteUrl ? `<a href="${siteUrl}/portal/announcements" class="cta">View in Portal →</a>` : ''}
    </div>
    <div class="footer">
      You are receiving this because you subscribed to email notifications.<br/>
      To unsubscribe, update your <a href="${siteUrl||'#'}/portal/profile">notification preferences</a>.
    </div>
  </div>
</body>
</html>`;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const sendAnnouncementEmail = async (announcement, recipients) => {
  if (!recipients?.length) {
    console.log('[BrevoEmail] No recipients — skipping');
    return { sent: 0, failed: 0, total: 0 };
  }

  const client  = getClient();
  const siteUrl = process.env.FRONTEND_URL || '';

  const htmlContent = buildAnnouncementHtml({
    title:    announcement.title,
    content:  announcement.content,
    priority: announcement.priority,
    category: announcement.category,
    siteUrl,
  });
  const textContent = `${announcement.title}\n\n${announcement.content}\n\nView: ${siteUrl}/portal/announcements`;

  let sent = 0, failed = 0;
  const total = recipients.length;

  for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
    const batch = recipients.slice(i, i + BATCH_SIZE);

    const results = await Promise.allSettled(
      batch.map((recipient) =>
        // ✅ CONFIRMED: transactionalEmails.sendTransacEmail
        client.transactionalEmails.sendTransacEmail({
          sender:       SENDER,
          to:           [{ email: recipient.email, name: recipient.name || '' }],
          subject:      `[Church Announcement] ${announcement.title}`,
          htmlContent,
          textContent,
          tags:         ['announcement', announcement.priority, announcement.category],
        })
      )
    );

    results.forEach((r, idx) => {
      if (r.status === 'fulfilled') {
        sent++;
      } else {
        failed++;
        console.error(`[BrevoEmail] ❌ ${batch[idx].email}:`, r.reason?.message || r.reason);
      }
    });

    if (i + BATCH_SIZE < recipients.length) await sleep(BATCH_DELAY);
  }

  console.log(`[BrevoEmail] ✅ Done — sent:${sent} failed:${failed} total:${total}`);
  return { sent, failed, total };
};

const sendSingleEmail = async ({ to, subject, htmlContent, textContent }) => {
  const client = getClient();
  return client.transactionalEmails.sendTransacEmail({
    sender: SENDER,
    to:     Array.isArray(to) ? to : [to],
    subject,
    htmlContent,
    ...(textContent && { textContent }),
  });
};

module.exports = { sendAnnouncementEmail, sendSingleEmail, SENDER };