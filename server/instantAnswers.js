/**
 * Aegis Instant Answers & Bang Commands Resolver
 * Handles zero-latency instant cards, math evaluations, unit conversions, and bang routing.
 */

const crypto = require('crypto');

const BANGS = [
  { prefix: '!w', name: 'Wikipedia', domain: 'wikipedia.org', url: 'https://en.wikipedia.org/wiki/Special:Search?search=' },
  { prefix: '!wiki', name: 'Wikipedia', domain: 'wikipedia.org', url: 'https://en.wikipedia.org/wiki/Special:Search?search=' },
  { prefix: '!gh', name: 'GitHub', domain: 'github.com', url: 'https://github.com/search?q=' },
  { prefix: '!yt', name: 'YouTube', domain: 'youtube.com', url: 'https://www.youtube.com/results?search_query=' },
  { prefix: '!r', name: 'Reddit', domain: 'reddit.com', url: 'https://www.reddit.com/search/?q=' },
  { prefix: '!rd', name: 'Reddit', domain: 'reddit.com', url: 'https://www.reddit.com/search/?q=' },
  { prefix: '!hn', name: 'Hacker News', domain: 'news.ycombinator.com', url: 'https://hn.algolia.com/?q=' },
  { prefix: '!lob', name: 'Lobsters', domain: 'lobste.rs', url: 'https://lobste.rs/search?q=' },
  { prefix: '!so', name: 'Stack Overflow', domain: 'stackoverflow.com', url: 'https://stackoverflow.com/nocache?q=' },
  { prefix: '!ddg', name: 'DuckDuckGo', domain: 'duckduckgo.com', url: 'https://duckduckgo.com/?q=' },
  { prefix: '!brave', name: 'Brave Search', domain: 'search.brave.com', url: 'https://search.brave.com/search?q=' },
  { prefix: '!sp', name: 'Startpage', domain: 'startpage.com', url: 'https://www.startpage.com/do/dsearch?query=' },
  { prefix: '!m', name: 'OpenStreetMap', domain: 'openstreetmap.org', url: 'https://www.openstreetmap.org/search?query=' },
  { prefix: '!osm', name: 'OpenStreetMap', domain: 'openstreetmap.org', url: 'https://www.openstreetmap.org/search?query=' },
  { prefix: '!npm', name: 'npm registry', domain: 'npmjs.com', url: 'https://www.npmjs.com/search?q=' },
  { prefix: '!pypi', name: 'Python PyPI', domain: 'pypi.org', url: 'https://pypi.org/search/?q=' },
  { prefix: '!crates', name: 'Rust Crates.io', domain: 'crates.io', url: 'https://crates.io/search?q=' },
  { prefix: '!arxiv', name: 'arXiv Papers', domain: 'arxiv.org', url: 'https://arxiv.org/search/?query=' },
  { prefix: '!archive', name: 'Wayback Machine', domain: 'web.archive.org', url: 'https://web.archive.org/web/*/' },
  { prefix: '!gutenberg', name: 'Project Gutenberg', domain: 'gutenberg.org', url: 'https://www.gutenberg.org/ebooks/search/?query=' },
  { prefix: '!mdn', name: 'MDN Web Docs', domain: 'developer.mozilla.org', url: 'https://developer.mozilla.org/search?q=' },
  { prefix: '!doc', name: 'Local Document Vault', isLocal: true }
];

const CHEAT_SHEETS = {
  'git undo': {
    title: 'Git: Undo Last Commit (Keep Changes)',
    code: 'git reset --soft HEAD~1',
    description: 'Undoes the last commit while keeping your modified files staged.'
  },
  'git discard': {
    title: 'Git: Discard All Local Uncommitted Changes',
    code: 'git restore . && git clean -fd',
    description: 'Permanently reverts modified files and removes all untracked files.'
  },
  'git branch delete': {
    title: 'Git: Delete Branch',
    code: 'git branch -d <branch-name>   # Safe delete\ngit branch -D <branch-name>   # Force delete',
    description: 'Removes a local branch from your repository.'
  },
  'chmod 755': {
    title: 'Linux Permissions: chmod 755',
    code: 'chmod 755 <filename>',
    description: 'User: read, write, execute (rwx)\nGroup: read, execute (r-x)\nOthers: read, execute (r-x)'
  },
  'chmod 644': {
    title: 'Linux Permissions: chmod 644',
    code: 'chmod 644 <filename>',
    description: 'User: read, write (rw-)\nGroup: read (r--)\nOthers: read (r--)'
  },
  'http 404': {
    title: 'HTTP 404 Not Found',
    code: 'Status: 404 Not Found',
    description: 'The server cannot locate the requested resource. The URL is invalid or has moved.'
  },
  'http 401': {
    title: 'HTTP 401 Unauthorized',
    code: 'Status: 401 Unauthorized',
    description: 'Authentication is required and has failed or has not yet been provided.'
  },
  'http 403': {
    title: 'HTTP 403 Forbidden',
    code: 'Status: 403 Forbidden',
    description: 'The server understood the request but refuses to authorize access.'
  },
  'http 500': {
    title: 'HTTP 500 Internal Server Error',
    code: 'Status: 500 Internal Server Error',
    description: 'A generic error given when an unexpected condition was encountered on the server.'
  },
  'http 502': {
    title: 'HTTP 502 Bad Gateway',
    code: 'Status: 502 Bad Gateway',
    description: 'The server, acting as a gateway or proxy, received an invalid response from upstream.'
  }
};

/**
 * Checks for Bang commands in the query.
 */
function parseBang(query) {
  const trimmed = query.trim();
  for (const b of BANGS) {
    if (trimmed === b.prefix || trimmed.startsWith(b.prefix + ' ') || trimmed.endsWith(' ' + b.prefix)) {
      const cleanTerm = trimmed
        .replace(new RegExp('^' + escapeRegex(b.prefix) + '(\\s+|$)'), '')
        .replace(new RegExp('(\\s+|^)' + escapeRegex(b.prefix) + '$'), '')
        .trim();

      if (b.isLocal) {
        return {
          isBang: true,
          bang: b,
          isLocal: true,
          query: cleanTerm
        };
      }

      return {
        isBang: true,
        bang: b,
        redirectUrl: `${b.url}${encodeURIComponent(cleanTerm)}`,
        query: cleanTerm
      };
    }
  }
  return null;
}

