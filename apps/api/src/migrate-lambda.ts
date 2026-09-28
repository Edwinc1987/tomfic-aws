import * as path from "path";
import * as cp from "child_process";
import * as fs from "fs";
import { ensureDatabaseUrl } from "./core/db-url";

/** Lambda one-off: `prisma migrate deploy` contra el RDS (invocacion manual). */
export const handler = async (): Promise<any> => {
  await ensureDatabaseUrl();
  // El zip de Code.fromAsset pierde permisos; prisma necesita ejecutar el engine.
  const enginesDir = path.join(__dirname, "node_modules", "@prisma", "engines");
  try {
    for (const f of fs.readdirSync(enginesDir)) {
      if (f.startsWith("schema-engine") || f.startsWith("query_engine")) {
        fs.chmodSync(path.join(enginesDir, f), 0o755);
      }
    }
  } catch { /* ignore */ }

  const engineBin = path.join(__dirname, "node_modules", "@prisma", "engines", "schema-engine-rhel-openssl-3.0.x");
  // Diagnóstico: ejecutar el engine con --version
  const ver = cp.spawnSync(engineBin, ["--version"], { encoding: "utf-8" });
  if (ver.status !== 0) {
    return { statusCode: 500, stdout: "engine --version failed", stderr: (ver.stderr||"") + " " + (ver.error?.message||"") };
  }
  const prismaBin = path.join(__dirname, "node_modules", "prisma", "build", "index.js");
  const result = cp.spawnSync(process.execPath, [prismaBin, "migrate", "deploy"], {
    env: {
      ...process.env,
      PRISMA_HIDE_UPDATE_MESSAGE: "1",
      PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING: "1",
      PRISMA_SCHEMA_ENGINE_BINARY: path.join(__dirname, "node_modules", "@prisma", "engines", "schema-engine-rhel-openssl-3.0.x"),
    },
    encoding: "utf-8",
  });
  return {
    statusCode: result.status === 0 ? 200 : 500,
    stdout: (result.stdout || "").slice(-4000),
    stderr: (result.stderr || "").slice(-4000),
  };
};
