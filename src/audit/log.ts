import { appendFile, mkdir } from "node:fs/promises";
import { join } from "node:path";

export interface AuditEntry {
  action: string;
  env?: string;
  file?: string;
  command?: string;
  [key: string]: unknown;
}

// Shallow, case-sensitive guard by design: callers must flatten who/when/what
// into top-level string fields. Nested objects and mixed casing are out of scope
// (primary E-17 discipline lives at the secret-module boundary).
const FORBIDDEN_KEYS = new Set(["resolved", "value", "secret", "plain"]);

/**
 * §6.13 E-17: append to <concordHome>/audit.log. Never log resolved secret values.
 * Timestamp is appended AFTER the caller's entry so callers cannot override it.
 */
export async function appendAudit(concordHome: string, entry: AuditEntry): Promise<void> {
  for (const k of Object.keys(entry)) {
    if (FORBIDDEN_KEYS.has(k)) {
      throw new Error(`audit entry must not contain '${k}' (E-17 resolved-value leak)`);
    }
  }
  await mkdir(concordHome, { recursive: true });
  const line = JSON.stringify({ ...entry, timestamp: new Date().toISOString() }) + "\n";
  await appendFile(join(concordHome, "audit.log"), line, "utf8");
}
