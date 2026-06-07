import { useState, useRef, useEffect } from "react";
import * as XLSX from "xlsx";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_KEY);

const TODAY = () => new Date().toLocaleDateString("es-CO");
const HOUR  = () => new Date().toLocaleTimeString("es-CO");
const ID    = () => Date.now().toString(36) + Math.random().toString(36).slice(2,5);

// ─────────────────────────────────────────
// ESTADO GLOBAL
// ─────────────────────────────────────────
let G = {
  productos: [],
  usuarios: [
    {id:"u1",nombre:"ADMIN",pass:"admin123",rol:"admin",activo:true,creado:TODAY()},
    {id:"u2",nombre:"JUAN",pass:"123",rol:"capturador",activo:true,creado:TODAY()},
    {id:"u3",nombre:"MARIA",pass:"123",rol:"capturador",activo:true,creado:TODAY()},
    {id:"u4",nombre:"CARLOS",pass:"123",rol:"capturador",activo:true,creado:TODAY()},
  ],
  // Jerarquía de ubicaciones: { id, ubicacion, localizacion, nroLocalizacion, observacion }
  localizaciones: [
    {id:"l1",ubicacion:"BODEGA",localizacion:"MUEBLE",nro:"MUEBLE 1",observacion:"DETERGENTES"},
    {id:"l2",ubicacion:"BODEGA",localizacion:"MUEBLE",nro:"MUEBLE 2",observacion:"ALIMENTOS"},
    {id:"l3",ubicacion:"BODEGA",localizacion:"NEVERA",nro:"NEVERA 1",observacion:"LÁCTEOS"},
    {id:"l4",ubicacion:"BODEGA",localizacion:"LINEAL",nro:"LINEAL 1",observacion:""},
    {id:"l5",ubicacion:"SALA DE VENTAS",localizacion:"LINEAL",nro:"LINEAL 1",observacion:"BEBIDAS"},
    {id:"l6",ubicacion:"SALA DE VENTAS",localizacion:"PUNTA",nro:"PUNTA 1",observacion:"PROMOCIONES"},
  ],
  ubicacionesTipos: ["BODEGA","SALA DE VENTAS"],
  localizacionTipos: ["MUEBLE","LINEAL","NEVERA","PUNTA","JAULA","CAVA"],
  inventario: null,
  conteos: [],
  capturas: {},
  alertas: [],
  historial: [],
  notas: [], // {id, texto, fotos:[], usuario, rol, fecha, hora, inventarioId}
};

const CAT_C = {"CARNES FRIAS":"#dc2626","CONGELADOS":"#2563eb","SALSAS Y CONSERVAS":"#d97706","LACTEOS Y DERIVADOS":"#0891b2","REPOSTERIA":"#db2777","PANADERIA":"#c2410c","ADOBOS":"#65a30d","CHAMPIÑONES":"#78350f","ACEITES":"#92400e","HARINAS":"#ca8a04","PERECEDEROS":"#16a34a","APANADOS":"#7c2d12"};
const catC = c => CAT_C[c?.trim()] || "#6b7280";

// ─────────────────────────────────────────
// ESTILOS BASE
// ─────────────────────────────────────────
const inp = {width:"100%",padding:"9px 12px",border:"1.5px solid #e2e8f0",borderRadius:8,fontSize:14,boxSizing:"border-box",outline:"none",background:"white",color:"#0f172a"};
const lbl = {fontSize:11,fontWeight:700,color:"#374151",textTransform:"uppercase",letterSpacing:"0.8px",display:"block",marginBottom:5};
const card = {background:"white",borderRadius:14,padding:20,boxShadow:"0 2px 8px rgba(0,0,0,0.06)",border:"1px solid #f1f5f9"};

