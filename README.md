# apia-js

JavaScript/TypeScript SDK for [APIA](https://github.com/Komsomol39/apia-standard) — the open standard for AI-native API manifests.

```bash
npm install @apia/sdk
# or
pnpm add @apia/sdk
# or
yarn add @apia/sdk
```

Works in Node.js 18+ and modern browsers (uses native `fetch`).

## Quickstart

```ts
import { Registry } from "@apia/sdk";

const registry = new Registry();

// Find APIs for a natural language task
const apis = await registry.find("send a telegram message");
console.log(apis[0].name);      // → Telegram Bot API
console.log(apis[0].category);  // → social

// Load a specific manifest by id
const stripe = await registry.get("stripe");
console.log(stripe.service.description_for_ai);

// Convert to OpenAI tools
const tools = stripe.toOpenAITools();

// Build a system prompt for an LLM
const prompt = registry.buildSystemPrompt(apis);
```

## Core API

### `Registry`

```ts
import { Registry } from "@apia/sdk";
const r = new Registry();

// Search by intent (natural language)
await r.find("track DHL package")                  // → Manifest[]
await r.find("send email", { category: "social" }) // → filtered

// Load a specific manifest
await r.get("openai")                              // → Manifest
await r.get("telegram-bot")

// List with filters
await r.list({ category: "ai" })                  // all AI APIs
await r.list({ geo: "RU", freeOnly: true })        // free Russian APIs
await r.list({ language: "ru" })                   // Russian-language APIs

// Categories breakdown
await r.categories()  // → { ai: 25, finance: 17, ... }

// Build LLM system prompt from multiple manifests
const prompt = r.buildSystemPrompt(apis);
```

### `Manifest`

```ts
const m = await r.get("stripe");

m.id                    // "stripe"
m.name                  // "Stripe"
m.category              // "finance"
m.geo                   // ["GLOBAL"]
m.isFree                // false
m.agentHints            // { test_cards: "...", ... }

// Find capability matching a task
const cap = m.findCapability("charge a customer");
cap?.id                 // "create_payment_intent"
cap?.endpoint           // "POST https://api.stripe.com/v1/payment_intents"

// Export
m.toOpenAITools()       // OpenAI function definitions
m.toSystemPrompt()      // formatted string for LLM system prompt
```

## Use with LLMs

### Anthropic Claude (via API)

```ts
import { Registry } from "@apia/sdk";
import Anthropic from "@anthropic-ai/sdk";

const registry = new Registry();
const apis = await registry.find("get weather forecast");
const system = registry.buildSystemPrompt(apis);

const client = new Anthropic();
const response = await client.messages.create({
  model: "claude-haiku-4-5",
  max_tokens: 1024,
  system,
  messages: [{ role: "user", content: "What is the weather in Tokyo?" }],
});
console.log(response.content[0].text);
```

### OpenAI function calling

```ts
import { Registry } from "@apia/sdk";
import OpenAI from "openai";

const registry = new Registry();
const manifest = await registry.get("openweathermap");
const tools = manifest.toOpenAITools();

const client = new OpenAI();
const response = await client.chat.completions.create({
  model: "gpt-4o-mini",
  messages: [{ role: "user", content: "What is the weather in Paris?" }],
  tools,
});
```

### Filter free Russian APIs

```ts
const russianFreeApis = await registry.list({ geo: "RU", freeOnly: true });
console.log(`Free Russian APIs: ${russianFreeApis.length}`);
for (const api of russianFreeApis) {
  console.log(`• ${api.name} — ${api.description_for_ai.slice(0, 80)}...`);
}
```

## TypeScript

Full TypeScript support with strict types:

```ts
import type { Manifest, Capability, Category, OpenAITool } from "@apia/sdk";

const category: Category = "finance"; // type-checked against 26 valid values
```

## Development

```bash
git clone https://github.com/Komsomol39/apia-js
cd apia-js
npm install
npm run build
npm test
```

## Related

- [apia-standard](https://github.com/Komsomol39/apia-standard) — manifest registry (257 APIs)
- [apia-py](https://github.com/Komsomol39/apia-py) — Python SDK

## License

MIT
