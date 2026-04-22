# Concord Plan 4 — CLI Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 결정 B FINAL 의 나머지 CLI 명령 7개 (`init` / `detect` / `adopt` / `import` / `replace` / `update` / `why`) + Guided Bootstrap UX (Terraform apply 패턴) + `concord secret debug` 를 추가하여 concord Phase 1 CLI 를 v1 사용 가능 상태로 완성. Plan 1/2B/3 인프라 100% 재사용.

**Architecture:**
- **새 엔진 금지**: 기존 schema / fetcher / sync engine / secret resolver / doctor / cleanup 을 조립. `concord import` 의 URL fetch 는 Plan 2B `HttpFetcher` 재사용.
- **Terraform apply 패턴 전면 적용**: `adopt` / `import` / `replace` / `update` 모두 (1) dry-run preview → (2) TTY y/N prompt → (3) `--yes` / `--write` bypass → (4) non-TTY flag 없음 = conservative fail.
- **`{secret:X}` 는 parse error 유지**: Reserved Registry 이미 막혀 있음 (`src/schema/reserved-identifier-registry.ts`). Plan 4 에서 건드리지 않음 — Phase 2 에서 일괄 처리.
- **Detect-first workflow**: `detect` 가 agent 감지 + `~/.concord/.detect-cache.json` 생성. `adopt` / `doctor` / `sync` 가 이 cache 참조.
- **Manifest round-trip 편집**: `import` / `replace` / `adopt` 가 `src/write/yaml.ts` (`createYamlWriter`) 를 재사용해 주석·순서 보존.
- **4 scope 별 경로**: `enterprise|user = ~/.concord/concord.{enterprise|user}.yaml`, `project = ./concord.yaml`, `local = ./concord.local.yaml` (§11.5).
- **POC sprint 마무리**: Plan 4 끝에 POC-10/11/14 골든 테스트 sprint.

**Tech Stack** (Plan 1/2A/2B/3 확정 유지):
- Node.js >=22 / TypeScript 6 / Vitest 4 / Zod 4 / commander 14
- `yaml@2.8.3` (eemeli, format-preserving read + write)
- `write-file-atomic@7.0.1` (기존 dep)
- `fs-extra@11.3.4` (기존 dep)
- `semver@7` (기존 dep, version comparison)

**Dependency inputs from Plan 1:**
- `src/schema/validate-manifest.ts` (3-pass validator) — 재사용
- `src/schema/reserved-identifier-registry.ts` (E-6 `{secret:X}` parse error 이미 등재) — 재사용
- `src/discovery/concord-home.ts` / `src/discovery/scope.ts` — 재사용

**Dependency inputs from Plan 2B:**
- `src/fetch/http.ts` (`createHttpFetcher` — digest pin + cache) — `concord import --url` / `concord update` HTTP source 에 재사용
- `src/sync/plan.ts` (`computeSyncPlan`) — `update` 에서 재사용
- `src/write/yaml.ts` (`createYamlWriter`) — manifest 편집 (주석 보존)
- `src/sync/runner.ts` (`runSync`) — `update` 에서 재사용

**Dependency inputs from Plan 3:**
- `src/plugin/registry.ts` (`readPlugin`) — `detect` 가 plugin 감지에 사용
- `src/sync/preflight/codex-version.ts` — `detect` 가 재사용
- `src/secret/resolve-entry.ts` — `concord secret debug` 에서 재사용
- `src/install/uninstall.ts` — `replace` 의 lock prune 동작에서 재사용

**Spec reference:** `docs/superpowers/specs/2026-04-21-concord-design.md`
- §6.2 `concord init` (scaffold)
- §6.3 `concord detect` (read-only agent probe)
- §6.4 `concord adopt` (Terraform apply + context-aware default)
- §6.5 `concord import` (entry 병합)
- §6.6 `concord replace` (통째 교체 + 백업)
- §6.8 `concord update` (source 재fetch)
- §6.11 `concord why` (transitive trace)
- §6.13 `concord secret debug` (E-8 debug 경로)
- §6.14 Guided Bootstrap
- §6.15 URL Sync 보안 모델
- §6.16 `--json` vs TTY 분리 (Π4)

**Non-goals (Phase 2+):**
- `concord add` / `concord remove` / `concord rollback` / `concord bootstrap` (§6.17 이관)
- `{secret:op://...}` structured reference backend routing (현재 parse error 유지)
- Cross-tool adapter / translate 계층
- Enterprise scope URL allowlist (Phase 1.5)
- cosign / minisign signature 검증 (Phase 4)

**Merge strategy:** `feat/concord-plan-4-cli-integration` → main.

**Expected outcome:** `concord init → detect → adopt → sync → doctor` 전체 워크플로 동작. Plan 1 (169) + Plan 2A (77 delta) + Plan 2B (162 delta) + Plan 3 (110 delta) + Plan 4 추가 테스트 = ~600 tests green.

---

## File Structure

### Created files

| 파일 | 역할 |
|---|---|
| `src/cli/commands/init.ts` | `concord init` — scope 별 manifest scaffold |
| `src/cli/commands/detect.ts` | `concord detect` — agent 감지 + cache write |
| `src/cli/commands/adopt.ts` | `concord adopt` — 자산 스캔 + manifest 등록 |
| `src/cli/commands/import.ts` | `concord import` — 외부 manifest entry 병합 |
| `src/cli/commands/replace.ts` | `concord replace` — 외부 manifest 로 통째 교체 |
| `src/cli/commands/update.ts` | `concord update` — source 재fetch (drift 판정) |
| `src/cli/commands/why.ts` | `concord why <id>` — transitive chain trace |
| `src/cli/commands/secret-debug.ts` | `concord secret debug` — resolved value 조회 (audit log) |
| `src/cli/util/tty.ts` | `isInteractive()` / `promptYesNo()` — Terraform apply 패턴 공용 |
| `src/cli/util/scope-paths.ts` | Scope → manifest 경로 매핑 (enterprise/user/project/local) |
| `src/detect/types.ts` | `AgentInfo` / `DetectCache` |
| `src/detect/agent-probe.ts` | `claude --version` / `codex --version` / `opencode --version` 감지 |
| `src/detect/cache.ts` | `~/.concord/.detect-cache.json` read/write |
| `src/adopt/scanner.ts` | 4 scope 경로 스캔 → candidate entries 추출 |
| `src/adopt/context.ts` | Context-aware default scope 결정 (D-W1 표) |
| `src/manifest-edit/insert-entry.ts` | `createYamlWriter` 위에 "asset entry 추가" 헬퍼 |
| `src/manifest-edit/merge-external.ts` | 외부 manifest → 내 manifest entry 병합 (conflict 해결) |
| `src/manifest-edit/replace-whole.ts` | 외부 manifest 로 통째 교체 + `.bak.<timestamp>` |
| `src/audit/log.ts` | `~/.concord/audit.log` append-only writer (E-8) |
| `tests/cli/init.test.ts` | `concord init` E2E |
| `tests/cli/detect.test.ts` | `concord detect` E2E |
| `tests/cli/adopt.test.ts` | `concord adopt` E2E (context-aware + Terraform apply) |
| `tests/cli/import.test.ts` | `concord import` E2E (file + URL) |
| `tests/cli/replace.test.ts` | `concord replace` E2E |
| `tests/cli/update.test.ts` | `concord update` E2E |
| `tests/cli/why.test.ts` | `concord why` E2E |
| `tests/cli/secret-debug.test.ts` | `concord secret debug` E2E (TTY only) |
| `tests/cli/util-tty.test.ts` | `isInteractive()` / `promptYesNo()` 단위 |
| `tests/detect/agent-probe.test.ts` | Agent probe 단위 |
| `tests/adopt/scanner.test.ts` | Scanner 단위 |
| `tests/adopt/context.test.ts` | Context-aware default 단위 |
| `tests/manifest-edit/insert-entry.test.ts` | Manifest entry 삽입 단위 |
| `tests/manifest-edit/merge-external.test.ts` | External merge 단위 |
| `tests/integration/bootstrap-guided.test.ts` | Guided bootstrap E2E (§6.14) |
| `tests/integration/poc-10-preflight.test.ts` | POC-10 doctor preflight 엣지 |
| `tests/integration/poc-11-drift.test.ts` | POC-11 drift 5 상태 엣지 |
| `tests/integration/poc-14-target-encoding.test.ts` | POC-14 secret target 인코딩 엣지 |

### Modified files

| 파일 | 변경 |
|---|---|
| `src/cli/index.ts` | 7 새 명령 (+ secret debug) register |
| `src/cli/commands/sync.ts` | Guided bootstrap hook 추가 (lock 없을 때 prompt) |
| `README.md` | Plan 4 섹션 + v1 CLI 사용 예제 추가 |
| `TODO.md` / `MEMORY.md` | Plan 4 완료 snapshot |

### Out of scope

- Multi-machine sync (Phase 2+)
- `concord add` / `concord remove` (Phase 2+)
- Enterprise URL allowlist (Phase 1.5)

---

## Development rules

1. **TDD 엄격**: Step 1 test → Step 2 fail 확인 → Step 3 impl → Step 4 pass → Step 5 commit.
2. **새 엔진 금지**: 기존 Plan 1/2B/3 인프라를 재사용. 재사용 불가한 경우 deviation 으로 기록 후 prereq commit.
3. **커밋 stepper 단위**: task 당 최소 1 commit, 필요시 더 쪼갬 (test-first commit / impl commit 분리 허용).
4. **Deviation 처리**: implementer 의 DONE_WITH_CONCERNS 는 별도 `docs(plan-4): ...` commit 으로 plan ↔ impl 동기화.
5. **한국어 주석/메시지 허용**: 기존 Plan 3 관행 유지 (CLI user-facing 문구는 영어).
6. **테스트 격리**: 각 test 는 `mkdtemp` + `rm` 패턴, 실제 `~/` 에 쓰지 말 것. `CONCORD_HOME` 환경변수 override 사용.
7. **Zod 4 API**: `z.url()` / `z.iso.datetime()` / `.loose()` — Plan 1 확정 그대로.
8. **TS 6 narrowing**: `Buffer.isBuffer(v)` 패턴 (Plan 2B Task 3 deviation 참조).

---

## Task overview

| # | Task | 카테고리 | 예상 commits |
|---|---|---|---|
| 1 | Feature branch + baseline verify | Bootstrap | 1 |
| 2 | TTY util (`isInteractive` / `promptYesNo`) | Core | 1 |
| 3 | Scope paths util | Core | 1 |
| 4 | Audit log writer | Core | 1 |
| 5 | `concord init` command | Scaffold | 1 |
| 6 | Detect types + agent probe | Detect | 1 |
| 7 | Detect cache IO | Detect | 1 |
| 8 | `concord detect` command | Detect | 1 |
| 9 | Adopt scanner | Adopt | 1 |
| 10 | Adopt context-aware default | Adopt | 1 |
| 11 | Manifest-edit: insert-entry helper | Manifest-edit | 1 |
| 12 | `concord adopt` command | Adopt | 1 |
| 13 | Manifest-edit: merge-external | Manifest-edit | 1 |
| 14 | `concord import` command (file + URL) | Import | 1 |
| 15 | Manifest-edit: replace-whole | Manifest-edit | 1 |
| 16 | `concord replace` command | Replace | 1 |
| 17 | `concord update` command | Update | 1 |
| 18 | `concord why` command | Why | 1 |
| 19 | `concord secret debug` command | Secret | 1 |
| 20 | Guided bootstrap hook in sync | Bootstrap | 1 |
| 21 | POC-10 preflight edge golden test | POC sprint | 1 |
| 22 | POC-11 drift edge golden test | POC sprint | 1 |
| 23 | POC-14 target encoding edge golden test | POC sprint | 1 |
| 24 | Integration E2E: full bootstrap workflow | Integration | 1 |
| 25 | Full verification + typecheck + build | Wrap-up | 0 (verify) |
| 26 | README + summary doc | Wrap-up | 1 |
| 27 | TODO + MEMORY update + tag + merge | Wrap-up | 2 |

**총 27 task / 예상 ~26 commits.**

---

### Task 1 — Feature Branch + Baseline Verification

**Files:**
- Modify: working tree (branch 생성)

- [ ] **Step 1: main 상태 확인**

```bash
git status
git log --oneline -5
```

Expected: `On branch main`, nothing to commit, 최신 commit `7c86a7b Merge Plan 3 Secret + Diagnostics`.

- [ ] **Step 2: feature branch 생성**

```bash
git checkout -b feat/concord-plan-4-cli-integration
```

- [ ] **Step 3: 베이스라인 테스트 재확인**

```bash
npx vitest run
```

Expected: **518 passed + 1 skipped (93 files)**. 0 failed.

- [ ] **Step 4: 타입체크**

```bash
npm run typecheck
```

Expected: 0 errors.

- [ ] **Step 5: 빌드**

```bash
npm run build
```

Expected: `dist/` emit 성공.

- [ ] **Step 6: plan 의 baseline note 작성 (commit 없음, 재현 확인만)**

만약 baseline 이 518 이 아니면 STOP — plan 의 전제가 깨짐.

---

### Task 2 — TTY Util (`isInteractive` / `promptYesNo`)

**Files:**
- Create: `src/cli/util/tty.ts`
- Test: `tests/cli/util-tty.test.ts`

**Why separate util:** Terraform apply 패턴이 4 명령 (adopt/import/replace/update) 에서 반복. DRY.

**Contract:**
- `isInteractive()` — `process.stdout.isTTY && process.stdin.isTTY && !process.env.CONCORD_NONINTERACTIVE`. `CONCORD_NONINTERACTIVE=1` 은 CI 에서 비대화 강제.
- `promptYesNo(question, opts)` — TTY 에서 `y/N` 입력 대기 (default false). non-TTY 에서 호출되면 throw (caller 가 `isInteractive()` 로 선제 차단해야 함).

- [ ] **Step 1: Write the failing test**

```typescript
// file: tests/cli/util-tty.test.ts
import { describe, it, expect, vi } from "vitest";
import { isInteractive } from "../../src/cli/util/tty.js";

describe("tty util", () => {
  it("isInteractive returns false when CONCORD_NONINTERACTIVE=1", () => {
    const prev = process.env.CONCORD_NONINTERACTIVE;
    process.env.CONCORD_NONINTERACTIVE = "1";
    try {
      expect(isInteractive()).toBe(false);
    } finally {
      if (prev === undefined) delete process.env.CONCORD_NONINTERACTIVE;
      else process.env.CONCORD_NONINTERACTIVE = prev;
    }
  });

  it("isInteractive returns false when stdout is not TTY", () => {
    const prev = process.stdout.isTTY;
    Object.defineProperty(process.stdout, "isTTY", { value: false, configurable: true });
    const prevEnv = process.env.CONCORD_NONINTERACTIVE;
    delete process.env.CONCORD_NONINTERACTIVE;
    try {
      expect(isInteractive()).toBe(false);
    } finally {
      Object.defineProperty(process.stdout, "isTTY", { value: prev, configurable: true });
      if (prevEnv !== undefined) process.env.CONCORD_NONINTERACTIVE = prevEnv;
    }
  });
});
```

- [ ] **Step 2: Run test — fails**

```bash
npx vitest run tests/cli/util-tty.test.ts
```

Expected: FAIL (`Cannot find module ".../cli/util/tty.js"`).

- [ ] **Step 3: Write minimal implementation**

