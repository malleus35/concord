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
