# Concord Plan 2B — Sync Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `concord sync` 가 end-to-end 동작. Plan 2A 의 round-trip 인프라 + POC 선정 library 를 기반으로 Fetcher 6종 + Config round-trip writers + Symlink/copy installer + Format transformer + Sync orchestration 을 구현해 사용자가 `concord sync` 로 실제 asset 을 디스크에 설치하고 provider-native config 파일을 round-trip 편집할 수 있는 상태까지.

**Architecture:**
- **Fetcher = URI → local bytes/path**. `Fetcher` 공통 인터페이스 + 6 adapter (`FileFetcher` / `GitFetcher` / `HttpFetcher` / `NpmFetcher` / `ExternalFetcher` / `AdoptedFetcher`). Routing 은 `source.type` discriminator.
- **Config writer = source → marker block edit → modified source**. Plan 2A 의 `ConfigFileEditor` wrapper 재사용 + `ManagedBlock` parser/emitter (spec §10.5) 추가 + `JsonKeyOwnedWriter` (pure JSON).
- **Installer = local path → target path**. `symlink-dir` 우선 + `fs-extra.copy` + `write-file-atomic` fallback. 자산 타입 + 플랫폼 → install mode cascade (D-1).
- **Format transformer = asset bytes × provider × platform → output bytes**. D-14 시나리오 (MCP `cmd /c npx` Windows wrap, Claude `skills/` copy 강제).
- **Sync orchestration** = manifest + 현재 lock → action plan → fetch → install → config round-trip → verify → atomic rollback on failure. State machine (install/update/prune/skip + drift 4 상태).

**Tech Stack** (전부 Plan 2A 에서 확정):
- Node.js >=22 / TypeScript 6 / Vitest 4 / Zod 4 / commander 14 / semver 7
- `@decimalturn/toml-patch@1.1.1` (POC-1 winner)
- `jsonc-morph@0.3.3` (POC-2 winner)
- `yaml@2.8.3` (eemeli, POC-3)
- `symlink-dir@10.0.1` + `fs-extra@11.3.4` + `write-file-atomic@7.0.1` + `is-wsl@3.1.1` (POC-9)

**Dependency inputs from Plan 2A** (src/round-trip/ 전부 재사용):
- `types.ts` / `preservation.ts` / `diff-regions.ts`
- `toml/decimalturn.ts` / `jsonc/jsonc-morph.ts` / `yaml/eemeli.ts` / `symlink/symlink-dir.ts`

**Dependency inputs from Plan 1:**
- `src/schema/{types,manifest,lock,validate-manifest,capability-matrix}.ts`
- `src/io/{yaml-loader,lock-io}.ts` (Plan 2B 에서 lock write 확장)
- `src/discovery/{concord-home,scope}.ts`
- `src/cli/{index,commands/{validate,lint,list}}.ts`

**Spec reference:** `docs/superpowers/specs/2026-04-21-concord-design.md`
- §3 Asset Type System + Source Model (β3 α)
- §6.7 `concord sync` CLI
- §7 State Machine & Drift Detection
- §9 Windows Install Contract (D-1~D-15)
- §10 Config Round-Trip 편집 정책

**Non-goals (Plan 3/4):**
- Secret 보간 (E-1~E-19) — Plan 3
- `concord doctor` / `concord cleanup` 완전체 — Plan 3
- `concord init` / `detect` / `adopt` / `import` / `replace` / `why` — Plan 4

**Merge strategy:** `feat/concord-plan-2b-sync-engine` → main.

---

## File Structure

### Created files

| 파일 | 역할 |
|---|---|
| `.github/workflows/ci.yml` | 3-platform CI matrix |
| `src/round-trip/marker.ts` | `ManagedBlock` parser + emitter (spec §10.5) |
| `src/utils/exec-file.ts` | execFile wrapper (hook 대응 + Windows shell 일관성) |
| `src/fetch/{types,file,git,http,npm,external,adopted,registry}.ts` | 6 fetcher + registry |
| `src/write/{types,jsonc,toml,json-key-owned,yaml,registry}.ts` | 4 writer + registry |
| `src/install/{types,symlink,copy,routing}.ts` | 2 installer + routing |
| `src/transform/{types,mcp-windows,registry}.ts` | MCP Windows transform |
| `src/io/lock-write.ts` | atomic lock write + .bak |
| `src/sync/{plan,state-machine,drift,runner,rollback}.ts` | sync orchestration |
| `src/cli/commands/sync.ts` | CLI sync 명령 |

### Test files

`tests/{fetch,write,install,transform,sync,cli,integration}/*.test.ts` — 각 모듈 단위 + E2E.

### Modified files

- `src/cli/index.ts` — sync command 등록
- `README.md` / `TODO.md` / `MEMORY.md` — Plan 2B 완료 Snapshot

### Why this structure

- 각 서브시스템은 독립 디렉토리 (Plan 2A round-trip/ 과 대칭)
- Registry 분리로 discriminator 추가 시 단일 지점 편집
- `src/utils/exec-file.ts` 는 프로젝트 표준 (Plan 2B 의 Git/Npm/External fetcher 에서 재사용). security hook 이 `execFile` 직접 호출을 경고하므로 wrapper 로 한 지점 집중.

---

## Tasks

### Task 1 — Windows CI Matrix

**Files:** Create `.github/workflows/ci.yml`

- [ ] **Step 1: Create feature branch**

```bash
cd /Users/macbook/workspace/concord
git checkout main
git checkout -b feat/concord-plan-2b-sync-engine
```

- [ ] **Step 2: Create `.github/workflows/ci.yml`**

```yaml
name: CI

on:
  push:
    branches: [main, 'feat/**']
  pull_request:
    branches: [main]

jobs:
  test:
    strategy:
      fail-fast: false
      matrix:
        os: [ubuntu-latest, macos-latest, windows-latest]
    runs-on: ${{ matrix.os }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'npm'
      - run: npm ci
      - run: npm run typecheck
      - run: npx vitest run
```

- [ ] **Step 3: Commit**

```bash
mkdir -p .github/workflows
git add .github/workflows/ci.yml
git commit -m "ci: 3-platform matrix (ubuntu/macos/windows) for Plan 2B"
```

---

### Task 2 — Marker Block Parser + Emitter

**Files:** Create `src/round-trip/marker.ts` + `tests/round-trip/marker.test.ts`

**Purpose**: spec §10.5 의 `>>>> concord-managed:<id> (hash:<suffix>)` marker 형식 parse/emit. JSONC (`//`) + TOML (`#`) 양쪽 지원.

- [ ] **Step 1: Write failing test**

```typescript
import { describe, it, expect } from "vitest";
import { findMarkerBlocks, emitMarkerBlock, computeHashSuffix } from "../../src/round-trip/marker.js";

describe("marker block parser", () => {
  it("JSONC marker 쌍 인식", () => {
    const source = `{
  "mcpServers": {
    // >>>> concord-managed:mcp_servers:airtable  (hash:abcd1234)
    "airtable": { "command": "npx" }
    // <<<< concord-managed:mcp_servers:airtable
  }
}`;
    const blocks = findMarkerBlocks(source, "//");
    expect(blocks).toHaveLength(1);
    expect(blocks[0].id).toBe("mcp_servers:airtable");
    expect(blocks[0].hashSuffix).toBe("abcd1234");
  });

  it("TOML marker 쌍 인식 (# 주석)", () => {
    const source = `[features]
codex_hooks = true

# >>>> concord-managed:mcp_servers:airtable  (hash:deadbeef)
[mcp_servers.airtable]
command = "npx"
# <<<< concord-managed:mcp_servers:airtable
`;
    const blocks = findMarkerBlocks(source, "#");
    expect(blocks).toHaveLength(1);
    expect(blocks[0].id).toBe("mcp_servers:airtable");
  });

  it("open 없이 close 만 → marker-broken", () => {
    expect(() => findMarkerBlocks("// <<<< concord-managed:x:y\n", "//")).toThrow(/marker-broken/);
  });

  it("중첩 marker → parse error", () => {
    const source = `// >>>> concord-managed:a:1  (hash:11111111)
// >>>> concord-managed:b:2  (hash:22222222)
// <<<< concord-managed:b:2
// <<<< concord-managed:a:1`;
    expect(() => findMarkerBlocks(source, "//")).toThrow(/nested|marker-broken/);
  });

  it("emitMarkerBlock: id + hash + content 생성", () => {
    const out = emitMarkerBlock({
      id: "mcp_servers:slack",
      hashSuffix: "cafebabe",
      commentPrefix: "//",
      content: '"slack": { "command": "node" }',
    });
    expect(out).toContain("// >>>> concord-managed:mcp_servers:slack  (hash:cafebabe)");
    expect(out).toContain("// <<<< concord-managed:mcp_servers:slack");
  });

  it("computeHashSuffix: 안정적 8자 prefix", () => {
    expect(computeHashSuffix("hello")).toMatch(/^[0-9a-f]{8}$/);
    expect(computeHashSuffix("hello")).toBe(computeHashSuffix("hello"));
  });
});
```

- [ ] **Step 2: Run test, expect FAIL**

- [ ] **Step 3: Implement `src/round-trip/marker.ts`**

```typescript
import { createHash } from "node:crypto";
import type { ManagedBlock } from "./types.js";

