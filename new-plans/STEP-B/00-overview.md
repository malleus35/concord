# 결정 B — Sync 의미론 + Config Round-trip 편집

**작성일**: 2026-04-19
**상태**: **FINAL 확정** (codex + subagent 5라운드 리뷰 + 사용자 승인)
**선행**: 결정 A FINAL (Skills 배치) 확정 완료

**주의**: 본 문서의 "layer" 용어는 구버전. 최종 용어는 **"scope"** (`07-cli-and-bootstrap.md` 참조).

---

## 목적

`concord sync` 명령의 **동작 계약(contract)** 과, 그 구현의 **최대 기술 리스크**인 config 파일 round-trip 편집을 해결하는 아키텍처를 확정.

MEMORY.md·`08-codex-review.md`·`09-corrections-and-action-items.md` 공통 판정: **"config round-trip 편집의 안전성이 concord의 기술적 존망을 가른다."**

---

## 결정 B가 답해야 할 질문 5개

| # | 질문 | 소속 문서 |
|---|---|---|
| B-1 | `concord sync` 의 4상태(install/update/prune/skip)는 어떻게 정의되며, 상태 전이는 어떤 조건으로 결정되는가? | `01-sync-semantics.md` |
| B-2 | Native config 파일(settings.json, config.toml, opencode.json)을 **주석·순서·trailing comma 보존** 하면서 편집하는 방법은? | `02-config-round-trip.md` |
| B-3 | 사용자가 네이티브 경로를 직접 수정한 경우(drift) 어떻게 감지·보존·처리하는가? `concord.lock` 스키마는 어떻게? | `03-drift-and-lock.md` |
| B-4 | 실패 시 rollback, dry-run, atomic commit, partial sync는 어떤 계약으로 보장하는가? | `01-sync-semantics.md` (동일 문서) |
| B-5 | 위 모두를 **bit-perfect로 검증**하는 테스트 전략 — 골든 파일 테스트의 구체 패턴은? | `04-testing-strategy.md` |

공개 질문은 `05-open-questions.md` 에 codex·subagent 리뷰용으로 따로 정리.

---

## 최우선 기술 리스크 (재확인)

### 🔴 Config Round-trip 편집

네이티브 config 파일 편집 시 다음이 **절대 파괴되면 안 됨**:

| 요소 | 리스크 |
|---|---|
| 주석 (`//`, `#`) | 사용자 의도·경고·TODO 유실 → 신뢰 영구 손상 |
| 키/섹션 순서 | diff noise, 코드리뷰 부담, git blame 혼란 |
| trailing comma (JSONC) | 일부 파서는 strict JSON 해석 → 파일 깨짐 |
| Whitespace·indent 스타일 | 팀 컨벤션 위반, diff noise |
| TOML table 순서·array-of-tables | TOML 의미는 순서 영향 없지만 사람 가독성은 영향 |

**Naive 전략 금지**:
- `JSON.parse()` → 수정 → `JSON.stringify()` (주석 전부 유실)
- `TOML.parse()` → 수정 → `TOML.stringify()` (`@iarna/toml` 2.2.5에서 주석 유실 확정)
- sed/regex 기반 라인 교체 (구조 인식 못 함, 중첩·멀티라인에서 깨짐)

---

## 웹서치 + 리뷰 검증 도구 후보 (2026-04-19, v2)

### JSON / JSONC

