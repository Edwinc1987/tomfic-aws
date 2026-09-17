import { useEffect, useState } from "react";
import { reportsApi } from "../api/reportsApi";

export function ReportsPage({ tenantId, inventoryId }) {
  const [report, setReport] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    reportsApi.inventory(tenantId, inventoryId)
      .then(setReport)
      .catch(loadError => setError(loadError.message || "No se pudo cargar el reporte"));
  }, [tenantId, inventoryId]);

  const metric = report?.metrics;
  const cards = metric ? [
    ["Exactitud", `${metric.accuracyPercentage.toFixed(2)}%`],
    ["Diferencia unidades", metric.unitDifference],
    ["Diferencia monetaria", metric.monetaryDifference],
    ["Merma", metric.shrinkagePercentage === null ? "—" : `${metric.shrinkagePercentage.toFixed(2)}%`],
  ] : [];

  return <section className="space-y-4">
    <header><p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">Análisis</p><h1 className="text-2xl font-bold text-slate-900">Resultado de inventario</h1><p className="text-sm text-slate-500">Métricas calculadas en la API, listas para AnkaReport y Superset</p></header>
    {error && <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
    {metric && <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{cards.map(([label, value]) => <div key={label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><div className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{label}</div><div className="mt-1 text-2xl font-extrabold text-indigo-700">{value}</div></div>)}</div>}
    {report && <div className="overflow-x-auto rounded-lg border bg-white"><table className="w-full text-sm"><thead className="bg-slate-50 text-left text-xs text-slate-600"><tr>{["Código", "Producto", "Teórico", "Físico", "Diferencia", "Valor diferencia"].map(label => <th key={label} className="px-3 py-2">{label}</th>)}</tr></thead><tbody>{report.lines.slice(0, 100).map(line => <tr key={line.productId} className="border-t"><td className="px-3 py-2 font-mono">{line.code}</td><td className="px-3 py-2">{line.name}</td><td className="px-3 py-2">{line.theoretical}</td><td className="px-3 py-2">{line.physical}</td><td className="px-3 py-2">{line.difference}</td><td className="px-3 py-2">{line.differenceValue}</td></tr>)}</tbody></table></div>}
  </section>;
}
