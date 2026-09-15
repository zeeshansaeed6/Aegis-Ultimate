/**
 * Aegis Autonomous Web Crawler
 * Breadth-First Spider with politeness rate-limiting, link normalizer,
 * content extraction, robots compliance, and native inverted index synchronization.
 */

const cheerio = require('cheerio');
const { nativeEngine } = require('./nativeEngine');
const { sanitizeUrl } = require('./proxyReader');

const CRAWLER_USER_AGENT = 'AegisSearchBot/1.0 (+http://localhost:3000/bot; Autonomous Private Crawler; Respects Robots)';

const EXCLUDED_EXTENSIONS = new Set([
  '.jpg', '.jpeg', '.png', '.gif', '.svg', '.webp', '.ico',
  '.mp4', '.webm', '.mp3', '.wav', '.ogg',
  '.pdf', '.zip', '.tar', '.gz', '.7z', '.exe', '.dmg',
  '.css', '.js', '.json', '.xml', '.rss'
]);

class WebCrawler {
  constructor() {
    this.active = false;
    this.queue = [];
    this.visited = new Set();
    this.currentJob = null;
    this.timer = null;
    this.abortController = null;
    this.logs = [];
  }

  log(message, type = 'info') {
    const entry = {
      timestamp: new Date().toLocaleTimeString(),
      message,
      type
    };
    this.logs.unshift(entry);
    if (this.logs.length > 80) this.logs.pop();
  }

  normalizeUrl(rawUrl, baseUrl) {
    try {
      if (!rawUrl || rawUrl.startsWith('javascript:') || rawUrl.startsWith('mailto:') || rawUrl.startsWith('tel:')) {
        return null;
      }

      // Resolve relative path to absolute URL
      const resolved = new URL(rawUrl, baseUrl);
      
      // Only crawl HTTP and HTTPS
      if (resolved.protocol !== 'http:' && resolved.protocol !== 'https:') {
        return null;
      }

      // Strip hash fragment
      resolved.hash = '';

      // Clean tracking tokens (utm_*, fbclid, etc.)
      const cleaned = sanitizeUrl(resolved.href);
      const parsedCleaned = new URL(cleaned);

      // Check if extension is binary/media
      const pathname = parsedCleaned.pathname.toLowerCase();
      for (const ext of EXCLUDED_EXTENSIONS) {
        if (pathname.endsWith(ext)) return null;
      }

      return parsedCleaned.href;
    } catch (e) {
      return null;
    }
  }

  isDomainAllowed(targetUrl, seedUrl, sameDomainOnly = true) {
    if (!sameDomainOnly) return true;
    try {
      const targetHost = new URL(targetUrl).hostname.toLowerCase();
      const seedHost = new URL(seedUrl).hostname.toLowerCase();
      return targetHost === seedHost || targetHost.endsWith('.' + seedHost);
    } catch (e) {
      return false;
    }
  }

  async startCrawl({ seedUrl, maxPages = 50, maxDepth = 2, sameDomainOnly = true, delayMs = 180 }) {
    if (this.active) {
      throw new Error('A crawl job is already in progress. Stop it before starting a new one.');
    }

    if (!seedUrl) throw new Error('Seed URL is required.');

    let normalizedSeed = seedUrl.trim();
    if (!/^https?:\/\//i.test(normalizedSeed)) {
      normalizedSeed = 'https://' + normalizedSeed;
    }

    try {
      new URL(normalizedSeed);
    } catch (e) {
      throw new Error('Invalid seed URL format.');
    }

    this.active = true;
    this.queue = [{ url: normalizedSeed, depth: 0 }];
    this.visited = new Set([normalizedSeed]);
    this.logs = [];

    this.currentJob = {
      seedUrl: normalizedSeed,
      maxPages: Math.min(Math.max(Number(maxPages) || 20, 5), 500),
      maxDepth: Math.min(Math.max(Number(maxDepth) || 2, 1), 5),
      sameDomainOnly: Boolean(sameDomainOnly),
      delayMs: Math.max(Number(delayMs) || 180, 50),
      pagesCrawled: 0,
      currentUrl: normalizedSeed,
      startedAt: new Date().toISOString(),
      status: 'crawling'
    };

    this.log(`Started crawl job from ${normalizedSeed} (Max pages: ${this.currentJob.maxPages}, Max depth: ${this.currentJob.maxDepth})`);

    // Kick off autonomous background crawl loop
    this.runLoop();

    return this.getStatus();
  }

  stopCrawl() {
    this.active = false;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
    if (this.currentJob) {
      this.currentJob.status = 'stopped';
      this.log('Crawl job stopped by user.', 'warn');
    }
    // Save state to disk on stop
    nativeEngine.saveToDisk();
    return this.getStatus();
  }

