# HireLens — Database Schema Reference

Database: **PostgreSQL**  
ORM: **Prisma v5**  
Schema file: `prisma/schema.prisma`

---

## Models

---

### `User`
Core user account.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key |
| `email` | String | Unique |
| `name` | String | Display name |
| `password` | String | Bcrypt hashed |
| `isVerified` | Boolean | `false` until OTP verified |
| `hasCompletedPref` | Boolean | `false` until preferences set |
| `createdAt` | DateTime | Auto |

**Relations:** `UserToken[]`, `UserRolePreference[]`, `UserSkillPreference[]`, `Resume[]`, `AtsAnalysis[]`, `JobApplication[]`

---

### `Otp`
Short-lived OTP records for email verification.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key |
| `email` | String | Indexed |
| `otp` | String | 6-digit code |
| `expiresAt` | DateTime | TTL check done in app code |
| `createdAt` | DateTime | Auto |

---

### `UserToken`
Stored refresh tokens (enables rotation and revocation).

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key |
| `userId` | String | FK → User |
| `refreshToken` | String | Unique, hashed or raw |
| `expiresAt` | DateTime | 7-day expiry |
| `createdAt` | DateTime | Auto |

---

### `Jobs`
Scraped job listings from JSearch API.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key |
| `providerJobId` | String | Unique — JSearch's job ID |
| `providerName` | String | Publisher (LinkedIn, Indeed...) |
| `title` | String | Indexed |
| `description` | String | Full text |
| `employmentType` | String | FULLTIME, PARTTIME, etc. |
| `isRemote` | Boolean | Indexed |
| `companyName` | String | Indexed |
| `companyLogo` | String? | URL |
| `companyWebsite` | String? | URL |
| `location` | String | Indexed |
| `city` | String? | |
| `state` | String? | |
| `country` | String? | |
| `applyUrl` | String | External application link |
| `minSalary` | Int? | Indexed |
| `maxSalary` | Int? | Indexed |
| `salaryPeriod` | SalaryPeriod? | HOUR / MONTH / YEAR |
| `minExperienceYears` | Int? | Indexed, extracted from description |
| `maxExperienceYears` | Int? | Indexed |
| `experienceRaw` | String[] | Raw matched strings |
| `qualifications` | String[] | Extracted from description |
| `responsibilities` | String[] | From JSearch highlights |
| `postedAt` | String? | Human-readable date |
| `postedAtUtc` | DateTime? | Indexed for freshness sorting |
| `applyStatus` | Boolean | Default false |
| `lastFetchedAt` | DateTime | Indexed — used for 30-day filter |
| `createdAt` | DateTime | Auto |

---

### `Role`
Normalized job role entity.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key |
| `name` | String | Unique, e.g. "Backend Developer" |
| `slug` | String | Unique, e.g. "backend-developer" |
| `createdAt` | DateTime | Auto |

---

### `RoleAlias`
Aliases for the same role (e.g., "Node Dev", "NodeJS Developer" → "Backend Developer").

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key |
| `roleId` | String | FK → Role |
| `alias` | String | Unique, indexed |

---

### `Skill`
Normalized technical skill entity.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key |
| `name` | String | Unique, e.g. "Node.js" |
| `slug` | String | Unique, e.g. "nodejs" |
| `createdAt` | DateTime | Auto |

---

### `SkillAlias`
Aliases for the same skill (e.g., "NodeJS", "node", "Node.js" → same skill).

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key |
| `skillId` | String | FK → Skill |
| `alias` | String | Unique, indexed |

---

### `JobRole`
Many-to-many join: Jobs ↔ Roles (AI-extracted).

| Column | Type | Notes |
|---|---|---|
| `jobId` | String | Part of composite PK |
| `roleId` | String | Part of composite PK |

---

### `JobSkill`
Many-to-many join: Jobs ↔ Skills (AI-extracted).

| Column | Type | Notes |
|---|---|---|
| `jobId` | String | Part of composite PK |
| `skillId` | String | Part of composite PK |

---

### `UserRolePreference`
User's preferred job roles.

| Column | Type | Notes |
|---|---|---|
| `userId` | String | Part of composite PK |
| `roleId` | String | Part of composite PK |

---

### `UserSkillPreference`
User's preferred skills.

| Column | Type | Notes |
|---|---|---|
| `userId` | String | Part of composite PK |
| `skillId` | String | Part of composite PK |

---

### `ApplicationStatus`
Seeded lookup table for application status types.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key |
| `key` | String | Unique, e.g. "APPLIED", "INTERVIEW" |
| `label` | String | Display name |
| `sortOrder` | Int | For UI ordering |
| `allowsDate` | Boolean | Whether this status can have a date |

