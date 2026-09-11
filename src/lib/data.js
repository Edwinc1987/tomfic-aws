// ─────────────────────────────────────────
// data.js — helpers puros y constantes (sin dependencia de estado ni de React).
// Extraído de App.jsx (Fase 2.2a de la modularización). Riesgo cero: solo relocaliza.
// ─────────────────────────────────────────
import * as XLSX from "xlsx-js-style";
import { createClient } from "@supabase/supabase-js";

// Cliente Supabase (nube). Requiere VITE_SUPABASE_URL / VITE_SUPABASE_KEY en .env
export const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_KEY);

// --- Operaciones Supabase --- (movido de App.jsx en Fase 2.2b; SB no depende de G)
export const SB={
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
    const [u,inv,c]=await Promise.all([f("usuarios"),f("inventarios"),f("conteos")]);
     // Productos puede superar el límite de 1000 filas. Se cargan en páginas
     // concurrentes limitadas para no hacer 50.000 solicitudes secuenciales.
     let base=supabase.from("productos").select("*",{count:"exact",head:true});if(tid)base=base.eq("tenant_id",tid);
     const {count,error:countError}=await base;
     if(countError)throw countError;
     const TAM=1000,productos=[];
     for(let inicio=0;inicio<(count||0);inicio+=TAM*5){
       const paginas=await Promise.all(Array.from({length:5},(_,i)=>{
         const desde=inicio+i*TAM;if(desde>=(count||0))return null;
         let q=supabase.from("productos").select("*");if(tid)q=q.eq("tenant_id",tid);
         return q.range(desde,Math.min(desde+TAM-1,count-1));
       }).filter(Boolean));
       paginas.forEach(({data,error})=>{if(error)throw error;productos.push(...(data||[]));});
     }
    return {usuarios:u.data||[],productos,inventarios:inv.data||[],conteos:c.data||[]};
  },
  // Página de productos para tablas administrativas. No modifica G.productos.
  async listProductosPage({tenantId,inventarioId,page=1,pageSize=50,search="",categoria=""}){
    let q=supabase.from("productos").select("*",{count:"exact"});
    q=q.eq("tenant_id",tenantId).eq("inventario_id",inventarioId);
    if(categoria)q=q.eq("categoria",categoria);
    const term=String(search||"").trim().replace(/[%,()\\]/g," ");
    if(term)q=q.or(["nombre","codigo","ean"].map(col=>`${col}.ilike.%${term}%`).join(","));
    const from=Math.max(0,page-1)*pageSize;
    const {data,error,count}=await q.order("nombre",{ascending:true}).order("id",{ascending:true}).range(from,from+pageSize-1);
    return {data:data||[],count:count||0,error};
  },
  // Empresas (tenants)
  listTenants:()=>supabase.from("tenants").select("*").order("created_at",{ascending:false}),
  upsertTenant:(t)=>supabase.from("tenants").upsert(t,{onConflict:"id"}),
  upsertUsuario:(u)=>supabase.from("usuarios").upsert(u,{onConflict:"id"}),
  updateUsuario:(id,patch)=>supabase.from("usuarios").update(patch).eq("id",id),
  deleteUsuario:(id)=>supabase.from("usuarios").delete().eq("id",id),
   async upsertProductosBulk(prods,onProgress){for(let i=0;i<prods.length;i+=500){const lote=prods.slice(i,i+500);const{error}=await supabase.from("productos").upsert(lote,{onConflict:"id"});if(error)throw error;onProgress?.(Math.min(i+lote.length,prods.length),prods.length);await new Promise(resolve=>setTimeout(resolve,0));}},
  // SIEMPRE scopeado por empresa. Si no hay tenant, es un NO-OP: nunca un borrado global
  // (con RLS el dueño podría borrar productos de TODAS las empresas → se prohíbe de raíz).
  deleteAllProductos:(tid,invId)=>tid?supabase.from("productos").delete().eq("tenant_id",tid).eq("inventario_id",invId):Promise.resolve({data:null,error:null}),
  deleteAllProductosTenant:(tid)=>tid?supabase.from("productos").delete().eq("tenant_id",tid):Promise.resolve({data:null,error:null}),
  deleteProductosByIds:async(ids)=>{for(let i=0;i<ids.length;i+=200){const{error}=await supabase.from("productos").delete().in("id",ids.slice(i,i+200));if(error)throw error;}},
  upsertInventario:(inv)=>supabase.from("inventarios").upsert(inv,{onConflict:"id"}),
  upsertConteo:(c)=>supabase.from("conteos").upsert(c,{onConflict:"id"}),
  closeConteoRound:(id,ronda)=>supabase.rpc("close_count_round",{p_count_id:id,p_round:ronda}),
  reopenConteoRound:(id,ronda)=>supabase.rpc("reopen_count_round",{p_count_id:id,p_round:ronda}),
  deleteConteo:(id)=>supabase.from("conteos").delete().eq("id",id),
  deleteInventario:(id)=>supabase.from("inventarios").delete().eq("id",id),
  // Configuración global key/value (ej: contenido de la landing). Tabla: app_config(key text pk, value jsonb)
  getConfig:async(key)=>{try{const{data}=await supabase.from("app_config").select("value").eq("key",key).maybeSingle();return data?data.value:null;}catch(e){return null;}},
  setConfig:(key,value)=>supabase.from("app_config").upsert({key,value},{onConflict:"key"}),
};

