# Testing & Automation Strategy

> Auto-generated from source code. Last updated: 2026-06-27

---

## 1. Testing Overview

### Current State: ❌ No Tests Exist

The entire codebase has **zero test files**, **zero test configuration**, and **zero CI/CD automation**. A `grep` for any `*.test.*` / `*.spec.*` / `__tests__` / `.github/workflows` / `jest.config` / `vitest.config` across the full project returns nothing.

| Artifact | Backend | Frontend |
|---|---|---|
| Unit tests | ❌ None | ❌ None |
| Integration tests | ❌ None | ❌ None |
| Component tests | ❌ None | ❌ None |
| E2E tests | ❌ None | ❌ None |
| Coverage reports | ❌ None | ❌ None |
| CI pipeline | ❌ None | ❌ None |
| Pre-commit hooks | ❌ None | ❌ None |

### Recommended Testing Stack

| Layer | Framework | Rationale |
|---|---|---|
| **Backend unit/integration** | **Jest** (v29+) + **Supertest** (v7+) | Most widely used for Express. Chai not needed — Jest has built-in assertions and mocking. Matches standard Node.js testing patterns. |
| **Frontend unit/component** | **Vitest** + **@testing-library/react** | Already using Vite — Vitest integrates natively with the Vite config (plugins, resolve aliases, proxies). Testing Library encourages accessible component tests. |
| **Frontend E2E** | **Playwright** (v1.50+) | Multi-browser, parallel, network interception, mobile emulation. Better than Cypress for this project's Leaflet map + file upload flows. |
| **API E2E** | **Supertest** (over Jest) | Tests HTTP layer without needing a running server — passes Express app directly. |
| **Coverage** | Istanbul (built into Jest/Vitest) | `--coverage` flag. Configure thresholds in Jest/Vitest config. |

### Libraries to Install

```bash
# Backend
npm install --save-dev jest supertest
npm install --save-dev @types/jest  # if using JSDoc hints

# Frontend
npm install --save-dev vitest @testing-library/react @testing-library/jest-dom
npm install --save-dev @testing-library/user-event jsdom

# E2E (separate directory or root-level)
npm install --save-dev @playwright/test
```

---

## 2. Test Structure

### Recommended Directory Layout

```
project-root/
├── backend/
│   ├── __tests__/                    # Mirror of src structure
│   │   ├── unit/
│   │   │   ├── utils/
│   │   │   │   ├── generateToken.test.js
│   │   │   │   ├── otpUtils.test.js
│   │   │   │   └── autoEscalation.test.js
│   │   │   ├── middlewares/
│   │   │   │   ├── authMiddleware.test.js
│   │   │   │   ├── errorMiddleware.test.js
│   │   │   │   └── sanitize.test.js
│   │   │   └── models/
│   │   │       ├── User.test.js
│   │   │       └── Complaint.test.js
│   │   └── integration/
│   │       ├── auth.test.js           # All /api/auth routes
│   │       ├── complaints.test.js     # All /api/complaints routes
│   │       ├── admin.test.js          # All /api/admin routes
│   │       └── notifications.test.js  # All /api/notifications routes
│   ├── jest.config.js
│   └── package.json  # ← add "test" script here
│
├── frontend/
│   ├── src/
│   │   └── __tests__/
│   │       ├── components/
│   │       │   ├── ComplaintCard.test.jsx
│   │       │   ├── StatusBadge.test.jsx
│   │       │   ├── OtpModal.test.jsx
│   │       │   ├── ProtectedRoute.test.jsx
│   │       │   └── NotificationBell.test.jsx
│   │       ├── pages/
│   │       │   ├── Login.test.jsx
│   │       │   ├── Register.test.jsx
│   │       │   ├── SubmitComplaint.test.jsx
│   │       │   ├── MyComplaints.test.jsx
│   │       │   └── ComplaintDetail.test.jsx
│   │       ├── services/
│   │       │   ├── api.test.js
│   │       │   ├── authService.test.js
│   │       │   └── geocodingService.test.js
│   │       ├── store/
│   │       │   └── authStore.test.js
│   │       ├── hooks/
│   │       │   └── use-toast.test.js
│   │       └── utils/
│   │           ├── imageValidation.test.js
│   │           └── constants.test.js
│   ├── vitest.config.js
│   └── package.json  # ← add "test" script here
│
└── e2e/                              # Playwright
    ├── playwright.config.js
    ├── fixtures/
    │   └── auth.fixture.js
    └── specs/
        ├── auth-flow.spec.js
        ├── complaint-lifecycle.spec.js
        └── admin-management.spec.js
```

### Naming Conventions

| Test Type | Pattern | Location |
|---|---|---|
| Unit test (backend) | `*.test.js` | `backend/__tests__/unit/` |
| Integration test | `*.test.js` | `backend/__tests__/integration/` |
| Component test | `*.test.jsx` | `frontend/src/__tests__/components/` or colocated |
| Service test | `*.test.js` | `frontend/src/__tests__/services/` |
| E2E spec | `*.spec.js` | `e2e/specs/` |

### File-to-Test Mapping Table

