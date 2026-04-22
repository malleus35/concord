# B-3 — Drift 감지 + `concord.lock` 스키마

## `concord.lock` 스키마 (draft)

```yaml
version: 1
generated_at: 2026-04-19T12:34:56Z
concord_version: 0.1.0

# 각 entry는 manifest의 asset 1개 설치 결과
entries:
  - id: "claude-code:skills:code-reviewer"        # provider:asset:name 고정 키
    source:
      type: git                                    # git | file | http | npm | external | adopted
      url: "github.com/acme/skills"
      rev: "v1.2.3"
      path: "skills/code-reviewer"
    source_hash: "sha256:abcd..."                  # source content hash (재fetch 판단용)
    install:
      method: symlink                              # symlink | copy | block-merge | file-write
      target: ".claude/skills/code-reviewer"       # 실제 설치된 경로
      target_content_hash: "sha256:efgh..."        # 설치 직후 타겟 내용 hash (drift 판단용)
    scope: project
    provider: claude-code
    asset: skills

# 설정 블록 병합의 경우
  - id: "codex:mcp:airtable"
    source:
      type: inline                                 # manifest 내에 정의됨
      raw_hash: "sha256:..."
      normalized_hash: "sha256:..."
    install:
      method: block-merge
      target_file: "~/.codex/config.toml"
      marker_id: "concord-managed:mcp"
      marker_content_suffix: "sha256:abc123..."     # marker 라인에 포함되는 hash 일부 (무결성 검증)
      raw_hash: "sha256:..."                        # 삽입된 블록 내용 raw hash
      normalized_hash: "sha256:..."                 # AST 정규화 후 hash
    scope: user
    provider: codex
    asset: mcp

# pure JSON (~/.claude.json) — marker 사용 불가, key 단위 소유권 추적
  - id: "claude-code:mcp:airtable"
    source:
      type: inline
      raw_hash: "sha256:..."
      normalized_hash: "sha256:..."
    install:
      method: json-key-owned                        # concord 가 소유하는 JSON key
      target_file: "~/.claude.json"
      owned_paths:                                  # JSON Pointer 배열
        - "/mcpServers/airtable"
      raw_hash: "sha256:..."
      normalized_hash: "sha256:..."
    scope: user
    provider: claude-code
    asset: mcp

# adopted — 사용자 기존 파일을 concord 가 인수 (concord import)
  - id: "claude-code:skills:my-existing-skill"
    source:
      type: adopted                                  # 외부 source 없음, 현재 타겟이 곧 source
      adopted_from_path: ".claude/skills/my-existing-skill"
      adopted_at: 2026-04-19T12:00:00Z
    install:
      method: symlink-or-file                        # 이미 존재하던 파일
      target: ".claude/skills/my-existing-skill"
      raw_hash: "sha256:..."
      normalized_hash: "sha256:..."
    scope: project
    provider: claude-code
    asset: skills

# bundle (plugin) 의 경우
  - id: "claude-code:bundles:official-agents"
    source:
      type: plugin-marketplace
      marketplace: "anthropic/official"
      plugin: "official-agents"
      rev: "1.0.5"
    source_hash: "sha256:..."
    install:
      method: file-tree                              # 번들 전체 복제
      target: ".claude/plugins/official-agents"
      manifest_path: ".claude-plugin/plugin.json"
      children_count: 47                             # 설치된 파일 수
      tree_hash: "sha256:..."                         # 전체 디렉토리 트리 해시
    scope: project
    provider: claude-code
    asset: bundles

# 전역 메타
integrity:
  manifest_file_hash: "sha256:..."                   # sync 시점 manifest 전체 hash
  lock_self_hash: "sha256:..."                       # lock 파일 자체 hash (tampering 방지)
```

---

## Hash 계산 규칙 (v2 — raw + normalized 분리)

리뷰 반영: formatter (prettier/biome) 자동 실행에 의한 **false-positive drift** 를 회피하기 위해 `raw_hash` 와 `normalized_hash` 를 **둘 다** 기록한다.

| 대상 | raw_hash (byte) | normalized_hash (정규화) |
|---|---|---|
| source (git tar) | tarball bytes | stable-order + attributes stripped |
| source (file) | 바이트 그대로 | EOL 정규화 (LF) + trailing newline strip |
| source (npm) | tarball bytes | `package.json` + file tree 정규화 |
| installed file (file asset) | 바이트 그대로 | EOL 정규화 + trailing newline strip |
| installed block (config merge) | marker 사이 문자열 그대로 | **AST 정규화** (주석은 보존, 불필요한 whitespace/indent 정규화) |
| bundle tree | 깊이우선 `<relpath>:<raw_hash>` concat | 깊이우선 `<relpath>:<normalized_hash>` concat |

### Drift 판정 순서 (v2)

```
if raw_hash == lock.raw_hash:
    state = SKIP                          # 완전 동일
elif normalized_hash == lock.normalized_hash:
    state = SILENT_UPDATE                  # formatter만 돌린 것 — raw 갱신하고 넘어감
else:
    state = DRIFT                          # 실제 내용 변경
```

### 정규화 규칙 명시

