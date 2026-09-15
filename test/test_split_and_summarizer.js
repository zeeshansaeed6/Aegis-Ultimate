/**
 * Test Suite: Split View & AI Page Summarizer
 * Aegis Private Search Engine & Browser
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const http = require('http');
const { summarizeWebpage } = require('../server/aiSynthesizer');
const { app } = require('../server/server');

console.log('🧪 Starting Split View & AI Page Summarizer Test Suite...\n');

let passedTests = 0;
let totalTests = 0;

function runTest(description, fn) {
  totalTests++;
  try {
    fn();
    console.log(`  ✓ ${description}`);
    passedTests++;
  } catch (err) {
    console.error(`  ✗ ${description}`);
    console.error(`    ${err.message}`);
    process.exitCode = 1;
  }
}

async function runAsyncTest(description, fn) {
  totalTests++;
  try {
    await fn();
    console.log(`  ✓ ${description}`);
    passedTests++;
  } catch (err) {
    console.error(`  ✗ ${description}`);
    console.error(`    ${err.message}`);
    process.exitCode = 1;
  }
}

async function runAll() {
  // Test 1: DOM Elements in index.html
  runTest('index.html contains Split View and AI Summarizer controls', () => {
    const html = fs.readFileSync(path.join(__dirname, '../public/index.html'), 'utf8');
    assert(html.includes('id="btnToggleSplitView"'), 'Missing #btnToggleSplitView');
    assert(html.includes('id="btnSummarizePage"'), 'Missing #btnSummarizePage');
    assert(html.includes('id="browserPrimaryPane"'), 'Missing #browserPrimaryPane');
    assert(html.includes('id="browserSplitResizer"'), 'Missing #browserSplitResizer');
    assert(html.includes('id="browserSecondaryPane"'), 'Missing #browserSecondaryPane');
    assert(html.includes('id="pageSummaryDrawer"'), 'Missing #pageSummaryDrawer');
    assert(html.includes('id="summaryTakeawaysList"'), 'Missing #summaryTakeawaysList');
    assert(html.includes('id="summaryMarkdownBody"'), 'Missing #summaryMarkdownBody');
  });

  // Test 2: Stylesheets in styles.css
  runTest('styles.css contains Split View and AI Summarizer CSS rules', () => {
    const css = fs.readFileSync(path.join(__dirname, '../public/styles.css'), 'utf8');
    assert(css.includes('.btn-ai-summarize-pill'), 'Missing .btn-ai-summarize-pill');
    assert(css.includes('.browser-split-divider'), 'Missing .browser-split-divider');
    assert(css.includes('.browser-secondary-pane'), 'Missing .browser-secondary-pane');
    assert(css.includes('.page-summary-drawer'), 'Missing .page-summary-drawer');
    assert(css.includes('.split-view-active'), 'Missing .split-view-active');
  });

  // Test 3: JavaScript functions in app.js
  runTest('app.js defines initSplitViewBrowsing and initAiPageSummarizer logic', () => {
    const js = fs.readFileSync(path.join(__dirname, '../public/app.js'), 'utf8');
    assert(js.includes('function initSplitViewBrowsing'), 'Missing initSplitViewBrowsing');
    assert(js.includes('function toggleSplitView'), 'Missing toggleSplitView');
    assert(js.includes('function navigateSecondaryPane'), 'Missing navigateSecondaryPane');
    assert(js.includes('function swapSplitPanes'), 'Missing swapSplitPanes');
    assert(js.includes('function initAiPageSummarizer'), 'Missing initAiPageSummarizer');
    assert(js.includes('function handleSummarizePage'), 'Missing handleSummarizePage');
    assert(js.includes('function copySummaryToClipboard'), 'Missing copySummaryToClipboard');
    assert(js.includes('function clipSummaryToNotes'), 'Missing clipSummaryToNotes');
  });

  // Test 4: Link Open Exclusivity (Must always open in Aegis Browser, NEVER external Chrome)
  runTest('Search results and link clicks are intercepted and routed exclusively into Aegis Browser', () => {
    const js = fs.readFileSync(path.join(__dirname, '../public/app.js'), 'utf8');
    const mainJs = fs.readFileSync(path.join(__dirname, '../electron/main.js'), 'utf8');
    
    // In app.js: result-title-link click must call openInPrivateBrowser
    assert(js.includes('openInPrivateBrowser(targetUrl, title);'), 'result-title-link must route to openInPrivateBrowser');
    // In app.js: universal link interceptor must route to openInPrivateBrowser
    assert(js.includes('// Universal Link Interception: Route ALL web links into Aegis Private Browser'), 'Missing universal link interceptor in app.js');
    // In electron/main.js: will-navigate must intercept and route to openInPrivateBrowser
    assert(mainJs.includes('mainWindow.webContents.on(\'will-navigate\''), 'Missing will-navigate interceptor in main.js');
    // In electron/main.js: setWindowOpenHandler must route to openInPrivateBrowser
    assert(mainJs.includes('openInPrivateBrowser'), 'Missing openInPrivateBrowser call in setWindowOpenHandler');
  });

  // Test 4: Offline NLP Summarizer Algorithm Unit Test
  await runAsyncTest('summarizeWebpage() generates 3 takeaways & TL;DR with offline NLP fallback', async () => {
    const sampleText = `
      Artificial intelligence has made rapid strides across diverse technical fields.
      Modern browsers are adopting intelligent assistants that summarize long-form articles in real time.
      Privacy-focused architecture ensures that personal browsing histories and telemetry are not transmitted to ad networks.
      Offline natural language processing enables devices to parse sentence importance based on position, length, and keyword frequencies.
      Users benefit from streamlined reading experiences, saving valuable research time while retaining core context.
      Zero-knowledge encryption protects user passwords, bookmark libraries, and session cookies from malicious actors.
    `;

    const res = await summarizeWebpage({
      title: 'The Evolution of Private Browsing',
      text: sampleText,
      provider: 'offline'
    });

    assert(res, 'Result must exist');
    assert(Array.isArray(res.takeaways), 'Takeaways must be an array');
    assert(res.takeaways.length >= 1 && res.takeaways.length <= 3, 'Should produce 1-3 takeaways');
    assert(typeof res.summary === 'string' && res.summary.length > 20, 'Summary should be non-empty string');
    assert(typeof res.readingTimeMinutes === 'number', 'readingTimeMinutes must be a number');
    assert(typeof res.wordCount === 'number', 'wordCount must be a number');
    assert(res.wordCount > 50, 'wordCount should count words accurately');
  });

  // Test 5: Server Route /api/ai/summarize-page HTTP Integration Test
  await runAsyncTest('POST /api/ai/summarize-page returns structured summary response', async () => {
    const server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, resolve));
    const port = server.address().port;

    try {
      const postData = JSON.stringify({
        title: 'Quantum Computing Breakthrough',
        text: 'Researchers have demonstrated quantum supremacy with a 128-qubit coherent processor. The system utilizes superconducting transmon qubits cooled to near absolute zero. Error mitigation algorithms drastically reduce decoherence rates during multi-step quantum gate calculations. Commercial applications include materials synthesis, cryptography, and molecular dynamics simulations.'
      });

      const response = await new Promise((resolve, reject) => {
        const req = http.request(
          {
            hostname: '127.0.0.1',
            port,
            path: '/api/ai/summarize-page',
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Content-Length': Buffer.byteLength(postData)
            }
          },
          (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve({ status: res.statusCode, data: JSON.parse(data) }));
          }
        );
        req.on('error', reject);
        req.write(postData);
        req.end();
      });

      assert.strictEqual(response.status, 200, 'HTTP status should be 200');
      assert.strictEqual(response.data.success, true, 'Response should indicate success');
      assert(Array.isArray(response.data.takeaways), 'Takeaways must be an array');
      assert(response.data.takeaways.length >= 1, 'Should have at least 1 takeaway');
      assert(response.data.summary.length > 10, 'Summary should contain briefing content');
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  // Test 6: POST /api/ai/summarize-page with missing URL and text handles error
  await runAsyncTest('POST /api/ai/summarize-page rejects requests with no url or text', async () => {
    const server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, resolve));
    const port = server.address().port;

    try {
      const postData = JSON.stringify({});

      const response = await new Promise((resolve, reject) => {
        const req = http.request(
          {
            hostname: '127.0.0.1',
            port,
            path: '/api/ai/summarize-page',
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Content-Length': Buffer.byteLength(postData)
            }
          },
          (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve({ status: res.statusCode, data: JSON.parse(data) }));
          }
        );
        req.on('error', reject);
        req.write(postData);
        req.end();
      });

      assert.strictEqual(response.status, 400, 'HTTP status should be 400 for empty request');
      assert.strictEqual(response.data.success, false, 'Response should indicate failure');
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  console.log(`\nResults: ${passedTests}/${totalTests} tests passed.`);
  if (passedTests === totalTests) {
    console.log('🎉 ALL SPLIT VIEW & AI SUMMARIZER TESTS PASSED PERFECTLY!\n');
  } else {
    process.exit(1);
  }
}

runAll().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
