# Concord — TODO

현재 단계: **Plan 2A Round-trip POC 완료 (Task 18/18, 100%)** (2026-04-22)
이전: 결정 A/B/C/D/E FINAL (2026-04-21) → Design spec 작성 (2026-04-21) → Plan 1 완료 (2026-04-22) → Plan 2A Round-trip POC 완료 (2026-04-22)
다음: **Plan 2B Sync Engine** (Config round-trip + Fetcher + Installer + Format Transform)

## 🟢 Plan 1 완료 Snapshot (2026-04-22)

- **Branch**: `feat/concord-plan-1-foundation` → main 에 merge 완료
- **Tests green**: **169 / 169** (26 files, 740ms)
- **Commits**: 44 (implementation 28 + plan refinement 16)
- **Typecheck**: clean (`tsc -p tsconfig.json --noEmit`)
- **Build**: `dist/src/{cli,discovery,io,schema,index}` 전체 emit
- **Tag**: `concord-plan-1-foundation`
- **JSON Schema artifacts**: `schemas/manifest.schema.json` (32.9KB) + `schemas/lock.schema.json` (20KB) — Zod 4 native `z.toJSONSchema()` 생성

### 실동작 CLI
```bash
concord validate ./concord.yaml    # 3-pass validation (Reserved + allowlist + Zod + A1/D-11)
concord lint ./concord.yaml        # pre-validation only (fast)
concord list --lock ./concord.lock # dry-run lock reader
```

## 🟢 Plan 2A 완료 Snapshot (2026-04-22)

- **Branch**: `feat/concord-plan-2a-round-trip-poc` → main 에 merge 완료
- **Tests green**: **246 / 246 + 1 skipped** (37 files)
- **Tasks**: 18/18 완료
- **Tag**: `concord-plan-2a-round-trip-poc`
- **선정 library**:
  - TOML: `@decimalturn/toml-patch @ 1.1.1` (loser: `@shopify/toml-patch`, `@ltd/j-toml`)
  - JSONC: `jsonc-morph @ 0.3.3` (loser: `jsonc-parser`)
  - YAML: `yaml @ 2.8.3` (eemeli) — Plan 1 에서 이미 확정
  - Symlink: `symlink-dir @ 10.0.1` — macOS 5/5 PASS / Windows DEFERRED

---

## ✅ 완료 (Done)

### 조사·분석 (2026-04-18 ~ 2026-04-19)
- [x] 프로젝트 컨텍스트 탐색
- [x] 참고 도구 조사: skillshare, vercel-labs/skills, skills.sh, gstack, oh-my-openagent
- [x] 14개 공식 문서 병렬 조사 (claude-code / codex / opencode × 6 자산 타입)
- [x] 자산 타입별 비교 문서 작성 → `new-plans/01-07.md`
- [x] Codex rescue agent 독립 검토 (2회) → `new-plans/08-codex-review.md`
- [x] Codex 피드백 기반 정정·액션 정리 → `new-plans/09-corrections-and-action-items.md`

### 결정·구조 (2026-04-19 ~ 2026-04-21)
- [x] 사용자 시나리오 확정: B형(오픈 공유 템플릿) + C형(모노레포 프로젝트 고정)
- [x] Manifest 4계층 구조 (user / enterprise / project / project-local)
- [x] ~~자산 분류 4타입 (A 파일 / B 설정블록 / C 문서include / D 번들)~~ → **2026-04-20 β3 재구조로 폐기, 6 자산 타입 복원** (skills/subagents/hooks/mcp_servers/instructions/plugins)
- [x] URI 기반 `source:` 스킴 + Fetcher adapter + `concord.lock` (npm ci 스타일)
- [x] Provider별 network 경로 기본값 매트릭스
- [x] **결정 A FINAL: Skills 배치 Option III-tightened + 5개 추가 조항 (A1~A5)** (2026-04-19 승인)

### 초기 산출물
- [x] `new-plans/01-09.md` 9개 설계 문서
- [x] `MEMORY.md` 재작성 (세션 연속성 보장용)

