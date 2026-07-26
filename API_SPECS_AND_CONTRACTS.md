# API Specifications & Contracts

> Last updated: 2026-06-27

---

## 1. Overview

### Base URL(s)

| Environment | URL |
|---|---|
| Development | `http://localhost:5000/api` |
| Production | Configured via `CLIENT_URL` env + `VITE_API_URL` |

Database: MongoDB at `mongodb+srv://<user>:<pass>@<cluster>.mongodb.net/panchayat`

### Versioning

No explicit version prefix in the URL path (no `/v1/`). The API is currently at an implicit v1.

### Global Auth Scheme

- **Bearer JWT** for all protected routes.
- JWT contains `{ id, role }` and expires in **7 days**.
- Token is blacklisted on logout (in-memory `Set`, cleared every 24 hours).
- Frontend stores token in localStorage under key `panchayat-auth`.

### Rate Limiting

| Scope | Window | Max Requests | Applied |
|---|---|---|---|
| `/api/*` | 15 min | 100 | Global API limiter |
| `/api/auth/*` | 15 min | 20 | Stricter auth limiter |

Response on limit exceeded:
```json
{ "success": false, "message": "Too many requests, please try again later." }
```

### Global Middleware (applied to all routes)

| Middleware | Purpose |
|---|---|
| `helmet({ crossOriginResourcePolicy: 'cross-origin' })` | Security headers |
| `cors({ origin: CLIENT_URL, credentials: true })` | CORS |
| `express.json({ limit: '10mb' })` | JSON body parser |
| `express.urlencoded({ extended: true, limit: '10mb' })` | URL-encoded parser |
| `sanitizeInput` | Strips MongoDB operators (`$ne`, `$gt`, `$regex`, ...) from `req.body`, `req.query`, `req.params` |
| Dev logger (`console.log` method + path) | Non-production only |

### Error Response Envelope

All errors follow this shape:

```json
{
  "success": false,
  "message": "<human-readable message>",
  "errors": ["<field-level error>", ...],
  "stack": "<stack trace, development only>"
}
```

---

## 2. Authentication & Authorization

### Auth Flow (Text Diagram)

```
┌──────────┐        ┌───────────────┐        ┌─────────┐
│  Client  │ ── 1.  POST /send-otp ──▶  │   Server    │ ──▶  Resend API
│          │ ◀── 2.  { simulated:true }  ────│           │
│          │ ── 3.  POST /verify-otp ──▶  │           │
│          │ ◀── 4.  { verified:true }  ────│           │
│          │ ── 5.  POST /register ────▶  │           │ ◀── bcrypt hash pw
│          │ ◀── 6.  { token, user }  ──────│           │ ──▶ JWT sign
│          │ ── 7.  POST /login ──────▶  │           │
│          │ ◀── 8.  { token, user }  ──────│           │
│          │ ── 9.  GET /me (Bearer) ──▶  │           │
│          │ ◀── 10. { user }  ─────────────│           │
│          │ ── 11. POST /logout (Bearer)─▶│           │
└──────────┘        └───────────────┘
```

### Token Lifecycle

| Step | Detail |
|---|---|
| **Issuance** | `POST /login` or `POST /register` returns `{ token }` |
| **Payload** | `{ id: ObjectId, role: string, iat, exp }` |
| **Expiry** | 7 days from issuance |
| **Revocation** | In-memory blacklist on `POST /logout`; blacklist cleared every 24h |
| **Validation** | `jwt.verify(token, JWT_SECRET)` on every protected route |

### Role Definitions

| Role | Level | Description |
|---|---|---|
| `citizen` | 0 | Default. Can create complaints, upvote, comment, verify resolution |
| `ward_member` | 1 | Ward-level official. Can view ward complaints, update status |
| `gram_pradhan` | 2 | Village head. Same as ward_member + admin-level complaint views, analytics |
| `admin` | 3 | Super admin. Full user management, role assignment, all data access |

### Protected Route Guard

`protect` middleware:
- Rejects with **401** if `Authorization: Bearer <token>` missing
- Rejects with **401** if token is blacklisted
- Rejects with **401** if token is expired/invalid
- Rejects with **401** if decoded user not found in DB
- Attaches `req.user` (full User doc, excluding password)

`authorizeRoles(...roles)` middleware:
- Rejects with **403** if `req.user.role` not in the allowed list

---

## 3. Endpoints

---

### GET /api/health

| Field | Detail |
|---|---|
| **Description** | Health check endpoint. No auth required. |
| **Auth** | Public |
| **Roles** | — |

**Response 200:**

```json
{
  "success": true,
  "status": "ok",
  "timestamp": "2026-06-27T12:00:00.000Z",
  "uptime": 12345.67
}
```

---

### POST /api/auth/send-otp

| Field | Detail |
|---|---|
| **Description** | Sends a 6-digit OTP to the provided email via Resend. OTP hashed with bcrypt before storage. |
| **Auth** | Public |
| **Roles** | — |

**Request Body:**

```json
{
  "email": "user@example.com"
}
```

| Field | Type | Required | Validation |
|---|---|---|---|
| `email` | string | yes | Valid email, normalized via `normalizeEmail()` |

**Response 200:**

```json
{
  "success": true,
  "message": "OTP sent to your email.",
  "simulated": false
}
```

> `simulated: true` when `RESEND_API_KEY` env is missing — OTP is logged to console instead.

**Error Responses:**

| Status | Message | Cause |
|---|---|---|
| 400 | `Validation failed` | Missing/invalid email |
| 400 | `Email already registered.` | User with this email exists |
| 429 | `Too many OTP requests. Try again in X minutes.` | Rate limit: >5 requests/hour per email |
| 429 | `Account temporarily locked due to too many failed attempts...` | Lockout: >5 failed OTP verifications |
| 500 | `Failed to send OTP email. Please try again.` | Resend API call failed |

---

### POST /api/auth/verify-otp

| Field | Detail |
|---|---|
| **Description** | Verifies a 6-digit OTP against the stored bcrypt hash. Marks record as verified. |
| **Auth** | Public |
| **Roles** | — |

**Request Body:**

```json
{
  "email": "user@example.com",
  "otp": "483921"
}
```

