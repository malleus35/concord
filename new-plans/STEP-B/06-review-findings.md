# B — Review Findings & Reflected Changes (누적)

**작성일**: 2026-04-19 (FINAL)
**리뷰어**: codex-rescue + general-purpose subagent (병렬, 5 라운드)
**검증**: 모든 제안 라이브러리·URL을 메인 세션 또는 subagent 가 웹서치로 재확인

## 라운드별 요약
1. **R1 (config round-trip)**: TOML 3 후보 발굴 (`@shopify/toml-patch`, `@decimalturn/toml-patch`, `@ltd/j-toml`), `raw_hash`+`normalized_hash` 분리, golden test invariant 교정
2. **R2 (default scope + init/config)**: `--scope` 플래그 도입, discovery 경로 4-tier, `concord init --scope`, `concord config edit`
3. **R3 (file-based inference + URL sync + rename)**: Tier 1/2 CLI 모델, URL sync digest pin, `concord.yaml`/`concord.project.yaml` alias, guided bootstrap
4. **R4 (--all 제거 + adopt default)**: `--all` 제거 + CSV 다중 지정, adopt 기본 = **context-aware (cwd 기반 user or user+project)**, enterprise/local never-default
5. **R5 (add/remove Phase 분류)**: Phase 1 에서 **add/remove 제외**, adopt + update + sync 중심 (chezmoi/brew bundle/helm 모델)

---

## 검증된 새 도구 후보 (00·02 문서 업데이트 필요)

