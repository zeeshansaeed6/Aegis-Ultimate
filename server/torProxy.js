/**
 * Aegis Tor & Onion SOCKS5 Network Connector
 * Checks for local Tor service (ports 9050 / 9150) and integrates Ahmia .onion dark web search.
 */

const net = require('net');
const cheerio = require('cheerio');
const { sanitizeUrl } = require('./proxyReader');

/**
 * Checks if a local Tor SOCKS5 daemon is reachable
 */
function checkTorAvailable(port = 9050, host = '127.0.0.1') {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(1200);

    socket.on('connect', () => {
      socket.destroy();
      resolve({ available: true, port, host });
    });

    socket.on('timeout', () => {
      socket.destroy();
      resolve({ available: false, port, host });
    });

    socket.on('error', () => {
      socket.destroy();
      resolve({ available: false, port, host });
    });

    socket.connect(port, host);
  });
}

/**
 * Searches .onion hidden services via Ahmia
 */
async function searchAhmiaOnion(query) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    const endpoint = `https://ahmia.fi/search/?q=${encodeURIComponent(query)}`;
    const res = await fetch(endpoint, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; rv:109.0) Gecko/20100101 Firefox/115.0',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      },
      signal: controller.signal
    });

    clearTimeout(timeout);

    if (!res.ok) return [];

    const html = await res.text();
    const $ = cheerio.load(html);
    const results = [];

    $('.result').each((i, el) => {
      const title = $(el).find('h4 a').text().trim();
      let href = $(el).find('h4 a').attr('href') || '';
      const snippet = $(el).find('p').text().trim();

      // Extract target .onion link from redirect if needed
      if (href.startsWith('/address/')) {
        href = href.replace('/address/', '');
      }
      if (href.includes('redirect_url=')) {
        try {
          const match = href.match(/[?&]redirect_url=([^&]+)/);
          if (match && match[1]) {
            href = decodeURIComponent(match[1]);
          }
        } catch(e) {}
      }

      if (title && href) {
        let cleanHref = href.trim();
        if (!cleanHref.startsWith('http://') && !cleanHref.startsWith('https://')) {
          cleanHref = 'http://' + cleanHref;
        }
        let domain = 'darkweb.onion';
        try {
          const parsed = new URL(cleanHref);
          domain = parsed.hostname || domain;
        } catch(e) {
          if (cleanHref.includes('.onion')) {
            domain = cleanHref.replace(/^https?:\/\//, '').split('/')[0];
          }
        }

        results.push({
          id: `onion_${i}_${Date.now()}`,
          title: `[Onion] ${title}`,
          url: sanitizeUrl(cleanHref),
          domain: domain,
          snippet: snippet || 'Onion hidden service indexed by Ahmia.',
          source: 'Tor Onion (Ahmia)',
          category: 'web',
          privacyScore: 'Tor Encrypted',
          isOnion: true,
          badges: ['Onion Hidden Service', 'Tor Network']
        });
      }
    });

    return results.slice(0, 8);
  } catch (e) {
    return [];
  }
}

async function getTorStatus() {
  const check9050 = await checkTorAvailable(9050);
  if (check9050.available) {
    return { active: true, available: true, port: 9050, type: 'Tor System Daemon' };
  }

  const check9150 = await checkTorAvailable(9150);
  if (check9150.available) {
    return { active: true, available: true, port: 9150, type: 'Tor Browser Bundle' };
  }

  return {
    active: false,
    available: false,
    message: 'Local Tor daemon is not running on port 9050 or 9150. Start Tor Browser or `tor.exe` for onion multi-hop routing.'
  };
}

module.exports = {
  checkTorAvailable,
  searchAhmiaOnion,
  getTorStatus
};
