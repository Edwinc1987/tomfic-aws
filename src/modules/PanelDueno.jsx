import { useState, useEffect } from "react";
import { Package, BarChart2, Users, DollarSign, Globe, UserPlus, RefreshCw, LogOut } from "lucide-react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { VResumen } from "@/views/VResumen";
import { VClientes } from "@/views/VClientes";
import { VPagos } from "@/views/VPagos";
import { VPaginaWeb } from "@/views/VPaginaWeb";
import { VLeads } from "@/views/VLeads";


export function PanelDueno({usuario,setUsuario,logout,G,rerender,recargar,showToast}){
  const [view,setView]=useState("resumen");
  const [modalSalir,setModalSalir]=useState(false);
  const [focusTenant,setFocusTenant]=useState(null); // empresa a abrir directo desde el Dashboard
  const [clientesFiltro,setClientesFiltro]=useState(null); // filtro inicial al entrar a Clientes desde el dashboard
  const irA=(v,filtro)=>{ if(v==="clientes")setClientesFiltro(filtro||null); setView(v); };
  const nav=[
    {id:"resumen",icon:BarChart2,label:"Resumen"},
    {id:"clientes",icon:Users,label:"Clientes"},
    {id:"pagos",icon:DollarSign,label:"Pagos"},
    {id:"web",icon:Globe,label:"Página web"},
    {id:"leads",icon:UserPlus,label:"Leads"},
  ];
  return(
    <div className="min-h-screen bg-slate-100 font-sans">
      {/* Topbar — distinto del inventario (morado/dueño) */}
      <div className="sticky top-0 z-50 h-14 px-5 flex items-center justify-between bg-gradient-to-r from-slate-900 to-indigo-900 text-white shadow-lg">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center"><Package size={18}/></div>
          <div>
            <div className="font-extrabold text-sm leading-none">tomfic</div>
            <div className="text-[9px] uppercase tracking-[0.2em] text-indigo-300">Panel del Dueño</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={async()=>{await recargar();showToast("Actualizado ✓");}} className="inline-flex items-center gap-1.5 rounded-md bg-white/10 px-3 py-1.5 text-xs hover:bg-white/15"><RefreshCw size={13}/> Sync</button>
          <span className="text-xs text-indigo-200 hidden sm:inline">{usuario.nombre}</span>
          <button onClick={()=>setModalSalir(true)} className="rounded-md bg-red-500/20 border border-red-400/30 px-3 py-1.5 text-xs font-bold text-red-200 hover:bg-red-500/30">Salir</button>
        </div>
      </div>
      <div className="flex" style={{height:"calc(100vh - 56px)",overflow:"hidden"}}>
        <div className="w-52 shrink-0 bg-white border-r border-slate-200 p-3 flex flex-col gap-1 overflow-y-auto">
          <div className="px-3 pt-1 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">Gestión</div>
          {nav.map(n=>{const active=view===n.id;return(
            <button key={n.id} onClick={()=>irA(n.id)}
              className={`flex items-center gap-2.5 rounded-lg px-3 py-1.5 text-sm text-left transition-colors ${active?"bg-indigo-50 text-indigo-700 font-semibold":"text-slate-600 hover:bg-slate-50"}`}>
              <n.icon size={17} className={active?"text-indigo-600":"text-slate-400"}/> {n.label}
            </button>
          );})}
          <div className="mt-auto rounded-lg bg-slate-50 border border-slate-100 px-3 py-1.5">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Panel del Dueño</div>
            <div className="text-xs text-slate-500 mt-0.5">v2.2</div>
          </div>
        </div>
        <div className="flex-1 p-6 overflow-y-auto">
          {view==="resumen"&&<VResumen G={G} showToast={showToast} onOpenCliente={(t)=>{setFocusTenant(t);setView("clientes");}} onGo={irA}/>}
          {view==="clientes"&&<VClientes G={G} rerender={rerender} recargar={recargar} showToast={showToast} focusTenant={focusTenant} clearFocus={()=>setFocusTenant(null)} initFiltro={clientesFiltro} clearFiltro={()=>setClientesFiltro(null)}/>}
          {view==="pagos"&&<VPagos G={G} showToast={showToast}/>}
          {view==="web"&&<VPaginaWeb G={G} rerender={rerender} showToast={showToast}/>}
          {view==="leads"&&<VLeads G={G} showToast={showToast}/>}
        </div>
      </div>
      <ConfirmDialog open={modalSalir} onOpenChange={setModalSalir} icon={LogOut} title="¿Cerrar sesión?" description="Vas a salir del Panel del Dueño." confirmText="Sí, salir" confirmVariant="default" onConfirm={logout}/>
    </div>
  );
}
