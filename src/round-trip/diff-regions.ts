/**
 * 원본과 수정본에서 실제로 달라진 byte 범위를 계산.
 *
 * 단순 알고리즘: prefix 공통 길이 + suffix 공통 길이 를 찾아 중간 diff 영역을 반환.
 * 다중 영역 편집은 Plan 2A 범위 밖 (Plan 2B 에서 marker 블록 단위로 범위 명시).
 */
export function computeDiffRegions(
  original: string,
  modified: string,
): ReadonlyArray<{ startOffset: number; endOffset: number }> {
  if (original === modified) return [];

  let prefix = 0;
  const minLen = Math.min(original.length, modified.length);
  while (prefix < minLen && original[prefix] === modified[prefix]) {
    prefix++;
  }

  let suffix = 0;
  while (
    suffix < minLen - prefix &&
    original[original.length - 1 - suffix] === modified[modified.length - 1 - suffix]
  ) {
    suffix++;
  }

  // 원본 기준 변경 영역
  return [{ startOffset: prefix, endOffset: original.length - suffix }];
}
