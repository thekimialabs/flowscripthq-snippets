// How to Build a Custom Slack Slash Command with Google Apps Script (Zero-Cost Serverless Backend)
// Tutorial: https://flowscripthq.blogspot.com/2026/10/how-to-build-custom-slack-slash-command.html
// From FlowScriptHQ — https://flowscripthq.blogspot.com

/**
 * FlowScriptHQ - Autonomous Slack Slash Command Webhook Receiver
 * Endpoint: doPost(e)
 */
function doPost(e) {
  // 1. Guard against empty requests
  if (!e || !e.parameter) {
    return ContentService.createTextOutput("Invalid request: No payload received.")
      .setMimeType(ContentService.MimeType.TEXT);
  }

  // 2. Extract Slack parameters
  // Slack sends application/x-www-form-urlencoded fields accessible via e.parameter
  const command = e.parameter.command;       // e.g. "/lead"
  const text = e.parameter.text || "";       // Arguments typed after command
  const userName = e.parameter.user_name;   // Slack username
  const channelName = e.parameter.channel_name; 
  const responseUrl = e.parameter.response_url; // For delayed responses if needed

  // 3. Acquire Concurrency Lock (prevents row collisions during team usage)
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(5000)) {
    return createSlackResponse("⚠️ Server busy processing another command. Please retry in 2 seconds.", false);
  }

  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName("Leads");
    if (!sheet) {
      sheet = ss.insertSheet("Leads");
      sheet.appendRow(["Timestamp", "Created By", "Channel", "Lead Name", "Company / Notes", "Raw Input"]);
      sheet.getRange(1, 1, 1, 6).setFontWeight("bold").setBackground("#f1f5f9");
      sheet.setFrozenRows(1);
    }

    // 4. Parse user input: e.g. "/lead Jane Doe, Acme Corp"
    const parts = text.split(",").map(item => item.trim());
    const leadName = parts[0] || "Unnamed Lead";
    const company = parts[1] || "N/A";
    const timestamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss");

    // 5. Atomic Append to Sheet
    sheet.appendRow([timestamp, userName, channelName, leadName, company, text]);
    SpreadsheetApp.flush();

    // 6. Return Rich Formatted Response to Slack Channel
    const confirmationMessage = `✅ *Lead Successfully Recorded!*\n• *Name:* ${leadName}\n• *Company:* ${company}\n• *Logged By:* @${userName} in #${channelName}`;
    
    // Set inChannel to true to make response visible to the whole channel, or false for private (ephemeral)
    return createSlackResponse(confirmationMessage, true);

  } catch (err) {
    return createSlackResponse(`❌ Error logging lead: ${err.toString()}`, false);
  } finally {
    lock.releaseLock();
  }
}

/**
 * Formats a clean JSON response payload conforming to Slack Block Kit standards.
 */
function createSlackResponse(textMessage, inChannel = false) {
  const payload = {
    response_type: inChannel ? "in_channel" : "ephemeral",
    text: textMessage,
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: textMessage
        }
      }
    ]
  };

  return ContentService.createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}
