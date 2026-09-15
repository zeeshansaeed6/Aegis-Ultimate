/**
 * Aegis Anonymous Media Search & Proxy Streamer
 * Handles privacy-safe image searches (proxied to prevent IP leaks)
 * and privacy video search with youtube-nocookie/invidious embeds.
 */

const { sanitizeUrl } = require('./proxyReader');

/**
 * Searches full web images via DuckDuckGo / Bing image index with Wikimedia Commons fallback
 */
async function searchImages(query) {
  // 1. First attempt: Full web image search via DuckDuckGo image API (90+ real web images)
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    const tokenRes = await fetch(`https://duckduckgo.com/?q=${encodeURIComponent(query)}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      },
      signal: controller.signal
    });

    const tokenHtml = await tokenRes.text();
    const vqdMatch = tokenHtml.match(/vqd=["']?([^&"'\s]+)/);

    if (vqdMatch && vqdMatch[1]) {
      const vqd = vqdMatch[1];
      const imgRes = await fetch(`https://duckduckgo.com/i.js?l=us-en&o=json&q=${encodeURIComponent(query)}&vqd=${vqd}&f=,,,`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          'Referer': 'https://duckduckgo.com/'
        },
        signal: controller.signal
      });

      clearTimeout(timeout);

      if (imgRes.ok) {
        const data = await imgRes.json();
        if (data.results && data.results.length > 0) {
          const formatted = data.results.map((r, i) => {
            let domain = 'web';
            try {
              domain = new URL(r.url || r.image).hostname.replace(/^www\./, '');
            } catch(e) {}

            return {
              id: `img_ddg_${i}_${Date.now()}`,
              title: r.title || query,
              sourceUrl: sanitizeUrl(r.url || r.image),
              proxiedUrl: `/api/proxy/image?url=${encodeURIComponent(r.image || r.thumbnail)}`,
              thumbnail: r.thumbnail,
              width: r.width || 800,
              height: r.height || 600,
              mime: 'image/jpeg',
              domain: domain
            };
          });

          if (formatted.length > 0) {
            return formatted.slice(0, 32);
          }
        }
      }
    }
    clearTimeout(timeout);
  } catch (ddgErr) {
    // Graceful fallback to Wikimedia Commons
  }

  // 2. Secondary Fallback: Wikimedia Commons Open Media Search
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const endpoint = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(query)}&gsrnamespace=6&prop=imageinfo&iiprop=url|size|mime&format=json&origin=*`;
    
    const res = await fetch(endpoint, {
      headers: {
        'User-Agent': 'AegisPrivateSearch/1.0 (Privacy-First Meta Engine)',
        'Accept': 'application/json'
      },
      signal: controller.signal
    });

    clearTimeout(timeout);

    if (!res.ok) return [];

    const data = await res.json();
    if (!data.query || !data.query.pages) return [];

    const images = [];
    for (const pageId in data.query.pages) {
      const page = data.query.pages[pageId];
      if (page.imageinfo && page.imageinfo[0]) {
        const info = page.imageinfo[0];
        const rawUrl = info.url;
        
        // Filter out non-web image formats (e.g. svg, tiff)
        if (!rawUrl || rawUrl.endsWith('.tiff') || rawUrl.endsWith('.djvu')) continue;

        const cleanTitle = (page.title || '').replace(/^File:/i, '').replace(/\.[^.]+$/, '').replace(/_/g, ' ');

        images.push({
          id: `img_${pageId}`,
          title: cleanTitle || query,
          sourceUrl: sanitizeUrl(rawUrl),
          // Routed through Aegis backend proxy to hide client IP
          proxiedUrl: `/api/proxy/image?url=${encodeURIComponent(rawUrl)}`,
          width: info.width || 800,
          height: info.height || 600,
          mime: info.mime || 'image/jpeg',
          domain: 'commons.wikimedia.org'
        });
      }
    }

    return images.slice(0, 24);
  } catch (e) {
    return [];
  }
}

/**
 * Searches Videos from public feeds & formats tracker-free embeds
 */
async function searchVideos(query) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    // Query DuckDuckGo or public feed for video matches
    const endpoint = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query + ' site:youtube.com')}`;
    const res = await fetch(endpoint, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
      },
      signal: controller.signal
    });

    clearTimeout(timeout);

    if (!res.ok) return [];

    const html = await res.text();
    const cheerio = require('cheerio');
    const $ = cheerio.load(html);
    const videos = [];

    $('.result').each((i, el) => {
      const title = $(el).find('.result__title a').text().trim();
      const href = $(el).find('.result__title a').attr('href') || '';
      const snippet = $(el).find('.result__snippet').text().trim();

      let videoId = '';
      if (href.includes('watch?v=')) {
        const match = href.match(/watch\?v=([a-zA-Z0-9_-]+)/);
        if (match) videoId = match[1];
      } else if (href.includes('/v/')) {
        const match = href.match(/\/v\/([a-zA-Z0-9_-]+)/);
        if (match) videoId = match[1];
      }

      if (videoId && title) {
        videos.push({
          id: `vid_${videoId}`,
          title,
          snippet,
          videoId,
          // Privacy-hardened embed domain without tracking cookies
          embedUrl: `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=0&rel=0`,
          cleanUrl: `https://www.youtube.com/watch?v=${videoId}`,
          thumbnail: `/api/proxy/image?url=${encodeURIComponent(`https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`)}`,
          source: 'YouTube (Privacy Hardened)'
        });
      }
    });

    return videos.slice(0, 10);
  } catch (e) {
    return [];
  }
}

/**
 * Proxies external images server-side to hide client IP and browser fingerprint
 */
async function proxyImageStream(imageUrl, res) {
  try {
    const cleanUrl = sanitizeUrl(imageUrl);
    const parsed = new URL(cleanUrl);

    // Prevent internal LAN loopback
    if (['localhost', '127.0.0.1', '0.0.0.0'].includes(parsed.hostname) || parsed.hostname.startsWith('192.168.')) {
      return res.status(403).send('Forbidden');
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const upstream = await fetch(cleanUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)',
        'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8'
      },
      signal: controller.signal
    });

    clearTimeout(timeout);

    if (!upstream.ok) {
      return res.status(upstream.status).send('Upstream image error');
    }

    const contentType = upstream.headers.get('content-type') || 'image/jpeg';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 24h
    res.setHeader('Referrer-Policy', 'no-referrer');

    const arrayBuffer = await upstream.arrayBuffer();
    return res.send(Buffer.from(arrayBuffer));
  } catch (err) {
    return res.status(500).send('Failed to proxy image');
  }
}

module.exports = {
  searchImages,
  searchVideos,
  proxyImageStream
};
