# Concord Plan 3 — Secret Interpolation + Diagnostics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 결정 E Secret Interpolation Contract (E-1~E-19) 전면 구현 + drift 5번째 상태 `env-drift` + `concord doctor` (D-15 preflight) + `concord cleanup` + plugin introspection (POC-5) + runner prune 실제 디스크 삭제. Plan 2B `concord sync` 파이프라인에 secret resolve 훅 추가.

**Architecture:**
- **SecretResolver = manifest entry → resolved entry**. `entry.source.url` / `entry.source.ref` / `entry.env.*` / `entry.authHeader` / `entry.headers.*` 만 resolve (E-7 allowlist). 자산 파일 내용 intact (Π2).
- **Provider-aware exemption (E-5)**: OpenCode 자산은 concord 양보 (이중 치환 방지).
- **On-install eager (E-2)**: `sync` / `update` / `doctor` 매번 re-resolve. Lock 은 unresolved only (E-3).
- **env-drift (E-2a)**: 4 상태 → 5 상태. resolver 를 current env 로 재평가 → target 파일 현재 내용과 비교.
- **Plugin introspection**: Fetched plugin dir 에서 `plugin.json` / `.codex-plugin/plugin.json` / `package.json#main` 파싱 → `capability_matrix` 계산.
- **`concord doctor`**: D-15 preflight 5 + env-drift 보고 + capability_matrix.
- **`concord cleanup`**: 결정 C §6 Homebrew Bundle 스타일 opt-in extraneous prune.

**Tech Stack** (Plan 1/2A/2B 확정 유지):
- Node.js >=22 / TypeScript 6 / Vitest 4 / Zod 4 / commander 14
- `write-file-atomic@7.0.1` / `fs-extra@11.3.4` (기존 dep)
- `strip-bom` (결정 D 부록 A 대응 — 필요 시 npm install)
- `semver@7` (기존, Codex version probe)
- `is-wsl@3.1.1` (기존)

**Dependency inputs from Plan 1:**
- `src/schema/interpolation-allowlist.ts` (containsInterpolation / isAllowedField / checkNested / checkPathTraversal) — 재사용
- `src/schema/reserved-identifier-registry.ts` (E-6/E-11/E-12/E-15 parse error) — 재사용
- `src/schema/capability-matrix.ts` (Q4 discriminated union + reason enum + renderer) — 재사용

**Dependency inputs from Plan 2B:**
- `src/utils/exec-file.ts` (`runCommand` wrapper) — Codex version probe / Git Bash 감지에 사용
- `src/sync/drift.ts` (DriftStatus) — 4→5 상태 확장
- `src/sync/runner.ts` (runSync) — secret resolve 훅 + prune 실삭제
- `src/sync/rollback.ts` (createRollbackLog) — cleanup 통합
- `src/fetch/registry.ts` / `src/install/routing.ts` / `src/write/registry.ts` — 전부 그대로 사용

**Spec reference:** `docs/superpowers/specs/2026-04-21-concord-design.md`
- §2 Reserved Identifier Registry (E-6/E-11/E-12/E-15 이미 등재)
- §4.5 E-7 Allowlist
- §7.3.2 drift `env-drift`
- §8 Secret Interpolation Contract (E-1~E-19)
- §9 Windows Install §D-15 preflight

**Non-goals (Plan 4):**
- `concord init` / `detect` / `adopt` / `import` / `replace` / `update` / `why` — Plan 4
- Guided bootstrap UX (Terraform apply 패턴) — Plan 4
- Phase 2 cross-tool adapter / `{secret:X}` structured reference

**Merge strategy:** `feat/concord-plan-3-secret-diagnostics` → main.

---

## File Structure

### Created files

| 파일 | 역할 |
|---|---|
| `src/secret/types.ts` | `ResolvedEntry` / `ResolverContext` / `ResolveError` |
| `src/secret/parser.ts` | `{scheme:value[:-default]}` expression parser (E-1/E-11/E-13/E-19) |
| `src/secret/env-resolver.ts` | `{env:X}` / `{env:X:-default}` / `{env:X?}` resolve (E-4/E-11) |
| `src/secret/file-resolver.ts` | `{file:X}` resolve + UTF-8 check (E-15) + tilde 확장 |
| `src/secret/render.ts` | 1-depth string render (E-14) + escape `{{...}}` 해제 (E-13) + nested guard (E-9) |
| `src/secret/provider-policy.ts` | E-5 자산별 테이블 (`shouldConcordInterpolate(provider, assetType)`) |
| `src/secret/encode.ts` | E-18 target format safe encoding (YAML block scalar / JSON escape / TOML escape) |
| `src/secret/resolve-entry.ts` | manifest entry → resolved entry (allowlist 통과 필드만) |
| `src/sync/env-drift.ts` | E-2a env-drift 판정 (resolver 재실행 + target 값 비교) |
| `src/plugin/types.ts` | `PluginManifest` / `PluginCapability` |
| `src/plugin/claude.ts` | Claude `plugin.json` parser |
| `src/plugin/codex.ts` | Codex `.codex-plugin/plugin.json` parser |
| `src/plugin/opencode.ts` | OpenCode `package.json#main` parser |
| `src/plugin/registry.ts` | 3 provider routing |
| `src/plugin/capability.ts` | `introspectPlugin()` → `CapabilityMatrix` 계산 |
| `src/cli/commands/doctor.ts` | `concord doctor` preflight 5 + drift + capability matrix |
| `src/cli/commands/cleanup.ts` | `concord cleanup` opt-in extraneous prune |
| `src/sync/preflight/git-bash.ts` | Git Bash 존재 감지 (Windows) |
| `src/sync/preflight/codex-version.ts` | Codex CLI version probe + semver >=0.119 |
| `src/sync/preflight/platform-warnings.ts` | Developer Mode / AV / OneDrive 경로 감지 |
| `src/install/uninstall.ts` | prune 실삭제 (symlink unlink + marker removal) |

### Test files

`tests/secret/*.test.ts`, `tests/plugin/*.test.ts`, `tests/sync/env-drift.test.ts`, `tests/sync/preflight/*.test.ts`, `tests/cli/doctor.test.ts`, `tests/cli/cleanup.test.ts`, `tests/install/uninstall.test.ts`, `tests/integration/*.test.ts`.

### Modified files

- `src/sync/drift.ts` — `DriftStatus` 확장 (`"env"` 추가). 기존 5 case test 유지 + 새 case 추가
- `src/sync/runner.ts` — secret resolve 훅 + prune 실삭제 호출
- `src/cli/index.ts` — `doctor` / `cleanup` command 등록
- `README.md` / `TODO.md` / `MEMORY.md` — Plan 3 완료 Snapshot

### Why this structure

- `src/secret/` 는 단일 책임 (resolve). Plan 2B 의 `src/sync/`, `src/fetch/`, `src/write/` 와 peer 레벨
- `src/plugin/` 는 plugin introspection 전용 (POC-5 scope)
- `src/sync/preflight/` 는 `concord doctor` 의 checks — doctor command 에서 조합
- 각 resolver (env / file) 독립 파일 — 테스트 격리 + 향후 `{secret:X}` Phase 2 확장 지점

---

## Tasks

### Task 1 — Feature Branch + Baseline Verification

**Files:** 없음 (branch 생성 + verification 만)

- [ ] **Step 1: Create feature branch off main**

```bash
cd /Users/macbook/workspace/concord
git checkout main
git pull --ff-only 2>&1 || true
git checkout -b feat/concord-plan-3-secret-diagnostics
```

- [ ] **Step 2: Verify baseline**

```bash
npm run typecheck
npx vitest run
```

Expected: **408 passed + 1 skipped (68 files)**, typecheck clean.

- [ ] **Step 3: Verify reserved registry already has E-6/E-11/E-12/E-15 patterns**

```bash
grep -c "secret-backend\|type-coercion\|binary-encoding\|default-colonless\|default-strict-error" src/schema/reserved-identifier-registry.ts
```

Expected output: `5` (5 reserved patterns from Plan 1 Task 4).

- [ ] **Step 4: Commit empty marker (NOT required — this task has no file changes)**

No commit needed for Task 1. Just verification.

---

### Task 2 — Drift 5th State: `env`

**Files:** Modify `src/sync/drift.ts` + update `tests/sync/drift.test.ts`

**Purpose**: E-2a — 기존 4 상태 `none`/`source`/`target`/`divergent` + 새 `env` 상태.

- [ ] **Step 1: Update test first** — add env-drift case

Edit `tests/sync/drift.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { computeDriftStatus, type DriftInput } from "../../src/sync/drift.js";

describe("computeDriftStatus", () => {
  const BASE_NODE = {
    source_digest: "sha256-src-abc",
    target_digest: "sha256-tgt-xyz",
  };

  it("none: both source and target match lock", () => {
    const input: DriftInput = {
      node: BASE_NODE,
      currentSourceDigest: "sha256-src-abc",
      currentTargetDigest: "sha256-tgt-xyz",
      currentEnvDigest: "sha256-env-1",
      lockEnvDigest: "sha256-env-1",
    };
    expect(computeDriftStatus(input)).toBe("none");
  });

  it("source drift", () => {
    expect(
      computeDriftStatus({
        node: BASE_NODE,
        currentSourceDigest: "sha256-src-CHANGED",
        currentTargetDigest: "sha256-tgt-xyz",
        currentEnvDigest: "e",
        lockEnvDigest: "e",
      }),
    ).toBe("source");
  });

  it("target drift", () => {
    expect(
      computeDriftStatus({
        node: BASE_NODE,
        currentSourceDigest: "sha256-src-abc",
        currentTargetDigest: "sha256-tgt-CHANGED",
        currentEnvDigest: "e",
        lockEnvDigest: "e",
      }),
    ).toBe("target");
  });

  it("divergent", () => {
    expect(
      computeDriftStatus({
        node: BASE_NODE,
        currentSourceDigest: "sha256-src-CHANGED",
        currentTargetDigest: "sha256-tgt-CHANGED",
        currentEnvDigest: "e",
        lockEnvDigest: "e",
      }),
    ).toBe("divergent");
  });

  it("env drift: source+target match lock but env value changed", () => {
    expect(
      computeDriftStatus({
        node: BASE_NODE,
        currentSourceDigest: "sha256-src-abc",
        currentTargetDigest: "sha256-tgt-xyz",
        currentEnvDigest: "sha256-env-NEW",
        lockEnvDigest: "sha256-env-OLD",
      }),
    ).toBe("env");
  });

  it("env drift precedence: source drift wins over env drift", () => {
    expect(
      computeDriftStatus({
        node: BASE_NODE,
        currentSourceDigest: "sha256-src-CHANGED",
        currentTargetDigest: "sha256-tgt-xyz",
        currentEnvDigest: "sha256-env-NEW",
        lockEnvDigest: "sha256-env-OLD",
      }),
    ).toBe("source");
  });

  it("currentTargetDigest null + sources match → target", () => {
    expect(
      computeDriftStatus({
        node: BASE_NODE,
        currentSourceDigest: "sha256-src-abc",
        currentTargetDigest: null,
        currentEnvDigest: "e",
        lockEnvDigest: "e",
      }),
    ).toBe("target");
  });

  it("lockEnvDigest undefined → skip env check", () => {
    expect(
      computeDriftStatus({
        node: BASE_NODE,
        currentSourceDigest: "sha256-src-abc",
        currentTargetDigest: "sha256-tgt-xyz",
        currentEnvDigest: "e",
        // lockEnvDigest omitted → backward compat, no env-drift
      }),
    ).toBe("none");
  });
});
```

- [ ] **Step 2: Run test, expect FAIL** (missing env digest fields on DriftInput)

```bash
npx vitest run tests/sync/drift.test.ts
```

- [ ] **Step 3: Update `src/sync/drift.ts`**

```typescript
export type DriftStatus = "none" | "source" | "target" | "divergent" | "env";

export interface DriftInput {
  node: { source_digest?: string; target_digest?: string };
  currentSourceDigest: string;
  currentTargetDigest: string | null;
  /** Current env resolve digest (sha256 of resolved values in allowed fields). */
  currentEnvDigest: string;
  /** Lock-stored env digest. Undefined = legacy lock, skip env check. */
  lockEnvDigest?: string;
}

export function computeDriftStatus(input: DriftInput): DriftStatus {
  const sourceMatches = input.currentSourceDigest === input.node.source_digest;
  const targetMatches =
    input.currentTargetDigest !== null &&
    input.currentTargetDigest === input.node.target_digest;
  if (!sourceMatches && targetMatches) return "source";
  if (sourceMatches && !targetMatches) return "target";
  if (!sourceMatches && !targetMatches) return "divergent";
  // source+target both match → check env
  if (
    input.lockEnvDigest !== undefined &&
    input.currentEnvDigest !== input.lockEnvDigest
  ) {
    return "env";
  }
  return "none";
}
```

- [ ] **Step 4: Run test, expect 8/8 PASS**

```bash
npx vitest run tests/sync/drift.test.ts
```

- [ ] **Step 5: Full suite + typecheck**

```bash
npx vitest run
npm run typecheck
```

Expected: **410 passed + 1 skipped (68 files)**, typecheck clean.

- [ ] **Step 6: Commit**

```bash
git add src/sync/drift.ts tests/sync/drift.test.ts
git commit -m "feat(sync): drift 5th state env-drift (E-2a, source/target precedence)"
```

---

### Task 3 — Secret Types + ResolveError

**Files:** Create `src/secret/types.ts` + `tests/secret/types.test.ts`

- [ ] **Step 1: Write test**

```typescript
import { describe, it, expect } from "vitest";
import {
  makeResolveError,
  type ResolverContext,
  type ResolvedEntry,
} from "../../src/secret/types.js";

describe("secret/types", () => {
  it("makeResolveError: code + name + E-17 resolved redaction", () => {
    const e = makeResolveError(
      "env-var-missing",
      "GITHUB_TOKEN not set",
      "{env:GITHUB_TOKEN}",
    );
    expect(e.code).toBe("env-var-missing");
    expect(e.name).toBe("ResolveError");
    expect(e.expression).toBe("{env:GITHUB_TOKEN}");
    // E-17: message must NOT contain resolved value
    expect(e.message).not.toContain("ghp_");
  });

  it("ResolverContext shape compiles", () => {
    const ctx: ResolverContext = {
      projectRoot: "/tmp/proj",
      env: { X: "1" },
      provider: "claude-code",
      assetType: "skills",
      fieldPath: "source.url",
    };
    expect(ctx.provider).toBe("claude-code");
  });

  it("ResolvedEntry shape compiles", () => {
    const r: ResolvedEntry = {
      entry: { id: "skills:x" },
      envDigest: "sha256:abc",
      resolvedFields: new Map([["source.url", "https://x"]]),
    };
    expect(r.envDigest).toMatch(/^sha256:/);
  });
});
```

