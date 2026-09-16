export type InventorySummary={id:string;tenantId:string;name:string;status:string};

export interface InventoryRepository{
  list(tenantId:string):Promise<InventorySummary[]>;
  create(tenantId:string,name:string):Promise<InventorySummary>;
}
