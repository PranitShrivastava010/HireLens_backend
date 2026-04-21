# HireLens — Project Overview

## What is HireLens?

**HireLens** is an AI-powered job search and career management platform built for developers and tech professionals. It helps users find relevant jobs, manage their applications, build polished resumes, and measure their resume fitness against job descriptions — all in one place.

The core idea: instead of manually scrolling through generic job boards, HireLens **fetches real jobs**, **tags them with AI-extracted roles and skills**, and **ranks them by relevance** to the user's personal preferences. Users get a smart, personalized feed rather than a raw list.

---

## The Problem It Solves

| Pain Point | HireLens Solution |
|---|---|
| Job boards show irrelevant listings | Preference-based relevance scoring |
| No way to know if your resume matches a JD | AI-powered ATS score with keyword analysis |
| Tracking applications in spreadsheets | Built-in application tracker with status pipeline |
| No central place to build + test your resume | In-app resume builder + ATS check |
| Hard to understand what skills a job needs | AI keyword extraction per job |

---

## Project Structure

HireLens is split into two separate repositories / projects:

```
HireLens/
├── HireLens_backend/     → Node.js + Express + TypeScript REST API
└── HireLens_frontend/    → React + Redux Toolkit + Material UI SPA
```

---

## Core Features

### 1. 🔐 Authentication System
- Email + password registration with OTP verification via Gmail SMTP
- JWT-based access tokens (short-lived, 15 min)
- Refresh tokens (7-day) stored in HTTP-only cookies
- Refresh token rotation — old token invalidated after each use

### 2. 🎯 Job Preference Onboarding
- New users must set preferences before accessing jobs
- Users select **roles** (e.g., "Backend Developer") and **skills** (e.g., "Node.js", "React")
- Preferences stored as normalized DB relations (not raw strings)
- Drives the personalized job feed ranking algorithm

### 3. 📋 Smart Job Feed
- Jobs fetched from **JSearch API** (via RapidAPI) — real listings from LinkedIn, Indeed, Glassdoor
- On fetch: AI extracts roles & skills from job descriptions using **Groq (LLaMA 3)**
- Jobs are tagged in the DB with structured `JobRole` and `JobSkill` relations
- On query: jobs are **scored and ranked** per user based on:
  - Skill matches (+10 per match)
  - Role matches (+8 per match)
  - Alias matches in title/description (+3–5)
  - Recency bonus (≤3 days old: +2)
- Results cached in **Upstash Redis** (10-minute TTL)
- Cache invalidated when user updates preferences
- Supports pagination, search, location filter, and remote filter

### 4. 📁 Application Tracker
- Users can mark any job as applied with a status (e.g., `APPLIED`, `INTERVIEW`, `OFFER`, `REJECTED`)
- Status list seeded from `ApplicationStatus` table (extensible)
- Interview date can be optionally attached to a status
- Applications viewable in a stats dashboard

### 5. 📈 Stats Dashboard
- View all tracked applications grouped by status
- See interview dates, applied dates
- Set/update interview date via modal

### 6. 📿 AI Keyword Extraction per Job
- Any job can have its description analyzed via Groq
- Keywords extracted and scored by type: `ATOMIC`, `CATEGORY`, `CONCEPT`
- Stored in `JobKeyword` table, used later for ATS matching

### 7. 📄 Resume Builder (In-App)
- Users can build a structured resume inside the app
- Sections: Basics, Experience, Education, Skills, Projects, Certifications
- Each section is independently editable with full CRUD
- Experiences can be drag-reordered
- Resume preview generated server-side as structured JSON

### 8. 📊 ATS Score Calculator
- User uploads a PDF resume → text is extracted and stored in Supabase Storage
- For any job: compare resume text vs job keywords
- Two-phase matching:
  1. **Hard match** — deterministic keyword + alias matching
  2. **AI match** — Groq LLM refines matches and assigns final score
- Score, matched keywords, and missing keywords are stored in `AtsAnalysis`

---

## Tech Stack

### Backend
| Layer | Technology |
|---|---|
| Runtime | Node.js + TypeScript |
| Framework | Express.js v5 |
| ORM | Prisma v5 |
| Database | PostgreSQL (local dev / Neon in production) |
| AI | Groq API (LLaMA 3.1-8b-instant) |
| Job Data | JSearch API via RapidAPI |
| Cache | Upstash Redis |
| File Storage | Supabase Storage |
| Email | Nodemailer (Gmail SMTP) |
| Auth | JWT (jsonwebtoken) + bcrypt |
| Validation | Zod |
| NLP Utilities | `natural` library, `stopword` |
| PDF Parsing | `pdf-parse` |
| Deployment | Vercel (serverless via `serverless-http`) |

