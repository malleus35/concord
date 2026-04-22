# B-1 — `concord sync` 의미론 (FINAL)

> **참고**: CLI 명령 세트, bootstrap, scope 정책 전체는 [`07-cli-and-bootstrap.md`](07-cli-and-bootstrap.md) 가 최종 확정본. 이 문서는 **상태 머신 상세** 에 집중.

## 상태 머신

`concord sync` 는 manifest 의 각 asset entry 에 대해 다음 상태 중 하나를 판정하고 action 을 수행.

### 기본 상태 (정상 경로)

| 상태 | 조건 | 동작 |
|---|---|---|
| **install** | manifest 에 선언됨 + lock 에 없음 + 타겟 경로에 없음 | fetch → 타겟에 설치 → lock 기록 |
| **update** | manifest 에 선언됨 + lock 에 있음 + **source hash 변경됨** | 기존 제거 → fetch → 재설치 → lock 갱신 |
| **prune** | lock 에 있음 + manifest 에 없음 (**단 partial filter 투영 후 desired-set 기준**) | 타겟에서 제거 → lock 에서 삭제 |
| **skip** | manifest 에 선언됨 + lock 에 있음 + hash 동일 + drift 없음 | 무동작 |

### 이상 상태 (에러 또는 사용자 확인 필요)

| 상태 | 조건 | 동작 |
|---|---|---|
| **drift-detected** | 타겟의 content_hash ≠ lock 기록. **normalized_hash 기준 비교 후 raw_hash 차이만 있으면 silent-update** (formatter false-positive 회피) | 기본: block + 사용자 확인. `--force`/`--preserve`/`--adopt`/`--diff` 플래그로 해결 |
| **orphan** | 타겟 파일 존재 + lock 에 없음 + manifest 에 없음 | `concord doctor` 에서 경고, `concord sync` 는 무시. `concord adopt` 로 편입 가능 |
| **shadowed** | 동일 id 가 높은 precedence scope (enterprise > user > project > local) 에 존재 — 현재 scope 의 entry 가 런타임에 읽히지 않음 | 경고 출력 + skip. `concord why <id>` 로 shadowing 체인 확인 |
| **scope-conflict** | 같은 id 가 두 scope 에 존재 + `alias:`/`override: true` 지정 안 됨 | **에러 (sync 중단)**. 사용자가 alias/override 로 해결 |
| **readonly-managed** | 타겟 파일이 enterprise managed (권한/ACL) 이고 현재 사용자가 쓸 수 없음 | 경고 + skip. `concord doctor` 에 항목 추가 |
| **marker-broken** | marker comment 가 손상·삭제됨 (marker ID + hash suffix 검증 실패) | `--repair` 옵션 제안, 아니면 block |

### Partial Prune 의미론

`--scope X` 또는 `--asset Y` 필터 사용 시, `prune` 은 **"필터 투영 후 desired-set 기준"** 으로 수행.

예: `concord sync --scope project` — project manifest 의 entry 들만 desired-set. project 에 있는 lock entry 가 현재 manifest 에 없으면 prune 대상. user/enterprise lock entry 는 **이 명령에서 건드리지 않음**.

### Partial Sync 동시 실행

동시에 `concord sync --scope user` 와 `concord sync --scope project` 실행 시:

| 정책 | 결정 |
|---|---|
| **전역 단일 lock (`.concord.lock.pid`)** | Phase 1 기본. 두 번째 실행은 `EBUSY` 즉시 실패 |
| per-scope lock | Phase 1.5 고려 (동시성 요구 확인 후) |

이유: lock 파일 1개를 두 프로세스가 동시에 쓰는 경쟁 조건이 더 위험.

---

## CLI 명령 세트 요약 (상세는 `07-cli-and-bootstrap.md`)

### Tier 1 — Bare sync (deterministic)
```bash
concord sync                              # project scope 기본
concord sync --scope user                 # 단일 scope
concord sync --scope user,project,local   # CSV 다중 (kubectl 패턴)
# concord sync --all                        ← 제거됨 (Phase 1)
```

### Tier 2 — Explicit source
```bash
concord sync --file ./concord.user.yaml              # 파일명 → user scope 자동 추론
concord sync --url https://.../concord.enterprise.yaml --sha256 abc...
                                                       # URL → enterprise scope 추론, digest pin 필수
```

