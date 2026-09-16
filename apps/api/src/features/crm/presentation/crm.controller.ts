import { BadRequestException, Body, Controller, Get, Inject, Post, Req, UseGuards } from "@nestjs/common";
import { ApiAuthGuard } from "../../../core/auth/cognito-auth.guard";
import { requirePermission } from "../../../core/auth/authorization";
import { CrmRepository } from "../application/crm-repository";
import { AuditRepository } from "../application/audit-repository";

@Controller("v1/crm")
@UseGuards(ApiAuthGuard)
export class CrmController{
  constructor(@Inject("CrmRepository") private readonly repository:CrmRepository,@Inject("AuditRepository") private readonly audit:AuditRepository){}

  @Get("audit")
  auditEvents(@Req() request:{auth:{userId:string;tenantId:string;role:string}}){
    requirePermission(request.auth,"tenant:manage");
    return this.audit.list(request.auth.tenantId);
  }

  @Get("dashboard")
  dashboard(@Req() request:{auth:{userId:string;tenantId:string;role:string}}){
    requirePermission(request.auth,"reports:read");
    return this.repository.dashboard(request.auth.tenantId,request.auth.role);
  }

  @Get("profile")
  profile(@Req() request:{auth:{tenantId:string}}){return this.repository.getCompany(request.auth.tenantId);}

  @Post("profile/stage")
  changeStage(@Req() request:{auth:{userId:string;tenantId:string;role:string}},@Body() body:{stage?:string}){
    requirePermission(request.auth,"tenant:manage");
    if(!body.stage?.trim())throw new BadRequestException("stage es obligatorio");
    return this.repository.changeStage(request.auth.tenantId,body.stage.trim());
  }

  @Get("contacts")
  contacts(@Req() request:{auth:{tenantId:string}}){return this.repository.listContacts(request.auth.tenantId);}

  @Post("contacts")
  createContact(@Req() request:{auth:{userId:string;tenantId:string;role:string}},@Body() body:{name?:string;email?:string;phone?:string;position?:string}){
    requirePermission(request.auth,"tenant:manage");
    if(!body.name?.trim())throw new BadRequestException("name es obligatorio");
    return this.repository.createContact(request.auth.tenantId,{name:body.name,email:body.email,phone:body.phone,position:body.position});
  }

  @Get("activities")
  activities(@Req() request:{auth:{tenantId:string}}){return this.repository.listActivities(request.auth.tenantId);}

  @Post("activities")
  createActivity(@Req() request:{auth:{userId:string;tenantId:string;role:string}},@Body() body:{type?:string;title?:string;description?:string;dueAt?:string;ownerId?:string}){
    requirePermission(request.auth,"tenant:manage");
    if(!body.type?.trim()||!body.title?.trim())throw new BadRequestException("type y title son obligatorios");
    return this.repository.createActivity(request.auth.tenantId,{type:body.type,title:body.title,description:body.description,dueAt:body.dueAt,ownerId:body.ownerId});
  }

  @Post("notes")
  createNote(@Req() request:{auth:{userId:string;tenantId:string;role:string}},@Body() body:{body?:string}){
    requirePermission(request.auth,"tenant:manage");
    if(!body.body?.trim())throw new BadRequestException("body es obligatorio");
    return this.repository.createNote(request.auth.tenantId,request.auth.userId,body.body);
  }

  @Get("payments")
  payments(@Req() request:{auth:{tenantId:string}}){return this.repository.listPayments(request.auth.tenantId);}

  @Post("payments")
  registerPayment(@Req() request:{auth:{userId:string;tenantId:string;role:string}},@Body() body:{amount?:number;paidAt?:string;receiptKey?:string;note?:string}){
    requirePermission(request.auth,"billing:read");
    if(!(Number(body.amount)>0))throw new BadRequestException("amount debe ser mayor que cero");
    return this.repository.registerPayment(request.auth.tenantId,{amount:Number(body.amount),paidAt:body.paidAt,receiptKey:body.receiptKey,note:body.note});
  }

  @Get("tickets")
  tickets(@Req() request:{auth:{tenantId:string}}){return this.repository.listTickets(request.auth.tenantId);}

  @Post("tickets")
  createTicket(@Req() request:{auth:{userId:string;tenantId:string;role:string}},@Body() body:{title?:string;description?:string;priority?:string}){
    requirePermission(request.auth,"tenant:manage");
    if(!body.title?.trim())throw new BadRequestException("title es obligatorio");
    return this.repository.createTicket(request.auth.tenantId,{title:body.title,description:body.description,priority:body.priority});
  }

  @Get("health")
  health(@Req() request:{auth:{tenantId:string}}){return this.repository.getHealth(request.auth.tenantId);}
}
