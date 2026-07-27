const User = require('../models/User');
const OtpVerification = require('../models/OtpVerification');
const { validationResult } = require('express-validator');
const { generateOtp, hashOtp, verifyOtpHash, checkRateLimit, checkOtpLockout, recordFailedOtpAttempt, clearOtpAttempts, MAX_ATTEMPTS, getOtpExpiry } = require('../utils/otpUtils');
const { sendOtpEmail } = require('../utils/emailService');
const { ApiError } = require('../utils/ApiError');
const { ApiResponse } = require('../utils/ApiResponse');
const { asyncHandler } = require('../utils/asyncHandler');

const sendOtp = asyncHandler(async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ApiError(400, 'Validation failed', errors.array());
  }

  const { email } = req.body;

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new ApiError(400, 'Email already registered.');
  }

  const rateCheck = checkRateLimit(email);
  if (!rateCheck.allowed) {
    throw new ApiError(429, `Too many OTP requests. Try again in ${rateCheck.retryAfter} minutes.`);
  }

  const lockCheck = checkOtpLockout(email);
  if (lockCheck.locked) {
    throw new ApiError(429, `Account temporarily locked due to too many failed attempts. Try again in ${lockCheck.retryAfter} second(s).`);
  }

  await OtpVerification.deleteMany({ email });

  const otp = generateOtp();
  const otpHash = await hashOtp(otp);
  const otpExpiry = getOtpExpiry();

  await OtpVerification.create({ email, otpHash, otpExpiry });

  const result = await sendOtpEmail(email, otp);
  if (!result.success) {
    await OtpVerification.deleteMany({ email });
    throw new ApiError(500, 'Failed to send OTP email. Please try again.');
  }

  res.status(200).json(new ApiResponse(200, { simulated: !!result.simulated }, 'OTP sent to your email.'));
});

const verifyOtp = asyncHandler(async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ApiError(400, 'Validation failed', errors.array());
  }

  const { email, otp } = req.body;

  const lockCheck = checkOtpLockout(email);
  if (lockCheck.locked) {
    throw new ApiError(429, `Too many failed attempts. Try again in ${lockCheck.retryAfter} second(s).`);
  }

  const record = await OtpVerification.findOne({ email, verified: false });

  if (!record) {
    throw new ApiError(400, 'No OTP found. Request a new one.');
  }

  if (Date.now() > new Date(record.otpExpiry).getTime()) {
    await OtpVerification.deleteMany({ email });
    throw new ApiError(400, 'OTP has expired. Request a new one.');
  }

  if (record.attempts >= MAX_ATTEMPTS) {
    await OtpVerification.deleteMany({ email });
    throw new ApiError(400, 'Too many failed attempts. Request a new OTP.');
  }

  const isValid = await verifyOtpHash(otp, record.otpHash);

  if (!isValid) {
    record.attempts += 1;
    await record.save();
    const attemptResult = recordFailedOtpAttempt(email);
    if (attemptResult.locked) {
      throw new ApiError(429, `Too many failed attempts. Try again in ${Math.ceil(attemptResult.duration / 1000)} second(s).`);
    }
    throw new ApiError(400, 'Invalid OTP. Please try again.');
  }

  record.verified = true;
  await record.save();
  clearOtpAttempts(email);

  res.status(200).json(new ApiResponse(200, null, 'Email verified successfully.'));
});

module.exports = { sendOtp, verifyOtp };
