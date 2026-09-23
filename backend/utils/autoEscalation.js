const Complaint = require('../models/Complaint');
const AuditLog = require('../models/AuditLog');
const Notification = require('../models/Notification');

const BATCH_SIZE = 100;
const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;
const FIFTEEN_DAYS = 15 * 24 * 60 * 60 * 1000;

const runAutoEscalation = async () => {
  try {
    const now = Date.now();

    // Cursor-based pagination on _id avoids skipping documents when
    // their status mutates mid-batch (skip/limit over a changing filter).
    let lastId = null;
    let hasMore = true;

    while (hasMore) {
      const filter = {
        status: 'citizen_verification_pending',
        resolvedAt: { $ne: null },
        ...(lastId ? { _id: { $gt: lastId } } : {}),
      };

      const complaints = await Complaint.find(filter)
        .sort({ _id: 1 })
        .limit(BATCH_SIZE)
        .populate('createdBy', 'name email');

      if (complaints.length === 0) {
        hasMore = false;
        continue;
      }
      lastId = complaints[complaints.length - 1]._id;

      for (const complaint of complaints) {
        const elapsed = now - new Date(complaint.resolvedAt).getTime();

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
    }
  } catch (err) {
    console.error('Auto-escalation error:', err);
  }
};

const startAutoEscalationScheduler = () => {
  console.log('Auto-escalation scheduler started (running every hour)');
  runAutoEscalation();
  const interval = setInterval(runAutoEscalation, 60 * 60 * 1000);
  interval.unref();
  return interval;
};

module.exports = { startAutoEscalationScheduler, runAutoEscalation };