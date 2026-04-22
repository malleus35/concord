import { z } from "zod";

/** §4.4.1 일반 자산 SourceSchema — 6 types. */
export const SourceSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("git"),
    repo: z.string(),
    ref: z.string(),
    path: z.string().optional(),
  }),
  z.object({
    type: z.literal("file"),
    path: z.string(),
  }),
  z.object({
    type: z.literal("http"),
    url: z.url(),
    sha256: z.string().regex(/^[a-f0-9]{64}$/),
  }),
  z.object({
    type: z.literal("npm"),
    package: z.string(),
    version: z.string(),
  }),
  z.object({
    type: z.literal("external"),
    description: z.string(),
  }),
  z.object({
    type: z.literal("adopted"),
    description: z.string(),
  }),
]);
export type Source = z.infer<typeof SourceSchema>;

/** §3.3 / §4.4.2 β3 α — 3 plugin source types. */
export const PluginSourceSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("claude-plugin"),
    marketplace: z.string(),
    name: z.string(),
    version: z.string(),
  }),
  z.object({
    type: z.literal("codex-plugin"),
    marketplace: z.string(),
    name: z.string(),
    version: z.string(),
  }),
  z.object({
    type: z.literal("opencode-plugin"),
    package: z.string(),
    version: z.string(),
  }),
]);
export type PluginSource = z.infer<typeof PluginSourceSchema>;
