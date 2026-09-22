import { cn } from "@/lib/utils";

/**
 * StatTile — tarjeta de estadística estilo Linear.
 *
 * <StatTile label="Productos" value={142} delta="+12" deltaTone="up" hint="vs mes anterior" />
 */
export function StatTile({ label, value, delta, deltaTone = "neutral", hint, icon, iconTone, className }) {
  const deltaColor = {
    up: "text-emerald-600",
    down: "text-red-500",
    neutral: "text-slate-400",
  }[deltaTone];

  const iconColor = {
    brand: "text-blue-600",
    success: "text-emerald-600",
    warning: "text-amber-500",
    violet: "text-violet-500",
    info: "text-blue-500",
  }[iconTone] || "text-slate-400";

  return (
    <div className={cn(
      "rounded-lg border border-border-subtle bg-surface-raised p-4 transition-colors hover:border-border-strong",
      className
    )}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wider text-text-tertiary">
          {label}
        </p>
        {icon && (
          <span className={cn("shrink-0", iconColor)}>
            {icon}
          </span>
        )}
      </div>
      <p className="mt-2 text-2xl font-semibold text-text-primary tracking-tight tabular-nums">
        {value}
      </p>
      {(delta != null || hint) && (
        <p className={cn("mt-1 text-xs flex items-center gap-1.5", deltaColor)}>
          {delta != null && <span>{delta}</span>}
          {hint && <span className="text-text-tertiary">{hint}</span>}
        </p>
      )}
    </div>
  );
}
