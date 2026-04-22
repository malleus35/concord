# Codex-review — 자산별 배치·공유 전략 독립 검토 (2차)

**일자**: 2026-04-19
**방법**: Codex rescue agent에 매트릭스(01~07.md) 전달 후 7개 질문으로 독립 판단 요청
**목적**: 내부 추론의 blind spot 노출, 공식 문서 재확인, 우선순위 재조정

---

## Q1. 자산 타입 분류 (A/B/C/D) 검증

### Codex 판단
- **A / B / D 는 OK** (file symlink / config block merge / bundle black box — 실제 설치 메커니즘에 깔끔 매핑)
- **C 는 분류가 깨짐**:
  - Claude Code: native include (`@file` 문법) + `.claude/rules/*.md` lazy load ✅ Type C 순수
  - Codex: "include primitive 없음" — **layered `AGENTS.md` discovery**만 있음 (merge by concatenation)
  - OpenCode: "**does not automatically parse file references inside AGENTS.md**", `instructions` globs가 include 역할을 따로 수행
- **Hooks는 1 자산이 아니라 2 자산으로 분리 권장**:
  - **Hook registration** (Type B — `settings.json` / `hooks.json` 블록)
  - **Hook implementation** (Type A — `.sh` 파일 symlink)
  - 둘은 path, 실패 양상, 포팅성이 완전히 다름

### 반영 사항 → `09-corrections-and-action-items.md`

---

## Q2. Native path 검증

### 모두 "correct" 판정 + 보강 필요 사항

| 자산 | 판정 | 보강 |
|---|---|---|
| Claude skills `.claude/skills/` | ✅ 정확 | plugin-reference 문서와도 일치 |
| Codex skills `.agents/skills/` | ⚠️ **불완전** | CWD→repo root까지 모든 `.agents/skills/` 스캔 + `$HOME/.agents/skills/` + admin + system — **단일 경로가 아님** |
| OpenCode skills `.opencode/skills/` | ⚠️ **불완전** | **`.claude/skills/`, `.agents/skills/`도 native로 읽음** (concord는 기본값만 `.opencode/`, 대체 경로 인지 필요) |
| Claude agents `.claude/agents/*.md` | ✅ 정확 | — |
| Codex agents `.codex/agents/*.toml` | ✅ 정확 | user scope `~/.codex/agents/`, project `.codex/agents/` |
| OpenCode agents `.opencode/agents/*.md` | ✅ 정확 | global `~/.config/opencode/agents/` |
| Claude hooks `settings.json#hooks` | ✅ 정확 | **26 events documented** (내 매트릭스 "25+"는 근사치. 정확한 수는 26) |
| Codex hooks `hooks.json` | ✅ 정확 | ⚠️ **`features.codex_hooks = true` 필요, Windows 현재 disabled** |
| OpenCode "네이티브 hooks 없음" | ✅ 정확 | plugins로 대체 |
| Claude MCP `.mcp.json` | ✅ 정확 | ⚠️ `~/.claude.json` path는 **unverified from current docs** |
| Codex MCP `config.toml` | ✅ 정확 | `[mcp_servers.<id>]` 테이블 |
| OpenCode MCP `opencode.json#mcp` | ✅ 정확 | `type: "local" \| "remote"` |
| Claude instructions `CLAUDE.md` + `.claude/rules/*.md` | ✅ 정확 | hooks docs에 loading 명시 |
| Codex instructions `AGENTS.md` + override | ✅ 정확 | — |
| OpenCode instructions `AGENTS.md` + globs | ✅ 정확 | — |
| Claude plugins | ✅ 정확 | **`.claude-plugin/plugin.json`** manifest path (기존 매트릭스의 `plugin.json` 경로 확인) |
| Codex plugins | ✅ 정확 | `.codex-plugin/plugin.json` + `.agents/plugins/marketplace.json` |
| OpenCode plugins | ✅ 정확 | npm + 로컬 `.opencode/plugins/*.js\|ts` |

---

## Q3. Cross-tool 이식성 순위 재조정 (중요)

### 기존 제안 (Concord 초안)
1. Instructions (가장 쉬움)
2. Skills
3. MCP
4. Subagents
5. Hooks
6. Plugins

### Codex 수정 제안
1. **Skills**
2. **MCP**
3. Instructions
4. Subagents
5. Hooks
6. Plugins

