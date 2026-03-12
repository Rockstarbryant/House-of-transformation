// server/services/pledgeReminderService.js
const { createClient } = require('@supabase/supabase-js');
const config = require('../config/env');

const supabase = createClient(config.SUPABASE_URL, config.SUPABASE_SERVICE_KEY);

// ── Helpers ───────────────────────────────────────────────────────────────────

function calcNextReminderAt(frequency, customDays) {
  var now  = new Date();
  var days = frequency === 'daily'  ? 1
           : frequency === 'weekly' ? 7
           : (customDays || 7);
  now.setDate(now.getDate() + days);
  return now.toISOString();
}

/**
 * Build a self-contained HTML email — no dependency on communicationService.buildHtml
 */
function buildReminderHtml(memberName, campaignTitle, pledged, paid, balance, dueDate) {
  var dueLine = dueDate
    ? '<p style="margin:0 0 8px;color:#374151;">Your pledge is due by <strong>' +
      new Date(dueDate).toLocaleDateString('en-KE', {
        timeZone: 'Africa/Nairobi', year: 'numeric', month: 'long', day: 'numeric'
      }) + '</strong>.</p>'
    : '';

  return '<!DOCTYPE html>' +
    '<html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>' +
    '<body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,sans-serif;">' +
    '<div style="max-width:600px;margin:40px auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">' +

      // Header
      '<div style="background:#8B1A1A;padding:32px 40px;">' +
        '<h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;">Pledge Reminder</h1>' +
        '<p style="margin:8px 0 0;color:#f9a8a8;font-size:14px;">House of Transformation</p>' +
      '</div>' +

      // Body
      '<div style="padding:40px;">' +
        '<p style="margin:0 0 16px;color:#374151;font-size:16px;">Dear <strong>' + memberName + '</strong>,</p>' +
        '<p style="margin:0 0 24px;color:#374151;">This is a friendly reminder about your pledge to the <strong>' + campaignTitle + '</strong> campaign.</p>' +

        // Stats table
        '<div style="background:#f9fafb;border-radius:8px;padding:24px;margin-bottom:24px;">' +
          '<table style="width:100%;border-collapse:collapse;">' +
            '<tr><td style="padding:6px 0;color:#6b7280;font-size:14px;">Total Pledged</td>' +
                '<td style="padding:6px 0;text-align:right;font-weight:700;color:#111827;">KES ' + Number(pledged).toLocaleString() + '</td></tr>' +
            '<tr><td style="padding:6px 0;color:#6b7280;font-size:14px;">Amount Paid</td>' +
                '<td style="padding:6px 0;text-align:right;font-weight:700;color:#059669;">KES ' + Number(paid).toLocaleString() + '</td></tr>' +
            '<tr style="border-top:2px solid #e5e7eb;">' +
                '<td style="padding:10px 0 0;color:#111827;font-size:15px;font-weight:700;">Balance Due</td>' +
                '<td style="padding:10px 0 0;text-align:right;font-weight:800;color:#dc2626;font-size:16px;">KES ' + Number(balance).toLocaleString() + '</td></tr>' +
          '</table>' +
        '</div>' +

        dueLine +

        '<p style="margin:0 0 24px;color:#374151;">You can make payment via M-Pesa through the member portal.</p>' +

        // CTA
        '<div style="text-align:center;margin-bottom:32px;">' +
          '<a href="' + (config.FRONTEND_URL || 'https://house-of-transformation.vercel.app') + '/portal/donations" ' +
             'style="display:inline-block;background:#8B1A1A;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:8px;font-weight:700;font-size:15px;">Make a Payment</a>' +
        '</div>' +

        '<p style="margin:0;color:#374151;">God bless you,<br><strong>House of Transformation</strong></p>' +
      '</div>' +

      // Footer
      '<div style="background:#f9fafb;padding:20px 40px;border-top:1px solid #e5e7eb;">' +
        '<p style="margin:0;color:#9ca3af;font-size:12px;text-align:center;">This reminder was sent because you made a pledge. If you have already paid, please disregard this message.</p>' +
      '</div>' +

    '</div></body></html>';
}

