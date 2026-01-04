// ============================================
// FILE 34: utils/emailTemplates.js
// (Email templates for notifications)
// ============================================
export const pledgeConfirmationEmail = (memberName, campaign, pledgeAmount, dueDate) => `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; background: #f5f5f5; }
    .container { max-width: 600px; margin: 20px auto; background: white; padding: 30px; border-radius: 10px; }
    .header { color: #0066cc; text-align: center; border-bottom: 3px solid #0066cc; padding-bottom: 20px; }
    .content { color: #333; line-height: 1.6; margin: 20px 0; }
    .details { background: #f9f9f9; padding: 15px; border-left: 4px solid #0066cc; margin: 20px 0; }
    .footer { text-align: center; color: #999; font-size: 12px; margin-top: 30px; }
    .btn { display: inline-block; background: #0066cc; color: white; padding: 10px 20px; border-radius: 5px; text-decoration: none; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>✅ Pledge Confirmed</h1>
    </div>
    
    <div class="content">
      <p>Dear ${memberName},</p>
      <p>Thank you for your generous pledge! Your commitment to our mission makes a difference.</p>
      
      <div class="details">
        <p><strong>Campaign:</strong> ${campaign.name}</p>
        <p><strong>Your Pledge:</strong> KES ${pledgeAmount.toLocaleString()}</p>
        <p><strong>Due Date:</strong> ${new Date(dueDate).toLocaleDateString()}</p>
        <p><strong>Impact:</strong> ${campaign.impactStatement}</p>
      </div>

      <p>You can now make payments through our dashboard whenever you're ready. Every contribution brings us closer to our goal!</p>

      <p style="text-align: center;">
        <a href="http://localhost:3000/donations/dashboard" class="btn">View Dashboard</a>
      </p>

      <p>If you have any questions, please don't hesitate to reach out to our team.</p>
      
      <p>With gratitude,<br><strong>Your Church Team</strong></p>
    </div>

    <div class="footer">
      <p>This email contains confidential information. Your data is protected under our privacy policy.</p>
    </div>
  </div>
</body>
</html>
`;

export const paymentConfirmationEmail = (memberName, amount, campaignName, remaining) => `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; background: #f5f5f5; }
    .container { max-width: 600px; margin: 20px auto; background: white; padding: 30px; border-radius: 10px; }
    .header { background: linear-gradient(135deg, #0066cc 0%, #004499 100%); color: white; text-align: center; padding: 20px; border-radius: 5px; }
    .success { color: #27ae60; font-size: 24px; }
    .details { background: #f9f9f9; padding: 15px; margin: 20px 0; border-radius: 5px; }
    .footer { text-align: center; color: #999; font-size: 12px; margin-top: 30px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <p class="success">✓ Payment Received</p>
      <h1>Thank You!</h1>
    </div>

    <div class="content">
      <p>Dear ${memberName},</p>
      <p>Your payment has been successfully processed. We're grateful for your generosity!</p>

      <div class="details">
        <p><strong>Amount Paid:</strong> <span style="color: #27ae60; font-size: 18px;">KES ${amount.toLocaleString()}</span></p>
        <p><strong>Campaign:</strong> ${campaignName}</p>
        <p><strong>Remaining Balance:</strong> KES ${remaining.toLocaleString()}</p>
        <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
      </div>

      <p style="background: #e8f5e9; padding: 15px; border-radius: 5px; border-left: 4px solid #27ae60;">
        💡 Your contribution is making a real impact in our community. Thank you for standing with us!
      </p>

      <p style="text-align: center; margin: 30px 0;">
        <a href="http://localhost:3000/donations/dashboard" style="color: #0066cc; text-decoration: none; font-weight: bold;">View Dashboard →</a>
      </p>
    </div>

    <div class="footer">
      <p>Automated payment confirmation. Please keep this email for your records.</p>
    </div>
  </div>
</body>
</html>
`;

export const campaignEndEmail = (memberName, campaignName, totalRaised, goal, raised, balance) => `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; background: #f5f5f5; }
    .container { max-width: 600px; margin: 20px auto; background: white; padding: 30px; border-radius: 10px; }
    .banner { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; padding: 20px; border-radius: 5px; text-align: center; }
    .stats { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin: 20px 0; }
    .stat-box { background: #f9f9f9; padding: 15px; border-radius: 5px; text-align: center; }
    .stat-value { font-size: 24px; font-weight: bold; color: #0066cc; }
    .impact { background: #fff3cd; padding: 15px; border-left: 4px solid #ffc107; margin: 20px 0; border-radius: 5px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="banner">
      <h1>Campaign Complete! 🎉</h1>
    </div>

    <p>Dear ${memberName},</p>
    <p>Our campaign "${campaignName}" has concluded. Here's what we accomplished together:</p>

    <div class="stats">
      <div class="stat-box">
        <p style="color: #999; font-size: 12px;">AMOUNT RAISED</p>
        <div class="stat-value">KES ${totalRaised.toLocaleString()}</div>
      </div>
      <div class="stat-box">
        <p style="color: #999; font-size: 12px;">OUR GOAL</p>
        <div class="stat-value">KES ${goal.toLocaleString()}</div>
      </div>
    </div>

    <p style="text-align: center; color: #27ae60; font-weight: bold;">
      ✓ ${raised}% of our goal achieved!
    </p>

    <div class="impact">
      <h3 style="color: #333; margin-top: 0;">🌟 Your Impact</h3>
      <p>
        Because of generous givers like you, we were able to:
      </p>
      <ul style="color: #555;">
        <li>Support our ministry expansion</li>
        <li>Serve our community better</li>
        <li>Transform lives through our programs</li>
      </ul>
      <p style="margin-bottom: 0;">
        <strong>Thank you for making a difference. God bless you abundantly! 🙏</strong>
      </p>
    </div>

    <p>Watch for our next campaign coming soon!</p>
    <p>With gratitude,<br><strong>Your Church Team</strong></p>
  </div>
</body>
</html>
`;