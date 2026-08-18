import { useState, useEffect } from "react";
import { ChevronLeft, Landmark, Settings, DollarSign, Calendar, FileText, Users, AlertTriangle, Key, Trash2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge as UIBadge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import Section from "@/components/Section";
import { SB, HOY, addDias, fmtFechaCorta, money } from "@/lib/data";

export function VClienteDetalle({t,showToast,onBack,onChanged}){
  const [pagos,setPagos]=useState([]);
  const [users,setUsers]=useState([]);
  const [loading,setLoading]=useState(true);
  const [meta,setMeta]=useState({plan:t.plan||"basico",precio:t.precio||0,max_usuarios:t.max_usuarios||5,vence:t.vence||"",notas:t.notas||""});
  const [savingMeta,setSavingMeta]=useState(false);
  const [pago,setPago]=useState({fecha:HOY(),monto:"",metodo:"Transferencia",nota:""});
  const [savingPago,setSavingPago]=useState(false);
  const [resetFor,setResetFor]=useState(null); // usuario al que se le resetea la clave
  const [newPass,setNewPass]=useState("");
  const [delOpen,setDelOpen]=useState(false); // diálogo de "eliminar empresa"
  const [delText,setDelText]=useState("");    // el dueño debe escribir el nombre para confirmar
  const [borrando,setBorrando]=useState(false);

  const cargar=async()=>{
    setLoading(true);
    const [p,u]=await Promise.all([SB.listPagos(t.id),SB.loadUsuarios(t.id)]);
    setPagos(p.data||[]); setUsers(u.data||[]);
    setLoading(false);
  };
  useEffect(()=>{cargar();/* eslint-disable-next-line */},[t.id]);

  const estado=!meta.vence?{txt:"Sin fecha",v:"secondary"}:meta.vence>=HOY()?{txt:"Al día",v:"success"}:{txt:"Vencido / Debe",v:"destructive"};

  const guardarMeta=async()=>{
    setSavingMeta(true);
    try{
      const patch={plan:meta.plan||"basico",precio:Number(meta.precio)||0,max_usuarios:Number(meta.max_usuarios)||0,vence:meta.vence||null,notas:meta.notas||null};
      const {error}=await SB.updateTenant(t.id,patch); if(error)throw error;
      Object.assign(t,patch); onChanged&&onChanged();
      showToast("Datos del cliente guardados ✓");
    }catch(e){showToast(e.message||"No se pudo guardar","err");}
    setSavingMeta(false);
  };

  const registrarPago=async()=>{
    if(!(Number(pago.monto)>0))return showToast("Ingresa un monto válido","err");
    setSavingPago(true);
    try{
      // El período corre automático: inicia en la fecha de pago y vence a los 30 días.
      const desde=pago.fecha||HOY();
      const hasta=addDias(desde,30);
      const row={tenant_id:t.id,fecha:desde,monto:Number(pago.monto),periodo_desde:desde,periodo_hasta:hasta,metodo:pago.metodo||null,nota:pago.nota||null};
      const {error}=await SB.insertPago(row); if(error)throw error;
      const {error:e2}=await SB.updateTenant(t.id,{vence:hasta});
      if(!e2){setMeta(m=>({...m,vence:hasta}));Object.assign(t,{vence:hasta});onChanged&&onChanged();}
      setPago({fecha:HOY(),monto:"",metodo:pago.metodo,nota:""});
      await cargar();
      showToast(`Pago registrado ✓ · vence ${fmtFechaCorta(hasta)}`);
    }catch(e){showToast(e.message||"No se pudo registrar el pago","err");}
    setSavingPago(false);
  };
  const borrarPago=async(id)=>{try{const {error}=await SB.deletePago(id);if(error)throw error;await cargar();showToast("Pago eliminado","warn");}catch(e){showToast(e.message||"Error","err");}};

  const toggleUser=async(u)=>{try{const {error}=await SB.setMemberActive(u.id,!u.activo);if(error)throw error;await cargar();showToast(u.activo?"Usuario bloqueado":"Usuario activado","warn");}catch(e){showToast(e.message||"Error","err");}};
  const resetear=async()=>{
    if(newPass.length<6)return showToast("La clave debe tener al menos 6 caracteres","err");
    try{const {error}=await SB.resetMemberPassword(resetFor.id,newPass);if(error)throw error;setResetFor(null);setNewPass("");showToast("Clave restablecida ✓");}catch(e){showToast(e.message||"Error","err");}
  };
  // Elimina la empresa y TODO lo suyo (usuarios+auth, productos, inventarios, conteos, pagos, config).
  const eliminarEmpresa=async()=>{
    if(delText.trim()!==(t.nombre||"").trim())return showToast("El nombre no coincide","err");
    setBorrando(true);
    try{
      const {error}=await SB.deleteTenant(t.id); if(error)throw error;
      setDelOpen(false);setDelText("");
      showToast("Empresa eliminada","warn");
      onChanged&&onChanged(); onBack&&onBack();
    }catch(e){showToast(e.message||"No se pudo eliminar la empresa","err");}
    setBorrando(false);
  };

  return(
    <Section>
      <div className="mb-4">
        <Button variant="ghost" size="sm" className="text-indigo-200 hover:text-white hover:bg-white/10 mb-2" onClick={onBack}><ChevronLeft size={16}/> Volver a Clientes</Button>
        <PageHeader label="Ficha del cliente" title={t.nombre} icon={Landmark} right={<UIBadge variant={estado.v} className="text-sm">{estado.txt}</UIBadge>}/>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Datos & plan */}
        <Card className="p-5">
          <div className="font-bold text-slate-900 mb-3 flex items-center gap-2"><Settings size={16}/> Datos y plan</div>
          <div className="grid grid-cols-2 gap-2 text-sm mb-3">
            <div><div className="text-xs text-muted-foreground">NIT</div><div className="font-medium">{t.nit||"—"}</div></div>
            <div><div className="text-xs text-muted-foreground">Identificador (slug)</div><div className="font-mono">{t.slug||"—"}</div></div>
            <div><div className="text-xs text-muted-foreground">Registrada</div><div className="font-medium">{(t.created_at||"").slice(0,10)||"—"}</div></div>
            <div><div className="text-xs text-muted-foreground">Estado empresa</div><div>{t.activo?<UIBadge variant="success">Activa</UIBadge>:<UIBadge variant="destructive">Inactiva</UIBadge>}</div></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1"><Label className="text-xs">Plan</Label><Input value={meta.plan} onChange={e=>setMeta(m=>({...m,plan:e.target.value}))}/></div>
            <div className="space-y-1"><Label className="text-xs">Precio mensual</Label><Input type="number" value={meta.precio} onChange={e=>setMeta(m=>({...m,precio:e.target.value}))}/></div>
            <div className="space-y-1"><Label className="text-xs">Máx. usuarios</Label><Input type="number" value={meta.max_usuarios} onChange={e=>setMeta(m=>({...m,max_usuarios:e.target.value}))}/></div>
            <div className="space-y-1"><Label className="text-xs">Vence</Label><Input type="date" value={meta.vence||""} onChange={e=>setMeta(m=>({...m,vence:e.target.value}))}/></div>
          </div>
          <div className="space-y-1 mt-3"><Label className="text-xs">Notas</Label><Input value={meta.notas} onChange={e=>setMeta(m=>({...m,notas:e.target.value}))} placeholder="Observaciones del cliente"/></div>
          <Button className="w-full mt-3" onClick={guardarMeta} disabled={savingMeta}>{savingMeta?"Guardando…":"Guardar datos"}</Button>
        </Card>

        {/* Registrar pago */}
        <Card className="p-5">
          <div className="font-bold text-slate-900 mb-3 flex items-center gap-2"><DollarSign size={16}/> Registrar pago</div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1"><Label className="text-xs">Fecha de pago</Label><Input type="date" value={pago.fecha} onChange={e=>setPago(p=>({...p,fecha:e.target.value}))}/></div>
            <div className="space-y-1"><Label className="text-xs">Monto</Label><Input type="number" value={pago.monto} onChange={e=>setPago(p=>({...p,monto:e.target.value}))} placeholder="0"/></div>
            <div className="space-y-1"><Label className="text-xs">Método</Label><Input value={pago.metodo} onChange={e=>setPago(p=>({...p,metodo:e.target.value}))}/></div>
            <div className="space-y-1"><Label className="text-xs">Nota</Label><Input value={pago.nota} onChange={e=>setPago(p=>({...p,nota:e.target.value}))}/></div>
          </div>
          <div className="mt-3 flex items-center gap-2 rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2 text-xs text-emerald-800">
            <Calendar size={14} className="shrink-0"/> El plan queda pagado por <b>30 días</b> · vence el <b>{fmtFechaCorta(addDias(pago.fecha||HOY(),30))}</b>
          </div>
          <Button className="w-full mt-3" onClick={registrarPago} disabled={savingPago}>{savingPago?"Registrando…":<><Plus size={15}/> Registrar pago</>}</Button>
        </Card>
      </div>

      {/* Historial de pagos */}
      <Card className="mt-4 overflow-hidden">
        <div className="px-5 pt-4 pb-2 font-bold text-slate-900 flex items-center gap-2"><FileText size={16}/> Historial de pagos <span className="text-xs font-normal text-muted-foreground">({pagos.length})</span></div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="bg-slate-50 text-slate-600 border-b border-slate-200">{["Fecha","Monto","Periodo","Método","Nota",""].map(h=><th key={h} className="px-3 py-2 text-left font-semibold text-xs whitespace-nowrap">{h}</th>)}</tr></thead>
            <tbody>
              {pagos.length===0?(<tr><td colSpan={6} className="px-3 py-6 text-center text-muted-foreground text-sm">Sin pagos registrados.</td></tr>):pagos.map(p=>(
                <tr key={p.id} className="border-b last:border-0 hover:bg-slate-50">
                  <td className="px-3 py-2 whitespace-nowrap">{(p.fecha||"").slice(0,10)}</td>
                  <td className="px-3 py-2 font-semibold text-emerald-700">{money(p.monto)}</td>
                  <td className="px-3 py-2 text-xs text-muted-foreground whitespace-nowrap">{p.periodo_desde?`${p.periodo_desde} → ${p.periodo_hasta||"?"}`:"—"}</td>
                  <td className="px-3 py-2 text-xs">{p.metodo||"—"}</td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">{p.nota||"—"}</td>
                  <td className="px-3 py-2"><button onClick={()=>borrarPago(p.id)} className="text-red-500 hover:text-red-700"><Trash2 size={14}/></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Usuarios de la empresa */}
      <Card className="mt-4 overflow-hidden">
        <div className="px-5 pt-4 pb-2 font-bold text-slate-900 flex items-center gap-2"><Users size={16}/> Usuarios
          <span className={`text-xs font-normal ${users.length>Number(meta.max_usuarios||0)?"text-red-600 font-semibold":"text-muted-foreground"}`}>({users.length}/{meta.max_usuarios||"∞"})</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="bg-slate-50 text-slate-600 border-b border-slate-200">{["Usuario","Rol","Email de acceso","Estado","Acciones"].map(h=><th key={h} className="px-3 py-2 text-left font-semibold text-xs whitespace-nowrap">{h}</th>)}</tr></thead>
            <tbody>
              {loading?(<tr><td colSpan={5} className="px-3 py-6 text-center text-muted-foreground">Cargando…</td></tr>):users.length===0?(<tr><td colSpan={5} className="px-3 py-6 text-center text-muted-foreground">Sin usuarios.</td></tr>):users.map(u=>(
                <tr key={u.id} className="border-b last:border-0 hover:bg-slate-50">
                  <td className="px-3 py-2 font-semibold text-slate-900">{u.nombre}</td>
                  <td className="px-3 py-2"><UIBadge variant="secondary">{u.rol}</UIBadge></td>
                  <td className="px-3 py-2 font-mono text-xs text-muted-foreground">{u.email||u.correo||"—"}</td>
                  <td className="px-3 py-2">{u.activo?<UIBadge variant="success">Activo</UIBadge>:<UIBadge variant="destructive">Bloqueado</UIBadge>}</td>
                  <td className="px-3 py-2">
                    <div className="flex gap-1.5">
                      <Button variant="outline" size="sm" className="h-7 px-2 text-xs" onClick={()=>toggleUser(u)}>{u.activo?"Bloquear":"Activar"}</Button>
                      <Button variant="outline" size="sm" className="h-7 px-2 text-xs" onClick={()=>{setResetFor(u);setNewPass("");}}><Key size={12}/> Clave</Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Zona de peligro — eliminar empresa */}
      <Card className="mt-4 p-5 border-red-200 bg-red-50/40">
        <div className="font-bold text-red-700 mb-1 flex items-center gap-2"><AlertTriangle size={16}/> Zona de peligro</div>
        <div className="text-sm text-red-800/80 mb-3">Eliminar esta empresa borra <b>de forma permanente</b> sus usuarios, productos, inventarios, conteos, pagos y configuración. No se puede deshacer.</div>
        <Button variant="outline" className="text-destructive border-red-300 hover:bg-red-100 hover:text-destructive" onClick={()=>{setDelText("");setDelOpen(true);}}>
          <Trash2 size={15}/> Eliminar empresa
        </Button>
      </Card>

      <Dialog open={!!resetFor} onOpenChange={o=>{if(!o){setResetFor(null);setNewPass("");}}}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Restablecer clave de {resetFor?.nombre}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5"><Label>Nueva clave</Label><Input value={newPass} onChange={e=>setNewPass(e.target.value)} placeholder="mín. 6 caracteres"/></div>
            <Button className="w-full" onClick={resetear}><Key size={15}/> Restablecer</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={delOpen} onOpenChange={o=>{if(!o){setDelOpen(false);setDelText("");}}}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="text-red-700 flex items-center gap-2"><AlertTriangle size={18}/> Eliminar «{t.nombre}»</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="text-sm text-slate-700">Esto borra <b>permanentemente</b> la empresa y todos sus datos y accesos. No se puede deshacer.</div>
            <div className="space-y-1.5">
              <Label>Para confirmar, escribe el nombre exacto: <span className="font-mono font-bold">{t.nombre}</span></Label>
              <Input value={delText} onChange={e=>setDelText(e.target.value)} placeholder={t.nombre}/>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={()=>{setDelOpen(false);setDelText("");}}>Cancelar</Button>
              <Button className="flex-1 bg-red-600 hover:bg-red-700 text-white" disabled={borrando||delText.trim()!==(t.nombre||"").trim()} onClick={eliminarEmpresa}>{borrando?"Eliminando…":<><Trash2 size={15}/> Eliminar</>}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Section>
  );
}
