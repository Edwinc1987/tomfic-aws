import { describe, expect, it } from "vitest";
import { normalizeProduct } from "./product";

describe("normalizeProduct",()=>{
  it("normaliza un producto válido",()=>{
    const product=normalizeProduct({tenantId:" t1 ",inventoryId:" i1 ",code:" 001 ",barcode:"7701",name:" Arroz ",balance:10,cost:2500});
    expect(product.tenantId).toBe("t1");
    expect(product.name).toBe("Arroz");
  });

  it("rechaza productos sin empresa",()=>{
    expect(()=>normalizeProduct({tenantId:"",inventoryId:"i1",code:"",barcode:"",name:"Arroz",balance:1,cost:1})).toThrow("tenantId es obligatorio");
  });
});