### Design Spec (2026-04-21 ~ 2026-04-22) ★
- [x] **`docs/superpowers/specs/2026-04-21-concord-design.md`** 작성 완료 (약 3878줄)
  - §0 목적·범위 / §1 Π1~Π7 + RFC Defense / §2 Reserved Registry / §3 Asset Type + Source Model / §4 Manifest Schema / §5 Lock Schema / §6 CLI 11 / §7 State Machine / §8 Secret 보간 / §9 Windows Install / §10 Round-trip / §11 Discovery / §12 Open Issues / 부록 A/B/C
- [x] **3-subagent 교차 리뷰** (codex-rescue + 2 웹서치) — 20건 수정 반영
  - Π 정합성 / URL 상태 / 라이브러리 버전 / Zod API
  - spec 부록 B Zod 3 → **Zod 4 채택 재평가** (2026-04-22, 기존 `package.json` 존중)

### Plan 1 Foundation 작성 (2026-04-22) ★
- [x] **`docs/superpowers/plans/2026-04-22-concord-plan-1-foundation.md`** (약 4200줄, 28 task)
- [x] 4-plan 분할 결정 (A 경로): Plan 1 Foundation → Plan 2 Sync Engine → Plan 3 Secret+Diagnostics → Plan 4 CLI 통합
- [x] git baseline commit (2f3acf8) + feature branch `feat/concord-plan-1-foundation`

### Plan 1 Implementation — Task 1~28 완료 (2026-04-22) ★

| # | Task | Commit | Tests |
|---|---|---|---|
| 1 | Bootstrap (TS6 + Zod4 + Vitest4 + package/tsconfig/vitest) | `3c214f3` + `d3c17b0` | — |
| 2 | Shared types + 4 enums | `fa4bd06` | 4 |
| 3 | Discovery (`concord-home.ts`) | `29d5d71` + `cc1f791` | 3 |
| 4 | Reserved Identifier Registry (§2, 15 entries) | `5052cb7` + `6fed548` + `5d3db5f` | 21 |
| 5 | Interpolation Allowlist + regression | `a18ff4f` + `6951773` | 30 |
| 6 | Reason Enums (22 + 11) | `1c86de9` | 8 |
| 7 | CapabilityMatrixSchema + renderer | `3184c35` + `3ec092b` | 10 |
| 8 | SourceSchema + PluginSourceSchema | `eb06384` + `f3cf081` | 9 |
| 9 | AssetBaseSchema + install field | `9b50666` + `ee4ab81` | 6 |
| 10 | SkillAssetSchema + A1/A4 post-validator | `6eb5f94` + `f99cce1` | 5 |
| 11 | SubagentAssetSchema | `043945b` | 3 |
| 12 | HookAssetSchema (2-asset split) | `7617b81` | 4 |
| 13 | McpServerAssetSchema (+ id regex underscore) | `940c119` + `30d228d` | 4 |
| 14 | InstructionAssetSchema | `d31c274` | 7 |
| 15 | PluginAssetSchema (β3 α) | `da00c30` | 4 |
| 16 | ManifestSchema + concord_version semver | `c952394` | 8 |
| 17 | YAML loader (eemeli) | `7299c08` | 3 |
| 18 | validateManifest 3-pass + D-11 | `c72ee79` + `b757c29` | 7 |
| 19 | 4-scope precedence merge | `499f3a3` | 3 |
| 20 | LockNodeSchema (3중 digest) | `bc90a75` + `ad87586` | 5 |
| 21 | LockSchema + symlink drift refine | `9bd17cb` | 8 |
| 22 | Lock read I/O | `e9bc1d4` | 2 |
| 23 | validateLock + I1/I5/I6 | `e7a41c4` | 5 |
| 24 | CLI skeleton + `concord validate` | `4190766` | 3 |
| 25 | `concord lint` | `cbce515` | 3 |
| 26 | `concord list --dry-run` | `7dd0eac` | 2 |
| 27 | Integration POC-13 golden | `66479be` | 2 |
| 28 | README + POC log + schemas + tag | `0f01ff0` | — |

**누적**: **169 tests green / 26 test files / typecheck clean / 44 commits + tag**

