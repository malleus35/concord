# Concord Plan 1 — Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Manifest / Lock schema + Reserved Identifier Registry + Interpolation allowlist + Discovery + `capability_matrix` 표기 레이어 + CLI skeleton 3 명령 (`validate` / `lint` / `list --dry-run`) 을 구현해 concord Phase 1 의 **schema 계약 계층** 을 완성한다. Plan 2+ 의 모든 후속 작업이 이 plan 의 schema 계약에 의존한다.

**Architecture:**
- **Zod 4.x = schema SoT**. JSON Schema 는 Zod 4 native `z.toJSONSchema()` 로 파생 생성 (§5.6 가드레일 2).
- **Manifest validator = 3-pass pipeline**: (1) pre-validation (Reserved + interpolation allowlist + path traversal) → (2) Zod parse → (3) post-validation (결정 A A1~A5 + D-11 case-insensitive).
- **Lock validator = Zod parse + I1/I5/I6 invariant checks + symlink drift refine** (§5.10, §7.3.1).
- **CLI = commander 기반**. Plan 1 은 read-only 명령 3 개만 (실제 sync/install 은 Plan 2+).
- **Plan 1 은 fetch / install / round-trip / secret resolve 를 포함하지 않음** (각각 Plan 2/3 에서).

**Tech Stack:**
- Node.js >=22 (Active LTS), TypeScript 6.x, Vitest 4.x
- Zod 4.x (`z.discriminatedUnion` 은 유지하되 Zod 로드맵상 향후 `z.switch` 로 migration 예정. `.passthrough()` 는 Zod 4 에서도 작동하나 `.loose()` / `z.looseObject({...})` 로 전환 가능)
- `yaml` (eemeli) 2.x (format-preserving 읽기, POC-3 확정)
- `semver` 7.x (concord_version constraint)
- `commander` 14.x
- `jsonc-parser` 3.x (Plan 2 round-trip 기반, Plan 1 에서는 미사용)

**Dependency 정책 (기존 `package.json` 존중)**:
- 프로젝트 루트에 이미 존재하는 `package.json` 의 deps 선택을 Plan 1 이 그대로 수용한다.
- spec 부록 B 의 "Zod 3 고정" 결정은 **Zod 4 채택으로 재평가** (기존 deps 선정 존중). 본 plan 실행 후 spec 부록 B 동기화 업데이트.
- `@iarna/toml` 은 Plan 1 범위 밖 — Plan 2 에서 `@decimalturn/toml-patch` 로 교체 (spec §10.2).
- `zod-to-json-schema` 는 **사용하지 않음** — Zod 4 native `z.toJSONSchema()` 로 충분.

**Spec reference:** `docs/superpowers/specs/2026-04-21-concord-design.md`
- §1 Π1~Π7 + §1.10 RFC Defense Lines
- §2 Reserved Identifier Registry (15 entries)
- §4 Manifest Schema + §4.5 allowlist + §4.6 concord_version constraint + §4.8 3-pass validator
- §5 Lock Schema + §5.6 capability_matrix + §5.6.2 ReasonEnum/InstallReasonEnum + §5.10 I1~I6
- §11 Discovery / 4 Scope
- §12 POC-3 (YAML 선정), POC-4 (json-key-owned 확정), POC-13 (4 scope merge)

**POC executed in this plan:**
- **POC-3**: `yaml` (eemeli) 채택 확정 (Task 13). 대안 비교는 Plan 1 범위 밖.
- **POC-13**: 4 scope merge 순서 golden test (Task 20).
- **POC-5 skeleton**: Plugin introspection 은 Plan 3 에서 완성되므로 Plan 1 에선 PluginAsset schema 까지만.

---

## File Structure

### Created files

| 파일 | 역할 |
|---|---|
| `package.json` | Node >=22, TS 6, deps: zod 4 / yaml / semver / commander 14 / jsonc-parser. **기존 루트 파일이 SoT** — Task 1 은 missing deps 만 추가 |
| `tsconfig.json` | strict + ES2022 + NodeNext |
| `vitest.config.ts` | 테스트 설정 |
| `.eslintrc.cjs` | TS eslint |
| `README.md` | 간단 사용법 |
| `src/index.ts` | CLI entrypoint (shebang) |
| `src/cli/index.ts` | commander 세팅 + command dispatch |
| `src/cli/commands/validate.ts` | `concord validate <manifest>` — Zod 전체 검증 |
| `src/cli/commands/lint.ts` | `concord lint` — manifest lookup + pre-validation only |
| `src/cli/commands/list.ts` | `concord list --dry-run` — lock 읽고 표시 |
| `src/schema/types.ts` | ConfigScope / AssetType / Provider / 공통 enum |
| `src/schema/reserved-identifier-registry.ts` | §2 parse error 검증기 (15 entries) |
| `src/schema/interpolation-allowlist.ts` | §4.5 allowlist 검증기 + path traversal (E-10) |
| `src/schema/capability-matrix.ts` | ReasonEnum + InstallReasonEnum + CapabilityCellSchema + CapabilityMatrixSchema + 기호 renderer |
| `src/schema/source.ts` | SourceSchema + PluginSourceSchema (discriminated union) |
| `src/schema/asset-base.ts` | AssetBaseSchema (공통 + install field) |
| `src/schema/manifest.ts` | ManifestSchema + 6 자산 Schema (Skill/Subagent/Hook/MCP/Instruction/Plugin) |
| `src/schema/lock.ts` | LockNodeSchema + LockSchema (roots+nodes+lockfile_version+phase2_projections optional + symlink drift refine) |
| `src/schema/validate-manifest.ts` | 3-pass pipeline |
| `src/schema/validate-lock.ts` | Zod + I1/I5/I6 checks |
| `src/discovery/concord-home.ts` | Discovery 5 순서 (§11.1) |
| `src/discovery/scope.ts` | 4 scope 탐색 + precedence merge (§11.5) |
| `src/io/yaml-loader.ts` | `yaml` (eemeli) wrapper (format-preserving read) |
| `src/io/lock-io.ts` | atomic read/write (Plan 1 은 read 만) |

### Test files
- `tests/schema/*.test.ts` — schema 단위 테스트 (각 파일 당 하나)
- `tests/discovery/*.test.ts`
- `tests/cli/*.test.ts` — CLI 3 명령 integration
- `tests/fixtures/` — golden manifest / lock 샘플 (valid / reserved-include / interpolation-misuse / case-collision 등)

### Why this structure
- **responsibility-per-file**: 각 schema 단위가 독립 이해 가능 (§4 세분 그대로 따름)
- **3-pass pipeline 분리**: pre-validation (`reserved-identifier-registry.ts` + `interpolation-allowlist.ts`) → Zod (`manifest.ts` / `lock.ts`) → post-validation (`validate-manifest.ts`)
- **capability-matrix 단일 모듈**: ReasonEnum 확장 시 단일 지점 편집 (§5.6.3 가드레일 3)
- **io 분리**: Plan 2 에서 round-trip write 가 `io/` 로 들어옴 — Plan 1 에선 read 만
- **Plan 2 대비 space**: `src/fetch/`, `src/install/`, `src/secret/`, `src/round-trip/` 는 이 plan 에서 만들지 않음 (Plan 2~3)

---

## Tasks

### Task 1 — Repo Bootstrap + Tooling

**Files:**
- Modify: `package.json` (기존 루트 파일에 missing deps 만 추가)
- Create: `tsconfig.json`, `vitest.config.ts`, `src/index.ts`, `.gitignore`

**기존 `package.json` 은 유지**. 다음 deps 가 이미 들어있다: `zod@^4.3.6` / `yaml@^2.8.3` / `jsonc-parser@^3.3.1` / `commander@^14.0.3` / `minimatch@^10.2.5` / `@iarna/toml@^2.2.5` (Plan 2 에서 교체), `typescript@^6.0.3` / `vitest@^4.1.4` / `@types/node@^25.6.0` / `tsx@^4.21.0`.

- [ ] **Step 1: Add missing dependencies to `package.json`**

```bash
npm install --save semver
npm install --save-dev @types/semver
```

기존 `package.json` 의 나머지 deps 는 건드리지 않는다. 최종 `package.json` 은 대략 다음과 같다 (실제 설치 후 `package-lock.json` 업데이트):

```json
{
  "name": "concord",
  "version": "0.1.0",
  "description": "Concord Phase 1 CLI for shared agent workflow sync across Claude Code, Codex, and OpenCode",
  "type": "module",
  "bin": {
    "concord": "./dist/src/index.js"
  },
  "engines": {
    "node": ">=22.0.0"
  },
  "files": ["dist"],
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "dev": "tsx src/index.ts",
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc -p tsconfig.json --noEmit"
  },
  "dependencies": {
    "@iarna/toml": "^2.2.5",
    "commander": "^14.0.3",
    "jsonc-parser": "^3.3.1",
    "minimatch": "^10.2.5",
    "semver": "^7.7.0",
    "yaml": "^2.8.3",
    "zod": "^4.3.6"
  },
  "devDependencies": {
    "@types/node": "^25.6.0",
    "@types/semver": "^7.5.0",
    "tsx": "^4.21.0",
    "typescript": "^6.0.3",
    "vitest": "^4.1.4"
  }
}
```

**Plan 1 이 eslint / `@typescript-eslint` 를 쓰지 않는 이유**: 기존 setup 에 없음, 본 Plan 범위에선 `tsc --noEmit` (typecheck) + `vitest` 로 충분. Eslint 는 필요 시 별도 차후 sprint 에서 추가.

- [ ] **Step 2: Create `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "outDir": "./dist",
    "rootDir": "./",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "declaration": true,
    "forceConsistentCasingInFileNames": true,
    "noUncheckedIndexedAccess": true,
    "resolveJsonModule": true,
    "types": ["node"]
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

**주의**:
- `rootDir: "./"` + `include: ["src/**/*"]` 조합은 `src/index.ts` → `dist/src/index.js` 생성. 기존 `package.json` 의 `"bin": "./dist/src/index.js"` 와 정확히 일치.
- `"types": ["node"]` 은 **TS 6 + @types/node 25** 조합에서 `process` / `Buffer` 같은 Node.js global 을 인식시키기 위해 필수. TS 6 가 auto-include 를 중단했으므로 명시해야 build 가 성공 (TS 공식 error TS2591 이 직접 권고).

- [ ] **Step 3: Create `vitest.config.ts`**

```typescript
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    globals: true,
  },
});
```

- [ ] **Step 4: (eslint 설정 skip — 기존 프로젝트 관행 존중)**

Eslint / `@typescript-eslint` 는 현재 프로젝트에 없다. 본 Plan 은 `npm run typecheck` (tsc --noEmit) + Vitest 로 품질 보증. 필요 시 별도 sprint 에서 eslint 도입.

- [ ] **Step 5: Create `.gitignore`**

```
node_modules/
dist/
coverage/
*.log
.DS_Store
.concord/
concord.local.yaml
concord.local.lock
```

- [ ] **Step 6: Create `src/index.ts` (stub — Task 22 에서 CLI 연결)**

```typescript
#!/usr/bin/env node
// Concord CLI entrypoint. CLI dispatch 는 Task 22 에서 연결.
console.error("concord: not ready (Task 22 pending)");
process.exit(1);
```

- [ ] **Step 7: `npm install` + `npm run build`**

Run:
```bash
npm install
npm run build
```
Expected: `dist/src/index.js` 생성 (bin entry 와 일치), exit 0.

- [ ] **Step 8: Commit**

```bash
git add package.json package-lock.json tsconfig.json vitest.config.ts .gitignore src/index.ts
git commit -m "chore: bootstrap concord with Node >=22 / TS 6 / Vitest 4 / Zod 4"
```

---

### Task 2 — Shared Types + Enums

**Files:**
- Create: `src/schema/types.ts`
- Test: `tests/schema/types.test.ts`

- [ ] **Step 1: Write failing test `tests/schema/types.test.ts`**

```typescript
import { describe, expect, it } from "vitest";
import {
  ConfigScope,
  AssetType,
  Provider,
  SCOPE_PRECEDENCE,
} from "../../src/schema/types.js";

describe("ConfigScope", () => {
  it("has 4 canonical scopes", () => {
    expect(ConfigScope.enum).toStrictEqual({
      enterprise: "enterprise",
      user: "user",
      project: "project",
      local: "local",
    });
  });
});

describe("AssetType", () => {
  it("has 6 canonical asset types (β3 restoration)", () => {
    expect(Object.keys(AssetType.enum).sort()).toStrictEqual(
      ["skills", "subagents", "hooks", "mcp_servers", "instructions", "plugins"].sort()
    );
  });
});

describe("Provider", () => {
  it("has 3 supported providers", () => {
    expect(Object.keys(Provider.enum).sort()).toStrictEqual(
      ["claude-code", "codex", "opencode"].sort()
    );
  });
});

describe("SCOPE_PRECEDENCE", () => {
  it("orders enterprise → user → project → local (§11.5)", () => {
    expect(SCOPE_PRECEDENCE).toStrictEqual([
      "enterprise",
      "user",
      "project",
      "local",
    ]);
  });
});
```

- [ ] **Step 2: Run test to verify FAIL**

Run: `npx vitest run tests/schema/types.test.ts`
Expected: FAIL with `Cannot find module .../types.js`.

- [ ] **Step 3: Implement `src/schema/types.ts`**

```typescript
import { z } from "zod";

/** 4 scope (§4.1 / §11.2). */
export const ConfigScope = z.enum(["enterprise", "user", "project", "local"]);
export type ConfigScope = z.infer<typeof ConfigScope>;

/** 6 자산 타입 (β3 재구조, §3.1). */
export const AssetType = z.enum([
  "skills",
  "subagents",
  "hooks",
  "mcp_servers",
  "instructions",
  "plugins",
]);
export type AssetType = z.infer<typeof AssetType>;

/** 3 provider (§3 전체). */
export const Provider = z.enum(["claude-code", "codex", "opencode"]);
export type Provider = z.infer<typeof Provider>;

/** Scope precedence (§11.5). enterprise → user → project → local. */
export const SCOPE_PRECEDENCE: readonly ConfigScope[] = [
  "enterprise",
  "user",
  "project",
  "local",
] as const;
```

- [ ] **Step 4: Run test to verify PASS**

Run: `npx vitest run tests/schema/types.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/schema/types.ts tests/schema/types.test.ts
git commit -m "feat(schema): shared enums ConfigScope / AssetType / Provider + SCOPE_PRECEDENCE"
```

---

### Task 3 — Discovery (`concord-home.ts`)

**Files:**
- Create: `src/discovery/concord-home.ts`
- Test: `tests/discovery/concord-home.test.ts`

**Spec reference:** §11.1 Discovery 5 단계 순서.

- [ ] **Step 1: Write failing test `tests/discovery/concord-home.test.ts`**

**주의**: `os.homedir()` 를 `vi.spyOn` 으로 mock 해 개발 머신에 실재하는 `~/.concord/` 에 의해 test 가 shadow 되지 않도록 한다. 각 test 마다 **tmp home** 을 사용 (`.concord/` 미생성 상태에서 discovery step 탐색).

```typescript
import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import * as os from "node:os";
import * as path from "node:path";
import * as fs from "node:fs";
import { findConcordHome } from "../../src/discovery/concord-home.js";

const savedEnv = { ...process.env };
let tmpHome: string;

beforeEach(() => {
  delete process.env.CONCORD_HOME;
  delete process.env.XDG_CONFIG_HOME;
  delete process.env.APPDATA;
  // fake home without pre-existing .concord/
  tmpHome = fs.mkdtempSync(path.join(os.tmpdir(), "concord-test-home-"));
  vi.spyOn(os, "homedir").mockReturnValue(tmpHome);
});

afterEach(() => {
  vi.restoreAllMocks();
  fs.rmSync(tmpHome, { recursive: true, force: true });
  process.env = { ...savedEnv };
});

describe("findConcordHome", () => {
  it("returns $CONCORD_HOME if set (step 1, highest priority)", () => {
    process.env.CONCORD_HOME = "/tmp/my-concord-override";
    expect(findConcordHome()).toBe("/tmp/my-concord-override");
  });

  it("falls back to default <home>/.concord when no env var and no existing config", () => {
    expect(findConcordHome()).toBe(path.join(tmpHome, ".concord"));
  });

  it("prefers existing $XDG_CONFIG_HOME/concord over ~/.config/concord", () => {
    // tmpHome/.concord is intentionally absent — so step 2 fall-through to step 3
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "concord-xdg-"));
    process.env.XDG_CONFIG_HOME = tmp;
    fs.mkdirSync(path.join(tmp, "concord"), { recursive: true });
    expect(findConcordHome()).toBe(path.join(tmp, "concord"));
    fs.rmSync(tmp, { recursive: true, force: true });
  });
});
```

- [ ] **Step 2: Run test to verify FAIL**

Run: `npx vitest run tests/discovery/concord-home.test.ts`
Expected: FAIL with `Cannot find module .../concord-home.js`.

- [ ] **Step 3: Implement `src/discovery/concord-home.ts`**

```typescript
import * as os from "node:os";
import * as path from "node:path";
import * as fs from "node:fs";

