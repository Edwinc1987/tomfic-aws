import { useEffect, useState } from "react";
import { crmApi } from "../api/crmApi";

export function CrmPage({ tenantId }) {
  const [tab, setTab] = useState("activities");
  const [profile, setProfile] = useState(null);
  const [dashboard, setDashboard] = useState(null);
  const [contacts, setContacts] = useState([]);
  const [activities, setActivities] = useState([]);
  const [payments, setPayments] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [health, setHealth] = useState(null);
  const [audit, setAudit] = useState([]);
  const [stage, setStage] = useState("");
  const [contactName, setContactName] = useState("");
  const [activityTitle, setActivityTitle] = useState("");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [ticketTitle, setTicketTitle] = useState("");
  const [error, setError] = useState("");

  const load = async () => {
    if (!tenantId) return;
    try {
      setError("");
      const [profileData, dashboardData, contactsData, activitiesData, paymentsData, ticketsData, healthData, auditData] = await Promise.all([
        crmApi.profile(tenantId), crmApi.dashboard(tenantId), crmApi.contacts(tenantId),
        crmApi.activities(tenantId), crmApi.payments(tenantId), crmApi.tickets(tenantId), crmApi.health(tenantId), crmApi.audit(tenantId),
      ]);
      setProfile(profileData); setStage(profileData.stage || ""); setDashboard(dashboardData);
      setContacts(contactsData); setActivities(activitiesData); setPayments(paymentsData);
      setTickets(ticketsData); setHealth(healthData);
      setAudit(auditData);
    } catch (loadError) { setError(loadError.message || "No se pudo cargar el CRM"); }
  };

  useEffect(() => { load(); }, [tenantId]);

  const addContact = async () => { if (!contactName.trim()) return; await crmApi.createContact(tenantId, { name: contactName }); setContactName(""); await load(); };
  const addActivity = async () => { if (!activityTitle.trim()) return; await crmApi.createActivity(tenantId, { type: "FOLLOW_UP", title: activityTitle }); setActivityTitle(""); await load(); };
  const addPayment = async () => { if (!(Number(paymentAmount) > 0)) return; await crmApi.createPayment(tenantId, { amount: Number(paymentAmount) }); setPaymentAmount(""); await load(); };
  const addTicket = async () => { if (!ticketTitle.trim()) return; await crmApi.createTicket(tenantId, { title: ticketTitle, priority: "MEDIUM" }); setTicketTitle(""); await load(); };
  const updateStage = async () => { if (!stage) return; await crmApi.changeStage(tenantId, stage); await load(); };

  const tabs = [["activities", "Actividades"], ["contacts", "Contactos"], ["payments", "Pagos"], ["tickets", "Soporte"], ["health", "Salud"], ["audit", "Auditoría"]];
  return <section aria-label="CRM" className="space-y-4">
    <header className="flex flex-wrap items-end justify-between gap-3">
      <div><p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">Panel del dueño</p><h1 className="text-2xl font-bold text-slate-900">{profile?.name || "CRM de clientes"}</h1><p className="text-sm text-slate-500">Ficha 360 · {profile?.stage || "Cargando etapa"} · Plan {profile?.plan || "—"}</p></div>
      <div className="flex items-center gap-2"><select value={stage} onChange={event => setStage(event.target.value)} className="rounded border border-slate-300 bg-white px-3 py-2 text-sm"><option value="">Etapa comercial</option><option value="PROSPECTO">Prospecto</option><option value="DEMO">Demo</option><option value="PRUEBA">Prueba</option><option value="ACTIVO">Activo</option><option value="EN_RIESGO">En riesgo</option><option value="SUSPENDIDO">Suspendido</option><option value="RETIRADO">Retirado</option></select><button onClick={updateStage} className="rounded bg-indigo-600 px-3 py-2 text-sm font-semibold text-white">Guardar etapa</button></div>
    </header>
    {error && <div role="alert" className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
    {dashboard && <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">{[["Empresas", dashboard.totalCompanies, "text-indigo-700"], ["Activas", dashboard.activeCompanies, "text-green-700"], ["Renuevan pronto", dashboard.renewalsNext30Days, "text-amber-700"], ["Vencidas", dashboard.overdue, "text-red-700"], ["Ingreso mensual", `$${dashboard.monthlyRevenue.toLocaleString("es-CO")}`, "text-cyan-700"]].map(([label, value, color]) => <div key={label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><div className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{label}</div><div className={`mt-1 text-2xl font-extrabold ${color}`}>{value}</div></div>)}</div>}
    <div className="flex flex-wrap gap-2 border-b border-slate-200">{tabs.map(([id, label]) => <button key={id} className={`border-b-2 px-3 py-2 text-sm font-semibold ${tab === id ? "border-indigo-600 text-indigo-700" : "border-transparent text-slate-500"}`} onClick={() => setTab(id)}>{label}</button>)}</div>
    {tab === "contacts" && <Panel title="Contactos" input={contactName} setInput={setContactName} placeholder="Nombre del contacto" action={addContact} actionLabel="Añadir" items={contacts} render={contact => <><div className="font-semibold">{contact.name}</div><div className="text-xs text-slate-500">{contact.email || "Sin correo"} · {contact.phone || "Sin teléfono"}</div></>} />}
    {tab === "activities" && <Panel title="Actividades" input={activityTitle} setInput={setActivityTitle} placeholder="Nueva actividad" action={addActivity} actionLabel="Registrar" items={activities} render={activity => <><div className="font-semibold">{activity.title}</div><div className="text-xs uppercase text-slate-500">{activity.type}</div></>} />}
    {tab === "payments" && <Panel title="Pagos" input={paymentAmount} setInput={setPaymentAmount} placeholder="Monto del pago" action={addPayment} actionLabel="Registrar pago" type="number" items={payments} render={payment => <><span className="font-semibold">{payment.amount}</span><span className="text-xs text-slate-500">{String(payment.paidAt).slice(0, 10)}</span></>} />}
    {tab === "tickets" && <Panel title="Soporte" input={ticketTitle} setInput={setTicketTitle} placeholder="Nuevo ticket de soporte" action={addTicket} actionLabel="Crear ticket" items={tickets} render={ticket => <><div><div className="font-semibold">{ticket.title}</div><div className="text-xs text-slate-500">{ticket.description || "Sin descripción"}</div></div><span className="text-xs uppercase text-amber-700">{ticket.status}</span></>} />}
    {tab === "health" && <div className="rounded-lg border bg-white p-5">{health ? <><div className="text-xs font-bold uppercase text-slate-500">Riesgo</div><div className="mt-1 text-2xl font-extrabold text-indigo-700">{health.risk}</div><div className="mt-4 grid grid-cols-3 gap-3 text-center"><Metric label="Score" value={health.score} /><Metric label="Usuarios" value={health.activeUsers} /><Metric label="Inventarios" value={health.activeInventories} /></div></> : <div className="text-sm text-slate-500">Aún no hay datos de salud para esta empresa.</div>}</div>}
    {tab === "audit" && <div className="rounded-lg border bg-white p-5"><h2 className="mb-4 text-lg font-bold">Historial de cambios</h2><div className="space-y-3">{audit.length ? audit.map(event => <div key={event.id} className="border-l-2 border-indigo-500 pl-3"><div className="font-semibold text-slate-800">{event.action}</div><div className="text-xs text-slate-500">{event.entityType} · {String(event.createdAt).replace("T", " ").slice(0, 19)}</div></div>) : <div className="text-sm text-slate-500">No hay eventos registrados.</div>}</div></div>}
  </section>;
}

function Panel({ title, input, setInput, placeholder, action, actionLabel, items, render, type = "text" }) {
  return <div className="rounded-lg border bg-white p-4"><h2 className="mb-3 text-lg font-bold">{title}</h2><div className="mb-4 flex gap-2"><input type={type} value={input} onChange={event => setInput(event.target.value)} placeholder={placeholder} className="flex-1 rounded border px-3 py-2 text-sm" /><button onClick={action} className="rounded bg-indigo-600 px-3 py-2 text-sm font-semibold text-white">{actionLabel}</button></div><div className="space-y-2">{items.map(item => <div key={item.id} className="flex justify-between rounded border p-3">{render(item)}</div>)}</div></div>;
}

function Metric({ label, value }) { return <div><div className="text-xl font-bold">{value}</div><div className="text-xs text-slate-500">{label}</div></div>; }
