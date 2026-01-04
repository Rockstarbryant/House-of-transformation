// ============================================
// FILE 20: utils/reportService.js
// ============================================
import Payment from '../models/Payment.js';
import Pledge from '../models/Pledge.js';
import Campaign from '../models/Campaign.js';

export const generatePaymentReport = async (campaignId) => {
  try {
    const campaign = await Campaign.findById(campaignId);
    const payments = await Payment.find({
      campaignId,
      status: 'success'
    }).populate('memberId', 'name email phone');

    const report = {
      campaign: campaign.name,
      dateGenerated: new Date().toISOString(),
      totalPayments: payments.length,
      totalAmount: payments.reduce((sum, p) => sum + p.amount, 0),
      payments: payments.map(p => ({
        date: p.completedAt,
        memberName: p.memberId.name,
        memberPhone: p.memberId.phone,
        amount: p.amount,
        method: p.paymentMethod,
        mpesaRef: p.mpesaRef || 'N/A',
        receipt: p.mpesaReceiptNumber || 'N/A'
      }))
    };

    return report;
  } catch (error) {
    throw new Error('Report generation failed: ' + error.message);
  }
};

export const generateCSV = (payments) => {
  const headers = ['Date', 'Name', 'Phone', 'Amount', 'Method', 'M-Pesa Ref', 'Receipt'];
  const rows = payments.map(p => [
    new Date(p.date).toLocaleDateString(),
    p.memberName,
    p.memberPhone,
    p.amount,
    p.method,
    p.mpesaRef,
    p.receipt
  ]);

  const csv = [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n');

  return csv;
};