### 누적 Review 발견 (Plan 에 전부 반영됨)
- **TS 6 + @types/node 25** → `"types": ["node"]` 필수 (TS2591 fix)
- **Vitest 4 + ESM** → `vi.spyOn(os.homedir)` 불가, `vi.mock + importActual + 가변 ref` 패턴
- **Zod 4 API migration**:
  - `.url()` → `z.url()`
  - `.datetime()` → `z.iso.datetime()`
  - `.passthrough()` → `.loose()`
  - Discriminated union variants `.strict()` 필수 (illegal state rejection)
  - `z.record(enum, V)` Zod 4 exhaustive — 모든 enum key 필수
- **Multi-pipe regex** `{env:X|int|bool}` 매칭
- **Silent-pass test** → `expect(fn).toThrow(pattern)` 패턴 교체
- **id regex** underscore 허용 (`mcp_servers`)
- **D-11 case-collision** lowercase-only id regex 때문에 pre-validation 으로 이동
- **Security regression guards** (sequential / abs path / prefix confusion / error.detail)

---

## ✅ 완료 (계속)

- [x] ~~결정 A (Skills) 최종 사용자 승인~~ → **FINAL 확정 (2026-04-19)**
- [~] **결정 C β3 재구조 섹션 1~6 확정 (2026-04-20)** — 초안 v1(`STEP-C/01-bundle-plugin.md`) 기각 + v2 준비(`STEP-C/02-v2-preparation.md`) 의 "Bundle ↔ Plugin 경계" 프레임이 계보학적 재조사로 **가짜 경계** 판명 ("bundle" 은 plugin 형용사의 인플레이션, `feedback_bundle_inflation.md` 참조). **β3 옵션 α** (plugin 자산 타입 + provider 별 source type 3종) + D-mid+(iv) overlay + 모델 B 상태 머신으로 재구조 → [`STEP-C/03-plugin-source-model.md`](new-plans/STEP-C/03-plugin-source-model.md). 섹션 7~8 남음.
- [x] **결정 B FINAL 확정 (2026-04-19)** — `new-plans/STEP-B/` 8개 md 파일
  - [x] 5 라운드 리뷰 (codex + general-purpose 병렬, 모두 공식 URL 근거)
    - R1 config round-trip → TOML 3도구 POC, raw/normalized hash
    - R2 default scope + init/config 명령
    - R3 file-based inference + URL sync + concord.yaml alias
    - R4 --all 제거 + adopt context-aware default
    - R5 add/remove Phase 2+로 이관
  - [x] 확정 CLI: init / detect / adopt / import / replace / sync / update / doctor / list / why
  - [x] 용어: "layer" → "scope" 전면 sweep 완료
  - [x] 중심 문서: `STEP-B/07-cli-and-bootstrap.md` (FINAL 확정본)

---

## 🔜 남은 결정 (Pending Decisions)

### 결정 B — FINAL 완료 (2026-04-19). 구현 시 남은 POC 항목 (`STEP-B/05-open-questions.md`):
- [x] POC-1: TOML 3도구 벤치마크 → **`@decimalturn/toml-patch @ 1.1.1` 선정** (2026-04-22, Plan 2A Task 7~8)
- [x] POC-2: `jsonc-morph` vs `jsonc-parser` → **`jsonc-morph @ 0.3.3` 선정** (2026-04-22, Plan 2A Task 12)
- [x] POC-3: Format-preserving YAML → **`yaml @ 2.8.3` (eemeli) 확정** (2026-04-22, Plan 2A Task 13~14)
- [x] POC-4: `~/.claude.json` 실제 포맷 확인 → **순수 JSON 확정, `json-key-owned` 방식 채택** (2026-04-19, `STEP-B/05-open-questions.md`)

### 결정 C — Plugin 자산 타입의 source 모델 **[β3 재구조 확정 2026-04-20]** → FINAL 문서: `STEP-C/03-plugin-source-model.md`

