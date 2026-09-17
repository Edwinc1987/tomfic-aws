import { useEffect, useState } from "react";
import { inventoriesApi } from "../api/inventoriesApi";

export function InventoriesPage({tenantId}){
  const [items,setItems]=useState([]);const [name,setName]=useState("");const [error,setError]=useState("");
  const load=async()=>{try{setItems(await inventoriesApi.list(tenantId));}catch(e){setError(e.message||"No se pudieron cargar los inventarios");}};
  useEffect(()=>{load();},[tenantId]);
  const create=async()=>{if(!name.trim())return;await inventoriesApi.create(tenantId,name);setName("");await load();};
  return <section className="space-y-4"><header><p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">Operación</p><h1 className="text-2xl font-bold text-slate-900">Inventarios</h1><p className="text-sm text-slate-500">Inventarios aislados por empresa</p></header>{error&&<div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}<div className="rounded-lg border bg-white p-4"><div className="flex gap-2"><input value={name} onChange={e=>setName(e.target.value)} placeholder="Nombre del inventario" className="flex-1 rounded border px-3 py-2 text-sm"/><button onClick={create} className="rounded bg-indigo-600 px-3 py-2 text-sm font-semibold text-white">Crear</button></div></div><div className="grid gap-3 md:grid-cols-2">{items.map(item=><div key={item.id} className="rounded-lg border bg-white p-4"><div className="font-bold text-slate-900">{item.name}</div><div className="mt-1 text-xs text-slate-500">Estado: {item.status}</div></div>)}</div></section>;
}
