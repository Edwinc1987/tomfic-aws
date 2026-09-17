export interface ReportRepository{
  inventoryResult(tenantId:string,inventoryId:string):Promise<unknown>;
}
