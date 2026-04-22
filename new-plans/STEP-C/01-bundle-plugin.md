# 결정 C — Bundle ↔ Plugin 경계 **[FINAL 초안 2026-04-19]**

결정 A/B FINAL 이후 남은 설계 결정 중 첫 항목. 3 provider 의 "번들 단위 배포 메커니즘"(Claude plugin / Codex plugin / OpenCode npm plugin)을 concord manifest 로 어떻게 추상화할지 확정.

근거 문서:
- [`06-plugins.md`](../06-plugins.md) — 3 provider plugin 비교
- [`07-overlap-matrix.md`](../07-overlap-matrix.md) Type D 섹션 — 번들 자산 분류
- [`09-corrections-and-action-items.md`](../09-corrections-and-action-items.md) §결정 C 섹션 — Codex `features.codex_hooks` precheck 요구

---

## 서브 결정 4개

### C-1. 기본 설치 패턴 (α Wrap / β Adopt / γ Disassemble)

| 패턴 | 동작 | concord 역할 |
|---|---|---|
| **α Wrap** | manifest 선언 → concord 가 provider 네이티브 설치 명령 대행 | declarative, 설치 액션 주도 |
| **β Adopt** | 사용자가 이미 설치한 plugin 을 lock 에 기록 | tracking only, 비침습 |
| **γ Disassemble** | plugin repo 의 개별 자산만 추출해 Type A/B/C 로 관리 | plugin 메커니즘 우회, 파일 레벨 통제 |

**Provider 별 실효성 평가**:

| Provider | α 가능성 | β 가능성 | γ 가능성 | Phase 1 기본 |
|---|---|---|---|---|
| claude-code | ✅ marketplace entry + `/plugin install` | ✅ 이미 설치된 plugin track | ⚠️ `${CLAUDE_PLUGIN_ROOT}` 가정 깨짐 | **α Wrap** |
| codex | ❌ 공식 배포 "coming soon" (2026-04 기준) | ✅ 이미 설치된 `~/.codex/plugins/cache/...` track | ⚠️ plugin.json 내부 경로 가정 | **β Adopt only** (Phase 1) → α 는 공식 배포 공개 후 Phase 1.5 |
| opencode | ✅ `opencode.json#plugin` 배열 → Bun 자동 설치 | ✅ 이미 선언된 plugin track | ⚠️ npm 패키지 압축 해제 필요 | **α Wrap** |

**결정 C-1**:
- **Default**: α Wrap (Claude / OpenCode), β Adopt (Codex — Phase 1 한정).
- **γ Disassemble**: 모든 provider 공통 **opt-in 고급 패턴**. manifest 에 `install_pattern: disassemble` + `extract:` 블록 명시 필수. 용도: cross-tool 재배포, 프라이빗 fork, 부분 자산 선택.
- Codex α 승격 트리거: Codex 공식 plugin publishing 공개 + `/plugin install` 비대화식 CLI 검증.

### C-2. 번들 vs 개별 자산 이름 충돌

시나리오: 번들 Z 가 skill `foo` 를 내장 + concord manifest 의 개별 `skills:` 섹션에도 `foo` 선언.

| Provider | 네이티브 동작 | concord 규칙 |
|---|---|---|
| claude-code | plugin 네임스페이스 자동 prefix (`plugin-z:foo` vs `foo`) → **실질 충돌 없음** | 경고만, 사용자에게 두 경로를 `why` 로 설명 |
| codex | duplicate 허용, 둘 다 selector 에 노출 | **경고** + `concord why foo` 로 precedence 설명 + `--strict` 플래그 시 에러 |
| opencode | "names unique across all locations" 위반 → OpenCode 자체가 에러 | **설계 타임 lint 에러** — sync 전 중단 |

**우선순위 원칙**: **개별 자산 선언 > 번들 내장** (explicit > implicit). 단 Claude 는 자동 prefix 로 실질 동거 가능.

**결정 C-2**: lint 단계(`concord detect` / `concord sync` precheck)에서 충돌 감지 → provider 별 위 규칙 적용.

### C-3. Codex `features.codex_hooks` precheck

manifest 에 Codex hook asset 선언 + `~/.codex/config.toml#features.codex_hooks` 가 `false`/missing → sync 실패 위험.

**배치**:

| 단계 | 동작 |
|---|---|
| `concord sync` 시작 precheck | hook asset 존재 감지 → flag 상태 확인 → non-interactive: **에러 + 설명 메시지**. interactive: **y/N 자동 활성화 제안** (`--yes` / `CONCORD_NONINTERACTIVE=1` 존중) |
| `concord doctor` | flag 상태 + Windows 미지원 상태 리포트 (결정 D 연계) |
| `concord detect` | 선언된 hook asset 이 실제로 실행 가능한지 감지 단계에 포함 |

**결정 C-3**: sync precheck + doctor 이중 체크. 자동 활성화는 명시 동의 필요 (설정 파일 수정이므로 adopt 확정 UX 와 동일한 Terraform apply 패턴).

### C-4. `bundles:` manifest 스키마

**Source URI 스킴** (결정 B 의 `source:` 스킴 확장):
- `marketplace:<publisher>/<name>@<version>` — Claude/Codex plugin marketplace
- `npm:<package>@<version>` — OpenCode npm plugin
- `gh:<owner>/<repo>@<ref>[#subpath]` — private/custom bundle (γ 패턴 전용)
- `file:<path>` — 로컬 개발용 bundle

