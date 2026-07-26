# Panchayat — Complaint Management System

## Idea & Solution

---

## 1. The Problem

Rural and semi-urban India lacks an accessible, transparent, and accountable mechanism for citizens to report civic issues to their local governing body (Gram Panchayat). The existing manual process suffers from:

| Problem | Impact |
|---|---|
| **No centralized logging** | Complaints made verbally or via phone calls leave no record |
| **Zero transparency** | Citizens cannot track the status of their reported issue |
| **No accountability** | No system to measure how long issues take to resolve |
| **Unequal access** | Illiterate or less-privileged citizens are often ignored |
| **No verification** | Authorities can mark issues "resolved" without actual work |
| **Lost in bureaucracy** | Complaints passed through multiple officials with no audit trail |
| **No data-driven governance** | Panchayats cannot analyze which issues are most common or which wards are underserved |

---

## 2. The Solution

**Panchayat** is a full-stack digital complaint management platform that brings transparency, accountability, and efficiency to grassroots governance. It connects four user roles in a structured workflow from complaint filing to verified closure.

### Core Philosophy

> **"Report. Track. Verify. Close."**

Every complaint follows a lifecycle — from submission through processing to citizen-verified closure — with automated escalations and full audit logging at every step.

---

## 3. Target Users & Personas

### 3.1 Citizen
- **Who**: Any resident of a village/ward
- **Need**: Report civic issues (roads, water, electricity, garbage, etc.)
- **Power**: Submit complaints, upvote others, add comments, verify/cancel resolution
- **Boundary**: Can only see own complaints + public feed

### 3.2 Ward Member
- **Who**: Elected representative of a ward
- **Need**: Manage complaints within their ward
- **Power**: Update complaint status (approve, reject, mark in-progress, resolve), assign to officials, comment officially
- **Boundary**: Can only see complaints from their assigned ward

### 3.3 Gram Pradhan
- **Who**: Village council head (Sarpanch)
- **Need**: Oversee all wards in the village, view analytics
- **Power**: All ward-member powers + admin dashboard + audit log access
- **Boundary**: Village-wide scope, not cross-village

### 3.4 Admin
- **Who**: System administrator
- **Need**: Full platform control
- **Power**: Manage all users (change roles, delete), view all complaints across villages, full analytics, all audit logs
- **Boundary**: Cannot delete own account

---

## 4. Complete Feature Map

### 4.1 Authentication & Account Management

| Feature | Details |
|---|---|
| Email-based registration | Name, email, phone, password, village, ward, role |
| OTP email verification | 6-digit OTP, 10-min expiry, Resend integration |
| Login with JWT | 7-day token, stored in localStorage |
| Logout (token blacklist) | In-memory blacklist, cleared every 24h |
| Role-based access | 4 roles: citizen, ward_member, gram_pradhan, admin |
| Password hashing | bcrypt (salt rounds: 10) |
| Rate limiting on auth | 20 requests per 15-min window |

### 4.2 Complaint Lifecycle

**9 Statuses in order:**

```
pending → approved → in_progress → resolved
                                              ↕
                                    citizen_verification_pending (15-day window)
                                              ↕
                                    awaiting_citizen_response (day 7-15 reminder)
                                              ↕
                                    closed (verified)  OR  reopened → pending again
```

Plus: `rejected` (can exit at any pre-resolved state)

| Status | Meaning |
|---|---|
| `pending` | Submitted, awaiting initial review |
| `approved` | Acknowledged as valid issue |
| `rejected` | Deemed invalid (requires reason) |
| `in_progress` | Work underway |
| `resolved` | Work completed, waiting for citizen confirmation |
| `citizen_verification_pending` | Auto-set when resolved; citizen must verify |
| `awaiting_citizen_response` | 7 days elapsed, reminder sent |
| `reopened` | Citizen says issue still exists |
| `closed` | Citizen confirmed, or auto-closed after 15 days |

### 4.3 Complaint Features