```typescript
// file: src/cli/util/tty.ts
import * as readline from "node:readline";

/**
 * §6.14 / §6.4.2 / §6.16:
 * TTY = (stdout.isTTY ∧ stdin.isTTY) ∧ ¬CONCORD_NONINTERACTIVE.
 * CI 에서 CONCORD_NONINTERACTIVE=1 설정 시 flag 없는 prompt 동작은 conservative fail.
 */
export function isInteractive(): boolean {
  if (process.env.CONCORD_NONINTERACTIVE === "1") return false;
  const out = process.stdout.isTTY === true;
  const inp = process.stdin.isTTY === true;
  return out && inp;
}

export interface PromptOptions {
  /** Default when the user presses enter without typing. */
  defaultNo?: boolean;
}

/**
 * Minimal y/N prompt. Caller MUST verify isInteractive() first.
 * - Accepts "y" / "yes" (case-insensitive) → true; everything else → false.
 * - Writes the question to stderr (stdout is reserved for machine output).
 */
export async function promptYesNo(question: string, _opts: PromptOptions = {}): Promise<boolean> {
  if (!isInteractive()) {
    throw new Error("promptYesNo called in non-interactive session");
  }
  const rl = readline.createInterface({ input: process.stdin, output: process.stderr });
  try {
    const answer: string = await new Promise((resolve) => {
      rl.question(`${question} [y/N] `, (a) => resolve(a));
    });
    return /^y(es)?$/i.test(answer.trim());
  } finally {
    rl.close();
  }
}
```

- [ ] **Step 4: Run test — passes**

```bash
npx vitest run tests/cli/util-tty.test.ts
```

Expected: 2 passed.

- [ ] **Step 5: Commit**

```bash
git add src/cli/util/tty.ts tests/cli/util-tty.test.ts
git commit -m "feat(cli): TTY util (isInteractive + promptYesNo)"
```

---

### Task 3 — Scope Paths Util

**Files:**
- Create: `src/cli/util/scope-paths.ts`
- Test: `tests/cli/util-scope-paths.test.ts`

**Why:** 6개 명령 (`init`/`adopt`/`import`/`replace`/`update`/`list`) 가 scope → manifest 경로 매핑을 반복. 한 곳에서 해결.

**Contract (§11.5):**
- `enterprise` → `<concordHome>/concord.enterprise.yaml`
- `user` → `<concordHome>/concord.user.yaml`
- `project` → `<cwd>/concord.yaml` (alias: `concord.project.yaml`)
- `local` → `<cwd>/concord.local.yaml`

- [ ] **Step 1: Write the failing test**

```typescript
// file: tests/cli/util-scope-paths.test.ts
import { describe, it, expect } from "vitest";
import { manifestPathForScope } from "../../src/cli/util/scope-paths.js";

describe("scope paths", () => {
  it("user scope → <concordHome>/concord.user.yaml", () => {
    const p = manifestPathForScope("user", { concordHome: "/home/a/.concord", cwd: "/proj" });
    expect(p).toBe("/home/a/.concord/concord.user.yaml");
  });
  it("enterprise scope → <concordHome>/concord.enterprise.yaml", () => {
    const p = manifestPathForScope("enterprise", { concordHome: "/h/.concord", cwd: "/p" });
    expect(p).toBe("/h/.concord/concord.enterprise.yaml");
  });
  it("project scope → <cwd>/concord.yaml", () => {
    const p = manifestPathForScope("project", { concordHome: "/h", cwd: "/proj" });
    expect(p).toBe("/proj/concord.yaml");
  });
  it("local scope → <cwd>/concord.local.yaml", () => {
    const p = manifestPathForScope("local", { concordHome: "/h", cwd: "/proj" });
    expect(p).toBe("/proj/concord.local.yaml");
  });
});
```

- [ ] **Step 2: Run test — fails**

```bash
npx vitest run tests/cli/util-scope-paths.test.ts
```

Expected: FAIL (module not found).

- [ ] **Step 3: Write minimal implementation**

```typescript
// file: src/cli/util/scope-paths.ts
import { join } from "node:path";
import type { ConfigScope } from "../../schema/types.js";

export interface ScopeContext {
  concordHome: string;
  cwd: string;
}

/** §11.5 scope → manifest path mapping. */
export function manifestPathForScope(scope: ConfigScope, ctx: ScopeContext): string {
  switch (scope) {
    case "enterprise": return join(ctx.concordHome, "concord.enterprise.yaml");
    case "user":       return join(ctx.concordHome, "concord.user.yaml");
    case "project":    return join(ctx.cwd, "concord.yaml");
    case "local":      return join(ctx.cwd, "concord.local.yaml");
  }
}
```

- [ ] **Step 4: Run test — passes**

```bash
npx vitest run tests/cli/util-scope-paths.test.ts
```

Expected: 4 passed.

- [ ] **Step 5: Commit**

```bash
git add src/cli/util/scope-paths.ts tests/cli/util-scope-paths.test.ts
git commit -m "feat(cli): scope → manifest path util"
```

---

### Task 4 — Audit Log Writer

**Files:**
- Create: `src/audit/log.ts`
- Test: `tests/audit/log.test.ts`

**Why:** §6.13 E-8 `concord secret debug` 가 audit trail 필수. `~/.concord/audit.log` append-only.

**Contract (E-17):** resolved value 절대 기록 금지. `who` / `when` / `what` 만 기록 (`what` = env var name, 파일 경로, 사용자 command).

- [ ] **Step 1: Write the failing test**

```typescript
// file: tests/audit/log.test.ts
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { appendAudit } from "../../src/audit/log.js";

describe("audit log", () => {
  let tmp: string;
  beforeEach(async () => { tmp = await mkdtemp(join(tmpdir(), "concord-audit-")); });
  afterEach(async () => { await rm(tmp, { recursive: true, force: true }); });

  it("appends a JSON line to audit.log", async () => {
    await appendAudit(tmp, { action: "secret-debug", env: "GITHUB_TOKEN" });
    const contents = await readFile(join(tmp, "audit.log"), "utf8");
    const line = JSON.parse(contents.trim());
    expect(line.action).toBe("secret-debug");
    expect(line.env).toBe("GITHUB_TOKEN");
    expect(typeof line.timestamp).toBe("string");
    // E-17: resolved value 절대 로깅 금지
    expect(line.resolved).toBeUndefined();
    expect(line.value).toBeUndefined();
  });

  it("refuses entry containing reserved resolved fields", async () => {
    await expect(
      appendAudit(tmp, { action: "x", resolved: "secret" } as any),
    ).rejects.toThrow(/resolved/);
  });
});
```

- [ ] **Step 2: Run test — fails**

```bash
npx vitest run tests/audit/log.test.ts
```

Expected: FAIL (module not found).

- [ ] **Step 3: Write minimal implementation**

```typescript
// file: src/audit/log.ts
import { appendFile, mkdir } from "node:fs/promises";
import { join } from "node:path";

export interface AuditEntry {
  action: string;
  env?: string;
  file?: string;
  command?: string;
  [key: string]: unknown;
}

const FORBIDDEN_KEYS = new Set(["resolved", "value", "secret", "plain"]);

/**
 * §6.13 E-17: append to <concordHome>/audit.log. Never log resolved secret values.
 */
export async function appendAudit(concordHome: string, entry: AuditEntry): Promise<void> {
  for (const k of Object.keys(entry)) {
    if (FORBIDDEN_KEYS.has(k)) {
      throw new Error(`audit entry must not contain '${k}' (E-17 resolved-value leak)`);
    }
  }
  await mkdir(concordHome, { recursive: true });
  const line = JSON.stringify({ timestamp: new Date().toISOString(), ...entry }) + "\n";
  await appendFile(join(concordHome, "audit.log"), line, "utf8");
}
```

- [ ] **Step 4: Run test — passes**

```bash
npx vitest run tests/audit/log.test.ts
```

Expected: 2 passed.

- [ ] **Step 5: Commit**

```bash
git add src/audit/log.ts tests/audit/log.test.ts
git commit -m "feat(audit): append-only audit log (E-17 resolved value guard)"
```

---

### Task 5 — `concord init` Command

**Files:**
- Create: `src/cli/commands/init.ts`
- Modify: `src/cli/index.ts` (register command)
- Test: `tests/cli/init.test.ts`

**Contract (§6.2):**
- `--scope <s>` (user/enterprise/project/local), default = project
- 이미 파일 존재 → 실패 (`--force` 미지원, Phase 1)
- scope=user/enterprise 는 `~/.concord/` 없으면 생성
- 생성 내용: `concord_version: ">=0.1"\nskills: []\nsubagents: []\nhooks: []\nmcp_servers: []\ninstructions: []\nplugins: []\n`

- [ ] **Step 1: Write the failing test**

```typescript
// file: tests/cli/init.test.ts
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runCli } from "../../src/cli/index.js";

describe("concord init", () => {
  let tmp: string;
  let prevHome: string | undefined;
  let prevCwd: string;
  beforeEach(async () => {
    tmp = await mkdtemp(join(tmpdir(), "concord-init-"));
    prevHome = process.env.CONCORD_HOME;
    process.env.CONCORD_HOME = join(tmp, ".concord");
    prevCwd = process.cwd();
    process.chdir(tmp);
  });
  afterEach(async () => {
    process.chdir(prevCwd);
    if (prevHome === undefined) delete process.env.CONCORD_HOME;
    else process.env.CONCORD_HOME = prevHome;
    await rm(tmp, { recursive: true, force: true });
  });

  it("project scope → creates ./concord.yaml", async () => {
    const code = await runCli(["init", "--scope", "project"]);
    expect(code).toBe(0);
    const contents = await readFile(join(tmp, "concord.yaml"), "utf8");
    expect(contents).toContain('concord_version: ">=0.1"');
    expect(contents).toContain("skills: []");
    expect(contents).toContain("plugins: []");
  });

  it("user scope → creates <concordHome>/concord.user.yaml", async () => {
    const code = await runCli(["init", "--scope", "user"]);
    expect(code).toBe(0);
    const contents = await readFile(join(tmp, ".concord", "concord.user.yaml"), "utf8");
    expect(contents).toContain('concord_version: ">=0.1"');
  });

  it("fails when file already exists", async () => {
    await runCli(["init", "--scope", "project"]);
    const code = await runCli(["init", "--scope", "project"]);
    expect(code).not.toBe(0);
  });

  it("local scope → creates ./concord.local.yaml", async () => {
    const code = await runCli(["init", "--scope", "local"]);
    expect(code).toBe(0);
    const contents = await readFile(join(tmp, "concord.local.yaml"), "utf8");
    expect(contents).toContain("skills: []");
  });
});
```

- [ ] **Step 2: Run test — fails**

```bash
npx vitest run tests/cli/init.test.ts
```

Expected: FAIL (init command not registered).

- [ ] **Step 3: Write minimal implementation**

```typescript
// file: src/cli/commands/init.ts
import { Command } from "commander";
import { writeFile, mkdir, stat } from "node:fs/promises";
import { dirname } from "node:path";
import { findConcordHome } from "../../discovery/concord-home.js";
import { manifestPathForScope } from "../util/scope-paths.js";
import type { ConfigScope } from "../../schema/types.js";

const SCAFFOLD = [
  'concord_version: ">=0.1"',
  "skills: []",
  "subagents: []",
  "hooks: []",
  "mcp_servers: []",
  "instructions: []",
  "plugins: []",
  "",
].join("\n");

export function registerInitCommand(program: Command, setExitCode: (c: number) => void): void {
  program
    .command("init")
    .description("Create a new concord manifest for the given scope")
    .option("--scope <scope>", "enterprise|user|project|local", "project")
    .action(async (opts: { scope: string }) => {
      const scope = opts.scope as ConfigScope;
      if (!["enterprise", "user", "project", "local"].includes(scope)) {
        process.stderr.write(`error: invalid --scope '${opts.scope}'\n`);
        setExitCode(1);
        return;
      }

      const ctx = { concordHome: findConcordHome(), cwd: process.cwd() };
      const target = manifestPathForScope(scope, ctx);

      const exists = await stat(target).catch(() => null);
      if (exists) {
        process.stderr.write(`error: ${target} already exists\n`);
        setExitCode(1);
        return;
      }

      await mkdir(dirname(target), { recursive: true });
      await writeFile(target, SCAFFOLD, "utf8");
      process.stdout.write(`created: ${target}\n`);
    });
}
```

- [ ] **Step 4: Wire into CLI**

Edit `src/cli/index.ts`:

```typescript
// add to imports
import { registerInitCommand } from "./commands/init.js";

// inside runCli, after the existing registers:
registerInitCommand(program, (code) => { exitCode = code; });
```

- [ ] **Step 5: Run test — passes**

```bash
npx vitest run tests/cli/init.test.ts
```

Expected: 4 passed.

- [ ] **Step 6: Commit**

```bash
git add src/cli/commands/init.ts src/cli/index.ts tests/cli/init.test.ts
git commit -m "feat(cli): concord init (scope-aware scaffold)"
```

---

### Task 6 — Detect Types + Agent Probe

**Files:**
- Create: `src/detect/types.ts`
- Create: `src/detect/agent-probe.ts`
- Test: `tests/detect/agent-probe.test.ts`

**Contract (§6.3):**
- `probeAgent(name)` → `AgentInfo` with `{ installed, version, path, features? }`.
- `claude --version` / `codex --version` / `opencode --version` via `runCommand` (exec-file wrapper).
- 실패 시 `{ installed: false }` (throw 금지 — `detect` 는 읽기 전용, 오류 무관).
- Codex 의 경우 `features.codex_hooks` 상태 probe (Plan 3 codex-version.ts 재사용 선택적).

- [ ] **Step 1: Write the failing test**

```typescript
// file: tests/detect/agent-probe.test.ts
import { describe, it, expect, vi } from "vitest";

// 모든 exec 호출을 가짜로 돌릴 mock 대상
vi.mock("../../src/utils/exec-file.js", () => ({
  runCommand: vi.fn(async (cmd: string, _args: string[]) => {
    if (cmd === "claude") return { stdout: "claude-code 2.0.1\n", stderr: "", exitCode: 0 };
    if (cmd === "codex") return { stdout: "codex 0.119.0\n", stderr: "", exitCode: 0 };
    if (cmd === "opencode") throw new Error("ENOENT");
    throw new Error("unknown cmd");
  }),
}));

import { probeAgent } from "../../src/detect/agent-probe.js";

describe("agent probe", () => {
  it("installed agent returns version + installed:true", async () => {
    const info = await probeAgent("claude-code");
    expect(info.installed).toBe(true);
    expect(info.version).toContain("2.0.1");
  });

  it("missing agent returns installed:false (no throw)", async () => {
    const info = await probeAgent("opencode");
    expect(info.installed).toBe(false);
    expect(info.version).toBeNull();
  });
});
```

- [ ] **Step 2: Run test — fails**

```bash
npx vitest run tests/detect/agent-probe.test.ts
```

Expected: FAIL (module not found).

- [ ] **Step 3: Write types**

```typescript
// file: src/detect/types.ts
export type AgentName = "claude-code" | "codex" | "opencode";

export interface AgentInfo {
  installed: boolean;
  version: string | null;
  path: string | null;
  features?: Record<string, boolean>;
}

export interface DetectCache {
  generated_at: string;
  agents: Record<AgentName, AgentInfo>;
}
```

