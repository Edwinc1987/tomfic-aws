import { useEffect, useState } from "react";
import { productsApi } from "../api/productsApi";

export function ProductsPage({tenantId,inventoryId}){
  const [search,setSearch]=useState("");
  const [page,setPage]=useState(1);
  const [result,setResult]=useState({items:[],total:0,page:1,pageSize:50});
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState("");

  useEffect(()=>{
    let active=true;
    if(!tenantId||!inventoryId)return undefined;
    setLoading(true);setError("");
    productsApi.list({tenantId,inventoryId,page,pageSize:50,search})
      .then(data=>{if(active)setResult(data);})
      .catch(err=>{if(active)setError(err.message||"No se pudieron cargar los productos");})
      .finally(()=>{if(active)setLoading(false);});
    return()=>{active=false;};
  },[tenantId,inventoryId,page,search]);

  const pages=Math.max(1,Math.ceil(result.total/result.pageSize));
  return <section aria-label="Productos">
    <div className="mb-4 flex items-center justify-between gap-3">
      <div><h1 className="text-xl font-bold text-slate-900">Productos</h1><p className="text-xs text-slate-500">{result.total.toLocaleString("es-CO")} productos</p></div>
      <input value={search} onChange={event=>{setSearch(event.target.value);setPage(1);}} placeholder="Buscar producto, código o EAN" className="w-72 rounded-md border border-slate-300 px-3 py-2 text-sm" />
    </div>
    {error&&<div role="alert" className="mb-3 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
      <table className="w-full text-sm"><thead className="bg-slate-50 text-left text-xs text-slate-600"><tr><th className="px-3 py-2">Código</th><th className="px-3 py-2">EAN</th><th className="px-3 py-2">Nombre</th><th className="px-3 py-2">Saldo</th><th className="px-3 py-2">Costo</th></tr></thead>
        <tbody>{loading?<tr><td colSpan="5" className="p-6 text-center text-slate-500">Cargando…</td></tr>:result.items.map(product=><tr key={product.id} className="border-t border-slate-100"><td className="px-3 py-2 font-mono">{product.code}</td><td className="px-3 py-2">{product.barcode||"—"}</td><td className="px-3 py-2 font-medium">{product.name}</td><td className="px-3 py-2">{product.balance}</td><td className="px-3 py-2">{product.cost}</td></tr>)}</tbody>
      </table>
    </div>
    <div className="mt-3 flex items-center justify-between text-sm text-slate-600"><span>Página {page} de {pages}</span><div className="flex gap-2"><button disabled={page===1} onClick={()=>setPage(current=>current-1)} className="rounded border px-3 py-1 disabled:opacity-40">Anterior</button><button disabled={page===pages} onClick={()=>setPage(current=>current+1)} className="rounded border px-3 py-1 disabled:opacity-40">Siguiente</button></div></div>
  </section>;
}
