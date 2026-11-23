/**
 * Creates Google Drive folders from the rows of a sheet.
 * Column A: folder name. Column B: parent path (optional, use / for nesting).
 * Column C: status, written by the script. Column D: folder URL, written by the script.
 * Rows already marked Done are skipped, so re-running the script is safe.
 */
const CONFIG = {
  SHEET_NAME: 'Folders',
  HEADER_ROWS: 1,
  STATUS_COLUMN: 3,
  // Optional: ID of a Drive folder to create everything under.
  // Find it in the folder URL, after /folders/. Leave blank for My Drive.
  PARENT_FOLDER_ID: '',
  // Folders created per run. 0 means no limit. A daily trigger picks up
  // the next chunk on the next run, since Done rows are skipped.
  MAX_ROWS_PER_RUN: 200,
};

function createFoldersFromSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.SHEET_NAME);
  if (!sheet) throw new Error('Sheet "' + CONFIG.SHEET_NAME + '" not found.');
  const lastRow = sheet.getLastRow();
  if (lastRow <= CONFIG.HEADER_ROWS) {
    notify_('No folder rows found below the header.');
    return;
  }
  const values = sheet.getRange(2, 1, lastRow - 1, 4).getValues();
  const root = CONFIG.PARENT_FOLDER_ID
    ? DriveApp.getFolderById(CONFIG.PARENT_FOLDER_ID)
    : DriveApp.getRootFolder();
  const output = [];
  let created = 0;
  let skipped = 0;
  for (let i = 0; i < values.length; i++) {
    if (CONFIG.MAX_ROWS_PER_RUN > 0 && created >= CONFIG.MAX_ROWS_PER_RUN) break;
    const name = String(values[i][0] || '').trim();
    const parentPath = String(values[i][1] || '').trim();
    const status = String(values[i][2] || '').trim();
    if (!name) {
      output.push([values[i][2], values[i][3]]);
      continue;
    }
    if (status.toLowerCase() === 'done') {
      output.push([values[i][2], values[i][3]]);
      skipped++;
      continue;
    }
    try {
      const parent = resolveParentFolder(root, parentPath);
      const folder = getOrCreateFolder(parent, name);
      output.push(['Done', folder.getUrl()]);
      created++;
    } catch (err) {
      output.push(['Error: ' + err.message, values[i][3]]);
    }
  }
  sheet.getRange(2, CONFIG.STATUS_COLUMN, output.length, 2).setValues(output);
  const remaining = values.length - output.length;
  notify_('Done: ' + created + ' folder(s) created, ' + skipped + ' row(s) skipped.'
    + (remaining > 0 ? ' ' + remaining + ' row(s) left for the next run.' : ''));
}

/**
 * Walks a path such as "Clients/Acme Corp", creating each level
 * that does not exist yet, and returns the deepest folder.
 */
function resolveParentFolder(root, parentPath) {
  if (!parentPath) return root;
  const parts = parentPath.split('/')
    .map(function (p) { return p.trim(); })
    .filter(function (p) { return p.length > 0; });
  let current = root;
  for (let i = 0; i < parts.length; i++) {
    current = getOrCreateFolder(current, parts[i]);
  }
  return current;
}

/**
 * Returns the folder with this name inside the parent, or creates it.
 * This is what stops re-runs from creating duplicate folders.
 */
function getOrCreateFolder(parent, name) {
  const existing = parent.getFoldersByName(name);
  if (existing.hasNext()) return existing.next();
  return parent.createFolder(name);
}

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Folders')
    .addItem('Create folders now', 'createFoldersFromSheet')
    .addToUi();
}

/**
 * Shows a message in the sheet when run from the sheet menu, and writes to the
 * execution log when run from the editor or by a trigger, where no sheet UI exists.
 */
function notify_(message) {
  try {
    SpreadsheetApp.getUi().alert(message);
  } catch (e) {
    Logger.log(message);
  }
}

// Daily trigger: run createDailyTrigger once from the editor.
// It deletes any earlier trigger for the same function, then creates a 7am daily run.
function createDailyTrigger() {
  const triggers = ScriptApp.getProjectTriggers();
  for (let i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === 'createFoldersFromSheet') {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }
  ScriptApp.newTrigger('createFoldersFromSheet')
    .timeBased()
    .everyDays(1)
    .atHour(7)
    .create();
  notify_('Daily trigger created. New rows are processed every morning at 7am.');
}
