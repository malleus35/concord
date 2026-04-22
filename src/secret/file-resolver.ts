import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { makeResolveError, type ResolverContext } from "./types.js";
import type { ParsedExpression } from "./parser.js";
import { checkPathTraversal } from "../schema/interpolation-allowlist.js";

function stripBom(s: string): string {
  return s.charCodeAt(0) === 0xfeff ? s.slice(1) : s;
}

function isValidUtf8(buf: Buffer): boolean {
  try {
    new TextDecoder("utf-8", { fatal: true }).decode(buf);
    return true;
  } catch {
    return false;
  }
}

export function resolveFile(expr: ParsedExpression, ctx: ResolverContext): string {
  if (expr.scheme !== "file") {
    throw makeResolveError(
      "reserved-syntax",
      `resolveFile called with scheme=${expr.scheme}`,
      expr.raw,
    );
  }

  const rawPath = expr.value;
  const expanded = rawPath === "~" ? os.homedir()
    : rawPath.startsWith("~/") ? path.join(os.homedir(), rawPath.slice(2))
    : rawPath;

  // E-10 path traversal (re-uses Plan 1 helper — throws InterpolationError)
  try {
    checkPathTraversal(expanded, ctx.projectRoot);
  } catch (err) {
    throw makeResolveError(
      "path-traversal",
      `path-traversal at ${ctx.fieldPath}: ${expr.raw} (E-10). ${err instanceof Error ? err.message : String(err)}`,
      expr.raw,
    );
  }

  const abs = path.isAbsolute(expanded) ? expanded : path.resolve(ctx.projectRoot, expanded);

  let buf: Buffer;
  try {
    buf = fs.readFileSync(abs);
  } catch {
    if (expr.default !== undefined) return expr.default;
    if (expr.optional) return "";
    throw makeResolveError(
      "file-not-found",
      `file-not-found at ${ctx.fieldPath}: ${expr.raw}. Create the file or use ${expr.raw.slice(0, -1)}:-default} for default.`,
      expr.raw,
    );
  }

  if (!isValidUtf8(buf)) {
    throw makeResolveError(
      "file-not-utf8",
      `file-not-utf8 at ${ctx.fieldPath}: ${expr.raw} (E-15). Binary encoding reserved for Phase 2 (${expr.raw.slice(0, -1)}|base64}).`,
      expr.raw,
    );
  }

  return stripBom(buf.toString("utf8"));
}
