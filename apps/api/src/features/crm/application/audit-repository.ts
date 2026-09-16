export interface AuditRepository{
  list(tenantId:string):Promise<unknown[]>;
}
