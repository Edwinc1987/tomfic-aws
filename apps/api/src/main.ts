import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";

export const apiVersion = "0.1.0";

async function bootstrap(){
  const app=await NestFactory.create(AppModule);
  app.enableCors();
  await app.listen(process.env.PORT||3000);
}

if(require.main===module)bootstrap();
