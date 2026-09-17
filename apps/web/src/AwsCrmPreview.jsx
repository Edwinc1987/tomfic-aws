import { useState } from "react";
import { CrmPage } from "@/features/crm/views/CrmPage";
import { ProductsPage } from "@/features/products/views/ProductsPage";
import { InventoriesPage } from "@/features/inventories/views/InventoriesPage";
import { CountsPage } from "@/features/counts/views/CountsPage";

export default function AwsCrmPreview(){
  const [view,setView]=useState("crm");
  return <main className="min-h-screen bg-slate-100 p-6"><nav className="mb-5 flex flex-wrap gap-2 rounded-lg border bg-white p-2"><button onClick={()=>setView("crm")} className={`rounded px-3 py-2 text-sm font-semibold ${view==="crm"?"bg-indigo-600 text-white":"text-slate-600"}`}>CRM</button><button onClick={()=>setView("inventories")} className={`rounded px-3 py-2 text-sm font-semibold ${view==="inventories"?"bg-indigo-600 text-white":"text-slate-600"}`}>Inventarios</button><button onClick={()=>setView("counts")} className={`rounded px-3 py-2 text-sm font-semibold ${view==="counts"?"bg-indigo-600 text-white":"text-slate-600"}`}>Conteos</button><button onClick={()=>setView("products")} className={`rounded px-3 py-2 text-sm font-semibold ${view==="products"?"bg-indigo-600 text-white":"text-slate-600"}`}>Productos</button></nav>{view==="crm"?<CrmPage tenantId="tenant-demo-a"/>:view==="inventories"?<InventoriesPage tenantId="tenant-demo-a"/>:view==="counts"?<CountsPage tenantId="tenant-demo-a" inventoryId="inventory-demo-a"/>:<ProductsPage tenantId="tenant-demo-a" inventoryId="inventory-demo-a"/>}</main>;
}
