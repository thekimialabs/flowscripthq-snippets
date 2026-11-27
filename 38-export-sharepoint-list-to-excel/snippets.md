# Snippets — Power Automate: Export SharePoint List to Excel

Tutorial: https://flowscripthq.blogspot.com/2026/11/power-automate-export-sharepoint-list.html

Power Automate has no importable code files — this file collects the exact expressions, trigger settings, and action settings from the tutorial so you can copy them into the right action.

## Method 1 — Real .xlsx via template copy and Add a row

No premium licence needed: the SharePoint, Excel Online (Business), and Office 365 Outlook connectors are all standard connectors included with Microsoft 365.

Setup: a SharePoint list called **Product Inventory** (columns Title, Status choice, Quantity number, DueDate date, AssignedTo person), a document library **Documents** with a **Templates** folder holding `Export-Template.xlsx` and an **Exports** folder for the output files.

### Step 1 — Excel template

Create a blank workbook. Row 1 headers: `Title`, `Status`, `Quantity`, `DueDate`, `AssignedTo`. Select the header row, Insert > Table, tick **My table has headers**. Rename the table to `ExportTable` on the Table Design tab. Save as `Export-Template.xlsx` and upload it to the Templates folder. Do not put it in the same folder as the exports, and do not open it while the flow runs.

### Step 2 — Scheduled flow

Create a **Scheduled cloud flow** named `Export Product Inventory to Excel`. Recurrence: Interval 1, Frequency Week, tick Monday, 7:00 AM. Check the **Time zone** field matches your local time zone: the default is UTC, and a wrong time zone is the most common reason a scheduled flow runs at the wrong hour. For a daily export, set Frequency to Day and leave the weekday selection empty.

### Step 3 — Get items

SharePoint **Get items**: Site Address = your site, List Name = `Product Inventory`. Under Show advanced options, set **Top Count** to `5000`. Get items returns only 100 items by default, so a list with 300 products would silently export a third of the data. Top Count 5000 is the maximum a single Get items call returns.

Lists over 5,000 items: turn on pagination in the action Settings, under Networking, and set Threshold to the number of items you need, for example 10,000. Turning pagination on without setting Threshold changes nothing: on a Microsoft 365 licence pagination still stops at 5,000 items, and only a premium licence allows up to 100,000. For more than 5,000 items on Microsoft 365, batch by ID (see the Get items over 5,000 guide linked from the tutorial).

### Step 4 (optional) — Filter Query

In the same Get items action, set **Filter Query** to an OData expression. Examples:

```
Status eq 'Active'
```

```
DueDate ge '2026-01-01T00:00:00Z'
```

```
Status eq 'Active' and Quantity gt 0
```

Column names in a filter query are the internal names, which usually match the display names unless the column was renamed after it was created.

### Step 5 — Copy the template and add the rows

1. SharePoint **Get file content**: Site Address = your site, File Identifier = `Export-Template.xlsx` in the Templates folder.
2. SharePoint **Create file**: Site Address = your site, Folder Path = `/Shared Documents/Exports`, File Name (Expression tab):

```powerautomate
concat('Inventory-Export-', formatDateTime(utcNow(), 'yyyy-MM-dd'), '.xlsx')
```

File Content = **File Content** from the Get file content step. The new file is an exact copy of the template, including the ExportTable table, with a name like `Inventory-Export-2026-11-30.xlsx`.

3. **Apply to each**: input = **value** from Get items (the array of list items). Do not select **body**: body is the whole response wrapper, and looping over it produces one iteration with no usable fields.
4. Inside the loop, Excel Online (Business) **Add a row into a table**: Location = your site, Document Library = Documents, File = **Id** from the Create file step, Table = type `ExportTable` as a custom value (the designer cannot list the tables in a file chosen by dynamic content, so typing the name is expected). Map each column:

- **Title:** **Title** from Get items.
- **Status:** do not select Status directly, a choice column arrives as an object. Expression tab:

```powerautomate
item()?['Status']?['Value']
```

- **Quantity:** **Quantity** from Get items.
- **DueDate:** a raw date arrives as an ISO timestamp that Excel may show as a number. Expression tab:

```powerautomate
if(empty(item()?['DueDate']), '', formatDateTime(item()?['DueDate'], 'yyyy-MM-dd'))
```

- **AssignedTo:** a person column is also an object. Expression tab (name, or Email for the address):

```powerautomate
item()?['AssignedTo']?['DisplayName']
```

Save, Test > Manually, and run it. Two behaviours to expect: the loop is slow, about one row per second, so 300 rows take about five minutes; and leave the Apply to each concurrency setting alone, parallel writes to the same file are rejected with file-locked errors.

### Step 6 (optional) — Email the file

1. SharePoint **Get file content**: Site Address = your site, File Identifier = **Id** from the Create file step.
2. Office 365 Outlook **Send an email (V2)**: To = the team distribution list, Subject = `Weekly inventory export`, attachment Name = **Name** from the Create file step, attachment Content = **File Content** from the Get file content step.

For a link instead of an attachment, skip Get file content and put the file's **Link to item** from Create file into the email body.

## Method 2 — CSV via Create CSV table

For lists over 500 items, or when formatting does not matter. Three actions after the trigger:

1. SharePoint **Get items** exactly as in Step 3, Top Count 5000.
2. Data Operation **Create CSV table**: From = **value** from Get items, Columns = Custom. Map all five headers: Title to Title, Status to `item()?['Status']?['Value']`, Quantity to Quantity, DueDate to `if(empty(item()?['DueDate']), '', formatDateTime(item()?['DueDate'], 'yyyy-MM-dd'))`, AssignedTo to `item()?['AssignedTo']?['DisplayName']`.
3. SharePoint **Create file**: Folder Path = `/Shared Documents/Exports`, File Name (expression):

```powerautomate
concat('Inventory-Export-', formatDateTime(utcNow(), 'yyyy-MM-dd'), '.csv')
```

File Content = **Output** of the Create CSV table step.

The result opens in Excel like any spreadsheet, but dates, numbers, and text arrive unformatted and there is no table styling. Create CSV table builds the whole file in one action instead of one API call per row.

## Going further

- **Run it on demand as well as on schedule:** duplicate the flow and change its trigger to **Manually trigger a flow**. A flow can have only one trigger, so this is a second flow, not a second trigger in the same flow.
- **Export each department's slice to its own file:** duplicate the flow per department and change only the Filter Query in Get items, for example `Department eq 'Warehouse'`.
- **Convert the export to PDF:** copy the dated .xlsx file into OneDrive (OneDrive for Business Create file), then OneDrive for Business **Convert file (Preview)** with File set to that OneDrive copy and Target Type set to PDF, then Create file to save the converted File Content as a .pdf. Convert file cannot target the SharePoint library file directly.
- **Keep a rolling window instead of an archive:** add three actions at the start of the flow: SharePoint **Get files (properties only)** on the Documents library with a Filter Query selecting files created more than 90 days ago, **Apply to each** over its value, and SharePoint **Delete file** inside the loop using each file's Id.

## Common failures

- **Export only contains 100 rows:** Get items defaults to 100. Set Top Count to 5000. Over 5,000 items, enable pagination with a Threshold, noting the Microsoft 365 cap of 5,000 and the premium cap of 100,000.
- **Status column blank:** choice columns arrive as objects. Use `item()?['Status']?['Value']`. Same for person columns (`?['DisplayName']`) and hyperlink columns (`?['Url']`). If the column allows multiple selections, the value is an array: join it into one text value first (for example, with a Select action over the array followed by a join expression).
- **Add a row fails with "table not found":** the template has no table, the Table field has a typo (it must match `ExportTable` exactly, including capitalisation), or the Create file step copied a different file than the template.
- **Flow fails with "file is locked":** someone has the output file open in Excel desktop, or a previous run is still writing to it. Close the file and re-run. If it happens on a scheduled run, the previous run probably overlapped the next one: lengthen the interval or shorten the list with a Filter Query.
- **Dates show as numbers like 45992:** the raw DueDate is an ISO timestamp and Excel displays the serial number when the cell format is General. Format dates with the `if(empty(...), '', formatDateTime(...))` expression above, and set the DueDate column in the template to the Date number format.