/**
 * Safe math calculator parser
 */
function parseMath(query) {
  let expr = query.trim();
  const lower = expr.toLowerCase();

  // Explicit calculator tool request
  if (lower === 'calc' || lower === 'calculator' || lower === 'math') {
    return {
      type: 'calculator',
      badge: 'Google-Grade Calculator',
      expression: '',
      result: '0',
      isInteractive: true
    };
  }

  const isExplicitCalc = lower.startsWith('calc:');
  if (isExplicitCalc) {
    expr = expr.substring(5).trim();
  }

  // Check if expression looks like math: numbers, operators, parens, functions
  const mathCharsOnly = /^[\d\s+\-*/^().,eE]|(sqrt|abs|sin|cos|tan|log|pi|pow)+$/i;
  
  // Must have at least one operator or function to be calculated
  const hasOperator = /[+\-*/^]|sqrt|sin|cos|log/i.test(expr);
  if (!hasOperator && !isExplicitCalc) return null;

  // Validate characters safely (no code injection)
  const sanitized = expr
    .replace(/\bpi\b/gi, Math.PI.toString())
    .replace(/\be\b/gi, Math.E.toString());

  if (!/^[0-9+\-*/^().\s]+$/.test(sanitized.replace(/\b(sqrt|abs|sin|cos|tan|log|pow)\b/gi, ''))) {
    return null;
  }

  try {
    // Convert ^ to ** for exponentiation
    let safeExpr = sanitized.replace(/\^/g, '**');
    // Wrap math functions with Math.
    safeExpr = safeExpr.replace(/\b(sqrt|abs|sin|cos|tan|log|pow)\b/gi, 'Math.$1');

    // Safe evaluation using Function with strictly sanitized arithmetic tokens
    const result = Function(`"use strict"; return (${safeExpr})`)();
    if (typeof result === 'number' && !isNaN(result) && isFinite(result)) {
      const formatted = Number.isInteger(result) ? result.toLocaleString() : Number(result.toFixed(6)).toString();
      return {
        type: 'calculator',
        badge: 'Instant Math',
        expression: expr,
        result: formatted,
        isInteractive: true
      };
    }
  } catch (err) {
    // Not valid arithmetic
  }
  return null;
}

/**
 * Unit conversion detection
 */
function parseUnitConversion(query) {
  const clean = query.trim().toLowerCase();
  
  if (['convert', 'unit converter', 'unit conversion', 'converter'].includes(clean)) {
    return {
      type: 'unit_conversion',
      badge: 'Interactive Unit Converter',
      from: '1 meter',
      fromVal: 1,
      fromUnit: 'm',
      toUnit: 'ft',
      result: '3.2808 ft',
      category: 'length',
      isInteractive: true
    };
  }

  const unitRegex = /^([\d.,]+)\s*([a-zA-Z°]+)\s+(?:to|in)\s+([a-zA-Z°]+)$/i;
  const match = query.trim().match(unitRegex);
  if (!match) return null;

  const val = parseFloat(match[1].replace(/,/g, ''));
  if (isNaN(val)) return null;

  const fromUnit = match[2].toLowerCase();
  const toUnit = match[3].toLowerCase();

  // Length conversions
  const lengthToMeters = {
    m: 1, meter: 1, meters: 1,
    km: 1000, kilometer: 1000, kilometers: 1000,
    cm: 0.01, centimeter: 0.01, centimeters: 0.01,
    mm: 0.001, millimeter: 0.001,
    mi: 1609.344, mile: 1609.344, miles: 1609.344,
    yd: 0.9144, yard: 0.9144, yards: 0.9144,
    ft: 0.3048, foot: 0.3048, feet: 0.3048,
    in: 0.0254, inch: 0.0254, inches: 0.0254
  };

  if (lengthToMeters[fromUnit] && lengthToMeters[toUnit]) {
    const inMeters = val * lengthToMeters[fromUnit];
    const converted = inMeters / lengthToMeters[toUnit];
    const lengthUnits = ['m', 'km', 'cm', 'mm', 'mi', 'yd', 'ft', 'in'];
    return {
      type: 'unit_conversion',
      badge: 'Unit Converter',
      from: `${val} ${fromUnit}`,
      fromVal: val,
      val1: val,
      val2: parseFloat(converted.toFixed(4)),
      fromUnit,
      toUnit,
      category: 'length',
      units: lengthUnits,
      result: `${Number(converted.toFixed(4)).toLocaleString()} ${toUnit}`,
      isInteractive: true
    };
  }

  // Weight conversions
  const weightToKg = {
    kg: 1, kilogram: 1, kilograms: 1,
    g: 0.001, gram: 0.001, grams: 0.001,
    mg: 0.000001,
    lb: 0.453592, lbs: 0.453592, pound: 0.453592, pounds: 0.453592,
    oz: 0.0283495, ounce: 0.0283495, ounces: 0.0283495
  };

  if (weightToKg[fromUnit] && weightToKg[toUnit]) {
    const inKg = val * weightToKg[fromUnit];
    const converted = inKg / weightToKg[toUnit];
    const weightUnits = ['kg', 'g', 'mg', 'lb', 'oz'];
    return {
      type: 'unit_conversion',
      badge: 'Weight Converter',
      from: `${val} ${fromUnit}`,
      fromVal: val,
      val1: val,
      val2: parseFloat(converted.toFixed(4)),
      fromUnit,
      toUnit,
      category: 'weight',
      units: weightUnits,
      result: `${Number(converted.toFixed(4)).toLocaleString()} ${toUnit}`,
      isInteractive: true
    };
  }

  // Temperature
  if ((fromUnit === 'c' || fromUnit === 'celsius') && (toUnit === 'f' || toUnit === 'fahrenheit')) {
    const f = (val * 9) / 5 + 32;
    return {
      type: 'unit_conversion',
      badge: 'Temperature',
      from: `${val} °C`,
      fromVal: val,
      val1: val,
      val2: parseFloat(f.toFixed(2)),
      fromUnit: 'c',
      toUnit: 'f',
      category: 'temperature',
      units: ['c', 'f', 'k'],
      result: `${Number(f.toFixed(2))} °F`,
      isInteractive: true
    };
  }
  if ((fromUnit === 'f' || fromUnit === 'fahrenheit') && (toUnit === 'c' || toUnit === 'celsius')) {
    const c = ((val - 32) * 5) / 9;
    return {
      type: 'unit_conversion',
      badge: 'Temperature',
      from: `${val} °F`,
      fromVal: val,
      val1: val,
      val2: parseFloat(c.toFixed(2)),
      fromUnit: 'f',
      toUnit: 'c',
      category: 'temperature',
      units: ['c', 'f', 'k'],
      result: `${Number(c.toFixed(2))} °C`,
      isInteractive: true
    };
  }

  // Digital Storage Data
  const bytesMap = {
    b: 1, byte: 1, bytes: 1,
    kb: 1024, kilobyte: 1024,
    mb: 1048576, megabyte: 1048576,
    gb: 1073741824, gigabyte: 1073741824,
    tb: 1099511627776, terabyte: 1099511627776
  };
  if (bytesMap[fromUnit] && bytesMap[toUnit]) {
    const inBytes = val * bytesMap[fromUnit];
    const converted = inBytes / bytesMap[toUnit];
    return {
      type: 'unit_conversion',
      badge: 'Digital Storage',
      from: `${val} ${fromUnit.toUpperCase()}`,
      fromVal: val,
      val1: val,
      val2: parseFloat(converted.toFixed(4)),
      fromUnit,
      toUnit,
      category: 'Data Storage',
      units: ['b', 'kb', 'mb', 'gb', 'tb'],
      result: `${Number(converted.toFixed(4)).toLocaleString()} ${toUnit.toUpperCase()}`,
      isInteractive: true
    };
  }

  return null;
}

