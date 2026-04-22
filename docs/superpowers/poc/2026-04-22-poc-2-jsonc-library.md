# POC-2 — JSONC 편집 라이브러리 선정

**Date**: 2026-04-22
**Plan**: Plan 2A Round-trip POC sprint
**Status**: **DECIDED** — `jsonc-morph @ 0.3.3`

## 문제 정의

concord 는 Claude `.claude/settings.json`, OpenCode `opencode.json[c]`, 순수 JSON `~/.claude.json` 등 JSONC / JSON 계열 파일을 round-trip 편집 해야 한다 (spec §10.1, §10.3).
- JSONC: 주석 / trailing comma 보존 필수
- 순수 JSON: `json-key-owned` 방식 (POC-4 확정)

## 후보

| 후보 | version | 특성 | 유지성 |
|---|---|---|---|
| `jsonc-morph` | 0.3.3 | CST 기반, 임의 주석 조작 가능 | Deno 중심, npm 0.x |
| `jsonc-parser` | 3.3.1 | Microsoft VSCode 채택, modify+applyEdits | 업계 표준, 안정적 |

## 벤치마크 시나리오 (8)

`tests/fixtures/round-trip/jsonc/scenarios.json` 참조. 요약:

1. line/block/inline 주석 3 종 보존
2. trailing comma 유지
3. 새 key 추가
4. value 수정 (inline 주석 인접)
5. key 삭제 (인접 주석 보존)
6. marker 블록 내부만 수정
7. 순수 JSON (POC-4 호환)
8. 대용량 (>50KB)

## 결과 matrix

### 판정 기준 (Task 8 교훈 반영)

- **true_pass**: raw `preserved=true` + bytes delta 가 편집 내용 자체에서 기인 (modify op ±5% 이내, add/delete op 는 정당 변화)
- **silent_fail**: raw pass BUT modify op 에서 bytes delta > 20% (format 파괴 의심)
- **warn**: raw pass BUT modify op 에서 bytes delta 5~20% (재포맷 경향)
- **error**: 라이브러리 예외

### 2 × 8 결과 표

| # | 시나리오 | op | jsonc-morph | jsonc-parser |
|---|---|---|---|---|
| 01 | comments | modify | pass (+11B, +4.1%) ✅ | pass (+35B, **+13.1% WARN**) |
| 02 | trailing-comma | modify | pass (+4B, +3.3%) ✅ | pass (+28B, **+23.1% SUSPICIOUS**) |
| 03 | add-key | add | pass (+74B, +58.3% — add OK) ✅ | pass (+100B, +78.7% — add OK) ✅ |
| 04 | modify-value | modify | pass (+0B, 0.0%) ✅ | pass (+24B, **+16.1% WARN**) |
| 05 | delete-key | delete | pass (-156B, delete OK) ✅ | pass (-102B, delete OK) ✅ |
| 06 | marker-block | modify | pass (+4B, +0.9%) ✅ | pass (+28B, **+6.6% WARN**) |
| 07 | pure-json | add | pass (+46B, add OK) ✅ | pass (+46B, add OK) ✅ |
| 08 | large | modify | pass (+1B, 0.0%) ✅ | pass (+1B, 0.0%) ✅ |

> **05-delete-key 비고**: jsonc-morph 176→20 (-156B), jsonc-parser 176→74 (-102B). 두 library 모두 obsolete key 와 함께 해당 key 를 설명하는 인접 주석을 삭제함 (시나리오 의도: "keep" key 보존 — 둘 다 통과).

### 집계 요약

| library | true_pass | warn | silent_fail | error | totalMs |
|---|---|---|---|---|---|
| `jsonc-morph` | **8** | 0 | 0 | 0 | 11.07 ms |
| `jsonc-parser` | 4 | **3** | **1** | 0 | 6.30 ms |

> totalMs: macOS Apple Silicon 실측. 대용량 (08-large, 57KB) 포함.

## 선정 결정

**Winner**: `jsonc-morph` @ `0.3.3`

**근거**:

1. **bytes-level 정밀도 압도적 우위**: modify op 4개에서 jsonc-morph 는 모두 ±5% 이내 (0~4.1%). jsonc-parser 는 동일 시나리오에서 6.6~23.1% 팽창 — trailing-comma (23.1%) 는 silent_fail 기준 초과.

2. **04-modify-value 완벽 inline edit**: 149→149 bytes (0 delta) — inline 주석 바로 옆 값 수정에서 CST 기반 편집이 원자적으로 동작. jsonc-parser 는 같은 수정에 +24 bytes (포맷 재정렬).

3. **06-marker-block 정밀도**: marker 블록 내부 수정에서 +4B (jsonc-morph) vs +28B (jsonc-parser). concord 의 marker-block 보존 핵심 시나리오에서 7× 정밀도 차이.

4. **CST 기반 고급 기능 잠재**: jsonc-morph 는 Concrete Syntax Tree 를 직접 조작하므로 Plan 2B 에서 marker-block 경계 보존, 주석 이동/삽입 등 고급 편집을 구현하기 용이.

5. **8/8 true_pass**: outsideChangesByteCount=0 (preservation 통과) + modify op bytes delta ±5% 이내 — 두 기준 모두 충족. jsonc-parser 는 raw pass 지만 2차 bytes 기준 미충족 시나리오가 4개.

**Plan 2B 에서 사용할 API**:
```typescript
import { parse } from "jsonc-morph";
const root = parse(source);           // CST 파싱
const obj = root.asObjectOrThrow();   // root 객체 접근
obj.getIfObjectOrCreate("key")        // 중첩 경로 traverse
  .append("newKey", value);           // key 추가
obj.get("existingKey")?.setValue(v);  // value 수정
obj.remove("key");                    // key 삭제
const modified = root.toString();     // 직렬화
```

## 탈락 후보의 측정값

### `jsonc-parser` @ 3.3.1

- 통과 (raw): 8 / 8
- true_pass (2차 bytes 기준): 4 / 8
- 주요 실패 이유:
  - `02-trailing-comma`: +28B (+23.1%) — trailing comma 처리 시 배열 전체를 재포맷하는 경향. 원본에서 4B 증가면 충분하나 24B 추가 whitespace 삽입.
  - `04-modify-value`: +24B (+16.1%) — inline 주석 인접 값 수정 시 jsonc-parser 가 해당 라인 전후를 재정렬.
  - `01-comments`: +35B (+13.1%) — comments 시나리오에서도 팽창 발생.
  - `06-marker-block`: +28B (+6.6%) — marker block 내부 수정 시 경계 근처 포맷 팽창.
- 선택되지 않은 이유: Microsoft VSCode 채택이라는 업계 표준 지위에도 불구하고, `modify+applyEdits` API 가 토큰 단위 교체보다 "재정렬 기반" 편집에 가까워 concord 의 format-preserving 요구사항에 부적합. 특히 trailing comma 파일에서 공백 재정규화가 발생해 long-term 으로 파일이 불필요하게 팽창할 위험.

## 재검토 트리거

- jsonc-morph 가 v1.0 GA 도달 시 (현재 0.x pre-1.0) — API 안정성 재평가
- Microsoft 가 jsonc-parser 를 deprecate 하면 (현재는 해당 없음)
- JSON5 같은 다른 확장 문법 지원 필요 시 (별도 POC 필요)
- jsonc-parser 가 "preserve formatting" 모드를 공식 지원하는 버전 출시 시
