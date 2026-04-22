# Skills — 3-Provider Comparison

공식 문서 교차 확인: [claude-code/skills](https://code.claude.com/docs/en/skills), [codex/skills](https://developers.openai.com/codex/skills), [opencode/skills](https://opencode.ai/docs/en/skills/)

## 공통 (표준화 가능한 부분)

| 항목 | 모든 provider 공통 |
|---|---|
| 단위 | 하나의 skill = 하나의 디렉토리 + `SKILL.md` 파일 |
| 포맷 | YAML frontmatter + Markdown body |
| 필수 필드 | `name`, `description` |
| 자동 디스커버리 | ✅ 파일 드롭하면 세션 내 자동 로드 |
| 표준 | [Agent Skills open standard (agentskills.io)](https://agentskills.io) 준수 선언 |
| 중첩 로딩 | CWD → git root까지 상위 순회하여 추가 스캔 (세 도구 공통 패턴) |

## Provider별 상이

### Claude Code
| 항목 | 값 |
|---|---|
| Project 경로 | `.claude/skills/<name>/SKILL.md` |
| User 경로 | `~/.claude/skills/<name>/SKILL.md` |
| Enterprise 경로 | managed settings 경로 |
| Plugin 경로 | `<plugin>/skills/<name>/SKILL.md` (namespace: `plugin-name:skill-name`) |
| `.agents/skills/` 스캔 | ❌ ([issue #31005](https://github.com/anthropics/claude-code/issues/31005)) |
| Frontmatter 필드 | `name`, `description`, `disable-model-invocation`, `user-invocable`, `allowed-tools`, `model`, `effort`, `context`, `agent`, `hooks`, `paths`, `shell`, `argument-hint`, `when_to_use` |
| Hot reload | ✅ Live change detection (top-level skills 디렉토리 신규 생성 시만 restart) |
| 비활성화 | `disable-model-invocation: true` 또는 `/permissions`에서 `Skill(name)` deny |
| 우선순위 | enterprise > personal > project (같은 이름 충돌 시) |

### Codex
| 항목 | 값 |
|---|---|
| Project 경로 | `$CWD/.agents/skills/`, `$CWD/../.agents/skills/`, `$REPO_ROOT/.agents/skills/` |
| User 경로 | `$HOME/.agents/skills/` |
| Admin 경로 | `/etc/codex/skills/` |
| System 경로 | Codex 번들 (OpenAI 제공) |
| Legacy 호환 | `$CODEX_HOME/skills` (`~/.codex/skills`) |
| Symlink 지원 | ✅ 공식 명시 ("follows the symlink target") |
| Frontmatter 필드 | `name`, `description` (핵심). 추가 필드 문서상 명시 적음 |
| Hot reload | 대개 자동 감지, 감지 실패 시 restart |
| 비활성화 | `~/.codex/config.toml`의 `[[skills.config]] path=... enabled=false` |
| 중복 처리 | **merge 안 함, 둘 다 selector에 노출** |
| Installer | `$skill-installer <name>` (GitHub URL 수용), `$skill-creator` (생성용) |

### OpenCode
| 항목 | 값 |
|---|---|
| Project 경로 | `.opencode/skills/`, `.claude/skills/`, `.agents/skills/` (3개 모두 스캔) |
| Global 경로 | `~/.config/opencode/skills/`, `~/.claude/skills/`, `~/.agents/skills/` |
| Name 정규식 | `^[a-z0-9]+(-[a-z0-9]+)*$` (1-64자, colon/underscore 불가) |
| Description | 1-1024자 |
| Frontmatter 필드 | `name`, `description`, `license`, `compatibility`, `metadata` |
| 권한 | `opencode.json`의 `permission.skill` 맵 (`allow`/`deny`/`ask`, glob 지원) |
| 중복 처리 | project-local 이김 + console 경고 로깅 |
| 이름 요구사항 | **"Ensure skill names are unique across all locations"** (Troubleshoot 공식) |
| Hot reload | 자동 디스커버리 (일부 변경은 restart 권장) |

## Concord 설계 함의

1. **`.agents/skills/`는 Codex+OpenCode의 교집합 — Claude Code는 제외**
2. **Skill 공유 시 OpenCode "이름 유일성" 공식 제약 주의** — 공용 경로에 뿌리면 `.opencode/`와 충돌 가능
3. **Claude Code만 plugin namespace 지원** — 다른 두 도구는 naming conflict 회피 메커니즘 없음
4. **Frontmatter 필드 교집합** = `name` + `description` — concord가 이 이상을 요구하면 포팅성 떨어짐
5. **모르는 필드는 무시 정책** (관대한 파서) 덕분에 Claude Code 전용 필드를 넣어도 Codex/OpenCode는 실패 안 함 — 하지만 의미는 무효

## 결정 (FINAL) — Option III-tightened + 5개 명시 조항

**Status**: 승인 완료 (2026-04-19)

| | project | user |
|---|---|---|
| claude-code | `.claude/skills/` | `~/.claude/skills/` |
| codex | `.agents/skills/` | `~/.agents/skills/` |
| opencode | `.opencode/skills/` | `~/.config/opencode/skills/` |

### 핵심 규칙
- **opt-in `target: shared-agents`**: codex·opencode 섹션에 한해 `.agents/skills/` 공유 설치 허용
- **claude-code + `shared-agents`**: parse error
- **Phase 2 cross-tool**: 별도 adapter subsystem (이 shared-agents는 그 씨앗이 아님)

### 추가 조항 (FINAL)

| # | 조항 | 근거 |
|---|---|---|
| **A1** | `shared-agents` opt-in 시, 해당 skill은 `.agents/skills/`에만 설치. `.opencode/skills/`에 **중복 배치 금지** (이동 시맨틱, 복사 금지) | OpenCode 공식 "names unique across all locations" 제약 ([docs](https://opencode.ai/docs/en/skills/)) |
| **A2** | `.opencode/skills/`와 `.agents/skills/`에 동일 skill 존재 시 → **`.agents/skills/` 우선**. concord는 `.opencode/` 쪽을 자동 제거하거나 sync 시 경고/중단 | OpenCode가 3경로 모두 native 로드. 명시적 우선순위로 혼동 방지 |
| **A3** | Monorepo nested `.claude/skills/` (e.g., `packages/frontend/.claude/skills/`) 지원은 **Phase 2+**. Phase 1은 프로젝트 루트 단일 배치만 | Claude Code가 자동 nested 스캔 지원 확인 ([docs](https://code.claude.com/docs/en/skills)). concord Phase 1 범위 관리 |
| **A4** | [Issue #31005](https://github.com/anthropics/claude-code/issues/31005) OPEN 상태 트래킹. Anthropic이 `.agents/skills/` 지원 추가 시 shared-agents 대상 확장 가능. **Phase 1은 parse error 유지** | 7개월째 Anthropic 응답 0. 단기 변경 가능성 낮음 |
| **A5** | `.claude/commands/*.md`는 skill의 별칭 — concord에서 **별도 asset type으로 다루지 않음** | Claude Code 공식: "Custom commands have been merged into skills" ([docs](https://code.claude.com/docs/en/skills)) |

### 미승인 사항 (Phase 2 검토)
- Claude `paths` frontmatter (glob-based 조건부 로드)
- Claude `shell: powershell` (Windows) — 결정 D로 이관
- `--add-dir` 디렉토리 내 `.claude/skills/` 자동 로드 (예외)
