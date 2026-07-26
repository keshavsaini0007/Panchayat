# Documentation

> Last updated: 2026-06-27

---

## 1. Project Summary

**Panchayat** is a digital complaint management system for rural local governance (Panchayati Raj institutions). It bridges the gap between citizens and their elected ward/gram-pradhan representatives by providing a transparent, trackable platform for reporting and resolving civic issues.

### Who It's For

| Persona | Need |
|---|---|
| **Citizen** | Report infrastructure problems (broken roads, faulty street lights, water supply issues) and track resolution |
| **Ward Member** | View complaints from their ward, assign work, update status |
| **Gram Pradhan** | Village-level oversight — view analytics, access all complaints, manage ward members |
| **Admin** | System-wide super admin — manage users, assign roles, full data access |

### Key Value Propositions

- **Transparency**: Every status change is logged in an audit trail. Citizens can see the full timeline.
- **Accountability**: After resolution, the citizen must verify the fix before the complaint is closed. If the issue persists, they can reopen it.
- **Citizen Verification Flow**: Resolved complaints enter a 15-day verification window. The citizen confirms closure or reopens; auto-closure after 15 days.
- **Exponential Backoff OTP**: Anti-brute-force protection with escalating lockout durations for failed OTP attempts.

### Deployment

| Environment | URL |
|---|---|
| Development | `http://localhost:5173` (frontend) / `http://localhost:5000/api` (backend) |
| Live | Not detected — no deployment config found |

### Status

| Badge | Value |
|---|---|
| Version | `1.0.0` (backend) / `0.0.0` (frontend) |
| License | ISC |
| Node | >= 18 |
| Database | MongoDB |

---

## 2. Features

### For Citizens

| Feature | Description |
|---|---|
| **Browse Complaints** | View all complaints with filters (category, status, village, search by title) |
| **Submit Complaint** | 3-step wizard: basic info → pin location on map + upload photos → review & submit |
| **Upvote** | Toggle upvote on complaints to signal community support |
| **Comment** | Add comments to any complaint |
| **My Complaints** | Personal dashboard showing complaint status summary (pending, in-progress, resolved, closed) with tab filtering |
| **Verify Resolution** | When an official marks a complaint as resolved, the citizen receives a notification + email to confirm or reopen |
| **OTP Registration** | Email-based OTP verification before account creation, with 6-digit input UI and paste support |

### For Ward Members

| Feature | Description |
|---|---|
| **Ward Dashboard** | Table view of all complaints in the assigned ward with stats cards |
| **Update Status** | Change complaint status (pending → approved → rejected → in_progress → resolved) with rejection reason or resolution remarks |
| **Assign Complaints** | Assign complaints to specific users by User ID |
| **Sort & Filter** | Filter by status, sort by date or upvote count |

### For Gram Pradhan

| Feature | Description |
|---|---|
| **All Ward & Admin Features** | Inherits ward member capabilities |
| **Admin Dashboard** | Analytics: total complaints, users, resolution rate, average resolution time, status/category/village breakdowns with Recharts visualizations |
| **Full Audit Log Access** | Can view all audit logs across the system |

### For Admin

| Feature | Description |
|---|---|
| **All Above Features** | Full system access |
| **Manage Users** | Table of all users with search, role filter tabs, inline role change, and delete (with confirmation dialog) |
| **Role Assignment** | Change any user's role between citizen, ward_member, gram_pradhan, admin |
| **System Analytics** | Same dashboard as gram pradhan |
| **Delete Complaints** | Can delete any complaint (owner can also delete their own) |

### System-Wide

| Feature | Description |
|---|---|
| **Audit Trail** | Every action (resolve, verify, reject, reopen, auto-close) is logged with timestamp and user details |
| **Notifications** | Real-time bell icon dropdown with unread count, mark-all-read, click-to-navigate to complaint |
| **Email Notifications** | OTP emails via Resend, verification request emails when complaint is resolved |
| **Auto-Escalation** | Hourly background job: reminders at 7 days, auto-close at 15 days without citizen response |
| **OTP Security** | Bcrypt-hashed OTPs, rate limit (5/hour), exponential backoff lockout (30s → 60s → ... → 24h) |
| **Image Upload** | Upload up to 5 images per complaint via Cloudinary with client-side compression |
| **Map Integration** | Leaflet map for location pinning with reverse geocoding via Geoapify |
| **Dark/Light Mode** | Theme toggle with localStorage persistence |

### 🚧 In Progress / Partially Implemented

| Feature | Status |
|---|---|
| `GET /api/users` | Stub — returns static message, no controller |
| `GET /api/complaints/verification/pending` | Route exists but not exposed in frontend navigation |
| Profile image upload | Field exists in User model but no UI for uploading |
| Geoapify geocoding | Service is implemented but frontend has no env config documented for it |

