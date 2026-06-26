const crypto = require('crypto');
const bcrypt = require('bcryptjs');

const OTP_LENGTH = 6;
const OTP_EXPIRY_MINUTES = 10;
const MAX_ATTEMPTS = 5;
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;
const LOCKOUT_THRESHOLD = 5;
const LOCKOUT_BASE_MS = 30 * 1000;
const BACKOFF_FACTOR = 2;
const MAX_LOCKOUT_MS = 24 * 60 * 60 * 1000;

const otpRateLimit = new Map();
const otpAttemptTracker = new Map();

const generateOtp = () => {
  const min = 10 ** (OTP_LENGTH - 1);
  const max = 10 ** OTP_LENGTH - 1;
  return crypto.randomInt(min, max).toString();
};

const hashOtp = async (otp) => {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(otp, salt);
};

const verifyOtpHash = async (otp, hash) => {
  return bcrypt.compare(otp, hash);
};

const checkRateLimit = (email) => {
  const now = Date.now();
  const record = otpRateLimit.get(email);

  if (!record || now > record.resetTime) {
    otpRateLimit.set(email, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true, remaining: RATE_LIMIT_MAX - 1 };
  }

  if (record.count >= RATE_LIMIT_MAX) {
    const retryAfter = Math.ceil((record.resetTime - now) / 60000);
    return { allowed: false, retryAfter };
  }

  record.count += 1;
  return { allowed: true, remaining: RATE_LIMIT_MAX - record.count };
};

const clearRateLimitEntry = (email) => {
  otpRateLimit.delete(email);
};

const checkOtpLockout = (email) => {
  const record = otpAttemptTracker.get(email);
  if (!record) return { locked: false, retryAfter: 0 };

  if (record.lockoutUntil && Date.now() < record.lockoutUntil) {
    const retryAfter = Math.ceil((record.lockoutUntil - Date.now()) / 1000);
    return { locked: true, retryAfter };
  }

  return { locked: false, retryAfter: 0 };
};

const recordFailedOtpAttempt = (email) => {
  const now = Date.now();
  let record = otpAttemptTracker.get(email);

  if (!record) {
    record = { attempts: 0, lockoutLevel: 0, lockoutUntil: 0 };
    otpAttemptTracker.set(email, record);
  }

  if (record.lockoutUntil && now >= record.lockoutUntil) {
    record.attempts = 0;
    record.lockoutUntil = 0;
  }

  record.attempts += 1;

  if (record.attempts >= LOCKOUT_THRESHOLD) {
    record.lockoutLevel += 1;
    record.attempts = 0;
    const duration = Math.min(
      LOCKOUT_BASE_MS * Math.pow(BACKOFF_FACTOR, record.lockoutLevel - 1),
      MAX_LOCKOUT_MS
    );
    record.lockoutUntil = now + duration;
    return { locked: true, duration, lockoutLevel: record.lockoutLevel };
  }

  return { locked: false, remainingAttempts: LOCKOUT_THRESHOLD - record.attempts };
};

const clearOtpAttempts = (email) => {
  otpAttemptTracker.delete(email);
};

const getOtpExpiry = () => {
  return new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);
};

setInterval(() => {
  const now = Date.now();
  for (const [email, record] of otpRateLimit.entries()) {
    if (now > record.resetTime) {
      otpRateLimit.delete(email);
    }
  }
  for (const [email, record] of otpAttemptTracker.entries()) {
    if (record.lockoutUntil && now > record.lockoutUntil + LOCKOUT_BASE_MS * 2) {
      otpAttemptTracker.delete(email);
    }
  }
}, 60000);

module.exports = {
  OTP_LENGTH,
  OTP_EXPIRY_MINUTES,
  MAX_ATTEMPTS,
  generateOtp,
  hashOtp,
  verifyOtpHash,
  checkRateLimit,
  clearRateLimitEntry,
  checkOtpLockout,
  recordFailedOtpAttempt,
  clearOtpAttempts,
  getOtpExpiry,
};
