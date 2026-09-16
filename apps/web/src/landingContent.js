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
    badge: "100% en la nube · funciona aunque se caiga el internet",
    title: "Cuenta tu inventario y confía en",
    titleHighlight: "cada número.",
    subtitle:
      "TOMFIC organiza tus conteos por ubicación, coordina a varios capturadores a la vez y te muestra las diferencias explicadas en pantalla, listas para exportar. Deja de perder tiempo y dinero por descuadres que nadie explica.",
    ctaPrimary: "Crear cuenta gratis",
    ctaSecondary: "Ver cómo funciona",
  },
  about: {
    label: "Quiénes somos",
    title: "Hacemos que contar el inventario deje de ser un dolor de cabeza",
    p1: "TOMFIC nació para los equipos que hacen tomas físicas en bodegas y puntos de venta: donde antes había papeles, planillas sueltas y diferencias imposibles de rastrear, hoy hay un proceso claro, en la nube y en tiempo real.",
    p2: "Desde el primer conteo hasta el reporte final para contabilidad, todo queda registrado, organizado por ubicación y disponible para tu equipo.",
  },
  features: [
    { title: "Conteos por ubicación", desc: "Organiza la toma por bodega, mueble, nevera o lineal. Cada conteo sabe dónde va y quién lo hizo." },
    { title: "Varios capturadores a la vez", desc: "Asigna C1, C2 y un desempate C3. Todos cuentan en paralelo desde su móvil, sin pisarse." },
    { title: "Captura con escáner o cámara", desc: "Escanea el código de barras o búscalo por nombre. Suma unidades, cajas y embalaje al instante." },
    { title: "Diferencias automáticas", desc: "Compara C1 vs C2, resalta cada producto que no cuadra y separa lo que sobra de lo que falta." },
    { title: "Reportes en pantalla", desc: "Exactitud, diferencias, ajuste y captura: todo se ve y se filtra en pantalla, y se exporta a Excel o PDF en un clic." },
    { title: "Historial permanente", desc: "Cada inventario cerrado queda guardado con sus valores, diferencias y notas para consultarlo cuando quieras." },
  ],
  steps: [
    { title: "Crea el inventario", desc: "Sube tu base de productos desde Excel y abre una nueva toma física en minutos." },
    { title: "Asigna los conteos", desc: "Reparte ubicaciones entre tus capturadores y deja que cuenten desde su móvil, incluso sin señal." },
    { title: "Revisa y exporta", desc: "Valida las diferencias en pantalla, ajusta lo necesario y entrega el reporte listo para contabilidad." },
  ],
  // Casos de éxito: historias de clientes que contrataron el servicio (editable desde el panel).
  casos: [
    { nombre: "Juan Pérez", empresa: "Tienda Gourmet", historia: "Antes cerrábamos el inventario en dos días con planillas de papel. Con TOMFIC lo hacemos en una tarde y las diferencias salen solas para contabilidad." },
    { nombre: "María Gómez", empresa: "Distribuidora El Progreso", historia: "Poder tener varios capturadores contando al mismo tiempo, cada uno desde su celular, nos cambió la operación. Ya no se pisan ni se pierden hojas." },
  ],
  // Artículos / blog (editable desde el panel).
  articulos: [
    { titulo: "Cómo hacer una toma física sin errores", fecha: "Julio 2026", texto: "Planifica por ubicación, asigna capturadores y valida las diferencias antes de cerrar. Te contamos el paso a paso que usan los equipos ordenados." },
    { titulo: "3 señales de que tu inventario necesita orden", fecha: "Julio 2026", texto: "Diferencias que nadie explica, planillas sueltas y conteos que se repiten. Si te suena, es hora de digitalizar tu toma física." },
    { titulo: "Códigos de barras: por qué aceleran el conteo", fecha: "Julio 2026", texto: "Escanear en vez de escribir reduce errores y tiempo. Así funciona la captura con escáner o cámara en TOMFIC." },
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
    whatsapp: "+57 318 587 2017",
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
    casos: Array.isArray(s.casos) ? s.casos : DEFAULT_LANDING.casos,
    articulos: Array.isArray(s.articulos) ? s.articulos : DEFAULT_LANDING.articulos,
    planes: Array.isArray(s.planes) && s.planes.length ? s.planes : DEFAULT_LANDING.planes,
    contacto: { ...DEFAULT_LANDING.contacto, ...(s.contacto || {}) },
  };
}
