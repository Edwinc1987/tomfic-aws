import { cn } from "@/lib/utils";

/**
 * StatTile — tarjeta de indicador estilo capturas (Inventoros/Linear):
 * - blanca, borde 1px #E5E7EB, esquinas 12px, sombra mínima, padding 16px
 * - icono en cuadro 36px con fondo suave del mismo tono + icono fuerte
 * - título 14px/600 + subtítulo 12px #65758B
 * - número grande 30px/700 del color del tono (tabular-nums)
 * - acciones abajo (opcional): botones de ancho completo (primary + outline)
 */
const TONES = {
  brand:   { icon: "text-blue-600",    bg: "bg-blue-50",    value: "text-blue-600" },
  blue:    { icon: "text-blue-600",    bg: "bg-blue-50",    value: "text-blue-600" },
  success: { icon: "text-emerald-600", bg: "bg-emerald-50", value: "text-emerald-600" },
  green:   { icon: "text-emerald-600", bg: "bg-emerald-50", value: "text-[#16A34A]" },
  warning: { icon: "text-amber-600",   bg: "bg-amber-50",   value: "text-amber-600" },
  amber:   { icon: "text-[#D97706]",   bg: "bg-amber-50",   value: "text-[#D97706]" },
  danger:  { icon: "text-red-600",     bg: "bg-red-50",     value: "text-red-600" },
  red:     { icon: "text-[#DC2626]",   bg: "bg-red-50",     value: "text-[#DC2626]" },
  violet:  { icon: "text-violet-600",  bg: "bg-violet-50",  value: "text-violet-600" },
  purple:  { icon: "text-[#9333EA]",   bg: "bg-purple-50",  value: "text-[#9333EA]" },
  info:    { icon: "text-blue-500",    bg: "bg-blue-50",    value: "text-blue-500" },
  neutral: { icon: "text-slate-500",   bg: "bg-slate-100",  value: "text-text-primary" },
};

export function StatTile({ label, value, delta, deltaTone = "neutral", hint, icon, iconTone, className, detail, actions, style }) {
  const tone = TONES[iconTone] || TONES.neutral;
  const deltaColor = {
    up: "text-emerald-600",
    down: "text-red-500",
    neutral: "text-slate-400",
  }[deltaTone];

  return (
    <div style={style} className={cn(
      "rounded-xl border border-border-subtle bg-white p-4 shadow-sm dark:bg-surface-raised dark:border-border-subtle",
      className
    )}>
      {/* Cabecera: icono suave 36px + título + subtítulo */}
      <div className="flex items-center gap-3">
        {icon && (
          <span className={cn("grid place-items-center rounded-lg shrink-0 w-9 h-9", tone.bg, tone.icon)}>
            {icon}
          </span>
        )}
        <div className="min-w-0">
          {label && <p className="text-sm font-semibold text-text-primary leading-none">{label}</p>}
          {hint && <p className="mt-1 text-xs text-[hsl(214_28%_47%)] dark:text-text-secondary truncate">{hint}</p>}
        </div>
        {delta != null && (
          <span className={cn("ml-auto text-xs font-medium", deltaColor)}>{delta}</span>
        )}
      </div>
      {/* Número grande del color del tono */}
      <p className={cn("mt-3 text-[30px] font-bold leading-none tracking-tight tabular-nums", tone.value)}>
        {value}
      </p>
      {detail && (
        <p className="mt-1 text-xs text-text-secondary">{detail}</p>
      )}
      {/* Acciones de ancho completo (botón principal + outline con descarga) */}
      {actions && (
        <div className="mt-4 grid gap-2">
          {actions}
        </div>
      )}
    </div>
  );
}
