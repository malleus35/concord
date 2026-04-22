# B-7 — CLI 명령 세트 + Bootstrap + Scope 정책 (FINAL)

**상태**: 확정 (2026-04-19, codex + general 리뷰 3라운드 거쳐 승인)

이 문서는 결정 B 의 **사용자 대면 UX 전체** 를 한 곳에 모은 확정본. STEP-B 의 다른 문서들 (`01-sync-semantics.md`, `03-drift-and-lock.md`) 은 이 문서의 UX 결정과 일관되게 업데이트됨.

---

## 용어 정책 (확정)

| 영역 | 용어 |
|---|---|
| CLI flag | `--scope` |
| 내부 코드 타입 | `ConfigScope` (JS/TS "scope" 충돌 회피) |
| 문서 | "scope" 통일 |
| 병합 순서 설명 | **`precedence`** (별도 용어) — "scope" 는 영역 구분, "precedence" 는 우선순위 |

과거 "layer" 용어는 전부 "scope" 로 sweep. 파일 검색: `grep -ri "layer" new-plans/STEP-B/` 후 정리.

---

## 4 Scope 정의 (재확인)

| Scope | 파일 위치 (canonical) | Manifest 파일명 | 특징 |
|---|---|---|---|
| **enterprise** | `~/.concord/` | `concord.enterprise.yaml` | 조직 배포. 일반 사용자는 명시 opt-in 만 |
| **user** | `~/.concord/` | `concord.user.yaml` | 개인 전역 (모든 프로젝트 공통) |
| **project** | `<project>/` | `concord.yaml` **또는** `concord.project.yaml` (둘 다 허용, alias) | 팀 공유, git-tracked |
| **local** | `<project>/` | `concord.local.yaml` | 개인 머신 튜닝, gitignored, never-default |

### Locality 규칙
- **project/local**: cwd 기준 탐색
- **user/enterprise**: canonical 경로 (`~/.concord/` 또는 discovery 순서)
- cwd 에서 `concord.user.yaml`/`concord.enterprise.yaml` 발견 시: 경고 + "정말 이 경로로 진행?" 확인

### Discovery 순서 (override 가능)
```
1. $CONCORD_HOME (env var, 최우선)
2. ~/.concord/
3. $XDG_CONFIG_HOME/concord/ (XDG 표준)
4. ~/.config/concord/ (XDG fallback)
5. %APPDATA%\concord\ (Windows)
```

---

## Phase 1 명령 세트 (확정)

```
# 시작 & 진단
concord init [--scope <s>]       # 빈 manifest scaffold (scope 선택)
concord detect                    # 설치된 agent 감지 (~/.concord/.detect-cache.json 기록, manifest 안 건드림)

# Manifest 조작 (add/remove 는 Phase 2+로 이관)
concord adopt [<path>] [--scope <s>]  # 기존 시스템 자산 → manifest 등록 (terraform import 시맨틱)
concord import <file|--url>           # 외부 manifest 의 entry 병합 (충돌 시 prompt)
concord replace <file|--url>          # 외부 manifest 로 통째 교체 (자동 백업)
concord update [<id>]                  # source 재fetch (drift 감지 시)

# 적용
concord sync [--scope <s>]            # manifest → provider 타겟 적용
concord sync --file <path>             # 명시 파일 sync (파일명에서 scope 추론)
concord sync --url <url> --sha256 <h>  # URL sync (digest pin 필수)

# 진단·조회
concord doctor                         # drift / marker / feature flag / schema / orphan 진단
concord list [--scope <s>]             # 설치된 entry 목록
concord why <id>                       # entry 출처·체인 추적
```

### Phase 2+ (재검토)
- `concord add <source>` — 원자적 fetch + install + register (cross-tool-sync 범위 확정 후 재평가)
- `concord remove <id>` — manifest + 타겟 동시 제거
- `concord rollback` — 직전 sync 되돌리기
- `concord bootstrap` — 신규 머신 셋업 one-shot (별도 명령으로 분리, `--all` 대신)

### Phase 2+ 재검토 근거
- concord 핵심 가치 = **"multi-provider drift 감지·동기화"** (패키지 매니저 아님)
- Provider 공식 도구 (`claude mcp add`, `codex mcp add`, OpenCode `opencode.json#plugin`) 가 이미 install 담당
- chezmoi / brew bundle / helm 이 동일 "분리 모델" 로 프로덕션 검증
- Phase 1 risk 축소 (multi-provider fetch/install 로직 구현 부담 경감)

---

## `concord sync` — 2-Tier CLI 모델

### Tier 1 — Bare sync (deterministic)

```bash
concord sync                              # project scope (기본)
concord sync --scope user                 # 단일 scope
concord sync --scope user,project,local   # CSV 다중 지정 (kubectl 패턴)
# concord sync --all                        ← 제거됨 (Phase 1 에서)
```