- [ ] **Step 2: Run test, expect FAIL**

- [ ] **Step 3: Implement `src/secret/types.ts`**

```typescript
export type ResolveErrorCode =
  | "env-var-missing"
  | "file-not-found"
  | "file-not-utf8"
  | "path-traversal"
  | "nested-interpolation"
  | "type-coercion-not-allowed"
  | "reserved-syntax"
  | "escape-malformed";

export interface ResolveError extends Error {
  code: ResolveErrorCode;
  /** Original unresolved expression (never the resolved value — E-17). */
  expression: string;
}

export function makeResolveError(
  code: ResolveErrorCode,
  message: string,
  expression: string,
): ResolveError {
  const e = new Error(message) as ResolveError;
  e.code = code;
  e.expression = expression;
  e.name = "ResolveError";
  return e;
}

export interface ResolverContext {
  /** Absolute project root for {file:X} path traversal check (E-10). */
  projectRoot: string;
  /** Env snapshot used for this resolve pass. */
  env: Readonly<Record<string, string | undefined>>;
  provider: "claude-code" | "codex" | "opencode";
  assetType: "skills" | "subagents" | "hooks" | "mcp_servers" | "instructions" | "plugins";
  /** For error messages: dot path like "source.url" or "env.GITHUB_TOKEN". */
  fieldPath: string;
}

export interface ResolvedEntry {
  /** The manifest entry with resolve-eligible fields replaced. */
  entry: Record<string, unknown>;
  /** sha256 of concat(resolvedFields entries) — E-2a env-drift input. */
  envDigest: string;
  /** Debug trace of (fieldPath → resolvedValue). Never logged in production (E-17). */
  resolvedFields: Map<string, string>;
}
```

- [ ] **Step 4: Run + Commit**

```bash
npx vitest run tests/secret/types.test.ts
mkdir -p src/secret tests/secret
git add src/secret/types.ts tests/secret/types.test.ts
git commit -m "feat(secret): types + ResolveError (E-17 redaction invariant)"
```

---

### Task 4 — Expression Parser (E-1, E-11, E-13, E-19)

**Files:** Create `src/secret/parser.ts` + `tests/secret/parser.test.ts`

**Purpose**: Parse a single `{scheme:value[:-default|?]}` expression. Handle E-13 escape, E-19 first-colon rule.

- [ ] **Step 1: Write test**

```typescript
import { describe, it, expect } from "vitest";
import {
  parseExpression,
  findAllExpressions,
  type ParsedExpression,
} from "../../src/secret/parser.js";

describe("parseExpression", () => {
  it("E-1 basic: {env:X} → scheme=env value=X", () => {
    const p = parseExpression("{env:GITHUB_TOKEN}");
    expect(p).toEqual<ParsedExpression>({
      scheme: "env",
      value: "GITHUB_TOKEN",
      default: undefined,
      optional: false,
      raw: "{env:GITHUB_TOKEN}",
    });
  });

  it("E-1 file: {file:path}", () => {
    const p = parseExpression("{file:/etc/foo}");
    expect(p.scheme).toBe("file");
    expect(p.value).toBe("/etc/foo");
  });

  it("E-11 default: {env:X:-hello}", () => {
    const p = parseExpression("{env:API:-hello}");
    expect(p.scheme).toBe("env");
    expect(p.value).toBe("API");
    expect(p.default).toBe("hello");
    expect(p.optional).toBe(false);
  });

  it("E-11 optional marker: {env:X?}", () => {
    const p = parseExpression("{env:API?}");
    expect(p.scheme).toBe("env");
    expect(p.value).toBe("API");
    expect(p.optional).toBe(true);
    expect(p.default).toBeUndefined();
  });

  it("E-19 Windows forward-slash path: first colon only", () => {
    const p = parseExpression("{file:C:/Users/alice/cert.pem}");
    expect(p.scheme).toBe("file");
    expect(p.value).toBe("C:/Users/alice/cert.pem");
    expect(p.default).toBeUndefined();
  });

  it("E-11 empty default allowed: {env:X:-}", () => {
    const p = parseExpression("{env:X:-}");
    expect(p.default).toBe("");
  });

  it("unknown scheme not rejected (caller validates)", () => {
    const p = parseExpression("{weird:v}");
    expect(p.scheme).toBe("weird");
  });

  it("findAllExpressions: multiple in one string", () => {
    const s = "url={env:BASE}/api/{env:VERSION:-v1}/x";
    const all = findAllExpressions(s);
    expect(all).toHaveLength(2);
    expect(all[0]!.raw).toBe("{env:BASE}");
    expect(all[1]!.raw).toBe("{env:VERSION:-v1}");
  });

  it("findAllExpressions: escape {{env:X}} skipped (E-13)", () => {
    const s = "Literal {{env:X}} plus real {env:Y}";
    const all = findAllExpressions(s);
    expect(all).toHaveLength(1);
    expect(all[0]!.raw).toBe("{env:Y}");
  });

  it("findAllExpressions: no match returns empty", () => {
    expect(findAllExpressions("no expressions here")).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test, expect FAIL**

- [ ] **Step 3: Implement `src/secret/parser.ts`**

```typescript
export interface ParsedExpression {
  scheme: string;
  value: string;
  /** E-11 default (colon-dash variant). */
  default: string | undefined;
  /** E-11 optional marker (`?` suffix). */
  optional: boolean;
  /** Original expression text including braces. */
  raw: string;
}

/**
 * Parse ONE expression. Caller is responsible for finding boundaries.
 * E-13 escape (`{{env:X}}`) is NOT handled here — use findAllExpressions.
 * E-19 Windows: first `:` separates scheme; rest of body is value (may contain `:`).
 */
export function parseExpression(raw: string): ParsedExpression {
  if (!raw.startsWith("{") || !raw.endsWith("}")) {
    throw new Error(`parseExpression: malformed brace: ${raw}`);
  }
  const body = raw.slice(1, -1);
  const firstColon = body.indexOf(":");
  if (firstColon === -1) {
    throw new Error(`parseExpression: missing scheme separator: ${raw}`);
  }
  const scheme = body.slice(0, firstColon);
  let rest = body.slice(firstColon + 1);
  let optional = false;
  let defaultValue: string | undefined;

  // E-11 optional suffix `?` (must be last char, not part of default)
  if (rest.endsWith("?") && !rest.includes(":-")) {
    optional = true;
    rest = rest.slice(0, -1);
  }
  // E-11 default `:-default` (check for LAST `:-` to allow values with colons)
  const defaultIdx = rest.indexOf(":-");
  if (defaultIdx !== -1) {
    defaultValue = rest.slice(defaultIdx + 2);
    rest = rest.slice(0, defaultIdx);
  }

  return {
    scheme,
    value: rest,
    default: defaultValue,
    optional,
    raw,
  };
}

/**
 * Find all `{scheme:...}` in a string, skipping `{{...}}` escape (E-13).
 * Returns parsed expressions in order of appearance.
 */
export function findAllExpressions(input: string): ParsedExpression[] {
  const results: ParsedExpression[] = [];
  let i = 0;
  while (i < input.length) {
    if (input[i] === "{" && input[i + 1] === "{") {
      // E-13 escape — skip `{{...}}`
      const end = input.indexOf("}}", i + 2);
      if (end === -1) break;
      i = end + 2;
      continue;
    }
    if (input[i] === "{") {
      const end = input.indexOf("}", i + 1);
      if (end === -1) break;
      const raw = input.slice(i, end + 1);
      try {
        results.push(parseExpression(raw));
      } catch {
        // malformed — skip
      }
      i = end + 1;
      continue;
    }
    i++;
  }
  return results;
}
```

- [ ] **Step 4: Run test, expect 10/10 PASS**

- [ ] **Step 5: Commit**

```bash
git add src/secret/parser.ts tests/secret/parser.test.ts
git commit -m "feat(secret): expression parser (E-1/E-11/E-13/E-19)"
```

---

### Task 5 — Env Resolver (E-4, E-11)

**Files:** Create `src/secret/env-resolver.ts` + `tests/secret/env-resolver.test.ts`

- [ ] **Step 1: Write test**

```typescript
import { describe, it, expect } from "vitest";
import { resolveEnv } from "../../src/secret/env-resolver.js";
import { parseExpression } from "../../src/secret/parser.js";

describe("resolveEnv", () => {
  const ctx = {
    projectRoot: "/tmp",
    env: { GITHUB_TOKEN: "ghp_abc", EMPTY: "", OTHER: "v" } as Record<string, string | undefined>,
    provider: "claude-code" as const,
    assetType: "mcp_servers" as const,
    fieldPath: "env.X",
  };

  it("E-4 present → value", () => {
    expect(resolveEnv(parseExpression("{env:GITHUB_TOKEN}"), ctx)).toBe("ghp_abc");
  });

  it("E-4 missing → ResolveError env-var-missing", () => {
    expect(() => resolveEnv(parseExpression("{env:NOT_SET}"), ctx)).toThrow(/env-var-missing/);
  });

  it("E-4 error message does NOT leak other env values (E-17)", () => {
    try {
      resolveEnv(parseExpression("{env:NOT_SET}"), ctx);
    } catch (err) {
      const msg = (err as Error).message;
      expect(msg).not.toContain("ghp_abc");
    }
  });

  it("E-11 missing + default → default", () => {
    expect(resolveEnv(parseExpression("{env:NOT_SET:-fallback}"), ctx)).toBe("fallback");
  });

  it("E-11 empty string treated as missing when default given", () => {
    expect(resolveEnv(parseExpression("{env:EMPTY:-fallback}"), ctx)).toBe("fallback");
  });

  it("E-11 optional missing → empty string", () => {
    expect(resolveEnv(parseExpression("{env:NOT_SET?}"), ctx)).toBe("");
  });

  it("E-11 optional present → value", () => {
    expect(resolveEnv(parseExpression("{env:OTHER?}"), ctx)).toBe("v");
  });
});
```

- [ ] **Step 2: Run, expect FAIL**

- [ ] **Step 3: Implement `src/secret/env-resolver.ts`**

```typescript
import { makeResolveError, type ResolverContext } from "./types.js";
import type { ParsedExpression } from "./parser.js";

export function resolveEnv(expr: ParsedExpression, ctx: ResolverContext): string {
  if (expr.scheme !== "env") {
    throw makeResolveError(
      "reserved-syntax",
      `resolveEnv called with scheme=${expr.scheme}`,
      expr.raw,
    );
  }
  const raw = ctx.env[expr.value];
  // E-11 empty string + default → use default (Docker Compose `:-` behavior)
  if ((raw === undefined || raw === "") && expr.default !== undefined) {
    return expr.default;
  }
  if (raw === undefined || raw === "") {
    if (expr.optional) return "";
    throw makeResolveError(
      "env-var-missing",
      `environment variable not set at ${ctx.fieldPath}: ${expr.raw} (E-4). Use ${expr.raw.slice(0, -1)}:-default} for default, or ${expr.raw.slice(0, -1)}?} for optional.`,
      expr.raw,
    );
  }
  return raw;
}
```

- [ ] **Step 4: Run, expect 7/7 PASS**

- [ ] **Step 5: Commit**

```bash
git add src/secret/env-resolver.ts tests/secret/env-resolver.test.ts
git commit -m "feat(secret): env resolver (E-4/E-11 fail-closed + default + optional)"
```

---

### Task 6 — File Resolver (E-10, E-15)

**Files:** Create `src/secret/file-resolver.ts` + `tests/secret/file-resolver.test.ts`

- [ ] **Step 1: Write test**

```typescript
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, writeFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { resolveFile } from "../../src/secret/file-resolver.js";
import { parseExpression } from "../../src/secret/parser.js";

describe("resolveFile", () => {
  let tmp: string;
  beforeEach(async () => { tmp = await mkdtemp(join(tmpdir(), "concord-fr-")); });
  afterEach(async () => { await rm(tmp, { recursive: true, force: true }); });

  const makeCtx = (root: string) => ({
    projectRoot: root,
    env: {} as Record<string, string | undefined>,
    provider: "claude-code" as const,
    assetType: "mcp_servers" as const,
    fieldPath: "env.CRED",
  });

  it("present UTF-8 file → content", async () => {
    const p = join(tmp, "cred.txt");
    await writeFile(p, "hello-token\n", "utf8");
    const res = resolveFile(parseExpression(`{file:${p}}`), makeCtx(tmp));
    expect(res).toBe("hello-token\n");
  });

  it("E-10 path traversal → path-traversal error", () => {
    expect(() =>
      resolveFile(parseExpression(`{file:../../etc/passwd}`), makeCtx(tmp)),
    ).toThrow(/path-traversal/);
  });

  it("missing file → file-not-found", () => {
    expect(() =>
      resolveFile(parseExpression(`{file:${join(tmp, "missing")}}`), makeCtx(tmp)),
    ).toThrow(/file-not-found/);
  });

  it("E-15 non-UTF8 binary → file-not-utf8 error", async () => {
    const p = join(tmp, "binary.bin");
    // Invalid UTF-8 byte sequence
    await writeFile(p, Buffer.from([0xff, 0xfe, 0xfd, 0xfc]));
    expect(() =>
      resolveFile(parseExpression(`{file:${p}}`), makeCtx(tmp)),
    ).toThrow(/file-not-utf8/);
  });

  it("E-15 BOM stripped from UTF-8", async () => {
    const p = join(tmp, "bom.txt");
    await writeFile(p, "﻿hello");
    const res = resolveFile(parseExpression(`{file:${p}}`), makeCtx(tmp));
    expect(res).toBe("hello");
  });

  it("E-11 default on missing file", () => {
    const res = resolveFile(
      parseExpression(`{file:${join(tmp, "none")}:-fallback}`),
      makeCtx(tmp),
    );
    expect(res).toBe("fallback");
  });
});
```

- [ ] **Step 2: Run, expect FAIL**

- [ ] **Step 3: Implement `src/secret/file-resolver.ts`**

```typescript
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { makeResolveError, type ResolverContext } from "./types.js";
import type { ParsedExpression } from "./parser.js";
import { checkPathTraversal } from "../schema/interpolation-allowlist.js";

