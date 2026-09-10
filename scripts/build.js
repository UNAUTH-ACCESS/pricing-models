'use strict';

// Merge providers/*.json into build/ — the artifacts the public GitHub dataset
// ships and that downstream tools consume.
//   build/all.json          every provider
//   build/<category>.json    one file per category
//   build/index.json         { providers, categories, model_count, generated_at }

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const PROV = path.join(ROOT, 'providers');
const OUT = path.join(ROOT, 'build');

fs.mkdirSync(OUT, { recursive: true });
const files = fs.readdirSync(PROV).filter((f) => f.endsWith('.json'));
const all = files.map((f) => JSON.parse(fs.readFileSync(path.join(PROV, f), 'utf8')));
all.sort((a, b) => a.category.localeCompare(b.category) || a.provider.localeCompare(b.provider));

const byCat = {};
let rateCount = 0;
for (const p of all) {
  (byCat[p.category] = byCat[p.category] || []).push(p);
  rateCount += (p.rates || []).length;
}

fs.writeFileSync(path.join(OUT, 'all.json'), JSON.stringify({ generated_at: new Date().toISOString(), providers: all }, null, 2) + '\n');
for (const [cat, list] of Object.entries(byCat)) {
  fs.writeFileSync(path.join(OUT, `${cat}.json`), JSON.stringify({ category: cat, generated_at: new Date().toISOString(), providers: list }, null, 2) + '\n');
}
fs.writeFileSync(path.join(OUT, 'index.json'), JSON.stringify({
  generated_at: new Date().toISOString(),
  categories: Object.fromEntries(Object.entries(byCat).map(([c, l]) => [c, l.length])),
  providers: all.length,
  rate_rows: rateCount,
  stale: all.filter((p) => !p.verified_at || (Date.now() - Date.parse(p.verified_at)) > 30 * 864e5).map((p) => p.slug),
}, null, 2) + '\n');

console.log(`built: ${all.length} providers, ${rateCount} rate rows, categories: ${Object.keys(byCat).join(', ')}`);
