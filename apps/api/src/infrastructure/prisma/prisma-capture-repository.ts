import { PrismaClient } from "@prisma/client";
import { CaptureInput, CaptureRepository } from "../../features/counts/application/capture-repository";

export class PrismaCaptureRepository implements CaptureRepository{
  constructor(private readonly db=new PrismaClient()){}

  async getDetails(tenantId:string,captureId:string){
    const capture=await this.db.capture.findFirst({where:{id:captureId,product:{tenantId}},include:{comments:{orderBy:{createdAt:"asc"}},evidence:{orderBy:{createdAt:"asc"}},product:{select:{id:true,code:true,barcode:true,name:true}},round:{select:{id:true,name:true,status:true}}}});
    if(!capture)throw new Error("Captura no encontrada para esta empresa");
    return capture;
  }

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

  async addComment(tenantId:string,authorId:string,captureId:string,body:string){
    const capture=await this.db.capture.findFirst({where:{id:captureId,product:{tenantId}}});
    if(!capture)throw new Error("Captura no encontrada para esta empresa");
    return this.db.captureComment.create({data:{captureId,tenantId,authorId,body:body.trim()}});
  }

  async addEvidence(tenantId:string,userId:string,captureId:string,input:{storageKey:string;fileName:string;contentType:string}){
    const capture=await this.db.capture.findFirst({where:{id:captureId,product:{tenantId}}});
    if(!capture)throw new Error("Captura no encontrada para esta empresa");
    return this.db.captureEvidence.create({data:{captureId,tenantId,uploadedById:userId,storageKey:input.storageKey,fileName:input.fileName,contentType:input.contentType}});
  }
}
