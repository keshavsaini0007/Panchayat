const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { ApiError } = require('../utils/ApiError');
const { asyncHandler } = require('../utils/asyncHandler');

const blacklistedTokens = new Set();

const addToBlacklist = (token) => {
  blacklistedTokens.add(token);
};

const isBlacklisted = (token) => {
  return blacklistedTokens.has(token);
};

setInterval(() => {
  blacklistedTokens.clear();
}, 24 * 60 * 60 * 1000);

const protect = asyncHandler(async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new ApiError(401, 'Not authorized, no token');
  }

  const token = authHeader.split(' ')[1];

  if (isBlacklisted(token)) {
    throw new ApiError(401, 'Token revoked, please login again');
  }

  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  req.user = await User.findById(decoded.id).select('-password');
  if (!req.user) {
    throw new ApiError(401, 'User not found. Please login again.');
  }
  next();
});

const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(new ApiError(403, 'Access denied: insufficient role'));
    }
    next();
  };
};

module.exports = { protect, authorizeRoles, addToBlacklist };
