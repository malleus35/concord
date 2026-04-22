# Concord — Session Memory

**Last updated**: 2026-04-22
**Phase**: **Plan 4 CLI Integration 실행 완료 — 27/27 task, 600 tests. Phase 1 CLI v1 기능 완성**

## 🟢 현재 Snapshot (2026-04-22)

- **Branch**: `feat/concord-plan-4-cli-integration` (main merge 예정)
- **Primary contract**: `docs/superpowers/specs/2026-04-21-concord-design.md` (3878줄)
- **Plan 1**: `docs/superpowers/plans/2026-04-22-concord-plan-1-foundation.md` (28 task, ✅ 완료)
- **Plan 2A**: `docs/superpowers/plans/2026-04-22-concord-plan-2a-round-trip-poc.md` (18 task, ✅ 완료)
- **Plan 2B**: `docs/superpowers/plans/2026-04-22-concord-plan-2b-sync-engine.md` (30 task, ✅ 완료)
- **Plan 3**: `docs/superpowers/plans/2026-04-22-concord-plan-3-secret-diagnostics.md` (30 task, ✅ 완료)
- **Plan 4**: `docs/superpowers/plans/2026-04-22-concord-plan-4-cli-integration.md` (27 task / 3437 줄, ✅ **완료**)
- **Plan 4 summary**: `docs/superpowers/poc/2026-04-22-plan-4-summary.md`
- **Plan 3 summary**: `docs/superpowers/poc/2026-04-22-plan-3-summary.md`
- **Plan 2B summary**: `docs/superpowers/poc/2026-04-22-plan-2b-summary.md`
- **POC summary**: `docs/superpowers/poc/2026-04-22-round-trip-summary.md`
- **5-plan 분할**: Plan 1 ✅ / Plan 2A ✅ / Plan 2B ✅ / Plan 3 ✅ / **Plan 4 ✅**
- **Tests green**: **600 passed + 1 skipped (116 files) / typecheck clean / build emit**
- **Tags**: `concord-plan-1-foundation`, `concord-plan-2a-round-trip-poc`, `concord-plan-2b-sync-engine`, `concord-plan-3-secret-diagnostics`, `concord-plan-4-cli-integration`
- **JSON Schema artifacts**: `schemas/manifest.schema.json` + `schemas/lock.schema.json` (Zod 4 native)

### Plan 4 산출물 (2026-04-22)

- **CLI commands** (7 신규 + 1 subcommand): `init` / `detect` / `adopt` / `import` / `replace` / `update` / `why` + `secret debug`
- **Guided bootstrap** in `concord sync` — §6.14 TTY prompt + `--yes` / `CONCORD_NONINTERACTIVE=1` bypass
- **CLI utils** (`src/cli/util/`): `tty.ts` (isInteractive + promptYesNo) / `scope-paths.ts`
- **Audit module** (`src/audit/log.ts`): append-only JSON-lines, E-17 forbidden-key guard
- **Detect module** (`src/detect/`): types / agent-probe / cache
- **Adopt module** (`src/adopt/`): scanner (scope-aware filesystem scan) / context (D-W1 context-aware default)
- **Manifest-edit module** (`src/manifest-edit/`): insert-entry / merge-external / replace-whole
- **POC sprint**: POC-10 (preflight) / POC-11 (drift 5-state) / POC-14 (target encoding) — 모두 PASS without source changes
- **E2E test**: `init → detect → adopt → doctor` (§6.19 Solo) — `tests/integration/e2e-bootstrap-workflow.test.ts`

### Plan 4 핵심 deviation (리뷰어 피드백 반영)

| Task | Deviation | Reason | Commit |
|---|---|---|---|
| 5 | `wx` flag atomic create + `ConfigScope.safeParse` | TOCTOU window + DRY (plan은 `stat`+write + `as` cast) | `b7dc4d3` |
| 6 | 버전 regex `\b(\d+\.\d+\.\d+)\b` → `(\d+\.\d+\.\d+)` | `v0.119.0` 같은 prefix 케이스 word boundary 실패 | `637fff6` |
| 9 | `AdoptCandidate.assetType` → `"skills"\|"subagents"` (plan은 3개 포함) | Phase 1 scanner가 `instructions`를 emit하지 않음 | `d157fb5` |
| 11 | `AssetType`을 `src/schema/types.ts`에서 re-import | DRY — 3번 재선언 방지 | `549fb37` |
| 12 | manifest-exists 체크를 scan 전으로 이동 | Fail-fast UX (test 4) + insertEntry catch 좁힘 | `2847153` |
| 14 | `--policy` allowlist 검증 추가 + typed `FetchSource` | 리뷰어 I-1/I-2 — invalid policy silent drop 방지 | `83c1bcd` |
| 20 | `readLock` await 제거 (동기 함수) | TS `'await' has no effect` 경고 | `d11f410` |

### Plan 4 실동작 CLI (Phase 1 v1)

```bash
# Plan 4 신규
concord init --scope project|user|enterprise|local
concord detect [--json]
concord adopt [--scope <s>] [--yes|--write|--dry-run]
concord import <file>|--url [--sha256 <h>] --target-scope <s> --policy skip|replace|alias [--yes|--dry-run]
concord replace <file>|--url [--sha256 <h>] --target-scope <s> [--yes|--dry-run]
concord update [<id>] [--json]
concord why <id>
concord secret debug --env <NAME> [-v]   # TTY only, audit-logged

# 기존 명령
concord sync [--yes]                     # guided bootstrap on first run
concord validate <manifest>
concord lint <manifest>
concord list --lock <path>
concord doctor [--json]
concord cleanup [--yes|--dry-run]
```

### Plan 4 Follow-up tracked (Phase 2 or polish)

- **`runCommand` timeout 없음** — `claude --version` 지연 시 `detect` 무한 블록 가능. Plan 3 `codex-version.ts` 도 동일 노출
- **`src/io/lock-write.ts`** 의 callback+`new Promise` wrap → new Plan 4 코드의 promise-style default import 로 정렬 필요
- **`insertEntry` null-valued key 엣지** — `skills: # todo` 형태에서 trailing comment 유실 (문서화됨)
- **`adopt` multi-scope partial failure** — scope B 실패 시 scope A roll-back 없음 (JSDoc 기록)

### Plan 3 산출물 (2026-04-22)