function buildReminderMessage(pledge, campaignTitle) {
  var paid    = Number(pledge.paid_amount    || 0);
  var pledged = Number(pledge.pledged_amount || 0);
  var balance = Number(pledge.remaining_amount != null ? pledge.remaining_amount : pledged - paid);

  var dueLine = pledge.due_date
    ? 'Your pledge is due by ' + new Date(pledge.due_date).toLocaleDateString('en-KE', {
        timeZone: 'Africa/Nairobi', year: 'numeric', month: 'long', day: 'numeric'
      }) + '.'
    : '';

  var textBody = [
    'Dear ' + pledge.member_name + ',',
    '',
    'This is a friendly reminder about your pledge to the ' + campaignTitle + ' campaign.',
    '',
    '  Total Pledged : KES ' + pledged.toLocaleString(),
    '  Amount Paid   : KES ' + paid.toLocaleString(),
    '  Balance Due   : KES ' + balance.toLocaleString(),
    '',
    dueLine,
    '',
    'Make payment via M-Pesa through the member portal.',
    '',
    'God bless you,',
    'House of Transformation'
  ].filter(function(l) { return l !== undefined; }).join('\n');

  return {
    subject:  'Pledge Reminder — ' + campaignTitle,
    htmlBody: buildReminderHtml(pledge.member_name, campaignTitle, pledged, paid, balance, pledge.due_date),
    textBody: textBody
  };
}

// ── Core processor ─────────────────────────────────────────────────────────────

async function processPledgeReminders(opts) {
  var forceAll = (opts && opts.forceAll) || false;
  console.log('[PledgeReminderService] Starting reminder run | forceAll:', forceAll);

  var query = supabase
    .from('pledges')
    .select('*, campaigns!inner(title)')
    .in('status', ['pending', 'partial'])
    .eq('reminder_enabled', true);

  if (!forceAll) {
    var now = new Date().toISOString();
    // Only pledges whose next reminder is due AND haven't hit their max
    query = query.lte('reminder_next_at', now);
  }

  var result = await query;
  var pledges = result.data;
  var fetchError = result.error;

  if (fetchError) {
    console.error('[PledgeReminderService] Fetch error:', fetchError.message);
    return { sent: 0, failed: 0, error: fetchError.message };
  }

  if (!pledges || pledges.length === 0) {
    console.log('[PledgeReminderService] No pledges due for reminders');
    return { sent: 0, failed: 0 };
  }

  // For scheduled runs (not forceAll), filter out pledges that already hit their max
  if (!forceAll) {
    pledges = pledges.filter(function(p) {
      return (p.reminder_sent_count || 0) < (p.reminder_max_count || 3);
    });
  }

  console.log('[PledgeReminderService] Processing', pledges.length, 'pledges');

  var communicationService = require('./communicationService');
  var sent   = 0;
  var failed = 0;

  for (var i = 0; i < pledges.length; i++) {
    var pledge = pledges[i];
    try {
      var campaignTitle = (pledge.campaigns && pledge.campaigns.title) || 'Donation Campaign';
      var msg      = buildReminderMessage(pledge, campaignTitle);
      var channels = pledge.reminder_channels || ['email'];

      // ── EMAIL ──────────────────────────────────────────────────────────────
      if (channels.indexOf('email') !== -1 && pledge.member_email) {
        await communicationService.sendEmailBatches(
          [{ email: pledge.member_email, name: pledge.member_name }],
          msg.subject,
          msg.htmlBody,   // ✅ built inline — no buildHtml dependency
          msg.textBody
        );
      }

      // ── SMS ────────────────────────────────────────────────────────────────
      if (channels.indexOf('sms') !== -1 && pledge.member_phone) {
        var paid2    = Number(pledge.paid_amount    || 0);
        var pledged2 = Number(pledge.pledged_amount || 0);
        var balance2 = Number(pledge.remaining_amount != null ? pledge.remaining_amount : pledged2 - paid2);

        var smsText = [
          'HOT Church Pledge Reminder',
          'Dear ' + pledge.member_name + ',',
          'Campaign: ' + campaignTitle,
          'Pledged: KES ' + pledged2.toLocaleString(),
          'Paid: KES '    + paid2.toLocaleString(),
          'Balance: KES ' + balance2.toLocaleString(),
          'Pay via portal. God bless!'
        ].join(' | ');

        await communicationService.sendSmsBatches(
          [{ phone: pledge.member_phone, name: pledge.member_name }],
          smsText
        );
      }

      // ── UPDATE pledge reminder counters ────────────────────────────────────
      var newCount   = (pledge.reminder_sent_count || 0) + 1;
      var maxReached = newCount >= (pledge.reminder_max_count || 3);

      await supabase
        .from('pledges')
        .update({
          reminder_sent_count:   newCount,
          reminder_last_sent_at: new Date().toISOString(),
          reminder_next_at: maxReached
            ? null
            : calcNextReminderAt(pledge.reminder_frequency || 'weekly', pledge.reminder_custom_days || 7)
        })
        .eq('id', pledge.id);

      sent++;
    } catch (err) {
      console.error('[PledgeReminderService] Failed for pledge', pledge.id, ':', err.message);
      failed++;
    }
  }

  console.log('[PledgeReminderService] Done — sent:', sent, '| failed:', failed);
  return { sent: sent, failed: failed };
}

module.exports = { processPledgeReminders, calcNextReminderAt, buildReminderMessage };