/**
 * Resolve concord home directory following §11.1 discovery order:
 *   1. $CONCORD_HOME (env var, highest priority — used for test isolation)
 *   2. ~/.concord/ (canonical)
 *   3. $XDG_CONFIG_HOME/concord/
 *   4. ~/.config/concord/
 *   5. %APPDATA%\concord (Windows)
 *
 * If no existing directory is found, returns the default (~/.concord/) without creating it.
 */
export function findConcordHome(): string {
  if (process.env.CONCORD_HOME) {
    return process.env.CONCORD_HOME;
  }

  const home = os.homedir();
  const defaultHome = path.join(home, ".concord");
  if (fs.existsSync(defaultHome)) {
    return defaultHome;
  }

  if (process.env.XDG_CONFIG_HOME) {
    const xdg = path.join(process.env.XDG_CONFIG_HOME, "concord");
    if (fs.existsSync(xdg)) return xdg;
  }

  const xdgFallback = path.join(home, ".config", "concord");
  if (fs.existsSync(xdgFallback)) return xdgFallback;

  if (process.platform === "win32" && process.env.APPDATA) {
    const appdata = path.join(process.env.APPDATA, "concord");
    if (fs.existsSync(appdata)) return appdata;
  }

  return defaultHome;
}
```

- [ ] **Step 4: Run test to verify PASS**

Run: `npx vitest run tests/discovery/concord-home.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/discovery/concord-home.ts tests/discovery/concord-home.test.ts
git commit -m "feat(discovery): 5-step concord home resolution (§11.1)"
```

---

### Task 4 — Reserved Identifier Registry

**Files:**
- Create: `src/schema/reserved-identifier-registry.ts`
- Test: `tests/schema/reserved-identifier-registry.test.ts`

**Spec reference:** §2 (15 entries = Q3 D4 4개 + secret backends 5 + coerce 3 + encoding 1 + default 변형 2).

- [ ] **Step 1: Write failing test `tests/schema/reserved-identifier-registry.test.ts`**

```typescript
import { describe, expect, it } from "vitest";
import {
  checkReserved,
  ReservedIdentifierError,
} from "../../src/schema/reserved-identifier-registry.js";

describe("Reserved Q3 D4 (disassemble)", () => {
  it.each(["include", "exclude", "allow_disassemble", "disassembled_sources"])(
    "rejects field %s",
    (field) => {
      expect(() => checkReserved(field, { file: "test.yaml", line: 1, col: 1 }))
        .toThrow(ReservedIdentifierError);
    },
  );
});

describe("Reserved E-6 secret backends", () => {
  it.each([
    "{secret:1password://Work/GitHub/token}",
    "{secret:keychain://login/github}",
    "{secret:aws-ssm://path/to/token}",
    "{secret:azure-kv://vault/secret}",
    "{secret:gcp-sm://project/secret}",
  ])("rejects %s", (expr) => {
    expect(() =>
      checkReserved(expr, { file: "t.yaml", line: 1, col: 1 }),
    ).toThrow(ReservedIdentifierError);
  });
});

describe("Reserved E-12 type coercion", () => {
  it.each([
    "{env:FOO|int}",
    "{env:FOO|bool}",
    "{env:FOO|float}",
    // multi-pipe: reserved suffix 가 첫 pipe 에 오면 reject (Π7: Phase 2 upgrade 시 깨지지 않게)
    "{env:FOO|int|bool}",
    "{env:FOO|bool|custom}",
  ])(
    "rejects %s",
    (expr) => {
      expect(() =>
        checkReserved(expr, { file: "t.yaml", line: 1, col: 1 }),
      ).toThrow(ReservedIdentifierError);
    },
  );

  it("allows benign non-reserved pipe suffix", () => {
    // 첫 pipe 가 int/bool/float 가 아니면 passthrough (Phase 1 미예약)
    expect(() =>
      checkReserved("{env:FOO|custom_tag}", {
        file: "t.yaml",
        line: 1,
        col: 1,
      }),
    ).not.toThrow();
  });
});

describe("Reserved E-15 binary encoding", () => {
  it("rejects {file:X|base64}", () => {
    expect(() =>
      checkReserved("{file:cert.pem|base64}", {
        file: "t.yaml",
        line: 1,
        col: 1,
      }),
    ).toThrow(ReservedIdentifierError);
  });
});

describe("Reserved E-11 default variants (Phase 2)", () => {
  it("rejects {env:X-default} (colon 없음)", () => {
    expect(() =>
      checkReserved("{env:FOO-default}", {
        file: "t.yaml",
        line: 1,
        col: 1,
      }),
    ).toThrow(ReservedIdentifierError);
  });

  it("rejects {env:X:?error}", () => {
    expect(() =>
      checkReserved("{env:FOO:?missing}", {
        file: "t.yaml",
        line: 1,
        col: 1,
      }),
    ).toThrow(ReservedIdentifierError);
  });
});

describe("Generic unknown passthrough", () => {
  it("does NOT throw for non-reserved identifiers", () => {
    expect(() =>
      checkReserved("some_future_field", {
        file: "t.yaml",
        line: 1,
        col: 1,
      }),
    ).not.toThrow();
  });

  it("allows Phase 1 default variant {env:X:-default}", () => {
    expect(() =>
      checkReserved("{env:FOO:-bar}", { file: "t.yaml", line: 1, col: 1 }),
    ).not.toThrow();
  });
});

describe("Error message template (§2.3)", () => {
  it("includes location + suggestion", () => {
    // `toThrow(pattern)` 으로 확실히 throw 요구 + message 매칭 — silent pass 방지
    const run = () =>
      checkReserved("include", { file: "x.yaml", line: 7, col: 3 });
    expect(run).toThrow(ReservedIdentifierError);
    expect(run).toThrow(/include/);
    expect(run).toThrow(/x\.yaml:7:3/);
    expect(run).toThrow(/reserved/);
  });
});
```

- [ ] **Step 2: Run test to verify FAIL**

Run: `npx vitest run tests/schema/reserved-identifier-registry.test.ts`
Expected: FAIL with `Cannot find module`.

- [ ] **Step 3: Implement `src/schema/reserved-identifier-registry.ts`**

```typescript
/** §2.1 중앙 Reserved Identifier Registry. Phase 1/2 공통 parse error. */

export interface SourceLoc {
  file: string;
  line: number;
  col: number;
}

export interface ReservedMatch {
  /** Reserved 를 감지한 패턴 이름 (에러 메시지용). */
  kind: string;
  /** 왜 reserved 인지 (Phase 2 기능 이름). */
  reason: string;
  /** Phase 2 에서 대체되는 경로. null 이면 대체 없음. */
  phase2Replacement: string | null;
}

export class ReservedIdentifierError extends Error {
  constructor(
    public readonly identifier: string,
    public readonly location: SourceLoc,
    public readonly match: ReservedMatch,
  ) {
    super(
      `${identifier} is reserved and not supported\n` +
        `  location: ${location.file}:${location.line}:${location.col}\n` +
        `  reason: ${identifier} is reserved for ${match.reason}.\n` +
        `  suggestion: ${match.phase2Replacement ??
          "not supported in Phase 1, see §12 Minority M5"}`,
    );
    this.name = "ReservedIdentifierError";
  }
}

/** Literal Reserved 필드명 (Q3 D4). */
const RESERVED_FIELD_NAMES: Record<string, ReservedMatch> = {
  include: {
    kind: "field",
    reason: "Phase 2 cross_sync: section",
    phase2Replacement: "cross_sync: (Phase 2 신규 섹션)",
  },
  exclude: {
    kind: "field",
    reason: "Phase 2 cross_sync: section",
    phase2Replacement: "cross_sync: (Phase 2 신규 섹션)",
  },
  allow_disassemble: {
    kind: "field",
    reason: "Phase 2 asset-level IR",
    phase2Replacement: null,
  },
  disassembled_sources: {
    kind: "field",
    reason: "Phase 2 asset-level IR",
    phase2Replacement: null,
  },
};

/** Regex 기반 Reserved 보간 문법 (E-6, E-11, E-12, E-15). */
const RESERVED_INTERPOLATION_PATTERNS: Array<{
  pattern: RegExp;
  match: ReservedMatch;
}> = [
  // E-6 Secret backends (prefix 매칭)
  {
    pattern: /\{secret:(1password|keychain|aws-ssm|azure-kv|gcp-sm):\/\/[^}]*\}/,
    match: {
      kind: "secret-backend",
      reason: "Phase 2 structured secret reference",
      phase2Replacement: "Phase 2 secretRef: structured field",
    },
  },
  // E-12 Type coercion — 첫 pipe 뒤가 int/bool/float 중 하나면 reserved (multi-pipe 포함)
  {
    pattern: /\{env:[^}|]+\|(int|bool|float)(?:\||\})/,
    match: {
      kind: "type-coercion",
      reason: "Phase 2 type coercion suffix",
      phase2Replacement: null,
    },
  },
  // E-15 Binary encoding
  {
    pattern: /\{file:[^}|]+\|base64\}/,
    match: {
      kind: "binary-encoding",
      reason: "Phase 2 binary encoding",
      phase2Replacement: null,
    },
  },
  // E-11 Default variants — {env:X-default} (콜론 없음, Docker Compose 변형)
  // 주의: {env:X:-default} 는 Phase 1 허용 (E-11), {env:X-default} 만 reserved
  {
    pattern: /\{env:[a-zA-Z_][a-zA-Z0-9_]*-[^:}]+\}/,
    match: {
      kind: "default-colonless",
      reason: "Phase 2 Docker Compose unset-only default variant",
      phase2Replacement: null,
    },
  },
  // E-11 {env:X:?error} strict error
  {
    pattern: /\{env:[^}:]+:\?[^}]+\}/,
    match: {
      kind: "default-strict-error",
      reason: "Phase 2 strict error message default",
      phase2Replacement: null,
    },
  },
];

/**
 * Manifest 파싱 전 호출. Reserved identifier 만나면 ReservedIdentifierError.
 * Unknown 필드는 passthrough (Π7, §2.4).
 */
export function checkReserved(identifier: string, location: SourceLoc): void {
  // 1) Literal field name
  if (identifier in RESERVED_FIELD_NAMES) {
    throw new ReservedIdentifierError(
      identifier,
      location,
      RESERVED_FIELD_NAMES[identifier]!,
    );
  }

  // 2) Interpolation patterns
  for (const { pattern, match } of RESERVED_INTERPOLATION_PATTERNS) {
    if (pattern.test(identifier)) {
      throw new ReservedIdentifierError(identifier, location, match);
    }
  }

  // 3) Generic unknown → passthrough (no-op)
}

/** 테스트 / debugging 용: 현재 등재된 Reserved 개수. */
export const RESERVED_FIELD_COUNT = Object.keys(RESERVED_FIELD_NAMES).length;
export const RESERVED_PATTERN_COUNT = RESERVED_INTERPOLATION_PATTERNS.length;
```

- [ ] **Step 4: Run test to verify PASS**

Run: `npx vitest run tests/schema/reserved-identifier-registry.test.ts`
Expected: PASS (모든 test).

- [ ] **Step 5: Commit**

```bash
git add src/schema/reserved-identifier-registry.ts tests/schema/reserved-identifier-registry.test.ts
git commit -m "feat(schema): Reserved Identifier Registry (§2, 15 entries)"
```

---

### Task 5 — Interpolation Allowlist + Path Traversal

**Files:**
- Create: `src/schema/interpolation-allowlist.ts`
- Test: `tests/schema/interpolation-allowlist.test.ts`

**Spec reference:** §4.5 allowlist, E-7 자산별 분리, E-9 nested 금지, E-10 path traversal, E-14 depth 1.

- [ ] **Step 1: Write failing test `tests/schema/interpolation-allowlist.test.ts`**

```typescript
import { describe, expect, it } from "vitest";
import {
  containsInterpolation,
  isAllowedField,
  checkNested,
  checkPathTraversal,
  InterpolationError,
} from "../../src/schema/interpolation-allowlist.js";

describe("containsInterpolation", () => {
  it("detects {env:X}", () => {
    expect(containsInterpolation("{env:FOO}")).toBe(true);
  });
  it("detects {file:X}", () => {
    expect(containsInterpolation("hello {file:/tmp/x} world")).toBe(true);
  });
  it("treats {{env:X}} as literal (E-13 escape)", () => {
    expect(containsInterpolation("{{env:FOO}}")).toBe(false);
  });
  it("returns false for plain string", () => {
    expect(containsInterpolation("hello world")).toBe(false);
  });
});

describe("isAllowedField", () => {
  it.each([
    "source.url",
    "source.repo",
    "source.ref",
    "source.version",
    "env.GITHUB_TOKEN",
    "env.API_KEY",
    "authHeader",
    "headers.Authorization",
  ])("allows %s", (field) => {
    expect(isAllowedField(field)).toBe(true);
  });

  it.each(["command", "id", "name", "install", "scope", "enabled"])(
    "rejects %s",
    (field) => {
      expect(isAllowedField(field)).toBe(false);
    },
  );
});

describe("checkNested (E-9 금지)", () => {
  it("accepts flat {env:X}", () => {
    expect(() => checkNested("{env:FOO}")).not.toThrow();
  });

  it("rejects nested {env:TOKEN_${env:ENV_NAME}}", () => {
    expect(() => checkNested("{env:TOKEN_${env:ENV_NAME}}")).toThrow(
      InterpolationError,
    );
  });

  it("rejects nested {env:X_{env:Y}}", () => {
    expect(() => checkNested("{env:X_{env:Y}}")).toThrow(InterpolationError);
  });
});

describe("checkPathTraversal (E-10)", () => {
  const projectRoot = "/home/alice/project";

  it("accepts relative path within project", () => {
    expect(() =>
      checkPathTraversal("config/secret.txt", projectRoot),
    ).not.toThrow();
  });

  it("rejects ../../etc/passwd", () => {
    expect(() =>
      checkPathTraversal("../../etc/passwd", projectRoot),
    ).toThrow(InterpolationError);
  });

  it("accepts ~/.config/concord/key (명시 예외)", () => {
    expect(() =>
      checkPathTraversal("~/.config/concord/key", projectRoot),
    ).not.toThrow();
  });

  it("accepts ~/.concord/token", () => {
    expect(() =>
      checkPathTraversal("~/.concord/token", projectRoot),
    ).not.toThrow();
  });

  it("rejects ~/unrelated/path", () => {
    expect(() =>
      checkPathTraversal("~/unrelated/path", projectRoot),
    ).toThrow(InterpolationError);
  });
});
```

- [ ] **Step 2: Run test to verify FAIL**

Run: `npx vitest run tests/schema/interpolation-allowlist.test.ts`
Expected: FAIL (module missing).

- [ ] **Step 3: Implement `src/schema/interpolation-allowlist.ts`**

```typescript
import * as path from "node:path";
import * as os from "node:os";

export class InterpolationError extends Error {
  constructor(message: string, public readonly detail: string) {
    super(message);
    this.name = "InterpolationError";
  }
}

/**
 * "{env:X}" / "{file:X}" 를 포함하는가? "{{env:X}}" (이중 브레이스) 는 literal 로 간주 (E-13).
 */
export function containsInterpolation(value: string): boolean {
  // {{...}} literal 은 잠시 제거 후 판정
  const stripped = value.replace(/\{\{[^{}]*\}\}/g, "");
  return /\{(env|file):[^{}]+\}/.test(stripped);
}

/** §4.5 / E-7 allowlist. 허용 field path pattern. */
const ALLOWED_PATTERNS: RegExp[] = [
  /^source\.(url|repo|ref|version)$/,
  /^env\.[A-Z_][A-Z0-9_]*$/,
  /^authHeader$/,
  /^headers\.[\w-]+$/,
];

export function isAllowedField(fieldPath: string): boolean {
  return ALLOWED_PATTERNS.some((re) => re.test(fieldPath));
}

