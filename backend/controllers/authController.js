const User = require('../models/User');
const OtpVerification = require('../models/OtpVerification');
const { validationResult } = require('express-validator');
const generateToken = require('../utils/generateToken');

const registerUser = async (req, res, next) => {
  try {
    const { name, email, phone, password, role, village, ward } = req.body;

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    const otpRecord = await OtpVerification.findOne({ email, verified: true });
    if (!otpRecord) {
      return res.status(400).json({ message: 'Email not verified. Please complete OTP verification first.' });
    }

    await OtpVerification.deleteMany({ email });

    const isVerified = role === 'ward_member' || role === 'gram_pradhan' ? false : true;

    const user = await User.create({
      name, email, phone, password, role, isVerified, village, ward,
      emailVerified: true,
    });

    const token = generateToken(user._id, user.role);

    res.status(201).json({
      _id: user._id, name: user.name, email: user.email, phone: user.phone,
      role: user.role, village: user.village, ward: user.ward, token,
    });
  } catch (err) {
    next(err);
  }
};

const loginUser = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = generateToken(user._id, user.role);

    res.status(200).json({
      _id: user._id, name: user.name, email: user.email, phone: user.phone,
      role: user.role, village: user.village, ward: user.ward, token,
    });
  } catch (err) {
    next(err);
  }
};

const getMe = async (req, res, next) => {
  try {
    const user = req.user;
    res.status(200).json({
      _id: user._id, name: user.name, email: user.email, phone: user.phone,
      role: user.role, village: user.village, ward: user.ward, profileImage: user.profileImage,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { registerUser, loginUser, getMe };
