// How to Send an Automatic Email from Google Sheets When a Cell Changes (Apps Script Trigger Guide)
// Tutorial: https://flowscripthq.blogspot.com/2026/10/how-to-send-automatic-email-from-google.html
// From FlowScriptHQ — https://flowscripthq.blogspot.com

// ===== CONFIG — edit these four lines =====
const SHEET_NAME = 'Tasks';
const STATUS_COLUMN = 3;          // Column C
const TRIGGER_VALUE = 'Escalated';
const RECIPIENT = 'manager@example.com';  // who receives the email
// ==========================================

function onStatusChange(e) {
  // Attach this as an INSTALLABLE onEdit trigger (Step 3).
  // Do NOT name it onEdit, or it will fire twice.
  if (!e || !e.range) return;

  const range = e.range;
  // Only react to single-cell edits (ignores multi-cell pastes)
  if (range.getWidth() !== 1 || range.getHeight() !== 1) return;

  const sheet = range.getSheet();
  if (sheet.getName() !== SHEET_NAME) return;
  if (range.getRow() === 1) return;                 // skip the header row
  if (range.getColumn() !== STATUS_COLUMN) return;

  if (e.value !== TRIGGER_VALUE) return;            // wrong value — do nothing

  const row = range.getRow();
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const data = sheet.getRange(row, 1, 1, sheet.getLastColumn()).getValues()[0];

  const lines = headers.map(function (h, i) { return h + ': ' + data[i]; });

  MailApp.sendEmail(
    RECIPIENT,
    'Escalated: ' + data[0],
    'A row was just marked "' + TRIGGER_VALUE + '" in the "' + SHEET_NAME + '" sheet.

' +
    lines.join('
') + '

Row number: ' + row
  );
}

function createStatusTrigger() {
  // Run this function ONCE manually to install the trigger.
  ScriptApp.newTrigger('onStatusChange')
    .forSpreadsheet(SpreadsheetApp.getActive())
    .onEdit()
    .create();
}
