# Setup & Configuration Blueprint

> Last updated: 2026-06-27

---

## 1. Project Overview

**Panchayat** is a village-level complaint management system. Citizens can register complaints about local infrastructure (roads, water, electricity, etc.) and officials (ward members, gram pradhan) can manage, assign, and resolve them. A citizen verification flow ensures resolved complaints are genuinely fixed before closure.

### Tech Stack

| Layer | Technology | Version (inferred) |
|---|---|---|
| **Backend runtime** | Node.js | >= 18 (Express 5 requires Node 18+) |
| **Backend framework** | Express | ^5.2.1 |
| **Database** | MongoDB (Atlas) | via Mongoose ^9.6.3 |
| **ODM** | Mongoose | ^9.6.3 |
| **Authentication** | JWT (`jsonwebtoken` ^9.0.3) + bcrypt (`bcryptjs` ^3.0.3) | — |
| **Email** | Resend SDK (`resend` ^6.14.0) | — |
| **Image upload** | Cloudinary (`cloudinary` ^1.41.3 + `multer-storage-cloudinary` ^4.0.0) | — |
| **Frontend framework** | React | ^19.2.6 |
| **Frontend bundler** | Vite | ^8.0.12 |
| **Styling** | Tailwind CSS | ^3.4.17 |
| **UI library** | Radix UI primitives + shadcn/ui components | — |
| **State management** | Zustand with persist middleware | ^5.0.5 |
| **Form validation** | react-hook-form + Zod | ^7.80.0 / ^3.25.76 |
| **HTTP client** | Axios | ^1.8.4 |
| **Maps** | Leaflet + react-leaflet | ^1.9.4 / ^5.0.0 |
| **Charts** | Recharts | ^2.15.3 |
| **Animation** | Framer Motion | ^12.40.0 |

---

## 2. Prerequisites

| Software | Minimum Version | Required For |
|---|---|---|
| **Node.js** | >= 18.0.0 | Both backend and frontend (Express 5 + Vite 8 requirement) |
| **npm** | >= 9.0.0 | Dependency management |
| **MongoDB** | >= 6.0 (or Atlas account) | Database |
| **Git** | >= 2.30.0 | Version control |
| *Docker* | *Not required* | *No Docker configuration is present* |

### Optional

| Tool | Purpose |
|---|---|
| **Cloudinary account** (free) | Image upload storage (backend reads `CLOUDINARY_*` env vars) |
| **Resend account** (free tier) | Transactional emails (OTP, verification) |
| **Geoapify API key** | Geocoding / location autocomplete in frontend |
| **nodemon** (dev dependency) | Backend auto-restart on file changes (`npm run dev` in backend) |

---

## 3. Environment Variables

> **⚠️ Security Warning:** The checked-in `.env` file contains live production credentials (MongoDB Atlas, Cloudinary). These should be moved to a `.env.example` template and the actual `.env` added to `.gitignore`. No `.env.example` file currently exists.

### Backend (`backend/.env`)

| Variable | Required | Default | Description | Example Value |
|---|---|---|---|---|
| `PORT` | No | `5000` | Server listen port | `5000` |
| `MONGO_URI` | **Yes** | — | MongoDB connection string (without database name — `/panchayat` is appended by code) | `mongodb+srv://user:pass@cluster.mongodb.net` |
| `JWT_SECRET` | **Yes** | — | Secret key for signing JSON Web Tokens (any high-entropy string) | `2k5j9c5d6b8f3f2a7c4d8e9f...` |
| `CLIENT_URL` | No | `http://localhost:5173` | Frontend origin for CORS and email verification links | `http://localhost:5173` |
| `NODE_ENV` | No | `development` | Runtime environment (`development`, `production`, `test`) | `development` |
| `CLOUDINARY_CLOUD_NAME` | If using image upload | — | Cloudinary cloud name | `djhblebso` |
| `CLOUDINARY_API_KEY` | If using image upload | — | Cloudinary API key | `543959345852245` |
| `CLOUDINARY_API_SECRET` | If using image upload | — | Cloudinary API secret | `_NRYrKqsdHNP0yRkVOT8R3Kmwrg` |
| `RESEND_API_KEY` | If using email | — | Resend API key for sending transactional emails | `re_U8Z9vcRv_Fi2WKWT1tYLeJpQGYPab3bUG` |
| `RESEND_FROM_EMAIL` | No | `onboarding@resend.dev` | Sender email address for outgoing emails | `panchayat@resend.dev` |

