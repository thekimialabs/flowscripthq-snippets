# Snippets — How to Build an Automated Daily Email Report in Google Sheets with Free Apps Script (Zero-Cost Zapier Alternative)

Tutorial: https://flowscripthq.blogspot.com/2026/10/how-to-build-automated-daily-email.html

## Additional snippets

```
MailApp.sendEmail({
  to: "reports@yourcompany.com",
  bcc: "executive1@company.com, executive2@company.com",
  subject: subjectLine,
  htmlBody: htmlBody
});
```
