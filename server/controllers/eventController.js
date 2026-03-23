const Event = require('../models/Event');

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Strip all PII from the registrations array.
 * Public responses only receive the count — nothing else.
 */
const sanitizeForPublic = (event) => {
  const obj = event.toObject ? event.toObject() : { ...event };
  obj.registrationCount = obj.registrations?.length ?? 0;
  delete obj.registrations; // ← remove ALL member/visitor PII
  return obj;
};

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC ROUTES  (no auth required)
// ─────────────────────────────────────────────────────────────────────────────

// @desc    Get all upcoming events  (PUBLIC — no PII)
// @route   GET /api/events
// @access  Public
exports.getEvents = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;

    const events = await Event.find({ date: { $gte: new Date() } })
      .sort({ date: 1 })
      .limit(limit)
      .select('-registrations'); // ← never load registrations at DB level

    res.json({ success: true, events });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get single event  (PUBLIC — no PII)
// @route   GET /api/events/:id
// @access  Public
exports.getEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id).select('-registrations');
    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }
    res.json({ success: true, event });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Register for event  (PUBLIC — accepts auth users and visitors)
// @route   POST /api/events/:id/register
// @access  Public
exports.registerForEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    // Check capacity
    if (event.capacity && event.registrations.length >= event.capacity) {
      return res.status(400).json({ success: false, message: 'Event is full' });
    }

    // ── Visitor registration ──────────────────────────────────────────────────
    if (req.body.visitorDetails) {
      const { name, email, phone, attendanceTime } = req.body.visitorDetails;

      if (!name || !email) {
        return res.status(400).json({ success: false, message: 'Name and email are required' });
      }

      // Normalise email for duplicate check
      const normEmail = email.trim().toLowerCase();

      const alreadyRegistered = event.registrations.some(
        (reg) => reg.visitorEmail?.toLowerCase() === normEmail
      );
      if (alreadyRegistered) {
        return res.status(400).json({ success: false, message: 'You are already registered for this event' });
      }

      event.registrations.push({
        isVisitor: true,
        visitorName: name.trim(),
        visitorEmail: normEmail,
        visitorPhone: phone?.trim() || '',
        attendanceTime: attendanceTime || '',
        registeredAt: new Date(),
      });

      await event.save();

      // Return ONLY what the registrant needs — no list of other attendees
      return res.json({
        success: true,
        message: 'Successfully registered as visitor',
        registration: { name, attendanceTime },
      });
    }

    // ── Authenticated user registration ───────────────────────────────────────
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const alreadyRegistered = event.registrations.some(
      (reg) => reg.user && reg.user.toString() === req.user.id
    );
    if (alreadyRegistered) {
      return res.status(400).json({ success: false, message: 'Already registered for this event' });
    }

    event.registrations.push({
      user: req.user.id,
      isVisitor: false,
      registeredAt: new Date(),
    });

    await event.save();

    res.json({ success: true, message: 'Successfully registered for event' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN / PROTECTED ROUTES  (require auth + manage:events permission)
// ─────────────────────────────────────────────────────────────────────────────

// @desc    Get all events (admin view — includes registration count only, not PII)
// @route   GET /api/events/admin
// @access  Private — manage:events
exports.getEventsAdmin = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;

    const events = await Event.find()
      .sort({ date: 1 })
      .limit(limit)
      .populate('registrations.user', 'name email'); // safe — only for admins

    res.json({ success: true, events });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get registrations for a single event  (ADMIN ONLY)
// @route   GET /api/events/:id/registrations
// @access  Private — manage:events
exports.getEventRegistrations = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id)
      .populate('registrations.user', 'name email phone');

    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    // Shape the response so both visitor and member rows have consistent fields
    const registrations = event.registrations.map((reg) => ({
      _id: reg._id,
      isVisitor: reg.isVisitor,
      name: reg.isVisitor ? reg.visitorName : reg.user?.name ?? 'Member',
      email: reg.isVisitor ? reg.visitorEmail : reg.user?.email ?? '—',
      phone: reg.isVisitor ? reg.visitorPhone : reg.user?.phone ?? '—',
      attendanceTime: reg.attendanceTime || event.time || '—',
      registeredAt: reg.registeredAt,
    }));

    res.json({
      success: true,
      eventTitle: event.title,
      eventDate: event.date,
      capacity: event.capacity,
      totalRegistrations: registrations.length,
      registrations,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create event
// @route   POST /api/events
// @access  Private — manage:events
exports.createEvent = async (req, res) => {
  try {
    const event = await Event.create(req.body);
    res.status(201).json({ success: true, event });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update event
// @route   PUT /api/events/:id
// @access  Private — manage:events
exports.updateEvent = async (req, res) => {
  try {
    const event = await Event.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }
    res.json({ success: true, event });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete event
// @route   DELETE /api/events/:id
// @access  Private — manage:events
exports.deleteEvent = async (req, res) => {
  try {
    const event = await Event.findByIdAndDelete(req.params.id);
    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }
    res.json({ success: true, message: 'Event deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};