- **Secret interpolation engine** (`src/secret/`): types / parser / env-resolver / file-resolver / render / provider-policy / encode / resolve-entry — E-1~E-19 전면 구현
- **Plugin introspection** (`src/plugin/`): claude / codex / opencode / registry / capability — POC-5
- **Preflight** (`src/sync/preflight/`): git-bash / codex-version (≥0.119) / platform-warnings
- **Uninstall helper** (`src/install/uninstall.ts`): symlink-safe `fs.rm` wrapper
- **`concord doctor`**: D-15 preflight aggregate + `--json` machine contract
- **`concord cleanup`**: opt-in extraneous prune (`--yes` / `--dry-run` / default exit 1)
- **Runner**: secret resolve 훅 + prune 실삭제 통합 (Plan 2B stub → 완전)
- **Drift 5th state**: `env` 추가 (source drift precedence)

### Plan 3 핵심 deviation

| Task | Deviation | Commit |
|---|---|---|
| 2 | `currentEnvDigest` / `lockEnvDigest` 를 optional 로 선언 (plan 은 required) — 기존 integration sync-drift.test.ts backward compat 유지 | `aa86eda` |
| 11 | Plan 1 `interpolation-allowlist.ts` 에 `source.path` 누락 → 별도 prerequisite commit 으로 확장 | `13a6ce6` |
| 14 | Plan 3 `CapabilityMatrix` vs Plan 1 Zod schema 별개 유지 (향후 Plan 4 harmonize) | `5abb048` |

### Plan 3 E-7 allowlist (확장 후)

`source.{url,repo,ref,version,path}` / `env.[A-Z_][A-Z0-9_]*` / `authHeader` / `headers.[\w-]+`

### Plan 2B 산출물 (2026-04-22)

- **`concord sync` CLI 실동작**: manifest → plan → fetch → install → lock write (E2E 검증)
- **6 fetchers + registry** (`src/fetch/`): file/git/http/npm/external/adopted
- **4 config writers + registry** (`src/write/`): JSONC (jsonc-morph) / TOML (@decimalturn) / json-key-owned (pure JSON) / YAML (eemeli)
- **2 installers + D-14 routing** (`src/install/`): symlink (symlink-dir + junction fallback) / copy (fs-extra)
- **1 MCP Windows transformer** (`src/transform/mcp-windows.ts`): `cmd /c npx` wrap
- **Sync primitives** (`src/sync/`): computeSyncPlan / computeDriftStatus / determineState / runSync / createRollbackLog
- **Lock atomic write + `.bak`** (`src/io/lock-write.ts`)
- **Marker block parser** (`src/round-trip/marker.ts`): spec §10.5 concord-managed markers
- **3-platform CI matrix** (`.github/workflows/ci.yml`): ubuntu / macos / windows + Node 22
- **`src/utils/exec-file.ts`** (Task 3 신설) — runCommand wrapper (security hook 대응, Git/Npm/External fetcher 공통 사용)

### Plan 2B 핵심 deviation (plan ↔ impl 동기화 완료)

| Task | Deviation | Commit |
|---|---|---|
| 3 | TS 6 narrowing → `Buffer.isBuffer(v)` 패턴 (plan 의 `typeof stdout === "string"` 분기가 never 로 추론) | `5c3d460` |
| 4 | Test annotate `Promise<FetchResult>` return type (unused import 제거) | `02b757d` |
| 21 | Explicit vitest imports + `.js` extension (consistency) | `264f32f` |
| 25 | CLI Option A — `process.exit(1)` → `setExitCode + return` (runCli testability), 실제 함수명 `loadYaml`/`findConcordHome` | `156546a` |

### Plan 2B 실행 입력 요약

**선정 library (Plan 2A 확정)**:
- TOML: `@decimalturn/toml-patch @ 1.1.1` — `patch(source, path, value)` API
- JSONC: `jsonc-morph @ 0.3.3` — CST `parse + asObjectOrThrow + getIfObjectOrCreate + append/setValue/remove + toString`
- YAML: `yaml @ 2.8.3` (eemeli) — `parseDocument + setIn/deleteIn + toString`
- Symlink: `symlink-dir @ 10.0.1` + `fs-extra@11.3.4` + `write-file-atomic@7.0.1` + `is-wsl@3.1.1`

**30 Task 구성 (Phase A~H)**:
- A (1~3): Windows CI matrix / marker block parser / `runCommand` execFile utility
- B (4~10): Fetcher 공통 + 6 adapter (file/git/http/npm/external/adopted) + registry
- C (11~15): ConfigWriter 공통 + 4 writer (JSONC/TOML/json-key-owned/YAML) + registry
- D (16~17): Installer (symlink + copy + routing D-14)
- E (18): MCP Windows `cmd /c npx` transformer + registry
- F (19~22): lock atomic write / sync plan / drift 4 상태 / state machine
- G (23~25): runSync orchestration + atomic rollback + `concord sync` CLI
- H (26~30): E2E (skill / MCP / drift) + verification + README/TODO/MEMORY + tag + merge

**핵심 신규 결정 (Plan 2A 와 비교)**:
- **`src/utils/exec-file.ts` (Task 3 신설)** — Git/Npm/External fetcher 공통 사용. security hook 권장 패턴 (`runCommand` wrapper of `execFile`)
- **3-platform CI matrix (Task 1)** — Plan 2A POC-9 에서 deferred 된 Windows 검증 자동화
- Plan 2A `src/round-trip/` 인프라 100% 재사용

**non-goals (Plan 3/4 로 이관)**:
- Secret 보간 (E-1~E-19) — Plan 3
- `concord doctor` / `concord cleanup` 완전체 — Plan 3
- `init/detect/adopt/import/replace/update/why` — Plan 4

### POC 선정 결과 (Plan 2A)
| POC | 주제 | Winner | Loser |
|---|---|---|---|
| POC-1 | TOML 편집 | `@decimalturn/toml-patch @ 1.1.1` | `@shopify/toml-patch`, `@ltd/j-toml` |
| POC-2 | JSONC 편집 | `jsonc-morph @ 0.3.3` | `jsonc-parser` |
| POC-3 | YAML write-back | `yaml @ 2.8.3` (eemeli) | Plan 1 확정, 변동 없음 |
| POC-9 | symlink-dir | `symlink-dir @ 10.0.1` | 단독 후보 (macOS ✅ / Windows DEFERRED) |

### 실동작 CLI (Plan 1, 변동 없음)
```bash
concord validate <manifest>   # 3-pass (Reserved + allowlist + Zod + A1/D-11)
concord lint <manifest>       # pre-validation only
concord list --lock <path>    # dry-run reader
```

### 완료 Task (Plan 1, 28/28)