---

## 3. Architecture Overview

### System Architecture Diagram

```
┌──────────────────────────────────────────────────────────────────────┐
│                        CLIENT BROWSER                                │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                    React SPA (Vite)                          │   │
│  │  ┌─────────┐ ┌──────────┐ ┌───────────┐ ┌───────────────┐  │   │
│  │  │  Auth   │ │ Complaints│ │  Admin    │ │  Shared       │  │   │
│  │  │  Pages  │ │  Pages    │ │  Pages    │ │  Components   │  │   │
│  │  │ (Login, │ │ (Home,    │ │ (Dashboard,│ │ (Navbar,      │  │   │
│  │  │ Register)│ │ Detail,   │ │ Users)    │ │  NotifBell,   │  │   │
│  │  │         │ │ Submit,   │ │           │ │  ErrorBound)  │  │   │
│  │  │         │ │ MyCompl.) │ │           │ │               │  │   │
│  │  └────┬────┘ └─────┬─────┘ └─────┬─────┘ └───────┬───────┘  │   │
│  │       └────────────┴─────────────┴───────────────┘          │   │
│  │                        │                                        │
│  │              ┌─────────┴──────────┐                            │
│  │              │   Zustand Store    │                            │
│  │              │  (authStore)       │                            │
│  │              │  user + token      │                            │
│  │              └─────────┬──────────┘                            │
│  │                        │                                        │
│  │              ┌─────────┴──────────┐                            │
│  │              │   Axios Client     │                            │
│  │              │  (api.js)          │                            │
│  │              │  + Bearer token   │                            │
│  │              └─────────┬──────────┘                            │
│  └────────────────────────┼──────────────────────────────────────┘
│                           │
│                    Vite Proxy (dev)
│                    /api → localhost:5000
│                           │
└───────────────────────────┼──────────────────────────────────────────┘
                            │ HTTPS / JSON
                            ▼
┌────────────────────────────────────────────────────────────────────────┐
│                         EXPRESS SERVER                                 │
│  ┌──────────┐  ┌─────────────┐  ┌─────────────┐  ┌────────────────┐  │
│  │  Global  │  │    Auth     │  │  Complaint  │  │   Admin        │  │
│  │  MW      │  │  Routes     │  │  Routes     │  │   Routes       │  │
│  │ helment  │  │ /send-otp   │  │ GET /       │  │ GET /users     │  │
│  │ cors     │  │ /verify-otp │  │ GET /:id     │  │ PATCH /:id/role│  │
│  │ sanitize │  │ /register   │  │ POST /      │  │ DELETE /:id    │  │
│  │ ratelimit │  │ /login      │  │ POST /:id/   │  │ GET /analytics │  │
│  │          │  │ /logout     │  │   upvote     │  │                │  │
│  │          │  │ /me         │  │ POST /:id/   │  └────────────────┘  │
│  │          │  └──────┬──────┘  │   comment    │                      │
│  │          │         │         │ PATCH /:id/  │                      │
│  │          │         │         │   status     │                      │
│  │          │         │         │ POST /:id/   │  ┌────────────────┐  │
│  │          │         │         │   verify     │  │ Notifications  │  │
│  │          │         │         │ POST /:id/   │  │ Routes         │  │
│  │          │         │         │   reopen     │  │ GET /          │  │
│  │          │         │         │ DELETE /:id  │  │ PATCH /:id/read│  │
│  │          │         │         └──────┬───────┘  │ PATCH /read-all│  │
│  │          │         │                │          └────────┬───────┘  │
│  └──────────┘  └──────┴────────────────┴───────────────────┘          │
│                           │                                           │
│                    ┌──────┴──────────┐                                │
│                    │   Controllers   │                                │
│                    │   + Middleware  │                                │
│                    └──────┬──────────┘                                │
│                           │                                           │
└───────────────────────────┼───────────────────────────────────────────┘
                            │
          ┌─────────────────┼─────────────────────┐
          ▼                 ▼                     ▼
┌───────────────┐  ┌───────────────┐  ┌───────────────────┐
│   MongoDB     │  │  Cloudinary   │  │     Resend API    │
│   (Atlas)     │  │  Image Store  │  │   (Email Service) │
│               │  │               │  │                   │
│ Collections:  │  │ Folder:       │  │ Templates:        │
│ - users       │  │ panchayat/    │  │ - OTP Email       │
│ - complaints  │  │   complaints  │  │ - Verification    │
│ - comments    │  │               │  │   Email           │
│ - notifications│  │ Max 5 files  │  │                   │
│ - auditlogs   │  │ 5 MB each     │  │ Simulated mode    │
│ - otpverific.  │  │ JPG/PNG/WEBP │  │ if no API key     │
└───────────────┘  └───────────────┘  └───────────────────┘
```

