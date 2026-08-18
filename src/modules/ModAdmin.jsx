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
import BtnNotas from "@/components/BtnNotas";
import { saveLocalConfig } from "@/lib/data";
import { scheduleSync } from "@/lib/sync";

export function ModAdmin({usuario,setUsuario,logout,G,rerender,recargar,showToast,lastSaved,limpiarDatos}){
  const [view,setView]=useState("inventario");
  const [modalSalir,setModalSalir]=useState(false);
  const [sideCollapsed,setSideCollapsed]=useState(false);
  const alertas=G.alertas.filter(a=>!a.leida).length;
  const nav=[
    {id:"inventario",icon:ClipboardList,label:"Inventario",desc:"Gestión activa"},
    {id:"basedatos",icon:Database,       label:"Base de datos",desc:"Productos"},
    {id:"ubicaciones",icon:MapPin,       label:"Ubicaciones",desc:"Localizaciones"},
    {id:"conteos",icon:FolderOpen,       label:"Conteos",desc:"Rondas"},
    {id:"procesos",icon:Radio,           label:"Procesos",desc:"Avance"},
    {id:"reportes",icon:BarChart2,       label:"Reportes",desc:"Análisis"},
    {id:"usuarios",icon:Users,           label:"Usuarios",desc:"Accesos"},
    {id:"historial",icon:Landmark,       label:"Historial",desc:"Inventarios"},
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
    <div style={{minHeight:"100vh",background:"#f0f4f8",fontFamily:"system-ui,sans-serif"}}>

      {/* TOPBAR */}
      <div style={{background:"linear-gradient(135deg,#0f172a 0%,#1e293b 100%)",color:"white",padding:"0 20px",display:"flex",alignItems:"center",justifyContent:"space-between",height:58,position:"sticky",top:0,zIndex:100,boxShadow:"0 2px 12px rgba(0,0,0,0.25)"}}>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <button onClick={()=>setSideCollapsed(v=>!v)} style={{background:"rgba(255,255,255,0.08)",border:"none",color:"white",width:34,height:34,borderRadius:8,cursor:"pointer",fontSize:16,display:"flex",alignItems:"center",justifyContent:"center"}}>
            {sideCollapsed?<ChevronRight size={16}/>:<Menu size={16}/>}
          </button>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <div style={{width:32,height:32,background:"linear-gradient(135deg,#2563eb,#0891b2)",borderRadius:9,display:"flex",alignItems:"center",justifyContent:"center"}}><Package size={18} color="white"/></div>
            <div>
              <div style={{fontWeight:800,fontSize:15,letterSpacing:-0.5}}>TOMFIC</div>
              <div style={{fontSize:9,color:"#64748b",marginTop:-2,letterSpacing:1,textTransform:"uppercase"}}>Inventarios</div>
            </div>
          </div>
          {G.inventario&&(
            <div style={{background:"rgba(22,163,74,0.2)",border:"1px solid rgba(22,163,74,0.4)",fontSize:11,padding:"3px 12px",borderRadius:20,fontWeight:700,color:"#4ade80",display:"flex",alignItems:"center",gap:5}}>
              <span style={{width:6,height:6,background:"#4ade80",borderRadius:99,display:"inline-block"}}/>
              {G.inventario.nombre}
            </div>
          )}

        </div>
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          <button onClick={async()=>{await recargar();showToast("Datos actualizados ✓");}}
            style={{background:"rgba(255,255,255,0.07)",border:"1px solid rgba(255,255,255,0.1)",color:"#94a3b8",padding:"5px 12px",borderRadius:8,fontSize:11,cursor:"pointer",display:"flex",alignItems:"center",gap:5}}>
            <RefreshCw size={13}/> <span>Sync</span>
          </button>
          {alertas>0&&(
            <button onClick={()=>{G.alertas=G.alertas.map(a=>({...a,leida:true}));rerender();setView("procesos");}}
              style={{background:"#dc2626",color:"white",border:"none",padding:"5px 14px",borderRadius:8,cursor:"pointer",fontSize:12,fontWeight:700,display:"flex",alignItems:"center",gap:5,animation:"pulse 2s infinite"}}>
              <Bell size={13}/> {alertas}
            </button>
          )}
          {lastSaved&&<span style={{fontSize:10,color:"#475569",display:"flex",alignItems:"center",gap:4}}><Cloud size={12}/> {lastSaved}</span>}
          <div style={{display:"flex",alignItems:"center",gap:7,background:"rgba(255,255,255,0.07)",borderRadius:9,padding:"5px 10px",border:"1px solid rgba(255,255,255,0.08)"}}>
            <div style={{width:24,height:24,background:"linear-gradient(135deg,#2563eb,#7c3aed)",borderRadius:99,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700}}>{usuario.nombre.charAt(0)}</div>
            <span style={{fontSize:12,color:"#cbd5e1",fontWeight:600}}>{usuario.nombre}</span>
          </div>
          <button onClick={()=>setModalSalir(true)}
            style={{background:"rgba(220,38,38,0.15)",border:"1px solid rgba(220,38,38,0.3)",color:"#fca5a5",padding:"6px 14px",borderRadius:8,fontSize:12,fontWeight:700,cursor:"pointer"}}>
            Salir
          </button>
        </div>
      </div>

      <div style={{display:"flex",height:"calc(100vh - 58px)",overflow:"hidden"}}>

        {/* SIDEBAR */}
        <div style={{width:sideCollapsed?60:200,background:"linear-gradient(180deg,#1e293b 0%,#0f172a 100%)",flexShrink:0,height:"100%",overflowY:"auto",overflowX:"hidden",transition:"width 0.25s ease",boxShadow:"2px 0 12px rgba(0,0,0,0.2)"}}>
          <div style={{padding:sideCollapsed?"10px 8px":"12px 9px",display:"flex",flexDirection:"column",gap:2}}>
            {nav.map(n=>{
              const active=view===n.id;
              return(
<button key={n.id} onClick={()=>{setHSel(null);setView(n.id);}}
                  title={sideCollapsed?n.label:""}
                  style={{width:"100%",display:"flex",alignItems:"center",gap:9,padding:sideCollapsed?"9px":"8px 11px",background:active?"linear-gradient(135deg,#2563eb,#1d4ed8)":"transparent",color:active?"white":"#64748b",border:"none",cursor:"pointer",fontSize:12.5,textAlign:"left",borderRadius:9,transition:"all 0.15s",position:"relative",overflow:"hidden"}}>
                  {active&&<div style={{position:"absolute",left:0,top:"20%",bottom:"20%",width:3,background:"#60a5fa",borderRadius:"0 3px 3px 0"}}/>}
                  <n.icon size={17} style={{flexShrink:0,opacity:active?1:0.5}}/>
                  {!sideCollapsed&&(
                    <div style={{overflow:"hidden"}}>
                      <div style={{fontWeight:active?700:500,fontSize:12.5,whiteSpace:"nowrap",color:active?"white":"#94a3b8"}}>{n.label}</div>
                      <div style={{fontSize:9.5,color:active?"#bfdbfe":"#475569",marginTop:1,whiteSpace:"nowrap"}}>{n.desc}</div>
                    </div>
                  )}
                  {active&&!sideCollapsed&&<div style={{marginLeft:"auto",width:6,height:6,background:"#60a5fa",borderRadius:99,flexShrink:0}}/>}
                </button>
              );
            })}
          </div>
          {!sideCollapsed&&(
            <div style={{margin:"12px 10px 0",padding:"10px 12px",background:"rgba(255,255,255,0.04)",borderRadius:10,border:"1px solid rgba(255,255,255,0.06)"}}>
              <div style={{fontSize:9,color:"#334155",textTransform:"uppercase",letterSpacing:1,fontWeight:700,marginBottom:4}}>Sistema</div>
              <div style={{fontSize:11,color:"#475569"}}>v2.1</div>
            </div>
          )}
        </div>

        {/* CONTENIDO */}
        <div style={{flex:1,padding:20,overflowY:"auto",minWidth:0,background:"#e8ecf3"}}>

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

      <BtnNotas G={G} usuario={usuario} rerender={rerender} showToast={showToast}/>
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