### Frontend (`frontend/.env`)

| Variable | Required | Default | Description | Example Value |
|---|---|---|---|---|
| `VITE_API_URL` | No | `http://localhost:5000/api` | Backend API base URL (used by Axios client) | `http://localhost:5000/api` |
| `VITE_GEOAPIFY_API_KEY` | No | `''` | Geoapify API key for geocoding features | `abc123def456` |

**⚠️ Undocumented Secrets** — The following variables have no corresponding `.env.example` entry and are only discoverable by reading source code:

- `CLOUDINARY_URL` — exists in `.env` but never read by code (the individual `CLOUDINARY_*` vars are used instead)
- `VITE_GEOAPIFY_API_KEY` — referenced in `frontend/src/utils/validateEnv.js` but optional

### Env Validation

**Backend** (in `backend/index.js:12-18`):
```javascript
const REQUIRED_ENV = ['MONGO_URI', 'JWT_SECRET'];
// If either is missing, the process exits immediately with FATAL log.
```

**Frontend** (in `frontend/src/utils/validateEnv.js`):
```javascript
// Warns on missing VITE_API_URL or VITE_GEOAPIFY_API_KEY, does not block startup.
```

---

## 4. Local Development Setup

### Step 1: Clone the Repository

```bash
git clone <repository-url> panchayat
cd panchayat
```

### Step 2: Backend Setup

```bash
cd backend
npm install
```

Expected output:
```
added 185 packages in 8s
```

### Step 3: Configure Backend Environment

```bash
# Copy the example (you'll need to create .env.example first — see section 3)
# Or create backend/.env manually with your values:
cat > backend/.env << 'EOF'
PORT=5000
MONGO_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net
JWT_SECRET=<generate-a-random-64-char-string>
CLIENT_URL=http://localhost:5173
NODE_ENV=development
CLOUDINARY_CLOUD_NAME=<your-cloud-name>
CLOUDINARY_API_KEY=<your-api-key>
CLOUDINARY_API_SECRET=<your-api-secret>
RESEND_API_KEY=re_<your-resend-key>
RESEND_FROM_EMAIL=onboarding@resend.dev
EOF
```

> **Note:** Minimum required variables are `MONGO_URI` and `JWT_SECRET`. Without them, the server will **exit immediately** with `FATAL: Missing required environment variable`.

### Step 4: Start the Backend Server

```bash
# With auto-reload (recommended for development)
npm run dev

# OR without auto-reload
npm start
```

Expected output:
```
Server running on port 5000
MongoDB Connected
Auto-escalation scheduler started (running every hour)
```

### Step 5: Frontend Setup (separate terminal)

```bash
cd frontend
npm install
```

Expected output:
```
added 320 packages in 12s
```

### Step 6: Configure Frontend Environment (optional)

```bash
cat > frontend/.env << 'EOF'
VITE_API_URL=http://localhost:5000/api
VITE_GEOAPIFY_API_KEY=
EOF
```

The frontend works without any env vars — it will default the API URL to `http://localhost:5000/api` via the Vite proxy and constants file.

### Step 7: Start the Frontend Dev Server

```bash
npm run dev
```

Expected output:
```
VITE v8.0.12  ready in 350 ms
➜  Local:   http://localhost:5173/
➜  Network: http://192.168.x.x:5173/
```

### Step 8: Verify Everything Works

```bash
# Health check
curl http://localhost:5000/api/health
```

Expected response:
```json
{"success":true,"status":"ok","timestamp":"2026-06-27T12:00:00.000Z","uptime":12.345}
```

---

## 5. Available Scripts

### Backend (`backend/package.json`)

| Script | Command | What It Does |
|---|---|---|
| `start` | `node index.js` | Starts the production server |
| `dev` | `nodemon index.js` | Starts the server with file-watching auto-restart |

### Frontend (`frontend/package.json`)

| Script | Command | What It Does |
|---|---|---|
| `dev` | `vite` | Starts Vite dev server with HMR on port 5173 |
| `build` | `vite build` | Builds the production bundle into `frontend/dist/` |
| `lint` | `eslint .` | Runs ESLint across all frontend source files |
| `preview` | `vite preview` | Locally previews the production build |

---

## 6. Configuration Reference

### Backend: `backend/index.js`

