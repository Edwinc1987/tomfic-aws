// ─────────────────────────────────────────
// data.js — helpers puros y constantes (sin dependencia de estado ni de React).
// Extraído de App.jsx (Fase 2.2a de la modularización). Riesgo cero: solo relocaliza.
// ─────────────────────────────────────────
import * as XLSX from "xlsx-js-style";

// --- Adaptador API AWS (reemplaza Supabase) ---
import { apiRequest } from "@/core/network/apiClient";
const _h=(tid,role)=>({"x-tenant-id":tid||G.tenantId||"tenant-demo-a","x-user-role":role||"ADMIN"});
const _api={
  me:()=>apiRequest("/v1/users/me"),
  loadUsuarios:async(tid)=>{const r=await apiRequest("/v1/users",{headers:_h(tid)});const arr=Array.isArray(r)?r:r?.data||[];return{data:arr.map(u=>({id:u.id,nombre:u.name,correo:u.email,telefono:u.phone||"",rol:(u.role||"").toLowerCase(),activo:u.active!==false,inventario_id:u.inventoryId||null}))};},
  createMember:(nombre,pass,rol,correo,telefono,inventoryId)=>{const roleMap={capturador:"CAPTURER",admin:"ADMIN",gerente:"MANAGER",comercial:"COMMERCIAL"};const body={name:nombre,email:correo,role:roleMap[rol]||rol?.toUpperCase()||"CAPTURER",password:pass};if(inventoryId)body.inventoryId=inventoryId;return apiRequest("/v1/users",{method:"POST",headers:_h(),body});},
  resetMemberPassword:()=>Promise.resolve({error:null}),
  deleteMember:(id)=>apiRequest(`/v1/users/${id}`,{method:"DELETE",headers:_h()}),
  setMemberActive:(id,activo)=>apiRequest(`/v1/users/${id}`,{method:"PATCH",headers:_h(),body:{active:activo}}),
  setTenantActive:(tid,activo)=>apiRequest(`/v1/tenants/${tid}/active`,{method:"PATCH",headers:_h(tid,"OWNER"),body:{active:activo}}),
  deleteTenant:(tid)=>apiRequest(`/v1/tenants/${tid}`,{method:"DELETE",headers:_h(tid,"OWNER")}),
  updateTenant:(tid,patch)=>apiRequest(`/v1/tenants/${tid}`,{method:"PATCH",headers:_h(tid,"OWNER"),body:patch}),
  listTenants:()=>apiRequest("/v1/tenants"),
  listPagos:async(tid)=>{try{const r=await apiRequest(`/v1/tenants/${tid}/payments`);return{data:r||[],error:null};}catch(e){return{data:[],error:e};}},
  listAllPagos:async()=>{try{const ts=await apiRequest("/v1/tenants");const all=[];for(const t of ts){const p=await apiRequest(`/v1/tenants/${t.id}/payments`);(p||[]).forEach(x=>all.push({...x,tenant_id:t.id}));}return{data:all,error:null};}catch(e){return{data:[],error:e};}},
  insertPago:(row)=>apiRequest(`/v1/tenants/${row.tenant_id}/payments`,{method:"POST",headers:_h(row.tenant_id),body:row}),
  deletePago:async(id)=>{const ts=await apiRequest("/v1/tenants").catch(()=>[]);for(const t of ts){try{await apiRequest(`/v1/tenants/${t.id}/payments/${id}`,{method:"DELETE",headers:_h(t.id)});return{};}catch(e){}}return{};},
  listLeads:()=>apiRequest("/v1/leads"),
  updateLead:(id,body)=>apiRequest(`/v1/leads/${id}`,{method:"PATCH",headers:_h(),body}),
  deleteLead:(id)=>apiRequest(`/v1/leads/${id}`,{method:"DELETE",headers:_h()}),
  capturarLead:(nombre,email,telefono,mensaje)=>apiRequest("/v1/leads",{method:"POST",body:{name:nombre,email,phone:telefono,message:mensaje}}),
  registerTenant:()=>Promise.resolve({data:null,error:new Error("Usa Cognito para registrar empresas")}),
  getConfig:async(key)=>{try{return await apiRequest(`/v1/config/${encodeURIComponent(key)}`);}catch(e){return null;}},
  setConfig:(key,value)=>apiRequest(`/v1/config/${encodeURIComponent(key)}`,{method:"PUT",headers:_h(),body:{value}}),
  loadMyProfile:async(uid)=>{
    try{const r=await apiRequest("/v1/users/me");return{data:r};}catch(e){return{data:null,error:e};}
  },
  loadTenant:async(tid)=>{
    try{const r=await apiRequest(`/v1/tenants/${tid}`);return{data:r};}catch(e){return{data:null,error:e};}
  },
  loadAll:async(tid)=>{
    const invsRaw=await apiRequest("/v1/inventories",{headers:_h(tid)}).catch(()=>[]);
    const invs=(Array.isArray(invsRaw)?invsRaw:[]).map(i=>{
      const meta=i.meta||i.snapshotsJson?.meta||{};
      return{
        id:i.id,
        nombre:i.name||i.nombre||"",
        tipo:i.tipo||"2conteos",
        obs:meta.obs??i.obs??"",
        fecha:meta.fecha??i.fecha??"",
        apertura:meta.apertura??i.apertura??"",
        horaApertura:meta.horaApertura??meta.hora_apertura??i.horaApertura??i.hora_apertura??"",
        usuarioApertura:meta.usuarioApertura??meta.usuario_apertura??i.usuarioApertura??i.usuario_apertura??"",
        estado:i.status==="OPEN"?"abierto":"cerrado",
        status:i.status||"OPEN",
      };
    });
    const firstInvId=(invs&&invs[0]?.id)||"";
    const counts=await apiRequest(`/v1/counts?inventoryId=${firstInvId}`,{headers:_h(tid)}).catch(()=>[]);
    const allProds=[];
    for(let pg=1;pg<=50;pg++){
      const r=await apiRequest(`/v1/products?inventoryId=${firstInvId}&page=${pg}&pageSize=500`,{headers:_h(tid)}).catch(()=>null);
      const items=Array.isArray(r)?r:r?.items||[];
      allProds.push(...items);
      const total=Number(r?.total||0);
      if(!items.length||(total>0&&allProds.length>=total))break;
    }
    const prods=allProds;
    const capturas={};
    if(Array.isArray(counts)){
      for(const c of counts){
        try{
          const caps=await apiRequest(`/v1/captures/by-count/${c.id}`,{headers:_h(tid)});
          if(Array.isArray(caps))caps.forEach(cap=>{if(cap.key)capturas[cap.key]=cap;});
        }catch(e){}
      }
    }
    return{usuarios:[],productos:Array.isArray(prods)?prods:prods?.items||[],inventarios:invs,conteos:Array.isArray(counts)?counts:[],capturas};
  },
  listProductosPage:async({tenantId,inventarioId,page=1,pageSize=50,search=""})=>{
    try{
      const r=await apiRequest(`/v1/products?inventoryId=${encodeURIComponent(inventarioId)}&page=${page}&pageSize=${pageSize}&search=${encodeURIComponent(search)}`,{headers:_h(tenantId)});
      return{data:Array.isArray(r)?r:r?.items||[],count:Number(r?.total||0),error:null};
    }catch(error){
      return{data:[],count:0,error};
    }
  },
  upsertTenant:()=>Promise.resolve({error:null}),
  upsertUsuario:()=>Promise.resolve({error:null}),
  updateUsuario:(id,body)=>{const mapped={};if(body.rol!==undefined){const rm={capturador:"CAPTURER",admin:"ADMIN",gerente:"MANAGER",comercial:"COMMERCIAL"};mapped.role=rm[body.rol]||body.rol?.toUpperCase()||body.rol;}if(body.correo!==undefined)mapped.email=body.correo;if(body.telefono!==undefined)mapped.phone=body.telefono;if(body.active!==undefined)mapped.active=body.active;if(body.inventario_id!==undefined)mapped.inventoryId=body.inventario_id;return apiRequest(`/v1/users/${id}`,{method:"PATCH",headers:_h(),body:mapped});},
  deleteUsuario:(id)=>apiRequest(`/v1/users/${id}`,{method:"DELETE",headers:_h()}),
  upsertProductosBulk:async(prods,progressCb)=>{const backendProds=prods.map(p=>({id:p.id,tenantId:p.tenantId||p.tenant_id||G.tenantId||"",inventoryId:p.inventoryId||p.inventario_id||G.inventario?.id||"",code:p.code||p.codigo||"",barcode:p.barcode||p.ean||"",name:p.name||p.nombre||"",supplier:p.supplier||p.proveedor||"",balance:Number(p.balance||p.saldo||0),cost:Number(p.cost||p.costo||0)}));const BATCH=200;let total=0;for(let i=0;i<backendProds.length;i+=BATCH){const chunk=backendProds.slice(i,i+BATCH);const r=await apiRequest("/v1/products/bulk",{method:"POST",headers:_h(),body:{products:chunk}});total+=(r?.count||0);if(progressCb)progressCb(total,backendProds.length);}return{count:total};},
  deleteAllProductos:async(tid,invId)=>{const r=await apiRequest(`/v1/products/all?inventoryId=${invId}`,{method:"DELETE",headers:_h(tid)});return{data:null,error:null,count:r?.count||0};},
  deleteAllProductosTenant:async(tid)=>{const r=await apiRequest("/v1/products/all",{method:"DELETE",headers:_h(tid)});return{data:null,error:null,count:r?.count||0};},
  deleteProductosByIds:async(ids)=>{const r=await apiRequest("/v1/products/by-ids",{method:"DELETE",headers:_h(),body:{ids}});return{count:r?.count||0};},
  upsertInventario:async(inv)=>{
    if(!inv?.id)return{error:null};
    const body={
      name:inv.nombre||inv.name||"",
      tipo:inv.tipo||"2conteos",
      meta:{
        fecha:inv.fecha||"",
        obs:inv.obs||"",
        apertura:inv.apertura||"",
        horaApertura:inv.horaApertura||inv.hora_apertura||"",
        usuarioApertura:inv.usuarioApertura||inv.usuario_apertura||"",
        cierre:inv.cierre||"",
        horaCierre:inv.horaCierre||inv.hora_cierre||"",
        usuarioCierre:inv.usuarioCierre||inv.usuario_cierre||"",
      },
    };
    try{
      await apiRequest(`/v1/inventories/${inv.id}`,{method:"PATCH",headers:_h(),body});
    }catch(e){
      if(e.status===404||e.status===400||e.status===500){
        try{await apiRequest("/v1/inventories",{method:"POST",headers:_h(),body:{...body,id:inv.id}});}
        catch(e2){console.warn("upsertInventario create fallback:",e2.message||e2);}
      }else throw e;
    }
    return{error:null};
  },
  closeInventario:async(id,snapshots)=>{await apiRequest(`/v1/inventories/${id}/close`,{method:"POST",headers:_h(),body:{snapshots}});return{error:null};},
  listClosedInventories:async()=>{return apiRequest("/v1/inventories/closed",{headers:_h()});},
  upsertConteo:async(c)=>{
    const body={inventoryId:c.inventoryId||G.inventario?.id||"",name:c.nombre||c.name||"",location:c.location||c.ubicacion||"",locLabel:c.locLabel||"",tipo:c.tipo||"2conteos",rounds:c.rounds||["C1","C2"]};
    return apiRequest("/v1/counts",{method:"POST",headers:_h(),body});
  },
  closeConteoRound:(id,ronda)=>apiRequest(`/v1/counts/${id}/rounds/${ronda}/close`,{method:"POST",headers:_h()}),
  reopenConteoRound:(id,ronda)=>apiRequest(`/v1/counts/${id}/rounds/${ronda}/reopen`,{method:"POST",headers:_h()}),
  assignConteoRound:(id,ronda,userId)=>apiRequest(`/v1/counts/${id}/rounds/${ronda}/assign`,{method:"POST",headers:_h(),body:{userId}}),
  deleteConteo:async(id)=>{await apiRequest(`/v1/counts/${id}`,{method:"DELETE",headers:_h()});return{error:null};},
  deleteInventario:async(id)=>{await apiRequest(`/v1/inventories/${id}`,{method:"DELETE",headers:_h()});return{error:null};},
};

