// server/services/emailService.js
// Upgraded from Nodemailer/SMTP → Brevo Transactional API

const SENDER_NAME  = process.env.BREVO_SENDER_NAME  || 'House of Transformation';
const SENDER_EMAIL = process.env.BREVO_SENDER_EMAIL || 'noreply@houseoftransformation.com';

class EmailService {
  constructor() {
    this._client = null;
  }

  /** Lazy-initialise Brevo client (avoids crash if key is missing at startup) */
  _getClient() {
    if (!this._client) {
      if (!process.env.BREVO_API_KEY) return null;
      const { BrevoClient } = require('@getbrevo/brevo');
      this._client = new BrevoClient({ apiKey: process.env.BREVO_API_KEY });
    }
    return this._client;
  }

  /**
   * Core send method — drop-in replacement for the old nodemailer call.
   * Accepts to as a string or array of strings.
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

      console.log(`[EmailService] ✅ Email sent — subject: "${subject}" | to: ${toArray.join(', ')}`);
      return { success: true };

    } catch (error) {
      console.error('[EmailService] ❌ Send failed:', error.message);
      return { success: false, error: error.message };
    }
  }

  async sendPasswordResetEmail(email, resetToken, resetUrl) {
    const html = `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;">
        <h2 style="color:#8B1A1A;">Password Reset</h2>
        <p>Click below to reset your House of Transformation portal password:</p>
        <a href="${resetUrl}"
           style="display:inline-block;padding:12px 28px;background:#8B1A1A;color:#fff;
                  text-decoration:none;border-radius:6px;margin:16px 0;font-weight:bold;">
          Reset Password
        </a>
        <p style="color:#666;font-size:13px;">This link expires in 1 hour.</p>
        <p style="color:#999;font-size:12px;">If you didn't request this, ignore this email.</p>
      </div>`;
    return this.sendEmail({
      to:      email,
      subject: 'Password Reset — House of Transformation',
      text:    `Reset your password here: ${resetUrl}`,
      html,
    });
  }

  async sendWelcomeEmail(email, name) {
    const html = `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;">
        <h2 style="color:#8B1A1A;">Welcome to House of Transformation!</h2>
        <p>Hi ${name},</p>
        <p>We're thrilled to have you in our community. God bless you!</p>
        <p>— House of Transformation Team, Busia Kenya</p>
      </div>`;
    return this.sendEmail({
      to:      email,
      subject: 'Welcome to House of Transformation',
      text:    `Welcome, ${name}! We are excited to have you.`,
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

      const notifKey = { donation: 'notifyOnNewDonation', volunteer: 'notifyOnNewVolunteer', user: 'notifyOnNewUser' }[type];
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