export type Product = {
  id: string;
  tenantId: string;
  inventoryId: string;
  code: string;
  barcode: string;
  name: string;
  supplier: string;
  balance: number;
  cost: number;
};

export type ProductInput = Omit<Product, "id" | "supplier"> & { id?: string; supplier?: string };

export const normalizeProduct=(input:ProductInput):Product=>{
  const product={
    id:input.id||crypto.randomUUID(),
    tenantId:input.tenantId.trim(),
    inventoryId:input.inventoryId.trim(),
    code:input.code.trim(),
    barcode:input.barcode.trim(),
    name:input.name.trim(),
    supplier:(input.supplier||"").trim(),
    balance:Number(input.balance),
    cost:Number(input.cost),
  };
  const errors:string[]=[];
  if(!product.tenantId)errors.push("tenantId es obligatorio");
  if(!product.inventoryId)errors.push("inventoryId es obligatorio");
  if(!product.name)errors.push("name es obligatorio");
  if(!Number.isFinite(product.balance)||product.balance<0)errors.push("balance debe ser un número no negativo");
  if(!Number.isFinite(product.cost)||product.cost<0)errors.push("cost debe ser un número no negativo");
  if(errors.length)throw new Error(errors.join("; "));
  return product;
};
