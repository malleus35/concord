import { runCommand } from "../utils/exec-file.js";
import type { AgentInfo, AgentName } from "./types.js";

const BINARY: Record<AgentName, string> = {
  "claude-code": "claude",
  codex: "codex",
  opencode: "opencode",
};

// Extracts the first x.y.z triple anywhere in stdout. Tolerates:
// - "claude version 2.0.1 (build abc123)"
// - "codex v0.119.0"         (\b word boundary would fail here — 'v' and '0' are both word chars)
// - "opencode/0.3.2"
const SEMVER = /(\d+\.\d+\.\d+)/;

/**
 * §6.3 probe: invoke "<bin> --version". Never throws. Returns installed:false on any failure.
 * `path` is intentionally null in Phase 1 — `which`/`where` discovery is deferred.
 * `features` is omitted (undefined) in Phase 1; feature-flag probes live in Task 8+.
 */
export async function probeAgent(name: AgentName): Promise<AgentInfo> {
  const bin = BINARY[name];
  const out = await runCommand(bin, ["--version"]);
  if (out.status !== 0) {
    return { installed: false, version: null, path: null };
  }
  const match = SEMVER.exec(out.stdout);
  return { installed: true, version: match ? match[1]! : null, path: null };
}