| Feature | Implementation |
|---|---|
| **Create complaint** | 3-step wizard: details → map + photos → review |
| **Upload images** | Up to 5 images (JPG/PNG/WEBP, 5 MB each), browser-side compression, Cloudinary CDN |
| **Map pin** | Leaflet map with click-to-pin + current-location GPS |
| **Reverse geocoding** | Geoapify API → auto-fill address from lat/lng |
| **Category selection** | 13 categories (roads, water, electricity, garbage, etc.) |
| **Upvoting** | Toggle upvote; upvote count auto-syncs |
| **Comments** | Text comments; official tag for ward/pradhan responses |
| **Complaint feed** | Public listing with filters (category, status, village, search) + pagination |
| **My Complaints** | Personal dashboard with tabs + stats cards |
| **Delete complaint** | Owner or admin only; cleans up Cloudinary images |
| **Timeline view** | Visual status flow on detail page |

### 4.4 Citizen Verification Flow (Unique Feature)

This is the standout feature of the platform — it ensures accountability:

```
   ┌──────────────┐
   │ Ward marks   │
   │ as resolved  │
   └──────┬───────┘
          │
          ▼
   ┌──────────────────────────┐
   │ Status →                  │
   │ citizen_verification_    │
   │ pending                  │
   │ Email notification sent  │
   └──────────────────────────┘
          │
          ▼
   ┌──────────────────────────┐
   │ Citizen sees prompt on   │
   │ complaint detail page    │
   └──────────────────────────┘
          │
          ├──── Confirm ──→ [Status: closed] ✓
          │
          └──── Reject ──→ [Status: reopened]
                           (must provide feedback reason)
```

**Auto-escalation scheduler** (runs every hour):
- **Day 0-6**: Citizen has time to verify
- **Day 7**: Status changes to `awaiting_citizen_response`, reminder notification created
- **Day 15**: Complaint auto-closed, marked as `closedAutomatically: true`, audit log entry created

### 4.5 Ward Management

| Feature | Details |
|---|---|
| Ward dashboard | Table view of all complaints in ward |
| Status filters | Filter by any status |
| Sort options | By date or by upvote count |
| Status update dialog | Modal with status dropdown, assignment field, remarks, rejection reason |
| Quick actions | View detail or update status via dropdown |

### 4.6 Admin Features

| Feature | Details |
|---|---|
| Analytics dashboard | Pie charts (status, user roles), bar charts (category, village) |
| Key metrics | Total complaints, users, resolution rate, avg resolution time |
| User management | Table with search, role filter tabs, inline role change |
| User deletion | Confirmation dialog; cannot delete self |
| Full audit logs | View all platform audit entries |
| Cross-village visibility | See complaints from any village/ward |

### 4.7 Notifications

| Type | Trigger | Recipient |
|---|---|---|
| `citizen_verification` | Complaint marked resolved | Complaint creator |
| `complaint_reopened` | Citizen rejects resolution | All ward_members + gram_pradhan in ward |
| `complaint_closed` | Auto-closure after 15 days | Complaint creator |

Notifications have `read/unread` status with mark-single and mark-all-as-read endpoints.

### 4.8 Audit Trail

Every verification action is logged in the `AuditLog` collection:

| Action | When |
|---|---|
| `complaint_resolved` | Official marks as resolved |
| `citizen_verified` | Citizen confirms closure |
| `citizen_rejected` | Citizen says still exists |
| `complaint_reopened` | Complaint moves back to pending flow |
| `auto_closed` | 15-day timeout with no response |

---

## 5. User Flows (End-to-End)

### 5.1 Registration & Onboarding

```
User opens app → Clicks "Register"
  → Fills: Name, Email, Phone, Password, Confirm Password, Role, Village, Ward
  → Clicks "Create Account"
  → OTP Modal opens
  → 6-digit OTP sent to email (via Resend / console in dev)
  → User enters OTP
  → OTP verified → User auto-registered
  → JWT token stored → Redirect to home (role-based)
```