### Folder Structure

```
panchayat/
├── backend/
│   ├── index.js                 # Express app entry — middleware chain, route mounting, server start
│   ├── package.json             # Dependencies & scripts
│   ├── .env                     # ⚠️ Live secrets checked in (security issue)
│   ├── config/
│   │   ├── db.js                # MongoDB connection with Mongoose (pool size 10, timeout 5s)
│   │   └── cloudinary.js        # Multer + Cloudinary storage config (max 5 images, 5 MB)
│   ├── controllers/             # Request handlers (business logic)
│   │   ├── authController.js    # Register, login, getMe
│   │   ├── otpController.js     # Send OTP, verify OTP (with rate limiting + lockout)
│   │   ├── complaintController.js # CRUD + upvote, comment, status, verify, reopen, audit
│   │   ├── adminController.js   # User management, analytics aggregation
│   │   └── notificationController.js # List, mark read, mark all read
│   ├── routes/                  # Express routers with express-validator chains
│   │   ├── auth.js              # 6 endpoints (send-otp, verify-otp, register, login, logout, me)
│   │   ├── complaints.js        # 16 endpoints (list, create, upvote, comment, status, etc.)
│   │   ├── admin.js             # 4 endpoints (users, role, delete, analytics)
│   │   ├── notifications.js     # 3 endpoints (list, mark read, mark all read)
│   │   └── users.js             # 1 stub endpoint
│   ├── middlewares/
│   │   ├── authMiddleware.js    # JWT protect + role authorization + token blacklist
│   │   ├── errorMiddleware.js   # Centralized error handler (8 error types mapped)
│   │   └── sanitize.js          # NoSQL injection prevention (strips $ operators)
│   ├── models/
│   │   ├── User.js              # name, email, phone, password, role, village, ward, etc.
│   │   ├── Complaint.js         # title, description, category, images, location, status, etc.
│   │   ├── Comment.js           # complaintId, userId, message, isOfficial
│   │   ├── Notification.js      # userId, complaintId, type, message, read
│   │   ├── AuditLog.js          # complaintId, userId, role, action, metadata
│   │   └── OtpVerification.js   # email, otpHash, otpExpiry, attempts (TTL: 10 min)
│   └── utils/
│       ├── generateToken.js     # JWT sign with {id, role}, expires 7d
│       ├── otpUtils.js          # OTP gen, bcrypt hash, rate limit, exponential backoff lockout
│       ├── emailService.js      # Resend integration with HTML templates
│       └── autoEscalation.js    # Background job: reminder at 7d, auto-close at 15d
│
├── frontend/
│   ├── package.json             # Dependencies & scripts
│   ├── vite.config.js           # Vite config: React plugin, @ alias, /api proxy
│   ├── tailwind.config.js       # shadcn/ui theming, dark mode, custom animations
│   ├── postcss.config.js        # Tailwind + autoprefixer
│   ├── eslint.config.js         # ESLint flat config with react-hooks plugin
│   ├── jsconfig.json            # @ → ./src path alias
│   ├── index.html               # SPA entry point
│   └── src/
│       ├── main.jsx             # React root + env validation
│       ├── App.jsx              # Router: 10 routes with lazy loading + Suspense
│       ├── index.css            # Tailwind directives + shadcn CSS variables
│       ├── pages/
│       │   ├── auth/
│       │   │   ├── Login.jsx    # Email + password form with Zod validation
│       │   │   └── Register.jsx # Multi-field form + OTP modal flow
│       │   ├── citizen/
│       │   │   ├── Home.jsx     # Complaint feed with filters + pagination
│       │   │   ├── ComplaintDetail.jsx # Full detail + timeline + comments + status mgmt
│       │   │   ├── SubmitComplaint.jsx # 3-step wizard (info → map/images → review)
│       │   │   └── MyComplaints.jsx  # Personal complaint list with tab filters
│       │   ├── ward/
│       │   │   └── WardDashboard.jsx # Ward-level complaint management
│       │   └── admin/
│       │       ├── AdminDashboard.jsx # Analytics with Recharts (pie + bar charts)
│       │       └── ManageUsers.jsx # User table with role management + delete
│       ├── components/
│       │   ├── auth/OtpModal.jsx          # 6-digit OTP input with paste + resend countdown
│       │   ├── complaints/
│       │   │   ├── ComplaintCard.jsx      # Complaint card for feed (title, status, upvote)
│       │   │   └── StatusBadge.jsx        # Color-coded status badge
│       │   ├── common/
│       │   │   ├── Navbar.jsx             # Role-aware navigation + avatar + notification bell
│       │   │   ├── ProtectedRoute.jsx     # Auth + role gate with redirect + toast
│       │   │   ├── NotificationBell.jsx   # Dropdown with unread count, mark read, retry
│       │   │   └── ErrorBoundary.jsx      # Class-based error boundary with reset
│       │   ├── map/MapTileLayer.jsx       # Leaflet tile layer wrapper
│       │   ├── ui/                        # shadcn/ui primitives (button, card, dialog, etc.)
│       │   ├── page-transition.jsx        # Framer Motion page + stagger animations
│       │   ├── theme-provider.jsx         # Dark/light theme context with localStorage
│       │   └── ui/not-found.jsx           # Custom 404 page
│       ├── hooks/use-toast.js      # Toast notification system (shadcn/ui pattern)
│       ├── lib/utils.js            # cn() — tailwind-merge + clsx utility
│       ├── services/
│       │   ├── api.js              # Axios instance with interceptors (auto Bearer, 401 logout)
│       │   ├── authService.js      # login, register, sendOtp, verifyOtp, getMe
│       │   ├── complaintService.js # All complaint CRUD + upvote, comment, verify, reopen
│       │   ├── adminService.js     # getAllUsers, updateUserRole, deleteUser, getAnalytics
│       │   └── geocodingService.js # Reverse geocoding via Geoapify with request dedup
│       ├── store/authStore.js      # Zustand + persist (localStorage: panchayat-auth)
│       └── utils/
│           ├── constants.js        # Categories, statuses, roles, feedback options, API base URL
│           ├── imageValidation.js  # File type, size, dimension checks
│           ├── imageCompression.js # browser-image-compression wrapper (max 1MB, 1920px)
│           └── validateEnv.js      # Warns on missing VITE_* vars
│
├── security/                       # External security reference (PDF)
├── .gitignore
├── API_SPECS_AND_CONTRACTS.md
├── SETUP_AND_CONFIG_BLUEPRINT.md
└── DOCUMENTATION.md                # (this file)
```