**Foundation** (1~7): Bootstrap / Types / Discovery / Reserved Registry / Interpolation Allowlist / Reason Enums / Capability Matrix
**Source + Assets** (8~15): Source + PluginSource / AssetBase / 6 asset schemas (skill/subagent/hook/mcp/instruction/plugin)
**Manifest + Validators** (16~19): ManifestSchema+concord_version / YAML loader / validateManifest 3-pass / 4-scope merge
**Lock family** (20~23): LockNode (3중 digest) / LockSchema + symlink refine / Lock read I/O / validateLock + I1/I5/I6
**CLI** (24~26): validate / lint / list --dry-run
**Wrap-up** (27~28): POC-13 golden test / README + POC log + schemas + tag

### Zod 4 채택 (2026-04-22 재평가, Plan 1 전반에 적용 완료)
- spec 부록 B 업데이트: Zod 3 고정 → **Zod 4 채택** (기존 `package.json` 존중)
- `zod-to-json-schema` 제거 → Zod 4 native `z.toJSONSchema()` (artifacts 생성 확인)
- `.passthrough()` → `.loose()` (deprecated)
- `z.string().url()` → `z.url()` (top-level)
- `z.string().datetime()` → `z.iso.datetime()` (top-level iso namespace)
- `z.discriminatedUnion("field", [...])` 유지 → 향후 `z.switch` migration 예정
- **`.strict()` 필수** for discriminated union variants (default strip 방지, illegal state rejection)
- **`z.record(enum, V)` exhaustive** — enum 의 모든 key 가 present 해야 parse 통과 (Task 21/23/26 에서 full 3×6 capability_matrix 필요)

### 누적 Review 발견 패턴 (Plan 에 전부 반영됨)
| 이슈 | 해결 |
|---|---|
| TS 6 + @types/node 25 → TS2591 | `"types": ["node"]` 명시 |
| Vitest 4 + ESM `vi.spyOn(os.homedir)` 불가 | `vi.mock + importActual + 가변 ref` |
| Zod 4 `.url()` / `.datetime()` deprecated | `z.url()` / `z.iso.datetime()` top-level |
| Zod 4 `.passthrough()` deprecated | `.loose()` |
| Zod 4 discriminated union default strip | 각 variant `.strict()` (illegal state rejection) |
| Zod 4 `z.record(enum, V)` exhaustive | Full matrix fixture (3 provider × 6 asset) |
| Multi-pipe regex `{env:X\|int\|bool}` 누락 | `(?:\|\|\})` regex |
| `try/catch` silent pass | `toThrow(pattern)` |
| id regex `[a-z0-9-]` 에 underscore 부재 | `[a-z0-9_-]` (`mcp_servers` 지원) |
| D-11 case-collision post-validation 무효 | Pre-validation (raw)로 이동 |
| Plan 10 test regex vs impl message 순서 mismatch | Error message 재배열 (shared-agents ... claude-code) |
| Security regression 가드 부재 | 4 tests 추가 (sequential / abs / prefix / error.detail) |

### IDE Diagnostic (무해, 무시)
- `tests/` 가 tsconfig `exclude` 에 있어 TS language server 가 test 파일 import 를 resolve 못함
- 실제 `vitest` + `tsc -p ...` 는 clean
- 필요 시 별도 `tsconfig.test.json` 추가 (Plan 1 범위 밖)

---

## Project Overview

**concord**: TypeScript CLI for syncing AI agent harness components across team members.

- **Targets**: claude-code, codex, opencode
- **Phase 1**: same-tool sync only (claude↔claude, codex↔codex, opencode↔opencode)
- **Phase 2** (optional): cross-tool sync for selected asset types
- **Scope (6 asset types)**: skills, subagents, hooks, MCP servers, instructions (CLAUDE.md/AGENTS.md), plugins
- **Additional**: LSP (OpenCode only), Codex feature flags (e.g., `features.codex_hooks`)
- **Non-goals (Phase 1)**: status line, output styles, slash commands, themes, model/provider presets

## Manifest Layering (확정)

4 계층 + 각 계층은 "자기 경로에 설치"만 담당. 레이어 간 우선순위 해결은 **provider 런타임에 위임** (concord가 resolver 중복 구현 안 함).

| 파일 | 위치 | 역할 |
|---|---|---|
| `concord.user.yaml` | `~/.concord/` | 개인 전역 |
| `concord.enterprise.yaml` | `~/.concord/` | 조직 배포 (MVP는 user와 동일 시맨틱) |
| `concord.yaml` | 프로젝트 루트 | 팀 공유, git-tracked |
| `concord.local.yaml` | 프로젝트 루트 | 개인 머신 튜닝, gitignored |

같은 레이어 내 이름 충돌: **에러** (디폴트) + `alias:` / `override: true` / (opt-in) auto-namespace로 해결.

## Asset Types (β3 재구조 2026-04-20, 6 자산 타입 복원)

```
skills / subagents / hooks / mcp_servers / instructions / plugins
```

- 6 자산 모두 1급 시민 (Phase 1 초기 scope 그대로)
- plugin 은 다른 자산과 달리 **컨테이너 source** (`claude-plugin`/`codex-plugin`/`opencode-plugin`) 를 가질 수 있는 특수성만 있음
- Hooks 는 **2 자산으로 분리**: registration (설정 병합) + implementation (파일)
- "저장 방식" (파일/설정병합/문서include/컨테이너) 은 분류축이 아니라 **각 자산의 속성**

### 기각된 Type A/B/C/D 분류 (historical, 2026-04-20 폐기)

