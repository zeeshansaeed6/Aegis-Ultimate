/**
 * Aegis Private Meta-Search Aggregator
 * Concurrently queries multiple privacy-friendly sources, normalizes results,
 * eliminates tracking beacons, and ranks by relevance.
 */

const cheerio = require('cheerio');
const { sanitizeUrl } = require('./proxyReader');
const { lensManager } = require('./lenses');

// Safe headers to prevent upstream profiling
const CLIENT_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
  'Cache-Control': 'no-cache',
  'DNT': '1' // Do Not Track
};

/**
 * Extract clean target URL from DuckDuckGo redirect link
 */
function extractDdgTargetUrl(href) {
  if (!href) return '';
  if (href.includes('uddg=')) {
    try {
      const match = href.match(/uddg=([^&]+)/);
      if (match) return decodeURIComponent(match[1]);
    } catch (e) {}
  }
  if (href.startsWith('//')) {
    return 'https:' + href;
  }
  return href;
}

/**
 * Extract clean target URL from Google redirect link (/url?q=...)
 */
function extractGoogleTargetUrl(href) {
  if (!href) return '';
  if (href.startsWith('/url?')) {
    try {
      const u = new URL('https://www.google.com' + href);
      const q = u.searchParams.get('q') || u.searchParams.get('url') || '';
      if (q && q.startsWith('http')) return q;
    } catch (e) {}
  }
  if (href.startsWith('/search')) return '';
  if (href.startsWith('/')) return '';
  if (href.startsWith('http')) return href;
  return '';
}

/**
 * Extract clean target URL from Bing redirect link
 */
function extractBingTargetUrl(href) {
  if (!href) return '';
  if (href.includes('&u=') || href.includes('?u=')) {
    try {
      const match = href.match(/[?&]u=([a-zA-Z0-9_-]+)/);
      if (match) {
        let b64 = match[1];
        if (b64.startsWith('a1')) b64 = b64.substring(2);
        b64 = b64.replace(/-/g, '+').replace(/_/g, '/');
        while (b64.length % 4) b64 += '=';
        const decoded = Buffer.from(b64, 'base64').toString('utf8');
        if (decoded.startsWith('http')) return decoded;
      }
    } catch (e) {}
  }
  if (href.startsWith('http') && !href.includes('bing.com/ck/')) return href;
  return href;
}

/**
 * Searches Bing HTML endpoint (high-performance privacy-cleaned results)
 */
async function searchBing(query, options = {}) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    const q = encodeURIComponent(query);
    const url = `https://www.bing.com/search?q=${q}&count=15&setlang=en&cc=US`;

    const res = await fetch(url, {
      headers: {
        ...CLIENT_HEADERS,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'DNT': '1'
      },
      signal: controller.signal
    });

    clearTimeout(timeout);
    if (!res.ok) return [];

    const html = await res.text();
    const $ = cheerio.load(html);
    const results = [];

    $('li.b_algo').each((i, el) => {
      const titleLink = $(el).find('h2 a').first();
      const rawHref = titleLink.attr('href') || '';
      const title = titleLink.text().trim();
      const snippet = $(el).find('.b_caption p, .b_algoDesc, p').first().text().trim();

      if (!title || !rawHref) return;

      const cleanUrl = sanitizeUrl(extractBingTargetUrl(rawHref));
      if (!cleanUrl || !cleanUrl.startsWith('http') || cleanUrl.includes('bing.com/')) return;

      let domain = '';
      try { domain = new URL(cleanUrl).hostname; } catch (e) {}

      results.push({
        id: `bing_${i}_${Date.now()}`,
        title,
        url: cleanUrl,
        domain,
        snippet: snippet.substring(0, 300),
        source: 'Bing',
        category: 'web',
        privacyScore: 'A+',
        badges: ['Direct Link', 'Tracker-Free', 'SSL']
      });
    });

    return results;
  } catch (err) {
    return [];
  }
}

