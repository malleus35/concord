# Corrections & Action Items (Codex 2차 검토 기반)

01-07.md의 원본은 **보존**하고, 이 문서에 정정/보강 사항을 모아 후속 설계 단계에서 참조한다.

---

## 🔴 최우선 — Config Round-trip 편집 위험

**Codex 판정**: concord의 **단일 최대 리스크**.

### 문제
`settings.json`, `config.toml`, `opencode.json[c]` 중 어느 하나라도 naive parse-stringify로 편집하면:
- 주석 유실
- 배열/객체/테이블 순서 변경
- trailing comma 파괴
- whitespace·indent 스타일 변경

### 요구 사항 (결정 B에서 구체화)
- **JSON/JSONC**: `jsonc-parser`의 `modify()` + `applyEdits()` 사용 (이미 dep에 있음). `JSON.parse()`/`JSON.stringify()` 금지.
- **TOML**: round-trip 보존 편집기 필요. `@iarna/toml`은 파싱만 안전, 편집 시 손실. 대안 조사 필요:
  - `toml-patch`
  - 또는 **marker 블록 전체 교체**로 영역 외 내용은 절대 건드리지 않는 보수적 방식
- **CI 검증**: "기존 설정 파일 → concord sync → diff" 골든 테스트. 사용자 원본의 코멘트/순서가 bit-perfect 보존되는지 확인.

### 관련 파일
- `04-mcp.md`: 타입 B 모든 항목
- `03-hooks.md`: 타입 B 모든 항목
- `06-plugins.md`: 타입 D의 enable entry

---

## 🟡 자산 분류 정정

### 1. Type C (문서 include)는 provider별로 의미가 다름
- **Claude**: native `@file` include + `.claude/rules/*.md` lazy load → **순수 Type C 성립**
- **Codex**: `@include` 없음. **layered `AGENTS.md` discovery**만. Type C라기보다 **Type B'(문서 concat 기반 병합)**
- **OpenCode**: `AGENTS.md` 본문은 native include 안 함. **`opencode.json#instructions: [globs]`**가 include 역할을 분리해서 수행 → 실제로는 **Type B + Type A 조합**

