import type { ConfigWriter } from "./types.js";
import { createJsoncWriter } from "./jsonc.js";
import { createTomlWriter } from "./toml.js";
import { createJsonKeyOwnedWriter } from "./json-key-owned.js";
import { createYamlWriter } from "./yaml.js";

export function createWriterRegistry(): ConfigWriter[] {
  return [createJsoncWriter(), createTomlWriter(), createJsonKeyOwnedWriter(), createYamlWriter()];
}

export function resolveWriter(path: string, source: string, registry: ConfigWriter[]): ConfigWriter {
  for (const w of registry) if (w.supports(path, source)) return w;
  throw new Error(`no writer supports ${path}`);
}
