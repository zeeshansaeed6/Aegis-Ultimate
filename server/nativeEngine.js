/**
 * Aegis Native Inverted Index & BM25 Search Engine
 * Self-hosted, autonomous full-text web indexing engine with field boosting,
 * inbound link graph ranking (PageRank approximation), and disk persistence.
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const INDEX_FILE = path.join(DATA_DIR, 'native_search_index.json');

// Stop-words list for English tokenization
const STOP_WORDS = new Set([
  'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and', 'any', 'are', 'aren',
  'as', 'at', 'be', 'because', 'been', 'before', 'being', 'below', 'between', 'both', 'but', 'by',
  'can', 'could', 'did', 'do', 'does', 'doing', 'down', 'during', 'each', 'few', 'for', 'from',
  'further', 'had', 'has', 'have', 'having', 'he', 'her', 'here', 'hers', 'herself', 'him', 'himself',
  'his', 'how', 'i', 'if', 'in', 'into', 'is', 'it', 'its', 'itself', 'just', 'me', 'more', 'most',
  'my', 'myself', 'no', 'nor', 'not', 'now', 'of', 'off', 'on', 'once', 'only', 'or', 'other', 'our',
  'ours', 'ourselves', 'out', 'over', 'own', 'same', 'she', 'should', 'so', 'some', 'such', 'than',
  'that', 'the', 'their', 'theirs', 'them', 'themselves', 'then', 'there', 'these', 'they', 'this',
  'those', 'through', 'to', 'too', 'under', 'until', 'up', 'very', 'was', 'wasn', 'we', 'were',
  'what', 'when', 'where', 'which', 'while', 'who', 'whom', 'why', 'with', 'would', 'you', 'your'
]);

class NativeSearchEngine {
  constructor(k1 = 1.2, b = 0.75) {
    this.k1 = k1;
    this.b = b;
    this.documents = new Map();       // url -> document metadata & text
    this.invertedIndex = new Map();    // term -> Map(url -> { tf, inTitle, inHeadings, inDesc, positions })
    this.inboundLinks = new Map();     // url -> Set(originatingUrls)
    this.totalTokens = 0;
    this.avgDocLength = 0;

    this.ensureDataDir();
    this.loadFromDisk();

    // If fresh with zero documents, seed default high-value starter pages
    if (this.documents.size === 0) {
      this.seedStarterCorpus();
      this.saveToDisk();
    }
  }

  ensureDataDir() {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  }

  tokenize(text) {
    if (!text || typeof text !== 'string') return [];
    return text
      .toLowerCase()
      .replace(/[^\w\s-]/g, ' ')
      .split(/\s+/)
      .filter(token => token.length > 1 && !STOP_WORDS.has(token));
  }

  /**
   * Adds or updates a crawled web page into the native inverted index
   */
  addPage({ url, domain, title = '', description = '', headings = [], body = '', outgoingLinks = [], favicon = '' }) {
    if (!url) return null;

    // Clean up old record if it already exists
    if (this.documents.has(url)) {
      this.removePage(url, false);
    }

    const titleTokens = this.tokenize(title);
    const headingsText = headings.join(' ');
    const headingTokens = this.tokenize(headingsText);
    const descTokens = this.tokenize(description);
    const bodyTokens = this.tokenize(body);

    const allTokens = [...titleTokens, ...headingTokens, ...descTokens, ...bodyTokens];
    const docLength = allTokens.length || 1;

    const titleSet = new Set(titleTokens);
    const headingSet = new Set(headingTokens);
    const descSet = new Set(descTokens);

    // Build term frequencies and field positions
    const termStats = new Map();
    allTokens.forEach((token, pos) => {
      let stat = termStats.get(token);
      if (!stat) {
        stat = {
          tf: 0,
          inTitle: titleSet.has(token),
          inHeadings: headingSet.has(token),
          inDesc: descSet.has(token),
          positions: []
        };
        termStats.set(token, stat);
      }
      stat.tf++;
      if (stat.positions.length < 15) stat.positions.push(pos);
    });

    // Record document
    const doc = {
      id: 'native_' + Math.random().toString(36).substring(2, 9),
      url,
      domain: domain || (new URL(url).hostname),
      title: title || domain || url,
      description: description || (body.substring(0, 180) + '...'),
      headings: headings.slice(0, 8),
      bodySnippet: body.substring(0, 400),
      wordCount: body.split(/\s+/).length,
      docLength,
      favicon,
      crawledAt: new Date().toISOString(),
      outgoingLinks: outgoingLinks.slice(0, 50)
    };

    this.documents.set(url, doc);
    this.totalTokens += docLength;

    // Update Inverted Index
    for (const [term, stat] of termStats.entries()) {
      let posting = this.invertedIndex.get(term);
      if (!posting) {
        posting = new Map();
        this.invertedIndex.set(term, posting);
      }
      posting.set(url, stat);
    }

    // Update Link Graph
    for (const target of outgoingLinks) {
      if (!this.inboundLinks.has(target)) {
        this.inboundLinks.set(target, new Set());
      }
      this.inboundLinks.get(target).add(url);
    }

    this.recalculateAvgLength();
    return doc;
  }

  removePage(url, autoRecalc = true) {
    if (!this.documents.has(url)) return false;

    const doc = this.documents.get(url);
    this.totalTokens -= doc.docLength;
    this.documents.delete(url);

    // Remove from inverted index
    for (const [term, postings] of this.invertedIndex.entries()) {
      if (postings.has(url)) {
        postings.delete(url);
        if (postings.size === 0) {
          this.invertedIndex.delete(term);
        }
      }
    }

    if (autoRecalc) {
      this.recalculateAvgLength();
    }
    return true;
  }

  recalculateAvgLength() {
    const N = this.documents.size;
    this.avgDocLength = N > 0 ? this.totalTokens / N : 0;
  }

  /**
   * Search native index using BM25 with Field Boosting and Link Graph Ranking
   */
  search(query, limit = 15) {
    const tokens = this.tokenize(query);
    if (!tokens.length) return [];

    const N = this.documents.size;
    if (N === 0) return [];

    const scores = new Map(); // url -> bm25 score
    const matchedTerms = new Map(); // url -> Set of matched query terms

    for (const term of tokens) {
      const postings = this.invertedIndex.get(term);
      if (!postings) continue;

      // Inverse Document Frequency (IDF)
      const df = postings.size;
      const idf = Math.log(1 + (N - df + 0.5) / (df + 0.5));

      for (const [url, stat] of postings.entries()) {
        const doc = this.documents.get(url);
        if (!doc) continue;

        // Field Boost Factor
        let fieldMultiplier = 1.0;
        if (stat.inTitle) fieldMultiplier += 2.5; // Title match gives massive boost
        if (stat.inHeadings) fieldMultiplier += 1.5;
        if (stat.inDesc) fieldMultiplier += 0.8;

        // BM25 term score
        const tf = stat.tf;
        const normDocLength = doc.docLength / (this.avgDocLength || 1);
        const termScore = idf * ((tf * (this.k1 + 1)) / (tf + this.k1 * (1 - this.b + this.b * normDocLength))) * fieldMultiplier;

        scores.set(url, (scores.get(url) || 0) + termScore);

        if (!matchedTerms.has(url)) matchedTerms.set(url, new Set());
        matchedTerms.get(url).add(term);
      }
    }

    // Link Graph PageRank Multiplier
    const results = [];
    for (const [url, baseScore] of scores.entries()) {
      const doc = this.documents.get(url);
      if (!doc) continue;

      const inbounds = this.inboundLinks.get(url)?.size || 0;
      const authorityMultiplier = 1 + Math.log10(1 + inbounds) * 0.25;

      const finalScore = baseScore * authorityMultiplier;
      const matched = matchedTerms.get(url);
      const coverageRatio = matched ? matched.size / tokens.length : 0;

      // Extract high-relevance sentence snippet around matched terms
      const snippet = this.extractDynamicSnippet(doc, tokens);

      results.push({
        id: doc.id,
        url: doc.url,
        domain: doc.domain,
        title: doc.title,
        snippet,
        bodySnippet: doc.bodySnippet,
        wordCount: doc.wordCount,
        crawledAt: doc.crawledAt,
        favicon: doc.favicon,
        score: Number(finalScore.toFixed(3)),
        coverage: Number((coverageRatio * 100).toFixed(0)),
        inboundLinks: inbounds,
        isNativeDoc: true,
        isNativeEngine: true,
        category: 'own',
        privacyScore: '100% Offline (Own Engine)',
        source: 'Aegis Native Search Engine'
      });
    }

    // Sort by final score descending
    results.sort((a, b) => b.score - a.score);
    return results.slice(0, limit);
  }

  extractDynamicSnippet(doc, queryTokens) {
    const rawText = `${doc.description} ${doc.bodySnippet}`;
    const sentences = rawText.split(/(?<=[.?!])\s+/);

    let bestSentence = '';
    let maxMatches = 0;

    for (const s of sentences) {
      if (s.length < 20) continue;
      const lower = s.toLowerCase();
      let matches = 0;
      for (const t of queryTokens) {
        if (lower.includes(t)) matches++;
      }
      if (matches > maxMatches) {
        maxMatches = matches;
        bestSentence = s.trim();
      }
    }

    return bestSentence || doc.description || doc.bodySnippet.substring(0, 160) + '...';
  }

  getStats() {
    let totalWords = 0;
    const domains = new Set();

    for (const doc of this.documents.values()) {
      totalWords += doc.wordCount || 0;
      domains.add(doc.domain);
    }

    let fileSize = 0;
    try {
      if (fs.existsSync(INDEX_FILE)) {
        fileSize = fs.statSync(INDEX_FILE).size;
      }
    } catch (e) {}

    return {
      indexedPages: this.documents.size,
      uniqueTerms: this.invertedIndex.size,
      uniqueDomains: domains.size,
      totalWords,
      storageSizeBytes: fileSize,
      storageSizeKb: (fileSize / 1024).toFixed(1),
      avgDocLength: Math.round(this.avgDocLength)
    };
  }

  getAllPages() {
    return Array.from(this.documents.values()).map(doc => ({
      id: doc.id,
      url: doc.url,
      domain: doc.domain,
      title: doc.title,
      wordCount: doc.wordCount,
      crawledAt: doc.crawledAt
    }));
  }

  clear() {
    this.documents.clear();
    this.invertedIndex.clear();
    this.inboundLinks.clear();
    this.totalTokens = 0;
    this.avgDocLength = 0;
    this.saveToDisk();
  }

  saveToDisk() {
    try {
      this.ensureDataDir();
      const payload = {
        savedAt: new Date().toISOString(),
        documents: Array.from(this.documents.entries()),
        inboundLinks: Array.from(this.inboundLinks.entries()).map(([k, v]) => [k, Array.from(v)])
      };
      fs.writeFileSync(INDEX_FILE, JSON.stringify(payload, null, 2), 'utf-8');
      return true;
    } catch (err) {
      console.error('Failed to save native index to disk:', err);
      return false;
    }
  }

  loadFromDisk() {
    try {
      if (!fs.existsSync(INDEX_FILE)) return false;
      const raw = fs.readFileSync(INDEX_FILE, 'utf-8');
      const data = JSON.parse(raw);

      if (Array.isArray(data.documents)) {
        for (const [url, doc] of data.documents) {
          this.addPage(doc);
        }
      }

      if (Array.isArray(data.inboundLinks)) {
        for (const [k, links] of data.inboundLinks) {
          this.inboundLinks.set(k, new Set(links));
        }
      }

      console.log(`✓ Loaded ${this.documents.size} crawled pages into Native Search Engine index.`);
      return true;
    } catch (err) {
      console.warn('Could not load native index from disk, starting fresh.');
      return false;
    }
  }

  seedStarterCorpus() {
    const starterPages = [
      {
        url: 'https://aegis-search.internal/docs/architecture',
        domain: 'aegis-search.internal',
        title: 'Aegis Search Engine Architecture & Design',
        description: 'Complete architecture of Aegis: self-hosted web crawler, BM25 ranking algorithm, and zero-telemetry RAM processing.',
        headings: ['Engine Architecture', 'BM25 Scoring Algorithm', 'Web Crawler Pipeline'],
        body: 'Aegis Search Ultimate is an autonomous, private search engine. It features an integrated autonomous web crawler with rate-limiting, an in-memory inverted index, and dynamic sentence snippet extraction with PageRank link graph scoring.'
      },
      {
        url: 'https://expressjs.com/en/guide/routing.html',
        domain: 'expressjs.com',
        title: 'Express.js Routing and Middleware Guide',
        description: 'Routing refers to determining how an application responds to a client request to a particular endpoint, which is a URI and a specific HTTP method.',
        headings: ['Basic Routing', 'Route Methods', 'Middleware Functions'],
        body: 'Routing refers to how an application responds to a client request to a particular endpoint with an HTTP method (GET, POST, etc.) and a path. Middleware functions have access to the request object (req), the response object (res), and the next middleware function.'
      },
      {
        url: 'https://developer.mozilla.org/en-US/docs/Web/Privacy',
        domain: 'developer.mozilla.org',
        title: 'MDN Web Docs: Privacy and Security in Web Applications',
        description: 'Web application privacy practices, Referrer-Policy suppression, tracking prevention, Content Security Policy, and user data isolation.',
        headings: ['Privacy Principles', 'Referrer Policy', 'Tracking Protections'],
        body: 'Privacy on the web is paramount. Key defenses include strict Referrer-Policy: no-referrer, sanitizing URL parameters to remove tracking beacons (utm_source, fbclid, gclid), sandboxed iframe execution, and client-side encryption via the Web Cryptography API.'
      },
      {
        url: 'https://doc.rust-lang.org/book/ch01-01-installation.html',
        domain: 'doc.rust-lang.org',
        title: 'The Rust Programming Language: Getting Started and Safety',
        description: 'Rust is a systems programming language that provides memory safety without garbage collection, concurrency without data races, and zero-cost abstractions.',
        headings: ['Why Rust?', 'Memory Safety Guarantees', 'Ownership and Borrowing'],
        body: 'Rust empowers developers to build reliable and efficient software. By enforcing strict ownership and borrowing rules at compile time, Rust eliminates null pointer dereferences, buffer overflows, and concurrency races before runtime.'
      }
    ];

    for (const page of starterPages) {
      this.addPage(page);
    }
  }
}

const nativeEngine = new NativeSearchEngine();

module.exports = {
  NativeSearchEngine,
  nativeEngine
};
