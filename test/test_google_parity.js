/**
 * Test Suite for Google Search & Chrome Parity Suite in Aegis
 */

const assert = require('assert');
const {
  resolveInstantAnswer,
  resolveKnowledgeGraph,
  parseMath,
  parseUnitConversion,
  parseWeather,
  parseDictionary,
  parseTimer,
  parseMaps,
  parseCurrency
} = require('../server/instantAnswers');

console.log('🧪 Starting Aegis Google Parity Test Suite...\n');

// 1. Interactive Math & Calculator
console.log('▶ Test 1: Google Calculator Parity');
const mathResult1 = parseMath('calc: 125 * 8');
assert(mathResult1, 'Math calculation should return result');
assert.strictEqual(mathResult1.result, '1,000');
assert.strictEqual(mathResult1.isInteractive, true);

const mathResult2 = parseMath('calculator');
assert(mathResult2, 'Calculator trigger should return interactive calculator');
assert.strictEqual(mathResult2.isInteractive, true);
console.log('  ✓ Interactive Google calculator verified.');

// 2. Unit Converter
console.log('▶ Test 2: Google 2-Way Unit Converter Parity');
const conv1 = parseUnitConversion('10 km to miles');
assert(conv1, 'Unit conversion should match');
assert.strictEqual(conv1.isInteractive, true);
assert(Array.isArray(conv1.units), 'Should supply available units list');
assert(conv1.units.includes('km') && conv1.units.includes('mi'));

const conv2 = parseUnitConversion('1 gb to mb');
assert(conv2, 'Data conversion should match');
assert.strictEqual(conv2.category, 'Data Storage');
console.log('  ✓ 2-Way unit converter verified.');

// 3. Weather
console.log('▶ Test 3: Google Live Weather Card Parity');
const weather = parseWeather('weather in tokyo');
assert(weather, 'Weather lookup should match');
assert.strictEqual(weather.type, 'weather');
assert(weather.tempC !== undefined && weather.tempF !== undefined);
assert(Array.isArray(weather.forecast) && weather.forecast.length === 5);
console.log('  ✓ Live Weather card with forecast verified.');

// 4. Dictionary
console.log('▶ Test 4: Google Dictionary & Pronounciation Parity');
const dict = parseDictionary('define ephemeral');
assert(dict, 'Dictionary lookup should match');
assert.strictEqual(dict.word, 'ephemeral');
assert(Array.isArray(dict.definitions) && dict.definitions.length > 0);
assert(Array.isArray(dict.synonyms) && dict.synonyms.length > 0);
console.log('  ✓ Dictionary with definition and synonyms verified.');

// 5. Timer
console.log('▶ Test 5: Google Online Timer / Stopwatch Parity');
const timer = parseTimer('timer 10m');
assert(timer, 'Timer trigger should match');
assert.strictEqual(timer.seconds, 600);
assert.strictEqual(timer.display, '10:00');
console.log('  ✓ Online timer parsing verified.');

// 6. Maps & Geography
console.log('▶ Test 6: Google Maps Card Parity');
const map = parseMaps('map of tokyo');
assert(map, 'Map trigger should match');
assert(map.coordinates);
assert(map.mapUrl.includes('openstreetmap.org'));
console.log('  ✓ Map lookup verified.');

// 7. Currency Converter
console.log('▶ Test 7: Google Currency Converter Parity');
const curr = parseCurrency('100 usd to eur');
assert(curr, 'Currency trigger should match');
assert(curr.result.includes('EUR'));
assert(curr.rateInfo);
console.log('  ✓ Currency converter verified.');

// 8. Knowledge Graph
console.log('▶ Test 8: Google Knowledge Graph Parity');
const kgAlbert = resolveKnowledgeGraph('albert einstein');
assert(kgAlbert, 'Albert Einstein knowledge graph should exist');
assert.strictEqual(kgAlbert.title, 'Albert Einstein');
assert(kgAlbert.attributes.length > 0);
assert.strictEqual(kgAlbert.verified, true);

const kgGoogle = resolveKnowledgeGraph('google');
assert(kgGoogle, 'Google knowledge graph should exist');
assert.strictEqual(kgGoogle.title, 'Google LLC');

const kgAegis = resolveKnowledgeGraph('aegis search');
assert(kgAegis, 'Aegis knowledge graph should exist');
assert.strictEqual(kgAegis.title, 'Aegis Private Search');
console.log('  ✓ Knowledge Graph entities verified.');

console.log('\n✨ All Google Search & Chrome Parity tests passed with 100% SUCCESS!');