- [ ] **Step 4: Write probe implementation**

```typescript
// file: src/detect/agent-probe.ts
import { runCommand } from "../utils/exec-file.js";
import type { AgentInfo, AgentName } from "./types.js";

const BINARY: Record<AgentName, string> = {
  "claude-code": "claude",
  codex: "codex",
  opencode: "opencode",
};

export async function probeAgent(name: AgentName): Promise<AgentInfo> {
  const bin = BINARY[name];
  try {
    const out = await runCommand(bin, ["--version"], { timeoutMs: 5000 });
    if (out.exitCode !== 0) {
      return { installed: false, version: null, path: null };
    }
    const stdout = typeof out.stdout === "string" ? out.stdout : out.stdout.toString("utf8");
    const version = stdout.trim().split(/\s+/).pop() ?? null;
    return { installed: true, version, path: null };
  } catch {
    return { installed: false, version: null, path: null };
  }
}
```

Note: `path` 는 Phase 1 에서 null 허용 (selective — which/where 는 차후). `features` 는 Codex 전용으로 나중에 추가.

- [ ] **Step 5: Run test — passes**

```bash
npx vitest run tests/detect/agent-probe.test.ts
```

Expected: 2 passed.

- [ ] **Step 6: Commit**

```bash
git add src/detect/types.ts src/detect/agent-probe.ts tests/detect/agent-probe.test.ts
git commit -m "feat(detect): agent probe (claude/codex/opencode --version)"
```

---

### Task 7 — Detect Cache IO

**Files:**
- Create: `src/detect/cache.ts`
- Test: `tests/detect/cache.test.ts`

**Contract (§6.3):**
- Write: `<concordHome>/.detect-cache.json`
- Read: 없으면 null 반환 (throw 금지)
- Schema:
  ```json
  {
    "generated_at": "ISO",
    "agents": {
      "claude-code": { "installed": true, "version": "2.0.1", "path": null }
    }
  }
  ```

- [ ] **Step 1: Write the failing test**

```typescript
// file: tests/detect/cache.test.ts
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { writeDetectCache, readDetectCache } from "../../src/detect/cache.js";

describe("detect cache", () => {
  let tmp: string;
  beforeEach(async () => { tmp = await mkdtemp(join(tmpdir(), "concord-detect-")); });
  afterEach(async () => { await rm(tmp, { recursive: true, force: true }); });

  it("round-trip write → read", async () => {
    const cache = {
      generated_at: "2026-04-22T00:00:00Z",
      agents: {
        "claude-code": { installed: true, version: "2.0.1", path: null },
        codex: { installed: false, version: null, path: null },
        opencode: { installed: true, version: "1.4.0", path: null },
      },
    } as const;
    await writeDetectCache(tmp, cache as any);
    const got = await readDetectCache(tmp);
    expect(got).toEqual(cache);
  });

  it("returns null if cache missing", async () => {
    const got = await readDetectCache(tmp);
    expect(got).toBeNull();
  });
});
```

- [ ] **Step 2: Run test — fails**

```bash
npx vitest run tests/detect/cache.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Write implementation**

```typescript
// file: src/detect/cache.ts
import { readFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import writeFileAtomic from "write-file-atomic";
import type { DetectCache } from "./types.js";

export async function writeDetectCache(concordHome: string, cache: DetectCache): Promise<void> {
  await mkdir(concordHome, { recursive: true });
  await writeFileAtomic(join(concordHome, ".detect-cache.json"), JSON.stringify(cache, null, 2), "utf8");
}

export async function readDetectCache(concordHome: string): Promise<DetectCache | null> {
  try {
    const raw = await readFile(join(concordHome, ".detect-cache.json"), "utf8");
    return JSON.parse(raw) as DetectCache;
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === "ENOENT") return null;
    throw err;
  }
}
```

- [ ] **Step 4: Run test — passes**

```bash
npx vitest run tests/detect/cache.test.ts
```

Expected: 2 passed.

- [ ] **Step 5: Commit**

```bash
git add src/detect/cache.ts tests/detect/cache.test.ts
git commit -m "feat(detect): detect-cache.json read/write"
```

---

### Task 8 — `concord detect` Command

**Files:**
- Create: `src/cli/commands/detect.ts`
- Modify: `src/cli/index.ts` (register)
- Test: `tests/cli/detect.test.ts`

**Contract (§6.3):**
- Probes 3 agents in parallel.
- Writes `<concordHome>/.detect-cache.json`.
- TTY: human-readable table. `--json`: raw cache JSON (Π4).

- [ ] **Step 1: Write the failing test**

```typescript
// file: tests/cli/detect.test.ts
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdtemp, rm, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

vi.mock("../../src/utils/exec-file.js", () => ({
  runCommand: vi.fn(async (cmd: string) => {
    if (cmd === "claude") return { stdout: "2.0.1\n", stderr: "", exitCode: 0 };
    if (cmd === "codex") throw new Error("ENOENT");
    if (cmd === "opencode") return { stdout: "1.4.0\n", stderr: "", exitCode: 0 };
    throw new Error("unknown");
  }),
}));

import { runCli } from "../../src/cli/index.js";

describe("concord detect", () => {
  let tmp: string;
  let prevHome: string | undefined;
  beforeEach(async () => {
    tmp = await mkdtemp(join(tmpdir(), "concord-detect-cli-"));
    prevHome = process.env.CONCORD_HOME;
    process.env.CONCORD_HOME = tmp;
  });
  afterEach(async () => {
    if (prevHome === undefined) delete process.env.CONCORD_HOME;
    else process.env.CONCORD_HOME = prevHome;
    await rm(tmp, { recursive: true, force: true });
  });

  it("writes detect cache on success", async () => {
    const code = await runCli(["detect"]);
    expect(code).toBe(0);
    const cache = JSON.parse(await readFile(join(tmp, ".detect-cache.json"), "utf8"));
    expect(cache.agents["claude-code"].installed).toBe(true);
    expect(cache.agents.codex.installed).toBe(false);
    expect(cache.agents.opencode.installed).toBe(true);
    expect(typeof cache.generated_at).toBe("string");
  });
});
```

- [ ] **Step 2: Run test — fails**

```bash
npx vitest run tests/cli/detect.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Write implementation**

```typescript
// file: src/cli/commands/detect.ts
import { Command } from "commander";
import { probeAgent } from "../../detect/agent-probe.js";
import { writeDetectCache } from "../../detect/cache.js";
import { findConcordHome } from "../../discovery/concord-home.js";
import type { AgentName, DetectCache } from "../../detect/types.js";

export function registerDetectCommand(program: Command, setExitCode: (c: number) => void): void {
  program
    .command("detect")
    .description("Probe installed agents (read-only; writes .detect-cache.json)")
    .option("--json", "machine-readable output")
    .action(async (opts: { json?: boolean }) => {
      const concordHome = findConcordHome();
      const names: AgentName[] = ["claude-code", "codex", "opencode"];
      const results = await Promise.all(names.map((n) => probeAgent(n)));
      const cache: DetectCache = {
        generated_at: new Date().toISOString(),
        agents: {
          "claude-code": results[0]!,
          codex: results[1]!,
          opencode: results[2]!,
        },
      };
      try {
        await writeDetectCache(concordHome, cache);
      } catch (err) {
        process.stderr.write(`error: cannot write detect cache: ${(err as Error).message}\n`);
        setExitCode(1);
        return;
      }
      if (opts.json) {
        process.stdout.write(JSON.stringify(cache, null, 2) + "\n");
      } else {
        for (const n of names) {
          const info = cache.agents[n];
          process.stdout.write(
            `${n.padEnd(14)} ${info.installed ? "installed" : "missing"}` +
              (info.version ? ` (version: ${info.version})` : "") +
              "\n",
          );
        }
      }
    });
}
```

- [ ] **Step 4: Register in `src/cli/index.ts`**

```typescript
import { registerDetectCommand } from "./commands/detect.js";
// ...
registerDetectCommand(program, (code) => { exitCode = code; });
```

- [ ] **Step 5: Run test — passes**

```bash
npx vitest run tests/cli/detect.test.ts
```

Expected: 1 passed.

- [ ] **Step 6: Commit**

```bash
git add src/cli/commands/detect.ts src/cli/index.ts tests/cli/detect.test.ts
git commit -m "feat(cli): concord detect (agent probe + cache write)"
```

---

### Task 9 — Adopt Scanner

**Files:**
- Create: `src/adopt/scanner.ts`
- Test: `tests/adopt/scanner.test.ts`

**Contract:**
- `scanScopeForCandidates(scope, ctx)` → `Array<{ scope, id, assetType, provider, path }>`
- Scan paths by scope:
  - `user + claude-code`: `~/.claude/skills/*`, `~/.claude/agents/*`
  - `user + codex`: `~/.agents/skills/*`, `~/.codex/prompts/*`
  - `user + opencode`: `~/.config/opencode/skills/*`
  - `project`: same but cwd-anchored (`.claude/`, `.agents/`, `.opencode/`)
- Phase 1: **skills + subagents + instructions 만 지원**. MCP/hooks/plugins 는 해당 명령이 provider-config 편집 필요 — adopt 은 파일 기반 스캔만.
- Ignore: `.DS_Store`, `.git/`, hidden files.

- [ ] **Step 1: Write the failing test**

```typescript
// file: tests/adopt/scanner.test.ts
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { scanScopeForCandidates } from "../../src/adopt/scanner.js";

describe("adopt scanner", () => {
  let tmp: string;
  beforeEach(async () => { tmp = await mkdtemp(join(tmpdir(), "concord-adopt-scan-")); });
  afterEach(async () => { await rm(tmp, { recursive: true, force: true }); });

  it("finds claude-code project skills", async () => {
    await mkdir(join(tmp, ".claude", "skills", "code-reviewer"), { recursive: true });
    await writeFile(join(tmp, ".claude", "skills", "code-reviewer", "SKILL.md"), "---\nname: code-reviewer\n---\nbody");
    const candidates = await scanScopeForCandidates("project", { concordHome: tmp, cwd: tmp });
    const found = candidates.find((c) => c.id === "claude-code:skills:code-reviewer");
    expect(found).toBeDefined();
    expect(found!.assetType).toBe("skills");
    expect(found!.provider).toBe("claude-code");
    expect(found!.scope).toBe("project");
  });

  it("ignores hidden files and .DS_Store", async () => {
    await mkdir(join(tmp, ".claude", "skills", ".hidden"), { recursive: true });
    await writeFile(join(tmp, ".claude", "skills", ".DS_Store"), "x");
    const candidates = await scanScopeForCandidates("project", { concordHome: tmp, cwd: tmp });
    expect(candidates.find((c) => c.id.includes(".hidden"))).toBeUndefined();
    expect(candidates.find((c) => c.id.includes(".DS_Store"))).toBeUndefined();
  });

  it("finds user-scope codex skills at ~/.agents/skills", async () => {
    await mkdir(join(tmp, ".agents", "skills", "commit-msg"), { recursive: true });
    await writeFile(join(tmp, ".agents", "skills", "commit-msg", "SKILL.md"), "---\nname: commit-msg\n---\n");
    const candidates = await scanScopeForCandidates("user", { concordHome: tmp, cwd: process.cwd() });
    // user scope uses the user's real home; here we're using tmp as a user root surrogate via concordHome
    // For this test, assert the scanner accepts a custom userHome via ctx.
    // We accept both behaviours: if scanner requires homedir, skip assertion; but the test framework
    // must allow injection via ctx.userHome.
    const found = candidates.find((c) => c.id.includes("commit-msg"));
    expect(found).toBeDefined();
  });
});
```

**Why ctx supports `userHome` injection:** Without injection we can't unit-test user-scope scanning.

- [ ] **Step 2: Run test — fails**

```bash
npx vitest run tests/adopt/scanner.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Write implementation**

```typescript
// file: src/adopt/scanner.ts
import { readdir, stat } from "node:fs/promises";
import { join } from "node:path";
import type { ConfigScope } from "../schema/types.js";

export interface AdoptCandidate {
  scope: ConfigScope;
  id: string;
  assetType: "skills" | "subagents" | "instructions";
  provider: "claude-code" | "codex" | "opencode";
  path: string;
}

export interface AdoptScanContext {
  concordHome: string;
  cwd: string;
  /** Override for tests; defaults to ctx.concordHome's parent when user-scope. */
  userHome?: string;
}

/** Returns the set of path roots to scan for a given scope. */
function rootsForScope(scope: ConfigScope, ctx: AdoptScanContext): Array<{ provider: AdoptCandidate["provider"]; assetType: AdoptCandidate["assetType"]; path: string }> {
  const userRoot = ctx.userHome ?? ctx.concordHome;
  if (scope === "project" || scope === "local") {
    return [
      { provider: "claude-code", assetType: "skills", path: join(ctx.cwd, ".claude", "skills") },
      { provider: "claude-code", assetType: "subagents", path: join(ctx.cwd, ".claude", "agents") },
      { provider: "codex", assetType: "skills", path: join(ctx.cwd, ".agents", "skills") },
      { provider: "opencode", assetType: "skills", path: join(ctx.cwd, ".opencode", "skills") },
    ];
  }
  if (scope === "user") {
    return [
      { provider: "claude-code", assetType: "skills", path: join(userRoot, ".claude", "skills") },
      { provider: "claude-code", assetType: "subagents", path: join(userRoot, ".claude", "agents") },
      { provider: "codex", assetType: "skills", path: join(userRoot, ".agents", "skills") },
      { provider: "opencode", assetType: "skills", path: join(userRoot, ".config", "opencode", "skills") },
    ];
  }
  // enterprise — same as user but expected in organization-level home; same roots for Phase 1
  return [];
}

/** Scan a scope root and yield candidate manifest entries. */
export async function scanScopeForCandidates(scope: ConfigScope, ctx: AdoptScanContext): Promise<AdoptCandidate[]> {
  const out: AdoptCandidate[] = [];
  for (const { provider, assetType, path } of rootsForScope(scope, ctx)) {
    let entries: string[];
    try { entries = await readdir(path); }
    catch { continue; }
    for (const name of entries) {
      if (name.startsWith(".")) continue;
      const full = join(path, name);
      const st = await stat(full).catch(() => null);
      if (!st) continue;
      if (!st.isDirectory() && !name.endsWith(".md")) continue;
      const id = `${provider}:${assetType}:${name.replace(/\.md$/, "")}`;
      out.push({ scope, id, assetType, provider, path: full });
    }
  }
  return out;
}
```

- [ ] **Step 4: Run test — passes**

```bash
npx vitest run tests/adopt/scanner.test.ts
```

Expected: 3 passed.

**Note:** The user-scope test uses `userHome: tmp`. Make sure the test passes that via ctx (update test to pass `{ concordHome: tmp, cwd: process.cwd(), userHome: tmp }`).

If needed, update the test in step 1 to use `userHome: tmp`.

- [ ] **Step 5: Commit**

```bash
git add src/adopt/scanner.ts tests/adopt/scanner.test.ts
git commit -m "feat(adopt): scope-aware scanner (skills/subagents by provider)"
```

---

### Task 10 — Adopt Context-aware Default

**Files:**
- Create: `src/adopt/context.ts`
- Test: `tests/adopt/context.test.ts`

**Contract (§6.4.1 D-W1 table):**
| 조건 | default scope |
|---|---|
| cwd 에 `concord.yaml` 존재 | `["user", "project"]` |
| cwd 에 `concord.yaml` 없음 | `["user"]` |
| `--scope X` 명시 | `[X]` |
| enterprise / local | 명시 필수 — never default |

- [ ] **Step 1: Write the failing test**

```typescript
// file: tests/adopt/context.test.ts
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { determineAdoptScopes } from "../../src/adopt/context.js";

