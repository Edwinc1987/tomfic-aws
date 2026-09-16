import { Module } from "@nestjs/common";
import { ProductsController } from "./features/products/presentation/products.controller";
import { PrismaProductRepository } from "./infrastructure/prisma/prisma-product-repository";
import { ApiAuthGuard } from "./core/auth/cognito-auth.guard";
import { InventoriesController } from "./features/inventories/presentation/inventories.controller";
import { PrismaInventoryRepository } from "./infrastructure/prisma/prisma-inventory-repository";

@Module({
  controllers:[ProductsController,InventoriesController],
  providers:[
    {provide:"ProductRepository",useClass:PrismaProductRepository},
    {provide:"InventoryRepository",useClass:PrismaInventoryRepository},
    ApiAuthGuard,
  ],
})
export class AppModule{}
