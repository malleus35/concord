# Plan 2A Round-trip POC Summary

**Date**: 2026-04-22
**Branch**: `feat/concord-plan-2a-round-trip-poc`
**Status**: **COMPLETE**

## 4 POC 결과

| # | 주제 | Winner | 상태 |
|---|---|---|---|
| POC-1 | TOML 편집 | `@decimalturn/toml-patch @ 1.1.1` | PASS (9 true_pass / 1 error BOM) |
| POC-2 | JSONC 편집 | `jsonc-morph @ 0.3.3` | PASS (8/8 true_pass, bytes 정밀도 압승) |
| POC-3 | YAML write-back | `yaml @ 2.8.3` (eemeli) | CONFIRMED (6/6 comments preserved, byte-level 불가) |
| POC-9 | symlink-dir | `symlink-dir @ 10.0.1` | macOS 5/5 PASS / Windows DEFERRED |

## Plan 2A 의 주요 산출물

### Code
1. **`src/round-trip/types.ts`** — `ConfigFileEditor` 인터페이스 (spec §10 근거)
2. **`src/round-trip/preservation.ts`** — `verifyPreservation` byte-level diff 유틸
3. **`src/round-trip/diff-regions.ts`** — `computeDiffRegions` (prefix/suffix 공통 찾기)
4. **`src/round-trip/toml/decimalturn.ts`** — TOML winner wrapper
5. **`src/round-trip/jsonc/jsonc-morph.ts`** — JSONC winner wrapper
6. **`src/round-trip/yaml/eemeli.ts`** — YAML write-back wrapper
7. **`src/round-trip/symlink/symlink-dir.ts`** — symlink wrapper (`createDirSymlink` + `atomicReplaceSymlink`)

### Fixtures
- `tests/fixtures/round-trip/toml/` — 10 fixtures (주석 / trailing comma / array-of-tables / inline table / multi-line / CRLF / BOM / >100KB / marker block) + scenarios.json
- `tests/fixtures/round-trip/jsonc/` — 8 fixtures (line/block/inline comments / trailing comma / marker block / pure JSON / large) + scenarios.json
- `tests/fixtures/round-trip/yaml/` — 6 fixtures (주석 / add / modify / delete / nested indent / multiline string) + scenarios.json
- `tests/fixtures/round-trip/symlink/sample-source/` — a.md / b.md / nested/c.md

### Documents
- `docs/superpowers/poc/2026-04-22-poc-1-toml-library.md` — POC-1 결정 메모
- `docs/superpowers/poc/2026-04-22-poc-2-jsonc-library.md` — POC-2 결정 메모
- `docs/superpowers/poc/2026-04-22-poc-3-yaml-write-back.md` — POC-3 결정 메모
- `docs/superpowers/poc/2026-04-22-poc-9-symlink.md` — POC-9 결정 메모
- `docs/superpowers/poc/README.md` — POC 인덱스
- `docs/superpowers/plans/2026-04-22-concord-plan-2b-sync-engine.md` — Plan 2B seed skeleton

## Plan 2B 를 위한 입력

- TOML: `@decimalturn/toml-patch` API → `patch(source, path, value)` + `parse/stringify`
- JSONC: `jsonc-morph` API → `parse(source).asObjectOrThrow().getIfObjectOrCreate(key).append/setValue/remove` chained traversal + `root.toString()`
- YAML: eemeli `parseDocument + setIn/deleteIn + toString` — byte-level preservation 불가, normalized_hash 로 drift 판정
- Symlink: `createDirSymlink(src, target)` + `atomicReplaceSymlink(src, target, staging)` — Windows CI 추가 필요

## Known Limitations (Plan 2B 에서 우회)

| POC | 한계 | Plan 2B 대응 |
|---|---|---|
| POC-1 | `@decimalturn/toml-patch` BOM 파일 parse 실패 | preflight 에서 BOM detection + strip |
| POC-2 | jsonc-morph 는 npm 0.x pre-1.0 | v1.0 GA 모니터 |
| POC-3 | inline→multiline 재직렬화 (02-add-asset +84.8% bytes) | normalized_hash drift 판정 + 주석 문자열 보존 검증 |
| POC-9 | Windows symlink junction 미검증 | GitHub Actions `windows-latest` CI matrix |

## 누적 테스트

- Plan 1: 169 tests
- Plan 2A cumulative peak: 258 passed + 1 skipped
- Plan 2A after cleanup: **246 passed + 1 skipped** (탈락 library stub/edit test 제거분 차감)

## Self-reflection

**Task 8 의 교훈 (verifyPreservation 의 false positive)**:
- `outsideChangesByteCount === 0` 만 신뢰하지 말고 **bytes delta** (±20% JSONC / ±5% TOML) 를 2차 기준으로 사용
- 이 교훈을 Plan 2B Decision memo / drift 판정 로직에 반영

**Task 3 의 verifyPreservation 한계**:
- 복수 region + 길이 변경이 동시에 발생하면 modCursor 누적 오차 발생 (JSDoc 로 명시)
- Plan 2B 에서 marker 블록 단위로 재설계 예정