---

## 4. Key Concepts & Terminology

### Domain Terms

| Term | Definition |
|---|---|
| **Complaint** | A citizen-submitted report about a local infrastructure issue. Contains title, description, category, location (lat/lng + address), images, ward, village. |
| **Status Flow** | `pending` → `approved` / `rejected` → `in_progress` → `resolved` → `citizen_verification_pending` → `closed` (or `reopened` → back to `pending`) |
| **Citizen Verification** | After an official marks a complaint as resolved, the citizen who created it gets 15 days to verify. They can either **confirm** (→ `closed`) or **reopen** (→ `reopened`) with feedback. If no response in 15 days, the system **auto-closes** it. |
| **Upvote** | A toggle per user per complaint. Signals community priority. Upvote count is denormalized on the complaint doc for fast sorting. |
| **Official Comment** | A comment marked with `isOfficial: true` when the author is a `ward_member` or `gram_pradhan`. Displayed with a special left border highlight. |
| **Ward** | An administrative subdivision of a village. Each complaint is tagged to a ward and village. |
| **Auto-Escalation** | A background job that runs every hour. At 7 days post-resolution without citizen response, sends a reminder. At 15 days, auto-closes. |
| **Audit Log** | Immutable record of every state-changing action on a complaint. Used for transparency and accountability. |

### Core User Journey

1. **Citizen browses** the Home page — they can see all complaints with category/status/village filters without logging in.
2. **Citizen registers** — fills name, email, phone, password, village, ward; receives a 6-digit OTP via email; enters OTP in a modal to verify; account is created.
3. **Citizen logs in** — JWT token issued, stored in Zustand + localStorage. Role determines what they see.
4. **Citizen submits a complaint** — 3-step wizard: (1) title, category, description, village, ward; (2) pin location on Leaflet map (with reverse geocode to address) + upload images (compressed client-side); (3) review and submit. Images go to Cloudinary.
5. **Officials view ward complaints** — Ward members and gram pradhan see a table of all complaints in their ward, sorted by priority. They can update statuses, assign users, and add resolution details.
6. **Official resolves** — Setting status to `resolved` triggers `citizen_verification_pending`. A notification is created for the citizen, and an email is sent asking them to verify.
7. **Citizen verifies** — On the complaint detail page, the citizen sees a "Please verify" card with two buttons: "Confirm Resolution" (→ `closed`) or "Issue Still Exists" (→ `reopened`). If they reopen, ward members are notified.
8. **Auto-closure** — If the citizen does nothing for 15 days, the background job auto-closes the complaint and logs it as `auto_closed`.
9. **Admin monitors** — The admin dashboard shows analytics: complaint counts by status/category/village, resolution rate, average resolution time, user distribution by role.

---

## 5. Component Reference (Frontend)

### Pages

