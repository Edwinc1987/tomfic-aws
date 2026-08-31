import { useState, useEffect } from "react";
import { Package, ClipboardList, Database, MapPin, FolderOpen, Radio, BarChart2, Users, Landmark, Bell, RefreshCw, Cloud, Menu, ChevronRight, LogOut } from "lucide-react";
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

  useEffect(()=>{
    const t=setInterval(()=>{
      const el=document.activeElement;
      const tag=el&&el.tagName?el.tagName.toUpperCase():"";
      if(tag==="INPUT"||tag==="SELECT"||tag==="TEXTAREA")return;
      recargar();
    },10000);
    return ()=>clearInterval(t);
  },[]);

  const navActual=nav.find(n=>n.id===view);

  return(
      <div style={{minHeight:"100vh",background:"#f8fafc",fontFamily:"system-ui,sans-serif"}}>

      {/* TOPBAR */}
      <div style={{background:"#ffffff",color:"#1e293b",padding:"0 20px",display:"flex",alignItems:"center",justifyContent:"space-between",height:58,position:"sticky",top:0,zIndex:100,boxShadow:"0 1px 4px rgba(15,23,42,0.08)",borderBottom:"1px solid #e2e8f0"}}>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
           <button onClick={()=>setSideCollapsed(v=>!v)} style={{background:"#f1f5f9",border:"1px solid #e2e8f0",color:"#64748b",width:34,height:34,borderRadius:6,cursor:"pointer",fontSize:16,display:"flex",alignItems:"center",justifyContent:"center"}}>
            {sideCollapsed?<ChevronRight size={16}/>:<Menu size={16}/>}
          </button>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
             <div style={{width:32,height:32,background:"#2563eb",borderRadius:6,display:"flex",alignItems:"center",justifyContent:"center"}}><Package size={18} color="white"/></div>
            <div>
              <div style={{fontWeight:800,fontSize:15,letterSpacing:-0.5}}>tomfic</div>
               <div style={{fontSize:9,color:"#94a3b8",marginTop:-2,letterSpacing:1,textTransform:"uppercase"}}>Inventarios</div>
            </div>
          </div>
          {G.inventario&&(
            <select value={G.inventario.id} onChange={e=>{selectInventory(e.target.value);rerender();}} aria-label="Inventario activo seleccionado"
               style={{background:"#f8fafc",border:"1px solid #cbd5e1",fontSize:11,padding:"4px 10px",borderRadius:5,fontWeight:600,color:"#475569",maxWidth:220}}>
              {G.inventarios.map(inv=><option key={inv.id} value={inv.id} style={{color:"#0f172a"}}>{inv.nombre}</option>)}
            </select>
          )}

        </div>
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          <WhatsAppButton message="Hola, soy administrador y necesito soporte con TOMFIC." label="Soporte" />
          <button onClick={async()=>{await recargar();showToast("Datos actualizados ✓");}}
             style={{background:"#ffffff",border:"1px solid #e2e8f0",color:"#64748b",padding:"5px 12px",borderRadius:6,fontSize:11,cursor:"pointer",display:"flex",alignItems:"center",gap:5}}>
            <RefreshCw size={13}/> <span>Sync</span>
          </button>
          {alertas>0&&(
            <button onClick={()=>{G.alertas=G.alertas.map(a=>({...a,leida:true}));rerender();setView("procesos");}}
              style={{background:"#dc2626",color:"white",border:"none",padding:"5px 14px",borderRadius:8,cursor:"pointer",fontSize:12,fontWeight:700,display:"flex",alignItems:"center",gap:5,animation:"pulse 2s infinite"}}>
              <Bell size={13}/> {alertas}
            </button>
          )}
           {lastSaved&&<span style={{fontSize:10,color:"#64748b",display:"flex",alignItems:"center",gap:4}}><Cloud size={12}/> {lastSaved}</span>}
           <div style={{display:"flex",alignItems:"center",gap:7,background:"#f8fafc",borderRadius:6,padding:"5px 10px",border:"1px solid #e2e8f0"}}>
             <div style={{width:24,height:24,background:"#2563eb",color:"white",borderRadius:99,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700}}>{usuario.nombre.charAt(0)}</div>
             <span style={{fontSize:12,color:"#475569",fontWeight:600}}>{usuario.nombre}</span>
          </div>
          <button onClick={()=>setModalSalir(true)}
             style={{background:"#fff1f2",border:"1px solid #fecdd3",color:"#be123c",padding:"6px 14px",borderRadius:6,fontSize:12,fontWeight:700,cursor:"pointer"}}>
            Salir
          </button>
        </div>
      </div>

      <div style={{display:"flex",height:"calc(100vh - 58px)",overflow:"hidden"}}>

        {/* SIDEBAR */}
         <div style={{width:sideCollapsed?60:216,background:"#ffffff",borderRight:"1px solid #e2e8f0",flexShrink:0,height:"100%",overflowY:"auto",overflowX:"hidden",transition:"width 0.25s ease"}}>
          <div style={{padding:sideCollapsed?"10px 8px":"12px 9px",display:"flex",flexDirection:"column",gap:2}}>
             {nav.map((n,i)=>{
               const active=view===n.id;
               return(
  <div key={n.id}>
                 {!sideCollapsed&&(i===0||nav[i-1].group!==n.group)&&<div style={{padding:"14px 11px 6px",fontSize:9,color:"#94a3b8",fontWeight:800,letterSpacing:1,textTransform:"uppercase"}}>{n.group}</div>}
                 <button onClick={()=>setView(n.id)}
                   title={sideCollapsed?n.label:""}
                   style={{width:"100%",display:"flex",alignItems:"center",gap:10,padding:sideCollapsed?"10px":"8px 11px",background:active?"#eff6ff":"transparent",color:active?"#1d4ed8":"#64748b",border:"none",cursor:"pointer",fontSize:12.5,textAlign:"left",borderRadius:5,transition:"all 0.15s",position:"relative",overflow:"hidden"}}>
                   {active&&<div style={{position:"absolute",left:0,top:0,bottom:0,width:3,background:"#2563eb",borderRadius:"0 3px 3px 0"}}/>}
                   <n.icon size={16} style={{flexShrink:0,opacity:active?1:0.8}}/>
                  {!sideCollapsed&&(
                    <div style={{overflow:"hidden"}}>
                       <div style={{fontWeight:active?700:500,fontSize:12.5,whiteSpace:"nowrap",color:active?"#1d4ed8":"#334155"}}>{n.label}</div>
                    </div>
                  )}
                 </button>
               </div>
              );
            })}
          </div>
          {!sideCollapsed&&(
             <div style={{margin:"12px 10px 0",padding:"10px 12px",background:"#f8fafc",borderRadius:5,border:"1px solid #f1f5f9"}}>
               <div style={{fontSize:9,color:"#94a3b8",textTransform:"uppercase",letterSpacing:1,fontWeight:700,marginBottom:4}}>Sistema</div>
               <div style={{fontSize:11,color:"#64748b"}}>v2.1</div>
            </div>
          )}
        </div>

        {/* CONTENIDO */}
         <div style={{flex:1,padding:20,overflowY:"auto",minWidth:0,background:"#f8fafc"}}>

          <BannerVencimiento G={G}/>
          {view==="inventario"&&<VInventario {...props}/>}
          {view==="ubicaciones"&&<VUbicaciones {...props}/>}
          {view==="basedatos"&&<VBaseDatos {...props}/>}
          {view==="conteos"&&<VConteos {...props}/>}
          {view==="procesos"&&<VProcesos {...props}/>}
          {view==="reportes"&&<VReportes {...props}/>}
          {view==="usuarios"&&<VUsuarios {...props}/>}
          {view==="historial"&&<VHistorial {...props}/>}
        </div>
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
