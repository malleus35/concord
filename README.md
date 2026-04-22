# concord

Sync AI harness assets (skills / subagents / hooks / MCP / instructions / plugins) across Claude Code, Codex, and OpenCode.

**Status**: Phase 1 Foundation (Plan 1 / 4). Read-only commands; sync/install in Plan 2+.

## Install

```bash
npm install
npm run build
```

## Usage

```bash
# Validate a manifest
concord validate ./concord.yaml

# Fast lint (Reserved Registry + interpolation allowlist only)
concord lint ./concord.yaml

# List entries from lock file (dry-run)
concord list --lock ./concord.lock
```

## Design docs

- Spec: `docs/superpowers/specs/2026-04-21-concord-design.md`
- Plans: `docs/superpowers/plans/`
- POC log: `docs/poc-log.md`

## POC results (Plan 2A — Round-trip)

- [POC-1 TOML: @decimalturn/toml-patch](docs/superpowers/poc/2026-04-22-poc-1-toml-library.md)
- [POC-2 JSONC: jsonc-morph](docs/superpowers/poc/2026-04-22-poc-2-jsonc-library.md)
- [POC-3 YAML write-back: yaml (eemeli)](docs/superpowers/poc/2026-04-22-poc-3-yaml-write-back.md)
- [POC-9 symlink: symlink-dir (macOS confirmed)](docs/superpowers/poc/2026-04-22-poc-9-symlink.md)
- [Summary](docs/superpowers/poc/2026-04-22-round-trip-summary.md)

## Requirements

- Node.js >= 22 (Active LTS)
- TypeScript 6.x
- Zod 4.x / Vitest 4.x

## License

MIT
