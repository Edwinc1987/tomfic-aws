import { useState, useEffect } from "react";
import { DollarSign, BarChart2, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import Section from "@/components/Section";
import { SB, G, money, fmtFechaCorta, ISO_HOY } from "@/lib/data";

export function VPagos({G,showToast}){
  const [pagos,setPagos]=useState([]);
  const [loading,setLoading]=useState(true);
  const [q,setQ]=useState("");
  const tenants=G.tenants||[];
  const tName=(tid)=>{const t=tenants.find(x=>x.id===tid);return t?t.nombre:"—";};
  const cargar=async()=>{setLoading(true);const {data,error}=await SB.listAllPagos();if(error)console.warn("No se pudieron cargar los pagos:",error.message);setPagos(data||[]);setLoading(false);};
  useEffect(()=>{cargar();/* eslint-disable-next-line */},[]);
  const norm=s=>(s||"").toString().toLowerCase();
  const filtered=pagos.filter(p=>!q||norm(tName(p.tenant_id)).includes(norm(q))||norm(p.metodo).includes(norm(q))||norm(p.nota).includes(norm(q)));
  const mesAct=ISO_HOY().slice(0,7);
  const totalMes=pagos.filter(p=>(p.fecha||"").slice(0,7)===mesAct).reduce((s,p)=>s+(Number(p.monto)||0),0);
  const totalAll=pagos.reduce((s,p)=>s+(Number(p.monto)||0),0);
  return(
    <Section>
      <PageHeader label="Facturación" title="Pagos" icon={DollarSign} count={pagos.length} countLabel="pagos"/>
      <div className="grid grid-cols-2 gap-3 mb-4 max-w-md">
        <div className="rounded-xl border border-slate-200 bg-white p-4"><div className="text-xs font-semibold uppercase tracking-wide text-cyan-600 flex items-center gap-1.5"><DollarSign size={14}/> Este mes</div><div className="text-2xl font-extrabold text-slate-900 mt-1">{money(totalMes)}</div></div>
        <div className="rounded-xl border border-slate-200 bg-white p-4"><div className="text-xs font-semibold uppercase tracking-wide text-indigo-600 flex items-center gap-1.5"><BarChart2 size={14}/> Total histórico</div><div className="text-2xl font-extrabold text-slate-900 mt-1">{money(totalAll)}</div></div>
      </div>
      <div className="relative mb-3 max-w-sm">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
        <Input value={q} onChange={e=>setQ(e.target.value)} placeholder="Buscar por empresa, método o nota…" className="pl-9 bg-white"/>
      </div>
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="bg-slate-50 text-slate-600 border-b border-slate-200">{["Empresa","Fecha","Monto","Periodo","Método","Nota"].map(h=><th key={h} className="px-3 py-1.5 text-left font-semibold text-xs whitespace-nowrap">{h}</th>)}</tr></thead>
            <tbody>
              {loading?(<tr><td colSpan={6} className="px-3 py-8 text-center text-muted-foreground text-sm">Cargando…</td></tr>):
               filtered.length===0?(<tr><td colSpan={6} className="px-3 py-8 text-center text-muted-foreground text-sm">{pagos.length===0?"Aún no hay pagos registrados.":"Ningún pago coincide con la búsqueda."}</td></tr>):
               filtered.map(p=>(
                <tr key={p.id} className="border-b last:border-0 hover:bg-slate-50">
                  <td className="px-3 py-1.5 font-bold text-slate-900 whitespace-nowrap">{tName(p.tenant_id)}</td>
                  <td className="px-3 py-1.5 text-xs text-muted-foreground whitespace-nowrap">{fmtFechaCorta(p.fecha)}</td>
                  <td className="px-3 py-1.5 font-semibold text-emerald-700 whitespace-nowrap">{money(p.monto)}</td>
                  <td className="px-3 py-1.5 text-xs text-muted-foreground whitespace-nowrap">{p.periodo_desde?`${fmtFechaCorta(p.periodo_desde)} → ${fmtFechaCorta(p.periodo_hasta)}`:"—"}</td>
                  <td className="px-3 py-1.5 text-xs">{p.metodo||"—"}</td>
                  <td className="px-3 py-1.5 text-xs text-muted-foreground">{p.nota||"—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </Section>
  );
}