- **bare `concord sync` 는 항상 project scope** — 예측 가능성
- `--scope` 로 명시 시 엄격 (파일 없음 = 에러, 단 enterprise 는 warn + skip)
- "모든 scope" 필요 시: CSV 다중 지정 (`--scope user,project,local`)

### Tier 2 — Explicit source (파일명 자동 scope 추론)

```bash
concord sync --file ./concord.user.yaml
# → 파일명 "user" → scope=user 자동 추론 (명시 불필요)

concord sync --url https://github.com/.../concord.enterprise.yaml --sha256 abc...
# → 파일명 "enterprise" → scope=enterprise 자동 추론 + digest pin 필수
```

- `--file` 또는 `--url` 컨텍스트에서만 파일명 자동 추론 허용
- URL sync 는 **`--sha256` digest pin 필수** (또는 lock TOFU + diff confirm)
- `https://` 만 Phase 1 에서 허용

---

## `concord adopt` — Context-aware + Terraform apply 패턴

### 기본 동작 (D-W1: context-aware)

```bash
$ cd ~  # 아무 repo 아님
$ concord adopt
  → scope: user (no concord.yaml/concord.project.yaml in cwd)
  → Found 3 candidates in ~/.claude/skills/, ~/.agents/skills/
  → Apply? [y/N]

$ cd ~/my-project  # concord.yaml 있음
$ concord adopt
  → scope: user + project (project manifest detected)
  → Found 3 in ~, 2 in ./.claude/skills/
  → Apply? [y/N]
```

### 정책 매트릭스

| 조건 | 기본 scope | 이유 |
|---|---|---|
| cwd 에 project manifest 존재 | **user + project** | 팀 멤버 (~35%) 세그먼트 최적 |
| cwd 에 project manifest 없음 | **user 만** | Solo (~40%) 세그먼트 자연스러움 |
| `--scope X` 명시 | X 만 | 사용자 의도 override |
| `--scope enterprise` | 명시 + 권한 precheck | never-default |
| `--scope local` | 명시 | never-default (gitignored 실험 영역) |

### Terraform apply 패턴 (확정 UX)

```
$ concord adopt
Scanning user + project...
Found 5 candidates:
  + user:    claude-code:skills:code-reviewer  @ ~/.claude/skills/code-reviewer
  + user:    codex:skills:commit-msg           @ ~/.agents/skills/commit-msg
  + project: claude-code:skills:lint-checker   @ .claude/skills/lint-checker
  + project: claude-code:mcp:airtable          @ .mcp.json (via block-merge)
  ℹ️ Note: OpenCode also reads ~/.claude/skills/ natively (cross-path observation)

Apply these changes to manifests? [y/N] █
```

| Mode | 동작 |
|---|---|
| **기본 (TTY)** | preview + y/N prompt |
| `--yes` or `--write` | prompt skip, 즉시 적용 |
| `--dry-run` | preview 만, 확정 안 함 |
| **non-TTY (CI), flag 없음** | conservative fail (exit 1 + 안내) |

### Project manifest 없을 때 (TTY / non-TTY 분기)

**TTY**:
```
$ concord adopt
No project manifest found in cwd.
Create one at ./concord.yaml? [y/N]
```

**non-TTY (CI)**:
```
$ concord adopt
ERROR: project manifest missing. Run `concord init --scope project` first.
exit 1
```

`--init` 플래그로 CI 에서도 auto-create 허용.

### 자산 위치 vs scope 매핑 (Phase 1: 위치 1:1 + cross-path 경고)

```
<proj>/.claude/skills/x/   →  project manifest + provider=claude-code
~/.claude/skills/x/        →  user manifest + provider=claude-code
```

**Cross-path 감지 (Phase 1)**: OpenCode 가 `~/.claude/skills/` 도 native 로 읽는 등의 사실은 **경고 + `concord doctor` 에 리포트**. 실제 provider 등록은 1:1 유지.

**Phase 2+**: provider 다중화 (1 자산 → `providers: [claude-code, opencode]`) 는 cross-tool adapter 시점에 재평가.

---

## Guided Bootstrap — 첫 실행 플로우

### 조건: lock 없음 + manifest 있음

```
$ concord sync
ℹ️ No concord.lock found — first run detected.

  Will perform:
    1. Detect installed agents (claude-code, codex, opencode)
    2. Initialize concord.lock
    3. Sync 5 entries from concord.yaml

  Continue? [Y/n]
```

| 모드 | 동작 |
|---|---|
| **기본 (TTY)** | confirm prompt |
| `--yes` | prompt skip |
| `CONCORD_NONINTERACTIVE=1` | 환경변수로 비대화 (CI 용) |
| **non-TTY, flag 없음** | error (guided bootstrap 강제 interactive) |

### `detect` 의 역할

- **read-only** — manifest 안 건드림
- 결과 저장: `~/.concord/.detect-cache.json` (gitignored)
- 감지 내용: agent 설치 여부, 버전, 경로, 권한, feature flag (e.g., `features.codex_hooks`)
- `concord sync` / `doctor` 가 detect cache 참조