| Config Object / Setting | Key Options | Misconfiguration Impact |
|---|---|---|
| **helmet** | `crossOriginResourcePolicy: { policy: 'cross-origin' }` | Missing this causes CORS errors for image loading in production |
| **cors** | `origin: process.env.CLIENT_URL \|\| '*'`, `credentials: true` | Wrong origin blocks all frontend requests; with `'*'`, cookies/credentials won't be sent |
| **express.json** | `limit: '10mb'` | Payloads over 10 MB get a 413 error (increase if users upload many large images) |
| **express.urlencoded** | `extended: true`, `limit: '10mb'` | Form submissions over 10 MB fail |
| **Global rate limiter** | `windowMs: 15 * 60 * 1000`, `max: 100` | Too low causes 429 errors for legitimate users during testing |
| **Auth rate limiter** | `windowMs: 15 * 60 * 1000`, `max: 20` | Too low blocks login during testing |
| **sanitizeInput** middleware | Strips MongoDB `$`-prefixed operators | Removed or disabled exposes the app to NoSQL injection attacks |

### Backend: `backend/config/db.js` — MongoDB Connection

| Option | Value | Purpose |
|---|---|---|
| `maxPoolSize` | `10` | Max concurrent connections in the pool. Increase for production under heavy load. |
| `serverSelectionTimeoutMS` | `5000` | Fails fast if MongoDB is unreachable (5 seconds). Increase for slow networks. |
| `socketTimeoutMS` | `45000` | Closes idle connections after 45 seconds. |
| `retryWrites` | `true` | Automatically retries write operations on network failures. |
| `w` | `'majority'` | Ensures writes are acknowledged by the majority of replica set members. |
| Database name | `'panchayat'` (appended to `MONGO_URI` automatically in code) | If the URI already includes a path, a double slash causes connection failure. |

### Backend: `backend/config/cloudinary.js` — Image Upload

| Setting | Value | Purpose |
|---|---|---|
| Upload folder | `panchayat/complaints` | Cloudinary folder for all complaint images |
| Allowed formats | `jpg`, `jpeg`, `png`, `webp` | Files in other formats are rejected |
| `MAX_FILE_SIZE` | `5 * 1024 * 1024` (5 MB) | Per-image size limit |
| `MAX_IMAGES` | `5` | Maximum images per complaint |
| MIME filter | `image/jpeg`, `image/png`, `image/webp` | Rejects non-image files early |

### Backend: `backend/utils/otpUtils.js` — OTP Configuration

| Constant | Value | Purpose |
|---|---|---|
| `OTP_LENGTH` | `6` | Number of digits in generated OTP |
| `OTP_EXPIRY_MINUTES` | `10` | Time window for OTP validity |
| `MAX_ATTEMPTS` | `5` | Failed attempts before OTP record is invalidated |
| `RATE_LIMIT_MAX` | `5` | Max OTP send requests per email per hour |
| `RATE_LIMIT_WINDOW_MS` | `3600000` (1 hour) | Rate limit rolling window |
| `LOCKOUT_THRESHOLD` | `5` | Consecutive failed verifications before exponential backoff |
| `LOCKOUT_BASE_MS` | `30000` (30 s) | Initial lockout duration |
| `BACKOFF_FACTOR` | `2` | Multiplier for each subsequent lockout |
| `MAX_LOCKOUT_MS` | `86400000` (24 h) | Maximum lockout cap |

### Backend: `backend/utils/autoEscalation.js` — Auto-Closure

| Setting | Value | Purpose |
|---|---|---|
| `BATCH_SIZE` | `100` | Number of complaints processed per query batch |
| `SEVEN_DAYS` | `7 * 24 * 60 * 60 * 1000` | After 7 days of no citizen response, status → `awaiting_citizen_response` + reminder notification |
| `FIFTEEN_DAYS` | `15 * 24 * 60 * 60 * 1000` | After 15 days, complaint is auto-closed and an audit log is created |
| Scheduler interval | `60 * 60 * 1000` (1 hour) | How often the auto-escalation job runs |

### Backend: `backend/utils/emailService.js` — Email Templates

| Template | Variables | When Sent |
|---|---|---|
| `OTP_EMAIL_TEMPLATE(otp, expiresInMinutes)` | OTP code, expiry duration | On `POST /api/auth/send-otp` |
| `VERIFICATION_EMAIL_TEMPLATE(citizenName, complaintTitle, complaintId, village)` | User name, complaint title, ID, village | When complaint status is set to `resolved` (→ `citizen_verification_pending`) |

