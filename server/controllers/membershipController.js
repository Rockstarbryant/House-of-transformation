/**
 * membershipController.js
 *
 * NOTE: Before this controller is used in production, add 'manage:members'
 * to the permissions enum in models/Role.js so it can be assigned to roles.
 *
 * Endpoints:
 *  POST   /api/members           — public: submit an application
 *  GET    /api/members/check/:email — public: check if application exists
 *  GET    /api/members/me         — protected: own application status
 *  GET    /api/members/stats      — protected (manage:members): counts by status
 *  GET    /api/members            — protected (manage:members): paginated list
 *  GET    /api/members/:id        — protected (manage:members): single record
 *  PUT    /api/members/:id        — protected (manage:members): full update
 *  PATCH  /api/members/:id/status — protected (manage:members): approve / reject
 *  DELETE /api/members/:id        — protected (manage:members): hard delete
 */

const Membership   = require('../models/Membership');
const User         = require('../models/User');
const asyncHandler = require('../middleware/asyncHandler');

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/** Attempt to find and attach the User._id for the given email. */
const resolveUser = async (email) => {
  if (!email) return null;
  const user = await User.findOne({ email: email.toLowerCase() }).select('_id').lean();
  return user ? user._id : null;
};

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC ENDPOINTS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @route   POST /api/members
 * @access  Public (called right after signup — no JWT yet)
 * @desc    Submit a new membership application.
 *          One application per email is enforced.
 */
exports.submit = asyncHandler(async (req, res) => {
  const {
    fullName,
    email,
    phone,
    residentialAddress,
    postalAddress,
    dateOfBirth,
    maritalStatus,
    gender,
    children,
    memberSince,
    holySpiritBaptism,
    waterBaptism,
    waterBaptismDate,
    desiresRebaptism,
    departmentInterest,
    believesInJesus,
    idPassportNumber,
    signatureName,
    signatureDate,
  } = req.body;

  if (!email || !fullName) {
    return res.status(400).json({
      success: false,
      message: 'Full name and email are required',
    });
  }

  const normalizedEmail = email.trim().toLowerCase();

  // One application per email
  const existing = await Membership.findOne({ email: normalizedEmail });
  if (existing) {
    return res.status(409).json({
      success: false,
      message: 'A membership application has already been submitted for this email address',
      status: existing.status,
    });
  }

  // Try to link to existing User account and auto-sync profile fields
  const userId = await resolveUser(normalizedEmail);

  // ── Auto-sync phone, gender to User account if those fields are empty ──
  // This mirrors the email pre-fill behaviour — membership data enriches the profile.
  if (userId) {
    const syncFields = {};
    if (phone && phone.trim())                    syncFields.phone  = phone.trim();
    if (gender && ['male','female'].includes(gender)) syncFields.gender = gender;
    if (Object.keys(syncFields).length > 0) {
      // Only set fields that the user hasn't already filled in themselves
      const existing = await User.findById(userId).select('phone gender').lean();
      const toSet = {};
      if (syncFields.phone  && !existing?.phone)  toSet.phone  = syncFields.phone;
      if (syncFields.gender && !existing?.gender) toSet.gender = syncFields.gender;
      if (Object.keys(toSet).length > 0) {
        await User.findByIdAndUpdate(userId, { $set: toSet });
        console.log('[MEMBERSHIP] ✅ Auto-synced profile fields to user:', normalizedEmail, toSet);
      }
    }
  }

  const membership = await Membership.create({
    user:               userId,
    fullName:           fullName.trim(),
    email:              normalizedEmail,
    phone,
    residentialAddress,
    postalAddress,
    dateOfBirth:        dateOfBirth || null,
    maritalStatus:      maritalStatus || '',
    gender:             gender || '',
    children:           Array.isArray(children) ? children : [],
    memberSince,
    holySpiritBaptism,
    waterBaptism:       !!waterBaptism,
    waterBaptismDate:   waterBaptism && waterBaptismDate ? waterBaptismDate : null,
    desiresRebaptism:   !!desiresRebaptism,
    departmentInterest,
    believesInJesus:    believesInJesus === true || believesInJesus === 'true' ? true : false,
    idPassportNumber,
    signatureName,
    signatureDate:      signatureDate ? new Date(signatureDate) : new Date(),
    submittedAt:        new Date(),
  });

  res.status(201).json({
    success: true,
    message: 'Membership application submitted successfully. Our team will review it shortly.',
    data:    { id: membership._id, status: membership.status },
  });
});

/**
 * @route   GET /api/members/check/:email
 * @access  Public
 * @desc    Check whether an application exists for the given email.
 */
