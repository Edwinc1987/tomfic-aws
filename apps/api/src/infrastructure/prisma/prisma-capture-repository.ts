import { PrismaClient } from "@prisma/client";
import { CaptureInput, CaptureRepository } from "../../features/counts/application/capture-repository";

export class PrismaCaptureRepository implements CaptureRepository{
  constructor(private readonly db=new PrismaClient()){}

  async createIdempotent(input:CaptureInput){
    return this.db.$transaction(async(tx)=>{
      const existing=await tx.capture.findUnique({where:{operationId:input.operationId}});
      if(existing)return existing;
      const round=await tx.countRound.findFirst({where:input.roundId?{id:input.roundId,count:{tenantId:input.tenantId}}:{countId:input.countId,name:input.round,count:{tenantId:input.tenantId}}});
      if(!round)throw new Error("Ronda no encontrada para esta empresa");
      if(round.status!=="OPEN")throw new Error("La ronda ya está cerrada");
      const product=await tx.product.findFirst({where:{id:input.productId,tenantId:input.tenantId}});
      if(!product)throw new Error("Producto no encontrado para esta empresa");
      return tx.capture.create({data:{operationId:input.operationId,productId:input.productId,roundId:round.id,quantity:input.quantity,condition:input.condition}});
    });
  }
}
