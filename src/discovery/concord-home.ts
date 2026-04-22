import * as os from "node:os";
import * as path from "node:path";
import * as fs from "node:fs";

/**
 * Resolve concord home directory following §11.1 discovery order:
 *   1. $CONCORD_HOME (env var, highest priority — used for test isolation)
 *   2. ~/.concord/ (canonical)
 *   3. $XDG_CONFIG_HOME/concord/
 *   4. ~/.config/concord/
 *   5. %APPDATA%\concord (Windows)
 *
 * If no existing directory is found, returns the default (~/.concord/) without creating it.
 */
export function findConcordHome(): string {
  if (process.env.CONCORD_HOME) {
    return process.env.CONCORD_HOME;
  }

  const home = os.homedir();
  const defaultHome = path.join(home, ".concord");
  if (fs.existsSync(defaultHome)) {
    return defaultHome;
  }

  if (process.env.XDG_CONFIG_HOME) {
    const xdg = path.join(process.env.XDG_CONFIG_HOME, "concord");
    if (fs.existsSync(xdg)) return xdg;
  }

  const xdgFallback = path.join(home, ".config", "concord");
  if (fs.existsSync(xdgFallback)) return xdgFallback;

  if (process.platform === "win32" && process.env.APPDATA) {
    const appdata = path.join(process.env.APPDATA, "concord");
    if (fs.existsSync(appdata)) return appdata;
  }

  return defaultHome;
}
