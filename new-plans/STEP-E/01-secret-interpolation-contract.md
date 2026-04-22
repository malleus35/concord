# 결정 E — Secret Interpolation Contract **[FINAL 2026-04-21]**

> **문서 지위**: 결정 E 최종 확정. 웹서치 + 독립 판단 2 subagent 리뷰 반영. 결정 D 패턴 단일 FINAL.

---

## 0. 문서 목적

concord manifest (`concord.yaml`) 에 **환경변수 / 파일 / secret 보간 문법** 을 정의. 결정 C Π1~Π7 위에 **19 명시 결정 (E-1~E-19)** 로 구성.

**전제**:
- 결정 A FINAL (Skills Option III-tightened, 2026-04-19)
- 결정 B FINAL (CLI + bootstrap, 2026-04-19)
- 결정 C FINAL (`STEP-C/04-final-plan-v2.md`, 2026-04-21)
- 결정 D FINAL (`STEP-D/01-windows-install-contract.md`, 2026-04-21)
- **언어 스택**: TypeScript/Node.js (결정 D §1)

---

## 1. 배경 및 설계 원칙

### 1.1 정체성

concord 는 AI 도구 config 에 **secret (GitHub 토큰, API 키) + env 변수 + 파일 내용** 을 안전하게 삽입해야 함. 직접 secret 을 저장하지 않고 **reference** 만 보관.

### 1.2 Π 원칙 적용 지도

6/7 Π 접촉 (결정 D 와 동급 복잡도):

| Π | 결정 E 적용 |
|---|---|
| **Π1** Reproducibility | Lock 에 unresolved expression 저장 (secret 노출 방지). Template + env 의존성 목록 고정 |
| **Π2** Plugin intact | 자산 파일 내용 (skill.md, hook.sh) 미보간. provider/shell 위임 |
| **Π3** Provider-native | OpenCode `{env:X}` / `{file:X}` 차용. OpenCode 자산에서는 concord 양보 (대칭) |
| **Π4** Machine vs Human | TTY 마스킹 vs `--json` unresolved only. Debug 경로 분리 |
| **Π6** Lossy 명시 | Missing var = fail-closed (default). Warning 로 은폐 금지 |
| **Π7** Explicit boundaries | 중첩 보간 / path traversal / 허용 필드 outside = parse error |

### 1.3 Complexity 재평가

Preview 8개 → 2 subagent 리뷰 후 **19개** 로 확장. 결정 D 와 동형 구조.

---

## 2. 19 명시 결정 (E-1 ~ E-19)

### E-1. 문법: OpenCode `{env:X}` / `{file:X}` 차용

**결정**: `{scheme:value}` 중괄호 + 콜론 구분자 mini-DSL. OpenCode 차용.

```yaml
plugins:
  - source:
      type: claude-plugin
      url: "{env:CORP_NPM_REGISTRY}/plugins/github-mcp"
mcp_servers:
  - env:
      GITHUB_TOKEN: "{env:GITHUB_TOKEN}"
      API_KEY: "{file:~/.config/concord/api-key}"
```

**차용 정당성** (3 축):
1. **PowerShell `$env:X` 충돌 회피** — `{env:X}` (중괄호) 는 PowerShell 문법과 독립
2. **확장성** — `{file:X}`, `{secret:X}` (Phase 2) 동일 꼴 일관
3. **AI 생태계 일관성** — OpenCode 가 차용 대상 provider (Π3)

**주의**: `${VAR}` 가 업계 압도적 관행이고 `{env:X}` 는 소수파. AI 도구 스코프 내에서만 일관성.

### E-2. 보간 시점 — On-install eager + 축 C 트리거 명시

**결정**: **On-install eager** — concord 가 파일을 native 경로에 쓸 때 resolve. Lock 은 unresolved 저장.

**축 C 트리거 (재실행 semantic)**:

| 트리거 | 동작 |
|---|---|
| `concord sync` | env 재평가, 모든 보간 대상 재치환. **매번 최신 env 반영** |
| `concord update` | 동일 (source 변경 포함) |
| `concord doctor` | env 재평가, drift 4상태 검사 (E-2a) |
| `concord cleanup` | 보간 관여 없음 |

**Π1 corollary (신설)**: "Lock 은 resolved bytes 가 아니라 **template + env 의존성 목록** 을 고정." 같은 lock + 다른 env = 다른 설치 결과 = 의도된 비대칭 (secret 보호).