| 도구 | 존재 확인 | 포지션 |
|---|---|---|
| [`jsonc-morph`](https://www.npmjs.com/package/jsonc-morph) (David Sherret, Deno 팀) | ✅ 실재 | **CST 기반**, `ts-morph` 스타일 in-place 편집. 임의 주석 삽입·재배치 1급. `jsonc-parser` `modify+applyEdits` 상위 호환 |
| [`@shopify/toml-patch`](https://www.npmjs.com/package/@shopify/toml-patch) | ✅ 실재 (0.3.0, 1년 전) | **Rust `toml_edit` 크레이트 wasm 래퍼**. Rust 생태의 "주석·포매팅 완전 보존" 표준 |
| [`@decimalturn/toml-patch`](https://www.npmjs.com/package/@decimalturn/toml-patch) | ✅ 실재 (최신 활성) | `timhall/toml-patch` 포크. **TOML v1.1.0 지원 + 주석·포매팅 보존** 명시. Pure JS (wasm 부담 없음) |
| [`@rainbowatcher/toml-edit-js`](https://www.npmjs.com/package/@rainbowatcher/toml-edit-js) (0.6.4) | ✅ 실재 | `fasterthanlime/toml-edit-js` 기반. Formatting-preserving. 사용처 적음 (다른 프로젝트 1개) |

**결정**: `02-config-round-trip.md` 의 TOML 전략을 단일 `@ltd/j-toml` → **3도구 비교 + 실측 벤치** 로 변경. (아래 수정 계획 참조)

---

## Codex rescue 리뷰 (R1~R5) — 주요 지적

| 영역 | 지적 | 심각도 |
|---|---|---|
| R1 TOML | `@ltd/j-toml`의 "as much as possible" 보존은 top-level standard tables만 안전. inline table, array-of-tables, multiline array 포매팅 보존 미보장 | **🔴 Critical** |
| R1 JSON | `~/.claude.json` 은 JSONC로 가정 금지 → **pure JSON 취급**. `concord:*` key prefix 전략은 공식 문서 근거 없음 | 🟡 High |
| R2 상태 | `shadowed`, `scope-conflict`, `readonly-managed` 상태 누락 | 🟡 High |
| R2 Partial | `prune` 기준이 "필터 투영 후 desired-set" 임을 명문화 필요 | 🟡 High |
| R3 Hash | byte hash는 formatter false-positive 다발 → `raw_hash` + `normalized_hash` 분리 | **🔴 Critical** |
| R3 Lock | lock entry 정렬 규칙 고정, regenerate-friendly | 🟢 Medium |
| R4 Golden | marker 손상·중복, invalid input, precedence collision 시나리오 누락 | 🟡 High |
| R4 Binary | 실제 바이너리 smoke test는 **nightly** 가 적절 (PR gate는 fixture 기반) | 🟢 Medium |
| R5 실패모드 | ① project path 이동 시 orphan, ② enterprise shadow, ③ formatter marker 이동, ④ partial sync prune 투영 버그 | 🟡 High |

## General-purpose 리뷰 — 주요 지적

| 영역 | 지적 | 심각도 |
|---|---|---|
| 대안 도구 | 위 표의 3개 신규 도구 (`jsonc-morph`, `@shopify/toml-patch`, `@decimalturn/toml-patch`) | **🔴 Critical** |
| 01 Orphan | 타겟 존재·lock 없음 케이스가 상태머신에 없음 | 🟡 High |
| 02 모순 | `concord:*` prefix 채택 결정과 Q3 공개 질문 모순 | 🟡 High |
| 03 Lock | adopted·hybrid install method 경계 미정의 | 🟡 High |
| 04 Invariant | `countTrailingCommas(modified) >= original` 은 단조증가 검사 → 삭제 케이스 false negative | **🔴 Critical** |
| 실패모드 | ① Formatter false drift (**가장 치명적**), ② 동시 partial sync + global lock 충돌, ③ marker ID 충돌 | **🔴 Critical** |
| Phase 분할 | 현재 초안은 Phase 1으로 **over-scoped** — 축소 권장 | 🟢 Medium |

---

## 반영 계획 (수정할 문서)

### 🔴 Critical 반영
1. **`02-config-round-trip.md`**:
   - TOML 전략을 3도구 비교 (`@ltd/j-toml` / `@shopify/toml-patch` / `@decimalturn/toml-patch`) + **POC 벤치마크 → 선택** 프로세스로 교체
   - JSON 편집은 `jsonc-morph` 를 1순위로 승격, `jsonc-parser` 는 대체재 (`modify+applyEdits` 는 marker 주석 삽입 1급 지원 없음)
   - `concord:*` key prefix 전략 폐기 → **Codex 권고대로 ownership 은 `concord.lock`** 에 기록
   - `~/.claude.json` 을 pure JSON으로 확정, marker 사용 불가 → lock 기반 추적만
2. **`03-drift-and-lock.md`**:
   - `source_hash`·`target_content_hash` 각각 `raw_*` 와 `normalized_*` 분리
   - 정규화 규칙 명시 (trailing newline, whitespace, EOL normalization)
   - lock entry 정렬 규칙 (id 오름차순) 고정
   - `adopted` install method 스키마 추가
3. **`04-testing-strategy.md`**:
   - `countTrailingCommas` invariant 을 "변경 영역 외부 일치" 로 교정
   - golden 시나리오에 marker 손상·중복, invalid-but-recoverable, precedence collision 추가
   - binary smoke test는 nightly로 분리 명시

### 🟡 High 반영
4. **`01-sync-semantics.md`**:
   - 상태에 `orphan`, `shadowed`, `scope-conflict`, `readonly-managed` 추가
   - `prune` 기준을 "필터 투영 후 desired-set" 로 명문화
   - Partial sync + locking granularity 충돌 (동시 `--provider` 2개) → **per-provider flock** 또는 "첫 실행이 우선" 정책 선택

### 🟢 Medium 반영
5. **`00-overview.md`**:
   - 도구 후보 섹션 업데이트 (3개 신규 후보 반영)
   - Phase 분할 권고 반영: Phase 1 필수 / Phase 1.5 / Phase 2 명확화

---

## Phase 1 범위 축소 (general-purpose 권고 수용)

| 기능 | 원래 | 변경 |
|---|---|---|
| 4상태 머신 + drift block | Phase 1 | ✅ Phase 1 유지 |
| `--force` / `--preserve` / `--adopt` | Phase 1 | ✅ Phase 1 유지 (없으면 사용자 탈출 경로 없음) |
| `concord.lock` git commit | Phase 1 | ✅ Phase 1 유지 |
| atomic rename + .concord.bak | Phase 1 | ✅ Phase 1 유지 |
| `--rollback` 명령 | Phase 1 | → **Phase 1.5** |
| Lock merge driver | Phase 1 | → **Phase 1.5** (mergetool 연동) |
| Bundle tree hash 증분 | Phase 1 | → **Phase 1.5** |
| Windows CRLF·BOM 완전 지원 | Phase 1 | → **Phase 1.5** |
| `concord import` | Phase 1 | → **Phase 1.5** |
| Multi-file 2-phase commit | Phase 1 | → **Phase 2** (best-effort + 백업 복원만 Phase 1) |
| Journaled write-ahead log | Phase 1 | → **Phase 2** |
| Monorepo nested context | Phase 1 | → **Phase 2** (결정 A A3 와 정합) |

---

## 남은 Open Question (05 문서에 추가)

새로 생긴 질문:
- **Q11**: 3개 TOML 도구 POC 벤치마크 — 각각의 실제 실패 모드를 golden 시나리오로 돌려 비교. 최소 기준: concord의 marker-block 전략이 3개 전부에서 bit-perfect 통과해야 함.
- **Q12**: `jsonc-morph` 는 npm 에서도 안정적으로 설치·동작하는가? (Deno 중심 개발 → Node.js 호환성 검증 필요)
- **Q13**: `concord:*` key prefix 폐기 후, `~/.claude.json` 같은 pure JSON 파일에 대한 **완전 lock-only 추적** 이 실용적인가? (사용자가 해당 파일을 수동 편집했을 때 복구 가능성)

---

## 신뢰도 참고

- Codex 리뷰: 공식 문서 URL 11개 인용 — 높은 신뢰도
- General-purpose 리뷰: 도구 후보 검증 후 **전부 실재 확인** — 높은 신뢰도
- 두 리뷰의 **공통 지적** (formatter false drift, Phase 과대): 최우선 반영
