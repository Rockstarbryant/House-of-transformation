const nodemailer = require('nodemailer');

// Create transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});

// Verify connection
transporter.verify((error, success) => {
  if (error) {
    console.error('❌ Email service error:', error.message);
  } else {
    console.log('✓ Email service ready');
  }
});

const emailService = {
  /**
   * Send email verification link
   */
  async sendVerificationEmail(user, verificationToken) {
    try {
      const verificationUrl = `${process.env.FRONTEND_URL}/verify-email/${verificationToken}`;

      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: user.email,
        subject: 'Verify Your Email - House of Transformation',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #1e3a8a 0%, #dc2626 100%); color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0;">
              <h1 style="margin: 0;">House of Transformation</h1>
              <p style="margin: 5px 0 0 0;">Email Verification</p>
            </div>
            
            <div style="padding: 30px; background-color: #f9fafb; border-radius: 0 0 10px 10px;">
              <p>Hi ${user.name},</p>
              
              <p>Welcome to House of Transformation! Please verify your email address to complete your registration and access your account.</p>
              
              <div style="margin: 30px 0; text-align: center;">
                <a href="${verificationUrl}" style="display: inline-block; background-color: #1e3a8a; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">
                  Verify Email Address
                </a>
              </div>
              
              <p style="color: #666; font-size: 12px;">Or copy this link:</p>
              <p style="color: #666; font-size: 12px; word-break: break-all;">${verificationUrl}</p>
              
              <p style="color: #666; font-size: 12px;">This link will expire in 24 hours.</p>
              
              <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
              
              <p style="color: #999; font-size: 12px;">If you didn't create this account, please ignore this email.</p>
              
              <p style="color: #999; font-size: 12px;">© ${new Date().getFullYear()} House of Transformation. All rights reserved.</p>
            </div>
          </div>
        `
      };

      await transporter.sendMail(mailOptions);
      console.log(`✓ Verification email sent to ${user.email}`);
      return true;
    } catch (error) {
      console.error('Error sending verification email:', error);
      throw error;
    }
  },

  /**
   * Send password reset link
   */
  async sendPasswordResetEmail(user, resetToken) {
    try {
      const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;

      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: user.email,
        subject: 'Reset Your Password - House of Transformation',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #1e3a8a 0%, #dc2626 100%); color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0;">
              <h1 style="margin: 0;">House of Transformation</h1>
              <p style="margin: 5px 0 0 0;">Password Reset Request</p>
            </div>
            
            <div style="padding: 30px; background-color: #f9fafb; border-radius: 0 0 10px 10px;">
              <p>Hi ${user.name},</p>
              
              <p style="color: #dc2626; font-weight: bold;">You requested to reset your password.</p>
              
              <p>Click the button below to reset your password:</p>
              
              <div style="margin: 30px 0; text-align: center;">
                <a href="${resetUrl}" style="display: inline-block; background-color: #1e3a8a; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">
                  Reset Password
                </a>
              </div>
              
              <p style="color: #666; font-size: 12px;">Or copy this link:</p>
              <p style="color: #666; font-size: 12px; word-break: break-all;">${resetUrl}</p>
              
              <p style="color: #dc2626; font-size: 12px; font-weight: bold;">⚠️ This link will expire in 30 minutes.</p>
              
              <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
              
              <p style="color: #999; font-size: 12px;">If you didn't request a password reset, please ignore this email and your password will remain unchanged.</p>
              
              <p style="color: #999; font-size: 12px;">© ${new Date().getFullYear()} House of Transformation. All rights reserved.</p>
            </div>
          </div>
        `
      };

      await transporter.sendMail(mailOptions);
      console.log(`✓ Password reset email sent to ${user.email}`);
      return true;
    } catch (error) {
      console.error('Error sending password reset email:', error);
      throw error;
    }
  }
};

module.exports = emailService;