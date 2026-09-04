import { useState, useEffect } from "react";
import { Users, Plus, ChevronRight, X, Search, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge as UIBadge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import Section from "@/components/Section";
import { SB, G, slugify, fmtFechaCorta, diasHasta, AVISO_DIAS } from "@/lib/data";
import { loadTenants } from "@/lib/sync";
import { VClienteDetalle } from "./VClienteDetalle";

export function VClientes({G,rerender,recargar,showToast,focusTenant,clearFocus,initFiltro,clearFiltro}){
  const [modal,setModal]=useState(false);
  const [form,setForm]=useState({nombre:"",nit:"",slug:"",adminNombre:"",adminEmail:"",adminPass:""});
  const [saving,setSaving]=useState(false);
  const [sel,setSel]=useState(null); // empresa abierta en ficha detalle
  const [q,setQ]=useState(""); // buscador por nombre/NIT/slug
  const [fEstado,setFEstado]=useState("todos"); // filtro por estado de la empresa
  const [fPago,setFPago]=useState("todos");     // filtro por estado de pago

  // Al llegar desde el Dashboard con una empresa enfocada, abrir su ficha directamente.
  useEffect(()=>{ if(focusTenant){ setSel(focusTenant); clearFocus&&clearFocus(); } /* eslint-disable-next-line */ },[focusTenant]);
  // Al llegar desde una tarjeta del Dashboard, aplicar su filtro (ej. "vencidas").
  useEffect(()=>{ if(initFiltro){ if(initFiltro.pago)setFPago(initFiltro.pago); if(initFiltro.estado)setFEstado(initFiltro.estado); clearFiltro&&clearFiltro(); } /* eslint-disable-next-line */ },[initFiltro]);

  const crear=async()=>{
    if(!form.nombre.trim()||!form.nit.trim()||!form.adminEmail.trim()||!form.adminPass.trim())return showToast("Completa empresa, NIT, email y clave","err");
    if(form.adminPass.length<6)return showToast("La clave debe tener al menos 6 caracteres","err");
    setSaving(true);
    const slug=slugify(form.nit); // el identificador (slug) sale del NIT
    try{
      const {data,error}=await SB.registerTenant(form.nombre.trim(),slug,form.adminEmail.trim(),form.adminPass,form.adminNombre.trim(),form.nit.trim());
      if(error)throw error;
      // El dueño la crea a propósito → la dejamos activa de una vez.
      if(data?.tenant_id){const {error:e2}=await SB.setTenantActive(data.tenant_id,true);if(e2)throw e2;}
      await loadTenants();rerender();
      setModal(false);setForm({nombre:"",nit:"",slug:"",adminNombre:"",adminEmail:"",adminPass:""});
      showToast("Empresa creada y activada ✓");
    }catch(e){console.warn("Error creando empresa:",e);showToast(e.message||"No se pudo crear la empresa","err");}
    setSaving(false);
  };
  const toggleActivo=async(t)=>{
    try{const {error}=await SB.setTenantActive(t.id,!t.activo);if(error)throw error;await loadTenants();rerender();showToast(t.activo?"Empresa desactivada":"Empresa activada","warn");}catch(e){showToast(e.message||"Error al actualizar","err");}
  };

  const tenants=G.tenants||[];
  const reloadTenants=async()=>{await loadTenants();rerender();};
  // Estado de pago derivado de la fecha de vencimiento.
  const estadoPago=(t)=>{const d=diasHasta(t.vence);if(d===null)return "sinfecha";if(d<0)return "vencido";if(d<=AVISO_DIAS)return "porvencer";return "aldia";};
  const pagoBadge=(t)=>{const e=estadoPago(t);
    if(e==="sinfecha")return <UIBadge variant="secondary">Sin fecha</UIBadge>;
    if(e==="vencido") return <UIBadge variant="destructive">Vencido</UIBadge>;
    if(e==="porvencer")return <UIBadge variant="warning">Por vencer</UIBadge>;
    return <UIBadge variant="success">Al día</UIBadge>;};
  const norm=s=>(s||"").toString().toLowerCase();
  const filtered=tenants.filter(t=>{
    if(q){const s=norm(q);if(!(norm(t.nombre).includes(s)||norm(t.nit).includes(s)||norm(t.slug).includes(s)))return false;}
    if(fEstado==="activa"&&!t.activo)return false;
    if(fEstado==="inactiva"&&t.activo)return false;
    if(fPago!=="todos"&&estadoPago(t)!==fPago)return false;
    return true;
  });
  if(sel){const fresh=tenants.find(x=>x.id===sel.id)||sel;return <VClienteDetalle t={fresh} showToast={showToast} onBack={()=>setSel(null)} onChanged={reloadTenants}/>;}
  return(
    <Section>
      <PageHeader label="Empresas" title="Clientes" icon={Users} count={tenants.length} countLabel="empresas"
        right={<Button onClick={()=>setModal(true)} className="bg-white text-indigo-700 hover:bg-indigo-50"><Plus size={16}/> Crear empresa</Button>}/>
      {tenants.length===0?(
        <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-white py-12 px-5 text-center text-muted-foreground">
          <Users size={48} className="text-slate-400 mb-3"/>
          <div className="text-base font-bold text-slate-900 mb-1.5">Sin empresas todavía</div>
          <div className="text-sm">Crea la primera empresa-cliente.</div>
        </div>
      ):(
        <>
        {/* Buscador + filtros */}
         <div className="view-sticky-controls mb-3 flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
            <Input value={q} onChange={e=>setQ(e.target.value)} placeholder="Buscar por empresa, NIT o slug…" className="pl-9 bg-white"/>
          </div>
          <select value={fEstado} onChange={e=>setFEstado(e.target.value)} className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700">
            <option value="todos">Todos los estados</option>
            <option value="activa">Activas</option>
            <option value="inactiva">Inactivas</option>
          </select>
          <select value={fPago} onChange={e=>setFPago(e.target.value)} className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700">
            <option value="todos">Todo pago</option>
            <option value="aldia">Al día</option>
            <option value="porvencer">Por vencer</option>
            <option value="vencido">Vencido</option>
            <option value="sinfecha">Sin fecha</option>
          </select>
          {(q||fEstado!=="todos"||fPago!=="todos")&&<Button variant="outline" size="sm" className="h-10" onClick={()=>{setQ("");setFEstado("todos");setFPago("todos");}}><X size={14}/> Limpiar</Button>}
          <span className="text-xs text-muted-foreground ml-auto">{filtered.length} de {tenants.length}</span>
        </div>
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="bg-slate-50 text-slate-600 border-b border-slate-200">{["Empresa","NIT","Plan","Estado","Pago","Vence","Acciones"].map(h=><th key={h} className="px-3 py-1.5 text-left font-semibold whitespace-nowrap text-xs">{h}</th>)}</tr></thead>
              <tbody>
                {filtered.length===0&&<tr><td colSpan={7} className="px-3 py-8 text-center text-sm text-muted-foreground">Ninguna empresa coincide con la búsqueda.</td></tr>}
                {filtered.map(t=>(
                  <tr key={t.id} className="border-b last:border-0 hover:bg-slate-50">
                    <td className="px-3 py-1.5 font-bold text-slate-900">{t.nombre}<div className="font-mono text-[10px] font-normal text-slate-400">{t.slug||"—"}</div></td>
                    <td className="px-3 py-1.5 text-xs text-muted-foreground">{t.nit||"—"}</td>
                    <td className="px-3 py-1.5"><UIBadge variant="secondary">{t.plan||"basico"}</UIBadge></td>
                    <td className="px-3 py-1.5">{t.activo?<UIBadge variant="success">Activa</UIBadge>:<UIBadge variant="destructive">Inactiva</UIBadge>}</td>
                    <td className="px-3 py-1.5">{pagoBadge(t)}</td>
                    <td className="px-3 py-1.5 text-xs text-muted-foreground whitespace-nowrap">{fmtFechaCorta(t.vence)}</td>
                    <td className="px-3 py-1.5">
                      <div className="flex gap-1.5">
                        <Button size="sm" className="h-7 px-2.5 text-xs" onClick={()=>setSel(t)}><ChevronRight size={13}/> Ingresar</Button>
                         {t.activo?(
                           <Button variant="outline" size="sm" className="h-7 px-2.5 text-xs" onClick={()=>toggleActivo(t)}>Desactivar</Button>
                         ):(
                           <Button size="sm" className="h-7 px-2.5 text-xs bg-emerald-600 hover:bg-emerald-700" onClick={()=>toggleActivo(t)}><CheckCircle size={13}/> Aprobar empresa</Button>
                         )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
        </>
      )}
      <Dialog open={modal} onOpenChange={setModal}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Crear empresa-cliente</DialogTitle></DialogHeader>
          <div className="space-y-3.5">
            <div className="space-y-1.5"><Label>Nombre de la empresa</Label><Input value={form.nombre} onChange={e=>setForm(p=>({...p,nombre:e.target.value}))} placeholder="Ej: Supermercado La 14"/></div>
            <div className="space-y-1.5"><Label>NIT</Label><Input value={form.nit} onChange={e=>setForm(p=>({...p,nit:e.target.value}))} placeholder="900.123.456-7"/>{form.nit.trim()&&<p className="text-xs text-slate-400">Identificador del equipo: <span className="font-mono text-slate-600">{slugify(form.nit)}</span></p>}</div>
            <div className="rounded-lg bg-indigo-50 px-3 py-1.5 text-xs text-indigo-800">Se crea la cuenta de <b>administrador</b> de esta empresa (entra con <b>email + clave</b> en la pestaña «Administrador»). La empresa queda activa de inmediato.</div>
            <div className="space-y-1.5"><Label>Nombre del admin <span className="text-slate-400 font-normal">(opcional)</span></Label><Input value={form.adminNombre} onChange={e=>setForm(p=>({...p,adminNombre:e.target.value}))} placeholder="Ej: Juan Pérez"/></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Email del admin</Label><Input type="email" value={form.adminEmail} onChange={e=>setForm(p=>({...p,adminEmail:e.target.value}))} placeholder="admin@empresa.com"/></div>
              <div className="space-y-1.5"><Label>Clave admin</Label><Input value={form.adminPass} onChange={e=>setForm(p=>({...p,adminPass:e.target.value}))} placeholder="mín. 6 caracteres"/></div>
            </div>
            <Button className="w-full" onClick={crear} disabled={saving}>{saving?"Creando…":<><Plus size={16}/> Crear empresa</>}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </Section>
  );
}
