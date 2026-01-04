// server/middleware/validation.js
const { body, validationResult, query } = require('express-validator');

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      success: false, 
      errors: errors.array().map(e => ({ 
        field: e.param, 
        message: e.msg 
      }))
    });
  }
  next();
};

// Auth validators
exports.validateSignup = [
  body('name')
    .trim()
    .notEmpty().withMessage('Name is required')
    .isLength({ min: 2, max: 100 }).withMessage('Name must be 2-100 characters')
    .matches(/^[a-zA-Z\s'-]+$/).withMessage('Name contains invalid characters'),
  
  body('email')
    .trim()
    .toLowerCase()
    .isEmail().withMessage('Valid email required')
    .normalizeEmail(),
  
  body('password')
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[a-zA-Z\d@$!%*?&]/)
    .withMessage('Password must contain uppercase, lowercase, number, and special character'),
  
  handleValidationErrors
];

exports.validateLogin = [
  body('email')
    .trim()
    .toLowerCase()
    .isEmail().withMessage('Valid email required'),
  
  body('password')
    .notEmpty().withMessage('Password required'),
  
  handleValidationErrors
];