const User = require('../models/User');
const OtpVerification = require('../models/OtpVerification');
const { validationResult } = require('express-validator');
const { generateOtp, hashOtp, verifyOtpHash, checkRateLimit, checkOtpLockout, recordFailedOtpAttempt, clearOtpAttempts, MAX_ATTEMPTS, getOtpExpiry } = require('../utils/otpUtils');
const { sendOtpEmail } = require('../utils/emailService');

const sendOtp = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
    }

    const { email } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Email already registered.' });
    }

    const rateCheck = checkRateLimit(email);
    if (!rateCheck.allowed) {
      return res.status(429).json({
        success: false, message: `Too many OTP requests. Try again in ${rateCheck.retryAfter} minutes.`,
      });
    }

    const lockCheck = checkOtpLockout(email);
    if (lockCheck.locked) {
      return res.status(429).json({
        success: false, message: `Account temporarily locked due to too many failed attempts. Try again in ${lockCheck.retryAfter} second(s).`,
      });
    }

    await OtpVerification.deleteMany({ email });

    const otp = generateOtp();
    const otpHash = await hashOtp(otp);
    const otpExpiry = getOtpExpiry();

    await OtpVerification.create({ email, otpHash, otpExpiry });

    const result = await sendOtpEmail(email, otp);
    if (!result.success) {
      await OtpVerification.deleteMany({ email });
      return res.status(500).json({ success: false, message: 'Failed to send OTP email. Please try again.' });
    }

    res.status(200).json({
      success: true, message: 'OTP sent to your email.', simulated: !!result.simulated,
    });
  } catch (err) {
    next(err);
  }
};

const verifyOtp = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
    }

    const { email, otp } = req.body;

    const lockCheck = checkOtpLockout(email);
    if (lockCheck.locked) {
      return res.status(429).json({
        success: false, message: `Too many failed attempts. Try again in ${lockCheck.retryAfter} second(s).`,
      });
    }

    const record = await OtpVerification.findOne({ email, verified: false });

    if (!record) {
      return res.status(400).json({ success: false, message: 'No OTP found. Request a new one.' });
    }

    if (Date.now() > new Date(record.otpExpiry).getTime()) {
      await OtpVerification.deleteMany({ email });
      return res.status(400).json({ success: false, message: 'OTP has expired. Request a new one.' });
    }

    if (record.attempts >= MAX_ATTEMPTS) {
      await OtpVerification.deleteMany({ email });
      return res.status(400).json({ success: false, message: 'Too many failed attempts. Request a new OTP.' });
    }

    const isValid = await verifyOtpHash(otp, record.otpHash);

    if (!isValid) {
      record.attempts += 1;
      await record.save();
      const attemptResult = recordFailedOtpAttempt(email);
      if (attemptResult.locked) {
        return res.status(429).json({
          success: false, message: `Too many failed attempts. Try again in ${Math.ceil(attemptResult.duration / 1000)} second(s).`,
        });
      }
      return res.status(400).json({ success: false, message: 'Invalid OTP. Please try again.' });
    }

    record.verified = true;
    await record.save();
    clearOtpAttempts(email);

    res.status(200).json({ success: true, message: 'Email verified successfully.' });
  } catch (err) {
    next(err);
  }
};

module.exports = { sendOtp, verifyOtp };
