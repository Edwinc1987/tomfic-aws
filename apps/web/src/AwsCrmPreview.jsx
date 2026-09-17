import { useState, useEffect } from "react";
import { AuthProvider, useAuth } from "@/core/auth/AuthContext";
import { CognitoLoginPage } from "@/core/auth/CognitoLoginPage";
import { setAuthTokenGetter } from "@/core/network/apiClient";
import { CrmPage } from "@/features/crm/views/CrmPage";
import { ProductsPage } from "@/features/products/views/ProductsPage";
import { InventoriesPage } from "@/features/inventories/views/InventoriesPage";
import { CountsPage } from "@/features/counts/views/CountsPage";
import { ReportsPage } from "@/features/reports/views/ReportsPage";
import { ReportDesignerPage } from "@/features/reports/views/ReportDesignerPage";
import { ReportViewerPage } from "@/features/reports/views/ReportViewerPage";
import { ImportCsvPage } from "@/features/import/views/ImportCsvPage";

function AwsCrmApp(){
  const {user,token,loading,signOut}=useAuth();
  const [view,setView]=useState("crm");

  useEffect(()=>{setAuthTokenGetter(async()=>token);},[token]);

  if(loading)return <div className="flex min-h-screen items-center justify-center bg-slate-900"><div className="text-center text-white"><div className="mb-3 text-3xl font-black">tomfic</div><div className="text-sm text-slate-400">Cargando...</div></div></div>;
  if(!user||!token)return <CognitoLoginPage/>;

  const tenantId=user["custom:tenant_id"]||"tenant-demo-a";
  return <main className="min-h-screen bg-slate-100 p-6">
    <nav className="mb-5 flex flex-wrap items-center gap-2 rounded-lg border bg-white p-2">
      <button onClick={()=>setView("crm")} className={`rounded px-3 py-2 text-sm font-semibold ${view==="crm"?"bg-indigo-600 text-white":"text-slate-600"}`}>CRM</button>
      <button onClick={()=>setView("inventories")} className={`rounded px-3 py-2 text-sm font-semibold ${view==="inventories"?"bg-indigo-600 text-white":"text-slate-600"}`}>Inventarios</button>
      <button onClick={()=>setView("counts")} className={`rounded px-3 py-2 text-sm font-semibold ${view==="counts"?"bg-indigo-600 text-white":"text-slate-600"}`}>Conteos</button>
      <button onClick={()=>setView("products")} className={`rounded px-3 py-2 text-sm font-semibold ${view==="products"?"bg-indigo-600 text-white":"text-slate-600"}`}>Productos</button>
      <button onClick={()=>setView("import")} className={`rounded px-3 py-2 text-sm font-semibold ${view==="import"?"bg-indigo-600 text-white":"text-slate-600"}`}>Importar</button>
      <button onClick={()=>setView("reports")} className={`rounded px-3 py-2 text-sm font-semibold ${view==="reports"?"bg-indigo-600 text-white":"text-slate-600"}`}>Reportes</button>
      <button onClick={()=>setView("viewer")} className={`rounded px-3 py-2 text-sm font-semibold ${view==="viewer"?"bg-indigo-600 text-white":"text-slate-600"}`}>Visor</button>
      <button onClick={()=>setView("designer")} className={`rounded px-3 py-2 text-sm font-semibold ${view==="designer"?"bg-indigo-600 text-white":"text-slate-600"}`}>Diseñador</button>
      <div className="ml-auto flex items-center gap-3"><span className="text-xs text-slate-500">{user.email}</span><button onClick={signOut} className="rounded bg-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-300">Salir</button></div>
    </nav>
    {view==="crm"?<CrmPage tenantId={tenantId}/>:view==="inventories"?<InventoriesPage tenantId={tenantId}/>:view==="counts"?<CountsPage tenantId={tenantId} inventoryId="inventory-demo-a"/>:view==="import"?<ImportCsvPage tenantId={tenantId} inventoryId="inventory-demo-a"/>:view==="reports"?<ReportsPage tenantId={tenantId} inventoryId="inventory-demo-a"/>:view==="viewer"?<ReportViewerPage tenantId={tenantId} inventoryId="inventory-demo-a"/>:view==="designer"?<ReportDesignerPage tenantId={tenantId}/>:<ProductsPage tenantId={tenantId} inventoryId="inventory-demo-a"/>}
  </main>;
}

export default function AwsCrmPreview(){
  return <AuthProvider isAwsPreview><AwsCrmApp/></AuthProvider>;
}