export function findMarkerBlocks(source: string, commentPrefix: "//" | "#"): ManagedBlock[] {
  const openRe = new RegExp(
    `${escapeReg(commentPrefix)}\\s*>>>>\\s*concord-managed:([^\\s]+)\\s*\\(hash:([0-9a-f]{8})\\)`,
    "g",
  );
  const closeRe = new RegExp(
    `${escapeReg(commentPrefix)}\\s*<<<<\\s*concord-managed:([^\\s]+)`,
    "g",
  );

  type Hit =
    | { kind: "open"; index: number; length: number; id: string; hash: string }
    | { kind: "close"; index: number; length: number; id: string };
  const hits: Hit[] = [];
  let m: RegExpExecArray | null;
  while ((m = openRe.exec(source))) {
    hits.push({ kind: "open", index: m.index, length: m[0].length, id: m[1]!, hash: m[2]! });
  }
  while ((m = closeRe.exec(source))) {
    hits.push({ kind: "close", index: m.index, length: m[0].length, id: m[1]! });
  }
  hits.sort((a, b) => a.index - b.index);

  const blocks: ManagedBlock[] = [];
  const opens: Array<{ id: string; hashSuffix: string; startOffset: number }> = [];

  for (const h of hits) {
    if (h.kind === "open") {
      if (opens.length > 0) {
        throw new Error(`marker-broken: nested marker at offset ${h.index} (id=${h.id})`);
      }
      opens.push({ id: h.id, hashSuffix: h.hash, startOffset: h.index });
    } else {
      const last = opens.pop();
      if (!last) {
        throw new Error(`marker-broken: close without open at offset ${h.index} (id=${h.id})`);
      }
      if (last.id !== h.id) {
        throw new Error(`marker-broken: close id mismatch (expected ${last.id}, got ${h.id})`);
      }
      blocks.push({
        id: last.id,
        hashSuffix: last.hashSuffix,
        startOffset: last.startOffset,
        endOffset: h.index + h.length,
      });
    }
  }
  if (opens.length > 0) {
    throw new Error(`marker-broken: open without close (id=${opens[0]!.id})`);
  }
  return blocks;
}

export function emitMarkerBlock(params: {
  id: string;
  hashSuffix: string;
  commentPrefix: "//" | "#";
  content: string;
}): string {
  const { id, hashSuffix, commentPrefix, content } = params;
  return `${commentPrefix} >>>> concord-managed:${id}  (hash:${hashSuffix})\n${content}\n${commentPrefix} <<<< concord-managed:${id}`;
}

export function computeHashSuffix(input: string): string {
  return createHash("sha256").update(input, "utf8").digest("hex").slice(0, 8);
}

function escapeReg(s: string): string {
  return s.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");
}
```

- [ ] **Step 4: Run test, expect 6/6 PASS**

- [ ] **Step 5: Commit**

```bash
git add src/round-trip/marker.ts tests/round-trip/marker.test.ts
git commit -m "feat(round-trip): ManagedBlock marker parser + emitter (spec §10.5)"
```

---

### Task 3 — execFile Utility (security hook 대응)

**Files:** Create `src/utils/exec-file.ts` + `tests/utils/exec-file.test.ts`

**Purpose**: `node:child_process` 의 `execFile` 을 promisify + 단일 래퍼. Git/Npm/External fetcher 등에서 재사용. security hook 이 권장하는 `execFileNoThrow` 역할.

- [ ] **Step 1: Write test**

```typescript
import { describe, it, expect } from "vitest";
import { runCommand } from "../../src/utils/exec-file.js";

describe("runCommand", () => {
  it("echo → stdout 반환", async () => {
    const r = await runCommand("echo", ["hello"]);
    expect(r.status).toBe(0);
    expect(r.stdout.trim()).toBe("hello");
  });

  it("false → non-zero status", async () => {
    const r = await runCommand("false", []);
    expect(r.status).not.toBe(0);
  });

  it("ENOENT → status=null + errorCode=ENOENT", async () => {
    const r = await runCommand("/nonexistent/xyz", []);
    expect(r.status).toBeNull();
    expect(r.errorCode).toBe("ENOENT");
  });
});
```

- [ ] **Step 2: Run test, expect FAIL**

- [ ] **Step 3: Implement `src/utils/exec-file.ts`**

```typescript
import * as cp from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(cp.execFile);

export interface RunResult {
  stdout: string;
  stderr: string;
  status: number | null;
  errorCode?: string;
}

export async function runCommand(
  command: string,
  args: readonly string[],
  options: { cwd?: string; env?: NodeJS.ProcessEnv } = {},
): Promise<RunResult> {
  try {
    const { stdout, stderr } = await execFileAsync(command, args, options);
    return {
      stdout: typeof stdout === "string" ? stdout : stdout.toString("utf8"),
      stderr: typeof stderr === "string" ? stderr : stderr.toString("utf8"),
      status: 0,
    };
  } catch (err: any) {
    return {
      stdout: err.stdout ?? "",
      stderr: err.stderr ?? (err.message ?? ""),
      status: typeof err.code === "number" ? err.code : null,
      errorCode: typeof err.code === "string" ? err.code : undefined,
    };
  }
}
```

- [ ] **Step 4: Run test, expect 3/3 PASS**

- [ ] **Step 5: Commit**

```bash
mkdir -p src/utils tests/utils
git add src/utils/exec-file.ts tests/utils/exec-file.test.ts
git commit -m "feat(utils): runCommand execFile wrapper (for Git/Npm/External fetchers)"
```

---

### Task 4 — Fetcher Common Interface

**Files:** Create `src/fetch/types.ts` + `tests/fetch/types.test.ts`

- [ ] **Step 1: Test + implement**

```typescript
// tests/fetch/types.test.ts
import { describe, it, expect } from "vitest";
import type { Fetcher, FetchResult } from "../../src/fetch/types.js";
import { makeFetchError } from "../../src/fetch/types.js";

describe("fetch/types", () => {
  it("makeFetchError: code + name", () => {
    const e = makeFetchError("not-found", "missing");
    expect(e.code).toBe("not-found");
    expect(e.name).toBe("FetchError");
  });
  it("Fetcher shape compiles", () => {
    const f: Fetcher = {
      supports: () => true,
      async fetch() {
        return { localPath: "", kind: "file", sourceDigest: "", fetchedAt: "" };
      },
    };
    expect(typeof f.fetch).toBe("function");
  });
});
```

```typescript
// src/fetch/types.ts
export type FetchSource =
  | { type: "file"; path: string }
  | { type: "git"; url: string; ref: string }
  | { type: "http"; url: string; sha256: string }
  | { type: "npm"; package: string; version: string }
  | { type: "external"; command: string; args: string[] }
  | { type: "adopted"; path: string }
  | { type: string; [k: string]: unknown };

export interface FetchResult {
  localPath: string;
  kind: "file" | "directory";
  sourceDigest: string;
  fetchedAt: string;
}

export interface FetchContext {
  concordHome: string;
  cacheDir: string;
  detectCache?: Record<string, unknown>;
  allowNetwork?: boolean;
}

export interface Fetcher {
  supports(source: FetchSource): boolean;
  fetch(source: FetchSource, ctx: FetchContext): Promise<FetchResult>;
}

export interface FetchError extends Error {
  code:
    | "fetch-failed"
    | "digest-mismatch"
    | "not-found"
    | "unsupported-source"
    | "network-disabled"
    | "provider-cli-missing";
  detail?: string;
}

export function makeFetchError(
  code: FetchError["code"],
  message: string,
  detail?: string,
): FetchError {
  const e = new Error(message) as FetchError;
  e.code = code;
  e.detail = detail;
  (e as Error).name = "FetchError";
  return e;
}
```

- [ ] **Step 2: Run + Commit**

```bash
git add src/fetch/types.ts tests/fetch/types.test.ts
git commit -m "feat(fetch): Fetcher common interface + FetchError"
```

---

### Task 5 — FileFetcher

**Files:** Create `src/fetch/file.ts` + `tests/fetch/file.test.ts`

- [ ] **Step 1: Write test** (local file + directory 복사 + not-found + digest)

```typescript
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, writeFile, mkdir, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createFileFetcher } from "../../src/fetch/file.js";

describe("FileFetcher", () => {
  let tmp: string;
  beforeEach(async () => { tmp = await mkdtemp(join(tmpdir(), "concord-ff-")); });
  afterEach(async () => { await rm(tmp, { recursive: true, force: true }); });

  it("supports type=file", () => {
    expect(createFileFetcher().supports({ type: "file", path: "./x" })).toBe(true);
  });

  it("fetch file → copy + digest", async () => {
    const s = join(tmp, "s.md"); await writeFile(s, "X");
    const cache = join(tmp, "cache"); await mkdir(cache, { recursive: true });
    const r = await createFileFetcher().fetch({ type: "file", path: s }, { concordHome: tmp, cacheDir: cache });
    expect(r.kind).toBe("file");
    expect(r.sourceDigest).toMatch(/^sha256:[0-9a-f]{64}$/);
    expect(await readFile(r.localPath, "utf8")).toBe("X");
  });

  it("fetch directory recursive", async () => {
    const s = join(tmp, "d"); await mkdir(join(s, "sub"), { recursive: true });
    await writeFile(join(s, "a"), "A"); await writeFile(join(s, "sub", "b"), "B");
    const cache = join(tmp, "cache"); await mkdir(cache, { recursive: true });
    const r = await createFileFetcher().fetch({ type: "file", path: s }, { concordHome: tmp, cacheDir: cache });
    expect(r.kind).toBe("directory");
    expect(await readFile(join(r.localPath, "a"), "utf8")).toBe("A");
    expect(await readFile(join(r.localPath, "sub", "b"), "utf8")).toBe("B");
  });

  it("not found → not-found error", async () => {
    await expect(
      createFileFetcher().fetch({ type: "file", path: join(tmp, "none") }, { concordHome: tmp, cacheDir: tmp }),
    ).rejects.toMatchObject({ code: "not-found" });
  });
});
```

- [ ] **Step 2: Implement `src/fetch/file.ts`**

```typescript
import { createHash } from "node:crypto";
import { readFile, stat, readdir } from "node:fs/promises";
import { copy } from "fs-extra";
import { join, basename } from "node:path";
import type { Fetcher, FetchResult } from "./types.js";
import { makeFetchError } from "./types.js";

