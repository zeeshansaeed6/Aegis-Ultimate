/**
 * Aegis Private Search Engine - Core Server
 * Self-hosted, zero-telemetry, anonymous search aggregator, local vault & AI engine
 */

const express = require('express');
const path = require('path');
const cors = require('cors');

const { aggregateSearch } = require('./metaSearch');
const { vaultEngine } = require('./localIndex');
const { sanitizeUrl, fetchAndSanitizePage } = require('./proxyReader');
const { BANGS, parseBang, resolveInstantAnswer, resolveKnowledgeGraph } = require('./instantAnswers');
const { synthesizeAnswer, summarizeWebpage } = require('./aiSynthesizer');
const { searchImages, searchVideos, proxyImageStream } = require('./mediaSearch');
const { folderWatcher } = require('./folderWatcher');
const { spamFilter } = require('./spamFilter');
const { getTorStatus, searchAhmiaOnion } = require('./torProxy');
const { lensManager } = require('./lenses');
const { nativeEngine } = require('./nativeEngine');
const { webCrawler } = require('./crawler');
const { handleBrowserProxy, handleBrowserFetch, burnTabSession, getTabInfo, getTabActiveUrl } = require('./browserProxy');
const { handleBrowserSearch } = require('./browserSearch');
const { conductDeepResearch } = require('./deepResearch');
const { lookupWaybackSnapshot, getArchiveFallbacks } = require('./timeMachine');

const app = express();
const PORT = process.env.PORT || 3000;

// Security & Privacy Middleware
app.use((req, res, next) => {
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Permissions-Policy', 'geolocation=(), camera=(), microphone=(), payment=()');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  next();
});

