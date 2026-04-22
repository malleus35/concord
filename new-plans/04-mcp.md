# MCP Servers — 3-Provider Comparison

공식 문서: [claude-code/mcp](https://code.claude.com/docs/en/mcp), [codex/mcp](https://developers.openai.com/codex/mcp), [opencode/mcp-servers](https://opencode.ai/docs/mcp-servers/)

## 공통

| 항목 | 공통 |
|---|---|
| 프로토콜 | Model Context Protocol (modelcontextprotocol.io 공개 표준) |
| Transport | 세 도구 모두 **stdio + HTTP** 지원 |
| 환경변수 주입 | 세 도구 모두 지원 (문법 상이) |
| 서버별 enable/disable | ✅ |

## Provider별 상이

### Claude Code
| 항목 | 값 |
|---|---|
| Local scope 저장 | `~/.claude.json` (사용자별, project 매핑) — **주의: `.claude/settings.local.json` 아님** |
| Project scope | `.mcp.json` (프로젝트 루트, 팀 공유용) |
| User scope | `~/.claude.json` |
| Transport | `stdio`, `sse` (deprecated), `http` |
| 추가 | `list_changed` 알림 지원, 자동 재연결 (exponential backoff, 5회) |
| 인증 | OAuth 2.0 지원 (`/mcp` 명령) |
| 환경변수 | `--env KEY=value` (CLI), `env: {KEY: value}` (JSON), `${DB_URL}` 치환 (plugin 내) |
| 승인 | project scope는 사용 전 **사용자 승인 prompt** |
| CLI | `claude mcp add/list/get/remove`, `claude mcp reset-project-choices` |
| Plugin 번들 | ✅ `.mcp.json` 또는 `plugin.json`의 `mcpServers` (자동 라이프사이클) |
| Registry | `api.anthropic.com/mcp-registry` (Anthropic 공식) |

### Codex
| 항목 | 값 |
|---|---|
| User 저장 | `~/.codex/config.toml`의 `[mcp_servers.<name>]` |
| Project 저장 | `.codex/config.toml` (신뢰할 수 있는 프로젝트만) |
| Transport | `stdio` + `Streamable HTTP` (SSE, WebSocket 미지원) |
| 공유 | CLI와 IDE extension이 동일 config 사용 |
| 필드 (stdio) | `command`*, `args`, `env`, `env_vars`, `cwd` |
| 필드 (HTTP) | `url`*, `bearer_token_env_var`, `http_headers`, `env_http_headers` |
| 공통 | `startup_timeout_sec`, `tool_timeout_sec`, `enabled`, `required`, `enabled_tools`, `disabled_tools` |
| OAuth | `codex mcp login` |
| 도구 필터 | `enabled_tools` (allowlist) + `disabled_tools` (denylist, 후 적용) |

### OpenCode
| 항목 | 값 |
|---|---|
| 저장 | `opencode.json`의 `mcp` 객체 (project), global opencode.json |
| Type 구분 | `type: "local"` (command) vs `type: "remote"` (url) |
| Transport | stdio 암시 (local), HTTP (remote). SSE/WebSocket 언급 없음 |
| 필드 (local) | `command`*, `environment` (객체) |
| 필드 (remote) | `url`*, `headers`, `oauth`, `timeout`(ms, 기본 5000) |
| 환경변수 보간 | **`{env:VAR_NAME}`** 문법 (파일 보간 `{file:path}`도 지원) |
| 토큰 저장 | `~/.local/share/opencode/mcp-auth.json` |
| 도구 필터 | `tools: {"my-mcp*": false}` (글로브 패턴) |
| enable flag | `enabled: true|false` |

## 환경변수/시크릿 보간 문법 3자 비교

| 도구 | 문법 | 예 |
|---|---|---|
| Claude Code | `${VAR}` (plugin 내), `env: {K: V}` | `"env": {"DB_URL": "${DB_URL}"}` |
| Codex | `env_vars: ["VAR"]`, `bearer_token_env_var: "VAR"` | 별도 필드로 이름 선언, 값은 환경에서 읽음 |
| OpenCode | `{env:VAR}`, `{file:path}` | `"clientSecret": "{env:MY_SECRET}"` |

**세 도구 모두 시크릿 인라인은 피하는 설계**지만 **구체 문법이 전부 다름**.

## 포맷 비교

| 측면 | Claude Code | Codex | OpenCode |
|---|---|---|---|
| 파일 포맷 | JSON (`.mcp.json`, `~/.claude.json`) | TOML (`config.toml`) | JSON (`opencode.json`) |
| 서버 루트 키 | `mcpServers` | `mcp_servers` | `mcp` |
| 팀 공유 메커니즘 | `.mcp.json` (git-tracked) | `.codex/config.toml` (git-tracked, 신뢰 프로젝트) | `opencode.json` (git-tracked) |

## Concord 설계 함의

1. **MCP 설정은 타입 B(설정 블록 병합)** — 파일 교체 불가, 각 도구의 네이티브 config 파일에 **concord-managed 블록**을 마커로 삽입
2. **서버 정의 자체는 도구에 따라 포맷 변환**:
   - `name: airtable, transport: stdio, command: npx, args: [-y, airtable-mcp-server], env: {AIRTABLE_API_KEY: ${KEY}}`
   - 위를 Claude JSON, Codex TOML, OpenCode JSON으로 **3번 번역**해서 기록
3. **환경변수 문법 통일 필수** — concord manifest에서는 **OpenCode식 `{env:X}` / `{file:X}`**를 채택하고 각 도구 포맷으로 번역 시점에 변환
4. **Registry 지원 불균등**: Claude는 official registry 있음, Codex·OpenCode는 수동. concord가 registry lookup을 지원하려면 Claude 것을 빌려와야 함

## 결정 (Phase 1)

| Provider | 저장 타겟 | 타입 |
|---|---|---|
| claude-code (project) | `.mcp.json` 또는 plugin 내 | 타입 B 블록 병합 |
| claude-code (user) | `~/.claude.json` | 타입 B |
| codex (project) | `.codex/config.toml`의 `[mcp_servers.*]` | 타입 B |
| codex (user) | `~/.codex/config.toml` | 타입 B |
| opencode (project) | `opencode.json`의 `mcp` | 타입 B |
| opencode (user) | `~/.config/opencode/opencode.json` | 타입 B |

- **concord manifest의 MCP 선언은 provider-agnostic 1회** → concord가 provider별 포맷으로 자동 변환 기록
- 환경변수 보간: `{env:X}`, `{file:X}`로 통일 (OpenCode식 차용)
- 시크릿은 **concord.lock에 기록 안 함** — 이름만
