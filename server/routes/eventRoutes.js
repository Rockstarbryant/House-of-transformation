const express = require('express');
const {
  getEvents,
  getEvent,
  createEvent,
  updateEvent,
  deleteEvent,
  registerForEvent
} = require('../controllers/eventController');
const { protect } = require('../middleware/supabaseAuth');
const { requirePermission } = require('../middleware/requirePermission');

const router = express.Router();

router.route('/')
  .get(getEvents)
  .post(protect, requirePermission('manage:events'), createEvent);

router.route('/:id')
  .get(getEvent)
  .put(protect, requirePermission('manage:events'), updateEvent)
  .delete(protect, requirePermission('manage:events'), deleteEvent);

router.post('/:id/register', registerForEvent);

module.exports = router;