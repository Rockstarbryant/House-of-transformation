const express = require('express');
const { signup, login, verifyToken } = require('../controllers/authController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.post('/signup', signup);
router.post('/login', login);
router.get('/verify', protect, verifyToken);

module.exports = router;