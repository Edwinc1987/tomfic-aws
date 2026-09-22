import { describe, it, expect } from "vitest";
import { signTeamJwt, verifyTeamJwt } from "./team-jwt";

describe("team-jwt", () => {
  it("firma y verifica un token válido", () => {
    process.env.AUTH_SECRET = "test-secret-for-vitest";
    const token = signTeamJwt({ sub: "user-1", tenantId: "tenant-1", role: "ADMIN" }, 60);
    const payload = verifyTeamJwt(token);
    expect(payload).not.toBeNull();
    expect(payload?.sub).toBe("user-1");
    expect(payload?.tenantId).toBe("tenant-1");
    expect(payload?.role).toBe("ADMIN");
  });

  it("rechaza un token con firma alterada", () => {
    process.env.AUTH_SECRET = "test-secret-for-vitest";
    const token = signTeamJwt({ sub: "user-1", tenantId: "tenant-1", role: "OWNER" }, 60);
    const tampered = token.slice(0, -4) + "AAAA";
    expect(verifyTeamJwt(tampered)).toBeNull();
  });

  it("rechaza un token con otro AUTH_SECRET (tokens firmados con clave distinta)", () => {
    process.env.AUTH_SECRET = "clave-original";
    const token = signTeamJwt({ sub: "user-1", tenantId: "tenant-1", role: "OWNER" }, 60);
    process.env.AUTH_SECRET = "clave-distinta";
    expect(verifyTeamJwt(token)).toBeNull();
  });

  it("rechaza un token expirado", () => {
    process.env.AUTH_SECRET = "test-secret-for-vitest";
    const token = signTeamJwt({ sub: "user-1", tenantId: "tenant-1", role: "OWNER" }, -10);
    expect(verifyTeamJwt(token)).toBeNull();
  });

  it("rechaza strings que no son JWT", () => {
    process.env.AUTH_SECRET = "test-secret-for-vitest";
    expect(verifyTeamJwt("team-123-456-789")).toBeNull();
    expect(verifyTeamJwt("")).toBeNull();
    expect(verifyTeamJwt("a.b.c")).toBeNull();
  });

  it("falla si AUTH_SECRET no está configurado", () => {
    const original = process.env.AUTH_SECRET;
    delete process.env.AUTH_SECRET;
    expect(() => signTeamJwt({ sub: "u", tenantId: "t", role: "ADMIN" })).toThrow(/AUTH_SECRET/);
    if (original !== undefined) process.env.AUTH_SECRET = original;
  });
});
