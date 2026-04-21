# HireLens — Architecture & System Design

## System Architecture Diagram

```
┌───────────────────────────────────────────────────────┐
│                   CLIENT (Browser)                    │
│         React + Redux Toolkit + MUI + Vite            │
│                  localhost:5173                        │
└───────────────────┬───────────────────────────────────┘
                    │  HTTP (REST + JSON)
                    │  Cookies (refreshToken)
                    │
┌───────────────────▼───────────────────────────────────┐
│                  BACKEND API                          │
│           Express.js + TypeScript + Prisma            │
│                  localhost:3000                        │
│                                                       │
│  /api/auth        → Auth module                       │
│  /api/job         → Jobs module                       │
│  /api/application → Applications module               │
│  /api/resume      → Resume module                     │
└───┬───────┬─────────┬───────────┬────────────────────┘
    │       │         │           │
    │       │         │           │
    ▼       ▼         ▼           ▼
 Postgres  Redis   Supabase    Groq AI
 (DB)    (Cache)  (Storage)   (LLaMA 3)
    │
    └── JSearch API (RapidAPI)
        [External job data source]
```

---

## Backend Architecture

### Pattern: Modular Controller-Service

Each feature lives in its own module under `src/modules/`:

```
module/
├── <module>.controller.ts   → HTTP layer: parse req, call service, send res
├── <module>.routes.ts       → Route definitions + middleware attachment
└── services/
    └── <action>.service.ts  → Business logic, DB queries, external calls
```

**No class-based architecture** — everything is plain functions/exports.  
**No dependency injection** — services import `prisma`, `redis`, `groq` directly from config singletons.

---

### Request Lifecycle

```
Incoming Request
    ↓
Express Router (src/routes.ts → /api/*)
    ↓
Module Router (e.g., jobs.routes.ts)
    ↓
authMiddleware (verifies JWT Bearer token → attaches req.user)
    ↓
Controller (parse body/params, validate, call service)
    ↓
Service (business logic + DB/AI/cache calls)
    ↓
Response JSON
```

---

### Auth Middleware

Located at `src/middlewares/auth.middleware.ts`.

- Reads `Authorization: Bearer <token>` header
- Verifies access token with `ACCESS_TOKEN_SECRET`
- If valid: attaches `req.user = { userId, email }` and calls `next()`
- If invalid/expired: returns `401 Unauthorized`

**Refresh flow** (handled client-side):
1. Access token expires → RTK Query baseQuery catches 401
2. Frontend calls `POST /api/auth/refresh` with `refreshToken` cookie
3. Server validates refresh token, rotates it (delete old, create new)
4. New access token returned → retry original request

---

### Configuration Singletons (`src/config/`)

| File | Purpose |
|---|---|
| `groq.ts` | Groq SDK instance with API key |
| `redis.ts` | Upstash Redis REST client |
| `mail.ts` | Nodemailer transporter (Gmail SMTP) |
| `multer.ts` | Multer storage config for resume PDF uploads |
| `jwtConfig.ts` | JWT secret + expiry constants |

---

## Database Architecture (Prisma / PostgreSQL)

### Entity Relationship Summary

```
User ──────────── UserToken (refresh tokens)
  │
  ├──────────────  UserRolePreference ──── Role ──── RoleAlias
  │
  ├──────────────  UserSkillPreference ─── Skill ─── SkillAlias
  │
  ├──────────────  JobApplication ──────── Jobs ──── JobRole ──── Role
  │                                          │
  ├──────────────  Resume (uploaded PDF)     ├────── JobSkill ─── Skill
  │                                          │
  ├──────────────  AtsAnalysis ─────────────┤
  │                                          └────── JobKeyword
  └──────────────  BuildResume
                    ├── ResumeBasics
                    ├── ResumeExperience[]
                    ├── ResumeEducation[]
                    ├── ResumeSkill[]
                    ├── ResumeProject[]
                    └── ResumeCertification[]
```

### Key Models

| Model | Description |
|---|---|
| `User` | Core user account with auth fields |
| `Otp` | Temp OTP records for email verification |
| `UserToken` | Stored refresh tokens (enables rotation) |
| `Jobs` | Scraped job listings from JSearch |
| `Role` / `RoleAlias` | Normalized job roles with aliases |
| `Skill` / `SkillAlias` | Normalized tech skills with aliases |
| `JobRole` / `JobSkill` | Many-to-many: jobs ↔ roles/skills |
| `UserRolePreference` / `UserSkillPreference` | User's selected preferences |
| `JobKeyword` | AI-extracted keywords per job (typed + scored) |
| `JobApplication` | User's job tracking record |
| `ApplicationStatus` | Seeded status types (APPLIED, INTERVIEW, etc.) |
| `Resume` | Uploaded PDF resume with extracted text |
| `AtsAnalysis` | ATS scoring results per resume+job pair |
| `BuildResume` + sections | In-app structured resume |