export function createFileFetcher(): Fetcher {
  return {
    supports(source) { return source.type === "file"; },
    async fetch(source, ctx): Promise<FetchResult> {
      if (source.type !== "file") throw makeFetchError("unsupported-source", `FileFetcher: ${source.type}`);
      const src = (source as any).path as string;
      let st;
      try { st = await stat(src); } catch { throw makeFetchError("not-found", `file not found: ${src}`); }
      const kind = st.isDirectory() ? "directory" : "file";
      const digest = await computeDigest(src, kind);
      const cacheName = `${basename(src)}-${digest.slice(0, 12)}`;
      const cachePath = join(ctx.cacheDir, "file", cacheName);
      try {
        await copy(src, cachePath, { overwrite: true, errorOnExist: false });
      } catch (err) {
        throw makeFetchError("fetch-failed", `file copy: ${err instanceof Error ? err.message : String(err)}`);
      }
      return { localPath: cachePath, kind, sourceDigest: `sha256:${digest}`, fetchedAt: new Date().toISOString() };
    },
  };
}

async function computeDigest(path: string, kind: "file" | "directory"): Promise<string> {
  const h = createHash("sha256");
  if (kind === "file") { h.update(await readFile(path)); return h.digest("hex"); }
  async function walk(dir: string, rel: string) {
    const entries = await readdir(dir, { withFileTypes: true });
    entries.sort((a, b) => a.name.localeCompare(b.name));
    for (const e of entries) {
      const full = join(dir, e.name); const r = join(rel, e.name);
      if (e.isDirectory()) await walk(full, r);
      else { h.update(r, "utf8"); h.update(await readFile(full)); }
    }
  }
  await walk(path, "");
  return h.digest("hex");
}
```

- [ ] **Step 3: Commit**

```bash
git add src/fetch/file.ts tests/fetch/file.test.ts
git commit -m "feat(fetch): FileFetcher (local file/dir + digest)"
```

---

### Task 6 — GitFetcher

**Files:** Create `src/fetch/git.ts` + `tests/fetch/git.test.ts`

**Purpose**: `runCommand("git", ["clone"...])` + ref checkout + commit SHA digest. Local bare repo 로 test.

- [ ] **Step 1: Write test (local bare repo 준비)**

```typescript
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, mkdir, writeFile, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runCommand } from "../../src/utils/exec-file.js";
import { createGitFetcher } from "../../src/fetch/git.js";

describe("GitFetcher", () => {
  let tmp: string, bare: string, sha: string;
  beforeEach(async () => {
    tmp = await mkdtemp(join(tmpdir(), "concord-gf-"));
    const work = join(tmp, "work"); bare = join(tmp, "bare.git");
    await mkdir(work, { recursive: true });
    await runCommand("git", ["init", "-b", "main"], { cwd: work });
    await runCommand("git", ["config", "user.email", "t@x"], { cwd: work });
    await runCommand("git", ["config", "user.name", "t"], { cwd: work });
    await writeFile(join(work, "R.md"), "# R");
    await runCommand("git", ["add", "."], { cwd: work });
    await runCommand("git", ["commit", "-m", "i"], { cwd: work });
    await runCommand("git", ["clone", "--bare", work, bare]);
    sha = (await runCommand("git", ["-C", work, "rev-parse", "HEAD"])).stdout.trim();
  });
  afterEach(async () => { await rm(tmp, { recursive: true, force: true }); });

  it("supports type=git", () => {
    expect(createGitFetcher().supports({ type: "git", url: "x", ref: "main" })).toBe(true);
  });

  it("fetch: clone + ref + digest=SHA", async () => {
    const cache = join(tmp, "cache"); await mkdir(cache, { recursive: true });
    const r = await createGitFetcher().fetch(
      { type: "git", url: bare, ref: "main" },
      { concordHome: tmp, cacheDir: cache, allowNetwork: true },
    );
    expect(r.sourceDigest).toBe(`sha256:${sha}`);
    expect(await readFile(join(r.localPath, "R.md"), "utf8")).toBe("# R");
  });

  it("cache miss + allowNetwork=false → network-disabled", async () => {
    const cache = join(tmp, "cache"); await mkdir(cache, { recursive: true });
    await expect(
      createGitFetcher().fetch(
        { type: "git", url: bare, ref: "main" },
        { concordHome: tmp, cacheDir: cache, allowNetwork: false },
      ),
    ).rejects.toMatchObject({ code: "network-disabled" });
  });
});
```

- [ ] **Step 2: Implement `src/fetch/git.ts`**

```typescript
import { stat, mkdir, rm } from "node:fs/promises";
import { createHash } from "node:crypto";
import { join } from "node:path";
import { runCommand } from "../utils/exec-file.js";
import type { Fetcher, FetchResult } from "./types.js";
import { makeFetchError } from "./types.js";

export function createGitFetcher(): Fetcher {
  return {
    supports(source) { return source.type === "git"; },
    async fetch(source, ctx): Promise<FetchResult> {
      if (source.type !== "git") throw makeFetchError("unsupported-source", `GitFetcher: ${source.type}`);
      const { url, ref } = source as any;
      const cacheKey = createHash("sha256").update(`${url}@${ref}`, "utf8").digest("hex").slice(0, 16);
      const cachePath = join(ctx.cacheDir, "git", cacheKey);
      const cached = await stat(cachePath).catch(() => null);
      if (cached?.isDirectory()) {
        const r = await runCommand("git", ["-C", cachePath, "rev-parse", "HEAD"]);
        if (r.status !== 0) throw makeFetchError("fetch-failed", `rev-parse failed: ${r.stderr}`);
        return { localPath: cachePath, kind: "directory", sourceDigest: `sha256:${r.stdout.trim()}`, fetchedAt: new Date().toISOString() };
      }
      if (ctx.allowNetwork === false) throw makeFetchError("network-disabled", `git clone denied: ${url}`);
      await mkdir(join(ctx.cacheDir, "git"), { recursive: true });
      const clone = await runCommand("git", ["clone", url, cachePath]);
      if (clone.status !== 0) {
        await rm(cachePath, { recursive: true, force: true });
        throw makeFetchError("fetch-failed", `git clone: ${clone.stderr}`);
      }
      const co = await runCommand("git", ["-C", cachePath, "checkout", ref]);
      if (co.status !== 0) {
        await rm(cachePath, { recursive: true, force: true });
        throw makeFetchError("fetch-failed", `git checkout ${ref}: ${co.stderr}`);
      }
      const rev = await runCommand("git", ["-C", cachePath, "rev-parse", "HEAD"]);
      return { localPath: cachePath, kind: "directory", sourceDigest: `sha256:${rev.stdout.trim()}`, fetchedAt: new Date().toISOString() };
    },
  };
}
```

- [ ] **Step 3: Commit**

```bash
git add src/fetch/git.ts tests/fetch/git.test.ts
git commit -m "feat(fetch): GitFetcher (clone + ref + SHA digest)"
```

---

### Task 7 — HttpFetcher

**Files:** Create `src/fetch/http.ts` + `tests/fetch/http.test.ts`

**Purpose**: Node 22 global `fetch` + sha256 pin. Local HTTP server 로 test.

- [ ] **Step 1: Write test**

```typescript
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createServer, type Server } from "node:http";
import { createHash } from "node:crypto";
import { createHttpFetcher } from "../../src/fetch/http.js";

describe("HttpFetcher", () => {
  let tmp: string, server: Server, url: string;
  const body = "hi";
  const sha = `sha256:${createHash("sha256").update(body).digest("hex")}`;
  beforeEach(async () => {
    tmp = await mkdtemp(join(tmpdir(), "concord-hf-"));
    server = createServer((_, res) => { res.writeHead(200); res.end(body); });
    await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
    const addr = server.address() as { port: number };
    url = `http://127.0.0.1:${addr.port}/x`;
  });
  afterEach(async () => {
    await new Promise<void>((r) => server.close(() => r()));
    await rm(tmp, { recursive: true, force: true });
  });

  it("digest match", async () => {
    const r = await createHttpFetcher().fetch(
      { type: "http", url, sha256: sha },
      { concordHome: tmp, cacheDir: tmp, allowNetwork: true },
    );
    expect(r.sourceDigest).toBe(sha);
    expect(await readFile(r.localPath, "utf8")).toBe(body);
  });

  it("digest mismatch → error", async () => {
    await expect(
      createHttpFetcher().fetch(
        { type: "http", url, sha256: "sha256:ffff" },
        { concordHome: tmp, cacheDir: tmp, allowNetwork: true },
      ),
    ).rejects.toMatchObject({ code: "digest-mismatch" });
  });

  it("allowNetwork=false + cache miss → network-disabled", async () => {
    await expect(
      createHttpFetcher().fetch(
        { type: "http", url, sha256: sha },
        { concordHome: tmp, cacheDir: tmp, allowNetwork: false },
      ),
    ).rejects.toMatchObject({ code: "network-disabled" });
  });
});
```

- [ ] **Step 2: Implement `src/fetch/http.ts`**

```typescript
import { createHash } from "node:crypto";
import { writeFile, mkdir, stat, readFile } from "node:fs/promises";
import { join } from "node:path";
import type { Fetcher, FetchResult } from "./types.js";
import { makeFetchError } from "./types.js";

