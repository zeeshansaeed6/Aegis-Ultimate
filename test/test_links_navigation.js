const assert = require('assert');
const http = require('http');
const express = require('express');
const {
  sanitizeHtmlForBrowser,
  handleBrowserProxy,
  tabActiveUrls,
  getTabActiveUrl,
  renderHttpErrorPage
} = require('../server/browserProxy');

console.log('🧪 Starting Universal Link Navigation & Routing Test Suite...\n');

// ---------------------------------------------------------------------------
// Test 1: In-Page HTML Link & Form Rewriting
// ---------------------------------------------------------------------------
console.log('▶ Test 1: In-Page HTML Link & Form Rewriting');

const dirtyHtml = `
<!DOCTYPE html>
<html>
<head><title>Test Links</title></head>
<body>
  <a href="/tools/merge-pdf" id="link-rel">Merge PDF</a>
  <a href="https://wikipedia.org/wiki/Privacy" id="link-abs" target="_top">Wikipedia</a>
  <a href="https://external.com/newtab" id="link-blank" target="_blank">New Window</a>
  <a href="#section-2" id="link-hash">Hash Link</a>
  <a href="javascript:void(0)" id="link-js">JS Link</a>
  <a href="mailto:support@example.com" id="link-mail">Email</a>
  <a href="tel:+1234567890" id="link-tel">Phone</a>
  <area href="/map/area" shape="rect" coords="0,0,50,50">
  <form action="/search" method="GET" target="_parent">
    <input type="text" name="q" value="test">
  </form>
</body>
</html>
`;

const { html: rewrittenHtml } = sanitizeHtmlForBrowser(dirtyHtml, 'https://example.com/dashboard', 'tab_link_test');

assert.ok(rewrittenHtml.includes('/api/browser/proxy?tabId=tab_link_test') && rewrittenHtml.includes('url=https%3A%2F%2Fexample.com%2Ftools%2Fmerge-pdf'), 'Relative link was rewritten to proxy route');
assert.ok(rewrittenHtml.includes('data-aegis-url="https://example.com/tools/merge-pdf"'), 'Relative link received data-aegis-url attribute');

assert.ok(rewrittenHtml.includes('/api/browser/proxy?tabId=tab_link_test') && rewrittenHtml.includes('url=https%3A%2F%2Fwikipedia.org%2Fwiki%2FPrivacy'), 'Absolute link was rewritten to proxy route');
assert.ok(!rewrittenHtml.includes('target="_top"'), 'target="_top" was rewritten to target="_self"');

assert.ok(rewrittenHtml.includes('target="_blank"'), 'target="_blank" preserved for new tab handling');
assert.ok(rewrittenHtml.includes('href="#section-2"'), 'Hash links preserved untouched');
assert.ok(rewrittenHtml.includes('href="javascript:void(0)"'), 'Javascript links preserved untouched');
assert.ok(rewrittenHtml.includes('href="mailto:support@example.com"'), 'Mailto links preserved untouched');
assert.ok(rewrittenHtml.includes('href="tel:+1234567890"'), 'Tel links preserved untouched');

assert.ok(rewrittenHtml.includes('action="/api/browser/proxy?tabId=tab_link_test') && rewrittenHtml.includes('url=https%3A%2F%2Fexample.com%2Fsearch"'), 'Form action rewritten to proxy route');
assert.ok(!rewrittenHtml.includes('target="_parent"'), 'target="_parent" was rewritten to target="_self"');

console.log('  ✓ In-page HTML anchor and form rewriting verified.\n');

// ---------------------------------------------------------------------------
// Test 2: Shield Script In-Page Navigation Handlers
// ---------------------------------------------------------------------------
console.log('▶ Test 2: Injected Shield Script Navigation Handlers');

assert.ok(rewrittenHtml.includes('AEGIS_BROWSER_NAV'), 'Shield script posts AEGIS_BROWSER_NAV on in-tab link click');
assert.ok(rewrittenHtml.includes('AEGIS_BROWSER_OPEN_TAB'), 'Shield script posts AEGIS_BROWSER_OPEN_TAB on target="_blank" or Ctrl-click');
assert.ok(rewrittenHtml.includes('history.pushState'), 'Shield script virtualizes history.pushState for SPAs');
assert.ok(rewrittenHtml.includes('history.replaceState'), 'Shield script virtualizes history.replaceState for SPAs');
assert.ok(rewrittenHtml.includes('location.assign'), 'Shield script intercepts window.location.assign');
assert.ok(rewrittenHtml.includes('location.replace'), 'Shield script intercepts window.location.replace');

console.log('  ✓ Shield script in-page event interception verified.\n');

// ---------------------------------------------------------------------------
// Test 3: HTTP Server Relative Navigation & Cookie Fallback Integration
// ---------------------------------------------------------------------------
console.log('▶ Test 3: Relative Navigation 302 Redirect & Cookie Fallback Middleware');

const app = express();

// Track test tab URL
tabActiveUrls.set('tab_session_99', 'https://example.com/viewer');

