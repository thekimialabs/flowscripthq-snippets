# Snippets — Create Google Drive Folders from Google Sheets (Apps Script)

Tutorial: https://flowscripthq.blogspot.com/2026/11/create-google-drive-folders-from-google.html

Full script: `Code.gs` in this folder (createFoldersFromSheet, helpers, onOpen menu, notify_, createDailyTrigger). Paste it into Extensions > Apps Script, save, and rename the project to `Folder Creator`.

## Sheet layout (Step 1)

Tab **Folders**, header row: Folder Name (A), Parent Path (B), Status (C), Folder URL (D). Column E optional: Share With email. Columns C and D stay blank; the script fills them in.

Sample rows:

```
Folder Name | Parent Path       | Status | Folder URL
Acme Corp   | Clients           |        |
Globex Ltd  | Clients           |        |
Q1 Planning | Projects/2026     |        |
Invoices    | Clients/Acme Corp |        |
```

A parent path uses `/` between levels. Leave column B blank to create the folder directly in My Drive (or under `PARENT_FOLDER_ID` if set). Do not put a slash inside a folder name in column A: only column B is split on slashes. Do not list the same folder name twice under the same parent path in one run: the script reuses the first folder it finds, so both rows end up pointing at the same folder.

## Settings (CONFIG at the top of Code.gs)

- `SHEET_NAME = 'Folders'` — tab with the folder list.
- `HEADER_ROWS = 1`.
- `STATUS_COLUMN = 3` — column C.
- `PARENT_FOLDER_ID = ''` — ID of a Drive folder to create everything under (the part after `/folders/` in its URL). Leave blank for My Drive.
- `MAX_ROWS_PER_RUN = 200` — folders created per run; 0 means no limit. A daily trigger picks up the next chunk on the next run, since Done rows are skipped.

## How it works

- One read of the sheet, one batched write of statuses and URLs. Re-running is safe: rows already marked `Done` (case-insensitive check) are skipped, and `getOrCreateFolder` looks up a folder by name before creating one, so a row with a blank status still reuses the existing folder instead of creating a second copy.
- `resolveParentFolder` walks a path such as `Clients/Acme Corp`, creating each missing level.
- `notify_` shows a pop-up when run from the sheet menu and writes to the execution log when run from the editor or a trigger.
- A run that stops before the final write-back leaves no `Done` markers for its last rows, so the next run processes them again; `getOrCreateFolder` still prevents duplicates.

## Triggers

- **Daily schedule:** run `createDailyTrigger` once from the editor. It deletes any earlier trigger for the same function, then creates a 7am daily run (7am in the script project's timezone, under Project Settings). New rows added during the day are picked up the next morning.
- **On form submit:** replace the `timeBased()` chain with `ScriptApp.newTrigger('createFoldersFromSheet').forSpreadsheet(SpreadsheetApp.getActiveSpreadsheet()).onFormSubmit().create()`. Each submission usually creates its folder within a minute or so; Google gives no exact latency guarantee.
- A simple `onEdit` trigger cannot do this job: simple triggers run without authorisation and cannot call `DriveApp`.

## Share each new folder with a teammate (Going further)

Add column E headed `Share With`, one email address per row. Add these functions at the end of the script file:

```javascript
function createFolderIfMissing(parent, name) {
  const existing = parent.getFoldersByName(name);
  if (existing.hasNext()) return { folder: existing.next(), created: false };
  return { folder: parent.createFolder(name), created: true };
}

function shareFolder(folder, email) {
  folder.addEditor(email);
}
```

Then change the read in `createFoldersFromSheet` from `getRange(2, 1, lastRow - 1, 4)` to `getRange(2, 1, lastRow - 1, 5)`, and replace these two lines inside the `try` block:

```javascript
const folder = getOrCreateFolder(parent, name);
output.push(['Done', folder.getUrl()]);
```

with these five:

```javascript
const result = createFolderIfMissing(parent, name);
const folder = result.folder;
const shareEmail = String(values[i][4] || '').trim();
if (result.created && shareEmail) shareFolder(folder, shareEmail);
output.push(['Done', folder.getUrl()]);
```

The `result.created` check stops the script sharing a folder it only reused, so re-running never re-shares.

## Copy a template file into each new folder (Going further)

Add `TEMPLATE_FILE_ID: '',` to CONFIG and paste the template file's ID between the quotes (the part after `/d/` in the file's Drive URL). Add this function:

```javascript
function copyTemplateInto(folder) {
  if (!CONFIG.TEMPLATE_FILE_ID) return;
  const existing = folder.getFilesByName('Welcome');
  if (existing.hasNext()) return;
  const template = DriveApp.getFileById(CONFIG.TEMPLATE_FILE_ID);
  template.makeCopy('Welcome', folder);
}
```

Add one line after the folder is created in `createFoldersFromSheet`, inside the same `try` block: `copyTemplateInto(folder);`. The Welcome check stops a re-run copying the template twice.

## Email the requester the new folder link (Going further)

Add column F headed `Notify Email`, read the address from it, and call `MailApp.sendEmail(email, 'Your folder is ready', folder.getUrl())` after the folder is created.

## Shared Drive version (FAQ)

`DriveApp` cannot create folders in a Shared Drive. Enable the Advanced Drive service (Services, plus icon, then Drive API) and use this function in place of the `getOrCreateFolder` call inside the `try` block, changing the next line to build the link from the ID it returns:

```javascript
function getOrCreateSharedDriveFolder(parentFolderId, name) {
  const query = "name = '" + name.replace(/'/g, "\\'") + "' and '" + parentFolderId
    + "' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false";

  const found = Drive.Files.list({
    q: query,
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
  });

  if (found.files && found.files.length > 0) return found.files[0].id;

  const created = Drive.Files.create(
    { name: name, mimeType: 'application/vnd.google-apps.folder', parents: [parentFolderId] },
    { supportsAllDrives: true });

  return created.id;
}
```

It returns the folder ID rather than a Folder object, so build the link as `https://drive.google.com/drive/folders/` plus the ID when writing column D.

## Limits

- A few hundred rows run comfortably inside the six-minute Apps Script execution limit: one read, one write, up to two Drive calls per folder level (a name lookup, plus a create when needed). Several thousand rows can exceed the limit; `MAX_ROWS_PER_RUN` (default 200) chunks the work across daily runs.
- If a run fails with a rate-limit error, wait a few minutes and run it again. Rows already marked `Done` are skipped.

## Common failures

- **Duplicate folder on re-run:** the first run did not finish and write `Done` into column C. `getOrCreateFolder` still reuses the folder and writes `Done` and the URL. Duplicates appear only when two folders with the same name already exist inside the same parent (created by hand), or two rows in the same run list the same name under the same parent. Check column D for repeated URLs.
- **Folders menu does not appear:** refresh the sheet tab after saving the script; a sheet already open before the script was saved does not get the menu until it reloads. Check the function is named exactly `onOpen` and the project saved without a syntax error.
- **Script runs but no folders appear:** the sheet tab name must match `SHEET_NAME`; column A must have folder names below row 1; check the Executions page for the error; check the rows are not already marked `Done`.
- **Daily trigger never runs:** check the trigger exists under Triggers in the editor, check the script project timezone under Project Settings, and check the Executions page. A trigger runs as the person who created it, so if that person's access to the sheet or destination is removed, the trigger stops.
- **"Google hasn't verified this app":** expected for code you wrote yourself. Click Advanced, then Go to Folder Creator (unsafe), and check the scopes before allowing them: spreadsheets, Drive, and the sheet UI. Never approve those scopes for a script copied from a source you do not trust.
