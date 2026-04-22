# Concord — Design Specification (Phase 1)

**Status**: 🟢 Review-fixed, awaiting user gate (2026-04-22)
**Size**: ~3850 lines (목표 3000~3200 대비 약 650줄 초과, 수용 범위)
**Review history**:
- 2026-04-21: Self-review (Π / Reserved / 11-component / ambiguous 동사 자동 검증 통과)
- 2026-04-22: 3 subagent cross-review (codex rescue + 2 웹서치) → 20건 수정 반영
**Language stack**: TypeScript / Node.js (결정 D §1)
**Predecessors**: 결정 A/B/C/D/E FINAL (`new-plans/01-skills.md`, `STEP-B/07-cli-and-bootstrap.md`, `STEP-C/04-final-plan-v2.md`, `STEP-D/01-windows-install-contract.md`, `STEP-E/01-secret-interpolation-contract.md`)
**Successor**: `superpowers:writing-plans` (TDD 단계 분해)

> **단일 계약서 (single source of truth)**. 본 문서는 Phase 1 implementation 의 **Manifest / Lock / CLI / 보간 / Windows install** 의 완전한 구현 contract 를 재구성할 수 있도록 작성된다. Phase 2 기능은 의도적으로 제외되며, 예약된 경계는 §2 Reserved Registry 와 §1 Π7 parse error 로 보호된다.

---

## 목차

