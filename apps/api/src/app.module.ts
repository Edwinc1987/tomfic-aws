import { Module } from "@nestjs/common";
import { ProductsController } from "./features/products/presentation/products.controller";
import { PrismaProductRepository } from "./infrastructure/prisma/prisma-product-repository";
import { ApiAuthGuard } from "./core/auth/cognito-auth.guard";
import { InventoriesController } from "./features/inventories/presentation/inventories.controller";
import { PrismaInventoryRepository } from "./infrastructure/prisma/prisma-inventory-repository";
import { CountsController } from "./features/counts/presentation/counts.controller";
import { PrismaCountRepository } from "./infrastructure/prisma/prisma-count-repository";
import { CapturesController } from "./features/counts/presentation/captures.controller";
import { PrismaCaptureRepository } from "./infrastructure/prisma/prisma-capture-repository";

@Module({
  controllers:[ProductsController,InventoriesController,CountsController,CapturesController],
  providers:[
    {provide:"ProductRepository",useClass:PrismaProductRepository},
    {provide:"InventoryRepository",useClass:PrismaInventoryRepository},
    {provide:"CountRepository",useClass:PrismaCountRepository},
    {provide:"CaptureRepository",useClass:PrismaCaptureRepository},
    ApiAuthGuard,
  ],
})
export class AppModule{}