/**
 * Searches Google HTML endpoint (primary search backend — best quality results)
 */
async function searchGoogle(query, options = {}) {
  const timeFilter = options.timeFilter || options.time || '';
  const region = options.region || '';
  const safeSearch = options.safeSearch || '';

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    let url = `https://www.google.com/search?q=${encodeURIComponent(query)}&num=15&hl=en&gl=us&pws=0`;
    // Time filter mapping: d=past day, w=past week, m=past month, y=past year
    if (timeFilter) {
      const tbs = timeFilter === 'd' ? 'qdr:d' : timeFilter === 'w' ? 'qdr:w' : timeFilter === 'm' ? 'qdr:m' : timeFilter === 'y' ? 'qdr:y' : '';
      if (tbs) url += `&tbs=${tbs}`;
    }
    if (region && region !== 'wt-wt') url += `&gl=${encodeURIComponent(region.split('-')[1] || region)}`;
    if (safeSearch === '-2') url += '&safe=active';

    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'identity',
        'DNT': '1',
        'Upgrade-Insecure-Requests': '1'
      },
      signal: controller.signal,
      redirect: 'follow'
    });

    clearTimeout(timeout);
    if (!res.ok || res.status === 429 || (res.url && res.url.includes('google.com/sorry'))) return [];

    const html = await res.text();
    const $ = cheerio.load(html);
    const results = [];

    // Google search result blocks are in div.g or div[data-hveid]
    $('div.g, div.tF2Cxc, div[data-hveid]').each((i, el) => {
      if (results.length >= 15) return;

      // Try multiple selectors for the title link
      let linkEl = $(el).find('a[href][data-ved]').first();
      if (!linkEl.length) linkEl = $(el).find('h3').closest('a');
      if (!linkEl.length) linkEl = $(el).find('a[href^="/url?"]').first();
      if (!linkEl.length) linkEl = $(el).find('a[href^="http"]').first();
      if (!linkEl.length) return;

      const rawHref = linkEl.attr('href') || '';
      let cleanUrl = extractGoogleTargetUrl(rawHref);
      if (!cleanUrl || cleanUrl.includes('google.com/search') || cleanUrl.includes('accounts.google') || cleanUrl.includes('support.google')) return;
      cleanUrl = sanitizeUrl(cleanUrl);

      // Get title text
      let title = $(el).find('h3').first().text().trim();
      if (!title) title = linkEl.text().trim();
      if (!title) return;

      // Get snippet — try multiple selectors
      let snippet = '';
      const snippetSelectors = [
        'div[data-sncf]', 'div.VwiC3b', 'div[style="-webkit-line-clamp:2"]',
        'span.aCOpRe', 'div.IsZvec', 'span.st', 'div.s'
      ];
      for (const sel of snippetSelectors) {
        const s = $(el).find(sel).first().text().trim();
        if (s && s.length > 20) { snippet = s; break; }
      }
      if (!snippet) {
        snippet = $(el).text().trim().substring(title.length, title.length + 200).trim();
      }

      // Skip ads and duplicates
      if ($(el).closest('[data-text-ad]').length || $(el).closest('#tads').length) return;

      let domain = '';
      try { domain = new URL(cleanUrl).hostname; } catch (e) {}

      // Skip duplicates
      if (results.some(r => r.url === cleanUrl)) return;

      results.push({
        id: `google_${i}_${Date.now()}`,
        title: title,
        url: cleanUrl,
        domain: domain,
        snippet: snippet.substring(0, 300),
        source: 'Google',
        category: 'web',
        privacyScore: 'A+',
        badges: ['Direct Link', 'Tracker-Free', 'SSL']
      });
    });

    return results;
  } catch (err) {
    return [];
  }
}

/**
 * Searches DuckDuckGo HTML endpoint (fallback if Google is blocked)
 */
