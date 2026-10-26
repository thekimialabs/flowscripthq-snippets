// How to Fix "Exceeded Maximum Execution Time" in Google Apps Script (Resilient Batch Architecture)
// Tutorial: https://flowscripthq.blogspot.com/2026/10/how-to-fix-exceeded-maximum-execution.html
// From FlowScriptHQ — https://flowscripthq.blogspot.com

/**
 * FlowScriptHQ - Resilient Google Apps Script Batch Engine
 * Prevents "Exceeded maximum execution time" via self-scheduling continuation triggers.
 */
function processLargeDataset() {
  const START_TIME = Date.now();
  const MAX_RUNTIME_MS = 4.5 * 60 * 1000; // 4 minutes 30 seconds safety threshold
  const USER_PROPS = PropertiesService.getUserProperties();
  
  // 1. Retrieve the saved state pointer
  let lastProcessedRow = Number(USER_PROPS.getProperty("BATCH_ROW_INDEX")) || 1;
  
  const SPREADSHEET = SpreadsheetApp.getActiveSpreadsheet();
  const SHEET = SPREADSHEET.getSheetByName("LargeDataset") || SPREADSHEET.getActiveSheet();
  const data = SHEET.getDataRange().getValues();
  const totalRows = data.length;
  
  Logger.log(`[START] Resuming processing from row index: ${lastProcessedRow} of ${totalRows}`);

  // 2. Iterate through records
  for (let i = lastProcessedRow; i < totalRows; i++) {
    // Check elapsed execution time
    const elapsed = Date.now() - START_TIME;
    if (elapsed > MAX_RUNTIME_MS) {
      Logger.log(`[TIMEOUT GUARD] Approaching 4.5 min limit. Pausing cleanly at row ${i}...`);
      
      // Save current state pointer
      USER_PROPS.setProperty("BATCH_ROW_INDEX", i.toString());
      
      // Programmatically schedule continuation trigger for 1 minute from now
      scheduleContinuationTrigger();
      return; // Exit cleanly
    }

    // --- YOUR WORKLOAD HERE ---
    const currentRow = data[i];
    performDataTransformation(currentRow);
  }

  // 3. Final completion cleanup
  Logger.log("[COMPLETED] All rows processed successfully. Cleaning up triggers and state.");
  USER_PROPS.deleteProperty("BATCH_ROW_INDEX");
  deleteContinuationTriggers();
}

/**
 * Creates a one-shot continuation trigger
 */
function scheduleContinuationTrigger() {
  deleteContinuationTriggers(); // Clean any pending duplicate triggers
  ScriptApp.newTrigger("processLargeDataset")
    .timeBased()
    .after(60 * 1000) // Fire after 1 minute
    .create();
  Logger.log("[TRIGGER] Continuation trigger created successfully.");
}

/**
 * Removes leftover continuation triggers to stay under quota
 */
function deleteContinuationTriggers() {
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(trigger => {
    if (trigger.getHandlerFunction() === "processLargeDataset") {
      ScriptApp.deleteTrigger(trigger);
    }
  });
}

function performDataTransformation(row) {
  // Mock business logic: PDF rendering, API sync, or complex formula evaluation
  Utilities.sleep(10); 
}
