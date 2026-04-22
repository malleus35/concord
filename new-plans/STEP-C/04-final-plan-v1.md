# 결정 C — Final Plan **v1** (섹션 7 최종 통합 원칙) [**v2 로 대체됨 — 역사 기록 보존**]

> **⚠️ 문서 지위**: **공식 FINAL 아님. 계보 추적용 역사 기록 보존 (2026-04-21).**
>
> - **작성**: 리뷰 없는 메인 세션 synthesis only (2026-04-21)
> - **대체**: `04-final-plan-v2.md` 가 공식 FINAL 채택 (섹션 8 결정, `05-section8-final-selection.md` 참조)
> - **대체 사유**: §4 "문법 경계" 행이 자신의 Π5/Π7 원칙과 직접 모순 + Π 간 관계 미명시 + Reserved identifier 산발 관리 위험 + Π4/Π6 중복 + Π 증설 방어선 부재 (5 결함)
> - **유지 이유**: 리뷰 없는 작성의 실증 사례. v1 → v2 변경 12 항목 = 리뷰의 가치를 증명하는 대조군. 기존 `01-bundle-plugin.md` / `02-v2-preparation.md` 와 동일한 계보 보존 관행
>
> **공식 FINAL 참조**: **`04-final-plan-v2.md`**

---

## 0. 문서 목적

결정 C 섹션 7 **Phase 1 ↔ Phase 2 경계** 의 최종 통합 원칙. Q1~Q5 + Q2' 6 결정을 관통하는 **top-level invariants (Π1~Π7)** 로 추출하고, Phase 1/2 책임 분할을 명시한다.

**전제**:
- 결정 A FINAL (Skills 배치 Option III-tightened, 2026-04-19)
- 결정 B FINAL (CLI + bootstrap, 2026-04-19)
- 결정 C 섹션 1~6 확정 (β3 재구조, 2026-04-20)
- 결정 C 섹션 7 Q1~Q5 + Q2' 전체 확정 (2026-04-21)

---

## 1. 정체성 정박 (사용자 재선언 2026-04-20)

> **Phase 1 = 설정을 한 번에 Import/sync 하는 툴**
> **Phase 2 = 툴끼리의 공통 workflow/harness 구축 (cross-sync)**

이 정체성 위에 6 결정이 배치됐다. Bundle 같은 중간 추상은 금지 (`feedback_bundle_inflation.md` 계보 교훈).

---

## 2. Q1~Q5 + Q2' 확정 요약 매트릭스

| # | 질문 | 결정 | 핵심 원칙 |
|---|---|---|---|
| **Q1** | Phase 1 lock ↔ Phase 2 IR 결합도 | **Option C 중간 결합 (Cargo 모델)** | 같은 파일 + `lockfile_version` 게이팅 + `phase2_projections:` additive 예약 |
| **Q2** | Phase 1 에서 cross-tool 호환 ceiling 노출 | **Option V 확장형** | 일상 침묵 / doctor 심각 경고 / `--compat` drill-down / `--json` compat 항상 포함 / 전역 flag 거부 |
| **Q4** | `capability_matrix` 표기 | **γ Hybrid + discriminated union** | 내부 β 4 status (`supported`/`detected-not-executed`/`na`/`failed`) + reason enum / 외부 α 기호 렌더링 |
| **Q2'** | 심각 mismatch 3종 (Q4 기반) | (a) 환경 불일치 / (b) Lossy 기호 실재 / (c) Flag gated unmet | `status` 조건 + `reason` enum 으로 정식화 |
| **Q3** | Plugin 해체 (γ Disassemble) Phase 1 존재 형태 | **(a) intact only + invariant + Q2'/Q4 귀결 + parse error 방어선** | I6 Plugin intact 불변식 신설, `include:`/`exclude:`/`allow_disassemble:` parse error |
| **Q5** | Phase 1 → Phase 2 manifest 문법 변화 | **Option P+ (npm + Dart constraint hybrid)** | `concord_version: ">=X"` constraint, additive-only, `manifest_version` 금지 |

---

## 3. Top-Level Invariants — Π1~Π7

Phase 1/2 모두에서 유효한 **최상위 원칙 7개**. 결정 D/E, 구현, Phase 2 RFC 어디서도 깰 수 없음.

### Π1. Phase 1 reproducibility contract — **lock 은 observed state 의 계약**

- **선언**: `concord.lock` 의 contract 는 `bytes_sha256` + `source digest`. `capability_matrix` 는 contract 아닌 유도된 진단 데이터
- **도출**: Q1 P1/P2
- **위반 결과**: silent rewrite 지옥 (OpenTofu 교훈), drift 오판
- **적용 영역**: lock 파일 전체, `integrity-mismatch` event 범위

