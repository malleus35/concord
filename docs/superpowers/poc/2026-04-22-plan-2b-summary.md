# Plan 2B Sync Engine — Completion Summary

**Date**: 2026-04-22
**Branch**: `feat/concord-plan-2b-sync-engine` → `main`
**Tag**: `concord-plan-2b-sync-engine`
**Tasks**: 30/30 ✅
**Tests green**: **408 passed + 1 skipped (68 files)** — typecheck clean, `npm run build` emits `dist/`
**Plan doc**: `docs/superpowers/plans/2026-04-22-concord-plan-2b-sync-engine.md` (~2000 lines)

## Goal achieved

`concord sync` 가 end-to-end 동작. Plan 2A round-trip 인프라 + POC 선정 library (`@decimalturn/toml-patch`, `jsonc-morph`, `yaml` eemeli, `symlink-dir`) 위에 Fetcher 6종 + Config writer 4종 + Symlink/copy installer + MCP Windows transformer + Sync orchestration 구축 완료.

## 30 Task 요약

### Phase A — CI / shared utilities (Task 1~3)
| # | Task | Commit |
|---|---|---|
| 1 | 3-platform CI matrix (ubuntu/macos/windows) | `85d679e` |
| 2 | `ManagedBlock` marker parser + emitter (spec §10.5) | `63d2483` |
| 3 | `runCommand` execFile wrapper (security hook 대응) | `b54cde8` |

### Phase B — Fetcher system (Task 4~10)
| # | Task | Commit |
|---|---|---|
| 4 | Fetcher common interface + `FetchError` | `5aded1c` |
| 5 | FileFetcher (local file/dir + sha256 digest) | `d7a7a41` |
| 6 | GitFetcher (clone + ref + SHA digest) | `abe822d` |
| 7 | HttpFetcher (fetch + sha256 pin) | `bf05962` |
| 8 | NpmFetcher (npm pack + integrity) | `202a7d4` |
| 9 | ExternalFetcher (provider CLI via runCommand) | `cd273e9` |
| 10 | AdoptedFetcher + registry (6 fetchers) | `61f7c71` |

### Phase C — Config writer system (Task 11~15)
| # | Task | Commit |
|---|---|---|
| 11 | `ConfigWriter` interface + `WriteOp` union | `e1b0e69` |
| 12 | JsoncWriter (`jsonc-morph`, marker `//`) | `24389a8` |
| 13 | TomlWriter (`@decimalturn/toml-patch`, marker `#`) | `b44c399` |
| 14 | JsonKeyOwnedWriter (pure JSON, POC-4) | `c1cff9b` |
| 15 | YamlWriter (`yaml` eemeli) + registry (4 writers) | `2a88d4f` |

### Phase D — Installer (Task 16~17)
| # | Task | Commit |
|---|---|---|
| 16 | Installer types + SymlinkInstaller (symlink-dir + junction) | `7b51e37` |
| 17 | CopyInstaller + routing (D-14: `.claude/skills/` → copy) | `496a1be` |

### Phase E — Format transformer (Task 18)
| # | Task | Commit |
|---|---|---|
| 18 | MCP Windows `cmd /c npx` transformer + registry (D-14) | `feedc61` |

### Phase F — Lock + sync state (Task 19~22)
| # | Task | Commit |
|---|---|---|
| 19 | Lock atomic write + `.bak` backup | `10fd1c7` |
| 20 | `computeSyncPlan` (install / update / prune / skip) | `d0f7e52` |
| 21 | Drift detection (`none` / `source` / `target` / `divergent`) | `5e980ef` |
| 22 | State machine (`installed` / `outdated` / `missing`) | `a0640e7` |

### Phase G — Runner + CLI (Task 23~25)
| # | Task | Commit |
|---|---|---|
| 23 | `runSync` orchestration | `72e1f8e` |
| 24 | Rollback log (reverse-order, non-pre-existing only) | `2c4a00c` |
| 25 | `concord sync` CLI | `e5d4d63` |

### Phase H — E2E + docs + merge (Task 26~30)
| # | Task | Commit |
|---|---|---|
| 26 | E2E skill sync cycle (CLI subprocess) | `843e6a2` |
| 27 | E2E MCP JSONC/TOML round-trip | `928fdaa` |
| 28 | E2E drift scenarios | `e77ae79` |
| 29 | Full verification (typecheck / vitest / build) | — |
| 30 | README + summary + TODO/MEMORY + tag + merge | this commit |

## 핵심 기술 결정

