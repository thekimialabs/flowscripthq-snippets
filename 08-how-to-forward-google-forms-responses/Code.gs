// How to Forward Google Forms Responses to an External API or Webhook in Real-Time (Free Apps Script Trigger)
// Tutorial: https://flowscripthq.blogspot.com/2026/10/how-to-forward-google-forms-responses.html
// From FlowScriptHQ — https://flowscripthq.blogspot.com

/**
 * FlowScriptHQ - Real-Time Google Form to Webhook Forwarder
 */
function handleFormSubmission(e) {
  const WEBHOOK_URL = "https://api.yourdomain.com/v1/leads"; // Replace with your target endpoint
  
  if (!e || !e.namedValues) {
    Logger.error("Function triggered manually without form event context.");
    return;
  }

  // Extract structured answers from event payload
  const responses = e.namedValues;
  const payload = {
    submittedAt: new Date().toISOString(),
    fullName: responses["Full Name"] ? responses["Full Name"][0] : "Anonymous",
    emailAddress: responses["Email Address"] ? responses["Email Address"][0] : "N/A",
    company: responses["Company Name"] ? responses["Company Name"][0] : "N/A",
    message: responses["Message"] ? responses["Message"][0] : "",
    rawSubmission: responses
  };

  const options = {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  try {
    const response = UrlFetchApp.fetch(WEBHOOK_URL, options);
    Logger.log(`[FORWARDED] Status: ${response.getResponseCode()}`);
  } catch (err) {
    Logger.error(`[DISPATCH ERROR] Failed to send webhook: ${err.message}`);
  }
}

// --------------------------------------------------
// Upgrade 3 additions (FlowScriptHQ, Nov 2026)
// Retry with backoff, Forwarded status column, file-upload
// forwarding, checkbox helper. Verified live 28 Nov 2026.
// --------------------------------------------------

/**
 * Post the same payload up to three times, waiting longer between
 * attempts. A 4xx status is a bug in the request, so it returns at
 * once; a 5xx status or a thrown exception waits and retries:
 * 2 seconds after the first attempt, 4 seconds after the second.
 * Returns the status code, or 0 when every attempt failed.
 */
function postWithRetry(url, payload) {
  const options = {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const response = UrlFetchApp.fetch(url, options);
      const code = response.getResponseCode();
      if (code >= 200 && code < 300) return code;
      Logger.log('Attempt ' + attempt + ' got status ' + code + ', body: ' + response.getContentText().slice(0, 500));
      if (code >= 400 && code < 500) return code;
    } catch (err) {
      Logger.log('Attempt ' + attempt + ' threw: ' + err.message);
    }
    if (attempt < 3) Utilities.sleep(1000 * Math.pow(2, attempt));
  }
  return 0;
}

/**
 * Record the outcome on the response row itself. e.range is the new
 * row, so the status goes in the Forwarded column for that row.
 * The column is created once, on the first submission, and reused
 * after that: the header is looked up first and the column is only
 * created when it is missing. (The first version wrote to
 * getLastColumn() + 1 on every call and created a new Forwarded
 * column per submission; fixed after live testing 28 Nov 2026.)
 * Call after the post: markRowForwarded(e, 'Yes, ' + code) on
 * success, markRowForwarded(e, 'Failed, ' + code) on failure.
 */
function markRowForwarded(e, status) {
  const sheet = e.range.getSheet();
  const row = e.range.getRow();
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  let statusCol = headers.indexOf('Forwarded') + 1;
  if (!statusCol) {
    statusCol = sheet.getLastColumn() + 1;
    sheet.getRange(1, statusCol).setValue('Forwarded');
  }
  sheet.getRange(row, statusCol).setValue(status);
}

/**
 * Daily backup scanner: finds rows marked Failed so they can be
 * reposted. A scanner, not a full reposter, by design: rebuilding
 * the payload from a sheet row needs the same field mapping as
 * handleFormSubmission, so wire it to the real payload builder
 * before scheduling it daily.
 */
function retryFailedRows() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
  const values = sheet.getDataRange().getValues();
  const headers = values[0];
  const statusCol = headers.indexOf('Forwarded') + 1;
  if (!statusCol) return;
  for (let r = 1; r < values.length; r++) {
    const status = values[r][statusCol - 1];
    if (typeof status === 'string' && status.indexOf('Failed') === 0) {
      Logger.log('Row ' + (r + 1) + ' still marked Failed, repost it here with the stored payload.');
    }
  }
}

/**
 * Forward a file upload question as multipart form-data. A file
 * upload question arrives in namedValues as a Google Drive URL, not
 * as a file, so extract the file id, fetch the blob, and post it.
 * No contentType is set by hand: Apps Script builds the multipart
 * body and its boundary itself. Change 'Upload' to the real
 * question title and the URL to the real endpoint before running.
 */
function forwardUpload(e) {
  const uploadValue = e.namedValues['Upload'] ? e.namedValues['Upload'][0] : '';
  const match = uploadValue.match(/[?&]id=([^&]+)/) || uploadValue.match(/\/d\/([^\/]+)/);
  if (!match) {
    Logger.log('No file id found in the upload value: ' + uploadValue);
    return;
  }
  const file = DriveApp.getFileById(match[1]);
  const options = {
    method: 'post',
    payload: {
      fullName: e.namedValues['Full Name'] ? e.namedValues['Full Name'][0] : 'Anonymous',
      file: file.getBlob()
    },
    muteHttpExceptions: true
  };
  const response = UrlFetchApp.fetch('https://api.yourdomain.com/v1/leads', options);
  Logger.log('Upload forward status: ' + response.getResponseCode());
}

/**
 * A checkbox question with several options ticked arrives as one
 * array element holding one comma-separated string, for example
 * ["Option A, Option B"]. Split it when the receiver needs a list.
 * Keep option labels comma-free: a comma inside a label is cut in
 * two by the split and cannot be told apart afterwards.
 */
function getCheckboxList(namedValues, question) {
  const raw = namedValues[question] ? namedValues[question][0] : '';
  if (!raw) return [];
  return raw.split(', ').map(function (item) { return item.trim(); });
}
