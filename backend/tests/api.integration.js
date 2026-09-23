/**
 * Panchayat Backend — End-to-End API Integration Test Suite
 *
 * Runs against a live backend. Requires:
 *   - Backend running with simulated email mode (no RESEND_API_KEY), so OTPs are
 *     printed to the backend log; TEST_OTP_LOG must point at that log file.
 *   - Seeded admin (admin@panchayat.com / Admin@12345)
 *
 * Usage:
 *   TEST_OTP_LOG=<path to backend log> node tests/api.integration.js
 *
 * Exit code 0 = all pass; 1 = failures.
 */

const fs = require('fs');

const BASE = process.env.BASE_URL || 'http://localhost:5000/api';
const OTP_LOG = process.env.TEST_OTP_LOG || null;
const ENV = process.env.APP_ENV || 'development';

let passed = 0;
let failed = 0;
const failures = [];

function check(name, condition, detail = '') {
  if (condition) {
    passed++;
    console.log(`  PASS  ${name}`);
  } else {
    failed++;
    failures.push({ name, detail });
    console.log(`  FAIL  ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

function section(title) {
  console.log(`\n=== ${title} ===`);
}

async function api(method, path, { token, body, form } = {}) {
  const headers = {};
  let payload;
  if (form) {
    payload = form;
  } else if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(BASE + path, { method, headers, body: payload });
  let data = null;
  const text = await res.text();
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  return { status: res.status, data };
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function getOtpFromLog(email, attempts = 12) {
  for (let i = 0; i < attempts; i++) {
    if (OTP_LOG && fs.existsSync(OTP_LOG)) {
      const content = fs.readFileSync(OTP_LOG, 'utf8');
      const lines = content.split('\n').filter((l) => l.includes(`OTP for ${email}:`));
      if (lines.length > 0) {
        const match = lines[lines.length - 1].match(/OTP for .*: (\d{6})/);
        if (match) return match[1];
      }
    }
    await sleep(250);
  }
  return null;
}

async function registerWithOtp(email, role = 'citizen', extra = {}) {
  const s1 = await api('POST', '/auth/send-otp', { body: { email } });
  const otp = await getOtpFromLog(email);
  if (!otp) {
    check(`send-otp for ${email} returns 200`, s1.status === 200, `status=${s1.status}`);
    return null;
  }
  const v = await api('POST', '/auth/verify-otp', { body: { email, otp } });
  check(`verify-otp ${email}`, v.status === 200, `status=${v.status} ${JSON.stringify(v.data)}`);
  const reg = await api('POST', '/auth/register', {
    body: {
      name: email.split('@')[0], email, phone: '9876543210',
      password: 'Test@123', role, village: 'TestVillage', ward: '3', ...extra,
    },
  });
  check(`register ${email} (role=${role})`, reg.status === 201, `status=${reg.status} ${JSON.stringify(reg.data)}`);
  return reg.data?.data;
}

function makeForm(obj) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(obj)) fd.append(k, v);
  return fd;
}

(async () => {
  console.log('Backend integration tests');
  console.log('BASE_URL =', BASE, '| OTP_LOG =', OTP_LOG);

  /* ================= HEALTH ================= */
  section('Health');
  const health = await api('GET', '/health');
  check('GET /health returns 200', health.status === 200, `status=${health.status}`);
  check('health.success is true', health.data?.success === true);

  /* ================= AUTH ================= */
  section('Auth — OTP / Register / Login');
  const citizen = await registerWithOtp('citizen.t@test.local');
  check('citizen registered and got token', !!citizen?.token);
  const citizen2 = await registerWithOtp('citizen2.t@test.local');
  const citizen3 = await registerWithOtp('citizen3.t@test.local', 'citizen', { ward: '9' });

  const dup = await api('POST', '/auth/send-otp', { body: { email: 'citizen.t@test.local' } });
  check('send-otp rejects registered email', dup.status === 400, `status=${dup.status}`);

  const noOtp = await api('POST', '/auth/register', {
    body: { name: 'x', email: 'no-otp@test.local', phone: '1111111111', password: 'Test@123' },
  });
  check('register without OTP verification -> 400', noOtp.status === 400, `status=${noOtp.status}`);

  const badLogin = await api('POST', '/auth/login', { body: { email: 'citizen.t@test.local', password: 'wrong' } });
  check('login wrong password -> 401', badLogin.status === 401, `status=${badLogin.status}`);

  const login = await api('POST', '/auth/login', { body: { email: 'citizen.t@test.local', password: 'Test@123' } });
  check('login correct -> 200 + token', login.status === 200 && !!login.data?.data?.token, `status=${login.status}`);

  const me = await api('GET', '/auth/me', { token: citizen.token });
  check('/auth/me with token', me.status === 200 && me.data?.data?.email === 'citizen.t@test.local', `status=${me.status}`);

  const meNoTok = await api('GET', '/auth/me');
  check('/auth/me without token -> 401', meNoTok.status === 401, `status=${meNoTok.status}`);

  const logout = await api('POST', '/auth/logout', { token: citizen.token });
  check('logout -> 200', logout.status === 200, `status=${logout.status}`);
  const meAfterLogout = await api('GET', '/auth/me', { token: citizen.token });
  check('blacklisted token rejected after logout', meAfterLogout.status === 401, `status=${meAfterLogout.status}`);
  // Re-login to get a usable token for all following tests
  const reLogin = await api('POST', '/auth/login', { body: { email: 'citizen.t@test.local', password: 'Test@123' } });
  citizen.token = reLogin.data?.data?.token;
  check('re-login after logout works', !!citizen.token, `status=${reLogin.status}`);

  // Security: privilege escalation attempt -> register route must NOT hand out a privileged role
  const esc = await api('POST', '/auth/send-otp', { body: { email: 'escalation.t@test.local' } });
  const escOtp = await getOtpFromLog('escalation.t@test.local');
  if (escOtp) {
    await api('POST', '/auth/verify-otp', { body: { email: 'escalation.t@test.local', otp: escOtp } });
  }
  const escReg = await api('POST', '/auth/register', {
    body: { name: 'Escalator', email: 'escalation.t@test.local', phone: '9876543210', password: 'Test@123', role: 'ward_member', village: 'TestVillage', ward: '3' },
  });
  check('SECURITY: public registration as ward_member is BLOCKED', escReg.status === 400, `status=${escReg.status} ${JSON.stringify(escReg.data)}`);

  // NoSQL injection attempt on login
  const inj = await api('POST', '/auth/login', { body: { email: { $ne: null }, password: { $ne: null } } });
  check('NoSQL injection on login is neutralized', inj.status === 401 || inj.status === 400, `status=${inj.status}`);

  /* ================= COMPLAINTS ================= */
  section('Complaints — create / read');
  const createNoAuth = await api('POST', '/complaints', {
    body: { title: 'x', description: 'y', category: 'roads', ward: '3', village: 'V', location: '{}' },
  });
  check('create complaint without token -> 401', createNoAuth.status === 401, `status=${createNoAuth.status}`);

  const loc = JSON.stringify({ address: 'Main Road', lat: 20.5, lng: 78.9, plusCode: 'XXXX+XX' });
  const create = await api('POST', '/complaints', {
    token: citizen.token,
    form: makeForm({ title: 'Pothole on main road', description: 'Deep pothole near the bus stop, needs immediate repair.', category: 'roads', ward: '3', village: 'TestVillage', location: loc }),
  });
  check('create complaint -> 201', create.status === 201 && create.data?.data?.complaint?._id, `status=${create.status} ${JSON.stringify(create.data)}`);
  const complaintId = create.data?.data?.complaint?._id;

  const createNoLoc = await api('POST', '/complaints', {
    token: citizen.token,
    form: makeForm({ title: 'No location', description: 'This complaint has no location payload.', category: 'roads', ward: '3', village: 'V' }),
  });
  check('create complaint without location -> 400', createNoLoc.status === 400, `status=${createNoLoc.status}`);

  const createBadCat = await api('POST', '/complaints', {
    token: citizen.token,
    form: makeForm({ title: 'Bad category', description: 'Invalid category should be rejected.', category: 'aliens', ward: '3', village: 'V', location: '{}' }),
  });
  check('create complaint invalid category -> 400', createBadCat.status === 400, `status=${createBadCat.status}`);

  const create2 = await api('POST', '/complaints', {
    token: citizen2.token,
    form: makeForm({ title: 'Street light not working', description: 'Street light in lane 2 has been out for a week.', category: 'street_lights', ward: '3', village: 'TestVillage', location: loc }),
  });
  const complaintId2 = create2.data?.data?.complaint?._id;

  // complaint in another ward (for cross-ward test)
  const createCross = await api('POST', '/complaints', {
    token: citizen3.token,
    form: makeForm({ title: 'Water supply issue far ward', description: 'No water in ward 9 for days.', category: 'water_supply', ward: '9', village: 'FarVillage', location: loc }),
  });
  const complaintCross = createCross.data?.data?.complaint?._id;

  const list = await api('GET', '/complaints');
  check('GET /complaints public -> 200 + data', list.status === 200 && Array.isArray(list.data?.data?.complaints), `status=${list.status}`);
  check('public list includes totalCount/pagination', typeof list.data?.data?.totalCount === 'number');

  const listFiltered = await api('GET', '/complaints?category=roads&ward=3');
  check('GET /complaints?category=roads&ward=3 filters', listFiltered.status === 200 && listFiltered.data?.data?.complaints.every((c) => c.category === 'roads' && c.ward === '3'), `status=${listFiltered.status}`);

  const byId = await api('GET', `/complaints/${complaintId}`);
  check('GET /complaints/:id -> 200', byId.status === 200 && byId.data?.data?.complaint?._id === complaintId, `status=${byId.status}`);
  check('detail includes comments array', Array.isArray(byId.data?.data?.comments));

  const badId = await api('GET', '/complaints/not-an-id');
  check('GET /complaints/:id invalid id -> 400', badId.status === 400, `status=${badId.status}`);
  const missingId = await api('GET', '/complaints/000000000000000000000000');
  check('GET /complaints/:id missing -> 404', missingId.status === 404, `status=${missingId.status}`);

  const pii = await api('GET', `/complaints/${complaintId}`);
  check('SECURITY: public detail does NOT expose creator email', !pii.data?.data?.complaint?.createdBy?.email, JSON.stringify(pii.data?.data?.complaint?.createdBy));
  const piiList = await api('GET', '/complaints?limit=2');
  const anyEmail = piiList.data?.data?.complaints?.some((c) => c.createdBy?.email);
  check('SECURITY: public list does NOT expose creator emails', !anyEmail, 'email leaked in public list');

  /* ================= UPvote / Comments ================= */
  section('Complaints — upvotes & comments');
  const up1 = await api('POST', `/complaints/${complaintId}/upvote`, { token: citizen2.token });
  check('upvote adds vote', up1.status === 200 && up1.data?.data?.upvoteCount === 1, `status=${up1.status} ${JSON.stringify(up1.data?.data)}`);
  const up2 = await api('POST', `/complaints/${complaintId}/upvote`, { token: citizen2.token });
  check('upvote toggles off', up2.status === 200 && up2.data?.data?.upvoteCount === 0, `status=${up2.status} ${JSON.stringify(up2.data?.data)}`);
  const up3 = await api('POST', `/complaints/${complaintId}/upvote`, { token: citizen2.token });
  check('upvote again', up3.status === 200 && up3.data?.data?.upvoteCount === 1, `status=${up3.status}`);

  const cmt = await api('POST', `/complaints/${complaintId}/comment`, { token: citizen2.token, body: { message: 'I also saw this pothole!' } });
  check('add comment -> 201', cmt.status === 201 && cmt.data?.data?.comment?.message, `status=${cmt.status}`);
  const cmtEmpty = await api('POST', `/complaints/${complaintId}/comment`, { token: citizen2.token, body: { message: '   ' } });
  check('empty comment -> 400', cmtEmpty.status === 400, `status=${cmtEmpty.status}`);

  const cmtOrphan = await api('POST', '/complaints/000000000000000000000000/comment', { token: citizen2.token, body: { message: 'orphan comment' } });
  check('BUG: comment on nonexistent complaint -> 404', cmtOrphan.status === 404, `status=${cmtOrphan.status}`);

  /* ================= My / Ward / Admin lists ================= */
  section('Complaints — scoped lists');
  const my = await api('GET', '/complaints/my/list', { token: citizen.token });
  check('GET /my/list returns only own', my.status === 200 && my.data?.data?.complaints.every((c) => String(c.createdBy) === String(citizen._id)), `status=${my.status}`);
  check('/my/list contains own complaint', my.data?.data?.complaints.some((c) => String(c._id) === complaintId), `count=${my.data?.data?.complaints?.length}`);

  const wardListCitizen = await api('GET', '/complaints/ward/list', { token: citizen.token });
  check('GET /ward/list as citizen -> 403', wardListCitizen.status === 403, `status=${wardListCitizen.status}`);

  /* ================= Admin user role flows (to create officials) ================= */
  section('Admin — users');
  const adminLog = await api('POST', '/auth/login', { body: { email: 'admin@panchayat.com', password: 'Admin@12345' } });
  check('admin login works', adminLog.status === 200 && !!adminLog.data?.data?.token, `status=${adminLog.status}`);
  const adminTok = adminLog.data?.data?.token;

  const usersAsCitizen = await api('GET', '/admin/users', { token: citizen.token });
  check('GET /admin/users as citizen -> 403', usersAsCitizen.status === 403, `status=${usersAsCitizen.status}`);
  const usersAsAdmin = await api('GET', '/admin/users', { token: adminTok });
  check('GET /admin/users as admin -> 200', usersAsAdmin.status === 200 && Array.isArray(usersAsAdmin.data?.data?.users), `status=${usersAsAdmin.status}`);
  const adminUser = usersAsAdmin.data?.data?.users?.find((u) => u.email === 'admin@panchayat.com');
  check('admin user object has no password field', adminUser && !('password' in adminUser));

  const promoteWard = await api('PATCH', `/admin/users/${citizen2._id}/role`, { token: adminTok, body: { role: 'ward_member' } });
  check('admin promotes citizen2 -> ward_member', promoteWard.status === 200 && promoteWard.data?.data?.user?.role === 'ward_member', `status=${promoteWard.status} ${JSON.stringify(promoteWard.data)}`);
  const promoteGp = await api('PATCH', `/admin/users/${citizen3._id}/role`, { token: adminTok, body: { role: 'gram_pradhan' } });
  check('admin promotes citizen3 -> gram_pradhan', promoteGp.status === 200 && promoteGp.data?.data?.user?.role === 'gram_pradhan', `status=${promoteGp.status} ${JSON.stringify(promoteGp.data)}`);
  const promoteBad = await api('PATCH', `/admin/users/${citizen._id}/role`, { token: adminTok, body: { role: 'superman' } });
  check('admin role update invalid role -> 400', promoteBad.status === 400, `status=${promoteBad.status}`);

  // Re-login for updated role tokens
  const wardLog = await api('POST', '/auth/login', { body: { email: 'citizen2.t@test.local', password: 'Test@123' } });
  const wardTok = wardLog.data?.data?.token;
  check('ward_member login works', !!wardTok, `status=${wardLog.status}`);
  const gpLog = await api('POST', '/auth/login', { body: { email: 'citizen3.t@test.local', password: 'Test@123' } });
  const gpTok = gpLog.data?.data?.token;
  check('gram_pradhan login works', !!gpTok, `status=${gpLog.status}`);

  // Set ward on the promoted users via DB (no admin API for it) for the ward scoping to be meaningful
  const mongoose = require('mongoose');
  const UserModel = require('../models/User');
  await mongoose.connect((process.env.TEST_MONGO_URI || 'mongodb://127.0.0.1:27017') + '/panchayat');
  await UserModel.updateOne({ email: 'citizen2.t@test.local' }, { $set: { ward: '3' } });
  await UserModel.updateOne({ email: 'citizen3.t@test.local' }, { $set: { ward: '3' } });
  await mongoose.disconnect();

  const wardList = await api('GET', '/complaints/ward/list', { token: wardTok });
  check('GET /ward/list as ward_member -> 200', wardList.status === 200, `status=${wardList.status}`);

  const adminAll = await api('GET', '/complaints/admin/all', { token: gpTok });
  check('GET /admin/all as gram_pradhan -> 200', adminAll.status === 200 && Array.isArray(adminAll.data?.data?.complaints), `status=${adminAll.status}`);
  const adminAllCitizen = await api('GET', '/complaints/admin/all', { token: citizen.token });
  check('GET /admin/all as citizen -> 403', adminAllCitizen.status === 403, `status=${adminAllCitizen.status}`);

  /* ================= Status workflow ================= */
  section('Complaints — status workflow');
  const statusAsCitizen = await api('PATCH', `/complaints/${complaintId}/status`, { token: citizen.token, body: { status: 'in_progress' } });
  check('status update as citizen -> 403', statusAsCitizen.status === 403, `status=${statusAsCitizen.status}`);

  const badStatus = await api('PATCH', `/complaints/${complaintId}/status`, { token: wardTok, body: { status: 'spaceship' } });
  check('status update invalid value -> 400', badStatus.status === 400, `status=${badStatus.status}`);

  const rejectNoReason = await api('PATCH', `/complaints/${complaintId}/status`, { token: wardTok, body: { status: 'rejected' } });
  check('reject without reason -> 400', rejectNoReason.status === 400, `status=${rejectNoReason.status}`);

  const approved = await api('PATCH', `/complaints/${complaintId}/status`, { token: wardTok, body: { status: 'approved' } });
  check('approve complaint', approved.status === 200 && approved.data?.data?.complaint?.status === 'approved', `status=${approved.status}`);

  const inProgress = await api('PATCH', `/complaints/${complaintId}/status`, { token: wardTok, body: { status: 'in_progress' } });
  check('set in_progress', inProgress.status === 200 && inProgress.data?.data?.complaint?.status === 'in_progress', `status=${inProgress.status}`);

  const resolved = await api('PATCH', `/complaints/${complaintId}/status`, { token: wardTok, body: { status: 'resolved', resolutionRemarks: 'Fixed the pothole with fresh tarmac.' } });
  check('resolve -> citizen_verification_pending', resolved.status === 200 && resolved.data?.data?.complaint?.status === 'citizen_verification_pending', `status=${resolved.status} got=${JSON.stringify(resolved.data?.data?.complaint?.status)}`);
  check('resolve records resolvedBy + resolvedAt', !!resolved.data?.data?.complaint?.resolvedBy && !!resolved.data?.data?.complaint?.resolvedAt, JSON.stringify(resolved.data?.data?.complaint));

  const rejectReason = await api('PATCH', `/complaints/${complaintId2}/status`, { token: wardTok, body: { status: 'rejected', rejectionReason: 'Duplicate complaint already logged.' } });
  check('reject with reason -> rejected', rejectReason.status === 200 && rejectReason.data?.data?.complaint?.status === 'rejected', `status=${rejectReason.status}`);

  const crossWard = await api('PATCH', `/complaints/${complaintCross}/status`, { token: wardTok, body: { status: 'approved' } });
  check('SECURITY: ward_member CANNOT modify complaint in another ward', crossWard.status === 403, `status=${crossWard.status}`);

  /* ================= Verification / Reopen ================= */
  section('Complaints — citizen verification & reopen');
  const verifyOther = await api('POST', `/complaints/${complaintId}/verify`, { token: citizen2.token });
  check('verify as non-owner -> 403', verifyOther.status === 403, `status=${verifyOther.status}`);

  const audit = await api('GET', `/complaints/${complaintId}/audit`, { token: citizen.token });
  check('GET /:id/audit -> 200', audit.status === 200 && Array.isArray(audit.data?.data?.auditLogs), `status=${audit.status}`);
  check('audit contains resolution event', audit.data?.data?.auditLogs.some((l) => l.action === 'complaint_resolved'));

  const pending = await api('GET', '/complaints/verification/pending', { token: citizen.token });
  check('GET /verification/pending -> 200', pending.status === 200 && Array.isArray(pending.data?.data?.complaints), `status=${pending.status}`);
  check('pending contains resolved complaint', pending.data?.data?.complaints.some((c) => String(c._id) === complaintId));

  const auditAllAsCitizen = await api('GET', '/complaints/audit/all', { token: citizen.token });
  check('GET /audit/all as citizen -> 403', auditAllAsCitizen.status === 403, `status=${auditAllAsCitizen.status}`);
  const auditAllAsGp = await api('GET', '/complaints/audit/all', { token: gpTok });
  check('GET /audit/all as gram_pradhan -> 200', auditAllAsGp.status === 200 && Array.isArray(auditAllAsGp.data?.data?.auditLogs), `status=${auditAllAsGp.status}`);

  // Reopen a resolved complaint
  const reopen = await api('POST', `/complaints/${complaintId}/reopen`, { token: citizen.token, body: { citizenFeedback: 'Pothole still there' } });
  check('reopen -> reopened', reopen.status === 200 && reopen.data?.data?.complaint?.status === 'reopened', `status=${reopen.status} got=${JSON.stringify(reopen.data?.data?.complaint?.status)}`);

  // Verify flow on a freshly resolved complaint
  const created3 = await api('POST', '/complaints', {
    token: citizen.token,
    form: makeForm({ title: 'Drainage blocked', description: 'Drainage is blocked near the temple, water logging every rain.', category: 'drainage', ward: '3', village: 'TestVillage', location: loc }),
  });
  const complaintId3 = created3.data?.data?.complaint?._id;
  const r3 = await api('PATCH', `/complaints/${complaintId3}/status`, { token: wardTok, body: { status: 'resolved' } });
  check('complaint3 resolved -> pending verification', r3.status === 200, `status=${r3.status}`);
  const verifyOwn = await api('POST', `/complaints/${complaintId3}/verify`, { token: citizen.token });
  check('verify as owner -> closed', verifyOwn.status === 200 && verifyOwn.data?.data?.complaint?.status === 'closed' && verifyOwn.data?.data?.complaint?.verifiedByCitizen === true, `status=${verifyOwn.status} got=${JSON.stringify(verifyOwn.data?.data?.complaint?.status)}`);

  // Reopened complaint -> resolve again -> citizen verifies (awaiting_citizen_response covered by auto-escalation scheduler)
  const rAgain = await api('PATCH', `/complaints/${complaintId}/status`, { token: wardTok, body: { status: 'resolved' } });
  check('resolve reopened complaint again', rAgain.status === 200 && rAgain.data?.data?.complaint?.status === 'citizen_verification_pending', `status=${rAgain.status} got=${JSON.stringify(rAgain.data?.data?.complaint?.status)}`);

  /* ================= Notifications ================= */
  section('Notifications');
  const notifs = await api('GET', '/notifications', { token: citizen.token });
  check('GET /notifications -> 200', notifs.status === 200 && Array.isArray(notifs.data?.data?.notifications), `status=${notifs.status}`);
  check('unreadCount present', typeof notifs.data?.data?.unreadCount === 'number');
  check('citizen has a verification notification', notifs.data?.data?.notifications.some((n) => n.type === 'citizen_verification'));

  const nId = notifs.data?.data?.notifications.find((n) => !n.read)?._id;
  const readOne = await api('PATCH', `/notifications/${nId}/read`, { token: citizen.token });
  check('mark notification read', readOne.status === 200, `status=${readOne.status}`);
  const readOther = await api('PATCH', `/notifications/${nId}/read`, { token: citizen2.token });
  check('mark others notification as non-admin -> 403', readOther.status === 403, `status=${readOther.status}`);
  const readAll = await api('PATCH', '/notifications/read-all', { token: citizen.token });
  check('mark all read', readAll.status === 200, `status=${readAll.status}`);
  const notifsAfter = await api('GET', '/notifications', { token: citizen.token });
  check('unreadCount drops to 0', notifsAfter.data?.data?.unreadCount === 0, `unread=${notifsAfter.data?.data?.unreadCount}`);

  const wardNotifs = await api('GET', '/notifications', { token: wardTok });
  check('ward member got reopen notification', wardNotifs.data?.data?.notifications.some((n) => n.type === 'complaint_reopened'), JSON.stringify(wardNotifs.data?.data?.notifications?.map((n) => n.type)));

  /* ================= Admin analytics ================= */
  section('Admin analytics');
  const analyticsAsCitizen = await api('GET', '/admin/analytics', { token: citizen.token });
  check('analytics as citizen -> 403', analyticsAsCitizen.status === 403, `status=${analyticsAsCitizen.status}`);
  const analytics = await api('GET', '/admin/analytics', { token: adminTok });
  check('analytics as admin -> 200', analytics.status === 200, `status=${analytics.status}`);
  check('analytics totals present', typeof analytics.data?.data?.totalComplaints === 'number' && Array.isArray(analytics.data?.data?.byStatus));

  /* ================= Delete ================= */
  section('Complaints — delete');
  const delOther = await api('DELETE', `/complaints/${complaintId}`, { token: citizen2.token });
  check('delete others complaint -> 403', delOther.status === 403, `status=${delOther.status}`);

  const delOwn = await api('DELETE', `/complaints/${complaintId2}`, { token: citizen2.token });
  check('delete own complaint -> 200', delOwn.status === 200, `status=${delOwn.status}`);
  const delGone = await api('GET', `/complaints/${complaintId2}`);
  check('deleted complaint -> 404', delGone.status === 404, `status=${delGone.status}`);

  const delByAdmin = await api('DELETE', `/complaints/${complaintCross}`, { token: adminTok });
  check('admin can delete any complaint -> 200', delByAdmin.status === 200, `status=${delByAdmin.status}`);

  /* ================= Admin user delete ================= */
  section('Admin — delete users');
  const delSelf = await api('DELETE', `/admin/users/${adminUser._id}`, { token: adminTok });
  check('delete self -> 400', delSelf.status === 400, `status=${delSelf.status}`);

  /* ================= Security misc ================= */
  section('Security / misc');
  const notFound = await api('GET', '/definitely-not-a-route');
  check('unknown route -> 404', notFound.status === 404, `status=${notFound.status}`);
  if (ENV === 'production') {
    check('SECURITY: production 404 has NO stack trace', typeof notFound.data?.stack === 'undefined', JSON.stringify(notFound.data));
  } else {
    console.log('  SKIP  stack trace check (development mode)');
  }

  const usersRoute = await api('GET', '/users');
  check('users stub route exists', usersRoute.status === 200);

  /* ================= Summary ================= */
  console.log(`\n===== RESULTS: ${passed} passed, ${failed} failed =====`);
  if (failures.length) {
    console.log('\nFailures:');
    failures.forEach((f, i) => console.log(`  ${i + 1}. ${f.name}${f.detail ? `\n      ${f.detail}` : ''}`));
  }
  process.exit(failed > 0 ? 1 : 0);
})().catch((err) => {
  console.error('Suite crashed:', err);
  process.exit(2);
});