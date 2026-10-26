// How to Fix Google Drive API 'User Rate Limit Exceeded' in Apps Script (Batch Upload Architecture)
// Tutorial: https://flowscripthq.blogspot.com/2026/10/how-to-fix-google-drive-api-user-rate.html
// From FlowScriptHQ — https://flowscripthq.blogspot.com

/**
 * FlowScriptHQ - Resilient Google Drive Execution Wrapper
 * Automatically handles HTTP 403 User Rate Limit Exceeded with exponential backoff & jitter.
 * 
 * @param {Function} driveAction - Callback function containing DriveApp or Drive API call.
 * @param {number} maxAttempts - Maximum retry attempts (default: 5).
 * @return {*} Result of the callback.
 */
function executeDriveWithBackoff(driveAction, maxAttempts = 5) {
  let attempt = 0;

  while (attempt < maxAttempts) {
    try {
      return driveAction();
    } catch (err) {
      attempt++;
      const errorMsg = err.toString();

      // Check for rate limit or quota lockup signatures
      const isRateLimited = errorMsg.includes("User Rate Limit Exceeded") ||
                            errorMsg.includes("rateLimitExceeded") ||
                            errorMsg.includes("Service invoked too many times") ||
                            errorMsg.includes("Internal error");

      if (!isRateLimited || attempt >= maxAttempts) {
        Logger.log(`[FATAL] Non-recoverable Drive error after ${attempt} attempts: ${errorMsg}`);
        throw err;
      }

      // Calculate exponential backoff: 2^attempt * 1000ms + random jitter
      const delay = Math.pow(2, attempt) * 1000 + Math.floor(Math.random() * 800);
      Logger.log(`[THROTTLE] Drive rate limit hit. Pausing for ${delay}ms before attempt ${attempt + 1}...`);
      Utilities.sleep(delay);
    }
  }
}

// --------------------------------------------------

function generateBulkDocuments() {
  const folderId = "your-target-folder-id";

  // 1. Get Folder with Backoff
  const folder = executeDriveWithBackoff(() => {
    return DriveApp.getFolderById(folderId);
  });

  const dataset = [
    { name: "Report_Q1_2026.txt", content: "Quarterly financial summary..." },
    { name: "Report_Q2_2026.txt", content: "Mid-year analysis..." },
    { name: "Report_Q3_2026.txt", content: "Autumn forecast..." }
    // ... scalable to hundreds of files
  ];

  for (let i = 0; i < dataset.length; i++) {
    const item = dataset[i];

    // 2. Wrap file creation in backoff
    const newFile = executeDriveWithBackoff(() => {
      return folder.createFile(item.name, item.content, MimeType.PLAIN_TEXT);
    });

    Logger.log(`[SUCCESS] File created: ${newFile.getName()} (ID: ${newFile.getId()})`);

    // 3. Proactive Throttling: Micro-pause of 250ms prevents burst QPS spikes
    Utilities.sleep(250);
  }
}
