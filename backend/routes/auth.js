const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const { registerUser, loginUser, getMe } = require('../controllers/authController');
const { sendOtp, verifyOtp } = require('../controllers/otpController');
const { protect, addToBlacklist } = require('../middlewares/authMiddleware');
const { ApiResponse } = require('../utils/ApiResponse');

const registerValidation = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('phone').trim().notEmpty().withMessage('Phone number is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('role').optional().isIn(['citizen']).withMessage('Role must be citizen'),
];

const loginValidation = [
  body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required'),
];

const otpValidation = [
  body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
];

const verifyOtpValidation = [
  body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('otp').trim().isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits').isNumeric().withMessage('OTP must be numeric'),
];

router.post('/send-otp', otpValidation, sendOtp);
router.post('/verify-otp', verifyOtpValidation, verifyOtp);
router.post('/register', registerValidation, registerUser);
router.post('/login', loginValidation, loginUser);
router.post('/logout', protect, (req, res) => {
  const authHeader = req.headers.authorization;
  if (authHeader) addToBlacklist(authHeader.split(' ')[1]);
  res.status(200).json(new ApiResponse(200, null, 'Logged out successfully'));
});
router.get('/me', protect, getMe);

module.exports = router;