### Frontend
| Layer | Technology |
|---|---|
| Framework | React 18 (Vite) |
| State Management | Redux Toolkit + RTK Query |
| UI Library | Material UI (MUI v5) |
| Routing | React Router v6 |
| Animations | Framer Motion / Motion One |
| 3D / Visual | Three.js |
| HTTP | Axios (via RTK Query base) |

---

## Data Flow Overview

```
User sets Preferences (roles + skills)
        ↓
Trigger: POST /api/job/fetch  (fetches from JSearch API)
        ↓
For each job: Groq AI extracts roles + skills → stored as JobRole / JobSkill
        ↓
GET /api/job → scores + ranks jobs against user preferences
        ↓  
Results cached in Redis (10 min)
        ↓
User views job feed → applies to jobs → status tracked in JobApplication
        ↓
User uploads resume → PDF text extracted → stored in Supabase
        ↓
ATS Score: resume text vs job keywords → Groq refines → AtsAnalysis record saved
```

---

## Repository Layout

### Backend (`HireLens_backend/`)
```
src/
├── app.ts                   → Express app, CORS, cookie parser
├── routes.ts                → Master router (/api/*)
├── config/                  → groq, redis, multer, mail, jwt configs
├── constants/               → HTTP status codes, error/success messages
├── lib/                     → Prisma singleton
├── middlewares/             → auth middleware, error middleware
├── utils/                   → All shared utility functions
└── modules/
    ├── auth/                → Register, OTP verify, Login, Refresh token
    ├── jobs/                → Fetch, get, preferences, keywords
    ├── applications/        → Apply, get applications, update status
    ├── resume/              → Build resume, CRUD sections, ATS, upload
    ├── dashboard/           → (scaffolded, empty)
    └── ai/                  → (scaffolded, empty)
prisma/
├── schema.prisma            → Full DB schema with all models
└── seed.ts                  → ApplicationStatus seeder
```

### Frontend (`HireLens_frontend/`)
```
src/
├── app/store.js             → Redux store
├── routes/                  → Route definitions, AuthGate, ProtectedRoute
├── pages/                   → Page-level components (thin wrappers)
├── container/               → Smart components (data-fetching logic)
├── component/               → Pure UI components
│   ├── common/              → Shared UI (AI button, cards, search)
│   ├── home/                → Landing page sections
│   ├── job/                 → Job card, list, details, preferences
│   ├── resume builder/      → Resume sections UI
│   ├── stats/               → Application stats components
│   └── layout/              → Sidebar, Navbar
├── features/                → RTK Query API slices
│   ├── auth/                → authSlice + authApi
│   ├── job/                 → jobApi
│   ├── application/         → applicationApi
│   └── resume/              → resumeApi
└── services/                → Axios base config + RTK setup
```

---

## Current Development Status

| Module | Backend | Frontend |
|---|---|---|
| Auth (Register/Login/OTP) | ✅ Complete | ✅ Complete |
| Job Preferences | ✅ Complete | ✅ Complete |
| Job Feed (fetch + rank) | ✅ Complete | ✅ Complete |
| Job Details | ✅ Complete | ✅ Complete |
| Application Tracker | ✅ Complete | ✅ Complete |
| Stats Dashboard | ✅ Complete | ✅ Complete |
| Keyword Extraction | ✅ Complete | 🔲 Not wired to UI |
| Resume Builder | ✅ Complete | ✅ Complete |
| ATS Score Calculator | ✅ Complete | 🔲 Partially wired |
| Resume PDF Upload | ✅ Complete | 🔲 Needs UI |
| Dashboard Module | 🔲 Empty | 🔲 Scaffold only |
| AI Module | 🔲 Empty | — |

---

## Key Design Decisions

1. **Preference-first UX** — Users cannot access the job feed without setting preferences (`hasCompletedPref` flag on User). This ensures the ranking algorithm always has data to work with.

2. **Roles + Skills as normalized entities** — Rather than storing raw strings, roles and skills are deduplicated via a `resolveRole` / `resolveSkill` util that creates entries with slug-based deduplication and alias tracking.

3. **Redis cache keyed by user preferences** — Cache key includes a hash of the user's skill/role IDs so different users get different cache entries. Cache is busted on preference update.

4. **Refresh token rotation** — On each refresh, the old token is deleted and a new one is issued. This prevents token reuse attacks.

5. **Groq over OpenAI** — Groq with LLaMA 3 is used for all AI tasks because it's fast (low latency) and free-tier friendly, which is important during development.

6. **Supabase for file storage** — Resume PDFs are stored in Supabase Storage to avoid bloating the relational DB with binary data.
