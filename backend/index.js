const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const connectDB = require('./config/db');
const { errorHandler, notFound } = require('./middlewares/errorMiddleware');
const sanitizeInput = require('./middlewares/sanitize');

dotenv.config();

const REQUIRED_ENV = ['MONGO_URI', 'JWT_SECRET'];
for (const key of REQUIRED_ENV) {
  if (!process.env[key]) {
    console.error(`FATAL: Missing required environment variable: ${key}`);
    process.exit(1);
  }
}

const app = express();

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({ origin: process.env.CLIENT_URL || '*', credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use(sanitizeInput);

if (process.env.NODE_ENV !== 'production') {
  app.use((req, res, next) => {
    console.log(`${req.method} ${req.originalUrl}`);
    next();
  });
}

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { success: false, message: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { success: false, message: 'Too many authentication attempts, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api', apiLimiter);
app.use('/api/auth', authLimiter);

app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

app.use('/api/auth', require('./routes/auth'));
app.use('/api/complaints', require('./routes/complaints'));
app.use('/api/users', require('./routes/users'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/notifications', require('./routes/notifications'));

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

let server;
let autoEscalationInterval;

const { startAutoEscalationScheduler } = require('./utils/autoEscalation');

connectDB().then(() => {
  server = app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  autoEscalationInterval = startAutoEscalationScheduler();
});

const gracefulShutdown = (signal) => {
  console.log(`\n${signal} received. Starting graceful shutdown...`);
  if (autoEscalationInterval) {
    clearInterval(autoEscalationInterval);
    console.log('Auto-escalation scheduler stopped.');
  }
  server?.close(() => {
    console.log('HTTP server closed.');
    process.exit(0);
  });
  setTimeout(() => {
    console.error('Forced shutdown after timeout.');
    process.exit(1);
  }, 10000).unref();
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION:', err);
  gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason) => {
  console.error('UNHANDLED REJECTION:', reason);
});
