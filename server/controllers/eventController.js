const Event = require('../models/Event');

// @desc    Get all events
// @route   GET /api/events
// @access  Public
exports.getEvents = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    
    const events = await Event.find({ date: { $gte: new Date() } })
      .sort({ date: 1 })
      .limit(limit);

    res.json({ success: true, events });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get single event
// @route   GET /api/events/:id
// @access  Public
exports.getEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }
    res.json({ success: true, event });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create event
// @route   POST /api/events
// @access  Private/Admin
exports.createEvent = async (req, res) => {
  try {
    const event = await Event.create(req.body);
    res.status(201).json({ success: true, event });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Register for event
// @route   POST /api/events/:id/register
// @access  Public (now accepts both authenticated and visitor registrations)

exports.registerForEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    // Check capacity if exists
    if (event.capacity && event.registrations.length >= event.capacity) {
      return res.status(400).json({ success: false, message: 'Event is full' });
    }

    // Handle visitor registration (no authentication required)
    if (req.body.visitorDetails) {
      const { name, email, phone, attendanceTime } = req.body.visitorDetails;
      
      // Check if visitor already registered (by email)
      const alreadyRegistered = event.registrations.some(
        reg => reg.visitorEmail === email
      );

      if (alreadyRegistered) {
        return res.status(400).json({ success: false, message: 'You are already registered for this event' });
      }

      event.registrations.push({
        isVisitor: true,
        visitorName: name,
        visitorEmail: email,
        visitorPhone: phone || '',
        attendanceTime: attendanceTime,
        registeredAt: new Date()
      });

      await event.save();

      return res.json({ 
        success: true, 
        message: 'Successfully registered as visitor',
        registration: {
          name,
          email,
          attendanceTime
        }
      });
    }

    // Handle authenticated user registration
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    // Check if already registered
    const alreadyRegistered = event.registrations.some(
      reg => reg.user && reg.user.toString() === req.user.id
    );

    if (alreadyRegistered) {
      return res.status(400).json({ success: false, message: 'Already registered for this event' });
    }

    event.registrations.push({ 
      user: req.user.id,
      isVisitor: false,
      registeredAt: new Date()
    });
    
    await event.save();

    res.json({ success: true, message: 'Successfully registered for event' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update event
// @route   PUT /api/events/:id
// @access  Private/Admin
exports.updateEvent = async (req, res) => {
  try {
    const event = await Event.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }
    res.json({ success: true, event });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete event
// @route   DELETE /api/events/:id
// @access  Private/Admin
exports.deleteEvent = async (req, res) => {
  try {
    const event = await Event.findByIdAndDelete(req.params.id);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }
    res.json({ success: true, message: 'Event deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};