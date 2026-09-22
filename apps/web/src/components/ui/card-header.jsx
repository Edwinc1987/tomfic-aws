import { cn } from "@/lib/utils";

/**
 * CardHeader — encabezado de card con título, subtítulo y acciones.
 *
 * <CardHeader title="Productos" subtitle="142 registros">
 *   <Button size="sm"><Plus/> Agregar</Button>
 * </CardHeader>
 */
export function CardHeader({ title, subtitle, children, className }) {
  return (
    <div className={cn("flex items-start justify-between gap-4 pb-4 border-b border-border-subtle", className)}>
      <div className="min-w-0">
        {title && (
          <h3 className="text-sm font-semibold text-text-primary tracking-tight">{title}</h3>
        )}
        {subtitle && (
          <p className="mt-0.5 text-xs text-text-secondary">{subtitle}</p>
        )}
      </div>
      {children && (
        <div className="flex items-center gap-2 shrink-0">{children}</div>
      )}
    </div>
  );
}
