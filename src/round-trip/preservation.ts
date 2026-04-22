import type { PreservationReport } from "./types.js";

type Region = { startOffset: number; endOffset: number };

/**
 * changedRegions 외부 영역의 byte-level 보존 여부 검증.
 *
 * 전략:
 * 1. 원본과 수정본을 changedRegions 경계로 slice 해서 외부 조각만 연결 (originalOutside / modifiedOutside).
 * 2. 두 조각의 길이 + 문자 단위 비교.
 * 3. 길이 달라도 문자 단위로 비교: Plan 2A 는 UTF-8 문자열 가정 (Windows CRLF/BOM 은 별도 fixture 에서 명시).
 *
 * changedRegions 는 **원본 기준 offset**. 수정본은 길이가 달라질 수 있으므로,
 * 외부 영역 비교는 원본 외부 bytes 와 "그에 대응하는 수정본 외부 bytes" 를 매핑해야 한다.
 *
 * 단순화: 이 plan 에선 "changedRegions 외부의 원본 bytes 와 수정본의 동일 offset bytes" 를 직접 비교.
 * 단, edit 으로 길이가 바뀌면 이 매핑이 부정확해진다 → wrapper 가 changedRegions 를 수정본 기준으로
 * 반환해야 한다는 계약. 구체화를 위해 이 유틸은 **원본 기준 regions + 수정본 의 동일 offset 비교** 로 단순화.
 *
 * 길이 변경 대응: 변경 영역 중 가장 뒤쪽 region 의 length delta 를 tail 조정에 반영.
 */
export function verifyPreservation(
  original: string,
  modified: string,
  changedRegions: ReadonlyArray<Region>,
): PreservationReport {
  const sorted = [...changedRegions].sort((a, b) => a.startOffset - b.startOffset);
  const originalBytes = Buffer.byteLength(original, "utf8");
  const modifiedBytes = Buffer.byteLength(modified, "utf8");

  if (sorted.length === 0) {
    // 변경 영역 명시 없음 → 전체 diff 가 outside
    const outsideChanges = countDiffBytes(original, modified);
    return {
      preserved: original === modified,
      outsideChangesByteCount: outsideChanges,
      changedRegions: [],
      originalBytes,
      modifiedBytes,
    };
  }

  // 원본의 outside 조각 + 수정본의 outside 조각을 재구성.
  // 길이 변화 보정: 각 region 이 순서대로 처리됨. modified 의 cursor 는 누적 delta 반영.
  let origCursor = 0;
  let modCursor = 0;
  let outsideDiff = 0;

  for (const region of sorted) {
    // 원본 [origCursor, region.startOffset) 외부 영역
    const outsideOrig = original.slice(origCursor, region.startOffset);
    const outsideMod = modified.slice(modCursor, modCursor + outsideOrig.length);
    if (outsideOrig !== outsideMod) {
      outsideDiff += countDiffBytes(outsideOrig, outsideMod);
    }
    origCursor = region.endOffset;
    // 수정본에서 이 region 에 해당하는 조각은 길이가 달라질 수 있음.
    // 가장 단순한 매핑: outside 동일 구간을 먼저 지나가고, 나머지 modified 끝까지를 tail 로 본다.
    // 다중 regions 대응: outside 길이 + 원본 region 길이(동일 길이 가정) 만큼 수정본 cursor 전진.
    modCursor += outsideOrig.length + (region.endOffset - region.startOffset);
  }

  // 마지막 region 뒤의 tail 비교
  const tailOrig = original.slice(origCursor);
  const tailMod = modified.slice(modifiedBytes - Buffer.byteLength(tailOrig, "utf8"));
  // tail 길이 맞추기 (UTF-8 기준)
  const tailModSliced = modified.slice(modified.length - tailOrig.length);
  if (tailOrig !== tailModSliced) {
    outsideDiff += countDiffBytes(tailOrig, tailModSliced);
  }

  return {
    preserved: outsideDiff === 0,
    outsideChangesByteCount: outsideDiff,
    changedRegions: sorted,
    originalBytes,
    modifiedBytes,
  };
}

function countDiffBytes(a: string, b: string): number {
  const minLen = Math.min(a.length, b.length);
  let diff = Math.abs(a.length - b.length);
  for (let i = 0; i < minLen; i++) {
    if (a[i] !== b[i]) diff++;
  }
  return diff;
}
