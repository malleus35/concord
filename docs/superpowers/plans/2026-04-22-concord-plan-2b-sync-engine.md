# Concord Plan 2B — Sync Engine Implementation Plan (SKELETON)

> **Status**: SKELETON — Plan 2A 완료 후 `superpowers:writing-plans` 재기동 시 본 skeleton 을 base 로 detailed task breakdown 작성.

> **For agentic workers:** Plan 2B 은 Plan 2A 의 선정 library 에 의존한다. 아래 "Dependency inputs from Plan 2A" 가 전부 확정된 상태에서만 execution 가능.

**Goal (draft):** `concord sync` 가 end-to-end 동작. Fetcher 6종 + Config round-trip writer + Symlink/copy installer + Format transformer 구현.

**Dependency inputs from Plan 2A (2026-04-22 확정):**
- **TOML library**: `@decimalturn/toml-patch @ 1.1.1` (POC-1 winner)
  - Reference: [`docs/superpowers/poc/2026-04-22-poc-1-toml-library.md`](../poc/2026-04-22-poc-1-toml-library.md)
  - 한계: BOM 파일 미지원 (08-bom.toml error). Plan 2B preflight 에서 BOM detection + strip 로 우회
- **JSONC library**: `jsonc-morph @ 0.3.3` (POC-2 winner)
  - Reference: [`docs/superpowers/poc/2026-04-22-poc-2-jsonc-library.md`](../poc/2026-04-22-poc-2-jsonc-library.md)
  - 강점: CST 기반, bytes-level 정밀도 압도 (modify op ±5% 이내)
  - 주의: npm 0.x pre-1.0. 재검토 트리거: v1.0 GA 도달 시
- **YAML write-back**: `yaml @ 2.8.3` (eemeli, Plan 1 확정)
  - Reference: [`docs/superpowers/poc/2026-04-22-poc-3-yaml-write-back.md`](../poc/2026-04-22-poc-3-yaml-write-back.md)
  - 한계: byte-level preservation 불가. Plan 2B 는 **주석 문자열 집합 보존** 기준 + `normalized_hash` drift 판정
  - Known Limitation: inline map `{…}` → multiline block 재직렬화 (02-add-asset 에서 +84.8% bytes delta 관측)
- **Symlink**: `symlink-dir @ 10.0.1` (macOS 확정, Windows deferred)
  - Reference: [`docs/superpowers/poc/2026-04-22-poc-9-symlink.md`](../poc/2026-04-22-poc-9-symlink.md)
  - Wrapper: `src/round-trip/symlink/symlink-dir.ts` (createDirSymlink + atomicReplaceSymlink)
  - Plan 2B 첫 task: Windows CI matrix 추가 (`windows-latest` + `macos-latest` + `ubuntu-latest`)

**Shared infrastructure (Plan 2A 산출물, 재사용):**
- `src/round-trip/types.ts` — `ConfigFileEditor` / `Edit` / `PreservationReport` / `ManagedBlock` 타입
- `src/round-trip/preservation.ts` — `verifyPreservation` byte-level diff 유틸
- `src/round-trip/diff-regions.ts` — `computeDiffRegions` (prefix/suffix 공통 찾기)
- `src/round-trip/<format>/<winner>.ts` — 각 포맷 winner wrapper
- `tests/fixtures/round-trip/` — TOML 10 + JSONC 8 + YAML 6 + Symlink sample
- `tests/round-trip/<format>/preservation.test.ts` — 각 winner 별 CI regression gate

## Planned components (Plan 2B)

### 1. Fetcher adapters (6 종) — spec §3, §6 sync

- `GitFetcher` — git clone / ref checkout
- `FileFetcher` — local file / symlink
- `HttpFetcher` — URL + sha256 pin
- `NpmFetcher` — npm install + symlink
- `ExternalFetcher` — provider-native (e.g. `claude-code plugin install`)
- `AdoptedFetcher` — 기존 디스크 상태 catalog 화

### 2. Config round-trip writers — spec §10, Plan 2A 선정 library 기반

