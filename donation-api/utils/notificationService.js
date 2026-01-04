// ============================================
// FILE 11: utils/notificationService.js (FIXED)
// ============================================
import nodemailer from 'nodemailer';

// Lazy load Twilio - only initialize when actually sending
let twilioClient = null;

const getTwilioClient = () => {
  if (!twilioClient && process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
    try {
      const twilio = require('twilio');
      twilioClient = twilio(
        process.env.TWILIO_ACCOUNT_SID,
        process.env.TWILIO_AUTH_TOKEN
      );
    } catch (error) {
      console.warn('Twilio not available:', error.message);
      return null;
    }
  }
  return twilioClient;
};

const emailTransporter = nodemailer.createTransport({
  host: 'smtp.sendgrid.net',
  port: 587,
  auth: {
    user: 'apikey',
    pass: process.env.SENDGRID_API_KEY || 'test_key'
  }
});

export const sendSMS = async (phoneNumber, message) => {
  try {
    const client = getTwilioClient();
    if (!client) {
      console.log('SMS would be sent to:', phoneNumber, message);
      return { success: true, messageSid: 'test_sms_' + Date.now() };
    }

    const response = await client.messages.create({
      body: message,
      from: process.env.TWILIO_FROM_NUMBER,
      to: phoneNumber
    });
    return { success: true, messageSid: response.sid };
  } catch (error) {
    console.error('SMS error:', error.message);
    return { success: false, error: error.message };
  }
};

export const sendWhatsApp = async (phoneNumber, message) => {
  try {
    const client = getTwilioClient();
    if (!client) {
      console.log('WhatsApp would be sent to:', phoneNumber, message);
      return { success: true, messageSid: 'test_whatsapp_' + Date.now() };
    }

    const response = await client.messages.create({
      body: message,
      from: `whatsapp:${process.env.TWILIO_FROM_NUMBER}`,
      to: `whatsapp:${phoneNumber}`
    });
    return { success: true, messageSid: response.sid };
  } catch (error) {
    console.error('WhatsApp error:', error.message);
    return { success: false, error: error.message };
  }
};

export const sendEmail = async (to, subject, html) => {
  try {
    if (!process.env.SENDGRID_API_KEY || process.env.SENDGRID_API_KEY === 'test_key') {
      console.log('Email would be sent to:', to, 'Subject:', subject);
      return { success: true, messageId: 'test_email_' + Date.now() };
    }

    const response = await emailTransporter.sendMail({
      from: process.env.SENDGRID_FROM_EMAIL || 'noreply@church.com',
      to,
      subject,
      html
    });
    return { success: true, messageId: response.messageId };
  } catch (error) {
    console.error('Email error:', error.message);
    return { success: false, error: error.message };
  }
};