**확정된 섹션 (2026-04-20)**:
- [x] 섹션 1 정체성 정박 (Phase 1 import/sync, Phase 2 cross-harness)
- [x] 섹션 2 Asset Type 6개 복원 (Type A/B/C/D 분류 폐기, "bundle" 삭제)
- [x] 섹션 3 β3 옵션 α: `claude-plugin`/`codex-plugin`/`opencode-plugin` source type + `auto_install`+`enabled`+`purge_on_remove` 3 플래그
- [x] 섹션 4 D-mid + (iv) overlay: skill (agentskills.io) + MCP (공식 스펙), `concord:` prefix flat
- [x] 섹션 5 Lock 구조: roots+nodes flat graph, 3중 digest, 자산별 필드 분리, **`capability_matrix` Phase 1 필수**, Claude `dependencies` transitive + `min_engine`
- [x] 섹션 6 상태 머신 모델 B (Homebrew Bundle 스타일): 3 state + 2 event + opt-in `extraneous`. **`concord cleanup`** 신설

**섹션 7 확정 (2026-04-21)**:
- [x] **Q1** Phase 1 lock ↔ Phase 2 IR 결합도 → **Option C 중간 결합 (Cargo 모델)**. 3 원칙 (P1 reproducibility contract / P2 유도 진단 데이터 / P3 섹션 분리 + `lockfile_version` 게이팅). 섹션 5 변경 필드: `lockfile_version`, `capability_matrix` meta, `phase2_projections:` 예약 섹션, `integrity-mismatch` 범위 명시
- [x] **Q2 원칙** cross-tool 호환 ceiling 노출 정책 → **Option V 확장형**. 5 원칙 (V1 일상 침묵 / V2 doctor 심각 경고 / V3 `--compat` opt-in drill-down / V4 `--json` 은 기계 계약 = compat 항상 포함 / V5 전역 flag 거부). 선례: 8/8 도구 V 지지 (Bundler `PLATFORMS` 가 구조적 동형)
- [x] **Q4** `capability_matrix` 표기 → **γ Hybrid + discriminated union**. 내부=β 4 status (`supported`/`detected-not-executed`/`na`/`failed`) + `reason` enum 고정, 외부=α 기호 렌더링 (`N`/`N*`/`-`/`?`). 렌더러 20줄 pure function. 가드레일: reason enum / JSON Schema SoT / 단일 validator / illegal states unrepresentable. 선례: K8s `.status.conditions` 직접 모델, npm flat boolean 반면교사
- [x] **Q2' 상세** 심각 mismatch 3종 Q4 기반 정식화: (a) 환경 불일치 = `supported`+count>0+provider 미탐지 / (b) Lossy 기호 실재 = `detected-not-executed`+provider 활성 / (c) Flag gated unmet = (b)∩`reason:FeatureFlagDisabled`. `--json` 출력은 항상 전체 matrix + remediation hint
- [x] **Q3** γ Disassemble Phase 1 존재 형태 → **(a) intact only + invariant + Q2'/Q4 자연 귀결 + parse error 방어선**. 4 원칙 (D1 intact / D2 "관측하되 조작 안 함" invariant / D3 Q2'/Q4 재흡수로 신규 기능 금지 / D4 `include:`/`exclude:`/`allow_disassemble:` parse error). 섹션 5 불변식 I6 Plugin intact 신설. 기각: (c) 새 계약 창조 (3 생태계 미지원), (d) Homebrew `--with/--without` anti-pattern. 3 사용자 시나리오 (S1~S3) 모두 기존 기능 또는 Phase 2 로 해결
- [x] **Q5** manifest 문법 변화 정책 → **Option P+ (npm + Dart constraint hybrid)**. 5 원칙 (P1 schema 거의 불변 / P2 신규 기능 = additive / P3 `concord_version: ">=X"` constraint / P4 Q3 I6 parse error 영구 유지 / P5 진짜 breaking 시 B 1회성 전환). `manifest_version` 도입 금지. H (Cargo edition) 기각: 10 선례 중 1건, backport 압력, 문서 2배, Q3 I6 균열. npm/Ruby/Dart/mise 선례 지지. Migration 도구 불필요

**섹션 7 최종 통합 완료 (2026-04-21)**:
- [x] **`04-final-plan-v1.md`** — 리뷰 없는 버전 (대체됨, 역사 기록 보존)
- [x] **`04-final-plan-v2.md`** — ★ **결정 C 섹션 7 공식 FINAL** ★ (Codex + 독립 판단 subagent 리뷰 반영). Π1~Π7 + §3.8 Π 간 관계 + §6 독립 금지 8 항목 + RFC 게이트 + §A Reserved Identifier Registry

