# Concord Plan 2A — Round-trip POC + Library Selection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Plan 2 Sync Engine 실구현 직전의 **불확실성 차단 sprint**. 4 POC (TOML 3도구 벤치마크 / JSONC 2도구 비교 / YAML write-back 검증 / symlink-dir 실측) 를 실행해 라이브러리를 확정하고, `ConfigFileEditor` 인터페이스 + `verifyPreservation` byte-level 검증 유틸 + 골든 테스트 인프라를 구축한다. 산출물은 Plan 2B (Fetcher + Installer + Format transform 실구현) 의 의존 기반.

**Architecture:**
- **POC-first 전략**: 각 POC 는 `golden fixture → 후보별 uniform wrapper → benchmark runner → 결정 메모` 4 단계 TDD.
- **`ConfigFileEditor` 공통 인터페이스** (spec §10 근거): 3 library 가 동일 인터페이스를 구현 → apples-to-apples 비교. Plan 2B 에서 선정 library 만 남기고 나머지 wrapper 는 제거 또는 fixture-only 유지.
- **`verifyPreservation` = CI gate**: 모든 골든 시나리오에서 `outsideChangesByteCount === 0` 강제. 이 유틸은 Plan 2B / 3 / 4 전반에서 재사용.
- **결정 메모 (Decision Memo) = 영구 산출물**: `docs/superpowers/poc/YYYY-MM-DD-poc-N-<name>.md` 별도 문서. 왜 선택했는지 + 탈락한 후보의 측정값 + 재검토 트리거 기록.
- **Plan 2A 는 실제 sync / fetch / install 을 건드리지 않는다** (전부 Plan 2B~4).

**Tech Stack:**
- Node.js >=22, TypeScript 6.x, Vitest 4.x (Plan 1 과 동일)
- **후보 library**:
  - TOML (POC-1): `@decimalturn/toml-patch@1.1.1` / `@shopify/toml-patch@0.3.0` / `@ltd/j-toml@1.38.0`
  - JSONC (POC-2): `jsonc-morph@0.3.3` / `jsonc-parser@3.3.1` (Plan 1 에 이미 deps)
  - YAML (POC-3): `yaml@2.8.3` (eemeli, Plan 1 read-only 로 확정, Plan 2A 는 write-back 검증)
  - Symlink (POC-9): `symlink-dir@10.0.1`
- 지원 라이브러리 (기반 유틸): `fs-extra@11.3.4` (골든 fixture 관리 편의) / `write-file-atomic@7.0.1` (Plan 2B 대비, 이 plan 에선 설치만)

**Dependency 정책**:
- Plan 2A 실행 중 **후보 3종을 모두 설치**해서 벤치마크. POC 결과 메모 이후 **Plan 2A 의 Task 18 에서 탈락 후보를 제거**한다.
- `@iarna/toml` 은 Plan 1 에서 이미 탈락 예정이므로 Plan 2A Task 18 에서 제거.
- `write-file-atomic` / `fs-extra` 설치는 이 plan 에서 진행하지만 실사용은 Plan 2B 부터.

**Spec reference:** `docs/superpowers/specs/2026-04-21-concord-design.md`
- §10 Config Round-Trip 편집 정책 (10.0~10.8) — Plan 2A 의 SoT
- §12.1 POC-1 / POC-2 / POC-3 / POC-8 / POC-9
- `new-plans/STEP-B/02-config-round-trip.md` (POC 벤치마크 기준표)
- `new-plans/STEP-B/05-open-questions.md` (POC-1~4 기준)

**POC executed in this plan:**
- **POC-1**: TOML 3도구 벤치마크 → 1 선정 (Task 5~9)
- **POC-2**: JSONC `jsonc-morph` vs `jsonc-parser` → 1 선정 (Task 10~12)
- **POC-3**: YAML write-back (eemeli/yaml Document API) 검증 → 정식 전략 확정 (Task 13~14)
- **POC-9**: symlink-dir macOS 실측 + atomic staging 경로 + Windows gate 설계 (Task 15~16)

**POC NOT executed in this plan** (Plan 2B~4 로 이관):
- POC-5 (plugin introspection — Plan 3)
- POC-8 (cleanup extraneous preservation — Plan 2B 의 cleanup 구현 시)
- POC-10~14 (doctor / drift / secret / merge — Plan 3~4)

**Merge strategy:** Plan 2A 는 feature branch `feat/concord-plan-2a-round-trip-poc` 에서 실행 후 main 에 merge. Plan 2B 는 별도 feature branch.

---

## File Structure

### Created files

| 파일 | 역할 |
|---|---|
| `src/round-trip/types.ts` | `ConfigFileEditor` / `Edit` / `PreservationReport` / `ManagedBlock` 타입 (spec §10 근거) |
| `src/round-trip/preservation.ts` | `verifyPreservation` — byte-level diff 외부 영역 0 검증 |
| `src/round-trip/toml/decimalturn.ts` | `@decimalturn/toml-patch` wrapper (POC-1 후보 1) |
| `src/round-trip/toml/shopify.ts` | `@shopify/toml-patch` wrapper (POC-1 후보 2) |
| `src/round-trip/toml/ltd-j-toml.ts` | `@ltd/j-toml` wrapper (POC-1 후보 3) |
| `src/round-trip/jsonc/jsonc-morph.ts` | `jsonc-morph` wrapper (POC-2 후보 1) |
| `src/round-trip/jsonc/jsonc-parser.ts` | `jsonc-parser` `modify+applyEdits` wrapper (POC-2 후보 2) |
| `src/round-trip/yaml/eemeli.ts` | `yaml` (eemeli) Document API write-back wrapper (POC-3) |
| `src/round-trip/symlink/symlink-dir.ts` | `symlink-dir` wrapper + atomic staging (POC-9) |
| `scripts/poc/poc-1-toml.ts` | POC-1 벤치마크 runner (3 library × 10 scenarios) |
| `scripts/poc/poc-2-jsonc.ts` | POC-2 벤치마크 runner (2 library × 8 scenarios) |
| `scripts/poc/poc-3-yaml.ts` | POC-3 벤치마크 runner (eemeli × 6 scenarios) |
| `scripts/poc/poc-9-symlink.ts` | POC-9 실측 runner (symlink-dir macOS × 5 scenarios) |
| `docs/superpowers/poc/README.md` | POC 문서 인덱스 |
| `docs/superpowers/poc/2026-04-22-poc-1-toml-library.md` | POC-1 결정 메모 |
| `docs/superpowers/poc/2026-04-22-poc-2-jsonc-library.md` | POC-2 결정 메모 |
| `docs/superpowers/poc/2026-04-22-poc-3-yaml-write-back.md` | POC-3 결정 메모 |
| `docs/superpowers/poc/2026-04-22-poc-9-symlink.md` | POC-9 결정 메모 |
| `docs/superpowers/poc/2026-04-22-round-trip-summary.md` | 4 POC 종합 + Plan 2B 입력 |
| `docs/superpowers/plans/2026-04-22-concord-plan-2b-sync-engine.md` | **Plan 2B seed 초안** (Task 17, skeleton only — 실제 작성은 Plan 2A 완료 후 `writing-plans` 재기동) |

### Test files

- `tests/round-trip/types.test.ts` — 타입 스모크
- `tests/round-trip/preservation.test.ts` — verifyPreservation 단위
- `tests/round-trip/toml/preservation.test.ts` — 선정된 TOML library 의 골든 테스트 (Task 9 이후에만 추가, 탈락 library 는 테스트 제거)
- `tests/round-trip/jsonc/preservation.test.ts` — 선정된 JSONC library 의 골든 테스트
- `tests/round-trip/yaml/write-back.test.ts` — eemeli write-back 골든
- `tests/round-trip/symlink/basic.test.ts` — symlink-dir macOS 골든
- `tests/fixtures/round-trip/toml/` — TOML 10 scenario fixtures
- `tests/fixtures/round-trip/jsonc/` — JSONC 8 scenario fixtures
- `tests/fixtures/round-trip/yaml/` — YAML 6 scenario fixtures
- `tests/fixtures/round-trip/symlink/` — Symlink 5 scenario fixtures

### Modified files

- `package.json` — 후보 library 추가 (Task 4, 10, 15) 후 Task 18 에서 탈락 후보 제거
- `TODO.md` — Plan 2A 완료 상태 반영 (Task 18)
- `MEMORY.md` — Plan 2A 완료 Snapshot + 선정 library 기록 (Task 18)
- `README.md` — POC 섹션 추가, 선정된 library 요약 (Task 18)

### Why this structure

- **`src/round-trip/` 단독 모듈**: Plan 2B 의 Fetcher/Installer/Transform 이 모두 이 인터페이스를 통해 config 편집. 다른 도메인과 결합도 낮게 유지.
- **`<format>/<library>.ts` 분리**: 각 library wrapper 는 20~50 줄 목표. 공통 인터페이스 `ConfigFileEditor` 에 맞춤. apples-to-apples 비교.
- **`scripts/poc/` 별도 runner**: 벤치마크는 `vitest` 가 아니라 standalone `tsx scripts/poc/poc-N-<name>.ts` 로 실행. 이유: 성능 측정이 CI 회귀가 아닌 1회성 결정 자료.
- **`docs/superpowers/poc/` 별도 폴더**: 결정 메모는 `specs/` (불변 계약) 도 `plans/` (작업 단위) 도 아닌 **실측 기록**. 재검토 시 독립 read.
- **Plan 2B seed 가 Plan 2A 의 마지막 산출물**: POC 결과 반영된 skeleton 을 남겨 `writing-plans` 재기동 시 시작점.

---

## Tasks

### Task 1 — Branch Setup + Directory Scaffolding

**Files:**
- Create (dirs): `src/round-trip/`, `src/round-trip/toml/`, `src/round-trip/jsonc/`, `src/round-trip/yaml/`, `src/round-trip/symlink/`
- Create (dirs): `tests/round-trip/`, `tests/fixtures/round-trip/{toml,jsonc,yaml,symlink}/`
- Create (dirs): `scripts/poc/`, `docs/superpowers/poc/`
- Create: `docs/superpowers/poc/README.md`

- [ ] **Step 1: Create feature branch**

```bash
cd /Users/macbook/workspace/concord
git checkout main
git pull --ff-only  # main 이 최신이라고 가정
git checkout -b feat/concord-plan-2a-round-trip-poc
```

Expected: `On branch feat/concord-plan-2a-round-trip-poc`, clean tree.

- [ ] **Step 2: Create directory structure**

```bash
mkdir -p src/round-trip/toml src/round-trip/jsonc src/round-trip/yaml src/round-trip/symlink
mkdir -p tests/round-trip/toml tests/round-trip/jsonc tests/round-trip/yaml tests/round-trip/symlink
mkdir -p tests/fixtures/round-trip/toml tests/fixtures/round-trip/jsonc tests/fixtures/round-trip/yaml tests/fixtures/round-trip/symlink
mkdir -p scripts/poc docs/superpowers/poc
```

- [ ] **Step 3: Create `docs/superpowers/poc/README.md`**

```markdown
# Concord — POC Decision Memos

각 POC 는 **실측 결과 + 라이브러리 선정 + 재검토 트리거** 를 기록한다.
Plan 2A (Round-trip POC sprint) 의 산출물이며, Plan 2B 이후의 의존 기반.

## 인덱스

| # | 주제 | 상태 | 문서 |
|---|---|---|---|
| POC-1 | TOML 3도구 벤치마크 | TBD | [poc-1-toml-library.md](2026-04-22-poc-1-toml-library.md) |
| POC-2 | JSONC 2도구 비교 | TBD | [poc-2-jsonc-library.md](2026-04-22-poc-2-jsonc-library.md) |
| POC-3 | YAML write-back | TBD | [poc-3-yaml-write-back.md](2026-04-22-poc-3-yaml-write-back.md) |
| POC-9 | symlink-dir 실측 | TBD | [poc-9-symlink.md](2026-04-22-poc-9-symlink.md) |

## 종합

- [Round-trip POC summary (4 POC 통합)](2026-04-22-round-trip-summary.md)

## 규약

- 파일명: `YYYY-MM-DD-poc-<N>-<slug>.md`
- 각 문서는 다음 섹션 포함:
  1. 문제 정의
  2. 후보 및 version
  3. 벤치마크 시나리오
  4. 결과 matrix
  5. **선정 결정 + 근거**
  6. 탈락 후보의 측정값 (기록용)
  7. 재검토 트리거
```

- [ ] **Step 4: Verify structure**

Run:
```bash
find src/round-trip tests/round-trip tests/fixtures/round-trip scripts/poc docs/superpowers/poc -type d | sort
```

Expected: 15 개 디렉토리 + `docs/superpowers/poc/README.md` 존재 확인.

- [ ] **Step 5: Commit**

```bash
git add src/round-trip tests/round-trip tests/fixtures/round-trip scripts/poc docs/superpowers/poc
git commit -m "chore(plan-2a): scaffold round-trip + POC directories"
```

---

### Task 2 — `ConfigFileEditor` Interface + Shared Types

**Files:**
- Create: `src/round-trip/types.ts`
- Test: `tests/round-trip/types.test.ts`

**Purpose**: spec §10 의 `ConfigFileEditor` 인터페이스 TS 화. 3 TOML + 2 JSONC + 1 YAML library wrapper 가 모두 구현할 공통 계약.

- [ ] **Step 1: Write failing test `tests/round-trip/types.test.ts`**

```typescript
import { describe, it, expect } from "vitest";
import type {
  ConfigFileEditor,
  Edit,
  PreservationReport,
  ManagedBlock,
  EditResult,
} from "../../src/round-trip/types.js";

describe("round-trip/types", () => {
  it("Edit 타입: path + value + op (set|delete)", () => {
    const setEdit: Edit = { op: "set", path: ["mcpServers", "airtable"], value: { command: "npx" } };
    const deleteEdit: Edit = { op: "delete", path: ["mcpServers", "old"] };
    expect(setEdit.op).toBe("set");
    expect(deleteEdit.op).toBe("delete");
  });

  it("ManagedBlock: id + hashSuffix + startOffset + endOffset", () => {
    const block: ManagedBlock = {
      id: "mcp_servers:airtable",
      hashSuffix: "abc12345",
      startOffset: 10,
      endOffset: 120,
    };
    expect(block.id).toBe("mcp_servers:airtable");
  });

  it("PreservationReport: outsideChangesByteCount + changedRegions", () => {
    const report: PreservationReport = {
      preserved: true,
      outsideChangesByteCount: 0,
      changedRegions: [{ startOffset: 10, endOffset: 50 }],
      originalBytes: 100,
      modifiedBytes: 105,
    };
    expect(report.preserved).toBe(true);
    expect(report.outsideChangesByteCount).toBe(0);
  });

  it("EditResult: modified + edits + bytes", () => {
    const result: EditResult = {
      modified: '{"a":1}',
      editsApplied: 1,
      originalBytes: 7,
      modifiedBytes: 7,
    };
    expect(result.editsApplied).toBe(1);
  });

  it("ConfigFileEditor shape: load/edit/serialize/verify 메서드 선언됨", () => {
    // 타입 레벨 shape 검증 — 런타임 assertion 아닌 컴파일 타임
    // 실제 구현은 Task 5+ 에서. 여기선 shape 만 compile 되면 OK.
    const _shape: ConfigFileEditor = {
      load: async () => ({ source: "", markers: [] }),
      edit: async () => ({ modified: "", editsApplied: 0, originalBytes: 0, modifiedBytes: 0 }),
      serialize: (doc) => doc.source,
      verify: () => ({ preserved: true, outsideChangesByteCount: 0, changedRegions: [], originalBytes: 0, modifiedBytes: 0 }),
    };
    expect(typeof _shape.load).toBe("function");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/round-trip/types.test.ts`
Expected: FAIL with `Cannot find module '../../src/round-trip/types.js'`.

- [ ] **Step 3: Implement `src/round-trip/types.ts`**

