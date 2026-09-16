import { CountRoundName, CountRoundStatus, PrismaClient } from "@prisma/client";
import { CountRepository, CountSummary, RoundSummary } from "../../features/counts/application/count-repository";

const round=(value:{id:string;countId:string;name:CountRoundName;status:CountRoundStatus;assignedToId:string|null;closedAt:Date|null}):RoundSummary=>value;

export class PrismaCountRepository implements CountRepository{
  constructor(private readonly db=new PrismaClient()){}

  async create(tenantId:string,inventoryId:string,name:string,location:string,rounds:CountRoundName[]){
    const count=await this.db.count.create({
      data:{tenantId,inventoryId,name,location,rounds:{create:rounds.map(roundName=>({name:roundName}))}},
      select:{id:true,tenantId:true,inventoryId:true,name:true,status:true},
    });
    return count;
  }

  async list(tenantId:string,inventoryId:string){
    return this.db.count.findMany({where:{tenantId,inventoryId},orderBy:{createdAt:"desc"},select:{id:true,tenantId:true,inventoryId:true,name:true,status:true}});
  }

  private async changeRound(tenantId:string,countId:string,roundName:CountRoundName,status:CountRoundStatus){
    return this.db.$transaction(async(tx)=>{
      const existing=await tx.countRound.findFirst({where:{countId,name:roundName,count:{tenantId}}});
      if(!existing)throw new Error("Ronda no encontrada");
      const updated=await tx.countRound.update({where:{id:existing.id},data:{status,closedAt:status===CountRoundStatus.CLOSED?new Date():null}});
      return round(updated);
    });
  }

  closeRound(tenantId:string,countId:string,roundName:CountRoundName){return this.changeRound(tenantId,countId,roundName,CountRoundStatus.CLOSED);}
  reopenRound(tenantId:string,countId:string,roundName:CountRoundName){return this.changeRound(tenantId,countId,roundName,CountRoundStatus.OPEN);}
}
