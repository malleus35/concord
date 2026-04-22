# Instructions (CLAUDE.md / AGENTS.md) — 3-Provider Comparison

공식 문서: Claude Code [memory](https://code.claude.com/docs/en/memory), [codex/guides/agents-md](https://developers.openai.com/codex/guides/agents-md), [opencode/rules](https://opencode.ai/docs/rules/)

## 공통

| 항목 | 공통 |
|---|---|
| 포맷 | **Markdown** (plain text, 모든 도구 parsing) |
| 자동 로드 | ✅ 세션 시작 시 context 주입 |
| 계층적 merge | CWD → git root까지 상위 순회, 여러 파일 concat |
| 목적 | 에이전트 행동 가이드, 프로젝트 컨벤션 |

## Provider별 상이

### Claude Code
| 항목 | 값 |
|---|---|
| 파일 이름 | `CLAUDE.md` (project), `~/.claude/CLAUDE.md` (user), `.claude/rules/*.md` (규칙 파일) |
| 로드 트리거 | 세션 시작, lazy load (path match, `@file` include) |
| `@file` include | ✅ CLAUDE.md 내부에서 `@other.md` 경로 참조로 끼워넣기 |
| Skill/Rule 경로 매칭 | `paths:` frontmatter (skill)로 조건부 로드 |
| Enterprise | managed settings |
| `--add-dir` 지원 | `CLAUDE_CODE_ADDITIONAL_DIRECTORIES_CLAUDE_MD=1` 환경변수로 활성화 |

### Codex
| 항목 | 값 |
|---|---|
| 파일 이름 | **`AGENTS.md`** (project + global + nested), **`AGENTS.override.md`** (임시 교체) |
| Project 순회 | Git root → CWD로 하강, 각 레벨에서 override → base 순 체크 |
| Global | `~/.codex/AGENTS.md` |
| 크기 제한 | **32 KiB** (`project_doc_max_bytes`, 기본값) — 결합 크기 도달 시 discovery 중단 |
| Merge 방식 | **concatenation with blank lines** (후발 파일이 앞선 지침 override) |
| 로드 횟수 | TUI 세션당 1회 빌드 |
| 빈 파일 | 건너뜀 |

### OpenCode
| 항목 | 값 |
|---|---|
| 파일 이름 | **`AGENTS.md` (권장)** + **`CLAUDE.md` (Claude Code 마이그레이션용 폴백)** |
| Global | `~/.config/opencode/AGENTS.md` |
| Claude Code 글로벌 호환 | `~/.claude/CLAUDE.md`도 로드 (환경변수 `OPENCODE_DISABLE_CLAUDE_CODE`로 비활성화) |
| 폴백 규칙 | `AGENTS.md` 존재 시 `CLAUDE.md`는 **무시** |
| `opencode.json#instructions` | 경로·glob 배열 (`["docs/guidelines.md", "packages/*/AGENTS.md"]`) → AGENTS.md와 결합 |
| Glob 패턴 | ✅ `opencode.json`의 `instructions`에서만 |
| 원격 URL | ✅ 5초 timeout으로 fetch 지원 |
| 조건부 로드 | 자동 미지원 (AGENTS.md 내 수동 지시만) |

## 파일 이름 매트릭스

| | Claude Code | Codex | OpenCode |
|---|---|---|---|
| Project root 주 파일 | `CLAUDE.md` | `AGENTS.md` | `AGENTS.md` (CLAUDE.md 폴백) |
| User/Global | `~/.claude/CLAUDE.md` | `~/.codex/AGENTS.md` | `~/.config/opencode/AGENTS.md` (+ `~/.claude/CLAUDE.md` 폴백) |
| Override | — | `AGENTS.override.md` | — |
| 규칙 파일 디렉토리 | `.claude/rules/*.md` | — | — |
| Include 문법 | `@file.md` | 없음 (파일 순회만) | `instructions: [globs]` |

## 크기·성능 비교

| | Claude | Codex | OpenCode |
|---|---|---|---|
| 크기 제한 | 명시 없음 | 32 KiB | 명시 없음 |
| Lazy load | ✅ (skill의 `paths:`) | ❌ | ❌ |
| Remote fetch | ❌ | ❌ | ✅ (5s timeout) |

## Concord 설계 함의

1. **AGENTS.md는 Codex·OpenCode 공통 이름** — Claude Code만 `CLAUDE.md`. 이는 **OpenCode가 공식적으로 CLAUDE.md 폴백을 지원**하는 이유
2. **타입 C (문서 include/병합) 자산** — concord가 원본 conventions 문서를 두고 각 도구의 주 파일에 **include 또는 marker block으로 삽입**
3. **Cross-tool 원본 공유 가능성이 가장 높은 자산** — Claude의 CLAUDE.md와 Codex·OpenCode의 AGENTS.md가 **내용은 거의 동일**하되 파일 이름만 다름
4. **OpenCode의 `@file`·`instructions` glob은 concord의 자산 배포에 유용** — 공유 conventions를 여러 파일로 쪼개도 OpenCode가 glob으로 로드

## 결정 (Phase 1)

| Provider | concord 기본 타겟 | 병합 방식 |
|---|---|---|
| claude-code | `./CLAUDE.md` + `.claude/rules/*.md` | marker 블록 삽입 또는 `@file` include |
| codex | `./AGENTS.md` + `.codex/AGENTS.override.md` (선택) | marker 블록 삽입 |
| opencode | `./AGENTS.md` + `opencode.json#instructions` 배열 추가 | marker 블록 + glob 등록 |

### Cross-tool 전망
- **Cross-tool의 유일한 "쉬운 공유" 자산**: 같은 content를 `CLAUDE.md`와 `AGENTS.md`로 **동일하게 쓰거나**, 한쪽에 두고 다른 쪽에서 `@include` — Phase 2의 첫 실험 타겟으로 적합
- 이름 충돌 위험 낮음 (각 파일이 특정 경로에 고정)
- 크기 제한은 Codex의 32 KiB를 기준으로 관리
