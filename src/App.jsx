import { useState, useRef, useEffect } from "react";
import * as XLSX from "xlsx";
import { createClient } from "@supabase/supabase-js";
import {
  Package, ClipboardList, Database, MapPin, FolderOpen, Radio, BarChart2,
  Users, Landmark, Bell, RefreshCw, Eye, EyeOff, AlertTriangle, CheckCircle,
  Settings, Pencil, Trash2, FileText, Calendar, Scale, Wrench, Download,
  Upload, Printer, Search, Lightbulb, DollarSign, Clock, Cloud, Menu,
  ChevronRight, LogOut, Key, Smartphone, BarChart, TrendingDown, Circle,
  AlertCircle, XCircle, Plus, Minus, X, Mail, UserPlus, Lock, ChevronDown, ChevronUp, ChevronLeft, Camera, CornerDownLeft, Globe,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge as UIBadge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { PageHeader } from "@/components/ui/page-header";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import Landing from "@/Landing";
import { mergeLanding } from "@/landingContent";

const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_KEY);

const TODAY = () => new Date().toLocaleDateString("es-CO");
const HOUR  = () => new Date().toLocaleTimeString("es-CO");
const ID    = () => Date.now().toString(36) + Math.random().toString(36).slice(2,5);
// Slug: minúsculas, sin acentos, [^a-z0-9]→'-'. DEBE coincidir con slugify() en el SQL.
const slugify = (s) => (s||"").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/(^-|-$)/g,"");
// Email sintético de un miembro de empresa (capturador/gerente/admin migrado).
const memberEmail = (nombre, slug) => `${slugify(nombre)}@${slugify(slug)}.tomfic.app`;

// --- Vencimiento de planes ---
// Fecha de hoy en ISO (YYYY-MM-DD) y días desde hoy hasta una fecha ISO (negativo = ya pasó).
const ISO_HOY = () => new Date().toISOString().slice(0,10);
const diasHasta = (iso) => iso ? Math.round((new Date(iso.slice(0,10)+"T00:00:00") - new Date(ISO_HOY()+"T00:00:00")) / 86400000) : null;
const addDias = (iso, n) => { const d = new Date((iso||ISO_HOY()).slice(0,10)+"T00:00:00"); d.setDate(d.getDate()+n); return d.toISOString().slice(0,10); };
const fmtFechaCorta = (iso) => { if(!iso) return "—"; const [y,m,d] = iso.slice(0,10).split("-"); return `${d}/${m}/${y}`; };
const GRACIA_DIAS = 3; // días de gracia tras el vencimiento antes de bloquear el acceso del cliente
const AVISO_DIAS  = 7; // días de anticipación con que se le avisa al cliente que su plan vence

// Exporta filas crudas a XLSX (encabezado + datos, sin filas de título). Sirve
// para plantillas y para importaciones externas como el ajuste de Siigo.
const exportSheet = (rows, header, fname, sheetName = "Datos") => {
  const ws = XLSX.utils.aoa_to_sheet([header, ...rows]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, fname);
};
// Encabezados del formato "Importación de comprobante de ajuste" de Siigo.
const SIIGO_AJUSTE_COLS = ["Código del producto (Obligatorio)", "Nombre del producto / Servicio", "Referencia de fábrica", "Aumenta/Disminuye (Obligatorio)", "Cantidad", "Costo Unitario"];

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
  tenantId: null,   // empresa (tenant) del usuario logueado; null = dueño/super-admin
  tenant: null,     // datos de la empresa del usuario (plan, precio, vence) para avisos
  tenants: [],      // lista de empresas (solo la carga el dueño)
};

const CAT_C = {"CARNES FRIAS":"#dc2626","CONGELADOS":"#2563eb","SALSAS Y CONSERVAS":"#d97706","LACTEOS Y DERIVADOS":"#0891b2","REPOSTERIA":"#db2777","PANADERIA":"#c2410c","ADOBOS":"#65a30d","CHAMPIÑONES":"#78350f","ACEITES":"#92400e","HARINAS":"#ca8a04","PERECEDEROS":"#16a34a","APANADOS":"#7c2d12"};
const catC = c => CAT_C[c?.trim()] || "#6b7280";

// ─────────────────────────────────────────
// ESTILOS BASE
// ─────────────────────────────────────────
const inp = {width:"100%",padding:"9px 12px",border:"1.5px solid #e2e8f0",borderRadius:8,fontSize:14,boxSizing:"border-box",outline:"none",background:"white",color:"#0f172a"};
const card = {background:"white",borderRadius:14,padding:20,boxShadow:"0 2px 8px rgba(0,0,0,0.06)",border:"1px solid #f1f5f9"};

function EstBadge({e}){
  const m={BUENO:["#dcfce7","#166534"],VENCIDO:["#fee2e2","#dc2626"],AVERIADO:["#fef3c7","#92400e"],"NO APTO VENTA":["#fee2e2","#991b1b"],BAJAS:["#fef9c3","#854d0e"],"SIN REVISAR":["#f1f5f9","#475569"]};
  const [bg,tc]=m[e]||["#f1f5f9","#475569"];
  return <span style={{background:bg,color:tc,padding:"2px 8px",borderRadius:12,fontSize:11,fontWeight:700}}>{e||"—"}</span>;
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
  id:c.id, tenant_id:G.tenantId||null, inventario_id:invId||(G.inventario?G.inventario.id:"")||"",
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
  id:inv.id,tenant_id:G.tenantId||null,nombre:inv.nombre||"",fecha:inv.fecha||"",estado,tipo:inv.tipo||"",obs:inv.obs||"",
  apertura:inv.apertura||"",hora_apertura:inv.horaApertura||"",usuario_apertura:inv.usuarioApertura||"",
  cierre:inv.cierre||"",hora_cierre:inv.horaCierre||"",usuario_cierre:inv.usuarioCierre||"",
  conteos_snapshot:inv.conteos?JSON.stringify(inv.conteos):null,
  capturas_snapshot:inv.capturas?JSON.stringify(inv.capturas):null,
  productos_snapshot:inv.productos?JSON.stringify(inv.productos):null,
});
const prodCols=(p)=>({id:p.id,tenant_id:G.tenantId||null,ean:p.ean||"",codigo:p.codigo||"",nombre:p.nombre||"",referencia:p.referencia||"",categoria:p.categoria||"",subcategoria:p.subcategoria||"",subgrupo:p.subgrupo||"",determinada:p.determinada||"",localizacion:p.localizacion||"",ubicacion:p.ubicacion||"",observacion:p.observacion||"",saldo:p.saldo||0,costo:p.costo||0,nit:p.nit||"",proveedor:p.proveedor||""});
const userCols=(u)=>({id:u.id,tenant_id:u.tenant_id||G.tenantId||null,nombre:u.nombre,pass:u.pass,rol:u.rol,activo:u.activo,creado:u.creado||TODAY(),correo:u.correo||"",telefono:u.telefono||"",cargo:u.cargo||"",turno:u.turno||"",zona:u.zona||"",obs:u.obs||""});

// --- Operaciones Supabase ---
const SB={
  // Perfil propio del usuario autenticado (id = auth.uid()).
  loadMyProfile:(uid)=>supabase.from("usuarios").select("*").eq("id",uid).maybeSingle(),
  loadTenant:(tid)=>supabase.from("tenants").select("*").eq("id",tid).maybeSingle(),
  // RPCs (SECURITY DEFINER en la base): creación/gestión privilegiada de usuarios y empresas.
  registerTenant:(empresa,slug,email,pass,nombre,nit)=>supabase.rpc("register_tenant",{p_empresa:empresa,p_slug:slug,p_email:email,p_pass:pass,p_admin_nombre:nombre||"",p_nit:nit||""}),
  createMember:(nombre,pass,rol,correo,telefono)=>supabase.rpc("create_member",{p_nombre:nombre,p_pass:pass,p_rol:rol,p_correo:correo||"",p_telefono:telefono||""}),
  resetMemberPassword:(id,pass)=>supabase.rpc("reset_member_password",{p_user_id:id,p_pass:pass}),
  deleteMember:(id)=>supabase.rpc("delete_member",{p_user_id:id}),
  setTenantActive:(tid,activo)=>supabase.rpc("set_tenant_active",{p_tid:tid,p_activo:activo}),
  deleteTenant:(tid)=>supabase.rpc("delete_tenant",{p_tid:tid}),
  setMemberActive:(id,activo)=>supabase.rpc("set_member_active",{p_user_id:id,p_activo:activo}),
  loadUsuarios:(tid)=>supabase.from("usuarios").select("*").eq("tenant_id",tid),
  // Gestión de clientes/pagos (Panel del Dueño).
  updateTenant:(tid,patch)=>supabase.from("tenants").update(patch).eq("id",tid),
  listPagos:(tid)=>supabase.from("pagos").select("*").eq("tenant_id",tid).order("fecha",{ascending:false}),
  // Todos los pagos de todas las empresas (dashboard del dueño). Requiere que RLS permita al dueño leerlos.
  listAllPagos:()=>supabase.from("pagos").select("*").order("fecha",{ascending:false}),
  // Leads (prospectos capturados desde la web pública).
  capturarLead:(nombre,email,telefono,mensaje)=>supabase.rpc("capturar_lead",{p_nombre:nombre||"",p_email:email||"",p_telefono:telefono||"",p_mensaje:mensaje||""}),
  listLeads:()=>supabase.from("leads").select("*").order("created_at",{ascending:false}),
  updateLead:(id,patch)=>supabase.from("leads").update(patch).eq("id",id),
  deleteLead:(id)=>supabase.from("leads").delete().eq("id",id),
  insertPago:(p)=>supabase.from("pagos").insert(p),
  deletePago:(id)=>supabase.from("pagos").delete().eq("id",id),
  // Datos de UNA empresa (tenant). Si tid es null, trae todo (compatibilidad).
  async loadAll(tid){
    const f=(t)=>tid?supabase.from(t).select("*").eq("tenant_id",tid):supabase.from(t).select("*");
    const [u,p,inv,c]=await Promise.all([f("usuarios"),f("productos"),f("inventarios"),f("conteos")]);
    return {usuarios:u.data||[],productos:p.data||[],inventarios:inv.data||[],conteos:c.data||[]};
  },
  // Empresas (tenants)
  listTenants:()=>supabase.from("tenants").select("*").order("created_at",{ascending:false}),
  upsertTenant:(t)=>supabase.from("tenants").upsert(t,{onConflict:"id"}),
  upsertUsuario:(u)=>supabase.from("usuarios").upsert(u,{onConflict:"id"}),
  updateUsuario:(id,patch)=>supabase.from("usuarios").update(patch).eq("id",id),
  deleteUsuario:(id)=>supabase.from("usuarios").delete().eq("id",id),
  async upsertProductosBulk(prods){for(let i=0;i<prods.length;i+=500){await supabase.from("productos").upsert(prods.slice(i,i+500),{onConflict:"id"});}},
  // SIEMPRE scopeado por empresa. Si no hay tenant, es un NO-OP: nunca un borrado global
  // (con RLS el dueño podría borrar productos de TODAS las empresas → se prohíbe de raíz).
  deleteAllProductos:(tid)=>tid?supabase.from("productos").delete().eq("tenant_id",tid):Promise.resolve({data:null,error:null}),
  deleteProductosByIds:async(ids)=>{for(let i=0;i<ids.length;i+=200){const{error}=await supabase.from("productos").delete().in("id",ids.slice(i,i+200));if(error)throw error;}},
  upsertInventario:(inv)=>supabase.from("inventarios").upsert(inv,{onConflict:"id"}),
  upsertConteo:(c)=>supabase.from("conteos").upsert(c,{onConflict:"id"}),
  deleteConteo:(id)=>supabase.from("conteos").delete().eq("id",id),
  deleteInventario:(id)=>supabase.from("inventarios").delete().eq("id",id),
  // Configuración global key/value (ej: contenido de la landing). Tabla: app_config(key text pk, value jsonb)
  getConfig:async(key)=>{try{const{data}=await supabase.from("app_config").select("value").eq("key",key).maybeSingle();return data?data.value:null;}catch(e){return null;}},
  setConfig:(key,value)=>supabase.from("app_config").upsert({key,value},{onConflict:"key"}),
};

// --- Config local (localizaciones, tipos, alertas) ---
// La config de ubicaciones es POR EMPRESA: la clave de localStorage se separa por tenant
// para que el caché de una empresa nunca se mezcle con el de otra.
const cfgKey=()=>CONFIG_KEY+(G.tenantId?(":"+G.tenantId):"");
const saveLocalConfig=()=>{try{localStorage.setItem(cfgKey(),JSON.stringify({localizaciones:G.localizaciones,ubicacionesTipos:G.ubicacionesTipos,localizacionTipos:G.localizacionTipos,alertas:G.alertas}));}catch(e){}};
const loadLocalConfig=()=>{try{const raw=localStorage.getItem(cfgKey());if(!raw)return;const d=JSON.parse(raw);if(d.localizaciones)G.localizaciones=d.localizaciones;if(d.ubicacionesTipos&&d.ubicacionesTipos.length)G.ubicacionesTipos=d.ubicacionesTipos;if(d.localizacionTipos&&d.localizacionTipos.length)G.localizacionTipos=d.localizacionTipos;if(d.alertas)G.alertas=d.alertas;}catch(e){}};
// Config con la que arranca una empresa recién creada: vacía de ubicaciones/tipos propios
// (el cliente crea los suyos). Los tipos de localización se dejan como catálogo genérico de arranque.
const DEF_LOC_TIPOS=["MUEBLE","LINEAL","NEVERA","PUNTA","JAULA","CAVA"];
const resetTenantConfig=()=>{G.localizaciones=[];G.ubicacionesTipos=[];G.localizacionTipos=[...DEF_LOC_TIPOS];G.alertas=[];G.notas=[];};
// ¿El conteo quedó completo/cerrado? (misma lógica que estadoConteo: null = completo)
const conteoCompleto=(c)=>c.estado==="completado"||c.estado==="cerradoC2"||(c.estado==="cerradoC1"&&c.tipo!=="2conteos");
// Habilita "Sube saldos": debe haber conteos y estar TODOS cerrados.
const todosConteosCerrados=()=>G.conteos.length>0&&G.conteos.every(conteoCompleto);
const saveLocalCache=()=>{try{localStorage.setItem(STORAGE_KEY,JSON.stringify({productos:G.productos,usuarios:G.usuarios,inventario:G.inventario,conteos:G.conteos,capturas:G.capturas,historial:G.historial,savedAt:new Date().toISOString()}));}catch(e){}};

// --- Snapshot para sincronización por diferencias ---
let _snap={u:{},c:{},inv:"",hist:{},prods:{},cfg:""};
const initSnap=()=>{
  _snap={u:{},c:{},inv:"",hist:{},prods:{},cfg:""};
  G.usuarios.forEach(u=>{_snap.u[u.id]=JSON.stringify(userCols(u));});
  G.productos.forEach(p=>{_snap.prods[p.id]=JSON.stringify(prodCols(p));});
  _snap.inv=G.inventario?JSON.stringify(serInv(G.inventario,"abierto")):"";
  G.historial.forEach(h=>{_snap.hist[h.id]=JSON.stringify(serInv(h,"cerrado"));});
  G.conteos.forEach(c=>{_snap.c[c.id]=JSON.stringify(serConteo(c));});
};

let _syncing=false,_pending=false,_syncTimer=null;
let _dirty=false; // true cuando hay cambios locales sin confirmar en la nube. Evita que el auto-refresco los pise.
let _clearBase=false; // true SOLO cuando el usuario pidió explícitamente vaciar la base. Habilita el borrado total.
let _busy=false; // true mientras se hace una operación crítica (importar base, eliminar, cerrar). Pausa el auto-refresco.
const doSync=async()=>{
  // El dueño (sin empresa asociada) NUNCA sincroniza datos de inventario. Su snapshot
  // vacío haría que doSync intente "borrar" los productos/inventarios de la base — y por
  // RLS el dueño puede tocar TODAS las empresas. Sin este guard se vacía la base entera.
  if(!G.tenantId)return;
  if(_syncing){_pending=true;return;}
  _syncing=true;_dirty=false;
  try{
    // Los usuarios NO se sincronizan aquí: se crean/editan/eliminan con RPCs y
    // updates explícitos (VUsuarios), porque cada uno tiene credencial en Auth.
    // Sync de productos NO destructivo: upsert de lo nuevo/cambiado y borrado SOLO de los
    // ids realmente eliminados. Nunca "borra todo y reinserta" (antes eso vaciaba la base si
    // el upsert fallaba a mitad de camino o si G.productos quedaba vacío por una carrera).
    const curP={};G.productos.forEach(p=>{curP[p.id]=prodCols(p);});
    const cambiados=[];for(const id in curP){const s=JSON.stringify(curP[id]);if(_snap.prods[id]!==s)cambiados.push(curP[id]);}
    const eliminados=[];for(const id in _snap.prods){if(!curP[id])eliminados.push(id);}
    // Freno de seguridad: si de golpe desaparecen TODOS los productos y NO fue un borrado
    // explícito del usuario, se cancela para no vaciar la base por un error o una carrera.
    if(eliminados.length && Object.keys(curP).length===0 && !_clearBase){
      throw new Error("Sync cancelado: se intentó vaciar toda la base de productos sin orden explícita.");
    }
    if(cambiados.length)await SB.upsertProductosBulk(cambiados);
    if(eliminados.length)await SB.deleteProductosByIds(eliminados);
    for(const id in curP)_snap.prods[id]=JSON.stringify(curP[id]);
    for(const id in _snap.prods){if(!curP[id])delete _snap.prods[id];}
    _clearBase=false;
    const invObj=G.inventario?serInv(G.inventario,"abierto"):null;
    const invS=invObj?JSON.stringify(invObj):"";
    if(invS!==_snap.inv){if(invObj)await SB.upsertInventario(invObj);_snap.inv=invS;}
    const curH={};G.historial.forEach(h=>{curH[h.id]=serInv(h,"cerrado");});
    for(const id in curH){const s=JSON.stringify(curH[id]);if(_snap.hist[id]!==s){await SB.upsertInventario(curH[id]);_snap.hist[id]=s;}}
    for(const id in _snap.hist){if(!curH[id]){await SB.deleteInventario(id);delete _snap.hist[id];}}
    const curC={};G.conteos.forEach(c=>{curC[c.id]=serConteo(c);});
    for(const id in curC){const s=JSON.stringify(curC[id]);if(_snap.c[id]!==s){await SB.upsertConteo(curC[id]);_snap.c[id]=s;}}
    for(const id in _snap.c){if(!curC[id]){await SB.deleteConteo(id);delete _snap.c[id];}}
    // Config por-empresa (localizaciones/tipos/alertas/notas) → app_config key tenant:<id>:config
    if(G.tenantId){
      const cfg=JSON.stringify({localizaciones:G.localizaciones,ubicacionesTipos:G.ubicacionesTipos,localizacionTipos:G.localizacionTipos,alertas:G.alertas,notas:G.notas});
      if(cfg!==_snap.cfg){await SB.setConfig(`tenant:${G.tenantId}:config`,JSON.parse(cfg));_snap.cfg=cfg;}
    }
  }catch(e){_dirty=true;console.warn("Error de sincronización:",e);}
  _syncing=false;
  if(_pending){_pending=false;doSync();}
};
const scheduleSync=()=>{_dirty=true;if(_syncTimer)clearTimeout(_syncTimer);_syncTimer=setTimeout(doSync,400);};
if(typeof window!=="undefined"){window.addEventListener("beforeunload",()=>{try{doSync();}catch(e){}});}

// Carga inicial mínima (al montar): solo el contenido público de la web.
// Los usuarios ya NO se precargan: cada login autentica contra Supabase Auth y
// luego carga el perfil + los datos de su empresa.
const loadBootstrap=async()=>{
  G.landingContent=await SB.getConfig("landing"); // contenido editable de la web pública
};

// Carga de los datos de UNA empresa (tenant), tras el login del usuario.
const loadTenantData=async(tid)=>{
  G.tenantId=tid;
  // Empieza SIEMPRE con config limpia para que ninguna empresa herede ubicaciones de otra.
  resetTenantConfig();
  // Config de la empresa (localizaciones/tipos/alertas/notas) desde la nube; si no hay, cae a localStorage (por-empresa).
  const cfg=await SB.getConfig(`tenant:${tid}:config`);
  if(cfg){
    if(cfg.localizaciones)G.localizaciones=cfg.localizaciones;
    if(cfg.ubicacionesTipos&&cfg.ubicacionesTipos.length)G.ubicacionesTipos=cfg.ubicacionesTipos;
    if(cfg.localizacionTipos&&cfg.localizacionTipos.length)G.localizacionTipos=cfg.localizacionTipos;
    if(cfg.alertas)G.alertas=cfg.alertas;
    if(cfg.notas)G.notas=cfg.notas;
  } else { loadLocalConfig(); }
  const {usuarios,productos,inventarios,conteos}=await SB.loadAll(tid);
  if(usuarios.length)G.usuarios=usuarios; // usuarios de esta empresa
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

// Lista de empresas (para el panel del dueño).
const loadTenants=async()=>{const t=await SB.listTenants();G.tenants=t.data||[];};

// ─────────────────────────────────────────
// APP
// ─────────────────────────────────────────
export default function TomficApp(){
  const [usuario,setUsuario]=useState(null);
  const [loginForm,setLoginForm]=useState({tab:"equipo",empresa:"",user:"",email:"",pass:""});
  const [loginErr,setLoginErr]=useState("");
  const [entrar,setEntrar]=useState(false); // false = landing pública · true = pantalla de login
  const [,tick]=useState(0);
  const [lastSaved,setLastSaved]=useState(null);
  const [loading,setLoading]=useState(true);
  const [loadingTenant,setLoadingTenant]=useState(false); // cargando datos de la empresa tras el login
  const [recovery,setRecovery]=useState(false); // pantalla "nueva contraseña" tras clic en el correo de recuperación
  const [loadErr,setLoadErr]=useState("");

  // Tras autenticarse (login nuevo o sesión restaurada al recargar): cargar el
  // perfil propio + los datos de su empresa. Devuelve true si quedó logueado.
  const afterAuth=async()=>{
    const {data:{user:au}}=await supabase.auth.getUser();
    if(!au)return false;
    const {data:perfil}=await SB.loadMyProfile(au.id);
    if(!perfil){await supabase.auth.signOut();setLoginErr("Tu usuario no tiene perfil. Contacta al administrador.");return false;}
    if(perfil.activo===false){await supabase.auth.signOut();setLoginErr("Tu usuario está inactivo.");return false;}
    G.tenant=null; // datos de la empresa del usuario (null para el dueño)
    if(perfil.rol!=="dueno"){
      const {data:ten}=await SB.loadTenant(perfil.tenant_id);
      if(!ten||ten.activo===false){await supabase.auth.signOut();setLoginErr("Tu empresa está pendiente de aprobación o ha sido suspendida.");return false;}
      // Bloqueo total por plan vencido: se permite un periodo de gracia tras la fecha de vencimiento.
      const d=diasHasta(ten.vence);
      if(d!==null&&d+GRACIA_DIAS<0){await supabase.auth.signOut();setLoginErr(`Tu plan venció el ${fmtFechaCorta(ten.vence)}. Contacta a tu proveedor para renovar el servicio.`);return false;}
      G.tenant=ten; // plan, precio y fecha de vencimiento → para los avisos dentro de la app
    }
    setLoadingTenant(true);
    try{
      if(perfil.rol==="dueno"){G.tenantId=null;await loadTenants();}
      else{await loadTenantData(perfil.tenant_id);}
    }catch(e){console.warn("Error cargando datos de la empresa:",e);}
    setLoadingTenant(false);
    setUsuario(perfil);
    return true;
  };

  useEffect(()=>{
    (async()=>{
      try{await loadBootstrap();}catch(e){console.error(e);setLoadErr("Error de conexión con la nube");}
      try{
        const {data:{session}}=await supabase.auth.getSession();
        if(session)await afterAuth();
      }catch(e){console.warn(e);}
      setLoading(false);
    })();
    // Mantener el estado en sincronía si la sesión expira o se cierra en otra pestaña.
    const {data:sub}=supabase.auth.onAuthStateChange((event)=>{
      if(event==="SIGNED_OUT"){G.tenantId=null;G.tenant=null;setUsuario(null);}
      // El usuario llegó desde el enlace del correo de recuperación → pedir clave nueva.
      if(event==="PASSWORD_RECOVERY"){setRecovery(true);}
    });
    return ()=>{try{sub.subscription.unsubscribe();}catch(e){}};
  },[]);

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
  const recargar=async()=>{
    if(_busy)return;
    // Antes de bajar de la nube, empuja cualquier cambio local sin confirmar
    // (evita que el auto-refresco borre una captura recién hecha).
    if(G.tenantId&&_dirty){
      if(_syncTimer){clearTimeout(_syncTimer);_syncTimer=null;}
      try{await doSync();}catch(e){}
      if(_dirty)return; // el envío falló → NO recargues: perderías lo local
    }
    if(_syncing)return;
    try{if(usuario&&usuario.rol==="dueno")await loadTenants();else if(G.tenantId)await loadTenantData(G.tenantId);}catch(e){}
    tick(n=>n+1);
  };

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
      email=memberEmail(usr,emp); // usuario@empresa.tomfic.app
    }
    setLoadingTenant(true);
    const {error}=await supabase.auth.signInWithPassword({email,password:pass});
    if(error){
      setLoadingTenant(false);
      return setLoginErr(loginForm.tab==="admin"?"Email o contraseña incorrectos":"Empresa, usuario o contraseña incorrectos");
    }
    const ok=await afterAuth();
    if(!ok)setLoadingTenant(false);
  };

  // Registro autoservicio de empresa desde la landing (queda pendiente de aprobación).
  const registrarEmpresa=async({empresa,slug,email,pass,nombre,nit})=>{
    const {data,error}=await SB.registerTenant(empresa,slug,email,pass,nombre,nit);
    if(error)return {ok:false,error:error.message||"No se pudo completar el registro"};
    return {ok:true,data};
  };
  // Captura de un prospecto (lead) desde la web pública. Va por RPC (visitante anónimo).
  const capturarLead=async({nombre,email,telefono,mensaje})=>{
    const {error}=await SB.capturarLead(nombre,email,telefono,mensaje);
    if(error)return {ok:false,error:error.message||"No se pudo enviar. Intenta de nuevo."};
    return {ok:true};
  };

  // Cierre de sesión: termina la sesión de Auth y limpia el estado en memoria.
  const logout=async()=>{
    try{await supabase.auth.signOut();}catch(e){}
    G.tenantId=null;G.tenants=[];G.productos=[];G.conteos=[];G.capturas={};G.inventario=null;G.historial=[];G.notas=[];
    setEntrar(false);setLoginForm({tab:"equipo",empresa:"",user:"",email:"",pass:""});setLoginErr("");
    setUsuario(null);
  };

  // Llegó desde el correo de recuperación: pantalla para fijar clave nueva (gana sobre todo).
  if(recovery)return(<SetNewPassword onDone={()=>{setRecovery(false);setUsuario(null);setEntrar(true);setLoginForm(f=>({...f,tab:"admin"}));showToast("Contraseña actualizada. Inicia sesión con tu clave nueva.");}}/>);

  if(loading)return(<div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"#0f172a",fontFamily:"system-ui,sans-serif"}}><div style={{textAlign:"center",color:"white"}}><div style={{display:"flex",justifyContent:"center",marginBottom:16}}><Package size={52} color="#2563eb"/></div><div style={{fontSize:24,fontWeight:900,marginBottom:8}}>TOMFIC</div><div style={{fontSize:14,color:"#64748b"}}>{loadErr||"Cargando datos de la nube..."}</div><div style={{marginTop:20,width:200,height:4,background:"#1e293b",borderRadius:99,overflow:"hidden",margin:"20px auto 0"}}><div style={{width:"60%",height:"100%",background:"linear-gradient(90deg,#2563eb,#16a34a)",borderRadius:99}}/></div></div></div>);

  if(loadingTenant)return(<div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"#0f172a",fontFamily:"system-ui,sans-serif"}}><div style={{textAlign:"center",color:"white"}}><div style={{display:"flex",justifyContent:"center",marginBottom:16}}><Package size={52} color="#2563eb"/></div><div style={{fontSize:24,fontWeight:900,marginBottom:8}}>TOMFIC</div><div style={{fontSize:14,color:"#64748b"}}>Cargando tu empresa…</div></div></div>);

  if(!usuario) return entrar
    ? <Login lf={loginForm} setLf={setLoginForm} err={loginErr} onLogin={login} lastSaved={lastSaved} onBack={()=>{setEntrar(false);setLoginErr("");}}/>
    : <Landing onEnter={()=>setEntrar(true)} onRegister={registrarEmpresa} onLead={capturarLead} content={mergeLanding(G.landingContent)}/>;
  const p={usuario,setUsuario,logout,G,rerender,recargar,showToast,lastSaved,limpiarDatos};
  return(
    <>
      {toast&&<div style={{position:"fixed",top:66,right:10,background:toast.type==="err"?"#dc2626":toast.type==="warn"?"#d97706":"#16a34a",color:"white",padding:"6px 12px",borderRadius:8,zIndex:9999,fontSize:12,fontWeight:700,boxShadow:"0 3px 12px rgba(0,0,0,0.18)",pointerEvents:"none",maxWidth:210,lineHeight:1.25}}>{toast.msg}</div>}
      {usuario.rol==="dueno"?<PanelDueno {...p}/>:usuario.rol==="capturador"?<ModCapturador {...p}/>:usuario.rol==="gerente"?<ModGerente {...p}/>:<ModAdmin {...p}/>}
    </>
  );
}