**섹션 8 완료 (2026-04-21)**:
- [x] **`05-section8-final-selection.md`** — v1 vs v2 비교 + v2 공식 FINAL 채택 결정. 근거: (1) v1 §4 "문법 경계" 가 자신의 Π5/Π7 과 직접 모순, (2) Codex + 독립 판단 2 리뷰 반영으로 12 지점 보강, (3) 축별 우위 v2=13/v1=2. v1 은 계보 추적용 역사 기록 보존 (기존 01/02 와 동일 관행). v2 헤더 "공식 FINAL" + v1 헤더 "대체됨" 라벨 업데이트

**결정 C 전체 FINAL 달성 (2026-04-21)** — 섹션 1~8 완료

**Phase 1 POC 추가 항목 (섹션 5 도입)**:
- [ ] Plugin introspection 엔진 (Claude `plugin.json` / Codex `.codex-plugin/plugin.json` / OpenCode `package.json#main` 파싱) → `capability_matrix` 계산 정확성
- [ ] OpenCode `auto_install` vs `enabled` 의미 분리 검증 (배열 존재 = enabled 인 특수성)
- [ ] `concord cleanup` 에서 `extraneous` 탐지 시 jsonc-morph round-trip 에서 외부 추가 항목 preserve 검증

**POC-7 (Codex CLI 공식 계약 추적)**:
- [ ] Codex `marketplace add` CLI 공식 docs 업데이트 감시 (현재 v0.121 changelog + 서드파티 요약만, semi-official 라벨)

### 결정 D FINAL (2026-04-21) — `STEP-D/01-windows-install-contract.md`
- [x] **언어 스택: TypeScript/Node.js 확정** (3 agent 리뷰: TS 유지 2/3, 조건부 Rust 1/3). 재검토 트리거 5개 (L1~L5) 기록
- [x] **9 명시 결정 (A 범주)**: D-1 install mode 입력/저장 / D-3 hook shell provider 위임 / D-4 설치 허용+실행 차단+Codex 버전 probe / D-5 drift 3 상태 / D-9 WSL=Linux, /mnt/c/=Windows / D-11 case 충돌 parse error / D-12 fallback provenance reason enum (17개) / D-14 format transform (MCP cmd /c npx wrap, Claude skills/rules 분화) / D-15 preflight 5 체크
- [x] 부록 A 라이브러리 스택 (`symlink-dir` + `fs-extra` + `graceful-fs` + `is-elevated` + `is-wsl` + `strip-bom` + `write-file-atomic` + `cross-spawn`)
- [x] 부록 B Known Issues 9 항목 (Antivirus/OneDrive/CRLF/Junction/File-lock/UNC/FAT/Windows7/PowerShell BOM)
- [x] Q4 `capability_matrix` 확장 (`install_mode` + `install_reason` + `shell_compatibility` + `drift_status`)

### 결정 E FINAL (2026-04-21) — `STEP-E/01-secret-interpolation-contract.md`
- [x] **19 명시 결정 (v2)**: E-1 OpenCode `{env:X}`/`{file:X}` 차용 / E-2 on-install eager + 축 C 트리거 / E-2a env-drift (D-5 4 상태 확장) / E-3 lock unresolved only / E-4 fail-closed + E-11 default 전제 / E-5 자산별 분리 테이블 + OpenCode 양보 / E-6 `{secret:...}` Phase 2 structured reference / E-7 allowlist 필드 / E-8 TTY 마스킹+`--json` unresolved+debug 경로 / E-9 nested 금지 / E-10 path traversal 방어 / E-11 `{env:X:-default}` Docker Compose 차용 / E-12 type coercion parse error / E-13 escape `{{env:X}}` / E-14 depth 1 / E-15 UTF-8 only / E-16 4 scope merge 순서 / E-17 error reporting resolved 금지 / E-18 target format 안전 인코딩 / E-19 Windows path 첫 콜론 구분
- [x] 결정 C §A Reserved Identifier Registry 확장 (secret backends + coerce suffix + default 변형 11 entries)
- [x] 결정 D drift 3→4 상태 확장 (env-drift 추가)
- [x] 2 agent 리뷰 (웹서치 + 독립 판단) 통합 단일 FINAL

