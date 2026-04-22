import { Command } from "commander";
import { resolve } from "node:path";
import { readLock } from "../../io/lock-io.js";

/** §6.11 concord why — print entry origin + transitive parents from the lock. */
export function registerWhyCommand(program: Command, setExitCode: (c: number) => void): void {
  program
    .command("why <id>")
    .description("Trace an entry's origin and transitive parents")
    .option("--lock <path>", "", "concord.lock")
    .action(async (id: string, opts: { lock: string }) => {
      const lockPath = resolve(opts.lock);
      let lock: Record<string, any>;
      try {
        lock = readLock(lockPath) as Record<string, any>;
      } catch (err) {
        process.stderr.write(`error: cannot read lock: ${(err as Error).message}\n`);
        setExitCode(1); return;
      }

      const node = lock.nodes?.[id];
      if (!node) {
        process.stderr.write(`error: '${id}' not found in lock\n`);
        setExitCode(1); return;
      }

      const isRoot = Array.isArray(lock.roots) && lock.roots.includes(id);
      const parents: string[] = [];
      for (const [parentId, parentNode] of Object.entries((lock.nodes ?? {}) as Record<string, any>)) {
        const deps = parentNode?.dependencies;
        if (Array.isArray(deps) && deps.includes(id)) parents.push(parentId);
      }

      process.stdout.write(`${id}\n`);
      process.stdout.write(`  root: ${isRoot}\n`);
      if (node.source_digest) process.stdout.write(`  source_digest: ${node.source_digest}\n`);
      if (node.content_digest) process.stdout.write(`  content_digest: ${node.content_digest}\n`);
      if (node.target_path) process.stdout.write(`  install: ${node.target_path}\n`);
      if (parents.length > 0) process.stdout.write(`  transitively required by: ${parents.join(", ")}\n`);
    });
}