| Source File | Test File | Type |
|---|---|---|
| `backend/utils/generateToken.js` | `backend/__tests__/unit/utils/generateToken.test.js` | Unit |
| `backend/utils/otpUtils.js` | `backend/__tests__/unit/utils/otpUtils.test.js` | Unit |
| `backend/utils/autoEscalation.js` | `backend/__tests__/unit/utils/autoEscalation.test.js` | Unit |
| `backend/utils/emailService.js` | `backend/__tests__/unit/utils/emailService.test.js` | Unit |
| `backend/middlewares/authMiddleware.js` | `backend/__tests__/unit/middlewares/authMiddleware.test.js` | Unit |
| `backend/middlewares/errorMiddleware.js` | `backend/__tests__/unit/middlewares/errorMiddleware.test.js` | Unit |
| `backend/middlewares/sanitize.js` | `backend/__tests__/unit/middlewares/sanitize.test.js` | Unit |
| `backend/models/User.js` | `backend/__tests__/unit/models/User.test.js` | Unit |
| `backend/models/Complaint.js` | `backend/__tests__/unit/models/Complaint.test.js` | Unit |
| `backend/index.js` (all routes) | `backend/__tests__/integration/auth.test.js` | Integration |
| | `backend/__tests__/integration/complaints.test.js` | Integration |
| | `backend/__tests__/integration/admin.test.js` | Integration |
| | `backend/__tests__/integration/notifications.test.js` | Integration |
| `frontend/src/components/complaints/StatusBadge.jsx` | `frontend/src/__tests__/components/StatusBadge.test.jsx` | Component |
| `frontend/src/components/complaints/ComplaintCard.jsx` | `frontend/src/__tests__/components/ComplaintCard.test.jsx` | Component |
| `frontend/src/components/auth/OtpModal.jsx` | `frontend/src/__tests__/components/OtpModal.test.jsx` | Component |
| `frontend/src/components/common/ProtectedRoute.jsx` | `frontend/src/__tests__/components/ProtectedRoute.test.jsx` | Component |
| `frontend/src/components/common/Navbar.jsx` | `frontend/src/__tests__/components/Navbar.test.jsx` | Component |
| `frontend/src/components/common/NotificationBell.jsx` | `frontend/src/__tests__/components/NotificationBell.test.jsx` | Component |
| `frontend/src/pages/auth/Login.jsx` | `frontend/src/__tests__/pages/Login.test.jsx` | Component |
| `frontend/src/pages/auth/Register.jsx` | `frontend/src/__tests__/pages/Register.test.jsx` | Component |
| `frontend/src/pages/citizen/SubmitComplaint.jsx` | `frontend/src/__tests__/pages/SubmitComplaint.test.jsx` | Component |
| `frontend/src/services/api.js` | `frontend/src/__tests__/services/api.test.js` | Unit |
| `frontend/src/services/geocodingService.js` | `frontend/src/__tests__/services/geocodingService.test.js` | Unit |
| `frontend/src/store/authStore.js` | `frontend/src/__tests__/store/authStore.test.js` | Unit |
| `frontend/src/utils/imageValidation.js` | `frontend/src/__tests__/utils/imageValidation.test.js` | Unit |
| `frontend/src/utils/constants.js` | `frontend/src/__tests__/utils/constants.test.js` | Unit |

---

## 3. Running Tests

### Planned Scripts (to be added to `package.json`)

#### Backend (`backend/package.json`)

| Command | What It Runs | When to Use |
|---|---|---|
| `npm test` | `jest --coverage` | Run all backend tests with coverage report |
| `npm run test:unit` | `jest __tests__/unit` | Only unit tests (fast — no DB needed) |
| `npm run test:integration` | `jest __tests__/integration --runInBand` | Only integration tests. `--runInBand` avoids DB connection conflicts. |
| `npm run test:watch` | `jest --watch` | Watch mode during development |
| `npm run test:verbose` | `jest --verbose` | Full test names in output |

#### Frontend (`frontend/package.json`)

| Command | What It Runs | When to Use |
|---|---|---|
| `npm test` | `vitest run` | Run all frontend tests once |
| `npm run test:watch` | `vitest` | Watch mode during development |
| `npm run test:coverage` | `vitest run --coverage` | Run with coverage report |
| `npm run test:ui` | `vitest --ui` | Vitest UI dashboard (requires `@vitest/ui`) |

#### Root (`package.json`, if monorepo scripts added)

| Command | What It Runs |
|---|---|
| `npm test` | `npm test --prefix backend && npm test --prefix frontend` |

### Expected Test Runner Output

```
PASS  backend/__tests__/integration/auth.test.js
  POST /api/auth/register
    ✓ should register a new user (120 ms)
    ✓ should reject duplicate email (45 ms)
    ✓ should reject without OTP verification (38 ms)
    ✓ should validate required fields (25 ms)
  POST /api/auth/login
    ✓ should login with valid credentials (52 ms)
    ✓ should reject invalid password (18 ms)
  GET /api/auth/me
    ✓ should return user profile with valid token (30 ms)
    ✓ should reject expired token (12 ms)

Test Suites: 1 passed, 1 total
Tests:       8 passed, 8 total
Snapshots:   0 total
Time:        2.345 s
```

---

## 4. Unit Tests

### Currently Tested

**🔴 Nothing.** No unit tests exist anywhere in the project.

### Critical Untested Paths (High Priority)

All priorities ranked by business risk.

#### Backend Utilities

| File | Function(s) | What to Test | Risk |
|---|---|---|---|
| `otpUtils.js` | `generateOtp` | Returns 6-digit string, random distribution | 🔴 High — security |
| `otpUtils.js` | `hashOtp` / `verifyOtpHash` | Bcrypt hash round-trip | 🔴 High — security |
| `otpUtils.js` | `checkRateLimit` | Returns `{ allowed: false }` after 5 requests, resets after window | 🔴 High — auth |
| `otpUtils.js` | `checkOtpLockout` | Returns `{ locked: true }` after 5 failed attempts, exponential backoff | 🔴 High — auth |
| `otpUtils.js` | `recordFailedOtpAttempt` | Lockout level increments, duration doubles | 🔴 High — auth |
| `generateToken.js` | `generateToken` | JWT contains `{ id, role }`, expires in 7d | 🔴 High — auth |
| `autoEscalation.js` | `runAutoEscalation` | Status transitions at 7d and 15d, notification creation, batch size 100 | 🟡 Medium — data integrity |
| `emailService.js` | `sendOtpEmail` / `sendVerificationEmail` | Simulated mode when no API key, template rendering | 🟡 Medium |

#### Backend Middleware

| File | Function(s) | What to Test | Risk |
|---|---|---|---|
| `authMiddleware.js` | `protect` | Missing header → 401, blacklisted token → 401, expired → 401, valid → `req.user` set | 🔴 High — auth |
| `authMiddleware.js` | `authorizeRoles` | Allowed role passes, disallowed role → 403 | 🔴 High — auth |
| `authMiddleware.js` | `addToBlacklist` / `isBlacklisted` | Token added, then rejected | 🔴 High — auth |
| `sanitize.js` | `sanitizeInput` | `$ne`, `$gt` operators stripped from body/query/params, nested objects handled | 🔴 High — security |
| `errorMiddleware.js` | `errorHandler` | ValidationError → 400, CastError → 400, 11000 → 400, JWT errors → 401, generic → 500 | 🔴 High — error handling |

#### Backend Models

| File | Method | What to Test | Risk |
|---|---|---|---|
| `User.js` | `pre('save')` | Password only hashes if modified, bcrypt salt rounds | 🔴 High — security |
| `User.js` | `matchPassword` | Correct password → true, wrong → false | 🔴 High — security |
| `Complaint.js` | `pre('save')` | `updatedAt` set, `upvoteCount` = `upvotes.length` | 🟡 Medium |
| `User.js` | indexes | Unique constraint on email, compound index on `(role, ward)` | 🟡 Medium |

