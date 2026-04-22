# POC-3 — YAML Write-back (eemeli/yaml)

**Date**: 2026-04-22
**Plan**: Plan 2A
**Status**: **CONFIRMED** (Plan 1 read-only 확정 + Plan 2A write-back 한계 명시)

## 문제 정의

Plan 1 은 `yaml` (eemeli) 을 read-only 로 채택 (POC-3 초안, Plan 1 Task 17).
Plan 2 의 `concord import` / `concord replace` 는 `concord.yaml` 을 write-back 해야 한다.
eemeli/yaml 의 Document API 가 CST 레벨 편집 시 **주석 / 들여쓰기 / 순서** 를 어디까지 보존하는지 확인.

## 후보

- `yaml` @ 2.8.3 (eemeli) — Plan 1 채택 확정. Plan 2A 에서 write-back 범위 확장.
- 대안 없음 (`js-yaml` 은 comment 보존 없음)

## 벤치마크 시나리오 (6)

1. 01-comments: 주석 + 들여쓰기 유지 — 기존 asset value 수정
2. 02-add-asset: 새 asset 추가
3. 03-modify-value: 단일 value 변경 — 인접 주석 유지
4. 04-delete-asset: asset 삭제 — keep 유지
5. 05-nested-indent: 깊은 중첩 들여쓰기 보존
6. 06-multiline-string: multi-line string literal (|) 유지

## 결과

### 합격 기준 (POC-1/2 와 다른 약화 기준)

- **byte-level preservation** 은 **불가능** (YAML 은 in-memory AST 편집 → stringify 이므로)
- **주석 문자열 집합 보존** 으로 대체: 원본의 모든 주석 문자열이 수정본에 그대로 존재
- **bytes delta** 는 참고용 (편집 내용 자체의 변화 + AST re-serialization 효과 혼합)

### 측정 결과

**Task 14 benchmark 실측값** (benchmark-3.json 참조):

| # | 시나리오 | bytePreserved | commentsPreserved | original comments | modified comments | bytes delta | elapsed |
|---|---|---|---|---|---|---|---|
| 01 | comments | true | true | 5 | 5 | +0.7% | 6.92ms |
| 02 | add-asset | true | true | 0 | 0 | +84.8% | 0.98ms |
| 03 | modify-value | true | true | 1 | 1 | -0.6% | 0.55ms |
| 04 | delete-asset | true | true | 0 | 0 | -42.7% | 0.78ms |
| 05 | nested-indent | true | true | 0 | 0 | +11.8% | 0.67ms |
| 06 | multiline-string | true | true | 0 | 0 | 0.0% | 0.80ms |

### 합격 판정

- **commentsPreserved**: 6/6 (100%)
- **bytePreserved (outsideChangesByteCount === 0)**: 6/6 — 변경 범위 밖 바이트는 모두 보존
- **bytes delta 해석**:
  - 시나리오 02 (add-asset): **+84.8%** — eemeli/yaml 이 새 항목을 inline `{…}` 대신 multiline block 으로 re-serialize. **Known limitation** — 신규 asset 추가 시 형식이 확대됨.
  - 시나리오 04 (delete-asset): **-42.7%** — 삭제 자체 효과 (정상).
  - 시나리오 05 (nested-indent): **+11.8%** — nested object 편집 시 re-serialization 으로 들여쓰기 확장.
  - 나머지 3건: **±1% 이내** — 단순 scalar 수정은 거의 무변화.
- 결론: **주석 문자열 집합 보존 합격**. Byte-level delta 는 편집 종류에 따라 크게 차이나므로 drift 판정은 `normalized_hash` 로만 수행.

## 알려진 한계 (Known Limitations)

1. **신규 항목 추가 시 inline → multiline 자동 변환**: eemeli/yaml 은 object value 를 `setIn` 으로 추가할 때 multiline block 형식으로 직렬화 (+84.8% 관측). 사용자 스타일이 `{ ... }` inline 이면 형식이 달라짐.
2. **outsideChangesByteCount 기반 bytePreserved 는 6/6 true** — 그러나 이는 단일 diff-region 알고리즘 (prefix/suffix 기준) 의 결과이며, 실제 re-serialization 이 원본과 동일한 포맷을 보장하지는 않음.
3. **주석 없는 시나리오 (02, 04, 05, 06)**: commentsPreserved=true 이지만 원본 comment 가 0개이므로 trivially true. 주석이 많은 대형 `concord.yaml` 에서는 01 시나리오 패턴이 지배적이 됨.

## Plan 2B 에서의 적용 지침

1. `concord.yaml` 편집은 eemeli/yaml `Document` API 사용 (`parseDocument` + `setIn` / `deleteIn` + `toString`).
2. Byte-level preservation 보장 불가 → `raw_hash` 가 달라도 `normalized_hash` 로 drift 판정 (spec §10.4).
3. 주석 문자열 집합 보존이 합격 기준. Failure mode: 대량 asset 삭제 후 주석 일부 이동 → 경고 후 진행.
4. Marker block 전략 은 YAML 에 적용하지 않음 (concord.yaml 은 concord 소유 파일 전체).
5. **신규 항목 inline 형식 보존**: `setIn` 으로 object 추가 시 inline 형식이 필요하면 YAML `Pair` / `FlowMap` 을 직접 생성해야 함 — Plan 2B scope 에서 결정.
6. **PRESERVED_COMMENT_SET invariant**: test suite 에서 "원본 주석 집합 ⊆ 수정본 주석 집합" 으로 검증 (`tests/round-trip/yaml/write-back.test.ts` 패턴).

## 재검토 트리거

- eemeli/yaml 이 v3 major release 시 API breaking change 확인
- 사용자 피드백에서 주석 유실 사례 누적 시 AST 직접 조작 (Pair / Scalar 레벨) 로 격상 검토
- `concord.yaml` 이 매우 커지면 (> 1000 lines) AST re-serialization 의 성능/형식 영향 재측정
- 신규 항목 inline 형식 요구사항이 명시되면 `FlowMap` 직접 생성 방식 도입
