import { Module } from "@nestjs/common";
import { ProductsController } from "./features/products/presentation/products.controller";
import { PrismaProductRepository } from "./infrastructure/prisma/prisma-product-repository";

@Module({
  controllers:[ProductsController],
  providers:[
    {provide:"ProductRepository",useClass:PrismaProductRepository},
  ],
})
export class AppModule{}
