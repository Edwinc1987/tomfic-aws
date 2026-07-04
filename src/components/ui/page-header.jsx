import * as React from "react"

/**
 * Header de página con el degradado azul oscuro de la marca.
 * Estilo unificado para todas las vistas (Conteos, Ubicaciones, Procesos, etc.).
 *
 * Props:
 *  - label: texto pequeño en mayúsculas (ej: "RONDAS")
 *  - title: título principal
 *  - subtitle: línea secundaria (opcional)
 *  - icon: componente lucide opcional (se muestra a la izquierda en un círculo)
 *  - count / countLabel: número grande a la derecha (opcional)
 *  - right: contenido custom a la derecha (sobreescribe count)
 */
export function PageHeader({ label, title, subtitle, icon: Icon, count, countLabel, right }) {
  return (
    <div className="mb-5 flex items-center justify-between gap-4 rounded-2xl bg-gradient-to-br from-slate-900 to-[#1e3a5f] px-6 py-5 text-white shadow-sm">
      <div className="flex items-center gap-4 min-w-0">
        {Icon && (
          <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
            <Icon size={24} className="text-white" />
          </div>
        )}
        <div className="min-w-0">
          {label && (
            <div className="text-[11px] font-semibold uppercase tracking-wider text-white/70 mb-1">{label}</div>
          )}
          <div className="text-xl font-bold tracking-tight leading-tight">{title}</div>
          {subtitle && <div className="text-xs text-white/80 mt-1 truncate">{subtitle}</div>}
        </div>
      </div>
      {right
        ? <div className="shrink-0">{right}</div>
        : count !== undefined && (
            <div className="text-right shrink-0">
              <div className="text-3xl font-extrabold leading-none">{count}</div>
              {countLabel && <div className="text-[11px] text-white/80 mt-1">{countLabel}</div>}
            </div>
          )}
    </div>
  )
}
