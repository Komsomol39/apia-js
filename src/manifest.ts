import type { ManifestData, Capability, OpenAITool, Auth, Service } from "./types";

/**
 * Represents a loaded APIA manifest with helper methods.
 */
export class Manifest {
  readonly data: ManifestData;

  constructor(data: ManifestData) {
    this.data = data;
  }

  get id(): string {
    return this.data.service.id;
  }

  get name(): string {
    return this.data.service.name;
  }

  get category(): string {
    return this.data.service.category;
  }

  get geo(): string[] {
    return this.data.service.geo;
  }

  get service(): Service {
    return this.data.service;
  }

  get auth(): Auth {
    return this.data.auth;
  }

  get capabilities(): Capability[] {
    return this.data.capabilities;
  }

  get agentHints(): Record<string, string> {
    return this.data.agent_hints ?? {};
  }

  get isFree(): boolean {
    return this.data.auth.anonymous_access;
  }

  /**
   * Find the first capability whose intent matches the given task string.
   */
  findCapability(task: string): Capability | null {
    const taskLower = task.toLowerCase();
    for (const cap of this.capabilities) {
      const matches = cap.intent.some(
        (phrase) =>
          taskLower.includes(phrase.toLowerCase()) ||
          phrase.toLowerCase().includes(taskLower)
      );
      if (matches) return cap;
    }
    return null;
  }

  /**
   * Convert all capabilities to OpenAI function/tool definitions.
   */
  toOpenAITools(): OpenAITool[] {
    return this.capabilities.map((cap) => {
      const properties: Record<string, { type: string; description: string; enum?: string[] }> = {};
      const required: string[] = [];

      for (const [name, spec] of Object.entries(cap.input ?? {})) {
        properties[name] = {
          type: spec.type ?? "string",
          description: spec.description ?? "",
        };
        if (spec.enum) properties[name].enum = spec.enum;
        if (spec.required) required.push(name);
      }

      return {
        type: "function",
        function: {
          name: cap.id,
          description: cap.description_for_ai,
          parameters: { type: "object", properties, required },
        },
      };
    });
  }

  /**
   * Format manifest as a system prompt section for an LLM.
   */
  toSystemPrompt(): string {
    const lines: string[] = [
      `## ${this.name}`,
      this.service.description_for_ai,
      `Auth: ${this.auth.type} | Cost: ${this.auth.cost ?? "unknown"}`,
      `Docs: ${this.service.docs ?? ""}`,
      "",
      "### Capabilities",
    ];

    for (const cap of this.capabilities) {
      lines.push(`**[${cap.id}]** \`${cap.endpoint}\``);
      lines.push(`When: ${cap.description_for_ai}`);
      lines.push(`Intent: ${cap.intent.slice(0, 5).join(", ")}`);
      lines.push("");
    }

    const hints = Object.entries(this.agentHints);
    if (hints.length > 0) {
      lines.push("### Hints");
      for (const [k, v] of hints) {
        lines.push(`- **${k}**: ${v}`);
      }
    }

    return lines.join("\n");
  }
}