export const TODAY = () => new Date().toLocaleDateString("es-CO");
export const HOUR  = () => new Date().toLocaleTimeString("es-CO");
// Sello de versión: sirve para saber si el navegador corre el código nuevo o uno
// en caché. Se muestra en el topbar del admin y se imprime en consola al cargar.
export const APP_VERSION = "2026-09-04a · rondas-atomicas";
export const ID    = () => Date.now().toString(36) + Math.random().toString(36).slice(2,5);
// Slug: minúsculas, sin acentos, [^a-z0-9]→'-'. DEBE coincidir con slugify() en el SQL.
export const slugify = (s) => (s||"").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/(^-|-$)/g,"");
// Email sintético de un miembro de empresa (capturador/gerente/admin migrado).
export const memberEmail = (nombre, slug) => `${slugify(nombre)}@${slugify(slug)}.tomfic.app`;

// --- Vencimiento de planes ---
// Fecha de hoy en ISO (YYYY-MM-DD) y días desde hoy hasta una fecha ISO (negativo = ya pasó).
export const ISO_HOY = () => new Date().toISOString().slice(0,10);
export const diasHasta = (iso) => iso ? Math.round((new Date(iso.slice(0,10)+"T00:00:00") - new Date(ISO_HOY()+"T00:00:00")) / 86400000) : null;
export const addDias = (iso, n) => { const d = new Date((iso||ISO_HOY()).slice(0,10)+"T00:00:00"); d.setDate(d.getDate()+n); return d.toISOString().slice(0,10); };
export const fmtFechaCorta = (iso) => { if(!iso) return "—"; const [y,m,d] = iso.slice(0,10).split("-"); return `${d}/${m}/${y}`; };
export const GRACIA_DIAS = 3; // días de gracia tras el vencimiento antes de bloquear el acceso del cliente
export const AVISO_DIAS  = 7; // días de anticipación con que se le avisa al cliente que su plan vence

// Exporta filas crudas a XLSX (encabezado + datos, sin filas de título). Sirve
// para plantillas y para importaciones externas como el ajuste de Siigo.
export const exportSheet = (rows, header, fname, sheetName = "Datos") => {
  const ws = XLSX.utils.aoa_to_sheet([header, ...rows]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, fname);
};
// Encabezados del formato "Importación de comprobante de ajuste" de Siigo.
export const SIIGO_AJUSTE_COLS = ["Código del producto (Obligatorio)", "Nombre del producto / Servicio", "Referencia de fábrica", "Aumenta/Disminuye (Obligatorio)", "Cantidad", "Costo Unitario"];

