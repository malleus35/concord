# 결정 C — Plugin 자산 타입의 source 모델 **[β3 재구조 확정 2026-04-20, 섹션 1~6 완료, 섹션 7 Q1~Q5 전체 확정 2026-04-21, 최종 통합 원칙 작성 진행 중]**

## 문서 지위

- **결정 C v1** (`01-bundle-plugin.md`) : 2026-04-20 리뷰 2회에서 기각 (Bundle ↔ Plugin 경계 프레임 오류)
- **v2 준비** (`02-v2-preparation.md`) : 같은 날 계보학적 재조사로 **"Bundle" 범주 자체가 인플레이션** 으로 판명, 대체됨
- **현 문서 (v3 = β3 재구조)** : 사용자 정체성 재선언에 따라 전면 재설계. 섹션 1~6 확정, 섹션 7~8 진행 중.

## 배경 — Bundle 개념 인플레이션 계보 (`feedback_bundle_inflation.md` 요약)

```
plans/           : plugin 만 있음                  (bundle 0회)
      ↓
06-plugins.md    : "번들 단위로 여러 확장을 묶어..."  (형용사 등장)
      ↓
07-overlap       : Type D 라벨 = "번들 (black box)"  (라벨 고정)
                 : manifest 섹션 이름 `bundles:`    (어휘 교체)
      ↓
09-corrections   : "결정 C = Bundle ↔ Plugin 경계"   (별개 범주인 척)
      ↓
STEP-C v1/v2     : "Bundle 을 어떻게 모델링?" 자체 질문  (완전 인플레이션)
```

**진실**: "Bundle" 은 결코 별개 자산 타입이 아니었다. plugin 의 속성 ("여러 자산을 번들하는 컨테이너") 이 어휘 반복으로 대명사화된 것. "Bundle ↔ Plugin 경계" 는 존재하지 않는 경계.

## 사용자 정체성 재선언 (2026-04-20)

> **"Phase 1 = 설정을 한 번에 Import/sync 하는 툴, Phase 2 = 툴끼리의 공통 workflow/harness 구축 (cross-sync)"**

"Bundle" 같은 중간 추상은 이 정체성에서 이탈한 흔적. β3 채택으로 복귀.

---

## 섹션 1 — 정체성 정박 [확정]

### 결정 C 의 본래 역할 재정의

| 구분 | 내용 |
|---|---|
| 기각된 이름 | "결정 C — Bundle ↔ Plugin 경계" (가짜 경계) |
| **신 이름** | **"결정 C — Plugin 자산 타입의 source 모델"** |

### Phase 별 역할 정합

| Phase | 역할 | 결정 C 와의 관계 |
|---|---|---|
| **Phase 1** | 설정 한 번에 import/sync | plugin 을 다른 자산처럼 선언 + lock. provider-native 설치 대행 |
| **Phase 2** | 툴끼리의 공통 workflow/harness (cross-sync) | plugin 내부 자산의 cross-tool 변환 — **β3 α 가 아니라 asset-level IR** |

### 원칙 (MEMORY.md ground rules + 신설)
1. Provider-native 기본, 공유는 명시적 opt-in
2. Resolver 중복 구현 금지 (single sync tool 철학)
3. **[신설] 범주 창조 전 계보 검증** — `feedback_bundle_inflation.md`

---

## 섹션 2 — Asset Type 6개 복원 [확정]

### Type A/B/C/D 분류 폐기

기존 분류 (MEMORY.md `## Asset Type Classification`) 는 **저장 방식 설명** 이었는데 Type D 에 "번들" 을 라벨로 박으면서 plugin 을 가리키는 대명사가 됨. 범주가 아닌 **저장 속성** 이므로 분류로 쓰면 안 됨.

### 복원된 6 자산 타입 (초기 scope 그대로, MEMORY.md L13)

```
skills / subagents / hooks / mcp_servers / instructions / plugins
```

- 6개 모두 1급 시민
- plugin 은 다른 자산과 달리 **컨테이너 source** 를 가질 수 있는 특수성만 있음 (섹션 3 에서 정의)
- "저장 방식" 은 분류축이 아니라 각 자산의 **속성** 으로 처리

### 자산별 저장 방식 요약 (분류 아닌 속성)

| 자산 | 저장 | 특이사항 |
|---|---|---|
| skills | 파일 | agentskills.io 표준 호환 (D-mid, 섹션 4) |
| subagents | 파일 | Claude/OpenCode MD+YAML, Codex TOML |
| hooks | 설정 병합 + 파일 (2 자산 분리 유지) | Claude 26 events / Codex 5 / OpenCode 는 plugin 로 구현 |
| mcp_servers | 설정 병합 | MCP 공식 스펙 overlay (섹션 4 iv) |
| instructions | 문서 include | Claude `@file`, Codex layered concat |
| **plugins** | **컨테이너 source** | `claude-plugin` / `codex-plugin` / `opencode-plugin` 3종 (섹션 3) |

---

## 섹션 3 — β3 옵션 α: Plugin source type 모델 [확정]

### Manifest 문법

```yaml
# concord.yaml
plugins:
  - id: github-mcp
    source:
      type: claude-plugin                 # provider 별 3종
      locator:
        kind: github                      # Claude 5 source 중 하나
        repo: anthropic/claude-plugins
        plugin: github-mcp
        ref: main
    auto_install: false                   # 설치 여부
    enabled: true                         # 활성화 여부 (OpenClaw 2단계 게이트 차용)
    purge_on_remove: false                # auto_install: true 면 필수
    scope: project

  - id: gmail
    source:
      type: codex-plugin
      locator:
        kind: github
        repo: openai/codex-marketplace
        plugin_name: gmail
        ref: main
    auto_install: false
    enabled: true

  - id: "@acme/lint"
    source:
      type: opencode-plugin
      package: "@acme/opencode-plugin"
      version: "^2.0.0"
    auto_install: true
    enabled: true
    purge_on_remove: false
```

### Source type 별 locator 스키마 (공식 문서 근거)

| Source Type | Locator 종류 | 공식 계약 |
|---|---|---|
| **claude-plugin** | `github` / `url` / `git-subdir` / `npm`(+`registry`) / `local-dir` (5종) + `strict: false` + `--sparse` | ✅ `code.claude.com/docs/en/plugin-marketplaces` |
| **codex-plugin** | `github` / URL / `local` (3종) + `codex marketplace add` CLI | ⚠️ v0.121 changelog + 서드파티 요약 (공식 docs 미명시, semi-official 라벨) |
| **opencode-plugin** | npm package only (scoped/unscoped) | ✅ `opencode.ai/docs/plugins/`. git/tarball/alias 는 Bun 기능이지 OpenCode 보장 아님 |

### 3 플래그 설계

| 플래그 | 의미 | 기본값 |
|---|---|---|
| `auto_install` | concord 가 provider CLI 로 설치 자동화 | `false` |
| `enabled` | provider config 의 활성화 플래그 | `true` |
| `purge_on_remove` | manifest 에서 제거 시 디스크 cache 도 삭제 | `false` (`auto_install: true` 면 **필수**) |

**근거**: OpenClaw 의 2단계 게이트 (`plugins.allow` + `enabled`), 설치/제거 대칭 (Kant 축 1).

