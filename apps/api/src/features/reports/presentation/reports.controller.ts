import { BadRequestException, Body, Controller, Get, Inject, Post, Query, Req, UseGuards } from "@nestjs/common";
import { ApiAuthGuard } from "../../../core/auth/cognito-auth.guard";
import { requirePermission } from "../../../core/auth/authorization";
import { ReportRepository } from "../application/report-repository";

@Controller("v1/reports")
@UseGuards(ApiAuthGuard)
export class ReportsController{
  constructor(@Inject("ReportRepository") private readonly repository:ReportRepository){}

  @Get("inventory")
  inventory(@Req() request:{auth:{tenantId:string}},@Query("inventoryId") inventoryId?:string){
    if(!inventoryId)throw new BadRequestException("inventoryId es obligatorio");
    return this.repository.inventoryResult(request.auth.tenantId,inventoryId);
  }
}
