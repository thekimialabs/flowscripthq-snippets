// How to Connect Webhooks to Google Sheets Without Third-Party Tools (Zero-Cost Web App Endpoint)
// Tutorial: https://flowscripthq.blogspot.com/2026/10/how-to-connect-webhooks-to-google.html
// From FlowScriptHQ — https://flowscripthq.blogspot.com

/**
 * FlowScriptHQ - Serverless Webhook Endpoint for Google Sheets
 * Handles incoming HTTP POST requests with JSON payloads.
 */
function doPost(e) {
  // Use ScriptLock to handle concurrent requests safely
  const lock = LockService.getScriptLock();
  lock.waitLock(10000); // Wait up to 10 seconds for concurrent write locks
  
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Webhook_Log") || SpreadsheetApp.getActiveSheet();
    
    // Parse incoming payload
    const rawData = e.postData.contents;
    const json = JSON.parse(rawData);
    
    // Extract parameters
    const timestamp = new Date().toISOString();
    const eventType = json.event || json.type || "standard_event";
    const userEmail = json.email || (json.customer && json.customer.email) || "N/A";
    const amount = Number(json.amount || json.total || 0).toFixed(2);
    
    // Atomic row insertion
    sheet.appendRow([
      timestamp,
      eventType,
      userEmail,
      amount,
      rawData // Full raw JSON for audit logging
    ]);
    
    // Return standard 200 OK JSON response
    return ContentService
      .createTextOutput(JSON.stringify({ status: "success", receivedAt: timestamp }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    Logger.log("Webhook Processing Error: " + error.toString());
    return ContentService
      .createTextOutput(JSON.stringify({ status: "error", message: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } finally {
    lock.releaseLock();
  }
}