// Colores por categoría (reporte / badges).
export const CAT_C = {"CARNES FRIAS":"#dc2626","CONGELADOS":"#2563eb","SALSAS Y CONSERVAS":"#d97706","LACTEOS Y DERIVADOS":"#0891b2","REPOSTERIA":"#db2777","PANADERIA":"#c2410c","ADOBOS":"#65a30d","CHAMPIÑONES":"#78350f","ACEITES":"#92400e","HARINAS":"#ca8a04","PERECEDEROS":"#16a34a","APANADOS":"#7c2d12"};
export const catC = c => CAT_C[c?.trim()] || "#6b7280";

// Estilos base inline (se migran a Tailwind incrementalmente).
export const inp = {width:"100%",padding:"9px 12px",border:"1.5px solid #e2e8f0",borderRadius:8,fontSize:14,boxSizing:"border-box",outline:"none",background:"white",color:"#0f172a"};
export const card = {background:"white",borderRadius:14,padding:20,boxShadow:"0 2px 8px rgba(0,0,0,0.06)",border:"1px solid #f1f5f9"};

// Helpers movidos de App.jsx (Fase 3 de la modularización)
export const money=(n)=>"$"+Math.round(Number(n)||0).toLocaleString("es-CO");
export const HOY=()=>new Date().toISOString().slice(0,10);

// ─────────────────────────────────────────
// ESTADO GLOBAL + capa de datos (movido de App.jsx en Fase 2.2c).
// G es un singleton mutable: se muta por propiedades (G.x=...), nunca se reasigna
// entero, por eso `const` es seguro y funciona compartido entre módulos.
// ─────────────────────────────────────────
export const STORAGE_KEY = "tomfic_data_v1";
export const CONFIG_KEY  = "tomfic_config_v1";
const CACHE_DB = "tomfic_cache_v1";
const CACHE_STORE = "state";

export const G = {
  productos: [],
  usuarios: [
    {id:"u1",nombre:"ADMIN",pass:"admin123",rol:"admin",activo:true,creado:TODAY()},
    {id:"u2",nombre:"JUAN",pass:"123",rol:"capturador",activo:true,creado:TODAY()},
    {id:"u3",nombre:"MARIA",pass:"123",rol:"capturador",activo:true,creado:TODAY()},
    {id:"u4",nombre:"CARLOS",pass:"123",rol:"capturador",activo:true,creado:TODAY()},
  ],
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
  inventarios: [],
  _inventarioDatos: {},
  conteos: [],
  capturas: {},
  alertas: [],
  historial: [],
  notas: [],
  tenantId: null,
  tenant: null,
  tenants: [],
};

