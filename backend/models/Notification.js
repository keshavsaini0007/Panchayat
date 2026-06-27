const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  complaintId: { type: mongoose.Schema.Types.ObjectId, ref: 'Complaint', required: true },
  type: {
    type: String, required: true,
    enum: ['citizen_verification', 'complaint_reopened', 'complaint_closed'],
  },
  message: { type: String, required: true },
  read: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

notificationSchema.index({ userId: 1, read: 1, createdAt: -1 });
notificationSchema.index({ complaintId: 1 });

module.exports = mongoose.model('Notification', notificationSchema);
