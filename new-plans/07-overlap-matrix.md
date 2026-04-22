# Concord — 종합 Overlap Matrix

## 목적
3 provider × 6 자산 타입의 공통/상이를 한눈에 파악. Concord가 **공유 가능한 것**, **provider-native로 둬야 하는 것**, **번역(adapter)이 필요한 것**을 구분.

---

## 매트릭스 (자산 × Provider)

| 자산 | Claude Code | Codex | OpenCode | 공통 포맷 가능성 |
|---|---|---|---|---|
| **Skills** | `.claude/skills/` | `.agents/skills/` | `.opencode/skills/` (+.claude/, +.agents/ 호환) | ✅ 높음 — SKILL.md 표준, frontmatter 교집합 크다 |
| **Subagents** | `.claude/agents/*.md` (YAML+MD) | `.codex/agents/*.toml` (TOML) | `.opencode/agents/*.md` (YAML+MD) | ⚠️ 낮음 — **TOML vs MD 포맷 분기** |
| **Hooks** | `settings.json#hooks` (25+ events) | `hooks.json` (5 events, Bash only) | `.opencode/plugins/` (JS/TS 코드) | ❌ 매우 낮음 — 구현 매체 자체 다름 |
| **MCP** | `.mcp.json` / `~/.claude.json` (JSON) | `~/.codex/config.toml` (TOML) | `opencode.json#mcp` (JSON) | ⚠️ 중간 — 개념 동일, 포맷 3종 |
| **Instructions** | `CLAUDE.md` + `.claude/rules/*` | `AGENTS.md` (+ override) | `AGENTS.md` (CLAUDE.md 폴백) | ✅ 높음 — OpenCode가 이미 Claude 폴백 지원 |
| **Plugins** | 파일 묶음, `/plugin install` | `~/.codex/plugins/cache/...`, `plugin.json` | npm 패키지, `opencode.json#plugin` | ❌ 배포 단위 자체 다름 |

---

## 자산 타입별 Concord 처리 전략

### 타입 A — 파일 자산 (symlink 가능)
**Skills, Subagents, Hook 스크립트, Instructions 파일**
- 원본은 `.concord/assets/` 또는 외부 source (gh/file/npm)
- 각 provider 네이티브 경로로 symlink fan-out
- Windows fallback: copy 모드

### 타입 B — 설정 블록 (마커 기반 병합)
**Hooks 정의, MCP 서버 목록, OpenCode instructions 배열, Plugin enable 플래그**
- 각 도구의 네이티브 config 파일(settings.json / config.toml / opencode.json)에 **`// BEGIN concord-managed` / `// END concord-managed`** 마커 블록 삽입
- concord가 업데이트하면 블록 내용만 갱신, 바깥 사용자 편집 보존

### 타입 C — 문서 include
**CLAUDE.md / AGENTS.md 본문**
- 주 파일에 `@include` 라인 삽입 (Claude) 또는 marker 블록 (Codex/OpenCode)
- OpenCode의 `instructions: [globs]`는 glob 기반 자동 include

### 타입 D — 번들 (black box)
**Plugins (Claude/Codex) + OpenCode npm plugin**
- 번들 설치 자체만 concord가 대행 (Wrap α)
- 또는 기존 설치를 track만 (Adopt β)
- 또는 번들 repo의 개별 파일만 추출해 타입 A/B/C로 관리 (Disassemble γ)

---

## Cross-tool 공유 가능성 순위