---

## `concord import` / `replace` — 외부 manifest 결합

### import (entry 단위 병합)

```bash
$ concord import ./friend-concord.user.yaml
$ concord import --url https://github.com/.../concord.user.yaml --sha256 abc...

  Found 5 entries in external manifest:
    + skills:code-reviewer       (new)
    + mcp:airtable               (conflict: already in your user.yaml)
  
  conflict resolution for mcp:airtable:
    [k]eep mine  [r]eplace  [a]lias  [s]kip  ?
```

- 내 manifest 를 **format-preserving 편집** (jsonc-morph yaml 버전)
- 기존 entry 와 주석 보존
- 충돌 시 사용자 결정
- URL 지원 + `--sha256` digest pin

### replace (통째 교체)

```bash
$ concord replace ./friend-concord.user.yaml
  Will replace ~/.concord/concord.user.yaml entirely.
  Backup: ~/.concord/concord.user.yaml.bak.2026-04-19-103045
  Continue? [y/N]
```

- 자동 백업 (`.bak.<timestamp>`)
- URL 지원 + `--sha256` digest pin

---

## URL 기반 sync/import/replace 보안 모델

### Phase 1 (즉시)

| 요구 | 상태 |
|---|---|
| `https://` 스킴만 허용 | ✅ |
| `--sha256 <hash>` 필수 OR lock TOFU 기록 | ✅ |
| 첫 fetch dry-run + diff + y/N confirm | ✅ |
| Redirect 추적 표시 (final URL + host + digest) | ✅ |
| 파일명에서 scope 자동 추론 | ✅ |

### Phase 1.5

- Enterprise scope URL → **allowlist 강제** (조직 도메인 화이트리스트)
- Audit log 기록 (URL + digest + timestamp)

### Phase 4 (cross-tool adapter 시점)

- cosign / minisign signature 검증
- Registry / marketplace 통합

### 위협 모델 (선례)

- [Brew Hijack 사건](https://www.koi.ai/blog/brew-hijack-serving-malware): host 탈취 → 다음 fetch 악성
- [kubectl apply URL](https://www.elastic.co/guide/en/security/8.19/kubectl-apply-pod-from-url.html): 보안팀 공격 패턴 분류
- skill/hook = **코드 실행에 가까운 자산** → `curl | bash` 안티패턴 회피 필수

---

## Scope 간 동작 요약표

| 작업 | default scope | 참고 |
|---|---|---|
| `concord sync` | project | bare sync deterministic |
| `concord adopt` | cwd 기준 자동 (user 또는 user+project) | context-aware |
| `concord init` | interactive prompt | "어느 scope?" |
| `concord doctor` | 모든 감지된 scope | 진단 범위 확장 |
| `concord list` | 모든 감지된 scope | 조회 |

### Enterprise / Local (never-default)
- 항상 `--scope enterprise` 또는 `--scope local` 명시 필요
- Enterprise: 권한 precheck + 경고
- Local: gitignored 영역, 개인 책임

---

## 사용자 시나리오 walk-through

### Scenario A — Solo 개발자 처음 사용
```bash
$ concord init --scope user                    # ~/.concord/concord.user.yaml 생성 + $EDITOR
$ concord adopt                                # user 만 스캔 (cwd 프로젝트 아님)
  → y/N confirm → manifest 등록
$ concord sync --scope user                    # 실제 설치 (ensure)
```

### Scenario B — 팀 멤버 기존 repo 도입
```bash
$ cd ~/team-project                            # concord.yaml 이미 있음
$ concord adopt                                # user + project context-aware 스캔
  → y/N confirm → 양쪽 manifest 등록
$ concord sync                                 # project 기본 sync
$ git add concord.yaml concord.lock            # 팀 공유
```

### Scenario C — 친구가 공유한 manifest 받기
```bash
$ concord import --url https://.../concord.user.yaml --sha256 abc...
  → diff 표시 → y/N → 내 user.yaml 에 entry 병합
$ concord sync --scope user
```

### Scenario D — 완전 신규 머신
```bash
$ concord sync                                  # lock 없음 → guided bootstrap
  ℹ️ First run detected. Will detect agents + init lock + sync 5 entries. [Y/n]
  → y → 자동 진행
```

---

## 참조

- `00-overview.md` — 개요, Phase 1/1.5/2 분할
- `01-sync-semantics.md` — 상태 머신 상세 (install/update/prune/skip + drift/orphan/shadowed/scope-conflict/readonly-managed/marker-broken)
- `02-config-round-trip.md` — Format-preserving 편집 아키텍처
- `03-drift-and-lock.md` — Lock 스키마 + raw/normalized hash
- `04-testing-strategy.md` — Golden + property + integration test
- `05-open-questions.md` — 남은 POC 항목 (TOML 3도구 벤치마크)
- `06-review-findings.md` — 누적 리뷰 결과
