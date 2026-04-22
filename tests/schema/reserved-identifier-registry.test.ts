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