### 기각된 대안
- 옵션 β (단일 source type + discriminator) : "plugin" source 명이 자산 타입 명과 중복, provider 별 필드 제약 `allOf` 복잡
- 옵션 γ (자산 최상위 `provider:` 필드) : 다른 자산 타입과 비대칭

---

## 섹션 4 — D-mid + (iv) overlay [확정]

### Skills (D-mid)

agentskills.io 표준 (SKILL.md frontmatter, 3 provider 공용, Hermes/OpenClaw/Claude/Codex/OpenCode 네이티브 로드) 위에 **flat prefix 방식** 으로 concord 확장.

```yaml
skills:
  - name: deploy-checker                  # ◀ agentskills.io 표준
    description: Validates deployment manifests
    allowed-tools: [Read, Bash]
    license: MIT
    concord:scope: project                # ◀ concord 확장 (prefix)
    concord:source:
      type: github
      repo: acme-corp/concord-skills
      ref: main
    concord:target: shared-agents         # ◀ 결정 A 의 opt-in
```

### MCP (iv — MCP 공식 스펙 overlay 병행)

MCP 공식 스펙 필드를 네이티브로 두고 concord 확장을 prefix 로.

```yaml
mcp_servers:
  - name: github-mcp                      # ◀ MCP 공식 스펙
    command: npx
    args: ["-y", "@modelcontextprotocol/server-github"]
    env: { GITHUB_TOKEN: "${env:GITHUB_TOKEN}" }
    concord:scope: project                # ◀ concord 확장
    concord:source:
      type: npm
      package: "@modelcontextprotocol/server-github"
      version: "^1.2.0"
```

`concord lint --standard mcp` 가 MCP 스펙 준수 검증.

### 다른 자산의 표준 stance

| 자산 | 표준 stance |
|---|---|
| Skill | **agentskills.io overlay** (D-mid) ✅ |
| MCP | **MCP 공식 스펙 overlay** (iv) ✅ |
| Subagents | 공통 표준 없음, provider-specific |
| Hooks | 공통 표준 없음, capability_matrix 로 호환성 노출 |
| Instructions | 공통 표준 없음, mirror 수준 |
| Plugins | source type 별 provider-native (섹션 3) |

### 생태계 상호운용 효과

- Skilldock.io / skills-supply / skillshare 로 export 가능
- `concord import --url` 로 역방향 import
- Hermes agent / OpenClaw 사용자가 concord-managed skill 직접 로드

### 기각된 대안
- **D-min**: skill body 만 표준 준수, manifest 는 독자 스키마 — 생태계 마찰 큼
- **D-max**: 모든 자산 표준 overlay — 존재하지 않는 표준을 concord 가 만들어내는 꼴
- **옵션 (iii) 섹션 분리**: `standard:` / `ext:` 2단계 중첩 — YAML 들여쓰기 2단계, 외부 도구 진입점 비표준

---

## 섹션 5 — Lock 구조 [확정]

### 뼈대

```yaml
# concord.lock
version: 1

# ─── roots: manifest 선언과 1:1 대응 ───
roots:
  - key: "<scope>:<asset_type>:<id>"
    scope: project|user|local|enterprise
    asset_type: skills|subagents|hooks|mcp_servers|instructions|plugins
    id: "<user-declared>"
    manifest_source: { file: concord.yaml, line: 42 }
    declared: { ... }                     # manifest 원문
    requested_state: present|disabled

# ─── nodes: 실제 해석된 자산 flat graph ───
nodes:
  "<provider>:<asset_type>:<resolved>@<version>":
    provider: claude-code|codex|opencode
    asset_type: ...
    identity: { name, version }
    source: { ... }                       # provider-specific discriminated union
    digests:
      source:  "git:<40hex>" | "sha256:<64hex>" | "sri:sha512-..."
      content: "sha256:<64hex>"           # installed bytes
      catalog: "<optional>"               # marketplace entry commit
    first_fetch:
      observed_at: "2026-04-20T..."
      tofu_confirmed: true
    installation:
      state: installed|outdated|missing   # ◀ 섹션 6 모델 B
      install_path: "<abs>"
      bytes_sha256: "<64hex>"

    # ─── 자산별 필드 분리 ───
    # Skill 전용 (D-mid)
    standard_fields: { name, description, allowed-tools, license, ... }
    concord_fields:  { scope, source, target, ... }

    # MCP 전용 (iv)
    protocol_fields: { name, command, args, env, ... }
    concord_fields:  { scope, source, ... }

    # Plugin 전용 — γ Hybrid: 내부 = discriminated union (Q4 확정 2026-04-21)
    capability_matrix:                    # ◀ Phase 1 필수
      claude-code:
        skills: { status: supported, count: 2 }
        mcp:    { status: supported, count: 1 }
        hooks:  { status: supported, count: 3 }
        agents: { status: supported, count: 1 }
      codex:
        skills: { status: supported, count: 2 }
        mcp:    { status: supported, count: 1 }
        hooks:  { status: detected-not-executed, count: 0, detected: 1, reason: FeatureFlagDisabled }
        agents: { status: supported, count: 0 }
      opencode:
        skills: { status: supported, count: 2 }
        mcp:    { status: supported, count: 1 }
        hooks:  { status: na }
        agents: { status: supported, count: 1 }
    # 4 status (discriminated union): supported | detected-not-executed | na | failed
    # CLI 렌더링 (α 기호): supported→N / detected-not-executed→N* / na→- / failed→?
    # 상세 schema: 섹션 7 Q4
    dependencies:                         # Claude transitive (v2.1.110+)
      - name: audit-logger
        constraint: "^1.0.0"
        resolved_key: "<nodes key>"
    min_engine: { claude-code: ">=2.1.110" }

    requested_by: [ "<roots key>" ]
```

### 확정된 핵심 5개

1. **roots + nodes flat graph** (nested tree 대신) — v2 준비 §2.2 방식 유지
2. **3중 digest** (source / content / catalog) — TOFU + drift 3겹
3. **필드 분리**: skill `standard_fields` + `concord_fields` / MCP `protocol_fields` + `concord_fields` / plugin `capability_matrix`
4. **`capability_matrix` Phase 1 도입** — plugin 내부 구성요소를 `{claude-code: ..., codex: ..., opencode: ...}` 로 수치 요약. Phase 2 cross-sync ceiling 의 기반
5. **Claude `dependencies` transitive + `min_engine`** — 공식 확정 사실 (v2.1.110+)

### Phase 1 vs Phase 1.5 스코프 분리 (Codex 통찰 반영)

- **Phase 1 필수**: `capability_matrix` 숫자 요약 (introspection 으로 집계)
- **Phase 1.5/Phase 2 확장**: plugin 내부 자산의 **inner_assets** nested node 등록 (Phase 2 asset-level cross-sync 기반)

Phase 1 의 introspection 엔진:
- Claude: `plugin.json` 파싱
- Codex: `.codex-plugin/plugin.json` 파싱
- OpenCode: `package.json#main` entry + hooks 추출 (정적 분석 한계 가능성, POC 필요)

### 불변식 체크

