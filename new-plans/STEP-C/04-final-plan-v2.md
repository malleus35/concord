# 결정 C — Final Plan **v2** (섹션 7 최종 통합 원칙) [★ **공식 FINAL** ★]

> **★ 문서 지위**: **결정 C 섹션 7 공식 FINAL (2026-04-21 채택).**
>
> - **작성**: Codex + 독립 판단 subagent 리뷰 반영 버전 (2026-04-21)
> - **채택 결정**: 섹션 8 에서 v1/v2 비교 후 공식 채택 (`05-section8-final-selection.md` 참조)
> - **채택 근거**:
>   1. v1 의 §4 "문법 경계" 행이 자신의 Π5/Π7 과 직접 모순 → v2 에서 수정
>   2. Codex + 독립 판단 2 리뷰 반영으로 12 지점 보강 (§3.8 Π 간 관계, §A Reserved registry, §6 RFC 게이트 등)
>   3. 축별 우위 집계 v2 = 13 / v1 = 2
> - **대조군**: `04-final-plan-v1.md` (리뷰 없는 버전, 계보 추적용 역사 기록 보존)
>
> **참조 규칙**:
> - Phase 2 RFC 출발점 = 본 문서 §6 체크리스트
> - 방어선 = §6 "결정하지 말아야 할 것" 8 항목
> - 불변식 = §3 Π1~Π7 + §3.8 Π 간 관계
> - 구현 체크리스트 = §8 Phase 1 실구현 16 항목
> - Minority = §7 미결 15 항목

---

## 0. 문서 목적

결정 C 섹션 7 **Phase 1 ↔ Phase 2 경계** 의 최종 통합 원칙. Q1~Q5 + Q2' 6 결정을 관통하는 **top-level invariants (Π1~Π7)** + Π 간 관계 + 방어선 + Reserved registry 로 구성.

**v1 대비 v2 주요 변경**:
- §4 문법 경계 행 **Q5 P4 모순 제거** (리뷰 공통 지적)
- §4 passthrough 범위 명시 + 저장 위치 (generic unknown / reserved field 구분)
- **§3.8 "Π 간 관계 / 충돌 해소" 절 신설**
- §6 방어성 강화 (RFC 절차 + 독립 금지 항목 + Phase 2 IR 해체 대체 선언)
- **§A "Reserved Identifier Registry" 부록 신설**
- Π5 "additive" 3 줄 연산 룰 추가
- §5 교차 참조에 Q4↔Q3, Q5↔Q3 직접 결합 추가
- §7 Minority / §8 체크리스트 보강

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

**Π 증설 금지 원칙 (v2 신설)**: 새 invariant 후보가 떠오르면 먼저 **기존 Π 의 corollary 로 표현 가능한지** 검증. Π 자체가 bundle inflation 대상이 되는 위험 방지.

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

- **선언**: concord 는 plugin 내부 자산을 `capability_matrix` 로 **관측만**. 해체·subset 활성·저자 계약 필드 도입 금지
- **하위 원칙 (v2 보강)**: **"기록은 허용, 의미 부여는 금지"** — 저자가 미래 필드를 manifest 에 넣더라도 concord 는 lock `nodes.<key>.declared:` 원문에 **passthrough 보존** 할 뿐 런타임 해석 0%
- **도출**: Q3 D2 (섹션 5 불변식 **I6**)
- **위반 결과**: resolver 중복 구현, Phase 2 IR 자유도 저당, bundle inflation 재발
- **적용 영역**: Phase 1 manifest 문법, `include:`/`exclude:`/`allow_disassemble:` 등 문법 parse error
- **Phase 2 전환 시**: 해체가 필요하면 **asset-level canonical IR 로 처리** (Phase 2 에선 plugin 단위 조작이 아니라 자산 단위 재조립). 기존 plugin 필드 의미 재해석 금지

### Π3. Provider-native 존중 — **resolver 중복 구현 금지**

- **선언**: concord 는 provider 런타임의 네이티브 동작 존중. 자체 resolver 를 만들지 않음. 공유는 명시적 opt-in. **Scope 해석도 provider 런타임에 위임** (v2 보강)
- **도출**: MEMORY ground rules + 결정 A (A1~A5)
- **위반 결과**: provider 네이티브 동작과 괴리 → 사용자 신뢰 영구 손실
- **적용 영역**: Phase 1 sync/install 전체, Phase 2 cross-sync 의 자산별 adapter 경계, 4 scope layering (enterprise/user/project/local)

