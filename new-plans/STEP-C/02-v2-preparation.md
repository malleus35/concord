# 결정 C v2 준비 문서 — 고민 포인트 통합본 **[작성 2026-04-20, 같은 날 β3 재구조로 대체됨]**

> **⚠️ Historical — 2026-04-20 β3 재구조 (`03-plugin-source-model.md`) 로 대체됨**
>
> 이 문서의 "Bundle ↔ Plugin 경계" 판단-1~4 프레임은 같은 날 후속 계보학적 재조사에서 **가짜 경계** 로 판명. "bundle" 은 plugin 의 형용사 ("번들 단위로 여러 확장을 묶어 설치/배포") 에서 부풀려진 인플레이션 개념이며 별도 자산 타입이 아님 (`~/.claude/projects/-Users-macbook-workspace-concord/memory/feedback_bundle_inflation.md` 참조).
>
> 새 설계: [`03-plugin-source-model.md`](./03-plugin-source-model.md) — β3 옵션 α (plugin 자산 타입 + provider 별 source type) + D-mid+(iv) overlay (agentskills.io + MCP) + 모델 B 상태 머신 (Homebrew Bundle 스타일).
>
> 이 문서는 계보 추적·리뷰 이력 보존용으로 유지. 아래 판단-1~4 는 역사 기록이며 더 이상 유효하지 않음.

v2 본문(`03-bundle-plugin-v2.md`) 작성 **전**에 확정해야 할 판단·근거·리뷰 결과를 한 곳에 모아놓은 문서.

- 초안 v1 (`01-bundle-plugin.md`) 은 2026-04-20 리뷰 2회에서 기각.
- 대안 A (β-default + α opt-in) 방향으로 기울었으나 4개 세부 판단이 미확정.
- 이 문서는 "판단-1~4" 를 사용자가 내리는 데 필요한 **모든 맥락**을 원문 수준으로 보존.

관련 파일: [`01-bundle-plugin.md`](./01-bundle-plugin.md) (기각됨), [`../06-plugins.md`](../06-plugins.md), [`../07-overlap-matrix.md`](../07-overlap-matrix.md), [`../09-corrections-and-action-items.md`](../09-corrections-and-action-items.md), [`../STEP-B/07-cli-and-bootstrap.md`](../STEP-B/07-cli-and-bootstrap.md).

---

## 0. 결정 C 는 왜 필요한가

**위치**: MEMORY.md Asset Type Classification 표의 **Type D (번들/black box)**. 대상은 `Claude plugin` + `Codex plugin` + `OpenCode npm plugin`. 3 provider 가 plugin 을 **독자 규격**으로 배포. concord 가 이를 manifest 로 팀 공유 가능하게 만드는 방법이 필요.

**결정 A/B 와의 관계**:
- 결정 A(Skills) 는 Type A 배치 결정. 번들 내부 자산은 A 가 아니라 D.
- 결정 B(Sync/CLI) 는 공통 CLI·scope·lock 프레임. 번들 특수성은 B 위에 C 로 추가.
- 결정 D/E 는 C 후속 (Windows fallback 은 번들 installable 여부에 영향, Secret 은 private registry auth 주입).

**Ground rules (MEMORY.md L203–208)**:
- Single sync tool 철학: **resolver 중복 구현 금지, provider 런타임의 네이티브 동작 존중**
- Provider-native 기본, 공유는 명시적 opt-in

이 두 원칙이 v1 기각의 핵심 논거.

---

## 1. 초안 v1 (기각됨 2026-04-20) 의 4 서브 결정

### C-1 기본 설치 패턴 (v1)
| 패턴 | 동작 |
|---|---|
| α Wrap | manifest 선언 → concord 가 provider 네이티브 설치 명령 대행 |
| β Adopt | 사용자가 이미 설치한 plugin 을 lock 에 기록만 |
| γ Disassemble | plugin repo 의 개별 자산만 추출 (Type A/B/C 로) |

Provider 별 Phase 1 기본: Claude=**α**, Codex=**β-only** (공식 배포 "coming soon" 전제), OpenCode=**α**. γ 는 공통 opt-in.

### C-2 이름 충돌 (v1)
원칙: "개별 자산 > 번들 (explicit > implicit)". Claude 자동 prefix 로 실질 충돌 없다고 주장. Codex 경고+`why`. OpenCode lint 에러.

### C-3 Codex `features.codex_hooks` precheck (v1)
sync 시작 + doctor 이중 체크. interactive 자동 활성화 제안 (y/N).

### C-4 `bundles:` 스키마 (v1)
Source URI **단일 4 스킴**:
- `marketplace:<publisher>/<name>@<version>`
- `npm:<package>@<version>`
- `gh:<owner>/<repo>@<ref>[#subpath]`
- `file:<path>`

provider 별 `bundles:` 블록 분리. `install_pattern: wrap|adopt|disassemble`, `enabled`, `auto_install`, `extract:` (γ 전용).

### 기각 사유 (2026-04-20 리뷰 2회)