- [§0 문서 목적·범위·전제](#0-문서-목적범위전제)
- [§1 Top-Level Invariants Π1~Π7 + RFC Defense Lines](#1-top-level-invariants-π1π7--rfc-defense-lines)
- [§2 Reserved Identifier Registry](#2-reserved-identifier-registry)
- [§3 Asset Type System + Source Model (β3 α)](#3-asset-type-system--source-model-β3-α)
- [§4 Manifest Schema (Zod)](#4-manifest-schema-zod)
- [§5 Lock Schema](#5-lock-schema)
- [§6 CLI 11 명령 Specification](#6-cli-11-명령-specification)
- [§7 State Machine & Drift Detection](#7-state-machine--drift-detection)
- [§8 Secret Interpolation Contract (E-1~E-19)](#8-secret-interpolation-contract-e-1e-19)
- [§9 Windows Install Contract (D-1~D-15)](#9-windows-install-contract-d-1d-15)
- [§10 Config Round-Trip 편집 정책](#10-config-round-trip-편집-정책)
- [§11 Discovery / 4 Scope Layering](#11-discovery--4-scope-layering)
- [§12 Open Issues / POC Hooks](#12-open-issues--poc-hooks)
- [부록 A — Π↔결정↔컴포넌트 3중 매트릭스](#부록-a--π결정컴포넌트-3중-매트릭스)
- [부록 B — Library Stack & Dependencies](#부록-b--library-stack--dependencies)
- [부록 C — 용어집](#부록-c--용어집)

---

## §0. 문서 목적·범위·전제

### 0.1 목적

본 문서는 **concord Phase 1 implementation 의 단일 계약서 (single source of truth)** 다. `new-plans/` 의 5 FINAL 문서 (결정 A/B/C/D/E) 를 통합하고, 구현자가 본 문서만으로 **Manifest / Lock / CLI / 보간 / Windows install** 의 완전한 contract 를 재구성할 수 있도록 설계된다.

본 문서의 독자는 다음 순서로 활용한다:

1. **구현 착수 전**: §1 Π1~Π7 → §2 Reserved Registry → §3 Asset Type 을 순서대로 내면화. Π 위반은 구현 reject 의 근거가 된다.
2. **실구현 중**: §4 Manifest / §5 Lock 을 schema reference 로 사용. §6 CLI 는 UX 계약. §8~§9 는 sub-contract.
3. **Phase 2 논의 시**: §1.10 RFC Defense Lines 를 방어선으로 사용. §12 Minority 는 자연 발화 지점.

### 0.2 위치 (입력·출력·후속)

**입력** (5 FINAL 문서, 1861 줄):

| 결정 | 문서 | 핵심 |
|---|---|---|
| 결정 A | `new-plans/01-skills.md` | Skills Option III-tightened + A1~A5 |
| 결정 B | `new-plans/STEP-B/07-cli-and-bootstrap.md` | CLI 11 명령 + scope 정책 + bootstrap |
| 결정 C | `new-plans/STEP-C/04-final-plan-v2.md` | Π1~Π7 + Q1~Q5 + §A Reserved Registry |
| 결정 D | `new-plans/STEP-D/01-windows-install-contract.md` | 언어 스택 + 9 명시 결정 (D-1~D-15) + 부록 |
| 결정 E | `new-plans/STEP-E/01-secret-interpolation-contract.md` | 보간 문법 19 사양 (E-1~E-19) |

**출력**: 본 문서 (약 3000~3200 줄 목표).

**후속**: `superpowers:writing-plans` 스킬로 전환 → TDD 단계 분해 → 11 구현 컴포넌트 구현.

### 0.3 범위 (Phase 1 only)

#### 포함

- **6 자산 타입 same-tool sync** (skills / subagents / hooks / mcp_servers / instructions / plugins)
- **4 scope manifest layering** (enterprise / user / project / local)
- **Lock** (roots+nodes flat graph + 3중 digest + capability_matrix discriminated union + install/shell/drift 4 필드)
- **CLI 11 명령** (init / detect / adopt / import / replace / sync / update / doctor / list / why / cleanup)
- **Secret 보간 19 사양** (E-1 ~ E-19)
- **Windows install contract 9 사양** (D-1 ~ D-15)
- **Reserved Identifier Registry** (결정 C §A 4 + 결정 E 추가 11 = 15 entries)
- **Config round-trip 편집** (JSONC / TOML / pure JSON 3 포맷)
- **Π1~Π7 top-level invariants + RFC defense lines**

#### 제외 (Phase 2+ 로 이관)

- **Cross-tool adapter / translate / experimental-compile** — 자산별 ceiling: skills 85-95% / MCP 90-95% / subagents 50-65% / commands 25-70% / hooks 10-30%
- **`add` / `remove` 명령** — provider 공식 도구 (`claude mcp add`, `codex mcp add`) 에 위임
- **Asset-level canonical IR** — Phase 1 에선 `phase2_projections:` 스켈레톤 (빈 섹션) 만 예약
- **`{secret:...}` structured reference** — Phase 1 parse error, Phase 2 K8s `secretKeyRef` 선례
- **`concord_version` H (Cargo edition) 모델** — Phase 1 은 P+ (npm + Dart constraint hybrid)
- **Monorepo nested `.claude/skills/`** (A3) — 프로젝트 루트 단일 배치만
- **cosign/minisign signature 검증** — URL sync 는 `--sha256` digest pin 만
- **Registry/marketplace 통합** — Phase 4

### 0.4 전제 (언어 / 용어 / 기본 가정)

- **언어 스택**: TypeScript / Node.js (결정 D §1, 재검토 트리거 L1~L5 명시)
- **한국어 본문 + 영어 식별자** — 코드 / schema / 라이브러리명은 원문 유지
- **Zod + JSON Schema SoT (source of truth)** — 본 문서의 schema 는 Zod 정의 우선, JSON Schema 는 생성물
- **Version pin 정책**: 라이브러리 semver caret (`^x.y.z`), Node >= 20 LTS (결정 D 부록 A)
- **CLAUDE.md 파일은 작성하지 않음** — 사용자 지시 (메모리 `feedback_bundle_inflation.md`), CLAUDE.md 생성 금지

### 0.5 문서 관계 (외부 파일 참조 규칙)

본 문서가 5 FINAL 원본을 인용할 때는 절번호·ID 를 정확히 명시한다 (예: `결정 D §D-4`, `결정 E E-2a`, `결정 C §3.8`). 본 문서와 원본이 모순하면 **본 문서의 Open Issues (§12)** 로 분리 기록하고 원본은 수정하지 않는다 (§6.1 Q8).

---



## §1. Top-Level Invariants Π1~Π7 + RFC Defense Lines

### 1.0 정체성 정박 + Π 증설 금지 원칙

> **Phase 1 = 설정을 한 번에 Import/sync 하는 툴**
> **Phase 2 = 툴끼리의 공통 workflow/harness 구축 (cross-sync)**

이 정체성 위에 결정 A/B/C/D/E 가 배치되었다. "Bundle" 같은 중간 추상은 **금지** (메모리 `feedback_bundle_inflation.md` 계보 교훈 — "bundle" 이 plugin 형용사에서 독립 범주로 부풀려진 선례).

**Π 증설 금지 원칙 (결정 C v2 §1)**: 새 invariant 후보가 떠오르면 먼저 **기존 Π 의 corollary 로 표현 가능한지** 검증한다. Π 자체가 bundle inflation 대상이 되는 위험 방지. Π1~Π7 은 Phase 1/2 어디서도 깰 수 없는 7 최상위 원칙이며, 확장은 RFC 절차를 거친다 (§1.11).

### 1.1 Π1 — Phase 1 reproducibility contract

**선언**: `concord.lock` 의 contract 는 **`bytes_sha256` + `source digest`** 다. `capability_matrix` 는 contract 가 아닌 **유도된 진단 데이터** 다.

**도출**: 결정 C 섹션 7 Q1 원칙 P1/P2 (Cargo 모델 중간 결합).

**위반 시 결과**:
- Silent rewrite 지옥 (OpenTofu 교훈)
- OS 별 lock 내용 분기 (같은 manifest 가 다른 lock 을 생산)
- Drift 오판 (formatter false-positive)

**적용 영역**:
- Lock 파일 전체 (§5)
- `integrity-mismatch` event 발생 범위 (§7.2)
- OS 간 lock 호환 (D-1 install mode 는 manifest 입력 = `auto`, lock 저장 = 구체값 + reason)
- Secret 보간: lock 에 **unresolved expression** 만 저장 (E-3)

**Corollary (결정 E)**: "Lock 은 resolved bytes 가 아니라 **template + env 의존성 목록** 을 고정한다. 같은 lock + 다른 env = 다른 설치 결과 = 의도된 비대칭 (secret 보호)."

### 1.2 Π2 — Plugin intact (관측하되 조작하지 않는다)

**선언**: concord 는 plugin 내부 자산을 `capability_matrix` 로 **관측만** 한다. 해체 / subset 활성 / 저자 계약 필드 도입 **금지**.

**하위 원칙 (결정 C v2 보강)**: **"기록은 허용, 의미 부여는 금지"** — 저자가 미래 필드를 manifest 에 넣더라도 concord 는 lock `nodes.<key>.declared:` 원문에 **passthrough 보존** 할 뿐 런타임 해석 0%.

**도출**: 결정 C 섹션 7 Q3 D2 (섹션 5 불변식 I6).

**위반 시 결과**:
- Resolver 중복 구현 (Π3 와 동시 위반)
- Phase 2 asset-level IR 자유도 저당
- Bundle inflation 재발

**적용 영역**:
- Phase 1 manifest 문법 (§4)
- `include:` / `exclude:` / `allow_disassemble:` / `disassembled_sources:` 등 **parse error** (§2 Reserved Registry)
- Hook 스크립트 내부 shebang 검증 **0%** (D-3): 파일 내용은 black box
- skill.md / hook.sh 파일 내용은 secret 보간 대상 **아님** (E-5, E-7)

**Phase 2 전환 시 원칙**: 해체가 필요하면 **asset-level canonical IR 로 처리** (Phase 2 에선 plugin 단위 조작이 아니라 자산 단위 재조립). 기존 plugin 필드 의미 재해석 금지.

### 1.3 Π3 — Provider-native 존중 (resolver 중복 구현 금지)

**선언**: concord 는 provider 런타임의 네이티브 동작을 존중한다. 자체 resolver 를 만들지 않는다. 공유는 **명시적 opt-in**. **Scope 해석도 provider 런타임에 위임**.

**도출**: MEMORY ground rules + 결정 A (A1~A5).

**위반 시 결과**:
- Provider 네이티브 동작과 괴리 → 사용자 신뢰 영구 손실
- 복수 resolver 간 분쟁 (concord resolver vs provider resolver)

**적용 영역**:
- Phase 1 sync / install 전체
- Phase 2 cross-sync 의 **자산별 adapter 경계** (Adapter / Translate / experimental-compile)
- 4 scope layering (enterprise / user / project / local) — concord 는 각 scope 에 설치만, 우선순위 해결은 provider 가
- Hook shell 선택 **0%** 관여 (D-3)
- OpenCode 자산에서 `{env:X}` 보간 **양보** (E-5) — 이중 치환 방지

**선례 적용**:
- Claude Code `.agents/skills/` 미지원 ([#31005](https://github.com/anthropics/claude-code/issues/31005)) → concord 도 해당 조합 = parse error (A1)
- Codex `features.codex_hooks = true` 필요 → precheck
- OpenCode 3 경로 스캔 (`.opencode/` / `.claude/` / `.agents/`) → `.agents/` 우선 (A2)

### 1.4 Π4 — Machine contract vs Human UX 분리

**선언**: Lock 과 `--json` 출력 = **machine contract (항상 완전)**. TTY CLI = **human UX (침묵 기본, 조치 가능한 경고만)**. 두 레이어는 **같이 움직이지 않는다**.

**도출**: 결정 C 섹션 7 Q2 V4 + Q4 γ Hybrid.

**위반 시 결과**: "schema 명확 vs 기호 학습 불필요" 허위대립에 빠져 한쪽만 택하면 다른 쪽 비용 폭발. 예: schema 를 풀어 인간 UI 에 뿌리면 매번 소음 / 인간 UI 기호를 lock 에 저장하면 기계 도구가 기호 문자열 파싱.

**적용 영역**:
- `concord.lock` (§5): 항상 완전한 schema
- `--json` 출력 (§6.16): **항상** 전체 `capability_matrix` + remediation hint 포함 (TTY 침묵과 무관)
- TTY 출력: 일상 침묵, doctor 심각 경고만 발화
- doctor 경고 톤: Q2' (a)(b)(c) 3종에 따라 정보~경고 분화
- Secret: TTY 마스킹 (`***`) vs `--json` unresolved only vs `concord secret debug` audit log (E-8)

**Terraform `show -json` 선례**: 기계 계약 완전성은 `--json` 이 담당. CLI TTY 는 인간 판단을 돕는다.

### 1.5 Π5 — Additive evolution by default

**선언**: Phase 1 → Phase 2 진화는 **additive 가 default**. 새 기능 = 새 섹션/필드. `concord_version: ">=X"` constraint 로 feature gate. Breaking 은 진짜 필요한 순간에만 1회성 전환 (Terraform 0.12 선례).

**Additive 의 연산 정의 (결정 C v2 3줄 룰)**:
1. **필드·섹션 추가만 허용** (rename 금지)
2. **기존 필드 semantic 변경 금지** (reinterpret 금지)
3. **default 값 변경 = breaking** (Deno 1→2 `nodeModulesDir` 선례)

**JSON schema consumer 계약 (결정 C v2 신설)**: `--json` 출력은 **permissive consumer 전제**. CI 스크립트가 strict parser 쓰지 말 것을 문서에 명기 (Π4 와 연결).

**도출**: 결정 C 섹션 7 Q5 P1~P5.

**위반 시 결과**: H (Cargo edition) 도입 시 backport 압력 + 문서 2배 + Q3 I6 균열 (YAGNI 위반).

**적용 영역**:
- Manifest 문법 (§4): `concord_version: ">=X"` constraint 필드, `manifest_version` 금지
- Lock schema (§5): `lockfile_version` 게이팅, `phase2_projections:` additive 섹션 예약
- `--json` 출력 schema (§6.16)
- `capability_matrix.status` enum 축소 금지 (확장 OK): `supported` / `detected-not-executed` / `na` / `failed` 고정
- `install_reason` enum 확장 additive (17 entries 시작, 제거 breaking)
- Reserved Registry 추가도 additive (§2.2 RFC 프로세스)

### 1.6 Π6 — Lossy 명시의 정직성 (Π4 의 corollary)

**선언**: 관측 불가능 / 실행 불가능 상태는 **기호·status 로 명시**. 데이터를 lock 에 넣었으면 doctor 는 반드시 접근 경로를 제공. 실패도 **침묵하지 않음** (fail-closed + reason enum).

**Π4 와의 관계**: Π6 은 Π4 의 **human layer 발화 기준**. machine layer (`--json`/lock) 는 항상 완전이므로 Π6 이 적용될 공간은 **TTY 뿐**.

**Π2 와의 범위 분리**: Π2 는 **plugin bytes 조작 금지**, Π6 은 **진단 데이터 표기**. 두 축은 서로 다른 대상이므로 충돌 없음.

**도출**: 결정 C 섹션 5 불변식 I3 + Q4 4 status + Q2' 심각 3종.

**위반 시 결과**:
- Z (완전 침묵) 의 불신 비용 시나리오 (결정 C 섹션 7 Q2):
  - S1: PR 리뷰어 의심 — "왜 이 lock 은 조용한가?"
  - S2: Codex-only 침묵 실패 — Windows/Codex 호환성 실패가 doctor 에 안 뜸
  - S3: Phase 2 갑툭튀 — Phase 2 에서 갑자기 compat 필드 도입 = Π5 위반
- Homebrew Brewfile.lock 이름-역할 괴리 재현

**적용 영역**:
- `capability_matrix` 4 status + reason enum (§5.6)
- doctor 발화 정책 (§6.10): 심각 3종 자동 경고
- Secret fail-closed (E-4): silent empty 금지 (GitHub Actions 악명 함정 회피)
- Error 메시지에서 resolved value 금지 (E-17): 에러조차 투명성 유지

### 1.7 Π7 — Explicit boundaries via parse error

**선언**: **Reserved identifier** 가 Phase 1 에 나타나면 **parse error** (v1/v2 모두 영구). 에러 메시지에 업그레이드 경로 포함. 단, **Generic unknown 필드는 passthrough** (Π2 "기록 허용" 하위 원칙).

**Reserved vs Unknown 구분 (결정 C v2)**:
- **Reserved identifier**: 중앙 레지스트리 (§2) 에 등재된 이름 → **영구 parse error**
- **Generic unknown**: 레지스트리에 없는 미지 필드 → **passthrough** (lock `nodes.<key>.declared:` 원문 보존 + doctor warning)

**Π5 와의 경계**: Additive 로 추가된 새 필드는 **`concord_version` constraint 로 hard gate**. 구 concord 에서 신 필드 = warning + skip (permissive). 단 Reserved identifier 에 해당하면 parse error (hard gate).

**도출**: 결정 C 섹션 7 Q3 D4 + Q5 P4.

**위반 시 결과**: "같은 문자열이 manifest 헤더 한 줄에 따라 유효성 반전" = user mental model 세금, silent ignore 는 I6 파괴.

**적용 영역**:
- `include:` / `exclude:` / `allow_disassemble:` / `disassembled_sources:` = parse error (§2.1.1)
- `{secret:keychain://...}` / `{secret:aws-ssm://...}` 등 = parse error (§2.1.2)
- `{env:X|int}` / `{file:X|base64}` 등 coerce/encoding suffix = parse error (§2.1.2)
- URL scheme: `https://` 만 허용, `http://` / `file://` (except whitelist) = 거부
- Case-insensitive name collision (`Hook.sh` + `hook.sh`) = parse error (D-11)
- Nested 보간 (`{env:TOKEN_${env:ENV_NAME}}`) = parse error (E-9)
- Path traversal (`{file:../../etc/passwd}`) = parse error (E-10)
- Type coercion 실수 (`timeout: "{env:TIMEOUT_MS}"` where timeout is number field) = parse error (E-12)

### 1.8 Π 간 관계 / 충돌 해소

#### 1.8.1 5 가지 교차 관계 (결정 C v2 §3.8)

| 관계 | 유형 | 해소 |
|---|---|---|
| **Π4 ⊇ Π6** | 포섭 (Π6 은 Π4 corollary) | Π6 은 Π4 의 human layer 발화 기준. 별도 원칙이 아닌 부속 규칙 |
| **Π2 ⊥ Π6** | 범위 분리 (직교) | Π2 = plugin bytes, Π6 = 진단 데이터 표기. 충돌 없음 |
| **Π5 ↔ Π7** | 경계 결합 (concord_version) | 미지 필드 기본 passthrough, reserved 는 parse error, `concord_version` constraint 로 hard gate 활성 |
| **Π2 ⊇ "기록 허용"** | 하위 원칙 | 저자 미래 필드 manifest 기록 = OK / 런타임 해석 = NO |
| **Π5 ⊇ "consumer 계약"** | 하위 원칙 | `--json` consumer 는 permissive parser 전제 (strict 금지) |

#### 1.8.2 충돌 시나리오 검증 3건 (모두 겉으로만 충돌)

**시나리오 1: Π2 vs Π6 (plugin 내부 실행 불가 자산)**
- 질문: plugin 내부 hook 이 Windows 미지원이면 Π2 (관측 안 함) 와 Π6 (실패 표기) 중 무엇?
- 해소: `capability_matrix.<provider>.<asset>.status = detected-not-executed + reason = WindowsUnsupported` 로 관측·명시하면 양쪽 만족 (**설치는 됐으나 실행 불가** 의미, §5.6.1 참조. `failed` 는 parse/network/introspection 실패 등 관측 실패 한정)
- 범위 분리 원칙: Π2 범위 = bytes (수정 금지), Π6 범위 = 진단 표기 (상태 표기 OK)

**시나리오 2: Π4 vs Π5 (additive JSON schema 변경)**
- 질문: Phase 2 에 `cross_sync:` 추가하면 `--json` consumer 가 깨지지 않나?
- 해소: `--json` 은 supersets 확장만, TTY 에 spill 없음 = Π4 "같이 움직이지 않음" 으로 차단
- 단 consumer permissive 전제 필요 (Π5 하위 원칙): CI 스크립트는 `jq` 의 `.capability_matrix?` 등 optional chain 사용

**시나리오 3: Π5 vs Π7 (additive 새 필드의 구 버전 parse error)**
- 질문: Phase 2 에 `cross_sync:` 추가 시 Phase 1 concord 가 이를 만나면 어떻게?
- 해소: Reserved identifier 면 영구 parse error, 아니면 passthrough. 경계 = `concord_version` + 레지스트리 검사
- 구체: `cross_sync:` 는 Reserved 가 아니므로 passthrough. 단 `concord_version: ">=2.0"` constraint 가 lock/manifest 에 있으면 구 concord 는 "constraint 위반" 으로 refuse (Π5 3줄 룰 "default 변경 = breaking" 과 정합)

### 1.9 Phase 1 / Phase 2 책임 분할표 (결정 C v2 §4)

| 레이어 | Phase 1 책임 | Phase 2 책임 | 경계 원칙 |
|---|---|---|---|
| **Lock 파일** | reproducibility contract (`bytes_sha256` + source digest) | `phase2_projections:` additive 섹션 (asset-level IR preview) | Π1 |
| **Manifest 파일** | 6 자산 타입 + β3 α (3 source types) + `concord_version:` constraint | `cross_sync:` 등 신규 섹션 additive | Π5, Π7 |
| **Plugin 행동** | intact sync (provider-native 위임) | asset-level cross-sync (Adapter / Translate / experimental-compile) | Π2, Π3 |
| **CLI 노출 (TTY)** | 일상 침묵 + doctor 심각 경고 | Phase 2 기능 신규 명령/플래그 | Π4 |
| **CLI 출력 (`--json`)** | 전체 `capability_matrix` + remediation hint 항상 포함 | Phase 2 기능 additive 포함 (consumer = permissive) | Π4, Π5 |
| **상태 표현** | `capability_matrix` 4 status discriminated union | Phase 2 asset-level IR (별도 필드) | Π6 |
| **문법 경계 — Reserved** | Phase 1/2 공통 parse error: `include:` / `exclude:` / `allow_disassemble:` / `disassembled_sources:` / `{secret:...}` 등 (§2) | Phase 2 **신규 섹션** (`cross_sync:` 등) 에서 기능 제공. 기존 Reserved 문자열은 **Phase 2 에서도 영구 parse error** | Π7 (Q5 P4) |
| **문법 경계 — Unknown** | Generic unknown 필드 = **passthrough** → `nodes.<key>.declared:` 원문 보존 | 동일 | Π2 하위 원칙 + Π7 |
| **저자 계약** | manifest 미지 필드 = passthrough (의미 부여 없음) | Chrome `optional_permissions` 스타일 저자 선언 (RFC 예정, 신규 필드 추가) | Π2, Π5 |
| **해체 기능** | 0% (intact only) | asset-level IR 로 재조립, **plugin 해체 아님** | Π2 |

### 1.10 RFC Defense Lines (Phase 2 영속 금지 8 항목)

결정 C v2 §6 "결정하지 말아야 할 것" 을 영속 방어선으로 승격. Phase 2 RFC 에서도 아래 8 항목은 **영원히 변경되지 않는다**.

#### ❶ Invariant 재검토 금지

- Π1~Π7 재검토 금지 — Phase 2 에서도 영구 유효
- Π 증설은 **기존 Π corollary 로 표현 가능한지 먼저 검증** (§1.0 원칙)

#### ❷ I6 Plugin intact 완화 금지

- Phase 2 asset-level IR 이 plugin 해체를 영원히 대체한다. plugin 단위 조작 추가 금지.
- 해체 요구 시 답변: "asset-level IR 을 사용하라, plugin 내부 접근은 영구 불가."

#### ❸ Reserved identifier 영구 parse error

- §2.1 레지스트리의 모든 identifier 는 **Phase 2 에서도 parse error**
- 대체 기능은 **신규 섹션** (`cross_sync:` 등) 으로 제공

#### ❹ `--json` machine contract 완전성

- TTY 침묵과 무관하게 `--json` 은 **항상** 전체 `capability_matrix` + remediation hint 포함
- Phase 2 에서도 permissive consumer 전제 유지

#### ❺ `lockfile_version` / `concord_version` 역행 금지

- v1 은 영구 유효
- Semver constraint 계약 유지
- Default 값 변경 = breaking (Π5 3줄 룰)

#### ❻ `status` enum 축소 금지

- `supported` / `detected-not-executed` / `na` / `failed` 4종 고정
- 확장은 additive (`partial` 등 신규 case 추가는 OK, 제거 금지)

#### ❼ `capability_matrix` 필드 의미 재해석 금지

- Π5 Rule 2 "기존 필드 semantic 변경 금지" 적용
- Phase 2 에서 `status=supported` 의 의미를 바꾸는 변경 = breaking

#### ❽ Reserved Registry 추가는 RFC 게이트

- 신규 Reserved 등재 = 공식 RFC 필요 (§2.2 프로세스)
- 추가 기준: 미래 Phase 2 기능과 충돌 사전 예측 / 에러 메시지 업그레이드 경로 확정

### 1.11 Invariant 변경 RFC 게이트

Π1~Π7 자체 또는 본 §1 방어선을 약화/완화하려면 **공식 RFC** 필요. 요건:

1. **3 provider 이해당사자 합의** (Claude Code / Codex / OpenCode 각 커뮤니티 maintainer 또는 공식 채널)
2. **선례 1건 이상** — 비교 가능한 도구에서 동일 완화를 실행하고 성공한 사례
3. **이전 결정 (Q1~Q5, D-*, E-*) 중 최소 1개가 현실적으로 붕괴했다는 근거** (데이터 또는 incident report)
4. **최소 2 버전 deprecation 경고 + migration path**

Rust RFC / PEP 수준의 문턱. 이 게이트 없이 Π 완화 제안은 본 문서에 의해 **즉시 reject**.

### 1.12 언어 스택 재검토 트리거 L1~L5 (결정 D §1.5)

본 문서가 **TypeScript/Node.js** 를 전제하지만, 다음 중 하나가 현실화되면 재논의:

| # | 트리거 | 확인 시점 |
|---|---|---|
| **L1** | 결정 B round-trip 축소 ("단방향 생성 + 사용자 편집 보존 포기") | 결정 B 재논의 시 |
| **L2** | POC 에서 symlink/atomic write 가 실제 병목 | Phase 1 첫 sprint POC |
| **L3** | Windows 가 1st-tier target 격상 (사용자 Windows 비율 > 40%) | 사용자 데이터 누적 후 |
| **L4** | 사용자가 "Node 없이 curl" 강하게 요구 (Codex 경험한 "Node blocker") | 피드백 누적 후 |
| **L5** | Anthropic 공식 Rust SDK 출시 | 공식 docs 감시 |

---



## §2. Reserved Identifier Registry

### 2.0 목적

Π7 (explicit boundaries via parse error) 의 대상 문자열을 **중앙 단일 레지스트리**로 관리한다. 구현자가 산발적으로 관리하는 위험을 방지하고, 에러 메시지 일관성을 확보한다. 본 레지스트리는 결정 C §A 와 결정 E §3.2 를 통합한다.

**핵심 원칙**:
1. 아래 등재 identifier 는 Phase 1/2 모두에서 **영구 parse error** (§1.10 ❸ 방어선)
2. 등재되지 않은 unknown 필드는 **passthrough** (§1.7 Π7, §1.8 Π2 하위 원칙)
3. 신규 등재는 **RFC 게이트** 필요 (§2.2)

### 2.1 현재 Reserved (Phase 1 parse error 영구) — 15 entries

#### 2.1.1 결정 C Q3 D4 — 해체 관련 (4 entries)

| Identifier | 도출 | Phase 2 대체 경로 |
|---|---|---|
| `include:` | Q3 D4 | `cross_sync:` 신규 섹션 (Phase 2 RFC) |
| `exclude:` | Q3 D4 | `cross_sync:` 신규 섹션 (Phase 2 RFC) |
| `allow_disassemble:` | Q3 D4 | **대체 없음** — Phase 2 asset-level IR 로 해체 기능 대체 |
| `disassembled_sources:` | Q3 D4 | **대체 없음** — 상동 |

#### 2.1.2 결정 E 보간 문법 — 11 entries

**Secret backends (5 entries)** — Phase 2 structured reference 로 대체:

| Identifier | 도출 | Phase 2 의미 |
|---|---|---|
| `{secret:1password://...}` | E-6 | 1Password CLI (Phase 2 우선순위 1) |
| `{secret:keychain://...}` | E-6 | macOS Keychain (Phase 2 우선순위 2) |
| `{secret:aws-ssm://...}` | E-6 | AWS SSM Parameter Store (Phase 2 우선순위 3) |
| `{secret:azure-kv://...}` | E-6 | Azure Key Vault (Phase 2 후보) |
| `{secret:gcp-sm://...}` | E-6 | GCP Secret Manager (Phase 2 후보) |

**Type coercion suffix (3 entries)** — Phase 2 에서 타입 변환 지원 시 도입:

| Identifier | 도출 | Phase 2 의미 |
|---|---|---|
| `{env:X\|int}` | E-12 | 정수 type coercion |
| `{env:X\|bool}` | E-12 | Boolean type coercion |
| `{env:X\|float}` | E-12 | Float type coercion |

**Encoding suffix (1 entry)** — Phase 2 binary 지원 시:

| Identifier | 도출 | Phase 2 의미 |
|---|---|---|
| `{file:X\|base64}` | E-15 | Binary file base64 encoding |

**Default 문법 변형 (2 entries)** — Phase 2 에서 세밀화:

| Identifier | 도출 | Phase 2 의미 |
|---|---|---|
| `{env:X-default}` (colon 없음) | E-11 | Unset-only default (Docker Compose 변형) |
| `{env:X:?error}` | E-11 | Strict error 메시지 명시 |

### 2.2 Reserved 추가 프로세스 (RFC)

신규 Reserved identifier 등재는 다음 4 단계 RFC 절차를 거친다:

1. **공식 RFC 작성**: 제안 identifier + 왜 parse error 가 되어야 하는지의 근거 (통상 Phase 2 기능 예약)
2. **Π7 준수 확인**: 미래 기능과의 충돌 사전 예측. 다른 Π (특히 Π2, Π5) 와 모순 없는지 검증
3. **에러 메시지 문구 확정**: 업그레이드 경로 포함 (§2.3 템플릿 준수)
4. **단일 validator 모듈에 등록**: `src/schema/reserved-identifier-registry.ts` (가제) 에 추가

**RFC 반려 기준**:
- Phase 2 기능과의 충돌 예측 실패
- 기존 identifier 와 동형 패턴 중복
- "혹시 나중에 필요할까 봐" 추측성 예약 (YAGNI 위반)

### 2.3 에러 메시지 템플릿

모든 Reserved identifier parse error 는 동일한 구조로 발화한다:

```
error: <identifier> is reserved and not supported
  location: <file>:<line>:<col>
  reason: <identifier> is reserved for future Phase 2+ semantics.
  suggestion: <업그레이드 경로 또는 "not supported, see Phase 2 asset-level IR">
```

**예시** (E-6 `{secret:1password://...}` 등장 시):

```
error: {secret:1password://...} is reserved and not supported
  location: concord.yaml:42:15
  reason: {secret:...} is reserved for Phase 2 structured secret references.
  suggestion: Use {env:...} for Phase 1 environment-variable interpolation, or wait for Phase 2 structured-reference support.
```

**예시** (Q3 D4 `include:` 등장 시):

```
error: include: is reserved and not supported
  location: concord.yaml:7:3
  reason: include: is reserved for Phase 2 cross-sync section.
  suggestion: Not supported in Phase 1. See Phase 2 asset-level IR design for equivalent functionality.
```

### 2.4 Generic Unknown vs Reserved 구분 규칙

| 구분 | 감지 | 처리 |
|---|---|---|
| **Reserved** (§2.1 등재) | registry lookup 에 히트 | **Parse error** (§2.3 템플릿). 컴파일 거부 |
| **Unknown** (미등재) | registry lookup 실패 + schema 에 없음 | **Passthrough** — lock `nodes.<key>.declared:` 원문 보존 + `concord doctor` warning ("unknown field, preserved as-is") |

**Unknown 처리 규칙** (결정 C v2 §4 "저자 계약"):
- Manifest 의 unknown 필드는 **파싱 성공** (permissive)
- Lock `nodes.<key>.declared:` 원문 JSON 으로 저장 (passthrough)
- `concord doctor` 에서 warning 으로 노출 ("unknown field `<name>`, preserved as-is")
- 런타임 해석 **0%** (Π2 하위 원칙 "기록 허용, 의미 부여 금지")

### 2.5 Validator 모듈 구현 가이드

단일 validator 모듈 설계 (결정 C v2 "Reserved identifier registry 단일 모듈화"):

```typescript
// file: src/schema/reserved-identifier-registry.ts

/**
 * 중앙 Reserved Identifier Registry.
 * Π7 explicit boundaries via parse error 보호.
 * 등재된 identifier 는 Phase 1/2 공통 parse error.
 */
export const RESERVED_IDENTIFIERS = {
  // 결정 C Q3 D4 — 해체 관련
  "include": { reason: "cross_sync_section", phase2Replacement: "cross_sync:" },
  "exclude": { reason: "cross_sync_section", phase2Replacement: "cross_sync:" },
  "allow_disassemble": { reason: "asset_level_ir", phase2Replacement: null },
  "disassembled_sources": { reason: "asset_level_ir", phase2Replacement: null },

  // 결정 E E-6 — Secret backends
  "{secret:1password://": { reason: "secret_phase2", phase2Priority: 1 },
  "{secret:keychain://": { reason: "secret_phase2", phase2Priority: 2 },
  "{secret:aws-ssm://": { reason: "secret_phase2", phase2Priority: 3 },
  "{secret:azure-kv://": { reason: "secret_phase2", phase2Priority: null },
  "{secret:gcp-sm://": { reason: "secret_phase2", phase2Priority: null },

  // 결정 E E-12 — Type coercion
  "{env:X|int}": { reason: "type_coerce_phase2" },
  "{env:X|bool}": { reason: "type_coerce_phase2" },
  "{env:X|float}": { reason: "type_coerce_phase2" },

  // 결정 E E-15 — Encoding
  "{file:X|base64}": { reason: "binary_encoding_phase2" },

  // 결정 E E-11 — Default 문법 변형
  "{env:X-default}": { reason: "compose_variant_phase2" },  // colon 없음
  "{env:X:?error}": { reason: "strict_error_phase2" },
} as const;

/** Manifest YAML 파서에서 호출. pre-validation 단계. */
export function checkReserved(identifier: string, location: SourceLoc): void {
  const hit = findReservedMatch(identifier);
  if (hit) {
    throw new ReservedIdentifierError({
      identifier,
      location,
      reason: hit.reason,
      phase2Replacement: hit.phase2Replacement,
    });
  }
}
```

**구현 주의**:
- Secret 문법은 prefix 매칭 (`{secret:1password://` 시작 문자열)
- Type coerce / encoding 은 정규식 기반 매칭 (`\{env:\w+\|(int|bool|float)\}`)
- 에러는 **§2.3 템플릿** 로 고정 (자유 문자열 금지 — Π6 reason enum 정책)
- Registry 는 **단일 모듈** — CLI / parser / doctor 모두 같은 출처 참조

---



## §3. Asset Type System + Source Model (β3 α)

### 3.0 정체성

concord 는 **6 자산 타입** 을 1급 시민으로 취급한다 (β3 재구조 2026-04-20). 과거 Type A/B/C/D 분류 ("파일 / 설정블록 / 문서include / 번들") 는 **폐기** 됐다 — "bundle" 이 plugin 형용사에서 독립 범주로 인플레이션된 사례 (메모리 `feedback_bundle_inflation.md`).

"저장 방식" (파일 / 설정병합 / 문서include / 컨테이너) 은 **분류축이 아니라 각 자산의 속성** 이다.

### 3.1 6 자산 타입 정의

```
skills / subagents / hooks / mcp_servers / instructions / plugins
```

| 자산 | 저장 방식 | Provider 경로 예 |
|---|---|---|
| **skills** | 파일 자산 (디렉토리 + `SKILL.md`) | Claude `.claude/skills/`, Codex `.agents/skills/`, OpenCode `.opencode/skills/` |
| **subagents** | 파일 자산 (MD + YAML frontmatter or TOML) | Claude `.claude/agents/`, Codex `.codex/agents/` (TOML), OpenCode `.opencode/agent/` |
| **hooks** | **2-자산 분리** (registration + implementation) | §3.2 참조 |
| **mcp_servers** | 설정 블록 병합 (marker 기반) | Claude `.mcp.json` / `~/.claude/settings.json`, Codex `~/.codex/config.toml`, OpenCode `opencode.json[c]` |
| **instructions** | 문서 include | Claude `CLAUDE.md` (`@file` 순수), Codex `AGENTS.md` (layered concat), OpenCode `.opencode/instructions/` |
| **plugins** | **컨테이너 source** (β3 α, §3.3) | Claude marketplace, Codex `marketplace add`, OpenCode `npm` |

### 3.2 Hooks 2-자산 분리

Hook 은 다른 자산과 달리 **두 개의 상관 자산** 으로 구성된다:

| 하위 자산 | 저장 방식 | 예 |
|---|---|---|
| **registration** | 설정 블록 병합 (marker 기반) | `.claude/settings.json` 의 `hooks` 배열, Codex `config.toml` 의 `[[hooks]]` |
| **implementation** | 파일 자산 | hook 스크립트 파일 (`*.sh`, `*.mjs` 등) |

**이유**:
- Registration 은 **어떤 이벤트에 어떻게 hook 이 동작하는가** (matcher / if / command string) 를 기록 — provider config 에 병합
- Implementation 은 **실제 실행 파일** — 파일 경로 또는 inline command

**Provider 격차** (결정 C §9):
- Claude: **26 events**, 4 types (command / http / prompt / agent), matcher+if, Live change detection
- Codex: **5 events**, command only, Bash only, Windows 지원은 v0.119+ (`features.codex_hooks = true` 필수)
- OpenCode: **네이티브 hooks 없음** → JS/TS plugin 형태로 구현

**결정 D 연계**:
- Hook shell 은 **provider 위임** (Π3): shebang 검증 0%, Windows 분기는 provider 책임 (D-3)
- Claude hook: Git Bash 강제 passthrough (`CLAUDE_CODE_GIT_BASH_PATH` 공식)
- Codex hook: `shell_compatibility` 셀 관측 (D-3)

### 3.3 Plugin 컨테이너 특수성 — β3 옵션 α

Plugin 은 다른 자산과 달리 **컨테이너 source** 를 가진다. 3 provider 각각의 plugin 생태계가 **본질적으로 다른 구조** 이므로, concord 는 3종 source type 을 명시적으로 분리한다.

**β3 옵션 α**: `claude-plugin` / `codex-plugin` / `opencode-plugin` 3종 source type + `auto_install` + `enabled` + `purge_on_remove` 3 플래그.

#### 3.3.1 3 Source Types

| Source type | Provider | 본질 |
|---|---|---|
| **`claude-plugin`** | Claude Code | 파일 번들 (marketplace 기반). Manifest = `plugin.json`. Asset 은 파일 경로 레퍼런스 |
| **`codex-plugin`** | Codex | 번들 + `apps/` + `.codex-plugin/plugin.json`. `marketplace add` CLI (v0.121 changelog + 서드파티 요약, semi-official) |
| **`opencode-plugin`** | OpenCode | 실행 코드 (npm 패키지). `package.json#main` 이 실행 entry. JS/TS plugin 형태 |

**세 plugin 의 본질이 다른 이유** (Codex cross-compile 리뷰):
- Claude plugin = 파일 모음
- Codex plugin = 번들 + 실행 코드 (apps)
- OpenCode plugin = 실행 코드 자체 (npm run-time)

따라서 "Phase 2 에서 plugin 단위로 cross-compile" 은 불가능. Phase 2 canonical IR 은 **asset-level** 이어야 한다 (§1.9 Phase 2 책임 분할표).

#### 3.3.2 Manifest 표현 (Zod discriminated union)

```yaml
# concord.yaml 예시
plugins:
  - id: claude-code:plugin:github-integrator
    source:
      type: claude-plugin
      marketplace: anthropic
      name: github-integrator
      version: "1.2.0"
    auto_install: true
    enabled: true
    purge_on_remove: false

  - id: codex:plugin:shell-utils
    source:
      type: codex-plugin
      marketplace: openai-codex
      name: shell-utils
      version: "0.3.1"
    auto_install: true
    enabled: false     # 설치되지만 비활성
    purge_on_remove: true

  - id: opencode:plugin:opencode-airtable
    source:
      type: opencode-plugin
      package: "@opencode-community/airtable"
      version: "2.0.0"
    auto_install: true
    enabled: true
    purge_on_remove: true
```

상세 schema 는 §4.4 참조.

### 3.4 3 플래그 — auto_install / enabled / purge_on_remove

Plugin 자산 전용 3 플래그. OpenClaw 2단계 게이트 차용:

| 플래그 | 의미 | Default | 적용 자산 |
|---|---|---|---|
| **`auto_install`** | `concord sync` 실행 시 provider 에 자동 설치 여부 | `true` | plugins only |
| **`enabled`** | 설치 후 활성 여부 (disable 시 파일은 남지만 provider 가 로드 안 함) | `true` | plugins only |
| **`purge_on_remove`** | `concord cleanup` 시 provider 네이티브 파일도 같이 지우는지 | `false` | plugins only |

**OpenCode `auto_install` vs `enabled` 특수성** (POC-6):
- OpenCode 는 `plugin:` 배열 존재 자체가 enabled 의미
- concord 는 `auto_install: false + enabled: true` 조합을 "이미 다른 방법으로 설치, enable 만 표기" 로 해석
- 실제 semantic 분리 검증은 Phase 1 POC 에서 진행 (§12.1)

### 3.5 Skills Overlay — agentskills.io 공통 + `concord:` prefix

Skills 는 [agentskills.io](https://agentskills.io) 오픈 스탠다드 준수. concord 는 해당 표준을 **overlay** (flat 영역) 로 사용하며, 공식 표준 외 확장은 **`concord:` prefix** 로 격리한다.

#### 3.5.1 공통 필드 (agentskills.io 표준)

```yaml
# SKILL.md YAML frontmatter
name: commit-msg
description: Generate conventional commit messages from git diff
```

- `name`: `^[a-z0-9]+(-[a-z0-9]+)*$`, 1-64자 (OpenCode 제약)
- `description`: 1-1024자 (OpenCode 제약)
- `license`, `compatibility`, `metadata` 등 표준 확장 허용

#### 3.5.2 Claude Code 전용 필드 (관용 필드, Π5 하위 원칙 통과)

Claude Code 가 정의한 필드: `disable-model-invocation`, `user-invocable`, `allowed-tools`, `model`, `effort`, `context`, `agent`, `hooks`, `paths`, `shell`, `argument-hint`, `when_to_use`.

다른 provider 는 "모르는 필드는 무시" 정책이므로 passthrough 가능 — 하지만 의미는 해당 provider 에서 무효.

#### 3.5.3 concord 확장 (`concord:` prefix flat)

concord 가 추가로 부착하는 메타데이터는 `concord:` prefix 로 격리. 저자 필드와 충돌 방지.

```yaml
# SKILL.md frontmatter
name: commit-msg
description: ...
concord:
  source_id: "claude-code:skills:commit-msg"
  source_digest: "sha256:abc..."
  installed_by: "concord@0.1.0"
```

### 3.6 MCP Servers — 공식 스펙 overlay

MCP 서버 자산은 [MCP 공식 스펙](https://modelcontextprotocol.io) 을 따른다. concord 는 각 provider 포맷 변환 책임:

| Provider | 저장 위치 | 포맷 |
|---|---|---|
| Claude | `.mcp.json` / `~/.claude/settings.json` | JSON(C) |
| Codex | `~/.codex/config.toml` | TOML |
| OpenCode | `opencode.json[c]` | JSONC |

**결정 D D-14 format transform**:
- `command: "npx"` 이 Windows 에서 실패하는 stdio transport 버그 → concord 가 자동으로 `command: "cmd", args: ["/c", "npx", ...]` 으로 wrap

### 3.7 자산별 Provider 경로 매트릭스 (결정 A + 결정 C)

#### 3.7.1 Skills (결정 A FINAL)

| | project | user |
|---|---|---|
| claude-code | `.claude/skills/` | `~/.claude/skills/` |
| codex | `.agents/skills/` | `~/.agents/skills/` |
| opencode | `.opencode/skills/` | `~/.config/opencode/skills/` |

**결정 A 추가 조항 (A1~A5)**:
- **A1**: `shared-agents` opt-in 시 `.agents/skills/` 에만 설치 (이동 시맨틱, 복사 금지)
- **A2**: `.opencode/` / `.agents/` 동일 skill 충돌 시 **`.agents/` 우선**, concord 가 `.opencode/` 제거/경고
- **A3**: Monorepo nested `.claude/skills/` 지원은 **Phase 2+**
- **A4**: [#31005](https://github.com/anthropics/claude-code/issues/31005) OPEN 상태 트래킹, Phase 1 은 `claude-code + shared-agents = parse error` 유지
- **A5**: `.claude/commands/*.md` 는 skill 의 별칭 — 별도 asset type 아님

#### 3.7.2 Subagents

| Provider | Project 경로 | 포맷 |
|---|---|---|
| Claude | `.claude/agents/<name>.md` | MD + YAML frontmatter |
| Codex | `.codex/agents/<name>.toml` | TOML |
| OpenCode | `.opencode/agent/<name>.md` | MD + YAML frontmatter |

#### 3.7.3 Hooks

| Provider | Registration | Implementation |
|---|---|---|
| Claude | `.claude/settings.json` `hooks` | 파일 경로 또는 inline command (Git Bash 강제) |
| Codex | `~/.codex/config.toml` `[[hooks]]` (`features.codex_hooks = true`) | Bash only, Windows v0.119+ |
| OpenCode | — (네이티브 hooks 없음) | JS/TS plugin |

#### 3.7.4 MCP Servers

§3.6 참조.

#### 3.7.5 Instructions

| Provider | 경로 | 포맷 특이사항 |
|---|---|---|
| Claude | `CLAUDE.md` (project root, `~/.claude/CLAUDE.md` user) | `@file` include 순수 |
| Codex | `AGENTS.md` | Layered concat (project + user 누적) |
| OpenCode | `.opencode/instructions/*.md` + `opencode.json[c]` `instructions:` 배열 | 파일 + 설정 배열 조합 |

**주의**: Instructions 는 Phase 2 cross-tool 에서 **mirror/adapter 수준만** 가능 (semantics-preserving 변환 불가).

#### 3.7.6 Plugins (β3 α)

§3.3 참조.

### 3.8 자산 타입별 Phase 2 ceiling (참고 정보, Phase 1 범위 밖)

결정 C v2 Codex cross-compile 리뷰 (task-mo77ph1w-t56nsq) 결과. **Phase 1 에서는 구현하지 않음**:

| 자산 | Claude→Codex | Claude→OpenCode | Phase 2 전략 |
|---|---:|---:|---|
| **skills** | 85% | 95% | Adapter (agentskills.io 표준) |
| **mcp_servers** | 95% | 90% | Adapter (포맷 변환) |
| LSP (OpenCode only) | N/A | 80% | OpenCode 전용 Adapter |
| commands (= skill alias) | 25% | 70% | Claude commands = skill alias (A5), OpenCode 만 Translate |
| subagents | 50% | 65% | Translate (lossy warning 필수) |
| hooks | 10% | 30% | 3단계: overlay-only / unsupported / **experimental-compile** |
| instructions | — | — | mirror/adapter 수준만 |
| **plugins** | — | — | **asset-level 로 해체해서 처리** (β3 α 는 Phase 1 전용) |

**핵심 원칙 (Π3, §1.9)**: "90% 호환" 은 skills+MCP 중심 plugin 에만 현실적. 임의 plugin 은 aspirational. Phase 2 cross-sync 는 plugin 단위가 아니라 **asset 단위** 로 내려가야 한다.

---



## §4. Manifest Schema (Zod)

### 4.0 설계 원칙

- **Zod 를 SoT (source of truth)** 로 사용. JSON Schema 는 Zod 로부터 생성 (`zod-to-json-schema`).
- Phase 1 에선 Zod 의 `discriminatedUnion` 사용. deprecate 가능성 대비 JSON Schema SoT 도 병행 생성 (결정 C Q4 가드레일).
- YAML 파서는 **format-preserving**: `eemeli/yaml` (POC-3 유력).
- **Permissive on unknown**: Reserved 가 아닌 unknown 필드는 passthrough (Π7, §2.4).
- **Hard on Reserved**: §2.1 등재 identifier 만나면 parse error (§1.7 Π7, §1.10 ❸).
- **Hard on interpolation misuse**: §2.1.2 모든 Reserved 보간 문법 + path traversal + nested + type coerce 실수 parse error (E-9/E-10/E-12).

### 4.1 4 Scope 파일 구조

| Scope | 파일 경로 | Manifest 파일명 | 특징 |
|---|---|---|---|
| **enterprise** | `~/.concord/` | `concord.enterprise.yaml` | 조직 배포. 일반 사용자는 명시 opt-in 만. Never-default |
| **user** | `~/.concord/` | `concord.user.yaml` | 개인 전역 (모든 프로젝트 공통) |
| **project** | `<project>/` | `concord.yaml` **또는** `concord.project.yaml` (alias, 둘 다 허용) | 팀 공유, git-tracked |
| **local** | `<project>/` | `concord.local.yaml` | 개인 머신 튜닝, gitignored. Never-default |

**Locality 규칙**:
- **project / local**: cwd 기준 탐색
- **user / enterprise**: canonical 경로 (`~/.concord/` 또는 Discovery 순서, §11.1)
- cwd 에서 `concord.user.yaml` / `concord.enterprise.yaml` 발견 시: 경고 + "정말 이 경로로 진행?" 확인

**Merge 순서 (precedence)**: enterprise → user → project → local (각 scope 자체 보간 후 merge, E-16).

### 4.2 Top-level Schema

```typescript
// file: src/schema/manifest.ts
import { z } from "zod";

export const ManifestSchema = z.object({
  // Required
  concord_version: z.string().regex(/^[\^~>=<\s\d.]+$/).optional()
    .describe("Semver constraint. 생략 가능 (구현 시 warning). 예: '>=0.1'"),

  // 6 자산 타입 (모두 optional 배열)
  skills: z.array(SkillAssetSchema).optional().default([]),
  subagents: z.array(SubagentAssetSchema).optional().default([]),
  hooks: z.array(HookAssetSchema).optional().default([]),
  mcp_servers: z.array(McpServerAssetSchema).optional().default([]),
  instructions: z.array(InstructionAssetSchema).optional().default([]),
  plugins: z.array(PluginAssetSchema).optional().default([]),

  // Reserved (§2.1) 는 parse error (passthrough 아님)
  // 단 generic unknown 은 passthrough → lock nodes.<key>.declared 보존
}).passthrough();

export type Manifest = z.infer<typeof ManifestSchema>;
```

**주의**:
- `z.object().passthrough()`: unknown top-level key 허용 (Π2 하위 원칙 "기록 허용")
- Reserved check 는 **pre-validation hook** 에서 수행 (Zod 가 호출되기 전)
- `concord_version` 생략 = warning, 없어도 동작 (Π5 P3)

### 4.3 6 자산 타입 Zod Definitions

#### 4.3.1 공통 베이스 (`AssetBase`)

```typescript
const AssetBaseSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+(:[a-z0-9-]+){1,2}$/)
    .describe("Asset identifier. 형식: <provider>:<type>:<name> 또는 <type>:<name>"),

  source: SourceSchema,

  scope: z.enum(["enterprise", "user", "project", "local"]).optional(),

  target: z.enum(["shared-agents"]).optional()
    .describe("결정 A: shared-agents opt-in (codex + opencode 에만 허용)"),

  // Install mode 입력 (D-1): lock 저장은 구체값+reason (§5.7.1)
  install: z.enum(["symlink", "hardlink", "copy", "auto"]).default("auto")
    .describe("D-1 입력 UX (auto default). Lock 은 실제 적용값+install_reason 저장"),

  // Interpolation allowlist (§4.5 참조) — source, env, authHeader, headers 만 보간 허용
  // 다른 필드에 {env:X} 등장 시 parse error (E-7)
}).passthrough();
```

**ID 규칙**:
- 형식: `<provider>:<type>:<name>` (예: `claude-code:skills:commit-msg`)
- provider 생략 시 context 로 추론 (adopt 시점)
- Case-insensitive 충돌 = parse error (D-11)

#### 4.3.2 SkillAsset

```typescript
export const SkillAssetSchema = AssetBaseSchema.extend({
  type: z.literal("skills").optional(),

  // agentskills.io 공통 필드
  // concord 는 source 만 관리, SKILL.md frontmatter 는 provider 가 해석
});
```

**결정 A 검증 규칙** (parse error):
- `provider: "claude-code"` + `target: "shared-agents"` = parse error (A1, A4)
- SKILL.md frontmatter 의 보간은 **지원 안 함** (§4.5, E-7)

#### 4.3.3 SubagentAsset

```typescript
export const SubagentAssetSchema = AssetBaseSchema.extend({
  type: z.literal("subagents").optional(),

  format: z.enum(["md-yaml", "toml"]).optional()
    .describe("Claude/OpenCode = md-yaml, Codex = toml. 생략 시 provider 로부터 추론"),
});
```

#### 4.3.4 HookAsset (2-자산 분리)

```typescript
export const HookAssetSchema = AssetBaseSchema.extend({
  type: z.literal("hooks").optional(),

  event: z.string().describe("Provider hook event 이름 (Claude 26 / Codex 5 / OpenCode N/A)"),

  // registration (설정 블록 병합)
  registration: z.object({
    matcher: z.string().optional(),
    if_condition: z.string().optional(),
    command: z.string().optional(),  // inline or 파일 경로
    hook_type: z.enum(["command", "http", "prompt", "agent"]).optional(),
  }).optional(),

  // implementation (파일)
  implementation: z.object({
    source: SourceSchema,
    target_path: z.string().describe("설치될 hook 스크립트 파일 상대 경로"),
  }).optional(),

  // registration 또는 implementation 최소 하나 필요
}).refine(
  (h) => h.registration || h.implementation,
  "hooks require at least registration or implementation"
);
```

**결정 D D-3 Hook Shell = Provider 위임**:
- concord 는 `implementation.source` 로부터 파일을 설치하되, shebang 검증 0% (Π2)
- Claude hook 은 Git Bash 강제 (`CLAUDE_CODE_GIT_BASH_PATH`), concord passthrough only
- Codex hook: `features.codex_hooks = true` precheck, Windows v0.119+ 필요 (D-4 Codex 버전 probe)
- OpenCode: 네이티브 hooks 없음 → JS/TS plugin 형태로 등록

#### 4.3.5 McpServerAsset

```typescript
export const McpServerAssetSchema = AssetBaseSchema.extend({
  type: z.literal("mcp_servers").optional(),

  transport: z.enum(["stdio", "sse", "http"]).default("stdio"),

  command: z.string().optional().describe("stdio transport 용 (예: 'npx')"),
  args: z.array(z.string()).optional(),

  url: z.string().optional().describe("sse/http transport 용 (보간 허용)"),

  env: z.record(z.string(), z.string()).optional()
    .describe("환경변수 주입. 값 필드 보간 허용 ({env:X} / {file:X})"),

  headers: z.record(z.string(), z.string()).optional()
    .describe("HTTP transport 용 헤더. 값 필드 보간 허용"),
});
```

**결정 D D-14 Format Transform**:
- Windows + `command: "npx"` 감지 시 `concord sync` 가 자동으로 `command: "cmd", args: ["/c", "npx", ...]` 으로 변환
- 변환은 **install 시점** 에서만, manifest/lock 원본은 그대로 (Π1 reproducibility)

#### 4.3.6 InstructionAsset

```typescript
export const InstructionAssetSchema = AssetBaseSchema.extend({
  type: z.literal("instructions").optional(),

  target: z.enum(["claude-md", "agents-md", "opencode-instructions"]),

  mode: z.enum(["file-include", "layered-concat", "array-entry"]).optional()
    .describe("Claude @file = file-include, Codex = layered-concat, OpenCode = file-include + array-entry 조합"),
});
```

**경고**: Phase 2 cross-tool 에서 instructions 는 **mirror/adapter 수준만** (§3.7.5). Semantics-preserving 변환 불가.

#### 4.3.7 PluginAsset (β3 α)

```typescript
export const PluginAssetSchema = AssetBaseSchema.extend({
  type: z.literal("plugins").optional(),

  source: PluginSourceSchema,  // §4.4 discriminated union

  // 3 플래그 (§3.4)
  auto_install: z.boolean().default(true),
  enabled: z.boolean().default(true),
  purge_on_remove: z.boolean().default(false),

  // Claude plugin transitive dependencies (결정 C 섹션 5)
  dependencies: z.array(z.string()).optional()
    .describe("Claude plugin.json 의 dependencies 배열 (transitive)"),

  min_engine: z.string().optional()
    .describe("Claude plugin.json 의 minimum engine version"),
});
```

### 4.4 Source 필드 (Discriminated Union)

#### 4.4.1 일반 자산 Source

```typescript
export const SourceSchema = z.discriminatedUnion("type", [
  // URI 기반 Fetcher adapter
  z.object({
    type: z.literal("git"),
    repo: z.string(),        // {env:CORP_REGISTRY}/... 보간 허용
    ref: z.string(),         // {env:PLUGIN_REF} 보간 허용
    path: z.string().optional(),
  }),
  z.object({
    type: z.literal("file"),
    path: z.string(),        // {file:...} 보간 허용
  }),
  z.object({
    type: z.literal("http"),
    url: z.string().url(),   // 반드시 https:// (Π7, §6.15)
    sha256: z.string().regex(/^[a-f0-9]{64}$/),
  }),
  z.object({
    type: z.literal("npm"),
    package: z.string(),
    version: z.string(),
  }),
  z.object({
    type: z.literal("external"),
    description: z.string()
      .describe("Provider 공식 도구로 설치됨. concord 는 observe only"),
  }),
  z.object({
    type: z.literal("adopted"),
    description: z.string()
      .describe("사용자 시스템에서 발견, manifest 로 등록됨 (terraform import 시맨틱)"),
  }),
]);
```

#### 4.4.2 Plugin 컨테이너 Source (β3 α)

```typescript
export const PluginSourceSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("claude-plugin"),
    marketplace: z.string(),     // 예: "anthropic"
    name: z.string(),
    version: z.string(),
  }),
  z.object({
    type: z.literal("codex-plugin"),
    marketplace: z.string(),     // 예: "openai-codex"
    name: z.string(),
    version: z.string(),
  }),
  z.object({
    type: z.literal("opencode-plugin"),
    package: z.string(),         // npm package name, 예: "@opencode-community/airtable"
    version: z.string(),
  }),
]);
```

### 4.5 Interpolation Allowlist (E-7)

**보간이 허용되는 필드** (다른 필드에 `{env:X}` / `{file:X}` 등장 시 parse error):

| 필드 | 보간 허용 | 비고 |
|---|---|---|
| `source.url` / `source.repo` | ✅ | git / http source |
| `source.ref` / `source.version` | ✅ | 동일 |
| `env.*` (MCP, hooks) | ✅ | 환경변수 주입 |
| `authHeader` / `headers.*` | ✅ | HTTP transport |
| `command` (MCP) | ❌ (Π2, provider 위임) | hardcoded 값만 |
| `id` / `name` | ❌ (식별자, Π7 parse error) | 식별자는 불변 |
| `install` / `scope` / `enabled` | ❌ (동작 제어 필드) | parse error |
| 자산 파일 내용 (skill.md, hook.sh) | ❌ (Π2 intact) | provider/shell 이 해석 |
| skill.md YAML frontmatter | ❌ (E-5 회색지대) | provider 가 처리 |

**Validator 구현 (pre-validation)**:

```typescript
// file: src/schema/interpolation-allowlist.ts
const INTERPOLATION_ALLOWED_FIELDS = new Set([
  "source.url", "source.repo", "source.ref", "source.version",
  "env.*", "authHeader", "headers.*",
]);

export function checkInterpolationAllowed(
  fieldPath: string,
  value: string
): void {
  if (containsInterpolation(value) && !isAllowedField(fieldPath)) {
    throw new ParseError(
      `interpolation not allowed in field '${fieldPath}' (E-7 allowlist)`
    );
  }
}
```

### 4.6 `concord_version` Constraint

**Π5 P3 (결정 C v2)**: Dart `environment.sdk` / npm `engines` 스타일. `manifest_version` 도입 **금지**.

```yaml
concord_version: ">=0.1"
```

**Semver 문법** (지원 범위는 POC 에서 확정):
- `>=X.Y` — 최소 버전 (주 사용 패턴)
- `^X.Y.Z` — compatible (major 고정)
- `~X.Y.Z` — patch-level (minor 고정)

**동작**:
- 생략 시 **warning** (Π5 "concord_version 생략 시 경고 + 불일치 fail-closed" 결정 C v2 보강)
- Constraint 불일치 시 **fail-closed** (예: concord@0.1 이 `">=0.2"` manifest 만나면 refuse)
- 라이브러리: `semver` (npm).

**Reserved 경계 (Π7 ↔ Π5)**: 구 concord 가 신 필드 만나면 warning + skip (permissive). 단 §2 Reserved identifier 만나면 parse error (hard gate).

### 4.7 Manifest 파일명 Alias (결정 B)

Project scope 는 **`concord.yaml`** (권장) 또는 **`concord.project.yaml`** (명시) 둘 다 허용. 프로젝트 루트에 두 파일이 **동시에 존재** 시: **parse error** (ambiguity).

**Tier 2 CLI 자동 scope 추론** (§6.6):
- `concord sync --file ./concord.user.yaml` → scope=user 자동
- `concord sync --file ./concord.yaml` → scope=project 자동 (alias 포함)

### 4.8 Validator 구현 가이드

Pre-validation → Zod → post-validation 3단계:

```typescript
// file: src/schema/validate-manifest.ts
export function validateManifest(raw: unknown): Manifest {
  // 1. Pre-validation: Reserved identifier 체크
  checkReservedIdentifiers(raw);   // §2.5 registry

  // 2. Pre-validation: 보간 allowlist 체크
  checkInterpolationAllowedGlobal(raw);  // §4.5

  // 3. Pre-validation: path traversal 체크 (E-10)
  checkPathTraversal(raw);

  // 4. Zod schema 파싱
  const parsed = ManifestSchema.parse(raw);

  // 5. Post-validation: case-insensitive 충돌 (D-11)
  checkCaseCollisions(parsed);

  // 6. Post-validation: 결정 A A1~A5
  checkSkillsPlacement(parsed);  // claude-code + shared-agents = parse error

  return parsed;
}
```

**테스트 계약** (Phase 1 POC):
- Reserved identifier 15개 각각 parse error 검증 (golden 테스트)
- Allowlist 위반 parse error 검증
- `concord_version` 생략 시 warning 출력 검증
- `concord_version` constraint 불일치 시 fail-closed 검증
- Generic unknown passthrough → lock `nodes.<key>.declared` 원문 보존 검증

---



## §5. Lock Schema

### 5.0 설계 원칙

**Π1 "Lock = observed state 의 contract"** 를 구체화한다. 결정 C §5 (roots+nodes flat graph + 3중 digest + capability_matrix) + 결정 D Q4 확장 (install_mode/shell_compatibility/drift_status) + 결정 E E-2a (env-drift) + 결정 C Q1 (lockfile_version + phase2_projections) 통합.

**핵심 불변식**:
- **I1**: Lock 은 deterministic 하게 재생성 가능 (같은 manifest + 같은 env + 같은 source = 같은 lock, byte 수준)
- **I2**: Lock field 는 Π5 3줄 룰 준수 (field 추가만, semantic 변경 금지, default 변경 = breaking)
- **I3**: Lossy 상태는 `capability_matrix` status + reason 으로 명시 (Π6)
- **I4**: `--json` 과 lock 은 machine contract — 항상 완전 (Π4)
- **I5**: Secret interpolation 결과는 lock 에 절대 저장 금지. Unresolved expression 만 (E-3, Π1)
- **I6**: **Plugin intact** — concord 는 plugin 내부를 관측하되 조작 안 함 (Π2)

### 5.1 Top-level Schema

```typescript
// file: src/schema/lock.ts
import { z } from "zod";

export const LockSchema = z.object({
  // Version gating (Q1)
  lockfile_version: z.literal(1),

  // 생성 메타
  generated_at: z.string().datetime(),
  generated_by: z.string(),  // 예: "concord@0.1.0"

  // Scope 단위 로컬 (enterprise/user/project/local 각자 독립 lock)
  scope: z.enum(["enterprise", "user", "project", "local"]),

  // Graph: roots + nodes
  roots: z.array(z.string()).describe("Top-level asset id 배열 (manifest 직접 선언)"),
  nodes: z.record(z.string(), LockNodeSchema).describe("자산 id → 상세 정보 map (transitive 포함)"),

  // Phase 1 capability_matrix (Q4)
  capability_matrix: CapabilityMatrixSchema,

  // Phase 2 reserved slot (§5.9 참조).
  // Phase 1 에선 optional — 정확한 위치 (top-level vs nodes 내부 필드) 는 §12 Minority M5 미결.
  // 구현자는 Phase 1 에서 이 필드를 생성하거나 읽을 필요가 없음.
  phase2_projections: z.record(z.string(), z.unknown()).optional(),
});

export type Lock = z.infer<typeof LockSchema>;
```

**파일 위치**:
- Project lock: `<project>/concord.lock`
- Local lock: `<project>/concord.local.lock` (gitignored)
- User lock: `~/.concord/concord.user.lock`
- Enterprise lock: `~/.concord/concord.enterprise.lock`

**각 scope 독립 lock**: merge 는 런타임 시점, 파일은 분리. 병합 결과는 `concord list --json` 에서 감지된 모든 scope 를 포함해 재구성 (`--all` 은 Phase 1 에서 제거, §6.7.1).

### 5.2 `lockfile_version` 게이팅 (Q1)

**결정 C Q1 Option C (Cargo 모델)**: Phase 1 lock ↔ Phase 2 IR 중간 결합.

| 원칙 | 설명 |
|---|---|
| **P1** | Phase 1 lock = provider-native reproducibility 계약 |
| **P2** | `capability_matrix` = 유도된 진단 데이터 (contract 아님) |
| **P3** | 같은 파일 + 섹션 분리 + `lockfile_version` 게이팅 + `phase2_projections:` additive 예약 |

**버전 bump 정책** (POC 에서 최종 확정):
- Minor addition (새 필드 추가) = **`lockfile_version` 유지** (Π5 additive)
- Breaking change = **`lockfile_version` bump** (매우 드물어야 함, Π5 "B 1회성 전환" 철학)
- `lockfile_version: 2` 도입 시 구 concord 는 fail-closed (명확한 에러 + 업그레이드 안내)

**Phase 2 `phase2_projections:`**: Phase 1 에선 빈 객체 `{}` 로 생성. Phase 2 에서 asset-level IR preview 가 들어갈 예약 공간.

### 5.3 Roots + Nodes Flat Graph (결정 C §5)

**구조 선택 이유**: 트리 또는 중첩 구조 대신 flat graph 를 택한 이유는:
1. **Transitive dependency 표현**: Claude plugin 의 `dependencies` 배열을 자연스럽게 flat nodes 로 분해 가능 (§5.8)
2. **Deduplication**: 같은 asset 이 여러 root 에서 참조돼도 node 는 하나
3. **Drift 감지 단순화**: 각 node 는 독립 digest, roots 는 포인터만

```yaml
# concord.lock 예시
lockfile_version: 1
generated_at: "2026-04-21T10:30:00Z"
generated_by: "concord@0.1.0"
scope: project

roots:
  - "claude-code:skills:commit-msg"
  - "claude-code:mcp_servers:airtable"
  - "claude-code:plugins:github-integrator"

nodes:
  "claude-code:skills:commit-msg":
    # ... (LockNode 상세)
  "claude-code:mcp_servers:airtable":
    # ...
  "claude-code:plugins:github-integrator":
    # ...
  "claude-code:plugins:git-helper":   # transitive from github-integrator
    # ...
```

#### 5.3.1 LockNode Schema

```typescript
export const LockNodeSchema = z.object({
  id: z.string(),
  type: z.enum(["skills", "subagents", "hooks", "mcp_servers", "instructions", "plugins"]),
  provider: z.enum(["claude-code", "codex", "opencode"]),

  // §5.4 3중 digest
  source_digest: z.string().regex(/^sha256:[a-f0-9]{64}$/),
  content_digest: z.string().regex(/^sha256:[a-f0-9]{64}$/),
  catalog_digest: z.string().regex(/^sha256:[a-f0-9]{64}$/),

  // 자산별 필드 분리 (§5.5)
  standard_fields: z.record(z.string(), z.unknown()).default({}),
  concord_fields: z.record(z.string(), z.unknown()).default({}),
  protocol_fields: z.record(z.string(), z.unknown()).default({}),

  // Resolved source descriptor (resolved URL / ref / path, unresolved interpolation 은 declared 에)
  resolved_source: ResolvedSourceSchema,

  // Declared = manifest 원문 (passthrough for unknown fields)
  declared: z.record(z.string(), z.unknown()),

  // 결정 D 확장 (§5.7)
  install_mode: z.enum(["symlink", "hardlink", "copy"]),
  install_reason: InstallReasonEnum,
  shell_compatibility: z.enum(["ok", "incompatible", "na"]).default("na"),
  drift_status: z.enum(["none", "source", "target", "divergent", "env-drift"]).default("none"),

  // raw vs normalized hash (결정 B)
  raw_hash: z.string().regex(/^sha256:[a-f0-9]{64}$/),
  normalized_hash: z.string().regex(/^sha256:[a-f0-9]{64}$/),

  // Transitive 관계 (Claude plugin)
  dependencies: z.array(z.string()).optional(),
  min_engine: z.string().optional(),

  // 설치 시점
  installed_at: z.string().datetime(),

  // 경로 정보
  install_path: z.string().describe("실제 provider 네이티브 경로"),
});

export type LockNode = z.infer<typeof LockNodeSchema>;
```

### 5.4 3중 Digest (Source / Content / Catalog)

**목적**: drift 감지 / reproducibility / transitive 일관성을 각 축으로 분리.

| Digest | 범위 | 계산 |
|---|---|---|
| **`source_digest`** | Source reference (git ref, http sha256, npm version lock 등) | Resolved source 좌표의 정규화된 representation 에 대한 sha256 |
| **`content_digest`** | 설치된 파일의 실제 bytes (정규화 후) | 파일 tree merkle hash (file path + normalized content sha256 의 sorted concat) |
| **`catalog_digest`** | 노드의 manifest declared + concord_fields + protocol_fields | declared JSON canonical form sha256 |

**용도**:
- `source_digest` 변경 → source 자체 변경 (업스트림 업데이트) → `concord update` 트리거
- `content_digest` 변경 → 설치본 bytes 변경 (외부 수정 의심) → drift 감지 (§5.7)
- `catalog_digest` 변경 → manifest 변경 → re-resolve 필요

**normalized_hash vs raw_hash** (결정 B):
- `raw_hash` = byte-exact content hash (BOM, EOL 포함)
- `normalized_hash` = 표준화 후 hash (LF 강제, BOM 제거)
- 목적: formatter false-positive drift 회피

### 5.5 자산별 필드 분리 (standard_fields / concord_fields / protocol_fields)

**결정 C §5 설계**: 한 node 의 필드를 **출처 기준** 으로 3종으로 분리.

| 필드 세트 | 출처 | 예 |
|---|---|---|
| **`standard_fields`** | agentskills.io / MCP spec 등 공식 표준 | `description`, `license`, `compatibility`, `transport: stdio` |
| **`concord_fields`** | concord 가 부착한 메타데이터 | `source_id`, `installed_by`, `last_synced_at` |
| **`protocol_fields`** | Provider-specific 필드 | Claude `hooks`, Codex `features.codex_hooks`, OpenCode `permission.skill` |

**저장 규칙**:
- Unknown 필드 (§2.4 Generic Unknown) 는 `declared` 원문에 passthrough, 3 세트 어디에도 분류되지 않음
- 3 세트는 schema 상 **record<string, unknown>** — Zod 가 런타임 해석 안 함 (Π2 하위 원칙 "기록 허용, 의미 부여 금지")

### 5.6 `capability_matrix` — Discriminated Union (Q4 γ Hybrid)

**결정 C Q4 확정**: 내부 = β 4 status + reason enum 고정 / 외부 = α 기호 렌더링. 20줄 pure function 렌더러.

#### 5.6.1 Schema

```typescript
export const CapabilityCellSchema = z.discriminatedUnion("status", [
  z.object({
    status: z.literal("supported"),
    count: z.number().int().min(0),
    install_mode: z.enum(["symlink", "hardlink", "copy"]).optional(),
    install_reason: InstallReasonEnum.optional(),
    shell_compatibility: z.enum(["ok", "incompatible", "na"]).default("na"),
    drift_status: z.enum(["none", "source", "target", "divergent", "env-drift"]).default("none"),
  }),
  z.object({
    status: z.literal("detected-not-executed"),
    count: z.number().int().min(0),
    detected: z.number().int().min(0),
    reason: ReasonEnum,  // 예: "CodexVersionTooOld", "FeatureFlagDisabled", "WindowsUnsupported"
    install_mode: z.enum(["symlink", "hardlink", "copy"]).optional(),
    install_reason: InstallReasonEnum.optional(),
    shell_compatibility: z.enum(["ok", "incompatible", "na"]),
    drift_status: z.enum(["none", "source", "target", "divergent", "env-drift"]).default("none"),
  }),
  z.object({
    status: z.literal("na"),
    reason: z.literal("ProviderNotInstalled").or(z.literal("AssetTypeNotApplicable")),
  }),
  z.object({
    status: z.literal("failed"),
    reason: ReasonEnum,  // 예: "NetworkError", "PluginJsonMissing", "ParseFailed"
    error_detail: z.string().optional(),  // 단, secret 값 금지 (E-17)
  }),
]);

export const CapabilityMatrixSchema = z.record(
  z.enum(["claude-code", "codex", "opencode"]),
  z.record(
    z.enum(["skills", "subagents", "hooks", "mcp_servers", "instructions", "plugins"]),
    CapabilityCellSchema
  )
);
```

#### 5.6.2 `ReasonEnum` + `InstallReasonEnum` (결정 D D-12 + 결정 E 확장)

```typescript
// 전체 ReasonEnum (capability_matrix cell 의 status 에 동반)
export const ReasonEnum = z.enum([
  // Install 관련 (InstallReasonEnum subset 과 교집합)
  "UserExplicit",
  "Auto",
  "WindowsDefault",
  "NoPrivilege",
  "DevModeDisabled",
  "FsUnsupported",
  "CrossDevice",
  "CrossVolume",
  "PathLimit",
  "PathTooLong",
  "WSLFilesystem",

  // Provider / 실행 호환
  "CodexVersionTooOld",
  "WindowsUnsupported",
  "FeatureFlagDisabled",
  "ShellIncompatible",

  // 관측 실패 (status=failed 용)
  "PluginJsonMissing",
  "ParseFailed",
  "NetworkError",
  "MinEngineUnmet",         // §5.8 Claude plugin min_engine 불일치

  // 보간 / 에러 reporting (lock 에 기록되지 않음, CLI output 전용)
  "EnvVarMissing",          // E-4 fail-closed. §8.5 주석 참조

  // status=na 전용
  "ProviderNotInstalled",
  "AssetTypeNotApplicable",
]);

export type Reason = z.infer<typeof ReasonEnum>;

// InstallReasonEnum: install_mode 결정의 provenance 전용 subset
// (§5.7.1 lock.nodes.<id>.install_reason + capability_matrix.<...>.install_reason)
export const InstallReasonEnum = z.enum([
  "UserExplicit",       // manifest 에 install: symlink|hardlink|copy 명시
  "Auto",               // auto default, symlink 성공
  "WindowsDefault",     // Windows + auto + Developer Mode off → copy
  "NoPrivilege",        // Unix EPERM
  "DevModeDisabled",    // Windows symlink EPERM
  "FsUnsupported",      // FAT/exFAT 등
  "CrossDevice",        // hardlink 시도 중 다른 볼륨
  "CrossVolume",        // 동일
  "PathLimit",          // 260자 초과
  "PathTooLong",        // 동일
  "WSLFilesystem",      // WSL + /mnt/c/ 감지
]);

export type InstallReason = z.infer<typeof InstallReasonEnum>;
```

**관계**: `InstallReasonEnum ⊂ ReasonEnum` (install provenance 전용 subset). 두 enum 은 Phase 1 에서 **union source** 로 관리되어 `InstallReasonEnum` 확장 시 `ReasonEnum` 도 동시 업데이트 (단일 validator 구현 원칙, §5.6.3 가드레일 3).

**확장 정책**: **additive only** (Π5). enum 제거 = breaking. 자유 문자열 금지 (K8s #50798 의 conditions `Reason/Message` 패턴 교훈).

#### 5.6.3 기호 렌더러 (20줄 Pure Function)

```typescript
// file: src/capability-matrix/render.ts
export function renderSymbol(cell: CapabilityCell): string {
  switch (cell.status) {
    case "supported":
      return String(cell.count);
    case "detected-not-executed":
      return `${cell.count}*`;  // '*' 로 lossy 명시
    case "na":
      return "-";
    case "failed":
      return "?";
  }
}

export function renderMatrixTable(matrix: CapabilityMatrix): string {
  // 20줄 pure function (table builder)
  // 예: "claude-code  skills=5  mcp_servers=3  hooks=2*"
  //      (2* = 설치됐지만 실행 불가, reason 은 --compat drill-down)
}
```

**가드레일 4** (결정 C Q4):
1. `reason` enum 고정 (K8s #50798 conditions `Reason/Message` 논의 교훈 — 자유 문자열 금지)
2. JSON Schema = source of truth (Zod `discriminatedUnion` deprecate 예정 대비)
3. 단일 validator 구현 (OpenAPI 교훈 — 다중 구현 시 drift)
4. **Illegal states unrepresentable** — 예: `status=supported + reason=X` 은 Zod 로 불가능 (discriminated union 구조)

#### 5.6.4 Q2' 심각 3종 판정 (결정 C 섹션 7 Q2' 확정)

`concord doctor` 가 경고로 발화하는 3 조건. Q4 schema 에서 자동 유도:

| # | 이름 | 판정 조건 | 심각도 | doctor 발화 |
|---|---|---|---|---|
| **(a)** | 환경 불일치 | `status === "supported"` + `count > 0` + provider 미탐지 | 경고 | "provider 설치 필요" |
| **(b)** | Lossy 기호 실재 | `status === "detected-not-executed"` + provider 활성 | 정보~경고 | reason 별 메시지 (예: `CodexVersionTooOld` → 업그레이드 안내) |
| **(c)** | Flag gated unmet | (b) ∩ `reason === "FeatureFlagDisabled"` | 경고 + remediation | "Codex `features.codex_hooks = true` 필요" |

**`status: failed`** → 오류로 즉시 발화, **`status: na`** → 침묵.

**`--json` 출력**: TTY 침묵 여부와 무관하게 **항상** 전체 matrix + remediation hint 포함 (§1.10 ❹).

### 5.7 `install_mode` / `install_reason` / `shell_compatibility` / `drift_status` (결정 D 확장)

결정 D Q4 capability_matrix 확장 (Π5 additive).

#### 5.7.1 `install_mode`

```yaml
install_mode: copy        # symlink | hardlink | copy
install_reason: WindowsDefault  # reason enum 중 install 관련
```

**manifest 입력 vs lock 저장 분리** (D-1):

| 레이어 | 형식 | 예 |
|---|---|---|
| Manifest 입력 (ε UX) | `install: auto \| symlink \| hardlink \| copy` | `install: auto` |
| Lock 저장 (δ machine contract) | 실제 적용된 구체값 + `install_reason` | `install_mode: copy` + `install_reason: WindowsDefault` |

**`auto` 동작 정책** (D-1):
- **Windows**: `copy` 우선. symlink 는 Developer Mode 활성 + 자산 타입 허용 시 opt-in
- **Unix**: `symlink → hardlink → copy` cascade (EPERM catch → fallback)
- **Claude `.claude/skills/` = copy 강제** (#25367 버그, D-14)
- **Claude `.claude/rules/` = symlink 허용** (공식)

#### 5.7.2 `shell_compatibility`

```yaml
shell_compatibility: incompatible   # ok | incompatible | na
```

결정 D D-3: 관측 only. Codex hook + Windows + `#!/bin/bash` shebang 보유 시 = `incompatible + reason: ShellIncompatible` (단 shebang 검증은 Π2 에 따라 수행 안 함. 파일 내용은 black box — compatibility 판정은 provider + OS 조합만으로).

#### 5.7.3 `drift_status` (결정 D D-5 + 결정 E E-2a — 4 + 1 상태)

| 상태 | 조건 | 감지 |
|---|---|---|
| `none` | 변경 없음 | `content_digest` 일치 + env 재평가 동일 |
| `source` | 원본만 변경 (symlink/copy 공통) | `source_digest` 불일치 |
| `target` | 복사본만 변경 (copy 모드 전용) | `content_digest` 불일치 + source 는 일치 |
| `divergent` | 양쪽 다 변경 (copy 전용) | 양 digest 불일치 |
| **`env-drift`** | manifest/source 불변 + env 변경 + target 이 구 env 값 보유 | Trigger (sync/update/doctor) 시 env 재평가 → 현재 값과 target 파일 값 비교 |

**Symlink 는 `source-drift` 만 존재** (동일 실체이므로 target-drift 불가능).

**User-modified vs drift 구분 불가능**: concord 는 의도 모름. Π4 에 따라 machine 은 `drift_status` 표기, human 은 doctor 경고 + 사용자 판단 위임.

### 5.8 Claude Plugin Transitive Dependencies + `min_engine`

Claude plugin.json 의 `dependencies` 배열을 lock 의 flat nodes 로 확장. Transitive 포함.

```yaml
roots:
  - "claude-code:plugins:github-integrator"

nodes:
  "claude-code:plugins:github-integrator":
    dependencies:
      - "claude-code:plugins:git-helper"
      - "claude-code:plugins:http-utils"
    min_engine: "1.0.0"

  "claude-code:plugins:git-helper":
    # Transitive node, roots 에 없음
    ...

  "claude-code:plugins:http-utils":
    ...
```

**`min_engine` 체크**: install 시점에서 concord 버전과 비교. 불일치 시 fail-closed (`status: failed`, `reason: MinEngineUnmet`).

### 5.9 `phase2_projections:` — Phase 2 예약 Slot (비규범)

Q1 P3 additive 예약의 **placeholder 슬롯**. **Phase 1 에서는 구현 대상 아님** — 생성하지도 읽지도 않는다. Phase 1.5 착수 시점에 다음 둘 중 하나로 위치 확정:

- (a) top-level 섹션 (본 §5.1 schema 형태)
- (b) 각 node 내부 필드 (`nodes.<id>.phase2_projections`)

정확한 위치·schema 는 Phase 2 RFC + §12.2 Minority **M5** 에서 확정. 본 섹션의 예시는 **비규범 (non-normative)** — Phase 1 구현자는 무시하고, Phase 2 RFC 결정 후 additive 로 도입하면 된다.

```yaml
# Phase 2 도입 후 (위치 미확정, 예시일 뿐)
phase2_projections:
  # asset-level IR preview 가 들어갈 공간
```

**Phase 1 의 현재 동작**:
- concord 는 이 필드를 쓰지 않음 (optional, 미기재)
- 구 concord (v0.x) 가 Phase 2 lock 을 만나면 permissive consumer 로 unknown field 취급 → passthrough, warning
- `lockfile_version` 이 bump 되면 fail-closed

### 5.10 불변식 I1~I6

| 불변식 | 설명 | 도출 | 테스트 |
|---|---|---|---|
| **I1** | Lock 은 deterministic 재생성 (manifest + env + source 고정 시 byte 수준 동일) | Π1 | Golden: 같은 입력 → 같은 lock bytes |
| **I2** | Field 는 Π5 3줄 룰 준수 (additive) | Π5 | Schema diff CI 체크 |
| **I3** | Lossy 는 status + reason 명시 | Π6 | `status=detected-not-executed` → reason 필수 |
| **I4** | lock + `--json` 은 항상 완전 | Π4 | `--json` 출력 = lock schema 정합 |
| **I5** | Secret resolved 값 lock 저장 금지 | E-3, Π1 | Static 분석: lock 에 `{env:` 이외 env 값 금지 |
| **I6** | Plugin intact (관측만, 조작 X) | Π2 | `declared` = manifest 원문 보존, 해체 불가 |

### 5.11 `raw_hash` vs `normalized_hash`

**결정 B 설계**: formatter false-positive drift 회피.

```yaml
nodes:
  "claude-code:skills:commit-msg":
    raw_hash: "sha256:abc..."         # bytes 정확 (BOM, CRLF 포함)
    normalized_hash: "sha256:def..."  # LF 강제 + BOM 제거 후 hash
```

**Drift 감지 로직**:
- `normalized_hash` 일치 → 실질 동일 (formatter 차이만) → drift 아님
- `normalized_hash` 불일치 → 실제 content 변경 → drift (§5.7.3)

**결정 D 연계**: Windows EOL (CRLF) 는 `normalized_hash` 에서 LF 로 정규화. `strip-bom` 로 BOM 제거.

### 5.12 Validator + Golden 테스트

```typescript
// file: src/schema/validate-lock.ts
export function validateLock(raw: unknown): Lock {
  // 1. Lockfile version 체크
  if (raw?.lockfile_version !== 1) {
    throw new FailClosedError("lockfile_version must be 1 (Phase 1)");
  }

  // 2. Zod 파싱
  const parsed = LockSchema.parse(raw);

  // 3. I1 deterministic 검증 (optional, regen 테스트에서)
  // 4. I5 secret leak 검증 (lock 에 { env: ... } 외 env 값 금지)
  checkNoSecretLeak(parsed);

  // 5. I6 plugin intact 검증 (declared = manifest 원문 일치)
  checkPluginIntact(parsed);

  return parsed;
}
```

**Phase 1 POC 골든 테스트** (§12.1 POC-5):
- Plugin introspection 엔진 정확성: Claude `plugin.json` / Codex `.codex-plugin/plugin.json` / OpenCode `package.json#main` 파싱 → `capability_matrix` 계산
- `capability_matrix` 필드명 이름-역할 괴리 테스트 (Homebrew Brewfile.lock 교훈)
- Deterministic 재생성: 같은 manifest + env → bit-exact lock bytes
- Secret leak: lock 파일을 grep 해도 resolved env 값 없음 (fail-closed 테스트)

---



## §6. CLI 11 명령 Specification

### 6.0 용어 정책 (결정 B)

| 영역 | 용어 |
|---|---|
| CLI flag | `--scope` |
| 내부 코드 타입 | `ConfigScope` (JS/TS "scope" 충돌 회피) |
| 문서 | "scope" 통일 |
| 병합 순서 설명 | **`precedence`** (별도 용어) — "scope" 는 영역 구분, "precedence" 는 우선순위 |

과거 "layer" 용어는 전부 "scope" 로 sweep. 본 문서도 "layer" 용어 미사용.

### 6.1 11 명령 개요

```
# 시작 & 진단
concord init [--scope <s>]          # 빈 manifest scaffold
concord detect                       # agent 감지 (manifest 안 건드림, cache 만 기록)

# Manifest 조작 (add/remove 는 Phase 2+)
concord adopt [<path>] [--scope <s>] # 기존 시스템 자산 → manifest 등록 (terraform import 시맨틱)
concord import <file|--url>          # 외부 manifest entry 병합
concord replace <file|--url>         # 외부 manifest 로 통째 교체 (자동 백업)
concord update [<id>]                # source 재fetch

# 적용
concord sync [--scope <s>]           # manifest → provider 타겟 적용
concord sync --file <path>
concord sync --url <url> --sha256 <h>

# 진단·조회
concord doctor                       # drift / marker / feature flag / schema / orphan 진단
concord list [--scope <s>]           # 설치된 entry 목록
concord why <id>                     # entry 출처·체인 추적

# 정리 (β3 신설)
concord cleanup                      # opt-in extraneous prune

# Secret debug (E-8)
concord secret debug --env=<name>    # Resolved value 조회 (audit log 기록)
```

**Phase 2+ 로 이관된 명령** (§6.17 참조):
- `concord add <source>` — 원자적 fetch + install + register
- `concord remove <id>` — manifest + 타겟 동시 제거
- `concord rollback` — 직전 sync 되돌리기
- `concord bootstrap` — 신규 머신 셋업 one-shot

### 6.2 `concord init`

**용도**: 빈 manifest scaffold 생성.

```bash
concord init                     # 인터랙티브 prompt ("어느 scope?")
concord init --scope user         # ~/.concord/concord.user.yaml 생성 + $EDITOR
concord init --scope project      # ./concord.yaml 생성
concord init --scope enterprise   # 권한 precheck + 경고
```

**생성 내용**:

```yaml
# ./concord.yaml (project scope 예시)
concord_version: ">=0.1"
skills: []
subagents: []
hooks: []
mcp_servers: []
instructions: []
plugins: []
```

**동작**:
- 이미 파일 존재 시 실패 (overwrite 안 함, `--force` 도 Phase 1 에선 미지원)
- scope=user/enterprise 는 `~/.concord/` 디렉토리 없으면 생성 (`is-elevated` 체크로 enterprise 는 권한 precheck)
- scope=project 는 cwd 에 생성
- scope=local 은 cwd 에 `concord.local.yaml` 생성

### 6.3 `concord detect`

**용도**: 설치된 agent 감지 (**read-only**, manifest 안 건드림).

```bash
concord detect
```

**감지 내용**:
- Agent 설치 여부: claude-code CLI / codex CLI / opencode CLI 존재
- 버전: `claude --version`, `codex --version`, `opencode --version`
- 경로: `which` / `where`
- 권한: `is-elevated`
- Feature flag: Codex `features.codex_hooks` 상태 (POC-7)
- Plugin 설치 여부 (있다면)

**결과 저장**: `~/.concord/.detect-cache.json` (gitignored).

```json
{
  "generated_at": "2026-04-21T10:00:00Z",
  "agents": {
    "claude-code": {
      "installed": true,
      "version": "2.0.1",
      "path": "/usr/local/bin/claude"
    },
    "codex": {
      "installed": true,
      "version": "0.119.0",
      "path": "/usr/local/bin/codex",
      "features": { "codex_hooks": true }
    },
    "opencode": {
      "installed": true,
      "version": "1.4.0",
      "path": "/usr/local/bin/opencode"
    }
  }
}
```

`concord sync` / `doctor` / `adopt` 가 detect cache 참조.

### 6.4 `concord adopt` — Context-aware + Terraform apply 패턴

**용도**: 기존 시스템 자산을 manifest 에 등록 (terraform import 시맨틱).

```bash
concord adopt                    # cwd 기준 context-aware
concord adopt <path>             # 특정 경로만 스캔
concord adopt --scope user       # scope 명시
concord adopt --scope enterprise # never-default, 명시 + 권한 precheck
concord adopt --yes              # prompt skip
concord adopt --write            # 동일 (alias)
concord adopt --dry-run          # preview 만
```

#### 6.4.1 Context-aware Default (D-W1)

| 조건 | 기본 scope | 이유 |
|---|---|---|
| cwd 에 project manifest 존재 | **user + project** | 팀 멤버 (~35%) 세그먼트 최적 |
| cwd 에 project manifest 없음 | **user 만** | Solo (~40%) 세그먼트 자연스러움 |
| `--scope X` 명시 | X 만 | 사용자 의도 override |
| `--scope enterprise` | 명시 + 권한 precheck | never-default |
| `--scope local` | 명시 | never-default (gitignored 실험 영역) |

#### 6.4.2 Terraform apply 패턴

```
$ concord adopt
Scanning user + project...
Found 5 candidates:
  + user:    claude-code:skills:code-reviewer  @ ~/.claude/skills/code-reviewer
  + user:    codex:skills:commit-msg           @ ~/.agents/skills/commit-msg
  + project: claude-code:skills:lint-checker   @ .claude/skills/lint-checker
  + project: claude-code:mcp:airtable          @ .mcp.json (via block-merge)
  ℹ️ Note: OpenCode also reads ~/.claude/skills/ natively (cross-path observation)

Apply these changes to manifests? [y/N] █
```

| Mode | 동작 |
|---|---|
| **기본 (TTY)** | preview + y/N prompt |
| `--yes` or `--write` | prompt skip, 즉시 적용 |
| `--dry-run` | preview 만, 확정 안 함 |
| **non-TTY (CI), flag 없음** | conservative fail (exit 1 + 안내) |

#### 6.4.3 Project manifest 없을 때

**TTY**:
```
$ concord adopt
No project manifest found in cwd.
Create one at ./concord.yaml? [y/N]
```

**non-TTY (CI)**:
```
$ concord adopt
ERROR: project manifest missing. Run `concord init --scope project` first.
exit 1
```

`--init` 플래그로 CI 에서도 auto-create 허용.

#### 6.4.4 Cross-path 감지

OpenCode 가 `~/.claude/skills/` 도 native 로 읽는 등의 사실은 **경고 + `concord doctor` 리포트**. 실제 provider 등록은 1:1 유지.

**Phase 2+**: provider 다중화 (1 자산 → `providers: [claude-code, opencode]`) 는 cross-tool adapter 시점에 재평가.

### 6.5 `concord import`

**용도**: 외부 manifest entry 를 내 manifest 에 병합.

```bash
concord import ./friend-concord.user.yaml
concord import --url https://github.com/.../concord.user.yaml --sha256 abc...
```

**동작**:
- 내 manifest 를 **format-preserving 편집** (`eemeli/yaml`)
- 기존 entry 와 주석 보존 (§10)
- 충돌 시 인터랙티브 resolution

**충돌 해결 UX**:
```
Found 5 entries in external manifest:
  + skills:code-reviewer       (new)
  + mcp:airtable               (conflict: already in your user.yaml)

conflict resolution for mcp:airtable:
  [k]eep mine  [r]eplace  [a]lias  [s]kip  ?
```

**URL import**: `--sha256 <hash>` 필수 (§6.15 보안 모델).

### 6.6 `concord replace`

**용도**: 외부 manifest 로 통째 교체.

```bash
concord replace ./friend-concord.user.yaml
concord replace --url https://.../concord.user.yaml --sha256 abc...
```

**동작**:
- 자동 백업: `~/.concord/concord.user.yaml.bak.<timestamp>`
- y/N confirm (TTY), `--yes` 로 bypass
- URL 지원 + `--sha256` digest pin

```
$ concord replace ./friend-concord.user.yaml
  Will replace ~/.concord/concord.user.yaml entirely.
  Backup: ~/.concord/concord.user.yaml.bak.2026-04-19-103045
  Continue? [y/N]
```

### 6.7 `concord sync` — 2-Tier CLI 모델

**용도**: manifest → provider 타겟 적용.

#### 6.7.1 Tier 1 — Bare sync (deterministic)

```bash
concord sync                               # project scope (기본)
concord sync --scope user                  # 단일 scope
concord sync --scope user,project,local    # CSV 다중 지정 (kubectl 패턴)
# concord sync --all                         ← 제거됨 (Phase 1 에서)
```

**핵심**:
- **bare `concord sync` 는 항상 project scope** — 예측 가능성
- `--scope` 로 명시 시 엄격 (파일 없음 = 에러, 단 enterprise 는 warn + skip)
- "모든 scope" 필요 시: CSV 다중 지정 (`--scope user,project,local`)

#### 6.7.2 Tier 2 — Explicit source (파일명 자동 scope 추론)

```bash
concord sync --file ./concord.user.yaml
# → 파일명 "user" → scope=user 자동 추론

concord sync --url https://github.com/.../concord.enterprise.yaml --sha256 abc...
# → 파일명 "enterprise" → scope=enterprise 자동 추론 + digest pin 필수
```

- `--file` 또는 `--url` 컨텍스트에서만 파일명 자동 추론 허용
- URL sync 는 **`--sha256` digest pin 필수** (또는 lock TOFU + diff confirm)
- `https://` 만 Phase 1 에서 허용

#### 6.7.3 Sync 동작

1. detect cache 참조 (없으면 auto-run `detect`)
2. manifest 파싱 + validation (§4.8)
3. Secret 보간 (E-2 on-install eager, §8.2)
4. Source fetch (GitFetcher / FileFetcher / HttpFetcher / NpmFetcher / ExternalFetcher / AdoptedFetcher)
5. Install (D-1 install mode 결정: auto cascade)
6. Config round-trip 편집 (§10)
7. Lock 업데이트 (`concord.lock`)
8. Cleanup 은 수행 안 함 (`concord cleanup` 별도)

**Lock 없으면**: guided bootstrap (§6.14).

### 6.8 `concord update`

**용도**: Source 재fetch (drift 감지 시).

```bash
concord update                # 모든 자산
concord update <id>           # 특정 자산
```

**동작**:
- Source digest 재계산 → 원본 변경 확인
- Git source: `git fetch` + ref 비교
- Http source: HEAD + If-Modified-Since (단, `sha256` 고정된 경우 skip)
- Npm source: `npm view` 버전 비교
- drift_status 가 `source` / `divergent` / `env-drift` 로 전환되면 sync 권고

### 6.9 `concord doctor`

**용도**: 전체 진단 (drift, marker, feature flag, schema, orphan).

```bash
concord doctor
concord doctor --json           # 기계 출력 (항상 완전, §1.10 ❹)
concord doctor --compat         # Q2 V3 opt-in drill-down
```

**체크 항목**:

| 체크 | 조건 |
|---|---|
| **Drift 감지** | §5.7.3 4+1 상태 모두 |
| **Marker 무결성** | JSONC/TOML marker 블록 정상 구조 (§10.6) |
| **Feature flag** | Codex `features.codex_hooks`, OpenCode permission 등 |
| **Schema 일관성** | Lock schema 와 manifest schema 교차 검증 |
| **Orphan** | provider 에 있지만 manifest 에 없음 (§7.4) |
| **Shadowed** | scope precedence 에 의해 가려진 자산 |
| **Scope-conflict** | 동일 id 가 다른 scope 에 충돌 |
| **Readonly-managed** | provider 가 관리하는 자산을 concord 가 수정하려 함 |
| **Marker-broken** | Block merge marker 훼손 |

**결정 D D-15 preflight 추가 체크**:

| 체크 | 실행 조건 | 결과 |
|---|---|---|
| Git Bash 감지 | Claude hook + Windows | 부재 시 경고 + `CLAUDE_CODE_GIT_BASH_PATH` 안내 |
| Codex 버전 probe | Codex plugin + hook + Windows | `< 0.119` 경고 + 업그레이드 안내 |
| Developer Mode | `install: symlink` 명시 + Windows | 비활성 시 경고 + auto 권장 |
| Antivirus exclusion | 대량 파일 sync 전 | concord staging 폴더 Defender exclusion 안내 (선택) |
| OneDrive 경로 | install 경로가 OneDrive 하위 | 경고 + cloud-only placeholder 이슈 |

**Q2' 심각 3종 자동 경고** (§5.6.4): doctor 가 `capability_matrix` 를 스캔해 (a)/(b)/(c) 자동 발화.

### 6.10 `concord list`

**용도**: 설치된 entry 목록.

```bash
concord list                        # 감지된 모든 scope
concord list --scope project
concord list --json                 # 기계 출력 (capability_matrix 포함, Q4)
```

**TTY 출력**:
```
scope: project
  claude-code:skills:commit-msg  @ .claude/skills/commit-msg  (installed)
  claude-code:mcp_servers:airtable @ .mcp.json                  (installed)

scope: user
  codex:skills:code-reviewer     @ ~/.agents/skills/code-reviewer  (installed)
  claude-code:plugins:github-integrator  @ ~/.claude/plugins/...  (outdated, run `concord update`)
```

**`--json` 출력**: Lock schema 와 동형 + `capability_matrix` 전체 포함 (§1.10 ❹). **TTY 필드 대칭성** 골든 테스트 필요 (결정 C v2 §7 Minority).

### 6.11 `concord why`

**용도**: Entry 출처·체인 추적.

```bash
concord why claude-code:skills:git-helper
```

**출력**:
```
claude-code:skills:git-helper
  transitively required by: claude-code:plugins:github-integrator (root)
  source: claude-plugin/anthropic/github-integrator@1.2.0 (dependencies)
  install: ~/.claude/plugins/github-integrator/skills/git-helper
  content_digest: sha256:abc...
```

Claude plugin transitive dependency tracing (§5.8) 에 유용.

### 6.12 `concord cleanup` (결정 C 섹션 6 신설)

**용도**: Opt-in, `extraneous` prune (Homebrew Bundle 스타일).

```bash
concord cleanup                      # 미sync (extraneous) 자산 prune
concord cleanup --dry-run
concord cleanup --yes
```

**동작**:
- Extraneous = provider 에 설치되어 있지만 manifest 에 없는 자산 (§7.4)
- opt-in — `sync` 는 cleanup 수행 안 함 (결정 B)
- Atomic rollback: prune 중 실패 시 원상복구 (staging 디렉토리 사용)

**jsonc-morph round-trip preserve 검증** (POC-8): cleanup 이 jsonc 파일의 외부 추가 항목을 망가뜨리지 않는지 골든 테스트.

### 6.13 `concord secret debug` (E-8 Debug 경로)

**용도**: Resolved value 조회 (interactive only, audit log).

```bash
concord secret debug --env=GITHUB_TOKEN
# TTY only, 비-TTY = fail-closed
# 출력: 마스킹된 값 (ghp_***) 또는 -v 확장 시 resolved value
# Audit: ~/.concord/audit.log 에 who/when/what 기록 (resolved value 자체는 기록 X)
```

**왜 분리된 명령인가** (결정 E E-8):
- 일반 CLI 출력에서 resolved value 절대 금지 (E-17)
- 사용자가 명시적으로 debug 를 요청해야만 접근
- Audit trail 강제
- `--json` 으로는 접근 불가 (interactive TTY only)

### 6.14 Guided Bootstrap (첫 실행)

**조건**: lock 없음 + manifest 있음.

```
$ concord sync
ℹ️ No concord.lock found — first run detected.

  Will perform:
    1. Detect installed agents (claude-code, codex, opencode)
    2. Initialize concord.lock
    3. Sync 5 entries from concord.yaml

  Continue? [Y/n]
```

| 모드 | 동작 |
|---|---|
| **기본 (TTY)** | confirm prompt |
| `--yes` | prompt skip |
| `CONCORD_NONINTERACTIVE=1` | 환경변수로 비대화 (CI 용) |
| **non-TTY, flag 없음** | error (guided bootstrap 강제 interactive) |

### 6.15 URL Sync 보안 모델

#### 6.15.1 Phase 1 (즉시)

| 요구 | 상태 |
|---|---|
| `https://` 스킴만 허용 | ✅ |
| `--sha256 <hash>` 필수 OR lock TOFU 기록 | ✅ |
| 첫 fetch dry-run + diff + y/N confirm | ✅ |
| Redirect 추적 표시 (final URL + host + digest) | ✅ |
| 파일명에서 scope 자동 추론 | ✅ |

#### 6.15.2 Phase 1.5

- Enterprise scope URL → **allowlist 강제** (조직 도메인 화이트리스트)
- Audit log 기록 (URL + digest + timestamp)

#### 6.15.3 Phase 4 (cross-tool adapter 시점)

- cosign / minisign signature 검증
- Registry / marketplace 통합

#### 6.15.4 위협 모델 선례

- [Brew Hijack 사건](https://www.koi.ai/blog/brew-hijack-serving-malware): host 탈취 → 다음 fetch 악성
- [kubectl apply URL](https://www.elastic.co/guide/en/security/8.19/kubectl-apply-pod-from-url.html): 보안팀 공격 패턴 분류
- skill/hook = **코드 실행에 가까운 자산** → `curl | bash` 안티패턴 회피 필수

### 6.16 `--json` vs TTY 분리 (Π4)

**핵심 계약** (§1.10 ❹):

| 출력 | 내용 |
|---|---|
| `--json` | **항상** 전체 matrix + remediation hint. Machine contract |
| TTY | 일상 침묵, Q2' (a)(b)(c) 심각 3종만 자동 경고. Human UX |
| `--compat` | TTY 에서 compat drill-down opt-in (Q2 V3) |

**Consumer 계약** (Π5 하위 원칙): CI 스크립트는 **permissive parser** 사용 (Phase 2 additive 필드 출현 대비).

**TTY 필드 대칭성** (Minority): `list` / `doctor` 가 TTY 와 `--json` 양쪽에서 동일 자산 정보를 보여주는지 골든 테스트 필요 (결정 C v2 §7).

**Secret 출력 규칙** (E-8):

| 출력 | Secret 처리 |
|---|---|
| TTY | 마스킹 (`***`) 또는 unresolved expression |
| `--json` | **Unresolved expression 만** (절대 resolved 금지, E-17) |
| `concord secret debug` | Interactive TTY only, audit log |

### 6.17 Phase 2+ 이관된 명령

**이관 근거**:
- concord 핵심 가치 = **"multi-provider drift 감지·동기화"** (패키지 매니저 아님)
- Provider 공식 도구 (`claude mcp add`, `codex mcp add`, OpenCode `opencode.json#plugin`) 가 이미 install 담당
- chezmoi / brew bundle / helm 이 동일 "분리 모델" 로 프로덕션 검증
- Phase 1 risk 축소 (multi-provider fetch/install 로직 구현 부담 경감)

**이관된 명령**:

| 명령 | Phase 2+ 재평가 조건 |
|---|---|
| `concord add <source>` | cross-tool-sync 범위 확정 후 |
| `concord remove <id>` | `add` 와 동시 재평가 |
| `concord rollback` | 사용자 요구 누적 시 |
| `concord bootstrap` | 신규 머신 셋업 one-shot (별도 명령으로 분리, `--all` 대신) |

### 6.18 4 Scope 간 동작 요약표

| 작업 | default scope | 참고 |
|---|---|---|
| `concord sync` | project | bare sync deterministic |
| `concord adopt` | cwd 기준 자동 (user 또는 user+project) | context-aware |
| `concord init` | interactive prompt | "어느 scope?" |
| `concord doctor` | 모든 감지된 scope | 진단 범위 확장 |
| `concord list` | 모든 감지된 scope | 조회 |

**Enterprise / Local (never-default)**:
- 항상 `--scope enterprise` 또는 `--scope local` 명시 필요
- Enterprise: 권한 precheck + 경고
- Local: gitignored 영역, 개인 책임

### 6.19 사용자 시나리오 (walk-through)

#### Scenario A — Solo 개발자 처음 사용
```bash
concord init --scope user                    # ~/.concord/concord.user.yaml 생성 + $EDITOR
concord adopt                                # user 만 스캔 (cwd 프로젝트 아님)
                                              # → y/N confirm → manifest 등록
concord sync --scope user                    # 실제 설치 (ensure)
```

#### Scenario B — 팀 멤버 기존 repo 도입
```bash
cd ~/team-project                            # concord.yaml 이미 있음
concord adopt                                # user + project context-aware 스캔
                                              # → y/N confirm → 양쪽 manifest 등록
concord sync                                 # project 기본 sync
git add concord.yaml concord.lock            # 팀 공유
```

#### Scenario C — 친구가 공유한 manifest 받기
```bash
concord import --url https://.../concord.user.yaml --sha256 abc...
                                              # → diff 표시 → y/N → 내 user.yaml 에 entry 병합
concord sync --scope user
```

#### Scenario D — 완전 신규 머신
```bash
concord sync                                  # lock 없음 → guided bootstrap
                                              # ℹ️ First run detected. ... [Y/n]
                                              # → y → 자동 진행
```

---



## §7. State Machine & Drift Detection

### 7.0 모델 개요 — Homebrew Bundle 스타일 (결정 C 섹션 6)

Phase 1 의 concord 상태 머신은 **모델 B (Homebrew Bundle 스타일)** 를 채택한다. 모델 A (2층 이분법) 대비 단순 + 선례 풍부.

- **State 3개**: `installed` / `outdated` / `missing`
- **Event 2개**: `integrity-mismatch` / `install-failed`
- **Opt-in 추가 상태**: `extraneous` (manifest 에 없지만 provider 에 있음)

결정 B 의 상태 머신 확장 (drift/orphan/shadowed/scope-conflict/readonly-managed/marker-broken) 은 §7.4 에서 다룬다.

### 7.1 Asset State 3 + Extraneous

| State | 조건 | 다음 sync 시 동작 |
|---|---|---|
| **`installed`** | manifest 에 있음 + provider 에 있음 + 3 digest 일치 | skip |
| **`outdated`** | manifest 에 있음 + provider 에 있음 + source_digest 불일치 (업스트림 변경) | update (source 재fetch) |
| **`missing`** | manifest 에 있음 + provider 에 없음 | install (fetch + install) |
| **`extraneous`** (opt-in) | manifest 에 없음 + provider 에 있음 | (sync 에선 noop) → `concord cleanup` 에서 prune |

**`extraneous` 의 철학** (Homebrew Bundle):
- `sync` 는 manifest 기준 **확실한 것만** 건드림 (install/update)
- `cleanup` 은 별도 명령 — 사용자가 "정말 지워도 될 때만" 호출
- Concord 는 provider 에 설치된 것을 **조용히 지우지 않는다** (Π2, Π3 존중)

### 7.2 Transition Events (2개)

| Event | 발생 조건 | 동작 |
|---|---|---|
| **`integrity-mismatch`** | `content_digest` 가 기대값과 다름 (설치본 bytes 훼손 의심) | sync 는 refuse + 에러 reporting. `concord doctor` 에서 drift 상세 |
| **`install-failed`** | 설치 자체 실패 (권한 / 디스크 / 네트워크 / 파싱) | lock 에 `status: failed` + `reason: <enum>` 기록 (Π6). Atomic rollback (staging 경로 복구) |

**`integrity-mismatch` 범위** (결정 C Q1 P3): **`content_digest` (installed bytes) 에 한정**. `source_digest` 불일치는 **정상 drift** (`drift_status: source`) 로 취급하여 `concord update` 로 반영 (§7.1 `outdated` state). `capability_matrix` 변화는 **진단 데이터** 이므로 event 트리거 안 함 (Π1).

### 7.3 Drift Detection — 4 + 1 상태

**결정 D D-5 + 결정 E E-2a 통합**:

| 상태 | 조건 | 감지 방법 |
|---|---|---|
| **`none`** | 변경 없음 | `content_digest` 일치 + env 재평가 동일 |
| **`source`** | 원본만 변경 (symlink/copy 공통) | `source_digest` 불일치 |
| **`target`** | 복사본만 변경 (copy 모드 전용) | `content_digest` 불일치 + source_digest 일치 |
| **`divergent`** | 양쪽 다 변경 (copy 전용) | 양 digest 불일치 |
| **`env-drift`** | manifest/source 불변 + env 값 변경 + target 파일이 구 env 값 | Trigger 시 env 재평가 → 현재 값 ↔ target 파일 내용 비교 |

#### 7.3.1 Symlink vs Copy 모드의 차이

- **Symlink 모드**: target 은 동일 실체. `target-drift` / `divergent` 불가능 — `source` / `env-drift` / `none` 만 발생 가능
- **Copy 모드** / **Hardlink 모드**: target 은 별도 copy. 4+1 상태 모두 가능

**Schema 교차검증** (Zod refine, validator 단계에서 enforce):

```typescript
// file: src/schema/lock.ts (LockNodeSchema 에 적용)
const LockNodeSchemaWithDriftCheck = LockNodeSchema.refine(
  (node) => {
    if (node.install_mode === "symlink") {
      return ["none", "source", "env-drift"].includes(node.drift_status);
    }
    return true;
  },
  { message: "symlink install_mode cannot have target/divergent drift_status" }
);
```

이 refine 이 실패하면 `validateLock` 이 parse error 를 던진다 (§5.12).

#### 7.3.2 Env-drift 판정 로직 (결정 E E-2a)

```
매 trigger 시 (sync/update/doctor):
  1. env 재평가 (on-install eager, §8.2)
  2. 각 interpolation site 의 resolved 값 계산
  3. target 파일 내용과 비교
  4. 다르면 env-drift 표시
```

**왜 별도 상태인가**:
- `source-drift` 와 구분해야 사용자가 혼동 안 함 ("왜 내 manifest 안 건드렸는데 drift 야?")
- Doctor 는 정보 표시, `sync` 재실행 시 자동 반영 (E-2a)

#### 7.3.3 User-modified vs Drift 구분 불가능

- concord 는 의도 모름 (Π4)
- Machine (`--json`/lock): `drift_status` 필드로 객관 표기
- Human (TTY doctor): 경고 + 사용자 판단 위임 ("외부 수정 가능성 있음, `concord update` 로 반영 또는 `concord sync` 로 덮어쓰기")

### 7.4 기타 상태 (결정 B 상태 머신 확장)

#### 7.4.1 `orphan`

- **정의**: manifest 에 있지만 provider 가 인식 못 함 (예: 경로 자동 스캔 범위 밖)
- **감지**: `concord doctor` 에서 리포트
- **대응**: 경로 오류 수정 또는 manifest 에서 제거

#### 7.4.2 `shadowed`

- **정의**: Scope precedence 에 의해 가려진 자산 (예: user scope 에 같은 id 가 있어서 project scope 자산이 무효)
- **감지**: `concord doctor`
- **대응**: alias / rename / scope 조정

#### 7.4.3 `scope-conflict`

- **정의**: 같은 id 가 여러 scope 에 충돌 (+ alias/override 없음)
- **처리**: parse error (§4.3.1 ID 규칙 + D-11 case collision 동일 패턴)

#### 7.4.4 `readonly-managed`

- **정의**: Provider 가 관리하는 파일 (예: `~/.claude/settings.json` 의 provider 소유 영역) 에 concord 가 쓰려 함
- **대응**: marker 블록 외 영역은 조작 금지. marker 블록 내부만 concord 소유 (§10.6)

#### 7.4.5 `marker-broken`

- **정의**: concord 가 심은 marker 가 사용자 편집 등으로 훼손됨 (예: 닫는 marker 누락)
- **대응**: `concord doctor` 가 경고 + 수동 수정 안내. `concord sync` refuse

### 7.5 `concord cleanup` — Opt-in Extraneous Prune

§6.12 참조. 핵심 속성:

- **opt-in** — `sync` 에서 자동 수행 안 함
- **atomic** — staging 경로 사용, 실패 시 원상복구
- **`extraneous` 탐지 + prune** — manifest 에 없지만 provider 에 있는 자산 제거

**jsonc-morph round-trip preserve 골든 테스트** (POC-8):
- config 파일에 사용자가 수동으로 추가한 entry (marker 외부) 는 **preserve**
- Concord 가 marker 내부에서 등록한 entry 중 manifest 에 없는 것만 prune

### 7.6 Sync 동작 세부 (install / update / prune / skip)

**결정 B 상태 머신 원자 동작**:

| 동작 | 조건 | 의미 |
|---|---|---|
| **install** | state = `missing` | Fetch + install + lock 업데이트 |
| **update** | state = `outdated` | Source 재fetch + install + lock 업데이트 |
| **prune** | state = `extraneous` + `concord cleanup` 실행 중 | Provider 네이티브에서 제거 + lock 업데이트 |
| **skip** | state = `installed` + 3 digest 일치 | Noop |

**`sync` 의 prune 정책**: Phase 1 `sync` 는 prune 하지 않음 (extraneous 를 건드리지 않음). Prune 은 `cleanup` 전용.

#### 7.6.1 Partial prune 규칙

"필터 투영 후 desired-set" 명문화:

- `sync --scope project` → project scope 의 desired-set 만 대상
- 다른 scope 자산은 unchanged (user scope 에 있는 자산을 project sync 가 건드리지 않음)

#### 7.6.2 Phase 1 축소 (결정 B 리뷰 반영)

- `--rollback` 제외 (Phase 2+)
- Lock merge driver 제외 (Phase 2+)
- Windows CRLF/BOM 완전 지원은 normalized_hash + strip-bom 으로 커버 (Phase 1 유지)
- `concord import` 는 Phase 1.5 범위 (Phase 1 구현 필수)

### 7.7 상태 머신 다이어그램 (텍스트)

```
                 ┌─────────────┐
                 │   missing   │◀──── manifest added / cleanup rollback
                 └──────┬──────┘
                        │ install
                        ▼
  ┌─────────────┐    ┌──────────────┐
  │ extraneous  │◀───│   installed  │────▶ (skip)
  └──────┬──────┘    └──────┬───────┘
         │                   │
  cleanup│                   │ source_digest drift
    prune│                   ▼
         │           ┌──────────────┐
         │           │   outdated   │
         │           └──────┬───────┘
         │                   │ update
         │                   ▼
         │           ┌──────────────┐
         └──────────▶│   installed  │
                     └──────────────┘

Transition events:
  - integrity-mismatch: any state → error (refuse sync, doctor guidance)
  - install-failed:     missing/outdated → missing (atomic rollback)

Drift (orthogonal to state):
  - content_digest mismatch → drift_status ∈ {source, target, divergent}
  - env re-evaluation mismatch → drift_status = env-drift
```

---



## §8. Secret Interpolation Contract (E-1 ~ E-19)

### 8.0 설계 원칙 + Π 접촉 6/7

concord manifest (`concord.yaml`) 에 **환경변수 / 파일 / secret 보간 문법** 을 정의. 결정 E E-1 ~ E-19 전체. 결정 D 와 동급 complexity.

**Π 접촉 지도** (6/7):

| Π | 결정 E 적용 |
|---|---|
| Π1 Reproducibility | E-3 lock unresolved only, E-2a env-drift, E-10 project root whitelist |
| Π2 Plugin intact | E-5 자산 파일 content 미보간, E-7 frontmatter 위임 |
| Π3 Provider-native | E-1 OpenCode 차용, E-5 OpenCode 자산 양보 |
| Π4 Machine vs Human | E-8 `--json` / TTY / debug 경로 분리 |
| Π5 Additive | E-6 `{secret:...}` Phase 2 예약, E-11 default 추가 |
| Π6 Lossy 명시 | E-4 fail-closed (silent empty 금지), E-17 error 투명성 |
| Π7 Explicit boundaries | E-9 nested parse error, E-10 path traversal, E-11 선언적 optional |

Π7 는 E-9/E-10/E-12 에서도 반복 적용.

### 8.1 E-1 / E-13 / E-19 — 문법 통합 (Grammar)

**결정 E E-1**: OpenCode `{env:X}` / `{file:X}` 차용. `{scheme:value}` 중괄호 + 콜론 구분자 mini-DSL.

#### 8.1.1 기본 문법

```yaml
plugins:
  - source:
      type: claude-plugin
      url: "{env:CORP_NPM_REGISTRY}/plugins/github-mcp"
mcp_servers:
  - env:
      GITHUB_TOKEN: "{env:GITHUB_TOKEN}"
      API_KEY: "{file:~/.config/concord/api-key}"
```

**차용 정당성**:
1. **PowerShell `$env:X` 충돌 회피** — `{env:X}` (중괄호) 는 PowerShell 문법과 독립
2. **확장성** — `{file:X}`, `{secret:X}` (Phase 2) 동일 꼴 일관
3. **AI 생태계 일관성** — OpenCode 가 차용 대상 provider (Π3)

**주의**: `${VAR}` 가 업계 압도적 관행이고 `{env:X}` 는 소수파. AI 도구 스코프 내에서만 일관성.

#### 8.1.2 E-13 Escape — `{{env:X}}` (이중 브레이스)

리터럴 `{env:X}` 는 **`{{env:X}}`** 로 escape.

```yaml
description: "Use {{env:FOO}} for env variable interpolation"
# → 출력: "Use {env:FOO} for env variable interpolation"
```

**OpenCode 공식 escape 문법 확인 POC** (POC-12): 공식 docs 업데이트 감시 후 조정 가능 (Minority).

#### 8.1.3 E-19 Windows Path — 첫 번째 콜론만 Scheme 구분자

```yaml
cert_file: "{file:C:/Users/alice/cert.pem}"
# → scheme = "file", value = "C:/Users/alice/cert.pem"
```

**결정 D 정합성**:
- POSIX-only manifest 원칙: Windows literal `C:\` = parse error
- 하지만 `C:/` (forward slash) 는 허용 (Node.js `path.posix` 호환)
- `{file:X}` 내부 value 는 E-10 path traversal 검증도 통과해야 함

### 8.2 E-2 — 보간 시점 (On-install Eager + 축 C 트리거)

**결정**: **On-install eager** — concord 가 파일을 native 경로에 쓸 때 resolve. Lock 은 unresolved 저장.

#### 8.2.1 축 C 트리거 (재실행 semantic)

| 트리거 | 동작 |
|---|---|
| `concord sync` | env 재평가, 모든 보간 대상 재치환. **매번 최신 env 반영** |
| `concord update` | 동일 (source 변경 포함) |
| `concord doctor` | env 재평가, drift 4+1상태 검사 (E-2a) |
| `concord cleanup` | 보간 관여 없음 |

#### 8.2.2 Π1 Corollary

"Lock 은 resolved bytes 가 아니라 **template + env 의존성 목록** 을 고정." 같은 lock + 다른 env = 다른 설치 결과 = **의도된 비대칭** (secret 보호).

### 8.3 E-2a — Env-drift (D-5 4+1 상태)

§7.3.2 에서 상세. 핵심:

| 상태 | 조건 | 대응 |
|---|---|---|
| `env-drift` | manifest/source 불변 + env 값 변경 + target 파일이 구 env 값 보유 | `concord sync` 재실행 시 자동 반영. doctor 는 정보 표시 |

**판정 로직**:
```
매 trigger 시 (sync/update/doctor):
  1. env 재평가
  2. 각 interpolation site 의 resolved 값 계산
  3. target 파일의 현재 값과 비교
  4. 다르면 env-drift 표시 (source-drift 와 구분)
```

### 8.4 E-3 — Lock 저장 정책

**Unresolved expression 만 저장**. Resolved value 절대 lock 에 기록 금지.

**Hash 정책**:
- `raw_hash` = unresolved expression 기준 (결정 B)
- `normalized_hash` = unresolved + 표준화 (LF/BOM) 기준
- **`rendered_hash` 도입 안 함** — resolved 기준 hash 는 Π1 secret 보호 위반. Drift 감지는 E-2a env-drift 로 처리

**선례**: npm package-lock.json / cargo Cargo.lock / pip requirements.txt — 모두 unresolved only 저장.

**I5 불변식 (§5.10)**: Lock 에 resolved env 값이 발견되면 CI 테스트 fail.

### 8.5 E-4 — Missing Variable Fail-closed (E-11 Default 문법 전제)

**결정**: `{env:X}` 는 **required** (fail-closed). Missing 시 parse error.

**에러 메시지**:
```
error: environment variable not set
  location: concord.yaml:42:15
  expression: {env:GITHUB_TOKEN}
  remediation: Set GITHUB_TOKEN in your environment, or use {env:GITHUB_TOKEN:-default}
```

**`--allow-missing-env` 전역 flag 제거**: Π7 "경계는 선언적" 원칙. Optional 은 E-11 문법으로 선언.

**선례**: GitHub Actions "silent empty" 악명 높은 함정 회피. Concord 는 **설정 apply 도구** — silent empty = 잘못된 config 가 쓰여짐.

**`reason: EnvVarMissing`** 은 **CLI failure output 과 에러 reporting 채널** 에서만 사용 (parse error 시 lock 은 업데이트되지 않으므로 lock 에 기록되지 않음). `ReasonEnum` 에 등재되는 이유는 error message / telemetry 일관성 (§5.6.2 참조).

### 8.6 E-5 — 자산별 분리 테이블

**문법 구분 + 자산별 분리 테이블 + OpenCode 대칭 양보**.

| 자산 | concord 보간 | provider 보간 | 정책 |
|---|:---:|:---:|---|
| `concord.yaml` manifest (E-7 allowlist) | ○ | × | concord 전용 |
| Claude `.claude/settings.json` | ○ (allowlist) | × | concord 가 provider config 에 resolve 된 값 기록 |
| Claude hook `command` 내부 `${CLAUDE_PROJECT_DIR}` | × | × (shell) | **passthrough only** |
| **OpenCode `opencode.json`** | **×** (OpenCode 가 한다) | ○ | **Π3 양보** (이중 치환 방지) |
| OpenCode plugin 내부 | × | ○ | provider 영역 |
| MCP `env` 블록 | ○ (manifest side) | — | concord on-install 에서 resolve |
| 자산 파일 내용 (skill.md, hook.sh) | × | × (provider/shell) | Π2 intact |
| skill.md **YAML frontmatter** | × (E-7 회색지대) | — | provider 가 알아서 (Π2+Π3) |

**OpenCode 대칭 양보**: OpenCode 가 `{env:X}` 를 네이티브 지원하므로 concord 가 `opencode.json` 에 보간하면 **이중 치환**. concord 는 OpenCode 자산에서 문법 인식만 하고 보간 X.

### 8.7 E-6 — Phase 2 `{secret:...}` Reserved

**결정**: `{secret:...}` 는 **Phase 2 reserved identifier** (§2.1.2 등재). Phase 1 등장 시 parse error (§2.3 템플릿).

**Phase 2 설계 방향**: K8s `secretKeyRef` 선례 차용 — 단순 URI 가 아닌 structured field:

```yaml
# Phase 2 예시 (Phase 1 미지원, 지금 쓰면 parse error)
mcp_servers:
  - env:
      GITHUB_TOKEN:
        secretRef:
          provider: "1password"
          vault: "Work"
          item: "GitHub"
          field: "token"
```

**Phase 2 우선순위**: 1Password → keychain → aws-ssm (`op` CLI shellout 가장 쉬움, AWS SDK 부담 큼).

### 8.8 E-7 — Allowlist (보간 허용 필드)

§4.5 참조. 요약:

| 필드 종류 | 보간 |
|---|:---:|
| `source.url` / `source.repo` | ✅ |
| `source.ref` / `source.version` | ✅ |
| `env.*` (MCP, hooks) | ✅ |
| `authHeader` / `headers.*` | ✅ |
| `command` (MCP) | ❌ (Π2, provider 위임) |
| `id` / `name` | ❌ (식별자, Π7 parse error) |
| `install` / `scope` / `enabled` | ❌ (동작 제어 필드) |
| 자산 파일 내용 | ❌ (Π2 intact) |
| skill.md YAML frontmatter | ❌ (E-5 회색지대) |

**선례**: GitHub Actions 는 `env:` / `with:` / `run:` 등 제한적 문맥에서만 expression 허용.

**Parse error 시점**: Manifest validation 의 pre-validation 단계 (§4.8).

### 8.9 E-8 — `--json` vs TTY + Debug 경로 분리

**3 경로 (§1.10 ❹)**:

| 출력 | 내용 |
|---|---|
| TTY (human) | Secret 값 **마스킹** (`***`). Unresolved expression 그대로 |
| `--json` (machine) | **Unresolved expression 만**. Resolved value 절대 금지 |
| `concord secret debug --env=X` | TTY only interactive. **Audit log 기록**. Resolved value 사용자 요청 시만 |

**자동 log masking 범위**: GitHub Actions 수준 구현 복잡. Concord 는 **provider 실행 주체 아님** (logs 는 provider 가 생성) → 과잉 구현. Concord 자체 로그만 마스킹 책임.

**Audit log 경로**: `~/.concord/audit.log` (gitignored). 형식:
```
2026-04-21T10:00:00Z  user=alice  action=secret-debug  env=GITHUB_TOKEN  masked=true
```

### 8.10 E-9 — Nested 보간 금지 (Parse Error)

**결정**: `{env:TOKEN_FOR_${env:ENV_NAME}}` 같은 nested = **parse error** (Π7).

**근거**:
- Π5 additive 복잡도 폭탄 (nested parsing grammar 재귀)
- Docker Compose 도 nested 미지원 (선례)
- 구현 난이도 ↑ + 보안 리스크 (user injection)

**에러 메시지**:
```
error: nested interpolation not allowed
  expression: {env:TOKEN_FOR_${env:ENV_NAME}}
  remediation: Flatten to single-level expression
```

### 8.11 E-10 — Path Traversal 방어

**결정**: `{file:X}` 경로는 **project root 하위** 로 제한 (+ 명시 허용 예외).

**검증 로직**:
```typescript
const resolved = path.resolve(projectRoot, filePath);
if (!resolved.startsWith(projectRoot) && !isInAllowedRoot(resolved)) {
  throw new ParseError('path traversal detected');
}
```

**허용 예외**:
- `~/.config/concord/**` — 사용자 config 디렉토리 (명시 허용)
- `~/.concord/**` — concord user home

**금지 예**:
```yaml
api_key: "{file:../../etc/passwd}"   # ❌ parse error
```

**Π1 보호**: project 외부 파일 참조 = 사용자별 다른 내용 = reproducibility 붕괴.

**에러 메시지**:
```
error: path traversal detected
  expression: {file:../../etc/passwd}
  resolved: /etc/passwd
  remediation: File references must resolve within project root or ~/.config/concord/
```

### 8.12 E-11 — Default 문법 (Docker Compose 차용)

**Phase 1 3개 문법**:

| 문법 | 의미 |
|---|---|
| `{env:X}` | Required (unset/empty 시 parse error, E-4) |
| `{env:X:-default}` | Unset/empty 시 `default` 치환 |
| `{env:X?}` | Optional marker — unset 시 empty string, placeholder 유지 안 함 |

**Phase 2 reserved** (§2.1.2):
- `{env:X-default}` (colon 없음, unset-only) — 미묘한 차이 함정
- `{env:X:?error message}` — 명시 에러 메시지

**효과**: E-4 의 `--allow-missing-env` 전역 flag 불필요. Π7 선언성 확보.

**Minority (POC-12)**: `{env:X?}` optional marker 실제 semantic (empty string vs omit field) 는 Phase 1 POC 확정.

### 8.13 E-12 — Type Coercion = String Only

**결정**: `{env:X}` / `{file:X}` 결과는 **항상 string**. 숫자/bool 필드에 보간 시 **parse error**.

**금지 예**:
```yaml
# ❌ parse error
timeout: "{env:TIMEOUT_MS}"          # timeout 은 number 필드
retry_enabled: "{env:RETRY_FLAG}"    # bool 필드
```

**Phase 2 Reserved** (§2.1.2): `{env:X|int}`, `{env:X|bool}`, `{env:X|float}` coerce suffix.

**근거**: YAML/JSON type 과 string 혼용 = silent failure 원흉.

**구현**: Zod schema 가 타입 검증. `number` / `boolean` 필드에 interpolation string 이 들어오면 Zod 단계에서 reject.

### 8.14 E-14 — 보간 Depth 한계 (1 단계만)

**결정**: `{file:config.txt}` 결과 내부에 `{env:X}` 가 있어도 **재귀 보간 X**.

**이유**:
- Π1 reproducibility 단순화
- 구현 난이도 ↑
- 보안 리스크 (user injection)

**사용자 의도**: 파일 내용을 템플릿화하려면 별도 도구 (direnv, envsubst) 사용.

### 8.15 E-15 — UTF-8 Only

**결정**:
- `{file:X}` 는 **UTF-8 파일만** 지원. 비-UTF8 = parse error
- Binary 지원은 **Phase 2 reserved**: `{file:X|base64}` (§2.1.2)

**근거**: AI 도구 config 는 UTF-8 텍스트가 기본. Binary (PEM/keystore) 는 Phase 2 에서 structured reference 로 처리.

**BOM 처리**: `strip-bom` (부록 B) 으로 BOM 제거 후 검증.

### 8.16 E-16 — 4 Scope Merge 순서

**결정**: 결정 B 4 scope layering (enterprise/user/project/local) 에서 **각 scope 자체 보간 → merge** 순서.

**순서**:
1. Enterprise scope manifest 읽기 → 보간 resolve (자신의 env 참조)
2. User scope manifest 읽기 → 보간 resolve
3. Project scope manifest 읽기 → 보간 resolve
4. Local scope manifest 읽기 → 보간 resolve
5. 4 scope merge (결정 B precedence 규칙: enterprise → user → project → local)

**Merge 후 재보간 없음** (E-14 depth 1 과 일관): 보간은 **자기 scope 내 env 만** 참조.

**Kustomize 교훈 회피**: overlay 의 보간이 base 보간에 영향 주지 않음.

### 8.17 E-17 — Error Reporting Transparency

**결정**: 모든 error/log/telemetry 출력에서 **resolved value 절대 금지**. Unresolved expression 만.

**예시**:
```
# ❌ 잘못된 에러 메시지
error: failed to write file with content "ghp_abc123..."

# ✅ 올바른 에러 메시지
error: failed to write file
  content: <interpolated from {env:GITHUB_TOKEN}>
  reason: EACCES
```

**Telemetry**: Resolved value 도, hash 도 금지 (rainbow table 위험). Reason enum / status 만.

**Audit log**: `concord secret debug` 명령 실행 시 who/when/what 기록. Resolved value 자체는 기록 금지.

### 8.18 E-18 — Target Format 안전 인코딩

**결정**: concord 가 보간 결과를 **target 파일 포맷** (YAML/JSON/TOML) 에 안전하게 삽입하는 책임.

| 시나리오 | 처리 |
|---|---|
| Multi-line PEM in YAML | YAML block scalar (`|` 또는 `>`) + indent 정렬 |
| Shell special chars in JSON | JSON string escape (`\"`, `\\`, `\n`) |
| TOML string escape | TOML basic string escape (`\"`, `\\`) |
| Quote 혼합 | target 포맷 convention 따라 자동 |

**구현**: target 포맷별 formatter 책임. `jsonc-parser` / `eemeli/yaml` / `@shopify/toml-patch` (부록 B) 의 API 활용.

**POC-14 (§12.1)**: 골든 테스트 — multi-line PEM, shell injection 시도, quote 혼합 등.

### 8.19 Validator 구현 가이드

#### 8.19.1 Pre-validation (Manifest 파싱 전)

```typescript
// file: src/secret/preprocess.ts
export function preprocessInterpolation(raw: unknown): void {
  walkStringFields(raw, (fieldPath, value) => {
    // E-9 nested 검증
    if (hasNestedInterpolation(value)) {
      throw new ParseError('nested interpolation not allowed (E-9)');
    }
    // §2.1.2 Reserved 검증 ({secret:...}, {env:X|int}, etc.)
    checkReservedInterpolation(value);
    // E-7 allowlist 검증
    if (containsInterpolation(value) && !isAllowedField(fieldPath)) {
      throw new ParseError(`interpolation not allowed in field (E-7)`);
    }
  });
}
```

#### 8.19.2 Resolution (On-install)

```typescript
// file: src/secret/resolve.ts
export function resolveValue(
  expr: string,
  env: NodeJS.ProcessEnv,
  projectRoot: string
): string {
  // E-13 escape 처리 ({{env:X}} → {env:X} literal)
  // E-1 파싱 ({env:X}, {file:X})
  // E-11 default 문법 처리 ({env:X:-default}, {env:X?})
  // E-10 path traversal 검증 ({file:X})
  // E-15 UTF-8 검증 ({file:X})
  // E-4 missing fail-closed
  // E-17 error 에 resolved value 금지
  // E-18 target format 안전 인코딩은 writer 단에서
  // E-14 1 단계 recursion 금지
  // E-19 Windows path 첫 콜론 구분자
}
```

#### 8.19.3 Post-install 검증

```typescript
// file: src/secret/verify.ts
export function verifyNoLeak(lock: Lock): void {
  // I5 lock 에 resolved env 값 없는지 grep 기반 검증
  // CI 에서 golden 테스트
}
```

### 8.20 결정 C/D 와의 통합

#### 8.20.1 결정 C Reserved Registry 확장 (§2.1.2)

11 entries 등재. §2.1.2 참조.

#### 8.20.2 결정 D 연계

| 결정 D 항목 | 결정 E 연동 |
|---|---|
| D-5 drift 3 상태 | E-2a env-drift 추가 → 4+1 상태 |
| D-6 POSIX-only manifest | E-19 `{file:C:/}` forward slash 허용 |
| D-12 reason enum | E-4 fail-closed 시 `reason: EnvVarMissing` 추가 |
| D-15 preflight | `concord doctor` 에 E-2a drift 검사 추가 |

#### 8.20.3 결정 B 연계

- Lock `raw_hash` / `normalized_hash` 는 **unresolved 기준** (E-3)
- `rendered_hash` 도입 안 함 (secret 보호)
- 4 scope merge (E-16): 각 scope 자체 보간 → merge
- `concord doctor` CLI 에 E-2a drift 검사 추가

---



## §9. Windows Install Contract (D-1 ~ D-15)

### 9.0 정체성 — 언어 스택 TypeScript/Node.js + 재검토 L1~L5

**결정 D §1 확정**: **TypeScript/Node.js**. 3 agent 검증 (Codex + 독립 판단 + 웹서치) 후 TS 유지.

**Windows 커버리지 3 agent 수렴**:

| Agent | TS 현재 | Rust 전환 | 증가폭 |
|---|---|---|---|
| Codex | 80-85% | 83-88% | +4-6%p |
| 독립 판단 | 80-85% | 85-90% | +5-7%p |
| 웹서치 (실증) | 80-85% | 90-93% | +8-10%p |
| **수렴** | **~82%** | **~87%** | **+5-10%p** |

**100% 불가능 근거** (3 agent 일치): provider 버그 / OS 권한 / 외부 프로세스 / 사용자 환경은 **언어 무관**.

**TS 유지 결정적 근거**:

1. **결정 B round-trip 손실 치명**: `jsonc-parser` + `jsonc-morph` 독보적, `eemeli/yaml` 최고. Rust 전환 시 format 보존 약함 → 결정 B 기술 존망 직접 타격
2. **증가폭 +5-10%p 는 정책으로 상쇄 가능**: 아래 D-1/D-3/D-14 + 부록 B 라이브러리 스택으로 TS 에서도 실전 85-90% 달성
3. **AI SDK 생태계 정합**: Anthropic 공식 Rust SDK 없음 (커뮤니티 비공식, 수일~수주 지연)
4. **배포 UX 격차 체감 작음**: 대상 사용자 (AI 도구 개발자) 대부분 Node 보유

**재검토 트리거 L1~L5 (§1.12)**: §1.12 참조.

### 9.1 Windows 복잡도 본질 (3 agent 분석)

| 원인 | 비중 | 언어 전환으로 해결? |
|---|:---:|---|
| Windows 보안 모델 (UAC/Developer Mode/AV 락) | 40% | 부분 (감지는 Rust 가 유리, 정책은 OS) |
| Node.js 한계 (symlink EPERM / atomic rename 등) | 30% | **라이브러리로 해결** (부록 B) |
| Provider 실전 버그 (Claude #25367, Codex v0.119, OpenCode Bun) | 20% | **해결 불가** (provider 계약) |
| 사용자 환경 (Git Bash, WSL, OneDrive) | 10% | **해결 불가** (외부 프로세스) |

→ **60% 는 언어 무관**. Rust 는 주로 Node 한계 (30%) 에만 ROI.

### 9.2 D-1 — Install Mode 입력/저장 계약

**결정**: **입력 = `install: symlink | hardlink | copy | auto`** (auto default), **저장 (lock) = 실제 적용된 구체값 + `install_reason`**.

```yaml
# manifest 입력 (ε UX)
skills:
  - source: ...
    install: auto    # 생략 시 auto

# lock 저장 (δ machine contract)
nodes:
  "claude-code:skills:foo":
    install_mode: copy           # 구체값
    install_reason: WindowsDefault  # reason enum
```

**근거**: Π1 reproducibility — 같은 lock 이 OS 별로 다르게 구체화되지 않음. 입력 UX 와 저장 contract 분리 (Codex 통찰).

**`auto` 동작 정책**:

| OS / 조건 | 순서 |
|---|---|
| Windows (기본) | `copy` 우선 |
| Windows + Developer Mode + 자산 타입 허용 | `symlink` opt-in |
| Unix | `symlink → hardlink → copy` cascade (EPERM catch → fallback) |
| **Claude `.claude/skills/`** | **copy 강제** (#25367 버그 우회, D-14) |
| **Claude `.claude/rules/`** | symlink 허용 (공식 지원) |

### 9.3 D-3 — Hook Shell = Provider 위임

**결정**: concord 는 hook 스크립트의 shell 선택에 **관여하지 않음** (Π2 "관측하되 조작 X", Π3 provider-native).

| Provider | Hook shell |
|---|---|
| Claude | Git Bash 강제 (`CLAUDE_CODE_GIT_BASH_PATH` 공식). concord passthrough only |
| Codex | Bash only (hook Windows 지원은 v0.119+) |
| OpenCode | JS/TS plugin (shell 무관) |

**Shebang 검증 0%**: Π2 경계 유지. 파일 내용은 black box.

**관측**: Q4 `capability_matrix.<provider>.<asset>.shell_compatibility` 셀 추가 (Π5 additive). Codex hook 에 `#!/bin/bash` 존재 + Windows = `shell_compatibility: incompatible, reason: ShellIncompatible`.

### 9.4 D-4 — 설치 허용 + 실행 차단 + Codex 버전 Probe

**결정**: Windows + provider 호환 불가 상황에서도 **설치는 허용, 실행만 차단**. Π1 reproducibility (같은 manifest + lock 이 OS 별 install 실패 없음).

**구체 로직**:

```
Windows + Codex plugin + hooks 존재 →
  1. 파일은 설치 (intact, Π2)
  2. Codex 버전 probe
     - Codex < 0.119 → capability_matrix.codex.hooks.status = "detected-not-executed"
                       + reason = "CodexVersionTooOld"
     - Codex >= 0.119 → 정상 supported
  3. doctor 가 Q2' (b) Lossy 기호 실재 경로로 경고
  4. --json 에 항상 전체 matrix + remediation hint 포함
```

**근거**: Codex CLI 의 Windows hook 지원은 **v0.119.0 (2026-04-10) 릴리즈 주기 부근** 에서 변동. 단, 공식 hooks docs 는 `"Hooks are currently disabled on Windows. (temporarily)"` 문구 유지 중 (의도된 비활성일 수 있음 — §12 POC-7 로 공식 계약 추적). **단순 OS 체크 불가, 버전 probe + docs 재확인 필수**.

**사용자 관점 "설치 거부 vs 경고"**: Π1 에 의해 **허용** 이 default. 거부는 재현성 위반.

**Codex probe 구현**:

```typescript
import { spawnSync } from "node:child_process";
const result = spawnSync("codex", ["--version"]);
const version = parseVersion(result.stdout.toString());
if (semver.lt(version, "0.119.0")) {
  // detected-not-executed + CodexVersionTooOld
}
```

### 9.5 D-5 — Drift 4+1 상태 (E-2a 확장)

§7.3 에서 상세. 요약:

| 상태 | 조건 |
|---|---|
| `none` | 변경 없음 |
| `source` | 원본만 변경 (symlink/copy 공통) |
| `target` | 복사본만 변경 (copy 전용) |
| `divergent` | 양쪽 다 변경 (copy 전용) |
| **`env-drift`** (E-2a) | manifest/source 불변 + env 값 변경 |

### 9.6 D-9 — WSL 판정 규칙

**결정**:
- **WSL 감지** = `/proc/version` 또는 `/proc/sys/fs/binfmt_misc/WSLInterop` 확인 (`is-wsl` 라이브러리)
- **WSL = Linux 취급** (fs symlink 정상 동작)
- **`/mnt/c/` 경로 감지 시 Windows 규칙 분기** — Windows FS 는 symlink 제약 상속
- **`install_reason: WSLFilesystem`** 기록

**근거**: OpenAI Codex Windows docs 는 "WSL 권장" — concord 도 WSL 을 1급 지원. 단 `/mnt/c/` 경유는 host Windows FS 이므로 cascade fallback.

### 9.7 D-11 — Case-insensitive FS 충돌 = Parse Error

**결정**: manifest 에 `Hook.sh` 와 `hook.sh` 공존 시 **parse error** (Π7 적용).

**이유**:
- Windows NTFS, macOS APFS 기본 = case-insensitive
- 같은 ID 가 대소문자만 다르면 OS 별 동작 다름 (Unix 에선 분리, Windows/Mac 에선 충돌)
- 결정 A A1~A5 "names unique across all locations" (OpenCode 요구) 와 동형 패턴

**에러 메시지**:
```
error: case-insensitive name collision
  identifiers: Hook.sh, hook.sh
  reason: Concord requires names to be unique on case-insensitive filesystems (Windows NTFS, macOS APFS).
```

### 9.8 D-12 — Fallback Provenance Reason Enum

**결정**: `install_reason` 은 고정 enum (§5.6.2 `InstallReasonEnum` 참조). 자유 문자열 금지 (K8s #50798 conditions `Reason/Message` 논의 교훈).

§5.6.2 `ReasonEnum` 에 통합됨 (18 entries). 주요 install reason:

| Reason | 발생 조건 |
|---|---|
| `UserExplicit` | 사용자가 `install: symlink \| hardlink \| copy` 명시 |
| `Auto` | auto default, symlink 성공 (Unix 또는 Windows + Developer Mode) |
| `WindowsDefault` | Windows + auto + Developer Mode 비활성 → copy |
| `NoPrivilege` | Unix 에서도 권한 부족 (EPERM) |
| `DevModeDisabled` | Windows 에서 Developer Mode 감지 실패 |
| `FsUnsupported` | FAT/exFAT 등 symlink 미지원 FS |
| `CrossDevice` / `CrossVolume` | 하드링크 시도 시 다른 볼륨 |
| `PathLimit` / `PathTooLong` | 경로 260자 초과 |
| `WSLFilesystem` | WSL + `/mnt/c/` 감지 |
| `CodexVersionTooOld` | Codex < 0.119 + Windows + hook |
| `WindowsUnsupported` | Codex hook Windows 미지원 (v0.119 미만) |
| `FeatureFlagDisabled` | Codex `features.codex_hooks=false` |
| `ShellIncompatible` | hook shell 과 OS 불일치 |
| `PluginJsonMissing` / `ParseFailed` | introspection 실패 |
| `NetworkError` | 네트워크 실패 |

**확장 정책**: additive only (Π5). enum 제거 = breaking. 자유 문자열 금지.

### 9.9 D-14 — Format Transform (Provider 실전 지식)

**결정**: Windows 에서 provider-native 포맷을 자동 변환. concord 고유 로직 (언어 무관).

#### 9.9.1 MCP server `command: "npx"` Windows wrap

```json
// 저장된 manifest
{ "command": "npx", "args": ["-y", "@modelcontextprotocol/server-filesystem"] }

// Windows sync 시 자동 변환
{ "command": "cmd", "args": ["/c", "npx", "-y", "@modelcontextprotocol/server-filesystem"] }
```

**근거**: stdio transport pipe 가 `npx` 직접 호출 시 Node.js 프로세스 연결 실패 사례 다수 (SuperClaude #390, Playwright MCP #1540).

**변환 시점**: **install 시점** 에서만. manifest/lock 의 원본은 그대로 (Π1 reproducibility).

#### 9.9.2 Claude `.claude/skills/` symlink 강제 copy

- Claude Code issue #25367 — symlinked skills/ validation 실패 (**CLOSED as duplicate of #14836, 2026-02**, 현상 자체는 재현됨)
- Claude Code issue #36659 — symlink 시 slash command 미인식 (**CLOSED as duplicate of #14836, 2026-03**, 현상 자체는 재현됨)
- → Windows/macOS/Linux 공통 **copy 강제** (symlink opt-in 도 거부)

#### 9.9.3 Claude `.claude/rules/` symlink 허용

- 공식 symlink 지원
- Developer Mode 활성 Windows + Unix 에서 symlink 허용

### 9.10 D-15 — Preflight Check (`concord doctor` 확장)

§6.9 참조. 요약:

| 체크 | 실행 조건 | 결과 |
|---|---|---|
| **Git Bash 감지** | Claude hook 존재 + OS=Windows | 부재 시 경고 + `CLAUDE_CODE_GIT_BASH_PATH` 설정 안내 |
| **Codex 버전 probe** | Codex plugin + hook 존재 + OS=Windows | `< 0.119` 경고 + 업그레이드 안내 |
| **Developer Mode 감지** | manifest 에 `install: symlink` 명시 + OS=Windows | 비활성 시 경고 + auto 권장 |
| **Antivirus exclusion 안내** | 대량 파일 sync 전 | concord staging 폴더를 Defender exclusion 에 추가 안내 (선택) |
| **OneDrive 경로 감지** | install 경로가 OneDrive 하위 | 경고 + cloud-only placeholder 이슈 언급 |

**출력 정책**: Π4 — TTY 는 경고만, `--json` 은 항상 전체 체크 결과.

### 9.11 Known Issues (결정 D 부록 B, 본문 인라인)

| 이슈 | 대응 방향 |
|---|---|
| **Antivirus EBUSY/EACCES** 간헐 | `graceful-fs` retry + 반복 실패 시 exclusion 안내 |
| **OneDrive cloud-only placeholder** | 설치 경로 OneDrive 하위 감지 시 경고 |
| **Git `core.autocrlf=true`** 자동 변환 | `.gitattributes` 에 `text eol=lf` 필수 명시 안내 (프로젝트 README) |
| **Junction readlink 비대칭** (OS 분기) | 설치 후 검증 시 `fs.stat` 병용 |
| **File locking during install** (Claude Desktop config watching) | `graceful-fs` retry + 실패 시 "close app" 안내 |
| **UNC 경로** (`\\server\share\`) | Phase 1 범위 밖, Phase 2 재평가 |
| **FAT/exFAT 외장 저장소** | `install_reason: FsUnsupported` + copy fallback |
| **Windows 7/8.1** | 공식 지원 중단 (Node.js 최신도 미지원) |
| **PowerShell UTF-16 LE + BOM** | Claude hook 에서 powershell 출력 파싱 시 BOM 제거 |

### 9.12 Q4 `capability_matrix` 확장 (Π5 Additive)

```yaml
# 결정 D 반영된 lock 구조 예시
capability_matrix:
  claude-code:
    skills:
      status: supported
      count: 2
      install_mode: copy             # ◀ D-1 (Claude skills symlink 버그 우회)
      install_reason: WindowsDefault  # ◀ D-12
      shell_compatibility: ok        # ◀ D-3
      drift_status: none             # ◀ D-5
    hooks:
      status: supported
      count: 3
      install_mode: symlink
      install_reason: Auto
      shell_compatibility: ok
      drift_status: source
  codex:
    hooks:
      status: detected-not-executed
      count: 0
      detected: 1
      reason: CodexVersionTooOld     # ◀ D-4 Codex 버전 probe
      install_mode: copy
      install_reason: WindowsDefault
      shell_compatibility: incompatible
      drift_status: none
```

### 9.13 Π 원칙 ↔ 결정 D 매핑 (요약)

| Π | 결정 D 에서의 적용 |
|---|---|
| **Π1** Reproducibility | D-1 lock 에 구체값 + reason 저장, D-4 설치 허용 (OS 무관 재현성) |
| **Π2** Plugin intact | D-3 shebang 검증 0%, D-5 user-modified 판정 불가 인정 |
| **Π3** Provider-native | D-3 shell 위임, D-14 format transform (provider 계약 존중) |
| **Π4** Machine vs Human | D-4 `--json` 전체 matrix, D-5 machine=drift_status/human=doctor 경고 |
| **Π5** Additive | Q4 capability_matrix 확장 (install_mode/shell_compatibility/drift_status), reason enum additive 확장 |
| **Π6** Lossy 명시 | D-12 reason enum 고정 (자유 문자열 금지) |
| **Π7** Explicit boundaries | D-11 case collision parse error |

### 9.14 Phase 1 구현 체크리스트 (결정 D 항목)

- [ ] D-1 `install` 필드 Zod 스키마 + lock `install_mode` / `install_reason` 저장
- [ ] D-1 `auto` 동작 분기 (Windows copy first, Unix cascade, Claude skills 강제 copy)
- [ ] D-3 hook shell passthrough (공식 provider 필드 유지)
- [ ] D-3 Q4 `shell_compatibility` 관측 로직
- [ ] D-4 Codex 버전 probe (spawn `codex --version` + semver 비교)
- [ ] D-4 `detected-not-executed + reason + remediation` doctor 경고
- [ ] D-5 drift 3+1 상태 판정 (source/target/divergent + env-drift)
- [ ] D-5 Q4 `drift_status` 필드
- [ ] D-9 WSL 감지 (`is-wsl`) + `/mnt/c/` 판정
- [ ] D-11 case-insensitive 충돌 parse error
- [ ] D-12 reason enum JSON Schema 단일 validator
- [ ] D-14 MCP `cmd /c npx` Windows 자동 변환
- [ ] D-14 Claude `.claude/skills/` copy 강제
- [ ] D-14 Claude `.claude/rules/` symlink 허용
- [ ] D-15 preflight 5 체크 (Git Bash / Codex 버전 / Developer Mode / AV exclusion / OneDrive)
- [ ] 부록 B 라이브러리 스택 통합 (§부록 B)
- [ ] §9.11 엣지케이스 retry/경고 로직
- [ ] 골든 테스트: Windows/macOS/Linux 각각 sync → lock 일관성 검증
- [ ] 골든 테스트: `.gitattributes` CRLF → LF 보존 검증

---



## §10. Config Round-Trip 편집 정책

### 10.0 정체성 — 최우선 기술 리스크

**Config 파일 round-trip 편집** 이 concord 의 **기술적 존망을 가르는 지점** 이다 (결정 B Codex 검토 핵심).

네이티브 config 파일 (`settings.json`, `config.toml`, `opencode.json[c]`, `.mcp.json` 등) 을 marker 블록으로 편집할 때 **주석 / 순서 / trailing comma / 기타 구조 파괴 금지**. Naive `JSON.parse()` → `JSON.stringify()` 또는 TOML 동일 패턴은 **사용자 신뢰 영구 손실** 로 이어진다.

**핵심 원칙**:
1. **Format-preserving 편집** 만 허용. Naive parse+stringify 금지
2. **Marker 블록 정책**: concord 가 소유하는 영역은 marker + marker ID + hash suffix 로 표시. 블록 외부는 불가침
3. **Raw vs normalized hash 분리**: formatter false-positive drift 회피
4. **Extraneous preservation**: marker 외부의 사용자 편집 내용은 cleanup/sync 모두에서 보존

### 10.1 JSONC 편집 (`jsonc-morph` 1순위)

**대상 파일**: Claude `.claude/settings.json`, OpenCode `opencode.json[c]`, `.mcp.json`.

**라이브러리 선택**:

| 후보 | 평가 | 선택 |
|---|---|---|
| **`jsonc-morph`** (David Sherret, Deno) | CST 기반 in-place, 임의 주석 조작 1급 | **1순위** |
| `jsonc-parser` (Microsoft VSCode) | `modify` + `applyEdits`, 임의 주석 삽입 제한 | 2순위 (fallback) |

**편집 패턴**:

```typescript
// file: src/round-trip/jsonc.ts
import * as jsoncMorph from "jsonc-morph";

export function editJsonc(source: string, edits: Edit[]): string {
  const doc = jsoncMorph.parse(source);
  for (const edit of edits) {
    // CST 레벨 수정 — 주석/순서 보존
    doc.modify(edit.path, edit.value);
  }
  return doc.stringify();
}
```

**Marker 블록 사용** (§10.5): concord 가 수정하는 영역은 marker 로 감싸고, 외부는 절대 건드리지 않는다.

### 10.2 TOML 편집 (POC 3도구)

**대상 파일**: Codex `~/.codex/config.toml`.

**POC-1 후보** (Phase 1 첫 sprint 벤치마크):

| 후보 | 평가 |
|---|---|
| **`@decimalturn/toml-patch`** (**POC-1 1순위**) | `timhall/toml-patch` 포크, TOML v1.1, pure JS, 2026-04 활성 (v1.x) |
| **`@shopify/toml-patch`** | Rust `toml_edit` wasm 래퍼. 보존 완성도 기대 (단 최근 1년 stale, 0.3.x) |
| **`@ltd/j-toml`** | "as much as possible" (top-level standard tables 만 안전) |

**탈락**:
- `@iarna/toml` — 6년 방치 + 편집 시 주석 손실
- `smol-toml` — comment 보존 없음

**벤치마크 기준** (POC-1 §12.1):
1. 주석 보존 (line / inline / above / below)
2. 순서 보존
3. Formatting 보존 (들여쓰기, 개행)
4. Round-trip 횟수 누적 시 drift 없음
5. TOML v1.1 호환성

### 10.3 순수 JSON 편집 (`json-key-owned` 방식)

**대상 파일**: `~/.claude.json` (Claude 최상위 config, POC-4 결과 순수 JSON 확정).

**도전**: 순수 JSON 은 marker 기반 블록 편집 불가능 (주석 지원 안 함).

**해결책**: **`json-key-owned`** 방식 (결정 B POC-4, 2026-04-19 확정):

```yaml
# concord.lock 에 key 단위 소유권 기록
nodes:
  "claude-code:mcp_servers:airtable":
    # ...
    owned_keys:
      - path: "mcpServers.airtable"
        hash: "sha256:abc..."
```

**규칙**:
- concord 가 `~/.claude.json` 의 특정 key 를 "소유" 한다고 lock 에 기록
- `concord sync` 는 **소유 key 만 수정**, 다른 key 는 passthrough (read → preserve → write)
- 사용자가 소유 key 를 수동 수정 시 → `drift_status: target` 으로 감지
- cleanup 은 소유 key 만 삭제

**JSON writer**: `JSON.stringify(obj, null, 2)` 기반 — 원본 들여쓰기 보존은 포기하되 (format-preserving 불가), **key 순서는 객체 삽입 순서 유지** (Node.js v10+ insertion order).

### 10.4 Raw vs Normalized Hash (결정 B)

**목적**: formatter false-positive drift 회피.

| Hash | 계산 대상 | 용도 |
|---|---|---|
| **`raw_hash`** | 파일 bytes (BOM/CRLF 포함) | Bit-exact 동일성 검증 |
| **`normalized_hash`** | `strip-bom` 후 LF 강제 → JSON 의 경우 canonical form 후 → hash | 실질 동일성 검증 (formatter 차이 무시) |

**Drift 판정**:
- `raw_hash` 일치 → 완전 동일 (drift 아님)
- `normalized_hash` 일치 + `raw_hash` 불일치 → formatter 차이만, **drift 아님**
- `normalized_hash` 불일치 → 실제 content 변경, **drift**

**Canonical form** (JSON/JSONC 의 경우):
- Key 정렬 (`Object.keys().sort()` 아님 — insertion order 유지, canonical 은 별도 계산)
- Whitespace 정규화
- Trailing comma 제거 (pure JSON 만)
- 주석 제거 (JSONC 의 경우 주석 무시 hash)

### 10.5 Marker 블록 정책

#### 10.5.1 Marker 형식

```jsonc
// >>>> concord-managed:mcp_servers:airtable  (hash:abc...)
{
  "command": "npx",
  "args": ["-y", "airtable-mcp-server"]
}
// <<<< concord-managed:mcp_servers:airtable
```

**구성 요소**:
- **Open marker**: `// >>>> concord-managed:<type>:<name>  (hash:<suffix>)`
- **Close marker**: `// <<<< concord-managed:<type>:<name>`
- **Marker ID**: `<type>:<name>` (lock node id 와 동일)
- **Hash suffix**: `normalized_hash` 앞 8자. marker 무결성 검증용

#### 10.5.2 편집 규칙

1. Marker 블록 **내부**: concord 소유 (sync/update 에서 수정 가능)
2. Marker 블록 **외부**: 불가침 (read → preserve → write)
3. Open marker / close marker **누락** 또는 **변조** = `marker-broken` state (§7.4.5)
4. Hash suffix 불일치 = `integrity-mismatch` event (§7.2)

#### 10.5.3 TOML 에선

TOML 은 `#` 주석 사용:

```toml
# >>>> concord-managed:mcp_servers:airtable  (hash:abc...)
[[mcp_servers]]
command = "npx"
args = ["-y", "airtable-mcp-server"]
# <<<< concord-managed:mcp_servers:airtable
```

#### 10.5.4 순수 JSON 에선

Marker 사용 불가 → `json-key-owned` 방식 (§10.3).

### 10.6 Extraneous Preservation

**원칙**: Marker 외부의 사용자 편집 내용은 **sync / cleanup 모두에서 보존**.

**cleanup 시나리오**:

```jsonc
// Before cleanup
{
  "mcpServers": {
    "user-manual-server": { ... },     // 사용자가 수동 추가 (marker 외부)
    // >>>> concord-managed:mcp_servers:airtable  (hash:abc...)
    "airtable": { ... },               // concord 소유
    // <<<< concord-managed:mcp_servers:airtable
    "concord-tool": { ... }            // manifest 에 없음 (extraneous)
  }
}

// After cleanup (extraneous prune 후)
{
  "mcpServers": {
    "user-manual-server": { ... }      // 보존 (사용자 수동)
  }
}
```

**규칙**:
- `user-manual-server` 는 marker 외부 → preserve (cleanup 대상 아님)
- `airtable` 은 marker 내부 → manifest 기준 유지
- `concord-tool` 은 marker 외부 but concord 가 소유한 key (json-key-owned 또는 과거 marker) → cleanup 에서 prune 대상

**POC-8** (§12.1): jsonc-morph round-trip 에서 외부 추가 항목 preserve 골든 테스트.

### 10.7 Golden Test 패턴

**원본 → sync → diff 패턴**:

```bash
# 1. 복잡한 원본 파일 준비 (주석, 순서, trailing comma 포함)
cp fixtures/original-settings.json test.json

# 2. concord sync 실행 (marker 블록 추가/수정)
concord sync --file concord.test.yaml

# 3. diff 로 "비의도 영역 보존" 검증
diff fixtures/expected-settings.json test.json
# → marker 블록만 차이, 다른 영역은 bit-exact 동일
```

**테스트 케이스**:
- 주석 다양: line / block / inline
- 순서 다양: 알파벳순 아닌 insertion order
- Trailing comma (JSONC)
- CRLF vs LF (Windows)
- BOM 있음/없음
- 중첩 깊이 다양

### 10.8 Π 원칙 ↔ §10 매핑

| Π | §10 에서의 보호 |
|---|---|
| Π1 Reproducibility | raw + normalized hash 분리, 같은 lock → 같은 결과 |
| Π2 Plugin intact | 자산 파일 내용은 round-trip 대상 아님 (config 파일만) |
| Π3 Provider-native | Provider 네이티브 config 포맷 보존 |
| Π4 Machine vs Human | raw_hash 는 machine (drift 검증), normalized 는 human 이 수용 가능한 차이 |
| Π5 Additive | marker 형식 / hash 형식 변경 = breaking (Π5 3줄 룰) |
| Π6 Lossy 명시 | `marker-broken` / `integrity-mismatch` event 에서 명확히 발화 |
| Π7 Explicit boundaries | marker 블록 = concord 경계, 외부 = 사용자 소유 |

---



## §11. Discovery / 4 Scope Layering

### 11.0 정체성

concord 는 **4 scope** 로 manifest 를 분리한다. 각 scope 는 "자기 경로에 설치" 만 담당하고, scope 간 우선순위 해결은 **provider 런타임에 위임** (Π3 — concord 가 resolver 중복 구현 안 함).

**4 scope**:
- **enterprise** (`~/.concord/concord.enterprise.yaml`): 조직 배포, 일반 사용자 명시 opt-in
- **user** (`~/.concord/concord.user.yaml`): 개인 전역
- **project** (`<project>/concord.yaml` or `concord.project.yaml`): 팀 공유, git-tracked
- **local** (`<project>/concord.local.yaml`): 개인 머신 튜닝, gitignored

### 11.1 Discovery 순서 (override 가능)

```
1. $CONCORD_HOME (env var, 최우선)
2. ~/.concord/
3. $XDG_CONFIG_HOME/concord/ (XDG 표준)
4. ~/.config/concord/ (XDG fallback)
5. %APPDATA%\concord\ (Windows)
```

**의도**:
- `$CONCORD_HOME` 으로 테스트/격리 환경 지원
- XDG Base Directory spec 순응 (Linux/macOS)
- Windows 은 `%APPDATA%` 가 표준

**enterprise / user 경로 탐색 구현**:

```typescript
// file: src/discovery/concord-home.ts
export function findConcordHome(): string {
  // 1. $CONCORD_HOME
  if (process.env.CONCORD_HOME) return process.env.CONCORD_HOME;
  // 2. ~/.concord/
  const defaultHome = path.join(os.homedir(), ".concord");
  if (fs.existsSync(defaultHome)) return defaultHome;
  // 3. $XDG_CONFIG_HOME/concord
  if (process.env.XDG_CONFIG_HOME) {
    const xdg = path.join(process.env.XDG_CONFIG_HOME, "concord");
    if (fs.existsSync(xdg)) return xdg;
  }
  // 4. ~/.config/concord/
  const xdgFallback = path.join(os.homedir(), ".config", "concord");
  if (fs.existsSync(xdgFallback)) return xdgFallback;
  // 5. %APPDATA%\concord (Windows)
  if (process.platform === "win32" && process.env.APPDATA) {
    const appdata = path.join(process.env.APPDATA, "concord");
    if (fs.existsSync(appdata)) return appdata;
  }
  // Default: ~/.concord/ (생성)
  return defaultHome;
}
```

### 11.2 Locality 규칙

| Scope | 탐색 기준 | 위치 |
|---|---|---|
| **enterprise** | canonical 경로 (Discovery 순서) | `~/.concord/concord.enterprise.yaml` 등 |
| **user** | canonical 경로 | `~/.concord/concord.user.yaml` 등 |
| **project** | **cwd 기준** | `<cwd>/concord.yaml` or `concord.project.yaml` |
| **local** | **cwd 기준** | `<cwd>/concord.local.yaml` |

**경고 시나리오**: cwd 에서 `concord.user.yaml` / `concord.enterprise.yaml` 발견 시:
```
⚠️ Found `concord.user.yaml` in cwd (project directory).
   User-scope manifests should live in ~/.concord/.
   Proceed with this path? [y/N]
```

### 11.3 Manifest 파일명 Alias

Project scope 는 **`concord.yaml`** (권장) 또는 **`concord.project.yaml`** (명시) 둘 다 허용.

**우선순위** (cwd 에 둘 다 있을 때): **parse error** (ambiguity).

**Tier 2 CLI 자동 scope 추론** (§6.7.2):
- `--file ./concord.yaml` → scope=project 자동
- `--file ./concord.project.yaml` → scope=project 자동
- `--file ./concord.user.yaml` → scope=user 자동

### 11.4 Never-default 정책

- **enterprise**: 항상 `--scope enterprise` 명시 필요. 권한 precheck + 경고.
- **local**: 항상 `--scope local` 명시 필요. gitignored 영역, 개인 책임.

**이유**:
- Enterprise 는 조직 정책 영역 — 실수로 건드리면 팀 혼란
- Local 은 실험 영역 — "sync --all" 같은 명령이 local 까지 건드리면 의외

### 11.5 Scope 간 Merge Precedence (결정 B)

**Merge 순서**: enterprise → user → project → local.

- 뒤 scope 가 같은 id 를 정의하면 **override**
- Local 이 최종 승자 (개인 override 의도)

**4 scope 자체 보간 → merge 순서** (E-16):
1. Enterprise scope 자체 manifest 읽기 → 보간 resolve
2. User scope manifest 읽기 → 보간 resolve
3. Project scope manifest 읽기 → 보간 resolve
4. Local scope manifest 읽기 → 보간 resolve
5. 4 scope merge

**Merge 후 재보간 없음** (E-14 depth 1 과 일관).

### 11.6 사용자 Gitignore 가이드

Concord 프로젝트 `.gitignore` 권장:

```
# concord private
concord.local.yaml
concord.local.lock
.concord/
```

**공유 대상**:
- `concord.yaml` (project manifest) ✅
- `concord.lock` (project lock) ✅

**제외 대상**:
- `concord.local.yaml` / `concord.local.lock` ❌
- `.concord/` (로컬 캐시) ❌

---



## §12. Open Issues / POC Hooks

본 섹션은 Phase 1 착수 **직전** 에 해결되어야 할 POC 항목과, 각 결정에서 불가피하게 남은 Minority 를 통합한다.

### 12.1 POC 14 항목 (결정별)

#### 결정 B POC (4 항목)

- [ ] **POC-1**: TOML 3도구 벤치마크 (**1순위 `@decimalturn/toml-patch`** (2026-04 active, v1.x, TOML v1.1) → `@shopify/toml-patch` (1년 stale, 0.x) → `@ltd/j-toml` (3년 stale, fallback)). 기준: 주석 / 순서 / formatting 보존, round-trip drift 없음, TOML v1.1 호환
- [ ] **POC-2**: `jsonc-morph` vs `jsonc-parser` 실용성 비교 (Node.js 안정성·성능)
- [ ] **POC-3**: Format-preserving YAML 편집 라이브러리 선정 (`eemeli/yaml` 유력)
- [x] **POC-4**: `~/.claude.json` 실제 포맷 확인 → **순수 JSON 확정, `json-key-owned` 방식 채택** (2026-04-19)

#### 결정 C POC (4 항목)

- [ ] **POC-5**: Plugin introspection 엔진 정확성 골든 테스트 — Claude `plugin.json` / Codex `.codex-plugin/plugin.json` / OpenCode `package.json#main` 파싱 → `capability_matrix` 계산
- [ ] **POC-6**: OpenCode `auto_install` vs `enabled` 의미 분리 검증 (배열 존재 = enabled 인 특수성)
- [ ] **POC-7**: Codex `marketplace add` CLI 공식 docs 업데이트 감시 (현재 v0.121 changelog + 서드파티 요약, semi-official)
- [ ] **POC-8**: `concord cleanup` 에서 `extraneous` 탐지 시 jsonc-morph round-trip 외부 추가 항목 preserve 검증

#### 결정 D POC (3 항목)

- [ ] **POC-9**: `symlink-dir` Windows junction/hardlink fallback 실측
- [ ] **POC-10**: `concord doctor` preflight 5 체크 (Git Bash, Codex 버전, Developer Mode, AV exclusion, OneDrive) 정확성
- [ ] **POC-11**: Drift 4+1 상태 판정 로직 (source/target/divergent/env-drift) 엣지케이스

#### 결정 E POC (3 항목)

- [ ] **POC-12**: OpenCode `{env:X}` / `{file:X}` 공식 escape 문법 확인 (E-13 `{{env:X}}` 차용 검증)
- [ ] **POC-13**: 4 scope merge 순서 (enterprise/user/project/local) + 각 scope 보간 독립성 검증
- [ ] **POC-14**: Target format (YAML/JSON/TOML) 안전 인코딩 골든 테스트 (multi-line PEM, shell injection 시도, quote 혼합)

### 12.2 Minority (통합)

각 결정의 미결 항목 해결 시점 명시:

| # | 항목 | 도출 결정 | 해결 시점 |
|---|---|---|---|
| M1 | `capability_matrix` 필드명 개명 (`compat_snapshot` 등) — 이름-역할 괴리 테스트 | Q1/Q4 | 구현 단계 |
| M2 | `capability_matrix.reason` enum 초기 집합 완결성 | Q4 | Phase 1 POC-5 |
| M3 | `partial` status (Claude 26 events 중 Codex 5 호환) 추가 여부 | Q4 | Phase 1 POC (실제 케이스 관찰) |
| M4 | `?` (failed) 범위: plugin 전체 vs 셀 단위 | Q4 | 구현 단계 |
| M5 | `phase2_projections:` 위치 (nodes 내부 필드 vs 최상위 섹션) | Q1 | Phase 1.5 착수 시 |
| M6 | `lockfile_version` bump 정책 (major/minor 기준) | Q1 | POC 중 확정 |
| M7 | `concord_version` semver range 문법 (`^`/`~`/`>=` 지원 범위) | Q5 | POC 중 확정 (`semver` 라이브러리 채택) |
| M8 | `concord_version` 생략 시 경고 + 불일치 fail-closed | Q5 | 구현 단계 |
| M9 | `list --json` vs `list` TTY 필드 대칭성 보장 테스트 | Q2 | Phase 1 POC-5 |
| M10 | OpenCode `auto_install` vs `enabled` 의미 분리 | 섹션 3 | POC-6 |
| M11 | Codex `marketplace add` CLI 공식 계약 | 섹션 3 | POC-7 |
| M12 | Plugin introspection 엔진 정확성 | 섹션 5 | POC-5 |
| M13 | `--json` schema 에 `capability_matrix` 필드 이름 고정 | Q2 | POC 중 |
| M14 | provider-native hook disable 설정의 provider 별 스펙 차이 | Q3 | 결정 D Windows fallback 과 연계 조사 |
| M15 | Phase 2 breaking 전환 기준 (진짜 B 필요 시) | Q5 | Phase 2 RFC |
| M16 | Developer Mode 감지 정확도 (Windows API 직접 호출 필요 시) | D-1 | Phase 1 POC-10 |
| M17 | OneDrive 경로 정확한 감지 규칙 (`$env:OneDrive` / 하위 판단) | D-15 | 구현 단계 |
| M18 | `.gitattributes` 자동 생성 vs 문서 안내만 | D | UX 리뷰 시 |
| M19 | PowerShell BOM 파싱 특수 처리 필요 범위 | D | Phase 1 POC |
| M20 | UNC 경로 지원 | D | Phase 2 재평가 |
| M21 | Windows 7/8.1 지원 범위 | D | Phase 1.5 (Node.js 지원 정책 따라) |
| M22 | 부분 Rust native module (hot path) 검토 | L1~L5 | POC 병목 확인 시 |
| M23 | OpenCode 공식 escape 문법 | E-13 | POC-12 |
| M24 | `{env:X?}` optional marker 실제 semantic (empty string vs omit field) | E-11 | Phase 1 POC |
| M25 | `{env:X:-default}` 의 default 값이 보간 가능한가? | E-11 | Phase 1 POC (권고: X, 단순화) |
| M26 | E-18 target format encoding 엣지케이스 (매우 긴 PEM 등) | E-18 | 구현 단계 |
| M27 | E-2a env-drift 감지 정확도 (default 문법 `{env:X:-Y}`) | E-2a | 구현 단계 |

### 12.3 재평가 트리거 (모니터링)

Phase 1 중에도 다음이 관찰되면 결정 재논의:

| Trigger | 조건 | 대응 |
|---|---|---|
| **언어 L1~L5** | §1.12 5 트리거 중 하나 | Rust 부분 전환 재논의 (결정 D §1.5) |
| **Π 변경 RFC** | §1.11 4 요건 모두 충족 | Π 완화 RFC 작성 |
| **POC-7 Codex docs** | `marketplace add` 공식 docs 업데이트 | 섹션 3 β3 α codex-plugin source type 재평가 |
| **Issue #31005** | Anthropic 이 `.agents/skills/` 지원 추가 | 결정 A shared-agents 대상 확장 (A4) |
| **OpenCode `{env:X}` deprecate** | OpenCode 가 문법 breaking change | 결정 E-1 재논의 |
| **Phase 2 `{secret:...}` 실구현** | Structured reference 로 전환 필요 판명 | 결정 E-6 재설계 |
| **사용자 nested 보간 요구** | 현재 E-9 금지, 요구 누적 시 | E-9 재논의 |
| **Path traversal 우회 발견** | symlink 기반 등 | E-10 방어 강화 |

### 12.4 최우선 기술 리스크 (monitor)

| 리스크 | 영역 | 대응 |
|---|---|---|
| **Config round-trip 편집 안전성** | §10 (결정 B) | POC-1, POC-2, POC-3, POC-8 골든 테스트 |
| **Plugin introspection 정확성** | §5 (결정 C capability_matrix) | POC-5, POC-6 |
| **Windows install 5-10% 커버리지 공백** | §9 (결정 D) | 부록 B 라이브러리 스택으로 상쇄 |
| **Secret 보간 target format 안전 인코딩** | §8 E-18 | POC-14 골든 테스트 |

### 12.5 사용자 리뷰 게이트 (`writing-plans` 인수인계 전)

본 spec 이 다음을 만족하면 `superpowers:writing-plans` 로 전환:

1. 사용자 리뷰 게이트 통과 (§0.1 Q1~Q8 재확인, §12 Open Issues 수용)
2. POC 14 항목 중 **Phase 1 첫 sprint 우선순위** 지정 (최우선: POC-1, POC-3, POC-5, POC-10)
3. 11 구현 컴포넌트 별 입출력 계약 명확 (본 spec 의 §4 Manifest / §5 Lock / §6 CLI 가 계약 근거)

---



## 부록 A — Π ↔ 결정 ↔ 구현 컴포넌트 3중 매트릭스

본 부록은 Π1~Π7 불변식, 5 결정 (A/B/C/D/E), 11 구현 컴포넌트를 **교차 매트릭스** 로 정리한다. 구현 중 "이 컴포넌트는 어느 Π 를 보호해야 하는가?" 질문을 빠르게 답하기 위한 참조.

### A.1 11 구현 컴포넌트 (TODO L157~204)

1. **Manifest parser/validator** (yaml + zod) — §4
2. **Lock 파일 read/write** — §5
3. **Plugin introspection 엔진** — §5.8, POC-5
4. **Fetcher adapters** (Git/File/Http/Npm/External/Adopted) — §4.4
5. **Config file updaters (round-trip)** — §10
6. **Secret 보간 엔진** (E-1~E-19) — §8
7. **Symlink/copy installer** (D-1~D-11) — §9
8. **Format transformer** (D-14) — §9.9
9. **`concord doctor`** — §6.9
10. **`concord cleanup`** (β3 신설) — §6.12
11. **CLI 11 명령 구현** — §6

### A.2 Π ↔ 결정 매핑

| Π | 결정 A | 결정 B | 결정 C | 결정 D | 결정 E |
|---|---|---|---|---|---|
| **Π1** | — | raw/normalized hash, lock | Q1 (lockfile_version), §5 lock | D-1 lock 구체값+reason | E-3 unresolved only |
| **Π2** | — | — | Q3 D2 (I6 Plugin intact), passthrough | D-3 shebang 0%, D-5 user vs drift | E-5 자산 파일 미보간 |
| **Π3** | A1~A5 (provider 위임) | scope 위임 | β3 α 3 source types | D-3 shell 위임, D-14 format transform | E-1 OpenCode 차용, E-5 양보 |
| **Π4** | — | `--json` vs TTY 분리 | Q2 V4, Q4 γ Hybrid | D-4 `--json` 전체 matrix | E-8 TTY/`--json`/debug 분리 |
| **Π5** | — | additive scope/CLI | Π5 3줄 룰, `concord_version` constraint | Q4 capability_matrix 확장 4 필드 | E-6 `{secret}` Phase 2 reserved |
| **Π6** | — | drift/orphan/shadowed 명시 | Q4 4 status + reason enum | D-12 reason enum 17개 | E-4 fail-closed, E-17 error 투명성 |
| **Π7** | A1 parse error | URL+sha256, scope 충돌 | Q3 D4, §A Reserved Registry | D-11 case-insensitive collision | E-9 nested, E-10 traversal |

### A.3 컴포넌트 ↔ Π 매핑 (각 컴포넌트가 보호해야 할 Π)

| # | 컴포넌트 | 주 Π | 부 Π | 핵심 검증 |
|---|---|---|---|---|
| 1 | Manifest parser | Π7, Π2 | Π5 | Reserved registry (§2.1) + passthrough |
| 2 | Lock I/O | Π1, Π4 | Π6 | I1~I6 불변식 + `lockfile_version` |
| 3 | Plugin introspection | Π2 | Π6 | I6 intact + `capability_matrix` 정확성 |
| 4 | Fetcher adapters | Π3, Π7 | Π1 | URL https+sha256, Reserved scheme |
| 5 | Round-trip updater | Π1, Π7 | Π2 | raw/normalized hash + marker 경계 |
| 6 | Secret 엔진 | Π6, Π7 | Π1, Π2, Π4 | E-1~E-19 전체 |
| 7 | Installer | Π1, Π3 | Π6 | install_mode + reason enum |
| 8 | Format transformer | Π3, Π1 | Π5 | D-14 + Π5 additive |
| 9 | doctor | Π4, Π6 | Π1 | `--json` 완전 + Q2' 심각 3종 |
| 10 | cleanup | Π2, Π3 | Π1 | extraneous preservation (§10.6) |
| 11 | CLI | Π4 | Π3, Π6 | TTY/`--json`/debug 분리 |

### A.4 컴포넌트 ↔ 결정 ↔ POC 매핑

| # | 컴포넌트 | 주 결정 | 관련 POC |
|---|---|---|---|
| 1 | Manifest parser | C, B, E | POC-3 (YAML), POC-8 (passthrough), POC-12 (escape) |
| 2 | Lock I/O | C, D, E | POC-5, POC-11 |
| 3 | Plugin introspection | C | POC-5, POC-6 |
| 4 | Fetcher adapters | B | POC-1 (TOML), POC-2 (JSONC) |
| 5 | Round-trip updater | B | POC-1, POC-2, POC-3, POC-8 |
| 6 | Secret 엔진 | E | POC-12, POC-13, POC-14 |
| 7 | Installer | D | POC-9, POC-10, POC-11 |
| 8 | Format transformer | D | — (fix 로직, 라이브러리 없음) |
| 9 | doctor | B, C, D, E | POC-10 (preflight 5) |
| 10 | cleanup | C | POC-8 (preservation) |
| 11 | CLI | B | — (UX, POC 별도 없음) |

---



## 부록 B — Library Stack & Dependencies

본 부록은 결정 D 부록 A + 결정 B round-trip 도구 + 결정 E secret/path 도구를 통합. Node.js v20+ LTS 전제.

### B.1 Core 라이브러리 스택 (결정 D 부록 A 확장)

```json
{
  "engines": {
    "node": ">=22"
  },
  "dependencies": {
    "zod": "^4.x",                    // schema (§4, §5). Zod 4 채택 (2026-04 기준 GA).
                                       //   - z.toJSONSchema() native 지원 → zod-to-json-schema 불필요
                                       //   - discriminatedUnion 현재 사용, 향후 z.switch 로 migration 예정
                                       //   - .passthrough() 작동하되 .loose()/z.looseObject 로 전환 권장
    "yaml": "^2.x",                   // YAML format-preserving (POC-3, eemeli 의 `yaml` npm 패키지)
    "jsonc-morph": "^0.3.x",          // JSONC round-trip 1순위 (§10.1, POC-2). 0.x pin →
                                       //   caret 은 patch 만 허용. publish 활성 (2026-04).
    "jsonc-parser": "^3.x",           // JSONC fallback (§10.1, POC-2)
    "@decimalturn/toml-patch": "^1.x", // TOML candidate A (POC-1 1순위, 2026-04 active, TOML v1.1)
    "@shopify/toml-patch": "^0.3.x",  // TOML candidate B (Rust toml_edit wasm wrapper, 최근 1년 stale)
    "@ltd/j-toml": "^1.x",            // TOML candidate C (3년 무변경, top-level tables fallback)
    "symlink-dir": "^10.x",           // Windows junction/hardlink cascade (D-1, POC-9)
    "fs-extra": "^11.x",              // 파일 조작 + ensureSymlink
    "graceful-fs": "^4.x",            // Windows EBUSY/EPERM retry (D, 부록 9.11)
    "is-elevated": "^4.x",            // Admin 권한 감지 (D-15)
    "is-wsl": "^3.x",                 // WSL 감지 (D-9)
    "strip-bom": "^5.x",              // BOM 제거 (D, E-15). **ESM-only** — CJS 빌드는
                                       //   dynamic import() 또는 strip-bom-buf 대체 검토.
    "write-file-atomic": "^7.x",      // Atomic write (D)
    "cross-spawn": "^7.x",            // Cross-platform spawn (D-4 Codex probe)
    "semver": "^7.x",                 // concord_version constraint (§4.6)
    "commander": "^14.x"              // CLI framework (Plan 1~)
  }
}
```

### B.2 Version Pin 정책

- **Caret** (`^x.y.z`): minor/patch 업데이트 허용, major 고정 (semver 전제)
- **0.x caret**: patch 만 허용 (semver 규약). jsonc-morph / @shopify/toml-patch 해당
- **Lock 파일**: `package-lock.json` commit (git-tracked, reproducibility)
- **Node 엔진**: `>=22` (active LTS, 2027-04-30 까지). Node 20 은 2026-04-30 EOL 이므로 baseline 에서 제외

### B.2.1 Zod 4 채택 결정 (2026-04-22 업데이트)

**변경 이유**: 프로젝트 `package.json` 에 이미 `zod@^4.3.6` 이 선택되어 있음. Zod 3 고정이라는 기존 spec 결정을 수용 대신 retrospective 재평가.

**영향**:
- `zod-to-json-schema` 제거 → Zod 4 native `z.toJSONSchema()` 사용
- `.passthrough()` → `.loose()` 또는 `z.looseObject({...})` 로 migration 가능 (`.passthrough()` 는 Zod 4 에서도 호환)
- `z.discriminatedUnion("field", [...])` → 현재 유지. 향후 `z.switch` API 로 정식 migration (Zod 로드맵)
- `z.record(K, V)` → Zod 4 에서 2인수 필수 (본 spec 예시는 이미 정합)

**Minority (M24 신규)**: Zod 4 의 `z.discriminatedUnion` 수명 — `z.switch` GA 시점에 전면 migration 필요.

### B.3 라이브러리별 용도 매트릭스

| 라이브러리 | 주 용도 | 관련 §/D/E |
|---|---|---|
| `zod` | Manifest + Lock schema validation | §4, §5 |
| `yaml` (eemeli) | YAML format-preserving | §4, §10 |
| `jsonc-morph` | JSONC round-trip (1순위) | §10.1 |
| `jsonc-parser` | JSONC fallback | §10.1 |
| `@decimalturn/toml-patch` / `@shopify/toml-patch` / `@ltd/j-toml` | TOML round-trip (POC-1 벤치마크, 1순위 = @decimalturn) | §10.2 |
| `symlink-dir` | Windows junction cascade | D-1 §9.2 |
| `fs-extra` | 파일 조작 | D 부록 |
| `graceful-fs` | Windows EBUSY/EPERM retry | §9.11 |
| `is-elevated` | Admin 권한 | D-15 |
| `is-wsl` | WSL 감지 | D-9 |
| `strip-bom` | BOM 제거 | D, E-15 |
| `write-file-atomic` | Atomic write + retry | D |
| `cross-spawn` | Codex 버전 probe, spawn cross-platform | D-4 |
| `semver` | `concord_version` constraint | §4.6 |
| `zod-to-json-schema` | JSON Schema SoT 생성 | §5.6 |

### B.4 Dev Dependencies (Phase 1 예상)

```json
{
  "devDependencies": {
    "typescript": "^5.x",
    "vitest": "^1.x",           // 테스트 러너 (TDD)
    "@types/node": "^20.x",
    "tsup": "^8.x"              // 빌드 (CJS/ESM dual + dts)
  }
}
```

### B.5 Library 대안 (향후 재평가)

| 현재 선택 | 대안 | 재평가 조건 |
|---|---|---|
| `jsonc-morph` | `jsonc-parser` 단독 | jsonc-morph 유지보수 중단 시 |
| `@decimalturn/toml-patch` (1순위) | `@shopify/toml-patch` / `@ltd/j-toml` | POC-1 benchmark 결과 (1순위는 언제든 스왑 가능) |
| `symlink-dir` | `fs-extra.ensureSymlink` 수동 fallback | symlink-dir 유지보수 중단 시 |
| `zod` 4.x `z.discriminatedUnion` | `z.switch` (Zod 로드맵) | Zod `z.switch` GA 시점 |
| `strip-bom` (ESM) | `strip-bom-buf` | CJS 빌드 필요 시 |
| TypeScript 전체 | 부분 Rust (N-API) | L1~L5 트리거 시 (§1.12) |

---



## 부록 C — 용어집

### C.1 핵심 용어

| 용어 | 정의 | 참조 |
|---|---|---|
| **Π1~Π7** | Top-Level Invariants. Phase 1/2 모두에서 유효한 7 최상위 원칙 | §1 |
| **scope** | Manifest 의 4 layer (enterprise / user / project / local). 병합 순서 별도 용어 = precedence | §11 |
| **precedence** | Scope 병합 우선순위 (enterprise → user → project → local) | §11.5 |
| **β3 α** | Plugin 자산 타입의 source 모델. 3 source types (`claude-plugin`/`codex-plugin`/`opencode-plugin`) + 3 플래그 (`auto_install`/`enabled`/`purge_on_remove`) | §3.3 |
| **I6** | Plugin intact 불변식. concord 는 plugin 내부를 관측하되 조작 안 함 | §1.2 Π2 + §5.10 |
| **Reserved identifier** | §2.1 레지스트리 등재 문자열. Phase 1/2 공통 parse error | §2 |
| **Generic unknown** | 레지스트리 미등재 unknown 필드. Passthrough (lock `nodes.<key>.declared`) | §2.4 |
| **extraneous** | Manifest 에 없지만 provider 에 있는 자산. `cleanup` 의 대상 | §7.1 |
| **capability_matrix** | Phase 1 진단 데이터. 4 status + reason enum discriminated union | §5.6 |
| **drift_status** | 4+1 상태 (none/source/target/divergent/env-drift) | §7.3 |
| **install_reason** | Fallback provenance enum 17+ entries | §5.6.2, D-12 |
| **marker 블록** | concord 소유 영역 표시자. `>>>> concord-managed:<id> (hash:<suffix>)` | §10.5 |
| **raw_hash vs normalized_hash** | Bit-exact vs formatter-tolerant content hash | §10.4 |

### C.2 CLI 용어

| 용어 | 정의 |
|---|---|
| **Tier 1 sync** | `concord sync [--scope X]` — bare / CSV scope |
| **Tier 2 sync** | `concord sync --file <path>` / `--url <url>` — 파일명 자동 scope 추론 |
| **Guided bootstrap** | 첫 실행 시 y/N confirm + detect + init lock + sync |
| **context-aware adopt** | cwd 에 project manifest 있으면 user+project, 없으면 user 만 |
| **never-default** | `--scope enterprise` / `--scope local` 는 항상 명시 필요 |
| **Terraform apply 패턴** | dry-run + y/N + `--yes`/`--write` bypass + non-TTY conservative fail |

### C.3 상태 머신 용어

| 용어 | 정의 |
|---|---|
| **installed** | manifest + provider + 3 digest 일치 |
| **outdated** | manifest + provider + source_digest 불일치 |
| **missing** | manifest + !provider |
| **integrity-mismatch** | `content_digest` 기대값 불일치 → refuse + doctor 발화 |
| **install-failed** | 설치 실패 → lock `status: failed` + atomic rollback |
| **orphan** | manifest + !provider (또는 provider 가 못 찾음) |
| **shadowed** | scope precedence 에 의해 가려진 자산 |
| **scope-conflict** | 동일 id 가 여러 scope 에 충돌 (alias/override 없음) |
| **readonly-managed** | Provider 관리 파일에 concord 수정 시도 |
| **marker-broken** | marker 훼손 |

### C.4 보간 용어

| 용어 | 정의 |
|---|---|
| **on-install eager** | concord 가 파일을 native 경로에 쓸 때 resolve |
| **fail-closed** | Missing env var = parse error (silent empty 금지) |
| **축 C 트리거** | sync/update/doctor 시 env 재평가 |
| **env-drift** | manifest/source 불변 + env 변경 + target 구 값 |
| **allowlist** | 보간 허용 필드 명시 목록 (source/env/authHeader/headers) |
| **depth 1** | 보간 재귀 금지 (한 단계만) |
| **escape (E-13)** | `{{env:X}}` (이중 브레이스) 로 리터럴 `{env:X}` 표현 |

### C.5 Windows 용어

| 용어 | 정의 |
|---|---|
| **install_mode** | `symlink` / `hardlink` / `copy` |
| **auto cascade** | Unix: symlink → hardlink → copy / Windows: copy first |
| **Developer Mode** | Windows symlink 허용 토글. 감지는 간접 (symlink 시도 → EPERM catch) |
| **Git Bash** | Claude hook 강제 shell (`CLAUDE_CODE_GIT_BASH_PATH`) |
| **WSL** | Windows Subsystem for Linux. `is-wsl` 감지, Linux 취급 |
| **`/mnt/c/`** | WSL 에서 Windows FS 마운트 — Windows 규칙 분기 |
| **case-insensitive collision** | Windows NTFS/macOS APFS 에서 대소문자만 다른 이름 = parse error |

### C.6 Phase 관련

| 용어 | 정의 |
|---|---|
| **Phase 1** | 설정을 한 번에 Import/sync 하는 툴 (same-tool sync) |
| **Phase 2** | 툴끼리의 공통 workflow/harness (cross-sync, asset-level IR) |
| **phase2_projections:** | Phase 1 lock 의 빈 예약 섹션. Phase 2 에서 asset-level IR preview |
| **RFC Defense Lines** | Phase 2 에서도 변경 금지 8 항목 (§1.10) |
| **Invariant RFC Gate** | Π 완화 RFC 4 요건 (§1.11) |

### C.7 약어

| 약어 | 풀어쓰기 |
|---|---|
| **IR** | Intermediate Representation (Phase 2 canonical IR) |
| **SoT** | Source of Truth (Zod / JSON Schema 역할) |
| **POC** | Proof of Concept |
| **Π** | Pi (top-level invariant) |
| **TTY** | Teletype — interactive 터미널 환경 |
| **Q1/Q2/Q3/Q4/Q5/Q2'** | 결정 C 섹션 7 의 판단-1~5 + 세부-2' |
| **D-N** | 결정 D 의 명시 결정 N번 (D-1~D-15) |
| **E-N** | 결정 E 의 명시 결정 N번 (E-1~E-19) |
| **A1~A5** | 결정 A 추가 조항 |
| **γ Hybrid** | capability_matrix 표기 선택지 — 내부 β 4 status + 외부 α 기호 |
| **L1~L5** | 언어 재검토 트리거 5개 (§1.12) |

---



---

**End of Specification.**
