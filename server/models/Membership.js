const mongoose = require('mongoose');

// ── Child sub-document ────────────────────────────────────────────────────────
const childSchema = new mongoose.Schema(
  {
    name:        { type: String, trim: true },
    dateOfBirth: { type: Date },
    isMember:    { type: Boolean, default: false },
  },
  { _id: true }
);

// ── Main membership schema ────────────────────────────────────────────────────
const membershipSchema = new mongoose.Schema(
  {
    // Link to the platform User (set on submission if account exists; patched later if not)
    user: {
      type:    mongoose.Schema.Types.ObjectId,
      ref:     'User',
      default: null,
      index:   true,
    },

    // ── Section 1 — Personal Information ──────────────────────────────────────
    fullName: {
      type:     String,
      required: [true, 'Full name is required'],
      trim:     true,
    },
    email: {
      type:      String,
      required:  [true, 'Email is required'],
      trim:      true,
      lowercase: true,
      match: [
        /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
        'Please provide a valid email address',
      ],
    },
    phone:              { type: String, trim: true },
    residentialAddress: { type: String, trim: true },
    postalAddress:      { type: String, trim: true },
    dateOfBirth:        { type: Date },
    maritalStatus: {
      type: String,
      enum: ['single', 'married', 'divorced', 'widowed', 'separated', ''],
      default: '',
    },
    gender: {
      type: String,
      enum: ['male', 'female', ''],
      default: '',
    },

    // ── Section 2 — Particulars of Children ───────────────────────────────────
    children: [childSchema],

    // ── Section 3 — Church History ────────────────────────────────────────────
    memberSince:      { type: String, trim: true },   // free text e.g. "2019"
    holySpiritBaptism:{ type: String, trim: true },   // free text answer
    waterBaptism:     { type: Boolean, default: false },
    waterBaptismDate: { type: Date, default: null },
    desiresRebaptism: { type: Boolean, default: false },
    departmentInterest:{ type: String, trim: true },  // dept they want to serve in

    // ── Section 4 — Faith & Identity ──────────────────────────────────────────
    believesInJesus:  { type: Boolean, default: null }, // the faith declaration
    idPassportNumber: { type: String, trim: true },
    signatureName:    { type: String, trim: true },     // typed-name signature
    signatureDate:    { type: Date, default: null },

    // ── Application workflow ───────────────────────────────────────────────────
    status: {
      type:    String,
      enum:    ['pending', 'approved', 'rejected'],
      default: 'pending',
      index:   true,
    },
    reviewedBy:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    reviewedAt:  { type: Date, default: null },
    reviewNotes: { type: String, trim: true },

    submittedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// ── Static helpers ────────────────────────────────────────────────────────────

/**
 * After the user verifies their email and logs in for the first time,
 * call this to link their membership application to their User document.
 */
membershipSchema.statics.linkToUser = function (email, userId) {
  return this.findOneAndUpdate(
    { email: email.toLowerCase(), user: null },
    { user: userId },
    { new: true }
  );
};

// ── Compound / single-field indexes ──────────────────────────────────────────
membershipSchema.index({ email:       1 });
membershipSchema.index({ status:      1 });
membershipSchema.index({ submittedAt: -1 });
membershipSchema.index({ createdAt:   -1 });

module.exports = mongoose.model('Membership', membershipSchema);