### E-2a. Drift 4상태 (결정 D D-5 확장)

**기존** (결정 D D-5): `source-drift` / `target-drift` / `divergent-drift` / `none`

**결정 E 확장**: **`env-drift`** 추가

| 상태 | 조건 | 대응 |
|---|---|---|
| `env-drift` | manifest/source 불변 + env 값 변경 + target 파일 구 env 값 보유 | `concord sync` 재실행 시 자동 반영. doctor 는 정보 표시 |

**판정 로직**:
```
매 trigger 시 (sync/update/doctor):
  1. env 재평가
  2. 각 interpolation site 의 resolved 값 계산
  3. target 파일의 현재 값과 비교
  4. 다르면 env-drift 표시 (source-drift 와 구분)
```

### E-3. Lock 저장 정책

**결정**: **Unresolved expression 만 저장**. Resolved value 절대 lock 에 기록 금지.

**Hash 정책**:
- `raw_hash` = unresolved expression 기준 (결정 B)
- `normalized_hash` = unresolved + 표준화 (LF/BOM) 기준
- **`rendered_hash` 도입 안 함** — resolved 기준 hash 는 Π1 secret 보호 위반. Drift 감지는 E-2a env-drift 로 처리

**선례**: npm package-lock.json / cargo Cargo.lock / pip requirements.txt — 모두 unresolved only 저장.

### E-4. Missing Variable — Fail-closed (E-11 default 문법 전제)

**결정**: `{env:X}` 는 **required** (fail-closed). Missing 시 parse error.

**에러 메시지**:
```
error: environment variable not set
  location: concord.yaml:42:15
  expression: {env:GITHUB_TOKEN}
  remediation: Set GITHUB_TOKEN in your environment, or use {env:GITHUB_TOKEN:-default}
```

**`--allow-missing-env` 전역 flag 제거**: Π7 "경계는 선언적" 원칙. Optional 은 E-11 문법으로 선언.

**선례**: GitHub Actions "silent empty" 악명 높은 함정 회피. Concord 는 **설정 apply 도구** — silent empty = 잘못된 config 가 쓰여짐.

### E-5. Provider-native 보간 — 자산별 분리 테이블

**결정**: 문법 구분 + **자산별 분리 테이블** + **OpenCode 대칭 양보**.

| 자산 | concord 보간 | provider 보간 | 정책 |
|---|---|---|---|
| `concord.yaml` manifest (E-7 allowlist) | ○ | × | concord 전용 |
| Claude `.claude/settings.json` | ○ (allowlist) | × | concord 가 provider config 에 resolve 된 값 기록 |
| Claude hook `command` 내부 `${CLAUDE_PROJECT_DIR}` | × | × (shell) | **passthrough only** |
| **OpenCode `opencode.json`** | **×** (OpenCode 가 한다) | ○ | **Π3 양보** (이중 치환 방지) |
| OpenCode plugin 내부 | × | ○ | provider 영역 |
| MCP `env` 블록 | ○ (manifest side) | — | concord on-install 에서 resolve |
| 자산 파일 내용 (skill.md, hook.sh) | × | × (provider/shell) | Π2 intact |
| skill.md **YAML frontmatter** | × (E-7 회색지대) | — | provider 가 알아서 (Π2+Π3) |

**OpenCode 대칭 양보** (독립 판단 지적): OpenCode 가 `{env:X}` 를 네이티브 지원하므로 concord 가 `opencode.json` 에 보간하면 **이중 치환**. concord 는 OpenCode 자산에서 문법 인식만 하고 보간 X.

### E-6. Phase 2 Reserved — `{secret:...}` Structured Reference 예정

**결정**: `{secret:...}` 는 **Phase 2 reserved identifier** (결정 C §A 등재). Phase 1 등장 시 parse error.

**Phase 2 설계 방향**: K8s `secretKeyRef` 선례 차용 — 단순 URI 가 아닌 structured field:

```yaml
# Phase 2 예시 (Phase 1 미지원)
mcp_servers:
  - env:
      GITHUB_TOKEN:
        secretRef:
          provider: "1password"
          vault: "Work"
          item: "GitHub"
          field: "token"
```