**Edge cases:**
- Email already registered → rejected
- OTP expired (10 min) → request new one
- OTP max attempts (5) → requires new OTP
- Rate limit (5 OTPs/hour) → wait message
- Exponential backoff lockout on failed attempts

### 5.2 Submitting a Complaint

**Step 1 — Details:**
```
Title (≥10 chars)
Category (13 options)
Description (≥30 chars)
Village
Ward
→ Next
```

**Step 2 — Location & Photos:**
```
Interactive map (Leaflet) → click to pin OR "Use My Current Location"
Auto-reverse geocode address (Geoapify)
Manual address override field
Drag-and-drop / click-to-upload images (auto-compress in browser)
→ Next
```

**Step 3 — Review & Submit:**
```
Summary of all entered data
Image thumbnails
→ Submit
→ FormData with images sent to API
→ Redirect to "My Complaints" page
```

**Edge cases:**
- Invalid image type → rejected per file
- Image too large (5 MB) → rejected per file
- Exceeds max 5 images → rejected
- Image dimensions invalid → rejected
- No location selected → rejected
- Network failure during upload → retry message

### 5.3 Complaint Processing (Official)

```
Official logs in → Ward Dashboard
  → Sees all complaints in their ward
  → Filters by status / sorts by upvotes
  → Opens complaint detail
  → Updates status:
      Pending → Approved | Rejected (requires reason)
      Approved → In Progress (optionally assign to someone)
      In Progress → Resolved (requires resolution remarks)
```

### 5.4 Citizen Verification Flow

```
Citizen logs in → Sees notification or goes to complaint detail
  → Card: "Please verify whether this issue has been resolved"
  → Two options:
      ├── "Confirm Resolution" → Status: closed ✓
      └── "Issue Still Exists" → Shows feedback options:
            ├── Road still damaged
            ├── Water issue not fixed
            ├── Work incomplete
            ├── Wrong resolution
            └── Other (free text)
          → Submits → Status: reopened
          → Notification sent to ward officials
```

### 5.5 Admin Oversight

```
Admin logs in → Admin Dashboard
  → Sees 6 stat cards + 4 charts (status pie, category bar, role pie, village bar)
  → "Manage Users" → Table with search + role filter
  → Can change any user's role
  → Can delete any user (except self)
  → Can view all complaints across villages
  → Can view all audit logs
```

---

## 6. All Possible Use Cases & Scenarios

### 6.1 Complaint Lifecycle Scenarios

| # | Scenario | Expected Outcome |
|---|---|---|
| 1 | Citizen submits complaint with all valid data | Complaint created with status `pending`, files uploaded to Cloudinary |
| 2 | Citizen submits complaint without location | Rejected with "Location is required" |
| 3 | Citizen submits complaint with invalid image type | Specific file rejected, others accepted |
| 4 | Citizen submits complaint with >5 images | All images rejected, complaint not created |
| 5 | Citizen submits complaint with title <10 chars | Validation error |
| 6 | Citizen submits complaint with description <30 chars | Validation error |
| 7 | Unauthenticated user tries to submit complaint | 401 Unauthorized |
| 8 | Ward member approves a pending complaint | Status → `approved` |
| 9 | Ward member rejects a complaint without reason | 400 "Rejection reason is required" |
| 10 | Ward member rejects a complaint with reason | Status → `rejected`, reason saved |
| 11 | Ward member marks complaint as in-progress | Status → `in_progress` |
| 12 | Ward member resolves a complaint | Status → `citizen_verification_pending`, email sent to citizen, audit log created |
| 13 | Ward member resolves without remarks | Acceptable (remarks default to empty) |
| 14 | Official tries to set status to `closed` directly | 400 "Use citizen verification flow" |
| 15 | Official tries to set status to `citizen_verification_pending` directly | 400 "Use citizen verification flow" |
| 16 | Official tries to update status for non-existent complaint | 404 |
| 17 | Official from different ward tries to update | Sees only their ward's complaints (data isolation) |

### 6.2 Citizen Verification Scenarios

