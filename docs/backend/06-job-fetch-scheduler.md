# HireLens - Job Fetch Scheduler Design

## Purpose

This document defines the recommended production-safe design for automated job fetching in HireLens.

The main goal is:

- keep the job feed fresh without any frontend trigger
- support broad job families like HR, Product, Engineering, Data, Design, Sales, and Marketing
- avoid slow "fetch every role and every skill" runs
- work safely on Vercel serverless deployment using an external scheduler

This document is the design reference for TASK-B-05.

---

## Why We Should Not Use `node-cron` in Production

HireLens is deployed on Vercel, and Vercel runs the backend as serverless functions.

That means:

- the app is not an always-on Node.js process
- in-process schedulers like `node-cron` are not reliable in production
- cron execution should be triggered by an external scheduler, not by server startup

So the production model should be:

```text
GitHub Actions schedule
  -> GET /api/cron/fetch-jobs
  -> shared fetch runner
  -> DB + logs + scheduling updates
```

For this project, GitHub Actions is the recommended scheduler because:

- it is free for this showcase use case
- it supports scheduled workflows and manual runs
- it avoids the shorter timeout behavior that caused issues with `cron-job.org`
- it works well with Vercel-hosted HTTP cron endpoints

For local development, the same route can be triggered manually with Postman or `curl`.

---

## Core Design Principles

### 1. Fetch by canonical job targets, not by every skill

We should not fetch external jobs for every `Role` or every `Skill`.

Bad examples:

- `Node`
- `React`
- `TypeScript`
- `Excel`
- `Communication`

These are mostly skill tags, not clean job-board search targets.

Good examples:

- `Backend Developer`
- `Frontend Developer`
- `Full Stack Developer`
- `Product Manager`
- `Project Manager`
- `HR Recruiter`
- `Talent Acquisition`
- `Data Analyst`
- `Data Scientist`
- `DevOps Engineer`

Skills should be used for:

- AI tagging
- feed ranking
- user preference matching

Skills should not be the scheduler's source of truth.

### 2. Use a curated fetch-target table

The scheduler should read from a dedicated `JobFetchTarget` table instead of directly using `Role` or `Skill`.

Why:

- the `Role` table may grow too large after AI extraction
- aliases like `PM` are ambiguous
- one fetch target may map to multiple roles
- scheduling metadata should not live on `Role`

### 3. Process in batches

Each cron run should handle only a small batch of due targets.

Example:

- cron trigger: every hour
- target batch size: 5
- target refresh frequency: every 6 hours

This means the cron can run hourly, but each individual target is only refreshed when it is due.

### 4. Make fetch runs idempotent

Job ingestion must be safe to repeat.

This is already supported by `providerJobId` upsert logic in the jobs fetch service.

### 5. Protect against overlap

If a previous cron run is still in progress, the next one should exit safely instead of starting a second overlapping run.

This requires a distributed lock in Redis or the database.

### 6. Keep heavy AI work bounded

If role/skill extraction becomes too heavy for a single serverless run, split it into a second batch process.

Recommended split:

- fetch cron: fetch + upsert jobs
- enrich cron: process new jobs missing role/skill mappings

---

## High-Level Flow

```text
GitHub Actions scheduled workflow fires
  -> calls GET /api/cron/fetch-jobs
  -> route acquires global lock
  -> create JobFetchRun record
  -> select due JobFetchTarget rows
  -> process targets in small concurrent batches
  -> fetch from JSearch
  -> upsert jobs
  -> optionally enrich new jobs with AI roles/skills
  -> update target timestamps and counters
  -> mark JobFetchRun complete
  -> release lock
```

---

## Proposed Tables

### `JobFetchTarget`

This table stores the scheduler's source of truth.

Suggested fields:

| Field | Type | Purpose |
|---|---|---|
| `id` | `String` | Primary key |
| `name` | `String` | Human-readable target name |
| `query` | `String` | External search query, unique |
| `category` | enum | Engineering, Product, HR, etc. |
| `isActive` | `Boolean` | Whether cron can fetch this target |
| `priority` | `Int` | Manual weighting |
| `demandScore` | `Int` | Boost based on user preference demand |
| `refreshEveryMinutes` | `Int` | Target-specific refresh interval |
| `lastFetchedAt` | `DateTime?` | Last attempted run |
| `nextRunAt` | `DateTime?` | Next due time |
| `lastSuccessAt` | `DateTime?` | Last successful run |
| `lastFailureAt` | `DateTime?` | Last failed run |
| `failureCount` | `Int` | Backoff tracking |
| `cooldownUntil` | `DateTime?` | Prevent repeated failures |

