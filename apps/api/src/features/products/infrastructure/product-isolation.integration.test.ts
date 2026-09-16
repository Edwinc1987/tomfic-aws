import { PrismaClient } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { PrismaProductRepository } from "../../../infrastructure/prisma/prisma-product-repository";

const integration=process.env.RUN_DB_TESTS==="1"?describe:describe.skip;

integration("product tenant isolation",()=>{
  it("only lists products belonging to the requested tenant and inventory",async()=>{
    const db=new PrismaClient();
    const tenantA=await db.tenant.create({data:{name:"Products A",taxId:`products-a-${Date.now()}`,active:true}});
    const tenantB=await db.tenant.create({data:{name:"Products B",taxId:`products-b-${Date.now()}`,active:true}});
    const inventoryA=await db.inventory.create({data:{tenantId:tenantA.id,name:"Inventory A"}});
    const inventoryB=await db.inventory.create({data:{tenantId:tenantB.id,name:"Inventory B"}});
    await db.product.create({data:{tenantId:tenantA.id,inventoryId:inventoryA.id,name:"Product A",code:"A-1"}});
    await db.product.create({data:{tenantId:tenantB.id,inventoryId:inventoryB.id,name:"Product B",code:"B-1"}});
    try{
      const result=await new PrismaProductRepository(db).list({tenantId:tenantA.id,inventoryId:inventoryA.id,page:1,pageSize:50});
      expect(result.total).toBe(1);
      expect(result.items[0].name).toBe("Product A");
    }finally{
      await db.tenant.deleteMany({where:{id:{in:[tenantA.id,tenantB.id]}}});
      await db.$disconnect();
    }
  });
});