| Field | Type | Required | Validation |
|---|---|---|---|
| `email` | string | yes | Valid email, normalized |
| `otp` | string | yes | Exactly 6 digits, numeric |

**Response 200:**

```json
{
  "success": true,
  "message": "Email verified successfully."
}
```

**Error Responses:**

| Status | Message | Cause |
|---|---|---|
| 400 | `Validation failed` | Missing/invalid email or OTP |
| 400 | `No OTP found. Request a new one.` | No unverified OTP record for email |
| 400 | `OTP has expired. Request a new one.` | OTP older than 10 minutes |
| 400 | `Too many failed attempts. Request a new OTP.` | `attempts >= 5` on the OTP record |
| 400 | `Invalid OTP. Please try again.` | bcrypt hash comparison failed |
| 429 | `Too many failed attempts. Try again in X second(s).` | Lockout threshold crossed |

---

### POST /api/auth/register

| Field | Detail |
|---|---|
| **Description** | Creates a new user account. Requires prior OTP verification for the same email. |
| **Auth** | Public |
| **Roles** | — |

**Request Body:**

```json
{
  "name": "Ramesh Kumar",
  "email": "ramesh@example.com",
  "phone": "+919876543210",
  "password": "secret123",
  "role": "citizen",
  "village": "Nagla",
  "ward": "Ward-3"
}
```

| Field | Type | Required | Default | Validation |
|---|---|---|---|---|
| `name` | string | yes | — | non-empty, trimmed |
| `email` | string | yes | — | valid email, normalized |
| `phone` | string | yes | — | non-empty, trimmed |
| `password` | string | yes | — | min 6 characters |
| `role` | string | no | `citizen` | one of: `citizen`, `ward_member`, `gram_pradhan` |
| `village` | string | no | — | — |
| `ward` | string | no | — | — |

> Note: If `role` is `ward_member` or `gram_pradhan`, `isVerified` is set to `false` on the user record (must be verified by admin).

**Response 201:**

