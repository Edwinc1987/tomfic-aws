import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from "@nestjs/common";
import { ApiAuthGuard } from "../../../core/auth/cognito-auth.guard";
import { PrismaClient } from "@prisma/client";

const db=new PrismaClient();

@Controller("v1/leads")
@UseGuards(ApiAuthGuard)
export class LeadsController{
  @Get()
  async list(){
    return db.lead.findMany({orderBy:{createdAt:"desc"}});
  }

  @Post()
  async create(@Body() body:{name?:string;email?:string;phone?:string;message?:string}){
    return db.lead.create({data:{name:body.name||"",email:body.email||null,phone:body.phone||null,message:body.message||null}});
  }

  @Patch(":id")
  async update(@Param("id") id:string,@Body() body:{status?:string;name?:string;email?:string;phone?:string;message?:string}){
    const data:Record<string,unknown>={};
    if(body.status!==undefined)data.status=body.status;
    if(body.name!==undefined)data.name=body.name;
    if(body.email!==undefined)data.email=body.email;
    if(body.phone!==undefined)data.phone=body.phone;
    if(body.message!==undefined)data.message=body.message;
    return db.lead.update({where:{id},data});
  }

  @Delete(":id")
  async remove(@Param("id") id:string){
    await db.lead.delete({where:{id}});
    return {ok:true};
  }
}