### 재조정 근거
- **Skills**: OpenCode가 이미 Codex/Claude skill paths를 **native로 읽음** → 가장 자연스러운 cross-tool 자산
- **MCP**: 구조 동일 + 포맷 번역만 필요
- **Instructions**: **deceptively divergent** — Claude의 native include + Codex의 layered override + OpenCode의 first-match + globs로 각 tool의 loading semantics가 다름
- Phase 2는 **Skills + MCP만** 먼저 시도 가치 있음
- Instructions는 "thin mirror/adapter" 기능에 한함 — "semantics-preserving shared instruction system"은 불가능

---

## Q4. Config block 병합의 실제 리스크

### Codex 판단 — **이게 concord의 가장 큰 리스크**

| 도구 | 리스크 |
|---|---|
| Claude `settings.json` | 공식 docs가 **JSONC/comment 보존 보장하지 않음** — round-trip 안전성 미확약 |
| Codex `config.toml` | **TOML 보존 편집이 가장 위험** — naive rewrite가 comments strip, table reorder, diff noise 유발 |
| OpenCode `opencode.json[c]` | **JSONC 공식 지원** + `{env:X}`/`{file:X}` 보간 — 그러나 plain JSON parse-stringify 시 **comment/trailing comma 파괴** |

### 결론
**"format-preserving, file-type-specific updaters"가 필수**. Naive `JSON.parse()` → `JSON.stringify()` 또는 `TOML.parse()` → `TOML.stringify()` 조합은 **안전하지 않음**.

- JSON/JSONC: `jsonc-parser`의 **edit API** 사용 (이미 package.json에 있음)
- TOML: comment·order 보존 도구 필요 — `@iarna/toml`(이미 있음)은 round-trip 제한적. 고려 대안: `toml-patch`, 또는 커스텀 파서 + marker 블록으로 전체 영역 교체

---

## Q5. 매트릭스에서 빠진 자산

### Phase 1 must-have 추가
- **Codex `features.codex_hooks` feature flag 선처리** — 켜지 않으면 hooks 전혀 작동 안 함
- **OpenCode `lsp` 섹션** — OpenCode 전용 first-class config 표면 (기존 매트릭스에 이미 있음, 유지)

### Phase 1에선 제외 가능 (Phase 2+)
- Status line configurations (Claude/OpenCode 모두 있음)
- Output styles (Claude)
- Slash/custom commands (Claude는 skills로 통합 중, OpenCode에도 있음)
- Themes (OpenCode)
- Model/provider presets (3도구 모두 다름)

---

## Q6. Provider 충돌 — 실전 문제 가능성 순위

| # | 충돌 | 가능성 |
|---|---|---|
| 1 | **Codex hooks 미작동** (feature flag 꺼져 있음, Windows 미지원) | **가장 높음** |
| 2 | Claude enterprise precedence | 낮음 (enterprise admin 문제) |
| 3 | OpenCode "project-local wins + warning" | **현재 docs로 unverified** — 내 매트릭스의 이 주장은 malhashemi/opencode-skills 플러그인 기준일 수 있음. 공식 docs는 **first-match rule precedence**만 명시 |

### 대응
- concord doctor가 `features.codex_hooks` 상태 체크 + 경고
- Windows 환경에서 Codex hooks 항목 발견 시 silent skip + user notification
- OpenCode duplicate 동작은 **"warning is inferred"**로 수정 기술 (공식 보장 아님)

---

## Q7. 단일 최대 리스크

> **"Can concord reliably edit `settings.json`, `config.toml`, and `opencode.json[c]` with marker-based merges without corrupting user content?"**

이 라운드트립 편집이 **concord의 존망을 가르는 기술 리스크**. 실패 모드:
- 주석 유실
- 배열/객체 순서 변경
- trailing comma 파괴
- TOML table reordering
- 문자 인코딩 차이

### 결과
- 결정 B(Sync 의미론) 세션에서 이 리스크를 **최우선 design concern**으로 다뤄야 함
- Config 파일별 전용 updater 모듈 설계 필요 (concord 내부 아키텍처)
- CI 테스트: "사용자 기존 설정 파일 → concord sync → diff" 패턴으로 주석/순서 보존 검증 필수

---

## 전체 판정 (Codex 원문)

> **"matrix needs revision in areas instructions portability, OpenCode native skill discovery, Claude MCP path certainty, and config-edit risk."**

## Phase 1 재정렬 결과

1. ✅ **Skills 결정은 유지** (Option III-tightened) — Codex가 재차 지지
2. ⚠️ **Instructions cross-tool 기대치 하향** — Phase 2에서도 thin mirror만
3. ⚠️ **Hook을 2 자산으로 분리** — registration(B) + implementation(A)
4. 🔴 **Config round-trip 편집을 최상위 아키텍처 과제로 승격**
5. ➕ **Codex feature flag, OpenCode LSP를 Phase 1 스코프에 명시 포함**