#### Frontend Utilities

| File | Function(s) | What to Test | Risk |
|---|---|---|---|
| `imageValidation.js` | `validateImageFile` | Valid type passes, invalid type fails, size > 5MB fails, empty file fails | 🔴 High — UX |
| `imageValidation.js` | `validateImageDimensions` | Image > 4096px fails, image < 50px fails, corrupt file fails | 🟡 Medium |
| `imageValidation.js` | `validateImageCount` | Total > 5 fails | 🟡 Medium |
| `constants.js` | All exports | Correct values, all categories present, all statuses present | 🟡 Low |
| `lib/utils.js` | `cn` | Merges classes correctly, conflict resolution | 🟡 Low |
| `validateEnv.js` | `validateEnvironment` | Warns on missing vars, silent when present | 🟡 Low |

#### Frontend Store

| File | What to Test | Risk |
|---|---|---|
| `authStore.js` | `loginSuccess` sets user+token, `logout` clears, `updateUser` merges, persistence shape | 🔴 High — auth |

#### Frontend Services

| File | What to Test | Risk |
|---|---|---|
| `api.js` | Request interceptor adds Bearer token, response interceptor calls logout on 401, timeout handling | 🔴 High — auth |
| `geocodingService.js` | Successful response parsed correctly, dedup works, timeout/401/429 handling | 🟡 Medium |

### Example Unit Test Template (Backend)

```javascript
// backend/__tests__/unit/utils/otpUtils.test.js
const { generateOtp, MAX_ATTEMPTS, OTP_LENGTH } = require('../../../utils/otpUtils');

describe('generateOtp()', () => {
  it('should return a 6-digit string', () => {
    const otp = generateOtp();
    expect(otp).toMatch(/^\d{6}$/);
  });

  it('should return different values on successive calls', () => {
    const otp1 = generateOtp();
    const otp2 = generateOtp();
    expect(otp1).not.toBe(otp2);
  });

  it('should only contain numeric characters', () => {
    const otp = generateOtp();
    expect(otp).toMatch(/^\d+$/);
  });
});

describe('checkRateLimit()', () => {
  it('should allow first request', () => {
    const result = checkRateLimit('test@example.com');
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(4);
  });

  it('should block after 5 requests', () => {
    const email = 'ratelimit@example.com';
    for (let i = 0; i < 5; i++) checkRateLimit(email);
    const result = checkRateLimit(email);
    expect(result.allowed).toBe(false);
    expect(result.retryAfter).toBeGreaterThan(0);
  });
});
```

### Example Unit Test Template (Frontend)

```javascript
// frontend/src/__tests__/utils/imageValidation.test.js
import { describe, it, expect } from 'vitest';
import { validateImageFile, validateImageDimensions } from '../../utils/imageValidation';

describe('validateImageFile()', () => {
  it('should accept a valid JPEG file', () => {
    const file = new File([''], 'photo.jpg', { type: 'image/jpeg' });
    Object.defineProperty(file, 'size', { value: 1024 * 1024 });
    expect(validateImageFile(file).valid).toBe(true);
  });

  it('should reject a GIF file', () => {
    const file = new File([''], 'photo.gif', { type: 'image/gif' });
    Object.defineProperty(file, 'size', { value: 1024 * 1024 });
    expect(validateImageFile(file).valid).toBe(false);
  });

  it('should reject files larger than 5 MB', () => {
    const file = new File([''], 'large.jpg', { type: 'image/jpeg' });
    Object.defineProperty(file, 'size', { value: 6 * 1024 * 1024 });
    expect(validateImageFile(file).valid).toBe(false);
  });

  it('should reject empty files', () => {
    const file = new File([''], 'empty.jpg', { type: 'image/jpeg' });
    Object.defineProperty(file, 'size', { value: 0 });
    expect(validateImageFile(file).valid).toBe(false);
  });
});
```

---

## 5. Integration / API Tests

### Currently Tested

**🔴 Nothing.** No integration tests exist for any API route.

### Routes Requiring Integration Tests

Every route handler should be tested. Grouped by route file.

#### Auth Routes (`backend/routes/auth.js`) — 6 endpoints

| Route | Critical Test Cases | Risk |
|---|---|---|
| `POST /api/auth/send-otp` | Missing email → 400, valid email → 200 + `simulated`, already registered email → 400, rate limited → 429 | 🔴 High |
| `POST /api/auth/verify-otp` | Correct OTP → 200, wrong OTP → 400, expired OTP → 400, max attempts → 400, locked out → 429 | 🔴 High |
| `POST /api/auth/register` | All fields valid → 201 + token, missing OTP → 400, duplicate email → 400, invalid role → 400, weak password → 400 | 🔴 High |
| `POST /api/auth/login` | Valid creds → 200 + token, wrong password → 401, nonexistent email → 401 | 🔴 High |
| `POST /api/auth/logout` | Valid token → 200, blacklisted token → 401, no token → 401 | 🔴 High |
| `GET /api/auth/me` | Valid token → 200 + user, expired token → 401, blacklisted → 401 | 🔴 High |

#### Complaint Routes (`backend/routes/complaints.js`) — 16 endpoints

| Route | Critical Test Cases | Risk |
|---|---|---|
| `GET /api/complaints` | No filters → paginated results, filter by village/status/category, invalid page → 1, limit > 100 → capped | 🔴 High |
| `GET /api/complaints/:id` | Valid ID → 200 + comments, invalid ID → 404 | 🔴 High |
| `POST /api/complaints` | No auth → 401, missing fields → 400, invalid category → 400, with images → 201, > 5 images → 400, large image → 400 | 🔴 High |
| `POST /api/complaints/:id/upvote` | First upvote → count++, second → count--, already upvoted → toggle | 🟡 Medium |
| `POST /api/complaints/:id/comment` | Valid message → 201, official flag for ward_member, empty message → 400 | 🟡 Medium |
| `PATCH /api/complaints/:id/status` | Valid transitions, rejected needs reason, citizen_verification_pending not settable directly | 🔴 High |
| `POST /api/complaints/:id/verify` | Owner only → 200, non-owner → 403, wrong status → 400 | 🔴 High |
| `POST /api/complaints/:id/reopen` | Owner only → 200 + notification, non-owner → 403 | 🔴 High |
| `DELETE /api/complaints/:id` | Owner → 200, admin → 200, non-owner non-admin → 403 | 🟡 Medium |
| `GET /api/complaints/:id/audit` | Multiple actions logged → all returned | 🟡 Medium |
| `GET /api/complaints/ward/list` | Returns only user's ward complaints, status filter | 🟡 Medium |
| `GET /api/complaints/admin/all` | Returns all, available filters work (status, category, village, ward) | 🟡 Medium |
| `GET /api/complaints/verification/pending` | Returns only citizen_verification_pending + awaiting_citizen_response | 🟡 Medium |
| `GET /api/complaints/audit/all` | Returns all audit logs, optional complaintId filter | 🟡 Medium |

