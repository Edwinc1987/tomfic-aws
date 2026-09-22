import { BadRequestException, Body, Controller, Delete, Get, Inject, Param, Patch, Post, Req, UseGuards } from "@nestjs/common";
import { ApiAuthGuard } from "../../../core/auth/cognito-auth.guard";
import { requirePermission } from "../../../core/auth/authorization";
import { InventoryRepository } from "../application/inventory-repository";

@Controller("v1/inventories")
@UseGuards(ApiAuthGuard)
export class InventoriesController{
  constructor(@Inject("InventoryRepository") private readonly repository:InventoryRepository){}

  @Get()
  list(@Req() request:{auth:{tenantId:string}}){
    return this.repository.list(request.auth.tenantId);
  }

  @Get("closed")
  listClosed(@Req() request:{auth:{tenantId:string}}){
    return this.repository.listClosed(request.auth.tenantId);
  }

  @Post()
  create(@Req() request:{auth:{userId:string;tenantId:string;role:string}},@Body() body:{name?:string;tipo?:string}){
    requirePermission(request.auth,"inventories:manage");
    if(!body.name?.trim())throw new BadRequestException("name es obligatorio");
    return this.repository.create(request.auth.tenantId,body.name,body.tipo);
  }

  @Patch(":id")
  update(@Req() request:{auth:{userId:string;tenantId:string;role:string}},@Param("id") id:string,@Body() body:{name?:string;status?:string}){
    requirePermission(request.auth,"inventories:manage");
    return this.repository.update(request.auth.tenantId,id,body);
  }

  @Post(":id/close")
  close(@Req() request:{auth:{userId:string;tenantId:string;role:string}},@Param("id") id:string,@Body() body:{snapshots?:unknown}){
    requirePermission(request.auth,"inventories:manage");
    return this.repository.close(request.auth.tenantId,id,request.auth.userId,body.snapshots||{});
  }

  @Delete(":id")
  remove(@Req() request:{auth:{userId:string;tenantId:string;role:string}},@Param("id") id:string){
    requirePermission(request.auth,"inventories:manage");
    return this.repository.delete(request.auth.tenantId,id);
  }
}
