// ============================================
// FILE 19: routes/notificationRoutes.js
// ============================================
import express from 'express';
import Notification from '../models/Notification.js';
import Campaign from '../models/Campaign.js';
import Pledge from '../models/Pledge.js';
import { authenticate, adminOnly } from '../middleware/authMiddleware.js';
import { sendSMS, sendEmail, sendWhatsApp } from '../utils/notificationService.js';

const router = express.Router();

// Send campaign end notification (admin only)
router.post('/campaign-end/:campaignId', authenticate, adminOnly, async (req, res) => {
  try {
    const campaign = await Campaign.findById(req.params.campaignId);
    if (!campaign) {
      return res.status(404).json({ success: false, error: 'Campaign not found' });
    }

    const pledges = await Pledge.find({ campaignId: req.params.campaignId });
    const percentageRaised = (campaign.totalRaised / campaign.goalAmount) * 100;

    const message = `
Thank you for your generosity! Campaign "${campaign.name}" has concluded.

📊 Campaign Summary:
• Goal: KES ${campaign.goalAmount}
• Raised: KES ${campaign.totalRaised}
• Progress: ${Math.round(percentageRaised)}%

Your contributions have made a meaningful difference. 🙏

Impact: ${campaign.impactStatement || 'Your giving will support the ministry of the church.'}

May God bless you abundantly!
    `.trim();

    const emailHtml = `
    <h2>Campaign Concluded: ${campaign.name}</h2>
    <p>Thank you for your generosity!</p>
    <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <h3>Campaign Summary</h3>
      <p><strong>Goal:</strong> KES ${campaign.goalAmount}</p>
      <p><strong>Raised:</strong> KES ${campaign.totalRaised}</p>
      <p><strong>Progress:</strong> ${Math.round(percentageRaised)}%</p>
    </div>
    <p><strong>Impact:</strong> ${campaign.impactStatement || 'Your giving supports our ministry.'}</p>
    <p>May God bless you abundantly! 🙏</p>
    `;

    let sentCount = 0;
    let failedCount = 0;

    for (const pledge of pledges) {
      try {
        // Send SMS
        if (pledge.memberPhone) {
          const smsResult = await sendSMS(pledge.memberPhone, message);
          if (smsResult.success) {
            await Notification.create({
              pledgeId: pledge._id,
              campaignId: req.params.campaignId,
              memberId: pledge.memberId,
              type: 'campaign-end',
              channel: 'sms',
              message,
              recipientPhone: pledge.memberPhone,
              status: 'sent'
            });
            sentCount++;
          }
        }

        // Send Email
        if (pledge.memberEmail) {
          const emailResult = await sendEmail(
            pledge.memberEmail,
            `Campaign Concluded: ${campaign.name}`,
            emailHtml
          );
          if (emailResult.success) {
            await Notification.create({
              pledgeId: pledge._id,
              campaignId: req.params.campaignId,
              memberId: pledge.memberId,
              type: 'campaign-end',
              channel: 'email',
              message,
              recipientEmail: pledge.memberEmail,
              status: 'sent'
            });
            sentCount++;
          }
        }
      } catch (error) {
        failedCount++;
        console.error('Notification error:', error);
      }
    }

    // Mark campaign as ended
    campaign.status = 'ended';
    await campaign.save();

    res.json({
      success: true,
      message: `Notifications sent to ${sentCount} members. ${failedCount} failed.`,
      sent: sentCount,
      failed: failedCount
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Send payment reminder (admin only)
router.post('/send-reminder/:campaignId', authenticate, adminOnly, async (req, res) => {
  try {
    const campaign = await Campaign.findById(req.params.campaignId);
    if (!campaign) {
      return res.status(404).json({ success: false, error: 'Campaign not found' });
    }

    const pledges = await Pledge.find({
      campaignId: req.params.campaignId,
      status: { $ne: 'completed' }
    });

    const daysLeft = Math.ceil((campaign.endDate - new Date()) / (1000 * 60 * 60 * 24));

    const message = `
Hi! This is a friendly reminder for your pledge to "${campaign.name}"

📌 Your Pledge Details:
• Pledged Amount: KES ${pledges[0]?.pledgedAmount}
• Paid Amount: KES ${pledges[0]?.paidAmount}
• Remaining: KES ${pledges[0]?.remainingAmount}
• Days Left: ${daysLeft}

Your contribution matters! Please complete your payment when you can.
    `.trim();

    let sentCount = 0;

    for (const pledge of pledges) {
      try {
        if (pledge.memberPhone) {
          await sendSMS(pledge.memberPhone, message);
          sentCount++;
        }
      } catch (error) {
        console.error('SMS error:', error);
      }
    }

    res.json({
      success: true,
      message: `Reminders sent to ${sentCount} members`,
      sent: sentCount
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get notification history
router.get('/', authenticate, async (req, res) => {
  try {
    const query = req.user.role === 'admin' ? {} : { memberId: req.user._id };
    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .limit(50);
    res.json({ success: true, notifications });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;