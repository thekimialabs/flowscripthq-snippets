# Snippets — Power Automate: How to Fix 'ActionBranchingConditionNotSatisfied' Error (Run After Guide)

Tutorial: https://flowscripthq.blogspot.com/2026/10/power-automate-how-to-fix.html

## Power Automate expressions

```
// 1. In 'Filter Array' action:
From: result('Scope_Try')

// 2. Condition:
item()?['status'] is equal to 'Failed'

// 3. Compose the error notification:
concat(
  'Action Failed: ', body('Filter_Array')?[0]?['name'], 
  ' | Error: ', body('Filter_Array')?[0]?['error']?['message']
)
```

## Additional snippets

```
[Trigger: When an HTTP Webhook or Form is received]
       │
       ▼
┌──────────────────────────────────────────────┐
│  SCOPE: Try (Main Business Logic)           │
│  - Query SharePoint / SQL Database           │
│  - Execute Complex Data Transformations      │
│  - Send Webhook / HTTP Call                  │
└──────────────────────────────────────────────┘
       │
       ├──► Run After: has failed / timed out
       │
┌──────────────────────────────────────────────┐
│  SCOPE: Catch (Error Handling & Alerting)   │
│  - Extract result('Scope_Try') error message │
│  - Post incident card to Microsoft Teams     │
│  - Send diagnostic alert to SysAdmin         │
└──────────────────────────────────────────────┘
       │
       ├──► Run After: is successful / has skipped
       │
┌──────────────────────────────────────────────┐
│  SCOPE: Finally (Always Runs)               │
│  - Update master tracking status             │
│  - Release session locks or temp files       │
└──────────────────────────────────────────────┘
```
