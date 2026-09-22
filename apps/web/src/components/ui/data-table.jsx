import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

/**
 * DataTable — tabla de datos estilo Linear, con paginación opcional.
 *
 * <DataTable
 *   columns={[{ key: "name", label: "Nombre" }, { key: "stock", label: "Stock", align: "right" }]}
 *   rows={productos}
 *   rowKey="id"
 * />
 *
 * Con paginación:
 * <DataTable rows={page} page={1} pageCount={5} onPageChange={fn} totalText="1-50 de 200" />
 */
export function DataTable({ columns = [], rows = [], rowKey = "id", onRowClick, loading, dense, emptyText = "Sin datos.", className, headerClassName, rowClassName, page, pageCount, onPageChange, totalText }) {
  const keyOf = (row, idx) => {
    if (typeof rowKey === "function") return rowKey(row);
    return row[rowKey] ?? idx;
  };

  const alignClass = (align) => ({
    right: "text-right",
    center: "text-center",
  }[align] || "text-left");

  const pad = dense ? "px-3 py-2" : "px-4 py-3";

  return (
    <div className={cn("w-full overflow-x-auto rounded-lg border border-border-subtle bg-surface-raised", className)}>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border-subtle">
            {columns.map((col) => (
              <th key={col.key}
                className={cn(
                  "font-medium text-text-secondary text-xs tracking-tight",
                  pad, alignClass(col.align), col.className, headerClassName
                )}
                style={col.width ? { width: col.width } : undefined}>
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-12 text-center">
                <div className="inline-flex items-center gap-2 text-sm text-text-tertiary">
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  Cargando…
                </div>
              </td>
            </tr>
          ) : rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-12 text-center">
                <p className="text-sm text-text-tertiary">{emptyText}</p>
              </td>
            </tr>
          ) : (
            rows.map((row, idx) => (
              <tr key={keyOf(row, idx)}
                onClick={() => onRowClick?.(row)}
                className={cn(
                  "border-b border-border-subtle last:border-b-0 transition-colors",
                  onRowClick ? "hover:bg-surface-overlay cursor-pointer" : "hover:bg-surface-overlay/60",
                  typeof rowClassName === "function" ? rowClassName(row) : rowClassName
                )}>
                {columns.map((col) => (
                  <td key={col.key}
                    className={cn(pad, alignClass(col.align), "text-text-primary", col.className)}>
                    {col.render ? col.render(row[col.key], row) : (row[col.key] ?? "—")}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
      {page != null && pageCount != null && (
        <div className="flex items-center justify-between gap-3 border-t border-border-subtle bg-surface-base px-4 py-2 text-xs text-text-secondary">
          <span>{totalText || ""}</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => onPageChange?.(page - 1)}>Anterior</Button>
            <span className="flex items-center px-1">Página {page} de {pageCount}</span>
            <Button variant="outline" size="sm" disabled={page >= pageCount} onClick={() => onPageChange?.(page + 1)}>Siguiente</Button>
          </div>
        </div>
      )}
    </div>
  );
}
