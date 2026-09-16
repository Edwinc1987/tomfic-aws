import { BadRequestException, Body, Controller, Get, Inject, Post, Req, UseGuards } from "@nestjs/common";
import { ApiAuthGuard } from "../../../core/auth/cognito-auth.guard";
import { requirePermission } from "../../../core/auth/authorization";
import { CrmRepository } from "../application/crm-repository";

@Controller("v1/crm")
@UseGuards(ApiAuthGuard)
export class CrmController{
  constructor(@Inject("CrmRepository") private readonly repository:CrmRepository){}

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
}
