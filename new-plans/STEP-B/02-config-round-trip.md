# B-2 — Config Round-trip 편집 아키텍처 🔴

**이 문서가 결정 B의 핵심**. concord의 기술적 성공/실패를 결정한다.

---

## 문제 재정의

concord가 편집해야 하는 네이티브 config 파일:

| Provider | 파일 | 포맷 | 편집 대상 키 |
|---|---|---|---|
| Claude Code (project) | `.claude/settings.json` | JSONC | `hooks`, `permissions`, ... |
| Claude Code (project, MCP) | `.mcp.json` | JSON | `mcpServers.*` |
| Claude Code (user) | `~/.claude.json` | JSON(C?) | `mcpServers.*` |
| Codex | `.codex/config.toml`, `~/.codex/config.toml` | TOML | `[mcp_servers.*]`, `[features]`, `[[skills.config]]` |
| Codex | `.codex/hooks.json`, `~/.codex/hooks.json` | JSON | hooks array |
| OpenCode | `opencode.json[c]` | JSONC | `mcp`, `plugin`, `instructions`, `lsp`, `permission` |

---

## 아키텍처 — `ConfigFileEditor` 인터페이스

```ts
interface ConfigFileEditor {
  /** 파일 읽어 in-memory AST (또는 marker-block 추출) 유지 */
  load(path: string): Promise<ConfigDocument>;

  /** 특정 JSON Pointer / TOML path 에 값 설정. marker 블록은 별도 API */
  setPath(doc: ConfigDocument, path: string, value: unknown): void;
  deletePath(doc: ConfigDocument, path: string): void;

  /** concord-managed marker 블록 전체 교체 (JSON 객체 일부 또는 TOML 섹션) */
  replaceManagedBlock(doc: ConfigDocument, markerId: string, newContent: string): void;

  /** 임시 파일에 직렬화. 원본과 diff 가능하도록 sourcemap 유지 */
  serialize(doc: ConfigDocument): string;

  /** 직렬화 결과의 bit-perfect 보존 검증 — 변경 없는 영역이 정확히 일치해야 함 */
  verifyPreservation(original: string, modified: string, changedPaths: string[]): PreservationReport;
}
```

Provider별 3개의 구현체:
- `JsoncEditor` (jsonc-parser 기반) — `.json`, `.jsonc`
- `TomlEditor` (@ltd/j-toml 기반) — `.toml`
- `MarkerBlockEditor` (파일 포맷 무관, 위 둘의 fallback)

---

## JSON / JSONC — `jsonc-parser` 상세

