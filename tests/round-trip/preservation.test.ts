import { describe, it, expect } from "vitest";
import { verifyPreservation } from "../../src/round-trip/preservation.js";

describe("round-trip/preservation", () => {
  it("동일한 문자열 (no change) → preserved true, 0 bytes", () => {
    const src = "hello world";
    const report = verifyPreservation(src, src, []);
    expect(report.preserved).toBe(true);
    expect(report.outsideChangesByteCount).toBe(0);
    expect(report.changedRegions).toEqual([]);
  });

  it("changedRegions 내부 변경 + 외부 동일 → preserved true", () => {
    const original = "AAAbbbCCC";
    const modified = "AAAXYZCCC";
    // 'bbb' (offset 3~6) 가 'XYZ' 로 교체됨
    const report = verifyPreservation(original, modified, [{ startOffset: 3, endOffset: 6 }]);
    expect(report.preserved).toBe(true);
    expect(report.outsideChangesByteCount).toBe(0);
  });

  it("changedRegions 외부 변경 → preserved false, byte count 양수", () => {
    const original = "AAAbbbCCC";
    const modified = "aaAXYZccC"; // offset 0,1 + 6,7 도 변경
    const report = verifyPreservation(original, modified, [{ startOffset: 3, endOffset: 6 }]);
    expect(report.preserved).toBe(false);
    expect(report.outsideChangesByteCount).toBeGreaterThan(0);
  });

  it("다중 changedRegions — 각 영역 내부는 변경 허용", () => {
    const original = "HEADxxxMIDyyyTAIL";
    const modified = "HEAD___MID***TAIL";
    const report = verifyPreservation(original, modified, [
      { startOffset: 4, endOffset: 7 }, // xxx → ___
      { startOffset: 10, endOffset: 13 }, // yyy → ***
    ]);
    expect(report.preserved).toBe(true);
  });

  it("변경 영역의 길이 변화 허용 (삽입)", () => {
    const original = "AAA[]BBB";
    const modified = "AAA[new stuff]BBB";
    const report = verifyPreservation(original, modified, [{ startOffset: 3, endOffset: 5 }]);
    expect(report.preserved).toBe(true);
    expect(report.modifiedBytes).toBeGreaterThan(report.originalBytes);
  });

  it("changedRegions 누락 → 모든 차이가 outside 로 계산", () => {
    const original = "same";
    const modified = "diff";
    const report = verifyPreservation(original, modified, []);
    expect(report.preserved).toBe(false);
    expect(report.outsideChangesByteCount).toBe(4); // 전체 4 bytes 모두 다름
  });

  it("regions 정렬 필요 없음 — 순서 무관", () => {
    const original = "xAxBxCx";
    const modified = "xAyBzCx";
    const report = verifyPreservation(original, modified, [
      { startOffset: 5, endOffset: 6 }, // Cx 자리 변경 없음
      { startOffset: 2, endOffset: 3 }, // A 다음 x → y
      { startOffset: 4, endOffset: 5 }, // B 다음 x → z
    ]);
    expect(report.preserved).toBe(true);
  });
});
