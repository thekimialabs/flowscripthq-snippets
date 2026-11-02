# Snippets — Power Automate Get Items Limit: How to Get More Than 5,000 SharePoint Items (Pagination, Top Count, ID Batching)

Tutorial: https://flowscripthq.blogspot.com/2026/11/power-automate-get-items-limit-how-to.html

## Count check (Compose after Get items)

```
length(outputs('Get_items')?['body/value'])
```

If this returns 100 while the list is larger, Top Count is still at its default.

## Get items settings

- **Top Count:** `5000`
- **Pagination:** on, **Threshold** up to `100000` (premium per-user / per-flow plans only; standard Microsoft 365 plans still stop at 5,000)
- **Limit Columns by View:** a view that excludes unneeded lookup columns, to avoid the lookup-threshold error

## Do Until batching by ID (over 5,000 items on any license)

Variables before the loop: **LastID** (integer, `0`), **BatchCount** (integer, `1`), **AllItems** (array, `[]`).

Loop condition: **BatchCount is equal to 0**.

Inside the loop, Get items settings:

- **Top Count:** `5000`
- **Filter Query:** `ID gt @{variables('LastID')}` — combine with an existing filter using `and`, e.g. `Status eq 'Active' and ID gt @{variables('LastID')}`
- **Order By:** `ID asc`

Set variable — BatchCount (inside the loop, after Get items):

```
length(outputs('Get_items')?['body/value'])
```

Set variable — LastID (inside the loop, after Get items):

```
coalesce(last(outputs('Get_items')?['body/value'])?['ID'], variables('LastID'))
```

Then Apply to each over the Get items `value` array, appending each item to **AllItems**. Build the final table, email, or write from **AllItems** once, after the loop ends — not inside it.

If your flow already has a second Get items action, use its exact internal name (e.g. `Get_items_2`) in every expression above.

## Threshold errors

- Lookup-threshold error: `The query cannot be completed because the number of lookup columns it contains exceeds the lookup column threshold.` — fix with Limit Columns by View (see above).
- List-view-threshold error on filtered queries: `The attempted operation is prohibited because it exceeds the list view threshold enforced by the administrator.` — filter on an indexed column, or batch by ID (ID is always indexed).
