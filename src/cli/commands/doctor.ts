import { Command } from "commander";
import { resolve } from "node:path";
import { loadYaml } from "../../io/yaml-loader.js";
import { validateManifest } from "../../schema/validate-manifest.js";
import { checkGitBash } from "../../sync/preflight/git-bash.js";
import { checkCodexVersion } from "../../sync/preflight/codex-version.js";
import { checkPlatformWarnings } from "../../sync/preflight/platform-warnings.js";

export function registerDoctorCommand(
  program: Command,
  setExitCode: (code: number) => void,
): void {
  program
    .command("doctor")
    .description("Run preflight checks and report environment diagnostics")
    .option("--manifest <path>", "manifest file path", "concord.yaml")
    .option("--json", "machine-readable JSON output")
    .action(async (opts: { manifest: string; json?: boolean }) => {
      const manifestPath = resolve(opts.manifest);
      let manifestRaw: unknown;
      try {
        manifestRaw = loadYaml(manifestPath);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        process.stderr.write(
          `error: cannot read manifest at ${manifestPath}: ${msg}\n`,
        );
        setExitCode(1);
        return;
      }
      try {
        validateManifest(manifestRaw);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        process.stderr.write(`error: invalid manifest: ${msg}\n`);
        setExitCode(1);
        return;
      }

      // Collect target paths from all assets (for OneDrive check)
      const targetPaths: string[] = [];
      for (const key of [
        "skills",
        "subagents",
        "hooks",
        "mcp_servers",
        "instructions",
        "plugins",
      ]) {
        const arr = (manifestRaw as Record<string, unknown>)[key];
        if (Array.isArray(arr)) {
          for (const e of arr) {
            if (e && typeof e === "object") {
              const tp = (e as Record<string, unknown>).target_path;
              if (typeof tp === "string") {
                targetPaths.push(tp);
              }
            }
          }
        }
      }

      const [gitBash, codex, warnings] = await Promise.all([
        checkGitBash(),
        checkCodexVersion(),
        checkPlatformWarnings({
          platform: process.platform,
          installMode: "auto",
          targetPaths,
        }),
      ]);

      const report = {
        manifest: manifestPath,
        platform: process.platform,
        checks: {
          gitBash,
          codexVersion: codex,
          platformWarnings: warnings,
        },
      };

      if (opts.json) {
        process.stdout.write(JSON.stringify(report, null, 2) + "\n");
      } else {
        process.stdout.write(`concord doctor — ${manifestPath}\n`);
        process.stdout.write(`  platform: ${process.platform}\n`);
        process.stdout.write(
          `  gitBash: ${
            gitBash.applicable
              ? gitBash.found
                ? "ok"
                : "missing"
              : "n/a"
          }\n`,
        );
        process.stdout.write(
          `  codex: ${
            codex.installed ? codex.version ?? "unknown" : "not installed"
          }\n`,
        );
        if (warnings.oneDrive.hasMatch) {
          process.stdout.write(
            `  ⚠ OneDrive path detected: ${warnings.oneDrive.paths.length} target(s)\n`,
          );
        }
      }
    });
}
