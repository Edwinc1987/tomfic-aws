import { ProductRepository, ProductQuery } from "./product-repository";

export const listProducts=(repository:ProductRepository)=>(query:ProductQuery)=>{
  if(!query.tenantId.trim())throw new Error("tenantId es obligatorio");
  if(!query.inventoryId.trim())throw new Error("inventoryId es obligatorio");
  if(!Number.isInteger(query.page)||query.page<1)throw new Error("page inválida");
  if(!Number.isInteger(query.pageSize)||query.pageSize<1||query.pageSize>500)throw new Error("pageSize inválido");
  return repository.list({...query,search:query.search?.trim()});
};