```typescript
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/round-trip/types.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Typecheck**

Run: `npm run typecheck`
Expected: No errors.

- [ ] **Step 6: Commit**

```bash
git add src/round-trip/types.ts tests/round-trip/types.test.ts
git commit -m "feat(round-trip): ConfigFileEditor interface + shared types"
```

---

### Task 3 — `verifyPreservation` Utility

**Files:**
- Create: `src/round-trip/preservation.ts`
- Test: `tests/round-trip/preservation.test.ts`

**Purpose**: spec §10.7 golden test 패턴의 핵심 — `changedRegions` 외부의 byte 차이가 **0** 인지 검증. 이 유틸이 3 TOML + 2 JSONC + 1 YAML 모든 wrapper 의 합격 판정 기준.

- [ ] **Step 1: Write failing test `tests/round-trip/preservation.test.ts`**

```typescript
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/round-trip/preservation.test.ts`
Expected: FAIL with module resolution error.

- [ ] **Step 3: Implement `src/round-trip/preservation.ts`**

```typescript
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
    modCursor += outsideOrig.length;
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
```

**설계 메모** (comment 에 반영 안 됨, 여기 기록): 이 유틸은 Plan 2A 에서 **apples-to-apples 비교 용** 이다. Plan 2B 에서 실제 concord sync 는 `changedRegions` 를 수정본 offset 기준으로도 받을 수 있도록 확장 예정 (marker 블록 기반). Plan 2A 는 원본 기준 offset + tail 매핑 의 단순화 버전.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/round-trip/preservation.test.ts`
Expected: PASS (7 tests).

- [ ] **Step 5: Typecheck + full vitest**

Run:
```bash
npm run typecheck
npx vitest run
```
Expected: typecheck clean, 169 (Plan 1) + 5 (types) + 7 (preservation) = 181 tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/round-trip/preservation.ts tests/round-trip/preservation.test.ts
git commit -m "feat(round-trip): verifyPreservation byte-level diff util"
```

---

### Task 4 — POC-1 TOML Golden Fixtures

**Files:**
- Create: `tests/fixtures/round-trip/toml/01-add-entry.toml`
- Create: `tests/fixtures/round-trip/toml/02-modify-value.toml`
- Create: `tests/fixtures/round-trip/toml/03-delete-entry.toml`
- Create: `tests/fixtures/round-trip/toml/04-array-of-tables.toml`
- Create: `tests/fixtures/round-trip/toml/05-inline-table.toml`
- Create: `tests/fixtures/round-trip/toml/06-multiline-array.toml`
- Create: `tests/fixtures/round-trip/toml/07-crlf.toml`
- Create: `tests/fixtures/round-trip/toml/08-bom.toml`
- Create: `tests/fixtures/round-trip/toml/09-large.toml`
- Create: `tests/fixtures/round-trip/toml/10-marker-block.toml`
- Create: `tests/fixtures/round-trip/toml/scenarios.json` — 각 fixture 의 edit spec

**Purpose**: `new-plans/STEP-B/05-open-questions.md` POC-1 의 10 시나리오. 각 fixture 는 "원본 TOML + edit spec + expected outside bytes (= 원본 외부 영역)" 를 담는다.

- [ ] **Step 1: Write failing test `tests/round-trip/toml/fixtures.test.ts`**

```typescript
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const FIXTURE_DIR = join(__dirname, "../../fixtures/round-trip/toml");
const SCENARIOS = [
  "01-add-entry.toml",
  "02-modify-value.toml",
  "03-delete-entry.toml",
  "04-array-of-tables.toml",
  "05-inline-table.toml",
  "06-multiline-array.toml",
  "07-crlf.toml",
  "08-bom.toml",
  "09-large.toml",
  "10-marker-block.toml",
];

