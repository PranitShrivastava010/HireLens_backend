# HireLens — Developer Setup Guide

## Prerequisites

| Tool | Version | Purpose |
|---|---|---|
| Node.js | v18+ | Runtime |
| npm | v9+ | Package manager |
| PostgreSQL | v14+ | Database |
| Git | any | Version control |

---

## Environment Variables

### Backend (`HireLens_backend/.env`)

```env
# ─── Database ───────────────────────────────────────────
DATABASE_URL="postgresql://postgres:<password>@localhost:5432/hirelens_db?schema=public"

# ─── App Mode ───────────────────────────────────────────
NODE_ENV=development

# ─── Email (OTP) ────────────────────────────────────────
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your@gmail.com
EMAIL_PASS=your_app_password     # Gmail App Password (not your real password)

# ─── JWT ────────────────────────────────────────────────
ACCESS_TOKEN_SECRET="your_access_secret"
REFRESH_TOKEN_SECRET="your_refresh_secret"

# ─── JSearch (RapidAPI) ─────────────────────────────────
RAPIDAPI_KEY=your_rapidapi_key
RAPIDAPI_HOST=jsearch.p.rapidapi.com

# ─── Groq AI ────────────────────────────────────────────
GROQ_API_KEY=your_groq_api_key

# ─── Supabase Storage ───────────────────────────────────
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_BUCKET=Resume

# ─── Upstash Redis ──────────────────────────────────────
UPSTASH_REDIS_REST_URL="https://your-redis.upstash.io"
UPSTASH_REDIS_REST_TOKEN="your_redis_token"
```

---

## Backend Setup

```bash
# 1. Install dependencies
cd HireLens_backend
npm install

# 2. Setup environment
cp .env.example .env    # then fill in your values

# 3. Create local PostgreSQL database
psql -U postgres -c "CREATE DATABASE hirelens_db;"

# 4. Run migrations
npx prisma migrate dev

# 5. Seed application statuses
npx ts-node prisma/seed.ts

# 6. Start dev server
npm run dev
# → http://localhost:3000
```

> **Note:** The dev server uses `ts-node-dev` with `--transpile-only` for fast restarts. The entry point is `index.local.ts` → `server.local.ts`.

---

## Frontend Setup

```bash
# 1. Install dependencies
cd HireLens_frontend
npm install

# 2. Create environment file
# Create src/services/apiBase.js and set the API base URL if not already set

# 3. Start dev server
npm run dev
# → http://localhost:5173
```

---

## External Services Setup

### 1. Gmail SMTP (OTP emails)
1. Enable 2FA on your Google Account
2. Go to: Google Account → Security → App passwords
3. Generate an app password
4. Use that as `EMAIL_PASS` in `.env`

### 2. JSearch API (RapidAPI)
1. Create account at [rapidapi.com](https://rapidapi.com)
2. Subscribe to the **JSearch** API (free tier available)
3. Copy your `X-RapidAPI-Key`

### 3. Groq API
1. Create account at [console.groq.com](https://console.groq.com)
2. Create an API key
3. Model used: `llama-3.1-8b-instant`

### 4. Upstash Redis
1. Create account at [upstash.com](https://upstash.com)
2. Create a new Redis database (select REST API)
3. Copy the REST URL and REST Token

### 5. Supabase Storage
1. Create account at [supabase.com](https://supabase.com)
2. Create a new project
3. Go to Storage → Create a bucket named `Resume` (set as public)
4. Copy the project URL and anon key

---

## Database Seeding

The `prisma/seed.ts` script seeds `ApplicationStatus` records:

```bash
npx ts-node prisma/seed.ts
```

Expected statuses after seeding:
- `WISHLIST` — Wishlist
- `APPLIED` — Applied
- `INTERVIEW` — Interview Scheduled
- `OFFER` — Offer Received
- `REJECTED` — Rejected
- `GHOSTED` — Ghosted

---

## Available Scripts

### Backend
| Command | Description |
|---|---|
| `npm run dev` | Start dev server with hot reload |
| `npm run build` | Run `prisma generate` |
| `npx prisma migrate dev` | Apply migrations |
| `npx prisma studio` | GUI DB browser |
| `npx ts-node prisma/seed.ts` | Seed database |

### Frontend
| Command | Description |
|---|---|
| `npm run dev` | Start Vite dev server |
| `npm run build` | Production build |
| `npm run preview` | Preview production build |

---

## Project File Entry Points

| File | Purpose |
|---|---|
| `HireLens_backend/index.local.ts` | Local dev entry point |
| `HireLens_backend/index.ts` | Production (Vercel serverless) entry |
| `HireLens_backend/src/app.ts` | Express app configuration |
| `HireLens_backend/src/routes.ts` | Master API router |
| `HireLens_frontend/src/main.jsx` | React app entry |
| `HireLens_frontend/src/routes/Routes.jsx` | Client-side routing |
| `HireLens_frontend/src/app/store.js` | Redux store |

---

## Deployment (Vercel)

The backend is configured for serverless deployment on Vercel via `vercel.json` + `serverless-http`.

```json
// vercel.json
{
  "version": 2,
  "builds": [{ "src": "index.ts", "use": "@vercel/node" }],
  "routes": [{ "src": "/(.*)", "dest": "/index.ts" }]
}
```

> **Important:** For production, switch `DATABASE_URL` to the Neon serverless PostgreSQL connection string.

---

## Common Issues

| Issue | Fix |
|---|---|
| `CORS error` | Add frontend origin to `allowedOrigins` in `src/app.ts` |
| `Refresh token invalid` | Clear cookies in browser devtools, log in again |
| `Jobs not showing` | Check if `hasCompletedPref` is true, call `/api/job/fetch` first |
| `Redis error` | Check Upstash credentials; app gracefully falls back without cache |
| `Groq timeout` | LLaMA 3 calls can be slow on free tier; retry logic may be needed |
| `Prisma migration error` | Run `npx prisma migrate reset` (⚠️ clears data) |
