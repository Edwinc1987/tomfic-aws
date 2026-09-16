import { useState, useRef, useEffect } from "react";
import { Package, CheckCircle2, AlertTriangle, XCircle, X } from "lucide-react";
import { SB, G, saveLocalCache, loadLocalCache, clearLocalCache, saveLocalConfig, slugify, memberEmail, diasHasta, fmtFechaCorta, GRACIA_DIAS, APP_VERSION } from "@/lib/data";
import { authService } from "@/core/auth/authService";
import { loadBootstrap, loadTenantData, loadTenants, doSync, scheduleSync, initSnap, getBusy, getDirty, getSyncing } from "@/lib/sync";
import OfflineBanner from "@/components/OfflineBanner";
import SetNewPassword from "@/components/SetNewPassword";
import { Login } from "@/modules/Login";
import { ModAdmin } from "@/modules/ModAdmin";
import { ModCapturador } from "@/modules/ModCapturador";
import { ModGerente } from "@/modules/ModGerente";
import { PanelDueno } from "@/modules/PanelDueno";
import { VComercial } from "@/views/VComercial";
import Landing from "@/Landing";
import { mergeLanding } from "@/landingContent";

export default function TomficApp(){
  const [usuario,setUsuario]=useState(null);
  const [loginForm,setLoginForm]=useState({tab:"equipo",empresa:"",user:"",email:"",pass:""});
  const [loginErr,setLoginErr]=useState("");
  const [entrar,setEntrar]=useState(false);
  const [,tick]=useState(0);
  const [lastSaved,setLastSaved]=useState(null);
  const [loading,setLoading]=useState(true);
  const [loadingTenant,setLoadingTenant]=useState(false);
  const [recovery,setRecovery]=useState(false);
  const [loadErr,setLoadErr]=useState("");

  const afterAuth=async()=>{
    const {data:{user:au}}=await authService.getUser();
    if(!au)return false;
    const {data:perfil}=await SB.loadMyProfile(au.id);
     if(!perfil){await authService.signOut();setLoginErr("Tu usuario no tiene perfil. Contacta al administrador.");return false;}
     if(perfil.activo===false){await authService.signOut();setLoginErr("Tu usuario está inactivo.");return false;}
    G.tenant=null;
    if(perfil.rol!=="dueno"&&perfil.rol!=="comercial"){
      const {data:ten}=await SB.loadTenant(perfil.tenant_id);
       if(!ten||ten.activo===false){await authService.signOut();setLoginErr("Tu empresa está pendiente de aprobación o ha sido suspendida.");return false;}
      const d=diasHasta(ten.vence);
       if(d!==null&&d+GRACIA_DIAS<0){await authService.signOut();setLoginErr(`Tu plan venció el ${fmtFechaCorta(ten.vence)}. Contacta a tu proveedor para renovar el servicio.`);return false;}
      G.tenant=ten;
    }
    setLoadingTenant(true);
    try{
       if(perfil.rol==="dueno"||perfil.rol==="comercial"){G.tenantId=null;await loadTenants();}
       else{await loadTenantData(perfil.tenant_id,perfil.inventario_id||null);}
     }catch(e){console.warn("Error cargando datos de la empresa:",e);await loadLocalCache(perfil.tenant_id);}
    setLoadingTenant(false);
    setUsuario(perfil);
    return true;
  };

  useEffect(()=>{
    console.log("TOMFIC build:",APP_VERSION);
    (async()=>{
        try{await loadBootstrap();}catch(e){console.error(e);setLoadErr("Error de conexión con la nube");}
      try{
         const {data:{session}}=await authService.getSession();
        if(session)await afterAuth();
      }catch(e){console.warn(e);}
      setLoading(false);
    })();
     const {data:sub}=authService.onAuthStateChange((event)=>{
      if(event==="SIGNED_OUT"){G.tenantId=null;G.tenant=null;setUsuario(null);}
      if(event==="PASSWORD_RECOVERY"){setRecovery(true);}
    });
    return ()=>{try{sub.subscription.unsubscribe();}catch(e){}};
  },[]);

  useEffect(()=>{
    if(document.getElementById("tomfic-responsive"))return;
    const st=document.createElement("style");
    st.id="tomfic-responsive";
    st.textContent=`
      * { box-sizing: border-box; }
      html, body { max-width: 100%; overflow-x: hidden; }
      table { max-width: 100%; }
      @media (max-width: 768px) {
        table { display: block; overflow-x: auto; white-space: nowrap; -webkit-overflow-scrolling: touch; }
        h1 { font-size: 26px !important; }
        h2 { font-size: 17px !important; }
        h3 { font-size: 15px !important; }
        div, section { max-width: 100%; }
      }
    `;
    document.head.appendChild(st);
  },[]);

  const rerender=()=>{
    tick(n=>n+1);
    saveLocalCache();saveLocalConfig();
    scheduleSync();
    setLastSaved(new Date().toLocaleTimeString("es-CO"));
  };
  const recargar=async()=>{
    // Nunca reemplazar el estado local con una carga de nube mientras el móvil
    // está sin conexión. Las capturas quedan pendientes para sincronizarse al volver.
    if(typeof navigator!=="undefined"&&!navigator.onLine)return;
    if(getBusy())return;
    if(G.tenantId&&getDirty()){
      try{await doSync();}catch(e){}
      if(getDirty())return;
    }
    if(getSyncing())return;
     try{if(usuario&&(usuario.rol==="dueno"||usuario.rol==="comercial"))await loadTenants();else if(G.tenantId)await loadTenantData(G.tenantId);}catch(e){}
    tick(n=>n+1);
  };

  const toastRef=useRef(null);
  const [toast,setToast]=useState(null);
  const showToast=(msg,type="ok")=>{
    setToast({msg,type});
    if(toastRef.current)clearTimeout(toastRef.current);
    toastRef.current=setTimeout(()=>setToast(null),3500);
  };

  const limpiarDatos=async()=>{
    await clearLocalCache();
    window.location.reload();
  };

  const login=async()=>{
    setLoginErr("");
    const pass=loginForm.pass;
    let email;
    if(loginForm.tab==="admin"){
      email=(loginForm.email||"").trim().toLowerCase();
      if(!email||!pass)return setLoginErr("Ingresa tu email y contraseña");
    }else{
      const emp=slugify(loginForm.empresa), usr=slugify(loginForm.user);
      if(!emp||!usr||!pass)return setLoginErr("Completa empresa, usuario y contraseña");
      email=memberEmail(usr,emp);
    }
    setLoadingTenant(true);
     const {error}=await authService.signIn(email,pass);
    if(error){
      setLoadingTenant(false);
      return setLoginErr(loginForm.tab==="admin"?"Email o contraseña incorrectos":"Empresa, usuario o contraseña incorrectos");
    }
    const ok=await afterAuth();
    if(!ok)setLoadingTenant(false);
  };

  const registrarEmpresa=async({empresa,slug,email,pass,nombre,nit})=>{
    const {data,error}=await SB.registerTenant(empresa,slug,email,pass,nombre,nit);
    if(error)return {ok:false,error:error.message||"No se pudo completar el registro"};
    return {ok:true,data};
  };
  const capturarLead=async({nombre,email,telefono,mensaje})=>{
    const {error}=await SB.capturarLead(nombre,email,telefono,mensaje);
    if(error)return {ok:false,error:error.message||"No se pudo enviar. Intenta de nuevo."};
    return {ok:true};
  };

  const logout=async()=>{
     try{await authService.signOut();}catch(e){}
    G.tenantId=null;G.tenants=[];G.productos=[];G.conteos=[];G.capturas={};G.inventario=null;G.inventarios=[];G._inventarioDatos={};G.historial=[];G.notas=[];
    setEntrar(false);setLoginForm({tab:"equipo",empresa:"",user:"",email:"",pass:""});setLoginErr("");
    setUsuario(null);
  };

  if(recovery)return(<SetNewPassword onDone={()=>{setRecovery(false);setUsuario(null);setEntrar(true);setLoginForm(f=>({...f,tab:"admin"}));showToast("Contraseña actualizada. Inicia sesión con tu clave nueva.");}}/>);

  if(loading)return(<div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"#0f172a",fontFamily:"system-ui,sans-serif"}}><div style={{textAlign:"center",color:"white"}}><div style={{display:"flex",justifyContent:"center",marginBottom:16}}><Package size={52} color="#2563eb"/></div><div style={{fontSize:24,fontWeight:900,marginBottom:8}}>tomfic</div><div style={{fontSize:14,color:"#64748b"}}>{loadErr||"Cargando datos de la nube..."}</div><div style={{marginTop:20,width:200,height:4,background:"#1e293b",borderRadius:99,overflow:"hidden",margin:"20px auto 0"}}><div style={{width:"60%",height:"100%",background:"linear-gradient(90deg,#2563eb,#16a34a)",borderRadius:99}}/></div></div></div>);

  if(loadingTenant)return(<div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"#0f172a",fontFamily:"system-ui,sans-serif"}}><div style={{textAlign:"center",color:"white"}}><div style={{display:"flex",justifyContent:"center",marginBottom:16}}><Package size={52} color="#2563eb"/></div><div style={{fontSize:24,fontWeight:900,marginBottom:8}}>tomfic</div><div style={{fontSize:14,color:"#64748b"}}>Cargando tu empresa…</div></div></div>);

  if(!usuario) return entrar
    ? <Login lf={loginForm} setLf={setLoginForm} err={loginErr} onLogin={login} lastSaved={lastSaved} onBack={()=>{setEntrar(false);setLoginErr("");}}/>
    : <Landing onEnter={()=>setEntrar(true)} onRegister={registrarEmpresa} onLead={capturarLead} content={mergeLanding(G.landingContent)}/>;
  const p={usuario,setUsuario,logout,G,rerender,recargar,showToast,lastSaved,limpiarDatos};
  return(
    <>
      {toast&&(()=>{const err=toast.type==="err",warn=toast.type==="warn";const Icon=err?XCircle:warn?AlertTriangle:CheckCircle2;return <div role="status" aria-live="polite" style={{position:"fixed",right:18,bottom:18,display:"flex",alignItems:"flex-start",gap:10,background:"white",color:"#0f172a",padding:"12px 12px 12px 14px",borderLeft:`4px solid ${err?"#dc2626":warn?"#d97706":"#16a34a"}`,borderRadius:10,zIndex:9999,fontSize:13,fontWeight:600,boxShadow:"0 8px 25px rgba(15,23,42,0.18)",maxWidth:360,lineHeight:1.35}}><Icon size={18} color={err?"#dc2626":warn?"#d97706":"#16a34a"} style={{flexShrink:0,marginTop:1}}/><span>{toast.msg}</span><button aria-label="Cerrar mensaje" onClick={()=>setToast(null)} style={{border:0,background:"transparent",color:"#94a3b8",padding:0,cursor:"pointer",lineHeight:1}}><X size={16}/></button></div>})()}
      <OfflineBanner/>
       {usuario.rol==="dueno"?<PanelDueno {...p}/>:usuario.rol==="comercial"?<VComercial {...p}/>:usuario.rol==="capturador"?<ModCapturador {...p}/>:usuario.rol==="gerente"?<ModGerente {...p}/>:<ModAdmin {...p}/>}
    </>
  );
}
