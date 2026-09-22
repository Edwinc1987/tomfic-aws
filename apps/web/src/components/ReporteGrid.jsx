import { useState } from "react";
import { Search, Download, SlidersHorizontal, Columns, X, ChevronDown } from "lucide-react";

// Grid de reporte en pantalla, estilo ERP (jerarquía por categoría + subtotales +
// Total general) con barra de filtros: Categoría, Estado, "Solo con diferencia",
// selector de Columnas, chips removibles y "Limpiar filtros".
// Usa las MISMAS columnas que el Excel (reporteXLSX) → pantalla y archivo idénticos.
const NUM = new Set(["num", "money"]);

export function ReporteGrid({ title, meta, columns, rows, groupBy, nameKey = "nombre", onExport, showSupplierFilter = true }) {
  const [q, setQ] = useState("");
  const [fCat, setFCat] = useState("");
  const [fEstado, setFEstado] = useState("");
  const [fSupplier, setFSupplier] = useState("");
  const [soloDif, setSoloDif] = useState(false);
  const [ocultas, setOcultas] = useState(() => new Set());
  const [showMas, setShowMas] = useState(false);
  const [showCols, setShowCols] = useState(false);

  const hasDif = columns.some(c => c.key === "diferencia");
  const hasEstado = columns.some(c => c.type === "estado");
  const estadoKey = (columns.find(c => c.type === "estado") || {}).key;

  const cats = groupBy ? [...new Set(rows.map(r => r[groupBy] || "Sin categoría"))].sort((a, b) => a.localeCompare(b)) : [];
  const suppliers = showSupplierFilter ? [...new Set(rows.map(r => r.supplier || r.proveedor).filter(Boolean))].sort((a, b) => a.localeCompare(b)) : [];
  const estados = hasEstado ? [...new Set(rows.map(r => r[estadoKey]).filter(Boolean))].sort() : [];

  const nq = q.trim().toLowerCase();
  const rowsF = rows.filter(r => {
    if (nq && ![r.codigo, r.nombre, r.ean, r.supplier, r.proveedor].some(v => String(v || "").toLowerCase().includes(nq))) return false;
    if (fCat && (r[groupBy] || "Sin categoría") !== fCat) return false;
    if (fSupplier && (r.supplier || r.proveedor || "") !== fSupplier) return false;
    if (fEstado && r[estadoKey] !== fEstado) return false;
    if (soloDif && Number(r.diferencia || 0) === 0) return false;
    return true;
  });

  const nFiltros = [fCat, fEstado, fSupplier, soloDif].filter(Boolean).length;
  const limpiar = () => { setQ(""); setFCat(""); setFEstado(""); setFSupplier(""); setSoloDif(false); };
  const visibles = columns.filter(c => !ocultas.has(c.key));
  const toggleCol = k => setOcultas(s => { const n = new Set(s); n.has(k) ? n.delete(k) : n.add(k); return n; });

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
  const numCols = visibles.filter(c => NUM.has(c.type));

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
    if (c.key === "codigo") return <span className="font-semibold" style={{ color: "#2563eb" }}>{r.codigo}</span>;
    if (c.type === "estado") { const e = r[c.key] || ""; const bad = /VENC|AVER|NO APTO/i.test(e); return e ? <span className="inline-block rounded-full px-2 py-0.5 text-[10.5px] font-bold" style={{ background: bad ? "#fef2f2" : "#f0fdf4", color: bad ? "#991b1b" : "#166534" }}>{e}</span> : "—"; }
    if (NUM.has(c.type)) return <span style={{ color: color(r[c.key], c), fontWeight: c.colorSign ? 700 : 400 }}>{fmt(r[c.key], c)}</span>;
    return <span className={c.key === nameKey ? "font-medium text-slate-800" : "text-slate-600"}>{r[c.key] || ""}</span>;
  };

  const totRow = {}; numCols.forEach(c => { totRow[c.key] = sum(rowsF, c.key); });
  const btn = "inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-[13px] font-semibold text-slate-600 hover:border-slate-300 relative";
  const sel = "inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[13px] font-semibold text-slate-600";

  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
      {/* barra de filtros */}
      <div className="px-4 py-3 border-b border-slate-200">
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="font-extrabold text-[15px] text-slate-900 mr-1">{title}</div>
          {groupBy && (
            <label className={sel}>
              <span className="text-slate-400 text-[11px] font-normal">Categoría</span>
              <select value={fCat} onChange={e => setFCat(e.target.value)} className="bg-transparent outline-none text-[13px] font-semibold text-slate-700 max-w-[160px]">
                <option value="">Todas</option>
                {cats.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>
          )}
          {suppliers.length > 0 && (
            <label className={sel}>
              <span className="text-slate-400 text-[11px] font-normal">Proveedor</span>
              <select value={fSupplier} onChange={e => setFSupplier(e.target.value)} className="bg-transparent outline-none text-[13px] font-semibold text-slate-700 max-w-[160px]">
                <option value="">Todos</option>
                {suppliers.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </label>
          )}
          {(hasEstado || hasDif) && (
            <button className={btn} onClick={() => setShowMas(v => !v)}>
              <SlidersHorizontal size={15} /> Más filtros
              {nFiltros > 0 && <span className="absolute -top-2 -right-2 bg-red-600 text-white text-[10px] font-bold w-[18px] h-[18px] rounded-full grid place-items-center">{nFiltros}</span>}
            </button>
          )}
          <span className="flex-1" />
          <button className={btn} onClick={() => setShowCols(v => !v)}><Columns size={15} /> Columnas</button>
          {onExport && <button className={btn + " text-blue-700 border-blue-200 hover:bg-blue-50"} onClick={onExport}><Download size={15} /> Descargar</button>}
        </div>

        {showMas && (hasEstado || hasDif) && (
          <div className="mt-2.5 flex items-center gap-3 flex-wrap rounded-lg bg-slate-50 border border-slate-200 px-3 py-2.5">
            {hasEstado && (
              <label className={sel}>
                <span className="text-slate-400 text-[11px] font-normal">Estado</span>
                <select value={fEstado} onChange={e => setFEstado(e.target.value)} className="bg-transparent outline-none text-[13px] font-semibold text-slate-700">
                  <option value="">Todos</option>
                  {estados.map(e => <option key={e} value={e}>{e}</option>)}
                </select>
              </label>
            )}
            {hasDif && (
              <label className="inline-flex items-center gap-2 text-[13px] text-slate-700 font-semibold cursor-pointer">
                <input type="checkbox" checked={soloDif} onChange={e => setSoloDif(e.target.checked)} /> Solo con diferencia
              </label>
            )}
          </div>
        )}

        {showCols && (
          <div className="mt-2.5 flex items-center gap-x-4 gap-y-2 flex-wrap rounded-lg bg-slate-50 border border-slate-200 px-3 py-2.5">
            {columns.filter(c => c.key !== "__nivel" && c.key !== nameKey).map(c => (
              <label key={c.key} className="inline-flex items-center gap-1.5 text-[12.5px] text-slate-700 cursor-pointer">
                <input type="checkbox" checked={!ocultas.has(c.key)} onChange={() => toggleCol(c.key)} /> {c.label}
              </label>
            ))}
          </div>
        )}

        {/* chips activos */}
        {(nFiltros > 0 || nq) && (
          <div className="mt-2.5 flex items-center gap-2 flex-wrap">
            {fCat && <span className="inline-flex items-center gap-1.5 bg-white border border-slate-200 rounded-full pl-3 pr-1 py-1 text-[12px] text-slate-600">Categoría: <b className="text-slate-900">{fCat}</b><button onClick={() => setFCat("")} className="w-4 h-4 grid place-items-center rounded-full bg-slate-100 text-slate-400"><X size={11} /></button></span>}
            {fEstado && <span className="inline-flex items-center gap-1.5 bg-white border border-slate-200 rounded-full pl-3 pr-1 py-1 text-[12px] text-slate-600">Estado: <b className="text-slate-900">{fEstado}</b><button onClick={() => setFEstado("")} className="w-4 h-4 grid place-items-center rounded-full bg-slate-100 text-slate-400"><X size={11} /></button></span>}
            {soloDif && <span className="inline-flex items-center gap-1.5 bg-white border border-slate-200 rounded-full pl-3 pr-1 py-1 text-[12px] text-slate-600">Solo con diferencia<button onClick={() => setSoloDif(false)} className="w-4 h-4 grid place-items-center rounded-full bg-slate-100 text-slate-400"><X size={11} /></button></span>}
            <button onClick={limpiar} className="text-[12px] text-blue-600 font-semibold ml-1">Limpiar filtros</button>
          </div>
        )}

        {/* búsqueda */}
        <div className="relative mt-2.5 max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar código, nombre, EAN…"
            className="w-full border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-[13px] outline-none focus:border-blue-300" />
        </div>
      </div>

      {/* tabla */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse" style={{ fontVariantNumeric: "tabular-nums", minWidth: 680 }}>
          <thead>
            <tr>{visibles.map(c => <th key={c.key} className={th} style={{ textAlign: align(c) }}>{c.label}</th>)}</tr>
          </thead>
          <tbody>
            {rowsF.length === 0 ? (
              <tr><td colSpan={visibles.length} className="px-4 py-8 text-center text-slate-400 text-[13px]">Sin datos para los filtros actuales.</td></tr>
            ) : groupBy ? (
              groupKeys.map((gname, i) => {
                const grows = groups[gname]; const sub = {}; numCols.forEach(c => { sub[c.key] = sum(grows, c.key); });
                const gi = String(i + 1).padStart(2, "0");
                return [
                  <tr key={"g" + i}>{visibles.map(c => <td key={c.key} className={td + " font-bold text-slate-800"} style={{ textAlign: align(c), background: "#f1f5f9" }}>{cellContent(c, null, "grp", { gi, gname, sub })}</td>)}</tr>,
                  ...grows.map((r, j) => <tr key={i + "-" + j} className="hover:bg-slate-50">{visibles.map(c => <td key={c.key} className={td} style={{ textAlign: align(c) }}>{cellContent(c, r, "det")}</td>)}</tr>)
                ];
              })
            ) : (
              rowsF.map((r, j) => <tr key={j} className="hover:bg-slate-50">{visibles.map(c => <td key={c.key} className={td} style={{ textAlign: align(c) }}>{cellContent(c, r, "det")}</td>)}</tr>)
            )}
            {rowsF.length > 0 && (
              <tr>{visibles.map(c => <td key={c.key} className={td + " font-extrabold"} style={{ textAlign: align(c), borderTop: "2px solid #0f172a", borderBottom: "none" }}>{cellContent(c, null, "tot", { tot: totRow })}</td>)}</tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-200 text-[11.5px] text-slate-500 flex gap-4 flex-wrap">
        <span>{rowsF.length} de {rows.length} filas{groupBy ? ` · ${groupKeys.length} categorías` : ""}</span>
        {(nFiltros > 0 || nq) && <span>filtros activos</span>}
      </div>
    </div>
  );
}