- `JsoncWriter` — `jsonc-morph` 기반. Claude `.claude/settings.json`, OpenCode `opencode.json[c]`, `.mcp.json`
- `TomlWriter` — `@decimalturn/toml-patch` 기반. Codex `~/.codex/config.toml`
- `JsonKeyOwnedWriter` — `~/.claude.json` (pure JSON, POC-4 확정 방식) — jsonc-morph 로 key 단위 편집 + lock 에 owned_keys 기록
- `YamlWriter` — `eemeli/yaml` 기반. concord.yaml 편집 (주석 문자열 집합 보존)
- Marker block I/O — spec §10.5. jsonc-morph / toml-patch 양쪽 지원

### 3. Installer — spec §9, Plan 2A POC-9 기반

- `SymlinkInstaller` — `symlink-dir` + atomic staging (`src/round-trip/symlink/` 재사용)
- `CopyInstaller` — `fs-extra.copy` + `write-file-atomic`
- `HardlinkInstaller` — Windows fallback (symlink-dir 가 자동 처리)

### 4. Format transformer — spec §9.14 D-14

- MCP `cmd /c npx` Windows 자동 wrap
- `.claude/skills/` copy 강제 / `.claude/rules/` symlink 허용
- OpenCode `instructions` overlay

### 5. Sync orchestration

- Plan → lock 작성 → fetch → install → config round-trip → verify
- Atomic rollback on failure (spec §7 state machine)
- `concord sync --scope` precedence (Plan 1 Task 19 scope merge 재사용)

## Task decomposition (TBD — writing-plans 재기동 시 채움)

- [ ] Task 1~N: Fetcher adapters (6 종)
- [ ] Task N+1~M: Config round-trip writers (JSONC / TOML / JSON / YAML)
- [ ] Task M+1~P: Installer (Symlink / Copy / Hardlink)
- [ ] Task P+1~Q: Format transformer (Windows wrap / skills copy vs rules symlink)
- [ ] Task Q+1~R: `concord sync` orchestration
- [ ] Task R+1~S: E2E integration tests

**Estimated size**: Plan 1 (28 task, 4200 lines) 와 비슷하거나 조금 큰 규모 예상 (30~35 task).

## Notes

- Plan 2A 의 `ConfigFileEditor` 인터페이스를 그대로 사용
- Plan 2A 의 `verifyPreservation` / `computeDiffRegions` 유틸 재사용
- Plan 2A 가 설치한 3 TOML / 2 JSONC 중 **탈락 library 는 Plan 2A Task 18 에서 이미 제거됨** — Plan 2B 은 winner 만 dependency
- Windows CI matrix 는 Plan 2B 첫 task 에서 추가 (GitHub Actions `windows-latest` + `macos-latest` + `ubuntu-latest`)
- Secret 보간 (E-1~E-19) 은 Plan 3 에서. Plan 2B 는 보간 없이도 동작하는 asset 만 처리
- Task 8 교훈 반영: raw `preserved=true` 만 신뢰하지 말고 **bytes delta** 를 2차 기준으로 사용 (Plan 2A 의 "silent_fail" 개념)

## POC 한계 요약 (Plan 2B 가 우회해야 할 것)

| POC | 한계 | Plan 2B 대응 |
|---|---|---|
| POC-1 TOML | `@decimalturn` BOM 파일 parse 실패 | preflight 에서 BOM detection + strip |
| POC-2 JSONC | jsonc-morph 는 npm 0.x pre-1.0 | monitor v1.0 release |
| POC-3 YAML | byte-level 불가, inline→multiline 재직렬화 가능 | 주석 문자열 set 보존 + normalized_hash drift |
| POC-9 Symlink | Windows 경로 미검증 | CI matrix 추가 |

## 재검토 트리거 (Plan 2B 시작 전)

- `jsonc-morph` v1.0 GA → Plan 2B 에서 major version 가정 재검토
- Windows CI 에서 `symlink-dir` junction fallback 이 기대대로 동작하지 않으면 `fs-extra.ensureSymlink` 또는 수동 분기 대안
- Codex 가 `~/.codex/config.toml` 의 TOML v1.1 문법을 요구하면 `@decimalturn/toml-patch` 의 v1.1 지원 재확인
