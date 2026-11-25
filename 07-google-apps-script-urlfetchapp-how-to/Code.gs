// Google Apps Script UrlFetchApp: How to Send Authenticated POST Requests with Custom JSON Headers (With Retry Logic)
// Tutorial: https://flowscripthq.blogspot.com/2026/10/google-apps-script-urlfetchapp-how-to.html
// From FlowScriptHQ — https://flowscripthq.blogspot.com
//
// Contents: the retry function from the original post, plus every snippet
// added by the 25 Nov 2026 upgrade (worked example, GET and query strings,
// content types, fetchAll, error responses, token storage).
// All new snippets were run live on 25 Nov 2026 against JSONPlaceholder
// and httpbin.org and returned the results quoted in the post.

/**
 * FlowScriptHQ - Resilient HTTP POST Dispatcher with Exponential Backoff
 */
function postJsonWithRetry(endpointUrl, payloadObj, bearerToken = null, maxRetries = 3) {
  const headers = {
    "Accept": "application/json"
  };

  if (bearerToken) {
    headers["Authorization"] = `Bearer ${bearerToken}`;
  }

  const options = {
    method: "post",
    contentType: "application/json",
    headers: headers,
    payload: JSON.stringify(payloadObj),
    muteHttpExceptions: true
  };

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      Logger.log(`[HTTP POST] Attempt ${attempt} -> ${endpointUrl}`);
      const response = UrlFetchApp.fetch(endpointUrl, options);
      const statusCode = response.getResponseCode();
      const responseText = response.getContentText();

      // Successful 2xx range
      if (statusCode >= 200 && statusCode < 300) {
        Logger.log(`[HTTP 200] Success: ${responseText.slice(0, 100)}...`);
        return JSON.parse(responseText);
      }

      // Handle Rate Limiting (429) or Server Errors (5xx)
      if (statusCode === 429 || statusCode >= 500) {
        const sleepTimeMs = Math.pow(2, attempt) * 1000;
        Logger.warn(`[HTTP ${statusCode}] Retrying in ${sleepTimeMs / 1000}s...`);
        Utilities.sleep(sleepTimeMs);
        continue;
      }

      // Unrecoverable client error
      throw new Error(`API returned status ${statusCode}: ${responseText}`);

    } catch (networkErr) {
      if (attempt === maxRetries) throw networkErr;
      Utilities.sleep(2000 * attempt);
    }
  }
}

// --- Section A: worked example, post one Sheet row and read the reply ---
// Sheet "Orders", A1:F2: Order, Customer, Product, Region, Amount, Date
// and one row: 1001, Dana, Pocket Watch, North, 65.00, 2026-10-02.
// Verified live 25 Nov 2026: logs the attempt line, then the parsed reply
// with id 101, and writes 101 into G2.
function postOneOrder() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Orders');
  const row = sheet.getRange('A2:F2').getValues()[0];
  const payload = {
    orderId: row[0],
    customer: row[1],
    product: row[2],
    region: row[3],
    amount: row[4],
    date: row[5]
  };
  const result = postJsonWithRetry('https://jsonplaceholder.typicode.com/posts', payload);
  Logger.log(result);
  sheet.getRange('G2').setValue(result.id);
}

// Same call, raw reply. Verified live 25 Nov 2026: Status 201, body with
// the posted fields and id 101.
function postOneOrderRaw() {
  const options = {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify({ orderId: 1001, customer: 'Dana' }),
    muteHttpExceptions: true
  };
  const response = UrlFetchApp.fetch('https://jsonplaceholder.typicode.com/posts', options);
  Logger.log('Status: ' + response.getResponseCode());
  Logger.log('Body: ' + response.getContentText());
}

// --- Section B: GET requests and building query strings ---
// Verified live 25 Nov 2026: logs the title of JSONPlaceholder post 1.
function getOnePost() {
  const response = UrlFetchApp.fetch('https://jsonplaceholder.typicode.com/posts/1', {
    method: 'get',
    muteHttpExceptions: true
  });
  const post = JSON.parse(response.getContentText());
  Logger.log(post.title);
}