#### Admin Routes (`backend/routes/admin.js`) — 4 endpoints

| Route | Critical Test Cases | Risk |
|---|---|---|
| `GET /api/admin/users` | Non-admin → 403, admin → 200, role filter works, password excluded | 🔴 High |
| `PATCH /api/admin/users/:id/role` | Invalid role → 400, user not found → 404, admin cannot target self? (allowed for role) | 🔴 High |
| `DELETE /api/admin/users/:id` | Admin cannot delete self → 400, valid user deleted → 200 | 🔴 High |
| `GET /api/admin/analytics` | Returns aggregated stats, grams pradhan can access, citizen cannot | 🟡 Medium |

#### Notification Routes (`backend/routes/notifications.js`) — 3 endpoints

| Route | Critical Test Cases | Risk |
|---|---|---|
| `GET /api/notifications` | Returns only current user's notifications, unreadCount calculated correctly | 🟡 Medium |
| `PATCH /api/notifications/:id/read` | Owner marks → 200, non-owner → 403, not found → 404 | 🟡 Medium |
| `PATCH /api/notifications/read-all` | All unread become read | 🟡 Medium |

### Example Integration Test Template

```javascript
// backend/__tests__/integration/auth.test.js
const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../index');  // would need to export app without starting server

// NOTE: The current backend/index.js starts listen() in connectDB().then().
// For testing, the app should be exported separately and index.js
// should be refactored to separate app creation from server start.

describe('POST /api/auth/register', () => {
  beforeEach(async () => {
    await mongoose.connection.db.dropDatabase();
    // Create a verified OTP record before registration
    const OtpVerification = mongoose.model('OtpVerification');
    await OtpVerification.create({
      email: 'newuser@example.com',
      otpHash: '$2a$10$...', // pre-computed hash for "123456"
      otpExpiry: new Date(Date.now() + 10 * 60 * 1000),
      verified: true,
    });
  });

  it('should register a new user and return JWT token', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Test User',
        email: 'newuser@example.com',
        phone: '9876543210',
        password: 'password123',
        role: 'citizen',
        village: 'TestVillage',
        ward: 'Ward-1',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.token).toBeDefined();
    expect(res.body.role).toBe('citizen');
  });

  it('should reject registration without OTP verification', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'No OTP User',
        email: 'nootp@example.com',
        phone: '9876543211',
        password: 'password123',
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('OTP verification');
  });

  it('should reject duplicate email', async () => {
    await request(app).post('/api/auth/register').send({
      name: 'First', email: 'dup@example.com', phone: '1111111111',
      password: 'password123',
    });
    const res = await request(app).post('/api/auth/register').send({
      name: 'Second', email: 'dup@example.com', phone: '2222222222',
      password: 'password123',
    });
    expect(res.status).toBe(400);
    expect(res.body.message).toContain('already registered');
  });

  it('should validate all required fields', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'invalid' });
    expect(res.status).toBe(400);
    expect(res.body.errors).toBeDefined();
  });
});
```

> **⚠️ Refactoring Needed:** The backend's `index.js` currently starts the server inside `connectDB().then()`. For integration testing, the `app` export must be separated from the `server.listen()` call. A common pattern:
> 1. Create `backend/app.js` — exports the Express app
> 2. `backend/index.js` — imports `app`, calls `connectDB()` then `app.listen()`
> 3. Tests import from `app.js` directly using `supertest`

---

## 6. Component Tests (Frontend)

### Currently Tested

**🔴 Nothing.** No component tests exist.

### Priority Components That Need Tests

#### 🔴 High Priority (Auth + Core Flow)

| Component | File | What to Test |
|---|---|---|
| **Login** | `pages/auth/Login.jsx` | Form renders, validation errors display, submit calls `login()` then `loginSuccess()`, redirects based on role, shows toast on error |
| **Register** | `pages/auth/Register.jsx` | All fields render, Zod validation shows messages, OTP modal opens on submit, verify flow succeeds, password mismatch error |
| **ProtectedRoute** | `components/common/ProtectedRoute.jsx` | No user → redirect to `/login`, user without role → redirect to `/`, user with correct role → renders children, toast on access denied |
| **OtpModal** | `components/auth/OtpModal.jsx` | 6 inputs render, paste fills all inputs, backspace navigates, resend countdown, verify calls `onVerify`, error display, loading state |

#### 🟡 Medium Priority (Core Features)

| Component | File | What to Test |
|---|---|---|
| **SubmitComplaint** | `pages/citizen/SubmitComplaint.jsx` | 3-step wizard navigation, form validation on step 1, map click sets marker, image upload with validation, review step shows data, submit calls `createComplaint` with FormData |
| **ComplaintDetail** | `pages/citizen/ComplaintDetail.jsx` | Complaint data renders, status flows display, upvote toggle, comment submission, status update for officials, verify/reopen buttons for owner |
| **MyComplaints** | `pages/citizen/MyComplaints.jsx` | Stat cards show counts, tab filtering works, delete confirmation, empty state, loading skeleton |
| **WardDashboard** | `pages/ward/WardDashboard.jsx` | Table renders, status filter, sort toggle, action dropdown opens, status update dialog submits |
| **ManageUsers** | `pages/admin/ManageUsers.jsx` | User list renders, search filters, role filter tabs, role change calls API, delete dialog confirmation |
| **AdminDashboard** | `pages/admin/AdminDashboard.jsx` | Loading skeleton shows, error state renders, all 4 charts render with data, stat cards show correct values |
| **NotificationBell** | `components/common/NotificationBell.jsx` | Bell shows unread count badge, dropdown opens notifications, mark read calls API, error state shows retry button, empty state |
| **Navbar** | `components/common/Navbar.jsx` | Role-based nav links, user avatar and initials, logout calls `logout()`, mobile sheet menu opens |

#### 🟢 Lower Priority (Presentation)

