import { CountRoundName, CountRoundStatus, PrismaClient } from "@prisma/client";
import { CountRepository, CountSummary, RoundSummary } from "../../features/counts/application/count-repository";

const round=(value:{id:string;countId:string;name:CountRoundName;status:CountRoundStatus;assignedToId:string|null;closedAt:Date|null}):RoundSummary=>value;

export class PrismaCountRepository implements CountRepository{
  constructor(private readonly db=new PrismaClient()){}

  async create(tenantId:string,inventoryId:string,name:string,location:string,rounds:CountRoundName[],tipo?:string,locLabel?:string){
    const count=await this.db.count.create({
      data:{tenantId,inventoryId,name,location,tipo:tipo||"2conteos",locLabel:locLabel||location,rounds:{create:rounds.map(roundName=>({name:roundName}))}},
      select:{id:true,tenantId:true,inventoryId:true,name:true,status:true},
    });
    return count;
  }

  async list(tenantId:string,inventoryId:string){
    const counts=await this.db.count.findMany({where:{tenantId,inventoryId},orderBy:{createdAt:"desc"},include:{rounds:{select:{name:true,status:true,assignedToId:true,assignedTo:{select:{name:true}}}}}});
    return counts.map(c=>{
      const rounds=c.rounds||[];
      const findUser=(rn:string)=>{const r=rounds.find((x:any)=>x.name===rn);return r?.assignedTo?.name||null;};
      const rondasCerradas=rounds.filter((r:any)=>r.status==="CLOSED").map((r:any)=>r.name);
      const allClosed=rondasCerradas.length>=rounds.length&&rounds.length>0;
      const hasC3=rounds.some((r:any)=>r.name==="C3");
      const c3Closed=rondasCerradas.includes("C3");
      const estado=allClosed?"completado":hasC3&&c3Closed?"enC2":hasC3?"enC3":"enC1";
      return {
        id:c.id,tenantId:c.tenantId,inventoryId:c.inventoryId,
        name:c.name,status:c.status,
        nombre:c.name,ubicacion:c.location,
        locLabel:c.locLabel||c.location,
        tipo:c.tipo||"2conteos",
        estado,
        usuarioC1:findUser("C1"),usuarioC2:findUser("C2"),usuarioC3:findUser("C3"),
        rondasCerradas,
        fechaCreacion:c.createdAt?.toISOString?.()||"",
        c1Cerrado:rondasCerradas.includes("C1"),
        c2Cerrado:rondasCerradas.includes("C2"),
        c3Cerrado:rondasCerradas.includes("C3"),
      };
    });
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

  async assignRound(tenantId:string,countId:string,roundName:CountRoundName,userId:string):Promise<void>{
    const existing=await this.db.countRound.findFirst({where:{countId,name:roundName,count:{tenantId}}});
    if(!existing)throw new Error("Ronda no encontrada");
    await this.db.countRound.update({where:{id:existing.id},data:{assignedToId:userId}});
  }

  async delete(tenantId:string,countId:string):Promise<void>{
    await this.db.count.deleteMany({where:{id:countId,tenantId}});
  }
}
