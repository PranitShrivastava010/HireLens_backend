# HireLens Backend — Task List

> Work on these tasks **in order**. Complete and test each one before moving to the next.  
> Status: 🔲 Not started | 🔄 In progress | ✅ Done

---

## Phase 1 — Stability & Correctness

### TASK-B-01 — Fix Refresh Token Error Handling ✅
**Problem:** If refresh token is expired or already rotated, the endpoint crashes instead of returning a clean 401.  
**Goal:** Ensure all error cases in `refreshTokenService` return proper structured responses instead of throwing unhandled errors.  
**Files:** `src/modules/auth/services/refreshToken.service.ts`, `auth.controller.ts`  
**Acceptance:**
- `POST /auth/refresh` with expired/used token → `401 { success: false, message: "..." }`
- No unhandled promise rejection in logs

---

### TASK-B-02 — Add Input Validation with Zod ✅
**Problem:** No request body validation on any endpoint. Any malformed input hits the service layer.  
**Goal:** Add Zod schemas for all auth and job routes. Validate in controller before calling service.  
**Files:** All controllers  
**Schemas added:**
- `register`, `verify-otp`, `login`
- `job/fetch`, `job/preference`
- `application/apply`, `application/status`
**Acceptance:** Invalid body → `400 { success: false, code: "VALIDATION_ERROR", errors: [...] }`

---

### TASK-B-03 — AI-Driven Roles & Skills Extraction 🔲
**Problem:** `Role` and `Skill` tables are empty. We want existing jobs in the database to be the source of truth for these master tables.  
**Goal:** Create a one-time migration service/script that iterates through all jobs in the DB and uses Groq AI to extract and populate the `Role` and `Skill` tables.  
**Logic:**
1. Fetch all `Jobs` that haven't been linked to a `JobRole` or `JobSkill` yet.
2. For each job, call `extractRolesAndSkillsForJob(job.id)`. (Service already exists in `roleSkill.service.ts`).
3. This will automatically populate `Role`, `Skill`, and the mapping tables via `resolveRole`/`resolveSkill`.
**Acceptance:** Running the script populates the Roles and Skills tables with real data from the DB jobs; results are visible in the frontend preferences chip selector.  

---

### TASK-B-04 — Add Dashboard Stats API & Goal Tracking 🔲
**Problem:** Dashboard is empty. We need structured data for three specific charts: Weekly Progress (Progress against goal), Application Summary (Donut), and Weekly Activity (Bar).  
**Goal:** Implement `GET /api/dashboard/stats` and `PATCH /api/dashboard/goal`.  
**New Schema Field:** Add `weeklyGoal` (Int, default: 10) to `User` model.  
**API Response Shape (`GET /api/dashboard/stats`):**
```json
{
  "weeklyProgress": {
    "appliedThisWeek": 4,
    "weeklyGoal": 10,
    "percentage": 40
  },
  "statusSummary": [
    { "key": "APPLIED", "label": "Applied", "count": 12 },
    { "key": "INTERVIEW", "label": "Interview", "count": 3 },
    { "key": "OFFER", "label": "Offer", "count": 1 }
  ],
  "weeklyActivity": {
    "monday": 2,
    "tuesday": 0,
    "wednesday": 1,
    "thursday": 1,
    "friday": 0,
    "saturday": 0,
    "sunday": 0
  },
  "upcomingInterviews": [...],
  "recentApplications": [...]
}
```
**Endpoints:**
1. `GET /api/dashboard/stats`: Returns the aggregated data above.
2. `PATCH /api/dashboard/goal`: Updates `User.weeklyGoal` via request body `{ goal: number }`.
**Acceptance:** 
- Frontend receives correct counts for the current week (filtering by `appliedAt`).
- Percentage correctly calculated.
- Daily counts correctly mapped to the current Monday-Sunday range.

---

### TASK-B-05 — Automated Job Fetch Cron Job 🔲
**Context:** Job fetching from JSearch API must happen **automatically on a schedule**, not via a manual API call from the frontend. The frontend feed should always have fresh data waiting without any user action.  
**Goal:** Set up a cron job that runs every few hours, iterates over all seeded `Role` records, and fetches jobs for each role from JSearch API.  
**Package:** `node-cron`  
**Schedule:** Every 6 hours — `0 */6 * * *`  
**Logic:**
1. On cron tick: fetch all `Role` records from DB
2. For each role: call `fetchJobsFromApi(roleName + " India")` (or use `Role.name` directly)
3. For each fetched job: upsert to DB, extract roles/skills via Groq AI
4. Log total fetched + any errors per role  
**Files:**
- New: `src/cron/fetchJobs.cron.ts`
- Updated: `index.local.ts` and `index.ts` to register the cron on server start  
**Acceptance:**
- Cron fires automatically on schedule (log confirms execution)
- Each role generates its own fetch query
- No duplicate jobs (upsert handles it)
- Cron does NOT block the HTTP server
- Cron skips gracefully if JSearch API fails (no crash)

