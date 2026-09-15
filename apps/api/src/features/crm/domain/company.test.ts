import { describe, expect, it } from "vitest";
import { changeCompanyStage } from "./company";

const company={id:"c1",name:"Empresa",tenantId:"t1",taxId:"9001",stage:"prospecto" as const,plan:"basico"};

describe("company lifecycle",()=>{
  it("allows a prospect to become a demo",()=>{
    expect(changeCompanyStage(company,"demo").stage).toBe("demo");
  });

  it("does not allow a retired company to become active",()=>{
    expect(()=>changeCompanyStage({...company,stage:"retirado"},"activo")).toThrow("Transición inválida");
  });
});
