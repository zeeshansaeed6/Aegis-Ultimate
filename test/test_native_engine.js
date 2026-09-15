/**
 * Automated Test Suite for Aegis Native Inverted Index & Autonomous Crawler
 */

const assert = require('assert');
const { NativeSearchEngine } = require('../server/nativeEngine');
const { WebCrawler } = require('../server/crawler');

async function runTests() {
  console.log('🧪 Starting Aegis Native Search Engine Test Suite...\n');

  // Test 1: Inverted Index Tokenization & Stemming / Filtering
  console.log('▶ Test 1: Tokenization and Stopword Filtering');
  const engine = new NativeSearchEngine();
  const tokens = engine.tokenize('The Fast and Scalable Web Servers running Node in 2026!');
  assert.ok(tokens.includes('fast'), 'Tokens should include "fast"');
  assert.ok(tokens.includes('scalable'), 'Tokens should include "scalable"');
  assert.ok(tokens.includes('servers'), 'Tokens should include "servers"');
  assert.ok(tokens.includes('node'), 'Tokens should include "node"');
  assert.ok(!tokens.includes('the') && !tokens.includes('and'), 'Tokens should filter common stopwords');
  console.log('  ✓ Tokenization verified successfully.');

  // Test 2: Inverted Index Document Indexing & BM25 Ranking
  console.log('\n▶ Test 2: Inverted Index BM25 Scoring & Field Boosting');
  engine.clear();

  engine.addPage({
    url: 'https://expressjs.com/en/starter.html',
    domain: 'expressjs.com',
    title: 'Express Node.js Web Application Framework',
    headings: ['Fast, unopinionated web framework', 'Getting Started'],
    description: 'Express is a minimal and flexible Node.js web application framework providing robust features.',
    body: 'Express is a minimal and flexible Node.js web application framework that provides a robust set of features for web and mobile applications.'
  });

  engine.addPage({
    url: 'https://sqlite.org/about.html',
    domain: 'sqlite.org',
    title: 'SQLite Embedded SQL Database Engine',
    headings: ['Small, Fast, Reliable SQL Database', 'Storage Engine'],
    description: 'SQLite is a small, fast, self-contained, high-reliability SQL database engine.',
    body: 'SQLite is an in-process library that implements a self-contained, serverless, zero-configuration, transactional SQL database engine.'
  });

  // Search "Express framework"
  const expressResults = engine.search('Express framework');
  assert.ok(expressResults.length > 0, 'Search for "Express framework" should return results');
  assert.strictEqual(expressResults[0].domain, 'expressjs.com', 'expressjs.com should rank #1 for "Express framework"');
  assert.ok(expressResults[0].score > 0, 'Result should have positive BM25 score');

  // Search "database SQL"
  const sqlResults = engine.search('database SQL');
  assert.ok(sqlResults.length > 0, 'Search for "database SQL" should return results');
  assert.strictEqual(sqlResults[0].domain, 'sqlite.org', 'sqlite.org should rank #1 for "database SQL"');
  console.log(`  ✓ BM25 ranking verified. Express score: ${expressResults[0].score.toFixed(2)}, SQLite score: ${sqlResults[0].score.toFixed(2)}`);

  // Test 3: Sentence Snippet Generator
  console.log('\n▶ Test 3: Dynamic Relevance Snippet Extraction');
  const doc = engine.documents.get('https://expressjs.com/en/starter.html');
  const snippet = engine.extractDynamicSnippet(doc, ['minimal', 'flexible']);
  assert.ok(snippet.includes('Express is a minimal'), 'Snippet should isolate the sentence with highest token density');
  console.log(`  ✓ Generated snippet: "${snippet.substring(0, 70)}..."`);

  // Test 4: Inbound Link Graph (PageRank Boost)
  console.log('\n▶ Test 4: Link Graph Authority Multiplier');
  engine.addPage({
    url: 'https://techblog.dev/node-guide',
    domain: 'techblog.dev',
    title: 'Best Frameworks for APIs',
    headings: ['Framework Recommendations'],
    description: 'We strongly recommend Express for building REST APIs.',
    body: 'Express is the de-facto standard framework for Node.js.',
    outgoingLinks: ['https://expressjs.com/en/starter.html']
  });

  const inbounds = engine.inboundLinks.get('https://expressjs.com/en/starter.html')?.size || 0;
  assert.strictEqual(inbounds, 1, 'Express should have 1 inbound link in the link graph');
  console.log(`  ✓ Link graph inbound links verified: ${inbounds}`);

  // Test 5: Stats and Inventory
  console.log('\n▶ Test 5: Engine Statistics and Inventory');
  const stats = engine.getStats();
  assert.strictEqual(stats.indexedPages, 3, 'Should have 3 indexed pages');
  assert.ok(stats.uniqueTerms > 10, 'Should have indexed distinct vocabulary terms');
  assert.strictEqual(stats.uniqueDomains, 3, 'Should have 3 unique domains');
  console.log(`  ✓ Stats: ${stats.indexedPages} pages, ${stats.uniqueTerms} terms, ${stats.uniqueDomains} domains.`);

  // Test 6: Web Crawler URL Normalization & Link Filtering
  console.log('\n▶ Test 6: Autonomous Crawler URL Normalization & Filter Logic');
  const crawler = new WebCrawler();

  const norm1 = crawler.normalizeUrl('/docs/api', 'https://example.org/guide/');
  assert.strictEqual(norm1, 'https://example.org/docs/api', 'Relative path should normalize to absolute URL');

  const norm2 = crawler.normalizeUrl('https://example.org/guide#section-2', 'https://example.org');
  assert.strictEqual(norm2, 'https://example.org/guide', 'URL hash fragments should be stripped');

  const norm3 = crawler.normalizeUrl('mailto:security@example.org', 'https://example.org');
  assert.strictEqual(norm3, null, 'mailto: URLs should be ignored');

  const norm4 = crawler.normalizeUrl('javascript:void(0)', 'https://example.org');
  assert.strictEqual(norm4, null, 'javascript: URLs should be ignored');

  const norm5 = crawler.normalizeUrl('/image.png', 'https://example.org');
  assert.strictEqual(norm5, null, 'Excluded file extensions (.png) should be rejected');

  console.log('  ✓ Crawler URL normalization and safety filtering verified.');

  // Restore starter corpus
  engine.clear();
  engine.seedStarterCorpus();
  engine.saveToDisk();

  console.log('\n✨ All Aegis Native Search Engine tests passed with 100% SUCCESS!');
}

runTests().catch(err => {
  console.error('\n❌ Test failed with error:', err);
  process.exit(1);
});
