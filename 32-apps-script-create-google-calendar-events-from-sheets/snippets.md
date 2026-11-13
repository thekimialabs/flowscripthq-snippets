# Snippets — Apps Script: Create Google Calendar Events from Google Sheets

Tutorial: https://flowscripthq.blogspot.com/2026/11/apps-script-create-google-calendar.html

`Code.gs` is the complete project: the sync function, the daily-trigger installer, and the sheet menu. Paste it into Extensions > Apps Script and name the project `Sheet to Calendar Sync`.

## Sheet layout

Tab named `Events`, headers in row 1:

| Column | Header | Notes |
| --- | --- | --- |
| A | Title | The event name. |
| B | Start | Start date and time, for example `2026-11-20 10:00`. |
| C | End | End date and time. For an all-day event the End date is exclusive: use the day after the last day. |
| D | Location | Optional. |
| E | Guests | Optional, email addresses separated by commas. |
| F | Description | Optional. |
| G | All-day | Optional, `TRUE` for an all-day event. |
| H | Event ID | Leave empty. The script fills this in; it is the sync key that stops duplicates. |

Start and End must be real date-and-time cells, not text (`=ISNUMBER(B2)` should return TRUE).

## How it works

- `syncSheetToCalendar()` reads every row, creates events with `CalendarApp`, and writes each event ID back to column H in a single `setValues` call.
- On later runs it looks up the stored ID with `getEventById()` and updates the existing event instead of creating a second one.
- A row with an event ID but no title deletes that event. Deleting the whole row (including the ID) leaves the event on the calendar, so use the blank-title method or a Status column instead.
- A five-minute guard stops the run before Google's six-minute execution limit; the next scheduled run re-scans from the top and reaches further down the sheet.
- `installDailyTrigger()` installs a daily 7 AM trigger and deletes any old trigger for the same function first, so running it twice never creates a duplicate schedule.
- `onOpen()` adds a "Calendar Sync" menu with a "Sync now" item.

## Quotas to know

- 5,000 calendar events created per day on a personal Gmail account, 10,000 on Google Workspace, per user.
- Creating events too fast can fail with "Service invoked too many times in a short time: Calendar". Add `Utilities.sleep(1000)` inside the loop after each event is created.
- Trigger runs share a daily runtime allowance of 90 minutes (personal) / 6 hours (Workspace).

## Variant fragments

### Recurring events (weekly series)

Replace `createEvent` with `createEventSeries` and pass a recurrence. Store the series ID the same way, but look it up with `calendar.getEventSeriesById()`, not `getEventById()`, which returns null for a series ID. `CalendarEventSeries` has no `setTime` method: to change one occurrence, fetch it as a `CalendarEvent` and call `setTime()` on it; to change the whole series, use `setRecurrence()` on the series.

```javascript
// Creates a weekly series: every Monday at 10:00, 10 times.
// Store the logged series ID in column H and look it up with
// calendar.getEventSeriesById(), not getEventById().
function createWeeklySeries() {
  const calendar = CalendarApp.getDefaultCalendar();
  const recurrence = CalendarApp.newRecurrence()
    .addWeeklyRule()
    .onlyOnWeekday(CalendarApp.Weekday.MONDAY)
    .times(10);
  const series = calendar.createEventSeries(
    'Weekly team standup',
    new Date('2026-11-16T10:00:00'),
    new Date('2026-11-16T11:00:00'),
    recurrence
  );
  Logger.log('Series ID: ' + series.getId());
}
```

### Sync to a shared or team calendar

Paste the calendar ID into `CALENDAR_ID` at the top of the script (Calendar settings > Integrate calendar > Calendar ID). You need edit access to that calendar. Alternative lookup by name (less safe, names are not unique):

```javascript
CalendarApp.getCalendarsByName('Team Calendar')[0]
```

### Read the calendar back into the sheet

`calendar.getEvents(startDate, endDate)` returns the events in a range; one `setValues` call writes their titles and times into the sheet.