export function createHttpFetcher(): Fetcher {
  return {
    supports(source) { return source.type === "http"; },
    async fetch(source, ctx): Promise<FetchResult> {
      if (source.type !== "http") throw makeFetchError("unsupported-source", `HttpFetcher: ${source.type}`);
      const { url, sha256: expected } = source as any;
      const cacheKey = createHash("sha256").update(url, "utf8").digest("hex").slice(0, 16);
      const cachePath = join(ctx.cacheDir, "http", cacheKey);
      const cached = await stat(cachePath).catch(() => null);
      if (cached?.isFile()) {
        const data = await readFile(cachePath);
        const actual = `sha256:${createHash("sha256").update(data).digest("hex")}`;
        if (actual === expected) {
          return { localPath: cachePath, kind: "file", sourceDigest: actual, fetchedAt: new Date().toISOString() };
        }
      }
      if (ctx.allowNetwork === false) throw makeFetchError("network-disabled", `http fetch denied: ${url}`);
      let data: Buffer;
      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        data = Buffer.from(await res.arrayBuffer());
      } catch (err) {
        throw makeFetchError("fetch-failed", `http: ${err instanceof Error ? err.message : String(err)}`);
      }
      const actual = `sha256:${createHash("sha256").update(data).digest("hex")}`;
      if (actual !== expected) throw makeFetchError("digest-mismatch", `expected ${expected}, got ${actual}`);
      await mkdir(join(ctx.cacheDir, "http"), { recursive: true });
      await writeFile(cachePath, data);
      return { localPath: cachePath, kind: "file", sourceDigest: actual, fetchedAt: new Date().toISOString() };
    },
  };
}
```

- [ ] **Step 3: Commit**

```bash
git add src/fetch/http.ts tests/fetch/http.test.ts
git commit -m "feat(fetch): HttpFetcher (fetch + sha256 pin)"
```

---

### Task 8 — NpmFetcher

**Files:** Create `src/fetch/npm.ts` + `tests/fetch/npm.test.ts`

**Purpose**: `npm pack` (via runCommand) + integrity 추출. Cache 사전 생성 test 로 외부 network 의존 제거.

- [ ] **Step 1: Test + implement** (Plan 2A Task 7 포맷 — cache hit 경로 + network-disabled test)

```typescript
// tests/fetch/npm.test.ts
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createNpmFetcher } from "../../src/fetch/npm.js";

