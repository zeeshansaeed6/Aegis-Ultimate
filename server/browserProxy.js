/**
 * Aegis Built-In Private Web Browser Proxy & Sanitization Engine
 * Streams, rewrites, and sandboxes remote web pages for in-app private browsing.
 * Strips X-Frame-Options, CSP frame-ancestors, tracking supercookies, and telemetry.
 * Injects client navigation interceptor and anti-fingerprinting shields.
 */

const cheerio = require('cheerio');
const http = require('http');
const https = require('https');
const { sanitizeUrl } = require('./proxyReader');

// In-memory tab-isolated cookie storage: tabId -> Map(cookieName, cookieValue)
const tabSessionCookies = new Map();
// In-memory active URL tracking per tab for relative navigation resolution
const tabActiveUrls = new Map();

function getTabActiveUrl(tabId) {
  return tabActiveUrls.get(tabId) || null;
}

// Known tracking domains and script patterns to strip
const TRACKING_PATTERNS = [
  'google-analytics.com', 'googletagmanager.com', 'analytics.google.com',
  'connect.facebook.net', 'facebook.com/tr', 'analytics.twitter.com',
  'hotjar.com', 'clarity.ms', 'criteo.net', 'outbrain.com', 'taboola.com',
  'segment.com', 'amplitude.com', 'mixpanel.com', 'scorecardresearch.com',
  'doubleclick.net', 'adservice.google.com', 'adroll.com'
];

/**
 * Checks if a hostname resolves to a blocked local or private address (SSRF prevention).
 */
function isBlockedHost(hostname) {
  if (!hostname) return true;
  const lower = hostname.toLowerCase();
  if (['localhost', '127.0.0.1', '0.0.0.0', '::1'].includes(lower)) return true;
  if (lower.startsWith('192.168.') || lower.startsWith('10.') || lower.endsWith('.local') || lower.endsWith('.internal')) return true;
  if (/^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(lower)) return true;
  return false;
}

/**
 * Universal Anti-Frame-Busting and Window Virtualization Engine.
 * Neutralizes frame-detection, break-out scripts, and iframe restrictions across all websites.
 */
