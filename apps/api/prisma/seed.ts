import { PrismaClient, UserRole, CompanyStage } from "@prisma/client";

const prisma=new PrismaClient();
const productsPerTenant=Number(process.env.SEED_PRODUCTS_PER_TENANT||100);

const seedTenant=async(input:{id:string;name:string;taxId:string;inventoryId:string})=>{
  const tenant=await prisma.tenant.upsert({
    where:{taxId:input.taxId},
    update:{name:input.name,stage:CompanyStage.ACTIVO,active:true},
    create:{id:input.id,name:input.name,taxId:input.taxId,stage:CompanyStage.ACTIVO,active:true},
  });
  await prisma.user.upsert({
    where:{email:`admin@${input.taxId}.local`},
    update:{tenantId:tenant.id,active:true,role:UserRole.ADMIN},
    create:{tenantId:tenant.id,name:`Admin ${input.name}`,email:`admin@${input.taxId}.local`,role:UserRole.ADMIN},
  });
  const inventory=await prisma.inventory.upsert({
    where:{tenantId_name:{tenantId:tenant.id,name:"Bodega principal"}},
    update:{status:"OPEN"},
    create:{id:input.inventoryId,tenantId:tenant.id,name:"Bodega principal",status:"OPEN"},
  });
  const products=Array.from({length:productsPerTenant},(_,index)=>({
    id:`${input.taxId}-product-${index+1}`,
    tenantId:tenant.id,
    inventoryId:inventory.id,
    code:`${input.taxId}-${String(index+1).padStart(6,"0")}`,
    barcode:`770${input.taxId.slice(-4)}${String(index+1).padStart(6,"0")}`,
    name:`Producto ${input.name} ${index+1}`,
    balance:index%7,
    cost:(index+1)*100,
  }));
  await prisma.product.createMany({data:products,skipDuplicates:true});
  return {tenantId:tenant.id,inventoryId:inventory.id,products:products.length};
};

async function main(){
  const results=await Promise.all([
    seedTenant({id:"tenant-demo-a",name:"Empresa Demo A",taxId:"900000001",inventoryId:"inventory-demo-a"}),
    seedTenant({id:"tenant-demo-b",name:"Empresa Demo B",taxId:"900000002",inventoryId:"inventory-demo-b"}),
  ]);
  console.log(JSON.stringify({ok:true,productsPerTenant,results},null,2));
}

main().catch(error=>{console.error(error);process.exitCode=1;}).finally(()=>prisma.$disconnect());
