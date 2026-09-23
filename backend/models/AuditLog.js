const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  complaintId: { type: mongoose.Schema.Types.ObjectId, ref: 'Complaint', required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }, // null = system action
  role: { type: String, required: true },
  action: {
    type: String, required: true,
    enum: ['complaint_resolved', 'citizen_verified', 'citizen_rejected', 'complaint_reopened', 'auto_closed'],
  },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  timestamp: { type: Date, default: Date.now },
});

auditLogSchema.index({ complaintId: 1, timestamp: -1 });
auditLogSchema.index({ userId: 1 });
auditLogSchema.index({ timestamp: -1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
