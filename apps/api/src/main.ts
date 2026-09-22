import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { ExpressAdapter } from "@nestjs/platform-express";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { AppModule } from "./app.module";
import { ensureDatabaseUrl, ensureAuthSecret } from "./core/db-url";
import express from "express";
import cors from "cors";

export const apiVersion = "0.1.0";

async function bootstrap(){
  // En local no hace nada si las env vars ya están completas.
  await ensureDatabaseUrl();
  await ensureAuthSecret();
  const server=express();
  server.use(cors());
  server.use(express.json({limit:"10mb"}));
  server.use(express.urlencoded({limit:"10mb",extended:true}));
  const adapter=new ExpressAdapter(server);
  const app=await NestFactory.create(AppModule,adapter);
  const config=new DocumentBuilder().setTitle("TOMFIC API").setDescription("API multiempresa de inventarios y CRM").setVersion("1.0").addBearerAuth().build();
  SwaggerModule.setup("docs",app,SwaggerModule.createDocument(app,config));
  await app.listen(process.env.PORT||3000);
}

if(require.main===module)bootstrap();
