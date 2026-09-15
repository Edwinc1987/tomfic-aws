import { describe, expect, it } from "vitest";
import { listProducts } from "./list-products";
import { MemoryProductRepository } from "./memory-product-repository";

describe("listProducts",()=>{
  it("pagina y filtra por empresa e inventario",async()=>{
    const repository=new MemoryProductRepository([
      {id:"p1",tenantId:"t1",inventoryId:"i1",code:"001",barcode:"",name:"Arroz",balance:1,cost:1},
      {id:"p2",tenantId:"t1",inventoryId:"i2",code:"002",barcode:"",name:"Arroz",balance:1,cost:1},
      {id:"p3",tenantId:"t2",inventoryId:"i1",code:"003",barcode:"",name:"Arroz",balance:1,cost:1},
    ]);
    const result=await listProducts(repository)({tenantId:"t1",inventoryId:"i1",page:1,pageSize:50,search:"arroz"});
    expect(result.total).toBe(1);
    expect(result.items[0].id).toBe("p1");
  });
});
