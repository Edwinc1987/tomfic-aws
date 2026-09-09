import { useState } from "react";
import { Search, Download } from "lucide-react";

// Grid de reporte en pantalla, estilo ERP (jerarquía por categoría + subtotales +
// Total general). Usa las MISMAS definiciones de columnas que el Excel (reporteXLSX),
// así la pantalla y el archivo descargado quedan idénticos.
// columns: [{key,label,type:'text'|'num'|'money'|'estado',colorSign,subtotal:false,total:false}]
const NUM = new Set(["num", "money"]);

export function ReporteGrid({ title, meta, columns, rows, groupBy, nameKey = "nombre", onExport }) {
  const [q, setQ] = useState("");
  const nq = q.trim().toLowerCase();
  const rowsF = nq
    ? rows.filter(r => [r.codigo, r.nombre, r.ean].some(v => String(v || "").toLowerCase().includes(nq)))
    : rows;

  const sum = (arr, key) => arr.reduce((s, r) => s + (Number(r[key]) || 0), 0);

  const groups = {};
  if (groupBy) rowsF.forEach(r => { const k = r[groupBy] || "Sin categoría"; (groups[k] = groups[k] || []).push(r); });
  const groupKeys = Object.keys(groups).sort((a, b) => a.localeCompare(b));

  const fmt = (v, c) => {
    if (v === "" || v === undefined || v === null) return "";
    const n = Number(v) || 0;
    if (c.type === "money") return (n < 0 ? "−$" : "$") + Math.abs(Math.round(n)).toLocaleString("es-CO");
    const r = Math.round(n * 100) / 100;
    return (n < 0 ? "−" : (c.colorSign && n > 0 ? "+" : "")) + Math.abs(r).toLocaleString("es-CO");
  };
  const color = (v, c) => { if (!c.colorSign) return undefined; const n = Number(v) || 0; return n < 0 ? "#dc2626" : (n > 0 ? "#2563eb" : "#64748b"); };
  const align = c => NUM.has(c.type) ? "right" : "left";

  const numCols = columns.filter(c => NUM.has(c.type));
  const conDif = groupBy ? rowsF.length : rowsF.length;

  const th = "px-3 py-2 text-[11px] font-semibold text-slate-500 whitespace-nowrap border-b border-slate-200 border-r border-slate-100 last:border-r-0 bg-slate-50";
  const td = "px-3 py-1.5 text-[12.5px] whitespace-nowrap border-b border-slate-100 border-r border-slate-100 last:border-r-0";

  const cellContent = (c, r, kind, extra) => {
    if (c.key === "__nivel") return kind === "grp" ? "Categoría" : kind === "tot" ? "Total general" : <span className="text-slate-400 text-[11.5px]">Producto</span>;
    if (kind === "grp") {
      if (c.key === "codigo") return extra.gi;
      if (c.key === nameKey) return <b>{extra.gname}</b>;
      if (NUM.has(c.type) && c.subtotal !== false) return <b style={{ color: color(extra.sub[c.key], c) }}>{fmt(extra.sub[c.key], c)}</b>;
      return "";
    }
    if (kind === "tot") {
      if (NUM.has(c.type) && c.total !== false) return <b style={{ color: color(extra.tot[c.key], c) }}>{fmt(extra.tot[c.key], c)}</b>;
      return "";
    }
    // detalle
    if (c.key === "codigo") return <span className="font-semibold" style={{ color: "#2563eb" }}>{r.codigo}</span>;
    if (c.type === "estado") { const e = r[c.key] || ""; return e ? <span className="inline-block rounded-full px-2 py-0.5 text-[10.5px] font-bold" style={{ background: /VENC|AVER|NO APTO/i.test(e) ? "#fef2f2" : "#f0fdf4", color: /VENC|AVER|NO APTO/i.test(e) ? "#991b1b" : "#166534" }}>{e}</span> : "—"; }
    if (NUM.has(c.type)) return <span style={{ color: color(r[c.key], c), fontWeight: c.colorSign ? 700 : 400 }}>{fmt(r[c.key], c)}</span>;
    return <span className={c.key === nameKey ? "font-medium text-slate-800" : "text-slate-600"}>{r[c.key] || ""}</span>;
  };

  const totRow = {}; numCols.forEach(c => { totRow[c.key] = sum(rowsF, c.key); });

  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
      {/* barra superior */}
      <div className="px-4 py-3 border-b border-slate-200">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <div className="font-extrabold text-[15px] text-slate-900">{title}</div>
            {meta && <div className="text-[11.5px] text-slate-400 mt-0.5">{meta}</div>}
          </div>
          {onExport && <button onClick={onExport} className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 text-blue-700 px-3 py-1.5 text-[13px] font-semibold hover:bg-blue-50"><Download size={15} /> Descargar Excel</button>}
        </div>
        <div className="relative mt-3 max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar código, nombre, EAN…"
            className="w-full border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-[13px] outline-none focus:border-blue-300" />
        </div>
      </div>

      {/* tabla */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse" style={{ fontVariantNumeric: "tabular-nums", minWidth: 720 }}>
          <thead>
            <tr>{columns.map(c => <th key={c.key} className={th} style={{ textAlign: align(c) }}>{c.label}</th>)}</tr>
          </thead>
          <tbody>
            {rowsF.length === 0 ? (
              <tr><td colSpan={columns.length} className="px-4 py-8 text-center text-slate-400 text-[13px]">Sin datos para mostrar.</td></tr>
            ) : groupBy ? (
              groupKeys.map((gname, i) => {
                const grows = groups[gname]; const sub = {}; numCols.forEach(c => { sub[c.key] = sum(grows, c.key); });
                const gi = String(i + 1).padStart(2, "0");
                return [
                  <tr key={"g" + i} className="bg-slate-100">{columns.map(c => <td key={c.key} className={td + " font-bold text-slate-800"} style={{ textAlign: align(c), background: "#f1f5f9" }}>{cellContent(c, null, "grp", { gi, gname, sub })}</td>)}</tr>,
                  ...grows.map((r, j) => <tr key={i + "-" + j} className="hover:bg-slate-50">{columns.map(c => <td key={c.key} className={td} style={{ textAlign: align(c) }}>{cellContent(c, r, "det")}</td>)}</tr>)
                ];
              })
            ) : (
              rowsF.map((r, j) => <tr key={j} className="hover:bg-slate-50">{columns.map(c => <td key={c.key} className={td} style={{ textAlign: align(c) }}>{cellContent(c, r, "det")}</td>)}</tr>)
            )}
            {rowsF.length > 0 && (
              <tr>{columns.map(c => <td key={c.key} className={td + " font-extrabold"} style={{ textAlign: align(c), borderTop: "2px solid #0f172a", borderBottom: "none" }}>{cellContent(c, null, "tot", { tot: totRow })}</td>)}</tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-200 text-[11.5px] text-slate-500 flex gap-4 flex-wrap">
        <span>{rowsF.length} filas{groupBy ? ` · ${groupKeys.length} categorías` : ""}</span>
        {nq && <span>filtrado por “{q}”</span>}
      </div>
    </div>
  );
}
