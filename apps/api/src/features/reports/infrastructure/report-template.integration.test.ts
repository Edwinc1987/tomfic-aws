import { describe,it,expect,beforeAll } from "vitest";
import { PrismaClient } from "@prisma/client";

// Test de integración: requiere Postgres real (RUN_DB_TESTS=1),
// igual que los demás tests de aislamiento/concurrencia.
const integration=process.env.RUN_DB_TESTS==="1"?describe:describe.skip;
const db=new PrismaClient();

const TENANT_ID="test-report-templates";
const INVENTORY_ID="inv-test-templates";

beforeAll(async()=>{
  await db.tenant.upsert({where:{id:TENANT_ID},update:{},create:{id:TENANT_ID,name:"Test Report Templates",taxId:`TAX-${TENANT_ID}`,active:true}});
  await db.inventory.upsert({where:{id:INVENTORY_ID},update:{},create:{id:INVENTORY_ID,tenantId:TENANT_ID,name:"INV-TEST-TPL"}});
});

integration("ReportTemplate CRUD",()=>{
  it("crea y lista plantillas por tenant",async()=>{
    const layout={width:760,headerSection:{height:100,items:[]},contentSection:{height:120,items:[]},footerSection:{height:40,items:[]}};

    const created=await db.reportTemplate.upsert({
      where:{tenantId_name:{tenantId:TENANT_ID,name:"Acta de inventario"}},
      create:{tenantId:TENANT_ID,name:"Acta de inventario",layout},
      update:{layout},
    });
    expect(created.id).toBeDefined();
    expect(created.name).toBe("Acta de inventario");
    expect(created.tenantId).toBe(TENANT_ID);

    const templates=await db.reportTemplate.findMany({where:{tenantId:TENANT_ID}});
    expect(templates.length).toBeGreaterThanOrEqual(1);
    expect(templates[0].layout).toEqual(layout);
  });

  it("actualiza layout de plantilla existente",async()=>{
    const newLayout={width:800,headerSection:{height:120,items:[]},contentSection:{height:150,items:[]},footerSection:{height:50,items:[]}};

    const updated=await db.reportTemplate.upsert({
      where:{tenantId_name:{tenantId:TENANT_ID,name:"Acta de inventario"}},
      create:{tenantId:TENANT_ID,name:"Acta de inventario",layout:newLayout},
      update:{layout:newLayout},
    });
    expect(updated.layout).toEqual(newLayout);
  });

  it("no mezcla plantillas de diferentes tenants",async()=>{
    const OTHER_TENANT="other-report-tenant";
    await db.tenant.upsert({where:{id:OTHER_TENANT},update:{},create:{id:OTHER_TENANT,name:"Other",taxId:`TAX-${OTHER_TENANT}`,active:true}});

    await db.reportTemplate.create({data:{tenantId:OTHER_TENANT,name:"Acta de inventario",layout:{width:760}}});

    const tenantA=await db.reportTemplate.findMany({where:{tenantId:TENANT_ID}});
    const tenantB=await db.reportTemplate.findMany({where:{tenantId:OTHER_TENANT}});
    expect(tenantA.every(t=>t.tenantId===TENANT_ID)).toBe(true);
    expect(tenantB.every(t=>t.tenantId===OTHER_TENANT)).toBe(true);

    await db.reportTemplate.deleteMany({where:{tenantId:OTHER_TENANT}});
    await db.tenant.delete({where:{id:OTHER_TENANT}});
  });

  it("unique constraint impide nombres duplicados por tenant",async()=>{
    const layout={width:760};
    await db.reportTemplate.create({data:{tenantId:TENANT_ID,name:"Resumen ejecutivo",layout}});

    let error:unknown=null;
    try{await db.reportTemplate.create({data:{tenantId:TENANT_ID,name:"Resumen ejecutivo",layout:{width:800}}});}catch(e){error=e;}
    expect(error).toBeTruthy();

    await db.reportTemplate.deleteMany({where:{tenantId:TENANT_ID,name:"Resumen ejecutivo"}});
  });

  it("elimina en cascada cuando se borra el tenant",async()=>{
    const CASCADE_TENANT="cascade-report-tenant";
    await db.tenant.upsert({where:{id:CASCADE_TENANT},update:{},create:{id:CASCADE_TENANT,name:"Cascade",taxId:`TAX-${CASCADE_TENANT}`,active:true}});
    await db.reportTemplate.create({data:{tenantId:CASCADE_TENANT,name:"Plantilla cascade",layout:{}}});

    let before=await db.reportTemplate.findMany({where:{tenantId:CASCADE_TENANT}});
    expect(before.length).toBe(1);

    await db.tenant.delete({where:{id:CASCADE_TENANT}});

    let after:unknown=[];
    try{after=await db.reportTemplate.findMany({where:{tenantId:CASCADE_TENANT}});}catch(e){after=[];}
    expect((after as any[]).length).toBe(0);
  });
});