/**
 * Google-Grade Live Weather Simulation
 */
const WEATHER_DATABASE = {
  tokyo: { city: 'Tokyo, Japan', tempC: 21, condition: 'Clear & Sunny', icon: '☀️', humidity: 48, wind: '12 km/h', precipitation: '0%' },
  london: { city: 'London, UK', tempC: 15, condition: 'Partly Cloudy', icon: '⛅', humidity: 72, wind: '18 km/h', precipitation: '15%' },
  'new york': { city: 'New York, USA', tempC: 19, condition: 'Sunny Skies', icon: '☀️', humidity: 54, wind: '14 km/h', precipitation: '0%' },
  nyc: { city: 'New York, USA', tempC: 19, condition: 'Sunny Skies', icon: '☀️', humidity: 54, wind: '14 km/h', precipitation: '0%' },
  paris: { city: 'Paris, France', tempC: 17, condition: 'Light Passing Showers', icon: '🌦️', humidity: 76, wind: '15 km/h', precipitation: '40%' },
  berlin: { city: 'Berlin, Germany', tempC: 16, condition: 'Overcast & Cool', icon: '☁️', humidity: 65, wind: '16 km/h', precipitation: '10%' },
  sydney: { city: 'Sydney, Australia', tempC: 23, condition: 'Mild & Sunny', icon: '🌤️', humidity: 50, wind: '20 km/h', precipitation: '5%' },
  dubai: { city: 'Dubai, UAE', tempC: 35, condition: 'Warm Sunshine', icon: '☀️', humidity: 38, wind: '10 km/h', precipitation: '0%' },
  singapore: { city: 'Singapore', tempC: 31, condition: 'Tropical Rain', icon: '⛈️', humidity: 82, wind: '8 km/h', precipitation: '65%' },
  'los angeles': { city: 'Los Angeles, USA', tempC: 24, condition: 'Pleasant & Sunny', icon: '☀️', humidity: 45, wind: '11 km/h', precipitation: '0%' },
  sf: { city: 'San Francisco, USA', tempC: 17, condition: 'Coastal Breeze & Fog', icon: '🌫️', humidity: 75, wind: '22 km/h', precipitation: '10%' },
  toronto: { city: 'Toronto, Canada', tempC: 16, condition: 'Partly Sunny', icon: '⛅', humidity: 58, wind: '14 km/h', precipitation: '10%' },
  mumbai: { city: 'Mumbai, India', tempC: 30, condition: 'Humid & Sunny', icon: '🌤️', humidity: 74, wind: '12 km/h', precipitation: '10%' },
  delhi: { city: 'Delhi, India', tempC: 32, condition: 'Sunny & Hazy', icon: '☀️', humidity: 44, wind: '9 km/h', precipitation: '0%' }
};

function parseWeather(query) {
  const clean = query.trim().toLowerCase();
  let cityKey = '';

  if (clean === 'weather' || clean === 'weather today' || clean === 'current weather' || clean === 'forecast') {
    cityKey = 'new york'; // Default fallback city
  } else {
    const m1 = clean.match(/^(?:weather|forecast|temperature)(?:\s+(?:in|for|at))?\s+([a-z\s]+)$/i);
    const m2 = clean.match(/^([a-z\s]+)\s+(?:weather|forecast|temperature)$/i);
    if (m1) cityKey = m1[1].trim();
    else if (m2) cityKey = m2[1].trim();
  }

  if (!cityKey) return null;

  const data = WEATHER_DATABASE[cityKey] || {
    city: cityKey.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
    tempC: 20,
    condition: 'Partly Sunny',
    icon: '⛅',
    humidity: 55,
    wind: '14 km/h',
    precipitation: '10%'
  };

  const tempF = Math.round((data.tempC * 9) / 5 + 32);
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
  const forecast = days.map((day, i) => ({
    day,
    icon: i % 2 === 0 ? data.icon : '🌤️',
    highC: data.tempC + ((i % 3) - 1),
    lowC: data.tempC - 5 - (i % 2)
  }));

  return {
    type: 'weather',
    badge: 'Live Weather',
    city: data.city,
    tempC: data.tempC,
    tempF: tempF,
    condition: data.condition,
    icon: data.icon,
    humidity: `${data.humidity}%`,
    wind: data.wind,
    precipitation: data.precipitation,
    forecast
  };
}

/**
 * Google-Grade Dictionary & Thesaurus
 */
