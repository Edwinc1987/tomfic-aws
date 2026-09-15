import { PrismaClient } from "@prisma/client";
import { ProductRepository, ProductPage, ProductQuery } from "../../features/products/application/product-repository";
import { Product } from "../../features/products/domain/product";

const toProduct=(row:{id:string;tenantId:string;inventoryId:string;code:string;barcode:string;name:string;balance:any;cost:any}):Product=>({
  id:row.id,
  tenantId:row.tenantId,
  inventoryId:row.inventoryId,
  code:row.code,
  barcode:row.barcode,
  name:row.name,
  balance:Number(row.balance),
  cost:Number(row.cost),
});

export class PrismaProductRepository implements ProductRepository{
  constructor(private readonly db=new PrismaClient()){}

  async list(query:ProductQuery):Promise<ProductPage>{
    const search=query.search?.trim();
    const where={
      tenantId:query.tenantId,
      inventoryId:query.inventoryId,
      ...(search?{OR:[
        {name:{contains:search,mode:"insensitive" as const}},
        {code:{contains:search,mode:"insensitive" as const}},
        {barcode:{contains:search,mode:"insensitive" as const}},
      ]}:{}),
    };
    const [rows,total]=await Promise.all([
      this.db.product.findMany({where,orderBy:[{name:"asc"},{id:"asc"}],skip:(query.page-1)*query.pageSize,take:query.pageSize}),
      this.db.product.count({where}),
    ]);
    return{items:rows.map(toProduct),total,page:query.page,pageSize:query.pageSize};
  }

  async save(product:Product){
    const row=await this.db.product.upsert({
      where:{id:product.id},
      create:{id:product.id,tenantId:product.tenantId,inventoryId:product.inventoryId,code:product.code,barcode:product.barcode,name:product.name,balance:product.balance,cost:product.cost},
      update:{tenantId:product.tenantId,inventoryId:product.inventoryId,code:product.code,barcode:product.barcode,name:product.name,balance:product.balance,cost:product.cost},
    });
    return toProduct(row);
  }
}
