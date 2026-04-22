import { describe, expect, it } from "vitest";
import { computeSyncPlan } from "../../src/sync/plan.js";

describe("computeSyncPlan", () => {
  it("install: manifest has new node, lock empty → install action", () => {
    const manifest = { skills: [{ id: "foo:1", name: "foo" }] };
    const lock = { nodes: {} };

    const plan = computeSyncPlan(manifest, lock);

    expect(plan.actions).toHaveLength(1);
    expect(plan.actions[0]).toMatchObject({ kind: "install", nodeId: "foo:1" });
    expect(plan.summary).toEqual({ install: 1, update: 0, prune: 0, skip: 0 });
  });

  it("update: manifest has node that exists in lock → update action with existingNode", () => {
    const existing = { id: "bar:2", installed_at: "2026-01-01" };
    const manifest = { skills: [{ id: "bar:2", name: "bar" }] };
    const lock = { nodes: { "bar:2": existing } };

    const plan = computeSyncPlan(manifest, lock);

    expect(plan.actions).toHaveLength(1);
    expect(plan.actions[0]).toMatchObject({
      kind: "update",
      nodeId: "bar:2",
      existingNode: existing,
    });
    expect(plan.summary).toEqual({ install: 0, update: 1, prune: 0, skip: 0 });
  });

  it("prune: manifest empty, lock has orphan node → prune action", () => {
    const orphan = { id: "baz:3", installed_at: "2026-01-01" };
    const manifest = {};
    const lock = { nodes: { "baz:3": orphan } };

    const plan = computeSyncPlan(manifest, lock);

    expect(plan.actions).toHaveLength(1);
    expect(plan.actions[0]).toMatchObject({
      kind: "prune",
      nodeId: "baz:3",
      existingNode: orphan,
    });
    expect(plan.summary).toEqual({ install: 0, update: 0, prune: 1, skip: 0 });
  });

  it("mixed: install A, update B, prune C → correct summary", () => {
    const existingB = { id: "b:1", installed_at: "2026-01-01" };
    const existingC = { id: "c:1", installed_at: "2026-01-01" };
    const manifest = {
      skills: [{ id: "a:1", name: "a" }, { id: "b:1", name: "b" }],
    };
    const lock = { nodes: { "b:1": existingB, "c:1": existingC } };

    const plan = computeSyncPlan(manifest, lock);

    expect(plan.actions).toHaveLength(3);
    const installAction = plan.actions.find((a) => a.kind === "install");
    const updateAction = plan.actions.find((a) => a.kind === "update");
    const pruneAction = plan.actions.find((a) => a.kind === "prune");

    expect(installAction).toMatchObject({ kind: "install", nodeId: "a:1" });
    expect(updateAction).toMatchObject({ kind: "update", nodeId: "b:1", existingNode: existingB });
    expect(pruneAction).toMatchObject({ kind: "prune", nodeId: "c:1", existingNode: existingC });
    expect(plan.summary).toEqual({ install: 1, update: 1, prune: 1, skip: 0 });
  });
});
