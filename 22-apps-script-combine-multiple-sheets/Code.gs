// Apps Script: Combine Multiple Sheets Into One Sheet (Master Sheet With a Source Column)
// Tutorial: https://flowscripthq.blogspot.com/2026/10/apps-script-combine-multiple-sheets.html
// From FlowScriptHQ — https://flowscripthq.blogspot.com

/**
 * Combines every data tab in this spreadsheet into one Master tab.
 * - Takes the header row from the first non-empty data tab.
 * - Adds a "Source Sheet" column so every row traces back to its tab.
 * - Matches columns by header name, so tabs with the same columns in a
 *   different order still line up; a column missing from a tab is left blank.
 * - Logs any column that is not in the master header instead of silently
 *   merging it into the wrong column.
 * - Skips empty tabs, tabs listed in EXCLUDE_SHEETS, and (when INCLUDE_SHEETS is non-empty) tabs not listed in INCLUDE_SHEETS.
 */
const MASTER_SHEET_NAME = 'Master';
const EXCLUDE_SHEETS = ['README']; // Add tab names here that must never merge.
const INCLUDE_SHEETS = []; // If non-empty, ONLY these tabs merge. Leave empty to merge every tab except the master and EXCLUDE_SHEETS.

function combineSheetsToMaster() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let master = ss.getSheetByName(MASTER_SHEET_NAME);
  if (!master) {
    master = ss.insertSheet(MASTER_SHEET_NAME);
  }

  const dataSheets = ss.getSheets().filter(function (sheet) {
    const name = sheet.getName();
    return name !== MASTER_SHEET_NAME &&
      (INCLUDE_SHEETS.length === 0 || INCLUDE_SHEETS.indexOf(name) !== -1) &&
      EXCLUDE_SHEETS.indexOf(name) === -1;
  });

  let header = null;
  let columnCount = 0;
  const allRows = [];
  let mergedTabCount = 0;

  dataSheets.forEach(function (sheet) {
    const lastRow = sheet.getLastRow();
    const lastCol = sheet.getLastColumn();
    // Skip tabs with no data rows (header only, or completely empty).
    if (lastRow < 2 || lastCol === 0) {
      console.log('Skipped empty tab: ' + sheet.getName());
      return;
    }
    const values = sheet.getRange(1, 1, lastRow, lastCol).getValues();
    if (!header) {
      header = values[0].slice();
      header.push('Source Sheet');
      columnCount = header.length;
    }
    // Map this tab's columns to the master header by header name, so a
    // tab with the same columns in a different order still lines up.
    // A master column missing from this tab comes out blank; a column
    // on this tab but not in the master header is logged, not silently
    // merged into the wrong column.
    const sheetHeader = values[0];
    const columnMap = [];
    for (let c = 0; c < columnCount - 1; c++) {
      columnMap.push(sheetHeader.indexOf(header[c]));
    }
    sheetHeader.forEach(function (name) {
      if (name !== 'Source Sheet' && header.indexOf(name) === -1) {
        console.log('Column not in master header, dropped: ' + name + ' (tab ' + sheet.getName() + ')');
      }
    });
    for (let r = 1; r < values.length; r++) {
      const sourceRow = values[r];
      if (sourceRow.join('') === '') {
        continue;
      }
      const row = columnMap.map(function (index) {
        return index === -1 ? '' : sourceRow[index];
      });
      row.push(sheet.getName());
      allRows.push(row);
    }
    mergedTabCount++;
  });

  master.clearContents();
  if (!header) {
    master.getRange(1, 1, 1, 2).setValues([['No data tabs found', '']]);
    console.log('No data found: every tab was empty or excluded.');
    return;
  }

  // One batch write: far faster than writing row by row, which helps
  // the script stay within the 6-minute execution limit on larger sheets.
  const output = [header].concat(allRows);
  master.getRange(1, 1, output.length, columnCount).setValues(output);
  master.setFrozenRows(1);
  master.getRange(1, 1, 1, columnCount).setFontWeight('bold');
  console.log('Master rebuilt: ' + allRows.length + ' rows from ' +
    mergedTabCount + ' tabs.');
}

/**
 * Adds a "Master Sheet" menu to the spreadsheet so anyone with edit
 * access can rebuild the master without opening the script editor.
 */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Master Sheet')
    .addItem('Combine sheets now', 'combineSheetsToMaster')
    .addToUi();
}

/**
 * Installs a daily trigger (runs combineSheetsToMaster every morning).
 * Run this once. Running it again first deletes the old trigger, so
 * you never end up with duplicate daily runs.
 */
function installDailyTrigger() {
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(function (trigger) {
    if (trigger.getHandlerFunction() === 'combineSheetsToMaster') {
      ScriptApp.deleteTrigger(trigger);
    }
  });
  ScriptApp.newTrigger('combineSheetsToMaster')
    .timeBased()
    .everyDays(1)
    .atHour(6)
    .create();
  console.log('Daily trigger installed: combineSheetsToMaster runs daily between 06:00 and 07:00 (script time zone).');
}
