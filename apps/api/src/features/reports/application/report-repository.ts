export interface ReportRepository{
  inventoryResult(tenantId:string,inventoryId:string):Promise<unknown>;
  listTemplates(tenantId:string):Promise<unknown[]>;
  saveTemplate(tenantId:string,name:string,layout:unknown):Promise<unknown>;
}