| 불변식 | 이 lock 구조 | 근거 |
|---|---|---|
| I1 Host 비침범 | ✅ resolver 중복 없음, observed state | Spinoza |
| I2 Provider-native 존중 | ✅ `protocol_fields`/`standard_fields` = native spec 보존 | 섹션 4 (iv) |
| I3 Lossy 명시 | ✅ `capability_matrix` 의 `detected-not-executed`/`na`/`failed` status | Nietzsche 정직성 |
| I4 무결성 | ✅ 3중 digest + raw/normalized hash (결정 B) | MEMORY.md L128 |
| I5 가역성 | ✅ `standard_fields` + `concord_fields` 분리로 원형 복원 | 결정 B |
| **I6 Plugin intact** | ✅ Phase 1 은 plugin 내부 자산을 관측하되 조작하지 않음. include/exclude/allow_disassemble 등 해체 문법 = parse error | **Q3 (2026-04-21)** |

---

## 섹션 6 — 상태 머신 (모델 B Homebrew Bundle 스타일) [확정]

### 왜 단순화 되었나

웹서치 + Codex 수렴 결과 concord 는 **공유 관할 모델 (B)** (Homebrew Bundle / mise / asdf 와 동일 범주). npm/cargo 같은 단일 관할 모델 아님. 이에 따라 2층 이분법 (managed-* vs tracked-*) 은 **Homebrew `installed_on_request` 실패 패턴** 으로 판명.

### State × Event × Opt-in

```
📋 State (manifest 항목만) — 3개
├── installed     (manifest 있음, 실제 설치, 버전·digest 일치)
├── outdated      (manifest 있음, 설치됐으나 버전 낮음)
└── missing       (manifest 있음, 미설치)

⚠️ Event (state 아닌 사건) — 2개
├── integrity-mismatch  (digest 불일치 → 즉시 fail-closed, sync 중단)
└── install-failed      (설치 시도 실패 → report + retry 최대 3회)

🧹 Opt-in 탐지 (cleanup 서브커맨드 전용)
└── extraneous    (manifest 없는데 디스크 존재. sync 기본 무시)
```

### CLI 명령 × 동작 매핑

| 명령 | 본다 | 수정한다 |
|---|---|---|
| `concord sync` | installed/outdated/missing | outdated→installed, missing→installed (`auto_install=true` 면) |
| `concord check` / `doctor` | 전부 (extraneous 포함) | 없음, 리포트만 |
| `concord cleanup` (opt-in, **신설**) | extraneous | 프롬프트 후 prune |

### 결정 B CLI 세트에 `cleanup` 추가

```bash
concord cleanup                   # extraneous 탐지 + 프롬프트
concord cleanup --dry-run         # 탐지만, 삭제 안 함
concord cleanup --yes             # 비대화 강제
```

B-7 의 `init / detect / adopt / import / replace / sync / update / doctor / list / why` 에 `cleanup` 합류 (총 11개).

### 결정 B 상태 머신과의 관계

- 결정 B: `install/update/prune/skip + drift/orphan/shadowed/scope-conflict/readonly-managed/marker-broken` = **action 차원 + reason 차원**
- 섹션 6: `installed/outdated/missing + integrity-mismatch/install-failed + extraneous` = **state 차원**
- 두 축은 직교, 결정 B reason 은 섹션 6 state 의 부가 정보로 편입

### 기각된 대안 (모델 A)

- "2층 이분법" (`managed-*` vs `tracked-*`) + `integrity-mismatch` 사건 + `cache-orphan` 상태 : Homebrew 의 `installed_on_request` 플래그가 과거 겪은 **orphan 오판** 버그 패턴을 재현할 위험.

---

## 섹션 7 — Phase 1 ↔ Phase 2 경계 [진행 중]

### 배경 — Codex cross-compile 리뷰 (`task-mo77ph1w-t56nsq`) 의 결정적 통찰

> β3 α (`claude-plugin/codex-plugin/opencode-plugin`) 는 Phase 1 / lock / provenance 에 **적합** 하나, Phase 2 canonical IR 로는 **부적합**. 세 plugin 의 본질이 달라서 (Claude=파일 번들, Codex=번들+apps/MCP, OpenCode=실행 코드). Cross-sync 핵심은 plugin 단위가 아니라 **asset-level (skills/MCP/subagents/...)** 로 내려가야 함.

### 섹션 7 에서 확정할 5 질문

| # | 질문 | 상태 |
|---|---|---|
| **Q1** | Phase 1 lock 이 Phase 2 IR 의 "씨앗" 인가? | **✅ 확정 2026-04-21 — Option C 중간 결합 (Cargo 모델)** |
| **Q2** | Phase 1 에서 cross-tool 호환 ceiling 을 노출하는가? | **✅ 원칙 확정 2026-04-21 — Option V 확장형** |
| **Q4** | `capability_matrix` 의 표기 공식 정의 | **✅ 확정 2026-04-21 — γ Hybrid + discriminated union (4 status)** |
| **Q2'** | Q2 상세 (심각 mismatch 3종 확정) | **✅ 확정 2026-04-21 — Q4 기반 (a)/(b)/(c) 조건 표현** |
| **Q3** | Plugin 해체 (γ Disassemble) 는 Phase 1 에서 어떤 형태로 존재? | **✅ 확정 2026-04-21 — (a) intact only + invariant + Q2'/Q4 귀결 + parse error 방어선** |
| **Q5** | Phase 1 → Phase 2 manifest 문법 변화 (additive vs breaking) | **✅ 확정 2026-04-21 — Option P+ (npm + Dart constraint hybrid), H 기각 (10 선례 중 1건 뿐)** |

---

### Q1 확정 — 중간 결합 (Cargo 모델) [2026-04-21]

#### 결정

**Phase 1 lock 과 Phase 2 IR 은 동일 파일에 공존하되, 섹션 분리 + `lockfile_version` 게이팅으로 소유권 분리.** Phase 1 lock 의 reproducibility contract 에 Phase 2 IR 은 포함되지 **않는다**. `capability_matrix` 는 Phase 2 IR 의 "유도된 진단 데이터" 이지 contract 의 일부가 아니다.

#### 3 원칙

- **P1** Phase 1 lock = **provider-native reproducibility 계약**. `bytes_sha256` + `source digest` 가 핵심. provider 가 바꾸면 lock 도 바뀐다.
- **P2** `capability_matrix` 는 **유도된 진단 데이터** — Phase 2 IR 의 씨앗으로 **재사용 가능** 하지만 Phase 1 의 reproducibility contract 에는 포함 안 됨.
- **P3** 같은 `concord.lock` 파일 + **섹션 분리** + `lockfile_version` 게이팅. Phase 2 IR 은 별도 `phase2_projections:` 섹션에 additive 추가.

#### 섹션 5 에 적용할 변경 필드

