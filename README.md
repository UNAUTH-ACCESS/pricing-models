# pricing-models

Machine-readable per-unit pricing for the APIs developers build on — LLM
inference, speech, messaging, maps, and vector databases. One JSON file per
provider, a `verified_at` date on each, updated when the provider changes.

Powers [api-rate.store](https://api-rate.store). Free to reuse under CC BY 4.0 —
credit "api-rate.store / pricing-models" with a link.

## Layout

```
providers/<slug>.json    one provider — see schema.json
build/all.json           every provider, merged (generated)
build/<category>.json     one file per category (generated)
build/index.json          counts + which files are stale
scripts/import-openrouter.js   refresh the LLM files from OpenRouter's models API
scripts/build.js               regenerate build/
```

## Provider file

```json
{
  "provider": "OpenAI",
  "slug": "openai",
  "category": "llm",
  "pricing_url": "https://openai.com/api/pricing/",
  "currency": "USD",
  "verified_at": "2026-09-10",
  "source": "openrouter",
  "rates": [
    { "item": "gpt-5", "unit": "1M tokens", "input": 1.25, "output": 10.0, "cached_input": 0.125 }
  ]
}
```

- **LLM** rates carry `input` / `output` (and often `cached_input`), per `1M tokens`.
- **speech / messaging / maps / vectors** rates carry a single `rate`, per the
  stated `unit` (`minute`, `1K emails`, `message`, `1K requests`, `GB/mo`, …).
- `source`: `openrouter` (LLM rates cross-checked against OpenRouter's live API),
  `manual` (a person read the pricing page), or `parser:<name>`.
- `verified_at`: the day the numbers were last confirmed. Consumers should treat
  anything older than ~45 days as needing a re-check.

## Updating

```
node scripts/import-openrouter.js   # refresh LLM providers from OpenRouter
node scripts/build.js               # rebuild build/
```

Files with `"source": "manual"` are never overwritten by the importer — edit
them by hand against `pricing_url` and bump `verified_at`.

## Use it

```bash
curl -s https://raw.githubusercontent.com/UNAUTH-ACCESS/pricing-models/main/build/llm.json \
  | jq '.providers[] | {provider, models: [.rates[] | {(.item): .input}]}'
```

```python
import json, urllib.request
d = json.load(urllib.request.urlopen(
  "https://raw.githubusercontent.com/UNAUTH-ACCESS/pricing-models/main/build/all.json"))
for p in d["providers"]:
    print(p["provider"], len(p["rates"]), "rates", "· verified", p["verified_at"])
```

## Corrections

Open an issue or a PR with the provider, the wrong figure, the right figure, and
the pricing-page URL you read it from.
