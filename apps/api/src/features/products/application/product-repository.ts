import { Product } from "../domain/product";

export type ProductPage={
  items:Product[];
  total:number;
  page:number;
  pageSize:number;
};

export type ProductQuery={
  tenantId:string;
  inventoryId:string;
  page:number;
  pageSize:number;
  search?:string;
};

export interface ProductRepository{
  list(query:ProductQuery):Promise<ProductPage>;
  save(product:Product):Promise<Product>;
}