| 현재 | 변경 후 | 근거 |
|---|---|---|
| (없음) | **`lockfile_version: 1`** 최상위 필드 | pnpm v9 / Cargo v1/3/4 선례 |
| `capability_matrix` (Phase 1 필수) | 유지 + **스키마 meta: "Phase 1 진단 데이터, reproducibility 계약 아님"** 명시 | Homebrew Brewfile.lock.json 이름-역할 경고 |
| (없음) | **`phase2_projections:`** 선택 섹션 (Phase 1 에선 생략, Phase 1.5 에서 asset-level node 추가 공간) | Cargo additive 섹션 전략 |
| `integrity-mismatch` event (섹션 6) | 범위 명시: **`capability_matrix` 변화는 mismatch 아님**. `bytes_sha256` / `source` digest 만 contract | OpenTofu silent rewrite 경고 |

#### 대안 평가

| 옵션 | 추천도 | 기각 사유 |
|---|---|---|
| **A 강결합** (`capability_matrix` = Phase 2 IR 축소 버전) | ❌ | PEP 751 4년 논쟁 후 통합 실패. 3 provider plugin 본질 차이 (Claude=파일 번들, Codex=번들+apps, OpenCode=실행 코드) 를 하나의 IR 에 강제 바인딩 불가능 |
| **B 약결합** (Phase 1 = provenance 전용, Phase 2 = 별도 파일) | ⚠️ 차선 | 섹션 5 의 `capability_matrix` Phase 1 필수 결정 소급 변경 비용. doctor/sync 입력으로 이미 필요함 |
| **C 중간 결합 (Cargo 모델)** | ✅ 확정 | Cargo workspace 선례의 "단일 lock + version 필드 + 섹션 분리" 가 가장 우아한 진화 경로 |

#### 선례 근거 (웹서치)

| 시그널 | 출처 | 지지 옵션 |
|---|---|---|
| PEP 751 4년 논쟁 후 통합 실패 (resolver semantic 차이) | Python 생태계 | A 강결합 반대 (매우 강함) |
| Homebrew Brewfile.lock.json = 이름-역할 괴리로 혼란 | Homebrew | A 강결합 반대 |
| OpenTofu: 포맷 호환 ≠ 의미 호환, silent rewrite 지옥 | OpenTofu | A 강결합 반대 |
| Cargo: 단일 lock + `version` 필드 + 섹션 분리로 workspace 우아하게 수용 | Cargo | **C 중간 지지 (모범)** |
| npm v1→v2→v3: dual-write 전환 성공 | npm | C 중간 지지 |
| mise: opt-in 로 나중에 additive 추가 성공 | mise | B 약결합 지지 (참고) |
| Codex 부분 판단 (task-mo7by7i7 L33): "섹션 7 은 Phase 2 IR 을 asset-level 로 내려야 한다는 방향이 강함" | Codex | B~C 방향 |

#### Minority Report (Q1 관련 미결)

| 항목 | 해결 시점 |
|---|---|
| `capability_matrix` 이름이 "진단" 의도를 충분히 전달하는가 (Homebrew 경고) | 섹션 7 본문 작성 시 |
| `phase2_projections` 위치 (nodes 내부 필드 vs 최상위 섹션) | Phase 1.5 착수 시 |
| `lockfile_version` bump 정책 (어떤 변경이 major 인가) | POC 중 확정 |

---

---

### Q2 원칙 확정 — Option V 확장형 (도구별 분리 + `--json` 예외 + `why --compat` drill-down) [2026-04-21]

#### 결정

**Phase 1 일상 CLI 는 `capability_matrix` 침묵. `doctor` 가 심각 mismatch 발생 시 자동 경고. `--json` 출력은 항상 포함. `why --compat` / `doctor --compat` 에서 drill-down.**

#### 5 원칙

- **V1 일상 침묵**: `concord list` / `sync` / `install` 은 capability_matrix 언급 0%. Bundler `bundle install` / Cargo `cargo build` / Homebrew `brew install` 와 동형
- **V2 doctor 심각 경고 (자동)**: `concord doctor` 는 "조치 가능한 mismatch" 발생 시에만 발화. Homebrew `brew doctor` 규범 ("silent unless warning")
- **V3 `--compat` opt-in drill-down**: `concord doctor --compat` / `concord why <id> --compat` 에서 상세 매트릭스. Cargo `cargo tree --target all` / Nix `nix flake show --all-systems` 선례
- **V4 `--json` 은 기계 계약**: TTY 침묵 ≠ JSON 침묵. `concord list --json` / `doctor --json` 출력엔 **compat 항상 포함**. Terraform `terraform show -json` 선례. CI 가 lock 파싱해야 하는 비용 회피
- **V5 전역 flag 거부**: 전역 `--show-compat` 은 V1 침묵 전제와 모순 + `list` 역할 팽창 방어선 무력화. 채택 안 함

#### 심각 mismatch 3종 (Q4 선행 후 상세 확정 예정)

Q4 의 `0*` / `-` / `?` semantics 가 아래 (b) 의 "Lossy 기호 실재" 를 실질적으로 정의하므로 **Q4 확정 후 본 항목 보완**:

- **(a) 환경 불일치**: `capability_matrix.X.* > 0` 인데 현재 env 에 provider X 미설치/미활성 (예: codex-only plugin + codex 미탐지)
- **(b) Lossy 기호 실재** ⚠️ Q4 의존: `0*` 존재 + 해당 provider 활성 (사용자가 실제로 영향 받음)
- **(c) Flag gated unmet**: Codex `features.codex_hooks=false` + hooks>0 (결정 B §3 기존 진단 재라벨)

#### 기각 대안

| 옵션 | 기각 사유 |
|---|---|
| X 항상 노출 | 조사한 8개 도구 (Terraform / pnpm / npm / Cargo / Homebrew / Nix / pip / mise / Bundler) 중 단 하나도 일상 명령에 cross-platform 데이터 상시 노출 안 함 |
| Y 전역 `--show-compat` flag 만 | V1 침묵 전제와 모순, `list` 역할 팽창 방어 불가 |
| **Z 완전 침묵** | lock 비대칭 불신 비용 (S1 PR 리뷰어 의심 / S2 Codex-only plugin 침묵 실패 / S3 Phase 2 갑툭튀). **I3 Lossy 명시 (Nietzsche 정직성) 불변식 위반** — lock 의 `0*`/`-` 기호가 정직성 증표인데 존재 자체 은폐 |
| W 중립 라벨 상시 | 노이즈 폭탄 (50 plugin × 3 provider × 4 asset = 600 셀) |
| 순수 V (전역 flag + 하위 수식 없이) | "doctor 에 무엇을" 미정의 → 자의적 운용. Q4 선행으로 보완 |

#### 선례 분포 (8 도구 웹서치)

| 옵션 | 지지 도구 수 | 대표 선례 |
|---|---|---|
| **V 도구별 분리** | **8/8** | Terraform `providers lock` / npm `doctor` / Cargo `tree,metadata` / Homebrew `doctor` / Nix `flake show` / pip `list --format=json` / mise `doctor` / Bundler `lock --add-platform` |
| Z 일상 침묵 | 7/8 | Homebrew `brew doctor` = silent unless warning (가장 유사) |
| Y opt-in flag | 6/8 | Nix `--all-systems` / Terraform `-platform=` / Cargo `--target all` / Bundler `--add-platform` |
| W JSON 라벨 | 2/8 | Cargo `metadata` (JSON-only) / pip `--format=json` |

