const Complaint = require('../models/Complaint');
const AuditLog = require('../models/AuditLog');
const Notification = require('../models/Notification');

const runAutoEscalation = async () => {
  try {
    const now = Date.now();
    const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;
    const FIFTEEN_DAYS = 15 * 24 * 60 * 60 * 1000;

    const complaints = await Complaint.find({
      status: 'citizen_verification_pending',
      resolvedAt: { $ne: null },
    }).populate('createdBy', 'name email');

    for (const complaint of complaints) {
      const elapsed = now - new Date(complaint.resolvedAt).getTime();
      const originalStatus = complaint.status;

      if (elapsed >= SEVEN_DAYS && elapsed < FIFTEEN_DAYS && complaint.status === 'citizen_verification_pending') {
        complaint.status = 'awaiting_citizen_response';
        await complaint.save();

        if (complaint.createdBy) {
          await Notification.create({
            userId: complaint.createdBy._id,
            complaintId: complaint._id,
            type: 'citizen_verification',
            message: `Your response is overdue for complaint "${complaint.title}". Please verify the resolution to avoid auto-closure.`,
          });
        }
      }

      if (elapsed >= FIFTEEN_DAYS && complaint.status !== 'closed') {
        complaint.status = 'closed';
        complaint.verifiedByCitizen = false;
        complaint.closedAutomatically = true;
        await complaint.save();

        await AuditLog.create({
          complaintId: complaint._id,
          userId: complaint.createdBy?._id || null,
          role: 'system',
          action: 'auto_closed',
          metadata: {
            reason: 'No citizen response within 15 days',
            resolvedAt: complaint.resolvedAt,
            autoClosedAt: new Date(),
          },
        });

        if (complaint.createdBy) {
          await Notification.create({
            userId: complaint.createdBy._id,
            complaintId: complaint._id,
            type: 'complaint_closed',
            message: `Complaint "${complaint.title}" has been auto-closed due to no response within the verification period.`,
          });
        }
      }
    }
  } catch (err) {
    console.error('Auto-escalation error:', err);
  }
};

const startAutoEscalationScheduler = () => {
  console.log('Auto-escalation scheduler started (running every hour)');
  runAutoEscalation();
  setInterval(runAutoEscalation, 60 * 60 * 1000);
};

module.exports = { startAutoEscalationScheduler };
