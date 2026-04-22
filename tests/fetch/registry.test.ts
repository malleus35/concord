import { describe, it, expect } from "vitest";
import { createFetcherRegistry, resolveFetcher } from "../../src/fetch/registry.js";

describe("FetcherRegistry", () => {
  it("createFetcherRegistry() returns 6 fetchers", () => {
    const registry = createFetcherRegistry();
    expect(registry).toHaveLength(6);
  });

  it("resolveFetcher type=file → returns fetcher that supports file", () => {
    const registry = createFetcherRegistry();
    const f = resolveFetcher({ type: "file", path: "/some/path" }, registry);
    expect(f.supports({ type: "file", path: "/some/path" })).toBe(true);
  });

  it("resolveFetcher type=git → returns fetcher that supports git", () => {
    const registry = createFetcherRegistry();
    const f = resolveFetcher({ type: "git", url: "https://x", ref: "main" }, registry);
    expect(f.supports({ type: "git", url: "https://x", ref: "main" })).toBe(true);
  });

  it("resolveFetcher type=adopted → returns fetcher that supports adopted", () => {
    const registry = createFetcherRegistry();
    const f = resolveFetcher({ type: "adopted", path: "/some/path" }, registry);
    expect(f.supports({ type: "adopted", path: "/some/path" })).toBe(true);
  });

  it("resolveFetcher type=unknown → throws /no fetcher supports/", () => {
    const registry = createFetcherRegistry();
    expect(() => resolveFetcher({ type: "unknown" }, registry)).toThrow(/no fetcher supports/);
  });
});