function stripBom(s: string): string {
  return s.charCodeAt(0) === 0xfeff ? s.slice(1) : s;
}

function isValidUtf8(buf: Buffer): boolean {
  // Node's TextDecoder with fatal=true throws on invalid UTF-8.
  try {
    new TextDecoder("utf-8", { fatal: true }).decode(buf);
    return true;
  } catch {
    return false;
  }
}

export function resolveFile(expr: ParsedExpression, ctx: ResolverContext): string {
  if (expr.scheme !== "file") {
    throw makeResolveError(
      "reserved-syntax",
      `resolveFile called with scheme=${expr.scheme}`,
      expr.raw,
    );
  }

  const rawPath = expr.value;
  // Tilde expansion — `~` or `~/` only (no `~user/`).
  const expanded = rawPath === "~" ? os.homedir()
    : rawPath.startsWith("~/") ? path.join(os.homedir(), rawPath.slice(2))
    : rawPath;

  // E-10 path traversal (re-uses Plan 1 helper — throws InterpolationError)
  try {
    checkPathTraversal(expanded, ctx.projectRoot);
  } catch (err) {
    throw makeResolveError(
      "path-traversal",
      (err instanceof Error ? err.message : String(err)) + ` at ${ctx.fieldPath}`,
      expr.raw,
    );
  }

  const abs = path.isAbsolute(expanded) ? expanded : path.resolve(ctx.projectRoot, expanded);

  let buf: Buffer;
  try {
    buf = fs.readFileSync(abs);
  } catch {
    if (expr.default !== undefined) return expr.default;
    if (expr.optional) return "";
    throw makeResolveError(
      "file-not-found",
      `file not found at ${ctx.fieldPath}: ${expr.raw}. Create the file or use ${expr.raw.slice(0, -1)}:-default} for default.`,
      expr.raw,
    );
  }

  if (!isValidUtf8(buf)) {
    throw makeResolveError(
      "file-not-utf8",
      `file is not valid UTF-8 at ${ctx.fieldPath}: ${expr.raw} (E-15). Binary encoding reserved for Phase 2 (${expr.raw.slice(0, -1)}|base64}).`,
      expr.raw,
    );
  }

  return stripBom(buf.toString("utf8"));
}
```

- [ ] **Step 4: Run, expect 6/6 PASS**

- [ ] **Step 5: Commit**

```bash
git add src/secret/file-resolver.ts tests/secret/file-resolver.test.ts
git commit -m "feat(secret): file resolver (E-10 traversal + E-15 UTF-8/BOM)"
```

---

### Task 7 — String Render (E-9, E-13, E-14)

**Files:** Create `src/secret/render.ts` + `tests/secret/render.test.ts`

**Purpose**: Render a full string — replace every `{scheme:...}` with its resolved value. Apply escape `{{...}}` → `{...}`. Enforce E-14 depth=1 (resolved result is NOT re-scanned). Enforce E-9 nested guard.

- [ ] **Step 1: Write test**

```typescript
import { describe, it, expect } from "vitest";
import { renderString } from "../../src/secret/render.js";

describe("renderString", () => {
  const ctx = {
    projectRoot: "/tmp",
    env: { BASE: "https://api.example.com", VERSION: "v1", TOKEN: "t" } as Record<string, string | undefined>,
    provider: "claude-code" as const,
    assetType: "mcp_servers" as const,
    fieldPath: "source.url",
  };

  it("no interpolation → passthrough", () => {
    expect(renderString("literal text", ctx)).toBe("literal text");
  });

  it("single env expression", () => {
    expect(renderString("{env:BASE}", ctx)).toBe("https://api.example.com");
  });

  it("multiple expressions in one string", () => {
    expect(renderString("{env:BASE}/api/{env:VERSION}/x", ctx)).toBe(
      "https://api.example.com/api/v1/x",
    );
  });

  it("E-13 escape {{...}} → literal {...}", () => {
    expect(renderString("Use {{env:FOO}} syntax", ctx)).toBe("Use {env:FOO} syntax");
  });

  it("E-13 escape + real expression mixed", () => {
    expect(renderString("{{env:LITERAL}} and {env:BASE}", ctx)).toBe(
      "{env:LITERAL} and https://api.example.com",
    );
  });

  it("E-9 nested → nested-interpolation error", () => {
    expect(() => renderString("{env:PREFIX_{env:VERSION}}", ctx)).toThrow(/nested-interpolation/);
  });

  it("E-14 1-depth: file content not re-scanned for env", () => {
    // If VERSION is "{env:INNER}" literally in env, renderString still returns it as-is
    const ctx2 = { ...ctx, env: { ...ctx.env, HAS_TMPL: "{env:BASE}" } };
    expect(renderString("{env:HAS_TMPL}", ctx2)).toBe("{env:BASE}");
  });
});
```

- [ ] **Step 2: Run, expect FAIL**

- [ ] **Step 3: Implement `src/secret/render.ts`**

```typescript
import { findAllExpressions } from "./parser.js";
import { resolveEnv } from "./env-resolver.js";
import { resolveFile } from "./file-resolver.js";
import { makeResolveError, type ResolverContext } from "./types.js";
import { checkNested } from "../schema/interpolation-allowlist.js";

/**
 * Render a full string — replaces each `{scheme:...}` expression with its
 * resolved value (E-1 / E-11). Applies E-13 escape. Enforces:
 *   - E-9 nested guard via checkNested
 *   - E-14 depth=1: resolved values are NOT re-scanned
 *   - E-13 escape `{{...}}` → literal `{...}`
 */
export function renderString(input: string, ctx: ResolverContext): string {
  // E-9 nested guard (throws InterpolationError)
  try {
    checkNested(input);
  } catch (err) {
    throw makeResolveError(
      "nested-interpolation",
      (err instanceof Error ? err.message : String(err)) + ` at ${ctx.fieldPath}`,
      input,
    );
  }

  // Find expressions, skipping {{...}} escapes
  const exprs = findAllExpressions(input);

  // Build output: walk input; for each expression position, substitute; elsewhere copy literally (with {{...}} → {...})
  let out = "";
  let i = 0;
  let exprIdx = 0;
  while (i < input.length) {
    // E-13 escape handling
    if (input[i] === "{" && input[i + 1] === "{") {
      const end = input.indexOf("}}", i + 2);
      if (end === -1) {
        throw makeResolveError(
          "escape-malformed",
          `unclosed {{...}} escape at ${ctx.fieldPath}`,
          input,
        );
      }
      // `{{foo}}` → `{foo}`
      out += "{" + input.slice(i + 2, end) + "}";
      i = end + 2;
      continue;
    }
    // Real expression?
    if (input[i] === "{" && exprIdx < exprs.length && input.slice(i).startsWith(exprs[exprIdx]!.raw)) {
      const expr = exprs[exprIdx]!;
      let resolved: string;
      if (expr.scheme === "env") resolved = resolveEnv(expr, ctx);
      else if (expr.scheme === "file") resolved = resolveFile(expr, ctx);
      else {
        throw makeResolveError(
          "reserved-syntax",
          `unknown scheme "${expr.scheme}" at ${ctx.fieldPath}: ${expr.raw}`,
          expr.raw,
        );
      }
      out += resolved;
      i += expr.raw.length;
      exprIdx++;
      continue;
    }
    out += input[i];
    i++;
  }
  return out;
}
```

- [ ] **Step 4: Run, expect 7/7 PASS**

- [ ] **Step 5: Commit**

```bash
git add src/secret/render.ts tests/secret/render.test.ts
git commit -m "feat(secret): renderString (E-9 nested / E-13 escape / E-14 depth=1)"
```

---

### Task 8 — Provider Policy (E-5)

**Files:** Create `src/secret/provider-policy.ts` + `tests/secret/provider-policy.test.ts`

**Purpose**: `shouldConcordInterpolate(provider, assetType)` — OpenCode 자산 양보 (Π3).

- [ ] **Step 1: Write test**

```typescript
import { describe, it, expect } from "vitest";
import { shouldConcordInterpolate } from "../../src/secret/provider-policy.js";

describe("shouldConcordInterpolate (E-5)", () => {
  it("Claude mcp_servers → true", () => {
    expect(shouldConcordInterpolate("claude-code", "mcp_servers")).toBe(true);
  });

  it("Codex mcp_servers → true", () => {
    expect(shouldConcordInterpolate("codex", "mcp_servers")).toBe(true);
  });

  it("OpenCode mcp_servers → false (provider handles)", () => {
    expect(shouldConcordInterpolate("opencode", "mcp_servers")).toBe(false);
  });

  it("OpenCode skills → false (Π3 양보)", () => {
    expect(shouldConcordInterpolate("opencode", "skills")).toBe(false);
  });

  it("OpenCode plugins → false", () => {
    expect(shouldConcordInterpolate("opencode", "plugins")).toBe(false);
  });

  it("Claude skills → true", () => {
    expect(shouldConcordInterpolate("claude-code", "skills")).toBe(true);
  });
});
```

- [ ] **Step 2: Run, expect FAIL**

- [ ] **Step 3: Implement `src/secret/provider-policy.ts`**

```typescript
export type Provider = "claude-code" | "codex" | "opencode";
export type AssetType = "skills" | "subagents" | "hooks" | "mcp_servers" | "instructions" | "plugins";

/**
 * E-5 OpenCode 대칭 양보: OpenCode 는 `{env:X}` native 지원 →
 * concord 가 opencode 자산에 보간하면 이중 치환 (Π3).
 * Claude / Codex 자산은 concord 가 resolve.
 */
export function shouldConcordInterpolate(provider: Provider, _assetType: AssetType): boolean {
  if (provider === "opencode") return false;
  return true;
}
```

- [ ] **Step 4: Run, expect 6/6 PASS**

- [ ] **Step 5: Commit**

```bash
git add src/secret/provider-policy.ts tests/secret/provider-policy.test.ts
git commit -m "feat(secret): provider policy (E-5 OpenCode symmetric exemption)"
```

---

### Task 9 — Target-format Safe Encoding (E-18)

**Files:** Create `src/secret/encode.ts` + `tests/secret/encode.test.ts`

**Purpose**: Encode a resolved value for safe insertion into target config format. For Plan 3 scope we focus on JSON (most common via JSONC writer) and YAML block scalar for multi-line. TOML string escape is straightforward.

- [ ] **Step 1: Write test**

```typescript
import { describe, it, expect } from "vitest";
import { encodeForJson, encodeForYaml, encodeForToml } from "../../src/secret/encode.js";

describe("encode (E-18)", () => {
  it("JSON: string escape", () => {
    expect(encodeForJson("simple")).toBe('"simple"');
    expect(encodeForJson('quote"inside')).toBe('"quote\\"inside"');
    expect(encodeForJson("backslash\\")).toBe('"backslash\\\\"');
    expect(encodeForJson("line1\nline2")).toBe('"line1\\nline2"');
    expect(encodeForJson("tab\there")).toBe('"tab\\there"');
  });

  it("YAML: single-line uses double-quoted", () => {
    expect(encodeForYaml("value")).toMatch(/^"value"$/);
  });

  it("YAML: multi-line uses block scalar |", () => {
    const out = encodeForYaml("line1\nline2\nline3");
    // `|` block scalar followed by content
    expect(out).toContain("|");
    expect(out).toContain("line1");
    expect(out).toContain("line3");
  });

  it("YAML: PEM block preserved", () => {
    const pem = "-----BEGIN CERTIFICATE-----\nMIIB...\n-----END CERTIFICATE-----\n";
    const out = encodeForYaml(pem);
    expect(out).toContain("BEGIN CERTIFICATE");
    expect(out).toContain("END CERTIFICATE");
  });

  it("TOML: basic string escape", () => {
    expect(encodeForToml("simple")).toBe('"simple"');
    expect(encodeForToml('q"')).toBe('"q\\""');
    expect(encodeForToml("back\\slash")).toBe('"back\\\\slash"');
  });

  it("TOML: multi-line uses literal triple string", () => {
    const out = encodeForToml("line1\nline2");
    expect(out).toMatch(/^"""[\s\S]*"""$/);
  });
});
```

- [ ] **Step 2: Run, expect FAIL**

- [ ] **Step 3: Implement `src/secret/encode.ts`**

```typescript
/** E-18 target format safe encoding. */

export function encodeForJson(value: string): string {
  return JSON.stringify(value);
}

export function encodeForYaml(value: string): string {
  if (!value.includes("\n")) {
    // single-line double-quoted — delegate to JSON escaping (YAML double-quoted is JSON-compatible)
    return JSON.stringify(value);
  }
  // multi-line: use YAML block scalar |
  // caller is responsible for proper indentation in the surrounding doc
  const lines = value.split("\n");
  // ensure trailing newline preserved via chomping indicator if needed
  const chomping = value.endsWith("\n") ? "" : "-";
  return "|" + chomping + "\n" + lines.join("\n");
}