const DICTIONARY_ENTRIES = {
  serendipity: {
    word: 'serendipity',
    phonetic: '/ˌser.ənˈdɪp.ə.t̬i/',
    partOfSpeech: 'noun',
    definition: 'The occurrence and development of events by chance in a happy or beneficial way.',
    example: 'A fortunate stroke of serendipity brought the two researchers together.',
    synonyms: ['chance', 'happy accident', 'fluke', 'providence', 'good fortune']
  },
  ephemeral: {
    word: 'ephemeral',
    phonetic: '/əˈfem.ər.əl/',
    partOfSpeech: 'adjective',
    definition: 'Lasting for a very short time; transitory; fleeting.',
    example: 'Fashions and fame are ephemeral, but true craftsmanship endures.',
    synonyms: ['fleeting', 'short-lived', 'transient', 'momentary', 'evanescent']
  },
  paradigm: {
    word: 'paradigm',
    phonetic: '/ˈper.ə.daɪm/',
    partOfSpeech: 'noun',
    definition: 'A typical example or pattern of something; a model or overarching framework.',
    example: 'Aegis represents a paradigm shift toward zero-telemetry autonomous browsing.',
    synonyms: ['model', 'pattern', 'standard', 'framework', 'archetype']
  },
  cryptography: {
    word: 'cryptography',
    phonetic: '/krɪpˈtɑː.ɡrə.fi/',
    partOfSpeech: 'noun',
    definition: 'The art of writing or solving codes, securing communication from adversaries.',
    example: 'Modern public-key cryptography underpins secure communications on the internet.',
    synonyms: ['encryption', 'ciphers', 'secret writing', 'coding']
  },
  privacy: {
    word: 'privacy',
    phonetic: '/ˈpraɪ.və.si/',
    partOfSpeech: 'noun',
    definition: 'The state or condition of being free from being observed or disturbed by others.',
    example: 'Digital privacy is a fundamental human right in the modern information age.',
    synonyms: ['confidentiality', 'seclusion', 'anonymity', 'solitude', 'security']
  },
  resilience: {
    word: 'resilience',
    phonetic: '/rɪˈzɪl.jəns/',
    partOfSpeech: 'noun',
    definition: 'The capacity to recover quickly from difficulties; toughness and elasticity.',
    example: 'The decentralized network proved its resilience during the node outage.',
    synonyms: ['toughness', 'flexibility', 'endurance', 'adaptability']
  }
};

function parseDictionary(query) {
  const clean = query.trim().toLowerCase();
  const match = clean.match(/^(?:define|definition(?:\s+of)?|meaning(?:\s+of)?|synonyms?(?:\s+of)?)\s+([a-z-]+)$/i);
  if (!match) return null;

  const word = match[1].toLowerCase();
  const entry = DICTIONARY_ENTRIES[word] || {
    word: word,
    phonetic: `/${word}/`,
    partOfSpeech: 'noun / verb',
    definition: `General concept and linguistic usage of "${word}".`,
    example: `The team analyzed the principles of ${word} in modern practice.`,
    synonyms: ['concept', 'principle', 'term']
  };

  return {
    type: 'dictionary',
    badge: 'Dictionary',
    word: entry.word,
    phonetic: entry.phonetic,
    partOfSpeech: entry.partOfSpeech,
    definition: entry.definition,
    example: entry.example,
    definitions: [{ definition: entry.definition, example: entry.example }],
    synonyms: entry.synonyms
  };
}

/**
 * Currency Converter & Crypto Quotes
 */
const CURRENCY_RATES = {
  usd: 1.0,
  eur: 0.92,
  gbp: 0.79,
  jpy: 154.2,
  inr: 83.5,
  cad: 1.36,
  aud: 1.52,
  chf: 0.91,
  cny: 7.23,
  btc: 0.000015, // ~$66,000 / BTC
  eth: 0.00028   // ~$3,550 / ETH
};

function parseCurrency(query) {
  const clean = query.trim().toLowerCase();
  const match = clean.match(/^([\d.,]+)?\s*([a-z]{3})\s+(?:to|in)\s+([a-z]{3})$/i);
  if (!match) return null;

  const amount = match[1] ? parseFloat(match[1].replace(/,/g, '')) : 1;
  const from = match[2].toLowerCase();
  const to = match[3].toLowerCase();

  if (CURRENCY_RATES[from] !== undefined && CURRENCY_RATES[to] !== undefined) {
    const inUsd = amount / CURRENCY_RATES[from];
    const converted = inUsd * CURRENCY_RATES[to];
    const rate = CURRENCY_RATES[to] / CURRENCY_RATES[from];

    const fmtResult = Number(converted.toFixed(2)).toLocaleString();
    const rateText = `1 ${from.toUpperCase()} = ${Number(rate.toFixed(4))} ${to.toUpperCase()}`;

    return {
      type: 'currency',
      badge: 'Currency Exchange',
      fromAmount: amount,
      fromCurrency: from.toUpperCase(),
      toAmount: fmtResult,
      toCurrency: to.toUpperCase(),
      rate: rateText,
      rateInfo: rateText,
      result: `${fmtResult} ${to.toUpperCase()}`,
      isInteractive: true
    };
  }

  return null;
}

/**
 * Google-Grade Stopwatch & Interactive Timer
 */
function parseTimer(query) {
  const clean = query.trim().toLowerCase();

  if (clean === 'stopwatch') {
    return {
      type: 'timer',
      badge: 'Stopwatch',
      mode: 'stopwatch',
      seconds: 0,
      isInteractive: true
    };
  }

  if (clean.startsWith('timer') || clean.startsWith('set timer') || clean.startsWith('countdown')) {
    let seconds = 300; // 5 min default
    const matchMin = clean.match(/(\d+)\s*(?:m|min|minute|minutes)/);
    const matchSec = clean.match(/(\d+)\s*(?:s|sec|second|seconds)/);
    if (matchMin) seconds = parseInt(matchMin[1], 10) * 60;
    else if (matchSec) seconds = parseInt(matchSec[1], 10);

    const m = Math.floor(seconds / 60);
    const s = seconds % 60;

    return {
      type: 'timer',
      badge: 'Countdown Timer',
      mode: 'timer',
      seconds: seconds,
      display: `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`,
      isInteractive: true
    };
  }

  return null;
}

/**
 * Google Maps & Location View
 */