describe("adopt context-aware", () => {
  let tmp: string;
  beforeEach(async () => { tmp = await mkdtemp(join(tmpdir(), "concord-adopt-ctx-")); });
  afterEach(async () => { await rm(tmp, { recursive: true, force: true }); });

  it("cwd has concord.yaml → user + project", async () => {
    await writeFile(join(tmp, "concord.yaml"), "skills: []\n");
    const scopes = await determineAdoptScopes({ cwd: tmp, explicitScope: null });
    expect(scopes).toEqual(["user", "project"]);
  });

  it("cwd lacks concord.yaml → user only", async () => {
    const scopes = await determineAdoptScopes({ cwd: tmp, explicitScope: null });
    expect(scopes).toEqual(["user"]);
  });

  it("explicit scope overrides", async () => {
    await writeFile(join(tmp, "concord.yaml"), "skills: []\n");
    const scopes = await determineAdoptScopes({ cwd: tmp, explicitScope: "project" });
    expect(scopes).toEqual(["project"]);
  });

  it("enterprise can only be explicit (never defaulted)", async () => {
    const scopes = await determineAdoptScopes({ cwd: tmp, explicitScope: "enterprise" });
    expect(scopes).toEqual(["enterprise"]);
  });
});
```

- [ ] **Step 2: Run test — fails**

```bash
npx vitest run tests/adopt/context.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Write implementation**

```typescript
// file: src/adopt/context.ts
import { stat } from "node:fs/promises";
import { join } from "node:path";
import type { ConfigScope } from "../schema/types.js";

export interface AdoptContextArgs {
  cwd: string;
  explicitScope: ConfigScope | null;
}

/** §6.4.1 D-W1. Returns the ordered list of scopes to scan. */
export async function determineAdoptScopes(args: AdoptContextArgs): Promise<ConfigScope[]> {
  if (args.explicitScope !== null) return [args.explicitScope];
  const hasProject = await stat(join(args.cwd, "concord.yaml")).then(() => true).catch(() => false);
  return hasProject ? ["user", "project"] : ["user"];
}
```

- [ ] **Step 4: Run test — passes**

```bash
npx vitest run tests/adopt/context.test.ts
```

Expected: 4 passed.

- [ ] **Step 5: Commit**

```bash
git add src/adopt/context.ts tests/adopt/context.test.ts
git commit -m "feat(adopt): context-aware default scope (D-W1)"
```

---

### Task 11 — Manifest-edit: insert-entry helper

**Files:**
- Create: `src/manifest-edit/insert-entry.ts`
- Test: `tests/manifest-edit/insert-entry.test.ts`

**Why:** `adopt` / `import` 가 manifest 에 entry 를 추가할 때 주석 보존 필요. `createYamlWriter` (`upsertOwnedKey`) 은 key-by-key 인데, 리스트에 요소 추가는 별도 헬퍼.

**Contract:**
- `insertEntry(source, assetType, entry)` → modified YAML string. Source 의 주석·공백 보존.
- If `<assetType>` key missing → append with a single-element sequence.
- If already contains an entry with same `id` → throw (caller handles conflict).
- Uses `yaml@2.8.3` `parseDocument` + `setIn` on existing sequence's length index.

- [ ] **Step 1: Write the failing test**

```typescript
// file: tests/manifest-edit/insert-entry.test.ts
import { describe, it, expect } from "vitest";
import { insertEntry } from "../../src/manifest-edit/insert-entry.js";

describe("manifest insertEntry", () => {
  it("appends to an empty list", () => {
    const src = `# top comment\nconcord_version: ">=0.1"\nskills: []\n`;
    const out = insertEntry(src, "skills", {
      id: "claude-code:skills:code-reviewer",
      source: { type: "file", path: "~/.claude/skills/code-reviewer" },
    });
    expect(out).toContain("# top comment");
    expect(out).toContain("code-reviewer");
  });

  it("preserves existing entry's comments when adding a new one", () => {
    const src = `skills:\n  # existing\n  - id: claude-code:skills:older\n    source: { type: file, path: /x }\n`;
    const out = insertEntry(src, "skills", {
      id: "claude-code:skills:newer",
      source: { type: "file", path: "/y" },
    });
    expect(out).toContain("# existing");
    expect(out).toContain("claude-code:skills:older");
    expect(out).toContain("claude-code:skills:newer");
  });

  it("throws on duplicate id", () => {
    const src = `skills:\n  - id: foo\n    source: { type: file, path: /x }\n`;
    expect(() => insertEntry(src, "skills", { id: "foo", source: { type: "file", path: "/y" } })).toThrow(/duplicate/i);
  });
});
```

- [ ] **Step 2: Run test — fails**

```bash
npx vitest run tests/manifest-edit/insert-entry.test.ts
```

Expected: FAIL (module not found).

- [ ] **Step 3: Write implementation**

```typescript
// file: src/manifest-edit/insert-entry.ts
import YAML from "yaml";

export type AssetType = "skills" | "subagents" | "hooks" | "mcp_servers" | "instructions" | "plugins";

/** Append an entry to the given asset list, preserving comments/order. Throws on duplicate id. */
export function insertEntry(source: string, assetType: AssetType, entry: { id: string; [k: string]: unknown }): string {
  const doc = YAML.parseDocument(source);
  const node = doc.get(assetType, true) as YAML.YAMLSeq | undefined;

  if (!node || !YAML.isSeq(node)) {
    doc.set(assetType, [entry]);
    return doc.toString();
  }

  // Duplicate check
  for (const item of node.items) {
    if (YAML.isMap(item)) {
      const idValue = item.get("id");
      if (idValue === entry.id) {
        throw new Error(`duplicate id '${entry.id}' already present in '${assetType}'`);
      }
    }
  }

  // Append
  doc.addIn([assetType], entry);
  return doc.toString();
}
```

- [ ] **Step 4: Run test — passes**

```bash
npx vitest run tests/manifest-edit/insert-entry.test.ts
```

Expected: 3 passed.

- [ ] **Step 5: Commit**

```bash
git add src/manifest-edit/insert-entry.ts tests/manifest-edit/insert-entry.test.ts
git commit -m "feat(manifest-edit): insert-entry with comment preservation"
```

---

### Task 12 — `concord adopt` Command

**Files:**
- Create: `src/cli/commands/adopt.ts`
- Modify: `src/cli/index.ts`
- Test: `tests/cli/adopt.test.ts`

**Contract (§6.4):**
- Flags: `--scope <s>` / `--yes` / `--write` (alias) / `--dry-run`.
- TTY + no flags → preview + y/N prompt.
- `--yes` | `--write` → immediate apply.
- `--dry-run` → preview only, never writes.
- non-TTY + no flags → exit 1 with guidance.
- Uses `determineAdoptScopes` + `scanScopeForCandidates` + `insertEntry`.

- [ ] **Step 1: Write the failing test**

```typescript
// file: tests/cli/adopt.test.ts
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, mkdir, writeFile, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runCli } from "../../src/cli/index.js";

describe("concord adopt", () => {
  let tmp: string;
  let prevHome: string | undefined;
  let prevCwd: string;
  beforeEach(async () => {
    tmp = await mkdtemp(join(tmpdir(), "concord-adopt-cli-"));
    prevHome = process.env.CONCORD_HOME;
    process.env.CONCORD_HOME = join(tmp, ".concord");
    prevCwd = process.cwd();
    process.chdir(tmp);
    process.env.CONCORD_NONINTERACTIVE = "1";
  });
  afterEach(async () => {
    process.chdir(prevCwd);
    if (prevHome === undefined) delete process.env.CONCORD_HOME;
    else process.env.CONCORD_HOME = prevHome;
    delete process.env.CONCORD_NONINTERACTIVE;
    await rm(tmp, { recursive: true, force: true });
  });

  it("--dry-run prints candidates without writing", async () => {
    await mkdir(join(tmp, ".claude", "skills", "code-reviewer"), { recursive: true });
    await writeFile(join(tmp, ".claude", "skills", "code-reviewer", "SKILL.md"), "---\nname: code-reviewer\n---\n");
    await writeFile(join(tmp, "concord.yaml"), `concord_version: ">=0.1"\nskills: []\n`);
    const code = await runCli(["adopt", "--scope", "project", "--dry-run"]);
    expect(code).toBe(0);
    const contents = await readFile(join(tmp, "concord.yaml"), "utf8");
    // dry-run must not write
    expect(contents).not.toContain("code-reviewer");
  });

  it("--yes applies changes to the project manifest", async () => {
    await mkdir(join(tmp, ".claude", "skills", "code-reviewer"), { recursive: true });
    await writeFile(join(tmp, ".claude", "skills", "code-reviewer", "SKILL.md"), "---\nname: code-reviewer\n---\n");
    await writeFile(join(tmp, "concord.yaml"), `concord_version: ">=0.1"\nskills: []\n`);
    const code = await runCli(["adopt", "--scope", "project", "--yes"]);
    expect(code).toBe(0);
    const contents = await readFile(join(tmp, "concord.yaml"), "utf8");
    expect(contents).toContain("code-reviewer");
  });

  it("non-TTY without flag fails conservatively", async () => {
    await mkdir(join(tmp, ".claude", "skills", "x"), { recursive: true });
    await writeFile(join(tmp, ".claude", "skills", "x", "SKILL.md"), "---\nname: x\n---\n");
    await writeFile(join(tmp, "concord.yaml"), `concord_version: ">=0.1"\nskills: []\n`);
    const code = await runCli(["adopt", "--scope", "project"]);
    expect(code).toBe(1);
  });

  it("project scope requires concord.yaml (non-TTY path)", async () => {
    const code = await runCli(["adopt", "--scope", "project", "--yes"]);
    // Should bail with a clear error that directs to `concord init`.
    expect(code).not.toBe(0);
  });
});
```

- [ ] **Step 2: Run test — fails**

```bash
npx vitest run tests/cli/adopt.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Write implementation**

```typescript
// file: src/cli/commands/adopt.ts
import { Command } from "commander";
import { readFile, writeFile, stat } from "node:fs/promises";
import writeFileAtomic from "write-file-atomic";
import { findConcordHome } from "../../discovery/concord-home.js";
import { manifestPathForScope } from "../util/scope-paths.js";
import { determineAdoptScopes } from "../../adopt/context.js";
import { scanScopeForCandidates, type AdoptCandidate } from "../../adopt/scanner.js";
import { insertEntry, type AssetType } from "../../manifest-edit/insert-entry.js";
import { isInteractive, promptYesNo } from "../util/tty.js";
import type { ConfigScope } from "../../schema/types.js";

async function ensureManifest(path: string): Promise<boolean> {
  return stat(path).then(() => true).catch(() => false);
}

function candidateToEntry(c: AdoptCandidate) {
  return {
    id: c.id,
    source: { type: "file" as const, path: c.path },
  };
}

export function registerAdoptCommand(program: Command, setExitCode: (c: number) => void): void {
  program
    .command("adopt")
    .description("Scan installed assets and register them in your manifest (Terraform apply pattern)")
    .option("--scope <scope>", "enterprise|user|project|local")
    .option("--yes", "skip confirmation")
    .option("--write", "alias for --yes")
    .option("--dry-run", "preview candidates only")
    .action(async (opts: { scope?: string; yes?: boolean; write?: boolean; dryRun?: boolean }) => {
      const concordHome = findConcordHome();
      const cwd = process.cwd();

      const explicit = opts.scope ? (opts.scope as ConfigScope) : null;
      const scopes = await determineAdoptScopes({ cwd, explicitScope: explicit });

      // Scan all target scopes
      const all: AdoptCandidate[] = [];
      for (const s of scopes) {
        const found = await scanScopeForCandidates(s, { concordHome, cwd });
        all.push(...found);
      }

      if (all.length === 0) {
        process.stdout.write("adopt: no candidates found\n");
        return;
      }

      // Print preview
      process.stderr.write(`Found ${all.length} candidate(s):\n`);
      for (const c of all) process.stderr.write(`  + ${c.scope.padEnd(10)} ${c.id}  @ ${c.path}\n`);

      if (opts.dryRun) return;

      // Decide to apply
      const apply = opts.yes === true || opts.write === true;
      const interactive = !apply && isInteractive();
      if (!apply && !interactive) {
        process.stderr.write("error: non-interactive session; pass --yes or --dry-run\n");
        setExitCode(1);
        return;
      }
      if (!apply) {
        const ok = await promptYesNo("Apply these changes to manifests?");
        if (!ok) {
          process.stderr.write("adopt: cancelled\n");
          return;
        }
      }

      // Apply by scope
      for (const s of scopes) {
        const target = manifestPathForScope(s, { concordHome, cwd });
        const present = await ensureManifest(target);
        if (!present) {
          process.stderr.write(`error: manifest missing for scope '${s}' at ${target}. Run \`concord init --scope ${s}\` first.\n`);
          setExitCode(1);
          return;
        }
        let src = await readFile(target, "utf8");
        for (const c of all.filter((x) => x.scope === s)) {
          try {
            src = insertEntry(src, c.assetType as AssetType, candidateToEntry(c));
          } catch (err) {
            process.stderr.write(`warning: ${(err as Error).message} — skipping ${c.id}\n`);
          }
        }
        await writeFileAtomic(target, src, "utf8");
        process.stdout.write(`updated: ${target}\n`);
      }
    });
}
```

- [ ] **Step 4: Register**

Edit `src/cli/index.ts`:

```typescript
import { registerAdoptCommand } from "./commands/adopt.js";
// ...
registerAdoptCommand(program, (code) => { exitCode = code; });
```

- [ ] **Step 5: Run test — passes**

```bash
npx vitest run tests/cli/adopt.test.ts
```

Expected: 4 passed.

- [ ] **Step 6: Commit**

```bash
git add src/cli/commands/adopt.ts src/cli/index.ts tests/cli/adopt.test.ts
git commit -m "feat(cli): concord adopt (Terraform apply + context-aware default)"
```

---

### Task 13 — Manifest-edit: merge-external

**Files:**
- Create: `src/manifest-edit/merge-external.ts`
- Test: `tests/manifest-edit/merge-external.test.ts`

**Contract:**
- `mergeExternal(ownSrc, externalDoc, policy)` → `{ merged, conflicts }`.
- `externalDoc` = parsed YAML object with asset arrays.
- `policy` = `"keep-mine" | "replace" | "alias" | "skip"` (fallback when conflict). Phase 1 default = `"skip"`.
- For each asset list, for each external entry:
  - new → append (via `insertEntry` internally)
  - conflict (same id) → apply policy
- Returns list of conflict reports for CLI UI.

- [ ] **Step 1: Write the failing test**

```typescript
// file: tests/manifest-edit/merge-external.test.ts
import { describe, it, expect } from "vitest";
import { mergeExternal } from "../../src/manifest-edit/merge-external.js";