| # | Scenario | Expected Outcome |
|---|---|---|
| 18 | Citizen confirms resolution within 7 days | Status → `closed`, verifiedByCitizen = true, audit log |
| 19 | Citizen confirms resolution on day 8-15 | Same outcome (still active) |
| 20 | Citizen rejects resolution with predefined reason | Status → `reopened`, notification to ward |
| 21 | Citizen rejects resolution with custom reason | Status → `reopened`, custom feedback saved |
| 22 | Citizen rejects resolution without reason | 400 "Please select or provide a reason" |
| 23 | Citizen tries to verify someone else's complaint | 403 "Only complaint creator can verify" |
| 24 | Citizen tries to verify a non-verification-pending complaint | 400 "Not pending citizen verification" |
| 25 | Auto-escalation triggers 7-day reminder | Status → `awaiting_citizen_response`, notification created |
| 26 | Auto-escalation triggers 15-day auto-close | Status → `closed`, closedAutomatically = true, audit log |
| 27 | No response after 15+ days | Complaint still shown as `closed` (cannot re-verify) |

### 6.3 Upvote Scenarios

| # | Scenario | Expected Outcome |
|---|---|---|
| 28 | Authenticated user upvotes a complaint | Upvote count increases by 1 |
| 29 | Authenticated user upvotes the same complaint again | Upvote removed (toggle), count decreases by 1 |
| 30 | Unauthenticated user tries to upvote | 401 |
| 31 | User upvotes a non-existent complaint | 404 |

### 6.4 Comment Scenarios

| # | Scenario | Expected Outcome |
|---|---|---|
| 32 | Citizen adds a comment | Comment created, `isOfficial: false` |
| 33 | Ward member adds a comment | Comment created, `isOfficial: true` |
| 34 | Gram Pradhan adds a comment | Comment created, `isOfficial: true` |
| 35 | User adds empty comment | Validation error |
| 36 | Unauthenticated user tries to comment | 401 |
| 37 | User comments on non-existent complaint | 404 |

### 6.5 Authentication Scenarios

| # | Scenario | Expected Outcome |
|---|---|---|
| 38 | User registers with valid data + OTP verification | Account created, JWT returned |
| 39 | User registers without OTP verification | 400 "Email not verified" |
| 40 | User registers with already-registered email | 400 "Email already registered" |
| 41 | User logs in with correct credentials | JWT returned, role-based redirect |
| 42 | User logs in with wrong password | 401 "Invalid credentials" |
| 43 | User logs in with non-existent email | 401 "Invalid credentials" (same message, no info leak) |
| 44 | User accesses protected route without token | 401 |
| 45 | User accesses protected route with expired token | 401 "Token expired" |
| 46 | User accesses protected route with blacklisted token (after logout) | 401 "Token revoked" |
| 47 | User logs out | Token added to blacklist |
| 48 | Ward member/pradhan registers | `isVerified: false` initially; admin may mark verified later |

### 6.6 OTP Scenarios

| # | Scenario | Expected Outcome |
|---|---|---|
| 49 | User requests OTP for valid email | OTP sent via email (or logged in dev mode) |
| 50 | User requests OTP for already-registered email | 400 "Email already registered" |
| 51 | User requests OTP >5 times in 1 hour | 429 "Too many OTP requests. Try again in X minutes." |
| 52 | User enters correct OTP within 10 min | Email verified |
| 53 | User enters expired OTP (>10 min) | 400 "OTP has expired" |
| 54 | User enters wrong OTP (under 5 attempts) | 400 "Invalid OTP. Please try again." |
| 55 | User enters wrong OTP 5 times consecutively | 429 "Too many failed attempts. Try again in X seconds." |
| 56 | User enters wrong OTP with exponentially backed-off lockout | Lockout duration increases with each round |
| 57 | User requests new OTP after lockout expires | Works normally |
| 58 | Send OTP with invalid email format | Validation error |

### 6.7 Admin Scenarios