app.use(cors());
// Raw stream buffer for browser proxy & fetch bridges (preserves untouched byte-exact bodies, form data, protobufs, JSON)
app.use(['/api/browser/fetch', '/api/browser/proxy'], express.raw({ type: '*/*', limit: '50mb' }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// OpenSearch 1.1 Discovery XML
app.get('/opensearch.xml', (req, res) => {
  res.setHeader('Content-Type', 'application/opensearchdescription+xml; charset=utf-8');
  const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'http';
  const host = req.get('host') || 'localhost:3000';
  const baseUrl = `${protocol}://${host}`;
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<OpenSearchDescription xmlns="http://a9.com/-/spec/opensearch/1.1/">
  <ShortName>Aegis Search</ShortName>
  <Description>High-performance, zero-tracking, private search engine</Description>
  <Tags>privacy zero-logs search</Tags>
  <Contact>support@aegis.local</Contact>
  <Url type="text/html" template="${baseUrl}/?q={searchTerms}"/>
  <Url type="application/x-suggestions+json" template="${baseUrl}/api/suggest?q={searchTerms}"/>
  <InputEncoding>UTF-8</InputEncoding>
  <OutputEncoding>UTF-8</OutputEncoding>
  <Image width="16" height="16" type="image/x-icon">${baseUrl}/favicon.ico</Image>
</OpenSearchDescription>`;
  res.send(xml);
});

// Serve static frontend assets
app.use(express.static(path.join(__dirname, '..', 'public')));

/**
 * Primary Search Endpoint
 * GET /api/search?q=<query>&cat=<category>&blocked=<comma_separated_domains>
 */
app.get('/api/search', async (req, res) => {
  const query = (req.query.q || '').trim();
  const category = (req.query.cat || 'all').toLowerCase();
  const lens = (req.query.lens || 'all').toLowerCase();
  const time = (req.query.time || '').toLowerCase();
  const filetype = (req.query.filetype || '').toLowerCase();
  const region = (req.query.region || '').toLowerCase();
  const safeSearch = (req.query.safeSearch || '').toLowerCase();
  const userBlocked = (req.query.blocked || '').split(',').filter(Boolean);

  if (!query) {
    return res.json({
      success: true,
      query: '',
      count: 0,
      results: [],
      instantAnswer: null
    });
  }

  // 1. Check for Bang shortcuts (!w, !gh, !yt, !onion, etc.)
  const bangCheck = parseBang(query);
  if (bangCheck && bangCheck.isBang) {
    if (bangCheck.isLocal) {
      const localResults = vaultEngine.search(bangCheck.query, 12);
      return res.json({
        success: true,
        query: bangCheck.query,
        category: 'local',
        count: localResults.length,
        results: localResults,
        instantAnswer: {
          type: 'bang_info',
          badge: 'Vault Bang',
          title: 'Searching Private Vault',
          description: `Direct query routed to local BM25 document index for "${bangCheck.query}".`
        }
      });
    }

    return res.json({
      success: true,
      query: bangCheck.query,
      isBang: true,
      redirectUrl: bangCheck.redirectUrl,
      bang: bangCheck.bang
    });
  }

  // 2. Check for Instant Answers & Knowledge Graph
  const instantAnswer = resolveInstantAnswer(query);
  const knowledgeGraph = resolveKnowledgeGraph(query);

  // 3. Category: Local Vault
  if (category === 'local') {
    const localResults = vaultEngine.search(query, 15);
    return res.json({
      success: true,
      query,
      category: 'local',
      count: localResults.length,
      results: localResults,
      instantAnswer
    });
  }

  // 4. Category: Images
  if (category === 'images') {
    const images = await searchImages(query);
    return res.json({
      success: true,
      query,
      category: 'images',
      count: images.length,
      results: images,
      instantAnswer
    });
  }

  // 5. Category: Videos
  if (category === 'videos') {
    const videos = await searchVideos(query);
    return res.json({
      success: true,
      query,
      category: 'videos',
      count: videos.length,
      results: videos,
      instantAnswer
    });
  }

  // 6. Category: Tor / Onion Dark Web
  if (category === 'onion' || query.startsWith('!onion ')) {
    const onionQuery = query.replace(/^!onion\s+/, '');
    const onionResults = await searchAhmiaOnion(onionQuery);
    return res.json({
      success: true,
      query: onionQuery,
      category: 'onion',
      count: onionResults.length,
      results: onionResults,
      instantAnswer: {
        type: 'privacy_card',
        badge: 'Tor Dark Web',
        title: 'Searching .onion Hidden Services',
        description: 'Results retrieved anonymously from Ahmia dark web index.'
      }
    });
  }

  // 7. Category: Native Own Engine Search
  if (category === 'own' || category === 'native') {
    const nativeResults = nativeEngine.search(query, 20);
    return res.json({
      success: true,
      query,
      category: 'own',
      count: nativeResults.length,
      results: nativeResults,
      instantAnswer: {
        type: 'privacy_card',
        badge: '⚡ Own Search Engine',
        title: 'Native Crawled Index (100% Offline)',
        description: `Queried your autonomous inverted index across ${nativeEngine.getStats().indexedPages} crawled pages with zero external requests.`
      }
    });
  }

  try {
    // 8. General Multi-Engine Meta-Search with Power Operators & Lenses
    const webResults = await aggregateSearch(query, category, { lens, time, filetype, region, safeSearch });

    // Filter out SEO spam and user blocked domains
    const { filtered } = spamFilter.filterResults(webResults, userBlocked);

    // Also include top native crawled pages and vault notes if category is 'all'
    let combinedResults = [...filtered];
    if (category === 'all') {
      const topNative = nativeEngine.search(query, 3);
      const topLocal = vaultEngine.search(query, 2);

      const localAdditions = [];
      if (topNative.length > 0 && topNative[0].score > 0.5) {
        localAdditions.push(...topNative);
      }
      if (topLocal.length > 0 && topLocal[0].score > 1.0) {
        localAdditions.push(...topLocal);
      }

      if (localAdditions.length > 0) {
        combinedResults = [...localAdditions, ...filtered];
      }
    }

    return res.json({
      success: true,
      query,
      category,
      count: combinedResults.length,
      instantAnswer,
      knowledgeGraph,
      results: combinedResults
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: 'An unexpected error occurred during search aggregation.'
    });
  }
});

/**
 * AI Synthesizer Endpoint (Perplexity-style cited answers)
 * POST /api/ai/synthesize
 */
app.post('/api/ai/synthesize', async (req, res) => {
  const { query, results, provider, apiKey, model } = req.body;
  const synthesis = await synthesizeAnswer({ query, results, provider, apiKey, model });
  return res.json(synthesis);
});

/**
 * AI Webpage Summarizer Endpoint (Instant TL;DR & Key Takeaways)
 * POST /api/ai/summarize-page
 */
app.post('/api/ai/summarize-page', async (req, res) => {
  const { url, title, text, provider, apiKey, model } = req.body || {};
  if (!url && !text) {
    return res.status(400).json({ success: false, error: 'url or text parameter is required to summarize page' });
  }
  try {
    const result = await summarizeWebpage({ url, title, text, provider, apiKey, model });
    return res.json(result);
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message || 'Page summarization failed' });
  }
});

/**
 * Autonomous Deep Research Endpoint (Perplexity Pro / Gemini Deep Research Mode)
 * POST /api/deep-research
 * GET /api/deep-research?q=<query>
 */
app.all('/api/deep-research', async (req, res) => {
  const query = (req.method === 'POST' ? req.body?.query : req.query?.q) || '';
  const provider = (req.method === 'POST' ? req.body?.provider : req.query?.provider) || 'auto';
  const apiKey = (req.method === 'POST' ? req.body?.apiKey : req.query?.apiKey) || '';
  const model = (req.method === 'POST' ? req.body?.model : req.query?.model) || '';

  if (!query) {
    return res.status(400).json({ success: false, error: 'Query parameter required' });
  }

  try {
    const report = await conductDeepResearch({ query, provider, apiKey, model });
    return res.json(report);
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message || 'Deep research failed' });
  }
});

/**
 * Proxied Images Streamer
 * GET /api/proxy/image?url=<imageUrl>
 * GET /api/image-proxy?url=<imageUrl> (Alias)
 */
app.get(['/api/proxy/image', '/api/image-proxy'], (req, res) => {
  const imageUrl = req.query.url;
  if (!imageUrl) return res.status(400).send('Image URL required');
  proxyImageStream(imageUrl, res);
});

/**
 * Media Endpoints Direct
 */
app.get('/api/images', async (req, res) => {
  const q = req.query.q || '';
  const images = await searchImages(q);
  res.json({ success: true, count: images.length, results: images });
});

app.get('/api/videos', async (req, res) => {
  const q = req.query.q || '';
  const videos = await searchVideos(q);
  res.json({ success: true, count: videos.length, results: videos });
});

/**
 * Autocomplete / Suggestions Endpoint
 * GET /api/suggest?q=<query>
 */
app.get('/api/suggest', async (req, res) => {
  const query = (req.query.q || '').trim().toLowerCase();
  if (!query) return res.json({ suggestions: [] });

  const suggestions = [];

  // Match bangs
  for (const b of BANGS) {
    if (b.prefix.startsWith(query) || (query.startsWith('!') && b.prefix.includes(query))) {
      suggestions.push({
        type: 'bang',
        text: `${b.prefix} `,
        description: `Search on ${b.name}`
      });
    }
  }

  // Upstream Wikipedia suggestion fetch
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);
    const wikiRes = await fetch(`https://en.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(query)}&limit=5&namespace=0&format=json`, {
      signal: controller.signal
    });
    clearTimeout(timeout);
    if (wikiRes.ok) {
      const data = await wikiRes.json();
      if (data[1] && Array.isArray(data[1])) {
        for (const item of data[1]) {
          if (!suggestions.some(s => s.text === item)) {
            suggestions.push({
              type: 'search',
              text: item,
              description: 'Wikipedia suggestion'
            });
          }
        }
      }
    }
  } catch (e) {}

  return res.json({ suggestions: suggestions.slice(0, 6) });
});

