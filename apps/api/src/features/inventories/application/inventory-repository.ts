export type InventorySummary={id:string;tenantId:string;name:string;status:string;tipo?:string;closedAt?:string|null;closedBy?:string|null};

export interface InventoryRepository{
  list(tenantId:string):Promise<InventorySummary[]>;
  listClosed(tenantId:string):Promise<InventorySummary[]>;
  create(tenantId:string,name:string,tipo?:string):Promise<InventorySummary>;
  update(tenantId:string,id:string,patch:{name?:string;status?:string}):Promise<InventorySummary>;
  close(tenantId:string,id:string,closedBy:string,snapshots:unknown):Promise<InventorySummary>;
  delete(tenantId:string,id:string):Promise<void>;
}