app.use(async (req, res, next) => {
  if (req.path.startsWith('/api/') || req.path.startsWith('/browser/search')) {
    return next();
  }

  const referer = req.headers.referer || req.headers.referrer || '';
  let targetUrlParam = null;
  let tabIdParam = req.query.tabId || '';

  if (referer.includes('/api/browser/proxy')) {
    try {
      const refUrl = new URL(referer);
      targetUrlParam = refUrl.searchParams.get('url');
      tabIdParam = refUrl.searchParams.get('tabId') || tabIdParam;
    } catch(e) {}
  }

  if (!tabIdParam) {
    const cookieHeader = req.headers.cookie || '';
    const match = cookieHeader.match(/(?:^|; )aegis_active_tab=([^;]*)/);
    if (match) {
      try { tabIdParam = decodeURIComponent(match[1]); } catch(e) {}
    }
  }

  if (!tabIdParam) tabIdParam = 'default_tab';
  if (!targetUrlParam) targetUrlParam = getTabActiveUrl(tabIdParam);

  if (targetUrlParam) {
    try {
      const resolvedSubresource = new URL(req.originalUrl || req.url, targetUrlParam).href;
      const isHtmlNav = req.headers.accept && req.headers.accept.includes('text/html');
      if (isHtmlNav && req.method === 'GET') {
        return res.redirect(302, `/api/browser/proxy?tabId=${encodeURIComponent(tabIdParam)}&url=${encodeURIComponent(resolvedSubresource)}`);
      }
      return res.status(200).json({ proxiedSubresource: resolvedSubresource, tabId: tabIdParam });
    } catch(e) {}
  }
  next();
});

app.get('/api/browser/proxy', (req, res) => {
  const tabId = req.query.tabId || 'default_tab';
  const url = req.query.url || '';
  res.setHeader('Referrer-Policy', 'same-origin');
  res.setHeader('Set-Cookie', `aegis_active_tab=${encodeURIComponent(tabId)}; Path=/; SameSite=Lax`);
  res.status(200).send(`<html><body>Proxy Loaded: ${url}</body></html>`);
});

const server = app.listen(0, () => {
  const port = server.address().port;

  // 3a. Initial proxy load sets cookie and Referrer-Policy
  http.get(`http://127.0.0.1:${port}/api/browser/proxy?tabId=tab_session_99&url=https%3A%2F%2Fexample.com%2Fviewer`, (res) => {
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.headers['referrer-policy'], 'same-origin');
    const setCookie = res.headers['set-cookie'] ? res.headers['set-cookie'].join(';') : '';
    assert.ok(setCookie.includes('aegis_active_tab=tab_session_99'), 'Proxy sets aegis_active_tab cookie');

    // 3b. Relative link click navigation /merge_pdf with Cookie
    const navReq = http.request({
      hostname: '127.0.0.1',
      port: port,
      path: '/merge_pdf',
      method: 'GET',
      headers: {
        'Accept': 'text/html,application/xhtml+xml',
        'Cookie': 'aegis_active_tab=tab_session_99'
      }
    }, (navRes) => {
      assert.strictEqual(navRes.statusCode, 302, 'Relative navigation returns 302 redirect');
      assert.ok(navRes.headers.location.includes('/api/browser/proxy?tabId=tab_session_99&url=https%3A%2F%2Fexample.com%2Fmerge_pdf'), 'Redirects directly to proxied destination URL');

      // 3c. Relative subresource request with Referer
      const subReq = http.request({
        hostname: '127.0.0.1',
        port: port,
        path: '/static/theme.css',
        method: 'GET',
        headers: {
          'Accept': 'text/css,*/*',
          'Referer': `http://127.0.0.1:${port}/api/browser/proxy?tabId=tab_session_99&url=https%3A%2F%2Fexample.com%2Fviewer`
        }
      }, (subRes) => {
        assert.strictEqual(subRes.statusCode, 200, 'Subresource returns 200 proxy response');
        let body = '';
        subRes.on('data', chunk => body += chunk);
        subRes.on('end', () => {
          const json = JSON.parse(body);
          assert.strictEqual(json.proxiedSubresource, 'https://example.com/static/theme.css', 'Subresource correctly resolved and proxied');
          assert.strictEqual(json.tabId, 'tab_session_99');

          server.close(() => {
            console.log('  ✓ Relative navigation 302 redirect and cookie fallback verified.\n');

            // ---------------------------------------------------------------------------
            // Test 4: Cloud Host Offline & Unstyled HTTP 404 Error Page Generation
            // ---------------------------------------------------------------------------
            console.log('▶ Test 4: Cloud Host Offline & Unstyled HTTP 404 Diagnostic Error Page');

            const errorHtml = renderHttpErrorPage({
              status: 404,
              targetUrl: 'https://portfolio-uvim.onrender.com/',
              tabId: 'tab_test_404',
              hostname: 'portfolio-uvim.onrender.com',
              rawBody: 'Not Found\n',
              renderRouting: 'no-server'
            });

            assert.ok(errorHtml.includes('CLOUD HOST NOTICE • RENDER.COM'), 'Error page flags Render.com cloud host notice');
            assert.ok(errorHtml.includes('Service Offline / No Server Instance'), 'Error page indicates service is offline');
            assert.ok(errorHtml.includes('x-render-routing: no-server'), 'Error page diagnoses x-render-routing: no-server');
            assert.ok(errorHtml.includes('https://zeeshansaeed.netlify.app'), 'Error page offers active portfolio mirror');
            assert.ok(errorHtml.includes('AEGIS_BROWSER_NAV'), 'Error page notifies parent browser tab to update title');
            assert.ok(errorHtml.includes('404 Not Found — portfolio-uvim.onrender.com'), 'Error page sets clean diagnostic tab title');

            console.log('  ✓ Cloud host offline and diagnostic error page verified.\n');
            console.log('✨ All Universal Link Navigation & Routing tests passed with 100% SUCCESS!\n');
          });
        });
      });
      subReq.end();
    });
    navReq.end();
  });
});
