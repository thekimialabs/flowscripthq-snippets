# Snippets — Power Automate: Send an Email When a SharePoint Item Is Overdue

Tutorial: https://flowscripthq.blogspot.com/2026/11/power-automate-send-email-when.html

## SharePoint list this flow expects

List name: `Team Tasks`

| Column | Type | Notes |
| --- | --- | --- |
| Title | Single line of text | The task name. |
| Assigned To | Person, single selection | The flow emails this person's address. |
| Due Date | Date and time, Date Only | A date-time value with a time component changes the comparison. |
| Status | Choice | Not Started, In Progress, Completed. The flow skips Completed. |
| Last Reminder Sent | Date and time, Date Only, optional | The flow stamps this so the list shows when each item was last chased. |

Flow type: **Scheduled cloud flow**, Recurrence trigger, every day at 08:00 in your local time zone. There is no trigger that fires when a date passes, so a scheduled check is the correct pattern for anything date-based.

## Power Automate expressions

### Compose - Today

```
formatDateTime(utcNow(), 'yyyy-MM-dd')
```

`utcNow()` is always UTC, whatever time zone the Recurrence trigger uses. If the UTC date is a day behind the local date at 8 AM, localise it (Windows time zone name, not IANA):

```
convertTimeZone(utcNow(), 'UTC', 'Pakistan Standard Time', 'yyyy-MM-dd')
```

### Get items — Filter Query

Returns only overdue, still-open items. Set Top Count to 5000 (Get items returns only 100 by default). Index the DueDate and Status columns while the list has fewer than 5,000 items.

```
DueDate lt '@{outputs('Compose_-_Today')}' and Status ne 'Completed'
```

An item due today is not overdue yet, so it is correctly excluded and picked up tomorrow if still open.

### Compose - Days Overdue

Inside the Apply to each loop over the Get items `value` output:

```
div(sub(ticks(concat(outputs('Compose_-_Today'), 'T00:00:00Z')), ticks(items('Apply_to_each')?['DueDate'])), 864000000000)
```

`ticks()` converts a date to 100-nanosecond intervals since 1 January 0001; dividing by 864000000000 (ticks in one day) gives whole days. An item due yesterday returns 1, a week ago returns 7. Use the same Compose - Today output here, not `utcNow()` directly, so the count and the filter agree.

### Condition — milestone days only

Four OR branches on the Compose - Days Overdue output, so the assignee hears about a task on day 1, 7, 14, and 30 only, not every day it stays overdue:

- Days Overdue is equal to `1`
- OR Days Overdue is equal to `7`
- OR Days Overdue is equal to `14`
- OR Days Overdue is equal to `30`

Weekly-nudge alternative (true on days 1, 8, 15, 22, 29):

```
equals(mod(sub(outputs('Compose_-_Days_Overdue'), 1), 7), 0)
```

### Send an email (V2) — Subject

```
Overdue: @{items('Apply_to_each')?['Title']} (@{if(equals(outputs('Compose_-_Days_Overdue'), 1), '1 day overdue', concat(string(outputs('Compose_-_Days_Overdue')), ' days overdue'))})
```

### Send an email (V2) — Body (HTML, Is HTML: Yes)

```
<p>Hi,</p><p>The task <strong>@{items('Apply_to_each')?['Title']}</strong> was due on @{items('Apply_to_each')?['DueDate']} and is now <strong style="color:#c0392b;">@{outputs('Compose_-_Days_Overdue')} days overdue</strong>.</p><p><a href="@{items('Apply_to_each')?['{Link}']}">Open the task in SharePoint</a></p>
```

To: the `Assigned To Email` dynamic content from the Get items output. If Assigned To is blank, the action fails validation for that loop iteration only.

### Update item — Last Reminder Sent

SharePoint **Update item**, Id set to the item's `ID`, Last Reminder Sent set to the output of `Compose - Today`. Pass Title and Assigned To Claims back too: Update item requires a value for every required column.

## Going further

### Multiple assignees

In Step 1, allow multiple selections in Assigned To. Inside the loop, add a **Select** action with From set to the Assigned To array and Map set to the Email field, then join with a Compose action:

```
join(body('Select_-_Assignee_Emails'), ';')
```

### One summary email per person

After Get items, add a **Select** (From: Get items value output, Map: Email to Assigned To Email), then a Compose action named `Compose - Distinct Assignees`:

```
union(body('Select_-_Assignee_Emails'), body('Select_-_Assignee_Emails'))
```

Apply to each over that output, Filter array to that assignee's items, Create HTML table, then one Send an email (V2) per person.

### Escalation to the manager after 7 days

Inside the If yes branch, Condition: Days Overdue is greater than or equal to 7. Then Office 365 Users **Get manager (V2)** with User set to the Assigned To Email, then Send an email (V2) to the manager's `Mail` output, subject:

```
Escalation: @{items('Apply_to_each')?['Title']} is @{outputs('Compose_-_Days_Overdue')} days overdue
```

### Remind before the due date

Separate scheduled flow, same Recurrence trigger and Compose - Today. Get items filter for tasks due in 7 days:

```
DueDate eq '@{addDays(outputs('Compose_-_Today'), 7, 'yyyy-MM-dd')}' and Status ne 'Completed'
```

Use 3 instead of 7 for a 3-days-before reminder, and `DueDate eq '@{outputs('Compose_-_Today')}'` for a due-today reminder. Subject:

```
Due in 7 days: @{items('Apply_to_each')?['Title']}
```