| Component | File | What to Test |
|---|---|---|
| **ComplaintCard** | `components/complaints/ComplaintCard.jsx` | Title, description, status badge, upvote button, upvote count, category badge, date, click navigates to detail |
| **StatusBadge** | `components/complaints/StatusBadge.jsx` | Maps all 9 statuses to correct labels and badge variants |
| **ErrorBoundary** | `components/common/ErrorBoundary.jsx` | Catches errors, renders fallback UI, "Try Again" resets state |
| **PageTransition** | `components/page-transition.jsx` | Renders children inside motion.div |
| **ThemeProvider** | `components/theme-provider.jsx` | Sets dark class on html, persists to localStorage, toggle works |

### Example Component Test Template

```jsx
// frontend/src/__tests__/components/StatusBadge.test.jsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import StatusBadge from '../../components/complaints/StatusBadge';

describe('StatusBadge', () => {
  const cases = [
    { status: 'pending', expected: 'Pending' },
    { status: 'approved', expected: 'Approved' },
    { status: 'rejected', expected: 'Rejected' },
    { status: 'in_progress', expected: 'In Progress' },
    { status: 'resolved', expected: 'Resolved' },
    { status: 'citizen_verification_pending', expected: 'Citizen Verification Pending' },
    { status: 'awaiting_citizen_response', expected: 'Awaiting Citizen Response' },
    { status: 'reopened', expected: 'Reopened' },
    { status: 'closed', expected: 'Closed' },
  ];

  it.each(cases)('should render "$expected" for status "$status"', ({ status, expected }) => {
    render(<StatusBadge status={status} />);
    expect(screen.getByText(expected)).toBeInTheDocument();
  });
});
```

```jsx
// frontend/src/__tests__/components/ProtectedRoute.test.jsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ProtectedRoute from '../../components/common/ProtectedRoute';
import useAuthStore from '../../store/authStore';

// Mock Zustand store
vi.mock('../../store/authStore', () => ({
  default: vi.fn(),
}));

describe('ProtectedRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should redirect to /login when no user is logged in', () => {
    useAuthStore.mockImplementation((selector) => {
      const state = { user: null, isLoading: false };
      return selector ? selector(state) : state;
    });

    render(
      <MemoryRouter initialEntries={['/protected']}>
        <ProtectedRoute>
          <div>Protected Content</div>
        </ProtectedRoute>
      </MemoryRouter>
    );

    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });

  it('should render children when user has the correct role', () => {
    useAuthStore.mockImplementation((selector) => {
      const state = { user: { _id: '1', role: 'admin' }, isLoading: false };
      return selector ? selector(state) : state;
    });

    render(
      <MemoryRouter>
        <ProtectedRoute roles={['admin']}>
          <div>Admin Content</div>
        </ProtectedRoute>
      </MemoryRouter>
    );

    expect(screen.getByText('Admin Content')).toBeInTheDocument();
  });
});
```

---

## 7. End-to-End Tests

### Currently Tested

**🔴 Nothing.** No E2E framework or specs exist.

### Recommended Framework: Playwright

```bash
npm init playwright@latest -- --yes --browser chromium
```

### Required `playwright.config.js`

```javascript
// e2e/playwright.config.js
module.exports = {
  testDir: './specs',
  timeout: 30000,
  retries: 1,
  use: {
    baseURL: 'http://localhost:5173',
    apiURL: 'http://localhost:5000/api',
    headless: true,
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
    { name: 'firefox', use: { browserName: 'firefox' } },
    // Mobile viewport
    { name: 'mobile', use: { browserName: 'chromium', viewport: { width: 375, height: 667 } } },
  ],
};
```

### Critical User Journeys (Priority Order)

#### Journey 1: Citizen Registration → Login → Submit Complaint → Verify Resolution

```gherkin
Feature: Complete Complaint Lifecycle

  Scenario: Citizen registers, logs in, submits a complaint, verifies resolution
    Given I am a new user with email "citizen@test.com"
    When I navigate to the Register page
    And I fill in the registration form with valid data
    And I receive the OTP via email
    And I enter the OTP in the verification modal
    And I submit the registration
    Then I should be logged in and redirected to the Home page

    When I click "Submit a Complaint"
    And I fill in Step 1 (title, category, description, village, ward)
    And I click Next
    And I click the map to pin a location
    And I upload 2 valid images
    And I click Next
    And I click Submit Complaint
    Then I should see a success message
    And I should be on the My Complaints page
    And my new complaint should appear in the list
```

#### Journey 2: Official Login → View Ward Complaints → Update Status

```gherkin
Feature: Official Complaint Management

  Scenario: Ward member logs in and updates complaint status
    Given I am logged in as a ward_member
    When I navigate to the Ward Dashboard
    Then I should see a table of complaints in my ward
    And I should see stat cards (total, pending, in progress, etc.)

    When I click "Actions" on a complaint and select "Update Status"
    And I change the status to "Approved"
    Then the complaint status should update in the table

    When I change the status to "Resolved"
    And I enter resolution remarks
    Then the complaint status should become "Citizen Verification Pending"
```

#### Journey 3: Admin → Manage Users → Change Role → Delete User

```gherkin
Feature: Admin User Management

  Scenario: Admin manages user roles
    Given I am logged in as an admin
    When I navigate to the Admin Dashboard
    Then I should see analytics charts

    When I click "Manage Users"
    Then I should see a table of all users

    When I change a citizen's role to "ward_member"
    Then the role badge should update to "Ward Member"
    And the user should become "Verified"

    When I click the delete button on a different user
    And I confirm the deletion dialog
    Then the user should be removed from the list
```

#### Journey 4: Citizen Reopens → Official Receives Notification

```gherkin
Feature: Citizen Verification Flow

  Scenario: Citizen rejects resolution and official is notified
    Given I am logged in as a citizen
    And I have a complaint with status "Citizen Verification Pending"

    When I click "Issue Still Exists"
    And I select a feedback reason "Road still damaged"
    And I click "Submit Feedback & Reopen"
    Then the complaint status should become "Reopened"

    When I log in as a ward_member in the same ward
    Then I should see a notification in the bell dropdown
    And the notification text should mention the reopened complaint
```

### Example Playwright Test

