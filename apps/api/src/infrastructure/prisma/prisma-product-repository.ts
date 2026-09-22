import { PrismaClient } from "@prisma/client";
import { ProductRepository, ProductPage, ProductQuery } from "../../features/products/application/product-repository";
import { Product } from "../../features/products/domain/product";

const toProduct=(row:{id:string;tenantId:string;inventoryId:string;code:string;barcode:string;name:string;supplier:any;balance:any;cost:any}):Product&Record<string,any>=>({
  id:row.id,
  tenantId:row.tenantId,
  inventoryId:row.inventoryId,
  code:row.code,
  barcode:row.barcode,
  name:row.name,
  supplier:row.supplier||"",
  balance:Number(row.balance),
  cost:Number(row.cost),
  ean:row.barcode||"",
  codigo:row.code,
  nombre:row.name,
  proveedor:row.supplier||"",
  saldo:Number(row.balance),
  costo:Number(row.cost),
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
      create:{id:product.id,tenantId:product.tenantId,inventoryId:product.inventoryId,code:product.code,barcode:product.barcode,name:product.name,supplier:product.supplier,balance:product.balance,cost:product.cost},
      update:{tenantId:product.tenantId,inventoryId:product.inventoryId,code:product.code,barcode:product.barcode,name:product.name,supplier:product.supplier,balance:product.balance,cost:product.cost},
    });
    return toProduct(row);
  }

  async saveBulk(products:Product[]):Promise<number>{
    const BATCH=500;let count=0;
    for(let i=0;i<products.length;i+=BATCH){
      const batch=products.slice(i,i+BATCH);
      await this.db.$transaction(batch.map(p=>this.db.product.upsert({
        where:{id:p.id},
        create:{id:p.id,tenantId:p.tenantId,inventoryId:p.inventoryId,code:p.code,barcode:p.barcode,name:p.name,supplier:p.supplier,balance:p.balance,cost:p.cost},
        update:{code:p.code,barcode:p.barcode,name:p.name,supplier:p.supplier,balance:p.balance,cost:p.cost},
      })));
      count+=batch.length;
    }
    return count;
  }

  async deleteAll(tenantId:string,inventoryId:string):Promise<number>{
    const r=await this.db.product.deleteMany({where:{tenantId,inventoryId}});
    return r.count;
  }

  async deleteAllByTenant(tenantId:string):Promise<number>{
    const r=await this.db.product.deleteMany({where:{tenantId}});
    return r.count;
  }

  async deleteByIds(tenantId:string,ids:string[]):Promise<number>{
    if(!ids.length)return 0;
    const BATCH=200;let count=0;
    for(let i=0;i<ids.length;i+=BATCH){
      const r=await this.db.product.deleteMany({where:{id:{in:ids.slice(i,i+BATCH)},tenantId}});
      count+=r.count;
    }
    return count;
  }
}
