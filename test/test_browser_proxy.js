/**
 * Automated Test Suite for Aegis Built-In Sandboxed Private Web Browser
 */

const assert = require('assert');
const {
  isBlockedHost,
  sanitizeHtmlForBrowser,
  sanitizeJsForAntiFrameBusting,
  burnTabSession,
  getTabInfo,
  isBotChallengeResponse,
  renderBotChallengePage,
  escapeHtml
} = require('../server/browserProxy');
const { app } = require('../server/server');

async function runTests() {
  console.log('🧪 Starting Aegis Private Browser Test Suite...\n');

  // Test 1: SSRF and Internal Network Protection
  console.log('▶ Test 1: SSRF & Loopback Address Protection');
  assert.strictEqual(isBlockedHost('localhost'), true, 'localhost should be blocked');
  assert.strictEqual(isBlockedHost('127.0.0.1'), true, '127.0.0.1 should be blocked');
  assert.strictEqual(isBlockedHost('192.168.1.10'), true, '192.168.x.x should be blocked');
  assert.strictEqual(isBlockedHost('10.0.0.5'), true, '10.x.x.x should be blocked');
  assert.strictEqual(isBlockedHost('device.local'), true, '.local should be blocked');
  assert.strictEqual(isBlockedHost('wikipedia.org'), false, 'wikipedia.org should be allowed');
  assert.strictEqual(isBlockedHost('expressjs.com'), false, 'expressjs.com should be allowed');
  console.log('  ✓ SSRF blocking verified for private IP ranges.');

  // Test 2: HTML Sanitization & Tracking Script Stripping
  console.log('\n▶ Test 2: Tracking Script Stripping & Injected Shield');
  const dirtyHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Demo Surveillance Page</title>
        <script src="https://www.googletagmanager.com/gtag/js?id=G-12345"></script>
        <script>gtag('config', 'G-12345');</script>
        <script src="https://connect.facebook.net/en_US/fbevents.js"></script>
        <script src="/app.js"></script>
      </head>
      <body>
        <h1>Clean Article</h1>
        <p>This is safe content.</p>
        <img src="https://criteo.net/pixel.gif" width="1" height="1">
        <a href="/about">About Us</a>
      </body>
    </html>
  `;

  const { html: cleanHtml, blockedCount } = sanitizeHtmlForBrowser(dirtyHtml, 'https://example.com/page', 'tab_test_1');
  assert.ok(blockedCount >= 3, `Should detect and block at least 3 trackers. Got: ${blockedCount}`);
  assert.ok(!cleanHtml.includes('googletagmanager.com'), 'Google Tag Manager script should be removed');
  assert.ok(!cleanHtml.includes('fbevents.js'), 'Facebook Pixel script should be removed');
  assert.ok(cleanHtml.includes('id="aegis-browser-shield"'), 'Aegis Browser Shield script should be injected');
  assert.ok(cleanHtml.includes('<base href="https://example.com/page">'), 'Base href should be injected for relative assets');
  assert.ok(cleanHtml.includes('RTCPeerConnection'), 'Shield should include WebRTC leak guard');
  console.log(`  ✓ HTML sanitization verified. Blocked ${blockedCount} tracking elements.`);

  // Test 3: Tab Cookie Session Isolation & Burn Tab
  console.log('\n▶ Test 3: Tab Session Cookie Isolation & Burn Destruction');
  const tabId = 'tab_vault_isolation_99';
  const infoInitial = getTabInfo(tabId);
  assert.strictEqual(infoInitial.cookieCount, 0, 'Initial tab should have 0 cookies');

  const burnResult = burnTabSession(tabId);
  assert.strictEqual(burnResult.success, true, 'Burn tab should succeed');
  console.log('  ✓ Tab session isolation and shredding verified.');

  // Test 4: HTTP Proxy Endpoints
  console.log('\n▶ Test 4: HTTP Proxy Server-Side Verification');
  const server = app.listen(0, async () => {
    const port = server.address().port;
    const baseUrl = `http://127.0.0.1:${port}`;

    try {
      // 4a. Proxy missing target
      const resMissing = await fetch(`${baseUrl}/api/browser/proxy`);
      assert.strictEqual(resMissing.status, 400, 'Missing url query should return 400');

      // 4b. SSRF protection on HTTP endpoint
      const resSsrf = await fetch(`${baseUrl}/api/browser/proxy?url=http://127.0.0.1:8080/admin`);
      assert.strictEqual(resSsrf.status, 403, 'SSRF attempt to 127.0.0.1 should return 403');

      // 4c. Tab info endpoint
      const resInfo = await fetch(`${baseUrl}/api/browser/tab-info?tabId=test_tab_1`);
      assert.strictEqual(resInfo.status, 200);
      const infoData = await resInfo.json();
      assert.strictEqual(infoData.tabId, 'test_tab_1');

      // 4d. Burn tab endpoint
      const resBurn = await fetch(`${baseUrl}/api/browser/burn-tab`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tabId: 'test_tab_1' })
      });
      assert.strictEqual(resBurn.status, 200);
      const burnData = await resBurn.json();
      assert.strictEqual(burnData.success, true);

      console.log('  ✓ HTTP proxy endpoints verified: SSRF block (403), tab-info (200), burn-tab (200).');

      // Test 5: Cloudflare & Anti-Bot Challenge Interception
      console.log('\n▶ Test 5: Cloudflare & WAF Challenge Detection & Interstitial Generation');
      
      // 5a. Cloudflare Turnstile detection
      const cfMockHtml = `
        <!DOCTYPE html><html><head><title>Just a moment...</title></head>
        <body>
          <script src="/cdn-cgi/challenge-platform/h/b/orchestrate/chl_page/v1"></script>
          <script>window._cf_chl_opt = {};</script>
        </body></html>
      `;
      const cfChallenge = isBotChallengeResponse(403, new Headers({ server: 'cloudflare' }), cfMockHtml);
      assert.ok(cfChallenge, 'Should identify Cloudflare Turnstile challenge');
      assert.strictEqual(cfChallenge.type, 'cloudflare');
      assert.strictEqual(cfChallenge.badge, 'CLOUDFLARE TURNSTILE CHALLENGE');

      // 5b. AWS WAF detection
      const awsMockHtml = `<html><script src="https://example.com/awswaf/challenge.js"></script><input name="aws-waf-token"></html>`;
      const awsChallenge = isBotChallengeResponse(405, new Headers(), awsMockHtml);
      assert.ok(awsChallenge, 'Should identify AWS WAF challenge');
      assert.strictEqual(awsChallenge.type, 'awswaf');

      // 5c. Interstitial HUD HTML Generation
      const cardHtml = renderBotChallengePage({
        challenge: cfChallenge,
        targetUrl: 'https://leetcode.com/',
        tabId: 'test_tab_cf',
        status: 403,
        hostname: 'leetcode.com'
      });
      assert.ok(cardHtml.includes('CLOUDFLARE TURNSTILE CHALLENGE'), 'Card must have challenge badge');
      assert.ok(cardHtml.includes('Open Directly in Browser Tab'), 'Card must have direct external tab button');
      assert.ok(cardHtml.includes('AEGIS_BROWSER_OPEN_EXTERNAL'), 'Card must have external postMessage hook');
      assert.ok(cardHtml.includes('AEGIS_BROWSER_OPEN_READER'), 'Card must have reader postMessage hook');
      assert.ok(cardHtml.includes('leetcode.com'), 'Card must display destination domain');

      console.log('  ✓ Bot challenge detection (Cloudflare, AWS WAF) and interstitial card verified.');

      // Test 6: Universal Anti-Frame-Busting & Interstitial Disarm
      console.log('\n▶ Test 6: Anti-Frame-Busting & Interstitial Disarm');
      
      // 6a. JS script frame-busting neutralization (iLovePDF pattern)
      const ilovePdfSnippet = 'u.prototype.inIframe=function(){try{return window.self!==window.top}catch(e){return!0}}';
      const cleanIlovePdf = sanitizeJsForAntiFrameBusting(ilovePdfSnippet);
      assert.strictEqual(cleanIlovePdf.includes('return false'), true, 'Should convert top check to return false');
      assert.strictEqual(cleanIlovePdf.includes('window.self!==window.top'), false);

      // 6b. Classic top.location breakout neutralization
      const breakoutSnippet = 'if (top != self) { top.location = self.location; }';
      const cleanBreakout = sanitizeJsForAntiFrameBusting(breakoutSnippet);
      assert.strictEqual(cleanBreakout.includes('if (false)'), true, 'Should disarm top != self condition');
      assert.strictEqual(cleanBreakout.includes('window.location = self.location'), true);

      // 6c. HTML anti-clickjacking and interstitial removal
      const antiClickjackHtml = `
        <html>
          <head>
            <style id="antiClickjack">body { display: none !important; }</style>
            <script>if (self !== top) top.location = location;</script>
          </head>
          <body>
            <p>For security reasons iLovePDF can't allow the use of iFrame blocks.</p>
            <p>Welcome to real page!</p>
          </body>
        </html>
      `;
      const { html: sanitizedAntiFrame } = sanitizeHtmlForBrowser(antiClickjackHtml, 'https://www.ilovepdf.com/', 'tab_anti_1');
      assert.strictEqual(sanitizedAntiFrame.includes('id="antiClickjack"'), false, 'Should strip antiClickjack style');
      assert.strictEqual(sanitizedAntiFrame.includes("can't allow the use of iFrame blocks"), false, 'Should strip anti-iframe block message');
      assert.strictEqual(sanitizedAntiFrame.includes('Welcome to real page!'), true, 'Real content should remain intact');

      // 6d. HTTP redirect normalization for anti-frame trap URLs
      const resTrap = await fetch(`${baseUrl}/api/browser/proxy?url=https://www.ilovepdf.com/forbiddeniframe`, { redirect: 'manual' });
      assert.strictEqual(resTrap.status, 302, 'Should redirect anti-frame trap endpoint');
      assert.ok(resTrap.headers.get('location').includes('url=https%3A%2F%2Fwww.ilovepdf.com%2F'), 'Redirect target should be base root');

      console.log('  ✓ Anti-frame-busting scripts, antiClickjack styles, interstitial copy, and trap redirects verified.');
      console.log('\n✨ All Aegis Built-In Private Browser tests passed with 100% SUCCESS!');

    } finally {
      server.close();
    }
  });
}

runTests().catch(err => {
  console.error('\n❌ Test failed with error:', err);
  process.exit(1);
});
