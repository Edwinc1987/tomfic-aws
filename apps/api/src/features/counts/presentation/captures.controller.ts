import { BadRequestException, Body, Controller, Inject, Post, Req, UseGuards } from "@nestjs/common";
import { ApiAuthGuard } from "../../../core/auth/cognito-auth.guard";
import { requirePermission } from "../../../core/auth/authorization";
import { CaptureRepository } from "../application/capture-repository";

@Controller("v1/captures")
@UseGuards(ApiAuthGuard)
export class CapturesController{
  constructor(@Inject("CaptureRepository") private readonly repository:CaptureRepository){}

  @Post()
  create(@Req() request:{auth:{userId:string;tenantId:string;role:string}},@Body() body:{operationId?:string;productId?:string;roundId?:string;countId?:string;round?:string;quantity?:number;condition?:string}){
    requirePermission(request.auth,"counts:capture");
    if(!body.operationId||!body.productId||(!body.roundId&&(!body.countId||!body.round))||body.quantity===undefined)throw new BadRequestException("operationId, productId, roundId o countId/round y quantity son obligatorios");
    if(!Number.isFinite(Number(body.quantity))||Number(body.quantity)<0)throw new BadRequestException("quantity inválida");
    return this.repository.createIdempotent({operationId:body.operationId,productId:body.productId,roundId:body.roundId,countId:body.countId,round:body.round as any,quantity:Number(body.quantity),condition:body.condition||"BUENO",tenantId:request.auth.tenantId});
  }
}