> The `CLIENT_URL` env var is used in the verification email's "View & Verify" button link.

### Frontend: `frontend/vite.config.js`

| Option | Value | Purpose |
|---|---|---|
| `resolve.alias['@']` | `./src` | Enables `import X from '@/components/...'` |
| `server.proxy['/api']` | `target: 'http://localhost:5000', changeOrigin: true` | Proxies `/api` requests to the backend during dev, avoiding CORS issues |

### Frontend: `frontend/tailwind.config.js`

| Option | Value | Purpose |
|---|---|---|
| `darkMode` | `'class'` | Dark mode toggled by adding `.dark` class to `<html>` |
| `theme.extend.colors` | CSS variables via `hsl(var(--name))` | shadcn/ui theming system — all colors customizable via CSS custom properties |
| `theme.extend.fontFamily.sans` | `['Inter', 'system-ui', 'sans-serif']` | Primary font stack |
| Plugins | `tailwindcss-animate` | Animation utilities |

### Frontend: `frontend/src/services/api.js` (Axios instance)

| Option | Value | Purpose |
|---|---|---|
| `baseURL` | `VITE_API_URL` or fallback `http://localhost:5000/api` | All API requests use this as base |
| `headers['Content-Type']` | `application/json` | Default content type |
| `timeout` | `15000` (15 s) | Request timeout |
| **Request interceptor** | Attaches `Authorization: Bearer <token>` from Zustand store | Auto-auth on every request |
| **Response interceptor** | On 401: calls `logout()` + redirects to `/login` | Auto-logout on auth failure |

### Frontend: `frontend/src/utils/constants.js`

| Export | Value | Purpose |
|---|---|---|
| `COMPLAINT_CATEGORIES` | 13 entries with `{ label, value }` | Used in complaint creation forms |
| `COMPLAINT_STATUSES` | 9 entries with `{ label, value, color }` | Status badges and filters |
| `CITIZEN_FEEDBACK_OPTIONS` | 5 entries with `{ label, value }` | Reopen reason selection |
| `USER_ROLES` | `['citizen', 'ward_member', 'gram_pradhan', 'admin']` | Role management |
| `API_BASE_URL` | `import.meta.env.VITE_API_URL \|\| 'http://localhost:5000/api'` | Backend base URL at runtime |

---

## 7. Docker Setup

No Docker configuration files (`Dockerfile`, `docker-compose.yml`) are present in this project. If you wish to containerize:

```bash
# Minimal Docker setup would require:
# - A Dockerfile for the backend (Node 18+ base image)
# - A Dockerfile for the frontend (multi-stage build with nginx)
# - A docker-compose.yml with MongoDB, backend, and frontend services
```

---

## 8. Deployment Guide

### Detected Platforms

No platform-specific configuration files were found:
- ❌ No `vercel.json`
- ❌ No `netlify.toml`
- ❌ No `render.yaml`
- ❌ No `railway.toml`
- ❌ No `.github/workflows/` (no CI/CD)
- ❌ No Docker files

### General Deployment (any VPS / PaaS)

#### Backend

| Concern | Detail |
|---|---|
| **Build command** | `npm install` (no build step — native Node.js) |
| **Start command** | `npm start` (which runs `node index.js`) |
| **Required env vars** | `MONGO_URI`, `JWT_SECRET` |
| **Port** | Set via `PORT` env var (default `5000`) |
| **Node version** | >= 18 (define in platform settings) |

#### Frontend

| Concern | Detail |
|---|---|
| **Build command** | `npm install && npm run build` |
| **Output directory** | `frontend/dist/` |
| **Start command** | `npm run preview` (or serve `dist/` with nginx) |
| **Required env vars** | `VITE_API_URL` must point to the deployed backend URL |
| **Routing** | SPA — configure server to fallback to `index.html` for all routes |

### Production Checklist

1. **Set `NODE_ENV=production`** — disables request logging, hides error stack traces
2. **Set a strong `JWT_SECRET`** — at least 64 random characters
3. **Configure MongoDB Atlas IP Whitelist** — restrict to deployment IP or use VPC peering
4. **Enable Resend API key** — without it, OTP and verification emails only log to console
5. **Set `CLIENT_URL`** — must match the deployed frontend domain for CORS and email links
6. **Cloudinary secure upload** — use unsigned presets or signed uploads in production
7. **Increase `maxPoolSize`** — from 10 to 25-50 for production load
8. **Add a `.env.example`** — remove the live `.env` from version control

