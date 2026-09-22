// ─────────────────────────────────────────────────────────────
// PALETA DE MARCA TOMFIC — fuente de verdad de colores JS.
//
// Los colores hex de este archivo se usan en estilos inline donde
// Tailwind no es práctico (objetos de colores, comparaciones, etc).
//
// Para componentes Tailwind, usa las clases: bg-blue-600, text-slate-500, etc.
// Para CSS global, usa tokens: hsl(var(--accent)), hsl(var(--text-primary)).
//
// Para agregar un color nuevo:
//   1. Definirlo en design-tokens.css como variable CSS
//   2. Agregarlo aquí como fallback para JS
// ─────────────────────────────────────────────────────────────

export const C = {
  // Marca
  azul:   "#2563eb", // primario — equivale a --accent
  azulOsc:"#1e40af", // hover/gradiente del botón primario — equivale a --accent-hover
  cian:   "#0891b2", // acento del wordmark
  verde:  "#16a34a", // éxito / conteo correcto — equivale a --status-success
  navy:   "#0f172a", // fondo oscuro (barras, panel de login)
  navy2:  "#1e293b", // segundo tono del gradiente oscuro

  // Semánticos
  rojo:      "#dc2626", // error / faltante — equivale a --status-danger
  rojoScan:  "#f43f5e", // línea del escáner
  ambar:     "#d97706", // advertencia — equivale a --status-warning
  ambarOsc:  "#b45309",
  naranja:   "#ea580c", // acción secundaria

  // Ajuste / desempate (C3)
  ajuste:    "#7c3aed", // morado — equivale a --accent-alt
  ajusteBg:  "#faf5ff", // fondo suave morado — equivale a --accent-alt-soft
  ajusteTxt: "#4338ca", // texto sobre fondo morado claro

  // Grises (escala slate)
  slate900: "#0f172a",
  slate700: "#334155",
  slate600: "#475569",
  slate500: "#64748b", // texto secundario sobre BLANCO (mínimo WCAG AA)
  slate400: "#94a3b8", // texto secundario solo sobre fondos OSCUROS
  slate300: "#cbd5e1",
  slate200: "#e2e8f0", // bordes / botones deshabilitados — equivale a --border-subtle
  slate100: "#f1f5f9", // equivale a --surface-overlay
  slate50:  "#f8fafc", // fondo de página claro — equivale a --surface-canvas

  // Fondos de estado suaves
  azulBg:   "#eff6ff",
  verdeBg:  "#f0fdf4",
  rojoBg:   "#fef2f2",
  ambarBg:  "#fffbeb",
};

// Colores por ronda de conteo (C1 azul, C2 verde, C3 morado-ajuste).
export const RONDA_COLOR = { C1: C.azul, C2: C.verde, C3: C.ajuste };
export const RONDA_LABEL = { C1: "1er Conteo", C2: "2do Conteo", C3: "Desempate C3" };

export default C;
