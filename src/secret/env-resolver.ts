import { makeResolveError, type ResolverContext } from "./types.js";
import type { ParsedExpression } from "./parser.js";

export function resolveEnv(expr: ParsedExpression, ctx: ResolverContext): string {
  if (expr.scheme !== "env") {
    throw makeResolveError(
      "reserved-syntax",
      `resolveEnv called with scheme=${expr.scheme}`,
      expr.raw,
    );
  }
  const raw = ctx.env[expr.value];
  // E-11 empty string + default → use default (Docker Compose `:-` behavior)
  if ((raw === undefined || raw === "") && expr.default !== undefined) {
    return expr.default;
  }
  if (raw === undefined || raw === "") {
    if (expr.optional) return "";
    throw makeResolveError(
      "env-var-missing",
      `env-var-missing at ${ctx.fieldPath}: ${expr.raw} (E-4). Use ${expr.raw.slice(0, -1)}:-default} for default, or ${expr.raw.slice(0, -1)}?} for optional.`,
      expr.raw,
    );
  }
  return raw;
}
