# B — 남은 POC 항목 (FINAL 후 구현 시 검증)

모든 UX·설계 결정은 확정됨 ([`07-cli-and-bootstrap.md`](07-cli-and-bootstrap.md)). 남은 것은 **구현 시 실측 확인할 기술 항목** 만.

---

## 🟡 POC-1. TOML 편집 라이브러리 3도구 벤치마크 (Phase 1 첫 sprint)

concord 의 golden test suite 를 3개 후보로 돌려 bit-perfect 통과율 비교 후 1개 선택.

### 후보
- [`@shopify/toml-patch`](https://www.npmjs.com/package/@shopify/toml-patch) — Rust toml_edit wasm 래퍼
- [`@decimalturn/toml-patch`](https://www.npmjs.com/package/@decimalturn/toml-patch) — pure JS, TOML v1.1, 최근 활성
- [`@ltd/j-toml`](https://www.npmjs.com/package/@ltd/j-toml) — "preserved as much as possible"

### 벤치마크 항목
1. 기존 entry + 주석 유지한 채 신규 entry 추가
2. entry 수정 (value 만)
3. entry 삭제 (인접 주석·comma 보존)
4. array-of-tables 순서 보존
5. inline table 유지 (standard table 로 변환되지 않음)
6. multi-line array formatting
7. CRLF 파일 편집 → EOL 유지
8. UTF-8 BOM 파일 편집 → BOM 유지
9. 대용량 (>1MB) 성능
10. Marker-block 전체 교체 전략 호환성

### 합격 기준
- 모든 golden 시나리오에서 **범위 외 영역 byte-level equality**
- Phase 1 최소 (1)(2)(3) 100% 통과
- 성능 차이 2배 이상 시 성능 우선 (@shopify 은 wasm 부담 있음)

---

## 🟡 POC-2. `jsonc-morph` vs `jsonc-parser` 실용성 비교

[`jsonc-morph`](https://www.npmjs.com/package/jsonc-morph) (David Sherret, Deno 팀) 가 CST 기반 임의 주석 조작을 제공하지만 Deno 중심 개발 → npm/Node.js 에서의 안정성·성능 검증 필요.

### 확인 항목
1. Node.js v20+ 에서 동작
2. 대용량 JSONC (Claude `settings.json` 실제 사용자 샘플) 에서 성능
3. marker 주석 삽입·삭제·재배치의 실제 동작 (jsonc-parser 는 어렵다)
4. 패키지 크기 (VSCode 의 jsonc-parser 는 업계 표준)

### 합격 기준
- 성능이 jsonc-parser 대비 20% 이내 degrade
- 임의 주석 조작 기능이 **안정적으로 동작** (cargo cult 신뢰성 아님)
- 실패 시: `jsonc-parser` 로 fallback, marker 주석 삽입은 별도 문자열 유틸로 처리

---

## 🟡 POC-3. Format-preserving YAML 편집

concord manifest (`concord.yaml`) 를 `concord import` / `concord replace` 가 편집할 때 주석·순서·indent 보존 필수.

### 후보
- [`yaml`](https://www.npmjs.com/package/yaml) (eemeli) — comment-preserving parse/stringify 지원
- [`js-yaml`](https://www.npmjs.com/package/js-yaml) — comment 지원 제한적
- 직접 AST 조작 (eemeli/yaml 의 `Document` API)

### 합격 기준
- 기존 entry 사이 주석 보존
- 엔터·들여쓰기 스타일 유지
- `concord import` 후 diff 가 **사용자 의도한 entry 만** 포함

---

## 🟢 POC-4. `~/.claude.json` 실제 포맷 확인 **[RESOLVED 2026-04-19]**

실측 샘플 (Claude Code native install, `numStartups: 139`, 1728 lines / 64 KB):

| 항목 | 결과 |
|---|---|
| strict JSON 파싱 (`json.load`) | ✅ 통과 |
| `//` / `/* */` 주석 | ❌ 0 건 |
| trailing comma (`,` 뒤 `}` `]`) | ❌ 0 건 |
| mtime 최신성 | Claude Code 실행 시마다 rewrite (`numStartups` 카운터 증가) |
| 성격 | 사용자 설정 + 내부 상태(캐시·카운터·마이그레이션 플래그) 혼합 |
| concord 관심 top-level key | `mcpServers`, `projects` (나머지는 Claude Code 전용 내부 상태) |

### 전략 분기 결정
1. **포맷**: 순수 JSON (JSONC 아님) — marker 블록(주석) 삽입 **불가**.
2. **관리 방식**: `concord.lock` 의 **`json-key-owned`** 방식 확정 — concord 가 소유한 키 경로만 추적, 나머지는 read-only.
3. **쓰기 규칙**:
   - 반드시 read-modify-write (Claude Code 자체 rewrite 와 경합)
   - 값 diff 후 변경이 실제 있을 때만 쓰기 (no-op write 금지)
   - 기존 top-level 키 순서 보존 (삽입 위치: 기존 키 업데이트는 자리 유지, 신규 키는 문서 끝)
   - Atomic rename (`.concord.bak` 경로) 필수
4. **POC-2 (JSONC 도구) 적용 범위**: `~/.claude.json` 에는 적용 **안 함**. `~/.claude/settings.json` 계열(JSONC 가능)에만 적용.
5. **doctor 체크**: `~/.claude.json` 이 concord sync 직후와 다음 실행 직전 사이에 Claude Code 에 의해 rewrite 되었는지 감지 → drift 가 아니라 **"co-managed"** 상태로 분류 (concord 소유 키만 재검증).

→ `02-config-round-trip.md` 반영 필요 (별도 업데이트 태스크).

---

## 🟢 종결된 질문 (아카이브)

구 `05-open-questions.md` 의 Q1~Q13 은 5 라운드 리뷰·사용자 승인으로 전부 해결됨. 주요 결정:

| 구 질문 | 해결 |
|---|---|
| Q1. jsonc-parser 한계 | → jsonc-morph 1순위 (POC-2 검증) |
| Q2. @ltd/j-toml 한계 | → 3도구 POC (POC-1) |
| Q3. `~/.claude.json` 포맷 | → POC-4 **RESOLVED**: 순수 JSON, `json-key-owned` 확정 |
| Q4. Marker 손상 복구 | → `--repair` flag + marker ID+hash suffix |
| Q5. Windows CRLF/BOM | → Phase 1.5 |
| Q6. Lock merge 충돌 | → Phase 1.5 merge driver |
| Q7. Atomic rename | → `.concord.bak` 백업 복원 (Phase 1) + 2PC (Phase 2) |
| Q8. Drift false positive | → `raw_hash` + `normalized_hash` 분리 |
| Q9. Bundle tree hash | → Phase 1.5 증분 |
| Q10. Monorepo nested | → Phase 2+ (결정 A A3 정합) |
| Q11-13. 추가 검증 | → POC-1~4 로 이관 |

상세 경과: [`06-review-findings.md`](06-review-findings.md)
