/**
 * Aegis Search Lenses & Domain Focus Engine
 * Implements Kagi-style focus lenses that restrict or boost results to curated authoritative sources.
 */

const DEFAULT_LENSES = {
  academic: {
    id: 'academic',
    name: 'Academic & Papers',
    icon: '🧪',
    description: 'Peer-reviewed research, science papers, and scholarly publications.',
    domains: [
      'arxiv.org',
      'pubmed.ncbi.nlm.nih.gov',
      'jstor.org',
      'nature.com',
      'semanticscholar.org',
      'science.org',
      'biorxiv.org',
      'en.wikipedia.org'
    ],
    querySuffix: '(site:arxiv.org OR site:ncbi.nlm.nih.gov OR site:nature.com OR site:jstor.org OR site:semanticscholar.org)'
  },
  developer: {
    id: 'developer',
    name: 'Developer & Code',
    icon: '💻',
    description: 'Official API documentation, GitHub repositories, and developer Q&A.',
    domains: [
      'github.com',
      'stackoverflow.com',
      'developer.mozilla.org',
      'devdocs.io',
      'rust-lang.org',
      'docs.python.org',
      'go.dev',
      'news.ycombinator.com',
      'npmjs.com',
      'crates.io'
    ],
    querySuffix: '(site:github.com OR site:stackoverflow.com OR site:developer.mozilla.org OR site:devdocs.io OR site:news.ycombinator.com)'
  },
  news: {
    id: 'news',
    name: 'Independent News',
    icon: '📰',
    description: 'Fact-checked journalism and non-corporate investigative reporting.',
    domains: [
      'reuters.com',
      'apnews.com',
      'theintercept.com',
      'propublica.org',
      'bbc.com',
      'dw.com',
      'eff.org',
      'news.ycombinator.com'
    ],
    querySuffix: '(site:reuters.com OR site:apnews.com OR site:propublica.org OR site:theintercept.com OR site:eff.org)'
  },
  foss: {
    id: 'foss',
    name: 'FOSS & Alternatives',
    icon: '🛡️',
    description: 'Open source software, self-hosting tools, and privacy-respecting alternatives.',
    domains: [
      'github.com',
      'alternativeto.net',
      'privacyguides.org',
      'f-droid.org',
      'gitlab.com',
      'codeberg.org',
      'framasoft.org'
    ],
    querySuffix: '(site:github.com OR site:alternativeto.net OR site:privacyguides.org OR site:f-droid.org OR site:codeberg.org)'
  },
  discussions: {
    id: 'discussions',
    name: 'Discussions & Forums',
    icon: '💬',
    description: 'Community-driven discussion boards, Reddit threads, Hacker News, and forums.',
    domains: [
      'news.ycombinator.com',
      'reddit.com',
      'lobste.rs',
      'lemmy.world',
      'stackexchange.com',
      'discourse.org'
    ],
    querySuffix: '(site:news.ycombinator.com OR site:reddit.com OR site:lobste.rs OR site:lemmy.world OR site:stackexchange.com)'
  },
  books: {
    id: 'books',
    name: 'Books & Literature',
    icon: '📚',
    description: 'Public domain literature, open books, library archives, and ebooks.',
    domains: [
      'gutenberg.org',
      'openlibrary.org',
      'standardebooks.org',
      'archive.org',
      'manybooks.net'
    ],
    querySuffix: '(site:gutenberg.org OR site:openlibrary.org OR site:standardebooks.org OR site:archive.org/details/texts)'
  },
  crypto: {
    id: 'crypto',
    name: 'Privacy & Security',
    icon: '🔒',
    description: 'Cryptography papers, cybersecurity intelligence, privacy guides, and threat analysis.',
    domains: [
      'privacyguides.org',
      'eff.org',
      'torproject.org',
      'iacr.org',
      'schneier.com',
      'krebsonsecurity.com',
      'bleepingcomputer.com'
    ],
    querySuffix: '(site:privacyguides.org OR site:eff.org OR site:torproject.org OR site:iacr.org OR site:schneier.com OR site:krebsonsecurity.com)'
  },
  design: {
    id: 'design',
    name: 'UI/UX & Design',
    icon: '🎨',
    description: 'Design inspiration, component systems, case studies, typography, and assets.',
    domains: [
      'dribbble.com',
      'behance.net',
      'figma.com',
      'mobbin.com',
      'godly.website',
      'uigarage.net',
      'awwwards.com'
    ],
    querySuffix: '(site:dribbble.com OR site:behance.net OR site:figma.com/community OR site:mobbin.com OR site:godly.website OR site:awwwards.com)'
  },
  finance: {
    id: 'finance',
    name: 'Markets & Finance',
    icon: '📈',
    description: 'Financial news, macroeconomic analysis, SEC filings, and market data.',
    domains: [
      'reuters.com',
      'bloomberg.com',
      'ft.com',
      'sec.gov',
      'tradingview.com',
      'finance.yahoo.com',
      'marketwatch.com'
    ],
    querySuffix: '(site:reuters.com OR site:bloomberg.com OR site:ft.com OR site:sec.gov OR site:tradingview.com)'
  },
  packages: {
    id: 'packages',
    name: 'Software Packages',
    icon: '📦',
    description: 'Software package registries, libraries, crates, and dependency repositories.',
    domains: [
      'pypi.org',
      'npmjs.com',
      'crates.io',
      'pkg.go.dev',
      'rubygems.org',
      'packagist.org',
      'nuget.org'
    ],
    querySuffix: '(site:pypi.org OR site:npmjs.com OR site:crates.io OR site:pkg.go.dev OR site:rubygems.org OR site:nuget.org)'
  }
};

class LensManager {
  constructor() {
    this.customLenses = new Map();
  }

  getLens(lensId) {
    if (!lensId || lensId === 'all') return null;
    return DEFAULT_LENSES[lensId] || this.customLenses.get(lensId) || null;
  }

  getAllLenses() {
    const list = Object.values(DEFAULT_LENSES);
    for (const custom of this.customLenses.values()) {
      list.push(custom);
    }
    return list;
  }

  addCustomLens(lens) {
    if (!lens || !lens.id || !lens.name) return;
    this.customLenses.set(lens.id, {
      ...lens,
      icon: lens.icon || '🔍',
      isCustom: true,
      querySuffix: lens.domains?.length ? `(${lens.domains.map(d => `site:${d}`).join(' OR ')})` : ''
    });
  }

  removeCustomLens(lensId) {
    return this.customLenses.delete(lensId);
  }

  applyLensToQuery(query, lensId) {
    const lens = this.getLens(lensId);
    if (!lens || !lens.querySuffix) return query;
    return `${query} ${lens.querySuffix}`;
  }

  filterResultsByLens(results, lensId) {
    const lens = this.getLens(lensId);
    if (!lens || !lens.domains || lens.domains.length === 0) return results;

    const domainSet = new Set(lens.domains.map(d => d.toLowerCase()));

    // Keep results that match lens domains, or give high rank
    return results.filter(item => {
      const d = (item.domain || '').toLowerCase();
      return domainSet.has(d) || Array.from(domainSet).some(target => d === target || d.endsWith('.' + target));
    });
  }
}

const lensManager = new LensManager();

module.exports = {
  lensManager,
  DEFAULT_LENSES
};
