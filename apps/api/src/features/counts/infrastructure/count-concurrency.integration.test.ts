import { PrismaClient, CountRoundName } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { PrismaCountRepository } from "../../../infrastructure/prisma/prisma-count-repository";

const integration=process.env.RUN_DB_TESTS==="1"?describe:describe.skip;

integration("count round concurrency",()=>{
  it("closes C1 and C2 independently when both requests arrive together",async()=>{
    const db=new PrismaClient();
    const tenant=await db.tenant.create({data:{name:"Concurrency test",taxId:`test-${Date.now()}`,active:true}});
    const inventory=await db.inventory.create({data:{tenantId:tenant.id,name:"Concurrency inventory"}});
    const count=await db.count.create({data:{tenantId:tenant.id,inventoryId:inventory.id,name:"Concurrency count",location:"Test",rounds:{create:[{name:CountRoundName.C1},{name:CountRoundName.C2}]}}});
    try{
      const repository=new PrismaCountRepository(db);
      const [c1,c2]=await Promise.all([
        repository.closeRound(tenant.id,count.id,CountRoundName.C1),
        repository.closeRound(tenant.id,count.id,CountRoundName.C2),
      ]);
      expect(c1.status).toBe("CLOSED");
      expect(c2.status).toBe("CLOSED");
      const rounds=await db.countRound.findMany({where:{countId:count.id}});
      expect(rounds.map(round=>round.status).sort()).toEqual(["CLOSED","CLOSED"]);
    }finally{
      await db.tenant.delete({where:{id:tenant.id}});
      await db.$disconnect();
    }
  });
});
