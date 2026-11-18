# Snippets — Save Email Attachments to SharePoint with Power Automate

Tutorial: https://flowscripthq.blogspot.com/2026/11/save-email-attachments-to-sharepoint.html

Power Automate has no importable code files — this file collects the exact expressions, trigger settings, and action settings from the tutorial so you can copy them into the right action.

## Trigger — When a new email arrives (V3), Office 365 Outlook

- **Folder:** Inbox (the trigger watches one folder only; an Outlook rule moving mail out of the Inbox first means the flow never fires)
- **Include Attachments:** Yes (the default No returns an empty attachments list and the flow saves nothing)
- **Only with Attachments:** Yes (otherwise the flow runs, and counts against your daily action limit, on every email)
- **From:** optional, one sender address
- **Subject Filter:** optional, a word the subject must contain (contains match, not exact)
- Leave **To** and **Cc** blank unless you need them.

## Create file — SharePoint

- **Site Address:** your site, for example Finance
- **Folder Path:** your library, for example `/Invoices` (Create file cannot create the library or a folder; create folders first or it fails with NotFound)
- **File Name:** dynamic content **Attachments Name** (do not type an extension; the name already includes it)
- **File Content:** dynamic content **Attachments Content** (the file bytes; mapping File Content to Attachments Name writes a corrupt file)

Picking an Attachments value makes Power Automate add an **Apply to each** loop over the **Attachments** array. One email with three attachments creates three files. Do not delete the loop.

## Stop duplicates overwriting — timestamped name expression

Inside the **Apply to each** loop, before Create file, add SharePoint **Get file content using path** with **File Path** set to the library path plus the attachment name, for example `/Invoices/` + **Attachments Name**.

Two Create file actions replace the single one:

- **File already exists** (Get file content using path has succeeded): **Configure run after** = has succeeded. File Name expression:

```powerautomate
concat(formatDateTime(triggerOutputs()?['body/receivedDateTime'], 'yyyy-MM-dd-HHmmss'), '_', items('Apply_to_each')?['name'])
```

- **No file yet** (Get file content using path has failed): **Configure run after** = has failed. File Name = **Attachments Name**, File Content = **Attachments Content**.

The timestamp uses the email's received time in UTC. For local time, replace `triggerOutputs()?['body/receivedDateTime']` with `convertFromUtc(triggerOutputs()?['body/receivedDateTime'], 'Pakistan Standard Time')`. If you renamed the loop, use its actual name instead of `Apply_to_each`.

Get file content using path fails by design whenever a name is new, which marks the run Failed. Outside the **Apply to each** loop, add a **Terminate** action with status **Succeeded** and **Configure run after** on the loop set to **has failed** (untick **is successful**).

## File-type filter — Condition inside the loop

Add a **Condition** action inside the loop, above Get file content using path. Expression tab, left value:

```powerautomate
endsWith(items('Apply_to_each')?['name'], '.pdf')
```

Operator **is equal to**, right value **true**. Drag the name check and both Create file actions into the **If yes** branch. `endsWith()` is not case-sensitive, so `INVOICE.PDF` matches. Two types:

```powerautomate
or(endsWith(items('Apply_to_each')?['name'], '.pdf'), endsWith(items('Apply_to_each')?['name'], '.xlsx'))
```

To save everything except images, use the opposite filter: save when the name does not end in `.png`, `.jpg`, or `.gif`. Put the Condition inside the loop, not outside it: outside the loop there is no single attachment name to test.

## Shared mailbox version

Trigger: **When a new email arrives in a shared mailbox (V2)**. Set **Original Mailbox Address** to the shared mailbox, for example `invoices@company.com`. Folder Inbox, Include Attachments Yes, Only with Attachments Yes. Everything else (Create file, timestamp expression, Condition) is identical. The account behind the Outlook connection needs Full Access (Read and manage) to the shared mailbox, granted by an admin under Mailbox delegation in the Exchange admin centre. Send As alone does not give read access, and permission changes can take up to two hours to replicate.

## Clear a backlog of old mail

The trigger only fires on new mail. Build a second, manually triggered flow with **Get emails (V3)**: Top 25 per run, Include Attachments Yes, and narrow with **Search Query** (not Filter Query), for example `hasAttachments:true`. Outer Apply to each over the returned emails, inner Apply to each over each email's Attachments, same Create file step inside the inner loop. Run once per batch until the backlog is gone.

## Strip attachments from the email after saving (Graph)

There is no standard connector action that strips just the attachment and keeps the email. Inside the **Apply to each** loop, after Create file, add the Office 365 Outlook **Send an HTTP request** action: method **DELETE**, Uri:

```
me/messages/{Message Id}/attachments/{Attachment Id}
```

Use the trigger's Message Id and the attachment's Id from dynamic content. For a shared mailbox, replace `me` with `users/{shared mailbox address}`. Do not use **Delete email (V2)** for this: it deletes the whole email. Test the DELETE call on a copy first.

## Going further

- **Move processed mail out of the inbox:** after Create file, add Outlook **Move email (V2)** after the Apply to each loop, once per email, using the trigger's Message Id and moving to a **Processed** folder. Do not put it inside the loop: it would try to move the same email once per attachment.
- **Save to OneDrive instead:** swap SharePoint Create file for the OneDrive for Business Create file action; trigger, loop, timestamp expression, and Condition stay the same.
- **File by sender or subject:** add a **Switch** action inside the loop on the trigger's **From** address, one case per supplier, each case with its own copy of the Step 3 name check and Create file branches with a different **Folder Path** (for example `/Invoices/Acme`).
- **Failure alerts:** add a failure branch with **Configure run after** that emails you when Create file fails. The pattern is in the companion guide "Power Automate Error Handling: Configure Run After So a Failed Flow Alerts You".

## The four test emails (Step 6)

Send from another address, first three with subject `Invoice TEST`, the fourth with a subject that does not contain `Invoice`:

1. One small PDF.
2. Two attachments (a small PDF and a small PNG).
3. The same file name sent twice (both copies must survive, the second with a timestamp).
4. Subject without `Invoice` (with a Subject Filter set, the flow must not fire and no file is saved).

Check the SharePoint library after each, and in Power Automate check Run history shows **Succeeded** and the loop ran once per attachment. If the flow was off during testing, switch it back on: a flow left off fails without any visible error.

## Limits to know

- 6,000 Power Platform requests per user in a sliding 24-hour window; each action execution counts.
- The trigger skips any email whose total message size is over the Exchange admin limit or 50 MB, whichever is less. The Outlook connector caps mail content at 49 MB; the Exchange Online default receive limit is 36 MB. Save mail over that size by hand.
- No Power Automate Premium licence needed: the Office 365 Outlook and SharePoint connectors are standard connectors.
- The trigger normally fires within a few minutes of the email arriving. If nothing appears after 10 minutes, check Run history: a Succeeded run with no file usually means Include Attachments was left at No.

## Common failures

- Run Succeeded but no file: **Include Attachments** left at No, wrong **Folder Path**, or an Outlook rule moved the mail out of the Inbox first.
- Saved file empty or will not open: **File Content** mapped to **Attachments Name** instead of **Attachments Content**.
- Same-name file lost: no check-first pattern; Create file replaces a file with the same name without asking.
- Run shows Failed even though the file saved: expected — Get file content using path fails by design on new names. The Terminate action outside the loop fixes the run status.
