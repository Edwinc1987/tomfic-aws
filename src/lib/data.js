// ─────────────────────────────────────────
// data.js — helpers puros y constantes (sin dependencia de estado ni de React).
// Extraído de App.jsx (Fase 2.2a de la modularización). Riesgo cero: solo relocaliza.
// ─────────────────────────────────────────
import * as XLSX from "xlsx";

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