---

### TASK-B-06 — Add Logout Endpoint 🔲
**Problem:** There is no `POST /auth/logout` endpoint. The frontend currently just clears Redux state but the refresh token cookie and DB record remain valid.  
**Goal:** Add logout endpoint that deletes the `UserToken` record and clears the cookie.  
**File:** `src/modules/auth/auth.routes.ts`, `auth.controller.ts`, new `logout.service.ts`  
**Acceptance:**
- `POST /api/auth/logout` → deletes `UserToken` from DB, clears `refreshToken` cookie
- Subsequent refresh attempts with old token → 401

---

### TASK-B-07 — Implement ATS Score History 🔲
**Problem:** ATS scores are saved in `AtsAnalysis` but there's no endpoint to retrieve a user's past scores.  
**Goal:** Add `GET /api/resume/ats/history` to retrieve all ATS analyses for the user, ordered by date.  
**File:** `src/modules/resume/resume.routes.ts`, `resume.controller.ts`, new service  
**Acceptance:** Returns array of ATS results with job title, date, score, matched/missing counts

---

### TASK-B-08 — Rate Limiting on Auth Routes 🔲
**Problem:** No rate limiting on `/auth/register`, `/auth/verify-otp`, `/auth/login`. Vulnerable to brute force.  
**Goal:** Add per-IP rate limiting on auth endpoints.  
**Package:** `express-rate-limit`  
**Limits:** Register: 5/hr | Login: 10/hr | OTP verify: 10/hr  
**Acceptance:** Exceeding limit → `429 Too Many Requests`

---

### TASK-B-09 — Add `GET /api/job/:id` ATS Snapshot 🔲
**Problem:** Job detail view doesn't include the user's existing ATS score for that job (if already computed).  
**Goal:** In `getJobByIdService`, also query `AtsAnalysis` for the current user + this jobId and include it in the response.  
**File:** `src/modules/jobs/services/getJobsById.service.ts`  
**Acceptance:** If ATS score exists → `"atsScore": { "score": 72, "matchedKeywords": [...], "missingKeywords": [...] }` in response

---

### TASK-B-10 — Cleanup: Consistent Error Response Format 🔲
**Problem:** Some endpoints return `{ message: "..." }`, others return `{ success: false, code: "...", message: "..." }`. Inconsistent.  
**Goal:** Standardize all error responses to `{ success: false, code: string, message: string }`.  
**Files:** All controllers  
**Acceptance:** Every error response across all endpoints follows the same schema

---

## Phase 2 — New Features

### TASK-B-11 — Job Bookmarks / Wishlist 🔲
**Problem:** There's no way to save a job without applying to it. Wishlist status exists in `ApplicationStatus` seed but isn't a first-class feature.  
**Goal:** Ensure `statusKey: "WISHLIST"` works through the existing apply endpoint. Potentially add a dedicated `GET /api/job/saved` endpoint.  
**Acceptance:** User can bookmark a job, retrieve their wishlist separately

---

### TASK-B-12 — AI Career Suggestions (AI Module) 🔲
**Problem:** `ai` module folder is empty.  
**Goal:** Scaffold and implement a `POST /api/ai/suggest` endpoint that takes user's preferences + application history and uses Groq to suggest next steps.  
**Acceptance:** Returns structured career advice (e.g., skill gaps, job title fit, what to work on)

---

### TASK-B-13 — Resume PDF Generation 🔲
**Problem:** Users can build a resume in-app but can't download it as a PDF.  
**Goal:** Add `GET /api/resume/download` that generates a PDF from the `BuildResume` data.  
**Package:** `puppeteer` or `@react-pdf/renderer` approach via HTML → PDF  
**Acceptance:** Returns a PDF file download of the structured resume

---

### TASK-B-14 — Job Application Notes 🔲
**Problem:** Users can't add notes to a job application (interview prep, recruiter contact, etc.).  
**Goal:** Add a `notes` text field to `JobApplication` model. Add update endpoint to save notes.  
**Migration required:** Yes  
**Acceptance:** Notes saved and returned in `GET /api/application/get`