### Π2. Plugin intact — **concord 는 관측하되 조작하지 않는다**

- **선언**: concord 는 plugin 내부 자산을 `capability_matrix` 로 관측만. 해체·subset 활성·저자 계약 필드 도입 금지
- **도출**: Q3 D2 (섹션 5 불변식 **I6**)
- **위반 결과**: resolver 중복 구현, Phase 2 IR 자유도 저당, bundle inflation 재발
- **적용 영역**: Phase 1 manifest 문법, `include:`/`exclude:`/`allow_disassemble:` 등 문법 parse error
- **Phase 2 전환 시**: 해체가 필요하면 **asset-level canonical IR 로 처리** (Phase 2 에선 plugin 단위 조작이 아니라 자산 단위 재조립). 기존 plugin 필드 의미 재해석 금지

### Π3. Provider-native 존중 — **resolver 중복 구현 금지**

- **선언**: concord 는 provider 런타임의 네이티브 동작 존중. 자체 resolver 를 만들지 않음. 공유는 명시적 opt-in
- **도출**: MEMORY ground rules + 결정 A (A1~A5)
- **위반 결과**: provider 네이티브 동작과 괴리 → 사용자 신뢰 영구 손실
- **적용 영역**: Phase 1 sync/install 전체, Phase 2 cross-sync 의 자산별 adapter 경계

### Π4. Machine contract vs human UX 분리 — **두 레이어는 같이 움직이지 않는다**

- **선언**: Lock 과 `--json` 출력 = machine contract (항상 완전). TTY CLI = human UX (침묵 기본, 조치 가능한 경고만)
- **도출**: Q2 V4, Q4 γ Hybrid
- **위반 결과**: "schema 명확 vs 기호 학습 불필요" 허위대립에 빠져 한쪽만 택하면 다른 쪽 비용 폭발
- **적용 영역**: `concord.lock`, `--json` 출력, TTY 출력, doctor 경고 톤

### Π5. Additive evolution by default — **breaking 은 예방약이 아님**

- **선언**: Phase 1 → Phase 2 진화는 additive 가 default. 새 기능 = 새 섹션/필드. `concord_version: ">=X"` constraint 로 feature gate. Breaking 은 진짜 필요한 순간에만 1회성 전환
- **도출**: Q5 P1~P5
- **위반 결과**: H (Cargo edition) 도입 시 backport 압력 + 문서 2배 + Q3 I6 균열 (YAGNI 위반)
- **적용 영역**: manifest 문법, lock schema, `--json` 출력 schema

### Π6. Lossy 명시의 정직성 — **숨김 ≠ 은폐**

- **선언**: 관측 불가능/실행 불가능 상태는 **기호·status 로 명시**. 데이터를 lock 에 넣었으면 doctor 는 반드시 접근 경로를 제공
- **도출**: 섹션 5 I3 + Q4 4 status + Q2' 심각 3종
- **위반 결과**: Z (완전 침묵) 의 불신 비용 시나리오 (S1 PR 리뷰어 의심 / S2 Codex-only 침묵 실패 / S3 Phase 2 갑툭튀). Homebrew Brewfile.lock 이름-역할 괴리 재현
- **적용 영역**: `capability_matrix` 4 status, reason enum, doctor 발화 정책

### Π7. Explicit boundaries via parse error — **경계는 선언적이어야 한다**

- **선언**: Phase 2+ 전용 문법이 Phase 1 에 나타나면 **parse error**. 에러 메시지에 업그레이드 경로 포함. v1/v2 동일 문자열 유효성 반전 금지
- **도출**: Q3 D4 + Q5 P4
- **위반 결과**: "같은 문자열이 manifest 헤더 한 줄에 따라 유효성 반전" = user mental model 세금, silent ignore 는 I6 파괴
- **적용 영역**: `include:`/`exclude:`/`allow_disassemble:` parse error, 미래 `cross_sync:` 등장 시 concord_version 상향 유도 메시지

---

## 4. Phase 1 / Phase 2 책임 분할표

