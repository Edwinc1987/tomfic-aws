import { useEffect, useState } from "react";
import { countsApi } from "../api/countsApi";

export function CountsPage({tenantId,inventoryId}){
  const [items,setItems]=useState([]);const [name,setName]=useState("");const [location,setLocation]=useState("");const [error,setError]=useState("");
  const load=async()=>{try{setItems(await countsApi.list(tenantId,inventoryId));}catch(e){setError(e.message||"No se pudieron cargar los conteos");}};
  useEffect(()=>{load();},[tenantId,inventoryId]);
  const create=async()=>{if(!name.trim()||!location.trim())return;await countsApi.create(tenantId,{inventoryId,name,location,rounds:["C1","C2"]});setName("");setLocation("");await load();};
  return <section className="space-y-4"><header><p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">Operación</p><h1 className="text-2xl font-bold text-slate-900">Conteos</h1><p className="text-sm text-slate-500">Rondas independientes C1 y C2</p></header>{error&&<div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}<div className="rounded-lg border bg-white p-4"><div className="grid gap-2 md:grid-cols-3"><input value={name} onChange={e=>setName(e.target.value)} placeholder="Nombre del conteo" className="rounded border px-3 py-2 text-sm"/><input value={location} onChange={e=>setLocation(e.target.value)} placeholder="Ubicación" className="rounded border px-3 py-2 text-sm"/><button onClick={create} className="rounded bg-indigo-600 px-3 py-2 text-sm font-semibold text-white">Programar</button></div></div><div className="space-y-2">{items.map(item=><div key={item.id} className="flex justify-between rounded-lg border bg-white p-4"><div><div className="font-bold text-slate-900">{item.name}</div><div className="text-xs text-slate-500">{item.status}</div></div><span className="text-xs text-slate-500">{item.inventoryId}</span></div>)}</div></section>;
}