/** E-9 nested 보간 금지. `{env:TOKEN_${env:X}}` 같은 형태 감지. */
export function checkNested(value: string): void {
  // 보간 expression 내부에 또 다른 '{' 가 있으면 nested
  const matches = value.match(/\{(env|file):[^{}]*\{/);
  if (matches) {
    throw new InterpolationError(
      `nested interpolation not allowed (E-9)`,
      `expression: ${matches[0]}...`,
    );
  }
}

/** E-10 path traversal 방어. project root + 명시 허용 예외 (~/.config/concord/ / ~/.concord/). */
export function checkPathTraversal(filePath: string, projectRoot: string): void {
  const home = os.homedir();
  const allowedRoots = [
    path.resolve(projectRoot),
    path.join(home, ".config", "concord"),
    path.join(home, ".concord"),
  ];

  const expanded = filePath.startsWith("~")
    ? path.join(home, filePath.slice(2))
    : filePath;
  const resolved = path.resolve(projectRoot, expanded);

  const ok = allowedRoots.some(
    (root) => resolved === root || resolved.startsWith(root + path.sep),
  );
  if (!ok) {
    throw new InterpolationError(
      `path traversal detected`,
      `expression: {file:${filePath}} resolves to ${resolved} (outside allowed roots)`,
    );
  }
}
```

- [ ] **Step 4: Run test to verify PASS**

Run: `npx vitest run tests/schema/interpolation-allowlist.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/schema/interpolation-allowlist.ts tests/schema/interpolation-allowlist.test.ts
git commit -m "feat(schema): interpolation allowlist + nested + path traversal (E-7/E-9/E-10)"
```

---

### Task 6 — Reason Enums (ReasonEnum + InstallReasonEnum)

**Files:**
- Create: `src/schema/capability-matrix.ts` (enum 부분만 먼저)
- Test: `tests/schema/capability-matrix-enums.test.ts`

**Spec reference:** §5.6.2.

- [ ] **Step 1: Write failing test `tests/schema/capability-matrix-enums.test.ts`**

```typescript
import { describe, expect, it } from "vitest";
import {
  ReasonEnum,
  InstallReasonEnum,
} from "../../src/schema/capability-matrix.js";

describe("ReasonEnum", () => {
  it("includes install reasons (§5.6.2)", () => {
    const values = ReasonEnum.options;
    expect(values).toContain("UserExplicit");
    expect(values).toContain("WindowsDefault");
    expect(values).toContain("WSLFilesystem");
  });

  it("includes provider-compat reasons", () => {
    const values = ReasonEnum.options;
    expect(values).toContain("CodexVersionTooOld");
    expect(values).toContain("WindowsUnsupported");
    expect(values).toContain("FeatureFlagDisabled");
    expect(values).toContain("ShellIncompatible");
  });

  it("includes observation-failure reasons", () => {
    const values = ReasonEnum.options;
    expect(values).toContain("PluginJsonMissing");
    expect(values).toContain("ParseFailed");
    expect(values).toContain("NetworkError");
    expect(values).toContain("MinEngineUnmet");
  });

  it("includes EnvVarMissing (E-4, CLI output only)", () => {
    expect(ReasonEnum.options).toContain("EnvVarMissing");
  });

  it("includes status=na reasons", () => {
    expect(ReasonEnum.options).toContain("ProviderNotInstalled");
    expect(ReasonEnum.options).toContain("AssetTypeNotApplicable");
  });
});

describe("InstallReasonEnum ⊂ ReasonEnum (§5.6.2 관계)", () => {
  it("every InstallReasonEnum value is in ReasonEnum", () => {
    for (const v of InstallReasonEnum.options) {
      expect(ReasonEnum.options).toContain(v);
    }
  });

  it("install-provenance-only subset contains WindowsDefault", () => {
    expect(InstallReasonEnum.options).toContain("WindowsDefault");
  });

  it("does not include provider-compat reasons (out of scope)", () => {
    expect(InstallReasonEnum.options).not.toContain("CodexVersionTooOld");
    expect(InstallReasonEnum.options).not.toContain("FeatureFlagDisabled");
  });
});
```

- [ ] **Step 2: Run test to verify FAIL**

Run: `npx vitest run tests/schema/capability-matrix-enums.test.ts`
Expected: FAIL (module missing).

- [ ] **Step 3: Implement `src/schema/capability-matrix.ts` (enum 부분만, 나머지는 Task 7 에서 확장)**

```typescript
import { z } from "zod";

/**
 * §5.6.2 ReasonEnum — capability_matrix 의 status 에 동반되는 사유 고정 집합.
 * Phase 1 은 additive only (Π5). 제거는 breaking.
 */
export const ReasonEnum = z.enum([
  // Install provenance (InstallReasonEnum subset)
  "UserExplicit",
  "Auto",
  "WindowsDefault",
  "NoPrivilege",
  "DevModeDisabled",
  "FsUnsupported",
  "CrossDevice",
  "CrossVolume",
  "PathLimit",
  "PathTooLong",
  "WSLFilesystem",

  // Provider / 실행 호환
  "CodexVersionTooOld",
  "WindowsUnsupported",
  "FeatureFlagDisabled",
  "ShellIncompatible",

  // 관측 실패 (status=failed 용)
  "PluginJsonMissing",
  "ParseFailed",
  "NetworkError",
  "MinEngineUnmet",

  // Error reporting only (E-4, lock 에 기록되지 않음, §8.5)
  "EnvVarMissing",

  // status=na 전용
  "ProviderNotInstalled",
  "AssetTypeNotApplicable",
]);
export type Reason = z.infer<typeof ReasonEnum>;

/** §5.6.2 InstallReasonEnum — install_mode 결정 provenance 전용 subset. */
export const InstallReasonEnum = z.enum([
  "UserExplicit",
  "Auto",
  "WindowsDefault",
  "NoPrivilege",
  "DevModeDisabled",
  "FsUnsupported",
  "CrossDevice",
  "CrossVolume",
  "PathLimit",
  "PathTooLong",
  "WSLFilesystem",
]);
export type InstallReason = z.infer<typeof InstallReasonEnum>;
```

- [ ] **Step 4: Run test to verify PASS**

Run: `npx vitest run tests/schema/capability-matrix-enums.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/schema/capability-matrix.ts tests/schema/capability-matrix-enums.test.ts
git commit -m "feat(schema): ReasonEnum + InstallReasonEnum (§5.6.2, 22+11 entries)"
```

---

### Task 7 — CapabilityMatrixSchema + Symbol Renderer

**Files:**
- Modify: `src/schema/capability-matrix.ts` (append schema + renderer)
- Test: `tests/schema/capability-matrix-schema.test.ts`

**Spec reference:** §5.6.1 / §5.6.3 γ Hybrid (내부 β 4 status + 외부 α 기호).

- [ ] **Step 1: Write failing test `tests/schema/capability-matrix-schema.test.ts`**

```typescript
import { describe, expect, it } from "vitest";
import {
  CapabilityCellSchema,
  CapabilityMatrixSchema,
  renderSymbol,
  type CapabilityCell,
} from "../../src/schema/capability-matrix.js";

describe("CapabilityCellSchema 4 status discriminated union", () => {
  it("accepts status=supported with count", () => {
    const cell = CapabilityCellSchema.parse({
      status: "supported",
      count: 3,
      shell_compatibility: "ok",
      drift_status: "none",
    });
    expect(cell.status).toBe("supported");
  });

  it("accepts status=detected-not-executed with reason", () => {
    const cell = CapabilityCellSchema.parse({
      status: "detected-not-executed",
      count: 0,
      detected: 2,
      reason: "CodexVersionTooOld",
      shell_compatibility: "incompatible",
    });
    expect(cell.status).toBe("detected-not-executed");
  });

  it("accepts status=na with ProviderNotInstalled", () => {
    const cell = CapabilityCellSchema.parse({
      status: "na",
      reason: "ProviderNotInstalled",
    });
    expect(cell.status).toBe("na");
  });

  it("accepts status=failed with reason", () => {
    const cell = CapabilityCellSchema.parse({
      status: "failed",
      reason: "PluginJsonMissing",
    });
    expect(cell.status).toBe("failed");
  });

  it("rejects illegal state (supported+reason) — discriminated union", () => {
    expect(() =>
      CapabilityCellSchema.parse({
        status: "supported",
        count: 1,
        reason: "CodexVersionTooOld",  // supported 에 reason 금지
      }),
    ).toThrow();
  });
});

describe("renderSymbol (§5.6.3 20줄 pure function)", () => {
  it("supported → count as string", () => {
    const cell: CapabilityCell = {
      status: "supported",
      count: 5,
      shell_compatibility: "ok",
      drift_status: "none",
    };
    expect(renderSymbol(cell)).toBe("5");
  });

  it("detected-not-executed → count*", () => {
    const cell: CapabilityCell = {
      status: "detected-not-executed",
      count: 0,
      detected: 2,
      reason: "WindowsUnsupported",
      shell_compatibility: "incompatible",
      drift_status: "none",
    };
    expect(renderSymbol(cell)).toBe("0*");
  });

  it("na → -", () => {
    expect(
      renderSymbol({ status: "na", reason: "ProviderNotInstalled" }),
    ).toBe("-");
  });

  it("failed → ?", () => {
    expect(
      renderSymbol({ status: "failed", reason: "ParseFailed" }),
    ).toBe("?");
  });
});

describe("CapabilityMatrixSchema nested record<provider, record<asset, cell>>", () => {
  it("accepts full 3x6 matrix", () => {
    const matrix = CapabilityMatrixSchema.parse({
      "claude-code": {
        skills: { status: "supported", count: 2, drift_status: "none" },
        subagents: { status: "na", reason: "AssetTypeNotApplicable" },
        hooks: { status: "supported", count: 1, drift_status: "source" },
        mcp_servers: { status: "supported", count: 3, drift_status: "none" },
        instructions: { status: "supported", count: 1, drift_status: "none" },
        plugins: { status: "failed", reason: "PluginJsonMissing" },
      },
      codex: {
        skills: { status: "supported", count: 2, drift_status: "none" },
        subagents: { status: "supported", count: 1, drift_status: "none" },
        hooks: {
          status: "detected-not-executed",
          count: 0,
          detected: 1,
          reason: "CodexVersionTooOld",
          shell_compatibility: "incompatible",
          drift_status: "none",
        },
        mcp_servers: { status: "supported", count: 2, drift_status: "none" },
        instructions: { status: "supported", count: 1, drift_status: "none" },
        plugins: { status: "na", reason: "AssetTypeNotApplicable" },
      },
      opencode: {
        skills: { status: "supported", count: 2, drift_status: "none" },
        subagents: { status: "supported", count: 1, drift_status: "none" },
        hooks: { status: "na", reason: "AssetTypeNotApplicable" },
        mcp_servers: { status: "supported", count: 2, drift_status: "none" },
        instructions: { status: "supported", count: 1, drift_status: "none" },
        plugins: { status: "supported", count: 1, drift_status: "none" },
      },
    });
    expect(matrix["claude-code"]!.hooks.status).toBe("supported");
  });
});
```

- [ ] **Step 2: Run test to verify FAIL**

Run: `npx vitest run tests/schema/capability-matrix-schema.test.ts`
Expected: FAIL (schema/renderSymbol 없음).

- [ ] **Step 3: Append to `src/schema/capability-matrix.ts`**

```typescript
import { AssetType, Provider } from "./types.js";

/** §5.6.1 Q4 γ Hybrid — 4 status discriminated union.
 *  각 variant 는 `.strict()` 로 unknown key 를 거부 — illegal state (예: supported + reason) 반영. */
export const CapabilityCellSchema = z.discriminatedUnion("status", [
  z.object({
    status: z.literal("supported"),
    count: z.number().int().min(0),
    install_mode: z.enum(["symlink", "hardlink", "copy"]).optional(),
    install_reason: InstallReasonEnum.optional(),
    shell_compatibility: z.enum(["ok", "incompatible", "na"]).default("na"),
    drift_status: z
      .enum(["none", "source", "target", "divergent", "env-drift"])
      .default("none"),
  }).strict(),
  z.object({
    status: z.literal("detected-not-executed"),
    count: z.number().int().min(0),
    detected: z.number().int().min(0),
    reason: ReasonEnum,
    install_mode: z.enum(["symlink", "hardlink", "copy"]).optional(),
    install_reason: InstallReasonEnum.optional(),
    shell_compatibility: z.enum(["ok", "incompatible", "na"]).default("na"),
    drift_status: z
      .enum(["none", "source", "target", "divergent", "env-drift"])
      .default("none"),
  }).strict(),
  z.object({
    status: z.literal("na"),
    reason: z.enum(["ProviderNotInstalled", "AssetTypeNotApplicable"]),
  }).strict(),
  z.object({
    status: z.literal("failed"),
    reason: ReasonEnum,
    error_detail: z.string().optional(),
  }).strict(),
]);
export type CapabilityCell = z.infer<typeof CapabilityCellSchema>;

/** Per-provider map. */
const ProviderMatrixSchema = z.record(AssetType, CapabilityCellSchema);

/** §5.6.1 top-level matrix: provider → assetType → cell. */
export const CapabilityMatrixSchema = z.record(Provider, ProviderMatrixSchema);
export type CapabilityMatrix = z.infer<typeof CapabilityMatrixSchema>;

/**
 * §5.6.3 20-line pure renderer.
 * supported → count / detected-not-executed → count* / na → - / failed → ?
 */
export function renderSymbol(cell: CapabilityCell): string {
  switch (cell.status) {
    case "supported":
      return String(cell.count);
    case "detected-not-executed":
      return `${cell.count}*`;
    case "na":
      return "-";
    case "failed":
      return "?";
  }
}
```

- [ ] **Step 4: Run test to verify PASS**

Run: `npx vitest run tests/schema/capability-matrix-schema.test.ts`
Expected: PASS (모든 test).

- [ ] **Step 5: Commit**

```bash
git add src/schema/capability-matrix.ts tests/schema/capability-matrix-schema.test.ts
git commit -m "feat(schema): CapabilityCell 4-status discriminated union + symbol renderer (§5.6)"
```

---

### Task 8 — SourceSchema + PluginSourceSchema

**Files:**
- Create: `src/schema/source.ts`
- Test: `tests/schema/source.test.ts`

**Spec reference:** §4.4 discriminated union, §3.3 β3 α 3 source types.

- [ ] **Step 1: Write failing test `tests/schema/source.test.ts`**

```typescript
import { describe, expect, it } from "vitest";
import {
  SourceSchema,
  PluginSourceSchema,
} from "../../src/schema/source.js";

describe("SourceSchema — 6 types", () => {
  it("accepts git", () => {
    expect(
      SourceSchema.parse({
        type: "git",
        repo: "https://github.com/x/y",
        ref: "main",
      }).type,
    ).toBe("git");
  });

  it("accepts http + sha256", () => {
    expect(
      SourceSchema.parse({
        type: "http",
        url: "https://example.com/file.yaml",
        sha256: "a".repeat(64),
      }).type,
    ).toBe("http");
  });

  it("rejects http without sha256", () => {
    expect(() =>
      SourceSchema.parse({ type: "http", url: "https://x.com/y" }),
    ).toThrow();
  });

  it("rejects http sha256 with wrong length", () => {
    expect(() =>
      SourceSchema.parse({
        type: "http",
        url: "https://x.com/y",
        sha256: "short",
      }),
    ).toThrow();
  });

  it("accepts file / npm / external / adopted", () => {
    expect(SourceSchema.parse({ type: "file", path: "./x" }).type).toBe("file");
    expect(
      SourceSchema.parse({ type: "npm", package: "@x/y", version: "1.0.0" })
        .type,
    ).toBe("npm");
    expect(
      SourceSchema.parse({ type: "external", description: "installed via claude mcp add" })
        .type,
    ).toBe("external");
    expect(
      SourceSchema.parse({ type: "adopted", description: "scanned at 2026-04-22" })
        .type,
    ).toBe("adopted");
  });
});

describe("PluginSourceSchema — β3 α 3 types", () => {
  it("accepts claude-plugin", () => {
    expect(
      PluginSourceSchema.parse({
        type: "claude-plugin",
        marketplace: "anthropic",
        name: "github-integrator",
        version: "1.2.0",
      }).type,
    ).toBe("claude-plugin");
  });

  it("accepts codex-plugin", () => {
    expect(
      PluginSourceSchema.parse({
        type: "codex-plugin",
        marketplace: "openai-codex",
        name: "shell-utils",
        version: "0.3.1",
      }).type,
    ).toBe("codex-plugin");
  });

  it("accepts opencode-plugin", () => {
    expect(
      PluginSourceSchema.parse({
        type: "opencode-plugin",
        package: "@opencode-community/airtable",
        version: "2.0.0",
      }).type,
    ).toBe("opencode-plugin");
  });

  it("rejects unknown plugin type", () => {
    expect(() =>
      PluginSourceSchema.parse({ type: "unknown", name: "x", version: "1" }),
    ).toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify FAIL**

Run: `npx vitest run tests/schema/source.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement `src/schema/source.ts`**

```typescript
import { z } from "zod";

/** §4.4.1 일반 자산 SourceSchema — 6 types. */
export const SourceSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("git"),
    repo: z.string(),
    ref: z.string(),
    path: z.string().optional(),
  }),
  z.object({
    type: z.literal("file"),
    path: z.string(),
  }),
  z.object({
    type: z.literal("http"),
    url: z.url(),  // Zod 4: top-level z.url() (z.string().url() 은 deprecated)
    sha256: z.string().regex(/^[a-f0-9]{64}$/),
  }),
  z.object({
    type: z.literal("npm"),
    package: z.string(),
    version: z.string(),
  }),
  z.object({
    type: z.literal("external"),
    description: z.string(),
  }),
  z.object({
    type: z.literal("adopted"),
    description: z.string(),
  }),
]);
export type Source = z.infer<typeof SourceSchema>;

/** §3.3 / §4.4.2 β3 α — 3 plugin source types. */
export const PluginSourceSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("claude-plugin"),
    marketplace: z.string(),
    name: z.string(),
    version: z.string(),
  }),
  z.object({
    type: z.literal("codex-plugin"),
    marketplace: z.string(),
    name: z.string(),
    version: z.string(),
  }),
  z.object({
    type: z.literal("opencode-plugin"),
    package: z.string(),
    version: z.string(),
  }),
]);
export type PluginSource = z.infer<typeof PluginSourceSchema>;
```

- [ ] **Step 4: Run test to verify PASS**

Run: `npx vitest run tests/schema/source.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/schema/source.ts tests/schema/source.test.ts
git commit -m "feat(schema): SourceSchema (6 types) + PluginSourceSchema (β3 α 3 types)"
```

---

### Task 9 — AssetBaseSchema + `install` Field

**Files:**
- Create: `src/schema/asset-base.ts`
- Test: `tests/schema/asset-base.test.ts`

**Spec reference:** §4.3.1, D-1 install 필드.

- [ ] **Step 1: Write failing test `tests/schema/asset-base.test.ts`**

```typescript
import { describe, expect, it } from "vitest";
import { AssetBaseSchema } from "../../src/schema/asset-base.js";

