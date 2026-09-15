/**
 * Aegis In-Memory BM25 Local Full-Text Indexer
 * Allows searching local notes, private documents, code snippets, and vault entries completely offline.
 */

class BM25Engine {
  constructor(k1 = 1.2, b = 0.75) {
    this.k1 = k1;
    this.b = b;
    this.documents = new Map(); // id -> doc
    this.docLengths = new Map(); // id -> length in tokens
    this.invertedIndex = new Map(); // term -> Map(id -> termFrequency)
    this.avgDocLength = 0;
    this.totalTokens = 0;

    // Seed with high-value starter privacy & dev docs
    this.seedDefaults();
  }

  tokenize(text) {
    if (!text || typeof text !== 'string') return [];
    return text
      .toLowerCase()
      .replace(/[^\w\s-]/g, ' ')
      .split(/\s+/)
      .filter(t => t.length > 1 && !this.isStopWord(t));
  }

  isStopWord(term) {
    const stopWords = new Set([
      'the', 'is', 'at', 'which', 'on', 'and', 'a', 'an', 'in', 'to', 'for', 'of',
      'or', 'by', 'with', 'as', 'this', 'that', 'from', 'it', 'are', 'was', 'be'
    ]);
    return stopWords.has(term);
  }

  addDocument({ id, title, content, tags = [], source = 'vault' }) {
    if (!id) id = 'doc_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);

    // If doc already exists, clean it up first
    if (this.documents.has(id)) {
      this.removeDocument(id);
    }

    const fullText = `${title}\n${tags.join(' ')}\n${content}`;
    const tokens = this.tokenize(fullText);
    const docLength = tokens.length;

    // Record document
    const doc = {
      id,
      title,
      content,
      tags,
      source,
      updatedAt: new Date().toISOString(),
      tokenCount: docLength
    };
    this.documents.set(id, doc);
    this.docLengths.set(id, docLength);

    // Update frequencies
    const termFreqs = new Map();
    for (const token of tokens) {
      termFreqs.set(token, (termFreqs.get(token) || 0) + 1);
    }

    for (const [term, freq] of termFreqs.entries()) {
      if (!this.invertedIndex.has(term)) {
        this.invertedIndex.set(term, new Map());
      }
      this.invertedIndex.get(term).set(id, freq);
    }

    this.totalTokens += docLength;
    this.recalculateAvgLength();

    return doc;
  }

  removeDocument(id) {
    if (!this.documents.has(id)) return false;

    const docLength = this.docLengths.get(id) || 0;
    this.totalTokens -= docLength;
    this.documents.delete(id);
    this.docLengths.delete(id);

    // Clean from index
    for (const [term, docMap] of this.invertedIndex.entries()) {
      if (docMap.has(id)) {
        docMap.delete(id);
        if (docMap.size === 0) {
          this.invertedIndex.delete(term);
        }
      }
    }

    this.recalculateAvgLength();
    return true;
  }

  recalculateAvgLength() {
    const N = this.documents.size;
    this.avgDocLength = N > 0 ? this.totalTokens / N : 0;
  }

  search(query, limit = 10) {
    const queryTokens = this.tokenize(query);
    if (queryTokens.length === 0) {
      return this.getAll().slice(0, limit);
    }

    const N = this.documents.size;
    if (N === 0) return [];

    const scores = new Map(); // id -> bm25 score

    for (const token of queryTokens) {
      const posting = this.invertedIndex.get(token);
      if (!posting) continue;

      const n_q = posting.size;
      // Robertson-Spärck Jones IDF
      const idf = Math.log(1 + (N - n_q + 0.5) / (n_q + 0.5));

      for (const [docId, freq] of posting.entries()) {
        const docLen = this.docLengths.get(docId) || 1;
        const normFactor = 1 - this.b + this.b * (docLen / (this.avgDocLength || 1));
        const termScore = idf * ((freq * (this.k1 + 1)) / (freq + this.k1 * normFactor));

        scores.set(docId, (scores.get(docId) || 0) + termScore);
      }
    }

    // Sort by score descending
    const ranked = Array.from(scores.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([id, score]) => {
        const doc = this.documents.get(id);
        return {
          id: doc.id,
          title: doc.title,
          content: doc.content,
          snippet: this.generateHighlightSnippet(doc.content, queryTokens),
          tags: doc.tags,
          source: doc.source,
          updatedAt: doc.updatedAt,
          score: Number(score.toFixed(3)),
          isLocalDoc: true
        };
      });

    return ranked;
  }

  generateHighlightSnippet(content, tokens, maxLength = 180) {
    if (!content) return '';
    const lower = content.toLowerCase();
    let bestIndex = -1;

    for (const t of tokens) {
      const idx = lower.indexOf(t);
      if (idx !== -1) {
        bestIndex = idx;
        break;
      }
    }

    let start = 0;
    if (bestIndex > 40) {
      start = Math.max(0, bestIndex - 40);
    }
    let snippet = content.substring(start, start + maxLength);
    if (start > 0) snippet = '...' + snippet;
    if (start + maxLength < content.length) snippet = snippet + '...';

    return snippet;
  }

  getAll() {
    return Array.from(this.documents.values()).map(doc => ({
      ...doc,
      snippet: doc.content.substring(0, 160) + (doc.content.length > 160 ? '...' : ''),
      isLocalDoc: true
    }));
  }

  seedDefaults() {
    this.addDocument({
      id: 'doc-privacy-manifesto',
      title: 'Aegis Privacy Manifesto & Zero-Telemetry Architecture',
      tags: ['privacy', 'security', 'architecture', 'zero-logs'],
      content: `Aegis Search operates on three inviolable principles:
1. Zero User Identification: No device fingerprinting, IP address logs, or persistent tracker cookies.
2. Ephemeral In-Memory Computation: Search requests are evaluated in RAM without writing queries to persistent disk tables.
3. Client-Side Cryptographic Autonomy: Bookmarks, search archives, and preference profiles are stored locally in the browser's encrypted sandbox.`
    });

    this.addDocument({
      id: 'doc-bangs-cheatsheet',
      title: 'Aegis Bang Navigation Shortcuts Guide',
      tags: ['bangs', 'shortcuts', 'cheatsheet', 'navigation'],
      content: `Use DuckDuckGo-style bangs directly in the search bar:
- !w or !wiki <term>: Instant search on Wikipedia
- !gh <term>: Code and repository search on GitHub
- !yt <term>: Video search on YouTube
- !r <term>: Topic and community search on Reddit
- !so <term>: Developer Q&A on Stack Overflow
- !mdn <term>: Web developer API reference on MDN
- !doc <term>: Target this local document vault specifically`
    });

    this.addDocument({
      id: 'doc-security-tips',
      title: 'Hardening Browser Privacy: Best Practices 2026',
      tags: ['security', 'privacy', 'firefox', 'tor', 'brave'],
      content: `Recommended browser configurations for maximum anonymity:
1. Strip Referrer Headers: Ensure network.http.sendRefererHeader is set to 0 or 1.
2. Enable DNS over HTTPS (DoH): Use Quad9 (9.9.9.9) or Cloudflare privacy-first DNS resolvers.
3. Reject Third-Party Cookies: Block cross-site cookies and disable WebRTC local IP broadcasting.`
    });
  }
}

const vaultEngine = new BM25Engine();

module.exports = {
  vaultEngine,
  BM25Engine
};
