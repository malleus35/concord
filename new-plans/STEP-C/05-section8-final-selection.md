# 결정 C — 섹션 8: Final Plan v1 vs v2 비교 + 공식 FINAL 채택

> **문서 지위**: 결정 C 섹션 8 (2026-04-21). 섹션 7 최종 통합 원칙 2개 버전 (`04-final-plan-v1.md` / `04-final-plan-v2.md`) 중 공식 FINAL 채택 결정.

---

## 0. 배경

섹션 7 Q1~Q5 전체 확정 후, 사용자 지시로 **두 버전 병렬 작성**:
- `04-final-plan-v1.md` — 리뷰 없는 메인 세션 synthesis only
- `04-final-plan-v2.md` — Codex + 독립 판단 subagent 2개 리뷰 반영

섹션 8 에서 **어느 버전을 결정 C 공식 FINAL 로 채택할지** 결정한다.

원래 섹션 8 계획 ("판단-1~4 재해석 + v2 문서 목차") 은 β3 재구조 (2026-04-20) 로 대부분 무의미화되었으므로, 섹션 8 을 **Final Plan 채택 결정** 으로 재정의.

---

## 1. v1 vs v2 상세 비교표

| 축 | v1 | v2 | 우위 |
|---|---|---|---|
| **분량** | ~350 줄, 11 섹션 | ~500 줄, 12 섹션 + §A 부록 | v1 (간결) |
| **§4 문법 경계** | "Phase 2 에서 정식 지원" | "Phase 2 에서도 parse error, 대체는 신규 섹션" | **v2** (v1 의 Q5 P4 **직접 모순** 해결) |
| **§4 저자 계약 passthrough** | 범위/저장 위치 불명확 | Reserved vs Unknown 2행 분리, `nodes.<key>.declared:` 원문 보존 명시 | **v2** |
| **Π 간 관계 (§3.8)** | 없음 | 5 관계 명시 + 3 충돌 시나리오 검증 | **v2** |
| **§6 "결정하지 말아야 할 것"** | 6 항목 (혼재) | 8 항목 독립 분리 + RFC 게이트 (4 요건) | **v2** |
| **Π 중복 감사** | Π4/Π6 중복 체감 | Π6 = Π4 corollary 재정위 | **v2** |
| **Π5 운용 룰** | "additive" 선언만 | 3줄 연산 정의 + consumer permissive 계약 | **v2** |
| **Reserved 중앙 집합 (§A)** | 없음 (산발 언급) | 부록 신설: 현재 4개 + 추가 프로세스 + 에러 템플릿 | **v2** |
| **교차 참조 매트릭스 (§5)** | 선형 그래프 | 강결합 3건 (Q4↔Q2', Q3↔Q5, **Q4↔Q3 추가**), 약결합 2건 분리 | **v2** |
| **Π 증설 금지 원칙** | 없음 | §1 신설 (bundle inflation 재발 방지) | **v2** |
| **Minority Report 항목 수** | 12 | 15 (concord_version 경고·fail-closed / list --json 대칭성 / provider hook disable 차이 추가) | **v2** |
| **실구현 체크리스트 항목 수** | 9 | 16 (passthrough 구현 / Reserved registry 모듈화 / introspection 정확성 테스트 / 이름-역할 괴리 테스트 추가) | **v2** |
| **검증 기반** | 메인 세션 synthesis only | Codex + 독립 판단 subagent 2개 리뷰 반영 | **v2** |
| **가독성** | 간결, 핵심 명확 | 분량 증가, 관료적 표현 증가 | v1 |
| **운용성 (Phase 2 RFC 시)** | 분쟁 씨앗 多 (모순, 미명시 관계) | 방어선 명확 | **v2** |

**축별 우위 집계**: v1 = 2 (분량/가독성) / **v2 = 13**

---

## 2. 결정적 근거 — v1 공식 채택 불가

### 2.1 §4 "문법 경계" 행의 직접 모순 (v1)

v1 §4 표의 한 행:

> "문법 경계 | Phase 1: `include:`/`exclude:` parse error | Phase 2: **허용 (정식 지원)**"

이는 v1 자신의 Π 원칙들과 **정면 충돌**:

- **v1 §3 Π7 (Q3 D4 기반)**: *"v1/v2 동일 문자열 유효성 반전 금지"*
- **v1 §3 Π5 (Q5 P4 기반)**: *"parse error 영구 유지, v1/v2 반전 없음"*

→ v1 의 §4 표가 §3 Π5/Π7 선언과 **직접 모순**. 이는 작은 편집 오류가 아니라 **설계 서사 중심축의 충돌**.

**Codex 리뷰 지적**:
> "§4 `저자 계약` 행을 'generic unknown passthrough / reserved future fields(`include`,`exclude`,`allow_disassemble`) parse error' 로 분해 필요"

**독립 판단 리뷰 지적**:
> "Q5 P4 는 '영구 parse error' 로 못 박는데, §4 '문법 경계' 행은 'Phase 2 에서 정식 지원' 이라 쓴다. **직접 모순**. 정답은 P4 (영구) 일 것인데, §4 표 문구 정정 필요: 'Phase 2 에서도 parse error, 대체 문법은 `cross_sync:` 등 신규 섹션'."

v2 는 이 모순을 제거:
> "문법 경계 — Reserved | Phase 1/2 공통 **parse error**: `include:`/`exclude:`/`allow_disassemble:` | Phase 2 는 **신규 섹션** (`cross_sync:` 등) 에서 기능 제공. 기존 Reserved 문자열은 **Phase 2 에서도 영구 parse error**"

v1 을 공식 FINAL 로 채택하면 Phase 2 RFC 작성자가 곧바로 "어느 게 맞지?" 질문할 지점. **v1 은 공식 FINAL 로 부적합**.

### 2.2 Π 간 관계/충돌 미명시 (v1)

v1 은 Π1~Π7 을 선언만 하고 상호 관계를 명시하지 않음. Phase 2 RFC 에서 충돌 시나리오 발생 시 해석 분쟁:

- **Π2 (intact) vs Π6 (Lossy 명시)**: plugin 내부 실패 자산 처리 시 "조작 금지" vs "명시하라" 긴장
- **Π4 (machine/human 분리) vs Π5 (additive)**: `--json` schema 의 additive 가 TTY 에 spill?
- **Π5 (additive) vs Π7 (parse error)**: 새 필드를 additive 로 추가했는데 구 버전에서 parse error 시킬 경우?

**독립 판단 리뷰 지적**:
> "v1 의 결함: 우선순위 표가 없다. 세 가지 충돌 시나리오는 실제로 모두 '겉으로만 충돌' 이지만, v1 이 그걸 증명하지 않는다."

v2 §3.8 "Π 간 관계 / 충돌 해소" 절이 이를 해결:
- Π4 ⊇ Π6 (포섭)
- Π2 ⊥ Π6 (범위 분리)
- Π5 ↔ Π7 (경계 결합, `concord_version`)
- 3 충돌 시나리오 모두 "겉으로만 충돌" 임을 증명

### 2.3 Reserved identifier 산발 관리 위험 (v1)

v1 은 `include:`/`exclude:`/`allow_disassemble:` 를 Q3/Q5 본문에서 산발적으로 언급. 구현자가 **중앙 집합** 없이 관리하면 누락 위험.

**독립 판단 리뷰 지적**:
> "Π7 (parse error) 은 구체적 **어떤 문자열이 reserved** 인지 enum 이 없다. Q3 에 3개 + Q5 에 예약 후보 있지만 **중앙 집합이 없어** 구현자가 산발적으로 관리하게 될 위험. **Reserved identifier registry** 1개 표로 Π7 하단에 부록 추가 권장."

v2 §A "Reserved Identifier Registry" 부록이 이를 해결:
- 현재 4개 중앙 집합
- 추가 프로세스 (RFC 요건)
- 에러 메시지 템플릿

### 2.4 Π4/Π6 중복 체감 (v1)

**독립 판단 리뷰 지적**:
> "Π4 (machine vs human) 와 Π6 (Lossy 명시) 은 같은 전제를 다른 각도에서 진술. Π4 의 human layer 에서 '조치 가능한 경고만' 과 Π6 의 '숨김 ≠ 은폐' 는 같은 문장이다."

v2 는 Π6 = Π4 corollary 로 재정위. 선언은 7개 유지하되 **체감 원칙은 6개 (Π1~Π5 + Π7, Π6 은 Π4 하위 규칙)** 로 명확화.

### 2.5 Π 증설 방어선 부재 (v1)

**독립 판단 리뷰 지적**:
> "Π 자체가 새로운 인플레이션 대상이 될 수 있다는 자각이 약함. Π8~Π12 가 Phase 2 RFC 에서 줄줄이 추가될 유혹에 대한 방어선 (§6 의 'RFC 절차') 이 필요한 이유도 여기."

v2 §1 에 "Π 증설 금지 원칙" 추가:
> "새 invariant 후보가 떠오르면 먼저 **기존 Π 의 corollary 로 표현 가능한지** 검증. Π 자체가 bundle inflation 대상이 되는 위험 방지."

---

## 3. v1 의 가치 (유지 이유)

v1 을 **삭제하지 않고 역사 기록으로 보존**하는 이유:

### 3.1 의사결정 트레일 증거

v1 은 **"리뷰 없이 작성하면 어떤 문제가 생기는가"** 의 실증 사례. 삭제하면 리뷰의 가치를 증명할 대조군이 사라진다.

### 3.2 리뷰 가치의 구체적 증명

v1 → v2 변경 12 항목은 "리뷰가 실제로 잡아낸 결함의 카탈로그". 미래 유사 결정 시 **"처음부터 리뷰 포함이 이득"** 판단 근거.

### 3.3 기존 계보 보존 관행과 일치

`01-bundle-plugin.md` / `02-v2-preparation.md` 도 기각됐지만 **계보 추적용 역사 기록** 으로 보존 중. `04-final-plan-v1.md` 도 동일 관행 적용.

---

## 4. 공식 채택 결정

### 4.1 결정

**`04-final-plan-v2.md` 를 결정 C 섹션 7 공식 FINAL 로 채택한다.**

### 4.2 근거 3줄

1. v1 의 §4 "문법 경계" 행이 자신의 Π5/Π7 과 직접 모순 — 공식 FINAL 로 부적합
2. v2 는 2 리뷰 반영으로 12 지점 보강 (Π 관계 명시, Reserved registry, RFC 게이트 등)
3. 축별 우위 집계 v2 = 13 / v1 = 2 (가독성 + 분량)

### 4.3 v1 의 지위 변경

- v1 → **"v2 로 대체됨 (2026-04-21). 역사 기록 보존"** 라벨
- 헤더에 "공식 FINAL 아님, 계보 추적용 보존" 명시
- 기존 `01-bundle-plugin.md` / `02-v2-preparation.md` 와 동일 분류

### 4.4 v2 의 지위 변경

- v2 → **"결정 C 섹션 7 공식 FINAL (2026-04-21)"** 라벨
- 헤더에 공식 채택 명시
- MEMORY.md / TODO.md 의 결정 C 참조를 v2 로 고정

---

## 5. 문서 체계 정리 (결정 C 계보)

| 파일 | 지위 | 역할 |
|---|---|---|
| `01-bundle-plugin.md` | 기각 (2026-04-20) | Codex CLI 가정 붕괴, C-2 coexistence 오류, C-4 URI 평탄화 |
| `02-v2-preparation.md` | 대체 (2026-04-20) | "Bundle ↔ Plugin 경계" 프레임이 계보학적 재조사에서 가짜 경계 판명 |
| `03-plugin-source-model.md` | **Q1~Q5 근거 문서** | β3 재구조 v3, 섹션 1~6 + 섹션 7 Q1~Q5 + Q2' 확정 근거. **v2 의 참조 기반** |
| `04-final-plan-v1.md` | **역사 기록** | 리뷰 없는 버전. v2 의 대조군, 리뷰 가치 증명용 |
| **`04-final-plan-v2.md`** | **★ 공식 FINAL (2026-04-21) ★** | 섹션 7 최종 통합 원칙, Π1~Π7, 책임 분할표, Phase 2 RFC 방어선 |
| **`05-section8-final-selection.md`** | **본 문서** | 섹션 8, v1/v2 비교 + 공식 채택 결정 |

---

## 6. 향후 참조 규칙

### 6.1 외부 문서에서 결정 C 를 참조할 때

- **공식 FINAL 결정 = `04-final-plan-v2.md`**
- 근거 상세 = `03-plugin-source-model.md`
- 계보 = `01` ~ `05` 전체

### 6.2 Phase 2 RFC 작성 시

- **출발점**: `04-final-plan-v2.md` §6 체크리스트
- **방어선**: v2 §6 "결정하지 말아야 할 것" 8 항목
- **참조 불변식**: v2 §3 Π1~Π7 + §3.8 Π 간 관계

### 6.3 구현 착수 시

- **체크리스트**: v2 §8 Phase 1 실구현 항목 16개
- **Minority**: v2 §7 미결 15 항목 (POC 단계 해결)

---

## 7. 다음 단계

섹션 7 + 섹션 8 완료로 **결정 C 전체 FINAL** 도달. 다음:

### 즉시

- **결정 D 착수** — Windows fallback (symlink → copy), shell 전환, Codex hooks Windows 미지원
- **결정 E 착수** — Secret 보간 문법 (`{env:X}`, `{file:X}` OpenCode 차용)

### 단기

- 디자인 문서 작성 (`docs/superpowers/specs/2026-04-19-concord-design.md`)
- 스펙 자체 리뷰 + 사용자 리뷰 게이트

### 중기

- `writing-plans` 스킬로 구현 계획 전환
- TDD 구현 착수

---

**End of section 8.**
