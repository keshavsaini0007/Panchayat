const User = require('../models/User');
const OtpVerification = require('../models/OtpVerification');
const { validationResult } = require('express-validator');
const generateToken = require('../utils/generateToken');
const { ApiError } = require('../utils/ApiError');
const { ApiResponse } = require('../utils/ApiResponse');
const { asyncHandler } = require('../utils/asyncHandler');

const registerUser = asyncHandler(async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ApiError(400, 'Validation failed', errors.array());
  }

  const { name, email, phone, password, role, village, ward } = req.body;

  const existing = await User.findOne({ email });
  if (existing) {
    throw new ApiError(400, 'Email already registered');
  }

  const otpRecord = await OtpVerification.findOne({ email, verified: true });
  if (!otpRecord) {
    throw new ApiError(400, 'Email not verified. Please complete OTP verification first.');
  }

  await OtpVerification.deleteMany({ email });

  // Official roles are only assignable by an admin. Self-registration is always a verified citizen.
  const user = await User.create({
    name, email, phone, password,
    role: 'citizen',
    isVerified: true,
    village, ward,
    emailVerified: true,
  });

  const token = generateToken(user._id, user.role);

  res.status(201).json(new ApiResponse(201, {
    _id: user._id, name: user.name, email: user.email, phone: user.phone,
    role: user.role, village: user.village, ward: user.ward, token,
  }, 'User registered successfully'));
});

const loginUser = asyncHandler(async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ApiError(400, 'Validation failed', errors.array());
  }

  const { email, password } = req.body;

  const user = await User.findOne({ email });
  if (!user || !(await user.matchPassword(password))) {
    throw new ApiError(401, 'Invalid credentials');
  }

  if (!user.isVerified) {
    throw new ApiError(403, 'Your account is pending verification. Contact the administrator.');
  }

  const token = generateToken(user._id, user.role);

  res.status(200).json(new ApiResponse(200, {
    _id: user._id, name: user.name, email: user.email, phone: user.phone,
    role: user.role, village: user.village, ward: user.ward, token,
  }));
});

const getMe = asyncHandler(async (req, res, next) => {
  const user = req.user;
  res.status(200).json(new ApiResponse(200, {
    _id: user._id, name: user.name, email: user.email, phone: user.phone,
    role: user.role, village: user.village, ward: user.ward, profileImage: user.profileImage,
  }));
});

module.exports = { registerUser, loginUser, getMe };
