import * as path from "path";
import * as cp from "child_process";
import * as fs from "fs";
import { ensureDatabaseUrl } from "./core/db-url";

/** Lambda one-off: `prisma migrate deploy` contra el RDS (invocacion manual). */
export const handler = async (event?:any): Promise<any> => {
  await ensureDatabaseUrl();
  // Modo seed: crea tenant + usuario OWNER inicial (solo si la tabla está vacía).
  if (event?.mode === "seed") {
    const { PrismaClient } = await import("@prisma/client");
    const { randomBytes, scryptSync } = await import("crypto") as any;
    const db = new PrismaClient();
    try {
      const existing = await db.tenant.findFirst();
      if (existing) return { statusCode: 200, stdout: "Ya existen datos: seed omitido", tenant: { id: existing.id, name: existing.name } };
      const salt = randomBytes(16).toString("hex");
      const hash = scryptSync(event.adminPassword || "cambiar123", salt, 64).toString("hex");
      const tenant = await db.tenant.create({ data: { name: event.tenantName || "Tienda Demo", taxId: event.taxId || "900000001" } });
      const user = await db.user.create({ data: { tenantId: tenant.id, name: event.adminName || "admin", email: (event.adminEmail || "admin@demo.com").toLowerCase(), role: "OWNER", active: true, passwordHash: `${salt}:${hash}` } });
      return { statusCode: 200, stdout: "Seed OK", tenant: { id: tenant.id, name: tenant.name }, user: { id: user.id, email: user.email, role: user.role } };
    } finally { await db.$disconnect(); }
  }
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