- **JSON/JSONC**: AST 파싱 후 표준 포맷으로 stringify (주석은 보존) → hash
- **TOML**: AST 파싱 후 정렬된 key 순서로 stringify (주석 보존) → hash
- **바이너리 자산**: EOL 정규화 없이 raw bytes 그대로 (raw == normalized)
- **Markdown/SKILL.md**: EOL 정규화 (LF) + trailing newline 1개로 통일

Phase 1 구현 지점: `hash.ts` 모듈에 `computeRawHash`, `computeNormalizedHash`, `normalizeJson`, `normalizeToml`, `normalizeMarkdown` 구현.

---

## Drift 감지 알고리즘

`concord sync` 시작 시 각 entry에 대해:

```
for entry in lock.entries:
    current_hash = compute_target_hash(entry)
    if current_hash != entry.install.target_content_hash:
        drift_detected(entry)
    else:
        no_drift(entry)
```

### Drift 유형별 처리 정책

| 유형 | 예 | 기본 정책 |
|---|---|---|
| **타겟 파일/디렉토리 없음** | 사용자가 수동 삭제 | re-install (경고 로그) |
| **파일 내용 변경** | 사용자가 `.claude/skills/xxx/SKILL.md` 편집 | **block + 사용자 확인** |
| **config 블록 변경** | 사용자가 marker 블록 안 수정 | **block + 사용자 확인** |
| **config 블록 외부 편집 & hash 일치** | marker 블록은 동일, 주변만 변경 | **no-op** (정상) |
| **marker 주석 손상/삭제** | 사용자가 marker comment 지움 | 경고 + `--repair` 옵션 필요 |
| **symlink 깨짐** | 외부 source 경로 변경 | `concord doctor` 에서 감지 |

### 사용자 제어 플래그

| 플래그 | 의미 |
|---|---|
| `--force` | drift 무시하고 덮어쓰기 (🔴 파괴적. 사용 전 자동 백업 강제) |
| `--preserve` | drift 감지된 entry는 skip + lock에 "preserved" 플래그 기록 |
| `--adopt` | 현재 타겟 상태를 새 source로 인정 (lock의 target_content_hash 갱신) |
| `--diff` | drift 감지된 항목의 diff만 출력 후 종료 (read-only) |

---

## 충돌 시나리오 매트릭스

| 시나리오 | 사용자 의도 | 추천 플래그 |
|---|---|---|
| 동료가 skill 업데이트, 내가 로컬 수정 | 내 수정 버리기 | `--force` |
| 동료가 skill 업데이트, 내 수정 유지 | merge 필요 (수동) | `--preserve` → 수동 merge → `--adopt` |
| 내가 manifest에서 entry 제거, 타겟은 수정됨 | 삭제 의도 | `--force` (경고 후) |
| 마커 블록 손상 | 복구 | `--repair` 또는 `--force` |
| symlink 경로 바뀜 | 재배치 | 자동 re-install (확인 prompt 없이) |

---

## concord.lock의 git 전략

- **commit**: 권고. npm `package-lock.json`, poetry `poetry.lock`, `yarn.lock` 패턴.
- 이유:
  1. 팀 재현성 — 같은 concord sync 결과 보장
  2. drift 감지가 lock의 hash에 의존
  3. `concord.lock` 변경을 PR review로 확인 가능
- 주의: `concord.local.yaml` 은 gitignored. 하지만 lock의 일부 entry는 local manifest에서 유래할 수 있음 → lock 파일 주석에 "this entry came from concord.local.yaml" 플래그 기록

### Merge-friendly 정렬 규칙 (v2)

- `entries` 배열은 **항상 `id` 오름차순 (UTF-8 codepoint 순)** 으로 정렬되어 직렬화
- YAML key 순서 고정: `id, source, install, scope, provider, asset`
- 들여쓰기 2 spaces, trailing newline 1개
- **이유**: 자동 merge tool 이 라인 단위로 충돌을 감지할 수 있게, entry 순서·구조를 predictable 하게 만듦
- Phase 1.5 에서 lock merge driver (`concord.lock-merge`) 도입 예정

---

## `concord doctor` 진단 항목

| 진단 | 행동 |
|---|---|
| lock 에 있지만 타겟 경로 없음 (symlink broken / 파일 삭제) | "run `concord sync` to reinstall" |
| 타겟 존재하지만 lock 에 없음 (orphan) | "run `concord import` to adopt or manually remove" |
| lock 과 target hash 불일치 (drift) | `concord sync --diff <name>` 제안 |
| marker 블록 손상 | "run `concord sync --repair`" |
| Codex `features.codex_hooks = false` 인데 hooks entry 있음 | "enable flag or remove entries" |
| Windows에서 Codex hooks entry 있음 | "Codex hooks currently not supported on Windows — disable or move to Claude/OpenCode" |
| symlink 지원 안 되는 파일시스템 (Windows, exFAT 등) | "switch to `install: copy` mode" |

---

## Open decisions

1. **Bundle tree hash 성능**: 100MB 번들의 전체 tree hash 계산은 느릴 수 있음 → 캐시 전략 필요? (Phase 2?)
2. **Symlink target 추적**: symlink 설치 후 원본 source가 이동되면 symlink가 깨짐. concord가 원본 경로를 lock에 기록하고 doctor가 검증?
3. **Lock 버전 호환성**: 미래 lock 스키마 버전 업그레이드 시 migration 도구 필요