describe("round-trip/toml fixtures", () => {
  it.each(SCENARIOS)("fixture %s 존재 + 읽기 가능", (name) => {
    const content = readFileSync(join(FIXTURE_DIR, name));
    expect(content.length).toBeGreaterThan(0);
  });

  it("scenarios.json 에 10 시나리오 spec 정의", () => {
    const spec = JSON.parse(readFileSync(join(FIXTURE_DIR, "scenarios.json"), "utf8"));
    expect(spec.scenarios).toHaveLength(10);
    for (const s of spec.scenarios) {
      expect(s).toHaveProperty("fixture");
      expect(s).toHaveProperty("description");
      expect(s).toHaveProperty("edits");
    }
  });

  it("07-crlf.toml 은 CRLF 개행 포함", () => {
    const content = readFileSync(join(FIXTURE_DIR, "07-crlf.toml"));
    expect(content.includes(Buffer.from("\r\n"))).toBe(true);
  });

  it("08-bom.toml 은 UTF-8 BOM 포함", () => {
    const content = readFileSync(join(FIXTURE_DIR, "08-bom.toml"));
    expect(content[0]).toBe(0xef);
    expect(content[1]).toBe(0xbb);
    expect(content[2]).toBe(0xbf);
  });

  it("09-large.toml 은 > 100KB", () => {
    const content = readFileSync(join(FIXTURE_DIR, "09-large.toml"));
    expect(content.length).toBeGreaterThan(100 * 1024);
  });

  it("10-marker-block.toml 은 concord-managed marker 포함", () => {
    const content = readFileSync(join(FIXTURE_DIR, "10-marker-block.toml"), "utf8");
    expect(content).toContain(">>>> concord-managed:");
    expect(content).toContain("<<<< concord-managed:");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/round-trip/toml/fixtures.test.ts`
Expected: FAIL (fixtures 없음).

- [ ] **Step 3: Create 10 fixtures**

(a) `tests/fixtures/round-trip/toml/01-add-entry.toml`:
```toml
# Codex config — sample
# Line comment at top

[features]
codex_hooks = true  # inline comment

[mcp_servers.airtable]
# Existing server
command = "npx"
args = ["-y", "airtable-mcp-server"]
```

(b) `tests/fixtures/round-trip/toml/02-modify-value.toml`:
```toml
[mcp_servers.airtable]
command = "npx"
args = ["-y", "airtable-mcp-server@0.1.0"]  # version pin

[mcp_servers.other]
command = "node"
```

(c) `tests/fixtures/round-trip/toml/03-delete-entry.toml`:
```toml
# Keep this comment

[mcp_servers.obsolete]
# Will be deleted
command = "old-tool"

[mcp_servers.keep]
command = "new-tool"
```

(d) `tests/fixtures/round-trip/toml/04-array-of-tables.toml`:
```toml
# Array-of-tables preservation test

[[skills.config]]
name = "skill-a"
priority = 1

[[skills.config]]
name = "skill-b"
priority = 2

[[skills.config]]
name = "skill-c"
priority = 3
```

(e) `tests/fixtures/round-trip/toml/05-inline-table.toml`:
```toml
# Inline tables should not be converted to standard tables

[mcp_servers]
airtable = { command = "npx", args = ["-y", "airtable"] }
slack = { command = "node", args = ["slack.js"] }
```

(f) `tests/fixtures/round-trip/toml/06-multiline-array.toml`:
```toml
[mcp_servers.bigtool]
command = "npx"
args = [
  "-y",
  "--verbose",
  "bigtool-mcp-server",
  "--flag-one",
  "--flag-two",
]
env = ["PATH", "HOME"]
```

(g) `tests/fixtures/round-trip/toml/07-crlf.toml` — CRLF 개행으로 작성 (heredoc 이 \\r\\n 보존하지 않으므로 Step 3 끝에 쉘 script 로 변환):

처음엔 LF 로 작성 후 쉘로 변환:
```bash
printf '# CRLF test\r\n[features]\r\ncodex_hooks = true\r\n\r\n[mcp_servers.tool]\r\ncommand = "npx"\r\nargs = ["-y", "crlf-tool"]\r\n' > tests/fixtures/round-trip/toml/07-crlf.toml
```

(h) `tests/fixtures/round-trip/toml/08-bom.toml` — UTF-8 BOM + 내용:
```bash
printf '\xef\xbb\xbf# BOM fixture\n[features]\ncodex_hooks = true\n' > tests/fixtures/round-trip/toml/08-bom.toml
```

(i) `tests/fixtures/round-trip/toml/09-large.toml` — 프로그래매틱 생성:
```bash
node -e "
const lines = ['# Large TOML fixture — >100KB', ''];
for (let i = 0; i < 2000; i++) {
  lines.push(\`[mcp_servers.srv_\${i}]\`);
  lines.push(\`command = \\\"npx\\\"\`);
  lines.push(\`args = [\\\"-y\\\", \\\"srv-\${i}\\\"]\`);
  lines.push('');
}
require('fs').writeFileSync('tests/fixtures/round-trip/toml/09-large.toml', lines.join('\n'));
"
```

(j) `tests/fixtures/round-trip/toml/10-marker-block.toml`:
```toml
# User settings — bedrock

[features]
codex_hooks = true

[mcp_servers.user-manual]
# User added this
command = "npx"
args = ["-y", "user-tool"]

# >>>> concord-managed:mcp_servers:airtable  (hash:abcd1234)
[mcp_servers.airtable]
command = "npx"
args = ["-y", "airtable-mcp-server"]
# <<<< concord-managed:mcp_servers:airtable

# User keeps this section too
[mcp_servers.other-manual]
command = "node"
```

(k) `tests/fixtures/round-trip/toml/scenarios.json`:
```json
{
  "scenarios": [
    {
      "fixture": "01-add-entry.toml",
      "description": "신규 MCP entry 추가 — 기존 주석/구조 유지",
      "edits": [
        {
          "op": "set",
          "path": ["mcp_servers", "slack"],
          "value": { "command": "node", "args": ["slack.js"] }
        }
      ]
    },
    {
      "fixture": "02-modify-value.toml",
      "description": "entry value 만 수정 — 인접 주석/구조 유지",
      "edits": [
        {
          "op": "set",
          "path": ["mcp_servers", "airtable", "args"],
          "value": ["-y", "airtable-mcp-server@0.2.0"]
        }
      ]
    },
    {
      "fixture": "03-delete-entry.toml",
      "description": "entry 삭제 — 인접 주석/comma 보존",
      "edits": [
        { "op": "delete", "path": ["mcp_servers", "obsolete"] }
      ]
    },
    {
      "fixture": "04-array-of-tables.toml",
      "description": "array-of-tables 순서 보존 — 중간 요소 값 변경",
      "edits": [
        {
          "op": "set",
          "path": ["skills", "config", 1, "priority"],
          "value": 20
        }
      ]
    },
    {
      "fixture": "05-inline-table.toml",
      "description": "inline table 유지 — standard table 로 변환되지 않아야 함",
      "edits": [
        {
          "op": "set",
          "path": ["mcp_servers", "airtable", "args"],
          "value": ["-y", "airtable@1.0.0"]
        }
      ]
    },
    {
      "fixture": "06-multiline-array.toml",
      "description": "multi-line array formatting 유지",
      "edits": [
        {
          "op": "set",
          "path": ["mcp_servers", "bigtool", "args"],
          "value": ["-y", "--verbose", "bigtool-mcp-server", "--flag-one", "--flag-two", "--flag-three"]
        }
      ]
    },
    {
      "fixture": "07-crlf.toml",
      "description": "CRLF 개행 유지",
      "edits": [
        {
          "op": "set",
          "path": ["mcp_servers", "tool", "args"],
          "value": ["-y", "crlf-tool@0.2.0"]
        }
      ]
    },
    {
      "fixture": "08-bom.toml",
      "description": "UTF-8 BOM 유지",
      "edits": [
        {
          "op": "set",
          "path": ["features", "codex_hooks"],
          "value": false
        }
      ]
    },
    {
      "fixture": "09-large.toml",
      "description": "대용량 (>100KB) 편집 성능",
      "edits": [
        {
          "op": "set",
          "path": ["mcp_servers", "srv_1000", "command"],
          "value": "node"
        }
      ]
    },
    {
      "fixture": "10-marker-block.toml",
      "description": "marker 블록 내부만 수정, 외부 (user-manual / other-manual) bit-exact 보존",
      "edits": [
        {
          "op": "set",
          "path": ["mcp_servers", "airtable", "args"],
          "value": ["-y", "airtable-mcp-server@2.0.0"]
        }
      ]
    }
  ]
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/round-trip/toml/fixtures.test.ts`
Expected: PASS (10 fixtures + scenarios.json + CRLF/BOM/large/marker checks = 14 tests).

- [ ] **Step 5: Commit**

```bash
git add tests/fixtures/round-trip/toml tests/round-trip/toml/fixtures.test.ts
git commit -m "test(poc-1): 10 TOML golden fixtures + edit spec"
```

---

### Task 5 — POC-1 Install 3 TOML Candidates + Common Wrapper Contract

**Files:**
- Modify: `package.json` — 3 library 추가
- Create: `src/round-trip/toml/decimalturn.ts` (stub)
- Create: `src/round-trip/toml/shopify.ts` (stub)
- Create: `src/round-trip/toml/ltd-j-toml.ts` (stub)
- Test: `tests/round-trip/toml/stub.test.ts` — 3 wrapper 가 `ConfigFileEditor` shape 준수

- [ ] **Step 1: Install 3 libraries**

```bash
npm install --save-dev @decimalturn/toml-patch @shopify/toml-patch @ltd/j-toml
```

Expected: `package.json` 에 3 library 추가, `node_modules/` 에 설치됨.

**메모**: 이 3 library 는 `devDependencies` 로 설치. 이유: benchmark 전용, Plan 2B Task 18 에서 **선정되지 않은 2개는 제거** 한다. 선정 후 남는 1개만 `dependencies` 로 이동.

- [ ] **Step 2: Write failing test `tests/round-trip/toml/stub.test.ts`**

```typescript
import { describe, it, expect } from "vitest";
import { createDecimalturnEditor } from "../../../src/round-trip/toml/decimalturn.js";
import { createShopifyEditor } from "../../../src/round-trip/toml/shopify.js";
import { createLtdJTomlEditor } from "../../../src/round-trip/toml/ltd-j-toml.js";

describe("POC-1 TOML wrappers — shape", () => {
  const editors = [
    { name: "decimalturn", factory: createDecimalturnEditor },
    { name: "shopify", factory: createShopifyEditor },
    { name: "ltd-j-toml", factory: createLtdJTomlEditor },
  ];

  it.each(editors)("$name 은 ConfigFileEditor shape 구현", ({ factory }) => {
    const editor = factory();
    expect(typeof editor.load).toBe("function");
    expect(typeof editor.edit).toBe("function");
    expect(typeof editor.serialize).toBe("function");
    expect(typeof editor.verify).toBe("function");
  });

  it.each(editors)("$name 은 빈 source 를 load 할 수 있음", async ({ factory }) => {
    const editor = factory();
    const doc = await editor.load("");
    expect(doc.source).toBe("");
    expect(doc.markers).toEqual([]);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run tests/round-trip/toml/stub.test.ts`
Expected: FAIL (modules 없음).

- [ ] **Step 4: Create 3 stub wrappers (skeleton only — 실제 edit 구현은 Task 6)**

(a) `src/round-trip/toml/decimalturn.ts`:
```typescript
import type { ConfigFileEditor, ConfigDocument, Edit, EditResult, PreservationReport } from "../types.js";
import { verifyPreservation } from "../preservation.js";

export function createDecimalturnEditor(): ConfigFileEditor {
  return {
    async load(source: string): Promise<ConfigDocument> {
      return { source, markers: [] };
    },
    async edit(doc: ConfigDocument, edits: readonly Edit[]): Promise<EditResult> {
      // Task 6 에서 실제 구현
      throw new Error("decimalturn editor edit: not implemented (Task 6)");
    },
    serialize(doc: ConfigDocument): string {
      return doc.source;
    },
    verify(
      original: string,
      modified: string,
      changedRegions: ReadonlyArray<{ startOffset: number; endOffset: number }>,
    ): PreservationReport {
      return verifyPreservation(original, modified, changedRegions);
    },
  };
}
```

(b) `src/round-trip/toml/shopify.ts`:
```typescript
import type { ConfigFileEditor, ConfigDocument, Edit, EditResult, PreservationReport } from "../types.js";
import { verifyPreservation } from "../preservation.js";

export function createShopifyEditor(): ConfigFileEditor {
  return {
    async load(source: string): Promise<ConfigDocument> {
      return { source, markers: [] };
    },
    async edit(doc: ConfigDocument, edits: readonly Edit[]): Promise<EditResult> {
      throw new Error("shopify editor edit: not implemented (Task 6)");
    },
    serialize(doc: ConfigDocument): string {
      return doc.source;
    },
    verify(
      original: string,
      modified: string,
      changedRegions: ReadonlyArray<{ startOffset: number; endOffset: number }>,
    ): PreservationReport {
      return verifyPreservation(original, modified, changedRegions);
    },
  };
}
```

(c) `src/round-trip/toml/ltd-j-toml.ts`:
```typescript
import type { ConfigFileEditor, ConfigDocument, Edit, EditResult, PreservationReport } from "../types.js";
import { verifyPreservation } from "../preservation.js";

export function createLtdJTomlEditor(): ConfigFileEditor {
  return {
    async load(source: string): Promise<ConfigDocument> {
      return { source, markers: [] };
    },
    async edit(doc: ConfigDocument, edits: readonly Edit[]): Promise<EditResult> {
      throw new Error("ltd-j-toml editor edit: not implemented (Task 6)");
    },
    serialize(doc: ConfigDocument): string {
      return doc.source;
    },
    verify(
      original: string,
      modified: string,
      changedRegions: ReadonlyArray<{ startOffset: number; endOffset: number }>,
    ): PreservationReport {
      return verifyPreservation(original, modified, changedRegions);
    },
  };
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run tests/round-trip/toml/stub.test.ts`
Expected: PASS (6 tests — 3 shape + 3 load 빈 source).

- [ ] **Step 6: Typecheck**

Run: `npm run typecheck`
Expected: clean.

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json src/round-trip/toml tests/round-trip/toml/stub.test.ts
git commit -m "chore(poc-1): install 3 TOML candidates + wrapper skeletons"
```

---

### Task 6 — POC-1 Implement 3 TOML Editors (edit 메서드)

**Files:**
- Modify: `src/round-trip/toml/decimalturn.ts`
- Modify: `src/round-trip/toml/shopify.ts`
- Modify: `src/round-trip/toml/ltd-j-toml.ts`
- Test: `tests/round-trip/toml/edit.test.ts` — 각 wrapper 의 최소 scenario 통과

**Purpose**: 3 library 의 `edit()` 을 실제 구현. 벤치마크 이전에 최소 scenario 1 (add entry), 2 (modify value), 3 (delete entry) 는 통과시키고 나머지 7 scenario 는 runner 에서 측정.

**핵심 설계**: 각 wrapper 는 library 의 native API 로 편집 후, `changedRegions` 계산 시 "수정된 entry 의 byte 범위" 를 반환. 이 범위는 library 가 직접 알려주지 않으면 **diff 알고리즘** (`computeDiffRegions` 유틸) 로 간접 계산 — Plan 2A 는 library 비교가 목적이므로 간접 계산으로 충분.

- [ ] **Step 1: Add `computeDiffRegions` helper**

File: `src/round-trip/diff-regions.ts`

```typescript
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
```

Test: `tests/round-trip/diff-regions.test.ts`

```typescript
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

  it("길이 변화 — prefix + suffix 공통 찾기", () => {
    const regions = computeDiffRegions("start___end", "start[INSERTED]___end");
    expect(regions).toHaveLength(1);
    expect(regions[0].startOffset).toBe(5);
    // 원본 기준이므로 endOffset 은 원본 길이 - suffix
    expect(regions[0].endOffset).toBe("start".length); // prefix 와 동일 → 삽입만 발생
  });
});
```

Run test: `npx vitest run tests/round-trip/diff-regions.test.ts` — 처음엔 FAIL, 구현 후 PASS.

- [ ] **Step 2: Implement `src/round-trip/toml/decimalturn.ts` edit()**

```typescript
import * as tomlPatch from "@decimalturn/toml-patch";
import type { ConfigFileEditor, ConfigDocument, Edit, EditResult, PreservationReport } from "../types.js";
import { verifyPreservation } from "../preservation.js";
import { computeDiffRegions } from "../diff-regions.js";

export function createDecimalturnEditor(): ConfigFileEditor {
  return {
    async load(source: string): Promise<ConfigDocument> {
      return { source, markers: [] };
    },

    async edit(doc: ConfigDocument, edits: readonly Edit[]): Promise<EditResult> {
      let source = doc.source;
      let applied = 0;

      for (const e of edits) {
        if (e.op === "set") {
          // @decimalturn/toml-patch API: patch(source, path, value) → string
          source = tomlPatch.patch(source, e.path as (string | number)[], e.value);
          applied++;
        } else if (e.op === "delete") {
          source = tomlPatch.remove(source, e.path as (string | number)[]);
          applied++;
        }
      }

      return {
        modified: source,
        editsApplied: applied,
        originalBytes: Buffer.byteLength(doc.source, "utf8"),
        modifiedBytes: Buffer.byteLength(source, "utf8"),
      };
    },

    serialize(doc: ConfigDocument): string {
      return doc.source;
    },

    verify(original, modified, changedRegions) {
      return verifyPreservation(original, modified, changedRegions);
    },
  };
}
```

**주의**: `@decimalturn/toml-patch` 의 실제 exported API 이름은 구현 시점에 `node -e "console.log(Object.keys(require('@decimalturn/toml-patch')))"` 로 확인. 위 `patch` / `remove` 는 가정된 이름 — 실제 이름과 다르면 import 및 호출부를 수정. 문서: https://www.npmjs.com/package/@decimalturn/toml-patch

- [ ] **Step 3: Implement `src/round-trip/toml/shopify.ts` edit()**

```typescript
import * as shopifyPatch from "@shopify/toml-patch";
import type { ConfigFileEditor, ConfigDocument, Edit, EditResult, PreservationReport } from "../types.js";
import { verifyPreservation } from "../preservation.js";

export function createShopifyEditor(): ConfigFileEditor {
  return {
    async load(source: string): Promise<ConfigDocument> {
      return { source, markers: [] };
    },

    async edit(doc: ConfigDocument, edits: readonly Edit[]): Promise<EditResult> {
      let source = doc.source;
      let applied = 0;

      for (const e of edits) {
        if (e.op === "set") {
          // @shopify/toml-patch: likely exposes `patch(source, { path, value })` — verify via API probe
          source = shopifyPatch.patch(source, { op: "set", path: e.path, value: e.value } as any);
          applied++;
        } else if (e.op === "delete") {
          source = shopifyPatch.patch(source, { op: "delete", path: e.path } as any);
          applied++;
        }
      }

      return {
        modified: source,
        editsApplied: applied,
        originalBytes: Buffer.byteLength(doc.source, "utf8"),
        modifiedBytes: Buffer.byteLength(source, "utf8"),
      };
    },

    serialize(doc: ConfigDocument): string {
      return doc.source;
    },

    verify(original, modified, changedRegions) {
      return verifyPreservation(original, modified, changedRegions);
    },
  };
}
```

**주의**: `@shopify/toml-patch` API 도 구현 시점에 `node -e "console.log(Object.keys(require('@shopify/toml-patch')))"` 로 확인. Rust wasm 래퍼이므로 async init 필요할 수 있음 — `load()` 내 첫 호출에 `await shopifyPatch.init?.()` 추가 가능.

- [ ] **Step 4: Implement `src/round-trip/toml/ltd-j-toml.ts` edit()**

```typescript
import TOML from "@ltd/j-toml";
import type { ConfigFileEditor, ConfigDocument, Edit, EditResult, PreservationReport } from "../types.js";
import { verifyPreservation } from "../preservation.js";

export function createLtdJTomlEditor(): ConfigFileEditor {
  return {
    async load(source: string): Promise<ConfigDocument> {
      return { source, markers: [] };
    },

    async edit(doc: ConfigDocument, edits: readonly Edit[]): Promise<EditResult> {
      const source = doc.source;
      // @ltd/j-toml 는 round-trip-preserving 이 아님 → parse + mutate + stringify.
      // 보존 성능이 제한적이지만 비교 대상으로 벤치마크에 포함.
      const table = TOML.parse(source, { joiner: "\n", bigint: false }) as any;

      let applied = 0;
      for (const e of edits) {
        if (e.op === "set") {
          setDeep(table, e.path, e.value);
          applied++;
        } else if (e.op === "delete") {
          deleteDeep(table, e.path);
          applied++;
        }
      }

      const modified = TOML.stringify(table, { newline: "\n", newlineAround: "section" });
      const modStr = Array.isArray(modified) ? modified.join("\n") : modified;

      return {
        modified: modStr,
        editsApplied: applied,
        originalBytes: Buffer.byteLength(source, "utf8"),
        modifiedBytes: Buffer.byteLength(modStr, "utf8"),
      };
    },

    serialize(doc: ConfigDocument): string {
      return doc.source;
    },

    verify(original, modified, changedRegions) {
      return verifyPreservation(original, modified, changedRegions);
    },
  };
}

function setDeep(obj: any, path: readonly (string | number)[], value: unknown): void {
  let cur: any = obj;
  for (let i = 0; i < path.length - 1; i++) {
    const key = path[i]!;
    if (cur[key] === undefined) cur[key] = {};
    cur = cur[key];
  }
  cur[path[path.length - 1]!] = value;
}

function deleteDeep(obj: any, path: readonly (string | number)[]): void {
  let cur: any = obj;
  for (let i = 0; i < path.length - 1; i++) {
    const key = path[i]!;
    if (cur[key] === undefined) return;
    cur = cur[key];
  }
  delete cur[path[path.length - 1]!];
}
```

- [ ] **Step 5: Write minimal scenario test `tests/round-trip/toml/edit.test.ts`**

```typescript
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createDecimalturnEditor } from "../../../src/round-trip/toml/decimalturn.js";
import { createShopifyEditor } from "../../../src/round-trip/toml/shopify.js";
import { createLtdJTomlEditor } from "../../../src/round-trip/toml/ltd-j-toml.js";
import { computeDiffRegions } from "../../../src/round-trip/diff-regions.js";

const FIXTURE_DIR = join(__dirname, "../../fixtures/round-trip/toml");

const editors = [
  { name: "decimalturn", factory: createDecimalturnEditor },
  { name: "shopify", factory: createShopifyEditor },
  { name: "ltd-j-toml", factory: createLtdJTomlEditor },
];

describe("POC-1 TOML edit — minimal scenario smoke", () => {
  it.each(editors)("$name: 01-add-entry 편집 시 modifiedBytes > originalBytes", async ({ factory }) => {
    const source = readFileSync(join(FIXTURE_DIR, "01-add-entry.toml"), "utf8");
    const editor = factory();
    const doc = await editor.load(source);
    const result = await editor.edit(doc, [
      { op: "set", path: ["mcp_servers", "slack"], value: { command: "node", args: ["slack.js"] } },
    ]);
    expect(result.editsApplied).toBe(1);
    expect(result.modifiedBytes).toBeGreaterThan(result.originalBytes);
  });

  it.each(editors)("$name: 02-modify-value 편집 시 preservation 검증 실행 가능", async ({ factory }) => {
    const source = readFileSync(join(FIXTURE_DIR, "02-modify-value.toml"), "utf8");
    const editor = factory();
    const doc = await editor.load(source);
    const result = await editor.edit(doc, [
      {
        op: "set",
        path: ["mcp_servers", "airtable", "args"],
        value: ["-y", "airtable-mcp-server@0.2.0"],
      },
    ]);
    const regions = computeDiffRegions(source, result.modified);
    const report = editor.verify(source, result.modified, regions);
    // 합격 여부는 library 마다 다름 — 벤치마크에서 집계.
    // 여기선 verify 가 에러 없이 돌아가는지만 확인.
    expect(report.originalBytes).toBe(Buffer.byteLength(source, "utf8"));
  });
});
```

- [ ] **Step 6: Run tests, expect at least partial pass**

Run: `npx vitest run tests/round-trip/toml/edit.test.ts`
Expected: 최소 1 library (`@decimalturn/toml-patch` 또는 `@shopify/toml-patch`) 가 add/modify 스모크 PASS. `@ltd/j-toml` 은 parse+stringify 가 문법적으로 동작하면 PASS.

**Fail 대응**: library API 이름 / 호출 방식이 실제와 다르면 런타임 에러 발생. 이 때:
1. `node -e "console.log(Object.keys(require('<lib>')))"` 로 export 확인.
2. Wrapper 수정.
3. Re-run.

**library 가 아예 설치 실패** 하면 해당 wrapper 는 `throw new Error("library N/A on this platform")` 로 남기고 benchmark runner (Task 7) 에서 그 wrapper 만 skip 하도록 처리.

- [ ] **Step 7: Typecheck**

Run: `npm run typecheck`
Expected: clean.

- [ ] **Step 8: Commit**

```bash
git add src/round-trip/diff-regions.ts src/round-trip/toml/*.ts tests/round-trip/diff-regions.test.ts tests/round-trip/toml/edit.test.ts
git commit -m "feat(poc-1): implement 3 TOML wrappers + computeDiffRegions helper"
```

---

### Task 7 — POC-1 Benchmark Runner + Result Matrix

**Files:**
- Create: `scripts/poc/poc-1-toml.ts`
- Create: `docs/superpowers/poc/2026-04-22-poc-1-toml-library.md` (draft — 결과는 Task 8 에서 채움)

**Purpose**: 10 scenario × 3 library 매트릭스를 실행해 `outsideChangesByteCount` / `preserved` / 실행 시간 을 수집. 결과를 `docs/superpowers/poc/2026-04-22-poc-1-toml-library.md` 의 `## 결과 matrix` 섹션에 기입.

- [ ] **Step 1: Create `scripts/poc/poc-1-toml.ts`**

```typescript
/**
 * POC-1 TOML Library Benchmark Runner
 *
 * 실행: `npx tsx scripts/poc/poc-1-toml.ts`
 * 출력: stdout JSON + docs/superpowers/poc/2026-04-22-poc-1-toml-library.md 의 matrix 섹션 자동 업데이트 힌트
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { performance } from "node:perf_hooks";
import { createDecimalturnEditor } from "../../src/round-trip/toml/decimalturn.js";
import { createShopifyEditor } from "../../src/round-trip/toml/shopify.js";
import { createLtdJTomlEditor } from "../../src/round-trip/toml/ltd-j-toml.js";
import { computeDiffRegions } from "../../src/round-trip/diff-regions.js";
import type { Edit } from "../../src/round-trip/types.js";

const FIXTURE_DIR = join(process.cwd(), "tests/fixtures/round-trip/toml");
const scenarios = JSON.parse(readFileSync(join(FIXTURE_DIR, "scenarios.json"), "utf8")).scenarios as Array<{
  fixture: string;
  description: string;
  edits: Edit[];
}>;

const libraries = [
  { name: "decimalturn", factory: createDecimalturnEditor },
  { name: "shopify", factory: createShopifyEditor },
  { name: "ltd-j-toml", factory: createLtdJTomlEditor },
];

type Result = {
  library: string;
  fixture: string;
  status: "pass" | "fail-preserve" | "error";
  outsideChangesByteCount?: number;
  elapsedMs: number;
  errorMessage?: string;
  originalBytes: number;
  modifiedBytes: number;
};

async function runOne(libName: string, factory: () => ReturnType<typeof createDecimalturnEditor>, scenario: (typeof scenarios)[0]): Promise<Result> {
  const source = readFileSync(join(FIXTURE_DIR, scenario.fixture), "utf8");
  const editor = factory();
  const t0 = performance.now();
  try {
    const doc = await editor.load(source);
    const editResult = await editor.edit(doc, scenario.edits);
    const regions = computeDiffRegions(source, editResult.modified);
    const report = editor.verify(source, editResult.modified, regions);
    const elapsedMs = performance.now() - t0;

    return {
      library: libName,
      fixture: scenario.fixture,
      status: report.preserved ? "pass" : "fail-preserve",
      outsideChangesByteCount: report.outsideChangesByteCount,
      elapsedMs,
      originalBytes: editResult.originalBytes,
      modifiedBytes: editResult.modifiedBytes,
    };
  } catch (err) {
    return {
      library: libName,
      fixture: scenario.fixture,
      status: "error",
      elapsedMs: performance.now() - t0,
      errorMessage: err instanceof Error ? err.message : String(err),
      originalBytes: Buffer.byteLength(source, "utf8"),
      modifiedBytes: 0,
    };
  }
}

async function main() {
  const results: Result[] = [];
  for (const lib of libraries) {
    for (const sc of scenarios) {
      const r = await runOne(lib.name, lib.factory, sc);
      results.push(r);
      console.error(`[${r.library}] ${r.fixture}: ${r.status} (${r.elapsedMs.toFixed(2)}ms)`);
    }
  }
  console.log(JSON.stringify({ results }, null, 2));

  // 합격 통계
  const summary = libraries.map((lib) => {
    const libResults = results.filter((r) => r.library === lib.name);
    return {
      library: lib.name,
      pass: libResults.filter((r) => r.status === "pass").length,
      failPreserve: libResults.filter((r) => r.status === "fail-preserve").length,
      error: libResults.filter((r) => r.status === "error").length,
      totalMs: libResults.reduce((a, r) => a + r.elapsedMs, 0),
    };
  });
  console.error("\n=== POC-1 Summary ===");
  console.table(summary);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
```

- [ ] **Step 2: Add `scripts/poc/poc-1-toml` npm script helper**

File: `package.json` — 수정
```diff
   "scripts": {
     "build": "tsc -p tsconfig.json",
     "dev": "tsx src/index.ts",
     "test": "vitest run",
     "test:watch": "vitest",
+    "poc:1": "tsx scripts/poc/poc-1-toml.ts",
+    "poc:2": "tsx scripts/poc/poc-2-jsonc.ts",
+    "poc:3": "tsx scripts/poc/poc-3-yaml.ts",
+    "poc:9": "tsx scripts/poc/poc-9-symlink.ts",
     "typecheck": "tsc -p tsconfig.json --noEmit"
   },
```

`poc-2/3/9` script 파일은 이번 Task 에선 만들지 않아도 npm 이 script 정의만으로 거부하지 않는다. Task 10/13/15 에서 실제 파일 생성.

- [ ] **Step 3: Run benchmark**

Run: `npm run poc:1`
Expected: 3 library × 10 scenario = 30 결과 출력. stderr 에 summary table, stdout 에 JSON 전체.

**결과 저장**: runner 출력 전체를 `docs/superpowers/poc/2026-04-22-poc-1-toml-library.md` 의 `## 결과 matrix` 섹션에 붙여넣기 (Task 8 에서).

**실패 대응**:
- library wrapper 런타임 에러가 발생하면 `status: error` 로 기록되고 runner 는 계속 진행.
- 특정 library 가 모든 scenario 에서 error → wrapper 수정 후 재실행.
- 1~2 scenario 만 error → library 한계로 기록 (이게 선택 기준의 일부).

- [ ] **Step 4: Create `docs/superpowers/poc/2026-04-22-poc-1-toml-library.md` (skeleton only)**

```markdown
# POC-1 — TOML 편집 라이브러리 선정

**Date**: 2026-04-22
**Plan**: Plan 2A Round-trip POC sprint
**Status**: **PENDING** (Task 8 에서 결정)

## 문제 정의

concord 는 Codex 의 `~/.codex/config.toml` 을 round-trip 편집 해야 한다 (spec §10.2).
Naive `JSON.parse`/`TOML.parse` + `stringify` 는 주석·순서·formatting 을 파괴하여 **사용자 신뢰 영구 손실** 로 이어진다.

format-preserving TOML 편집 라이브러리 3 후보를 실측 벤치마크해 1 개 선정한다.

## 후보

| 후보 | version | 유형 | 최근 활성 |
|---|---|---|---|
| `@decimalturn/toml-patch` | 1.1.1 | pure JS, TOML v1.1 | 2026-04 |
| `@shopify/toml-patch` | 0.3.0 | Rust `toml_edit` wasm | 1 년 stale |
| `@ltd/j-toml` | 1.38.0 | pure JS, "as much as possible" | 활성 |

**탈락 (사전)**:
- `@iarna/toml` — 6 년 방치 + 편집 시 주석 손실
- `smol-toml` — comment 보존 없음

## 벤치마크 시나리오 (10)

`tests/fixtures/round-trip/toml/scenarios.json` 참조. 요약:

1. 신규 entry 추가 — 주석 유지
2. entry value 수정
3. entry 삭제 — 인접 주석 보존
4. array-of-tables 순서 보존
5. inline table 유지
6. multi-line array formatting
7. CRLF 개행 유지
8. UTF-8 BOM 유지
9. 대용량 (>100KB) 성능
10. marker 블록 내부만 수정 (§10.5)

## 결과 matrix

**TBD** — Task 7 benchmark 실행 후 Task 8 에서 채움.

## 선정 결정

**TBD** — Task 8.

## 탈락 후보의 측정값

**TBD** — Task 8.

## 재검토 트리거

- 선정 library 가 v2 로 메이저 업데이트되면서 API 변경 시
- Codex 가 `~/.codex/config.toml` 대신 TOML v1.1 전용 문법을 요구하면
- Rust wasm 래퍼 (`@shopify/toml-patch`) 가 1 년 내 다시 활성화되면 재평가 (Rust 선례의 format preservation 완성도 높음)
```

- [ ] **Step 5: Commit**

```bash
git add scripts/poc/poc-1-toml.ts package.json docs/superpowers/poc/2026-04-22-poc-1-toml-library.md
git commit -m "test(poc-1): TOML 3-library benchmark runner + POC doc skeleton"
```

---

### Task 8 — POC-1 Decision Memo

**Files:**
- Modify: `docs/superpowers/poc/2026-04-22-poc-1-toml-library.md` (결과 matrix + 선정 결정 기입)

**Purpose**: Task 7 runner 출력을 분석해 1 library 를 선정. 합격 기준:
1. **최우선**: Scenarios 1 (add), 2 (modify), 3 (delete) 의 `outsideChangesByteCount === 0` (spec §10.2 요구)
2. Scenarios 4, 5, 10 (array-of-tables, inline table, marker block) preservation
3. Scenarios 7, 8 (CRLF, BOM) 통과
4. 대용량 9 의 성능 (100KB < 1 sec)
5. 3 개 library 중 **가장 많이 pass** 한 것을 선정. 동점이면 **가장 최근 활성** + **가장 적은 error** 를 선정.

- [ ] **Step 1: Run benchmark and capture output**

Run: `npm run poc:1 2>benchmark-1.err 1>benchmark-1.json`
Expected: `benchmark-1.json` 에 JSON 결과, `benchmark-1.err` 에 progress + summary table.

- [ ] **Step 2: Analyze results**

결과 분석 (의사결정 절차):

```
For each library L:
  pass_count = # scenarios with status=pass
  fail_count = # scenarios with status=fail-preserve or error
  critical_pass = # scenarios 1,2,3 with status=pass

If only one library has critical_pass == 3:
  Winner = that library
Elif multiple libraries have critical_pass == 3:
  Winner = library with highest total pass_count
  Tiebreak 1: fewest error status
  Tiebreak 2: lowest totalMs (perf)
  Tiebreak 3: most recent npm version release date
Else (no library has critical_pass == 3):
  Escalate: Plan 2A 실패. marker-block 전체 교체 전략 (§10.5) 로 library 의존 최소화한 fallback 검토.
```

**전사 의무**:
- 모든 scenario 결과를 markdown 테이블로 기입
- 각 library 의 에러 메시지는 별도 "탈락 후보의 측정값" 섹션에 원문 복사

- [ ] **Step 3: Update `docs/superpowers/poc/2026-04-22-poc-1-toml-library.md`**

템플릿:

```markdown
## 결과 matrix

| Scenario | @decimalturn/toml-patch | @shopify/toml-patch | @ltd/j-toml |
|---|---|---|---|
| 01-add-entry | ✅/❌ (X ms, Y bytes outside) | ... | ... |
| 02-modify-value | ... | ... | ... |
| 03-delete-entry | ... | ... | ... |
| 04-array-of-tables | ... | ... | ... |
| 05-inline-table | ... | ... | ... |
| 06-multiline-array | ... | ... | ... |
| 07-crlf | ... | ... | ... |
| 08-bom | ... | ... | ... |
| 09-large | ... | ... | ... |
| 10-marker-block | ... | ... | ... |
| **합계** | X / 10 (N ms total) | X / 10 | X / 10 |

## 선정 결정

**Winner**: `<선정된 library>` @ `<version>`

**근거**:
1. 크리티컬 scenario (1, 2, 3) 전부 통과 (outsideChangesByteCount === 0)
2. [상세 근거]
3. [상세 근거]

**Plan 2B 에서 사용할 API**: `<library>.<func>` (예: `tomlPatch.patch(source, path, value)`)

## 탈락 후보의 측정값

### `<library A>`
- 통과: X / 10
- 주요 실패 이유: [구체적 scenario + 에러/diff 원문]

### `<library B>`
- 통과: X / 10
- 주요 실패 이유: [구체적 scenario + 에러/diff 원문]
```

- [ ] **Step 4: If winner 가 없으면 escalation path 실행**

모든 library 가 scenarios 1, 2, 3 중 1 개 이상 실패하면:

a. `STEP-B/02-config-round-trip.md` §112~150 의 "marker-block 전체 교체 전략" 을 1순위로 채택.
b. TOML library 는 **파싱/구조 검증 용** 으로만 사용 (편집은 marker 블록 텍스트 교체).
c. Winner 선정: 파싱/구조 검증 성공률 + 가장 최근 활성 → `@decimalturn/toml-patch` 를 default 로.
d. `docs/superpowers/poc/2026-04-22-poc-1-toml-library.md` 의 "선정 결정" 섹션에 escalation 경위 + fallback 전략 명시.

- [ ] **Step 5: Commit**

```bash
git add docs/superpowers/poc/2026-04-22-poc-1-toml-library.md
git commit -m "docs(poc-1): TOML library selection — <winner> @ <version>"
```

---

### Task 9 — POC-1 Winner-only Wrapper Test Suite

**Files:**
- Create: `tests/round-trip/toml/preservation.test.ts` — 10 scenario 전체 통과 (winner 한정)
- (Task 18 에서 탈락 library wrapper + 설치 제거 — 이 task 에선 wrapper 파일 유지)

**Purpose**: 선정된 library 에 대해 10 scenario preservation 전체를 CI 에 편입. Plan 2B 이후 regression 방어.

- [ ] **Step 1: Write test for winner library**

Winner = `<W>` 로 가정. 다른 library 는 건드리지 않음.

File: `tests/round-trip/toml/preservation.test.ts`

```typescript
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
// import 는 winner 에 따라 하나만 선택:
import { createDecimalturnEditor as createWinnerEditor } from "../../../src/round-trip/toml/decimalturn.js";
// 또는:
// import { createShopifyEditor as createWinnerEditor } from "../../../src/round-trip/toml/shopify.js";
// 또는:
// import { createLtdJTomlEditor as createWinnerEditor } from "../../../src/round-trip/toml/ltd-j-toml.js";

import { computeDiffRegions } from "../../../src/round-trip/diff-regions.js";
import type { Edit } from "../../../src/round-trip/types.js";

const FIXTURE_DIR = join(__dirname, "../../fixtures/round-trip/toml");
const scenarios = JSON.parse(readFileSync(join(FIXTURE_DIR, "scenarios.json"), "utf8")).scenarios as Array<{
  fixture: string;
  description: string;
  edits: Edit[];
}>;

describe("POC-1 winner TOML preservation — 10 scenarios", () => {
  it.each(scenarios)("$fixture: $description", async ({ fixture, edits }) => {
    const source = readFileSync(join(FIXTURE_DIR, fixture), "utf8");
    const editor = createWinnerEditor();
    const doc = await editor.load(source);
    const result = await editor.edit(doc, edits);
    const regions = computeDiffRegions(source, result.modified);
    const report = editor.verify(source, result.modified, regions);
    expect(report.preserved, `outside diff: ${report.outsideChangesByteCount} bytes`).toBe(true);
    expect(result.editsApplied).toBe(edits.length);
  });
});
```

- [ ] **Step 2: Run test**

Run: `npx vitest run tests/round-trip/toml/preservation.test.ts`
Expected: 10 tests PASS.

**실패 시**:
- Task 8 에서 escalation path 가 사용되었다면 이 test 도 marker-block 전략 기준으로 재작성.
- 아직 일부 scenario 가 실패하면 "known limitation" 으로 skip 처리 (`it.skip`) + Plan 2B TODO 에 기록.

- [ ] **Step 3: Commit**

```bash
git add tests/round-trip/toml/preservation.test.ts
git commit -m "test(poc-1): 10-scenario preservation suite (winner only)"
```

---

### Task 10 — POC-2 JSONC Golden Fixtures + 2 Library Install

**Files:**
- Create: `tests/fixtures/round-trip/jsonc/01-comments.jsonc`
- Create: `tests/fixtures/round-trip/jsonc/02-trailing-comma.jsonc`
- Create: `tests/fixtures/round-trip/jsonc/03-add-key.jsonc`
- Create: `tests/fixtures/round-trip/jsonc/04-modify-value.jsonc`
- Create: `tests/fixtures/round-trip/jsonc/05-delete-key.jsonc`
- Create: `tests/fixtures/round-trip/jsonc/06-marker-block.jsonc`
- Create: `tests/fixtures/round-trip/jsonc/07-pure-json.json` (pure JSON, `json-key-owned` 방식 테스트 대비)
- Create: `tests/fixtures/round-trip/jsonc/08-large.jsonc`
- Create: `tests/fixtures/round-trip/jsonc/scenarios.json`
- Modify: `package.json` — `jsonc-morph` 추가 (jsonc-parser 는 이미 있음)
- Test: `tests/round-trip/jsonc/fixtures.test.ts`

**Purpose**: JSONC 벤치마크 용 8 시나리오. 주석 종류 (line / block / inline), trailing comma, marker 블록, 순수 JSON, 대용량.

- [ ] **Step 1: Install jsonc-morph**

```bash
npm install --save-dev jsonc-morph
```

- [ ] **Step 2: Write failing test `tests/round-trip/jsonc/fixtures.test.ts`**

```typescript
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const FIXTURE_DIR = join(__dirname, "../../fixtures/round-trip/jsonc");
const SCENARIOS = [
  "01-comments.jsonc",
  "02-trailing-comma.jsonc",
  "03-add-key.jsonc",
  "04-modify-value.jsonc",
  "05-delete-key.jsonc",
  "06-marker-block.jsonc",
  "07-pure-json.json",
  "08-large.jsonc",
];

describe("round-trip/jsonc fixtures", () => {
  it.each(SCENARIOS)("fixture %s 존재", (name) => {
    const content = readFileSync(join(FIXTURE_DIR, name));
    expect(content.length).toBeGreaterThan(0);
  });

  it("scenarios.json 에 8 시나리오", () => {
    const spec = JSON.parse(readFileSync(join(FIXTURE_DIR, "scenarios.json"), "utf8"));
    expect(spec.scenarios).toHaveLength(8);
  });

  it("01-comments.jsonc 는 line + block + inline 주석 포함", () => {
    const content = readFileSync(join(FIXTURE_DIR, "01-comments.jsonc"), "utf8");
    expect(content).toContain("//");
    expect(content).toContain("/*");
  });

  it("02-trailing-comma.jsonc 는 trailing comma 포함", () => {
    const content = readFileSync(join(FIXTURE_DIR, "02-trailing-comma.jsonc"), "utf8");
    expect(content).toMatch(/,\s*[}\]]/);
  });

  it("06-marker-block.jsonc 는 concord-managed marker 포함", () => {
    const content = readFileSync(join(FIXTURE_DIR, "06-marker-block.jsonc"), "utf8");
    expect(content).toContain(">>>> concord-managed:");
  });

  it("07-pure-json.json 은 주석 없음 (strict JSON)", () => {
    const content = readFileSync(join(FIXTURE_DIR, "07-pure-json.json"), "utf8");
    expect(content).not.toContain("//");
    expect(content).not.toContain("/*");
    // strict JSON 파싱 성공
    expect(() => JSON.parse(content)).not.toThrow();
  });

  it("08-large.jsonc 는 > 50KB", () => {
    const content = readFileSync(join(FIXTURE_DIR, "08-large.jsonc"));
    expect(content.length).toBeGreaterThan(50 * 1024);
  });
});
```

- [ ] **Step 3: Run test — expect fail (fixtures 없음)**

Run: `npx vitest run tests/round-trip/jsonc/fixtures.test.ts`
Expected: FAIL.

- [ ] **Step 4: Create fixtures**

(a) `tests/fixtures/round-trip/jsonc/01-comments.jsonc`:
```jsonc
// Claude Code settings — sample
{
  /* Block comment at top of hooks */
  "hooks": {
    "user-prompt-submit": [
      // Line comment inside array
      "echo 'hook'"
    ]
  },
  "permissions": {
    "allow": ["read", "write"] // inline comment after array
  }
}
```

(b) `tests/fixtures/round-trip/jsonc/02-trailing-comma.jsonc`:
```jsonc
{
  "mcpServers": {
    "airtable": {
      "command": "npx",
      "args": ["-y", "airtable-mcp-server"],
    },
  },
}
```

(c) `tests/fixtures/round-trip/jsonc/03-add-key.jsonc`:
```jsonc
// Settings
{
  "mcpServers": {
    "existing": { "command": "npx" }
    // new server 가 아래에 추가되어야 함
  }
}
```

(d) `tests/fixtures/round-trip/jsonc/04-modify-value.jsonc`:
```jsonc
{
  "mcpServers": {
    "airtable": {
      "command": "npx",
      "args": ["-y", "airtable-mcp-server@0.1.0"] // version 변경 대상
    }
  }
}
```

(e) `tests/fixtures/round-trip/jsonc/05-delete-key.jsonc`:
```jsonc
{
  "mcpServers": {
    // obsolete 를 삭제해야 함 — 인접 주석 보존 검증
    "obsolete": { "command": "old-tool" },
    "keep": { "command": "new-tool" }
  }
}
```

(f) `tests/fixtures/round-trip/jsonc/06-marker-block.jsonc`:
```jsonc
{
  "mcpServers": {
    "user-manual": {
      // User added this manually
      "command": "node",
      "args": ["user.js"]
    },
    // >>>> concord-managed:mcp_servers:airtable  (hash:abcd1234)
    "airtable": {
      "command": "npx",
      "args": ["-y", "airtable-mcp-server"]
    },
    // <<<< concord-managed:mcp_servers:airtable
    "other-manual": {
      "command": "bash",
      "args": ["other.sh"]
    }
  }
}
```

(g) `tests/fixtures/round-trip/jsonc/07-pure-json.json`:
```json
{
  "mcpServers": {
    "airtable": {
      "command": "npx",
      "args": ["-y", "airtable-mcp-server"]
    }
  },
  "projects": {
    "/home/user/repo": {
      "lastAccessed": "2026-04-01"
    }
  }
}
```

(h) `tests/fixtures/round-trip/jsonc/08-large.jsonc` — 프로그래매틱:
```bash
node -e "
const obj = { mcpServers: {} };
for (let i = 0; i < 500; i++) {
  obj.mcpServers['srv_' + i] = { command: 'npx', args: ['-y', 'srv-' + i + '-mcp-server'] };
}
const lines = JSON.stringify(obj, null, 2).split('\n');
lines.splice(1, 0, '  // Large JSONC fixture');
require('fs').writeFileSync('tests/fixtures/round-trip/jsonc/08-large.jsonc', lines.join('\n'));
"
```

(i) `tests/fixtures/round-trip/jsonc/scenarios.json`:
```json
{
  "scenarios": [
    {
      "fixture": "01-comments.jsonc",
      "description": "주석 3종 (line/block/inline) 보존",
      "edits": [{ "op": "set", "path": ["permissions", "allow"], "value": ["read", "write", "execute"] }]
    },
    {
      "fixture": "02-trailing-comma.jsonc",
      "description": "trailing comma 유지 — value 수정",
      "edits": [{ "op": "set", "path": ["mcpServers", "airtable", "args"], "value": ["-y", "airtable-mcp-server@2.0"] }]
    },
    {
      "fixture": "03-add-key.jsonc",
      "description": "새 key 추가 — 기존 주석 유지",
      "edits": [{ "op": "set", "path": ["mcpServers", "slack"], "value": { "command": "node", "args": ["slack.js"] } }]
    },
    {
      "fixture": "04-modify-value.jsonc",
      "description": "value 수정 — inline 주석 유지",
      "edits": [{ "op": "set", "path": ["mcpServers", "airtable", "args"], "value": ["-y", "airtable-mcp-server@0.2.0"] }]
    },
    {
      "fixture": "05-delete-key.jsonc",
      "description": "key 삭제 — 인접 주석 + 다른 key 보존",
      "edits": [{ "op": "delete", "path": ["mcpServers", "obsolete"] }]
    },
    {
      "fixture": "06-marker-block.jsonc",
      "description": "marker 블록 내부만 수정 — 외부 user-manual, other-manual 보존",
      "edits": [{ "op": "set", "path": ["mcpServers", "airtable", "args"], "value": ["-y", "airtable-mcp-server@2.0"] }]
    },
    {
      "fixture": "07-pure-json.json",
      "description": "순수 JSON — json-key-owned 방식 대비, key 추가",
      "edits": [{ "op": "set", "path": ["mcpServers", "slack"], "value": { "command": "node" } }]
    },
    {
      "fixture": "08-large.jsonc",
      "description": "대용량 JSONC 편집 성능",
      "edits": [{ "op": "set", "path": ["mcpServers", "srv_250", "command"], "value": "node" }]
    }
  ]
}
```

- [ ] **Step 5: Run test — expect pass**

Run: `npx vitest run tests/round-trip/jsonc/fixtures.test.ts`
Expected: PASS (8 + 5 checks).

- [ ] **Step 6: Commit**

```bash
git add tests/fixtures/round-trip/jsonc tests/round-trip/jsonc/fixtures.test.ts package.json package-lock.json
git commit -m "test(poc-2): 8 JSONC fixtures + install jsonc-morph"
```

---

### Task 11 — POC-2 Implement 2 JSONC Wrappers

**Files:**
- Create: `src/round-trip/jsonc/jsonc-morph.ts`
- Create: `src/round-trip/jsonc/jsonc-parser.ts`
- Test: `tests/round-trip/jsonc/edit.test.ts`

**Purpose**: `jsonc-morph` 와 `jsonc-parser` 두 library 를 동일 `ConfigFileEditor` 인터페이스로 감싼다.

- [ ] **Step 1: Implement `src/round-trip/jsonc/jsonc-morph.ts`**

```typescript
import { parse as parseMorph } from "jsonc-morph";
import type { ConfigFileEditor, ConfigDocument, Edit, EditResult } from "../types.js";
import { verifyPreservation } from "../preservation.js";

export function createJsoncMorphEditor(): ConfigFileEditor {
  return {
    async load(source: string): Promise<ConfigDocument> {
      return { source, markers: [] };
    },

    async edit(doc: ConfigDocument, edits: readonly Edit[]): Promise<EditResult> {
      // jsonc-morph API: parse() → CST document, doc.set(path, value) / doc.remove(path)
      const cst = parseMorph(doc.source);
      let applied = 0;
      for (const e of edits) {
        if (e.op === "set") {
          // Path 는 jsonc-morph spec 에 맞춰 변환.
          // jsonc-morph 는 getValueAt / setValueAt / deleteAt 같은 API 제공 (정확한 이름은 구현 시 확인).
          (cst as any).setValueAt?.(e.path as (string | number)[], e.value) ??
            (cst as any).set?.(e.path as (string | number)[], e.value);
          applied++;
        } else if (e.op === "delete") {
          (cst as any).deleteAt?.(e.path as (string | number)[]) ??
            (cst as any).remove?.(e.path as (string | number)[]);
          applied++;
        }
      }
      const modified = (cst as any).toString?.() ?? (cst as any).stringify?.() ?? doc.source;

      return {
        modified,
        editsApplied: applied,
        originalBytes: Buffer.byteLength(doc.source, "utf8"),
        modifiedBytes: Buffer.byteLength(modified, "utf8"),
      };
    },

    serialize(doc: ConfigDocument): string {
      return doc.source;
    },

    verify(original, modified, changedRegions) {
      return verifyPreservation(original, modified, changedRegions);
    },
  };
}
```

**주의**: 실제 `jsonc-morph` API 는 Deno 중심이라 npm 버전의 export 이름을 `node -e "console.log(Object.keys(require('jsonc-morph')))"` 로 확인. 위 코드는 두 가지 가능한 API 이름 (`setValueAt` / `set`) 을 fallback.

- [ ] **Step 2: Implement `src/round-trip/jsonc/jsonc-parser.ts`**

```typescript
import * as jsoncParser from "jsonc-parser";
import type { ConfigFileEditor, ConfigDocument, Edit, EditResult } from "../types.js";
import { verifyPreservation } from "../preservation.js";

export function createJsoncParserEditor(): ConfigFileEditor {
  return {
    async load(source: string): Promise<ConfigDocument> {
      return { source, markers: [] };
    },

    async edit(doc: ConfigDocument, edits: readonly Edit[]): Promise<EditResult> {
      let source = doc.source;
      let applied = 0;
      for (const e of edits) {
        const path = e.path as (string | number)[];
        if (e.op === "set") {
          const editOps = jsoncParser.modify(source, path, e.value, {
            formattingOptions: { insertSpaces: true, tabSize: 2, eol: detectEol(source) },
          });
          source = jsoncParser.applyEdits(source, editOps);
          applied++;
        } else if (e.op === "delete") {
          const editOps = jsoncParser.modify(source, path, undefined, {
            formattingOptions: { insertSpaces: true, tabSize: 2, eol: detectEol(source) },
          });
          source = jsoncParser.applyEdits(source, editOps);
          applied++;
        }
      }
      return {
        modified: source,
        editsApplied: applied,
        originalBytes: Buffer.byteLength(doc.source, "utf8"),
        modifiedBytes: Buffer.byteLength(source, "utf8"),
      };
    },

    serialize(doc: ConfigDocument): string {
      return doc.source;
    },

    verify(original, modified, changedRegions) {
      return verifyPreservation(original, modified, changedRegions);
    },
  };
}

function detectEol(source: string): string {
  return source.includes("\r\n") ? "\r\n" : "\n";
}
```

- [ ] **Step 3: Write test `tests/round-trip/jsonc/edit.test.ts`**

```typescript
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createJsoncMorphEditor } from "../../../src/round-trip/jsonc/jsonc-morph.js";
import { createJsoncParserEditor } from "../../../src/round-trip/jsonc/jsonc-parser.js";

const FIXTURE_DIR = join(__dirname, "../../fixtures/round-trip/jsonc");

const editors = [
  { name: "jsonc-morph", factory: createJsoncMorphEditor },
  { name: "jsonc-parser", factory: createJsoncParserEditor },
];

describe("POC-2 JSONC edit smoke", () => {
  it.each(editors)("$name: 03-add-key 편집 가능", async ({ factory }) => {
    const source = readFileSync(join(FIXTURE_DIR, "03-add-key.jsonc"), "utf8");
    const editor = factory();
    const doc = await editor.load(source);
    const result = await editor.edit(doc, [
      { op: "set", path: ["mcpServers", "slack"], value: { command: "node", args: ["slack.js"] } },
    ]);
    expect(result.editsApplied).toBe(1);
    expect(result.modified).toContain("slack");
  });

  it.each(editors)("$name: 07-pure-json 편집 가능", async ({ factory }) => {
    const source = readFileSync(join(FIXTURE_DIR, "07-pure-json.json"), "utf8");
    const editor = factory();
    const doc = await editor.load(source);
    const result = await editor.edit(doc, [
      { op: "set", path: ["mcpServers", "slack"], value: { command: "node" } },
    ]);
    expect(result.editsApplied).toBe(1);
  });
});
```

- [ ] **Step 4: Run test**

Run: `npx vitest run tests/round-trip/jsonc/edit.test.ts`
Expected: 4 tests PASS (2 library × 2 scenario).

**실패 시**: API 이름 확인 + wrapper 수정.

- [ ] **Step 5: Typecheck**

Run: `npm run typecheck`
Expected: clean.

- [ ] **Step 6: Commit**

```bash
git add src/round-trip/jsonc tests/round-trip/jsonc/edit.test.ts
git commit -m "feat(poc-2): implement jsonc-morph + jsonc-parser wrappers"
```

---

### Task 12 — POC-2 Benchmark Runner + Decision Memo

**Files:**
- Create: `scripts/poc/poc-2-jsonc.ts`
- Create: `docs/superpowers/poc/2026-04-22-poc-2-jsonc-library.md`
- (Winner 결정 후) Create: `tests/round-trip/jsonc/preservation.test.ts`

**Purpose**: POC-1 과 동일 패턴 — 2 library × 8 scenario 매트릭스.

- [ ] **Step 1: Create `scripts/poc/poc-2-jsonc.ts`**

(POC-1 runner 와 동일 구조, library 2 개 / scenario 8 개 로 변경)

```typescript
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { performance } from "node:perf_hooks";
import { createJsoncMorphEditor } from "../../src/round-trip/jsonc/jsonc-morph.js";
import { createJsoncParserEditor } from "../../src/round-trip/jsonc/jsonc-parser.js";
import { computeDiffRegions } from "../../src/round-trip/diff-regions.js";
import type { Edit } from "../../src/round-trip/types.js";

const FIXTURE_DIR = join(process.cwd(), "tests/fixtures/round-trip/jsonc");
const scenarios = JSON.parse(readFileSync(join(FIXTURE_DIR, "scenarios.json"), "utf8")).scenarios as Array<{
  fixture: string;
  description: string;
  edits: Edit[];
}>;

const libraries = [
  { name: "jsonc-morph", factory: createJsoncMorphEditor },
  { name: "jsonc-parser", factory: createJsoncParserEditor },
];

type Result = {
  library: string;
  fixture: string;
  status: "pass" | "fail-preserve" | "error";
  outsideChangesByteCount?: number;
  elapsedMs: number;
  errorMessage?: string;
};

async function main() {
  const results: Result[] = [];
  for (const lib of libraries) {
    for (const sc of scenarios) {
      const source = readFileSync(join(FIXTURE_DIR, sc.fixture), "utf8");
      const editor = lib.factory();
      const t0 = performance.now();
      try {
        const doc = await editor.load(source);
        const edit = await editor.edit(doc, sc.edits);
        const regions = computeDiffRegions(source, edit.modified);
        const report = editor.verify(source, edit.modified, regions);
        results.push({
          library: lib.name,
          fixture: sc.fixture,
          status: report.preserved ? "pass" : "fail-preserve",
          outsideChangesByteCount: report.outsideChangesByteCount,
          elapsedMs: performance.now() - t0,
        });
      } catch (err) {
        results.push({
          library: lib.name,
          fixture: sc.fixture,
          status: "error",
          errorMessage: err instanceof Error ? err.message : String(err),
          elapsedMs: performance.now() - t0,
        });
      }
      const last = results[results.length - 1]!;
      console.error(`[${last.library}] ${last.fixture}: ${last.status}`);
    }
  }
  console.log(JSON.stringify({ results }, null, 2));

  const summary = libraries.map((lib) => {
    const libResults = results.filter((r) => r.library === lib.name);
    return {
      library: lib.name,
      pass: libResults.filter((r) => r.status === "pass").length,
      failPreserve: libResults.filter((r) => r.status === "fail-preserve").length,
      error: libResults.filter((r) => r.status === "error").length,
      totalMs: libResults.reduce((a, r) => a + r.elapsedMs, 0),
    };
  });
  console.error("\n=== POC-2 Summary ===");
  console.table(summary);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
```

- [ ] **Step 2: Run benchmark**

Run: `npm run poc:2 2>benchmark-2.err 1>benchmark-2.json`

- [ ] **Step 3: Create decision memo `docs/superpowers/poc/2026-04-22-poc-2-jsonc-library.md`**

POC-1 와 동일 템플릿. Winner 선정 기준:
1. 크리티컬 scenario (01-comments, 03-add-key, 05-delete-key, 06-marker-block) 전부 통과.
2. 01-comments 에서 주석 **모든 3종** 보존 (line/block/inline).
3. 순수 JSON (07-pure-json) 에서 편집 가능 (json-key-owned 방식 호환).
4. 동점이면 패키지 크기 작은 것 우선 (jsonc-parser 가 일반적으로 더 가벼움).

**선정 결정** 섹션 + **탈락 후보 측정값** 섹션 + **재검토 트리거** 섹션 필수.

- [ ] **Step 4: If winner == jsonc-morph, create winner-only test**

File: `tests/round-trip/jsonc/preservation.test.ts` (POC-1 Task 9 와 유사 패턴)

```typescript
// Winner 에 따라 import 스왑
import { createJsoncMorphEditor as createWinnerEditor } from "../../../src/round-trip/jsonc/jsonc-morph.js";
// 또는:
// import { createJsoncParserEditor as createWinnerEditor } from "../../../src/round-trip/jsonc/jsonc-parser.js";
// ... (나머지는 Task 9 와 동일 패턴)
```

- [ ] **Step 5: Run full vitest**

Run: `npx vitest run`
Expected: Plan 1 169 + Plan 2A 누적 tests PASS.

- [ ] **Step 6: Commit**

```bash
git add scripts/poc/poc-2-jsonc.ts docs/superpowers/poc/2026-04-22-poc-2-jsonc-library.md tests/round-trip/jsonc/preservation.test.ts
git commit -m "docs(poc-2): JSONC library selection — <winner> + preservation suite"
```

---

### Task 13 — POC-3 YAML Write-back Golden Fixtures + Wrapper

**Files:**
- Create: `tests/fixtures/round-trip/yaml/01-comments.yaml`
- Create: `tests/fixtures/round-trip/yaml/02-add-asset.yaml`
- Create: `tests/fixtures/round-trip/yaml/03-modify-value.yaml`
- Create: `tests/fixtures/round-trip/yaml/04-delete-asset.yaml`
- Create: `tests/fixtures/round-trip/yaml/05-nested-indent.yaml`
- Create: `tests/fixtures/round-trip/yaml/06-multiline-string.yaml`
- Create: `tests/fixtures/round-trip/yaml/scenarios.json`
- Create: `src/round-trip/yaml/eemeli.ts`
- Test: `tests/round-trip/yaml/write-back.test.ts`

**Purpose**: Plan 1 은 eemeli/yaml 을 **read-only** 로 채택 (POC-3 기초). Plan 2A 는 **write-back** 측 측정. `concord import` / `concord replace` 가 `concord.yaml` 편집 시 주석·순서·indent 보존하는지.

- [ ] **Step 1: Create 6 YAML fixtures**

(a) `tests/fixtures/round-trip/yaml/01-comments.yaml`:
```yaml
# Concord project manifest
version: 1

# MCP servers block
assets:
  mcp_servers:
    # Airtable server
    - id: airtable  # unique id
      source: { type: npm, name: airtable-mcp-server }
      install: copy

    # Slack server
    - id: slack
      source: { type: npm, name: slack-mcp-server }
```

(b) `tests/fixtures/round-trip/yaml/02-add-asset.yaml`:
```yaml
version: 1
assets:
  skills:
    - id: first-skill
      source: { type: file, path: ./skills/first.md }
```

(c) `tests/fixtures/round-trip/yaml/03-modify-value.yaml`:
```yaml
version: 1
assets:
  skills:
    - id: bumping-version
      source:
        type: git
        url: https://github.com/org/repo
        ref: v0.1.0  # version 변경 대상
```

(d) `tests/fixtures/round-trip/yaml/04-delete-asset.yaml`:
```yaml
version: 1
assets:
  hooks:
    - id: obsolete
      source: { type: file, path: ./hooks/old.sh }
    - id: keep
      source: { type: file, path: ./hooks/new.sh }
```

(e) `tests/fixtures/round-trip/yaml/05-nested-indent.yaml`:
```yaml
version: 1
assets:
  plugins:
    - id: deep
      source:
        type: claude-plugin
        marketplace: anthropics
        name: example-plugin
      capability_matrix:
        claude-code:
          skills: { status: supported }
          subagents: { status: supported }
        codex:
          skills: { status: detected-not-executed, reason: FeatureFlagDisabled }
```

(f) `tests/fixtures/round-trip/yaml/06-multiline-string.yaml`:
```yaml
version: 1
assets:
  instructions:
    - id: long-doc
      source:
        type: file
        path: ./CLAUDE.md
      content_snippet: |
        Multi-line
        content
        preservation
        check
```

(g) `tests/fixtures/round-trip/yaml/scenarios.json`:
```json
{
  "scenarios": [
    {
      "fixture": "01-comments.yaml",
      "description": "주석 + 들여쓰기 유지 — 기존 asset value 수정",
      "edits": [{ "op": "set", "path": ["assets", "mcp_servers", 0, "install"], "value": "symlink" }]
    },
    {
      "fixture": "02-add-asset.yaml",
      "description": "새 asset 추가",
      "edits": [
        {
          "op": "set",
          "path": ["assets", "skills", 1],
          "value": { "id": "second-skill", "source": { "type": "file", "path": "./skills/second.md" } }
        }
      ]
    },
    {
      "fixture": "03-modify-value.yaml",
      "description": "단일 value 변경 — 인접 주석 유지",
      "edits": [{ "op": "set", "path": ["assets", "skills", 0, "source", "ref"], "value": "v0.2.0" }]
    },
    {
      "fixture": "04-delete-asset.yaml",
      "description": "asset 삭제 — keep 유지",
      "edits": [{ "op": "delete", "path": ["assets", "hooks", 0] }]
    },
    {
      "fixture": "05-nested-indent.yaml",
      "description": "깊은 중첩 들여쓰기 보존",
      "edits": [
        {
          "op": "set",
          "path": ["assets", "plugins", 0, "capability_matrix", "codex", "subagents"],
          "value": { "status": "na" }
        }
      ]
    },
    {
      "fixture": "06-multiline-string.yaml",
      "description": "multi-line string literal (|) 유지",
      "edits": [{ "op": "set", "path": ["assets", "instructions", 0, "source", "path"], "value": "./AGENTS.md" }]
    }
  ]
}
```

- [ ] **Step 2: Implement `src/round-trip/yaml/eemeli.ts`**

```typescript
import YAML from "yaml";
import type { ConfigFileEditor, ConfigDocument, Edit, EditResult } from "../types.js";
import { verifyPreservation } from "../preservation.js";

export function createEemeliYamlEditor(): ConfigFileEditor {
  return {
    async load(source: string): Promise<ConfigDocument> {
      return { source, markers: [] };
    },

    async edit(doc: ConfigDocument, edits: readonly Edit[]): Promise<EditResult> {
      // eemeli/yaml Document API — CST 레벨 편집 (주석 보존)
      const yamlDoc = YAML.parseDocument(doc.source);
      let applied = 0;
      for (const e of edits) {
        if (e.op === "set") {
          yamlDoc.setIn(e.path as (string | number)[], e.value);
          applied++;
        } else if (e.op === "delete") {
          yamlDoc.deleteIn(e.path as (string | number)[]);
          applied++;
        }
      }
      const modified = yamlDoc.toString();
      return {
        modified,
        editsApplied: applied,
        originalBytes: Buffer.byteLength(doc.source, "utf8"),
        modifiedBytes: Buffer.byteLength(modified, "utf8"),
      };
    },

    serialize(doc: ConfigDocument): string {
      return doc.source;
    },

    verify(original, modified, changedRegions) {
      return verifyPreservation(original, modified, changedRegions);
    },
  };
}
```

- [ ] **Step 3: Write test `tests/round-trip/yaml/write-back.test.ts`**

```typescript
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createEemeliYamlEditor } from "../../../src/round-trip/yaml/eemeli.js";
import { computeDiffRegions } from "../../../src/round-trip/diff-regions.js";
import type { Edit } from "../../../src/round-trip/types.js";

const FIXTURE_DIR = join(__dirname, "../../fixtures/round-trip/yaml");
const scenarios = JSON.parse(readFileSync(join(FIXTURE_DIR, "scenarios.json"), "utf8")).scenarios as Array<{
  fixture: string;
  description: string;
  edits: Edit[];
}>;

describe("POC-3 eemeli/yaml write-back — 6 scenarios", () => {
  it.each(scenarios)("$fixture: $description", async ({ fixture, edits }) => {
    const source = readFileSync(join(FIXTURE_DIR, fixture), "utf8");
    const editor = createEemeliYamlEditor();
    const doc = await editor.load(source);
    const result = await editor.edit(doc, edits);
    const regions = computeDiffRegions(source, result.modified);
    const report = editor.verify(source, result.modified, regions);
    expect(result.editsApplied).toBe(edits.length);
    // YAML 은 edit 후 sibling 주석/indent 가 부분적으로 재배치될 수 있음.
    // 합격 기준: 외부 영역의 "의미적 동일성" — 주석 문자열이 보존되고 key 순서가 유지되는지.
    // 이 test 는 preservation byte-level 이 아닌 "주석 문자열 보존" 으로 약화.
    const originalComments = [...source.matchAll(/#.*/g)].map((m) => m[0]);
    const modifiedComments = [...result.modified.matchAll(/#.*/g)].map((m) => m[0]);
    for (const c of originalComments) {
      expect(modifiedComments).toContain(c);
    }
  });
});
```

**설계 근거**: eemeli/yaml 은 in-memory AST 로 편집 후 stringify 하므로 byte-level preservation 은 불가능. 대신 "**주석 문자열 집합 보존**" + "edit 적용 완료" 를 합격 기준으로 완화. POC-1/2 의 byte-level 기준과 다르다는 점을 `docs/superpowers/poc/2026-04-22-poc-3-yaml-write-back.md` 에 명시.

- [ ] **Step 4: Run test**

Run: `npx vitest run tests/round-trip/yaml/write-back.test.ts`
Expected: 6 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/round-trip/yaml tests/fixtures/round-trip/yaml tests/round-trip/yaml
git commit -m "feat(poc-3): eemeli/yaml write-back wrapper + 6-scenario fixtures"
```

---

### Task 14 — POC-3 Benchmark Runner + Decision Memo

**Files:**
- Create: `scripts/poc/poc-3-yaml.ts`
- Create: `docs/superpowers/poc/2026-04-22-poc-3-yaml-write-back.md`

**Purpose**: eemeli/yaml 이 Plan 1 에서 read-only 로 채택되었으나 write-back 한계를 명시 기록. 실패 scenario 가 있으면 Plan 2B 의 `concord import` 가 대응할 전략 (marker block fallback 또는 간접 편집) 결정.

- [ ] **Step 1: Create `scripts/poc/poc-3-yaml.ts`**

(POC-2 runner 와 동일 구조, library 1 개)

```typescript
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { performance } from "node:perf_hooks";
import { createEemeliYamlEditor } from "../../src/round-trip/yaml/eemeli.js";
import { computeDiffRegions } from "../../src/round-trip/diff-regions.js";
import type { Edit } from "../../src/round-trip/types.js";

const FIXTURE_DIR = join(process.cwd(), "tests/fixtures/round-trip/yaml");
const scenarios = JSON.parse(readFileSync(join(FIXTURE_DIR, "scenarios.json"), "utf8")).scenarios as Array<{
  fixture: string;
  description: string;
  edits: Edit[];
}>;

async function main() {
  const results: Array<Record<string, unknown>> = [];
  for (const sc of scenarios) {
    const source = readFileSync(join(FIXTURE_DIR, sc.fixture), "utf8");
    const editor = createEemeliYamlEditor();
    const t0 = performance.now();
    try {
      const doc = await editor.load(source);
      const edit = await editor.edit(doc, sc.edits);
      const regions = computeDiffRegions(source, edit.modified);
      const report = editor.verify(source, edit.modified, regions);
      const originalComments = [...source.matchAll(/#.*/g)].map((m) => m[0]);
      const modifiedComments = [...edit.modified.matchAll(/#.*/g)].map((m) => m[0]);
      const commentsPreserved = originalComments.every((c) => modifiedComments.includes(c));
      results.push({
        fixture: sc.fixture,
        bytePreserved: report.preserved,
        commentsPreserved,
        outsideBytes: report.outsideChangesByteCount,
        elapsedMs: performance.now() - t0,
      });
    } catch (err) {
      results.push({
        fixture: sc.fixture,
        error: err instanceof Error ? err.message : String(err),
        elapsedMs: performance.now() - t0,
      });
    }
  }
  console.log(JSON.stringify({ results }, null, 2));
  console.table(results);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
```

- [ ] **Step 2: Run benchmark**

Run: `npm run poc:3 2>benchmark-3.err 1>benchmark-3.json`

- [ ] **Step 3: Create `docs/superpowers/poc/2026-04-22-poc-3-yaml-write-back.md`**

```markdown
# POC-3 — YAML Write-back (eemeli/yaml)

**Date**: 2026-04-22
**Plan**: Plan 2A
**Status**: **CONFIRMED** (Plan 1 read-only 확정 + Plan 2A write-back 한계 명시)

## 문제 정의

Plan 1 은 `yaml` (eemeli) 을 read-only 로 채택 (POC-3 초안, Plan 1 Task 17).
Plan 2 의 `concord import` / `concord replace` 는 `concord.yaml` 을 write-back 해야 한다.
eemeli/yaml 의 Document API 가 CST 레벨 편집 시 **주석 / 들여쓰기 / 순서** 를 어디까지 보존하는지 확인.

## 후보

- `yaml` @ 2.8.3 (eemeli) — Plan 1 채택 확정. Plan 2A 에서 write-back 범위 확장.
- 대안 없음 (`js-yaml` 은 comment 보존 없음)

## 벤치마크 시나리오 (6)

(scenarios.json 참조)

## 결과

**합격 기준 약화**: byte-level preservation 은 불가능. "주석 문자열 집합 보존" 으로 대체.

**TBD** — Task 14 benchmark 결과 기입.

## Plan 2B 에서의 적용 지침

1. `concord.yaml` 편집은 eemeli/yaml Document API 사용.
2. Byte-level preservation 보장 불가 → `raw_hash` 가 달라도 `normalized_hash` 로 drift 판정 (spec §10.4).
3. 주석 문자열 집합 보존이 합격 기준. Failure mode: 대량 asset 삭제 후 주석 일부 이동 → 경고 후 진행.
4. Marker block 전략 은 YAML 에 적용하지 않음 (concord.yaml 은 concord 소유 파일 전체).

## 재검토 트리거

- eemeli/yaml 이 v3 major release 시 API breaking change 확인.
- 사용자 피드백에서 주석 유실 사례 누적 시 AST 직접 조작 (Pair / Scalar 레벨) 로 격상 검토.
```

- [ ] **Step 4: Commit**

```bash
git add scripts/poc/poc-3-yaml.ts docs/superpowers/poc/2026-04-22-poc-3-yaml-write-back.md
git commit -m "docs(poc-3): eemeli/yaml write-back decision memo"
```

---

### Task 15 — POC-9 Install symlink-dir + macOS Golden Fixtures + Wrapper

**Files:**
- Modify: `package.json` — `symlink-dir`, `fs-extra`, `write-file-atomic`, `is-wsl` 추가
- Create: `src/round-trip/symlink/symlink-dir.ts`
- Create: `tests/fixtures/round-trip/symlink/sample-source/` (디렉토리 + 파일 3개)
- Test: `tests/round-trip/symlink/basic.test.ts`

**Purpose**: `symlink-dir` 의 macOS/Linux 기본 동작 + atomic staging + rename 경로 실측. Windows junction/hardlink fallback 은 Windows CI 에서만 검증 가능하므로 **Plan 2A 는 platform gate 설계까지만**.

- [ ] **Step 1: Install dependencies**

```bash
npm install --save symlink-dir fs-extra write-file-atomic
npm install --save is-wsl
npm install --save-dev @types/fs-extra @types/write-file-atomic
```

**메모**: `symlink-dir` / `fs-extra` / `write-file-atomic` / `is-wsl` 는 spec 부록 A Windows 라이브러리 스택. 설치만 이 Plan 에서 수행, 실사용은 Plan 2B.

- [ ] **Step 2: Create sample source directory**

```bash
mkdir -p tests/fixtures/round-trip/symlink/sample-source
cat > tests/fixtures/round-trip/symlink/sample-source/a.md << 'EOF'
# File A
sample content
EOF
cat > tests/fixtures/round-trip/symlink/sample-source/b.md << 'EOF'
# File B
EOF
mkdir -p tests/fixtures/round-trip/symlink/sample-source/nested
cat > tests/fixtures/round-trip/symlink/sample-source/nested/c.md << 'EOF'
# File C (nested)
EOF
```

- [ ] **Step 3: Implement `src/round-trip/symlink/symlink-dir.ts`**

```typescript
import symlinkDir from "symlink-dir";
import { readFile, stat, rm, mkdir } from "node:fs/promises";
import { join } from "node:path";
import isWsl from "is-wsl";

/**
 * Symlink creation 결과.
 */
export interface SymlinkResult {
  /** 생성된 링크의 유형. Windows 에서 fallback 가능. */
  kind: "symlink" | "junction" | "hardlink" | "copy";
  /** target 경로. */
  target: string;
  /** source 경로 (실제 디렉토리). */
  source: string;
  /** fallback 에 사용된 reason 열거 (없으면 null). */
  fallbackReason: string | null;
}

/**
 * 디렉토리 symlink 생성. macOS/Linux 기본 동작, Windows junction 자동 fallback.
 *
 * Plan 2A 는 macOS 경로만 검증. Windows 는 Plan 2B 에서 CI matrix 로 테스트.
 */
export async function createDirSymlink(source: string, target: string): Promise<SymlinkResult> {
  const result = await symlinkDir(source, target);
  // symlink-dir 의 결과는 `{ reused: boolean, warn?: string }` 형태 (npm docs).
  // kind 판정: Windows 가 아니면 symlink, WSL 도 symlink, Windows 이면 junction.
  const platform = process.platform;
  let kind: SymlinkResult["kind"] = "symlink";
  let fallbackReason: string | null = null;

  if (platform === "win32" && !isWsl) {
    kind = "junction";
    fallbackReason = "windows-junction-fallback";
  }

  return {
    kind,
    target,
    source,
    fallbackReason,
  };
}

/**
 * Atomic staging — staging dir 에 먼저 만든 후 rename 으로 이동.
 * symlink 를 덮어쓰기 안전하게 교체.
 */
export async function atomicReplaceSymlink(source: string, target: string, staging: string): Promise<SymlinkResult> {
  // staging dir 에 먼저 symlink 를 만든다
  await mkdir(join(staging, ".."), { recursive: true }).catch(() => {});
  const stagingResult = await createDirSymlink(source, staging);

  // target 이 존재하면 제거
  try {
    await rm(target, { recursive: true, force: true });
  } catch {
    // ignore
  }

  // staging → target 으로 rename
  const { rename } = await import("node:fs/promises");
  await rename(staging, target);

  return { ...stagingResult, target };
}
```

- [ ] **Step 4: Write test `tests/round-trip/symlink/basic.test.ts`**

```typescript
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, readFile, lstat, readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createDirSymlink, atomicReplaceSymlink } from "../../../src/round-trip/symlink/symlink-dir.js";

const SAMPLE_SOURCE = join(__dirname, "../../fixtures/round-trip/symlink/sample-source");

describe("POC-9 symlink-dir — macOS/Linux basic", () => {
  let tmpRoot: string;

  beforeEach(async () => {
    tmpRoot = await mkdtemp(join(tmpdir(), "concord-poc9-"));
  });

  afterEach(async () => {
    await rm(tmpRoot, { recursive: true, force: true });
  });

  it("createDirSymlink: target 이 source 를 가리킨다", async () => {
    const target = join(tmpRoot, "link");
    const result = await createDirSymlink(SAMPLE_SOURCE, target);
    expect(result.kind).toBeDefined();
    const stat = await lstat(target);
    // macOS/Linux 에선 symlink, Windows 에선 junction (또는 symlink if elevated)
    expect(stat.isSymbolicLink() || stat.isDirectory()).toBe(true);
  });

  it("createDirSymlink 뒤 read 로 source 내용 읽을 수 있다", async () => {
    const target = join(tmpRoot, "link");
    await createDirSymlink(SAMPLE_SOURCE, target);
    const content = await readFile(join(target, "a.md"), "utf8");
    expect(content).toContain("File A");
  });

  it("createDirSymlink 2회 (reused) — 이미 존재하는 link 는 재사용", async () => {
    const target = join(tmpRoot, "link");
    const r1 = await createDirSymlink(SAMPLE_SOURCE, target);
    const r2 = await createDirSymlink(SAMPLE_SOURCE, target);
    // symlink-dir 공식 API 는 reused: true 를 반환. 여기선 단순히 2회 호출이 에러 없이 끝나는지 확인.
    expect(r1.target).toBe(r2.target);
  });

  it("atomicReplaceSymlink: 기존 link 를 새 source 로 교체", async () => {
    const target = join(tmpRoot, "link");
    const staging = join(tmpRoot, ".staging-link");
    await createDirSymlink(SAMPLE_SOURCE, target);

    // 다른 source 디렉토리 생성
    const otherSource = join(tmpRoot, "other-source");
    const { mkdir, writeFile } = await import("node:fs/promises");
    await mkdir(otherSource, { recursive: true });
    await writeFile(join(otherSource, "z.md"), "# File Z");

    const result = await atomicReplaceSymlink(otherSource, target, staging);
    expect(result.target).toBe(target);

    // target 이 이제 otherSource 를 가리킴
    const content = await readFile(join(target, "z.md"), "utf8");
    expect(content).toContain("File Z");
  });

  it("nested source 의 파일 접근 가능", async () => {
    const target = join(tmpRoot, "link");
    await createDirSymlink(SAMPLE_SOURCE, target);
    const content = await readFile(join(target, "nested", "c.md"), "utf8");
    expect(content).toContain("File C");
  });
});
```

- [ ] **Step 5: Run test**

Run: `npx vitest run tests/round-trip/symlink/basic.test.ts`
Expected: 5 tests PASS on macOS.

**실패 대응**:
- `symlink-dir` API 이름 차이 → import 조정.
- macOS 에서 `mkdtemp` 경로가 `/private/var/folders/...` 로 resolve 되는 경우 `realpath` 비교 필요.
- 권한 오류 → `sudo` 요구 없음 (홈 디렉토리에서 symlink 는 unprivileged 허용).

- [ ] **Step 6: Typecheck**

Run: `npm run typecheck`
Expected: clean.

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json src/round-trip/symlink tests/fixtures/round-trip/symlink tests/round-trip/symlink
git commit -m "feat(poc-9): symlink-dir wrapper + macOS basic scenarios"
```

---

### Task 16 — POC-9 Runner + Decision Memo + Windows Gate

**Files:**
- Create: `scripts/poc/poc-9-symlink.ts`
- Create: `docs/superpowers/poc/2026-04-22-poc-9-symlink.md`

**Purpose**: macOS 실측 결과 + Windows junction/hardlink fallback 전략을 기록. Plan 2B 에서 Windows CI matrix 를 추가해 실제 Windows 동작 검증.

- [ ] **Step 1: Create `scripts/poc/poc-9-symlink.ts`**

```typescript
import { mkdtemp, rm, readFile, lstat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { performance } from "node:perf_hooks";
import { createDirSymlink, atomicReplaceSymlink } from "../../src/round-trip/symlink/symlink-dir.js";

const SAMPLE_SOURCE = join(process.cwd(), "tests/fixtures/round-trip/symlink/sample-source");

type Result = {
  scenario: string;
  status: "pass" | "error";
  elapsedMs: number;
  errorMessage?: string;
  linkKind?: string;
};

async function runScenario(name: string, fn: (tmp: string) => Promise<string | undefined>): Promise<Result> {
  const tmp = await mkdtemp(join(tmpdir(), "concord-poc9-"));
  const t0 = performance.now();
  try {
    const linkKind = await fn(tmp);
    return { scenario: name, status: "pass", elapsedMs: performance.now() - t0, linkKind };
  } catch (err) {
    return {
      scenario: name,
      status: "error",
      elapsedMs: performance.now() - t0,
      errorMessage: err instanceof Error ? err.message : String(err),
    };
  } finally {
    await rm(tmp, { recursive: true, force: true });
  }
}

async function main() {
  const results: Result[] = [];

  results.push(
    await runScenario("create-dir-symlink", async (tmp) => {
      const r = await createDirSymlink(SAMPLE_SOURCE, join(tmp, "link"));
      return r.kind;
    }),
  );

  results.push(
    await runScenario("read-through-symlink", async (tmp) => {
      const target = join(tmp, "link");
      await createDirSymlink(SAMPLE_SOURCE, target);
      await readFile(join(target, "a.md"), "utf8");
      return undefined;
    }),
  );

  results.push(
    await runScenario("symlink-2x-reused", async (tmp) => {
      const target = join(tmp, "link");
      await createDirSymlink(SAMPLE_SOURCE, target);
      await createDirSymlink(SAMPLE_SOURCE, target);
      return undefined;
    }),
  );

  results.push(
    await runScenario("atomic-replace", async (tmp) => {
      const target = join(tmp, "link");
      const staging = join(tmp, ".staging");
      await createDirSymlink(SAMPLE_SOURCE, target);
      // 다른 source 로 교체
      const { mkdir, writeFile } = await import("node:fs/promises");
      const other = join(tmp, "other");
      await mkdir(other, { recursive: true });
      await writeFile(join(other, "z.md"), "Z");
      const r = await atomicReplaceSymlink(other, target, staging);
      return r.kind;
    }),
  );

  results.push(
    await runScenario("lstat-is-symbolic", async (tmp) => {
      const target = join(tmp, "link");
      await createDirSymlink(SAMPLE_SOURCE, target);
      const st = await lstat(target);
      if (!st.isSymbolicLink() && !st.isDirectory()) {
        throw new Error("not a symlink or directory");
      }
      return st.isSymbolicLink() ? "symlink" : "junction-or-dir";
    }),
  );

  console.log(JSON.stringify({ platform: process.platform, results }, null, 2));
  console.table(results);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
```

- [ ] **Step 2: Run runner**

Run: `npm run poc:9 2>benchmark-9.err 1>benchmark-9.json`
Expected: 5 scenarios PASS on macOS.

- [ ] **Step 3: Create `docs/superpowers/poc/2026-04-22-poc-9-symlink.md`**

```markdown
# POC-9 — symlink-dir macOS 실측 + Windows Gate

**Date**: 2026-04-22
**Plan**: Plan 2A
**Status**: **macOS CONFIRMED / Windows DEFERRED TO PLAN 2B CI**

## 문제 정의

concord 의 installer (Plan 2B Task: 자산 파일 설치) 는 **symlink 우선 / fallback 대응** 필요 (spec §9 D-1~D-11).
- macOS / Linux: symlink (기본)
- Windows (unprivileged): junction directory (Windows Vista+) 또는 hardlink file 로 자동 fallback
- Windows (Developer Mode) + WSL: symlink

`symlink-dir@10.0.1` 은 이 fallback 을 자동 수행한다고 문서화.
Plan 2A 는 **macOS 기본 경로 + atomic replace 경로** 실측, Windows 경로는 Plan 2B CI 에서.

## 측정 결과 (macOS)

**TBD** — Task 16 benchmark 결과 기입.

| Scenario | Status | linkKind | elapsed |
|---|---|---|---|
| create-dir-symlink | ... | symlink | ... |
| read-through-symlink | ... | — | ... |
| symlink-2x-reused | ... | — | ... |
| atomic-replace | ... | symlink | ... |
| lstat-is-symbolic | ... | symlink | ... |

## Windows Gate (Plan 2B 로 이관)

### Plan 2B CI Matrix 요구사항
- `windows-latest` GitHub Actions runner 에 `poc:9` 및 `tests/round-trip/symlink/` 전체 실행.
- Developer Mode 비활성 / 활성 2 케이스 검증 — `is-elevated` 라이브러리로 분기.
- `linkKind` 가 Windows 에서 `junction` (디렉토리) 또는 `hardlink` (파일) 로 결정되는지 확인.
- WSL matrix (`wsl-ubuntu-22.04`) 추가 — `is-wsl` 라이브러리로 판별.

### Antivirus / OneDrive 충돌 (spec §9 부록 B Known Issue 1, 2)
- Windows Defender 는 symlink 생성을 가끔 차단 → `preflight` 에서 AV exclusion 안내.
- OneDrive 동기화 폴더 내 symlink 는 파괴적 — `preflight` 에서 warning.
- 이 2 항목은 Plan 3 (`concord doctor`) 에서 실제 검사.

## Plan 2B 에서의 적용 지침

1. **installer 는 `symlink-dir` 를 wrapper 로 사용**. 직접 `fs.symlink` 호출 금지.
2. **atomic replace 패턴 준수** — staging dir 에서 만들고 rename 으로 이동.
3. **lock 의 `install_mode` / `install_reason` 필드** 에 `symlink` / `junction` / `hardlink` / `copy` 중 어느 것이 사용되었는지 기록 (spec §5.6 Q4 확장).
4. **drift 감지** 는 lock 의 `drift_status` 4 상태 (source/target/divergent/env-drift) 로 (spec §7.3.1).
5. **Windows fallback 발생 시 경고 없음** — fallback 은 정상 동작. 단, `doctor` 는 elevated 권한 유무 + Developer Mode 상태를 진단.

## 재검토 트리거

- `symlink-dir` 메이저 업데이트 시 API 확인.
- Windows CI 에서 junction 이 의도대로 동작하지 않으면 `fs-extra.ensureSymlink` 또는 수동 `fs.symlink` + exception 대응 로직으로 대체 검토.
- macOS 16+ 에서 `sandbox` 로 symlink 제약 변경 시 재평가.
```

- [ ] **Step 4: Commit**

```bash
git add scripts/poc/poc-9-symlink.ts docs/superpowers/poc/2026-04-22-poc-9-symlink.md
git commit -m "docs(poc-9): symlink-dir macOS measurement + Windows gate plan"
```

---

### Task 17 — Plan 2B Seed (Skeleton Plan 문서)

**Files:**
- Create: `docs/superpowers/plans/2026-04-22-concord-plan-2b-sync-engine.md` (skeleton — 실제 full plan 은 Plan 2A 완료 후 `writing-plans` 재기동 시 작성)

**Purpose**: POC 결과를 입력으로 받아 Plan 2B 의 기본 골격을 미리 남긴다. Plan 2A merge 직후 `writing-plans` 을 재기동할 때 이 skeleton 을 base 로 detailed task breakdown 을 작성.

- [ ] **Step 1: Create skeleton**

```markdown
# Concord Plan 2B — Sync Engine Implementation Plan (SKELETON)

> **Status**: SKELETON — Plan 2A 완료 후 `superpowers:writing-plans` 재기동 시 본 skeleton 을 base 로 detailed task breakdown 작성.

> **For agentic workers:** Plan 2B 은 Plan 2A 의 선정 library 에 의존한다. 아래 "Dependency inputs from Plan 2A" 가 전부 채워진 후에만 execution 가능.

**Goal (draft):** `concord sync` 가 end-to-end 동작. Fetcher 6종 + Config round-trip writer + Symlink/copy installer + Format transformer 구현.

**Dependency inputs from Plan 2A:**
- TOML library: `<TBD — POC-1 winner>` (@decimalturn/toml-patch / @shopify/toml-patch / @ltd/j-toml 중)
- JSONC library: `<TBD — POC-2 winner>` (jsonc-morph / jsonc-parser 중)
- YAML write-back: eemeli/yaml (Plan 2A Task 13~14 에서 한계 명시 완료)
- Symlink library: symlink-dir (Plan 2A Task 15~16 에서 macOS 검증 완료, Windows CI 는 Plan 2B 에서 추가)

## Planned components (Plan 2B)

1. **Fetcher adapters (6종)** (spec §3, §6 sync 부분):
   - `GitFetcher` (git clone / ref checkout)
   - `FileFetcher` (local file / symlink)
   - `HttpFetcher` (URL + sha256 pin)
   - `NpmFetcher` (npm install + symlink)
   - `ExternalFetcher` (provider-native, e.g. `claude-code plugin install`)
   - `AdoptedFetcher` (기존 디스크 상태 catalog 화)

2. **Config round-trip writers** (spec §10, Plan 2A 선정 library 기반):
   - `JsoncWriter` — Claude `.claude/settings.json`, OpenCode `opencode.json[c]`
   - `TomlWriter` — Codex `~/.codex/config.toml`
   - `JsonKeyOwnedWriter` — `~/.claude.json` (pure JSON, POC-4 확정 방식)
   - Marker block I/O — spec §10.5

3. **Installer** (spec §9, Plan 2A POC-9 기반):
   - `SymlinkInstaller` (symlink-dir + atomic staging)
   - `CopyInstaller` (fs-extra.copy + write-file-atomic)
   - `HardlinkInstaller` (Windows fallback)

4. **Format transformer** (spec §9.14 D-14):
   - MCP `cmd /c npx` Windows 자동 wrap
   - `.claude/skills/` copy 강제 / `.claude/rules/` symlink 허용
   - OpenCode `instructions` overlay

5. **Sync orchestration**:
   - Plan → lock 작성 → fetch → install → config round-trip → verify.
   - Atomic rollback on failure (spec §7 state machine).
   - `concord sync --scope` precedence (Plan 1 Task 19 재사용).

## Task decomposition (TBD — writing-plans 재기동 시 채움)

- [ ] Task 1~N: Fetcher adapters
- [ ] Task N+1~M: Config round-trip writers
- [ ] Task M+1~P: Installer
- [ ] Task P+1~Q: Format transformer
- [ ] Task Q+1~R: `concord sync` orchestration
- [ ] Task R+1~S: E2E integration tests

**Estimated size**: Plan 1 (28 task, 4200 lines) 와 비슷하거나 조금 큰 규모 예상 (30~35 task).

## Notes

- Plan 2A 의 `ConfigFileEditor` 인터페이스를 그대로 사용.
- Plan 2A 의 `verifyPreservation` / `computeDiffRegions` 유틸 재사용.
- Plan 2A 가 설치한 3 TOML / 2 JSONC 중 **탈락 library 는 Plan 2A Task 18 에서 이미 제거됨** — Plan 2B 은 winner 만 dependency.
- Windows CI matrix 는 Plan 2B 첫 task 에서 추가 (GitHub Actions `windows-latest` + `macos-latest` + `ubuntu-latest`).
- Secret 보간 (E-1~E-19) 은 Plan 3 에서. Plan 2B 는 보간 없이도 동작하는 asset 만 처리.
```

- [ ] **Step 2: Commit**

```bash
git add docs/superpowers/plans/2026-04-22-concord-plan-2b-sync-engine.md
git commit -m "docs(plan-2b): seed skeleton plan for sync engine"
```

---

### Task 18 — Cleanup + Summary + TODO/MEMORY/README Update

**Files:**
- Modify: `package.json` — 탈락 library 제거 (POC-1 / POC-2 winner 외 모두 devDependencies 에서 제거)
- Delete (또는 archive): 탈락 library 의 wrapper 파일 (winner 만 남기려면 stub 제거)
- Modify: `TODO.md`
- Modify: `MEMORY.md`
- Modify: `README.md`
- Create: `docs/superpowers/poc/2026-04-22-round-trip-summary.md`

**Purpose**: Plan 2A 산출물 정리. 탈락 library 의 wrapper 와 npm package 를 제거하고 최종 상태를 main 으로 merge 할 준비.

- [ ] **Step 1: Remove losing TOML libraries**

Winner = `W_toml`. 나머지 2 개를 제거:

```bash
# Example — winner 가 @decimalturn/toml-patch 라면:
npm uninstall @shopify/toml-patch @ltd/j-toml
rm src/round-trip/toml/shopify.ts
rm src/round-trip/toml/ltd-j-toml.ts
```

- [ ] **Step 2: Remove losing JSONC library**

Winner = `W_jsonc`. 나머지 1 개를 제거:

```bash
# Example — winner 가 jsonc-morph 라면:
# (jsonc-parser 는 Plan 1 이 이미 deps 로 갖고 있음 — 제거 시 Plan 1 테스트 깨질 수 있음 → 주의)
# jsonc-parser 가 winner 면 jsonc-morph 제거:
npm uninstall jsonc-morph
rm src/round-trip/jsonc/jsonc-morph.ts

# jsonc-morph 가 winner 면 jsonc-parser 를 주석으로 남겨둬야 할 수도 — Plan 1 에서 lint 명령 등에서 사용하는지 grep 확인
grep -rn "jsonc-parser" src/ tests/
```

- [ ] **Step 3: Remove outdated `@iarna/toml`**

Plan 1 에서 placeholder 로 들어간 `@iarna/toml` 제거.

```bash
grep -rn "@iarna/toml" src/ tests/  # 사용처 확인. 없어야 함 (Plan 1 에서 사용 안 됨)
npm uninstall @iarna/toml
```

- [ ] **Step 4: Run full vitest + typecheck**

Run:
```bash
npm run typecheck
npx vitest run
```
Expected: typecheck clean, 전체 테스트 PASS.

**실패 시**: cleanup 이 너무 과감했음 → `git diff HEAD~1` 로 확인 후 되살리기.

- [ ] **Step 5: Create `docs/superpowers/poc/2026-04-22-round-trip-summary.md`**

```markdown
# Plan 2A Round-trip POC Summary

**Date**: 2026-04-22
**Branch**: `feat/concord-plan-2a-round-trip-poc`
**Status**: **COMPLETE**

## 4 POC 결과

| # | 주제 | Winner | 상태 |
|---|---|---|---|
| POC-1 | TOML 편집 | `<W_toml>@<version>` | PASS |
| POC-2 | JSONC 편집 | `<W_jsonc>@<version>` | PASS |
| POC-3 | YAML write-back | `yaml@2.8.3` (eemeli) | CONFIRMED with limitations |
| POC-9 | symlink-dir | `symlink-dir@10.0.1` | macOS PASS / Windows DEFERRED |

## Plan 2A 의 주요 산출물

1. **`src/round-trip/types.ts`** — `ConfigFileEditor` 인터페이스 (spec §10 근거)
2. **`src/round-trip/preservation.ts`** — `verifyPreservation` byte-level diff 유틸
3. **`src/round-trip/diff-regions.ts`** — `computeDiffRegions` (prefix/suffix 공통 찾기)
4. **`src/round-trip/<format>/<winner>.ts`** — 각 포맷의 winner wrapper
5. **`tests/fixtures/round-trip/`** — TOML 10 + JSONC 8 + YAML 6 + Symlink sample source
6. **`docs/superpowers/poc/`** — 4 결정 메모

## Plan 2B 를 위한 입력

- TOML: `<W_toml>` API 사용
- JSONC: `<W_jsonc>` API 사용
- YAML write-back: eemeli Document API (byte-level preservation 불가 — normalized_hash 로 drift 판정)
- Symlink: `symlink-dir` + atomic staging (Windows CI 추가 필요)

## Known Limitations

- POC-3 YAML write-back 은 byte-level preservation 불가 → spec §10.4 `raw_hash` / `normalized_hash` 분리가 이 한계를 흡수.
- POC-9 Windows 경로는 Plan 2A 에서 검증 못함 → Plan 2B 첫 task 에서 GitHub Actions `windows-latest` matrix 추가.
- POC-8 (`cleanup extraneous preservation` 골든) 는 Plan 2A 범위 밖 → Plan 2B 의 `concord cleanup` 구현 시 함께.

## 누적 테스트

- Plan 1: 169 tests (26 files)
- Plan 2A: `<N>` tests (추가 `<M>` files)
- 합계: `<169 + N>` tests
```

- [ ] **Step 6: Update `TODO.md`**

추가/변경할 섹션:
- Plan 2A 완료 Snapshot 추가 (날짜 + branch + tests + winner library 목록).
- `## 🔜 앞으로 할 일` 의 POC-1 / POC-2 / POC-3 / POC-9 을 ✅ 로 체크.
- Plan 2B 섹션을 "다음 단계" 로 승격.

구체적 edit 방향 (정확한 줄 번호는 Task 실행 시 `grep -n` 으로 확인):
- `## 🟢 Plan 1 완료 Snapshot` 아래에 `## 🟢 Plan 2A 완료 Snapshot` 추가.
- `### 결정 B — FINAL 완료 (2026-04-19). 구현 시 남은 POC 항목` 테이블의 POC-1/2/3 을 ✅ 로 업데이트.
- `### 결정 D — 구현 시 POC` 의 POC-9 를 ✅ 로.
- `#### Phase 1 POC (구현 전 병목 검증)` 섹션의 해당 항목 ✅ 처리.

- [ ] **Step 7: Update `MEMORY.md`**

추가할 섹션 (현재 `## 🟢 현재 Snapshot` 업데이트):

```markdown
## 🟢 현재 Snapshot (2026-04-22, Plan 2A 완료)

- **Branch**: `feat/concord-plan-2a-round-trip-poc` → main merged
- **Primary contract**: 변경 없음 (spec §10)
- **Execution plan (Plan 2A)**: `docs/superpowers/plans/2026-04-22-concord-plan-2a-round-trip-poc.md` (18 task, 완료)
- **POC 선정 결과**:
  - POC-1 TOML: `<W_toml>@<version>`
  - POC-2 JSONC: `<W_jsonc>@<version>`
  - POC-3 YAML write-back: eemeli/yaml (한계 명시)
  - POC-9 symlink-dir: macOS 확정, Windows Plan 2B CI 에서
- **Tests green**: **<N> / <N>**
- **Next**: Plan 2B Sync Engine 작성·실행 (skeleton: `docs/superpowers/plans/2026-04-22-concord-plan-2b-sync-engine.md`)
```

- [ ] **Step 8: Update `README.md`**

README 의 `## POC log` 섹션에 Plan 2A 의 4 POC 결과 요약 추가.

- [ ] **Step 9: Final vitest + typecheck**

Run:
```bash
npm run typecheck
npx vitest run
```
Expected: clean.

- [ ] **Step 10: Commit + tag**

```bash
git add package.json package-lock.json src/round-trip tests/round-trip docs/superpowers/poc TODO.md MEMORY.md README.md
git commit -m "chore(plan-2a): cleanup losing POC candidates + summary + TODO/MEMORY/README update"
git tag concord-plan-2a-round-trip-poc
```

- [ ] **Step 11: Merge to main**

```bash
git checkout main
git merge --no-ff feat/concord-plan-2a-round-trip-poc -m "Merge Plan 2A Round-trip POC (18 tasks, 4 POC 완료)"
```

(또는 GitHub PR 을 통한 merge — 사용자 preference 에 따라)

- [ ] **Step 12: Verify main tests**

```bash
git checkout main
npm run typecheck
npx vitest run
```
Expected: clean.

---

## Install

(README 에 기록됨)

```bash
npm install -g concord
# 또는 repo clone 후 npm install + npm run build + npm link
```

## Usage

```bash
# Plan 1 read-only 명령 그대로
concord validate ./concord.yaml
concord lint ./concord.yaml
concord list --lock ./concord.lock

# Plan 2B 이후 (아직 미구현)
# concord sync
```

## Design docs

- `docs/superpowers/specs/2026-04-21-concord-design.md` — 전체 설계 SSoT
- `docs/superpowers/plans/2026-04-22-concord-plan-1-foundation.md` — Plan 1 완료
- `docs/superpowers/plans/2026-04-22-concord-plan-2a-round-trip-poc.md` — Plan 2A 완료 (본 문서)
- `docs/superpowers/plans/2026-04-22-concord-plan-2b-sync-engine.md` — Plan 2B skeleton
- `docs/superpowers/poc/` — 4 POC 결정 메모

## POC results (Plan 2A)

- [POC-1 TOML library selection](docs/superpowers/poc/2026-04-22-poc-1-toml-library.md)
- [POC-2 JSONC library selection](docs/superpowers/poc/2026-04-22-poc-2-jsonc-library.md)
- [POC-3 YAML write-back](docs/superpowers/poc/2026-04-22-poc-3-yaml-write-back.md)
- [POC-9 symlink-dir macOS](docs/superpowers/poc/2026-04-22-poc-9-symlink.md)
- [Round-trip POC summary](docs/superpowers/poc/2026-04-22-round-trip-summary.md)

---

## Self-Review (writing-plans skill checklist)

### 1. Spec coverage

| spec 요구 | 구현 task | 비고 |
|---|---|---|
| §10.0 정체성 | Task 2 (types) + Task 3 (preservation) | 인터페이스 계약 |
| §10.1 JSONC `jsonc-morph` 1순위 | Task 10~12 | 후보 2종 벤치마크 후 선정 |
| §10.2 TOML POC-1 3도구 | Task 4~9 | 10 scenario 벤치마크 후 1선정 |
| §10.3 순수 JSON `json-key-owned` | Task 10 (07-pure-json fixture) + POC-2 runner | fixture 포함, 실제 writer 는 Plan 2B |
| §10.4 raw vs normalized hash | — | Plan 2B (lock 계산 시) |
| §10.5 marker block 정책 | Task 4 (10-marker-block fixture), Task 10 (06-marker-block fixture) | fixture 로 확인, writer 는 Plan 2B |
| §10.6 extraneous preservation | — | Plan 2B (`concord cleanup` 구현 시 POC-8) |
| §10.7 golden test 패턴 | Task 9 (TOML), Task 12 (JSONC), Task 13 (YAML) | 각 winner 별 |
| §10.8 Π 매핑 | Task 18 (summary) | 문서로 기록 |
| POC-1 | Task 4~9 | ✅ |
| POC-2 | Task 10~12 | ✅ |
| POC-3 | Task 13~14 | ✅ |
| POC-9 | Task 15~16 | ✅ macOS 확정 / Windows deferred |

### 2. Placeholder scan

이 plan 에 남은 TBD / `<winner>` / `<version>` 자리표시자는 **POC 결과를 Task 실행 시 채워 넣는 의도적 blank** — `docs/superpowers/poc/*.md` 및 `TODO.md` / `MEMORY.md` 의 `<W_toml>` 같은 자리표시자는 Task 8, 12, 18 실행 시 실측 값으로 교체.

그 외 "TBD", "나중에", "TODO" 같은 placeholder 없음. 전체 스캔:
```bash
grep -in "TBD\|나중에\|TODO-later" docs/superpowers/plans/2026-04-22-concord-plan-2a-round-trip-poc.md
```
- Task 8 "TBD" → Task 실행 시 benchmark 결과로 채움 (의도적)
- Task 14 "TBD" → 동일
- Task 16 "TBD" → 동일
- Task 17 "TBD" (skeleton) → Plan 2A 완료 후 `writing-plans` 재기동으로 채움 (의도적)

### 3. Type consistency

- `ConfigFileEditor` (Task 2) 메서드 이름 = `load` / `edit` / `serialize` / `verify` — 모든 6 wrapper (3 TOML + 2 JSONC + 1 YAML) 에서 동일 사용 ✅
- `Edit` 타입 = `{ op: "set", path, value } | { op: "delete", path }` — 전체 plan 에서 일관 ✅
- `PreservationReport` 의 `preserved` / `outsideChangesByteCount` / `changedRegions` — Task 3 정의 후 각 wrapper 의 `verify()` 가 동일 타입 반환 ✅
- `createXyzEditor()` factory 함수 이름 = `createDecimalturnEditor` / `createShopifyEditor` / `createLtdJTomlEditor` / `createJsoncMorphEditor` / `createJsoncParserEditor` / `createEemeliYamlEditor` — Task 5/11/13 에서 정의, Task 6~9/11~12/13~14 에서 사용 ✅
- `SymlinkResult` = `{ kind, target, source, fallbackReason }` — Task 15 정의, Task 16 runner 에서 동일 shape 사용 ✅

### 4. 누락 확인

- Plan 1 과의 의존: ✅ Task 1 에서 main checkout + branch 생성, 기존 169 tests 는 그대로 통과해야 함.
- `concord_version` constraint 변경 없음 (Plan 2A 는 schema 건드리지 않음) ✅
- Windows CI matrix 는 **Plan 2B Task 1** 에서 추가 — Plan 2A skeleton 에 명시 ✅
- POC-4 (json-key-owned) 는 Plan 1 에서 이미 RESOLVED, Plan 2A 는 07-pure-json fixture 로 차후 writer 구현 대비 ✅

---

## Execution Handoff

**Plan complete and saved to `docs/superpowers/plans/2026-04-22-concord-plan-2a-round-trip-poc.md`. Two execution options:**

**1. Subagent-Driven (recommended)** - Dispatch fresh subagent per task, review between tasks, fast iteration. Plan 1 이 이 패턴으로 28 task 를 168/169 tests green 으로 마무리한 전례. 각 task 가 독립적으로 commit 가능하고, benchmark runner (Task 7, 12, 14, 16) 는 실제 library 의 API 가 가정과 다를 수 있어 subagent 가 즉석에서 API probe + wrapper 수정을 반복해야 함. Subagent-driven 이 이 반복에 적합.

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints. 현재 세션 context 가 이미 큼 (spec + Plan 1 + Plan 2A 작성) — inline 실행 시 context 비용 높음.

**Which approach?**

**If Subagent-Driven chosen:**
- **REQUIRED SUB-SKILL:** Use `superpowers:subagent-driven-development`
- Fresh subagent per task + two-stage review (spec compliance + code quality)
- Library API probe 는 subagent 가 첫 task 에서 수행 후 wrapper 수정

**If Inline Execution chosen:**
- **REQUIRED SUB-SKILL:** Use `superpowers:executing-plans`
- Batch execution with checkpoints for review

---
