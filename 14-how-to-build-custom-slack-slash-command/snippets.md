# Snippets — How to Build a Custom Slack Slash Command with Google Apps Script (Zero-Cost Serverless Backend)

Tutorial: https://flowscripthq.blogspot.com/2026/10/how-to-build-custom-slack-slash-command.html

## Additional snippets

```
┌────────────────────────────────────────────────────────┐
│ 1. User types in Slack: "/lead Jane Doe, Apex Global" │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼ (HTTP POST application/x-www-form-urlencoded)
┌────────────────────────────────────────────────────────┐
│ 2. Google Apps Script Web App: doPost(e)               │
│    - Extracts e.parameter.text, user_name, command     │
│    - Acquires LockService concurrency lock             │
│    - Appends row into Google Sheets database           │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼ (Sub-3-second HTTP 200 JSON Response)
┌────────────────────────────────────────────────────────┐
│ 3. Slack Channel displays formatted Ephemeral / In-Channel card:
│    "✅ Lead 'Jane Doe' saved by @alex to Google Sheets" │
└────────────────────────────────────────────────────────┘
```
