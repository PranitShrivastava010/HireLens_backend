# HireLens — Complete API Reference

Base URL: `http://localhost:3000/api`  
All protected routes require: `Authorization: Bearer <accessToken>`

---

## Auth Module — `/api/auth`

### POST `/api/auth/register`
Registers a new user and sends an OTP to their email.

**Request body:**
```json
{
  "email": "user@example.com",
  "name": "Pranit Shrivastava",
  "password": "mypassword123"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "code": "USER_REGISTERED",
  "message": "User registered. Please verify your email.",
  "result": { ... }
}
```

---

### POST `/api/auth/verify-otp`
Verifies the OTP sent during registration. Returns tokens on success.

**Request body:**
```json
{
  "email": "user@example.com",
  "otp": "123456"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "code": "OTP_VERIFIED",
  "Result": {
    "accessToken": "<jwt>",
    "sendUser": { "id": "...", "email": "...", "name": "...", "hasCompletedPref": false }
  }
}
```
Sets `refreshToken` as HTTP-only cookie.

---

### POST `/api/auth/login`
Logs in a verified user.

**Request body:**
```json
{
  "email": "user@example.com",
  "password": "mypassword123"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "Result": {
    "accessToken": "<jwt>",
    "sendUser": { "id": "...", "email": "...", "name": "...", "hasCompletedPref": true }
  }
}
```

---

### POST `/api/auth/refresh`
Rotates the refresh token and returns a new access token. Reads refresh token from cookie.

**Success Response (200):**
```json
{
  "success": true,
  "accessToken": "<new_jwt>",
  "user": { "id": "...", "email": "...", "name": "..." }
}
```

---

## Jobs Module — `/api/job`
All routes require `Authorization: Bearer <accessToken>`

### POST `/api/job/fetch` 🔒
Fetches jobs from JSearch API and stores them to DB. Runs AI role/skill tagging per job.

**Request body:**
```json
{
  "query": "Backend Developer India",
  "page": 1
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Jobs fetched successfully",
  "totalFetched": 10
}
```

---

### GET `/api/job` 🔒
Returns a personalized, scored, and paginated job feed.

**Query Parameters:**
| Param | Type | Description |
|---|---|---|
| `page` | number | Page number (default: 1) |
| `limit` | number | Results per page (default: 10) |
| `search` | string | Search by title or company |
| `location` | string | Filter by location |
| `isRemote` | boolean | Filter remote jobs |

**Success Response (200):**
```json
{
  "jobs": [
    {
      "id": "uuid",
      "title": "Backend Developer",
      "companyName": "TechCorp",
      "companyLogo": "https://...",
      "location": "Bangalore, India",
      "city": "Bangalore",
      "state": "Karnataka",
      "employmentType": "FULLTIME",
      "isRemote": false,
      "postedAtUtc": "2026-04-20T00:00:00.000Z",
      "minExperienceYears": 1,
      "maxExperienceYears": 3,
      "minSalary": 600000,
      "maxSalary": 1200000,
      "applyStatus": false,
      "applicationStatus": { "key": "APPLIED", "label": "Applied" }
    }
  ],
  "meta": {
    "total": 84,
    "page": 1,
    "limit": 10,
    "totalPages": 9
  }
}
```

---

### GET `/api/job/roleSkill` 🔒
Returns all available roles and skills for the preference selector UI.

**Success Response (200):**
```json
{
  "roles": [
    { "id": "uuid", "name": "Backend Developer", "slug": "backend-developer" }
  ],
  "skills": [
    { "id": "uuid", "name": "Node.js", "slug": "nodejs" }
  ]
}
```

---

### POST `/api/job/preference` 🔒
Saves a user's job preferences (replaces existing). Invalidates job feed cache.

**Request body:**
```json
{
  "roleSlugs": ["backend-developer", "full-stack-developer"],
  "skillSlugs": ["nodejs", "react", "postgresql"]
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Preferences saved"
}
```

---

### GET `/api/job/userPreference` 🔒
Returns the current user's saved preferences.

**Success Response (200):**
```json
{
  "roles": [{ "id": "...", "name": "Backend Developer", "slug": "backend-developer" }],
  "skills": [{ "id": "...", "name": "Node.js", "slug": "nodejs" }]
}
```

---

### GET `/api/job/:id` 🔒
Returns full details of a specific job.

**Success Response (200):**
```json
{
  "id": "uuid",
  "title": "Backend Developer",
  "description": "Full job description...",
  "companyName": "TechCorp",
  "qualifications": ["B.Tech CS or equivalent"],
  "responsibilities": ["Build REST APIs", "Work with databases"],
  "applyUrl": "https://linkedin.com/jobs/...",
  ...
}
```

---

