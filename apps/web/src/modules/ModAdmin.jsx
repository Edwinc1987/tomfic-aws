import { useState } from "react";
import { Package, ClipboardList, Database, MapPin, FolderOpen, Radio, BarChart2, Users, Landmark, Bell, RefreshCw, Cloud, Menu, ChevronRight, LogOut, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { VInventario } from "@/views/VInventario";
import { VUbicaciones } from "@/views/VUbicaciones";
import { VBaseDatos } from "@/views/VBaseDatos";
import { VConteos } from "@/views/VConteos";
import { VProcesos } from "@/views/VProcesos";
import { VReportes } from "@/views/VReportes";
import { VUsuarios } from "@/views/VUsuarios";
import { VHistorial } from "@/views/VHistorial";
import BannerVencimiento from "@/components/BannerVencimiento";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import { saveLocalConfig, selectInventory } from "@/lib/data";
import { scheduleSync } from "@/lib/sync";

export function ModAdmin({usuario,setUsuario,logout,G,rerender,recargar,showToast,lastSaved,limpiarDatos}){
  const [view,setView]=useState("inventario");
  const [modalSalir,setModalSalir]=useState(false);
  const [sideCollapsed,setSideCollapsed]=useState(false);
  const alertas=G.alertas.filter(a=>!a.leida).length;
  const nav=[
    {id:"inventario",icon:ClipboardList,label:"Inventario",group:"OPERACIÓN"},
    {id:"conteos",icon:FolderOpen,       label:"Conteos",group:"OPERACIÓN"},
    {id:"procesos",icon:Radio,           label:"Procesos",group:"OPERACIÓN"},
    {id:"reportes",icon:BarChart2,       label:"Reportes",group:"ANÁLISIS"},
    {id:"historial",icon:Landmark,       label:"Historial",group:"ANÁLISIS"},
    {id:"basedatos",icon:Database,       label:"Base de datos",group:"CONFIGURAR"},
    {id:"ubicaciones",icon:MapPin,       label:"Ubicaciones",group:"CONFIGURAR"},
    {id:"usuarios",icon:Users,           label:"Usuarios",group:"CONFIGURAR"},
  ];
  const props={usuario,setUsuario,G,rerender,recargar,showToast};

  return(
    <div className="min-h-screen bg-slate-50 font-sans">

      {/* ── TOPBAR ── */}
      <header className="sticky top-0 z-50 flex h-14 items-center justify-between border-b border-slate-200 bg-white px-4 shadow-sm sm:px-5">
        {/* Left */}
        <div className="flex items-center gap-3">
          <button onClick={()=>setSideCollapsed(v=>!v)}
            className="flex h-[34px] w-[34px] items-center justify-center rounded-md border border-slate-200 bg-slate-100 text-slate-500 transition-colors hover:bg-slate-200 hover:text-slate-700"
            aria-label={sideCollapsed?"Abrir menú":"Cerrar menú"}>
            {sideCollapsed?<ChevronRight size={16}/>:<Menu size={16}/>}
          </button>

          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-blue-600">
              <Package size={18} className="text-white"/>
            </div>
            <div className="leading-none">
              <div className="text-[15px] font-extrabold tracking-tight text-slate-900">tomfic</div>
              <div className="mt-0.5 text-[9px] font-bold uppercase tracking-widest text-slate-400">Inventarios</div>
            </div>
          </div>

          {G.inventario&&(
            <select value={G.inventario.id} onChange={e=>{selectInventory(e.target.value);rerender();}}
              aria-label="Inventario activo"
              className="ml-1 rounded-md border border-slate-300 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-600 outline-none transition-colors hover:border-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 max-w-[200px]">
              {G.inventarios.map(inv=><option key={inv.id} value={inv.id}>{inv.nombre}</option>)}
            </select>
          )}
        </div>

        {/* Right */}
        <div className="flex items-center gap-2">
          <WhatsAppButton message="Hola, soy administrador y necesito soporte con TOMFIC." label="Soporte" />

          <button onClick={async()=>{await recargar();showToast("Datos actualizados ✓");}}
            className="flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-medium text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-700">
            <RefreshCw size={13}/> Sync
          </button>

          {alertas>0&&(
            <button onClick={()=>{G.alertas=G.alertas.map(a=>({...a,leida:true}));rerender();setView("procesos");}}
              className="flex items-center gap-1.5 rounded-lg border-none bg-red-600 px-3 py-1.5 text-[12px] font-bold text-white shadow-sm transition-all hover:bg-red-700 animate-pulse">
              <Bell size={13}/> {alertas}
            </button>
          )}

          {lastSaved&&(
            <span className="hidden items-center gap-1 text-[10px] text-slate-400 sm:flex">
              <Cloud size={12}/> {lastSaved}
            </span>
          )}

          <div className="flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1.5">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-[11px] font-bold text-white">
              {usuario.nombre.charAt(0)}
            </div>
            <span className="hidden text-[12px] font-semibold text-slate-600 sm:inline">{usuario.nombre}</span>
          </div>

          <button onClick={()=>setModalSalir(true)}
            className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-[12px] font-semibold text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-700">
            <LogOut size={14} className="inline mr-1 -mt-0.5"/>
            Salir
          </button>
        </div>
      </header>

      <div className="flex" style={{height:"calc(100vh - 56px)"}}>

        {/* ── SIDEBAR ── */}
        <aside className={`flex-shrink-0 overflow-y-auto overflow-x-hidden border-r border-slate-200 bg-white transition-all duration-200 ${sideCollapsed?"w-[60px]":"w-56"}`}>
          <nav className="flex flex-col gap-0.5 p-2">
            {nav.map((n,i)=>{
              const active=view===n.id;
              const showGroup=!sideCollapsed&&(i===0||nav[i-1].group!==n.group);
              return(
                <div key={n.id}>
                  {showGroup&&(
                    <div className="px-3 pt-4 pb-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                      {n.group}
                    </div>
                  )}
                  <button onClick={()=>setView(n.id)}
                    title={sideCollapsed?n.label:""}
                    className={`group relative flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[13px] transition-all duration-150 ${
                      active
                        ?"bg-blue-50 text-blue-700 font-bold"
                        :"text-slate-500 hover:bg-slate-50 hover:text-slate-700 font-medium"
                    }`}>
                    {active&&<div className="absolute left-0 top-1 bottom-1 w-[3px] rounded-r-full bg-blue-600"/>}
                    <n.icon size={16} className={`flex-shrink-0 ${active?"text-blue-600":"text-slate-400 group-hover:text-slate-600"}`}/>
                    {!sideCollapsed&&(
                      <span className="truncate">{n.label}</span>
                    )}
                  </button>
                </div>
              );
            })}
          </nav>

          {!sideCollapsed&&(
            <div className="mx-2.5 mt-3 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
              <div className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Sistema</div>
              <div className="mt-0.5 text-[11px] text-slate-500">v2.1</div>
            </div>
          )}
        </aside>

        {/* ── CONTENIDO ── */}
        <main className="view-scroll-container relative min-w-0 flex-1 overflow-y-auto bg-slate-50 p-5"
          style={{overscrollBehavior:"contain"}}>
          <BannerVencimiento G={G}/>
          {view==="inventario"&&<VInventario {...props}/>}
          {view==="ubicaciones"&&<VUbicaciones {...props}/>}
          {view==="basedatos"&&<VBaseDatos {...props}/>}
          {view==="conteos"&&<VConteos {...props}/>}
          {view==="procesos"&&<VProcesos {...props}/>}
          {view==="reportes"&&<VReportes {...props}/>}
          {view==="usuarios"&&<VUsuarios {...props}/>}
          {view==="historial"&&<VHistorial {...props}/>}
        </main>
      </div>

      <ConfirmDialog
        open={modalSalir}
        onOpenChange={setModalSalir}
        icon={LogOut}
        title="¿Cerrar sesión?"
        description="Vas a salir de TOMFIC. Tus datos ya están guardados en la nube."
        confirmText="Sí, salir"
        onConfirm={logout}
      />
    </div>
  );
}