| Type | 설명 | 예 |
|---|---|---|
| ~~A~~ | ~~파일 자산 (symlink 가능)~~ | ~~skills, subagents, hook 스크립트, instructions 파일~~ |
| ~~B~~ | ~~설정 블록 병합 (marker 기반)~~ | ~~hook registration, MCP 서버 목록, opencode `instructions` 배열~~ |
| ~~C~~ | ~~문서 include~~ | ~~Claude `@file` (순수) / Codex는 layered concat (B') / OpenCode는 B+A 조합~~ |
| ~~D~~ | ~~번들 (black box)~~ | ~~Claude/Codex plugins + OpenCode npm plugins~~ |

폐기 사유: Type D "번들 (black box)" 라벨이 plugin 의 형용사 ("번들 단위") 에서 어휘 반복으로 별개 범주인 듯 인플레이션된 사례. "Bundle ↔ Plugin 경계" 라는 존재하지 않는 경계를 만들어냈음. 계보: `feedback_bundle_inflation.md`.

## 확정된 결정

### 결정 A — Skills 배치 (Option III-tightened) **[FINAL]**
| | project | user |
|---|---|---|
| claude-code | `.claude/skills/` | `~/.claude/skills/` |
| codex | `.agents/skills/` | `~/.agents/skills/` |
| opencode | `.opencode/skills/` | `~/.config/opencode/skills/` |

- Opt-in `target: shared-agents`: codex·opencode 한정, `.agents/skills/` 공유 설치
- **claude-code + shared-agents = parse error** (Claude는 `.agents/`를 읽지 않음 — GitHub issue #31005)
- **Phase 2 cross-tool은 별도 adapter/translator 레이어** (shared-agents는 그 씨앗이 아님)

**추가 조항 (FINAL, 2026-04-19)**:
- **A1**: shared-agents opt-in → `.agents/skills/`에만 설치, `.opencode/skills/` 중복 금지 (이동 시맨틱)
- **A2**: `.opencode/`/`.agents/` 동일 skill 충돌 시 **`.agents/skills/` 우선**, concord가 `.opencode/` 제거/경고
- **A3**: Monorepo nested `.claude/skills/` 지원 Phase 2+
- **A4**: Issue #31005 OPEN 상태 트래킹, Phase 1은 parse error 유지
- **A5**: `.claude/commands/*.md`는 skill 별칭 — 별도 asset type 아님

상세: `new-plans/01-skills.md`

## 확정된 결정 (계속)

### 결정 B — Sync 의미론 + CLI UX **[FINAL]**

**CLI 명령 세트 (Phase 1)**: init / detect / adopt / import / replace / sync / update / doctor / list / why
- `add` / `remove` 는 Phase 2+ 로 이관 (provider 공식 도구가 설치 담당, concord 는 state 관리)

**주요 정책** (상세 `new-plans/STEP-B/07-cli-and-bootstrap.md`):
- 용어: **"scope"** 전면 통일 (내부 `ConfigScope`, 병합 순서는 "precedence")
- 4 scope: enterprise / user / project / local, locality 규칙 (project/local=cwd, user/enterprise=~/.concord/)
- `concord sync` 기본 = **project scope** (deterministic), `--scope X` 확장, CSV 다중 지정, `--all` 제거
- Tier 1/2 CLI: bare sync (deterministic) vs `--file`/`--url` (파일명 자동 scope 추론)
- URL sync: `https://` + `--sha256` digest pin 필수 + 첫 fetch confirm
- Guided bootstrap: lock 없으면 dry-run 요약 + y/N prompt, `--yes`/`CONCORD_NONINTERACTIVE=1` 비대화
- Adopt: **context-aware default** (cwd 에 project manifest 있으면 user+project, 없으면 user), enterprise/local never-default
- Adopt 확정 UX: Terraform apply 패턴 (dry-run + y/N + `--yes`/`--write` bypass + non-TTY conservative fail)
- 상태 머신: install/update/prune/skip + drift/orphan/shadowed/scope-conflict/readonly-managed/marker-broken
- `concord.yaml` / `concord.project.yaml` alias 둘 다 허용
- Config round-trip: JSONC (jsonc-morph 1순위), TOML (3도구 POC), 순수 JSON (json-key-owned)
- Hash: raw_hash + normalized_hash 분리 (formatter false-positive 회피)
- Discovery: `$CONCORD_HOME` > `~/.concord/` > `$XDG_CONFIG_HOME/concord/` > `~/.config/concord/` > `%APPDATA%\concord\`

POC-4 resolved: `~/.claude.json` 순수 JSON 확정 → `json-key-owned` 방식 채택 (`STEP-B/05-open-questions.md`)

## 열린 결정

### 결정 C — Plugin 자산 타입의 source 모델 **[FINAL 2026-04-21]**

**공식 FINAL 문서**: **`new-plans/STEP-C/04-final-plan-v2.md`** (섹션 8 에서 v1/v2 비교 후 공식 채택)

**전체 구조**:
- β3 재구조 확정 (2026-04-20): 섹션 1~6
- 섹션 7 Q1~Q5 + Q2' 전체 확정 (2026-04-21)
- 섹션 7 최종 통합 원칙 v1/v2 작성 (2026-04-21)
- 섹션 8 v1/v2 비교 + v2 공식 채택 (2026-04-21)

**문서 계보**:
- 초안 v1 (`STEP-C/01-bundle-plugin.md`) : 2026-04-20 리뷰 2회에서 기각 — Codex CLI 가정 붕괴, C-2 coexistence 모델 오류, C-4 URI 평탄화
- v2 준비 (`STEP-C/02-v2-preparation.md`) : 같은 날 **계보학적 재조사로 "bundle" 이 plugin 형용사에서 인플레이션된 가짜 범주로 판명** (→ `feedback_bundle_inflation.md`). "Bundle ↔ Plugin 경계" 라는 결정 이름 자체가 오류.
- **현 FINAL 방향 (v3)** : [`STEP-C/03-plugin-source-model.md`](new-plans/STEP-C/03-plugin-source-model.md) — β3 재구조

**결정 이름 변경**: "Bundle ↔ Plugin 경계" → **"Plugin 자산 타입의 source 모델"**

**정체성 정박 (사용자 재선언 2026-04-20)**:
- Phase 1 = 설정 한 번에 Import/sync
- Phase 2 = 툴끼리의 공통 workflow/harness (cross-sync)

**확정된 섹션 1~6**:

1. **섹션 1 정체성** — 결정 C 의 Phase 1/2 역할 분리
2. **섹션 2 Asset Type 복원** — Type A/B/C/D 분류 폐기, 6 자산 타입 복원
3. **섹션 3 β3 옵션 α** — `claude-plugin`/`codex-plugin`/`opencode-plugin` 3종 source type + `auto_install`+`enabled`+`purge_on_remove` 3 플래그 (OpenClaw 2단계 게이트 차용)
4. **섹션 4 D-mid + (iv)** — Skills 는 agentskills.io overlay + `concord:` prefix flat, MCP 는 MCP 공식 스펙 overlay + `concord:` prefix
5. **섹션 5 Lock 구조** — roots + nodes flat graph + 3중 digest + 자산별 필드 분리 (`standard_fields`/`concord_fields`/`protocol_fields`) + **`capability_matrix` Phase 1 필수** + Claude `dependencies` transitive + `min_engine`
6. **섹션 6 상태 머신 (모델 B Homebrew Bundle 스타일)** — State 3개 (`installed`/`outdated`/`missing`) + Event 2개 (`integrity-mismatch`/`install-failed`) + opt-in `extraneous`. B-7 CLI 에 **`concord cleanup`** 추가 (총 11개)

**Codex cross-compile 리뷰 통찰 (`task-mo77ph1w-t56nsq` completed)**:
- β3 α = Phase 1 전용. Phase 2 canonical IR 은 **asset-level** 필요
- 자산별 cross-compile ceiling: skills 85-95% / MCP 90-95% / subagents 50-65% / hooks 10-30%
- "90% 호환" 은 skills+MCP subset 에만 현실적. 임의 plugin 은 aspirational
- hooks 는 3단계: overlay-only / unsupported / experimental-compile

**섹션 7 Q1 확정 (2026-04-21)**: Phase 1 lock ↔ Phase 2 IR 결합도 = **Option C 중간 결합 (Cargo 모델)**. 3 원칙: (P1) Phase 1 lock = provider-native reproducibility 계약 / (P2) `capability_matrix` = 유도된 진단 데이터 (contract 아님) / (P3) 같은 파일 + 섹션 분리 + `lockfile_version` 게이팅 + `phase2_projections:` additive 예약. 선례: Cargo workspace + npm v2 dual-write (지지) / PEP 751 + Homebrew + OpenTofu (A 강결합 반대).

**섹션 7 Q2 원칙 확정 (2026-04-21)**: cross-tool 호환 ceiling 노출 정책 = **Option V 확장형 (도구별 분리 + `--json` 예외 + `why --compat`)**. 5 원칙: (V1) 일상 CLI 침묵 / (V2) `doctor` 심각 mismatch 자동 경고 / (V3) `--compat` opt-in drill-down / (V4) `--json` 은 기계 계약 = compat 항상 포함 (Terraform `show -json` 선례) / (V5) 전역 `--show-compat` flag 거부. 선례: 8/8 도구 V 지지 (Bundler `Gemfile.lock` 의 `PLATFORMS` 섹션이 구조적 동형). Z 기각 근거: lock 비대칭 불신 비용 + I3 Lossy 명시 불변식 위반.

**섹션 7 Q4 확정 (2026-04-21)**: `capability_matrix` 표기 = **γ Hybrid + discriminated union**. 내부=β 4 status (`supported` / `detected-not-executed` / `na` / `failed`) + `reason` enum 고정 (예: `FeatureFlagDisabled`, `WindowsUnsupported`, `PluginJsonMissing`), 외부=α 기호 렌더링 (`N` / `N*` / `-` / `?`). 렌더러 = 20줄 pure function. 가드레일 4: (1) reason enum 고정 (K8s #50798 교훈) / (2) JSON Schema = source of truth (zod `discriminatedUnion` deprecate 예정 대비) / (3) 단일 validator 구현 (OpenAPI 교훈) / (4) illegal states unrepresentable. 선례: K8s `.status.conditions` 직접 모델. 반면교사: npm flat boolean 지옥 (`dev`/`optional`/`devOptional`/`peer`). 사용자 요구 "정확한 기호의 이유" = 기호 + `status` + `reason` 자연어 동반 출력 필수.

**섹션 7 Q2' 상세 확정 (2026-04-21)**: 심각 mismatch 3종을 Q4 schema 로 정식화. (a) 환경 불일치 = `status==="supported"` + count>0 + provider 미탐지 (경고) / (b) Lossy 기호 실재 = `status==="detected-not-executed"` + provider 활성 (정보~경고) / (c) Flag gated unmet = (b) ∩ `reason==="FeatureFlagDisabled"` (경고 + remediation hint). `status: failed` = 오류, `status: na` = 침묵. `--json` 출력은 TTY 침묵 여부와 무관하게 **항상** 전체 matrix + remediation hint 포함.

**섹션 7 Q3 확정 (2026-04-21)**: γ Disassemble Phase 1 존재 형태 = **(a) intact only + invariant 선언 + Q2'/Q4 자연 귀결 + parse error 방어선**. 4 원칙: (D1) Phase 1 manifest 에 subset 활성/비활성 문법 0% / (D2) **Invariant "concord 는 plugin 내부를 관측하되 조작하지 않는다"** (섹션 5 불변식 **I6 Plugin intact** 신설) / (D3) (b) lint 경고 = Q2' `failed`+`reason` / (f) doctor 리포트 = Q2 V3 + Q4. Q3 신규 기능 선언 금지 (bundle inflation 계보 회피) / (D4) `include:`/`exclude:`/`allow_disassemble:` 등장 시 parse error + "reserved for Phase 2+". 기각 근거 (웹서치 검증): (c) 3 생태계 (Claude/Codex/OpenCode/OpenClaw) 모두 저자 해체 계약 필드 공식 미지원 = 새 계약 창조 / (d) Homebrew `--with-X/--without-Y` = 2019 deprecate anti-pattern. 3 사용자 시나리오 (S1 도구별 plugin 비활성 / S2 저자 cross-tool 권한 / S3 hook 제외) 모두 기존 `enabled` 플래그 / passthrough / provider-native 위임으로 해결.

**섹션 7 Q5 확정 (2026-04-21)**: manifest 문법 변화 정책 = **Option P+ (npm + Dart constraint hybrid)**. 5 원칙: (P1) schema 거의 불변, 기존 필드 rename/재해석 금지 / (P2) 신규 기능 = 신규 필드/섹션 additive (`cross_sync:` 등) / (P3) **`concord_version: ">=X"` constraint 필드** (Dart `environment.sdk` / npm `engines` 스타일, version 필드 없이 feature gate) / (P4) Q3 I6 parse error 영구 유지 — v1/v2 반전 없음 / (P5) 진짜 breaking 필요 시 B 1회성 전환 (Terraform 0.12 선례), 예방약으로 H 쓰지 말라 (YAGNI). **`manifest_version` 도입 금지**. H (Cargo edition) 기각: 10 선례 중 1건, backport 압력, 문서 2배, Q3 I6 균열, Phase 2 변화가 additive 라 overkill. 지지 선례: npm/Ruby Gemfile (P), Dart pubspec (P+constraint), mise (후발 도구 동력학). Migration 도구 불필요 (additive).

**섹션 7 최종 통합 원칙 (2026-04-21, v2 공식 FINAL)**: Q1~Q5 + Q2' 6 결정 → **7 Top-Level Invariants (Π1~Π7)** 추출. Π1 Phase 1 reproducibility contract / Π2 Plugin intact (관측하되 조작 안 함, "기록은 허용 의미 부여는 금지") / Π3 Provider-native 존중 / Π4 Machine contract vs Human UX 분리 / Π5 Additive evolution (3줄 룰: 필드 추가만 / semantic 변경 금지 / default 변경 = breaking) / Π6 Lossy 명시 (Π4 corollary) / Π7 Explicit boundaries via parse error (Reserved vs Unknown 구분). Π 증설 금지 원칙 (bundle inflation 회피). Phase 2 RFC 방어선 8개 (Π 재검토 금지, I6 완화 금지, Reserved parse error 영구, --json machine contract 완전, lockfile/concord version 역행 금지, status enum 축소 금지, 의미 재해석 금지, RFC 게이트). §A Reserved Identifier Registry: 현재 4개 (`include:`/`exclude:`/`allow_disassemble:`/`disassembled_sources:`).

**섹션 8 (2026-04-21, `05-section8-final-selection.md`)**: v1 vs v2 비교 + **v2 공식 FINAL 채택**. 근거: (1) v1 §4 "문법 경계" 가 자신의 Π5/Π7 과 직접 모순 — 공식 FINAL 부적합 / (2) Codex + 독립 판단 2 리뷰 반영으로 12 지점 보강 / (3) 축별 우위 v2=13/v1=2. v1 은 계보 추적용 역사 기록 보존 (01/02 와 동일 관행, 리뷰 가치 증명 대조군).

### 결정 D — Windows Install Contract **[FINAL 2026-04-21]**

**공식 FINAL 문서**: **`new-plans/STEP-D/01-windows-install-contract.md`**

**언어 스택 확정**: **TypeScript/Node.js** (3 agent 리뷰: Codex + 독립 판단 TS 유지 권고 / 웹서치 조건부 Rust). Windows 커버리지 TS 80-85% → Rust 전환 시 87-93% (+5-10%p), **100% 불가능** (provider 버그 + OS 권한 + 외부 프로세스 + 환경 의존 = 언어 무관). 재검토 트리거 5개: (L1) 결정 B round-trip 축소 / (L2) POC symlink 병목 / (L3) Windows 1st-tier 격상 / (L4) "Node 없이 curl" 요구 / (L5) Anthropic 공식 Rust SDK 출시. 결정적 근거: TS `jsonc-parser`/`jsonc-morph`/`eemeli/yaml` 독보적 성숙도 — Rust 전환 = 결정 B 기술 존망 타격.

**9 명시 결정 (A 범주)**:
- **D-1** `install: symlink|hardlink|copy|auto` 입력 + lock 구체값+reason 저장 (ε UX / δ machine contract)
- **D-3** Hook shell = provider 위임. shebang 검증 0% (Π2). Claude=Git Bash 강제 passthrough
- **D-4** 설치 허용 + 실행 차단 (Π1). Codex 버전 probe (>=0.119 Windows hook 활성). doctor+`--json` reason+remediation 강제
- **D-5** Drift 3 상태 (source/target/divergent). Q4 `drift_status` 필드
- **D-9** WSL=Linux, `/mnt/c/`=Windows 규칙. `is-wsl` 라이브러리
- **D-11** Case-insensitive FS 충돌 = parse error (Π7)
- **D-12** Fallback provenance reason enum 17개 (K8s #50798 교훈, 자유 문자열 금지)
- **D-14** Format transform: MCP `cmd /c npx` Windows wrap, `.claude/skills/` copy 강제 (#25367), `.claude/rules/` symlink 허용
- **D-15** Preflight: Git Bash / Codex 버전 / Developer Mode / AV exclusion 안내 / OneDrive 경고

**부록 A 라이브러리 스택**: `symlink-dir` / `fs-extra` / `graceful-fs` / `is-elevated` / `is-wsl` / `strip-bom` / `write-file-atomic` / `cross-spawn`

**부록 B Known Issues** (9): Antivirus / OneDrive / CRLF gitattributes / Junction readlink / File locking / UNC / FAT/exFAT / Windows 7-8.1 / PowerShell BOM

**Q4 `capability_matrix` 확장** (Π5 additive): `install_mode` / `install_reason` / `shell_compatibility` / `drift_status` 필드 추가.

---

### 결정 E — Secret Interpolation Contract **[FINAL 2026-04-21]**

**공식 FINAL 문서**: **`new-plans/STEP-E/01-secret-interpolation-contract.md`**

**문법 확정**: OpenCode `{env:X}` / `{file:X}` 차용 (중괄호+콜론 scheme mini-DSL). 차용 정당성: PowerShell `$env:X` 충돌 회피 + 확장성 (`{secret:X}` Phase 2) + AI 생태계 일관성.

**19 명시 결정 (v2, 2 agent 리뷰 확장)**:
- **E-1** OpenCode `{env:X}`/`{file:X}` 차용 / **E-2** on-install eager + 축 C 트리거 (sync/update/doctor 재평가)
- **E-2a** drift 4 상태 확장 (D-5 에 **env-drift** 추가) / **E-3** lock unresolved only (hash 는 unresolved 기준)
- **E-4** fail-closed + E-11 default 전제 / **E-5** 자산별 분리 테이블 + **OpenCode 대칭 양보** (이중 치환 방지)
- **E-6** `{secret:...}` Phase 2 structured reference (K8s `secretKeyRef` 선례, 우선순위: 1Password → keychain → aws-ssm)
- **E-7** allowlist 필드 (source/env/authHeader, 자산 파일 내용/frontmatter 제외 = Π2 intact)
- **E-8** TTY 마스킹 + `--json` unresolved + **`concord secret debug` 분리 경로**
- **E-9** nested 금지 / **E-10** path traversal 방어 (project root whitelist)
- **E-11** `{env:X:-default}` Docker Compose 차용 + `{env:X?}` optional marker
- **E-12** type coercion = string only, 숫자/bool 필드 = parse error (Phase 2 `{env:X|int}` reserved)
- **E-13** escape `{{env:X}}` 이중 브레이스 / **E-14** depth 1 (recursion 금지)
- **E-15** UTF-8 only (Phase 2 `{file:X|base64}` reserved) / **E-16** 4 scope 각자 resolve → merge
- **E-17** error reporting 에 resolved 절대 금지 / **E-18** target format (YAML/JSON/TOML) 안전 인코딩
- **E-19** Windows path 첫 번째 콜론만 scheme 구분자 (D-19 교차)

**Π 접촉**: 6/7 (결정 D 동급 complexity). 결정 C §A Reserved Registry 에 11 entries 추가 (secret backends 5 + coerce suffix 3 + default 변형 2 + encoding 1).

**주요 선례 교훈**: OpenCode `{env:X}` 업계 소수파 (`${VAR}` 압도적), Terraform state 반면교사 (lock 에 resolved 저장 금지), GitHub Actions silent empty 악명 함정 (fail-closed 정당), K8s `secretKeyRef` structured reference (Phase 2 방향).

## 결정 B 관련 검증된 외부 도구 (2026-04-19 웹서치 + 리뷰 v2)

### JSON/JSONC
- **1순위 `jsonc-morph`** (David Sherret, Deno) — CST 기반 in-place, 임의 주석 조작 1급
- **2순위 `jsonc-parser`** (Microsoft VSCode) — modify+applyEdits, 임의 주석 삽입 제한

### TOML (POC 벤치마크 후 선택 — Phase 1 첫 sprint)
- **후보 A `@shopify/toml-patch`** — Rust toml_edit wasm 래퍼. 보존 완성도 최고 기대
- **후보 B `@decimalturn/toml-patch`** — timhall/toml-patch 포크, TOML v1.1, pure JS, 최근 활성
- **후보 C `@ltd/j-toml`** — "as much as possible" (top-level standard tables 만 안전)
- **탈락**: `@iarna/toml` (6년 방치), `smol-toml` (comment 보존 없음)

### 차선 전략
- JSONC/TOML: marker 블록 전체 교체 + marker ID + hash suffix (무결성)
- 순수 JSON (`~/.claude.json`): marker 불가 → concord.lock 의 `json-key-owned` 방식으로 key 단위 소유권 추적

### 핵심 아키텍처 결정 (리뷰 반영)
- **`raw_hash` + `normalized_hash` 분리**: formatter false-positive drift 회피
- **상태 머신 확장**: install/update/prune/skip + drift + **orphan + shadowed + layer-conflict + readonly-managed + marker-broken**
- **Partial prune**: "필터 투영 후 desired-set" 명문화
- **Phase 1 축소**: `--rollback`, lock merge driver, Windows CRLF/BOM 완전 지원, `concord import` 는 Phase 1.5 로 이관

상세: `new-plans/STEP-B/00~07.md` (특히 **`07-cli-and-bootstrap.md`** 가 FINAL 확정본)

## 🔴 최우선 리스크

**Config 파일 round-trip 편집**이 concord의 기술적 존망을 가르는 지점. 네이티브 config 파일(`settings.json`, `config.toml`, `opencode.json[c]`)을 marker 블록으로 편집할 때 **주석/순서/trailing comma 파괴 금지**.

- JSON/JSONC: `jsonc-parser`의 edit API 사용 (naive JSON.parse/stringify 금지)
- TOML: round-trip 보존 도구 필요 (`@iarna/toml`은 편집 시 손실 — `toml-patch` 또는 marker 블록 전체 교체)
- CI 골든 테스트: "원본 → sync → diff" 패턴으로 보존 검증

## Cross-tool Portability (2026-04-20 Codex cross-compile 리뷰 반영)

**Codex 측정 ceiling** (task-mo77ph1w-t56nsq, 공식 문서 근거):

| 자산 | Claude→Codex | Claude→OpenCode | Phase 2 전략 |
|---|---:|---:|---|
| **skills** | 85% | 95% | Adapter (agentskills.io 표준) |
| **mcp_servers** | 95% | 90% | Adapter (포맷 변환) |
| LSP | N/A | 80% | OpenCode 전용 Adapter |
| commands | 25% | 70% | Claude commands = skill alias (A5), OpenCode 만 Translate |
| subagents | 50% | 65% | Translate (lossy warning 필수) |
| hooks | 10% | 30% | 3단계 분류: overlay-only / unsupported / **experimental-compile** |
| instructions | — | — | mirror/adapter 수준만 |

**"90% 호환"** : skills+MCP 중심 plugin 에만 현실적. 임의 plugin 은 aspirational.

**핵심 원칙 (Codex 리뷰)**: β3 α (`claude-plugin`/`codex-plugin`/`opencode-plugin`) 는 Phase 1 lock/provenance 에 적합하나, Phase 2 canonical IR 은 plugin 단위가 아니라 **asset-level** 로 내려가야 함. 세 plugin 의 본질이 다름 (Claude=파일 번들, Codex=번들+apps/MCP, OpenCode=실행 코드).

## 참조 문서 (new-plans/)

### 결정별 자산 비교 (결정 A 근거)
- `01-skills.md` — Skills 비교 + Option III-tightened 결정
- `02-subagents.md` — Subagents 비교 (TOML vs MD 포맷 분기)
- `03-hooks.md` — Hooks 비교 (25+ vs 5 vs plugins)
- `04-mcp.md` — MCP 비교 (JSON/TOML/JSON 3포맷)
- `05-instructions.md` — CLAUDE.md/AGENTS.md 비교
- `06-plugins.md` — **Plugins 비교 (marketplace vs npm)** — 결정 C 핵심 참조
- `07-overlap-matrix.md` — **종합 매트릭스 + Type D 분류** — 결정 C 출발점
- `08-codex-review.md` — Codex 2차 검토 결과 (Q1~Q7)
- `09-corrections-and-action-items.md` — Codex 피드백 기반 정정·액션 (Codex `features.codex_hooks` precheck 등 결정 C 연관)

### 결정 B FINAL (STEP-B/)
- `STEP-B/00-overview.md` — 개요·Phase 분할
- `STEP-B/01~06.md` — 상태 머신·config round-trip·lock·테스트·리뷰 누적
- `STEP-B/07-cli-and-bootstrap.md` — **★ FINAL 확정본** (CLI 10개 명령 + scope 정책 + bootstrap)

### 결정 C FINAL (STEP-C/)
- `STEP-C/01-bundle-plugin.md` — 초안 v1 (기각됨 2026-04-20). 역사 기록용 보존
- `STEP-C/02-v2-preparation.md` — v2 준비 (대체됨 2026-04-20). "Bundle ↔ Plugin 경계" 가짜 경계 판명. 역사 기록용 보존
- `STEP-C/03-plugin-source-model.md` — 섹션 1~6 + 섹션 7 Q1~Q5 + Q2' 근거 문서
- `STEP-C/04-final-plan-v1.md` — 리뷰 없는 버전 (대체됨 2026-04-21). 리뷰 가치 증명 대조군, 역사 기록용 보존
- **`STEP-C/04-final-plan-v2.md` — ★ 결정 C 섹션 7 공식 FINAL (2026-04-21) ★**
- `STEP-C/05-section8-final-selection.md` — 섹션 8, v1/v2 비교 + v2 공식 채택 결정

### 결정 D FINAL (STEP-D/)
- **`STEP-D/01-windows-install-contract.md` — ★ 결정 D FINAL (2026-04-21) ★** (5 agent 리뷰 통합 단일 버전)

### 결정 E FINAL (STEP-E/)
- **`STEP-E/01-secret-interpolation-contract.md` — ★ 결정 E FINAL (2026-04-21) ★** (2 agent 리뷰 통합 단일 버전)

## 중요한 공식 문서 사실

### Skills (Agent Skills open standard, agentskills.io)
- Claude Code: `.claude/skills/`만 스캔, `.agents/skills/` 미지원 ([issue #31005](https://github.com/anthropics/claude-code/issues/31005))
- Codex: `.agents/skills/` 주 경로, symlink 공식 지원, 6-tier scope, duplicate selector에 둘 다 노출
- OpenCode: `.opencode/`, `.claude/`, `.agents/` 3경로 모두 native, "names unique across all locations" 요구

### Hooks (극단적 격차)
- Claude: **26 events**, 4 types (command/http/prompt/agent), matcher+if, Live change detection
- Codex: **5 events**, command only, Bash only, Windows 미지원, `features.codex_hooks = true` 필수
- OpenCode: **네이티브 hooks 없음** → plugin(JS/TS) 형태로 구현

### 파일 포맷 (주의)
- Subagents: Claude `.md+YAML` / Codex `.toml` / OpenCode `.md+YAML`
- Config: Claude JSON(C) / Codex TOML / OpenCode JSONC

## 이 세션의 Agora 라우팅 이력

- **clarify + scope**: 초기 목표 정리
- **assumption-audit**: "harness는 universal 개념" 전제 해부
- **frame-the-decision + compare-options**: 파일 구조, 자산 타입, 배치 전략 결정
- **court-review (single: codex-rescue)**: 독립 판단 2회 (옵션 III 확립, 매트릭스 검증)
- **doubt-list**: 실증 공백(.agents/skills 지원 여부 등) 확인 루프
- **decide + compare-options** (2026-04-20): 결정 C v1 기각 후 β3 재구조 — R3/G2/E2/S2 추천값 → β3 α 로 수렴
- **assumption-audit (genealogy)** (2026-04-20): "Bundle" 범주의 계보 재조사 → plugin 형용사의 인플레이션으로 판명
- **dialectic (brainstorming)** (2026-04-20): β3 설계 섹션 1~6 진행 (사용자 정체성 재선언 포함)
- **skeptic + precedent research** (2026-04-20): 모델 A (2층 이분법) vs 모델 B (Homebrew Bundle 스타일) → 웹서치 6 도구 비교로 모델 B 확정

## Ground rules (이 프로젝트)

- 한국어 대화
- 기존 `plans/` 폴더 내용 무시 (사용자 명시). 새 작업은 `new-plans/`
- Single sync tool 철학: resolver 중복 구현 금지, provider 런타임의 네이티브 동작 존중
- Provider-native 기본, 공유는 명시적 opt-in

---

## 📋 다음 세션 착수 가이드

### 즉시 재개 지점

**현재**: Plan 4 CLI Integration 완료 (27/27 task, 600 tests). **Phase 1 CLI v1 기능 완성.**

다음 세션에서:
1. `git status` / `git log --oneline -10` 로 main 상태 확인 (Plan 4 merged 여부 + 태그)
2. `npx vitest run` 실행 → 600 passed + 1 skipped green 재확인
3. **Phase 2 결정**:
   - Cross-tool adapter (skills+MCP ~85-95%, subagents 50-65%, hooks 10-30%)
   - `{secret:X}` structured reference backend routing (1Password/keychain/aws-ssm)
   - Enterprise URL allowlist
   - `concord add` / `remove` / `rollback` / `bootstrap` 명령 재평가
   - Plan 4 follow-ups 정리: `runCommand` timeout / `lock-write.ts` 정렬 / `insertEntry` edge / `adopt` partial failure

### Implementation workflow (확립된 패턴)

1. **Implementer dispatch** (general-purpose agent)
   - Plan task 전문을 prompt 에 paste (subagent 는 plan 파일 직접 읽지 않음)
   - Context: 현재 git state + 선행 task 완료 상태 + Zod 4 / Vitest 4 / TS 6 주의사항
   - TDD 엄격: Step 1 test → Step 2 fail 확인 → Step 3 impl → Step 4 pass → Step 5 commit
2. **Review 2-stage**:
   - Spec compliance: plan 에 literal 일치 수준이면 inline verify, 복잡하면 subagent dispatch
   - Code quality: 모든 task 에 `superpowers:code-reviewer` subagent dispatch
3. **Deviation 처리**:
   - Implementer 의 DONE_WITH_CONCERNS 는 plan 을 업데이트하여 일관성 유지
   - 별도 commit (`docs(plan-1): ...`) 로 plan ↔ impl 동기화
4. **Fix loop**: Review issue → 같은 방향으로 fix implementer dispatch → re-review

### 남은 주요 단계

#### Plan 1 Foundation 잔여 (Task 8~28)
- **Schema 집중** (Task 8~16): Source / AssetBase / 자산 6종 / ManifestSchema top + concord_version + YAML loader
- **Validator+merge** (Task 17~19): validateManifest 3-pass + 4-scope precedence merge
- **Lock** (Task 20~23): LockNode 3중 digest / LockSchema symlink refine / Lock I/O / validateLock I1/I5/I6
- **CLI** (Task 24~26): `validate` / `lint` / `list --dry-run`
- **Integration + wrap-up** (Task 27~28): 4-scope merge golden test (POC-13) / README + POC log

#### Plan 2~4 (차후)
- Plan 2 Sync Engine: Config round-trip (JSONC/TOML/pure JSON) + Fetcher 6종 + Symlink installer + Format transform
- Plan 3 Secret + Diagnostics: E-1~E-19 보간 엔진 + doctor + cleanup + plugin introspection 완성
- Plan 4 CLI 통합: init/detect/adopt/import/replace/update/list/why + guided bootstrap

### 재검토 트리거 (모니터링)

- **언어 재고 L1~L5** (결정 D §1.5) — TS → Rust 전환 조건
- **Π 변경 RFC 게이트** (결정 C v2 §6.8) — 절차적 방어선
- **POC-7** Codex `marketplace add` 공식 docs 업데이트 감시
- **Issue #31005** Claude `.agents/skills/` 지원 여부
- **Zod 4 `z.switch` GA** → `z.discriminatedUnion` 전면 migration 시점

### 최우선 기술 리스크 (Plan 2 이후 다룸)

1. **Config round-trip 편집** (기술 존망) — Plan 2 / POC-1/POC-2
2. **Plugin introspection 정확성** — Plan 3 / POC-5
3. **Windows install 5-10% 커버리지 공백** — Plan 2 (부록 B 라이브러리 스택)
4. **Secret 보간 target format 안전 인코딩** — Plan 3 / POC-14

### 핵심 참조 문서 순위 (Plan 1 구현용)

1. **Π1~Π7 불변식** → `docs/superpowers/specs/2026-04-21-concord-design.md` §1
2. **Reserved Identifier Registry** → spec §2 (15 entries) — Task 4 완료
3. **Manifest Schema** → spec §4 — Task 9~16 대상
4. **Lock Schema** → spec §5 — Task 20~23 대상
5. **§11 Discovery / 4-scope** → spec §11 — Task 3 완료, Task 19 scope merge 대기

---
