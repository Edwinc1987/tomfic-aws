import { NestFactory } from "@nestjs/core";
import { ExpressAdapter } from "@nestjs/platform-express";
import serverlessExpress from "@vendia/serverless-express";
import { ensureDatabaseUrl, ensureAuthSecret } from "./core/db-url";

let proxy:any;

const bootstrap=async()=>{
  // RDS + AUTH_SECRET: se resuelven desde Secrets Manager antes de arrancar.
  await ensureDatabaseUrl();
  await ensureAuthSecret();
  // Importar el AppModule DESPUÉS de resolver DATABASE_URL (PrismaClient
  // captura la env var en su constructor).
  const { AppModule } = await import("./app.module");
  const app=await NestFactory.create(AppModule,new ExpressAdapter());
  app.enableCors();
  await app.init();
  return serverlessExpress({app:app.getHttpAdapter().getInstance()});
};

export const handler=async(event:any,context:any)=>{
  proxy=proxy||await bootstrap();
  return proxy(event,context);
};
