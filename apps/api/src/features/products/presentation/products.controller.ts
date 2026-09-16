import { BadRequestException, Controller, Get, Inject, Query, Req, UseGuards } from "@nestjs/common";
import { ApiAuthGuard } from "../../../core/auth/cognito-auth.guard";
import { listProducts } from "../application/list-products";
import { ProductRepository } from "../application/product-repository";

@Controller("v1/products")
@UseGuards(ApiAuthGuard)
export class ProductsController{
  private readonly list;

  constructor(@Inject("ProductRepository") repository:ProductRepository){
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
}
