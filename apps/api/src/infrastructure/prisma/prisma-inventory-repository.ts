import { PrismaClient, Prisma } from "@prisma/client";
import { InventoryMeta, InventoryRepository, InventorySummary } from "../../features/inventories/application/inventory-repository";

const mergeSnap=(existing:unknown,meta?:InventoryMeta):Prisma.InputJsonValue=>{
  const base=(existing&&typeof existing==="object"&&!Array.isArray(existing))?{...(existing as Record<string,unknown>)}:{};
  if(meta)base.meta={...((base.meta as Record<string,unknown>)||{}),...meta};
  return base as Prisma.InputJsonValue;
};

const metaFromSnap=(snap:unknown):InventoryMeta=>{
  if(!snap||typeof snap!=="object"||Array.isArray(snap))return{};
  const m=(snap as Record<string,unknown>).meta;
  return(m&&typeof m==="object"&&!Array.isArray(m))?(m as InventoryMeta):{};
};

export class PrismaInventoryRepository implements InventoryRepository{
  constructor(private readonly db=new PrismaClient()){}

  private toSummary(row:{id:string;tenantId:string;name:string;status:string;tipo?:string|null;closedAt?:Date|null;closedBy?:string|null;snapshotsJson?:unknown}):InventorySummary{
    const meta=metaFromSnap(row.snapshotsJson);
    return{
      id:row.id,tenantId:row.tenantId,name:row.name,status:row.status,tipo:row.tipo||undefined,
      closedAt:row.closedAt?row.closedAt.toISOString():null,closedBy:row.closedBy??null,
      meta,snapshotsJson:row.snapshotsJson??null,
    };
  }

  async list(tenantId:string):Promise<InventorySummary[]>{
    const rows=await this.db.inventory.findMany({
      where:{tenantId,status:"OPEN"},
      orderBy:{createdAt:"desc"},
      select:{id:true,tenantId:true,name:true,status:true,tipo:true,closedAt:true,closedBy:true,snapshotsJson:true},
    });
    return rows.map(r=>this.toSummary(r));
  }

  async listClosed(tenantId:string):Promise<InventorySummary[]>{
    const rows=await this.db.inventory.findMany({
      where:{tenantId,status:"CLOSED"},
      orderBy:{closedAt:"desc"},
      select:{id:true,tenantId:true,name:true,status:true,tipo:true,closedAt:true,closedBy:true,snapshotsJson:true},
    });
    return rows.map(r=>this.toSummary(r));
  }

  async create(tenantId:string,name:string,tipo?:string,meta?:InventoryMeta,id?:string):Promise<InventorySummary>{
    const row=await this.db.inventory.create({
      data:{
        ...(id?{id}:{}),
        tenantId,
        name:name.trim(),
        tipo:tipo||"2conteos",
        ...(meta?{snapshotsJson:mergeSnap(undefined,meta) as Prisma.InputJsonValue}:{}),
      },
      select:{id:true,tenantId:true,name:true,status:true,tipo:true,closedAt:true,closedBy:true,snapshotsJson:true},
    });
    return this.toSummary(row);
  }

  async update(tenantId:string,id:string,patch:{name?:string;status?:string;tipo?:string;meta?:InventoryMeta}):Promise<InventorySummary>{
    const data:Record<string,unknown>={};
    if(patch.name!==undefined)data.name=patch.name.trim();
    if(patch.status!==undefined)data.status=patch.status;
    if(patch.tipo!==undefined)data.tipo=patch.tipo;
    if(patch.meta){
      const current=await this.db.inventory.findFirst({where:{id,tenantId},select:{snapshotsJson:true}});
      data.snapshotsJson=mergeSnap(current?.snapshotsJson,patch.meta);
    }
    const row=await this.db.inventory.update({
      where:{id,tenantId},
      data,
      select:{id:true,tenantId:true,name:true,status:true,tipo:true,closedAt:true,closedBy:true,snapshotsJson:true},
    });
    return this.toSummary(row);
  }

  async close(tenantId:string,id:string,closedBy:string,snapshots:unknown):Promise<InventorySummary>{
    const row=await this.db.inventory.update({
      where:{id,tenantId},
      data:{status:"CLOSED",closedAt:new Date(),closedBy,snapshotsJson:snapshots as Prisma.InputJsonValue},
      select:{id:true,tenantId:true,name:true,status:true,tipo:true,closedAt:true,closedBy:true,snapshotsJson:true},
    });
    return this.toSummary(row);
  }

  async delete(tenantId:string,id:string):Promise<void>{
    await this.db.inventory.deleteMany({where:{id,tenantId}});
  }
}
