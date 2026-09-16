import { useEffect, useState } from "react";
import { crmApi } from "../api/crmApi";

export function CrmPage({tenantId}){
  const [tab,setTab]=useState("activities");
  const [contacts,setContacts]=useState([]);
  const [activities,setActivities]=useState([]);
  const [payments,setPayments]=useState([]);
  const [profile,setProfile]=useState(null);
  const [stage,setStage]=useState("");
  const [dashboard,setDashboard]=useState(null);
  const [error,setError]=useState("");
  const [contactName,setContactName]=useState("");
  const [activityTitle,setActivityTitle]=useState("");
  const [paymentAmount,setPaymentAmount]=useState("");

  const load=async()=>{
    if(!tenantId)return;
    try{setError("");const [profileData,dashboardData,contactsData,activitiesData,paymentsData]=await Promise.all([crmApi.profile(tenantId),crmApi.dashboard(tenantId),crmApi.contacts(tenantId),crmApi.activities(tenantId),crmApi.payments(tenantId)]);setProfile(profileData);setStage(profileData.stage||"");setDashboard(dashboardData);setContacts(contactsData);setActivities(activitiesData);setPayments(paymentsData);}catch(error){setError(error.message||"No se pudo cargar el CRM");}
  };
  useEffect(()=>{load();},[tenantId]);

  const addContact=async()=>{if(!contactName.trim())return;await crmApi.createContact(tenantId,{name:contactName});setContactName("");await load();};
  const addActivity=async()=>{if(!activityTitle.trim())return;await crmApi.createActivity(tenantId,{type:"FOLLOW_UP",title:activityTitle});setActivityTitle("");await load();};
  const addPayment=async()=>{if(!(Number(paymentAmount)>0))return;await crmApi.createPayment(tenantId,{amount:Number(paymentAmount)});setPaymentAmount("");await load();};
  const updateStage=async()=>{if(!stage)return;await crmApi.changeStage(tenantId,stage);await load();};

  return <section aria-label="CRM" className="space-y-4">
    <header className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">Panel del dueño</p><h1 className="text-2xl font-bold text-slate-900">{profile?.name||"CRM de clientes"}</h1><p className="text-sm text-slate-500">Ficha 360 · {profile?.stage||"Cargando etapa"} · Plan {profile?.plan||"—"}</p></div><div className="flex items-center gap-2"><select value={stage} onChange={event=>setStage(event.target.value)} className="rounded border border-slate-300 bg-white px-3 py-2 text-sm"><option value="">Etapa comercial</option><option value="PROSPECTO">Prospecto</option><option value="DEMO">Demo</option><option value="PRUEBA">Prueba</option><option value="ACTIVO">Activo</option><option value="EN_RIESGO">En riesgo</option><option value="SUSPENDIDO">Suspendido</option><option value="RETIRADO">Retirado</option></select><button onClick={updateStage} className="rounded bg-indigo-600 px-3 py-2 text-sm font-semibold text-white">Guardar etapa</button></div></header>
    {error&&<div role="alert" className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
    {dashboard&&<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">{[["Empresas",dashboard.totalCompanies,"text-indigo-700"],["Activas",dashboard.activeCompanies,"text-green-700"],["Renuevan pronto",dashboard.renewalsNext30Days,"text-amber-700"],["Vencidas",dashboard.overdue,"text-red-700"],["Ingreso mensual",`$${dashboard.monthlyRevenue.toLocaleString("es-CO")}`,"text-cyan-700"]].map(([label,value,color])=><div key={label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><div className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{label}</div><div className={`mt-1 text-2xl font-extrabold ${color}`}>{value}</div></div>)}</div>}
    <div className="flex gap-2 border-b border-slate-200"><button className={`border-b-2 px-3 py-2 text-sm font-semibold ${tab==="activities"?"border-indigo-600 text-indigo-700":"border-transparent text-slate-500"}`} onClick={()=>setTab("activities")}>Actividades</button><button className={`border-b-2 px-3 py-2 text-sm font-semibold ${tab==="contacts"?"border-indigo-600 text-indigo-700":"border-transparent text-slate-500"}`} onClick={()=>setTab("contacts")}>Contactos</button><button className={`border-b-2 px-3 py-2 text-sm font-semibold ${tab==="payments"?"border-indigo-600 text-indigo-700":"border-transparent text-slate-500"}`} onClick={()=>setTab("payments")}>Pagos</button></div>
    {tab==="contacts"?<div className="rounded-lg border bg-white p-4"><div className="mb-4 flex gap-2"><input value={contactName} onChange={event=>setContactName(event.target.value)} placeholder="Nombre del contacto" className="flex-1 rounded border px-3 py-2 text-sm"/><button onClick={addContact} className="rounded bg-indigo-600 px-3 py-2 text-sm font-semibold text-white">Añadir</button></div><div className="space-y-2">{contacts.map(contact=><div key={contact.id} className="rounded border p-3"><div className="font-semibold">{contact.name}</div><div className="text-xs text-slate-500">{contact.email||"Sin correo"} · {contact.phone||"Sin teléfono"}</div></div>)}</div></div>:tab==="payments"?<div className="rounded-lg border bg-white p-4"><div className="mb-4 flex gap-2"><input type="number" min="0" value={paymentAmount} onChange={event=>setPaymentAmount(event.target.value)} placeholder="Monto del pago" className="flex-1 rounded border px-3 py-2 text-sm"/><button onClick={addPayment} className="rounded bg-indigo-600 px-3 py-2 text-sm font-semibold text-white">Registrar pago</button></div><div className="space-y-2">{payments.map(payment=><div key={payment.id} className="flex justify-between rounded border p-3"><span className="font-semibold">{payment.amount}</span><span className="text-xs text-slate-500">{String(payment.paidAt).slice(0,10)}</span></div>)}</div></div>:<div className="rounded-lg border bg-white p-4"><div className="mb-4 flex gap-2"><input value={activityTitle} onChange={event=>setActivityTitle(event.target.value)} placeholder="Nueva actividad" className="flex-1 rounded border px-3 py-2 text-sm"/><button onClick={addActivity} className="rounded bg-indigo-600 px-3 py-2 text-sm font-semibold text-white">Registrar</button></div><div className="space-y-2">{activities.map(activity=><div key={activity.id} className="rounded border p-3"><div className="font-semibold">{activity.title}</div><div className="text-xs uppercase text-slate-500">{activity.type}</div></div>)}</div></div>}
  </section>;
}