**교정**: `05-instructions.md`의 "타입 C" 일괄 분류는 단순화. 실제 concord 처리는 provider별로 다르다:
- Claude: `@file` 삽입 (순수 Type C)
- Codex: marker 블록으로 AGENTS.md 상단에 concat (Type B')
- OpenCode: `opencode.json#instructions`에 glob 추가 (Type B) + 실제 문서 파일 배치 (Type A)

### 2. Hooks는 2 자산으로 분리
**Hook registration** (Type B) ≠ **Hook implementation** (Type A)
- Registration: `settings.json#hooks` 또는 `hooks.json` 블록 entry
- Implementation: `.sh`/`.py` 스크립트 파일

→ concord manifest 스키마에서 hook을 표현할 때:
```yaml
hooks:
  - event: PostToolUse
    matcher: "Edit|Write"
    script:                           # 파일 자산 (타입 A)
      source: gh:acme/hooks@v1#prettier-on-edit.sh
      install: symlink
      target: .claude/hooks/prettier.sh
    # 위 항목 자체가 settings.json의 hooks 블록에도 등록됨 (타입 B)
```

`03-hooks.md` 참조.

---

## 🟡 Native Path 보강

### Codex skills — multi-location 명시
- `$CWD/.agents/skills/`, `$CWD/../.agents/skills/`, `$REPO_ROOT/.agents/skills/` (repo 내 모든 상위)
- `$HOME/.agents/skills/` (user)
- `/etc/codex/skills/` (admin)
- 번들 (system)

→ concord가 프로젝트에서 설치할 때 `$REPO_ROOT/.agents/skills/` 를 기본으로 하지만, 사용자가 nested 프로젝트로 이동해도 discovery는 자동 작동

### OpenCode skills — 3 경로 모두 native
- `.opencode/skills/`, `.claude/skills/`, `.agents/skills/` (project)
- `~/.config/opencode/skills/`, `~/.claude/skills/`, `~/.agents/skills/` (global)

→ concord는 기본으로 `.opencode/skills/`에만 쓰지만, `.agents/` 공유를 opt-in하면 **OpenCode는 별도 설정 없이 자동으로 읽음**. 반면 `.claude/skills/`에 쓰는 건 Claude Code와 이름 충돌 위험 있어 금지.

### Claude MCP `~/.claude.json` — unverified
- 내가 기술한 user scope `~/.claude.json` 경로는 현재 docs에서 명확히 재확인 어려움
- 결정 B 세션에서 Anthropic 공식 재조회 또는 실제 Claude Code 실행 로그로 검증 필요

---

## 🟢 Cross-tool 순위 재조정 (Phase 2 설계 반영)

### 기존 (07-overlap-matrix.md)
1. Instructions → 2. Skills → 3. MCP → 4. Subagents → 5. Hooks → 6. Plugins

### 교정 (Codex 권고)
1. **Skills** → 2. **MCP** → 3. Instructions → 4. Subagents → 5. Hooks → 6. Plugins

### 영향
- Phase 2 착수 시 **Skills + MCP 먼저 cross-tool 실험**
- Instructions cross-tool은 "mirror/adapter" 수준 (semantics-preserving 불가)
- Hooks·Plugins는 cross-tool 추구 포기

---

## 🟢 Phase 1 스코프 보강

### 추가 (Codex 제안)
- **Codex `features.codex_hooks` feature flag 처리** — concord sync 시 상태 확인 + 필요 시 경고/자동 활성화 권유
- **OpenCode `lsp` 섹션** — 이미 07-overlap-matrix.md에 포함. 유지 확인

### 제외 (Phase 2+)
- Status line configurations
- Output styles
- Slash/custom commands (Claude는 skills로 통합 중)
- Themes
- Model/provider presets

---

## 🟢 Duplicate 처리 주장 정정

- `01-skills.md`의 OpenCode 항목 "**project-local 이김 + console 경고**"는 **공식 docs가 명시하지 않음**
- 이는 malhashemi/opencode-skills 서드파티 플러그인 문서에서 유래
- 공식 docs는 **first-match rule precedence**만 명시
- → concord는 "duplicate 경고 로깅 동작"에 의존하지 말 것 (observed behavior, not contract)

---

## 📋 후속 액션 (결정 B/C/D/E에 반영)

### 결정 B (Sync 의미론 + drift) 에서
- [ ] Config file updater 아키텍처 (jsonc-parser edit API, TOML 보존 편집)
- [ ] 골든 테스트 패턴 (원본 → sync → diff 보존 검증)
- [ ] drift 감지 정책: content_hash 비교 + 사용자 직접 편집 보존 규칙
- [ ] dry-run, atomic commit, rollback

### 결정 C (~~Bundle ↔ Plugin 경계~~ → **Plugin 자산 타입의 source 모델, β3 재구조 2026-04-20**) 에서

> **⚠️ 결정 C 재구조**: "Bundle ↔ Plugin 경계" 는 계보학적 재조사에서 **가짜 경계** 로 판명 (`STEP-C/02-v2-preparation.md` 참조 + `~/.claude/projects/-Users-macbook-workspace-concord/memory/feedback_bundle_inflation.md`). "bundle" 은 별도 범주가 아니라 plugin 의 형용사에서 인플레이션된 개념. 최신 방향: [`STEP-C/03-plugin-source-model.md`](./STEP-C/03-plugin-source-model.md).

- [ ] Codex `features.codex_hooks` feature flag를 **plugin** 설치 전 precheck 단계에 포함
- [ ] Claude plugin의 `.claude-plugin/plugin.json` manifest 경로 확인 → **섹션 5 `capability_matrix` 계산의 introspection 경로**
- [ ] (신설) Plugin introspection 엔진 정확성 POC (3 provider 각각)
- [ ] (신설) `concord cleanup` 명령 구현 (섹션 6 신설)

### 결정 D (Windows fallback) 에서
- [ ] Codex Windows hooks disabled 상태 감지 + concord sync 경고
- [ ] symlink → copy fallback 트리거 조건

### 결정 E (Secret 보간) 에서
- [ ] `{env:X}`, `{file:X}` 통일 (OpenCode 차용 확정)
- [ ] Phase 2 `{secret:keychain://...}`, `{secret:aws-ssm://...}` 예약

---

## 종합 결론

**스킬 결정(Option III-tightened) 유지.** Codex가 매트릭스 핵심은 승인하되 **3가지 축에서 보강 요구**:

1. Config round-trip 편집 위험 → 결정 B의 최상위 과제
2. Cross-tool 순위 재정렬 → Phase 2 우선순위 수정
3. 자산 분류의 미묘한 차이 → Hook 2-asset 분리 + Type C의 provider별 divergence 인식

이 정정은 01-07.md를 덮어쓰지 않고 **누적 레이어**로 유지한다 (concord 자신의 사상 — 원본 보존 + marker block).