---

## 🔜 앞으로 할 일 (Pending Tasks)

### Phase 0: Brainstorming 종결 (거의 완료)
- [x] 결정 A/B/C/D/E 모두 FINAL (2026-04-21)
- [x] 언어 스택 TypeScript/Node.js 확정 (2026-04-21)
- [x] Reserved Identifier Registry 정비 (결정 C §A, E 추가 11 entries)

### Phase 1 설계 문서화 (완료 2026-04-22)

- [x] **디자인 문서 작성** → `docs/superpowers/specs/2026-04-21-concord-design.md` (3878줄)
- [x] 스펙 자체 리뷰 (Π / Reserved / 11-component / ambiguous 동사 자동 통과)
- [x] 3-subagent 교차 리뷰 + 20건 수정 반영
- [x] (사용자 스펙 리뷰 게이트 생략 — 진행 중 gate 로 대체)

### Phase 1 POC (구현 전 병목 검증)

**결정 B 구현 시 POC**:
- [x] POC-1: TOML 3도구 벤치마크 → **`@decimalturn/toml-patch @ 1.1.1` 선정** (2026-04-22)
- [x] POC-2: `jsonc-morph` vs `jsonc-parser` → **`jsonc-morph @ 0.3.3` 선정** (2026-04-22)
- [x] POC-3: Format-preserving YAML → **`yaml @ 2.8.3` (eemeli) 확정** (2026-04-22)
- [x] POC-4: `~/.claude.json` 실제 포맷 확인 → **순수 JSON 확정, `json-key-owned` 방식 채택** (2026-04-19)

**결정 C 구현 시 POC**:
- [ ] POC-5: Plugin introspection 엔진 (Claude `plugin.json` / Codex `.codex-plugin/plugin.json` / OpenCode `package.json#main` 파싱) → `capability_matrix` 계산 정확성 골든 테스트
- [ ] POC-6: OpenCode `auto_install` vs `enabled` 의미 분리 검증 (배열 존재 = enabled 인 특수성)
- [ ] POC-7: Codex `marketplace add` CLI 공식 docs 업데이트 감시
- [ ] POC-8: `concord cleanup` 에서 `extraneous` 탐지 시 jsonc-morph round-trip 외부 추가 항목 preserve 검증

**결정 D 구현 시 POC**:
- [x] POC-9: `symlink-dir` macOS 5/5 PASS → **`symlink-dir @ 10.0.1` 선정** (2026-04-22, Plan 2A Task 15~16) / Windows DEFERRED (GitHub Actions CI matrix)
- [ ] POC-10: `concord doctor` preflight 5 체크 (Git Bash, Codex 버전, Developer Mode, AV exclusion, OneDrive) 정확성
- [ ] POC-11: Drift 4 상태 판정 로직 (source/target/divergent/env-drift) 엣지케이스

**결정 E 구현 시 POC**:
- [ ] POC-12: OpenCode `{env:X}` / `{file:X}` 공식 escape 문법 확인 (E-13 `{{env:X}}` 차용 검증)
- [ ] POC-13: 4 scope merge 순서 (enterprise/user/project/local) + 각 scope 보간 독립성 검증
- [ ] POC-14: Target format (YAML/JSON/TOML) 안전 인코딩 골든 테스트 (multi-line PEM 등)

### Phase 1 실구현

**구현 전환 절차**:
- [x] `writing-plans` 스킬로 전환 → Plan 1 Foundation (28 task) 작성
- [x] 4-plan 분할: Plan 1 Foundation / Plan 2 Sync Engine / Plan 3 Secret+Diagnostics / Plan 4 CLI 통합
- [x] `subagent-driven-development` 스킬로 Plan 1 실행 (Task 1~28 완료)
- [x] Plan 1 → main merge
- [x] **Plan 2A Round-trip POC 완료** (2026-04-22, 18 tasks, 246 tests)
  - TOML: `@decimalturn/toml-patch @ 1.1.1` / JSONC: `jsonc-morph @ 0.3.3` / YAML: `yaml @ 2.8.3` / Symlink: `symlink-dir @ 10.0.1` (macOS)
  - Branch: `feat/concord-plan-2a-round-trip-poc` → main merge / Tag: `concord-plan-2a-round-trip-poc`
