import { readLock } from "../../io/lock-io.js";
import { validateLock } from "../../schema/validate-lock.js";

type Out = (msg: string) => void;

/**
 * §6.1 `concord list --dry-run` — lock file 만 참조해 설치 노드 나열.
 * Plan 1 은 fs 스캔 없이 lock 내용만 그대로 출력 (read-only).
 */
export async function listCommand(
  lockPath: string,
  out: Out = console.log,
): Promise<number> {
  try {
    const raw = readLock(lockPath);
    const lock = validateLock(raw);
    out(`scope: ${lock.scope}`);
    for (const [id, node] of Object.entries(lock.nodes)) {
      const drift =
        node.drift_status === "none" ? "" : `  (drift: ${node.drift_status})`;
      out(`  ${id}  @ ${node.install_path}${drift}`);
    }
    return 0;
  } catch (e) {
    console.error(`LIST FAIL: ${lockPath}`);
    console.error((e as Error).message);
    return 1;
  }
}
