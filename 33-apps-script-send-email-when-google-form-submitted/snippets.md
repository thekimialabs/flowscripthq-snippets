# Snippets — Apps Script: Send an Email When a Google Form Is Submitted

Tutorial: https://flowscripthq.blogspot.com/2026/11/apps-script-send-email-when-google-form.html

`Code.gs` is the complete project: the owner alert, the respondent confirmation, answer-based routing to team inboxes, the `testEmail()` test helper, and the sheet-bound variant. Paste it into the form's Script editor (More (...) > Script editor) and name the project `Form Submit Email Alerts`.

## Form setup

Questions used in the examples: Name (short answer), Department (dropdown: Support, Sales, Billing), Message (paragraph). Any questions work; the routing step adapts to whatever dropdown you have.

Turn on **Settings > Responses > Collect email addresses** so `response.getRespondentEmail()` returns a value. Without it, the script can still email the owner, but it has no address to send a confirmation to.

## Trigger

The function name alone does nothing. In the editor, Triggers (clock icon) > Add Trigger:

- Function to run: `onFormSubmit`
- Deployment: Head
- Event source: From form
- Event type: On form submit
- Failure notifications: Notify me daily (immediately while testing)

On save, authorise the script to send email. On the "Google has not verified this app" screen, click Advanced > Go to Form Submit Email Alerts (unsafe). That warning appears because the script is your own unverified project.

## How it works

- `onFormSubmit(e)` reads the answers from `e.response.getItemResponses()`, sends the owner an alert with every answer, and sends the respondent a confirmation when an email address was collected.
- `ROUTING` maps a question title and answer to an extra team inbox, so a Department answer of Support also alerts support@example.com. Routing matches the formatted answer exactly; a checkbox question returns a joined list such as "Support, Sales", which matches no key and routes nowhere.
- Checkbox answers arrive as arrays and are joined into one line. File-upload answers arrive as arrays of Drive file IDs and are turned into clickable Drive links.
- Answers are escaped before they go into the HTML body, so a respondent typing `<script>` into a text field cannot inject markup into the email.
- The email is sent as both plain text and HTML (`htmlBody`), so it reads well in Gmail and in plain-text clients.
- `GmailApp` is used instead of `MailApp` because the confirmation is sent from your Gmail account; either works with the same arguments, but do not mix the two in one project, because each asks for its own authorisation scope. Note: authorising `GmailApp` asks for permission to read, compose, send and permanently delete all your email, and some Workspace admins block that scope, while `MailApp` only asks to send.

## Testing

Do not test by clicking Run on `onFormSubmit`: the event object `e` only exists when a real submission fires the trigger. Either submit the form for real, or run `testEmail()`, which calls `onFormSubmit` with a fake event shaped like the real one. When the test passes, delete the test response from the form's Responses tab so it does not pollute real data.

## Quotas to know

- Free Gmail: 100 recipients a day through Apps Script. Google Workspace: 1,500. Every address on every email counts, so one submission with an owner alert plus a confirmation uses at least two recipients.
- One trigger run is capped at 6 minutes; total trigger runtime is 90 minutes a day on a free account (6 hours on Workspace). Sending one or two emails takes about 2 seconds.
- Hitting the daily quota fails the run with `Exception: Service invoked too many times for one day: email`.

## Common failures

- Nothing happens on submit: the installable trigger is missing. Naming the function `onFormSubmit` does not register it.
- `Cannot read properties of undefined (reading 'response')`: you clicked Run in the editor. Use a real submission or `testEmail()`.
- `getRespondentEmail()` blank: the form is not collecting email addresses.
- Emails sent twice per submission: the trigger was created twice. Open Triggers and delete the duplicate.
- Trigger stops working after the form was copied: triggers do not copy with a form. Create the trigger again in the copy's editor and re-authorise.