exports.checkByEmail = asyncHandler(async (req, res) => {
  const email = req.params.email?.trim().toLowerCase();
  if (!email) {
    return res.status(400).json({ success: false, message: 'Email is required' });
  }

  const membership = await Membership.findOne({ email })
    .select('status submittedAt')
    .lean();

  res.json({
    success: true,
    exists:  !!membership,
    status:  membership?.status || null,
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// AUTHENTICATED USER — OWN APPLICATION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @route   GET /api/members/me
 * @access  Protected (any authenticated user)
 * @desc    Get the current user's membership application.
 */
exports.getMyMembership = asyncHandler(async (req, res) => {
  const membership = await Membership.findOne({
    $or: [
      { user: req.user._id },
      { email: req.user.email?.toLowerCase() },
    ],
  }).lean();

  if (!membership) {
    return res.json({ success: true, exists: false, data: null });
  }

  res.json({ success: true, exists: true, data: membership });
});

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN / MANAGE:MEMBERS ENDPOINTS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @route   GET /api/members/stats
 * @access  Protected — manage:members
 */
exports.getStats = asyncHandler(async (req, res) => {
  const [total, pending, approved, rejected] = await Promise.all([
    Membership.countDocuments(),
    Membership.countDocuments({ status: 'pending' }),
    Membership.countDocuments({ status: 'approved' }),
    Membership.countDocuments({ status: 'rejected' }),
  ]);

  res.json({ success: true, data: { total, pending, approved, rejected } });
});

/**
 * @route   GET /api/members
 * @access  Protected — manage:members
 * @query   page, limit, status, search
 */
exports.getAll = asyncHandler(async (req, res) => {
  const page   = Math.max(1, parseInt(req.query.page)  || 1);
  const limit  = Math.min(100, parseInt(req.query.limit) || 20);
  const skip   = (page - 1) * limit;
  const status = req.query.status;
  const search = req.query.search?.trim();

  const query = {};
  if (status && ['pending', 'approved', 'rejected'].includes(status)) {
    query.status = status;
  }
  if (search) {
    query.$or = [
      { fullName: { $regex: search, $options: 'i' } },
      { email:    { $regex: search, $options: 'i' } },
      { phone:    { $regex: search, $options: 'i' } },
    ];
  }

  const [members, total] = await Promise.all([
    Membership.find(query)
      .sort({ submittedAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('user',       'name email avatar')
      .populate('reviewedBy', 'name email')
      .lean(),
    Membership.countDocuments(query),
  ]);

  res.json({
    success:    true,
    data:       members,
    pagination: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    },
  });
});

/**
 * @route   GET /api/members/:id
 * @access  Protected — manage:members
 */
exports.getOne = asyncHandler(async (req, res) => {
  const membership = await Membership.findById(req.params.id)
    .populate('user',       'name email avatar role')
    .populate('reviewedBy', 'name email')
    .lean();

  if (!membership) {
    return res.status(404).json({ success: false, message: 'Membership record not found' });
  }

  res.json({ success: true, data: membership });
});

/**
 * @route   PUT /api/members/:id
 * @access  Protected — manage:members
 * @desc    Full edit of a membership record (admin correction / data entry).
 */
exports.update = asyncHandler(async (req, res) => {
  const forbidden = ['status', 'reviewedBy', 'reviewedAt', 'user', 'email'];
  forbidden.forEach((f) => delete req.body[f]);

  const membership = await Membership.findByIdAndUpdate(
    req.params.id,
    { $set: req.body },
    { new: true, runValidators: true }
  )
    .populate('user',       'name email')
    .populate('reviewedBy', 'name email');

  if (!membership) {
    return res.status(404).json({ success: false, message: 'Membership record not found' });
  }

  res.json({ success: true, message: 'Membership record updated', data: membership });
});

/**
 * @route   PATCH /api/members/:id/status
 * @access  Protected — manage:members
 * @body    { status: 'approved' | 'rejected', notes?: string }
 */
exports.updateStatus = asyncHandler(async (req, res) => {
  const { status, notes } = req.body;

  if (!['approved', 'rejected'].includes(status)) {
    return res.status(400).json({
      success: false,
      message: "Status must be 'approved' or 'rejected'",
    });
  }

  const membership = await Membership.findByIdAndUpdate(
    req.params.id,
    {
      $set: {
        status,
        reviewedBy:  req.user._id,
        reviewedAt:  new Date(),
        reviewNotes: notes || '',
      },
    },
    { new: true }
  )
    .populate('user',       'name email')
    .populate('reviewedBy', 'name email');

  if (!membership) {
    return res.status(404).json({ success: false, message: 'Membership record not found' });
  }

  res.json({
    success: true,
    message: `Membership application ${status}`,
    data:    membership,
  });
});

/**
 * @route   DELETE /api/members/:id
 * @access  Protected — manage:members
 */
exports.remove = asyncHandler(async (req, res) => {
  const membership = await Membership.findByIdAndDelete(req.params.id);

  if (!membership) {
    return res.status(404).json({ success: false, message: 'Membership record not found' });
  }

  res.json({ success: true, message: 'Membership record deleted' });
});