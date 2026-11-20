// Removes duplicate rows by one key column (email, ID, staff number).
// Reads the source tab once, keeps one row per key, and writes the
// cleaned rows to a separate tab. The source tab is never changed.
// Columns: A Timestamp, B Name, C Email, D Ticket type

const SOURCE_SHEET = 'Responses';  // Tab with the raw data
const OUTPUT_SHEET = 'Cleaned';    // Tab the script writes to (created if missing)
const KEY_COLUMN = 3;              // Column C: Email. Duplicates share this value.
const KEEP_LATEST = true;          // true = keep the last row per key in sheet order, false = keep the first
const HEADER_ROWS = 1;             // Header row is copied, never deduped

function dedupeRows() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const source = ss.getSheetByName(SOURCE_SHEET);
  if (!source) {
    throw new Error('No tab named "' + SOURCE_SHEET + '" found.');
  }
  const values = source.getDataRange().getValues();
  if (values.length <= HEADER_ROWS) {
    let output = ss.getSheetByName(OUTPUT_SHEET);
    if (!output) output = ss.insertSheet(OUTPUT_SHEET);
    output.clearContents();
    output.getRange(1, 1, 1, values[0].length).setValues([values[0]]);
    Logger.log('Nothing to dedupe: only the header row is present. Cleaned was reset to the header.');
    return;
  }
  const header = values[0];
  const rows = values.slice(HEADER_ROWS);

  const seen = new Set();
  const kept = [];
  // Walk bottom to top when keeping the latest row, top to bottom
  // when keeping the first. A Set lookup is instant, so this stays
  // fast even on thousands of rows.
  const ordered = KEEP_LATEST ? rows.slice().reverse() : rows;
  for (const row of ordered) {
    const rawKey = row[KEY_COLUMN - 1];
    const key = (rawKey === null || rawKey === undefined ? '' : String(rawKey)).trim().toLowerCase();
    if (key === '') {
      // A blank key is not a duplicate of anything. Keep the row.
      kept.push(row);
      continue;
    }
    if (seen.has(key)) continue;
    seen.add(key);
    kept.push(row);
  }
  if (KEEP_LATEST) kept.reverse(); // Restore the original row order.

  let output = ss.getSheetByName(OUTPUT_SHEET);
  if (!output) output = ss.insertSheet(OUTPUT_SHEET);
  output.clearContents();
  output.getRange(1, 1, 1, header.length).setValues([header]);
  if (kept.length > 0) {
    output.getRange(2, 1, kept.length, header.length).setValues(kept);
  }
  Logger.log('Removed ' + (rows.length - kept.length) +
    ' duplicate rows. ' + kept.length +
    ' unique rows written to "' + OUTPUT_SHEET + '".');
}

// In-place version: rebuilds Cleaned, then writes the cleaned rows back over the source tab.
// Test on a copy first. It clears the source tab before writing.
function dedupeInPlace() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const source = ss.getSheetByName(SOURCE_SHEET);
  if (!source) {
    throw new Error('No tab named "' + SOURCE_SHEET + '" found.');
  }
  dedupeRows();
  const cleaned = ss.getSheetByName(OUTPUT_SHEET);
  if (!cleaned) {
    throw new Error('No tab named "' + OUTPUT_SHEET + '" found. Run dedupeRows first.');
  }
  const values = cleaned.getDataRange().getValues();
  if (values.length <= HEADER_ROWS) {
    throw new Error('Nothing to write back: the source has only a header row. The original tab was not changed.');
  }
  source.clearContents();
  source.getRange(1, 1, values.length, values[0].length).setValues(values);
}

// Menu: adds a Dedupe menu so anyone can run it from the sheet.
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Dedupe')
    .addItem('Remove duplicate rows', 'dedupeRows')
    .addToUi();
}
