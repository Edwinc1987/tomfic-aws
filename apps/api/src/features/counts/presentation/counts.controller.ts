import { BadRequestException, Body, Controller, Delete, Get, Inject, Param, Post, Query, Req, UseGuards } from "@nestjs/common";
import { ApiAuthGuard } from "../../../core/auth/cognito-auth.guard";
import { requirePermission } from "../../../core/auth/authorization";
import { CountRoundName } from "@prisma/client";
import { CountRepository } from "../application/count-repository";

@Controller("v1/counts")
@UseGuards(ApiAuthGuard)
export class CountsController{
  constructor(@Inject("CountRepository") private readonly repository:CountRepository){}

  @Get()
  list(@Req() request:{auth:{tenantId:string}},@Query("inventoryId") inventoryId?:string){
    if(!inventoryId)throw new BadRequestException("inventoryId es obligatorio");
    return this.repository.list(request.auth.tenantId,inventoryId);
  }

  @Post()
  create(@Req() request:{auth:{userId:string;tenantId:string;role:string}},@Body() body:{inventoryId?:string;name?:string;location?:string;locLabel?:string;tipo?:string;rounds?:CountRoundName[]}){
    requirePermission(request.auth,"counts:close");
    if(!body.inventoryId||!body.name?.trim()||!body.location?.trim())throw new BadRequestException("inventoryId, name y location son obligatorios");
    const rounds=body.rounds?.length?body.rounds:[CountRoundName.C1,CountRoundName.C2];
    if(rounds.some(round=>!Object.values(CountRoundName).includes(round)))throw new BadRequestException("Ronda inválida");
    return this.repository.create(request.auth.tenantId,body.inventoryId,body.name.trim(),body.location.trim(),rounds,body.tipo,body.locLabel);
  }

  @Post(":countId/rounds/:round/close")
  close(@Req() request:{auth:{userId:string;tenantId:string;role:string}},@Param("countId") countId:string,@Param("round") round:string){
    requirePermission(request.auth,"counts:close");
    if(!Object.values(CountRoundName).includes(round as CountRoundName))throw new BadRequestException("Ronda inválida");
    return this.repository.closeRound(request.auth.tenantId,countId,round as CountRoundName);
  }

  @Post(":countId/rounds/:round/assign")
  assign(@Req() request:{auth:{userId:string;tenantId:string;role:string}},@Param("countId") countId:string,@Param("round") round:string,@Body() body:{userId?:string}){
    requirePermission(request.auth,"counts:close");
    if(!Object.values(CountRoundName).includes(round as CountRoundName))throw new BadRequestException("Ronda inválida");
    if(!body.userId)throw new BadRequestException("userId es obligatorio");
    return this.repository.assignRound(request.auth.tenantId,countId,round as CountRoundName,body.userId);
  }

  @Post(":countId/rounds/:round/reopen")
  reopen(@Req() request:{auth:{userId:string;tenantId:string;role:string}},@Param("countId") countId:string,@Param("round") round:string){
    requirePermission(request.auth,"counts:close");
    if(!Object.values(CountRoundName).includes(round as CountRoundName))throw new BadRequestException("Ronda inválida");
    return this.repository.reopenRound(request.auth.tenantId,countId,round as CountRoundName);
  }

  @Delete(":countId")
  remove(@Req() request:{auth:{userId:string;tenantId:string;role:string}},@Param("countId") countId:string){
    requirePermission(request.auth,"inventories:manage");
    return this.repository.delete(request.auth.tenantId,countId);
  }
}
