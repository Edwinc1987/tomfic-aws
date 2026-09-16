import { useState, useEffect } from "react";
import { Building2, Users, Search, ChevronRight, ArrowLeft, Plus, Phone, Mail, CalendarDays, CreditCard, BriefcaseBusiness, MessageSquare, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import Section from "@/components/Section";
import { diasHasta, fmtFechaCorta, HOY, addDias, SB } from "@/lib/data";

const comercialesIniciales = [
  { id: 1, nombre: "Juan Pérez", cargo: "Comercial senior", email: "juan@tomfic.com", telefono: "+57 300 555 0101", meta: 82, oportunidades: 8, estado: "Activo" },
  { id: 2, nombre: "María González", cargo: "Ejecutiva comercial", email: "maria@tomfic.com", telefono: "+57 300 555 0102", meta: 64, oportunidades: 5, estado: "Activo" },
  { id: 3, nombre: "Carlos Ríos", cargo: "Comercial", email: "carlos@tomfic.com", telefono: "+57 300 555 0103", meta: 41, oportunidades: 3, estado: "Activo" },
];

const servicios = ["Plan Esencial", "Plan Profesional", "Plan Empresarial", "Implementación", "Acompañamiento" ];

export function VCRM({ G, showToast, usuario, mode = "dueno", focusTenant, clearFocus }) {
  const isCommercial = mode === "comercial";
  const [tab, setTab] = useState("empresas");
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState(null);
  const [comerciales, setComerciales] = useState(comercialesIniciales);
  const [showCommercialForm, setShowCommercialForm] = useState(false);
  const [newCommercial, setNewCommercial] = useState({ nombre: "", email: "", telefono: "" });
  const [savingVence, setSavingVence] = useState(false);
  const [approving, setApproving] = useState(false);
  useEffect(() => { if (focusTenant) { openCompany(focusTenant); clearFocus?.(); } }, [focusTenant]);

  const tenants = G.tenants || [];
  const filtered = tenants.filter(t => {
    const needle = q.trim().toLowerCase();
    return !needle || [t.nombre, t.nit, t.slug].some(v => (v || "").toLowerCase().includes(needle));
  });
  const paymentState = t => {
    const days = diasHasta(t.vence);
    if (days === null) return { label: "Sin fecha", variant: "secondary" };
    if (days < 0) return { label: "Vencido", variant: "destructive" };
    if (days <= 30) return { label: "Por vencer", variant: "warning" };
    return { label: "Al día", variant: "success" };
  };
  const openCompany = t => setSelected({ ...t, service: t.plan ? `Plan ${String(t.plan).replace(/^./, x => x.toUpperCase())}` : "Plan Profesional", commercial: comerciales[0]?.nombre || "Sin asignar" });
  const addCommercial = () => {
    if (!newCommercial.nombre.trim() || !newCommercial.email.trim()) return showToast("Completa nombre y email del comercial", "err");
    setComerciales(current => [...current, { id: Date.now(), ...newCommercial, cargo: "Comercial", meta: 0, oportunidades: 0, estado: "Activo" }]);
    setNewCommercial({ nombre: "", email: "", telefono: "" });
    setShowCommercialForm(false);
    showToast("Perfil comercial creado");
  };

  // Actualiza la fecha de vencimiento (renovación) del cliente en la nube.
  const guardarVence = async (fecha) => {
    if (!selected) return;
    setSavingVence(true);
    try {
      const { error } = await SB.updateTenant(selected.id, { vence: fecha || null });
      if (error) throw error;
      const t = (G.tenants || []).find(x => x.id === selected.id); if (t) t.vence = fecha || null;
      if (G.tenant && G.tenant.id === selected.id) G.tenant.vence = fecha || null;
      setSelected(s => ({ ...s, vence: fecha || null }));
      showToast("Fecha de renovación actualizada ✓");
    } catch (e) { showToast(e.message || "No se pudo actualizar", "err"); }
    setSavingVence(false);
  };

  const aprobarEmpresa = async () => {
    if (!selected || selected.activo) return;
    setApproving(true);
    try {
      const { error } = await SB.setTenantActive(selected.id, true);
      if (error) throw error;
      const tenant = (G.tenants || []).find(x => x.id === selected.id);
      if (tenant) tenant.activo = true;
      setSelected(current => ({ ...current, activo: true }));
      showToast("Empresa aprobada ✓");
    } catch (e) {
      showToast(e.message || "No se pudo aprobar la empresa", "err");
    }
    setApproving(false);
  };

  if (selected) {
    const payment = paymentState(selected);
    return <Section>
      <Button variant="outline" size="sm" onClick={() => setSelected(null)} className="mb-4"><ArrowLeft size={15} /> Volver al CRM</Button>
      <PageHeader label="Ficha 360°" title={selected.nombre} icon={Building2} subtitle={`${selected.nit || "Sin NIT"} · ${selected.slug || "Sin identificador"}`} />
       <div className="mb-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex flex-wrap items-start gap-4"><div className="grid h-14 w-14 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500 text-lg font-extrabold text-white">{selected.nombre.split(" ").map(x => x[0]).join("").slice(0, 2)}</div><div className="min-w-[220px] flex-1"><h2 className="text-lg font-extrabold text-slate-900">{selected.nombre}</h2><div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500"><span>NIT {selected.nit || "sin registrar"}</span><span>{selected.slug || "sin identificador"}</span><span>Cliente activo</span></div><div className="mt-3 flex flex-wrap items-center gap-2"><Badge variant={selected.activo ? "success" : "destructive"}>{selected.activo ? "Activo" : "Inactivo"}</Badge><Badge variant="secondary">{selected.service}</Badge><Badge variant={payment.variant}>{payment.label}</Badge>{!selected.activo&&<Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={aprobarEmpresa} disabled={approving}><CheckCircle2 size={14}/>{approving?"Aprobando…":"Aprobar empresa"}</Button>}</div></div><div className="flex gap-2"><Button size="sm" onClick={() => showToast("La llamada quedará registrada en la actividad") }><Phone size={14} /> Llamar</Button><Button size="sm" variant="outline" onClick={() => showToast("La conversación se registrará en el seguimiento") }><MessageSquare size={14} /> Registrar contacto</Button></div></div></div>
      <div className="grid gap-px overflow-hidden rounded-xl border border-slate-200 bg-slate-200 md:grid-cols-4 mb-5">
        {[[CreditCard, "Servicio", selected.service, "text-indigo-600"], [CalendarDays, "Renovación", fmtFechaCorta(selected.vence), "text-amber-600"], [CheckCircle2, "Estado de pago", payment.label, payment.variant === "success" ? "text-green-600" : "text-amber-600"], [BriefcaseBusiness, "Comercial", selected.commercial, "text-cyan-600"]].map(([Icon, label, value, color]) => <Card key={label} className="p-4"><Icon size={18} className={color} /><div className="mt-2 text-[11px] font-bold uppercase tracking-wide text-slate-500">{label}</div><div className="mt-1 truncate text-sm font-bold text-slate-900">{value || "Sin dato"}</div></Card>)}
      </div>
      <Card className="p-4 mb-5 border-amber-200 bg-amber-50/40">
        <div className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-900"><CalendarDays size={16} className="text-amber-600" /> Gestionar renovación (fecha de vencimiento)</div>
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <div className="mb-1 text-[11px] font-bold uppercase tracking-wide text-slate-500">Vence</div>
            <Input type="date" value={selected.vence || ""} onChange={e => setSelected(s => ({ ...s, vence: e.target.value }))} className="w-[180px] bg-white" />
          </div>
          <Button size="sm" disabled={savingVence} onClick={() => guardarVence(selected.vence)}><CheckCircle2 size={14} /> {savingVence ? "Guardando…" : "Guardar fecha"}</Button>
          <Button size="sm" variant="outline" disabled={savingVence} onClick={() => guardarVence(addDias(selected.vence && selected.vence >= HOY() ? selected.vence : HOY(), 30))}>+30 días</Button>
          <Button size="sm" variant="outline" disabled={savingVence} onClick={() => guardarVence(addDias(HOY(), 365))}>+1 año</Button>
        </div>
        <div className="mt-2 text-[11px] text-slate-500">El cliente verá el cambio la próxima vez que inicie sesión (o al refrescar).</div>
      </Card>
      <div className="mb-4 grid gap-4 md:grid-cols-3"><Card className="p-4 md:col-span-2"><div className="mb-3 flex items-center justify-between"><h3 className="flex items-center gap-2 text-sm font-bold"><BriefcaseBusiness size={17} className="text-indigo-600" /> Servicios contratados</h3><Button size="sm" variant="outline" onClick={() => showToast("El servicio se añadirá desde la gestión de planes") }><Plus size={14} /> Añadir servicio</Button></div><div className="overflow-x-auto"><table className="w-full text-xs"><thead><tr className="border-b text-left text-slate-500"><th className="py-2">Servicio</th><th className="py-2">Estado</th><th className="py-2">Renovación</th><th className="py-2">Responsable</th></tr></thead><tbody><tr><td className="py-2 font-bold text-slate-800">{selected.service}</td><td className="py-2"><Badge variant="success">Activo</Badge></td><td className="py-2">{fmtFechaCorta(selected.vence)}</td><td className="py-2">{selected.commercial}</td></tr></tbody></table></div></Card><Card className="p-4"><h3 className="mb-3 flex items-center gap-2 text-sm font-bold"><Users size={17} className="text-cyan-600" /> Contactos</h3><div className="rounded-lg bg-slate-50 p-3"><div className="font-semibold text-slate-800">Administrador de la empresa</div><div className="mt-1 flex items-center gap-1 text-xs text-slate-500"><Mail size={12} /> Contacto principal</div></div><Button className="mt-3 w-full" size="sm" variant="outline" onClick={() => showToast("Contacto listo para ser añadido") }><Plus size={14} /> Añadir contacto</Button></Card></div>
      <div className="mb-4 grid gap-4 lg:grid-cols-[1.4fr_1fr]"><Card className="p-5"><h3 className="mb-4 flex items-center gap-2 text-sm font-bold text-slate-900"><BriefcaseBusiness size={17} className="text-indigo-600" /> Oportunidades de servicio</h3><div className="space-y-3"><div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-100 p-3"><div><div className="font-semibold text-slate-800">Renovación {selected.service}</div><div className="text-xs text-slate-500">Seguimiento de continuidad del servicio</div></div><Badge variant={payment.variant}>{payment.label}</Badge></div><div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-100 p-3"><div><div className="font-semibold text-slate-800">Ampliación de cobertura</div><div className="text-xs text-slate-500">Explorar necesidades adicionales del cliente</div></div><Badge variant="secondary">Pendiente</Badge></div></div></Card><Card className="p-5"><h3 className="mb-4 flex items-center gap-2 text-sm font-bold text-slate-900"><MessageSquare size={17} className="text-cyan-600" /> Acción comercial</h3><div className="space-y-4 text-sm"><div className="border-l-2 border-indigo-500 pl-3"><div className="text-[11px] text-slate-500">Hoy · {selected.commercial}</div><div className="font-medium">Preparar contacto de renovación</div></div><div className="border-l-2 border-slate-300 pl-3"><div className="text-[11px] text-slate-500">Actividad pendiente</div><div className="font-medium">Registrar próxima conversación</div></div><Button size="sm" variant="outline" onClick={() => showToast("Actividad agregada al seguimiento") }><Plus size={14} /> Añadir nota</Button></div></Card></div>
      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Card className="p-5"><h3 className="mb-4 flex items-center gap-2 text-sm font-bold text-slate-900"><Building2 size={17} className="text-indigo-600" /> Información general</h3><div className="grid gap-4 sm:grid-cols-2">{[["Razón social", selected.nombre], ["NIT", selected.nit], ["Identificador", selected.slug], ["Plan", selected.plan || "Sin plan"], ["Fecha de vencimiento", fmtFechaCorta(selected.vence)], ["Estado", selected.activo ? "Activa" : "Inactiva"], ["Comercial asignado", selected.commercial], ["Último contacto", "Pendiente de registrar"]].map(([label, value]) => <div key={label}><div className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{label}</div><div className="mt-1 text-sm font-medium text-slate-800">{value || "Sin dato"}</div></div>)}</div></Card>
        <Card className="p-5"><h3 className="mb-4 flex items-center gap-2 text-sm font-bold text-slate-900"><MessageSquare size={17} className="text-cyan-600" /> Actividad reciente</h3><div className="space-y-4 text-sm"><div><div className="font-semibold text-slate-800">Seguimiento de renovación</div><div className="text-xs text-slate-500">Pendiente confirmar continuidad del servicio</div></div><div><div className="font-semibold text-slate-800">Último contacto comercial</div><div className="text-xs text-slate-500">Registrar llamada, reunión o conversación</div></div><Button size="sm" variant="outline" onClick={() => showToast("La actividad se habilitará con el módulo de seguimiento") }><Plus size={14} /> Registrar actividad</Button></div></Card>
      </div>
    </Section>;
  }

  return <Section>
    <PageHeader label={isCommercial ? "Área comercial" : "Gestión comercial"} title={isCommercial ? `Hola, ${usuario?.nombre || "comercial"}` : "CRM"} icon={isCommercial ? Users : BriefcaseBusiness} subtitle={isCommercial ? `${tenants.length} empresas disponibles` : `${tenants.length} empresas · ${comerciales.length} comerciales`} />
    {isCommercial && <Card className="mb-5 border-indigo-100 bg-gradient-to-r from-indigo-50 to-cyan-50 p-4"><div className="flex flex-wrap items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-full bg-indigo-600 font-bold text-white">{(usuario?.nombre || "C").charAt(0).toUpperCase()}</div><div><div className="font-bold text-slate-900">Tu perfil comercial</div><div className="text-xs text-slate-600">Trabaja renovaciones, contactos, notas y oportunidades de tus clientes.</div></div><div className="ml-auto flex gap-2 text-center"><div className="rounded-lg bg-white/80 px-3 py-2"><div className="text-lg font-bold text-indigo-700">{tenants.length}</div><div className="text-[10px] uppercase text-slate-500">Clientes</div></div><div className="rounded-lg bg-white/80 px-3 py-2"><div className="text-lg font-bold text-amber-600">{tenants.filter(t => paymentState(t).label === "Por vencer").length}</div><div className="text-[10px] uppercase text-slate-500">Renovaciones</div></div></div></div></Card>}
    <div className="mb-5 flex flex-wrap gap-2 border-b border-slate-200">
      {[ ["empresas", Building2, isCommercial ? "Mis clientes" : "Empresas cliente"], ...(!isCommercial ? [["comerciales", Users, "Comerciales" ]] : []) ].map(([id, Icon, label]) => <button key={id} onClick={() => setTab(id)} className={`inline-flex items-center gap-2 border-b-2 px-3 py-2 text-sm font-semibold ${tab === id ? "border-indigo-600 text-indigo-700" : "border-transparent text-slate-500"}`}><Icon size={16} /> {label}</button>)}
    </div>
    {tab === "empresas" ? <>
      <div className="mb-3 flex flex-wrap items-center gap-2"><div className="relative min-w-[220px] flex-1"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><Input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar empresa, NIT o identificador..." className="bg-white pl-9" /></div><div className="rounded-lg bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-700">Ficha 360° de clientes</div></div>
      <Card className="overflow-hidden"><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b bg-slate-50 text-xs text-slate-600">{["Empresa", "Servicio", "Comercial", "Renovación", "Pago", ""].map(h => <th key={h} className="px-3 py-2 text-left font-semibold">{h}</th>)}</tr></thead><tbody>{filtered.length === 0 && <tr><td colSpan={6} className="px-3 py-10 text-center text-slate-500">No hay empresas para mostrar.</td></tr>}{filtered.map(t => { const p = paymentState(t); return <tr key={t.id} className="border-b last:border-0 hover:bg-slate-50"><td className="px-3 py-2 font-bold text-slate-900">{t.nombre}<div className="font-mono text-[10px] font-normal text-slate-400">{t.nit || t.slug || "Sin identificador"}</div></td><td className="px-3 py-2"><Badge variant="secondary">{t.plan ? `Plan ${t.plan}` : "Sin plan"}</Badge></td><td className="px-3 py-2 text-slate-600">{comerciales[0]?.nombre || "Sin asignar"}</td><td className="px-3 py-2 text-xs text-slate-600">{fmtFechaCorta(t.vence)}</td><td className="px-3 py-2"><Badge variant={p.variant}>{p.label}</Badge></td><td className="px-3 py-2 text-right"><Button size="sm" onClick={() => openCompany(t)}>Abrir <ChevronRight size={14} /></Button></td></tr>; })}</tbody></table></div></Card>
    </> : <>
      {!isCommercial && <div className="mb-3 flex justify-end"><Button onClick={() => setShowCommercialForm(value => !value)}><Plus size={16} /> Nuevo comercial</Button></div>}
      {showCommercialForm && <Card className="mb-4 p-4"><div className="grid gap-3 md:grid-cols-3"><Input placeholder="Nombre completo" value={newCommercial.nombre} onChange={e => setNewCommercial({ ...newCommercial, nombre: e.target.value })} /><Input type="email" placeholder="Email" value={newCommercial.email} onChange={e => setNewCommercial({ ...newCommercial, email: e.target.value })} /><Input placeholder="Teléfono" value={newCommercial.telefono} onChange={e => setNewCommercial({ ...newCommercial, telefono: e.target.value })} /></div><div className="mt-3 flex justify-end"><Button onClick={addCommercial}>Crear perfil</Button></div></Card>}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{comerciales.map(c => <Card key={c.id} className="p-5"><div className="flex items-start justify-between"><div className="flex items-center gap-3"><div className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-indigo-600 to-cyan-500 font-bold text-white">{c.nombre.split(" ").map(x => x[0]).join("").slice(0, 2)}</div><div><div className="font-bold text-slate-900">{c.nombre}</div><div className="text-xs text-slate-500">{c.cargo}</div></div></div><Badge variant="success">{c.estado}</Badge></div><div className="mt-4 space-y-2 text-xs text-slate-600"><div className="flex items-center gap-2"><Mail size={14} /> {c.email}</div><div className="flex items-center gap-2"><Phone size={14} /> {c.telefono || "Sin teléfono"}</div></div><div className="mt-4 grid grid-cols-2 gap-2 border-t pt-3 text-center"><div><div className="text-lg font-bold text-indigo-700">{c.oportunidades}</div><div className="text-[10px] uppercase text-slate-500">Oportunidades</div></div><div><div className="text-lg font-bold text-green-600">{c.meta}%</div><div className="text-[10px] uppercase text-slate-500">Meta</div></div></div></Card>)}</div>
    </>}
  </Section>;
}
