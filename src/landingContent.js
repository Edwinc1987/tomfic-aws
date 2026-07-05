// ─────────────────────────────────────────
// CONTENIDO DE LA LANDING (editable desde ADMIN → Página web)
// Se guarda en Supabase (tabla app_config, key='landing'). Estos son los
// valores por defecto que se usan si todavía no hay nada guardado.
// Los iconos/colores NO son editables: viven en Landing.jsx por índice.
// ─────────────────────────────────────────
export const DEFAULT_LANDING = {
  // Colores de la marca (editables desde el panel → Página web → Colores).
  theme: {
    primario: "#2563eb",   // color principal (botones, resaltados, acentos)
    secundario: "#0891b2", // color secundario (promo, detalles)
  },
  // Banner de promoción (editable desde el panel → Página web → Promociones).
  promo: {
    activo: false,
    texto: "",
  },
  hero: {
    badge: "100% en la nube · sincronización en tiempo real",
    title: "Toma de inventarios físicos,",
    titleHighlight: "sin caos.",
    subtitle:
      "TOMFIC organiza tus conteos por ubicación, coordina varios capturadores a la vez y te entrega las diferencias listas para exportar.",
    ctaPrimary: "Ingresar al sistema",
    ctaSecondary: "Ver cómo funciona",
  },
  about: {
    label: "Quiénes somos",
    title: "Hacemos que contar el inventario deje de ser un dolor de cabeza",
    p1: "TOMFIC nació para los equipos que hacen tomas físicas en bodegas y puntos de venta: donde antes había papeles, planillas sueltas y diferencias imposibles de rastrear, hoy hay un proceso claro, en la nube y en tiempo real.",
    p2: "Desde el primer conteo hasta el reporte final para contabilidad, todo queda registrado, organizado por ubicación y disponible para tu equipo.",
  },
  features: [
    { title: "Conteos por ubicación", desc: "Organiza la toma física por bodega, mueble, nevera o lineal. Cada conteo sabe exactamente dónde va." },
    { title: "Varios capturadores a la vez", desc: "Asigna C1, C2 y un tercer conteo de desempate. Todos capturan en paralelo, sin pisarse." },
    { title: "Captura con escáner o cámara", desc: "Escanea el código de barras o búscalo por nombre. Suma unidades, cajas y embalaje al instante." },
    { title: "Diferencias automáticas", desc: "El sistema compara C1 vs C2 y resalta los productos con diferencia para revisarlos al toque." },
    { title: "Reportes exportables", desc: "Diferencias, ajuste de inventario, sin conteo y captura completa — todo a Excel en un clic." },
    { title: "Historial permanente", desc: "Cada inventario cerrado queda guardado con sus valores, diferencias y notas para consultarlo cuando quieras." },
  ],
  steps: [
    { title: "Crea el inventario", desc: "Carga la base de productos desde Excel y abre una nueva toma física." },
    { title: "Asigna los conteos", desc: "Reparte ubicaciones entre tus capturadores y deja que cuenten desde su celular." },
    { title: "Revisa y exporta", desc: "Valida las diferencias, ajusta lo necesario y exporta los reportes para tu contabilidad." },
  ],
  planes: [
    {
      nombre: "Básico", precio: "$0", periodo: "/mes", destacado: false,
      desc: "Para empezar a ordenar tus tomas físicas.",
      items: ["1 administrador", "Conteos ilimitados", "Captura por código", "Exportar a Excel"],
    },
    {
      nombre: "Pro", precio: "$X", periodo: "/mes", destacado: true,
      desc: "Para equipos que cuentan en varios puntos.",
      items: ["Varios capturadores", "Roles (admin, capturador, gerente)", "Reportes de diferencias", "Historial permanente", "Notas con fotos"],
    },
    {
      nombre: "Empresa", precio: "A medida", periodo: "", destacado: false,
      desc: "Multi-sucursal y soporte dedicado.",
      items: ["Todo lo de Pro", "Múltiples sucursales", "Soporte prioritario", "Formatos contables a medida"],
    },
  ],
  contacto: {
    email: "soporte@tomfic.com",
    whatsapp: "+57 300 000 0000",
  },
};

// Combina el contenido guardado (posiblemente parcial) sobre los valores por defecto.
export function mergeLanding(saved) {
  const s = saved || {};
  return {
    theme: { ...DEFAULT_LANDING.theme, ...(s.theme || {}) },
    promo: { ...DEFAULT_LANDING.promo, ...(s.promo || {}) },
    hero: { ...DEFAULT_LANDING.hero, ...(s.hero || {}) },
    about: { ...DEFAULT_LANDING.about, ...(s.about || {}) },
    features: Array.isArray(s.features) && s.features.length ? s.features : DEFAULT_LANDING.features,
    steps: Array.isArray(s.steps) && s.steps.length ? s.steps : DEFAULT_LANDING.steps,
    planes: Array.isArray(s.planes) && s.planes.length ? s.planes : DEFAULT_LANDING.planes,
    contacto: { ...DEFAULT_LANDING.contacto, ...(s.contacto || {}) },
  };
}