```javascript
// e2e/specs/auth-flow.spec.js
const { test, expect } = require('@playwright/test');

test.describe('Registration Flow', () => {
  const testEmail = `test-${Date.now()}@example.com`;

  test('should register a new user successfully', async ({ page }) => {
    // Navigate to register page
    await page.goto('/register');
    await expect(page.locator('h2')).toContainText('Create Account');

    // Fill registration form
    await page.fill('input[aria-label="Full Name"]', 'Test User');
    await page.fill('input[aria-label="Email"]', testEmail);
    await page.fill('input[aria-label="Phone"]', '9876543210');
    await page.fill('input[aria-label="Password"]', 'password123');
    await page.fill('input[aria-label="Confirm Password"]', 'password123');
    await page.fill('input[aria-label="Village"]', 'Test Village');
    await page.fill('input[aria-label="Ward"]', 'Ward-1');
    await page.selectOption('select', 'citizen');

    // Click create account
    await page.click('button[type="submit"]');

    // OTP modal should appear
    await expect(page.locator('text=Email Verification')).toBeVisible();

    // The OTP is logged to console since we're in simulated mode
    // In test, we'd read the OTP from the backend console/logs
    // For Playwright, we'd need a test hook to fetch the OTP

    // Enter OTP digits (mocked via API intercept)
    await page.fill('input[aria-label="Digit 1"]', '1');
    await page.fill('input[aria-label="Digit 2"]', '2');
    await page.fill('input[aria-label="Digit 3"]', '3');
    await page.fill('input[aria-label="Digit 4"]', '4');
    await page.fill('input[aria-label="Digit 5"]', '5');
    await page.fill('input[aria-label="Digit 6"]', '6');

    await page.click('text=Verify OTP');

    // Should redirect to home
    await expect(page).toHaveURL('/');
  });
});
```

---

## 8. Mocking Strategy

### What Needs Mocking

| Dependency | Where Used | Mock Strategy |
|---|---|---|
| **MongoDB** | All backend controllers + models | Use `mongodb-memory-server` (in-memory MongoDB) for integration tests. Not mocked for model unit tests — use actual in-memory instance. |
| **Cloudinary** | `complaintController.js` (create, delete), `config/cloudinary.js` | Mock `cloudinary.uploader.upload` and `cloudinary.uploader.destroy` at the module level (Jest `jest.mock('cloudinary')`). |
| **Resend (email)** | `emailService.js` | Mock `resend.emails.send` to return `{ data: { id: 'mock' }, error: null }`. Or check that it was called with the correct arguments. |
| **JWT** | `generateToken.js`, `authMiddleware.js` | Mock `jsonwebtoken.sign` for token generation tests. For integration tests, use real JWT with a test secret. |
| **bcrypt** | `User.js` (pre-save hook), `otpUtils.js` | Not typically mocked — bcrypt is part of the contract. For speed, use `bcrypt.hashSync` with 4 rounds in test config. |
| **Geoapify API** | `geocodingService.js` | Mock `axios.get` at the HTTP level using `msw` (Mock Service Worker) or `nock`. Return canned geocoding responses. |
| **Axios (frontend)** | All service files | Mock the Axios instance directly using `vi.mock('../../services/api')` in Vitest. Or use `msw` for more realistic HTTP mocking. |
| **Zustand store** | Multiple components | Mock the `useAuthStore` selector. Vitest's `vi.mock()` on the module path. |
| **Leaflet map** | `SubmitComplaint.jsx`, `ComplaintDetail.jsx` | Leaflet needs DOM APIs not available in jsdom. Use `vi.mock('leaflet')` and mock `L.map`, `L.marker`, etc. For component tests that don't test map behavior, stub the map components. |
| **`window.location`** | `api.js` (redirect on 401) | Mock `window.location.href` assignment using `Object.defineProperty`. |

### Recommended Mock Setup

#### Backend: Jest Manual Mock (`__mocks__/`)

```javascript
// backend/__mocks__/cloudinary.js
const mockUpload = jest.fn();
const mockDestroy = jest.fn();

module.exports = {
  v2: {
    uploader: {
      upload: mockUpload,
      destroy: mockDestroy,
      config: jest.fn(),
    },
    config: jest.fn(),
  },
};

module.exports.mockUpload = mockUpload;
module.exports.mockDestroy = mockDestroy;
```

#### Frontend: Vitest Module Mock

```javascript
// In vitest setup file or test file
vi.mock('../../services/api', () => ({
  default: {
    post: vi.fn(),
    get: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
    interceptors: {
      request: { use: vi.fn() },
      response: { use: vi.fn() },
    },
  },
}));
```

### Test Environment Variables

| Variable | Test Value | Purpose |
|---|---|---|
| `MONGO_URI` | `mongodb://localhost:27017/panchayat_test` | Used by `mongodb-memory-server` (auto-generates) |
| `JWT_SECRET` | `test-jwt-secret-for-unit-tests-only` | Fixed secret for predictable token generation |
| `NODE_ENV` | `test` | Disables request logging, hides stack traces in errors |
| `CLIENT_URL` | `http://localhost:5173` | CORS origin for test requests |
| `RESEND_API_KEY` | (not set) | Ensures simulated mode (OTP logged to console) |
| `VITE_API_URL` | `http://localhost:5000/api` | Frontend API base URL |
| `VITE_GEOAPIFY_API_KEY` | `test-key` | Used when testing geocoding service |

### Vitest Configuration File

```javascript
// frontend/vitest.config.js
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/__tests__/setup.js'],
    css: false,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.{js,jsx}'],
      exclude: ['src/**/ui/**', 'src/main.jsx', 'src/**/*.test.*'],
    },
  },
});
```

```javascript
// frontend/src/__tests__/setup.js
import '@testing-library/jest-dom';
```

---

## 9. CI/CD Automation

### Current State: ❌ No CI/CD

No `.github/workflows/`, no `vercel.json`, no `netlify.toml`, no Docker files. The project has zero automation.

### Recommended GitHub Actions Pipeline

