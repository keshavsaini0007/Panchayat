const jwt = require('jsonwebtoken');
const User = require('../models/User');

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

const protect = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Not authorized, no token' });
  }

  const token = authHeader.split(' ')[1];

  if (isBlacklisted(token)) {
    return res.status(401).json({ success: false, message: 'Token revoked, please login again' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id).select('-password');
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'User not found. Please login again.' });
    }
    next();
  } catch (err) {
    const message = err.name === 'TokenExpiredError' ? 'Token expired, please login again' : 'Not authorized, invalid token';
    return res.status(401).json({ success: false, message });
  }
};

const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Access denied: insufficient role' });
    }
    next();
  };
};

module.exports = { protect, authorizeRoles, addToBlacklist };
