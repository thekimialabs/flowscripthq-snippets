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
