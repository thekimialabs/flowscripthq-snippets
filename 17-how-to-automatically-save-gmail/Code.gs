// How to Automatically Save Gmail Attachments to Google Drive with Apps Script (Free Backup Guide)
// Tutorial: https://flowscripthq.blogspot.com/2026/10/how-to-automatically-save-gmail.html
// From FlowScriptHQ — https://flowscripthq.blogspot.com

// ===== CONFIG — edit these four lines =====
const SEARCH_QUERY = 'has:attachment newer_than:7d'; // which emails to process
const FOLDER_NAME = 'Gmail Attachments';             // Drive folder to save into
const PROCESSED_LABEL = 'SavedToDrive';              // label marking processed threads (keep it one word — spaces break the -label: search below)
const MAX_THREADS = 20;                              // safety cap per run
// ============================================

function saveGmailAttachments() {
  const folder = getOrCreateFolder_(FOLDER_NAME);
  const label = getOrCreateLabel_(PROCESSED_LABEL);

  // Skip threads we already processed on an earlier run
  const query = SEARCH_QUERY + ' -label:' + PROCESSED_LABEL;
  const threads = GmailApp.search(query, 0, MAX_THREADS);
  let saved = 0;

  threads.forEach(function (thread) {
    thread.getMessages().forEach(function (message) {
      // includeInlineImages:false keeps logos and signature images out of your Drive folder
      message.getAttachments({ includeInlineImages: false, includeAttachments: true }).forEach(function (attachment) {
        folder.createFile(attachment.copyBlob()).setName(fileNameFor_(message, attachment));
        saved++;
      });
    });
    thread.addLabel(label); // never process this thread again
  });

  Logger.log('Done. Saved ' + saved + ' attachment(s) from ' + threads.length + ' thread(s).');
}

function getOrCreateFolder_(name) {
  const folders = DriveApp.getFoldersByName(name);
  return folders.hasNext() ? folders.next() : DriveApp.createFolder(name);
}

function getOrCreateLabel_(name) {
  return GmailApp.getUserLabelByName(name) || GmailApp.createLabel(name);
}

// Builds descriptive filenames: "2026-10-16 - sender name - invoice.pdf"
// Strips characters Google Drive can't handle in file names.
function fileNameFor_(message, attachment) {
  const date = Utilities.formatDate(message.getDate(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
  const from = message.getFrom().replace(/[<>"/\\|:?*]/g, '').substring(0, 40);
  const name = attachment.getName().replace(/[<>"/\\|:?*]/g, '');
  return date + ' - ' + from + ' - ' + name;
}

// --------------------------------------------------

function subfolderFor_(parent, message) {
  var domain = message.getFrom().split('@').pop().replace(/[^a-z0-9.\-]/gi, '').toLowerCase() || 'unknown';
  var it = parent.getFoldersByName(domain);
  return it.hasNext() ? it.next() : parent.createFolder(domain);
}

// --------------------------------------------------

if (saved > 0) {
  MailApp.sendEmail(Session.getActiveUser().getEmail(),
    'Saved ' + saved + ' attachment(s) to Drive',
    'The Gmail Attachments script saved ' + saved + ' file(s) from ' + threads.length + ' thread(s) into "' + FOLDER_NAME + '".');
}