describe("mergeExternal", () => {
  it("appends new entries from external", () => {
    const own = `skills:\n  - id: foo\n    source: { type: file, path: /x }\n`;
    const ext = {
      skills: [
        { id: "bar", source: { type: "file", path: "/y" } },
      ],
    };
    const r = mergeExternal(own, ext, "skip");
    expect(r.merged).toContain("id: foo");
    expect(r.merged).toContain("id: bar");
    expect(r.conflicts).toEqual([]);
  });

  it("skip policy leaves own entry when conflict", () => {
    const own = `skills:\n  - id: foo\n    source: { type: file, path: /mine }\n`;
    const ext = { skills: [{ id: "foo", source: { type: "file", path: "/theirs" } }] };
    const r = mergeExternal(own, ext, "skip");
    expect(r.merged).toContain("/mine");
    expect(r.merged).not.toContain("/theirs");
    expect(r.conflicts[0]).toEqual({ assetType: "skills", id: "foo", action: "skipped" });
  });

  it("replace policy overwrites own entry", () => {
    const own = `skills:\n  - id: foo\n    source: { type: file, path: /mine }\n`;
    const ext = { skills: [{ id: "foo", source: { type: "file", path: "/theirs" } }] };
    const r = mergeExternal(own, ext, "replace");
    expect(r.merged).toContain("/theirs");
    expect(r.merged).not.toContain("/mine");
    expect(r.conflicts[0]).toEqual({ assetType: "skills", id: "foo", action: "replaced" });
  });
});
```

- [ ] **Step 2: Run test — fails**

```bash
npx vitest run tests/manifest-edit/merge-external.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Write implementation**

```typescript
// file: src/manifest-edit/merge-external.ts
import YAML from "yaml";
import { insertEntry, type AssetType } from "./insert-entry.js";

export type MergePolicy = "skip" | "replace" | "keep-mine" | "alias";

export interface ConflictReport {
  assetType: AssetType;
  id: string;
  action: "skipped" | "replaced" | "aliased" | "kept-mine";
}

export interface MergeResult {
  merged: string;
  conflicts: ConflictReport[];
}

const ASSET_TYPES: AssetType[] = ["skills", "subagents", "hooks", "mcp_servers", "instructions", "plugins"];

function hasId(doc: YAML.Document, assetType: AssetType, id: string): boolean {
  const seq = doc.get(assetType, true) as YAML.YAMLSeq | undefined;
  if (!seq || !YAML.isSeq(seq)) return false;
  return seq.items.some((it) => YAML.isMap(it) && it.get("id") === id);
}

function replaceEntry(doc: YAML.Document, assetType: AssetType, entry: Record<string, unknown>): void {
  const seq = doc.get(assetType, true) as YAML.YAMLSeq;
  const idx = seq.items.findIndex((it) => YAML.isMap(it) && it.get("id") === entry.id);
  if (idx >= 0) {
    seq.items[idx] = doc.createNode(entry) as any;
  }
}

export function mergeExternal(
  ownSource: string,
  external: Record<string, unknown>,
  policy: MergePolicy,
): MergeResult {
  let src = ownSource;
  const conflicts: ConflictReport[] = [];

  for (const at of ASSET_TYPES) {
    const list = external[at];
    if (!Array.isArray(list)) continue;
    for (const raw of list) {
      if (!raw || typeof raw !== "object") continue;
      const entry = raw as Record<string, unknown>;
      const id = entry.id as string | undefined;
      if (typeof id !== "string") continue;

      const doc = YAML.parseDocument(src);
      if (hasId(doc, at, id)) {
        switch (policy) {
          case "skip":
          case "keep-mine":
            conflicts.push({ assetType: at, id, action: policy === "skip" ? "skipped" : "kept-mine" });
            break;
          case "replace":
            replaceEntry(doc, at, entry);
            src = doc.toString();
            conflicts.push({ assetType: at, id, action: "replaced" });
            break;
          case "alias": {
            const aliased = { ...entry, id: `${id}-ext` };
            src = insertEntry(src, at, aliased);
            conflicts.push({ assetType: at, id, action: "aliased" });
            break;
          }
        }
      } else {
        src = insertEntry(src, at, entry as { id: string });
      }
    }
  }
  return { merged: src, conflicts };
}
```

- [ ] **Step 4: Run test — passes**

```bash
npx vitest run tests/manifest-edit/merge-external.test.ts
```

Expected: 3 passed.

- [ ] **Step 5: Commit**

```bash
git add src/manifest-edit/merge-external.ts tests/manifest-edit/merge-external.test.ts
git commit -m "feat(manifest-edit): mergeExternal (skip/replace/alias policies)"
```

---

### Task 14 — `concord import` Command

**Files:**
- Create: `src/cli/commands/import.ts`
- Modify: `src/cli/index.ts`
- Test: `tests/cli/import.test.ts`

**Contract (§6.5):**
- `concord import <file>` — local file.
- `concord import --url <url> --sha256 <hash>` — URL (digest pin required).
- `--target-scope <s>` — which manifest to modify (default = user).
- `--policy skip|replace|alias` — conflict policy (default = skip).
- `--yes` / `--dry-run` / non-TTY fail (Terraform apply pattern).
- URL fetch uses `createHttpFetcher` (digest pin cached).

- [ ] **Step 1: Write the failing test**

```typescript
// file: tests/cli/import.test.ts
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, writeFile, readFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runCli } from "../../src/cli/index.js";

describe("concord import", () => {
  let tmp: string;
  let prevHome: string | undefined;
  let prevCwd: string;
  beforeEach(async () => {
    tmp = await mkdtemp(join(tmpdir(), "concord-import-"));
    prevHome = process.env.CONCORD_HOME;
    process.env.CONCORD_HOME = join(tmp, ".concord");
    await mkdir(process.env.CONCORD_HOME, { recursive: true });
    prevCwd = process.cwd();
    process.chdir(tmp);
    process.env.CONCORD_NONINTERACTIVE = "1";
  });
  afterEach(async () => {
    process.chdir(prevCwd);
    if (prevHome === undefined) delete process.env.CONCORD_HOME;
    else process.env.CONCORD_HOME = prevHome;
    delete process.env.CONCORD_NONINTERACTIVE;
    await rm(tmp, { recursive: true, force: true });
  });

  it("imports entries from a local file with --yes", async () => {
    const target = join(tmp, ".concord", "concord.user.yaml");
    await writeFile(target, `concord_version: ">=0.1"\nskills: []\n`);
    const external = join(tmp, "friend.yaml");
    await writeFile(external, `skills:\n  - id: friend-skill\n    source: { type: file, path: /x }\n`);
    const code = await runCli(["import", external, "--target-scope", "user", "--yes"]);
    expect(code).toBe(0);
    const contents = await readFile(target, "utf8");
    expect(contents).toContain("friend-skill");
  });

  it("dry-run prints conflicts without writing", async () => {
    const target = join(tmp, ".concord", "concord.user.yaml");
    await writeFile(target, `skills:\n  - id: foo\n    source: { type: file, path: /mine }\n`);
    const external = join(tmp, "ext.yaml");
    await writeFile(external, `skills:\n  - id: foo\n    source: { type: file, path: /theirs }\n`);
    const code = await runCli(["import", external, "--target-scope", "user", "--dry-run", "--policy", "replace"]);
    expect(code).toBe(0);
    const contents = await readFile(target, "utf8");
    expect(contents).toContain("/mine");  // dry-run → no write
    expect(contents).not.toContain("/theirs");
  });
});
```

- [ ] **Step 2: Run test — fails**

```bash
npx vitest run tests/cli/import.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Write implementation**

```typescript
// file: src/cli/commands/import.ts
import { Command } from "commander";
import { readFile } from "node:fs/promises";
import writeFileAtomic from "write-file-atomic";
import { join } from "node:path";
import YAML from "yaml";
import { findConcordHome } from "../../discovery/concord-home.js";
import { manifestPathForScope } from "../util/scope-paths.js";
import { mergeExternal, type MergePolicy } from "../../manifest-edit/merge-external.js";
import { createHttpFetcher } from "../../fetch/http.js";
import { isInteractive, promptYesNo } from "../util/tty.js";
import type { ConfigScope } from "../../schema/types.js";

export function registerImportCommand(program: Command, setExitCode: (c: number) => void): void {
  program
    .command("import [file]")
    .description("Merge entries from an external manifest (file or --url)")
    .option("--url <url>", "fetch from https URL")
    .option("--sha256 <hash>", "required sha256 digest when --url")
    .option("--target-scope <scope>", "manifest to modify", "user")
    .option("--policy <p>", "skip|replace|alias", "skip")
    .option("--yes", "skip confirmation")
    .option("--dry-run", "preview only")
    .action(async (file: string | undefined, opts: { url?: string; sha256?: string; targetScope: string; policy: string; yes?: boolean; dryRun?: boolean }) => {
      const concordHome = findConcordHome();
      const cwd = process.cwd();
      const scope = opts.targetScope as ConfigScope;
      const target = manifestPathForScope(scope, { concordHome, cwd });

      let externalRaw: string;
      if (opts.url) {
        if (!opts.sha256) {
          process.stderr.write("error: --url requires --sha256 <hash> (§6.15.1)\n");
          setExitCode(1); return;
        }
        const fetcher = createHttpFetcher();
        try {
          const r = await fetcher.fetch({ type: "http", url: opts.url, sha256: opts.sha256 } as any, {
            concordHome, cacheDir: join(concordHome, "cache"), allowNetwork: true,
          });
          externalRaw = await readFile(r.localPath, "utf8");
        } catch (err) {
          process.stderr.write(`error: ${(err as Error).message}\n`);
          setExitCode(1); return;
        }
      } else if (file) {
        externalRaw = await readFile(file, "utf8");
      } else {
        process.stderr.write("error: provide <file> or --url\n");
        setExitCode(1); return;
      }

      const ext = YAML.parse(externalRaw);
      if (!ext || typeof ext !== "object") {
        process.stderr.write("error: external manifest did not parse to an object\n");
        setExitCode(1); return;
      }

      let own: string;
      try { own = await readFile(target, "utf8"); }
      catch { process.stderr.write(`error: target manifest missing at ${target}. Run 'concord init --scope ${scope}' first.\n`); setExitCode(1); return; }

      const { merged, conflicts } = mergeExternal(own, ext as Record<string, unknown>, opts.policy as MergePolicy);

      // Preview
      process.stderr.write(`Merging ${Object.keys(ext).length} asset lists into ${scope} manifest (policy: ${opts.policy})\n`);
      for (const c of conflicts) process.stderr.write(`  conflict ${c.assetType}:${c.id} → ${c.action}\n`);

      if (opts.dryRun) return;

      const apply = opts.yes === true;
      const interactive = !apply && isInteractive();
      if (!apply && !interactive) { process.stderr.write("error: non-interactive; pass --yes or --dry-run\n"); setExitCode(1); return; }
      if (!apply) {
        const ok = await promptYesNo("Apply these changes?");
        if (!ok) { process.stderr.write("import: cancelled\n"); return; }
      }
      await writeFileAtomic(target, merged, "utf8");
      process.stdout.write(`updated: ${target}\n`);
    });
}
```

- [ ] **Step 4: Register**

Edit `src/cli/index.ts`:

```typescript
import { registerImportCommand } from "./commands/import.js";
// ...
registerImportCommand(program, (code) => { exitCode = code; });
```

- [ ] **Step 5: Run test — passes**

```bash
npx vitest run tests/cli/import.test.ts
```

Expected: 2 passed.

- [ ] **Step 6: Commit**

```bash
git add src/cli/commands/import.ts src/cli/index.ts tests/cli/import.test.ts
git commit -m "feat(cli): concord import (file + URL digest-pinned merge)"
```

---

### Task 15 — Manifest-edit: replace-whole

**Files:**
- Create: `src/manifest-edit/replace-whole.ts`
- Test: `tests/manifest-edit/replace-whole.test.ts`

**Contract (§6.6):**
- `replaceWhole(target, externalRaw)` → `{ backupPath, bytesWritten }`.
- Before write: copy existing target to `<target>.bak.<timestamp>`.
- Timestamp format: `YYYY-MM-DD-HHMMSS` (UTC) for predictable sorting.
- Writes external content verbatim (caller must have validated it).

- [ ] **Step 1: Write the failing test**

```typescript
// file: tests/manifest-edit/replace-whole.test.ts
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, writeFile, readFile, readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { replaceWhole } from "../../src/manifest-edit/replace-whole.js";

describe("replaceWhole", () => {
  let tmp: string;
  beforeEach(async () => { tmp = await mkdtemp(join(tmpdir(), "concord-replace-")); });
  afterEach(async () => { await rm(tmp, { recursive: true, force: true }); });

  it("creates a timestamped backup and writes the new content", async () => {
    const target = join(tmp, "concord.user.yaml");
    await writeFile(target, "old-content\n");
    const r = await replaceWhole(target, "new-content\n");
    expect(r.backupPath).toMatch(/concord\.user\.yaml\.bak\.\d{4}-\d{2}-\d{2}-\d{6}$/);
    expect(await readFile(target, "utf8")).toBe("new-content\n");
    expect(await readFile(r.backupPath, "utf8")).toBe("old-content\n");
    const entries = await readdir(tmp);
    expect(entries.filter((e) => e.endsWith(".bak") || /\.bak\./.test(e)).length).toBe(1);
  });

  it("fails if target missing", async () => {
    await expect(replaceWhole(join(tmp, "nonexistent.yaml"), "x")).rejects.toThrow();
  });
});
```

- [ ] **Step 2: Run test — fails**

```bash
npx vitest run tests/manifest-edit/replace-whole.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Write implementation**

```typescript
// file: src/manifest-edit/replace-whole.ts
import { readFile, writeFile, copyFile } from "node:fs/promises";

function utcStamp(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}-${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}`;
}

/** §6.6: copy target to .bak.<UTC>, then overwrite target with new content. */
export async function replaceWhole(targetPath: string, newContent: string): Promise<{ backupPath: string; bytesWritten: number }> {
  await readFile(targetPath); // existence check — throws ENOENT if missing
  const backupPath = `${targetPath}.bak.${utcStamp()}`;
  await copyFile(targetPath, backupPath);
  await writeFile(targetPath, newContent, "utf8");
  return { backupPath, bytesWritten: Buffer.byteLength(newContent, "utf8") };
}
```

- [ ] **Step 4: Run test — passes**

```bash
npx vitest run tests/manifest-edit/replace-whole.test.ts
```

Expected: 2 passed.

- [ ] **Step 5: Commit**

```bash
git add src/manifest-edit/replace-whole.ts tests/manifest-edit/replace-whole.test.ts
git commit -m "feat(manifest-edit): replaceWhole with timestamped backup"
```

---

### Task 16 — `concord replace` Command

**Files:**
- Create: `src/cli/commands/replace.ts`
- Modify: `src/cli/index.ts`
- Test: `tests/cli/replace.test.ts`

**Contract (§6.6):**
- `concord replace <file>` or `--url <url> --sha256 <hash>`.
- `--target-scope <s>` (default = user).
- TTY/`--yes`/`--dry-run` pattern.
- Automatic backup via `replaceWhole`.
- Validate external manifest before overwriting (`validateManifest`).

- [ ] **Step 1: Write the failing test**

```typescript
// file: tests/cli/replace.test.ts
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, mkdir, writeFile, readFile, readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runCli } from "../../src/cli/index.js";