**Phase 1 Reserved Identifier** (결정 C §A 추가):
- `{secret:keychain://...}` — macOS Keychain
- `{secret:aws-ssm://...}` — AWS SSM Parameter Store
- `{secret:1password://...}` — 1Password CLI
- `{secret:azure-kv://...}` — Azure Key Vault
- `{secret:gcp-sm://...}` — GCP Secret Manager

**Phase 2 우선순위**: 1Password → keychain → aws-ssm (`op` CLI shellout 가장 쉬움, AWS SDK 부담 큼).

### E-7. 보간 허용 필드 — Allowlist

**결정**: **명시적 allowlist**. 모든 문자열 필드 보간 X.

**허용 필드**:

| 필드 종류 | 보간 | 예 |
|---|---|---|
| `source.url` / `source.repo` | ✅ | `url: "{env:CORP_REGISTRY}/..."` |
| `source.ref` / `source.version` | ✅ | `ref: "{env:PLUGIN_REF}"` |
| `env.*` (MCP, hooks) | ✅ | `GITHUB_TOKEN: "{env:GH_TOKEN}"` |
| `authHeader` / `headers.*` | ✅ | `Authorization: "Bearer {env:API_KEY}"` |
| `command` 문자열 (MCP) | ❌ (Π2, provider 위임) | — |
| `id` / `name` | ❌ (식별자, Π7 parse error) | — |
| `install` / `scope` / `enabled` | ❌ (동작 제어 필드, parse error) | — |
| 자산 파일 내용 | ❌ (Π2 intact) | — |
| skill.md YAML frontmatter | ❌ (회색지대, provider 가 처리) | — |

**선례**: GitHub Actions 는 `env:` / `with:` / `run:` 등 제한적 문맥에서만 expression 허용.

### E-8. `--json` vs TTY + Debug 경로 분리

**결정**:

| 출력 | 내용 |
|---|---|
| TTY (human) | secret 값 **마스킹** (`***`). Unresolved expression 그대로 |
| `--json` (machine) | **Unresolved expression 만**. Resolved value 절대 금지 |
| `concord secret debug --env=X` | TTY only interactive. **Audit log 기록**. Resolved value 사용자 요청 시만 |

**자동 log masking**: GitHub Actions 수준 구현 복잡. Concord 는 **provider 실행 주체 아님** (logs 는 provider 가 생성) → 과잉 구현.

### E-9. 중첩 보간 — 금지 (Parse Error)

**결정**: `{env:TOKEN_FOR_${env:ENV_NAME}}` 같은 nested = **parse error**.

**근거**:
- Π5 additive 복잡도 폭탄 (nested parsing grammar 재귀)
- Docker Compose 도 nested 미지원 (선례)
- 구현 난이도 ↑ + 보안 리스크 (user injection)

**에러 메시지**:
```
error: nested interpolation not allowed
  expression: {env:TOKEN_FOR_${env:ENV_NAME}}
  remediation: Flatten to single-level expression
```

### E-10. Path Traversal 방어 — Project Root Whitelist

**결정**: `{file:X}` 경로는 **project root 하위** 로 제한.

**검증 로직**:
```typescript
const resolved = path.resolve(projectRoot, filePath);
if (!resolved.startsWith(projectRoot)) {
  throw new ParseError('path traversal detected');
}
```

**허용 예외**:
- `~/.config/concord/**` — 사용자 config 디렉토리 (명시 허용)
- `~/.concord/**` — concord user home

**금지 예**:
```yaml
api_key: "{file:../../etc/passwd}"   # ❌ parse error
```

**Π1 보호**: project 외부 파일 참조 = 사용자별 다른 내용 = reproducibility 붕괴.

### E-11. Default 값 문법 — `{env:X:-default}`

**결정**: **Docker Compose 차용** `{env:X:-default}` 지원. E-4 fail-closed 의 실용 전제.

**문법 변형** (Phase 1 3개):

| 문법 | 의미 |
|---|---|
| `{env:X}` | Required (unset/empty 시 parse error) |
| `{env:X:-default}` | Unset/empty 시 `default` 치환 |
| `{env:X?}` | Optional marker — unset 시 empty string, placeholder 유지 안 함 |

**Phase 2 reserved** (결정 C §A):
- `{env:X-default}` (colon 없음, unset-only) — 미묘한 차이 함정
- `{env:X:?error message}` — 명시 에러 메시지

**효과**: E-4 의 `--allow-missing-env` 전역 flag 불필요. Π7 선언성 확보.

### E-12. Type Coercion — String Only, Parse Error

