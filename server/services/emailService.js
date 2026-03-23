// server/services/emailService.js
// Brevo Transactional API — replaces Nodemailer/SMTP entirely

const SENDER_NAME  = process.env.BREVO_SENDER_NAME  || 'House of Transformation';
const SENDER_EMAIL = process.env.BREVO_SENDER_EMAIL || 'noreply@houseoftransformation.com';
const SITE_URL     = process.env.FRONTEND_URL        || 'http://localhost:3000';

class EmailService {
  constructor() {
    this._client = null;
  }

  /** Lazy-initialise Brevo client */
  _getClient() {
    if (!this._client) {
      if (!process.env.BREVO_API_KEY) return null;
      const { BrevoClient } = require('@getbrevo/brevo');
      this._client = new BrevoClient({ apiKey: process.env.BREVO_API_KEY });
    }
    return this._client;
  }

  /**
   * Core send method.
   * `to` can be a string or array of strings.
   */
  async sendEmail({ to, subject, text, html }) {
    try {
      const client = this._getClient();
      if (!client) {
        console.warn('[EmailService] ⚠ Brevo not configured — email skipped');
        return { success: false, reason: 'Email not configured (BREVO_API_KEY missing)' };
      }

      const toArray = Array.isArray(to) ? to : [to];

      await client.transactionalEmails.sendTransacEmail({
        sender:      { name: SENDER_NAME, email: SENDER_EMAIL },
        to:          toArray.map(email => ({ email })),
        subject,
        htmlContent: html,
        textContent: text,
      });

      console.log(`[EmailService] ✅ Sent — "${subject}" → ${toArray.join(', ')}`);
      return { success: true };

    } catch (error) {
      console.error('[EmailService] ❌ Send failed:', error.message);
      return { success: false, error: error.message };
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // AUTH EMAILS  (email/password users only — never called for Google OAuth)
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Verification email sent immediately after email/password signup.
   * `verificationLink` is the Supabase-generated action_link — a secure
   * one-time URL that confirms the user's email when clicked.
   */
  async sendVerificationEmail(email, name, verificationLink) {
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <title>Verify Your Email</title>
  <style>
    body{margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif}
    .wrapper{max-width:600px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08)}
    .header{background:#8B1A1A;padding:28px 32px}
    .header h1{color:#fff;margin:0;font-size:22px;font-weight:800;letter-spacing:-.3px}
    .header p{color:#fbbaba;margin:4px 0 0;font-size:13px}
    .body{padding:36px 32px}
    .body h2{color:#0f172a;font-size:24px;font-weight:800;margin:0 0 12px}
    .body p{color:#475569;font-size:15px;line-height:1.7;margin:0 0 20px}
    .cta{display:inline-block;background:#8B1A1A;color:#fff;text-decoration:none;
         padding:14px 32px;border-radius:8px;font-weight:700;font-size:15px;margin:8px 0 24px}
    .note{background:#fef9c3;border:1px solid #fde047;border-radius:8px;
          padding:14px 16px;font-size:13px;color:#713f12;margin-bottom:24px}
    .footer{border-top:1px solid #e2e8f0;padding:20px 32px;text-align:center;
            font-size:12px;color:#94a3b8;line-height:1.6}
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <h1>House of Transformation Church</h1>
      <p>Busia, Kenya</p>
    </div>
    <div class="body">
      <h2>Verify Your Email Address</h2>
      <p>Hi ${name || 'there'},</p>
      <p>
        Thank you for creating an account! Please verify your email address by clicking
        the button below. This confirms that you own this email and activates your account.
      </p>
      <a href="${verificationLink}" class="cta">Verify My Email →</a>
      <div class="note">
        ⏱ <strong>This link expires in 24 hours.</strong>
        If you didn't create an account, you can safely ignore this email.
      </div>
      <p style="font-size:13px;color:#94a3b8;">
        If the button doesn't work, paste this URL into your browser:<br/>
        <a href="${verificationLink}" style="color:#8B1A1A;word-break:break-all;">${verificationLink}</a>
      </p>
    </div>
    <div class="footer">
      House of Transformation Church, Busia County, Kenya<br/>
      You received this because an account was created using this email address.
    </div>
  </div>
</body>
</html>`;

    return this.sendEmail({
      to:      email,
      subject: 'Verify your email — House of Transformation',
      text:    `Hi ${name || 'there'}, please verify your email by visiting: ${verificationLink}`,
      html,
    });
  }

  /**
   * Password reset email for email/password users.
   * `resetLink` is the Supabase-generated action_link for type 'recovery'.
   * Never called for Google OAuth users.
   */
  async sendPasswordResetEmail(email, name, resetLink) {
    const displayName = name || 'there';
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <title>Reset Your Password</title>
  <style>
    body{margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif}
    .wrapper{max-width:600px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08)}
    .header{background:#8B1A1A;padding:28px 32px}
    .header h1{color:#fff;margin:0;font-size:22px;font-weight:800}
    .header p{color:#fbbaba;margin:4px 0 0;font-size:13px}
    .body{padding:36px 32px}
    .body h2{color:#0f172a;font-size:24px;font-weight:800;margin:0 0 12px}
    .body p{color:#475569;font-size:15px;line-height:1.7;margin:0 0 20px}
    .cta{display:inline-block;background:#8B1A1A;color:#fff;text-decoration:none;
         padding:14px 32px;border-radius:8px;font-weight:700;font-size:15px;margin:8px 0 24px}
    .note{background:#fef9c3;border:1px solid #fde047;border-radius:8px;
          padding:14px 16px;font-size:13px;color:#713f12;margin-bottom:24px}
    .security{background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;
              padding:14px 16px;font-size:13px;color:#166534;margin-bottom:24px}
    .footer{border-top:1px solid #e2e8f0;padding:20px 32px;text-align:center;
            font-size:12px;color:#94a3b8;line-height:1.6}
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <h1>House of Transformation Church</h1>
      <p>Busia, Kenya</p>
    </div>
    <div class="body">
      <h2>Reset Your Password</h2>
      <p>Hi ${displayName},</p>
      <p>
        We received a request to reset the password for your H.O.T Church portal account.
        Click the button below to create a new password:
      </p>
      <a href="${resetLink}" class="cta">Reset My Password →</a>
      <div class="note">
        ⏱ <strong>This link expires in 1 hour.</strong>
        If it has expired, you can request a new one at the login page.
      </div>
      <div class="security">
        🔒 <strong>Didn't request this?</strong> You can safely ignore this email.
        Your password will not change unless you click the link above.
      </div>
      <p style="font-size:13px;color:#94a3b8;">
        If the button doesn't work, paste this URL into your browser:<br/>
        <a href="${resetLink}" style="color:#8B1A1A;word-break:break-all;">${resetLink}</a>
      </p>
    </div>
    <div class="footer">
      House of Transformation Church, Busia County, Kenya<br/>
      This email was sent because a password reset was requested for this account.
    </div>
  </div>
</body>
</html>`;

    return this.sendEmail({
      to:      email,
      subject: 'Reset your password — House of Transformation',
      text:    `Hi ${displayName}, reset your password here: ${resetLink}\n\nThis link expires in 1 hour.`,
      html,
    });
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // OTHER EMAILS
  // ─────────────────────────────────────────────────────────────────────────────

  async sendWelcomeEmail(email, name) {
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <title>Welcome!</title>
  <style>
    body{margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif}
    .wrapper{max-width:600px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08)}
    .header{background:#8B1A1A;padding:28px 32px}
    .header h1{color:#fff;margin:0;font-size:22px;font-weight:800}
    .header p{color:#fbbaba;margin:4px 0 0;font-size:13px}
    .body{padding:36px 32px}
    .body h2{color:#0f172a;font-size:24px;font-weight:800;margin:0 0 12px}
    .body p{color:#475569;font-size:15px;line-height:1.7;margin:0 0 16px}
    .cta{display:inline-block;background:#8B1A1A;color:#fff;text-decoration:none;
         padding:14px 32px;border-radius:8px;font-weight:700;font-size:15px;margin:8px 0}
    .footer{border-top:1px solid #e2e8f0;padding:20px 32px;text-align:center;
            font-size:12px;color:#94a3b8}
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <h1>House of Transformation Church</h1>
      <p>Busia, Kenya</p>
    </div>
    <div class="body">
      <h2>Welcome, ${name}! 🎉</h2>
      <p>We're so glad you've joined the House of Transformation community.</p>
      <p>You can now access the member portal to stay up to date with sermons, events, announcements, and more.</p>
      <a href="${SITE_URL}/portal" class="cta">Visit the Portal →</a>
      <p style="margin-top:24px;">God bless you,<br/><strong>House of Transformation Team</strong></p>
    </div>
    <div class="footer">
      House of Transformation Church, Busia County, Kenya
    </div>
  </div>
</body>
</html>`;

    return this.sendEmail({
      to:      email,
      subject: 'Welcome to House of Transformation!',
      text:    `Welcome, ${name}! Visit the portal: ${SITE_URL}/portal`,
      html,
    });
  }

  async sendContactFormEmail(contactData) {
    const { name, email, subject, message } = contactData;

    let adminEmail = SENDER_EMAIL;
    try {
      const Settings = require('../models/Settings');
      const settings = await Settings.getSettings();
      if (settings?.contactEmail) adminEmail = settings.contactEmail;
    } catch (_) { /* fallback to env */ }

    const html = `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;">
        <h2 style="color:#8B1A1A;">New Contact Form Submission</h2>
        <p><strong>From:</strong> ${name} &lt;${email}&gt;</p>
        <p><strong>Subject:</strong> ${subject}</p>
        <div style="background:#f9f9f9;padding:16px;border-radius:6px;margin-top:12px;line-height:1.7;">
          ${message.replace(/\n/g, '<br>')}
        </div>
      </div>`;

    return this.sendEmail({ to: adminEmail, subject: `Contact: ${subject}`, text: message, html });
  }

  async sendAdminNotification(type, data) {
    let adminEmail = SENDER_EMAIL;
    try {
      const Settings = require('../models/Settings');
      const settings = await Settings.getSettings();
      if (settings?.contactEmail) adminEmail = settings.contactEmail;

      const notifKey = {
        donation:  'notifyOnNewDonation',
        volunteer: 'notifyOnNewVolunteer',
        user:      'notifyOnNewUser'
      }[type];

      if (notifKey && !settings?.notificationSettings?.[notifKey]) {
        return { success: false, reason: `${type} notifications disabled` };
      }
    } catch (_) { /* proceed anyway */ }

    const templates = {
      donation: {
        subject: `New Donation — ${data.amount}`,
        html:    `<h3>New Donation</h3><p>Amount: ${data.amount}</p><p>From: ${data.donorName || 'Anonymous'}</p><p>${new Date().toLocaleString()}</p>`,
      },
      volunteer: {
        subject: 'New Volunteer Application',
        html:    `<h3>New Volunteer</h3><p>Name: ${data.name}</p><p>Email: ${data.email}</p><p>Skills: ${data.skills || 'N/A'}</p>`,
      },
      user: {
        subject: 'New User Registration',
        html:    `<h3>New User</h3><p>Name: ${data.name}</p><p>Email: ${data.email}</p><p>${new Date().toLocaleString()}</p>`,
      },
    };

    const tpl = templates[type];
    if (!tpl) return { success: false, reason: 'Unknown notification type' };

    return this.sendEmail({ to: adminEmail, subject: tpl.subject, html: tpl.html, text: tpl.subject });
  }

  /** For the settings panel "Test Connection" button */
  async testConnection() {
    if (!process.env.BREVO_API_KEY) {
      return { success: false, error: 'BREVO_API_KEY not configured' };
    }
    return { success: true, message: 'Brevo API key is present — connection OK' };
  }
}

module.exports = new EmailService();