---

## 9. Troubleshooting

### Backend Fails to Start

```
FATAL: Missing required environment variable: MONGO_URI
```

- **Cause:** The environment has no `MONGO_URI` or `JWT_SECRET` set.
- **Fix:** Create `backend/.env` with both variables. See section 3 for the full list.

```
MongoDB connection error: getaddrinfo ENOTFOUND cluster0.xxxxx.mongodb.net
```

- **Cause:** Network cannot resolve the MongoDB Atlas hostname (no internet, DNS issue, or VPN blocking).
- **Fix:** Check internet connectivity, verify the hostname in `MONGO_URI`, ensure Atlas IP whitelist includes your IP.

```
MongoDB connection error: Authentication failed
```

- **Cause:** Incorrect MongoDB username or password in `MONGO_URI`.
- **Fix:** Verify credentials in MongoDB Atlas → Database Access. URL-encode special characters in the password.

### Email Sending Issues

```
No email received after OTP request
```

- **Cause 1:** `RESEND_API_KEY` is not set — the service runs in **simulated mode**, printing OTPs to the backend console.
- **Cause 2:** Resend domain not verified — sender email must be verified in Resend dashboard.
- **Fix:** Check backend terminal for `=== EMAIL SERVICE DISABLED ===` and the OTP value. Set `RESEND_API_KEY` for production.

### Image Upload Fails

```json
{"success":false,"message":"\"photo.jpg\": Only JPG, PNG and WEBP images are allowed."}
```

- **Cause:** File format is not in the allowed list (e.g., GIF, BMP, SVG).
- **Fix:** Convert the image to JPG, PNG, or WEBP before uploading.

```json
{"success":false,"message":"Image size cannot exceed 5 MB."}
```

- **Cause:** File exceeds the 5 MB limit.
- **Fix:** Compress or resize the image. The frontend uses `browser-image-compression` to pre-compress.

```json
{"success":false,"message":"Maximum 5 images allowed."}
```

- **Cause:** More than 5 files selected.
- **Fix:** Upload a maximum of 5 images per complaint.

### Cloudinary Upload Errors

```
CloudinaryResponseError: Invalid cloud name
```

- **Cause:** `CLOUDINARY_CLOUD_NAME` is missing or incorrect.
- **Fix:** Verify the cloud name in your Cloudinary dashboard. All three `CLOUDINARY_*` env vars must match.

### Frontend Cannot Reach Backend

**Browser console:**
```
Proxy error: Could not proxy request /api/complaints from localhost:5173 to http://localhost:5000
```

- **Cause:** Backend is not running, or Vite proxy targets wrong port.
- **Fix:** Ensure backend is running on port 5000. Check `frontend/vite.config.js` proxy target. Also verify `VITE_API_URL` in frontend env.

**OR**

```
Access to XMLHttpRequest at 'http://localhost:5000/api/...' from origin 'http://localhost:5173'
has been blocked by CORS policy
```

- **Cause:** Backend CORS config does not recognize the frontend origin.
- **Fix:** Set `CLIENT_URL=http://localhost:5173` in `backend/.env`. If missing, CORS falls back to `'*'` which blocks requests with credentials.

### JWT Token Errors

```json
{"success":false,"message":"Token expired, please login again"}
```

- **Cause:** JWT token is older than 7 days.
- **Fix:** Re-login to get a new token.

```json
{"success":false,"message":"Token revoked, please login again"}
```

- **Cause:** Token was invalidated via logout.
- **Fix:** Login again. The in-memory blacklist is cleared every 24 hours.

### Auto-Logout on Page Refresh

- **Cause:** Zustand persist middleware stores auth in `localStorage` under key `panchayat-auth`. If localStorage is cleared or corrupted, the user is logged out.
- **Fix:** Ensure browser localStorage is enabled. The app should handle this gracefully and redirect to `/login`.

### OTP Lockout

```
Too many failed attempts. Try again in 60 second(s).
```

- **Cause:** 5+ consecutive failed OTP verifications trigger exponential backoff lockout.
- **Fix:** Wait for the lockout to expire. Initial lockout is 30 seconds, doubling with each subsequent lockout (max 24 hours).

---
