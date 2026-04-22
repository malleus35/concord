# Hooks — 3-Provider Comparison

공식 문서: [claude-code/hooks-guide](https://code.claude.com/docs/en/hooks-guide), [codex/hooks](https://developers.openai.com/codex/hooks), (OpenCode는 hooks 개념 없음 → plugins로 대체: [opencode/plugins](https://opencode.ai/docs/plugins/))

## 공통

| 항목 | 공통 |
|---|---|
| 개념 | 에이전트 라이프사이클의 특정 지점에서 외부 명령/스크립트 실행 |
| 이벤트 기반 | ✅ (2도구). OpenCode는 plugin function이 hook interface 구현 |

## Provider별 상이

### Claude Code
| 항목 | 값 |
|---|---|
| 위치 | `settings.json`의 `hooks:` 블록 (user/project/local/managed + plugin + skill/agent frontmatter) |
| Type | `command` \| `http` \| `prompt` \| `agent` (4종) |
| 이벤트 (25+) | `SessionStart`, `UserPromptSubmit`, `PreToolUse`, `PermissionRequest`, `PermissionDenied`, `PostToolUse`, `PostToolUseFailure`, `Notification`, `SubagentStart`, `SubagentStop`, `TaskCreated`, `TaskCompleted`, `Stop`, `StopFailure`, `TeammateIdle`, `InstructionsLoaded`, `ConfigChange`, `CwdChanged`, `FileChanged`, `WorktreeCreate`, `WorktreeRemove`, `PreCompact`, `PostCompact`, `Elicitation`, `ElicitationResult`, `SessionEnd` |
| Matcher | regex, `if` 필드 (v2.1.85+, 권한 규칙 문법) |
| 입출력 | stdin JSON / stdout JSON or exit code (0=allow, 2=block) |
| Hot reload | ✅ 자동 감지 |
| 인라인 vs 파일 | 둘 다 지원 (`command: "osascript ..."` 인라인 또는 `command: "$CLAUDE_PROJECT_DIR/hooks/x.sh"`) |
| Shell | `bash`(기본) 또는 `powershell` (Windows) |

### Codex
| 항목 | 값 |
|---|---|
| 위치 | `~/.codex/hooks.json` (user), `<repo>/.codex/hooks.json` (project) |
| Feature flag | **`[features] codex_hooks = true`** 필요 (`config.toml`) |
| Type | `command`만 (1종) |
| 이벤트 (5개) | `SessionStart`, `PreToolUse`, `PostToolUse`, `UserPromptSubmit`, `Stop` |
| Matcher | source 필드 (SessionStart), tool name (PreToolUse/PostToolUse), 나머지는 matcher 무시 |
| 입출력 | command stdout/exit code |
| Bash 제한 | **PreToolUse는 Bash 도구만 interception 가능** (MCP, Write, WebSearch 미지원) |
| Windows | **현재 미지원** (temporarily disabled) |
| 타임아웃 | 기본 600s |
| Multi-file | 모든 매칭 hooks 실행 (higher-precedence가 lower를 대체하지 않음) |

### OpenCode
| 항목 | 값 |
|---|---|
| **네이티브 hooks 개념 없음** | 대신 **plugin**이 hook interface 구현 |
| Plugin 위치 | `.opencode/plugins/` (project), `~/.config/opencode/plugins/` (global), npm package |
| Hook 이벤트 (plugin 내부) | Command, File, LSP, Message, Permission, Server, Session, Tool |
| 구현 언어 | **JavaScript/TypeScript** (`@opencode-ai/plugin` SDK) |
| 배포 | npm 패키지 (`opencode.json`의 `plugin` 배열에 등록) 또는 로컬 파일 |
| Hot reload | 명시 없음 (plugin은 일반적으로 restart) |

## 극단적 격차

| 비교 | Claude | Codex | OpenCode |
|---|---|---|---|
| 이벤트 수 | 25+ | 5 | (plugin 내 8 카테고리) |
| Hook type | 4 | 1 | N/A (plugin func) |
| 구현 매체 | 쉘 명령/스크립트/HTTP/LLM | 쉘 명령 | JS/TS 코드 |
| 도구 범위 | 모든 도구 | Bash만 | 모든 도구 |
| 플랫폼 | all | 현재 Windows 미지원 | all |

## Concord 설계 함의

1. **세 도구의 hook 구현이 근본적으로 다름** — 파일 복사·심링크로 **어떤 형태의 교차 공유도 불가**
2. **Claude Code의 hooks는 매니페스트에서 "설정 블록 병합(타입 B)"로 처리** — `settings.json`의 `hooks:` 섹션에 concord-managed 마커로 항목 삽입
3. **Codex의 hooks.json도 동일하게 "설정 블록 병합"**
4. **OpenCode의 plugins는 완전히 다른 차원** — npm 패키지 설치 또는 로컬 JS 파일 배치. Concord는 plugin entry(`opencode.json#plugin`)만 관리, plugin 자체 내용은 black box
5. **실제 스크립트 파일은 타입 A(파일 자산)**로 symlink 가능 — hook 정의(매니페스트 블록)와 스크립트 파일(파일 자산)은 분리 관리

## 결정 (Phase 1)

| Provider | Concord가 관리하는 것 |
|---|---|
| claude-code | `.claude/settings.json` 내 `hooks:` 블록 영역 (concord 마커로 구획) + `.claude/hooks/*.sh` 스크립트 파일 symlink |
| codex | `.codex/hooks.json` 또는 `~/.codex/hooks.json` 블록 + 스크립트 파일 symlink |
| opencode | `opencode.json#plugin` 배열 항목 관리만 (plugin 내부는 opaque) + `.opencode/plugins/` 로컬 plugin은 파일 자산으로 symlink |

- **Cross-tool hook 공유 완전 불가** — Phase 2에서도 시도하지 않음 (의미적 불일치가 너무 큼)
- **Phase 2 가능성**: "이벤트 추상화 레이어"로 공통 이벤트(e.g., `on_file_edit`)만 3도구 공통 생성. 하지만 lossy·leaky 확실.
