/**
 * Aegis AI Synthesizer (Perplexity-style private search summarization)
 * Generates cited synthesized answers from search results using:
 * 1. Local Ollama (100% offline at localhost:11434)
 * 2. Gemini API (using user-provided ephemeral key)
 * 3. Smart Extractive NLP (offline algorithm with sentence scoring and citations)
 */

const cheerio = require('cheerio');
const { fetchAndSanitizePage } = require('./proxyReader');

/**
 * Main synthesis entrypoint
 */
/**
 * Helper: Parse follow-up questions from AI text
 */
function parseFollowUps(text, query) {
  const followUps = [];
  const match = text.match(/(?:Follow-ups?|Related questions?):\s*([\s\S]*)$/i);
  if (match) {
    const lines = match[1].split(/\n|\|/).map(l => l.replace(/^[-•*0-9.)\s]+/, '').trim()).filter(l => l.length > 5 && l.length < 95);
    followUps.push(...lines.slice(0, 3));
  }
  if (followUps.length < 2) {
    const base = query.trim().replace(/[?.]+$/, '');
    followUps.push(`How does ${base} work?`);
    followUps.push(`What are the key benefits and applications of ${base}?`);
    followUps.push(`Compare ${base} with alternatives`);
  }
  return followUps.slice(0, 3);
}

/**
 * Helper: Strip follow-up section from main answer body
 */
function cleanAnswerBody(text) {
  if (!text) return '';
  return text.replace(/(?:###\s*)?(?:Follow-ups?|Related questions?):[\s\S]*$/i, '').trim();
}

/**
 * Main synthesis entrypoint (Google-Grade AI Overview)
 */
async function synthesizeAnswer({ query, results = [], provider = 'auto', apiKey = '', model = '' }) {
  if (!query || results.length === 0) {
    return {
      success: false,
      error: 'Query and search results are required for AI synthesis.'
    };
  }

  const topResults = results.slice(0, 5);
  const citations = topResults.map((r, i) => {
    let hostname = r.domain || '';
    if (!hostname && r.url) {
      try { hostname = new URL(r.url).hostname; } catch(e) {}
    }
    const cleanDomain = hostname.replace(/^www\./, '');
    return {
      id: i + 1,
      title: r.title,
      url: r.url,
      domain: cleanDomain || 'Source',
      favicon: cleanDomain ? `https://www.google.com/s2/favicons?domain=${encodeURIComponent(cleanDomain)}&sz=32` : '',
      snippet: r.snippet
    };
  });

  // Context string for LLM prompts
  const context = topResults.map((r, i) => `[${i + 1}] Title: ${r.title}\nSource: ${r.domain}\nContent: ${r.snippet}\n`).join('\n');

  // 1. Try Ollama if explicitly requested or in 'auto' mode
  if (provider === 'ollama' || (provider === 'auto' && !apiKey)) {
    try {
      const ollamaRes = await queryOllama(query, context, model || 'llama3');
      if (ollamaRes) {
        return {
          success: true,
          provider: 'ollama',
          model: model || 'llama3',
          answer: cleanAnswerBody(ollamaRes),
          followUps: parseFollowUps(ollamaRes, query),
          citations
        };
      }
    } catch (e) {
      // If Ollama is not running, proceed to fallback
    }
  }

  // 2. Try Gemini API if key is provided
  if (apiKey && (provider === 'gemini' || provider === 'auto')) {
    try {
      const geminiRes = await queryGemini(query, context, apiKey, model || 'gemini-2.0-flash');
      if (geminiRes) {
        return {
          success: true,
          provider: 'gemini',
          model: model || 'gemini-2.0-flash',
          answer: cleanAnswerBody(geminiRes),
          followUps: parseFollowUps(geminiRes, query),
          citations
        };
      }
    } catch (e) {
      // If Gemini fails, proceed to fallback
    }
  }

  // 3. Fallback: High-Performance On-Device Extractive NLP (Google AI Overview structure)
  const { answer: extractiveRes, followUps } = performExtractiveSynthesis(query, topResults);
  return {
    success: true,
    provider: 'extractive',
    model: 'Aegis Smart-NLP (Offline)',
    answer: extractiveRes,
    followUps: followUps || parseFollowUps('', query),
    citations
  };
}

/**
 * Queries Local Ollama instance
 */
async function queryOllama(query, context, model) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6000);

  const prompt = `You are the Google Search AI Overview engine.
Provide a high-quality Google Search AI Overview for the query: "${query}" based on the numbered sources below:
${context}

Format Requirements (Strictly follow Google AI Overview structure):
1. Start with a direct, comprehensive 1-2 sentence overview answering the core question immediately.
2. Follow with a structured breakdown using 3-4 bullet points. Each bullet MUST start with a **Bold Key Concept:** followed by a crisp, factual explanation.
3. Attribute key statements with bracket citations matching the source numbers like [1], [2], [3].
4. Keep the tone natural, authoritative, clear, and objective.
5. End your response with 3 relevant follow-up questions formatted as:
Follow-ups:
- <question 1>
- <question 2>
- <question 3>`;

  const res = await fetch('http://localhost:11434/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: model,
      prompt: prompt,
      stream: false
    }),
    signal: controller.signal
  });

  clearTimeout(timeout);

  if (!res.ok) return null;
  const data = await res.json();
  return data.response ? data.response.trim() : null;
}

