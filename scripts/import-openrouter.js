'use strict';

// Populate the LLM provider files from OpenRouter's models API — one clean JSON
// feed covering every major provider's per-token pricing. OpenRouter's rates are
// what you pay *through OpenRouter*; for most first-party models they match the
// provider's own list price, but the human should spot-check the headline models
// against each provider's own page (pricing_url) and set `verified_at`.
//
//   node scripts/import-openrouter.js
//
// Writes providers/<slug>.json for each provider with `source: "openrouter"`.
// Existing files with `source: "manual"` are left alone.

const fs = require('fs');
const path = require('path');

const OUT = path.join(__dirname, '..', 'providers');
const today = new Date().toISOString().slice(0, 10);

// which OpenRouter author prefixes we surface, and how to name them
const PROVIDERS = {
  openai: { name: 'OpenAI', url: 'https://openai.com/api/pricing/', home: 'https://openai.com' },
  anthropic: { name: 'Anthropic', url: 'https://www.anthropic.com/pricing', home: 'https://anthropic.com' },
  google: { name: 'Google Gemini', url: 'https://ai.google.dev/gemini-api/docs/pricing', home: 'https://ai.google.dev' },
  'deepseek': { name: 'DeepSeek', url: 'https://api-docs.deepseek.com/quick_start/pricing', home: 'https://deepseek.com' },
  'mistralai': { name: 'Mistral', url: 'https://mistral.ai/pricing', home: 'https://mistral.ai' },
  'x-ai': { name: 'xAI', url: 'https://docs.x.ai/docs/models', home: 'https://x.ai' },
  'meta-llama': { name: 'Meta Llama', url: 'https://www.llama.com/', home: 'https://llama.com' },
  'qwen': { name: 'Qwen (Alibaba)', url: 'https://www.alibabacloud.com/help/en/model-studio/models', home: 'https://qwen.ai' },
  'cohere': { name: 'Cohere', url: 'https://cohere.com/pricing', home: 'https://cohere.com' },
  'moonshotai': { name: 'Moonshot AI', url: 'https://platform.moonshot.ai/docs/pricing', home: 'https://moonshot.ai' },
};

const perM = (s) => {
  const n = Number(s);
  if (!Number.isFinite(n) || n <= 0) return undefined;
  return Number((n * 1_000_000).toFixed(4));
};

(async () => {
  const res = await fetch('https://openrouter.ai/api/v1/models', { headers: { accept: 'application/json' } });
  if (!res.ok) { console.error('OpenRouter fetch failed:', res.status); process.exit(1); }
  const { data } = await res.json();

  const byProvider = {};
  for (const m of data) {
    if (/:(free|beta|extended|thinking|online)$/.test(m.id)) continue;
    if (/:batch$/.test(m.id)) continue;
    const [author, rest] = m.id.split('/');
    const meta = PROVIDERS[author];
    if (!meta) continue;
    const input = perM(m.pricing?.prompt);
    const output = perM(m.pricing?.completion);
    if (input === undefined && output === undefined) continue;
    const rate = { item: rest || m.id, unit: '1M tokens' };
    if (input !== undefined) rate.input = input;
    if (output !== undefined) rate.output = output;
    const ci = perM(m.pricing?.input_cache_read);
    if (ci !== undefined) rate.cached_input = ci;
    (byProvider[author] = byProvider[author] || []).push(rate);
  }

  fs.mkdirSync(OUT, { recursive: true });
  let written = 0;
  for (const [author, rates] of Object.entries(byProvider)) {
    const slug = PROVIDERS[author].name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const file = path.join(OUT, `${slug}.json`);
    if (fs.existsSync(file)) {
      const cur = JSON.parse(fs.readFileSync(file, 'utf8'));
      if (cur.source === 'manual') { console.log(`skip ${slug} (manual)`); continue; }
    }
    rates.sort((a, b) => (a.input ?? a.rate ?? 0) - (b.input ?? b.rate ?? 0));
    const doc = {
      provider: PROVIDERS[author].name,
      slug,
      category: 'llm',
      homepage: PROVIDERS[author].home,
      pricing_url: PROVIDERS[author].url,
      currency: 'USD',
      verified_at: today,
      source: 'openrouter',
      notes: 'Per-token rates as listed on OpenRouter; cross-check headline models against the provider\'s own pricing page.',
      rates: rates.slice(0, 30),
    };
    fs.writeFileSync(file, JSON.stringify(doc, null, 2) + '\n');
    written++;
    console.log(`wrote ${slug}.json (${doc.rates.length} models)`);
  }
  console.log(`\n${written} LLM provider files updated.`);
})();
