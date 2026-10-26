# Snippets — How to Automatically Save Gmail Attachments to Google Drive with Apps Script (Free Backup Guide)

Tutorial: https://flowscripthq.blogspot.com/2026/10/how-to-automatically-save-gmail.html

## Additional snippets

```
subfolderFor_(folder, message).createFile(attachment.copyBlob()).setName(fileNameFor_(message, attachment));
```
