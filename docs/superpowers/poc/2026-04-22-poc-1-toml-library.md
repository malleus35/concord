# POC-1 — TOML 편집 라이브러리 선정

**Date**: 2026-04-22
**Plan**: Plan 2A Round-trip POC sprint
**Status**: **DECIDED** — `@decimalturn/toml-patch @ 1.1.1`

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

### 판정 기준

- **true_pass**: raw pass + bytes delta 가 편집 연산 자체에서 기인 (format 파괴 없음)
- **silent_fail**: raw pass BUT 편집 외 영역의 bytes 대폭 감소 → 내부적으로 전체 재작성 (format 파괴)
- **error**: 라이브러리 예외 발생

bytes delta 해석 원칙:
- `add` op: bytes 증가 = 정당 (새 섹션/필드 추가)
- `delete` op: bytes 감소 = 정당 (섹션 삭제)
- `modify` op: bytes ±5% 초과이고 편집 내용 길이 차이로 설명 불가 → format 파괴 의심

### 10 × 3 결과 표

| # | 시나리오 | op | decimalturn | shopify | ltd-j-toml |
|---|---|---|---|---|---|
| 01 | add-entry | add | ✅ true_pass (+48B, 새 섹션) | ❌ error (nested obj) | ⚠ silent_fail (+, bytes 감소 -6B — add인데 축소) |
| 02 | modify-value | modify | ✅ true_pass (+0B, 0%) | ⚠ silent_fail (-15B, 11.1%) | ⚠ silent_fail (-9B, 6.7%) |
| 03 | delete-entry | delete | ✅ true_pass (-62B, 섹션 삭제) | ✅ true_pass (-83B, 섹션 삭제) | ✅ true_pass (-83B, 섹션 삭제) |
| 04 | array-of-tables | modify | ✅ true_pass (+1B, 0.5%) | ❌ silent_fail (-151B, 82.5%) | ⚠ silent_fail (-29B, 15.8%) |
| 05 | inline-table | modify | ✅ true_pass (+6B, 3.3%) | ✅ true_pass (+6B, 3.3%) | ❌ silent_fail (-48B, 26.4%) |
| 06 | multiline-array | expand | ✅ true_pass (+18B, 요소 추가) | ✅ true_pass (+3B, 2.0%) | ⚠ silent_fail (+13B, 8.6%) |
| 07 | crlf | modify | ✅ true_pass (+6B = 값 길이 차이) | ✅ true_pass (-1B, 0.9%) | ⚠ silent_fail (-7B, 6.2%) |
| 08 | bom | modify | ❌ error (BOM 파싱 불가) | ✅ true_pass (-2B, 4.3%) | ❌ error (BOM 거부) |
| 09 | large (>100KB) | modify | ✅ true_pass (+1B, 0.0%, 204ms) | ✅ true_pass (+1B, 0.0%, 18ms) | ✅ true_pass (-31B, 0.0%, 21ms) |
| 10 | marker-block | modify | ✅ true_pass (+6B, 1.5%) | ✅ true_pass (+6B, 1.5%) | ❌ silent_fail (-170B, 42.1%) |

### 집계 요약

| library | true_pass | silent_fail | error | totalMs |
|---|---|---|---|---|
| `@decimalturn/toml-patch` | **9** | 0 | 1 (BOM) | 224ms |
| `@shopify/toml-patch` | 6 | 2 | **1 (nested obj)** | 24ms |
| `@ltd/j-toml` | 3 | 6 | 1 (BOM) | 24ms |

> **주의**: 위 `totalMs` 는 scenario 09 large.toml 에서 decimalturn 이 204ms 로 약 10× 느림.
> 하지만 large.toml 은 130KB 단일 편집이며, 실제 concord 운영 시나리오는 수 KB 단위. 허용 범위.

## 선정 결정

**Winner: `@decimalturn/toml-patch @ 1.1.1`**

### 선정 근거

1. **critical 3 scenario (add/modify/delete) 모두 true_pass** — concord sync 의 핵심 UX 인 MCP server 추가(scenario 01), 값 수정(02), 삭제(03) 전부 format 보존 완료. 다른 두 후보는 이 중 하나 이상에서 실패.

2. **실질 format-destroy = 0** — bytes delta 가 전부 편집 내용 자체에서 기인함 (새 섹션 추가 시 +48B, 섹션 삭제 시 -62B, 값 길이 변화 +6B). 편집 외 영역은 bit-exact 보존 (`outsideChangesByteCount = 0`).

3. **nested object 완전 지원** — scenario 01 에서 `{ command, args }` 중첩 객체를 정상 처리. shopify 는 이 자체가 미지원으로 error 발생 → concord 의 MCP server entry 구조 (command + args + env) 추가 UX 불가.

4. **inline table 및 marker-block 보존** — scenario 05 (inline table 유지), scenario 10 (marker 블록 외부 bit-exact) 모두 통과. ltd-j-toml 은 두 케이스 모두 format 파괴.

5. **BOM 미지원은 허용 가능한 약점** — `~/.codex/config.toml` 은 실제로 BOM-less UTF-8. BOM 파일은 엣지 케이스이며 concord 는 파일 읽기 시 BOM strip + write 시 BOM-less 로 처리하는 workaround 로 대응 가능.

## 탈락 후보의 측정값

### `@shopify/toml-patch @ 0.3.0` — 탈락

**결정적 약점**: 중첩 객체(nested object) 미지원으로 concord 핵심 use case 불가.

에러 원문 (scenario 01):
```
shopify/toml-patch: nested object value not supported at path [mcp_servers.slack].
Only primitives and primitive arrays are supported.
```

추가 format-destroy:
- scenario 02 (modify-value): 135B → 120B (-15B, 11.1%) — 단순 값 변경인데 주변 format 파괴
- scenario 04 (array-of-tables): 183B → **32B** (-151B, **82.5%**) — 전체 파괴 수준

shopify 는 Rust `toml_edit` 기반으로 이론상 가장 강력하나, wasm 래퍼의 API 제약이 concord 요구사항을 충족하지 못함. 유지보수 stale (1 년) 도 고려 요인.

### `@ltd/j-toml @ 1.38.0` — 탈락

**결정적 약점**: parse → stringify 방식으로 편집 외 영역까지 전체 재작성. format 파괴 다수.

에러 원문 (scenario 08, BOM):
```
TOML content (string) should not start with BOM (U+FEFF) at line 0: undefined
```

주요 silent_fail (format 파괴):
- scenario 01 (add-entry): 새 섹션 추가인데 192B → 186B (-6B) — 추가 연산에서 bytes 감소 = 기존 주석 소실
- scenario 05 (inline-table): 182B → **134B** (-48B, 26.4%) — inline table 이 일반 table 로 전면 재조합
- scenario 10 (marker-block): 404B → **234B** (-170B, 42.1%) — marker 외부 영역 포함 전체 재작성

`computeDiffRegions` 가 "전 영역이 changedRegion" 으로 처리해 `outsideChangesByteCount=0` 반환 → raw pass 판정이지만, 실제 파일은 format 파괴 상태.

## 재검토 트리거

- 선정 library 가 v2 로 메이저 업데이트되면서 API 변경 시
- Codex 가 `~/.codex/config.toml` 대신 TOML v1.1 전용 문법을 요구하면
- Rust wasm 래퍼 (`@shopify/toml-patch`) 가 1 년 내 다시 활성화되면 재평가 (nested object API 추가 시 성능 우위로 재검토)
- `@decimalturn/toml-patch` 의 large.toml 처리 속도 (204ms) 가 실제 운영에서 병목으로 보고되면