```json
{
  "success": true,
  "_id": "664a1b2c3d4e5f6a7b8c9d0e",
  "name": "Ramesh Kumar",
  "email": "ramesh@example.com",
  "phone": "+919876543210",
  "role": "citizen",
  "village": "Nagla",
  "ward": "Ward-3",
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Error Responses:**

| Status | Message | Cause |
|---|---|---|
| 400 | `Validation failed` | Any validation rule fails |
| 400 | `Email already registered` | Duplicate email |
| 400 | `Email not verified. Please complete OTP verification first.` | No verified OTP record for email |

---

### POST /api/auth/login

| Field | Detail |
|---|---|
| **Description** | Authenticates user with email + password. Returns JWT token. |
| **Auth** | Public |
| **Roles** | — |

**Request Body:**

```json
{
  "email": "ramesh@example.com",
  "password": "secret123"
}
```

| Field | Type | Required | Validation |
|---|---|---|---|
| `email` | string | yes | Valid email, normalized |
| `password` | string | yes | non-empty |

**Response 200:**

```json
{
  "success": true,
  "_id": "664a1b2c3d4e5f6a7b8c9d0e",
  "name": "Ramesh Kumar",
  "email": "ramesh@example.com",
  "phone": "+919876543210",
  "role": "citizen",
  "village": "Nagla",
  "ward": "Ward-3",
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Error Responses:**

| Status | Message | Cause |
|---|---|---|
| 400 | `Validation failed` | Missing/invalid email or password |
| 401 | `Invalid credentials` | Email not found or password mismatch |

---

### POST /api/auth/logout

| Field | Detail |
|---|---|
| **Description** | Invalidates the current JWT token by adding it to the in-memory blacklist. |
| **Auth** | Bearer JWT |
| **Roles** | Any authenticated user |

**Request Body:** None

**Response 200:**

```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

**Error Responses:**

| Status | Message | Cause |
|---|---|---|
| 401 | `Not authorized, no token` | Missing Bearer header |
| 401 | `Token revoked, please login again` | Already blacklisted token |

---

### GET /api/auth/me

| Field | Detail |
|---|---|
| **Description** | Returns the currently authenticated user's profile. |
| **Auth** | Bearer JWT |
| **Roles** | Any authenticated user |

**Response 200:**

```json
{
  "success": true,
  "_id": "664a1b2c3d4e5f6a7b8c9d0e",
  "name": "Ramesh Kumar",
  "email": "ramesh@example.com",
  "phone": "+919876543210",
  "role": "citizen",
  "village": "Nagla",
  "ward": "Ward-3",
  "profileImage": ""
}
```

**Error Responses:** Standard 401 (see Auth errors).

---

### GET /api/complaints

| Field | Detail |
|---|---|
| **Description** | List complaints with optional filtering. Paginated. Public read access. |
| **Auth** | Public |
| **Roles** | — |

**Query Parameters:**

| Parameter | Type | Required | Default | Description |
|---|---|---|---|---|
| `village` | string | no | — | Filter by village name |
| `ward` | string | no | — | Filter by ward name |
| `status` | string | no | — | Filter by status value |
| `category` | string | no | — | Filter by category value |
| `page` | integer | no | 1 | Page number |
| `limit` | integer | no | 10 | Items per page (max 100) |

**Response 200:**

```json
{
  "success": true,
  "complaints": [
    {
      "_id": "664a1b2c3d4e5f6a7b8c9d0e",
      "title": "Broken street light",
      "description": "Street light near main chowk not working",
      "category": "street_lights",
      "images": ["https://res.cloudinary.com/.../image.jpg"],
      "location": { "address": "Main Chowk", "lat": 27.1751, "lng": 78.0421, "plusCode": "7JQV+Q8" },
      "ward": "Ward-3",
      "village": "Nagla",
      "status": "pending",
      "priority": "medium",
      "createdBy": { "_id": "...", "name": "Ramesh Kumar", "email": "ramesh@example.com" },
      "resolvedBy": null,
      "upvotes": [],
      "upvoteCount": 0,
      "rejectionReason": "",
      "resolutionRemarks": "",
      "resolutionImages": [],
      "verifiedByCitizen": false,
      "citizenFeedback": "",
      "closedAutomatically": false,
      "createdAt": "2026-06-27T10:00:00.000Z",
      "updatedAt": "2026-06-27T10:00:00.000Z"
    }
  ],
  "totalCount": 42,
  "page": 1,
  "pages": 5
}
```

---

### GET /api/complaints/my/list

| Field | Detail |
|---|---|
| **Description** | List all complaints created by the authenticated user. |
| **Auth** | Bearer JWT |
| **Roles** | Any authenticated user |

**Response 200:**

```json
{
  "success": true,
  "complaints": [ /* Array of Complaint objects */ ]
}
```

---

### GET /api/complaints/ward/list

| Field | Detail |
|---|---|
| **Description** | List all complaints within the authenticated official's ward. Sorted by priority descending, then by newest. |
| **Auth** | Bearer JWT |
| **Roles** | `ward_member`, `gram_pradhan`, `admin` |

**Query Parameters:**

| Parameter | Type | Required | Default | Description |
|---|---|---|---|---|
| `status` | string | no | — | Filter by status |
| `page` | integer | no | 1 | Page number |
| `limit` | integer | no | 10 | Items per page (max 100) |

**Response 200:** Same shape as `GET /api/complaints`.

---

### GET /api/complaints/admin/all

| Field | Detail |
|---|---|
| **Description** | List all complaints across all wards/villages. Admin/gram-pradhan view. Sorted by upvote count then newest. |
| **Auth** | Bearer JWT |
| **Roles** | `gram_pradhan`, `admin` |

**Query Parameters:**

| Parameter | Type | Required | Default | Description |
|---|---|---|---|---|
| `status` | string | no | — | Filter by status |
| `category` | string | no | — | Filter by category |
| `village` | string | no | — | Filter by village |
| `ward` | string | no | — | Filter by ward |
| `page` | integer | no | 1 | Page number |
| `limit` | integer | no | 10 | Items per page (max 100) |

**Response 200:** Same shape as `GET /api/complaints` but also populates `assignedTo`.

---

### GET /api/complaints/verification/pending

| Field | Detail |
|---|---|
| **Description** | Get all complaints owned by the current user that are pending citizen verification (status is `citizen_verification_pending` or `awaiting_citizen_response`). |
| **Auth** | Bearer JWT |
| **Roles** | Any authenticated user |
| **⚠️ Undocumented** in route file (present but no frontend service maps it) |

**Response 200:**

```json
{
  "success": true,
  "complaints": [ /* Array of Complaint objects populated with resolvedBy */ ]
}
```

---

### GET /api/complaints/audit/all

| Field | Detail |
|---|---|
| **Description** | Retrieve all audit logs across the system. |
| **Auth** | Bearer JWT |
| **Roles** | `admin`, `gram_pradhan` |

**Query Parameters:**

| Parameter | Type | Required | Default | Description |
|---|---|---|---|---|
| `complaintId` | string (ObjectId) | no | — | Filter logs for a specific complaint |

**Response 200:**

```json
{
  "success": true,
  "auditLogs": [
    {
      "_id": "...",
      "complaintId": { "_id": "...", "title": "Broken street light" },
      "userId": { "_id": "...", "name": "Ramesh Kumar", "role": "citizen" },
      "role": "citizen",
      "action": "citizen_verified",
      "metadata": { "complaintId": "...", "verifiedAt": "..." },
      "timestamp": "2026-06-27T12:00:00.000Z"
    }
  ]
}
```

---

### GET /api/complaints/:id

| Field | Detail |
|---|---|
| **Description** | Get a single complaint by ID with its comments. |
| **Auth** | Public |
| **Roles** | — |

**Path Parameters:**

| Parameter | Type | Required | Description |
|---|---|---|---|
| `id` | string (ObjectId) | yes | Complaint MongoDB ID |

**Response 200:**

```json
{
  "success": true,
  "complaint": { /* Full Complaint object with createdBy, resolvedBy, assignedTo populated */ },
  "comments": [
    {
      "_id": "...",
      "complaintId": "...",
      "userId": { "_id": "...", "name": "Official Name", "role": "ward_member" },
      "message": "We are looking into this issue.",
      "isOfficial": true,
      "createdAt": "2026-06-27T11:00:00.000Z"
    }
  ]
}
```

**Error Responses:**

| Status | Message | Cause |
|---|---|---|
| 404 | `Complaint not found` | Invalid ID or not in database |

---

### POST /api/complaints

| Field | Detail |
|---|---|
| **Description** | Create a new complaint. Supports multipart file upload for up to 5 images (Cloudinary). Images must be JPG/PNG/WEBP, max 5 MB each. |
| **Auth** | Bearer JWT |
| **Roles** | Any authenticated user |

**Middleware Chain:** `protect` → `handleUpload` (multer → Cloudinary) → `createComplaintValidation` (express-validator) → controller

**Request Body** (`multipart/form-data`):

| Field | Type | Required | Validation |
|---|---|---|---|
| `title` | string | yes | non-empty, trimmed |
| `description` | string | yes | non-empty, trimmed |
| `category` | string | yes | One of the 13 categories (see constants) |
| `ward` | string | yes | non-empty, trimmed |
| `village` | string | yes | non-empty, trimmed |
| `location` | string (JSON) | yes | Parsed with `JSON.parse()` into `{ address, lat, lng, plusCode }` |
| `images` | file[] | no | Up to 5 files, JPG/PNG/WEBP, max 5 MB each |

```json
// location field (as a JSON string in the form-data):
{ "address": "Main Chowk", "lat": 27.1751, "lng": 78.0421, "plusCode": "7JQV+Q8" }
```

**Response 201:**

```json
{
  "success": true,
  "complaint": { /* Full Complaint object */ }
}
```

**Error Responses:**

| Status | Message | Cause |
|---|---|---|
| 400 | `Validation failed` | Any field validation fails |
| 400 | `Location is required` | Missing `location` field |
| 400 | `"filename": Only JPG, PNG and WEBP images are allowed.` | Unsupported image format |
| 400 | `"filename": Image size cannot exceed 5 MB.` | File too large |
| 400 | `Maximum 5 images allowed.` | More than 5 files uploaded |
| 400 | `Invalid location data` | Location JSON parse failure |

---

### POST /api/complaints/:id/upvote

| Field | Detail |
|---|---|
| **Description** | Toggle upvote on a complaint. If already upvoted by the user, the vote is removed. |
| **Auth** | Bearer JWT |
| **Roles** | Any authenticated user |

**Path Parameters:**

| Parameter | Type | Required |
|---|---|---|
| `id` | string (ObjectId) | yes |

**Response 200 (upvote added):**

```json
{
  "success": true,
  "message": "Upvote added",
  "upvoteCount": 5
}
```

**Response 200 (upvote removed):**

```json
{
  "success": true,
  "message": "Upvote removed",
  "upvoteCount": 4
}
```

**Error Responses:**

| Status | Message | Cause |
|---|---|---|
| 404 | `Complaint not found` | Invalid ID |

---

### POST /api/complaints/:id/comment

| Field | Detail |
|---|---|
| **Description** | Add a comment to a complaint. If user role is `ward_member` or `gram_pradhan`, the comment is marked as official. |
| **Auth** | Bearer JWT |
| **Roles** | Any authenticated user |

**Path Parameters:**

| Parameter | Type | Required |
|---|---|---|
| `id` | string (ObjectId) | yes |

**Request Body:**

```json
{
  "message": "We have inspected the site and work will start next week."
}
```

| Field | Type | Required | Validation |
|---|---|---|---|
| `message` | string | yes | non-empty, trimmed |

**Response 201:**

```json
{
  "success": true,
  "comment": {
    "_id": "...",
    "complaintId": "...",
    "userId": { "_id": "...", "name": "Official Name", "role": "ward_member" },
    "message": "We have inspected the site and work will start next week.",
    "isOfficial": true,
    "createdAt": "2026-06-27T11:00:00.000Z"
  }
}
```

**Error Responses:**

| Status | Message | Cause |
|---|---|---|
| 400 | `Validation failed` | Missing message |

---

### PATCH /api/complaints/:id/status

| Field | Detail |
|---|---|
| **Description** | Update complaint status. Has special flow for `resolved` transition. |
| **Auth** | Bearer JWT |
| **Roles** | `ward_member`, `gram_pradhan`, `admin` |

**Path Parameters:**

| Parameter | Type | Required |
|---|---|---|
| `id` | string (ObjectId) | yes |

**Request Body:**

```json
{
  "status": "approved",
  "rejectionReason": "",
  "assignedTo": "664a1b2c3d4e5f6a7b8c9d0e",
  "resolutionRemarks": "",
  "resolutionImages": []
}
```

| Field | Type | Required | Validation |
|---|---|---|---|
| `status` | string | yes | One of: `pending`, `approved`, `rejected`, `in_progress`, `resolved` |
| `rejectionReason` | string | if status=`rejected` | non-empty |
| `assignedTo` | string (ObjectId) | no | User ID to assign |
| `resolutionRemarks` | string | no | Remarks on resolution |
| `resolutionImages` | string[] | no | Array of image URLs |

> Note: `closed` and `citizen_verification_pending` cannot be set directly. Setting `resolved` transitions the complaint to `citizen_verification_pending` internally and triggers a notification + verification email to the citizen.

**Response 200:**

```json
{
  "success": true,
  "complaint": { /* Full Complaint object with all populations */ }
}
```

**Error Responses:**

| Status | Message | Cause |
|---|---|---|
| 400 | `Validation failed` | Invalid status value |
| 400 | `Invalid status value` | Status not in valid list |
| 400 | `Rejection reason is required` | `rejected` with no reason |
| 400 | `Status cannot be set directly...` | Trying to set `closed` or `citizen_verification_pending` |
| 404 | `Complaint not found` | Invalid ID |

---

### POST /api/complaints/:id/verify

| Field | Detail |
|---|---|
| **Description** | Citizen confirms that the issue has been resolved. Transitions complaint from `citizen_verification_pending` → `closed`. |
| **Auth** | Bearer JWT |
| **Roles** | Must be the complaint creator |

**Path Parameters:**

| Parameter | Type | Required |
|---|---|---|
| `id` | string (ObjectId) | yes |

**Request Body:** None

**Response 200:**

```json
{
  "success": true,
  "message": "Complaint closed successfully",
  "complaint": { /* Full Complaint object, status: "closed", verifiedByCitizen: true */ }
}
```

**Error Responses:**

| Status | Message | Cause |
|---|---|---|
| 400 | `Complaint is not pending citizen verification` | Wrong current status |
| 403 | `Only the complaint creator can verify resolution` | Non-owner tries to verify |
| 404 | `Complaint not found` | Invalid ID |

---

### POST /api/complaints/:id/reopen

| Field | Detail |
|---|---|
| **Description** | Citizen rejects the resolution claim. Transitions complaint from `citizen_verification_pending` → `reopened`, notifies ward members/gram pradhan. |
| **Auth** | Bearer JWT |
| **Roles** | Must be the complaint creator |

**Path Parameters:**

| Parameter | Type | Required |
|---|---|---|
| `id` | string (ObjectId) | yes |

**Request Body:**

```json
{
  "citizenFeedback": "Road still damaged"
}
```

| Field | Type | Required |
|---|---|---|
| `citizenFeedback` | string | no |

**Response 200:**

```json
{
  "success": true,
  "message": "Complaint reopened for further action",
  "complaint": { /* Full Complaint object, status: "reopened" */ }
}
```

**Error Responses:**

| Status | Message | Cause |
|---|---|---|
| 400 | `Complaint is not pending citizen verification` | Wrong current status |
| 403 | `Only the complaint creator can reject resolution` | Non-owner tries to reopen |
| 404 | `Complaint not found` | Invalid ID |

---

### GET /api/complaints/:id/audit

| Field | Detail |
|---|---|
| **Description** | Get the audit trail for a specific complaint. |
| **Auth** | Bearer JWT |
| **Roles** | Any authenticated user |

**Path Parameters:**

| Parameter | Type | Required |
|---|---|---|
| `id` | string (ObjectId) | yes |

**Response 200:**

```json
{
  "success": true,
  "auditLogs": [
    {
      "_id": "...",
      "complaintId": "...",
      "userId": { "_id": "...", "name": "Official", "role": "ward_member" },
      "role": "ward_member",
      "action": "complaint_resolved",
      "metadata": { "resolutionRemarks": "...", "previousStatus": "in_progress" },
      "timestamp": "2026-06-27T12:00:00.000Z"
    }
  ]
}
```

---

### DELETE /api/complaints/:id

| Field | Detail |
|---|---|
| **Description** | Delete a complaint and its associated comments + Cloudinary images. Only owner or admin. |
| **Auth** | Bearer JWT |
| **Roles** | Complaint owner or `admin` |

**Path Parameters:**

| Parameter | Type | Required |
|---|---|---|
| `id` | string (ObjectId) | yes |

**Response 200:**

```json
{
  "success": true,
  "message": "Complaint deleted"
}
```

**Error Responses:**

| Status | Message | Cause |
|---|---|---|
| 403 | `Not authorized to delete this complaint` | Not owner and not admin |
| 404 | `Complaint not found` | Invalid ID |

---

### GET /api/notifications

| Field | Detail |
|---|---|
| **Description** | Get all notifications for the authenticated user, sorted newest-first. |
| **Auth** | Bearer JWT |
| **Roles** | Any authenticated user |

**Response 200:**

```json
{
  "success": true,
  "notifications": [
    {
      "_id": "...",
      "userId": "...",
      "complaintId": { "_id": "...", "title": "Broken street light", "status": "pending" },
      "type": "citizen_verification",
      "message": "Your complaint has been marked as resolved by the Panchayat...",
      "read": false,
      "createdAt": "2026-06-27T12:00:00.000Z"
    }
  ],
  "unreadCount": 3
}
```

---

### PATCH /api/notifications/:id/read

| Field | Detail |
|---|---|
| **Description** | Mark a single notification as read. |
| **Auth** | Bearer JWT |
| **Roles** | Notification owner or `admin` |

**Path Parameters:**

| Parameter | Type | Required |
|---|---|---|
| `id` | string (ObjectId) | yes |

**Response 200:**

```json
{
  "success": true,
  "message": "Notification marked as read"
}
```

**Error Responses:**

| Status | Message | Cause |
|---|---|---|
| 403 | `Not authorized` | Not the owner and not admin |
| 404 | `Notification not found` | Invalid ID |

---

### PATCH /api/notifications/read-all

| Field | Detail |
|---|---|
| **Description** | Mark all unread notifications for the authenticated user as read. |
| **Auth** | Bearer JWT |
| **Roles** | Any authenticated user |

**Response 200:**

```json
{
  "success": true,
  "message": "All notifications marked as read"
}
```

---

### GET /api/admin/users

| Field | Detail |
|---|---|
| **Description** | List all users. Password field excluded from response. |
| **Auth** | Bearer JWT |
| **Roles** | `admin` |

**Query Parameters:**

| Parameter | Type | Required | Description |
|---|---|---|---|
| `role` | string | no | Filter by role name |

**Response 200:**

```json
{
  "success": true,
  "users": [
    {
      "_id": "...",
      "name": "Ramesh Kumar",
      "email": "ramesh@example.com",
      "phone": "+919876543210",
      "role": "citizen",
      "village": "Nagla",
      "ward": "Ward-3",
      "isVerified": false,
      "emailVerified": true,
      "profileImage": "",
      "createdAt": "2026-06-27T10:00:00.000Z"
    }
  ]
}
```

---

### PATCH /api/admin/users/:id/role

| Field | Detail |
|---|---|
| **Description** | Update a user's role. If set to `ward_member` or `gram_pradhan`, user is automatically marked as verified. |
| **Auth** | Bearer JWT |
| **Roles** | `admin` |

**Path Parameters:**

| Parameter | Type | Required |
|---|---|---|
| `id` | string (ObjectId) | yes |

**Request Body:**

```json
{
  "role": "ward_member"
}
```

| Field | Type | Required | Validation |
|---|---|---|---|
| `role` | string | yes | One of: `citizen`, `ward_member`, `gram_pradhan`, `admin` |

**Response 200:**

```json
{
  "success": true,
  "user": { /* Full user object without password */ }
}
```

**Error Responses:**

| Status | Message | Cause |
|---|---|---|
| 400 | `Validation failed` | Invalid role value |
| 404 | `User not found` | Invalid user ID |

---

### DELETE /api/admin/users/:id

| Field | Detail |
|---|---|
| **Description** | Delete a user. Admin cannot delete themselves. |
| **Auth** | Bearer JWT |
| **Roles** | `admin` |

**Path Parameters:**

| Parameter | Type | Required |
|---|---|---|
| `id` | string (ObjectId) | yes |

**Response 200:**

```json
{
  "success": true,
  "message": "User deleted"
}
```

**Error Responses:**

| Status | Message | Cause |
|---|---|---|
| 400 | `Cannot delete yourself` | Admin targets own ID |
| 404 | `User not found` | Invalid user ID |

---

### GET /api/admin/analytics

| Field | Detail |
|---|---|
| **Description** | Returns aggregated analytics data about complaints and users. |
| **Auth** | Bearer JWT |
| **Roles** | `admin`, `gram_pradhan` |

**Response 200:**

```json
{
  "success": true,
  "totalComplaints": 250,
  "byStatus": [
    { "_id": "pending", "count": 80 },
    { "_id": "resolved", "count": 60 },
    { "_id": "closed", "count": 45 },
    { "_id": "in_progress", "count": 30 },
    { "_id": "approved", "count": 20 },
    { "_id": "rejected", "count": 10 },
    { "_id": "citizen_verification_pending", "count": 5 }
  ],
  "byCategory": [
    { "_id": "roads", "count": 100 },
    { "_id": "street_lights", "count": 50 }
  ],
  "byVillage": [
    { "_id": "Nagla", "count": 150 },
    { "_id": "Saidpur", "count": 100 }
  ],
  "avgResolutionHours": 72.5,
  "usersByRole": [
    { "_id": "citizen", "count": 200 },
    { "_id": "ward_member", "count": 10 },
    { "_id": "gram_pradhan", "count": 5 },
    { "_id": "admin", "count": 2 }
  ]
}
```

---

### GET /api/users (⚠️ Stub)

| Field | Detail |
|---|---|
| **Description** | Placeholder route. Returns a static message. No controller or DB interaction. |
| **Auth** | None |
| **⚠️** | This route is a stub and has no real implementation |

**Response 200:**

```json
{
  "message": "Users route"
}
```

---

## 4. Data Models

### User

**Collection:** `users`

| Field | Type | Required | Default | Validation | Index |
|---|---|---|---|---|---|
| `name` | String | yes | — | trim | — |
| `email` | String | yes | — | lowercase, unique | `{ email: 1 }` |
| `phone` | String | yes | — | — | `{ phone: 1 }` |
| `password` | String | yes | — | minlength 6, bcrypt hashed pre-save | — |
| `role` | String | no | `citizen` | enum: `citizen`, `ward_member`, `gram_pradhan`, `admin` | `{ role: 1, ward: 1 }` (compound) |
| `village` | String | no | `''` | — | — |
| `ward` | String | no | `''` | — | (part of compound index) |
| `isVerified` | Boolean | no | `false` | — | — |
| `emailVerified` | Boolean | no | `false` | — | — |
| `profileImage` | String | no | `''` | — | — |
| `createdAt` | Date | no | `Date.now` | — | — |

**Relationships:**
- Referenced by `Complaint.createdBy`, `Complaint.resolvedBy`, `Complaint.assignedTo`
- Referenced by `Comment.userId`, `Notification.userId`, `AuditLog.userId`

**Pre-save Hook:** Hashes `password` with bcrypt (salt rounds: 10) if modified.

**Instance Method:** `matchPassword(enteredPassword)` — compares with bcrypt.

**Example Document:**

```json
{
  "_id": "664a1b2c3d4e5f6a7b8c9d0e",
  "name": "Ramesh Kumar",
  "email": "ramesh@example.com",
  "phone": "+919876543210",
  "password": "$2a$10$...",
  "role": "citizen",
  "village": "Nagla",
  "ward": "Ward-3",
  "isVerified": false,
  "emailVerified": true,
  "profileImage": "",
  "createdAt": "2026-06-27T10:00:00.000Z"
}
```

---

### Complaint

**Collection:** `complaints`

| Field | Type | Required | Default | Validation | Index |
|---|---|---|---|---|---|
| `title` | String | yes | — | trim | — |
| `description` | String | yes | — | — | — |
| `category` | String | yes | — | enum (see below) | `{ category: 1 }` |
| `images` | [String] | no | `[]` | Cloudinary URLs | — |
| `location.address` | String | no | — | — | — |
| `location.lat` | Number | no | — | — | — |
| `location.lng` | Number | no | — | — | — |
| `location.plusCode` | String | no | — | — | — |
| `ward` | String | yes | — | — | `{ ward: 1, status: 1, createdAt: -1 }` |
| `village` | String | yes | — | — | `{ village: 1, status: 1 }` |
| `status` | String | no | `pending` | enum (9 values, see below) | `{ status: 1, createdAt: -1 }` |
| `priority` | String | no | `medium` | enum: `low`, `medium`, `high`, `urgent` | — |
| `createdBy` | ObjectId (ref User) | yes | — | — | `{ createdBy: 1, createdAt: -1 }` |
| `assignedTo` | ObjectId (ref User) | no | `null` | — | — |
| `upvotes` | [ObjectId (ref User)] | no | `[]` | — | — |
| `upvoteCount` | Number | no | 0 | auto-set from `upvotes.length` | — |
| `rejectionReason` | String | no | `''` | — | — |
| `resolvedBy` | ObjectId (ref User) | no | `null` | — | — |
| `resolvedAt` | Date | no | — | — | `{ resolvedAt: 1 }` |
| `resolutionRemarks` | String | no | `''` | — | — |
| `resolutionImages` | [String] | no | `[]` | — | — |
| `verifiedByCitizen` | Boolean | no | `false` | — | — |
| `verifiedAt` | Date | no | — | — | — |
| `citizenFeedback` | String | no | `''` | — | — |
| `closedAutomatically` | Boolean | no | `false` | — | — |
| `createdAt` | Date | no | `Date.now` | — | — |
| `updatedAt` | Date | no | `Date.now` | auto-set on save | — |

**Category Enum:**

```
roads, bridges, buildings, water_supply, electricity, street_lights,
garbage, sewage, drainage, dangerous_structures, open_manholes,
scheme_delays, other
```

**Status Enum:**

```
pending, approved, rejected, in_progress, resolved,
citizen_verification_pending, reopened, awaiting_citizen_response, closed
```

**Pre-save Hook:** Sets `updatedAt = Date.now()` and `upvoteCount = upvotes.length`.

**Example Document:**

```json
{
  "_id": "664a1b2c3d4e5f6a7b8c9d0e",
  "title": "Broken street light near main chowk",
  "description": "The street light near the main chowk has been broken for a week.",
  "category": "street_lights",
  "images": ["https://res.cloudinary.com/demo/panchayat/complaints/image.jpg"],
  "location": {
    "address": "Main Chowk, Nagla",
    "lat": 27.1751,
    "lng": 78.0421,
    "plusCode": "7JQV+Q8"
  },
  "ward": "Ward-3",
  "village": "Nagla",
  "status": "pending",
  "priority": "medium",
  "createdBy": "664a1b2c3d4e5f6a7b8c9d0e",
  "assignedTo": null,
  "upvotes": [],
  "upvoteCount": 0,
  "rejectionReason": "",
  "resolvedBy": null,
  "resolvedAt": null,
  "resolutionRemarks": "",
  "resolutionImages": [],
  "verifiedByCitizen": false,
  "verifiedAt": null,
  "citizenFeedback": "",
  "closedAutomatically": false,
  "createdAt": "2026-06-27T10:00:00.000Z",
  "updatedAt": "2026-06-27T10:00:00.000Z"
}
```

---

### Comment

**Collection:** `comments`

| Field | Type | Required | Default | Validation | Index |
|---|---|---|---|---|---|
| `complaintId` | ObjectId (ref Complaint) | yes | — | — | `{ complaintId: 1, createdAt: -1 }` |
| `userId` | ObjectId (ref User) | yes | — | — | `{ userId: 1 }` |
| `message` | String | yes | — | trim | — |
| `isOfficial` | Boolean | no | `false` | — | — |
| `createdAt` | Date | no | `Date.now` | — | — |

**Example Document:**

```json
{
  "_id": "664b1c2d3e4f5a6b7c8d9e0f",
  "complaintId": "664a1b2c3d4e5f6a7b8c9d0e",
  "userId": "664a1b2c3d4e5f6a7b8c9d0e",
  "message": "We have inspected the site and work will start next week.",
  "isOfficial": true,
  "createdAt": "2026-06-27T11:00:00.000Z"
}
```

---

### Notification

**Collection:** `notifications`

| Field | Type | Required | Default | Validation | Index |
|---|---|---|---|---|---|
| `userId` | ObjectId (ref User) | yes | — | — | `{ userId: 1, read: 1, createdAt: -1 }` |
| `complaintId` | ObjectId (ref Complaint) | yes | — | — | `{ complaintId: 1 }` |
| `type` | String | yes | — | enum: `citizen_verification`, `complaint_reopened`, `complaint_closed` | — |
| `message` | String | yes | — | — | — |
| `read` | Boolean | no | `false` | — | — |
| `createdAt` | Date | no | `Date.now` | — | — |

**Notification Types & Triggering Events:**

| Type | Triggered When |
|---|---|
| `citizen_verification` | Complaint marked as resolved (status → `citizen_verification_pending`), or auto-escalation reminder after 7 days |
| `complaint_reopened` | Citizen rejects resolution (status → `reopened`) |
| `complaint_closed` | Auto-closed after 15 days without citizen response |

**Example Document:**

```json
{
  "_id": "664c1d2e3f4a5b6c7d8e9f0a",
  "userId": "664a1b2c3d4e5f6a7b8c9d0e",
  "complaintId": "664a1b2c3d4e5f6a7b8c9d0e",
  "type": "citizen_verification",
  "message": "Your complaint has been marked as resolved by the Panchayat. Please verify whether the issue has actually been resolved.",
  "read": false,
  "createdAt": "2026-06-27T12:00:00.000Z"
}
```

---

### AuditLog

**Collection:** `auditlogs`

| Field | Type | Required | Default | Validation | Index |
|---|---|---|---|---|---|
| `complaintId` | ObjectId (ref Complaint) | yes | — | — | `{ complaintId: 1, timestamp: -1 }` |
| `userId` | ObjectId (ref User) | yes | — | — | `{ userId: 1 }` |
| `role` | String | yes | — | — | — |
| `action` | String | yes | — | enum: `complaint_resolved`, `citizen_verified`, `citizen_rejected`, `complaint_reopened`, `auto_closed` | — |
| `metadata` | Mixed | no | `{}` | — | — |
| `timestamp` | Date | no | `Date.now` | — | `{ timestamp: -1 }` |

**Action Descriptions:**

| Action | Meaning |
|---|---|
| `complaint_resolved` | Official marked complaint as resolved |
| `citizen_verified` | Citizen confirmed resolution → complaint closed |
| `citizen_rejected` | Citizen rejected resolution → complaint reopened |
| `complaint_reopened` | (Logged alongside `citizen_rejected`) |
| `auto_closed` | System auto-closed after 15-day no-response window |

**Example Document:**

```json
{
  "_id": "664d1e2f3a4b5c6d7e8f9a0b",
  "complaintId": "664a1b2c3d4e5f6a7b8c9d0e",
  "userId": "664a1b2c3d4e5f6a7b8c9d0e",
  "role": "ward_member",
  "action": "complaint_resolved",
  "metadata": {
    "resolutionRemarks": "Replaced the bulb",
    "previousStatus": "in_progress"
  },
  "timestamp": "2026-06-27T12:00:00.000Z"
}
```

---

### OtpVerification

**Collection:** `otpverifications`

| Field | Type | Required | Default | Validation | Index |
|---|---|---|---|---|---|
| `email` | String | yes | — | lowercase | `{ email: 1 }` |
| `otpHash` | String | yes | — | bcrypt hash of OTP | — |
| `otpExpiry` | Date | yes | — | — | — |
| `verified` | Boolean | no | `false` | — | — |
| `attempts` | Number | no | 0 | — | — |
| `createdAt` | Date | no | `Date.now` | — | TTL index: `{ createdAt: 1 }` expireAfterSeconds: 600 |

**TTL:** Documents automatically deleted 10 minutes after `createdAt`.

**Example Document:**

```json
{
  "_id": "664e1f2a3b4c5d6e7f8a9b0c",
  "email": "ramesh@example.com",
  "otpHash": "$2a$10$...",
  "otpExpiry": "2026-06-27T10:10:00.000Z",
  "verified": false,
  "attempts": 0,
  "createdAt": "2026-06-27T10:00:00.000Z"
}
```

---

## 5. Validation Schemas

All request validation is done via **express-validator** (in-route `body()` checks). There are no Zod/Joi/Yup schemas in the project.

### Auth Routes

**registerValidation** (POST /api/auth/register):

| Field | Rules |
|---|---|
| `name` | `.trim().notEmpty()` |
| `email` | `.isEmail().normalizeEmail()` |
| `phone` | `.trim().notEmpty()` |
| `password` | `.isLength({ min: 6 })` |
| `role` | `.optional().isIn(['citizen', 'ward_member', 'gram_pradhan'])` |

**loginValidation** (POST /api/auth/login):

| Field | Rules |
|---|---|
| `email` | `.isEmail().normalizeEmail()` |
| `password` | `.notEmpty()` |

**otpValidation** (POST /api/auth/send-otp):

| Field | Rules |
|---|---|
| `email` | `.isEmail().normalizeEmail()` |

**verifyOtpValidation** (POST /api/auth/verify-otp):

| Field | Rules |
|---|---|
| `email` | `.isEmail().normalizeEmail()` |
| `otp` | `.trim().isLength({ min: 6, max: 6 }).isNumeric()` |

### Complaint Routes

**createComplaintValidation** (POST /api/complaints):

| Field | Rules |
|---|---|
| `title` | `.trim().notEmpty()` |
| `description` | `.trim().notEmpty()` |
| `category` | `.isIn([...13 categories...])` |
| `ward` | `.trim().notEmpty()` |
| `village` | `.trim().notEmpty()` |
| `location` | `.notEmpty()` (validated manually via `JSON.parse` in controller) |

**addCommentValidation** (POST /api/complaints/:id/comment):

| Field | Rules |
|---|---|
| `message` | `.trim().notEmpty()` |

**updateStatusValidation** (PATCH /api/complaints/:id/status):

| Field | Rules |
|---|---|
| `status` | `.isIn(['pending', 'approved', 'rejected', 'in_progress', 'resolved'])` |

### Admin Routes

**updateRoleValidation** (PATCH /api/admin/users/:id/role):

| Field | Rules |
|---|---|
| `role` | `.isIn(['citizen', 'ward_member', 'gram_pradhan', 'admin'])` |

---

## 6. Third-Party Contracts

### Resend (Email Service)

**Used for:** Sending OTP emails and complaint verification emails.

**Configuration:**
- API Key: `process.env.RESEND_API_KEY`
- From Email: `process.env.RESEND_FROM_EMAIL` (default: `onboarding@resend.dev`)
- When `RESEND_API_KEY` is missing, the service runs in **simulated mode** — OTPs and email content are logged to the console.

**sendOtpEmail(email, otp):**

```javascript
// Resend API call
await resend.emails.send({
  from: FROM_EMAIL,
  to: email,
  subject: 'Your OTP for Panchayat Account Registration',
  html: OTP_EMAIL_TEMPLATE(otp, 10),
});
```

**sendVerificationEmail(email, citizenName, complaintTitle, complaintId, village):**

```javascript
await resend.emails.send({
  from: FROM_EMAIL,
  to: email,
  subject: 'Your complaint has been marked as resolved - Please verify',
  html: VERIFICATION_EMAIL_TEMPLATE(citizenName, complaintTitle, complaintId, village),
});
```

### Cloudinary (Image Storage)

**Used for:** Uploading complaint images.

**Configuration:**
- Cloud Name: `process.env.CLOUDINARY_CLOUD_NAME`
- API Key: `process.env.CLOUDINARY_API_KEY`
- API Secret: `process.env.CLOUDINARY_API_SECRET`
- Folder: `panchayat/complaints`
- Allowed formats: `jpg`, `jpeg`, `png`, `webp`

**Upload Constraints:**

| Constraint | Value |
|---|---|
| Max images per complaint | 5 (`MAX_IMAGES`) |
| Max file size per image | 5 MB (`MAX_FILE_SIZE = 5 * 1024 * 1024`) |
| Allowed MIME types | `image/jpeg`, `image/png`, `image/webp` |

**Multer Middleware (`upload.array('images', MAX_IMAGES)`):**
- Uses `CloudinaryStorage` for direct-to-cloud upload.
- Error handling for: `LIMIT_FILE_SIZE` (→ 400), `LIMIT_UNEXPECTED_FILE` (→ 400).

**Cleanup:** On complaint delete, images are removed from Cloudinary via `cloudinary.uploader.destroy(publicId)`.

### No OAuth Providers

The project does not integrate any OAuth providers (Google, Facebook, etc.). All authentication is email/password based.

### No Payment Providers

No payment gateways (Razorpay, Stripe, etc.) are integrated.

### No Twilio / SMS

No SMS provider integration. OTP delivery is email-only via Resend.

---

## 7. Error Code Reference

### Standard Error Response Envelope

```json
{
  "success": false,
  "message": "<human readable message>",
  "errors": ["<field-level error strings (optional)>"],
  "stack": "<stack trace, development only>"
}
```

### HTTP Status → Error Mapping

| Status | Meaning | Source |
|---|---|---|
| **400** | Validation failed / Bad request | express-validator errors, Mongoose ValidationError, CastError, duplicate key (11000), invalid JSON body, missing required fields |
| **401** | Unauthorized | Missing/invalid/expired/blacklisted JWT token, invalid credentials |
| **403** | Forbidden | `authorizeRoles()` failure — user role not in allowed list, non-owner trying to verify/reopen/delete |
| **404** | Not found | Route not found, complaint/user/notification not found by ID |
| **429** | Too many requests | Rate limiter (global: 100/15min, auth: 20/15min, OTP send: 5/hour, OTP lockout), OTP attempt limit exceeded |
| **500** | Internal server error | Unhandled exceptions, email service failure, uncaught errors passed to `errorHandler` |

### Global Error Handler (errorMiddleware.js)

The centralized `errorHandler` catches all errors forwarded via `next(err)` and maps them:

| Error Type | Condition | Status | Message |
|---|---|---|---|
| `ValidationError` | Mongoose validation | 400 | `"Validation failed"` + `errors: [messages]` |
| `CastError` | Invalid ObjectId format | 400 | `"Invalid <path>: <value>"` |
| Duplicate key (11000) | Unique index violation | 400 | `"Duplicate value for <field>. This <field> is already registered."` |
| `JsonWebTokenError` | Invalid JWT | 401 | `"Invalid token"` |
| `TokenExpiredError` | Expired JWT | 401 | `"Token expired"` |
| `entity.parse.failed` | Malformed JSON body | 400 | `"Invalid JSON in request body"` |
| `statusCode 429` | Rate limit | 429 | `"Too many requests, please try again later."` |
| All others | — | 500 | `"Internal Server Error"` or `err.message` |

### Auth Middleware Specific Errors

| Scenario | Status | Message |
|---|---|---|
| No Authorization header | 401 | `"Not authorized, no token"` |
| Token is blacklisted | 401 | `"Token revoked, please login again"` |
| Decoded user not found | 401 | `"User not found. Please login again."` |
| Token expired | 401 | `"Token expired, please login again"` |
| Invalid token (signature wrong, etc.) | 401 | `"Not authorized, invalid token"` |
| Role not authorized | 403 | `"Access denied: insufficient role"` |

---

## 8. Changelog

| Version | Date | Changes |
|---|---|---|
| 1.0.0 | 2026-06-27 | Initial API specification generated from source code |

---