| Component | File | What It Renders | Key State / Props |
|---|---|---|---|
| **Home** | `pages/citizen/Home.jsx` | Complaint feed with search bar, category/status/village filters, paginated grid of ComplaintCards. If unauthenticated, shows a hero section with "Get Started" CTA. | `complaints[]`, `filters{}`, `page`, `loading` |
| **Login** | `pages/auth/Login.jsx` | Dark-themed form with glassmorphism card. Email + password fields with Zod validation. Redirects based on role after login. | `submitting` |
| **Register** | `pages/auth/Register.jsx` | Full registration form (name, email, phone, password, confirm, role, village, ward) + OTP modal flow. Sends OTP first, verifies, then creates account. | `sendingOtp`, `showOtpModal`, `formData` |
| **ComplaintDetail** | `pages/citizen/ComplaintDetail.jsx` | Full complaint view: title, description, images (clickable lightbox), Leaflet map, timeline, status management (for officials), citizen verification card, comments section. | `complaint`, `comments`, `lightbox`, `newStatus`, `showReopenForm` |
| **SubmitComplaint** | `pages/citizen/SubmitComplaint.jsx` | 3-step wizard with progress stepper. Step 1: form fields with Zod validation. Step 2: Leaflet map with click-to-pin + geolocation + image upload with compression. Step 3: review and submit with upload progress bar. | `step`, `position`, `marker`, `images[]`, `submitting`, `uploadProgress` |
| **MyComplaints** | `pages/citizen/MyComplaints.jsx` | Personal complaint list with 4 summary stat cards, tab filters (All/Pending/In Progress/Resolved/Closed), desktop table view + mobile card view. | `complaints[]`, `activeTab`, `loading` |
| **WardDashboard** | `pages/ward/WardDashboard.jsx` | Ward complaint table with 6 stat cards, status filter, sort toggle (date/upvotes), action dropdown per row, status update dialog. | `complaints[]`, `statusFilter`, `sortBy`, `modal` |
| **AdminDashboard** | `pages/admin/AdminDashboard.jsx` | Analytics dashboard: 6 stat cards (total, users, resolution rate, avg time, pending, rejected), 4 Recharts visualizations (status pie, category bar, users-by-role pie, village bar). | `data`, `loading` |
| **ManageUsers** | `pages/admin/ManageUsers.jsx` | User management table with search, role filter tabs, inline role change via Select, delete with confirmation dialog. Desktop + mobile layout. | `users[]`, `activeTab`, `search`, `loading` |

### Shared Components

| Component | File | What It Renders | Props |
|---|---|---|---|
| **Navbar** | `components/common/Navbar.jsx` | Sticky top nav with logo, role-based navigation links, theme switch, notification bell, user avatar dropdown (desktop) or sheet drawer (mobile). | None (reads `authStore`) |
| **ProtectedRoute** | `components/common/ProtectedRoute.jsx` | Auth guard wrapper. Redirects to `/login` if unauthenticated, shows toast on access denied for wrong role. | `children`, `roles[]` |
| **NotificationBell** | `components/common/NotificationBell.jsx` | Bell icon with animated unread badge. Dropdown shows notification list with loading/error/empty states, mark-all-read button, click-to-navigate to complaint. | None (reads `authStore` for user) |
| **ErrorBoundary** | `components/common/ErrorBoundary.jsx` | Class component that catches render errors. Shows error UI with "Go Home" and "Try Again" buttons. | `children`, `fallback?` |
| **ComplaintCard** | `components/complaints/ComplaintCard.jsx` | Card with title, status badge, category badge, village/ward, description (2-line clamp), upvote button, date, author. Hover animation. | `complaint`, `onUpvote` |
| **StatusBadge** | `components/complaints/StatusBadge.jsx` | Color-coded badge for complaint status. Maps status → badge variant (destructive for rejected/reopened, default for resolved, etc.). | `status` |
| **OtpModal** | `components/auth/OtpModal.jsx` | Dialog with 6 individual digit inputs (auto-focus, paste support, arrow key navigation). Resend with 60s countdown. Change email link. | `email`, `onVerify`, `onResend`, `onChangeEmail`, `onClose` |
| **MapTileLayer** | `components/map/MapTileLayer.jsx` | Leaflet tile layer (OpenStreetMap). Used in ComplaintDetail (static) and SubmitComplaint (interactive with click-to-pin). | None (standard config) |
| **PageTransition** | `components/page-transition.jsx` | Framer Motion wrapper for page enter/exit animations. Also exports `containerVariants` and `itemVariants` for staggered list animations. | `children`, `className` |
| **ThemeProvider** | `components/theme-provider.jsx` | Theme context that syncs `dark`/`light` class on `<html>` with localStorage. Defaults to `dark`. | `children`, `defaultTheme?` |
| **ThemeSwitch** | `components/ui/ThemeSwitch.jsx` | Sun/Moon icon toggle button for dark/light mode switching. | None (reads `useTheme()`) |

