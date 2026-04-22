export type FetchSource =
  | { type: "file"; path: string }
  | { type: "git"; url: string; ref: string }
  | { type: "http"; url: string; sha256: string }
  | { type: "npm"; package: string; version: string }
  | { type: "external"; command: string; args: string[] }
  | { type: "adopted"; path: string }
  | { type: string; [k: string]: unknown };

export interface FetchResult {
  localPath: string;
  kind: "file" | "directory";
  sourceDigest: string;
  fetchedAt: string;
}

export interface FetchContext {
  concordHome: string;
  cacheDir: string;
  detectCache?: Record<string, unknown>;
  allowNetwork?: boolean;
}

export interface Fetcher {
  supports(source: FetchSource): boolean;
  fetch(source: FetchSource, ctx: FetchContext): Promise<FetchResult>;
}

export interface FetchError extends Error {
  code:
    | "fetch-failed"
    | "digest-mismatch"
    | "not-found"
    | "unsupported-source"
    | "network-disabled"
    | "provider-cli-missing";
  detail?: string;
}

export function makeFetchError(
  code: FetchError["code"],
  message: string,
  detail?: string,
): FetchError {
  const e = new Error(message) as FetchError;
  e.code = code;
  e.detail = detail;
  (e as Error).name = "FetchError";
  return e;
}
