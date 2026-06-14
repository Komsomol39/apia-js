/**
 * APIA TypeScript types — mirrors the apia.json manifest schema.
 */

export interface Auth {
  type: string;
  anonymous_access: boolean;
  how_to_get?: string;
  cost?: string;
  header?: string;
  param_name?: string;
  param_location?: string;
  token_url?: string;
  note?: string;
}

export interface Service {
  id: string;
  name: string;
  description_for_ai: string;
  category: string;
  geo: string[];
  language?: string;
  url?: string;
  api_base?: string;
  docs?: string;
}

export interface InputParam {
  type: string;
  description?: string;
  required?: boolean;
  default?: unknown;
  enum?: string[];
  note?: string;
}

export interface OutputSpec {
  type: string;
  fields?: string[];
}

export interface Capability {
  id: string;
  description_for_ai: string;
  intent: string[];
  endpoint: string;
  input?: Record<string, InputParam>;
  output?: OutputSpec;
  realtime?: boolean;
  requires_auth?: boolean;
  rate_limit?: string;
}

export interface ManifestData {
  apia: string;
  service: Service;
  auth: Auth;
  capabilities: Capability[];
  agent_hints?: Record<string, string>;
  meta?: {
    apia_version: string;
    manifest_author?: string;
    last_verified?: string;
  };
}

export interface RegistryEntry {
  id: string;
  name: string;
  description_for_ai: string;
  category: string;
  geo: string[];
  language?: string;
  url?: string;
  docs?: string;
  api_base?: string;
  auth_type: string;
  anonymous_access: boolean;
  cost?: string;
  agent_hints?: Record<string, string>;
  capabilities: Array<{
    id: string;
    description_for_ai: string;
    intent: string[];
    endpoint: string;
    realtime?: boolean;
    requires_auth?: boolean;
  }>;
  manifest_path: string;
  manifest_url: string;
}

export interface RegistryData {
  _meta: {
    version: string;
    generated: string;
    total: number;
    categories: Record<string, number>;
    description: string;
  };
  manifests: RegistryEntry[];
}

/** OpenAI-compatible tool/function definition */
export interface OpenAITool {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: {
      type: "object";
      properties: Record<string, { type: string; description: string; enum?: string[] }>;
      required: string[];
    };
  };
}

export type Category =
  | "ai" | "ai_media" | "analytics" | "business" | "devtools"
  | "ecommerce" | "environment" | "finance" | "food" | "healthcare"
  | "hr" | "iot" | "legal" | "logistics" | "maps" | "media"
  | "nlp" | "productivity" | "real_estate" | "science" | "security"
  | "social" | "sports" | "support" | "transport" | "utilities";
