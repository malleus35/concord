# 결정 D — Windows Install Contract **[FINAL 2026-04-21]**

> **문서 지위**: 결정 D 최종 확정. Codex + 2 독립 판단 subagent + 2 웹서치 subagent (총 5 리뷰) 반영.

---

## 0. 문서 목적

concord 가 Windows 환경에서 어떻게 동작하는지의 **계약** 을 정의. 결정 C 의 Π1~Π7 불변식 위에 **9 명시 결정** + 구현 가이드 부록 + known issues 로 구성.

**전제**:
- 결정 A FINAL (Skills Option III-tightened, 2026-04-19)
- 결정 B FINAL (CLI + bootstrap, 2026-04-19)
- 결정 C FINAL (`STEP-C/04-final-plan-v2.md`, 2026-04-21)
- **언어 스택**: TypeScript/Node.js (§1 에서 확정)

---

## 1. 언어 스택 확정 — **TypeScript/Node.js**

### 1.1 배경

결정 D 설계 중 "TS vs Rust" 재고. **3 agent 검증** (Codex + 독립 판단 + 웹서치) 후 TS 유지 결정.

### 1.2 Windows 커버리지 3 agent 수렴

| Agent | TS 현재 | Rust 전환 | 증가폭 |
|---|---|---|---|
| Codex | 80-85% | 83-88% | +4-6%p |
| 독립 판단 | 80-85% | 85-90% | +5-7%p |
| 웹서치 (실증) | 80-85% | 90-93% | +8-10%p |
| **수렴** | **~82%** | **~87%** | **+5-10%p** |

**100% 불가능 근거** (3 agent 일치): provider 버그 / OS 권한 / 외부 프로세스 / 사용자 환경은 언어 무관.

### 1.3 TS 유지 결정적 근거

**1. 결정 B round-trip 손실 치명** (독립 판단 agent 결정타):

| 포맷 | TS 성숙도 | Rust 성숙도 |
|---|---|---|
| JSON/JSONC | `jsonc-parser` + `jsonc-morph` **독보적** | comment 보존 미성숙 |
| YAML frontmatter | `eemeli/yaml` **최고** | `serde_yaml` format 보존 약함 |
| TOML | 3도구 POC 필요 | `toml_edit` 강력 |

concord 6 자산 중 **3-4개 JSON/JSONC + 2개 YAML frontmatter** → Rust 전환 = 결정 B 기술 존망 직접 타격.

**2. 증가폭 +5-10%p 는 정책으로 상쇄 가능**: 아래 §3 의 D-1/D-8/D-13 + 라이브러리 스택 (`symlink-dir`/`graceful-fs`/`write-file-atomic` 등) 으로 TS 에서도 실전 85-90% 달성.

**3. AI SDK 생태계 정합**:
- Anthropic 공식 Rust SDK **없음** (커뮤니티 `anthropic-sdk-rust` 비공식, 수일-수주 지연)
- Claude Code 공식은 **TS 유지** (concord 의 주 sync 대상)
- OpenCode TypeScript/Bun
- Codex 만 예외 (Rust, 2025년 재작성) — 하지만 npm thin wrapper 로 호환

**4. 배포 UX 격차 체감 작음**: 대상 사용자 (AI 도구 개발자) 대부분 Node 보유. "Node 없이 curl" 요구 데이터 현재 없음.

### 1.4 기각된 대안

| 옵션 | 기각 사유 |
|---|---|
| (2) 완전 Rust | 결정 B round-trip 손실 (치명), Anthropic SDK 미성숙 |
| (3) 부분 Rust (N-API) | cross-compile 행렬 지옥, hot path 도 아님, 이중 빌드 툴체인 부담 |
| (4) Phase 1 TS → Phase 2 Rust | "한 번만 싸다" 함정. Phase 1 레퍼런스 구현이 lock-in |

### 1.5 재검토 트리거 (언어 재고 minority)

다음 중 하나라도 현실화되면 부분 Rust 또는 완전 전환 **재논의**:

| # | 트리거 | 확인 시점 |
|---|---|---|
| L1 | 결정 B round-trip 축소 ("단방향 생성 + 사용자 편집 보존 포기") | 결정 B 재논의 시 |
| L2 | POC 에서 symlink/atomic write 가 실제 병목 | Phase 1 첫 sprint POC |
| L3 | Windows 가 1st-tier target 격상 (사용자 Windows 비율 > 40%) | 사용자 데이터 누적 후 |
| L4 | 사용자가 "Node 없이 curl" 강하게 요구 (Codex 경험한 "Node blocker") | 피드백 누적 후 |
| L5 | Anthropic 공식 Rust SDK 출시 | 공식 docs 감시 |