| # | Scenario | Expected Outcome |
|---|---|---|
| 59 | Admin views all users | Table with all roles, filtering, search |
| 60 | Admin changes user role from citizen to ward_member | User's `isVerified` becomes true |
| 61 | Admin changes user role to gram_pradhan | User's `isVerified` becomes true |
| 62 | Admin deletes a user (not self) | User document removed |
| 63 | Admin tries to delete self | 400 "Cannot delete yourself" |
| 64 | Admin tries to delete non-existent user | 404 |
| 65 | Gram Pradhan views analytics | Sees all charts and metrics |
| 66 | Admin views analytics | Same dashboard |
| 67 | Non-authorized role tries to access admin routes | 403 |
| 68 | Admin views all audit logs | Sorted by timestamp, filterable by complaintId |

### 6.8 Notification Scenarios

| # | Scenario | Expected Outcome |
|---|---|---|
| 69 | Citizen views notifications | List of all notifications for their user |
| 70 | Citizen marks single notification as read | `read` flag set to true |
| 71 | Citizen marks all notifications as read | Bulk update |
| 72 | User tries to mark another user's notification as read | 403 "Not authorized" |
| 73 | Admin can mark any notification as read | Authorized |
| 74 | Notification count shown in badge | `unreadCount` in response |

### 6.9 Image Handling Scenarios

| # | Scenario | Expected Outcome |
|---|---|---|
| 75 | User uploads JPG image | Uploaded to Cloudinary via multer-storage-cloudinary |
| 76 | User uploads PNG image | Accepted |
| 77 | User uploads WEBP image | Accepted |
| 78 | User uploads GIF image | Rejected "Only JPG, PNG and WEBP allowed" |
| 79 | User uploads file >5 MB | Rejected "Image size cannot exceed 5 MB" |
| 80 | Image compression fails during upload | Error logged, status shows error badge |
| 81 | Complaint deleted → images cleaned up | Cloudinary uploader.destroy called for each |

### 6.10 General System Scenarios

| # | Scenario | Expected Outcome |
|---|---|---|
| 82 | User hits non-existent route | 404 with "Route not found" |
| 83 | User sends malformed JSON in request | 400 "Invalid JSON in request body" |
| 84 | User exceeds global rate limit (100 req/15min) | 429 |
| 85 | User exceeds auth rate limit (20 req/15min) | 429 |
| 86 | Database connection fails | Server exits with error |
| 87 | Missing MONGO_URI or JWT_SECRET env | Server exits with explicit error message |
| 88 | Server receives SIGTERM/SIGINT | Graceful shutdown (close DB, stop scheduler, close HTTP) |
| 89 | Uncaught exception occurs | Graceful shutdown triggered |
| 90 | Unhandled promise rejection | Logged to console |
| 91 | Citizen role tries to access Ward Dashboard | 403 "Access denied" |
| 92 | Citizen role tries to access Admin Dashboard | 403 |
| 93 | Ward Member role tries to access Admin Manage Users | 403 |
| 94 | Gram Pradhan role tries to access Admin Manage Users | 403 (admin-only) |
| 95 | Non-logged-in user visits public complaint feed | Can view complaints without filters |
| 96 | User on mobile device | Responsive design (mobile cards + desktop table) |
| 97 | User in dark mode | Theme support via CSS variables + localStorage |
| 98 | Lazy-loaded route loads | Suspense fallback (spinner) shown |

---

## 7. Non-Functional Aspects

### 7.1 Security

| Measure | Implementation |
|---|---|
| Password hashing | bcrypt (salt rounds: 10) |
| JWT authentication | 7-day expiry, in-memory blacklist on logout |
| Input sanitization | NoSQL injection prevention middleware |
| Helmet headers | Security HTTP headers (CORS policy: cross-origin) |
| Rate limiting | API-wide (100/15min), auth-specific (20/15min) |
| OTP hashing | bcrypt-hashed before DB storage |
| OTP validation | 5-attempt max per OTP, exponential backoff lockout |
| Error info hiding | Same "Invalid credentials" for wrong email or password |
| Role authorization | `authorizeRoles()` middleware on protected routes |
| Self-deletion guard | Admin cannot delete own account |

