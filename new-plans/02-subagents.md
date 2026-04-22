# Subagents — 3-Provider Comparison

공식 문서: [claude-code/sub-agents](https://code.claude.com/docs/en/sub-agents), [codex/subagents](https://developers.openai.com/codex/subagents), [opencode/agents](https://opencode.ai/docs/agents/)

## 공통

| 항목 | 공통 |
|---|---|
| 개념 | 메인 컨텍스트를 오염시키지 않고 특정 작업을 위임할 수 있는 격리된 AI 워커 |
| 파일 기반 정의 | ✅ 세 도구 모두 파일 하나당 subagent 하나 |
| 필수 필드 | `name`, `description` |
| 커스텀 system prompt | ✅ 본문(markdown body) 또는 `developer_instructions`(TOML) |
| Tool 제한 | ✅ 세 도구 모두 지원 (문법 상이) |

## Provider별 상이

### Claude Code
| 항목 | 값 |
|---|---|
| 포맷 | **Markdown + YAML frontmatter** |
| Project 경로 | `.claude/agents/<name>.md` |
| User 경로 | `~/.claude/agents/<name>.md` |
| Plugin 경로 | `<plugin>/agents/<name>.md` |
| Managed | 조직 배포 경로 |
| CLI 인라인 | `--agents '{JSON}'` 플래그 (세션 한정) |
| 우선순위 | Managed > CLI > project > user > plugin |
| Frontmatter | `name*`, `description*`, `tools`, `disallowedTools`, `model`, `permissionMode`, `maxTurns`, `skills`, `mcpServers`, `hooks`, `memory`, `background`, `effort`, `isolation`, `color`, `initialPrompt` |
| 스킬 preload | `skills: [name1, name2]` — skill 전체 content가 subagent 시작 시 주입 |
| MCP 인라인 | `mcpServers:` 에 inline 정의 가능 (parent에는 노출 안 됨) |
| Hot reload | **세션 시작 시 로드** — 새 파일은 `/agents` 또는 restart 필요 |
| 제한 | 빌트인 subagent: Explore, Plan, general-purpose |
| 체이닝 | `Agent(agent_type)` 툴 문법으로 스푼 제한 |
| 메모리 | `memory: user|project|local` — 세션 간 학습 저장 |

### Codex
| 항목 | 값 |
|---|---|
| 포맷 | **TOML 전용** (Claude·OpenCode와 파일 포맷 자체 다름) |
| Project 경로 | `.codex/agents/<name>.toml` |
| User 경로 | `~/.codex/agents/<name>.toml` |
| 필드 | `name*`, `description*`, `developer_instructions*`(body 인라인), `nickname_candidates`, `model`, `model_reasoning_effort`, `sandbox_mode`, `mcp_servers`, `skills.config` |
| 스킬 연결 | `[[skills.config]] path=... enabled=...` |
| MCP 인라인 | `[mcp_servers.<name>] url=... ` TOML 테이블 |
| 체이닝 | **명시적 호출만** ("Codex only spawns a new agent when you explicitly ask") — 자식은 부모의 승인·런타임 정책 상속 |
| Hot reload | 구체 메커니즘 미상세 ("configuration layers로 로드") |

### OpenCode
| 항목 | 값 |
|---|---|
| 포맷 | **Markdown + YAML frontmatter** 또는 `opencode.json`의 `agent` 객체 (JSON) |
| Project 경로 | `.opencode/agents/<name>.md` |
| Global 경로 | `~/.config/opencode/agents/<name>.md` |
| Claude Code 호환 | ❌ `.claude/agents/` 스캔 안 함 (skills는 하지만 agents는 아님) |
| 필드 | `description*`, `mode` (primary/subagent/all), `model`, `temperature`, `permission` (ask/allow/deny for edit/bash/webfetch), `tools`, `hidden` |
| 모드 분류 | primary (Tab 전환 가능) vs subagent (@ mention 호출) vs all |
| 프롬프트 참조 | JSON에서 `prompt: "{file:./prompts/x.txt}"` |
| Hot reload | 명시 없음 |

## Concord 설계 함의

1. **포맷 이질성이 skills보다 훨씬 큼**:
   - Claude Code·OpenCode: `.md` + YAML
   - Codex: `.toml` + 인라인 body 문자열
   - → **Phase 1에서 cross-tool 자동 변환 불가**. Phase 2에서 `.md ↔ .toml` 변환기 필요
2. **Skills는 공통 경로(`.agents/skills/`) 공유 가능**했지만 **subagents는 3도구 모두 자기 고유 경로**:
   - `.claude/agents/`, `.codex/agents/`, `.opencode/agents/`
   - `.agents/agents/` 같은 공유 경로는 어느 도구도 지원 안 함
3. **Subagent의 `skills`, `mcpServers`, `hooks` 참조**: 각 도구가 자기 format으로 레퍼런스 (Claude는 `skills: [name]`, Codex는 `[[skills.config]]`). concord가 이들 cross-reference를 manifest에서 다루려면 **provider별로 번역** 필요
4. **OpenCode의 primary/subagent 모드 분리는 claude·codex에는 없는 개념** — cross-tool 포팅 시 정보 손실

## 결정 (Phase 1)

각 provider 네이티브 경로에 설치. Cross-tool 공유 경로 없음.

| | project | user |
|---|---|---|
| claude-code | `.claude/agents/` | `~/.claude/agents/` |
| codex | `.codex/agents/` | `~/.codex/agents/` |
| opencode | `.opencode/agents/` | `~/.config/opencode/agents/` |

- 포맷이 다르므로 **원본도 provider별로 따로 관리** (Phase 1)
- Phase 2에서 format translator (`.md+YAML → .toml`) 도입 고려. lossy conversion warning 필수.
