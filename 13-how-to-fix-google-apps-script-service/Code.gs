// How to Fix Google Apps Script 'Service Spreadsheets failed while accessing document' (Retry Pattern)
// Tutorial: https://flowscripthq.blogspot.com/2026/10/how-to-fix-google-apps-script-service.html
// From FlowScriptHQ — https://flowscripthq.blogspot.com

/**
 * FlowScriptHQ - Resilient Execution Wrapper
 * Retries volatile Google Apps Script API calls with exponential backoff and jitter.
 * 
 * @param {Function} apiOperation - The callback function containing the spreadsheet call.
 * @param {number} maxRetries - Maximum retry attempts (default: 5).
 * @return {*} The return value of the wrapped operation.
 */
function callWithRetry(apiOperation, maxRetries = 5) {
  let attempt = 0;
  
  while (attempt < maxRetries) {
    try {
      return apiOperation();
    } catch (err) {
      attempt++;
      const errorMessage = err.toString();
      
      // Check if the error is a transient service lockup
      const isTransient = errorMessage.includes("Service Spreadsheets failed") ||
                          errorMessage.includes("Service invoked too many times") ||
                          errorMessage.includes("Internal error");

      if (!isTransient || attempt >= maxRetries) {
        Logger.log(`[FATAL] Non-transient or exhausted retries after ${attempt} attempts: ${errorMessage}`);
        throw err;
      }

      // Calculate exponential delay with randomized jitter (e.g. 1s, 2s, 4s, 8s...)
      const baseDelay = Math.pow(2, attempt) * 1000;
      const jitter = Math.floor(Math.random() * 1000);
      const totalWaitMs = baseDelay + jitter;

      Logger.log(`[WARN] Attempt ${attempt} failed. Backing off for ${totalWaitMs}ms before retry...`);
      Utilities.sleep(totalWaitMs);
    }
  }
}

// --------------------------------------------------

function updateSpreadsheetData() {
  const spreadsheetId = "1aBcD...your-sheet-id";

  // 1. Resilient Spreadsheet Open
  const ss = callWithRetry(() => {
    return SpreadsheetApp.openById(spreadsheetId);
  });

  const sheet = ss.getSheetByName("Orders");

  // 2. Resilient Data Read
  const values = callWithRetry(() => {
    return sheet.getDataRange().getValues();
  });

  // Process rows in memory...
  const updatedRows = values.map(row => {
    // Business logic transformations
    return row;
  });

  // 3. Resilient Data Write
  callWithRetry(() => {
    sheet.getRange(1, 1, updatedRows.length, updatedRows[0].length).setValues(updatedRows);
    SpreadsheetApp.flush(); // Force write buffer commit
  });

  Logger.log("Update completed successfully with zero lock failures.");
}

// --------------------------------------------------

/**
 * Thread-safe execution using ScriptLock
 */
function executeThreadSafeOperation() {
  const lock = LockService.getScriptLock();
  
  // Wait up to 30 seconds for concurrent processes to finish
  const hasLock = lock.tryLock(30000);
  
  if (!hasLock) {
    Logger.log("[ALERT] Could not obtain lock within 30 seconds. Another instance is running.");
    throw new Error("Lock timeout: High concurrency collision prevented.");
  }

  try {
    // Perform spreadsheet updates safely without fear of collision
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    const data = sheet.getDataRange().getValues();
    
    // Write back atomically
    sheet.appendRow([new Date(), "Synchronized Entry", "Success"]);
    SpreadsheetApp.flush();

  } finally {
    // Always release lock in the finally block
    lock.releaseLock();
  }
}
