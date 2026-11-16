// Sends an email every time this Google Form is submitted.
// Bound to the form: open the form, click More (...) > Script editor.
// Requires an INSTALLABLE trigger (see Step 4). Naming the function
// onFormSubmit does not make it run on its own.

const OWNER_EMAIL = 'you@example.com'; // Change this: the inbox that gets every response.

// Optional routing: when the answer to a question matches a value below,
// that team's inbox is added to the alert. The question title must match
// your form exactly, including capitalisation.
const ROUTING = {
  'Department': {
    'Support': 'support@example.com',
    'Sales': 'sales@example.com',
    'Billing': 'billing@example.com'
  }
};

function onFormSubmit(e) {
  const response = e.response;
  const answers = response.getItemResponses().map(function (itemResponse) {
    return {
      question: itemResponse.getItem().getTitle(),
      answer: formatAnswer(itemResponse)
    };
  });

  const submittedAt = response.getTimestamp();
  const respondentEmail = response.getRespondentEmail(); // Blank unless "Collect email addresses" is on.

  sendOwnerAlert(answers, submittedAt, respondentEmail);
  if (respondentEmail) {
    sendConfirmation(respondentEmail, answers);
  }
}

// Checkbox answers arrive as arrays; join them into one line. File-upload
// answers arrive as arrays of Drive file IDs, so turn each ID into a
// clickable Drive link instead of listing the raw ID.
function formatAnswer(itemResponse) {
  const answer = itemResponse.getResponse();
  if (itemResponse.getItem().getType() === FormApp.ItemType.FILE_UPLOAD) {
    const fileIds = Array.isArray(answer) ? answer : [answer];
    return fileIds.map(function (id) {
      return 'https://drive.google.com/file/d/' + id + '/view';
    }).join(', ');
  }
  if (Array.isArray(answer)) return answer.join(', ');
  return String(answer == null ? '' : answer);
}

function sendOwnerAlert(answers, submittedAt, respondentEmail) {
  const lines = answers.map(function (a) { return a.question + ': ' + a.answer; });
  const plainBody = 'A new response was submitted'
    + (respondentEmail ? ' by ' + respondentEmail : '')
    + ' at ' + submittedAt + '.\n\n' + lines.join('\n');
  const htmlBody = '<p>A new response was submitted'
    + (respondentEmail ? ' by <b>' + escapeHtml(respondentEmail) + '</b>' : '')
    + ' at ' + escapeHtml(String(submittedAt)) + '.</p><ul>'
    + answers.map(function (a) {
        return '<li><b>' + escapeHtml(a.question) + ':</b> ' + escapeHtml(a.answer) + '</li>';
      }).join('')
    + '</ul>';
  GmailApp.sendEmail(
    routeRecipients(answers),
    'New form response' + (respondentEmail ? ': ' + respondentEmail : ''),
    plainBody,
    { htmlBody: htmlBody }
  );
}

function routeRecipients(answers) {
  const recipients = [OWNER_EMAIL];
  answers.forEach(function (a) {
    const routes = ROUTING[a.question];
    if (routes && routes[a.answer]) recipients.push(routes[a.answer]);
  });
  return recipients.join(',');
}

function sendConfirmation(respondentEmail, answers) {
  const summary = answers.map(function (a) { return a.question + ': ' + a.answer; }).join('\n');
  const plainBody = 'Hi,\n\nThank you, we received your response. Here is what you sent:\n\n'
    + summary
    + '\n\nWe will be in touch soon.';
  GmailApp.sendEmail(respondentEmail, 'We received your response', plainBody);
}

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}


// ---------------------------------------------------------------------------
// Test helper (optional): run testEmail() from the editor instead of
// submitting the form. It calls onFormSubmit with a fake event shaped
// like the real one, so the owner alert and the confirmation both go to
// OWNER_EMAIL. Delete it if you prefer a clean project.
// ---------------------------------------------------------------------------

// Test without submitting the form: run testEmail() from the editor.
// It calls onFormSubmit with a fake event shaped like the real one.
function testEmail() {
  const fakeEvent = {
    response: {
      getItemResponses: function () {
        return [
          mockItemResponse('Name', 'Test Person'),
          mockItemResponse('Department', 'Support'),
          mockItemResponse('Message', 'This is a test submission.')
        ];
      },
      getTimestamp: function () { return new Date(); },
      getRespondentEmail: function () { return OWNER_EMAIL; }
    }
  };
  onFormSubmit(fakeEvent);
  Logger.log('Test email sent to ' + OWNER_EMAIL);
}

function mockItemResponse(title, answer) {
  return {
    getItem: function () {
      return {
        getTitle: function () { return title; },
        getType: function () { return FormApp.ItemType.TEXT; }
      };
    },
    getResponse: function () { return answer; }
  };
}


// ---------------------------------------------------------------------------
// Sheet-bound variant (optional): attach this to the RESPONSE SHEET, not
// the form. Trigger: From spreadsheet, On form submit.
// ---------------------------------------------------------------------------

// Sheet-bound version: attach this to the RESPONSE SHEET, not the form.
// Trigger: From spreadsheet, On form submit.
function onSheetFormSubmit(e) {
  const lines = Object.keys(e.namedValues).map(function (question) {
    return question + ': ' + e.namedValues[question].join(', ');
  });
  GmailApp.sendEmail(OWNER_EMAIL, 'New form response', lines.join('\n'));
}
