# Snippets — Power Automate: Send a Weekly Email of SharePoint List Items

Tutorial: https://flowscripthq.blogspot.com/2026/10/power-automate-send-weekly-email-of.html

## Flow steps (in order)

1. **Recurrence** trigger — Repeat every 1 Week, on Monday, starting next Monday 08:00. Set **Time zone** to the recipients' time zone (default is UTC — leaving it shifts the send time).
2. **Get items** (SharePoint) — Site Address + List Name, Filter Query for the last 7 days, Top Count 5000, Order By `Created desc`. Turn on Pagination (threshold above 5000) if the list can grow past 5,000 items in a week.
3. **Select** (Data Operation) — From = `value` from Get items.
4. **Condition** (empty-list guard) — advanced mode, left value = `length(body('Get_items')?['value'])`, operator **is greater than**, right value `0`.
5. **Create HTML table** (Data Operation) — From = Select output (Yes branch).
6. **Compose** (table styling) — wraps the HTML table with Outlook-safe inline styles (Yes branch).
7. **Send an email (V2)** (Outlook) — Is HTML = Yes; Body = introduction + Compose output (Yes branch). No branch: a short "no items this week" note.

## Filter Query (last 7 days)

Type `Created ge '` in the Filter Query field, then insert ONLY the expression `addDays(utcNow(),-7)` through the expression editor (fx) — do not type the whole line as plain text. The field must read:

```
Created ge '@{addDays(utcNow(),-7)}'
```

For updates instead of arrivals, filter on `Modified ge '@{addDays(utcNow(),-7)}'`. For open items only, extend with `and Status ne 'Done'`.

## Select mappings

- **Title** ← `item()?['Title']`
- **Status** ← `item()?['Status']?['Value']` (a choice column is an object; mapping it directly puts `{"Value":"In progress"}` in the table)
- **Created** ← `formatDateTime(convertTimeZone(item()?['Created'],'UTC','Eastern Standard Time'),'yyyy-MM-dd')`
- **Due** ← `if(empty(item()?['DueDate']),'',formatDateTime(convertTimeZone(item()?['DueDate'],'UTC','Eastern Standard Time'),'yyyy-MM-dd'))`
- **Assigned to** ← `item()?['AssignedTo']?['DisplayName']`

Replace `'Eastern Standard Time'` with the recipients' time zone. Check the Due column's internal name first: a UI-created "Due date" column is `Due_x0020_Date`, not `DueDate`. For a multi-select person column, join names with:

```
join(xpath(xml(json(concat('{"root":{"value":', item()?['AssignedTo'], '}}'))), '/root/value/DisplayName/text()'), ', ')
```

## Empty-list guard (Condition, advanced mode)

```
length(body('Get_items')?['value'])
```

Replace `Get_items` with the action's actual name if renamed (spaces become underscores).

## Table styling (Compose)

```
replace(replace(body('Create_HTML_table'),'<table>','<table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse;font-family:Calibri,Arial,sans-serif;font-size:14px;">'),'<th>','<th style="background-color:#1F4E79;color:#ffffff;text-align:left;padding:6px;">')
```

## Email subject

```
Weekly task report — @{formatDateTime(utcNow(),'yyyy-MM-dd')}
```

## CSV variant (Going further)

After Select, add **Create CSV table** (From = Select output), then **Create file** (OneDrive for Business) with File Name `Weekly-task-report-@{formatDateTime(utcNow(),'yyyy-MM-dd')}.csv` and File Content = Create CSV table output. Then **Get file content** using the Id from Create file, and attach it in Send an email (V2) with the same dated filename — do not attach the Create file output directly.
