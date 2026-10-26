// How to Auto-Sort Google Sheets on Edit or Form Submit using Apps Script (Complete Guide)
// Tutorial: https://flowscripthq.blogspot.com/2026/10/how-to-auto-sort-google-sheets-on-edit.html
// From FlowScriptHQ — https://flowscripthq.blogspot.com

/**
 * FlowScriptHQ - Autonomous Single-Column Auto-Sort
 * Trigger: Simple onEdit(e)
 */
function onEdit(e) {
  // 1. Guard Clauses: Ensure event object exists
  if (!e || !e.range) return;

  const targetSheetName = "Tasks"; // Target tab name
  const sortColumnNumber = 4;       // Column D = Due Date
  const headerRowCount = 1;         // Number of header rows to preserve
  const isAscending = true;          // true = A-Z / Oldest first; false = Z-A

  const range = e.range;
  const sheet = range.getSheet();

  // 2. Performance Filter: Ignore edits on wrong sheets or outside the target column
  if (sheet.getName() !== targetSheetName) return;
  if (range.getColumn() !== sortColumnNumber) return;
  if (range.getRow() <= headerRowCount) return; // Ignore edits to headers

  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();

  // 3. Ensure there is actual data beyond header rows
  if (lastRow <= headerRowCount) return;

  // 4. Target ONLY the data range (excluding frozen header rows)
  const dataRange = sheet.getRange(
    headerRowCount + 1,
    1,
    lastRow - headerRowCount,
    lastCol
  );

  // 5. Execute Sort
  dataRange.sort({ column: sortColumnNumber, ascending: isAscending });
}

// --------------------------------------------------

/**
 * FlowScriptHQ - Multi-Criteria Cascading Auto-Sort
 * Sorts primary: Column 2 (Status/Priority DESC), secondary: Column 3 (Date ASC)
 */
function onEdit(e) {
  if (!e || !e.range) return;

  const targetSheetName = "IncidentQueue";
  const sheet = e.range.getSheet();

  if (sheet.getName() !== targetSheetName) return;

  const editedCol = e.range.getColumn();
  // Trigger if either Column B (Priority) OR Column C (Date) is modified
  if (editedCol !== 2 && editedCol !== 3) return;
  if (e.range.getRow() <= 1) return;

  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();
  if (lastRow <= 1) return;

  const dataRange = sheet.getRange(2, 1, lastRow - 1, lastCol);

  // Multi-column sorting specifications
  const sortCriteria = [
    { column: 2, ascending: false }, // Primary: Priority (Z to A)
    { column: 3, ascending: true }   // Secondary: Created Date (Oldest first)
  ];

  dataRange.sort(sortCriteria);
}

// --------------------------------------------------

/**
 * FlowScriptHQ - Auto-Sort on Google Forms Intake
 * Designed for Installable Triggers (From spreadsheet > On form submit)
 */
function autoSortOnFormSubmit(e) {
  // Use SpreadsheetApp active or explicit Sheet ID
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("Form Responses 1");
  
  if (!sheet) return;

  // Use LockService to prevent race conditions during rapid concurrent submissions
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) return; // Wait up to 10s for lock

  try {
    const lastRow = sheet.getLastRow();
    const lastCol = sheet.getLastColumn();
    const headerRows = 1;

    if (lastRow <= headerRows) return;

    // Target rows 2 through bottom
    const dataRange = sheet.getRange(headerRows + 1, 1, lastRow - headerRows, lastCol);

    // Sort Column 1 (Timestamp) in Descending order (Newest submission at the top)
    dataRange.sort({ column: 1, ascending: false });

  } finally {
    lock.releaseLock();
  }
}