---

## 2. 배경 및 전제

### 2.1 Windows 복잡도 본질 (3 agent 분석)

| 원인 | 비중 | 언어 전환으로 해결? |
|---|---|---|
| Windows 보안 모델 (UAC/Developer Mode/AV 락) | 40% | 부분 (감지는 Rust 가 유리, 정책은 OS) |
| Node.js 한계 (symlink EPERM / atomic rename 등) | 30% | **라이브러리로 해결** |
| Provider 실전 버그 (Claude #25367, Codex v0.119, OpenCode Bun) | 20% | **해결 불가** (provider 계약) |
| 사용자 환경 (Git Bash, WSL, OneDrive) | 10% | **해결 불가** (외부 프로세스) |

→ **60% 는 언어 무관**. Rust 는 주로 Node 한계 (30%) 에만 ROI.

### 2.2 결정 C Π 원칙 (참조 전제)

- **Π1** Phase 1 reproducibility contract
- **Π2** Plugin intact (관측하되 조작 X)
- **Π3** Provider-native 존중
- **Π4** Machine contract vs Human UX 분리
- **Π5** Additive evolution (default 변경 = breaking)
- **Π6** Lossy 명시 (Π4 corollary)
- **Π7** Explicit boundaries via parse error

결정 D 의 모든 조항은 Π1~Π7 과 정합해야 함.

---

## 3. 명시 결정 9개 (A 범주)

### D-1. Install Mode 입력/저장 계약

**결정**: **입력 = `install: symlink | hardlink | copy | auto`** (auto default), **저장 (lock) = 실제 적용된 구체값 + `install_reason`**.

```yaml
# manifest 입력 (ε UX)
skills:
  - source: ...
    install: auto    # 생략 시 auto

# lock 저장 (δ machine contract)
nodes:
  "claude-code:skills:foo":
    install_mode: copy           # 구체값
    install_reason: WindowsDefault  # reason enum
```

**근거**: Π1 reproducibility — 같은 lock 이 OS 별로 다르게 구체화되지 않음. 입력 UX 와 저장 contract 분리 (Codex 통찰).

**`auto` 동작 정책**:
- **Windows**: `copy` 우선. symlink 는 Developer Mode 활성 + 자산 타입 허용 시 opt-in
- **Unix**: `symlink → hardlink → copy` cascade (EPERM catch → fallback)
- **Claude `.claude/skills/` = copy 강제** (#25367 버그 우회, §D-14)
- **Claude `.claude/rules/` = symlink 허용** (공식 지원)

### D-3. Hook Shell = Provider 위임

**결정**: concord 는 hook 스크립트의 shell 선택에 **관여하지 않음**. Π2 "관측하되 조작 X", Π3 provider-native 존중.

- **Claude**: Hook 은 Git Bash 강제 (`CLAUDE_CODE_GIT_BASH_PATH` 공식). concord passthrough only
- **Codex**: Bash only (hook Windows 지원은 v0.119+)
- **OpenCode**: JS/TS plugin (shell 무관)

**Shebang 검증 0%**: Π2 경계 유지. 파일 내용은 black box.

**관측**: Q4 `capability_matrix.<provider>.<asset>.shell_compatibility` 셀 추가 (Π5 additive). Codex hook 에 `#!/bin/bash` 존재 + Windows = `shell_compatibility: incompatible, reason: ShellIncompatible`.

### D-4. 설치 허용 + 실행 차단 + Provider 버전 Probe

**결정**: Windows + provider 호환 불가 상황에서도 **설치는 허용, 실행만 차단**. Π1 reproducibility (같은 manifest + lock 이 OS 별 install 실패 없음).

**구체 로직**:
```
Windows + Codex plugin + hooks 존재 →
  1. 파일은 설치 (intact, Π2)
  2. Codex 버전 probe
     - Codex < 0.119 → capability_matrix.codex.hooks.status = "detected-not-executed"
                       + reason = "CodexVersionTooOld"
     - Codex >= 0.119 → 정상 supported
  3. doctor 가 Q2' (b) Lossy 기호 실재 경로로 경고
  4. --json 에 항상 전체 matrix + remediation hint 포함
```

**근거**: Codex CLI 의 Windows hook 은 **v0.119.0 (2026-04-10)** 에서 WindowsGate 제거. 공식 hooks docs 는 여전히 "disabled" 문구 (docs lag). **단순 OS 체크 불가, 버전 probe 필수**.

**사용자 관점 "설치 거부 vs 경고" 질문**: Π1 에 의해 **허용** 이 default. 거부는 재현성 위반.

### D-5. Drift 3 상태 모델

**결정**: Drift 를 3 상태로 분해:

| 상태 | 조건 | 대응 |
|---|---|---|
| `source-drift` | 원본만 변경 (symlink/copy 공통) | `concord sync --update` 로 반영 |
| `target-drift` | 복사본만 변경 (copy 모드 전용) | `concord doctor` 경고, user 판단 대기 |
| `divergent-drift` | 양쪽 다 변경 (copy 모드 전용) | `concord doctor` 병합 경고, 수동 해결 |

Symlink 는 `source-drift` 만 존재. Copy 는 3 상태 모두 가능.

**Q4 확장**: `capability_matrix.<...>.drift_status: none | source | target | divergent` 필드 추가 (Π5 additive).

**User-modified vs Drift 구분 불가능**: concord 는 의도 모름. Π4 에 따라 machine 은 `drift_status` 표기, human 은 doctor 경고 + 사용자 판단 위임.

### D-9. WSL 판정 규칙

**결정**:
- **WSL 감지** = `/proc/version` 또는 `/proc/sys/fs/binfmt_misc/WSLInterop` 확인 (`is-wsl` 라이브러리 사용 — §부록 A)
- **WSL = Linux 취급** (fs symlink 정상 동작)
- **`/mnt/c/` 경로 감지 시 Windows 규칙 분기** — Windows FS 는 symlink 제약 상속
- **`install_reason: WSLFilesystem`** 기록

**근거**: OpenAI Codex Windows docs 는 "WSL 권장" — concord 도 WSL 을 1급 지원. 단 `/mnt/c/` 경유는 host Windows FS 이므로 cascade fallback.

### D-11. Case-insensitive FS 충돌 = Parse Error

**결정**: manifest 에 `Hook.sh` 와 `hook.sh` 공존 시 **parse error** (Π7 적용).

**이유**:
- Windows NTFS, macOS APFS 기본 = case-insensitive
- 같은 ID 가 대소문자만 다르면 OS 별 동작 다름 (Unix 에선 분리, Windows/Mac 에선 충돌)
- 결정 A A1~A5 "names unique across all locations" (OpenCode 요구) 와 동형 패턴

**에러 메시지 템플릿**:
```
error: case-insensitive name collision
  identifiers: Hook.sh, hook.sh
  reason: Concord requires names to be unique on case-insensitive filesystems (Windows NTFS, macOS APFS).
```

### D-12. Fallback Provenance Reason Enum

**결정**: `install_reason` 은 고정 enum. 자유 문자열 금지 (K8s #50798 교훈).

**초기 enum 집합** (Q4 reason enum 과 병합):

| Reason | 발생 조건 |
|---|---|
| `UserExplicit` | 사용자가 `install: symlink \| hardlink \| copy` 명시 |
| `Auto` | auto default, symlink 성공 (Unix 또는 Windows + Developer Mode) |
| `WindowsDefault` | Windows + auto + Developer Mode 비활성 → copy |
| `NoPrivilege` | Unix 에서도 권한 부족 (EPERM) |
| `DevModeDisabled` | Windows 에서 Developer Mode 감지 실패 |
| `FsUnsupported` | FAT/exFAT 등 symlink 미지원 FS |
| `CrossDevice` | 하드링크 시도 시 다른 볼륨 |
| `CrossVolume` | 동일 개념 (하드링크) |
| `PathLimit` | 경로 260자 초과 |
| `PathTooLong` | 동일 개념 |
| `WSLFilesystem` | WSL + `/mnt/c/` 감지 |
| `CodexVersionTooOld` | Codex < 0.119 + Windows + hook |
| `WindowsUnsupported` | Codex hook Windows 미지원 (v0.119 미만) |
| `FeatureFlagDisabled` | Codex `features.codex_hooks=false` |
| `ShellIncompatible` | hook shell 과 OS 불일치 |
| `PluginJsonMissing` | introspection 실패 |
| `ParseFailed` | 동일 |
| `NetworkError` | 동일 |

**확장 정책**: additive only (Π5). enum 제거 = breaking.

### D-14. Format Transform (Provider 실전 지식)

**결정**: Windows 에서 provider-native 포맷을 자동 변환. concord 고유 로직 (언어 무관, 라이브러리 없음).

**3 변환 규칙**:

**1. MCP server `command: "npx"` Windows wrap**:
```json
// 저장된 manifest
{ "command": "npx", "args": ["-y", "@modelcontextprotocol/server-filesystem"] }

// Windows sync 시 자동 변환
{ "command": "cmd", "args": ["/c", "npx", "-y", "@modelcontextprotocol/server-filesystem"] }
```
근거: stdio transport pipe 가 `npx` 직접 호출 시 Node.js 프로세스 연결 실패 사례 다수 (SuperClaude #390, Playwright MCP #1540).

**2. Claude `.claude/skills/` symlink 강제 copy**:
- Claude Code issue #25367 — symlinked skills/ validation 실패
- Claude Code issue #36659 — symlink 시 slash command 미인식
- → Windows/macOS/Linux 공통 copy 강제 (symlink opt-in 도 거부)

**3. Claude `.claude/rules/` symlink 허용**:
- 공식 symlink 지원
- Developer Mode 활성 Windows + Unix 에서 symlink 허용

### D-15. Preflight Check (`concord doctor` 확장)

**결정**: `concord doctor` 에 Windows 환경 진단 항목 추가:

| 체크 | 실행 조건 | 결과 |
|---|---|---|
| **Git Bash 감지** | Claude hook 존재 + OS=Windows | 부재 시 경고 + `CLAUDE_CODE_GIT_BASH_PATH` 설정 안내 |
| **Codex 버전 probe** | Codex plugin + hook 존재 + OS=Windows | `< 0.119` 경고 + 업그레이드 안내 |
| **Developer Mode 감지** | manifest 에 `install: symlink` 명시 + OS=Windows | 비활성 시 경고 + auto 권장 |
| **Antivirus exclusion 안내** | 대량 파일 sync 전 | concord staging 폴더를 Defender exclusion 에 추가 안내 (선택) |
| **OneDrive 경로 감지** | install 경로가 OneDrive 하위 | 경고 + cloud-only placeholder 이슈 언급 |

**출력 정책**: Π4 — TTY 는 경고만, `--json` 은 항상 전체 체크 결과.

---

## 4. 부록 A — 구현 가이드 (B/C 범주, 결정 아님)

결정이 아니라 구현 레시피. v5 triage 에서 "라이브러리 한 줄" 로 해결되는 항목.

| 문제 | 해결 라이브러리 / 방법 |
|---|---|
| Symlink/junction cascade | **`symlink-dir`** (pnpm 공식) 또는 `fs-extra.ensureSymlink` + try-catch (EPERM → copy) |
| File copy | `fs-extra.copy` (에러 처리 내장) |
| Admin 권한 감지 | **`is-elevated`** (1 줄) |
| WSL 감지 | **`is-wsl`** (1 줄) |
| Developer Mode 감지 | Node 표준 없음 — **symlink 시도 → EPERM catch** 로 간접 감지 (표준 관행) |
| Atomic write | **`write-file-atomic`** + `graceful-fs` wrap (Windows EPERM/EBUSY retry) |
| Antivirus/OneDrive EBUSY retry | **`graceful-fs`** (rename 지수 backoff 최대 60s) |
| EOL/BOM 정규화 | `strip-bom` + `content.replace(/\r\n/g, '\n')` — write 시 LF 강제 + BOM 제거 (5 줄) |
| POSIX-only manifest 강제 | Zod validator: `/^[A-Z]:\\/i` 거부 + `path.posix.*` 만 사용 (30 줄) |
| 경로 260자 제한 | `path.resolve(p).length > 260` 체크 (1 줄) |
| UNC 경로 정규화 (Rust `dunce` 대응) | Node 는 `path.win32.normalize` — 일부 엣지 케이스는 수동 처리 |
| Junction readlink 차이 | `fs.readlink` + OS 분기 (Windows 에서 `fs.stat` 병용) |

**라이브러리 스택 (확정)**:
```json
{
  "dependencies": {
    "symlink-dir": "^6.x",
    "fs-extra": "^11.x",
    "graceful-fs": "^4.x",
    "is-elevated": "^4.x",
    "is-wsl": "^3.x",
    "strip-bom": "^5.x",
    "write-file-atomic": "^6.x",
    "cross-spawn": "^7.x"
  }
}
```

---

## 5. 부록 B — Known Issues (이슈 트래커 항목)

결정이 아닌 관찰된 엣지케이스. 구현 단계에서 각각 대응.

| 이슈 | 대응 방향 |
|---|---|
| **Antivirus EBUSY/EACCES** 간헐 | `graceful-fs` retry + 반복 실패 시 exclusion 안내 |
| **OneDrive cloud-only placeholder** | 설치 경로 OneDrive 하위 감지 시 경고 |
| **Git `core.autocrlf=true`** 자동 변환 | `.gitattributes` 에 `text eol=lf` 필수 명시 안내 (프로젝트 README) |
| **Junction readlink 비대칭** (OS 분기) | 설치 후 검증 시 `fs.stat` 병용 |
| **File locking during install** (Claude Desktop config watching) | `graceful-fs` retry + 실패 시 "close app" 안내 |
| **UNC 경로** (`\\server\share\`) | Phase 1 범위 밖, Phase 2 재평가 |
| **FAT/exFAT 외장 저장소** | `install_reason: FsUnsupported` + copy fallback |
| **Windows 7/8.1** | 공식 지원 중단 (Node.js 최신도 미지원) |
| **PowerShell UTF-16 LE + BOM** | Claude hook 에서 powershell 출력 파싱 시 BOM 제거 |

---

## 6. 결정 C 와의 통합

### 6.1 Π 원칙 적용 지도

| Π | 결정 D 에서의 적용 |
|---|---|
| **Π1** Reproducibility | D-1 lock 에 구체값 + reason 저장, D-4 설치 허용 (OS 무관 재현성) |
| **Π2** Plugin intact | D-3 shebang 검증 0%, D-5 user-modified 판정 불가 인정 |
| **Π3** Provider-native | D-3 shell 위임, D-14 format transform (provider 계약 존중) |
| **Π4** Machine vs Human | D-4 `--json` 전체 matrix, D-5 machine=drift_status/human=doctor 경고 |
| **Π5** Additive | Q4 capability_matrix 확장 (install_mode/shell_compatibility/drift_status), reason enum additive 확장 |
| **Π6** Lossy 명시 | D-12 reason enum 고정 (자유 문자열 금지) |
| **Π7** Explicit boundaries | D-11 case collision parse error |

### 6.2 Q4 `capability_matrix` 확장 (Π5 additive)

```yaml
# 결정 D 반영된 lock 구조
capability_matrix:
  claude-code:
    skills:
      status: supported
      count: 2
      install_mode: copy             # ◀ D-1 (Claude skills symlink 버그 우회)
      install_reason: WindowsDefault  # ◀ D-12
      shell_compatibility: ok        # ◀ D-3
      drift_status: none             # ◀ D-5
    hooks:
      status: supported
      count: 3
      install_mode: symlink
      install_reason: Auto
      shell_compatibility: ok
      drift_status: source
  codex:
    hooks:
      status: detected-not-executed
      count: 0
      detected: 1
      reason: CodexVersionTooOld     # ◀ D-4 Codex 버전 probe
      install_mode: copy
      install_reason: WindowsDefault
      shell_compatibility: incompatible
      drift_status: none
```

### 6.3 결정 B 와의 연계

- 결정 B `raw_hash` + `normalized_hash` → 결정 D 의 EOL/BOM 정규화 정책에 재사용
- 결정 B CLI 11 명령 (`init/detect/adopt/import/replace/sync/update/doctor/list/why/cleanup`) 에 D-15 preflight 항목 추가
- `concord doctor` 출력은 결정 B `--json` 기계 계약 + D-4/D-5/D-15 인간 경고

---

## 7. Phase 1 실구현 체크리스트 (결정 D 항목)

- [ ] D-1 `install` 필드 Zod 스키마 + lock `install_mode` / `install_reason` 저장
- [ ] D-1 `auto` 동작 분기 (Windows copy first, Unix cascade, Claude skills 강제 copy)
- [ ] D-3 hook shell passthrough (공식 provider 필드 유지)
- [ ] D-3 Q4 `shell_compatibility` 관측 로직
- [ ] D-4 Codex 버전 probe (spawn `codex --version` + semver 비교)
- [ ] D-4 `detected-not-executed + reason + remediation` doctor 경고
- [ ] D-5 drift 3 상태 판정 (source/target/divergent)
- [ ] D-5 Q4 `drift_status` 필드
- [ ] D-9 WSL 감지 (`is-wsl`) + `/mnt/c/` 판정
- [ ] D-11 case-insensitive 충돌 parse error
- [ ] D-12 reason enum JSON Schema 단일 validator
- [ ] D-14 MCP `cmd /c npx` Windows 자동 변환
- [ ] D-14 Claude `.claude/skills/` copy 강제
- [ ] D-14 Claude `.claude/rules/` symlink 허용
- [ ] D-15 preflight 5 체크 (Git Bash / Codex 버전 / Developer Mode / AV exclusion 안내 / OneDrive 경고)
- [ ] 부록 A 라이브러리 스택 통합 (`symlink-dir` 등 8 개)
- [ ] 부록 B 엣지케이스 retry/경고 로직
- [ ] 골든 테스트: Windows/macOS/Linux 각각 sync → lock 일관성 검증
- [ ] 골든 테스트: `.gitattributes` CRLF → LF 보존 검증

---

## 8. Minority Report

### 8.1 언어 재고 재검토 트리거 (5개)

§1.5 참조. L1~L5 중 하나라도 현실화 시 Rust 전환 재논의.

### 8.2 결정 D 관련 미결

| 항목 | 해결 시점 |
|---|---|
| Developer Mode 감지 정확도 (Windows API 직접 호출 필요 시) | Phase 1 POC |
| OneDrive 경로 정확한 감지 규칙 (`$env:OneDrive` / 하위 판단) | 구현 단계 |
| `.gitattributes` 자동 생성 vs 문서 안내만 | UX 리뷰 시 |
| PowerShell BOM 파싱 특수 처리 필요 범위 | Phase 1 POC |
| UNC 경로 지원 | Phase 2 재평가 |
| Windows 7/8.1 지원 범위 | Phase 1.5 (Node.js 지원 정책 따라) |
| 부분 Rust native module (hot path) 검토 | POC 병목 확인 시 |

### 8.3 3 agent 권고 엇갈림 (기록)

- Codex + 독립 판단 (2/3): **TS 유지** 권고 (채택)
- 웹서치 (1/3): **조건부 Rust 전환** (Codex CLI 모델) — L1~L5 트리거 시 재고 대상

---

## 9. 참조

### 9.1 결정 C 상위 문서
- `STEP-C/04-final-plan-v2.md` — Π1~Π7 + Phase 1/2 책임 분할 + Reserved Identifier Registry
- `STEP-C/05-section8-final-selection.md` — v1/v2 비교 + v2 공식 채택

### 9.2 결정 B 상위 문서
- `STEP-B/07-cli-and-bootstrap.md` — CLI 11 명령 + round-trip 편집 정책

### 9.3 결정 A 상위 문서
- `01-skills.md` — Skills Option III-tightened + A1~A5

### 9.4 3 agent 리뷰 (결정 D v1 → v5)
- Codex 독립 판단 (짧은 prompt 패턴, hang 방지)
- 독립 판단 subagent (Π 원칙 기반 논리 검증)
- 웹서치 subagent — npm/pnpm/yarn/Git/Cargo/Deno/uv 선례 (Subagent A)
- 웹서치 subagent — claude-code/codex/opencode Windows 지원 실증 (Subagent B)
- 웹서치 subagent — Rust CLI Windows 커버리지 실증 (언어 재고)

### 9.5 핵심 외부 사실
- **Codex v0.119.0** (2026-04-10): Windows hook WindowsGate 제거
- **Claude Code `.claude/skills/`** symlink 버그 #25367 / #36659 (미해결)
- **Claude hook = Git Bash 강제** (`CLAUDE_CODE_GIT_BASH_PATH` 공식)
- **OpenAI Codex CLI** TS → Rust 재작성 (2025년, 95.7%)
- **MCP `cmd /c npx` Windows wrap** 관행 (SuperClaude #390)

---

## 10. 문서 계보

| 문서 | 지위 |
|---|---|
| **`01-windows-install-contract.md`** | **★ 결정 D FINAL (2026-04-21) ★** |

(결정 B/C 와 달리 결정 D 는 복잡도 중간 + 5 agent 리뷰 통합으로 단일 버전 확정)

---

**End of 결정 D.**