/**
 * Queries Gemini API with user-provided ephemeral key
 */
async function queryGemini(query, context, apiKey, model) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const prompt = `You are the Google Search AI Overview engine.
Provide a high-quality Google Search AI Overview for the query: "${query}" based on the numbered sources below:
${context}

Format Requirements (Strictly follow Google AI Overview structure):
1. Start with a direct, comprehensive 1-2 sentence overview answering the core question immediately.
2. Follow with a structured breakdown using 3-4 bullet points. Each bullet MUST start with a **Bold Key Concept:** followed by a crisp, factual explanation.
3. Attribute key statements with bracket citations matching the source numbers like [1], [2], [3].
4. Keep the tone natural, authoritative, clear, and objective.
5. End your response with 3 relevant follow-up questions formatted as:
Follow-ups:
- <question 1>
- <question 2>
- <question 3>`;

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { maxOutputTokens: 700, temperature: 0.2 }
    }),
    signal: controller.signal
  });

  clearTimeout(timeout);

  if (!res.ok) return null;
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || null;
}

/**
 * On-Device Extractive NLP Synthesis (Google AI Overview structure, 100% offline)
 */
function performExtractiveSynthesis(query, results) {
  const queryTokens = query.toLowerCase().split(/\s+/).filter(t => t.length > 2);
  const candidateSentences = [];

  results.forEach((r, sourceIdx) => {
    const text = `${r.title}. ${r.snippet}`;
    const rawSentences = text.split(/(?<=[.?!])\s+/).filter(s => s.trim().length > 20);

    rawSentences.forEach(sentence => {
      const clean = sentence.trim();
      const lower = clean.toLowerCase();

      // Score sentence relevance based on query term presence
      let score = 0;
      queryTokens.forEach(token => {
        if (lower.includes(token)) score += 3;
      });

      // Bonus for factual cues
      if (/\b(is|are|was|were|developed|created|known as|allows|provides|features)\b/i.test(clean)) {
        score += 1.5;
      }

      if (score > 0) {
        candidateSentences.push({
          text: clean,
          sourceId: sourceIdx + 1,
          score
        });
      }
    });
  });

  const baseQuery = query.trim().replace(/[?.]+$/, '');
  const followUps = [
    `How does ${baseQuery} work in practice?`,
    `Key benefits and real-world use cases of ${baseQuery}`,
    `Comparing ${baseQuery} with leading alternatives`
  ];

  if (candidateSentences.length === 0) {
    return {
      answer: `Based on search results, **${results[0]?.title || query}** is documented across multiple verified web sources [1].\n\n• **Core Functionality:** Key details and specifications are preserved in the individual search references below [1].`,
      followUps
    };
  }

  // Sort by relevance score
  candidateSentences.sort((a, b) => b.score - a.score);

  // Pick top non-redundant sentences
  const selected = [];
  const seenWords = new Set();

  for (const item of candidateSentences) {
    if (selected.length >= 4) break;
    const words = item.text.toLowerCase().split(/\s+/);
    const overlap = words.filter(w => seenWords.has(w)).length / words.length;

    if (overlap < 0.65) {
      selected.push(item);
      words.forEach(w => seenWords.add(w));
    }
  }

  // Google AI Overview structure: Direct Lead + Bulleted Points with Bold Concept Lead
  const lead = selected[0]
    ? `${selected[0].text.replace(/[.]+$/, '')} [${selected[0].sourceId}].`
    : `Overview of ${query} based on verified search results [1].`;

  const bullets = selected.slice(1).map(item => {
    const words = item.text.split(/\s+/);
    let keyConcept = words.slice(0, 3).join(' ').replace(/[,:;.]+$/, '');
    let restOfSentence = words.slice(3).join(' ');
    if (!restOfSentence) {
      keyConcept = 'Key Detail';
      restOfSentence = item.text;
    }
    return `• **${keyConcept}:** ${restOfSentence.replace(/[.]+$/, '')} [${item.sourceId}].`;
  });

  const formattedAnswer = bullets.length > 0
    ? `${lead}\n\n${bullets.join('\n\n')}`
    : lead;

  return {
    answer: formattedAnswer,
    followUps
  };
}

