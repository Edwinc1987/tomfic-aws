import { CompanyStage, PrismaClient } from "@prisma/client";
import { CrmRepository } from "../../features/crm/application/crm-repository";

export class PrismaCrmRepository implements CrmRepository{
  constructor(private readonly db=new PrismaClient()){}
  private writeAudit(tx:any,tenantId:string,actorId:string,action:string,entityType:string,entityId:string,metadata?:unknown){return tx.auditEvent.create({data:{tenantId,actorId,action,entityType,entityId,metadata:metadata as any||undefined}});}

  async dashboard(tenantId:string,role:string){
    const global=role.toUpperCase()==="OWNER"||role.toUpperCase()==="COMMERCIAL";
    const where=global?{}:{id:tenantId};
    const companies=await this.db.tenant.findMany({where,select:{id:true,name:true,stage:true,active:true,expiresAt:true,monthlyPrice:true}});
    const now=new Date();const soon=new Date(now);soon.setDate(soon.getDate()+30);
    return{
      totalCompanies:companies.length,
      activeCompanies:companies.filter(company=>company.active).length,
      byStage:companies.reduce<Record<string,number>>((acc,company)=>{acc[company.stage]=(acc[company.stage]||0)+1;return acc;},{}),
      renewalsNext30Days:companies.filter(company=>company.expiresAt&&company.expiresAt>=now&&company.expiresAt<=soon).length,
      overdue:companies.filter(company=>company.expiresAt&&company.expiresAt<now).length,
      monthlyRevenue:companies.reduce((total,company)=>total+Number(company.monthlyPrice||0),0),
    };
  }

  getCompany(tenantId:string){return this.db.tenant.findUnique({where:{id:tenantId},select:{id:true,name:true,taxId:true,stage:true,plan:true,monthlyPrice:true,expiresAt:true,active:true}});}

  async changeStage(tenantId:string,actorId:string,stage:string){
    const next=stage.toUpperCase() as CompanyStage;
    if(!Object.values(CompanyStage).includes(next))throw new Error("Etapa comercial inválida");
    const current=await this.db.tenant.findUniqueOrThrow({where:{id:tenantId},select:{stage:true}});
    const transitions:Record<CompanyStage,CompanyStage[]>={
      PROSPECTO:[CompanyStage.DEMO,CompanyStage.RETIRADO],
      DEMO:[CompanyStage.PRUEBA,CompanyStage.ACTIVO,CompanyStage.EN_RIESGO,CompanyStage.RETIRADO],
      PRUEBA:[CompanyStage.ACTIVO,CompanyStage.EN_RIESGO,CompanyStage.RETIRADO],
      ACTIVO:[CompanyStage.EN_RIESGO,CompanyStage.SUSPENDIDO,CompanyStage.RETIRADO],
      EN_RIESGO:[CompanyStage.ACTIVO,CompanyStage.SUSPENDIDO,CompanyStage.RETIRADO],
      SUSPENDIDO:[CompanyStage.ACTIVO,CompanyStage.RETIRADO],
      RETIRADO:[],
    };
    if(current.stage!==next&&!transitions[current.stage].includes(next))throw new Error(`Transición inválida: ${current.stage} → ${next}`);
    return this.db.$transaction(async(tx)=>{
      const updated=await tx.tenant.update({where:{id:tenantId},data:{stage:next},select:{id:true,name:true,stage:true}});
      await this.writeAudit(tx,tenantId,actorId,"COMPANY_STAGE_CHANGED","TENANT",tenantId,{from:current.stage,to:next});
      return updated;
    });
  }

  listContacts(tenantId:string){return this.db.contact.findMany({where:{tenantId},orderBy:{name:"asc"}});}

  async createContact(tenantId:string,actorId:string,input:{name:string;email?:string;phone?:string;position?:string}){
    return this.db.$transaction(async(tx)=>{const contact=await tx.contact.create({data:{tenantId,name:input.name.trim(),email:input.email?.trim()||null,phone:input.phone?.trim()||null,position:input.position?.trim()||null}});await this.writeAudit(tx,tenantId,actorId,"CONTACT_CREATED","CONTACT",contact.id);return contact;});
  }

  listActivities(tenantId:string){return this.db.crmActivity.findMany({where:{tenantId},orderBy:{createdAt:"desc"},take:100});}

  async createActivity(tenantId:string,actorId:string,input:{type:string;title:string;description?:string;dueAt?:string;ownerId?:string}){
    return this.db.$transaction(async(tx)=>{const activity=await tx.crmActivity.create({data:{tenantId,type:input.type,title:input.title.trim(),description:input.description?.trim()||null,dueAt:input.dueAt?new Date(input.dueAt):null,ownerId:input.ownerId||null}});await this.writeAudit(tx,tenantId,actorId,"ACTIVITY_CREATED","CRM_ACTIVITY",activity.id);return activity;});
  }

  async createNote(tenantId:string,authorId:string,body:string){return this.db.$transaction(async(tx)=>{const note=await tx.companyNote.create({data:{tenantId,authorId,body:body.trim()}});await this.writeAudit(tx,tenantId,authorId,"NOTE_CREATED","COMPANY_NOTE",note.id);return note;});}

  listPayments(tenantId:string){return this.db.payment.findMany({where:{tenantId},orderBy:{paidAt:"desc"}});}

  async registerPayment(tenantId:string,actorId:string,input:{amount:number;paidAt?:string;receiptKey?:string;note?:string}){
    return this.db.$transaction(async(tx)=>{
      const payment=await tx.payment.create({data:{tenantId,amount:input.amount,paidAt:input.paidAt?new Date(input.paidAt):new Date(),receiptKey:input.receiptKey||null,note:input.note||null}});
      const expiresAt=new Date(payment.paidAt);expiresAt.setDate(expiresAt.getDate()+30);
      await tx.tenant.update({where:{id:tenantId},data:{expiresAt,active:true}});
      await this.writeAudit(tx,tenantId,actorId,"PAYMENT_REGISTERED","PAYMENT",payment.id,{amount:input.amount,expiresAt});
      return payment;
    });
  }

  listTickets(tenantId:string){return this.db.supportTicket.findMany({where:{tenantId},orderBy:{createdAt:"desc"},take:100});}

  async createTicket(tenantId:string,actorId:string,input:{title:string;description?:string;priority?:string}){
    return this.db.$transaction(async(tx)=>{const ticket=await tx.supportTicket.create({data:{tenantId,title:input.title.trim(),description:input.description?.trim()||null,priority:(input.priority||"MEDIUM") as any}});await this.writeAudit(tx,tenantId,actorId,"TICKET_CREATED","SUPPORT_TICKET",ticket.id);return ticket;});
  }

  getHealth(tenantId:string){return this.db.customerHealth.findUnique({where:{tenantId}});}
}
