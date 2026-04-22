# concord

Sync AI harness assets (skills / subagents / hooks / MCP / instructions / plugins) across Claude Code, Codex, and OpenCode.

**Status**: Phase 1 — Plan 1 Foundation + Plan 2A Round-trip POC + **Plan 2B Sync Engine** complete. Secret interpolation, doctor/cleanup, and `init/detect/adopt/import/replace/update/why` commands come in Plan 3/4.

## Install

```bash
npm install
npm run build
```

## Usage

```bash
# Apply manifest to provider targets (Plan 2B)
concord sync
concord sync --scope user
concord sync --manifest ./concord.yaml --lock ./concord.lock

# Validate a manifest (Plan 1)
concord validate ./concord.yaml

# Fast lint (Reserved Registry + interpolation allowlist only)
concord lint ./concord.yaml

# List entries from lock file (dry-run)
concord list --lock ./concord.lock
```

## Subsystems (Plan 2B)

- **6 fetchers**: file / git / http / npm / external / adopted
- **4 config writers**: JSONC (`jsonc-morph`) / TOML (`@decimalturn/toml-patch`) / pure JSON (`json-key-owned`) / YAML (`yaml` eemeli)
- **2 installers**: symlink (`symlink-dir` + atomic staging) / copy (`fs-extra` + `write-file-atomic` fallback)
- **1 format transformer**: MCP Windows `cmd /c npx` wrap (D-14)
- **State machine**: `installed` / `outdated` / `missing` + `integrity-mismatch` / `install-failed` events
- **Drift detection**: `none` / `source` / `target` / `divergent`
- **Atomic rollback**: per-action log, reverse-order cleanup on failure
- **3-platform CI matrix**: ubuntu / macos / windows (Node 22)

## Design docs

- Spec: `docs/superpowers/specs/2026-04-21-concord-design.md`
- Plans: `docs/superpowers/plans/`
- POC log: `docs/poc-log.md`

## POC results

### Plan 2A — Round-trip
- [POC-1 TOML: @decimalturn/toml-patch](docs/superpowers/poc/2026-04-22-poc-1-toml-library.md)
- [POC-2 JSONC: jsonc-morph](docs/superpowers/poc/2026-04-22-poc-2-jsonc-library.md)
- [POC-3 YAML write-back: yaml (eemeli)](docs/superpowers/poc/2026-04-22-poc-3-yaml-write-back.md)
- [POC-9 symlink: symlink-dir (macOS confirmed)](docs/superpowers/poc/2026-04-22-poc-9-symlink.md)
- [Summary](docs/superpowers/poc/2026-04-22-round-trip-summary.md)

### Plan 2B — Sync Engine
- [Plan 2B summary](docs/superpowers/poc/2026-04-22-plan-2b-summary.md)

## Requirements

- Node.js >= 22 (Active LTS)
- TypeScript 6.x
- Zod 4.x / Vitest 4.x

## License

MIT