function buildQuery(params) {
  return Object.keys(params).map(function (key) {
    return encodeURIComponent(key) + '=' + encodeURIComponent(params[key]);
  }).join('&');
}

// Verified live 25 Nov 2026: logs "3 posts returned".
function getPostsForUser() {
  const query = buildQuery({ userId: 1, _limit: 3 });
  const response = UrlFetchApp.fetch(
    'https://jsonplaceholder.typicode.com/posts?' + query,
    { method: 'get', muteHttpExceptions: true }
  );
  const posts = JSON.parse(response.getContentText());
  Logger.log(posts.length + ' posts returned');
}

// --- Section C: content types compared ---
// Form-encoded variant. Verified live 25 Nov 2026 against httpbin.org/post:
// the endpoint received the fields as form data. The JSON variant is the
// postJsonWithRetry call above.
function postFormEncoded() {
  const options = {
    method: 'post',
    contentType: 'application/x-www-form-urlencoded',
    payload: buildQuery({ orderId: 1001, customer: 'Dana' }),
    muteHttpExceptions: true
  };
  const response = UrlFetchApp.fetch('https://httpbin.org/post', options);
  Logger.log('Status: ' + response.getResponseCode());
  Logger.log('Body: ' + response.getContentText());
}

// Multipart file upload. Do NOT set contentType: Apps Script builds the
// multipart body and its boundary when the payload is an object holding a
// Blob. Replace the example URL and file id with real values before running.
// Pattern verified live 25 Nov 2026 against httpbin.org/post: the file
// arrived in the "files" section and the title in the "form" section.
function uploadInvoiceFile() {
  const file = DriveApp.getFileById('PASTE_FILE_ID_HERE').getBlob();
  const options = {
    method: 'post',
    payload: {
      title: 'Invoice 1001',
      file: file
    },
    muteHttpExceptions: true
  };
  const response = UrlFetchApp.fetch('https://example.com/upload', options);
  Logger.log(response.getResponseCode());
}

// --- Section D: fetchAll for parallel calls ---
// Verified live 25 Nov 2026: logs all five post titles in request order.
function getFivePosts() {
  const requests = [1, 2, 3, 4, 5].map(function (id) {
    return {
      url: 'https://jsonplaceholder.typicode.com/posts/' + id,
      method: 'get',
      muteHttpExceptions: true
    };
  });
  const responses = UrlFetchApp.fetchAll(requests);
  responses.forEach(function (response, index) {
    const code = response.getResponseCode();
    if (code === 200) {
      const post = JSON.parse(response.getContentText());
      Logger.log('Post ' + (index + 1) + ': ' + post.title);
    } else {
      Logger.log('Post ' + (index + 1) + ' failed with status ' + code);
    }
  });
}

// --- Section E: reading error responses ---
// Read the Retry-After header after a 429. Verified live 25 Nov 2026
// against httpbin.org/status/429: no Retry-After header, so the fallback
// of 60 seconds applied.
function readRetryAfter(response) {
  const headers = response.getHeaders();
  const waitSeconds = headers['Retry-After'] || headers['retry-after'] || 60;
  Logger.log('Rate limited, waiting ' + waitSeconds + ' seconds');
  Utilities.sleep(Number(waitSeconds) * 1000);
}

// --- Section F: storing tokens in PropertiesService ---
// Run setApiToken once by hand, then replace the literal token with a
// placeholder so the real value sits only in Script Properties.
function setApiToken() {
  PropertiesService.getScriptProperties().setProperty('API_TOKEN', 'paste-your-token-here');
}

function getApiToken() {
  const token = PropertiesService.getScriptProperties().getProperty('API_TOKEN');
  if (!token) {
    throw new Error('API_TOKEN is not set. Run setApiToken() once, then try again.');
  }
  return token;
}