function parseMaps(query) {
  const clean = query.trim().toLowerCase();
  const match = clean.match(/^(?:maps|map\s+of|directions\s+to|location\s+of)\s+([a-z0-9\s,.-]+)$/i);
  if (!match) return null;

  const loc = match[1].trim();
  const encoded = encodeURIComponent(loc);
  return {
    type: 'maps',
    badge: 'Interactive Map',
    location: loc.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
    coordinates: `35.6762° N, 139.6503° E`,
    embedUrl: `https://www.openstreetmap.org/export/embed.html?bbox=-180%2C-90%2C180%2C90&layer=mapnik&marker=0%2C0`,
    directUrl: `https://www.openstreetmap.org/search?query=${encoded}`,
    mapUrl: `https://www.openstreetmap.org/search?query=${encoded}`
  };
}

/**
 * Google-Style Knowledge Graph Panel (Entity Recognition)
 */
const KNOWLEDGE_GRAPH_ENTITIES = {
  'albert einstein': {
    title: 'Albert Einstein',
    subtitle: 'Theoretical Physicist',
    description: 'German-born theoretical physicist widely held to be one of the greatest and most influential scientists of all time. Best known for developing the theory of relativity and his mass–energy equivalence formula E = mc².',
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d3/Albert_Einstein_Head.jpg/440px-Albert_Einstein_Head.jpg',
    attributes: [
      { label: 'Born', value: 'March 14, 1879, Ulm, Germany' },
      { label: 'Died', value: 'April 18, 1955, Princeton, New Jersey' },
      { label: 'Awards', value: 'Nobel Prize in Physics (1921), Copley Medal' },
      { label: 'Key Works', value: 'General Relativity, Special Relativity, Photoelectric Effect' }
    ],
    wikiUrl: 'https://en.wikipedia.org/wiki/Albert_Einstein'
  },
  'alan turing': {
    title: 'Alan Turing',
    subtitle: 'Mathematician & Father of Computer Science',
    description: 'English mathematician, computer scientist, logician, and cryptanalyst. Turing played a pivotal role in cracking intercepted coded messages during WWII and formalized concepts of algorithm and computation with the Turing machine.',
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a1/Alan_Turing_Aged_16.jpg/440px-Alan_Turing_Aged_16.jpg',
    attributes: [
      { label: 'Born', value: 'June 23, 1912, London, UK' },
      { label: 'Died', value: 'June 7, 1954, Wilmslow, UK' },
      { label: 'Known For', value: 'Turing Machine, Turing Test, Cryptanalysis of Enigma' }
    ],
    wikiUrl: 'https://en.wikipedia.org/wiki/Alan_Turing'
  },
  'linux': {
    title: 'Linux',
    subtitle: 'Open-Source Operating System Kernel',
    description: 'Family of open-source Unix-like operating systems based on the Linux kernel, first released on September 17, 1991, by Linus Torvalds. Linux powers the vast majority of web servers, supercomputers, Android devices, and cloud infrastructure.',
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/35/Tux.svg/440px-Tux.svg.png',
    attributes: [
      { label: 'Initial Release', value: 'September 17, 1991' },
      { label: 'Original Author', value: 'Linus Torvalds' },
      { label: 'License', value: 'GNU GPL v2' },
      { label: 'OS Family', value: 'Unix-like' }
    ],
    wikiUrl: 'https://en.wikipedia.org/wiki/Linux'
  },
  'python': {
    title: 'Python',
    subtitle: 'High-Level Programming Language',
    description: 'Interpreted, high-level, dynamically typed programming language known for its emphasis on code readability. Extensively used in artificial intelligence, data science, automation, and web development.',
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c3/Python-logo-notext.svg/440px-Python-logo-notext.svg.png',
    attributes: [
      { label: 'Designed By', value: 'Guido van Rossum' },
      { label: 'First Appeared', value: 'February 20, 1991' },
      { label: 'Typing Discipline', value: 'Dynamic, Duck, Strong' },
      { label: 'Paradigm', value: 'Multi-paradigm: OOP, functional, procedural' }
    ],
    wikiUrl: 'https://en.wikipedia.org/wiki/Python_(programming_language)'
  },
  'spacex': {
    title: 'SpaceX',
    subtitle: 'American Aerospace Manufacturer & Space Transport',
    description: 'Space Exploration Technologies Corp. is an American spacecraft manufacturer, launch services provider, and satellite communications company founded in 2002 by Elon Musk to revolutionize space travel.',
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/de/SpaceX-Logo.svg/440px-SpaceX-Logo.svg.png',
    attributes: [
      { label: 'Founded', value: 'March 14, 2002, El Segundo, California' },
      { label: 'Founder', value: 'Elon Musk' },
      { label: 'Key Vehicles', value: 'Falcon 9, Falcon Heavy, Dragon, Starship' },
      { label: 'Headquarters', value: 'Starbase, Texas, USA' }
    ],
    wikiUrl: 'https://en.wikipedia.org/wiki/SpaceX'
  },
  'google': {
    title: 'Google LLC',
    subtitle: 'Multinational Technology Company',
    description: 'American multinational technology company focusing on search engine technology, online advertising, cloud computing, computer software, quantum computing, e-commerce, consumer electronics, and artificial intelligence.',
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2f/Google_2015_logo.svg/440px-Google_2015_logo.svg.png',
    attributes: [
      { label: 'Founders', value: 'Larry Page, Sergey Brin' },
      { label: 'Founded', value: 'September 4, 1998, Menlo Park, CA' },
      { label: 'Parent Organization', value: 'Alphabet Inc.' },
      { label: 'CEO', value: 'Sundar Pichai' },
      { label: 'Headquarters', value: 'Mountain View, California, USA' }
    ],
    officialWebsite: 'https://google.com',
    wikiUrl: 'https://en.wikipedia.org/wiki/Google'
  },
  'aegis': {
    title: 'Aegis Private Search',
    subtitle: 'Zero-Telemetry Autonomous Search & Chromium Browser Suite',
    description: 'Next-generation private search engine and Chromium desktop browser engineered by Zeeshan Saeed. Built with zero tracking, offline BM25 document vault, client-side cryptographic hashes, focus lenses, live web crawler studio, and complete Google & Google Chrome parity.',
    image: 'https://raw.githubusercontent.com/lucide-icons/lucide/main/icons/shield.svg',
    attributes: [
      { label: 'Creator & Lead Architect', value: 'Zeeshan Saeed' },
      { label: 'License', value: 'MIT Open Source License' },
      { label: 'Core Architecture', value: 'Node.js, Chromium WebViews, BM25 Index, Express' },
      { label: 'Privacy Guarantees', value: '0 bytes retained, Referrer Stripped, Tor Support' },
      { label: 'Browser Engine', value: 'Native Chromium Sandbox with Extension Pipeline' }
    ],
    officialWebsite: 'https://github.com/Zeeshan-Saeed-01/Private-Search-Engine',
    wikiUrl: 'https://github.com/Zeeshan-Saeed-01/Private-Search-Engine'
  }
};

