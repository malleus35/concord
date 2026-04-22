import { describe, it, expect } from "vitest";
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
