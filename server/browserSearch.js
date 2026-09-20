/**
 * Aegis Native In-Browser Search Results Engine
 * Self-hosted, tracker-free, aggregated search results page designed specifically
 * for in-browser sandboxed private exploration.
 */

const { aggregateSearch } = require('./metaSearch');
const { resolveInstantAnswer } = require('./instantAnswers');
const { nativeEngine } = require('./nativeEngine');
const { vaultEngine } = require('./localIndex');
const { spamFilter } = require('./spamFilter');
const { searchImages, searchVideos } = require('./mediaSearch');
const { searchAhmiaOnion } = require('./torProxy');

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Handles GET /browser/search?q=<query>&cat=<category>&tabId=<tabId>&lens=<lens>
 */
async function handleBrowserSearch(req, res) {
  const query = (req.query.q || '').trim();
  const category = (req.query.cat || 'all').toLowerCase();
  const lens = (req.query.lens || 'all').toLowerCase();
  const tabId = req.query.tabId || 'browser_tab';
  const startTime = Date.now();

  if (!query) {
    return res.redirect('/#browser');
  }

  // 1. Instant Answer
  const instantAnswer = resolveInstantAnswer(query);

  let results = [];
  let errorMsg = null;

  try {
    if (category === 'images') {
      results = await searchImages(query);
    } else if (category === 'videos') {
      results = await searchVideos(query);
    } else if (category === 'onion') {
      results = await searchAhmiaOnion(query);
    } else if (category === 'vault' || category === 'local') {
      results = vaultEngine.search(query, 20);
    } else if (category === 'own' || category === 'native') {
      results = nativeEngine.search(query, 25);
    } else {
      // General web search
      const webResults = await aggregateSearch(query, category, { lens });
      const { filtered } = spamFilter.filterResults(webResults, []);

      // Also weave in top native crawled and vault results
      const topNative = nativeEngine.search(query, 2);
      const topLocal = vaultEngine.search(query, 1);
      const additions = [];
      if (topNative.length > 0 && topNative[0].score > 0.5) additions.push(...topNative);
      if (topLocal.length > 0 && topLocal[0].score > 1.0) additions.push(...topLocal);

      results = [...additions, ...filtered];
    }
  } catch (err) {
    errorMsg = err.message || 'Error aggregating search results';
  }

  const durationSec = ((Date.now() - startTime) / 1000).toFixed(2);
  const totalCount = results.length;

  // Build Instant Answer HTML Card
  let instantCardHtml = '';
  if (instantAnswer) {
    let cardBody = '';
    if (instantAnswer.type === 'calc') {
      cardBody = `
        <div class="ia-calc-val">${escapeHtml(instantAnswer.result)}</div>
        <div class="ia-calc-expr">${escapeHtml(instantAnswer.expression)}</div>
      `;
    } else if (instantAnswer.type === 'cheat_sheet') {
      cardBody = `
        <div class="ia-title">${escapeHtml(instantAnswer.title)}</div>
        <pre class="ia-code"><code>${escapeHtml(instantAnswer.code)}</code></pre>
        <p class="ia-desc">${escapeHtml(instantAnswer.description)}</p>
      `;
    } else if (instantAnswer.type === 'unit_conversion') {
      cardBody = `
        <div class="ia-calc-val">${escapeHtml(instantAnswer.toValue)} ${escapeHtml(instantAnswer.toUnit)}</div>
        <div class="ia-calc-expr">${escapeHtml(instantAnswer.fromValue)} ${escapeHtml(instantAnswer.fromUnit)}</div>
      `;
    } else if (instantAnswer.type === 'tool_result') {
      cardBody = `
        <div class="ia-title">${escapeHtml(instantAnswer.title)}</div>
        <pre class="ia-code"><code>${escapeHtml(instantAnswer.value)}</code></pre>
        <p class="ia-desc">${escapeHtml(instantAnswer.subtitle || '')}</p>
      `;
    } else {
      cardBody = `
        <div class="ia-title">${escapeHtml(instantAnswer.title || '')}</div>
        <p class="ia-desc">${escapeHtml(instantAnswer.description || '')}</p>
      `;
    }

    instantCardHtml = `
      <div class="instant-answer-card">
        <div class="ia-header">
          <span class="ia-badge">⚡ ${escapeHtml(instantAnswer.badge || 'Instant Answer')}</span>
        </div>
        ${cardBody}
      </div>
    `;
  }

  // Build Results Feed HTML
  let resultsListHtml = '';

  if (category === 'images') {
    const fallbackSvg = `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%2364748b'><rect width='24' height='24' rx='4' fill='%231e293b'/><circle cx='8.5' cy='8.5' r='1.5'/><polyline points='21 15 16 10 5 21'/></svg>`;
    resultsListHtml = `
      <div class="images-grid" id="imagesGrid">
        ${results.map((img, idx) => {
          const proxyImgUrl = img.proxiedUrl || `/api/proxy/image?url=${encodeURIComponent(img.sourceUrl || '')}`;
          const proxyTargetUrl = `/api/browser/proxy?tabId=${encodeURIComponent(tabId)}&url=${encodeURIComponent(img.sourceUrl || '')}`;
          const dim = `${img.width || 800} × ${img.height || 600}`;
          return `
            <div class="image-card" data-idx="${idx}" data-img-url="${escapeHtml(proxyImgUrl)}" data-source-url="${escapeHtml(proxyTargetUrl)}" data-title="${escapeHtml(img.title)}" data-domain="${escapeHtml(img.domain || 'image source')}" data-dim="${dim}" title="${escapeHtml(img.title)}">
              <img src="${proxyImgUrl}" alt="${escapeHtml(img.title)}" loading="lazy" referrerpolicy="no-referrer" onerror="this.src='${fallbackSvg}'">
              <div class="image-card-footer">
                <span class="img-meta">${escapeHtml(img.domain || 'image')}</span>
                <span class="img-dim">${dim}</span>
              </div>
            </div>
          `;
        }).join('')}
      </div>

      <!-- Google Images-Style Side Drawer / Theater Lightbox -->
      <div class="google-img-theater" id="googleImgTheater" style="display: none;">
        <div class="theater-content">
          <div class="theater-top">
            <div class="theater-info">
              <span class="theater-domain" id="theaterDomain">domain.com</span>
              <h3 class="theater-title" id="theaterTitle">Image Title</h3>
              <span class="theater-dim" id="theaterDim">1920 × 1080 px</span>
            </div>
            <div class="theater-controls">
              <button type="button" class="theater-btn" id="btnTheaterClose" title="Close Preview (Esc)">✕</button>
            </div>
          </div>
          <div class="theater-view-stage">
            <button type="button" class="theater-nav-arrow theater-prev" id="btnTheaterPrev" title="Previous Image (Left Arrow)">❮</button>
            <div class="theater-img-wrap">
              <img id="theaterMainImg" src="" alt="High resolution preview" referrerpolicy="no-referrer">
            </div>
            <button type="button" class="theater-nav-arrow theater-next" id="btnTheaterNext" title="Next Image (Right Arrow)">❯</button>
          </div>
          <div class="theater-actions-bar">
            <a id="btnTheaterVisit" href="#" target="_blank" rel="noopener noreferrer" class="theater-action-btn primary" title="Visit Page Directly in New Tab">
              🌐 Visit Page ↗
            </a>
            <a id="btnTheaterOpenImg" href="#" target="_blank" rel="noopener noreferrer" class="theater-action-btn" title="Open Full Image in New Tab">
              🖼️ Open Full Image ↗
            </a>
            <button type="button" class="theater-action-btn" id="btnTheaterCopyLink" title="Copy Image Address">
              📋 Copy Link
            </button>
            <a id="btnTheaterDownload" href="#" download class="theater-action-btn" title="Download Image">
              ⬇️ Download
            </a>
          </div>
        </div>
      </div>
    `;
  } else if (category === 'videos') {
    resultsListHtml = `
      <div class="videos-grid">
        ${results.map(vid => {
          const proxyTargetUrl = `/api/browser/proxy?tabId=${encodeURIComponent(tabId)}&url=${encodeURIComponent(vid.url)}`;
          return `
            <a href="${proxyTargetUrl}" class="video-card">
              <div class="video-thumb-wrap">
                <img src="${escapeHtml(vid.thumbnail)}" alt="${escapeHtml(vid.title)}" loading="lazy" onerror="this.style.opacity='0.2'">
                <span class="video-badge">${escapeHtml(vid.duration || 'Video')}</span>
              </div>
              <div class="video-info">
                <strong>${escapeHtml(vid.title)}</strong>
                <small>${escapeHtml(vid.domain || 'video source')}</small>
              </div>
            </a>
          `;
        }).join('')}
      </div>
    `;
  } else if (results.length === 0) {
    resultsListHtml = `
      <div class="empty-state">
        <div class="empty-icon">🛡️</div>
        <h3>No results found for "${escapeHtml(query)}"</h3>
        <p>Try searching with broader terms or use DuckDuckGo-style bangs to jump directly:</p>
        <div class="bang-suggestions">
          <a href="/browser/search?tabId=${encodeURIComponent(tabId)}&q=!w+${encodeURIComponent(query)}" class="bang-pill">!w (Wikipedia)</a>
          <a href="/browser/search?tabId=${encodeURIComponent(tabId)}&q=!gh+${encodeURIComponent(query)}" class="bang-pill">!gh (GitHub)</a>
          <a href="/browser/search?tabId=${encodeURIComponent(tabId)}&q=!so+${encodeURIComponent(query)}" class="bang-pill">!so (StackOverflow)</a>
          <a href="/browser/search?tabId=${encodeURIComponent(tabId)}&q=!mdn+${encodeURIComponent(query)}" class="bang-pill">!mdn (MDN Docs)</a>
        </div>
      </div>
    `;
  } else {
    resultsListHtml = `
      <div class="results-list">
        ${results.map(item => {
          const targetUrl = item.url || '#';
          const proxyHref = `/api/browser/proxy?tabId=${encodeURIComponent(tabId)}&url=${encodeURIComponent(targetUrl)}`;
          const sourceBadge = item.source || (item.category === 'own' ? '⚡ Native Index' : 'Web');
          const domain = item.domain || (targetUrl.startsWith('http') ? new URL(targetUrl).hostname : 'aegis');

          return `
            <article class="result-entry">
              <div class="entry-meta">
                <span class="meta-domain">${escapeHtml(domain)}</span>
                <span class="meta-source">${escapeHtml(sourceBadge)}</span>
                <span class="meta-badge">A+ Encrypted</span>
              </div>
              <h3 class="entry-title">
                <a href="${proxyHref}" class="entry-link" data-real-url="${escapeHtml(targetUrl)}">${escapeHtml(item.title || targetUrl)}</a>
              </h3>
              <p class="entry-snippet">${escapeHtml(item.snippet || '')}</p>
              <div class="entry-actions">
                <a href="${proxyHref}" class="action-btn" data-real-url="${escapeHtml(targetUrl)}">🛡️ Open Sandboxed</a>
                <a href="${escapeHtml(targetUrl)}" target="_blank" rel="noopener noreferrer" class="action-btn action-ext no-intercept" data-real-url="${escapeHtml(targetUrl)}" onclick="try{window.open('${escapeHtml(targetUrl)}','_blank','noopener,noreferrer');return false;}catch(e){}">↗️ Official Website</a>
              </div>
            </article>
          `;
        }).join('')}
      </div>
    `;
  }

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>🔍 ${escapeHtml(query)} - Aegis Search</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: #070a0f;
      color: #e2e8f0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      padding: 0;
      margin: 0;
      line-height: 1.5;
    }

    /* Top Search Bar Header */
    .search-header {
      position: sticky;
      top: 0;
      background: rgba(11, 15, 23, 0.95);
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      backdrop-filter: blur(14px);
      padding: 12px 24px;
      z-index: 100;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .header-main-row {
      display: flex;
      align-items: center;
      gap: 16px;
      max-width: 900px;
      margin: 0 auto;
      width: 100%;
    }
    .brand-logo {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      text-decoration: none;
      color: #10b981;
      font-weight: 700;
      font-size: 1.1rem;
      letter-spacing: -0.02em;
      flex-shrink: 0;
    }
    .brand-logo svg {
      width: 20px;
      height: 20px;
    }

    .search-input-form {
      flex: 1;
      display: flex;
      align-items: center;
      background: #05080c;
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 9999px;
      padding: 6px 14px;
      transition: all 0.2s;
    }
    .search-input-form:focus-within {
      border-color: #10b981;
      box-shadow: 0 0 14px rgba(16, 185, 129, 0.25);
    }
    .search-field {
      flex: 1;
      background: transparent;
      border: none;
      outline: none;
      color: #ffffff;
      font-size: 0.92rem;
      padding: 4px 6px;
    }
    .search-btn {
      background: transparent;
      border: none;
      color: #10b981;
      cursor: pointer;
      display: flex;
      align-items: center;
      padding: 4px;
    }
    .search-btn svg {
      width: 16px;
      height: 16px;
    }

    /* Category Navigation Tabs */
    .category-nav {
      display: flex;
      align-items: center;
      gap: 8px;
      max-width: 900px;
      margin: 0 auto;
      width: 100%;
      overflow-x: auto;
    }
    .cat-link {
      color: #94a3b8;
      text-decoration: none;
      font-size: 0.82rem;
      font-weight: 500;
      padding: 5px 12px;
      border-radius: 6px;
      transition: all 0.15s;
      white-space: nowrap;
    }
    .cat-link:hover {
      color: #ffffff;
      background: rgba(255, 255, 255, 0.05);
    }
    .cat-link.active {
      color: #10b981;
      background: rgba(16, 185, 129, 0.12);
      font-weight: 600;
    }

    /* Main Container */
    .main-container {
      max-width: 900px;
      margin: 0 auto;
      padding: 24px 20px 60px;
    }

    .stats-bar {
      font-size: 0.78rem;
      color: #64748b;
      margin-bottom: 20px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    /* Instant Answer Card */
    .instant-answer-card {
      background: rgba(16, 185, 129, 0.06);
      border: 1px solid rgba(16, 185, 129, 0.25);
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 28px;
      backdrop-filter: blur(10px);
    }
    .ia-badge {
      display: inline-block;
      font-size: 0.72rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #34d399;
      background: rgba(16, 185, 129, 0.15);
      padding: 3px 8px;
      border-radius: 4px;
      margin-bottom: 10px;
    }
    .ia-calc-val {
      font-size: 1.8rem;
      font-weight: 700;
      color: #ffffff;
      font-family: ui-monospace, monospace;
    }
    .ia-calc-expr {
      font-size: 0.85rem;
      color: #94a3b8;
      font-family: ui-monospace, monospace;
      margin-top: 4px;
    }
    .ia-title {
      font-size: 1.1rem;
      font-weight: 600;
      color: #ffffff;
      margin-bottom: 8px;
    }
    .ia-code {
      background: #000000;
      padding: 12px 16px;
      border-radius: 8px;
      border: 1px solid rgba(255, 255, 255, 0.1);
      font-family: ui-monospace, monospace;
      font-size: 0.88rem;
      color: #38bdf8;
      overflow-x: auto;
      margin: 10px 0;
    }
    .ia-desc {
      color: #94a3b8;
      font-size: 0.88rem;
      line-height: 1.5;
    }

    /* Results List */
    .results-list {
      display: flex;
      flex-direction: column;
      gap: 24px;
    }
    .result-entry {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .entry-meta {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 0.76rem;
      color: #64748b;
    }
    .meta-domain {
      color: #94a3b8;
      font-weight: 500;
      max-width: 320px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .meta-source {
      background: rgba(255, 255, 255, 0.06);
      padding: 2px 6px;
      border-radius: 4px;
      color: #cbd5e1;
    }
    .meta-badge {
      background: rgba(16, 185, 129, 0.1);
      color: #34d399;
      padding: 2px 6px;
      border-radius: 4px;
    }
    .entry-title {
      font-size: 1.15rem;
      font-weight: 600;
      line-height: 1.35;
      margin: 0;
    }
    .entry-link {
      color: #38bdf8;
      text-decoration: none;
      transition: color 0.15s;
    }
    .entry-link:hover {
      color: #7dd3fc;
      text-decoration: underline;
    }
    .entry-snippet {
      color: #cbd5e1;
      font-size: 0.9rem;
      line-height: 1.6;
    }
    .entry-actions {
      display: flex;
      gap: 8px;
      margin-top: 4px;
    }
    .action-btn {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 0.74rem;
      font-weight: 500;
      color: #94a3b8;
      text-decoration: none;
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 255, 255, 0.08);
      padding: 4px 8px;
      border-radius: 4px;
      transition: all 0.15s;
    }
    .action-btn:hover {
      background: rgba(16, 185, 129, 0.15);
      border-color: rgba(16, 185, 129, 0.3);
      color: #ffffff;
    }

    /* Images Grid */
    .images-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
      gap: 14px;
    }
    .image-card {
      background: #0d121a;
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 8px;
      overflow: hidden;
      cursor: pointer;
      display: flex;
      flex-direction: column;
      transition: transform 0.2s, box-shadow 0.2s, border-color 0.2s;
    }
    .image-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.6);
      border-color: #10b981;
    }
    .image-card.active {
      border-color: #10b981;
      box-shadow: 0 0 14px rgba(16, 185, 129, 0.4);
    }
    .image-card img {
      width: 100%;
      height: 140px;
      object-fit: cover;
      display: block;
      background: #05080c;
    }
    .image-card-footer {
      padding: 6px 8px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 4px;
    }
    .img-meta {
      font-size: 0.72rem;
      color: #94a3b8;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .img-dim {
      font-size: 0.68rem;
      color: #64748b;
      white-space: nowrap;
    }

    /* Google Images-Style Theater Viewer */
    .google-img-theater {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      top: 0;
      background: rgba(2, 6, 15, 0.85);
      backdrop-filter: blur(12px);
      z-index: 9999;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
      animation: theaterFadeIn 0.2s ease;
    }
    @keyframes theaterFadeIn {
      from { opacity: 0; transform: scale(0.98); }
      to { opacity: 1; transform: scale(1); }
    }
    .theater-content {
      background: #0d121d;
      border: 1px solid rgba(255, 255, 255, 0.15);
      border-radius: 14px;
      max-width: 950px;
      width: 100%;
      max-height: 90vh;
      display: flex;
      flex-direction: column;
      box-shadow: 0 25px 60px rgba(0, 0, 0, 0.9);
      overflow: hidden;
    }
    .theater-top {
      padding: 14px 20px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 16px;
    }
    .theater-domain {
      font-size: 0.75rem;
      color: #10b981;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .theater-title {
      margin: 4px 0 2px;
      font-size: 1.1rem;
      font-weight: 600;
      color: #f8fafc;
      line-height: 1.3;
    }
    .theater-dim {
      font-size: 0.75rem;
      color: #64748b;
    }
    .theater-btn {
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid rgba(255, 255, 255, 0.12);
      color: #cbd5e1;
      width: 32px;
      height: 32px;
      border-radius: 50%;
      font-size: 1rem;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.15s;
    }
    .theater-btn:hover {
      background: rgba(239, 68, 68, 0.2);
      border-color: #ef4444;
      color: #ef4444;
    }
    .theater-view-stage {
      position: relative;
      flex: 1;
      min-height: 340px;
      max-height: 58vh;
      background: #030712;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      padding: 10px;
    }
    .theater-img-wrap {
      max-width: 100%;
      max-height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .theater-img-wrap img {
      max-width: 100%;
      max-height: 56vh;
      object-fit: contain;
      border-radius: 4px;
    }
    .theater-nav-arrow {
      position: absolute;
      top: 50%;
      transform: translateY(-50%);
      width: 44px;
      height: 44px;
      border-radius: 50%;
      background: rgba(15, 23, 42, 0.75);
      border: 1px solid rgba(255, 255, 255, 0.15);
      color: #ffffff;
      font-size: 1.2rem;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      z-index: 10;
      transition: all 0.15s;
    }
    .theater-nav-arrow:hover {
      background: rgba(16, 185, 129, 0.9);
      border-color: #10b981;
      transform: translateY(-50%) scale(1.1);
    }
    .theater-prev { left: 16px; }
    .theater-next { right: 16px; }
    .theater-actions-bar {
      padding: 14px 20px;
      border-top: 1px solid rgba(255, 255, 255, 0.08);
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
      background: #090e17;
    }
    .theater-action-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 8px 16px;
      border-radius: 6px;
      font-size: 0.85rem;
      font-weight: 500;
      text-decoration: none;
      color: #e2e8f0;
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid rgba(255, 255, 255, 0.12);
      cursor: pointer;
      transition: all 0.15s;
    }
    .theater-action-btn:hover {
      background: rgba(255, 255, 255, 0.12);
      color: #ffffff;
      border-color: rgba(255, 255, 255, 0.25);
    }
    .theater-action-btn.primary {
      background: #10b981;
      border-color: #10b981;
      color: #ffffff;
      font-weight: 600;
    }
    .theater-action-btn.primary:hover {
      background: #059669;
      box-shadow: 0 0 16px rgba(16, 185, 129, 0.4);
    }

    /* Videos Grid */
    .videos-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
      gap: 16px;
    }
    .video-card {
      background: #0d121a;
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 8px;
      overflow: hidden;
      text-decoration: none;
      color: inherit;
      transition: transform 0.2s;
    }
    .video-card:hover {
      transform: translateY(-2px);
      border-color: #10b981;
    }
    .video-thumb-wrap {
      position: relative;
      width: 100%;
      height: 135px;
      background: #000;
    }
    .video-thumb-wrap img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .video-badge {
      position: absolute;
      bottom: 6px;
      right: 6px;
      background: rgba(0, 0, 0, 0.8);
      color: #fff;
      font-size: 0.7rem;
      padding: 2px 6px;
      border-radius: 4px;
    }
    .video-info {
      padding: 10px;
    }
    .video-info strong {
      display: block;
      font-size: 0.84rem;
      color: #f1f5f9;
      line-height: 1.3;
      margin-bottom: 4px;
    }
    .video-info small {
      font-size: 0.72rem;
      color: #94a3b8;
    }

    /* Empty State */
    .empty-state {
      text-align: center;
      padding: 40px 20px;
    }
    .empty-icon { font-size: 3rem; margin-bottom: 12px; }
    .empty-state h3 { color: #f1f5f9; margin-bottom: 8px; }
    .empty-state p { color: #94a3b8; font-size: 0.9rem; margin-bottom: 20px; }
    .bang-suggestions {
      display: flex;
      justify-content: center;
      flex-wrap: wrap;
      gap: 10px;
    }
    .bang-pill {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      color: #38bdf8;
      font-size: 0.82rem;
      padding: 6px 12px;
      border-radius: 9999px;
      text-decoration: none;
      transition: all 0.15s;
    }
    .bang-pill:hover {
      background: rgba(56, 189, 248, 0.15);
      border-color: #38bdf8;
    }
  </style>
</head>
<body>

  <!-- Top Search Bar Header -->
  <header class="search-header">
    <div class="header-main-row">
      <a href="/browser/search?tabId=${encodeURIComponent(tabId)}&q=" class="brand-logo" title="Aegis Private Search">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
        </svg>
        <span>AEGIS</span>
      </a>

      <form class="search-input-form" action="/browser/search" method="GET">
        <input type="hidden" name="tabId" value="${escapeHtml(tabId)}">
        <input type="hidden" name="cat" value="${escapeHtml(category)}">
        <input type="text" name="q" class="search-field" value="${escapeHtml(query)}" placeholder="Search privately with Aegis Engine..." autofocus spellcheck="false">
        <button type="submit" class="search-btn" title="Search">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <circle cx="11" cy="11" r="8"/>
            <line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
        </button>
      </form>
    </div>

    <!-- Category Tabs -->
    <nav class="category-nav">
      <a href="/browser/search?tabId=${encodeURIComponent(tabId)}&q=${encodeURIComponent(query)}&cat=all" class="cat-link ${category === 'all' ? 'active' : ''}">🌐 All Web</a>
      <a href="/browser/search?tabId=${encodeURIComponent(tabId)}&q=${encodeURIComponent(query)}&cat=images" class="cat-link ${category === 'images' ? 'active' : ''}">🖼️ Images</a>
      <a href="/browser/search?tabId=${encodeURIComponent(tabId)}&q=${encodeURIComponent(query)}&cat=videos" class="cat-link ${category === 'videos' ? 'active' : ''}">🎬 Videos</a>
      <a href="/browser/search?tabId=${encodeURIComponent(tabId)}&q=${encodeURIComponent(query)}&cat=tech" class="cat-link ${category === 'tech' ? 'active' : ''}">💻 Tech & Code</a>
      <a href="/browser/search?tabId=${encodeURIComponent(tabId)}&q=${encodeURIComponent(query)}&cat=vault" class="cat-link ${category === 'vault' ? 'active' : ''}">📁 Vault Notes</a>
      <a href="/browser/search?tabId=${encodeURIComponent(tabId)}&q=${encodeURIComponent(query)}&cat=onion" class="cat-link ${category === 'onion' ? 'active' : ''}">🧅 Tor Onion</a>
    </nav>
  </header>

  <!-- Main Content Container -->
  <main class="main-container">
    <div class="stats-bar">
      <span>About ${totalCount} results retrieved in ${durationSec}s • Zero telemetry</span>
      <span>Aegis Native Aggregator</span>
    </div>

    ${instantCardHtml}

    ${resultsListHtml}
  </main>

  <script id="aegis-browser-shield">
    (function() {
      // Notify parent Aegis Browser of navigation title & URL
      try {
        window.parent.postMessage({
          type: 'AEGIS_BROWSER_NAV',
          tabId: ${JSON.stringify(tabId)},
          url: window.location.href,
          targetUrl: window.location.href,
          title: ${JSON.stringify('🔍 ' + query)},
          favicon: '/favicon.ico'
        }, '*');
      } catch(e) {}

      // Click interceptor for in-page search result navigation
      document.addEventListener('click', function(e) {
        const link = e.target.closest('a');
        if (!link) return;
        const realTarget = link.getAttribute('data-real-url');
        if (realTarget && realTarget !== '#' && !realTarget.startsWith('javascript:')) {
          if (window.parent && window.parent !== window) {
            e.preventDefault();
            window.parent.postMessage({
              type: 'AEGIS_BROWSER_NAVIGATE_REQUEST',
              tabId: ${JSON.stringify(tabId)},
              url: realTarget
            }, '*');
          }
        }
      });

      // Interactive Google Images-Style Theater Lightbox
      const theater = document.getElementById('googleImgTheater');
      if (theater) {
        const mainImg = document.getElementById('theaterMainImg');
        const titleEl = document.getElementById('theaterTitle');
        const domainEl = document.getElementById('theaterDomain');
        const dimEl = document.getElementById('theaterDim');
        const btnVisit = document.getElementById('btnTheaterVisit');
        const btnOpenImg = document.getElementById('btnTheaterOpenImg');
        const btnDownload = document.getElementById('btnTheaterDownload');
        const btnCopy = document.getElementById('btnTheaterCopyLink');
        const btnClose = document.getElementById('btnTheaterClose');
        const btnPrev = document.getElementById('btnTheaterPrev');
        const btnNext = document.getElementById('btnTheaterNext');
        const cards = Array.from(document.querySelectorAll('.image-card'));
        let currentIdx = -1;

        function showTheater(idx) {
          if (idx < 0 || idx >= cards.length) return;
          currentIdx = idx;
          cards.forEach((c, i) => c.classList.toggle('active', i === idx));
          const card = cards[idx];
          const imgSrc = card.dataset.imgUrl;
          const sourceUrl = card.dataset.sourceUrl;
          const title = card.dataset.title || 'Image';
          const domain = card.dataset.domain || '';
          const dim = card.dataset.dim || '';

          mainImg.src = imgSrc;
          titleEl.textContent = title;
          domainEl.textContent = domain;
          dimEl.textContent = dim;
          btnVisit.href = sourceUrl;
          btnOpenImg.href = imgSrc;
          btnDownload.href = imgSrc;
          btnDownload.download = (title.replace(/[^a-zA-Z0-9_-]/g, '_') || 'image') + '.jpg';

          theater.style.display = 'flex';
        }

        cards.forEach((card, idx) => {
          card.addEventListener('click', (e) => {
            e.preventDefault();
            showTheater(idx);
          });
        });

        if (btnClose) btnClose.addEventListener('click', () => theater.style.display = 'none');
        if (theater) theater.addEventListener('click', (e) => {
          if (e.target === theater) theater.style.display = 'none';
        });
        if (btnPrev) btnPrev.addEventListener('click', () => {
          let prev = currentIdx - 1;
          if (prev < 0) prev = cards.length - 1;
          showTheater(prev);
        });
        if (btnNext) btnNext.addEventListener('click', () => {
          let next = currentIdx + 1;
          if (next >= cards.length) next = 0;
          showTheater(next);
        });
        if (btnCopy) btnCopy.addEventListener('click', async () => {
          if (currentIdx >= 0 && cards[currentIdx]) {
            const url = cards[currentIdx].dataset.imgUrl;
            try {
              await navigator.clipboard.writeText(url);
              const orig = btnCopy.textContent;
              btnCopy.textContent = '✓ Copied!';
              setTimeout(() => btnCopy.textContent = orig, 1500);
            } catch(e) {}
          }
        });

        window.addEventListener('keydown', (e) => {
          if (theater.style.display === 'flex') {
            if (e.key === 'Escape') theater.style.display = 'none';
            if (e.key === 'ArrowLeft') {
              let prev = currentIdx - 1;
              if (prev < 0) prev = cards.length - 1;
              showTheater(prev);
            }
            if (e.key === 'ArrowRight') {
              let next = currentIdx + 1;
              if (next >= cards.length) next = 0;
              showTheater(next);
            }
          }
        });
      }
    })();
  </script>
</body>
</html>
  `;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('X-Frame-Options', 'ALLOWALL');
  return res.send(html);
}

module.exports = { handleBrowserSearch };
