# HireLens LinkedIn Assisted Discovery Queue

This flow replaces paid people-data APIs with a low-cost, human-assisted browser queue.
It is designed to keep bulk outreach practical while avoiding automatic LinkedIn actions.

## Goal

User adds many companies once, then works through a guided queue:

1. HireLens creates LinkedIn people-search tasks for each company.
2. The Chrome Extension opens one LinkedIn search page at a time.
3. The extension previews visible results and default-selects the top matches.
4. User clicks `Capture Selected & Next`.
5. HireLens saves selected profiles as outreach contacts.
6. The extension advances to the next search task.

## Safety Boundary

The extension should assist the user, not run invisible scraping.

- No background scraping.
- No pagination scraping.
- No automatic LinkedIn connection requests.
- No automatic LinkedIn DMs.
- No automatic Send/Connect clicks.
- Capture only visible search results after the user reviews the page.

## Queue Flow

```txt
User adds companies
  |
  v
POST /api/outreach/discovery-queues
  |
  v
Backend creates tasks:
  Google + Recruiter
  Google + Engineering Manager
  Google + Software Engineer
  Microsoft + Recruiter
  ...
  |
  v
Extension calls GET /api/outreach/discovery-queues/:queueId/next
  |
  v
Extension opens task.searchUrl
  |
  v
Extension extracts visible results into a preview panel
  |
  v
User clicks Capture Selected & Next
  |
  v
POST /api/outreach/discovery-queues/tasks/:taskId/capture
  |
  v
Backend dedupes and saves OutreachContact rows
  |
  v
Extension fetches next task
```

## Search Templates

Default queue tasks:

| Contact Type | LinkedIn Search |
| --- | --- |
| Recruiter | `Recruiter at {company}` |
| Hiring Manager | `Engineering Manager at {company}` |
| Engineer | `Software Engineer at {company}` |

The queue can later support custom templates like:

- `Technical Recruiter at {company}`
- `Talent Acquisition at {company}`
- `Backend Engineer at {company}`
- `Senior Software Engineer at {company}`

## Captured Data

The extension sends selected visible results:

```json
{
  "contacts": [
    {
      "name": "Sarah Chen",
      "role": "Technical Recruiter",
      "company": "Google",
      "linkedinUrl": "https://www.linkedin.com/in/sarahchen"
    }
  ]
}
```

Backend stores:

- `name`
- `role`
- `company`
- `linkedinUrl`
- `contactType`
- `provider = LINKEDIN_ASSISTED`
- `linkedinStatus = DISCOVERED`

## Refined Outreach Direction

LinkedIn and email outreach now follow separate tracks.

LinkedIn track:

- Capture visible LinkedIn profiles through the extension.
- Generate a connection note per captured profile.
- Open profiles one by one.
- User clicks Connect.
- After acceptance, generate a dedicated DM.
- Extension pre-fills the DM.
- User clicks Send.

Email track:

- User provides known recipient emails.
- User provides sender email credentials.
- User provides message content and resume link or uploaded resume.
- Backend sends emails one by one through cron.
- Backend schedules one follow-up after 7 days if no reply is recorded.
- Sequence stops after the follow-up or after a reply.

## MVP Backend Endpoints

```txt
POST /api/outreach/discovery-queues
GET  /api/outreach/discovery-queues/:queueId
GET  /api/outreach/discovery-queues/:queueId/next
POST /api/outreach/discovery-queues/tasks/:taskId/opened
POST /api/outreach/discovery-queues/tasks/:taskId/capture
POST /api/outreach/discovery-queues/tasks/:taskId/skip
```

## MVP Extension Behavior

1. User starts a queue from HireLens dashboard.
2. Extension receives `queueId`.
3. Extension calls `/next`.
4. Extension navigates current tab to `searchUrl`.
5. Content script renders a small floating HireLens panel.
6. Panel previews visible profile cards.
7. User clicks `Capture Selected & Next`.
8. Extension posts selected results to backend.
9. Extension repeats until no task remains.