### shadcn/ui Primitives

The following are standard Radix UI-based primitives generated by shadcn/ui. Located in `components/ui/`:

`button`, `card`, `input`, `textarea`, `select`, `badge`, `avatar`, `dialog`, `dropdown-menu`, `navigation-menu`, `tabs`, `table`, `separator`, `scroll-area`, `sheet`, `label`, `form`, `skeleton`, `toast`/`toaster`, `tooltip`, `alert`, `smooth-cursor`, `MorphingText`, `FloatingLabelInput`, `globe`, `not-found`

---

## 6. API Quick Reference

> Full details in [`API_SPECS_AND_CONTRACTS.md`](./API_SPECS_AND_CONTRACTS.md).

### Auth (`/api/auth`)

| Method | Path | Purpose | Auth |
|---|---|---|---|
| POST | `/auth/send-otp` | Send 6-digit OTP to email | Public |
| POST | `/auth/verify-otp` | Verify OTP code | Public |
| POST | `/auth/register` | Create account (requires OTP) | Public |
| POST | `/auth/login` | Authenticate, get JWT | Public |
| POST | `/auth/logout` | Invalidate JWT (blacklist) | Bearer |
| GET | `/auth/me` | Get current user profile | Bearer |

### Complaints (`/api/complaints`)

| Method | Path | Purpose | Auth | Roles |
|---|---|---|---|---|
| GET | `/complaints` | List (paginated, filterable) | Public | — |
| GET | `/complaints/my/list` | Current user's complaints | Bearer | Any |
| GET | `/complaints/ward/list` | Ward complaints | Bearer | ward_member+ |
| GET | `/complaints/admin/all` | All complaints (global) | Bearer | gram_pradhan, admin |
| GET | `/complaints/verification/pending` | User's pending verifications | Bearer | Any |
| GET | `/complaints/audit/all` | All audit logs | Bearer | admin, gram_pradhan |
| GET | `/complaints/:id` | Single complaint + comments | Public | — |
| POST | `/complaints` | Create complaint (multipart) | Bearer | Any |
| POST | `/complaints/:id/upvote` | Toggle upvote | Bearer | Any |
| POST | `/complaints/:id/comment` | Add comment | Bearer | Any |
| PATCH | `/complaints/:id/status` | Update status | Bearer | ward_member+ |
| POST | `/complaints/:id/verify` | Citizen confirms resolution | Bearer | Owner only |
| POST | `/complaints/:id/reopen` | Citizen reopens complaint | Bearer | Owner only |
| GET | `/complaints/:id/audit` | Audit trail for complaint | Bearer | Any |
| DELETE | `/complaints/:id` | Delete complaint + images | Bearer | Owner or admin |

### Admin (`/api/admin`)

| Method | Path | Purpose | Auth | Roles |
|---|---|---|---|---|
| GET | `/admin/users` | List all users | Bearer | admin |
| PATCH | `/admin/users/:id/role` | Change user role | Bearer | admin |
| DELETE | `/admin/users/:id` | Delete user | Bearer | admin |
| GET | `/admin/analytics` | Aggregate analytics | Bearer | admin, gram_pradhan |

### Notifications (`/api/notifications`)

| Method | Path | Purpose | Auth |
|---|---|---|---|
| GET | `/notifications` | User's notifications | Bearer |
| PATCH | `/notifications/:id/read` | Mark one as read | Bearer |
| PATCH | `/notifications/read-all` | Mark all as read | Bearer |

### System

| Method | Path | Purpose | Auth |
|---|---|---|---|
| GET | `/api/health` | Health check | Public |

---

## 7. State Management

### Solution: Zustand with `persist` middleware

One global store at `frontend/src/store/authStore.js`:

```javascript
// Persisted to localStorage under key "panchayat-auth"
{
  user: null | { _id, name, email, phone, role, village, ward, profileImage },
  token: null | string,   // JWT
  isLoading: boolean,
  error: null | string,
  loginSuccess: (user, token) => void,
  logout: () => void,
  setLoading: (boolean) => void,
  setError: (string) => void,
  updateUser: (partialUser) => void,
}
```

**Persistence:** Only `user` and `token` are persisted (via `partialize`). On page refresh, the store hydrates from localStorage, and the Axios interceptor automatically attaches the token to all requests. If the server returns a 401, the store's `logout()` is called and the user is redirected to `/login`.

**No other state stores exist.** All other component state is local `useState` / `useReducer`.

### Data Flow Pattern

