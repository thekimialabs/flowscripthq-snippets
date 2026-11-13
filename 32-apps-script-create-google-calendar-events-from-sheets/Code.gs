// Syncs rows from the Events tab to Google Calendar.
// Columns: A Title, B Start, C End, D Location, E Guests,
//          F Description, G All-day (TRUE/FALSE), H Event ID
// The Event ID column is how the script updates instead of duplicating.

const SHEET_NAME = 'Events';
// Leave CALENDAR_ID empty to use your default calendar. To use a
// different calendar, paste its ID here (Calendar settings > Integrate
// calendar > Calendar ID). You need edit access to that calendar.
const CALENDAR_ID = '';

function syncSheetToCalendar() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  if (!sheet) {
    throw new Error('No tab named "' + SHEET_NAME + '" found.');
  }
  const calendar = CALENDAR_ID
    ? CalendarApp.getCalendarById(CALENDAR_ID)
    : CalendarApp.getDefaultCalendar();
  if (!calendar) {
    throw new Error('Calendar not found. Check CALENDAR_ID.');
  }

  const values = sheet.getDataRange().getValues();
  const eventIds = [];
  const runStarted = Date.now();

  // Row 1 is the header, so data starts at index 1.
  for (let i = 1; i < values.length; i++) {
    // Stop before the 6-minute execution limit and let the next
    // scheduled run pick up the remaining rows.
    if (Date.now() - runStarted > 5 * 60 * 1000) {
      Logger.log('Stopped at row ' + (i + 1) + ' to stay inside the time limit.');
      break;
    }

    const row = values[i];
    const title = String(row[0] || '').trim();
    const start = toDate(row[1]);
    let end = toDate(row[2]);
    const location = String(row[3] || '').trim();
    const guests = String(row[4] || '').trim();
    const description = String(row[5] || '').trim();
    const allDay = row[6] === true || String(row[6]).toUpperCase() === 'TRUE';
    let eventId = String(row[7] || '').trim();

    try {
    // A row with an event ID but no title means "delete this event".
    if (!title && eventId) {
      const oldEvent = calendar.getEventById(eventId);
      if (oldEvent) oldEvent.deleteEvent();
      eventIds.push('');
      continue;
    }
    // Skip blank rows and rows with no usable dates.
    if (!title || !start || !end) {
      eventIds.push(eventId);
      continue;
    }
    if (allDay && end <= start) {
      // All-day end dates are exclusive: a one-day event has
      // End on the day after Start, so treat Start = End as one day.
      end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
    } else if (!allDay && end <= start) {
      Logger.log('Row ' + (i + 1) + ': end is not after start, skipped.');
      eventIds.push(eventId);
      continue;
    }

    const options = { description: description, location: location };
    if (guests) {
      options.guests = guests;
      options.sendInvites = true;
    }

    let event = eventId ? calendar.getEventById(eventId) : null;
    if (event) {
      // Update the existing event instead of creating a duplicate.
      event.setTitle(title);
      if (allDay) {
        event.setAllDayDates(start, end);
      } else {
        event.setTime(start, end);
      }
      event.setDescription(description);
      event.setLocation(location);
      syncGuests(event, guests);
    } else {
      if (allDay) {
        event = calendar.createAllDayEvent(title, start, end, options);
      } else {
        event = calendar.createEvent(title, start, end, options);
      }
      eventId = event.getId();
    }
    eventIds.push(eventId);
    } catch (e) {
      Logger.log('Row ' + (i + 1) + ': ' + e.message);
      eventIds.push(eventId);
    }
  }

  // Write all event IDs back in one call instead of one write per row.
  if (eventIds.length > 0) {
    sheet.getRange(2, 8, eventIds.length, 1)
      .setValues(eventIds.map(function (id) { return [id]; }));
  }
  Logger.log('Sync finished. Processed ' + eventIds.length + ' rows.');
}

// Converts a sheet value to a Date, or null when it is not a date.
function toDate(value) {
  if (value instanceof Date && !isNaN(value.getTime())) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = new Date(value);
    if (!isNaN(parsed.getTime())) return parsed;
  }
  return null;
}

// Replaces an event's guest list with the addresses from the sheet.
function syncGuests(event, guests) {
  const wanted = guests
    ? guests.split(',').map(function (g) { return g.trim(); }).filter(Boolean)
    : [];
  event.getGuestList().forEach(function (guest) {
    if (wanted.indexOf(guest.getEmail()) === -1) event.removeGuest(guest.getEmail());
  });
  wanted.forEach(function (email) { event.addGuest(email); });
}

// Registers a daily 7 AM trigger. Run once; safe to run again.
function installDailyTrigger() {
  ScriptApp.getProjectTriggers().forEach(function (trigger) {
    if (trigger.getHandlerFunction() === 'syncSheetToCalendar') {
      ScriptApp.deleteTrigger(trigger);
    }
  });
  ScriptApp.newTrigger('syncSheetToCalendar')
    .timeBased()
    .everyDays(1)
    .atHour(7)
    .create();
  Logger.log('Daily 7 AM trigger installed.');
}

// Adds a "Calendar Sync" menu to the sheet. Runs on every open.
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Calendar Sync')
    .addItem('Sync now', 'syncSheetToCalendar')
    .addToUi();
}
