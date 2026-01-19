// server/services/emailService.js
/**
 * Email Service
 * Sends emails using SMTP settings from database
 */

const nodemailer = require('nodemailer');
const Settings = require('../models/Settings');

class EmailService {
  constructor() {
    this.transporter = null;
    this.lastSettingsCheck = 0;
    this.settingsCacheDuration = 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Get transporter (creates new one if settings changed)
   */
  async getTransporter() {
    try {
      const now = Date.now();
      
      // Use cached transporter if less than 5 minutes old
      if (this.transporter && (now - this.lastSettingsCheck) < this.settingsCacheDuration) {
        console.log('[EMAIL-SERVICE] Using cached transporter');
        return this.transporter;
      }

      console.log('[EMAIL-SERVICE] Fetching email settings from database...');
      
      const settings = await Settings.getSettings();
      const emailSettings = settings?.emailSettings;

      // Check if email settings are configured
      if (!emailSettings?.smtpHost || !emailSettings?.smtpUser || !emailSettings?.smtpPassword) {
        console.warn('[EMAIL-SERVICE] ⚠️ Email settings not configured');
        return null;
      }

      console.log('[EMAIL-SERVICE] Creating transporter with settings:', {
        host: emailSettings.smtpHost,
        port: emailSettings.smtpPort,
        user: emailSettings.smtpUser.substring(0, 5) + '***'
      });

      // Create new transporter with current settings
      this.transporter = nodemailer.createTransport({
        host: emailSettings.smtpHost,
        port: emailSettings.smtpPort,
        secure: emailSettings.smtpPort === 465, // Use TLS for port 465
        auth: {
          user: emailSettings.smtpUser,
          pass: emailSettings.smtpPassword
        }
      });

      // Verify transporter connection
      try {
        await this.transporter.verify();
        console.log('[EMAIL-SERVICE] ✅ Transporter verified - SMTP connected successfully');
      } catch (verifyError) {
        console.error('[EMAIL-SERVICE] ❌ Transporter verification failed:', verifyError.message);
        return null;
      }

      this.lastSettingsCheck = now;
      return this.transporter;

    } catch (error) {
      console.error('[EMAIL-SERVICE] Error getting transporter:', error);
      return null;
    }
  }

  /**
   * Send email using configured SMTP
   */
  async sendEmail(options) {
    try {
      const { to, subject, text, html } = options;

      console.log('[EMAIL-SERVICE] Preparing to send email to:', to);

      // Get settings
      const settings = await Settings.getSettings();
      const emailSettings = settings?.emailSettings;
      const notificationSettings = settings?.notificationSettings;

      // Check if email notifications are enabled
      if (!notificationSettings?.emailNotifications) {
        console.log('[EMAIL-SERVICE] ⚠️ Email notifications disabled in settings');
        return { success: false, reason: 'Email notifications disabled' };
      }

      // Get transporter
      const transporter = await this.getTransporter();
      if (!transporter) {
        console.error('[EMAIL-SERVICE] ❌ No transporter available');
        return { success: false, reason: 'Email not configured' };
      }

      // Prepare mail options
      const mailOptions = {
        from: `${emailSettings.fromName} <${emailSettings.fromEmail}>`,
        to,
        subject,
        text,
        html
      };

      console.log('[EMAIL-SERVICE] Sending email...');
      
      // Send email
      const info = await transporter.sendMail(mailOptions);

      console.log('[EMAIL-SERVICE] ✅ Email sent successfully:', {
        messageId: info.messageId,
        response: info.response
      });

      return {
        success: true,
        messageId: info.messageId
      };

    } catch (error) {
      console.error('[EMAIL-SERVICE] ❌ Error sending email:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(email, resetToken, resetUrl) {
    const html = `
      <h2>Password Reset Request</h2>
      <p>You requested a password reset. Click the link below to reset your password:</p>
      <a href="${resetUrl}" style="display: inline-block; padding: 10px 20px; background-color: #8B1A1A; color: white; text-decoration: none; border-radius: 5px;">
        Reset Password
      </a>
      <p>Or copy this link: <code>${resetUrl}</code></p>
      <p>This link expires in 1 hour.</p>
      <p>If you didn't request this, ignore this email.</p>
    `;

    return this.sendEmail({
      to: email,
      subject: 'Password Reset Request',
      text: `Reset your password using this link: ${resetUrl}`,
      html
    });
  }

  /**
   * Send welcome email
   */
  async sendWelcomeEmail(email, name) {
    const html = `
      <h2>Welcome to House of Transformation!</h2>
      <p>Hi ${name},</p>
      <p>Welcome to our community. We're excited to have you with us.</p>
      <p>Visit our website: <a href="https://houseoftransformation.com">houseoftransformation.com</a></p>
      <p>Best regards,<br>House of Transformation Team</p>
    `;

    return this.sendEmail({
      to: email,
      subject: 'Welcome to House of Transformation',
      text: `Welcome ${name}!`,
      html
    });
  }

  /**
   * Send contact form email
   */
  async sendContactFormEmail(contactData) {
    const { name, email, subject, message } = contactData;

    const settings = await Settings.getSettings();
    const adminEmail = settings?.contactEmail;

    const html = `
      <h2>New Contact Form Submission</h2>
      <p><strong>From:</strong> ${name}</p>
      <p><strong>Email:</strong> ${email}</p>
      <p><strong>Subject:</strong> ${subject}</p>
      <p><strong>Message:</strong></p>
      <p>${message.replace(/\n/g, '<br>')}</p>
    `;

    return this.sendEmail({
      to: adminEmail,
      subject: `New Contact Form: ${subject}`,
      text: message,
      html
    });
  }

  /**
   * Send admin notification (new donation, new volunteer, etc.)
   */
  async sendAdminNotification(type, data) {
    try {
      const settings = await Settings.getSettings();
      const adminEmail = settings?.contactEmail;
      const notificationSettings = settings?.notificationSettings;

      // Check if this notification type is enabled
      const notificationMap = {
        donation: 'notifyOnNewDonation',
        volunteer: 'notifyOnNewVolunteer',
        user: 'notifyOnNewUser'
      };

      const notificationKey = notificationMap[type];
      if (notificationKey && !notificationSettings?.[notificationKey]) {
        console.log(`[EMAIL-SERVICE] ${type} notifications disabled`);
        return { success: false, reason: `${type} notifications disabled` };
      }

      let subject = '';
      let html = '';

      switch(type) {
        case 'donation':
          subject = `New Donation - $${data.amount}`;
          html = `
            <h2>New Donation Received</h2>
            <p>Amount: $${data.amount}</p>
            <p>From: ${data.donorName || 'Anonymous'}</p>
            <p>Date: ${new Date().toLocaleString()}</p>
          `;
          break;

        case 'volunteer':
          subject = 'New Volunteer Application';
          html = `
            <h2>New Volunteer Application</h2>
            <p>Name: ${data.name}</p>
            <p>Email: ${data.email}</p>
            <p>Skills: ${data.skills}</p>
            <p>Date: ${new Date().toLocaleString()}</p>
          `;
          break;

        case 'user':
          subject = 'New User Registration';
          html = `
            <h2>New User Registered</h2>
            <p>Name: ${data.name}</p>
            <p>Email: ${data.email}</p>
            <p>Date: ${new Date().toLocaleString()}</p>
          `;
          break;
      }

      return this.sendEmail({
        to: adminEmail,
        subject,
        html
      });

    } catch (error) {
      console.error('[EMAIL-SERVICE] Error sending admin notification:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Test email connection
   */
  async testConnection() {
    try {
      console.log('[EMAIL-SERVICE] Testing email connection...');
      
      const settings = await Settings.getSettings();
      const emailSettings = settings?.emailSettings;

      if (!emailSettings?.smtpHost) {
        return {
          success: false,
          error: 'Email settings not configured'
        };
      }

      const transporter = nodemailer.createTransport({
        host: emailSettings.smtpHost,
        port: emailSettings.smtpPort,
        secure: emailSettings.smtpPort === 465,
        auth: {
          user: emailSettings.smtpUser,
          pass: emailSettings.smtpPassword
        }
      });

      await transporter.verify();
      
      console.log('[EMAIL-SERVICE] ✅ Email connection successful');
      return {
        success: true,
        message: 'Email connection successful'
      };

    } catch (error) {
      console.error('[EMAIL-SERVICE] ❌ Email connection failed:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

// Export singleton instance
module.exports = new EmailService();