# HireLens Outreach System — Complete Architecture & Flow

> A fully automated cold-outreach pipeline that sends emails hands-free and prepares LinkedIn messages for one-click sending — without risking your LinkedIn account.

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Step 1 — Target Companies](#step-1--target-companies)
3. [Step 2 — Find Recruiters & Employees](#step-2--find-recruiters--employees)
4. [Step 3 — AI-Generated Outreach](#step-3--ai-generated-outreach)
5. [Step 4 — Email Automation](#step-4--email-automation)
6. [Step 5 — LinkedIn Assistance (Safe)](#step-5--linkedin-assistance-safe)
7. [LinkedIn Safety Playbook](#linkedin-safety-playbook)
8. [Database Schema Extensions](#database-schema-extensions)
9. [New Backend Modules](#new-backend-modules)
10. [Daily Automation Schedule](#daily-automation-schedule)
11. [Tech Stack Additions](#tech-stack-additions)
12. [Frontend Dashboard Spec](#frontend-dashboard-spec)

---

## System Overview

```
┌──────────────────────────────────────────────────────────────────────────┐
│                        HIRELENS OUTREACH ENGINE                         │
│                                                                          │
│  ┌───────────┐   ┌──────────────┐   ┌──────────────┐                    │
│  │  Target    │──▶│  Contact     │──▶│  AI Message  │                    │
│  │  Companies │   │  Discovery   │   │  Generator   │                    │
│  └───────────┘   └──────────────┘   └──────┬───────┘                    │
│                                            │                             │
│                          ┌─────────────────┼──────────────────┐          │
│                          ▼                                    ▼          │
│                  ┌───────────────┐          ┌────────────────────────┐   │
│                  │ EMAIL CHANNEL │          │    LINKEDIN CHANNEL    │   │
│                  │ (Fully Auto)  │          │   (Human-in-the-loop)  │   │
│                  │               │          │                        │   │
│                  │ Send → Track  │          │  Phase 1: CONNECT      │   │
│                  │ → Follow-up   │          │    Generate note       │   │
│                  └───────────────┘          │    Open profile        │   │
│                                            │    You click Connect   │   │
│                                            │         ↓              │   │
│                                            │  Phase 2: WAIT         │   │
│                                            │    Poll for acceptance  │   │
│                                            │    (1-7 days)           │   │
│                                            │         ↓              │   │
│                                            │  Phase 3: MESSAGE      │   │
│                                            │    Generate DM          │   │
│                                            │    Pre-fill textarea    │   │
│                                            │    You click Send       │   │
│                                            └────────────────────────┘   │
└──────────────────────────────────────────────────────────────────────────┘
```

### Core Principle

| Channel  | Automation Level | Why |
|----------|-----------------|-----|
| **Email** | 100% automated | Email is designed for programmatic sending. No account risk. |
| **LinkedIn Connect** | 90% automated, **you click Connect** | Extension opens profile + pre-fills connection note. You review and click. |
| **LinkedIn DM** | 95% automated, **you click Send** | Only for accepted connections. Extension pre-fills message. You click Send. |

---

## Step 1 — Target Companies

### 1A. Manual Input

User provides a list of dream companies through the dashboard:

```
Google, Atlassian, Adobe, Microsoft, Uber
```

Stored in a `TargetCompany` table with metadata.

### 1B. Auto-Pull from Job Board (Already Built ✅)

Your existing `Jobs` table already fetches jobs from JSearch/RapidAPI. We can **extract unique companies** from jobs that match the user's role + skill preferences:

```
SELECT DISTINCT companyName, companyWebsite, companyLogo
FROM Jobs j
JOIN JobRole jr ON j.id = jr.jobId
JOIN UserRolePreference urp ON jr.roleId = urp.roleId
WHERE urp.userId = :userId
ORDER BY j.postedAtUtc DESC
```

This gives you **companies already hiring for roles you want** — the highest-signal targets.

### 1C. Enrichment

For each company, store:
- Company name
- Domain (e.g., `google.com`)
- Industry
- Approximate size (from Apollo)
- Careers page URL
- Active job IDs (linked from your `Jobs` table)

> [!TIP]
> Prioritize companies with **active job postings** in your `Jobs` table. These are warm targets — they're literally hiring right now.

---

## Step 2 — Find Recruiters & Employees

### API Strategy (Pick one primary, one fallback)

| Provider | Best For | Pricing | Rate Limits |
|----------|----------|---------|-------------|
| **Apollo.io** | Best all-rounder. LinkedIn URLs + emails + role filters. | Free: 10K credits/mo | 100 req/min |
| **Hunter.io** | Email finding by domain | Free: 25 searches/mo | 10 req/min |
| **Snov.io** | Email + LinkedIn combo | Free: 50 credits/mo | 60 req/min |

### Who to Find (Per Company)

```
Priority 1:  1× Recruiter / Talent Acquisition
Priority 2:  1-2× Engineering Manager / Tech Lead
Priority 3:  2-3× Software Engineer / Senior Engineer (for referrals)
```

**Total per company: 5–8 contacts max.**

> [!WARNING]
> Do NOT message 50 people at the same company. It looks spammy, triggers red flags, and rarely converts better than a focused 5–8 person approach.

### Contact Discovery Flow

```
For each TargetCompany:
  │
  ├── Query Apollo: "Recruiter" at {company domain}
  │     → Store: name, role, email, linkedinUrl
  │
  ├── Query Apollo: "Engineering Manager" at {company domain}
  │     → Store: name, role, email, linkedinUrl
  │
  └── Query Apollo: "Software Engineer" at {company domain}
        → Store: name, role, email, linkedinUrl
        → Limit: 3 results

  If email missing:
    └── Fallback to Hunter.io domain search
         → Verify email deliverability
```

### Data Stored Per Contact

```
┌─────────────────────────────────────────────────────────┐
│ Contact                                                 │
├─────────────────────────────────────────────────────────┤
│ name:           "Sarah Chen"                            │
│ role:           "Technical Recruiter"                   │
│ company:        "Google"                                │
│ email:          "sarah@google.com"        ← may be null │
│ linkedinUrl:    "linkedin.com/in/sarah"   ← may be null │
│ contactType:    RECRUITER                               │
│ emailStatus:    VERIFIED / UNVERIFIED                   │
│ outreachStatus: PENDING                                 │
│                                                         │
│ linkedinStatus: DISCOVERED                              │
│   → CONNECTION_NOTE_READY                               │
│   → CONNECTION_SENT                                     │
│   → CONNECTION_ACCEPTED  ✅                              │
│   → CONNECTION_DECLINED  ❌                              │
│   → DM_READY                                            │
│   → DM_SENT                                             │
│                                                         │
│ connectionSentAt:     null                              │
│ connectionAcceptedAt: null                              │
│ connectionNote:       "AI-generated note"               │
└─────────────────────────────────────────────────────────┘
```

### Deduplication Rules

- Deduplicate by `(email)` OR `(linkedinUrl)` OR `(name + company)`
- Don't re-contact someone already in your pipeline
- Don't contact someone you've messaged in the last 30 days

---

## Step 3 — AI-Generated Outreach

### Context the AI Receives

```json
{
  "sender": {
    "name": "Pranit Shrivastava",
    "headline": "Full-Stack Developer | Node.js, React, TypeScript",
    "experience": ["SDE Intern at XYZ", "Built HireLens - job tracking platform"],
    "skills": ["Node.js", "React", "TypeScript", "PostgreSQL"],
    "targetRole": "Backend Engineer"
  },
  "recipient": {
    "name": "Sarah Chen",
    "role": "Technical Recruiter",
    "company": "Google",
    "contactType": "RECRUITER"
  },
  "company": {
    "name": "Google",
    "activeJobTitle": "Backend Engineer - Cloud Platform",
    "jobUrl": "https://careers.google.com/..."
  }
}
```

### Message Templates by Contact Type

#### Template A: Recruiter Email
```
Subject: Backend Engineer — Referral from HireLens Job Board

Hi Sarah,

I noticed Google is hiring for Backend Engineer roles on the Cloud
Platform team. I'm a full-stack developer with deep experience in
Node.js and TypeScript — I recently built HireLens, a job-tracking
platform that serves 500+ users.

I'd love to learn more about this role and see if there's a fit.
Would you be open to a quick chat this week?

Best,
Pranit
```

#### Template B: LinkedIn Connection Note (≤300 chars — LinkedIn's limit)

These are short notes sent WITH the connection request. They are NOT DMs.

**For a Recruiter:**
```
Hi Sarah, I saw Google is hiring Backend Engineers. I'm a Node.js/
TypeScript dev who built a full job-tracking platform. Would love to
connect and learn about opportunities on your team!
```

**For an Engineer (referral angle):**
```
Hi John! Fellow backend dev here — love the work your team is doing
at Google Cloud. I'm exploring roles in this space and would really
value connecting. Hope that's okay!
```

**For a Manager:**
```
Hi Alex, I came across your team's Backend Engineer opening at
Atlassian. I specialize in Node.js + TypeScript and would love to
connect to learn more about your team.
```

> [!IMPORTANT]
> LinkedIn connection notes have a **300 character limit**. The AI must be prompted to stay under this. These notes should be warm and low-ask — just establishing the connection. The real pitch comes in the DM after they accept.

#### Template C: LinkedIn DM (After Connection Accepted)

This is the follow-up message sent AFTER they accept your request.

**For an Engineer (referral request):**
```
Hi John, thanks for connecting!

I saw you're a Senior Engineer at Google working on Cloud
infrastructure — really cool work!

I'm a backend developer (Node.js/TypeScript) actively looking for
roles in this space. I recently built HireLens, an automated job
platform with a full enrichment pipeline.

Would you be open to a quick referral conversation? I'd be happy
to share my resume. No pressure at all.

Thanks!
Pranit
```

#### Template D: Engineering Manager (Email)
```
Subject: Experienced Backend Dev — Interested in Your Team

Hi Alex,

I came across the Backend Engineer opening on your team at Atlassian.
Your work on Jira's real-time collaboration features is impressive.

I'm a full-stack developer specializing in Node.js, TypeScript, and
PostgreSQL. I've built production systems handling concurrent job
enrichment pipelines and real-time data processing.

Would love to explore if there's a fit on your team.

Best,
Pranit
```

### AI Generation Rules

```
1. Connection notes: Max 300 CHARACTERS (LinkedIn hard limit)
2. LinkedIn DMs: Max 80 words
3. Emails: Max 120 words
4. Never use "I'm reaching out" or "I hope this finds you well"
5. Reference something specific about the company or role
6. Include ONE clear call-to-action
7. Sound human, not templated
8. Different tone per contact type:
   - Recruiter: Professional, direct
   - Engineer: Casual, peer-to-peer
   - Manager: Respectful, value-driven
9. Connection notes should be WARM and LOW-ASK
   - Don't pitch in the connection note
   - Save the real ask for the DM after acceptance
10. DMs should open with "Thanks for connecting!"
```

### Groq API Integration (Already in Stack ✅)

Use your existing `GROQ_API_KEY` with Llama 3 for fast, free generation:

```typescript
const prompt = `
You are writing a ${messageType} to ${contact.name} (${contact.role})
at ${company.name}.

Sender context: ${JSON.stringify(senderContext)}
Company context: ${JSON.stringify(companyContext)}

Rules:
- Max ${channel === 'email' ? 120 : 80} words
- Reference the specific role: "${activeJobTitle}"
- One clear CTA
- No generic openers
- Sound natural and human

Generate ONLY the message body. No subject line.
`;
```

### Human Review Layer

Before any message is sent:
```
Status flow:  AI_GENERATED → APPROVED → SENT

Options:
  ✅ Approve (send as-is)
  ✏️  Edit (modify then approve)
  🔄 Regenerate (new AI draft)
  ❌ Skip (don't contact this person)
```

For the MVP, you can **auto-approve emails** and **require manual approval for LinkedIn DMs** (since you need to click send anyway).

---

## Step 4 — Email Automation (Fully Automatic)

### Flow

```
Contact has verified email?
  │
  YES ──▶ Generate email (AI)
           │
           ▼
         Queue email
           │
           ▼
         Send via Nodemailer  ← (already in your stack ✅)
           │
           ▼
         Track status:
           • SENT
           • OPENED (via tracking pixel)
           • REPLIED (via IMAP listener / webhook)
           • BOUNCED
           │
           ▼
         No reply after 3 days?
           │
           ▼
         Send follow-up #1 (shorter, different angle)
           │
           ▼
         No reply after 5 more days?
           │
           ▼
         Send follow-up #2 (final, graceful close)
           │
           ▼
         Mark as COMPLETED (stop sequence)
```

### Email Sending Rules

| Rule | Value | Why |
|------|-------|-----|
| Max emails per day | 30 | Stay under spam radar |
| Min gap between emails | 2-5 min (randomized) | Mimic human behavior |
| Max follow-ups | 2 | More than 2 is annoying |
| Follow-up gap | 3 days, then 5 days | Give them time |
| Sending window | 8 AM – 11 AM recipient's TZ | Best open rates |
| Never send on | Saturday, Sunday | Low engagement |

### Tracking

| Method | What it Tracks | How |
|--------|---------------|-----|
| **Tracking Pixel** | Email opens | 1×1 transparent image with unique URL |
| **Unique Links** | Click tracking | Wrap links with redirect through your server |
| **IMAP Listener** | Replies | Poll inbox every 5 min for replies to tracked threads |

### Anti-Spam Best Practices

> [!CAUTION]
> If you send from `pranitshrivastava7@gmail.com` directly, your personal email could get flagged. Set up properly:

1. **Use a dedicated outreach email**: `pranit@hirelens.app` or `outreach@hirelens.app`
2. **Set up SPF, DKIM, DMARC** records on your domain
3. **Warm up the email**: Send 5/day for week 1, 10/day week 2, ramp to 30/day by week 4
4. **Use a warmup service**: Lemwarm, Warmup Inbox, or Mailreach
5. **Rotate sending accounts** if you scale beyond 50/day

---

## Step 5 — LinkedIn Assistance (Safe)

This is the **critical section** for protecting your LinkedIn account.

### The Real LinkedIn Flow (Connect → Wait → Message)

LinkedIn only lets you DM **1st-degree connections**. So for most contacts, the flow is:

```
 DISCOVERED              You haven't interacted yet
     │
     ▼
 CONNECTION_NOTE_READY   AI generates a short connection note (≤300 chars)
     │
     ▼
 ┌──────────────────────────────────────────────────────┐
 │  🖱️  YOU open their profile + click "Connect"        │
 │      Extension pre-fills the note in the "Add a      │
 │      note" field. YOU click "Send invitation".       │
 └──────────────────────────────────────────────────────┘
     │
     ▼
 CONNECTION_SENT         Waiting for them to accept
     │
     ├── ✅ Accepted ──▶ CONNECTION_ACCEPTED
     │                       │
     │                       ▼
     │                  DM_READY    AI generates full DM
     │                       │
     │               ┌──────────────────────────────────┐
     │               │  🖱️  YOU open chat, extension     │
     │               │      pre-fills the DM. YOU click  │
     │               │      Send.                        │
     │               └──────────────────────────────────┘
     │                       │
     │                       ▼
     │                  DM_SENT ✅   Done!
     │
     ├── ❌ Declined ──▶ CONNECTION_DECLINED
     │                       │
     │                       ▼
     │                  Fall back to EMAIL if available
     │                  Otherwise mark as EXHAUSTED
     │
     └── ⏳ No response after 14 days ──▶ CONNECTION_EXPIRED
                             │
                             ▼
                        Mark as STALE (don't retry)
```

### Architecture: Browser Extension + Backend API

The dashboard now has **two sections** — one for connections, one for DMs:

```
┌──────────────────────────────────────────────────────────┐
│              HIRELENS DASHBOARD (Web)                     │
│                                                          │
│  🔗 CONNECTION REQUESTS (Phase 1)                        │
│  ┌────────────────────────────────────────────────────┐  │
│  │  Google      3 connections ready  [Start ▶]       │  │
│  │  Adobe       2 connections ready  [Start ▶]       │  │
│  │  Uber        4 connections ready  [Start ▶]       │  │
│  └────────────────────────────────────────────────────┘  │
│                                                          │
│  ⏳ PENDING CONNECTIONS                                   │
│  ┌────────────────────────────────────────────────────┐  │
│  │  Sarah Chen (Google)       Sent 2 days ago        │  │
│  │  John Park  (Atlassian)    Sent 5 days ago        │  │
│  │  Alex Kumar (Adobe)        ✅ ACCEPTED! DM Ready   │  │
│  └────────────────────────────────────────────────────┘  │
│                                                          │
│  💬 DMs READY (Phase 2 — Accepted Connections)           │
│  ┌────────────────────────────────────────────────────┐  │
│  │  Alex Kumar  (Adobe)       [Send DM ▶]            │  │
│  │  Maria Lopez (Microsoft)   [Send DM ▶]            │  │
│  └────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
```

### Why a Browser Extension (Not a Bot)?

| Approach | Risk Level | Why |
|----------|-----------|-----|
| Puppeteer / Selenium | 🔴 **HIGH** | LinkedIn detects headless browsers. IP bans, account restrictions. |
| LinkedIn API (official) | 🟡 **MEDIUM** | Very limited scope. No DM access for most apps. |
| Third-party tools (Dux-Soup, Phantombuster) | 🟠 **HIGH** | Known tools, LinkedIn actively blocks them. |
| **Browser Extension + Human Click** | 🟢 **LOW** | Runs in YOUR real browser session. YOU click send. Indistinguishable from manual use. |

### Phase 1: Connection Request Flow (Extension Behavior)

```
1. User clicks "Start Google connections" on dashboard

2. Extension opens:
   linkedin.com/in/sarah-chen → profile page

3. Extension locates the "Connect" button and clicks it
   → The "Add a note" modal appears

4. Extension clicks "Add a note"
   → Pastes the AI-generated connection note (≤300 chars)

5. USER reviews the note

6. USER clicks "Send invitation"

7. Extension detects invitation sent → calls backend API:
   POST /api/outreach/linkedin/connection-sent
   { contactId: "abc123" }

8. Backend updates:
   linkedinStatus: CONNECTION_SENT
   connectionSentAt: now()

9. Dashboard auto-advances to next contact

10. Repeat until batch complete (~2 min total)
```

### Tracking Connection Acceptances

The system needs to know when someone accepts your request so it can prepare DMs.

**Option A: Extension-based polling (Recommended — Safest)**
```
When you're browsing LinkedIn normally:
  Extension periodically checks your "My Network" page
  → Looks for new connections that match contacts in your DB
  → Reports acceptances to backend

Trigger: Every time you visit linkedin.com (max once per hour)
NOT a background job — only when you're actively on LinkedIn
```

**Option B: Manual check from dashboard**
```
Dashboard has a "Check Acceptances" button
  → Opens linkedin.com/mynetwork/invitation-manager/sent/
  → Extension reads which invitations were accepted
  → Reports back to backend

You click this once a day during your outreach session.
```

**Option C: Notification-based (Most Passive)**
```
LinkedIn sends email notifications when someone accepts:
  "Sarah Chen accepted your invitation"

Your IMAP listener (already built for email tracking)
  → Watches for LinkedIn notification emails
  → Parses the name
  → Matches to a Contact in your DB
  → Updates linkedinStatus → CONNECTION_ACCEPTED
```

> [!TIP]
> **Option C is the most hands-off** — your email tracking system already polls your inbox. Just add a filter for LinkedIn notification emails. Combined with Option B as a manual fallback, you'll catch 100% of acceptances.

### Phase 2: DM Flow (Only After Acceptance)

```
1. Backend detects CONNECTION_ACCEPTED
   → AI generates a personalized DM (using Groq)
   → Status becomes DM_READY
   → Contact appears in "DMs Ready" section of dashboard

2. User clicks "Send DM" for Alex Kumar

3. Extension opens:
   linkedin.com/messaging/thread/new/?recipient=alex-kumar
   (or the existing chat thread)

4. Extension pastes the pre-generated DM into the textarea

5. USER reviews the message

6. USER clicks Send

7. Extension detects message sent → calls backend API:
   POST /api/outreach/linkedin/dm-sent
   { contactId: "abc123" }

8. Backend updates:
   linkedinStatus: DM_SENT
   lastContactedAt: now()

9. Dashboard auto-advances to next DM
```

### Handling Declined / Expired Connections

```
If CONNECTION_DECLINED or CONNECTION_EXPIRED (14 days, no response):

  Does the contact have an email?
  │
  ├── YES → Fall back to email outreach
  │         (Generate email, add to email queue)
  │
  └── NO  → Mark as EXHAUSTED
            (Don't retry this contact)
            Log to analytics
```

### What the Extension Does NOT Do

> [!IMPORTANT]
> The extension must NEVER:
> - Auto-click the "Send invitation" or "Send" button
> - Send connection requests without user present
> - Withdraw and re-send connection requests
> - Scrape LinkedIn profiles or search results
> - Run when you're not actively using it
> - Make requests to LinkedIn's API endpoints
> - Modify LinkedIn's DOM beyond filling text fields
>
> All of these trigger LinkedIn's bot detection.

### Extension Permissions (Minimal)

```json
{
  "permissions": ["activeTab"],
  "host_permissions": ["https://www.linkedin.com/*"],
  "content_scripts": [
    {
      "matches": ["https://www.linkedin.com/in/*"],
      "js": ["connect.js"]
    },
    {
      "matches": ["https://www.linkedin.com/messaging/*"],
      "js": ["message.js"]
    },
    {
      "matches": ["https://www.linkedin.com/mynetwork/*"],
      "js": ["acceptance-checker.js"]
    }
  ]
}
```

The extension now has **three content scripts**:
- `connect.js` — Active on profile pages, handles connection note pre-filling
- `message.js` — Active on messaging pages, handles DM pre-filling
- `acceptance-checker.js` — Active on My Network page, checks for accepted invitations

---

## LinkedIn Safety Playbook

### Daily Limits (Stay Under the Radar)

| Action | Safe Daily Limit | Your Limit | Notes |
|--------|-----------------|------------|-------|
| Profile views | 80–100 | **30** | Far below detection threshold |
| Connection requests (with note) | 20–25 | **10** | ALWAYS include a personalized note |
| Connection requests (no note) | 10–15 | **0** | Never do this — low acceptance rate + looks spammy |
| Messages (1st degree) | 50–70 | **15** | Only to accepted connections |
| InMails (if Premium) | 50 | **10** | Use sparingly |
| Messages (via Open Profile) | 30 | **10** | Free InMail to Open Profiles |

> [!TIP]
> With 3–5 companies/day at 5–8 contacts each, you'll send ~15–25 connection requests/day. But many won't accept on day 1. Your DM volume will naturally be lower (only accepted connections). A typical day might look like: **10 connection requests + 5 DMs** — well within safe limits.

### Connection Request Best Practices

```
✅ DO:
  • ALWAYS add a personalized note (your AI does this)
  • Mention something specific about their role/company
  • Keep notes SHORT — LinkedIn's 300 char limit helps here
  • Target people with mutual connections when possible
  • Space connection requests 30–90 seconds apart

❌ DON'T:
  • Send connection requests without a note (low accept rate)
  • Send more than 10/day (even though LinkedIn allows ~20-25)
  • Withdraw & re-send rejected connections
  • Target people with 0 mutual connections unless necessary
  • Send all your daily connections in one burst
```

### Behavioral Patterns That Look Human

```
✅ DO:
  • Space connections 30–90 seconds apart (randomized)
  • Space DMs 1–3 minutes apart (randomized)
  • Send during working hours (9 AM – 6 PM)
  • View the person's profile BEFORE connecting
  • Personalize every note and DM (your AI already does this)
  • Take weekends off (or light activity only)
  • Mix outreach with normal LinkedIn activity (likes, comments)
  • Do connections in the morning, DMs in the evening

❌ DON'T:
  • Send 20 connection requests in 5 minutes
  • Connect + DM the same person in one session (impossible anyway)
  • Message at 3 AM
  • Send identical notes to multiple people
  • Connect with people who have zero mutual connections
  • Use LinkedIn from multiple IPs simultaneously
  • Run any automation tool in the background
```

### Account Warm-Up Schedule

If your LinkedIn account is new or has low activity:

| Week | Daily Messages | Daily Connection Requests | Other Activity |
|------|---------------|--------------------------|----------------|
| 1 | 3–5 | 3–5 | Like 10 posts, comment on 3 |
| 2 | 5–8 | 5–8 | Like 15 posts, comment on 5 |
| 3 | 8–12 | 8–10 | Share 1 post, engage with feed |
| 4+ | 12–20 | 10 | Normal activity + outreach |

### If LinkedIn Shows a Warning

```
🚨 "You've reached the weekly invitation limit"
   → STOP all connection requests for 7 days
   → Continue messaging existing connections only

🚨 "Your account is restricted"
   → STOP all outreach immediately
   → File an appeal with LinkedIn
   → Wait for restriction to be lifted
   → Resume at 50% of previous volume

🚨 CAPTCHA challenge
   → Complete it manually
   → Reduce volume by 50% for the next week
```

---

## Database Schema Extensions

New models to add to your existing Prisma schema:

```prisma
// ===== OUTREACH SYSTEM MODELS =====

model TargetCompany {
  id              String   @id @default(uuid())
  userId          String
  name            String
  domain          String?              // e.g. "google.com"
  logo            String?
  industry        String?
  size            String?              // "1000-5000", "10000+"
  careersUrl      String?
  source          CompanySource        @default(MANUAL)
  status          CompanyStatus        @default(ACTIVE)
  priority        Int                  @default(50)  // 1-100
  createdAt       DateTime             @default(now())
  updatedAt       DateTime             @updatedAt

  user            User                 @relation(fields: [userId], references: [id], onDelete: Cascade)
  contacts        Contact[]
  companyJobs     TargetCompanyJob[]

  @@unique([userId, domain])
  @@index([userId, status])
}

enum CompanySource {
  MANUAL         // User typed it in
  JOB_BOARD      // Extracted from Jobs table
  IMPORT         // CSV/bulk import
}

enum CompanyStatus {
  ACTIVE
  PAUSED
  COMPLETED      // All contacts reached out to
  ARCHIVED
}

model TargetCompanyJob {
  companyId   String
  jobId       String

  company     TargetCompany @relation(fields: [companyId], references: [id], onDelete: Cascade)
  job         Jobs          @relation(fields: [jobId], references: [id], onDelete: Cascade)

  @@id([companyId, jobId])
}

model Contact {
  id              String          @id @default(uuid())
  userId          String
  companyId       String
  name            String
  role            String
  contactType     ContactType
  email           String?
  emailStatus     EmailStatus     @default(UNKNOWN)
  linkedinUrl     String?
  linkedinSlug    String?         // e.g. "sarah-chen-123" from URL
  linkedinId      String?         // LinkedIn member ID if available
  avatarUrl       String?
  source          String?         // "apollo", "hunter", "snov", "manual"

  // LinkedIn connection lifecycle
  linkedinStatus      LinkedinStatus  @default(DISCOVERED)
  connectionNote      String?         // AI-generated note (≤300 chars)
  connectionSentAt    DateTime?       // When connection request was sent
  connectionAcceptedAt DateTime?      // When they accepted
  connectionDeclinedAt DateTime?      // When detected as declined/expired
  connectionExpiresAt DateTime?       // Auto-expire after 14 days

  discoveredAt    DateTime        @default(now())
  lastContactedAt DateTime?
  cooldownUntil   DateTime?       // Don't contact again until this date

  user            User            @relation(fields: [userId], references: [id], onDelete: Cascade)
  company         TargetCompany   @relation(fields: [companyId], references: [id], onDelete: Cascade)
  messages        OutreachMessage[]

  @@unique([userId, email])
  @@unique([userId, linkedinUrl])
  @@index([userId, companyId])
  @@index([contactType])
  @@index([emailStatus])
  @@index([linkedinStatus])
  @@index([linkedinStatus, connectionSentAt])  // For expiry checks
}

enum LinkedinStatus {
  NOT_APPLICABLE        // No LinkedIn URL found — email-only contact
  DISCOVERED            // LinkedIn URL known, not yet acted on
  CONNECTION_NOTE_READY // AI-generated connection note ready
  CONNECTION_SENT       // Connection request sent, waiting for response
  CONNECTION_ACCEPTED   // They accepted — can now DM
  CONNECTION_DECLINED   // They declined or ignored (detected)
  CONNECTION_EXPIRED    // No response after 14 days
  DM_READY              // DM generated, waiting for user to send
  DM_SENT               // DM sent by user via extension
  DM_REPLIED            // They replied to our DM
  EXHAUSTED             // All LinkedIn options tried, no success
}

enum ContactType {
  RECRUITER
  HIRING_MANAGER
  ENGINEERING_MANAGER
  TECH_LEAD
  SOFTWARE_ENGINEER
  SENIOR_ENGINEER
  OTHER
}

enum EmailStatus {
  UNKNOWN
  VERIFIED
  UNVERIFIED
  BOUNCED
  CATCH_ALL       // Domain accepts all emails
}

model OutreachMessage {
  id              String           @id @default(uuid())
  userId          String
  contactId       String
  channel         OutreachChannel
  messageType     MessageType
  sequenceOrder   Int              @default(1)  // 1 = initial, 2 = follow-up 1, etc.

  subject         String?          // For emails only
  body            String
  aiModel         String?          // e.g. "llama-3.3-70b"

  status          MessageStatus    @default(DRAFT)
  sentAt          DateTime?
  openedAt        DateTime?
  repliedAt       DateTime?
  bouncedAt       DateTime?
  clickedAt       DateTime?

  scheduledFor    DateTime?        // When to send (for email queue)
  errorMessage    String?

  createdAt       DateTime         @default(now())
  updatedAt       DateTime         @updatedAt

  user            User             @relation(fields: [userId], references: [id], onDelete: Cascade)
  contact         Contact          @relation(fields: [contactId], references: [id], onDelete: Cascade)
  trackingEvents  TrackingEvent[]

  @@index([userId, status])
  @@index([channel, status])
  @@index([scheduledFor, status])
  @@index([contactId, sequenceOrder])
}

enum OutreachChannel {
  EMAIL
  LINKEDIN_DM
  LINKEDIN_INMAIL
  LINKEDIN_CONNECTION_NOTE
}

enum MessageType {
  RECRUITER_PITCH
  REFERRAL_REQUEST
  MANAGER_INTRO
  CONNECTION_NOTE        // Short note with connection request
  FOLLOW_UP
  THANK_YOU
}

enum MessageStatus {
  DRAFT              // AI generated, not yet reviewed
  APPROVED           // User approved, waiting to send
  QUEUED             // In email queue
  SENDING            // Currently being sent
  SENT               // Successfully sent/delivered
  OPENED             // Email opened (tracking pixel)
  CLICKED            // Link clicked
  REPLIED            // Recipient replied
  BOUNCED            // Email bounced
  FAILED             // Send failed
  SKIPPED            // User decided not to send
  LINKEDIN_READY     // Ready for user to send via extension
  LINKEDIN_OPENED    // Profile opened in browser
  LINKEDIN_SENT      // User confirmed send via extension
}

model TrackingEvent {
  id          String   @id @default(uuid())
  messageId   String
  eventType   String   // "open", "click", "reply", "bounce"
  metadata    String?  // JSON: user agent, IP (for opens), link URL (for clicks)
  occurredAt  DateTime @default(now())

  message     OutreachMessage @relation(fields: [messageId], references: [id], onDelete: Cascade)

  @@index([messageId, eventType])
}

model OutreachSequence {
  id              String   @id @default(uuid())
  userId          String
  name            String                  // "Default Recruiter Sequence"
  contactType     ContactType
  channel         OutreachChannel

  step1DelayDays  Int      @default(0)    // Initial: send immediately
  step2DelayDays  Int      @default(3)    // Follow-up 1: after 3 days
  step3DelayDays  Int      @default(5)    // Follow-up 2: after 5 more days
  maxSteps        Int      @default(3)

  isActive        Boolean  @default(true)
  createdAt       DateTime @default(now())

  user            User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, contactType, channel])
}

model DailyOutreachLog {
  id              String   @id @default(uuid())
  userId          String
  date            DateTime @db.Date
  emailsSent      Int      @default(0)
  linkedinDmsSent Int      @default(0)
  connectionsRequested Int @default(0)
  profilesViewed  Int      @default(0)
  contactsFound   Int      @default(0)

  user            User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, date])
}
```

> [!NOTE]
> You'll also need to add the following relations to your existing `User` model:
> ```prisma
> targetCompanies   TargetCompany[]
> contacts          Contact[]
> outreachMessages  OutreachMessage[]
> outreachSequences OutreachSequence[]
> dailyOutreachLogs DailyOutreachLog[]
> ```
> And add to `Jobs`:
> ```prisma
> targetCompanyJobs TargetCompanyJob[]
> ```

---

## New Backend Modules

### Module Structure

```
src/modules/
├── outreach/
│   ├── outreach.routes.ts
│   ├── outreach.controller.ts
│   ├── outreach.service.ts
│   │
│   ├── companies/
│   │   ├── company.controller.ts
│   │   ├── company.service.ts
│   │   └── company.enrichment.ts      # Domain/industry lookup
│   │
│   ├── contacts/
│   │   ├── contact.controller.ts
│   │   ├── contact.service.ts
│   │   ├── discovery/
│   │   │   ├── apollo.provider.ts      # Apollo.io API
│   │   │   ├── hunter.provider.ts      # Hunter.io API
│   │   │   ├── snov.provider.ts        # Snov.io API
│   │   │   └── provider.interface.ts   # Common interface
│   │   └── dedup.service.ts
│   │
│   ├── messages/
│   │   ├── message.controller.ts
│   │   ├── message.service.ts
│   │   ├── ai-generator.ts            # Groq/Llama prompt engine
│   │   └── templates/
│   │       ├── recruiter.prompt.ts
│   │       ├── referral.prompt.ts
│   │       └── manager.prompt.ts
│   │
│   ├── email/
│   │   ├── email.controller.ts
│   │   ├── email.service.ts
│   │   ├── email.queue.ts             # Job queue for sending
│   │   ├── email.tracker.ts           # Tracking pixel + link wrapping
│   │   └── email.followup.ts          # Follow-up scheduler
│   │
│   ├── linkedin/
│   │   ├── linkedin.controller.ts     # API for browser extension
│   │   ├── linkedin.service.ts
│   │   ├── linkedin.connection.ts     # Connection request lifecycle
│   │   ├── linkedin.acceptance.ts     # Track & detect acceptances
│   │   ├── linkedin.dm-batch.ts       # Prepare DM batches (accepted only)
│   │   └── linkedin.expiry.ts         # Expire stale connections after 14d
│   │
│   └── analytics/
│       ├── analytics.controller.ts
│       └── analytics.service.ts       # Response rates, open rates
```

### Key API Endpoints

```
# Companies
POST   /api/outreach/companies              # Add target companies
GET    /api/outreach/companies              # List user's target companies
POST   /api/outreach/companies/auto-detect  # Pull from Jobs table
DELETE /api/outreach/companies/:id          # Remove company

# Contact Discovery
POST   /api/outreach/companies/:id/discover # Find contacts for a company
GET    /api/outreach/contacts               # List all contacts
GET    /api/outreach/contacts?company=X     # Filter by company

# Message Generation
POST   /api/outreach/messages/generate      # AI-generate for a contact
PUT    /api/outreach/messages/:id/approve   # Approve a draft
PUT    /api/outreach/messages/:id/edit      # Edit and approve
POST   /api/outreach/messages/:id/regenerate # New AI draft

# Email
POST   /api/outreach/email/send-batch       # Queue approved emails
GET    /api/outreach/email/queue            # View email queue

# LinkedIn — Connection Requests (Phase 1)
GET    /api/outreach/linkedin/connections/batch    # Get contacts to connect with
POST   /api/outreach/linkedin/connections/sent     # Extension: connection request sent
POST   /api/outreach/linkedin/connections/skipped  # Extension: user skipped this contact
GET    /api/outreach/linkedin/connections/pending   # List pending connections
POST   /api/outreach/linkedin/connections/accepted  # Extension: detected acceptance
POST   /api/outreach/linkedin/connections/declined  # Extension: detected decline
POST   /api/outreach/linkedin/connections/check     # Bulk check acceptances

# LinkedIn — DMs (Phase 2 — only accepted connections)
GET    /api/outreach/linkedin/dms/batch     # Get ready DMs for accepted contacts
POST   /api/outreach/linkedin/dms/opened    # Extension: chat opened
POST   /api/outreach/linkedin/dms/sent      # Extension: DM sent
POST   /api/outreach/linkedin/dms/skipped   # Extension: user skipped

# Tracking
GET    /api/outreach/track/open/:messageId  # Tracking pixel endpoint
GET    /api/outreach/track/click/:messageId # Link click redirect

# Analytics
GET    /api/outreach/analytics/overview     # Response rates, funnel stats
GET    /api/outreach/analytics/daily        # Daily activity log

# Cron (add to existing cron module)
POST   /api/cron/outreach/discover          # Daily contact discovery
POST   /api/cron/outreach/generate-notes    # Generate connection notes for new contacts
POST   /api/cron/outreach/generate-dms      # Generate DMs for newly accepted connections
POST   /api/cron/outreach/send-emails       # Send queued emails
POST   /api/cron/outreach/follow-ups        # Check and send follow-ups
POST   /api/cron/outreach/expire-connections # Expire connections pending >14 days
```

---

## Daily Automation Schedule

### Cron Jobs (Add to Existing Cron Module)

```
┌─────────┬────────────────────────────────────────────────────────────────┐
│  Time   │  Job                                                          │
├─────────┼────────────────────────────────────────────────────────────────┤
│ 6:00 AM │  🔍 Auto-detect new target companies from fresh jobs          │
│ 6:30 AM │  🔍 Run contact discovery for companies with < 5 contacts     │
│ 7:00 AM │  ✍️  Generate connection notes for DISCOVERED contacts         │
│ 7:00 AM │  ✍️  Generate DMs for newly CONNECTION_ACCEPTED contacts       │
│ 7:30 AM │  ✅ Auto-approve emails (if user enabled auto-approve)        │
│ 8:00 AM │  📧 Send email batch (staggered over 2 hours)                 │
│ 8:00 AM │  🔗 Prepare connection request batch → push to dashboard     │
│ 8:00 AM │  💬 Prepare DM batch (accepted connections) → dashboard      │
│ 10:00AM │  📧 Send remaining queued emails                              │
│ 2:00 PM │  📊 Check for email opens/replies (IMAP poll)                 │
│ 6:00 PM │  🔄 Schedule follow-ups for non-responses                     │
│ 9:00 PM │  ⏳ Expire connection requests older than 14 days             │
│ 9:00 PM │  🔄 Move CONNECTION_DECLINED contacts to email fallback       │
│ 11:00PM │  📊 Generate daily analytics summary                          │
└─────────┴────────────────────────────────────────────────────────────────┘
```

### User's Morning (5–10 minutes)

```
8:00 AM — Open HireLens Dashboard

You see:
╔═══════════════════════════════════════════════════════════════╗
║  🌅 Good Morning, Pranit!  Here's your outreach today:       ║
║                                                               ║
║  📧 Emails:                                                   ║
║     ✓ 28 emails sent automatically                            ║
║     ✓ 3 follow-ups sent                                       ║
║     📬 2 replies received! (check inbox)                       ║
║                                                               ║
║  🔗 CONNECTION REQUESTS (send now):                           ║
║     Google      3 to connect  [Start ▶]                      ║
║     Adobe       2 to connect  [Start ▶]                      ║
║     Uber        4 to connect  [Start ▶]                      ║
║                                                               ║
║  ⏳ PENDING CONNECTIONS:                                       ║
║     12 pending  │  3 accepted today! ✅  │  1 expired          ║
║                                                               ║
║  💬 DMs READY (accepted connections):                         ║
║     Alex Kumar (Adobe)         [Send DM ▶]                   ║
║     Maria Lopez (Microsoft)    [Send DM ▶]                   ║
║     David Park (Uber)          [Send DM ▶]                   ║
║                                                               ║
║  📊 This Week:                                                ║
║     142 emails sent  │  38 opened    │  7 replies             ║
║      32 connections  │  18 accepted  │  12 DMs sent           ║
╚═══════════════════════════════════════════════════════════════╝

Morning Session (3 min — Connection Requests):
  Click "Start" for Google
  → Tab opens: Sarah Chen's LinkedIn profile
  → Extension fills "Add a note" with AI-generated text
  → You glance at the note, click "Send invitation"
  → Next: John Park's profile...
  → 3 connections sent in ~2 minutes ✅

DM Session (2 min — Yesterday's Accepted Connections):
  Click "Send DM" for Alex Kumar
  → Chat opens with pre-filled message
  → You review, click Send
  → Next: Maria Lopez...
  → 3 DMs sent in ~2 minutes ✅

Total time: 5 minutes.
```

---

## Tech Stack Additions

### What You Already Have ✅

| Component | Status |
|-----------|--------|
| Express + TypeScript | ✅ Ready |
| Prisma + PostgreSQL (Neon) | ✅ Ready |
| Groq SDK (Llama 3) | ✅ Ready |
| Nodemailer | ✅ Ready |
| Supabase (file storage) | ✅ Ready |
| Upstash Redis (caching) | ✅ Ready |
| Cron system | ✅ Ready |
| Resume parsing (pdf-parse) | ✅ Ready |
| User auth (JWT) | ✅ Ready |

### What You Need to Add

| Component | Package | Purpose |
|-----------|---------|---------|
| **Apollo.io SDK** | `axios` (REST API) | Contact discovery |
| **Hunter.io SDK** | `axios` (REST API) | Email finding/verification |
| **Bull / BullMQ** | `bullmq` | Email job queue (uses your Upstash Redis) |
| **node-cron** | `node-cron` | Scheduled jobs (or use Vercel Cron) |
| **Handlebars** | `handlebars` | Email HTML templates |
| **UUID for tracking** | `nanoid` | Short unique IDs for tracking pixels |

### Browser Extension

```
hirelens-extension/
├── manifest.json          # Chrome Extension manifest v3
├── popup/
│   ├── popup.html         # Extension popup UI
│   ├── popup.js           # Dashboard mini-view
│   └── popup.css
├── content/
│   └── linkedin.js        # Content script for LinkedIn messaging
├── background/
│   └── service-worker.js  # Extension background service worker
└── icons/
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

---

## Frontend Dashboard Spec

### Outreach Dashboard Pages

```
/outreach
├── /companies              # Target company management
│   ├── Add companies (search / manual / import)
│   ├── View companies with contact counts
│   └── Company detail → contacts list
│
├── /contacts               # All discovered contacts
│   ├── Filter by company, type, linkedinStatus, emailStatus
│   ├── View contact card (name, role, channels, connection state)
│   └── Message preview + approve/edit/regenerate
│
├── /messages               # Message queue & history
│   ├── Drafts (pending approval)
│   ├── Queued (approved, waiting to send)
│   ├── Sent (with open/reply tracking)
│   └── LinkedIn Ready (for extension)
│
├── /linkedin               # LinkedIn outreach hub
│   ├── /connections         # Phase 1: Connection requests
│   │   ├── Ready to connect (grouped by company)
│   │   ├── "Start Batch" button per company
│   │   └── Progress tracker (3/9 connected)
│   │
│   ├── /pending             # Pending connections
│   │   ├── List of CONNECTION_SENT contacts with days elapsed
│   │   ├── "Check Acceptances" button
│   │   └── Auto-highlight newly accepted
│   │
│   └── /dms                 # Phase 2: DMs for accepted connections
│       ├── DMs ready (accepted contacts)
│       ├── "Send DM" button per contact
│       └── Progress tracker (2/5 sent)
│
└── /analytics              # Outreach performance
    ├── Response rates by channel
    ├── Connection acceptance rate
    ├── Best-performing connection note templates
    ├── Company-level funnel (discovered → connected → DM'd → replied)
    └── Weekly/monthly trends
```

---

## Implementation Phases

### Phase 1 — Foundation (Week 1-2)
- [ ] Extend Prisma schema with outreach models
- [ ] Build `TargetCompany` CRUD
- [ ] Integrate Apollo.io API for contact discovery
- [ ] Build `Contact` storage with deduplication

### Phase 2 — AI Messages (Week 2-3)
- [ ] Build prompt templates for each contact type
- [ ] Integrate with existing Groq SDK
- [ ] Build message review/approve flow
- [ ] Build message regeneration endpoint

### Phase 3 — Email Automation (Week 3-4)
- [ ] Build email queue with BullMQ
- [ ] Implement staggered sending with rate limits
- [ ] Add tracking pixel generation
- [ ] Build follow-up scheduler
- [ ] Set up dedicated outreach email + SPF/DKIM

### Phase 4 — LinkedIn Extension: Connections (Week 4-5)
- [ ] Build Chrome Extension (Manifest V3)
- [ ] Build `connect.js` content script for profile pages
- [ ] Build connection note pre-filling on "Add a note" modal
- [ ] Build backend connection lifecycle API
- [ ] Build connection request batch UI in dashboard
- [ ] Build pending connections tracker UI

### Phase 5 — LinkedIn Extension: Acceptances & DMs (Week 5-6)
- [ ] Build `acceptance-checker.js` for My Network page
- [ ] Build LinkedIn notification email parser (IMAP)
- [ ] Build `message.js` content script for messaging pages
- [ ] Build DM pre-filling for accepted connections
- [ ] Build DM batch UI in dashboard
- [ ] Build connection expiry cron (14 days)
- [ ] Build fallback-to-email for declined/expired connections
- [ ] Test LinkedIn safety limits end-to-end

### Phase 6 — Analytics & Polish (Week 6-7)
- [ ] Build analytics dashboard with connection funnel
- [ ] Add daily activity logging (connections + DMs separately)
- [ ] Build morning summary notification
- [ ] Add CSV export for outreach data
- [ ] End-to-end testing of full pipeline

---

## Risk Mitigation Summary

| Risk | Mitigation |
|------|-----------|
| LinkedIn account ban | Human-in-the-loop for ALL LinkedIn actions (connect + DM). Extension only pre-fills text, never auto-clicks Send/Connect. Two-phase approach (connect first, then DM) mirrors natural human behavior. |
| Email going to spam | Dedicated domain, SPF/DKIM/DMARC, warmup period, rate limiting. |
| Apollo API costs | Free tier gives 10K credits/month. Cache results. Only discover contacts for active target companies. |
| Message quality | AI generates drafts, but all messages are reviewable. Auto-approve can be toggled per channel. |
| Rate limiting by providers | Randomized delays, respect API rate limits, exponential backoff on 429s. |
| Legal (GDPR/CAN-SPAM) | Only contact publicly available professional profiles. Include unsubscribe in emails. Don't store personal data beyond professional context. |

---

> [!IMPORTANT]
> **The single most important rule**: NO LinkedIn action is ever automated. The browser extension fills in connection notes and DMs, but **you** click "Send invitation" and **you** click "Send" on messages. The two-phase approach (connect → wait → DM) actually makes your outreach look MORE natural than tools that try to InMail strangers directly.
