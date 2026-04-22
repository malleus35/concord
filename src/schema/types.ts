import { z } from "zod";

/** 4 scope (§4.1 / §11.2). */
export const ConfigScope = z.enum(["enterprise", "user", "project", "local"]);
export type ConfigScope = z.infer<typeof ConfigScope>;

/** 6 자산 타입 (β3 재구조, §3.1). */
export const AssetType = z.enum([
  "skills",
  "subagents",
  "hooks",
  "mcp_servers",
  "instructions",
  "plugins",
]);
export type AssetType = z.infer<typeof AssetType>;

/** 3 provider (§3 전체). */
export const Provider = z.enum(["claude-code", "codex", "opencode"]);
export type Provider = z.infer<typeof Provider>;

/** Scope precedence (§11.5). enterprise → user → project → local. */
export const SCOPE_PRECEDENCE: readonly ConfigScope[] = [
  "enterprise",
  "user",
  "project",
  "local",
] as const;
