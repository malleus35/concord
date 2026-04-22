import type { Fetcher, FetchSource } from "./types.js";
import { createFileFetcher } from "./file.js";
import { createGitFetcher } from "./git.js";
import { createHttpFetcher } from "./http.js";
import { createNpmFetcher } from "./npm.js";
import { createExternalFetcher } from "./external.js";
import { createAdoptedFetcher } from "./adopted.js";

export function createFetcherRegistry(): Fetcher[] {
  return [
    createFileFetcher(),
    createGitFetcher(),
    createHttpFetcher(),
    createNpmFetcher(),
    createExternalFetcher(),
    createAdoptedFetcher(),
  ];
}

export function resolveFetcher(source: FetchSource, registry: Fetcher[]): Fetcher {
  const f = registry.find((x) => x.supports(source));
  if (!f) throw new Error(`no fetcher supports source.type=${source.type}`);
  return f;
}