| 레이어 | Phase 1 책임 | Phase 2 책임 | 경계 원칙 |
|---|---|---|---|
| **Lock 파일** | reproducibility contract (`bytes_sha256` + source digest) | `phase2_projections:` additive 섹션 (asset-level IR preview) | Π1 |
| **Manifest 파일** | 6 자산 타입 + β3 α (3 source types) + `concord_version:` constraint | `cross_sync:` 등 신규 섹션 additive | Π5, Π7 |
| **Plugin 행동** | intact sync (provider-native 위임) | asset-level cross-sync (Adapter/Translate/experimental-compile) | Π2, Π3 |
| **CLI 노출 (TTY)** | 일상 침묵 + doctor 심각 경고 | Phase 2 기능 신규 명령/플래그 | Π4 |
| **CLI 출력 (`--json`)** | 전체 `capability_matrix` + remediation hint 항상 포함 | Phase 2 기능 additive 포함 | Π4, Π5 |
| **상태 표현** | `capability_matrix` 4 status discriminated union | Phase 2 asset-level IR (별도 필드) | Π6 |
| **문법 경계** | `include:`/`exclude:` 등 parse error | 정식 지원 (Phase 2 문법 세트) | Π7 |
| **저자 계약** | manifest 미지 필드 passthrough (lock 에 원본 보존) | Chrome `optional_permissions` 스타일 저자 선언 (RFC 예정) | Π2, Π5 |
| **해체 기능** | 0% (intact only) | asset-level IR 로 재조립, plugin 해체 아님 | Π2 |

---

## 5. 결정 교차 참조 매트릭스

**Q1~Q5 + Q2' 상호 의존 관계**:

```
Q1 (lock 경계)
  ↓ phase2_projections: 필드 정의
  ↓
Q4 (capability_matrix schema)
  ↓ status/reason 표현
  ↓
Q2' (doctor 심각 3종 판정)
  ↑ (판정 조건 = Q4 status)
  ↓
Q2 (CLI 노출 정책)
  ↑ (doctor 발화 = Q2' 조건)
  ↓
Q3 (parse error 방어선)
  ↑ (invariant I6)
  ↓
Q5 (manifest 진화)
  ↑ (parse error 영구 유지 = P4)
```

**강결합 지점**:
- Q4 ↔ Q2': Q4 status schema 변경 시 Q2' 판정 로직 동기 변경 필요
- Q3 ↔ Q5: parse error 유지 ↔ manifest 진화 정책 상호 잠금

**약결합 지점**:
- Q1 ↔ Q5: lock version vs manifest evolution 는 서로 영향 작음 (동력학 다름)
- Q2 ↔ Q3: 둘 다 Q4/Q2' 위에 얹힘

---

## 6. Phase 2 RFC 착수 체크리스트

### ✅ 결정해야 할 것 (Phase 2 RFC 범위)

- Phase 2 **asset-level canonical IR** 구체 schema (skills/MCP/subagents/hooks/commands/instructions 별)
- `cross_sync:` 섹션 manifest 문법 (자산별 strategy: Adapter / Translate / experimental-compile)
- Adapter 구현 전략: skills (agentskills.io 공통), MCP (공식 스펙 변환)
- Translate 전략: subagents (50-65% lossy warning), commands (25-70%)
- experimental-compile 전략: hooks only (10-30% ceiling, opt-in)
- 저자 계약 필드 (Chrome `optional_permissions` 스타일 — Π2 확장)
- `concord_version` bump 기준 및 RFC 프로세스

### ❌ 결정하지 말아야 할 것 (Phase 1 영속 원칙)

- **Π1~Π7 재검토 금지** — Phase 2 에서도 영구 유효
- **I6 Plugin intact 완화 금지** — 설령 Phase 2 에서 해체가 필요해져도 **asset-level IR 로 처리** (plugin 단위 조작 추가 금지)
- **`lockfile_version` 역행 금지** — v1 은 영구 유효
- **`concord_version` constraint 완화 금지** — semver 계약
- **Q4 `status` enum 축소 금지** — `supported`/`detected-not-executed`/`na`/`failed` 4종 고정
- **`capability_matrix` 필드 의미 재해석 금지** (Q5 P1)

---

## 7. 통합 Minority Report (전체)

Q1~Q5 결정별 미결 사항 통합. 각 항목의 해결 시점 명시.

