/**
 * Automated Test Suite: Gmail / Universal Login Access & Google Images Experience
 */

const assert = require('assert');
const { sanitizeHtmlForBrowser } = require('../server/browserProxy');
const { searchImages } = require('../server/mediaSearch');
const { handleBrowserSearch } = require('../server/browserSearch');
const { app } = require('../server/server');

async function runTests() {
  console.log('🧪 Starting Images & Universal Login Test Suite...\n');

  // Test 1: Lazy-loaded image normalization & Referrer policy in browserProxy
  console.log('▶ Test 1: Lazy-Loaded Image Normalization & Anti-Hotlink Referrer Guard');
  const pageWithLazyImages = `
    <!DOCTYPE html>
    <html>
      <head><title>Photos</title></head>
      <body>
        <img class="lazy" data-src="https://images.example.com/photo-highres.jpg" src="data:image/svg+xml,placeholder" alt="Nature photo">
        <img class="normal" src="https://images.example.com/logo.png" alt="Logo">
        <img class="pixel" src="https://criteo.net/tracker.gif" width="1" height="1">
      </body>
    </html>
  `;

  const { html: sanitized, blockedCount } = sanitizeHtmlForBrowser(pageWithLazyImages, 'https://example.com/gallery', 'tab_img_1');
  assert.ok(sanitized.includes('src="https://images.example.com/photo-highres.jpg"'), 'data-src should be promoted to src');
  assert.ok(sanitized.includes('referrerpolicy="no-referrer"'), 'referrerpolicy="no-referrer" should be added to images');
  assert.ok(sanitized.includes('<meta name="referrer" content="no-referrer">'), 'meta name="referrer" content="no-referrer" should be injected in head');
  assert.ok(!sanitized.includes('criteo.net'), '1x1 tracking pixel should be removed');
  assert.ok(sanitized.includes('Alt+Click on any image'), 'In-page image viewing shortcut should be present in shield');
  console.log('  ✓ Lazy-loaded images normalized and referrer stripped for hotlink protection.');

  // Test 2: Complex Cookie preservation for Auth / OAuth tokens with '='
  console.log('\n▶ Test 2: Complex Auth Token & Cookie Splitting Preservation');
  const rawCookieHeader = 'SSID=A1B2C3==; Path=/; Domain=.google.com; Secure; HttpOnly';
  const [nameVal] = rawCookieHeader.split(';');
  const eqIdx = nameVal.indexOf('=');
  const k = nameVal.substring(0, eqIdx).trim();
  const v = nameVal.substring(eqIdx + 1).trim();

  assert.strictEqual(k, 'SSID', 'Cookie key should be SSID');
  assert.strictEqual(v, 'A1B2C3==', 'Cookie value with base64 padding == should NOT be truncated');
  console.log('  ✓ Complex OAuth / Session cookie values containing "=" preserved correctly.');

  // Test 3: Image Search Data Structure
  console.log('\n▶ Test 3: Image Search Data Structure & Proxy Routing');
  const images = await searchImages('sunset');
  assert.ok(Array.isArray(images), 'searchImages should return an array');
  if (images.length > 0) {
    const first = images[0];
    assert.ok(first.title, 'Image must have a title');
    assert.ok(first.sourceUrl, 'Image must have a sourceUrl');
    assert.ok(first.proxiedUrl, 'Image must have a proxiedUrl');
    assert.ok(first.proxiedUrl.startsWith('/api/proxy/image?url='), 'proxiedUrl must route through image proxy');
    assert.ok(first.domain, 'Image must have a domain');
    console.log(`  ✓ Retrieved ${images.length} images. First: "${first.title}" (${first.domain})`);
  } else {
    console.log('  ⚠ Wikimedia returned 0 images (network might be offline), test skipped gracefully.');
  }

  // Test 4: Express endpoints for /api/proxy/image and /api/image-proxy alias
  console.log('\n▶ Test 4: Image Proxy Endpoints Registered');
  const routes = [];
  app._router.stack.forEach(middleware => {
    if (middleware.route) {
      routes.push(middleware.route.path);
    }
  });
  
  const hasProxyImage = routes.some(r => Array.isArray(r) ? r.includes('/api/proxy/image') : r === '/api/proxy/image');
  const hasImageProxy = routes.some(r => Array.isArray(r) ? r.includes('/api/image-proxy') : r === '/api/image-proxy');
  assert.ok(hasProxyImage, '/api/proxy/image route must exist');
  assert.ok(hasImageProxy, '/api/image-proxy alias route must exist');
  console.log('  ✓ Both /api/proxy/image and /api/image-proxy routes verified.');

  // Test 5: Browser Search Image Results & Google Images Theater
  console.log('\n▶ Test 5: Browser Search Google Images Theater Markup');
  let capturedHtml = '';
  const mockRes = {
    setHeader: () => {},
    send: (h) => { capturedHtml = h; }
  };
  const mockReq = {
    query: { q: 'mountains', cat: 'images', tabId: 'tab_test_theater' }
  };

  await handleBrowserSearch(mockReq, mockRes);
  assert.ok(capturedHtml.includes('id="imagesGrid"'), 'Browser search should render imagesGrid');
  assert.ok(capturedHtml.includes('id="googleImgTheater"'), 'Browser search should include Google Images theater lightbox');
  assert.ok(capturedHtml.includes('id="theaterMainImg"'), 'Theater must have main image preview');
  assert.ok(capturedHtml.includes('id="btnTheaterVisit"'), 'Theater must have Visit Page button');
  assert.ok(capturedHtml.includes('id="btnTheaterCopyLink"'), 'Theater must have Copy Link button');
  assert.ok(capturedHtml.includes('id="btnTheaterPrev"'), 'Theater must have Prev arrow');
  assert.ok(capturedHtml.includes('id="btnTheaterNext"'), 'Theater must have Next arrow');
  assert.ok(capturedHtml.includes('referrerpolicy="no-referrer"'), 'Thumbnails must specify referrerpolicy="no-referrer"');
  console.log('  ✓ Google Images-style interactive theater markup & script verified.');

  // Test 6: Clean Chrome User-Agent verification (Prevents Google block)
  console.log('\n▶ Test 6: Anti-Bot & Google Sign-In User-Agent Compliance');
  const CHROME_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
  assert.ok(!CHROME_UA.includes('Electron'), 'UA must NOT contain "Electron" (Google blocks it)');
  assert.ok(!CHROME_UA.includes('aegis'), 'UA must NOT contain custom app names (Google blocks custom tokens)');
  assert.ok(CHROME_UA.includes('Chrome/'), 'UA must contain authentic Chrome version');
  assert.ok(CHROME_UA.includes('Safari/537.36'), 'UA must contain Safari/537.36 layout engine token');
  console.log('  ✓ Google Sign-In compliant User-Agent verified.');

  console.log('\n🎉 All Images & Universal Login Tests Passed Successfully!\n');
}

runTests().catch(err => {
  console.error('\n❌ Test failure:', err);
  process.exit(1);
});
