// ============================================
// FILE 33: utils/whatsappBot.js
// (WhatsApp Bot Integration)
// ============================================
import twilio from 'twilio';
import rateLimit from 'express-rate-limit';
import Pledge from '../models/Pledge.js';

const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

// Rate limiting: 5 requests per minute per phone
const whatsappLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  keyGenerator: (req) => req.body.From
});

export const handleWhatsAppMessage = async (req, res) => {
  try {
    const { From, Body } = req.body;
    const phoneNumber = From.replace('whatsapp:', '');

    // Parse command
    const command = Body.toLowerCase().trim().split(' ')[0];

    let response = '';

    switch(command) {
      case 'balance':
        const pledges = await Pledge.find({ memberPhone: phoneNumber })
          .populate('campaignId', 'name');
        
        if (pledges.length === 0) {
          response = 'No active pledges found. To make a pledge, visit our website: church.com/donations';
        } else {
          response = 'Your Pledges:\n\n';
          pledges.forEach(p => {
            response += `📌 ${p.campaignId.name}\n`;
            response += `Pledged: KES ${p.pledgedAmount}\n`;
            response += `Remaining: KES ${p.remainingAmount}\n\n`;
          });
        }
        break;

      case 'help':
        response = `Hello! 👋\n\nCommands:\n`;
        response += `📊 balance - View your pledges\n`;
        response += `🤝 help - Show this menu\n`;
        response += `💬 message - Send a message to admin\n\n`;
        response += `Visit: church.com/donations`;
        break;

      case 'message':
        response = 'Please type your message and we\'ll forward it to our team. Reply to this message.';
        break;

      default:
        response = `Sorry, I didn't understand that. Type 'help' for available commands.`;
    }

    // Send WhatsApp response
    await twilioClient.messages.create({
      from: `whatsapp:${process.env.TWILIO_FROM_NUMBER}`,
      to: From,
      body: response
    });

    res.json({ success: true });
  } catch (error) {
    console.error('WhatsApp bot error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};