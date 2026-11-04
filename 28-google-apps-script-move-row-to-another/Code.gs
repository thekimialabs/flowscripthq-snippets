// Google Apps Script: Move a Row to Another Sheet When Status Changes to Done
// Tutorial: https://flowscripthq.blogspot.com/2026/11/google-apps-script-move-row-to-another.html
// From FlowScriptHQ — https://flowscripthq.blogspot.com

/**
 * Moves a row from "Tasks" to "Done" when its status becomes "Done".
 * Keeps formatting: moveTo() carries values AND formatting, unlike
 * appendRow(), which copies values only.
 *
 * CONFIG: change these five values to match your sheet.
 */
const CONFIG = {
  sourceSheetName: 'Tasks',
  targetSheetName: 'Done',
  statusColumn: 5,        // Column E. A = 1, B = 2, C = 3, D = 4, E = 5.
  triggerValue: 'Done',
  headerRow: 1            // Row 1 holds headers and is never moved.
};

function onEdit(e) {
  // Running the function by hand in the editor passes no event object,
  // so bail out instead of throwing "Cannot read properties of undefined".
  if (!e || !e.range) return;

  const sheet = e.range.getSheet();

  // Only act on the source sheet, the status column, and data rows.
  if (sheet.getName() !== CONFIG.sourceSheetName) return;
  if (e.range.getColumn() !== CONFIG.statusColumn) return;
  const row = e.range.getRow();
  if (row <= CONFIG.headerRow) return;

  // e.value is the new cell value as a string. Trim it so a trailing
  // space typed after "Done" does not silently break the match.
  const newValue = (e.value === undefined || e.value === null)
    ? ''
    : String(e.value).trim();
  if (newValue !== CONFIG.triggerValue) return;

  const spreadsheet = e.source;
  const targetSheet = spreadsheet.getSheetByName(CONFIG.targetSheetName);
  if (!targetSheet) {
    SpreadsheetApp.getUi().alert(
      'Target sheet "' + CONFIG.targetSheetName + '" was not found. ' +
      'Create it, then change the status again.');
    return;
  }

  const numColumns = sheet.getLastColumn();
  const sourceRange = sheet.getRange(row, 1, 1, numColumns);

  // If the target sheet is completely empty, copy the header row first
  // so the moved row does not land in row 1 and become a fake header.
  let targetRow = targetSheet.getLastRow() + 1;
  if (targetSheet.getLastRow() === 0) {
    const headerRange = sheet.getRange(CONFIG.headerRow, 1, 1, numColumns);
    headerRange.copyTo(targetSheet.getRange(1, 1, 1, numColumns));
    targetRow = 2;
  }

  // moveTo() moves values and formatting, then clears the source cells.
  // It does not remove the row itself, so deleteRow() follows.
  // Capture the row number first: deleting after the move is safe,
  // deleting before it would shift the row you just moved.
  sourceRange.moveTo(targetSheet.getRange(targetRow, 1, 1, numColumns));
  sheet.deleteRow(row);
}

// --------------------------------------------------

/**
 * Moves every row already marked "Done" to the target sheet.
 * Run once from the editor: select moveExistingDoneRows, then Run.
 * Loops from the bottom up so deleting a row never shifts
 * the row numbers of rows still to be checked.
 */
function moveExistingDoneRows() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = spreadsheet.getSheetByName(CONFIG.sourceSheetName);
  const targetSheet = spreadsheet.getSheetByName(CONFIG.targetSheetName);
  if (!sheet || !targetSheet) {
    SpreadsheetApp.getUi().alert('Source or target sheet was not found. Check the CONFIG block.');
    return;
  }
  for (let row = sheet.getLastRow(); row > CONFIG.headerRow; row--) {
    const value = String(sheet.getRange(row, CONFIG.statusColumn).getValue()).trim();
    if (value !== CONFIG.triggerValue) continue;
    const numColumns = sheet.getLastColumn();
    let targetRow = targetSheet.getLastRow() + 1;
    if (targetSheet.getLastRow() === 0) {
      sheet.getRange(CONFIG.headerRow, 1, 1, numColumns)
        .copyTo(targetSheet.getRange(1, 1, 1, numColumns));
      targetRow = 2;
    }
    sheet.getRange(row, 1, 1, numColumns)
      .moveTo(targetSheet.getRange(targetRow, 1, 1, numColumns));
    sheet.deleteRow(row);
  }
}

// --------------------------------------------------

function moveRowOnEdit(e) {
  if (!e || !e.range) return;
  const sheet = e.range.getSheet();
  if (sheet.getName() !== 'Tasks') return;
  if (e.range.getColumn() !== 5) return;
  const row = e.range.getRow();
  if (row <= 1) return;
  const newValue = (e.value === undefined || e.value === null)
    ? ''
    : String(e.value).trim();
  if (newValue !== 'Done') return;
  const target = SpreadsheetApp.openById('PASTE_SPREADSHEET_ID_HERE')
    .getSheetByName('Done');
  if (!target) return;
  const numColumns = sheet.getLastColumn();
  const values = sheet.getRange(row, 1, 1, numColumns).getValues()[0];
  target.appendRow(values);
  sheet.deleteRow(row);
}
