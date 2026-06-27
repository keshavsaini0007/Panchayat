const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
  complaintId: { type: mongoose.Schema.Types.ObjectId, ref: 'Complaint', required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  message: { type: String, required: true, trim: true },
  isOfficial: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

commentSchema.index({ complaintId: 1, createdAt: -1 });
commentSchema.index({ userId: 1 });

module.exports = mongoose.model('Comment', commentSchema);