// --- Serialización ---
export const capsDeConteo=(cid)=>{const o={};Object.entries(G.capturas).forEach(([k,v])=>{if(v.conteoId===cid)o[k]=v;});return o;};
export const serConteo=(c,invId,capSource=G.capturas)=>({
  id:c.id, tenant_id:G.tenantId||null, inventario_id:invId||(G.inventario?G.inventario.id:"")||"",
  nombre:c.nombre||"", obs:c.obs||"", tipo:c.tipo||"",
  usuario_c1:c.usuarioC1||"", usuario_c2:c.usuarioC2||"", usuario_c3:c.usuarioC3||"",
  estado:c.estado||"", loc_label:c.locLabel||"", localizacion_id:c.locId||"",
  ubicacion:c.ubicacion||"", localizacion_tipo:c.localizacion||"", nro:c.nro||"",
  fecha_creacion:c.fechaCreacion||TODAY(),
  // Las rondas se cierran mediante close_count_round para evitar que una
  // sincronización posterior sobrescriba el cierre de otro usuario.
  capturas_data:JSON.stringify(Object.fromEntries(Object.entries(capSource||{}).filter(([,v])=>v.conteoId===c.id))),
});
export const deserConteo=(r)=>{
  const parseJson=(value,fallback)=>{try{return value?JSON.parse(value):fallback;}catch(e){return fallback;}};
  const rondas=parseJson(r.rondas_cerradas,[]);
  const c={id:r.id,nombre:r.nombre,obs:r.obs,tipo:r.tipo,usuarioC1:r.usuario_c1,usuarioC2:r.usuario_c2,usuarioC3:r.usuario_c3,estado:r.estado,locLabel:r.loc_label,locId:r.localizacion_id,ubicacion:r.ubicacion,localizacion:r.localizacion_tipo,nro:r.nro,fechaCreacion:r.fecha_creacion,rondasCerradas:rondas,c1Cerrado:r.c1_cerrado===true||r.c1_cerrado==="true"||rondas.includes("C1"),c2Cerrado:r.c2_cerrado===true||r.c2_cerrado==="true"||rondas.includes("C2"),c3Cerrado:r.c3_cerrado===true||r.c3_cerrado==="true"||rondas.includes("C3")};
  const caps=parseJson(r.capturas_data,{});
  return {c,caps};
};
export const serInv=(inv,estado)=>({
  id:inv.id,tenant_id:G.tenantId||null,nombre:inv.nombre||"",fecha:inv.fecha||"",estado,tipo:inv.tipo||"",obs:inv.obs||"",
  apertura:inv.apertura||"",hora_apertura:inv.horaApertura||"",usuario_apertura:inv.usuarioApertura||"",
  cierre:inv.cierre||"",hora_cierre:inv.horaCierre||"",usuario_cierre:inv.usuarioCierre||"",
  conteos_snapshot:inv.conteos?JSON.stringify(inv.conteos):null,
  capturas_snapshot:inv.capturas?JSON.stringify(inv.capturas):null,
  productos_snapshot:inv.productos?JSON.stringify(inv.productos):null,
  localizaciones_snapshot:inv.localizaciones?JSON.stringify(inv.localizaciones):null,
  ubicaciones_tipos_snapshot:inv.ubicacionesTipos?JSON.stringify(inv.ubicacionesTipos):null,
  localizacion_tipos_snapshot:inv.localizacionTipos?JSON.stringify(inv.localizacionTipos):null,
  notas_snapshot:inv.notas?JSON.stringify(inv.notas):null,
});
export const prodCols=(p,invId)=>({id:p.id,tenant_id:G.tenantId||null,inventario_id:invId||p.inventario_id||G.inventario?.id||null,ean:p.ean||"",codigo:p.codigo||"",nombre:p.nombre||"",referencia:p.referencia||"",categoria:p.categoria||"",subcategoria:p.subcategoria||"",subgrupo:p.subgrupo||"",determinada:p.determinada||"",localizacion:p.localizacion||"",ubicacion:p.ubicacion||"",observacion:p.observacion||"",saldo:p.saldo||0,costo:p.costo||0,nit:p.nit||"",proveedor:p.proveedor||""});
export const userCols=(u)=>({id:u.id,tenant_id:u.tenant_id||G.tenantId||null,inventario_id:u.inventario_id||null,nombre:u.nombre,pass:u.pass,rol:u.rol,activo:u.activo,creado:u.creado||TODAY(),correo:u.correo||"",telefono:u.telefono||"",cargo:u.cargo||"",turno:u.turno||"",zona:u.zona||"",obs:u.obs||""});

