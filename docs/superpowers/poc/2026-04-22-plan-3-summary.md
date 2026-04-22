# Plan 3 Secret + Diagnostics — Completion Summary

**Date**: 2026-04-22
**Branch**: `feat/concord-plan-3-secret-diagnostics` → `main`
**Tag**: `concord-plan-3-secret-diagnostics`
**Tasks**: 30 / 30 ✅
**Tests green**: **518 passed + 1 skipped** (93 files)
**Commits**: 28 (27 impl/test + 1 merge)

## Goal achieved

결정 E Secret Interpolation Contract (E-1~E-19) 전면 구현 + drift 5th 상태 `env-drift` + `concord doctor` (D-15 preflight 5 체크 + `--json`) + `concord cleanup` (opt-in extraneous prune) + plugin introspection (Claude/Codex/OpenCode plugin.json) + runner prune 실삭제.

## Phase 결과

### Phase A — Branch + drift 확장 (Task 1~2)
- Feature branch 생성 + baseline 검증 (408+1 → 410+1)
- `src/sync/drift.ts` 5th state `env` 추가, source drift precedence

### Phase B — Secret engine (Task 3~11)
- `src/secret/types.ts` — `ResolveError` (8 codes), `ResolverContext`, `ResolvedEntry`
- `src/secret/parser.ts` — `parseExpression` + `findAllExpressions` (E-1/E-11/E-13/E-19 first-colon rule)
- `src/secret/env-resolver.ts` — E-4 fail-closed + E-11 default/optional
- `src/secret/file-resolver.ts` — E-10 traversal + E-15 UTF-8/BOM
- `src/secret/render.ts` — E-9 nested / E-13 escape / E-14 depth=1
- `src/secret/provider-policy.ts` — E-5 OpenCode symmetric exemption
- `src/secret/encode.ts` — E-18 JSON/YAML/TOML safe encoding
- `src/secret/resolve-entry.ts` — E-7 allowlist walk + envDigest + structuredClone
- `src/sync/runner.ts` — E-2 on-install eager resolve 훅 통합
- **Plan 1 allowlist 확장**: `source.path` 추가 (file source 지원)

### Phase C — Plugin introspection (Task 12~14, POC-5)
- `src/plugin/claude.ts` — Claude `plugin.json` 파서
- `src/plugin/codex.ts` — `.codex-plugin/plugin.json` 파서
- `src/plugin/opencode.ts` — `package.json#main` + `opencode` convention
- `src/plugin/registry.ts` — 3-provider routing
- `src/plugin/capability.ts` — `introspectPlugin` → `CapabilityMatrix` (4 status)

### Phase D — Preflight (Task 15~18)
- `src/sync/env-drift.ts` — `computeEnvDrift` (E-2a 판정)
- `src/sync/preflight/git-bash.ts` — Windows `CLAUDE_CODE_GIT_BASH_PATH` 검사
- `src/sync/preflight/codex-version.ts` — `codex --version` + semver ≥0.119
- `src/sync/preflight/platform-warnings.ts` — Developer Mode / AV / OneDrive

### Phase E — CLI (Task 19~22)
- `src/cli/commands/doctor.ts` — preflight aggregate + `--json`
- `src/install/uninstall.ts` — symlink-safe `fs.rm({recursive, force})`
- `src/sync/runner.ts` — prune branch 실삭제 통합
- `src/cli/commands/cleanup.ts` — `--yes` / `--dry-run` / default

### Phase F — E2E + docs (Task 23~30)
- `tests/integration/sync-secret.test.ts` — CLI subprocess E-2/E-4
- `tests/integration/env-drift.test.ts` — computeEnvDrift 시나리오
- `tests/integration/doctor.test.ts` — `doctor --json` CLI
- `tests/integration/cleanup.test.ts` — `cleanup` CLI 2-mode
- `tests/integration/plugin-introspection.test.ts` — 3-provider
- README / TODO / MEMORY / summary / tag / merge

## 핵심 결정

- **E-7 allowlist**: `source.{url,repo,ref,version,path}` / `env.*` / `authHeader` / `headers.*` — 다른 필드 passthrough
- **E-5 Provider 양보**: OpenCode 자산은 concord 보간 X (이중 치환 방지, Π3)
- **E-17 invariant**: 모든 error message 에 resolved value 금지 — 테스트로 보장
- **env-drift 5th 상태**: source+target match + env changed → `env`. source drift 우선 (precedence)
- **prune 실삭제**: Plan 2B 집계-only → `uninstall(targetPath)` 호출로 완전화
- **Plan 1 allowlist 확장 deviation**: plan 작성 시 `source.path` 누락 — Task 11 에서 발견, 별도 commit `13a6ce6` 로 수정

## Non-goals (Plan 4)

- `init` / `detect` / `adopt` / `import` / `replace` / `update` / `why` commands
- Guided bootstrap UX (Terraform apply 패턴)
- `{secret:X}` structured reference (Phase 2)
- E-16 4-scope merge (Plan 4 scope merging CLI 레벨)

## 테스트 성장

| Plan | Tests | Files |
|---|---:|---:|
| Plan 1 | 169 | 26 |
| Plan 2A | 246 | 37 |
| Plan 2B | 408 | 68 |
| **Plan 3** | **518** | **93** |

증가분: +110 tests (secret: 45 / plugin: 17 / preflight: 13 / CLI: 6 / E2E: 11 / misc: 18)

## 주요 재사용

- `src/schema/interpolation-allowlist.ts` (Plan 1) — `checkPathTraversal` / `checkNested` / `isAllowedField`
- `src/schema/reserved-identifier-registry.ts` (Plan 1) — E-6/E-11/E-12/E-15 parse error 이미 등재
- `src/utils/exec-file.ts` (Plan 2B) — Codex version probe 사용
- `src/sync/drift.ts` (Plan 2B) — 4→5 상태 확장
- `src/sync/runner.ts` (Plan 2B) — secret resolve 훅 + prune 실삭제 추가
- `src/io/lock-write.ts` (Plan 2B) — cleanup 에서 lock 재작성