async function searchDuckDuckGo(query, options = {}) {
  const timeFilter = typeof options === 'string' ? options : (options.timeFilter || options.time || '');
  const region = typeof options === 'object' ? (options.region || '') : '';
  const safeSearch = typeof options === 'object' ? (options.safeSearch || '') : '';

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    let queryParams = `q=${encodeURIComponent(query)}`;
    if (timeFilter) queryParams += `&df=${encodeURIComponent(timeFilter)}`;
    if (region && region !== 'wt-wt') queryParams += `&kl=${encodeURIComponent(region)}`;
    else queryParams += '&kl=us-en';
    if (safeSearch) queryParams += `&kp=${encodeURIComponent(safeSearch)}`;

    const res = await fetch(`https://html.duckduckgo.com/html/?${queryParams}`, {
      method: 'POST',
      headers: {
        ...CLIENT_HEADERS,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: queryParams,
      signal: controller.signal
    });

    clearTimeout(timeout);

    if (!res.ok) return [];

    const html = await res.text();
    const $ = cheerio.load(html);
    const results = [];

    $('.result').each((i, el) => {
      const titleEl = $(el).find('.result__title a');
      const snippetEl = $(el).find('.result__snippet');
      const urlEl = $(el).find('.result__url');

      if ($(el).hasClass('result--ad') || $(el).hasClass('badge--ad') || $(el).find('.badge--ad').length > 0) return;

      if (titleEl.length) {
        const rawHref = titleEl.attr('href') || '';
        const extracted = extractDdgTargetUrl(rawHref);
        const cleanUrl = sanitizeUrl(extracted);

        if (!cleanUrl || cleanUrl.startsWith('/') || cleanUrl.includes('duckduckgo.com/y.js') || cleanUrl.includes('bing.com/aclick') || rawHref.includes('ad_domain') || rawHref.includes('ad_provider')) return;

        let domain = '';
        try {
          domain = new URL(cleanUrl).hostname;
        } catch (e) {
          domain = urlEl.text().trim();
        }

        results.push({
          id: `ddg_${i}_${Date.now()}`,
          title: titleEl.text().trim(),
          url: cleanUrl,
          domain: domain,
          snippet: snippetEl.text().trim(),
          source: 'DuckDuckGo',
          category: 'web',
          privacyScore: 'A+',
          badges: ['Direct Link', 'Tracker-Free', 'SSL']
        });
      }
    });

    return results;
  } catch (err) {
    return [];
  }
}

/**
 * Searches Wikipedia OpenSearch API
 */
async function searchWikipedia(query) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);

    const endpoint = `https://en.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(query)}&limit=4&namespace=0&format=json`;
    const res = await fetch(endpoint, {
      headers: CLIENT_HEADERS,
      signal: controller.signal
    });

    clearTimeout(timeout);

    if (!res.ok) return [];

    const data = await res.json();
    // Format: [query, [titles], [descriptions], [urls]]
    const titles = data[1] || [];
    const snippets = data[2] || [];
    const urls = data[3] || [];

    const results = [];
    for (let i = 0; i < titles.length; i++) {
      if (!titles[i] || !urls[i]) continue;
      results.push({
        id: `wiki_${i}_${Date.now()}`,
        title: titles[i],
        url: sanitizeUrl(urls[i]),
        domain: 'en.wikipedia.org',
        snippet: snippets[i] || `Encyclopedia entry for ${titles[i]} on Wikipedia.`,
        source: 'Wikipedia',
        category: 'web',
        privacyScore: 'A+',
        badges: ['Open Knowledge', 'Verified Source']
      });
    }

    return results;
  } catch (err) {
    return [];
  }
}

/**
 * Searches GitHub Repositories for Tech/Dev queries
 */
