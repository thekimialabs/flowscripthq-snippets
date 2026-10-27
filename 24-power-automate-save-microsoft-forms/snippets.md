# Snippets — Power Automate: Save Microsoft Forms Responses and Attachments to a SharePoint List

Tutorial: https://flowscripthq.blogspot.com/2026/10/power-automate-save-microsoft-forms.html

## Flow steps (in order)

1. **When a new response is submitted** (Microsoft Forms) — trigger, select the form from the Form Id dropdown.
2. **Get response details** (Microsoft Forms) — same Form Id; Response Id from the trigger's dynamic content.
3. **Create item** (SharePoint) — Site Address + List Name, then map each form answer to a list column (Title, Email, Category).
4. **Condition** (guard) — only if the file upload question is optional.
5. **Parse JSON** (Data Operation) — inside the If yes branch.
6. **Apply to each** — input = Parse JSON output (body).
7. **Get file content using path** (OneDrive for Business) — inside the loop.
8. **Add attachment** (SharePoint) — inside the loop, after the fetch.

## No-file guard (Condition)

Left side: the file upload answer from Get response details.
Operator: **is not equal to**. Right side: `[]`

Put the Parse JSON, loop, fetch, and attach steps inside the **If yes** branch; leave **If no** empty. An empty upload answer is an empty JSON array — parsing or looping over it without this guard fails an otherwise normal response.

## Parse JSON schema

Content: the file upload answer from Get response details. Generate the schema from a sample that includes a file, then keep `required` to just `name` and `link`:

```json
{
  "type": "array",
  "items": {
    "type": "object",
    "properties": {
      "name": { "type": "string" },
      "link": { "type": "string" },
      "id": { "type": "string" },
      "size": { "type": "integer" }
    },
    "required": ["name", "link"]
  }
}
```

## Apply to each

Input: the Parse JSON output (body). One iteration per uploaded file. Keep concurrency at the default (sequential) — easier to debug, fast enough for form uploads.

## Get file content using path (inside the loop)

- **File:** the `link` value from the Parse JSON output (the file's location in the form owner's OneDrive).
- Do not substitute the form's public link — it fails with file-not-found.

## Add attachment (inside the loop)

- **Site Address:** the same site as Create item.
- **List Name:** the same list as Create item.
- **Id:** the **ID** from the Create item step.
- **File Name:** the `name` value from the Parse JSON output (prefix with the item ID when duplicate names are plausible, e.g. repeated "resume.pdf").
- **File Content:** the **File Content** output of the Get file content using path step.

## Group-form variant

If the form is owned by a Microsoft 365 group (not a person), uploads land in the group's SharePoint site, not the owner's OneDrive. Swap the OneDrive step for SharePoint **Get file content using path**: Site Address = the group's site, File path = the file's path inside that document library (Documents → Apps → Microsoft Forms → form name → upload-question folder). Everything else stays the same.