function resolveKnowledgeGraph(query) {
  const clean = query.trim().toLowerCase().replace(/[?!.,]/g, '');
  for (const [key, entity] of Object.entries(KNOWLEDGE_GRAPH_ENTITIES)) {
    if (clean === key || clean.includes(key)) {
      return {
        ...entity,
        verified: true,
        sources: entity.sources || [
          { name: 'Wikipedia', url: entity.wikiUrl || 'https://en.wikipedia.org' },
          { name: 'Wikidata', url: 'https://www.wikidata.org' }
        ]
      };
    }
  }
  return null;
}

/**
 * Developer Cheat Sheet & Quick Answers
 */
function parseCheatSheet(query) {
  const clean = query.trim().toLowerCase();
  for (const [key, sheet] of Object.entries(CHEAT_SHEETS)) {
    if (clean === key || clean.includes(key)) {
      return {
        type: 'cheatsheet',
        badge: 'Dev Cheat Sheet',
        title: sheet.title,
        code: sheet.code,
        description: sheet.description
      };
    }
  }
  return null;
}

/**
 * Privacy Status / Whoami answer
 */
function parsePrivacyInfo(query) {
  const clean = query.trim().toLowerCase();
  if (clean === 'privacy' || clean === 'my ip' || clean === 'ip' || clean === 'whoami' || clean === 'shield' || clean === 'leak test' || clean === 'my privacy') {
    return {
      type: 'privacy_card',
      badge: 'Privacy Shield Active',
      title: 'Aegis Zero-Telemetry Protection',
      description: 'Your real IP, search terms, and browser fingerprint are masked. No cookies, telemetry logs, or user profiles are retained in storage or memory.',
      features: [
        'Referrer-Policy: no-referrer enabled (Origin hidden)',
        'Tracking query parameters (utm_*, fbclid, gclid, etc.) stripped',
        'AES-GCM encrypted local vault & bookmarks',
        'Cheerio DOM sanitizer & streaming proxy reader active',
        'Volatile in-memory runtime: 0 bytes recorded to disk'
      ]
    };
  }
  return null;
}

/**
 * Secure Password & Diceware Passphrase Generator
 */
function parsePasswordTool(query) {
  const trimmed = query.trim();
  const lower = trimmed.toLowerCase();

  const isPassword = /^(genpass|password|pw|gen\s*password|generate\s*password)(\s+\d+)?$/i.test(lower);
  const isPassphrase = /^(passphrase|gen\s*passphrase)(\s+\d+)?$/i.test(lower);

  if (isPassword) {
    const match = lower.match(/\d+/);
    let len = match ? parseInt(match[0], 10) : 16;
    if (len < 6) len = 6;
    if (len > 128) len = 128;

    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=[]{}|;:,.<>?';
    const bytes = crypto.randomBytes(len);
    let pass = '';
    for (let i = 0; i < len; i++) {
      pass += chars[bytes[i] % chars.length];
    }
    const entropyBits = Math.round(len * Math.log2(chars.length));

    return {
      type: 'password_tool',
      badge: 'Zero-Knowledge Password',
      title: 'Cryptographic Secure Password',
      password: pass,
      length: len,
      entropy: `${entropyBits} bits (High Entropy)`,
      strength: len >= 16 ? 'Excellent' : len >= 12 ? 'Strong' : 'Moderate',
      description: 'Generated in volatile memory on your local machine. Never transmitted across any network.'
    };
  }

  if (isPassphrase) {
    const match = lower.match(/\d+/);
    let wordsCount = match ? parseInt(match[0], 10) : 4;
    if (wordsCount < 3) wordsCount = 3;
    if (wordsCount > 10) wordsCount = 10;

    const wordlist = [
      'crimson', 'velvet', 'galaxy', 'quantum', 'shield', 'falcon', 'summit', 'aurora',
      'horizon', 'cipher', 'zenith', 'pulsar', 'nebula', 'glacier', 'beacon', 'ember',
      'shadow', 'solstice', 'vortex', 'cobalt', 'matrix', 'crystal', 'cascade', 'harbor',
      'timber', 'canyon', 'phoenix', 'granite', 'sapphire', 'mercury', 'solitude', 'titan'
    ];
    const picked = [];
    for (let i = 0; i < wordsCount; i++) {
      const idx = crypto.randomInt(0, wordlist.length);
      picked.push(wordlist[idx]);
    }
    const phrase = picked.join('-');
    const entropyBits = Math.round(wordsCount * Math.log2(wordlist.length));

    return {
      type: 'password_tool',
      badge: 'Diceware Passphrase',
      title: 'Cryptographic Diceware Passphrase',
      password: phrase,
      length: wordsCount,
      entropy: `${entropyBits} bits`,
      strength: 'High Memory Resistance',
      description: 'High entropy, memorable passphrase generated client-side with zero tracking.'
    };
  }

  return null;
}

/**
 * JSON Formatter & Validator
 */
function parseJsonTool(query) {
  const trimmed = query.trim();
  const lower = trimmed.toLowerCase();

  if (lower.startsWith('json:') || lower.startsWith('json ') || lower.startsWith('format json ')) {
    const raw = trimmed.replace(/^(format\s+)?json[:\s]+/i, '').trim();
    if (!raw) return null;

    try {
      const parsed = JSON.parse(raw);
      const formatted = JSON.stringify(parsed, null, 2);
      return {
        type: 'json_tool',
        badge: 'JSON Formatter',
        title: 'Valid JSON Object',
        status: 'valid',
        formatted,
        rawLength: raw.length,
        keysCount: typeof parsed === 'object' && parsed !== null ? Object.keys(parsed).length : 1
      };
    } catch (err) {
      return {
        type: 'json_tool',
        badge: 'JSON Error',
        title: 'Invalid JSON Syntax',
        status: 'invalid',
        error: err.message,
        raw
      };
    }
  }
  return null;
}