- [ ] **Plan 2B Sync Engine 작성·실행** (다음 단계)
  - Config round-trip (JSONC jsonc-morph / TOML @decimalturn/toml-patch / 순수 JSON json-key-owned)
  - Fetcher 6종 (GitFetcher / FileFetcher / HttpFetcher / NpmFetcher / ExternalFetcher / AdoptedFetcher)
  - Symlink/copy installer + format transformer (D-1~D-15)
  - 제공 산출물: `concord sync` 실동작
- [ ] Plan 3 Secret + Diagnostics 작성·실행 (E-1~E-19 + doctor + cleanup + plugin introspection 완성)
- [ ] Plan 4 CLI 통합 (init/detect/adopt/import/replace/update/why + guided bootstrap + --json/TTY 분리)

**실구현 스코프 (11 컴포넌트)**:
1. [ ] **Manifest parser/validator** (yaml + zod)
   - 6 자산 타입
   - β3 옵션 α source type discriminated union
   - agentskills.io / MCP overlay prefix
   - E-1~E-19 보간 문법 파서
   - E-10 path traversal 검증
   - `concord_version: ">=X"` constraint
2. [ ] **Lock 파일 read/write**
   - roots + nodes flat graph
   - 3중 digest (source/content/catalog)
   - 자산별 필드 분리 (standard_fields/concord_fields/protocol_fields)
   - `capability_matrix` discriminated union (4 status + reason enum)
   - `install_mode`/`install_reason`/`shell_compatibility`/`drift_status`
3. [ ] **Plugin introspection 엔진**
   - Claude `plugin.json` 파싱
   - Codex `.codex-plugin/plugin.json` 파싱
   - OpenCode `package.json#main` 파싱
   - `capability_matrix` 계산
4. [ ] **Fetcher adapters**
   - `GitFetcher` / `FileFetcher` / `HttpFetcher`
   - `NpmFetcher` / `ExternalFetcher` / `AdoptedFetcher`
5. [ ] **Config file updaters (round-trip)**
   - Claude JSONC (`jsonc-morph`)
   - Codex TOML (POC-1 선정 도구)
   - OpenCode JSONC
   - `extraneous` preservation
6. [ ] **Secret 보간 엔진** (E-1~E-19)
   - `{env:X}` / `{file:X}` / `{env:X:-default}` / `{env:X?}` / `{{env:X}}` escape
   - 자산별 분리 테이블 (OpenCode 양보)
   - Reserved identifier parse error (`{secret:X}` Phase 2)
7. [ ] **Symlink/copy installer** (D-1~D-11)
   - `symlink-dir` cascade (Windows junction/hardlink)
   - Atomic staging + rename
   - Case-insensitive FS 충돌 감지
8. [ ] **Format transformer** (D-14)
   - MCP `cmd /c npx` Windows 자동 wrap
   - `.claude/skills/` copy 강제 / `.claude/rules/` symlink 허용
9. [ ] **`concord doctor`**
   - 심링크 깨짐 / hash drift / feature flag 상태
   - Drift 4 상태 (source/target/divergent/env-drift)
   - Preflight 5 체크 (D-15)
   - `extraneous` 리포트
10. [ ] **`concord cleanup`** (결정 C 섹션 6 신설)
    - opt-in, `extraneous` prune
    - atomic rollback
11. [ ] **CLI 11 명령 구현**
    - `init` / `detect` / `adopt` / `import` / `replace` / `sync` / `update` / `doctor` / `list` / `why` / `cleanup`
    - 결정 B scope 정책 + bootstrap UX
    - `--json` / TTY 분리 (Π4)
    - `concord secret debug` (E-8 debug 경로)

### Phase 2 예약 (Phase 1 완료 후)

