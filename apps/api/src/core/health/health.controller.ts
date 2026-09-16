import { Controller, Get } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";

@Controller("health")
export class HealthController{
  constructor(private readonly db=new PrismaClient()){}
  @Get()
  status(){
    return{
      status:"ok",
      service:"tomfic-api",
      version:process.env.npm_package_version||"0.1.0",
      timestamp:new Date().toISOString(),
    };
  }

  @Get("ready")
  async ready(){
    await this.db.$queryRaw`SELECT 1`;
    return{status:"ready",database:"ok",timestamp:new Date().toISOString()};
  }
}
