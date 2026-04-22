import { describe, it, expect } from "vitest";
import { createDecimalturnEditor } from "../../../src/round-trip/toml/decimalturn.js";
import { createShopifyEditor } from "../../../src/round-trip/toml/shopify.js";
import { createLtdJTomlEditor } from "../../../src/round-trip/toml/ltd-j-toml.js";

describe("POC-1 TOML wrappers — shape", () => {
  const editors = [
    { name: "decimalturn", factory: createDecimalturnEditor },
    { name: "shopify", factory: createShopifyEditor },
    { name: "ltd-j-toml", factory: createLtdJTomlEditor },
  ];

  it.each(editors)("$name 은 ConfigFileEditor shape 구현", ({ factory }) => {
    const editor = factory();
    expect(typeof editor.load).toBe("function");
    expect(typeof editor.edit).toBe("function");
    expect(typeof editor.serialize).toBe("function");
    expect(typeof editor.verify).toBe("function");
  });

  it.each(editors)("$name 은 빈 source 를 load 할 수 있음", async ({ factory }) => {
    const editor = factory();
    const doc = await editor.load("");
    expect(doc.source).toBe("");
    expect(doc.markers).toEqual([]);
  });
});
