import { NestFactory } from "@nestjs/core";
import { ExpressAdapter } from "@nestjs/platform-express";
import serverlessExpress from "@vendia/serverless-express";
import { AppModule } from "./app.module";
import { ensureDatabaseUrl, ensureAuthSecret } from "./core/db-url";

let proxy:any;

const bootstrap=async()=>{
  // RDS + AUTH_SECRET: se resuelven desde Secrets Manager antes de arrancar.
  await ensureDatabaseUrl();
  await ensureAuthSecret();
  const app=await NestFactory.create(AppModule,new ExpressAdapter());
  app.enableCors();
  await app.init();
  return serverlessExpress({app:app.getHttpAdapter().getInstance()});
};

export const handler=async(event:any,context:any)=>{
  proxy=proxy||await bootstrap();
  return proxy(event,context);
};
