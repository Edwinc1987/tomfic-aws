import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { ProductsController } from "./features/products/presentation/products.controller";
import { PrismaProductRepository } from "./infrastructure/prisma/prisma-product-repository";
import { ApiAuthGuard } from "./core/auth/cognito-auth.guard";
import { InventoriesController } from "./features/inventories/presentation/inventories.controller";
import { PrismaInventoryRepository } from "./infrastructure/prisma/prisma-inventory-repository";
import { CountsController } from "./features/counts/presentation/counts.controller";
import { PrismaCountRepository } from "./infrastructure/prisma/prisma-count-repository";
import { CapturesController } from "./features/counts/presentation/captures.controller";
import { PrismaCaptureRepository } from "./infrastructure/prisma/prisma-capture-repository";
import { CrmController } from "./features/crm/presentation/crm.controller";
import { PrismaCrmRepository } from "./infrastructure/prisma/prisma-crm-repository";
import { PrismaAuditRepository } from "./infrastructure/prisma/prisma-audit-repository";

@Module({
  imports:[ThrottlerModule.forRoot([{ttl:60000,limit:100}])],
  controllers:[ProductsController,InventoriesController,CountsController,CapturesController,CrmController],
  providers:[
    {provide:"ProductRepository",useClass:PrismaProductRepository},
    {provide:"InventoryRepository",useClass:PrismaInventoryRepository},
    {provide:"CountRepository",useClass:PrismaCountRepository},
    {provide:"CaptureRepository",useClass:PrismaCaptureRepository},
    {provide:"CrmRepository",useClass:PrismaCrmRepository},
    {provide:"AuditRepository",useClass:PrismaAuditRepository},
    {provide:APP_GUARD,useClass:ThrottlerGuard},
    ApiAuthGuard,
  ],
})
export class AppModule{}