Typical seeded values:
```
WISHLIST     → Wishlist
APPLIED      → Applied
INTERVIEW    → Interview Scheduled
OFFER        → Offer Received
REJECTED     → Rejected
GHOSTED      → Ghosted
```

---

### `JobApplication`
Tracks a user's interaction with a job.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key |
| `userId` | String | FK → User |
| `jobId` | String | FK → Jobs |
| `statusId` | String | FK → ApplicationStatus, indexed |
| `interviewDate` | DateTime? | Optional interview date |
| `appliedAt` | DateTime | Default now |
| `createdAt` | DateTime | Auto |
| `updatedAt` | DateTime | Auto-updated |

**Unique constraint**: `(userId, jobId)` — one application per user per job.

---

### `JobKeyword`
AI-extracted keywords per job, used for ATS matching.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key |
| `jobId` | String | FK → Jobs, indexed |
| `keyword` | String | Indexed |
| `score` | Float | Relevance score (0.0–1.0) |
| `type` | KeywordType | ATOMIC / CATEGORY / CONCEPT |
| `aliases` | String[] | Alternative forms |
| `createdAt` | DateTime | Auto |

**KeywordType enum:**
- `ATOMIC` — specific tech (e.g., "Node.js")
- `CATEGORY` — broader area (e.g., "Backend Development")
- `CONCEPT` — soft/process concept (e.g., "REST API design")

---

### `Resume`
Uploaded PDF resume with extracted text.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key |
| `userId` | String | FK → User, indexed |
| `filePath` | String | Supabase Storage path |
| `extractedText` | String | Full PDF text, used for ATS |
| `createdAt` | DateTime | Auto |

---

### `AtsAnalysis`
ATS scoring result for a resume+job pair.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key |
| `userId` | String | FK → User, indexed |
| `jobId` | String? | FK → Jobs (nullable), indexed |
| `resumeId` | String | FK → Resume |
| `score` | Float | Final ATS score (0–100) |
| `matchedCount` | Int | Number of matched keywords |
| `missingCount` | Int | Number of missing keywords |
| `matchedKeywords` | String[] | List of matched keyword strings |
| `missingKeywords` | String[] | List of missing keyword strings |
| `createdAt` | DateTime | Auto |

---

### `BuildResume`
The in-app resume builder root document. One per user.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key |
| `userId` | String | Unique FK → User |
| `title` | String? | Resume document title |
| `createdAt` | DateTime | Auto |
| `updatedAt` | DateTime | Auto |

---

### `ResumeBasics`
Personal/contact info section. One per `BuildResume`.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key |
| `resumeId` | String | Unique FK → BuildResume |
| `fullName` | String | |
| `headline` | String? | e.g. "Full Stack Developer" |
| `summary` | String? | Brief bio |
| `email` | String? | |
| `phone` | String? | |
| `location` | String? | |
| `linkedin` | String? | URL |
| `github` | String? | URL |

---

### `ResumeExperience`
Work experience entries. Many per `BuildResume`.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key |
| `resumeId` | String | FK → BuildResume |
| `company` | String | |
| `role` | String | Job title |
| `location` | String? | |
| `startDate` | DateTime | |
| `endDate` | DateTime? | Null if current |
| `isCurrent` | Boolean | Default false |
| `bullets` | String[] | Achievement bullet points |
| `orderIndex` | Int | For drag-reorder |

---

### `ResumeEducation`
Education entries.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | |
| `resumeId` | String | FK → BuildResume |
| `institute` | String | |
| `degree` | String | e.g. "B.Tech" |
| `field` | String? | e.g. "Computer Science" |
| `startYear` | Int | |
| `endYear` | Int? | |

---

### `ResumeSkill`
Individual skill entries on the resume.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | |
| `resumeId` | String | FK → BuildResume |
| `name` | String | Skill name |
| `level` | String? | Beginner / Intermediate / Expert |
| `category` | String? | Backend / Frontend / DevOps |

---

### `ResumeProject`
Project portfolio entries.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | |
| `resumeId` | String | FK → BuildResume |
| `name` | String | |
| `description` | String | |
| `techStack` | String[] | List of technologies |
| `link` | String? | GitHub / live URL |

---

### `ResumeCertification`
Professional certifications.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | |
| `resumeId` | String | FK → BuildResume |
| `name` | String | Certification name |
| `issuer` | String | Issuing organization |
| `year` | Int? | Year obtained |
| `link` | String? | Credential URL |

---

## Enums

### `SalaryPeriod`
```
HOUR   → Per hour
MONTH  → Per month
YEAR   → Per year (annual CTC)
```

### `KeywordType`
```
ATOMIC    → Specific named technology/tool
CATEGORY  → Broader domain area
CONCEPT   → Architecture/process concept
```