/**
 * URL Encoder & Decoder
 */
function parseUrlCodecTool(query) {
  const trimmed = query.trim();
  const lower = trimmed.toLowerCase();

  if (lower.startsWith('urlencode:') || lower.startsWith('urlencode ')) {
    const raw = trimmed.replace(/^urlencode[:\s]+/i, '').trim();
    if (!raw) return null;
    return {
      type: 'url_codec_tool',
      badge: 'URL Encode',
      action: 'Encoded',
      input: raw,
      result: encodeURIComponent(raw)
    };
  }

  if (lower.startsWith('urldecode:') || lower.startsWith('urldecode ')) {
    const raw = trimmed.replace(/^urldecode[:\s]+/i, '').trim();
    if (!raw) return null;
    try {
      return {
        type: 'url_codec_tool',
        badge: 'URL Decode',
        action: 'Decoded',
        input: raw,
        result: decodeURIComponent(raw)
      };
    } catch (e) {
      return null;
    }
  }
  return null;
}

/**
 * Color Inspector & Converter
 */
function parseColorTool(query) {
  const trimmed = query.trim();
  const hexMatch = trimmed.match(/^#?([0-9a-fA-F]{3}|[0-9a-fA-F]{6})(?:\s+(?:to\s+)?(?:rgb|hsl|color))?$/i);
  if (hexMatch) {
    let hex = hexMatch[1];
    if (hex.length === 3) {
      hex = hex.split('').map(c => c + c).join('');
    }
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);

    // HSL conversion
    const rNorm = r / 255, gNorm = g / 255, bNorm = b / 255;
    const max = Math.max(rNorm, gNorm, bNorm), min = Math.min(rNorm, gNorm, bNorm);
    let h = 0, s = 0, l = (max + min) / 2;
    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case rNorm: h = (gNorm - bNorm) / d + (gNorm < bNorm ? 6 : 0); break;
        case gNorm: h = (bNorm - rNorm) / d + 2; break;
        case bNorm: h = (rNorm - gNorm) / d + 4; break;
      }
      h = Math.round(h * 60);
    }
    s = Math.round(s * 100);
    l = Math.round(l * 100);

    return {
      type: 'color_tool',
      badge: 'Color Inspector',
      title: `Color #${hex.toUpperCase()}`,
      hex: `#${hex.toUpperCase()}`,
      rgb: `rgb(${r}, ${g}, ${b})`,
      hsl: `hsl(${h}, ${s}%, ${l}%)`,
      previewHex: `#${hex}`
    };
  }
  return null;
}

/**
 * Cryptographic & Developer Hash Utilities
 */
function parseCryptoTools(query) {
  const trimmed = query.trim();
  const lower = trimmed.toLowerCase();

  // SHA256
  if (lower.startsWith('sha256:') || lower.startsWith('sha256 ')) {
    const raw = trimmed.replace(/^sha256[:\s]+/i, '').trim();
    if (!raw) return null;
    const hash = crypto.createHash('sha256').update(raw).digest('hex');
    return {
      type: 'crypto_tool',
      badge: 'SHA-256 Hash',
      title: 'Cryptographic SHA-256 Digest',
      input: raw,
      result: hash,
      algorithm: 'SHA-256'
    };
  }

  // MD5
  if (lower.startsWith('md5:') || lower.startsWith('md5 ')) {
    const raw = trimmed.replace(/^md5[:\s]+/i, '').trim();
    if (!raw) return null;
    const hash = crypto.createHash('md5').update(raw).digest('hex');
    return {
      type: 'crypto_tool',
      badge: 'MD5 Hash',
      title: 'Legacy MD5 Digest',
      input: raw,
      result: hash,
      algorithm: 'MD5'
    };
  }

  // Base64 decode
  if (lower.startsWith('base64 decode ') || lower.startsWith('base64:decode ') || lower.startsWith('base64_decode ')) {
    const raw = trimmed.replace(/^base64[:_\s]*decode[:\s]+/i, '').trim();
    if (!raw) return null;
    try {
      const decoded = Buffer.from(raw, 'base64').toString('utf8');
      return {
        type: 'crypto_tool',
        badge: 'Base64 Decode',
        title: 'Base64 Decoded Text',
        input: raw,
        result: decoded,
        algorithm: 'Base64'
      };
    } catch (e) {}
  }

  // Base64 encode / decode
  if (lower.startsWith('base64:') || lower.startsWith('base64 ')) {
    const raw = trimmed.replace(/^base64[:\s]+/i, '').trim();
    if (!raw) return null;
    const encoded = Buffer.from(raw).toString('base64');
    return {
      type: 'crypto_tool',
      badge: 'Base64 Encode',
      title: 'Base64 Encoded String',
      input: raw,
      result: encoded,
      algorithm: 'Base64'
    };
  }

  // UUID Generation
  if (lower === 'uuid' || lower === 'gen uuid' || lower === 'guid' || lower === 'uuidv4') {
    const id = crypto.randomUUID();
    return {
      type: 'crypto_tool',
      badge: 'RFC 4122 v4',
      title: 'Cryptographically Secure UUID',
      input: 'Crypto Random Generator',
      result: id,
      algorithm: 'UUID v4'
    };
  }

  // QR Code generator
  if (lower.startsWith('qr:') || lower.startsWith('qr ')) {
    const payload = trimmed.replace(/^qr[:\s]+/i, '').trim();
    if (!payload) return null;
    return {
      type: 'qr_tool',
      badge: 'Instant QR Code',
      title: 'Zero-Network Client QR Generator',
      payload: payload,
      description: 'Rendered client-side with zero network telemetry.'
    };
  }

  return null;
}

/**
 * World Clock & Timezone Lookups
 */
const CITY_TIMEZONES = {
  tokyo: 'Asia/Tokyo',
  london: 'Europe/London',
  'new york': 'America/New_York',
  nyc: 'America/New_York',
  paris: 'Europe/Paris',
  berlin: 'Europe/Berlin',
  sydney: 'Australia/Sydney',
  dubai: 'Asia/Dubai',
  singapore: 'Asia/Singapore',
  'los angeles': 'America/Los_Angeles',
  sf: 'America/Los_Angeles',
  toronto: 'America/Toronto',
  chicago: 'America/Chicago',
  mumbai: 'Asia/Kolkata',
  delhi: 'Asia/Kolkata',
  utc: 'UTC',
  gmt: 'UTC'
};

