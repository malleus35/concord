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
