import { findAllExpressions } from "./parser.js";
import { resolveEnv } from "./env-resolver.js";
import { resolveFile } from "./file-resolver.js";
import { makeResolveError, type ResolverContext } from "./types.js";
import { checkNested } from "../schema/interpolation-allowlist.js";

/**
 * Render a full string — replaces each `{scheme:...}` expression with its
 * resolved value (E-1 / E-11). Applies E-13 escape. Enforces:
 *   - E-9 nested guard via checkNested
 *   - E-14 depth=1: resolved values are NOT re-scanned
 *   - E-13 escape `{{...}}` → literal `{...}`
 */
export function renderString(input: string, ctx: ResolverContext): string {
  // E-9 nested guard (throws InterpolationError)
  try {
    checkNested(input);
  } catch (err) {
    throw makeResolveError(
      "nested-interpolation",
      `nested-interpolation at ${ctx.fieldPath}: ${err instanceof Error ? err.message : String(err)}`,
      input,
    );
  }

  const exprs = findAllExpressions(input);

  let out = "";
  let i = 0;
  let exprIdx = 0;
  while (i < input.length) {
    // E-13 escape handling
    if (input[i] === "{" && input[i + 1] === "{") {
      const end = input.indexOf("}}", i + 2);
      if (end === -1) {
        throw makeResolveError(
          "escape-malformed",
          `escape-malformed: unclosed {{...}} at ${ctx.fieldPath}`,
          input,
        );
      }
      // `{{foo}}` → `{foo}`
      out += "{" + input.slice(i + 2, end) + "}";
      i = end + 2;
      continue;
    }
    // Real expression?
    if (input[i] === "{" && exprIdx < exprs.length && input.slice(i).startsWith(exprs[exprIdx]!.raw)) {
      const expr = exprs[exprIdx]!;
      let resolved: string;
      if (expr.scheme === "env") resolved = resolveEnv(expr, ctx);
      else if (expr.scheme === "file") resolved = resolveFile(expr, ctx);
      else {
        throw makeResolveError(
          "reserved-syntax",
          `reserved-syntax: unknown scheme "${expr.scheme}" at ${ctx.fieldPath}: ${expr.raw}`,
          expr.raw,
        );
      }
      out += resolved;
      i += expr.raw.length;
      exprIdx++;
      continue;
    }
    out += input[i];
    i++;
  }
  return out;
}
