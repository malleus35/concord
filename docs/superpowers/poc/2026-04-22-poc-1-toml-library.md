# POC-1 — TOML 편집 라이브러리 선정

**Date**: 2026-04-22
**Plan**: Plan 2A Round-trip POC sprint
**Status**: **PENDING** (Task 8 에서 결정)

## 문제 정의

concord 는 Codex 의 `~/.codex/config.toml` 을 round-trip 편집 해야 한다 (spec §10.2).
Naive `JSON.parse`/`TOML.parse` + `stringify` 는 주석·순서·formatting 을 파괴하여 **사용자 신뢰 영구 손실** 로 이어진다.

format-preserving TOML 편집 라이브러리 3 후보를 실측 벤치마크해 1 개 선정한다.

## 후보

| 후보 | version | 유형 | 최근 활성 |
|---|---|---|---|
| `@decimalturn/toml-patch` | 1.1.1 | pure JS, TOML v1.1 | 2026-04 |
| `@shopify/toml-patch` | 0.3.0 | Rust `toml_edit` wasm | 1 년 stale |
| `@ltd/j-toml` | 1.38.0 | pure JS, "as much as possible" | 활성 |

**탈락 (사전)**:
- `@iarna/toml` — 6 년 방치 + 편집 시 주석 손실
- `smol-toml` — comment 보존 없음

## 벤치마크 시나리오 (10)

`tests/fixtures/round-trip/toml/scenarios.json` 참조. 요약:

1. 신규 entry 추가 — 주석 유지
2. entry value 수정
3. entry 삭제 — 인접 주석 보존
4. array-of-tables 순서 보존
5. inline table 유지
6. multi-line array formatting
7. CRLF 개행 유지
8. UTF-8 BOM 유지
9. 대용량 (>100KB) 성능
10. marker 블록 내부만 수정 (§10.5)

## 결과 matrix

**TBD** — Task 7 benchmark 실행 후 Task 8 에서 채움.

## 선정 결정

**TBD** — Task 8.

## 탈락 후보의 측정값

**TBD** — Task 8.

## 재검토 트리거

- 선정 library 가 v2 로 메이저 업데이트되면서 API 변경 시
- Codex 가 `~/.codex/config.toml` 대신 TOML v1.1 전용 문법을 요구하면
- Rust wasm 래퍼 (`@shopify/toml-patch`) 가 1 년 내 다시 활성화되면 재평가 (Rust 선례의 format preservation 완성도 높음)