### POST `/api/job/:jobId/keywords` 🔒
Triggers AI keyword extraction for a job. Stores results in `JobKeyword` table.

**Success Response (200):**
```json
{
  "success": true,
  "keywords": [
    { "keyword": "Node.js", "type": "ATOMIC", "score": 0.9 },
    { "keyword": "REST API", "type": "CONCEPT", "score": 0.7 }
  ]
}
```

---

## Application Module — `/api/application`
All routes require `Authorization: Bearer <accessToken>`

### POST `/api/application/apply` 🔒
Creates a new job application record (or updates status if already applied).

**Request body:**
```json
{
  "jobId": "uuid",
  "statusKey": "APPLIED",
  "interviewDate": "2026-05-10T10:00:00.000Z"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "code": "APPLICATION_SUCCESS",
  "data": { "id": "uuid", "userId": "...", "jobId": "...", "statusId": "..." }
}
```

---

### GET `/api/application/get` 🔒
Returns all job applications for the current user with job + status details.

**Success Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "appliedAt": "2026-04-21T08:00:00.000Z",
      "interviewDate": null,
      "status": { "key": "APPLIED", "label": "Applied" },
      "job": { "title": "Backend Dev", "companyName": "TechCorp", ... }
    }
  ]
}
```

---

### PATCH `/api/application/status` 🔒
Updates the status of an existing application.

**Request body:**
```json
{
  "applicationId": "uuid",
  "newStatusKey": "INTERVIEW",
  "interviewDate": "2026-05-15T09:00:00.000Z"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "data": { "id": "uuid", "statusId": "...", "interviewDate": "..." }
}
```

---

## Resume Module — `/api/resume`
All routes require `Authorization: Bearer <accessToken>`

### POST `/api/resume`
Initializes or retrieves the user's resume builder document.

**Response:** Returns the full `BuildResume` object.

---

### GET `/api/resume`
Returns the full structured resume with all sections.

**Response:**
```json
{
  "id": "uuid",
  "title": "My Resume",
  "basics": { "fullName": "...", "email": "...", ... },
  "experiences": [...],
  "educations": [...],
  "skills": [...],
  "projects": [...],
  "certifications": [...]
}
```

---

### PUT `/api/resume/title`
Updates the resume title.

**Body:** `{ "title": "Senior Developer Resume" }`

---

### PUT `/api/resume/basics`
Updates the basics section (name, headline, contact info, links).

**Body:**
```json
{
  "fullName": "Pranit Shrivastava",
  "headline": "Full Stack Developer",
  "email": "pranit@example.com",
  "phone": "+91 9876543210",
  "location": "Pune, India",
  "linkedin": "https://linkedin.com/in/pranit",
  "github": "https://github.com/pranit"
}
```

---

### Experience CRUD
| Method | Route | Action |
|---|---|---|
| POST | `/api/resume/experience` | Create new experience |
| PUT | `/api/resume/experience/:id` | Update experience |
| DELETE | `/api/resume/experience/:id` | Delete experience |
| POST | `/api/resume/experience/reorder` | Reorder via array of IDs |

---

### Education CRUD
| Method | Route | Action |
|---|---|---|
| POST | `/api/resume/education` | Create education |
| PUT | `/api/resume/education/:id` | Update |
| DELETE | `/api/resume/education/:id` | Delete |

---

### Skills CRUD
| Method | Route | Action |
|---|---|---|
| POST | `/api/resume/skill` | Create skill |
| PUT | `/api/resume/skill/:id` | Update |
| DELETE | `/api/resume/skill/:id` | Delete |

---

### Projects CRUD
| Method | Route | Action |
|---|---|---|
| POST | `/api/resume/project` | Create project |
| PUT | `/api/resume/project/:id` | Update |
| DELETE | `/api/resume/project/:id` | Delete |

---

### Certifications CRUD
| Method | Route | Action |
|---|---|---|
| POST | `/api/resume/certification` | Create certification |
| PUT | `/api/resume/certification/:id` | Update |
| DELETE | `/api/resume/certification/:id` | Delete |

---

### POST `/api/resume/upload`
Upload a PDF resume. Extracts text and stores in Supabase.

**Form Data:** `resume` (file field, PDF only)

---

### POST `/api/resume/ats`
Calculate ATS score for a resume against a job.

**Body:**
```json
{
  "userId": "uuid",
  "jobId": "uuid",
  "resumeId": "uuid"
}
```

**Response:**
```json
{
  "score": 72,
  "matchedCount": 9,
  "missingCount": 4,
  "matchedKeywords": ["Node.js", "REST API", "PostgreSQL"],
  "missingKeywords": ["Docker", "Kubernetes"]
}
```

---

### GET `/api/resume/preview`
Returns a structured preview DTO of the user's built resume (for rendering/printing).
