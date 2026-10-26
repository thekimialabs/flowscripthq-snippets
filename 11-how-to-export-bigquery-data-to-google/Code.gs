// How to Export BigQuery Data to Google Sheets on a Schedule (No Third-Party Connectors)
// Tutorial: https://flowscripthq.blogspot.com/2026/10/how-to-export-bigquery-data-to-google.html
// From FlowScriptHQ — https://flowscripthq.blogspot.com

/**
 * FlowScriptHQ - Autonomous BigQuery to Google Sheets Exporter
 * Runs a parameterized SQL query and populates the target sheet tab.
 */
function syncBigQueryToSheet() {
  const projectId = "your-gcp-project-id"; // Replace with your GCP Project ID
  const targetSheetTab = "BigQueryData";     // Target tab name
  
  // Standard SQL Query (Use backticks for project/dataset/table references)
  const sqlQuery = `
    SELECT 
      DATE(creation_date) AS report_date,
      category,
      country_code,
      COUNT(1) AS total_events,
      ROUND(SUM(revenue_usd), 2) AS total_revenue
    FROM \`your-gcp-project-id.analytics_warehouse.daily_events\`
    WHERE creation_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)
    GROUP BY 1, 2, 3
    ORDER BY total_revenue DESC
    LIMIT 5000;
  `;

  const request = {
    query: sqlQuery,
    useLegacySql: false // Always use Standard SQL
  };

  // 1. Submit Query Job to BigQuery API
  let queryResults = BigQuery.Jobs.query(request, projectId);
  const jobId = queryResults.jobReference.jobId;

  // 2. Wait for Job Completion if asynchronous
  let sleepCount = 0;
  while (!queryResults.jobComplete) {
    Utilities.sleep(1000);
    sleepCount++;
    if (sleepCount > 60) {
      throw new Error("BigQuery query timed out after 60 seconds.");
    }
    queryResults = BigQuery.Jobs.getQueryResults(projectId, jobId);
  }

  // 3. Extract Dynamic Headers from Schema
  const headers = queryResults.schema.fields.map(field => field.name);
  const rows = [];
  rows.push(headers); // Append header row

  // 4. Page through results using pageToken
  let pageToken = queryResults.pageToken;
  while (true) {
    const currentRows = queryResults.rows;
    if (currentRows && currentRows.length > 0) {
      for (let i = 0; i < currentRows.length; i++) {
        const rowData = currentRows[i].f.map(col => col.v !== null ? col.v : "");
        rows.push(rowData);
      }
    }

    if (!pageToken) break; // Finished reading all pages

    queryResults = BigQuery.Jobs.getQueryResults(projectId, jobId, { pageToken: pageToken });
    pageToken = queryResults.pageToken;
  }

  // 5. Write to Sheet with Atomic Clear and Single setValues Batch
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(targetSheetTab);
  if (!sheet) {
    sheet = ss.insertSheet(targetSheetTab);
  }

  // Clear existing data to prevent leftover rows
  sheet.clearContents();

  if (rows.length > 0) {
    const outputRange = sheet.getRange(1, 1, rows.length, headers.length);
    outputRange.setValues(rows);
    
    // Style Header Row
    sheet.getRange(1, 1, 1, headers.length)
      .setFontWeight("bold")
      .setBackground("#f1f5f9");
    sheet.setFrozenRows(1);
  }

  Logger.log(`Successfully imported ${rows.length - 1} rows from BigQuery.`);
}
