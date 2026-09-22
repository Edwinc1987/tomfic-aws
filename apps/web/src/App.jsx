import { useState, useRef, useEffect } from "react";
import { Package, CheckCircle2, AlertTriangle, XCircle, X } from "lucide-react";
import { G, saveLocalCache, loadLocalCache, clearLocalCache, saveLocalConfig, rememberSelectedInventory, APP_VERSION } from "@/lib/data";
import { authService } from "@/core/auth/authService";
import { api } from "@/core/network/api";
import { setAuthTokenGetter, setExtraHeaders, clearExtraHeaders, teamLogin, apiRequest } from "@/core/network/apiClient";
import OfflineBanner from "@/components/OfflineBanner";
import { CommandPalette } from "@/components/CommandPalette";
import { Login } from "@/modules/Login";
import { ModAdmin } from "@/modules/ModAdmin";
import { ModCapturador } from "@/modules/ModCapturador";
import { ModGerente } from "@/modules/ModGerente";
import { PanelDueno } from "@/modules/PanelDueno";
import { VComercial } from "@/views/VComercial";

const mapRole=(r)=>{
  if(!r)return "admin";
  const x=r.toUpperCase();
  if(x==="OWNER")return "dueno";
  if(x==="MANAGER")return "gerente";
  if(x==="CAPTURER")return "capturador";
  return "admin";
};

