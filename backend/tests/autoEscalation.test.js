/** Focused test for the auto-escalation scheduler (no waiting needed — backdated records). */
const mongoose = require('mongoose');
const Complaint = require('../models/Complaint');
const AuditLog = require('../models/AuditLog');
const Notification = require('../models/Notification');
const User = require('../models/User');
const { runAutoEscalation } = require('../utils/autoEscalation');

const DAY = 24 * 60 * 60 * 1000;
let passed = 0, failed = 0;
const check = (name, cond, detail = '') => {
  if (cond) { passed++; console.log(`  PASS  ${name}`); }
  else { failed++; console.log(`  FAIL  ${name}${detail ? ` — ${detail}` : ''}`); }
};

(async () => {
  await mongoose.connect(process.env.TEST_MONGO_URI + '/panchayat');
  const user = await User.findOne({ email: 'citizen.t@test.local' }) || await User.findOne({ role: 'citizen' });
  if (!user) { console.error('No user found — run api.integration first'); process.exit(2); }

  // Clean any prior backdated records
  await Complaint.deleteMany({ title: { $in: ['AUTOESC-8D', 'AUTOESC-16D'] } });

  // Complaint resolved 8 days ago → should become awaiting_citizen_response
  const c8 = await Complaint.create({
    title: 'AUTOESC-8D', description: 'test', category: 'roads', ward: '3', village: 'V',
    location: { address: 'x', lat: 0, lng: 0 },
    createdBy: user._id,
    status: 'citizen_verification_pending',
    resolvedAt: new Date(Date.now() - 8 * DAY),
    resolvedBy: user._id,
  });
  // Complaint resolved 16 days ago → should auto-close
  const c16 = await Complaint.create({
    title: 'AUTOESC-16D', description: 'test', category: 'roads', ward: '3', village: 'V',
    location: { address: 'x', lat: 0, lng: 0 },
    createdBy: user._id,
    status: 'citizen_verification_pending',
    resolvedAt: new Date(Date.now() - 16 * DAY),
    resolvedBy: user._id,
  });

  await runAutoEscalation();

  const after8 = await Complaint.findById(c8._id);
  check('8d-old complaint → awaiting_citizen_response', after8.status === 'awaiting_citizen_response', `status=${after8.status}`);
  const notif8 = await Notification.findOne({ complaintId: c8._id });
  check('8d complaint got overdue notification', !!notif8, JSON.stringify(notif8));

  const after16 = await Complaint.findById(c16._id);
  check('16d-old complaint → auto-closed', after16.status === 'closed' && after16.closedAutomatically === true && after16.verifiedByCitizen === false, `status=${after16.status} auto=${after16.closedAutomatically}`);
  const audit = await AuditLog.findOne({ complaintId: c16._id, action: 'auto_closed' });
  check('auto-close wrote AuditLog (system role)', !!audit && audit.role === 'system', JSON.stringify(audit));
  const notif16 = await Notification.findOne({ complaintId: c16._id, type: 'complaint_closed' });
  check('16d complaint got auto-close notification', !!notif16, JSON.stringify(notif16));

  // Edge: 15d 0ms boundary (>= 15d closes)
  const c15 = await Complaint.create({
    title: 'AUTOESC-15D', description: 'test', category: 'roads', ward: '3', village: 'V',
    location: { address: 'x', lat: 0, lng: 0 },
    createdBy: user._id,
    status: 'citizen_verification_pending',
    resolvedAt: new Date(Date.now() - 15 * DAY),
    resolvedBy: user._id,
  });
  await runAutoEscalation();
  const after15 = await Complaint.findById(c15._id);
  check('15d-old boundary closed too', after15.status === 'closed', `status=${after15.status}`);

  await mongoose.disconnect();
  console.log(`\nAUTO-ESCALATION: ${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error('crash:', e); process.exit(2); });