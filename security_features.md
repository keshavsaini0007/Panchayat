# Security Features

## OTP Brute Force Protection

### Problem
OTP verification endpoints (4-6 digit codes) without rate limiting or lockout mechanisms allow attackers to brute-force codes within minutes.

### Implementation

**Files:**
- `backend/utils/otpUtils.js` — Lockout tracker with exponential backoff
- `backend/controllers/otpController.js` — Lockout enforcement in sendOtp and verifyOtp

**How it works:**

1. **Global attempt tracking** — Failed OTP verification attempts are tracked per email across multiple OTP requests (in-memory `otpAttemptTracker` Map).

2. **Lockout threshold** — After 5 total failed attempts (`LOCKOUT_THRESHOLD`), the email is locked from further OTP verification.

3. **Exponential backoff** — Lockout durations follow an exponential sequence:
   - 1st lockout: 30 seconds
   - 2nd lockout: 1 minute
   - 3rd lockout: 2 minutes
   - 4th lockout: 4 minutes
   - 5th lockout: 8 minutes
   - ...doubles each time, capped at 24 hours (`MAX_LOCKOUT_MS`)

4. **OTP send prevention** — New OTP requests are also blocked during lockout, preventing attackers from rotating OTPs to reset the per-OTP attempt counter.

5. **Per-OTP limit preserved** — The existing per-OTP-code limit of 5 attempts (`MAX_ATTEMPTS`) is kept as an additional safety layer.

6. **Cleanup** — Expired lockout entries are purged every 60 seconds from the in-memory Map.

7. **Success reset** — Successful OTP verification clears all attempt tracking for that email.

### Attack Scenario Prevented
- Without this: 5 attempts × 5 OTPs/hour = 25 guesses/hour → 40,000 hours to crack 6-digit OTP
- With lockout: 5 guesses → 30s lockout → 5 more → 60s lockout → ... effectively unlimited time for each subsequent attempt