### Π4. Machine contract vs human UX 분리 — **두 레이어는 같이 움직이지 않는다**

- **선언**: Lock 과 `--json` 출력 = **machine contract (항상 완전)**. TTY CLI = human UX (침묵 기본, 조치 가능한 경고만)
- **도출**: Q2 V4, Q4 γ Hybrid
- **위반 결과**: "schema 명확 vs 기호 학습 불필요" 허위대립에 빠져 한쪽만 택하면 다른 쪽 비용 폭발
- **적용 영역**: `concord.lock`, `--json` 출력, TTY 출력, doctor 경고 톤
- **연결 (Π6 포섭)**: Π6 "Lossy 명시" 는 Π4 의 따름정리 — Π4 의 human layer 에서 "언제 침묵을 깨는가" 의 기준 = Π6

### Π5. Additive evolution by default — **breaking 은 예방약이 아님**

- **선언**: Phase 1 → Phase 2 진화는 additive 가 default. 새 기능 = 새 섹션/필드. `concord_version: ">=X"` constraint 로 feature gate. Breaking 은 진짜 필요한 순간에만 1회성 전환

- **Additive 의 연산 정의 (v2 신설, 3줄 룰)**:
  1. **필드·섹션 추가만 허용** (rename 금지)
  2. **기존 필드 semantic 변경 금지** (reinterpret 금지)
  3. **default 값 변경 = breaking** (Deno 1→2 `nodeModulesDir` 선례)

- **JSON schema consumer 계약 (v2 신설)**: `--json` 출력은 **permissive consumer 전제** — CI 스크립트가 strict parser 쓰지 말 것을 문서에 명기 (Π4 와 연결)

- **도출**: Q5 P1~P5
- **위반 결과**: H (Cargo edition) 도입 시 backport 압력 + 문서 2배 + Q3 I6 균열 (YAGNI 위반)
- **적용 영역**: manifest 문법, lock schema, `--json` 출력 schema

### Π6. Lossy 명시의 정직성 — **숨김 ≠ 은폐** (Π4 의 corollary)

- **선언**: 관측 불가능/실행 불가능 상태는 **기호·status 로 명시**. 데이터를 lock 에 넣었으면 doctor 는 반드시 접근 경로를 제공. 실패도 침묵하지 않음 (fail-closed + reason enum)

- **Π4 와의 관계 (v2 명시)**: Π6 은 Π4 의 **human layer 발화 기준**. machine layer 는 항상 완전이므로 Π6 이 적용될 공간은 TTY 뿐.

- **Π2 와의 범위 분리 (v2 명시)**: Π2 는 **plugin bytes 조작 금지**, Π6 은 **진단 데이터 표기**. 두 축은 서로 다른 대상이므로 충돌 없음.

- **도출**: 섹션 5 I3 + Q4 4 status + Q2' 심각 3종
- **위반 결과**: Z (완전 침묵) 의 불신 비용 시나리오 (S1 PR 리뷰어 의심 / S2 Codex-only 침묵 실패 / S3 Phase 2 갑툭튀). Homebrew Brewfile.lock 이름-역할 괴리 재현
- **적용 영역**: `capability_matrix` 4 status, reason enum, doctor 발화 정책

### Π7. Explicit boundaries via parse error — **경계는 선언적이어야 한다**

- **선언**: **Reserved identifier** 가 Phase 1 에 나타나면 **parse error** (v1/v2 모두 영구). 에러 메시지에 업그레이드 경로 포함. 단, **generic unknown 필드는 passthrough** (Π2 "기록 허용" 하위 원칙)

- **Reserved vs Unknown 구분 (v2 명시)**:
  - **Reserved identifier**: 중앙 레지스트리 (§A 부록) 에 등재된 이름 → **영구 parse error**
  - **Generic unknown**: 레지스트리에 없는 미지 필드 → **passthrough** (lock `nodes.<key>.declared:` 원문 보존)

- **Π5 와의 경계 (v2 명시)**: Additive 로 추가된 새 필드는 **concord_version constraint 로 hard gate**. 구 concord 에서 신 필드 = warning + skip (permissive). 단 reserved identifier 에 해당하면 parse error (hard gate).

- **도출**: Q3 D4 + Q5 P4
- **위반 결과**: "같은 문자열이 manifest 헤더 한 줄에 따라 유효성 반전" = user mental model 세금, silent ignore 는 I6 파괴
- **적용 영역**: `include:`/`exclude:`/`allow_disassemble:` parse error, 미래 reserved identifier 등장 시 concord_version 상향 유도 메시지

