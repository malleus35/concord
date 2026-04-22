export type ResolveErrorCode =
  | "env-var-missing"
  | "file-not-found"
  | "file-not-utf8"
  | "path-traversal"
  | "nested-interpolation"
  | "type-coercion-not-allowed"
  | "reserved-syntax"
  | "escape-malformed";

export interface ResolveError extends Error {
  code: ResolveErrorCode;
  /** Original unresolved expression (never the resolved value — E-17). */
  expression: string;
}

export function makeResolveError(
  code: ResolveErrorCode,
  message: string,
  expression: string,
): ResolveError {
  const e = new Error(message) as ResolveError;
  e.code = code;
  e.expression = expression;
  e.name = "ResolveError";
  return e;
}

export interface ResolverContext {
  /** Absolute project root for {file:X} path traversal check (E-10). */
  projectRoot: string;
  /** Env snapshot used for this resolve pass. */
  env: Readonly<Record<string, string | undefined>>;
  provider: "claude-code" | "codex" | "opencode";
  assetType:
    | "skills"
    | "subagents"
    | "hooks"
    | "mcp_servers"
    | "instructions"
    | "plugins";
  /** For error messages: dot path like "source.url" or "env.GITHUB_TOKEN". */
  fieldPath: string;
}

export interface ResolvedEntry {
  /** The manifest entry with resolve-eligible fields replaced. */
  entry: Record<string, unknown>;
  /** sha256 of concat(resolvedFields entries) — E-2a env-drift input. */
  envDigest: string;
  /** Debug trace of (fieldPath → resolvedValue). Never logged in production (E-17). */
  resolvedFields: Map<string, string>;
}
