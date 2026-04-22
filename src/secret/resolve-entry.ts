import { createHash } from "node:crypto";
import { renderString } from "./render.js";
import { shouldConcordInterpolate } from "./provider-policy.js";
import { isAllowedField } from "../schema/interpolation-allowlist.js";
import type { ResolvedEntry, ResolverContext } from "./types.js";

/**
 * Walk an entry; resolve any `{env:X}`/`{file:X}` in allowed fields (E-7).
 * - Provider = opencode: bypass entirely (E-5 Π3).
 * - Unknown/forbidden fields: pass through unchanged.
 * Returns a DEEP CLONE with substituted values + envDigest + debug map.
 */
export function resolveEntry(
  entry: Record<string, unknown>,
  ctx: ResolverContext,
): ResolvedEntry {
  if (!shouldConcordInterpolate(ctx.provider, ctx.assetType)) {
    return {
      entry: structuredClone(entry),
      envDigest: computeDigest(new Map()),
      resolvedFields: new Map(),
    };
  }

  const clone = structuredClone(entry);
  const resolvedFields = new Map<string, string>();
  walk(clone, "", ctx, resolvedFields);

  return {
    entry: clone,
    envDigest: computeDigest(resolvedFields),
    resolvedFields,
  };
}

function walk(
  node: unknown,
  fieldPath: string,
  ctx: ResolverContext,
  out: Map<string, string>,
): void {
  if (typeof node === "string") return; // handled by parent (we rewrite via parent assignment)
  if (Array.isArray(node)) {
    for (let i = 0; i < node.length; i++) {
      const child = node[i];
      const p = fieldPath ? `${fieldPath}.${i}` : String(i);
      if (typeof child === "string") {
        if (isAllowedField(stripArrayIndex(p))) {
          const rendered = renderString(child, { ...ctx, fieldPath: p });
          if (rendered !== child) {
            node[i] = rendered;
            out.set(p, rendered);
          }
        }
      } else {
        walk(child, p, ctx, out);
      }
    }
    return;
  }
  if (node !== null && typeof node === "object") {
    const obj = node as Record<string, unknown>;
    for (const k of Object.keys(obj)) {
      const child = obj[k];
      const p = fieldPath ? `${fieldPath}.${k}` : k;
      if (typeof child === "string") {
        if (isAllowedField(stripArrayIndex(p))) {
          const rendered = renderString(child, { ...ctx, fieldPath: p });
          if (rendered !== child) {
            obj[k] = rendered;
            out.set(p, rendered);
          }
        }
      } else {
        walk(child, p, ctx, out);
      }
    }
  }
}

function stripArrayIndex(p: string): string {
  return p.replace(/\.\d+$/g, "").replace(/\.\d+\./g, ".");
}

function computeDigest(fields: Map<string, string>): string {
  const h = createHash("sha256");
  const keys = [...fields.keys()].sort();
  for (const k of keys) {
    h.update(k);
    h.update("\0");
    h.update(fields.get(k)!);
    h.update("\0");
  }
  return `sha256:${h.digest("hex")}`;
}
