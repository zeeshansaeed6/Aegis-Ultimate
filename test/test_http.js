/**
 * Aegis HTTP Integration Test
 * Boots Express on an ephemeral port, performs real HTTP requests, and verifies headers & API output.
 */

const { app } = require('../server/server');

async function testHttpEndpoints() {
  console.log('🌐 Starting HTTP Integration Verification...');
  
  const server = app.listen(0, async () => {
    const port = server.address().port;
    const baseUrl = `http://127.0.0.1:${port}`;
    console.log(`  ✓ Server booted on ephemeral port ${port}`);

    let passed = 0;
    let failed = 0;

    async function check(name, fn) {
      try {
        await fn();
        console.log(`  ✓ ${name}`);
        passed++;
      } catch (err) {
        console.error(`  ✗ ${name}: ${err.message}`);
        failed++;
      }
    }

    try {
      // 1. Root UI & Security Headers
      await check('GET / returns 200 and privacy headers', async () => {
        const res = await fetch(`${baseUrl}/`);
        if (res.status !== 200) throw new Error(`Status was ${res.status}`);
        const refPolicy = res.headers.get('referrer-policy');
        if (refPolicy !== 'no-referrer') throw new Error(`Referrer-Policy header missing or incorrect: ${refPolicy}`);
        const html = await res.text();
        if (!html.includes('Aegis Search')) throw new Error('HTML title/brand missing');
        if (!html.includes('data-lens="academic"')) throw new Error('Academic lens missing in HTML');
        if (!html.includes('id="scratchpadDrawer"')) throw new Error('Research scratchpad missing in HTML');
        if (!html.includes('id="privacyLabModalBackdrop"')) throw new Error('Privacy Lab missing in HTML');
      });

      // 2. OpenSearch XML
      await check('GET /opensearch.xml returns valid XML', async () => {
        const res = await fetch(`${baseUrl}/opensearch.xml`);
        if (res.status !== 200) throw new Error(`Status was ${res.status}`);
        const xml = await res.text();
        if (!xml.includes('OpenSearchDescription')) throw new Error('Invalid OpenSearch XML');
      });

      // 3. Focus Lenses API (All 10 Lenses)
      await check('GET /api/lenses returns all 10 default lenses', async () => {
        const res = await fetch(`${baseUrl}/api/lenses`);
        if (res.status !== 200) throw new Error(`Status was ${res.status}`);
        const data = await res.json();
        if (!Array.isArray(data.lenses) || data.lenses.length < 10) throw new Error(`Expected at least 10 lenses, got ${data.lenses.length}`);
        const ids = data.lenses.map(l => l.id);
        const required = ['academic', 'developer', 'news', 'foss', 'discussions', 'books', 'crypto', 'design', 'finance', 'packages'];
        for (const req of required) {
          if (!ids.includes(req)) throw new Error(`Missing required lens: ${req}`);
        }
      });

      // 4. Tor Status API
      await check('GET /api/tor/status returns JSON audit', async () => {
        const res = await fetch(`${baseUrl}/api/tor/status`);
        if (res.status !== 200) throw new Error(`Status was ${res.status}`);
        const data = await res.json();
        if (typeof data.available !== 'boolean') throw new Error('Missing available boolean in Tor status');
      });

      // 5. Spam Blocked Domains API
      await check('GET /api/spam/blocked returns list', async () => {
        const res = await fetch(`${baseUrl}/api/spam/blocked`);
        if (res.status !== 200) throw new Error(`Status was ${res.status}`);
        const data = await res.json();
        if (!Array.isArray(data.domains)) throw new Error('Expected domains array');
      });

      // 6. Search API with Lens, Region, and SafeSearch filters
      await check('GET /api/search with lens, region, and safeSearch returns results', async () => {
        const res = await fetch(`${baseUrl}/api/search?q=javascript&lens=developer&time=m&region=us-en&safeSearch=1`);
        if (res.status !== 200) throw new Error(`Status was ${res.status}`);
        const data = await res.json();
        if (!Array.isArray(data.results)) throw new Error('Expected results array');
        if (data.results.length === 0) throw new Error('Expected results for javascript');
      });

      // 7. Instant Crypto Tool API Verification
      await check('GET /api/search?q=sha256:+hello returns instant hash card', async () => {
        const res = await fetch(`${baseUrl}/api/search?q=sha256:+hello`);
        if (res.status !== 200) throw new Error(`Status was ${res.status}`);
        const data = await res.json();
        if (!data.instantAnswer || data.instantAnswer.type !== 'crypto_tool') {
          throw new Error('Expected crypto_tool instant answer for sha256');
        }
        if (data.instantAnswer.result !== '2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824') {
          throw new Error(`Incorrect sha256 hash: ${data.instantAnswer.result}`);
        }
      });

      // 8. Crawler Stats Endpoint
      await check('GET /api/crawler/stats returns index statistics', async () => {
        const res = await fetch(`${baseUrl}/api/crawler/stats`);
        if (res.status !== 200) throw new Error(`Status was ${res.status}`);
        const data = await res.json();
        if (typeof data.indexedPages !== 'number' || typeof data.uniqueTerms !== 'number') {
          throw new Error('Expected indexedPages and uniqueTerms numbers in stats');
        }
      });

      // 9. Crawler Status Endpoint
      await check('GET /api/crawler/status returns spider state', async () => {
        const res = await fetch(`${baseUrl}/api/crawler/status`);
        if (res.status !== 200) throw new Error(`Status was ${res.status}`);
        const data = await res.json();
        if (typeof data.isCrawling !== 'boolean') {
          throw new Error('Expected isCrawling boolean in status');
        }
      });

      // 10. Native Search Query (Purely Local Category)
      await check('GET /api/search?cat=own&q=privacy queries native inverted index', async () => {
        const res = await fetch(`${baseUrl}/api/search?cat=own&q=privacy`);
        if (res.status !== 200) throw new Error(`Status was ${res.status}`);
        const data = await res.json();
        if (!Array.isArray(data.results) || data.results.length === 0) {
          throw new Error('Expected native results for privacy query');
        }
        if (!data.results[0].isNativeDoc) {
          throw new Error('Expected isNativeDoc flag on top result');
        }
      });

      // 11. Aegis Native In-Browser Search Results Engine
      await check('GET /browser/search?q=proxy+api returns standalone search results page', async () => {
        const res = await fetch(`${baseUrl}/browser/search?q=proxy+api&tabId=test_tab`);
        if (res.status !== 200) throw new Error(`Status was ${res.status}`);
        const html = await res.text();
        if (!html.includes('Aegis Search')) throw new Error('Missing Aegis Search title/brand');
        if (!html.includes('proxy api')) throw new Error('Missing query in search page');
        if (!html.includes('/api/browser/proxy?tabId=')) throw new Error('Missing sandboxed proxy link formatting');
        if (!html.includes('category-nav')) throw new Error('Missing category nav tabs');
      });

      // 12. In-Browser Search with Instant Answer Calculation
      await check('GET /browser/search?q=calc:+12+*+5 renders instant answer card', async () => {
        const res = await fetch(`${baseUrl}/browser/search?q=calc:+12+*+5&tabId=test_tab`);
        if (res.status !== 200) throw new Error(`Status was ${res.status}`);
        const html = await res.text();
        if (!html.includes('instant-answer-card')) throw new Error('Missing instant answer card');
        if (!html.includes('60')) throw new Error('Missing calculated result 60');
      });

      console.log(`\n========================================`);
      console.log(`HTTP Tests: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`);
      console.log(`========================================\n`);

    } finally {
      server.close(() => {
        console.log('HTTP Verification server closed.');
        process.exit(failed > 0 ? 1 : 0);
      });
    }
  });
}

testHttpEndpoints().catch(err => {
  console.error('Fatal error in HTTP verification:', err);
  process.exit(1);
});
