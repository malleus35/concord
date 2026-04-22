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
    "source.path",
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

  it("accepts sequential {env:A}{env:B} (not nested)", () => {
    expect(() => checkNested("{env:A}{env:B}")).not.toThrow();
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

  it("rejects absolute /etc/passwd", () => {
    expect(() =>
      checkPathTraversal("/etc/passwd", projectRoot),
    ).toThrow(InterpolationError);
  });

  it("rejects prefix-confusion ~/.concord-evil/secret", () => {
    // ~/.concord/ is allowed; ~/.concord-evil/ must NOT leak through startsWith
    expect(() =>
      checkPathTraversal("~/.concord-evil/secret", projectRoot),
    ).toThrow(InterpolationError);
  });
});

describe("InterpolationError.detail contract", () => {
  it("propagates detail field in thrown error", () => {
    try {
      checkNested("{env:TOKEN_${env:X}}");
      expect.fail("should have thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(InterpolationError);
      const err = e as InterpolationError;
      expect(err.detail).toContain("{env:TOKEN_");
      expect(err.message).toContain("nested");
    }
  });
});
