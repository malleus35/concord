# Plan 4 — CLI Integration Summary

**Date:** 2026-04-22
**Branch:** `feat/concord-plan-4-cli-integration`
**Tests:** 600 passed + 1 skipped (116 files) — baseline 518 → +82
**Tasks:** 27 / 27
**Plan document:** [`docs/superpowers/plans/2026-04-22-concord-plan-4-cli-integration.md`](../plans/2026-04-22-concord-plan-4-cli-integration.md)

## Commands delivered

| Command | Source | Notes |
|---|---|---|
| `concord init --scope <s>` | `src/cli/commands/init.ts` | Atomic `wx` flag + `ConfigScope.safeParse` |
| `concord detect [--json]` | `src/cli/commands/detect.ts` | Probes 3 agents in parallel; writes `.detect-cache.json` |
| `concord adopt [--scope] [--yes|--dry-run]` | `src/cli/commands/adopt.ts` | Terraform apply + context-aware default (D-W1) |
| `concord import <file>|--url [--sha256]` | `src/cli/commands/import.ts` | Digest-pinned URL, policy-validated merge |
| `concord replace <file>|--url` | `src/cli/commands/replace.ts` | Whole-manifest swap + `.bak.<UTC>` |
| `concord update [id] [--json]` | `src/cli/commands/update.ts` | Re-fetch + lock refresh |
| `concord why <id>` | `src/cli/commands/why.ts` | Origin + transitive parents |
| `concord secret debug --env X [-v]` | `src/cli/commands/secret-debug.ts` | TTY-only, masked, audit-logged |
| Guided bootstrap in `concord sync` | `src/cli/commands/sync.ts` | `--yes` / `CONCORD_NONINTERACTIVE=1` / TTY prompt |

## POC outcomes

| POC | Status | Test file |
|---|---|---|
| **POC-10** (doctor preflight edges) | ✅ PASS (no adaptation) | `tests/integration/poc-10-preflight.test.ts` |
| **POC-11** (drift 5-state edges) | ✅ PASS (no adaptation) | `tests/integration/poc-11-drift.test.ts` — 7 cases |
| **POC-14** (target-format encoding) | ✅ PASS (no adaptation) | `tests/integration/poc-14-target-encoding.test.ts` — 7 cases |

All three POCs verified existing Plan 2B / Plan 3 implementations — no source changes required.

## Key deviations from plan

| Task | Deviation | Reason |
|---|---|---|
| 5 | `wx` flag atomic create + `ConfigScope.safeParse` (plan had `stat`+write and cast) | Code reviewer I-1/I-2 — TOCTOU + DRY |
| 6 | Version regex broadened from `\b(\d+\.\d+\.\d+)\b` to `(\d+\.\d+\.\d+)` | Word boundary fails on `v0.119.0` |
| 9 | `AdoptCandidate.assetType` narrowed to `"skills" \| "subagents"` | Phase 1 scanner doesn't emit `instructions` |
| 11 | `AssetType` re-imported from `src/schema/types.ts` (plan declared locally) | DRY — single source of truth |
| 12 | Manifest-exists check moved BEFORE scan (plan had it inside apply loop) | Fail-fast for "no manifest" user UX |
| 12 | `insertEntry` catch narrowed to `duplicate id` prefix | Don't swallow future validation errors |
| 14 | `--policy` allowlist validation + typed `FetchSource` (plan used bare `as any`) | Code reviewer I-1/I-2 |
| 20 | `readLock` called synchronously (plan had `await`) | `readLock` is not async — TS diagnostic |

## E2E coverage

`tests/integration/e2e-bootstrap-workflow.test.ts` — full Solo §6.19 Scenario A: `init` → `detect` → `adopt` → `doctor`. All 4 commands in one test.

## Architectural reuse

Plan 4 added **zero new engines**. Every command composes prior infrastructure:

- Task 14 `import` URL fetch → Plan 2B `createHttpFetcher`.
- Task 17 `update` → Plan 2B `computeSyncPlan` + `runSync`.
- Task 18 `why` → Plan 1 `readLock`.
- Task 19 `secret debug` → Plan 3 `appendAudit` + Task 2 `isInteractive`.
- Task 20 guided bootstrap → Task 2 `promptYesNo`.

## Not done (Phase 2+)

- `concord add` / `concord remove` / `concord rollback` / `concord bootstrap` (§6.17)
- `{secret:op://...}` backend routing (still parse-error via Reserved Registry)
- Enterprise scope URL allowlist (Phase 1.5)
- Cross-tool adapter / translate layer
- cosign / minisign signature verification (Phase 4)

## Follow-ups tracked for Task 25 / Phase 2

- `runCommand` lacks `timeoutMs` — `claude --version` with a hung hook could block `detect` indefinitely. Plan 3 `codex-version.ts` has the same exposure.
- `src/io/lock-write.ts` uses callback-style `write-file-atomic` wrapped in `new Promise`; new Plan 4 code uses the v7 promise API directly. Align in a polish pass.
- `insertEntry` edge: null-valued asset key with a trailing comment loses that comment on `doc.set` fallback. Rare; documented in the file.
- `adopt` multi-scope partial failure semantics: if scope B's write fails after scope A commits, A is NOT rolled back. Documented in the JSDoc; could be strengthened in Phase 2.

## Next

Tag `concord-plan-4-cli-integration` and merge to `main`. Phase 1 CLI = v1 release candidate.
