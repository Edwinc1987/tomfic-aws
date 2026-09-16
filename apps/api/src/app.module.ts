import { Module } from "@nestjs/common";
import { ProductsController } from "./features/products/presentation/products.controller";
import { PrismaProductRepository } from "./infrastructure/prisma/prisma-product-repository";
import { ApiAuthGuard } from "./core/auth/cognito-auth.guard";

@Module({
  controllers:[ProductsController],
  providers:[
    {provide:"ProductRepository",useClass:PrismaProductRepository},
    ApiAuthGuard,
  ],
})
export class AppModule{}
