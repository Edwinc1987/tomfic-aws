import { BadRequestException, Body, Controller, Delete, Get, Inject, Post, Query, Req, UseGuards } from "@nestjs/common";
import { ApiAuthGuard } from "../../../core/auth/cognito-auth.guard";
import { requirePermission } from "../../../core/auth/authorization";
import { listProducts } from "../application/list-products";
import { ProductRepository } from "../application/product-repository";
import { normalizeProduct } from "../domain/product";

@Controller("v1/products")
@UseGuards(ApiAuthGuard)
export class ProductsController{
  private readonly list;

  constructor(@Inject("ProductRepository") private readonly repository:ProductRepository){
    this.list=listProducts(repository);
  }

  @Get()
  getProducts(
    @Req() request:{auth:{tenantId:string}},
    @Query("inventoryId") inventoryId:string|undefined,
    @Query("page") page="1",
    @Query("pageSize") pageSize="50",
    @Query("search") search?:string,
  ){
    if(!inventoryId)throw new BadRequestException("inventoryId es obligatorio");
    return this.list({tenantId:request.auth.tenantId,inventoryId,page:Number(page),pageSize:Number(pageSize),search});
  }

  @Post("bulk")
  bulkUpsert(@Req() request:{auth:{userId:string;tenantId:string;role:string}},@Body() body:{products?:Array<{id?:string;tenantId?:string;inventoryId?:string;code?:string;barcode?:string;name?:string;supplier?:string;balance?:number;cost?:number}>}){
    requirePermission(request.auth,"products:write");
    if(!Array.isArray(body.products)||!body.products.length)throw new BadRequestException("products array es obligatorio");
    const tid=request.auth.tenantId;
    const normalized=body.products.map(p=>normalizeProduct({id:p.id||undefined,tenantId:p.tenantId||tid,inventoryId:p.inventoryId||"",code:p.code||"",barcode:p.barcode||"",name:p.name||"",supplier:p.supplier||"",balance:p.balance??0,cost:p.cost??0}));
    return this.repository.saveBulk(normalized).then(count=>({count}));
  }

  @Delete("all")
  deleteAll(@Req() request:{auth:{userId:string;tenantId:string;role:string}},@Query("inventoryId") inventoryId?:string){
    requirePermission(request.auth,"products:write");
    const tid=request.auth.tenantId;
    if(inventoryId)return this.repository.deleteAll(tid,inventoryId).then(count=>({count}));
    return this.repository.deleteAllByTenant(tid).then(count=>({count}));
  }

  @Delete("by-ids")
  deleteByIds(@Req() request:{auth:{userId:string;tenantId:string;role:string}},@Body() body:{ids?:string[]}){
    requirePermission(request.auth,"products:write");
    if(!Array.isArray(body.ids)||!body.ids.length)throw new BadRequestException("ids array es obligatorio");
    return this.repository.deleteByIds(request.auth.tenantId,body.ids).then(count=>({count}));
  }
}