async function searchGitHub(query) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);

    const res = await fetch(`https://api.github.com/search/repositories?q=${encodeURIComponent(query)}&per_page=4`, {
      headers: {
        ...CLIENT_HEADERS,
        'Accept': 'application/vnd.github.v3+json'
      },
      signal: controller.signal
    });

    clearTimeout(timeout);

    if (!res.ok) return [];

    const data = await res.json();
    if (!data.items) return [];

    return data.items.map((repo, i) => ({
      id: `gh_${repo.id || i}`,
      title: `${repo.full_name}: ${repo.description || 'GitHub Repository'}`,
      url: sanitizeUrl(repo.html_url),
      domain: 'github.com',
      snippet: `★ ${repo.stargazers_count?.toLocaleString() || 0} stars | Language: ${repo.language || 'Code'} | License: ${repo.license?.spdx_id || 'Open'}. ${repo.description || ''}`,
      source: 'GitHub',
      category: 'tech',
      privacyScore: 'A+',
      badges: ['Open Source', 'Repository', repo.language || 'Code']
    }));
  } catch (err) {
    return [];
  }
}

/**
 * Searches ArXiv Papers for academic / scientific queries
 */
async function searchArxiv(query) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);

    const res = await fetch(`https://export.arxiv.org/api/query?search_query=all:${encodeURIComponent(query)}&max_results=3`, {
      headers: CLIENT_HEADERS,
      signal: controller.signal
    });

    clearTimeout(timeout);

    if (!res.ok) return [];

    const xml = await res.text();
    const $ = cheerio.load(xml, { xmlMode: true });
    const results = [];

    $('entry').each((i, el) => {
      const title = $(el).find('title').text().replace(/\s+/g, ' ').trim();
      const summary = $(el).find('summary').text().replace(/\s+/g, ' ').trim();
      const id = $(el).find('id').text().trim();

      if (title && id) {
        results.push({
          id: `arxiv_${i}_${Date.now()}`,
          title: `[Paper] ${title}`,
          url: sanitizeUrl(id),
          domain: 'arxiv.org',
          snippet: summary.substring(0, 220) + '...',
          source: 'arXiv',
          category: 'tech',
          privacyScore: 'A+',
          badges: ['Peer Research', 'Open Access']
        });
      }
    });

    return results;
  } catch (err) {
    return [];
  }
}

/**
 * Searches DuckDuckGo Instant Answers API
 */
async function searchDdgInstant(query) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);

    const res = await fetch(`https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`, {
      headers: CLIENT_HEADERS,
      signal: controller.signal
    });

    clearTimeout(timeout);

    if (!res.ok) return [];

    const data = await res.json();
    const results = [];

    if (data.AbstractText && data.AbstractURL) {
      results.push({
        id: `ddg_instant_${Date.now()}`,
        title: data.Heading || query,
        url: sanitizeUrl(data.AbstractURL),
        domain: data.AbstractSource || 'duckduckgo.com',
        snippet: data.AbstractText,
        source: 'Instant Answer',
        category: 'web',
        privacyScore: 'A+',
        badges: ['Verified Answer', data.AbstractSource || 'Knowledge Graph']
      });
    }

    if (Array.isArray(data.RelatedTopics)) {
      data.RelatedTopics.slice(0, 3).forEach((topic, i) => {
        if (topic.Text && topic.FirstURL) {
          results.push({
            id: `ddg_related_${i}`,
            title: topic.Text.split(' - ')[0] || topic.Text.substring(0, 60),
            url: sanitizeUrl(topic.FirstURL),
            domain: new URL(topic.FirstURL).hostname || 'web',
            snippet: topic.Text,
            source: 'DuckDuckGo',
            category: 'web',
            privacyScore: 'A+',
            badges: ['Related Topic']
          });
        }
      });
    }

    return results;
  } catch (err) {
    return [];
  }
}

/**
 * Primary Meta-Search Orchestrator
 */
