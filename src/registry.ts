import type { RegistryData, RegistryEntry, Category } from "./types";
import { Manifest } from "./manifest";

const REGISTRY_URL =
  "https://raw.githubusercontent.com/Komsomol39/apia-standard/main/registry.json";
const MANIFEST_BASE_URL =
  "https://raw.githubusercontent.com/Komsomol39/apia-standard/main/manifests";

export class ApiaError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ApiaError";
  }
}

export class ManifestNotFoundError extends ApiaError {
  constructor(id: string) {
    super(`Manifest not found: "${id}"`);
    this.name = "ManifestNotFoundError";
  }
}

export interface ListOptions {
  /** One of 26 APIA categories e.g. "ai", "finance", "maps" */
  category?: Category | string;
  /** ISO country code or "GLOBAL" */
  geo?: string;
  /** Only APIs with anonymous_access = true */
  freeOnly?: boolean;
  /** Primary language e.g. "ru", "en" */
  language?: string;
}

export interface FindOptions extends ListOptions {
  /** Max number of results (default 3) */
  topK?: number;
}

/**
 * APIA Registry — loads and searches 257 API manifests.
 *
 * @example
 * ```ts
 * const registry = new Registry();
 * const apis = await registry.find("send a telegram message");
 * const manifest = await registry.get("stripe");
 * const tools = manifest.toOpenAITools();
 * ```
 */
export class Registry {
  private readonly registryUrl: string;
  private index: RegistryEntry[] | null = null;
  private cache = new Map<string, Manifest>();

  constructor(registryUrl = REGISTRY_URL) {
    this.registryUrl = registryUrl;
  }

  private async ensureLoaded(): Promise<void> {
    if (this.index !== null) return;
    const response = await fetch(this.registryUrl);
    if (!response.ok) {
      throw new ApiaError(`Failed to load APIA registry: ${response.statusText}`);
    }
    const data = (await response.json()) as RegistryData;
    this.index = data.manifests;
  }

  /**
   * List registry entries with optional filters. Returns lightweight entries,
   * not full manifests.
   */
  async list(options: ListOptions = {}): Promise<RegistryEntry[]> {
    await this.ensureLoaded();
    let results = this.index!;

    if (options.category) {
      results = results.filter((m) => m.category === options.category);
    }
    if (options.geo) {
      results = results.filter(
        (m) => m.geo.includes(options.geo!) || m.geo.includes("GLOBAL")
      );
    }
    if (options.freeOnly) {
      results = results.filter((m) => m.anonymous_access);
    }
    if (options.language) {
      results = results.filter((m) => m.language === options.language);
    }
    return results;
  }

  /**
   * Return a map of { category → count } for all manifests.
   */
  async categories(): Promise<Record<string, number>> {
    await this.ensureLoaded();
    const counts: Record<string, number> = {};
    for (const m of this.index!) {
      counts[m.category] = (counts[m.category] ?? 0) + 1;
    }
    return counts;
  }

  /**
   * Find the most relevant APIs for a natural language task.
   * Returns full Manifest objects sorted by relevance.
   */
  async find(task: string, options: FindOptions = {}): Promise<Manifest[]> {
    await this.ensureLoaded();
    const taskLower = task.toLowerCase();
    const topK = options.topK ?? 3;

    let candidates = this.index!;
    if (options.category) {
      candidates = candidates.filter((m) => m.category === options.category);
    }
    if (options.geo) {
      candidates = candidates.filter(
        (m) => m.geo.includes(options.geo!) || m.geo.includes("GLOBAL")
      );
    }
    if (options.freeOnly) {
      candidates = candidates.filter((m) => m.anonymous_access);
    }

    const scored = candidates
      .map((entry) => {
        let score = 0;
        // Match service description
        if (entry.description_for_ai.toLowerCase().split(" ").some((w) => taskLower.includes(w))) {
          score += 1;
        }
        // Match capability intents (stronger signal)
        for (const cap of entry.capabilities) {
          const matched = cap.intent.some(
            (phrase) =>
              taskLower.includes(phrase.toLowerCase()) ||
              phrase.toLowerCase().includes(taskLower)
          );
          if (matched) { score += 3; break; }
        }
        return { score, entry };
      })
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);

    return Promise.all(scored.map((x) => this.get(x.entry.id)));
  }

  /**
   * Load a full manifest by API id.
   * @throws {ManifestNotFoundError} if the manifest doesn't exist.
   */
  async get(apiId: string): Promise<Manifest> {
    const cached = this.cache.get(apiId);
    if (cached) return cached;

    const url = `${MANIFEST_BASE_URL}/${apiId}/apia.json`;
    const response = await fetch(url);

    if (response.status === 404) {
      throw new ManifestNotFoundError(apiId);
    }
    if (!response.ok) {
      throw new ApiaError(`Failed to load manifest "${apiId}": ${response.statusText}`);
    }

    const data = await response.json();
    const manifest = new Manifest(data);
    this.cache.set(apiId, manifest);
    return manifest;
  }

  /**
   * Build a system prompt containing multiple API manifests for LLM injection.
   */
  buildSystemPrompt(
    apis: Manifest[],
    header = "You are an AI agent with access to the following APIs:"
  ): string {
    const parts = [header, ""];
    for (const manifest of apis) {
      parts.push(manifest.toSystemPrompt());
      parts.push("---");
    }
    parts.push(
      "\nWhen the user asks something, identify which API and capability to use, " +
      "explain your reasoning, and provide the exact API call."
    );
    return parts.join("\n");
  }
}
