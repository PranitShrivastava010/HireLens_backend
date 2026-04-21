# HireLens Backend — Task List

> Work on these tasks **in order**. Complete and test each one before moving to the next.  
> Status: 🔲 Not started | 🔄 In progress | ✅ Done

---

## Phase 1 — Stability & Correctness

### TASK-B-01 — Fix Refresh Token Error Handling 🔲
**Problem:** If refresh token is expired or already rotated, the endpoint crashes instead of returning a clean 401.  
**Goal:** Ensure all error cases in `refreshTokenService` return proper structured responses instead of throwing unhandled errors.  
**Files:** `src/modules/auth/services/refreshToken.service.ts`, `auth.controller.ts`  
**Acceptance:**
- `POST /auth/refresh` with expired/used token → `401 { success: false, message: "..." }`
- No unhandled promise rejection in logs

---

### TASK-B-02 — Add Input Validation with Zod 🔲
**Problem:** No request body validation on any endpoint. Any malformed input hits the service layer.  
**Goal:** Add Zod schemas for all auth and job routes. Validate in controller before calling service.  
**Files:** All controllers  
**Schemas to add:**
- `register` → email, name (min 2), password (min 8)
- `verify-otp` → email, otp (6 digits)
- `login` → email, password
- `job/fetch` → query (string), page (number, optional)
- `job/preference` → roleSlugs (array), skillSlugs (array)
- `application/apply` → jobId (uuid), statusKey (string), interviewDate (optional date)
**Acceptance:** Invalid body → `400 { success: false, errors: [...] }`

---

### TASK-B-03 — Seed Roles & Skills Master Data 🔲
**Problem:** `Role` and `Skill` tables are empty unless AI has extracted them from fetched jobs. Users can't set preferences without pre-seeded data.  
**Goal:** Create a seed file with ~20 common roles and ~40 common skills with proper slugs and aliases.  
**File:** `prisma/seedRolesSkills.ts` (new)  
**Roles to seed:** Backend Developer, Frontend Developer, Full Stack Developer, Node.js Developer, React Developer, DevOps Engineer, Data Engineer, ML Engineer, Mobile Developer, QA Engineer  
**Skills to seed:** Node.js, Express, React, TypeScript, PostgreSQL, MongoDB, Redis, Docker, Kubernetes, AWS, GCP, Python, Django, FastAPI, Next.js, GraphQL, REST API, Git, CI/CD, Linux, Java, Spring Boot, MySQL, Flutter, React Native  
**Acceptance:** Running seed creates all records; re-running is idempotent (upsert, no duplicates)

---

### TASK-B-04 — Add Dashboard Stats API 🔲
**Problem:** `dashboard` module is an empty folder. Frontend dashboard has no real data.  
**Goal:** Create a `GET /api/dashboard/stats` endpoint returning aggregated user stats.  
**Module:** `src/modules/dashboard/` (create from scratch)  
**Response shape:**
```json
{
  "totalApplications": 12,
  "byStatus": [
    { "key": "APPLIED", "label": "Applied", "count": 5 },
    { "key": "INTERVIEW", "label": "Interview", "count": 3 }
  ],
  "upcomingInterviews": [
    { "jobTitle": "...", "companyName": "...", "interviewDate": "..." }
  ],
  "recentApplications": [
    { "jobTitle": "...", "companyName": "...", "status": "...", "appliedAt": "..." }
  ]
}
```
**Acceptance:** Authenticated user gets correct aggregated data

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
