import { Module } from "@nestjs/common";
import { ProductsController } from "./features/products/presentation/products.controller";
import { PrismaProductRepository } from "./infrastructure/prisma/prisma-product-repository";
import { DevAuthGuard } from "./core/auth/dev-auth.guard";

@Module({
  controllers:[ProductsController],
  providers:[
    {provide:"ProductRepository",useClass:PrismaProductRepository},
    DevAuthGuard,
  ],
})
export class AppModule{}
