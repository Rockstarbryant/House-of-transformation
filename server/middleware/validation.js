const { validationResult } = require('express-validator');

exports.validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  }
  next();
};

// Common validation rules
exports.emailValidation = {
  isEmail: true,
  normalizeEmail: true,
  errorMessage: 'Please provide a valid email'
};

exports.passwordValidation = {
  isLength: { min: 6 },
  errorMessage: 'Password must be at least 6 characters long'
};

exports.requiredValidation = {
  notEmpty: true,
  errorMessage: 'This field is required'
};