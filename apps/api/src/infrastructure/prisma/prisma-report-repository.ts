import { PrismaClient } from "@prisma/client";
import { calculateInventoryMetrics } from "../../features/reports/domain/inventory-metrics";
import { ReportRepository } from "../../features/reports/application/report-repository";

export class PrismaReportRepository implements ReportRepository{
  constructor(private readonly db=new PrismaClient()){}

  async inventoryResult(tenantId:string,inventoryId:string){
    const [products,counts]=await Promise.all([
      this.db.product.findMany({where:{tenantId,inventoryId},orderBy:{name:"asc"}}),
      this.db.count.findMany({where:{tenantId,inventoryId},include:{rounds:{include:{captures:true}}}}),
    ]);
    const priority={C3:3,C2:2,C1:1} as const;
    const lines=products.map(product=>{
      const captures=counts.flatMap(count=>count.rounds.filter(round=>round.status==="CLOSED").map(round=>({round, captures:round.captures.filter(capture=>capture.productId===product.id)}))).filter(item=>item.captures.length>0);
      const selected= captures.sort((a,b)=>priority[b.round.name]-priority[a.round.name]).slice(0,1)[0];
      const physical=selected?.captures.reduce((total,capture)=>total+Number(capture.quantity),0)||0;
      return{productId:product.id,code:product.code,name:product.name,theoretical:Number(product.balance),physical,unitCost:Number(product.cost),difference:physical-Number(product.balance),differenceValue:(physical-Number(product.balance))*Number(product.cost)};
    });
    return{inventoryId,tenantId,metrics:calculateInventoryMetrics(lines),lines};
  }
}
