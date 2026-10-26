// How to Build an Automated Daily Email Report in Google Sheets with Free Apps Script (Zero-Cost Zapier Alternative)
// Tutorial: https://flowscripthq.blogspot.com/2026/10/how-to-build-automated-daily-email.html
// From FlowScriptHQ — https://flowscripthq.blogspot.com

/**
 * FlowScriptHQ - Automated Daily KPI Report Dispatcher
 */
function sendDailySummaryReport() {
  const SPREADSHEET = SpreadsheetApp.getActiveSpreadsheet();
  const DATA_SHEET = SPREADSHEET.getSheetByName("Data") || SPREADSHEET.getActiveSheet();
  
  // Configuration
  const RECIPIENT_EMAIL = "management@yourcompany.com"; 
  const REPORT_TITLE = "Daily Executive KPI Digest";
  
  // 1. Batch read all values in a single call to prevent API throttling
  const data = DATA_SHEET.getDataRange().getValues();
  if (data.length <= 1) {
    Logger.log("No data records available to compile report.");
    return;
  }
  
  const headers = data[0];
  const rows = data.slice(1);
  
  // 2. Perform aggregate analytics in memory
  let totalRevenue = 0;
  let completedOrders = 0;
  
  rows.forEach(row => {
    const rev = Number(row[2]) || 0;
    const status = String(row[3] || "").toLowerCase();
    
    totalRevenue += rev;
    if (status === "completed" || status === "paid") {
      completedOrders++;
    }
  });
  
  const formattedRevenue = totalRevenue.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2
  });
  
  // 3. Render clean responsive HTML email template
  const htmlBody = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, Arial, sans-serif; max-width: 620px; margin: 0 auto; color: #1f2937; line-height: 1.6;">
      <div style="background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); padding: 24px; border-radius: 8px 8px 0 0; color: #ffffff;">
        <h2 style="margin: 0; font-size: 22px; font-weight: 700;">${REPORT_TITLE}</h2>
        <p style="margin: 6px 0 0 0; opacity: 0.85; font-size: 14px;">Generated on ${new Date().toLocaleDateString("en-US", { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
      </div>
      
      <div style="padding: 24px; border: 1px solid #e5e7eb; border-top: none; background: #ffffff;">
        <h3 style="color: #111827; margin-top: 0; font-size: 16px; border-bottom: 2px solid #f3f4f6; padding-bottom: 8px;">Executive Highlights</h3>
        <div style="display: flex; gap: 16px; margin: 16px 0;">
          <div style="background: #eff6ff; padding: 14px; border-radius: 6px; flex: 1; border-left: 4px solid #3b82f6;">
            <div style="font-size: 12px; color: #4b5563; text-transform: uppercase;">Total Pipeline Value</div>
            <div style="font-size: 20px; font-weight: bold; color: #1e3a8a; margin-top: 4px;">${formattedRevenue}</div>
          </div>
          <div style="background: #f0fdf4; padding: 14px; border-radius: 6px; flex: 1; border-left: 4px solid #22c55e;">
            <div style="font-size: 12px; color: #4b5563; text-transform: uppercase;">Completed Transactions</div>
            <div style="font-size: 20px; font-weight: bold; color: #14532d; margin-top: 4px;">${completedOrders} / ${rows.length}</div>
          </div>
        </div>
        
        <h3 style="color: #111827; font-size: 16px; margin-top: 24px;">Recent Transactions (Last 5 Entries)</h3>
        <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
          <thead>
            <tr style="background-color: #f9fafb;">
              <th style="padding: 10px; border: 1px solid #e5e7eb; text-align: left;">Date</th>
              <th style="padding: 10px; border: 1px solid #e5e7eb; text-align: left;">Customer</th>
              <th style="padding: 10px; border: 1px solid #e5e7eb; text-align: right;">Amount</th>
              <th style="padding: 10px; border: 1px solid #e5e7eb; text-align: center;">Status</th>
            </tr>
          </thead>
          <tbody>
            ${rows.slice(-5).map(r => `
              <tr>
                <td style="padding: 8px 10px; border: 1px solid #e5e7eb;">${r[0] instanceof Date ? r[0].toLocaleDateString() : r[0]}</td>
                <td style="padding: 8px 10px; border: 1px solid #e5e7eb;">${r[1]}</td>
                <td style="padding: 8px 10px; border: 1px solid #e5e7eb; text-align: right; font-weight: 600;">$${Number(r[2] || 0).toFixed(2)}</td>
                <td style="padding: 8px 10px; border: 1px solid #e5e7eb; text-align: center;">
                  <span style="background: #dcfce7; color: #166534; padding: 2px 8px; border-radius: 4px; font-size: 11px;">${r[3]}</span>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      
      <div style="padding: 14px; font-size: 12px; color: #9ca3af; text-align: center; background: #f9fafb; border-radius: 0 0 8px 8px;">
        Automated report dispatched via FlowScriptHQ Google Workspace Engine.
      </div>
    </div>
  `;
  
  // 4. Dispatch email via Gmail service
  MailApp.sendEmail({
    to: RECIPIENT_EMAIL,
    subject: `[Automated KPI] ${REPORT_TITLE} - ${new Date().toLocaleDateString()}`,
    htmlBody: htmlBody
  });
  
  Logger.log("Report compiled and emailed successfully.");
}