**가장 구조적으로 유사한 선례**: Bundler `Gemfile.lock` 의 `PLATFORMS` 섹션 — lockfile 에는 있지만 `bundle install` 출력엔 없음. `capability_matrix` 와 동형 구조.

#### Minority Report (Q2 관련)

| 항목 | 해결 시점 |
|---|---|
| **심각 mismatch (b) "Lossy 기호 실재" 상세** | **Q4 확정 후** (순서 재배열 사유) |
| doctor 의 경고 톤 (경고 vs 정보성) | Q4 semantics 따라 결정 |
| `--json` schema 에 `capability_matrix` 필드 이름 고정 | POC 중 확정 |
| `capability_matrix` 개명 검토 (`diagnostic_capability_matrix` / `compat_snapshot` — Homebrew 이름-역할 경고) | 섹션 7 최종 통합 시 |
| `list --json` vs `list` TTY 의 필드 대칭성 보장 (누락 필드 명시 테스트) | Phase 1 POC |

---

---

### Q4 확정 — γ Hybrid + discriminated union [2026-04-21]

#### 결정

**Lock 파일 내부 = β 구조적 (discriminated union on `status`)**, **CLI/doctor 출력 = α 기호 렌더링**. 양쪽 레이어 분리로 "schema 명확" (내부) + "기호 학습 불필요" (외부) 두 요구를 동시 충족.

#### 내부 schema (β)

4 status discriminated union:

| status | 추가 필드 | 의미 | CLI 렌더 |
|---|---|---|---|
| **`supported`** | `count: int` (>=0) | provider 가 자산 타입 실행 가능 | `N` (count=N) |
| **`detected-not-executed`** | `count: 0`, `detected: int` (>0), `reason: enum` | plugin 에 존재, provider 미실행 | `N*` (N=detected) |
| **`na`** | (없음) | provider 가 자산 타입 자체 모름 | `-` |
| **`failed`** | `reason: enum` | introspection 실패 | `?` |

**불법 상태 금지** (discriminator 로 강제):
- `status: supported` + `count < 0` → validation fail
- `status: detected-not-executed` + `count > 0` 또는 `detected == 0` → validation fail
- `status: na` 에 `count`/`detected`/`reason` → validation fail (추가 필드 금지)

#### `reason` enum 고정 (자유 문자열 금지)