| 도구 | 판단 | 근거 |
|---|---|---|
| [`jsonc-morph`](https://www.npmjs.com/package/jsonc-morph) (David Sherret / Deno) | **1순위** | CST 기반 in-place 편집, `ts-morph` 스타일. 임의 주석 삽입·재배치 1급 지원 |
| [`jsonc-parser`](https://www.npmjs.com/package/jsonc-parser) (Microsoft, VSCode) | 2순위 / fallback | `modify()`+`applyEdits()`. Value 변경엔 탁월하지만 임의 주석 조작 제한 |
| naive `JSON.parse/stringify` | **금지** | 주석·순서 전부 유실 |

### TOML (POC 벤치마크 후 최종 선택 — Phase 1 필수 작업)

| 도구 | 포지션 | 특징 |
|---|---|---|
| [`@shopify/toml-patch`](https://www.npmjs.com/package/@shopify/toml-patch) | 후보 A | Rust `toml_edit` crate wasm 래퍼. Rust 생태 "주석·포매팅 완전 보존" 표준. v0.3.0 (1년 전) |
| [`@decimalturn/toml-patch`](https://www.npmjs.com/package/@decimalturn/toml-patch) | 후보 B | `timhall/toml-patch` 포크. TOML v1.1 + 주석·포매팅 보존 명시. Pure JS (wasm 부담 없음). 최근 활성 |
| [`@ltd/j-toml`](https://www.npmjs.com/package/@ltd/j-toml) | 후보 C | "preserved as much as possible" (top-level standard tables만 안전 보장) |
| `@iarna/toml` | 탈락 | 6년 방치, comment 보존 안 됨 |
| `smol-toml` | 탈락 | 빠르지만 comment 보존 없음 |

**선택 알고리즘**: 각 후보를 concord의 golden test suite (marker-block 교체, multi-line array, array-of-tables, inline table) 로 돌려 **bit-perfect 통과율** 비교. Phase 1 첫 sprint에서 POC 벤치마크 수행.

### 차선 전략 — Marker 블록 전체 교체

Config 파일에서 concord 영역을 marker 주석으로 구획 짓고 내부만 문자열 치환.

**JSONC/TOML 에서 권장** (주석 지원). **순수 JSON** (`~/.claude.json`) 에서는 사용 불가 → `concord.lock` 기반 lock-only 추적.

**차선(fallback) 전략 — marker 블록 전체 교체**:
```
# BEGIN concord-managed  <-- 이 사이 영역만 concord가 쓰고
...
# END concord-managed    <-- 외부는 절대 건드리지 않음
```
- TOML에서 comment 보존 라이브러리가 없어도 사용 가능
- 구조 이해 필요 없음 — 문자열 치환 수준 단순함
- 단점: TOML 구조에 marker 문법이 깔끔히 맞지 않음(주석 라인으로 위장). TOML의 경우 `# concord-managed:begin` / `# concord-managed:end` 사용.

---

## 문서 구조

| 파일 | 내용 |
|---|---|
| [`00-overview.md`](00-overview.md) | 이 문서 — 개요·리스크·도구 후보 |
| [`01-sync-semantics.md`](01-sync-semantics.md) | `concord sync` 상태 머신 + dry-run/atomic/partial |
| [`02-config-round-trip.md`](02-config-round-trip.md) | Format-preserving config editor 아키텍처 (JSON/JSONC/TOML) |
| [`03-drift-and-lock.md`](03-drift-and-lock.md) | `concord.lock` 스키마 + drift 감지·보존 정책 |
| [`04-testing-strategy.md`](04-testing-strategy.md) | 골든 파일 테스트 + property-based test + fuzzing |
| [`05-open-questions.md`](05-open-questions.md) | 남은 POC 항목 (TOML 3도구 벤치마크 등) |
| [`06-review-findings.md`](06-review-findings.md) | ✅ codex + subagent 리뷰 결과 + 반영 계획 (누적) |
| **[`07-cli-and-bootstrap.md`](07-cli-and-bootstrap.md)** | **★ FINAL** — CLI 명령 세트 + bootstrap + scope 정책 (확정본) |

## Phase 분할 (FINAL)

| Phase 1 (MVP 필수) | Phase 1.5 (실사용 전) | Phase 2 |
|---|---|---|
| 상태 머신 (install/update/prune/skip + drift/orphan/shadowed/scope-conflict/readonly-managed/marker-broken) | `concord rollback` | Multi-file 2-phase commit |
| `--force` / `--preserve` / `--adopt` / `--diff` | Lock merge driver (JSON/YAML mergetool) | Journaled write-ahead log |
| `concord.lock` git commit + raw/normalized hash 분리 | Bundle tree hash 증분화 | Monorepo nested context (A3 정합) |
| JSONC: `jsonc-morph` 1순위 (POC) → `jsonc-parser` fallback | Windows CRLF/BOM 완전 지원 | Cross-tool adapter (결정 A 이후) |
| TOML: 3도구 POC → 1개 선택 + marker-block fallback | Enterprise URL allowlist | **`concord add` / `concord remove`** (재검토) |
| Atomic rename + `.concord.bak` 복원 | URL Audit log | `concord bootstrap` (신규 머신 one-shot) |
| Golden + property + integration test (PR gate) | Binary smoke (nightly) | cosign/minisign signature |
| Tier 1/2 CLI 모델 (`--file`/`--url --sha256`) | | Registry / marketplace |
| Guided bootstrap (y/N confirm) | | |
| `init`/`detect`/`adopt`/`import`/`replace`/`sync`/`update`/`doctor`/`list`/`why` | | |
| Context-aware adopt (cwd 기반) + Terraform apply 패턴 | | |

---

## 리뷰 요청

이 계획은 **Codex rescue** + **general-purpose subagent** 2개에 병렬 리뷰 요청 후 수정.

리뷰 초점: 05-open-questions.md 참조.