### `JobFetchTargetRole`

Maps a fetch target to one or more normalized roles.

Examples:

- `Product Manager` target -> `Product Manager` role
- `HR Recruiter` target -> `Recruiter`, `Talent Acquisition`, `HR Generalist`
- `Full Stack Developer` target -> `Full Stack Developer`, `Software Engineer`

### `JobFetchRun`

Stores one scheduler execution.

Suggested fields:

| Field | Type | Purpose |
|---|---|---|
| `id` | `String` | Run ID for logs and tracing |
| `status` | enum | `RUNNING`, `SUCCESS`, `PARTIAL`, `FAILED`, `SKIPPED` |
| `triggerType` | enum | `CRON` or `MANUAL` |
| `startedAt` | `DateTime` | Run start time |
| `endedAt` | `DateTime?` | Run end time |
| `durationMs` | `Int?` | Total runtime |
| `targetsPlanned` | `Int` | Selected target count |
| `targetsProcessed` | `Int` | Finished target count |
| `jobsFetched` | `Int` | External jobs returned |
| `jobsCreated` | `Int` | New DB rows |
| `jobsUpdated` | `Int` | Existing DB rows refreshed |
| `jobsFailed` | `Int` | Per-job failures if tracked |
| `errorMessage` | `String?` | Top-level run error |

### `JobFetchRunItem`

Stores one target inside one run.

Suggested fields:

| Field | Type | Purpose |
|---|---|---|
| `id` | `String` | Item ID |
| `runId` | `String` | Parent run |
| `targetId` | `String` | Related fetch target |
| `query` | `String` | Query executed |
| `status` | enum | `RUNNING`, `SUCCESS`, `FAILED`, `SKIPPED` |
| `startedAt` | `DateTime` | Start time |
| `endedAt` | `DateTime?` | End time |
| `durationMs` | `Int?` | Runtime for this target |
| `jobsFetched` | `Int` | Jobs returned by API |
| `jobsCreated` | `Int` | Newly inserted jobs |
| `jobsUpdated` | `Int` | Upserted existing jobs |
| `jobsFailed` | `Int` | Failures inside this item |
| `errorMessage` | `String?` | Per-target error |

---

## Recommended Target Categories

The initial seed should contain a small, curated set of broad target queries.

Suggested examples:

### Engineering

- `Backend Developer`
- `Frontend Developer`
- `Full Stack Developer`
- `Software Engineer`
- `DevOps Engineer`
- `QA Engineer`

### Product and Project

- `Product Manager`
- `Project Manager`
- `Program Manager`
- `Business Analyst`

### HR and Recruiting

- `HR Recruiter`
- `Talent Acquisition`
- `HR Generalist`

### Data

- `Data Analyst`
- `Data Scientist`
- `Data Engineer`

### Design

- `UI UX Designer`
- `Product Designer`

### Business Functions

- `Sales Executive`
- `Marketing Manager`
- `Operations Analyst`
- `Finance Analyst`

Important:

- `PM` should never be a direct fetch query because it is ambiguous
- `HR` should not be the only query because it is too broad
- skills like `React`, `Node.js`, `Excel`, and `Figma` should not be scheduler targets

---

## Scheduler Frequency

The recommended production schedule is:

- GitHub Actions scheduled workflow: every hour
- target refresh interval: usually every 6 hours

This does not mean every target runs every hour.

Example:

- 30 active targets
- 5 targets selected per cron run
- cron runs every hour

Hour 1:

- fetch 5 due targets

Hour 2:

- fetch next 5 due targets

After roughly 6 hours:

- the full target set has been refreshed

This keeps each serverless run small and reduces timeout risk.

---

## Example Timeline

The most important thing to understand is:

- the cron can run every hour
- a specific target does not run every hour unless it is due

Example assumptions:

- cron trigger runs every hour
- `refreshEveryMinutes = 360` for `Backend Developer`
- `Backend Developer` is fetched successfully at `1:00 PM`

What happens:

