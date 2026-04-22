import { describe, it, expect } from "vitest";
import { computeDiffRegions } from "../../src/round-trip/diff-regions.js";

describe("diff-regions", () => {
  it("동일 문자열 → 빈 배열", () => {
    expect(computeDiffRegions("abc", "abc")).toEqual([]);
  });

  it("중간만 다름 → 중간 범위 반환", () => {
    const regions = computeDiffRegions("AAA[old]BBB", "AAA[new]BBB");
    expect(regions).toHaveLength(1);
    expect(regions[0].startOffset).toBe(4);
    expect(regions[0].endOffset).toBe(7);
  });

  it("길이 변화 — prefix + suffix 공통 찾기 (삽입)", () => {
    const regions = computeDiffRegions("start___end", "start[INSERTED]___end");
    expect(regions).toHaveLength(1);
    expect(regions[0].startOffset).toBe(5);
    // 원본 기준이므로 endOffset 은 원본 길이 - suffix
    expect(regions[0].endOffset).toBe("start".length); // prefix 와 동일 → 삽입만 발생
  });
});