K8s conditions 실패 선례 (54 API 중 18%만 활용, reason 비워둔 채 방치 [#50798](https://github.com/kubernetes/kubernetes/issues/50798)) 회피.

| 맥락 | reason enum 초기 집합 |
|---|---|
| `detected-not-executed` | `FeatureFlagDisabled` / `ProviderUnsupported` / `WindowsUnsupported` / `NativeEventGap` |
| `failed` | `PluginJsonMissing` / `PackageJsonMissing` / `ParseFailed` / `NetworkError` |

확장은 **additive only** (enum 에 케이스 추가는 minor version, 제거는 major).

#### 외부 렌더링 (α)

`concord doctor` / `doctor --compat` / `why --compat` 출력 예시:

```
plugin github-mcp:
  claude-code: skills=2 mcp=1 hooks=3 agents=1
  codex:       skills=2 mcp=1 hooks=0* agents=0
  opencode:    skills=2 mcp=1 hooks=-  agents=1

  Warnings:
    codex.hooks = 0* (detected-not-executed, reason: FeatureFlagDisabled)
      → 1 hook detected in plugin but codex has features.codex_hooks=false
```

**핵심 원칙**: `N*` / `-` / `?` 같은 기호는 **절대 단독 출력 금지**. 반드시 `status` 라벨 + `reason` 자연어 메시지 동반 (사용자 선호 "정확한 기호의 이유").

#### 렌더러 계약 (pure function)

```typescript
// 20 줄 수준 pure function
function renderCell(cell: CapabilityCell): string {
  switch (cell.status) {
    case "supported":              return String(cell.count);
    case "detected-not-executed":  return `${cell.detected}*`;
    case "na":                     return "-";
    case "failed":                 return "?";
  }
}

function renderCellWithReason(cell: CapabilityCell): string {
  // doctor 경고용: 기호 + reason 자연어
  // ex: "0* (detected-not-executed, reason: FeatureFlagDisabled)"
}
```

#### 기각 대안

| 옵션 | 기각 사유 |
|---|---|
| **α 순수 문자열 literal** (`0*` / `-` / `?`) | Q2' 의 심각 판정이 문자열 파싱 의존 → 취약. 미래 확장 (gated, partial) 시 기호 폭발 |
| **β 순수 구조적** | Lock 크기 10배 팽창 (36KB vs 3.6KB) → PR diff 노이즈. `concord doctor --compat` 에서도 600 셀 덤프 = 읽기 불가 → **결국 γ 로 수렴**. "β 순수는 존재하지 않음, β+렌더러=γ" |
| **flat boolean** (`executable: 0, detected: 1, na: false, failed: false`) | npm `package-lock.json` 의 `dev`/`optional`/`devOptional`/`peer` 지옥 재현. 2⁴=16 조합 중 5개만 유효 → illegal states representable |
| **enum + count 2-field** (`status: "ok", count: 0`) | `detected` / `reason` 을 싣지 못함. Q2' 심각 판정 불충분 |

#### 선례 근거 (웹서치)

- **Kubernetes `.status.conditions`** — `{type, status, reason, message}` discriminated union. 가장 직접 모델
- **OpenAPI discriminator** — `oneOf` + `propertyName` 으로 표현 가능 (tooling 불일치는 단일 validator 로 회피)
- **반면교사 npm flat boolean** — 절대 피할 패턴
- **Bundler PLATFORMS** — 문자열 배열의 단순성, 하지만 concord 의 상태 표현력 요구 초과

#### 가드레일 (4개)

1. **`reason` enum 고정** — 자유 문자열 금지 (K8s #50798 교훈)
2. **JSON Schema = source of truth**, zod 는 얇은 파서 (zod `discriminatedUnion` deprecate 예정 대비)
3. **단일 validator 구현** — concord 제공, 외부 tooling 파편화 금지 (OpenAPI 교훈)
4. **Illegal states unrepresentable** — discriminator 로 강제, optional flag 조합 금지

#### Minority Report (Q4 관련)

| 항목 | 해결 시점 |
|---|---|
| `reason` enum 초기 집합 완결성 (미래 provider 기능 변화) | Phase 1 POC 중 확장 |
| `partial` status (일부만 실행 가능 — Claude 26 events 중 Codex 5 호환) 추가 여부 | Phase 1 POC 에서 실제 케이스 관찰 후 결정 |
| CLI 렌더링 컬러/포맷 (accessibility) | 구현 단계 |
| `capability_matrix` 필드명 개명 (`capability_matrix` → `compat_snapshot`?) | 섹션 7 최종 통합 |

---

### Q2' 상세 확정 — 심각 mismatch 3종 (Q4 기반) [2026-04-21]

Q2 원칙 (V 확장형) 의 doctor 자동 경고 조건을 Q4 schema 로 정식화.

#### 심각 mismatch 3종 조건표

| 심각 | Q4 status 조건 | 추가 조건 | doctor 경고 메시지 템플릿 |
|---|---|---|---|
| **(a) 환경 불일치** | `status === "supported"` + `count > 0` | 해당 provider runtime 미설치/미탐지 | `"plugin {id}: provider {p} needed (N capabilities) but {p} not detected in env"` |
| **(b) Lossy 기호 실재** | `status === "detected-not-executed"` | 해당 provider runtime **활성** | `"plugin {id}: {p}.{asset} = N* — detected but not executed (reason: {R})"` |
| **(c) Flag gated unmet** | `status === "detected-not-executed"` + `reason === "FeatureFlagDisabled"` | (b) 의 subcategory, 자동 remediation hint 제공 | `"plugin {id}: {p}.{asset} blocked by feature flag — enable with {flag_hint}"` |

**관계**: (c) 는 (b) 의 **부분집합** (특정 reason). 구현상 단일 로직 + reason 별 메시지 분기.

#### 경고 vs 정보성 톤

| 조건 | 톤 | 근거 |
|---|---|---|
| (a) | **경고** (warning) | 사용자가 설치 누락 조치 가능 |
| (b) 일반 | **정보성** (info) | reason 에 따라 판단 |
| (b) with `reason: FeatureFlagDisabled` = (c) | **경고** + remediation hint | 사용자가 flag 활성 조치 가능 |
| `status: failed` | **오류** (error) | introspection 실패 — 데이터 신뢰 불가 |
| `status: na` | 침묵 | 정상 상태 |

#### `--json` 출력 (V4 기계 계약)

```json
{
  "doctor": {
    "warnings": [
      {
        "plugin": "github-mcp",
        "provider": "codex",
        "asset": "hooks",
        "severity": "warning",
        "cell": { "status": "detected-not-executed", "count": 0, "detected": 1, "reason": "FeatureFlagDisabled" },
        "message": "...",
        "remediation": "set features.codex_hooks = true in ~/.codex/config.toml"
      }
    ]
  }
}
```

TTY 침묵 ≠ JSON 침묵 (Q2 V4 원칙). `list --json` / `doctor --json` 은 **항상** 전체 `capability_matrix` 포함.

---

---

### Q3 확정 — (a) intact only + invariant 선언 + Q2'/Q4 귀결 + parse error 방어선 [2026-04-21]

#### 결정

**Phase 1 은 plugin intact sync 만. 해체 의도 (include/exclude/allow_disassemble) 는 0% 도입. `capability_matrix` (Q4) 와 doctor 심각 경고 (Q2') 가 "관측·진단" 계층을 이미 완결. Q3 는 기능 추가가 아닌 "조작 금지" 원칙 1줄 + parse error 방어선 1개만 추가.**

#### 4 원칙

- **D1 (a) 기본** — Phase 1 manifest 에 plugin 내부 자산 subset 활성/비활성 문법 존재하지 않음
- **D2 Invariant 선언** — **"concord 는 plugin 내부를 관측 (Q4 `capability_matrix`) 하되 조작하지 않는다"**. 설계 문서 top-level 원칙. 섹션 5 불변식 목록에 `I6 Plugin intact` 로 등재
- **D3 Q2'/Q4 자연 귀결** — "lint 경고" 와 "doctor 리포트" 는 Q2' `failed` status + `reason` enum 과 Q2 V3 `doctor --compat` + Q4 `capability_matrix` 에 **이미 흡수**. Q3 에서 신규 기능으로 선언하지 않음 (개념 인플레이션 회피 — `feedback_bundle_inflation.md` 계보)
- **D4 Parse error 방어선** — Phase 1 manifest 에 다음 문법 등장 시 **명시적 parse error + 에러 메시지**:
  - `include:` / `exclude:` (자산 subset 선택)
  - `allow_disassemble:` / `disassembled_sources:` 등 저자 계약 필드
  - 에러 메시지: `"<field> is reserved for Phase 2+. Not supported in current lockfile_version: 1"`
  - 이름만 문서에 reserved, v1 에선 거부 (Codex 제안 (g))

#### 사용자 시나리오 → Phase 1 해결 경로

| 시나리오 | Phase 1 해결 | 해체 기능 필요 여부 |
|---|---|---|
| **S1** 팀 lock, 도구별 plugin 비활성 | 섹션 3 `enabled: false` + 결정 B scope 섹션 분리 | ❌ 불필요 |
| **S2** 저자 cross-tool 권한 미리 선언 | Phase 1 은 plugin manifest 의 **미지 필드 passthrough** (lock 에 원본 보존) | ❌ Phase 2 RFC 로 이관 |
| **S3** 사용자가 hook 만 제외, MCP/skills 유지 | **provider-native 기능 (Claude hook disable 설정) 에 위임**. concord 는 거부 응답 — **거부 자체가 Phase 1 정체성** | ❌ concord 개입 금지 (resolver 중복 구현 금지) |

→ 3 시나리오 모두 (c)(d) 기능 없이 해결 또는 Phase 2 로 이관.

#### 기각 대안

| 옵션 | 기각 사유 |
|---|---|
| **(c) 저자 계약 필드** | 3 생태계 모두 공식 미지원 (Claude `plugin.json` 필드 없음, Codex/OpenCode marketplace 미지원, OpenClaw `allow`/`enabled` 도 plugin 단위). **새 계약 창조 = portability 약속 위반 위험**. 저자 의도 기록 → 런타임 강제로 미끄러짐 (기능 부채 슬라이드). Phase 2 IR 자유도 선제 제약 |
| **(d) include/exclude** | Homebrew `--with-X/--without-Y` = 2019 년 **공식 deprecate 된 anti-pattern** (재현성 파괴, bottle 매칭 실패, 조합 폭발 테스트 불가). Phase 2 IR backward-compat 제약. resolver 중복 구현 금지 위반. 실제 use case (S1/S3) 는 plugin 전체 toggle 또는 provider-native 위임으로 해결 |
| **(e) Provider-native 순수 위임** | portable disassemble 계약 부재 — concord 가 결국 책임 져야. 실질 대안 아님 |
| **preview (a)+(b)+(f) 를 3 기능** | (b)(f) 가 Q2'/Q4 재라벨 — **개념 인플레이션** (bundle inflation 전례 재현 위험). D3 로 재흡수 |

#### 선례 근거

| 선례 | 출처 | 교훈 |
|---|---|---|
| **Homebrew `--with-X/--without-Y` deprecate** (2019) | `docs.brew.sh/Deprecating-Disabling-and-Removing`, `docs.brew.sh/FAQ` | (d) 는 증명된 anti-pattern |
| Chrome `optional_permissions` | `developer.chrome.com/docs/extensions/reference/api/permissions` | 저자가 해체 단위 **명시 선언**이 옳음 (boolean 아님) — Phase 2 에서 참고 |
| npm `exports` 필드 | `nodejs.org/api/packages.html` | 저자가 공개 subpath 화이트리스트 — Phase 2 참고 |
| OCI/ORAS best practice | `oras.land/docs/`, `github.com/oras-project/oras/discussions/444` | "bundle subset pull 보다 **애초에 분리**" 권장 |
| Claude `plugin.json` 필드 부재 | `code.claude.com/docs/en/plugins` | 저자 계약 필드 공식 미지원 사실 |
| Codex `enabled: false` plugin 단위 | `developers.openai.com/codex/plugins` | 자산 subset 활성화 공식 미지원 사실 |
| OpenClaw `allow`/`enabled` plugin 단위 | `docs.openclaw.ai/plugins` | 2단계 게이트가 내부 자산 단위 아님 |

#### Q1~Q4 와의 통합 원칙

| 질문 | 역할 |
|---|---|
| Q1 Phase 1 lock ↔ Phase 2 IR (Cargo 중간 결합) | **파일 레이어** 경계 |
| Q2 cross-tool ceiling 노출 (V 확장형) | **UI/출력 레이어** 경계 |
| Q4 `capability_matrix` (γ Hybrid discriminated union) | plugin 내부 **관측** |
| Q2' doctor 심각 mismatch 3종 | 관측의 **경고/진단** |
| **Q3 invariant "조작 금지"** | **action 레이어 경계** — Q4/Q2' 위에 얹는 top-level 원칙 |

Q3 는 필드/문법이 아닌 **invariant** 이므로 새 스키마 증설 0, 설계 문서 1줄 + parser 방어선 1개.

#### Minority Report (Q3 관련)

| 항목 | 해결 시점 |
|---|---|
| Phase 2 에서 (c) 를 Chrome `optional_permissions` 스타일로 도입할지 여부 | Phase 2 RFC |
| (d) include/exclude 필요 use case 의 실제 빈도 측정 | Phase 1 POC/telemetry |
| Provider-native hook disable 설정의 provider 별 스펙 차이 (Claude/Codex/OpenCode) | 결정 D Windows fallback 과 연계 조사 |
| Parse error 의 에러 메시지 정확한 문구 | 구현 단계 |

---

---

### Q5 확정 — Option P+ (npm + Dart constraint hybrid) [2026-04-21]

#### 결정

**Phase 1 → Phase 2 manifest 문법 = npm-style additive (schema 거의 불변) + Dart-style `concord_version` constraint 필드. `manifest_version` 도입 금지.** Phase 2 의 변화가 대부분 additive (`cross_sync:`, `capability_matrix:` 등) 이므로 Cargo edition 같은 무거운 장치 불필요.

#### 5 원칙

- **P1 Schema 거의 불변** — 기존 필드 rename/재해석 **금지**. 독립 리뷰 지적: "같은 필드 의미가 v1/v2 에서 달라지면 struct 분기 불가피 = H 의 실제 비용 원천"
- **P2 신규 기능 = 신규 필드/섹션 additive** — `cross_sync:`, `phase2_projections:` (lock), `capability_matrix:` 같은 신규 섹션·필드로 확장. 기존 필드 semantics 유지
- **P3 `concord_version: ">=X"` constraint 필드** — npm `engines` / Dart `environment.sdk` 스타일. Phase 2 기능 쓰려면 concord 최소 버전 선언 (feature gate 효과, version 필드 없이)
- **P4 Q3 I6 parse error 영구 유지** — `include:` / `exclude:` / `allow_disassemble:` 는 영원히 parse error (v1/v2 반전 없음, mental model 세금 회피). 에러 메시지 업그레이드 경로 제공만:
  ```
  "include is reserved for future Phase 2+ semantics. Not supported in current concord schema."
  ```
- **P5 진짜 breaking 필요 시 B 로 1회성 전환** — Terraform 0.11→0.12 선례. 예방약으로 H 쓰지 말라 (YAGNI). Phase 2 의 additive 해결이 불가능해지는 시점에만 B 채택

#### 예시 manifest

```yaml
# Phase 1 (현재) — concord_version 생략 시 minimum 가정
plugins:
  - id: github-mcp
    source: { type: claude-plugin, ... }
    enabled: true

# Phase 1 with explicit constraint (권장)
concord_version: ">=0.5"
plugins:
  - id: github-mcp
    source: { type: claude-plugin, ... }
    enabled: true

# Phase 2 (additive 확장) — 문법은 그대로, 신규 섹션만 추가
concord_version: ">=0.8"         # ◀ Phase 2 기능 쓰려면 상향 constraint
plugins:
  - id: github-mcp
    source: { type: claude-plugin, ... }
    enabled: true
cross_sync:                       # ◀ 신규 top-level 섹션
  - from: github-mcp
    to: codex
    strategy: adapter
```

#### `concord_version` 불일치 동작

| 상황 | 동작 |
|---|---|
| 파일 `concord_version: ">=0.8"`, 실제 concord 0.5 | **fail-closed**: parse error + "Requires concord >= 0.8, current 0.5. Upgrade concord." |
| 파일 `concord_version: ">=0.5"`, 실제 concord 0.8 + 파일에 `cross_sync:` | 정상 (Phase 2 기능 사용) |
| 파일 `concord_version: ">=0.5"`, 실제 concord 0.8 + 파일에 `include:` | parse error (Q3 I6 — constraint 와 무관하게 영구 금지) |
| 파일 `concord_version:` 생략, 실제 concord 0.8 + 파일에 `cross_sync:` | **warning**: "recommend `concord_version: '>=0.8'` in manifest" + 정상 동작 |
| `concord_version:` 형식 오류 (semver 아님) | parse error |

#### 기각 대안

| 옵션 | 기각 사유 |
|---|---|
| **H** (Cargo edition `manifest_version: 1/2`) | 10 선례 중 **Cargo 1건만**. Cargo edition 은 언어 syntax 변화 특수 (async keyword 등) 때문. concord Phase 2 는 전부 additive → overkill. 숨은 비용 5 (dual parser semantic / version 생략 함정 / migration 도구 무의미 / backport 압력 / 문서 2배). Q3 I6 균열 (v1 error/v2 ok 반전) |
| H+ (Codex 타협안: edition + reserved namespace + no field-inference) | H 의 근본 문제 (backport 압력, 문서 2배) 유지. npm/Dart 선례가 더 검증됨 |
| **B** (pure Breaking) | Phase 2 가 additive 라 불필요. 미래 진짜 breaking 필요 시점에만 1회성 전환 (Terraform 0.12 선례) |
| **D** (Dual-mode 공존) | Gradle Groovy↔Kotlin DSL 유지비 매우 큼. 1인~소팀 치명 |
| **S** (Slot-based `x-` 접두사) | Python pyproject 선례 있으나 concord 의 신규 기능 (`cross_sync`) 이 1급 시민으로 충분 — slot 은 **써드파티 확장용**이 더 자연스러움 |
| preview H 유지 | "Q1 대칭" 은 수사 — lock (tool generated) vs manifest (human authored) 동력학 다름. "Q3 자연 결합" 은 오히려 I6 균열. 근거 무효화 |

#### 선례 분포 (10 조사)

| 정책 | 선례 | 건수 | 교훈 |
|---|---|---|---|
| **P** (Additive) | npm `package.json`, Ruby Gemfile | **2** | 20년 불변 schema + 신규 필드만 |
| **P+constraint** (SDK 하한) | Dart `environment.sdk` | **1** | version 필드 없이 feature gate |
| S (Slot-based) | Python pyproject PEP 누적 | 1 | incremental adoption, namespace 충돌 없음 |
| D (Dual-mode) | rustup, mise, Gradle | 3 | 유지비 큼 |
| **H** (Edition) | **Cargo 만** | **1** | 언어 syntax 특수 제약 |
| B (Breaking) | Terraform 0.11→0.12 | 1 | 1회성, 이후 안정화 |
| P* (Additive + semantic drift) | Deno 1→2 | 1 | 기본값 변경도 breaking |

**가장 근접 모델**: **mise** (후발 도구가 선행 포맷 흡수 + 자체 확장 병행) — concord 의 동력학과 일치.

#### 추가 가드레일

1. **`concord_version:` 생략 시 기본값 정책** — Phase 1 기간은 "v1 가정 허용", Phase 2 도입 후에는 **doctor 가 경고** ("recommend explicit constraint")
2. **Migration 도구 불필요** — additive 라 마이그레이션 없음. `concord doctor --suggest-upgrade` 로 constraint 상향 권장만
3. **Q2 V4 `--json` 기계 계약 보호** — JSON schema 는 항상 supersets (additive), breaking 없이 확장만

#### Minority Report (Q5 관련)

| 항목 | 해결 시점 |
|---|---|
| Phase 2 에서 실제 breaking 이 불가피한 케이스 탐지 시점 | Phase 2 RFC 작성 시 재평가 |
| `concord_version` constraint 의 semver range 문법 (`^` / `~` / `>=` 등 지원 범위) | POC 중 확정 (semver crate/npm 라이브러리 채택) |
| Phase 2 `cross_sync:` 섹션의 구체 schema | Phase 2 RFC |
| 진짜 breaking 필요 시 B 전환 기준 (RFC 프로세스) | Phase 2 진입 시점 |

---

### 섹션 7 최종 통합 원칙 작성 (다음 단계)

Q1~Q5 모두 확정 완료. 이제 Phase 1 ↔ Phase 2 경계 통합 원칙 (top-level invariants) 작성.

---

## 섹션 8 — 판단-1~4 재해석 + v2 문서 목차 (진행 예정)

원래 `02-v2-preparation.md` 의 4개 판단은 β3 재구조로 **대부분 무의미화**:

| 원래 판단 | 재해석 |
|---|---|
| 판단-1 네이밍 (R1/R2/R3) | → β3 재구조로 대체. "R3" 의 목적 (행위 주체 정직성) 은 `auto_install`/`enabled`/`purge_on_remove` 3 플래그로 달성 |
| 판단-2 γ Disassemble | → 섹션 7 Phase 2 asset-level IR 에 흡수. γ 는 "저자 계약 위반 경고 카테고리" 로만 Phase 1 존재 |
| 판단-3 Enterprise 시점 | → Phase 1.5 (MEMORY.md enterprise never-default 원칙과 정합) |
| 판단-4 상태 수 (S1/S2) | → 섹션 6 모델 B 로 대체 (3 state + 2 event + 1 opt-in) |

---

## Codex cross-compile 리뷰 통찰 (`task-mo77ph1w-t56nsq` completed)

자산별 cross-compile 호환 매트릭스 (공식 문서 근거):

| 구성요소 | Claude→Codex | Claude→OpenCode |
|---|---:|---:|
| skills | 85% | 95% |
| mcp_servers | 95% | 90% |
| LSP | N/A | 80% |
| commands | 25% | 70% |
| subagents | 50% | 65% |
| hooks | 10% | 30% |

**"90% 호환" 평가**: aspirational — skills+MCP 중심 plugin 만 가능, 임의 plugin 은 불가.

**Phase 2 권고 전략**:
- **Adapter**: skills, MCP, LSP (OpenCode 만)
- **Translate**: subagents, commands (lossy warning 필수)
- **Compile**: hooks 만 opt-in 실험 기능 (experimental-compile)

---

## Minority Report (해소되지 않은 의심)

| 항목 | 상태 | 해결 시점 |
|---|---|---|
| jsonc-morph round-trip + `extraneous` preserve 검증 | POC 필요 | Phase 1 첫 sprint |
| Phase 2 asset-level IR 설계 (plugin 해체 후 inner_assets nested node) | 섹션 7 에서 결정 | Phase 1.5 착수 시 |
| OpenCode `auto_install` vs `enabled` 의미 분리 (배열 존재 = enabled) | Codex 리뷰 미확정 | Phase 1 POC |
| Codex `marketplace add` CLI 공식 계약 여부 | 부분 확인 (changelog + 서드파티) | POC-7 (공식 docs 업데이트 대기) |
| Plugin introspection 엔진 (3 provider plugin.json 파싱) 정확성 | Phase 1 핵심 리스크 | Phase 1 첫 sprint POC |

---

## 참조

- 기각된 v1: [`01-bundle-plugin.md`](./01-bundle-plugin.md) — "α Wrap / β Adopt / γ Disassemble" 3패턴 기반, Codex CLI 가정 붕괴 + C-2 coexistence 모델 오류 + C-4 URI 평탄화로 기각
- 기각된 v2 준비: [`02-v2-preparation.md`](./02-v2-preparation.md) — "Bundle ↔ Plugin 경계" 판단-1~4 프레임, 계보학적 재조사로 "bundle" 이 인플레이션 개념으로 판명
- 관련 feedback 메모리: `~/.claude/projects/-Users-macbook-workspace-concord/memory/feedback_bundle_inflation.md`
- 결정 B FINAL: [`../STEP-B/07-cli-and-bootstrap.md`](../STEP-B/07-cli-and-bootstrap.md)
- 결정 A FINAL: [`../01-skills.md`](../01-skills.md)
- 자산 비교 (historical): [`../06-plugins.md`](../06-plugins.md), [`../07-overlap-matrix.md`](../07-overlap-matrix.md)

---

## Sources (공식 문서 및 웹서치)

- https://code.claude.com/docs/en/plugin-marketplaces — Claude 5 source types, `strict: false`, `--sparse`
- https://code.claude.com/docs/en/plugin-dependencies — Claude `dependencies` transitive chain (v2.1.110+)
- https://code.claude.com/docs/en/security — "Anthropic cannot verify plugin contents"
- https://developers.openai.com/codex/plugins — Codex plugin 공식 (CLI subcommand/flags 미명시)
- https://developers.openai.com/codex/changelog — `codex marketplace add` v0.121 (서드파티 요약과 교차 확인)
- https://modelcontextprotocol.io/specification/2025-11-25 — MCP 공식 스펙
- https://opencode.ai/docs/plugins/ — OpenCode plugin = npm package only
- https://agentskills.io/specification — agentskills.io 표준 (SKILL.md frontmatter)
- https://docs.brew.sh/Brew-Bundle-and-Brewfile — Homebrew Bundle (공유 관할 모델 선례)
- https://docs.openclaw.ai/plugins/bundles — OpenClaw 의 Claude plugin 호환 X/O 매트릭스 (2단계 게이트)
- https://hermes-agent.nousresearch.com/docs/ — Hermes agent (agentskills.io 표준 채택)
- https://advisories.gitlab.com/pkg/npm/opencode-ai/CVE-2026-22812/ — OpenCode 보안 CVE
- https://cvedetails.com/cve/CVE-2026-24910/ — Bun non-npm source spoofing (OpenCode npm-only 정책 근거)