/**
 * Tracker-Stripping Anonymous Proxy Reader
 * GET /api/proxy?url=<targetUrl>
 */
app.get('/api/proxy', async (req, res) => {
  const targetUrl = req.query.url;
  if (!targetUrl) {
    return res.status(400).json({ success: false, error: 'Target URL is required.' });
  }

  const result = await fetchAndSanitizePage(targetUrl);
  if (!result.success) {
    return res.status(500).json(result);
  }

  return res.json(result);
});

/**
 * Wayback Machine & Historical Archives API
 * GET /api/wayback?url=<targetUrl>
 */
app.get('/api/wayback', async (req, res) => {
  const targetUrl = (req.query.url || '').trim();
  if (!targetUrl) {
    return res.status(400).json({ success: false, error: 'Target URL is required.' });
  }
  const result = await lookupWaybackSnapshot(targetUrl);
  return res.json(result);
});

/**
 * Local Document Vault API
 */
app.post('/api/vault/upload', (req, res) => {
  const { title, content, tags } = req.body;
  if (!title || !content) {
    return res.status(400).json({ success: false, error: 'Title and content are required.' });
  }

  const doc = vaultEngine.addDocument({
    title,
    content,
    tags: Array.isArray(tags) ? tags : (tags ? tags.split(',').map(t => t.trim()) : [])
  });

  return res.json({ success: true, doc });
});

