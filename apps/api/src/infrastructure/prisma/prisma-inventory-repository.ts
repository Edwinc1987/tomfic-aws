import { PrismaClient } from "@prisma/client";
import { InventoryRepository, InventorySummary } from "../../features/inventories/application/inventory-repository";

export class PrismaInventoryRepository implements InventoryRepository{
  constructor(private readonly db=new PrismaClient()){}

  async list(tenantId:string):Promise<InventorySummary[]>{
    return this.db.inventory.findMany({
      where:{tenantId,status:"OPEN"},
      orderBy:{createdAt:"desc"},
      select:{id:true,tenantId:true,name:true,status:true,tipo:true,closedAt:true,closedBy:true},
    });
  }

  async listClosed(tenantId:string):Promise<InventorySummary[]>{
    return this.db.inventory.findMany({
      where:{tenantId,status:"CLOSED"},
      orderBy:{closedAt:"desc"},
      select:{id:true,tenantId:true,name:true,status:true,tipo:true,closedAt:true,closedBy:true,snapshotsJson:true},
    });
  }

  async create(tenantId:string,name:string,tipo?:string):Promise<InventorySummary>{
    return this.db.inventory.create({
      data:{tenantId,name:name.trim(),tipo:tipo||"2conteos"},
      select:{id:true,tenantId:true,name:true,status:true,tipo:true},
    });
  }

  async update(tenantId:string,id:string,patch:{name?:string;status?:string}):Promise<InventorySummary>{
    const data:Record<string,unknown>={};
    if(patch.name!==undefined)data.name=patch.name.trim();
    if(patch.status!==undefined)data.status=patch.status;
    return this.db.inventory.update({where:{id,tenantId},data,select:{id:true,tenantId:true,name:true,status:true,tipo:true}});
  }

  async close(tenantId:string,id:string,closedBy:string,snapshots:unknown):Promise<InventorySummary>{
    return this.db.inventory.update({
      where:{id,tenantId},
      data:{status:"CLOSED",closedAt:new Date(),closedBy,snapshotsJson:snapshots as any},
      select:{id:true,tenantId:true,name:true,status:true,tipo:true,closedAt:true,closedBy:true},
    });
  }

  async delete(tenantId:string,id:string):Promise<void>{
    await this.db.inventory.deleteMany({where:{id,tenantId}});
  }
}