async function aggregateSearch(query, category = 'all', options = {}) {
  const { lens, time, filetype, region, safeSearch } = options;

  let effectiveLens = lens;
  if (!effectiveLens || effectiveLens === 'all') {
    if (category === 'discussions') effectiveLens = 'discussions';
    else if (category === 'packages') effectiveLens = 'packages';
    else if (category === 'papers') effectiveLens = 'academic';
  }

  let effectiveQuery = query;

  // 1. Apply filetype operator if present
  if (filetype && !effectiveQuery.includes(`filetype:${filetype}`)) {
    effectiveQuery += ` filetype:${filetype}`;
  }

  // 2. Apply lens query suffix if active
  if (effectiveLens && effectiveLens !== 'all') {
    effectiveQuery = lensManager.applyLensToQuery(effectiveQuery, effectiveLens);
  }

  const isTechQuery = category === 'tech' || category === 'packages' || effectiveLens === 'developer' || effectiveLens === 'packages' || /\b(code|git|python|javascript|npm|rust|docker|api|linux|bash|c\+\+|css|html|sql|react)\b/i.test(effectiveQuery);

  // Parallel multi-engine fetch: Google primary, Bing high-performance search, DDG fallback, plus enrichment sources
  const searchOpts = { timeFilter: time, region, safeSearch };
  const searchPromises = [
    searchGoogle(effectiveQuery, searchOpts),
    searchBing(effectiveQuery, searchOpts),
    searchWikipedia(query),
    searchDdgInstant(query)
  ];

  if (isTechQuery) {
    searchPromises.push(searchGitHub(query));
    searchPromises.push(searchArxiv(query));
  } else if (category === 'papers' || effectiveLens === 'academic') {
    searchPromises.push(searchArxiv(query));
  }

  const engineResults = await Promise.allSettled(searchPromises);

  // Check if primary engines returned results; if fewer than 4, fallback to DuckDuckGo
  const primaryCount = (Array.isArray(engineResults[0]?.value) ? engineResults[0].value.length : 0) +
                       (Array.isArray(engineResults[1]?.value) ? engineResults[1].value.length : 0);
  if (primaryCount < 4) {
    try {
      const ddgFallback = await searchDuckDuckGo(effectiveQuery, searchOpts);
      if (ddgFallback.length > 0) {
        engineResults.push({ status: 'fulfilled', value: ddgFallback });
      }
    } catch (e) {}
  }

  // Flatten and deduplicate
  const seenUrls = new Set();
  let aggregated = [];

  const flattened = [];
  for (const res of engineResults) {
    if (res.status === 'fulfilled' && Array.isArray(res.value)) {
      flattened.push(...res.value);
    }
  }

  for (const item of flattened) {
    if (!item.url) continue;
    try {
      const parsed = new URL(item.url);
      const urlKey = (parsed.hostname + parsed.pathname).toLowerCase().replace(/\/$/, '');

      if (!seenUrls.has(urlKey)) {
        seenUrls.add(urlKey);
        if (category !== 'all' && category !== 'local') {
          item.category = category;
        }
        aggregated.push(item);
      }
    } catch (e) {}
  }

  // 3. If a lens is active, prioritize or filter matching lens domains
  if (effectiveLens && effectiveLens !== 'all') {
    const filteredByLens = lensManager.filterResultsByLens(aggregated, effectiveLens);
    if (filteredByLens.length > 0) {
      aggregated = filteredByLens;
    }
  }

  // 4. Filter out any unexpected foreign/CJK results if query is in English / Latin characters
  const isCjkQuery = /[\u4e00-\u9fa5\u3040-\u30ff\u3400-\u4dbf]/.test(query);
  if (!isCjkQuery) {
    aggregated = aggregated.filter(item => {
      const cjkCount = ((item.title || '') + ' ' + (item.snippet || '')).match(/[\u4e00-\u9fa5]/g)?.length || 0;
      return cjkCount < 3;
    });
  }

  return aggregated;
}

module.exports = {
  aggregateSearch,
  searchGoogle,
  searchBing,
  searchDuckDuckGo
};