// --- Config local / dominio ---
export const cfgKey=()=>CONFIG_KEY+(G.tenantId?(":"+G.tenantId):"");
export const saveLocalConfig=()=>{try{localStorage.setItem(cfgKey(),JSON.stringify({localizaciones:G.localizaciones,ubicacionesTipos:G.ubicacionesTipos,localizacionTipos:G.localizacionTipos,alertas:G.alertas}));}catch(e){}};
export const loadLocalConfig=()=>{try{const raw=localStorage.getItem(cfgKey());if(!raw)return;const d=JSON.parse(raw);if(d.localizaciones)G.localizaciones=d.localizaciones;if(d.ubicacionesTipos&&d.ubicacionesTipos.length)G.ubicacionesTipos=d.ubicacionesTipos;if(d.localizacionTipos&&d.localizacionTipos.length)G.localizacionTipos=d.localizacionTipos;if(d.alertas)G.alertas=d.alertas;}catch(e){}};
export const DEF_UBIC_TIPOS=["BODEGA","SALA DE VENTAS"];
export const DEF_LOC_TIPOS=["MUEBLE","LINEAL","NEVERA","PUNTA","JAULA","CAVA"];
export const resetTenantConfig=()=>{G.localizaciones=[];G.ubicacionesTipos=[...DEF_UBIC_TIPOS];G.localizacionTipos=[...DEF_LOC_TIPOS];G.alertas=[];G.notas=[];};
// Fuente ÚNICA de verdad de "ronda cerrada": prioriza los flags/rondasCerradas
// (que pone el servidor al cerrar cada ronda); solo cae en el estado para datos viejos.
export const rondaCerrada=(c,ronda)=>{
  if(!c)return false;
  const flag=ronda==="C1"?c.c1Cerrado:ronda==="C2"?c.c2Cerrado:c.c3Cerrado;
  if(typeof flag==="boolean")return flag;
  const rc=c.rondasCerradas;
  if(Array.isArray(rc)&&rc.length)return rc.includes(ronda);
  // Legacy por estado (conteos viejos sin rondasCerradas): cerradoC2 antiguo = completo.
  if(ronda==="C1")return ["cerradoC1","cerradoC2","completado","diferencia","enC3"].includes(c.estado);
  if(ronda==="C2")return ["cerradoC2","completado","diferencia"].includes(c.estado);
  return c.estado==="completado";
};
// Un conteo está COMPLETO cuando cerró TODAS sus rondas requeridas. Ya NO se usa
// "cerradoC2" como sinónimo de completo (eso hacía que cerrar UNA ronda cerrara las dos).
export const conteoCompleto=(c)=>{
  if(!c||c.tipo==="ajuste")return false;
  if(c.tipo==="1conteo")return c.estado==="completado"||rondaCerrada(c,"C1");
  if(rondaCerrada(c,"C3")||c.estado==="completado")return true;
  if(c.estado==="diferencia"||c.estado==="enC3")return false; // ambas cerradas pero falta el desempate C3
  return rondaCerrada(c,"C1")&&rondaCerrada(c,"C2");
};
export const conteosReales=()=>G.conteos.filter(c=>c.tipo!=="ajuste");
export const conteoAjusteActivo=()=>G.conteos.find(c=>c.tipo==="ajuste")||null;
export const todosConteosCerrados=()=>{const r=conteosReales();return r.length>0&&r.every(conteoCompleto);};
export const finalAjustado=(prodCaps,sumFinal)=>{const a=prodCaps.filter(c=>c.ronda==="AJU");return a.length?a[a.length-1].cantidad:sumFinal;};
const openCache=()=>new Promise((resolve,reject)=>{
  if(typeof indexedDB==="undefined")return reject(new Error("IndexedDB no disponible"));
  const req=indexedDB.open(CACHE_DB,1);
  req.onupgradeneeded=()=>req.result.createObjectStore(CACHE_STORE);
  req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);
});
const cacheKey=(tenantId=G.tenantId)=>`${STORAGE_KEY}:${tenantId||"global"}`;
export const saveLocalCache=async()=>{try{const db=await openCache();await new Promise((resolve,reject)=>{const tx=db.transaction(CACHE_STORE,"readwrite");tx.objectStore(CACHE_STORE).put({tenantId:G.tenantId,productos:G.productos,usuarios:G.usuarios,inventario:G.inventario,inventarios:G.inventarios,conteos:G.conteos,capturas:G.capturas,historial:G.historial,savedAt:new Date().toISOString()},cacheKey());tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);});db.close();}catch(e){}};
export const loadLocalCache=async(tenantId=null)=>{try{const db=await openCache();const d=await new Promise((resolve,reject)=>{const tx=db.transaction(CACHE_STORE,"readonly");const req=tx.objectStore(CACHE_STORE).get(cacheKey(tenantId));req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});db.close();if(!d||d.tenantId!==(tenantId||null))return false;if(Array.isArray(d.productos))G.productos=d.productos;if(Array.isArray(d.usuarios)&&d.usuarios.length)G.usuarios=d.usuarios;if(d.inventario!==undefined)G.inventario=d.inventario;if(Array.isArray(d.inventarios))G.inventarios=d.inventarios;if(Array.isArray(d.conteos))G.conteos=d.conteos;if(d.capturas)G.capturas=d.capturas;if(Array.isArray(d.historial))G.historial=d.historial;if(d.tenantId)G.tenantId=d.tenantId;return true;}catch(e){return false;}};
export const clearLocalCache=async()=>{try{const db=await openCache();await new Promise((resolve,reject)=>{const tx=db.transaction(CACHE_STORE,"readwrite");tx.objectStore(CACHE_STORE).clear();tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);});db.close();}catch(e){}};

