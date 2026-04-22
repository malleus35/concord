import { z } from "zod";
import * as fs from "node:fs";
import * as path from "node:path";
import { ManifestSchema } from "../src/schema/manifest.js";
import { LockSchema } from "../src/schema/lock.js";

const outDir = path.join(process.cwd(), "schemas");
fs.mkdirSync(outDir, { recursive: true });

// Zod 4 native — zod-to-json-schema 의존 불필요
fs.writeFileSync(
  path.join(outDir, "manifest.schema.json"),
  JSON.stringify(z.toJSONSchema(ManifestSchema), null, 2),
);
fs.writeFileSync(
  path.join(outDir, "lock.schema.json"),
  JSON.stringify(z.toJSONSchema(LockSchema), null, 2),
);

console.log("Generated schemas/ (manifest + lock)");
