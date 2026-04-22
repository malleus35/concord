# concord

Sync AI harness assets (skills / subagents / hooks / MCP / instructions / plugins) across Claude Code, Codex, and OpenCode.

**Status**: Phase 1 — Plan 1 Foundation + Plan 2A Round-trip POC + Plan 2B Sync Engine + Plan 3 Secret + Diagnostics + **Plan 4 CLI Integration** complete. Phase 1 CLI is feature-complete.

## Install

```bash
npm install
npm run build
```

## Usage

```bash
# Scaffold a new manifest (Plan 4)
concord init --scope project           # ./concord.yaml
concord init --scope user              # ~/.concord/concord.user.yaml

# Probe installed agents (Plan 4)
concord detect                         # writes ~/.concord/.detect-cache.json
concord detect --json

# Register existing assets (Plan 4 — Terraform apply pattern)
concord adopt --scope project --dry-run
concord adopt --scope project --yes

# Import / replace / update (Plan 4)
concord import ./friend.yaml --target-scope user --yes
concord import --url https://example.com/team.yaml --sha256 <hash> --target-scope user --yes
concord replace ./new.yaml --target-scope user --yes
concord update                         # refetch all sources + refresh lock
concord update <id> --json             # single-entry refresh, machine output
concord why <id>                       # trace origin + transitive parents

# Apply manifest to provider targets (Plan 2B)
concord sync
concord sync --scope user
concord sync --manifest ./concord.yaml --lock ./concord.lock

# Validate / lint / list (Plan 1)
concord validate ./concord.yaml
concord lint ./concord.yaml
concord list --lock ./concord.lock

# Preflight diagnostics (Plan 3)
concord doctor                         # TTY-friendly report
concord doctor --json                  # machine-readable

# Extraneous prune (Plan 3)
concord cleanup --dry-run              # report only
concord cleanup --yes                  # actually remove

# Secret debug (Plan 4 — TTY only, audit-logged)
concord secret debug --env GITHUB_TOKEN         # masked
concord secret debug --env GITHUB_TOKEN -v      # full resolved value
```

### Write-command conventions (Plan 4)

`adopt` / `import` / `replace` follow the **Terraform apply pattern**:

- **Default (TTY)**: preview to stderr, then `y/N` prompt.
- **`--yes` / `--write`**: skip prompt and apply immediately.
- **`--dry-run`**: preview only, never write.
- **Non-TTY (CI) without a flag**: conservative fail (exit 1). Set `CONCORD_NONINTERACTIVE=1` + `--yes` in CI.

`concord sync` runs the same bootstrap prompt the first time it meets an empty lock.

## Subsystems (Plan 2B)

- **6 fetchers**: file / git / http / npm / external / adopted
- **4 config writers**: JSONC (`jsonc-morph`) / TOML (`@decimalturn/toml-patch`) / pure JSON (`json-key-owned`) / YAML (`yaml` eemeli)
- **2 installers**: symlink (`symlink-dir` + atomic staging) / copy (`fs-extra` + `write-file-atomic` fallback)
- **1 format transformer**: MCP Windows `cmd /c npx` wrap (D-14)
- **State machine**: `installed` / `outdated` / `missing` + `integrity-mismatch` / `install-failed` events
- **Drift detection**: `none` / `source` / `target` / `divergent`
- **Atomic rollback**: per-action log, reverse-order cleanup on failure
- **3-platform CI matrix**: ubuntu / macos / windows (Node 22)

## Subsystems (Plan 3)

- **Secret interpolation** (`src/secret/`): `{env:X}` / `{file:X}` / `{env:X:-default}` / `{env:X?}` / `{{...}}` escape — E-1~E-19
- **5th drift state `env`**: resolver re-evaluates against current env; source drift wins over env (E-2a)
- **Plugin introspection** (`src/plugin/`): Claude `plugin.json` / Codex `.codex-plugin/plugin.json` / OpenCode `package.json#main + opencode` → capability matrix (POC-5)
- **`concord doctor`**: Git Bash / Codex ≥0.119 / Developer Mode / AV / OneDrive preflight + `--json`
- **`concord cleanup`**: opt-in extraneous prune (§6 model B Homebrew Bundle)
- **Runner prune**: actual target deletion (Plan 2B stub → full)

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

### Plan 3 — Secret + Diagnostics
- [Plan 3 summary](docs/superpowers/poc/2026-04-22-plan-3-summary.md)

### Plan 4 — CLI Integration
- [Plan 4 summary](docs/superpowers/poc/2026-04-22-plan-4-summary.md)

## Requirements

- Node.js >= 22 (Active LTS)
- TypeScript 6.x
- Zod 4.x / Vitest 4.x

## License

MIT