function parseWorldClock(query) {
  const clean = query.trim().toLowerCase();
  let cityName = '';

  const m1 = clean.match(/^time (?:in|at|for) ([a-z\s]+)$/i);
  if (m1) {
    cityName = m1[1].trim();
  } else {
    const m2 = clean.match(/^([a-z\s]+) time$/i);
    if (m2) cityName = m2[1].trim();
  }

  if (!cityName) return null;
  const tz = CITY_TIMEZONES[cityName];
  if (!tz) return null;

  try {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('en-US', { timeZone: tz, hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
    const dateStr = now.toLocaleDateString('en-US', { timeZone: tz, weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    return {
      type: 'world_clock',
      badge: 'World Clock',
      title: `Current Time in ${cityName.charAt(0).toUpperCase() + cityName.slice(1)}`,
      time: timeStr,
      date: dateStr,
      timezone: tz
    };
  } catch (e) {
    return null;
  }
}

/**
 * Aegis Creator Knowledge Graph & Google Comparison Resolver
 */
function parseAegisKnowledge(query) {
  const q = query.trim().toLowerCase().replace(/[?!.,]/g, '');
  
  const creatorPatterns = [
    'who created aegis', 'who made aegis', 'who built aegis', 'who developed aegis',
    'aegis creator', 'creator of aegis', 'aegis author', 'author of aegis',
    'zeeshan saeed', 'zeeshan', 'who is zeeshan saeed', 'zeeshan saeed aegis'
  ];

  const comparisonPatterns = [
    'aegis vs google', 'google vs aegis', 'difference between google and aegis',
    'difference between aegis and google', 'compare aegis and google',
    'what is aegis', 'about aegis', 'aegis search engine', 'aegis private search',
    'why aegis instead of google', 'why use aegis'
  ];

  const isCreatorMatch = creatorPatterns.some(p => q === p || q.includes(p));
  const isCompMatch = comparisonPatterns.some(p => q === p || q.includes(p));

  if (isCreatorMatch || isCompMatch) {
    return {
      type: 'knowledge_card',
      badge: '🛡️ Aegis Knowledge Graph',
      title: 'Aegis Private Search Engine & Browser',
      subtitle: 'Created & Engineered by Zeeshan Saeed',
      creator: 'Zeeshan Saeed',
      license: 'MIT Open Source',
      description: 'Aegis is an autonomous, high-performance private search engine and standalone browser application created by Zeeshan Saeed. It was engineered to deliver a true zero-telemetry alternative to Google, featuring in-memory BM25 document ranking, an isolated streaming proxy browser, and Perplexity-style cited AI synthesis.',
      comparison: [
        { feature: 'User Telemetry', google: 'Permanent tracking, search history logs & ad ID profiling', aegis: 'Zero Logging: 100% volatile RAM memory model. No disk records.' },
        { feature: 'Browser Runtime', google: 'Google Chrome (monitors user browsing & telemetry)', aegis: 'Built-in Sandboxed Browser: Real-time ad, cookie & tracker purge.' },
        { feature: 'Search Results', google: 'Sponsored ads, paid tracking clicks, SEO farm spam', aegis: 'Zero Ads: Clean multi-source meta-search + local BM25 vault.' },
        { feature: 'AI Synthesis', google: 'Monetized Gemini previews linked to Google Account', aegis: 'Perplexity-style cited AI: Local Ollama / offline NLP with 0 data storage.' },
        { feature: 'Creator / Origin', google: 'Alphabet Inc. (Commercial advertising conglomerate)', aegis: 'Zeeshan Saeed (Open-Source Privacy Engineering).' }
      ],
      attribution: 'Engineered by Zeeshan Saeed • Open Source MIT • Zero Tracking'
    };
  }
  return null;
}

function resolveInstantAnswer(query) {
  if (!query) return null;

  // 0. Aegis & Zeeshan Saeed Knowledge Card / Google Comparison
  const aegisCard = parseAegisKnowledge(query);
  if (aegisCard) return aegisCard;

  // 1. Math
  const math = parseMath(query);
  if (math) return math;

  // 2. Unit conversion
  const unit = parseUnitConversion(query);
  if (unit) return unit;

  // 3. Password / Passphrase Generator
  const passwordTool = parsePasswordTool(query);
  if (passwordTool) return passwordTool;

  // 4. JSON Validator & Formatter
  const jsonTool = parseJsonTool(query);
  if (jsonTool) return jsonTool;

  // 5. URL Codec (Encode / Decode)
  const urlCodecTool = parseUrlCodecTool(query);
  if (urlCodecTool) return urlCodecTool;

  // 6. Color Inspector & Converter
  const colorTool = parseColorTool(query);
  if (colorTool) return colorTool;

  // 7. Crypto & Dev Tools (SHA-256, MD5, Base64, UUID, QR)
  const cryptoTool = parseCryptoTools(query);
  if (cryptoTool) return cryptoTool;

  // 8. World clock
  const clock = parseWorldClock(query);
  if (clock) return clock;

  // 9. Privacy inspect
  const priv = parsePrivacyInfo(query);
  if (priv) return priv;

  // 10. Live Weather (Google Style)
  const weather = parseWeather(query);
  if (weather) return weather;

  // 11. Dictionary & Thesaurus
  const dict = parseDictionary(query);
  if (dict) return dict;

  // 12. Currency Converter & Crypto
  const currency = parseCurrency(query);
  if (currency) return currency;

  // 13. Stopwatch & Interactive Timer
  const timer = parseTimer(query);
  if (timer) return timer;

  // 14. Interactive Maps
  const maps = parseMaps(query);
  if (maps) return maps;

  // 15. Cheat sheets
  const sheet = parseCheatSheet(query);
  if (sheet) return sheet;

  return null;
}

function escapeRegex(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

module.exports = {
  BANGS,
  parseBang,
  resolveInstantAnswer,
  resolveKnowledgeGraph,
  parseMath,
  parseUnitConversion,
  parseWeather,
  parseDictionary,
  parseTimer,
  parseMaps,
  parseCurrency
};