**스키마**:

```yaml
providers:
  claude-code:
    bundles:
      - name: example-plugin                    # 고유 식별자 (lock key)
        source: marketplace:anthropic/official@1.2.0
        install_pattern: wrap                   # wrap | adopt | disassemble
        enabled: true
        # Optional — wrap 일 때 auto-install 동작 제어
        auto_install: true                      # false 면 선언만 기록, 사용자가 /plugin install
        # Optional — disassemble 일 때만
        # extract:
        #   skills: [foo, bar]
        #   agents: [qux]
        #   hooks: []

  codex:
    bundles:
      - name: openai-curated-foo
        source: marketplace:openai-curated/foo@0.3.1
        install_pattern: adopt                  # Phase 1: adopt only
        enabled: true

  opencode:
    bundles:
      - name: acme-plugin
        source: npm:@acme/opencode-plugin@2.0.0
        install_pattern: wrap
        enabled: true
```

**Lock 기록** (`concord.lock`):

```yaml
bundles:
  - provider: claude-code
    name: example-plugin
    source: marketplace:anthropic/official@1.2.0
    install_pattern: wrap
    resolved_version: 1.2.0
    state: installed                            # installed | adopted | disassembled | disabled
    # Wrap/Adopt: 번들 내부는 black box, tree hash 만 기록 (Phase 1.5 증분)
    tree_hash: null                             # Phase 1 은 null 허용
    # Disassemble: 추출된 개별 자산은 각 provider 섹션의 개별 lock entry 로 전개
    extracted_to: null
```

**결정 C-4**: 위 스키마 확정. `concord.lock` 의 `bundles:` 섹션은 **provider 별 분리** (cross-tool 공유 불가).

---

## 상태 머신 (결정 B 확장)

번들 고유 상태 추가:

| 상태 | 의미 |
|---|---|
| `installed` (α Wrap 결과) | concord 가 설치 명령 대행 완료 |
| `adopted` (β Adopt 결과) | 기존 설치를 lock 에 기록만 |
| `disassembled` (γ Disassemble 결과) | 번들 미설치, 내부 자산만 개별 Type A/B/C 로 관리 |
| `disabled` | manifest 에서 `enabled: false` |
| `bundle-drift` | 설치됨으로 lock 에 기록되었으나 실제 provider 에서 제거됨 |
| `bundle-version-mismatch` | manifest 선언 버전과 실제 설치 버전 불일치 |
| `feature-flag-missing` | Codex `features.codex_hooks` 미활성화 상태에서 hook-포함 번들 |

---

## Phase 1 구현 스코프

### 포함
- [ ] `bundles:` 섹션 parser/validator (zod)
- [ ] Claude α Wrap: `concord sync` 시 marketplace entry 추가 + `/plugin install` 실행 감지 (설치 절차는 사용자가 실행, concord 는 상태만 track) ← 우선 검증
- [ ] Codex β Adopt: `~/.codex/plugins/cache/...` 스캔 → lock 에 기록
- [ ] OpenCode α Wrap: `opencode.json#plugin` 배열에 marker 블록 entry 추가
- [ ] γ Disassemble (opt-in): gh: source 에서 subpath 추출 후 Type A 자산으로 전개
- [ ] 충돌 lint (C-2 규칙)
- [ ] `features.codex_hooks` precheck (C-3)
- [ ] `concord doctor` 에 번들 상태 리포트 섹션

### 제외 (Phase 1.5+)
- Claude `/plugin install` 비대화식 자동 실행 (현재 `/plugin` UI 의존)
- Codex α Wrap (공식 배포 공개 대기)
- Bundle tree hash (증분 감지)
- Bundle 배포자 signed manifest 검증
- γ Disassemble 의 plugin.json 변수 (`${CLAUDE_PLUGIN_ROOT}`) 변환기

---

## 오픈 질문 (Phase 1.5+ 이관)

1. **Claude `/plugin install` 비대화 CLI 유무** — 확인되면 α Wrap 의 auto_install 기본값을 true 로 전환.
2. **Codex 공식 plugin 배포 공개 시점** — 공개되면 Codex α Wrap 승격.
3. **OpenCode npm plugin 의 peer dependency 충돌** — Bun 의 해결 동작에 의존, concord 가 개입해야 할지.
4. **Bundle 내부 자산의 권한 모델** — plugin 내 subagent 의 `hooks`/`mcpServers`/`permissionMode` frontmatter 가 무시되는 Claude 의 보안 정책을 concord 가 어떻게 노출.
5. **γ Disassemble 라이선스** — 원저자 의도 우회 이슈. 경고 메시지 정책.

---

## 결정 C FINAL 요약

| 서브 결정 | 결정 |
|---|---|
| C-1 기본 패턴 | Claude=α Wrap / Codex=β Adopt (Phase 1) / OpenCode=α Wrap, γ는 공통 opt-in |
| C-2 충돌 규칙 | 개별 자산 > 번들, provider 별 lint 엄격도 차등 |
| C-3 Codex flag precheck | sync precheck + doctor 이중, interactive 자동 활성화 제안 |
| C-4 스키마 | `bundles:` provider 별 분리, source URI 4 스킴, install_pattern 3종 |

---

**다음**: 결정 D(Windows fallback) + 결정 E(Secret 보간) → 디자인 문서 통합.