// ─────────────────────────────────────────
// NUEVA CONTRASEÑA (tras enlace de recuperación por correo)
// ─────────────────────────────────────────
function SetNewPassword({onDone}){
  const [p1,setP1]=useState("");
  const [p2,setP2]=useState("");
  const [show,setShow]=useState(false);
  const [busy,setBusy]=useState(false);
  const [err,setErr]=useState("");
  const guardar=async()=>{
    setErr("");
    if(p1.length<6)return setErr("La contraseña debe tener al menos 6 caracteres.");
    if(p1!==p2)return setErr("Las contraseñas no coinciden.");
    setBusy(true);
    const {error}=await supabase.auth.updateUser({password:p1});
    if(error){setBusy(false);return setErr(error.message||"No se pudo actualizar la contraseña.");}
    try{await supabase.auth.signOut();}catch(e){}
    setBusy(false);
    onDone&&onDone();
  };
  return(
    <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"#0f172a",fontFamily:"system-ui,sans-serif",padding:"1.5rem"}}>
      <div style={{width:"100%",maxWidth:380,background:"white",borderRadius:16,padding:28,boxShadow:"0 4px 24px rgba(0,0,0,0.25)"}}>
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:6}}>
          <div style={{width:34,height:34,background:"linear-gradient(135deg,#2563eb,#0891b2)",borderRadius:9,display:"flex",alignItems:"center",justifyContent:"center"}}><Key size={17} color="white"/></div>
          <span style={{fontSize:20,fontWeight:900,color:"#0f172a"}}>Nueva contraseña</span>
        </div>
        <p style={{fontSize:13,color:"#64748b",marginBottom:18}}>Escribe tu nueva contraseña para tu cuenta TOMFIC.</p>
        <div className="space-y-3">
          <div className="space-y-1.5"><Label>Nueva contraseña</Label>
            <div className="relative">
              <Input type={show?"text":"password"} value={p1} onChange={e=>setP1(e.target.value)} placeholder="mín. 6 caracteres" className="h-11 pr-11"/>
              <button onClick={()=>setShow(v=>!v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">{show?<EyeOff size={18}/>:<Eye size={18}/>}</button>
            </div>
          </div>
          <div className="space-y-1.5"><Label>Confirmar contraseña</Label>
            <Input type={show?"text":"password"} value={p2} onChange={e=>setP2(e.target.value)} onKeyDown={e=>e.key==="Enter"&&guardar()} placeholder="repite la contraseña" className="h-11"/>
          </div>
          {err&&<div style={{background:"#fef2f2",color:"#dc2626",padding:"10px 14px",borderRadius:8,fontSize:13,fontWeight:600,display:"flex",alignItems:"center",gap:8}}><AlertTriangle size={14}/> {err}</div>}
          <Button className="w-full h-11" onClick={guardar} disabled={busy}>{busy?"Guardando…":<><Key size={15}/> Guardar contraseña</>}</Button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────
// LOGIN
// ─────────────────────────────────────────
function Login({lf,setLf,err,onLogin,lastSaved,onBack}){
  const [showPass,setShowPass]=useState(false);
  const [showRecuperar,setShowRecuperar]=useState(false);
  const [recEmail,setRecEmail]=useState("");
  const [recMsg,setRecMsg]=useState(null); // {ok:boolean, txt:string}
  const [recBusy,setRecBusy]=useState(false);
  const enviarRecuperacion=async()=>{
    const email=(recEmail||lf.email||"").trim().toLowerCase();
    setRecMsg(null);
    if(!email||!email.includes("@"))return setRecMsg({ok:false,txt:"Escribe un email válido."});
    setRecBusy(true);
    const {error}=await supabase.auth.resetPasswordForEmail(email,{redirectTo:window.location.origin});
    setRecBusy(false);
    setRecMsg(error
      ?{ok:false,txt:"No se pudo enviar: "+(error.message||"intenta de nuevo")}
      :{ok:true,txt:"Listo ✓ Te enviamos un enlace a "+email+". Revisa tu correo (y la carpeta de spam)."});
  };
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
            {icon:Package,   "txt":"Gestión de conteos por ubicación"},
            {icon:Users,     "txt":"Múltiples capturadores simultáneos"},
            {icon:BarChart2, "txt":"Reportes y diferencias en tiempo real"},
            {icon:Landmark,  "txt":"Historial permanente de inventarios"},
          ].map((f,i)=>(
            <div key={i} style={{display:"flex",alignItems:"center",gap:12,background:"rgba(255,255,255,0.05)",borderRadius:10,padding:"10px 14px",border:"1px solid rgba(255,255,255,0.08)"}}>
              <f.icon size={18} color="#93c5fd" />
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
            {onBack&&(
              <button onClick={onBack} className="mb-4 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900 transition-colors">
                <ChevronLeft size={16}/> Volver al inicio
              </button>
            )}
            <div style={{marginBottom:16,background:"#eff6ff",border:"1px solid #bfdbfe",borderRadius:10,padding:"10px 14px",fontSize:12,color:"#1e40af",display:"flex",alignItems:"center",gap:8}}>
              <Cloud size={16} color="#2563eb" />
              <div>
                <b>Conectado a la nube</b><br/>
                <span style={{fontSize:11,color:"#64748b"}}>Datos sincronizados en tiempo real</span>
              </div>
            </div>
            {/* Selector de tipo de acceso */}
            <div className="mb-5 grid grid-cols-2 gap-1 rounded-lg bg-slate-100 p-1">
              {[["equipo","Equipo"],["admin","Administrador"]].map(([v,t])=>(
                <button key={v} type="button" onClick={()=>setLf(p=>({...p,tab:v}))}
                  className={`h-9 rounded-md text-sm font-bold transition-colors ${lf.tab===v?"bg-white text-primary shadow-sm":"text-slate-500 hover:text-slate-700"}`}>
                  {t}
                </button>
              ))}
            </div>

            {lf.tab==="admin"?(
              <div className="mb-5 space-y-1.5">
                <Label>Email</Label>
                <Input type="email" value={lf.email} onChange={e=>setLf(p=>({...p,email:e.target.value}))}
                  placeholder="tucorreo@empresa.com" onKeyDown={e=>e.key==="Enter"&&onLogin()}
                  className="h-11 text-[15px]"/>
              </div>
            ):(
              <>
                <div className="mb-4 space-y-1.5">
                  <Label>Empresa (NIT)</Label>
                  <Input value={lf.empresa} onChange={e=>setLf(p=>({...p,empresa:e.target.value}))}
                    placeholder="NIT de tu empresa" onKeyDown={e=>e.key==="Enter"&&onLogin()}
                    className="h-11 text-[15px]"/>
                </div>
                <div className="mb-5 space-y-1.5">
                  <Label>Usuario</Label>
                  <Input value={lf.user} onChange={e=>setLf(p=>({...p,user:e.target.value}))}
                    placeholder="Tu nombre de usuario" onKeyDown={e=>e.key==="Enter"&&onLogin()}
                    className="h-11 text-[15px]"/>
                </div>
              </>
            )}

            <div className="mb-5 space-y-1.5">
              <Label>Contraseña</Label>
              <div className="relative">
                <Input type={showPass?"text":"password"} value={lf.pass}
                  onChange={e=>setLf(p=>({...p,pass:e.target.value}))}
                  onKeyDown={e=>e.key==="Enter"&&onLogin()}
                  placeholder="••••••••"
                  className="h-11 pr-11 text-[15px]"/>
                <button onClick={()=>setShowPass(v=>!v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                  {showPass?<EyeOff size={18}/>:<Eye size={18}/>}
                </button>
              </div>
            </div>

            {err&&(
              <div style={{background:"#fef2f2",color:"#dc2626",padding:"10px 14px",borderRadius:8,marginBottom:16,fontSize:13,fontWeight:600,display:"flex",alignItems:"center",gap:8}}>
                <AlertTriangle size={14} style={{flexShrink:0}}/> {err}
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
            {showRecuperar&&(lf.tab==="admin"?(
              <div style={{marginTop:12,background:"#eff6ff",border:"1px solid #bfdbfe",borderRadius:10,padding:14,fontSize:13,color:"#1e40af",lineHeight:1.6}}>
                <b>Recuperar contraseña</b><br/>
                <span style={{fontSize:12,color:"#475569"}}>Te enviaremos un enlace a tu correo para crear una clave nueva.</span>
                <div style={{marginTop:10}} className="space-y-2">
                  <Input type="email" value={recEmail||lf.email} onChange={e=>setRecEmail(e.target.value)}
                    placeholder="tucorreo@empresa.com" onKeyDown={e=>e.key==="Enter"&&enviarRecuperacion()} className="h-10 bg-white"/>
                  <Button className="w-full h-10" onClick={enviarRecuperacion} disabled={recBusy}>{recBusy?"Enviando…":"Enviarme el correo"}</Button>
                </div>
                {recMsg&&<div style={{marginTop:8,fontSize:12,fontWeight:600,color:recMsg.ok?"#15803d":"#dc2626"}}>{recMsg.txt}</div>}
              </div>
            ):(
              <div style={{marginTop:12,background:"#eff6ff",border:"1px solid #bfdbfe",borderRadius:10,padding:14,fontSize:13,color:"#1e40af",lineHeight:1.6}}>
                <b>¿Olvidaste tu usuario o contraseña?</b><br/>
                <span style={{fontSize:12,color:"#475569"}}>Pídele a tu <b>administrador</b> que te recuerde el usuario o restablezca tu clave desde el módulo <b>Usuarios</b>. Los accesos de equipo se recuperan por el administrador, no por correo.</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// Aviso de vencimiento del plan dentro de la app del cliente (admin/gerente).
// Aparece cuando faltan ≤ AVISO_DIAS o cuando el plan ya venció (dentro de la gracia).
function BannerVencimiento({G}){
  const v=G.tenant&&G.tenant.vence;
  const d=diasHasta(v);
  if(d===null||d>AVISO_DIAS)return null; // sin fecha o aún lejos → sin aviso
  const vencido=d<0;
  const restan=GRACIA_DIAS+d; // días que faltan para el bloqueo cuando ya venció
  const bg=vencido?"#fef2f2":"#fffbeb", bd=vencido?"#fecaca":"#fde68a", fg=vencido?"#b91c1c":"#b45309";
  const Icono=vencido?AlertCircle:Clock;
  let msg;
  if(!vencido) msg = d===0
    ? <>Tu plan <b>vence hoy</b> ({fmtFechaCorta(v)}). Realiza el pago para no perder el acceso.</>
    : <>Tu plan vence en <b>{d} día{d===1?"":"s"}</b> ({fmtFechaCorta(v)}). Renueva a tiempo para no perder el acceso.</>;
  else msg = <>Tu plan <b>venció el {fmtFechaCorta(v)}</b>. Tu acceso se bloqueará {restan<=0?<b>hoy</b>:<>en <b>{restan} día{restan===1?"":"s"}</b></>} si no se registra el pago. Contacta a tu proveedor.</>;
  return(
    <div style={{display:"flex",alignItems:"center",gap:10,background:bg,border:`1px solid ${bd}`,color:fg,borderRadius:10,padding:"10px 14px",fontSize:13,fontWeight:600,marginBottom:16}}>
      <Icono size={18} style={{flexShrink:0}}/>
      <div>{msg}</div>
    </div>
  );
}

// ─────────────────────────────────────────
// ADMIN
// ─────────────────────────────────────────
function ModAdmin({usuario,setUsuario,logout,G,rerender,recargar,showToast,lastSaved,limpiarDatos}){
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
        <div style={{width:sideCollapsed?64:210,background:"linear-gradient(180deg,#1e293b 0%,#0f172a 100%)",flexShrink:0,height:"100%",overflowY:"auto",overflowX:"hidden",transition:"width 0.25s ease",boxShadow:"2px 0 12px rgba(0,0,0,0.2)"}}>
          <div style={{padding:sideCollapsed?"12px 8px":"16px 10px",display:"flex",flexDirection:"column",gap:3}}>
            {nav.map(n=>{
              const active=view===n.id;
              return(
                <button key={n.id} onClick={()=>setView(n.id)}
                  title={sideCollapsed?n.label:""}
                  style={{width:"100%",display:"flex",alignItems:"center",gap:10,padding:sideCollapsed?"10px":"10px 12px",background:active?"linear-gradient(135deg,#2563eb,#1d4ed8)":"transparent",color:active?"white":"#64748b",border:"none",cursor:"pointer",fontSize:13,textAlign:"left",borderRadius:10,transition:"all 0.15s",position:"relative",overflow:"hidden"}}>
                  {active&&<div style={{position:"absolute",left:0,top:"20%",bottom:"20%",width:3,background:"#60a5fa",borderRadius:"0 3px 3px 0"}}/>}
                  <n.icon size={18} style={{flexShrink:0,opacity:active?1:0.5}}/>
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
              <div style={{fontSize:11,color:"#475569"}}>v2.1</div>
            </div>
          )}
        </div>

        {/* CONTENIDO */}
        <div style={{flex:1,padding:24,overflowY:"auto",minWidth:0}}>

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
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-white py-16 px-5 text-center shadow-sm">
          <ClipboardList size={64} className="text-slate-400 mb-4"/>
          <div className="text-xl font-extrabold text-slate-900 mb-2">Sin inventario activo</div>
          <div className="text-sm text-muted-foreground mb-6 max-w-sm">Crea un nuevo inventario para comenzar a registrar conteos de productos.</div>
          <Button onClick={()=>setModal(true)}><Plus size={16}/> Crear Inventario</Button>
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
                {l:"Productos",v:G.productos.length,icon:Package},
                {l:"Conteos",v:G.conteos.length,icon:ClipboardList},
                {l:"Completados",v:st.comp,icon:CheckCircle},
                {l:"Diferencias",v:st.dif,icon:AlertTriangle},
              ].map(s=>(
                <div key={s.l} style={{background:"rgba(255,255,255,0.07)",borderRadius:12,padding:"12px 14px",border:"1px solid rgba(255,255,255,0.08)"}}>
                  <div style={{marginBottom:4}}><s.icon size={16} color="white"/></div>
                  <div style={{fontSize:22,fontWeight:900,color:"white"}}>{s.v}</div>
                  <div style={{fontSize:10,color:"#94a3b8",marginTop:2,textTransform:"uppercase",letterSpacing:0.5}}>{s.l}</div>
                </div>
              ))}
            </div>
          </div>
          {/* Acciones */}
          <div className="flex gap-2.5 mb-4 flex-wrap">
            <Button variant="destructive" onClick={intentarCerrar}><Lock size={15}/> Cerrar Inventario</Button>
            <Button variant="outline" onClick={()=>{setEditForm({nombre:G.inventario.nombre,obs:G.inventario.obs||""});setModalEdit(true);}}><Pencil size={15}/> Editar</Button>
            <Button variant="outline" className="text-destructive border-red-200 hover:bg-red-50 hover:text-destructive" onClick={()=>setModalEliminar(true)}><Trash2 size={15}/> Eliminar</Button>
          </div>
          {G.inventario.obs&&<div className="mb-3 flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-muted-foreground"><FileText size={15} className="shrink-0"/> {G.inventario.obs}</div>}
          {G.productos.length===0&&<div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-700"><AlertTriangle size={15} className="shrink-0"/> La base de productos está vacía. Ve a "Base de datos" y carga el Excel del cliente antes de programar conteos.</div>}
          {G.productos.length>0&&<div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm font-semibold text-green-700"><CheckCircle size={15} className="shrink-0"/> Base lista: {G.productos.length} productos disponibles. Puedes programar los conteos.</div>}
        </>
      )}
      <Dialog open={modal} onOpenChange={setModal}>
        <DialogContent className="max-w-md max-h-[92vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Nuevo Inventario</DialogTitle></DialogHeader>
          <div className="space-y-3.5">
            <div className="space-y-1.5">
              <Label>Nombre del inventario</Label>
              <Input value={form.nombre} onChange={e=>setForm(p=>({...p,nombre:e.target.value}))} placeholder="Ej: Inventario General Junio 2025"/>
            </div>
            <div className="space-y-1.5">
              <Label>Fecha</Label>
              <Input value={form.fecha} onChange={e=>setForm(p=>({...p,fecha:e.target.value}))}/>
            </div>
            <div className="space-y-1.5">
              <Label>Tipo de conteo</Label>
              <div className="grid grid-cols-2 gap-2.5">
                {[["1conteo","1 Conteo","Un solo pase"],["2conteos","2 Conteos","C1 + C2 + C3 si hay diferencia"]].map(([v,t,s])=>(
                  <div key={v} onClick={()=>setForm(p=>({...p,tipo:v}))} className={`rounded-lg border-2 p-3 cursor-pointer transition-colors ${form.tipo===v?"border-primary bg-blue-50":"border-slate-200 hover:border-slate-300"}`}>
                    <div className={`font-bold text-sm ${form.tipo===v?"text-primary":"text-slate-900"}`}>{t}</div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">{s}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Observaciones</Label>
              <Input value={form.obs} onChange={e=>setForm(p=>({...p,obs:e.target.value}))} placeholder="Opcional..."/>
            </div>
            <Button className="w-full" onClick={crear}><Plus size={16}/> Crear Inventario</Button>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={modalEdit} onOpenChange={setModalEdit}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Editar Inventario</DialogTitle></DialogHeader>
          <div className="space-y-3.5">
            <div className="space-y-1.5">
              <Label>Nombre del inventario</Label>
              <Input value={editForm.nombre} onChange={e=>setEditForm(p=>({...p,nombre:e.target.value}))}/>
            </div>
            <div className="space-y-1.5">
              <Label>Observaciones</Label>
              <Input value={editForm.obs} onChange={e=>setEditForm(p=>({...p,obs:e.target.value}))} placeholder="Opcional..."/>
            </div>
            <Button className="w-full" onClick={guardarEdit}><CheckCircle size={16}/> Guardar cambios</Button>
          </div>
        </DialogContent>
      </Dialog>
      <ConfirmDialog
        open={modalCerrar}
        onOpenChange={setModalCerrar}
        icon={CheckCircle}
        iconClassName="text-green-600"
        iconBg="bg-green-50"
        title="Cerrar Inventario"
        description={<>Todos los conteos están completos. Al cerrar, se guardará el inventario en el <b>historial</b>, se actualizarán los <b>saldos</b> con las cantidades contadas, y dejará de estar activo.</>}
        confirmText="Sí, cerrar inventario"
        confirmVariant="default"
        onConfirm={cerrar}
      />
      <ConfirmDialog
        open={modalEliminar}
        onOpenChange={setModalEliminar}
        icon={Trash2}
        title="Eliminar Inventario"
        description={<>Esto borrará <b>por completo</b> el inventario <b>{G.inventario?.nombre}</b> junto con <b>todos sus conteos y capturas</b>, en este dispositivo y en la nube. Esta acción <b>no se puede deshacer</b>.</>}
        confirmText="Sí, eliminar todo"
        onConfirm={eliminarInventario}
        loading={eliminando}
      />
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
      {/* Header */}
      <PageHeader
        label="Localizaciones"
        title="Ubicaciones"
        icon={MapPin}
        subtitle={G.ubicacionesTipos.join(" · ")||"Sin tipos registrados"}
        count={G.localizaciones.length}
        countLabel="localizaciones"
      />

      {/* Tipos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <Card>
          <CardContent className="p-5">
            <div className="text-sm font-semibold text-slate-700 mb-3">Tipos de Ubicación</div>
            <div className="flex flex-wrap gap-2 mb-3 min-h-[26px]">
              {G.ubicacionesTipos.map(u=><UIBadge key={u} variant="secondary" className="bg-blue-100 text-blue-700">{u}</UIBadge>)}
              {G.ubicacionesTipos.length===0&&<span className="text-xs text-muted-foreground">Sin tipos — agrega uno</span>}
            </div>
            <div className="flex gap-2">
              <Input value={newUbicTipo} onChange={e=>setNewUbicTipo(e.target.value.toUpperCase())} placeholder="Ej: BODEGA, SALA DE VENTAS…" onKeyDown={e=>e.key==="Enter"&&agregarUbicTipo()}/>
              <Button size="icon" className="shrink-0" onClick={agregarUbicTipo}><Plus size={18}/></Button>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="text-sm font-semibold text-slate-700 mb-3">Tipos de Localización</div>
            <div className="flex flex-wrap gap-2 mb-3 min-h-[26px]">
              {G.localizacionTipos.map(l=><UIBadge key={l} variant="secondary" className="bg-amber-100 text-amber-700">{l}</UIBadge>)}
              {G.localizacionTipos.length===0&&<span className="text-xs text-muted-foreground">Sin tipos — agrega uno</span>}
            </div>
            <div className="flex gap-2">
              <Input value={newLocTipo} onChange={e=>setNewLocTipo(e.target.value.toUpperCase())} placeholder="Ej: MUEBLE, NEVERA, LINEAL…" onKeyDown={e=>e.key==="Enter"&&agregarLocTipo()}/>
              <Button size="icon" className="shrink-0" onClick={agregarLocTipo}><Plus size={18}/></Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Agregar */}
      <Card className="mb-4">
        <CardContent className="p-5">
          <div className="text-sm font-semibold text-slate-700 mb-4">Agregar nueva localización</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_1fr_auto] gap-3 items-end">
            <div className="space-y-1.5">
              <Label>Ubicación</Label>
              <Select value={form.ubicacion} onValueChange={v=>setForm(p=>({...p,ubicacion:v,nro:""}))}>
                <SelectTrigger><SelectValue placeholder="Seleccionar…"/></SelectTrigger>
                <SelectContent>
                  {G.ubicacionesTipos.map(u=><SelectItem key={u} value={u}>{u}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Localización</Label>
              <Select value={form.localizacion} onValueChange={v=>setForm(p=>({...p,localizacion:v,nro:""}))}>
                <SelectTrigger><SelectValue placeholder="Seleccionar…"/></SelectTrigger>
                <SelectContent>
                  {G.localizacionTipos.map(l=><SelectItem key={l} value={l}>{l}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>N° (auto: {siguienteNro()||"—"})</Label>
              <Input value={form.nro} onChange={e=>setForm(p=>({...p,nro:e.target.value.toUpperCase()}))} placeholder={siguienteNro()||"Auto"}/>
            </div>
            <div className="space-y-1.5">
              <Label>Observación</Label>
              <Input value={form.observacion} onChange={e=>setForm(p=>({...p,observacion:e.target.value}))} placeholder="Ej: DETERGENTES"/>
            </div>
            <Button onClick={agregar}><Plus size={16}/> Agregar</Button>
          </div>
        </CardContent>
      </Card>

      {/* Tabla */}
      <Card>
        <CardContent className="p-5">
          <div className="text-sm font-semibold text-slate-700 mb-4">
            Localizaciones registradas ({G.localizaciones.length})
          </div>
          {G.localizaciones.length===0?(
            <div className="text-center py-12 text-muted-foreground text-sm border-2 border-dashed rounded-xl">
              <MapPin className="mx-auto mb-2 opacity-30" size={34}/>
              Agrega localizaciones usando el formulario de arriba
            </div>
          ):(
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-900 text-white">
                    {["Ubicación","Localización","N° Localización","Observación","Acciones"].map(h=><th key={h} className="px-4 py-2.5 text-left font-semibold whitespace-nowrap">{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {G.localizaciones.map((l)=>(
                    <tr key={l.id} className="border-b last:border-0 hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-2.5 font-bold text-primary whitespace-nowrap">{l.ubicacion}</td>
                      <td className="px-4 py-2.5 text-muted-foreground">{l.localizacion}</td>
                      <td className="px-4 py-2.5 font-semibold">{l.nro}</td>
                      <td className="px-4 py-2.5 text-muted-foreground">{l.observacion||"—"}</td>
                      <td className="px-4 py-2.5">
                        <div className="flex gap-2 items-center">
                          <Button variant="outline" size="sm" className="h-7 px-2.5 text-xs bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100 hover:text-blue-700" onClick={()=>imprimirEtiqueta(l)}><Printer size={11}/> Etiqueta</Button>
                          <Button variant="outline" size="sm" className="h-7 px-2.5 text-xs bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100" onClick={()=>{setEditLoc(l);setEditFormLoc({nro:l.nro,observacion:l.observacion||"",ubicacion:l.ubicacion,localizacion:l.localizacion});}}><Pencil size={11}/> Editar</Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive hover:bg-red-50" onClick={()=>eliminar(l.id)}><X size={15}/></Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal editar localización */}
      <Dialog open={!!editLoc} onOpenChange={(v)=>!v&&setEditLoc(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar localización</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <div className="text-[11px] font-bold uppercase text-muted-foreground mb-1">Ubicación</div>
              <div className="px-3 py-2 bg-muted rounded-md text-sm text-slate-700">{editForm.ubicacion}</div>
            </div>
            <div>
              <div className="text-[11px] font-bold uppercase text-muted-foreground mb-1">Localización</div>
              <div className="px-3 py-2 bg-muted rounded-md text-sm text-slate-700">{editForm.localizacion}</div>
            </div>
            <div className="space-y-1.5">
              <Label>N° Localización</Label>
              <Input value={editForm.nro} onChange={e=>setEditFormLoc(f=>({...f,nro:e.target.value.toUpperCase()}))}/>
            </div>
            <div className="space-y-1.5">
              <Label>Observación</Label>
              <Input value={editForm.observacion} onChange={e=>setEditFormLoc(f=>({...f,observacion:e.target.value}))} placeholder="Ej: Tienda Gourmet"/>
            </div>
          </div>
          <div className="flex gap-2 mt-2">
            <Button className="flex-1" onClick={()=>{
              if(!editForm.nro.trim())return showToast("El N° no puede estar vacío","err");
              G.localizaciones=G.localizaciones.map(l=>l.id===editLoc.id?{...l,nro:editForm.nro.trim(),observacion:editForm.observacion.trim()}:l);
              rerender();showToast("Localización actualizada");setEditLoc(null);
            }}>Guardar</Button>
            <Button variant="outline" className="flex-1" onClick={()=>setEditLoc(null)}>Cancelar</Button>
          </div>
        </DialogContent>
      </Dialog>
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
      await SB.deleteAllProductos(G.tenantId);
      if(mapped.length)await SB.upsertProductosBulk(mapped.map(prodCols));
      _snap.prods={};mapped.forEach(p=>{_snap.prods[p.id]=JSON.stringify(prodCols(p));}); // marca como ya sincronizado
    }catch(e){console.warn("Error subiendo productos:",e);showToast("Error subiendo a la nube, revisa tu conexión","err");}
    saveLocalCache();
    _busy=false;
    rerender();
    const conCosto=mapped.filter(p=>p.costo>0).length,conSaldo=mapped.filter(p=>p.saldo>0).length;
    if(conCosto===0||conSaldo===0)showToast(`Importados ${mapped.length}, pero ${conCosto===0?"COSTO":""}${conCosto===0&&conSaldo===0?" y ":""}${conSaldo===0?"SALDO":""} salieron en 0 — revisa el nombre de esas columnas`,"warn");
    else showToast(`✓ ${mapped.length} productos importados y guardados en la nube`);
  };

  // "Sube saldos" (post-toma): actualiza saldo + costo de la base ACTUAL emparejando por
  // código, SIN borrar ni regenerar ids (así no toca las capturas). Solo con conteos cerrados.
  const subirSaldos=(e)=>{
    const file=e.target.files[0];e.target.value="";if(!file)return;
    if(!todosConteosCerrados())return showToast("Solo cuando TODOS los conteos estén cerrados","err");
    if(!G.productos.length)return showToast("No hay base de productos que actualizar","err");
    const reader=new FileReader();
    reader.onload=(ev)=>{
      const wb=XLSX.read(ev.target.result,{type:"binary"});
      const ws=wb.Sheets[wb.SheetNames[0]];
      const data=XLSX.utils.sheet_to_json(ws,{defval:""});
      if(!data.length)return showToast("Archivo vacío","err");
      const normKey=(k)=>String(k).toUpperCase().normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/[^A-Z0-9]/g,"");
      const toNum=(v)=>{if(v===undefined||v===null||v==="")return 0;if(typeof v==="number")return isNaN(v)?0:v;let s=String(v).replace(/[^\d.,-]/g,"").trim();if(s==="")return 0;if(s.includes(".")&&s.includes(","))s=s.replace(/\./g,"").replace(",",".");else if(s.includes(","))s=s.replace(",",".");const n=parseFloat(s);return isNaN(n)?0:n;};
      const norm=(s)=>String(s||"").trim().toUpperCase();
      const saldoCols=["SALDO","EXISTENCIA","EXISTENCIAS","STOCK","SALDO SISTEMA","SALDO ACTUAL","CANTIDAD SISTEMA","INVENTARIO","DISPONIBLE","CANTIDAD","CANT"];
      const costoCols=["COSTO","COSTO UNITARIO","COSTO PROMEDIO","COSTO UND","COSTO UNIDAD","ULTIMO COSTO","COSTO ACTUAL","COSTO REAL","PRECIO COSTO","VALOR UNITARIO","VR UNITARIO"];
      const codCols=["CODIGO","CODIGO INTERNO","CODIGOINTERNO","COD","CODIGO PRODUCTO","SKU","PLU"];
      const idx={};G.productos.forEach(p=>{if(p.codigo)idx[norm(p.codigo)]=p;});
      let act=0,ign=0,tocaCosto=false;
      data.forEach(rawRow=>{
        const row={};Object.keys(rawRow).forEach(k=>{row[normKey(k)]=rawRow[k];});
        const has=(...keys)=>keys.some(k=>{const nk=normKey(k);return row[nk]!==undefined&&row[nk]!==null&&String(row[nk]).trim()!=="";});
        const get=(...keys)=>{for(const k of keys){const nk=normKey(k);if(row[nk]!==undefined&&row[nk]!==null&&String(row[nk]).trim()!=="")return String(row[nk]).trim();}return "";};
        const getNum=(...keys)=>{for(const k of keys){const nk=normKey(k);if(row[nk]!==undefined&&row[nk]!==null&&String(row[nk]).trim()!=="")return toNum(row[nk]);}return 0;};
        const cod=get(...codCols);
        const prod=cod?idx[norm(cod)]:null;
        if(!prod){ign++;return;} // no está en la base → se ignora
        if(has(...saldoCols))prod.saldo=getNum(...saldoCols);
        if(has(...costoCols)){prod.costo=getNum(...costoCols);tocaCosto=true;}
        act++;
      });
      if(act===0)return showToast("Ningún código del archivo coincide con la base","err");
      rerender();
      showToast(`✓ Saldos actualizados: ${act} producto(s)${tocaCosto?" (saldo+costo)":" (saldo)"}${ign?` · ${ign} ignorado(s)`:""}`);
    };
    reader.readAsBinaryString(file);
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
    exportSheet([ej],cols,"plantilla_productos_TOMFIC.xlsx","PRODUCTOS");
    showToast("Plantilla descargada ✓");
  };

  const conEAN=G.productos.filter(p=>p.ean).length;
  return(
    <Section>
      {/* Header */}
      <PageHeader
        label="Productos"
        title="Base de Datos"
        icon={Database}
        subtitle={cats.length>0?cats.slice(0,3).join(" · ")+(cats.length>3?" …":""):"Sin categorías"}
        count={G.productos.length}
        countLabel="productos"
      />
      {/* Acciones */}
      <div className="flex gap-2.5 mb-4 items-center flex-wrap">
        <Button asChild>
          <label className="cursor-pointer">
            <Upload size={15}/> Cargar / Actualizar Excel
            <input type="file" accept=".xlsx,.xls" onChange={cargarPreview} className="hidden"/>
          </label>
        </Button>
        <Button variant="outline" onClick={()=>setMostrarEstructura(v=>!v)}>
          <ClipboardList size={15}/> {mostrarEstructura?"Ocultar":"Ver"} estructura
        </Button>
        <Button variant="outline" onClick={descargarPlantilla}>
          <Download size={15}/> Plantilla
        </Button>
        {todosConteosCerrados()&&G.productos.length>0&&(
          <Button asChild className="bg-emerald-600 hover:bg-emerald-700 text-white">
            <label className="cursor-pointer" title="Sube la misma base con saldos frescos: actualiza saldo y costo por código, sin tocar las capturas">
              <Upload size={15}/> Sube saldos (post-toma)
              <input type="file" accept=".xlsx,.xls" onChange={subirSaldos} className="hidden"/>
            </label>
          </Button>
        )}
        {G.productos.length>0&&(
          <Button variant="outline" className="text-destructive border-red-200 hover:bg-red-50 hover:text-destructive" onClick={()=>{if(!window.confirm("¿BORRAR toda la base de productos? Esta acción no se puede deshacer."))return;_clearBase=true;G.productos=[];rerender();showToast("Base de datos limpiada","warn");}}>
            <Trash2 size={15}/> Limpiar base
          </Button>
        )}
        {G.productos.length===0&&!preview&&(
          <div className="flex items-center gap-2 rounded-lg bg-amber-50 border border-amber-200 px-4 py-2 text-sm font-semibold text-amber-700">
            <AlertTriangle size={15}/> Base vacía — carga el Excel del cliente
          </div>
        )}
      </div>

      {/* Estructura del Excel */}
      {mostrarEstructura&&(
        <Card className="mb-4 border-blue-200">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 text-sm font-bold text-blue-800 mb-3"><ClipboardList size={15}/> Estructura requerida del Excel</div>
            <div className="text-xs text-muted-foreground mb-3">
              La primera fila del archivo debe ser el encabezado con los nombres de columna exactamente como se muestran abajo. Las columnas marcadas como <b className="text-destructive">Obligatorio</b> son necesarias para importar correctamente.
            </div>
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-blue-700 text-white">
                    {["Nombre de columna en Excel","Descripción","Ejemplo","Requerido"].map(h=>(
                      <th key={h} className="px-3 py-2 text-left font-semibold whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {ESTRUCTURA.map((e,i)=>(
                    <tr key={i} className="border-b last:border-0 hover:bg-slate-50">
                      <td className="px-3 py-1.5 font-mono font-bold text-blue-700">{e.col}</td>
                      <td className="px-3 py-1.5 text-slate-700">{e.desc}</td>
                      <td className="px-3 py-1.5 text-muted-foreground italic">{e.ej}</td>
                      <td className="px-3 py-1.5">
                        <UIBadge variant={e.req==="Obligatorio"?"destructive":e.req==="Recomendado"?"warning":"secondary"}>{e.req}</UIBadge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-3 flex items-start gap-2 rounded-lg bg-blue-50 px-3 py-2 text-xs text-blue-800">
              <Lightbulb size={14} className="shrink-0 mt-0.5"/><span><b>Tip:</b> Los nombres de las columnas pueden tener espacios al final — el sistema los elimina automáticamente al importar.</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Vista previa */}
      {preview&&(
        <Card className="mb-4 border-2 border-primary">
          <CardContent className="p-5">
            <div className="flex justify-between items-center mb-3 gap-3 flex-wrap">
              <div className="font-bold text-base text-blue-800">Vista previa — {rawData.length} filas detectadas</div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={()=>{setPreview(null);setRawData(null);}}>Cancelar</Button>
                <Button onClick={confirmarImport}><CheckCircle size={15}/> Confirmar importación</Button>
              </div>
            </div>
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-blue-50">
                    {Object.keys(preview[0]||{}).slice(0,10).map(k=><th key={k} className="px-2.5 py-2 text-left font-bold text-blue-800 whitespace-nowrap">{k}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {preview.map((row,i)=>(
                    <tr key={i} className="border-b last:border-0">
                      {Object.keys(row).slice(0,10).map(k=><td key={k} className="px-2.5 py-1.5 text-slate-700">{String(row[k]).substring(0,30)}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-2 text-xs text-muted-foreground">Mostrando las primeras {preview.length} filas de {rawData.length} · Solo se muestran las primeras 10 columnas</div>
          </CardContent>
        </Card>
      )}

      {/* Filtros y tabla */}
      {G.productos.length>0&&(
        <>
          <div className="flex gap-3 mb-3.5 flex-wrap items-center">
            <div className="relative flex-1 min-w-[200px]">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"/>
              <Input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar nombre, código, EAN…" className="pl-9"/>
            </div>
            <Select value={catF||"all"} onValueChange={v=>setCatF(v==="all"?"":v)}>
              <SelectTrigger className="w-[200px]"><SelectValue/></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las categorías</SelectItem>
                {cats.map(c=><SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
            <UIBadge variant="secondary" className="bg-sky-100 text-sky-700 h-9 px-3 text-sm rounded-md">{filtrados.length}</UIBadge>
          </div>
          <Card className="overflow-hidden">
            <div className="overflow-auto max-h-[500px]">
              <table className="w-full text-xs">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-slate-900 text-white">
                    {["Código","EAN","Nombre","Referencia","Categoría","Proveedor","Saldo","Costo"].map(h=>(
                      <th key={h} className="px-3 py-2.5 text-left font-semibold whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtrados.slice(0,500).map((p)=>(
                    <tr key={p.id} className="border-b last:border-0 hover:bg-slate-50 transition-colors">
                      <td className="px-3 py-1.5 font-mono text-primary font-bold whitespace-nowrap">{p.codigo}</td>
                      <td className="px-3 py-1.5 text-muted-foreground text-[10px]">{p.ean}</td>
                      <td className="px-3 py-1.5 font-medium">{p.nombre}</td>
                      <td className="px-3 py-1.5 text-muted-foreground">{p.referencia}</td>
                      <td className="px-3 py-1.5"><UIBadge variant="secondary">{p.categoria||"—"}</UIBadge></td>
                      <td className="px-3 py-1.5 text-muted-foreground">{p.proveedor||"—"}</td>
                      <td className={`px-3 py-1.5 text-center font-bold ${p.saldo>0?"text-green-600":"text-muted-foreground"}`}>{p.saldo}</td>
                      <td className="px-3 py-1.5 text-right text-muted-foreground">{p.costo>0?"$"+p.costo.toLocaleString("es-CO"):"—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
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
  const stL={pendiente:"Pendiente",enCurso:"En curso",cerradoC1:"C1 cerrado",cerradoC2:"Completado",diferencia:"Diferencia",enC3:"En C3",completado:"Completado"};

  return(
    <Section>
      <PageHeader
        label="Rondas"
        title="Programación de Conteos"
        icon={FolderOpen}
        subtitle={G.inventario?.nombre||"Sin inventario activo"}
        count={G.conteos.length}
        countLabel="conteos"
      />

      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <Button onClick={()=>setModal(true)} disabled={!G.inventario||G.productos.length===0}><Plus size={15}/> Programar Conteo</Button>
        {!G.inventario&&<span className="inline-flex items-center gap-1.5 rounded-md bg-red-50 px-2.5 py-1.5 text-xs text-destructive"><AlertTriangle size={13}/> Primero crea un inventario.</span>}
        {G.inventario&&G.productos.length===0&&<span className="inline-flex items-center gap-1.5 rounded-md bg-red-50 px-2.5 py-1.5 text-xs text-destructive"><AlertTriangle size={13}/> Primero carga la base de productos.</span>}
      </div>

      {G.conteos.length===0?(
        <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-white py-12 px-5 text-center text-muted-foreground">
          <FolderOpen size={48} className="text-slate-400 mb-3"/>
          <div className="text-base font-bold text-slate-900 mb-1.5">Sin conteos programados</div>
          <div className="text-sm">Crea el primer conteo para comenzar.</div>
        </div>
      ):(
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-[13px] min-w-[800px]">
              <thead>
                <tr className="bg-slate-900 text-white">
                  {["Nombre","Ubicación","Tipo","C1","Estado C1","C2","Estado C2","C3","Estado C3","Estado","Acciones"].map(h=>(
                    <th key={h} className="px-3 py-2.5 text-left font-semibold whitespace-nowrap text-[11px]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {G.conteos.map((c)=>{
                  const rc=c.rondasCerradas||[];
                  const c1Cerrado=rc.includes("C1")||["cerradoC1","cerradoC2","completado","diferencia","enC3"].includes(c.estado);
                  const c2Cerrado=rc.includes("C2")||["cerradoC2","completado","diferencia"].includes(c.estado);
                  const estCol=stC[c.estado]||"#6b7280";
                  const c3Caps=getCapsRonda(c.id,"C3").length;
                  return(
                    <tr key={c.id} className="border-b last:border-0 hover:bg-slate-50 align-middle">
                      <td className="px-3 py-2.5">
                        <div className="font-bold text-slate-900">{c.nombre}</div>
                        {c.obs&&<div className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1"><FileText size={10}/> {c.obs}</div>}
                      </td>
                      <td className="px-3 py-2.5 text-xs text-muted-foreground">{c.locLabel}</td>
                      <td className="px-3 py-2.5"><UIBadge className="border-transparent" style={{background:(c.tipo==="2conteos"?"#2563eb":"#16a34a")+"22",color:c.tipo==="2conteos"?"#2563eb":"#16a34a"}}>{c.tipo==="2conteos"?"2 Conteos":"1 Conteo"}</UIBadge></td>
                      <td className="px-3 py-2.5 font-semibold text-primary">{c.usuarioC1||"—"}</td>
                      <td className="px-3 py-2.5">
                        <button onClick={()=>c1Cerrado&&setModalCaps({conteoId:c.id,ronda:"C1",nombre:c.nombre})} title={c1Cerrado?"Ver capturas C1":""} disabled={!c1Cerrado}
                          className={`inline-flex items-center justify-center gap-1 min-w-[40px] h-6 rounded-md px-2 text-[10px] font-extrabold text-white ${c1Cerrado?"bg-green-600 hover:bg-green-700 cursor-pointer":"bg-slate-400 cursor-default"}`}>
                          {c1Cerrado?<>OK <Eye size={11}/></>:"?"}
                        </button>
                      </td>
                      <td className="px-3 py-2.5 font-semibold text-green-600">
                        {c.tipo==="2conteos"?(
                          c.usuarioC2?c.usuarioC2:(
                            <Button variant="outline" size="sm" className="h-7 px-2.5 text-xs text-amber-700 border-amber-300 bg-amber-50 hover:bg-amber-100 hover:text-amber-700" onClick={()=>{setEditC2(c.id);setC2Val("");}}><Plus size={12}/> Asignar</Button>
                          )
                        ):<span className="text-slate-300">N/A</span>}
                      </td>
                      <td className="px-3 py-2.5">
                        {c.tipo==="2conteos"&&c.usuarioC2?(
                          <button onClick={()=>c2Cerrado&&setModalCaps({conteoId:c.id,ronda:"C2",nombre:c.nombre})} title={c2Cerrado?"Ver capturas C2":""} disabled={!c2Cerrado}
                            className={`inline-flex items-center justify-center gap-1 min-w-[40px] h-6 rounded-md px-2 text-[10px] font-extrabold text-white ${c2Cerrado?"bg-green-600 hover:bg-green-700 cursor-pointer":"bg-slate-400 cursor-default"}`}>
                            {c2Cerrado?<>OK <Eye size={11}/></>:"?"}
                          </button>
                        ):<span className="text-slate-300 text-[11px]">—</span>}
                      </td>
                      <td className="px-3 py-2.5 font-semibold text-purple-600">
                        {c.usuarioC3?c.usuarioC3:(
                          c.estado==="diferencia"?<span className="text-destructive text-[11px] font-bold">Por asignar</span>:<span className="text-slate-300 text-[11px]">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5">
                        {c.usuarioC3?(
                          <button onClick={()=>c3Caps>0&&setModalCaps({conteoId:c.id,ronda:"C3",nombre:c.nombre})} title="Ver capturas C3" disabled={c3Caps===0}
                            className={`inline-flex items-center justify-center gap-1 min-w-[40px] h-6 rounded-md px-2 text-[10px] font-extrabold text-white ${c.estado==="completado"?"bg-green-600 hover:bg-green-700":"bg-purple-600"} ${c3Caps>0?"cursor-pointer":"cursor-default"}`}>
                            {c.estado==="completado"?<>OK <Eye size={11}/></>:"…"}
                          </button>
                        ):<span className="text-slate-300 text-[11px]">—</span>}
                      </td>
                      <td className="px-3 py-2.5"><UIBadge className="border-transparent" style={{background:estCol+"22",color:estCol}}>{stL[c.estado]||c.estado}</UIBadge></td>
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        <div className="flex gap-1.5 items-center">
                          <Button variant="outline" size="sm" className="h-7 px-2.5 text-xs" onClick={()=>{setModalMod(c);setModForm({obs:c.obs||"",usuarioC1:c.usuarioC1,usuarioC2:c.usuarioC2||""});}}>Modificar</Button>
                          {rondasReabribles(c).length>0&&(
                            <Button variant="outline" size="sm" className="h-7 px-2.5 text-xs text-amber-700 border-amber-200 hover:bg-amber-50 hover:text-amber-700" onClick={()=>setModalReabrir(c)}><RefreshCw size={12}/> Reabrir</Button>
                          )}
                          {c.tipo==="2conteos"&&(
                            <Button variant="outline" size="sm" className="h-7 px-2.5 text-xs text-purple-700 border-purple-200 hover:bg-purple-50 hover:text-purple-700" onClick={()=>{setBusqComp("");setModalComp(c);}}><Scale size={12}/> Comparar</Button>
                          )}
                          {c.estado==="diferencia"&&!c.usuarioC3&&(
                            <Select onValueChange={v=>v&&asignarC3(c.id,v)}>
                              <SelectTrigger className="h-7 w-auto gap-1 px-2 text-xs"><SelectValue placeholder="+ C3"/></SelectTrigger>
                              <SelectContent>
                                {G.usuarios.filter(u=>u.activo).map(u=><SelectItem key={u.id} value={u.nombre}>{u.nombre}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          )}
                        </div>
                        {editC2===c.id&&(
                          <div className="mt-1.5 flex gap-1.5 items-center">
                            <Select value={c2Val||undefined} onValueChange={setC2Val}>
                              <SelectTrigger className="h-8 w-auto text-xs"><SelectValue placeholder="Usuario C2…"/></SelectTrigger>
                              <SelectContent>
                                {G.usuarios.filter(u=>u.activo).map(u=><SelectItem key={u.id} value={u.nombre}>{u.nombre}</SelectItem>)}
                              </SelectContent>
                            </Select>
                            <Button size="sm" className="h-8" onClick={()=>guardarC2(c.id)}>OK</Button>
                            <Button size="sm" variant="outline" className="h-8 px-2.5" onClick={()=>setEditC2(null)}><X size={13}/></Button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Modal programar */}
      <Dialog open={modal} onOpenChange={setModal}>
        <DialogContent className="max-w-md max-h-[92vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Programar Nuevo Conteo</DialogTitle></DialogHeader>
          <div className="space-y-3.5">
            <div className="space-y-1.5">
              <Label>Nombre del conteo</Label>
              <Input value={form.nombre} onChange={e=>setForm(p=>({...p,nombre:e.target.value}))} placeholder="Ej: Conteo Bodega Turno Mañana"/>
            </div>
            <div className="space-y-1.5">
              <Label>Localización</Label>
              <Select value={form.locId||undefined} onValueChange={v=>setForm(p=>({...p,locId:v}))}>
                <SelectTrigger><SelectValue placeholder="Seleccionar localización…"/></SelectTrigger>
                <SelectContent>
                  {G.localizaciones.map(l=><SelectItem key={l.id} value={l.id}>{l.ubicacion} › {l.localizacion} › {l.nro}{l.observacion?" — "+l.observacion:""}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Usuario — Conteo 1 *</Label>
              <Select value={form.usuarioC1||undefined} onValueChange={v=>setForm(p=>({...p,usuarioC1:v}))}>
                <SelectTrigger><SelectValue placeholder="Seleccionar usuario…"/></SelectTrigger>
                <SelectContent>
                  {G.usuarios.filter(u=>u.activo).map(u=><SelectItem key={u.id} value={u.nombre}>{u.nombre}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {G.inventario?.tipo==="2conteos"&&(
              <div className="space-y-1.5">
                <Label>Usuario — Conteo 2 (opcional)</Label>
                <Select value={form.usuarioC2||undefined} onValueChange={v=>setForm(p=>({...p,usuarioC2:v}))}>
                  <SelectTrigger><SelectValue placeholder="Sin asignar por ahora…"/></SelectTrigger>
                  <SelectContent>
                    {G.usuarios.filter(u=>u.activo).map(u=><SelectItem key={u.id} value={u.nombre}>{u.nombre}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-800">
              <Package size={14} className="shrink-0"/> Total productos en la base: <b>{G.productos.length}</b>
            </div>
            <Button className="w-full" onClick={crear}><Plus size={16}/> Programar Conteo</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal modificar */}
      <Dialog open={!!modalMod} onOpenChange={(v)=>!v&&setModalMod(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Modificar: {modalMod?.nombre}</DialogTitle></DialogHeader>
          {modalMod&&(
          <div className="space-y-3.5">
            <div className="space-y-1.5">
              <Label>Observación del conteo</Label>
              <Input value={modForm.obs} onChange={e=>setModForm(p=>({...p,obs:e.target.value}))} placeholder="Ej: Contar productos de refrigeración"/>
            </div>
            <div className="space-y-1.5">
              <Label>Usuario — Conteo 1</Label>
              <Select value={modForm.usuarioC1||undefined} onValueChange={v=>setModForm(p=>({...p,usuarioC1:v}))}>
                <SelectTrigger><SelectValue placeholder="Seleccionar…"/></SelectTrigger>
                <SelectContent>{G.usuarios.filter(u=>u.activo).map(u=><SelectItem key={u.id} value={u.nombre}>{u.nombre}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            {modalMod.tipo==="2conteos"&&(
              <div className="space-y-1.5">
                <Label>Usuario — Conteo 2</Label>
                <Select value={modForm.usuarioC2||undefined} onValueChange={v=>setModForm(p=>({...p,usuarioC2:v}))}>
                  <SelectTrigger><SelectValue placeholder="Sin asignar…"/></SelectTrigger>
                  <SelectContent>{G.usuarios.filter(u=>u.activo).map(u=><SelectItem key={u.id} value={u.nombre}>{u.nombre}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}
            <Button className="w-full" onClick={guardarMod}><CheckCircle size={16}/> Guardar cambios</Button>
          </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!modalReabrir} onOpenChange={(v)=>!v&&setModalReabrir(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>¿Qué conteo deseas reabrir?</DialogTitle></DialogHeader>
          {modalReabrir&&(<>
            <div className="text-sm text-muted-foreground -mt-1">
              Conteo: <b className="text-slate-900">{modalReabrir.nombre}</b> · {modalReabrir.locLabel}
            </div>
            <div className="flex flex-col gap-2.5">
              {rondasReabribles(modalReabrir).map(r=>{
                const col={C1:"#2563eb",C2:"#16a34a",C3:"#7c3aed"}[r];
                const quien=r==="C1"?modalReabrir.usuarioC1:r==="C2"?modalReabrir.usuarioC2:modalReabrir.usuarioC3;
                const txt={C1:"Conteo 1",C2:"Conteo 2",C3:"Conteo 3"}[r];
                return(
                  <button key={r} onClick={()=>reabrirRonda(modalReabrir,r)}
                    className="flex items-center justify-between rounded-lg border-2 bg-white px-4 py-3.5 text-left transition-colors hover:bg-slate-50" style={{borderColor:col}}>
                    <div>
                      <div className="flex items-center gap-1.5 font-bold text-[15px]" style={{color:col}}><RefreshCw size={15}/> Reabrir {txt}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">Usuario: {quien||"—"}</div>
                    </div>
                    <ChevronRight size={18} style={{color:col}}/>
                  </button>
                );
              })}
            </div>
            <Button variant="outline" className="w-full" onClick={()=>setModalReabrir(null)}>Cancelar</Button>
          </>)}
        </DialogContent>
      </Dialog>
      {modalCaps&&(()=>{
        const {conteoId,ronda,nombre}=modalCaps;
        const rCaps=getCapsRonda(conteoId,ronda);
        const porProd={};rCaps.forEach(c=>{if(!porProd[c.productoId])porProd[c.productoId]={...c,total:0};porProd[c.productoId].total+=c.cantidad;});
        const todo=Object.values(porProd);
        const q=busqCaps.trim().toLowerCase();
        const lista=q?todo.filter(c=>(c.codigo&&c.codigo.toLowerCase().includes(q))||(c.ean&&String(c.ean).toLowerCase().includes(q))||(c.nombre&&c.nombre.toLowerCase().includes(q))):todo;
        const cerrar=()=>{setBusqCaps("");setModalCaps(null);};
        return(
          <Dialog open onOpenChange={(v)=>!v&&cerrar()}>
            <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
              <DialogHeader><DialogTitle>{`${ronda} — ${nombre} (${lista.length}${q?" de "+todo.length:""} productos)`}</DialogTitle></DialogHeader>
              <Input value={busqCaps} onChange={e=>setBusqCaps(e.target.value)} placeholder="Buscar por código de barras o nombre…" autoFocus className="border-primary"/>
              <div className="max-h-[460px] overflow-y-auto rounded-lg border">
                <table className="w-full text-xs">
                  <thead><tr className="bg-slate-900 text-white sticky top-0">{["Código","Nombre","Referencia","Total","Estado","Usuario"].map(h=><th key={h} className="px-2.5 py-2 text-left font-semibold">{h}</th>)}</tr></thead>
                  <tbody>
                    {lista.length===0?(<tr><td colSpan={6} className="p-5 text-center text-muted-foreground">{q?`No se encontró "${busqCaps}"`:"Sin capturas"}</td></tr>):lista.map((c,i)=>(
                      <tr key={i} className="border-b last:border-0 hover:bg-slate-50">
                        <td className="px-2.5 py-1.5 font-mono text-primary font-bold">{c.codigo}</td>
                        <td className="px-2.5 py-1.5 font-medium">{c.nombre}</td>
                        <td className="px-2.5 py-1.5 text-muted-foreground text-[11px]">{c.referencia}</td>
                        <td className="px-2.5 py-1.5 text-center font-extrabold text-primary text-[15px]">{c.total}</td>
                        <td className="px-2.5 py-1.5"><EstBadge e={c.estado}/></td>
                        <td className="px-2.5 py-1.5 text-muted-foreground">{c.usuario}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </DialogContent>
          </Dialog>
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
          <Dialog open onOpenChange={(v)=>!v&&cerrar()}>
            <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
              <DialogHeader><DialogTitle>Comparativo — {c.nombre}</DialogTitle></DialogHeader>
              <div className="flex gap-2 flex-wrap">
                <UIBadge className="border-transparent" style={{background:"#2563eb22",color:"#2563eb"}}>C1: {c.usuarioC1||"—"}</UIBadge>
                <UIBadge className="border-transparent" style={{background:"#16a34a22",color:"#16a34a"}}>C2: {c.usuarioC2||"—"}</UIBadge>
                {c.usuarioC3&&<UIBadge className="border-transparent" style={{background:"#7c3aed22",color:"#7c3aed"}}>C3: {c.usuarioC3}</UIBadge>}
                <UIBadge className="border-transparent" style={{background:(nDif>0?"#dc2626":"#16a34a")+"22",color:nDif>0?"#dc2626":"#16a34a"}}>{nDif} con diferencia</UIBadge>
              </div>
              <Input value={busqComp} onChange={e=>setBusqComp(e.target.value)} placeholder="Buscar por código o nombre…" className="border-purple-500"/>
              <div className="max-h-[460px] overflow-y-auto rounded-lg border">
                <table className="w-full text-xs">
                  <thead><tr className="bg-slate-900 text-white sticky top-0">{["Código","Nombre","C1","C2","C3","Dif"].map(h=><th key={h} className={`px-2.5 py-2 font-semibold ${h==="Código"||h==="Nombre"?"text-left":"text-center"}`}>{h}</th>)}</tr></thead>
                  <tbody>
                    {lista.length===0?(<tr><td colSpan={6} className="p-5 text-center text-muted-foreground">{q?`No se encontró "${busqComp}"`:"Sin capturas"}</td></tr>):lista.map((f,i)=>(
                      <tr key={i} className={`border-b last:border-0 ${f.difiere?"bg-red-50":"hover:bg-slate-50"}`}>
                        <td className="px-2.5 py-1.5 font-mono text-primary font-bold">{f.codigo}</td>
                        <td className="px-2.5 py-1.5 font-medium">{f.nombre}</td>
                        <td className="px-2.5 py-1.5 text-center font-bold text-primary">{f.t1||"—"}</td>
                        <td className="px-2.5 py-1.5 text-center font-bold text-green-600">{f.t2||"—"}</td>
                        <td className="px-2.5 py-1.5 text-center font-bold text-purple-600">{f.t3||"—"}</td>
                        <td className={`px-2.5 py-1.5 text-center font-extrabold ${f.difiere?"text-destructive":"text-green-600"}`}>{f.difiere?(f.t1-f.t2>0?"+":"")+(f.t1-f.t2):<CheckCircle size={14} className="inline"/>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </DialogContent>
          </Dialog>
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
      <h2 style={{display:"flex",alignItems:"center",gap:8,margin:0,fontSize:21,fontWeight:800,letterSpacing:-0.5}}><Package size={22}/> TOMFIC — Conteo por Ubicación</h2>
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
      <Dialog open onOpenChange={(v)=>!v&&cerrar()}>
        <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{`${ronda} — ${nombre} (${lista.length}${q?" de "+listaTotal.length:""} productos)`}</DialogTitle></DialogHeader>
          <Input value={busqCaps} onChange={e=>setBusqCaps(e.target.value)} placeholder="Buscar por código de barras o nombre…" autoFocus className="border-primary"/>
          <div className="max-h-[480px] overflow-y-auto rounded-lg border">
            <table className="w-full text-xs">
              <thead><tr className="bg-slate-900 text-white sticky top-0">
                {["Código","Nombre","Referencia","Total","Estado","Obs","Usuario"].map(h=>(
                  <th key={h} className="px-2.5 py-2 text-left font-semibold">{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {lista.length===0?(
                  <tr><td colSpan={7} className="p-5 text-center text-muted-foreground">{q?`No se encontró "${busqCaps}"`:"Sin capturas registradas aún"}</td></tr>
                ):lista.map((c,i)=>(
                  <tr key={i} className="border-b last:border-0 hover:bg-slate-50">
                    <td className="px-2.5 py-1.5 font-mono text-primary font-bold">{c.codigo}</td>
                    <td className="px-2.5 py-1.5 font-medium">{c.nombre}</td>
                    <td className="px-2.5 py-1.5 text-muted-foreground text-[11px]">{c.referencia}</td>
                    <td className="px-2.5 py-1.5 text-center font-extrabold text-primary text-[15px]">{c.total}</td>
                    <td className="px-2.5 py-1.5"><EstBadge e={c.estado}/></td>
                    <td className="px-2.5 py-1.5 text-muted-foreground text-[11px]">{c.obs||"—"}</td>
                    <td className="px-2.5 py-1.5 text-muted-foreground">{c.usuario}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </DialogContent>
      </Dialog>
    );
  };

  return(
    <div>
      <ModalCaps/>

      {/* Modal reabrir con selección de ronda */}
      <Dialog open={!!modalReabrir} onOpenChange={(v)=>!v&&setModalReabrir(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>¿Qué conteo deseas reabrir?</DialogTitle></DialogHeader>
          {modalReabrir&&(<>
            <div className="text-sm text-muted-foreground -mt-1">Selecciona la ronda que quieres reabrir para que el usuario pueda seguir capturando.</div>
            <div className="flex flex-col gap-2.5">
              {["C1","C2","C3"].filter(r=>{
                const c=modalReabrir;
                if(r==="C1") return true;
                if(r==="C2") return c.tipo==="2conteos"&&c.usuarioC2;
                if(r==="C3") return c.usuarioC3;
                return false;
              }).map(r=>{
                const col={C1:"#2563eb",C2:"#16a34a",C3:"#7c3aed"}[r];
                return(
                  <button key={r} onClick={()=>reabrirRonda(modalReabrir,r)}
                    className="flex items-center justify-between rounded-lg border-2 bg-white px-4 py-3.5 text-left transition-colors hover:bg-slate-50" style={{borderColor:col}}>
                    <div>
                      <div className="flex items-center gap-1.5 font-bold text-[15px]" style={{color:col}}><RefreshCw size={15}/> Reabrir {r}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {r==="C1"&&`Usuario: ${modalReabrir.usuarioC1}`}
                        {r==="C2"&&`Usuario: ${modalReabrir.usuarioC2}`}
                        {r==="C3"&&`Usuario: ${modalReabrir.usuarioC3}`}
                      </div>
                    </div>
                    <ChevronRight size={18} style={{color:col}}/>
                  </button>
                );
              })}
            </div>
            <Button variant="outline" className="w-full" onClick={()=>setModalReabrir(null)}>Cancelar</Button>
          </>)}
        </DialogContent>
      </Dialog>

      <PageHeader
        label="Panel de Control"
        title="Vista de Procesos"
        icon={Radio}
        subtitle={G.inventario?.nombre||"Inventario activo"}
        right={<div className="text-right"><div className="text-3xl font-extrabold leading-none">{pct}%</div><div className="text-[11px] text-white/80 mt-1">completado</div></div>}
      />

      {/* Tarjetas KPI */}
      <div className="grid gap-3 mb-4" style={{gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))"}}>
        {[
          {l:"Productos",v:total,c:"#2563eb",bg:"#eff6ff",icon:Package},
          {l:"Total conteos",v:totalConteos,c:"#475569",bg:"#f8fafc",icon:ClipboardList},
          {l:"Completados",v:conteosCompletos,c:"#16a34a",bg:"#f0fdf4",icon:CheckCircle},
          {l:"En progreso",v:totalConteos-conteosCompletos,c:"#0891b2",bg:"#ecfeff",icon:Settings},
          {l:"Con diferencia",v:G.conteos.filter(c=>c.tipo==="2conteos"&&getDifsConteo(c).length>0).length,c:"#dc2626",bg:"#fef2f2",icon:AlertTriangle},
          {l:"Alertas",v:G.alertas.filter(a=>!a.leida).length,c:"#7c3aed",bg:"#faf5ff",icon:Bell},
        ].map(s=>(
          <Card key={s.l} className="p-4" style={{background:s.bg,borderColor:s.c+"22"}}>
            <s.icon size={20} style={{color:s.c}} className="mb-1.5"/>
            <div className="text-[26px] font-black leading-none" style={{color:s.c}}>{s.v}</div>
            <div className="text-[11px] text-muted-foreground mt-1 font-semibold">{s.l}</div>
          </Card>
        ))}
      </div>

      {/* Barra de avance */}
      <Card className="p-5 mb-4">
        <div className="flex justify-between items-center mb-2.5">
          <div>
            <div className="text-[13px] font-bold text-slate-900">Avance del inventario</div>
            <div className="text-[11px] text-muted-foreground mt-0.5">{conteosCompletos} de {totalConteos} ubicaciones completadas</div>
          </div>
          <div className="rounded-lg px-3.5 py-1.5" style={{background:"linear-gradient(135deg,#1e40af,#0891b2)"}}>
            <span className="text-lg font-black text-white">{pct}%</span>
          </div>
        </div>
        <div className="bg-slate-200 rounded-full h-3.5 overflow-hidden">
          <div className="h-full rounded-full transition-all duration-700" style={{width:pct+"%",background:"linear-gradient(90deg,#2563eb,#0891b2,#16a34a)"}}/>
        </div>
        <div className="flex justify-between mt-1.5 text-[10px] text-slate-400"><span>0%</span><span>50%</span><span>100%</span></div>
      </Card>

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
          <Card className={`overflow-hidden mb-4 ${totalPend>0?"border-amber-300":"border-green-300"}`}>
            {/* Header del panel */}
            <div onClick={()=>setVerPendientes(v=>!v)} className="cursor-pointer px-5 py-3.5 flex justify-between items-center" style={{background:totalPend>0?"linear-gradient(135deg,#fffbeb,#fef3c7)":"linear-gradient(135deg,#f0fdf4,#dcfce7)"}}>
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center text-white" style={{background:totalPend>0?"#f59e0b":"#16a34a"}}>
                  {totalPend>0?<Clock size={16}/>:<CheckCircle size={16}/>}
                </div>
                <div>
                  <div className="font-extrabold text-sm" style={{color:totalPend>0?"#92400e":"#166534"}}>
                    {totalPend>0?`Faltan ${totalPend} pendiente${totalPend>1?"s":""} por completar`:"Todo al día — sin pendientes"}
                  </div>
                  {totalPend>0&&<div className="text-[11px] mt-0.5" style={{color:"#a16207"}}>{conteosPend.length} conteo{conteosPend.length!==1?"s":""} · {locSinConteo.length} ubicación{locSinConteo.length!==1?"es":""}</div>}
                </div>
              </div>
              <div className="flex items-center gap-1 rounded-lg bg-white px-3 py-1 text-xs font-semibold shadow-sm" style={{color:totalPend>0?"#92400e":"#166534"}}>
                {verPendientes?<><ChevronUp size={14}/> Ocultar</>:<><ChevronDown size={14}/> Ver detalle</>}
              </div>
            </div>

            {verPendientes&&totalPend>0&&(
              <div className="bg-white p-4">
              <div className="grid gap-3.5" style={{gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))"}}>
                <div>
                  <div className="flex items-center gap-1.5 mb-2.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-500"/>
                    <div className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wide">Conteos sin terminar ({conteosPend.length})</div>
                  </div>
                  {conteosPend.length===0?<div className="flex items-center gap-1.5 text-xs text-green-700 px-3 py-2 bg-green-50 rounded-lg"><CheckCircle size={13}/> Todos los conteos están completos</div>:(
                    <div className="flex flex-col gap-2">
                      {conteosPend.map(({c,razon})=>{
                        const abierto=pendForm&&pendForm.id===c.id;
                        const faltaC2=c.tipo==="2conteos"&&!c.usuarioC2;
                        const faltaC3=c.estado==="diferencia"&&!c.usuarioC3;
                        const accionable=faltaC2||faltaC3;
                        return(
                        <div key={c.id} className="rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-xs shadow-sm">
                          <div onClick={()=>accionable&&setPendForm(abierto?null:{id:c.id,tipo:faltaC2?"c2":"c3",val:""})} className={accionable?"cursor-pointer":"cursor-default"}>
                            <div className="font-bold text-slate-900 flex justify-between items-center gap-2">
                              <span>{c.nombre}</span>
                              {accionable&&<span className="rounded-md bg-primary text-white px-2 py-0.5 text-[10px] font-bold">{abierto?"cerrar":faltaC2?"Asignar C2":"Asignar C3"}</span>}
                            </div>
                            <div className="text-muted-foreground text-[11px] mt-0.5 flex items-center gap-1"><MapPin size={11}/> {c.locLabel}</div>
                            <div className="inline-block rounded bg-amber-100 text-amber-800 px-1.5 py-0.5 text-[10px] font-bold mt-1">{razon}</div>
                          </div>
                          {abierto&&(
                            <div className="mt-2.5 flex gap-1.5 items-center pt-2 border-t border-amber-200">
                              <Select value={pendForm.val||undefined} onValueChange={v=>setPendForm({...pendForm,val:v})}>
                                <SelectTrigger className="h-8 text-xs flex-1"><SelectValue placeholder="Selecciona usuario…"/></SelectTrigger>
                                <SelectContent>{usuariosActivos().map(u=><SelectItem key={u.id} value={u.nombre}>{u.nombre}</SelectItem>)}</SelectContent>
                              </Select>
                              <Button size="sm" className="h-8 px-2.5" onClick={()=>pendForm.tipo==="c2"?asignarC2Rapido(c.id,pendForm.val):(pendForm.val&&asignarC3(c.id,pendForm.val),setPendForm(null))}><CheckCircle size={14}/></Button>
                              <Button size="sm" variant="outline" className="h-8 px-2.5" onClick={()=>setPendForm(null)}><X size={14}/></Button>
                            </div>
                          )}
                        </div>
                        );
                      })}
                    </div>
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-1.5 mb-2.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary"/>
                    <div className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wide">Ubicaciones sin conteo ({locSinConteo.length})</div>
                  </div>
                  {locSinConteo.length===0?<div className="flex items-center gap-1.5 text-xs text-green-700 px-3 py-2 bg-green-50 rounded-lg"><CheckCircle size={13}/> Todas las ubicaciones tienen conteo</div>:(
                    <div className="flex flex-col gap-2">
                      {locSinConteo.map(l=>{
                        const abierto=pendForm&&pendForm.locId===l.id;
                        return(
                        <div key={l.id} className="rounded-lg border border-blue-200 bg-blue-50 px-3.5 py-2.5 text-xs shadow-sm">
                          <div onClick={()=>setPendForm(abierto?null:{locId:l.id,tipo:"crear",nombre:`${l.localizacion} ${l.nro}`,c1:"",c2:""})} className="cursor-pointer">
                            <div className="font-bold text-blue-800 flex justify-between items-center gap-2">
                              <span>{l.ubicacion} › {l.localizacion} › {l.nro}</span>
                              <span className="rounded-md bg-primary text-white px-2 py-0.5 text-[10px] font-bold">{abierto?"cerrar":"+ Crear"}</span>
                            </div>
                            {l.observacion&&<div className="text-muted-foreground text-[11px] mt-0.5">{l.observacion}</div>}
                            {!abierto&&<div className="inline-block rounded bg-blue-100 text-blue-800 px-1.5 py-0.5 text-[10px] font-bold mt-1">Sin conteo programado</div>}
                          </div>
                          {abierto&&(
                            <div className="mt-2.5 flex flex-col gap-1.5 pt-2 border-t border-blue-200">
                              <Input value={pendForm.nombre} onChange={e=>setPendForm({...pendForm,nombre:e.target.value})} placeholder="Nombre del conteo" className="h-8 text-xs"/>
                              <Select value={pendForm.c1||undefined} onValueChange={v=>setPendForm({...pendForm,c1:v})}>
                                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Usuario Conteo 1…"/></SelectTrigger>
                                <SelectContent>{usuariosActivos().map(u=><SelectItem key={u.id} value={u.nombre}>{u.nombre}</SelectItem>)}</SelectContent>
                              </Select>
                              {G.inventario.tipo==="2conteos"&&(
                                <Select value={pendForm.c2||undefined} onValueChange={v=>setPendForm({...pendForm,c2:v})}>
                                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Usuario Conteo 2 (opcional)…"/></SelectTrigger>
                                  <SelectContent>{usuariosActivos().map(u=><SelectItem key={u.id} value={u.nombre}>{u.nombre}</SelectItem>)}</SelectContent>
                                </Select>
                              )}
                              <div className="flex gap-1.5">
                                <Button size="sm" className="h-8 flex-1" onClick={()=>crearConteoRapido(l,pendForm.nombre,pendForm.c1,pendForm.c2)}><Plus size={14}/> Crear conteo</Button>
                                <Button size="sm" variant="outline" className="h-8 flex-1" onClick={()=>setPendForm(null)}>Cancelar</Button>
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
          </Card>
        );
      })()}

      {/* Alertas */}
      {G.alertas.filter(a=>!a.leida).length>0&&(
        <Card className="mb-4 border-amber-300 bg-amber-50 p-5">
          <div className="flex items-center gap-1.5 font-bold text-[13px] text-amber-800 mb-2"><Bell size={14}/> Alertas pendientes</div>
          {G.alertas.filter(a=>!a.leida).map((a,i)=>(
            <div key={i} className="flex justify-between items-center px-2.5 py-1.5 bg-amber-100 rounded-lg mb-1.5 text-xs">
              <span><b>{a.usuario}</b> terminó {a.ronda} del conteo <b>{a.conteoNombre}</b> · {a.hora}</span>
              <Button size="sm" className="h-7 px-2.5 bg-amber-600 hover:bg-amber-700" onClick={()=>{G.alertas=G.alertas.map(x=>x===a?{...x,leida:true}:x);rerender();}}>Visto</Button>
            </div>
          ))}
        </Card>
      )}

      {/* TABLA CENTRAL */}
      {G.conteos.length===0?(
        <Card className="text-center p-9 text-muted-foreground">No hay conteos programados.</Card>
      ):(
        <Card className="overflow-hidden mb-4">
          <div className="overflow-x-auto">
            <table className="w-full text-xs min-w-[1000px]">
              <thead>
                <tr className="bg-slate-900 text-white">
                  {["Ubicación","Localización","N° Local.","Observación","Usuarios","Conteo 1","Obs C1","Conteo 2","Obs C2","Diferencia","Obs Dif","C3","Validador","Acciones"].map(h=>(
                    <th key={h} className="px-2.5 py-2.5 text-left font-semibold whitespace-nowrap text-[11px]">{h}</th>
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
                    c3Terminado?<span style={{color:"white",fontWeight:800,fontSize:13,display:"flex",alignItems:"center",justifyContent:"center"}}><Settings size={11}/></span>:
                    c.estado==="completado"&&!hayDifs?<span style={{color:"white",fontWeight:800,fontSize:13}}>OK</span>:
                    puedeAsignarC3?<span style={{color:"white",fontWeight:800,fontSize:11}}>CLIC</span>:
                    <span style={{color:"white",fontWeight:800,fontSize:16}}>?</span>;

                  return(
                    <tr key={c.id} className="border-b-2 border-slate-200 align-top hover:bg-slate-50">
                      <td className="px-2.5 py-2.5 font-bold text-blue-800">{c.ubicacion}</td>
                      <td className="px-2.5 py-2.5 text-muted-foreground">{c.localizacion}</td>
                      <td className="px-2.5 py-2.5 font-semibold">{c.nro}</td>
                      <td className="px-2.5 py-2.5 text-muted-foreground text-[11px]">{c.obs||"—"}</td>

                      {/* Usuarios */}
                      <td className="px-2.5 py-2.5 min-w-[120px]">
                        <div className="flex flex-col gap-1 items-start">
                          {todosUsuarios.map(u=>(
                            <div key={u} className="flex items-center gap-1">
                              <span className="bg-blue-50 text-primary px-1.5 py-0.5 rounded-full text-[10px] font-bold">{u}</span>
                              {u!==c.usuarioC1&&<button onClick={()=>quitarUsuarioExtra(c.id,u)} className="text-destructive"><X size={11}/></button>}
                            </div>
                          ))}
                          {c.usuarioC2&&<span className="bg-green-50 text-green-600 px-1.5 py-0.5 rounded-full text-[10px] font-bold">C2: {c.usuarioC2}</span>}
                          {c.usuarioC3&&<span className="bg-purple-50 text-purple-600 px-1.5 py-0.5 rounded-full text-[10px] font-bold">C3: {c.usuarioC3}</span>}
                          <button onClick={()=>setModalAsignar({conteoId:c.id,tipo:"extra"})} className="rounded-md border border-dashed border-slate-400 text-slate-500 px-2 py-0.5 text-[10px] mt-0.5 hover:bg-slate-50">+ Apoyo</button>
                        </div>
                      </td>

                      {/* Conteo 1 — clickeable */}
                      <td className="px-2.5 py-2.5 min-w-[120px]">
                        <div className="text-[11px] font-semibold text-primary mb-1">{c.usuarioC1||"—"}</div>
                        <div className="bg-slate-200 rounded-full h-[5px] mb-1"><div className="bg-primary rounded-full h-full" style={{width:p1+"%"}}/></div>
                        <div className="text-[10px] text-muted-foreground mb-1">{new Set(c1s.map(x=>x.productoId)).size}/{total} · {p1}%</div>
                        <button onClick={()=>setModalCaps({conteoId:c.id,ronda:"C1",nombre:c.nombre})}
                          className={`inline-flex items-center justify-center gap-1 min-w-[40px] h-[22px] rounded-md px-2 text-[10px] font-extrabold text-white ${c1Cerrado?"bg-green-600 hover:bg-green-700":"bg-slate-400"}`}>
                          {c1Cerrado?<>OK <Eye size={11}/></>:"?"}
                        </button>
                      </td>
                      <td className="px-2.5 py-2.5 text-[11px]">
                        {(()=>{
                          const undTotal=c1s.reduce((a,x)=>a+(Number(x.cantidad)||0),0);
                          return undTotal>0?<div className="whitespace-nowrap font-bold text-primary">{undTotal} und</div>:<span className="text-slate-300">—</span>;
                        })()}
                      </td>

                      {/* Conteo 2 — clickeable */}
                      <td className="px-2.5 py-2.5 min-w-[120px]">
                        {c.tipo==="2conteos"?(
                          c.usuarioC2?(
                            <>
                              <div className="text-[11px] font-semibold text-green-600 mb-1">{c.usuarioC2}</div>
                              <div className="bg-slate-200 rounded-full h-[5px] mb-1"><div className="bg-green-600 rounded-full h-full" style={{width:p2+"%"}}/></div>
                              <div className="text-[10px] text-muted-foreground mb-1">{new Set(c2s.map(x=>x.productoId)).size}/{total} · {p2}%</div>
                              <button onClick={()=>setModalCaps({conteoId:c.id,ronda:"C2",nombre:c.nombre})}
                                className={`inline-flex items-center justify-center gap-1 min-w-[40px] h-[22px] rounded-md px-2 text-[10px] font-extrabold text-white ${c2Cerrado?"bg-green-600 hover:bg-green-700":"bg-slate-400"}`}>
                                {c2Cerrado?<>OK <Eye size={11}/></>:"?"}
                              </button>
                            </>
                          ):(
                            <Button variant="outline" size="sm" className="h-7 px-2.5 text-xs text-amber-700 border-amber-300 bg-amber-50 hover:bg-amber-100 hover:text-amber-700" onClick={()=>setModalAsignar({conteoId:c.id,tipo:"C2"})}><Plus size={12}/> Asignar C2</Button>
                          )
                        ):<span className="text-slate-300 text-[11px]">N/A</span>}
                      </td>
                      <td className="px-2.5 py-2.5 text-[11px]">
                        {(()=>{
                          const undTotal=c2s.reduce((a,x)=>a+(Number(x.cantidad)||0),0);
                          return undTotal>0?<div className="whitespace-nowrap font-bold text-green-600">{undTotal} und</div>:<span className="text-slate-300">—</span>;
                        })()}
                      </td>

                      {/* Diferencia — solo si ambos cerrados */}
                      <td className="px-2.5 py-2.5 min-w-[70px] text-center">
                        {c.tipo==="2conteos"&&c1Cerrado&&c2Cerrado?(
                          difs.length>0?(
                            <div>
                              <div className="text-lg font-extrabold text-destructive">{difs.length}</div>
                              <div className="text-[9px] text-destructive">productos</div>
                            </div>
                          ):(
                            <div className="text-lg font-extrabold text-green-600">0</div>
                          )
                        ):<span className="text-slate-300">—</span>}
                      </td>

                      {/* Obs Dif — PDF solo si hay diferencia */}
                      <td className="px-2.5 py-2.5 text-[11px] text-muted-foreground">
                        {difs.length>0&&c1Cerrado&&c2Cerrado&&(
                          <button onClick={()=>expPDF(difs,c.nombre)}
                            className="inline-flex items-center gap-1 rounded-md bg-red-100 text-destructive px-2.5 py-1 text-[11px] font-bold hover:bg-red-200">
                            <Printer size={11}/> PDF
                          </button>
                        )}
                      </td>

                      {/* C3 — solo si hay diferencia */}
                      <td className="px-2.5 py-2.5 min-w-[90px]">
                        {c.estado==="diferencia"&&!c.usuarioC3?(
                          <Button variant="outline" size="sm" className="h-7 px-2.5 text-xs text-purple-700 border-purple-300 bg-purple-50 hover:bg-purple-100 hover:text-purple-700" onClick={()=>setModalAsignar({conteoId:c.id,tipo:"C3"})}><Plus size={12}/> Asignar C3</Button>
                        ):c.usuarioC3?(
                          <div>
                            <div className="text-[10px] text-purple-600 font-bold mb-0.5">{c.usuarioC3}</div>
                            <div className="text-[10px] text-muted-foreground mb-1">{c3s.length} reg</div>
                            <button onClick={()=>setModalCaps({conteoId:c.id,ronda:"C3",nombre:c.nombre})}
                              className={`inline-flex items-center justify-center gap-1 min-w-[40px] h-[22px] rounded-md px-2 text-[10px] font-extrabold text-white ${c.estado==="completado"?"bg-green-600 hover:bg-green-700":"bg-purple-600"}`}>
                              {c.estado==="completado"?<>OK <Eye size={11}/></>:"?"}
                            </button>
                          </div>
                        ):<span className="text-slate-300 text-[11px]">—</span>}
                      </td>

                      {/* Validador */}
                      <td className="px-2.5 py-2.5 text-center min-w-[80px]">
                        <div onClick={()=>puedeAsignarC3&&setModalAsignar({conteoId:c.id,tipo:"C3"})}
                          className="w-11 h-11 rounded-full flex items-center justify-center mx-auto shadow-md" style={{background:validColor,cursor:puedeAsignarC3?"pointer":"default",opacity:c3Terminado?0.7:1}}>
                          {validContent}
                        </div>
                        <div className="text-[9px] text-muted-foreground mt-1 text-center">
                          {c3Terminado?"C3 validado":puedeAsignarC3?"→ C3":c.estado==="completado"?"Sin dif":"En proceso"}
                        </div>
                      </td>

                      {/* Acciones */}
                      <td className="px-2.5 py-2.5 whitespace-nowrap">
                        <div className="flex gap-1.5 items-center">
                          <Button variant="outline" size="sm" className="h-7 px-2.5 text-xs" title="Imprimir documento de esta ubicación" onClick={()=>imprimirConteo(c)}><Printer size={12}/> Imprimir</Button>
                          {["cerradoC1","cerradoC2","completado","diferencia","enC3"].includes(c.estado)&&(
                            <Button variant="outline" size="sm" className="h-7 px-2.5 text-xs text-amber-700 border-amber-200 hover:bg-amber-50 hover:text-amber-700" onClick={()=>setModalReabrir(c)}><RefreshCw size={12}/> Reabrir</Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Modal asignar */}
      <Dialog open={!!modalAsignar} onOpenChange={(v)=>!v&&setModalAsignar(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{modalAsignar?.tipo==="C2"?"Asignar Usuario C2":modalAsignar?.tipo==="C3"?"Asignar Usuario C3 (desempate)":"Agregar usuario de apoyo"}</DialogTitle></DialogHeader>
          {modalAsignar&&(
          <div className="space-y-3.5">
            <div className="text-sm text-muted-foreground">
              {modalAsignar.tipo==="C2"&&"Este usuario hará el segundo conteo. Puede empezar en paralelo con C1."}
              {modalAsignar.tipo==="C3"&&"Este usuario contará solo los productos con diferencia entre C1 y C2."}
              {modalAsignar.tipo==="extra"&&"Este usuario ayudará pero no podrá cerrar el conteo."}
            </div>
            <div className="space-y-1.5">
              <Label>Seleccionar usuario</Label>
              <Select onValueChange={u=>{
                if(!u)return;
                const{conteoId,tipo}=modalAsignar;
                if(tipo==="C2")asignarC2(conteoId,u);
                else if(tipo==="C3")asignarC3(conteoId,u);
                else agregarUsuarioExtra(conteoId,u);
                setModalAsignar(null);
              }}>
                <SelectTrigger><SelectValue placeholder="Seleccionar…"/></SelectTrigger>
                <SelectContent>
                  {G.usuarios.filter(u=>u.activo).map(u=><SelectItem key={u.id} value={u.nombre}>{u.nombre}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Button variant="outline" className="w-full" onClick={()=>setModalAsignar(null)}>Cancelar</Button>
          </div>
          )}
        </DialogContent>
      </Dialog>
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

  // Exporta el comprobante de ajuste en el formato de importación de Siigo.
  // TODA la base con diferencia ≠ 0 (contados o no; un producto no contado con saldo
  // en sistema sale como Disminuye por su saldo). diferencia>0 ⇒ Aumenta, <0 ⇒ Disminuye.
  const expSiigo=()=>{
    const rows=difBase
      .map(c=>[c.codigo,c.nombre,c.referencia||"",c.diferencia>0?"Aumenta":"Disminuye",Math.abs(c.diferencia),c.costo||0]);
    if(!rows.length)return showToast("No hay diferencias para ajustar","warn");
    exportSheet(rows,SIIGO_AJUSTE_COLS,`ajuste_siigo_${TODAY().replace(/\//g,"-")}.xlsx`,"Datos");
    showToast(`Ajuste Siigo generado (${rows.length} productos) ✓`);
  };
  const valorAjusteTotal=baseCompleta.reduce((s,c)=>s+c.valDif,0);

  return(
    <Section>
      <PageHeader
        label="Análisis"
        title="Reportes"
        icon={BarChart2}
        subtitle={G.inventario?.nombre||"Inventario activo"}
        count={G.productos.length}
        countLabel="productos base"
      />

      <div className="grid gap-4" style={{gridTemplateColumns:"repeat(auto-fit,minmax(240px,1fr))"}}>

        {/* Diferencias de Conteos — expandible */}
        <Card className="p-5" style={{borderColor:"#fecaca"}}>
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{background:"#fef2f2"}}><RefreshCw size={20} style={{color:"#dc2626"}}/></div>
            <div>
              <div className="font-bold text-sm text-slate-900">Diferencias de Conteos</div>
              <div className="text-[11px] text-muted-foreground">C1 ≠ C2 — por conteo</div>
            </div>
          </div>
          <div className="rounded-lg py-2.5 text-[28px] font-black text-center mb-3" style={{background:"#fef2f2",color:"#dc2626"}}>{totalDifs}</div>
          <Button className="w-full" style={{background:"#dc2626"}} onClick={()=>setVerDifs(v=>!v)}>{verDifs?"Ocultar diferencias":"Ver diferencias"}</Button>
          {verDifs&&(
            <div className="mt-3">
              {conteosDifs.length===0?(
                <div className="flex items-center gap-1.5 rounded-lg bg-green-50 px-3.5 py-2.5 text-[13px] font-semibold text-green-700"><CheckCircle size={14}/> Ningún conteo presentó diferencias</div>
              ):conteosDifs.map(({conteo:c,difs},i)=>(
                <div key={i} className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 mb-2.5">
                  <div className="flex justify-between items-center mb-2 gap-2">
                    <div>
                      <div className="font-bold text-[13px] text-destructive">{c.nombre}</div>
                      <div className="text-[11px] text-muted-foreground flex items-center gap-1"><MapPin size={11}/> {c.locLabel} · {difs.length} productos</div>
                    </div>
                    <div className="flex gap-1.5">
                      <button onClick={()=>expPDF(difs,c.nombre)}
                        className="inline-flex items-center gap-1 rounded-md bg-red-600 text-white px-2.5 py-1 text-[11px] font-bold hover:bg-red-700"><Printer size={11}/> PDF</button>
                      <button onClick={()=>expXLSX(difs.map(d=>[d.codigo,d.ean||"",d.nombre,d.referencia,d.c1,d.c2,d.dif,d.u1,d.u2]),["CODIGO","EAN","NOMBRE","REFERENCIA","C1","C2","DIFERENCIA","USUARIO_C1","USUARIO_C2"],`difs_${c.nombre?.replace(/ /g,"_")}.xlsx`,`DIFERENCIAS ${c.nombre}`)}
                        className="inline-flex items-center gap-1 rounded-md bg-blue-800 text-white px-2.5 py-1 text-[11px] font-bold hover:bg-blue-900"><Download size={10}/> Excel</button>
                    </div>
                  </div>
                  <table className="w-full text-[11px]">
                    <thead><tr className="bg-red-200">
                      {["Código","EAN","Nombre","C1","C2","Dif","U.C1","U.C2"].map(h=><th key={h} className="px-2 py-1 text-left font-bold">{h}</th>)}
                    </tr></thead>
                    <tbody>
                      {difs.map((d,j)=>(
                        <tr key={j} className="border-b border-red-100">
                          <td className="px-2 py-1 font-mono">{d.codigo}</td>
                          <td className="px-2 py-1 text-[10px] text-muted-foreground">{d.ean||"—"}</td>
                          <td className="px-2 py-1 font-medium">{d.nombre.substring(0,25)}</td>
                          <td className="px-2 py-1 text-center font-bold">{d.c1}</td>
                          <td className="px-2 py-1 text-center font-bold">{d.c2}</td>
                          <td className="px-2 py-1 text-center font-bold text-destructive">{d.dif>0?"+"+d.dif:d.dif}</td>
                          <td className="px-2 py-1 text-muted-foreground">{d.u1}</td>
                          <td className="px-2 py-1 text-muted-foreground">{d.u2}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Sin Conteo */}
        <Card className="p-5" style={{borderColor:"#fed7aa"}}>
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{background:"#fffbeb"}}><Circle size={20} style={{color:"#d97706"}}/></div>
            <div><div className="font-bold text-sm text-slate-900">Sin Conteo</div><div className="text-[11px] text-muted-foreground">Productos no inventariados</div></div>
          </div>
          <div className="rounded-lg py-2.5 text-[28px] font-black text-center mb-3" style={{background:"#fffbeb",color:"#d97706"}}>{sinConteo.length}</div>
          <Button className="w-full" style={{background:"#d97706"}} onClick={()=>expXLSX(sinConteo.map(p=>[p.codigo,p.nombre,p.referencia,p.categoria,p.subcategoria,p.subgrupo,p.saldo,p.costo,p.nit,p.proveedor]),["CODIGO","NOMBRE","REFERENCIA","CATEGORIA","SUBCATEGORIA","SUBGRUPO","SALDO","COSTO","NIT","PROVEEDOR"],"sin_conteo.xlsx","REPORTE SIN CONTEOS")}><Download size={15}/> Exportar Excel</Button>
        </Card>

        {/* Diferencia Inventario */}
        <Card className="p-5" style={{borderColor:"#bfdbfe"}}>
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{background:"#eff6ff"}}><Scale size={20} style={{color:"#2563eb"}}/></div>
            <div><div className="font-bold text-sm text-slate-900">Diferencia Inventario</div><div className="text-[11px] text-muted-foreground">Físico vs Sistema · base completa</div></div>
          </div>
          <div className="rounded-lg py-2.5 text-[28px] font-black text-center mb-3" style={{background:"#eff6ff",color:"#2563eb"}}>{baseCompleta.length}</div>
          <Button className="w-full" onClick={()=>expXLSX(baseCompleta.map(c=>[c.codigo,c.nombre,c.referencia,c.costo||0,c.saldo,c.cantFinal,c.diferencia,Math.round(c.valDif),c.estado||"",c.categoria||"",c.subcategoria||"",c.subgrupo||"",c.nit||"",c.proveedor||""]),["CODIGO","NOMBRE","REFERENCIA","COSTO","SALDO","CANTIDAD","DIFERENCIA","VALOR_DIF","ESTADO","CATEGORIA","SUBCATEGORIA","SUBGRUPO","NIT","PROVEEDOR"],"diferencia_inventario.xlsx","DIFERENCIA INVENTARIOS")} disabled={baseCompleta.length===0}><Download size={15}/> Exportar Excel</Button>
        </Card>

        {/* Ajuste */}
        <Card className="p-5" style={{borderColor:"#bbf7d0"}}>
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{background:"#f0fdf4"}}><Wrench size={20} style={{color:"#16a34a"}}/></div>
            <div><div className="font-bold text-sm text-slate-900">Ajuste de Inventario</div><div className="text-[11px] text-muted-foreground">Código · Cantidad · Fecha · base completa</div></div>
          </div>
          <div className="rounded-lg py-2.5 text-[28px] font-black text-center mb-3" style={{background:"#f0fdf4",color:"#16a34a"}}>{baseCompleta.length}</div>
          <Button className="w-full" style={{background:"#16a34a"}} onClick={()=>expXLSX(baseCompleta.map(c=>[c.codigo,c.cantFinal,c.saldo,c.diferencia,TODAY(),c.ubicacion||"BODEGA"]),["CODIGO","CANTIDAD","SALDO","DIFERENCIA","FECH_CORTE","BODEGA"],"ajuste_inventario.xlsx","AJUSTE INVENTARIO")} disabled={baseCompleta.length===0}><Download size={15}/> Exportar Excel</Button>
          <Button className="w-full mt-2" variant="outline" onClick={expSiigo} disabled={baseCompleta.length===0}><Download size={15}/> Formato Siigo</Button>
        </Card>

        {/* Reporte de Captura */}
        <Card className="p-5" style={{borderColor:"#ddd6fe"}}>
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{background:"#faf5ff"}}><FileText size={20} style={{color:"#7c3aed"}}/></div>
            <div><div className="font-bold text-sm text-slate-900">Reporte de Captura</div><div className="text-[11px] text-muted-foreground">C1·C2·C3 en columnas · con ubicación</div></div>
          </div>
          <div className="rounded-lg py-2.5 text-[28px] font-black text-center mb-3" style={{background:"#faf5ff",color:"#7c3aed"}}>{capFinal.length}</div>
          <Button className="w-full" style={{background:"#7c3aed"}} onClick={()=>expXLSX(
            capFinal.map(c=>[c.ean,c.codigo,c.nombre,c.referencia,c.categoria,c.subcategoria,c.subgrupo,c.ubicacion,c.localizacion,c.nro,c.c1||"",c.c2||"",c.c3||"",c.cantFinal,c.costo,c.fecha||TODAY(),c.estado,c.obs||"",c.usuario,c.nit,c.proveedor]),
            ["EAN","CODIGO","NOMBRE","REFERENCIA","CATEGORIA","SUBCATEGORIA","SUBGRUPO","UBICACION","LOCALIZACION","N_LOCAL","CONTEO_1","CONTEO_2","CONTEO_3","CANTIDAD_FINAL","COSTO","FECHA","ESTADO","OBS","USUARIO","NIT","PROVEEDOR"],
            "captura_inventario.xlsx","CAPTURA INVENTARIO"
          )} disabled={capFinal.length===0}><Download size={15}/> Exportar Excel</Button>
        </Card>

      </div>
    </Section>
  );
}

// ── USUARIOS ──
function VUsuarios({usuario,G,rerender,showToast}){
  const [modal,setModal]=useState(false);
  const [modalImport,setModalImport]=useState(false);
  const [modalConfirmDel,setModalConfirmDel]=useState(null);
  const [form,setForm]=useState({nombre:"",pass:"",rol:"capturador",correo:"",telefono:"",editId:null});
  const [previewUsuarios,setPreviewUsuarios]=useState(null);
  const [credCreada,setCredCreada]=useState(null); // credencial recién creada/reseteada para compartir
  const [busy,setBusy]=useState(false);

  // Generar contraseña automática: primeras 3 letras del nombre + últimos 4 del teléfono
  const generarPass=(nombre,telefono)=>{
    const n=(nombre||"").toUpperCase().replace(/[^A-Z]/g,"").substring(0,3).padEnd(3,"X");
    const t=(telefono||"").replace(/\D/g,"");
    const nums=t.length>=4?t.slice(-4):"1234";
    return n+nums;
  };

  // Recargar la lista de usuarios de esta empresa desde la nube.
  const refresh=async()=>{try{const {data}=await SB.loadUsuarios(G.tenantId);if(data)G.usuarios=data;}catch(e){}};

  // Mensaje de acceso para compartir por WhatsApp (sin URL hardcoded; incluye el slug de la empresa).
  const buildShareMsg=(u)=>{
    const origin=(typeof window!=="undefined"&&window.location.origin)||"";
    const slug=((u.email||"").split("@")[1]||"").replace(".tomfic.app","");
    return `Hola ${u.nombre}! Tus datos para TOMFIC:\n🔗 ${origin}\n🏢 Empresa: ${slug}\n👤 Usuario: ${u.nombre}\n🔑 Clave: ${u.pass}\n\nIngresa en la pestaña «Equipo».`;
  };

  const guardar=async()=>{
    if(!form.nombre.trim()||(!form.editId&&!form.pass.trim()))return showToast("Completa nombre y contraseña","err");
    setBusy(true);
    try{
      if(form.editId){
        const {error}=await SB.updateUsuario(form.editId,{rol:form.rol,correo:form.correo||null,telefono:form.telefono||null});
        if(error)throw error;
        await refresh();showToast("Actualizado ✓");
      }else{
        const {data,error}=await SB.createMember(form.nombre.toUpperCase().trim(),form.pass,form.rol,form.correo,form.telefono);
        if(error)throw error;
        await refresh();
        setCredCreada({nombre:data.nombre||form.nombre.toUpperCase().trim(),pass:data.pass||form.pass,email:data.email});
        showToast("Usuario creado ✓");
      }
      setModal(false);setForm({nombre:"",pass:"",rol:"capturador",correo:"",telefono:"",editId:null});
      rerender();
    }catch(e){console.warn(e);showToast(e.message||"No se pudo guardar","err");}
    setBusy(false);
  };

  const copiarAcceso=(u)=>{
    navigator.clipboard?.writeText(buildShareMsg(u)).then(()=>showToast("Copiado al portapapeles ✓")).catch(()=>showToast("No se pudo copiar","err"));
  };

  const resetClave=async(u)=>{
    const nueva=generarPass(u.nombre,u.telefono);
    try{const {error}=await SB.resetMemberPassword(u.id,nueva);if(error)throw error;await refresh();rerender();setCredCreada({nombre:u.nombre,pass:nueva,email:u.email});showToast("Clave restablecida ✓");}
    catch(e){showToast(e.message||"No se pudo restablecer","err");}
  };

  const toggleActivo=async(u)=>{
    try{const {error}=await SB.updateUsuario(u.id,{activo:!u.activo});if(error)throw error;await refresh();rerender();}
    catch(e){showToast(e.message||"No se pudo actualizar","err");}
  };

  const eliminar=async(u)=>{
    const tieneConteos=G.conteos.some(c=>
      (c.usuarioC1===u.nombre||c.usuarioC2===u.nombre||c.usuarioC3===u.nombre)&&
      !["completado"].includes(c.estado)
    );
    if(tieneConteos)return showToast("Este usuario tiene conteos activos. Reasígnalos antes de eliminar.","err");
    try{const {error}=await SB.deleteMember(u.id);if(error)throw error;await refresh();}
    catch(e){return showToast(e.message||"No se pudo eliminar","err");}
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

  const confirmarImportUsuarios=async()=>{
    setBusy(true);
    let creados=0,fallidos=0;
    for(const u of previewUsuarios){
      try{const {error}=await SB.createMember(u.nombre,u.pass,u.rol,u.correo,u.telefono);if(error)throw error;creados++;}
      catch(e){fallidos++;}
    }
    await refresh();
    setBusy(false);
    setPreviewUsuarios(null);setModalImport(false);rerender();
    showToast(`✓ ${creados} usuarios creados${fallidos>0?` · ${fallidos} omitidos`:""}`);
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
      {/* Header */}
      <PageHeader
        label="Accesos"
        title="Gestión de Usuarios"
        icon={Users}
        subtitle={`${activos.length} activos · ${admins.length} admin · ${caps.length} capturadores`}
        count={G.usuarios.length}
        countLabel="usuarios"
      />
      <div className="flex gap-2.5 mb-4 flex-wrap">
        <Button onClick={()=>{setForm({nombre:"",pass:"",rol:"capturador",correo:"",telefono:"",editId:null});setModal(true);}}><UserPlus size={16}/> Crear Usuario</Button>
        <Button variant="outline" onClick={()=>setModalImport(true)}><Upload size={15}/> Importar desde Excel</Button>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="bg-slate-900 text-white">
              {["Usuario","Contraseña","Contacto","Rol","Creado","Estado","Acciones"].map(h=>(
                <th key={h} className="px-3.5 py-2.5 text-left font-semibold whitespace-nowrap">{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {G.usuarios.map((u)=>(
                <tr key={u.id} className="border-b last:border-0 hover:bg-slate-50 transition-colors">
                  <td className="px-3.5 py-2.5">
                    <div className="flex items-center gap-2">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-extrabold shrink-0 ${u.rol==="admin"?"bg-blue-700":u.rol==="gerente"?"bg-purple-600":"bg-green-600"}`}>{u.nombre[0]}</div>
                      <b>{u.nombre}</b>
                    </div>
                  </td>
                  <td className="px-3.5 py-2.5 font-mono text-xs text-muted-foreground">{u.pass||"—"}</td>
                  <td className="px-3.5 py-2.5 text-xs text-muted-foreground">
                    {u.correo&&<div className="flex items-center gap-1"><Mail size={11}/> {u.correo}</div>}
                    {u.telefono&&<div className="flex items-center gap-1"><Smartphone size={11}/> {u.telefono}</div>}
                    {!u.correo&&!u.telefono&&<span className="text-slate-300">—</span>}
                  </td>
                  <td className="px-3.5 py-2.5"><UIBadge variant="secondary" className={u.rol==="admin"?"bg-blue-100 text-blue-700":u.rol==="gerente"?"bg-purple-100 text-purple-700":"bg-green-100 text-green-700"}>{u.rol==="admin"?"ADMIN":u.rol==="gerente"?"GERENTE":"CAPTURADOR"}</UIBadge></td>
                  <td className="px-3.5 py-2.5 text-muted-foreground whitespace-nowrap">{u.creado}</td>
                  <td className="px-3.5 py-2.5"><UIBadge variant={u.activo?"success":"destructive"}>{u.activo?"ACTIVO":"INACTIVO"}</UIBadge></td>
                  <td className="px-3.5 py-2.5">
                    <div className="flex gap-1.5 flex-wrap">
                      <Button variant="outline" size="sm" className="h-7 px-2.5 text-xs" onClick={()=>{setForm({nombre:u.nombre,pass:"",rol:u.rol,correo:u.correo||"",telefono:u.telefono||"",editId:u.id});setModal(true);}}>Editar</Button>
                      <Button size="sm" className="h-7 px-2.5 text-xs bg-[#25d366] hover:bg-[#1da851]" onClick={()=>copiarAcceso(u)}><ClipboardList size={11}/> Copiar</Button>
                      <Button variant="outline" size="sm" className="h-7 px-2.5 text-xs" onClick={()=>resetClave(u)}><Key size={11}/> Clave</Button>
                      {u.id!==usuario.id&&<Button variant="outline" size="sm" className={`h-7 px-2.5 text-xs ${u.activo?"text-amber-600 border-amber-200 hover:bg-amber-50 hover:text-amber-700":"text-green-600 border-green-200 hover:bg-green-50 hover:text-green-700"}`} onClick={()=>toggleActivo(u)}>{u.activo?"Desactivar":"Activar"}</Button>}
                      {u.id!==usuario.id&&<Button variant="outline" size="sm" className="h-7 px-2.5 text-xs text-destructive border-red-200 hover:bg-red-50 hover:text-destructive" onClick={()=>setModalConfirmDel(u)}>Eliminar</Button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Modal crear/editar */}
      <Dialog open={modal} onOpenChange={setModal}>
        <DialogContent className="max-w-lg max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{form.editId?"Editar Usuario":"Crear Usuario"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3.5">
            <div className="space-y-1.5">
              <Label>Nombre de usuario</Label>
              <Input value={form.nombre} onChange={e=>{
                const n=e.target.value.toUpperCase();
                const autoPass=generarPass(n,form.telefono);
                setForm(p=>({...p,nombre:n,...(!p.editId?{pass:autoPass}:{})}));
              }} disabled={!!form.editId} placeholder="Ej: JUAN"/>
            </div>
            {!form.editId?(
              <div className="space-y-1.5">
                <Label>Contraseña (auto-generada, puedes cambiarla)</Label>
                <Input value={form.pass} onChange={e=>setForm(p=>({...p,pass:e.target.value}))} placeholder="••••••"/>
              </div>
            ):(
              <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
                <Key size={14} className="shrink-0"/><span>Para cambiar la clave usa <b>Clave</b> en la fila del usuario.</span>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Correo electrónico</Label>
                <Input value={form.correo} onChange={e=>setForm(p=>({...p,correo:e.target.value}))} placeholder="correo@ejemplo.com"/>
              </div>
              <div className="space-y-1.5">
                <Label>Teléfono / WhatsApp</Label>
                <Input value={form.telefono} onChange={e=>{
                  const t=e.target.value;
                  const autoPass=generarPass(form.nombre,t);
                  setForm(p=>({...p,telefono:t,...(!p.editId?{pass:autoPass}:{})}));
                }} placeholder="3001234567"/>
              </div>
            </div>
            {!form.editId&&(
              <div className="flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-2 text-xs text-blue-700">
                <Key size={14} className="shrink-0"/><span>Contraseña auto-generada: <b>{generarPass(form.nombre,form.telefono)}</b> · Puedes cambiarla manualmente arriba.</span>
              </div>
            )}
            <div className="space-y-1.5">
              <Label>Rol</Label>
              <div className="grid grid-cols-2 gap-2.5">
                {[["capturador","Capturador","Solo captura"],["admin","Administrador","Acceso total"],["gerente","Gerente","Solo lectura"]].map(([v,t,s])=>(
                  <div key={v} onClick={()=>setForm(p=>({...p,rol:v}))} className={`rounded-lg border-2 p-3 cursor-pointer transition-colors ${form.rol===v?"border-primary bg-blue-50":"border-slate-200 hover:border-slate-300"}`}>
                    <div className={`font-bold text-sm ${form.rol===v?"text-primary":"text-slate-900"}`}>{t}</div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">{s}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex items-start gap-2 rounded-lg bg-green-50 px-3 py-2.5 text-xs text-green-800">
              <ClipboardList size={14} className="shrink-0 mt-0.5"/><span>Después de crear el usuario usa el botón <b>Copiar</b> para enviarle los datos por WhatsApp.</span>
            </div>
            <Button className="w-full" onClick={guardar} disabled={busy}>{busy?"Guardando…":form.editId?"Actualizar":"Crear Usuario"}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal importar */}
      <Dialog open={modalImport} onOpenChange={(v)=>{setModalImport(v);if(!v)setPreviewUsuarios(null);}}>
        <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Importar Usuarios desde Excel</DialogTitle>
          </DialogHeader>
          {!previewUsuarios?(
            <div className="space-y-4">
              <div className="rounded-lg bg-blue-50 p-3.5 text-sm text-blue-800">
                <b>Columnas requeridas en el Excel:</b><br/>
                <span className="font-mono">NOMBRE · CORREO · TELEFONO · ROL</span><br/>
                <span className="text-xs text-muted-foreground mt-1 block">
                  La contraseña se genera automáticamente: primeras 3 letras del nombre + últimos 4 dígitos del teléfono.<br/>
                  Ejemplo: JUAN con tel. 3001234567 → contraseña: <b className="font-mono">JUA4567</b>
                </span>
              </div>
              <div className="flex gap-2.5">
                <Button asChild className="flex-1">
                  <label className="cursor-pointer">
                    <FolderOpen size={15}/> Seleccionar archivo Excel
                    <input type="file" accept=".xlsx,.xls" onChange={importarExcel} className="hidden"/>
                  </label>
                </Button>
                <Button variant="outline" onClick={descargarPlantilla}><Download size={15}/> Plantilla</Button>
              </div>
              <div className="flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
                <Lightbulb size={14} className="shrink-0"/> Descarga la plantilla de ejemplo para ver el formato correcto.
              </div>
            </div>
          ):(
            <div>
              <div className="font-bold text-sm text-slate-900 mb-3">
                Vista previa — {previewUsuarios.length} usuarios detectados
              </div>
              <div className="max-h-[320px] overflow-y-auto mb-4 rounded-lg border">
                <table className="w-full text-xs">
                  <thead><tr className="bg-slate-900 text-white sticky top-0">
                    {["Nombre","Contraseña","Correo","Teléfono","Rol"].map(h=>(
                      <th key={h} className="px-2.5 py-2 text-left font-semibold">{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {previewUsuarios.map((u,i)=>{
                      const duplicado=G.usuarios.find(x=>x.nombre===u.nombre);
                      return(
                        <tr key={i} className={`border-b last:border-0 ${duplicado?"bg-amber-50":""}`}>
                          <td className="px-2.5 py-1.5 font-bold">{u.nombre}{duplicado&&<span className="text-[10px] text-amber-600 ml-1.5 inline-flex items-center gap-0.5"><AlertTriangle size={10}/> Duplicado</span>}</td>
                          <td className="px-2.5 py-1.5 font-mono text-primary">{u.pass}</td>
                          <td className="px-2.5 py-1.5 text-muted-foreground">{u.correo||"—"}</td>
                          <td className="px-2.5 py-1.5 text-muted-foreground">{u.telefono||"—"}</td>
                          <td className="px-2.5 py-1.5"><UIBadge variant="secondary" className={u.rol==="admin"?"bg-blue-100 text-blue-700":"bg-green-100 text-green-700"}>{u.rol==="admin"?"ADMIN":"CAPTURADOR"}</UIBadge></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="flex gap-2.5">
                <Button className="flex-1" onClick={confirmarImportUsuarios} disabled={busy}>{busy?"Creando…":<><CheckCircle size={15}/> Confirmar importación</>}</Button>
                <Button variant="outline" className="flex-1" onClick={()=>setPreviewUsuarios(null)} disabled={busy}>← Volver</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal confirmar eliminación */}
      <ConfirmDialog
        open={!!modalConfirmDel}
        onOpenChange={(v)=>!v&&setModalConfirmDel(null)}
        icon={Trash2}
        title="Eliminar Usuario"
        description={<>¿Estás seguro de que deseas eliminar al usuario <b>{modalConfirmDel?.nombre}</b>? Esta acción no se puede deshacer.</>}
        confirmText="Sí, eliminar"
        onConfirm={()=>eliminar(modalConfirmDel)}
      />

      {/* Modal credencial creada / reseteada — mostrar y compartir */}
      <Dialog open={!!credCreada} onOpenChange={(v)=>!v&&setCredCreada(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Acceso de {credCreada?.nombre}</DialogTitle></DialogHeader>
          {credCreada&&(
            <div className="space-y-3">
              <div className="rounded-lg bg-slate-50 border p-3 text-sm space-y-1">
                <div><span className="text-slate-500">Empresa:</span> <b className="font-mono">{((credCreada.email||"").split("@")[1]||"").replace(".tomfic.app","")}</b></div>
                <div><span className="text-slate-500">Usuario:</span> <b>{credCreada.nombre}</b></div>
                <div><span className="text-slate-500">Clave:</span> <b className="font-mono">{credCreada.pass}</b></div>
              </div>
              <div className="flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
                <AlertTriangle size={14} className="shrink-0"/> Comparte esta clave ahora: por seguridad podría no estar visible después.
              </div>
              <div className="flex gap-2">
                <Button className="flex-1 bg-[#25d366] hover:bg-[#1da851]" onClick={()=>copiarAcceso(credCreada)}><ClipboardList size={15}/> Copiar acceso</Button>
                <Button variant="outline" className="flex-1" onClick={()=>setCredCreada(null)}>Cerrar</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
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
      <div>
        <div className="flex gap-3 items-center mb-4">
          <Button variant="outline" size="sm" onClick={()=>setCardDetalle(null)}><ChevronLeft size={15}/> Volver</Button>
          <h2 className="text-lg font-bold">{cardDetalle.titulo}</h2>
        </div>
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead><tr className="bg-slate-900 text-white">
                {cardDetalle.cols.map(h=><th key={h} className="px-3 py-2 text-left font-semibold">{h}</th>)}
              </tr></thead>
              <tbody>
                {cardDetalle.lista.length===0?(
                  <tr><td colSpan={cardDetalle.cols.length} className="p-5 text-center text-muted-foreground">Sin registros</td></tr>
                ):cardDetalle.lista.map((row,i)=>(
                  <tr key={i} className="border-b last:border-0 hover:bg-slate-50">
                    {row.map((cell,j)=><td key={j} className="px-3 py-1.5 text-slate-700">{cell}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    );
  }

  // Detalle de un inventario
  if(invSel){
    const inv=invSel;
    const st=getSt(inv);
    const stCards=[
      {l:"Valor físico total",v:fmt(st.totalFisico),c:"#16a34a",
       lista:st.resumen.map(r=>[r.codigo,r.nombre,r.referencia,r.cantFinal,r.costo>0?fmt(r.cantFinal*r.costo):"—"]),
       cols:["Código","Nombre","Referencia","Cantidad","Valor"]},
      {l:"Valor sistema",v:fmt(st.totalSistema),c:"#2563eb",
       lista:st.resumen.map(r=>{const p=(inv.productos||[]).find(x=>x.id===r.productoId);return[r.codigo,r.nombre,r.referencia,p?.saldo||0,p?.costo>0?fmt((p?.saldo||0)*p.costo):"—"];}),
       cols:["Código","Nombre","Referencia","Saldo Sistema","Valor Sistema"]},
      {l:"Valor ajuste",v:(st.ajuste>=0?"+":"")+fmt(st.ajuste),c:st.ajuste>=0?"#16a34a":"#dc2626",
       lista:st.conDif.map(r=>{const p=(inv.productos||[]).find(x=>x.id===r.productoId);const dif=r.cantFinal-(p?.saldo||0);return[r.codigo,r.nombre,p?.saldo||0,r.cantFinal,dif>0?"+"+dif:dif,fmt(dif*(p?.costo||0))];}),
       cols:["Código","Nombre","Saldo","Físico","Diferencia","Valor Dif"]},
      {l:"Productos contados",v:`${st.contados}/${st.totalProductos}`,c:"#0891b2",
       lista:st.resumen.map(r=>[r.codigo,r.nombre,r.referencia,r.cantFinal,r.estado||""]),
       cols:["Código","Nombre","Referencia","Cantidad","Estado"]},
      {l:"Productos buenos",v:st.buenos.length,c:"#16a34a",
       lista:st.buenos.map(r=>[r.codigo,r.nombre,r.referencia,r.cantFinal]),
       cols:["Código","Nombre","Referencia","Cantidad"]},
      {l:"Vencidos",v:st.vencidos.length,c:"#dc2626",
       lista:st.vencidos.map(r=>[r.codigo,r.nombre,r.referencia,r.cantFinal]),
       cols:["Código","Nombre","Referencia","Cantidad"]},
      {l:"Averiados/No aptos",v:st.averiados.length,c:"#d97706",
       lista:st.averiados.map(r=>[r.codigo,r.nombre,r.referencia,r.cantFinal]),
       cols:["Código","Nombre","Referencia","Cantidad"]},
      {l:"Con diferencia",v:st.conDif.length,c:"#ef4444",
       lista:st.conDif.map(r=>{const p=(inv.productos||[]).find(x=>x.id===r.productoId);const dif=r.cantFinal-(p?.saldo||0);return[r.codigo,r.nombre,p?.saldo||0,r.cantFinal,dif>0?"+"+dif:dif];}),
       cols:["Código","Nombre","Saldo","Físico","Diferencia"]},
    ];
    return(
      <div>
        <div className="flex items-center gap-3 mb-4 flex-wrap">
          <Button variant="outline" size="sm" onClick={()=>setInvSel(null)}><ChevronLeft size={15}/> Historial</Button>
          <h2 className="text-xl font-bold">{inv.nombre}</h2>
          <UIBadge className="border-transparent" style={{background:(inv.tipo==="2conteos"?"#2563eb":"#16a34a")+"22",color:inv.tipo==="2conteos"?"#2563eb":"#16a34a"}}>{inv.tipo==="2conteos"?"2 CONTEOS":"1 CONTEO"}</UIBadge>
        </div>
        <div className="text-xs text-muted-foreground mb-4 flex items-center gap-1"><Calendar size={12}/> {inv.apertura} {inv.horaApertura} → {inv.cierre} {inv.horaCierre} · Por: {inv.usuarioApertura}</div>
        <div className="grid gap-3 mb-5" style={{gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))"}}>
          {stCards.map((s,i)=>(
            <Card key={i} onClick={()=>setCardDetalle({titulo:s.l,lista:s.lista,cols:s.cols})}
              className="px-4 py-3 cursor-pointer hover:shadow-md transition-shadow" style={{borderTop:`3px solid ${s.c}`}}>
              <div className="font-extrabold" style={{color:s.c,fontSize:typeof s.v==="string"&&s.v.length>8?14:20}}>{s.v}</div>
              <div className="text-[11px] text-muted-foreground mt-0.5">{s.l}</div>
              <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-0.5">Clic para ver detalle <ChevronRight size={10}/></div>
            </Card>
          ))}
        </div>
        <div className="flex gap-2.5 flex-wrap">
          <Button onClick={()=>expXLSX(
            st.resumen.map(r=>{const p=(inv.productos||[]).find(x=>x.id===r.productoId);return[r.ean||"",r.codigo,r.nombre,r.referencia,r.totalC1||"",r.totalC2||"",r.totalC3||"",r.cantFinal,r.estado||"",p?.saldo||0,r.costo>0?fmt(r.cantFinal*r.costo):"—",r.usuario];}),
            ["EAN","CODIGO","NOMBRE","REFERENCIA","C1","C2","C3","CANTIDAD_FINAL","ESTADO","SALDO_SISTEMA","VALOR","USUARIO"],
            `captura_${inv.nombre?.replace(/ /g,"_")}.xlsx`,`CAPTURA INVENTARIO ${inv.nombre}`)}><Download size={15}/> Excel capturas</Button>
          <Button style={{background:"#16a34a"}} onClick={()=>expXLSX(
            st.conDif.map(r=>{const p=(inv.productos||[]).find(x=>x.id===r.productoId);const dif=r.cantFinal-(p?.saldo||0);return[r.codigo,r.nombre,r.referencia,r.estado||"",p?.saldo||0,r.cantFinal,dif,Math.round(dif*(p?.costo||0)),p?.costo||0];}),
            ["CODIGO","NOMBRE","REFERENCIA","ESTADO","SALDO","FISICO","DIFERENCIA","VALOR_DIF","COSTO"],
            `ajuste_${inv.nombre?.replace(/ /g,"_")}.xlsx`,`AJUSTE ${inv.nombre}`)}><Download size={15}/> Excel ajuste</Button>
        </div>
      </div>
    );
  }

  // Vista global
  return(
    <div>
      <PageHeader
        label="Inventarios"
        title="Historial"
        icon={Landmark}
        subtitle={G.historial[0]?.nombre||"Sin inventarios cerrados"}
        count={G.historial.length}
        countLabel="inventarios"
      />
      {G.historial.length===0?(
        <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-white py-12 px-5 text-center text-muted-foreground">
          <Landmark size={48} className="text-slate-400 mb-3"/>
          <div className="text-base font-bold text-slate-900 mb-1.5">Sin historial</div>
          <div className="text-sm">Los inventarios cerrados aparecerán aquí.</div>
        </div>
      ):G.historial.length===1?(
        (()=>{const inv=G.historial[0];const st=getSt(inv);return(
          <div>
            <Card className="p-5 mb-4 border-l-4 border-l-primary">
              <div className="font-bold text-base">{inv.nombre}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{inv.apertura} → {inv.cierre} · Por: {inv.usuarioApertura}</div>
            </Card>
            <div className="grid gap-3" style={{gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))"}}>
              {[
                {l:"Valor físico",v:fmt(st.totalFisico),c:"#16a34a",bg:"#f0fdf4",icon:DollarSign},
                {l:"Valor sistema",v:fmt(st.totalSistema),c:"#2563eb",bg:"#eff6ff",icon:BarChart2},
                {l:"Ajuste",v:(st.ajuste>=0?"+":"")+fmt(st.ajuste),c:st.ajuste>=0?"#16a34a":"#dc2626",bg:st.ajuste>=0?"#f0fdf4":"#fef2f2",icon:Scale},
                {l:"Contados",v:`${st.contados}/${st.totalProductos}`,c:"#0891b2",bg:"#ecfeff",icon:Package},
                {l:"Buenos",v:st.buenos.length,c:"#16a34a",bg:"#f0fdf4",icon:CheckCircle},
                {l:"Vencidos",v:st.vencidos.length,c:"#dc2626",bg:"#fef2f2",icon:XCircle},
                {l:"Averiados",v:st.averiados.length,c:"#d97706",bg:"#fffbeb",icon:AlertCircle},
                {l:"Con diferencia",v:st.conDif.length,c:"#ef4444",bg:"#fef2f2",icon:AlertTriangle},
              ].map((s,i)=>(
                <Card key={i} onClick={()=>setInvSel(inv)}
                  className="px-4 py-3.5 cursor-pointer hover:shadow-md transition-shadow" style={{background:s.bg,borderColor:s.c+"22"}}>
                  <s.icon size={18} style={{color:s.c}} className="mb-1"/>
                  <div className="font-black leading-none" style={{color:s.c,fontSize:typeof s.v==="string"&&s.v.length>8?13:22}}>{s.v}</div>
                  <div className="text-[11px] text-muted-foreground mt-1 font-semibold">{s.l}</div>
                </Card>
              ))}
            </div>
          </div>
        );})()
      ):(
        <>
          <div className="grid gap-3 mb-5" style={{gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))"}}>
            {[
              {l:"Total",v:G.historial.length,c:"#2563eb",bg:"#eff6ff",icon:Landmark},
              {l:"Último",v:G.historial[0]?.nombre?.substring(0,14)||"—",c:"#16a34a",bg:"#f0fdf4",icon:ClipboardList},
              {l:"Fecha cierre",v:G.historial[0]?.cierre||"—",c:"#0891b2",bg:"#ecfeff",icon:Calendar},
            ].map(s=>(
              <Card key={s.l} className="px-4 py-3.5" style={{background:s.bg,borderColor:s.c+"22"}}>
                <s.icon size={22} style={{color:s.c}} className="mb-1.5"/>
                <div className="font-black leading-none" style={{color:s.c,fontSize:s.v.toString().length>12?12:22}}>{s.v}</div>
                <div className="text-[11px] text-muted-foreground mt-1 font-semibold">{s.l}</div>
              </Card>
            ))}
          </div>
          <div className="flex flex-col gap-3">
            {G.historial.map((h,i)=>{
              const st=getSt(h);
              return(
                <Card key={i} className="p-5 border-l-4 border-l-primary hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start">
                    <div className="flex-1 cursor-pointer" onClick={()=>setInvSel(h)}>
                      <div className="font-bold text-[15px] text-slate-900">{h.nombre}</div>
                      <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5 flex-wrap">
                        <UIBadge className="border-transparent" style={{background:(h.tipo==="2conteos"?"#2563eb":"#16a34a")+"22",color:h.tipo==="2conteos"?"#2563eb":"#16a34a"}}>{h.tipo==="2conteos"?"2 CONTEOS":"1 CONTEO"}</UIBadge>
                        {h.apertura} → {h.cierre} · Por: {h.usuarioApertura}
                      </div>
                      <div className="flex gap-4 mt-2 flex-wrap">
                        <span className="text-xs text-green-600 font-bold inline-flex items-center gap-1"><DollarSign size={11}/> {fmt(st.totalFisico)}</span>
                        <span className="text-xs font-bold inline-flex items-center gap-1" style={{color:st.ajuste>=0?"#16a34a":"#dc2626"}}><Scale size={11}/> {(st.ajuste>=0?"+":"")+fmt(st.ajuste)}</span>
                        <span className="text-xs text-muted-foreground">{st.contados}/{st.totalProductos} productos</span>
                        {st.conDif.length>0&&<span className="text-xs text-destructive font-bold inline-flex items-center gap-1"><AlertTriangle size={11}/> {st.conDif.length} difs</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2.5 shrink-0 ml-3">
                      <div className="text-xs text-primary font-semibold cursor-pointer inline-flex items-center gap-0.5" onClick={()=>setInvSel(h)}>Ver detalle <ChevronRight size={13}/></div>
                      <Button variant="outline" size="sm" className="h-8 px-2.5 text-destructive border-red-200 hover:bg-red-50 hover:text-destructive" onClick={e=>{e.stopPropagation();setConfirmElim(i);}}><Trash2 size={14}/></Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </>
      )}

      {/* Modal confirmar eliminación historial */}
      <ConfirmDialog
        open={confirmElim!==null}
        onOpenChange={(v)=>!v&&setConfirmElim(null)}
        icon={Trash2}
        title="Eliminar inventario"
        description={<>¿Estás seguro de eliminar <strong>{G.historial[confirmElim]?.nombre}</strong> del historial? Esta acción no se puede deshacer.</>}
        confirmText="Sí, eliminar"
        onConfirm={async()=>{
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
        }}
      />
    </div>
  );
}

// ── EDITOR DE LA PÁGINA WEB (solo dueño) ──
function Ta({value,onChange,rows=2,placeholder}){
  return <textarea value={value} onChange={onChange} rows={rows} placeholder={placeholder}
    className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-y"/>;
}
const ColorField=({label,value,onChange})=>(
  <div className="space-y-1.5">
    <Label className="text-xs">{label}</Label>
    <div className="flex items-center gap-2">
      <input type="color" value={value||"#000000"} onChange={e=>onChange(e.target.value)} className="h-10 w-12 rounded border border-slate-200 cursor-pointer bg-white p-0.5"/>
      <Input value={value||""} onChange={e=>onChange(e.target.value)} className="font-mono"/>
    </div>
  </div>
);
function VPaginaWeb({G,rerender,showToast}){
  const [form,setForm]=useState(()=>mergeLanding(G.landingContent));
  const [saving,setSaving]=useState(false);
  const [tab,setTab]=useState("contenido");

  const setHero=(k,v)=>setForm(f=>({...f,hero:{...f.hero,[k]:v}}));
  const setAbout=(k,v)=>setForm(f=>({...f,about:{...f.about,[k]:v}}));
  const setContacto=(k,v)=>setForm(f=>({...f,contacto:{...f.contacto,[k]:v}}));
  const setFeature=(i,k,v)=>setForm(f=>({...f,features:f.features.map((x,j)=>j===i?{...x,[k]:v}:x)}));
  const setStep=(i,k,v)=>setForm(f=>({...f,steps:f.steps.map((x,j)=>j===i?{...x,[k]:v}:x)}));
  const setPlan=(i,k,v)=>setForm(f=>({...f,planes:f.planes.map((x,j)=>j===i?{...x,[k]:v}:x)}));
  const setTheme=(k,v)=>setForm(f=>({...f,theme:{...f.theme,[k]:v}}));
  const setPromo=(k,v)=>setForm(f=>({...f,promo:{...f.promo,[k]:v}}));
  const TABS=[["contenido","Contenido",FileText],["colores","Colores",Pencil],["promociones","Promociones",Bell],["preview","Vista previa",Eye]];

  const guardar=async()=>{
    setSaving(true);
    const clean={...form,planes:form.planes.map(p=>({...p,items:(p.items||[]).map(x=>x.trim()).filter(Boolean)}))};
    try{
      const {error}=await SB.setConfig("landing",clean);
      if(error)throw error;
      G.landingContent=clean;rerender();
      showToast("Página web actualizada y publicada ✓");
    }catch(e){
      console.warn("Error guardando landing:",e);
      showToast("No se pudo guardar. Verifica que exista la tabla 'app_config' en Supabase.","err");
    }
    setSaving(false);
  };

  const BtnGuardar=({className=""})=>(
    <Button onClick={guardar} disabled={saving} className={className}>
      {saving?"Guardando…":<><CheckCircle size={16}/> Guardar y publicar</>}
    </Button>
  );

  return(
    <Section>
      <PageHeader
        label="Web pública"
        title="Página web"
        icon={Globe}
        subtitle="Edita tu web y publícala cuando quieras."
        right={<BtnGuardar className="bg-white text-blue-700 hover:bg-blue-50"/>}
      />

      <div className="flex flex-wrap gap-1 mb-5 border-b border-slate-200">
        {TABS.map(([id,label,Ic])=>{const active=tab===id;return(
          <button key={id} onClick={()=>setTab(id)}
            className={`flex items-center gap-1.5 px-3.5 py-2 text-sm -mb-px border-b-2 transition-colors ${active?"border-indigo-600 text-indigo-700 font-semibold":"border-transparent text-slate-500 hover:text-slate-800"}`}>
            <Ic size={15}/> {label}
          </button>
        );})}
      </div>

      {tab==="contenido"&&(<>
      {/* HERO */}
      <Card className="p-5 mb-4">
        <div className="font-bold text-sm text-slate-900 mb-3">Encabezado principal (Hero)</div>
        <div className="space-y-3">
          <div className="space-y-1.5"><Label>Etiqueta superior</Label><Input value={form.hero.badge} onChange={e=>setHero("badge",e.target.value)}/></div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Título</Label><Input value={form.hero.title} onChange={e=>setHero("title",e.target.value)}/></div>
            <div className="space-y-1.5"><Label>Título (palabra resaltada)</Label><Input value={form.hero.titleHighlight} onChange={e=>setHero("titleHighlight",e.target.value)}/></div>
          </div>
          <div className="space-y-1.5"><Label>Subtítulo</Label><Ta value={form.hero.subtitle} onChange={e=>setHero("subtitle",e.target.value)} rows={2}/></div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Texto botón principal</Label><Input value={form.hero.ctaPrimary} onChange={e=>setHero("ctaPrimary",e.target.value)}/></div>
            <div className="space-y-1.5"><Label>Texto botón secundario</Label><Input value={form.hero.ctaSecondary} onChange={e=>setHero("ctaSecondary",e.target.value)}/></div>
          </div>
        </div>
      </Card>

      {/* QUIÉNES SOMOS */}
      <Card className="p-5 mb-4">
        <div className="font-bold text-sm text-slate-900 mb-3">Quiénes somos</div>
        <div className="space-y-3">
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Etiqueta</Label><Input value={form.about.label} onChange={e=>setAbout("label",e.target.value)}/></div>
            <div className="space-y-1.5"><Label>Título</Label><Input value={form.about.title} onChange={e=>setAbout("title",e.target.value)}/></div>
          </div>
          <div className="space-y-1.5"><Label>Párrafo 1</Label><Ta value={form.about.p1} onChange={e=>setAbout("p1",e.target.value)} rows={3}/></div>
          <div className="space-y-1.5"><Label>Párrafo 2</Label><Ta value={form.about.p2} onChange={e=>setAbout("p2",e.target.value)} rows={2}/></div>
        </div>
      </Card>

      {/* CARACTERÍSTICAS */}
      <Card className="p-5 mb-4">
        <div className="font-bold text-sm text-slate-900 mb-3">Características (6)</div>
        <div className="space-y-4">
          {form.features.map((f,i)=>(
            <div key={i} className="grid sm:grid-cols-[200px_1fr] gap-3 items-start border-b last:border-0 pb-4 last:pb-0">
              <div className="space-y-1.5"><Label>Título {i+1}</Label><Input value={f.title} onChange={e=>setFeature(i,"title",e.target.value)}/></div>
              <div className="space-y-1.5"><Label>Descripción</Label><Ta value={f.desc} onChange={e=>setFeature(i,"desc",e.target.value)} rows={2}/></div>
            </div>
          ))}
        </div>
      </Card>

      {/* CÓMO FUNCIONA */}
      <Card className="p-5 mb-4">
        <div className="font-bold text-sm text-slate-900 mb-3">Cómo funciona (3 pasos)</div>
        <div className="space-y-4">
          {form.steps.map((s,i)=>(
            <div key={i} className="grid sm:grid-cols-[200px_1fr] gap-3 items-start border-b last:border-0 pb-4 last:pb-0">
              <div className="space-y-1.5"><Label>Paso {i+1}</Label><Input value={s.title} onChange={e=>setStep(i,"title",e.target.value)}/></div>
              <div className="space-y-1.5"><Label>Descripción</Label><Ta value={s.desc} onChange={e=>setStep(i,"desc",e.target.value)} rows={2}/></div>
            </div>
          ))}
        </div>
      </Card>

      {/* PRECIOS */}
      <Card className="p-5 mb-4">
        <div className="font-bold text-sm text-slate-900 mb-3">Precios (3 planes)</div>
        <div className="grid md:grid-cols-3 gap-4">
          {form.planes.map((p,i)=>(
            <div key={i} className="rounded-xl border border-slate-200 p-4 space-y-3">
              <div className="space-y-1.5"><Label>Nombre del plan</Label><Input value={p.nombre} onChange={e=>setPlan(i,"nombre",e.target.value)}/></div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5"><Label>Precio</Label><Input value={p.precio} onChange={e=>setPlan(i,"precio",e.target.value)}/></div>
                <div className="space-y-1.5"><Label>Periodo</Label><Input value={p.periodo} onChange={e=>setPlan(i,"periodo",e.target.value)} placeholder="/mes"/></div>
              </div>
              <div className="space-y-1.5"><Label>Descripción</Label><Ta value={p.desc} onChange={e=>setPlan(i,"desc",e.target.value)} rows={2}/></div>
              <div className="space-y-1.5"><Label>Beneficios (uno por línea)</Label><Ta value={(p.items||[]).join("\n")} onChange={e=>setPlan(i,"items",e.target.value.split("\n"))} rows={5}/></div>
              <label className="flex items-center gap-2 text-sm font-medium text-slate-700 cursor-pointer">
                <input type="checkbox" checked={!!p.destacado} onChange={e=>setPlan(i,"destacado",e.target.checked)} className="h-4 w-4 accent-blue-600"/>
                Marcar como "Más popular"
              </label>
            </div>
          ))}
        </div>
      </Card>

      {/* CONTACTO */}
      <Card className="p-5 mb-4">
        <div className="font-bold text-sm text-slate-900 mb-3">Contacto (footer)</div>
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="space-y-1.5"><Label>Email</Label><Input value={form.contacto.email} onChange={e=>setContacto("email",e.target.value)}/></div>
          <div className="space-y-1.5"><Label>WhatsApp</Label><Input value={form.contacto.whatsapp} onChange={e=>setContacto("whatsapp",e.target.value)}/></div>
        </div>
      </Card>
      </>)}

      {tab==="colores"&&(
        <Card className="p-5 mb-4">
          <div className="font-bold text-sm text-slate-900 mb-1">Colores de la marca</div>
          <p className="text-xs text-muted-foreground mb-4">Se aplican a botones, resaltados y acentos de tu web. Míralos en la pestaña «Vista previa» antes de publicar.</p>
          <div className="grid sm:grid-cols-2 gap-4 max-w-lg">
            <ColorField label="Color principal" value={form.theme.primario} onChange={v=>setTheme("primario",v)}/>
            <ColorField label="Color secundario (promos)" value={form.theme.secundario} onChange={v=>setTheme("secundario",v)}/>
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            <button onClick={()=>{setTheme("primario","#2563eb");setTheme("secundario","#0891b2");}} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50">Azul (por defecto)</button>
            <button onClick={()=>{setTheme("primario","#059669");setTheme("secundario","#0d9488");}} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50">Verde</button>
            <button onClick={()=>{setTheme("primario","#7c3aed");setTheme("secundario","#c026d3");}} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50">Morado</button>
            <button onClick={()=>{setTheme("primario","#ea580c");setTheme("secundario","#d97706");}} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50">Naranja</button>
          </div>
        </Card>
      )}

      {tab==="promociones"&&(
        <Card className="p-5 mb-4 max-w-lg">
          <div className="font-bold text-sm text-slate-900 mb-1">Banner de promoción</div>
          <p className="text-xs text-muted-foreground mb-4">Aparece como una franja en la parte superior de tu web.</p>
          <label className="flex items-center gap-2 text-sm font-medium text-slate-700 cursor-pointer mb-3">
            <input type="checkbox" checked={!!form.promo.activo} onChange={e=>setPromo("activo",e.target.checked)} className="h-4 w-4 accent-blue-600"/>
            Mostrar el banner en la web
          </label>
          <div className="space-y-1.5"><Label>Texto de la promoción</Label><Input value={form.promo.texto} onChange={e=>setPromo("texto",e.target.value)} placeholder="Ej: ¡2 meses gratis en tu primer plan!"/></div>
          {form.promo.activo&&form.promo.texto&&(
            <div className="mt-4"><div className="text-xs text-muted-foreground mb-1.5">Así se verá:</div>
              <div className="rounded-lg text-center text-sm font-semibold px-4 py-2 text-white" style={{background:form.theme.secundario}}>{form.promo.texto}</div>
            </div>
          )}
        </Card>
      )}

      {tab==="preview"&&(
        <div>
          <div className="flex items-center gap-2 mb-3 text-xs text-muted-foreground"><Eye size={14}/> Vista previa de tus cambios <b>sin publicar</b>. La barra del navegador es solo del preview — no aparece en tu web real.</div>
          <div className="rounded-xl border border-slate-200 overflow-hidden bg-white shadow-sm">
            <div className="h-9 bg-slate-100 border-b border-slate-200 flex items-center gap-1.5 px-3">
              <span className="w-3 h-3 rounded-full bg-red-400"/><span className="w-3 h-3 rounded-full bg-amber-400"/><span className="w-3 h-3 rounded-full bg-green-400"/>
              <span className="ml-2 text-xs text-slate-400">tomfic.vercel.app · vista previa</span>
            </div>
            <div style={{height:540,overflow:"auto"}}>
              <div style={{transform:"scale(0.62)",transformOrigin:"top left",width:"161.3%"}}>
                <Landing content={form} preview/>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-end gap-2 mb-2 mt-5">
        <Button variant="outline" onClick={()=>setForm(mergeLanding(null))}>Restaurar por defecto</Button>
        <BtnGuardar/>
      </div>
    </Section>
  );
}

// ── PANEL DEL DUEÑO (super-admin, separado del inventario de clientes) ──
// Ficha completa de un cliente-empresa: datos/plan, estado de pago, historial de
// pagos y gestión de sus usuarios (activar/desactivar, resetear clave). Solo dueño.
const money=(n)=>"$"+Math.round(Number(n)||0).toLocaleString("es-CO");
const HOY=()=>new Date().toISOString().slice(0,10);
function VClienteDetalle({t,showToast,onBack,onChanged}){
  const [pagos,setPagos]=useState([]);
  const [users,setUsers]=useState([]);
  const [loading,setLoading]=useState(true);
  const [meta,setMeta]=useState({plan:t.plan||"basico",precio:t.precio||0,max_usuarios:t.max_usuarios||5,vence:t.vence||"",notas:t.notas||""});
  const [savingMeta,setSavingMeta]=useState(false);
  const [pago,setPago]=useState({fecha:HOY(),monto:"",metodo:"Transferencia",nota:""});
  const [savingPago,setSavingPago]=useState(false);
  const [resetFor,setResetFor]=useState(null); // usuario al que se le resetea la clave
  const [newPass,setNewPass]=useState("");
  const [delOpen,setDelOpen]=useState(false); // diálogo de "eliminar empresa"
  const [delText,setDelText]=useState("");    // el dueño debe escribir el nombre para confirmar
  const [borrando,setBorrando]=useState(false);

  const cargar=async()=>{
    setLoading(true);
    const [p,u]=await Promise.all([SB.listPagos(t.id),SB.loadUsuarios(t.id)]);
    setPagos(p.data||[]); setUsers(u.data||[]);
    setLoading(false);
  };
  useEffect(()=>{cargar();/* eslint-disable-next-line */},[t.id]);

  const estado=!meta.vence?{txt:"Sin fecha",v:"secondary"}:meta.vence>=HOY()?{txt:"Al día",v:"success"}:{txt:"Vencido / Debe",v:"destructive"};

  const guardarMeta=async()=>{
    setSavingMeta(true);
    try{
      const patch={plan:meta.plan||"basico",precio:Number(meta.precio)||0,max_usuarios:Number(meta.max_usuarios)||0,vence:meta.vence||null,notas:meta.notas||null};
      const {error}=await SB.updateTenant(t.id,patch); if(error)throw error;
      Object.assign(t,patch); onChanged&&onChanged();
      showToast("Datos del cliente guardados ✓");
    }catch(e){showToast(e.message||"No se pudo guardar","err");}
    setSavingMeta(false);
  };

  const registrarPago=async()=>{
    if(!(Number(pago.monto)>0))return showToast("Ingresa un monto válido","err");
    setSavingPago(true);
    try{
      // El período corre automático: inicia en la fecha de pago y vence a los 30 días.
      const desde=pago.fecha||HOY();
      const hasta=addDias(desde,30);
      const row={tenant_id:t.id,fecha:desde,monto:Number(pago.monto),periodo_desde:desde,periodo_hasta:hasta,metodo:pago.metodo||null,nota:pago.nota||null};
      const {error}=await SB.insertPago(row); if(error)throw error;
      const {error:e2}=await SB.updateTenant(t.id,{vence:hasta});
      if(!e2){setMeta(m=>({...m,vence:hasta}));Object.assign(t,{vence:hasta});onChanged&&onChanged();}
      setPago({fecha:HOY(),monto:"",metodo:pago.metodo,nota:""});
      await cargar();
      showToast(`Pago registrado ✓ · vence ${fmtFechaCorta(hasta)}`);
    }catch(e){showToast(e.message||"No se pudo registrar el pago","err");}
    setSavingPago(false);
  };
  const borrarPago=async(id)=>{try{const {error}=await SB.deletePago(id);if(error)throw error;await cargar();showToast("Pago eliminado","warn");}catch(e){showToast(e.message||"Error","err");}};

  const toggleUser=async(u)=>{try{const {error}=await SB.setMemberActive(u.id,!u.activo);if(error)throw error;await cargar();showToast(u.activo?"Usuario bloqueado":"Usuario activado","warn");}catch(e){showToast(e.message||"Error","err");}};
  const resetear=async()=>{
    if(newPass.length<6)return showToast("La clave debe tener al menos 6 caracteres","err");
    try{const {error}=await SB.resetMemberPassword(resetFor.id,newPass);if(error)throw error;setResetFor(null);setNewPass("");showToast("Clave restablecida ✓");}catch(e){showToast(e.message||"Error","err");}
  };
  // Elimina la empresa y TODO lo suyo (usuarios+auth, productos, inventarios, conteos, pagos, config).
  const eliminarEmpresa=async()=>{
    if(delText.trim()!==(t.nombre||"").trim())return showToast("El nombre no coincide","err");
    setBorrando(true);
    try{
      const {error}=await SB.deleteTenant(t.id); if(error)throw error;
      setDelOpen(false);setDelText("");
      showToast("Empresa eliminada","warn");
      onChanged&&onChanged(); onBack&&onBack();
    }catch(e){showToast(e.message||"No se pudo eliminar la empresa","err");}
    setBorrando(false);
  };

  return(
    <Section>
      <div className="mb-4">
        <Button variant="ghost" size="sm" className="text-indigo-200 hover:text-white hover:bg-white/10 mb-2" onClick={onBack}><ChevronLeft size={16}/> Volver a Clientes</Button>
        <PageHeader label="Ficha del cliente" title={t.nombre} icon={Landmark} right={<UIBadge variant={estado.v} className="text-sm">{estado.txt}</UIBadge>}/>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Datos & plan */}
        <Card className="p-5">
          <div className="font-bold text-slate-900 mb-3 flex items-center gap-2"><Settings size={16}/> Datos y plan</div>
          <div className="grid grid-cols-2 gap-2 text-sm mb-3">
            <div><div className="text-xs text-muted-foreground">NIT</div><div className="font-medium">{t.nit||"—"}</div></div>
            <div><div className="text-xs text-muted-foreground">Identificador (slug)</div><div className="font-mono">{t.slug||"—"}</div></div>
            <div><div className="text-xs text-muted-foreground">Registrada</div><div className="font-medium">{(t.created_at||"").slice(0,10)||"—"}</div></div>
            <div><div className="text-xs text-muted-foreground">Estado empresa</div><div>{t.activo?<UIBadge variant="success">Activa</UIBadge>:<UIBadge variant="destructive">Inactiva</UIBadge>}</div></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1"><Label className="text-xs">Plan</Label><Input value={meta.plan} onChange={e=>setMeta(m=>({...m,plan:e.target.value}))}/></div>
            <div className="space-y-1"><Label className="text-xs">Precio mensual</Label><Input type="number" value={meta.precio} onChange={e=>setMeta(m=>({...m,precio:e.target.value}))}/></div>
            <div className="space-y-1"><Label className="text-xs">Máx. usuarios</Label><Input type="number" value={meta.max_usuarios} onChange={e=>setMeta(m=>({...m,max_usuarios:e.target.value}))}/></div>
            <div className="space-y-1"><Label className="text-xs">Vence</Label><Input type="date" value={meta.vence||""} onChange={e=>setMeta(m=>({...m,vence:e.target.value}))}/></div>
          </div>
          <div className="space-y-1 mt-3"><Label className="text-xs">Notas</Label><Input value={meta.notas} onChange={e=>setMeta(m=>({...m,notas:e.target.value}))} placeholder="Observaciones del cliente"/></div>
          <Button className="w-full mt-3" onClick={guardarMeta} disabled={savingMeta}>{savingMeta?"Guardando…":"Guardar datos"}</Button>
        </Card>

        {/* Registrar pago */}
        <Card className="p-5">
          <div className="font-bold text-slate-900 mb-3 flex items-center gap-2"><DollarSign size={16}/> Registrar pago</div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1"><Label className="text-xs">Fecha de pago</Label><Input type="date" value={pago.fecha} onChange={e=>setPago(p=>({...p,fecha:e.target.value}))}/></div>
            <div className="space-y-1"><Label className="text-xs">Monto</Label><Input type="number" value={pago.monto} onChange={e=>setPago(p=>({...p,monto:e.target.value}))} placeholder="0"/></div>
            <div className="space-y-1"><Label className="text-xs">Método</Label><Input value={pago.metodo} onChange={e=>setPago(p=>({...p,metodo:e.target.value}))}/></div>
            <div className="space-y-1"><Label className="text-xs">Nota</Label><Input value={pago.nota} onChange={e=>setPago(p=>({...p,nota:e.target.value}))}/></div>
          </div>
          <div className="mt-3 flex items-center gap-2 rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2 text-xs text-emerald-800">
            <Calendar size={14} className="shrink-0"/> El plan queda pagado por <b>30 días</b> · vence el <b>{fmtFechaCorta(addDias(pago.fecha||HOY(),30))}</b>
          </div>
          <Button className="w-full mt-3" onClick={registrarPago} disabled={savingPago}>{savingPago?"Registrando…":<><Plus size={15}/> Registrar pago</>}</Button>
        </Card>
      </div>

      {/* Historial de pagos */}
      <Card className="mt-4 overflow-hidden">
        <div className="px-5 pt-4 pb-2 font-bold text-slate-900 flex items-center gap-2"><FileText size={16}/> Historial de pagos <span className="text-xs font-normal text-muted-foreground">({pagos.length})</span></div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="bg-slate-900 text-white">{["Fecha","Monto","Periodo","Método","Nota",""].map(h=><th key={h} className="px-3 py-2 text-left font-semibold text-xs whitespace-nowrap">{h}</th>)}</tr></thead>
            <tbody>
              {pagos.length===0?(<tr><td colSpan={6} className="px-3 py-6 text-center text-muted-foreground text-sm">Sin pagos registrados.</td></tr>):pagos.map(p=>(
                <tr key={p.id} className="border-b last:border-0 hover:bg-slate-50">
                  <td className="px-3 py-2 whitespace-nowrap">{(p.fecha||"").slice(0,10)}</td>
                  <td className="px-3 py-2 font-semibold text-emerald-700">{money(p.monto)}</td>
                  <td className="px-3 py-2 text-xs text-muted-foreground whitespace-nowrap">{p.periodo_desde?`${p.periodo_desde} → ${p.periodo_hasta||"?"}`:"—"}</td>
                  <td className="px-3 py-2 text-xs">{p.metodo||"—"}</td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">{p.nota||"—"}</td>
                  <td className="px-3 py-2"><button onClick={()=>borrarPago(p.id)} className="text-red-500 hover:text-red-700"><Trash2 size={14}/></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Usuarios de la empresa */}
      <Card className="mt-4 overflow-hidden">
        <div className="px-5 pt-4 pb-2 font-bold text-slate-900 flex items-center gap-2"><Users size={16}/> Usuarios
          <span className={`text-xs font-normal ${users.length>Number(meta.max_usuarios||0)?"text-red-600 font-semibold":"text-muted-foreground"}`}>({users.length}/{meta.max_usuarios||"∞"})</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="bg-slate-900 text-white">{["Usuario","Rol","Email de acceso","Estado","Acciones"].map(h=><th key={h} className="px-3 py-2 text-left font-semibold text-xs whitespace-nowrap">{h}</th>)}</tr></thead>
            <tbody>
              {loading?(<tr><td colSpan={5} className="px-3 py-6 text-center text-muted-foreground">Cargando…</td></tr>):users.length===0?(<tr><td colSpan={5} className="px-3 py-6 text-center text-muted-foreground">Sin usuarios.</td></tr>):users.map(u=>(
                <tr key={u.id} className="border-b last:border-0 hover:bg-slate-50">
                  <td className="px-3 py-2 font-semibold text-slate-900">{u.nombre}</td>
                  <td className="px-3 py-2"><UIBadge variant="secondary">{u.rol}</UIBadge></td>
                  <td className="px-3 py-2 font-mono text-xs text-muted-foreground">{u.email||u.correo||"—"}</td>
                  <td className="px-3 py-2">{u.activo?<UIBadge variant="success">Activo</UIBadge>:<UIBadge variant="destructive">Bloqueado</UIBadge>}</td>
                  <td className="px-3 py-2">
                    <div className="flex gap-1.5">
                      <Button variant="outline" size="sm" className="h-7 px-2 text-xs" onClick={()=>toggleUser(u)}>{u.activo?"Bloquear":"Activar"}</Button>
                      <Button variant="outline" size="sm" className="h-7 px-2 text-xs" onClick={()=>{setResetFor(u);setNewPass("");}}><Key size={12}/> Clave</Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Zona de peligro — eliminar empresa */}
      <Card className="mt-4 p-5 border-red-200 bg-red-50/40">
        <div className="font-bold text-red-700 mb-1 flex items-center gap-2"><AlertTriangle size={16}/> Zona de peligro</div>
        <div className="text-sm text-red-800/80 mb-3">Eliminar esta empresa borra <b>de forma permanente</b> sus usuarios, productos, inventarios, conteos, pagos y configuración. No se puede deshacer.</div>
        <Button variant="outline" className="text-destructive border-red-300 hover:bg-red-100 hover:text-destructive" onClick={()=>{setDelText("");setDelOpen(true);}}>
          <Trash2 size={15}/> Eliminar empresa
        </Button>
      </Card>

      <Dialog open={!!resetFor} onOpenChange={o=>{if(!o){setResetFor(null);setNewPass("");}}}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Restablecer clave de {resetFor?.nombre}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5"><Label>Nueva clave</Label><Input value={newPass} onChange={e=>setNewPass(e.target.value)} placeholder="mín. 6 caracteres"/></div>
            <Button className="w-full" onClick={resetear}><Key size={15}/> Restablecer</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={delOpen} onOpenChange={o=>{if(!o){setDelOpen(false);setDelText("");}}}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="text-red-700 flex items-center gap-2"><AlertTriangle size={18}/> Eliminar «{t.nombre}»</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="text-sm text-slate-700">Esto borra <b>permanentemente</b> la empresa y todos sus datos y accesos. No se puede deshacer.</div>
            <div className="space-y-1.5">
              <Label>Para confirmar, escribe el nombre exacto: <span className="font-mono font-bold">{t.nombre}</span></Label>
              <Input value={delText} onChange={e=>setDelText(e.target.value)} placeholder={t.nombre}/>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={()=>{setDelOpen(false);setDelText("");}}>Cancelar</Button>
              <Button className="flex-1 bg-red-600 hover:bg-red-700 text-white" disabled={borrando||delText.trim()!==(t.nombre||"").trim()} onClick={eliminarEmpresa}>{borrando?"Eliminando…":<><Trash2 size={15}/> Eliminar</>}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Section>
  );
}

function VClientes({G,rerender,recargar,showToast,focusTenant,clearFocus,initFiltro,clearFiltro}){
  const [modal,setModal]=useState(false);
  const [form,setForm]=useState({nombre:"",nit:"",slug:"",adminNombre:"",adminEmail:"",adminPass:""});
  const [saving,setSaving]=useState(false);
  const [sel,setSel]=useState(null); // empresa abierta en ficha detalle
  const [q,setQ]=useState(""); // buscador por nombre/NIT/slug
  const [fEstado,setFEstado]=useState("todos"); // filtro por estado de la empresa
  const [fPago,setFPago]=useState("todos");     // filtro por estado de pago

  // Al llegar desde el Dashboard con una empresa enfocada, abrir su ficha directamente.
  useEffect(()=>{ if(focusTenant){ setSel(focusTenant); clearFocus&&clearFocus(); } /* eslint-disable-next-line */ },[focusTenant]);
  // Al llegar desde una tarjeta del Dashboard, aplicar su filtro (ej. "vencidas").
  useEffect(()=>{ if(initFiltro){ if(initFiltro.pago)setFPago(initFiltro.pago); if(initFiltro.estado)setFEstado(initFiltro.estado); clearFiltro&&clearFiltro(); } /* eslint-disable-next-line */ },[initFiltro]);

  const crear=async()=>{
    if(!form.nombre.trim()||!form.nit.trim()||!form.adminEmail.trim()||!form.adminPass.trim())return showToast("Completa empresa, NIT, email y clave","err");
    if(form.adminPass.length<6)return showToast("La clave debe tener al menos 6 caracteres","err");
    setSaving(true);
    const slug=slugify(form.nit); // el identificador (slug) sale del NIT
    try{
      const {data,error}=await SB.registerTenant(form.nombre.trim(),slug,form.adminEmail.trim(),form.adminPass,form.adminNombre.trim(),form.nit.trim());
      if(error)throw error;
      // El dueño la crea a propósito → la dejamos activa de una vez.
      if(data?.tenant_id){const {error:e2}=await SB.setTenantActive(data.tenant_id,true);if(e2)throw e2;}
      await loadTenants();rerender();
      setModal(false);setForm({nombre:"",nit:"",slug:"",adminNombre:"",adminEmail:"",adminPass:""});
      showToast("Empresa creada y activada ✓");
    }catch(e){console.warn("Error creando empresa:",e);showToast(e.message||"No se pudo crear la empresa","err");}
    setSaving(false);
  };
  const toggleActivo=async(t)=>{
    try{const {error}=await SB.setTenantActive(t.id,!t.activo);if(error)throw error;await loadTenants();rerender();showToast(t.activo?"Empresa desactivada":"Empresa activada","warn");}catch(e){showToast(e.message||"Error al actualizar","err");}
  };

  const tenants=G.tenants||[];
  const reloadTenants=async()=>{await loadTenants();rerender();};
  // Estado de pago derivado de la fecha de vencimiento.
  const estadoPago=(t)=>{const d=diasHasta(t.vence);if(d===null)return "sinfecha";if(d<0)return "vencido";if(d<=AVISO_DIAS)return "porvencer";return "aldia";};
  const pagoBadge=(t)=>{const e=estadoPago(t);
    if(e==="sinfecha")return <UIBadge variant="secondary">Sin fecha</UIBadge>;
    if(e==="vencido") return <UIBadge variant="destructive">Vencido</UIBadge>;
    if(e==="porvencer")return <UIBadge variant="warning">Por vencer</UIBadge>;
    return <UIBadge variant="success">Al día</UIBadge>;};
  const norm=s=>(s||"").toString().toLowerCase();
  const filtered=tenants.filter(t=>{
    if(q){const s=norm(q);if(!(norm(t.nombre).includes(s)||norm(t.nit).includes(s)||norm(t.slug).includes(s)))return false;}
    if(fEstado==="activa"&&!t.activo)return false;
    if(fEstado==="inactiva"&&t.activo)return false;
    if(fPago!=="todos"&&estadoPago(t)!==fPago)return false;
    return true;
  });
  if(sel){const fresh=tenants.find(x=>x.id===sel.id)||sel;return <VClienteDetalle t={fresh} showToast={showToast} onBack={()=>setSel(null)} onChanged={reloadTenants}/>;}
  return(
    <Section>
      <PageHeader label="Empresas" title="Clientes" icon={Users} count={tenants.length} countLabel="empresas"
        right={<Button onClick={()=>setModal(true)} className="bg-white text-indigo-700 hover:bg-indigo-50"><Plus size={16}/> Crear empresa</Button>}/>
      {tenants.length===0?(
        <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-white py-12 px-5 text-center text-muted-foreground">
          <Users size={48} className="text-slate-400 mb-3"/>
          <div className="text-base font-bold text-slate-900 mb-1.5">Sin empresas todavía</div>
          <div className="text-sm">Crea la primera empresa-cliente.</div>
        </div>
      ):(
        <>
        {/* Buscador + filtros */}
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
            <Input value={q} onChange={e=>setQ(e.target.value)} placeholder="Buscar por empresa, NIT o slug…" className="pl-9 bg-white"/>
          </div>
          <select value={fEstado} onChange={e=>setFEstado(e.target.value)} className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700">
            <option value="todos">Todos los estados</option>
            <option value="activa">Activas</option>
            <option value="inactiva">Inactivas</option>
          </select>
          <select value={fPago} onChange={e=>setFPago(e.target.value)} className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700">
            <option value="todos">Todo pago</option>
            <option value="aldia">Al día</option>
            <option value="porvencer">Por vencer</option>
            <option value="vencido">Vencido</option>
            <option value="sinfecha">Sin fecha</option>
          </select>
          {(q||fEstado!=="todos"||fPago!=="todos")&&<Button variant="outline" size="sm" className="h-10" onClick={()=>{setQ("");setFEstado("todos");setFPago("todos");}}><X size={14}/> Limpiar</Button>}
          <span className="text-xs text-muted-foreground ml-auto">{filtered.length} de {tenants.length}</span>
        </div>
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="bg-slate-900 text-white">{["Empresa","NIT","Plan","Estado","Pago","Vence","Acciones"].map(h=><th key={h} className="px-3 py-2.5 text-left font-semibold whitespace-nowrap text-xs">{h}</th>)}</tr></thead>
              <tbody>
                {filtered.length===0&&<tr><td colSpan={7} className="px-3 py-8 text-center text-sm text-muted-foreground">Ninguna empresa coincide con la búsqueda.</td></tr>}
                {filtered.map(t=>(
                  <tr key={t.id} className="border-b last:border-0 hover:bg-slate-50">
                    <td className="px-3 py-2.5 font-bold text-slate-900">{t.nombre}<div className="font-mono text-[10px] font-normal text-slate-400">{t.slug||"—"}</div></td>
                    <td className="px-3 py-2.5 text-xs text-muted-foreground">{t.nit||"—"}</td>
                    <td className="px-3 py-2.5"><UIBadge variant="secondary">{t.plan||"basico"}</UIBadge></td>
                    <td className="px-3 py-2.5">{t.activo?<UIBadge variant="success">Activa</UIBadge>:<UIBadge variant="destructive">Inactiva</UIBadge>}</td>
                    <td className="px-3 py-2.5">{pagoBadge(t)}</td>
                    <td className="px-3 py-2.5 text-xs text-muted-foreground whitespace-nowrap">{fmtFechaCorta(t.vence)}</td>
                    <td className="px-3 py-2.5">
                      <div className="flex gap-1.5">
                        <Button size="sm" className="h-7 px-2.5 text-xs" onClick={()=>setSel(t)}><ChevronRight size={13}/> Ingresar</Button>
                        <Button variant="outline" size="sm" className="h-7 px-2.5 text-xs" onClick={()=>toggleActivo(t)}>{t.activo?"Desactivar":"Activar"}</Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
        </>
      )}
      <Dialog open={modal} onOpenChange={setModal}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Crear empresa-cliente</DialogTitle></DialogHeader>
          <div className="space-y-3.5">
            <div className="space-y-1.5"><Label>Nombre de la empresa</Label><Input value={form.nombre} onChange={e=>setForm(p=>({...p,nombre:e.target.value}))} placeholder="Ej: Supermercado La 14"/></div>
            <div className="space-y-1.5"><Label>NIT</Label><Input value={form.nit} onChange={e=>setForm(p=>({...p,nit:e.target.value}))} placeholder="900.123.456-7"/>{form.nit.trim()&&<p className="text-xs text-slate-400">Identificador del equipo: <span className="font-mono text-slate-600">{slugify(form.nit)}</span></p>}</div>
            <div className="rounded-lg bg-indigo-50 px-3 py-2.5 text-xs text-indigo-800">Se crea la cuenta de <b>administrador</b> de esta empresa (entra con <b>email + clave</b> en la pestaña «Administrador»). La empresa queda activa de inmediato.</div>
            <div className="space-y-1.5"><Label>Nombre del admin <span className="text-slate-400 font-normal">(opcional)</span></Label><Input value={form.adminNombre} onChange={e=>setForm(p=>({...p,adminNombre:e.target.value}))} placeholder="Ej: Juan Pérez"/></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Email del admin</Label><Input type="email" value={form.adminEmail} onChange={e=>setForm(p=>({...p,adminEmail:e.target.value}))} placeholder="admin@empresa.com"/></div>
              <div className="space-y-1.5"><Label>Clave admin</Label><Input value={form.adminPass} onChange={e=>setForm(p=>({...p,adminPass:e.target.value}))} placeholder="mín. 6 caracteres"/></div>
            </div>
            <Button className="w-full" onClick={crear} disabled={saving}>{saving?"Creando…":<><Plus size={16}/> Crear empresa</>}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </Section>
  );
}

// ── DASHBOARD DEL DUEÑO (resumen de empresas, vencimientos e ingresos) ──
function VResumen({G,showToast,onOpenCliente,onGo}){
  const [pagos,setPagos]=useState([]);
  const [loading,setLoading]=useState(true);
  const cargar=async()=>{
    setLoading(true);
    const {data,error}=await SB.listAllPagos();
    if(error)console.warn("No se pudieron cargar los pagos:",error.message);
    setPagos(data||[]); setLoading(false);
  };
  useEffect(()=>{cargar();/* eslint-disable-next-line */},[]);

  const tenants=G.tenants||[];
  const fmt=(n)=>"$"+Math.round(n||0).toLocaleString("es-CO");
  const conFecha=tenants.filter(t=>t.vence);
  const porVencer=conFecha.filter(t=>{const d=diasHasta(t.vence);return d>=0&&d<=AVISO_DIAS;}).sort((a,b)=>a.vence.localeCompare(b.vence));
  const vencidas=conFecha.filter(t=>diasHasta(t.vence)<0).sort((a,b)=>a.vence.localeCompare(b.vence));
  const activas=tenants.filter(t=>t.activo).length;

  const mesAct=ISO_HOY().slice(0,7);
  const ingresosMes=pagos.filter(p=>(p.fecha||"").slice(0,7)===mesAct).reduce((s,p)=>s+(Number(p.monto)||0),0);
  // Ingresos de los últimos 6 meses (para el mini-gráfico).
  const meses=[];{const d=new Date();for(let i=5;i>=0;i--){const m=new Date(d.getFullYear(),d.getMonth()-i,1);meses.push(m.toISOString().slice(0,7));}}
  const ingXMes=meses.map(m=>({m,total:pagos.filter(p=>(p.fecha||"").slice(0,7)===m).reduce((s,p)=>s+(Number(p.monto)||0),0)}));
  const maxIng=Math.max(1,...ingXMes.map(x=>x.total));
  const NM=["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
  const nombreMes=(ym)=>{const [y,mm]=ym.split("-");return NM[+mm-1]+" '"+y.slice(2);};
  const ultimos=pagos.slice(0,6);
  const tName=(tid)=>{const t=tenants.find(x=>x.id===tid);return t?t.nombre:"—";};

  const Metric=({icon:Ic,label,value,color,sub,onClick,border})=>(
    <button type="button" onClick={onClick} disabled={!onClick}
      style={{textAlign:"left",background:"white",border:`1px solid ${border||"#e2e8f0"}`,borderRadius:14,padding:"16px 18px",flex:"1 1 150px",minWidth:150,boxShadow:"0 1px 3px rgba(0,0,0,0.04)",cursor:onClick?"pointer":"default",transition:"box-shadow .15s,transform .15s"}}
      onMouseEnter={e=>{if(onClick){e.currentTarget.style.boxShadow="0 4px 14px rgba(0,0,0,0.10)";e.currentTarget.style.transform="translateY(-1px)";}}}
      onMouseLeave={e=>{e.currentTarget.style.boxShadow="0 1px 3px rgba(0,0,0,0.04)";e.currentTarget.style.transform="none";}}>
      <div style={{display:"flex",alignItems:"center",gap:7,color:color||"#64748b"}}><Ic size={15}/><span style={{fontSize:11,fontWeight:700,textTransform:"uppercase",letterSpacing:0.5}}>{label}</span>{onClick&&<ChevronRight size={13} style={{marginLeft:"auto",opacity:0.5}}/>}</div>
      <div style={{fontSize:25,fontWeight:800,color:"#0f172a",marginTop:6,lineHeight:1}}>{value}</div>
      {sub&&<div style={{fontSize:11,color:"#94a3b8",marginTop:4}}>{sub}</div>}
    </button>
  );
  const FilaEmpresa=({t})=>{const d=diasHasta(t.vence);return(
    <button onClick={()=>onOpenCliente&&onOpenCliente(t)} style={{width:"100%",display:"flex",alignItems:"center",justifyContent:"space-between",gap:8,padding:"9px 12px",background:"white",border:"1px solid #f1f5f9",borderRadius:10,cursor:"pointer",textAlign:"left"}}>
      <div style={{minWidth:0}}><div style={{fontWeight:700,fontSize:13,color:"#0f172a",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{t.nombre}</div><div style={{fontSize:11,color:"#94a3b8"}}>Vence {fmtFechaCorta(t.vence)}</div></div>
      <span style={{flexShrink:0,fontSize:11,fontWeight:700,padding:"3px 9px",borderRadius:20,background:d<0?"#fee2e2":"#fef3c7",color:d<0?"#b91c1c":"#b45309"}}>{d<0?`hace ${Math.abs(d)}d`:d===0?"hoy":`en ${d}d`}</span>
    </button>
  );};

  return(
    <Section>
      <PageHeader label="Panel del Dueño" title="Resumen" icon={BarChart2} subtitle={loading?"Cargando…":`${tenants.length} empresas · ${TODAY()}`}/>
      {/* Tarjetas de métricas */}
      <div style={{display:"flex",flexWrap:"wrap",gap:12,marginBottom:20}}>
        <Metric icon={Users} label="Empresas" value={tenants.length} color="#4f46e5" onClick={()=>onGo&&onGo("clientes",{pago:"todos"})}/>
        <Metric icon={CheckCircle} label="Al día" value={conFecha.filter(t=>diasHasta(t.vence)>AVISO_DIAS).length} color="#16a34a" sub={`${tenants.length-activas} inactivas`} onClick={()=>onGo&&onGo("clientes",{pago:"aldia"})}/>
        <Metric icon={Clock} label="Por vencer" value={porVencer.length} color="#b45309" sub={`próximos ${AVISO_DIAS} días`} border="#fde68a" onClick={()=>onGo&&onGo("clientes",{pago:"porvencer"})}/>
        <Metric icon={AlertCircle} label="Vencidas" value={vencidas.length} color="#dc2626" border="#fecaca" onClick={()=>onGo&&onGo("clientes",{pago:"vencido"})}/>
        <Metric icon={DollarSign} label="Ingresos del mes" value={fmt(ingresosMes)} color="#0891b2" sub={nombreMes(mesAct)} onClick={()=>onGo&&onGo("pagos")}/>
      </div>

      {/* Listas de vencimientos */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))",gap:16,marginBottom:20}}>
        <div style={card}>
          <div style={{fontWeight:800,fontSize:14,color:"#0f172a",marginBottom:12,display:"flex",alignItems:"center",gap:7}}><Clock size={16} color="#b45309"/> Por vencer <span style={{marginLeft:"auto",fontSize:12,color:"#94a3b8",fontWeight:600}}>{porVencer.length}</span></div>
          <div style={{display:"flex",flexDirection:"column",gap:7,maxHeight:230,overflowY:"auto"}}>
            {porVencer.length===0?<div style={{fontSize:13,color:"#94a3b8",padding:"8px 0"}}>Nada por vencer en los próximos {AVISO_DIAS} días. 👍</div>:porVencer.map(t=><FilaEmpresa key={t.id} t={t}/>)}
          </div>
        </div>
        <div style={card}>
          <div style={{fontWeight:800,fontSize:14,color:"#0f172a",marginBottom:12,display:"flex",alignItems:"center",gap:7}}><AlertCircle size={16} color="#dc2626"/> Vencidas <span style={{marginLeft:"auto",fontSize:12,color:"#94a3b8",fontWeight:600}}>{vencidas.length}</span></div>
          <div style={{display:"flex",flexDirection:"column",gap:7,maxHeight:230,overflowY:"auto"}}>
            {vencidas.length===0?<div style={{fontSize:13,color:"#94a3b8",padding:"8px 0"}}>Ninguna empresa vencida. ✅</div>:vencidas.map(t=><FilaEmpresa key={t.id} t={t}/>)}
          </div>
        </div>
      </div>

      {/* Gráfico de ingresos + últimos pagos */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))",gap:16}}>
        <div style={card}>
          <div style={{fontWeight:800,fontSize:14,color:"#0f172a",marginBottom:16,display:"flex",alignItems:"center",gap:7}}><BarChart2 size={16} color="#4f46e5"/> Ingresos (últimos 6 meses)</div>
          <div style={{display:"flex",alignItems:"flex-end",gap:10,height:130}}>
            {ingXMes.map(x=>(
              <div key={x.m} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"flex-end",gap:6,height:"100%"}}>
                <div style={{fontSize:9,fontWeight:700,color:"#475569",whiteSpace:"nowrap"}}>{x.total?fmt(x.total).replace("$",""):""}</div>
                <div style={{width:"68%",height:`${Math.max(3,(x.total/maxIng)*90)}px`,background:x.total?"linear-gradient(180deg,#6366f1,#4338ca)":"#e2e8f0",borderRadius:"6px 6px 0 0",transition:"height .3s"}}/>
                <div style={{fontSize:10,color:"#94a3b8",whiteSpace:"nowrap"}}>{nombreMes(x.m)}</div>
              </div>
            ))}
          </div>
        </div>
        <div style={card}>
          <div style={{fontWeight:800,fontSize:14,color:"#0f172a",marginBottom:12,display:"flex",alignItems:"center",gap:7}}><DollarSign size={16} color="#0891b2"/> Últimos pagos <button onClick={()=>onGo&&onGo("pagos")} style={{marginLeft:"auto",fontSize:12,fontWeight:600,color:"#4f46e5",background:"none",border:"none",cursor:"pointer",display:"flex",alignItems:"center",gap:2}}>Ver todos <ChevronRight size={13}/></button></div>
          <div style={{display:"flex",flexDirection:"column",gap:2,maxHeight:200,overflowY:"auto"}}>
            {ultimos.length===0?<div style={{fontSize:13,color:"#94a3b8",padding:"8px 0"}}>Aún no hay pagos registrados.</div>:ultimos.map(p=>(
              <div key={p.id} style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:8,padding:"7px 4px",borderBottom:"1px solid #f8fafc"}}>
                <div style={{minWidth:0}}><div style={{fontSize:13,fontWeight:600,color:"#0f172a",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{tName(p.tenant_id)}</div><div style={{fontSize:11,color:"#94a3b8"}}>{fmtFechaCorta(p.fecha)}{p.metodo?" · "+p.metodo:""}</div></div>
                <div style={{fontSize:13,fontWeight:800,color:"#16a34a",whiteSpace:"nowrap"}}>{fmt(p.monto)}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Section>
  );
}

// ── MÓDULO PAGOS (todos los pagos de todas las empresas) ──
function VPagos({G,showToast}){
  const [pagos,setPagos]=useState([]);
  const [loading,setLoading]=useState(true);
  const [q,setQ]=useState("");
  const tenants=G.tenants||[];
  const tName=(tid)=>{const t=tenants.find(x=>x.id===tid);return t?t.nombre:"—";};
  const cargar=async()=>{setLoading(true);const {data,error}=await SB.listAllPagos();if(error)console.warn("No se pudieron cargar los pagos:",error.message);setPagos(data||[]);setLoading(false);};
  useEffect(()=>{cargar();/* eslint-disable-next-line */},[]);
  const norm=s=>(s||"").toString().toLowerCase();
  const filtered=pagos.filter(p=>!q||norm(tName(p.tenant_id)).includes(norm(q))||norm(p.metodo).includes(norm(q))||norm(p.nota).includes(norm(q)));
  const mesAct=ISO_HOY().slice(0,7);
  const totalMes=pagos.filter(p=>(p.fecha||"").slice(0,7)===mesAct).reduce((s,p)=>s+(Number(p.monto)||0),0);
  const totalAll=pagos.reduce((s,p)=>s+(Number(p.monto)||0),0);
  return(
    <Section>
      <PageHeader label="Facturación" title="Pagos" icon={DollarSign} count={pagos.length} countLabel="pagos"/>
      <div className="grid grid-cols-2 gap-3 mb-4 max-w-md">
        <div className="rounded-xl border border-slate-200 bg-white p-4"><div className="text-xs font-semibold uppercase tracking-wide text-cyan-600 flex items-center gap-1.5"><DollarSign size={14}/> Este mes</div><div className="text-2xl font-extrabold text-slate-900 mt-1">{money(totalMes)}</div></div>
        <div className="rounded-xl border border-slate-200 bg-white p-4"><div className="text-xs font-semibold uppercase tracking-wide text-indigo-600 flex items-center gap-1.5"><BarChart2 size={14}/> Total histórico</div><div className="text-2xl font-extrabold text-slate-900 mt-1">{money(totalAll)}</div></div>
      </div>
      <div className="relative mb-3 max-w-sm">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
        <Input value={q} onChange={e=>setQ(e.target.value)} placeholder="Buscar por empresa, método o nota…" className="pl-9 bg-white"/>
      </div>
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="bg-slate-900 text-white">{["Empresa","Fecha","Monto","Periodo","Método","Nota"].map(h=><th key={h} className="px-3 py-2.5 text-left font-semibold text-xs whitespace-nowrap">{h}</th>)}</tr></thead>
            <tbody>
              {loading?(<tr><td colSpan={6} className="px-3 py-8 text-center text-muted-foreground text-sm">Cargando…</td></tr>):
               filtered.length===0?(<tr><td colSpan={6} className="px-3 py-8 text-center text-muted-foreground text-sm">{pagos.length===0?"Aún no hay pagos registrados.":"Ningún pago coincide con la búsqueda."}</td></tr>):
               filtered.map(p=>(
                <tr key={p.id} className="border-b last:border-0 hover:bg-slate-50">
                  <td className="px-3 py-2.5 font-bold text-slate-900 whitespace-nowrap">{tName(p.tenant_id)}</td>
                  <td className="px-3 py-2.5 text-xs text-muted-foreground whitespace-nowrap">{fmtFechaCorta(p.fecha)}</td>
                  <td className="px-3 py-2.5 font-semibold text-emerald-700 whitespace-nowrap">{money(p.monto)}</td>
                  <td className="px-3 py-2.5 text-xs text-muted-foreground whitespace-nowrap">{p.periodo_desde?`${fmtFechaCorta(p.periodo_desde)} → ${fmtFechaCorta(p.periodo_hasta)}`:"—"}</td>
                  <td className="px-3 py-2.5 text-xs">{p.metodo||"—"}</td>
                  <td className="px-3 py-2.5 text-xs text-muted-foreground">{p.nota||"—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </Section>
  );
}

// ── MÓDULO LEADS (prospectos capturados desde la web pública) ──
function VLeads({G,showToast}){
  const [leads,setLeads]=useState([]);
  const [loading,setLoading]=useState(true);
  const [q,setQ]=useState("");
  const [fEstado,setFEstado]=useState("todos");
  const cargar=async()=>{setLoading(true);const {data,error}=await SB.listLeads();if(error)console.warn("No se pudieron cargar los leads:",error.message);setLeads(data||[]);setLoading(false);};
  useEffect(()=>{cargar();/* eslint-disable-next-line */},[]);
  const cambiarEstado=async(l,estado)=>{try{const {error}=await SB.updateLead(l.id,{estado});if(error)throw error;setLeads(ls=>ls.map(x=>x.id===l.id?{...x,estado}:x));}catch(e){showToast(e.message||"Error","err");}};
  const borrar=async(id)=>{try{const {error}=await SB.deleteLead(id);if(error)throw error;setLeads(ls=>ls.filter(x=>x.id!==id));showToast("Lead eliminado","warn");}catch(e){showToast(e.message||"Error","err");}};
  const norm=s=>(s||"").toString().toLowerCase();
  const filtered=leads.filter(l=>{
    if(q){const s=norm(q);if(!(norm(l.nombre).includes(s)||norm(l.email).includes(s)||norm(l.telefono).includes(s)))return false;}
    if(fEstado!=="todos"&&(l.estado||"nuevo")!==fEstado)return false;
    return true;
  });
  const nuevos=leads.filter(l=>(l.estado||"nuevo")==="nuevo").length;
  return(
    <Section>
      <PageHeader label="Web pública" title="Leads" icon={UserPlus} count={leads.length} countLabel="leads" subtitle={nuevos?`${nuevos} nuevos sin contactar`:"Prospectos que llegan desde tu web"}/>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/><Input value={q} onChange={e=>setQ(e.target.value)} placeholder="Buscar por nombre, email o teléfono…" className="pl-9 bg-white"/></div>
        <select value={fEstado} onChange={e=>setFEstado(e.target.value)} className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700">
          <option value="todos">Todos</option>
          <option value="nuevo">Nuevos</option>
          <option value="contactado">Contactados</option>
          <option value="descartado">Descartados</option>
        </select>
      </div>
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="bg-slate-900 text-white">{["Recibido","Nombre","Email","Teléfono","Mensaje","Estado",""].map(h=><th key={h} className="px-3 py-2.5 text-left font-semibold text-xs whitespace-nowrap">{h}</th>)}</tr></thead>
            <tbody>
              {loading?(<tr><td colSpan={7} className="px-3 py-8 text-center text-muted-foreground text-sm">Cargando…</td></tr>):
               filtered.length===0?(<tr><td colSpan={7} className="px-3 py-8 text-center text-muted-foreground text-sm">{leads.length===0?"Aún no llegan prospectos desde la web.":"Ningún lead coincide con la búsqueda."}</td></tr>):
               filtered.map(l=>(
                <tr key={l.id} className="border-b last:border-0 hover:bg-slate-50 align-top">
                  <td className="px-3 py-2.5 text-xs text-muted-foreground whitespace-nowrap">{(l.created_at||"").slice(0,10)}</td>
                  <td className="px-3 py-2.5 font-bold text-slate-900 whitespace-nowrap">{l.nombre||"—"}</td>
                  <td className="px-3 py-2.5 text-xs">{l.email||"—"}</td>
                  <td className="px-3 py-2.5 text-xs whitespace-nowrap">{l.telefono||"—"}</td>
                  <td className="px-3 py-2.5 text-xs text-muted-foreground max-w-[220px]">{l.mensaje||"—"}</td>
                  <td className="px-3 py-2.5">
                    <select value={l.estado||"nuevo"} onChange={e=>cambiarEstado(l,e.target.value)} className="h-8 rounded-md border border-slate-200 bg-white px-2 text-xs text-slate-700">
                      <option value="nuevo">Nuevo</option>
                      <option value="contactado">Contactado</option>
                      <option value="descartado">Descartado</option>
                    </select>
                  </td>
                  <td className="px-3 py-2.5"><button onClick={()=>borrar(l.id)} className="text-red-500 hover:text-red-700"><Trash2 size={14}/></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </Section>
  );
}

function PanelDueno({usuario,setUsuario,logout,G,rerender,recargar,showToast}){
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
            <div className="font-extrabold text-sm leading-none">TOMFIC</div>
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
              className={`flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm text-left transition-colors ${active?"bg-indigo-50 text-indigo-700 font-semibold":"text-slate-600 hover:bg-slate-50"}`}>
              <n.icon size={17} className={active?"text-indigo-600":"text-slate-400"}/> {n.label}
            </button>
          );})}
          <div className="mt-auto rounded-lg bg-slate-50 border border-slate-100 px-3 py-2.5">
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

// ─────────────────────────────────────────
// MÓDULO CAPTURADOR
// ─────────────────────────────────────────

// ─────────────────────────────────────────
// MÓDULO CAPTURADOR — v6
// ─────────────────────────────────────────
function ModCapturador({usuario,setUsuario,logout,G,rerender,recargar,showToast}){
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

  // Ajuste (−): resta unidades de un producto YA capturado, guardando una entrada negativa
  // (queda como registro auditable). Permite corregir hacia abajo sin borrar capturas.
  const guardarResta=()=>{
    if(!productoActivo||!miConteo||!miRonda)return;
    const cant=calcTotal(form);
    if(cant<=0)return showToast("Ingresa cuántas unidades restar","err");
    const totalAnt=getTotal(miConteo.id,miRonda,productoActivo.id);
    if(cant>totalAnt)return showToast(`Solo hay ${totalAnt} capturadas; no puedes restar ${cant}`,"err");
    if(miConteo.estado==="pendiente"){G.conteos=G.conteos.map(c=>c.id===miConteo.id?{...c,estado:"enCurso"}:c);}
    const key=`${miConteo.id}_${productoActivo.id}_${miRonda}_${ID()}`;
    G.capturas[key]={
      conteoId:miConteo.id,productoId:productoActivo.id,ronda:miRonda,
      ean:productoActivo.ean,codigo:productoActivo.codigo,nombre:productoActivo.nombre,
      referencia:productoActivo.referencia,categoria:productoActivo.categoria,
      subcategoria:productoActivo.subcategoria,subgrupo:productoActivo.subgrupo,
      saldo:productoActivo.saldo,costo:productoActivo.costo,
      proveedor:productoActivo.proveedor,nit:productoActivo.nit,
      cantidad:-cant,unidades:-(parseFloat(form.unidades)||0),
      cajas:parseFloat(form.cajas)||0,embalaje:parseFloat(form.embalaje)||0,
      estado:form.estado,obs:form.obs?("(ajuste) "+form.obs):"Ajuste: resta de unidades",
      usuario:usuario.nombre,fecha:TODAY(),hora:HOUR(),ajuste:true,
    };
    rerender();showToast(`➖ ${productoActivo.nombre} — restadas ${cant} und (queda ${totalAnt-cant})`);
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

  const modalSalirJSX=(
    <ConfirmDialog
      open={modalSalir}
      onOpenChange={setModalSalir}
      icon={LogOut}
      title="¿Cerrar sesión?"
      description="Vas a salir de TOMFIC. Tus capturas ya están guardadas en la nube."
      confirmText="Sí, salir"
      onConfirm={logout}
    />
  );

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
            <Package size={20} color="white"/>
            <span style={{fontWeight:800,fontSize:15}}>TOMFIC</span>
            {G.inventario&&<span style={{background:"#16a34a",fontSize:10,padding:"2px 10px",borderRadius:20,fontWeight:700}}>● {G.inventario.nombre}</span>}
          </div>
          <div style={{display:"flex",gap:10,alignItems:"center"}}>
            <button onClick={async()=>{await recargar();showToast("Actualizado ✓");}} style={{background:"transparent",border:"1px solid #334155",color:"#94a3b8",padding:"4px 10px",borderRadius:6,fontSize:11,cursor:"pointer",display:"flex",alignItems:"center"}}><RefreshCw size={13}/></button>
            <span style={{fontSize:11,color:"#94a3b8",display:"flex",alignItems:"center",gap:4}}><Users size={11}/> {usuario.nombre}</span>
            <button onClick={()=>setModalSalir(true)} style={{background:"#dc2626",border:"none",color:"white",padding:"6px 16px",borderRadius:8,fontSize:12,fontWeight:700,cursor:"pointer",display:"inline-flex",alignItems:"center",gap:4}}><LogOut size={13}/> Salir</button>
          </div>
        </div>
        <div style={{maxWidth:700,margin:"0 auto",padding:"20px 14px"}}>
          <h2 style={{margin:"0 0 16px",fontSize:20,fontWeight:700,color:"#0f172a"}}>Mis conteos asignados</h2>

          {/* Activos */}
          <div style={{marginBottom:20}}>
            <div style={{fontSize:11,fontWeight:700,color:"#374151",textTransform:"uppercase",letterSpacing:1,marginBottom:10}}>Activos / Pendientes</div>
            {activos.length===0?(
              <div style={{...card,padding:"20px 18px",color:"#64748b",textAlign:"center"}}>
                <div style={{marginBottom:8,display:"flex",justifyContent:"center"}}><FolderOpen size={32} color="#94a3b8"/></div>
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
                        <div style={{fontSize:11,color:"#64748b",marginTop:2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}><MapPin size={11} style={{display:"inline",marginRight:2}}/> {c.locLabel}</div>
                        <div style={{display:"flex",gap:6,marginTop:6,flexWrap:"wrap"}}>
                          <UIBadge className="border-transparent text-[10px] px-2 py-0.5" style={{background:rcol[r]+"22",color:rcol[r]}}>{rlbl[r]}</UIBadge>
                          {caps.length>0&&<UIBadge className="border-transparent text-[10px] px-2 py-0.5" style={{background:"#64748b22",color:"#64748b"}}>{new Set(caps.map(x=>x.productoId)).size} capturados</UIBadge>}
                          {!puedeIniciar&&<UIBadge className="border-transparent text-[10px] px-2 py-0.5" style={{background:"#94a3b822",color:"#94a3b8"}}>No disponible aún</UIBadge>}
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
                        <div style={{fontSize:11,color:"#94a3b8",marginTop:1}}><MapPin size={11} style={{display:"inline",marginRight:2}}/> {c.locLabel}</div>
                        <div style={{display:"flex",gap:6,marginTop:4}}>
                          <UIBadge className="border-transparent text-[10px] px-2 py-0.5" style={{background:"#64748b22",color:"#64748b"}}>{rlbl[r]}</UIBadge>
                          <UIBadge className="border-transparent text-[10px] px-2 py-0.5 gap-1" style={{background:"#16a34a22",color:"#16a34a"}}><Settings size={9}/> Cerrado</UIBadge>
                          <UIBadge className="border-transparent text-[10px] px-2 py-0.5" style={{background:"#64748b22",color:"#64748b"}}>{new Set(caps.map(x=>x.productoId)).size} productos</UIBadge>
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
            style={{background:"transparent",border:"1px solid #334155",color:"#94a3b8",padding:"4px 10px",borderRadius:6,fontSize:11,cursor:"pointer",display:"inline-flex",alignItems:"center",gap:3}}><ChevronLeft size={13}/> Mis conteos</button>
          <span style={{fontWeight:800,fontSize:15,color:"white"}}>TOMFIC</span>
          <span style={{background:rcol[miRonda],fontSize:10,padding:"2px 10px",borderRadius:20,fontWeight:700}}>{rlbl[miRonda]}</span>
        </div>
        <div style={{display:"flex",gap:10,alignItems:"center"}}>
          <button onClick={async()=>{await recargar();showToast("Actualizado ✓");}} title="Traer lo último de la nube" style={{background:"transparent",border:"1px solid #334155",color:"#94a3b8",padding:"4px 10px",borderRadius:6,fontSize:11,cursor:"pointer",display:"flex",alignItems:"center"}}><RefreshCw size={13}/></button>
          <span style={{fontSize:11,color:"#94a3b8",display:"flex",alignItems:"center",gap:4}}><Users size={11}/> {usuario.nombre}</span>
          {soyPrincipal(miConteo)&&<button onClick={()=>setModalCerrar(true)} style={{background:"#dc2626",color:"white",border:"none",padding:"6px 14px",borderRadius:8,cursor:"pointer",fontSize:12,fontWeight:700}}>Terminar conteo</button>}
          <button onClick={()=>setModalSalir(true)} style={{background:"#dc2626",border:"none",color:"white",padding:"6px 16px",borderRadius:8,fontSize:12,fontWeight:700,cursor:"pointer",display:"inline-flex",alignItems:"center",gap:4}}><LogOut size={13}/> Salir</button>
        </div>
      </div>

      <div style={{padding:"12px 14px",maxWidth:1000,margin:"0 auto"}}>
        {/* Info */}
        <div style={{background:"white",borderRadius:10,padding:"12px 16px",marginBottom:10,boxShadow:"0 1px 4px rgba(0,0,0,0.06)"}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr auto",gap:12,alignItems:"center"}}>
            <div>
              <div style={{fontWeight:700,fontSize:14,color:"#0f172a"}}>{miConteo.nombre}</div>
              <div style={{fontSize:12,color:"#64748b",marginTop:2,display:"flex",alignItems:"center",gap:4}}><MapPin size={11}/> {miConteo.locLabel}</div>
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
                    {est==="cerrado"&&<span style={{color:"#16a34a",fontSize:10,display:"flex",alignItems:"center"}}><Settings size={9}/></span>}
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
                <button onClick={()=>handleScan({key:"Enter"})} style={{padding:"9px 14px",background:rcol[miRonda],color:"white",border:"none",borderRadius:8,cursor:"pointer",fontWeight:700,fontSize:15,display:"inline-flex",alignItems:"center"}}><CornerDownLeft size={16}/></button>
                <button onClick={()=>setShowCam(true)} title="Escanear con cámara" style={{padding:"9px 14px",background:"white",color:rcol[miRonda],border:`2px solid ${rcol[miRonda]}`,borderRadius:8,cursor:"pointer",fontWeight:700,fontSize:15,display:"inline-flex",alignItems:"center"}}><Camera size={16}/></button>
              </div>
              {notFound&&<div style={{marginTop:6,color:"#dc2626",fontSize:12,fontWeight:600,display:"flex",alignItems:"center",gap:4}}><AlertTriangle size={12}/> Código no encontrado</div>}
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
                    <div style={{fontSize:11,color:"#94a3b8"}}>CÓD. BARRAS (EAN)</div>
                    <div style={{fontFamily:"monospace",fontSize:14,fontWeight:700,color:"#0f172a"}}>{productoActivo.ean||"—"}</div>
                  </div>
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
                {totalAnt>0&&miRonda!=="C3"&&<button onClick={guardarResta} disabled={total<=0} title="Restar unidades de lo ya capturado"
                  style={{padding:"10px 20px",background:total>0?"#ea580c":"#e2e8f0",color:total>0?"white":"#94a3b8",border:"none",borderRadius:8,cursor:total>0?"pointer":"not-allowed",fontWeight:700,fontSize:13,display:"inline-flex",alignItems:"center",gap:6}}>
                  <Minus size={15}/> RESTAR
                </button>}
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
                {["Código","Cód. barras","Nombre","Ref.","Total","Estado","Obs","Acciones"].map(h=>(
                  <th key={h} style={{padding:"7px 10px",textAlign:"left",fontWeight:700,color:"#374151",borderBottom:"1px solid #e2e8f0",fontSize:11}}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {capturasRealizadas.filter(({p})=>!busqCap||p.nombre.toLowerCase().includes(busqCap.toLowerCase())||p.codigo.toLowerCase().includes(busqCap.toLowerCase())).map(({p,caps,total:tot},i)=>(
                  <tr key={p.id} style={{background:i%2?"#f8fafc":"white",borderBottom:"1px solid #f1f5f9"}}>
                    <td style={{padding:"7px 10px",fontFamily:"monospace",color:"#2563eb",fontWeight:700,fontSize:11}}>{p.codigo}</td>
                    <td style={{padding:"7px 10px",fontFamily:"monospace",color:"#64748b",fontSize:11}}>{p.ean||"—"}</td>
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
                        style={{background:"#fef9c3",color:"#92400e",border:"1px solid #fde047",borderRadius:6,padding:"3px 10px",cursor:"pointer",fontWeight:700,fontSize:11,marginRight:4,display:"inline-flex",alignItems:"center",gap:3}}><Pencil size={10}/> Editar</button>
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
            <div style={{marginBottom:8,display:"flex",justifyContent:"center"}}><Camera size={36} color="#94a3b8"/></div>
            <div style={{fontSize:14,fontWeight:600}}>Escanea o busca un producto para comenzar</div>
            <div style={{fontSize:12,marginTop:4}}>{prods.length} productos disponibles</div>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={modalCerrar}
        onOpenChange={setModalCerrar}
        icon={CheckCircle}
        iconClassName="text-primary"
        iconBg="bg-blue-50"
        title="Terminar conteo"
        description="¿Estás seguro de que deseas terminar este conteo?"
        confirmText="Sí, terminar conteo"
        confirmVariant="default"
        onConfirm={cerrarConteo}
      />
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
    <button onClick={()=>setOpen(true)} style={{position:"fixed",bottom:24,right:24,width:52,height:52,borderRadius:99,background:"linear-gradient(135deg,#2563eb,#7c3aed)",color:"white",border:"none",cursor:"pointer",boxShadow:"0 4px 20px rgba(37,99,235,0.5)",zIndex:900,display:"flex",alignItems:"center",justifyContent:"center"}}>
      <FileText size={22}/>
      {notasInv.length>0&&<span style={{position:"absolute",top:-4,right:-4,background:"#dc2626",color:"white",borderRadius:99,fontSize:9,fontWeight:800,width:18,height:18,display:"flex",alignItems:"center",justifyContent:"center"}}>{notasInv.length}</span>}
    </button>
  );

  return(
    <div style={{position:"fixed",bottom:24,right:24,width:380,maxWidth:"95vw",background:"white",borderRadius:20,boxShadow:"0 20px 60px rgba(0,0,0,0.25)",zIndex:900,overflow:"hidden"}}>
      {/* Header */}
      <div style={{background:"linear-gradient(135deg,#2563eb,#7c3aed)",padding:"14px 18px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div style={{color:"white"}}>
          <div style={{fontWeight:800,fontSize:14,display:"flex",alignItems:"center",gap:6}}><FileText size={14}/> Notas del inventario</div>
          <div style={{fontSize:11,opacity:0.8}}>{G.inventario?.nombre||"Sin inventario activo"}</div>
        </div>
        <button onClick={()=>setOpen(false)} style={{background:"rgba(255,255,255,0.2)",border:"none",color:"white",width:28,height:28,borderRadius:99,cursor:"pointer",fontSize:14,display:"flex",alignItems:"center",justifyContent:"center"}}><X size={15}/></button>
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
              {(usuario.rol==="admin"||n.usuario===usuario.nombre)&&<button onClick={()=>eliminar(n.id)} style={{background:"none",border:"none",color:"#dc2626",cursor:"pointer",display:"inline-flex",alignItems:"center"}}><X size={14}/></button>}
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
                  <button onClick={()=>setFotos(fs=>fs.filter((_,j)=>j!==i))} style={{position:"absolute",top:-4,right:-4,width:16,height:16,background:"#dc2626",color:"white",border:"none",borderRadius:99,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}><X size={10}/></button>
                </div>
              ))}
            </div>
          )}
          <div style={{display:"flex",gap:8,marginTop:8}}>
            <label style={{padding:"7px 12px",background:"#f1f5f9",border:"1px solid #e2e8f0",borderRadius:8,cursor:"pointer",fontSize:12,fontWeight:600,color:"#374151",display:"inline-flex",alignItems:"center",gap:5}}>
              <Camera size={14}/> Foto<input type="file" accept="image/*" multiple onChange={agregarFoto} style={{display:"none"}}/>
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
function ModGerente({usuario,setUsuario,logout,G,rerender,recargar,showToast}){
  const [view,setView]=useState("resumen");
  const [modalSalir,setModalSalir]=useState(false);

  useEffect(()=>{
    const t=setInterval(()=>recargar(),15000);
    return()=>clearInterval(t);
  },[]);

  const nav=[
    {id:"resumen",icon:BarChart2,label:"Resumen"},
    {id:"notas",icon:FileText,  label:"Notas"},
    {id:"historial",icon:Landmark,label:"Historial"},
  ];

  const pct=G.conteos.length>0?Math.round(G.conteos.filter(c=>c.estado==="completado").length/G.conteos.length*100):0;
  const notasInv=G.notas.filter(n=>n.inventarioId===(G.inventario?.id||""));

  return(
    <div style={{minHeight:"100vh",background:"#f0f4f8",fontFamily:"system-ui,sans-serif"}}>
      {/* Topbar */}
      <div style={{background:"linear-gradient(135deg,#7c3aed 0%,#4f46e5 100%)",color:"white",padding:"0 20px",display:"flex",alignItems:"center",justifyContent:"space-between",height:58,position:"sticky",top:0,zIndex:100,boxShadow:"0 2px 12px rgba(0,0,0,0.25)"}}>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <div style={{width:32,height:32,background:"rgba(255,255,255,0.2)",borderRadius:9,display:"flex",alignItems:"center",justifyContent:"center"}}><Package size={18} color="white"/></div>
          <div>
            <div style={{fontWeight:800,fontSize:15,letterSpacing:-0.5}}>TOMFIC</div>
            <div style={{fontSize:9,color:"rgba(255,255,255,0.6)",letterSpacing:1,textTransform:"uppercase"}}>Vista Gerente</div>
          </div>
          {G.inventario&&<div style={{background:"rgba(255,255,255,0.15)",border:"1px solid rgba(255,255,255,0.25)",fontSize:11,padding:"3px 12px",borderRadius:20,fontWeight:700}}>● {G.inventario.nombre}</div>}
        </div>
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          <button onClick={async()=>{await recargar();showToast("Actualizado ✓");}} style={{background:"rgba(255,255,255,0.1)",border:"1px solid rgba(255,255,255,0.15)",color:"white",padding:"5px 12px",borderRadius:8,fontSize:11,cursor:"pointer"}}><RefreshCw size={11} style={{display:"inline",marginRight:4}}/> Sync</button>
          <div style={{display:"flex",alignItems:"center",gap:6,background:"rgba(255,255,255,0.1)",borderRadius:9,padding:"5px 10px"}}>
            <div style={{width:24,height:24,background:"linear-gradient(135deg,#7c3aed,#2563eb)",borderRadius:99,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700}}>{usuario.nombre[0]}</div>
            <span style={{fontSize:12,fontWeight:600}}>{usuario.nombre}</span>
          </div>
          <button onClick={()=>setModalSalir(true)} style={{background:"rgba(220,38,38,0.2)",border:"1px solid rgba(220,38,38,0.3)",color:"#fca5a5",padding:"6px 14px",borderRadius:8,fontSize:12,fontWeight:700,cursor:"pointer"}}>Salir</button>
        </div>
      </div>

      <div style={{display:"flex",height:"calc(100vh - 58px)",overflow:"hidden"}}>
        {/* Sidebar */}
        <div style={{width:160,background:"linear-gradient(180deg,#4f46e5,#7c3aed)",flexShrink:0,padding:"16px 8px",display:"flex",flexDirection:"column",gap:4,height:"100%",overflowY:"auto"}}>
          {nav.map(n=>{
            const active=view===n.id;
            return(
              <button key={n.id} onClick={()=>setView(n.id)}
                style={{width:"100%",display:"flex",alignItems:"center",gap:8,padding:"10px 12px",background:active?"rgba(255,255,255,0.2)":"transparent",color:"white",border:"none",cursor:"pointer",fontSize:13,borderRadius:10,fontWeight:active?700:400,opacity:active?1:0.7}}>
                <n.icon size={16}/><span>{n.label}</span>
              </button>
            );
          })}
        </div>

        {/* Contenido */}
        <div style={{flex:1,padding:24,overflowY:"auto"}}>
          <BannerVencimiento G={G}/>
          {view==="resumen"&&(
            <div>
              <PageHeader
                label="Vista Gerente"
                title={G.inventario?.nombre||"Sin inventario activo"}
                icon={BarChart2}
                subtitle={`Solo lectura · ${TODAY()}`}
                right={<div className="text-right"><div className="text-3xl font-extrabold leading-none">{pct}%</div><div className="text-[11px] text-white/80 mt-1">completado</div></div>}
              />
              {!G.inventario?(
                <div style={{textAlign:"center",padding:"48px 20px",background:"white",borderRadius:14,border:"2px dashed #e2e8f0",color:"#64748b"}}>
                  <div style={{display:"flex",justifyContent:"center",marginBottom:12}}><ClipboardList size={48} color="#94a3b8"/></div>
                  <div style={{fontSize:15,fontWeight:700}}>Sin inventario activo</div>
                </div>
              ):(
                <>
                  {/* KPIs */}
                  <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:12,marginBottom:16}}>
                    {[
                      {icon:Package,      l:"Productos",v:G.productos.length,c:"#2563eb",bg:"#eff6ff"},
                      {icon:ClipboardList,l:"Conteos",v:G.conteos.length,c:"#475569",bg:"#f8fafc"},
                      {icon:CheckCircle,  l:"Completados",v:G.conteos.filter(c=>c.estado==="completado").length,c:"#16a34a",bg:"#f0fdf4"},
                      {icon:AlertTriangle,l:"Diferencias",v:G.conteos.filter(c=>c.estado==="diferencia").length,c:"#dc2626",bg:"#fef2f2"},
                      {icon:FileText,     l:"Notas",v:notasInv.length,c:"#7c3aed",bg:"#faf5ff"},
                    ].map(s=>(
                      <div key={s.l} style={{background:s.bg,borderRadius:14,padding:"14px 16px",boxShadow:"0 1px 4px rgba(0,0,0,0.06)",border:`1px solid ${s.c}22`}}>
                        <s.icon size={20} color={s.c} style={{marginBottom:6}}/>
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
                              <td style={{padding:"10px 14px"}}>{c.usuarioC1?<span style={{background:["cerradoC1","cerradoC2","completado"].includes(c.estado)?"#f0fdf4":"#fffbeb",color:["cerradoC1","cerradoC2","completado"].includes(c.estado)?"#16a34a":"#d97706",borderRadius:6,padding:"2px 8px",fontSize:11,fontWeight:700}}>{["cerradoC1","cerradoC2","completado"].includes(c.estado)?"OK":"En curso"}</span>:"—"}</td>
                              <td style={{padding:"10px 14px",color:"#16a34a",fontWeight:600}}>{c.usuarioC2||"N/A"}</td>
                              <td style={{padding:"10px 14px"}}>{c.usuarioC2?<span style={{background:["cerradoC2","completado"].includes(c.estado)?"#f0fdf4":"#fffbeb",color:["cerradoC2","completado"].includes(c.estado)?"#16a34a":"#d97706",borderRadius:6,padding:"2px 8px",fontSize:11,fontWeight:700}}>{["cerradoC2","completado"].includes(c.estado)?"OK":"Pendiente"}</span>:"—"}</td>
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
              <PageHeader
                label="Observaciones"
                title="Notas del inventario"
                icon={FileText}
                count={notasInv.length}
                countLabel="notas"
              />
              {notasInv.length===0?(
                <div style={{textAlign:"center",padding:"48px 20px",background:"white",borderRadius:14,border:"2px dashed #e2e8f0",color:"#64748b"}}>
                  <div style={{display:"flex",justifyContent:"center",marginBottom:12}}><FileText size={48} color="#94a3b8"/></div>
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
              <PageHeader
                label="Inventarios"
                title="Historial"
                icon={Landmark}
                count={G.historial.length}
                countLabel="inventarios"
              />
              {G.historial.length===0?(
                <div style={{textAlign:"center",padding:"48px 20px",background:"white",borderRadius:14,border:"2px dashed #e2e8f0",color:"#64748b"}}>
                  <div style={{display:"flex",justifyContent:"center",marginBottom:12}}><Landmark size={48} color="#94a3b8"/></div>
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
                            <div style={{fontSize:11,fontWeight:700,color:"#94a3b8",marginBottom:8,textTransform:"uppercase",letterSpacing:0.5,display:"flex",alignItems:"center",gap:4}}><FileText size={10}/> {notasH.length} nota{notasH.length>1?"s":""}</div>
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
