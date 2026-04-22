# Plugins — 3-Provider Comparison

공식 문서: [claude-code/plugins-reference](https://code.claude.com/docs/en/plugins), [codex/plugins](https://developers.openai.com/codex/plugins), [codex/plugins/build](https://developers.openai.com/codex/plugins/build), [opencode/plugins](https://opencode.ai/docs/plugins/)

## 공통

| 항목 | 공통 |
|---|---|
| 목적 | 번들 단위로 여러 확장(skill/agent/hook/MCP/rules)을 묶어 설치/배포 |
| enable/disable | ✅ 세 도구 모두 |

## Provider별 상이

### Claude Code
| 항목 | 값 |
|---|---|
| 구성 | `<plugin>/skills/`, `<plugin>/agents/`, `<plugin>/commands/`, `<plugin>/hooks/hooks.json`, `<plugin>/.mcp.json` 또는 `plugin.json` |
| 설치 | `/plugin install` (marketplace 또는 URL) |
| 관리 | `/plugin` UI |
| Skill namespace | `plugin-name:skill-name` (자동 prefix) |
| MCP 자동 | 플러그인 활성화 시 MCP 서버 자동 시작 |
| 제한 | plugin subagent는 `hooks`, `mcpServers`, `permissionMode` frontmatter 무시 (보안) |
| 변수 | `${CLAUDE_PLUGIN_ROOT}`, `${CLAUDE_PLUGIN_DATA}` |

### Codex
| 항목 | 값 |
|---|---|
| 구조 | `<plugin>/.codex-plugin/plugin.json` (필수) + `<plugin>/skills/` + `<plugin>/.mcp.json` + `<plugin>/.app.json` + `<plugin>/assets/` |
| Manifest 필수 | `name`, `version`, `description` |
| Manifest 선택 | `author`, `homepage`, `repository`, `license`, `keywords`, `skills`(경로), `mcpServers`(경로), `apps`(경로), `interface` 객체(설치 화면 메타) |
| 캐시 경로 | `~/.codex/plugins/cache/<marketplace>/<plugin>/<version>/` |
| Marketplace | **`.agents/plugins/marketplace.json`** (project) 또는 `~/.agents/plugins/marketplace.json` (user) |
| 개발 도구 | `$plugin-creator` (로컬 marketplace 자동 생성), `$skill-installer` (skill 전용) |
| 비활성화 | `~/.codex/config.toml`의 `[plugins."name@openai-curated"] enabled = false` |
| 배포 | "Self-serve plugin publishing and management are coming soon" — 현재 공식 배포 미제공 |
| 포함 가능 | skills, apps(GitHub/Slack/Google Drive 등), MCP servers |

### OpenCode
| 항목 | 값 |
|---|---|
| 구조 | 단일 JS/TS 파일 또는 npm 패키지. `package.json`의 entry만 준수 |
| 설치 | `opencode.json`의 `plugin: ["name"]` 배열에 추가 → Bun이 npm에서 자동 설치 |
| 캐시 | `~/.cache/opencode/node_modules/` |
| 위치 | `.opencode/plugins/` (project 로컬), `~/.config/opencode/plugins/` (global) |
| Hook 기반 확장 | Command, File, LSP, Message, Permission, Server, Session, Tool 이벤트 |
| SDK | `@opencode-ai/plugin` (TypeScript) |
| Custom tools | `tool()` 헬퍼로 커스텀 tool 정의 |
| 번들 가능 | **MCP/Skill 번들 공식 명시 없음** — 주로 hooks + custom tools |

## 번들 범위 비교

| 번들 포함 자산 | Claude | Codex | OpenCode |
|---|---|---|---|
| Skills | ✅ (`skills/`) | ✅ (`skills/`) | ❓ (명시 없음) |
| Subagents | ✅ (`agents/`) | ❌ (plugin에 agent 명시 없음) | ❓ |
| Hooks | ✅ (`hooks/hooks.json`) | ❌ (별개 시스템) | ✅ (plugin이 곧 hook 구현) |
| MCP | ✅ (`.mcp.json`/plugin.json) | ✅ (`.mcp.json`) | ❓ |
| Commands | ✅ (`commands/`) | ❌ | ❓ (skill로 통합) |
| Apps | ❌ | ✅ (GitHub/Slack 등 외부 앱) | ❌ |

## 설치 메커니즘 극단 차이

| | Claude | Codex | OpenCode |
|---|---|---|---|
| 배포 단위 | 파일 묶음 (marketplace 또는 URL) | 파일 묶음 (coming soon) | **npm 패키지** |
| 캐시 위치 | plugin 디렉토리 | `~/.codex/plugins/cache/...` | `~/.cache/opencode/node_modules/` |
| 언어 제약 | - | - | **JS/TS** 필수 |
| Registry | 내부 marketplace | 내부 marketplace | npm registry |

## Concord 설계 함의

1. **Plugin은 "번들 단위 타입 D"** — concord는 **개별 자산 레벨 추적**이 어려움 (내부는 black box)
2. **Concord가 관리하는 정보**:
   - 어느 plugin이 어느 provider에 설치됐는지 (manifest + lock)
   - plugin 활성화/비활성화 상태
   - 버전 pin
3. **Concord가 관리하지 않는 정보**:
   - plugin 번들 내부 자산 (내부 skills/agents/hooks의 상세)
   - plugin의 런타임 사이드 이펙트
4. **패턴 3종 (이전 결정)**:
   - **α Wrap**: `bundles:` 섹션에서 npm/marketplace 선언 → concord가 설치 명령 대행
   - **β Adopt**: 이미 설치된 plugin을 track만
   - **γ Disassemble**: plugin repo의 개별 자산을 `source: gh:...#.opencode/skills/x` 같이 직접 끌어옴 (plugin 메커니즘 우회)
5. **OpenCode plugin은 hooks 대체물이므로 특별 취급** — `.opencode/plugins/` 내부 파일 자체는 파일 자산으로 symlink 관리 가능 (JS/TS 소스 공유)

## 결정 (Phase 1)

| Provider | Plugin 처리 경로 | 메커니즘 |
|---|---|---|
| claude-code | `bundles:` 섹션의 선언을 `plugin/marketplace` entry로 번역 | Wrap (α) 기본 |
| codex | `bundles:` 선언을 `~/.codex/config.toml`의 `[plugins."..."]` entry로 번역 | Wrap (α) 기본 |
| opencode | `bundles:` 선언을 `opencode.json`의 `plugin:` 배열 항목으로 번역 | Wrap (α) 기본 |
| 공통 | 개별 자산 추출이 필요하면 **Disassemble (γ)** — 매니페스트의 `skills:`, `agents:` 등에 `source: gh:...#subpath` 직접 기입 |

- Phase 1은 **번들 단위 `bundles:` 섹션**만 지원. 내부 파일 레벨 micro-management는 γ 패턴으로 개별 자산 섹션 활용.
- Phase 2 cross-tool: plugin은 각 도구 고유 메커니즘이라 **cross-tool plugin 변환 불가**. plugin 대신 개별 자산 cross-tool 공유 권장.
