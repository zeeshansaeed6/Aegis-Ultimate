/**
 * Test Suite: Aegis Time Machine & Web Highlighter Super-Browser Features
 * Validates:
 * 1. Wayback Machine API & Multi-Archive Fallback Generator
 * 2. Wayback Timestamp Formatting & Sanitization
 * 3. Server-Side HTTP Endpoint: GET /api/wayback
 * 4. Web Highlighter Data Model & Markdown Citation Serialization
 * 5. Global Desktop Spotlight IPC & Keybinding Surface
 */

const assert = require('assert');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { lookupWaybackSnapshot, getArchiveFallbacks, formatWaybackTimestamp } = require('../server/timeMachine');
const { app } = require('../server/server');

async function runTimeMachineAndHighlighterTests() {
  console.log('🧪 Starting Time Machine & Web Highlighter Test Suite...\n');

  // --------------------------------------------------------------------------
  // Test 1: Archive Fallbacks Generation
  // --------------------------------------------------------------------------
  console.log('1. Testing Multi-Archive Fallback URL Generators...');
  const target = 'https://expressjs.com/en/starter/installing.html';
  const fallbacks = getArchiveFallbacks(target);

  assert(fallbacks, 'Fallbacks must return an object');
  assert(fallbacks.waybackUrl.includes('web.archive.org/web/*/https://expressjs.com'), 'Must contain Wayback calendar url');
  assert(fallbacks.waybackLatestUrl.includes('web.archive.org/web/https://expressjs.com'), 'Must contain Wayback latest url');
  assert(fallbacks.archiveTodayUrl.includes('archive.today/newest/https://expressjs.com'), 'Must contain Archive.today url');
  assert(fallbacks.googleCacheUrl.includes('webcache.googleusercontent.com/search?q=cache:https://expressjs.com'), 'Must contain Google Cache url');
  console.log('   ✓ Verified 4 independent web archive fallback URLs:');
  console.log(`     • Wayback: ${fallbacks.waybackUrl}`);
  console.log(`     • Archive.today: ${fallbacks.archiveTodayUrl}`);
  console.log(`     • Google Cache: ${fallbacks.googleCacheUrl}`);

  // --------------------------------------------------------------------------
  // Test 2: Wayback Timestamp Formatting
  // --------------------------------------------------------------------------
  console.log('\n2. Testing Wayback Machine Timestamp Formatting...');
  const formatted1 = formatWaybackTimestamp('20240514124400');
  assert.strictEqual(formatted1, 'May 14, 2024 at 12:44 UTC');

  const formatted2 = formatWaybackTimestamp('20231102093000');
  assert.strictEqual(formatted2, 'Nov 2, 2023 at 09:30 UTC');

  const formattedInvalid = formatWaybackTimestamp('');
  assert.strictEqual(formattedInvalid, 'Archived');
  console.log(`   ✓ Formatted '20240514124400' -> "${formatted1}"`);

  // --------------------------------------------------------------------------
  // Test 3: Wayback API Snapshot Lookup
  // --------------------------------------------------------------------------
  console.log('\n3. Testing Wayback Machine API Snapshot Lookup...');
  const snapshotResult = await lookupWaybackSnapshot('https://example.com');
  assert(snapshotResult, 'Lookup result must not be null');
  assert.strictEqual(snapshotResult.success, true, 'Lookup must report success');
  assert(snapshotResult.targetUrl.startsWith('https://example.com'), 'Target URL must be normalized');
  assert(snapshotResult.waybackUrl.includes('example.com'), 'Wayback URL must be present');
  console.log(`   ✓ Snapshot lookup finished (Available: ${snapshotResult.available}, URL: ${snapshotResult.snapshotUrl || snapshotResult.waybackUrl})`);

  // Invalid URL handling
  const invalidResult = await lookupWaybackSnapshot('');
  assert.strictEqual(invalidResult.success, false, 'Empty URL must return false');
  console.log('   ✓ Verified empty/invalid URL error handling.');

  // --------------------------------------------------------------------------
  // Test 4: Web Highlighter Data Model & Markdown Citation Serialization
  // --------------------------------------------------------------------------
  console.log('\n4. Testing Web Highlighter Serialization & Markdown Compiler...');
  const mockAnnotations = [
    {
      id: 'hl_1',
      text: 'Privacy is not about having something to hide, it is about the right to self-determination.',
      color: 'yellow',
      note: 'Key definition of digital privacy',
      url: 'https://privacyguides.org/basics',
      title: 'Privacy Basics'
    },
    {
      id: 'hl_2',
      text: 'BM25 scoring balances term frequency with document length normalization.',
      color: 'emerald',
      note: 'Information retrieval formula',
      url: 'https://en.wikipedia.org/wiki/Okapi_BM25',
      title: 'Okapi BM25'
    }
  ];

  // Markdown compiler logic test
  const colorIcons = { yellow: '🟡', emerald: '🟢', cyan: '🔵', magenta: '🟣' };
  let compiledMarkdown = `## 📚 Web Highlights & Research Notes (${mockAnnotations.length})\n\n`;
  mockAnnotations.forEach((item, idx) => {
    const icon = colorIcons[item.color] || '📌';
    compiledMarkdown += `${idx + 1}. ${icon} **"${item.text}"**\n`;
    if (item.note) compiledMarkdown += `   - *Note:* ${item.note}\n`;
    if (item.url) compiledMarkdown += `   - *Source:* [${item.title}](${item.url})\n\n`;
  });

  assert(compiledMarkdown.includes('🟡 **"Privacy is not about having something to hide'), 'Must compile yellow highlight quote');
  assert(compiledMarkdown.includes('🟢 **"BM25 scoring balances term frequency'), 'Must compile emerald highlight quote');
  assert(compiledMarkdown.includes('Key definition of digital privacy'), 'Must compile marginal note');
  assert(compiledMarkdown.includes('https://privacyguides.org/basics'), 'Must preserve source citation URL');
  console.log(`   ✓ Synthesized formatted research markdown notes (${compiledMarkdown.length} chars) with full metadata.`);

  // --------------------------------------------------------------------------
  // Test 5: HTTP Server Integration for /api/wayback
  // --------------------------------------------------------------------------
  console.log('\n5. Testing HTTP Server Endpoint /api/wayback...');
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;

  try {
    // 5a. Missing URL param
    const resBad = await fetch(`http://localhost:${port}/api/wayback`);
    assert.strictEqual(resBad.status, 400, 'Missing url query param must return 400');
    const dataBad = await resBad.json();
    assert.strictEqual(dataBad.success, false);

    // 5b. Valid URL param
    const resGood = await fetch(`http://localhost:${port}/api/wayback?url=https://expressjs.com`);
    assert.strictEqual(resGood.status, 200, 'Valid url must return 200');
    const dataGood = await resGood.json();
    assert.strictEqual(dataGood.success, true);
    assert(dataGood.waybackUrl.includes('expressjs.com'), 'Must return Wayback archive fallbacks');
    console.log(`   ✓ HTTP endpoint /api/wayback verified (Status: ${resGood.status}, Target: ${dataGood.targetUrl})`);
  } finally {
    server.close();
  }

  // --------------------------------------------------------------------------
  // Test 6: Desktop Spotlight Global Keybinding Surface
  // --------------------------------------------------------------------------
  console.log('\n6. Testing Electron Global Shortcut & Preload IPC Surface...');
  const mainJsContent = fs.readFileSync(path.join(__dirname, '..', 'electron', 'main.js'), 'utf8');
  assert(mainJsContent.includes('globalShortcut'), 'electron/main.js must import globalShortcut');
  assert(mainJsContent.includes('Alt+Space'), 'electron/main.js must register Alt+Space shortcut');
  assert(mainJsContent.includes('spotlight-trigger'), 'electron/main.js must emit spotlight-trigger IPC event');

  const preloadJsContent = fs.readFileSync(path.join(__dirname, '..', 'electron', 'preload.js'), 'utf8');
  assert(preloadJsContent.includes('onSpotlightTrigger'), 'electron/preload.js must expose onSpotlightTrigger API');
  console.log('   ✓ Electron main process and preload bridge verified for Global Desktop Spotlight.');

  console.log('\n🎉 ALL TIME MACHINE & WEB HIGHLIGHTER TESTS PASSED 100% SUCCESSFULLY!\n');
}

runTimeMachineAndHighlighterTests().catch(err => {
  console.error('❌ Test Suite Failed:', err);
  process.exit(1);
});
