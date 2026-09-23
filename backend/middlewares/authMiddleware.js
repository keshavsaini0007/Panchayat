const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { ApiError } = require('../utils/ApiError');
const { asyncHandler } = require('../utils/asyncHandler');

// token -> unix-ms expiry. Tokens stay revoked until they expire naturally,
// instead of being wiped wholesale every 24h (which resurrected 7-day tokens).
const blacklistedTokens = new Map();

const addToBlacklist = (token) => {
  try {
    const decoded = jwt.decode(token);
    const expiresAt = decoded && decoded.exp ? decoded.exp * 1000 : Date.now() + 24 * 60 * 60 * 1000;
    blacklistedTokens.set(token, expiresAt);
  } catch {
    blacklistedTokens.set(token, Date.now() + 24 * 60 * 60 * 1000);
  }
};

const isBlacklisted = (token) => {
  const expiresAt = blacklistedTokens.get(token);
  if (!expiresAt) return false;
  if (expiresAt <= Date.now()) {
    blacklistedTokens.delete(token);
    return false;
  }
  return true;
};

// Periodically purge only expired/redundant entries.
setInterval(() => {
  const now = Date.now();
  for (const [token, expiresAt] of blacklistedTokens.entries()) {
    if (expiresAt <= now) blacklistedTokens.delete(token);
  }
}, 60 * 60 * 1000).unref();

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
