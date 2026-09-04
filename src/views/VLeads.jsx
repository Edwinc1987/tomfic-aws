import { useState, useEffect } from "react";
import { UserPlus, Search, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import Section from "@/components/Section";
import { SB } from "@/lib/data";

export function VLeads({G,showToast}){
  const [leads,setLeads]=useState([]);
  const [loading,setLoading]=useState(true);
  const [q,setQ]=useState("");
  const [fEstado,setFEstado]=useState("todos");
  const cargar=async()=>{setLoading(true);const {data,error}=await SB.listLeads();if(error)console.warn("No se pudieron cargar los leads:",error.message);setLeads(data||[]);setLoading(false);};
  useEffect(()=>{cargar();/* eslint-disable-next-line */},[]);
  const cambiarEstado=async(l,estado)=>{try{const {error}=await SB.updateLead(l.id,{estado});if(error)throw error;setLeads(ls=>ls.map(x=>x.id===l.id?{...x,estado}:x));}catch(e){showToast(e.message||"Error","err");}};
  const borrar=async(id)=>{try{const {error}=await SB.deleteLead(id);if(error)throw error;setLeads(ls=>ls.filter(x=>x.id!==id));showToast("Lead eliminado","warn");}catch(e){showToast(e.message||"Error","err");}};
  const norm=s=>(s||"").toString().toLowerCase();
  const filtered=leads.filter(l=>{
    if(q){const s=norm(q);if(!(norm(l.nombre).includes(s)||norm(l.email).includes(s)||norm(l.telefono).includes(s)))return false;}
    if(fEstado!=="todos"&&(l.estado||"nuevo")!==fEstado)return false;
    return true;
  });
  const nuevos=leads.filter(l=>(l.estado||"nuevo")==="nuevo").length;
  return(
    <Section>
      <PageHeader label="Web pública" title="Leads" icon={UserPlus} count={leads.length} countLabel="leads" subtitle={nuevos?`${nuevos} nuevos sin contactar`:"Prospectos que llegan desde tu web"}/>
      <div className="view-sticky-controls mb-3 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/><Input value={q} onChange={e=>setQ(e.target.value)} placeholder="Buscar por nombre, email o teléfono…" className="pl-9 bg-white"/></div>
        <select value={fEstado} onChange={e=>setFEstado(e.target.value)} className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700">
          <option value="todos">Todos</option>
          <option value="nuevo">Nuevos</option>
          <option value="contactado">Contactados</option>
          <option value="descartado">Descartados</option>
        </select>
      </div>
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="bg-slate-50 text-slate-600 border-b border-slate-200">{["Recibido","Nombre","Email","Teléfono","Mensaje","Estado",""].map(h=><th key={h} className="px-3 py-1.5 text-left font-semibold text-xs whitespace-nowrap">{h}</th>)}</tr></thead>
            <tbody>
              {loading?(<tr><td colSpan={7} className="px-3 py-8 text-center text-muted-foreground text-sm">Cargando…</td></tr>):
               filtered.length===0?(<tr><td colSpan={7} className="px-3 py-8 text-center text-muted-foreground text-sm">{leads.length===0?"Aún no llegan prospectos desde la web.":"Ningún lead coincide con la búsqueda."}</td></tr>):
               filtered.map(l=>(
                <tr key={l.id} className="border-b last:border-0 hover:bg-slate-50 align-top">
                  <td className="px-3 py-1.5 text-xs text-muted-foreground whitespace-nowrap">{(l.created_at||"").slice(0,10)}</td>
                  <td className="px-3 py-1.5 font-bold text-slate-900 whitespace-nowrap">{l.nombre||"—"}</td>
                  <td className="px-3 py-1.5 text-xs">{l.email||"—"}</td>
                  <td className="px-3 py-1.5 text-xs whitespace-nowrap">{l.telefono||"—"}</td>
                  <td className="px-3 py-1.5 text-xs text-muted-foreground max-w-[220px]">{l.mensaje||"—"}</td>
                  <td className="px-3 py-1.5">
                    <select value={l.estado||"nuevo"} onChange={e=>cambiarEstado(l,e.target.value)} className="h-8 rounded-md border border-slate-200 bg-white px-2 text-xs text-slate-700">
                      <option value="nuevo">Nuevo</option>
                      <option value="contactado">Contactado</option>
                      <option value="descartado">Descartado</option>
                    </select>
                  </td>
                  <td className="px-3 py-1.5"><button onClick={()=>borrar(l.id)} className="text-red-500 hover:text-red-700"><Trash2 size={14}/></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </Section>
  );
}
