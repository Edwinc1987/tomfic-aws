import { Controller, Get } from "@nestjs/common";

@Controller("health")
export class HealthController{
  @Get()
  status(){
    return{
      status:"ok",
      service:"tomfic-api",
      version:process.env.npm_package_version||"0.1.0",
      timestamp:new Date().toISOString(),
    };
  }
}
