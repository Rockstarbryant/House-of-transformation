// server/services/campaignThankYouService.js
const { createClient } = require('@supabase/supabase-js');
const config = require('../config/env');

const supabase = createClient(config.SUPABASE_URL, config.SUPABASE_SERVICE_KEY);

// ── HTML builder (no dependency on communicationService.buildHtml) ──────────

function buildThankYouHtml(recipientName, campaignTitle, bodyRows, personalSection) {
  return '<!DOCTYPE html>' +
    '<html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>' +
    '<body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,sans-serif;">' +
    '<div style="max-width:600px;margin:40px auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">' +

      // Header
      '<div style="background:#8B1A1A;padding:32px 40px;">' +
        '<h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;">🎉 Campaign Complete!</h1>' +
        '<p style="margin:8px 0 0;color:#f9a8a8;font-size:14px;">House of Transformation</p>' +
      '</div>' +

      // Body
      '<div style="padding:40px;">' +
        '<p style="margin:0 0 16px;color:#374151;font-size:16px;">Dear <strong>' + recipientName + '</strong>,</p>' +
        '<p style="margin:0 0 24px;color:#374151;">The <strong>' + campaignTitle + '</strong> campaign has reached completion! ' +
        'We are deeply grateful for your support and generosity.</p>' +

        // Campaign stats table
        '<p style="margin:0 0 10px;color:#111827;font-weight:700;font-size:15px;">Campaign Results</p>' +
        '<div style="background:#f9fafb;border-radius:8px;padding:20px;margin-bottom:20px;">' +
          '<table style="width:100%;border-collapse:collapse;">' +
            bodyRows +
          '</table>' +
        '</div>' +

        // Personal section
        '<p style="margin:0 0 10px;color:#111827;font-weight:700;font-size:15px;">Your Contribution</p>' +
        '<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:20px;margin-bottom:24px;">' +
          '<table style="width:100%;border-collapse:collapse;">' +
            personalSection +
          '</table>' +
        '</div>' +

        '<p style="margin:0 0 24px;color:#374151;">Your generosity has made a real difference. ' +
        'Thank you for being part of this journey with us.</p>' +

        '<p style="margin:0;color:#374151;">With gratitude,<br><strong>House of Transformation</strong></p>' +
      '</div>' +

      // Footer
      '<div style="background:#f9fafb;padding:20px 40px;border-top:1px solid #e5e7eb;">' +
        '<p style="margin:0;color:#9ca3af;font-size:12px;text-align:center;">' +
        'You are receiving this because you participated in the ' + campaignTitle + ' campaign.</p>' +
      '</div>' +

    '</div></body></html>';
}

function tableRow(label, value, highlight) {
  return '<tr>' +
    '<td style="padding:6px 0;color:#6b7280;font-size:14px;">' + label + '</td>' +
    '<td style="padding:6px 0;text-align:right;font-weight:700;color:' + (highlight || '#111827') + ';">' + value + '</td>' +
    '</tr>';
}

function formatKes(amount) {
  return 'KES ' + Number(amount || 0).toLocaleString();
}

// ── Main service ──────────────────────────────────────────────────────────────

