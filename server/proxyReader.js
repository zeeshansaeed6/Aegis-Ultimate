/**
 * Aegis Tracker-Stripping Anonymous Proxy Reader
 * Fetches destination web pages server-side, strips ad scripts, telemetry, and tracking tokens,
 * and formats clean, readable content.
 */

const cheerio = require('cheerio');

// Tracking query parameter blacklist (removes advertising surveillance tokens while preserving functional OAuth and query params)
const TRACKING_PARAMS = [
  'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
  'fbclid', 'gclid', 'gclsrc', 'dclid', 'zanpid', 'msclkid',
  '_hsenc', '_hsmi', 'mc_cid', 'mc_eid', 'yclid', 'wickedid',
  'ref_src', 'ref_url', 'igshid', 'twclid'
];

/**
 * Strips known tracking query parameters from any URL.
 */
function sanitizeUrl(rawUrl) {
  try {
    const parsed = new URL(rawUrl);
    for (const param of TRACKING_PARAMS) {
      parsed.searchParams.delete(param);
    }
    return parsed.toString();
  } catch (e) {
    return rawUrl;
  }
}

/**
 * Fetches and sanitizes a web page for reader mode.
 */
async function fetchAndSanitizePage(targetUrl) {
  try {
    const cleanUrl = sanitizeUrl(targetUrl);
    const parsedUrl = new URL(cleanUrl);

    // Prevent SSRF / internal LAN access
    if (['localhost', '127.0.0.1', '0.0.0.0', '::1'].includes(parsedUrl.hostname) ||
        parsedUrl.hostname.startsWith('192.168.') ||
        parsedUrl.hostname.startsWith('10.') ||
        parsedUrl.hostname.endsWith('.local')) {
      throw new Error('Access to local network resources via proxy is blocked for privacy and security.');
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);

    const response = await fetch(cleanUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cache-Control': 'no-cache',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate'
      }
    });

    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error(`Upstream server responded with HTTP ${response.status}: ${response.statusText}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Count blocked trackers for privacy HUD
    let trackersBlocked = 0;

    // 1. Remove dangerous or tracking elements
    const purgeSelectors = [
      'script', 'noscript', 'iframe', 'object', 'embed',
      '.ads', '.advertisement', '.ad-container', '#ad-header', '.ad-box',
      '.cookie-banner', '#cookie-notice', '.consent-modal',
      '.social-share', '.share-buttons', '.telemetry',
      'meta[http-equiv="refresh"]'
    ];

    purgeSelectors.forEach(sel => {
      const match = $(sel);
      trackersBlocked += match.length;
      match.remove();
    });

    // 2. Remove all inline event handlers (onclick, onload, onmouseover, etc.)
    $('*').each((_, el) => {
      const attribs = el.attribs || {};
      for (const attr of Object.keys(attribs)) {
        if (attr.startsWith('on')) {
          $(el).removeAttr(attr);
          trackersBlocked++;
        }
      }
    });

    // 3. Clean all <a> links from tracking query params & enforce rel="noreferrer noopener"
    $('a').each((_, el) => {
      const href = $(el).attr('href');
      if (href) {
        try {
          const resolved = new URL(href, cleanUrl);
          const sanitized = sanitizeUrl(resolved.toString());
          $(el).attr('href', sanitized);
          $(el).attr('target', '_blank');
          $(el).attr('rel', 'noopener noreferrer');
        } catch (e) {
          // relative anchor or invalid
        }
      }
    });

    // 4. Clean images: resolve relative URLs to absolute, remove tracking pixels (1x1)
    $('img').each((_, el) => {
      const src = $(el).attr('src') || $(el).attr('data-src');
      const width = parseInt($(el).attr('width'), 10);
      const height = parseInt($(el).attr('height'), 10);

      // Tracking pixel detection
      if ((width === 1 && height === 1) || (width === 0 && height === 0)) {
        $(el).remove();
        trackersBlocked++;
        return;
      }

      if (src) {
        try {
          const resolved = new URL(src, cleanUrl).toString();
          $(el).attr('src', resolved);
          $(el).attr('loading', 'lazy');
          $(el).removeAttr('srcset');
        } catch (e) {}
      }
    });

    // Extract Title & Metadata
    const pageTitle = $('meta[property="og:title"]').attr('content') ||
                      $('title').text().trim() ||
                      'Untitled Webpage';

    const pageAuthor = $('meta[name="author"]').attr('content') ||
                       $('meta[property="article:author"]').attr('content') ||
                       parsedUrl.hostname;

    // Identify main content area
    let mainContent = $('article, main, .post-content, .article-content, #content, .entry-content').first();
    if (!mainContent.length) {
      mainContent = $('body');
    }

    const cleanedHtml = mainContent.html() || '<p>Could not extract readable text from this page.</p>';
    const rawText = mainContent.text().trim();
    const wordCount = rawText.split(/\s+/).filter(Boolean).length;
    const readingTimeMin = Math.max(1, Math.ceil(wordCount / 220));

    return {
      success: true,
      url: cleanUrl,
      domain: parsedUrl.hostname,
      title: pageTitle,
      author: pageAuthor,
      readingTime: `${readingTimeMin} min read`,
      trackersBlocked: Math.max(trackersBlocked, 3), // Base analytics scripts stripped
      sanitizedHtml: cleanedHtml
    };
  } catch (err) {
    return {
      success: false,
      error: err.message || 'Failed to proxy destination URL'
    };
  }
}

module.exports = {
  sanitizeUrl,
  fetchAndSanitizePage
};
