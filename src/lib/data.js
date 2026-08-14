// ─────────────────────────────────────────
// data.js — helpers puros y constantes (sin dependencia de estado ni de React).
// Extraído de App.jsx (Fase 2.2a de la modularización). Riesgo cero: solo relocaliza.
// ─────────────────────────────────────────
import * as XLSX from "xlsx";
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

export const TODAY = () => new Date().toLocaleDateString("es-CO");
export const HOUR  = () => new Date().toLocaleTimeString("es-CO");
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
