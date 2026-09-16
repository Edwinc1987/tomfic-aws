import { describe, expect, it } from "vitest";
import { can, requirePermission } from "./authorization";

describe("authorization",()=>{
  const capturer={userId:"u1",tenantId:"t1",role:"CAPTURER"};

  it("allows capturers to read and capture",()=>{
    expect(can(capturer,"products:read")).toBe(true);
    expect(can(capturer,"counts:capture")).toBe(true);
  });

  it("does not allow capturers to close counts",()=>{
    expect(can(capturer,"counts:close")).toBe(false);
    expect(()=>requirePermission(capturer,"counts:close")).toThrow("Permiso insuficiente");
  });
});
