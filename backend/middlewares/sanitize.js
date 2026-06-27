const MONGO_OPERATORS = ['$ne', '$gt', '$gte', '$lt', '$lte', '$in', '$nin', '$regex', '$exists', '$where', '$and', '$or', '$nor', '$not', '$elemMatch', '$size', '$all', '$slice', '$eq', '$mod', '$text', '$search', '$inc', '$set', '$unset', '$push', '$pull', '$addToSet', '$each', '$position', '$sort'];

const sanitizeValue = (obj) => {
  if (Array.isArray(obj)) {
    return obj.map(sanitizeValue);
  }
  if (obj && typeof obj === 'object') {
    const sanitized = {};
    for (const [key, value] of Object.entries(obj)) {
      if (MONGO_OPERATORS.includes(key)) continue;
      sanitized[key] = sanitizeValue(value);
    }
    return sanitized;
  }
  return obj;
};

const sanitizeInput = (req, res, next) => {
  if (req.body) req.body = sanitizeValue(req.body);
  if (req.query) req.query = sanitizeValue(req.query);
  if (req.params) req.params = sanitizeValue(req.params);
  next();
};

module.exports = sanitizeInput;
