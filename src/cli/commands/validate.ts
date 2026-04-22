import { loadYaml } from "../../io/yaml-loader.js";
import { validateManifest } from "../../schema/validate-manifest.js";

/**
 * `concord validate <manifest>` (§6.1).
 *
 * Executes the 3-pass validator (§4.8) against the given manifest file and
 * reports a single OK/FAIL line. Returns the intended process exit code so
 * callers (bin, tests) can decide how to surface it.
 */
export async function validateCommand(
  manifestPath: string,
): Promise<number> {
  try {
    const raw = loadYaml(manifestPath);
    const m = validateManifest(raw);
    const total =
      m.skills.length +
      m.subagents.length +
      m.hooks.length +
      m.mcp_servers.length +
      m.instructions.length +
      m.plugins.length;
    console.log(`OK: ${manifestPath} (${total} assets)`);
    return 0;
  } catch (e) {
    console.error(`FAIL: ${manifestPath}`);
    console.error((e as Error).message);
    return 1;
  }
}
