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

  async saveBulk(products:Product[]):Promise<number>{products.forEach(p=>{const i=this.products.findIndex(c=>c.id===p.id);if(i<0)this.products.push(p);else this.products[i]=p;});return products.length;}
  async deleteAll(tenantId:string,inventoryId:string):Promise<number>{const before=this.products.length;this.products.splice(0,this.products.length,...this.products.filter(p=>!(p.tenantId===tenantId&&p.inventoryId===inventoryId)));return before-this.products.length;}
  async deleteAllByTenant(tenantId:string):Promise<number>{const before=this.products.length;this.products.splice(0,this.products.length,...this.products.filter(p=>p.tenantId!==tenantId));return before-this.products.length;}
  async deleteByIds(tenantId:string,ids:string[]):Promise<number>{const before=this.products.length;this.products.splice(0,this.products.length,...this.products.filter(p=>!(p.tenantId===tenantId&&ids.includes(p.id))));return before-this.products.length;}
}
