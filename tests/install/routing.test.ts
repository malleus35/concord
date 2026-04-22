import { describe, it, expect } from "vitest";
import { resolveInstallMode, effectiveMode } from "../../src/install/routing.js";
import type { InstallRequest } from "../../src/install/types.js";

const makeReq = (overrides: Partial<InstallRequest> = {}): InstallRequest => ({
  sourcePath: "/dummy/source",
  targetPath: "/dummy/target",
  kind: "directory",
  requestedMode: "auto",
  context: {
    assetType: "skills",
    provider: "claude-code",
    platform: "darwin",
  },
  ...overrides,
});

describe("resolveInstallMode — routing matrix", () => {
  // Case 1: skills + claude-code (D-14 #25367) → copy (any platform)
  it("skills + claude-code → copy (D-14 #25367)", () => {
    const result = resolveInstallMode(
      makeReq({ context: { assetType: "skills", provider: "claude-code", platform: "darwin" } }),
    );
    expect(result).toBe("copy");
  });

  it("skills + claude-code + win32 → copy (D-14 #25367)", () => {
    const result = resolveInstallMode(
      makeReq({ context: { assetType: "skills", provider: "claude-code", platform: "win32" } }),
    );
    expect(result).toBe("copy");
  });

  // Case 2: skills + codex → symlink
  it("skills + codex → symlink", () => {
    const result = resolveInstallMode(
      makeReq({ context: { assetType: "skills", provider: "codex", platform: "darwin" } }),
    );
    expect(result).toBe("symlink");
  });

  // Case 3: skills + opencode → symlink
  it("skills + opencode → symlink", () => {
    const result = resolveInstallMode(
      makeReq({ context: { assetType: "skills", provider: "opencode", platform: "linux" } }),
    );
    expect(result).toBe("symlink");
  });

  // Case 4: subagents + claude-code + darwin → symlink
  it("subagents + claude-code + darwin → symlink", () => {
    const result = resolveInstallMode(
      makeReq({ context: { assetType: "subagents", provider: "claude-code", platform: "darwin" } }),
    );
    expect(result).toBe("symlink");
  });

  // Case 5: mcp_servers + codex + linux → symlink
  it("mcp_servers + codex + linux → symlink", () => {
    const result = resolveInstallMode(
      makeReq({ context: { assetType: "mcp_servers", provider: "codex", platform: "linux" } }),
    );
    expect(result).toBe("symlink");
  });

  // Case 6: hooks + claude-code + win32 → symlink
  it("hooks + claude-code + win32 → symlink", () => {
    const result = resolveInstallMode(
      makeReq({ context: { assetType: "hooks", provider: "claude-code", platform: "win32" } }),
    );
    expect(result).toBe("symlink");
  });
});

describe("effectiveMode", () => {
  // Case 7: requestedMode symlink (explicit) → symlink (routing 호출 안 함)
  it("requestedMode=symlink (explicit) → symlink (routing 우회)", () => {
    const req = makeReq({
      requestedMode: "symlink",
      context: { assetType: "skills", provider: "claude-code", platform: "darwin" },
    });
    expect(effectiveMode(req)).toBe("symlink");
  });

  // Case 8: requestedMode copy (explicit) → copy
  it("requestedMode=copy (explicit) → copy", () => {
    const req = makeReq({
      requestedMode: "copy",
      context: { assetType: "subagents", provider: "codex", platform: "linux" },
    });
    expect(effectiveMode(req)).toBe("copy");
  });

  // Case 9: requestedMode auto + skills + claude-code → copy (routing 호출)
  it("requestedMode=auto + skills + claude-code → copy (routing 위임)", () => {
    const req = makeReq({
      requestedMode: "auto",
      context: { assetType: "skills", provider: "claude-code", platform: "darwin" },
    });
    expect(effectiveMode(req)).toBe("copy");
  });
});