```
User Action → Component State → Axios Service → Express Controller → MongoDB
                                        ↕
                                 Response JSON
                                        ↕
                         Component State Update → Re-render + Toast
```

---

## 8. Hooks & Utilities Reference

### Custom Hooks

| Hook | File | What It Does | Usage Example |
|---|---|---|---|
| `useToast` / `toast` | `hooks/use-toast.js` | Imperative toast notifications. Singleton reducer pattern. Max 1 visible toast. | `toast({ title: "Saved", variant: "destructive" })` |
| `useTheme` | `components/theme-provider.jsx` | Returns `{ theme, setTheme }` from React context. | `const { theme, setTheme } = useTheme()` |

### Utility Functions

| Function | File | What It Does | Usage Example |
|---|---|---|---|
| `cn(...inputs)` | `lib/utils.js` | Merges Tailwind classes with `tailwind-merge` + `clsx`. | `cn("px-4", isActive && "bg-primary")` |
| `validateEnvironment()` | `utils/validateEnv.js` | Checks for `VITE_API_URL` and `VITE_GEOAPIFY_API_KEY`. Warns if missing. | `validateEnvironment()` in main.jsx |
| `validateImageFile(file)` | `utils/imageValidation.js` | Validates file type (JPG/PNG/WEBP), size (< 5 MB), non-empty. | `validateImageFile(event.target.files[0])` → `{ valid, error }` |
| `validateImageDimensions(file)` | `utils/imageValidation.js` | Async. Loads image into `Image()` and checks min (50px) / max (4096px) dimensions. | `await validateImageDimensions(file)` → `{ valid, width, height }` |
| `validateImageCount(current, new)` | `utils/imageValidation.js` | Ensures total doesn't exceed `MAX_IMAGES` (5). | `validateImageCount(3, 2)` → `{ valid: false, error }` |
| `compressImage(file)` | `utils/imageCompression.js` | Compresses image to max 1 MB / 1920px via `browser-image-compression` (WebWorker). | `const compressed = await compressImage(file)` |
| `reverseGeocode(lat, lng)` | `services/geocodingService.js` | Calls Geoapify reverse geocoding API. Deduplicates in-flight requests. Handles timeout/401/429. | `const { address, plusCode } = await reverseGeocode(27.175, 78.042)` |

### Axios Instance (api.js)

| Feature | Detail |
|---|---|
| **Base URL** | `VITE_API_URL` or `http://localhost:5000/api` |
| **Timeout** | 15 seconds |
| **Request interceptor** | Attaches `Authorization: Bearer <token>` from Zustand store |
| **Response interceptor** | 401 → auto-logout + redirect to `/login`. Network error → user-friendly message. Timeout → user-friendly message. |

---

## 9. User Roles & Permissions

| Role | Can Do | Cannot Do |
|---|---|---|
| **citizen** | Create complaints, upvote, comment, view own complaints, verify/reopen own resolved complaints, delete own complaints | Change complaint status, access ward dashboard, access admin pages, manage users |
| **ward_member** | All citizen abilities + view ward complaints table, update complaint status (pending → resolved), assign complaints, add official comments | Access admin dashboard, manage users, view all-complaints admin view |
| **gram_pradhan** | All ward_member abilities + access admin dashboard (analytics), view all complaints across all wards, view all audit logs | Manage users (except if also admin) |
| **admin** | Everything: manage all users (change roles, delete), view all data, access every page, delete any complaint | Cannot delete own admin account |

### Route-Level Enforcement

| Route | Allowed Roles |
|---|---|
| `/` (Home) | Public |
| `/login`, `/register` | Public (redirect if logged in) |
| `/complaints/:id` | Public (read-only), auth required for interactions |
| `/submit` | citizen, ward_member, gram_pradhan |
| `/my-complaints` | citizen |
| `/ward-dashboard` | ward_member, gram_pradhan |
| `/admin` | admin, gram_pradhan |
| `/admin/users` | admin |
| `*` (404) | Public |

---

## 10. Known Limitations & Future Roadmap

### Current Gaps

