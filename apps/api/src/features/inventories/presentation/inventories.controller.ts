import { BadRequestException, Body, Controller, Get, Inject, Post, Req, UseGuards } from "@nestjs/common";
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

  @Post()
  create(@Req() request:{auth:{userId:string;tenantId:string;role:string}},@Body() body:{name?:string}){
    requirePermission(request.auth,"inventories:manage");
    if(!body.name?.trim())throw new BadRequestException("name es obligatorio");
    return this.repository.create(request.auth.tenantId,body.name);
  }
}
