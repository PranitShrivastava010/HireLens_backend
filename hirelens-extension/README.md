# HireLens LinkedIn Discovery Extension

Manifest V3 extension for the LinkedIn Assisted Discovery Queue.

## Install Locally

1. Open `chrome://extensions`.
2. Enable `Developer mode`.
3. Click `Load unpacked`.
4. Select the `hirelens-extension` folder.

## Use

1. Create a discovery queue from the backend:

```txt
POST /api/outreach/discovery-queues
```

2. Open the extension popup.
3. Fill:

```txt
API base: http://localhost:5000
Auth token: your HireLens JWT access token
Queue ID: the discovery queue id
```

4. Click `Start / Continue`.
5. On LinkedIn search results, review the HireLens panel.
6. Click `Capture Selected & Next` or `Skip & Next`.

## Notes

- The extension captures visible LinkedIn people-search results only.
- It does not auto-connect, auto-DM, or click LinkedIn send buttons.
- The backend saves captured contacts with `provider = LINKEDIN_ASSISTED`.