const MIN = {
  id: "claude-code:skills:x",
  source: { type: "file", path: "./x" },
};

describe("AssetBaseSchema", () => {
  it("accepts minimal entry with defaults", () => {
    const parsed = AssetBaseSchema.parse(MIN);
    expect(parsed.install).toBe("auto");  // default
  });

  it("accepts install=symlink|hardlink|copy|auto", () => {
    for (const m of ["symlink", "hardlink", "copy", "auto"] as const) {
      expect(AssetBaseSchema.parse({ ...MIN, install: m }).install).toBe(m);
    }
  });

  it("rejects install=invalid", () => {
    expect(() => AssetBaseSchema.parse({ ...MIN, install: "junction" })).toThrow();
  });

  it("rejects bad id format (missing colon)", () => {
    expect(() =>
      AssetBaseSchema.parse({ ...MIN, id: "invalid_id_no_colon" }),
    ).toThrow();
  });

  it("accepts target=shared-agents (결정 A)", () => {
    expect(
      AssetBaseSchema.parse({ ...MIN, target: "shared-agents" }).target,
    ).toBe("shared-agents");
  });

  it("passthrough unknown fields (Π2 하위 원칙)", () => {
    const parsed = AssetBaseSchema.parse({ ...MIN, future_field: "xyz" }) as {
      future_field?: string;
    };
    expect(parsed.future_field).toBe("xyz");
  });
});
```

- [ ] **Step 2: Run test to verify FAIL**

Run: `npx vitest run tests/schema/asset-base.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement `src/schema/asset-base.ts`**

```typescript
import { z } from "zod";
import { SourceSchema } from "./source.js";

/** §4.3.1 AssetBaseSchema — 6 자산 타입의 공통 베이스. */
export const AssetBaseSchema = z
  .object({
    id: z.string().regex(/^[a-z0-9-]+(:[a-z0-9-]+){1,2}$/),
    source: SourceSchema,
    scope: z.enum(["enterprise", "user", "project", "local"]).optional(),
    target: z.enum(["shared-agents"]).optional(),
    install: z
      .enum(["symlink", "hardlink", "copy", "auto"])
      .default("auto"),
  })
  .passthrough();

export type AssetBase = z.infer<typeof AssetBaseSchema>;
```

- [ ] **Step 4: Run test to verify PASS**

Run: `npx vitest run tests/schema/asset-base.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/schema/asset-base.ts tests/schema/asset-base.test.ts
git commit -m "feat(schema): AssetBaseSchema with install field (D-1) + passthrough unknowns"
```

---

### Task 10 — SkillAssetSchema + 결정 A Post-validator

**Files:**
- Create: `src/schema/assets/skill.ts`
- Test: `tests/schema/assets/skill.test.ts`

**Spec reference:** §4.3.2, 결정 A A1~A5 (특히 A1 / A4 parse error).

- [ ] **Step 1: Write failing test `tests/schema/assets/skill.test.ts`**

```typescript
import { describe, expect, it } from "vitest";
import {
  SkillAssetSchema,
  checkSkillsPlacement,
} from "../../../src/schema/assets/skill.js";

const MIN_SKILL = {
  id: "claude-code:skills:commit-msg",
  source: { type: "file", path: "./skills/commit-msg" },
};

describe("SkillAssetSchema", () => {
  it("accepts minimal skill entry", () => {
    expect(SkillAssetSchema.parse(MIN_SKILL).id).toBe(
      "claude-code:skills:commit-msg",
    );
  });

  it("accepts type=skills literal", () => {
    expect(SkillAssetSchema.parse({ ...MIN_SKILL, type: "skills" }).type).toBe(
      "skills",
    );
  });
});

describe("checkSkillsPlacement (결정 A A1/A4)", () => {
  it("rejects claude-code + shared-agents (A1/A4)", () => {
    expect(() =>
      checkSkillsPlacement([
        {
          ...MIN_SKILL,
          id: "claude-code:skills:x",
          target: "shared-agents",
        },
      ]),
    ).toThrow(/shared-agents.*claude-code/i);
  });

  it("accepts codex + shared-agents", () => {
    expect(() =>
      checkSkillsPlacement([
        {
          id: "codex:skills:x",
          source: { type: "file", path: "./x" },
          install: "auto",
          target: "shared-agents",
        },
      ]),
    ).not.toThrow();
  });

  it("accepts opencode + shared-agents", () => {
    expect(() =>
      checkSkillsPlacement([
        {
          id: "opencode:skills:x",
          source: { type: "file", path: "./x" },
          install: "auto",
          target: "shared-agents",
        },
      ]),
    ).not.toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify FAIL**

Run: `npx vitest run tests/schema/assets/skill.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement `src/schema/assets/skill.ts`**

```typescript
import { z } from "zod";
import { AssetBaseSchema, type AssetBase } from "../asset-base.js";

/** §4.3.2 SkillAsset. */
export const SkillAssetSchema = AssetBaseSchema.extend({
  type: z.literal("skills").optional(),
});
export type SkillAsset = z.infer<typeof SkillAssetSchema>;

/**
 * 결정 A A1/A4 post-validator.
 * `provider: claude-code` + `target: shared-agents` = parse error.
 * Provider 는 id prefix 에서 추출.
 */
export function checkSkillsPlacement(skills: AssetBase[]): void {
  for (const s of skills) {
    const provider = s.id.split(":")[0];
    if (provider === "claude-code" && s.target === "shared-agents") {
      throw new Error(
        `claude-code skills cannot use target: shared-agents (A1/A4, issue #31005 OPEN)\n` +
          `  id: ${s.id}\n` +
          `  remediation: Remove 'target: shared-agents' or use codex/opencode provider.`,
      );
    }
  }
}
```

- [ ] **Step 4: Run test to verify PASS**

Run: `npx vitest run tests/schema/assets/skill.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/schema/assets/skill.ts tests/schema/assets/skill.test.ts
git commit -m "feat(schema): SkillAssetSchema + A1/A4 post-validator (shared-agents parse error)"
```

---

### Task 11 — SubagentAssetSchema

**Files:**
- Create: `src/schema/assets/subagent.ts`
- Test: `tests/schema/assets/subagent.test.ts`

**Spec reference:** §4.3.3, §3.7.2 (Claude/OpenCode=md-yaml, Codex=toml).

- [ ] **Step 1: Write failing test `tests/schema/assets/subagent.test.ts`**

```typescript
import { describe, expect, it } from "vitest";
import { SubagentAssetSchema } from "../../../src/schema/assets/subagent.js";

const BASE = {
  id: "claude-code:subagents:reviewer",
  source: { type: "file", path: "./agents/reviewer.md" },
};

