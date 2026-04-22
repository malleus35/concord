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