// Las vistas trabajan sobre el inventario seleccionado. Los demás inventarios
// abiertos permanecen aislados aquí para no mezclar sus conteos y capturas.
export const rememberSelectedInventory=()=>{
  if(!G.inventario)return;
  const prev=G._inventarioDatos[G.inventario.id]||{};
  G._inventarioDatos[G.inventario.id]={...prev,productos:G.productos,localizaciones:G.localizaciones,ubicacionesTipos:G.ubicacionesTipos,localizacionTipos:G.localizacionTipos,alertas:G.alertas,conteos:G.conteos,capturas:G.capturas};
};
export const selectInventory=(id)=>{
  rememberSelectedInventory();
  const inv=G.inventarios.find(i=>i.id===id)||null;
  G.inventario=inv;
  const datos=inv&&G._inventarioDatos[id];
  G.productos=datos?.productos||[];
  G.localizaciones=datos?.localizaciones||[];
  G.ubicacionesTipos=datos?.ubicacionesTipos||[];
  G.localizacionTipos=datos?.localizacionTipos||[];
  G.alertas=datos?.alertas||[];
  G.conteos=datos?.conteos||[];
  G.capturas=datos?.capturas||{};
};

// ─────────────────────────────────────────
// Análisis de un inventario (historial). getStInv es PURO: analiza un snapshot
// (objeto con `capturas` y `productos`) y devuelve totales, estados
// bueno/vencido/averiado, con diferencia y el resumen por producto.
// Movido de VHistorial (App.jsx) para que lo use también el dashboard del gerente.
// ─────────────────────────────────────────
export const nU=(n)=>(Math.round(n*100)/100).toLocaleString("es-CO");
export const getStInv=(inv)=>{
  const caps=Object.values(inv.capturas||{});
  const prods=inv.productos||[];
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

// KPIs de gerencia derivadas del análisis puro (getStInv). Centralizadas aquí
// para que el dashboard del historial (VHistorial) y el del gerente (ModGerente)
// muestren SIEMPRE la misma cifra — una sola verdad: exactitud, precisión C1=C2,
// cobertura y el ajuste separado en sobrante/faltante (unidades y valor).
export const getKPIsInv=(inv)=>{
  const st=getStInv(inv);
  const prods=inv.productos||[];
  const findP=(id)=>prods.find(x=>x.id===id);
  const analH=st.resumen.map(r=>{const p=findP(r.productoId);return{...r,dif:r.cantFinal-(p?.saldo||0)};});
  const coincide=st.resumen.filter(r=>{const p=findP(r.productoId);return p&&r.cantFinal===(p.saldo||0);}).length;
  const exactitud=st.contados?Math.round(coincide/st.contados*1000)/10:0;
  const cobertura=st.totalProductos?Math.round(st.contados/st.totalProductos*1000)/10:0;
  const noContados=prods.filter(p=>!st.resumen.some(r=>r.productoId===p.id));
  const es2=inv.tipo==="2conteos";
  const conC2=st.resumen.filter(r=>(r.totalC2||0)>0);
  const coincC1C2=conC2.filter(r=>(r.totalC1||0)===(r.totalC2||0)).length;
  const desempates=st.resumen.filter(r=>(r.totalC3||0)>0);
  const precision=conC2.length?Math.round(coincC1C2/conC2.length*1000)/10:0;
  let sobU=0,falU=0,sobV=0,falV=0;
  analH.forEach(a=>{const c=findP(a.productoId)?.costo||0;if(a.dif>0){sobU+=a.dif;sobV+=a.dif*c;}else if(a.dif<0){falU+=-a.dif;falV+=-a.dif*c;}});
  const hayCosto=st.totalFisico>0||st.totalSistema>0;
  return{st,analH,coincide,exactitud,cobertura,noContados,es2,conC2,coincC1C2,desempates,precision,sobU,falU,sobV,falV,hayCosto};
};