1. At `1:00 PM`, the fetch cron runs.
2. `Backend Developer` is due, so it is selected.
3. JSearch is called for `Backend Developer`.
4. New jobs are inserted into `Jobs`.
5. Existing jobs are updated by `providerJobId` upsert logic.
6. Those jobs are queued for enrichment.
7. `Backend Developer.nextRunAt` becomes `7:00 PM`.

Now the cron keeps running every hour:

- `2:00 PM` -> cron runs, but `Backend Developer` is not due yet
- `3:00 PM` -> cron runs, but `Backend Developer` is not due yet
- `4:00 PM` -> cron runs, but `Backend Developer` is not due yet
- `5:00 PM` -> cron runs, but `Backend Developer` is not due yet
- `6:00 PM` -> cron runs, but `Backend Developer` is not due yet
- `7:00 PM` -> cron runs, and `Backend Developer` becomes due again

So the correct mental model is:

- cron frequency = how often the scheduler wakes up
- target refresh frequency = how often a specific query should actually be fetched

This means:

- the scheduler may run every hour
- `Backend Developer` may run every 6 hours
- `Frontend Developer` may run on a different hour
- `Product Manager` may run on a different hour

The scheduler is always asking:

```text
Which targets are due right now?
```

It is not asking:

```text
The cron is running again, so should I fetch every target again?
```

---

## Due-Target Selection Logic

Each cron run should pick only targets that are both active and due.

Selection rules:

1. `isActive = true`
2. `nextRunAt` is null or less than the current time
3. `cooldownUntil` is null or already expired
4. sort by:
   - highest `priority`
   - highest `demandScore`
   - oldest `lastFetchedAt`
5. take a small batch such as 3 to 5 targets

Pseudo-logic:

```ts
const now = new Date();

const dueTargets = await prisma.jobFetchTarget.findMany({
  where: {
    isActive: true,
    OR: [
      { nextRunAt: null },
      { nextRunAt: { lte: now } },
    ],
    AND: [
      {
        OR: [
          { cooldownUntil: null },
          { cooldownUntil: { lte: now } },
        ],
      },
    ],
  },
  orderBy: [
    { priority: "desc" },
    { demandScore: "desc" },
    { lastFetchedAt: "asc" },
  ],
  take: 5,
});
```

---

## Demand Scoring

Targets should be refreshed more often if users actually care about them.

Recommended demand source:

- count how many users selected roles linked to the target

Examples:

- many users prefer `Product Manager` -> higher `demandScore`
- few users prefer `Finance Analyst` -> lower `demandScore`

This lets the cron spend more time on high-demand categories without manually tuning everything.

Demand score can be recomputed:

- whenever user preferences change
- or as a separate daily maintenance task

---

## Per-Target Processing Flow

For each selected target:

1. create a `JobFetchRunItem`
2. execute the search query against JSearch
3. upsert jobs into `Jobs`
4. count created vs updated rows
5. enrich new or incomplete jobs with roles and skills
6. mark the run item `SUCCESS` or `FAILED`
7. update scheduler timestamps on the target

On success:

- set `lastFetchedAt`
- set `lastSuccessAt`
- reset `failureCount` to `0`
- clear `cooldownUntil`
- set `nextRunAt = now + refreshEveryMinutes`

On failure:

- set `lastFetchedAt`
- set `lastFailureAt`
- increment `failureCount`
- set a cooldown/backoff window
- do not crash the whole cron run

---

## Recommended Production Split

For Vercel deployment, the safest production shape is a two-step pipeline instead of one oversized cron run.

### Fetch cron

Responsibilities:

- select due `JobFetchTarget` rows
- call JSearch
- upsert into `Jobs`
- record created vs updated counts
- flag newly created or incomplete jobs for enrichment

This job should stay focused on ingestion speed and scheduling accuracy.

### Enrich cron

Responsibilities:

- find jobs that are missing `JobRole` or `JobSkill` mappings
- run AI role/skill extraction only for that smaller backlog
- save normalized roles and skills
- mark enrichment complete

This keeps expensive AI work separate from external fetching and reduces the chance of a single serverless request doing too much.

### Why this split is recommended

- fetches stay fast and predictable
- AI enrichment can be retried independently
- failures in Groq extraction do not block job ingestion
- runtime is easier to control on Vercel
- each cron has a single responsibility

If needed, HireLens can start with a single cron and move to this split later, but the two-cron design is the recommended production target.

---

## Failure Handling and Backoff

The scheduler should fail gracefully.