**결정**: `{env:X}` / `{file:X}` 결과는 **항상 string**. 숫자/bool 필드에 보간 시 **parse error**.

**금지 예**:
```yaml
# ❌ parse error
timeout: "{env:TIMEOUT_MS}"          # timeout 은 number 필드
retry_enabled: "{env:RETRY_FLAG}"    # bool 필드
```

**Phase 2 Reserved** (결정 C §A): `{env:X|int}`, `{env:X|bool}`, `{env:X|float}` coerce suffix.

**근거**: YAML/JSON type 과 string 혼용 = silent failure 원흉.

### E-13. Escape 문법

**결정**: 리터럴 `{env:X}` 는 **`{{env:X}}`** (이중 브레이스) 로 escape.

```yaml
description: "Use {{env:FOO}} for env variable interpolation"
# → 출력: "Use {env:FOO} for env variable interpolation"
```

**근거**: OpenCode escape 관행 조사 후 일관성 유지 (Phase 1 POC 에서 공식 확인 필수). 임시로 이중 브레이스 채택.

**Minority**: OpenCode 공식 escape 문법 확인 시 조정 가능.

### E-14. 보간 Depth 한계 — 1단계만

**결정**: `{file:config.txt}` 결과 내부에 `{env:X}` 가 있어도 **재귀 보간 X**.

**이유**:
- Π1 reproducibility 단순화
- 구현 난이도 ↑
- 보안 리스크 (user injection)

**사용자 의도**: 파일 내용을 템플릿화하려면 별도 도구 (direnv, envsubst) 사용.

### E-15. Encoding — UTF-8 Only, Binary 는 Phase 2

**결정**:
- `{file:X}` 는 **UTF-8 파일만** 지원. 비-UTF8 = parse error
- Binary 지원은 **Phase 2 reserved**: `{file:X|base64}` (결정 C §A)

**근거**: AI 도구 config 는 UTF-8 텍스트가 기본. Binary (바이너리 PEM/keystore) 는 Phase 2 에서 structured reference 로 처리.

**BOM 처리**: `strip-bom` (결정 D 부록 A) 으로 BOM 제거 후 검증.

### E-16. Merge/Override 순서

**결정**: 결정 B 4 scope layering (enterprise/user/project/local) 에서 **각 scope 자체 보간 → merge** 순서.

**Kustomize 교훈 회피**: overlay 의 보간이 base 보간에 영향 주지 않음.

**순서**:
1. Enterprise scope manifest 읽기 → 보간 resolve
2. User scope manifest 읽기 → 보간 resolve
3. Project scope manifest 읽기 → 보간 resolve
4. Local scope manifest 읽기 → 보간 resolve
5. 4 scope merge (결정 B precedence 규칙)

**Merge 후 재보간 없음**: 보간은 **자기 scope 내 env 만** 참조.

### E-17. Error Reporting — Resolved Value 절대 미출력

**결정**: 모든 error/log/telemetry 출력에서 **resolved value 절대 금지**. Unresolved expression 만.

**예시**:
```
# ❌ 잘못된 에러 메시지
error: failed to write file with content "ghp_abc123..."

# ✅ 올바른 에러 메시지
error: failed to write file
  content: <interpolated from {env:GITHUB_TOKEN}>
  reason: EACCES
```

**Telemetry**: Resolved value 도, hash 도 금지 (rainbow table 위험). Reason enum / status 만.

**Audit log**: `concord secret debug` 명령 실행 시 who/when/what 기록. Resolved value 자체는 기록 금지.

### E-18. 보간 결과 Target Format 안전 인코딩

**결정**: concord 가 보간 결과를 **target 파일 포맷** (YAML/JSON/TOML) 에 안전하게 삽입하는 책임.

**케이스**:

| 시나리오 | 처리 |
|---|---|
| Multi-line PEM in YAML | YAML block scalar (`|` 또는 `>`) + indent 정렬 |
| Shell special chars in JSON | JSON string escape (`\"`, `\\`, `\n`) |
| TOML string escape | TOML basic string escape (`\"`, `\\`) |
| Quote 혼합 | target 포맷 convention 따라 자동 |

**구현**: target 포맷별 formatter 책임. `jsonc-parser` / `eemeli/yaml` / `@shopify/toml-patch` (결정 B 라이브러리 스택) 의 API 활용.

### E-19. Windows Path 파싱 — 첫 번째 `:` 만 Scheme 구분자