async function queueCampaignThankYou(campaign) {
  if (!campaign.supabaseId) {
    console.warn('[ThankYouService] Campaign has no supabaseId, skipping');
    return;
  }

  const communicationService = require('./communicationService');

  // ── Shared campaign stats ─────────────────────────────────────────────────
  const { data: allContributions } = await supabase
    .from('contributions')
    .select('amount')
    .eq('campaign_id', campaign.supabaseId)
    .eq('status', 'verified');

  const { data: allPledges } = await supabase
    .from('pledges')
    .select('paid_amount')
    .eq('campaign_id', campaign.supabaseId)
    .not('status', 'eq', 'cancelled');

  const goalAmount          = Number(campaign.goalAmount || 0);
  const totalContributions  = (allContributions || []).reduce((s, c) => s + Number(c.amount || 0), 0);
  const totalPledgePaid     = (allPledges       || []).reduce((s, p) => s + Number(p.paid_amount || 0), 0);
  const totalRaised         = totalContributions + totalPledgePaid;
  const percentAchieved     = goalAmount > 0 ? Math.round((totalRaised / goalAmount) * 100) : 0;
  const totalParticipants   = (allContributions || []).length + (allPledges || []).length;

  const campaignRows =
    tableRow('Goal Amount',    formatKes(goalAmount)) +
    tableRow('Total Raised',   formatKes(totalRaised),  '#059669') +
    tableRow('% Achieved',     percentAchieved + '%',   '#059669') +
    tableRow('Participants',   totalParticipants + ' generous members');

  let totalSent = 0;

  // ═══════════════════════════════════════════════════════════════════════════
  // PART 1 — Direct Contributors
  // ═══════════════════════════════════════════════════════════════════════════
  const { data: contributors, error: contribErr } = await supabase
    .from('contributions')
    .select('contributor_name, contributor_email, contributor_phone, amount, is_anonymous')
    .eq('campaign_id', campaign.supabaseId)
    .eq('status', 'verified')
    .not('contributor_email', 'is', null);

  if (contribErr) {
    console.error('[ThankYouService] Contributors fetch error:', contribErr.message);
  }

  console.log('[ThankYouService] Sending to', (contributors || []).length, 'contributors');

  for (var i = 0; i < (contributors || []).length; i++) {
    var contributor = contributors[i];
    try {
      var recipientName   = contributor.is_anonymous ? 'Friend' : (contributor.contributor_name || 'Friend');
      var personalAmount  = Number(contributor.amount || 0);
      var subject         = 'Thank You for Supporting ' + campaign.title + '!';

      var personalRows = tableRow('Your Contribution', formatKes(personalAmount), '#059669');

      var htmlBody = buildThankYouHtml(recipientName, campaign.title, campaignRows, personalRows);

      var textBody = [
        'Dear ' + recipientName + ',',
        '',
        'The ' + campaign.title + ' campaign has reached completion!',
        '',
        'Campaign Results:',
        '  Goal Amount    : ' + formatKes(goalAmount),
        '  Total Raised   : ' + formatKes(totalRaised) + ' (' + percentAchieved + '% of goal)',
        '  Participants   : ' + totalParticipants + ' generous members',
        '',
        'Your Contribution:',
        '  Amount Given   : ' + formatKes(personalAmount),
        '',
        'Your generosity has made a real difference. Thank you for being part of this journey.',
        '',
        'With gratitude,',
        'House of Transformation'
      ].join('\n');

      if (contributor.contributor_email) {
        await communicationService.sendEmailBatches(
          [{ email: contributor.contributor_email, name: recipientName }],
          subject, htmlBody, textBody
        );
        totalSent++;
      }

      if (contributor.contributor_phone) {
        var smsText = [
          campaign.title + ' campaign complete!',
          'Goal: ' + formatKes(goalAmount),
          'Total raised: ' + formatKes(totalRaised) + ' (' + percentAchieved + '%)',
          'Your contribution: ' + formatKes(personalAmount),
          'Thank you! - HOT Church'
        ].join(' | ');

        await communicationService.sendSmsBatches(
          [{ phone: contributor.contributor_phone, name: recipientName }],
          smsText
        );
      }

      await new Promise(function(r) { setTimeout(r, 200); });

    } catch (err) {
      console.error('[ThankYouService] Failed for contributor:', err.message);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PART 2 — Pledgers
  // ═══════════════════════════════════════════════════════════════════════════
  const { data: pledges, error: pledgeErr } = await supabase
    .from('pledges')
    .select('member_name, member_email, member_phone, pledged_amount, paid_amount, remaining_amount, status')
    .eq('campaign_id', campaign.supabaseId)
    .not('status', 'eq', 'cancelled')
    .not('member_email', 'is', null);

  if (pledgeErr) {
    console.error('[ThankYouService] Pledges fetch error:', pledgeErr.message);
  }

  console.log('[ThankYouService] Sending to', (pledges || []).length, 'pledgers');

  for (var j = 0; j < (pledges || []).length; j++) {
    var pledge = pledges[j];
    try {
      var pledgerName    = pledge.member_name  || 'Friend';
      var pledgedAmount  = Number(pledge.pledged_amount  || 0);
      var paidAmount     = Number(pledge.paid_amount     || 0);
      var balanceAmount  = Number(pledge.remaining_amount != null ? pledge.remaining_amount : pledgedAmount - paidAmount);
      var pledgeSubject  = 'Thank You for Your Pledge — ' + campaign.title + '!';

      // Build pledge-specific personal rows
      var pledgePersonalRows =
        tableRow('Total Pledged', formatKes(pledgedAmount)) +
        tableRow('Amount Paid',   formatKes(paidAmount),   '#059669') +
        (balanceAmount > 0
          ? tableRow('Outstanding Balance', formatKes(balanceAmount), '#dc2626')
          : tableRow('Status', '✅ Fully Paid', '#059669'));

      var pledgeHtmlBody = buildThankYouHtml(pledgerName, campaign.title, campaignRows, pledgePersonalRows);

      // Add balance note to HTML if outstanding
      if (balanceAmount > 0) {
        pledgeHtmlBody = pledgeHtmlBody.replace(
          'With gratitude,',
          '<p style="margin:0 0 16px;color:#374151;background:#fef3c7;border:1px solid #fcd34d;border-radius:8px;padding:12px;">' +
          '⚠️ You still have an outstanding balance of <strong>' + formatKes(balanceAmount) + '</strong>. ' +
          'You can still make payment via the member portal.</p>With gratitude,'
        );
      }

      var pledgeTextBody = [
        'Dear ' + pledgerName + ',',
        '',
        'The ' + campaign.title + ' campaign has reached completion!',
        'Thank you for your pledge and continued support.',
        '',
        'Campaign Results:',
        '  Goal Amount    : ' + formatKes(goalAmount),
        '  Total Raised   : ' + formatKes(totalRaised) + ' (' + percentAchieved + '% of goal)',
        '  Participants   : ' + totalParticipants + ' generous members',
        '',
        'Your Pledge Summary:',
        '  Total Pledged  : ' + formatKes(pledgedAmount),
        '  Amount Paid    : ' + formatKes(paidAmount),
        '  Balance        : ' + formatKes(balanceAmount),
        '',
        balanceAmount > 0
          ? 'You still have an outstanding balance. You can make payment via the member portal.'
          : 'Your pledge is fully paid. Thank you!',
        '',
        'With gratitude,',
        'House of Transformation'
      ].join('\n');

      if (pledge.member_email) {
        await communicationService.sendEmailBatches(
          [{ email: pledge.member_email, name: pledgerName }],
          pledgeSubject, pledgeHtmlBody, pledgeTextBody
        );
        totalSent++;
      }

      if (pledge.member_phone) {
        var pledgeSms = [
          campaign.title + ' campaign complete!',
          'Your pledge: ' + formatKes(pledgedAmount),
          'Paid: ' + formatKes(paidAmount),
          balanceAmount > 0 ? 'Balance: ' + formatKes(balanceAmount) : 'Fully paid ✅',
          'Thank you! - HOT Church'
        ].join(' | ');

        await communicationService.sendSmsBatches(
          [{ phone: pledge.member_phone, name: pledgerName }],
          pledgeSms
        );
      }

      await new Promise(function(r) { setTimeout(r, 200); });

    } catch (err) {
      console.error('[ThankYouService] Failed for pledger:', err.message);
    }
  }

  console.log('[ThankYouService] Total thank-you messages sent:', totalSent);
}

module.exports = { queueCampaignThankYou };