### 기타 플래그
| 플래그 | 동작 |
|---|---|
| `--dry-run` | 수행될 action 목록만, 파일 변경 없음 |
| `--force` | drift 덮어쓰기 허용 (자동 백업 생성) |
| `--preserve` | drift 감지된 entry skip + 경고 |
| `--adopt` | 현재 타겟 상태를 새 source 로 인정 (lock 의 content_hash 갱신) |
| `--diff` | drift 감지 항목 diff 만 출력 후 종료 (read-only) |
| `--asset X` | asset 타입 필터 |
| `--yes` / `CONCORD_NONINTERACTIVE=1` | 인터랙티브 prompt skip (guided bootstrap 에서) |

---

## 원자성(atomicity) 보장

**원칙**: `concord sync` 1회 실행의 모든 변경은 **전부 성공하거나 전부 롤백**.

### 구현 전략 (Phase 1 = 백업 기반, Phase 2 = 2-phase commit)

1. **Staging phase**:
   - 변경될 모든 파일을 임시 경로 (`$TMPDIR/concord-<sessionId>/`) 에 먼저 생성
   - config 파일은 편집된 새 내용을 임시 파일에 작성 (원본 손대지 않음)
   - symlink·copy·config edit 모두 staging 단계에서 미리 계산

2. **Commit phase**:
   - 각 타겟 파일에 대해 원본을 `*.concord.bak` 으로 백업
   - 스테이징 파일을 atomic `rename(2)` 로 타겟 이동
   - lock 파일도 마지막에 atomic rename
   - 전부 성공 시 백업 삭제

3. **Failure handling**:
   - Staging 중 실패: 임시 파일 정리 후 종료, 타겟 무변경
   - Commit 중 실패: 실행된 rename 을 역순으로 `.bak` → 원본 복원
   - Phase 2+: journaled write-ahead log 로 완전한 2PC

### Concurrency — 락 파일

- `.concord.lock.pid` 파일로 `flock()` 기반 배타 락
- 동시 실행 2개 시 나중에 시작한 것은 **즉시 실패** (`EBUSY`)
- CI 환경에서는 명시적으로 sequential 보장

---

## Partial sync 의미

| 플래그 | 동작 |
|---|---|
| `--scope X` | scope X 에 속한 entry 만 상태 판정·action. 나머지는 lock 기록 유지 |
| `--scope X,Y,Z` | CSV 다중 지정 |
| `--asset X` | asset 타입 X 만 (cross-scope) |
| `--file <path>` | 외부 파일 기반 sync (파일명에서 scope 추론) |
| `--url <url> --sha256 <h>` | URL 기반 sync (digest pin 필수) |

**주의**: partial sync 후에도 lock 파일의 다른 entry 는 그대로 유지. drift 감지는 partial 범위 내에서만 수행.

---

## Dry-run 계약

- **반드시 read-only**: 어떤 파일도 쓰지 않음 (임시 파일 포함)
- 출력 포맷: action 목록 + reason code + 예상 변경 파일 경로
- JSON 모드 (`--dry-run --format json`): CI 파이프라인용

---

## Guided Bootstrap (첫 실행)

**조건**: lock 없음 + manifest 있음

```
$ concord sync
ℹ️ No concord.lock found — first run detected.

  Will perform:
    1. Detect installed agents (claude-code, codex, opencode)
    2. Initialize concord.lock
    3. Sync N entries from concord.yaml

  Continue? [Y/n]
```

| 모드 | 동작 |
|---|---|
| TTY | confirm prompt |
| `--yes` | skip |
| `CONCORD_NONINTERACTIVE=1` | skip |
| non-TTY + flag 없음 | **error** (guided bootstrap 강제 interactive) |

---

## Rollback (Phase 1.5)

Phase 1 에서는 `.concord.bak` 기반 **암묵적 복원** 만 (실패 시 자동). 명시적 `concord rollback` 명령은 Phase 1.5 로 이관.

---

## `concord.lock` Git 전략

- **commit 권고** (npm-ci 스타일, 팀 재현성)
- `concord.local.yaml` 은 gitignored 이지만 **lock 은 tracked**
- Phase 1.5: merge driver (JSON/YAML mergetool) 도입 예정

---

## 종결된 Open Decision

- ✅ `concord.lock` git commit: **commit** 권고 확정
- ✅ `--all` 제거: CSV 다중 지정으로 대체
- ✅ 자동 `git add concord.lock`: **기본 off**, 사용자 수동 처리

남은 POC 질문은 [`05-open-questions.md`](05-open-questions.md).