### 7.2 Data Integrity

| Measure | Implementation |
|---|---|
| Mongoose schema validation | Required fields, enums, minlength |
| Express-validator | Route-level validation before controller |
| Upvote count sync | Auto-calculated via `pre('save')` hook on `upvotes.length` |
| Timestamp management | `updatedAt` auto-updated on complaint save |
| Audit trail | All status-changing actions logged immutably |
| TTL index on OTP | Auto-expire after 600 seconds (10 min) |

### 7.3 Performance

| Aspect | Implementation |
|---|---|
| Database indexes | 8 complaint indexes, 3 user indexes, 3 comment indexes, etc. |
| Pagination | Server-side with page/limit params, capped at 100 |
| Batch processing | Auto-escalation processes 100 complaints per batch |
| Image compression | Client-side before upload (browser-image-compression) |
| CDN for images | Cloudinary for image hosting and delivery |
| Lazy loading | React.lazy() + Suspense for all route pages |
| Persistent auth | Zustand persist with localStorage (no re-login on refresh) |

### 7.4 Scalability Concerns (⚠️ Known Gaps)

| Gap | Impact | Recommendation |
|---|---|---|
| In-memory OTP rate limiting | Lost on server restart; not shared across instances | Move to Redis |
| In-memory token blacklist | Lost on restart; not shared across instances | Move to Redis |
| Auto-escalation (single process) | Runs only on one server instance | Use cron job or distributed scheduler |
| No database connection pooling tuning | Pool size default (not specified in Mongoose 9) | Add explicit pool size |
| No caching layer | Repeated queries for analytics | Implement in-memory or Redis cache |

---