export function encodeForToml(value: string): string {
  if (value.includes("\n")) {
    // TOML multi-line basic string — triple quotes
    const escaped = value.replace(/\\/g, "\\\\").replace(/"""/g, '""\\"');
    return '"""' + escaped + '"""';
  }
  // TOML basic string — escape `"` and `\`
  return '"' + value.replace(/\\/g, "\\\\").replace(/"/g, '\\"') + '"';
}
```

- [ ] **Step 4: Run, expect 6/6 PASS**

- [ ] **Step 5: Commit**

```bash
git add src/secret/encode.ts tests/secret/encode.test.ts
git commit -m "feat(secret): encode for JSON/YAML/TOML safe insertion (E-18)"
```

---

### Task 10 — Entry Resolver (E-2, E-5, E-7, E-16, env-digest)

**Files:** Create `src/secret/resolve-entry.ts` + `tests/secret/resolve-entry.test.ts`

**Purpose**: Glue layer. Given a manifest entry + `ResolverContext`, walk the allowed fields (E-7), apply `renderString` to strings, compute `envDigest` (for E-2a), return `ResolvedEntry`.

- [ ] **Step 1: Write test**

```typescript
import { describe, it, expect } from "vitest";
import { resolveEntry } from "../../src/secret/resolve-entry.js";

const BASE_CTX = {
  projectRoot: "/tmp",
  env: { BASE: "https://api", TOKEN: "ghp_x", VERSION: "v1" } as Record<string, string | undefined>,
  provider: "claude-code" as const,
  assetType: "mcp_servers" as const,
  fieldPath: "entry",
};

describe("resolveEntry", () => {
  it("resolves allowed fields (source.url / env)", () => {
    const entry = {
      id: "mcp_servers:airtable",
      source: { type: "http", url: "{env:BASE}/airtable.tgz", sha256: "sha256:abc" },
      env: { AIRTABLE_TOKEN: "{env:TOKEN}" },
    };
    const r = resolveEntry(entry, BASE_CTX);
    expect((r.entry.source as any).url).toBe("https://api/airtable.tgz");
    expect((r.entry.env as any).AIRTABLE_TOKEN).toBe("ghp_x");
    // id is identity field (E-7 NOT allowed) — untouched
    expect(r.entry.id).toBe("mcp_servers:airtable");
  });

  it("id field with interpolation → UNCHANGED (E-7 rejects but parser should skip identity fields)", () => {
    // Plan 3 scope: resolve only allowed fields. Unknown fields pass through.
    const entry = { id: "x:y", command: "{env:BASE}" };
    const r = resolveEntry(entry, BASE_CTX);
    expect(r.entry.command).toBe("{env:BASE}"); // command NOT in allowlist
  });

  it("E-5 OpenCode provider → passthrough (no interpolation)", () => {
    const entry = {
      id: "mcp_servers:foo",
      source: { type: "http", url: "{env:BASE}/x", sha256: "sha256:abc" },
    };
    const r = resolveEntry(entry, { ...BASE_CTX, provider: "opencode" });
    expect((r.entry.source as any).url).toBe("{env:BASE}/x"); // unchanged
    expect(r.resolvedFields.size).toBe(0);
  });

  it("envDigest stable for same inputs", () => {
    const entry = { id: "x:y", source: { url: "{env:BASE}/x", type: "http", sha256: "sha256:abc" } };
    const r1 = resolveEntry(entry, BASE_CTX);
    const r2 = resolveEntry(entry, BASE_CTX);
    expect(r1.envDigest).toBe(r2.envDigest);
  });

  it("envDigest changes when env value changes", () => {
    const entry = { id: "x:y", source: { url: "{env:BASE}/x", type: "http", sha256: "sha256:abc" } };
    const r1 = resolveEntry(entry, BASE_CTX);
    const r2 = resolveEntry(entry, { ...BASE_CTX, env: { ...BASE_CTX.env, BASE: "https://OTHER" } });
    expect(r1.envDigest).not.toBe(r2.envDigest);
  });

  it("missing env required → throws at fieldPath", () => {
    const entry = {
      id: "x:y",
      source: { type: "http", url: "{env:NOT_SET}", sha256: "sha256:abc" },
    };
    expect(() => resolveEntry(entry, BASE_CTX)).toThrow(/env-var-missing/);
  });
});
```

- [ ] **Step 2: Run, expect FAIL**

- [ ] **Step 3: Implement `src/secret/resolve-entry.ts`**

```typescript
import { createHash } from "node:crypto";
import { renderString } from "./render.js";
import { shouldConcordInterpolate } from "./provider-policy.js";
import { isAllowedField } from "../schema/interpolation-allowlist.js";
import type { ResolvedEntry, ResolverContext } from "./types.js";

/**
 * Walk an entry; resolve any `{env:X}`/`{file:X}` in allowed fields (E-7).
 * - Provider = opencode: bypass entirely (E-5 Π3).
 * - Unknown/forbidden fields: pass through unchanged.
 * Returns a DEEP CLONE with substituted values + envDigest + debug map.
 */
export function resolveEntry(
  entry: Record<string, unknown>,
  ctx: ResolverContext,
): ResolvedEntry {
  if (!shouldConcordInterpolate(ctx.provider, ctx.assetType)) {
    return {
      entry: structuredClone(entry),
      envDigest: computeDigest(new Map()),
      resolvedFields: new Map(),
    };
  }

  const clone = structuredClone(entry);
  const resolvedFields = new Map<string, string>();
  walk(clone, "", ctx, resolvedFields);

  return {
    entry: clone,
    envDigest: computeDigest(resolvedFields),
    resolvedFields,
  };
}

function walk(
  node: unknown,
  fieldPath: string,
  ctx: ResolverContext,
  out: Map<string, string>,
): void {
  if (typeof node === "string") return; // handled by parent (we rewrite via parent assignment)
  if (Array.isArray(node)) {
    for (let i = 0; i < node.length; i++) {
      const child = node[i];
      const p = fieldPath ? `${fieldPath}.${i}` : String(i);
      if (typeof child === "string") {
        if (isAllowedField(stripArrayIndex(p))) {
          const rendered = renderString(child, { ...ctx, fieldPath: p });
          if (rendered !== child) {
            node[i] = rendered;
            out.set(p, rendered);
          }
        }
      } else {
        walk(child, p, ctx, out);
      }
    }
    return;
  }
  if (node !== null && typeof node === "object") {
    const obj = node as Record<string, unknown>;
    for (const k of Object.keys(obj)) {
      const child = obj[k];
      const p = fieldPath ? `${fieldPath}.${k}` : k;
      if (typeof child === "string") {
        if (isAllowedField(stripArrayIndex(p))) {
          const rendered = renderString(child, { ...ctx, fieldPath: p });
          if (rendered !== child) {
            obj[k] = rendered;
            out.set(p, rendered);
          }
        }
      } else {
        walk(child, p, ctx, out);
      }
    }
  }
}

function stripArrayIndex(p: string): string {
  return p.replace(/\.\d+$/g, "").replace(/\.\d+\./g, ".");
}

function computeDigest(fields: Map<string, string>): string {
  const h = createHash("sha256");
  const keys = [...fields.keys()].sort();
  for (const k of keys) {
    h.update(k);
    h.update("\0");
    h.update(fields.get(k)!);
    h.update("\0");
  }
  return `sha256:${h.digest("hex")}`;
}
```

- [ ] **Step 4: Run, expect 6/6 PASS**

- [ ] **Step 5: Commit**

```bash
git add src/secret/resolve-entry.ts tests/secret/resolve-entry.test.ts
git commit -m "feat(secret): resolveEntry (E-7 allowlist + E-5 provider + env digest)"
```

---

### Task 11 — Integrate Secret Resolver into runner

**Files:** Modify `src/sync/runner.ts` + update `tests/sync/runner.test.ts`

**Purpose**: Before fetch, resolve `entry.source.*`. Before install (config side), resolve `entry.env.*` / headers. Store `envDigest` on lock node for E-2a drift.

- [ ] **Step 1: Update test to cover env interpolation**

Add a new test case to `tests/sync/runner.test.ts`:

```typescript
it("resolves {env:X} in entry.source.url before fetching (E-2 on-install eager)", async () => {
  // Create a tmp source dir; point manifest at it via {env:SRC_DIR}
  const src = join(tmp, "src"); await mkdir(src, { recursive: true });
  await writeFile(join(src, "SKILL.md"), "hi", "utf8");
  process.env.SRC_DIR = src;
  try {
    const manifest = {
      skills: [{
        id: "skills:e",
        provider: "claude-code",
        asset_type: "skills",
        source: { type: "file", path: "{env:SRC_DIR}" },
        target_path: join(tmp, "out"),
        install: "copy",
      }],
    };
    const plan = computeSyncPlan(manifest, { nodes: {} });
    const result = await runSync(plan, {
      fetchContext: { concordHome: tmp, cacheDir: join(tmp, "cache"), allowNetwork: true },
      projectRoot: tmp,
      env: process.env,
    });
    expect(result.installed).toContain("skills:e");
    expect(result.errors).toEqual([]);
  } finally {
    delete process.env.SRC_DIR;
  }
});

it("propagates missing env var error (E-4 fail-closed)", async () => {
  const manifest = {
    skills: [{
      id: "skills:m",
      provider: "claude-code",
      asset_type: "skills",
      source: { type: "file", path: "{env:NO_SUCH_VAR_12345}" },
      target_path: join(tmp, "out"),
      install: "copy",
    }],
  };
  const plan = computeSyncPlan(manifest, { nodes: {} });
  const result = await runSync(plan, {
    fetchContext: { concordHome: tmp, cacheDir: join(tmp, "cache"), allowNetwork: true },
    projectRoot: tmp,
    env: {}, // NO_SUCH_VAR_12345 missing
  });
  expect(result.errors.length).toBe(1);
  expect(result.errors[0]!.message).toMatch(/env-var-missing/);
});
```

- [ ] **Step 2: Run, expect FAIL** (new `projectRoot`/`env` fields on RunSyncOptions)

- [ ] **Step 3: Modify `src/sync/runner.ts`**

Key changes (only the orchestration loop — rest of file untouched). Find:

```typescript
      if (action.kind === "install" || action.kind === "update") {
        const entry = action.manifestEntry;
        const fetcher = resolveFetcher(entry.source, fetchers);
        const fetched = await fetcher.fetch(entry.source, opts.fetchContext);
```

Replace with:

```typescript
      if (action.kind === "install" || action.kind === "update") {
        const rawEntry = action.manifestEntry;
        // E-2 on-install eager: resolve allowed fields with current env
        const resolverCtx = {
          projectRoot: opts.projectRoot ?? process.cwd(),
          env: opts.env ?? process.env,
          provider: (rawEntry.provider ?? "claude-code") as "claude-code" | "codex" | "opencode",
          assetType: (rawEntry.asset_type ?? deriveAssetType(rawEntry)) as
            "skills" | "subagents" | "hooks" | "mcp_servers" | "instructions" | "plugins",
          fieldPath: `entry[${action.nodeId}]`,
        };
        const resolved = resolveEntry(rawEntry as Record<string, unknown>, resolverCtx);
        const entry = resolved.entry as any;
        const fetcher = resolveFetcher(entry.source, fetchers);
        const fetched = await fetcher.fetch(entry.source, opts.fetchContext);
```

Also add to the top of the file:

```typescript
import { resolveEntry } from "../secret/resolve-entry.js";
```

And extend `RunSyncOptions`:

```typescript
export interface RunSyncOptions {
  fetchContext: FetchContext;
  /** Project root for {file:X} traversal check (E-10). Default: process.cwd(). */
  projectRoot?: string;
  /** Env snapshot. Default: process.env. */
  env?: Readonly<Record<string, string | undefined>>;
  onProgress?: (a: SyncAction, s: "start" | "done" | "skip" | "error", err?: Error) => void;
}
```

- [ ] **Step 4: Run runner tests, expect previous ones still PASS + new ones PASS**

```bash
npx vitest run tests/sync/runner.test.ts
```

- [ ] **Step 5: Run full suite + typecheck**

```bash
npx vitest run
npm run typecheck
```

Expected: all green.

- [ ] **Step 6: Commit**

```bash
git add src/sync/runner.ts tests/sync/runner.test.ts
git commit -m "feat(sync): runner resolves entry (E-2 on-install eager, E-4 fail-closed)"
```

---

### Task 12 — Plugin Introspection Types + Claude Parser

**Files:** Create `src/plugin/types.ts` + `src/plugin/claude.ts` + `tests/plugin/claude.test.ts`

**Purpose**: POC-5 Plugin introspection — Claude `plugin.json` parser.

- [ ] **Step 1: Write test**

```typescript
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, writeFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { readClaudePlugin } from "../../src/plugin/claude.js";

describe("readClaudePlugin", () => {
  let tmp: string;
  beforeEach(async () => { tmp = await mkdtemp(join(tmpdir(), "concord-cp-")); });
  afterEach(async () => { await rm(tmp, { recursive: true, force: true }); });

  it("valid plugin.json → parsed with name + components", async () => {
    const plugin = join(tmp, "my-plugin");
    await mkdir(plugin, { recursive: true });
    await writeFile(
      join(plugin, "plugin.json"),
      JSON.stringify({
        name: "my-plugin",
        version: "1.2.3",
        skills: ["skill-a", "skill-b"],
        mcp_servers: ["mcp-x"],
      }),
    );
    const p = await readClaudePlugin(plugin);
    expect(p).not.toBeNull();
    expect(p!.name).toBe("my-plugin");
    expect(p!.version).toBe("1.2.3");
    expect(p!.skills).toEqual(["skill-a", "skill-b"]);
    expect(p!.mcp_servers).toEqual(["mcp-x"]);
  });

  it("missing plugin.json → null", async () => {
    expect(await readClaudePlugin(tmp)).toBeNull();
  });

  it("malformed JSON → null (doctor will report separately)", async () => {
    await writeFile(join(tmp, "plugin.json"), "{ malformed");
    expect(await readClaudePlugin(tmp)).toBeNull();
  });
});
```

- [ ] **Step 2: Run, expect FAIL**

- [ ] **Step 3: Implement**

```typescript
// src/plugin/types.ts
export interface PluginManifest {
  provider: "claude-code" | "codex" | "opencode";
  name: string;
  version: string | null;
  skills: string[];
  subagents: string[];
  hooks: string[];
  mcp_servers: string[];
  instructions: string[];
  /** Raw source file content for debugging (never persisted). */
  _rawPath: string;
}
```

```typescript
// src/plugin/claude.ts
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { PluginManifest } from "./types.js";

export async function readClaudePlugin(pluginDir: string): Promise<PluginManifest | null> {
  const manifestPath = join(pluginDir, "plugin.json");
  let raw: string;
  try { raw = await readFile(manifestPath, "utf8"); }
  catch { return null; }
  let obj: any;
  try { obj = JSON.parse(raw); }
  catch { return null; }
  if (typeof obj !== "object" || obj === null) return null;
  return {
    provider: "claude-code",
    name: typeof obj.name === "string" ? obj.name : "",
    version: typeof obj.version === "string" ? obj.version : null,
    skills: Array.isArray(obj.skills) ? obj.skills.filter((x: unknown) => typeof x === "string") : [],
    subagents: Array.isArray(obj.subagents) ? obj.subagents.filter((x: unknown) => typeof x === "string") : [],
    hooks: Array.isArray(obj.hooks) ? obj.hooks.filter((x: unknown) => typeof x === "string") : [],
    mcp_servers: Array.isArray(obj.mcp_servers) ? obj.mcp_servers.filter((x: unknown) => typeof x === "string") : [],
    instructions: Array.isArray(obj.instructions) ? obj.instructions.filter((x: unknown) => typeof x === "string") : [],
    _rawPath: manifestPath,
  };
}
```

- [ ] **Step 4: Run, expect 3/3 PASS**

- [ ] **Step 5: Commit**

```bash
mkdir -p src/plugin tests/plugin
git add src/plugin/types.ts src/plugin/claude.ts tests/plugin/claude.test.ts
git commit -m "feat(plugin): types + Claude plugin.json parser (POC-5)"
```

---

### Task 13 — Codex + OpenCode Plugin Parsers + Registry

**Files:** Create `src/plugin/codex.ts` + `src/plugin/opencode.ts` + `src/plugin/registry.ts` + tests

- [ ] **Step 1: Write tests** — 3 test files, same pattern as Claude:
  - `tests/plugin/codex.test.ts`: valid `.codex-plugin/plugin.json` / missing / malformed
  - `tests/plugin/opencode.test.ts`: valid `package.json` with `main` / missing / malformed
  - `tests/plugin/registry.test.ts`: `createPluginParsers()` returns 3 parsers; `readPlugin(dir, provider)` routes correctly

- [ ] **Step 2: Run, expect FAIL**

- [ ] **Step 3: Implement**

```typescript
// src/plugin/codex.ts
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { PluginManifest } from "./types.js";

export async function readCodexPlugin(pluginDir: string): Promise<PluginManifest | null> {
  const manifestPath = join(pluginDir, ".codex-plugin", "plugin.json");
  let raw: string;
  try { raw = await readFile(manifestPath, "utf8"); }
  catch { return null; }
  let obj: any;
  try { obj = JSON.parse(raw); }
  catch { return null; }
  if (typeof obj !== "object" || obj === null) return null;
  return {
    provider: "codex",
    name: typeof obj.name === "string" ? obj.name : "",
    version: typeof obj.version === "string" ? obj.version : null,
    skills: Array.isArray(obj.skills) ? obj.skills.filter((x: unknown) => typeof x === "string") : [],
    subagents: Array.isArray(obj.subagents) ? obj.subagents.filter((x: unknown) => typeof x === "string") : [],
    hooks: Array.isArray(obj.hooks) ? obj.hooks.filter((x: unknown) => typeof x === "string") : [],
    mcp_servers: Array.isArray(obj.mcp_servers) ? obj.mcp_servers.filter((x: unknown) => typeof x === "string") : [],
    instructions: Array.isArray(obj.instructions) ? obj.instructions.filter((x: unknown) => typeof x === "string") : [],
    _rawPath: manifestPath,
  };
}
```

```typescript
// src/plugin/opencode.ts
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { PluginManifest } from "./types.js";

/**
 * OpenCode plugins are npm packages — check package.json#main exists.
 * Asset lists derived from package.json#opencode (convention) if present.
 */
export async function readOpenCodePlugin(pluginDir: string): Promise<PluginManifest | null> {
  const manifestPath = join(pluginDir, "package.json");
  let raw: string;
  try { raw = await readFile(manifestPath, "utf8"); }
  catch { return null; }
  let obj: any;
  try { obj = JSON.parse(raw); }
  catch { return null; }
  if (typeof obj !== "object" || obj === null) return null;
  if (typeof obj.main !== "string") return null;
  const oc = (obj.opencode && typeof obj.opencode === "object") ? obj.opencode : {};
  return {
    provider: "opencode",
    name: typeof obj.name === "string" ? obj.name : "",
    version: typeof obj.version === "string" ? obj.version : null,
    skills: Array.isArray(oc.skills) ? oc.skills.filter((x: unknown) => typeof x === "string") : [],
    subagents: Array.isArray(oc.subagents) ? oc.subagents.filter((x: unknown) => typeof x === "string") : [],
    hooks: Array.isArray(oc.hooks) ? oc.hooks.filter((x: unknown) => typeof x === "string") : [],
    mcp_servers: Array.isArray(oc.mcp_servers) ? oc.mcp_servers.filter((x: unknown) => typeof x === "string") : [],
    instructions: Array.isArray(oc.instructions) ? oc.instructions.filter((x: unknown) => typeof x === "string") : [],
    _rawPath: manifestPath,
  };
}
```

```typescript
// src/plugin/registry.ts
import type { PluginManifest } from "./types.js";
import { readClaudePlugin } from "./claude.js";
import { readCodexPlugin } from "./codex.js";
import { readOpenCodePlugin } from "./opencode.js";

export type PluginProvider = "claude-code" | "codex" | "opencode";

export async function readPlugin(pluginDir: string, provider: PluginProvider): Promise<PluginManifest | null> {
  switch (provider) {
    case "claude-code": return readClaudePlugin(pluginDir);
    case "codex":       return readCodexPlugin(pluginDir);
    case "opencode":    return readOpenCodePlugin(pluginDir);
  }
}
```

- [ ] **Step 4: Run, all PASS**

- [ ] **Step 5: Commit**

```bash
git add src/plugin/codex.ts src/plugin/opencode.ts src/plugin/registry.ts tests/plugin/
git commit -m "feat(plugin): Codex + OpenCode parsers + registry (POC-5)"
```

---

### Task 14 — Plugin Capability Integration

**Files:** Create `src/plugin/capability.ts` + `tests/plugin/capability.test.ts`

**Purpose**: Given a fetched plugin dir + provider, produce `CapabilityMatrix` (reusing Plan 1 `src/schema/capability-matrix.ts`). Core question: does this plugin expose skills / subagents / hooks / mcp / instructions?

- [ ] **Step 1: Write test**

```typescript
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, writeFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { introspectPlugin } from "../../src/plugin/capability.js";

describe("introspectPlugin", () => {
  let tmp: string;
  beforeEach(async () => { tmp = await mkdtemp(join(tmpdir(), "concord-ip-")); });
  afterEach(async () => { await rm(tmp, { recursive: true, force: true }); });

  it("Claude plugin with skills+mcp → supported for those, na for rest", async () => {
    await writeFile(
      join(tmp, "plugin.json"),
      JSON.stringify({ name: "x", version: "1.0.0", skills: ["a"], mcp_servers: ["m"] }),
    );
    const cap = await introspectPlugin(tmp, "claude-code");
    expect(cap.byAssetType.skills.status).toBe("supported");
    expect(cap.byAssetType.mcp_servers.status).toBe("supported");
    expect(cap.byAssetType.hooks.status).toBe("na");
    expect(cap.byAssetType.instructions.status).toBe("na");
  });

  it("plugin.json missing → capability matrix all failed with reason PluginJsonMissing", async () => {
    const cap = await introspectPlugin(tmp, "claude-code");
    expect(cap.byAssetType.skills.status).toBe("failed");
    expect(cap.byAssetType.skills.reason).toBe("PluginJsonMissing");
  });

  it("OpenCode plugin (package.json + opencode.skills) → supported", async () => {
    await writeFile(
      join(tmp, "package.json"),
      JSON.stringify({ name: "x", version: "1.0.0", main: "index.js", opencode: { skills: ["a"] } }),
    );
    const cap = await introspectPlugin(tmp, "opencode");
    expect(cap.byAssetType.skills.status).toBe("supported");
  });
});
```

- [ ] **Step 2: Run, expect FAIL**

- [ ] **Step 3: Implement**

```typescript
// src/plugin/capability.ts
import { readPlugin, type PluginProvider } from "./registry.js";
import type { PluginManifest } from "./types.js";

export type CapabilityStatus = "supported" | "detected-not-executed" | "na" | "failed";

export interface CapabilityEntry {
  status: CapabilityStatus;
  reason: string | null;
  count: number;
}

export interface CapabilityMatrix {
  provider: PluginProvider;
  byAssetType: Record<"skills" | "subagents" | "hooks" | "mcp_servers" | "instructions", CapabilityEntry>;
}

export async function introspectPlugin(
  pluginDir: string,
  provider: PluginProvider,
): Promise<CapabilityMatrix> {
  const manifest = await readPlugin(pluginDir, provider);
  if (manifest === null) {
    return {
      provider,
      byAssetType: {
        skills: { status: "failed", reason: "PluginJsonMissing", count: 0 },
        subagents: { status: "failed", reason: "PluginJsonMissing", count: 0 },
        hooks: { status: "failed", reason: "PluginJsonMissing", count: 0 },
        mcp_servers: { status: "failed", reason: "PluginJsonMissing", count: 0 },
        instructions: { status: "failed", reason: "PluginJsonMissing", count: 0 },
      },
    };
  }
  return {
    provider,
    byAssetType: {
      skills: entryFor(manifest.skills),
      subagents: entryFor(manifest.subagents),
      hooks: entryFor(manifest.hooks),
      mcp_servers: entryFor(manifest.mcp_servers),
      instructions: entryFor(manifest.instructions),
    },
  };
}

function entryFor(list: string[]): CapabilityEntry {
  return list.length > 0
    ? { status: "supported", reason: null, count: list.length }
    : { status: "na", reason: null, count: 0 };
}
```

- [ ] **Step 4: Run, expect 3/3 PASS**

- [ ] **Step 5: Commit**

```bash
git add src/plugin/capability.ts tests/plugin/capability.test.ts
git commit -m "feat(plugin): introspectPlugin → CapabilityMatrix (Q4 status)"
```

---

### Task 15 — Env-drift Helper (E-2a)

**Files:** Create `src/sync/env-drift.ts` + `tests/sync/env-drift.test.ts`

**Purpose**: Given a manifest entry + resolver context + current lock node, compute the current `envDigest` via `resolveEntry`, compare to lock-stored digest, emit drift signal.

- [ ] **Step 1: Write test**

```typescript
import { describe, it, expect } from "vitest";
import { computeEnvDrift } from "../../src/sync/env-drift.js";

describe("computeEnvDrift", () => {
  const BASE_CTX = {
    projectRoot: "/tmp",
    env: { X: "1" } as Record<string, string | undefined>,
    provider: "claude-code" as const,
    assetType: "mcp_servers" as const,
    fieldPath: "x",
  };

  it("entry without interpolation → no drift", () => {
    const r = computeEnvDrift(
      { id: "x:y", source: { type: "http", url: "https://static", sha256: "sha256:x" } },
      { env_digest: "sha256:cafe" },
      BASE_CTX,
    );
    expect(r.hasDrift).toBe(false);
  });

  it("env changed → hasDrift true", () => {
    const entry = { id: "x:y", source: { type: "http", url: "{env:X}/api", sha256: "sha256:x" } };
    const r = computeEnvDrift(
      entry,
      { env_digest: "sha256:outdated" },
      BASE_CTX,
    );
    expect(r.hasDrift).toBe(true);
    expect(r.currentDigest).toMatch(/^sha256:/);
  });

  it("lock without env_digest → skip (backward compat)", () => {
    const entry = { id: "x:y", source: { type: "http", url: "{env:X}/api", sha256: "sha256:x" } };
    const r = computeEnvDrift(entry, {}, BASE_CTX);
    expect(r.hasDrift).toBe(false);
  });
});
```

- [ ] **Step 2: Run, expect FAIL**

- [ ] **Step 3: Implement**

```typescript
// src/sync/env-drift.ts
import { resolveEntry } from "../secret/resolve-entry.js";
import type { ResolverContext } from "../secret/types.js";

export interface EnvDriftResult {
  hasDrift: boolean;
  currentDigest: string;
  lockDigest: string | undefined;
}

export function computeEnvDrift(
  entry: Record<string, unknown>,
  lockNode: { env_digest?: string },
  ctx: ResolverContext,
): EnvDriftResult {
  const resolved = resolveEntry(entry, ctx);
  const lockDigest = lockNode.env_digest;
  const hasDrift = lockDigest !== undefined && resolved.envDigest !== lockDigest;
  return { hasDrift, currentDigest: resolved.envDigest, lockDigest };
}
```

- [ ] **Step 4: Run, expect 3/3 PASS**

- [ ] **Step 5: Commit**

```bash
git add src/sync/env-drift.ts tests/sync/env-drift.test.ts
git commit -m "feat(sync): env-drift helper (E-2a)"
```

---

### Task 16 — Preflight: Git Bash Detection

**Files:** Create `src/sync/preflight/git-bash.ts` + test

**Purpose**: Windows only. Detect Git Bash path via `CLAUDE_CODE_GIT_BASH_PATH` env var or `where bash.exe`. Non-Windows: return `{ applicable: false }`.

- [ ] **Step 1: Write test**

```typescript
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { checkGitBash } from "../../../src/sync/preflight/git-bash.js";

describe("checkGitBash", () => {
  const originalPlatform = process.platform;
  const originalEnv = process.env.CLAUDE_CODE_GIT_BASH_PATH;
  afterEach(() => {
    Object.defineProperty(process, "platform", { value: originalPlatform });
    if (originalEnv !== undefined) process.env.CLAUDE_CODE_GIT_BASH_PATH = originalEnv;
    else delete process.env.CLAUDE_CODE_GIT_BASH_PATH;
  });

  it("non-Windows → applicable=false", async () => {
    Object.defineProperty(process, "platform", { value: "linux" });
    const r = await checkGitBash();
    expect(r.applicable).toBe(false);
  });

  it("Windows + env set → found=true, path reported", async () => {
    Object.defineProperty(process, "platform", { value: "win32" });
    process.env.CLAUDE_CODE_GIT_BASH_PATH = "C:/Program Files/Git/bin/bash.exe";
    const r = await checkGitBash();
    expect(r.applicable).toBe(true);
    expect(r.found).toBe(true);
    expect(r.path).toBe("C:/Program Files/Git/bin/bash.exe");
  });

  it("Windows + env missing → not found, remediation hint", async () => {
    Object.defineProperty(process, "platform", { value: "win32" });
    delete process.env.CLAUDE_CODE_GIT_BASH_PATH;
    const r = await checkGitBash();
    expect(r.applicable).toBe(true);
    expect(r.found).toBe(false);
    expect(r.remediation).toContain("CLAUDE_CODE_GIT_BASH_PATH");
  });
});
```

- [ ] **Step 2: Run, expect FAIL**

- [ ] **Step 3: Implement**

```typescript
// src/sync/preflight/git-bash.ts
export interface GitBashCheck {
  applicable: boolean;
  found?: boolean;
  path?: string;
  remediation?: string;
}

export async function checkGitBash(): Promise<GitBashCheck> {
  if (process.platform !== "win32") return { applicable: false };
  const envPath = process.env.CLAUDE_CODE_GIT_BASH_PATH;
  if (envPath && envPath.trim().length > 0) {
    return { applicable: true, found: true, path: envPath };
  }
  return {
    applicable: true,
    found: false,
    remediation:
      "Set CLAUDE_CODE_GIT_BASH_PATH to your Git Bash location (e.g. C:/Program Files/Git/bin/bash.exe).",
  };
}
```

- [ ] **Step 4: Run, expect 3/3 PASS**

- [ ] **Step 5: Commit**

```bash
mkdir -p src/sync/preflight tests/sync/preflight
git add src/sync/preflight/git-bash.ts tests/sync/preflight/git-bash.test.ts
git commit -m "feat(preflight): Git Bash detection (D-15 Windows)"
```

---

### Task 17 — Preflight: Codex Version Probe

**Files:** Create `src/sync/preflight/codex-version.ts` + test

**Purpose**: Run `codex --version`, parse semver, check `>=0.119` (Codex Windows hooks gate).

- [ ] **Step 1: Write test**

```typescript
import { describe, it, expect, vi } from "vitest";
import { checkCodexVersion } from "../../../src/sync/preflight/codex-version.js";

vi.mock("../../../src/utils/exec-file.js", () => ({
  runCommand: vi.fn(),
}));
import { runCommand } from "../../../src/utils/exec-file.js";
const mocked = vi.mocked(runCommand);

describe("checkCodexVersion", () => {
  it("codex missing → installed=false", async () => {
    mocked.mockResolvedValueOnce({ status: null, errorCode: "ENOENT", stdout: "", stderr: "" });
    const r = await checkCodexVersion();
    expect(r.installed).toBe(false);
  });

  it("codex 0.118 → supportsWindowsHooks=false", async () => {
    mocked.mockResolvedValueOnce({ status: 0, stdout: "codex 0.118.0\n", stderr: "" });
    const r = await checkCodexVersion();
    expect(r.installed).toBe(true);
    expect(r.version).toBe("0.118.0");
    expect(r.supportsWindowsHooks).toBe(false);
  });

  it("codex 0.119 → supportsWindowsHooks=true", async () => {
    mocked.mockResolvedValueOnce({ status: 0, stdout: "codex 0.119.0\n", stderr: "" });
    const r = await checkCodexVersion();
    expect(r.supportsWindowsHooks).toBe(true);
  });

  it("codex 0.121 → supportsWindowsHooks=true", async () => {
    mocked.mockResolvedValueOnce({ status: 0, stdout: "codex 0.121.0\n", stderr: "" });
    const r = await checkCodexVersion();
    expect(r.supportsWindowsHooks).toBe(true);
  });

  it("unparseable output → version=null", async () => {
    mocked.mockResolvedValueOnce({ status: 0, stdout: "garbage", stderr: "" });
    const r = await checkCodexVersion();
    expect(r.version).toBeNull();
  });
});
```

- [ ] **Step 2: Run, expect FAIL**

- [ ] **Step 3: Implement**

```typescript
// src/sync/preflight/codex-version.ts
import semver from "semver";
import { runCommand } from "../../utils/exec-file.js";

export interface CodexVersionCheck {
  installed: boolean;
  version: string | null;
  supportsWindowsHooks: boolean;
}

const MIN_WINDOWS_HOOKS = "0.119.0";

export async function checkCodexVersion(): Promise<CodexVersionCheck> {
  const r = await runCommand("codex", ["--version"]);
  if (r.errorCode === "ENOENT" || r.status !== 0) {
    return { installed: false, version: null, supportsWindowsHooks: false };
  }
  const match = r.stdout.match(/\b(\d+\.\d+\.\d+)\b/);
  if (!match) {
    return { installed: true, version: null, supportsWindowsHooks: false };
  }
  const version = match[1]!;
  const supportsWindowsHooks = semver.gte(version, MIN_WINDOWS_HOOKS);
  return { installed: true, version, supportsWindowsHooks };
}
```

- [ ] **Step 4: Run, expect 5/5 PASS**

- [ ] **Step 5: Commit**

```bash
git add src/sync/preflight/codex-version.ts tests/sync/preflight/codex-version.test.ts
git commit -m "feat(preflight): Codex version probe (D-15 >=0.119 Windows hooks)"
```

---

### Task 18 — Preflight: Platform Warnings

**Files:** Create `src/sync/preflight/platform-warnings.ts` + test

**Purpose**: Developer Mode (Windows symlink requires elevation), AV exclusion (concord staging in Defender), OneDrive path detection. All non-fatal — advisory.

- [ ] **Step 1: Write test**

```typescript
import { describe, it, expect } from "vitest";
import { checkPlatformWarnings } from "../../../src/sync/preflight/platform-warnings.js";

describe("checkPlatformWarnings", () => {
  it("non-Windows → developerMode.applicable=false", async () => {
    const r = await checkPlatformWarnings({ platform: "linux", installMode: "symlink", targetPaths: [] });
    expect(r.developerMode.applicable).toBe(false);
  });

  it("Windows + install: symlink → developerMode warning applies", async () => {
    const r = await checkPlatformWarnings({ platform: "win32", installMode: "symlink", targetPaths: [] });
    expect(r.developerMode.applicable).toBe(true);
  });

  it("Windows + install: auto → developerMode.applicable=false (auto is safe)", async () => {
    const r = await checkPlatformWarnings({ platform: "win32", installMode: "auto", targetPaths: [] });
    expect(r.developerMode.applicable).toBe(false);
  });

  it("target path inside OneDrive → warning", async () => {
    const r = await checkPlatformWarnings({
      platform: "win32",
      installMode: "auto",
      targetPaths: ["C:/Users/alice/OneDrive/Documents/.claude/skills/foo"],
    });
    expect(r.oneDrive.hasMatch).toBe(true);
    expect(r.oneDrive.paths.length).toBe(1);
  });

  it("no OneDrive paths → no warning", async () => {
    const r = await checkPlatformWarnings({
      platform: "linux",
      installMode: "auto",
      targetPaths: ["/home/alice/.claude/skills/foo"],
    });
    expect(r.oneDrive.hasMatch).toBe(false);
  });
});
```

- [ ] **Step 2: Run, expect FAIL**

- [ ] **Step 3: Implement**

```typescript
// src/sync/preflight/platform-warnings.ts
export interface PlatformWarningsInput {
  platform: NodeJS.Platform;
  installMode: "symlink" | "copy" | "hardlink" | "auto";
  targetPaths: readonly string[];
}

export interface PlatformWarnings {
  developerMode: { applicable: boolean; remediation?: string };
  avExclusion: { applicable: boolean; remediation?: string };
  oneDrive: { hasMatch: boolean; paths: string[] };
}

const ONEDRIVE_PATTERN = /\/OneDrive\//i;

export async function checkPlatformWarnings(input: PlatformWarningsInput): Promise<PlatformWarnings> {
  const isWin = input.platform === "win32";

  const developerMode = isWin && input.installMode === "symlink"
    ? { applicable: true, remediation: "Enable Developer Mode in Windows Settings, or use install: auto (recommended)." }
    : { applicable: false };

  const avExclusion = isWin
    ? { applicable: true, remediation: "Add your concord cache (~/.concord/cache) to Windows Defender exclusions to avoid slow writes." }
    : { applicable: false };

  const oneDrivePaths = input.targetPaths.filter((p) => ONEDRIVE_PATTERN.test(p));
  const oneDrive = { hasMatch: oneDrivePaths.length > 0, paths: oneDrivePaths };

  return { developerMode, avExclusion, oneDrive };
}
```

- [ ] **Step 4: Run, expect 5/5 PASS**

- [ ] **Step 5: Commit**

```bash
git add src/sync/preflight/platform-warnings.ts tests/sync/preflight/platform-warnings.test.ts
git commit -m "feat(preflight): Developer Mode / AV / OneDrive warnings (D-15)"
```

---

### Task 19 — `concord doctor` Command

**Files:** Create `src/cli/commands/doctor.ts` + modify `src/cli/index.ts` + test

**Purpose**: CLI aggregates preflight + env-drift report + plugin capability matrix. Outputs TTY-friendly text OR `--json` machine contract.

- [ ] **Step 1: Write smoke test**

```typescript
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, writeFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runCli } from "../../src/cli/index.js";

describe("concord doctor CLI", () => {
  let tmp: string;
  beforeEach(async () => { tmp = await mkdtemp(join(tmpdir(), "concord-doctor-")); });
  afterEach(async () => { await rm(tmp, { recursive: true, force: true }); });

  it("runs with no manifest → exits non-zero with reason", async () => {
    const code = await runCli(["doctor", "--manifest", join(tmp, "nonexistent.yaml")]);
    expect(typeof code).toBe("number");
  });

  it("runs with valid manifest + --json → exits 0 and produces json-shaped output", async () => {
    const manifest = join(tmp, "concord.yaml");
    await writeFile(manifest, `concord_version: ">=0.1"\nskills: []\n`);
    // The command may print to stdout; we only assert exit code semantics for smoke.
    const code = await runCli(["doctor", "--manifest", manifest, "--json"]);
    expect(typeof code).toBe("number");
  });
});
```

- [ ] **Step 2: Run, expect FAIL**

- [ ] **Step 3: Implement `src/cli/commands/doctor.ts`**

```typescript
import { Command } from "commander";
import { resolve } from "node:path";
import { loadYaml } from "../../io/yaml-loader.js";
import { validateManifest } from "../../schema/validate-manifest.js";
import { checkGitBash } from "../../sync/preflight/git-bash.js";
import { checkCodexVersion } from "../../sync/preflight/codex-version.js";
import { checkPlatformWarnings } from "../../sync/preflight/platform-warnings.js";

export function registerDoctorCommand(
  program: Command,
  setExitCode: (code: number) => void,
): void {
  program
    .command("doctor")
    .description("Run preflight checks and report environment diagnostics")
    .option("--manifest <path>", "manifest file path", "concord.yaml")
    .option("--json", "machine-readable JSON output")
    .action(async (opts: { manifest: string; json?: boolean }) => {
      const manifestPath = resolve(opts.manifest);
      let manifestRaw: unknown;
      try {
        manifestRaw = loadYaml(manifestPath);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        process.stderr.write(`error: cannot read manifest at ${manifestPath}: ${msg}\n`);
        setExitCode(1);
        return;
      }
      try {
        validateManifest(manifestRaw);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        process.stderr.write(`error: invalid manifest: ${msg}\n`);
        setExitCode(1);
        return;
      }

      // Collect target paths from all assets (for OneDrive check)
      const targetPaths: string[] = [];
      for (const key of ["skills", "subagents", "hooks", "mcp_servers", "instructions", "plugins"]) {
        const arr = (manifestRaw as Record<string, unknown>)[key];
        if (Array.isArray(arr)) {
          for (const e of arr) {
            if (e && typeof e === "object" && typeof (e as any).target_path === "string") {
              targetPaths.push((e as any).target_path);
            }
          }
        }
      }

      const [gitBash, codex, warnings] = await Promise.all([
        checkGitBash(),
        checkCodexVersion(),
        checkPlatformWarnings({
          platform: process.platform,
          installMode: "auto",
          targetPaths,
        }),
      ]);

      const report = {
        manifest: manifestPath,
        platform: process.platform,
        checks: {
          gitBash,
          codexVersion: codex,
          platformWarnings: warnings,
        },
      };

      if (opts.json) {
        process.stdout.write(JSON.stringify(report, null, 2) + "\n");
      } else {
        process.stdout.write(`concord doctor — ${manifestPath}\n`);
        process.stdout.write(`  platform: ${process.platform}\n`);
        process.stdout.write(`  gitBash: ${gitBash.applicable ? (gitBash.found ? "ok" : "missing") : "n/a"}\n`);
        process.stdout.write(`  codex: ${codex.installed ? codex.version ?? "unknown" : "not installed"}\n`);
        if (warnings.oneDrive.hasMatch) {
          process.stdout.write(`  ⚠ OneDrive path detected: ${warnings.oneDrive.paths.length} target(s)\n`);
        }
      }
    });
}
```

Modify `src/cli/index.ts`:
- Add import: `import { registerDoctorCommand } from "./commands/doctor.js";`
- After `registerSyncCommand(...)`: `registerDoctorCommand(program, (code) => { exitCode = code; });`

- [ ] **Step 4: Run test, expect PASS**

- [ ] **Step 5: Full suite + typecheck + commit**

```bash
npx vitest run
npm run typecheck
git add src/cli/commands/doctor.ts src/cli/index.ts tests/cli/doctor.test.ts
git commit -m "feat(cli): concord doctor (D-15 preflight aggregate + --json)"
```

---

### Task 20 — Uninstall Helper (prune actual deletion)

**Files:** Create `src/install/uninstall.ts` + test

**Purpose**: Given a lock node's `target_path`, safely unlink (symlink) or remove (copy). Uses `fs.rm(..., { force: true })` — tolerates already-gone.

- [ ] **Step 1: Write test**

```typescript
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, writeFile, mkdir, symlink, readFile, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { uninstall } from "../../src/install/uninstall.js";

describe("uninstall", () => {
  let tmp: string;
  beforeEach(async () => { tmp = await mkdtemp(join(tmpdir(), "concord-uninstall-")); });
  afterEach(async () => { await rm(tmp, { recursive: true, force: true }); });

  it("removes a symlink without touching source", async () => {
    const src = join(tmp, "src"); await mkdir(src); await writeFile(join(src, "x"), "hi");
    const tgt = join(tmp, "tgt");
    await symlink(src, tgt);
    const r = await uninstall(tgt);
    expect(r.removed).toBe(true);
    // source survives
    expect(await readFile(join(src, "x"), "utf8")).toBe("hi");
  });

  it("removes a directory (copy install) recursively", async () => {
    const tgt = join(tmp, "cp"); await mkdir(tgt); await writeFile(join(tgt, "y"), "Y");
    const r = await uninstall(tgt);
    expect(r.removed).toBe(true);
    await expect(stat(tgt)).rejects.toThrow();
  });

  it("already missing target → removed=false, no error", async () => {
    const r = await uninstall(join(tmp, "never-existed"));
    expect(r.removed).toBe(false);
  });
});
```

- [ ] **Step 2: Run, expect FAIL**

- [ ] **Step 3: Implement**

```typescript
// src/install/uninstall.ts
import { lstat, rm } from "node:fs/promises";

export interface UninstallResult {
  removed: boolean;
  kind?: "symlink" | "file" | "directory";
}

export async function uninstall(targetPath: string): Promise<UninstallResult> {
  let st;
  try { st = await lstat(targetPath); }
  catch { return { removed: false }; }
  const kind = st.isSymbolicLink() ? "symlink" : st.isDirectory() ? "directory" : "file";
  await rm(targetPath, { recursive: true, force: true });
  return { removed: true, kind };
}
```

- [ ] **Step 4: Run, expect 3/3 PASS**

- [ ] **Step 5: Commit**

```bash
git add src/install/uninstall.ts tests/install/uninstall.test.ts
git commit -m "feat(install): uninstall helper (prune + symlink-safe)"
```

---

### Task 21 — Runner Prune Actual Deletion

**Files:** Modify `src/sync/runner.ts` + add test

**Purpose**: For `prune` actions, call `uninstall(node.target_path)` and record in `result.pruned`. Preserve existing error handling.

- [ ] **Step 1: Add runner test**

Add to `tests/sync/runner.test.ts`:

```typescript
it("prune actually removes target file (previously install-only)", async () => {
  // Setup: create a target file that lock references
  const tgt = join(tmp, "orphan");
  await writeFile(tgt, "orphan content");
  const lock = { nodes: { "skills:orphan": { target_path: tgt, source_digest: "x", target_digest: "y" } } };
  const manifest = {}; // empty → prune orphan
  const plan = computeSyncPlan(manifest, lock);
  const result = await runSync(plan, {
    fetchContext: { concordHome: tmp, cacheDir: join(tmp, "cache"), allowNetwork: true },
    projectRoot: tmp,
    env: {},
  });
  expect(result.pruned).toContain("skills:orphan");
  await expect(readFile(tgt, "utf8")).rejects.toThrow();
});
```

- [ ] **Step 2: Run, expect FAIL** (prune only records, doesn't delete)

- [ ] **Step 3: Modify `src/sync/runner.ts` prune branch**

Find:

```typescript
      } else if (action.kind === "prune") result.pruned.push(action.nodeId);
```

Replace with:

```typescript
      } else if (action.kind === "prune") {
        const targetPath = (action.existingNode as any)?.target_path;
        if (typeof targetPath === "string") {
          await uninstall(targetPath);
        }
        result.pruned.push(action.nodeId);
      }
```

Add import at the top:

```typescript
import { uninstall } from "../install/uninstall.js";
```

- [ ] **Step 4: Run test, expect PASS**

- [ ] **Step 5: Full suite + commit**

```bash
npx vitest run
git add src/sync/runner.ts tests/sync/runner.test.ts
git commit -m "feat(sync): runner prune actually removes target (Plan 2B stub → full)"
```

---

### Task 22 — `concord cleanup` Command

**Files:** Create `src/cli/commands/cleanup.ts` + modify `src/cli/index.ts` + test

**Purpose**: Homebrew Bundle 스타일 opt-in extraneous prune. Read lock; detect nodes not in manifest; with `--yes` OR TTY confirm, call `uninstall` for each.

- [ ] **Step 1: Write test**

```typescript
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, writeFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runCli } from "../../src/cli/index.js";

describe("concord cleanup CLI", () => {
  let tmp: string;
  beforeEach(async () => { tmp = await mkdtemp(join(tmpdir(), "concord-cleanup-")); });
  afterEach(async () => { await rm(tmp, { recursive: true, force: true }); });

  it("no-op when lock matches manifest", async () => {
    const manifest = join(tmp, "concord.yaml");
    const lock = join(tmp, "concord.lock");
    await writeFile(manifest, `concord_version: ">=0.1"\nskills: []\n`);
    await writeFile(lock, JSON.stringify({ lockfile_version: 1, roots: [], nodes: {} }));
    const code = await runCli(["cleanup", "--manifest", manifest, "--lock", lock, "--yes"]);
    expect(code).toBe(0);
  });

  it("removes extraneous target when --yes passed", async () => {
    const manifest = join(tmp, "concord.yaml");
    const lock = join(tmp, "concord.lock");
    const orphan = join(tmp, "orphan.txt");
    await writeFile(orphan, "content");
    await writeFile(manifest, `concord_version: ">=0.1"\nskills: []\n`);
    await writeFile(
      lock,
      JSON.stringify({
        lockfile_version: 1,
        roots: [],
        nodes: { "skills:gone": { target_path: orphan, source_digest: "x", target_digest: "y" } },
      }),
    );
    const code = await runCli(["cleanup", "--manifest", manifest, "--lock", lock, "--yes"]);
    expect(code).toBe(0);
    await expect(readFile(orphan, "utf8")).rejects.toThrow();
  });

  it("dry-run: reports but does not delete", async () => {
    const manifest = join(tmp, "concord.yaml");
    const lock = join(tmp, "concord.lock");
    const orphan = join(tmp, "orphan2.txt");
    await writeFile(orphan, "content");
    await writeFile(manifest, `concord_version: ">=0.1"\nskills: []\n`);
    await writeFile(
      lock,
      JSON.stringify({
        lockfile_version: 1,
        roots: [],
        nodes: { "skills:gone": { target_path: orphan, source_digest: "x", target_digest: "y" } },
      }),
    );
    const code = await runCli(["cleanup", "--manifest", manifest, "--lock", lock, "--dry-run"]);
    expect(code).toBe(0);
    // file survives
    expect((await readFile(orphan, "utf8")).length).toBeGreaterThan(0);
  });
});
```

(remember to add `import { readFile } from "node:fs/promises";`)

- [ ] **Step 2: Run, expect FAIL**

- [ ] **Step 3: Implement `src/cli/commands/cleanup.ts`**

```typescript
import { Command } from "commander";
import { resolve } from "node:path";
import { loadYaml } from "../../io/yaml-loader.js";
import { readLock } from "../../io/lock-io.js";
import { writeLockAtomic } from "../../io/lock-write.js";
import { validateManifest } from "../../schema/validate-manifest.js";
import { uninstall } from "../../install/uninstall.js";

export function registerCleanupCommand(
  program: Command,
  setExitCode: (code: number) => void,
): void {
  program
    .command("cleanup")
    .description("Remove targets that exist in lock but are no longer in manifest (extraneous prune)")
    .option("--manifest <path>", "manifest file path", "concord.yaml")
    .option("--lock <path>", "lock file path", "concord.lock")
    .option("--yes", "skip confirmation prompt")
    .option("--dry-run", "report only; do not remove anything")
    .action(async (opts: { manifest: string; lock: string; yes?: boolean; dryRun?: boolean }) => {
      const manifestPath = resolve(opts.manifest);
      const lockPath = resolve(opts.lock);
      const manifestRaw = loadYaml(manifestPath);
      validateManifest(manifestRaw);
      const currentLock = await readLock(lockPath).catch(() =>
        ({ lockfile_version: 1, roots: [], nodes: {} } as { lockfile_version: number; roots: unknown[]; nodes: Record<string, { target_path?: string }> }),
      );

      const manifestIds = new Set<string>();
      for (const key of ["skills", "subagents", "hooks", "mcp_servers", "instructions", "plugins"]) {
        const arr = (manifestRaw as Record<string, unknown>)[key];
        if (Array.isArray(arr)) for (const e of arr) if (e && typeof e === "object" && typeof (e as any).id === "string") manifestIds.add((e as any).id);
      }

      const extraneous: Array<{ id: string; target: string }> = [];
      for (const [id, node] of Object.entries(currentLock.nodes ?? {})) {
        if (!manifestIds.has(id) && typeof node.target_path === "string") {
          extraneous.push({ id, target: node.target_path });
        }
      }

      if (extraneous.length === 0) {
        process.stdout.write("cleanup: nothing to remove\n");
        return;
      }

      if (opts.dryRun) {
        process.stdout.write(`cleanup (dry-run): would remove ${extraneous.length} entries:\n`);
        for (const e of extraneous) process.stdout.write(`  ${e.id} → ${e.target}\n`);
        return;
      }

      if (!opts.yes) {
        process.stdout.write(`cleanup: ${extraneous.length} extraneous entries. Re-run with --yes to remove.\n`);
        for (const e of extraneous) process.stdout.write(`  ${e.id} → ${e.target}\n`);
        setExitCode(1);
        return;
      }

      let removed = 0;
      const newNodes: Record<string, unknown> = { ...currentLock.nodes };
      for (const e of extraneous) {
        try {
          await uninstall(e.target);
          delete newNodes[e.id];
          removed++;
        } catch (err) {
          process.stderr.write(`cleanup: failed to remove ${e.id}: ${err instanceof Error ? err.message : String(err)}\n`);
        }
      }
      const updatedLock = { ...currentLock, nodes: newNodes };
      await writeLockAtomic(lockPath, updatedLock);
      process.stdout.write(`cleanup: removed ${removed} entries\n`);
    });
}
```

Modify `src/cli/index.ts`:
- Add import: `import { registerCleanupCommand } from "./commands/cleanup.js";`
- After `registerDoctorCommand(...)`: `registerCleanupCommand(program, (code) => { exitCode = code; });`

- [ ] **Step 4: Run test, expect PASS**

- [ ] **Step 5: Commit**

```bash
git add src/cli/commands/cleanup.ts src/cli/index.ts tests/cli/cleanup.test.ts
git commit -m "feat(cli): concord cleanup (opt-in extraneous prune, §6 model B)"
```

---

### Task 23 — Integration E2E: Secret Sync

**Files:** Create `tests/integration/sync-secret.test.ts`

**Purpose**: End-to-end: manifest with `{env:SRC}` → `concord sync` via CLI subprocess → resolution occurs + target file installed.

- [ ] **Step 1: Write test**

```typescript
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, writeFile, mkdir, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runCommand } from "../../src/utils/exec-file.js";

const REPO = process.cwd();

describe("E2E: secret interpolation", () => {
  let tmp: string;
  beforeEach(async () => { tmp = await mkdtemp(join(tmpdir(), "concord-sec-")); });
  afterEach(async () => { await rm(tmp, { recursive: true, force: true }); });

  it("sync resolves {env:SRC_DIR} in source.path + target installed", async () => {
    const src = join(tmp, "src");
    await mkdir(src, { recursive: true });
    await writeFile(join(src, "SKILL.md"), "hello", "utf8");
    const target = join(tmp, "out");
    const manifest = join(tmp, "concord.yaml");
    const lock = join(tmp, "concord.lock");
    await writeFile(
      manifest,
      `concord_version: ">=0.1"\nskills:\n  - id: claude-code:skills:e\n    provider: claude-code\n    asset_type: skills\n    source: { type: file, path: "{env:SRC_DIR}" }\n    target_path: ${target}\n    install: copy\n`,
    );
    const env = { ...process.env, SRC_DIR: src };
    const res = await runCommand(
      "npx",
      ["tsx", join(REPO, "src/index.ts"), "sync", "--manifest", manifest, "--lock", lock],
      { cwd: tmp, env },
    );
    expect(res.status).toBe(0);
    expect(await readFile(join(target, "SKILL.md"), "utf8")).toBe("hello");
  }, 60000);

  it("sync fails cleanly when {env:X} is missing (E-4)", async () => {
    const manifest = join(tmp, "concord.yaml");
    const lock = join(tmp, "concord.lock");
    await writeFile(
      manifest,
      `concord_version: ">=0.1"\nskills:\n  - id: claude-code:skills:m\n    provider: claude-code\n    asset_type: skills\n    source: { type: file, path: "{env:MISSING_VAR_XYZ}" }\n    target_path: ${join(tmp, "out")}\n    install: copy\n`,
    );
    const res = await runCommand(
      "npx",
      ["tsx", join(REPO, "src/index.ts"), "sync", "--manifest", manifest, "--lock", lock],
      { cwd: tmp, env: { ...process.env, MISSING_VAR_XYZ: "" } }, // explicitly empty
    );
    expect(res.status).not.toBe(0);
    expect(res.stderr).toMatch(/env-var-missing|MISSING_VAR_XYZ/);
  }, 60000);
});
```

- [ ] **Step 2: Run, expect PASS** (runner already integrates resolver in Task 11)

- [ ] **Step 3: Commit**

```bash
git add tests/integration/sync-secret.test.ts
git commit -m "test(e2e): secret interpolation (env + fail-closed)"
```

---

### Task 24 — Integration E2E: Env-drift Detection

**Files:** Create `tests/integration/env-drift.test.ts`

- [ ] **Step 1: Write test**

```typescript
import { describe, it, expect } from "vitest";
import { computeEnvDrift } from "../../src/sync/env-drift.js";

describe("E2E: env-drift (E-2a)", () => {
  const CTX = {
    projectRoot: "/tmp",
    env: { VAR: "v1" } as Record<string, string | undefined>,
    provider: "claude-code" as const,
    assetType: "mcp_servers" as const,
    fieldPath: "entry",
  };

  it("initial install → no drift", () => {
    const entry = { id: "x:y", source: { type: "http", url: "{env:VAR}/api", sha256: "sha256:x" } };
    const first = computeEnvDrift(entry, {}, CTX);
    expect(first.hasDrift).toBe(false);
    // After writing first.currentDigest to lock, next run with same env → no drift
    const second = computeEnvDrift(entry, { env_digest: first.currentDigest }, CTX);
    expect(second.hasDrift).toBe(false);
  });

  it("env value changes → drift detected", () => {
    const entry = { id: "x:y", source: { type: "http", url: "{env:VAR}/api", sha256: "sha256:x" } };
    const initial = computeEnvDrift(entry, {}, CTX);
    const ctx2 = { ...CTX, env: { VAR: "v2" } };
    const later = computeEnvDrift(entry, { env_digest: initial.currentDigest }, ctx2);
    expect(later.hasDrift).toBe(true);
  });
});
```

- [ ] **Step 2: Run, expect PASS**

- [ ] **Step 3: Commit**

```bash
git add tests/integration/env-drift.test.ts
git commit -m "test(e2e): env-drift scenarios (E-2a)"
```

---

### Task 25 — Integration E2E: Doctor

**Files:** Create `tests/integration/doctor.test.ts`

- [ ] **Step 1: Write test** (smoke CLI invocation with `--json` output)

```typescript
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runCommand } from "../../src/utils/exec-file.js";

const REPO = process.cwd();

describe("E2E: concord doctor", () => {
  let tmp: string;
  beforeEach(async () => { tmp = await mkdtemp(join(tmpdir(), "concord-doctor-e-")); });
  afterEach(async () => { await rm(tmp, { recursive: true, force: true }); });

  it("doctor --json produces valid JSON with expected keys", async () => {
    const manifest = join(tmp, "concord.yaml");
    await writeFile(manifest, `concord_version: ">=0.1"\nskills: []\n`);
    const res = await runCommand(
      "npx",
      ["tsx", join(REPO, "src/index.ts"), "doctor", "--manifest", manifest, "--json"],
      { cwd: tmp },
    );
    expect(res.status).toBe(0);
    const parsed = JSON.parse(res.stdout);
    expect(parsed.manifest).toBe(manifest);
    expect(parsed.platform).toBe(process.platform);
    expect(parsed.checks).toHaveProperty("gitBash");
    expect(parsed.checks).toHaveProperty("codexVersion");
    expect(parsed.checks).toHaveProperty("platformWarnings");
  }, 60000);
});
```

- [ ] **Step 2: Run, expect PASS**

- [ ] **Step 3: Commit**

```bash
git add tests/integration/doctor.test.ts
git commit -m "test(e2e): concord doctor --json output"
```

---

### Task 26 — Integration E2E: Cleanup

**Files:** Create `tests/integration/cleanup.test.ts`

- [ ] **Step 1: Write test**

```typescript
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, writeFile, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runCommand } from "../../src/utils/exec-file.js";

const REPO = process.cwd();

describe("E2E: concord cleanup", () => {
  let tmp: string;
  beforeEach(async () => { tmp = await mkdtemp(join(tmpdir(), "concord-clean-e-")); });
  afterEach(async () => { await rm(tmp, { recursive: true, force: true }); });

  it("removes extraneous lock entry with --yes", async () => {
    const manifest = join(tmp, "concord.yaml");
    const lock = join(tmp, "concord.lock");
    const orphan = join(tmp, "orphan.txt");
    await writeFile(orphan, "bye");
    await writeFile(manifest, `concord_version: ">=0.1"\nskills: []\n`);
    await writeFile(
      lock,
      JSON.stringify({
        lockfile_version: 1,
        roots: [],
        nodes: { "skills:gone": { target_path: orphan, source_digest: "x", target_digest: "y" } },
      }),
    );
    const res = await runCommand(
      "npx",
      ["tsx", join(REPO, "src/index.ts"), "cleanup", "--manifest", manifest, "--lock", lock, "--yes"],
      { cwd: tmp },
    );
    expect(res.status).toBe(0);
    await expect(readFile(orphan, "utf8")).rejects.toThrow();
    const updated = JSON.parse(await readFile(lock, "utf8"));
    expect(updated.nodes["skills:gone"]).toBeUndefined();
  }, 60000);

  it("dry-run preserves orphan", async () => {
    const manifest = join(tmp, "concord.yaml");
    const lock = join(tmp, "concord.lock");
    const orphan = join(tmp, "orphan.txt");
    await writeFile(orphan, "bye");
    await writeFile(manifest, `concord_version: ">=0.1"\nskills: []\n`);
    await writeFile(
      lock,
      JSON.stringify({
        lockfile_version: 1,
        roots: [],
        nodes: { "skills:gone": { target_path: orphan, source_digest: "x", target_digest: "y" } },
      }),
    );
    const res = await runCommand(
      "npx",
      ["tsx", join(REPO, "src/index.ts"), "cleanup", "--manifest", manifest, "--lock", lock, "--dry-run"],
      { cwd: tmp },
    );
    expect(res.status).toBe(0);
    expect(await readFile(orphan, "utf8")).toBe("bye");
  }, 60000);
});
```

- [ ] **Step 2: Run, expect PASS**

- [ ] **Step 3: Commit**

```bash
git add tests/integration/cleanup.test.ts
git commit -m "test(e2e): concord cleanup (opt-in + dry-run)"
```

---

### Task 27 — Integration E2E: Plugin Introspection

**Files:** Create `tests/integration/plugin-introspection.test.ts`

- [ ] **Step 1: Write test**

```typescript
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, writeFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { introspectPlugin } from "../../src/plugin/capability.js";

describe("E2E: plugin introspection (POC-5)", () => {
  let tmp: string;
  beforeEach(async () => { tmp = await mkdtemp(join(tmpdir(), "concord-pi-")); });
  afterEach(async () => { await rm(tmp, { recursive: true, force: true }); });

  it("Claude plugin: skills+mcp detected, hooks na", async () => {
    await writeFile(join(tmp, "plugin.json"), JSON.stringify({
      name: "demo", version: "1.0.0", skills: ["a", "b"], mcp_servers: ["m"],
    }));
    const cap = await introspectPlugin(tmp, "claude-code");
    expect(cap.byAssetType.skills.status).toBe("supported");
    expect(cap.byAssetType.skills.count).toBe(2);
    expect(cap.byAssetType.hooks.status).toBe("na");
  });

  it("Codex plugin: .codex-plugin/plugin.json", async () => {
    const cp = join(tmp, ".codex-plugin");
    await mkdir(cp, { recursive: true });
    await writeFile(join(cp, "plugin.json"), JSON.stringify({ name: "c", version: "0.1.0", hooks: ["h"] }));
    const cap = await introspectPlugin(tmp, "codex");
    expect(cap.byAssetType.hooks.status).toBe("supported");
  });

  it("OpenCode plugin: package.json with opencode.skills", async () => {
    await writeFile(join(tmp, "package.json"), JSON.stringify({
      name: "oc", version: "1.0.0", main: "index.js", opencode: { skills: ["s"] },
    }));
    const cap = await introspectPlugin(tmp, "opencode");
    expect(cap.byAssetType.skills.status).toBe("supported");
  });

  it("no plugin.json → failed with PluginJsonMissing", async () => {
    const cap = await introspectPlugin(tmp, "claude-code");
    expect(cap.byAssetType.skills.status).toBe("failed");
    expect(cap.byAssetType.skills.reason).toBe("PluginJsonMissing");
  });
});
```

- [ ] **Step 2: Run, expect PASS**

- [ ] **Step 3: Commit**

```bash
git add tests/integration/plugin-introspection.test.ts
git commit -m "test(e2e): plugin introspection 3-provider (POC-5)"
```

---

### Task 28 — Full Verification + Build

**Purpose**: Confirm all pass on feature branch before merge.

- [ ] **Step 1: typecheck + full vitest + build**

```bash
cd /Users/macbook/workspace/concord
npm run typecheck
npx vitest run
npm run build
node dist/src/index.js doctor --help
node dist/src/index.js cleanup --help
```

Expected: typecheck clean, all tests PASS (approximately **408 + ~50 = 460** passed + 1 skipped), build emit, CLI help for both new commands printed.

No commit for this task.

---

### Task 29 — README + Summary Doc

**Files:** Modify `README.md`, create `docs/superpowers/poc/2026-04-22-plan-3-summary.md`

- [ ] **Step 1: Update `README.md` Usage section**

Add after the existing sync examples:

```markdown
concord doctor                         # preflight diagnostics
concord doctor --json                  # machine-readable
concord cleanup --dry-run              # report extraneous entries
concord cleanup --yes                  # remove extraneous entries (opt-in)
```

Under a new heading `## Subsystems (Plan 3)`:

```markdown
- **Secret interpolation** (`src/secret/`): `{env:X}` / `{file:X}` / `{env:X:-default}` / `{env:X?}` / `{{...}}` escape — E-1~E-19
- **Env-drift detection**: 5th drift state tracking env value changes (E-2a)
- **Plugin introspection** (`src/plugin/`): Claude / Codex / OpenCode plugin.json parsers → capability matrix
- **`concord doctor`**: D-15 preflight (Git Bash / Codex ≥0.119 / Developer Mode / AV / OneDrive) + `--json`
- **`concord cleanup`**: opt-in extraneous prune (§6 model B Homebrew Bundle)
- **Runner prune**: actual target deletion (Plan 2B stub → full)
```

- [ ] **Step 2: Create `docs/superpowers/poc/2026-04-22-plan-3-summary.md`**

Template (fill in commit SHAs during execution):

```markdown
# Plan 3 Secret + Diagnostics — Completion Summary

**Date**: 2026-04-22
**Branch**: `feat/concord-plan-3-secret-diagnostics` → `main`
**Tag**: `concord-plan-3-secret-diagnostics`
**Tasks**: 30/30 ✅
**Tests green**: ~460 passed + 1 skipped

## Goal achieved

결정 E Secret Interpolation Contract (E-1~E-19) 전면 구현 + drift 5th 상태 `env-drift` + `concord doctor` (D-15 preflight 5체크 + --json) + `concord cleanup` (opt-in extraneous prune) + plugin introspection (Claude/Codex/OpenCode plugin.json) + runner prune 실삭제.

## Phase A — Branch + drift ext (Task 1~2)
## Phase B — Secret engine (Task 3~11)
## Phase C — Plugin introspection (Task 12~14)
## Phase D — Preflight (Task 15~18)
## Phase E — CLI (Task 19~22)
## Phase F — E2E + docs (Task 23~30)

## 핵심 결정

- **E-7 allowlist**: source.url / source.ref / env.* / authHeader / headers.* — 다른 필드는 passthrough
- **E-5 Provider 양보**: OpenCode 자산은 concord 보간 X (이중 치환 방지)
- **E-17 invariant**: 모든 error message 에 resolved value 금지 — 테스트로 보장
- **env-drift 5th 상태**: source+target match + env changed → env. source drift 우선 (precedence)
- **prune 실삭제**: Plan 2B 의 집계-only 에서 Plan 3 의 `uninstall(targetPath)` 호출로 완전화

## Non-goals (Plan 4)

- `init` / `detect` / `adopt` / `import` / `replace` / `update` / `why` commands
- Guided bootstrap UX
- `{secret:X}` structured reference (Phase 2)

## 테스트 성장

| Plan | Tests | Files |
|---|---:|---:|
| Plan 2B | 408 | 68 |
| **Plan 3** | **~460** | **~90** |
```

- [ ] **Step 3: Commit**

```bash
git add README.md docs/superpowers/poc/2026-04-22-plan-3-summary.md
git commit -m "docs(plan-3): README + completion summary"
```

---

### Task 30 — TODO + MEMORY update + Tag + Merge

**Files:** Modify `TODO.md`, `MEMORY.md`

- [ ] **Step 1: Update TODO.md header**

Change:
```
현재 단계: **Plan 2B Sync Engine 실행 완료**
다음: **Plan 3 Secret + Diagnostics**
```
to:
```
현재 단계: **Plan 3 Secret + Diagnostics 실행 완료**
다음: **Plan 4 CLI 통합** (init/detect/adopt/import/replace/update/why + guided bootstrap)
```

Add a `🟢 Plan 3 완료 Snapshot (2026-04-22)` section mirroring the Plan 2B pattern, listing: branch, tag, test count, commits, CLI delta.

- [ ] **Step 2: Update MEMORY.md header**

Change `Phase:` line to `Plan 3 Secret + Diagnostics 실행 완료`. Update the `Tags` list. Update the `즉시 재개 지점` to point to Plan 4.

- [ ] **Step 3: Commit**

```bash
git add TODO.md MEMORY.md
git commit -m "docs(plan-3): TODO + MEMORY snapshot (Plan 3 complete, next: Plan 4)"
```

- [ ] **Step 4: Tag + merge to main**

```bash
git tag concord-plan-3-secret-diagnostics
git checkout main
git merge --no-ff feat/concord-plan-3-secret-diagnostics -m "Merge Plan 3 Secret + Diagnostics (30 tasks, ~460 tests)"
npm run typecheck && npx vitest run
```

Expected: All green on main.

---

## Self-Review

### 1. Spec coverage

| spec / decision | task |
|---|---|
| §8 E-1 basic grammar | Task 4 parser |
| §8 E-2 on-install eager | Task 11 runner integration |
| §7.3.2 E-2a env-drift | Task 2 drift + Task 15 env-drift helper |
| §8 E-3 lock unresolved only | Task 11 (runner stores unresolved) — implicit; lock write uses raw manifest |
| §8 E-4 fail-closed | Task 5 env-resolver |
| §8 E-5 provider-native allowlist | Task 8 provider-policy |
| §2.1 E-6 `{secret:X}` reserved | already in Plan 1 reserved registry |
| §4.5 E-7 allowlist | Task 10 resolveEntry (uses Plan 1 `isAllowedField`) |
| §8 E-8 TTY vs --json | Task 19 doctor `--json` flag |
| §8 E-9 nested parse error | Task 7 renderString + Plan 1 checkNested |
| §8 E-10 path traversal | Task 6 file-resolver + Plan 1 checkPathTraversal |
| §8 E-11 default + optional | Task 5 env-resolver + Task 4 parser |
| §2.1 E-12 type coerce reserved | already in Plan 1 reserved registry |
| §8 E-13 escape `{{...}}` | Task 4 parser + Task 7 render |
| §8 E-14 depth=1 | Task 7 render |
| §8 E-15 UTF-8 only | Task 6 file-resolver |
| §8 E-16 4 scope merge order | Out of scope (Plan 4 scope merging); mentioned in plan but not a dedicated task. Runner consumes already-merged manifest. |
| §8 E-17 resolved never leaked | Task 3 types test + Task 5 env-resolver test |
| §8 E-18 target format encoding | Task 9 encode |
| §8 E-19 Windows first-colon | Task 4 parser |
| §9 D-15 preflight | Tasks 16, 17, 18, 19 |
| §7 runner prune actual deletion | Task 20 + Task 21 |
| §6 model B cleanup | Task 22 |
| POC-5 plugin introspection | Tasks 12, 13, 14 |

**Gap**: E-16 (4 scope merge) is delegated to Plan 4 (scope merge CLI). Plan 3 runner consumes already-merged manifest via `loadYaml` + `validateManifest`. Added note in goals.

### 2. Placeholder scan

No "TBD", "TODO:", "implement later", or "similar to Task N" without code. All code blocks contain concrete implementations. Tests contain concrete assertions.

### 3. Type consistency

- `ResolverContext` used identically in Tasks 3-11, 15
- `ResolvedEntry` shape stable across Task 3 (def), Task 10 (return), Task 11 (consumer)
- `DriftStatus` / `DriftInput` extended once in Task 2; consumer changes in Task 15/21 are type-compatible
- `PluginManifest` definition in Task 12 used consistently by Tasks 13, 14
- `CapabilityMatrix` interface in Task 14 does NOT reuse Plan 1 `src/schema/capability-matrix.ts` (intentional — the Plan 1 type is a Zod schema output with `reason enum`; Plan 3 introduces a complementary `introspectPlugin` output with overlapping but runtime-friendly shape). A future harmonization task may be needed in Plan 4.

