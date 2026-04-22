import { describe, it, expect } from "vitest";
import type { Fetcher, FetchResult } from "../../src/fetch/types.js";
import { makeFetchError } from "../../src/fetch/types.js";

describe("fetch/types", () => {
  it("makeFetchError: code + name", () => {
    const e = makeFetchError("not-found", "missing");
    expect(e.code).toBe("not-found");
    expect(e.name).toBe("FetchError");
  });
  it("Fetcher shape compiles", () => {
    const f: Fetcher = {
      supports: () => true,
      async fetch(): Promise<FetchResult> {
        return { localPath: "", kind: "file", sourceDigest: "", fetchedAt: "" };
      },
    };
    expect(typeof f.fetch).toBe("function");
  });
});