## 8. System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        CLIENT (React + Vite)                        │
│                                                                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌───────────────────┐  │
│  │    Auth   │  │ Complaints│  │  Admin   │  │  Shared Components│  │
│  │  Pages    │  │  Pages    │  │  Pages   │  │  (Navbar, UI, etc)│  │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────────┬──────────┘  │
│       │              │              │                  │            │
│  ┌────▼──────────────▼──────────────▼──────────────────▼────────┐  │
│  │              Zustand Store (authStore) + Axios API Client     │  │
│  │          Interceptor: Bearer Token → 401 Auto-logout         │  │
│  └──────────────────────────┬───────────────────────────────────┘  │
│                             │                                      │
└─────────────────────────────┼──────────────────────────────────────┘
                              │  HTTP/HTTPS
                              │  /api/*
┌─────────────────────────────┼──────────────────────────────────────┐
│                    SERVER (Express + Mongoose)                      │
│                             │                                      │
│  ┌──────────────────────────▼───────────────────────────────────┐  │
│  │  Middleware Stack: Helmet → CORS → JSON → Sanitize → Logger  │  │
│  │                   → Rate Limiter → Routes                    │  │
│  └──────────────────────────┬───────────────────────────────────┘  │
│                             │                                      │
│  ┌──────┬───────┬──────────┼──────────┬──────────┬───────────┐   │
│  │ Auth │Complaint│ Admin  │  Notif.  │  Users   │  Health   │   │
│  │Routes│ Routes  │ Routes │  Routes  │  (stub)  │  Route    │   │
│  └──┬───┴───┬───┴───┬─────┴────┬─────┴────┬─────┴─────┬─────┘   │
│     │       │       │          │          │           │         │
│  ┌──▼───┬───▼───┬───▼───┬──────▼────┐     │           │         │
│  │OTP   │Auth   │Admin  │Complaint  │     │           │         │
│  │Ctrl  │Ctrl   │Ctrl   │Ctrl       │     │           │         │
│  └──┬───┴───┬───┴───┬───┴─────┬────┘     │           │         │
│     │       │       │         │          │           │         │
│  ┌──▼───────▼───────▼─────────▼──────────▼───────────▼──────┐ │
│  │                     MongoDB (Mongoose 9)                  │ │
│  │  Users  │ Complaints │ Comments │ Notifications │ OTPs   │ │
│  │         │            │ AuditLog │                │        │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │  External Services                                       │  │
│  │  • Cloudinary (image CDN)                                │  │
│  │  • Resend (transactional email)                          │  │
│  │  • Geoapify (reverse geocoding)                          │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │  Background Job: Auto-Escalation Scheduler (hourly)      │  │
│  └─────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 9. Data Model Relationships

```
User (1) ──── creates ────> Complaint (many)
User (1) ──── upvotes ───> Complaint (many)  [many-to-many via array]
User (1) ──── comments ──> Comment (many)
User (1) ──── receives ──> Notification (many)

Complaint (1) ── has ────> Comment (many)
Complaint (1) ── has ────> AuditLog (many)
Complaint (1) ── has ────> Notification (many)
Complaint (1) ── has ────> User.assignedTo (1)

User  ──(ward)──> Ward (logical grouping, not a Collection)
Village ──(string)──> Complaint (logical grouping)
```

---

## 10. API Surface Overview (21 Endpoints)

| Method | Path | Auth | Roles |
|---|---|---|---|
| POST | /api/auth/send-otp | No | — |
| POST | /api/auth/verify-otp | No | — |
| POST | /api/auth/register | No | — |
| POST | /api/auth/login | No | — |
| POST | /api/auth/logout | Yes | Any |
| GET | /api/auth/me | Yes | Any |
| GET | /api/complaints | No | — |
| GET | /api/complaints/:id | No | — |
| POST | /api/complaints | Yes | citizen, ward_member, gram_pradhan |
| POST | /api/complaints/:id/upvote | Yes | Any |
| POST | /api/complaints/:id/comment | Yes | Any |
| PATCH | /api/complaints/:id/status | Yes | ward_member, gram_pradhan, admin |
| POST | /api/complaints/:id/verify | Yes | citizen (owner) |
| POST | /api/complaints/:id/reopen | Yes | citizen (owner) |
| GET | /api/complaints/:id/audit | Yes | Any |
| GET | /api/complaints/verification/pending | Yes | citizen |
| GET | /api/complaints/audit/all | Yes | admin, gram_pradhan |
| GET | /api/complaints/my/list | Yes | citizen |
| GET | /api/complaints/ward/list | Yes | ward_member, gram_pradhan, admin |
| GET | /api/complaints/admin/all | Yes | gram_pradhan, admin |
| DELETE | /api/complaints/:id | Yes | owner or admin |
| GET | /api/admin/users | Yes | admin |
| PATCH | /api/admin/users/:id/role | Yes | admin |
| DELETE | /api/admin/users/:id | Yes | admin |
| GET | /api/admin/analytics | Yes | admin, gram_pradhan |
| GET | /api/users | No | — (stub) |
| GET | /api/notifications | Yes | Any |
| PATCH | /api/notifications/:id/read | Yes | owner or admin |
| PATCH | /api/notifications/read-all | Yes | Any |
| GET | /api/health | No | — |

---

## 11. Role Permissions Matrix

| Capability | Citizen | Ward Member | Gram Pradhan | Admin |
|---|---|---|---|---|
| View public feed | ✓ | ✓ | ✓ | ✓ |
| Register | ✓ | ✓ | ✓ | ✓ |
| Submit complaint | ✓ | ✓ | ✓ | ✗ |
| View own complaints | ✓ | ✓ | ✓ | ✗ |
| Upvote | ✓ | ✓ | ✓ | ✓ |
| Comment | ✓ | ✓ (official) | ✓ (official) | ✓ |
| Verify resolution | ✓ (own only) | ✗ | ✗ | ✗ |
| Reopen | ✓ (own only) | ✗ | ✗ | ✗ |
| Delete own complaint | ✓ | ✓ | ✓ | ✓ |
| Update complaint status | ✗ | ✓ (ward) | ✓ (ward) | ✓ (any) |
| View ward complaints | ✗ | ✓ (own ward) | ✓ (own ward) | ✓ (all) |
| View all complaints | ✗ | ✗ | ✓ (village) | ✓ (all) |
| View analytics | ✗ | ✗ | ✓ | ✓ |
| Manage users | ✗ | ✗ | ✗ | ✓ |
| View audit logs | ✗ | ✗ | ✓ | ✓ |
| Delete any user | ✗ | ✗ | ✗ | ✓ |

---

## 12. Known Limitations & Roadmap Items

### ⚠️ Technical Gaps

| Gap | Severity | Notes |
|---|---|---|
| No test suite | High | Zero unit, integration, or E2E tests |
| `.env` with live secrets committed | High | MongoDB Atlas + Cloudinary credentials exposed |
| No `.env.example` | Medium | New devs don't know required vars |
| In-memory OTP state | Medium | Lost on restart, not cluster-safe |
| In-memory token blacklist | Medium | Lost on restart, not cluster-safe |
| No TypeScript | Medium | Both frontend and backend are JS |
| `backend/index.js` untestable | Medium | App + server combined in one file |
| No Docker/CI/CD | Medium | No containerization or deployment pipeline |
| No database migration tool | Low | Schema changes require manual sync |
| No pagination on MyComplaints | Low | Returns all complaints for a user at once |
| Search done client-side | Low | Filtered after fetch, not via DB query |
| No socket-based real-time | Low | Notifications require page refresh |
| No SMS fallback for OTP | Low | Email-only OTP delivery |

### 🚧 Missing Features (Potential Enhancements)

| Feature | Rationale |
|---|---|
| Ward/village CRUD admin | Wards and villages are free-text strings, not managed entities |
| Complaint priority auto-assignment | Priority is set via update endpoint but no auto-prioritization |
| Email notification preferences | Notification type is hardcoded |
| Report/export (PDF/CSV) | No way to export analytics or complaint data |
| Multi-language support | Rural India needs Hindi/regional language support |
| Offline-first support | Rural areas have intermittent connectivity |
| SMS notifications | For citizens without email |
| File attachment on comments | Currently text-only comments |
| Complaint merge/dedup | Same issue reported by multiple citizens |
| OAuth/Social login | Currently email-password only |
| Audit log retention policy | Audit logs grow indefinitely |
| Rate limit by user ID | Currently rate limits are IP-based |

---

## 13. Technology Stack

| Layer | Technology | Version |
|---|---|---|
| Frontend Framework | React | 19.x |
| Build Tool | Vite | 8.x |
| Styling | Tailwind CSS + shadcn/ui | Latest |
| Routing | React Router | 7.x |
| State Management | Zustand | 5.x |
| Animation | Framer Motion | 11.x |
| Charts | Recharts | 2.x |
| Maps | Leaflet / react-leaflet | 4.x |
| Form Validation | React Hook Form + Zod | Latest |
| Image Compression | browser-image-compression | Latest |
| Backend Framework | Express | 5.x |
| Database ODM | Mongoose | 9.x |
| Authentication | JWT (jsonwebtoken) + bcryptjs | Latest |
| Image Storage | Cloudinary (multer-storage-cloudinary) | Latest |
| Email Service | Resend | Latest |
| Reverse Geocoding | Geoapify | REST API |
| Security | Helmet, express-rate-limit | Latest |

---

## 14. Conclusion

Panchayat is a purpose-built complaint management system that addresses the transparency gap in rural governance. Its key differentiators are:

1. **Citizen verification flow** — ensures accountability by requiring citizens to confirm resolution
2. **Full audit trail** — every action is logged immutably
3. **Role-based workflow** — each actor has clearly scoped powers
4. **Auto-escalation** — prevents complaints from being forgotten
5. **Map integration** — geographic context for every complaint

The platform is production-ready in terms of core functionality but needs testing infrastructure, deployment configuration, and hardening (secrets management, persistent state) before enterprise deployment.
