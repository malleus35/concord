import { Command } from "commander";
import { probeAgent } from "../../detect/agent-probe.js";
import { writeDetectCache } from "../../detect/cache.js";
import { findConcordHome } from "../../discovery/concord-home.js";
import type { AgentName, DetectCache } from "../../detect/types.js";

/** §6.3 concord detect — probe agents, persist cache, print summary. */
export function registerDetectCommand(program: Command, setExitCode: (c: number) => void): void {
  program
    .command("detect")
    .description("Probe installed agents (read-only; writes .detect-cache.json)")
    .option("--json", "machine-readable output")
    .action(async (opts: { json?: boolean }) => {
      const concordHome = findConcordHome();
      const names: AgentName[] = ["claude-code", "codex", "opencode"];
      const results = await Promise.all(names.map((n) => probeAgent(n)));
      const cache: DetectCache = {
        generated_at: new Date().toISOString(),
        agents: {
          "claude-code": results[0]!,
          codex: results[1]!,
          opencode: results[2]!,
        },
      };
      try {
        await writeDetectCache(concordHome, cache);
      } catch (err) {
        process.stderr.write(`error: cannot write detect cache: ${(err as Error).message}\n`);
        setExitCode(1);
        return;
      }
      if (opts.json) {
        process.stdout.write(JSON.stringify(cache, null, 2) + "\n");
      } else {
        for (const n of names) {
          const info = cache.agents[n];
          process.stdout.write(
            `${n.padEnd(14)} ${info.installed ? "installed" : "missing"}` +
              (info.version ? ` (version: ${info.version})` : "") +
              "\n",
          );
        }
      }
    });
}