**1) 전제 붕괴 — Codex 가정 무효화**
- 초안이 "Codex 공식 배포 coming soon" 근거로 β-only 정책
- 2026-04 기준 실제:
  - Codex v0.121 에서 **`codex marketplace add <owner/repo[@ref]>` CLI 이미 출시** (https://developers.openai.com/codex/changelog)
  - `/plugins` UI 이미 제공
  - `--ref`, `--sparse` 플래그 존재 (web search, 공식 docs 명시는 일부)
- → C-1 의 Codex β-only 폐기 필수

**2) C-2 모델 오류 — Claude 는 precedence 가 아니라 coexistence**
- 공식 docs: Claude plugin skill 은 **항상 `plugin-name:skill-name` namespace** (https://code.claude.com/docs/en/plugins-reference)
- 동시에 short-name (`/foo`) 도 등록 — [GH #25150](https://github.com/anthropics/claude-code/issues/25150) flat 표시 버그 + [#43695](https://github.com/anthropics/claude-code/issues/43695) "namespace 강제 invocation 옵션" feature request
- `foo` 와 `plugin-z:foo` 는 **서로 다른 주소 — coexistence**
- v1 의 "개별 자산 > 번들" precedence 모델은 Claude 에서 **설명 모델 자체가 틀림**

**3) C-4 URI 누락 — Claude marketplace.json 의 4 source 타입 손실**
- 공식 docs (https://code.claude.com/docs/en/plugin-marketplaces):
  - `github` (owner/repo + ref + sha)
  - `url` (git URL + ref + sha)
  - `git-subdir` (monorepo 내 subdir)
  - `npm` (+ `registry`)
  - `strict: false` (raw file curation)
- v1 의 단일 `marketplace:publisher/name@version` 은 5 타입을 **string 하나로 평탄화 → 정보 손실**
- Codex marketplace 도 `github` / `Git URL` / `local dir` / `marketplace.json URL` 구분 필요
- OpenCode 는 `npm package` / `Bun git+https alias` / `로컬 .opencode/plugins/*.ts` 구분

**4) 누락 시나리오 7개**
- Private marketplace / internal registry (Claude `npm+registry`, Codex private marketplace.json)
- Air-gapped / offline install (로컬 dir 경로 필요)
- **Claude `dependencies` chain** — [공식 지원 docs](https://code.claude.com/docs/en/plugin-dependencies): plugin manifest 에 transitive 의존성 선언, 자동 해석·설치. lock 에 transitive state 없음
- Enable/disable portability: Claude 명시적, Codex `enabled = false`, OpenCode 는 공식 per-plugin disable bit 없음 (배열 in/out 만)
- Concurrent edit: concord sync vs provider 네이티브 설치 동시 실행 → config 파일 동시 쓰기 race
- Scope 매핑: B-7 4 scope × Claude native 3 scope (`managed-settings.json` 별도) 비대칭
- Digest pin 부재: B-7 은 `--sha256` TOFU 필수인데 v1 `marketplace:` URI 는 digest 필드 없음

**5) 정책 변동 속도 자체가 리스크**
- 초안 작성(2026-04-19) 하루 만에 Codex 전제 붕괴 (2026-04-20)
- 이 속도 하에서 FINAL 잠금은 취약 → provider runtime 위임 면적 최대화 필요

---

## 2. 리뷰 1 — codex-rescue (스펙·보안·lock 중심)

### 2.1 Source URI Union 스키마

**공식 문서 근거**:
- https://code.claude.com/docs/en/plugin-marketplaces
- https://code.claude.com/docs/en/plugins-reference
- https://developers.openai.com/codex/plugins
- https://developers.openai.com/codex/plugins/build
- https://opencode.ai/docs/plugins/
- https://opencode.ai/config.json
- https://bun.sh/docs/cli/add
- https://bun.sh/guides/install/npm-alias
- https://bun.sh/guides/install/add-git

**발견**:
- Claude marketplace entry plugin source: 공식 `github`, `url`, `git-subdir`, `npm`(+`registry`) 4종. plugin source 에 `ref` + `sha`. `strict: false` 공식 지원.
- Claude marketplace source 자체: GitHub shorthand, git URL, remote `marketplace.json` URL, local directory 공식 지원. `@ref`/`#ref`, `--sparse` 공식 문서.
- Claude "nested marketplace" 공식 미문서화. cross-marketplace 는 dependency allowlist 수준만 공식화.
- Codex 공식 문서: plugin directory, curated marketplace, repo marketplace(`$REPO_ROOT/.agents/plugins/marketplace.json`), personal marketplace(`~/.agents/plugins/marketplace.json`), plugin entry `source.path`(`local`) 명시.
- `codex marketplace add owner/repo@ref`, Git URL, remote `marketplace.json` URL, `--ref`, `--sparse` 는 2026-04-20 기준 OpenAI 공식 문서 **미확인** (브리핑 CLI 확인 사실 존재, 공식 계약 취급 금지).
- OpenCode 공식 문서: plugin = `.opencode/plugins/` 또는 `~/.config/opencode/plugins/` 의 JS/TS 파일, 혹은 `opencode.json#plugin` 의 npm package string. **"regular and scoped npm packages"만 명시**. `pkg@git+https`, tarball URL, alias 는 OpenCode 문서가 아니라 Bun 문서 → **공식 계약은 `opaque string` 까지만 안전**.

**제안 zod 스키마**:

```typescript
import { z } from "zod";

const Hex40 = z.string().regex(/^[0-9a-f]{40}$/i);
const Sha256 = z.string().regex(/^sha256:[0-9a-f]{64}$/i);

const GitRepoLocator = z
  .object({
    kind: z.literal("git-repo"),
    repo: z.string().regex(/^[^/]+\/[^/]+$/).optional(),
    url: z.string().url().optional(),
    ref: z.string().min(1).optional(),
    commit: Hex40.optional(),
    sparse: z.array(z.string().min(1)).min(1).optional(),
  })
  .superRefine((value, ctx) => {
    if (!value.repo && !value.url) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "repo 또는 url 중 하나는 필수",
      });
    }
  });

const GitSubdirLocator = z.object({
  kind: z.literal("git-subdir"),
  url: z.string().url(),
  path: z.string().min(1),
  ref: z.string().min(1).optional(),
  commit: Hex40.optional(),
});

const RemoteJsonLocator = z.object({
  kind: z.literal("remote-json"),
  url: z.string().url(),
  sha256: Sha256.optional(),
});

const LocalDirLocator = z.object({
  kind: z.literal("local-dir"),
  path: z.string().min(1),
});

const CatalogLocator = z.discriminatedUnion("kind", [
  GitRepoLocator,
  RemoteJsonLocator,
  LocalDirLocator,
]);

export const BundleSourceSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("catalog-plugin"),
    system: z.enum(["claude-marketplace", "codex-marketplace"]),
    catalog: CatalogLocator,
    plugin: z.string().min(1),
    marketplaceName: z.string().min(1).optional(),
    strict: z.boolean().optional(), // Claude only
  }),
  z.object({
    kind: z.literal("git-plugin"),
    locator: z.union([GitRepoLocator, GitSubdirLocator]),
  }),
  z.object({
    kind: z.literal("npm-package"),
    package: z.string().min(1),
    version: z.string().min(1).optional(),
    registry: z.string().url().optional(),
    rawSpecifier: z.string().min(1).optional(), // OpenCode/Bun opaque
  }),
  z.object({
    kind: z.literal("local-plugin-file"),
    path: z.string().min(1),
  }),
]);

export const BundleEntrySchema = z.object({
  id: z.string().min(1),
  pattern: z.enum(["alpha", "beta"]).default("beta"),
  auto_install: z.boolean().default(false),
  enabled: z.boolean().default(true),
  scope: z.enum(["user", "project", "local", "enterprise"]),
  source: BundleSourceSchema,
});
```

**resolve 규칙**:
```yaml
resolve_rules:
  catalog-plugin:
    claude-marketplace:
      git-repo: "claude plugin marketplace add <repo|git-url>[@ref] [--sparse ...] -> claude plugin install <plugin@marketplace>"
      remote-json: "claude plugin marketplace add <marketplace.json URL> -> claude plugin install <plugin@marketplace>"
      local-dir: "claude plugin marketplace add <dir> -> claude plugin install <plugin@marketplace>"
    codex-marketplace:
      local-dir: "repo/personal marketplace.json 에 entry 가 있어야 함. Phase 1 confirmed subset"
      git-repo: "가정: 사용자 브리핑의 CLI 확인 사실을 raw locator로 보존하되, official_docs=false 메타 필요"
      remote-json: "공식 문서 미명시"
  git-plugin:
    claude-code: "adopt 시 marketplace entry source github/url/git-subdir 를 lossless 보존"
    codex: "Phase 1 비권장. 공식 문서 미명시"
    opencode: "직접 매핑 없음"
  npm-package:
    opencode: "opencode.json#plugin[] string 으로 직렬화"
    claude-code: "Claude marketplace entry source=npm 으로 synthetic catalog 생성 시에만 사용"
  local-plugin-file:
    opencode: ".opencode/plugins/*.js|*.ts 또는 ~/.config/opencode/plugins/*.js|*.ts"
```

**엣지 케이스**:
- Claude `strict: false` 는 marketplace entry 가 전체 정의권 → lock 에 `strict` 반드시 보존
- Claude relative path plugin source 는 catalog 가 git-backed/local-dir 일 때만 안전. remote `marketplace.json` URL 에서는 relative path 가 공식적으로 깨질 수 있음
- Codex 는 공식상 local `source.path` 만 확실. GitHub/Git URL/remote JSON 은 Phase 1 입력 허용해도 `official_docs: false` guard 없이 설치 경로 사용 금지
- OpenCode `rawSpecifier` 는 Bun-backed opaque passthrough. Bun 의 모든 spec grammar 를 장기 계약으로 가정 금지
- `gamma` 는 스키마에서 제외 — manifest parse 시 `pattern=gamma` 는 Phase 1 parse error

### 2.2 Lock 포맷 재설계 (roots + nodes flat graph)

**발견**:
- Claude 는 dependency chain 공식 지원, install 시 dependency 자동 해석·설치 (https://code.claude.com/docs/en/plugin-dependencies)
- Claude dependency 는 bare name 또는 `{name, version, marketplace}` — version constraint 는 semver range, git tag 로 해석
- Claude plugin manifest `version` 이 marketplace entry `version` 보다 우선
- → lock 은 **root intent + resolved node graph 분리 필수**. nested-only 포맷은 shared dependency·drift 설명 약함
- Codex/OpenCode 는 공식상 transitive plugin dependency graph 미문서화 → 공통 lock 은 graph model 갖되 provider 별 node richness 차등
- B-7 TOFU/sha256 원칙 → "첫 fetch 선언값" + "실제 해석값" 둘 다 기록

**제안 lock 스키마**:

```yaml
bundles:
  roots:
    - key: "<provider>:<scope>:<bundle-id>"
      provider: claude-code|codex|opencode
      scope: user|project|local|enterprise
      pattern: alpha|beta
      auto_install: true|false
      enabled: true|false
      manifest_source: {}
      requested_state: present|disabled
      official_docs: true|false

  nodes:
    "<provider>:<namespace>/<plugin>@<resolved-version>":
      provider: claude-code|codex|opencode
      kind: plugin|package|local-file
      identity:
        marketplace: "<name-or-null>"
        plugin: "<plugin-or-package-name>"
      declared_version: "<manifest or source string value>"
      resolved_version: "<actual installed version>"
      resolved_from: plugin-manifest|marketplace-entry|npm-resolver|observed-install
      source: {}
      source_digest: {}
      content_digest: {}
      first_fetch:
        observed_at: "2026-04-20T01:32:11Z"
        tofu_confirmed: true
      installation:
        state: installed|adopted|disabled|drifted
        enabled: true|false
        install_path: "<absolute-or-user-path>"
        installed_at: "2026-04-20T01:32:13Z"
        bytes_sha256: "sha256:<64hex>"
      registry:
        canonical_url: "https://registry.npmjs.org"
        alias: null
      dependencies:
        - name: "<dependency-name>"
          marketplace: "<marketplace-or-null>"
          constraint: "<semver-range-or-*>"
          resolved_key: "<nodes key>"
      requested_by:
        - root: "<roots key>"
```

**Phase 1 선택**: `flat graph + roots`. shared dependency, orphan cleanup, `concord why`, drift 설명이 nested tree 보다 단순.

**엣지 케이스**:
- Claude dependency 가 두 root 에 공유되면 node 하나, `requested_by` 만 늘어남
- `declared_version` 비어 있고 `resolved_version` 만 있는 β Adopt 는 `resolved_from: observed-install` 표기
- Private registry 는 lock 에 alias 가 아니라 `canonical_url` 보존. alias 는 manifest UX 용
- Codex curated plugin 의 source catalog 세부가 로컬 복원 안 되면 `source.kind: catalog-plugin` 유지하되 `catalog` 일부 필드 null 허용

### 2.3 Digest Pin 3중 (source / content / catalog)

**발견**:
- Claude plugin source 는 `ref` 와 `sha` 둘 다. marketplace source 는 `ref` 만 공식, `sha` 없음
- Claude dependency resolution 은 git tag 기반 → lock 에 tag 결과물인 **실제 commit digest** 필요
- OpenCode 는 npm plugin install 을 Bun 에 위임. Bun 은 registry integrity (sri), git, tarball 공식 지원
- 공식 문서 어디에도 concord 가 믿을 공통 digest contract 없음 → **lock 자체 canonical digest field 필수**

**제안 규칙**:
```yaml
digest_rules:
  git-repo:
    source_digest: { algorithm: git-commit, value_format: "git:<40hex>" }
    content_digest: { algorithm: sha256, value_format: "sha256:<64hex>" }
  git-subdir:
    source_digest: { algorithm: git-commit, value_format: "git:<40hex>" }
    content_digest: { algorithm: sha256, value_format: "sha256:<64hex>" }
    note: "content_digest 는 sparse checkout 된 subdir bytes 기준"
  npm-package:
    source_digest: { algorithm: sri, value_format: "sri:sha512-..." }
    content_digest: { algorithm: sha256, value_format: "sha256:<64hex>" }
  tarball-url:
    source_digest: { algorithm: sha256, value_format: "sha256:<64hex>" }
    note: "downloaded bytes 그대로 해시"
  marketplace-catalog-git:
    source_digest: { algorithm: git-commit, value_format: "git:<40hex>" }
    note: "ref/tag 는 lock 에 별도 보존, trust 는 commit 기준"
  marketplace-catalog-remote-json:
    source_digest: { algorithm: sha256, value_format: "sha256:<64hex>" }
    note: "git commit 을 알 수 없으므로 bytes digest"
  local-dir-or-file:
    source_digest: { algorithm: sha256, value_format: "sha256:<64hex>" }
    note: "Phase 1 은 normalized tree/file bytes 기준"
```

**엣지 케이스**:
- branch/tag 가 움직여도 `ref` 는 참고값. drift 판정은 digest mismatch 기준
- 같은 semver 라도 bytes 다르면 `content_digest` mismatch → drift
- OpenCode `rawSpecifier` 가 git/tarball/alias 일 때 Bun resolver 가 설치한 것의 관찰 가능한 digest 만 lock
- remote `marketplace.json` URL 은 ETag 가 아니라 bytes SHA-256 을 trust anchor

### 2.4 Coexistence 재모델링

**발견**:
- Claude: plugin skill 은 항상 `plugin-name:skill-name` namespace. standalone `/foo` 와 plugin `/plugin:foo` 는 **coexistence** (precedence 아님)
- Codex: 같은 `name` 을 가진 skill 을 merge 하지 않고 둘 다 selector 노출 — 공식 명시
- OpenCode: "unique across all locations" 공식 troubleshooting rule

**제안 `why` 출력**:
```yaml
why_output:
  id: foo
  providers:
    claude-code:
      status: coexist
      selectors: ["/foo", "/deploy-kit:foo"]
      policy: warn
      explanation: "plugin namespace 분리, precedence 없음"
    codex:
      status: duplicate-visible
      selectors: ["foo (repo .agents/skills)", "foo (plugin gmail@openai-curated)"]
      policy: warn
      explanation: "공식 문서상 둘 다 selector 에 나타날 수 있음"
    opencode:
      status: collision-error
      selectors: [".opencode/skills/foo", ".agents/skills/foo"]
      policy: error
      explanation: "공식 문서상 names unique across all locations"
```

**Detect strict policy**:
```yaml
detect_strict_policy:
  claude-code:
    default: warn
    strict: warn
    error_when:
      - "동일 plugin namespace 내부 중복"
      - "manifest alias 충돌로 slash command 가 동일 문자열"
  codex:
    default: warn
    strict: error
    error_when:
      - "--strict && 동일 skill name 이 둘 이상 노출"
  opencode:
    default: error
    strict: error
    error_when:
      - "동일 skill name 이 다른 위치에서 동시 발견"
```

**엣지 케이스**:
- Claude plugin disable 상태면 `why` 에서 selector 는 historical note, active collision 세트 제외
- Codex duplicate 가 root vs plugin skill 인지 selector 에 source path 반드시 표시
- OpenCode plugin (local JS/TS) 과 npm plugin 은 "similar names are both loaded separately" → plugin runtime name collision 과 skill name collision 구분
- β Adopt 에서 bundle 내부 자산 introspect 불가 → "잠재 충돌 미검증" 별도 상태

### 2.5 Concurrent Edit 방어

**발견**:
- Claude: settings scope 와 plugin marketplace/state 경로 설명, **file lock/fcntl/atomic write 미문서화**
- Codex: `~/.codex/config.toml` 와 marketplace file 구조 설명, atomic write/lock 계약 미문서화
- OpenCode: `opencode.json` merge 와 startup Bun install 설명, `bun.lock` 생성/위치/동시 편집 계약 **공식 미명시**
- 결론: **concord 가 provider runtime 에 동시성 안전 위임 금지**

**제안**:
```yaml
concurrency:
  claude-code:
    lock_targets:
      - "~/.claude/settings.json"
      - ".claude/settings.json"
      - ".claude/settings.local.json"
      - "~/.claude/plugins/known_marketplaces.json"
    advisory_lock: true
    lock_impl: "sidecar .lock + fcntl/flock"
    write_strategy: "read -> raw_hash check -> temp file -> fsync -> rename"
    on_change_before_commit:
      interactive: "reread once, preview diff, confirm or abort"
      noninteractive: "abort"
  codex:
    lock_targets:
      - "~/.codex/config.toml"
      - "$REPO_ROOT/.agents/plugins/marketplace.json"
      - "~/.agents/plugins/marketplace.json"
    advisory_lock: true
    lock_impl: "sidecar .lock + fcntl/flock"
    write_strategy: "read -> raw_hash check -> temp file -> fsync -> rename"
    on_change_before_commit:
      interactive: "abort by default; TOML merge 는 명시 확인 후만"
      noninteractive: "abort"
  opencode:
    lock_targets:
      - "opencode.json"
      - "~/.config/opencode/opencode.json"
      - ".opencode/package.json"
      - "~/.config/opencode/package.json"
    advisory_lock: true
    lock_impl: "sidecar .lock + fcntl/flock"
    write_strategy: "read -> raw_hash check -> temp file -> fsync -> rename"
    on_change_before_commit:
      interactive: "reread once, merge if key-disjoint, else abort"
      noninteractive: "abort"
  runtime_artifacts:
    bun_lock:
      official_docs: false
      policy: "unmanaged"
```

**엣지 케이스**:
- provider native command 가 concord lock 을 존중 안 할 수 있음 → advisory lock 만 부족, **pre-write hash compare 필수**
- seed-managed Claude marketplace / managed settings 는 readonly, retry 가 아니라 즉시 abort
- Codex TOML 은 round-trip 손상 리스크 높아 auto-merge 보다 abort 기본
- OpenCode startup Bun install 동안 concord 가 plugin array 변경하면 runtime cache 와 config 일시 불일치 → sync 완료 후 "restart recommended" 표시

### 2.6 Security Trust Gate

**발견**:
- Claude plugin: hooks, MCP servers, LSP servers, monitors, PATH executables, settings defaults 포함 가능 — 신뢰 게이트는 단순 version prompt 로 부족
- Codex plugin: skills + apps + MCP servers. 외부 앱 인증/권한 흐름 연결
- OpenCode plugin: JS/TS 코드가 startup 로드 + npm dependencies Bun 자동 설치
- Bun 은 lifecycle script 기본 차단 방향이지만 npm package 실행 surface 자체는 JS runtime trust problem
- 공식 문서에 plugin CVE check contract 없음 → Phase 1 은 "가능/불가/미실행" 표시까지만

**Trust gate 체크리스트**:
```yaml
trust_gate_checklist:
  origin:
    source_kind: catalog-plugin|git-plugin|npm-package|local-plugin-file
    publisher: "<marketplace owner | npm scope | repo owner | local path>"
    canonical_source: "<repo/url/registry/path>"
    official_docs_backed: true|false
  resolution:
    declared_version: "<user or manifest value>"
    resolved_version: "<actual version>"
    source_digest: "<canonical digest>"
    catalog_digest: "<optional>"
    tofu_state: first-seen|pinned|drifted
  dependencies:
    direct_count: 0
    transitive_count: 0
    unresolved_count: 0
  execution_surface:
    shell_hooks: true|false
    js_runtime: true|false
    mcp_servers: true|false
    app_integrations: true|false
    path_binaries: true|false
    network_auth: true|false
  reproducibility:
    mode: dev-interactive|ci-noninteractive
    lock_complete: true|false
    digest_complete: true|false
  cve:
    status: available|not-available|not-run
    ecosystem: npm|git|none
```

**Trust prompt 샘플**:
```text
Install bundle `deploy-kit` in project scope?

Origin
- claude-marketplace / acme-corp/claude-plugins@stable
- plugin: deploy-kit
- official docs backed: yes

Resolution
- declared: 3.1.0
- resolved: 3.1.0
- catalog digest: git:8fd2...
- source digest: git:1c4b...

Dependencies
- direct: 2
- transitive: 2

Execution surface
- hooks shell: yes
- MCP servers: yes
- PATH binaries: no
- app integrations: no

Reproducibility
- auto_install: true
- lock complete: yes
- CI-safe: yes

CVE
- status: not-run
- ecosystem: git

Proceed?
[1] Install once
[2] Always trust this exact digest for this manifest
[3] Cancel
```

**엣지 케이스**:
- β Adopt 로 이미 설치된 bundle 끌어올 때 source/digest 완전 복원 못 하면 `official_docs_backed: false`, `digest_complete: false`, 기본 adopt-only 제한
- CI/non-TTY: prompt 대신 `digest_complete && lock_complete && auto_install=true` 아니면 fail closed
- OpenCode local JS/TS plugin 은 version 개념 없을 수 있음 → version 대신 file digest trust anchor
- Claude dependency chain 중 cross-marketplace allowlist 의존하면 root marketplace + dependency marketplace 둘 다 표시

---

## 3. 리뷰 2 — general-purpose (UX·선례·거버넌스 중심)

### 3.1 선례 연구 (웹서치)

**A. chezmoi `.chezmoiexternal.$FORMAT`**
- "외부 파일/아카이브를 source state 에 편입" manifest. `type` 필드로 `file`/`archive` 분기, `url`/`urls` 명시
- `refreshPeriod` + `-R/--refresh-externals` 강제
- templating 지원 — 머신별 조건부 include. concord enterprise/local scope 와 동형
- 근거: https://www.chezmoi.io/reference/special-files/chezmoiexternal-format/

**B. Neovim `lazy.nvim` / `vim.pack` lockfile**
- `lazy-lock.json` VCS 커밋 → 다른 머신에서 `:Lazy restore` 로 정확히 같은 커밋 재현
- `vim.pack` 은 `$XDG_CONFIG_HOME/nvim/nvim-pack-lock.json` 1급 객체 — "lockfile 을 VCS 에 올려라" 공식 지침
- 배울 점: **lock 이 manifest 보다 먼저 권위**, "manifest=intent, lock=reality" 분리
- 근거: https://github.com/folke/lazy.nvim, https://echasnovski.com/blog/2026-03-13-a-guide-to-vim-pack/

**C. Home-Manager (Nix) `mutableExtensionsDir = false`**
- VSCode extension 을 완전 선언적 고정. 수동 설치 불가
- 배울 점: `auto_install` + **strict/loose 이분법**. "엄격 모드에서 선언 안 된 plugin 을 prune"
- 피할 점: plugin 은 재fetch 비용 큼. **strict 기본 금지**
- 근거: https://discourse.nixos.org/t/home-manager-vscode-extension-settings-mutableextensionsdir-false/33878

**D. VSCode `.vscode/extensions.json` + `extensions.allowed`**
- `.vscode/extensions.json` = **recommendations only**. 열 때 notification 만, 자동 설치 없음
- `extensions.allowed` (enterprise policy) = **allow/deny list 강제**
- 배울 점: **"권고 vs 강제" 를 다른 manifest 계층에 배치** — B-7 project=권고, enterprise=강제
- 근거: https://code.visualstudio.com/docs/editor/extension-marketplace, https://code.visualstudio.com/docs/enterprise/extensions

**E. JetBrains `.idea/externalDependencies.xml`**
- 팀원이 열면 "이 프로젝트는 X plugin 필요" 알림만. 자동 설치 없음
- IDE Services enterprise allowlist/denylist. 충돌 시 **blocking rules 우선**
- 배울 점: **"declarative-track + notify"** 가 팀 공유의 실증 디폴트 — β Adopt 디폴트 뒷받침
- 근거: https://www.jetbrains.com/help/idea/managing-plugins.html, https://www.jetbrains.com/help/ide-services/manage-available-plugins.html

**F. Claude Code `enabledPlugins` + `extraKnownMarketplaces` + `strictKnownMarketplaces`** — 공식 문서에 **3-layer governance 이미 존재**
- `.claude/settings.json#extraKnownMarketplaces` = 프로젝트 권고
- `.claude/settings.json#enabledPlugins` = "기본 enable" 지시
- `managed-settings.json#strictKnownMarketplaces` = **정규식 host/path pattern allowlist**. `[]` 로 완전 lockdown
- 배울 점: **Claude 가 이미 scope × policy 매트릭스 내장** — concord 는 얇게 3-provider 통일 레이어만
- 근거: https://code.claude.com/docs/en/plugin-marketplaces

**G. Codex `codex marketplace add --scope user|project|local`**
- 2026-04 출시된 scope 플래그 (web search 결과)
- Codex 공식 plugin docs 는 scope level 명시 안 함 → **POC 필요**

**H. asdf/mise `.tool-versions` + plugin 이원화**
- `.tool-versions` = 버전 선언, plugin = 각 도구용 어댑터
- 배울 점: **"무엇을 설치할지 (manifest)" 와 "어떻게 설치할지 (provider adapter)" 를 분리**
- 근거: https://mise.jdx.dev/dev-tools/comparison-to-asdf.html

**핵심 결론**:
1. **chezmoi + lazy.nvim 교집합이 concord 의 정답**: manifest=intent, lock=reality, `concord sync --refresh-bundles` = chezmoi `-R` 동형
2. **VSCode "recommendations vs allowed" 이분법 → 4-scope 매핑**:
   - `concord.yaml` → "recommended" (project scope, 팀 권고)
   - `concord.enterprise.yaml` → "allowed/required" (enterprise, 강제)
   - `concord.user.yaml` → "personal preference"
   - `concord.local.yaml` → "ephemeral override"
3. **JetBrains "install 없이 notify" 를 β Adopt 디폴트로 명문화**:
   - `concord sync` 시 선언만 있고 미설치 plugin → **에러 아닌 warning + 설치 안내**
   - `auto_install: true` 만 실제 설치 주도

**실패 모드**:
- chezmoi 과적합: plugin 은 **런타임 재시작 사이드이펙트** → "설치" 와 "활성화" 구분 못 하면 침묵 실패
- lazy.nvim 단순성 오해: lazy.nvim 은 단일 런타임. concord 는 3 provider 각 lockfile 시맨틱 다름
- Home-Manager strict 차용 시: 사용자 수동 설치 plugin 강제 prune 하면 큰 분노 — strict 는 opt-in-only + 경고 3중 게이트

### 3.2 3 provider plugin 의 본질 정의

- **Claude Code plugin** = "파일 묶음 + git-repo 또는 npm-package 형태 **declarative 자산 컨테이너**". skills/agents/commands/hooks/MCP/LSP 를 `plugin.json` 으로. 설치 = **marketplace catalog 경유 lazy clone**
- **Codex plugin** = "`.codex-plugin/plugin.json` 을 가진 **skills + apps + MCP servers 번들**. `codex marketplace add` CLI 로 등록 후 `/plugins` UI 또는 CLI 설치"
- **OpenCode plugin** = "**JS/TS npm 패키지**. `package.json#main` 을 entry 로 하는 코드-레벨 hook 구현체. `opencode.json#plugin` 배열에 npm 이름 → Bun 이 `~/.cache/opencode/node_modules/` 설치"

**본질 대비 (결정 C 의 근본 갈림길)**:
- Claude plugin = **"파일 묶음 + manifest"** (데이터 중심)
- Codex plugin = **"파일 묶음 + manifest + app 통합"** (데이터 + 외부 SaaS)
- OpenCode plugin = **"실행 가능한 코드"** (코드 중심, hook 구현)

### 3.3 공통 추상화 가능/불가능 축

**가능**:
- 이름 (`name`) — string id
- 버전 (`version`) — semver 유사
- source (**where**) — URL/repo/path
- enable/disable state — 플래그 하나
- marketplace/catalog scope (user/project/enterprise)

**불가능**:
- **설치 단위**: Claude/Codex = plugin 디렉토리, OpenCode = npm package. `installed_path` 통일 불가
- **Dependency 모델**: Claude `dependencies` 체인 (issue #9444), Codex dependency 필드 없음, OpenCode = Bun 자동
- **Hook surface**: Claude 26 events, Codex plugin 에 hooks 없음, OpenCode plugin = hooks 그 자체
- **실행 모델**: Claude copy-on-install → `${CLAUDE_PLUGIN_ROOT}`, Codex cache-in-place, OpenCode Bun runtime
- **Strict mode 의미**: Claude `strict: true/false`. 다른 provider 없음
- **Source type 스키마**: Claude 5가지, Codex 3가지, OpenCode 1-2가지

**제안 — `bundles:` 계층화**:
```yaml
# 공통 핵심
bundles:
  - provider: claude-code
    name: github-mcp
    source: <provider-specific URI>
    version: "^1.2.0"
    enabled: true
    scope_target: project
    auto_install: false
    track_only: true

    # === provider-specific escape hatch ===
    claude:
      strict: false
      dependencies_follow: true
    codex:
      ref: "v0.3.1"
      sparse: ["./skills"]
    opencode:
      # 추가 옵션 없음
```

**핵심 원칙**: 공통 추상화는 **정보 추출** (lock/drift/doctor) 에만. 설치·제거 **명령 생성** 은 provider-specific 블록 위임. kubectl `spec:` 안에 provider-specific field 동형.

### 3.4 End-user 시나리오

#### S1 — git clone 후 concord sync

**전제 `concord.yaml`**:
```yaml
providers:
  claude-code:
    bundles:
      - name: github-mcp
        source: claude+github:anthropic/claude-plugins@main#github-mcp
        enabled: true
  codex:
    bundles:
      - name: gmail
        source: codex+github:openai/codex-marketplace@main
        plugin_name: gmail
        enabled: true
  opencode:
    bundles:
      - name: "@acme/lint"
        source: opencode+npm:@acme/opencode-plugin@^2.0.0
        enabled: true
```

**실행**:
```
$ concord sync
Scanning 3 providers...
  claude-code: 1 bundle declared
  codex:       1 bundle declared
  opencode:    1 bundle declared

Provider file changes (planned):
  claude-code:
    + .claude/settings.json#extraKnownMarketplaces.anthropic-claude-plugins
    + .claude/settings.json#enabledPlugins."github-mcp@anthropic-claude-plugins"
  codex:
    + .agents/plugins/marketplace.json (project scope)
    + ~/.codex/config.toml#[plugins."gmail@codex-marketplace"] enabled=true
  opencode:
    + opencode.json#plugin [+ "@acme/opencode-plugin@^2.0.0"]

Installation (auto_install=false, track_only):
  claude-code:github-mcp → requires manual: /plugin install github-mcp@anthropic-claude-plugins
  codex:gmail             → requires manual: codex /plugins → Install gmail
  opencode:@acme/lint     → auto-installed by Bun on next opencode start

concord.lock will record: 3 bundles

Proceed? [y/N]
```

**실패 지점 + 복구**:
| 실패 | 원인 | 복구 |
|---|---|---|
| Claude `/plugin install` 거부 (private auth) | `GITHUB_TOKEN` 미설정 | `concord doctor` 가 `gh auth status` 체크 + 안내 |
| Codex hook 포함 plugin + `codex_hooks` flag off | `features.codex_hooks=false` | sync precheck 에러 + `codex config set features.codex_hooks true` 안내 |
| OpenCode Bun 이 package 404 | 제거/rename | Bun error, lock `state=install_failed` |
| `opencode.json` round-trip 파괴 | jsonc-morph 미사용 | B 최우선 리스크 — 골든 테스트 |
| 네트워크 off | clone/npm 실패 | lock 보존 + warning, sync 비실패 |

#### S2 — 팀원이 수동 설치 후 concord sync

**제안 동작**: β Adopt 자동 수용 + 알림

```
$ concord sync
Scanning providers for undeclared installations...

Found 1 undeclared Claude plugin:
  + claude-code: some-plugin@community-marketplace
    location: ~/.claude/plugins/cache/community-marketplace/some-plugin/1.0.0
    installed manually (not in any concord.yaml)

Action for undeclared 'some-plugin':
  [a]dopt into concord.yaml (project)
  [u]ser adopt (into concord.user.yaml)
  [i]gnore (add to concord.local.yaml#ignored_bundles)
  [s]kip (don't decide now)
  Choice: █
```

**"가장 덜 놀라운" 기본**: **발견하되 건드리지 않음**. sync 성공, `doctor` 가 경고. `concord adopt` 별도 실행 시만 manifest 편입 (B-7 Terraform apply 패턴).

#### S3 — concord.yaml 에서 plugin 삭제

| 원래 | 기본 동작 |
|---|---|
| `auto_install: true` | 자동 uninstall 제안 + y/N |
| `auto_install: false` | lock 에서만 제거, provider 손대지 않음 |

```
$ concord sync
Removing from manifest:
  - claude-code: github-mcp     (was: auto_install=true)
  - codex: gmail                (was: auto_install=false)
  - opencode: @acme/lint        (was: auto_install=true)

Uninstall actions:
  claude-code: github-mcp
    → run /plugin uninstall github-mcp@anthropic-claude-plugins? [y/N]
    → or edit .claude/settings.json#enabledPlugins manually
  codex: gmail
    → track_only: no action taken. To remove manually: codex /plugins → Uninstall
  opencode: @acme/lint
    → remove from opencode.json#plugin array? [y/N]
    → Bun will skip on next start (cache stays in ~/.cache/opencode/node_modules/)
```

**덜 놀라운 기본 규칙**:
- Provider-native uninstall 명령은 concord 자동 실행 절대 금지 (Claude `/plugin uninstall` 비대화 여부 **공식 미확인**)
- concord 는 **config 파일 편집** 만 주도. 캐시 삭제 안 함 → 재설치 빠름
- OpenCode 배열 제거는 자동
- Claude `enabledPlugins: false` 자동, cache 디렉토리 건드리지 않음

**실패 모드**:
- "자동 uninstall 제안" Claude 비대화 CLI **미확인** → Phase 1 "안내만"
- S2 의 "adopt 프롬프트" CI 치명적 → `--adopt-strategy=ignore|adopt|fail`
- OpenCode 캐시 보존 vs 보안 → `concord sync --purge-cache`
- "config 편집, 명령 미실행" 혼란 → "Next step: restart / run `/plugin disable`" 출력

### 3.5 거버넌스·공급망 보안

**실증 공격 (2026)**:
- **CVE-2026-22812**: OpenCode 자체 unauthenticated HTTP server → 악성 웹사이트가 로컬 명령 실행. 1.0.216+ 필요
- **CVE-2026-24910 (Bun)**: 악성 npm package 가 install lifecycle script 실행. Bun 1.3.5 수정
- **Shai-Hulud / Axios npm supply chain**: Microsoft 보안 블로그 — "AI agent 가 npm 자동 설치하는 워크플로우 자체를 고위험"
- **Claude 명시**: "plugin contents 를 Anthropic 이 검증하지 않는다"

**엔터프라이즈 정책 선례**:
- Claude `strictKnownMarketplaces` = regex allowlist
- VSCode `extensions.allowed`
- JetBrains IDE Services allow/deny, block 우선
- GitHub VSCode Insiders MCP registry allowlist

**Plugin author 계약 (γ 우려)**:
- Claude `${CLAUDE_PLUGIN_ROOT}` = plugin copy path 전제 → disassemble 시 깨짐
- Plugin author 는 `strict: true` 로 plugin.json 권위 천명 가능 → disassemble 은 `strict: false` 강제 치환 동형 → **의도 우회**

**제안**:
```yaml
bundles:
  - name: "@acme/lint"
    source: opencode+npm:@acme/opencode-plugin@2.0.0
    auto_install: false
    integrity:
      sha256: "abc123..."                # auto_install: true 시 필수
```

- `auto_install: true` → `integrity.sha256` **필수** (B-7 URL sync `--sha256` 대칭)
- Phase 1.5 `--audit` 모드: npm audit, GitHub Advisory DB, `strict: true` 위반 확인
- **SBOM 기록**: `concord.lock#bundles[].sbom` — resolved version + sha + install timestamp

**`concord.enterprise.yaml#bundles_policy`**:
```yaml
bundles_policy:
  allowed_sources:
    - claude+github:anthropic/*
    - claude+github:acme-corp/*
    - codex+github:openai/codex-marketplace
    - opencode+npm:@acme/*
  denied_names:
    - "*@community-*"
  require_signed: false                  # Phase 4 cosign
  require_sha_pin: true
  conflict_precedence: deny_wins
```

**γ Phase 1.5 legal_ack**:
```yaml
disassemble:
  source: claude+github:foo/bar@v1
  legal_ack:
    license_file: ./LICENSE-foo-bar
    author_notice: "Disassembled with permission per ..."
  warning_shown: true
```

### 3.6 네이밍 옵션

**Option-R1**: α/β/γ 유지 + 문서 병기
**Option-R2**: `mode: managed | tracked | extracted` 동사 기반
**Option-R3 (추천)**: 패턴 개념 제거

```yaml
bundles:
  - name: github-mcp
    source: claude+github:...
    auto_install: false
    purge_on_remove: false

# γ 는 별도 루트 섹션
disassembled_sources:
  - source: claude+github:foo/bar@v1
    extract_to:
      skills: [./team-skills/]
      agents: [./team-agents/reviewer.md]
    legal_ack:
      license_file: ./LICENSE-foo-bar
```

**근거**: YAGNI, γ 는 bundle 관리가 아니라 asset extraction 이므로 별도 섹션이 의미 정합.

**실패 모드**:
- `tracked` 의미 불일치: β Adopt 는 "이미 설치된 것 lock 기록", `tracked` 는 "선언만, 설치 안 함" 포함 → Phase 1 lock `state` 로 구분: `tracked-uninstalled` vs `tracked-installed-externally`
- R3 → Phase 1.5 시 `disassembled_sources:` 도입 → 스키마 breaking change → `schema_version: 1 → 2` 마이그레이션
- `purge_on_remove: false` 기본값 디스크 leak → `concord doctor --orphan-cache`

---

## 4. 사용자가 결정해야 할 4가지 판단

### 판단-1. 네이밍 체계

| 옵션 | 설명 | 예시 |
|---|---|---|
| R1 | α/β/γ 유지 + 문서 병기 | `install_pattern: wrap` (= managed) |
| R2 | 동사 기반 | `mode: managed\|tracked\|extracted` |
| **R3 ★** | 패턴 개념 제거 | `auto_install: bool` + `disassembled_sources:` 별도 |

**R3 추천 근거**: CLI 출력 불투명도 감소, 동사 기반 선례 다수, YAGNI.

### 판단-2. γ Disassemble 처리 위치

| 옵션 | 설명 |
|---|---|
| G1 | `bundles[].extract:` 병존 (v1 방식) |
| **G2 ★** | `disassembled_sources:` 루트 섹션 별도 (Phase 1.5 예약) |
| G3 | Phase 1 완전 제거. `skills:`/`agents:` 에 `source: gh:...` 직접 사용 |

**G2 추천 근거**: 개념 분리 자연스러움. Phase 1 에 섹션만 예약, 내부는 Phase 1.5.

### 판단-3. Enterprise `bundles_policy` 포함 시점

| 옵션 | 설명 |
|---|---|
| E1 | Phase 1 포함 |
| **E2 ★** | Phase 1.5 이관 (MVP 는 user/project scope) |

**E2 추천 근거**: MVP 는 개인/팀 seeing first. B-7 의 "enterprise never-default" 원칙 정합.

### 판단-4. 상태 머신 확장 범위

| 옵션 | 상태 수 |
|---|---|
| S1 | 8개 (tracked-uninstalled / tracked-installed-externally / managed-install-failed / bundle-drift / cache-orphan / integrity-mismatch / feature-flag-missing / bundle-version-mismatch) |
| **S2 ★** | 5개 + reason (tracked-uninstalled / managed-installed / drift / integrity-mismatch / cache-orphan) |

**S2 추천 근거**: UX 메시지 설계 단순화. `reason: version-mismatch|feature-flag-missing|...` 으로 표현.

---

## 5. 재작성 v2 목차 스켈레톤

```
# 03-bundle-plugin-v2.md (대안 A 방향)

0. v1 → v2 변경 요약
1. 본질 정의 (Claude 데이터 / Codex 데이터+앱 / OpenCode 코드)
2. `bundles:` 스키마 v2
   2.1 공통 필드
   2.2 provider-specific 블록
   2.3 Source URI discriminated union (zod)
   2.4 `disassembled_sources:` (Phase 1.5 예약)
3. 서브 결정 C-1~C-7
   3.1 C-1 설치 거동 (auto_install boolean)
   3.2 C-2 충돌 규칙 (coexistence)
   3.3 C-3 Codex codex_hooks precheck (자동 활성화 제거)
   3.4 C-4 Source URI + integrity
   3.5 C-5 [신설] Scope 매핑
   3.6 C-6 [신설] integrity.sha256 digest pin
   3.7 C-7 [신설] Dependency chain (Claude transitive lock)
4. CLI UX (B-7 확장)
   4.1 `concord sync` — S1/S2/S3
   4.2 `concord doctor` — bundle (drift/undeclared/cache-orphan)
   4.3 `concord adopt` — S2 flow
   4.4 비대화 플래그 (--adopt-strategy, --purge-cache)
5. 상태 머신 (tracked-uninstalled / managed-installed / drift / integrity-mismatch / cache-orphan)
6. Lock 스키마 (roots + nodes flat graph)
7. 거버넌스 (Phase 1.5 예약)
8. Phase 1 스코프 (포함/제외 체크리스트)
9. POC 항목 (POC-1~3 + POC-5~12)
10. 오픈 질문
11. FINAL 요약
```

---

## 6. POC 추가 8개 (기존 POC-1~4 외)

| POC | 확인 대상 | 연관 결정 |
|---|---|---|
| POC-5 | Claude `plugin uninstall/disable` 비대화 CLI | S3 자동 uninstall |
| POC-6 | Claude `dependencies` chain transitive (issue #9444 merged/pending) | C-7 lock |
| POC-7 | Codex `marketplace add --scope` 실제 동작 (공식 docs 미명시) | C-5 scope |
| POC-8 | OpenCode Bun `--ignore-scripts` 활용 (CVE-2026-24910) | 공급망 |
| POC-9 | OpenCode 3경로 precedence | C-2 |
| POC-10 | Claude `strictKnownMarketplaces` × concord `bundles_policy` 2중 필터 | 거버넌스 |
| POC-11 | Claude plugin `ref` vs `sha` precedence | C-6 |
| POC-12 | OpenCode `file://` local source lock 정합성 | Cross-machine |

---

## 7. 결정 B/D/E 연계 포인트

**결정 B-7 (CLI)**:
- `concord sync --adopt-strategy=ignore|adopt|fail` 신설
- `concord sync --purge-cache` / `concord doctor --orphan-cache`
- `--scope` 매트릭스에 bundle × provider-native scope 매핑 표
- `concord import --url` 의 `--sha256` 을 `bundles[].integrity.sha256` 공통화

**결정 B state machine**:
- `tracked-uninstalled`, `tracked-installed-externally`, `managed-install-failed`, `cache-orphan`, `integrity-mismatch` 5개 신설. B-1 `drift`/`orphan`/`shadowed` 와 동거 검증 필요

**결정 D (Windows fallback)**:
- Codex hook 포함 plugin 은 Windows 에서 silent-fail. `doctor` 가 "bundle-installable-but-non-functional-hooks" 경고
- Claude `${CLAUDE_PLUGIN_ROOT}` Windows 백슬래시 — 공식 미언급 **미확인**

**결정 E (Secret 보간)**:
- enterprise `bundles_policy.allowed_sources` 에 `{env:CORP_NPM_REGISTRY}` 보간 필요성
- Claude npm source `registry` 에 `{env:NPM_CORP_REGISTRY}` 보간 시 lock 에 **resolved URL + env var 이름** 양쪽 기록
- `gh:` source `Authorization` 헤더에 `{secret:keychain://gh-token}` 보간 — C-4 가 E 를 constrain

---

## 8. 미확인 사항 (명시)

- **Codex plugin scope 계층** (user/project/enterprise): 공식 docs 에 "user-level only" 만 언급. `codex marketplace add --scope` 는 changelog + web search 추정, 공식 docs 페이지 확인 실패 → **POC-7 필수**
- **Claude `dependencies` 필드 공식 릴리스**: issue #9444 feature request, 실제 marketplace.json schema 편입 여부 2026-04 docs 상 **미확인** → v2 는 "Phase 1.5 재확인" 보류
- **OpenCode uninstall CLI**: 공식 docs 없음, 배열 편집만
- **Claude plugin subagent `${CLAUDE_PLUGIN_ROOT}` Windows 경로**: 공식 미언급 → 결정 D 검증

---

## 9. 사용자 판단 요청

**(A) 판단-1~4 답변**:
- 판단-1 네이밍: **R1 / R2 / R3★**
- 판단-2 γ 처리: **G1 / G2★ / G3**
- 판단-3 enterprise: **E1 / E2★**
- 판단-4 state: **S1 / S2★**

**(B) v2 문서 작성 방식**:
- (a) 추천값 (R3+G2+E2+S2) 즉시 전면 작성
- (b) 판단 개별 지정 후 작성
- (c) 목차 스켈레톤만 먼저 작성, 내부 단계별 확정

**(C) 부가 질문 (선택)**:
- Phase 1 에서 POC-5~12 중 **block 할 항목** 있나?
- `schema_version` 필드를 `bundles:` 선언에 포함해 Phase 1.5 breaking change 대비?
- Claude `strictKnownMarketplaces` 를 concord 가 관리/무관 중 어느 쪽?

---

**Sources (웹서치·공식 docs)**:
- https://code.claude.com/docs/en/plugin-marketplaces
- https://code.claude.com/docs/en/plugins-reference
- https://code.claude.com/docs/en/plugin-dependencies
- https://code.claude.com/docs/en/plugins
- https://code.claude.com/docs/en/discover-plugins
- https://developers.openai.com/codex/plugins
- https://developers.openai.com/codex/plugins/build
- https://developers.openai.com/codex/changelog
- https://developers.openai.com/codex/hooks
- https://developers.openai.com/codex/config-reference
- https://opencode.ai/docs/plugins/
- https://opencode.ai/docs/config/
- https://opencode.ai/config.json
- https://bun.sh/docs/cli/add
- https://bun.sh/guides/install/npm-alias
- https://bun.sh/guides/install/add-git
- https://github.com/anthropics/claude-code/issues/9444 (Claude plugin dependencies)
- https://github.com/anthropics/claude-code/issues/19522 (non-interactive plugin install)
- https://github.com/anthropics/claude-code/issues/25150 (plugin skill autocomplete)
- https://github.com/anthropics/claude-code/issues/35805 (git-subdir)
- https://github.com/anthropics/claude-code/issues/43695 (namespace-qualified invocation)
- https://www.chezmoi.io/reference/special-files/chezmoiexternal-format/
- https://github.com/folke/lazy.nvim
- https://echasnovski.com/blog/2026-03-13-a-guide-to-vim-pack/
- https://discourse.nixos.org/t/home-manager-vscode-extension-settings-mutableextensionsdir-false/33878
- https://code.visualstudio.com/docs/editor/extension-marketplace
- https://code.visualstudio.com/docs/enterprise/extensions
- https://www.jetbrains.com/help/idea/managing-plugins.html
- https://www.jetbrains.com/help/ide-services/manage-available-plugins.html
- https://github.blog/changelog/2025-09-12-internal-mcp-registry-and-allowlist-controls-for-vs-code-insiders/
- https://mise.jdx.dev/dev-tools/comparison-to-asdf.html
- https://spacelift.io/learn/terraform-import-generate-configuration
- https://advisories.gitlab.com/pkg/npm/opencode-ai/CVE-2026-22812/
- https://advisories.gitlab.com/pkg/npm/opencode-ai/CVE-2026-22813/
- https://securitysandman.com/2026/03/11/your-ai-agent-is-the-attacker-claude-opencode-threats-and-security-designs/
- https://www.microsoft.com/en-us/security/blog/2026/04/01/mitigating-the-axios-npm-supply-chain-compromise/
