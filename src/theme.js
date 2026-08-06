// ─────────────────────────────────────────────────────────────
// PALETA DE MARCA TOMFIC — fuente única de verdad de los colores.
//
// Hoy los colores viven como hex sueltos repetidos en cientos de estilos
// inline dentro de App.jsx. Este módulo centraliza la paleta para que el
// código NUEVO la use (import { C } from "@/theme") y para poder migrar los
// usos existentes de forma incremental. Cambiar la marca debería ser cambiar
// este archivo, no un buscar-y-reemplazar por todo el monolito.
//
// Nota de accesibilidad: sobre fondo BLANCO usa como mínimo `slate500` para
// texto (contraste 4.76:1, cumple WCAG AA). `slate400` solo pasa AA sobre los
// fondos OSCUROS (navy/gradiente del capturador y el sidebar del admin).
// ─────────────────────────────────────────────────────────────

export const C = {
  // Marca
  azul:   "#2563eb", // primario
  azulOsc:"#1e40af", // hover/gradiente del botón primario
  cian:   "#0891b2", // acento del wordmark (degradado cian→verde)
  verde:  "#16a34a", // éxito / conteo correcto / sobrante confirmado
  navy:   "#0f172a", // fondo oscuro (barras, panel de login)
  navy2:  "#1e293b", // segundo tono del gradiente oscuro

  // Semánticos
  rojo:      "#dc2626", // error / faltante / destructivo
  rojoScan:  "#f43f5e", // línea del escáner (solo en el logo de código de barras)
  ambar:     "#d97706", // advertencia / cerrado C1 / por vencer
  ambarOsc:  "#b45309",
  naranja:   "#ea580c", // acción secundaria (restar/ajuste −)

  // Ajuste / desempate (C3). Rol semántico propio: badge "AJUSTE", ronda C3,
  // botones del conteo de ajuste. Es intencional, no un desvío de marca.
  ajuste:    "#7c3aed", // morado
  ajusteBg:  "#faf5ff", // fondo suave morado
  ajusteTxt: "#4338ca", // texto sobre fondo morado claro

  // Grises (escala slate). Ver nota de accesibilidad arriba.
  slate900: "#0f172a",
  slate700: "#334155",
  slate600: "#475569",
  slate500: "#64748b", // texto secundario sobre BLANCO (mínimo AA)
  slate400: "#94a3b8", // texto secundario solo sobre fondos OSCUROS
  slate300: "#cbd5e1",
  slate200: "#e2e8f0", // bordes / botones deshabilitados
  slate100: "#f1f5f9",
  slate50:  "#f8fafc", // fondo de página claro

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
