import { BadRequestException, Body, Controller, Get, Inject, Param, Post, Req, UseGuards } from "@nestjs/common";
import { ApiAuthGuard } from "../../../core/auth/cognito-auth.guard";
import { requirePermission } from "../../../core/auth/authorization";
import { CaptureRepository } from "../application/capture-repository";

@Controller("v1/captures")
@UseGuards(ApiAuthGuard)
export class CapturesController{
  constructor(@Inject("CaptureRepository") private readonly repository:CaptureRepository){}

  @Get(":captureId")
  details(@Req() request:{auth:{tenantId:string}},@Param("captureId") captureId:string){
    return this.repository.getDetails(request.auth.tenantId,captureId);
  }

  @Post()
  create(@Req() request:{auth:{userId:string;tenantId:string;role:string}},@Body() body:{operationId?:string;productId?:string;roundId?:string;countId?:string;round?:string;quantity?:number;condition?:string}){
    requirePermission(request.auth,"counts:capture");
    if(!body.operationId||!body.productId||(!body.roundId&&(!body.countId||!body.round))||body.quantity===undefined)throw new BadRequestException("operationId, productId, roundId o countId/round y quantity son obligatorios");
    if(!Number.isFinite(Number(body.quantity)))throw new BadRequestException("quantity inválida");
    return this.repository.createIdempotent({operationId:body.operationId,productId:body.productId,roundId:body.roundId,countId:body.countId,round:body.round as any,quantity:Number(body.quantity),condition:body.condition||"BUENO",tenantId:request.auth.tenantId});
  }

  @Post(":captureId/comments")
  comment(@Req() request:{auth:{userId:string;tenantId:string;role:string}},@Param("captureId") captureId:string,@Body() body:{body?:string}){
    requirePermission(request.auth,"counts:capture");
    if(!body.body?.trim())throw new BadRequestException("body es obligatorio");
    return this.repository.addComment(request.auth.tenantId,request.auth.userId,captureId,body.body);
  }

  @Post(":captureId/evidence")
  evidence(@Req() request:{auth:{userId:string;tenantId:string;role:string}},@Param("captureId") captureId:string,@Body() body:{storageKey?:string;fileName?:string;contentType?:string}){
    requirePermission(request.auth,"counts:capture");
    if(!body.storageKey||!body.fileName||!body.contentType)throw new BadRequestException("storageKey, fileName y contentType son obligatorios");
    return this.repository.addEvidence(request.auth.tenantId,request.auth.userId,captureId,{storageKey:body.storageKey,fileName:body.fileName,contentType:body.contentType});
  }
}