| 항목 | 도출 결정 | 해결 시점 |
|---|---|---|
| `capability_matrix` 필드명 개명 (`compat_snapshot`? `diagnostic_matrix`?) | Q1/Q4 | 섹션 7 v2 또는 구현 단계 |
| `capability_matrix.reason` enum 초기 집합 완결성 | Q4 | Phase 1 POC |
| `partial` status (Claude 26 events 중 Codex 5 호환) 추가 여부 | Q4 | Phase 1 POC (실제 케이스 관찰) |
| `?` (failed) 범위: plugin 전체 vs 셀 단위 | Q4 | 구현 단계 |
| `phase2_projections:` 위치 (nodes 내부 필드 vs 최상위 섹션) | Q1 | Phase 1.5 착수 시 |
| `lockfile_version` bump 정책 (major/minor 기준) | Q1 | POC 중 확정 |
| `concord_version` semver range 문법 (`^`/`~`/`>=` 지원 범위) | Q5 | POC 중 확정 (semver 라이브러리 채택) |
| OpenCode `auto_install` vs `enabled` 의미 분리 검증 | 섹션 3 | Phase 1 POC |
| Codex `marketplace add` CLI 공식 계약 여부 | 섹션 3 | POC-7 (공식 docs 업데이트 감시) |
| Plugin introspection 엔진 정확성 | 섹션 5 | Phase 1 첫 sprint POC |
| `--json` schema 에 `capability_matrix` 필드 이름 고정 | Q2 | POC 중 확정 |
| Phase 2 breaking 전환 기준 (진짜 B 필요 시) | Q5 | Phase 2 RFC |

---

## 8. Phase 1 실구현 체크리스트 (섹션 7 반영)

섹션 1~6 + 섹션 7 합산. TODO.md L118~127 확장:

### 섹션 7 추가 구현 항목

- [ ] **`lockfile_version: 1` 최상위 필드** (Q1)
- [ ] **`phase2_projections:` 섹션 스켈레톤** (Q1 — Phase 1 에선 빈칸)
- [ ] **`capability_matrix` discriminated union validator** (Q4 — zod + JSON Schema SoT)
- [ ] **`reason` enum 관리** (Q4 — 초기 집합 + 확장 policy)
- [ ] **기호 렌더러** (Q4 — 20줄 pure function: `supported`→N, `detected-not-executed`→N*, `na`→-, `failed`→?)
- [ ] **doctor 심각 3종 판정 로직** (Q2' — status 조건 + reason 별 메시지)
- [ ] **`concord_version: ">=X"` constraint 파서 + 버전 체크** (Q5)
- [ ] **parse error 방어선** (Q3 D4, Q5 P4 — `include:`/`exclude:`/`allow_disassemble:` 에러 메시지)
- [ ] **`--json` 출력 schema 정의** (Q2 V4 + Q4 — TTY 침묵과 무관하게 compat 항상 포함)

---

## 9. 다음 단계

### 즉시

- **v2 작성** (Codex + subagent 리뷰 반영) → `04-final-plan-v2.md`
- **섹션 8 착수** — 판단-1~4 재해석 + v2 문서 목차

### 단기

- 결정 D (Windows fallback) 착수
- 결정 E (Secret 보간) 착수

### 중기

- 디자인 문서 작성 (`docs/superpowers/specs/2026-04-19-concord-design.md`)
- 스펙 자체 리뷰 + 사용자 리뷰 게이트 통과
- `writing-plans` 스킬로 구현 계획 전환

---

## 10. 문서 계보

- `01-bundle-plugin.md` — 초안 v1, 기각 (2026-04-20, Codex CLI 가정 붕괴)
- `02-v2-preparation.md` — v2 준비, 대체 (2026-04-20, "Bundle" 범주 인플레이션 판명)
- **`03-plugin-source-model.md` — v3 β3 재구조 FINAL 방향 (섹션 1~6 + 섹션 7 Q1~Q5 + Q2')**
- **`04-final-plan-v1.md` — 본 문서 (리뷰 없는 섹션 7 통합)**
- `04-final-plan-v2.md` — 리뷰 반영 버전 (작성 예정)

---

## 11. 참고 (Π 도출 근거)

- **Π1**: Q1 근거 = Cargo workspace 선례, PEP 751 실패 사례, OpenTofu silent rewrite 경고
- **Π2**: Q3 근거 = 3 생태계 (Claude/Codex/OpenCode/OpenClaw) 저자 계약 필드 미지원 확인 + Homebrew `--with/--without` anti-pattern
- **Π3**: MEMORY ground rules + 결정 A
- **Π4**: Q2 V4 + Q4 = Terraform `show -json` + K8s `.status.conditions` 선례
- **Π5**: Q5 = 10 선례 조사 (npm/Ruby Gemfile P 지지, Cargo H 1건 뿐)
- **Π6**: 섹션 5 I3 + Q4 = Nietzsche 정직성, Homebrew 이름-역할 경고
- **Π7**: Q3 D4 + Q5 P4 = parse error 의 시간축 방어선 원칙

---

**End of v1.**
