import { cn } from "@/lib/utils";

/**
 * StatTile — tarjeta de estadística estilo Linear.
 */
export function StatTile({ label, value, delta, deltaTone = "neutral", hint, icon, iconTone, className, detail, style }) {
  const deltaColor = {
    up: "text-emerald-600",
    down: "text-red-500",
    neutral: "text-slate-400",
  }[deltaTone];

  const iconColor = {
    brand: "text-blue-600",
    success: "text-emerald-600",
    warning: "text-amber-500",
    danger: "text-red-500",
    violet: "text-violet-500",
    info: "text-blue-500",
  }[iconTone] || "text-slate-400";

  const iconBg = {
    brand: "bg-blue-50",
    success: "bg-emerald-50",
    warning: "bg-amber-50",
    danger: "bg-red-50",
    violet: "bg-violet-50",
    info: "bg-blue-50",
  }[iconTone] || "bg-slate-50";

  return (
    <div style={style} className={cn(
      "rounded-lg border border-border-subtle bg-surface-raised p-4 transition-colors hover:border-border-strong",
      className
    )}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wider text-text-tertiary">
          {label}
        </p>
        {icon && (
          <span className={cn("grid place-items-center rounded-lg shrink-0 w-8 h-8", iconBg, iconColor)}>
            {icon}
          </span>
        )}
      </div>
      <p className="mt-2 text-2xl font-semibold text-text-primary tracking-tight tabular-nums">
        {value}
      </p>
      {detail && (
        <p className="mt-1 text-xs text-text-secondary">{detail}</p>
      )}
      {(delta != null || hint) && (
        <p className={cn("mt-1 text-xs flex items-center gap-1.5", deltaColor)}>
          {delta != null && <span>{delta}</span>}
          {hint && <span className="text-text-tertiary">{hint}</span>}
        </p>
      )}
    </div>
  );
}