| 자산 | Phase 1 | Phase 2 (cross-tool) |
|---|---|---|
| **Instructions** | provider별 파일 이름 매핑 | **✅ 가장 쉬움** — 같은 content를 CLAUDE.md ↔ AGENTS.md로 복제 or include |
| **Skills** | provider 네이티브 + opt-in `shared-agents` | ⚠️ Frontmatter 차이로 lossy. `name`+`description`+body는 공유 가능 |
| **MCP** | provider별 포맷 번역 | ⚠️ 동일 서버 정의를 3가지 config 파일에 번역 기록 (가능) |
| **Subagents** | provider별 포맷 네이티브 | ⚠️ Codex TOML ↔ Claude MD 변환 (lossy — permissionMode, skills preload 등 Codex에 없음) |
| **Hooks** | provider별 네이티브 | ❌ 이벤트 모델 차이로 사실상 불가능 |
| **Plugins** | provider별 네이티브 (Wrap α) | ❌ 배포 메커니즘 3종 분산 |

---

## 공유 경로 존재하는 자산

| 공유 경로 | 누가 읽나 | 누가 안 읽나 | 활용도 |
|---|---|---|---|
| `.agents/skills/` | Codex ✅, OpenCode ✅ | Claude Code ❌ | **skills 한정 opt-in shared target** |
| `.agents/plugins/marketplace.json` | Codex ✅ | Claude ❌, OpenCode ❌ | Codex 전용 |
| `AGENTS.md` | Codex ✅, OpenCode ✅ (주) | Claude ❌ (CLAUDE.md 사용) | instructions cross-tool 기반 |
| `~/.claude/CLAUDE.md` | Claude ✅, OpenCode ✅ (폴백) | Codex ❌ | 제한적 |

**결론**: 실질적 3자 공유 경로는 **없음**. 2자 공유는 있음 (Codex+OpenCode의 `.agents/skills/`, Codex+OpenCode의 `AGENTS.md`).

---

## Concord Manifest 최소 스키마 (이 매트릭스 기반)

```yaml
version: 1
layer: project              # user | enterprise | project | project-local

providers:
  claude-code:
    instructions: [...]     # 타입 C — CLAUDE.md + rules
    skills: [...]           # 타입 A
    subagents: [...]        # 타입 A (.md+YAML)
    hooks: [...]            # 타입 B (settings.json 블록)
    mcp: [...]              # 타입 B (.mcp.json / ~/.claude.json)
    bundles: [...]          # 타입 D (plugins)

  codex:
    instructions: [...]     # 타입 C — AGENTS.md
    skills: [...]           # 타입 A (+ opt-in target: shared-agents)
    subagents: [...]        # 타입 A (.toml)
    hooks: [...]            # 타입 B (hooks.json)
    mcp: [...]              # 타입 B (config.toml)
    bundles: [...]          # 타입 D (plugins)

  opencode:
    instructions: [...]     # 타입 C — AGENTS.md + opencode.json#instructions
    skills: [...]           # 타입 A (+ opt-in target: shared-agents)
    agents: [...]           # 타입 A (primary/subagent mode 포함)
    plugins: [...]          # 타입 D (npm package 설치)
    mcp: [...]              # 타입 B (opencode.json#mcp)
    # hooks 섹션 없음 — plugins로 대체
    # lsp 섹션 여기만 있음 (opencode 전용 LSP 설정)
    lsp: [...]

# Phase 2 예약 (MVP엔 없음)
# cross_tool:
#   instructions: [...]      # CLAUDE.md ↔ AGENTS.md 미러
#   skills: [...]            # 공유 skill (모든 provider)
```

### 환경변수 보간 (모든 provider 공통)
- `{env:VAR_NAME}` — 환경변수
- `{file:path/to/file}` — 파일 내용 (OpenCode 차용)
- `{secret:keychain://...}` / `{secret:aws-ssm://...}` — Phase 2 예약

---

## 핵심 원칙 요약

1. **Provider-native 경로가 기본** — 공유는 명시적 opt-in
2. **타입 B/C/D는 sync가 복잡** — 타입 A(symlink)가 가장 단순하고 안전
3. **Cross-tool은 Instructions만 "쉬운" 공유** — 나머지는 lossy adapter 필요
4. **concord.lock의 이중 해상도**: 번들(block) + 개별 자산(file)
5. **Windows fallback 필수** — symlink 실패 시 copy로 자동 전환