app.get('/api/vault/list', (req, res) => {
  const docs = vaultEngine.getAll();
  return res.json({ success: true, count: docs.length, documents: docs });
});

app.delete('/api/vault/:id', (req, res) => {
  const ok = vaultEngine.removeDocument(req.params.id);
  return res.json({ success: ok });
});

/**
 * Local Folder Auto-Watcher API
 */
app.post('/api/vault/watch', (req, res) => {
  const { folderPath } = req.body;
  try {
    const status = folderWatcher.startWatching(folderPath);
    return res.json({ success: true, status });
  } catch (err) {
    return res.status(400).json({ success: false, error: err.message });
  }
});

app.get('/api/vault/watch/status', (req, res) => {
  return res.json(folderWatcher.getStatus());
});

/**
 * Tor Connection Status API
 */
app.get('/api/tor/status', async (req, res) => {
  const status = await getTorStatus();
  return res.json(status);
});

/**
 * Search Lenses API
 */
app.get('/api/lenses', (req, res) => {
  res.json({ success: true, lenses: lensManager.getAllLenses() });
});

app.post('/api/lenses/custom', (req, res) => {
  const { id, name, icon, description, domains } = req.body;
  if (!name || !domains) return res.status(400).json({ success: false, error: 'Name and domains required.' });
  const lensId = id || 'lens_' + Date.now();
  lensManager.addCustomLens({ id: lensId, name, icon, description, domains });
  res.json({ success: true, lensId });
});

/**
 * SEO Spam & Blocked Domains API
 */
app.get('/api/spam/blocked', (req, res) => {
  res.json({ success: true, domains: spamFilter.getAllBlocked() });
});

app.post('/api/spam/block', (req, res) => {
  const { domain } = req.body;
  if (!domain) return res.status(400).json({ success: false, error: 'Domain required' });
  spamFilter.addDomain(domain);
  res.json({ success: true, blocked: domain });
});

app.post('/api/spam/unblock', (req, res) => {
  const { domain } = req.body;
  if (!domain) return res.status(400).json({ success: false, error: 'Domain required' });
  spamFilter.removeDomain(domain);
  res.json({ success: true, unblocked: domain });
});

/**
 * Privacy Status & Connection Audit Endpoint
 */
app.get('/api/privacy/status', (req, res) => {
  res.json({
    status: 'shield_active',
    zeroLogging: true,
    referrerPolicy: 'no-referrer',
    trackerStripping: 'cheerio-purged',
    ephemeralMemory: true,
    activeProtection: [
      'DNS leak suppression',
      'Browser fingerprint obfuscation',
      'UTM / Ad token query parameter removal',
      'Server-side CORS sandbox',
      'Image CDN IP hiding proxy'
    ]
  });
});

/**
 * Autonomous Crawler & Native Search Engine API
 */
app.post('/api/crawler/start', async (req, res) => {
  const { seedUrl, maxPages, maxDepth, sameDomainOnly, delayMs } = req.body;
  try {
    const status = await webCrawler.startCrawl({ seedUrl, maxPages, maxDepth, sameDomainOnly, delayMs });
    return res.json({ success: true, status });
  } catch (err) {
    return res.status(400).json({ success: false, error: err.message });
  }
});

app.post('/api/crawler/stop', (req, res) => {
  const status = webCrawler.stopCrawl();
  return res.json({ success: true, status });
});

app.get('/api/crawler/status', (req, res) => {
  return res.json(webCrawler.getStatus());
});

app.get('/api/crawler/stats', (req, res) => {
  const stats = nativeEngine.getStats();
  return res.json({ success: true, stats, ...stats });
});

