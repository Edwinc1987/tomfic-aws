import { PrismaClient } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { PrismaInventoryRepository } from "../../../infrastructure/prisma/prisma-inventory-repository";

const integration=process.env.RUN_DB_TESTS==="1"?describe:describe.skip;

integration("inventory tenant isolation",()=>{
  it("only lists inventories belonging to the requested tenant",async()=>{
    const db=new PrismaClient();
    const tenantA=await db.tenant.create({data:{name:"Tenant A",taxId:`inventory-a-${Date.now()}`,active:true}});
    const tenantB=await db.tenant.create({data:{name:"Tenant B",taxId:`inventory-b-${Date.now()}`,active:true}});
    await db.inventory.createMany({data:[
      {tenantId:tenantA.id,name:"Bodega A"},
      {tenantId:tenantB.id,name:"Bodega B"},
    ]});
    try{
      const repository=new PrismaInventoryRepository(db);
      const inventories=await repository.list(tenantA.id);
      expect(inventories).toHaveLength(1);
      expect(inventories[0].name).toBe("Bodega A");
      expect(inventories.some(inventory=>inventory.tenantId===tenantB.id)).toBe(false);
    }finally{
      await db.tenant.deleteMany({where:{id:{in:[tenantA.id,tenantB.id]}}});
      await db.$disconnect();
    }
  });
});