| Issue | Location | Impact |
|---|---|---|
| **`.env` checked into version control** | `backend/.env` | Live MongoDB credentials, Cloudinary API keys, and JWT secret are exposed in the repository |
| **No `.env.example`** | N/A | New developers must reverse-engineer required variables from source code |
| **`GET /api/users` is a stub** | `backend/routes/users.js` | This route returns a static message — no controller or database interaction |
| **`/verification/pending` not linked in frontend** | Frontend navigation | Citizens cannot easily find their pending verifications |
| **No profile image upload UI** | Frontend | `User.profileImage` field exists but no frontend form to set it |
| **Geoapify key is undocumented** | `frontend/.env` (doesn't exist) | Map location reverse geocoding requires a key that no developer knows about |
| **No pagination on MyComplaints** | `MyComplaints.jsx` | If a user has many complaints, the page loads all at once |
| **No file size validation error for exact limit** | `imageValidation.js` | `validateImageFile` rejects `> 5 MB` but the backend error message says "cannot exceed 5 MB" — slight inconsistency |
| **OTP blacklist is in-memory** | `authMiddleware.js` | Token blacklist is per-process; restarting the server clears all blacklisted tokens |
| **No refresh token mechanism** | Backend | JWT lasts 7 days with no refresh; after expiry the user must re-login |

### Suggested Next Features

| Feature | Rationale |
|---|---|
| **Push notifications (WebSocket/SSE)** | Real-time updates when complaint status changes |
| **File upload for resolution images** | Field `resolutionImages` exists in the model but frontend never sends them |
| **Multiple ward assignment** | A complaint could span multiple wards |
| **SMS OTP fallback** | Many rural users have phones but not email |
| **Export to CSV/PDF** | Admins need to generate reports |
| **In-app chat** | Replace comments with real-time conversation |
| **Language localization (Hindi + regional)** | Panchayat users may not speak English |
| **Progressive Web App (PWA)** | Offline support for low-connectivity rural areas |
| **Automated tests** | No test files found in the entire codebase |
| **CI/CD pipeline** | No GitHub Actions or deployment config exists |

---

## 11. Contributing Guide

### Branch Naming

Inferred convention from git log: `feat/*` for features.

Recommended patterns:
- `feat/<short-description>` — new features
- `fix/<short-description>` — bug fixes
- `refactor/<short-description>` — code restructuring
- `docs/<short-description>` — documentation

### Commit Message Format

Based on existing commits (`feat: update UI colors...`, `feat: Refactor App structure...`, `feat: enhance...`), the project uses conventional commits:

```
<type>: <present-tense description>
```

Types observed: `feat`. Consider also using `fix`, `refactor`, `docs`, `chore`, `style`.

### PR Checklist

Before submitting a PR:

- [ ] Backend server starts without errors (`npm run dev`)
- [ ] Frontend builds without errors (`npm run build`)
- [ ] No `console.log` or `console.error` in production code (use the centralized error handler)
- [ ] All environment variables are documented in `.env.example`
- [ ] No secrets committed (JWT secrets, API keys, passwords)
- [ ] New routes have express-validator validation chains
- [ ] New features respect role-based access (add `authorizeRoles` middleware)
- [ ] Responsive design works on mobile (check `hidden md:block` patterns)

### Code Style Notes

| Convention | Rule |
|---|---|
| **Backend** | CommonJS (`require`/`module.exports`), plain JavaScript |
| **Frontend** | ES Modules (`import`/`export`), JSX, plain JavaScript (no TypeScript) |
| **Imports** | Absolute `@/` imports for `src/`, relative for same-directory |
| **Component style** | Function components with hooks, no class components (except `ErrorBoundary`) |
| **State** | Local `useState` for page-level, Zustand for global auth |
| **API calls** | Centralized Axios instance (`api.js`), service files per domain |
| **CSS** | Tailwind utility classes, shadcn CSS variables for theming |
| **Validation** | Backend: `express-validator`. Frontend: `react-hook-form` + `zod`. |
| **Error handling** | Backend: centralized `errorHandler`. Frontend: try/catch + toast notifications. |

---

## 12. License & Credits

### License

- **Backend:** ISC (per `backend/package.json`)
- **Frontend:** No explicit license (per `frontend/package.json` — `"private": true`)

### Tech Stack Credits

| Technology | Role |
|---|---|
| [Express](https://expressjs.com/) | Backend web framework |
| [Mongoose](https://mongoosejs.com/) | MongoDB ODM |
| [React](https://react.dev/) | Frontend UI library |
| [Vite](https://vite.dev/) | Frontend build tool |
| [Tailwind CSS](https://tailwindcss.com/) | Utility-first CSS |
| [shadcn/ui](https://ui.shadcn.com/) | Component primitives |
| [Radix UI](https://www.radix-ui.com/) | Accessible UI primitives |
| [Zustand](https://github.com/pmndrs/zustand) | State management |
| [Axios](https://axios-http.com/) | HTTP client |
| [Leaflet](https://leafletjs.com/) | Interactive maps |
| [Recharts](https://recharts.org/) | Charts |
| [Framer Motion](https://www.framer.com/motion/) | Animations |
| [Cloudinary](https://cloudinary.com/) | Image hosting |
| [Resend](https://resend.com/) | Email service |
| [Geoapify](https://www.geoapify.com/) | Geocoding API |
| [JWT](https://jwt.io/) | Authentication tokens |
| [bcryptjs](https://github.com/dcodeIO/bcrypt.js) | Password hashing |

---