---

### 3.8 Π 간 관계 / 충돌 해소 (v2 신설)

5 가지 교차 관계 명시:

| 관계 | 유형 | 해소 |
|---|---|---|
| **Π4 ⊇ Π6** | 포섭 (Π6 은 Π4 corollary) | Π6 은 Π4 의 human layer 발화 기준. 별도 원칙이 아닌 부속 규칙 |
| **Π2 ⊥ Π6** | 범위 분리 (직교) | Π2 = plugin bytes, Π6 = 진단 데이터 표기. 충돌 없음 |
| **Π5 ↔ Π7** | 경계 결합 (concord_version) | 미지 필드 기본 passthrough, reserved 는 parse error, `concord_version` constraint 로 hard gate 활성 |
| **Π2 ⊇ "기록 허용"** | 하위 원칙 | 저자 미래 필드 manifest 기록 = OK / 런타임 해석 = NO |
| **Π5 ⊇ "consumer 계약"** | 하위 원칙 | `--json` consumer 는 permissive parser 전제 (strict 금지) |

**충돌 시나리오 검증 3건 (모두 겉으로만 충돌)**:
- **Π2 vs Π6** (plugin 내부 실패 자산): `capability_matrix.X.Y.status=failed + reason=NetworkError` 로 관측·명시하면 양쪽 만족. Π2 범위 = bytes, Π6 범위 = 진단.
- **Π4 vs Π5** (additive JSON schema): `--json` 은 supersets 확장만, TTY 에 spill 없음 = Π4 "같이 움직이지 않음" 으로 차단. 단 consumer permissive 전제 필요.
- **Π5 vs Π7** (additive 새 필드의 구 버전 parse error): reserved identifier 면 영구 parse error, 아니면 passthrough. 경계 = `concord_version` + 레지스트리 검사.

---

## 4. Phase 1 / Phase 2 책임 분할표 (v2 수정)

| 레이어 | Phase 1 책임 | Phase 2 책임 | 경계 원칙 |
|---|---|---|---|
| **Lock 파일** | reproducibility contract (`bytes_sha256` + source digest) | `phase2_projections:` additive 섹션 (asset-level IR preview) | Π1 |
| **Manifest 파일** | 6 자산 타입 + β3 α (3 source types) + `concord_version:` constraint | `cross_sync:` 등 신규 섹션 additive | Π5, Π7 |
| **Plugin 행동** | intact sync (provider-native 위임) | asset-level cross-sync (Adapter/Translate/experimental-compile) | Π2, Π3 |
| **CLI 노출 (TTY)** | 일상 침묵 + doctor 심각 경고 | Phase 2 기능 신규 명령/플래그 | Π4 |
| **CLI 출력 (`--json`)** | 전체 `capability_matrix` + remediation hint 항상 포함 | Phase 2 기능 additive 포함 (consumer = permissive) | Π4, Π5 |
| **상태 표현** | `capability_matrix` 4 status discriminated union | Phase 2 asset-level IR (별도 필드) | Π6 |
| **문법 경계 — Reserved** (v2 정정) | **Phase 1/2 공통 parse error**: `include:`/`exclude:`/`allow_disassemble:` (§A 레지스트리) | Phase 2 **신규 섹션** (`cross_sync:` 등) 에서 기능 제공. 기존 Reserved 문자열은 **Phase 2 에서도 영구 parse error** | Π7 (Q5 P4) |
| **문법 경계 — Unknown** (v2 정정) | Generic unknown 필드 = **passthrough** → `nodes.<key>.declared:` 원문 보존 | 동일 | Π2 하위 원칙 + Π7 |
| **저자 계약** (v2 명확화) | manifest 미지 필드 = passthrough (의미 부여 없음) | Chrome `optional_permissions` 스타일 저자 선언 (RFC 예정, 신규 필드 추가) | Π2, Π5 |
| **해체 기능** | 0% (intact only) | asset-level IR 로 재조립, **plugin 해체 아님** | Π2 |

**v1 → v2 정정 포인트**:
- "문법 경계" 행에서 "Phase 2 에서 정식 지원" (v1) → "**Reserved 문자열은 Phase 2 에서도 영구 parse error, 대체는 신규 섹션**" (v2). Q5 P4 와 일관.
- "저자 계약" 행에서 passthrough 저장 위치 명시 (`nodes.<key>.declared:` 원문 보존)
- Reserved vs Unknown 구분 명시 (2 행으로 분리)

