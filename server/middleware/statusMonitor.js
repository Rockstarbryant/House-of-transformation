/**
 * express-status-monitor — Real-Time Server Dashboard
 *
 * Mounts a live /status page showing CPU %, memory, requests/sec,
 * and response time percentiles.
 *
 * Uses polling (not WebSockets) — avoids the need for an http.Server
 * instance, which caused the app.listen() callback to hang silently
 * in express-status-monitor v1.3.4.
 *
 * Usage in server.js:
 *   const { statusMonitor } = require('./middleware/statusMonitor');
 *   app.use(statusMonitor);   // mount before body parsers
 */

let statusMonitorPkg;
try {
  statusMonitorPkg = require('express-status-monitor');
} catch {
  console.warn('[StatusMonitor] express-status-monitor not installed — /status disabled');
  module.exports = { statusMonitor: (req, res, next) => next() };
  return;
}

// ─── Basic auth — skipped in development ─────────────────────────────────────
function basicAuth(req, res, next) {
  if (process.env.NODE_ENV === 'development') return next();

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Basic ')) {
    res.set('WWW-Authenticate', 'Basic realm="H.O.T Church Status"');
    return res.status(401).send('Authentication required');
  }

  const [user, pass] = Buffer.from(authHeader.slice(6), 'base64')
    .toString()
    .split(':');

  const AUTH_USER = process.env.STATUS_USER || 'admin';
  const AUTH_PASS = process.env.STATUS_PASS || 'changeme';

  if (user === AUTH_USER && pass === AUTH_PASS) return next();

  res.set('WWW-Authenticate', 'Basic realm="H.O.T Church Status"');
  return res.status(401).send('Invalid credentials');
}

// ─── Initialise with NO server option ─────────────────────────────────────────
// Passing `server` to express-status-monitor causes it to set up a WebSocket
// synchronously inside the app.listen() callback, which hangs v1.3.4.
// Without it the package polls via regular HTTP — charts still update live.
const monitor = statusMonitorPkg({
  title:    'H.O.T Church API — Status',
  path:     '/status',
  spans: [
    { interval: 1,  retention: 60 },
    { interval: 5,  retention: 60 },
    { interval: 15, retention: 60 },
    { interval: 60, retention: 60 },
  ],
  healthChecks: [
    {
      protocol: 'http',
      host:     'localhost',
      port:     process.env.PORT || 5000,
      path:     '/api/health',
    },
  ],
  ignoreStartsWith: '/status',
});

// The package registers GET /status itself via `path` above.
// We wrap that route with basicAuth by intercepting it here.
// In development basicAuth is a no-op so /status opens without a password.
module.exports = {
  statusMonitor: [basicAuth, monitor],
};