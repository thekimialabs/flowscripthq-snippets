// How to Automatically Archive and Backup Old Gmail Messages to Google Sheets (Free Apps Script Pipeline)
// Tutorial: https://flowscripthq.blogspot.com/2026/10/how-to-automatically-archive-and-backup.html
// From FlowScriptHQ — https://flowscripthq.blogspot.com

/**
 * FlowScriptHQ - Autonomous Gmail Archiving & Retention Engine
 * Backs up emails older than N days to Google Sheets and moves threads to Trash.
 */
function archiveOldGmailToSheet() {
  const targetSheetName = "EmailArchive";
  const daysOld = 90;              // Archive emails older than 90 days
  const batchLimit = 50;           // Process 50 threads per run to stay well under quota
  const moveToTrash = true;        // true = move to Trash; false = archive (remove from Inbox)

  // Standard Gmail search query
  const searchQuery = `older_than:${daysOld}d -is:starred -is:chat`;

  // 1. Fetch matching threads
  const threads = GmailApp.search(searchQuery, 0, batchLimit);
  if (!threads || threads.length === 0) {
    Logger.log("No matching emails found for archiving.");
    return;
  }

  // 2. Prepare Target Sheet
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(targetSheetName);
  if (!sheet) {
    sheet = ss.insertSheet(targetSheetName);
    // Initialize Header Row
    sheet.appendRow(["Message ID", "Date", "From", "To", "Subject", "Body Snippet", "Thread Link"]);
    sheet.getRange(1, 1, 1, 7).setFontWeight("bold").setBackground("#f1f5f9");
    sheet.setFrozenRows(1);
  }

  const rowsToInsert = [];
  const processedThreads = [];

  // 3. Extract Email Metadata
  for (let i = 0; i < threads.length; i++) {
    const thread = threads[i];
    const messages = thread.getMessages();

    for (let j = 0; j < messages.length; j++) {
      const msg = messages[j];
      const messageId = msg.getId();
      const date = Utilities.formatDate(msg.getDate(), Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss");
      const from = msg.getFrom();
      const to = msg.getTo();
      const subject = msg.getSubject() || "(No Subject)";
      
      // Clean snippet (first 300 characters, remove newlines)
      const snippet = msg.getPlainBody().substring(0, 300).replace(/(\r\n|\n|\r)/gm, " ");
      const threadLink = `https://mail.google.com/mail/u/0/#all/${thread.getId()}`;

      rowsToInsert.push([messageId, date, from, to, subject, snippet, threadLink]);
    }
    processedThreads.push(thread);
  }

  // 4. Batch Write to Spreadsheet
  if (rowsToInsert.length > 0) {
    const startRow = sheet.getLastRow() + 1;
    const outputRange = sheet.getRange(startRow, 1, rowsToInsert.length, rowsToInsert[0].length);
    outputRange.setValues(rowsToInsert);
  }

  // 5. Safely Move Processed Threads to Trash or Archive
  for (let k = 0; k < processedThreads.length; k++) {
    if (moveToTrash) {
      processedThreads[k].moveToTrash();
    } else {
      processedThreads[k].moveToArchive();
    }
  }

  Logger.log(`Successfully archived ${processedThreads.length} threads (${rowsToInsert.length} messages).`);
}