---

## 5. 결정 교차 참조 매트릭스 (v2 보강)

**Q1~Q5 + Q2' 상호 의존 관계**:

```
Q1 (lock 경계) ───────── phase2_projections: 필드 정의
  │
  └──→ Q4 (capability_matrix schema)
         │
         ├──→ Q2' (doctor 심각 3종 판정)  ←── 판정 조건 = Q4 status
         │      │
         │      └──→ Q2 (CLI 노출 정책)
         │
         └──→ Q3 (parse error 방어선, I6 invariant)
                │
                └──→ Q5 (manifest 진화, P4 parse error 영구 유지)
```

**강결합 지점 (v2 보강)**:
- **Q4 ↔ Q2'**: Q4 status schema 변경 시 Q2' 판정 로직 동기 변경 필요
- **Q3 ↔ Q5**: parse error 유지 ↔ manifest 진화 정책 상호 잠금. **P4 는 Q3 D4 의 영속화**
- **Q4 ↔ Q3**: Q3 invariant "관측하되 조작 안 함" 은 Q4 관측 schema 를 전제로 함 (Q4 없으면 Q3 무의미)

**약결합 지점**:
- Q1 ↔ Q5: lock version (tool generated) vs manifest evolution (human authored) 동력학 다름
- Q2 ↔ Q3: 둘 다 Q4/Q2' 위에 얹힘 (직접 결합 아님)

---

## 6. Phase 2 RFC 착수 체크리스트 (v2 방어성 강화)

### ✅ 결정해야 할 것 (Phase 2 RFC 범위)

- Phase 2 **asset-level canonical IR** 구체 schema (skills/MCP/subagents/hooks/commands/instructions 별)
- `cross_sync:` 섹션 manifest 문법 (자산별 strategy: Adapter / Translate / experimental-compile)
- Adapter 구현 전략: skills (agentskills.io 공통), MCP (공식 스펙 변환)
- Translate 전략: subagents (50-65% lossy warning), commands (25-70%)
- experimental-compile 전략: hooks only (10-30% ceiling, opt-in)
- 저자 계약 필드 (Chrome `optional_permissions` 스타일 — Π2 확장, **신규 필드로 추가**)
- `concord_version` bump 기준 및 RFC 프로세스

### ❌ 결정하지 말아야 할 것 (Phase 1 영속 원칙, v2 독립 항목화)

**1. Invariant 재검토 금지**
- **Π1~Π7 재검토 금지** — Phase 2 에서도 영구 유효
- Π 증설은 **기존 Π corollary 로 표현 가능한지 먼저 검증** (v2 §1 원칙)

**2. I6 Plugin intact 완화 금지**
- **Phase 2 asset-level IR 이 plugin 해체를 영원히 대체**한다. plugin 단위 조작 추가 금지
- 해체 요구 시 답변: "asset-level IR 을 사용하라, plugin 내부 접근은 영구 불가"

**3. Reserved identifier 영구 parse error**
- §A 레지스트리의 `include:`/`exclude:`/`allow_disassemble:` 등은 **Phase 2 에서도 parse error**
- 대체 기능은 **신규 섹션** (`cross_sync:` 등) 으로 제공

**4. `--json` machine contract 완전성**
- TTY 침묵과 무관하게 `--json` 은 **항상** 전체 `capability_matrix` + remediation hint 포함
- Phase 2 에서도 permissive consumer 전제 유지

**5. `lockfile_version` / `concord_version` 역행 금지**
- v1 은 영구 유효
- Semver constraint 계약 유지
- Default 값 변경 = breaking (Π5 3줄 룰)

**6. Q4 `status` enum 축소 금지**
- `supported`/`detected-not-executed`/`na`/`failed` 4종 고정
- 확장은 additive (`partial` 등 신규 case 추가는 OK, 제거 금지)

**7. `capability_matrix` 필드 의미 재해석 금지**
- Π5 Rule 2 "기존 필드 semantic 변경 금지" 적용

**8. Invariant 변경 RFC 게이트 (v2 신설)**
- Π 약화/완화는 **공식 RFC** 필요
- 요건: (a) 3 provider 이해당사자 합의 / (b) 선례 1건 이상 / (c) 이전 결정 (Q1~Q5) 중 최소 1개가 현실적으로 붕괴했다는 근거 / (d) 최소 2 버전 deprecation 경고 + migration path
- Rust RFC / PEP 수준의 문턱