describe("NpmFetcher", () => {
  let tmp: string;
  beforeEach(async () => { tmp = await mkdtemp(join(tmpdir(), "concord-nf-")); });
  afterEach(async () => { await rm(tmp, { recursive: true, force: true }); });

  it("supports type=npm", () => {
    expect(createNpmFetcher().supports({ type: "npm", package: "x", version: "1.0.0" })).toBe(true);
  });

  it("cache hit", async () => {
    const cache = join(tmp, "cache", "npm", "x@1.0.0");
    await mkdir(cache, { recursive: true });
    await writeFile(join(cache, ".integrity"), "sha256:cached");
    const r = await createNpmFetcher().fetch(
      { type: "npm", package: "x", version: "1.0.0" },
      { concordHome: tmp, cacheDir: join(tmp, "cache"), allowNetwork: false },
    );
    expect(r.sourceDigest).toBe("sha256:cached");
  });

  it("cache miss + allowNetwork=false → network-disabled", async () => {
    await expect(
      createNpmFetcher().fetch(
        { type: "npm", package: "nonexistent-zzzz", version: "0.0.1" },
        { concordHome: tmp, cacheDir: join(tmp, "cache"), allowNetwork: false },
      ),
    ).rejects.toMatchObject({ code: "network-disabled" });
  });
});
```

```typescript
// src/fetch/npm.ts
import { mkdir, stat, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { runCommand } from "../utils/exec-file.js";
import type { Fetcher, FetchResult } from "./types.js";
import { makeFetchError } from "./types.js";

export function createNpmFetcher(): Fetcher {
  return {
    supports(source) { return source.type === "npm"; },
    async fetch(source, ctx): Promise<FetchResult> {
      if (source.type !== "npm") throw makeFetchError("unsupported-source", `NpmFetcher: ${source.type}`);
      const { package: pkg, version } = source as any;
      const cachePath = join(ctx.cacheDir, "npm", `${pkg.replace(/\//g, "_")}@${version}`);
      const cached = await stat(cachePath).catch(() => null);
      if (cached?.isDirectory()) {
        const integrity = await readFile(join(cachePath, ".integrity"), "utf8").catch(() => null);
        if (integrity) {
          return { localPath: cachePath, kind: "directory", sourceDigest: integrity.trim(), fetchedAt: new Date().toISOString() };
        }
      }
      if (ctx.allowNetwork === false) throw makeFetchError("network-disabled", `npm pack denied: ${pkg}@${version}`);
      await mkdir(cachePath, { recursive: true });
      const packRes = await runCommand("npm", ["pack", `${pkg}@${version}`, "--json"], { cwd: cachePath });
      if (packRes.status !== 0) throw makeFetchError("fetch-failed", `npm pack: ${packRes.stderr}`);
      const parsed = JSON.parse(packRes.stdout);
      const first = Array.isArray(parsed) ? parsed[0] : parsed;
      const integrity = first?.integrity ?? first?.shasum;
      if (!integrity) throw makeFetchError("fetch-failed", "npm pack: no integrity");
      const tarRes = await runCommand("tar", ["-xzf", first.filename, "--strip-components=1", "-C", cachePath], { cwd: cachePath });
      if (tarRes.status !== 0) throw makeFetchError("fetch-failed", `tar extract: ${tarRes.stderr}`);
      const digest = integrity.startsWith("sha256") ? integrity : `sha256:${integrity}`;
      await writeFile(join(cachePath, ".integrity"), digest);
      return { localPath: cachePath, kind: "directory", sourceDigest: digest, fetchedAt: new Date().toISOString() };
    },
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/fetch/npm.ts tests/fetch/npm.test.ts
git commit -m "feat(fetch): NpmFetcher (npm pack + integrity)"
```

---

### Task 9 — ExternalFetcher

**Files:** Create `src/fetch/external.ts` + `tests/fetch/external.test.ts`

- [ ] **Step 1: Test + implement**

```typescript
// tests/fetch/external.test.ts
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createExternalFetcher } from "../../src/fetch/external.js";

describe("ExternalFetcher", () => {
  let tmp: string;
  beforeEach(async () => { tmp = await mkdtemp(join(tmpdir(), "concord-ef-")); });
  afterEach(async () => { await rm(tmp, { recursive: true, force: true }); });

  it("supports type=external", () => {
    expect(createExternalFetcher().supports({ type: "external", command: "x", args: [] })).toBe(true);
  });

  it("echo → sha256 digest", async () => {
    const r = await createExternalFetcher().fetch(
      { type: "external", command: "echo", args: ["hi"] },
      { concordHome: tmp, cacheDir: tmp },
    );
    expect(r.sourceDigest).toMatch(/^sha256:/);
  });

  it("false → fetch-failed", async () => {
    await expect(
      createExternalFetcher().fetch(
        { type: "external", command: "false", args: [] },
        { concordHome: tmp, cacheDir: tmp },
      ),
    ).rejects.toMatchObject({ code: "fetch-failed" });
  });
});
```

```typescript
// src/fetch/external.ts
import { createHash } from "node:crypto";
import { writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { runCommand } from "../utils/exec-file.js";
import type { Fetcher, FetchResult } from "./types.js";
import { makeFetchError } from "./types.js";

export function createExternalFetcher(): Fetcher {
  return {
    supports(source) { return source.type === "external"; },
    async fetch(source, ctx): Promise<FetchResult> {
      if (source.type !== "external") throw makeFetchError("unsupported-source", `ExternalFetcher: ${source.type}`);
      const { command, args } = source as any;
      const res = await runCommand(command, args);
      if (res.errorCode === "ENOENT") throw makeFetchError("provider-cli-missing", `CLI missing: ${command}`);
      if (res.status !== 0) throw makeFetchError("fetch-failed", `CLI exit ${res.status}: ${res.stderr}`);
      const hex = createHash("sha256").update(res.stdout, "utf8").digest("hex");
      const cachePath = join(ctx.cacheDir, "external", hex.slice(0, 16));
      await mkdir(join(ctx.cacheDir, "external"), { recursive: true });
      await writeFile(cachePath, res.stdout);
      return { localPath: cachePath, kind: "file", sourceDigest: `sha256:${hex}`, fetchedAt: new Date().toISOString() };
    },
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/fetch/external.ts tests/fetch/external.test.ts
git commit -m "feat(fetch): ExternalFetcher (provider CLI via runCommand)"
```

---

### Task 10 — AdoptedFetcher + Registry

**Files:** Create `src/fetch/adopted.ts` + `src/fetch/registry.ts` + tests

- [ ] **Step 1: Implement `src/fetch/adopted.ts`**

```typescript
import { createHash } from "node:crypto";
import { readFile, stat, readdir } from "node:fs/promises";
import { join } from "node:path";
import type { Fetcher, FetchResult } from "./types.js";
import { makeFetchError } from "./types.js";

export function createAdoptedFetcher(): Fetcher {
  return {
    supports(source) { return source.type === "adopted"; },
    async fetch(source): Promise<FetchResult> {
      if (source.type !== "adopted") throw makeFetchError("unsupported-source", `AdoptedFetcher: ${source.type}`);
      const path = (source as any).path as string;
      let st;
      try { st = await stat(path); } catch { throw makeFetchError("not-found", `adopted: ${path}`); }
      const kind = st.isDirectory() ? "directory" : "file";
      const digest = await computeDigest(path, kind);
      return { localPath: path, kind, sourceDigest: `sha256:${digest}`, fetchedAt: new Date().toISOString() };
    },
  };
}

async function computeDigest(path: string, kind: "file" | "directory"): Promise<string> {
  const h = createHash("sha256");
  if (kind === "file") { h.update(await readFile(path)); return h.digest("hex"); }
  async function walk(dir: string, rel: string) {
    const entries = await readdir(dir, { withFileTypes: true });
    entries.sort((a, b) => a.name.localeCompare(b.name));
    for (const e of entries) {
      const full = join(dir, e.name); const r = join(rel, e.name);
      if (e.isDirectory()) await walk(full, r);
      else { h.update(r, "utf8"); h.update(await readFile(full)); }
    }
  }
  await walk(path, "");
  return h.digest("hex");
}
```

- [ ] **Step 2: Implement `src/fetch/registry.ts`**

```typescript
import type { Fetcher, FetchSource } from "./types.js";
import { createFileFetcher } from "./file.js";
import { createGitFetcher } from "./git.js";
import { createHttpFetcher } from "./http.js";
import { createNpmFetcher } from "./npm.js";
import { createExternalFetcher } from "./external.js";
import { createAdoptedFetcher } from "./adopted.js";

export function createFetcherRegistry(): Fetcher[] {
  return [
    createFileFetcher(),
    createGitFetcher(),
    createHttpFetcher(),
    createNpmFetcher(),
    createExternalFetcher(),
    createAdoptedFetcher(),
  ];
}

export function resolveFetcher(source: FetchSource, registry: Fetcher[]): Fetcher {
  const f = registry.find((x) => x.supports(source));
  if (!f) throw new Error(`no fetcher supports source.type=${source.type}`);
  return f;
}
```

- [ ] **Step 3: Tests + Commit**

```bash
git add src/fetch/adopted.ts src/fetch/registry.ts tests/fetch/adopted.test.ts tests/fetch/registry.test.ts
git commit -m "feat(fetch): AdoptedFetcher + registry (6 fetchers)"
```

---

### Task 11 — Config Writer Common Interface

**Files:** Create `src/write/types.ts` + `tests/write/types.test.ts`

```typescript
// src/write/types.ts
import type { ManagedBlock } from "../round-trip/types.js";

export type WriteOp =
  | { op: "upsertBlock"; id: string; content: string; hashSuffix: string }
  | { op: "removeBlock"; id: string }
  | { op: "upsertOwnedKey"; path: readonly (string | number)[]; value: unknown; hash: string }
  | { op: "removeOwnedKey"; path: readonly (string | number)[] };

export interface WriteRequest { source: string; ops: readonly WriteOp[]; }

export interface WriteResult {
  modified: string;
  opsApplied: number;
  blocks: ManagedBlock[];
  originalBytes: number;
  modifiedBytes: number;
}

export interface ConfigWriter {
  supports(path: string, source: string): boolean;
  write(req: WriteRequest): Promise<WriteResult>;
}
```

Test (3 shape cases) → PASS → commit `feat(write): ConfigWriter interface + WriteOp union`.

---

### Task 12 — JsoncWriter

**Files:** Create `src/write/jsonc.ts` + test

**Purpose**: marker block upsert/remove. 기존 block 교체 / 없으면 append.

- [ ] **Step 1: Write test** (supports / upsert add / upsert replace / remove — 4 cases, 동일 Plan 2A 패턴)

- [ ] **Step 2: Implement**

```typescript
// src/write/jsonc.ts
import { findMarkerBlocks, emitMarkerBlock } from "../round-trip/marker.js";
import type { ConfigWriter, WriteRequest, WriteResult, WriteOp } from "./types.js";

export function createJsoncWriter(): ConfigWriter {
  return {
    supports(path) { return /\.(json|jsonc)$/i.test(path); },
    async write(req: WriteRequest): Promise<WriteResult> {
      let cur = req.source; let applied = 0;
      for (const op of req.ops) { cur = applyOp(cur, op); applied++; }
      return {
        modified: cur,
        opsApplied: applied,
        blocks: safe(cur),
        originalBytes: Buffer.byteLength(req.source, "utf8"),
        modifiedBytes: Buffer.byteLength(cur, "utf8"),
      };
    },
  };
}

function applyOp(source: string, op: WriteOp): string {
  if (op.op === "upsertBlock") {
    const existing = safe(source).find((b) => b.id === op.id);
    const block = emitMarkerBlock({ id: op.id, hashSuffix: op.hashSuffix, commentPrefix: "//", content: op.content });
    if (existing) return source.slice(0, existing.startOffset) + block + source.slice(existing.endOffset);
    const lastBrace = source.lastIndexOf("}");
    if (lastBrace < 0) return source + "\n" + block + "\n";
    const head = source.slice(0, lastBrace); const tail = source.slice(lastBrace);
    const sep = head.endsWith("\n") ? "" : "\n";
    return head + sep + block + "\n" + tail;
  }
  if (op.op === "removeBlock") {
    const existing = safe(source).find((b) => b.id === op.id);
    if (!existing) return source;
    let s = existing.startOffset, e = existing.endOffset;
    if (source[s - 1] === "\n") s--;
    if (source[e] === "\n") e++;
    return source.slice(0, s) + source.slice(e);
  }
  return source;
}

function safe(source: string) { try { return findMarkerBlocks(source, "//"); } catch { return []; } }
```

- [ ] **Step 3: Commit**

```bash
git add src/write/jsonc.ts tests/write/jsonc.test.ts
git commit -m "feat(write): JsoncWriter (marker block upsert/remove)"
```

---

### Task 13 — TomlWriter

**Files:** Create `src/write/toml.ts` + test

동일 패턴, `commentPrefix: "#"`, append 는 파일 끝.

```typescript
// src/write/toml.ts
import { findMarkerBlocks, emitMarkerBlock } from "../round-trip/marker.js";
import type { ConfigWriter, WriteRequest, WriteResult, WriteOp } from "./types.js";

export function createTomlWriter(): ConfigWriter {
  return {
    supports(path) { return /\.toml$/i.test(path); },
    async write(req: WriteRequest): Promise<WriteResult> {
      let cur = req.source; let applied = 0;
      for (const op of req.ops) { cur = applyOp(cur, op); applied++; }
      return {
        modified: cur,
        opsApplied: applied,
        blocks: safe(cur),
        originalBytes: Buffer.byteLength(req.source, "utf8"),
        modifiedBytes: Buffer.byteLength(cur, "utf8"),
      };
    },
  };
}

function applyOp(source: string, op: WriteOp): string {
  if (op.op === "upsertBlock") {
    const existing = safe(source).find((b) => b.id === op.id);
    const block = emitMarkerBlock({ id: op.id, hashSuffix: op.hashSuffix, commentPrefix: "#", content: op.content });
    if (existing) return source.slice(0, existing.startOffset) + block + source.slice(existing.endOffset);
    const sep = source.endsWith("\n") ? "" : "\n";
    return source + sep + "\n" + block + "\n";
  }
  if (op.op === "removeBlock") {
    const existing = safe(source).find((b) => b.id === op.id);
    if (!existing) return source;
    let s = existing.startOffset, e = existing.endOffset;
    if (source[s - 1] === "\n") s--;
    if (source[s - 1] === "\n") s--;
    if (source[e] === "\n") e++;
    return source.slice(0, s) + source.slice(e);
  }
  return source;
}

function safe(source: string) { try { return findMarkerBlocks(source, "#"); } catch { return []; } }
```

Test 3 cases → Commit `feat(write): TomlWriter (# marker block)`.

---

### Task 14 — JsonKeyOwnedWriter

**Files:** Create `src/write/json-key-owned.ts` + test

**Purpose**: pure JSON (`~/.claude.json`). Marker 불가 → key-level 편집 + `JSON.stringify` (insertion order preserved Node 10+).

```typescript
// src/write/json-key-owned.ts
import type { ConfigWriter, WriteRequest, WriteResult } from "./types.js";

export function createJsonKeyOwnedWriter(): ConfigWriter {
  return {
    supports(path, source) {
      if (!/\.json$/i.test(path)) return false;
      if (/(^|[^:\\])\/\//.test(source)) return false;
      if (/\/\*/.test(source)) return false;
      return true;
    },
    async write(req: WriteRequest): Promise<WriteResult> {
      let obj: any;
      try { obj = JSON.parse(req.source); }
      catch (err) { throw new Error(`JsonKeyOwnedWriter parse: ${err instanceof Error ? err.message : String(err)}`); }
      let applied = 0;
      for (const op of req.ops) {
        if (op.op === "upsertOwnedKey") { setDeep(obj, op.path, op.value); applied++; }
        else if (op.op === "removeOwnedKey") { deleteDeep(obj, op.path); applied++; }
      }
      const modified = JSON.stringify(obj, null, 2) + "\n";
      return {
        modified, opsApplied: applied, blocks: [],
        originalBytes: Buffer.byteLength(req.source, "utf8"),
        modifiedBytes: Buffer.byteLength(modified, "utf8"),
      };
    },
  };
}

function setDeep(obj: any, path: readonly (string | number)[], value: unknown): void {
  let cur: any = obj;
  for (let i = 0; i < path.length - 1; i++) {
    const k = path[i]!;
    if (cur[k] === undefined) cur[k] = {};
    cur = cur[k];
  }
  cur[path[path.length - 1]!] = value;
}

function deleteDeep(obj: any, path: readonly (string | number)[]): void {
  let cur: any = obj;
  for (let i = 0; i < path.length - 1; i++) {
    const k = path[i]!;
    if (cur[k] === undefined) return;
    cur = cur[k];
  }
  delete cur[path[path.length - 1]!];
}
```

Test 3 cases → Commit `feat(write): JsonKeyOwnedWriter (pure JSON, POC-4)`.

---

### Task 15 — YamlWriter + Writer Registry

**Files:** Create `src/write/yaml.ts` + `src/write/registry.ts` + tests

```typescript
// src/write/yaml.ts
import YAML from "yaml";
import type { ConfigWriter, WriteRequest, WriteResult } from "./types.js";

export function createYamlWriter(): ConfigWriter {
  return {
    supports(path) { return /\.ya?ml$/i.test(path); },
    async write(req: WriteRequest): Promise<WriteResult> {
      const doc = YAML.parseDocument(req.source);
      let applied = 0;
      for (const op of req.ops) {
        if (op.op === "upsertOwnedKey") { doc.setIn(op.path as (string | number)[], op.value); applied++; }
        else if (op.op === "removeOwnedKey") { doc.deleteIn(op.path as (string | number)[]); applied++; }
      }
      const modified = doc.toString();
      return {
        modified, opsApplied: applied, blocks: [],
        originalBytes: Buffer.byteLength(req.source, "utf8"),
        modifiedBytes: Buffer.byteLength(modified, "utf8"),
      };
    },
  };
}
```

```typescript
// src/write/registry.ts
import type { ConfigWriter } from "./types.js";
import { createJsoncWriter } from "./jsonc.js";
import { createTomlWriter } from "./toml.js";
import { createJsonKeyOwnedWriter } from "./json-key-owned.js";
import { createYamlWriter } from "./yaml.js";

export function createWriterRegistry(): ConfigWriter[] {
  return [createJsoncWriter(), createTomlWriter(), createJsonKeyOwnedWriter(), createYamlWriter()];
}

export function resolveWriter(path: string, source: string, registry: ConfigWriter[]): ConfigWriter {
  for (const w of registry) if (w.supports(path, source)) return w;
  throw new Error(`no writer supports ${path}`);
}
```

Commit `feat(write): YamlWriter + registry (4 writers)`.

---

### Task 16 — Installer Interface + SymlinkInstaller

**Files:** Create `src/install/types.ts` + `src/install/symlink.ts` + tests

```typescript
// src/install/types.ts
export type InstallMode = "symlink" | "copy" | "hardlink" | "junction";

export interface InstallRequest {
  sourcePath: string;
  targetPath: string;
  kind: "file" | "directory";
  requestedMode: InstallMode | "auto";
  context: {
    assetType: "skills" | "subagents" | "hooks" | "mcp_servers" | "instructions" | "plugins";
    provider: "claude-code" | "codex" | "opencode";
    platform: NodeJS.Platform;
  };
}

export interface InstallResult {
  mode: InstallMode | "copy";
  reason: string;
  targetPath: string;
}

export interface Installer {
  supports(req: InstallRequest): boolean;
  install(req: InstallRequest): Promise<InstallResult>;
}
```

```typescript
// src/install/symlink.ts
import { atomicReplaceSymlink } from "../round-trip/symlink/symlink-dir.js";
import type { Installer, InstallRequest, InstallResult } from "./types.js";

export function createSymlinkInstaller(): Installer {
  return {
    supports(req) { return req.requestedMode === "symlink" || req.requestedMode === "auto"; },
    async install(req: InstallRequest): Promise<InstallResult> {
      const staging = `${req.targetPath}.concord-staging`;
      const res = await atomicReplaceSymlink(req.sourcePath, req.targetPath, staging);
      return {
        mode: res.kind === "junction" ? "junction" : "symlink",
        reason: res.kind === "junction" ? "WindowsJunctionFallback" : "SymlinkPreferred",
        targetPath: req.targetPath,
      };
    },
  };
}
```

Test (directory symlink → target 에 source 내용 접근 가능) → Commit `feat(install): types + SymlinkInstaller`.

---

### Task 17 — CopyInstaller + Routing

**Files:** Create `src/install/copy.ts` + `src/install/routing.ts` + tests

```typescript
// src/install/copy.ts
import { copy } from "fs-extra";
import type { Installer, InstallRequest, InstallResult } from "./types.js";

export function createCopyInstaller(): Installer {
  return {
    supports(req) { return req.requestedMode === "copy" || req.requestedMode === "auto"; },
    async install(req: InstallRequest): Promise<InstallResult> {
      await copy(req.sourcePath, req.targetPath, { overwrite: true, errorOnExist: false });
      return {
        mode: "copy",
        reason: req.requestedMode === "copy" ? "CopyRequested" : "CopyFallback",
        targetPath: req.targetPath,
      };
    },
  };
}
```

```typescript
// src/install/routing.ts
import type { InstallMode, InstallRequest } from "./types.js";

export function resolveInstallMode(req: InstallRequest): InstallMode {
  if (req.context.assetType === "skills" && req.context.provider === "claude-code") return "copy";
  if (req.context.platform === "win32") return "symlink";
  return "symlink";
}

export function effectiveMode(req: InstallRequest): InstallMode {
  if (req.requestedMode === "auto") return resolveInstallMode(req);
  return req.requestedMode;
}
```

Tests (copy file/dir + routing matrix 6 cases) → Commit `feat(install): CopyInstaller + routing (D-14)`.

---

### Task 18 — MCP Windows Transformer + Registry

**Files:** Create `src/transform/types.ts` + `src/transform/mcp-windows.ts` + `src/transform/registry.ts` + tests

```typescript
// src/transform/types.ts
export interface TransformContext {
  provider: "claude-code" | "codex" | "opencode";
  platform: NodeJS.Platform;
  assetType: "skills" | "subagents" | "hooks" | "mcp_servers" | "instructions" | "plugins";
}

export interface FormatTransformer {
  name: string;
  transform(content: unknown, ctx: TransformContext): { applied: boolean; result: unknown };
}
```

```typescript
// src/transform/mcp-windows.ts
import type { FormatTransformer, TransformContext } from "./types.js";

export function createMcpWindowsCommandTransformer(): FormatTransformer {
  return {
    name: "mcp-windows-cmd-npx-wrap",
    transform(content, ctx: TransformContext) {
      if (ctx.platform !== "win32") return { applied: false, result: content };
      if (ctx.assetType !== "mcp_servers") return { applied: false, result: content };
      if (typeof content !== "object" || content === null) return { applied: false, result: content };
      const mcp = content as { command?: unknown; args?: unknown[] };
      if (mcp.command !== "npx") return { applied: false, result: content };
      const origArgs = Array.isArray(mcp.args) ? mcp.args : [];
      return { applied: true, result: { ...mcp, command: "cmd", args: ["/c", "npx", ...origArgs] } };
    },
  };
}
```

```typescript
// src/transform/registry.ts
import type { FormatTransformer, TransformContext } from "./types.js";
import { createMcpWindowsCommandTransformer } from "./mcp-windows.js";

export function createTransformerRegistry(): FormatTransformer[] {
  return [createMcpWindowsCommandTransformer()];
}

export function applyTransformers(
  content: unknown,
  ctx: TransformContext,
  registry: FormatTransformer[],
): { result: unknown; appliedNames: string[] } {
  let cur = content;
  const applied: string[] = [];
  for (const t of registry) {
    const { applied: a, result } = t.transform(cur, ctx);
    if (a) { applied.push(t.name); cur = result; }
  }
  return { result: cur, appliedNames: applied };
}
```

Tests (win32+mcp+npx → wrap / darwin no-op / command!==npx no-op / asset!==mcp no-op) → Commit `feat(transform): MCP Windows cmd /c npx + registry (D-14)`.

---

### Task 19 — Lock Write I/O

**Files:** Create `src/io/lock-write.ts` + test

```typescript
// src/io/lock-write.ts
import { default as writeAtomic } from "write-file-atomic";
import { copyFile, stat } from "node:fs/promises";

export async function writeLockAtomic(path: string, lock: unknown): Promise<void> {
  const existing = await stat(path).catch(() => null);
  if (existing?.isFile()) await copyFile(path, `${path}.bak`);
  const content = JSON.stringify(lock, null, 2) + "\n";
  await new Promise<void>((resolve, reject) => {
    (writeAtomic as any)(path, content, (err: Error | null | undefined) => {
      if (err) reject(err); else resolve();
    });
  });
}
```

Test (new write valid JSON / existing → .bak backup) → Commit `feat(io): lock atomic write + .bak`.

---

### Task 20 — Sync Plan Computation

**Files:** Create `src/sync/plan.ts` + test

```typescript
export type SyncAction =
  | { kind: "install"; nodeId: string; manifestEntry: any }
  | { kind: "update"; nodeId: string; manifestEntry: any; existingNode: any }
  | { kind: "prune"; nodeId: string; existingNode: any }
  | { kind: "skip"; nodeId: string; reason: string };

export interface SyncPlan {
  actions: SyncAction[];
  summary: { install: number; update: number; prune: number; skip: number };
}

const ASSET_TYPES = ["skills", "subagents", "hooks", "mcp_servers", "instructions", "plugins"] as const;

export function computeSyncPlan(manifest: any, lock: any): SyncPlan {
  const actions: SyncAction[] = [];
  const manifestIds = new Set<string>();
  for (const at of ASSET_TYPES) {
    for (const entry of manifest?.[at] ?? []) {
      const nodeId = entry.id as string;
      manifestIds.add(nodeId);
      const existing = lock?.nodes?.[nodeId];
      if (!existing) actions.push({ kind: "install", nodeId, manifestEntry: entry });
      else actions.push({ kind: "update", nodeId, manifestEntry: entry, existingNode: existing });
    }
  }
  for (const [nodeId, node] of Object.entries(lock?.nodes ?? {})) {
    if (!manifestIds.has(nodeId)) actions.push({ kind: "prune", nodeId, existingNode: node });
  }
  const summary = { install: 0, update: 0, prune: 0, skip: 0 };
  for (const a of actions) summary[a.kind]++;
  return { actions, summary };
}
```

Tests (install/prune/update 각 1 case) → Commit `feat(sync): computeSyncPlan`.

---

### Task 21 — Drift Detection

**Files:** Create `src/sync/drift.ts` + test

```typescript
export type DriftStatus = "none" | "source" | "target" | "divergent";

export interface DriftInput {
  node: { source_digest?: string; target_digest?: string };
  currentSourceDigest: string;
  currentTargetDigest: string | null;
}

export function computeDriftStatus(input: DriftInput): DriftStatus {
  const sourceMatches = input.currentSourceDigest === input.node.source_digest;
  const targetMatches = input.currentTargetDigest !== null && input.currentTargetDigest === input.node.target_digest;
  if (sourceMatches && targetMatches) return "none";
  if (!sourceMatches && targetMatches) return "source";
  if (sourceMatches && !targetMatches) return "target";
  return "divergent";
}
```

Tests (4 matrix cases) → Commit `feat(sync): drift (none/source/target/divergent)`.

---

### Task 22 — State Machine

**Files:** Create `src/sync/state-machine.ts` + test

```typescript
export type NodeState = "installed" | "outdated" | "missing";
export type NodeEvent = "integrity-mismatch" | "install-failed";

export interface StateContext {
  currentState: NodeState;
  lastKnownDigest: string | null;
  currentDigest: string | null;
}

export function determineState(ctx: StateContext): NodeState {
  if (ctx.currentDigest === null) return "missing";
  if (ctx.lastKnownDigest === null) return "installed";
  if (ctx.currentDigest !== ctx.lastKnownDigest) return "outdated";
  return "installed";
}

export function shouldEmitEvent(ctx: StateContext): NodeEvent | null {
  if (ctx.currentDigest === null && ctx.lastKnownDigest !== null) return "install-failed";
  if (ctx.lastKnownDigest !== null && ctx.currentDigest !== null && ctx.currentDigest !== ctx.lastKnownDigest) {
    return "integrity-mismatch";
  }
  return null;
}
```

Tests (3 state × 2 event) → Commit `feat(sync): state machine`.

---

### Task 23 — Sync Runner

**Files:** Create `src/sync/runner.ts` + test

```typescript
import { resolveFetcher, createFetcherRegistry } from "../fetch/registry.js";
import { createSymlinkInstaller } from "../install/symlink.js";
import { createCopyInstaller } from "../install/copy.js";
import { effectiveMode } from "../install/routing.js";
import type { SyncAction, SyncPlan } from "./plan.js";
import type { FetchContext } from "../fetch/types.js";

export interface RunSyncOptions {
  fetchContext: FetchContext;
  onProgress?: (a: SyncAction, s: "start" | "done" | "skip" | "error", err?: Error) => void;
}

export interface RunSyncResult {
  installed: string[]; updated: string[]; pruned: string[]; skipped: string[];
  errors: Array<{ nodeId: string; message: string }>;
}

export async function runSync(plan: SyncPlan, opts: RunSyncOptions): Promise<RunSyncResult> {
  const fetchers = createFetcherRegistry();
  const symlink = createSymlinkInstaller();
  const copy = createCopyInstaller();
  const result: RunSyncResult = { installed: [], updated: [], pruned: [], skipped: [], errors: [] };
  for (const action of plan.actions) {
    opts.onProgress?.(action, "start");
    try {
      if (action.kind === "install" || action.kind === "update") {
        const entry = action.manifestEntry;
        const fetcher = resolveFetcher(entry.source, fetchers);
        const fetched = await fetcher.fetch(entry.source, opts.fetchContext);
        const context = {
          assetType: entry.asset_type ?? deriveAssetType(entry),
          provider: entry.provider ?? "claude-code",
          platform: process.platform as NodeJS.Platform,
        };
        const requestedMode = (entry.install ?? "auto") as any;
        const req = { sourcePath: fetched.localPath, targetPath: entry.target_path, kind: fetched.kind, requestedMode, context };
        const mode = effectiveMode(req);
        const installer = mode === "copy" ? copy : symlink;
        await installer.install({ ...req, requestedMode: mode });
        if (action.kind === "install") result.installed.push(action.nodeId);
        else result.updated.push(action.nodeId);
      } else if (action.kind === "prune") result.pruned.push(action.nodeId);
      else if (action.kind === "skip") result.skipped.push(action.nodeId);
      opts.onProgress?.(action, "done");
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      result.errors.push({ nodeId: action.nodeId, message: msg });
      opts.onProgress?.(action, "error", err instanceof Error ? err : new Error(msg));
    }
  }
  return result;
}

function deriveAssetType(entry: any): string {
  const [, type] = (entry.id ?? "").split(":");
  return type ?? "skills";
}
```

Test (install file end-to-end) → Commit `feat(sync): runSync orchestration`.

---

### Task 24 — Atomic Rollback

**Files:** Create `src/sync/rollback.ts` + test

```typescript
import { rm } from "node:fs/promises";

export interface RollbackEntry { nodeId: string; targetPath: string; wasPreExisting: boolean; }

export interface RollbackLog {
  entries: RollbackEntry[];
  record(e: RollbackEntry): void;
  rollback(): Promise<{ rolled: string[]; failed: Array<{ nodeId: string; error: string }> }>;
}

export function createRollbackLog(): RollbackLog {
  const entries: RollbackEntry[] = [];
  return {
    entries,
    record(e) { entries.push(e); },
    async rollback() {
      const rolled: string[] = [];
      const failed: Array<{ nodeId: string; error: string }> = [];
      for (const e of [...entries].reverse()) {
        if (e.wasPreExisting) continue;
        try { await rm(e.targetPath, { recursive: true, force: true }); rolled.push(e.nodeId); }
        catch (err) { failed.push({ nodeId: e.nodeId, error: err instanceof Error ? err.message : String(err) }); }
      }
      return { rolled, failed };
    },
  };
}
```

Test (reverse order, non-pre-existing only) → Commit `feat(sync): rollback log`.

---

### Task 25 — `concord sync` CLI

**Files:** Create `src/cli/commands/sync.ts` + modify `src/cli/index.ts` + test

```typescript
// src/cli/commands/sync.ts
import { Command } from "commander";
import { resolve, join } from "node:path";
import { loadYamlFile } from "../../io/yaml-loader.js";
import { readLock } from "../../io/lock-io.js";
import { writeLockAtomic } from "../../io/lock-write.js";
import { validateManifest } from "../../schema/validate-manifest.js";
import { computeSyncPlan } from "../../sync/plan.js";
import { runSync } from "../../sync/runner.js";
import { resolveConcordHome } from "../../discovery/concord-home.js";

export function registerSyncCommand(program: Command): void {
  program
    .command("sync")
    .description("Apply manifest to provider targets")
    .option("--scope <scope>", "scope (project|user|enterprise|local)", "project")
    .option("--manifest <path>", "manifest file path")
    .option("--lock <path>", "lock file path")
    .action(async (opts: { scope: string; manifest?: string; lock?: string }) => {
      const manifestPath = opts.manifest ? resolve(opts.manifest) : resolve("concord.yaml");
      const lockPath = opts.lock ? resolve(opts.lock) : resolve("concord.lock");
      const concordHome = resolveConcordHome();
      const cacheDir = join(concordHome, "cache");
      const manifestRaw = await loadYamlFile(manifestPath);
      const manifest = validateManifest(manifestRaw);
      const currentLock = await readLock(lockPath).catch(() => ({ lockfile_version: 1, roots: [], nodes: {} } as any));
      const plan = computeSyncPlan(manifest as any, currentLock);
      process.stderr.write(`plan: install=${plan.summary.install} update=${plan.summary.update} prune=${plan.summary.prune}\n`);
      const result = await runSync(plan, {
        fetchContext: { concordHome, cacheDir, allowNetwork: true },
        onProgress: (a, s) => process.stderr.write(`[${s}] ${a.kind} ${a.nodeId}\n`),
      });
      process.stderr.write(`done: installed=${result.installed.length} updated=${result.updated.length} pruned=${result.pruned.length} errors=${result.errors.length}\n`);
      if (result.errors.length > 0) {
        for (const e of result.errors) process.stderr.write(`ERROR ${e.nodeId}: ${e.message}\n`);
        process.exit(1);
      }
      await writeLockAtomic(lockPath, currentLock);
    });
}
```

Modify `src/cli/index.ts`: add `import { registerSyncCommand } from "./commands/sync.js";` + `registerSyncCommand(program);`.

Test (child-process smoke: skill sync full cycle) → Commit `feat(cli): concord sync command`.

---

### Task 26 — Integration E2E: Skill Sync

**Files:** Create `tests/integration/sync-skill.test.ts`

```typescript
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, writeFile, mkdir, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runCommand } from "../../src/utils/exec-file.js";

const REPO = process.cwd();

describe("E2E: skill sync cycle", () => {
  let tmp: string;
  beforeEach(async () => { tmp = await mkdtemp(join(tmpdir(), "concord-e2e-")); });
  afterEach(async () => { await rm(tmp, { recursive: true, force: true }); });

  it("install → update → content 변경", async () => {
    const src = join(tmp, "src"); await mkdir(src, { recursive: true });
    await writeFile(join(src, "SKILL.md"), "# v1\n");
    const target = join(tmp, "out");
    const manifest = join(tmp, "concord.yaml");
    const lock = join(tmp, "concord.lock");
    await writeFile(manifest, `concord_version: ">=0.1"
skills:
  - id: claude-code:skills:ok
    provider: claude-code
    asset_type: skills
    source: { type: file, path: ${src} }
    target_path: ${target}
    install: copy
`);
    await runCommand("npx", ["tsx", join(REPO, "src/index.ts"), "sync", "--manifest", manifest, "--lock", lock], { cwd: tmp });
    expect(await readFile(join(target, "SKILL.md"), "utf8")).toBe("# v1\n");
    await writeFile(join(src, "SKILL.md"), "# v2\n");
    await runCommand("npx", ["tsx", join(REPO, "src/index.ts"), "sync", "--manifest", manifest, "--lock", lock], { cwd: tmp });
    expect(await readFile(join(target, "SKILL.md"), "utf8")).toBe("# v2\n");
  }, 60000);
});
```

Commit `test(e2e): skill sync cycle`.

---

### Task 27 — Integration E2E: MCP Round-Trip

**Files:** Create `tests/integration/sync-mcp.test.ts`

```typescript
import { describe, it, expect } from "vitest";
import { createJsoncWriter } from "../../src/write/jsonc.js";
import { createTomlWriter } from "../../src/write/toml.js";
import { computeHashSuffix } from "../../src/round-trip/marker.js";

describe("E2E: MCP round-trip", () => {
  it("JSONC: 여러 marker + 사용자 영역 보존", async () => {
    const w = createJsoncWriter();
    const src = `{
  // my mcp
  "mcpServers": { "user": { "command": "node" } }
}`;
    const c1 = '"airtable": { "command": "npx" }';
    const c2 = '"slack": { "command": "node" }';
    const r1 = await w.write({ source: src, ops: [{ op: "upsertBlock", id: "mcp:a", content: c1, hashSuffix: computeHashSuffix(c1) }] });
    const r2 = await w.write({ source: r1.modified, ops: [{ op: "upsertBlock", id: "mcp:s", content: c2, hashSuffix: computeHashSuffix(c2) }] });
    expect(r2.modified).toContain("airtable");
    expect(r2.modified).toContain("slack");
    expect(r2.modified).toContain('"user"');
  });

  it("TOML: marker + [features] 보존", async () => {
    const w = createTomlWriter();
    const src = `[features]\ncodex_hooks = true\n`;
    const c = `[mcp_servers.a]\ncommand = "npx"`;
    const r = await w.write({ source: src, ops: [{ op: "upsertBlock", id: "mcp:a", content: c, hashSuffix: computeHashSuffix(c) }] });
    expect(r.modified).toContain("[features]");
    expect(r.modified).toContain("[mcp_servers.a]");
  });
});
```

Commit `test(e2e): MCP JSONC/TOML round-trip`.

---

### Task 28 — Integration E2E: Drift

**Files:** Create `tests/integration/sync-drift.test.ts`

```typescript
import { describe, it, expect } from "vitest";
import { computeDriftStatus } from "../../src/sync/drift.js";

describe("E2E: drift scenarios", () => {
  const node = { source_digest: "sha256:a", target_digest: "sha256:b" };
  it("initial → none", () => { expect(computeDriftStatus({ node, currentSourceDigest: "sha256:a", currentTargetDigest: "sha256:b" })).toBe("none"); });
  it("upstream bump → source", () => { expect(computeDriftStatus({ node, currentSourceDigest: "sha256:n", currentTargetDigest: "sha256:b" })).toBe("source"); });
  it("user edit → target", () => { expect(computeDriftStatus({ node, currentSourceDigest: "sha256:a", currentTargetDigest: "sha256:e" })).toBe("target"); });
  it("both → divergent", () => { expect(computeDriftStatus({ node, currentSourceDigest: "sha256:n", currentTargetDigest: "sha256:e" })).toBe("divergent"); });
});
```

Commit `test(e2e): drift scenarios`.

---

### Task 29 — Full Verification + Build

- [ ] **Step 1: typecheck + full vitest + build**

```bash
cd /Users/macbook/workspace/concord
npm run typecheck
npx vitest run
npm run build
./dist/src/index.js sync --help
```

Expected: typecheck clean, 모든 test PASS (246 + 약 70~80 = 약 320 passed + 1 skipped), build emit, CLI help 출력.

---

### Task 30 — README + Summary + TODO/MEMORY + Tag + Merge

**Files:** Modify `README.md`, `TODO.md`, `MEMORY.md` + create `docs/superpowers/poc/2026-04-22-plan-2b-summary.md`

- [ ] **Step 1: Update README.md Usage section**

```markdown
## Usage

concord sync                               # project scope
concord sync --scope user
concord sync --manifest ./concord.yaml --lock ./concord.lock

## Subsystems (Plan 2B)

- 6 fetchers: file/git/http/npm/external/adopted
- 4 config writers: JSONC (jsonc-morph) / TOML (@decimalturn) / pure JSON (key-owned) / YAML (eemeli)
- 2 installers: symlink / copy (atomic staging)
- 1 transformer: MCP Windows cmd /c npx wrap
- state machine: installed/outdated/missing + integrity-mismatch/install-failed
- drift: none/source/target/divergent
```

- [ ] **Step 2: Create `docs/superpowers/poc/2026-04-22-plan-2b-summary.md`**

30 task 구성 + 주요 산출물 + Plan 3 다음 단계.

- [ ] **Step 3: Update TODO.md + MEMORY.md** (Plan 2B 완료 Snapshot + 다음 Plan 3)

- [ ] **Step 4: Commit + tag + merge**

```bash
git add README.md TODO.md MEMORY.md docs/superpowers/poc/2026-04-22-plan-2b-summary.md
git commit -m "docs(plan-2b): completion summary + TODO/MEMORY/README"
git tag concord-plan-2b-sync-engine
git checkout main
git merge --no-ff feat/concord-plan-2b-sync-engine -m "Merge Plan 2B Sync Engine (30 tasks, concord sync 동작)"
npm run typecheck && npx vitest run
```

---

## Self-Review

### 1. Spec coverage

| spec | task |
|---|---|
| §3 β3 α source model | Task 4 (Fetcher interface) |
| §6.7 concord sync | Task 25 + 23 (runner) |
| §7 state machine | Task 22 |
| §7.3.1 drift 4 상태 | Task 21 (env-drift 제외, Plan 3) |
| §9 D-1~D-14 | Task 16~18 |
| §10.1 JSONC jsonc-morph | Task 12 |
| §10.2 TOML @decimalturn | Task 13 |
| §10.3 json-key-owned | Task 14 |
| §10.5 marker | Task 2 + 12 + 13 |
| §10.6 extraneous preservation | Task 12 (upsertBlock 외부 보존) |
| CI matrix | Task 1 |
| Atomic rollback | Task 24 |

### 2. Placeholder scan

"TBD" / "나중에" / "TODO-later" 없음. 각 task 가 구체 code + 명령 + 검증.

### 3. Type consistency

- `ConfigFileEditor` (Plan 2A) vs `ConfigWriter` (Task 11) 구분
- `Fetcher` / `Installer` / `FormatTransformer` 별도 interface
- `InstallMode` / `NodeState` / `DriftStatus` / `WriteOp` 열거체 일관
- `runCommand` (Task 3) 을 Git/Npm/External fetcher 에서 공통 사용

### 4. 누락 확인

- Secret 보간 (E-1~E-19) **제외** — Plan 3
- `concord cleanup` / `doctor` — Plan 3
- Plan 2B 의 `prune` action 은 집계만, 실제 디스크 삭제는 Plan 3

---

## Execution Handoff

**Plan complete and saved to `docs/superpowers/plans/2026-04-22-concord-plan-2b-sync-engine.md`. Two options:**

**1. Subagent-Driven (recommended)** — Plan 1/2A 확립 패턴. 30 task 규모이므로 context 효율 위해 subagent 필수.

**2. Inline Execution** — `superpowers:executing-plans`.

If Subagent-Driven: use `superpowers:subagent-driven-development`.
