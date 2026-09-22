import { Controller, Get, Post, Patch, Delete, Body, Param, Req, UseGuards, BadRequestException, NotFoundException } from "@nestjs/common";
import { ApiAuthGuard } from "../../../core/auth/cognito-auth.guard";
import { PrismaClient, Prisma } from "@prisma/client";

const db=new PrismaClient();

@Controller("v1/tenants")
@UseGuards(ApiAuthGuard)
export class TenantsController{

  @Get()
  async list(@Req() req:{auth:{role:string}}){
    const tenants=await db.tenant.findMany({include:{_count:{select:{users:true,products:true,inventories:true}}},orderBy:{createdAt:"desc"}});
    return tenants;
  }

  @Get(":id")
  async get(@Param("id") id:string){
    const tenant=await db.tenant.findUnique({where:{id}});
    if(!tenant)throw new NotFoundException("Empresa no encontrada");
    return tenant;
  }

  @Post()
  async create(@Req() req:{auth:{role:string}},@Body() body:{name:string;taxId:string}){
    if(req.auth.role!=="OWNER")throw new BadRequestException("Solo el dueño puede crear empresas");
    if(!body.name?.trim()||!body.taxId?.trim())throw new BadRequestException("name y taxId son obligatorios");
    return db.tenant.create({data:{name:body.name.trim(),taxId:body.taxId.trim()}});
  }

  @Patch(":id")
  async update(@Param("id") id:string,@Body() body:Record<string,unknown>){
    const tenant=await db.tenant.findUnique({where:{id}});
    if(!tenant)throw new NotFoundException("Empresa no encontrada");
    const allowed:Record<string,boolean>={name:true,active:true,stage:true,plan:true,monthlyPrice:true,expiresAt:true};
    const data:any={};
    for(const[k,v]of Object.entries(body)){if(allowed[k])data[k]=v;}
    return db.tenant.update({where:{id},data});
  }

  @Patch(":id/active")
  async setActive(@Param("id") id:string,@Body() body:{active:boolean}){
    const tenant=await db.tenant.findUnique({where:{id}});
    if(!tenant)throw new NotFoundException("Empresa no encontrada");
    return db.tenant.update({where:{id},data:{active:body.active}});
  }

  @Delete(":id")
  async remove(@Req() req:{auth:{role:string}},@Param("id") id:string){
    if(req.auth.role!=="OWNER")throw new BadRequestException("Solo el dueño puede eliminar empresas");
    const tenant=await db.tenant.findUnique({where:{id}});
    if(!tenant)throw new NotFoundException("Empresa no encontrada");
    return db.tenant.delete({where:{id}});
  }

  @Get(":id/payments")
  async listPayments(@Param("id") id:string){
    return db.payment.findMany({where:{tenantId:id},orderBy:{paidAt:"desc"}});
  }

  @Post(":id/payments")
  async createPayment(@Param("id") id:string,@Body() body:{amount:number;paidAt?:string;note?:string}){
    const tenant=await db.tenant.findUnique({where:{id}});
    if(!tenant)throw new NotFoundException("Empresa no encontrada");
    if(!(Number(body.amount)>0))throw new BadRequestException("amount debe ser mayor que cero");
    return db.payment.create({data:{tenantId:id,amount:new Prisma.Decimal(body.amount),paidAt:body.paidAt?new Date(body.paidAt):undefined,note:body.note}});
  }

  @Delete(":id/payments/:paymentId")
  async removePayment(@Param("id") id:string,@Param("paymentId") paymentId:string){
    return db.payment.deleteMany({where:{id:paymentId,tenantId:id}});
  }
}