- [ ] Cross-tool adapter 구현 (skills+MCP 우선, 85-95% ceiling)
- [ ] Translate 계층 (subagents 50-65%, commands 25-70%)
- [ ] Experimental-compile (hooks 10-30% opt-in)
- [ ] Secret backend structured reference (1Password → keychain → aws-ssm)
- [ ] `manifest_version` 재평가 (현재 P+ 유지, breaking 필요 시)
- [ ] Reserved identifier `{secret:X}` / coerce suffix / encoding 도입

---

## 🔴 핵심 리스크 & 기술 메모

### 최상위 리스크 (Codex 검토)
**Config 파일 round-trip 편집의 안전성**이 concord의 기술적 존망을 가름.
- `settings.json` (Claude, JSONC 가능) / `config.toml` (Codex) / `opencode.json[c]` (OpenCode)
- naive `JSON.parse()` → `JSON.stringify()` 또는 TOML 동일 패턴 **금지**
- 주석 유실, 순서 변경, trailing comma 파괴는 **사용자 신뢰 영구 손실**

### 주의사항
- Claude Code는 `.agents/skills/` 미지원 ([issue #31005](https://github.com/anthropics/claude-code/issues/31005)) — 표준 선언 ≠ 디렉토리 지원
- Codex hooks는 `features.codex_hooks = true` 필요 + Windows 현재 미지원
- OpenCode의 "project-local wins + warning"은 공식 계약 아닌 관찰 동작 — 의존 금지
- OpenCode는 `.opencode/skills/`, `.claude/skills/`, `.agents/skills/` 3경로 모두 native 로드

### Phase 2 cross-tool 우선순위 (2026-04-20 Codex cross-compile 리뷰 반영)

자산별 **ceiling (공식 문서 근거, task-mo77ph1w-t56nsq)**:

| 자산 | Claude→Codex | Claude→OpenCode | 전략 |
|---|---:|---:|---|
| **Skills** | 85% | 95% | Adapter (agentskills.io 표준) |
| **MCP** | 95% | 90% | Adapter (포맷 변환) |
| LSP | N/A | 80% | OpenCode 전용 Adapter |
| Subagents | 50% | 65% | Translate (lossy warning 필수) |
| Commands | 25% | 70% | Claude commands = skill alias (A5), OpenCode 만 Translate |
| Hooks | 10% | 30% | 3단계: overlay-only / unsupported / **experimental-compile** |
| Instructions | — | — | mirror/adapter 수준만 (semantics-preserving 불가) |
| **Plugins** | — | — | **asset-level 로 해체해서 처리** (β3 α 는 Phase 1 전용, Phase 2 canonical IR 은 asset-level) |

**핵심 원칙**: "90% 호환" 은 skills+MCP 중심 plugin 에만 현실적. 임의 plugin 은 aspirational. Phase 2 cross-sync 는 plugin 단위가 아니라 **asset 단위** 로 내려가야 함.

---

## 참조 문서

### ★ Primary (Phase 1 구현 기준)
- **`docs/superpowers/specs/2026-04-21-concord-design.md`** — Design spec 3878줄 (SSoT)
- **`docs/superpowers/plans/2026-04-22-concord-plan-1-foundation.md`** — Plan 1 Foundation 28 task (진행 중)
- `MEMORY.md` — 세션 연속성, 확정 결정, 구현 상태

### 5 FINAL 결정 문서
- `new-plans/01-skills.md` — 결정 A Skills Option III-tightened + A1~A5
- `new-plans/STEP-B/07-cli-and-bootstrap.md` — 결정 B CLI + scope
- `new-plans/STEP-C/04-final-plan-v2.md` — 결정 C Π1~Π7 + Q1~Q5 + §A Reserved Registry
- `new-plans/STEP-D/01-windows-install-contract.md` — 결정 D Windows Install + 언어 스택 (TS/Node)
- `new-plans/STEP-E/01-secret-interpolation-contract.md` — 결정 E 보간 문법 19 사양 (E-1~E-19)

### 조사·비교 (계보용)
- `new-plans/02-subagents.md` ~ `06-plugins.md` — 자산 타입별 비교
- `new-plans/07-overlap-matrix.md` — 종합 매트릭스
- `new-plans/08-codex-review.md` — Codex 2차 검토 결과
- `new-plans/09-corrections-and-action-items.md` — Codex 피드백 기반 후속 액션