### 1. `src/utils/exec-file.ts` (Task 3 신설)
- Node 표준 라이브러리의 자식 프로세스 실행 API promisify 래퍼 `runCommand`
- security hook 이 직접 호출 패턴을 경고하므로 단일 지점에 집중
- Git / Npm / External fetcher 가 공통 사용 (Plan 본문 반영)
- TS 6 narrowing 이슈 → `Buffer.isBuffer(v) ? v.toString("utf8") : String(v)` 패턴 (plan 동기화 commit `5c3d460`)

### 2. 3-platform CI matrix (Task 1)
- POC-9 Windows 검증 자동화 (Plan 2A 에서 macOS 만 PASS, Windows DEFERRED)
- ubuntu-latest / macos-latest / windows-latest + Node 22 + `fail-fast: false`
- typecheck + vitest run 각 OS 에서 실행

### 3. Plan 2A 인프라 100% 재사용
- `src/round-trip/types.ts` (`ManagedBlock` 등)
- `src/round-trip/preservation.ts` / `diff-regions.ts`
- `src/round-trip/toml/decimalturn.ts` / `jsonc/jsonc-morph.ts` / `yaml/eemeli.ts` / `symlink/symlink-dir.ts`
- Plan 2B 신규 컴포넌트는 이 위에 구축

### 4. CLI Option A 적응 (Task 25)
- Plan 원안의 즉시 프로세스 종료 패턴 → `setExitCode(code) + return` 로 adaptation
- 이유: `runCli(argv)` 프로그래매틱 caller 가 exit code 수신 가능하도록
- 기존 `validate` / `lint` / `list` 명령과 일관성
- Plan 문서 동기화 completed (commit `156546a`)

## 산출물

- **`concord sync` CLI 실동작**: manifest → plan → fetch → install → lock write (E2E 테스트 검증)
- **3-platform CI matrix**: ubuntu / macos / windows (Node 22, typecheck + vitest)
- **6 fetchers + registry** (`src/fetch/`)
- **4 config writers + registry** (`src/write/`)
- **2 installers + D-14 routing** (`src/install/`)
- **1 MCP Windows transformer + registry** (`src/transform/`)
- **Sync primitives**: `computeSyncPlan` / `computeDriftStatus` / `determineState` / `runSync` / `createRollbackLog` (`src/sync/`)
- **Lock atomic write + `.bak`** (`src/io/lock-write.ts`)
- **Marker block parser/emitter** (`src/round-trip/marker.ts`)

## 비고 — Plan 2A ↔ Plan 2B 구조 대칭

```
src/
├── round-trip/      # Plan 2A
│   ├── toml/        #   decimalturn wrapper
│   ├── jsonc/       #   jsonc-morph wrapper
│   ├── yaml/        #   eemeli wrapper
│   └── symlink/     #   symlink-dir wrapper
├── fetch/           # Plan 2B — URI → local bytes
│   ├── file.ts / git.ts / http.ts / npm.ts / external.ts / adopted.ts
│   └── registry.ts
├── write/           # Plan 2B — source → marker block edit → modified source
│   ├── jsonc.ts / toml.ts / json-key-owned.ts / yaml.ts
│   └── registry.ts
├── install/         # Plan 2B — local path → target path
│   ├── symlink.ts / copy.ts / routing.ts
├── transform/       # Plan 2B — asset × provider × platform → output
│   ├── mcp-windows.ts / registry.ts
├── sync/            # Plan 2B — orchestration
│   ├── plan.ts / drift.ts / state-machine.ts / runner.ts / rollback.ts
└── utils/
    └── exec-file.ts # Plan 2B — runCommand wrapper
```

## Non-goals (다음 Plan)

### Plan 3 — Secret + Diagnostics
- Secret interpolation (E-1~E-19): `{env:X}` / `{file:X}` / `{env:X:-default}` / escape / allowlist
- `concord doctor` preflight 5 checks (D-15)
- `concord cleanup` opt-in extraneous prune (결정 C §6)
- Plugin introspection 엔진 (Claude `plugin.json` / Codex `.codex-plugin/plugin.json` / OpenCode `package.json#main`)
- Prune action 실제 디스크 삭제 (Plan 2B 의 runner 는 집계만)
- env-drift (drift 4번째 상태)

### Plan 4 — CLI 통합
- `concord init` / `detect` / `adopt` / `import` / `replace` / `update` / `why`
- Guided bootstrap UX (Terraform apply 패턴)
- `--json` / TTY 분리 (Π4)
- Scope merge 명령 통합

## 테스트 성장 궤적

| Plan | Tests | Files |
|---|---:|---:|
| Plan 1 Foundation | 169 | 26 |
| Plan 2A Round-trip | 246 | 37 |
| **Plan 2B Sync Engine** | **408** | **68** |