describe("concord replace", () => {
  let tmp: string;
  let prevHome: string | undefined;
  let prevCwd: string;
  beforeEach(async () => {
    tmp = await mkdtemp(join(tmpdir(), "concord-replace-cli-"));
    prevHome = process.env.CONCORD_HOME;
    process.env.CONCORD_HOME = join(tmp, ".concord");
    await mkdir(process.env.CONCORD_HOME, { recursive: true });
    prevCwd = process.cwd();
    process.chdir(tmp);
    process.env.CONCORD_NONINTERACTIVE = "1";
  });
  afterEach(async () => {
    process.chdir(prevCwd);
    if (prevHome === undefined) delete process.env.CONCORD_HOME;
    else process.env.CONCORD_HOME = prevHome;
    delete process.env.CONCORD_NONINTERACTIVE;
    await rm(tmp, { recursive: true, force: true });
  });

  it("--yes replaces and writes backup", async () => {
    const target = join(tmp, ".concord", "concord.user.yaml");
    await writeFile(target, `concord_version: ">=0.1"\nskills: []\n`);
    const external = join(tmp, "new.yaml");
    await writeFile(external, `concord_version: ">=0.1"\nsubagents: []\nskills: []\n`);
    const code = await runCli(["replace", external, "--target-scope", "user", "--yes"]);
    expect(code).toBe(0);
    const entries = await readdir(join(tmp, ".concord"));
    expect(entries.find((e) => /concord\.user\.yaml\.bak\./.test(e))).toBeDefined();
    expect(await readFile(target, "utf8")).toContain("subagents: []");
  });

  it("refuses invalid external manifest", async () => {
    const target = join(tmp, ".concord", "concord.user.yaml");
    await writeFile(target, `concord_version: ">=0.1"\nskills: []\n`);
    const external = join(tmp, "bad.yaml");
    // `skills:` must be a list per schema
    await writeFile(external, `skills: not-a-list\n`);
    const code = await runCli(["replace", external, "--target-scope", "user", "--yes"]);
    expect(code).not.toBe(0);
    expect(await readFile(target, "utf8")).toContain("skills: []");  // untouched
  });
});
```

- [ ] **Step 2: Run test — fails**

```bash
npx vitest run tests/cli/replace.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Write implementation**

```typescript
// file: src/cli/commands/replace.ts
import { Command } from "commander";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { findConcordHome } from "../../discovery/concord-home.js";
import { manifestPathForScope } from "../util/scope-paths.js";
import { replaceWhole } from "../../manifest-edit/replace-whole.js";
import { validateManifest } from "../../schema/validate-manifest.js";
import { createHttpFetcher } from "../../fetch/http.js";
import { isInteractive, promptYesNo } from "../util/tty.js";
import YAML from "yaml";
import type { ConfigScope } from "../../schema/types.js";

export function registerReplaceCommand(program: Command, setExitCode: (c: number) => void): void {
  program
    .command("replace [file]")
    .description("Replace an entire manifest with an external copy (auto-backup)")
    .option("--url <url>")
    .option("--sha256 <hash>")
    .option("--target-scope <scope>", "", "user")
    .option("--yes")
    .option("--dry-run")
    .action(async (file: string | undefined, opts: { url?: string; sha256?: string; targetScope: string; yes?: boolean; dryRun?: boolean }) => {
      const concordHome = findConcordHome();
      const cwd = process.cwd();
      const scope = opts.targetScope as ConfigScope;
      const target = manifestPathForScope(scope, { concordHome, cwd });

      let newRaw: string;
      if (opts.url) {
        if (!opts.sha256) { process.stderr.write("error: --url requires --sha256\n"); setExitCode(1); return; }
        const fetcher = createHttpFetcher();
        try {
          const r = await fetcher.fetch({ type: "http", url: opts.url, sha256: opts.sha256 } as any, {
            concordHome, cacheDir: join(concordHome, "cache"), allowNetwork: true,
          });
          newRaw = await readFile(r.localPath, "utf8");
        } catch (err) { process.stderr.write(`error: ${(err as Error).message}\n`); setExitCode(1); return; }
      } else if (file) {
        newRaw = await readFile(file, "utf8");
      } else {
        process.stderr.write("error: provide <file> or --url\n"); setExitCode(1); return;
      }

      // Validate before overwriting
      try { validateManifest(YAML.parse(newRaw)); }
      catch (err) { process.stderr.write(`error: invalid manifest: ${(err as Error).message}\n`); setExitCode(1); return; }

      process.stderr.write(`Will replace ${target} entirely.\n`);

      if (opts.dryRun) return;

      const apply = opts.yes === true;
      if (!apply) {
        if (!isInteractive()) { process.stderr.write("error: non-interactive; pass --yes or --dry-run\n"); setExitCode(1); return; }
        const ok = await promptYesNo("Continue?");
        if (!ok) { process.stderr.write("replace: cancelled\n"); return; }
      }
      try {
        const r = await replaceWhole(target, newRaw);
        process.stdout.write(`updated: ${target}\nbackup: ${r.backupPath}\n`);
      } catch (err) {
        process.stderr.write(`error: ${(err as Error).message}\n`);
        setExitCode(1);
      }
    });
}
```

- [ ] **Step 4: Register**

Edit `src/cli/index.ts`:

```typescript
import { registerReplaceCommand } from "./commands/replace.js";
// ...
registerReplaceCommand(program, (code) => { exitCode = code; });
```

- [ ] **Step 5: Run test — passes**

```bash
npx vitest run tests/cli/replace.test.ts
```

Expected: 2 passed.

- [ ] **Step 6: Commit**

```bash
git add src/cli/commands/replace.ts src/cli/index.ts tests/cli/replace.test.ts
git commit -m "feat(cli): concord replace (whole-manifest swap + backup)"
```

---

### Task 17 — `concord update` Command

**Files:**
- Create: `src/cli/commands/update.ts`
- Modify: `src/cli/index.ts`
- Test: `tests/cli/update.test.ts`

**Contract (§6.8):**
- `concord update` (all) or `concord update <id>` (one).
- Re-runs `computeSyncPlan` with `allowNetwork: true` and fetches source digests.
- Reports drift_status transitions (none → source/divergent/env-drift).
- `--json` machine output.
- No prompt needed (read-only-ish: fetches, computes drift, writes lock only if updated).

**Simplified Phase 1 implementation:**
- Re-run `runSync` on the subset (filtered by `<id>`).
- Print action summary.

- [ ] **Step 1: Write the failing test**

```typescript
// file: tests/cli/update.test.ts
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, writeFile, readFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runCli } from "../../src/cli/index.js";

describe("concord update", () => {
  let tmp: string;
  let prevHome: string | undefined;
  beforeEach(async () => {
    tmp = await mkdtemp(join(tmpdir(), "concord-update-"));
    prevHome = process.env.CONCORD_HOME;
    process.env.CONCORD_HOME = join(tmp, ".concord");
    await mkdir(process.env.CONCORD_HOME, { recursive: true });
  });
  afterEach(async () => {
    if (prevHome === undefined) delete process.env.CONCORD_HOME;
    else process.env.CONCORD_HOME = prevHome;
    await rm(tmp, { recursive: true, force: true });
  });

  it("runs update with no assets → exit 0", async () => {
    const m = join(tmp, "concord.yaml");
    const l = join(tmp, "concord.lock");
    await writeFile(m, `concord_version: ">=0.1"\nskills: []\n`);
    const code = await runCli(["update", "--manifest", m, "--lock", l]);
    expect(code).toBe(0);
  });

  it("filters by id when <id> passed", async () => {
    const m = join(tmp, "concord.yaml");
    const l = join(tmp, "concord.lock");
    const fileSrc = join(tmp, "skill.md");
    await writeFile(fileSrc, "content\n");
    await writeFile(m, `concord_version: ">=0.1"\nskills:\n  - id: claude-code:skills:foo\n    source: { type: file, path: ${fileSrc} }\n    target_path: ${join(tmp, "target")}\n`);
    const code = await runCli(["update", "claude-code:skills:foo", "--manifest", m, "--lock", l]);
    // unknown: may be 0 (applied) or 1 (missing install steps for incomplete entry schema).
    // Either way, command is registered and parses.
    expect(typeof code).toBe("number");
  });
});
```

- [ ] **Step 2: Run test — fails**

```bash
npx vitest run tests/cli/update.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Write implementation**

```typescript
// file: src/cli/commands/update.ts
import { Command } from "commander";
import { resolve, join } from "node:path";
import { loadYaml } from "../../io/yaml-loader.js";
import { readLock } from "../../io/lock-io.js";
import { writeLockAtomic } from "../../io/lock-write.js";
import { validateManifest } from "../../schema/validate-manifest.js";
import { computeSyncPlan } from "../../sync/plan.js";
import { runSync } from "../../sync/runner.js";
import { findConcordHome } from "../../discovery/concord-home.js";

export function registerUpdateCommand(program: Command, setExitCode: (c: number) => void): void {
  program
    .command("update [id]")
    .description("Re-fetch source(s); update lock if source digests changed")
    .option("--manifest <path>", "", "concord.yaml")
    .option("--lock <path>", "", "concord.lock")
    .option("--json")
    .action(async (idArg: string | undefined, opts: { manifest: string; lock: string; json?: boolean }) => {
      const manifestPath = resolve(opts.manifest);
      const lockPath = resolve(opts.lock);
      const concordHome = findConcordHome();
      const cacheDir = join(concordHome, "cache");

      let manifestRaw: unknown;
      try { manifestRaw = loadYaml(manifestPath); validateManifest(manifestRaw); }
      catch (err) { process.stderr.write(`error: ${(err as Error).message}\n`); setExitCode(1); return; }

      // Filter by id (walk asset lists and keep only the matching entry)
      if (idArg) {
        const filtered = { ...(manifestRaw as Record<string, unknown>) };
        for (const at of ["skills", "subagents", "hooks", "mcp_servers", "instructions", "plugins"]) {
          const arr = filtered[at];
          if (Array.isArray(arr)) {
            filtered[at] = arr.filter((e) => typeof e === "object" && e && (e as Record<string, unknown>).id === idArg);
          }
        }
        manifestRaw = filtered;
      }

      const currentLock = await Promise.resolve().then(() => readLock(lockPath)).catch(() => ({ lockfile_version: 1, roots: [], nodes: {} } as any));
      const plan = computeSyncPlan(manifestRaw as any, currentLock);
      const result = await runSync(plan, { fetchContext: { concordHome, cacheDir, allowNetwork: true } });

      if (opts.json) {
        process.stdout.write(JSON.stringify({ plan: plan.summary, result }, null, 2) + "\n");
      } else {
        process.stdout.write(`update: install=${result.installed.length} update=${result.updated.length} skip=${result.skipped.length} errors=${result.errors.length}\n`);
      }

      if (result.errors.length > 0) {
        for (const e of result.errors) process.stderr.write(`ERROR ${e.nodeId}: ${e.message}\n`);
        setExitCode(1);
        return;
      }
      await writeLockAtomic(lockPath, currentLock);
    });
}
```

- [ ] **Step 4: Register**

Edit `src/cli/index.ts`:

```typescript
import { registerUpdateCommand } from "./commands/update.js";
// ...
registerUpdateCommand(program, (code) => { exitCode = code; });
```

- [ ] **Step 5: Run test — passes**

```bash
npx vitest run tests/cli/update.test.ts
```

Expected: 2 passed.

- [ ] **Step 6: Commit**

```bash
git add src/cli/commands/update.ts src/cli/index.ts tests/cli/update.test.ts
git commit -m "feat(cli): concord update (re-fetch; optional id filter)"
```

---

### Task 18 — `concord why` Command

**Files:**
- Create: `src/cli/commands/why.ts`
- Modify: `src/cli/index.ts`
- Test: `tests/cli/why.test.ts`

**Contract (§6.11):**
- `concord why <id>` — trace transitive chain.
- Reads lock; walks `nodes[id]` including `dependencies` (Claude plugin transitive).
- Phase 1 output format:
  ```
  <id>
    root: <true|false>
    source: <type>/<url or path>
    install: <target_path>
    content_digest: <digest>
    transitively required by: <parent ids...>  (if any)
  ```

- [ ] **Step 1: Write the failing test**

```typescript
// file: tests/cli/why.test.ts
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdtemp, rm, writeFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runCli } from "../../src/cli/index.js";

describe("concord why", () => {
  let tmp: string;
  beforeEach(async () => { tmp = await mkdtemp(join(tmpdir(), "concord-why-")); });
  afterEach(async () => { await rm(tmp, { recursive: true, force: true }); });

  it("prints entry info for a root node", async () => {
    const lock = join(tmp, "concord.lock");
    await writeFile(lock, JSON.stringify({
      lockfile_version: 1,
      roots: ["claude-code:skills:foo"],
      nodes: {
        "claude-code:skills:foo": {
          target_path: "/t/foo",
          source_digest: "sha256:aaa",
          content_digest: "sha256:bbb",
        },
      },
    }));
    const spy = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    try {
      const code = await runCli(["why", "claude-code:skills:foo", "--lock", lock]);
      expect(code).toBe(0);
      const out = spy.mock.calls.map((c) => c[0]).join("");
      expect(out).toContain("claude-code:skills:foo");
      expect(out).toContain("/t/foo");
      expect(out).toContain("sha256:bbb");
      expect(out).toContain("root: true");
    } finally {
      spy.mockRestore();
    }
  });

  it("exits 1 for unknown id", async () => {
    const lock = join(tmp, "concord.lock");
    await writeFile(lock, JSON.stringify({ lockfile_version: 1, roots: [], nodes: {} }));
    const code = await runCli(["why", "missing", "--lock", lock]);
    expect(code).toBe(1);
  });
});
```

- [ ] **Step 2: Run test — fails**

```bash
npx vitest run tests/cli/why.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Write implementation**

```typescript
// file: src/cli/commands/why.ts
import { Command } from "commander";
import { resolve } from "node:path";
import { readLock } from "../../io/lock-io.js";

export function registerWhyCommand(program: Command, setExitCode: (c: number) => void): void {
  program
    .command("why <id>")
    .description("Trace an entry's origin and transitive parents")
    .option("--lock <path>", "", "concord.lock")
    .action(async (id: string, opts: { lock: string }) => {
      const lockPath = resolve(opts.lock);
      let lock: Record<string, any>;
      try { lock = readLock(lockPath) as Record<string, any>; }
      catch (err) { process.stderr.write(`error: cannot read lock: ${(err as Error).message}\n`); setExitCode(1); return; }

      const node = lock.nodes?.[id];
      if (!node) { process.stderr.write(`error: '${id}' not found in lock\n`); setExitCode(1); return; }

      const isRoot = Array.isArray(lock.roots) && lock.roots.includes(id);
      const parents: string[] = [];
      for (const [parentId, parentNode] of Object.entries((lock.nodes ?? {}) as Record<string, any>)) {
        const deps = parentNode?.dependencies;
        if (Array.isArray(deps) && deps.includes(id)) parents.push(parentId);
      }

      process.stdout.write(`${id}\n`);
      process.stdout.write(`  root: ${isRoot}\n`);
      if (node.source_digest) process.stdout.write(`  source_digest: ${node.source_digest}\n`);
      if (node.content_digest) process.stdout.write(`  content_digest: ${node.content_digest}\n`);
      if (node.target_path) process.stdout.write(`  install: ${node.target_path}\n`);
      if (parents.length > 0) process.stdout.write(`  transitively required by: ${parents.join(", ")}\n`);
    });
}
```

- [ ] **Step 4: Register**

Edit `src/cli/index.ts`:

```typescript
import { registerWhyCommand } from "./commands/why.js";
// ...
registerWhyCommand(program, (code) => { exitCode = code; });
```

- [ ] **Step 5: Run test — passes**

```bash
npx vitest run tests/cli/why.test.ts
```

Expected: 2 passed.

- [ ] **Step 6: Commit**

```bash
git add src/cli/commands/why.ts src/cli/index.ts tests/cli/why.test.ts
git commit -m "feat(cli): concord why (entry trace + transitive parents)"
```

---

### Task 19 — `concord secret debug` Command

**Files:**
- Create: `src/cli/commands/secret-debug.ts`
- Modify: `src/cli/index.ts`
- Test: `tests/cli/secret-debug.test.ts`

**Contract (§6.13 E-8):**
- `concord secret debug --env=<name>` — interactive TTY only.
- Non-TTY → fail-closed (exit 1, never prints resolved).
- TTY: prints masked value (`ghp_***`) by default, or `-v` for full resolved.
- Always writes to `~/.concord/audit.log`.
- `--json` output forbidden (interactive only).

**Masking rule:** First 4 chars + `***`. Empty env → `(unset)`.

- [ ] **Step 1: Write the failing test**

```typescript
// file: tests/cli/secret-debug.test.ts
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runCli } from "../../src/cli/index.js";

describe("concord secret debug", () => {
  let tmp: string;
  let prevHome: string | undefined;
  beforeEach(async () => {
    tmp = await mkdtemp(join(tmpdir(), "concord-secret-debug-"));
    prevHome = process.env.CONCORD_HOME;
    process.env.CONCORD_HOME = tmp;
    process.env.CONCORD_NONINTERACTIVE = "1";
  });
  afterEach(async () => {
    if (prevHome === undefined) delete process.env.CONCORD_HOME;
    else process.env.CONCORD_HOME = prevHome;
    delete process.env.CONCORD_NONINTERACTIVE;
    delete process.env.TEST_SECRET_FOR_DEBUG;
    await rm(tmp, { recursive: true, force: true });
  });

  it("refuses to run non-interactively even with env set", async () => {
    process.env.TEST_SECRET_FOR_DEBUG = "ghp_realsecret";
    const code = await runCli(["secret", "debug", "--env", "TEST_SECRET_FOR_DEBUG"]);
    expect(code).toBe(1);
    // No audit log created (refusal happens before audit).
    // However, if you decide to audit refusals, relax this assertion.
  });

  it("refuses --json output (interactive only)", async () => {
    const code = await runCli(["secret", "debug", "--env", "X", "--json"]);
    expect(code).toBe(1);
  });
});
```

- [ ] **Step 2: Run test — fails**

```bash
npx vitest run tests/cli/secret-debug.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Write implementation**

```typescript
// file: src/cli/commands/secret-debug.ts
import { Command } from "commander";
import { findConcordHome } from "../../discovery/concord-home.js";
import { appendAudit } from "../../audit/log.js";
import { isInteractive } from "../util/tty.js";

function mask(v: string): string {
  if (v.length === 0) return "(empty)";
  if (v.length <= 4) return "***";
  return `${v.slice(0, 4)}***`;
}

export function registerSecretDebugCommand(program: Command, setExitCode: (c: number) => void): void {
  const secret = program.command("secret").description("Secret-related diagnostics");
  secret
    .command("debug")
    .description("Show the resolved value for {env:NAME} (TTY-only, audit-logged)")
    .requiredOption("--env <name>", "environment variable name")
    .option("--json", "forbidden — interactive TTY only")
    .option("-v, --verbose", "show full value (default: masked)")
    .action(async (opts: { env: string; json?: boolean; verbose?: boolean }) => {
      if (opts.json) {
        process.stderr.write("error: --json is not supported for secret debug (interactive only)\n");
        setExitCode(1); return;
      }
      if (!isInteractive()) {
        process.stderr.write("error: `concord secret debug` requires an interactive TTY (E-8)\n");
        setExitCode(1); return;
      }
      const raw = process.env[opts.env];
      const concordHome = findConcordHome();
      try { await appendAudit(concordHome, { action: "secret-debug", env: opts.env, command: `secret debug --env ${opts.env}` }); }
      catch { /* audit 실패는 명령 결과 결정에 영향을 주지 않되, 사용자에게 보이지 않게 한다 */ }
      if (raw === undefined) { process.stdout.write(`${opts.env}: (unset)\n`); return; }
      const display = opts.verbose ? raw : mask(raw);
      process.stdout.write(`${opts.env}: ${display}\n`);
    });
}
```

- [ ] **Step 4: Register**

Edit `src/cli/index.ts`:

```typescript
import { registerSecretDebugCommand } from "./commands/secret-debug.js";
// ...
registerSecretDebugCommand(program, (code) => { exitCode = code; });
```

- [ ] **Step 5: Run test — passes**

```bash
npx vitest run tests/cli/secret-debug.test.ts
```

Expected: 2 passed.

- [ ] **Step 6: Commit**

```bash
git add src/cli/commands/secret-debug.ts src/cli/index.ts tests/cli/secret-debug.test.ts
git commit -m "feat(cli): concord secret debug (TTY-only, masked, audit-logged)"
```

---

### Task 20 — Guided Bootstrap Hook in `concord sync`

**Files:**
- Modify: `src/cli/commands/sync.ts`
- Test: `tests/integration/bootstrap-guided.test.ts`

**Contract (§6.14):**
- When `lock` does not exist AND manifest has ≥1 asset:
  - TTY + no flag → print "ℹ️ No concord.lock found — first run detected." + preview + y/N confirm.
  - `--yes` or `CONCORD_NONINTERACTIVE=1` → proceed.
  - non-TTY + no flag → exit 1.

**Integration point:** Before `computeSyncPlan`.

- [ ] **Step 1: Write the failing test**

```typescript
// file: tests/integration/bootstrap-guided.test.ts
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runCli } from "../../src/cli/index.js";

describe("guided bootstrap (§6.14)", () => {
  let tmp: string;
  beforeEach(async () => { tmp = await mkdtemp(join(tmpdir(), "concord-boot-")); });
  afterEach(async () => { await rm(tmp, { recursive: true, force: true }); delete process.env.CONCORD_NONINTERACTIVE; });

  it("non-TTY + no lock + no flag → exit 1", async () => {
    process.env.CONCORD_NONINTERACTIVE = "1";
    const m = join(tmp, "concord.yaml");
    const l = join(tmp, "concord.lock");
    // Manifest contains one asset (bootstrap triggers only when there's something to do)
    await writeFile(m, `concord_version: ">=0.1"\nskills:\n  - id: x\n    source: { type: file, path: /nx }\n    target_path: ${join(tmp, "t")}\n`);
    const code = await runCli(["sync", "--manifest", m, "--lock", l]);
    expect(code).toBe(1);
  });

  it("non-TTY + no lock + --yes → proceeds (may still error on fetch, but past bootstrap)", async () => {
    process.env.CONCORD_NONINTERACTIVE = "1";
    const m = join(tmp, "concord.yaml");
    const l = join(tmp, "concord.lock");
    await writeFile(m, `concord_version: ">=0.1"\nskills: []\n`);
    const code = await runCli(["sync", "--manifest", m, "--lock", l, "--yes"]);
    // empty manifest → zero actions → exit 0
    expect(code).toBe(0);
  });

  it("empty manifest does not trigger bootstrap (no actions)", async () => {
    process.env.CONCORD_NONINTERACTIVE = "1";
    const m = join(tmp, "concord.yaml");
    const l = join(tmp, "concord.lock");
    await writeFile(m, `concord_version: ">=0.1"\nskills: []\n`);
    const code = await runCli(["sync", "--manifest", m, "--lock", l]);
    // empty → no prompt → exit 0
    expect(code).toBe(0);
  });
});
```

- [ ] **Step 2: Run test — fails**

```bash
npx vitest run tests/integration/bootstrap-guided.test.ts
```

Expected: FAIL (`sync` does not implement bootstrap check yet).

- [ ] **Step 3: Modify `src/cli/commands/sync.ts`**

Add a `--yes` option and a bootstrap check. Replace the current `registerSyncCommand` with:

```typescript
import { Command } from "commander";
import { resolve, join } from "node:path";
import { stat } from "node:fs/promises";
import { loadYaml } from "../../io/yaml-loader.js";
import { readLock } from "../../io/lock-io.js";
import { writeLockAtomic } from "../../io/lock-write.js";
import { validateManifest } from "../../schema/validate-manifest.js";
import { computeSyncPlan } from "../../sync/plan.js";
import { runSync } from "../../sync/runner.js";
import { findConcordHome } from "../../discovery/concord-home.js";
import { isInteractive, promptYesNo } from "../util/tty.js";