  async runLoop() {
    while (this.active && this.queue.length > 0) {
      if (this.currentJob.pagesCrawled >= this.currentJob.maxPages) {
        this.log(`Reached max target page limit (${this.currentJob.maxPages}). Crawl complete!`, 'success');
        break;
      }

      const item = this.queue.shift();
      if (!item) break;

      this.currentJob.currentUrl = item.url;

      try {
        await this.crawlSinglePage(item.url, item.depth);
      } catch (err) {
        this.log(`Failed crawling ${item.url}: ${err.message}`, 'error');
      }

      // Respectful politeness rate limiting delay
      if (this.active && this.queue.length > 0) {
        await new Promise(r => { this.timer = setTimeout(r, this.currentJob.delayMs); });
      }
    }

    this.active = false;
    if (this.currentJob) {
      this.currentJob.status = 'finished';
      this.currentJob.finishedAt = new Date().toISOString();
      this.log(`Crawl finished. Total pages indexed: ${this.currentJob.pagesCrawled}.`, 'success');
    }

    // Persist crawled index to disk
    nativeEngine.saveToDisk();
  }

  async crawlSinglePage(url, depth) {
    this.abortController = new AbortController();
    const timeout = setTimeout(() => this.abortController.abort(), 7000);

    const res = await fetch(url, {
      headers: {
        'User-Agent': CRAWLER_USER_AGENT,
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9'
      },
      signal: this.abortController.signal
    });

    clearTimeout(timeout);

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('text/html') && !contentType.includes('application/xhtml')) {
      return; // Skip non-HTML responses
    }

    const html = await res.text();
    const $ = cheerio.load(html);

    // Check for robots noindex
    const robotsMeta = $('meta[name="robots"]').attr('content') || '';
    if (robotsMeta.toLowerCase().includes('noindex')) {
      this.log(`Skipped ${url} (robots noindex tag found)`, 'warn');
      return;
    }

    // Extract Title
    const title = ($('title').first().text() || $('h1').first().text() || '').trim();

    // Extract Meta Description
    const description = (
      $('meta[name="description"]').attr('content') ||
      $('meta[property="og:description"]').attr('content') ||
      ''
    ).trim();

    // Extract Headings
    const headings = [];
    $('h1, h2, h3').each((i, el) => {
      const h = $(el).text().trim();
      if (h && h.length < 120 && !headings.includes(h)) headings.push(h);
    });

    // Extract Favicon
    let favicon = $('link[rel="icon"], link[rel="shortcut icon"]').attr('href') || '';
    if (favicon && !favicon.startsWith('http')) {
      try { favicon = new URL(favicon, url).href; } catch (e) {}
    }

    // Remove irrelevant elements to clean body text
    $('script, style, noscript, nav, footer, header, aside, form, svg, iframe').remove();
    const bodyText = $('body').text().replace(/\s+/g, ' ').trim();

    if (!bodyText || bodyText.length < 50) return; // Skip empty pages

    // Extract Outgoing Links
    const outgoingLinks = [];
    const shouldDiscoverLinks = depth < this.currentJob.maxDepth;

    $('a[href]').each((i, el) => {
      const href = $(el).attr('href');
      const normalized = this.normalizeUrl(href, url);

      if (normalized && !outgoingLinks.includes(normalized)) {
        outgoingLinks.push(normalized);

        // Queue new link if allowed and unvisited
        if (shouldDiscoverLinks && !this.visited.has(normalized)) {
          if (this.isDomainAllowed(normalized, this.currentJob.seedUrl, this.currentJob.sameDomainOnly)) {
            this.visited.add(normalized);
            this.queue.push({ url: normalized, depth: depth + 1 });
          }
        }
      }
    });

    // Feed page to Native Search Engine Index
    nativeEngine.addPage({
      url,
      domain: new URL(url).hostname,
      title: title || url,
      description,
      headings,
      body: bodyText,
      outgoingLinks,
      favicon
    });

    this.currentJob.pagesCrawled++;
    this.log(`Indexed [${this.currentJob.pagesCrawled}/${this.currentJob.maxPages}] ${title ? `"${title.substring(0, 45)}..."` : url} (${bodyText.split(/\s+/).length} words)`);
  }

  getStatus() {
    return {
      active: this.active,
      isCrawling: this.active,
      job: this.currentJob,
      queue: this.queue,
      queueLength: this.queue.length,
      visitedCount: this.visited.size,
      crawledCount: this.currentJob?.pagesCrawled || 0,
      maxPages: this.currentJob?.maxPages || 0,
      recentLogs: this.logs.slice(0, 30),
      stats: nativeEngine.getStats(),
      engineStats: nativeEngine.getStats()
    };
  }
}

const webCrawler = new WebCrawler();

module.exports = {
  WebCrawler,
  webCrawler
};
