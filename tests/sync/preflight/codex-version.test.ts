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
