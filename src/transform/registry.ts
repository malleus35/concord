import type { FormatTransformer, TransformContext } from "./types.js";
import { createMcpWindowsCommandTransformer } from "./mcp-windows.js";

export function createTransformerRegistry(): FormatTransformer[] {
  return [createMcpWindowsCommandTransformer()];
}

export function applyTransformers(
  content: unknown,
  ctx: TransformContext,
  registry: FormatTransformer[],
): { result: unknown; appliedNames: string[] } {
  let cur = content;
  const applied: string[] = [];
  for (const t of registry) {
    const { applied: a, result } = t.transform(cur, ctx);
    if (a) { applied.push(t.name); cur = result; }
  }
  return { result: cur, appliedNames: applied };
}