```yaml
# .github/workflows/ci.yml
name: CI Pipeline
on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  lint:
    name: Lint & Format Check
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
          cache-dependency-path: |
            backend/package-lock.json
            frontend/package-lock.json

      - name: Install backend dependencies
        run: npm ci
        working-directory: backend

      - name: Install frontend dependencies
        run: npm ci
        working-directory: frontend

      - name: Lint backend
        run: npx eslint .
        working-directory: backend
        continue-on-error: true  # backend has no eslint config yet

      - name: Lint frontend
        run: npm run lint
        working-directory: frontend

  test-backend:
    name: Backend Tests
    runs-on: ubuntu-latest
    needs: lint
    services:
      mongodb:
        image: mongo:7
        ports:
          - 27017:27017
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
          cache-dependency-path: backend/package-lock.json

      - name: Install dependencies
        run: npm ci
        working-directory: backend

      - name: Run unit tests
        run: npm run test:unit
        working-directory: backend
        env:
          JWT_SECRET: test-secret
          NODE_ENV: test

      - name: Run integration tests
        run: npm run test:integration
        working-directory: backend
        env:
          MONGO_URI: mongodb://localhost:27017
          JWT_SECRET: test-secret
          NODE_ENV: test

  test-frontend:
    name: Frontend Tests
    runs-on: ubuntu-latest
    needs: lint
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
          cache-dependency-path: frontend/package-lock.json

      - name: Install dependencies
        run: npm ci
        working-directory: frontend

      - name: Run unit & component tests
        run: npm test
        working-directory: frontend
        env:
          VITE_API_URL: http://localhost:5000/api

      - name: Build frontend
        run: npm run build
        working-directory: frontend

  e2e:
    name: E2E Tests
    runs-on: ubuntu-latest
    needs: [test-backend, test-frontend]
    services:
      mongodb:
        image: mongo:7
        ports:
          - 27017:27017
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Install all dependencies
        run: |
          npm ci --prefix backend
          npm ci --prefix frontend
          npx playwright install chromium

      - name: Start backend
        run: |
          npm start &
          sleep 5
        working-directory: backend
        env:
          MONGO_URI: mongodb://localhost:27017
          JWT_SECRET: test-secret
          NODE_ENV: test

      - name: Start frontend
        run: |
          npx vite --port 5173 &
          sleep 3
        working-directory: frontend
        env:
          VITE_API_URL: http://localhost:5000/api

      - name: Run Playwright tests
        run: npx playwright test
        working-directory: e2e
```

### Stage Pipeline Diagram

```
push/PR → Lint ──→ Backend Tests ──→ Frontend Tests ──→ E2E Tests ──→ Build ──→ Deploy
                                     └── Unit
                                     └── Integration
```

---

## 10. Quality Gates

### Current State: ❌ None

No coverage thresholds, no pre-commit hooks, no lint-staged.

### Recommended Quality Gates

| Gate | Threshold | How Enforced |
|---|---|---|
| **Backend unit test coverage** | >= 80% | `jest --coverage --coverageThreshold` |
| **Backend integration tests** | All routes tested | Manual review in CI (no auto-threshold) |
| **Frontend component coverage** | >= 70% | `vitest --coverage.thresholds` |
| **Frontend build** | Must pass | `vite build` in CI |
| **ESLint** | Zero errors | `eslint .` in CI |
| **E2E critical paths** | 3 journeys passing | Playwright in CI |

### Jest Coverage Threshold Config

```javascript
// backend/jest.config.js
module.exports = {
  testEnvironment: 'node',
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
    './utils/otpUtils.js': {
      branches: 95,
      functions: 95,
      lines: 95,
    },
    './middlewares/authMiddleware.js': {
      branches: 100,
      functions: 100,
      lines: 100,
    },
  },
};
```

### Vitest Coverage Threshold Config

```javascript
// frontend/vitest.config.js
test: {
  coverage: {
    thresholds: {
      perFile: true,
      statements: 70,
      branches: 65,
      functions: 70,
      lines: 70,
    },
  },
}
```

### Pre-commit Hooks (Recommended)

```bash
# Install husky + lint-staged
npm install --save-dev husky lint-staged
npx husky init

# .husky/pre-commit
npx lint-staged

# package.json (frontend)
"lint-staged": {
  "src/**/*.{js,jsx}": ["eslint --fix", "vitest --bail --changed"],
  "src/**/*.css": ["prettier --write"]
},
```

### Recommended Additions

- **Dependabot**: Enable GitHub Dependabot for `npm` on both `backend/package.json` and `frontend/package.json`
- **CodeQL**: Add GitHub CodeQL analysis for security vulnerabilities
- **Auto-label**: Add a GitHub Action that labels PRs based on conventional commit prefixes

---

## 11. Test Data & Seeding

### Current State: ❌ No Seed Data

No seed scripts, no factories, no fixtures. During development, data must be created manually via API calls.

### Recommended Test Data Strategy

#### Factory Pattern (Using `@jackfranklin/factory-bot` or Plain Functions)

```javascript
// backend/__tests__/factories/user.factory.js
const mongoose = require('mongoose');

function buildUser(overrides = {}) {
  return {
    name: 'Test User',
    email: `user-${Date.now()}@example.com`,
    phone: '9876543210',
    password: 'password123',
    role: 'citizen',
    village: 'TestVillage',
    ward: 'Ward-1',
    isVerified: false,
    emailVerified: true,
    ...overrides,
  };
}

function buildComplaint(overrides = {}) {
  return {
    title: 'Test complaint title',
    description: 'A detailed description of the test complaint (min 30 chars).',
    category: 'roads',
    ward: 'Ward-1',
    village: 'TestVillage',
    location: {
      address: 'Test Address',
      lat: 27.1751,
      lng: 78.0421,
      plusCode: '7JQV+Q8',
    },
    status: 'pending',
    ...overrides,
  };
}

module.exports = { buildUser, buildComplaint };
```

#### Seed Script (For Manual QA / Demo)

```javascript
// backend/seed.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const User = require('./models/User');
const Complaint = require('./models/Complaint');
const Comment = require('./models/Comment');

dotenv.config();

async function seed() {
  await mongoose.connect(process.env.MONGO_URI + '/panchayat');
  console.log('Connected to MongoDB');

  // Drop existing data
  await Promise.all([
    User.deleteMany({}),
    Complaint.deleteMany({}),
    Comment.deleteMany({}),
  ]);

  // Create users
  const admin = await User.create({
    name: 'Admin User',
    email: 'admin@panchayat.gov',
    phone: '9999999999',
    password: 'admin123',
    role: 'admin',
    village: 'Central',
    ward: 'Admin',
    isVerified: true,
    emailVerified: true,
  });

  const citizen = await User.create({
    name: 'Ramesh Kumar',
    email: 'ramesh@example.com',
    phone: '9876543210',
    password: 'citizen123',
    role: 'citizen',
    village: 'Nagla',
    ward: 'Ward-3',
    isVerified: false,
    emailVerified: true,
  });

  const wardMember = await User.create({
    name: 'Suresh Singh',
    email: 'suresh@panchayat.gov',
    phone: '9876543211',
    password: 'ward123',
    role: 'ward_member',
    village: 'Nagla',
    ward: 'Ward-3',
    isVerified: true,
    emailVerified: true,
  });

  // Create complaints
  const complaint = await Complaint.create({
    title: 'Broken street light near main chowk',
    description: 'The street light near the main chowk in Nagla has been broken for over a week. This creates safety issues at night.',
    category: 'street_lights',
    ward: 'Ward-3',
    village: 'Nagla',
    location: { address: 'Main Chowk, Nagla', lat: 27.1751, lng: 78.0421 },
    createdBy: citizen._id,
    status: 'pending',
  });

  console.log('Seed data created:');
  console.log(`  Admin: admin@panchayat.gov / admin123`);
  console.log(`  Citizen: ramesh@example.com / citizen123`);
  console.log(`  Ward Member: suresh@panchayat.gov / ward123`);
  console.log(`  Complaints: ${1}`);

  await mongoose.disconnect();
}

seed().catch(console.error);
```

