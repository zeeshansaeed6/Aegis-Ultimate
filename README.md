# 🛡️ Aegis Private Browser & Search Suite

> **A sovereign, zero-telemetry private search engine and standalone Chromium desktop browser engineered by Zeeshan Saeed.**  
> *Sub-5ms BM25 local indexing, isolated multi-tab proxy browser, multi-source meta-search, Perplexity-style cited AI synthesis, autonomous web crawler, and Google Chrome parity.*

---

[![Author: Zeeshan Saeed](https://img.shields.io/badge/Author-Zeeshan%20Saeed-059669.svg?style=for-the-badge&logo=github)](https://github.com/zeeshansaeed6)
[![License: MIT](https://img.shields.io/badge/License-MIT-3b82f6.svg?style=for-the-badge)](LICENSE)
[![Runtime: Node.js](https://img.shields.io/badge/Node.js-v20%2B-22c55e.svg?style=for-the-badge&logo=node.js)](https://nodejs.org)
[![Desktop: Electron](https://img.shields.io/badge/Desktop-Electron%20v44-47848F.svg?style=for-the-badge&logo=electron)](https://electronjs.org)
[![Telemetry: 0% RAM Only](https://img.shields.io/badge/Telemetry-0%25%20Volatile%20RAM-10b981.svg?style=for-the-badge)](#-zero-telemetry-privacy-guarantees)
[![Algorithm: BM25 Okapi](https://img.shields.io/badge/Ranking-BM25%20Okapi-8b5cf6.svg?style=for-the-badge)](#-pillar-2-autonomous-native-search-engine--web-crawler-studio)
[![Test Suite: 10/10 Passing](https://img.shields.io/badge/Tests-87%2F87%20Passing%20(100%25)-emerald.svg?style=for-the-badge)](#-automated-test-suite--quality-assurance)

---

## 👨‍💻 Created & Engineered by Zeeshan Saeed

**Aegis** was architected and built by **Zeeshan Saeed** as an open-source, user-sovereign alternative to the surveillance ecosystem of commercial search engines and big-tech browsers.

Modern search engines track your search history, log your IP address, profile your interests, and auction your attention to commercial advertisers. Conventional browsers transmit browsing telemetry, synchronize tab histories to cloud accounts, and permit pervasive third-party canvas fingerprinting.

**Aegis eliminates this paradigm entirely.** Built with an ephemeral in-memory runtime, an isolated Chromium multi-tab browser, local BM25 indexing, and multi-threaded meta-search, Aegis guarantees that **zero bytes of search history or identity profiles are ever written to disk or sent to surveillance servers.**

---

## ⚡ Aegis vs. Google & Conventional Browsers

| Feature / Dimension | Google Search & Google Chrome | DuckDuckGo / Brave | Aegis (by Zeeshan Saeed) |
| :--- | :--- | :--- | :--- |
| **Search Query Retention** | Permanent query logs tied to Google Account & IP. | Ephemeral queries, but third-party syndicated results. | **100% Volatile RAM Only**: Zero database, zero disk logging. |
| **Browser Environment** | Chrome collects user telemetry, clicks, and tab states. | Brave/Brave Shields blocking, but standard browser engine. | **Isolated Sandboxed Browser**: In-app Chromium tabs with automatic cookie/tracker stripping and 1-click burn. |
| **Search Ranking & Ads** | Top results dominated by sponsored ads and SEO farms. | Displays sponsored ads and affiliate links. | **Pure Organic Search**: Zero ads, zero sponsored links, deterministic multi-engine aggregation. |
| **AI Summarization** | Monetized Gemini AI connected to personal identity. | DuckAssist / Leo AI hosted on proprietary cloud servers. | **Perplexity-Style Cited AI**: Grounded bracket citations `[1]`, `[2]` powered by local Ollama, Gemini, or offline NLP. |
| **Deep Research Mode** | Paid Gemini Advanced / Perplexity Pro subscription required. | Not available or paywalled. | **Built-in Autonomous Deep Research**: Decomposes topics into 4 concurrent research angles and outputs publication dossiers. |
| **Native Web Crawler** | Proprietary Googlebot crawler and closed index. | Dependent on Bing / Google indexes. | **Autonomous Crawler Studio**: Crawl, tokenize, and rank pages into an in-memory inverted index (100% offline). |
| **Local Knowledge Vault** | Google Drive / NotebookLM (cloud-hosted, indexed for training). | Local browser bookmarks only. | **In-Memory BM25 Document Vault**: Sub-5ms search over local notes, markdown, and code with auto folder watching. |
| **Historical Archives** | Google Cache discontinued / removed. | Third-party extensions required. | **Built-in Time Machine (`Alt+H`)**: 1-click fallback across Wayback Machine, Archive.today, and Google Cache. |
| **Desktop Integration** | Browser shortcuts only. | Standard window controls. | **System-Wide Spotlight Hotkey (`Alt+Space`)**: Summon Aegis omnibox from any app on your operating system. |
| **Software Ownership** | Alphabet Inc. (Commercial advertising conglomerate). | For-profit corporation. | **Open Source (MIT)**: Sovereign, auditable, self-hostable. |

---

## 🏛️ System Architecture

```mermaid
graph TD
    User([User Query / Omnibox / Hotkey]) --> Router[Intent, Bang & Entity Classifier]

    subgraph "Core Search Engines"
        Router -->|Web Search| MetaAggregator[Multi-Threaded Meta-Search Engine]
        Router -->|!doc / Local| BM25Vault[In-Memory BM25 Document Vault]
        Router -->|!own / Native| NativeEngine[Autonomous Native Inverted Index]
        Router -->|!onion| TorEngine[Ahmia Dark Web Gateway]
        Router -->|calc:, unit:, sha256:, weather| InstantAnswers[Google-Grade Instant Tools]
        Router -->|!w, !gh, !yt, !so, !arxiv| DirectBangs[20+ Bang Dispatcher]
    end

    subgraph "Privacy Shield Pipeline"
        MetaAggregator --> SpamFilter[Anti-Spam & SEO Content Farm Filter]
        SpamFilter --> Sanitizer[Cheerio DOM Stripper & Tracker Purge]
        Sanitizer --> ReferrerShield[Referrer-Policy: no-referrer & Anti-Leak Headers]
        Sanitizer --> MediaProxy[Zero-Leak Proxied Image Streamer]
    end

    subgraph "AI Synthesis & Intelligence"
        ReferrerShield --> AISynthesizer[Perplexity-Style Cited AI Synthesizer]
        AISynthesizer -->|Option A| OllamaEngine[Local Offline Ollama: Llama 3 / Mistral]
        AISynthesizer -->|Option B| GeminiEngine[Google Gemini API: 2.0 Flash / Pro]
        AISynthesizer -->|Option C| ExtractiveNLP[Offline Smart Extractive NLP]
        ReferrerShield --> DeepResearch[Autonomous Deep Research Agent]
    end

    subgraph "Sandboxed Browser Runtime"
        ReferrerShield --> SandboxedBrowser[Aegis Multi-Tab Chromium Browser]
        SandboxedBrowser --> TabIsolation[Per-Tab Cookie Isolation & Burner]
        SandboxedBrowser --> ExtensionEngine[Chrome Extensions Engine: uBlock / Dark Reader]
        SandboxedBrowser --> DownloadManager[Chrome-Grade Download Interceptor]
        SandboxedBrowser --> SplitView[Dual-Pane Split Screen Browsing]
        SandboxedBrowser --> ReaderPro[Reader Pro with Audio Narration TTS]
        SandboxedBrowser --> TimeMachine[Wayback Machine & Web Archive Time Machine]
    end

    subgraph "Display & Access Layer"
        SandboxedBrowser --> ElectronApp[Native Desktop Application]
        SandboxedBrowser --> WebPWA[Web Server Mode / PWA]
        GlobalHotkeys[Global Desktop Spotlight: Alt+Space] --> ElectronApp
    end
```

---

## 🚀 Quick Start (1-Click Launch)

### Option 1: Standalone Desktop Application (Recommended)
Double-click **`Launch-Aegis.bat`** in the repository root, or run:
```bash
npm start
# or: npm run app
```
*Launches the dedicated Aegis Desktop Window with native controls, multi-tab sandboxed browsing, Chrome extensions, global hotkey listener, and automated backend lifecycle.*

### Option 2: Web Server Mode (Headless / PWA)
Double-click **`Launch-Aegis-Web.bat`**, or run:
```bash
npm run server
```
Then navigate to **`http://localhost:3000`** in any web browser. Aegis is also installable as a **Progressive Web App (PWA)** with offline caching and OpenSearch integration.

---

## 🌟 The 8 Flagship Pillars of Aegis

### 🖥️ Pillar 1: Standalone Desktop Browser (Chromium & Electron)
Aegis is not just a search engine website—it is a full-fledged standalone desktop browser that eliminates reliance on Google Chrome:
- **Native Chromium Guest WebViews**: Powered by Electron's isolated `<webview>` architecture.
- **Arc-Style Workspaces**: Organize tabs across **Personal**, **Work**, **Research**, and **Dev** spaces.
- **Split-Screen Dual Browsing (`Alt+S` or `Ctrl+\`)**: Browse two web pages or search results side-by-side with synchronized viewport controls.
- **Zero-Leak Navigation Guarantee**: All external links clicked from search results are strictly intercepted and routed into sandboxed browser tabs; zero links escape to external browsers.
- **Native Google Chrome Downloads Manager**: In-app download shelf tracking real-time download speed, progress percentage, pause/resume controls, and native OS folder reveals.
- **Chrome Extensions Engine**: Load any unpacked Chrome extension with a `manifest.json`. Includes a pre-vetted catalog featuring **uBlock Origin**, **Dark Reader**, **Privacy Badger**, and **React Developer Tools**.
- **Anti-Bot & OAuth Login Parity**: Disarms `navigator.webdriver` automation signatures and spoofing realistic Google Chrome User-Agents (`Chrome/131.0.0.0`), enabling seamless sign-in with **Google**, **Apple**, **GitHub**, **Microsoft**, and **Discord**.
- **Clean PDF & Screenshot Exporters**: 1-click clean PDF printing and full-page PNG screenshot capture directly saved to your downloads directory.

---

### 🕷️ Pillar 2: Autonomous Native Search Engine & Web Crawler Studio
Aegis includes its own autonomous search engine and crawler—you can crawl any website or documentation and build your own private search engine from scratch:
- **Autonomous Crawler Spider**: Configure seed URLs, crawl depth, max page count, same-domain scoping, and politeness delay (`/api/crawler/start`).
- **Deterministic BM25 Okapi Scoring**: Inverted index ranking featuring term frequency-inverse document frequency (TF-IDF), token normalization, and English stopword elimination.
- **Field Boosting & Authority Graph**: Weighted scoring prioritizing page titles (`3.0x`), meta descriptions (`2.0x`), and body content (`1.0x`), augmented by incoming internal link authority counters.
- **Dynamic Relevance Snippets**: Extracts dynamic sentence snippets highlighting query keywords with `<mark>` tags.
- **100% Offline Query Mode (`!own` or `cat=own`)**: Query your crawled index completely disconnected from the internet.

---

### 🔍 Pillar 3: Multi-Engine Meta-Search Aggregator & Focus Lenses
Aegis aggregates results across multiple search backends concurrently without tracking cookies:
- **Multi-Source Aggregation**: Fetches and unifies organic results across independent search providers with parallel timeout handling.
- **10 Curated Focus Lenses**:
  - 🎓 **Academic**: arXiv, Nature, ScienceDirect, PubMed, Springer, IEEE.
  - 💻 **Developer**: GitHub, Stack Overflow, MDN, Dev.to, Hacker News, GitLab.
  - 🛡️ **Privacy & FOSS**: EFF, F-Droid, PrivacyGuides, Tor Project, Mozilla.
  - 📰 **News**: Reuters, AP News, BBC, Guardian, NPR, DW.
  - ⚙️ **Tech & Hardware**: Ars Technica, AnandTech, Tom's Hardware, Phoronix.
  - 📚 **Local Vault**: Direct query against your private indexed documents.
  - ⚡ **Own Search**: Autonomous native crawled index.
  - 🧅 **Tor Onion**: Deep dark web search via Ahmia hidden services.
  - 🎨 **Images**: Visual gallery with IP-shielded proxy streaming.
  - 🎬 **Videos**: Video search aggregator.
- **Custom Lens Builder**: Create and name custom search lenses with custom domain whitelists saved in local storage.
- **Power Operators**: Full support for `site:domain.com`, `filetype:pdf`, time ranges (`d`, `w`, `m`, `y`), and region filtering.
- **Anti-Spam & SEO Filter**: Automatically detects and strips content farms, scraper blogs, and SEO clickbait rings. Includes an interactive domain blocking tool (`/api/spam/block`).

---

### 📚 Pillar 4: In-Memory BM25 Document Vault & Local Folder Watcher
A lightning-fast private knowledge base built directly into your search engine:
- **Sub-5ms Query Latency**: Instant full-text search across personal markdown notes, code snippets, research articles, and text files.
- **Local Folder Auto-Watcher**: Select any directory on your computer (e.g. your Obsidian vault, research folder, or code repo); Aegis watches for file changes and auto-indexes updates in real time (`/api/vault/watch`).
- **Sovereign Bookmarks Manager**: Store bookmarks locally with client-side **AES-GCM encryption**, categorized tags, and **1-click Netscape HTML export** compatible with Chrome, Brave, and Firefox.
- **Research Scratchpad (`Alt+N`)**: Multi-tab floating research scratchpad for jotting down notes while browsing.
- **Dossier Exporter**: Export curated research results in structured **Markdown**, **JSON**, or **CSV** formats, or copy clean Markdown citation links.

---

### 🧠 Pillar 5: Perplexity-Style Cited AI Synthesis & Deep Research Agent
Synthesize answers from multiple sources with factual grounding and verifiable citations:
- **Grounded Inline Citations**: Every factual statement includes bracket citations `[1]`, `[2]` linking directly to verified source URLs with favicons and source domains.
- **Tri-Engine Support**:
  1. **Local Ollama (100% Offline)**: Direct integration with `localhost:11434` running Llama 3, Mistral, Gemma, or any custom model with zero data transmission.
  2. **Google Gemini API**: High-speed cloud synthesis via user-supplied ephemeral API keys (Gemini 2.0 Flash / Pro).
  3. **Offline Extractive NLP**: Heuristic sentence scoring algorithm that works out of the box with zero configuration or API keys.
- **Autonomous Deep Research Agent (Perplexity Pro / Gemini Deep Research Parity)**:
  - Decomposes any complex topic into 4 concurrent research angles:
    1. 🏛️ *Core Fundamentals & Architecture*
    2. 📊 *Technical Specs & Performance Benchmarks*
    3. ⚖️ *Advantages, Tradeoffs & Challenges*
    4. 🚀 *Recent Innovations & Future Outlook*
  - Concurrently queries multi-source indexes, ranks authoritative domains, and compiles an executive **Markdown Intelligence Dossier** with tables and full citations.
- **In-Page AI Summarizer (`Alt+Z`)**: 1-click executive TL;DR, 3 key takeaways, and action items generated for any active webpage in the browser.

---

### ⚡ Pillar 6: Google Search Parity — 15+ Instant Tools & Knowledge Graph
Aegis delivers complete feature parity with Google's instant widgets—executed with zero telemetry:
1. 🧮 **Interactive Google Calculator**: Full mathematical engine supporting arithmetic, trigonometry, logarithms, powers (`calc: 12 * (4 + 5)` or interactive virtual keypad).
2. 📐 **Interactive 2-Way Unit Converter**: Length, Weight, Temperature (°C/°F), and Digital Storage (Bytes, KB, MB, GB, TB).
3. ⛅ **Live Weather Card**: Real-time conditions, temperature, humidity, wind speed, precipitation, and 5-day forecasts.
4. 📖 **Google-Grade Dictionary & Thesaurus**: Phonetic spelling, grammatical parts of speech, definitions, example sentences, and synonyms (`define serendipity`).
5. 💱 **Currency Exchange & Crypto Quotes**: Live conversions for USD, EUR, GBP, JPY, INR, CAD, AUD, CHF, CNY, BTC, and ETH (`100 usd to eur`, `1 btc to usd`).
6. ⏱️ **Stopwatch & Interactive Countdown Timer**: Clean millisecond stopwatch and configurable countdown timer (`stopwatch`, `timer 5m`).
7. 🗺️ **Interactive OpenStreetMap Explorer**: Embeds interactive geographic maps without Google Maps tracking cookies (`map of Tokyo`).
8. 👨‍💻 **Developer Cheat Sheets**: Instant syntax references for `git undo`, `git discard`, `chmod 755`, `http 404`, and HTTP error codes.
9. 🔐 **Zero-Knowledge Password & Diceware Generator**: Cryptographically secure password generation with entropy calculations generated purely in volatile memory (`password 24`, `passphrase 5`).
10. 🧱 **JSON Formatter & Syntax Validator**: Prettifies and validates raw JSON payloads (`json: {"name": "Aegis"}`).
11. 🔗 **URL Encoder & Decoder**: Zero-network URL escaping (`urlencode: Hello World!`).
12. 🎨 **Color Inspector & Converter**: HEX to RGB and HSL conversion with live swatch previews (`#10b981 to rgb`).
13. 🛡️ **Cryptographic Hash Suite**: Generate SHA-256, MD5, Base64 encode/decode, UUID v4, and QR codes (`sha256: secret`, `base64 decode ...`, `uuid`).
14. 🌐 **World Clock & Timezone Lookups**: Instant local time display for major global cities (`time in Tokyo`, `time in London`).
15. 🏛️ **Knowledge Graph Panels**: Detailed entity sidebars for historical figures, operating systems, programming languages, aerospace, and Aegis itself.
16. 🚀 **20+ Bang Shortcuts**: Instant search routing (`!w` Wikipedia, `!gh` GitHub, `!yt` YouTube, `!so` Stack Overflow, `!arxiv` arXiv, `!npm` npm, `!doc` Local Vault, `!onion` Tor).

---

### 🛡️ Pillar 7: Privacy Shield, Anonymous Proxy & Web Time Machine
- **Tracker-Stripping Anonymous Proxy Reader**: Renders third-party web pages while purging tracking pixels, analytics scripts (`gtag`, `facebook-pixel`, `hotjar`), surveillance cookies, and intrusive iframes.
- **IP-Shielded Media Streamer**: Proxies external images through `/api/proxy/image` so destination servers never log your IP address when viewing search results.
- **Wayback Machine & Time Machine (`Alt+H`)**: Instant historical snapshot lookups via Wayback Machine, Archive.today, and Google Cache to view deleted content or bypass soft paywalls.
- **Web Highlighter & Marginal Annotations**: Highlight text on web pages using 4 radiant pigments (Yellow, Emerald, Cyan, Magenta) and write marginal notes that auto-sync to your Research Scratchpad.
- **Reader Pro with Web Speech TTS**: Clean distraction-free reading mode with customizable typography, dark/sepia/white themes, and native voice audio narration.
- **Live Privacy Lab & Client Entropy Auditor**: In-browser testing suite verifying WebRTC candidate leaks, Canvas fingerprint hash entropy, AudioContext entropy, and DNS suppression.

---

### 🎯 Pillar 8: Global Desktop Spotlight & Command Palette
- **System-Wide Spotlight Hotkey (`Alt+Space` or `Ctrl+Alt+Space`)**: Summon Aegis instantly from any application on Windows, macOS, or Linux. Perform math, evaluate expressions, or execute bangs without switching windows.
- **Universal Command Palette (`Ctrl+K` or `Cmd+K`)**: Quick-launcher for tools, focus lenses, bookmarks, dev utilities, and crawler controls.
- **OpenSearch 1.1 Support**: Install Aegis as your browser's default search engine (`/opensearch.xml`) with instant autocomplete suggestions from `/api/suggest`.

---

## ⌨️ Complete Keyboard Shortcuts Reference

| Shortcut | Scope | Action |
| :--- | :--- | :--- |
| `Alt + Space` / `Ctrl + Alt + Space` | **System-Wide** | **Global Desktop Spotlight Quick Search** (Summons Aegis from any app) |
| `Ctrl + K` / `Cmd + K` | Global | Universal Command Palette (Tools, Lenses, Shortcuts, Settings) |
| `/` | Search View | Focus and select search omnibox |
| `Alt + H` | Browser Tab | Time Machine: Wayback & Web Archive Snapshot Lookup |
| `Alt + S` / `Ctrl + \` | Browser Tab | Toggle Dual-Pane Split-Screen Browsing |
| `Alt + Z` | Browser Tab | AI Page Summarizer (Instant TL;DR & Key Takeaways) |
| `Alt + N` | Global | Toggle Floating Research Scratchpad |
| `Ctrl + T` | Browser | Open New Sandboxed Browser Tab |
| `Ctrl + W` | Browser | Close Active Browser Tab |
| `Ctrl + Shift + K` | Browser | **Burn Active Tab Session** (Shred cookies, cache, and history) |
| `Ctrl + Shift + B` | Global | Launch Sandboxed Private Browser Window |
| `Ctrl + Shift + C` | Global | Open Autonomous Web Crawler Studio |
| `Ctrl + Shift + X` | Global | **Emergency Panic Wipe** (Purge volatile memory and reset view) |
| `F12` / `Ctrl + Shift + I` | Desktop | Toggle Developer Tools |

---

## 🧪 Automated Test Suite & Quality Assurance

Aegis features comprehensive, automated end-to-end and unit test suites across all 10 core subsystems:

```bash
npm test
```

### Verified Test Results (87/87 Passing — 100% Success Rate):
- ✅ **Core Engine Suite** (`test_engine.js`): 27/27 passed (Instant tools, calculators, units, hashers, lenses).
- ✅ **HTTP Integration Suite** (`test_http.js`): 12/12 passed (Server routes, headers, OpenSearch, privacy endpoints).
- ✅ **Native Inverted Index Suite** (`test_native_engine.js`): 6/6 passed (BM25 scoring, field boosting, link authority graph).
- ✅ **Sandboxed Browser Suite** (`test_browser_proxy.js`): 6/6 passed (SSRF protection, tracker sanitization, session burn).
- ✅ **Google Parity Suite** (`test_google_parity.js`): 8/8 passed (Calculator, unit converter, weather, dictionary, timer, maps).
- ✅ **Universal Link Navigation Suite** (`test_links_navigation.js`): 4/4 passed (Link rewriting, relative redirects, error boundaries).
- ✅ **Images & Universal Login Suite** (`test_images_and_auth.js`): 6/6 passed (Lazy loading, OAuth cookies, Google sign-in User-Agent).
- ✅ **Flagship Super-Browser Suite** (`test_flagship_suite.js`): 5/5 passed (Deep research vectors, AES-256-GCM, Arc workspaces).
- ✅ **Split View & AI Summarizer Suite** (`test_split_and_summarizer.js`): 7/7 passed (Split-pane layout, page summarizer, NLP fallback).
- ✅ **Time Machine & Web Highlighter Suite** (`test_time_machine_and_highlighter.js`): 6/6 passed (Wayback snapshots, archive fallbacks, annotations, global shortcut).

---

## 🔒 Zero-Telemetry Privacy Guarantees

Aegis is engineered according to strict cryptographic and architectural zero-trust principles:

1. **100% Volatile RAM Model**: Aegis does not use an external database for user queries. When the server restarts or the tab is burned, all session traces vanish immediately.
2. **Referrer Stripping**: Outbound network requests automatically send `Referrer-Policy: no-referrer` to ensure destination websites cannot identify where you originated.
3. **Tracking Parameter Elimination**: Automatically strips tracking query strings including `utm_source`, `utm_medium`, `utm_campaign`, `fbclid`, `gclid`, `msclkid`, and tracking hash fragments.
4. **Anti-Fingerprinting**: Strips third-party tracking scripts, blocks WebRTC candidate enumeration, and masks user-agent headers.
5. **SSRF Guard**: The internal proxy blocks requests targeting private RFC 1918 subnets (`127.0.0.1`, `10.0.0.0/8`, `192.168.0.0/16`, `169.254.169.254`), preventing intranet exploitation.
6. **Client-Side AES-GCM Keyring**: Bookmarks and sensitive vault entries are encrypted client-side with PBKDF2 key derivation and AES-GCM before storage.

---

## 💻 Installation & Setup Guide

### Prerequisites
- **Node.js**: Version 18.0 or higher ([Download Node.js](https://nodejs.org))
- **Operating System**: Windows 10/11, macOS 11+, or modern Linux distribution.

### Step 1: Clone Repository
```bash
git clone https://github.com/zeeshansaeed6/Aegis-Ultimate.git
cd Aegis-Ultimate
```

### Step 2: Install Dependencies
```bash
npm install
```

### Step 3: Run Aegis

#### Launching the Desktop Application:
```bash
npm start
# or double-click Launch-Aegis.bat
```

#### Launching the Web Server:
```bash
npm run server
# or double-click Launch-Aegis-Web.bat
```
Visit `http://localhost:3000` in your web browser.

---

## 🤖 Configuring AI Synthesis (Optional)

Aegis works immediately out of the box using its **Smart Offline Extractive NLP** engine without requiring any external keys or setup. 

To enable generative LLM answers, choose either of the following:

### Option A: Local Ollama (100% Private & Offline)
1. Install [Ollama](https://ollama.com).
2. Pull your desired model:
   ```bash
   ollama run llama3
   # or: ollama run mistral
   ```
3. Ollama runs automatically on `http://localhost:11434`. Aegis will detect it seamlessly!

### Option B: Google Gemini API
1. Obtain a Gemini API key from [Google AI Studio](https://aistudio.google.com/).
2. In Aegis, open **Settings** (`Ctrl+K` -> *AI Settings* or click the settings cog) and paste your API key.
3. Your key is stored strictly in your local browser storage and is never transmitted to any third-party server.

---

## 📡 REST API Reference

Aegis exposes a comprehensive, zero-telemetry REST API for integration into other applications:

| Method | Endpoint | Description | Sample Query / Payload |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/search` | Primary search endpoint | `?q=cryptography&lens=dev&time=w` |
| `POST` | `/api/ai/synthesize` | Perplexity-style cited answer | `{"query": "...", "results": [...]}` |
| `POST` | `/api/ai/summarize-page` | Summarize web page or text | `{"url": "https://example.com"}` |
| `POST` | `/api/deep-research` | Autonomous multi-vector research | `{"query": "Quantum Computing Standards"}` |
| `GET` | `/api/proxy` | Tracker-sanitized page reader | `?url=https://example.com/article` |
| `GET` | `/api/proxy/image` | IP-shielded image streamer | `?url=https://cdn.example.com/image.png` |
| `GET` | `/api/wayback` | Historical snapshot lookup | `?url=https://example.com` |
| `GET` | `/api/suggest` | Autocomplete & bang suggestions | `?q=!gh` |
| `GET` | `/api/lenses` | Retrieve list of focus lenses | *None* |
| `POST` | `/api/crawler/start` | Launch autonomous web crawler | `{"seedUrl": "https://docs.rs", "maxPages": 50}` |
| `POST` | `/api/crawler/stop` | Halt active crawler job | *None* |
| `GET` | `/api/crawler/stats` | Native index statistics | *None* |
| `GET` | `/api/native/search` | Query 100% offline native index | `?q=express+router` |
| `POST` | `/api/vault/upload` | Add note to local BM25 vault | `{"title": "Note", "content": "..."}` |
| `POST` | `/api/vault/watch` | Watch local directory for auto-indexing | `{"folderPath": "C:/MyNotes"}` |
| `POST` | `/api/browser/burn-tab` | Shred isolated tab session & cookies | `{"tabId": "tab_123"}` |
| `GET` | `/api/tor/status` | Audit Tor network status | *None* |
| `GET` | `/opensearch.xml` | OpenSearch 1.1 Discovery XML | *None* |

---

## 📂 Project Structure

```
aegis-private-search/
├── Launch-Aegis.bat           # 1-Click Windows launcher for Desktop App
├── Launch-Aegis-Web.bat       # 1-Click Windows launcher for Web Server
├── package.json               # Scripts, dependencies, and metadata
├── README.md                  # Comprehensive documentation
├── electron/
│   ├── main.js                # Electron main process (Window lifecycle, IPC, Global Spotlight)
│   └── preload.js             # Secure contextBridge API for renderer
├── server/
│   ├── server.js              # Express app, security middleware & API endpoints
│   ├── metaSearch.js          # Multi-engine search aggregator
│   ├── nativeEngine.js        # Autonomous BM25 inverted index & tokenizer
│   ├── crawler.js             # Autonomous spider crawler
│   ├── browserProxy.js        # Streaming proxy, Cheerio sanitizer & cookie isolation
│   ├── browserSearch.js       # Standalone in-browser search results renderer
│   ├── aiSynthesizer.js       # Cited AI synthesis (Ollama, Gemini, Offline NLP)
│   ├── deepResearch.js        # Autonomous multi-vector deep research agent
│   ├── instantAnswers.js      # 15+ Google-grade instant tools, calculator, & knowledge cards
│   ├── localIndex.js          # In-memory BM25 document vault
│   ├── folderWatcher.js       # Real-time local directory file watcher
│   ├── timeMachine.js         # Wayback Machine, Archive.today & Google Cache lookups
│   ├── mediaSearch.js         # Images & videos search with proxy stream
│   ├── lenses.js              # 10 specialized Focus Lenses manager
│   ├── torProxy.js            # Ahmia onion dark web gateway
│   └── spamFilter.js          # Anti-spam & SEO content farm filter
├── public/
│   ├── index.html             # Single-page application shell & WebViews
│   ├── styles.css             # Glassmorphism dark-mode UI & responsive styling
│   ├── app.js                 # Frontend application logic, tabs, hotkeys & controllers
│   ├── opensearch.xml         # OpenSearch 1.1 browser autodiscovery specification
│   ├── manifest.webmanifest   # Progressive Web App (PWA) manifest
│   ├── sw.js                  # Service Worker for offline PWA caching
│   └── app-icon.png           # Brand shield iconography
├── data/
│   └── native_search_index.json # Persisted index for native crawled pages
└── test/
    ├── test_engine.js                     # Core instant answers & calculator tests
    ├── test_http.js                       # HTTP server routes & OpenSearch tests
    ├── test_native_engine.js              # Inverted index & BM25 ranking tests
    ├── test_browser_proxy.js              # Sandboxed browser & SSRF guard tests
    ├── test_google_parity.js              # Google instant widgets parity tests
    ├── test_links_navigation.js           # Universal link rewriting & navigation tests
    ├── test_images_and_auth.js            # Image proxy & OAuth login tests
    ├── test_flagship_suite.js             # Deep research & AES-256-GCM tests
    ├── test_split_and_summarizer.js       # Split-screen & AI page summarizer tests
    └── test_time_machine_and_highlighter.js # Wayback lookup & highlighter tests
```

---

## 🤝 Contributing

Contributions are welcomed! Whether you are implementing new instant answer cards, optimizing BM25 tokenizers, improving browser sandboxing, or refining themes:

1. Fork the repository.
2. Create your feature branch (`git checkout -b feature/amazing-feature`).
3. Ensure all tests pass (`npm test`).
4. Commit your changes (`git commit -m 'Add amazing feature'`).
5. Push to the branch (`git push origin feature/amazing-feature`).
6. Open a Pull Request.

---

## 📄 License

Distributed under the **MIT License**. See `LICENSE` for more information.

---

## 👤 Author & Acknowledgments

**Created & Engineered with passion by Zeeshan Saeed.**  
- **GitHub**: [@zeeshansaeed6](https://github.com/zeeshansaeed6)  
- **Project**: [Aegis Ultimate Private Search & Browser](https://github.com/zeeshansaeed6/Aegis-Ultimate)

*Dedicated to digital sovereignty, private exploration, and an internet free from surveillance.*
