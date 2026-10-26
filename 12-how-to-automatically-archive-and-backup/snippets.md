# Snippets — How to Automatically Archive and Backup Old Gmail Messages to Google Sheets (Free Apps Script Pipeline)

Tutorial: https://flowscripthq.blogspot.com/2026/10/how-to-automatically-archive-and-backup.html

## Additional snippets

```
┌─────────────────────────────────────────────────────────┐
│ 1. Gmail Search: "older_than:90d label:notifications"  │
└───────────────────────────┬─────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│ 2. Batch Metadata Extraction (Sender, Date, Body Snippet)│
└───────────────────────────┬─────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│ 3. Atomic Write: Google Sheet appendRow / setValues()    │
└───────────────────────────┬─────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│ 4. Safe State Transition: Archive or moveThreadToTrash()│
└─────────────────────────────────────────────────────────┘
```
