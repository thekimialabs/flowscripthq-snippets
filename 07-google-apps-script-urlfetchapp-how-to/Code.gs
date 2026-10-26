// Google Apps Script UrlFetchApp: How to Send Authenticated POST Requests with Custom JSON Headers (With Retry Logic)
// Tutorial: https://flowscripthq.blogspot.com/2026/10/google-apps-script-urlfetchapp-how-to.html
// From FlowScriptHQ — https://flowscripthq.blogspot.com

/**
 * FlowScriptHQ - Resilient HTTP POST Dispatcher with Exponential Backoff
 */
function postJsonWithRetry(endpointUrl, payloadObj, bearerToken = null, maxRetries = 3) {
  const headers = {
    "Accept": "application/json"
  };
  
  if (bearerToken) {
    headers["Authorization"] = `Bearer ${bearerToken}`;
  }

  const options = {
    method: "post",
    contentType: "application/json",
    headers: headers,
    payload: JSON.stringify(payloadObj),
    muteHttpExceptions: true
  };

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      Logger.log(`[HTTP POST] Attempt ${attempt} -> ${endpointUrl}`);
      const response = UrlFetchApp.fetch(endpointUrl, options);
      const statusCode = response.getResponseCode();
      const responseText = response.getContentText();

      // Successful 2xx range
      if (statusCode >= 200 && statusCode < 300) {
        Logger.log(`[HTTP 200] Success: ${responseText.slice(0, 100)}...`);
        return JSON.parse(responseText);
      }

      // Handle Rate Limiting (429) or Server Errors (5xx)
      if (statusCode === 429 || statusCode >= 500) {
        const sleepTimeMs = Math.pow(2, attempt) * 1000;
        Logger.warn(`[HTTP ${statusCode}] Retrying in ${sleepTimeMs / 1000}s...`);
        Utilities.sleep(sleepTimeMs);
        continue;
      }

      // Unrecoverable client error
      throw new Error(`API returned status ${statusCode}: ${responseText}`);

    } catch (networkErr) {
      if (attempt === maxRetries) throw networkErr;
      Utilities.sleep(2000 * attempt);
    }
  }
}
