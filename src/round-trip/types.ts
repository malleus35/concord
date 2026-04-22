/**
 * Config round-trip editor — spec §10 Config Round-Trip 편집 정책.
 *
 * 3 TOML + 2 JSONC + 1 YAML + 1 Symlink wrapper 가 이 타입들을 구현한다.
 * verifyPreservation(utility) 은 preservation.ts 에 별도 구현.
 */

/** 단일 편집 연산. JSON Pointer 유사 path + op. */
export type Edit =
  | { op: "set"; path: readonly (string | number)[]; value: unknown }
  | { op: "delete"; path: readonly (string | number)[] };

/** Marker-block (§10.5) — open marker 부터 close marker 까지의 범위. */
export interface ManagedBlock {
  /** Marker ID = lock node id. 예: "mcp_servers:airtable" */
  id: string;
  /** normalized_hash 앞 8자 (§10.5.1). marker 무결성 검증용. */
  hashSuffix: string;
  /** 파일 내 open marker 시작 byte offset (inclusive). */
  startOffset: number;
  /** 파일 내 close marker 끝 byte offset (exclusive). */
  endOffset: number;
}

/** `load()` 반환: in-memory doc — source + detected managed blocks. */
export interface ConfigDocument {
  /** 원본 파일 내용 (bytes → string, UTF-8 가정). */
  source: string;
  /** 감지된 managed block 목록 (없으면 빈 배열). */
  markers: ManagedBlock[];
}

/** `edit()` 반환: 수정된 source + 메타. */
export interface EditResult {
  /** 수정 후 직렬화 결과. */
  modified: string;
  /** 실제 적용된 edit 개수. */
  editsApplied: number;
  /** 원본 byte length. */
  originalBytes: number;
  /** 수정 후 byte length. */
  modifiedBytes: number;
}

/** `verify()` 반환: 외부 영역 보존 여부. */
export interface PreservationReport {
  /** 전체 합격 (outsideChangesByteCount === 0). */
  preserved: boolean;
  /** 변경 영역 외부의 byte diff 합. 0 이 합격. */
  outsideChangesByteCount: number;
  /** 실제로 편집된 영역 목록. */
  changedRegions: ReadonlyArray<{ startOffset: number; endOffset: number }>;
  /** 원본 byte length. */
  originalBytes: number;
  /** 수정 후 byte length. */
  modifiedBytes: number;
}

/**
 * Config file editor — 3 TOML + 2 JSONC + 1 YAML library wrapper 가 구현.
 * Plan 2A 는 비교용, Plan 2B 에서 선정 library 만 남긴다.
 */
export interface ConfigFileEditor {
  /** 파일 source 를 읽어 in-memory doc 생성. */
  load(source: string): Promise<ConfigDocument>;
  /** edits 를 적용해 수정된 source 반환. format-preserving 필수. */
  edit(doc: ConfigDocument, edits: readonly Edit[]): Promise<EditResult>;
  /** doc 을 문자열로 직렬화 (보통 doc.source 그대로 또는 edit 이후 상태). */
  serialize(doc: ConfigDocument): string;
  /** preservation 검증 — changedRegions 외부의 byte-level diff 계산. */
  verify(
    original: string,
    modified: string,
    changedRegions: ReadonlyArray<{ startOffset: number; endOffset: number }>,
  ): PreservationReport;
}
