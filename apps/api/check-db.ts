import { PrismaClient } from "@prisma/client";
async function main(){
const db=new PrismaClient();
const users=await db.user.findMany({select:{id:true,email:true,tenantId:true,role:true,name:true}});
const tenants=await db.tenant.findMany({select:{id:true,name:true,active:true}});
console.log("USERS:",JSON.stringify(users,null,2));
console.log("TENANTS:",JSON.stringify(tenants,null,2));
await db.$disconnect();
}
main();