function Lbl({children,color}){return <label style={{...lbl,...(color?{color}:{})}}>{children}</label>;}
function Inp({value,onChange,placeholder,type="text",disabled,onKeyDown,style={},min}){
  return <input type={type} value={value} onChange={onChange} placeholder={placeholder} disabled={disabled} onKeyDown={onKeyDown} min={min} style={{...inp,...style,background:disabled?"#f8fafc":"white"}}/>;
}
function Sel({value,onChange,children,style={}}){
  return <select value={value} onChange={onChange} style={{...inp,...style}}>{children}</select>;
}
function Btn({c="#2563eb",onClick,disabled,children,full,small,outline}){
  const bg=disabled?"#e2e8f0":outline?"white":c;
  const col=disabled?"#94a3b8":outline?c:"white";
  const border=outline?`1.5px solid ${c}`:"none";
  return <button onClick={onClick} disabled={disabled} style={{padding:small?"5px 12px":"9px 20px",background:bg,color:col,border,borderRadius:8,cursor:disabled?"not-allowed":"pointer",fontWeight:700,fontSize:small?12:13,width:full?"100%":"auto",whiteSpace:"nowrap"}}>{children}</button>;
}
function Badge({color="#6b7280",children,small}){
  return <span style={{background:color+"22",color,padding:small?"2px 7px":"3px 10px",borderRadius:20,fontSize:small?10:12,fontWeight:700,whiteSpace:"nowrap"}}>{children}</span>;
}
function EstBadge({e}){
  const m={BUENO:["#dcfce7","#166534"],VENCIDO:["#fee2e2","#dc2626"],AVERIADO:["#fef3c7","#92400e"],"NO APTO VENTA":["#fee2e2","#991b1b"],BAJAS:["#fef9c3","#854d0e"],"SIN REVISAR":["#f1f5f9","#475569"]};
  const [bg,tc]=m[e]||["#f1f5f9","#475569"];
  return <span style={{background:bg,color:tc,padding:"2px 8px",borderRadius:12,fontSize:11,fontWeight:700}}>{e||"—"}</span>;
}
function Modal({titulo,onClose,children,wide}){
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.55)",zIndex:1000,display:"flex",alignItems:"flex-start",justifyContent:"center",paddingTop:30,overflowY:"auto",paddingBottom:30}}>
      <div style={{background:"white",borderRadius:16,padding:28,width:wide?680:480,maxWidth:"96vw",boxShadow:"0 25px 60px rgba(0,0,0,0.3)"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
          <h3 style={{margin:0,fontSize:17,fontWeight:700,color:"#0f172a"}}>{titulo}</h3>
          <button onClick={onClose} style={{background:"transparent",border:"none",fontSize:22,cursor:"pointer",color:"#94a3b8",lineHeight:1}}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}
function Section({titulo,children,subtitle}){
  return(
    <div style={{marginBottom:24}}>
      {titulo&&(
        <div style={{marginBottom:18,paddingBottom:14,borderBottom:"2px solid #f1f5f9"}}>
          <h2 style={{margin:0,fontSize:21,fontWeight:800,color:"#0f172a",letterSpacing:-0.5}}>{titulo}</h2>
          {subtitle&&<div style={{fontSize:12,color:"#94a3b8",marginTop:4}}>{subtitle}</div>}
        </div>
      )}
      {children}
    </div>
  );
}

// ── Lector de código de barras por cámara (ZXing vía CDN, modo preciso: doble lectura) ──
function CamScanner({onDetect,onClose,color="#2563eb"}){
  const videoRef=useRef(null);
  const readerRef=useRef(null);
  const lastRef=useRef({code:null,count:0});
  const [err,setErr]=useState("");
  const [cargando,setCargando]=useState(true);
  useEffect(()=>{
    let activo=true;
    const cargarZXing=()=>new Promise((resolve,reject)=>{
      if(window.ZXing)return resolve();
      const s=document.createElement("script");
      s.src="https://unpkg.com/@zxing/library@0.21.3/umd/index.min.js";
      s.async=true;s.onload=()=>resolve();s.onerror=()=>reject(new Error("No se pudo cargar el lector (revisa tu conexión)."));
      document.head.appendChild(s);
    });
    (async()=>{
      try{
        await cargarZXing();
        if(!activo)return;
        const Z=window.ZXing;
        const hints=new Map();
        hints.set(Z.DecodeHintType.POSSIBLE_FORMATS,[Z.BarcodeFormat.EAN_13,Z.BarcodeFormat.EAN_8,Z.BarcodeFormat.UPC_A,Z.BarcodeFormat.UPC_E,Z.BarcodeFormat.CODE_128,Z.BarcodeFormat.CODE_39,Z.BarcodeFormat.ITF]);
        hints.set(Z.DecodeHintType.TRY_HARDER,true);
        const reader=new Z.BrowserMultiFormatReader(hints,300);
        readerRef.current=reader;setCargando(false);
        await reader.decodeFromConstraints({video:{facingMode:{ideal:"environment"}}},videoRef.current,(result)=>{
          if(!result||!activo)return;
          const text=result.getText();const L=lastRef.current;
          if(text===L.code){L.count++;}else{L.code=text;L.count=1;}
          if(L.count>=2){activo=false;try{if(navigator.vibrate)navigator.vibrate(120);}catch(e){}try{reader.reset();}catch(e){}onDetect(text);}
        });
      }catch(e){if(activo){setCargando(false);setErr(e&&e.message?e.message:"No se pudo abrir la cámara. Revisa los permisos del navegador.");}}
    })();
    return ()=>{activo=false;try{readerRef.current&&readerRef.current.reset();}catch(e){}};
  },[]);
  return(<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.88)",zIndex:2000,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:16}}>
    <div style={{position:"relative",width:"100%",maxWidth:420,background:"#000",borderRadius:16,overflow:"hidden",aspectRatio:"3/4"}}>
      <video ref={videoRef} muted playsInline style={{width:"100%",height:"100%",objectFit:"cover",display:"block"}}/>
      {!cargando&&!err&&<div style={{position:"absolute",top:"34%",bottom:"34%",left:"8%",right:"8%",border:`3px solid ${color}`,borderRadius:12,boxShadow:"0 0 0 9999px rgba(0,0,0,0.25)"}}/>}
      {cargando&&<div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",color:"white",fontSize:14}}>Iniciando cámara…</div>}
    </div>
    <div style={{color:err?"#fca5a5":"white",marginTop:16,fontSize:14,fontWeight:600,textAlign:"center",maxWidth:340,lineHeight:1.5}}>{err||"Centra el código dentro del recuadro y mantén firme el celular"}</div>
    <button onClick={onClose} style={{marginTop:18,padding:"12px 34px",background:"white",color:"#0f172a",border:"none",borderRadius:10,fontWeight:700,fontSize:15,cursor:"pointer"}}>Cancelar</button>
  </div>);
}

// ─────────────────────────────────────────
// PERSISTENCIA: SUPABASE (nube) + localStorage (caché local)
// ─────────────────────────────────────────
const STORAGE_KEY = "tomfic_data_v1";
const CONFIG_KEY  = "tomfic_config_v1";

// --- Serialización ---
const capsDeConteo=(cid)=>{const o={};Object.entries(G.capturas).forEach(([k,v])=>{if(v.conteoId===cid)o[k]=v;});return o;};
const serConteo=(c,invId)=>({
  id:c.id, inventario_id:invId||(G.inventario?G.inventario.id:"")||"",
  nombre:c.nombre||"", obs:c.obs||"", tipo:c.tipo||"",
  usuario_c1:c.usuarioC1||"", usuario_c2:c.usuarioC2||"", usuario_c3:c.usuarioC3||"",
  estado:c.estado||"", loc_label:c.locLabel||"", localizacion_id:c.locId||"",
  ubicacion:c.ubicacion||"", localizacion_tipo:c.localizacion||"", nro:c.nro||"",
  fecha_creacion:c.fechaCreacion||TODAY(),
  rondas_cerradas:JSON.stringify(c.rondasCerradas||[]),
  capturas_data:JSON.stringify(capsDeConteo(c.id)),
});
const deserConteo=(r)=>{
  const c={id:r.id,nombre:r.nombre,obs:r.obs,tipo:r.tipo,usuarioC1:r.usuario_c1,usuarioC2:r.usuario_c2,usuarioC3:r.usuario_c3,estado:r.estado,locLabel:r.loc_label,locId:r.localizacion_id,ubicacion:r.ubicacion,localizacion:r.localizacion_tipo,nro:r.nro,fechaCreacion:r.fecha_creacion,rondasCerradas:r.rondas_cerradas?JSON.parse(r.rondas_cerradas):[]};
  let caps={};try{caps=r.capturas_data?JSON.parse(r.capturas_data):{};}catch(e){}
  return {c,caps};
};
const serInv=(inv,estado)=>({
  id:inv.id,nombre:inv.nombre||"",fecha:inv.fecha||"",estado,tipo:inv.tipo||"",obs:inv.obs||"",
  apertura:inv.apertura||"",hora_apertura:inv.horaApertura||"",usuario_apertura:inv.usuarioApertura||"",
  cierre:inv.cierre||"",hora_cierre:inv.horaCierre||"",usuario_cierre:inv.usuarioCierre||"",
  conteos_snapshot:inv.conteos?JSON.stringify(inv.conteos):null,
  capturas_snapshot:inv.capturas?JSON.stringify(inv.capturas):null,
  productos_snapshot:inv.productos?JSON.stringify(inv.productos):null,
});
const prodCols=(p)=>({id:p.id,ean:p.ean||"",codigo:p.codigo||"",nombre:p.nombre||"",referencia:p.referencia||"",categoria:p.categoria||"",subcategoria:p.subcategoria||"",subgrupo:p.subgrupo||"",determinada:p.determinada||"",localizacion:p.localizacion||"",ubicacion:p.ubicacion||"",observacion:p.observacion||"",saldo:p.saldo||0,costo:p.costo||0,nit:p.nit||"",proveedor:p.proveedor||""});
const userCols=(u)=>({id:u.id,nombre:u.nombre,pass:u.pass,rol:u.rol,activo:u.activo,creado:u.creado||TODAY(),correo:u.correo||"",telefono:u.telefono||"",cargo:u.cargo||"",turno:u.turno||"",zona:u.zona||"",obs:u.obs||""});

// --- Operaciones Supabase ---
const SB={
  async loadAll(){
    const [u,p,inv,c]=await Promise.all([
      supabase.from("usuarios").select("*"),
      supabase.from("productos").select("*"),
      supabase.from("inventarios").select("*"),
      supabase.from("conteos").select("*"),
    ]);
    return {usuarios:u.data||[],productos:p.data||[],inventarios:inv.data||[],conteos:c.data||[]};
  },
  upsertUsuario:(u)=>supabase.from("usuarios").upsert(u,{onConflict:"id"}),
  deleteUsuario:(id)=>supabase.from("usuarios").delete().eq("id",id),
  async upsertProductosBulk(prods){for(let i=0;i<prods.length;i+=500){await supabase.from("productos").upsert(prods.slice(i,i+500),{onConflict:"id"});}},
  deleteAllProductos:()=>supabase.from("productos").delete().neq("id","__none__"),
  upsertInventario:(inv)=>supabase.from("inventarios").upsert(inv,{onConflict:"id"}),
  upsertConteo:(c)=>supabase.from("conteos").upsert(c,{onConflict:"id"}),
  deleteConteo:(id)=>supabase.from("conteos").delete().eq("id",id),
  deleteInventario:(id)=>supabase.from("inventarios").delete().eq("id",id),
};

// --- Config local (localizaciones, tipos, alertas) ---
const saveLocalConfig=()=>{try{localStorage.setItem(CONFIG_KEY,JSON.stringify({localizaciones:G.localizaciones,ubicacionesTipos:G.ubicacionesTipos,localizacionTipos:G.localizacionTipos,alertas:G.alertas}));}catch(e){}};
const loadLocalConfig=()=>{try{const raw=localStorage.getItem(CONFIG_KEY);if(!raw)return;const d=JSON.parse(raw);if(d.localizaciones)G.localizaciones=d.localizaciones;if(d.ubicacionesTipos&&d.ubicacionesTipos.length)G.ubicacionesTipos=d.ubicacionesTipos;if(d.localizacionTipos&&d.localizacionTipos.length)G.localizacionTipos=d.localizacionTipos;if(d.alertas)G.alertas=d.alertas;}catch(e){}};
const saveLocalCache=()=>{try{localStorage.setItem(STORAGE_KEY,JSON.stringify({productos:G.productos,usuarios:G.usuarios,inventario:G.inventario,conteos:G.conteos,capturas:G.capturas,historial:G.historial,savedAt:new Date().toISOString()}));}catch(e){}};

// --- Snapshot para sincronización por diferencias ---
let _snap={u:{},c:{},inv:"",hist:{},prods:""};
const initSnap=()=>{
  _snap={u:{},c:{},inv:"",hist:{},prods:""};
  G.usuarios.forEach(u=>{_snap.u[u.id]=JSON.stringify(userCols(u));});
  _snap.prods=JSON.stringify(G.productos.map(prodCols));
  _snap.inv=G.inventario?JSON.stringify(serInv(G.inventario,"abierto")):"";
  G.historial.forEach(h=>{_snap.hist[h.id]=JSON.stringify(serInv(h,"cerrado"));});
  G.conteos.forEach(c=>{_snap.c[c.id]=JSON.stringify(serConteo(c));});
};

let _syncing=false,_pending=false,_syncTimer=null;
let _busy=false; // true mientras se hace una operación crítica (importar base, eliminar, cerrar). Pausa el auto-refresco.
const doSync=async()=>{
  if(_syncing){_pending=true;return;}
  _syncing=true;
  try{
    const curU={};G.usuarios.forEach(u=>{curU[u.id]=userCols(u);});
    for(const id in curU){const s=JSON.stringify(curU[id]);if(_snap.u[id]!==s){await SB.upsertUsuario(curU[id]);_snap.u[id]=s;}}
    for(const id in _snap.u){if(!curU[id]){await SB.deleteUsuario(id);delete _snap.u[id];}}
    const ps=JSON.stringify(G.productos.map(prodCols));
    if(ps!==_snap.prods){await SB.deleteAllProductos();if(G.productos.length)await SB.upsertProductosBulk(G.productos.map(prodCols));_snap.prods=ps;}
    const invObj=G.inventario?serInv(G.inventario,"abierto"):null;
    const invS=invObj?JSON.stringify(invObj):"";
    if(invS!==_snap.inv){if(invObj)await SB.upsertInventario(invObj);_snap.inv=invS;}
    const curH={};G.historial.forEach(h=>{curH[h.id]=serInv(h,"cerrado");});
    for(const id in curH){const s=JSON.stringify(curH[id]);if(_snap.hist[id]!==s){await SB.upsertInventario(curH[id]);_snap.hist[id]=s;}}
    for(const id in _snap.hist){if(!curH[id]){await SB.deleteInventario(id);delete _snap.hist[id];}}
    const curC={};G.conteos.forEach(c=>{curC[c.id]=serConteo(c);});
    for(const id in curC){const s=JSON.stringify(curC[id]);if(_snap.c[id]!==s){await SB.upsertConteo(curC[id]);_snap.c[id]=s;}}
    for(const id in _snap.c){if(!curC[id]){await SB.deleteConteo(id);delete _snap.c[id];}}
  }catch(e){console.warn("Error de sincronización:",e);}
  _syncing=false;
  if(_pending){_pending=false;doSync();}
};
const scheduleSync=()=>{if(_syncTimer)clearTimeout(_syncTimer);_syncTimer=setTimeout(doSync,400);};
if(typeof window!=="undefined"){window.addEventListener("beforeunload",()=>{try{doSync();}catch(e){}});}

const loadFromSupabase=async()=>{
  loadLocalConfig();
  const {usuarios,productos,inventarios,conteos}=await SB.loadAll();
  if(usuarios.length===0){const demos=G.usuarios;for(const u of demos)await SB.upsertUsuario(userCols(u));G.usuarios=demos;}
  else G.usuarios=usuarios;
  G.productos=productos||[];
  const active=inventarios.find(i=>i.estado==="abierto");
  if(active){
    G.inventario={id:active.id,nombre:active.nombre,tipo:active.tipo,obs:active.obs,fecha:active.fecha,apertura:active.apertura,horaApertura:active.hora_apertura,usuarioApertura:active.usuario_apertura};
    G.conteos=[];G.capturas={};
    conteos.filter(r=>r.inventario_id===active.id).forEach(r=>{const{c,caps}=deserConteo(r);G.conteos.push(c);Object.assign(G.capturas,caps);});
  } else {G.inventario=null;G.conteos=[];G.capturas={};}
  G.historial=inventarios.filter(i=>i.estado==="cerrado").map(i=>{
    const cs=i.conteos_snapshot?JSON.parse(i.conteos_snapshot):[];
    const ca=i.capturas_snapshot?JSON.parse(i.capturas_snapshot):{};
    const pr=i.productos_snapshot?JSON.parse(i.productos_snapshot):[];
    return {id:i.id,nombre:i.nombre,tipo:i.tipo,obs:i.obs,fecha:i.fecha,apertura:i.apertura,horaApertura:i.hora_apertura,usuarioApertura:i.usuario_apertura,cierre:i.cierre,horaCierre:i.hora_cierre,usuarioCierre:i.usuario_cierre,conteos:cs,capturas:ca,productos:pr,totalProductos:pr.length,totalCapturas:Object.keys(ca).length};
  }).sort((a,b)=>(b.cierre||"").localeCompare(a.cierre||""));
  initSnap();
};

// ─────────────────────────────────────────
// APP
// ─────────────────────────────────────────
export default function TomficApp(){
  const [usuario,setUsuario]=useState(null);
  const [loginForm,setLoginForm]=useState({user:"",pass:""});
  const [loginErr,setLoginErr]=useState("");
  const [,tick]=useState(0);
  const [lastSaved,setLastSaved]=useState(null);
  const [loading,setLoading]=useState(true);
  const [loadErr,setLoadErr]=useState("");

  useEffect(()=>{(async()=>{try{await loadFromSupabase();}catch(e){console.error(e);setLoadErr("Error de conexión con la nube");}setLoading(false);})();},[]);

  // CSS responsive global para celular (se inyecta una sola vez)
  useEffect(()=>{
    if(document.getElementById("tomfic-responsive"))return;
    const st=document.createElement("style");
    st.id="tomfic-responsive";
    st.textContent=`
      * { box-sizing: border-box; }
      html, body { max-width: 100%; overflow-x: hidden; }
      /* Todas las tablas: scroll horizontal si no caben */
      table { max-width: 100%; }
      @media (max-width: 768px) {
        /* Las tablas pueden desbordar -> su contenedor hace scroll */
        table { display: block; overflow-x: auto; white-space: nowrap; -webkit-overflow-scrolling: touch; }
        /* Reducir tamaños generales en celular */
        h1 { font-size: 26px !important; }
        h2 { font-size: 17px !important; }
        h3 { font-size: 15px !important; }
        /* Evitar que cualquier bloque se salga del ancho */
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
  const recargar=async()=>{if(_busy||_syncing)return;try{await loadFromSupabase();}catch(e){}tick(n=>n+1);};

  const toastRef=useRef(null);
  const [toast,setToast]=useState(null);
  const showToast=(msg,type="ok")=>{
    setToast({msg,type});
    if(toastRef.current)clearTimeout(toastRef.current);
    toastRef.current=setTimeout(()=>setToast(null),3500);
  };

  const limpiarDatos=()=>{
    localStorage.removeItem(STORAGE_KEY);
    window.location.reload();
  };

  const login=()=>{
    const u=loginForm.user.toUpperCase().trim();
    const found=G.usuarios.find(x=>x.nombre===u&&x.pass===loginForm.pass&&x.activo);
    if(found){setUsuario(found);setLoginErr("");}
    else setLoginErr("Usuario o contraseña incorrectos");
  };

  if(loading)return(<div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"#0f172a",fontFamily:"system-ui,sans-serif"}}><div style={{textAlign:"center",color:"white"}}><div style={{fontSize:52,marginBottom:16}}>📦</div><div style={{fontSize:24,fontWeight:900,marginBottom:8}}>TOMFIC</div><div style={{fontSize:14,color:"#64748b"}}>{loadErr||"Cargando datos de la nube..."}</div><div style={{marginTop:20,width:200,height:4,background:"#1e293b",borderRadius:99,overflow:"hidden",margin:"20px auto 0"}}><div style={{width:"60%",height:"100%",background:"linear-gradient(90deg,#2563eb,#16a34a)",borderRadius:99}}/></div></div></div>);

  if(!usuario) return <Login lf={loginForm} setLf={setLoginForm} err={loginErr} onLogin={login} lastSaved={lastSaved}/>;
  const p={usuario,setUsuario,G,rerender,recargar,showToast,lastSaved,limpiarDatos};
  return(
    <>
      {toast&&<div style={{position:"fixed",top:58,right:20,background:toast.type==="err"?"#dc2626":toast.type==="warn"?"#d97706":"#16a34a",color:"white",padding:"10px 20px",borderRadius:10,zIndex:9999,fontSize:14,fontWeight:700,boxShadow:"0 4px 20px rgba(0,0,0,0.2)",pointerEvents:"none",maxWidth:360}}>{toast.msg}</div>}
      {usuario.rol==="capturador"?<ModCapturador {...p}/>:usuario.rol==="gerente"?<ModGerente {...p}/>:<ModAdmin {...p}/>}
    </>
  );
}

// ─────────────────────────────────────────
// LOGIN
// ─────────────────────────────────────────
function Login({lf,setLf,err,onLogin,lastSaved}){
  const [showPass,setShowPass]=useState(false);
  const [showRecuperar,setShowRecuperar]=useState(false);
  return(
    <div style={{minHeight:"100vh",display:"flex",fontFamily:"system-ui,sans-serif",background:"#0f172a"}}>
      {/* Panel izquierdo — branding */}
      <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"3rem",background:"linear-gradient(145deg,#0f172a 0%,#1e3a5f 50%,#0f2d4a 100%)",position:"relative",overflow:"hidden",minWidth:0}}>
        {/* Círculos decorativos */}
        <div style={{position:"absolute",top:-80,left:-80,width:320,height:320,borderRadius:"50%",background:"rgba(37,99,235,0.08)",pointerEvents:"none"}}/>
        <div style={{position:"absolute",bottom:-60,right:-60,width:240,height:240,borderRadius:"50%",background:"rgba(16,163,74,0.07)",pointerEvents:"none"}}/>
        <div style={{position:"absolute",top:"40%",right:-40,width:180,height:180,borderRadius:"50%",background:"rgba(37,99,235,0.05)",pointerEvents:"none"}}/>

        {/* Logo grande */}
        <div style={{marginBottom:32,textAlign:"center"}}>
          <svg width="100" height="100" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="100" height="100" rx="22" fill="url(#grad1)"/>
            <defs>
              <linearGradient id="grad1" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#1e40af"/>
                <stop offset="100%" stopColor="#0891b2"/>
              </linearGradient>
            </defs>
            {/* Caja de inventario */}
            <rect x="20" y="38" width="60" height="42" rx="4" fill="white" fillOpacity="0.15" stroke="white" strokeWidth="2.5"/>
            <path d="M20 46 L50 54 L80 46" stroke="white" strokeWidth="2.5" fill="none"/>
            <path d="M50 54 L50 80" stroke="white" strokeWidth="2.5"/>
            {/* Tapa */}
            <path d="M24 38 L50 28 L76 38" stroke="white" strokeWidth="2.5" fill="none" strokeLinejoin="round"/>
            {/* Check */}
            <circle cx="72" cy="28" r="14" fill="#10b981"/>
            <path d="M65 28 L70 33 L79 23" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>

        <h1 style={{fontSize:42,fontWeight:900,color:"white",margin:"0 0 8px",letterSpacing:-1,textAlign:"center"}}>TOMFIC</h1>
        <div style={{fontSize:16,color:"#93c5fd",fontWeight:600,marginBottom:8,textAlign:"center",letterSpacing:0.5}}>Tomas Físicas</div>
        <div style={{fontSize:13,color:"#64748b",textAlign:"center",maxWidth:280,lineHeight:1.6}}>Control de Inventarios Físicos</div>

        {/* Features */}
        <div style={{marginTop:40,display:"flex",flexDirection:"column",gap:12,width:"100%",maxWidth:300}}>
          {[
            {icon:"📦","txt":"Gestión de conteos por ubicación"},
            {icon:"👥","txt":"Múltiples capturadores simultáneos"},
            {icon:"📊","txt":"Reportes y diferencias en tiempo real"},
            {icon:"🔒","txt":"Historial permanente de inventarios"},
          ].map((f,i)=>(
            <div key={i} style={{display:"flex",alignItems:"center",gap:12,background:"rgba(255,255,255,0.05)",borderRadius:10,padding:"10px 14px",border:"1px solid rgba(255,255,255,0.08)"}}>
              <span style={{fontSize:18}}>{f.icon}</span>
              <span style={{fontSize:13,color:"#cbd5e1"}}>{f.txt}</span>
            </div>
          ))}
        </div>

        <div style={{position:"absolute",bottom:20,fontSize:11,color:"#334155",textAlign:"center"}}>
          © 2026 TOMFIC · Sistema de Inventarios
        </div>
      </div>

      {/* Panel derecho — formulario */}
      <div style={{width:420,display:"flex",alignItems:"center",justifyContent:"center",padding:"2rem",background:"#f8fafc",flexShrink:0}}>
        <div style={{width:"100%",maxWidth:360}}>
          {/* Logo pequeño móvil */}
          <div style={{textAlign:"center",marginBottom:32}}>
            <div style={{display:"inline-flex",alignItems:"center",gap:10,marginBottom:8}}>
              <svg width="36" height="36" viewBox="0 0 100 100" fill="none">
                <rect width="100" height="100" rx="22" fill="url(#grad2)"/>
                <defs><linearGradient id="grad2" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse"><stop offset="0%" stopColor="#1e40af"/><stop offset="100%" stopColor="#0891b2"/></linearGradient></defs>
                <rect x="20" y="38" width="60" height="42" rx="4" fill="white" fillOpacity="0.15" stroke="white" strokeWidth="2.5"/>
                <path d="M20 46 L50 54 L80 46" stroke="white" strokeWidth="2.5" fill="none"/>
                <path d="M50 54 L50 80" stroke="white" strokeWidth="2.5"/>
                <path d="M24 38 L50 28 L76 38" stroke="white" strokeWidth="2.5" fill="none" strokeLinejoin="round"/>
                <circle cx="72" cy="28" r="14" fill="#10b981"/>
                <path d="M65 28 L70 33 L79 23" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span style={{fontSize:24,fontWeight:900,color:"#0f172a"}}>TOMFIC</span>
            </div>
            <div style={{fontSize:13,color:"#64748b"}}>Bienvenido · Inicia sesión para continuar</div>
          </div>

          {/* Form */}
          <div style={{background:"white",borderRadius:16,padding:"28px 28px",boxShadow:"0 4px 24px rgba(0,0,0,0.08)",border:"1px solid #e2e8f0"}}>
            <div style={{marginBottom:16,background:"#eff6ff",border:"1px solid #bfdbfe",borderRadius:10,padding:"10px 14px",fontSize:12,color:"#1e40af",display:"flex",alignItems:"center",gap:8}}>
              <span style={{fontSize:16}}>☁️</span>
              <div>
                <b>Conectado a la nube</b><br/>
                <span style={{fontSize:11,color:"#64748b"}}>Datos sincronizados en tiempo real</span>
              </div>
            </div>
            <div style={{marginBottom:20}}>
              <Lbl>Usuario</Lbl>
              <Inp value={lf.user} onChange={e=>setLf(p=>({...p,user:e.target.value}))}
                placeholder="Ingresa tu usuario" onKeyDown={e=>e.key==="Enter"&&onLogin()}
                style={{fontSize:15}}/>
            </div>
            <div style={{marginBottom:20}}>
              <Lbl>Contraseña</Lbl>
              <div style={{position:"relative"}}>
                <input type={showPass?"text":"password"} value={lf.pass}
                  onChange={e=>setLf(p=>({...p,pass:e.target.value}))}
                  onKeyDown={e=>e.key==="Enter"&&onLogin()}
                  placeholder="••••••••"
                  style={{...inp,paddingRight:44,fontSize:15}}/>
                <button onClick={()=>setShowPass(v=>!v)}
                  style={{position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",background:"transparent",border:"none",cursor:"pointer",fontSize:18,color:"#94a3b8",lineHeight:1}}>
                  {showPass?"🙈":"👁"}
                </button>
              </div>
            </div>

            {err&&(
              <div style={{background:"#fef2f2",color:"#dc2626",padding:"10px 14px",borderRadius:8,marginBottom:16,fontSize:13,fontWeight:600,display:"flex",alignItems:"center",gap:8}}>
                ⚠️ {err}
              </div>
            )}

            <button onClick={onLogin}
              style={{width:"100%",padding:"13px",background:"linear-gradient(135deg,#1e40af,#2563eb)",color:"white",border:"none",borderRadius:10,fontSize:16,fontWeight:700,cursor:"pointer",boxShadow:"0 4px 14px rgba(37,99,235,0.35)",transition:"opacity 0.15s"}}
              onMouseEnter={e=>e.currentTarget.style.opacity="0.92"}
              onMouseLeave={e=>e.currentTarget.style.opacity="1"}>
              Ingresar al sistema →
            </button>

            <div style={{textAlign:"center",marginTop:16}}>
              <button onClick={()=>setShowRecuperar(v=>!v)}
                style={{background:"transparent",border:"none",color:"#2563eb",fontSize:13,cursor:"pointer",textDecoration:"underline"}}>
                ¿Olvidaste tu contraseña?
              </button>
            </div>
            {showRecuperar&&(
              <div style={{marginTop:12,background:"#eff6ff",border:"1px solid #bfdbfe",borderRadius:10,padding:14,fontSize:13,color:"#1e40af",lineHeight:1.6}}>
                <b>Para recuperar tu acceso:</b><br/>
                Contacta al administrador del sistema.<br/>
                <span style={{fontSize:12,color:"#64748b",marginTop:4,display:"block"}}>En la próxima versión podrás recuperarla por correo.</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────
// ADMIN
// ─────────────────────────────────────────
function ModAdmin({usuario,setUsuario,G,rerender,recargar,showToast,lastSaved,limpiarDatos}){
  const [view,setView]=useState("inventario");
  const [modalSalir,setModalSalir]=useState(false);
  const [sideCollapsed,setSideCollapsed]=useState(false);
  const alertas=G.alertas.filter(a=>!a.leida).length;
  const nav=[
    {id:"inventario",icon:"📋",label:"Inventario",desc:"Gestión activa"},
    {id:"basedatos",icon:"🗄️",label:"Base de datos",desc:"Productos"},
    {id:"ubicaciones",icon:"📍",label:"Ubicaciones",desc:"Localizaciones"},
    {id:"conteos",icon:"🗂️",label:"Conteos",desc:"Rondas"},
    {id:"procesos",icon:"📡",label:"Procesos",desc:"Avance"},
    {id:"reportes",icon:"📊",label:"Reportes",desc:"Análisis"},
    {id:"usuarios",icon:"👥",label:"Usuarios",desc:"Accesos"},
    {id:"historial",icon:"🏛️",label:"Historial",desc:"Inventarios"},
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
            {sideCollapsed?"→":"☰"}
          </button>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <div style={{width:32,height:32,background:"linear-gradient(135deg,#2563eb,#0891b2)",borderRadius:9,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16}}>📦</div>
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
            🔄 <span>Sync</span>
          </button>
          {alertas>0&&(
            <button onClick={()=>{G.alertas=G.alertas.map(a=>({...a,leida:true}));rerender();setView("procesos");}}
              style={{background:"#dc2626",color:"white",border:"none",padding:"5px 14px",borderRadius:8,cursor:"pointer",fontSize:12,fontWeight:700,display:"flex",alignItems:"center",gap:5,animation:"pulse 2s infinite"}}>
              🔔 {alertas}
            </button>
          )}
          {lastSaved&&<span style={{fontSize:10,color:"#475569",display:"flex",alignItems:"center",gap:4}}>☁️ {lastSaved}</span>}
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

      <div style={{display:"flex",minHeight:"calc(100vh - 58px)"}}>

        {/* SIDEBAR */}
        <div style={{width:sideCollapsed?64:210,background:"linear-gradient(180deg,#1e293b 0%,#0f172a 100%)",flexShrink:0,position:"sticky",top:58,height:"calc(100vh - 58px)",overflowY:"auto",overflowX:"hidden",transition:"width 0.25s ease",boxShadow:"2px 0 12px rgba(0,0,0,0.2)"}}>
          <div style={{padding:sideCollapsed?"12px 8px":"16px 10px",display:"flex",flexDirection:"column",gap:3}}>
            {nav.map(n=>{
              const active=view===n.id;
              return(
                <button key={n.id} onClick={()=>setView(n.id)}
                  title={sideCollapsed?n.label:""}
                  style={{width:"100%",display:"flex",alignItems:"center",gap:10,padding:sideCollapsed?"10px":"10px 12px",background:active?"linear-gradient(135deg,#2563eb,#1d4ed8)":"transparent",color:active?"white":"#64748b",border:"none",cursor:"pointer",fontSize:13,textAlign:"left",borderRadius:10,transition:"all 0.15s",position:"relative",overflow:"hidden"}}>
                  {active&&<div style={{position:"absolute",left:0,top:"20%",bottom:"20%",width:3,background:"#60a5fa",borderRadius:"0 3px 3px 0"}}/>}
                  <span style={{fontSize:18,flexShrink:0,filter:active?"none":"grayscale(0.3)"}}>{n.icon}</span>
                  {!sideCollapsed&&(
                    <div style={{overflow:"hidden"}}>
                      <div style={{fontWeight:active?700:500,fontSize:13,whiteSpace:"nowrap",color:active?"white":"#94a3b8"}}>{n.label}</div>
                      <div style={{fontSize:10,color:active?"#bfdbfe":"#475569",marginTop:1,whiteSpace:"nowrap"}}>{n.desc}</div>
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
              <div style={{fontSize:11,color:"#475569"}}>v2.1 · {G.productos.length} productos</div>
            </div>
          )}
        </div>

        {/* CONTENIDO */}
        <div style={{flex:1,padding:24,overflowY:"auto",minWidth:0}}>

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
      {modalSalir&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.6)",zIndex:2000,display:"flex",alignItems:"center",justifyContent:"center",padding:16,backdropFilter:"blur(4px)"}}>
          <div style={{background:"white",borderRadius:20,padding:32,width:380,maxWidth:"96vw",boxShadow:"0 30px 80px rgba(0,0,0,0.35)"}}>
            <div style={{textAlign:"center",marginBottom:16}}>
              <div style={{fontSize:40,marginBottom:8}}>👋</div>
              <h3 style={{margin:"0 0 8px",fontSize:18,fontWeight:800,color:"#0f172a"}}>¿Cerrar sesión?</h3>
              <p style={{fontSize:14,color:"#64748b",lineHeight:1.6,margin:0}}>Vas a salir de TOMFIC. Tus datos ya están guardados en la nube.</p>
            </div>
            <div style={{display:"flex",gap:10,marginTop:24}}>
              <Btn c="#dc2626" onClick={()=>setUsuario(null)} full>Sí, salir</Btn>
              <Btn c="#64748b" onClick={()=>setModalSalir(false)} full outline>Cancelar</Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── INVENTARIO ──
function VInventario({G,rerender,showToast,usuario}){
  const [modal,setModal]=useState(false);
  const [modalEdit,setModalEdit]=useState(false);
  const [modalEliminar,setModalEliminar]=useState(false);
  const [modalCerrar,setModalCerrar]=useState(false);
  const [eliminando,setEliminando]=useState(false);
  const [form,setForm]=useState({nombre:"",tipo:"2conteos",obs:"",fecha:TODAY()});
  const [editForm,setEditForm]=useState({nombre:"",obs:""});

  // Determina qué conteos NO están completados (para bloquear el cierre)
  const estadoConteo=(c)=>{
    // ¿completo? un conteo está completo solo si su estado final es "completado"
    if(c.estado==="completado")return null; // ok, completo
    // Razón por la que no está completo:
    if(c.estado==="pendiente")return "sin iniciar";
    if(c.estado==="enCurso")return "C1 en curso";
    if(c.estado==="cerradoC1")return c.tipo==="2conteos"?"falta C2":null; // si es 1 conteo, cerradoC1 = completo
    if(c.estado==="cerradoC2")return null; // 2 conteos sin diferencia = completo
    if(c.estado==="diferencia")return "tiene diferencias, falta C3";
    if(c.estado==="enC3")return "C3 en curso";
    return "incompleto";
  };
  const conteosIncompletos=()=>G.conteos.map(c=>({c,razon:estadoConteo(c)})).filter(x=>x.razon!==null);
  const crear=()=>{
    if(!form.nombre.trim())return showToast("Ingresa un nombre","err");
    if(G.inventario)return showToast("Ya hay un inventario activo","err");
    G.inventario={id:ID(),nombre:form.nombre,tipo:form.tipo,obs:form.obs,fecha:form.fecha,apertura:TODAY(),horaApertura:HOUR(),usuarioApertura:usuario.nombre};
    G.conteos=[];G.capturas={};G.alertas=[];
    setModal(false);setForm({nombre:"",tipo:"2conteos",obs:"",fecha:TODAY()});
    rerender();showToast("Inventario creado. Ahora carga la base de productos ✓");
  };
  const guardarEdit=()=>{
    if(!editForm.nombre.trim())return showToast("El nombre no puede estar vacío","err");
    G.inventario={...G.inventario,nombre:editForm.nombre,obs:editForm.obs};
    setModalEdit(false);rerender();showToast("Inventario actualizado ✓");
  };
  const intentarCerrar=()=>{
    if(!G.inventario)return;
    if(G.conteos.length===0)return showToast("No hay conteos en este inventario","err");
    const incompletos=conteosIncompletos();
    if(incompletos.length>0){
      const nombres=incompletos.map(x=>`• ${x.c.nombre} (${x.razon})`).join("\n");
      showToast(`⚠️ Faltan ${incompletos.length} conteo(s) por completar. No se puede cerrar.`,"err");
      G.alertas=[{id:ID(),tipo:"cierre",msg:`No se cerró el inventario: faltan conteos por completar:\n${nombres}`,fecha:HOUR(),leida:false},...G.alertas];
      rerender();
      return;
    }
    setModalCerrar(true);
  };
  const cerrar=()=>{
    if(!G.inventario)return;
    setModalCerrar(false);
    _busy=true;
    const capsSnapshot=JSON.parse(JSON.stringify(G.capturas));
    const prodsSnapshot=JSON.parse(JSON.stringify(G.productos));
    const conteosSnapshot=JSON.parse(JSON.stringify(G.conteos));
    G.historial.unshift({
      ...G.inventario,cierre:TODAY(),horaCierre:HOUR(),usuarioCierre:usuario.nombre,
      conteos:conteosSnapshot,capturas:capsSnapshot,productos:prodsSnapshot,
      totalProductos:G.productos.length,totalCapturas:Object.keys(G.capturas).length,
    });
    G.productos=G.productos.map(p=>{
      const caps=Object.values(G.capturas).filter(c=>c.productoId===p.id);
      const sumC3=caps.filter(c=>c.ronda==="C3").reduce((s,c)=>s+c.cantidad,0);
      const sumC2=caps.filter(c=>c.ronda==="C2").reduce((s,c)=>s+c.cantidad,0);
      const sumC1=caps.filter(c=>c.ronda==="C1").reduce((s,c)=>s+c.cantidad,0);
      const final=sumC3||sumC2||sumC1;
      return final>0?{...p,saldo:final}:p;
    });
    G.inventario=null;G.conteos=[];G.capturas={};G.alertas=[];
    _busy=false;
    rerender();showToast("Inventario cerrado. Saldos actualizados ✓");
  };
  const eliminarInventario=async()=>{
    if(!G.inventario)return;
    setEliminando(true);_busy=true;
    const invId=G.inventario.id;
    try{
      // Borrar de la nube: conteos del inventario + el inventario
      for(const c of G.conteos){try{await SB.deleteConteo(c.id);}catch(e){}}
      try{await supabase.from("inventarios").delete().eq("id",invId);}catch(e){}
    }catch(e){console.warn("Error al eliminar de la nube:",e);}
    // Limpiar localmente y resetear el snapshot de sincronización
    G.inventario=null;G.conteos=[];G.capturas={};G.alertas=[];
    G.conteos.forEach(()=>{});
    initSnap();
    setEliminando(false);setModalEliminar(false);_busy=false;
    rerender();showToast("Inventario eliminado por completo ✓","warn");
  };
  const st=G.conteos.reduce((a,c)=>{if(c.estado==="completado"||c.estado==="cerradoC2")a.comp++;if(c.estado==="diferencia")a.dif++;return a;},{comp:0,dif:0});
  return(
    <Section>
      {!G.inventario?(
        <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"60px 20px",background:"white",borderRadius:20,boxShadow:"0 2px 8px rgba(0,0,0,0.06)",border:"2px dashed #e2e8f0",textAlign:"center"}}>
          <div style={{fontSize:64,marginBottom:16}}>📋</div>
          <div style={{fontSize:20,fontWeight:800,color:"#0f172a",marginBottom:8}}>Sin inventario activo</div>
          <div style={{fontSize:14,color:"#64748b",marginBottom:24,maxWidth:360}}>Crea un nuevo inventario para comenzar a registrar conteos de productos.</div>
          <Btn c="#16a34a" onClick={()=>setModal(true)}>+ Crear Inventario</Btn>
        </div>
      ):(
        <>
          {/* Banner principal del inventario */}
          <div style={{background:"linear-gradient(135deg,#0f172a 0%,#1e3a5f 100%)",borderRadius:18,padding:"24px 28px",marginBottom:16,color:"white",position:"relative",overflow:"hidden"}}>
            <div style={{position:"absolute",right:-20,top:-20,width:120,height:120,background:"rgba(255,255,255,0.04)",borderRadius:99}}/>
            <div style={{position:"absolute",right:40,bottom:-30,width:80,height:80,background:"rgba(255,255,255,0.03)",borderRadius:99}}/>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:12}}>
              <div>
                <div style={{fontSize:11,color:"#94a3b8",fontWeight:700,textTransform:"uppercase",letterSpacing:1,marginBottom:6}}>Inventario Activo</div>
                <div style={{fontSize:26,fontWeight:900,letterSpacing:-0.5,marginBottom:6}}>{G.inventario.nombre}</div>
                <div style={{fontSize:12,color:"#94a3b8"}}>Abierto el {G.inventario.apertura} {G.inventario.horaApertura&&`a las ${G.inventario.horaApertura}`} · por <span style={{color:"#60a5fa",fontWeight:700}}>{G.inventario.usuarioApertura}</span></div>
              </div>
              <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                <div style={{background:"rgba(22,163,74,0.2)",border:"1px solid rgba(22,163,74,0.4)",borderRadius:20,padding:"4px 14px",fontSize:12,fontWeight:700,color:"#4ade80",display:"flex",alignItems:"center",gap:5}}>
                  <span style={{width:7,height:7,background:"#4ade80",borderRadius:99,display:"inline-block"}}/>
                  ACTIVO
                </div>
                <div style={{background:"rgba(255,255,255,0.1)",border:"1px solid rgba(255,255,255,0.15)",borderRadius:20,padding:"4px 14px",fontSize:12,fontWeight:700,color:"white"}}>
                  {G.inventario.tipo==="2conteos"?"2 Conteos":"1 Conteo"}
                </div>
              </div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(110px,1fr))",gap:10,marginTop:20}}>
              {[
                {l:"Productos",v:G.productos.length,icon:"📦"},
                {l:"Conteos",v:G.conteos.length,icon:"📋"},
                {l:"Completados",v:st.comp,icon:"✅"},
                {l:"Diferencias",v:st.dif,icon:"⚠️"},
              ].map(s=>(
                <div key={s.l} style={{background:"rgba(255,255,255,0.07)",borderRadius:12,padding:"12px 14px",border:"1px solid rgba(255,255,255,0.08)"}}>
                  <div style={{fontSize:16,marginBottom:4}}>{s.icon}</div>
                  <div style={{fontSize:22,fontWeight:900,color:"white"}}>{s.v}</div>
                  <div style={{fontSize:10,color:"#94a3b8",marginTop:2,textTransform:"uppercase",letterSpacing:0.5}}>{s.l}</div>
                </div>
              ))}
            </div>
          </div>
          {/* Acciones */}
          <div style={{display:"flex",gap:10,marginBottom:16,flexWrap:"wrap"}}>
            <Btn c="#dc2626" onClick={intentarCerrar}>⬛ Cerrar Inventario</Btn>
            <Btn c="#2563eb" outline onClick={()=>{setEditForm({nombre:G.inventario.nombre,obs:G.inventario.obs||""});setModalEdit(true);}}>✏️ Editar</Btn>
            <Btn c="#dc2626" outline onClick={()=>setModalEliminar(true)}>🗑 Eliminar</Btn>
          </div>
          {G.inventario.obs&&<div style={{marginBottom:12,background:"#f8fafc",border:"1px solid #e2e8f0",borderRadius:10,padding:"10px 14px",fontSize:13,color:"#64748b"}}>📝 {G.inventario.obs}</div>}
          {G.productos.length===0&&<div style={{background:"#fef9c3",border:"1px solid #fde047",borderRadius:10,padding:"12px 16px",fontSize:13,color:"#92400e",fontWeight:600}}>⚠️ La base de productos está vacía. Ve a "Base de datos" y carga el Excel del cliente antes de programar conteos.</div>}
          {G.productos.length>0&&<div style={{background:"#f0fdf4",border:"1px solid #bbf7d0",borderRadius:10,padding:"12px 16px",fontSize:13,color:"#166534",fontWeight:600}}>✅ Base lista: {G.productos.length} productos disponibles. Puedes programar los conteos.</div>}
        </>
      )}
      {modal&&(
        <Modal titulo="Nuevo Inventario" onClose={()=>setModal(false)}>
          <Lbl>Nombre del inventario</Lbl>
          <Inp value={form.nombre} onChange={e=>setForm(p=>({...p,nombre:e.target.value}))} placeholder="Ej: Inventario General Junio 2025" style={{marginBottom:14}}/>
          <Lbl>Fecha</Lbl>
          <Inp value={form.fecha} onChange={e=>setForm(p=>({...p,fecha:e.target.value}))} style={{marginBottom:14}}/>
          <Lbl>Tipo de conteo</Lbl>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
            {[["1conteo","1 Conteo","Un solo pase"],["2conteos","2 Conteos","C1 + C2 + C3 si hay diferencia"]].map(([v,t,s])=>(
              <div key={v} onClick={()=>setForm(p=>({...p,tipo:v}))} style={{border:`2px solid ${form.tipo===v?"#2563eb":"#e2e8f0"}`,borderRadius:10,padding:12,cursor:"pointer",background:form.tipo===v?"#eff6ff":"white"}}>
                <div style={{fontWeight:700,color:form.tipo===v?"#2563eb":"#0f172a",fontSize:14}}>{t}</div>
                <div style={{fontSize:11,color:"#64748b",marginTop:2}}>{s}</div>
              </div>
            ))}
          </div>
          <Lbl>Observaciones</Lbl>
          <Inp value={form.obs} onChange={e=>setForm(p=>({...p,obs:e.target.value}))} placeholder="Opcional..." style={{marginBottom:20}}/>
          <Btn c="#16a34a" onClick={crear} full>✓ Crear Inventario</Btn>
        </Modal>
      )}
      {modalEdit&&(
        <Modal titulo="Editar Inventario" onClose={()=>setModalEdit(false)}>
          <Lbl>Nombre del inventario</Lbl>
          <Inp value={editForm.nombre} onChange={e=>setEditForm(p=>({...p,nombre:e.target.value}))} style={{marginBottom:14}}/>
          <Lbl>Observaciones</Lbl>
          <Inp value={editForm.obs} onChange={e=>setEditForm(p=>({...p,obs:e.target.value}))} placeholder="Opcional..." style={{marginBottom:20}}/>
          <Btn c="#2563eb" onClick={guardarEdit} full>✓ Guardar cambios</Btn>
        </Modal>
      )}
      {modalCerrar&&(
        <Modal titulo="⬛ Cerrar Inventario" onClose={()=>setModalCerrar(false)}>
          <div style={{background:"#f0fdf4",border:"1px solid #bbf7d0",borderRadius:10,padding:16,marginBottom:18,fontSize:14,color:"#166534",lineHeight:1.5}}>
            Todos los conteos están completos. ✅<br/><br/>
            Al cerrar, se guardará el inventario en el <b>historial</b>, se actualizarán los <b>saldos</b> con las cantidades contadas, y este inventario dejará de estar activo.
          </div>
          <div style={{display:"flex",gap:10}}>
            <Btn c="#dc2626" onClick={cerrar} full>Sí, cerrar inventario</Btn>
            <Btn c="#64748b" onClick={()=>setModalCerrar(false)} full outline>Cancelar</Btn>
          </div>
        </Modal>
      )}
      {modalEliminar&&(
        <Modal titulo="🗑 Eliminar Inventario" onClose={()=>!eliminando&&setModalEliminar(false)}>
          <div style={{background:"#fef2f2",border:"1px solid #fecaca",borderRadius:10,padding:16,marginBottom:18,fontSize:14,color:"#991b1b",lineHeight:1.5}}>
            Esto borrará <b>por completo</b> el inventario <b>{G.inventario?.nombre}</b> junto con <b>todos sus conteos y capturas</b>, en este dispositivo y en la nube.<br/><br/>
            Esta acción <b>no se puede deshacer</b>. Úsala solo si el inventario quedó mal creado.
          </div>
          <div style={{display:"flex",gap:10}}>
            <Btn c="#dc2626" onClick={eliminarInventario} full disabled={eliminando}>{eliminando?"Eliminando...":"Sí, eliminar todo"}</Btn>
            <Btn c="#64748b" onClick={()=>setModalEliminar(false)} full disabled={eliminando}>Cancelar</Btn>
          </div>
        </Modal>
      )}
    </Section>
  );
}

// ── UBICACIONES (3 niveles) ──
function VUbicaciones({G,rerender,showToast}){
  const [form,setForm]=useState({ubicacion:"",localizacion:"",nro:"",observacion:""});
  const [newUbicTipo,setNewUbicTipo]=useState("");
  const [newLocTipo,setNewLocTipo]=useState("");
  const [editLoc,setEditLoc]=useState(null); // localización en edición
  const [editForm,setEditFormLoc]=useState({nro:"",observacion:""});

  const siguienteNro=()=>{
    if(!form.ubicacion||!form.localizacion)return "";
    const existentes=G.localizaciones.filter(l=>l.ubicacion===form.ubicacion&&l.localizacion===form.localizacion);
    return `${form.localizacion} ${existentes.length+1}`;
  };

  const agregar=()=>{
    if(!form.ubicacion||!form.localizacion)return showToast("Selecciona ubicación y localización","err");
    const nro=form.nro||siguienteNro();
    const existe=G.localizaciones.find(l=>l.ubicacion===form.ubicacion&&l.localizacion===form.localizacion&&l.nro===nro);
    if(existe)return showToast("Ya existe esa localización","err");
    G.localizaciones.push({id:ID(),ubicacion:form.ubicacion,localizacion:form.localizacion,nro,observacion:form.observacion});
    setForm(p=>({...p,nro:"",observacion:""}));
    rerender();showToast("Localización agregada ✓");
  };

  const eliminar=(id)=>{
    G.localizaciones=G.localizaciones.filter(l=>l.id!==id);
    rerender();showToast("Eliminada ✓","warn");
  };

  const agregarUbicTipo=()=>{
    const n=newUbicTipo.trim().toUpperCase();
    if(!n||G.ubicacionesTipos.includes(n))return;
    G.ubicacionesTipos.push(n);setNewUbicTipo("");rerender();showToast("Tipo de ubicación creado ✓");
  };

  const agregarLocTipo=()=>{
    const n=newLocTipo.trim().toUpperCase();
    if(!n||G.localizacionTipos.includes(n))return;
    G.localizacionTipos.push(n);setNewLocTipo("");rerender();showToast("Tipo de localización creado ✓");
  };

  const imprimirEtiqueta=(l)=>{
    const html=`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Etiqueta ${l.nro}</title>
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap');
      *{margin:0;padding:0;box-sizing:border-box;}
      body{font-family:Inter,Arial,sans-serif;background:white;padding:30px;}
      .header{display:flex;align-items:center;gap:16px;border-bottom:3px solid #1e40af;padding-bottom:16px;margin-bottom:24px;}
      .logo{width:56px;height:56px;background:linear-gradient(135deg,#1e40af,#0891b2);border-radius:12px;display:flex;align-items:center;justify-content:center;}
      .logo svg{width:36px;height:36px;}
      .brand h1{font-size:28px;font-weight:900;color:#0f172a;letter-spacing:-1px;}
      .brand p{font-size:13px;color:#64748b;margin-top:2px;}
      .ubicacion-box{background:#eff6ff;border:2px solid #2563eb;border-radius:14px;padding:24px;margin-bottom:24px;text-align:center;}
      .ubi-label{font-size:12px;font-weight:700;color:#2563eb;text-transform:uppercase;letter-spacing:2px;margin-bottom:8px;}
      .ubi-name{font-size:36px;font-weight:900;color:#0f172a;letter-spacing:-1px;}
      .ubi-path{font-size:16px;color:#64748b;margin-top:6px;}
      .obs{background:#f8fafc;border-radius:10px;padding:12px 18px;margin-bottom:24px;font-size:15px;color:#374151;text-align:center;}
      .obs span{font-weight:700;color:#0f172a;}
      table{width:100%;border-collapse:collapse;font-size:14px;}
      th{background:#0f172a;color:white;padding:12px 16px;text-align:center;font-weight:700;font-size:13px;}
      td{padding:16px;border:2px solid #e2e8f0;text-align:center;vertical-align:top;}
      td.label{font-weight:700;color:#374151;background:#f8fafc;text-align:left;width:120px;}
      .footer{margin-top:24px;text-align:center;font-size:11px;color:#94a3b8;border-top:1px solid #e2e8f0;padding-top:12px;}
    </style></head>
    <body>
      <div class="header">
        <div class="logo">
          <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="20" y="38" width="60" height="42" rx="4" fill="white" fill-opacity="0.3" stroke="white" stroke-width="3"/>
            <path d="M20 46 L50 54 L80 46" stroke="white" stroke-width="3" fill="none"/>
            <path d="M50 54 L50 80" stroke="white" stroke-width="3"/>
            <path d="M24 38 L50 28 L76 38" stroke="white" stroke-width="3" fill="none"/>
            <circle cx="72" cy="28" r="14" fill="#10b981"/>
            <path d="M65 28 L70 33 L79 23" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
        <div class="brand">
          <h1>TOMFIC</h1>
          <p>Tomas Físicas · Control de Inventarios</p>
        </div>
      </div>
      <div class="ubicacion-box">
        <div class="ubi-label">Localización</div>
        <div class="ubi-name">${l.nro}</div>
        <div class="ubi-path">${l.ubicacion} › ${l.localizacion} › ${l.nro}</div>
      </div>
      ${l.observacion?`<div class="obs">📝 Observación: <span>${l.observacion}</span></div>`:""}
      <table>
        <thead>
          <tr>
            <th style="text-align:left;width:120px"></th>
            <th>Conteo 1</th>
            <th>Conteo 2</th>
          </tr>
        </thead>
        <tbody>
          <tr><td class="label">👤 Usuario</td><td></td><td></td></tr>
          <tr><td class="label">✍️ Firma</td><td style="height:50px"></td><td style="height:50px"></td></tr>
          <tr><td class="label">📅 Fecha</td><td></td><td></td></tr>
          <tr><td class="label">🕐 Hora inicio</td><td></td><td></td></tr>
          <tr><td class="label">🕐 Hora fin</td><td></td><td></td></tr>
        </tbody>
      </table>
      <div class="footer">Fecha impresión: ${TODAY()} · TOMFIC Sistema de Inventarios Físicos</div>
      <script>window.onload=()=>window.print();</script>
    </body></html>`;
    const w=window.open("","_blank");w.document.write(html);w.document.close();
  };

  return(
    <Section>
      {/* Header estilo procesos */}
      <div style={{background:"linear-gradient(135deg,#d97706 0%,#f59e0b 100%)",borderRadius:16,padding:"20px 24px",marginBottom:20,color:"white",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div>
          <div style={{fontSize:11,fontWeight:600,opacity:0.75,letterSpacing:1,textTransform:"uppercase",marginBottom:4}}>Localizaciones</div>
          <div style={{fontSize:22,fontWeight:800,letterSpacing:-0.5}}>Ubicaciones</div>
          <div style={{fontSize:12,opacity:0.8,marginTop:4}}>{G.ubicacionesTipos.join(" · ")||"Sin tipos registrados"}</div>
        </div>
        <div style={{textAlign:"right"}}>
          <div style={{fontSize:28,fontWeight:900,letterSpacing:-1}}>{G.localizaciones.length}</div>
          <div style={{fontSize:11,opacity:0.8}}>localizaciones</div>
        </div>
      </div>
      {/* Tipos */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:18}}>
        <div style={card}>
          <div style={{fontSize:13,fontWeight:700,marginBottom:10,color:"#374151"}}>Tipos de Ubicación</div>
          <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:10}}>
            {G.ubicacionesTipos.map(u=><Badge key={u} color="#2563eb">{u}</Badge>)}
            {G.ubicacionesTipos.length===0&&<span style={{fontSize:12,color:"#94a3b8"}}>Sin tipos — agrega uno</span>}
          </div>
          <div style={{display:"flex",gap:8}}>
            <Inp value={newUbicTipo} onChange={e=>setNewUbicTipo(e.target.value.toUpperCase())} placeholder="Ej: BODEGA, SALA DE VENTAS…" onKeyDown={e=>e.key==="Enter"&&agregarUbicTipo()} style={{flex:1}}/>
            <Btn c="#16a34a" small onClick={agregarUbicTipo}>+</Btn>
          </div>
        </div>
        <div style={card}>
          <div style={{fontSize:13,fontWeight:700,marginBottom:10,color:"#374151"}}>Tipos de Localización</div>
          <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:10}}>
            {G.localizacionTipos.map(l=><Badge key={l} color="#d97706">{l}</Badge>)}
            {G.localizacionTipos.length===0&&<span style={{fontSize:12,color:"#94a3b8"}}>Sin tipos — agrega uno</span>}
          </div>
          <div style={{display:"flex",gap:8}}>
            <Inp value={newLocTipo} onChange={e=>setNewLocTipo(e.target.value.toUpperCase())} placeholder="Ej: MUEBLE, NEVERA, LINEAL…" onKeyDown={e=>e.key==="Enter"&&agregarLocTipo()} style={{flex:1}}/>
            <Btn c="#16a34a" small onClick={agregarLocTipo}>+</Btn>
          </div>
        </div>
      </div>

      {/* Agregar */}
      <div style={{...card,marginBottom:18}}>
        <div style={{fontSize:13,fontWeight:700,marginBottom:12,color:"#374151"}}>Agregar nueva localización</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr auto",gap:10,alignItems:"end"}}>
          <div>
            <Lbl>Ubicación</Lbl>
            <Sel value={form.ubicacion} onChange={e=>setForm(p=>({...p,ubicacion:e.target.value,nro:""}))}>
              <option value="">Seleccionar…</option>
              {G.ubicacionesTipos.map(u=><option key={u}>{u}</option>)}
            </Sel>
          </div>
          <div>
            <Lbl>Localización</Lbl>
            <Sel value={form.localizacion} onChange={e=>setForm(p=>({...p,localizacion:e.target.value,nro:""}))}>
              <option value="">Seleccionar…</option>
              {G.localizacionTipos.map(l=><option key={l}>{l}</option>)}
            </Sel>
          </div>
          <div>
            <Lbl>N° (auto: {siguienteNro()||"—"})</Lbl>
            <Inp value={form.nro} onChange={e=>setForm(p=>({...p,nro:e.target.value.toUpperCase()}))} placeholder={siguienteNro()||"Auto"}/>
          </div>
          <div>
            <Lbl>Observación</Lbl>
            <Inp value={form.observacion} onChange={e=>setForm(p=>({...p,observacion:e.target.value}))} placeholder="Ej: DETERGENTES"/>
          </div>
          <div>
            <Btn c="#16a34a" onClick={agregar}>+ Agregar</Btn>
          </div>
        </div>
      </div>

      {/* Tabla */}
      <div style={card}>
        <div style={{fontSize:13,fontWeight:700,marginBottom:12,color:"#374151"}}>
          Localizaciones registradas ({G.localizaciones.length})
          {G.localizaciones.length===0&&<span style={{fontSize:12,color:"#94a3b8",fontWeight:400,marginLeft:8}}>— Agrega ubicaciones usando el formulario de arriba</span>}
        </div>
        {G.localizaciones.length>0&&(
          <div style={{overflowX:"auto"}}>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
              <thead>
                <tr style={{background:"#0f172a",color:"white"}}>
                  {["Ubicación","Localización","N° Localización","Observación","Acciones"].map(h=><th key={h} style={{padding:"8px 12px",textAlign:"left",fontWeight:600,whiteSpace:"nowrap"}}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {G.localizaciones.map((l,i)=>(
                  <tr key={l.id} style={{background:i%2?"#f8fafc":"white",borderBottom:"1px solid #f1f5f9"}}>
                    <td style={{padding:"7px 12px",fontWeight:700,color:"#2563eb"}}>{l.ubicacion}</td>
                    <td style={{padding:"7px 12px",color:"#64748b"}}>{l.localizacion}</td>
                    <td style={{padding:"7px 12px",fontWeight:600}}>{l.nro}</td>
                    <td style={{padding:"7px 12px",color:"#64748b"}}>{l.observacion||"—"}</td>
                    <td style={{padding:"7px 12px"}}>
                      <div style={{display:"flex",gap:6}}>
                        <button onClick={()=>imprimirEtiqueta(l)}
                          style={{background:"#eff6ff",color:"#2563eb",border:"1px solid #bfdbfe",borderRadius:6,padding:"4px 10px",cursor:"pointer",fontWeight:700,fontSize:11}}>
                          🖨️ Etiqueta
                        </button>
                        <button onClick={()=>{setEditLoc(l);setEditFormLoc({nro:l.nro,observacion:l.observacion||"",ubicacion:l.ubicacion,localizacion:l.localizacion});}}
                          style={{background:"#fef9c3",color:"#92400e",border:"1px solid #fde047",borderRadius:6,padding:"4px 10px",cursor:"pointer",fontWeight:700,fontSize:11}}>
                          ✏️ Editar
                        </button>
                        <button onClick={()=>eliminar(l.id)}
                          style={{background:"transparent",border:"none",color:"#dc2626",cursor:"pointer",fontWeight:700,fontSize:15}}>✕</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal editar localización */}
      {editLoc&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center"}}>
          <div style={{background:"white",borderRadius:14,padding:28,width:400,maxWidth:"95vw",boxShadow:"0 20px 60px rgba(0,0,0,0.25)"}}>
            <h3 style={{margin:"0 0 16px",fontSize:16,fontWeight:700}}>Editar localización</h3>
            <div style={{marginBottom:12}}>
              <div style={{fontSize:11,color:"#94a3b8",fontWeight:700,marginBottom:4}}>UBICACIÓN</div>
              <div style={{padding:"8px 12px",background:"#f8fafc",borderRadius:7,fontSize:13,color:"#374151"}}>{editForm.ubicacion}</div>
            </div>
            <div style={{marginBottom:12}}>
              <div style={{fontSize:11,color:"#94a3b8",fontWeight:700,marginBottom:4}}>LOCALIZACIÓN</div>
              <div style={{padding:"8px 12px",background:"#f8fafc",borderRadius:7,fontSize:13,color:"#374151"}}>{editForm.localizacion}</div>
            </div>
            <div style={{marginBottom:12}}>
              <div style={{fontSize:11,color:"#94a3b8",fontWeight:700,marginBottom:4}}>N° LOCALIZACIÓN</div>
              <input value={editForm.nro} onChange={e=>setEditFormLoc(f=>({...f,nro:e.target.value.toUpperCase()}))}
                style={{width:"100%",padding:"8px 12px",borderRadius:7,border:"1.5px solid #e2e8f0",fontSize:13,boxSizing:"border-box"}}/>
            </div>
            <div style={{marginBottom:20}}>
              <div style={{fontSize:11,color:"#94a3b8",fontWeight:700,marginBottom:4}}>OBSERVACIÓN</div>
              <input value={editForm.observacion} onChange={e=>setEditFormLoc(f=>({...f,observacion:e.target.value}))}
                placeholder="Ej: Tienda Gourmet"
                style={{width:"100%",padding:"8px 12px",borderRadius:7,border:"1.5px solid #e2e8f0",fontSize:13,boxSizing:"border-box"}}/>
            </div>
            <div style={{display:"flex",gap:10}}>
              <button onClick={()=>{
                if(!editForm.nro.trim())return showToast("El N° no puede estar vacío","err");
                G.localizaciones=G.localizaciones.map(l=>l.id===editLoc.id?{...l,nro:editForm.nro.trim(),observacion:editForm.observacion.trim()}:l);
                rerender();showToast("Localización actualizada");setEditLoc(null);
              }} style={{flex:1,padding:"9px 0",background:"#2563eb",color:"white",border:"none",borderRadius:8,fontWeight:700,cursor:"pointer"}}>
                Guardar
              </button>
              <button onClick={()=>setEditLoc(null)}
                style={{flex:1,padding:"9px 0",background:"#f1f5f9",color:"#374151",border:"none",borderRadius:8,fontWeight:700,cursor:"pointer"}}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </Section>
  );
}

// ── BASE DE DATOS ──
function VBaseDatos({G,rerender,showToast}){
  const [search,setSearch]=useState("");
  const [catF,setCatF]=useState("");
  const [preview,setPreview]=useState(null);
  const [rawData,setRawData]=useState(null);

  const cargarPreview=(e)=>{
    const file=e.target.files[0];if(!file)return;
    const reader=new FileReader();
    reader.onload=(ev)=>{
      const wb=XLSX.read(ev.target.result,{type:"binary"});
      const ws=wb.Sheets[wb.SheetNames[0]];
      const data=XLSX.utils.sheet_to_json(ws,{defval:""});
      if(!data.length)return showToast("Archivo vacío","err");
      setRawData(data);
      setPreview(data.slice(0,8));
    };
    reader.readAsBinaryString(file);
    e.target.value="";
  };

  const confirmarImport=async()=>{
    if(!rawData)return;
    _busy=true;
    const normKey=(k)=>String(k).toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^A-Z0-9]/g,"");
    const toNum=(v)=>{if(v===undefined||v===null||v==="")return 0;if(typeof v==="number")return isNaN(v)?0:v;let s=String(v).replace(/[^\d.,-]/g,"").trim();if(s==="")return 0;if(s.includes(".")&&s.includes(","))s=s.replace(/\./g,"").replace(",",".");else if(s.includes(","))s=s.replace(",",".");const n=parseFloat(s);return isNaN(n)?0:n;};
    const mapped=rawData.map((rawRow,i)=>{
      const row={};Object.keys(rawRow).forEach(k=>{row[normKey(k)]=rawRow[k];});
      const get=(...keys)=>{for(const k of keys){const nk=normKey(k);if(row[nk]!==undefined&&row[nk]!==null&&String(row[nk]).trim()!=="")return String(row[nk]).trim();}return "";};
      const getNum=(...keys)=>{for(const k of keys){const nk=normKey(k);if(row[nk]!==undefined&&row[nk]!==null&&String(row[nk]).trim()!=="")return toNum(row[nk]);}return 0;};
      return{
        id:"p"+i,
        ean:get("EAN13OCODIGOBARRAS","EAN13","EAN","CODIGOBARRAS","CODIGO DE BARRAS","BARRAS"),
        codigo:get("CODIGO","CODIGO INTERNO","CODIGOINTERNO","COD","CODIGO PRODUCTO","SKU","PLU"),
        nombre:get("NOMBRE PRODUCTO","NOMBRE DEL PRODUCTO","NOMBRE","DESCRIPCION","PRODUCTO"),
        referencia:get("NOMBRE REFERENCIA","REFERENCIA","REF","PRESENTACION"),
        categoria:get("NOMBRE CATEGORIA","CATEGORIA","LINEA","GRUPO"),
        subcategoria:get("NOMBRE SUBCATEGORIA","SUBCATEGORIA","SUB CATEGORIA"),
        subgrupo:get("NOMBRE SUBGRUPO","SUBGRUPO","SUB GRUPO"),
        determinada:get("NOMBRE DETERMINADA","DETERMINADA"),
        localizacion:get("NOMBRE LOCALIZACION","LOCALIZACION"),
        ubicacion:get("NOMBRE UBICACION","UBICACION"),
        observacion:get("OBSERVACION","OBS"),
        saldo:getNum("SALDO","EXISTENCIA","EXISTENCIAS","STOCK","SALDO SISTEMA","SALDO ACTUAL","CANTIDAD SISTEMA","INVENTARIO","DISPONIBLE","CANTIDAD","CANT"),
        costo:getNum("COSTO","COSTO UNITARIO","COSTO PROMEDIO","COSTO UND","COSTO UNIDAD","ULTIMO COSTO","COSTO ACTUAL","COSTO REAL","PRECIO COSTO","VALOR UNITARIO","VR UNITARIO"),
        nit:get("NIT"),
        proveedor:get("NOMBRE PROVEEDOR","PROVEEDOR"),
      };
    }).filter(r=>r.nombre);
    G.productos=mapped;setPreview(null);setRawData(null);
    // Subir directamente a la nube y ESPERAR a que termine, antes de permitir refrescos.
    try{
      await SB.deleteAllProductos();
      if(mapped.length)await SB.upsertProductosBulk(mapped.map(prodCols));
      _snap.prods=JSON.stringify(mapped.map(prodCols)); // marca como ya sincronizado
    }catch(e){console.warn("Error subiendo productos:",e);showToast("Error subiendo a la nube, revisa tu conexión","err");}
    saveLocalCache();
    _busy=false;
    rerender();
    const conCosto=mapped.filter(p=>p.costo>0).length,conSaldo=mapped.filter(p=>p.saldo>0).length;
    if(conCosto===0||conSaldo===0)showToast(`Importados ${mapped.length}, pero ${conCosto===0?"COSTO":""}${conCosto===0&&conSaldo===0?" y ":""}${conSaldo===0?"SALDO":""} salieron en 0 — revisa el nombre de esas columnas`,"warn");
    else showToast(`✓ ${mapped.length} productos importados y guardados en la nube`);
  };

  const [mostrarEstructura,setMostrarEstructura]=useState(false);
  const cats=[...new Set(G.productos.map(p=>p.categoria).filter(Boolean))].sort();
  const filtrados=G.productos.filter(p=>{
    const q=search.toLowerCase();
    return(!q||(p.nombre.toLowerCase().includes(q)||p.ean.includes(q)||p.codigo.toLowerCase().includes(q)))&&(!catF||p.categoria===catF);
  });

  const ESTRUCTURA=[
    {col:"EAN13",desc:"Código de barras del producto",ej:"7701101300176",req:"Recomendado"},
    {col:"CODIGOINTERNO",desc:"Código interno del sistema",ej:"00009",req:"Recomendado"},
    {col:"NOMBRE PRODUCTO",desc:"Nombre del producto",ej:"HAMBURGUESA ZENU",req:"Obligatorio"},
    {col:"NOMBRE REFERENCIA",desc:"Presentación o referencia",ej:"30 und",req:"Opcional"},
    {col:"NOMBRE CATEGORIA",desc:"Categoría del producto",ej:"CARNES FRIAS",req:"Recomendado"},
    {col:"NOMBRE SUBCATEGORIA",desc:"Subcategoría",ej:"HAMBURGUESA",req:"Opcional"},
    {col:"NOMBRE SUBGRUPO",desc:"Subgrupo",ej:"RES",req:"Opcional"},
    {col:"NOMBRE DETERMINADA",desc:"Ubicación física",ej:"CAVA 1",req:"Recomendado"},
    {col:"CANTIDAD",desc:"Cantidad en sistema",ej:"12",req:"Recomendado"},
    {col:"COSTO",desc:"Costo unitario",ej:"18500",req:"Recomendado"},
    {col:"NIT",desc:"NIT del proveedor",ej:"860001697",req:"Opcional"},
    {col:"NOMBRE PROVEEDOR",desc:"Nombre del proveedor",ej:"ZENU",req:"Opcional"},
    {col:"LOCALIZACION",desc:"Tipo de localización",ej:"NEVERA",req:"Opcional"},
    {col:"UBICACION",desc:"Tipo de ubicación",ej:"SALA DE VENTAS",req:"Opcional"},
    {col:"OBSERVACION",desc:"Observación del producto",ej:"IMPORTADO",req:"Opcional"},
  ];

  const descargarPlantilla=()=>{
    const cols=["EAN13","CODIGOINTERNO","NOMBRE PRODUCTO","NOMBRE REFERENCIA","NOMBRE CATEGORIA","NOMBRE SUBCATEGORIA","NOMBRE SUBGRUPO","NOMBRE DETERMINADA","CANTIDAD","COSTO","NIT","NOMBRE PROVEEDOR","LOCALIZACION","UBICACION","OBSERVACION"];
    const ej=["7701101300176","00009","HAMBURGUESA ZENU X 30 UND","30 und","CARNES FRIAS","HAMBURGUESA","RES","CAVA 1",12,18500,"860001697","ZENU","NEVERA","SALA DE VENTAS","IMPORTADO"];
    expXLSX([ej],cols,"plantilla_productos_TOMFIC.xlsx","PRODUCTOS");
    showToast("Plantilla descargada");
  };

  const conEAN=G.productos.filter(p=>p.ean).length;
  return(
    <Section>
      {/* Header estilo procesos */}
      <div style={{background:"linear-gradient(135deg,#0f172a 0%,#1e3a5f 100%)",borderRadius:16,padding:"20px 24px",marginBottom:20,color:"white",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div>
          <div style={{fontSize:11,fontWeight:600,opacity:0.75,letterSpacing:1,textTransform:"uppercase",marginBottom:4}}>Productos</div>
          <div style={{fontSize:22,fontWeight:800,letterSpacing:-0.5}}>Base de Datos</div>
          <div style={{fontSize:12,opacity:0.8,marginTop:4}}>{cats.length>0?cats.slice(0,3).join(" · ")+(cats.length>3?" …":""):"Sin categorías"}</div>
        </div>
        <div style={{textAlign:"right"}}>
          <div style={{fontSize:28,fontWeight:900,letterSpacing:-1}}>{G.productos.length}</div>
          <div style={{fontSize:11,opacity:0.8}}>productos</div>
        </div>
      </div>
      {/* Acciones */}
      <div style={{display:"flex",gap:10,marginBottom:16,alignItems:"center",flexWrap:"wrap"}}>
        <label style={{padding:"9px 20px",background:"#2563eb",color:"white",border:"none",borderRadius:8,cursor:"pointer",fontWeight:700,fontSize:13}}>
          ⬆ Cargar / Actualizar Excel<input type="file" accept=".xlsx,.xls" onChange={cargarPreview} style={{display:"none"}}/>
        </label>
        <button onClick={()=>setMostrarEstructura(v=>!v)}
          style={{padding:"9px 16px",background:"#f8fafc",border:"1.5px solid #e2e8f0",color:"#374151",borderRadius:8,cursor:"pointer",fontWeight:700,fontSize:13}}>
          📋 {mostrarEstructura?"Ocultar":"Ver"} estructura
        </button>
        <button onClick={descargarPlantilla}
          style={{padding:"9px 16px",background:"#f0fdf4",border:"1.5px solid #bbf7d0",color:"#166534",borderRadius:8,cursor:"pointer",fontWeight:700,fontSize:13}}>
          ⬇ Plantilla
        </button>
        {G.productos.length>0&&(
          <button onClick={()=>{G.productos=[];rerender();showToast("Base de datos limpiada","warn");}} style={{padding:"9px 14px",background:"#fef2f2",color:"#dc2626",border:"1px solid #fecaca",borderRadius:8,fontSize:13,fontWeight:700,cursor:"pointer"}}>
            🗑 Limpiar base
          </button>
        )}
        {G.productos.length===0&&!preview&&(
          <div style={{background:"#fef9c3",borderRadius:8,padding:"8px 14px",fontSize:13,color:"#92400e",fontWeight:600}}>
            ⚠️ Base vacía — carga el Excel del cliente
          </div>
        )}
      </div>

      {/* Estructura del Excel */}
      {mostrarEstructura&&(
        <div style={{...card,marginBottom:16,border:"1.5px solid #bfdbfe"}}>
          <div style={{fontWeight:700,fontSize:14,color:"#1e40af",marginBottom:12}}>📋 Estructura requerida del Excel</div>
          <div style={{fontSize:12,color:"#64748b",marginBottom:12}}>
            La primera fila del archivo debe ser el encabezado con los nombres de columna exactamente como se muestran abajo. Las columnas marcadas como <b style={{color:"#dc2626"}}>Obligatorio</b> son necesarias para importar correctamente.
          </div>
          <div style={{overflowX:"auto"}}>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
              <thead>
                <tr style={{background:"#1e40af",color:"white"}}>
                  {["Nombre de columna en Excel","Descripción","Ejemplo","Requerido"].map(h=>(
                    <th key={h} style={{padding:"8px 12px",textAlign:"left",fontWeight:700,whiteSpace:"nowrap"}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ESTRUCTURA.map((e,i)=>(
                  <tr key={i} style={{background:i%2?"#f8fafc":"white",borderBottom:"1px solid #e2e8f0"}}>
                    <td style={{padding:"6px 12px",fontFamily:"monospace",fontWeight:700,color:"#1e40af"}}>{e.col}</td>
                    <td style={{padding:"6px 12px",color:"#374151"}}>{e.desc}</td>
                    <td style={{padding:"6px 12px",color:"#64748b",fontStyle:"italic"}}>{e.ej}</td>
                    <td style={{padding:"6px 12px"}}>
                      <span style={{background:e.req==="Obligatorio"?"#fee2e2":e.req==="Recomendado"?"#fef9c3":"#f1f5f9",color:e.req==="Obligatorio"?"#dc2626":e.req==="Recomendado"?"#92400e":"#64748b",padding:"2px 8px",borderRadius:12,fontSize:11,fontWeight:700}}>{e.req}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{marginTop:12,background:"#eff6ff",borderRadius:8,padding:"8px 12px",fontSize:12,color:"#1e40af"}}>
            💡 <b>Tip:</b> Los nombres de las columnas pueden tener espacios al final — el sistema los elimina automáticamente al importar.
          </div>
        </div>
      )}

      {/* Vista previa */}
      {preview&&(
        <div style={{...card,marginBottom:16,border:"2px solid #2563eb"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
            <div style={{fontWeight:700,fontSize:15,color:"#1e40af"}}>Vista previa — {rawData.length} filas detectadas</div>
            <div style={{display:"flex",gap:10}}>
              <Btn c="#dc2626" outline onClick={()=>{setPreview(null);setRawData(null);}}>Cancelar</Btn>
              <Btn c="#16a34a" onClick={confirmarImport}>✓ Confirmar importación</Btn>
            </div>
          </div>
          <div style={{overflowX:"auto"}}>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
              <thead>
                <tr style={{background:"#eff6ff"}}>
                  {Object.keys(preview[0]||{}).slice(0,10).map(k=><th key={k} style={{padding:"7px 10px",textAlign:"left",fontWeight:700,color:"#1e40af",borderBottom:"2px solid #bfdbfe",whiteSpace:"nowrap"}}>{k}</th>)}
                </tr>
              </thead>
              <tbody>
                {preview.map((row,i)=>(
                  <tr key={i} style={{background:i%2?"#f8fafc":"white",borderBottom:"1px solid #e2e8f0"}}>
                    {Object.keys(row).slice(0,10).map(k=><td key={k} style={{padding:"6px 10px",color:"#374151"}}>{String(row[k]).substring(0,30)}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{marginTop:8,fontSize:12,color:"#64748b"}}>Mostrando las primeras {preview.length} filas de {rawData.length} · Solo se muestran las primeras 10 columnas</div>
        </div>
      )}

      {/* Filtros y tabla */}
      {G.productos.length>0&&(
        <>
          <div style={{display:"flex",gap:12,marginBottom:14,flexWrap:"wrap"}}>
            <Inp value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar nombre, código, EAN…" style={{flex:1,minWidth:200}}/>
            <Sel value={catF} onChange={e=>setCatF(e.target.value)} style={{width:"auto",minWidth:180}}>
              <option value="">Todas las categorías</option>
              {cats.map(c=><option key={c}>{c}</option>)}
            </Sel>
            <div style={{padding:"9px 14px",background:"#e0f2fe",color:"#0369a1",borderRadius:8,fontSize:13,fontWeight:700}}>{filtrados.length}</div>
          </div>
          <div style={{...card,padding:0,overflow:"hidden"}}>
            <div style={{overflowX:"auto",maxHeight:500}}>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
                <thead style={{position:"sticky",top:0}}>
                  <tr style={{background:"#0f172a",color:"white"}}>
                    {["Código","EAN","Nombre","Referencia","Categoría","Proveedor","Saldo","Costo"].map(h=>(
                      <th key={h} style={{padding:"9px 11px",textAlign:"left",fontWeight:600,whiteSpace:"nowrap"}}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtrados.slice(0,500).map((p,i)=>(
                    <tr key={p.id} style={{background:i%2?"#f8fafc":"white",borderBottom:"1px solid #f1f5f9"}}>
                      <td style={{padding:"6px 11px",fontFamily:"monospace",color:"#2563eb",fontWeight:700}}>{p.codigo}</td>
                      <td style={{padding:"6px 11px",color:"#94a3b8",fontSize:10}}>{p.ean}</td>
                      <td style={{padding:"6px 11px",fontWeight:500}}>{p.nombre}</td>
                      <td style={{padding:"6px 11px",color:"#64748b"}}>{p.referencia}</td>
                      <td style={{padding:"6px 11px"}}><Badge color={catC(p.categoria)} small>{p.categoria||"—"}</Badge></td>
                      <td style={{padding:"6px 11px",color:"#64748b"}}>{p.proveedor||"—"}</td>
                      <td style={{padding:"6px 11px",textAlign:"center",fontWeight:700,color:p.saldo>0?"#16a34a":"#94a3b8"}}>{p.saldo}</td>
                      <td style={{padding:"6px 11px",textAlign:"right",color:"#64748b"}}>{p.costo>0?"$"+p.costo.toLocaleString("es-CO"):"—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </Section>
  );
}

// ── CONTEOS ──
function VConteos({G,rerender,showToast,usuario}){
  const [modal,setModal]=useState(false);
  const [modalMod,setModalMod]=useState(null); // conteo a modificar
  const [form,setForm]=useState({nombre:"",locId:"",usuarioC1:"",usuarioC2:""});
  const [modForm,setModForm]=useState({obs:"",usuarioC1:"",usuarioC2:""});
  const [editC2,setEditC2]=useState(null);
  const [c2Val,setC2Val]=useState("");
  const [modalCaps,setModalCaps]=useState(null); // {conteoId, ronda, nombre}
  const [busqCaps,setBusqCaps]=useState("");
  const [modalComp,setModalComp]=useState(null); // conteo para comparativo
  const [busqComp,setBusqComp]=useState("");
  const caps=Object.values(G.capturas);
  const getCapsRonda=(conteoId,ronda)=>caps.filter(c=>c.conteoId===conteoId&&c.ronda===ronda);

  const crear=()=>{
    if(!G.inventario)return showToast("Primero crea un inventario","err");
    if(!form.nombre.trim()||!form.locId||!form.usuarioC1)return showToast("Completa nombre, localización y usuario C1","err");
    const loc=G.localizaciones.find(l=>l.id===form.locId);
    G.conteos.push({
      id:ID(),nombre:form.nombre,locId:form.locId,
      locLabel:`${loc.ubicacion} › ${loc.localizacion} › ${loc.nro}`,
      ubicacion:loc.ubicacion,localizacion:loc.localizacion,nro:loc.nro,
      obs:"",
      tipo:G.inventario.tipo,
      usuarioC1:form.usuarioC1,usuarioC2:form.usuarioC2||"",usuarioC3:"",
      estado:"pendiente",
      // Rondas cerradas independientemente
      rondasCerradas:[],
      fechaCreacion:TODAY(),
    });
    setModal(false);setForm({nombre:"",locId:"",usuarioC1:"",usuarioC2:""});
    rerender();showToast("Conteo programado ✓");
  };

  const guardarMod=()=>{
    if(!modForm.usuarioC1)return showToast("El usuario C1 es requerido","err");
    G.conteos=G.conteos.map(c=>c.id===modalMod.id?{...c,obs:modForm.obs,usuarioC1:modForm.usuarioC1,usuarioC2:modForm.usuarioC2}:c);
    setModalMod(null);rerender();showToast("Conteo actualizado ✓");
  };

  const guardarC2=(id)=>{
    if(!c2Val)return showToast("Selecciona un usuario","err");
    G.conteos=G.conteos.map(c=>c.id===id?{...c,usuarioC2:c2Val}:c);
    setEditC2(null);setC2Val("");rerender();showToast("Usuario C2 asignado ✓");
  };

  const asignarC3=(id,u)=>{
    G.conteos=G.conteos.map(c=>c.id===id?{...c,usuarioC3:u,estado:"enC3"}:c);
    rerender();showToast("C3 asignado ✓");
  };

  const [modalReabrir,setModalReabrir]=useState(null);
  const reabrirRonda=(c,ronda)=>{
    const rc=(c.rondasCerradas||[]).filter(r=>r!==ronda);
    let nuevoEstado;
    if(ronda==="C1")nuevoEstado="enCurso";
    else if(ronda==="C2")nuevoEstado=rc.includes("C1")?"cerradoC1":"enCurso";
    else if(ronda==="C3")nuevoEstado="diferencia";
    G.conteos=G.conteos.map(x=>x.id===c.id?{...x,estado:nuevoEstado,rondasCerradas:rc,...(ronda==="C3"?{}:{})}:x);
    setModalReabrir(null);rerender();showToast(`${ronda} reabierto ✓`,"warn");
  };
  // Qué rondas se pueden reabrir según lo ya cerrado
  const rondasReabribles=(c)=>{
    const r=[];const rc=c.rondasCerradas||[];
    if(rc.includes("C1")||["cerradoC1","cerradoC2","completado","diferencia","enC3"].includes(c.estado))r.push("C1");
    if(c.tipo==="2conteos"&&(rc.includes("C2")||["cerradoC2","completado","diferencia"].includes(c.estado)))r.push("C2");
    if(c.usuarioC3&&c.estado==="completado")r.push("C3");
    return r;
  };

  const stC={pendiente:"#94a3b8",enCurso:"#2563eb",cerradoC1:"#d97706",cerradoC2:"#16a34a",diferencia:"#dc2626",enC3:"#7c3aed",completado:"#16a34a"};
  const stL={pendiente:"Pendiente",enCurso:"En curso",cerradoC1:"C1 cerrado",cerradoC2:"Completado",diferencia:"⚠️ Diferencia",enC3:"En C3",completado:"Completado"};

  return(
    <Section>
      {/* Header estilo procesos */}
      <div style={{background:"linear-gradient(135deg,#0f172a 0%,#1e3a5f 100%)",borderRadius:16,padding:"20px 24px",marginBottom:20,color:"white",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div>
          <div style={{fontSize:11,fontWeight:600,opacity:0.75,letterSpacing:1,textTransform:"uppercase",marginBottom:4}}>Rondas</div>
          <div style={{fontSize:22,fontWeight:800,letterSpacing:-0.5}}>Programación de Conteos</div>
          <div style={{fontSize:12,opacity:0.8,marginTop:4}}>{G.inventario?.nombre||"Sin inventario activo"}</div>
        </div>
        <div style={{textAlign:"right"}}>
          <div style={{fontSize:28,fontWeight:900,letterSpacing:-1}}>{G.conteos.length}</div>
          <div style={{fontSize:11,opacity:0.8}}>conteos</div>
        </div>
      </div>

      <div style={{marginBottom:16,display:"flex",alignItems:"center",gap:12,flexWrap:"wrap"}}>
        <Btn c="#16a34a" onClick={()=>setModal(true)} disabled={!G.inventario||G.productos.length===0}>+ Programar Conteo</Btn>
        {!G.inventario&&<span style={{fontSize:12,color:"#dc2626",background:"#fef2f2",padding:"5px 10px",borderRadius:7}}>⚠️ Primero crea un inventario.</span>}
        {G.inventario&&G.productos.length===0&&<span style={{fontSize:12,color:"#dc2626",background:"#fef2f2",padding:"5px 10px",borderRadius:7}}>⚠️ Primero carga la base de productos.</span>}
      </div>

      {G.conteos.length===0?(
        <div style={{textAlign:"center",padding:"48px 20px",background:"white",borderRadius:14,border:"2px dashed #e2e8f0",color:"#64748b"}}>
          <div style={{fontSize:48,marginBottom:12}}>🗂️</div>
          <div style={{fontSize:15,fontWeight:700,marginBottom:6}}>Sin conteos programados</div>
          <div style={{fontSize:13}}>Crea el primer conteo para comenzar.</div>
        </div>
      ):(
        <div style={{...card,padding:0,overflow:"hidden"}}>
          <div style={{overflowX:"auto"}}>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:13,minWidth:800}}>
              <thead>
                <tr style={{background:"#0f172a",color:"white"}}>
                  {["Nombre","Ubicación","Tipo","C1","Estado C1","C2","Estado C2","C3","Estado C3","Estado","Acciones"].map(h=>(
                    <th key={h} style={{padding:"10px 12px",textAlign:"left",fontWeight:600,whiteSpace:"nowrap",fontSize:11}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {G.conteos.map((c,i)=>{
                  const rc=c.rondasCerradas||[];
                  const c1Cerrado=rc.includes("C1")||["cerradoC1","cerradoC2","completado","diferencia","enC3"].includes(c.estado);
                  const c2Cerrado=rc.includes("C2")||["cerradoC2","completado","diferencia"].includes(c.estado);
                  return(
                    <tr key={c.id} style={{background:i%2?"#f8fafc":"white",borderBottom:"1px solid #f1f5f9",verticalAlign:"middle"}}>
                      <td style={{padding:"10px 12px"}}>
                        <div style={{fontWeight:700,color:"#0f172a"}}>{c.nombre}</div>
                        {c.obs&&<div style={{fontSize:11,color:"#64748b",marginTop:2}}>📝 {c.obs}</div>}
                      </td>
                      <td style={{padding:"10px 12px",fontSize:12,color:"#64748b"}}>{c.locLabel}</td>
                      <td style={{padding:"10px 12px"}}><Badge color={c.tipo==="2conteos"?"#2563eb":"#16a34a"} small>{c.tipo==="2conteos"?"2 Conteos":"1 Conteo"}</Badge></td>
                      <td style={{padding:"10px 12px",fontWeight:600,color:"#2563eb"}}>{c.usuarioC1||"—"}</td>
                      <td style={{padding:"10px 12px"}}>
                        <button onClick={()=>c1Cerrado&&setModalCaps({conteoId:c.id,ronda:"C1",nombre:c.nombre})} title={c1Cerrado?"Ver capturas C1":""}
                          style={{display:"inline-flex",alignItems:"center",justifyContent:"center",minWidth:40,height:22,borderRadius:6,background:c1Cerrado?"#16a34a":"#94a3b8",border:"none",padding:"0 8px",cursor:c1Cerrado?"pointer":"default"}}>
                          <span style={{color:"white",fontSize:10,fontWeight:800}}>{c1Cerrado?"OK 👁":"?"}</span>
                        </button>
                      </td>
                      <td style={{padding:"10px 12px",fontWeight:600,color:"#16a34a"}}>
                        {c.tipo==="2conteos"?(
                          c.usuarioC2?c.usuarioC2:(
                            <button onClick={()=>{setEditC2(c.id);setC2Val("");}}
                              style={{background:"#fef9c3",border:"1px solid #fde047",color:"#92400e",borderRadius:6,padding:"3px 8px",fontSize:11,cursor:"pointer",fontWeight:700}}>+ Asignar</button>
                          )
                        ):<span style={{color:"#d1d5db"}}>N/A</span>}
                      </td>
                      <td style={{padding:"10px 12px"}}>
                        {c.tipo==="2conteos"&&c.usuarioC2?(
                          <button onClick={()=>c2Cerrado&&setModalCaps({conteoId:c.id,ronda:"C2",nombre:c.nombre})} title={c2Cerrado?"Ver capturas C2":""}
                            style={{display:"inline-flex",alignItems:"center",justifyContent:"center",minWidth:40,height:22,borderRadius:6,background:c2Cerrado?"#16a34a":"#94a3b8",border:"none",padding:"0 8px",cursor:c2Cerrado?"pointer":"default"}}>
                            <span style={{color:"white",fontSize:10,fontWeight:800}}>{c2Cerrado?"OK 👁":"?"}</span>
                          </button>
                        ):<span style={{color:"#d1d5db",fontSize:11}}>—</span>}
                      </td>
                      <td style={{padding:"10px 12px",fontWeight:600,color:"#7c3aed"}}>
                        {c.usuarioC3?c.usuarioC3:(
                          c.estado==="diferencia"?<span style={{color:"#dc2626",fontSize:11,fontWeight:700}}>Por asignar</span>:<span style={{color:"#d1d5db",fontSize:11}}>—</span>
                        )}
                      </td>
                      <td style={{padding:"10px 12px"}}>
                        {c.usuarioC3?(
                          <button onClick={()=>getCapsRonda(c.id,"C3").length>0&&setModalCaps({conteoId:c.id,ronda:"C3",nombre:c.nombre})} title="Ver capturas C3"
                            style={{display:"inline-flex",alignItems:"center",justifyContent:"center",minWidth:40,height:22,borderRadius:6,background:c.estado==="completado"?"#16a34a":"#7c3aed",border:"none",padding:"0 8px",cursor:getCapsRonda(c.id,"C3").length>0?"pointer":"default"}}>
                            <span style={{color:"white",fontSize:10,fontWeight:800}}>{c.estado==="completado"?"OK 👁":"…"}</span>
                          </button>
                        ):<span style={{color:"#d1d5db",fontSize:11}}>—</span>}
                      </td>
                      <td style={{padding:"10px 12px"}}><Badge color={stC[c.estado]||"#6b7280"} small>{stL[c.estado]||c.estado}</Badge></td>
                      <td style={{padding:"10px 12px",whiteSpace:"nowrap"}}>
                        <div style={{display:"flex",gap:6}}>
                          <button onClick={()=>{setModalMod(c);setModForm({obs:c.obs||"",usuarioC1:c.usuarioC1,usuarioC2:c.usuarioC2||""});}}
                            style={{background:"#eff6ff",color:"#2563eb",border:"1px solid #bfdbfe",borderRadius:6,padding:"4px 10px",cursor:"pointer",fontWeight:700,fontSize:11}}>Modificar</button>
                          {rondasReabribles(c).length>0&&(
                            <button onClick={()=>setModalReabrir(c)}
                              style={{background:"#fef9c3",border:"1px solid #fde047",color:"#92400e",borderRadius:6,padding:"4px 10px",cursor:"pointer",fontWeight:700,fontSize:11}}>Reabrir</button>
                          )}
                          {c.tipo==="2conteos"&&(
                            <button onClick={()=>{setBusqComp("");setModalComp(c);}}
                              style={{background:"#f3e8ff",color:"#7c3aed",border:"1px solid #d8b4fe",borderRadius:6,padding:"4px 10px",cursor:"pointer",fontWeight:700,fontSize:11}}>⚖ Comparar</button>
                          )}
                          {c.estado==="diferencia"&&!c.usuarioC3&&(
                            <select defaultValue="" onChange={e=>e.target.value&&asignarC3(c.id,e.target.value)}
                              style={{...inp,width:"auto",fontSize:11,padding:"4px 8px",height:28}}>
                              <option value="" disabled>+ C3</option>
                              {G.usuarios.filter(u=>u.activo).map(u=><option key={u.id}>{u.nombre}</option>)}
                            </select>
                          )}
                        </div>
                        {editC2===c.id&&(
                          <div style={{marginTop:6,display:"flex",gap:6}}>
                            <Sel value={c2Val} onChange={e=>setC2Val(e.target.value)} style={{width:"auto",fontSize:11}}>
                              <option value="">Usuario C2…</option>
                              {G.usuarios.filter(u=>u.activo).map(u=><option key={u.id}>{u.nombre}</option>)}
                            </Sel>
                            <Btn c="#16a34a" small onClick={()=>guardarC2(c.id)}>OK</Btn>
                            <Btn c="#64748b" small onClick={()=>setEditC2(null)}>✕</Btn>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal programar */}
      {modal&&(
        <Modal titulo="Programar Nuevo Conteo" onClose={()=>setModal(false)}>
          <Lbl>Nombre del conteo</Lbl>
          <Inp value={form.nombre} onChange={e=>setForm(p=>({...p,nombre:e.target.value}))} placeholder="Ej: Conteo Bodega Turno Mañana" style={{marginBottom:14}}/>
          <Lbl>Localización</Lbl>
          <Sel value={form.locId} onChange={e=>setForm(p=>({...p,locId:e.target.value}))} style={{marginBottom:14}}>
            <option value="">Seleccionar localización…</option>
            {G.localizaciones.map(l=><option key={l.id} value={l.id}>{l.ubicacion} › {l.localizacion} › {l.nro}{l.observacion?" — "+l.observacion:""}</option>)}
          </Sel>
          <Lbl>Usuario — Conteo 1 *</Lbl>
          <Sel value={form.usuarioC1} onChange={e=>setForm(p=>({...p,usuarioC1:e.target.value}))} style={{marginBottom:14}}>
            <option value="">Seleccionar usuario…</option>
            {G.usuarios.filter(u=>u.activo).map(u=><option key={u.id}>{u.nombre}</option>)}
          </Sel>
          {G.inventario?.tipo==="2conteos"&&<>
            <Lbl>Usuario — Conteo 2 (opcional)</Lbl>
            <Sel value={form.usuarioC2} onChange={e=>setForm(p=>({...p,usuarioC2:e.target.value}))} style={{marginBottom:14}}>
              <option value="">Sin asignar por ahora…</option>
              {G.usuarios.filter(u=>u.activo).map(u=><option key={u.id}>{u.nombre}</option>)}
            </Sel>
          </>}
          <div style={{background:"#eff6ff",borderRadius:8,padding:"8px 12px",fontSize:13,color:"#1e40af",marginBottom:18}}>
            📦 Total productos en la base: <b>{G.productos.length}</b>
          </div>
          <Btn c="#16a34a" onClick={crear} full>✓ Programar Conteo</Btn>
        </Modal>
      )}

      {/* Modal modificar */}
      {modalMod&&(
        <Modal titulo={`Modificar: ${modalMod.nombre}`} onClose={()=>setModalMod(null)}>
          <Lbl>Observación del conteo</Lbl>
          <Inp value={modForm.obs} onChange={e=>setModForm(p=>({...p,obs:e.target.value}))} placeholder="Ej: Contar productos de refrigeración" style={{marginBottom:14}}/>
          <Lbl>Usuario — Conteo 1</Lbl>
          <Sel value={modForm.usuarioC1} onChange={e=>setModForm(p=>({...p,usuarioC1:e.target.value}))} style={{marginBottom:14}}>
            <option value="">Seleccionar…</option>
            {G.usuarios.filter(u=>u.activo).map(u=><option key={u.id}>{u.nombre}</option>)}
          </Sel>
          {modalMod.tipo==="2conteos"&&<>
            <Lbl>Usuario — Conteo 2</Lbl>
            <Sel value={modForm.usuarioC2} onChange={e=>setModForm(p=>({...p,usuarioC2:e.target.value}))} style={{marginBottom:14}}>
              <option value="">Sin asignar…</option>
              {G.usuarios.filter(u=>u.activo).map(u=><option key={u.id}>{u.nombre}</option>)}
            </Sel>
          </>}
          <Btn c="#2563eb" onClick={guardarMod} full>✓ Guardar cambios</Btn>
        </Modal>
      )}
      {modalReabrir&&(
        <Modal titulo="¿Qué conteo deseas reabrir?" onClose={()=>setModalReabrir(null)}>
          <div style={{fontSize:13,color:"#64748b",marginBottom:16}}>
            Conteo: <b style={{color:"#0f172a"}}>{modalReabrir.nombre}</b> · {modalReabrir.locLabel}
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            {rondasReabribles(modalReabrir).map(r=>{
              const col={C1:"#2563eb",C2:"#16a34a",C3:"#7c3aed"}[r];
              const quien=r==="C1"?modalReabrir.usuarioC1:r==="C2"?modalReabrir.usuarioC2:modalReabrir.usuarioC3;
              const txt={C1:"Conteo 1",C2:"Conteo 2",C3:"Conteo 3"}[r];
              return(
                <button key={r} onClick={()=>reabrirRonda(modalReabrir,r)}
                  style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"14px 16px",border:`2px solid ${col}`,borderRadius:10,background:"white",cursor:"pointer",textAlign:"left"}}>
                  <div>
                    <div style={{fontWeight:700,color:col,fontSize:15}}>🔓 Reabrir {txt}</div>
                    <div style={{fontSize:12,color:"#64748b",marginTop:2}}>Usuario: {quien||"—"}</div>
                  </div>
                  <span style={{color:col,fontSize:18}}>→</span>
                </button>
              );
            })}
          </div>
          <div style={{marginTop:16}}><Btn c="#64748b" onClick={()=>setModalReabrir(null)} full outline>Cancelar</Btn></div>
        </Modal>
      )}
      {modalCaps&&(()=>{
        const {conteoId,ronda,nombre}=modalCaps;
        const rCaps=getCapsRonda(conteoId,ronda);
        const porProd={};rCaps.forEach(c=>{if(!porProd[c.productoId])porProd[c.productoId]={...c,total:0};porProd[c.productoId].total+=c.cantidad;});
        const todo=Object.values(porProd);
        const q=busqCaps.trim().toLowerCase();
        const lista=q?todo.filter(c=>(c.codigo&&c.codigo.toLowerCase().includes(q))||(c.ean&&String(c.ean).toLowerCase().includes(q))||(c.nombre&&c.nombre.toLowerCase().includes(q))):todo;
        const cerrar=()=>{setBusqCaps("");setModalCaps(null);};
        return(
          <Modal titulo={`${ronda} — ${nombre} (${lista.length}${q?" de "+todo.length:""} productos)`} onClose={cerrar} wide>
            <div style={{marginBottom:12}}>
              <input value={busqCaps} onChange={e=>setBusqCaps(e.target.value)} placeholder="🔍 Buscar por código de barras o nombre…" autoFocus style={{...inp,fontSize:14,border:"1.5px solid #2563eb"}}/>
            </div>
            <div style={{maxHeight:460,overflowY:"auto"}}>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
                <thead><tr style={{background:"#0f172a",color:"white",position:"sticky",top:0}}>{["Código","Nombre","Referencia","Total","Estado","Usuario"].map(h=><th key={h} style={{padding:"7px 10px",textAlign:"left",fontWeight:600}}>{h}</th>)}</tr></thead>
                <tbody>
                  {lista.length===0?(<tr><td colSpan={6} style={{padding:20,textAlign:"center",color:"#64748b"}}>{q?`No se encontró "${busqCaps}"`:"Sin capturas"}</td></tr>):lista.map((c,i)=>(
                    <tr key={i} style={{background:i%2?"#f8fafc":"white",borderBottom:"1px solid #f1f5f9"}}>
                      <td style={{padding:"6px 10px",fontFamily:"monospace",color:"#2563eb",fontWeight:700}}>{c.codigo}</td>
                      <td style={{padding:"6px 10px",fontWeight:500}}>{c.nombre}</td>
                      <td style={{padding:"6px 10px",color:"#64748b",fontSize:11}}>{c.referencia}</td>
                      <td style={{padding:"6px 10px",textAlign:"center",fontWeight:800,color:"#2563eb",fontSize:15}}>{c.total}</td>
                      <td style={{padding:"6px 10px"}}><EstBadge e={c.estado}/></td>
                      <td style={{padding:"6px 10px",color:"#64748b"}}>{c.usuario}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{marginTop:14,display:"flex",justifyContent:"flex-end"}}><Btn c="#64748b" onClick={cerrar}>Cerrar</Btn></div>
          </Modal>
        );
      })()}
      {modalComp&&(()=>{
        const c=modalComp;
        const ids=new Set(caps.filter(x=>x.conteoId===c.id).map(x=>x.productoId));
        const tot=(pid,r)=>caps.filter(x=>x.conteoId===c.id&&x.productoId===pid&&x.ronda===r).reduce((s,x)=>s+x.cantidad,0);
        const filas=[...ids].map(pid=>{
          const p=G.productos.find(x=>x.id===pid)||caps.find(x=>x.productoId===pid)||{};
          const t1=tot(pid,"C1"),t2=tot(pid,"C2"),t3=tot(pid,"C3");
          const difiere=t1!==t2;
          return{codigo:p.codigo||"",nombre:p.nombre||"",ean:p.ean||"",t1,t2,t3,difiere};
        }).sort((a,b)=>(a.nombre||"").localeCompare(b.nombre||""));
        const q=busqComp.trim().toLowerCase();
        const lista=q?filas.filter(f=>(f.codigo&&f.codigo.toLowerCase().includes(q))||(f.ean&&String(f.ean).toLowerCase().includes(q))||(f.nombre&&f.nombre.toLowerCase().includes(q))):filas;
        const nDif=filas.filter(f=>f.difiere).length;
        const cerrar=()=>{setBusqComp("");setModalComp(null);};
        return(
          <Modal titulo={`⚖ Comparativo — ${c.nombre}`} onClose={cerrar} wide>
            <div style={{display:"flex",gap:8,marginBottom:12,flexWrap:"wrap"}}>
              <Badge color="#2563eb">C1: {c.usuarioC1||"—"}</Badge>
              <Badge color="#16a34a">C2: {c.usuarioC2||"—"}</Badge>
              {c.usuarioC3&&<Badge color="#7c3aed">C3: {c.usuarioC3}</Badge>}
              <Badge color={nDif>0?"#dc2626":"#16a34a"}>{nDif} con diferencia</Badge>
            </div>
            <div style={{marginBottom:12}}>
              <input value={busqComp} onChange={e=>setBusqComp(e.target.value)} placeholder="🔍 Buscar por código o nombre…" style={{...inp,fontSize:14,border:"1.5px solid #7c3aed"}}/>
            </div>
            <div style={{maxHeight:460,overflowY:"auto"}}>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
                <thead><tr style={{background:"#0f172a",color:"white",position:"sticky",top:0}}>{["Código","Nombre","C1","C2","C3","Dif"].map(h=><th key={h} style={{padding:"7px 10px",textAlign:h==="Código"||h==="Nombre"?"left":"center",fontWeight:600}}>{h}</th>)}</tr></thead>
                <tbody>
                  {lista.length===0?(<tr><td colSpan={6} style={{padding:20,textAlign:"center",color:"#64748b"}}>{q?`No se encontró "${busqComp}"`:"Sin capturas"}</td></tr>):lista.map((f,i)=>(
                    <tr key={i} style={{background:f.difiere?"#fef2f2":i%2?"#f8fafc":"white",borderBottom:"1px solid #f1f5f9"}}>
                      <td style={{padding:"6px 10px",fontFamily:"monospace",color:"#2563eb",fontWeight:700}}>{f.codigo}</td>
                      <td style={{padding:"6px 10px",fontWeight:500}}>{f.nombre}</td>
                      <td style={{padding:"6px 10px",textAlign:"center",fontWeight:700,color:"#2563eb"}}>{f.t1||"—"}</td>
                      <td style={{padding:"6px 10px",textAlign:"center",fontWeight:700,color:"#16a34a"}}>{f.t2||"—"}</td>
                      <td style={{padding:"6px 10px",textAlign:"center",fontWeight:700,color:"#7c3aed"}}>{f.t3||"—"}</td>
                      <td style={{padding:"6px 10px",textAlign:"center",fontWeight:800,color:f.difiere?"#dc2626":"#16a34a"}}>{f.difiere?(f.t1-f.t2>0?"+":"")+(f.t1-f.t2):"✓"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{marginTop:14,display:"flex",justifyContent:"flex-end"}}><Btn c="#64748b" onClick={cerrar}>Cerrar</Btn></div>
          </Modal>
        );
      })()}
    </Section>
  );
}

// ── PROCESOS ──
function VProcesos({G,rerender,showToast,usuario}){
  const [modalAsignar,setModalAsignar]=useState(null);
  const [modalCaps,setModalCaps]=useState(null); // {conteoId, ronda, nombre}
  const [busqCaps,setBusqCaps]=useState("");
  const [modalReabrir,setModalReabrir]=useState(null); // {conteo}
  const [usuariosExtra,setUsuariosExtra]=useState({});
  const [verPendientes,setVerPendientes]=useState(false);
  const [pendForm,setPendForm]=useState(null); // {tipo:'crear'|'c2'|'c3', id/locId, nombre, c1, c2}
  const caps=Object.values(G.capturas);
  const usuariosActivos=()=>G.usuarios.filter(u=>u.activo);
  // Crear conteo rápido desde el panel de pendientes
  const crearConteoRapido=(loc,nombre,c1,c2)=>{
    if(!nombre.trim()||!c1)return showToast("Completa nombre y usuario C1","err");
    G.conteos.push({
      id:ID(),nombre:nombre.trim(),locId:loc.id,
      locLabel:`${loc.ubicacion} › ${loc.localizacion} › ${loc.nro}`,
      ubicacion:loc.ubicacion,localizacion:loc.localizacion,nro:loc.nro,
      obs:"",tipo:G.inventario.tipo,
      usuarioC1:c1,usuarioC2:c2||"",usuarioC3:"",
      estado:"pendiente",rondasCerradas:[],fechaCreacion:TODAY(),
    });
    setPendForm(null);rerender();showToast("Conteo programado ✓");
  };
  const asignarC2Rapido=(id,u)=>{
    if(!u)return showToast("Selecciona un usuario","err");
    G.conteos=G.conteos.map(c=>c.id===id?{...c,usuarioC2:u}:c);
    setPendForm(null);rerender();showToast("Usuario C2 asignado ✓");
  };
  const total=G.productos.length;

  const totalConteos=G.conteos.length;
  const conteosCompletos=G.conteos.filter(c=>{
    if(c.tipo==="1conteo") return ["cerradoC1","completado"].includes(c.estado);
    return ["completado","cerradoC2"].includes(c.estado);
  }).length;
  const pct=totalConteos?Math.round(conteosCompletos/totalConteos*100):0;

  const expXLSX=(data,cols,fname,titulo)=>{
    const ws=XLSX.utils.aoa_to_sheet([[titulo],["Usuario: "+usuario.nombre+" | "+TODAY()],[],cols,...data]);
    const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,"Datos");XLSX.writeFile(wb,fname);showToast("Exportado ✓");
  };

  const expPDF=(difs,conteoNombre)=>{
    // Generate printable HTML and open in new window
    const rows=difs.map(d=>`<tr><td>${d.codigo}</td><td>${d.nombre}</td><td>${d.referencia}</td><td style="text-align:center">${d.c1}</td><td style="text-align:center">${d.c2}</td><td style="text-align:center;color:red;font-weight:bold">${d.dif>0?"+"+d.dif:d.dif}</td><td>${d.u1}</td><td>${d.u2}</td></tr>`).join("");
    const html=`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Diferencias ${conteoNombre}</title>
    <style>body{font-family:Arial,sans-serif;padding:20px;font-size:12px}h2{color:#1e40af}table{width:100%;border-collapse:collapse}th{background:#0f172a;color:white;padding:8px}td{padding:6px;border:1px solid #e2e8f0}tr:nth-child(even){background:#f8fafc}.header{margin-bottom:16px}</style></head>
    <body><div class="header"><h2>Reporte Diferencias de Conteos</h2><p><b>Conteo:</b> ${conteoNombre} &nbsp;|&nbsp; <b>Fecha:</b> ${TODAY()} &nbsp;|&nbsp; <b>Usuario:</b> ${usuario.nombre}</p></div>
    <table><thead><tr><th>Código</th><th>Nombre</th><th>Referencia</th><th>C1</th><th>C2</th><th>Diferencia</th><th>Usuario C1</th><th>Usuario C2</th></tr></thead><tbody>${rows}</tbody></table>
    <script>window.onload=()=>window.print();</script></body></html>`;
    const w=window.open("","_blank");w.document.write(html);w.document.close();
  };

  const getDifsConteo=(c)=>{
    if(c.tipo!=="2conteos") return [];
    const difs=[];
    G.productos.forEach(p=>{
      const t1=caps.filter(x=>x.conteoId===c.id&&x.productoId===p.id&&x.ronda==="C1").reduce((s,x)=>s+x.cantidad,0);
      const t2=caps.filter(x=>x.conteoId===c.id&&x.productoId===p.id&&x.ronda==="C2").reduce((s,x)=>s+x.cantidad,0);
      if((t1>0||t2>0)&&t1!==t2)
        difs.push({...p,c1:t1,c2:t2,dif:t1-t2,u1:caps.find(x=>x.conteoId===c.id&&x.productoId===p.id&&x.ronda==="C1")?.usuario||"",u2:caps.find(x=>x.conteoId===c.id&&x.productoId===p.id&&x.ronda==="C2")?.usuario||""});
    });
    return difs;
  };

  const getCapsRonda=(conteoId,ronda)=>caps.filter(c=>c.conteoId===conteoId&&c.ronda===ronda);

  const imprimirConteo=(c)=>{
    const w=window.open("","_blank");
    if(!w)return showToast("Habilita las ventanas emergentes para imprimir","err");
    const byProd={};
    caps.filter(x=>x.conteoId===c.id).forEach(x=>{
      if(!byProd[x.productoId])byProd[x.productoId]={codigo:x.codigo,nombre:x.nombre,referencia:x.referencia||"",categoria:x.categoria||"",c1:0,c2:0,c3:0,estado:x.estado||""};
      if(x.ronda==="C1")byProd[x.productoId].c1+=x.cantidad;
      else if(x.ronda==="C2")byProd[x.productoId].c2+=x.cantidad;
      else if(x.ronda==="C3")byProd[x.productoId].c3+=x.cantidad;
    });
    const lista=Object.values(byProd).sort((a,b)=>(a.nombre||"").localeCompare(b.nombre||""));
    const filas=lista.map(p=>{const fin=p.c3||p.c2||p.c1;return `<tr><td>${p.codigo}</td><td>${p.nombre}</td><td>${p.referencia}</td><td>${p.categoria}</td><td class="n">${p.c1||""}</td><td class="n">${p.c2||""}</td><td class="n">${p.c3||""}</td><td class="n" style="font-weight:bold">${fin}</td><td>${p.estado}</td></tr>`;}).join("");
    const dif2=c.tipo==="2conteos"?getDifsConteo(c).length:0;
    const html=`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${c.nombre}</title>
    <style>body{font-family:Arial,sans-serif;padding:22px;font-size:12px;color:#0f172a}h2{color:#1e40af;margin:0 0 4px}.meta{color:#475569;font-size:12px;margin-bottom:6px}.box{background:#f1f5f9;border-radius:8px;padding:8px 12px;display:inline-block;margin:4px 8px 12px 0;font-size:12px}table{width:100%;border-collapse:collapse;margin-top:8px}th{background:#0f172a;color:white;padding:7px;text-align:left;font-size:11px}td{padding:5px 7px;border-bottom:1px solid #e2e8f0}td.n{text-align:center}tr:nth-child(even) td{background:#f8fafc}@media print{button{display:none}}</style></head>
    <body>
      <h2>📦 TOMFIC — Conteo por Ubicación</h2>
      <div class="meta"><b>Conteo:</b> ${c.nombre}</div>
      <div class="meta"><b>Ubicación:</b> ${c.locLabel||""}</div>
      <div class="meta"><b>Fecha:</b> ${TODAY()} &nbsp;·&nbsp; <b>Impreso por:</b> ${usuario.nombre}</div>
      <div>
        <span class="box"><b>C1:</b> ${c.usuarioC1||"—"}</span>
        <span class="box"><b>C2:</b> ${c.usuarioC2||"—"}</span>
        <span class="box"><b>Productos contados:</b> ${lista.length}</span>
        ${dif2?`<span class="box" style="background:#fee2e2;color:#dc2626"><b>Diferencias:</b> ${dif2}</span>`:""}
      </div>
      <table><thead><tr><th>Código</th><th>Nombre</th><th>Referencia</th><th>Categoría</th><th>C1</th><th>C2</th><th>C3</th><th>Final</th><th>Estado</th></tr></thead><tbody>${filas||'<tr><td colspan="9" style="text-align:center;color:#94a3b8;padding:20px">Sin capturas todavía</td></tr>'}</tbody></table>
    </body></html>`;
    w.document.write(html);w.document.close();w.focus();setTimeout(()=>{try{w.print();}catch(e){}},400);
  };

  const asignarC2=(id,u)=>{G.conteos=G.conteos.map(c=>c.id===id?{...c,usuarioC2:u}:c);rerender();showToast("C2 asignado ✓");};
  const asignarC3=(id,u)=>{G.conteos=G.conteos.map(c=>c.id===id?{...c,usuarioC3:u,estado:"enC3"}:c);rerender();showToast("C3 asignado ✓");};

  const reabrirRonda=(c,ronda)=>{
    let nuevoEstado="enCurso";
    if(ronda==="C2") nuevoEstado="cerradoC1";
    else if(ronda==="C3") nuevoEstado="enC3";
    G.conteos=G.conteos.map(x=>x.id===c.id?{...x,estado:nuevoEstado}:x);
    setModalReabrir(null);rerender();showToast(`${ronda} reabierto ✓`,"warn");
  };

  const agregarUsuarioExtra=(conteoId,u)=>{setUsuariosExtra(prev=>{const curr=prev[conteoId]||[];if(curr.includes(u))return prev;return{...prev,[conteoId]:[...curr,u]};});showToast(`${u} agregado ✓`);};
  const quitarUsuarioExtra=(conteoId,u)=>{setUsuariosExtra(prev=>({...prev,[conteoId]:(prev[conteoId]||[]).filter(x=>x!==u)}));};

  // Modal capturas de una ronda
  const ModalCaps=()=>{
    if(!modalCaps)return null;
    const {conteoId,ronda,nombre}=modalCaps;
    const rCaps=getCapsRonda(conteoId,ronda);
    // Agrupar por producto (sumatoria)
    const porProd={};
    rCaps.forEach(c=>{
      if(!porProd[c.productoId])porProd[c.productoId]={...c,total:0};
      porProd[c.productoId].total+=c.cantidad;
    });
    const listaTotal=Object.values(porProd);
    const q=busqCaps.trim().toLowerCase();
    const lista=q?listaTotal.filter(c=>
      (c.codigo&&c.codigo.toLowerCase().includes(q))||
      (c.ean&&String(c.ean).toLowerCase().includes(q))||
      (c.nombre&&c.nombre.toLowerCase().includes(q))
    ):listaTotal;
    const cerrar=()=>{setBusqCaps("");setModalCaps(null);};
    return(
      <Modal titulo={`${ronda} — ${nombre} (${lista.length}${q?" de "+listaTotal.length:""} productos)`} onClose={cerrar} wide>
        <div style={{marginBottom:12}}>
          <input value={busqCaps} onChange={e=>setBusqCaps(e.target.value)} placeholder="🔍 Buscar por código de barras o nombre…" autoFocus
            style={{...inp,fontSize:14,border:"1.5px solid #2563eb"}}/>
        </div>
        <div style={{maxHeight:480,overflowY:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
            <thead><tr style={{background:"#0f172a",color:"white",position:"sticky",top:0}}>
              {["Código","Nombre","Referencia","Total","Estado","Obs","Usuario"].map(h=>(
                <th key={h} style={{padding:"7px 10px",textAlign:"left",fontWeight:600}}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {lista.length===0?(
                <tr><td colSpan={7} style={{padding:20,textAlign:"center",color:"#64748b"}}>{q?`No se encontró "${busqCaps}"`:"Sin capturas registradas aún"}</td></tr>
              ):lista.map((c,i)=>(
                <tr key={i} style={{background:i%2?"#f8fafc":"white",borderBottom:"1px solid #f1f5f9"}}>
                  <td style={{padding:"6px 10px",fontFamily:"monospace",color:"#2563eb",fontWeight:700}}>{c.codigo}</td>
                  <td style={{padding:"6px 10px",fontWeight:500}}>{c.nombre}</td>
                  <td style={{padding:"6px 10px",color:"#64748b",fontSize:11}}>{c.referencia}</td>
                  <td style={{padding:"6px 10px",textAlign:"center",fontWeight:800,color:"#2563eb",fontSize:15}}>{c.total}</td>
                  <td style={{padding:"6px 10px"}}><EstBadge e={c.estado}/></td>
                  <td style={{padding:"6px 10px",color:"#64748b",fontSize:11}}>{c.obs||"—"}</td>
                  <td style={{padding:"6px 10px",color:"#64748b"}}>{c.usuario}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{marginTop:14,display:"flex",justifyContent:"flex-end"}}>
          <Btn c="#64748b" onClick={cerrar}>Cerrar</Btn>
        </div>
      </Modal>
    );
  };

  return(
    <div>
      <ModalCaps/>

      {/* Modal reabrir con selección de ronda */}
      {modalReabrir&&(
        <Modal titulo="¿Qué conteo deseas reabrir?" onClose={()=>setModalReabrir(null)}>
          <div style={{fontSize:13,color:"#64748b",marginBottom:16}}>Selecciona la ronda que quieres reabrir para que el usuario pueda seguir capturando.</div>
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            {["C1","C2","C3"].filter(r=>{
              const c=modalReabrir;
              if(r==="C1") return true;
              if(r==="C2") return c.tipo==="2conteos"&&c.usuarioC2;
              if(r==="C3") return c.usuarioC3;
              return false;
            }).map(r=>(
              <button key={r} onClick={()=>reabrirRonda(modalReabrir,r)}
                style={{padding:"12px 16px",background:r==="C1"?"#eff6ff":r==="C2"?"#f0fdf4":"#faf5ff",border:`1.5px solid ${r==="C1"?"#2563eb":r==="C2"?"#16a34a":"#7c3aed"}`,borderRadius:10,cursor:"pointer",textAlign:"left",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div>
                  <div style={{fontWeight:700,color:r==="C1"?"#2563eb":r==="C2"?"#16a34a":"#7c3aed",fontSize:14}}>Reabrir {r}</div>
                  <div style={{fontSize:12,color:"#64748b",marginTop:2}}>
                    {r==="C1"&&`Usuario: ${modalReabrir.usuarioC1}`}
                    {r==="C2"&&`Usuario: ${modalReabrir.usuarioC2}`}
                    {r==="C3"&&`Usuario: ${modalReabrir.usuarioC3}`}
                  </div>
                </div>
                <span style={{fontSize:18}}>🔓</span>
              </button>
            ))}
          </div>
          <div style={{marginTop:14}}>
            <Btn c="#64748b" onClick={()=>setModalReabrir(null)} full>Cancelar</Btn>
          </div>
        </Modal>
      )}

      {/* Header moderno */}
      <div style={{background:"linear-gradient(135deg,#1e40af 0%,#0891b2 100%)",borderRadius:16,padding:"20px 24px",marginBottom:20,color:"white",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div>
          <div style={{fontSize:11,fontWeight:600,opacity:0.75,letterSpacing:1,textTransform:"uppercase",marginBottom:4}}>Panel de Control</div>
          <h2 style={{margin:0,fontSize:22,fontWeight:800,letterSpacing:-0.5}}>Vista de Procesos</h2>
          <div style={{fontSize:12,opacity:0.8,marginTop:4}}>{G.inventario?.nombre||"Inventario activo"}</div>
        </div>
        <div style={{textAlign:"right"}}>
          <div style={{fontSize:28,fontWeight:900,letterSpacing:-1}}>{pct}%</div>
          <div style={{fontSize:11,opacity:0.8}}>completado</div>
        </div>
      </div>

      {/* Tarjetas KPI modernas */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:12,marginBottom:16}}>
        {[
          {l:"Productos",v:total,c:"#2563eb",bg:"#eff6ff",icon:"📦"},
          {l:"Total conteos",v:totalConteos,c:"#475569",bg:"#f8fafc",icon:"📋"},
          {l:"Completados",v:conteosCompletos,c:"#16a34a",bg:"#f0fdf4",icon:"✅"},
          {l:"En progreso",v:totalConteos-conteosCompletos,c:"#0891b2",bg:"#ecfeff",icon:"⚙️"},
          {l:"Con diferencia",v:G.conteos.filter(c=>c.tipo==="2conteos"&&getDifsConteo(c).length>0).length,c:"#dc2626",bg:"#fef2f2",icon:"⚠️"},
          {l:"Alertas",v:G.alertas.filter(a=>!a.leida).length,c:"#7c3aed",bg:"#faf5ff",icon:"🔔"},
        ].map(s=>(
          <div key={s.l} style={{background:s.bg,borderRadius:14,padding:"14px 16px",boxShadow:"0 1px 4px rgba(0,0,0,0.06)",border:`1px solid ${s.c}22`}}>
            <div style={{fontSize:20,marginBottom:6}}>{s.icon}</div>
            <div style={{fontSize:26,fontWeight:900,color:s.c,lineHeight:1}}>{s.v}</div>
            <div style={{fontSize:11,color:"#64748b",marginTop:4,fontWeight:600}}>{s.l}</div>
          </div>
        ))}
      </div>

      {/* Barra avance moderna */}
      <div style={{background:"white",borderRadius:14,padding:"18px 20px",marginBottom:16,boxShadow:"0 1px 4px rgba(0,0,0,0.06)",border:"1px solid #e2e8f0"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
          <div>
            <div style={{fontSize:13,fontWeight:700,color:"#0f172a"}}>Avance del inventario</div>
            <div style={{fontSize:11,color:"#64748b",marginTop:1}}>{conteosCompletos} de {totalConteos} ubicaciones completadas</div>
          </div>
          <div style={{background:"linear-gradient(135deg,#1e40af,#0891b2)",borderRadius:10,padding:"6px 14px"}}>
            <span style={{fontSize:18,fontWeight:900,color:"white"}}>{pct}%</span>
          </div>
        </div>
        <div style={{background:"#e2e8f0",borderRadius:99,height:14,overflow:"hidden"}}>
          <div style={{width:pct+"%",background:"linear-gradient(90deg,#2563eb,#0891b2,#16a34a)",borderRadius:99,height:"100%",transition:"width 0.6s ease",boxShadow:"0 2px 8px rgba(37,99,235,0.4)"}}/>
        </div>
        <div style={{display:"flex",justifyContent:"space-between",marginTop:6,fontSize:10,color:"#94a3b8"}}>
          <span>0%</span><span>50%</span><span>100%</span>
        </div>
      </div>

      {/* Panel: Pendientes por hacer */}
      {(()=>{
        const conteosPend=G.conteos.filter(c=>c.estado!=="completado").map(c=>{
          let razon="";
          if(c.estado==="pendiente")razon="Sin iniciar";
          else if(c.estado==="enCurso")razon="C1 en curso";
          else if(c.estado==="cerradoC1")razon=c.tipo==="2conteos"?"Falta C2":"";
          else if(c.estado==="diferencia")razon="Tiene diferencias, falta C3";
          else if(c.estado==="enC3")razon="C3 en curso";
          return {c,razon};
        }).filter(x=>x.razon!=="");
        const locConConteo=new Set(G.conteos.map(c=>c.locId));
        const locSinConteo=G.localizaciones.filter(l=>!locConConteo.has(l.id));
        const totalPend=conteosPend.length+locSinConteo.length;
        return(
          <div style={{marginBottom:16,borderRadius:16,overflow:"hidden",boxShadow:"0 2px 12px rgba(0,0,0,0.08)",border:totalPend>0?"1.5px solid #fbbf24":"1.5px solid #86efac"}}>
            {/* Header del panel */}
            <div onClick={()=>setVerPendientes(v=>!v)} style={{cursor:"pointer",padding:"14px 20px",background:totalPend>0?"linear-gradient(135deg,#fffbeb,#fef3c7)":"linear-gradient(135deg,#f0fdf4,#dcfce7)",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                <div style={{width:36,height:36,borderRadius:10,background:totalPend>0?"#f59e0b":"#16a34a",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>
                  {totalPend>0?"⏳":"✅"}
                </div>
                <div>
                  <div style={{fontWeight:800,fontSize:14,color:totalPend>0?"#92400e":"#166534"}}>
                    {totalPend>0?`Faltan ${totalPend} pendiente${totalPend>1?"s":""} por completar`:"Todo al día — sin pendientes"}
                  </div>
                  {totalPend>0&&<div style={{fontSize:11,color:"#a16207",marginTop:1}}>{conteosPend.length} conteo{conteosPend.length!==1?"s":""} · {locSinConteo.length} ubicación{locSinConteo.length!==1?"es":""}</div>}
                </div>
              </div>
              <div style={{background:"white",borderRadius:8,padding:"4px 12px",fontSize:12,fontWeight:600,color:totalPend>0?"#92400e":"#166534",boxShadow:"0 1px 3px rgba(0,0,0,0.1)"}}>
                {verPendientes?"▲ Ocultar":"▼ Ver detalle"}
              </div>
            </div>

            {verPendientes&&totalPend>0&&(
              <div style={{background:"white",padding:16}}>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))",gap:14}}>
                <div>
                  <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:10}}>
                    <div style={{width:6,height:6,borderRadius:99,background:"#f59e0b"}}/>
                    <div style={{fontSize:11,fontWeight:800,color:"#374151",textTransform:"uppercase",letterSpacing:0.8}}>Conteos sin terminar ({conteosPend.length})</div>
                  </div>
                  {conteosPend.length===0?<div style={{fontSize:12,color:"#16a34a",padding:"8px 12px",background:"#f0fdf4",borderRadius:8}}>✓ Todos los conteos están completos</div>:(
                    <div style={{display:"flex",flexDirection:"column",gap:8}}>
                      {conteosPend.map(({c,razon})=>{
                        const abierto=pendForm&&pendForm.id===c.id;
                        const faltaC2=c.tipo==="2conteos"&&!c.usuarioC2;
                        const faltaC3=c.estado==="diferencia"&&!c.usuarioC3;
                        const accionable=faltaC2||faltaC3;
                        return(
                        <div key={c.id} style={{background:"#fffbeb",border:"1px solid #fde68a",borderRadius:10,padding:"10px 14px",fontSize:12,boxShadow:"0 1px 3px rgba(0,0,0,0.05)"}}>
                          <div onClick={()=>accionable&&setPendForm(abierto?null:{id:c.id,tipo:faltaC2?"c2":"c3",val:""})} style={{cursor:accionable?"pointer":"default"}}>
                            <div style={{fontWeight:700,color:"#0f172a",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                              <span>{c.nombre}</span>
                              {accionable&&<span style={{background:"#2563eb",color:"white",borderRadius:6,padding:"2px 8px",fontSize:10,fontWeight:700}}>{abierto?"▲ cerrar":faltaC2?"Asignar C2":"Asignar C3"}</span>}
                            </div>
                            <div style={{color:"#64748b",fontSize:11,marginTop:3}}>📍 {c.locLabel}</div>
                            <div style={{display:"inline-block",background:"#fef3c7",color:"#92400e",borderRadius:5,padding:"2px 7px",fontSize:10,fontWeight:700,marginTop:4}}>{razon}</div>
                          </div>
                          {abierto&&(
                            <div style={{marginTop:10,display:"flex",gap:6,alignItems:"center",paddingTop:8,borderTop:"1px solid #fde68a"}}>
                              <select value={pendForm.val} onChange={e=>setPendForm({...pendForm,val:e.target.value})} style={{...inp,fontSize:12,padding:"6px 8px",flex:1,borderRadius:8}}>
                                <option value="">Selecciona usuario…</option>
                                {usuariosActivos().map(u=><option key={u.id}>{u.nombre}</option>)}
                              </select>
                              <Btn c="#16a34a" small onClick={()=>pendForm.tipo==="c2"?asignarC2Rapido(c.id,pendForm.val):(pendForm.val&&asignarC3(c.id,pendForm.val),setPendForm(null))}>✓</Btn>
                              <Btn c="#64748b" small onClick={()=>setPendForm(null)}>✕</Btn>
                            </div>
                          )}
                        </div>
                        );
                      })}
                    </div>
                  )}
                </div>
                <div>
                  <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:10}}>
                    <div style={{width:6,height:6,borderRadius:99,background:"#2563eb"}}/>
                    <div style={{fontSize:11,fontWeight:800,color:"#374151",textTransform:"uppercase",letterSpacing:0.8}}>Ubicaciones sin conteo ({locSinConteo.length})</div>
                  </div>
                  {locSinConteo.length===0?<div style={{fontSize:12,color:"#16a34a",padding:"8px 12px",background:"#f0fdf4",borderRadius:8}}>✓ Todas las ubicaciones tienen conteo</div>:(
                    <div style={{display:"flex",flexDirection:"column",gap:8}}>
                      {locSinConteo.map(l=>{
                        const abierto=pendForm&&pendForm.locId===l.id;
                        return(
                        <div key={l.id} style={{background:"#eff6ff",border:"1px solid #bfdbfe",borderRadius:10,padding:"10px 14px",fontSize:12,boxShadow:"0 1px 3px rgba(0,0,0,0.05)"}}>
                          <div onClick={()=>setPendForm(abierto?null:{locId:l.id,tipo:"crear",nombre:`${l.localizacion} ${l.nro}`,c1:"",c2:""})} style={{cursor:"pointer"}}>
                            <div style={{fontWeight:700,color:"#1e40af",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                              <span>{l.ubicacion} › {l.localizacion} › {l.nro}</span>
                              <span style={{background:"#2563eb",color:"white",borderRadius:6,padding:"2px 8px",fontSize:10,fontWeight:700}}>{abierto?"▲ cerrar":"+ Crear"}</span>
                            </div>
                            {l.observacion&&<div style={{color:"#64748b",fontSize:11,marginTop:3}}>{l.observacion}</div>}
                            {!abierto&&<div style={{display:"inline-block",background:"#dbeafe",color:"#1e40af",borderRadius:5,padding:"2px 7px",fontSize:10,fontWeight:700,marginTop:4}}>Sin conteo programado</div>}
                          </div>
                          {abierto&&(
                            <div style={{marginTop:10,display:"flex",flexDirection:"column",gap:6,paddingTop:8,borderTop:"1px solid #bfdbfe"}}>
                              <input value={pendForm.nombre} onChange={e=>setPendForm({...pendForm,nombre:e.target.value})} placeholder="Nombre del conteo" style={{...inp,fontSize:12,padding:"6px 8px",borderRadius:8}}/>
                              <select value={pendForm.c1} onChange={e=>setPendForm({...pendForm,c1:e.target.value})} style={{...inp,fontSize:12,padding:"6px 8px",borderRadius:8}}>
                                <option value="">Usuario Conteo 1…</option>
                                {usuariosActivos().map(u=><option key={u.id}>{u.nombre}</option>)}
                              </select>
                              {G.inventario.tipo==="2conteos"&&(
                                <select value={pendForm.c2} onChange={e=>setPendForm({...pendForm,c2:e.target.value})} style={{...inp,fontSize:12,padding:"6px 8px",borderRadius:8}}>
                                  <option value="">Usuario Conteo 2 (opcional)…</option>
                                  {usuariosActivos().map(u=><option key={u.id}>{u.nombre}</option>)}
                                </select>
                              )}
                              <div style={{display:"flex",gap:6}}>
                                <Btn c="#16a34a" small onClick={()=>crearConteoRapido(l,pendForm.nombre,pendForm.c1,pendForm.c2)} full>✓ Crear conteo</Btn>
                                <Btn c="#64748b" small onClick={()=>setPendForm(null)} full>Cancelar</Btn>
                              </div>
                            </div>
                          )}
                        </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* Alertas */}
      {G.alertas.filter(a=>!a.leida).length>0&&(
        <div style={{...card,marginBottom:16,border:"2px solid #fde047",background:"#fffbeb"}}>
          <div style={{fontWeight:700,fontSize:13,marginBottom:8,color:"#92400e"}}>🔔 Alertas pendientes</div>
          {G.alertas.filter(a=>!a.leida).map((a,i)=>(
            <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"6px 10px",background:"#fef9c3",borderRadius:8,marginBottom:6,fontSize:12}}>
              <span><b>{a.usuario}</b> terminó {a.ronda} del conteo <b>{a.conteoNombre}</b> · {a.hora}</span>
              <Btn c="#d97706" small onClick={()=>{G.alertas=G.alertas.map(x=>x===a?{...x,leida:true}:x);rerender();}}>Visto</Btn>
            </div>
          ))}
        </div>
      )}

      {/* TABLA CENTRAL */}
      {G.conteos.length===0?(
        <div style={{...card,textAlign:"center",padding:36,color:"#64748b"}}>No hay conteos programados.</div>
      ):(
        <div style={{...card,padding:0,overflow:"hidden",marginBottom:16}}>
          <div style={{overflowX:"auto"}}>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:12,minWidth:1000}}>
              <thead>
                <tr style={{background:"#0f172a",color:"white"}}>
                  {["Ubicación","Localización","N° Local.","Observación","Usuarios","Conteo 1","Obs C1","Conteo 2","Obs C2","Diferencia","Obs Dif","C3","Validador","Acciones"].map(h=>(
                    <th key={h} style={{padding:"9px 10px",textAlign:"left",fontWeight:600,whiteSpace:"nowrap",fontSize:11}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {G.conteos.map((c,i)=>{
                  const c1s=caps.filter(x=>x.conteoId===c.id&&x.ronda==="C1");
                  const c2s=caps.filter(x=>x.conteoId===c.id&&x.ronda==="C2");
                  const c3s=caps.filter(x=>x.conteoId===c.id&&x.ronda==="C3");
                  const p1=total?Math.round(new Set(c1s.map(x=>x.productoId)).size/total*100):0;
                  const p2=total?Math.round(new Set(c2s.map(x=>x.productoId)).size/total*100):0;
                  const difs=getDifsConteo(c);
                  const extras=usuariosExtra[c.id]||[];
                  const todosUsuarios=[c.usuarioC1,...extras].filter(Boolean);

                  // C1 cerrado si estado es cerradoC1/completado/diferencia/enC3/cerradoC2
                  const c1Cerrado=["cerradoC1","cerradoC2","completado","diferencia","enC3"].includes(c.estado);
                  // C2 cerrado solo si estado avanzó más allá de cerradoC1
                  const c2Cerrado=["cerradoC2","completado","diferencia","enC3"].includes(c.estado);
                  // Hay diferencia real
                  const hayDifs=difs.length>0&&c1Cerrado&&c2Cerrado;
                  // ¿El C3 ya se realizó? (hay capturas C3 registradas para este conteo)
                  const c3Terminado=c.usuarioC3&&c.estado==="completado"&&caps.some(x=>x.conteoId===c.id&&x.ronda==="C3");
                  // ¿Se puede hacer clic para asignar C3? Solo si hay diferencias y el C3 aún NO terminó
                  const puedeAsignarC3=(hayDifs||c.estado==="diferencia")&&!c3Terminado;

                  // Validador
                  const validColor=
                    c3Terminado?"#94a3b8":
                    c.estado==="completado"&&!hayDifs?"#16a34a":
                    puedeAsignarC3?"#dc2626":"#94a3b8";
                  const validContent=
                    c3Terminado?<span style={{color:"white",fontWeight:800,fontSize:13}}>🔒</span>:
                    c.estado==="completado"&&!hayDifs?<span style={{color:"white",fontWeight:800,fontSize:13}}>OK</span>:
                    puedeAsignarC3?<span style={{color:"white",fontWeight:800,fontSize:11}}>CLIC</span>:
                    <span style={{color:"white",fontWeight:800,fontSize:16}}>?</span>;

                  return(
                    <tr key={c.id} style={{background:i%2?"#f8fafc":"white",borderBottom:"2px solid #e2e8f0",verticalAlign:"top"}}>
                      <td style={{padding:"10px 10px",fontWeight:700,color:"#1e40af"}}>{c.ubicacion}</td>
                      <td style={{padding:"10px 10px",color:"#64748b"}}>{c.localizacion}</td>
                      <td style={{padding:"10px 10px",fontWeight:600}}>{c.nro}</td>
                      <td style={{padding:"10px 10px",color:"#64748b",fontSize:11}}>{c.obs||"—"}</td>

                      {/* Usuarios */}
                      <td style={{padding:"10px 10px",minWidth:120}}>
                        <div style={{display:"flex",flexDirection:"column",gap:3}}>
                          {todosUsuarios.map(u=>(
                            <div key={u} style={{display:"flex",alignItems:"center",gap:4}}>
                              <span style={{background:"#eff6ff",color:"#2563eb",padding:"1px 7px",borderRadius:10,fontSize:10,fontWeight:700}}>{u}</span>
                              {u!==c.usuarioC1&&<button onClick={()=>quitarUsuarioExtra(c.id,u)} style={{background:"transparent",border:"none",color:"#dc2626",cursor:"pointer",fontSize:10,padding:0}}>✕</button>}
                            </div>
                          ))}
                          {c.usuarioC2&&<span style={{background:"#f0fdf4",color:"#16a34a",padding:"1px 7px",borderRadius:10,fontSize:10,fontWeight:700}}>C2: {c.usuarioC2}</span>}
                          {c.usuarioC3&&<span style={{background:"#faf5ff",color:"#7c3aed",padding:"1px 7px",borderRadius:10,fontSize:10,fontWeight:700}}>C3: {c.usuarioC3}</span>}
                          <button onClick={()=>setModalAsignar({conteoId:c.id,tipo:"extra"})} style={{background:"#f1f5f9",border:"1px dashed #94a3b8",color:"#64748b",borderRadius:6,padding:"2px 8px",fontSize:10,cursor:"pointer",marginTop:2}}>+ Apoyo</button>
                        </div>
                      </td>

                      {/* Conteo 1 — clickeable */}
                      <td style={{padding:"10px 10px",minWidth:120}}>
                        <div style={{fontSize:11,fontWeight:600,color:"#2563eb",marginBottom:3}}>{c.usuarioC1||"—"}</div>
                        <div style={{background:"#e2e8f0",borderRadius:99,height:5,marginBottom:3}}><div style={{width:p1+"%",background:"#2563eb",borderRadius:99,height:"100%"}}/></div>
                        <div style={{fontSize:10,color:"#64748b",marginBottom:4}}>{new Set(c1s.map(x=>x.productoId)).size}/{total} · {p1}%</div>
                        <button onClick={()=>setModalCaps({conteoId:c.id,ronda:"C1",nombre:c.nombre})}
                          style={{display:"inline-flex",alignItems:"center",justifyContent:"center",minWidth:40,height:22,borderRadius:6,background:c1Cerrado?"#16a34a":"#94a3b8",border:"none",cursor:"pointer",padding:"0 8px",gap:4}}>
                          <span style={{color:"white",fontSize:10,fontWeight:800}}>{c1Cerrado?"OK ✓":"?"}</span>
                        </button>
                      </td>
                      <td style={{padding:"10px 10px",fontSize:11}}>
                        {(()=>{
                          const usuarios=[c.usuarioC1,...(usuariosExtra[c.id]||[])].filter(Boolean);
                          const undTotal=c1s.reduce((a,x)=>a+(Number(x.cantidad)||0),0);
                          return undTotal>0?<div style={{whiteSpace:"nowrap",fontWeight:700,color:"#2563eb"}}>{undTotal} und</div>:<span style={{color:"#d1d5db"}}>—</span>;
                        })()}
                      </td>

                      {/* Conteo 2 — clickeable */}
                      <td style={{padding:"10px 10px",minWidth:120}}>
                        {c.tipo==="2conteos"?(
                          c.usuarioC2?(
                            <>
                              <div style={{fontSize:11,fontWeight:600,color:"#16a34a",marginBottom:3}}>{c.usuarioC2}</div>
                              <div style={{background:"#e2e8f0",borderRadius:99,height:5,marginBottom:3}}><div style={{width:p2+"%",background:"#16a34a",borderRadius:99,height:"100%"}}/></div>
                              <div style={{fontSize:10,color:"#64748b",marginBottom:4}}>{new Set(c2s.map(x=>x.productoId)).size}/{total} · {p2}%</div>
                              <button onClick={()=>setModalCaps({conteoId:c.id,ronda:"C2",nombre:c.nombre})}
                                style={{display:"inline-flex",alignItems:"center",justifyContent:"center",minWidth:40,height:22,borderRadius:6,background:c2Cerrado?"#16a34a":"#94a3b8",border:"none",cursor:"pointer",padding:"0 8px",gap:4}}>
                                <span style={{color:"white",fontSize:10,fontWeight:800}}>{c2Cerrado?"OK ✓":"?"}</span>
                              </button>
                            </>
                          ):(
                            <button onClick={()=>setModalAsignar({conteoId:c.id,tipo:"C2"})}
                              style={{background:"#fef9c3",border:"1px solid #fde047",color:"#92400e",borderRadius:8,padding:"5px 10px",fontSize:11,cursor:"pointer",fontWeight:700}}>
                              + Asignar C2
                            </button>
                          )
                        ):<span style={{color:"#d1d5db",fontSize:11}}>N/A</span>}
                      </td>
                      <td style={{padding:"10px 10px",fontSize:11}}>
                        {(()=>{
                          const undTotal=c2s.reduce((a,x)=>a+(Number(x.cantidad)||0),0);
                          return undTotal>0?<div style={{whiteSpace:"nowrap",fontWeight:700,color:"#16a34a"}}>{undTotal} und</div>:<span style={{color:"#d1d5db"}}>—</span>;
                        })()}
                      </td>

                      {/* Diferencia — solo si ambos cerrados */}
                      <td style={{padding:"10px 10px",minWidth:70,textAlign:"center"}}>
                        {c.tipo==="2conteos"&&c1Cerrado&&c2Cerrado?(
                          difs.length>0?(
                            <div>
                              <div style={{fontSize:18,fontWeight:800,color:"#dc2626"}}>{difs.length}</div>
                              <div style={{fontSize:9,color:"#dc2626"}}>productos</div>
                            </div>
                          ):(
                            <div style={{fontSize:18,fontWeight:800,color:"#16a34a"}}>0</div>
                          )
                        ):<span style={{color:"#d1d5db"}}>—</span>}
                      </td>

                      {/* Obs Dif — PDF solo si hay diferencia */}
                      <td style={{padding:"10px 10px",fontSize:11,color:"#64748b"}}>
                        {difs.length>0&&c1Cerrado&&c2Cerrado&&(
                          <button onClick={()=>expPDF(difs,c.nombre)}
                            style={{background:"#fee2e2",border:"none",color:"#dc2626",borderRadius:6,padding:"4px 10px",fontSize:11,cursor:"pointer",fontWeight:700}}>
                            🖨️ PDF
                          </button>
                        )}
                      </td>

                      {/* C3 — solo si hay diferencia */}
                      <td style={{padding:"10px 10px",minWidth:90}}>
                        {c.estado==="diferencia"&&!c.usuarioC3?(
                          <button onClick={()=>setModalAsignar({conteoId:c.id,tipo:"C3"})}
                            style={{background:"#faf5ff",border:"1px solid #7c3aed",color:"#7c3aed",borderRadius:8,padding:"4px 10px",fontSize:11,cursor:"pointer",fontWeight:700}}>
                            + Asignar C3
                          </button>
                        ):c.usuarioC3?(
                          <div>
                            <div style={{fontSize:10,color:"#7c3aed",fontWeight:700,marginBottom:2}}>{c.usuarioC3}</div>
                            <div style={{fontSize:10,color:"#64748b",marginBottom:3}}>{c3s.length} reg</div>
                            <button onClick={()=>setModalCaps({conteoId:c.id,ronda:"C3",nombre:c.nombre})}
                              style={{display:"inline-flex",alignItems:"center",justifyContent:"center",minWidth:40,height:22,borderRadius:6,background:c.estado==="completado"?"#16a34a":"#7c3aed",border:"none",cursor:"pointer",padding:"0 8px"}}>
                              <span style={{color:"white",fontSize:10,fontWeight:800}}>{c.estado==="completado"?"OK ✓":"?"}</span>
                            </button>
                          </div>
                        ):<span style={{color:"#d1d5db",fontSize:11}}>—</span>}
                      </td>

                      {/* Validador */}
                      <td style={{padding:"10px 10px",textAlign:"center",minWidth:80}}>
                        <div onClick={()=>puedeAsignarC3&&setModalAsignar({conteoId:c.id,tipo:"C3"})}
                          style={{width:44,height:44,borderRadius:"50%",background:validColor,display:"flex",alignItems:"center",justifyContent:"center",cursor:puedeAsignarC3?"pointer":"default",boxShadow:"0 2px 8px rgba(0,0,0,0.18)",margin:"0 auto",opacity:c3Terminado?0.7:1}}>
                          {validContent}
                        </div>
                        <div style={{fontSize:9,color:"#64748b",marginTop:3,textAlign:"center"}}>
                          {c3Terminado?"C3 validado":puedeAsignarC3?"→ C3":c.estado==="completado"?"Sin dif":"En proceso"}
                        </div>
                      </td>

                      {/* Acciones */}
                      <td style={{padding:"10px 10px",whiteSpace:"nowrap"}}>
                        <div style={{display:"flex",gap:6,alignItems:"center"}}>
                          <button onClick={()=>imprimirConteo(c)} title="Imprimir documento de esta ubicación"
                            style={{background:"#eff6ff",border:"1px solid #bfdbfe",color:"#1e40af",borderRadius:6,padding:"4px 10px",fontSize:11,cursor:"pointer",fontWeight:700}}>
                            🖨 Imprimir
                          </button>
                          {["cerradoC1","cerradoC2","completado","diferencia","enC3"].includes(c.estado)&&(
                            <button onClick={()=>setModalReabrir(c)}
                              style={{background:"#fef9c3",border:"1px solid #fde047",color:"#92400e",borderRadius:6,padding:"4px 10px",fontSize:11,cursor:"pointer",fontWeight:700}}>
                              🔓 Reabrir
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal asignar */}
      {modalAsignar&&(
        <Modal titulo={modalAsignar.tipo==="C2"?"Asignar Usuario C2":modalAsignar.tipo==="C3"?"Asignar Usuario C3 (desempate)":"Agregar usuario de apoyo"} onClose={()=>setModalAsignar(null)}>
          <div style={{marginBottom:14,fontSize:13,color:"#64748b"}}>
            {modalAsignar.tipo==="C2"&&"Este usuario hará el segundo conteo. Puede empezar en paralelo con C1."}
            {modalAsignar.tipo==="C3"&&"Este usuario contará solo los productos con diferencia entre C1 y C2."}
            {modalAsignar.tipo==="extra"&&"Este usuario ayudará pero no podrá cerrar el conteo."}
          </div>
          <Lbl>Seleccionar usuario</Lbl>
          <Sel defaultValue="" onChange={e=>{
            if(!e.target.value)return;
            const u=e.target.value;
            const{conteoId,tipo}=modalAsignar;
            if(tipo==="C2")asignarC2(conteoId,u);
            else if(tipo==="C3")asignarC3(conteoId,u);
            else agregarUsuarioExtra(conteoId,u);
            setModalAsignar(null);
          }} style={{marginBottom:20}}>
            <option value="">Seleccionar…</option>
            {G.usuarios.filter(u=>u.activo).map(u=><option key={u.id}>{u.nombre}</option>)}
          </Sel>
          <Btn c="#64748b" onClick={()=>setModalAsignar(null)} full>Cancelar</Btn>
        </Modal>
      )}
    </div>
  );
  return(
    <div>
      {/* Header moderno */}
      <div style={{background:"linear-gradient(135deg,#1e40af 0%,#0891b2 100%)",borderRadius:16,padding:"20px 24px",marginBottom:20,color:"white",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div>
          <div style={{fontSize:11,fontWeight:600,opacity:0.75,letterSpacing:1,textTransform:"uppercase",marginBottom:4}}>Panel de Control</div>
          <h2 style={{margin:0,fontSize:22,fontWeight:800,letterSpacing:-0.5}}>Vista de Procesos</h2>
          <div style={{fontSize:12,opacity:0.8,marginTop:4}}>{G.inventario?.nombre||"Inventario activo"}</div>
        </div>
        <div style={{textAlign:"right"}}>
          <div style={{fontSize:28,fontWeight:900,letterSpacing:-1}}>{pct}%</div>
          <div style={{fontSize:11,opacity:0.8}}>completado</div>
        </div>
      </div>

      {/* Tarjetas KPI modernas */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:12,marginBottom:16}}>
        {[
          {l:"Productos",v:total,c:"#2563eb",bg:"#eff6ff",icon:"📦"},
          {l:"Total conteos",v:totalConteos,c:"#475569",bg:"#f8fafc",icon:"📋"},
          {l:"Completados",v:conteosCompletos,c:"#16a34a",bg:"#f0fdf4",icon:"✅"},
          {l:"En progreso",v:totalConteos-conteosCompletos,c:"#0891b2",bg:"#ecfeff",icon:"⚙️"},
          {l:"Con diferencia",v:G.conteos.filter(c=>c.tipo==="2conteos"&&getDifsConteo(c).length>0).length,c:"#dc2626",bg:"#fef2f2",icon:"⚠️"},
          {l:"Alertas",v:G.alertas.filter(a=>!a.leida).length,c:"#7c3aed",bg:"#faf5ff",icon:"🔔"},
        ].map(s=>(
          <div key={s.l} style={{background:s.bg,borderRadius:14,padding:"14px 16px",boxShadow:"0 1px 4px rgba(0,0,0,0.06)",border:`1px solid ${s.c}22`}}>
            <div style={{fontSize:20,marginBottom:6}}>{s.icon}</div>
            <div style={{fontSize:26,fontWeight:900,color:s.c,lineHeight:1}}>{s.v}</div>
            <div style={{fontSize:11,color:"#64748b",marginTop:4,fontWeight:600}}>{s.l}</div>
          </div>
        ))}
      </div>

      {/* Barra avance moderna */}
      <div style={{background:"white",borderRadius:14,padding:"18px 20px",marginBottom:16,boxShadow:"0 1px 4px rgba(0,0,0,0.06)",border:"1px solid #e2e8f0"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
          <div>
            <div style={{fontSize:13,fontWeight:700,color:"#0f172a"}}>Avance del inventario</div>
            <div style={{fontSize:11,color:"#64748b",marginTop:1}}>{conteosCompletos} de {totalConteos} ubicaciones completadas</div>
          </div>
          <div style={{background:"linear-gradient(135deg,#1e40af,#0891b2)",borderRadius:10,padding:"6px 14px"}}>
            <span style={{fontSize:18,fontWeight:900,color:"white"}}>{pct}%</span>
          </div>
        </div>
        <div style={{background:"#e2e8f0",borderRadius:99,height:14,overflow:"hidden"}}>
          <div style={{width:pct+"%",background:"linear-gradient(90deg,#2563eb,#0891b2,#16a34a)",borderRadius:99,height:"100%",transition:"width 0.6s ease",boxShadow:"0 2px 8px rgba(37,99,235,0.4)"}}/>
        </div>
        <div style={{display:"flex",justifyContent:"space-between",marginTop:6,fontSize:10,color:"#94a3b8"}}>
          <span>0%</span><span>50%</span><span>100%</span>
        </div>
      </div>

      {/* Alertas */}
      {G.alertas.filter(a=>!a.leida).length>0&&(
        <div style={{...card,marginBottom:16,border:"2px solid #fde047",background:"#fffbeb"}}>
          <div style={{fontWeight:700,fontSize:13,marginBottom:8,color:"#92400e"}}>🔔 Alertas pendientes</div>
          {G.alertas.filter(a=>!a.leida).map((a,i)=>(
            <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"6px 10px",background:"#fef9c3",borderRadius:8,marginBottom:6,fontSize:12}}>
              <span><b>{a.usuario}</b> terminó {a.ronda} del conteo <b>{a.conteoNombre}</b> · {a.hora}</span>
              <Btn c="#d97706" small onClick={()=>{G.alertas=G.alertas.map(x=>x===a?{...x,leida:true}:x);rerender();}}>Visto</Btn>
            </div>
          ))}
        </div>
      )}

      {/* TABLA CENTRAL */}
      {G.conteos.length===0?(
        <div style={{...card,textAlign:"center",padding:36,color:"#64748b"}}>No hay conteos programados.</div>
      ):(
        <div style={{...card,padding:0,overflow:"hidden",marginBottom:16}}>
          <div style={{overflowX:"auto"}}>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:12,minWidth:1000}}>
              <thead>
                <tr style={{background:"#0f172a",color:"white"}}>
                  {["Ubicación","Localización","N° Local.","Observación","Usuarios","Conteo 1","Obs C1","Conteo 2","Obs C2","Diferencia","Obs Dif","C3","Validador","Acciones"].map(h=>(
                    <th key={h} style={{padding:"9px 10px",textAlign:"left",fontWeight:600,whiteSpace:"nowrap",fontSize:11}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {G.conteos.map((c,i)=>{
                  const c1s=caps.filter(x=>x.conteoId===c.id&&x.ronda==="C1");
                  const c2s=caps.filter(x=>x.conteoId===c.id&&x.ronda==="C2");
                  const c3s=caps.filter(x=>x.conteoId===c.id&&x.ronda==="C3");
                  const p1=total?Math.round(c1s.length/total*100):0;
                  const p2=total?Math.round(c2s.length/total*100):0;
                  const difs=getDifsConteo(c);
                  const extras=usuariosExtra[c.id]||[];
                  const todosUsuarios=[c.usuarioC1,...extras].filter(Boolean);
                  const bgRow=i%2?"#f8fafc":"white";

                  // Estado C1: ? en proceso, OK verde cerrado
                  const c1Cerrado=["cerradoC1","cerradoC2","completado","diferencia","enC3"].includes(c.estado);
                  const c2Cerrado=["cerradoC2","completado","diferencia","enC3"].includes(c.estado)||c.estado==="diferencia";
                  const c2Completado=["completado","cerradoC2"].includes(c.estado);

                  // Validador: ? gris=proceso, rojo=diferencia (clic→C3), verde=OK sin diferencia
                  const hayDifs=difs.length>0&&c2Cerrado;
                  const validColor=
                    (c.estado==="completado"||c.estado==="cerradoC2")&&!hayDifs?"#16a34a":
                    hayDifs||c.estado==="diferencia"?"#dc2626":
                    "#94a3b8";
                  const validContent=
                    (c.estado==="completado"||c.estado==="cerradoC2")&&!hayDifs?
                      <span style={{color:"white",fontWeight:800,fontSize:13}}>OK</span>:
                    hayDifs||c.estado==="diferencia"?
                      <span style={{color:"white",fontWeight:800,fontSize:11}}>CLIC</span>:
                      <span style={{color:"white",fontWeight:800,fontSize:16}}>?</span>;

                  return(
                    <tr key={c.id} style={{background:bgRow,borderBottom:"2px solid #e2e8f0",verticalAlign:"top"}}>
                      <td style={{padding:"10px 10px",fontWeight:700,color:"#1e40af"}}>{c.ubicacion}</td>
                      <td style={{padding:"10px 10px",color:"#64748b"}}>{c.localizacion}</td>
                      <td style={{padding:"10px 10px",fontWeight:600}}>{c.nro}</td>
                      <td style={{padding:"10px 10px",color:"#64748b",fontSize:11}}>{c.obs||"—"}</td>

                      {/* Usuarios */}
                      <td style={{padding:"10px 10px",minWidth:130}}>
                        <div style={{display:"flex",flexDirection:"column",gap:4}}>
                          <div style={{fontSize:10,color:"#94a3b8",fontWeight:700}}>C1:</div>
                          <div style={{display:"flex",alignItems:"center",gap:4,flexWrap:"wrap"}}>
                            <span style={{background:"#eff6ff",color:"#2563eb",padding:"1px 7px",borderRadius:10,fontSize:10,fontWeight:700}}>{c.usuarioC1}</span>
                            {(usuariosExtra[c.id+"_C1"]||[]).map(u=>(
                              <div key={u} style={{display:"flex",alignItems:"center",gap:2}}>
                                <span style={{background:"#dbeafe",color:"#2563eb",padding:"1px 6px",borderRadius:10,fontSize:9}}>{u}</span>
                                <button onClick={()=>quitarUsuarioExtra(c.id+"_C1",u)} style={{background:"transparent",border:"none",color:"#dc2626",cursor:"pointer",fontSize:9,padding:0}}>✕</button>
                              </div>
                            ))}
                            <button onClick={()=>setModalAsignar({conteoId:c.id+"_C1",tipo:"extra"})} style={{background:"#f1f5f9",border:"1px dashed #94a3b8",color:"#64748b",borderRadius:5,padding:"1px 6px",fontSize:9,cursor:"pointer"}}>+ Apoyo</button>
                          </div>
                          {c.tipo==="2conteos"&&c.usuarioC2&&<>
                            <div style={{fontSize:10,color:"#94a3b8",fontWeight:700,marginTop:4}}>C2:</div>
                            <div style={{display:"flex",alignItems:"center",gap:4,flexWrap:"wrap"}}>
                              <span style={{background:"#f0fdf4",color:"#16a34a",padding:"1px 7px",borderRadius:10,fontSize:10,fontWeight:700}}>{c.usuarioC2}</span>
                              {(usuariosExtra[c.id+"_C2"]||[]).map(u=>(
                                <div key={u} style={{display:"flex",alignItems:"center",gap:2}}>
                                  <span style={{background:"#dcfce7",color:"#16a34a",padding:"1px 6px",borderRadius:10,fontSize:9}}>{u}</span>
                                  <button onClick={()=>quitarUsuarioExtra(c.id+"_C2",u)} style={{background:"transparent",border:"none",color:"#dc2626",cursor:"pointer",fontSize:9,padding:0}}>✕</button>
                                </div>
                              ))}
                              <button onClick={()=>setModalAsignar({conteoId:c.id+"_C2",tipo:"extra"})} style={{background:"#f1f5f9",border:"1px dashed #94a3b8",color:"#64748b",borderRadius:5,padding:"1px 6px",fontSize:9,cursor:"pointer"}}>+ Apoyo</button>
                            </div>
                          </>}
                          {c.usuarioC3&&<>
                            <div style={{fontSize:10,color:"#94a3b8",fontWeight:700,marginTop:4}}>C3:</div>
                            <span style={{background:"#faf5ff",color:"#7c3aed",padding:"1px 7px",borderRadius:10,fontSize:10,fontWeight:700}}>{c.usuarioC3}</span>
                          </>}
                        </div>
                      </td>

                      {/* Conteo 1 */}
                      <td style={{padding:"10px 10px",minWidth:110}}>
                        <div style={{fontSize:11,fontWeight:600,color:"#2563eb",marginBottom:3}}>{c.usuarioC1||"—"}</div>
                        <div style={{background:"#e2e8f0",borderRadius:99,height:5,marginBottom:3}}><div style={{width:p1+"%",background:"#2563eb",borderRadius:99,height:"100%"}}/></div>
                        <div style={{fontSize:10,color:"#64748b",marginBottom:4}}>{c1s.length}/{total} · {p1}%</div>
                        <div style={{display:"inline-flex",alignItems:"center",justifyContent:"center",width:32,height:20,borderRadius:6,background:c1Cerrado?"#16a34a":"#94a3b8",cursor:"default"}}>
                          <span style={{color:"white",fontSize:10,fontWeight:800}}>{c1Cerrado?"OK":"?"}</span>
                        </div>
                      </td>
                      <td style={{padding:"10px 10px",fontSize:11}}>
                        {(()=>{
                          const undTotal=c1s.reduce((a,x)=>a+(Number(x.cantidad)||0),0);
                          return undTotal>0?<div style={{whiteSpace:"nowrap",fontWeight:700,color:"#2563eb"}}>{undTotal} und</div>:<span style={{color:"#d1d5db"}}>—</span>;
                        })()}
                      </td>

                      {/* Conteo 2 */}
                      <td style={{padding:"10px 10px",minWidth:110}}>
                        {c.tipo==="2conteos"?(
                          c.usuarioC2?(
                            <>
                              <div style={{fontSize:11,fontWeight:600,color:"#16a34a",marginBottom:3}}>{c.usuarioC2}</div>
                              <div style={{background:"#e2e8f0",borderRadius:99,height:5,marginBottom:3}}><div style={{width:p2+"%",background:"#16a34a",borderRadius:99,height:"100%"}}/></div>
                              <div style={{fontSize:10,color:"#64748b",marginBottom:4}}>{c2s.length}/{total} · {p2}%</div>
                              <div style={{display:"inline-flex",alignItems:"center",justifyContent:"center",width:32,height:20,borderRadius:6,background:c2Cerrado?"#16a34a":"#94a3b8"}}>
                                <span style={{color:"white",fontSize:10,fontWeight:800}}>{c2Cerrado?"OK":"?"}</span>
                              </div>
                            </>
                          ):(
                            <button onClick={()=>setModalAsignar({conteoId:c.id,tipo:"C2"})} style={{background:"#fef9c3",border:"1px solid #fde047",color:"#92400e",borderRadius:8,padding:"5px 10px",fontSize:11,cursor:"pointer",fontWeight:700}}>
                              + Asignar C2
                            </button>
                          )
                        ):<span style={{color:"#d1d5db",fontSize:11}}>N/A</span>}
                      </td>
                      <td style={{padding:"10px 10px",fontSize:11}}>
                        {(()=>{
                          const undTotal=c2s.reduce((a,x)=>a+(Number(x.cantidad)||0),0);
                          return undTotal>0?<div style={{whiteSpace:"nowrap",fontWeight:700,color:"#16a34a"}}>{undTotal} und</div>:<span style={{color:"#d1d5db"}}>—</span>;
                        })()}
                      </td>

                      {/* Diferencia — solo por este conteo */}
                      <td style={{padding:"10px 10px",minWidth:70,textAlign:"center"}}>
                        {c.tipo==="2conteos"&&c2Cerrado?(
                          difs.length>0?(
                            <div>
                              <div style={{fontSize:18,fontWeight:800,color:"#dc2626"}}>{difs.length}</div>
                              <div style={{fontSize:9,color:"#dc2626"}}>productos</div>
                            </div>
                          ):(
                            <div style={{fontSize:18,fontWeight:800,color:"#16a34a"}}>0</div>
                          )
                        ):<span style={{color:"#d1d5db"}}>—</span>}
                      </td>
                      <td style={{padding:"10px 10px",fontSize:11,color:"#64748b"}}>
                        {difs.length>0&&c2Cerrado&&(
                          <button onClick={()=>expXLSX(difs.map(d=>[d.codigo,d.ean,d.nombre,d.referencia,d.c1,d.c2,d.dif,d.u1,d.u2]),["CODIGO","EAN","NOMBRE","REFERENCIA","C1","C2","DIFERENCIA","U_C1","U_C2"],`difs_${c.nro}.xlsx`,`DIFERENCIAS ${c.nombre}`)}
                            style={{background:"#fee2e2",border:"none",color:"#dc2626",borderRadius:6,padding:"3px 9px",fontSize:10,cursor:"pointer",fontWeight:700}}>⬇ Excel</button>
                        )}
                      </td>

                      {/* C3 */}
                      <td style={{padding:"10px 10px",minWidth:80}}>
                        {c.estado==="enC3"||c.estado==="completado"?(
                          <div>
                            <div style={{fontSize:10,color:"#7c3aed",fontWeight:700,marginBottom:2}}>{c.usuarioC3}</div>
                            <div style={{fontSize:10,color:"#64748b"}}>{c3s.length} caps</div>
                            <div style={{display:"inline-flex",alignItems:"center",justifyContent:"center",width:32,height:20,borderRadius:6,background:c.estado==="completado"?"#16a34a":"#7c3aed",marginTop:3}}>
                              <span style={{color:"white",fontSize:10,fontWeight:800}}>{c.estado==="completado"?"OK":"?"}</span>
                            </div>
                          </div>
                        ):<span style={{color:"#d1d5db",fontSize:11}}>—</span>}
                      </td>

                      {/* Validador */}
                      <td style={{padding:"10px 10px",textAlign:"center",minWidth:80}}>
                        <div
                          onClick={()=>(hayDifs||c.estado==="diferencia")&&setModalAsignar({conteoId:c.id,tipo:"C3"})}
                          title={(hayDifs||c.estado==="diferencia")?"Clic para asignar C3 y generar reporte":""}
                          style={{width:44,height:44,borderRadius:"50%",background:validColor,display:"flex",alignItems:"center",justifyContent:"center",cursor:(hayDifs||c.estado==="diferencia")?"pointer":"default",boxShadow:"0 2px 8px rgba(0,0,0,0.18)",margin:"0 auto",transition:"transform 0.15s"}}
                          onMouseEnter={e=>{if(hayDifs||c.estado==="diferencia")e.currentTarget.style.transform="scale(1.12)";}}
                          onMouseLeave={e=>{e.currentTarget.style.transform="scale(1)";}}
                        >
                          {validContent}
                        </div>
                        <div style={{fontSize:9,color:"#64748b",marginTop:3,textAlign:"center"}}>
                          {(hayDifs||c.estado==="diferencia")?"→ Asignar C3":validColor==="#16a34a"?"Sin diferencias":"En proceso"}
                        </div>
                      </td>

                      {/* Acciones */}
                      <td style={{padding:"10px 10px",whiteSpace:"nowrap"}}>
                        {["cerradoC1","cerradoC2","completado","diferencia","enC3"].includes(c.estado)&&(
                          <button onClick={()=>reabrir(c.id)} style={{background:"#fef9c3",border:"1px solid #fde047",color:"#92400e",borderRadius:6,padding:"4px 10px",fontSize:11,cursor:"pointer",fontWeight:700}}>🔓 Reabrir</button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal asignar */}
      {modalAsignar&&(
        <Modal titulo={modalAsignar.tipo==="C2"?"Asignar Usuario C2":modalAsignar.tipo==="C3"?"Asignar Usuario C3 (desempate)":"Agregar usuario de apoyo"} onClose={()=>setModalAsignar(null)}>
          <div style={{marginBottom:14,fontSize:13,color:"#64748b"}}>
            {modalAsignar.tipo==="C2"&&"Este usuario hará el segundo conteo completo."}
            {modalAsignar.tipo==="C3"&&"Este usuario contará solo los productos con diferencia entre C1 y C2."}
            {modalAsignar.tipo==="extra"&&"Este usuario ayudará pero no podrá cerrar el conteo."}
          </div>
          <Lbl>Seleccionar usuario</Lbl>
          <Sel defaultValue="" onChange={e=>{
            if(!e.target.value)return;
            const u=e.target.value;
            const{conteoId,tipo}=modalAsignar;
            if(tipo==="C2")asignarC2(conteoId,u);
            else if(tipo==="C3")asignarC3(conteoId,u);
            else agregarUsuarioExtra(conteoId,u);
            setModalAsignar(null);
          }} style={{marginBottom:20}}>
            <option value="">Seleccionar…</option>
            {G.usuarios.filter(u=>u.activo).map(u=><option key={u.id}>{u.nombre}</option>)}
          </Sel>
          <Btn c="#64748b" onClick={()=>setModalAsignar(null)} full>Cancelar</Btn>
        </Modal>
      )}
    </div>
  );
}
// ── REPORTES ──
function VReportes({G,showToast,usuario}){
  const [verDifs,setVerDifs]=useState(false);
  const caps=Object.values(G.capturas);

  const expXLSX=(data,cols,fname,titulo)=>{
    const ws=XLSX.utils.aoa_to_sheet([[titulo],["Usuario: "+usuario.nombre+" | "+TODAY()+" | "+HOUR()],[],cols,...data]);
    const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,"Reporte");XLSX.writeFile(wb,fname);showToast("Exportado ✓");
  };

  const expPDF=(difs,conteoNombre)=>{
    const rows=difs.map(d=>`<tr><td>${d.codigo}</td><td>${d.ean||""}</td><td>${d.nombre}</td><td>${d.referencia}</td><td style="text-align:center">${d.c1}</td><td style="text-align:center">${d.c2}</td><td style="text-align:center;color:red;font-weight:bold">${d.dif>0?"+"+d.dif:d.dif}</td><td>${d.u1}</td><td>${d.u2}</td><td style="border:2px solid #000;min-width:80px">&nbsp;</td></tr>`).join("");
    const html=`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Diferencias ${conteoNombre}</title>
    <style>body{font-family:Arial,sans-serif;padding:20px;font-size:11px}h2{color:#1e40af}table{width:100%;border-collapse:collapse}th{background:#0f172a;color:white;padding:7px}td{padding:6px;border:1px solid #e2e8f0}tr:nth-child(even){background:#f8fafc}</style></head>
    <body><h2>Reporte Diferencias de Conteos</h2><p><b>Conteo:</b> ${conteoNombre} &nbsp;|&nbsp; <b>Fecha:</b> ${TODAY()} &nbsp;|&nbsp; <b>Usuario:</b> ${usuario.nombre}</p>
    <table><thead><tr><th>Código</th><th>EAN</th><th>Nombre</th><th>Referencia</th><th>C1</th><th>C2</th><th>Diferencia</th><th>Usuario C1</th><th>Usuario C2</th><th>Conteo 3</th></tr></thead><tbody>${rows}</tbody></table>
    <script>window.onload=()=>window.print();</script></body></html>`;
    const w=window.open("","_blank");w.document.write(html);w.document.close();
  };

  // Diferencias por conteo
  const conteosDifs=G.conteos.map(c=>{
    if(c.tipo!=="2conteos")return null;
    const difs=[];
    G.productos.forEach(p=>{
      const t1=caps.filter(x=>x.conteoId===c.id&&x.productoId===p.id&&x.ronda==="C1").reduce((s,x)=>s+x.cantidad,0);
      const t2=caps.filter(x=>x.conteoId===c.id&&x.productoId===p.id&&x.ronda==="C2").reduce((s,x)=>s+x.cantidad,0);
      if((t1>0||t2>0)&&t1!==t2){
        const u1=caps.find(x=>x.conteoId===c.id&&x.productoId===p.id&&x.ronda==="C1")?.usuario||"";
        const u2=caps.find(x=>x.conteoId===c.id&&x.productoId===p.id&&x.ronda==="C2")?.usuario||"";
        difs.push({...p,c1:t1,c2:t2,dif:t1-t2,u1,u2});
      }
    });
    return difs.length>0?{conteo:c,difs}:null;
  }).filter(Boolean);

  const totalDifs=conteosDifs.reduce((s,x)=>s+x.difs.length,0);

  const contadoIds=new Set(caps.map(c=>c.productoId));
  const sinConteo=G.productos.filter(p=>!contadoIds.has(p.id));

  const capFinal=G.productos.map(p=>{
    const misC=caps.filter(c=>c.productoId===p.id);
    if(!misC.length)return null;
    // Agrupar por ronda sumando
    const sumC1=misC.filter(c=>c.ronda==="C1").reduce((s,c)=>s+c.cantidad,0);
    const sumC2=misC.filter(c=>c.ronda==="C2").reduce((s,c)=>s+c.cantidad,0);
    const sumC3=misC.filter(c=>c.ronda==="C3").reduce((s,c)=>s+c.cantidad,0);
    const final=sumC3||sumC2||sumC1;
    const last=misC[misC.length-1];
    // Find conteo info
    const conteoId=last.conteoId;
    const conteo=G.conteos.find(c=>c.id===conteoId);
    return{
      ...p,
      ubicacion:conteo?.ubicacion||"",
      localizacion:conteo?.localizacion||"",
      nro:conteo?.nro||"",
      c1:sumC1||"",c2:sumC2||"",c3:sumC3||"",
      cantFinal:final,
      diferencia:final-p.saldo,
      valDif:(final-p.saldo)*p.costo,
      estado:last.estado||"",
      obs:last.obs||"",
      usuario:last.usuario,
    };
  }).filter(Boolean);

  // BASE COMPLETA: recorre TODOS los productos de la base de datos.
  // Los no contados cuentan como físico = 0 (faltante total).
  const capByProd={};
  caps.forEach(c=>{
    if(!capByProd[c.productoId])capByProd[c.productoId]={c1:0,c2:0,c3:0,last:null};
    const r=capByProd[c.productoId];
    if(c.ronda==="C1")r.c1+=c.cantidad;else if(c.ronda==="C2")r.c2+=c.cantidad;else if(c.ronda==="C3")r.c3+=c.cantidad;
    r.last=c;
  });
  const baseCompleta=G.productos.map(p=>{
    const r=capByProd[p.id];
    const sumC1=r?r.c1:0,sumC2=r?r.c2:0,sumC3=r?r.c3:0;
    const contado=!!r;
    const final=contado?(sumC3||sumC2||sumC1):0;
    const last=r?r.last:null;
    const conteo=last?G.conteos.find(c=>c.id===last.conteoId):null;
    return{
      ...p,
      ubicacion:conteo?.ubicacion||p.ubicacion||"",
      localizacion:conteo?.localizacion||p.localizacion||"",
      nro:conteo?.nro||"",
      c1:sumC1||"",c2:sumC2||"",c3:sumC3||"",
      cantFinal:final,
      contado,
      diferencia:final-(p.saldo||0),
      valDif:(final-(p.saldo||0))*(p.costo||0),
      estado:contado?(last.estado||""):"SIN CONTAR",
      obs:last?.obs||"",
      usuario:last?.usuario||"",
    };
  });
  // Diferencia sobre toda la base: cualquier producto cuyo físico != saldo sistema
  const difBase=baseCompleta.filter(c=>c.diferencia!==0);
  const valorAjusteTotal=baseCompleta.reduce((s,c)=>s+c.valDif,0);

  return(
    <Section>
      {/* Header estilo procesos */}
      <div style={{background:"linear-gradient(135deg,#7c3aed 0%,#2563eb 100%)",borderRadius:16,padding:"20px 24px",marginBottom:20,color:"white",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div>
          <div style={{fontSize:11,fontWeight:600,opacity:0.75,letterSpacing:1,textTransform:"uppercase",marginBottom:4}}>Análisis</div>
          <div style={{fontSize:22,fontWeight:800,letterSpacing:-0.5}}>Reportes</div>
          <div style={{fontSize:12,opacity:0.8,marginTop:4}}>{G.inventario?.nombre||"Inventario activo"}</div>
        </div>
        <div style={{textAlign:"right"}}>
          <div style={{fontSize:28,fontWeight:900,letterSpacing:-1}}>{G.productos.length}</div>
          <div style={{fontSize:11,opacity:0.8}}>productos base</div>
        </div>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(240px,1fr))",gap:16}}>

        {/* Diferencias de Conteos — expandible */}
        <div style={{...card,border:"1px solid #fecaca"}}>
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}>
            <div style={{width:40,height:40,background:"#fef2f2",borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20}}>🔄</div>
            <div>
              <div style={{fontWeight:700,fontSize:14,color:"#0f172a"}}>Diferencias de Conteos</div>
              <div style={{fontSize:11,color:"#64748b"}}>C1 ≠ C2 — por conteo</div>
            </div>
          </div>
          <div style={{background:"#fef2f2",borderRadius:10,padding:"10px",fontSize:28,fontWeight:900,color:"#dc2626",textAlign:"center",marginBottom:12}}>{totalDifs}</div>
          <Btn c="#dc2626" onClick={()=>setVerDifs(v=>!v)} full>{verDifs?"Ocultar diferencias":"Ver diferencias"}</Btn>
          {verDifs&&(
            <div style={{marginTop:12}}>
              {conteosDifs.length===0?(
                <div style={{background:"#f0fdf4",borderRadius:8,padding:"10px 14px",fontSize:13,color:"#166534",fontWeight:600}}>✅ Ningún conteo presentó diferencias</div>
              ):conteosDifs.map(({conteo:c,difs},i)=>(
                <div key={i} style={{background:"#fef2f2",border:"1px solid #fecaca",borderRadius:8,padding:"10px 14px",marginBottom:10}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                    <div>
                      <div style={{fontWeight:700,fontSize:13,color:"#dc2626"}}>{c.nombre}</div>
                      <div style={{fontSize:11,color:"#64748b"}}>📍 {c.locLabel} · {difs.length} productos</div>
                    </div>
                    <div style={{display:"flex",gap:6}}>
                      <button onClick={()=>expPDF(difs,c.nombre)}
                        style={{background:"#dc2626",color:"white",border:"none",borderRadius:6,padding:"4px 10px",fontSize:11,cursor:"pointer",fontWeight:700}}>🖨️ PDF</button>
                      <button onClick={()=>expXLSX(difs.map(d=>[d.codigo,d.ean||"",d.nombre,d.referencia,d.c1,d.c2,d.dif,d.u1,d.u2]),["CODIGO","EAN","NOMBRE","REFERENCIA","C1","C2","DIFERENCIA","USUARIO_C1","USUARIO_C2"],`difs_${c.nombre?.replace(/ /g,"_")}.xlsx`,`DIFERENCIAS ${c.nombre}`)}
                        style={{background:"#1e40af",color:"white",border:"none",borderRadius:6,padding:"4px 10px",fontSize:11,cursor:"pointer",fontWeight:700}}>⬇ Excel</button>
                    </div>
                  </div>
                  <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
                    <thead><tr style={{background:"#fecaca"}}>
                      {["Código","EAN","Nombre","C1","C2","Dif","U.C1","U.C2"].map(h=><th key={h} style={{padding:"4px 8px",textAlign:"left",fontWeight:700}}>{h}</th>)}
                    </tr></thead>
                    <tbody>
                      {difs.map((d,j)=>(
                        <tr key={j} style={{borderBottom:"1px solid #fee2e2",background:j%2?"#fff5f5":"white"}}>
                          <td style={{padding:"4px 8px",fontFamily:"monospace"}}>{d.codigo}</td>
                          <td style={{padding:"4px 8px",fontSize:10,color:"#64748b"}}>{d.ean||"—"}</td>
                          <td style={{padding:"4px 8px",fontWeight:500}}>{d.nombre.substring(0,25)}</td>
                          <td style={{padding:"4px 8px",textAlign:"center",fontWeight:700}}>{d.c1}</td>
                          <td style={{padding:"4px 8px",textAlign:"center",fontWeight:700}}>{d.c2}</td>
                          <td style={{padding:"4px 8px",textAlign:"center",fontWeight:700,color:"#dc2626"}}>{d.dif>0?"+"+d.dif:d.dif}</td>
                          <td style={{padding:"4px 8px",color:"#64748b"}}>{d.u1}</td>
                          <td style={{padding:"4px 8px",color:"#64748b"}}>{d.u2}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sin Conteo */}
        <div style={{...card,border:"1px solid #fed7aa"}}>
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}>
            <div style={{width:40,height:40,background:"#fffbeb",borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20}}>⚪</div>
            <div><div style={{fontWeight:700,fontSize:14,color:"#0f172a"}}>Sin Conteo</div><div style={{fontSize:11,color:"#64748b"}}>Productos no inventariados</div></div>
          </div>
          <div style={{background:"#fffbeb",borderRadius:10,padding:"10px",fontSize:28,fontWeight:900,color:"#d97706",textAlign:"center",marginBottom:12}}>{sinConteo.length}</div>
          <Btn c="#d97706" onClick={()=>expXLSX(sinConteo.map(p=>[p.codigo,p.nombre,p.referencia,p.categoria,p.subcategoria,p.subgrupo,p.saldo,p.costo,p.nit,p.proveedor]),["CODIGO","NOMBRE","REFERENCIA","CATEGORIA","SUBCATEGORIA","SUBGRUPO","SALDO","COSTO","NIT","PROVEEDOR"],"sin_conteo.xlsx","REPORTE SIN CONTEOS")} full>⬇ Exportar Excel</Btn>
        </div>

        {/* Diferencia Inventario */}
        <div style={{...card,border:"1px solid #bfdbfe"}}>
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}>
            <div style={{width:40,height:40,background:"#eff6ff",borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20}}>⚖️</div>
            <div><div style={{fontWeight:700,fontSize:14,color:"#0f172a"}}>Diferencia Inventario</div><div style={{fontSize:11,color:"#64748b"}}>Físico vs Sistema · base completa</div></div>
          </div>
          <div style={{background:"#eff6ff",borderRadius:10,padding:"10px",fontSize:28,fontWeight:900,color:"#2563eb",textAlign:"center",marginBottom:12}}>{baseCompleta.length}</div>
          <Btn c="#2563eb" onClick={()=>expXLSX(baseCompleta.map(c=>[c.codigo,c.nombre,c.referencia,c.costo||0,c.saldo,c.cantFinal,c.diferencia,Math.round(c.valDif),c.estado||"",c.categoria||"",c.subcategoria||"",c.subgrupo||"",c.nit||"",c.proveedor||""]),["CODIGO","NOMBRE","REFERENCIA","COSTO","SALDO","CANTIDAD","DIFERENCIA","VALOR_DIF","ESTADO","CATEGORIA","SUBCATEGORIA","SUBGRUPO","NIT","PROVEEDOR"],"diferencia_inventario.xlsx","DIFERENCIA INVENTARIOS")} disabled={baseCompleta.length===0} full>⬇ Exportar Excel</Btn>
        </div>

        {/* Ajuste */}
        <div style={{...card,border:"1px solid #bbf7d0"}}>
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}>
            <div style={{width:40,height:40,background:"#f0fdf4",borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20}}>🔧</div>
            <div><div style={{fontWeight:700,fontSize:14,color:"#0f172a"}}>Ajuste de Inventario</div><div style={{fontSize:11,color:"#64748b"}}>Código · Cantidad · Fecha · base completa</div></div>
          </div>
          <div style={{background:"#f0fdf4",borderRadius:10,padding:"10px",fontSize:28,fontWeight:900,color:"#16a34a",textAlign:"center",marginBottom:12}}>{baseCompleta.length}</div>
          <Btn c="#16a34a" onClick={()=>expXLSX(baseCompleta.map(c=>[c.codigo,c.cantFinal,c.saldo,c.diferencia,TODAY(),c.ubicacion||"BODEGA"]),["CODIGO","CANTIDAD","SALDO","DIFERENCIA","FECH_CORTE","BODEGA"],"ajuste_inventario.xlsx","AJUSTE INVENTARIO")} disabled={baseCompleta.length===0} full>⬇ Exportar Excel</Btn>
        </div>

        {/* Reporte de Captura */}
        <div style={{...card,border:"1px solid #ddd6fe"}}>
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}>
            <div style={{width:40,height:40,background:"#faf5ff",borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20}}>📄</div>
            <div><div style={{fontWeight:700,fontSize:14,color:"#0f172a"}}>Reporte de Captura</div><div style={{fontSize:11,color:"#64748b"}}>C1·C2·C3 en columnas · con ubicación</div></div>
          </div>
          <div style={{background:"#faf5ff",borderRadius:10,padding:"10px",fontSize:28,fontWeight:900,color:"#7c3aed",textAlign:"center",marginBottom:12}}>{capFinal.length}</div>
          <Btn c="#7c3aed" onClick={()=>expXLSX(
            capFinal.map(c=>[c.ean,c.codigo,c.nombre,c.referencia,c.categoria,c.subcategoria,c.subgrupo,c.ubicacion,c.localizacion,c.nro,c.c1||"",c.c2||"",c.c3||"",c.cantFinal,c.costo,c.fecha||TODAY(),c.estado,c.obs||"",c.usuario,c.nit,c.proveedor]),
            ["EAN","CODIGO","NOMBRE","REFERENCIA","CATEGORIA","SUBCATEGORIA","SUBGRUPO","UBICACION","LOCALIZACION","N_LOCAL","CONTEO_1","CONTEO_2","CONTEO_3","CANTIDAD_FINAL","COSTO","FECHA","ESTADO","OBS","USUARIO","NIT","PROVEEDOR"],
            "captura_inventario.xlsx","CAPTURA INVENTARIO"
          )} disabled={capFinal.length===0} full>⬇ Exportar Excel</Btn>
        </div>

      </div>
    </Section>
  );
}

// ── USUARIOS ──
function VUsuarios({G,rerender,showToast}){
  const [modal,setModal]=useState(false);
  const [modalImport,setModalImport]=useState(false);
  const [modalConfirmDel,setModalConfirmDel]=useState(null);
  const [form,setForm]=useState({nombre:"",pass:"",rol:"capturador",correo:"",telefono:"",editId:null});
  const [previewUsuarios,setPreviewUsuarios]=useState(null);
  const URL_APP="http://localhost:5173";

  // Generar contraseña automática: primeras 3 letras del nombre + últimos 4 del teléfono
  const generarPass=(nombre,telefono)=>{
    const n=(nombre||"").toUpperCase().replace(/[^A-Z]/g,"").substring(0,3).padEnd(3,"X");
    const t=(telefono||"").replace(/\D/g,"");
    const nums=t.length>=4?t.slice(-4):"1234";
    return n+nums;
  };

  const guardar=()=>{
    if(!form.nombre.trim()||!form.pass.trim())return showToast("Completa nombre y contraseña","err");
    if(form.editId){
      G.usuarios=G.usuarios.map(u=>u.id===form.editId?{...u,...form,nombre:form.nombre.toUpperCase(),id:u.id}:u);
    } else {
      if(G.usuarios.find(u=>u.nombre===form.nombre.toUpperCase()))return showToast("Ya existe ese usuario","err");
      G.usuarios.push({id:ID(),nombre:form.nombre.toUpperCase(),pass:form.pass,rol:form.rol,correo:form.correo,telefono:form.telefono,activo:true,creado:TODAY()});
    }
    setModal(false);setForm({nombre:"",pass:"",rol:"capturador",correo:"",telefono:"",editId:null});
    rerender();showToast(form.editId?"Actualizado ✓":"Usuario creado ✓");
  };

  const copiarAcceso=(u)=>{
    const msg=`Hola ${u.nombre}! Aquí tus datos para el sistema TOMFIC:\n🔗 Link: ${URL_APP}\n👤 Usuario: ${u.nombre}\n🔑 Contraseña: ${u.pass}\n\nIngresa con estos datos para hacer el inventario.`;
    navigator.clipboard?.writeText(msg).then(()=>showToast("Copiado al portapapeles ✓")).catch(()=>showToast("No se pudo copiar","err"));
  };

  const eliminar=(u)=>{
    // Verificar si tiene conteos activos
    const tieneConteos=G.conteos.some(c=>
      (c.usuarioC1===u.nombre||c.usuarioC2===u.nombre||c.usuarioC3===u.nombre)&&
      !["completado"].includes(c.estado)
    );
    if(tieneConteos)return showToast("Este usuario tiene conteos activos. Reasígnalos antes de eliminar.","err");
    G.usuarios=G.usuarios.filter(x=>x.id!==u.id);
    setModalConfirmDel(null);rerender();showToast("Usuario eliminado ✓","warn");
  };

  // Importar usuarios desde Excel
  const importarExcel=(e)=>{
    const file=e.target.files[0];if(!file)return;
    const reader=new FileReader();
    reader.onload=(ev)=>{
      const wb=XLSX.read(ev.target.result,{type:"binary"});
      const ws=wb.Sheets[wb.SheetNames[0]];
      const data=XLSX.utils.sheet_to_json(ws,{defval:""});
      if(!data.length)return showToast("Archivo vacío","err");
      // Normalizar columnas
      const normalize=(row)=>{const n={};Object.keys(row).forEach(k=>{n[k.trim().toUpperCase()]=row[k];});return n;};
      const usuarios=data.map((rawRow,i)=>{
        const row=normalize(rawRow);
        const nombre=String(row.NOMBRE||row.USUARIO||row.NAME||"").trim().toUpperCase();
        const correo=String(row.CORREO||row.EMAIL||row.MAIL||"").trim();
        const telefono=String(row.TELEFONO||row.CELULAR||row.WHATSAPP||row.TEL||"").trim();
        const rol=(String(row.ROL||row.ROLE||"capturador").trim().toLowerCase().includes("admin"))?"admin":"capturador";
        if(!nombre)return null;
        const pass=generarPass(nombre,telefono);
        return{nombre,correo,telefono,rol,pass};
      }).filter(Boolean);
      if(!usuarios.length)return showToast("No se encontraron usuarios válidos","err");
      setPreviewUsuarios(usuarios);
    };
    reader.readAsBinaryString(file);
    e.target.value="";
  };

  const confirmarImportUsuarios=()=>{
    let creados=0,duplicados=0;
    previewUsuarios.forEach(u=>{
      if(G.usuarios.find(x=>x.nombre===u.nombre)){duplicados++;return;}
      G.usuarios.push({id:ID(),nombre:u.nombre,pass:u.pass,rol:u.rol,correo:u.correo,telefono:u.telefono,activo:true,creado:TODAY()});
      creados++;
    });
    setPreviewUsuarios(null);setModalImport(false);rerender();
    showToast(`✓ ${creados} usuarios creados${duplicados>0?` · ${duplicados} duplicados omitidos`:""}`);
  };

  // Descargar plantilla Excel
  const descargarPlantilla=()=>{
    const ws=XLSX.utils.aoa_to_sheet([
      ["NOMBRE","CORREO","TELEFONO","ROL"],
      ["JUAN PEREZ","juan@ejemplo.com","3001234567","capturador"],
      ["MARIA LOPEZ","maria@ejemplo.com","3109876543","capturador"],
      ["PEDRO ADMIN","pedro@empresa.com","3201111111","admin"],
    ]);
    const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,"Usuarios");
    XLSX.writeFile(wb,"plantilla_usuarios_tomfic.xlsx");
    showToast("Plantilla descargada ✓");
  };

  const admins=G.usuarios.filter(u=>u.rol==="admin");
  const caps=G.usuarios.filter(u=>u.rol==="capturador");
  const activos=G.usuarios.filter(u=>u.activo);
  return(
    <Section>
      {/* Header estilo procesos */}
      <div style={{background:"linear-gradient(135deg,#7c3aed 0%,#4f46e5 100%)",borderRadius:16,padding:"20px 24px",marginBottom:20,color:"white",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div>
          <div style={{fontSize:11,fontWeight:600,opacity:0.75,letterSpacing:1,textTransform:"uppercase",marginBottom:4}}>Accesos</div>
          <div style={{fontSize:22,fontWeight:800,letterSpacing:-0.5}}>Gestión de Usuarios</div>
          <div style={{fontSize:12,opacity:0.8,marginTop:4}}>{activos.length} activos · {admins.length} admin · {caps.length} capturadores</div>
        </div>
        <div style={{textAlign:"right"}}>
          <div style={{fontSize:28,fontWeight:900,letterSpacing:-1}}>{G.usuarios.length}</div>
          <div style={{fontSize:11,opacity:0.8}}>usuarios</div>
        </div>
      </div>
      <div style={{display:"flex",gap:10,marginBottom:16,flexWrap:"wrap"}}>
        <Btn c="#16a34a" onClick={()=>{setForm({nombre:"",pass:"",rol:"capturador",correo:"",telefono:"",editId:null});setModal(true);}}>+ Crear Usuario</Btn>
        <Btn c="#2563eb" onClick={()=>setModalImport(true)}>⬆ Importar desde Excel</Btn>
      </div>

      <div style={{...card,padding:0,overflow:"hidden"}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
          <thead><tr style={{background:"#0f172a",color:"white"}}>
            {["Usuario","Contraseña","Contacto","Rol","Creado","Estado","Acciones"].map(h=>(
              <th key={h} style={{padding:"10px 14px",textAlign:"left",fontWeight:600}}>{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {G.usuarios.map((u,i)=>(
              <tr key={u.id} style={{background:i%2?"#f8fafc":"white",borderBottom:"1px solid #f1f5f9"}}>
                <td style={{padding:"9px 14px"}}>
                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                    <div style={{width:30,height:30,background:u.rol==="admin"?"#1e40af":"#16a34a",borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",color:"white",fontSize:12,fontWeight:800}}>{u.nombre[0]}</div>
                    <b>{u.nombre}</b>
                  </div>
                </td>
                <td style={{padding:"9px 14px",fontFamily:"monospace",fontSize:12,color:"#64748b"}}>{u.pass}</td>
                <td style={{padding:"9px 14px",fontSize:12,color:"#64748b"}}>
                  {u.correo&&<div>✉️ {u.correo}</div>}
                  {u.telefono&&<div>📱 {u.telefono}</div>}
                  {!u.correo&&!u.telefono&&<span style={{color:"#d1d5db"}}>—</span>}
                </td>
                <td style={{padding:"9px 14px"}}><Badge color={u.rol==="admin"?"#2563eb":u.rol==="gerente"?"#7c3aed":"#16a34a"}>{u.rol==="admin"?"ADMIN":u.rol==="gerente"?"GERENTE":"CAPTURADOR"}</Badge></td>
                <td style={{padding:"9px 14px",color:"#64748b"}}>{u.creado}</td>
                <td style={{padding:"9px 14px"}}><Badge color={u.activo?"#16a34a":"#dc2626"}>{u.activo?"ACTIVO":"INACTIVO"}</Badge></td>
                <td style={{padding:"9px 14px"}}>
                  <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                    <Btn c="#2563eb" small onClick={()=>{setForm({nombre:u.nombre,pass:u.pass,rol:u.rol,correo:u.correo||"",telefono:u.telefono||"",editId:u.id});setModal(true);}}>Editar</Btn>
                    <button onClick={()=>copiarAcceso(u)} style={{background:"#25d366",color:"white",border:"none",borderRadius:6,padding:"4px 10px",cursor:"pointer",fontWeight:700,fontSize:11}}>📋 Copiar</button>
                    {u.nombre!=="ADMIN"&&<Btn c={u.activo?"#d97706":"#16a34a"} small onClick={()=>{G.usuarios=G.usuarios.map(x=>x.id===u.id?{...x,activo:!x.activo}:x);rerender();}}>{u.activo?"Desactivar":"Activar"}</Btn>}
                    {u.nombre!=="ADMIN"&&<button onClick={()=>setModalConfirmDel(u)} style={{background:"#fef2f2",color:"#dc2626",border:"1px solid #fecaca",borderRadius:6,padding:"4px 10px",cursor:"pointer",fontWeight:700,fontSize:11}}>Eliminar</button>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal crear/editar */}
      {modal&&(
        <Modal titulo={form.editId?"Editar Usuario":"Crear Usuario"} onClose={()=>setModal(false)}>
          <Lbl>Nombre de usuario</Lbl>
          <Inp value={form.nombre} onChange={e=>{
            const n=e.target.value.toUpperCase();
            const autoPass=generarPass(n,form.telefono);
            setForm(p=>({...p,nombre:n,...(!p.editId?{pass:autoPass}:{})}));
          }} disabled={!!form.editId} placeholder="Ej: JUAN" style={{marginBottom:14}}/>
          <Lbl>Contraseña (auto-generada, puedes cambiarla)</Lbl>
          <Inp value={form.pass} onChange={e=>setForm(p=>({...p,pass:e.target.value}))} placeholder="••••••" style={{marginBottom:14}}/>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:14}}>
            <div>
              <Lbl>Correo electrónico</Lbl>
              <Inp value={form.correo} onChange={e=>setForm(p=>({...p,correo:e.target.value}))} placeholder="correo@ejemplo.com"/>
            </div>
            <div>
              <Lbl>Teléfono / WhatsApp</Lbl>
              <Inp value={form.telefono} onChange={e=>{
                const t=e.target.value;
                const autoPass=generarPass(form.nombre,t);
                setForm(p=>({...p,telefono:t,...(!p.editId?{pass:autoPass}:{})}));
              }} placeholder="3001234567"/>
            </div>
          </div>
          <div style={{background:"#eff6ff",borderRadius:8,padding:"8px 12px",marginBottom:14,fontSize:12,color:"#2563eb"}}>
            🔑 Contraseña auto-generada: <b>{generarPass(form.nombre,form.telefono)}</b> · Puedes cambiarla manualmente arriba.
          </div>
          <Lbl>Rol</Lbl>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:16}}>
            {[["capturador","Capturador","Solo captura"],["admin","Administrador","Acceso total"],["gerente","Gerente","Solo lectura"]].map(([v,t,s])=>(
              <div key={v} onClick={()=>setForm(p=>({...p,rol:v}))} style={{border:`2px solid ${form.rol===v?"#2563eb":"#e2e8f0"}`,borderRadius:10,padding:12,cursor:"pointer",background:form.rol===v?"#eff6ff":"white"}}>
                <div style={{fontWeight:700,color:form.rol===v?"#2563eb":"#0f172a",fontSize:13}}>{t}</div>
                <div style={{fontSize:11,color:"#64748b",marginTop:2}}>{s}</div>
              </div>
            ))}
          </div>
          <div style={{background:"#f0fdf4",borderRadius:8,padding:"10px 14px",marginBottom:16,fontSize:12,color:"#166534"}}>
            📋 Después de crear el usuario usa el botón <b>Copiar</b> para enviarle los datos por WhatsApp.
          </div>
          <Btn c="#2563eb" onClick={guardar} full>{form.editId?"Actualizar":"Crear Usuario"}</Btn>
        </Modal>
      )}

      {/* Modal importar */}
      {modalImport&&(
        <Modal titulo="Importar Usuarios desde Excel" onClose={()=>{setModalImport(false);setPreviewUsuarios(null);}} wide>
          {!previewUsuarios?(
            <>
              <div style={{background:"#eff6ff",borderRadius:10,padding:14,marginBottom:16,fontSize:13,color:"#1e40af"}}>
                <b>Columnas requeridas en el Excel:</b><br/>
                <span style={{fontFamily:"monospace"}}>NOMBRE · CORREO · TELEFONO · ROL</span><br/>
                <span style={{fontSize:12,color:"#64748b",marginTop:4,display:"block"}}>
                  La contraseña se genera automáticamente: primeras 3 letras del nombre + últimos 4 dígitos del teléfono.<br/>
                  Ejemplo: JUAN con tel. 3001234567 → contraseña: <b style={{fontFamily:"monospace"}}>JUA4567</b>
                </span>
              </div>
              <div style={{display:"flex",gap:10,marginBottom:16}}>
                <label style={{padding:"9px 18px",background:"#2563eb",color:"white",border:"none",borderRadius:8,cursor:"pointer",fontWeight:700,fontSize:13,flex:1,textAlign:"center"}}>
                  📂 Seleccionar archivo Excel
                  <input type="file" accept=".xlsx,.xls" onChange={importarExcel} style={{display:"none"}}/>
                </label>
                <button onClick={descargarPlantilla} style={{padding:"9px 18px",background:"#f8fafc",border:"1.5px solid #e2e8f0",color:"#374151",borderRadius:8,cursor:"pointer",fontWeight:700,fontSize:13}}>
                  ⬇ Plantilla
                </button>
              </div>
              <div style={{background:"#fef9c3",borderRadius:8,padding:"8px 12px",fontSize:12,color:"#92400e"}}>
                💡 Descarga la plantilla de ejemplo para ver el formato correcto.
              </div>
            </>
          ):(
            <>
              <div style={{fontWeight:700,fontSize:14,color:"#0f172a",marginBottom:12}}>
                Vista previa — {previewUsuarios.length} usuarios detectados
              </div>
              <div style={{maxHeight:320,overflowY:"auto",marginBottom:16}}>
                <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
                  <thead><tr style={{background:"#0f172a",color:"white",position:"sticky",top:0}}>
                    {["Nombre","Contraseña","Correo","Teléfono","Rol"].map(h=>(
                      <th key={h} style={{padding:"7px 10px",textAlign:"left",fontWeight:600}}>{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {previewUsuarios.map((u,i)=>{
                      const duplicado=G.usuarios.find(x=>x.nombre===u.nombre);
                      return(
                        <tr key={i} style={{background:duplicado?"#fef9c3":i%2?"#f8fafc":"white",borderBottom:"1px solid #f1f5f9"}}>
                          <td style={{padding:"6px 10px",fontWeight:700}}>{u.nombre}{duplicado&&<span style={{fontSize:10,color:"#d97706",marginLeft:6}}>⚠️ Duplicado</span>}</td>
                          <td style={{padding:"6px 10px",fontFamily:"monospace",color:"#2563eb"}}>{u.pass}</td>
                          <td style={{padding:"6px 10px",color:"#64748b"}}>{u.correo||"—"}</td>
                          <td style={{padding:"6px 10px",color:"#64748b"}}>{u.telefono||"—"}</td>
                          <td style={{padding:"6px 10px"}}><Badge color={u.rol==="admin"?"#2563eb":"#16a34a"} small>{u.rol==="admin"?"ADMIN":"CAPTURADOR"}</Badge></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div style={{display:"flex",gap:10}}>
                <Btn c="#16a34a" onClick={confirmarImportUsuarios} full>✓ Confirmar importación</Btn>
                <Btn c="#dc2626" outline onClick={()=>setPreviewUsuarios(null)} full>← Volver</Btn>
              </div>
            </>
          )}
        </Modal>
      )}

      {/* Modal confirmar eliminación */}
      {modalConfirmDel&&(
        <Modal titulo="Eliminar Usuario" onClose={()=>setModalConfirmDel(null)}>
          <div style={{background:"#fef2f2",border:"1px solid #fecaca",borderRadius:10,padding:16,marginBottom:20,fontSize:14,color:"#dc2626"}}>
            ¿Estás seguro de que deseas eliminar al usuario <b>{modalConfirmDel.nombre}</b>?<br/>
            <span style={{fontSize:12,marginTop:4,display:"block"}}>Esta acción no se puede deshacer.</span>
          </div>
          <div style={{display:"flex",gap:10}}>
            <Btn c="#dc2626" onClick={()=>eliminar(modalConfirmDel)} full>Sí, eliminar</Btn>
            <Btn c="#64748b" onClick={()=>setModalConfirmDel(null)} full>Cancelar</Btn>
          </div>
        </Modal>
      )}
    </Section>
  );
}



// ── HISTORIAL ──
// ── HISTORIAL / DASHBOARD ──

function VHistorial({G,showToast,usuario}){
  const [invSel,setInvSel]=useState(null);
  const [cardDetalle,setCardDetalle]=useState(null);
  const [confirmElim,setConfirmElim]=useState(null); // índice del historial a eliminar

  const getSt=(inv)=>{
    // Usar solo las capturas del snapshot de ese inventario
    const caps=Object.values(inv.capturas||{});
    const prods=inv.productos||[];
    // Agrupar capturas por producto (sumatoria por ronda)
    const porProd={};
    caps.forEach(c=>{
      if(!porProd[c.productoId])porProd[c.productoId]={...c,totalC1:0,totalC2:0,totalC3:0};
      if(c.ronda==="C1")porProd[c.productoId].totalC1+=c.cantidad;
      if(c.ronda==="C2")porProd[c.productoId].totalC2+=c.cantidad;
      if(c.ronda==="C3")porProd[c.productoId].totalC3+=c.cantidad;
    });
    const resumen=Object.values(porProd).map(r=>{
      const final=r.totalC3||r.totalC2||r.totalC1;
      return{...r,cantFinal:final};
    });
    const totalFisico=resumen.reduce((s,r)=>s+(r.cantFinal*(r.costo||0)),0);
    const totalSistema=prods.reduce((s,p)=>s+(p.saldo*(p.costo||0)),0);
    const buenos=resumen.filter(r=>{const last=caps.filter(c=>c.productoId===r.productoId).pop();return last?.estado==="BUENO";});
    const vencidos=resumen.filter(r=>{const last=caps.filter(c=>c.productoId===r.productoId).pop();return last?.estado==="VENCIDO";});
    const averiados=resumen.filter(r=>{const last=caps.filter(c=>c.productoId===r.productoId).pop();return["AVERIADO","NO APTO VENTA"].includes(last?.estado);});
    const conDif=resumen.filter(r=>{const p=prods.find(x=>x.id===r.productoId);return p&&r.cantFinal!==p.saldo;});
    return{totalFisico,totalSistema,ajuste:totalFisico-totalSistema,buenos,vencidos,averiados,conDif,resumen,contados:resumen.length,totalProductos:prods.length,caps};
  };

  const fmt=(n)=>"$"+Math.round(n).toLocaleString("es-CO");

  const expXLSX=(data,cols,fname,titulo)=>{
    const ws=XLSX.utils.aoa_to_sheet([[titulo],[TODAY()],[],cols,...data]);
    const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,"Historial");XLSX.writeFile(wb,fname);showToast("Exportado ✓");
  };

  // Modal detalle de tarjeta
  if(cardDetalle){
    return(
      <div style={{minHeight:"100vh",background:"#f1f5f9",fontFamily:"system-ui,sans-serif",padding:20}}>
        <div style={{display:"flex",gap:12,alignItems:"center",marginBottom:16}}>
          <button onClick={()=>setCardDetalle(null)} style={{background:"#f1f5f9",border:"none",borderRadius:8,padding:"7px 14px",cursor:"pointer",fontWeight:600,fontSize:13}}>← Volver</button>
          <h2 style={{margin:0,fontSize:18,fontWeight:700}}>{cardDetalle.titulo}</h2>
        </div>
        <div style={{...card,overflow:"hidden"}}>
          <div style={{overflowX:"auto"}}>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
              <thead><tr style={{background:"#0f172a",color:"white"}}>
                {cardDetalle.cols.map(h=><th key={h} style={{padding:"8px 12px",textAlign:"left",fontWeight:600}}>{h}</th>)}
              </tr></thead>
              <tbody>
                {cardDetalle.lista.length===0?(
                  <tr><td colSpan={cardDetalle.cols.length} style={{padding:20,textAlign:"center",color:"#64748b"}}>Sin registros</td></tr>
                ):cardDetalle.lista.map((row,i)=>(
                  <tr key={i} style={{background:i%2?"#f8fafc":"white",borderBottom:"1px solid #f1f5f9"}}>
                    {row.map((cell,j)=><td key={j} style={{padding:"6px 12px",color:"#374151"}}>{cell}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // Detalle de un inventario
  if(invSel){
    const inv=invSel;
    const st=getSt(inv);
    const stCards=[
      {l:"💰 Valor físico total",v:fmt(st.totalFisico),c:"#16a34a",
       lista:st.resumen.map(r=>[r.codigo,r.nombre,r.referencia,r.cantFinal,r.costo>0?fmt(r.cantFinal*r.costo):"—"]),
       cols:["Código","Nombre","Referencia","Cantidad","Valor"]},
      {l:"📊 Valor sistema",v:fmt(st.totalSistema),c:"#2563eb",
       lista:st.resumen.map(r=>{const p=(inv.productos||[]).find(x=>x.id===r.productoId);return[r.codigo,r.nombre,r.referencia,p?.saldo||0,p?.costo>0?fmt((p?.saldo||0)*p.costo):"—"];}),
       cols:["Código","Nombre","Referencia","Saldo Sistema","Valor Sistema"]},
      {l:"⚖️ Valor ajuste",v:(st.ajuste>=0?"+":"")+fmt(st.ajuste),c:st.ajuste>=0?"#16a34a":"#dc2626",
       lista:st.conDif.map(r=>{const p=(inv.productos||[]).find(x=>x.id===r.productoId);const dif=r.cantFinal-(p?.saldo||0);return[r.codigo,r.nombre,p?.saldo||0,r.cantFinal,dif>0?"+"+dif:dif,fmt(dif*(p?.costo||0))];}),
       cols:["Código","Nombre","Saldo","Físico","Diferencia","Valor Dif"]},
      {l:"📦 Productos contados",v:`${st.contados}/${st.totalProductos}`,c:"#0891b2",
       lista:st.resumen.map(r=>[r.codigo,r.nombre,r.referencia,r.cantFinal,r.estado||""]),
       cols:["Código","Nombre","Referencia","Cantidad","Estado"]},
      {l:"✅ Productos buenos",v:st.buenos.length,c:"#16a34a",
       lista:st.buenos.map(r=>[r.codigo,r.nombre,r.referencia,r.cantFinal]),
       cols:["Código","Nombre","Referencia","Cantidad"]},
      {l:"🔴 Vencidos",v:st.vencidos.length,c:"#dc2626",
       lista:st.vencidos.map(r=>[r.codigo,r.nombre,r.referencia,r.cantFinal]),
       cols:["Código","Nombre","Referencia","Cantidad"]},
      {l:"🟡 Averiados/No aptos",v:st.averiados.length,c:"#d97706",
       lista:st.averiados.map(r=>[r.codigo,r.nombre,r.referencia,r.cantFinal]),
       cols:["Código","Nombre","Referencia","Cantidad"]},
      {l:"⚠️ Con diferencia",v:st.conDif.length,c:"#ef4444",
       lista:st.conDif.map(r=>{const p=(inv.productos||[]).find(x=>x.id===r.productoId);const dif=r.cantFinal-(p?.saldo||0);return[r.codigo,r.nombre,p?.saldo||0,r.cantFinal,dif>0?"+"+dif:dif];}),
       cols:["Código","Nombre","Saldo","Físico","Diferencia"]},
    ];
    return(
      <div>
        <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:16}}>
          <button onClick={()=>setInvSel(null)} style={{background:"#f1f5f9",border:"none",borderRadius:8,padding:"7px 14px",cursor:"pointer",fontWeight:600,fontSize:13}}>← Historial</button>
          <h2 style={{margin:0,fontSize:20,fontWeight:700}}>{inv.nombre}</h2>
          <Badge color={inv.tipo==="2conteos"?"#2563eb":"#16a34a"}>{inv.tipo==="2conteos"?"2 CONTEOS":"1 CONTEO"}</Badge>
        </div>
        <div style={{fontSize:12,color:"#64748b",marginBottom:16}}>📅 {inv.apertura} {inv.horaApertura} → {inv.cierre} {inv.horaCierre} · Por: {inv.usuarioApertura}</div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:12,marginBottom:20}}>
          {stCards.map((s,i)=>(
            <div key={i} onClick={()=>setCardDetalle({titulo:s.l,lista:s.lista,cols:s.cols})}
              style={{...card,borderTop:`3px solid ${s.c}`,padding:"12px 16px",cursor:"pointer",transition:"box-shadow 0.15s"}}
              onMouseEnter={e=>e.currentTarget.style.boxShadow="0 4px 16px rgba(0,0,0,0.12)"}
              onMouseLeave={e=>e.currentTarget.style.boxShadow="0 1px 4px rgba(0,0,0,0.07)"}>
              <div style={{fontSize:typeof s.v==="string"&&s.v.length>8?14:20,fontWeight:800,color:s.c}}>{s.v}</div>
              <div style={{fontSize:11,color:"#64748b",marginTop:3}}>{s.l}</div>
              <div style={{fontSize:10,color:"#94a3b8",marginTop:4}}>Clic para ver detalle →</div>
            </div>
          ))}
        </div>
        <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
          <Btn c="#2563eb" onClick={()=>expXLSX(
            st.resumen.map(r=>{const p=(inv.productos||[]).find(x=>x.id===r.productoId);return[r.ean||"",r.codigo,r.nombre,r.referencia,r.totalC1||"",r.totalC2||"",r.totalC3||"",r.cantFinal,r.estado||"",p?.saldo||0,r.costo>0?fmt(r.cantFinal*r.costo):"—",r.usuario];}),
            ["EAN","CODIGO","NOMBRE","REFERENCIA","C1","C2","C3","CANTIDAD_FINAL","ESTADO","SALDO_SISTEMA","VALOR","USUARIO"],
            `captura_${inv.nombre?.replace(/ /g,"_")}.xlsx`,`CAPTURA INVENTARIO ${inv.nombre}`)}>⬇ Excel capturas</Btn>
          <Btn c="#16a34a" onClick={()=>expXLSX(
            st.conDif.map(r=>{const p=(inv.productos||[]).find(x=>x.id===r.productoId);const dif=r.cantFinal-(p?.saldo||0);return[r.codigo,r.nombre,r.referencia,r.estado||"",p?.saldo||0,r.cantFinal,dif,Math.round(dif*(p?.costo||0)),p?.costo||0];}),
            ["CODIGO","NOMBRE","REFERENCIA","ESTADO","SALDO","FISICO","DIFERENCIA","VALOR_DIF","COSTO"],
            `ajuste_${inv.nombre?.replace(/ /g,"_")}.xlsx`,`AJUSTE ${inv.nombre}`)}>⬇ Excel ajuste</Btn>
        </div>
      </div>
    );
  }

  // Vista global
  return(
    <div>
      {/* Header estilo procesos */}
      <div style={{background:"linear-gradient(135deg,#1e293b 0%,#0f172a 100%)",borderRadius:16,padding:"20px 24px",marginBottom:20,color:"white",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div>
          <div style={{fontSize:11,fontWeight:600,opacity:0.75,letterSpacing:1,textTransform:"uppercase",marginBottom:4}}>Inventarios</div>
          <div style={{fontSize:22,fontWeight:800,letterSpacing:-0.5}}>Historial</div>
          <div style={{fontSize:12,opacity:0.8,marginTop:4}}>{G.historial[0]?.nombre||"Sin inventarios cerrados"}</div>
        </div>
        <div style={{textAlign:"right"}}>
          <div style={{fontSize:28,fontWeight:900,letterSpacing:-1}}>{G.historial.length}</div>
          <div style={{fontSize:11,opacity:0.8}}>inventarios</div>
        </div>
      </div>
      {G.historial.length===0?(
        <div style={{textAlign:"center",padding:"48px 20px",background:"white",borderRadius:14,border:"2px dashed #e2e8f0",color:"#64748b"}}>
          <div style={{fontSize:48,marginBottom:12}}>🏛️</div>
          <div style={{fontSize:15,fontWeight:700,marginBottom:6}}>Sin historial</div>
          <div style={{fontSize:13}}>Los inventarios cerrados aparecerán aquí.</div>
        </div>
      ):G.historial.length===1?(
        (()=>{const inv=G.historial[0];const st=getSt(inv);return(
          <div>
            <div style={{...card,marginBottom:16,borderLeft:"4px solid #2563eb"}}>
              <div style={{fontWeight:700,fontSize:16}}>{inv.nombre}</div>
              <div style={{fontSize:12,color:"#64748b",marginTop:3}}>{inv.apertura} → {inv.cierre} · Por: {inv.usuarioApertura}</div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:12}}>
              {[
                {l:"Valor físico",v:fmt(st.totalFisico),c:"#16a34a",bg:"#f0fdf4",icon:"💰"},
                {l:"Valor sistema",v:fmt(st.totalSistema),c:"#2563eb",bg:"#eff6ff",icon:"📊"},
                {l:"Ajuste",v:(st.ajuste>=0?"+":"")+fmt(st.ajuste),c:st.ajuste>=0?"#16a34a":"#dc2626",bg:st.ajuste>=0?"#f0fdf4":"#fef2f2",icon:"⚖️"},
                {l:"Contados",v:`${st.contados}/${st.totalProductos}`,c:"#0891b2",bg:"#ecfeff",icon:"📦"},
                {l:"Buenos",v:st.buenos.length,c:"#16a34a",bg:"#f0fdf4",icon:"✅"},
                {l:"Vencidos",v:st.vencidos.length,c:"#dc2626",bg:"#fef2f2",icon:"🔴"},
                {l:"Averiados",v:st.averiados.length,c:"#d97706",bg:"#fffbeb",icon:"🟡"},
                {l:"Con diferencia",v:st.conDif.length,c:"#ef4444",bg:"#fef2f2",icon:"⚠️"},
              ].map((s,i)=>(
                <div key={i} onClick={()=>setInvSel(inv)}
                  style={{background:s.bg,borderRadius:14,padding:"14px 16px",cursor:"pointer",border:`1px solid ${s.c}22`,boxShadow:"0 1px 4px rgba(0,0,0,0.05)",transition:"box-shadow 0.15s"}}
                  onMouseEnter={e=>e.currentTarget.style.boxShadow="0 4px 16px rgba(0,0,0,0.12)"}
                  onMouseLeave={e=>e.currentTarget.style.boxShadow="0 1px 4px rgba(0,0,0,0.05)"}>
                  <div style={{fontSize:18,marginBottom:4}}>{s.icon}</div>
                  <div style={{fontSize:typeof s.v==="string"&&s.v.length>8?13:22,fontWeight:900,color:s.c,lineHeight:1}}>{s.v}</div>
                  <div style={{fontSize:11,color:"#64748b",marginTop:4,fontWeight:600}}>{s.l}</div>
                </div>
              ))}
            </div>
          </div>
        );})()
      ):(
        <>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:12,marginBottom:20}}>
            {[
              {l:"Total",v:G.historial.length,c:"#2563eb",bg:"#eff6ff",icon:"🏛️"},
              {l:"Último",v:G.historial[0]?.nombre?.substring(0,14)||"—",c:"#16a34a",bg:"#f0fdf4",icon:"📋"},
              {l:"Fecha cierre",v:G.historial[0]?.cierre||"—",c:"#0891b2",bg:"#ecfeff",icon:"📅"},
            ].map(s=>(
              <div key={s.l} style={{background:s.bg,borderRadius:14,padding:"14px 16px",border:`1px solid ${s.c}22`,boxShadow:"0 1px 4px rgba(0,0,0,0.05)"}}>
                <div style={{fontSize:22,marginBottom:6}}>{s.icon}</div>
                <div style={{fontSize:s.v.toString().length>12?12:22,fontWeight:900,color:s.c,lineHeight:1}}>{s.v}</div>
                <div style={{fontSize:11,color:"#64748b",marginTop:4,fontWeight:600}}>{s.l}</div>
              </div>
            ))}
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            {G.historial.map((h,i)=>{
              const st=getSt(h);
              return(
                <div key={i} style={{...card,borderLeft:"4px solid #2563eb",transition:"box-shadow 0.15s",position:"relative"}}
                  onMouseEnter={e=>e.currentTarget.style.boxShadow="0 4px 16px rgba(0,0,0,0.12)"}
                  onMouseLeave={e=>e.currentTarget.style.boxShadow="0 1px 4px rgba(0,0,0,0.07)"}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                    <div style={{flex:1,cursor:"pointer"}} onClick={()=>setInvSel(h)}>
                      <div style={{fontWeight:700,fontSize:15,color:"#0f172a"}}>{h.nombre}</div>
                      <div style={{fontSize:12,color:"#64748b",marginTop:3}}>
                        <Badge color={h.tipo==="2conteos"?"#2563eb":"#16a34a"} small>{h.tipo==="2conteos"?"2 CONTEOS":"1 CONTEO"}</Badge>
                        {" "}{h.apertura} → {h.cierre} · Por: {h.usuarioApertura}
                      </div>
                      <div style={{display:"flex",gap:16,marginTop:8}}>
                        <span style={{fontSize:12,color:"#16a34a",fontWeight:700}}>💰 {fmt(st.totalFisico)}</span>
                        <span style={{fontSize:12,color:st.ajuste>=0?"#16a34a":"#dc2626",fontWeight:700}}>⚖️ {(st.ajuste>=0?"+":"")+fmt(st.ajuste)}</span>
                        <span style={{fontSize:12,color:"#64748b"}}>{st.contados}/{st.totalProductos} productos</span>
                        {st.conDif.length>0&&<span style={{fontSize:12,color:"#dc2626",fontWeight:700}}>⚠️ {st.conDif.length} difs</span>}
                      </div>
                    </div>
                    <div style={{display:"flex",alignItems:"center",gap:10,flexShrink:0,marginLeft:12}}>
                      <div style={{fontSize:12,color:"#2563eb",fontWeight:600,cursor:"pointer"}} onClick={()=>setInvSel(h)}>Ver detalle →</div>
                      <button onClick={e=>{e.stopPropagation();setConfirmElim(i);}}
                        style={{background:"#fef2f2",color:"#dc2626",border:"1px solid #fecaca",borderRadius:7,padding:"4px 10px",cursor:"pointer",fontWeight:700,fontSize:12}}>
                        🗑
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Modal confirmar eliminación historial */}
      {confirmElim!==null&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.55)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center"}}>
          <div style={{background:"white",borderRadius:16,padding:28,width:400,maxWidth:"95vw",boxShadow:"0 25px 60px rgba(0,0,0,0.3)"}}>
            <div style={{fontSize:32,textAlign:"center",marginBottom:12}}>🗑️</div>
            <h3 style={{margin:"0 0 8px",fontSize:17,fontWeight:700,textAlign:"center"}}>Eliminar inventario</h3>
            <p style={{fontSize:14,color:"#374151",textAlign:"center",marginBottom:24}}>
              ¿Estás seguro de eliminar <strong>{G.historial[confirmElim]?.nombre}</strong> del historial? Esta acción no se puede deshacer.
            </p>
            <div style={{display:"flex",gap:10}}>
              <button onClick={async()=>{
                const inv=G.historial[confirmElim];
                if(inv){
                  // Eliminar en Supabase primero
                  try{await SB.deleteInventario(inv.id);}catch(e){console.warn("Error al eliminar en Supabase:",e);}
                  // Eliminar del snap para que doSync no lo restaure
                  delete _snap.hist[inv.id];
                }
                G.historial=G.historial.filter((_,idx)=>idx!==confirmElim);
                setConfirmElim(null);
                showToast("Inventario eliminado ✓","warn");
              }} style={{flex:1,padding:"10px 0",background:"#dc2626",color:"white",border:"none",borderRadius:8,fontWeight:700,cursor:"pointer",fontSize:14}}>
                Sí, eliminar
              </button>
              <button onClick={()=>setConfirmElim(null)}
                style={{flex:1,padding:"10px 0",background:"#f1f5f9",color:"#374151",border:"none",borderRadius:8,fontWeight:700,cursor:"pointer",fontSize:14}}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


// ─────────────────────────────────────────
// MÓDULO CAPTURADOR
// ─────────────────────────────────────────

// ─────────────────────────────────────────
// MÓDULO CAPTURADOR — v6
// ─────────────────────────────────────────
function ModCapturador({usuario,setUsuario,G,rerender,recargar,showToast}){
  const [conteoActivo,setConteoActivo]=useState(null);
  const [rondaActiva,setRondaActiva]=useState(null); // ronda elegida cuando el usuario tiene varias
  const [scanInput,setScanInput]=useState("");
  const [productoActivo,setProductoActivo]=useState(null);
  const [form,setForm]=useState({unidades:"",embalaje:"",cajas:"",estado:"BUENO",obs:""});
  const [c3Vals,setC3Vals]=useState({}); // {productoId: cantidad}
  const [notFound,setNotFound]=useState(false);
  const [modalCerrar,setModalCerrar]=useState(false);
  const [busqueda,setBusqueda]=useState("");
  const [showCam,setShowCam]=useState(false);
  const [modalSalir,setModalSalir]=useState(false);
  const [busqCap,setBusqCap]=useState("");
  const [editCap,setEditCap]=useState(null); // {p, cap} cuando se edita una captura
  const scanRef=useRef(null);
  const unidadesRef=useRef(null);

  // Auto-refresco desde la nube cada 10s. Se pausa si el capturador está
  // escribiendo una captura o tiene la cámara abierta, para no interrumpir.
  useEffect(()=>{
    const t=setInterval(()=>{
      if(productoActivo||showCam)return;
      recargar();
    },10000);
    return ()=>clearInterval(t);
  },[productoActivo,showCam]);

  // Todos los conteos asignados a este usuario
  const misConteos=G.conteos.filter(c=>
    c.usuarioC1===usuario.nombre||c.usuarioC2===usuario.nombre||c.usuarioC3===usuario.nombre
  );

  const getConteo=()=>G.conteos.find(c=>c.id===conteoActivo)||null;
  const miConteo=getConteo();

  // TODAS las rondas de las que este usuario es responsable en el conteo
  const misRondasEn=(c)=>{
    if(!c)return [];
    const r=[];
    if(c.usuarioC1===usuario.nombre)r.push("C1");
    if(c.usuarioC2===usuario.nombre)r.push("C2");
    if(c.usuarioC3===usuario.nombre&&c.estado==="enC3")r.push("C3");
    return r;
  };
  const getMiRonda=(c)=>{
    if(!c)return null;
    const rondas=misRondasEn(c);
    if(rondas.length===0)return null;
    // Si hay una ronda elegida explícitamente y es válida, usarla
    if(rondaActiva&&rondas.includes(rondaActiva))return rondaActiva;
    // Si solo tiene una, esa
    if(rondas.length===1)return rondas[0];
    // Varias y ninguna elegida aún: priorizar C3 si está en curso, si no la primera no cerrada
    if(rondas.includes("C3"))return "C3";
    const noCerrada=rondas.find(r=>!(c.rondasCerradas||[]).includes(r));
    return noCerrada||rondas[0];
  };
  const miRonda=getMiRonda(miConteo);

  // Rondas cerradas independientes por usuario
  const getRondasCerradas=(c)=>c?.rondasCerradas||[];
  const miRondaCerrada=(c)=>{
    const r=getMiRonda(c);
    return getRondasCerradas(c).includes(r)||
      (r==="C3"&&c?.estado==="completado");
  };

  const puedoCapturar=(c)=>{
    if(!c)return false;
    if(miRondaCerrada(c))return false;
    const r=getMiRonda(c);
    if(r==="C3")return c.estado==="enC3";
    return true;
  };

  const soyPrincipal=(c)=>{
    if(!c)return false;
    const r=getMiRonda(c);
    if(r==="C1")return c.usuarioC1===usuario.nombre;
    if(r==="C2")return c.usuarioC2===usuario.nombre;
    return c.usuarioC3===usuario.nombre;
  };

  const getEstadoParaMi=(c)=>{
    if(miRondaCerrada(c))return "cerrado";
    return "activo";
  };

  // Productos para C3 — los que tuvieron diferencia
  const prodsC3=miConteo?G.productos.filter(p=>{
    const t1=Object.values(G.capturas).filter(c=>c.conteoId===miConteo.id&&c.productoId===p.id&&c.ronda==="C1").reduce((s,c)=>s+c.cantidad,0);
    const t2=Object.values(G.capturas).filter(c=>c.conteoId===miConteo.id&&c.productoId===p.id&&c.ronda==="C2").reduce((s,c)=>s+c.cantidad,0);
    return(t1>0||t2>0)&&t1!==t2;
  }):[];

  const prods=miConteo?(miRonda==="C3"?prodsC3:G.productos):[];

  const getCaps=(conteoId,ronda,prodId)=>Object.values(G.capturas).filter(c=>c.conteoId===conteoId&&c.ronda===ronda&&c.productoId===prodId);
  const getTotal=(conteoId,ronda,prodId)=>getCaps(conteoId,ronda,prodId).reduce((s,c)=>s+c.cantidad,0);

  const capturasRealizadas=miConteo?prods.map(p=>({
    p,total:getTotal(miConteo.id,miRonda,p.id),
    caps:getCaps(miConteo.id,miRonda,p.id)
  })).filter(x=>x.caps.length>0):[];

  const buscarProd=(q)=>{
    const s=q.trim().toLowerCase();
    return prods.find(p=>p.ean===s||p.ean===q.trim()||p.codigo.toLowerCase()===s||p.nombre.toLowerCase().includes(s))||null;
  };

  const handleScan=(e)=>{
    if(e.key!=="Enter")return;
    const p=buscarProd(scanInput);
    setNotFound(!p);
    if(p){setProductoActivo(p);setForm({unidades:"",embalaje:"",cajas:"",estado:"BUENO",obs:""});setTimeout(()=>unidadesRef.current?.focus(),80);}
    setScanInput("");
  };

  const onCamDetect=(code)=>{
    setShowCam(false);
    const p=buscarProd(code);
    setNotFound(!p);
    if(p){setProductoActivo(p);setForm({unidades:"",embalaje:"",cajas:"",estado:"BUENO",obs:""});setTimeout(()=>unidadesRef.current?.focus(),200);showToast(`📷 ${p.nombre}`);}
    else{showToast(`Código ${code} no está en la base`,"err");setTimeout(()=>scanRef.current?.focus(),120);}
  };

  const calcTotal=(f)=>(parseFloat(f.unidades)||0)+(parseFloat(f.cajas)||0)*(parseFloat(f.embalaje)||1);

  const guardar=()=>{
    if(!productoActivo||!miConteo||!miRonda)return;
    const total=calcTotal(form);
    if(miRonda!=="C3"&&total<=0)return showToast("Ingresa al menos las unidades","err");
    if(miConteo.estado==="pendiente"){G.conteos=G.conteos.map(c=>c.id===miConteo.id?{...c,estado:"enCurso"}:c);}
    // Si hay editCap, actualizar la captura existente
    if(editCap){
      const key=Object.keys(G.capturas).find(k=>{
        const c=G.capturas[k];
        return c.conteoId===miConteo.id&&c.productoId===productoActivo.id&&c.ronda===miRonda&&c===editCap.cap;
      });
      if(key){
        G.capturas[key]={...G.capturas[key],
          cantidad:total,unidades:parseFloat(form.unidades)||0,
          cajas:parseFloat(form.cajas)||0,embalaje:parseFloat(form.embalaje)||0,
          estado:form.estado,obs:form.obs,
          fecha:TODAY(),hora:HOUR(),
        };
        rerender();showToast(`✓ Editado: ${productoActivo.nombre} — ${total} und`);
        setProductoActivo(null);setForm({unidades:"",embalaje:"",cajas:"",estado:"BUENO",obs:""});
        setEditCap(null);
        setTimeout(()=>scanRef.current?.focus(),80);
        return;
      }
    }
    const key=`${miConteo.id}_${productoActivo.id}_${miRonda}_${ID()}`;
    G.capturas[key]={
      conteoId:miConteo.id,productoId:productoActivo.id,ronda:miRonda,
      ean:productoActivo.ean,codigo:productoActivo.codigo,nombre:productoActivo.nombre,
      referencia:productoActivo.referencia,categoria:productoActivo.categoria,
      subcategoria:productoActivo.subcategoria,subgrupo:productoActivo.subgrupo,
      saldo:productoActivo.saldo,costo:productoActivo.costo,
      proveedor:productoActivo.proveedor,nit:productoActivo.nit,
      cantidad:total,unidades:parseFloat(form.unidades)||0,
      cajas:parseFloat(form.cajas)||0,embalaje:parseFloat(form.embalaje)||0,
      estado:form.estado,obs:form.obs,
      usuario:usuario.nombre,fecha:TODAY(),hora:HOUR(),
    };
    rerender();showToast(`✓ ${productoActivo.nombre} — ${total} und`);
    setProductoActivo(null);setForm({unidades:"",embalaje:"",cajas:"",estado:"BUENO",obs:""});
    setEditCap(null);
    setTimeout(()=>scanRef.current?.focus(),80);
  };

  // Guardar C3 desde la tabla directa
  const guardarC3Fila=(p,val)=>{
    const cantidad=parseFloat(val);
    if(isNaN(cantidad)||cantidad<0)return showToast("Valor inválido","err");
    if(miConteo.estado==="pendiente"){G.conteos=G.conteos.map(c=>c.id===miConteo.id?{...c,estado:"enCurso"}:c);}
    const key=`${miConteo.id}_${p.id}_C3_${ID()}`;
    G.capturas[key]={
      conteoId:miConteo.id,productoId:p.id,ronda:"C3",
      ean:p.ean,codigo:p.codigo,nombre:p.nombre,referencia:p.referencia,
      categoria:p.categoria,subcategoria:p.subcategoria,subgrupo:p.subgrupo,
      saldo:p.saldo,costo:p.costo,proveedor:p.proveedor,nit:p.nit,
      cantidad,estado:"BUENO",obs:"",
      usuario:usuario.nombre,fecha:TODAY(),hora:HOUR(),
    };
    setC3Vals(prev=>({...prev,[p.id]:""}));
    rerender();showToast(`✓ ${p.nombre} — ${cantidad}`);
  };

  const cerrarConteo=()=>{
    if(!miConteo||!miRonda||!soyPrincipal(miConteo))return;
    // Marcar esta ronda como cerrada independientemente
    const rondasCerradas=[...getRondasCerradas(miConteo),miRonda];
    let nuevoEstado=miConteo.estado;

    if(miRonda==="C1"){
      // Si C2 también ya cerró, comparar
      if(rondasCerradas.includes("C2")){
        const hayDif=G.productos.some(p=>{
          const t1=Object.values(G.capturas).filter(c=>c.conteoId===miConteo.id&&c.productoId===p.id&&c.ronda==="C1").reduce((s,c)=>s+c.cantidad,0);
          const t2=Object.values(G.capturas).filter(c=>c.conteoId===miConteo.id&&c.productoId===p.id&&c.ronda==="C2").reduce((s,c)=>s+c.cantidad,0);
          return(t1>0||t2>0)&&t1!==t2;
        });
        nuevoEstado=hayDif?"diferencia":"completado";
      } else {
        nuevoEstado="cerradoC1";
      }
    } else if(miRonda==="C2"){
      // Si C1 también ya cerró, comparar
      if(rondasCerradas.includes("C1")){
        const hayDif=G.productos.some(p=>{
          const t1=Object.values(G.capturas).filter(c=>c.conteoId===miConteo.id&&c.productoId===p.id&&c.ronda==="C1").reduce((s,c)=>s+c.cantidad,0);
          const t2=Object.values(G.capturas).filter(c=>c.conteoId===miConteo.id&&c.productoId===p.id&&c.ronda==="C2").reduce((s,c)=>s+c.cantidad,0);
          return(t1>0||t2>0)&&t1!==t2;
        });
        nuevoEstado=hayDif?"diferencia":"completado";
      } else {
        nuevoEstado="cerradoC2";
      }
    } else if(miRonda==="C3"){
      nuevoEstado="completado";
    }

    G.conteos=G.conteos.map(c=>c.id===miConteo.id?{...c,estado:nuevoEstado,rondasCerradas}:c);
    G.alertas.push({usuario:usuario.nombre,conteoNombre:miConteo.nombre,conteoId:miConteo.id,ronda:miRonda,hora:HOUR(),leida:false});
    setModalCerrar(false);setConteoActivo(null);setRondaActiva(null);
    rerender();showToast("Conteo terminado ✓");
  };

  const rcol={C1:"#2563eb",C2:"#16a34a",C3:"#7c3aed"};
  const rlbl={C1:"CONTEO 1",C2:"CONTEO 2",C3:"CONTEO 3"};

  const modalSalirJSX=modalSalir?(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.55)",zIndex:2000,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
      <div style={{background:"white",borderRadius:16,padding:28,width:360,maxWidth:"96vw",boxShadow:"0 25px 60px rgba(0,0,0,0.3)"}}>
        <h3 style={{margin:"0 0 12px",fontSize:18,fontWeight:700,color:"#0f172a"}}>¿Cerrar sesión?</h3>
        <p style={{fontSize:14,color:"#374151",marginBottom:22,lineHeight:1.5}}>Vas a salir de TOMFIC. Tus capturas ya están guardadas en la nube.</p>
        <div style={{display:"flex",gap:10}}>
          <Btn c="#dc2626" onClick={()=>setUsuario(null)} full>Sí, salir</Btn>
          <Btn c="#64748b" onClick={()=>setModalSalir(false)} full outline>Cancelar</Btn>
        </div>
      </div>
    </div>
  ):null;

  // ── VISTA LISTA COMPACTA ──
  if(!conteoActivo||!miConteo){
    // Una entrada por cada (conteo, ronda) de la que el usuario es responsable
    const entradas=[];
    misConteos.forEach(c=>{
      misRondasEn(c).forEach(r=>{
        const cerrada=(c.rondasCerradas||[]).includes(r)||(r==="C3"&&c.estado==="completado");
        entradas.push({c,r,cerrada});
      });
    });
    const activos=entradas.filter(e=>!e.cerrada);
    const cerrados=entradas.filter(e=>e.cerrada);
    return(
      <div style={{minHeight:"100vh",background:"#f1f5f9",fontFamily:"system-ui,sans-serif"}}>
        <div style={{background:"#0f172a",color:"white",padding:"0 16px",display:"flex",alignItems:"center",justifyContent:"space-between",height:52,position:"sticky",top:0,zIndex:100}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <span style={{fontSize:20}}>📦</span>
            <span style={{fontWeight:800,fontSize:15}}>TOMFIC</span>
            {G.inventario&&<span style={{background:"#16a34a",fontSize:10,padding:"2px 10px",borderRadius:20,fontWeight:700}}>● {G.inventario.nombre}</span>}
          </div>
          <div style={{display:"flex",gap:10,alignItems:"center"}}>
            <button onClick={async()=>{await recargar();showToast("Actualizado ✓");}} style={{background:"transparent",border:"1px solid #334155",color:"#94a3b8",padding:"4px 10px",borderRadius:6,fontSize:11,cursor:"pointer"}}>🔄</button>
            <span style={{fontSize:11,color:"#94a3b8"}}>👤 {usuario.nombre}</span>
            <button onClick={()=>setModalSalir(true)} style={{background:"#dc2626",border:"none",color:"white",padding:"6px 16px",borderRadius:8,fontSize:12,fontWeight:700,cursor:"pointer"}}>⎋ Salir</button>
          </div>
        </div>
        <div style={{maxWidth:700,margin:"0 auto",padding:"20px 14px"}}>
          <h2 style={{margin:"0 0 16px",fontSize:20,fontWeight:700,color:"#0f172a"}}>Mis conteos asignados</h2>

          {/* Activos */}
          <div style={{marginBottom:20}}>
            <div style={{fontSize:11,fontWeight:700,color:"#374151",textTransform:"uppercase",letterSpacing:1,marginBottom:10}}>Activos / Pendientes</div>
            {activos.length===0?(
              <div style={{...card,padding:"20px 18px",color:"#64748b",textAlign:"center"}}>
                <div style={{fontSize:32,marginBottom:8}}>📭</div>
                <div style={{fontSize:14,fontWeight:600,marginBottom:4}}>No tienes conteos asignados</div>
                <div style={{fontSize:12}}>El administrador te asignará uno cuando sea necesario.</div>
              </div>
            ):(
              <div style={{...card,padding:0,overflow:"hidden"}}>
                {activos.map((e,i)=>{
                  const c=e.c, r=e.r;
                  const caps=Object.values(G.capturas).filter(x=>x.conteoId===c.id&&x.ronda===r);
                  // Para C3 solo se puede si el conteo está en enC3
                  const puedeIniciar=r==="C3"?c.estado==="enC3":true;
                  const abrir=()=>{
                    if(!puedeIniciar){showToast("No disponible aún","warn");return;}
                    setRondaActiva(r);
                    setConteoActivo(c.id);
                  };
                  return(
                    <div key={c.id+"_"+r} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"12px 16px",borderBottom:i<activos.length-1?"1px solid #f1f5f9":"none",background:"white",gap:12}}>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontWeight:700,fontSize:14,color:"#0f172a",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{c.nombre}</div>
                        <div style={{fontSize:11,color:"#64748b",marginTop:2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>📍 {c.locLabel}</div>
                        <div style={{display:"flex",gap:6,marginTop:6,flexWrap:"wrap"}}>
                          <Badge color={rcol[r]} small>{rlbl[r]}</Badge>
                          {caps.length>0&&<Badge color="#64748b" small>{new Set(caps.map(x=>x.productoId)).size} capturados</Badge>}
                          {!puedeIniciar&&<Badge color="#94a3b8" small>No disponible aún</Badge>}
                        </div>
                      </div>
                      <button onClick={abrir}
                        style={{padding:"8px 16px",background:puedeIniciar?rcol[r]:"#e2e8f0",color:puedeIniciar?"white":"#94a3b8",border:"none",borderRadius:8,cursor:puedeIniciar?"pointer":"not-allowed",fontWeight:700,fontSize:13,flexShrink:0}}>
                        {caps.length>0?"Continuar":"Iniciar"}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Cerrados */}
          {cerrados.length>0&&(
            <div>
              <div style={{fontSize:11,fontWeight:700,color:"#374151",textTransform:"uppercase",letterSpacing:1,marginBottom:10}}>Completados</div>
              <div style={{...card,padding:0,overflow:"hidden"}}>
                {cerrados.map((e,i)=>{
                  const c=e.c, r=e.r;
                  const caps=Object.values(G.capturas).filter(x=>x.conteoId===c.id&&x.ronda===r);
                  return(
                    <div key={c.id+"_"+r} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 16px",borderBottom:i<cerrados.length-1?"1px solid #f1f5f9":"none",opacity:0.7}}>
                      <div style={{flex:1}}>
                        <div style={{fontWeight:600,fontSize:13,color:"#64748b"}}>{c.nombre}</div>
                        <div style={{fontSize:11,color:"#94a3b8",marginTop:1}}>📍 {c.locLabel}</div>
                        <div style={{display:"flex",gap:6,marginTop:4}}>
                          <Badge color="#64748b" small>{rlbl[r]}</Badge>
                          <Badge color="#16a34a" small>🔒 Cerrado</Badge>
                          <Badge color="#64748b" small>{new Set(caps.map(x=>x.productoId)).size} productos</Badge>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
        {modalSalirJSX}
      </div>
    );
  }

  // ── VISTA CAPTURA ──
  const total=calcTotal(form);
  return(
    <div style={{minHeight:"100vh",background:"#f1f5f9",fontFamily:"system-ui,sans-serif"}}>
      <div style={{background:"#0f172a",color:"white",padding:"0 16px",display:"flex",alignItems:"center",justifyContent:"space-between",height:52,position:"sticky",top:0,zIndex:100}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <button onClick={()=>{setConteoActivo(null);setRondaActiva(null);setProductoActivo(null);setScanInput("");setBusqueda("");}}
            style={{background:"transparent",border:"1px solid #334155",color:"#94a3b8",padding:"4px 10px",borderRadius:6,fontSize:11,cursor:"pointer"}}>← Mis conteos</button>
          <span style={{fontWeight:800,fontSize:15,color:"white"}}>TOMFIC</span>
          <span style={{background:rcol[miRonda],fontSize:10,padding:"2px 10px",borderRadius:20,fontWeight:700}}>{rlbl[miRonda]}</span>
        </div>
        <div style={{display:"flex",gap:10,alignItems:"center"}}>
          <button onClick={async()=>{await recargar();showToast("Actualizado ✓");}} title="Traer lo último de la nube" style={{background:"transparent",border:"1px solid #334155",color:"#94a3b8",padding:"4px 10px",borderRadius:6,fontSize:11,cursor:"pointer"}}>🔄</button>
          <span style={{fontSize:11,color:"#94a3b8"}}>👤 {usuario.nombre}</span>
          {soyPrincipal(miConteo)&&<button onClick={()=>setModalCerrar(true)} style={{background:"#dc2626",color:"white",border:"none",padding:"6px 14px",borderRadius:8,cursor:"pointer",fontSize:12,fontWeight:700}}>Terminar conteo</button>}
          <button onClick={()=>setModalSalir(true)} style={{background:"#dc2626",border:"none",color:"white",padding:"6px 16px",borderRadius:8,fontSize:12,fontWeight:700,cursor:"pointer"}}>⎋ Salir</button>
        </div>
      </div>

      <div style={{padding:"12px 14px",maxWidth:1000,margin:"0 auto"}}>
        {/* Info */}
        <div style={{background:"white",borderRadius:10,padding:"12px 16px",marginBottom:10,boxShadow:"0 1px 4px rgba(0,0,0,0.06)"}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr auto",gap:12,alignItems:"center"}}>
            <div>
              <div style={{fontWeight:700,fontSize:14,color:"#0f172a"}}>{miConteo.nombre}</div>
              <div style={{fontSize:12,color:"#64748b",marginTop:2}}>📍 {miConteo.locLabel}</div>
              {miRonda==="C3"&&<div style={{marginTop:6,background:"#faf5ff",borderRadius:6,padding:"4px 10px",fontSize:12,color:"#7c3aed",fontWeight:600,display:"inline-block"}}>Solo productos con diferencia entre C1 y C2 — {prodsC3.length} productos</div>}
            </div>
            <div style={{textAlign:"right",maxWidth:200}}>
              <div style={{fontSize:10,color:"#94a3b8",marginBottom:4,textTransform:"uppercase",letterSpacing:0.8}}>Mis otros conteos</div>
              {misConteos.filter(c=>c.id!==miConteo.id).slice(0,3).map((c,i)=>{
                const r=getMiRonda(c);const est=getEstadoParaMi(c);
                return(
                  <div key={i} style={{fontSize:11,background:"#f8fafc",borderRadius:6,padding:"3px 8px",marginBottom:3,textAlign:"left",display:"flex",gap:6,alignItems:"center"}}>
                    <span style={{background:est==="cerrado"?"#e2e8f0":rcol[r],color:"white",borderRadius:4,padding:"0 4px",fontSize:9,fontWeight:700}}>{rlbl[r]}</span>
                    <span style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",color:est==="cerrado"?"#94a3b8":"#374151",fontSize:11}}>{c.nombre}</span>
                    {est==="cerrado"&&<span style={{color:"#16a34a",fontSize:10}}>🔒</span>}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* C3 — tabla directa de productos con diferencia */}
        {miRonda==="C3"&&prodsC3.length>0&&(
          <div style={{background:"white",borderRadius:10,overflow:"hidden",boxShadow:"0 1px 4px rgba(0,0,0,0.06)",marginBottom:10}}>
            <div style={{padding:"10px 16px",background:"#faf5ff",borderBottom:"1px solid #e9d5ff",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <span style={{fontWeight:700,fontSize:13,color:"#7c3aed"}}>Productos con diferencia — ingresa el conteo real</span>
              <span style={{fontSize:12,color:"#7c3aed"}}>{prodsC3.length} productos</span>
            </div>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
              <thead><tr style={{background:"#f3e8ff"}}>
                {["Código","EAN","Nombre","Referencia","C1","C2","Diferencia","Conteo 3",""].map(h=>(
                  <th key={h} style={{padding:"8px 10px",textAlign:"left",fontWeight:700,color:"#7c3aed",borderBottom:"1px solid #e9d5ff"}}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {prodsC3.map((p,i)=>{
                  const t1=Object.values(G.capturas).filter(c=>c.conteoId===miConteo.id&&c.productoId===p.id&&c.ronda==="C1").reduce((s,c)=>s+c.cantidad,0);
                  const t2=Object.values(G.capturas).filter(c=>c.conteoId===miConteo.id&&c.productoId===p.id&&c.ronda==="C2").reduce((s,c)=>s+c.cantidad,0);
                  const t3=getTotal(miConteo.id,"C3",p.id);
                  const yaCapturado=t3>0||Object.values(G.capturas).some(c=>c.conteoId===miConteo.id&&c.productoId===p.id&&c.ronda==="C3"&&c.cantidad===0);
                  return(
                    <tr key={p.id} style={{background:yaCapturado?"#f0fdf4":i%2?"#faf5ff":"white",borderBottom:"1px solid #f3e8ff"}}>
                      <td style={{padding:"8px 10px",fontFamily:"monospace",color:"#7c3aed",fontWeight:700}}>{p.codigo}</td>
                      <td style={{padding:"8px 10px",fontSize:10,color:"#94a3b8"}}>{p.ean}</td>
                      <td style={{padding:"8px 10px",fontWeight:600}}>{p.nombre}</td>
                      <td style={{padding:"8px 10px",color:"#64748b",fontSize:11}}>{p.referencia}</td>
                      <td style={{padding:"8px 10px",textAlign:"center",fontWeight:700,color:"#2563eb"}}>{t1}</td>
                      <td style={{padding:"8px 10px",textAlign:"center",fontWeight:700,color:"#16a34a"}}>{t2}</td>
                      <td style={{padding:"8px 10px",textAlign:"center",fontWeight:700,color:"#dc2626"}}>{t1-t2>0?"+":""}{ t1-t2}</td>
                      <td style={{padding:"6px 8px"}}>
                        {yaCapturado?(
                          <span style={{fontWeight:800,fontSize:14,color:"#16a34a"}}>{t3} ✓</span>
                        ):(
                          <input type="number" min="0" value={c3Vals[p.id]??""} onChange={e=>setC3Vals(prev=>({...prev,[p.id]:e.target.value}))}
                            onKeyDown={e=>{if(e.key==="Enter"&&(c3Vals[p.id]!==undefined&&c3Vals[p.id]!==""))guardarC3Fila(p,c3Vals[p.id]);}}
                            placeholder="0" style={{...inp,width:80,padding:"6px 8px",fontSize:15,fontWeight:700,textAlign:"center",border:"2px solid #7c3aed"}}/>
                        )}
                      </td>
                      <td style={{padding:"6px 8px"}}>
                        {!yaCapturado&&(
                          <button onClick={()=>{const v=c3Vals[p.id];if(v!==undefined&&v!=="")guardarC3Fila(p,v);}}
                            disabled={c3Vals[p.id]===undefined||c3Vals[p.id]===""}
                            style={{background:c3Vals[p.id]!==undefined&&c3Vals[p.id]!==""?"#7c3aed":"#e2e8f0",color:c3Vals[p.id]!==undefined&&c3Vals[p.id]!==""?"white":"#94a3b8",border:"none",borderRadius:6,padding:"5px 12px",cursor:"pointer",fontWeight:700,fontSize:11}}>
                            Guardar
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div style={{padding:"10px 16px",background:"#f8fafc",borderTop:"1px solid #e2e8f0",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <span style={{fontSize:12,color:"#7c3aed"}}>{Object.values(G.capturas).filter(c=>c.conteoId===miConteo.id&&c.ronda==="C3").length} de {prodsC3.length} validados</span>
              {soyPrincipal(miConteo)&&<button onClick={()=>setModalCerrar(true)} style={{background:"#dc2626",color:"white",border:"none",borderRadius:8,padding:"8px 20px",cursor:"pointer",fontWeight:700,fontSize:13}}>TERMINAR CONTEO</button>}
            </div>
          </div>
        )}

        {/* Scanner + búsqueda — también disponible en C3 */}
        <div style={{background:"white",borderRadius:10,padding:"12px 14px",marginBottom:10,boxShadow:"0 1px 4px rgba(0,0,0,0.06)"}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            <div>
              <div style={{fontSize:11,fontWeight:700,color:"#374151",marginBottom:5}}>CÓDIGO (EAN / INTERNO)</div>
              <div style={{display:"flex",gap:8}}>
                <input ref={scanRef} value={scanInput} onChange={e=>setScanInput(e.target.value)} onKeyDown={handleScan}
                  placeholder="Escanee o escriba y presione Enter…"
                  style={{...inp,flex:1,border:`2px solid ${rcol[miRonda]}`}} autoFocus/>
                <button onClick={()=>handleScan({key:"Enter"})} style={{padding:"9px 14px",background:rcol[miRonda],color:"white",border:"none",borderRadius:8,cursor:"pointer",fontWeight:700,fontSize:15}}>↵</button>
                <button onClick={()=>setShowCam(true)} title="Escanear con cámara" style={{padding:"9px 14px",background:"white",color:rcol[miRonda],border:`2px solid ${rcol[miRonda]}`,borderRadius:8,cursor:"pointer",fontWeight:700,fontSize:15}}>📷</button>
              </div>
              {notFound&&<div style={{marginTop:6,color:"#dc2626",fontSize:12,fontWeight:600}}>⚠️ Código no encontrado</div>}
            </div>
            <div style={{position:"relative"}}>
              <div style={{fontSize:11,fontWeight:700,color:"#374151",marginBottom:5}}>BUSCAR EN LA LISTA</div>
              <input value={busqueda} onChange={e=>{setBusqueda(e.target.value);setProductoActivo(null);}}
                placeholder="Escriba nombre, código o referencia…"
                style={{...inp,border:`1.5px solid ${busqueda?"#2563eb":"#e2e8f0"}`}}
                onKeyDown={e=>{if(e.key==="Escape"){setBusqueda("");setProductoActivo(null);}}}
                autoComplete="off"/>
              {busqueda.length>=1&&!productoActivo&&(()=>{
                const q=busqueda.toLowerCase();
                const sugs=prods.filter(p=>p.nombre.toLowerCase().includes(q)||p.codigo.toLowerCase().includes(q)||p.ean.includes(q)||(p.referencia||"").toLowerCase().includes(q)).slice(0,8);
                if(!sugs.length)return(
                  <div style={{position:"absolute",top:"100%",left:0,right:0,background:"white",border:"1.5px solid #e2e8f0",borderRadius:8,boxShadow:"0 4px 16px rgba(0,0,0,0.12)",zIndex:200,padding:"10px 14px",fontSize:12,color:"#94a3b8"}}>
                    No se encontró "{busqueda}"
                  </div>
                );
                return(
                  <div style={{position:"absolute",top:"100%",left:0,right:0,background:"white",border:`1.5px solid ${rcol[miRonda]}`,borderRadius:8,boxShadow:"0 4px 16px rgba(0,0,0,0.15)",zIndex:200,maxHeight:280,overflowY:"auto"}}>
                    {sugs.map((p,i)=>{
                      const tot=getTotal(miConteo.id,miRonda,p.id);
                      return(
                        <div key={p.id} onClick={()=>{setProductoActivo(p);setForm({unidades:"",embalaje:"",cajas:"",estado:"BUENO",obs:""});setBusqueda("");setTimeout(()=>unidadesRef.current?.focus(),80);}}
                          style={{padding:"10px 14px",cursor:"pointer",borderBottom:i<sugs.length-1?"1px solid #f1f5f9":"none",display:"flex",justifyContent:"space-between",alignItems:"center"}}
                          onMouseEnter={e=>e.currentTarget.style.background="#eff6ff"}
                          onMouseLeave={e=>e.currentTarget.style.background="white"}>
                          <div>
                            <div style={{fontWeight:700,fontSize:13,color:"#0f172a"}}>{p.nombre}</div>
                            <div style={{fontSize:11,color:"#64748b",marginTop:1}}>
                              <span style={{fontFamily:"monospace",color:"#2563eb",marginRight:8}}>{p.codigo}</span>{p.referencia}
                            </div>
                          </div>
                          {tot>0?<div style={{background:rcol[miRonda]+"22",color:rcol[miRonda],padding:"2px 8px",borderRadius:12,fontSize:11,fontWeight:700}}>✓ {tot}</div>:<div style={{color:"#d1d5db",fontSize:11}}>Sin captura</div>}
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          </div>
        </div>

        {/* Ficha del producto */}
        {productoActivo&&(()=>{
          const caps=getCaps(miConteo.id,miRonda,productoActivo.id);
          const totalAnt=getTotal(miConteo.id,miRonda,productoActivo.id);
          return(
            <div style={{background:"white",borderRadius:10,padding:20,marginBottom:10,boxShadow:"0 2px 8px rgba(0,0,0,0.1)",border:`2px solid ${rcol[miRonda]}`}}>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:16,paddingBottom:14,borderBottom:"1px solid #f1f5f9"}}>
                <div>
                  <div style={{fontSize:11,color:"#94a3b8",marginBottom:2}}>CÓDIGO</div>
                  <div style={{fontFamily:"monospace",fontSize:16,fontWeight:800,color:"#2563eb"}}>{productoActivo.codigo}</div>
                  <div style={{marginTop:8}}>
                    <div style={{fontSize:11,color:"#94a3b8"}}>NOMBRE PRODUCTO</div>
                    <div style={{fontWeight:700,fontSize:15,color:"#0f172a"}}>{productoActivo.nombre}</div>
                  </div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginTop:8}}>
                    <div><div style={{fontSize:10,color:"#94a3b8"}}>REFERENCIA</div><div style={{fontSize:13,fontWeight:600}}>{productoActivo.referencia||"—"}</div></div>
                    <div><div style={{fontSize:10,color:"#94a3b8"}}>PROVEEDOR</div><div style={{fontSize:13,fontWeight:600}}>{productoActivo.proveedor||"—"}</div></div>
                  </div>
                  {totalAnt>0&&<div style={{marginTop:8,background:"#f0fdf4",borderRadius:8,padding:"8px 12px",border:"1px solid #bbf7d0",display:"flex",alignItems:"center",gap:16}}>
                    <div><div style={{fontSize:9,color:"#94a3b8",fontWeight:700}}>YA CAPTURADO</div><div style={{fontSize:15,fontWeight:800,color:"#16a34a"}}>{totalAnt} und</div></div>
                    <div style={{color:"#d1d5db"}}>|</div>
                    <div><div style={{fontSize:9,color:"#94a3b8",fontWeight:700}}>ENTRADAS</div><div style={{fontSize:15,fontWeight:800,color:"#374151"}}>{caps.length}</div></div>
                  </div>}
                  {miRonda==="C3"&&(()=>{
                    const t1=Object.values(G.capturas).filter(c=>c.conteoId===miConteo.id&&c.productoId===productoActivo.id&&c.ronda==="C1").reduce((s,c)=>s+c.cantidad,0);
                    const t2=Object.values(G.capturas).filter(c=>c.conteoId===miConteo.id&&c.productoId===productoActivo.id&&c.ronda==="C2").reduce((s,c)=>s+c.cantidad,0);
                    return<div style={{marginTop:8,background:"#fef2f2",borderRadius:8,padding:"6px 10px",fontSize:12,color:"#dc2626",fontWeight:600}}>C1:{t1} vs C2:{t2} → Dif:{t1-t2}</div>;
                  })()}
                </div>
                <div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                    <div><div style={{fontSize:10,color:"#94a3b8"}}>UBICACIÓN</div><div style={{fontSize:12,fontWeight:600}}>{miConteo.ubicacion}</div></div>
                    <div><div style={{fontSize:10,color:"#94a3b8"}}>LOCALIZACIÓN</div><div style={{fontSize:12,fontWeight:600}}>{miConteo.localizacion}</div></div>
                    <div><div style={{fontSize:10,color:"#94a3b8"}}>N° LOCALIZACIÓN</div><div style={{fontSize:12,fontWeight:600}}>{miConteo.nro}</div></div>
                    <div><div style={{fontSize:10,color:"#94a3b8"}}>CONTEO N°</div><div style={{fontSize:12,fontWeight:600}}>{miRonda==="C1"?1:miRonda==="C2"?2:3}</div></div>
                  </div>
                  <div style={{marginTop:8}}>
                    <div style={{fontSize:10,color:"#94a3b8"}}>LÍNEA / SUBLÍNEA / SUBGRUPO</div>
                    <div style={{fontSize:12,color:"#374151"}}>{productoActivo.categoria||"—"} / {productoActivo.subcategoria||"—"} / {productoActivo.subgrupo||"—"}</div>
                  </div>
                </div>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:20}}>
                <div>
                  <div style={{fontWeight:700,fontSize:12,color:"#374151",marginBottom:10,textTransform:"uppercase",letterSpacing:1}}>Cantidades</div>
                  <div style={{display:"grid",gridTemplateColumns:"100px 1fr",gap:8,alignItems:"center"}}>
                    <label style={{fontSize:12,fontWeight:600,color:"#374151"}}>UNIDADES</label>
                    <input ref={unidadesRef} type="number" min="0" value={form.unidades}
                      onChange={e=>setForm(f=>({...f,unidades:e.target.value}))}
                      onKeyDown={e=>{if(e.key==="Enter"){if(form.cajas||form.embalaje){document.getElementById("inp-emb2")?.focus();}else{guardar();}}}}
                      placeholder="0" style={{...inp,padding:"8px 10px",fontSize:16,fontWeight:700,textAlign:"center"}}/>
                    <label style={{fontSize:12,fontWeight:600,color:"#374151"}}>EMBALAJE</label>
                    <input id="inp-emb2" type="number" min="0" value={form.embalaje}
                      onChange={e=>setForm(f=>({...f,embalaje:e.target.value}))}
                      onKeyDown={e=>{if(e.key==="Enter")document.getElementById("inp-caj2")?.focus();}}
                      placeholder="Und/caja" style={{...inp,padding:"8px 10px",fontSize:14,textAlign:"center"}}/>
                    <label style={{fontSize:12,fontWeight:600,color:"#374151"}}>CAJAS</label>
                    <input id="inp-caj2" type="number" min="0" value={form.cajas}
                      onChange={e=>setForm(f=>({...f,cajas:e.target.value}))}
                      onKeyDown={e=>{if(e.key==="Enter")guardar();}}
                      placeholder="Cajas" style={{...inp,padding:"8px 10px",fontSize:14,textAlign:"center"}}/>
                    <label style={{fontSize:14,fontWeight:800,color:"#0f172a"}}>TOTAL</label>
                    <div style={{...inp,padding:"10px",fontSize:22,fontWeight:800,textAlign:"center",background:total>0?"#eff6ff":"#f8fafc",color:total>0?rcol[miRonda]:"#94a3b8",border:`2px solid ${total>0?rcol[miRonda]:"#e2e8f0"}`,cursor:"default",userSelect:"none"}}>
                      {total||0}
                    </div>
                  </div>
                </div>
                <div>
                  <div style={{fontWeight:700,fontSize:12,color:"#374151",marginBottom:10,textTransform:"uppercase",letterSpacing:1}}>Estado y observación</div>
                  <div style={{marginBottom:10}}>
                    <div style={{fontSize:11,color:"#94a3b8",marginBottom:4}}>ESTADO DEL PRODUCTO</div>
                    <select value={form.estado} onChange={e=>setForm(f=>({...f,estado:e.target.value}))} style={{...inp,fontSize:13}}>
                      {["BUENO","VENCIDO","AVERIADO","NO APTO VENTA","BAJAS","SIN REVISAR"].map(s=><option key={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <div style={{fontSize:11,color:"#94a3b8",marginBottom:4}}>OBSERVACIÓN</div>
                    <input type="text" value={form.obs} onChange={e=>setForm(f=>({...f,obs:e.target.value}))}
                      onKeyDown={e=>{if(e.key==="Enter")guardar();}}
                      placeholder="Opcional…" style={{...inp,fontSize:13}}/>
                  </div>
                  {miRonda==="C3"&&<div style={{marginTop:10,background:"#faf5ff",borderRadius:8,padding:"8px 12px",fontSize:12,color:"#7c3aed"}}>En C3 se permite guardar 0 unidades.</div>}
                </div>
              </div>
              <div style={{display:"flex",gap:10,marginTop:16,flexWrap:"wrap",alignItems:"center"}}>
                <button onClick={guardar} disabled={miRonda!=="C3"&&total<=0}
                  style={{padding:"10px 28px",background:miRonda==="C3"||total>0?"#16a34a":"#e2e8f0",color:miRonda==="C3"||total>0?"white":"#94a3b8",border:"none",borderRadius:8,cursor:miRonda==="C3"||total>0?"pointer":"not-allowed",fontWeight:700,fontSize:14}}>
                  GUARDAR
                </button>
                <button onClick={()=>{setProductoActivo(null);setForm({unidades:"",embalaje:"",cajas:"",estado:"BUENO",obs:""});setEditCap(null);setTimeout(()=>scanRef.current?.focus(),80);}}
                  style={{padding:"10px 20px",background:"#64748b",color:"white",border:"none",borderRadius:8,cursor:"pointer",fontWeight:700,fontSize:13}}>CANCELAR</button>
                <div style={{flex:1}}/>
                {soyPrincipal(miConteo)&&<button onClick={()=>setModalCerrar(true)} style={{padding:"10px 20px",background:"#dc2626",color:"white",border:"none",borderRadius:8,cursor:"pointer",fontWeight:700,fontSize:13}}>TERMINAR CONTEO</button>}
              </div>
            </div>
          );
        })()}

        {/* Capturas realizadas */}
        {miRonda!=="C3"&&capturasRealizadas.length>0&&(
          <div style={{background:"white",borderRadius:10,overflow:"hidden",boxShadow:"0 1px 4px rgba(0,0,0,0.06)",marginBottom:10}}>
            <div style={{padding:"10px 16px",background:"#f8fafc",borderBottom:"1px solid #e2e8f0",display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8}}>
              <span style={{fontWeight:700,fontSize:13,color:"#0f172a"}}>Capturas realizadas — {capturasRealizadas.length} productos</span>
              <input value={busqCap} onChange={e=>setBusqCap(e.target.value)} placeholder="Buscar por código o nombre…"
                style={{padding:"5px 10px",borderRadius:7,border:"1.5px solid #2563eb",fontSize:12,outline:"none",minWidth:200}}/>
            </div>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
              <thead><tr style={{background:"#f1f5f9"}}>
                {["Código","Nombre","Ref.","Total","Estado","Obs","Acciones"].map(h=>(
                  <th key={h} style={{padding:"7px 10px",textAlign:"left",fontWeight:700,color:"#374151",borderBottom:"1px solid #e2e8f0",fontSize:11}}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {capturasRealizadas.filter(({p})=>!busqCap||p.nombre.toLowerCase().includes(busqCap.toLowerCase())||p.codigo.toLowerCase().includes(busqCap.toLowerCase())).map(({p,caps,total:tot},i)=>(
                  <tr key={p.id} style={{background:i%2?"#f8fafc":"white",borderBottom:"1px solid #f1f5f9"}}>
                    <td style={{padding:"7px 10px",fontFamily:"monospace",color:"#2563eb",fontWeight:700,fontSize:11}}>{p.codigo}</td>
                    <td style={{padding:"7px 10px",fontWeight:600}}>{p.nombre}</td>
                    <td style={{padding:"7px 10px",color:"#64748b",fontSize:11}}>{p.referencia}</td>
                    <td style={{padding:"7px 10px",textAlign:"center"}}>
                      <span style={{fontWeight:800,fontSize:14,color:rcol[miRonda]}}>{tot}</span>
                      {caps.length>1&&<span style={{fontSize:10,color:"#64748b",marginLeft:4}}>({caps.length})</span>}
                    </td>
                    <td style={{padding:"7px 10px"}}><EstBadge e={caps[0]?.estado}/></td>
                    <td style={{padding:"7px 10px",color:"#64748b",fontSize:11,maxWidth:100,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{caps[0]?.obs||"—"}</td>
                    <td style={{padding:"7px 10px"}}>
                      <button onClick={()=>{
                        setProductoActivo(p);
                        const lastCap=caps[caps.length-1];
                        if(lastCap){
                          const emb=lastCap.embalaje||"";
                          const caj=lastCap.cajas||"";
                          const und=emb&&caj?"":(lastCap.cantidad||"");
                          setForm({unidades:String(und),embalaje:String(emb),cajas:String(caj),estado:lastCap.estado||"BUENO",obs:lastCap.obs||""});
                          setEditCap({p,cap:lastCap});
                        }else{
                          setForm({unidades:"",embalaje:"",cajas:"",estado:"BUENO",obs:""});
                          setEditCap(null);
                        }
                        setTimeout(()=>unidadesRef.current?.focus(),80);
                      }}
                        style={{background:"#fef9c3",color:"#92400e",border:"1px solid #fde047",borderRadius:6,padding:"3px 10px",cursor:"pointer",fontWeight:700,fontSize:11,marginRight:4}}>✏ Editar</button>
                      <button onClick={()=>{caps.forEach(c=>{const k=Object.keys(G.capturas).find(k=>G.capturas[k]===c);if(k)delete G.capturas[k];});rerender();showToast("Eliminado","warn");}}
                        style={{background:"#fef2f2",color:"#dc2626",border:"1px solid #fecaca",borderRadius:6,padding:"3px 10px",cursor:"pointer",fontWeight:700,fontSize:11}}>Borrar</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{padding:"10px 16px",background:"#f8fafc",borderTop:"1px solid #e2e8f0",display:"flex",justifyContent:"flex-end"}}>
              {soyPrincipal(miConteo)&&<button onClick={()=>setModalCerrar(true)} style={{background:"#dc2626",color:"white",border:"none",borderRadius:8,padding:"8px 24px",cursor:"pointer",fontWeight:700,fontSize:13}}>TERMINAR CONTEO</button>}
            </div>
          </div>
        )}

        {capturasRealizadas.length===0&&!productoActivo&&miRonda!=="C3"&&(
          <div style={{...card,textAlign:"center",padding:36,color:"#64748b"}}>
            <div style={{fontSize:36,marginBottom:8}}>📷</div>
            <div style={{fontSize:14,fontWeight:600}}>Escanea o busca un producto para comenzar</div>
            <div style={{fontSize:12,marginTop:4}}>{prods.length} productos disponibles</div>
          </div>
        )}
      </div>

      {modalCerrar&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.55)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center"}}>
          <div style={{background:"white",borderRadius:16,padding:28,width:380,maxWidth:"96vw",boxShadow:"0 25px 60px rgba(0,0,0,0.3)"}}>
            <h3 style={{margin:"0 0 16px",fontSize:17,fontWeight:700}}>Terminar conteo</h3>
            <p style={{fontSize:14,color:"#374151",marginBottom:24}}>¿Estás seguro de que deseas terminar este conteo?</p>
            <div style={{display:"flex",gap:10}}>
              <Btn c="#dc2626" onClick={cerrarConteo} full>Sí, terminar conteo</Btn>
              <Btn c="#64748b" onClick={()=>setModalCerrar(false)} full>Cancelar</Btn>
            </div>
          </div>
        </div>
      )}
      <BtnNotas G={G} usuario={usuario} rerender={rerender} showToast={showToast}/>
      {showCam&&<CamScanner color={rcol[miRonda]} onClose={()=>setShowCam(false)} onDetect={onCamDetect}/>}
      {modalSalirJSX}
    </div>
  );
}

// ─────────────────────────────────────────
// BOTÓN FLOTANTE DE NOTAS (visible para admin y capturador)
// ─────────────────────────────────────────
function BtnNotas({G,usuario,rerender,showToast}){
  const [open,setOpen]=useState(false);
  const [texto,setTexto]=useState("");
  const [fotos,setFotos]=useState([]);
  const notasInv=G.notas.filter(n=>n.inventarioId===(G.inventario?.id||""));

  const agregarFoto=(e)=>{
    const files=Array.from(e.target.files);
    files.forEach(file=>{
      const reader=new FileReader();
      reader.onload=(ev)=>setFotos(f=>[...f,{name:file.name,data:ev.target.result}]);
      reader.readAsDataURL(file);
    });
    e.target.value="";
  };

  const guardar=()=>{
    if(!texto.trim()&&fotos.length===0)return showToast("Escribe algo o agrega una foto","err");
    G.notas.push({id:ID(),texto:texto.trim(),fotos:[...fotos],usuario:usuario.nombre,rol:usuario.rol,fecha:TODAY(),hora:HOUR(),inventarioId:G.inventario?.id||""});
    setTexto("");setFotos([]);rerender();showToast("Nota guardada ✓");
  };

  const eliminar=(id)=>{G.notas=G.notas.filter(n=>n.id!==id);rerender();};

  if(!open)return(
    <button onClick={()=>setOpen(true)} style={{position:"fixed",bottom:24,right:24,width:52,height:52,borderRadius:99,background:"linear-gradient(135deg,#2563eb,#7c3aed)",color:"white",border:"none",cursor:"pointer",fontSize:22,boxShadow:"0 4px 20px rgba(37,99,235,0.5)",zIndex:900,display:"flex",alignItems:"center",justifyContent:"center"}}>
      📝
      {notasInv.length>0&&<span style={{position:"absolute",top:-4,right:-4,background:"#dc2626",color:"white",borderRadius:99,fontSize:9,fontWeight:800,width:18,height:18,display:"flex",alignItems:"center",justifyContent:"center"}}>{notasInv.length}</span>}
    </button>
  );

  return(
    <div style={{position:"fixed",bottom:24,right:24,width:380,maxWidth:"95vw",background:"white",borderRadius:20,boxShadow:"0 20px 60px rgba(0,0,0,0.25)",zIndex:900,overflow:"hidden"}}>
      {/* Header */}
      <div style={{background:"linear-gradient(135deg,#2563eb,#7c3aed)",padding:"14px 18px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div style={{color:"white"}}>
          <div style={{fontWeight:800,fontSize:14}}>📝 Notas del inventario</div>
          <div style={{fontSize:11,opacity:0.8}}>{G.inventario?.nombre||"Sin inventario activo"}</div>
        </div>
        <button onClick={()=>setOpen(false)} style={{background:"rgba(255,255,255,0.2)",border:"none",color:"white",width:28,height:28,borderRadius:99,cursor:"pointer",fontSize:14,display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
      </div>
      {/* Notas existentes */}
      <div style={{maxHeight:220,overflowY:"auto",padding:"10px 14px",display:"flex",flexDirection:"column",gap:8}}>
        {notasInv.length===0&&<div style={{textAlign:"center",color:"#94a3b8",fontSize:13,padding:"12px 0"}}>Sin notas aún. Agrega la primera.</div>}
        {notasInv.map(n=>(
          <div key={n.id} style={{background:"#f8fafc",borderRadius:10,padding:"10px 12px",border:"1px solid #e2e8f0"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
              <div style={{display:"flex",alignItems:"center",gap:6}}>
                <div style={{width:22,height:22,borderRadius:99,background:n.rol==="admin"?"#1e40af":n.rol==="gerente"?"#7c3aed":"#16a34a",color:"white",fontSize:10,fontWeight:800,display:"flex",alignItems:"center",justifyContent:"center"}}>{n.usuario[0]}</div>
                <span style={{fontSize:11,fontWeight:700,color:"#374151"}}>{n.usuario}</span>
                <span style={{fontSize:10,color:"#94a3b8"}}>{n.fecha} {n.hora}</span>
              </div>
              {(usuario.rol==="admin"||n.usuario===usuario.nombre)&&<button onClick={()=>eliminar(n.id)} style={{background:"none",border:"none",color:"#dc2626",cursor:"pointer",fontSize:13}}>✕</button>}
            </div>
            {n.texto&&<div style={{fontSize:13,color:"#374151",lineHeight:1.5}}>{n.texto}</div>}
            {n.fotos?.length>0&&(
              <div style={{display:"flex",flexWrap:"wrap",gap:6,marginTop:6}}>
                {n.fotos.map((f,i)=>(
                  <img key={i} src={f.data} alt={f.name} onClick={()=>window.open(f.data)} style={{width:60,height:60,objectFit:"cover",borderRadius:6,cursor:"pointer",border:"1px solid #e2e8f0"}}/>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
      {/* Nueva nota */}
      {G.inventario&&(
        <div style={{padding:"10px 14px",borderTop:"1px solid #f1f5f9"}}>
          <textarea value={texto} onChange={e=>setTexto(e.target.value)} placeholder="Escribe una nota u observación…" rows={2}
            style={{width:"100%",padding:"8px 10px",border:"1.5px solid #e2e8f0",borderRadius:8,fontSize:13,resize:"vertical",boxSizing:"border-box",outline:"none",fontFamily:"inherit"}}/>
          {fotos.length>0&&(
            <div style={{display:"flex",flexWrap:"wrap",gap:4,marginTop:6}}>
              {fotos.map((f,i)=>(
                <div key={i} style={{position:"relative"}}>
                  <img src={f.data} alt={f.name} style={{width:48,height:48,objectFit:"cover",borderRadius:6,border:"1px solid #e2e8f0"}}/>
                  <button onClick={()=>setFotos(fs=>fs.filter((_,j)=>j!==i))} style={{position:"absolute",top:-4,right:-4,width:16,height:16,background:"#dc2626",color:"white",border:"none",borderRadius:99,cursor:"pointer",fontSize:9,display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
                </div>
              ))}
            </div>
          )}
          <div style={{display:"flex",gap:8,marginTop:8}}>
            <label style={{padding:"7px 12px",background:"#f1f5f9",border:"1px solid #e2e8f0",borderRadius:8,cursor:"pointer",fontSize:12,fontWeight:600,color:"#374151"}}>
              📷 Foto<input type="file" accept="image/*" multiple onChange={agregarFoto} style={{display:"none"}}/>
            </label>
            <button onClick={guardar} style={{flex:1,padding:"7px",background:"linear-gradient(135deg,#2563eb,#7c3aed)",color:"white",border:"none",borderRadius:8,fontWeight:700,cursor:"pointer",fontSize:13}}>
              Guardar nota
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────
// MÓDULO GERENTE — solo lectura
// ─────────────────────────────────────────
function ModGerente({usuario,setUsuario,G,rerender,recargar,showToast}){
  const [view,setView]=useState("resumen");
  const [modalSalir,setModalSalir]=useState(false);

  useEffect(()=>{
    const t=setInterval(()=>recargar(),15000);
    return()=>clearInterval(t);
  },[]);

  const nav=[
    {id:"resumen",icon:"📊",label:"Resumen"},
    {id:"notas",icon:"📝",label:"Notas"},
    {id:"historial",icon:"🏛️",label:"Historial"},
  ];

  const pct=G.conteos.length>0?Math.round(G.conteos.filter(c=>c.estado==="completado").length/G.conteos.length*100):0;
  const notasInv=G.notas.filter(n=>n.inventarioId===(G.inventario?.id||""));

  return(
    <div style={{minHeight:"100vh",background:"#f0f4f8",fontFamily:"system-ui,sans-serif"}}>
      {/* Topbar */}
      <div style={{background:"linear-gradient(135deg,#7c3aed 0%,#4f46e5 100%)",color:"white",padding:"0 20px",display:"flex",alignItems:"center",justifyContent:"space-between",height:58,position:"sticky",top:0,zIndex:100,boxShadow:"0 2px 12px rgba(0,0,0,0.25)"}}>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <div style={{width:32,height:32,background:"rgba(255,255,255,0.2)",borderRadius:9,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16}}>📦</div>
          <div>
            <div style={{fontWeight:800,fontSize:15,letterSpacing:-0.5}}>TOMFIC</div>
            <div style={{fontSize:9,color:"rgba(255,255,255,0.6)",letterSpacing:1,textTransform:"uppercase"}}>Vista Gerente</div>
          </div>
          {G.inventario&&<div style={{background:"rgba(255,255,255,0.15)",border:"1px solid rgba(255,255,255,0.25)",fontSize:11,padding:"3px 12px",borderRadius:20,fontWeight:700}}>● {G.inventario.nombre}</div>}
        </div>
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          <button onClick={async()=>{await recargar();showToast("Actualizado ✓");}} style={{background:"rgba(255,255,255,0.1)",border:"1px solid rgba(255,255,255,0.15)",color:"white",padding:"5px 12px",borderRadius:8,fontSize:11,cursor:"pointer"}}>🔄 Sync</button>
          <div style={{display:"flex",alignItems:"center",gap:6,background:"rgba(255,255,255,0.1)",borderRadius:9,padding:"5px 10px"}}>
            <div style={{width:24,height:24,background:"linear-gradient(135deg,#7c3aed,#2563eb)",borderRadius:99,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700}}>{usuario.nombre[0]}</div>
            <span style={{fontSize:12,fontWeight:600}}>{usuario.nombre}</span>
          </div>
          <button onClick={()=>setModalSalir(true)} style={{background:"rgba(220,38,38,0.2)",border:"1px solid rgba(220,38,38,0.3)",color:"#fca5a5",padding:"6px 14px",borderRadius:8,fontSize:12,fontWeight:700,cursor:"pointer"}}>Salir</button>
        </div>
      </div>

      <div style={{display:"flex",minHeight:"calc(100vh - 58px)"}}>
        {/* Sidebar */}
        <div style={{width:160,background:"linear-gradient(180deg,#4f46e5,#7c3aed)",flexShrink:0,padding:"16px 8px",display:"flex",flexDirection:"column",gap:4}}>
          {nav.map(n=>{
            const active=view===n.id;
            return(
              <button key={n.id} onClick={()=>setView(n.id)}
                style={{width:"100%",display:"flex",alignItems:"center",gap:8,padding:"10px 12px",background:active?"rgba(255,255,255,0.2)":"transparent",color:"white",border:"none",cursor:"pointer",fontSize:13,borderRadius:10,fontWeight:active?700:400,opacity:active?1:0.7}}>
                <span>{n.icon}</span><span>{n.label}</span>
              </button>
            );
          })}
        </div>

        {/* Contenido */}
        <div style={{flex:1,padding:24,overflowY:"auto"}}>
          {view==="resumen"&&(
            <div>
              {/* Header */}
              <div style={{background:"linear-gradient(135deg,#7c3aed 0%,#4f46e5 100%)",borderRadius:16,padding:"20px 24px",marginBottom:20,color:"white",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div>
                  <div style={{fontSize:11,fontWeight:600,opacity:0.75,letterSpacing:1,textTransform:"uppercase",marginBottom:4}}>Vista Gerente</div>
                  <div style={{fontSize:22,fontWeight:800}}>{G.inventario?.nombre||"Sin inventario activo"}</div>
                  <div style={{fontSize:12,opacity:0.8,marginTop:4}}>Solo lectura · {TODAY()}</div>
                </div>
                <div style={{textAlign:"right"}}>
                  <div style={{fontSize:36,fontWeight:900}}>{pct}%</div>
                  <div style={{fontSize:11,opacity:0.8}}>completado</div>
                </div>
              </div>
              {!G.inventario?(
                <div style={{textAlign:"center",padding:"48px 20px",background:"white",borderRadius:14,border:"2px dashed #e2e8f0",color:"#64748b"}}>
                  <div style={{fontSize:48,marginBottom:12}}>📋</div>
                  <div style={{fontSize:15,fontWeight:700}}>Sin inventario activo</div>
                </div>
              ):(
                <>
                  {/* KPIs */}
                  <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:12,marginBottom:16}}>
                    {[
                      {icon:"📦",l:"Productos",v:G.productos.length,c:"#2563eb",bg:"#eff6ff"},
                      {icon:"📋",l:"Conteos",v:G.conteos.length,c:"#475569",bg:"#f8fafc"},
                      {icon:"✅",l:"Completados",v:G.conteos.filter(c=>c.estado==="completado").length,c:"#16a34a",bg:"#f0fdf4"},
                      {icon:"⚠️",l:"Diferencias",v:G.conteos.filter(c=>c.estado==="diferencia").length,c:"#dc2626",bg:"#fef2f2"},
                      {icon:"📝",l:"Notas",v:notasInv.length,c:"#7c3aed",bg:"#faf5ff"},
                    ].map(s=>(
                      <div key={s.l} style={{background:s.bg,borderRadius:14,padding:"14px 16px",boxShadow:"0 1px 4px rgba(0,0,0,0.06)",border:`1px solid ${s.c}22`}}>
                        <div style={{fontSize:20,marginBottom:6}}>{s.icon}</div>
                        <div style={{fontSize:26,fontWeight:900,color:s.c,lineHeight:1}}>{s.v}</div>
                        <div style={{fontSize:11,color:"#64748b",marginTop:4,fontWeight:600}}>{s.l}</div>
                      </div>
                    ))}
                  </div>
                  {/* Barra avance */}
                  <div style={{background:"white",borderRadius:14,padding:"18px 20px",marginBottom:16,boxShadow:"0 1px 4px rgba(0,0,0,0.06)",border:"1px solid #e2e8f0"}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                      <div>
                        <div style={{fontSize:13,fontWeight:700,color:"#0f172a"}}>Avance del inventario</div>
                        <div style={{fontSize:11,color:"#64748b",marginTop:1}}>{G.conteos.filter(c=>c.estado==="completado").length} de {G.conteos.length} conteos completados</div>
                      </div>
                      <div style={{background:"linear-gradient(135deg,#7c3aed,#4f46e5)",borderRadius:10,padding:"6px 14px"}}>
                        <span style={{fontSize:18,fontWeight:900,color:"white"}}>{pct}%</span>
                      </div>
                    </div>
                    <div style={{background:"#e2e8f0",borderRadius:99,height:14,overflow:"hidden"}}>
                      <div style={{width:pct+"%",background:"linear-gradient(90deg,#7c3aed,#4f46e5,#2563eb)",borderRadius:99,height:"100%",transition:"width 0.6s ease"}}/>
                    </div>
                  </div>
                  {/* Tabla conteos */}
                  <div style={{background:"white",borderRadius:14,overflow:"hidden",boxShadow:"0 1px 4px rgba(0,0,0,0.06)",border:"1px solid #e2e8f0"}}>
                    <div style={{padding:"14px 18px",borderBottom:"1px solid #f1f5f9",fontWeight:700,fontSize:13,color:"#0f172a"}}>Estado de conteos</div>
                    <div style={{overflowX:"auto"}}>
                      <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
                        <thead><tr style={{background:"#f8fafc"}}>
                          {["Nombre","Ubicación","C1","Estado C1","C2","Estado C2","Estado"].map(h=>(
                            <th key={h} style={{padding:"10px 14px",textAlign:"left",fontWeight:600,color:"#64748b",fontSize:11,whiteSpace:"nowrap"}}>{h}</th>
                          ))}
                        </tr></thead>
                        <tbody>
                          {G.conteos.map((c,i)=>(
                            <tr key={c.id} style={{borderBottom:"1px solid #f1f5f9",background:i%2?"#fafafa":"white"}}>
                              <td style={{padding:"10px 14px",fontWeight:700,color:"#0f172a"}}>{c.nombre}</td>
                              <td style={{padding:"10px 14px",fontSize:12,color:"#64748b"}}>{c.locLabel||"—"}</td>
                              <td style={{padding:"10px 14px",color:"#2563eb",fontWeight:600}}>{c.usuarioC1||"—"}</td>
                              <td style={{padding:"10px 14px"}}>{c.usuarioC1?<span style={{background:["cerradoC1","cerradoC2","completado"].includes(c.estado)?"#f0fdf4":"#fffbeb",color:["cerradoC1","cerradoC2","completado"].includes(c.estado)?"#16a34a":"#d97706",borderRadius:6,padding:"2px 8px",fontSize:11,fontWeight:700}}>{["cerradoC1","cerradoC2","completado"].includes(c.estado)?"OK ✓":"En curso"}</span>:"—"}</td>
                              <td style={{padding:"10px 14px",color:"#16a34a",fontWeight:600}}>{c.usuarioC2||"N/A"}</td>
                              <td style={{padding:"10px 14px"}}>{c.usuarioC2?<span style={{background:["cerradoC2","completado"].includes(c.estado)?"#f0fdf4":"#fffbeb",color:["cerradoC2","completado"].includes(c.estado)?"#16a34a":"#d97706",borderRadius:6,padding:"2px 8px",fontSize:11,fontWeight:700}}>{["cerradoC2","completado"].includes(c.estado)?"OK ✓":"Pendiente"}</span>:"—"}</td>
                              <td style={{padding:"10px 14px"}}><span style={{background:c.estado==="completado"?"#f0fdf4":c.estado==="diferencia"?"#fef2f2":"#f8fafc",color:c.estado==="completado"?"#16a34a":c.estado==="diferencia"?"#dc2626":"#64748b",borderRadius:6,padding:"3px 8px",fontSize:11,fontWeight:700}}>{c.estado}</span></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {view==="notas"&&(
            <div>
              <div style={{background:"linear-gradient(135deg,#2563eb 0%,#7c3aed 100%)",borderRadius:16,padding:"20px 24px",marginBottom:20,color:"white",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div>
                  <div style={{fontSize:11,fontWeight:600,opacity:0.75,letterSpacing:1,textTransform:"uppercase",marginBottom:4}}>Observaciones</div>
                  <div style={{fontSize:22,fontWeight:800}}>Notas del inventario</div>
                </div>
                <div style={{fontSize:28,fontWeight:900}}>{notasInv.length}</div>
              </div>
              {notasInv.length===0?(
                <div style={{textAlign:"center",padding:"48px 20px",background:"white",borderRadius:14,border:"2px dashed #e2e8f0",color:"#64748b"}}>
                  <div style={{fontSize:48,marginBottom:12}}>📝</div>
                  <div style={{fontSize:15,fontWeight:700}}>Sin notas aún</div>
                  <div style={{fontSize:13,marginTop:4}}>El admin y los capturadores pueden agregar notas durante el inventario.</div>
                </div>
              ):(
                <div style={{display:"flex",flexDirection:"column",gap:12}}>
                  {notasInv.map(n=>(
                    <div key={n.id} style={{background:"white",borderRadius:14,padding:"16px 18px",boxShadow:"0 1px 4px rgba(0,0,0,0.06)",border:"1px solid #e2e8f0"}}>
                      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
                        <div style={{width:32,height:32,borderRadius:99,background:n.rol==="admin"?"#1e40af":n.rol==="gerente"?"#7c3aed":"#16a34a",color:"white",fontSize:13,fontWeight:800,display:"flex",alignItems:"center",justifyContent:"center"}}>{n.usuario[0]}</div>
                        <div>
                          <div style={{fontWeight:700,fontSize:13,color:"#0f172a"}}>{n.usuario} <span style={{fontSize:10,color:"#94a3b8",fontWeight:400,textTransform:"uppercase"}}>{n.rol}</span></div>
                          <div style={{fontSize:11,color:"#94a3b8"}}>{n.fecha} · {n.hora}</div>
                        </div>
                      </div>
                      {n.texto&&<div style={{fontSize:14,color:"#374151",lineHeight:1.6,background:"#f8fafc",borderRadius:8,padding:"10px 12px"}}>{n.texto}</div>}
                      {n.fotos?.length>0&&(
                        <div style={{display:"flex",flexWrap:"wrap",gap:8,marginTop:10}}>
                          {n.fotos.map((f,i)=>(
                            <img key={i} src={f.data} alt={f.name} onClick={()=>window.open(f.data)} style={{width:80,height:80,objectFit:"cover",borderRadius:8,cursor:"pointer",border:"1px solid #e2e8f0",boxShadow:"0 1px 4px rgba(0,0,0,0.08)"}}/>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {view==="historial"&&(
            <div>
              <div style={{background:"linear-gradient(135deg,#1e293b 0%,#0f172a 100%)",borderRadius:16,padding:"20px 24px",marginBottom:20,color:"white",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div>
                  <div style={{fontSize:11,fontWeight:600,opacity:0.75,letterSpacing:1,textTransform:"uppercase",marginBottom:4}}>Inventarios</div>
                  <div style={{fontSize:22,fontWeight:800}}>Historial</div>
                </div>
                <div style={{fontSize:28,fontWeight:900}}>{G.historial.length}</div>
              </div>
              {G.historial.length===0?(
                <div style={{textAlign:"center",padding:"48px 20px",background:"white",borderRadius:14,border:"2px dashed #e2e8f0",color:"#64748b"}}>
                  <div style={{fontSize:48,marginBottom:12}}>🏛️</div>
                  <div style={{fontSize:15,fontWeight:700}}>Sin historial</div>
                </div>
              ):(
                <div style={{display:"flex",flexDirection:"column",gap:12}}>
                  {G.historial.map((h,i)=>{
                    const notasH=G.notas.filter(n=>n.inventarioId===h.id);
                    return(
                      <div key={i} style={{background:"white",borderRadius:14,padding:"18px 20px",boxShadow:"0 1px 4px rgba(0,0,0,0.06)",border:"1px solid #e2e8f0",borderLeft:"4px solid #7c3aed"}}>
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:8}}>
                          <div>
                            <div style={{fontWeight:800,fontSize:16,color:"#0f172a"}}>{h.nombre}</div>
                            <div style={{fontSize:12,color:"#64748b",marginTop:3}}>{h.apertura} → {h.cierre} · Por: {h.usuarioApertura}</div>
                          </div>
                          <span style={{background:h.tipo==="2conteos"?"#eff6ff":"#f0fdf4",color:h.tipo==="2conteos"?"#2563eb":"#16a34a",borderRadius:8,padding:"3px 10px",fontSize:11,fontWeight:700}}>{h.tipo==="2conteos"?"2 Conteos":"1 Conteo"}</span>
                        </div>
                        {notasH.length>0&&(
                          <div style={{marginTop:12,paddingTop:12,borderTop:"1px solid #f1f5f9"}}>
                            <div style={{fontSize:11,fontWeight:700,color:"#94a3b8",marginBottom:8,textTransform:"uppercase",letterSpacing:0.5}}>📝 {notasH.length} nota{notasH.length>1?"s":""}</div>
                            <div style={{display:"flex",flexDirection:"column",gap:6}}>
                              {notasH.map(n=>(
                                <div key={n.id} style={{background:"#f8fafc",borderRadius:8,padding:"8px 12px",fontSize:13,color:"#374151"}}>
                                  <span style={{fontWeight:700,color:"#7c3aed"}}>{n.usuario}:</span> {n.texto||"[foto]"} <span style={{color:"#94a3b8",fontSize:10}}>· {n.fecha}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {modalSalir&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.6)",zIndex:2000,display:"flex",alignItems:"center",justifyContent:"center",backdropFilter:"blur(4px)"}}>
          <div style={{background:"white",borderRadius:20,padding:32,width:380,maxWidth:"96vw"}}>
            <div style={{textAlign:"center",marginBottom:16}}>
              <div style={{fontSize:40,marginBottom:8}}>👋</div>
              <h3 style={{margin:"0 0 8px",fontSize:18,fontWeight:800}}>¿Cerrar sesión?</h3>
            </div>
            <div style={{display:"flex",gap:10,marginTop:24}}>
              <Btn c="#dc2626" onClick={()=>setUsuario(null)} full>Sí, salir</Btn>
              <Btn c="#64748b" onClick={()=>setModalSalir(false)} full outline>Cancelar</Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
