const express = require('express');
const {
  // Public
  getEvents,
  getEvent,
  registerForEvent,
  // Admin
  getEventsAdmin,
  getEventRegistrations,
  createEvent,
  updateEvent,
  deleteEvent,
} = require('../controllers/eventController');
const { protect } = require('../middleware/supabaseAuth');
const { requirePermission } = require('../middleware/requirePermission');

const router = express.Router();

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC routes  (no PII ever returned)
// ─────────────────────────────────────────────────────────────────────────────
router.get('/', getEvents);           // upcoming events — count only, no registrations
router.get('/:id', getEvent);         // single event — no registrations
router.post('/:id/register', registerForEvent); // open registration

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN routes  (require authentication + manage:events permission)
// ─────────────────────────────────────────────────────────────────────────────
router.get(
  '/admin/all',
  protect,
  requirePermission('manage:events'),
  getEventsAdmin
);

// ⚠ Full PII — names, emails, phones — only for authorised admins
router.get(
  '/:id/registrations',
  protect,
  requirePermission('manage:events'),
  getEventRegistrations
);

router.post(
  '/',
  protect,
  requirePermission('manage:events'),
  createEvent
);

router.put(
  '/:id',
  protect,
  requirePermission('manage:events'),
  updateEvent
);

router.delete(
  '/:id',
  protect,
  requirePermission('manage:events'),
  deleteEvent
);

module.exports = router;