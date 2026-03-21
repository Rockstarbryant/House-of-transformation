/**
 * Sentry — Node.js / Express Initialisation
 *
 * IMPORTANT: This file must be required as the VERY FIRST import in server.js,
 * before any other requires (including express, mongoose, etc.)
 *
 *   // server.js — line 1
 *   require('./config/sentry');
 *
 * Free tier limits (more than enough for H.O.T Church):
 *   - 5,000 errors / month
 *   - 10,000 performance transactions / month
 *   - 1 GB attachment storage
 *   - 90-day data retention
 */

const Sentry = require('@sentry/node');
const { nodeProfilingIntegration } = require('@sentry/profiling-node');

// Only initialise when a DSN is present (skips local dev if you haven't set it)
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,

    environment: process.env.NODE_ENV || 'development',

    integrations: [
      // Auto-instruments Express routes, DB queries, HTTP calls
      Sentry.expressIntegration(),
      // Captures CPU profiles alongside performance traces
      nodeProfilingIntegration(),
      // Captures console.error calls as breadcrumbs
      Sentry.consoleIntegration(),
      // Links DB queries to the transaction that triggered them
      Sentry.mongoIntegration(),
    ],

    // Capture 100% of transactions in dev, 10% in production.
    // The free tier gives 10k transactions/month — 10% of church traffic
    // is plenty for meaningful performance data.
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

    // Profile 100% of sampled transactions
    profilesSampleRate: 1.0,

    // Scrub sensitive fields from error payloads before they leave the server
    beforeSend(event) {
      // Strip password fields from request data
      if (event.request?.data) {
        const sensitiveFields = [
          'password', 'confirmPassword', 'currentPassword',
          'newPassword', 'token', 'refreshToken',
          'mpesaConsumerKey', 'mpesaConsumerSecret', 'mpesaPasskey',
          'smtpPassword', 'apiKey',
        ];
        const data = event.request.data;
        if (typeof data === 'object' && data !== null) {
          sensitiveFields.forEach((field) => {
            if (field in data) data[field] = '[Filtered]';
          });
        }
      }
      return event;
    },

    // Attach user info (set via Sentry.setUser in protect middleware)
    sendDefaultPii: false, // we attach PII manually via setUser, not automatically
  });

  console.log(`[Sentry] Initialised (env: ${process.env.NODE_ENV}, tracesSampleRate: ${process.env.NODE_ENV === 'production' ? '10%' : '100%'})`);
} else {
  console.warn('[Sentry] SENTRY_DSN not set — error tracking disabled');
}

module.exports = Sentry;