If one target fails:

- log the error
- mark the target item as failed
- continue the rest of the batch

Suggested backoff policy:

- first failure: 30 minutes
- second failure: 60 minutes
- third failure: 180 minutes
- cap at 360 minutes

This avoids repeatedly hammering the same broken external query.

---

## Logging Strategy

### Runtime logs

Each cron run should log:

- `runId`
- `startedAt`
- `endedAt`
- `durationMs`
- `targetsPlanned`
- `targetsProcessed`
- `jobsFetched`
- `jobsCreated`
- `jobsUpdated`
- `jobsFailed`
- `status`

Each target item should log:

- `runId`
- `targetId`
- `query`
- `startedAt`
- `endedAt`
- `durationMs`
- `jobsFetched`
- `jobsCreated`
- `jobsUpdated`
- `status`
- `errorMessage`

### Persistent logs

`JobFetchRun` and `JobFetchRunItem` should be saved in the database so cron history is available even after Vercel runtime logs expire.

---

## Locking Strategy

Because Vercel can trigger a new request while an older job is still running, the scheduler needs a global lock.

Preferred lock source:

- Upstash Redis

Possible lock key:

```text
cron:job-fetch:lock
```

Behavior:

- if lock exists, log a skipped run and return success
- if lock does not exist, create it with a short expiry
- release it when the run completes

This prevents overlapping work and duplicate API pressure.

---

## Recommended Vercel Route Design

Production route:

```text
GET /api/cron/fetch-jobs
```

Responsibilities:

- verify the request is allowed
- acquire the lock
- call the shared runner
- return a structured summary

The actual scheduler logic should live in a normal service so it can be reused for:

- GitHub Actions scheduled workflow
- local manual testing
- admin-triggered manual runs

---

## Recommended Production Scheduler

HireLens should use GitHub Actions as the scheduler for production.

### Why GitHub Actions is the recommended scheduler

- GitHub Actions can call the deployed Vercel backend over HTTP
- scheduled workflows support both automatic runs and manual `Run workflow` testing
- the workflow timeout is much more suitable for fetch and enrich work than `cron-job.org`
- it keeps Vercel focused on serving the backend while GitHub handles scheduling

### Workflow files

Current production scheduler files:

- `.github/workflows/fetch-cron.yml`
- `.github/workflows/enrich-cron.yml`

### GitHub Actions schedules

- fetch workflow: `0 * * * *`
- enrich workflow: `20 * * * *`

These cron expressions run in `UTC`.

### Required GitHub Actions configuration

In the GitHub repository:

- add repository variable `CRON_BASE_URL`
- add repository secret `CRON_SECRET`

Recommended values:

- `CRON_BASE_URL=https://your-backend.vercel.app`
- `CRON_SECRET=<same value as backend CRON_SECRET on Vercel>`

### Manual testing

Because both workflows also include `workflow_dispatch`, they can be tested manually from the GitHub Actions tab before relying on the schedule.

---

## Local Development Workflow

Local development should use the same worker logic as production.

Recommended approach:

1. run the backend normally
2. manually call `GET /api/cron/fetch-jobs`
3. inspect logs and database records

This avoids having separate local-only scheduling logic that behaves differently from production.

---

## Relationship to Existing HireLens Logic

This design fits the current codebase:

- external fetch and upsert already exist in `src/modules/jobs/services/fetchJobs.service.ts`
- feed ranking already uses user preferences in `src/modules/jobs/services/getJobs.service.ts`
- roles and skills already exist for matching and personalization

What changes:

- scheduling should no longer rely on the frontend calling `/api/job/fetch`
- scheduler source should be `JobFetchTarget`, not raw roles or skills
- production triggering should be GitHub Actions scheduled workflows, not `node-cron`

---

## Final Recommendation

Implement TASK-B-05 using this architecture:

1. add `JobFetchTarget`, `JobFetchRun`, and `JobFetchRunItem`
2. seed broad canonical fetch targets
3. expose `GET /api/cron/fetch-jobs`
4. schedule it hourly with GitHub Actions
5. process only a small batch of due targets per run
6. add a second enrichment cron for jobs missing role or skill mappings
7. use role/skill extraction for enrichment and ranking, not as direct scheduler targets
8. add Redis locking and persistent run logs

This gives HireLens a scalable, Vercel-safe, and category-aware job ingestion pipeline.
