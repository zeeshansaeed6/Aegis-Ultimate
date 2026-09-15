/**
 * Aegis Private Search Engine - Automated Test Suite
 * Validates Bangs, Instant Answers, BM25 Indexing, URL Sanitization,
 * Meta-Search, AI Synthesizer, Spam Filter, Folder Watcher, and OpenSearch XML.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { parseBang, resolveInstantAnswer } = require('../server/instantAnswers');
const { BM25Engine } = require('../server/localIndex');
const { sanitizeUrl } = require('../server/proxyReader');
const { aggregateSearch } = require('../server/metaSearch');
const { synthesizeAnswer } = require('../server/aiSynthesizer');
const { spamFilter } = require('../server/spamFilter');
const { FolderWatcher } = require('../server/folderWatcher');

async function runTests() {
  console.log('🧪 Running Aegis Supercharged Test Suite (All 7 Features)...\n');
  let passed = 0;
  let failed = 0;

  function test(name, fn) {
    try {
      fn();
      console.log(`  ✓ ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ✗ ${name}`);
      console.error(`    ${err.message}`);
      failed++;
    }
  }

  async function testAsync(name, fn) {
    try {
      await fn();
      console.log(`  ✓ ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ✗ ${name}`);
      console.error(`    ${err.message}`);
      failed++;
    }
  }

  // 1. Bang Parser Tests
  test('Bang Parser: Wikipedia prefix (!w)', () => {
    const res = parseBang('!w quantum computing');
    assert(res !== null, 'Bang should be detected');
    assert.strictEqual(res.isBang, true);
    assert.strictEqual(res.bang.name, 'Wikipedia');
    assert(res.redirectUrl.includes('wikipedia.org'));
    assert.strictEqual(res.query, 'quantum computing');
  });

  test('Bang Parser: GitHub prefix (!gh)', () => {
    const res = parseBang('!gh express js');
    assert(res !== null);
    assert.strictEqual(res.bang.name, 'GitHub');
    assert(res.redirectUrl.includes('github.com'));
  });

  test('Bang Parser: Local Vault bang (!doc)', () => {
    const res = parseBang('!doc privacy manifesto');
    assert(res !== null);
    assert.strictEqual(res.isLocal, true);
    assert.strictEqual(res.query, 'privacy manifesto');
  });

  test('Bang Parser: Normal query returns null', () => {
    const res = parseBang('what is private search');
    assert.strictEqual(res, null);
  });

  // 2. Instant Answers Tests
  test('Instant Answers: Math calculation (calc: 25 * 4)', () => {
    const res = resolveInstantAnswer('calc: 25 * 4');
    assert(res !== null);
    assert.strictEqual(res.type, 'calculator');
    assert.strictEqual(res.result, '100');
  });

  test('Instant Answers: Math calculation with parens', () => {
    const res = resolveInstantAnswer('calc: (50 + 10) / 2');
    assert(res !== null);
    assert.strictEqual(res.result, '30');
  });

  test('Instant Answers: Unit conversion (10 km to miles)', () => {
    const res = resolveInstantAnswer('10 km to miles');
    assert(res !== null);
    assert.strictEqual(res.type, 'unit_conversion');
    assert(res.result.includes('miles'));
  });

  test('Instant Answers: Dev Cheat Sheet (git undo)', () => {
    const res = resolveInstantAnswer('git undo');
    assert(res !== null);
    assert.strictEqual(res.type, 'cheatsheet');
    assert(res.code.includes('git reset'));
  });

  test('Instant Answers: Privacy status card', () => {
    const res = resolveInstantAnswer('privacy');
    assert(res !== null);
    assert.strictEqual(res.type, 'privacy_card');
  });

  // 3. URL Tracker Sanitization
  test('URL Sanitizer: Strips UTM & tracking tokens', () => {
    const dirtyUrl = 'https://example.com/article?utm_source=twitter&utm_medium=cpc&fbclid=12345&gclid=6789&id=42';
    const cleanUrl = sanitizeUrl(dirtyUrl);
    assert(!cleanUrl.includes('utm_source'), 'utm_source should be removed');
    assert(!cleanUrl.includes('fbclid'), 'fbclid should be removed');
    assert(!cleanUrl.includes('gclid'), 'gclid should be removed');
    assert(cleanUrl.includes('id=42'), 'Legitimate query param id=42 should be preserved');
  });

  // 4. BM25 Local Indexing Engine
  test('BM25 Vault: Document insertion & relevance ranking', () => {
    const engine = new BM25Engine();
    engine.addDocument({
      id: 'doc1',
      title: 'Rust Programming Language',
      content: 'Rust is a systems programming language focused on safety, concurrency, and speed.'
    });
    engine.addDocument({
      id: 'doc2',
      title: 'Python Machine Learning',
      content: 'Python provides powerful libraries like PyTorch and TensorFlow for deep learning.'
    });

    const results = engine.search('Rust systems concurrency');
    assert(results.length > 0, 'Should return results');
    assert.strictEqual(results[0].id, 'doc1', 'doc1 should rank #1 for Rust query');
    assert(results[0].score > 0, 'Score should be positive');
  });

  // 5. OpenSearch XML Validation
  test('OpenSearch XML: Valid structure exists in public directory', () => {
    const xmlPath = path.join(__dirname, '..', 'public', 'opensearch.xml');
    assert(fs.existsSync(xmlPath), 'opensearch.xml must exist');
    const xml = fs.readFileSync(xmlPath, 'utf-8');
    assert(xml.includes('<OpenSearchDescription'), 'Must contain OpenSearchDescription root tag');
    assert(xml.includes('http://localhost:3000/?q={searchTerms}'), 'Must have search URL template');
  });

  // 6. AI Answer Synthesizer Test (Offline Extractive)
  await testAsync('AI Synthesizer: Generates cited answer from mock results', async () => {
    const mockResults = [
      {
        title: 'Linux Kernel Overview',
        snippet: 'The Linux kernel is a free and open-source, monolithic, modular, multitasking Unix-like operating system kernel.',
        domain: 'kernel.org',
        url: 'https://kernel.org'
      },
      {
        title: 'Linux Operating System Architecture',
        snippet: 'Linux was created by Linus Torvalds in 1991 as a personal project.',
        domain: 'wikipedia.org',
        url: 'https://en.wikipedia.org/wiki/Linux'
      }
    ];

    const res = await synthesizeAnswer({
      query: 'what is linux kernel',
      results: mockResults,
      provider: 'extractive'
    });

    assert(res.success === true, 'Synthesis must succeed');
    assert(res.answer.includes('[1]') || res.answer.includes('[2]'), 'Answer must include source citations');
    assert.strictEqual(res.citations.length, 2, 'Must extract 2 citations');
    assert(res.citations[0].favicon.includes('google.com/s2/favicons'), 'Citations must include favicon URLs');
    assert(Array.isArray(res.followUps) && res.followUps.length > 0, 'Must include follow-up suggestions');
  });

  // 7. SEO Spam Filter Test
  test('SEO Spam Filter: Correctly prunes clickbait & user blocked domains', () => {
    const mockResults = [
      { title: 'Good Tech Article', domain: 'arstechnica.com', url: 'https://arstechnica.com/test' },
      { title: 'Pinterest Spam Wall', domain: 'pinterest.com', url: 'https://pinterest.com/pin/123' },
      { title: 'Spam Forum', domain: 'spammy-aggregator.com', url: 'https://spammy-aggregator.com/post' }
    ];

    const { filtered, blockedCount } = spamFilter.filterResults(mockResults, ['spammy-aggregator.com']);
    assert.strictEqual(filtered.length, 1, 'Only clean result should remain');
    assert.strictEqual(filtered[0].domain, 'arstechnica.com');
    assert.strictEqual(blockedCount, 2, 'Should have blocked 2 domains');
  });

  // 8. Local Folder Watcher Test
  test('Folder Watcher: Indexes files from directory into BM25 index', () => {
    const testDir = path.join(__dirname, 'test_notes');
    if (!fs.existsSync(testDir)) fs.mkdirSync(testDir, { recursive: true });

    const note1 = path.join(testDir, 'kubernetes_guide.md');
    fs.writeFileSync(note1, '# Kubernetes Notes\nKubernetes orchestrates containerized workloads and services across cluster nodes.');

    const watcher = new FolderWatcher();
    const status = watcher.startWatching(testDir);

    assert(status.active === true, 'Watcher must be active');
    assert(status.indexedFilesCount >= 1, 'Must index at least 1 note');

    watcher.stopWatching();
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  // 10. Extended Bang Parser Tests
  test('Bang Parser: Hacker News (!hn)', () => {
    const res = parseBang('!hn ai search');
    assert(res !== null);
    assert.strictEqual(res.bang.name, 'Hacker News');
    assert(res.redirectUrl.includes('hn.algolia.com'));
  });

  test('Bang Parser: PyPI and Crates (!pypi, !crates)', () => {
    const pypi = parseBang('!pypi requests');
    assert(pypi !== null && pypi.redirectUrl.includes('pypi.org'));

    const crates = parseBang('!crates tokio');
    assert(crates !== null && crates.redirectUrl.includes('crates.io'));
  });

  // 11. Instant Crypto & Dev Tools Tests
  test('Instant Tools: SHA-256 hash generator (sha256: hello)', () => {
    const res = resolveInstantAnswer('sha256: hello');
    assert(res !== null);
    assert.strictEqual(res.type, 'crypto_tool');
    assert.strictEqual(res.result, '2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824');
  });

  test('Instant Tools: UUID v4 generator (uuid)', () => {
    const res = resolveInstantAnswer('uuid');
    assert(res !== null);
    assert.strictEqual(res.type, 'crypto_tool');
    assert.strictEqual(res.algorithm, 'UUID v4');
    assert(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(res.result));
  });

  test('Instant Tools: World Clock (time in tokyo)', () => {
    const res = resolveInstantAnswer('time in tokyo');
    assert(res !== null);
    assert.strictEqual(res.type, 'world_clock');
    assert.strictEqual(res.timezone, 'Asia/Tokyo');
    assert(res.time.length > 0);
  });

  test('Instant Tools: Secure Password Generator (password 24)', () => {
    const res = resolveInstantAnswer('password 24');
    assert(res !== null);
    assert.strictEqual(res.type, 'password_tool');
    assert.strictEqual(res.length, 24);
    assert.strictEqual(res.password.length, 24);
    assert(res.strength === 'Excellent');
  });

  test('Instant Tools: Base64 Decoder (base64 decode)', () => {
    const res = resolveInstantAnswer('base64 decode SGVsbG8gQWVnaXMh');
    assert(res !== null);
    assert.strictEqual(res.type, 'crypto_tool');
    assert.strictEqual(res.result, 'Hello Aegis!');
  });

  test('Instant Tools: JSON Validator & Formatter (json format)', () => {
    const res = resolveInstantAnswer('json {"name":"aegis","secure":true}');
    assert(res !== null);
    assert.strictEqual(res.type, 'json_tool');
    assert.strictEqual(res.status, 'valid');
    assert(res.formatted.includes('"name": "aegis"'));
  });

  test('Instant Tools: URL Codec (urlencode & urldecode)', () => {
    const enc = resolveInstantAnswer('urlencode hello world & privacy=1');
    assert(enc !== null && enc.result.includes('%20world'));

    const dec = resolveInstantAnswer('urldecode hello%20world');
    assert(dec !== null && dec.result === 'hello world');
  });

  test('Instant Tools: Color Inspector (#10b981 to rgb)', () => {
    const res = resolveInstantAnswer('#10b981 to rgb');
    assert(res !== null);
    assert.strictEqual(res.type, 'color_tool');
    assert.strictEqual(res.hex, '#10B981');
    assert(res.rgb.includes('rgb(16, 185, 129)'));
  });

  // 12. Focus Lenses Test (All 10 Lenses)
  test('Focus Lenses: Default lenses contain all 10 specialized lenses', () => {
    const { lensManager, DEFAULT_LENSES } = require('../server/lenses');
    const expectedLenses = ['academic', 'developer', 'news', 'foss', 'discussions', 'books', 'crypto', 'design', 'finance', 'packages'];
    for (const id of expectedLenses) {
      assert(DEFAULT_LENSES[id], `Lens ${id} must exist in DEFAULT_LENSES`);
    }

    const discLens = lensManager.getLens('discussions');
    assert(discLens.domains.includes('news.ycombinator.com'));
    assert(discLens.domains.includes('reddit.com'));

    const pkgLens = lensManager.getLens('packages');
    assert(pkgLens.domains.includes('pypi.org'));
    assert(pkgLens.domains.includes('crates.io'));

    const queryWithLens = lensManager.applyLensToQuery('async await', 'developer');
    assert(queryWithLens.includes('site:github.com') || queryWithLens.includes('site:stackoverflow.com'));
  });

  // 13. Meta-Search Aggregator (Online with Lens and Power Options)
  await testAsync('Meta-Search: Online query aggregation with lens & power options', async () => {
    const results = await aggregateSearch('privacy security', 'all', { lens: 'developer', time: 'm', region: 'us-en' });
    assert(Array.isArray(results), 'Results should be an array');
    assert(results.length > 0, 'Should find results');
    const first = results[0];
    assert(first.title, 'Result must have a title');
    assert(first.url, 'Result must have a url');
    assert(!first.url.includes('utm_'), 'URL must be sanitized');
  });

  console.log(`\n========================================`);
  console.log(`Total: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`);
  console.log(`========================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