#### MongoDB Memory Server for Integration Tests

```javascript
// backend/__tests__/setup.js
const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

afterEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
});
```

### Test Data Requirements Per Test Suite

| Test Suite | Data Needed | Factory |
|---|---|---|
| Auth integration | Verified OTP record, unregistered email | `buildUser()`, OtpVerification.create |
| Complaint integration | 1+ citizens, 1+ ward members, 1+ complaints | `buildUser()`, `buildComplaint()` |
| Admin integration | 1 admin, 1 citizen, 1 ward_member | `buildUser()` with role override |
| Notification integration | 1 citizen, 1 notification record | `buildUser()`, Notification.create |
| Auto-escalation | Complaint with `citizen_verification_pending` + old `resolvedAt` | `buildComplaint({ status: 'citizen_verification_pending', resolvedAt: 8 days ago })` |

---

## 12. Testing Roadmap

### Phase 1: Foundation (Week 1)

| Priority | Task | Est. Effort |
|---|---|---|
| 🔴 P0 | Create `backend/jest.config.js` and `frontend/vitest.config.js` | 1 hour |
| 🔴 P0 | Set up `mongodb-memory-server` for backend integration tests | 2 hours |
| 🔴 P0 | Write unit tests for `otpUtils.js` (generate, hash, rate limit, lockout) | 4 hours |
| 🔴 P0 | Write unit tests for `authMiddleware.js` (protect, authorizeRoles, blacklist) | 3 hours |
| 🔴 P0 | Write unit tests for `sanitize.js` (NoSQL injection stripping) | 1 hour |
| 🔴 P0 | Write unit tests for `User.js` model (password hashing, matchPassword) | 2 hours |
| 🔴 P0 | Write integration tests for `POST /api/auth/register` and `POST /api/auth/login` | 4 hours |

**Phase 1 Target:** 6 test files, ~60 test cases

### Phase 2: Core API Coverage (Week 2)

| Priority | Task | Est. Effort |
|---|---|---|
| 🔴 P0 | Integration tests for all 6 auth routes (send-otp, verify-otp, register, login, logout, me) | 6 hours |
| 🔴 P0 | Integration tests for complaint CRUD (list, get by id, create, delete) | 6 hours |
| 🔴 P0 | Integration tests for complaint actions (upvote, comment, status, verify, reopen) | 8 hours |
| 🔴 P0 | Integration tests for admin routes (users, role update, delete, analytics) | 4 hours |
| 🟡 P1 | Integration tests for notification routes (list, mark read, mark all read) | 2 hours |

**Phase 2 Target:** 5 test files, ~100 test cases

### Phase 3: Frontend Component Tests (Week 3)

| Priority | Task | Est. Effort |
|---|---|---|
| 🔴 P0 | Component tests for `StatusBadge` (all 9 statuses) | 1 hour |
| 🔴 P0 | Component tests for `ProtectedRoute` (no user, wrong role, correct role) | 2 hours |
| 🔴 P0 | Component tests for `Login` (form validation, submission, redirect) | 4 hours |
| 🔴 P0 | Component tests for `OtpModal` (input, paste, resend, verify) | 3 hours |
| 🟡 P1 | Component tests for `ComplaintCard` (renders, upvote, navigation) | 2 hours |
| 🟡 P1 | Component tests for `Navbar` (role-based links, logout, mobile menu) | 3 hours |
| 🟡 P1 | Component tests for `Register` (validation, OTP flow) | 4 hours |

**Phase 3 Target:** 7 test files, ~80 test cases

### Phase 4: E2E + Coverage Hardening (Week 4)

| Priority | Task | Est. Effort |
|---|---|---|
| 🔴 P0 | Playwright setup + first E2E: Registration → OTP → Login → Submit Complaint | 8 hours |
| 🟡 P1 | E2E: Ward Member → Dashboard → Update Status → Verify Resolution | 6 hours |
| 🟡 P1 | E2E: Admin → Manage Users → Change Role → Delete User | 4 hours |
| 🟡 P1 | E2E: Citizen → Reopen → Notification Check | 6 hours |
| 🟢 P2 | Reach 80% backend coverage (add missing unit tests) | 4 hours |
| 🟢 P2 | Reach 70% frontend coverage (add missing component tests) | 4 hours |
| 🟢 P2 | Add CI/CD GitHub Actions workflow | 3 hours |
| 🟢 P2 | Set up Husky + lint-staged + pre-commit hooks | 2 hours |

**Phase 4 Target:** 4 E2E specs, full coverage reports, CI passing

### Summary Target

| Metric | Current | Target |
|---|---|---|
| Total test files | 0 | 22+ |
| Total test cases | 0 | 300+ |
| Backend coverage | 0% | >= 80% |
| Frontend coverage | 0% | >= 70% |
| E2E journeys | 0 | 4 |
| CI pipeline | None | Lint → Test → Build |
| Pre-commit hooks | None | ESLint + test changed files |

---

## Appendix: Key Refactoring Needed for Testability

Before tests can be written, the backend needs one critical refactoring:

### Separate `app` from `server.listen()`

**Current (`backend/index.js`):**
```javascript
connectDB().then(() => {
  server = app.listen(PORT, ...);
});
```

**Required for testability:**
```javascript
// backend/app.js — exports the Express app
const app = express();
// ... all middleware and routes ...
module.exports = app;

// backend/index.js — imports app, starts server
const app = require('./app');
const connectDB = require('./config/db');
connectDB().then(() => {
  server = app.listen(PORT, ...);
});
```

This allows integration tests to do:
```javascript
const request = require('supertest');
const app = require('../../app');
const res = await request(app).post('/api/auth/login').send({...});
```
