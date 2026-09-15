import { BadRequestException, Controller, Get, Headers, Inject, Query } from "@nestjs/common";
import { listProducts } from "../application/list-products";
import { ProductRepository } from "../application/product-repository";

@Controller("v1/products")
export class ProductsController{
  private readonly list;

  constructor(@Inject("ProductRepository") repository:ProductRepository){
    this.list=listProducts(repository);
  }

  @Get()
  getProducts(
    @Headers("x-tenant-id") tenantId:string|undefined,
    @Query("inventoryId") inventoryId:string|undefined,
    @Query("page") page="1",
    @Query("pageSize") pageSize="50",
    @Query("search") search?:string,
  ){
    if(!tenantId||!inventoryId)throw new BadRequestException("tenantId e inventoryId son obligatorios");
    return this.list({tenantId,inventoryId,page:Number(page),pageSize:Number(pageSize),search});
  }
}
