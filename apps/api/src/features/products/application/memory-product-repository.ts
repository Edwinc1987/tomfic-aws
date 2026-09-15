import { Product, ProductInput, normalizeProduct } from "../domain/product";
import { ProductPage, ProductQuery, ProductRepository } from "./product-repository";

export class MemoryProductRepository implements ProductRepository{
  private readonly products:Product[]=[];

  constructor(seed:ProductInput[]=[]){seed.forEach(product=>this.products.push(normalizeProduct(product)));}

  async list(query:ProductQuery):Promise<ProductPage>{
    const search=(query.search||"").toLowerCase();
    const filtered=this.products.filter(product=>product.tenantId===query.tenantId&&product.inventoryId===query.inventoryId&&(!search||[product.code,product.barcode,product.name].some(value=>value.toLowerCase().includes(search))));
    const from=(query.page-1)*query.pageSize;
    return{items:filtered.slice(from,from+query.pageSize),total:filtered.length,page:query.page,pageSize:query.pageSize};
  }

  async save(product:Product){
    const index=this.products.findIndex(current=>current.id===product.id);
    if(index<0)this.products.push(product);else this.products[index]=product;
    return product;
  }
}