app.get('/api/crawler/pages', (req, res) => {
  const pages = nativeEngine.getAllPages();
  return res.json({ success: true, pages, results: pages });
});

app.delete('/api/crawler/index', (req, res) => {
  nativeEngine.clear();
  return res.json({ success: true, message: 'Native search index cleared.' });
});

app.delete('/api/crawler/page', (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ success: false, error: 'URL required' });
  const removed = nativeEngine.removePage(url);
  nativeEngine.saveToDisk();
  return res.json({ success: true, removed });
});

app.get('/api/native/search', (req, res) => {
  const q = (req.query.q || '').trim();
  const results = nativeEngine.search(q, 25);
  return res.json({ success: true, count: results.length, results });
});

/**
 * Built-In Sandboxed Private Web Browser API
 */
app.all('/api/browser/proxy', handleBrowserProxy);
app.all('/api/browser/fetch', handleBrowserFetch);

app.post('/api/browser/burn-tab', (req, res) => {
  const { tabId } = req.body;
  if (!tabId) return res.status(400).json({ success: false, error: 'tabId required' });
  const result = burnTabSession(tabId);
  return res.json(result);
});

app.get('/api/browser/tab-info', (req, res) => {
  const tabId = req.query.tabId || 'default_tab';
  return res.json(getTabInfo(tabId));
});

/**
 * Aegis Native In-Browser Search Engine Route
 */
app.get('/browser/search', handleBrowserSearch);

// Smart subresource & relative navigation proxy fallback:
// If a browser tab requested a relative subresource (CSS, font, chunk, image, API, or page link)
// that has a Referer header pointing to an active Aegis proxy tab, or an active tab session, proxy it to the remote origin!
app.use(async (req, res, next) => {
  // Never intercept API routes or explicit internal endpoints
  if (req.path.startsWith('/api/') || req.path.startsWith('/browser/search') || req.path === '/opensearch.xml') {
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

  // Fallback to active tab cookie if tabId not in referer
  if (!tabIdParam) {
    const cookieHeader = req.headers.cookie || '';
    const match = cookieHeader.match(/(?:^|; )aegis_active_tab=([^;]*)/);
    if (match) {
      try { tabIdParam = decodeURIComponent(match[1]); } catch(e) {}
    }
  }

  if (!tabIdParam) {
    tabIdParam = 'default_tab';
  }

  if (!targetUrlParam) {
    targetUrlParam = getTabActiveUrl(tabIdParam);
  }

  if (targetUrlParam) {
    try {
      const resolvedSubresource = new URL(req.originalUrl || req.url, targetUrlParam).href;

      // If this is an HTML page navigation (e.g. user clicked relative link like /merge_pdf),
      // redirect it into the proxy endpoint so the iframe stays properly contextualized
      const isHtmlNav = req.headers.accept && req.headers.accept.includes('text/html');
      if (isHtmlNav && req.method === 'GET') {
        return res.redirect(302, `/api/browser/proxy?tabId=${encodeURIComponent(tabIdParam)}&url=${encodeURIComponent(resolvedSubresource)}`);
      }

      req.query.url = resolvedSubresource;
      req.query.tabId = tabIdParam;
      return handleBrowserProxy(req, res);
    } catch(e) {}
  }
  next();
});

// Fallback to index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// Start Server with automatic port fallback
function startServer(port) {
  const server = app.listen(port, () => {
    console.log(`
=====================================================
🛡️  AEGIS PRIVATE SEARCH ENGINE RUNNING
=====================================================
  Local URL:        http://localhost:${port}
  Zero-Logging:     ENABLED (RAM Only)
  Proxy Reader:     ACTIVE (Tracker Sanitization)
  Document Vault:   BM25 In-Memory Index Ready
  AI Synthesizer:   ONLINE (Ollama / Gemini / Offline)
  OpenSearch XML:   http://localhost:${port}/opensearch.xml
=====================================================
    `);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.warn(`⚠️  Port ${port} is currently in use. Trying port ${port + 1}...`);
      startServer(port + 1);
    } else {
      console.error('Server error:', err);
    }
  });

  return server;
}

if (require.main === module) {
  startServer(Number(PORT));
}

module.exports = { app, startServer };
