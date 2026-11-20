# Snippets — How to Remove Duplicates in Google Sheets with Apps Script

Tutorial: https://flowscripthq.blogspot.com/2026/11/how-to-remove-duplicates-in-google.html

Full script: `Code.gs` in this folder (dedupeRows, dedupeInPlace, onOpen). Paste it into Extensions > Apps Script, save, and rename the project to `Remove Duplicate Rows`.

## Test data (Step 1)

Tab **Responses**, header row: Timestamp, Name, Email, Ticket type.

```
2026-11-20 09:02 | Ana Ruiz | ana@example.com | Standard
2026-11-20 09:15 | Ben Osei | ben@example.com | VIP
2026-11-20 09:40 | Ana Ruiz | ana@example.com | VIP
2026-11-20 10:05 | Cleo Tan | cleo@example.com | Standard
```

Rows 2 and 4 are the duplicate pair (same email, different timestamps and ticket types). A whole-row comparison keeps both; the key-column script keeps one.

## Settings (top of Code.gs)

- `SOURCE_SHEET = 'Responses'` — tab with the raw data.
- `OUTPUT_SHEET = 'Cleaned'` — tab the script writes to (created if missing).
- `KEY_COLUMN = 3` — column C: Email. Duplicates share this value.
- `KEEP_LATEST = true` — true = keep the last row per key in sheet order, false = keep the first.
- `HEADER_ROWS = 1` — header row is copied, never deduped.

With `KEEP_LATEST = true`, Cleaned holds Ben Osei, Ana Ruiz 09:40 VIP, Cleo Tan. With `false`, it holds Ana Ruiz 09:02 Standard, Ben Osei, Cleo Tan.

## Two-column key (FAQ)

One column is not always enough: two different people can share a name. Replace the two key lines and the blank-key check inside the loop with:

```javascript
const parts = [row[1], row[2]].map(function (v) { return String(v || '').trim().toLowerCase(); });
if (parts.every(function (p) { return p === ''; })) { kept.push(row); continue; }
const key = parts.join('|');
```

`row[1]` is column B (Name) and `row[2]` is column C (Email). Two rows count as duplicates only when both parts match. The pipe separates the parts so "Ann" + "A Lee" is not treated as "Anna" + "Lee". If your data can contain pipes, use a different separator that does not appear in your data.

## UNIQUE formulas (no script)

- Each unique row once: `=UNIQUE(A2:D)`
- One column only: `=UNIQUE(C2:C)`
- In order: `=SORT(UNIQUE(C2:C))`
- Only rows whose email appears exactly once (both copies of any duplicated email are dropped): `=FILTER(A2:D, ARRAYFORMULA(COUNTIF(C2:C, C2:C)=1))`

UNIQUE compares whole rows, so it misses duplicates with different timestamps. It needs empty cells below and to the right for its result to spill into.

## Find duplicates before deleting

Select the Email column, choose Format > Conditional formatting, custom formula:

```
=COUNTIF($C$2:$C, C2)>1
```

## Triggers

- **On every form submission:** Triggers > Add Trigger, function `dedupeRows`, event source **From spreadsheet**, event type **On form submit**. A simple `onEdit` trigger cannot do this: a form submission is not a hand edit. Submit a test response with an email already in the sheet and wait up to a minute. On a form receiving hundreds of responses an hour, use the nightly schedule instead, because each run rewrites the whole Cleaned tab.
- **Nightly schedule:** Triggers > Add Trigger, function `dedupeRows`, event source **Time-driven**, type **Day timer**, for example 2 a.m. to 3 a.m.

## What Cleaned does not keep

`getValues()` and `setValues()` copy cell values only. Formulas, cell formatting, hyperlinks, data validation, conditional formatting, and notes do not carry over. If a column is a formula, Cleaned holds the calculated result as a static value. Do not use Cleaned as the source for a sheet that depends on live formulas or formatting.

## Keep latest means last in sheet order

The script keeps the last row it meets for each key. If rows arrive out of order (CSV import or manual paste), the last row in the sheet may not be the newest submission. Sort the source tab by Timestamp, oldest to newest, before running with `KEEP_LATEST = true`.

## Common failures

- **Zero duplicates reported when duplicates are visible:** `KEY_COLUMN` points at the wrong column (column C is 3, not 2); the tab name in `SOURCE_SHEET` is case-sensitive (`Responses` is not `responses`); or read the Executions log, which states how many duplicates were removed and how many unique rows were kept.
- **Built-in remover misses duplicates:** it counts two rows as duplicates only when every ticked column matches exactly. A trailing space breaks the match; a ticked Timestamp column breaks it. Letter case does not break the match.
- **Date or number key:** `String()` includes the time of day, so two rows on the same date at different times count as different keys. For a date key, add a helper column with the date only, for example `=TEXT(A2, "yyyy-mm-dd")`, and point `KEY_COLUMN` at it. For numeric IDs, format the column as Plain text before typing the IDs, or leading zeros are lost.
- **10,000 rows:** fine — one read, two writes. Past 50,000 rows, split the source by month or team and clean one tab per run. Deleting rows one by one is the slow path: every `deleteRow` shifts the rows below it and costs a separate request.