---

## 7. 통합 Minority Report (v2 보강)

Q1~Q5 결정별 미결 사항 통합. 각 항목의 해결 시점 명시.

| 항목 | 도출 결정 | 해결 시점 |
|---|---|---|
| `capability_matrix` 필드명 개명 (`compat_snapshot`? `diagnostic_matrix`?) — 이름-역할 괴리 테스트 필요 | Q1/Q4 | 구현 단계 |
| `capability_matrix.reason` enum 초기 집합 완결성 | Q4 | Phase 1 POC |
| `partial` status (Claude 26 events 중 Codex 5 호환) 추가 여부 | Q4 | Phase 1 POC (실제 케이스 관찰) |
| `?` (failed) 범위: plugin 전체 vs 셀 단위 | Q4 | 구현 단계 |
| `phase2_projections:` 위치 (nodes 내부 필드 vs 최상위 섹션) | Q1 | Phase 1.5 착수 시 |
| `lockfile_version` bump 정책 (major/minor 기준) | Q1 | POC 중 확정 |
| `concord_version` semver range 문법 (`^`/`~`/`>=` 지원 범위) | Q5 | POC 중 확정 (semver 라이브러리 채택) |
| **`concord_version` 생략 시 경고 + 불일치 fail-closed** (v2 보강) | Q5 | 구현 단계 |
| **`list --json` vs `list` TTY 필드 대칭성 보장 테스트** (v2 보강) | Q2 | Phase 1 POC |
| OpenCode `auto_install` vs `enabled` 의미 분리 검증 | 섹션 3 | Phase 1 POC |
| Codex `marketplace add` CLI 공식 계약 여부 | 섹션 3 | POC-7 (공식 docs 업데이트 감시) |
| **Plugin introspection 엔진 정확성 테스트** (v2 보강) | 섹션 5 | Phase 1 첫 sprint POC |
| `--json` schema 에 `capability_matrix` 필드 이름 고정 | Q2 | POC 중 확정 |
| **provider-native hook disable 설정의 provider 별 스펙 차이** (Claude/Codex/OpenCode) (v2 보강) | Q3 | 결정 D Windows fallback 과 연계 조사 |
| Phase 2 breaking 전환 기준 (진짜 B 필요 시) | Q5 | Phase 2 RFC |

---

## 8. Phase 1 실구현 체크리스트 (v2 보강)

섹션 1~6 + 섹션 7 합산. TODO.md L118~127 확장.

### 섹션 7 추가 구현 항목

