import { PrismaClient } from "@prisma/client";
import { InventoryRepository, InventorySummary } from "../../features/inventories/application/inventory-repository";

export class PrismaInventoryRepository implements InventoryRepository{
  constructor(private readonly db=new PrismaClient()){}

  async list(tenantId:string):Promise<InventorySummary[]>{
    return this.db.inventory.findMany({
      where:{tenantId},
      orderBy:{createdAt:"desc"},
      select:{id:true,tenantId:true,name:true,status:true},
    });
  }

  async create(tenantId:string,name:string):Promise<InventorySummary>{
    return this.db.inventory.create({
      data:{tenantId,name:name.trim()},
      select:{id:true,tenantId:true,name:true,status:true},
    });
  }
}
