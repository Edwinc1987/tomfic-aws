import { Body, Controller, Get, Param, Put, Req, UseGuards } from "@nestjs/common";
import { ApiAuthGuard } from "../../../core/auth/cognito-auth.guard";
import { PrismaClient, Prisma } from "@prisma/client";

const db=new PrismaClient();

@Controller("v1/config")
@UseGuards(ApiAuthGuard)
export class ConfigController{
  @Get(":key")
  async get(@Req() request:{auth:{tenantId:string}},@Param("key") key:string){
    const row=await db.appConfig.findUnique({where:{key}});
    return row?.value??null;
  }

  @Put(":key")
  async set(@Req() request:{auth:{userId:string;tenantId:string;role:string}},@Param("key") key:string,@Body() body:{value:unknown}){
    const v=body.value as Prisma.InputJsonValue;
    await db.appConfig.upsert({where:{key},create:{key,value:v},update:{value:v}});
    return {ok:true};
  }
}
