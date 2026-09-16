import { CountRoundName, PrismaClient } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { PrismaCountRepository } from "../../../infrastructure/prisma/prisma-count-repository";

const integration=process.env.RUN_DB_TESTS==="1"?describe:describe.skip;

integration("count tenant isolation",()=>{
  it("does not allow a tenant to close another tenant's round",async()=>{
    const db=new PrismaClient();
    const tenantA=await db.tenant.create({data:{name:"Counts A",taxId:`counts-a-${Date.now()}`,active:true}});
    const tenantB=await db.tenant.create({data:{name:"Counts B",taxId:`counts-b-${Date.now()}`,active:true}});
    const inventory=await db.inventory.create({data:{tenantId:tenantB.id,name:"Inventory B"}});
    const count=await db.count.create({data:{tenantId:tenantB.id,inventoryId:inventory.id,name:"Count B",location:"Test",rounds:{create:{name:CountRoundName.C1}}}});
    try{
      await expect(new PrismaCountRepository(db).closeRound(tenantA.id,count.id,CountRoundName.C1)).rejects.toThrow("Ronda no encontrada");
    }finally{
      await db.tenant.delete({where:{id:tenantA.id}});
      await db.tenant.delete({where:{id:tenantB.id}});
      await db.$disconnect();
    }
  });
});
