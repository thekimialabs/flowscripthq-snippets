# Snippets — Google Apps Script: Move a Row to Another Sheet When Status Changes to Done

Tutorial: https://flowscripthq.blogspot.com/2026/11/google-apps-script-move-row-to-another.html

The complete scripts are in `Code.gs` (main `onEdit`, backlog mover, cross-spreadsheet version). The fragments below are edits to the main script, not standalone functions — see the tutorial for where each one goes.

## Variant A: move on a checkbox tick instead of a status word

Inside `onEdit(e)`, replace the newValue check with:

```
// Inside onEdit(e), replace the newValue check with:
const checked = e.range.getValue() === true;
if (!checked) return;
```

## Variant B: route rows to different sheets by status

Add the lookup, then replace the trigger-value check:

```
const ROUTES = {
  'Done': 'Done',
  'Cancelled': 'Cancelled',
  'Blocked': 'Blocked'
};

// Inside onEdit(e), replace the trigger-value check with:
const destinationName = ROUTES[newValue];
if (!destinationName) return;
```

Then replace the target-sheet lookup line:

```
const targetSheet = spreadsheet.getSheetByName(CONFIG.targetSheetName);
```

with:

```
const targetSheet = spreadsheet.getSheetByName(destinationName);
```

And change the not-found alert in the same block to use `destinationName` instead of `CONFIG.targetSheetName`.

## Variant D: log the move instead of just moving it

First create a "Log" sheet, then add these lines just before `deleteRow(row)` (needs the installable-trigger setup from Variant C, because a simple trigger returns an empty user email):

```
// Inside onEdit(e), just before deleteRow(row):
const logSheet = spreadsheet.getSheetByName('Log');
if (logSheet) {
  const taskName = sheet.getRange(row, 1).getValue(); // column A holds the task name; change 1 if yours is elsewhere
  logSheet.appendRow([new Date(), Session.getActiveUser().getEmail(), taskName]);
}
```
