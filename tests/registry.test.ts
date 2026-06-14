import { Registry, Manifest, ManifestNotFoundError, ApiaError } from "../src/index.js";

// ── Fixtures ─────────────────────────────────────────────────────────────────

const SAMPLE_MANIFEST = {
  apia: "1.0",
  service: {
    id: "telegram-bot",
    name: "Telegram Bot API",
    description_for_ai: "Send messages via Telegram. 950M users.",
    category: "social",
    geo: ["GLOBAL"],
    language: "en",
    url: "https://telegram.org",
    api_base: "https://api.telegram.org/bot{token}",
    docs: "https://core.telegram.org/bots/api",
  },
  auth: { type: "apikey", anonymous_access: false, cost: "Free" },
  capabilities: [
    {
      id: "send_message",
      description_for_ai: "Send a text message to a Telegram user or group.",
      intent: ["send telegram message", "telegram notify", "bot send"],
      endpoint: "POST https://api.telegram.org/bot{token}/sendMessage",
      input: {
        chat_id: { type: "string", required: true, description: "Chat ID" },
        text: { type: "string", required: true, description: "Message text" },
        parse_mode: { type: "string", required: false, description: "HTML or Markdown" },
      },
      output: { type: "message", fields: ["message_id", "text"] },
      realtime: true,
      requires_auth: true,
    },
  ],
  agent_hints: { tip: "Get token from @BotFather" },
  meta: { apia_version: "1.0", last_verified: "2026-06-14" },
};

const SAMPLE_REGISTRY = {
  _meta: { version: "1.0", generated: "2026-06-14", total: 1, categories: { social: 1 }, description: "" },
  manifests: [
    {
      id: "telegram-bot",
      name: "Telegram Bot API",
      description_for_ai: "Send messages via Telegram.",
      category: "social",
      geo: ["GLOBAL"],
      language: "en",
      auth_type: "apikey",
      anonymous_access: false,
      cost: "Free",
      capabilities: [
        {
          id: "send_message",
          description_for_ai: "Send a message.",
          intent: ["send telegram message", "telegram notify"],
          endpoint: "POST https://api.telegram.org/bot{token}/sendMessage",
          realtime: true,
          requires_auth: true,
        },
      ],
      manifest_path: "manifests/telegram-bot/apia.json",
      manifest_url:
        "https://raw.githubusercontent.com/Komsomol39/apia-standard/main/manifests/telegram-bot/apia.json",
    },
  ],
};

// ── Manifest tests ────────────────────────────────────────────────────────────

describe("Manifest", () => {
  const m = new Manifest(SAMPLE_MANIFEST as any);

  test("basic properties", () => {
    expect(m.id).toBe("telegram-bot");
    expect(m.name).toBe("Telegram Bot API");
    expect(m.category).toBe("social");
    expect(m.isFree).toBe(false);
    expect(m.capabilities).toHaveLength(1);
  });

  test("findCapability — match", () => {
    const cap = m.findCapability("send telegram message");
    expect(cap).not.toBeNull();
    expect(cap!.id).toBe("send_message");
  });

  test("findCapability — no match", () => {
    expect(m.findCapability("book a flight")).toBeNull();
  });

  test("toOpenAITools", () => {
    const tools = m.toOpenAITools();
    expect(tools).toHaveLength(1);
    const tool = tools[0];
    expect(tool.type).toBe("function");
    expect(tool.function.name).toBe("send_message");
    expect(tool.function.parameters.properties).toHaveProperty("chat_id");
    expect(tool.function.parameters.required).toContain("chat_id");
    expect(tool.function.parameters.required).toContain("text");
    expect(tool.function.parameters.required).not.toContain("parse_mode");
  });

  test("toSystemPrompt contains key info", () => {
    const prompt = m.toSystemPrompt();
    expect(prompt).toContain("Telegram Bot API");
    expect(prompt).toContain("send_message");
    expect(prompt).toContain("POST");
    expect(prompt).toContain("BotFather");
  });
});

// ── Registry tests ────────────────────────────────────────────────────────────

function makeRegistry(overrides: Partial<Registry> = {}): Registry {
  const r = new Registry("https://example.com/registry.json");
  (r as any).index = SAMPLE_REGISTRY.manifests;
  return Object.assign(r, overrides);
}

describe("Registry", () => {
  test("list — all", async () => {
    const r = makeRegistry();
    const entries = await r.list();
    expect(entries).toHaveLength(1);
  });

  test("list — by category match", async () => {
    const r = makeRegistry();
    expect(await r.list({ category: "social" })).toHaveLength(1);
    expect(await r.list({ category: "finance" })).toHaveLength(0);
  });

  test("list — geo GLOBAL matches any country", async () => {
    const r = makeRegistry();
    expect(await r.list({ geo: "RU" })).toHaveLength(1);
    expect(await r.list({ geo: "JP" })).toHaveLength(1);
  });

  test("list — freeOnly excludes non-anonymous", async () => {
    const r = makeRegistry();
    expect(await r.list({ freeOnly: true })).toHaveLength(0);
  });

  test("categories", async () => {
    const r = makeRegistry();
    const cats = await r.categories();
    expect(cats).toEqual({ social: 1 });
  });

  test("find — by intent", async () => {
    const r = makeRegistry();
    jest.spyOn(r, "get").mockResolvedValue(new Manifest(SAMPLE_MANIFEST as any));
    const results = await r.find("send telegram message");
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe("telegram-bot");
  });

  test("find — no results", async () => {
    const r = makeRegistry();
    const results = await r.find("reserve a rocket to the Moon");
    expect(results).toHaveLength(0);
  });

  test("get — loads and caches", async () => {
    const r = makeRegistry();
    const mockFetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => SAMPLE_MANIFEST,
    } as any);
    global.fetch = mockFetch;

    const m1 = await r.get("telegram-bot");
    const m2 = await r.get("telegram-bot"); // should use cache
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(m1).toBe(m2);
    expect(m1.id).toBe("telegram-bot");
  });

  test("get — not found throws ManifestNotFoundError", async () => {
    const r = makeRegistry();
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 404, statusText: "Not Found" } as any);
    await expect(r.get("nonexistent")).rejects.toThrow(ManifestNotFoundError);
  });

  test("buildSystemPrompt", async () => {
    const r = makeRegistry();
    const m = new Manifest(SAMPLE_MANIFEST as any);
    const prompt = r.buildSystemPrompt([m]);
    expect(prompt).toContain("You are an AI agent");
    expect(prompt).toContain("Telegram Bot API");
  });
});