export default function TomficApp(){
  const [usuario,setUsuario]=useState(null);
  const [loginForm,setLoginForm]=useState({tab:"admin",empresa:"",user:"",email:"",pass:""});
  const [loginErr,setLoginErr]=useState("");
  const [entrar,setEntrar]=useState(true);
  const [,tick]=useState(0);
  const [lastSaved,setLastSaved]=useState(null);
  const [loading,setLoading]=useState(true);
  const [loadingTenant,setLoadingTenant]=useState(false);
  const [loadErr,setLoadErr]=useState("");

  const afterAuth=async()=>{
    try{
      const tok=await authService.getToken?.()||null;
      if(tok)setAuthTokenGetter(async()=>tok);
    }catch(e){}
    let au=null;
    try{const r=await authService.getUser();au=r?.data?.user;}catch(e){}
    if(!au)return false;
    let perfil=null;
    try{perfil=await api.me();}catch(e){
      console.warn("No se pudo cargar perfil del API:",e.message);
      perfil={id:au.sub||au.id,email:au.email||au["cognito:username"],name:au.email||"Usuario",role:"ADMIN",activo:true,tenant_id:"tenant-demo-a",tenant:{id:"tenant-demo-a",nombre:"Empresa Demo A",activo:true}};
    }
    if(!perfil||perfil.activo===false){await authService.signOut();setLoginErr("Tu usuario está inactivo.");return false;}
    const rol=mapRole(perfil.role);
    G.tenantId=perfil.tenant_id||"tenant-demo-a";
    G.tenant=perfil.tenant||{id:G.tenantId,nombre:"Empresa",activo:true};
    setLoadingTenant(true);
    try{
      const invs=await api.listInventories(G.tenantId).catch(()=>null);
      if(Array.isArray(invs))G.inventarios=invs;
      if(!G.inventario||!G.inventarios.some(i=>i.id===G.inventario?.id)){
        if(G.inventarios.length>0)G.inventario=G.inventarios[0];
      }
      const counts=await api.listCounts(G.tenantId,G.inventario?.id||"").catch(()=>[]);
      G.conteos=Array.isArray(counts)?counts:G.conteos;
      const prods=await api.listAllProducts(G.tenantId,G.inventario?.id||"").catch(()=>null);
      if(Array.isArray(prods))G.productos=prods;
      if(G.inventario)rememberSelectedInventory();
      for(const c of G.conteos){
        try{
          const caps=await apiRequest(`/v1/captures/by-count/${c.id}`,{headers:{"x-tenant-id":G.tenantId}});
          if(Array.isArray(caps))caps.forEach(cap=>{if(cap.key)G.capturas[cap.key]=cap;});
        }catch(e){}
      }
      try{
        const closed=await apiRequest("/v1/inventories/closed",{headers:{"x-tenant-id":G.tenantId}});
        if(Array.isArray(closed)){
          G.historial=closed.map(inv=>{
            const snaps=inv.snapshotsJson||{};
            const meta=inv.meta||snaps.meta||{};
            return{...inv,nombre:inv.name||inv.nombre||"",fecha:inv.fecha||meta.fecha||"",apertura:inv.apertura||meta.apertura||"",horaApertura:meta.horaApertura||"",usuarioApertura:meta.usuarioApertura||"",cierre:inv.closedAt||inv.cierre||meta.cierre||"",horaCierre:meta.horaCierre||"",usuarioCierre:meta.usuarioCierre||inv.closedBy||"",conteos:snaps.conteos||[],capturas:snaps.capturas||{},productos:snaps.productos||[],localizaciones:snaps.localizaciones||[],ubicacionesTipos:snaps.ubicacionesTipos||[],localizacionTipos:snaps.localizacionTipos||[],notas:snaps.notas||[]};
          });
        }
      }catch(e){}
    }catch(e){console.warn("Error cargando datos:",e);}
    setLoadingTenant(false);
    setUsuario({...perfil,nombre:perfil.nombre||perfil.name,rol,id:perfil.id||au.sub,tenant_id:G.tenantId});
    return true;
  };

  useEffect(()=>{
    console.log("TOMFIC build:",APP_VERSION);
    (async()=>{
      try{await loadLocalCache(G.tenantId||null);}catch(e){}
      try{const r=await authService.getSession();if(r?.data?.session)await afterAuth();}catch(e){console.warn(e);}
      setLoading(false);
    })();
    const sub=authService.onAuthStateChange?.((event)=>{
      if(event==="SIGNED_OUT"){G.tenantId=null;G.tenant=null;setUsuario(null);}
    });
    return ()=>{try{sub?.subscription?.unsubscribe?.();}catch(e){}};
  },[]);

  useEffect(()=>{
    if(document.getElementById("tomfic-responsive"))return;
    const st=document.createElement("style");
    st.id="tomfic-responsive";
    st.textContent=`*{box-sizing:border-box}html,body{max-width:100%;overflow-x:hidden}table{max-width:100%}@media(max-width:768px){table{display:block;overflow-x:auto;white-space:nowrap;-webkit-overflow-scrolling:touch}h1{font-size:26px!important}h2{font-size:17px!important}h3{font-size:15px!important}div,section{max-width:100%}}`;
    document.head.appendChild(st);
  },[]);

  const rerender=()=>{tick(n=>n+1);saveLocalCache();saveLocalConfig();setLastSaved(new Date().toLocaleTimeString("es-CO"));};

  const recargar=async()=>{
    if(typeof navigator!=="undefined"&&!navigator.onLine)return;
    try{
      const invs=await api.listInventories(G.tenantId).catch(()=>null);
      if(Array.isArray(invs))G.inventarios=invs;
      if(!G.inventario||!G.inventarios.some(i=>i.id===G.inventario?.id)){
        if(G.inventarios.length>0)G.inventario=G.inventarios[0];
      }
      const counts=await api.listCounts(G.tenantId,G.inventario?.id||"").catch(()=>[]);
      G.conteos=Array.isArray(counts)?counts:G.conteos;
      const prods=await api.listAllProducts(G.tenantId,G.inventario?.id||"").catch(()=>null);
      if(Array.isArray(prods))G.productos=prods;
      if(G.inventario)rememberSelectedInventory();
      for(const c of G.conteos){
        try{
          const caps=await apiRequest(`/v1/captures/by-count/${c.id}`,{headers:{"x-tenant-id":G.tenantId}});
          if(Array.isArray(caps))caps.forEach(cap=>{if(cap.key)G.capturas[cap.key]=cap;});
        }catch(e){}
      }
      try{
        const closed=await apiRequest("/v1/inventories/closed",{headers:{"x-tenant-id":G.tenantId}});
        if(Array.isArray(closed)){
          G.historial=closed.map(inv=>{
            const snaps=inv.snapshotsJson||{};
            const meta=inv.meta||snaps.meta||{};
            return{...inv,nombre:inv.name||inv.nombre||"",fecha:inv.fecha||meta.fecha||"",apertura:inv.apertura||meta.apertura||"",horaApertura:meta.horaApertura||"",usuarioApertura:meta.usuarioApertura||"",cierre:inv.closedAt||inv.cierre||meta.cierre||"",horaCierre:meta.horaCierre||"",usuarioCierre:meta.usuarioCierre||inv.closedBy||"",conteos:snaps.conteos||[],capturas:snaps.capturas||{},productos:snaps.productos||[],localizaciones:snaps.localizaciones||[],ubicacionesTipos:snaps.ubicacionesTipos||[],localizacionTipos:snaps.localizacionTipos||[],notas:snaps.notas||[]};
          });
        }
      }catch(e){}
      saveLocalCache();
      const users=await api.loadUsuarios(G.tenantId).catch(()=>null);
      if(users?.data)G.usuarios=users.data;
      const tenants=await api.listTenants().catch(()=>null);
      if(Array.isArray(tenants))G.tenants=tenants;
    }catch(e){}
    tick(n=>n+1);
  };

  const toastRef=useRef(null);
  const [toast,setToast]=useState(null);
  const showToast=(msg,type="ok")=>{
    setToast({msg,type});
    if(toastRef.current)clearTimeout(toastRef.current);
    toastRef.current=setTimeout(()=>setToast(null),3500);
  };

  const limpiarDatos=async()=>{await clearLocalCache();window.location.reload();};

  const login=async()=>{
    setLoginErr("");
    const pass=loginForm.pass;
    if(loginForm.tab==="equipo"){
      const nit=(loginForm.empresa||"").trim();
      const name=(loginForm.user||"").trim();
      if(!nit||!name||!pass)return setLoginErr("Completa NIT, usuario y contraseña");
      setLoadingTenant(true);
      try{
        const result=await teamLogin(nit,name,pass);
        setAuthTokenGetter(async()=>result.token);
        setExtraHeaders({"x-tenant-id":result.user.tenantId,"x-user-id":result.user.id,"x-user-role":result.user.role});
        G.tenantId=result.user.tenantId;
        G.tenant=result.tenant||{id:result.user.tenantId,nombre:"Empresa",activo:true};
        const rol=mapRole(result.user.role);
        setUsuario({id:result.user.id,nombre:result.user.name,email:result.user.email,rol,activo:true,tenant_id:result.user.tenantId,tenant:G.tenant,inventario_id:result.user.inventoryId});
        try{
          const invs=await api.listInventories(G.tenantId).catch(()=>null);
          if(Array.isArray(invs))G.inventarios=invs;
          if(!G.inventario||!G.inventarios.some(i=>i.id===G.inventario?.id)){
            if(G.inventarios.length>0)G.inventario=G.inventarios[0];
          }
          const counts=await api.listCounts(G.tenantId,G.inventario?.id||"").catch(()=>[]);
          G.conteos=Array.isArray(counts)?counts:[];
            const prods=await api.listAllProducts(G.tenantId,G.inventario?.id||"").catch(()=>null);
            if(Array.isArray(prods))G.productos=prods;
            if(G.inventario)rememberSelectedInventory();
        }catch(e){}
        setLoadingTenant(false);
      }catch(e){
        setLoadingTenant(false);
        return setLoginErr(e.message||"Credenciales incorrectas");
      }
    }else{
      const email=(loginForm.email||"").trim().toLowerCase();
      if(!email||!pass)return setLoginErr("Ingresa tu email y contraseña");
      setLoadingTenant(true);
      const {error}=await authService.signIn(email,pass);
      if(error){
        setLoadingTenant(false);
        return setLoginErr("Email o contraseña incorrectos");
      }
      const ok=await afterAuth();
      if(!ok)setLoadingTenant(false);
    }
  };

  const logout=async()=>{
    try{await authService.signOut();}catch(e){}
    clearExtraHeaders();
    G.tenantId=null;G.tenants=[];G.productos=[];G.conteos=[];G.capturas={};G.inventario=null;G.inventarios=[];G._inventarioDatos={};G.historial=[];G.notas=[];
    setEntrar(true);setLoginForm({tab:"admin",empresa:"",user:"",email:"",pass:""});setLoginErr("");
    setUsuario(null);
  };

  if(loading)return(<div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"#0f172a",fontFamily:"system-ui,sans-serif"}}><div style={{textAlign:"center",color:"white"}}><div style={{display:"flex",justifyContent:"center",marginBottom:16}}><Package size={52} color="#2563eb"/></div><div style={{fontSize:24,fontWeight:900,marginBottom:8}}>tomfic</div><div style={{fontSize:14,color:"#64748b"}}>{loadErr||"Cargando..."}</div></div></div>);

  if(loadingTenant)return(<div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"#0f172a",fontFamily:"system-ui,sans-serif"}}><div style={{textAlign:"center",color:"white"}}><div style={{display:"flex",justifyContent:"center",marginBottom:16}}><Package size={52} color="#2563eb"/></div><div style={{fontSize:24,fontWeight:900,marginBottom:8}}>tomfic</div><div style={{fontSize:14,color:"#64748b"}}>Cargando tu empresa…</div></div></div>);

  if(!usuario)return <Login lf={loginForm} setLf={setLoginForm} err={loginErr} onLogin={login} lastSaved={lastSaved} onBack={()=>setEntrar(false)}/>;

  const p={usuario,setUsuario,logout,G,rerender,recargar,lastSaved,limpiarDatos,showToast};
  return(
    <>
      {toast&&(()=>{const err=toast.type==="err",warn=toast.type==="warn";const Icon=err?XCircle:warn?AlertTriangle:CheckCircle2;return <div role="status" aria-live="polite" style={{position:"fixed",right:18,bottom:18,display:"flex",alignItems:"flex-start",gap:10,background:"white",color:"#0f172a",padding:"12px 12px 12px 14px",borderLeft:`4px solid ${err?"#dc2626":warn?"#d97706":"#16a34a"}`,borderRadius:10,zIndex:9999,fontSize:13,fontWeight:600,boxShadow:"0 8px 25px rgba(15,23,42,0.18)",maxWidth:360,lineHeight:1.35}}><Icon size={18} color={err?"#dc2626":warn?"#d97706":"#16a34a"} style={{flexShrink:0,marginTop:1}}/><span>{toast.msg}</span><button aria-label="Cerrar mensaje" onClick={()=>setToast(null)} style={{border:0,background:"transparent",color:"#94a3b8",padding:0,cursor:"pointer",lineHeight:1}}><X size={16}/></button></div>})()}
      <OfflineBanner/>
      <CommandPalette/>
      {usuario.rol==="dueno"?<PanelDueno {...p}/>:usuario.rol==="comercial"?<VComercial {...p}/>:usuario.rol==="capturador"?<ModCapturador {...p}/>:usuario.rol==="gerente"?<ModGerente {...p}/>:<ModAdmin {...p}/>}
    </>
  );
}
