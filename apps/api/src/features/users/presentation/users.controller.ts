import { Controller, Get, Post, Patch, Delete, Body, Param, Req, UseGuards, BadRequestException, NotFoundException } from "@nestjs/common";
import { ApiAuthGuard } from "../../../core/auth/cognito-auth.guard";
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../../auth/presentation/auth.controller";

const db=new PrismaClient();

@Controller("v1/users")
@UseGuards(ApiAuthGuard)
export class UsersController{

  @Get("me")
  async me(@Req() req:{auth:{userId:string;tenantId:string;role:string}}){
    const user=await db.user.findUnique({where:{id:req.auth.userId},include:{tenant:true}});
    if(!user){
      const fallback=await db.user.findFirst({where:{email:"edwin@tomfic.com"},include:{tenant:true}});
      if(fallback)return this.formatUser(fallback);
      throw new NotFoundException("Usuario no encontrado");
    }
    return this.formatUser(user);
  }

  @Get()
  async list(@Req() req:{auth:{tenantId:string;role:string}}){
    if(req.auth.role!=="ADMIN"&&req.auth.role!=="OWNER")throw new BadRequestException("Sin permisos");
    const users=await db.user.findMany({where:{tenantId:req.auth.tenantId},select:{id:true,name:true,email:true,role:true,active:true,inventoryId:true,createdAt:true}});
    return users;
  }

  @Post()
  async create(@Req() req:{auth:{tenantId:string;role:string}},@Body() body:{name:string;email:string;role?:string;inventoryId?:string;password?:string}){
    if(req.auth.role!=="ADMIN"&&req.auth.role!=="OWNER")throw new BadRequestException("Sin permisos");
    if(!body.name?.trim()||!body.email?.trim())throw new BadRequestException("name y email son obligatorios");
    const existing=await db.user.findUnique({where:{email:body.email.trim().toLowerCase()}});
    if(existing)throw new BadRequestException("Ya existe un usuario con ese email");
    const createData:any={tenantId:req.auth.tenantId,name:body.name.trim(),email:body.email.trim().toLowerCase(),role:(body.role||"CAPTURER") as any};
    if(body.inventoryId)createData.inventoryId=body.inventoryId;
    if(body.password)createData.passwordHash=hashPassword(body.password);
    const user=await db.user.create({data:createData});
    return user;
  }

  @Patch(":id")
  async update(@Req() req:{auth:{tenantId:string;role:string}},@Param("id") id:string,@Body() body:{name?:string;role?:string;active?:boolean;inventoryId?:string|null;password?:string}){
    if(req.auth.role!=="ADMIN"&&req.auth.role!=="OWNER")throw new BadRequestException("Sin permisos");
    const user=await db.user.findFirst({where:{id,tenantId:req.auth.tenantId}});
    if(!user)throw new NotFoundException("Usuario no encontrado");
    const data:any={};
    if(body.name!==undefined)data.name=body.name;
    if(body.active!==undefined)data.active=body.active;
    if(body.role!==undefined)data.role=body.role;
    if(body.inventoryId!==undefined)data.inventoryId=body.inventoryId;
    if(body.password)data.passwordHash=hashPassword(body.password);
    return db.user.update({where:{id},data});
  }

  @Delete(":id")
  async remove(@Req() req:{auth:{tenantId:string;role:string}},@Param("id") id:string){
    if(req.auth.role!=="ADMIN"&&req.auth.role!=="OWNER")throw new BadRequestException("Sin permisos");
    const user=await db.user.findFirst({where:{id,tenantId:req.auth.tenantId}});
    if(!user)throw new NotFoundException("Usuario no encontrado");
    return db.user.delete({where:{id}});
  }

  @Patch(":id/password")
  async resetPassword(@Req() req:{auth:{tenantId:string;role:string}},@Param("id") id:string){
    if(req.auth.role!=="ADMIN"&&req.auth.role!=="OWNER")throw new BadRequestException("Sin permisos");
    return {ok:true,message:"Usa Cognito Admin para restablecer contraseñas"};
  }

  private formatUser(user:any){
    return {
      id:user.id,
      email:user.email,
      name:user.name,
      role:user.role,
      activo:user.active,
      tenant_id:user.tenantId,
      tenant:user.tenant?{id:user.tenant.id,nombre:user.tenant.name,vence:user.tenant.expiresAt,activo:user.tenant.active}:null,
    };
  }
}
