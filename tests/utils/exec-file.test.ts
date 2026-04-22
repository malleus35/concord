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