describe("SubagentAssetSchema", () => {
  it("accepts minimal entry", () => {
    expect(SubagentAssetSchema.parse(BASE).id).toBe(
      "claude-code:subagents:reviewer",
    );
  });

  it("accepts format=md-yaml|toml", () => {
    expect(SubagentAssetSchema.parse({ ...BASE, format: "md-yaml" }).format)
      .toBe("md-yaml");
    expect(
      SubagentAssetSchema.parse({
        id: "codex:subagents:r",
        source: { type: "file", path: "./r.toml" },
        format: "toml",
      }).format,
    ).toBe("toml");
  });

  it("rejects format=markdown (unknown)", () => {
    expect(() =>
      SubagentAssetSchema.parse({ ...BASE, format: "markdown" }),
    ).toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify FAIL**

Run: `npx vitest run tests/schema/assets/subagent.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement `src/schema/assets/subagent.ts`**

```typescript
import { z } from "zod";
import { AssetBaseSchema } from "../asset-base.js";

/** §4.3.3 SubagentAsset. */
export const SubagentAssetSchema = AssetBaseSchema.extend({
  type: z.literal("subagents").optional(),
  format: z.enum(["md-yaml", "toml"]).optional(),
});
export type SubagentAsset = z.infer<typeof SubagentAssetSchema>;
```

- [ ] **Step 4: Run test to verify PASS**

Run: `npx vitest run tests/schema/assets/subagent.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/schema/assets/subagent.ts tests/schema/assets/subagent.test.ts
git commit -m "feat(schema): SubagentAssetSchema (md-yaml | toml)"
```

---

### Task 12 — HookAssetSchema (2-자산 분리)

**Files:**
- Create: `src/schema/assets/hook.ts`
- Test: `tests/schema/assets/hook.test.ts`

**Spec reference:** §3.2 registration + implementation, §4.3.4.

- [ ] **Step 1: Write failing test `tests/schema/assets/hook.test.ts`**

```typescript
import { describe, expect, it } from "vitest";
import { HookAssetSchema } from "../../../src/schema/assets/hook.js";

describe("HookAssetSchema", () => {
  it("accepts registration-only (no implementation)", () => {
    const h = HookAssetSchema.parse({
      id: "claude-code:hooks:pre-commit",
      source: { type: "external", description: "defined in settings.json" },
      event: "PreCommit",
      registration: {
        matcher: "*.ts",
        command: "prettier --write",
        hook_type: "command",
      },
    });
    expect(h.event).toBe("PreCommit");
  });

  it("accepts implementation-only (no registration)", () => {
    expect(
      HookAssetSchema.parse({
        id: "codex:hooks:on-start",
        source: { type: "file", path: "./hooks/on-start.sh" },
        event: "OnStart",
        implementation: {
          source: { type: "file", path: "./hooks/on-start.sh" },
          target_path: "hooks/on-start.sh",
        },
      }).event,
    ).toBe("OnStart");
  });

  it("rejects when both registration and implementation missing", () => {
    expect(() =>
      HookAssetSchema.parse({
        id: "claude-code:hooks:x",
        source: { type: "file", path: "./x" },
        event: "X",
      }),
    ).toThrow(/registration or implementation/);
  });

  it("accepts hook_type ∈ {command, http, prompt, agent}", () => {
    for (const t of ["command", "http", "prompt", "agent"] as const) {
      const h = HookAssetSchema.parse({
        id: "claude-code:hooks:x",
        source: { type: "external", description: "-" },
        event: "X",
        registration: { command: "x", hook_type: t },
      });
      expect(h.registration?.hook_type).toBe(t);
    }
  });
});
```

- [ ] **Step 2: Run test to verify FAIL**

Run: `npx vitest run tests/schema/assets/hook.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement `src/schema/assets/hook.ts`**

```typescript
import { z } from "zod";
import { AssetBaseSchema } from "../asset-base.js";
import { SourceSchema } from "../source.js";

/** §4.3.4 HookAsset — 2-자산 분리 (registration + implementation). */
export const HookAssetSchema = AssetBaseSchema.extend({
  type: z.literal("hooks").optional(),
  event: z.string(),
  registration: z
    .object({
      matcher: z.string().optional(),
      if_condition: z.string().optional(),
      command: z.string().optional(),
      hook_type: z.enum(["command", "http", "prompt", "agent"]).optional(),
    })
    .optional(),
  implementation: z
    .object({
      source: SourceSchema,
      target_path: z.string(),
    })
    .optional(),
}).refine(
  (h) => h.registration !== undefined || h.implementation !== undefined,
  { message: "hooks require at least registration or implementation" },
);
export type HookAsset = z.infer<typeof HookAssetSchema>;
```

- [ ] **Step 4: Run test to verify PASS**

Run: `npx vitest run tests/schema/assets/hook.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/schema/assets/hook.ts tests/schema/assets/hook.test.ts
git commit -m "feat(schema): HookAssetSchema 2-asset split (registration + implementation)"
```

---

### Task 13 — McpServerAssetSchema

**Files:**
- Create: `src/schema/assets/mcp-server.ts`
- Test: `tests/schema/assets/mcp-server.test.ts`

**Spec reference:** §4.3.5, §3.6.

- [ ] **Step 1: Write failing test `tests/schema/assets/mcp-server.test.ts`**

```typescript
import { describe, expect, it } from "vitest";
import { McpServerAssetSchema } from "../../../src/schema/assets/mcp-server.js";

describe("McpServerAssetSchema", () => {
  it("defaults transport=stdio", () => {
    const m = McpServerAssetSchema.parse({
      id: "claude-code:mcp_servers:airtable",
      source: { type: "external", description: "claude mcp add" },
      command: "npx",
      args: ["-y", "airtable-mcp-server"],
    });
    expect(m.transport).toBe("stdio");
  });

  it("accepts transport=http with url", () => {
    const m = McpServerAssetSchema.parse({
      id: "claude-code:mcp_servers:remote",
      source: { type: "external", description: "-" },
      transport: "http",
      url: "https://mcp.example.com",
    });
    expect(m.transport).toBe("http");
  });

  it("accepts env/headers records", () => {
    expect(
      McpServerAssetSchema.parse({
        id: "claude-code:mcp_servers:x",
        source: { type: "external", description: "-" },
        command: "mcp-server",
        env: { GITHUB_TOKEN: "{env:GITHUB_TOKEN}" },
        headers: { Authorization: "Bearer {env:API_KEY}" },
      }).env?.GITHUB_TOKEN,
    ).toBe("{env:GITHUB_TOKEN}");
  });

  it("rejects unknown transport", () => {
    expect(() =>
      McpServerAssetSchema.parse({
        id: "claude-code:mcp_servers:x",
        source: { type: "external", description: "-" },
        transport: "ipc",
      }),
    ).toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify FAIL**

Run: `npx vitest run tests/schema/assets/mcp-server.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement `src/schema/assets/mcp-server.ts`**

```typescript
import { z } from "zod";
import { AssetBaseSchema } from "../asset-base.js";

/** §4.3.5 McpServerAsset. */
export const McpServerAssetSchema = AssetBaseSchema.extend({
  type: z.literal("mcp_servers").optional(),
  transport: z.enum(["stdio", "sse", "http"]).default("stdio"),
  command: z.string().optional(),
  args: z.array(z.string()).optional(),
  url: z.string().optional(),
  env: z.record(z.string(), z.string()).optional(),
  headers: z.record(z.string(), z.string()).optional(),
});
export type McpServerAsset = z.infer<typeof McpServerAssetSchema>;
```

- [ ] **Step 4: Run test to verify PASS**

Run: `npx vitest run tests/schema/assets/mcp-server.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/schema/assets/mcp-server.ts tests/schema/assets/mcp-server.test.ts
git commit -m "feat(schema): McpServerAssetSchema (transport/command/env/headers)"
```

---

### Task 14 — InstructionAssetSchema

**Files:**
- Create: `src/schema/assets/instruction.ts`
- Test: `tests/schema/assets/instruction.test.ts`

**Spec reference:** §4.3.6, §3.7.5.

- [ ] **Step 1: Write failing test `tests/schema/assets/instruction.test.ts`**

```typescript
import { describe, expect, it } from "vitest";
import { InstructionAssetSchema } from "../../../src/schema/assets/instruction.js";

const BASE = {
  id: "claude-code:instructions:claude-md",
  source: { type: "file", path: "./CLAUDE.md" },
};

describe("InstructionAssetSchema", () => {
  it.each(["claude-md", "agents-md", "opencode-instructions"])(
    "accepts target=%s",
    (target) => {
      expect(
        InstructionAssetSchema.parse({ ...BASE, target }).target,
      ).toBe(target);
    },
  );

  it("rejects target=unknown", () => {
    expect(() =>
      InstructionAssetSchema.parse({ ...BASE, target: "readme" }),
    ).toThrow();
  });

  it.each(["file-include", "layered-concat", "array-entry"])(
    "accepts mode=%s",
    (mode) => {
      expect(
        InstructionAssetSchema.parse({
          ...BASE,
          target: "claude-md",
          mode,
        }).mode,
      ).toBe(mode);
    },
  );
});
```

- [ ] **Step 2: Run test to verify FAIL**

Run: `npx vitest run tests/schema/assets/instruction.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement `src/schema/assets/instruction.ts`**

```typescript
import { z } from "zod";
import { AssetBaseSchema } from "../asset-base.js";

/** §4.3.6 InstructionAsset. */
export const InstructionAssetSchema = AssetBaseSchema.extend({
  type: z.literal("instructions").optional(),
  target: z.enum(["claude-md", "agents-md", "opencode-instructions"]),
  mode: z
    .enum(["file-include", "layered-concat", "array-entry"])
    .optional(),
});
export type InstructionAsset = z.infer<typeof InstructionAssetSchema>;
```

- [ ] **Step 4: Run test to verify PASS**

Run: `npx vitest run tests/schema/assets/instruction.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/schema/assets/instruction.ts tests/schema/assets/instruction.test.ts
git commit -m "feat(schema): InstructionAssetSchema (target + mode)"
```

---

### Task 15 — PluginAssetSchema (β3 α)

**Files:**
- Create: `src/schema/assets/plugin.ts`
- Test: `tests/schema/assets/plugin.test.ts`

**Spec reference:** §4.3.7, §3.3 / §3.4 3 플래그, §5.8 dependencies + min_engine.

- [ ] **Step 1: Write failing test `tests/schema/assets/plugin.test.ts`**

```typescript
import { describe, expect, it } from "vitest";
import { PluginAssetSchema } from "../../../src/schema/assets/plugin.js";

const CLAUDE_PLUGIN = {
  id: "claude-code:plugins:github-integrator",
  source: {
    type: "claude-plugin",
    marketplace: "anthropic",
    name: "github-integrator",
    version: "1.2.0",
  },
};

describe("PluginAssetSchema", () => {
  it("accepts minimal claude-plugin with flag defaults", () => {
    const p = PluginAssetSchema.parse(CLAUDE_PLUGIN);
    expect(p.auto_install).toBe(true);
    expect(p.enabled).toBe(true);
    expect(p.purge_on_remove).toBe(false);
  });

  it("accepts codex-plugin + dependencies + min_engine", () => {
    const p = PluginAssetSchema.parse({
      id: "codex:plugins:shell",
      source: {
        type: "codex-plugin",
        marketplace: "openai-codex",
        name: "shell",
        version: "0.3.1",
      },
      dependencies: ["claude-code:plugins:utils"],
      min_engine: "0.119.0",
    });
    expect(p.dependencies).toEqual(["claude-code:plugins:utils"]);
    expect(p.min_engine).toBe("0.119.0");
  });

  it("accepts opencode-plugin with package ref", () => {
    const p = PluginAssetSchema.parse({
      id: "opencode:plugins:airtable",
      source: {
        type: "opencode-plugin",
        package: "@opencode-community/airtable",
        version: "2.0.0",
      },
      enabled: false,
      purge_on_remove: true,
    });
    expect(p.enabled).toBe(false);
    expect(p.purge_on_remove).toBe(true);
  });

  it("rejects non-plugin source types (e.g. git)", () => {
    expect(() =>
      PluginAssetSchema.parse({
        id: "claude-code:plugins:x",
        source: { type: "git", repo: "https://x", ref: "main" },
      }),
    ).toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify FAIL**

Run: `npx vitest run tests/schema/assets/plugin.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement `src/schema/assets/plugin.ts`**

```typescript
import { z } from "zod";
import { AssetBaseSchema } from "../asset-base.js";
import { PluginSourceSchema } from "../source.js";

/** §4.3.7 PluginAsset (β3 α). Plugin 은 source 로 PluginSourceSchema (3 types) 만 허용. */
export const PluginAssetSchema = AssetBaseSchema.omit({ source: true }).extend({
  type: z.literal("plugins").optional(),
  source: PluginSourceSchema,
  auto_install: z.boolean().default(true),
  enabled: z.boolean().default(true),
  purge_on_remove: z.boolean().default(false),
  dependencies: z.array(z.string()).optional(),
  min_engine: z.string().optional(),
});
export type PluginAsset = z.infer<typeof PluginAssetSchema>;
```

- [ ] **Step 4: Run test to verify PASS**

Run: `npx vitest run tests/schema/assets/plugin.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/schema/assets/plugin.ts tests/schema/assets/plugin.test.ts
git commit -m "feat(schema): PluginAssetSchema (β3 α 3 source types + 3 flags + deps)"
```

---

### Task 16 — ManifestSchema Top-level + `concord_version` Semver Constraint

**Files:**
- Create: `src/schema/manifest.ts`
- Test: `tests/schema/manifest.test.ts`

**Spec reference:** §4.2, §4.6 concord_version constraint.

- [ ] **Step 1: Write failing test `tests/schema/manifest.test.ts`**

```typescript
import { describe, expect, it } from "vitest";
import {
  ManifestSchema,
  checkConcordVersion,
} from "../../src/schema/manifest.js";

describe("ManifestSchema top-level", () => {
  it("accepts empty manifest with defaults", () => {
    const m = ManifestSchema.parse({});
    expect(m.skills).toEqual([]);
    expect(m.subagents).toEqual([]);
    expect(m.hooks).toEqual([]);
    expect(m.mcp_servers).toEqual([]);
    expect(m.instructions).toEqual([]);
    expect(m.plugins).toEqual([]);
  });

  it("accepts concord_version constraint string", () => {
    const m = ManifestSchema.parse({ concord_version: ">=0.1" });
    expect(m.concord_version).toBe(">=0.1");
  });

  it("passthrough unknown top-level fields", () => {
    const m = ManifestSchema.parse({ xyz_future: 1 }) as { xyz_future?: number };
    expect(m.xyz_future).toBe(1);
  });
});

describe("checkConcordVersion (§4.6)", () => {
  it("passes when constraint undefined (warning emitted separately)", () => {
    expect(() => checkConcordVersion(undefined, "0.1.0")).not.toThrow();
  });

  it("passes when current version satisfies >=0.1", () => {
    expect(() => checkConcordVersion(">=0.1", "0.1.0")).not.toThrow();
    expect(() => checkConcordVersion(">=0.1", "0.2.5")).not.toThrow();
  });

  it("fails-closed when current version < constraint", () => {
    expect(() => checkConcordVersion(">=0.2", "0.1.0")).toThrow(
      /concord_version/,
    );
  });

  it("fails-closed when constraint invalid", () => {
    expect(() => checkConcordVersion("bad!!", "0.1.0")).toThrow(
      /invalid semver range/i,
    );
  });

  it("accepts caret / tilde ranges", () => {
    expect(() => checkConcordVersion("^0.1.0", "0.1.5")).not.toThrow();
    expect(() => checkConcordVersion("~0.1.0", "0.1.9")).not.toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify FAIL**

Run: `npx vitest run tests/schema/manifest.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement `src/schema/manifest.ts`**

```typescript
import { z } from "zod";
import semver from "semver";
import { SkillAssetSchema } from "./assets/skill.js";
import { SubagentAssetSchema } from "./assets/subagent.js";
import { HookAssetSchema } from "./assets/hook.js";
import { McpServerAssetSchema } from "./assets/mcp-server.js";
import { InstructionAssetSchema } from "./assets/instruction.js";
import { PluginAssetSchema } from "./assets/plugin.js";

/** §4.2 top-level ManifestSchema. */
export const ManifestSchema = z
  .object({
    concord_version: z
      .string()
      .regex(/^[\^~>=<\s\d.*x|-]+$/, "must be a semver range")
      .optional(),
    skills: z.array(SkillAssetSchema).optional().default([]),
    subagents: z.array(SubagentAssetSchema).optional().default([]),
    hooks: z.array(HookAssetSchema).optional().default([]),
    mcp_servers: z.array(McpServerAssetSchema).optional().default([]),
    instructions: z.array(InstructionAssetSchema).optional().default([]),
    plugins: z.array(PluginAssetSchema).optional().default([]),
  })
  .passthrough();

export type Manifest = z.infer<typeof ManifestSchema>;

/**
 * §4.6 concord_version constraint check.
 * - undefined: caller 가 warning 을 emit 할 수 있도록 허용 (fail-closed 아님)
 * - invalid constraint: parse error (fail-closed)
 * - current 가 constraint 불만족: fail-closed
 */
export function checkConcordVersion(
  constraint: string | undefined,
  current: string,
): void {
  if (constraint === undefined) return;

  const valid = semver.validRange(constraint);
  if (valid === null) {
    throw new Error(
      `concord_version: invalid semver range '${constraint}' (§4.6)`,
    );
  }

  if (!semver.satisfies(current, constraint)) {
    throw new Error(
      `concord_version mismatch: current=${current} does not satisfy '${constraint}' (§4.6 fail-closed)`,
    );
  }
}
```

- [ ] **Step 4: Run test to verify PASS**

Run: `npx vitest run tests/schema/manifest.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/schema/manifest.ts tests/schema/manifest.test.ts
git commit -m "feat(schema): ManifestSchema top-level + concord_version semver constraint (§4.6)"
```

---

### Task 17 — YAML Loader (`yaml` eemeli wrapper)

**Files:**
- Create: `src/io/yaml-loader.ts`
- Test: `tests/io/yaml-loader.test.ts`
- Test fixture: `tests/fixtures/manifest-with-comments.yaml`

**Spec reference:** §10.1 format-preserving, POC-3 yaml 확정.

- [ ] **Step 1: Create fixture `tests/fixtures/manifest-with-comments.yaml`**

```yaml
# concord manifest (test fixture)
concord_version: ">=0.1"
skills:
  # first entry
  - id: claude-code:skills:commit-msg
    source:
      type: file
      path: ./skills/commit-msg
    install: auto  # auto default
```

- [ ] **Step 2: Write failing test `tests/io/yaml-loader.test.ts`**

```typescript
import { describe, expect, it } from "vitest";
import * as path from "node:path";
import { loadYaml } from "../../src/io/yaml-loader.js";

const FIXTURE = path.resolve(__dirname, "../fixtures/manifest-with-comments.yaml");

describe("loadYaml", () => {
  it("parses fixture into object", () => {
    const data = loadYaml(FIXTURE);
    expect(data.concord_version).toBe(">=0.1");
    expect(data.skills).toHaveLength(1);
    expect(data.skills[0].id).toBe("claude-code:skills:commit-msg");
  });

  it("throws on non-existent file", () => {
    expect(() => loadYaml("/nonexistent/x.yaml")).toThrow();
  });

  it("throws on invalid YAML", () => {
    const bad = path.resolve(__dirname, "../fixtures/invalid.yaml");
    // fixture 준비는 런타임에 동적으로 — 또는 별도 fixture 파일
    // 여기서는 문자열 기반 parseYamlString 이 더 단순하지만 file API 유지
    expect(() => loadYaml(bad)).toThrow();
  });
});
```

- [ ] **Step 3: Create invalid fixture `tests/fixtures/invalid.yaml`**

```yaml
skills:
  - id: "unterminated
```

- [ ] **Step 4: Run test to verify FAIL**

Run: `npx vitest run tests/io/yaml-loader.test.ts`
Expected: FAIL (module missing).

- [ ] **Step 5: Implement `src/io/yaml-loader.ts`**

```typescript
import * as fs from "node:fs";
import YAML from "yaml";

/**
 * §10.1 POC-3 확정: eemeli/yaml (`yaml` npm) — format-preserving.
 * Plan 1 에선 read-only. Plan 2 의 round-trip writer 는 별도 모듈.
 */
export function loadYaml(filePath: string): Record<string, unknown> {
  const raw = fs.readFileSync(filePath, "utf8");
  const parsed = YAML.parse(raw);
  if (parsed === null || typeof parsed !== "object") {
    throw new Error(`YAML file '${filePath}' did not parse to an object`);
  }
  return parsed as Record<string, unknown>;
}
```

- [ ] **Step 6: Run test to verify PASS**

Run: `npx vitest run tests/io/yaml-loader.test.ts`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/io/yaml-loader.ts tests/io/yaml-loader.test.ts tests/fixtures/manifest-with-comments.yaml tests/fixtures/invalid.yaml
git commit -m "feat(io): YAML loader using eemeli/yaml (POC-3 확정)"
```

---

### Task 18 — `validateManifest` 3-pass Pipeline + D-11 Case-insensitive

**Files:**
- Create: `src/schema/validate-manifest.ts`
- Test: `tests/schema/validate-manifest.test.ts`

**Spec reference:** §4.8 3-pass, D-11 case-insensitive.

- [ ] **Step 1: Write failing test `tests/schema/validate-manifest.test.ts`**

```typescript
import { describe, expect, it } from "vitest";
import { validateManifest } from "../../src/schema/validate-manifest.js";
import { ReservedIdentifierError } from "../../src/schema/reserved-identifier-registry.js";
import { InterpolationError } from "../../src/schema/interpolation-allowlist.js";

describe("validateManifest 3-pass", () => {
  it("accepts valid minimal manifest", () => {
    const m = validateManifest({
      concord_version: ">=0.1",
      skills: [
        {
          id: "claude-code:skills:x",
          source: { type: "file", path: "./x" },
        },
      ],
    });
    expect(m.skills).toHaveLength(1);
  });

  it("fails at pre-validation when include: reserved", () => {
    expect(() =>
      validateManifest({ include: "something" }),
    ).toThrow(ReservedIdentifierError);
  });

  it("fails at pre-validation when {secret:...} reserved", () => {
    expect(() =>
      validateManifest({
        skills: [
          {
            id: "claude-code:skills:x",
            source: {
              type: "file",
              path: "./x",
            },
            env: { X: "{secret:1password://Work/GH/token}" },
          },
        ],
      }),
    ).toThrow(ReservedIdentifierError);
  });

  it("fails at pre-validation when interpolation in non-allowlist field (command)", () => {
    expect(() =>
      validateManifest({
        mcp_servers: [
          {
            id: "claude-code:mcp_servers:x",
            source: { type: "external", description: "-" },
            command: "{env:DANGEROUS}",
          },
        ],
      }),
    ).toThrow(InterpolationError);
  });

  it("fails at Zod parse when invalid schema", () => {
    expect(() =>
      validateManifest({
        skills: [{ id: "bad-no-colon", source: { type: "file", path: "./x" } }],
      }),
    ).toThrow();
  });

  it("fails at post-validation: claude-code + shared-agents (결정 A)", () => {
    expect(() =>
      validateManifest({
        skills: [
          {
            id: "claude-code:skills:x",
            source: { type: "file", path: "./x" },
            target: "shared-agents",
          },
        ],
      }),
    ).toThrow(/shared-agents.*claude-code/i);
  });

  it("fails at post-validation: case-insensitive collision (D-11)", () => {
    expect(() =>
      validateManifest({
        hooks: [
          {
            id: "claude-code:hooks:Hook",
            source: { type: "external", description: "-" },
            event: "X",
            registration: { command: "x", hook_type: "command" },
          },
          {
            id: "claude-code:hooks:hook",
            source: { type: "external", description: "-" },
            event: "X",
            registration: { command: "x", hook_type: "command" },
          },
        ],
      }),
    ).toThrow(/case-insensitive/i);
  });
});
```

- [ ] **Step 2: Run test to verify FAIL**

Run: `npx vitest run tests/schema/validate-manifest.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement `src/schema/validate-manifest.ts`**

```typescript
import { ManifestSchema, type Manifest } from "./manifest.js";
import { checkSkillsPlacement } from "./assets/skill.js";
import {
  checkReserved,
  ReservedIdentifierError,
} from "./reserved-identifier-registry.js";
import {
  containsInterpolation,
  isAllowedField,
  checkNested,
  InterpolationError,
} from "./interpolation-allowlist.js";
import type { AssetBase } from "./asset-base.js";

/**
 * 3-pass validator (§4.8):
 *   1. pre-validation: Reserved identifier + interpolation allowlist + nested
 *   2. Zod parse (ManifestSchema)
 *   3. post-validation: A1/A4 placement + D-11 case-insensitive
 */
export function validateManifest(raw: unknown): Manifest {
  if (typeof raw !== "object" || raw === null) {
    throw new Error("manifest must be an object");
  }

  // 1) Pre-validation
  preValidate(raw as Record<string, unknown>);

  // 2) Zod parse
  const parsed = ManifestSchema.parse(raw);

  // 3) Post-validation
  checkSkillsPlacement(parsed.skills as AssetBase[]);
  checkCaseCollision(parsed);

  return parsed;
}

function preValidate(obj: Record<string, unknown>): void {
  walk(obj, "", (path, value) => {
    // Reserved field names (top-level 또는 자산 수준)
    const leaf = path.split(".").pop() ?? "";
    if (["include", "exclude", "allow_disassemble", "disassembled_sources"].includes(leaf)) {
      throw new ReservedIdentifierError(
        leaf,
        { file: "<manifest>", line: 0, col: 0 },
        {
          kind: "field",
          reason:
            leaf === "include" || leaf === "exclude"
              ? "Phase 2 cross_sync: section"
              : "Phase 2 asset-level IR",
          phase2Replacement:
            leaf === "include" || leaf === "exclude"
              ? "cross_sync: (Phase 2 신규 섹션)"
              : null,
        },
      );
    }

    if (typeof value !== "string") return;

    // Reserved interpolation patterns
    checkReserved(value, { file: "<manifest>", line: 0, col: 0 });

    // Interpolation allowlist (§4.5)
    if (containsInterpolation(value) && !isAllowedField(normalizeFieldPath(path))) {
      throw new InterpolationError(
        `interpolation not allowed in field '${path}' (E-7 allowlist)`,
        `value: ${value}`,
      );
    }

    // E-9 nested
    if (containsInterpolation(value)) {
      checkNested(value);
    }
  });
}

/** Leaf path: "skills[0].source.url" → "source.url" (배열 인덱스 제거). */
function normalizeFieldPath(fullPath: string): string {
  return fullPath.replace(/^[^.]+\./, "").replace(/\[\d+\]/g, "");
}

function walk(
  obj: unknown,
  path: string,
  fn: (path: string, value: unknown) => void,
): void {
  if (Array.isArray(obj)) {
    obj.forEach((item, i) => walk(item, `${path}[${i}]`, fn));
    return;
  }
  if (obj && typeof obj === "object") {
    for (const [k, v] of Object.entries(obj)) {
      const nextPath = path === "" ? k : `${path}.${k}`;
      fn(nextPath, v);
      walk(v, nextPath, fn);
    }
    return;
  }
  fn(path, obj);
}

/** D-11 case-insensitive 충돌 감지. */
function checkCaseCollision(m: Manifest): void {
  const allIds: string[] = [];
  for (const list of [
    m.skills,
    m.subagents,
    m.hooks,
    m.mcp_servers,
    m.instructions,
    m.plugins,
  ]) {
    for (const a of list ?? []) {
      allIds.push(a.id);
    }
  }
  const seen = new Map<string, string>();
  for (const id of allIds) {
    const lower = id.toLowerCase();
    if (seen.has(lower) && seen.get(lower) !== id) {
      throw new Error(
        `error: case-insensitive name collision\n` +
          `  identifiers: ${seen.get(lower)}, ${id}\n` +
          `  reason: Concord requires names to be unique on case-insensitive filesystems (D-11).`,
      );
    }
    seen.set(lower, id);
  }
}
```

- [ ] **Step 4: Run test to verify PASS**

Run: `npx vitest run tests/schema/validate-manifest.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/schema/validate-manifest.ts tests/schema/validate-manifest.test.ts
git commit -m "feat(schema): validateManifest 3-pass (Reserved + allowlist + Zod + A1/D-11)"
```

---

### Task 19 — Scope Precedence Merge (`scope.ts`)

**Files:**
- Create: `src/discovery/scope.ts`
- Test: `tests/discovery/scope.test.ts`

**Spec reference:** §11.2 Locality, §11.5 precedence, E-16 자기 scope 내 보간 후 merge.

- [ ] **Step 1: Write failing test `tests/discovery/scope.test.ts`**

```typescript
import { describe, expect, it } from "vitest";
import { mergeByPrecedence } from "../../src/discovery/scope.js";
import type { Manifest } from "../../src/schema/manifest.js";

function m(id: string): Manifest {
  return {
    skills: [
      { id, source: { type: "file", path: "./x" }, install: "auto" },
    ],
    subagents: [],
    hooks: [],
    mcp_servers: [],
    instructions: [],
    plugins: [],
  } as Manifest;
}

describe("mergeByPrecedence (§11.5)", () => {
  it("local overrides project overrides user overrides enterprise", () => {
    const enterprise = m("claude-code:skills:x");
    const user = m("claude-code:skills:x");
    const project = m("claude-code:skills:x");
    const local = m("claude-code:skills:x");

    // identical id across 4 scopes → only 1 in merged output (local wins)
    const merged = mergeByPrecedence({ enterprise, user, project, local });
    expect(merged.skills).toHaveLength(1);
    expect(merged.skills[0]?.id).toBe("claude-code:skills:x");
  });

  it("merges distinct ids across scopes", () => {
    const user = m("claude-code:skills:a");
    const project = m("claude-code:skills:b");
    const merged = mergeByPrecedence({ user, project });
    const ids = merged.skills.map((s) => s.id).sort();
    expect(ids).toEqual([
      "claude-code:skills:a",
      "claude-code:skills:b",
    ]);
  });

  it("works with undefined scopes", () => {
    const merged = mergeByPrecedence({ user: m("claude-code:skills:x") });
    expect(merged.skills).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run test to verify FAIL**

Run: `npx vitest run tests/discovery/scope.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement `src/discovery/scope.ts`**

```typescript
import type { Manifest } from "../schema/manifest.js";
import type { ConfigScope } from "../schema/types.js";
import { SCOPE_PRECEDENCE } from "../schema/types.js";

export type ManifestByScope = Partial<Record<ConfigScope, Manifest>>;

/**
 * §11.5 precedence merge.
 * Order: enterprise → user → project → local. Later overrides earlier by id.
 * Each scope is already interpolation-resolved (E-16) before reaching here.
 * Merge does NOT re-interpolate (E-14 depth 1).
 */
export function mergeByPrecedence(inputs: ManifestByScope): Manifest {
  const asset_lists: Array<keyof Manifest> = [
    "skills",
    "subagents",
    "hooks",
    "mcp_servers",
    "instructions",
    "plugins",
  ];

  const merged: Manifest = {
    skills: [],
    subagents: [],
    hooks: [],
    mcp_servers: [],
    instructions: [],
    plugins: [],
  } as Manifest;

  const indices: Record<string, Map<string, number>> = {};
  for (const key of asset_lists) indices[key] = new Map();

  for (const scope of SCOPE_PRECEDENCE) {
    const m = inputs[scope];
    if (!m) continue;

    for (const key of asset_lists) {
      const list = (m[key] ?? []) as Array<{ id: string }>;
      for (const item of list) {
        const idx = indices[key]!.get(item.id);
        const target = merged[key] as Array<{ id: string }>;
        if (idx === undefined) {
          indices[key]!.set(item.id, target.length);
          target.push(item);
        } else {
          target[idx] = item;  // later scope overrides
        }
      }
    }
  }

  return merged;
}
```

- [ ] **Step 4: Run test to verify PASS**

Run: `npx vitest run tests/discovery/scope.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/discovery/scope.ts tests/discovery/scope.test.ts
git commit -m "feat(discovery): 4-scope precedence merge (§11.5 / E-16)"
```

---

### Task 20 — LockNodeSchema (3중 Digest + Install/Drift Fields)

**Files:**
- Create: `src/schema/lock-node.ts`
- Test: `tests/schema/lock-node.test.ts`

**Spec reference:** §5.3.1, §5.4 3중 digest, §5.7 install/drift fields.

- [ ] **Step 1: Write failing test `tests/schema/lock-node.test.ts`**

```typescript
import { describe, expect, it } from "vitest";
import { LockNodeSchema } from "../../src/schema/lock-node.js";

const VALID = {
  id: "claude-code:skills:x",
  type: "skills",
  provider: "claude-code",
  source_digest: "sha256:" + "a".repeat(64),
  content_digest: "sha256:" + "b".repeat(64),
  catalog_digest: "sha256:" + "c".repeat(64),
  resolved_source: { type: "file", path: "/abs/x" },
  declared: { id: "claude-code:skills:x", source: { type: "file", path: "./x" } },
  install_mode: "copy",
  install_reason: "WindowsDefault",
  shell_compatibility: "na",
  drift_status: "none",
  raw_hash: "sha256:" + "d".repeat(64),
  normalized_hash: "sha256:" + "e".repeat(64),
  installed_at: "2026-04-22T10:00:00Z",
  install_path: "/home/alice/.claude/skills/x",
};

describe("LockNodeSchema", () => {
  it("accepts valid node", () => {
    const n = LockNodeSchema.parse(VALID);
    expect(n.id).toBe("claude-code:skills:x");
  });

  it("requires sha256:<64-hex> digest format", () => {
    expect(() =>
      LockNodeSchema.parse({ ...VALID, source_digest: "sha256:short" }),
    ).toThrow();
    expect(() =>
      LockNodeSchema.parse({ ...VALID, content_digest: "md5:abc" }),
    ).toThrow();
  });

  it("install_mode enum check", () => {
    for (const m of ["symlink", "hardlink", "copy"] as const) {
      expect(
        LockNodeSchema.parse({ ...VALID, install_mode: m }).install_mode,
      ).toBe(m);
    }
    expect(() =>
      LockNodeSchema.parse({ ...VALID, install_mode: "junction" }),
    ).toThrow();
  });

  it("drift_status enum check with env-drift", () => {
    for (const d of ["none", "source", "target", "divergent", "env-drift"] as const) {
      expect(
        LockNodeSchema.parse({ ...VALID, drift_status: d }).drift_status,
      ).toBe(d);
    }
  });

  it("optional dependencies + min_engine", () => {
    const n = LockNodeSchema.parse({
      ...VALID,
      dependencies: ["claude-code:plugins:helper"],
      min_engine: "2.0.0",
    });
    expect(n.dependencies).toEqual(["claude-code:plugins:helper"]);
  });
});
```

- [ ] **Step 2: Run test to verify FAIL**

Run: `npx vitest run tests/schema/lock-node.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement `src/schema/lock-node.ts`**

```typescript
import { z } from "zod";
import { AssetType, Provider } from "./types.js";
import { InstallReasonEnum } from "./capability-matrix.js";
import { SourceSchema, PluginSourceSchema } from "./source.js";

const Sha256String = z.string().regex(/^sha256:[a-f0-9]{64}$/);

const ResolvedSourceSchema = z.union([SourceSchema, PluginSourceSchema]);

/** §5.3.1 LockNode. */
export const LockNodeSchema = z.object({
  id: z.string(),
  type: AssetType,
  provider: Provider,

  // §5.4 3중 digest
  source_digest: Sha256String,
  content_digest: Sha256String,
  catalog_digest: Sha256String,

  // §5.5 자산별 필드 분리 (3 bins)
  standard_fields: z.record(z.string(), z.unknown()).default({}),
  concord_fields: z.record(z.string(), z.unknown()).default({}),
  protocol_fields: z.record(z.string(), z.unknown()).default({}),

  resolved_source: ResolvedSourceSchema,
  declared: z.record(z.string(), z.unknown()),

  // §5.7 결정 D 확장
  install_mode: z.enum(["symlink", "hardlink", "copy"]),
  install_reason: InstallReasonEnum,
  shell_compatibility: z.enum(["ok", "incompatible", "na"]).default("na"),
  drift_status: z
    .enum(["none", "source", "target", "divergent", "env-drift"])
    .default("none"),

  // §5.11 raw vs normalized
  raw_hash: Sha256String,
  normalized_hash: Sha256String,

  // §5.8 Claude transitive + min_engine
  dependencies: z.array(z.string()).optional(),
  min_engine: z.string().optional(),

  installed_at: z.string().datetime(),
  install_path: z.string(),
});
export type LockNode = z.infer<typeof LockNodeSchema>;
```

- [ ] **Step 4: Run test to verify PASS**

Run: `npx vitest run tests/schema/lock-node.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/schema/lock-node.ts tests/schema/lock-node.test.ts
git commit -m "feat(schema): LockNodeSchema (3중 digest + install/drift fields)"
```

---

### Task 21 — LockSchema + `phase2_projections` Optional + Symlink Drift Refine

**Files:**
- Create: `src/schema/lock.ts`
- Test: `tests/schema/lock.test.ts`

**Spec reference:** §5.1, §5.2 lockfile_version, §5.9 phase2_projections optional, §7.3.1 symlink drift refine.

- [ ] **Step 1: Write failing test `tests/schema/lock.test.ts`**

```typescript
import { describe, expect, it } from "vitest";
import { LockSchema } from "../../src/schema/lock.js";

const NODE = {
  id: "x",
  type: "skills",
  provider: "claude-code",
  source_digest: "sha256:" + "a".repeat(64),
  content_digest: "sha256:" + "b".repeat(64),
  catalog_digest: "sha256:" + "c".repeat(64),
  resolved_source: { type: "file", path: "/abs/x" },
  declared: { id: "x", source: { type: "file", path: "./x" } },
  install_mode: "copy",
  install_reason: "Auto",
  shell_compatibility: "na",
  drift_status: "none",
  raw_hash: "sha256:" + "d".repeat(64),
  normalized_hash: "sha256:" + "e".repeat(64),
  installed_at: "2026-04-22T10:00:00Z",
  install_path: "/home/alice/.claude/skills/x",
};

const BASE = {
  lockfile_version: 1,
  generated_at: "2026-04-22T10:00:00Z",
  generated_by: "concord@0.1.0",
  scope: "project",
  roots: ["x"],
  nodes: { x: NODE },
  capability_matrix: {
    "claude-code": {
      skills: { status: "supported", count: 1, drift_status: "none" },
    },
  },
};

describe("LockSchema", () => {
  it("accepts valid minimal lock", () => {
    expect(LockSchema.parse(BASE).lockfile_version).toBe(1);
  });

  it("rejects lockfile_version !== 1", () => {
    expect(() => LockSchema.parse({ ...BASE, lockfile_version: 2 })).toThrow();
  });

  it("phase2_projections is optional (Phase 1 unused)", () => {
    const lock = LockSchema.parse(BASE);
    expect(lock.phase2_projections).toBeUndefined();
  });

  it("accepts phase2_projections if provided (Phase 2 forward compat)", () => {
    const lock = LockSchema.parse({
      ...BASE,
      phase2_projections: { some_future_key: {} },
    });
    expect(lock.phase2_projections).toEqual({ some_future_key: {} });
  });

  describe("§7.3.1 symlink drift cross-validation (refine)", () => {
    it("rejects install_mode=symlink + drift_status=target", () => {
      const badNode = { ...NODE, install_mode: "symlink", drift_status: "target" };
      expect(() =>
        LockSchema.parse({ ...BASE, nodes: { x: badNode } }),
      ).toThrow(/symlink.*drift/i);
    });

    it("rejects install_mode=symlink + drift_status=divergent", () => {
      const badNode = { ...NODE, install_mode: "symlink", drift_status: "divergent" };
      expect(() =>
        LockSchema.parse({ ...BASE, nodes: { x: badNode } }),
      ).toThrow(/symlink.*drift/i);
    });

    it("allows install_mode=symlink + drift_status ∈ {none, source, env-drift}", () => {
      for (const d of ["none", "source", "env-drift"] as const) {
        const goodNode = { ...NODE, install_mode: "symlink", drift_status: d };
        expect(() =>
          LockSchema.parse({ ...BASE, nodes: { x: goodNode } }),
        ).not.toThrow();
      }
    });

    it("allows install_mode=copy + any drift_status", () => {
      for (const d of ["none", "source", "target", "divergent", "env-drift"] as const) {
        const goodNode = { ...NODE, install_mode: "copy", drift_status: d };
        expect(() =>
          LockSchema.parse({ ...BASE, nodes: { x: goodNode } }),
        ).not.toThrow();
      }
    });
  });
});
```

- [ ] **Step 2: Run test to verify FAIL**

Run: `npx vitest run tests/schema/lock.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement `src/schema/lock.ts`**

```typescript
import { z } from "zod";
import { ConfigScope } from "./types.js";
import { CapabilityMatrixSchema } from "./capability-matrix.js";
import { LockNodeSchema } from "./lock-node.js";

/** §5.1 top-level LockSchema + §5.9 phase2_projections optional + §7.3.1 refine. */
export const LockSchema = z
  .object({
    lockfile_version: z.literal(1),
    generated_at: z.string().datetime(),
    generated_by: z.string(),
    scope: ConfigScope,
    roots: z.array(z.string()),
    nodes: z.record(z.string(), LockNodeSchema),
    capability_matrix: CapabilityMatrixSchema,
    // §5.9 Phase 1 에선 optional — 위치 미확정 (M5)
    phase2_projections: z.record(z.string(), z.unknown()).optional(),
  })
  .refine(
    (lock) => {
      // §7.3.1 Symlink drift cross-check: install_mode=symlink 이면 drift ∈ {none, source, env-drift}
      for (const node of Object.values(lock.nodes)) {
        if (
          node.install_mode === "symlink" &&
          !["none", "source", "env-drift"].includes(node.drift_status)
        ) {
          return false;
        }
      }
      return true;
    },
    {
      message:
        "symlink install_mode cannot have target/divergent drift_status (§7.3.1)",
    },
  );
export type Lock = z.infer<typeof LockSchema>;
```

- [ ] **Step 4: Run test to verify PASS**

Run: `npx vitest run tests/schema/lock.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/schema/lock.ts tests/schema/lock.test.ts
git commit -m "feat(schema): LockSchema + phase2_projections optional + symlink drift refine"
```

---

### Task 22 — Lock Read I/O (`lock-io.ts`)

**Files:**
- Create: `src/io/lock-io.ts`
- Test: `tests/io/lock-io.test.ts`
- Test fixture: `tests/fixtures/lock-valid.json`

**Spec reference:** §5.12 validator + §10 round-trip (Plan 1 은 read only).

- [ ] **Step 1: Create fixture `tests/fixtures/lock-valid.json`**

```json
{
  "lockfile_version": 1,
  "generated_at": "2026-04-22T10:00:00Z",
  "generated_by": "concord@0.1.0",
  "scope": "project",
  "roots": ["claude-code:skills:commit-msg"],
  "nodes": {
    "claude-code:skills:commit-msg": {
      "id": "claude-code:skills:commit-msg",
      "type": "skills",
      "provider": "claude-code",
      "source_digest": "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      "content_digest": "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
      "catalog_digest": "sha256:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
      "resolved_source": { "type": "file", "path": "/abs/commit-msg" },
      "declared": { "id": "claude-code:skills:commit-msg", "source": { "type": "file", "path": "./skills/commit-msg" } },
      "install_mode": "copy",
      "install_reason": "WindowsDefault",
      "shell_compatibility": "na",
      "drift_status": "none",
      "raw_hash": "sha256:dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd",
      "normalized_hash": "sha256:eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
      "installed_at": "2026-04-22T10:00:00Z",
      "install_path": "/home/alice/.claude/skills/commit-msg"
    }
  },
  "capability_matrix": {
    "claude-code": {
      "skills": { "status": "supported", "count": 1, "drift_status": "none" }
    }
  }
}
```

- [ ] **Step 2: Write failing test `tests/io/lock-io.test.ts`**

```typescript
import { describe, expect, it } from "vitest";
import * as path from "node:path";
import { readLock } from "../../src/io/lock-io.js";

const FIXTURE = path.resolve(__dirname, "../fixtures/lock-valid.json");

describe("readLock", () => {
  it("parses JSON lock file", () => {
    const lock = readLock(FIXTURE);
    expect(lock.lockfile_version).toBe(1);
    expect(lock.roots).toEqual(["claude-code:skills:commit-msg"]);
    expect(Object.keys(lock.nodes)).toHaveLength(1);
  });

  it("throws on non-existent file", () => {
    expect(() => readLock("/nonexistent/lock.json")).toThrow();
  });
});
```

- [ ] **Step 3: Run test to verify FAIL**

Run: `npx vitest run tests/io/lock-io.test.ts`
Expected: FAIL.

- [ ] **Step 4: Implement `src/io/lock-io.ts`**

```typescript
import * as fs from "node:fs";

/** §5 Lock file reader. Plan 1 은 read-only; write 는 Plan 2 에서. */
export function readLock(filePath: string): Record<string, unknown> {
  const raw = fs.readFileSync(filePath, "utf8");
  const parsed = JSON.parse(raw);
  if (parsed === null || typeof parsed !== "object") {
    throw new Error(`Lock file '${filePath}' did not parse to an object`);
  }
  return parsed as Record<string, unknown>;
}
```

- [ ] **Step 5: Run test to verify PASS**

Run: `npx vitest run tests/io/lock-io.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/io/lock-io.ts tests/io/lock-io.test.ts tests/fixtures/lock-valid.json
git commit -m "feat(io): Lock read (Plan 1 read-only, write in Plan 2)"
```

---

### Task 23 — `validateLock` + I1/I5/I6 Invariant Checks

**Files:**
- Create: `src/schema/validate-lock.ts`
- Test: `tests/schema/validate-lock.test.ts`

**Spec reference:** §5.12 validator + §5.10 I1/I5/I6.

- [ ] **Step 1: Write failing test `tests/schema/validate-lock.test.ts`**

```typescript
import { describe, expect, it } from "vitest";
import { validateLock } from "../../src/schema/validate-lock.js";

const NODE = {
  id: "x",
  type: "skills",
  provider: "claude-code",
  source_digest: "sha256:" + "a".repeat(64),
  content_digest: "sha256:" + "b".repeat(64),
  catalog_digest: "sha256:" + "c".repeat(64),
  resolved_source: { type: "file", path: "/abs/x" },
  declared: { id: "x", source: { type: "file", path: "./x" } },
  install_mode: "copy",
  install_reason: "Auto",
  shell_compatibility: "na",
  drift_status: "none",
  raw_hash: "sha256:" + "d".repeat(64),
  normalized_hash: "sha256:" + "e".repeat(64),
  installed_at: "2026-04-22T10:00:00Z",
  install_path: "/home/alice/.claude/skills/x",
};

const VALID = {
  lockfile_version: 1,
  generated_at: "2026-04-22T10:00:00Z",
  generated_by: "concord@0.1.0",
  scope: "project",
  roots: ["x"],
  nodes: { x: NODE },
  capability_matrix: {
    "claude-code": {
      skills: { status: "supported", count: 1, drift_status: "none" },
    },
  },
};

describe("validateLock", () => {
  it("accepts valid lock", () => {
    expect(validateLock(VALID).lockfile_version).toBe(1);
  });

  it("I5 secret leak: resolved env value in declared → throw", () => {
    // declared 에 {env:...} 가 아닌 실제 토큰 형태의 값 (ghp_ prefix) 가 들어 있으면 의심
    const leaky = {
      ...VALID,
      nodes: {
        x: {
          ...NODE,
          declared: {
            ...NODE.declared,
            env: { GITHUB_TOKEN: "ghp_abcdef1234567890" },
          },
        },
      },
    };
    expect(() => validateLock(leaky)).toThrow(/secret/i);
  });

  it("I5 allows unresolved expression in declared", () => {
    const ok = {
      ...VALID,
      nodes: {
        x: {
          ...NODE,
          declared: {
            ...NODE.declared,
            env: { GITHUB_TOKEN: "{env:GITHUB_TOKEN}" },
          },
        },
      },
    };
    expect(() => validateLock(ok)).not.toThrow();
  });

  it("I6 Plugin intact: declared passthrough preserved as-is", () => {
    // declared 는 record<string, unknown> — schema 가 수정하지 않음
    const withExtra = {
      ...VALID,
      nodes: {
        x: {
          ...NODE,
          declared: {
            ...NODE.declared,
            future_author_field: { nested: "value" },
          },
        },
      },
    };
    const lock = validateLock(withExtra);
    const node = lock.nodes["x"];
    expect(node).toBeDefined();
    expect(
      (node!.declared as { future_author_field?: unknown }).future_author_field,
    ).toEqual({ nested: "value" });
  });

  it("rejects lockfile_version != 1 (fail-closed)", () => {
    expect(() => validateLock({ ...VALID, lockfile_version: 2 })).toThrow(
      /lockfile_version/,
    );
  });
});
```

- [ ] **Step 2: Run test to verify FAIL**

Run: `npx vitest run tests/schema/validate-lock.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement `src/schema/validate-lock.ts`**

```typescript
import { LockSchema, type Lock } from "./lock.js";

/** §5.12 validator + §5.10 I1/I5/I6 checks. */
export function validateLock(raw: unknown): Lock {
  if (
    raw === null ||
    typeof raw !== "object" ||
    (raw as { lockfile_version?: unknown }).lockfile_version !== 1
  ) {
    throw new Error(
      "lockfile_version must be 1 (Phase 1 fail-closed, §5.2)",
    );
  }

  const lock = LockSchema.parse(raw);

  checkNoSecretLeak(lock);
  // I6 Plugin intact 는 Zod passthrough 로 자동 보장됨 (declared 는 record<string, unknown>).

  return lock;
}

/**
 * §5.10 I5: Lock 에 resolved secret value 가 들어있지 않은지 heuristic check.
 * 완벽한 검증은 불가능 (임의 문자열 전부 검사 못 함).
 * 실전에서 흔한 토큰 prefix 만 탐지 (ghp_/xoxp_/sk-/AKIA 등).
 */
function checkNoSecretLeak(lock: Lock): void {
  const suspicious = /\b(ghp_|github_pat_|xoxp-|sk-[A-Za-z0-9]|AKIA[0-9A-Z])/;
  walkStrings(lock, (value) => {
    if (suspicious.test(value)) {
      throw new Error(
        `Lock contains suspected resolved secret value (I5 violation).\n` +
          `  hint: Lock must store unresolved {env:X} / {file:X} expressions only (E-3).`,
      );
    }
  });
}

function walkStrings(obj: unknown, fn: (s: string) => void): void {
  if (typeof obj === "string") {
    fn(obj);
    return;
  }
  if (Array.isArray(obj)) {
    for (const item of obj) walkStrings(item, fn);
    return;
  }
  if (obj && typeof obj === "object") {
    for (const v of Object.values(obj)) walkStrings(v, fn);
  }
}
```

- [ ] **Step 4: Run test to verify PASS**

Run: `npx vitest run tests/schema/validate-lock.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/schema/validate-lock.ts tests/schema/validate-lock.test.ts
git commit -m "feat(schema): validateLock + I1/I5/I6 invariant checks"
```

---

### Task 24 — CLI Skeleton (commander) + `concord validate`

**Files:**
- Create: `src/cli/index.ts`, `src/cli/commands/validate.ts`
- Modify: `src/index.ts` (stub → real dispatch)
- Test: `tests/cli/validate.test.ts`

**Spec reference:** §6.1 명령 세트, §4.8 validator pipeline.

- [ ] **Step 1: Write failing test `tests/cli/validate.test.ts`**

```typescript
import { describe, expect, it } from "vitest";
import * as path from "node:path";
import { runCli } from "../../src/cli/index.js";

const VALID = path.resolve(__dirname, "../fixtures/manifest-with-comments.yaml");
const RESERVED = path.resolve(__dirname, "../fixtures/manifest-reserved.yaml");
const CASE_COLLISION = path.resolve(__dirname, "../fixtures/manifest-case-collision.yaml");

describe("concord validate", () => {
  it("exits 0 for valid manifest", async () => {
    const code = await runCli(["validate", VALID]);
    expect(code).toBe(0);
  });

  it("exits non-zero for manifest with reserved identifier", async () => {
    const code = await runCli(["validate", RESERVED]);
    expect(code).not.toBe(0);
  });

  it("exits non-zero for case-insensitive collision", async () => {
    const code = await runCli(["validate", CASE_COLLISION]);
    expect(code).not.toBe(0);
  });
});
```

- [ ] **Step 2: Create additional fixtures**

`tests/fixtures/manifest-reserved.yaml`:
```yaml
# include: is Reserved (§2.1.1)
include:
  - something
```

`tests/fixtures/manifest-case-collision.yaml`:
```yaml
hooks:
  - id: claude-code:hooks:Hook
    source: { type: external, description: "-" }
    event: X
    registration: { command: "x", hook_type: command }
  - id: claude-code:hooks:hook
    source: { type: external, description: "-" }
    event: X
    registration: { command: "x", hook_type: command }
```

- [ ] **Step 3: Run test to verify FAIL**

Run: `npx vitest run tests/cli/validate.test.ts`
Expected: FAIL.

- [ ] **Step 4: Implement `src/cli/commands/validate.ts`**

```typescript
import { loadYaml } from "../../io/yaml-loader.js";
import { validateManifest } from "../../schema/validate-manifest.js";

export async function validateCommand(
  manifestPath: string,
): Promise<number> {
  try {
    const raw = loadYaml(manifestPath);
    const m = validateManifest(raw);
    const total =
      m.skills.length +
      m.subagents.length +
      m.hooks.length +
      m.mcp_servers.length +
      m.instructions.length +
      m.plugins.length;
    console.log(`OK: ${manifestPath} (${total} assets)`);
    return 0;
  } catch (e) {
    console.error(`FAIL: ${manifestPath}`);
    console.error((e as Error).message);
    return 1;
  }
}
```

- [ ] **Step 5: Implement `src/cli/index.ts`**

```typescript
import { Command } from "commander";
import { validateCommand } from "./commands/validate.js";

export async function runCli(argv: string[]): Promise<number> {
  const program = new Command();
  program.name("concord").version("0.1.0");

  let exitCode = 0;

  program
    .command("validate <manifest>")
    .description("Validate a manifest against schema + Reserved Registry + allowlist")
    .action(async (manifest: string) => {
      exitCode = await validateCommand(manifest);
    });

  // Task 25/26 에서 lint / list 명령 추가

  await program.parseAsync(argv, { from: "user" });
  return exitCode;
}

// Direct CLI invocation (from bin)
export async function run(argv: string[]): Promise<void> {
  const code = await runCli(argv);
  process.exit(code);
}
```

- [ ] **Step 6: Modify `src/index.ts` to delegate**

```typescript
#!/usr/bin/env node
import { run } from "./cli/index.js";

run(process.argv.slice(2)).catch((err) => {
  console.error(err);
  process.exit(1);
});
```

- [ ] **Step 7: Run test to verify PASS**

Run: `npx vitest run tests/cli/validate.test.ts`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/cli/index.ts src/cli/commands/validate.ts src/index.ts tests/cli/validate.test.ts tests/fixtures/manifest-reserved.yaml tests/fixtures/manifest-case-collision.yaml
git commit -m "feat(cli): concord validate + commander skeleton"
```

---

### Task 25 — `concord lint` (Pre-validation Only)

**Files:**
- Create: `src/cli/commands/lint.ts`
- Modify: `src/cli/index.ts` (add lint command)
- Test: `tests/cli/lint.test.ts`

**Purpose:** Lint 은 pre-validation (Reserved + allowlist + nested) 만 수행. Zod schema 와 post-validation 은 skip. 빠른 문법 검사용.

- [ ] **Step 1: Write failing test `tests/cli/lint.test.ts`**

```typescript
import { describe, expect, it } from "vitest";
import * as path from "node:path";
import { runCli } from "../../src/cli/index.js";

const VALID = path.resolve(__dirname, "../fixtures/manifest-with-comments.yaml");
const RESERVED = path.resolve(__dirname, "../fixtures/manifest-reserved.yaml");
const CASE_COLLISION = path.resolve(__dirname, "../fixtures/manifest-case-collision.yaml");

describe("concord lint", () => {
  it("exits 0 for valid manifest", async () => {
    expect(await runCli(["lint", VALID])).toBe(0);
  });

  it("exits non-zero for reserved identifier", async () => {
    expect(await runCli(["lint", RESERVED])).not.toBe(0);
  });

  it("exits 0 for case-collision (lint does not run post-validation)", async () => {
    // lint 은 Reserved + interpolation 만 검증, case collision 은 post-validation
    expect(await runCli(["lint", CASE_COLLISION])).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify FAIL**

Run: `npx vitest run tests/cli/lint.test.ts`
Expected: FAIL (`lint` command 없음).

- [ ] **Step 3: Implement `src/cli/commands/lint.ts`**

```typescript
import { loadYaml } from "../../io/yaml-loader.js";
import {
  checkReserved,
  ReservedIdentifierError,
} from "../../schema/reserved-identifier-registry.js";
import {
  containsInterpolation,
  isAllowedField,
  checkNested,
  InterpolationError,
} from "../../schema/interpolation-allowlist.js";

/** Lint = pre-validation only. Reserved + allowlist + nested. */
export async function lintCommand(manifestPath: string): Promise<number> {
  try {
    const raw = loadYaml(manifestPath);
    walk(raw, "", (path, value) => {
      const leaf = path.split(".").pop() ?? "";
      if (
        ["include", "exclude", "allow_disassemble", "disassembled_sources"].includes(
          leaf,
        )
      ) {
        throw new ReservedIdentifierError(
          leaf,
          { file: manifestPath, line: 0, col: 0 },
          {
            kind: "field",
            reason: "Phase 2 reserved",
            phase2Replacement: null,
          },
        );
      }
      if (typeof value !== "string") return;
      checkReserved(value, { file: manifestPath, line: 0, col: 0 });
      if (containsInterpolation(value)) {
        if (!isAllowedField(path.replace(/^[^.]+\./, "").replace(/\[\d+\]/g, ""))) {
          throw new InterpolationError(
            `interpolation not allowed in field '${path}' (E-7)`,
            `value: ${value}`,
          );
        }
        checkNested(value);
      }
    });
    console.log(`LINT OK: ${manifestPath}`);
    return 0;
  } catch (e) {
    console.error(`LINT FAIL: ${manifestPath}`);
    console.error((e as Error).message);
    return 1;
  }
}

function walk(
  obj: unknown,
  path: string,
  fn: (path: string, value: unknown) => void,
): void {
  if (Array.isArray(obj)) {
    obj.forEach((item, i) => walk(item, `${path}[${i}]`, fn));
    return;
  }
  if (obj && typeof obj === "object") {
    for (const [k, v] of Object.entries(obj)) {
      const next = path === "" ? k : `${path}.${k}`;
      fn(next, v);
      walk(v, next, fn);
    }
    return;
  }
  fn(path, obj);
}
```

- [ ] **Step 4: Modify `src/cli/index.ts` — add lint subcommand**

Add after validate action:

```typescript
  program
    .command("lint <manifest>")
    .description("Lint manifest (Reserved Registry + interpolation allowlist only)")
    .action(async (manifest: string) => {
      const { lintCommand } = await import("./commands/lint.js");
      exitCode = await lintCommand(manifest);
    });
```

- [ ] **Step 5: Run test to verify PASS**

Run: `npx vitest run tests/cli/lint.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/cli/commands/lint.ts src/cli/index.ts tests/cli/lint.test.ts
git commit -m "feat(cli): concord lint (pre-validation only, fast check)"
```

---

### Task 26 — `concord list --dry-run`

**Files:**
- Create: `src/cli/commands/list.ts`
- Modify: `src/cli/index.ts` (add list command)
- Test: `tests/cli/list.test.ts`

**Purpose:** Read lock file 하고 installed entry 나열. Dry-run 이므로 실제 fs 스캔 없이 lock 만 참조.

- [ ] **Step 1: Write failing test `tests/cli/list.test.ts`**

```typescript
import { describe, expect, it } from "vitest";
import * as path from "node:path";
import { listCommand } from "../../src/cli/commands/list.js";

const LOCK = path.resolve(__dirname, "../fixtures/lock-valid.json");

describe("concord list --dry-run", () => {
  it("returns exit 0 + produces output listing nodes", async () => {
    const lines: string[] = [];
    const code = await listCommand(LOCK, (msg) => lines.push(msg));
    expect(code).toBe(0);
    const out = lines.join("\n");
    expect(out).toContain("claude-code:skills:commit-msg");
  });

  it("exits non-zero for missing lock", async () => {
    const code = await listCommand("/nonexistent/lock.json", () => {});
    expect(code).not.toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify FAIL**

Run: `npx vitest run tests/cli/list.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement `src/cli/commands/list.ts`**

```typescript
import { readLock } from "../../io/lock-io.js";
import { validateLock } from "../../schema/validate-lock.js";

type Out = (msg: string) => void;

export async function listCommand(
  lockPath: string,
  out: Out = console.log,
): Promise<number> {
  try {
    const raw = readLock(lockPath);
    const lock = validateLock(raw);
    out(`scope: ${lock.scope}`);
    for (const [id, node] of Object.entries(lock.nodes)) {
      const drift =
        node.drift_status === "none" ? "" : `  (drift: ${node.drift_status})`;
      out(`  ${id}  @ ${node.install_path}${drift}`);
    }
    return 0;
  } catch (e) {
    console.error(`LIST FAIL: ${lockPath}`);
    console.error((e as Error).message);
    return 1;
  }
}
```

- [ ] **Step 4: Modify `src/cli/index.ts` — add list subcommand**

```typescript
  program
    .command("list")
    .description("List installed entries from concord.lock (dry-run only, Plan 1)")
    .option("--lock <path>", "Path to lock file", "concord.lock")
    .option("--dry-run", "Read-only listing (default in Plan 1)", true)
    .action(async (opts: { lock: string }) => {
      const { listCommand } = await import("./commands/list.js");
      exitCode = await listCommand(opts.lock);
    });
```

- [ ] **Step 5: Run test to verify PASS**

Run: `npx vitest run tests/cli/list.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/cli/commands/list.ts src/cli/index.ts tests/cli/list.test.ts
git commit -m "feat(cli): concord list --dry-run (read lock, no fs scan)"
```

---

### Task 27 — Integration + 4-scope Merge Golden Test (POC-13)

**Files:**
- Create: `tests/integration/scope-merge.test.ts`
- Create: `tests/fixtures/manifest-enterprise.yaml` / `manifest-user.yaml` / `manifest-project.yaml` / `manifest-local.yaml`

**Spec reference:** POC-13 (§12.1), E-16 4 scope merge.

- [ ] **Step 1: Create 4 fixture files**

`tests/fixtures/manifest-enterprise.yaml`:
```yaml
skills:
  - id: claude-code:skills:shared
    source: { type: file, path: ./shared-v1 }
    install: auto
```

`tests/fixtures/manifest-user.yaml`:
```yaml
skills:
  - id: claude-code:skills:user-only
    source: { type: file, path: ./user-only }
    install: auto
```

`tests/fixtures/manifest-project.yaml`:
```yaml
skills:
  - id: claude-code:skills:shared
    source: { type: file, path: ./shared-v2 }
    install: auto
  - id: claude-code:skills:project-only
    source: { type: file, path: ./project-only }
    install: auto
```

`tests/fixtures/manifest-local.yaml`:
```yaml
skills:
  - id: claude-code:skills:shared
    source: { type: file, path: ./shared-v3-local }
    install: auto
```

- [ ] **Step 2: Write failing test `tests/integration/scope-merge.test.ts`**

```typescript
import { describe, expect, it } from "vitest";
import * as path from "node:path";
import { loadYaml } from "../../src/io/yaml-loader.js";
import { validateManifest } from "../../src/schema/validate-manifest.js";
import { mergeByPrecedence } from "../../src/discovery/scope.js";

function loadAndValidate(fixture: string) {
  return validateManifest(
    loadYaml(path.resolve(__dirname, "../fixtures/", fixture)),
  );
}

describe("POC-13 4-scope merge golden test", () => {
  it("local > project > user > enterprise — shared entry ends up with local version", () => {
    const merged = mergeByPrecedence({
      enterprise: loadAndValidate("manifest-enterprise.yaml"),
      user: loadAndValidate("manifest-user.yaml"),
      project: loadAndValidate("manifest-project.yaml"),
      local: loadAndValidate("manifest-local.yaml"),
    });

    const ids = merged.skills.map((s) => s.id).sort();
    expect(ids).toEqual([
      "claude-code:skills:project-only",
      "claude-code:skills:shared",
      "claude-code:skills:user-only",
    ]);

    const shared = merged.skills.find(
      (s) => s.id === "claude-code:skills:shared",
    );
    expect(shared).toBeDefined();
    expect((shared!.source as { path: string }).path).toBe("./shared-v3-local");
  });

  it("project overrides user+enterprise for shared entries", () => {
    const merged = mergeByPrecedence({
      enterprise: loadAndValidate("manifest-enterprise.yaml"),
      user: loadAndValidate("manifest-user.yaml"),
      project: loadAndValidate("manifest-project.yaml"),
    });
    const shared = merged.skills.find(
      (s) => s.id === "claude-code:skills:shared",
    );
    expect((shared!.source as { path: string }).path).toBe("./shared-v2");
  });
});
```

- [ ] **Step 3: Run test to verify FAIL**

Run: `npx vitest run tests/integration/scope-merge.test.ts`
Expected: FAIL (fixture 미존재 또는 module 문제).

- [ ] **Step 4: Run after fixtures exist**

Run: `npx vitest run tests/integration/scope-merge.test.ts`
Expected: PASS.

- [ ] **Step 5: Full test suite + build**

Run:
```bash
npm run test
npm run build
```
Expected: 전부 PASS + `dist/` 생성.

- [ ] **Step 6: Commit**

```bash
git add tests/integration/scope-merge.test.ts tests/fixtures/manifest-enterprise.yaml tests/fixtures/manifest-user.yaml tests/fixtures/manifest-project.yaml tests/fixtures/manifest-local.yaml
git commit -m "test(integration): POC-13 4-scope merge golden (local > project > user > enterprise)"
```

---

### Task 28 — README + POC Log + Plan 1 Completion

**Files:**
- Create: `README.md`
- Create: `docs/poc-log.md`

- [ ] **Step 1: Create `README.md`**

```markdown
# concord

Sync AI harness assets (skills / subagents / hooks / MCP / instructions / plugins) across Claude Code, Codex, and OpenCode.

**Status**: Phase 1 Foundation (Plan 1 / 4). Read-only commands; sync/install in Plan 2+.

## Install

```bash
npm install
npm run build
```

## Usage

```bash
# Validate a manifest
concord validate ./concord.yaml

# Fast lint (Reserved Registry + interpolation allowlist only)
concord lint ./concord.yaml

# List entries from lock file (dry-run)
concord list --lock ./concord.lock
```

## Design docs

- Spec: `docs/superpowers/specs/2026-04-21-concord-design.md`
- Plans: `docs/superpowers/plans/`
- POC log: `docs/poc-log.md`

## Requirements

- Node.js >= 22 (Active LTS)
- TypeScript 6.x
- Zod 4.x / Vitest 4.x

## License

MIT
```

- [ ] **Step 2: Create `docs/poc-log.md`**

```markdown
# POC Log — Plan 1 Results

## POC-3: YAML library selection

**결과**: `yaml` (eemeli) 2.x 채택 확정 (v2.8.3 기준).
**근거**: format-preserving API (CST), 활성 유지, 광범위한 TypeScript 지원.
**대안 비교 생략**: Plan 1 범위 밖. js-yaml 등은 format-preserving 미지원으로 초기 제외.

## Zod 3 → Zod 4 재평가 (spec 부록 B 동기화 필요)

**spec 부록 B 원래 결정**: Zod 3 고정 (discriminatedUnion / passthrough deprecate 부담).
**본 plan 에서의 실제 선택**: **Zod 4.x** — 기존 `package.json` 의 deps 선택을 존중.
**영향**:
- `zod-to-json-schema` 의존 불필요 (Zod 4 native `z.toJSONSchema()` 사용)
- `.passthrough()` 는 Zod 4 에서도 동작하되, 필요 시 `.loose()` / `z.looseObject({...})` 로 전환 가능
- `z.discriminatedUnion("field", [...])` 는 Zod 4 에서도 작동 — 향후 `z.switch` 로 migration 예정
**Action**: spec 부록 B 업데이트 필요 (별도 커밋).

## POC-4: `~/.claude.json` format

**결과**: 순수 JSON 확정, `json-key-owned` 방식 채택 (2026-04-19).
**구현**: Plan 2 round-trip 단계에서 실제 적용. Plan 1 은 schema 수준까지만.

## POC-13: 4-scope merge order

**결과**: Golden test 통과 (`tests/integration/scope-merge.test.ts`).
**확인**: enterprise → user → project → local 순으로 적용, 같은 id 는 later scope 가 override.
**E-16 일관성**: merge 후 재보간 없음 (E-14 depth 1) 원칙 확인.

## POC-5 skeleton

**결과**: Plugin introspection 엔진은 Plan 3 에서 실제 구현.
**Plan 1 범위**: PluginAssetSchema + PluginSourceSchema 까지만 — 실제 `plugin.json` 파싱은 Plan 3.
```

- [ ] **Step 3: Generate JSON Schema artifacts (Zod 4 native, 가드레일 2)**

Run:
```bash
mkdir -p scripts
cat > scripts/generate-schemas.ts <<'EOF'
import { z } from "zod";
import * as fs from "node:fs";
import * as path from "node:path";
import { ManifestSchema } from "../src/schema/manifest.js";
import { LockSchema } from "../src/schema/lock.js";

const outDir = path.join(process.cwd(), "schemas");
fs.mkdirSync(outDir, { recursive: true });

// Zod 4 native — zod-to-json-schema 의존 불필요
fs.writeFileSync(
  path.join(outDir, "manifest.schema.json"),
  JSON.stringify(z.toJSONSchema(ManifestSchema), null, 2),
);
fs.writeFileSync(
  path.join(outDir, "lock.schema.json"),
  JSON.stringify(z.toJSONSchema(LockSchema), null, 2),
);

console.log("Generated schemas/ (manifest + lock)");
EOF

# 기존 package.json 에 tsx 가 있음
npx tsx scripts/generate-schemas.ts
```
Expected: `schemas/manifest.schema.json` + `schemas/lock.schema.json` 생성.

**Zod 4 주의**: `z.toJSONSchema()` 는 Zod 4 native 함수. Zod 3 에선 없음 — Zod 4 채택이 전제.

- [ ] **Step 4: Full test suite + build + lint**

Run:
```bash
npm run test
npm run build
npm run lint
```
Expected: 모두 PASS.

- [ ] **Step 5: Commit**

```bash
git add README.md docs/poc-log.md
git add scripts/generate-schemas.ts schemas/ 2>/dev/null || true
git commit -m "docs(plan-1): README + POC log (POC-3/POC-4/POC-13) + JSON Schema artifacts"
```

- [ ] **Step 6: Tag Plan 1 completion**

```bash
git tag -a concord-plan-1-foundation -m "Plan 1 Foundation complete: schema + registry + discovery + CLI read-only"
```

---

## Plan 1 완료 산출물

- **28 task, ~150 commits**
- **실동작**: `concord validate <manifest>` / `concord lint <manifest>` / `concord list --lock <path>`
- **Schema SoT**: Zod + JSON Schema artifacts (가드레일 2)
- **POC 결과**: POC-3 (yaml 확정), POC-4 (이미 확정), POC-13 (4-scope merge), POC-5 skeleton
- **Π 보호**: Π1 (I1 deterministic lock parse), Π2 (declared passthrough), Π3 (scope merge provider-native 위임), Π4 (validator errors 구조화), Π5 (phase2_projections optional additive), Π6 (ReasonEnum 고정, I5 secret leak detect), Π7 (Reserved Registry 15 entries parse error + case-insensitive + path traversal)

---

## Self-Review (skill 체크리스트)

### 1. Spec coverage

| Spec 섹션 | Task 매핑 |
|---|---|
| §1 Π1~Π7 | Task 4 (Π7), Task 5 (Π7), Task 15 (Π5 additive), Task 21 (Π4 refine), Task 23 (Π1 I1 / Π2 I6 / Π6 I5) |
| §2 Reserved Registry 15 entries | Task 4 |
| §3 Asset Types 6종 | Task 10~15 |
| §3.3 β3 α | Task 8 (PluginSource), Task 15 (PluginAsset) |
| §4 Manifest Schema | Task 8~16, Task 18 (3-pass) |
| §4.5 Allowlist | Task 5 |
| §4.6 concord_version | Task 16 |
| §5 Lock Schema | Task 20, 21, 22, 23 |
| §5.6 capability_matrix | Task 6, 7 |
| §5.7 install/drift | Task 20 (LockNode), Task 21 (symlink refine) |
| §5.10 I1~I6 | Task 23 (I5 leak, I6 passthrough via schema) |
| §6 CLI 11 명령 | Task 24~26 (Plan 1 은 3 명령만) |
| §7.3 Drift 4+1 | Task 21 refine, Task 20 schema |
| §11 Discovery + scope | Task 3, Task 19 |
| §12.1 POC-3/4/5/13 | Task 17 (POC-3), Task 22 (POC-4), Task 15 (POC-5 skeleton), Task 27 (POC-13) |

### 2. Placeholder scan

- "TBD" / "TODO" 검색 결과 없음 (README 의 "Plan 2+" 는 명확한 미래 참조로 허용)
- "implement later" / "fill in details" 없음
- 모든 step 이 실제 코드 블록 포함

### 3. Type consistency

- `AssetBase` / `AssetType` / `Provider` / `ConfigScope` 전부 `types.ts` 단일 출처
- `ReasonEnum` / `InstallReasonEnum` 관계 Task 6 에서 명시 + Task 20/23 에서 재사용
- `install_mode` 값 `"symlink" | "hardlink" | "copy"` 세 곳 (AssetBaseSchema 의 `"auto"` 포함 입력 / LockNode 의 출력 / Cell 의 관측) 모두 정합
- `drift_status` 5 값 모두 schema + refine + capability cell 에서 일관

### 4. 누락 확인

- §8 Secret 보간 → Plan 3 (의도적 미포함, Plan 1 은 allowlist 까지만)
- §9 Windows install → Plan 2 (D-1 install field schema 는 Plan 1 에서 schema-level 만)
- §10 Round-trip write → Plan 2
- §6 CLI 11 명령 중 8 명령 → Plan 2/3/4

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-04-22-concord-plan-1-foundation.md`. Two execution options:

**1. Subagent-Driven (recommended)** — dispatch fresh subagent per task, two-stage review between tasks, fast iteration.

**2. Inline Execution** — execute tasks in this session using `superpowers:executing-plans`, batch execution with checkpoints.

Which approach?




