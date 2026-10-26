// How to Automatically Generate and Email PDF Invoices from Google Sheets (Free Apps Script Template Merger)
// Tutorial: https://flowscripthq.blogspot.com/2026/10/how-to-automatically-generate-and-email.html
// From FlowScriptHQ — https://flowscripthq.blogspot.com

/**
 * FlowScriptHQ - Automated PDF Invoice Generator & Emailer
 */
function generateAndEmailInvoices() {
  const TEMPLATE_DOC_ID = "YOUR_GOOGLE_DOC_TEMPLATE_ID"; // Replace with your template doc ID
  const INVOICE_FOLDER_ID = "YOUR_GOOGLE_DRIVE_FOLDER_ID"; // Folder for storing generated PDFs
  
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Invoices") || SpreadsheetApp.getActiveSheet();
  const data = sheet.getDataRange().getValues();
  
  const headers = data[0];
  const rows = data.slice(1);
  const targetFolder = DriveApp.getFolderById(INVOICE_FOLDER_ID);
  
  rows.forEach((row, index) => {
    const invoiceNum = row[0];
    const clientName = row[1];
    const clientEmail = row[2];
    const amount = Number(row[3]).toFixed(2);
    const status = row[4];
    
    // Only process rows marked as "Pending" to prevent duplicate billing
    if (status !== "Pending" || !clientEmail) return;
    
    Logger.log(`Generating invoice ${invoiceNum} for ${clientName}...`);
    
    // 1. Clone the template doc into target folder
    const templateFile = DriveApp.getFileById(TEMPLATE_DOC_ID);
    const tempFile = templateFile.makeCopy(`Temp_${invoiceNum}`, targetFolder);
    const tempDoc = DocumentApp.openById(tempFile.getId());
    const body = tempDoc.getBody();
    
    // 2. Replace placeholders
    body.replaceText("{{INVOICE_NUMBER}}", invoiceNum);
    body.replaceText("{{CLIENT_NAME}}", clientName);
    body.replaceText("{{INVOICE_DATE}}", new Date().toLocaleDateString("en-US"));
    body.replaceText("{{TOTAL_AMOUNT}}", `$${amount}`);
    tempDoc.saveAndClose();
    
    // 3. Export as clean PDF blob
    const pdfBlob = tempFile.getAs(MimeType.PDF).setName(`Invoice_${invoiceNum}.pdf`);
    targetFolder.createFile(pdfBlob);
    
    // 4. Trash temporary working doc
    tempFile.setTrashed(true);
    
    // 5. Dispatch email with PDF attachment
    MailApp.sendEmail({
      to: clientEmail,
      subject: `Invoice #${invoiceNum} from FlowScriptHQ`,
      body: `Hello ${clientName},

Please find attached your invoice #${invoiceNum} for $${amount}.

Thank you for your business!`,
      attachments: [pdfBlob]
    });
    
    // 6. Update status in sheet
    sheet.getRange(index + 2, 5).setValue("Sent");
    Logger.log(`Invoice ${invoiceNum} dispatched successfully.`);
  });
}
