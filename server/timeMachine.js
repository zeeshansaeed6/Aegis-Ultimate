/**
 * Aegis Time Machine & Historical Web Archives Engine
 * Provides instant historical lookups, Wayback Machine snapshots,
 * Archive.today mirrors, and paywall/dead-link bypass resolution.
 */

const { sanitizeUrl } = require('./proxyReader');

// Safe headers to prevent upstream rate limiting
const ARCHIVE_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 AegisSearch/1.0',
  'Accept': 'application/json,text/html,*/*',
  'Accept-Language': 'en-US,en;q=0.9',
  'DNT': '1'
};

/**
 * Format Wayback timestamp (YYYYMMDDhhmmss) into human readable string
 */
function formatWaybackTimestamp(ts) {
  if (!ts || typeof ts !== 'string' || ts.length < 8) return 'Archived';
  const year = ts.substring(0, 4);
  const month = ts.substring(4, 6);
  const day = ts.substring(6, 8);
  const hour = ts.length >= 10 ? ts.substring(8, 10) : '00';
  const minute = ts.length >= 12 ? ts.substring(10, 12) : '00';

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthName = months[parseInt(month, 10) - 1] || month;

  return `${monthName} ${parseInt(day, 10)}, ${year} at ${hour}:${minute} UTC`;
}

/**
 * Generate fallback archive URLs for any target URL
 */
function getArchiveFallbacks(targetUrl) {
  let cleanTarget = (targetUrl || '').trim();
  if (cleanTarget && !cleanTarget.startsWith('http://') && !cleanTarget.startsWith('https://') && cleanTarget.includes('.')) {
    cleanTarget = 'https://' + cleanTarget;
  }
  const clean = sanitizeUrl(cleanTarget);
  return {
    waybackUrl: `https://web.archive.org/web/*/${clean}`,
    waybackLatestUrl: `https://web.archive.org/web/${clean}`,
    archiveTodayUrl: `https://archive.today/newest/${clean}`,
    googleCacheUrl: `https://webcache.googleusercontent.com/search?q=cache:${clean}`
  };
}

/**
 * Query official Wayback Machine Availability API
 * GET https://archive.org/wayback/available?url=<url>
 */
async function lookupWaybackSnapshot(targetUrl) {
  let normalized = (targetUrl || '').trim();
  if (normalized && !normalized.startsWith('http://') && !normalized.startsWith('https://') && normalized.includes('.')) {
    normalized = 'https://' + normalized;
  }
  const cleanUrl = sanitizeUrl(normalized);
  if (!cleanUrl) {
    return {
      success: false,
      available: false,
      error: 'Invalid target URL'
    };
  }

  const fallbacks = getArchiveFallbacks(cleanUrl);

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4500);

    const endpoint = `https://archive.org/wayback/available?url=${encodeURIComponent(cleanUrl)}`;
    const res = await fetch(endpoint, {
      headers: ARCHIVE_HEADERS,
      signal: controller.signal
    });

    clearTimeout(timeout);

    if (!res.ok) {
      return {
        success: true,
        available: false,
        targetUrl: cleanUrl,
        message: `Wayback API returned status ${res.status}`,
        ...fallbacks
      };
    }

    const data = await res.json();
    const snapshots = data && data.archived_snapshots;
    const closest = snapshots && snapshots.closest;

    if (closest && closest.available && closest.url) {
      // Force HTTPS on archive snapshot URLs
      const secureSnapshotUrl = closest.url.replace(/^http:\/\//, 'https://');
      const formattedDate = formatWaybackTimestamp(closest.timestamp);

      return {
        success: true,
        available: true,
        targetUrl: cleanUrl,
        snapshotUrl: secureSnapshotUrl,
        timestamp: closest.timestamp,
        formattedDate: formattedDate,
        status: closest.status,
        ...fallbacks
      };
    }

    return {
      success: true,
      available: false,
      targetUrl: cleanUrl,
      message: 'No active snapshot found in Internet Archive, but direct archive lookups are available.',
      ...fallbacks
    };
  } catch (err) {
    // Graceful offline fallback
    return {
      success: true,
      available: false,
      targetUrl: cleanUrl,
      isOfflineFallback: true,
      message: 'Wayback API unavailable or timed out; direct archive routes generated.',
      ...fallbacks
    };
  }
}

module.exports = {
  lookupWaybackSnapshot,
  getArchiveFallbacks,
  formatWaybackTimestamp
};