**결정**: `{scheme:value}` 파서는 **첫 번째 콜론만 구분자**로 인식.

**예**:
```yaml
cert_file: "{file:C:/Users/alice/cert.pem}"
# → scheme = "file", value = "C:/Users/alice/cert.pem"
```

**결정 D 정합성**:
- POSIX-only manifest (D-6) 원칙: Windows literal `C:\` = parse error
- 하지만 `C:/` (forward slash) 는 허용 (Node.js `path.posix` 호환)
- `{file:X}` 내부 value 는 E-10 path traversal 검증도 통과해야 함

---

## 3. 결정 C/D 와의 통합

### 3.1 결정 C Π 원칙 전체 적용

| Π | 관련 E-x |
|---|---|
| Π1 Reproducibility | E-3 lock unresolved, E-2a env-drift, E-10 project root whitelist |
| Π2 Plugin intact | E-5 자산 파일 content 미보간, E-7 frontmatter 위임 |
| Π3 Provider-native | E-1 OpenCode 차용, E-5 OpenCode 자산 양보 |
| Π4 Machine vs Human | E-8 `--json`/TTY/debug 경로 |
| Π5 Additive | E-6 `{secret:...}` Phase 2 예약, E-11 default 추가 |
| Π6 Lossy 명시 | E-4 fail-closed (silent empty 금지), E-17 error 투명성 |
| Π7 Explicit boundaries | E-9 nested parse error, E-10 path traversal, E-11 선언적 optional |

### 3.2 결정 C Reserved Identifier Registry 확장 (§A)

**Phase 1 parse error 등재 추가**:

| Identifier | 예약 이유 | Phase 2 의미 |
|---|---|---|
| `{secret:keychain://...}` | macOS Keychain | E-6 Phase 2 |
| `{secret:aws-ssm://...}` | AWS SSM | E-6 Phase 2 |
| `{secret:1password://...}` | 1Password CLI | E-6 Phase 2 (우선순위 1) |
| `{secret:azure-kv://...}` | Azure Key Vault | E-6 Phase 2 |
| `{secret:gcp-sm://...}` | GCP Secret Manager | E-6 Phase 2 |
| `{env:X|int}` | Type coerce | E-12 Phase 2 |
| `{env:X|bool}` | 동일 | E-12 |
| `{env:X|float}` | 동일 | E-12 |
| `{file:X|base64}` | Binary encoding | E-15 Phase 2 |
| `{env:X-default}` (colon 없음) | Docker Compose 변형 | E-11 Phase 2 |
| `{env:X:?error}` | Strict error 메시지 | E-11 Phase 2 |

### 3.3 결정 D 와의 교차

| 결정 D 항목 | 결정 E 연동 |
|---|---|
| D-5 drift 3 상태 | **E-2a env-drift 추가** → 4 상태 |
| D-6 POSIX-only manifest | E-19 `{file:C:/}` forward slash 허용 |
| D-12 reason enum | E-4 fail-closed 시 `reason: EnvVarMissing` 추가 |
| D-15 preflight | `concord doctor` 에 E-2a drift 검사 추가 |

### 3.4 결정 B 와의 교차

- Lock `raw_hash` / `normalized_hash` 는 **unresolved 기준** (E-3)
- `rendered_hash` 도입 안 함 (secret 보호)
- 4 scope merge (E-16): 각 scope 자체 보간 → merge
- `concord doctor` CLI 에 E-2a drift 검사 추가

---

## 4. Phase 1 실구현 체크리스트

- [ ] E-1 `{env:X}` / `{file:X}` 파서 (첫 번째 콜론 구분자, E-19)
- [ ] E-2 on-install eager 보간 + 축 C 트리거 로직
- [ ] E-2a `env-drift` 4 상태 판정 (D-5 확장)
- [ ] E-3 Lock 에 unresolved 저장 (hash 는 unresolved 기준)
- [ ] E-4 Fail-closed + 에러 메시지 템플릿 (reason enum: `EnvVarMissing`)
- [ ] E-5 자산별 보간 분리 테이블 구현 (OpenCode 양보 포함)
- [ ] E-6 `{secret:...}` Reserved Identifier parse error (결정 C §A 등재)
- [ ] E-7 Allowlist Zod 스키마 (source/env/authHeader/headers 만)
- [ ] E-8 TTY 마스킹 + `--json` unresolved + `concord secret debug` 구현
- [ ] E-9 Nested `{env:...${env:X}...}` parse error
- [ ] E-10 Path traversal 검증 (`path.resolve` + whitelist)
- [ ] E-11 Default 문법 `{env:X:-default}` + `{env:X?}` 파서
- [ ] E-12 Type coercion parse error (숫자/bool 필드에 string 보간 거부)
- [ ] E-13 Escape 문법 `{{env:X}}` + OpenCode 공식 확인 POC
- [ ] E-14 Recursion 금지 (1 단계만 resolve)
- [ ] E-15 UTF-8 검증 (비-UTF8 `{file:X}` parse error)
- [ ] E-16 4 scope 각자 resolve → merge 순서
- [ ] E-17 Error/log/telemetry 에 resolved value 금지 (정책 + 테스트)
- [ ] E-18 Target format (YAML/JSON/TOML) 안전 인코딩 (block scalar / escape)
- [ ] E-19 Windows path (`{file:C:/Users/...}`) 파싱 테스트
- [ ] `concord doctor` 에 E-2a env-drift 검사 추가
- [ ] 결정 C Reserved Identifier Registry (§A) 업데이트
- [ ] 골든 테스트: 보간 + drift + merge 전 시나리오

---

## 5. Minority Report

### 5.1 미결 항목

| 항목 | 해결 시점 |
|---|---|
| OpenCode 공식 escape 문법 (E-13) | Phase 1 POC — 공식 docs 확인 |
| `{env:X?}` optional marker 실제 semantic (empty string vs omit field) | Phase 1 POC |
| `{env:X:-default}` 의 default 값이 보간 가능한가? | Phase 1 POC — 권고: X (단순화) |
| E-18 target format encoding 엣지케이스 (매우 긴 PEM, escape 조합) | 구현 단계 |
| E-2a env-drift 감지 정확도 (특히 default 문법 `{env:X:-Y}`) | 구현 단계 |

### 5.2 2 agent 리뷰 엇갈림 (기록)

- **독립 판단**: Preview 8개 Major 재작업. E-2 축 C / E-5 자산 분리 / E-11 default 필수
- **웹서치**: OpenCode 소수파 지적. Structured reference (K8s) Phase 2 권고

두 리뷰 모두 v2 19개 sub-decision 확장 권고 → **채택**.

### 5.3 재평가 트리거

다음 중 하나라도 현실화 시 결정 E 재논의:

- OpenCode 가 `{env:X}` 문법 deprecate 또는 breaking change
- Phase 2 `{secret:...}` 실구현에서 structured reference 로 전환 필요 판명
- 사용자가 nested 보간 강하게 요구 (현재 E-9 금지)
- Path traversal 엣지케이스 (symlink 우회 등) 발견

---

## 6. 참조

### 6.1 결정 C/D 상위 문서

- `STEP-C/04-final-plan-v2.md` — Π1~Π7 + Reserved Identifier Registry (§A 에 결정 E reserved 추가 예정)
- `STEP-D/01-windows-install-contract.md` — Windows install contract (E-19 path 파싱 교차)

### 6.2 2 agent 리뷰 (결정 E v1 → v2)

- 독립 판단 subagent — Π 원칙 기반 논리 검증 (web 없이)
- 웹서치 subagent — 10 도구 선례 조사 + 생태계 실증 (OpenCode/Compose/K8s/Actions/Terraform/1Password/sops/direnv/npm/cargo)

### 6.3 핵심 선례

- **OpenCode** `{env:X}` / `{file:X}` — 문법 차용 원본
- **Docker Compose** `${VAR:-default}` — E-11 default 문법 차용
- **Kubernetes `secretKeyRef`** — E-6 Phase 2 structured reference 방향
- **1Password CLI `op://`** — E-6 Phase 2 우선순위 1
- **Terraform state 반면교사** — lock 에 resolved 저장 금지
- **GitHub Actions silent empty** — E-4 fail-closed 정당화
- **K8s conditions** — reason enum 고정 선례 (결정 C §A 확장 근거)

---

## 7. 문서 계보

| 문서 | 지위 |
|---|---|
| **`01-secret-interpolation-contract.md`** | **★ 결정 E FINAL (2026-04-21) ★** |

(결정 D 와 동일하게 2 agent 리뷰 통합 단일 버전 확정)

---

**End of 결정 E.**
