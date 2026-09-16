import { useEffect, useState } from "react";
import { crmApi } from "../api/crmApi";

export function CrmPage({tenantId}){
  const [tab,setTab]=useState("activities");
  const [contacts,setContacts]=useState([]);
  const [activities,setActivities]=useState([]);
  const [profile,setProfile]=useState(null);
  const [error,setError]=useState("");
  const [contactName,setContactName]=useState("");
  const [activityTitle,setActivityTitle]=useState("");

  const load=async()=>{
    if(!tenantId)return;
    try{setError("");const [profileData,contactsData,activitiesData]=await Promise.all([crmApi.profile(tenantId),crmApi.contacts(tenantId),crmApi.activities(tenantId)]);setProfile(profileData);setContacts(contactsData);setActivities(activitiesData);}catch(error){setError(error.message||"No se pudo cargar el CRM");}
  };
  useEffect(()=>{load();},[tenantId]);

  const addContact=async()=>{if(!contactName.trim())return;await crmApi.createContact(tenantId,{name:contactName});setContactName("");await load();};
  const addActivity=async()=>{if(!activityTitle.trim())return;await crmApi.createActivity(tenantId,{type:"FOLLOW_UP",title:activityTitle});setActivityTitle("");await load();};

  return <section aria-label="CRM" className="space-y-4">
    <header><p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">Panel del dueño</p><h1 className="text-2xl font-bold text-slate-900">{profile?.name||"CRM de clientes"}</h1><p className="text-sm text-slate-500">Ficha 360 · {profile?.stage||"Cargando etapa"} · Plan {profile?.plan||"—"}</p></header>
    {error&&<div role="alert" className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
    <div className="flex gap-2 border-b border-slate-200"><button className={`border-b-2 px-3 py-2 text-sm font-semibold ${tab==="activities"?"border-indigo-600 text-indigo-700":"border-transparent text-slate-500"}`} onClick={()=>setTab("activities")}>Actividades</button><button className={`border-b-2 px-3 py-2 text-sm font-semibold ${tab==="contacts"?"border-indigo-600 text-indigo-700":"border-transparent text-slate-500"}`} onClick={()=>setTab("contacts")}>Contactos</button></div>
    {tab==="contacts"?<div className="rounded-lg border bg-white p-4"><div className="mb-4 flex gap-2"><input value={contactName} onChange={event=>setContactName(event.target.value)} placeholder="Nombre del contacto" className="flex-1 rounded border px-3 py-2 text-sm"/><button onClick={addContact} className="rounded bg-indigo-600 px-3 py-2 text-sm font-semibold text-white">Añadir</button></div><div className="space-y-2">{contacts.map(contact=><div key={contact.id} className="rounded border p-3"><div className="font-semibold">{contact.name}</div><div className="text-xs text-slate-500">{contact.email||"Sin correo"} · {contact.phone||"Sin teléfono"}</div></div>)}</div></div>:<div className="rounded-lg border bg-white p-4"><div className="mb-4 flex gap-2"><input value={activityTitle} onChange={event=>setActivityTitle(event.target.value)} placeholder="Nueva actividad" className="flex-1 rounded border px-3 py-2 text-sm"/><button onClick={addActivity} className="rounded bg-indigo-600 px-3 py-2 text-sm font-semibold text-white">Registrar</button></div><div className="space-y-2">{activities.map(activity=><div key={activity.id} className="rounded border p-3"><div className="font-semibold">{activity.title}</div><div className="text-xs uppercase text-slate-500">{activity.type}</div></div>)}</div></div>}
  </section>;
}
