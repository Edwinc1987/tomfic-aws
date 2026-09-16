import { PrismaClient } from "@prisma/client";
import { AuditRepository } from "../../features/crm/application/audit-repository";

export class PrismaAuditRepository implements AuditRepository{
  constructor(private readonly db=new PrismaClient()){}
  list(tenantId:string){return this.db.auditEvent.findMany({where:{tenantId},orderBy:{createdAt:"desc"},take:200});}
}
