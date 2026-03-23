/**
 * membershipRoutes.js
 *
 * Mount in server.js:
 *   app.use('/api/members', require('./routes/membershipRoutes'));
 *
 * NOTE: Add 'manage:members' to the permissions enum in models/Role.js
 * and seed it to admin / relevant roles via scripts/seedRoles.js.
 */

const express = require('express');
const router  = express.Router();

const { protect }           = require('../middleware/supabaseAuth');
const { requirePermission } = require('../middleware/requirePermission');
const ctrl                  = require('../controllers/membershipController');

// ── Public ────────────────────────────────────────────────────────────────────
// POST /api/members          — submit new application (no JWT — called post-signup)
router.post('/', ctrl.submit);

// GET  /api/members/check/:email — check if application exists for email
router.get('/check/:email', ctrl.checkByEmail);

// ── Authenticated user — own application ─────────────────────────────────────
// GET  /api/members/me       — view own application status
router.get('/me', protect, ctrl.getMyMembership);

// ── Admin / manage:members ────────────────────────────────────────────────────
// GET  /api/members/stats    — counts by status
router.get(
  '/stats',
  protect,
  requirePermission('manage:members'),
  ctrl.getStats
);

// GET  /api/members          — paginated list (page, limit, status, search)
router.get(
  '/',
  protect,
  requirePermission('manage:members'),
  ctrl.getAll
);

// GET  /api/members/:id      — single record
router.get(
  '/:id',
  protect,
  requirePermission('manage:members'),
  ctrl.getOne
);

// PUT  /api/members/:id      — full edit
router.put(
  '/:id',
  protect,
  requirePermission('manage:members'),
  ctrl.update
);

// PATCH /api/members/:id/status  — approve / reject
router.patch(
  '/:id/status',
  protect,
  requirePermission('manage:members'),
  ctrl.updateStatus
);

// DELETE /api/members/:id    — delete record
router.delete(
  '/:id',
  protect,
  requirePermission('manage:members'),
  ctrl.remove
);

module.exports = router;