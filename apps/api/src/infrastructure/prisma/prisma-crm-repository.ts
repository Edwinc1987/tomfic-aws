import { PrismaClient } from "@prisma/client";
import { CrmRepository } from "../../features/crm/application/crm-repository";

export class PrismaCrmRepository implements CrmRepository{
  constructor(private readonly db=new PrismaClient()){}

  listContacts(tenantId:string){return this.db.contact.findMany({where:{tenantId},orderBy:{name:"asc"}});}

  createContact(tenantId:string,input:{name:string;email?:string;phone?:string;position?:string}){
    return this.db.contact.create({data:{tenantId,name:input.name.trim(),email:input.email?.trim()||null,phone:input.phone?.trim()||null,position:input.position?.trim()||null}});
  }

  listActivities(tenantId:string){return this.db.crmActivity.findMany({where:{tenantId},orderBy:{createdAt:"desc"},take:100});}

  createActivity(tenantId:string,input:{type:string;title:string;description?:string;dueAt?:string;ownerId?:string}){
    return this.db.crmActivity.create({data:{tenantId,type:input.type,title:input.title.trim(),description:input.description?.trim()||null,dueAt:input.dueAt?new Date(input.dueAt):null,ownerId:input.ownerId||null}});
  }

  createNote(tenantId:string,authorId:string,body:string){return this.db.companyNote.create({data:{tenantId,authorId,body:body.trim()}});}
}
