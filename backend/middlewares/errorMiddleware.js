const errorHandler = (err, req, res, next) => {
  console.error(err.stack);
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({ message: err.message || 'Server Error' });
};

const notFound = (req, res, next) => {
  const error = new Error('Route not found: ' + req.originalUrl);
  error.statusCode = 404;
  next(error);
};

module.exports = { errorHandler, notFound };
