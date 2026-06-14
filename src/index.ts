/**
 * APIA JavaScript/TypeScript SDK
 * ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
 * Client for the APIA standard — AI-native API manifest discovery.
 *
 * @example
 * ```ts
 * import { Registry } from "apia";
 *
 * const registry = new Registry();
 * const apis = await registry.find("send telegram message");
 * const tools = apis[0].toOpenAITools();
 * ```
 */

export { Registry, ApiaError, ManifestNotFoundError } from "./registry.js";
export type { ListOptions, FindOptions } from "./registry.js";
export { Manifest } from "./manifest.js";
export type {
  ManifestData,
  Service,
  Auth,
  Capability,
  InputParam,
  OutputSpec,
  RegistryEntry,
  RegistryData,
  OpenAITool,
  Category,
} from "./types.js";