- [ ] **`lockfile_version: 1` 최상위 필드** (Q1)
- [ ] **`phase2_projections:` 섹션 스켈레톤** (Q1 — Phase 1 에선 빈칸)
- [ ] **`capability_matrix` discriminated union validator** (Q4 — zod + JSON Schema SoT)
- [ ] **`reason` enum 관리** (Q4 — 초기 집합 + 확장 policy)
- [ ] **기호 렌더러** (Q4 — 20줄 pure function: `supported`→N, `detected-not-executed`→N*, `na`→-, `failed`→?)
- [ ] **doctor 심각 3종 판정 로직** (Q2' — status 조건 + reason 별 메시지)
- [ ] **`concord_version: ">=X"` constraint 파서 + 버전 체크** (Q5)
- [ ] **`concord_version` 생략 시 warning** (v2 보강)
- [ ] **`concord_version` 불일치 fail-closed 동작** (v2 보강)
- [ ] **parse error 방어선** (Q3 D4, Q5 P4 — §A Reserved registry 기반)
- [ ] **`--json` 출력 schema 정의** (Q2 V4 + Q4 — TTY 침묵과 무관하게 compat 항상 포함)
- [ ] **`list --json` vs TTY 필드 대칭성 골든 테스트** (v2 보강)
- [ ] **Generic unknown 필드 passthrough 구현** (v2 보강 — `nodes.<key>.declared:` 원문 보존)
- [ ] **Reserved identifier registry 단일 모듈화** (v2 보강 — §A 기반)
- [ ] **Plugin introspection 정확성 골든 테스트** (v2 보강 — capability_matrix 계산)
- [ ] **`capability_matrix` 필드명 이름-역할 괴리 테스트** (v2 보강 — Homebrew Brewfile.lock 교훈)

---

## 9. 다음 단계

### 즉시

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
- `04-final-plan-v1.md` — 리뷰 없는 초안 (섹션 7 통합)
- **`04-final-plan-v2.md` — 본 문서 (Codex + 독립 판단 리뷰 반영)**

---

## 11. 참고 (Π 도출 근거)

- **Π1**: Q1 근거 = Cargo workspace 선례, PEP 751 실패 사례, OpenTofu silent rewrite 경고
- **Π2**: Q3 근거 = 3 생태계 (Claude/Codex/OpenCode/OpenClaw) 저자 계약 필드 미지원 확인 + Homebrew `--with/--without` anti-pattern
- **Π3**: MEMORY ground rules + 결정 A
- **Π4**: Q2 V4 + Q4 = Terraform `show -json` + K8s `.status.conditions` 선례
- **Π5**: Q5 = 10 선례 조사 (npm/Ruby Gemfile P 지지, Cargo H 1건 뿐) + Deno default 변경 breaking 선례
- **Π6**: 섹션 5 I3 + Q4 = Nietzsche 정직성, Homebrew 이름-역할 경고
- **Π7**: Q3 D4 + Q5 P4 = parse error 의 시간축 방어선 원칙

---

## §A. Reserved Identifier Registry (v2 신설 부록)

**v2 리뷰 지적 반영**: Π7 parse error 대상 문자열을 **중앙 집합**으로 관리. 구현자가 산발적으로 관리하는 위험 방지.

### A.1 현재 Reserved (Phase 1 parse error 영구)

#### A.1.1 결정 C 섹션 7 (Q3 D4)

| Identifier | 도출 | Phase 2 대체 경로 |
|---|---|---|
| `include:` | Q3 D4 | `cross_sync:` 신규 섹션 (Phase 2 RFC) |
| `exclude:` | Q3 D4 | `cross_sync:` 신규 섹션 (Phase 2 RFC) |
| `allow_disassemble:` | Q3 D4 | **대체 없음** — Phase 2 asset-level IR 로 해체 기능 대체 |
| `disassembled_sources:` | Q3 D4 | **대체 없음** — 상동 |

#### A.1.2 결정 E 보간 문법 (2026-04-21 추가)

**Secret backends (Phase 2)**:
| Identifier | 도출 | Phase 2 의미 |
|---|---|---|
| `{secret:keychain://...}` | E-6 | macOS Keychain (Phase 2 우선순위 2) |
| `{secret:aws-ssm://...}` | E-6 | AWS SSM Parameter Store (Phase 2 우선순위 3) |
| `{secret:1password://...}` | E-6 | 1Password CLI (Phase 2 우선순위 1) |
| `{secret:azure-kv://...}` | E-6 | Azure Key Vault (Phase 2 후보) |
| `{secret:gcp-sm://...}` | E-6 | GCP Secret Manager (Phase 2 후보) |

**Type coercion / encoding suffix (Phase 2)**:
| Identifier | 도출 | Phase 2 의미 |
|---|---|---|
| `{env:X\|int}` | E-12 | 정수 type coercion |
| `{env:X\|bool}` | E-12 | Boolean type coercion |
| `{env:X\|float}` | E-12 | Float type coercion |
| `{file:X\|base64}` | E-15 | Binary file base64 encoding |

**Default 문법 변형 (Phase 2)**:
| Identifier | 도출 | Phase 2 의미 |
|---|---|---|
| `{env:X-default}` (colon 없음) | E-11 | Unset-only default (Docker Compose 변형) |
| `{env:X:?error}` | E-11 | Strict error 메시지 명시 |

### A.2 Reserved 추가 프로세스 (v2 신설)

1. 공식 RFC 작성
2. Π7 준수 확인 (미래 기능과의 충돌 사전 예측)
3. 에러 메시지 문구 확정 (업그레이드 경로 포함)
4. 단일 validator 모듈에 등록

### A.3 에러 메시지 템플릿

```
error: <identifier> is reserved and not supported
  location: <file>:<line>:<col>
  reason: <identifier> is reserved for future Phase 2+ semantics.
  suggestion: <업그레이드 경로 또는 "not supported, see Phase 2 asset-level IR">
```

### A.4 Generic Unknown vs Reserved 구분 규칙

- **Reserved** (§A.1 에 등재): parse error
- **Unknown** (미등재): passthrough → `nodes.<key>.declared:` 원문 보존 + `concord doctor` 에서 warning ("unknown field, preserved as-is")

---

**End of v2.**
