# Snippets — Power Automate: Convert Word to PDF in SharePoint Automatically

Tutorial: https://flowscripthq.blogspot.com/2026/11/power-automate-convert-word-to-pdf-in.html

Power Automate has no importable code files — this file collects the exact expressions, trigger settings, and action settings from the tutorial so you can copy them into the right action.

## Method 1 — Word Online (Business), Premium

Three actions plus the trigger. Needs a Power Automate Premium licence (around $15 per user per month at time of writing; a 30-day trial covers testing). The Word Online (Business) connector is premium; the SharePoint connector is standard.

Setup: SharePoint library **Contracts** with two folders, **Incoming** (where Word files land) and **PDFs** (where the converted files go). Create both before building the flow.

### Trigger — When a file is created (properties only), SharePoint

- **Site Address:** your SharePoint site.
- **Library Name:** **Contracts**.
- **Folder:** **Incoming**. Restricting the trigger to this folder matters: the flow writes PDFs into the same library, and if the trigger watched the whole library it would fire on its own output files.

This trigger fires once per new file and returns the file's metadata, including its name and identifier, without downloading the file content yet.

### Condition — only continue for Word documents

Add a **Condition** action. Left box, Expression tab:

```powerautomate
endsWith(triggerOutputs()?['body/{Name}'], '.docx')
```

Operator **is equal to**, right value **true**. Everything from here on goes inside the **If yes** branch. The **If no** branch stays empty, so non-Word files are simply ignored.

The Word Online conversion action only accepts modern `.docx` files. Old `.doc` files, macro-enabled `.docm` files, and password-protected documents will fail the conversion step.

### Convert Word Document to PDF — Word Online (Business)

Inside the **If yes** branch, add **Convert Word Document to PDF** from the Word Online (Business) connector.

- **Location:** your SharePoint site.
- **Document Library:** **Contracts**.
- **File:** **Identifier** from the dynamic content panel (the file the trigger just detected).

The action returns the converted PDF as file content. Limits: the input file must be 10 MB or smaller, the conversion must finish in under two minutes or it times out, and files marked with a Confidential or Highly Confidential sensitivity label are not supported.

### Create file — SharePoint

Still inside the **If yes** branch, add SharePoint **Create file**.

- **Site Address:** the same site.
- **Folder Path:** `/Contracts/PDFs` (your library name, then the output folder).
- **File Name:** expression (the file must end in `.pdf` instead of `.docx`):

```powerautomate
replace(triggerOutputs()?['body/{Name}'], '.docx', '.pdf')
```

`Agreement.docx` becomes `Agreement.pdf`.

- **File Content:** the output of the Convert Word Document to PDF action (appears as **File Content** under the Word Online action in dynamic content).

Save the flow. Test: click **Test**, select **Manually**, upload a Word document into **Incoming**, and check the **PDFs** folder.

## Method 2 — OneDrive Convert file, no Premium licence

Uses the OneDrive for Business Convert file action, a standard connector included with Microsoft 365. Keep the same trigger and Condition from Steps 1 and 2, then inside the If yes branch:

1. SharePoint **Get file content**, File Identifier set to the trigger Identifier.
2. OneDrive for Business **Create file**, Folder Path `/Temp-PDF`, File Name set to the trigger Name, File Content set to the Get file content output.
3. OneDrive for Business **Convert file**, File set to the Id of the file just created, Target type **PDF**.
4. SharePoint **Create file** exactly as in Step 4, with File Content from the Convert file output.
5. Optionally, OneDrive for Business **Delete file** on the temporary file so the staging folder stays empty.

Costs: two extra actions, a temporary file in OneDrive, and the OneDrive converter has its own file-size and timeout limits.

## Word files already in SharePoint (backlog)

The flow only converts files uploaded after it is turned on. For the backlog, build a second flow with a **Manually trigger a flow** trigger, then:

1. SharePoint **Get files (properties only)**, Site Address and Library Name as before, Folder set to Incoming, Filter Query set to filter to Word files.
2. **Apply to each**, using the value output of Get files.
3. Inside the loop, the same Convert Word Document to PDF action (File set to the current item Identifier) and Create file action from Steps 3 and 4, using the current item Name in the rename expression.
4. Test on one file first, then run it once for the backlog. For large backlogs, leave Apply to each concurrency at its default sequential setting on the first run so a single bad file does not hide among parallel failures, and expect roughly a minute per file.

## Convert one file on demand

Build the same flow with the SharePoint **For a selected file** trigger instead, then Get file content, Convert Word Document to PDF, and Create file as in Steps 3 and 4. Run it from the library by selecting the file, then Automate, then the flow name. For a one-click Convert to PDF button in the library, format a single-line-of-text column with JSON using the executeFlow custom row action and the flow ID; that is a SharePoint column-formatting step, not a flow step.

## Why this design avoids the infinite loop

The classic mistake is triggering on the whole library and writing the PDF back into the same folder: the new PDF is a created file, so it triggers the flow again. This design avoids that in three ways: the trigger watches only the **Incoming** folder, the PDF is written to a different folder, and the condition on `.docx` adds a third layer of protection, since a `.pdf` file would fail the condition even if it did trigger the flow.

## Going further

- **Notify the uploader:** add an Office 365 Outlook **Send an email (V2)** action after the Create file step, using the **Created By Email** property from the trigger, to confirm the PDF is ready.
- **Move the original to an archive folder:** add a SharePoint **Move file** action after conversion, so the Incoming folder stays empty and acts as a queue.
- **Delete the Word file after conversion:** add a SharePoint **Delete file** action using the trigger's **Identifier**. Only do this once the flow has run reliably for a week.
- **Handle subfolders:** the trigger has no Include subfolders option. Leave the trigger Folder blank to watch the whole library, including subfolders, or keep the Folder set to Incoming and accept that nested folders will not trigger it. To mirror the folder structure in the output, do not copy the trigger Folder path value as-is into Create file; build the output path with an expression that replaces the Incoming segment with the PDFs folder.
- **Log conversions to a list:** create a SharePoint list with columns for the file name, conversion time, and status, then add a SharePoint **Create item** action. Use the trigger Name for the file name, the expression `utcNow()` for the conversion time, and the literal text `Converted` for the status, since the flow has no built-in run status output to use here.

## Common failures

- **Flow runs but no PDF appears:** the run took the **If no** branch, so the file name did not end in `.docx`. Common causes are uppercase extensions (`.DOCX`) and old `.doc` files. To accept uppercase extensions as well, change the condition expression to:

```powerautomate
endsWith(toLower(triggerOutputs()?['body/{Name}']), '.docx')
```

- **Convert fails with "file format not supported":** the file is `.doc`, `.docm`, or password-protected. Convert it to `.docx` in Word first, or filter those files out before they reach the folder.
- **Create file fails with "file already exists":** in the new designer, SharePoint Create file replaces an existing file with the same name instead of failing, so a re-test normally overwrites the old PDF and adds a version. On the classic designer, delete the old PDF before re-testing, or add a timestamp to the file name expression:

```powerautomate
concat(replace(triggerOutputs()?['body/{Name}'], '.docx', ''), '-', utcNow('yyyyMMdd-HHmm'), '.pdf')
```

- **Convert fails with "There was an error accessing the file":** the file is locked (open in Word for the web, checked out to another user, or still uploading when the trigger fired). Check the file is checked in and closed, wait a minute, and re-run the flow. For large files uploaded over a slow connection, add a Delay action of 1 to 2 minutes after the trigger before the Convert action so the upload finishes first.

## Licence question

Method 1 needs Premium for the conversion step: the SharePoint connector is standard, but Word Online (Business) is premium, so the flow owner needs a Power Automate Premium licence. Encodian and Adobe PDF Services are also premium, so they do not remove the premium cost. For a standard-connector-only flow, use the OneDrive for Business Convert file action (Method 2).