`jsonc-parser` ([npm](https://www.npmjs.com/package/jsonc-parser), Microsoft VSCode 사용) 는 세 가지 핵심 API 제공:

```ts
import * as jsonc from 'jsonc-parser';

// 1. AST 파싱 (comment/trailing comma tolerant)
const tree = jsonc.parseTree(source, errors);

// 2. 편집 계산 — 실제 소스에 적용할 Edit[] 생성
const edits = jsonc.modify(source, ['mcpServers', 'airtable'], newValue, {
  formattingOptions: { insertSpaces: true, tabSize: 2, eol: '\n' },
  isArrayInsertion: false,
});

// 3. 편집 적용 — 범위 외 내용 완전 보존
const modified = jsonc.applyEdits(source, edits);
```

**핵심 보장**:
- 주석 (`//`, `/* */`) 전부 보존 ✅
- trailing comma 보존 ✅
- 변경 범위 외 whitespace/indent 불변 ✅
- JSON Pointer 경로 접근 ✅

**한계**:
- `applyEdits` 는 `modify` 결과에만 쓸 수 있음. 임의 텍스트 삽입은 불가 (설계 의도)
- 대용량 파일 성능은 Microsoft VSCode 스케일에서 검증됨 — 문제 없음

---

## TOML — `@ltd/j-toml` 상세

`@ltd/j-toml` ([npm](https://www.npmjs.com/package/@ltd/j-toml)) 은 현재 npm 생태계에서 **comment 보존을 명시적으로 지원**하는 거의 유일한 선택지 (2026-04 기준).

```ts
import TOML from '@ltd/j-toml';

// 파싱 시 literal 옵션으로 원본 스타일 보존
const table = TOML.parse(source, {
  joiner: '\n',
  bigint: false,
  xOptions: { literal: true },
});

// 편집은 in-place 가능 — comment는 심볼 키로 보존됨
table.mcp_servers = table.mcp_servers ?? {};
table.mcp_servers.airtable = { command: 'npx', args: ['-y', 'airtable-mcp-server'] };

// 직렬화 — writing style 최대 보존
const output = TOML.stringify(table, { newline: '\n', newlineAround: 'section' });
```

**주의**:
- `@ltd/j-toml` 도 **모든 순서·formatting을 완벽 보존하지는 않음**. 문서 명시: "writing preferences will be preserved **as much as possible**"
- 특히 array-of-tables 순서, inline table vs 표준 table 선택은 변경될 수 있음
- → 따라서 **marker-block 전체 교체** 전략을 **TOML의 기본 전략**으로 채택 권고

---

## Marker-block 전체 교체 전략 (TOML 기본, JSONC fallback)

### 아이디어

사용자의 config 파일 어디든 다음 블록을 삽입하고, concord는 **이 블록 내부만** 편집한다. 바깥은 절대 건드리지 않는다.

**TOML**:
```toml
# BEGIN concord-managed: mcp
[mcp_servers.airtable]
command = "npx"
args = ["-y", "airtable-mcp-server"]
# END concord-managed: mcp
```

**JSONC**:
```jsonc
{
  "mcpServers": {
    // BEGIN concord-managed: mcp
    "airtable": { "command": "npx", "args": ["-y", "airtable-mcp-server"] }
    // END concord-managed: mcp
  }
}
```

### 장점
- 파서가 주석 보존 못 해도 안전 — 파일 나머지 영역은 문자열 치환으로 보호
- 사용자 편집 영역과 concord 영역이 **시각적으로 구분**
- drift 감지 쉬움 — 블록 내용의 hash만 비교하면 됨

### 단점
- JSON 표준은 주석을 허용하지 않음 → JSONC/JSON5가 아닌 순수 JSON 파일(`~/.claude.json` 등)은 marker 주석 쓸 수 없음
- JSONC에서도 object 내부 중간에 marker를 넣기 애매함 (key-value 사이에 주석이 의미상 분리되지 않음)

### 해결
- **순수 JSON 파일**: marker 못 씀 → `jsonc-parser`의 `modify`+`applyEdits` 로 **key-level 편집**. concord는 `mcpServers['concord:...']` 처럼 **key prefix 네임스페이스** 로 영역 표시.
- **JSONC/TOML 파일**: marker 주석 + 문자열 치환 권고 (AST 파서 부담 줄임)
- **Hybrid**: 두 전략을 파일별로 선택 (concord 내부 옵션)

---

## 선택 알고리즘 (파일 → 전략)

```
if file.ext in {.json}:
    strategy = KEY_NAMESPACE  # prefix로 concord 영역 표시
    editor = JsoncEditor
elif file.ext in {.jsonc, .json5}:
    strategy = MARKER_BLOCK
    editor = JsoncEditor (for structural checks)
elif file.ext in {.toml}:
    strategy = MARKER_BLOCK
    editor = TomlEditor (for structural checks)
```

---

## 검증 계약 (`verifyPreservation`)

편집 결과의 **bit-perfect 보존**을 CI에서 강제:

```ts
verifyPreservation(original: string, modified: string, changedPaths: string[]): PreservationReport {
  // 1. 변경된 영역(changedPaths) 바깥의 byte-level diff 계산
  // 2. diff가 존재하면 실패 (타협 없음)
  // 3. 주석·trailing comma·whitespace를 모두 포함해 비교
}
```

CI 통과 기준: 모든 골든 테스트에서 `PreservationReport.outsideChangesByteCount === 0`.

---

## 결정 요약 (v2 — 리뷰 반영 완료)

| 항목 | 채택 |
|---|---|
| JSON/JSONC 편집기 | **1순위: `jsonc-morph`** (CST, 임의 주석 조작 1급). 2순위: `jsonc-parser` `modify+applyEdits` |
| TOML 편집기 | **POC 벤치마크로 결정**: `@shopify/toml-patch` / `@decimalturn/toml-patch` / `@ltd/j-toml` 3후보 중 golden test 통과율 최고를 선택 |
| 순수 JSON 파일 (`~/.claude.json`) | **marker/prefix 모두 사용 불가** → `concord.lock` 에 ownership 기록, 파일은 `jsonc-morph` 로 key 단위 편집만 (concord 소유 key는 lock 조회) |
| JSONC/TOML 파일의 concord 영역 표시 | **marker comment 블록** (`# BEGIN concord-managed: <id>` / `# END concord-managed: <id>`) + marker ID 에 content hash suffix 포함 (무결성 검증용) |
| 편집 원자성 | staging 디렉토리 + `rename(2)` + `.concord.bak` (Phase 1). Multi-file 2PC 는 Phase 2. |
| 검증 | `verifyPreservation` → byte-level diff 0 강제 + content hash 일치 + marker 무결성 |

## 폐기된 설계 (v1 → v2)

- ❌ **`concord:*` key prefix 전략** 폐기. 근거: (1) Claude Code MCP 로더가 prefix key 를 어떻게 처리하는지 공식 문서 근거 없음. (2) 사용자가 prefix 를 실수로 삭제·수정 시 복구 경로 없음. 대체: lock 기반 ownership 추적.
- ❌ **TOML 단일 도구 전략** (`@ltd/j-toml`) 폐기. 근거: "as much as possible" 보존이 top-level standard tables 만 안전 (Codex 리뷰 R1). 3도구 POC 후 결정.

---

## 열린 질문 (codex 리뷰용)

1. 순수 JSON 파일에서 `concord:*` key prefix 전략은 Claude Code가 허용하는가? (예: `mcpServers["concord:airtable"]` 같은 이름이 파싱 거부되지 않나?)
2. `@ltd/j-toml` 의 "preserved as much as possible" 한계는 실제로 얼마나 큰가 — 특히 multi-line array, array-of-tables, inline-vs-standard table 선택에서?
3. Marker-block 전체 교체 전략에서 marker 자체가 사용자에 의해 삭제·훼손된 경우 복구 정책은?
4. `~/.claude.json` 은 실제로 JSON인가 JSONC인가 — 공식 문서 불명확. 실행 파일에서 샘플 확인 필요.
5. Windows 개행 (CRLF) 처리 — `jsonc-parser`는 eol 옵션이 있지만 `@ltd/j-toml` 은?