// --- Operaciones API --- (reemplazado de Supabase a NestJS)
export const SB=_api;

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
  id:inv.id,tenant_id:G.tenantId||null,nombre:inv.nombre||inv.name||"",fecha:inv.fecha||"",estado,tipo:inv.tipo||"",obs:inv.obs||"",
  apertura:inv.apertura||"",hora_apertura:inv.horaApertura||inv.hora_apertura||"",usuario_apertura:inv.usuarioApertura||inv.usuario_apertura||"",
  cierre:inv.cierre||"",hora_cierre:inv.horaCierre||inv.hora_cierre||"",usuario_cierre:inv.usuarioCierre||inv.usuario_cierre||"",
  conteos_snapshot:inv.conteos?JSON.stringify(inv.conteos):null,
  capturas_snapshot:inv.capturas?JSON.stringify(inv.capturas):null,
  productos_snapshot:inv.productos?JSON.stringify(inv.productos):null,
  localizaciones_snapshot:inv.localizaciones?JSON.stringify(inv.localizaciones):null,
  ubicaciones_tipos_snapshot:inv.ubicacionesTipos?JSON.stringify(inv.ubicacionesTipos):null,
  localizacion_tipos_snapshot:inv.localizacionTipos?JSON.stringify(inv.localizacionTipos):null,
  notas_snapshot:inv.notas?JSON.stringify(inv.notas):null,
});
export const prodCols=(p,invId)=>{
  const base={id:p.id,ean:p.ean||"",codigo:p.codigo||"",nombre:p.nombre||"",referencia:p.referencia||"",categoria:p.categoria||"",subcategoria:p.subcategoria||"",subgrupo:p.subgrupo||"",determinada:p.determinada||"",localizacion:p.localizacion||"",ubicacion:p.ubicacion||"",observacion:p.observacion||"",saldo:p.saldo||0,costo:p.costo||0,nit:p.nit||"",proveedor:p.proveedor||""};
  base.tenant_id=G.tenantId||null;base.inventario_id=invId||p.inventario_id||G.inventario?.id||null;
  return base;
};
export const toBackendProduct=(p,invId)=>({id:p.id,tenantId:G.tenantId||p.tenant_id||"",inventoryId:invId||p.inventario_id||G.inventario?.id||"",code:p.codigo||p.code||"",barcode:p.ean||p.barcode||"",name:p.nombre||p.name||"",supplier:p.proveedor||p.supplier||"",balance:Number(p.saldo||p.balance||0),cost:Number(p.costo||p.cost||0)});
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
  const rc=c.rondasCerradas;
  if(Array.isArray(rc)&&rc.length)return rc.includes(ronda); // arreglo no vacío = autoritativo (cierre y reapertura lo actualizan)
  const flag=ronda==="C1"?c.c1Cerrado:ronda==="C2"?c.c2Cerrado:c.c3Cerrado;
  if(typeof flag==="boolean")return flag;
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