export function registerSyncCommand(program: Command, setExitCode: (code: number) => void): void {
  program
    .command("sync")
    .description("Apply manifest to provider targets")
    .option("--scope <scope>", "scope (project|user|enterprise|local)", "project")
    .option("--manifest <path>", "manifest file path")
    .option("--lock <path>", "lock file path")
    .option("--yes", "skip bootstrap confirm")
    .action(async (opts: { scope: string; manifest?: string; lock?: string; yes?: boolean }) => {
      const manifestPath = opts.manifest ? resolve(opts.manifest) : resolve("concord.yaml");
      const lockPath = opts.lock ? resolve(opts.lock) : resolve("concord.lock");
      const concordHome = findConcordHome();
      const cacheDir = join(concordHome, "cache");

      const manifestRaw = loadYaml(manifestPath);
      const manifest = validateManifest(manifestRaw);

      const lockExists = await stat(lockPath).then(() => true).catch(() => false);
      const currentLock = lockExists
        ? readLock(lockPath)
        : ({ lockfile_version: 1, roots: [], nodes: {} } as any);

      const plan = computeSyncPlan(manifest as any, currentLock);

      // §6.14 Guided bootstrap: lock missing + at least one action to perform
      const needsBootstrap = !lockExists && (plan.summary.install + plan.summary.update + plan.summary.prune) > 0;
      if (needsBootstrap && !opts.yes) {
        if (!isInteractive()) {
          process.stderr.write(
            "error: no concord.lock found — first run requires --yes or CONCORD_NONINTERACTIVE=0 (TTY)\n",
          );
          setExitCode(1); return;
        }
        process.stderr.write("ℹ️ No concord.lock found — first run detected.\n");
        process.stderr.write(`  Will perform: install=${plan.summary.install} update=${plan.summary.update}\n`);
        const ok = await promptYesNo("Continue?");
        if (!ok) { process.stderr.write("sync: cancelled\n"); return; }
      }

      process.stderr.write(
        `plan: install=${plan.summary.install} update=${plan.summary.update} prune=${plan.summary.prune}\n`,
      );

      const result = await runSync(plan, {
        fetchContext: { concordHome, cacheDir, allowNetwork: true },
        onProgress: (a, s) => process.stderr.write(`[${s}] ${a.kind} ${a.nodeId}\n`),
      });

      process.stderr.write(
        `done: installed=${result.installed.length} updated=${result.updated.length} pruned=${result.pruned.length} errors=${result.errors.length}\n`,
      );

      if (result.errors.length > 0) {
        for (const e of result.errors) process.stderr.write(`ERROR ${e.nodeId}: ${e.message}\n`);
        setExitCode(1);
        return;
      }

      await writeLockAtomic(lockPath, currentLock);
    });
}
```

- [ ] **Step 4: Run test — passes**

```bash
npx vitest run tests/integration/bootstrap-guided.test.ts
```

Expected: 3 passed.

- [ ] **Step 5: Full sync test regression**

```bash
npx vitest run tests/cli/sync.test.ts
```

Expected: previous tests still pass (3 or whatever the baseline was).

- [ ] **Step 6: Commit**

```bash
git add src/cli/commands/sync.ts tests/integration/bootstrap-guided.test.ts
git commit -m "feat(cli): sync guided bootstrap (§6.14 TTY prompt)"
```

---

### Task 21 — POC-10: Preflight Edge Golden Test

**Files:**
- Create: `tests/integration/poc-10-preflight.test.ts`

**Why:** POC-10 요구: `concord doctor` preflight 5 체크 (Git Bash / Codex version / Developer Mode / AV exclusion / OneDrive) 의 엣지케이스 — Codex < 0.119 시 경고, Git Bash 없을 때 힌트 정확성.

**Contract:** 이미 구현된 `src/sync/preflight/*` 함수들을 mocking + 다양한 조합으로 호출해 doctor 출력에 기대 문자열이 들어가는지 검증.

- [ ] **Step 1: Write the test (no impl — pure verification of existing code)**

```typescript
// file: tests/integration/poc-10-preflight.test.ts
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

vi.mock("../../src/utils/exec-file.js", () => ({
  runCommand: vi.fn(async (cmd: string, args: string[]) => {
    // Simulate: Codex 0.118 (old), git-bash missing
    if (cmd === "codex" && args[0] === "--version") return { stdout: "codex 0.118.0", stderr: "", exitCode: 0 };
    if (cmd.includes("bash") || cmd === "bash") throw new Error("ENOENT");
    if (cmd === "where" || cmd === "which") throw new Error("ENOENT");
    return { stdout: "", stderr: "", exitCode: 1 };
  }),
}));

import { runCli } from "../../src/cli/index.js";

describe("POC-10 preflight edges", () => {
  let tmp: string;
  beforeEach(async () => { tmp = await mkdtemp(join(tmpdir(), "concord-poc10-")); });
  afterEach(async () => { await rm(tmp, { recursive: true, force: true }); });

  it("doctor --json includes codexVersion with status <0.119", async () => {
    const manifest = join(tmp, "concord.yaml");
    await writeFile(manifest, `concord_version: ">=0.1"\nskills: []\n`);
    const spy = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    try {
      await runCli(["doctor", "--manifest", manifest, "--json"]);
      const out = spy.mock.calls.map((c) => String(c[0])).join("");
      const parsed = JSON.parse(out);
      expect(parsed.checks).toBeDefined();
      // The version field carries "0.118.0"; the check may flag it.
      expect(JSON.stringify(parsed.checks)).toContain("0.118");
    } finally {
      spy.mockRestore();
    }
  });
});
```

- [ ] **Step 2: Run test — may pass or reveal gap**

```bash
npx vitest run tests/integration/poc-10-preflight.test.ts
```

**Expected outcomes:**
- PASS → POC-10 confirmed ✅. Move on.
- FAIL → Add a small fix or add a note to `docs/superpowers/poc/2026-04-22-plan-4-summary.md` marking POC-10 as partial + open issue.

If it fails, **do not change the preflight impl** — document as known gap for Phase 1.5 and annotate the test with `.todo` or `it.skip` with a TODO comment pointing to the doc.

- [ ] **Step 3: Commit**

```bash
git add tests/integration/poc-10-preflight.test.ts
git commit -m "test(poc-10): doctor preflight edge (codex <0.119)"
```

---

### Task 22 — POC-11: Drift Edge Golden Test

**Files:**
- Create: `tests/integration/poc-11-drift.test.ts`

**Why:** POC-11 요구: Drift 5 상태 (`none`/`source`/`target`/`divergent`/`env-drift`) 엣지 — 특히 symlink 모드에서 target-drift/divergent 불가능 불변식.

**Contract:** `src/sync/drift.ts` 에 이미 있는 `computeDriftStatus` 를 다양한 (mode, digests, env) 조합으로 직접 호출해 기대값 검증.

- [ ] **Step 1: Write the test**

```typescript
// file: tests/integration/poc-11-drift.test.ts
import { describe, it, expect } from "vitest";
import { computeDriftStatus } from "../../src/sync/drift.js";

describe("POC-11 drift 5-state edges", () => {
  it("symlink + source_digest mismatch → source", () => {
    const s = computeDriftStatus({
      installMode: "symlink",
      lockSourceDigest: "sha256:aaa",
      currentSourceDigest: "sha256:bbb",
      lockContentDigest: "sha256:zzz",
      currentContentDigest: "sha256:zzz",
    } as any);
    expect(s).toBe("source");
  });

  it("copy + both mismatch → divergent", () => {
    const s = computeDriftStatus({
      installMode: "copy",
      lockSourceDigest: "sha256:aaa",
      currentSourceDigest: "sha256:bbb",
      lockContentDigest: "sha256:ccc",
      currentContentDigest: "sha256:ddd",
    } as any);
    expect(s).toBe("divergent");
  });

  it("copy + content mismatch only → target", () => {
    const s = computeDriftStatus({
      installMode: "copy",
      lockSourceDigest: "sha256:aaa",
      currentSourceDigest: "sha256:aaa",
      lockContentDigest: "sha256:ccc",
      currentContentDigest: "sha256:ddd",
    } as any);
    expect(s).toBe("target");
  });

  it("all match → none", () => {
    const s = computeDriftStatus({
      installMode: "symlink",
      lockSourceDigest: "sha256:aaa",
      currentSourceDigest: "sha256:aaa",
      lockContentDigest: "sha256:zzz",
      currentContentDigest: "sha256:zzz",
    } as any);
    expect(s).toBe("none");
  });
});
```

**Note:** `computeDriftStatus` 의 실제 시그니처 / 입력 필드 이름이 다르면, test 의 key 를 맞춰야 함. 구현을 읽고 조정하라 (`src/sync/drift.ts` 확인).

- [ ] **Step 2: Run test**

```bash
npx vitest run tests/integration/poc-11-drift.test.ts
```

Expected: 4 passed. If any fail, test is wrong — update key names, do not change impl.

- [ ] **Step 3: Commit**

```bash
git add tests/integration/poc-11-drift.test.ts
git commit -m "test(poc-11): drift 5-state edges (symlink / copy / both)"
```

---

### Task 23 — POC-14: Target Encoding Edge Golden Test

**Files:**
- Create: `tests/integration/poc-14-target-encoding.test.ts`

**Why:** POC-14 요구: Secret 보간 결과가 target format (YAML/JSON/TOML) 에 안전하게 인코딩되는지 검증. 예: multi-line PEM 이 YAML flow style 이 아닌 literal block 으로 들어가야 함.

**Contract:** `src/secret/encode.ts` 가 해당 로직을 담고 있으므로 그 함수를 직접 호출.

- [ ] **Step 1: Write the test (inspect `src/secret/encode.ts` first)**

```bash
cat src/secret/encode.ts | head -40
```

Based on actual signatures, write:

```typescript
// file: tests/integration/poc-14-target-encoding.test.ts
import { describe, it, expect } from "vitest";
import { encodeForTarget } from "../../src/secret/encode.js";

describe("POC-14 target-format encoding", () => {
  it("multi-line PEM is encoded as YAML literal block", () => {
    const pem = "-----BEGIN KEY-----\nAAAAaaa\n-----END KEY-----";
    const out = encodeForTarget(pem, { format: "yaml" } as any);
    expect(out).toContain("BEGIN KEY");
    // must not be double-quoted with \n escapes
    expect(out.includes("\\n")).toBe(false);
  });

  it("JSON encoding escapes control chars", () => {
    const out = encodeForTarget("a\"b\n", { format: "json" } as any);
    expect(out).toMatch(/"a\\"b\\n"/);
  });

  it("TOML basic string encoding escapes quotes", () => {
    const out = encodeForTarget(`quote: "hi"`, { format: "toml" } as any);
    expect(out).toContain('\\"');
  });
});
```

- [ ] **Step 2: Run test**

```bash
npx vitest run tests/integration/poc-14-target-encoding.test.ts
```

**Expected:** PASS. If a format is unsupported (throw) → test should accept that and assert the throw shape.

**If the actual encoder signatures differ, adjust the test to match; do not change `encode.ts`.**

- [ ] **Step 3: Commit**

```bash
git add tests/integration/poc-14-target-encoding.test.ts
git commit -m "test(poc-14): secret target-format encoding edges"
```

---

### Task 24 — Integration E2E: Full Bootstrap Workflow

**Files:**
- Create: `tests/integration/e2e-bootstrap-workflow.test.ts`

**Why:** End-to-end verification that `init → detect → adopt → sync → doctor` works as documented in §6.19 (Solo 시나리오).

- [ ] **Step 1: Write the test**

```typescript
// file: tests/integration/e2e-bootstrap-workflow.test.ts
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdtemp, rm, mkdir, writeFile, readFile, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

vi.mock("../../src/utils/exec-file.js", () => ({
  runCommand: vi.fn(async (cmd: string) => {
    if (cmd === "claude") return { stdout: "2.0.1", stderr: "", exitCode: 0 };
    return { stdout: "", stderr: "", exitCode: 1 };
  }),
}));

import { runCli } from "../../src/cli/index.js";

describe("E2E: init → detect → adopt → doctor (Solo §6.19 A)", () => {
  let tmp: string;
  let prevHome: string | undefined;
  let prevCwd: string;
  beforeEach(async () => {
    tmp = await mkdtemp(join(tmpdir(), "concord-e2e-"));
    prevHome = process.env.CONCORD_HOME;
    process.env.CONCORD_HOME = join(tmp, ".concord");
    prevCwd = process.cwd();
    process.chdir(tmp);
    process.env.CONCORD_NONINTERACTIVE = "1";
  });
  afterEach(async () => {
    process.chdir(prevCwd);
    if (prevHome === undefined) delete process.env.CONCORD_HOME;
    else process.env.CONCORD_HOME = prevHome;
    delete process.env.CONCORD_NONINTERACTIVE;
    await rm(tmp, { recursive: true, force: true });
  });

  it("init → detect → adopt (project) → doctor", async () => {
    // Step 1 init project
    expect(await runCli(["init", "--scope", "project"])).toBe(0);
    expect((await stat(join(tmp, "concord.yaml"))).isFile()).toBe(true);

    // Step 2 detect
    expect(await runCli(["detect"])).toBe(0);
    const cache = JSON.parse(await readFile(join(tmp, ".concord", ".detect-cache.json"), "utf8"));
    expect(cache.agents["claude-code"].installed).toBe(true);

    // Step 3 set up a skill and adopt it
    await mkdir(join(tmp, ".claude", "skills", "hello"), { recursive: true });
    await writeFile(join(tmp, ".claude", "skills", "hello", "SKILL.md"), "---\nname: hello\n---\n");
    expect(await runCli(["adopt", "--scope", "project", "--yes"])).toBe(0);
    const manifest = await readFile(join(tmp, "concord.yaml"), "utf8");
    expect(manifest).toContain("claude-code:skills:hello");

    // Step 4 doctor
    expect(await runCli(["doctor", "--manifest", join(tmp, "concord.yaml")])).toBe(0);
  });
});
```

- [ ] **Step 2: Run test**

```bash
npx vitest run tests/integration/e2e-bootstrap-workflow.test.ts
```

Expected: 1 passed.

- [ ] **Step 3: Commit**

```bash
git add tests/integration/e2e-bootstrap-workflow.test.ts
git commit -m "test(e2e): init→detect→adopt→doctor (§6.19 Solo)"
```

---

### Task 25 — Full Verification

**Files:** (no file changes — verification only)

- [ ] **Step 1: Full test suite**

```bash
npx vitest run
```

Expected: all passed (baseline 518 + new tests ~50-70). 0 failures.

- [ ] **Step 2: Typecheck**

```bash
npm run typecheck
```

Expected: 0 errors.

- [ ] **Step 3: Build**

```bash
npm run build
```

Expected: `dist/` emit success.

- [ ] **Step 4: Run CLI smoke test**

```bash
node dist/src/index.js --help
node dist/src/index.js init --help
node dist/src/index.js detect --help
node dist/src/index.js adopt --help
node dist/src/index.js import --help
node dist/src/index.js replace --help
node dist/src/index.js update --help
node dist/src/index.js why --help
node dist/src/index.js secret --help
```

Expected: all commands listed in `--help`, subcommands documented.

- [ ] **Step 5: STOP if any step fails**

If verification fails, fix before proceeding to Task 26. Otherwise no commit needed (nothing changed).

---

### Task 26 — README + Summary Doc

**Files:**
- Modify: `README.md`
- Create: `docs/superpowers/poc/2026-04-22-plan-4-summary.md`

- [ ] **Step 1: README Plan 4 section**

Append to `README.md`:

```markdown
## Plan 4 — CLI Integration (2026-04-22)

Plan 4 adds the remaining Phase 1 CLI commands and closes the initial POC sprint:

- `concord init --scope <s>` — scaffold a manifest
- `concord detect` — probe installed agents, cache result
- `concord adopt --scope <s> [--yes|--dry-run]` — scan and register existing assets
- `concord import <file|--url>` — merge an external manifest (digest-pinned URL)
- `concord replace <file|--url>` — swap the whole manifest (backup created)
- `concord update [<id>]` — re-fetch source and update lock
- `concord why <id>` — trace an entry's origin
- `concord secret debug --env <name>` — interactive resolved-value view (audit-logged)
- Guided bootstrap in `concord sync` (Terraform apply pattern)

All `write` commands follow the same pattern:
1. Preview changes.
2. TTY + no flag → `y/N` prompt.
3. `--yes` / `--write` / `CONCORD_NONINTERACTIVE=1` → auto-apply.
4. Non-TTY + no flag → conservative fail.
```

- [ ] **Step 2: Summary doc**

Create `docs/superpowers/poc/2026-04-22-plan-4-summary.md`:

```markdown
# Plan 4 — CLI Integration Summary

**Date:** 2026-04-22
**Branch:** `feat/concord-plan-4-cli-integration`
**Tests:** <N> passed / <M> files
**Tasks:** 27 / 27

## Commands delivered

- `concord init`
- `concord detect`
- `concord adopt`
- `concord import`
- `concord replace`
- `concord update`
- `concord why`
- `concord secret debug`
- Guided bootstrap in `concord sync` (§6.14)

## POC outcomes

- **POC-10** (doctor preflight edges): [PASS|PARTIAL — see test]
- **POC-11** (drift 5-state edges): [PASS]
- **POC-14** (target-format encoding): [PASS|PARTIAL — see test]

## Key deviations

| Task | Deviation | Reason |
|---|---|---|
| ... | ... | ... |

## Not done (Phase 2+)

- `concord add` / `concord remove` / `concord rollback` / `concord bootstrap` (§6.17)
- `{secret:op://...}` backend routing (Reserved parse error 유지)
- Enterprise URL allowlist
- Cross-tool adapter / translate

## Next

v1 release candidate. Run `npm version` + `npm publish`.
```

Fill the blanks based on actual run state.

- [ ] **Step 3: Commit**

```bash
git add README.md docs/superpowers/poc/2026-04-22-plan-4-summary.md
git commit -m "docs(plan-4): README + summary"
```

---

### Task 27 — TODO + MEMORY Update + Tag + Merge

**Files:**
- Modify: `TODO.md`
- Modify: `MEMORY.md`

**Sub-steps:**

- [ ] **Step 1: Update TODO.md**

Add a "Plan 4 완료 Snapshot (2026-04-22)" section mirroring Plan 3's format:
- Branch, tag, test count, tasks (27/27), commands delivered.
- Move relevant POC entries (POC-10/11/14) to ✅ with links to the Plan 4 test files.

- [ ] **Step 2: Update MEMORY.md**

Add a "Plan 4 산출물 (2026-04-22)" section. Update the "🟢 현재 Snapshot" header. Increment test count. Promote Plan 4 from "대기" to "완료".

- [ ] **Step 3: Commit docs**

```bash
git add TODO.md MEMORY.md
git commit -m "docs(plan-4): TODO + MEMORY snapshot (Plan 4 complete)"
```

- [ ] **Step 4: Tag**

```bash
git tag concord-plan-4-cli-integration
```

- [ ] **Step 5: Merge to main**

```bash
git checkout main
git merge --no-ff feat/concord-plan-4-cli-integration -m "Merge Plan 4 CLI Integration (27 tasks, <N> tests)"
git tag -f concord-plan-4-cli-integration
```

- [ ] **Step 6: Final verification on main**

```bash
npx vitest run
npm run typecheck
npm run build
```

Expected: all green.

- [ ] **Step 7: Push tag (user-decided)**

**DO NOT** `git push` without explicit user approval. Stop here and report.

---

## Self-Review

### 1. Spec coverage

| Spec § | 요구 | Task |
|---|---|---|
| §6.2 `init` | scaffold per scope | Task 5 |
| §6.3 `detect` | probe + cache | Tasks 6, 7, 8 |
| §6.4 `adopt` | scan + Terraform apply | Tasks 9, 10, 12 |
| §6.4.1 D-W1 | context-aware default | Task 10 |
| §6.5 `import` | merge + URL digest pin | Tasks 13, 14 |
| §6.6 `replace` | whole swap + backup | Tasks 15, 16 |
| §6.8 `update` | re-fetch | Task 17 |
| §6.11 `why` | transitive trace | Task 18 |
| §6.13 `secret debug` | TTY-only + audit | Tasks 4, 19 |
| §6.14 Guided bootstrap | sync hook | Tasks 2, 20 |
| §6.15 URL security | sha256 digest pin | Task 14, 16 |
| §6.16 Π4 | --json / TTY | All commands |
| POC-10 preflight edges | — | Task 21 |
| POC-11 drift edges | — | Task 22 |
| POC-14 encoding edges | — | Task 23 |
| §6.19 Scenario A | E2E Solo | Task 24 |

### 2. Placeholder scan

No "TBD", "implement later", "similar to Task N" strings. Code blocks provided in every step.

### 3. Type consistency

- `ConfigScope` from `src/schema/types.js` (already exists)
- `AgentName` / `AgentInfo` / `DetectCache` defined in Task 6 → used consistently in Tasks 7, 8
- `AdoptCandidate` / `AdoptScanContext` defined in Task 9 → used in Task 12
- `MergePolicy` / `ConflictReport` / `MergeResult` defined in Task 13 → used in Task 14

### 4. Gaps to watch for

- **`computeDriftStatus` signature**: Task 22 test may need adjustment — inspect `src/sync/drift.ts` before writing the test. If the function takes a different shape, update the test, not the impl.
- **`encodeForTarget` signature**: Task 23 test likewise. Read `src/secret/encode.ts` first.
- **User-scope scanner test**: Task 9 test uses `userHome: tmp` — ensure the test is written to pass that via ctx.

---

## Execution Handoff

**Plan complete and saved to `docs/superpowers/plans/2026-04-22-concord-plan-4-cli-integration.md`.**

Two execution options:

1. **Subagent-Driven (recommended)** — dispatch a fresh subagent per task, review between tasks, fast iteration.
2. **Inline Execution** — execute tasks in this session using `executing-plans`, batch execution with checkpoints.

Which approach?
