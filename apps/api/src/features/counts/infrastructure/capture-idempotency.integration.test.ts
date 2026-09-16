import { PrismaClient, CountRoundName } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { PrismaCaptureRepository } from "../../../infrastructure/prisma/prisma-capture-repository";

const integration=process.env.RUN_DB_TESTS==="1"?describe:describe.skip;

integration("capture idempotency",()=>{
  it("does not duplicate a retry with the same operationId",async()=>{
    const db=new PrismaClient();
    const tenant=await db.tenant.create({data:{name:"Idempotency test",taxId:`capture-${Date.now()}`,active:true}});
    const inventory=await db.inventory.create({data:{tenantId:tenant.id,name:"Capture inventory"}});
    const product=await db.product.create({data:{tenantId:tenant.id,inventoryId:inventory.id,name:"Test product",code:"TEST-1"}});
    const count=await db.count.create({data:{tenantId:tenant.id,inventoryId:inventory.id,name:"Capture count",location:"Test",rounds:{create:{name:CountRoundName.C1}}}});
    const round=await db.countRound.findUniqueOrThrow({where:{countId_name:{countId:count.id,name:CountRoundName.C1}}});
    try{
      const repository=new PrismaCaptureRepository(db);
      const input={operationId:`operation-${Date.now()}`,tenantId:tenant.id,productId:product.id,roundId:round.id,quantity:4,condition:"BUENO"};
      const first=await repository.createIdempotent(input);
      const retry=await repository.createIdempotent(input);
      const total=await db.capture.count({where:{operationId:input.operationId}});
      expect(retry.id).toBe(first.id);
      expect(total).toBe(1);
    }finally{
      await db.tenant.delete({where:{id:tenant.id}});
      await db.$disconnect();
    }
  });
});
