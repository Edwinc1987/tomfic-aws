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
import { HealthController } from "./core/health/health.controller";
import { ReportsController } from "./features/reports/presentation/reports.controller";
import { PrismaReportRepository } from "./infrastructure/prisma/prisma-report-repository";
import { StorageController } from "./core/storage/storage.controller";
import { S3StorageService } from "./core/storage/s3-storage.service";

@Module({
  imports:[ThrottlerModule.forRoot([{ttl:60000,limit:100}])],
  controllers:[HealthController,StorageController,ProductsController,InventoriesController,CountsController,CapturesController,CrmController,ReportsController],
  providers:[
    {provide:"ProductRepository",useClass:PrismaProductRepository},
    {provide:"InventoryRepository",useClass:PrismaInventoryRepository},
    {provide:"CountRepository",useClass:PrismaCountRepository},
    {provide:"CaptureRepository",useClass:PrismaCaptureRepository},
    {provide:"CrmRepository",useClass:PrismaCrmRepository},
    {provide:"AuditRepository",useClass:PrismaAuditRepository},
    {provide:APP_GUARD,useClass:ThrottlerGuard},
    S3StorageService,
    {provide:"ReportRepository",useClass:PrismaReportRepository},
    ApiAuthGuard,
  ],
})
export class AppModule{}
