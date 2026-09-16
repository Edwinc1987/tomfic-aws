import { useState, useEffect } from "react";
import { getDirty, getSyncing } from "@/lib/sync";

// Chip de estado de sincronización para el capturador: da confianza de que lo
// contado NO se pierde. Verde = todo en la nube · azul = guardando · ámbar = sin
// conexión (se guarda en este equipo y sube al reconectar). Lee el estado real
// de lib/sync (getDirty/getSyncing) + navigator.onLine, con un sondeo ligero.
export default function SyncStatus({ style = {} }) {
  const [online, setOnline] = useState(typeof navigator !== "undefined" ? navigator.onLine : true);
  const [, tick] = useState(0);
  useEffect(() => {
    const on = () => setOnline(true), off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    const id = setInterval(() => tick(n => (n + 1) % 1000000), 1200);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
      clearInterval(id);
    };
  }, []);

  let bg, color, dot, label, tip;
  if (!online) {
    bg = "#fffbeb"; color = "#b45309"; dot = "#f59e0b";
    label = "Sin conexión"; tip = "Sigues contando; se sincroniza al reconectar";
  } else if (getSyncing() || getDirty()) {
    bg = "#eff6ff"; color = "#1e40af"; dot = "#2563eb";
    label = "Guardando…"; tip = "Guardando en la nube…";
  } else {
    bg = "#f0fdf4"; color = "#166534"; dot = "#16a34a";
    label = "Sincronizado"; tip = "Todo guardado en la nube";
  }

  return (
    <span title={tip} style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 10.5, fontWeight: 700, padding: "4px 9px", borderRadius: 999, background: bg, color, whiteSpace: "nowrap", ...style }}>
      <span style={{ width: 7, height: 7, borderRadius: 99, background: dot, display: "inline-block", flexShrink: 0 }} />
      {label}
    </span>
  );
}