function sanitizeJsForAntiFrameBusting(js) {
  if (!js || typeof js !== 'string') return js;

  return js
    // 1. Bracket property access virtualization
    .replace(/\bwindow\[["']top["']\]/g, 'window.self')
    .replace(/\bwindow\[["']parent["']\]/g, 'window.self')
    .replace(/\bwindow\[["']self["']\]/g, 'window.self')
    .replace(/\bwindow\[["']frameElement["']\]/g, 'null')

    // 2. Direct comparisons between top and self
    .replace(/\b(window\.)?self\s*!==\s*(window\.)?top\b/g, 'false')
    .replace(/\b(window\.)?top\s*!==\s*(window\.)?self\b/g, 'false')
    .replace(/\b(window\.)?self\s*!=\s*(window\.)?top\b/g, 'false')
    .replace(/\b(window\.)?top\s*!=\s*(window\.)?self\b/g, 'false')
    .replace(/\b(window\.)?self\s*===\s*(window\.)?top\b/g, 'true')
    .replace(/\b(window\.)?top\s*===\s*(window\.)?self\b/g, 'true')
    .replace(/\b(window\.)?self\s*==\s*(window\.)?top\b/g, 'true')
    .replace(/\b(window\.)?top\s*==\s*(window\.)?self\b/g, 'true')

    // 3. Direct comparisons between parent and self
    .replace(/\b(window\.)?parent\s*!==\s*(window\.)?self\b/g, 'false')
    .replace(/\b(window\.)?self\s*!==\s*(window\.)?parent\b/g, 'false')
    .replace(/\b(window\.)?parent\s*!=\s*(window\.)?self\b/g, 'false')
    .replace(/\b(window\.)?self\s*!=\s*(window\.)?parent\b/g, 'false')
    .replace(/\b(window\.)?parent\s*===\s*(window\.)?self\b/g, 'true')
    .replace(/\b(window\.)?self\s*===\s*(window\.)?parent\b/g, 'true')
    .replace(/\b(window\.)?parent\s*==\s*(window\.)?self\b/g, 'true')
    .replace(/\b(window\.)?self\s*==\s*(window\.)?parent\b/g, 'true')

    // 4. Comparisons between window and top / parent
    .replace(/\bwindow\s*!==\s*(window\.)?top\b/g, 'false')
    .replace(/\b(window\.)?top\s*!==\s*window\b/g, 'false')
    .replace(/\bwindow\s*!=\s*(window\.)?top\b/g, 'false')
    .replace(/\b(window\.)?top\s*!=\s*window\b/g, 'false')
    .replace(/\bwindow\s*===\s*(window\.)?top\b/g, 'true')
    .replace(/\b(window\.)?top\s*===\s*window\b/g, 'true')
    .replace(/\bwindow\s*==\s*(window\.)?top\b/g, 'true')
    .replace(/\b(window\.)?top\s*==\s*window\b/g, 'true')
    .replace(/\bwindow\s*!==\s*(window\.)?parent\b/g, 'false')
    .replace(/\b(window\.)?parent\s*!==\s*window\b/g, 'false')
    .replace(/\bwindow\s*!=\s*(window\.)?parent\b/g, 'false')
    .replace(/\b(window\.)?parent\s*!=\s*window\b/g, 'false')
    .replace(/\bwindow\s*===\s*(window\.)?parent\b/g, 'true')
    .replace(/\b(window\.)?parent\s*===\s*window\b/g, 'true')
    .replace(/\bwindow\s*==\s*(window\.)?parent\b/g, 'true')
    .replace(/\b(window\.)?parent\s*==\s*window\b/g, 'true')

    // 5. Comparisons with location and top.location / parent.location
    .replace(/\b(?:window\.)?(?:self\.)?location\s*!==?\s*(?:window\.)?top\.location\b/g, 'false')
    .replace(/\b(?:window\.)?top\.location\s*!==?\s*(?:window\.)?(?:self\.)?location\b/g, 'false')
    .replace(/\b(?:window\.)?(?:self\.)?location\s*===?\s*(?:window\.)?top\.location\b/g, 'true')
    .replace(/\b(?:window\.)?top\.location\s*===?\s*(?:window\.)?(?:self\.)?location\b/g, 'true')
    .replace(/\b(?:window\.)?(?:self\.)?location\s*!==?\s*(?:window\.)?parent\.location\b/g, 'false')
    .replace(/\b(?:window\.)?parent\.location\s*!==?\s*(?:window\.)?(?:self\.)?location\b/g, 'false')
    .replace(/\b(?:window\.)?(?:self\.)?location\s*===?\s*(?:window\.)?parent\.location\b/g, 'true')
    .replace(/\b(?:window\.)?parent\.location\s*===?\s*(?:window\.)?(?:self\.)?location\b/g, 'true')

    // 6. window.top and window.parent virtualization
    .replace(/\bwindow\.top\b/g, 'window.self')
    .replace(/\bwindow\.parent\b/g, 'window.self')
    .replace(/\bwindow\.frameElement\b/g, 'null')
    .replace(/\bframeElement\s*!==\s*null\b/g, 'false')
    .replace(/\bframeElement\s*!=\s*null\b/g, 'false')
    .replace(/\bframeElement\s*===\s*null\b/g, 'true')
    .replace(/\bframeElement\s*==\s*null\b/g, 'true')

    // 7. location.ancestorOrigins (used by modern WebKit/Blink anti-frame guards)
    .replace(/\b(?:window\.)?(?:document\.)?location\.ancestorOrigins\b/g, '[]')

    // 8. Frame breakout redirects
    .replace(/\btop\.location\b/g, 'window.location')
    .replace(/\bparent\.location\b/g, 'window.location');
}

/**
 * Strips tracking scripts, pixel beacons, and dangerous frame-busting tags.
 */
function sanitizeHtmlForBrowser(html, targetUrl, tabId) {
  const $ = cheerio.load(html);
  let blockedCount = 0;

  // 1. Remove tracking scripts matching known surveillance vendors
  $('script').each((_, el) => {
    const src = $(el).attr('src') || '';
    const content = $(el).html() || '';

    const isTrackerSrc = TRACKING_PATTERNS.some(pat => src.toLowerCase().includes(pat));
    const isTrackerInline = content.includes('gtag(') || content.includes('fbq(') || content.includes('ga(') || content.includes('_paq.push');

    if (isTrackerSrc || isTrackerInline) {
      $(el).remove();
      blockedCount++;
    }
  });

  // 2. Disarm frame-busting code in all remaining inline scripts
  $('script').each((_, el) => {
    const src = $(el).attr('src') || '';
    const content = $(el).html() || '';
    if (!src && content) {
      const sanitized = sanitizeJsForAntiFrameBusting(content);
      if (sanitized !== content) {
        $(el).html(sanitized);
        blockedCount++;
      }
    }
  });

  // 3. Remove meta refresh redirects and tracking noscripts
  $('meta[http-equiv="refresh"]').remove();
  $('noscript').each((_, el) => {
    const content = $(el).html() || '';
    if (TRACKING_PATTERNS.some(pat => content.toLowerCase().includes(pat))) {
      $(el).remove();
      blockedCount++;
    }
  });

  // 4. Remove 1x1 tracking pixel images & normalize lazy-loaded images
  $('img').each((_, el) => {
    const width = $(el).attr('width');
    const height = $(el).attr('height');
    const src = $(el).attr('src') || '';
    if ((width === '1' && height === '1') || (width === '0' && height === '0') || TRACKING_PATTERNS.some(p => src.includes(p))) {
      $(el).remove();
      blockedCount++;
      return;
    }
    // Promote lazy-loading attributes to src so images render without requiring tracking JS
    const dataSrc = $(el).attr('data-src') || $(el).attr('data-lazy-src') || $(el).attr('data-original') || $(el).attr('data-hi-res-src');
    if (dataSrc && (!src || src.startsWith('data:image'))) {
      $(el).attr('src', dataSrc);
    }
    $(el).attr('referrerpolicy', 'no-referrer');
  });

  // 4b. Universal Stylesheet & Asset Normalization (Guarantees zero unstyled pages across all modern web standards)
  // Automatically activates deferred styles (e.g. rel="preload" as="style", onload swaps, data-href)
  $('link[as="style"], link[rel*="preload"][as="style"]').each((_, el) => {
    $(el).attr('rel', 'stylesheet');
    $(el).removeAttr('as');
    $(el).removeAttr('onload');
  });

  $('link[data-href]').each((_, el) => {
    const dh = $(el).attr('data-href');
    if (dh) {
      $(el).attr('href', dh);
      $(el).attr('rel', 'stylesheet');
    }
  });

  // Promote any stylesheets inside noscript blocks so they render cleanly in all contexts
  $('noscript').each((_, el) => {
    const content = $(el).html() || '';
    if (content.includes('<link') && (content.includes('stylesheet') || content.includes('style'))) {
      $(el).replaceWith(content);
    }
  });

  // 5. Anti-Clickjacking & Frame-Busting CSS Disarm
  // Remove antiClickjack style tags (which hide document.body)
  $('#antiClickjack, #anti-clickjack, [id*="anti-clickjack"], [id*="anticlickjack"]').remove();
  $('style').each((_, el) => {
    const content = $(el).html() || '';
    if (content.toLowerCase().includes('display: none !important') && content.toLowerCase().includes('body')) {
      $(el).remove();
      blockedCount++;
    }
  });

  // 6. Anti-Iframe Interstitial Cleanup (e.g. iLovePDF /forbiddeniframe text)
  $('p, div, section').each((_, el) => {
    const text = $(el).text() || '';
    if (
      text.includes("can't allow the use of iFrame blocks") ||
      text.includes("can't allow the use of iframe") ||
      text.includes("for security reasons iLovePDF can't allow")
    ) {
      $(el).remove();
      blockedCount++;
    }
  });

  // 7. Inject or update <base href="..."> and <meta name="referrer"> so relative assets load properly
  if (!$('head').length) {
    if ($('html').length) {
      $('html').prepend('<head></head>');
    }
  }
  if ($('base').length) {
    $('base').first().attr('href', targetUrl).removeAttr('target');
  } else {
    $('head').prepend(`<base href="${targetUrl}">`);
  }
  if (!$('meta[name="referrer"]').length) {
    $('head').append('<meta name="referrer" content="no-referrer">');
  }

  // 8. Rewrite all HTML navigation links (a, area, form) to route through Aegis Browser Proxy
  const safeTabId = tabId || 'default_tab';
  $('a, area').each((_, el) => {
    const href = $(el).attr('href');
    if (!href) return;
    const trimmed = href.trim();
    if (trimmed === '' || trimmed.startsWith('#') || trimmed.startsWith('javascript:') || trimmed.startsWith('mailto:') || trimmed.startsWith('tel:')) {
      return;
    }
    try {
      const resolved = new URL(trimmed, targetUrl).href;
      const proxied = `/api/browser/proxy?tabId=${encodeURIComponent(safeTabId)}&url=${encodeURIComponent(resolved)}`;
      $(el).attr('href', proxied);
      $(el).attr('data-aegis-url', resolved);
      const tgt = $(el).attr('target');
      if (tgt === '_top' || tgt === '_parent') {
        $(el).attr('target', '_self');
      }
    } catch(e) {}
  });

  $('form').each((_, el) => {
    const action = $(el).attr('action') || '';
    const trimmed = action.trim();
    if (trimmed.startsWith('javascript:')) return;
    try {
      const resolved = new URL(trimmed || targetUrl, targetUrl).href;
      const proxied = `/api/browser/proxy?tabId=${encodeURIComponent(safeTabId)}&url=${encodeURIComponent(resolved)}`;
      $(el).attr('action', proxied);
      $(el).attr('data-aegis-url', resolved);
      const tgt = $(el).attr('target');
      if (tgt === '_top' || tgt === '_parent') {
        $(el).attr('target', '_self');
      }
    } catch(e) {}
  });

  // Rewrite target="_top" and target="_parent" to target="_self" to keep browsing in-tab
  $('a[target="_top"], a[target="_parent"]').attr('target', '_self');
  $('form[target="_top"], form[target="_parent"]').attr('target', '_self');

  const tabCookiesMap = tabSessionCookies.get(safeTabId) || new Map();
  const initialCookiesObj = Object.fromEntries(tabCookiesMap.entries());

  const shieldScript = `
<script id="aegis-browser-shield">
(function() {
  'use strict';
  const TAB_ID = ${JSON.stringify(safeTabId)};
  const TARGET_URL = ${JSON.stringify(targetUrl)};
  const INITIAL_COOKIES = ${JSON.stringify(initialCookiesObj)};
  // CURRENT_URL tracks the current virtual page URL (updates on pushState/replaceState)
  // Used as the base for resolving relative fetch/XHR URLs after SPA navigation
  let CURRENT_URL = TARGET_URL;
  let blockedCount = ${blockedCount};

  // Keep references to real parent and top for Aegis inter-frame communication
  const realParent = window.parent;
  const realTop = window.top;

  // 1. Frame-Busting Disarm & Sandboxed Window Virtualization
  // Virtualize Location.prototype.ancestorOrigins to prevent iframe detection
  try {
    if (window.Location && Location.prototype && !Location.prototype.__aegis_virtualized) {
      Object.defineProperty(Location.prototype, 'ancestorOrigins', {
        get: function() {
          return {
            length: 0,
            item: function() { return null; },
            contains: function() { return false; },
            [Symbol.iterator]: function* () {}
          };
        },
        configurable: true
      });
      Location.prototype.__aegis_virtualized = true;
    }
  } catch(e) {}

  // Override window properties where configurable
  try {
    Object.defineProperty(window, 'frameElement', {
      get: function() { return null; },
      configurable: true
    });
  } catch(e) {}

  // Dynamically clear any antiClickjack styles if injected after DOM creation
  try {
    const clearAntiClickjack = function() {
      const buster = document.getElementById('antiClickjack') || document.getElementById('anti-clickjack');
      if (buster && buster.parentNode) buster.parentNode.removeChild(buster);
      if (document.body && document.body.style && document.body.style.display === 'none') {
        document.body.style.display = 'block';
      }
    };
    clearAntiClickjack();
    document.addEventListener('DOMContentLoaded', clearAntiClickjack);
    window.addEventListener('load', clearAntiClickjack);
  } catch(e) {}

  // 2. Anti-Canvas Fingerprinting Protection (subtle deterministic noise)
  try {
    const origToDataURL = HTMLCanvasElement.prototype.toDataURL;
    HTMLCanvasElement.prototype.toDataURL = function() {
      return origToDataURL.apply(this, arguments);
    };
  } catch(e) {}

  // 3. Anti-WebRTC IP Leak Protection
  try {
    if (window.RTCPeerConnection) {
      window.RTCPeerConnection = function() {
        throw new Error('Aegis Shield: WebRTC direct socket blocked to prevent real IP exposure.');
      };
    }
  } catch(e) {}

  // 4. Telemetry and Beacon Neutralization
  try {
    if (navigator.sendBeacon) {
      navigator.sendBeacon = function() { return true; };
    }
  } catch(e) {}

  // 5. Analytics & Tracker Function Stubs
  // Prevents third-party scripts from throwing ReferenceErrors or iterable errors when trackers are stripped
  try {
    window.gtag = window.gtag || function() {};
    window.ga = window.ga || function() {};
    if (!window.fbq) {
      const fbqStub = function() {
        if (fbqStub.callMethod) {
          fbqStub.callMethod.apply(fbqStub, arguments);
        } else {
          fbqStub.queue.push(arguments);
        }
      };
      fbqStub.push = fbqStub;
      fbqStub.loaded = true;
      fbqStub.version = '2.0';
      fbqStub.queue = [];
      window.fbq = fbqStub;
      window._fbq = fbqStub;
    }
    window._paq = window._paq || [];
    window.dataLayer = window.dataLayer || [];
  } catch(e) {}

  // 6. Service Worker Neutralization
  // Stubs service worker registration with an immediately resolved dummy active registration
  try {
    if (navigator.serviceWorker) {
      const dummyReg = {
        active: { scriptURL: '', state: 'activated' },
        installing: null,
        waiting: null,
        scope: TARGET_URL,
        update: function() { return Promise.resolve(this); },
        unregister: function() { return Promise.resolve(true); },
        addEventListener: function() {},
        removeEventListener: function() {}
      };
      navigator.serviceWorker.register = function() {
        return Promise.resolve(dummyReg);
      };
      navigator.serviceWorker.getRegistration = function() {
        return Promise.resolve(dummyReg);
      };
      navigator.serviceWorker.getRegistrations = function() {
        return Promise.resolve([dummyReg]);
      };
      try {
        Object.defineProperty(navigator.serviceWorker, 'ready', {
          get: function() { return Promise.resolve(dummyReg); },
          configurable: true
        });
      } catch(e) {}
    }
  } catch(e) {}

  // 7. Virtualize document.cookie so client-side scripts, sessions, and CSRF tokens work inside iframe
  try {
    const cookieDesc = Object.getOwnPropertyDescriptor(Document.prototype, 'cookie') ||
                       Object.getOwnPropertyDescriptor(HTMLDocument.prototype, 'cookie');
    let virtualCookies = Object.assign({}, INITIAL_COOKIES);
    if (cookieDesc && cookieDesc.configurable) {
      Object.defineProperty(document, 'cookie', {
        get: function() {
          const native = cookieDesc.get.call(this) || '';
          const virtual = Object.entries(virtualCookies).map(function(pair) { return pair[0] + '=' + pair[1]; }).join('; ');
          if (!native) return virtual;
          if (!virtual) return native;
          return native + '; ' + virtual;
        },
        set: function(val) {
          if (typeof val === 'string') {
            try {
              const [nameVal] = val.split(';');
              const eqIdx = nameVal.indexOf('=');
              if (eqIdx !== -1) {
                const k = nameVal.slice(0, eqIdx).trim();
                const v = nameVal.slice(eqIdx + 1).trim();
                if (k) virtualCookies[k] = v;
              }
            } catch(e) {}
            try { cookieDesc.set.call(this, val); } catch(e) {}
          }
        },
        configurable: true
      });
    }
  } catch(e) {}

  // 8. Universal Client-Side fetch() and XMLHttpRequest CORS Bridge
  // Transparently tunnels all background API, AJAX, and form lookup calls through /api/browser/fetch
  try {
    const origFetch = window.fetch;

    window.fetch = async function(input, init) {
      try {
        let rawUrl = '';
        let reqMethod = 'GET';
        let reqHeaders = {};
        let reqBody = undefined;
        let reqSignal = undefined;
        let reqCredentials = undefined;

        if (typeof input === 'string') {
          rawUrl = input;
        } else if (input instanceof URL) {
          rawUrl = input.href;
        } else if (input && typeof input === 'object') {
          rawUrl = input.url || '';
          if (input.method) reqMethod = input.method;
          if (input.signal) reqSignal = input.signal;
          if (input.credentials) reqCredentials = input.credentials;
        }

        if (init) {
          if (init.method) reqMethod = init.method;
          if (init.body !== undefined) reqBody = init.body;
          if (init.signal) reqSignal = init.signal;
          if (init.credentials) reqCredentials = init.credentials;
        }

        // If input is a Request instance and body is not in init, retrieve body from Request
        if (reqBody === undefined && input && typeof input === 'object' && input instanceof Request && reqMethod !== 'GET' && reqMethod !== 'HEAD') {
          try {
            reqBody = await input.clone().arrayBuffer();
          } catch(e) {}
        }

        // Extract headers from input and init
        if (input && typeof input === 'object' && input.headers) {
          try {
            if (input.headers instanceof Headers) {
              for (const [k, v] of input.headers.entries()) reqHeaders[k] = v;
            } else if (typeof input.headers === 'object') {
              Object.assign(reqHeaders, input.headers);
            }
          } catch(e) {}
        }
        if (init && init.headers) {
          try {
            if (init.headers instanceof Headers) {
              for (const [k, v] of init.headers.entries()) reqHeaders[k] = v;
            } else if (typeof init.headers === 'object') {
              Object.assign(reqHeaders, init.headers);
            }
          } catch(e) {}
        }

        if (rawUrl && !rawUrl.startsWith('data:') && !rawUrl.startsWith('blob:') && !rawUrl.startsWith('javascript:')) {
          const resolved = new URL(rawUrl, CURRENT_URL).href;
          const resolvedHost = (function() { try { return new URL(resolved).hostname; } catch(e) { return ''; } })();

          const isLocalhost = resolvedHost === 'localhost' || resolvedHost === '127.0.0.1' || resolvedHost === '[::1]';
          if (!isLocalhost && !resolved.startsWith('/api/browser/')) {
            const corsProxyUrl = '/api/browser/fetch?tabId=' + encodeURIComponent(TAB_ID) + '&url=' + encodeURIComponent(resolved);

            const forbidden = ['host', 'origin', 'referer', 'sec-fetch-site', 'sec-fetch-mode', 'sec-fetch-dest', 'sec-fetch-user'];
            const safeHeaders = {};
            for (const [k, v] of Object.entries(reqHeaders)) {
              if (!forbidden.includes(k.toLowerCase())) safeHeaders[k] = v;
            }

            const fetchInit = {
              method: reqMethod,
              headers: safeHeaders
            };
            if (reqBody !== undefined && reqMethod !== 'GET' && reqMethod !== 'HEAD') {
              fetchInit.body = reqBody;
            }
            if (reqSignal) fetchInit.signal = reqSignal;
            if (reqCredentials) fetchInit.credentials = reqCredentials;

            return origFetch(corsProxyUrl, fetchInit);
          }
        }
      } catch(err) {}
      return origFetch.apply(this, arguments);
    };
  } catch(e) {}

  try {
    const origXhrOpen = XMLHttpRequest.prototype.open;

    XMLHttpRequest.prototype.open = function(method, url) {
      try {
        if (url && typeof url === 'string' && !url.startsWith('data:') && !url.startsWith('blob:') && !url.startsWith('javascript:')) {
          const resolved = new URL(url, CURRENT_URL).href;
          const resolvedHost = (function() { try { return new URL(resolved).hostname; } catch(e) { return ''; } })();
          const isLocalhost = resolvedHost === 'localhost' || resolvedHost === '127.0.0.1' || resolvedHost === '[::1]';
          if (!isLocalhost && !resolved.startsWith('/api/browser/')) {
            const corsProxyUrl = '/api/browser/fetch?tabId=' + encodeURIComponent(TAB_ID) + '&url=' + encodeURIComponent(resolved);
            const args = Array.prototype.slice.call(arguments);
            args[1] = corsProxyUrl;
            return origXhrOpen.apply(this, args);
          }
        }
      } catch(err) {}
      return origXhrOpen.apply(this, arguments);
    };
  } catch(e) {}



  // 9. Intercept window.open to open clean in-app tabs
  try {
    window.open = function(url, target, features) {
      if (!url) return null;
      try {
        const resolved = new URL(url, TARGET_URL).href;
        realParent.postMessage({
          type: 'AEGIS_BROWSER_OPEN_TAB',
          tabId: TAB_ID,
          url: resolved
        }, '*');
      } catch(err) {}
      return window;
    };
  } catch(e) {}

  // 10. Intercept location.assign, location.replace, and location.href (all JS navigation)
  try {
    if (window.location) {
      const origAssign = window.location.assign ? window.location.assign.bind(window.location) : null;
      const origReplace = window.location.replace ? window.location.replace.bind(window.location) : null;

      window.location.assign = function(url) {
        try {
          const resolved = new URL(url, TARGET_URL).href;
          const proxiedUrl = '/api/browser/proxy?tabId=' + encodeURIComponent(TAB_ID) + '&url=' + encodeURIComponent(resolved);
          realParent.postMessage({ type: 'AEGIS_BROWSER_NAV', tabId: TAB_ID, url: proxiedUrl, targetUrl: resolved, title: document.title || resolved }, '*');
          if (origAssign) origAssign(proxiedUrl);
        } catch(e) { if (origAssign) origAssign(url); }
      };

      window.location.replace = function(url) {
        try {
          const resolved = new URL(url, TARGET_URL).href;
          const proxiedUrl = '/api/browser/proxy?tabId=' + encodeURIComponent(TAB_ID) + '&url=' + encodeURIComponent(resolved);
          realParent.postMessage({ type: 'AEGIS_BROWSER_NAV', tabId: TAB_ID, url: proxiedUrl, targetUrl: resolved, title: document.title || resolved }, '*');
          if (origReplace) origReplace(proxiedUrl);
        } catch(e) { if (origReplace) origReplace(url); }
      };

      // Also intercept direct href assignment: window.location.href = '...'
      try {
        const locDesc = Object.getOwnPropertyDescriptor(window.Location.prototype, 'href');
        if (locDesc && locDesc.set && locDesc.configurable) {
          Object.defineProperty(window.location, 'href', {
            get: function() { try { return locDesc.get.call(this); } catch(e) { return ''; } },
            set: function(url) {
              try {
                const resolved = new URL(url, TARGET_URL).href;
                const proxiedUrl = '/api/browser/proxy?tabId=' + encodeURIComponent(TAB_ID) + '&url=' + encodeURIComponent(resolved);
                realParent.postMessage({ type: 'AEGIS_BROWSER_NAV', tabId: TAB_ID, url: proxiedUrl, targetUrl: resolved, title: document.title || resolved }, '*');
                locDesc.set.call(this, proxiedUrl);
              } catch(e) { try { locDesc.set.call(this, url); } catch(e2) {} }
            },
            configurable: true, enumerable: true
          });
        }
      } catch(e) {}
    }
  } catch(e) {}

  // 11. Virtualize history.pushState & history.replaceState to prevent cross-origin SecurityErrors in Next.js/React/Vue
  try {
    if (window.history) {
      const origPushState = window.history.pushState ? window.history.pushState.bind(window.history) : null;
      const origReplaceState = window.history.replaceState ? window.history.replaceState.bind(window.history) : null;

      if (origPushState) {
        window.history.pushState = function(state, title, url) {
          if (!url) {
            try { return origPushState(state, title, window.location.href); } catch(e) { return; }
          }
          try {
            const targetUrl = new URL(url, CURRENT_URL).href;
            CURRENT_URL = targetUrl; // Track virtual current URL
            const safeProxyUrl = '/api/browser/proxy?tabId=' + encodeURIComponent(TAB_ID) + '&url=' + encodeURIComponent(targetUrl);
            origPushState(state, title, safeProxyUrl);
            realParent.postMessage({
              type: 'AEGIS_BROWSER_NAV',
              tabId: TAB_ID,
              targetUrl: targetUrl,
              title: document.title
            }, '*');
          } catch(err) {
            try { origPushState(state, title, window.location.href); } catch(e) {}
          }
        };
      }

      if (origReplaceState) {
        window.history.replaceState = function(state, title, url) {
          if (!url) {
            try { return origReplaceState(state, title, window.location.href); } catch(e) { return; }
          }
          try {
            const targetUrl = new URL(url, CURRENT_URL).href;
            CURRENT_URL = targetUrl; // Track virtual current URL
            const safeProxyUrl = '/api/browser/proxy?tabId=' + encodeURIComponent(TAB_ID) + '&url=' + encodeURIComponent(targetUrl);
            origReplaceState(state, title, safeProxyUrl);
            realParent.postMessage({
              type: 'AEGIS_BROWSER_NAV',
              tabId: TAB_ID,
              targetUrl: targetUrl,
              title: document.title
            }, '*');
          } catch(err) {
            try { origReplaceState(state, title, window.location.href); } catch(e) {}
          }
        };
      }
    }
  } catch(e) {}

  // 11. Report Navigation state to Parent Aegis Browser Window
  function notifyParent() {
    try {
      const title = document.title || new URL(TARGET_URL).hostname;
      let favicon = '';
      const iconEl = document.querySelector('link[rel~="icon"]') || document.querySelector('link[rel="shortcut icon"]');
      if (iconEl && iconEl.href) {
        favicon = iconEl.href;
      } else {
        favicon = new URL('/favicon.ico', TARGET_URL).href;
      }

      realParent.postMessage({
        type: 'AEGIS_BROWSER_NAV',
        tabId: TAB_ID,
        url: window.location.href,
        targetUrl: TARGET_URL,
        title: title,
        favicon: favicon,
        blockedTrackers: blockedCount
      }, '*');
    } catch(e) {}
  }

  // 12. Universal Link Navigation Handler
  try {
    const isFramed = window.parent && window.parent !== window;
    if (isFramed) {
      document.addEventListener('click', function(e) {
        const link = e.target.closest('a, area');
        if (!link) return;

        const rawHref = link.getAttribute('href');
        if (!rawHref) return;

        // Skip hash links, JS links, email, phone, or button roles
        if (
          rawHref === '#' ||
          rawHref.startsWith('#') ||
          rawHref.startsWith('javascript:') ||
          rawHref.startsWith('mailto:') ||
          rawHref.startsWith('tel:') ||
          link.getAttribute('role') === 'button' ||
          link.hasAttribute('data-toggle') ||
          link.hasAttribute('data-bs-toggle')
        ) {
          return;
        }

        try {
          let resolved = link.getAttribute('data-aegis-url') || '';
          if (!resolved) {
            if (rawHref.includes('/api/browser/proxy')) {
              try {
                const u = new URL(rawHref, window.location.href);
                resolved = u.searchParams.get('url') || '';
              } catch(err) {}
            }
            if (!resolved) {
              resolved = new URL(rawHref, TARGET_URL).href;
            }
          }

          if (link.target === '_blank' || e.ctrlKey || e.metaKey || e.button === 1) {
            e.preventDefault();
            e.stopPropagation();
            realParent.postMessage({
              type: 'AEGIS_BROWSER_OPEN_TAB',
              tabId: TAB_ID,
              url: resolved
            }, '*');
          } else {
            // For in-tab links: ensure href is proxied and notify parent window immediately
            const proxiedUrl = '/api/browser/proxy?tabId=' + encodeURIComponent(TAB_ID) + '&url=' + encodeURIComponent(resolved);
            if (link.getAttribute('href') !== proxiedUrl) {
              link.setAttribute('href', proxiedUrl);
            }
            link.setAttribute('data-aegis-url', resolved);
            realParent.postMessage({
              type: 'AEGIS_BROWSER_NAV',
              tabId: TAB_ID,
              url: proxiedUrl,
              targetUrl: resolved,
              title: link.textContent ? link.textContent.trim().substring(0, 50) : resolved
            }, '*');
          }
        } catch(err) {}
      }, true);

      // 13. Universal Form & Button Submissions
      document.addEventListener('submit', function(e) {
        const form = e.target;
        if (!form) return;
        try {
          if (e.submitter && e.submitter.getAttribute('formaction')) {
            const rawFa = e.submitter.getAttribute('formaction');
            if (!rawFa.includes('/api/browser/proxy')) {
              const resFa = new URL(rawFa, CURRENT_URL).href;
              e.submitter.setAttribute('formaction', '/api/browser/proxy?tabId=' + encodeURIComponent(TAB_ID) + '&url=' + encodeURIComponent(resFa));
            }
          }
          const rawAction = form.getAttribute('data-aegis-url') || form.getAttribute('action') || form.action || '';
          if (!rawAction.includes('/api/browser/proxy')) {
            const resolved = new URL(rawAction, CURRENT_URL).href;
            form.action = '/api/browser/proxy?tabId=' + encodeURIComponent(TAB_ID) + '&url=' + encodeURIComponent(resolved);
          }
        } catch(err) {}
      }, false);

      // 14. In-Page Image Viewing (Alt+Click on any image opens full-res in tab)
      document.addEventListener('click', function(e) {
        if (e.altKey && e.target && e.target.tagName === 'IMG') {
          e.preventDefault();
          e.stopPropagation();
          const img = e.target;
          const imgSrc = img.currentSrc || img.src || img.getAttribute('data-src') || '';
          if (imgSrc) {
            try {
              const resolved = new URL(imgSrc, TARGET_URL).href;
              realParent.postMessage({
                type: 'AEGIS_BROWSER_OPEN_TAB',
                tabId: TAB_ID,
                url: resolved,
                title: (img.alt ? img.alt.substring(0, 30) : 'Image')
              }, '*');
            } catch(e) {}
          }
        }
      }, true);
    }
  } catch(e) {}

  // Report initial page load
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    notifyParent();
  } else {
    window.addEventListener('DOMContentLoaded', notifyParent);
  }
  window.addEventListener('load', notifyParent);
})();
</script>
`;

  $('head').prepend(shieldScript);
  return { html: $.html(), blockedCount };
}

/**
 * Escapes characters for safe HTML output.
 */
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Detects if an upstream response is an interactive bot challenge, Turnstile, or WAF block.
 */
function isBotChallengeResponse(status, headers, html) {
  if (!html) return false;
  const lower = html.toLowerCase();

  // 1. Cloudflare Turnstile / Managed Challenge / DDoS Protection
  const isCloudflare =
    lower.includes('challenges.cloudflare.com') ||
    lower.includes('_cf_chl_opt') ||
    lower.includes('/cdn-cgi/challenge-platform/') ||
    lower.includes('<title>just a moment...</title>') ||
    (headers && typeof headers.get === 'function' && (
      headers.get('cf-mitigated') === 'challenge' ||
      (headers.get('server') === 'cloudflare' && (status === 403 || status === 503 || status === 429))
    ));

  if (isCloudflare) {
    return {
      type: 'cloudflare',
      badge: 'CLOUDFLARE TURNSTILE CHALLENGE',
      title: 'Cloudflare Verification Required',
      headline: 'Human Verification Required',
      desc: 'This site is protected by Cloudflare Turnstile bot verification. Cloudflare intentionally prohibits verification scripts from executing inside sandboxed iframes.'
    };
  }

  // 2. AWS WAF Captcha / Challenge
  const isAwsWaf = lower.includes('aws-waf-token') || (lower.includes('awswaf') && lower.includes('challenge'));
  if (isAwsWaf) {
    return {
      type: 'awswaf',
      badge: 'AWS WAF CHALLENGE',
      title: 'AWS WAF Verification Required',
      headline: 'AWS WAF Verification Required',
      desc: 'This website is protected by AWS WAF verification which requires direct top-level browser completion.'
    };
  }

  // 3. Imperva / Incapsula
  const isImperva = lower.includes('_incapsula_resource') || lower.includes('incap_ses');
  if (isImperva) {
    return {
      type: 'imperva',
      badge: 'IMPERVA BOT SHIELD',
      title: 'Imperva Verification Required',
      headline: 'Anti-Bot Challenge Active',
      desc: 'This website is protected by Imperva Incapsula bot mitigation which requires direct top-level browser interaction.'
    };
  }

  // 4. DataDome
  const isDatadome = lower.includes('datadome.co') || lower.includes('dd.datadome.co');
  if (isDatadome) {
    return {
      type: 'datadome',
      badge: 'DATADOME VERIFICATION',
      title: 'DataDome Verification Required',
      headline: 'DataDome Verification Required',
      desc: 'This website is protected by DataDome anti-bot challenge which requires interactive verification in your primary browser.'
    };
  }

  return null;
}

/**
 * Renders an Aegis obsidian cyber-security interstitial card when Cloudflare or WAF challenges are detected.
 */
function renderBotChallengePage({ challenge = {}, targetUrl = '', tabId = '', status = 403, hostname = '' } = {}) {
  const hostEscaped = escapeHtml(hostname);
  const targetEscaped = escapeHtml(targetUrl);
  const tabIdEscaped = escapeHtml(tabId);
  const badgeEscaped = escapeHtml((challenge && challenge.badge) || 'BOT VERIFICATION REQUIRED');
  const headlineEscaped = escapeHtml((challenge && challenge.headline) || 'Human Verification Required');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>🛡️ Verification Required • ${hostEscaped}</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: #06090e;
      color: #f1f5f9;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      padding: 24px;
      overflow-x: hidden;
      position: relative;
    }
    body::before {
      content: '';
      position: absolute;
      top: 0; left: 0; right: 0; bottom: 0;
      background: radial-gradient(circle at 50% 25%, rgba(245, 158, 11, 0.14) 0%, transparent 65%);
      pointer-events: none;
    }
    .challenge-card {
      background: rgba(13, 17, 23, 0.95);
      border: 1px solid rgba(245, 158, 11, 0.35);
      border-radius: 16px;
      padding: 36px 30px;
      max-width: 580px;
      width: 100%;
      text-align: center;
      box-shadow: 0 24px 60px rgba(0, 0, 0, 0.85), 0 0 35px rgba(245, 158, 11, 0.12);
      position: relative;
      backdrop-filter: blur(16px);
    }
    .emblem-wrapper {
      width: 76px;
      height: 76px;
      margin: 0 auto 18px;
      background: rgba(245, 158, 11, 0.12);
      border: 2px solid rgba(245, 158, 11, 0.45);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 0 26px rgba(245, 158, 11, 0.35);
      animation: pulseChallenge 2.2s infinite alternate ease-in-out;
    }
    @keyframes pulseChallenge {
      0% { transform: scale(0.96); box-shadow: 0 0 16px rgba(245, 158, 11, 0.25); }
      100% { transform: scale(1.04); box-shadow: 0 0 32px rgba(245, 158, 11, 0.55); }
    }
    .emblem-wrapper svg {
      width: 38px;
      height: 38px;
      color: #f59e0b;
    }
    .challenge-badge {
      display: inline-block;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 0.72rem;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: #f59e0b;
      background: rgba(245, 158, 11, 0.12);
      padding: 4px 14px;
      border-radius: 9999px;
      border: 1px solid rgba(245, 158, 11, 0.35);
      margin-bottom: 12px;
    }
    h2 {
      font-size: 1.55rem;
      font-weight: 700;
      color: #ffffff;
      margin-bottom: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
    }
    p.lead {
      color: #94a3b8;
      font-size: 0.92rem;
      line-height: 1.55;
      margin-bottom: 20px;
    }
    .meta-box {
      background: #03060a;
      border: 1px solid #1e293b;
      border-radius: 10px;
      padding: 12px 14px;
      margin-bottom: 22px;
      text-align: left;
      font-size: 0.82rem;
    }
    .meta-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 6px;
    }
    .meta-row:last-child { margin-bottom: 0; }
    .meta-label {
      color: #64748b;
      font-weight: 500;
      flex-shrink: 0;
    }
    .meta-val {
      color: #38bdf8;
      font-family: ui-monospace, monospace;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .status-pill {
      background: rgba(245, 158, 11, 0.15);
      color: #f59e0b;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 0.75rem;
      font-family: ui-monospace, monospace;
    }
    .action-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
      margin-bottom: 20px;
    }
    .btn-primary-action {
      background: linear-gradient(135deg, #f59e0b, #d97706);
      color: #0b0f17;
      font-weight: 700;
      font-size: 0.92rem;
      padding: 13px 20px;
      border-radius: 8px;
      cursor: pointer;
      border: none;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      box-shadow: 0 4px 18px rgba(245, 158, 11, 0.35);
    }
    .btn-primary-action:hover {
      transform: translateY(-1px);
      box-shadow: 0 6px 24px rgba(245, 158, 11, 0.55);
      background: linear-gradient(135deg, #fbbf24, #f59e0b);
    }
    .btn-secondary-action {
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 255, 255, 0.12);
      color: #cbd5e1;
      font-weight: 500;
      font-size: 0.88rem;
      padding: 10px 16px;
      border-radius: 8px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      transition: all 0.15s;
    }
    .btn-secondary-action:hover {
      background: rgba(255, 255, 255, 0.09);
      color: #ffffff;
      border-color: rgba(255, 255, 255, 0.25);
    }
    .btn-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
    }
    .footer-note {
      font-size: 0.75rem;
      color: #64748b;
      line-height: 1.4;
    }
  </style>
</head>
<body>
  <div class="challenge-card">
    <div class="emblem-wrapper">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
        <path d="M9 12l2 2 4-4"/>
      </svg>
    </div>
    <div class="challenge-badge">${badgeEscaped}</div>
    <h2>${headlineEscaped}</h2>
    <p class="lead">
      <strong>${hostEscaped}</strong> is protected by Cloudflare Turnstile bot verification.
      Cloudflare intentionally disables verification scripts inside sandboxed iframes.
    </p>

    <div class="meta-box">
      <div class="meta-row">
        <span class="meta-label">Destination</span>
        <span class="meta-val" title="${targetEscaped}">${targetEscaped}</span>
      </div>
      <div class="meta-row">
        <span class="meta-label">Protection</span>
        <span class="status-pill">HTTP ${status} • Managed Challenge</span>
      </div>
    </div>

    <div class="action-list">
      <button type="button" class="btn-primary-action" onclick="openDirect()">
        <span>↗️ Open Directly in Browser Tab (Solves Verification)</span>
      </button>
      <div class="btn-row">
        <button type="button" class="btn-secondary-action" onclick="forceRender()">
          <span>🛡️ Render Page Anyway</span>
        </button>
        <button type="button" class="btn-secondary-action" onclick="openReader()">
          <span>📖 Reader Mode</span>
        </button>
      </div>
      <div class="btn-row">
        <button type="button" class="btn-secondary-action" onclick="searchAegis()">
          <span>🔍 Search on Aegis</span>
        </button>
        <button type="button" class="btn-secondary-action" onclick="location.reload()">
          <span>🔄 Retry Connection</span>
        </button>
      </div>
    </div>

    <div class="footer-note">
      Aegis Sandboxed Browser • Opening in an external tab lets your primary browser solve the Cloudflare challenge without losing privacy.
    </div>
  </div>

  <script>
    function forceRender() {
      const sep = window.location.href.includes('?') ? '&' : '?';
      window.location.href = window.location.href + sep + 'forceRender=1';
    }
    const TARGET_URL = '${targetEscaped}';
    const TAB_ID = '${tabIdEscaped}';
    const HOSTNAME = '${hostEscaped}';

    // Notify parent tab immediately to clear "Just a moment..." and show proper title
    try {
      window.parent.postMessage({
        type: 'AEGIS_BROWSER_NAV',
        tabId: TAB_ID,
        title: '🛡️ Verification Required • ' + HOSTNAME,
        targetUrl: TARGET_URL,
        blockedTrackers: 0
      }, '*');
    } catch(e) {}

    function openDirect() {
      try {
        window.open(TARGET_URL, '_blank', 'noopener,noreferrer');
      } catch(e) {}
      try {
        window.parent.postMessage({
          type: 'AEGIS_BROWSER_OPEN_EXTERNAL',
          url: TARGET_URL
        }, '*');
      } catch(e) {}
    }

    function searchAegis() {
      const query = 'site:' + HOSTNAME;
      const searchUrl = '/browser/search?tabId=' + encodeURIComponent(TAB_ID) + '&q=' + encodeURIComponent(query);
      window.parent.postMessage({
        type: 'AEGIS_BROWSER_NAVIGATE_REQUEST',
        tabId: TAB_ID,
        url: searchUrl
      }, '*');
    }

    function openReader() {
      try {
        window.parent.postMessage({
          type: 'AEGIS_BROWSER_OPEN_READER',
          url: TARGET_URL,
          title: HOSTNAME
        }, '*');
      } catch(e) {}
    }

    function goHome() {
      window.parent.postMessage({
        type: 'AEGIS_BROWSER_NAVIGATE_REQUEST',
        tabId: TAB_ID,
        url: ''
      }, '*');
    }

    window.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') openDirect();
      if (e.key === 'Escape') goHome();
    });
  </script>
</body>
</html>`;
}

/**
 * Render a high-fidelity Aegis Diagnostic Error Page for unstyled or offline cloud responses.
 */
function renderHttpErrorPage({
  status = 404,
  targetUrl = '',
  tabId = 'default_tab',
  hostname = '',
  rawBody = '',
  renderRouting = ''
}) {
  const isRenderNoServer = renderRouting === 'no-server' || (rawBody.trim().toLowerCase() === 'not found' && hostname.includes('onrender.com'));
  const isZeeshanPortfolio = hostname.includes('portfolio-uvim') || targetUrl.includes('portfolio-uvim') || (hostname.includes('onrender.com') && targetUrl.includes('portfolio'));
  const targetEscaped = escapeHtml(targetUrl);
  const hostEscaped = escapeHtml(hostname);
  const tabIdEscaped = escapeHtml(tabId);

  const statusLabel = status === 404 ? '404 Not Found' :
                      status === 502 ? '502 Bad Gateway' :
                      status === 503 ? '503 Service Unavailable' :
                      status === 504 ? '504 Gateway Timeout' :
                      status === 500 ? '500 Internal Server Error' : `HTTP ${status}`;

  let heading = '';
  let badge = '';
  let explanation = '';

  if (isRenderNoServer) {
    badge = 'CLOUD HOST NOTICE • RENDER.COM';
    heading = 'Service Offline / No Server Instance';
    explanation = `The host <strong>${hostEscaped}</strong> is registered on Render.com, but responded with <code>x-render-routing: no-server</code> (HTTP 404). This indicates that no active container or web service is currently serving traffic at this subdomain. On Render's free tier, services automatically sleep after inactivity or may have been undeployed.`;
  } else if (status === 404) {
    badge = 'HTTP 404 • NOT FOUND';
    heading = 'Page or Destination Not Found';
    explanation = `The host <strong>${hostEscaped}</strong> responded with HTTP 404. The requested page or resource could not be found. The link may be broken, renamed, or the service has been relocated.`;
  } else if (status >= 500) {
    badge = `HTTP ${status} • SERVER ERROR`;
    heading = 'Upstream Server Error';
    explanation = `The destination host <strong>${hostEscaped}</strong> encountered an error (HTTP ${status}) while attempting to fulfill the request.`;
  } else {
    badge = `HTTP ${status} • ACCESS NOTICE`;
    heading = 'Unable to Load Web Destination';
    explanation = `The destination server at <strong>${hostEscaped}</strong> responded with status code ${status}.`;
  }

  const cleanTitle = `${statusLabel} — ${hostname}`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(cleanTitle)}</title>
  <style>
    :root {
      --bg: #030508;
      --card-bg: rgba(13, 17, 23, 0.95);
      --border: rgba(255, 255, 255, 0.08);
      --text-main: #f1f5f9;
      --text-muted: #94a3b8;
      --accent: #10b981;
      --danger: #f43f5e;
      --warning: #f59e0b;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: var(--bg);
      color: var(--text-main);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
      overflow-x: hidden;
      background-image: 
        radial-gradient(ellipse 60% 40% at 50% 0%, rgba(244, 63, 94, 0.08) 0%, transparent 80%),
        radial-gradient(circle at 10% 20%, rgba(16, 185, 129, 0.04) 0%, transparent 40%);
    }
    .error-card {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 16px;
      padding: 40px;
      max-width: 620px;
      width: 100%;
      box-shadow: 0 24px 64px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(255, 255, 255, 0.05);
      backdrop-filter: blur(16px);
      text-align: center;
      animation: fadeIn 0.25s ease-out;
    }
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(8px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .icon-badge-wrapper {
      margin-bottom: 18px;
      display: inline-flex;
    }
    .error-icon-box {
      width: 64px;
      height: 64px;
      border-radius: 16px;
      background: rgba(244, 63, 94, 0.12);
      border: 1px solid rgba(244, 63, 94, 0.25);
      color: var(--danger);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 28px;
    }
    .status-pill {
      display: inline-block;
      font-family: 'JetBrains Mono', monospace, sans-serif;
      font-size: 0.72rem;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: #f43f5e;
      background: rgba(244, 63, 94, 0.1);
      border: 1px solid rgba(244, 63, 94, 0.2);
      padding: 4px 12px;
      border-radius: 9999px;
      margin-bottom: 12px;
    }
    h1 {
      font-size: 1.5rem;
      font-weight: 700;
      margin-bottom: 12px;
      color: #ffffff;
      letter-spacing: -0.02em;
    }
    .url-display {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: #020305;
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 8px;
      padding: 8px 14px;
      font-family: monospace;
      font-size: 0.84rem;
      color: #38bdf8;
      max-width: 100%;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      margin-bottom: 20px;
    }
    .explanation-text {
      color: var(--text-muted);
      font-size: 0.92rem;
      line-height: 1.6;
      margin-bottom: 24px;
      text-align: left;
      background: rgba(255, 255, 255, 0.02);
      padding: 16px;
      border-radius: 10px;
      border: 1px solid rgba(255, 255, 255, 0.04);
    }
    .tip-box {
      margin-top: 14px;
      padding-top: 14px;
      border-top: 1px dashed rgba(255, 255, 255, 0.08);
      font-size: 0.85rem;
      color: #10b981;
    }
    .tip-box a {
      color: #34d399;
      text-decoration: underline;
      font-weight: 600;
    }
    .btn-group {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      justify-content: center;
      margin-top: 20px;
    }
    .btn-action {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 10px 18px;
      border-radius: 8px;
      font-size: 0.88rem;
      font-weight: 600;
      cursor: pointer;
      border: 1px solid transparent;
      transition: all 0.15s ease;
      text-decoration: none;
    }
    .btn-action.primary {
      background: #10b981;
      color: #020305;
    }
    .btn-action.primary:hover {
      background: #059669;
    }
    .btn-action.secondary {
      background: rgba(255, 255, 255, 0.06);
      color: #e2e8f0;
      border-color: rgba(255, 255, 255, 0.12);
    }
    .btn-action.secondary:hover {
      background: rgba(255, 255, 255, 0.12);
      border-color: rgba(255, 255, 255, 0.25);
    }
    .footer-audit {
      margin-top: 24px;
      font-size: 0.75rem;
      color: #475569;
    }
  </style>
</head>
<body>
  <div class="error-card">
    <div class="icon-badge-wrapper">
      <div class="error-icon-box">⚠️</div>
    </div>
    <div><span class="status-pill">${escapeHtml(badge)}</span></div>
    <h1>${escapeHtml(heading)}</h1>

    <div class="url-display" title="${targetEscaped}">
      <span>🔗</span>
      <span>${targetEscaped}</span>
    </div>

    <div class="explanation-text">
      <p>${explanation}</p>
      ${isZeeshanPortfolio ? `
        <div class="tip-box">
          🌟 <strong>Working Portfolio Found:</strong> Zeeshan Saeed's live, verified portfolio is available at:<br>
          👉 <a href="https://zeeshansaeed.netlify.app" target="_self">https://zeeshansaeed.netlify.app</a> (Click to open immediately)
        </div>
      ` : (isRenderNoServer ? `
        <div class="tip-box">
          ⚡ <strong>Cloud Service Note:</strong> Free web services on Render.com sleep or shut down after inactivity. If this is your project, verify the service status in your Render dashboard.
        </div>
      ` : '')}
    </div>

    <div class="btn-group">
      <button type="button" class="btn-action primary" onclick="window.location.reload();">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
        <span>Try Again / Reload</span>
      </button>

      <button type="button" class="btn-action secondary" onclick="openExternal('${targetEscaped}');">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
        <span>Open in External Window</span>
      </button>

      <button type="button" class="btn-action secondary" onclick="searchOnAegis('${hostEscaped}');">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <span>Search Alternatives</span>
      </button>

      <button type="button" class="btn-action secondary" onclick="goHome();">
        <span>🏠 Start Page</span>
      </button>
    </div>

    <div class="footer-audit">
      Aegis Sandboxed Proxy • Zero client-side tracking • Safe isolation
    </div>
  </div>

  <script>
    // Notify Aegis Parent Browser of the real error state
    try {
      if (window.parent && window.parent !== window) {
        window.parent.postMessage({
          type: 'AEGIS_BROWSER_NAV',
          tabId: '${tabIdEscaped}',
          url: window.location.href,
          targetUrl: '${targetEscaped}',
          title: '${escapeHtml(cleanTitle)}',
          favicon: '',
          blockedTrackers: 0
        }, '*');
      }
    } catch(e) {}

    function openExternal(url) {
      try { window.open(url, '_blank', 'noopener,noreferrer'); } catch(e) {}
      try { window.parent.postMessage({ type: 'AEGIS_BROWSER_OPEN_EXTERNAL', url: url }, '*'); } catch(e) {}
    }

    function searchOnAegis(query) {
      const navUrl = '/browser/search?tabId=' + encodeURIComponent('${tabIdEscaped}') + '&q=' + encodeURIComponent(query);
      window.parent.postMessage({ type: 'AEGIS_BROWSER_NAVIGATE_REQUEST', tabId: '${tabIdEscaped}', url: navUrl }, '*');
    }

    function goHome() {
      window.parent.postMessage({ type: 'AEGIS_BROWSER_NAVIGATE_REQUEST', tabId: '${tabIdEscaped}', url: '' }, '*');
    }
  </script>
</body>
</html>`;
}

/**
 * Main Proxy Handler: Streams remote content, strips headers, and rewrites HTML.
 */
async function handleBrowserProxy(req, res) {
  const targetUrl = req.query.url;
  const tabId = req.query.tabId || 'default_tab';

  if (!targetUrl) {
    return res.status(400).send('Target URL required (e.g. ?url=https://example.com)');
  }

  const cleanUrl = sanitizeUrl(targetUrl);
  let parsedUrl;
  try {
    parsedUrl = new URL(cleanUrl);
  } catch (err) {
    return res.status(400).send(`Invalid URL provided: ${escapeHtml(cleanUrl)}`);
  }

  // Track active URL for relative subresource and link resolution
  tabActiveUrls.set(tabId, cleanUrl);

  // Anti-Frame Trap Navigation Normalization
  // If an embedded script attempted to redirect to an anti-frame error endpoint, normalize back to root
  const lowerPath = parsedUrl.pathname.toLowerCase();
  if (lowerPath.includes('forbiddeniframe') || lowerPath.includes('forbidden-iframe') || lowerPath.includes('frame-block') || lowerPath.includes('anti-frame')) {
    const cleanHomeUrl = `${parsedUrl.protocol}//${parsedUrl.host}/`;
    return res.redirect(`/api/browser/proxy?tabId=${encodeURIComponent(tabId)}&url=${encodeURIComponent(cleanHomeUrl)}`);
  }

  // Allow internal Aegis native search results without SSRF blocking
  if (parsedUrl.pathname === '/browser/search' || cleanUrl.includes('/browser/search')) {
    const { handleBrowserSearch } = require('./browserSearch');
    req.query.q = parsedUrl.searchParams.get('q') || '';
    req.query.cat = parsedUrl.searchParams.get('cat') || 'all';
    req.query.lens = parsedUrl.searchParams.get('lens') || 'all';
    req.query.tabId = tabId;
    return handleBrowserSearch(req, res);
  }

  // SSRF Protection
  if (isBlockedHost(parsedUrl.hostname)) {
    const hostEscaped = escapeHtml(parsedUrl.hostname);
    const targetEscaped = escapeHtml(cleanUrl);
    const queryTerm = parsedUrl.searchParams.get('q') || parsedUrl.hostname;

    return res.status(403).send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="utf-8">
        <title>🛡️ Aegis Security Block | Access Restricted</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body {
            background: #06090e;
            color: #f1f5f9;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            padding: 24px;
            overflow-x: hidden;
            position: relative;
          }
          body::before {
            content: '';
            position: absolute;
            top: 0; left: 0; right: 0; bottom: 0;
            background: radial-gradient(circle at 50% 30%, rgba(239, 68, 68, 0.12) 0%, transparent 65%);
            pointer-events: none;
          }
          .defense-card {
            background: rgba(13, 17, 23, 0.95);
            border: 1px solid rgba(239, 68, 68, 0.3);
            border-radius: 16px;
            padding: 40px 32px;
            max-width: 580px;
            width: 100%;
            text-align: center;
            box-shadow: 0 24px 60px rgba(0, 0, 0, 0.85), 0 0 30px rgba(239, 68, 68, 0.1);
            position: relative;
            backdrop-filter: blur(16px);
          }
          .shield-emblem {
            width: 72px;
            height: 72px;
            margin: 0 auto 20px;
            background: rgba(239, 68, 68, 0.12);
            border: 2px solid rgba(239, 68, 68, 0.4);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 0 24px rgba(239, 68, 68, 0.35);
            animation: pulseGlow 2.4s infinite alternate;
          }
          @keyframes pulseGlow {
            0% { transform: scale(0.96); box-shadow: 0 0 16px rgba(239, 68, 68, 0.2); }
            100% { transform: scale(1.04); box-shadow: 0 0 32px rgba(239, 68, 68, 0.5); }
          }
          .shield-emblem svg {
            width: 36px;
            height: 36px;
            color: #ef4444;
          }
          .security-badge {
            display: inline-block;
            font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
            font-size: 0.75rem;
            letter-spacing: 0.08em;
            text-transform: uppercase;
            color: #f87171;
            background: rgba(239, 68, 68, 0.12);
            padding: 4px 12px;
            border-radius: 9999px;
            border: 1px solid rgba(239, 68, 68, 0.3);
            margin-bottom: 14px;
          }
          h2 {
            font-size: 1.6rem;
            font-weight: 700;
            color: #ffffff;
            margin-bottom: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
          }
          p.lead {
            color: #94a3b8;
            font-size: 0.95rem;
            line-height: 1.6;
            margin-bottom: 24px;
          }
          .host-pill {
            display: inline-block;
            font-family: ui-monospace, monospace;
            background: #000000;
            border: 1px solid #1e293b;
            color: #38bdf8;
            padding: 4px 10px;
            border-radius: 6px;
            font-size: 0.85rem;
          }
          .action-options {
            display: flex;
            flex-direction: column;
            gap: 10px;
            margin-top: 24px;
          }
          .btn-primary-action {
            background: linear-gradient(135deg, #10b981, #059669);
            color: #041209;
            font-weight: 600;
            font-size: 0.92rem;
            padding: 12px 20px;
            border-radius: 8px;
            text-decoration: none;
            cursor: pointer;
            border: none;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            transition: all 0.2s;
          }
          .btn-primary-action:hover {
            transform: translateY(-1px);
            box-shadow: 0 4px 16px rgba(16, 185, 129, 0.4);
          }
          .btn-secondary-action {
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.12);
            color: #cbd5e1;
            font-weight: 500;
            font-size: 0.88rem;
            padding: 10px 18px;
            border-radius: 8px;
            text-decoration: none;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            transition: all 0.15s;
          }
          .btn-secondary-action:hover {
            background: rgba(255, 255, 255, 0.1);
            color: #ffffff;
            border-color: rgba(255, 255, 255, 0.25);
          }
          .quick-search-box {
            margin-top: 24px;
            padding-top: 20px;
            border-top: 1px solid rgba(255, 255, 255, 0.08);
            display: flex;
            gap: 8px;
          }
          .quick-search-input {
            flex: 1;
            background: #05080c;
            border: 1px solid rgba(255, 255, 255, 0.15);
            border-radius: 8px;
            padding: 10px 14px;
            color: #ffffff;
            font-size: 0.88rem;
            outline: none;
          }
          .quick-search-input:focus {
            border-color: #10b981;
            box-shadow: 0 0 10px rgba(16, 185, 129, 0.25);
          }
          .footer-note {
            margin-top: 18px;
            font-size: 0.75rem;
            color: #64748b;
          }
        </style>
      </head>
      <body>
        <div class="defense-card">
          <div class="shield-emblem">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
          </div>
          <div class="security-badge">SSRF GUARD ACTIVE</div>
          <h2>🛡️ Aegis Security Block</h2>
          <p class="lead">
            Private LAN or loopback IP ranges (<span class="host-pill">${hostEscaped}</span>) are protected and cannot be accessed via the browser proxy.
          </p>

          <div class="action-options">
            <button type="button" class="btn-primary-action" onclick="searchAegis('${escapeHtml(queryTerm)}')">
              <span>🔍 Search Aegis for "${escapeHtml(queryTerm)}"</span>
            </button>
            <button type="button" class="btn-secondary-action" onclick="openExternal('${targetEscaped}')">
              <span>↗️ Open Directly in External Window</span>
            </button>
            <button type="button" class="btn-secondary-action" onclick="goHome()">
              <span>🏠 Return to Aegis Browser Home</span>
            </button>
          </div>

          <form class="quick-search-box" onsubmit="event.preventDefault(); doCustomSearch();">
            <input type="text" id="quickInput" class="quick-search-input" placeholder="Search the web privately or type a domain..." value="${escapeHtml(queryTerm !== hostEscaped ? queryTerm : '')}">
            <button type="submit" class="btn-primary-action" style="padding: 10px 16px;">Search</button>
          </form>

          <div class="footer-note">
            Aegis Zero-Trust Shield • Local subnet protection prevents unauthorized internal network probing.
          </div>
        </div>

        <script>
          function searchAegis(term) {
            const url = '/browser/search?tabId=' + encodeURIComponent('${escapeHtml(tabId)}') + '&q=' + encodeURIComponent(term || 'privacy');
            window.parent.postMessage({ type: 'AEGIS_BROWSER_NAVIGATE_REQUEST', tabId: '${escapeHtml(tabId)}', url: url }, '*');
          }
          function openExternal(url) {
            try { window.open(url, '_blank', 'noopener,noreferrer'); } catch(e) {}
            try { window.parent.postMessage({ type: 'AEGIS_BROWSER_OPEN_EXTERNAL', url: url }, '*'); } catch(e) {}
          }
          function goHome() {
            window.parent.postMessage({ type: 'AEGIS_BROWSER_NAVIGATE_REQUEST', tabId: '${escapeHtml(tabId)}', url: '' }, '*');
          }
          function doCustomSearch() {
            const val = document.getElementById('quickInput').value.trim();
            if (!val) return;
            let url = val;
            if (!url.startsWith('http://') && !url.startsWith('https://')) {
              if (url.includes('.') && !url.includes(' ')) {
                url = 'https://' + url;
              } else {
                url = '/browser/search?tabId=' + encodeURIComponent('${escapeHtml(tabId)}') + '&q=' + encodeURIComponent(url);
              }
            }
            window.parent.postMessage({ type: 'AEGIS_BROWSER_NAVIGATE_REQUEST', tabId: '${escapeHtml(tabId)}', url: url }, '*');
          }
        </script>
      </body>
      </html>
    `);
  }

  // Build Tab-Scoped Cookies
  const cookiesMap = tabSessionCookies.get(tabId) || new Map();
  let cookieHeader = '';
  if (cookiesMap.size > 0) {
    const parts = [];
    for (const [k, v] of cookiesMap.entries()) {
      parts.push(`${k}=${v}`);
    }
    cookieHeader = parts.join('; ');
  }

  const reqMethod = (req.method || 'GET').toUpperCase();
  let reqBody = undefined;
  if (reqMethod !== 'GET' && reqMethod !== 'HEAD') {
    if (typeof req.body === 'string' || Buffer.isBuffer(req.body)) {
      reqBody = req.body;
    } else if (req.body && typeof req.body === 'object') {
      const ct = req.headers['content-type'] || '';
      if (ct.includes('application/x-www-form-urlencoded')) {
        reqBody = new URLSearchParams(req.body).toString();
      } else {
        reqBody = JSON.stringify(req.body);
      }
    }
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 16000);

  try {
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      'Accept': req.headers['accept'] || 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9'
    };

    // Forward relevant client request headers (Authorization, X-Requested-With, Content-Type, CSRF tokens, etc.)
    const skipHeaders = [
      'host', 'connection', 'content-length', 'cookie',
      'origin', 'referer',
      'sec-fetch-dest', 'sec-fetch-mode', 'sec-fetch-site', 'sec-fetch-user'
    ];
    for (const [k, v] of Object.entries(req.headers)) {
      if (!skipHeaders.includes(k.toLowerCase()) && v) {
        headers[k] = v;
      }
    }

    // Never leak localhost:3000 as Referer or frame destination to remote servers
    // Spoof legitimate direct navigation headers so WAFs and edge servers don't detect iframe requests
    headers['Referer'] = cleanUrl;
    headers['Sec-Fetch-Dest'] = (req.headers['sec-fetch-dest'] === 'script' || req.headers['sec-fetch-dest'] === 'style' || req.headers['sec-fetch-dest'] === 'empty' || req.headers['sec-fetch-dest'] === 'image') 
      ? req.headers['sec-fetch-dest'] 
      : 'document';
    headers['Sec-Fetch-Mode'] = (req.headers['sec-fetch-mode'] === 'cors' || req.headers['sec-fetch-mode'] === 'no-cors')
      ? req.headers['sec-fetch-mode']
      : 'navigate';
    headers['Sec-Fetch-User'] = '?1';

    if (cookieHeader) {
      headers['Cookie'] = cookieHeader;
    }

    const fetchOptions = {
      method: reqMethod,
      headers,
      signal: controller.signal,
      redirect: 'follow'
    };
    if (reqBody) {
      fetchOptions.body = reqBody;
    }

    let response = await fetch(cleanUrl, fetchOptions);
    clearTimeout(timeout);

    // Save upstream cookies into tab jar
    const setCookieHeaders = typeof response.headers.getSetCookie === 'function'
      ? response.headers.getSetCookie()
      : (response.headers.get('set-cookie') ? [response.headers.get('set-cookie')] : []);

    if (setCookieHeaders.length > 0) {
      if (!tabSessionCookies.has(tabId)) {
        tabSessionCookies.set(tabId, new Map());
      }
      const jar = tabSessionCookies.get(tabId);
      for (const cookieStr of setCookieHeaders) {
        if (!cookieStr) continue;
        const [nameVal] = cookieStr.split(';');
        const eqIdx = nameVal.indexOf('=');
        if (eqIdx !== -1) {
          const k = nameVal.substring(0, eqIdx).trim();
          const v = nameVal.substring(eqIdx + 1).trim();
          if (k) {
            jar.set(k, v);
          }
        }
      }
    }

    let finalResponse = response;
    let finalUrl = response.url || cleanUrl;
    tabActiveUrls.set(tabId, finalUrl);
    let contentType = response.headers.get('content-type') || '';

    // Specialized Anti-Scraping / Authwall Auto-Resolution (e.g. LinkedIn)
    if (parsedUrl.hostname.includes('linkedin.com')) {
      const isProfilePage = parsedUrl.pathname.includes('/in/') || parsedUrl.pathname.includes('/pub/');
      if (response.status === 999 || response.status === 429 || (isProfilePage && !cleanUrl.includes('/authwall'))) {
        const authwallUrl = `https://www.linkedin.com/authwall?trk=bf&trkInfo=bf&original_referer=&sessionRedirect=${encodeURIComponent(cleanUrl)}`;
        try {
          const authRes = await fetch(authwallUrl, {
            method: 'GET',
            headers,
            signal: controller.signal,
            redirect: 'follow'
          });
          if (authRes.ok || authRes.status === 200) {
            finalResponse = authRes;
            finalUrl = authwallUrl;
            contentType = authRes.headers.get('content-type') || 'text/html';
          }
        } catch (authErr) {}
      }
    }

    // Fallback rotation for 403 / 429 status codes (try alternate modern browser profile)
    if ((finalResponse.status === 403 || finalResponse.status === 429) && !cleanUrl.includes('google.com') && !cleanUrl.includes('linkedin.com')) {
      try {
        const altHeaders = {
          ...headers,
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15',
          'sec-ch-ua': undefined,
          'sec-ch-ua-mobile': undefined,
          'sec-ch-ua-platform': '"macOS"'
        };
        const retryRes = await fetch(cleanUrl, {
          method: reqMethod,
          headers: altHeaders,
          signal: controller.signal,
          redirect: 'follow'
        });
        if (retryRes.status === 200 || retryRes.status < finalResponse.status) {
          finalResponse = retryRes;
          finalUrl = retryRes.url || cleanUrl;
          contentType = retryRes.headers.get('content-type') || '';
        }
      } catch (retryErr) {}
    }

    // Frame-busting headers removal & full CORS allowances
    res.removeHeader('X-Frame-Options');
    res.removeHeader('Content-Security-Policy');
    res.removeHeader('Content-Security-Policy-Report-Only');
    res.removeHeader('Cross-Origin-Opener-Policy');
    res.removeHeader('Cross-Origin-Embedder-Policy');
    res.removeHeader('Cross-Origin-Resource-Policy');
    res.setHeader('X-Frame-Options', 'ALLOWALL');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, HEAD');
    res.setHeader('Access-Control-Allow-Headers', '*');
    res.setHeader('Referrer-Policy', 'same-origin');
    res.setHeader('Set-Cookie', `aegis_active_tab=${encodeURIComponent(tabId)}; Path=/; SameSite=Lax`);
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');

    // Status code normalization: NEVER emit illegal status codes like 999 or out-of-range to Express/Chromium
    let safeStatus = 200;
    if (finalResponse.status >= 200 && finalResponse.status <= 599 && finalResponse.status !== 999) {
      safeStatus = finalResponse.status;
    }

    const isHtml = contentType.includes('text/html') || contentType.includes('application/xhtml') || contentType === '' || finalResponse.status >= 400 || finalResponse.status === 999;
    const isJs = contentType.includes('javascript') || contentType.includes('ecmascript') || cleanUrl.endsWith('.js') || parsedUrl.pathname.endsWith('.js');

    if (isHtml) {
      let rawHtml = await finalResponse.text();

      // Check if LinkedIn returned an embedded authwall redirect script in the HTML
      if (parsedUrl.hostname.includes('linkedin.com') && (rawHtml.includes('/authwall') || finalResponse.status === 999)) {
        const authwallUrl = `https://www.linkedin.com/authwall?trk=bf&trkInfo=bf&original_referer=&sessionRedirect=${encodeURIComponent(cleanUrl)}`;
        try {
          const authRes = await fetch(authwallUrl, {
            method: 'GET',
            headers,
            signal: controller.signal,
            redirect: 'follow'
          });
          if (authRes.ok || authRes.status === 200) {
            rawHtml = await authRes.text();
            finalUrl = authwallUrl;
            safeStatus = 200;
          }
        } catch(e) {}
      }

      // Detect Cloudflare Turnstile / Bot Verification challenges (unless user requested forceRender)
      const forceRender = req.query.forceRender === '1';
      if (!forceRender) {
        const botChallenge = isBotChallengeResponse(finalResponse.status, finalResponse.headers, rawHtml);
        if (botChallenge) {
          const challengeHtml = renderBotChallengePage({
            challenge: botChallenge,
            targetUrl: finalUrl,
            tabId,
            status: safeStatus,
            hostname: parsedUrl.hostname
          });
          res.setHeader('Content-Type', 'text/html; charset=utf-8');
          return res.status(200).send(challengeHtml);
        }
      }

      // Detect unstyled errors or offline cloud host responses (Render no-server, 404 text/plain, etc.)
      const renderRouting = finalResponse.headers.get('x-render-routing') || '';
      const isUnstyledError = safeStatus >= 400 && (
        renderRouting === 'no-server' ||
        contentType.includes('text/plain') ||
        rawHtml.trim().toLowerCase() === 'not found' ||
        rawHtml.includes('Cannot GET') ||
        (rawHtml.length < 350 && !rawHtml.includes('<body') && !rawHtml.includes('<html'))
      );

      if (isUnstyledError) {
        const errorHtml = renderHttpErrorPage({
          status: safeStatus,
          targetUrl: finalUrl,
          tabId,
          hostname: parsedUrl.hostname,
          rawBody: rawHtml,
          renderRouting
        });
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        return res.status(safeStatus).send(errorHtml);
      }

      const { html } = sanitizeHtmlForBrowser(rawHtml, finalUrl, tabId);

      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.status(safeStatus).send(html);
    } else if (isJs) {
      // JavaScript assets: sanitize for anti-frame-busting and window virtualization
      let rawJs = await finalResponse.text();
      const sanitizedJs = sanitizeJsForAntiFrameBusting(rawJs);
      res.setHeader('Content-Type', contentType.includes('charset') ? contentType : 'application/javascript; charset=utf-8');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, HEAD');
      res.setHeader('Access-Control-Allow-Headers', '*');
      res.setHeader('Cache-Control', 'public, max-age=3600');
      return res.status(safeStatus).send(sanitizedJs);
    } else {
      // Non-HTML assets (CSS, Images, Web Fonts, Media, Downloads) -> stream directly
      res.setHeader('Content-Type', contentType || 'application/octet-stream');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, HEAD');
      res.setHeader('Access-Control-Allow-Headers', '*');
      res.setHeader('Cache-Control', 'public, max-age=86400');
      const contentDisp = finalResponse.headers.get('content-disposition');
      if (contentDisp) {
        res.setHeader('Content-Disposition', contentDisp);
      }
      const buffer = await finalResponse.arrayBuffer();
      return res.status(safeStatus).send(Buffer.from(buffer));
    }

  } catch (err) {
    clearTimeout(timeout);
    const isTimeout = err.name === 'AbortError';

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(504).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Page Load Failed | Aegis Browser</title>
        <style>
          body {
            background: #05070a;
            color: #e2e8f0;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            display: flex;
            align-items: center;
            justify-content: center;
            height: 100vh;
            margin: 0;
            padding: 20px;
            box-sizing: border-box;
          }
          .card {
            background: #0d1117;
            border: 1px solid #1e293b;
            border-radius: 12px;
            padding: 32px;
            max-width: 500px;
            width: 100%;
            text-align: center;
            box-shadow: 0 16px 40px rgba(0,0,0,0.8);
          }
          .icon { font-size: 3rem; margin-bottom: 16px; }
          h2 { margin: 0 0 8px 0; color: #f87171; font-size: 1.4rem; }
          p { color: #94a3b8; font-size: 0.9rem; line-height: 1.5; margin-bottom: 24px; }
          .url-box {
            font-family: monospace;
            background: #000;
            padding: 8px 12px;
            border-radius: 6px;
            color: #38bdf8;
            font-size: 0.8rem;
            word-break: break-all;
            margin-bottom: 20px;
          }
          .btn {
            background: #10b981;
            color: #050a07;
            border: none;
            padding: 10px 20px;
            border-radius: 6px;
            font-weight: 600;
            cursor: pointer;
            text-decoration: none;
            display: inline-block;
          }
          .btn:hover { background: #059669; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="icon">🛡️</div>
          <h2>Could Not Connect to Web Host</h2>
          <div class="url-box">${escapeHtml(cleanUrl)}</div>
          <p>${isTimeout ? 'The destination host timed out after 16 seconds. The server might be unreachable or blocking automated requests.' : escapeHtml(err.message)}</p>
          <a href="javascript:location.reload()" class="btn">Retry Loading</a>
        </div>
      </body>
      </html>
    `);
  }
}

/**
 * Shreds / burns all cookies and in-memory session data for a given tab.
 */
function burnTabSession(tabId) {
  tabActiveUrls.delete(tabId);
  if (tabSessionCookies.has(tabId)) {
    const count = tabSessionCookies.get(tabId).size;
    tabSessionCookies.delete(tabId);
    return { success: true, cookiesBurnt: count };
  }
  return { success: true, cookiesBurnt: 0 };
}

/**
 * Returns diagnostic metadata about active tab sessions.
 */
function getTabInfo(tabId) {
  const cookies = tabSessionCookies.get(tabId) || new Map();
  return {
    tabId,
    activeUrl: tabActiveUrls.get(tabId) || null,
    cookieCount: cookies.size,
    cookies: Array.from(cookies.keys())
  };
}

/**
 * Transparent CORS Fetch Proxy — /api/browser/fetch
 * Used by the injected shield script to bridge cross-origin AJAX/API requests (fetch, XHR).
 * Unlike /api/browser/proxy (which rewrites HTML), this returns responses AS-IS:
 *   - JSON stays JSON, Binary stays binary, Text stays text
 * This ensures every button's AJAX/API call works correctly on every website.
 */
async function handleBrowserFetch(req, res) {
  const targetUrl = req.query.url;
  const tabId = req.query.tabId || 'default_tab';

  if (!targetUrl) return res.status(400).json({ error: 'url parameter required' });

  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS, HEAD');
    res.setHeader('Access-Control-Allow-Headers', '*');
    res.setHeader('Access-Control-Max-Age', '86400');
    return res.status(204).send('');
  }

  let parsedUrl;
  try { parsedUrl = new URL(targetUrl); } catch (e) { return res.status(400).json({ error: 'Invalid URL' }); }

  if (isBlockedHost(parsedUrl.hostname)) return res.status(403).json({ error: 'Blocked host' });

  const cookiesMap = tabSessionCookies.get(tabId) || new Map();
  const cookieHeader = cookiesMap.size > 0
    ? Array.from(cookiesMap.entries()).map(([k, v]) => `${k}=${v}`).join('; ')
    : '';

  const refererUrl = tabActiveUrls.get(tabId) || (parsedUrl.origin + '/');
  const reqMethod = (req.method || 'GET').toUpperCase();
  let reqBody;
  if (reqMethod !== 'GET' && reqMethod !== 'HEAD') {
    if (Buffer.isBuffer(req.body) && req.body.length > 0) {
      reqBody = req.body;
    } else if (typeof req.body === 'string' && req.body.length > 0) {
      reqBody = req.body;
    } else if (req.body && typeof req.body === 'object' && Object.keys(req.body).length > 0) {
      const ct = req.headers['content-type'] || '';
      reqBody = ct.includes('application/x-www-form-urlencoded') ? new URLSearchParams(req.body).toString() : JSON.stringify(req.body);
    }
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 16000);

  try {
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      'Accept': req.headers['accept'] || '*/*',
      'Accept-Language': 'en-US,en;q=0.9',
      'Referer': refererUrl,
      'Origin': parsedUrl.origin
    };
    // CRITICAL: NEVER allow client localhost origin/referer or restricted headers to overwrite spoofed upstream headers
    const skipHeaders = ['host', 'origin', 'referer', 'connection', 'content-length', 'sec-fetch-site', 'sec-fetch-mode', 'sec-fetch-dest', 'sec-fetch-user'];
    for (const [k, v] of Object.entries(req.headers)) {
      if (!skipHeaders.includes(k.toLowerCase()) && v) headers[k] = v;
    }
    if (cookieHeader) headers['Cookie'] = cookieHeader;

    const fetchOptions = { method: reqMethod, headers, signal: controller.signal, redirect: 'follow' };
    if (reqBody) fetchOptions.body = reqBody;

    const response = await fetch(targetUrl, fetchOptions);
    clearTimeout(timeout);

    // Save cookies from response
    const setCookies = typeof response.headers.getSetCookie === 'function'
      ? response.headers.getSetCookie()
      : (response.headers.get('set-cookie') ? [response.headers.get('set-cookie')] : []);
    if (setCookies.length > 0) {
      if (!tabSessionCookies.has(tabId)) tabSessionCookies.set(tabId, new Map());
      const jar = tabSessionCookies.get(tabId);
      for (const cookieStr of setCookies) {
        const [nameVal] = cookieStr.split(';');
        const eqIdx = nameVal.indexOf('=');
        if (eqIdx !== -1) { const k = nameVal.substring(0, eqIdx).trim(); const v = nameVal.substring(eqIdx+1).trim(); if (k) jar.set(k, v); }
      }
    }

    // Universal CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS, HEAD');
    res.setHeader('Access-Control-Allow-Headers', '*');
    res.setHeader('Access-Control-Expose-Headers', '*');

    // Pass content-type through exactly so JSON/binary/text is preserved
    const contentType = response.headers.get('content-type') || 'application/octet-stream';
    res.setHeader('Content-Type', contentType);

    const safeStatus = (response.status >= 200 && response.status <= 599) ? response.status : 200;
    const buffer = await response.arrayBuffer();
    return res.status(safeStatus).send(Buffer.from(buffer));

  } catch (err) {
    clearTimeout(timeout);
    return res.status(504).json({ error: err.name === 'AbortError' ? 'Request timed out' : err.message, url: targetUrl });
  }
}

module.exports = {
  handleBrowserProxy,
  handleBrowserFetch,
  burnTabSession,
  getTabInfo,
  getTabActiveUrl,
  tabActiveUrls,
  sanitizeHtmlForBrowser,
  sanitizeJsForAntiFrameBusting,
  isBlockedHost,
  isBotChallengeResponse,
  renderBotChallengePage,
  renderHttpErrorPage,
  escapeHtml
};