---

## AI Architecture

### Groq Integration (LLaMA 3.1-8b-instant)

Used in three places:

#### 1. Role & Skill Extraction (`roleSkill.service.ts`)
- **When**: After a job is fetched from JSearch
- **Input**: Job title + description
- **Prompt**: Extract up to 5 roles and 12 skills as JSON
- **Output**: Roles/skills resolved via `resolveRole` / `resolveSkill` and saved to DB

#### 2. Keyword Extraction (`fetchJobsKeywords.service.ts`)
- **When**: On-demand per job (POST `/api/job/:jobId/keywords`)
- **Input**: Full job description
- **Output**: Keywords typed as ATOMIC/CATEGORY/CONCEPT with relevance scores
- **Stored in**: `JobKeyword` table

#### 3. ATS Score Refinement (`atsScoreCalculate.service.ts`)
- **When**: User requests ATS check for a job
- **Phase 1**: Hard match keywords against resume text
- **Phase 2**: Groq AI refines — confirms/rejects matches, fills missed ones
- **Output**: Final score (0–100), matched/missing keyword lists

### Skill/Role Resolution (`resolveSkill.ts`, `resolveRole.ts`)

```
AI returns raw string (e.g., "Node.js", "NodeJS", "node")
    ↓
Normalize to slug ("nodejs")
    ↓
Check DB: does Skill with this slug exist?
    ↓ Yes → return it
    ↓ No → create Skill record
    ↓
Check DB: is there a SkillAlias for this raw string?
    ↓ Yes → return the parent Skill
    ↓ No → create SkillAlias linking raw string → Skill
```

This deduplication ensures "Node.js", "NodeJS", and "node" all map to the same `Skill` entity.

---

## Frontend Architecture

### Pattern: Container/Component Separation

```
Page (thin, just renders a Container)
    ↓
Container (smart — data fetching, state, handlers)
    ↓
Component (dumb — pure UI, receives props)
```

### State Management

- **Global auth state**: Redux Toolkit slice (`authSlice`)
  - Stores `user` object and `accessToken` in memory
  - No localStorage persistence (tokens live in memory + cookie)
- **Server state**: RTK Query API slices
  - `authApi` — register, verify, login, refresh
  - `jobApi` — fetch jobs, get jobs, preferences, keywords
  - `applicationApi` — apply, get applications, update status
  - `resumeApi` — all resume CRUD + ATS score

### Token Handling

```
Login → accessToken stored in Redux (memory)
      → refreshToken stored in HTTP-only cookie (automatic)

Expired access token (401) → RTK baseQuery calls /auth/refresh
                           → Gets new accessToken + rotated refreshToken
                           → Retries original request
```

### Route Guards

| Guard Component | Purpose |
|---|---|
| `ProtectedRoute` | Redirect to `/login` if no user |
| `AuthRedirect` | Redirect logged-in users away from `/login` |
| `AuthGate` | Runs token refresh on app load |
| `RequireJobPreferences` | Redirect to `/job-preferences` if `hasCompletedPref === false` |
| `AppLayout` | Wraps all protected pages with Sidebar |

---

## External Services

| Service | Usage | Key |
|---|---|---|
| **JSearch (RapidAPI)** | Fetch real job listings | `RAPIDAPI_KEY` |
| **Groq API** | AI role/skill/keyword/ATS extraction | `GROQ_API_KEY` |
| **Upstash Redis** | Job feed caching (REST-based) | `UPSTASH_REDIS_REST_URL/TOKEN` |
| **Supabase Storage** | Resume PDF file storage | `SUPABASE_URL/ANON_KEY` |
| **Gmail SMTP** | OTP email delivery | `EMAIL_USER/PASS` |
| **Neon** | Serverless PostgreSQL (production) | `DATABASE_URL` |

---

## Caching Strategy

### Job Feed Cache (Redis)

- **Key format**: `job:feed:{userId}:{prefHash}:page:{n}:limit:{n}:search:{s}:location:{l}:remote:{r}`
- **TTL**: 600 seconds (10 minutes)
- **Invalidated**: When user updates preferences (all `job:feed:{userId}:*` keys deleted via SCAN)
- **prefHash**: `skillIds.sort().join(',') + '|' + roleIds.sort().join(',')`
  - Ensures different preference sets get different cache entries
  - Same person, same preferences = cache hit regardless of order

### No other caching currently
- Auth tokens: stateless (JWT) + DB-stored refresh tokens
- Resume data: always fetched live from DB