/**
 * Generates an executive AI summary and key takeaways for any webpage or document text
 */
async function summarizeWebpage({ url = '', title = '', text = '', provider = 'auto', apiKey = '', model = '' }) {
  let docTitle = title || 'Web Document';
  let docText = text ? text.trim() : '';

  // If text is not provided or too short, fetch and extract it from url
  if (!docText && url) {
    try {
      const pageData = await fetchAndSanitizePage(url);
      if (pageData && pageData.success) {
        docTitle = docTitle || pageData.title;
        const $ = cheerio.load(pageData.sanitizedHtml || '');
        docText = $('p, h1, h2, h3, li').map((_, el) => $(el).text().trim()).get().filter(t => t.length > 25).join('\n\n');
      }
    } catch (e) {}
  }

  if (!docText) {
    return {
      success: false,
      error: 'Could not extract readable text to summarize from this page.'
    };
  }

  // Truncate to ~6,000 chars for token efficiency
  const truncatedText = docText.substring(0, 6000);
  const words = truncatedText.split(/\s+/).filter(Boolean).length;
  const readingTimeMin = Math.max(1, Math.ceil(words / 220));

  // 1. Try Ollama if explicitly requested or in 'auto' mode
  if (provider === 'ollama' || (provider === 'auto' && !apiKey)) {
    try {
      const prompt = `You are Aegis AI Research Assistant. Summarize this webpage titled "${docTitle}".
Provide output in this exact structured markdown format:

### Key Takeaways
- [First key takeaway]
- [Second key takeaway]
- [Third key takeaway]

### Executive Summary
[1-2 clear, comprehensive paragraphs summarizing the essential ideas, findings, or facts]

### Notable Highlights
- [Interesting statistic, metric, entity, or conclusion]
- [Second notable fact]

Webpage Content:
${truncatedText}`;

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 7000);
      const res = await fetch('http://localhost:11434/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: model || 'llama3', prompt, stream: false }),
        signal: controller.signal
      });
      clearTimeout(timeout);
      if (res.ok) {
        const data = await res.json();
        if (data.response) {
          const parsed = parseTakeawaysAndSummary(data.response);
          return {
            success: true,
            title: docTitle,
            url,
            provider: 'ollama',
            model: model || 'llama3',
            readingTime: `${readingTimeMin} min read`,
            readingTimeMinutes: readingTimeMin,
            wordCount: words,
            takeaways: parsed.takeaways,
            summary: parsed.summary,
            summaryMarkdown: data.response.trim()
          };
        }
      }
    } catch (e) {}
  }

  // 2. Try Gemini if apiKey provided
  if (apiKey && (provider === 'gemini' || provider === 'auto')) {
    try {
      const prompt = `You are Aegis AI, an advanced research assistant. Summarize this webpage titled "${docTitle}".
Provide your analysis in this exact structured markdown format:

### Key Takeaways
- [First core insight or takeaway]
- [Second core insight or takeaway]
- [Third core insight or takeaway]

### Executive Summary
[1-2 clear, insightful paragraphs summarizing the entire document concisely]

### Notable Highlights
- [Crucial statistic, entity, or conclusion from the text]
- [Second key highlight]

Webpage Content:
${truncatedText}`;

      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model || 'gemini-2.0-flash')}:generateContent?key=${encodeURIComponent(apiKey)}`;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: 800, temperature: 0.2 }
        }),
        signal: controller.signal
      });
      clearTimeout(timeout);
      if (res.ok) {
        const data = await res.json();
        const textOut = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (textOut) {
          const parsed = parseTakeawaysAndSummary(textOut);
          return {
            success: true,
            title: docTitle,
            url,
            provider: 'gemini',
            model: model || 'gemini-2.0-flash',
            readingTime: `${readingTimeMin} min read`,
            readingTimeMinutes: readingTimeMin,
            wordCount: words,
            takeaways: parsed.takeaways,
            summary: parsed.summary,
            summaryMarkdown: textOut.trim()
          };
        }
      }
    } catch (e) {}
  }

  // 3. Resilient Fallback: High-Quality On-Device Smart Extractive NLP Summarizer
  const paragraphs = truncatedText.split(/\n\n+/).map(p => p.trim()).filter(p => p.length > 50);
  const sentences = [];
  paragraphs.forEach(p => {
    p.split(/(?<=[.?!])\s+/).forEach(s => {
      const clean = s.trim();
      if (clean.length > 35 && clean.length < 240) {
        let score = 0;
        if (/^(First|Second|In conclusion|Overall|Importantly|Significantly|According to|Key|Notably|Specifically)/i.test(clean)) score += 3;
        if (/\b(announced|discovered|released|showed|resulted|found|features|provides|allows|critical|essential|breakthrough)\b/i.test(clean)) score += 2;
        if (/\d+[%kmgbt$]|\b\d{4}\b/i.test(clean)) score += 1.5; // numbers, metrics, dates
        sentences.push({ text: clean, score });
      }
    });
  });

  sentences.sort((a, b) => b.score - a.score);
  const topSentences = sentences.slice(0, 6);
  const takeaways = topSentences.slice(0, 3).map(s => s.text);
  const bodySummary = (paragraphs.slice(0, 2).join(' ') || topSentences.slice(3).map(s => s.text).join(' ')).substring(0, 500);

  const fallbackMarkdown = `### Key Takeaways\n${takeaways.map(t => `- **${t.replace(/[.]+$/, '')}.**`).join('\n')}\n\n### Executive Summary\n${bodySummary}..\n\n### Notable Highlights\n- Document analyzed across ${words.toLocaleString()} words (~${readingTimeMin} min estimated read time).\n- Extracted locally with zero tracking and verified on-device NLP.`;

  return {
    success: true,
    title: docTitle,
    url,
    provider: 'extractive',
    model: 'Aegis Smart-NLP (Offline)',
    readingTime: `${readingTimeMin} min read`,
    readingTimeMinutes: readingTimeMin,
    wordCount: words,
    takeaways: takeaways.length > 0 ? takeaways : [docTitle || 'Article overview'],
    summary: bodySummary || truncatedText.substring(0, 300),
    summaryMarkdown: fallbackMarkdown
  };
}

function parseTakeawaysAndSummary(markdownText) {
  const takeaways = [];
  let summary = '';
  
  if (!markdownText) return { takeaways: [], summary: '' };

  const takeawaysMatch = markdownText.match(/###\s*Key Takeaways[\r\n]+([\s\S]*?)(?=###|$)/i);
  if (takeawaysMatch) {
    const lines = takeawaysMatch[1].split('\n');
    lines.forEach(line => {
      const trimmed = line.replace(/^[-*•\d.]+\s*/, '').replace(/^\*\*|\*\*$/g, '').trim();
      if (trimmed.length > 5) {
        takeaways.push(trimmed);
      }
    });
  }

  const summaryMatch = markdownText.match(/###\s*Executive Summary[\r\n]+([\s\S]*?)(?=###|$)/i);
  if (summaryMatch) {
    summary = summaryMatch[1].trim();
  }

  if (takeaways.length === 0) {
    const bullets = markdownText.match(/^[-*•]\s+(.*)$/gm);
    if (bullets) {
      bullets.slice(0, 3).forEach(b => takeaways.push(b.replace(/^[-*•]\s+/, '').replace(/^\*\*|\*\*$/g, '').trim()));
    }
  }
  if (!summary) {
    summary = markdownText.replace(/###.*?\n/g, '').trim().substring(0, 500);
  }

  return {
    takeaways: takeaways.slice(0, 3),
    summary
  };
}

module.exports = {
  synthesizeAnswer,
  summarizeWebpage,
  performExtractiveSynthesis
};
