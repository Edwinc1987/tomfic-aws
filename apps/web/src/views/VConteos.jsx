import { useState } from "react";
import {
  FolderOpen, AlertTriangle, Plus, FileText, Trash2,
  RefreshCw, ChevronRight, Scale, Eye, CheckCircle, X, MapPin, Pencil,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge as UIBadge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { PageHeader } from "@/components/ui/page-header";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import Section from "@/components/Section";
import EstBadge from "@/components/EstBadge";
import { G, TODAY, ID, conteosReales, rondaCerrada, conteoCompleto } from "@/lib/data";

// ── CONTEOS ──
export function VConteos({G,rerender,showToast,usuario,recargar}){
  const [modal,setModal]=useState(false);
  const [modalMod,setModalMod]=useState(null); // conteo a modificar
  const [form,setForm]=useState({nombre:"",locId:"",usuarioC1:"",usuarioC2:""});
  const [modForm,setModForm]=useState({obs:"",usuarioC1:"",usuarioC2:""});
  const [editC2,setEditC2]=useState(null);
  const [c2Val,setC2Val]=useState("");
  const [modalCaps,setModalCaps]=useState(null); // {conteoId, ronda, nombre}
  const [busqCaps,setBusqCaps]=useState("");
  const [modalComp,setModalComp]=useState(null); // conteo para comparativo
  const [busqComp,setBusqComp]=useState("");
  const [locExpandida,setLocExpandida]=useState(null);
  const caps=Object.values(G.capturas);
  const usuariosInv=G.usuarios.filter(u=>u.activo&&(u.rol==="admin"||u.inventario_id===G.inventario?.id));
  const getCapsRonda=(conteoId,ronda)=>caps.filter(c=>c.conteoId===conteoId&&c.ronda===ronda);
  const locKey=x=>`${x?.ubicacion||""}|${x?.localizacion||""}|${x?.nro||""}`;
  const locUsada=l=>G.conteos.some(c=>c.tipo!=="ajuste"&&(c.locId===l.id||locKey(c)===locKey(l)));
  const locDisponibles=G.localizaciones.filter(l=>!locUsada(l));

  const crear=()=>{
    if(!G.inventario)return showToast("Primero crea un inventario","err");
    if(!form.nombre.trim()||!form.locId||!form.usuarioC1)return showToast("Completa nombre, localización y usuario C1","err");
    const loc=G.localizaciones.find(l=>l.id===form.locId);
    if(!loc)return showToast("La ubicación ya no está disponible. Actualiza la lista e inténtalo de nuevo.","err");
    if(loc&&locUsada(loc))return showToast("Esta ubicación ya fue utilizada en un conteo","err");
    G.conteos.push({
      id:ID(),nombre:form.nombre,locId:form.locId,
      locLabel:`${loc.ubicacion} › ${loc.localizacion} › ${loc.nro}`,
      ubicacion:loc.ubicacion,localizacion:loc.localizacion,nro:loc.nro,
      obs:"",
      tipo:G.inventario.tipo,
      usuarioC1:form.usuarioC1,usuarioC2:form.usuarioC2||"",usuarioC3:"",
      estado:"pendiente",
      // Rondas cerradas independientemente
      rondasCerradas:[],
      fechaCreacion:TODAY(),
    });
    setModal(false);setForm({nombre:"",locId:"",usuarioC1:"",usuarioC2:""});
    rerender();showToast("Conteo programado ✓");
  };

  const guardarMod=()=>{
    if(!modForm.usuarioC1)return showToast("El usuario C1 es requerido","err");
    G.conteos=G.conteos.map(c=>c.id===modalMod.id?{...c,obs:modForm.obs,usuarioC1:modForm.usuarioC1,usuarioC2:modForm.usuarioC2}:c);
    setModalMod(null);rerender();showToast("Conteo actualizado ✓");
  };

  const guardarC2=(id)=>{
    if(!c2Val)return showToast("Selecciona un usuario","err");
    G.conteos=G.conteos.map(c=>c.id===id?{...c,usuarioC2:c2Val}:c);
    setEditC2(null);setC2Val("");rerender();showToast("Usuario C2 asignado ✓");
  };

  const asignarC3=(id,u)=>{
    G.conteos=G.conteos.map(c=>c.id===id?{...c,usuarioC3:u,estado:"enC3"}:c);
    rerender();showToast("C3 asignado ✓");
  };

  const [modalReabrir,setModalReabrir]=useState(null);
  const reabrirRonda=async(c,ronda)=>{
    // Después de asignar o cerrar C3 el proceso queda terminado: no se
    // permite reabrir C1, C2 ni C3 desde esta vista.
    const c3Cerrado=(c.rondasCerradas||[]).includes("C3");
    if(c3Cerrado){
      setModalReabrir(null);return showToast("Este conteo ya pasó por C3 y no puede reabrirse","err");
    }
    const {data,error}=await SB.reopenConteoRound(c.id,ronda);
    if(error)return showToast(error.message||"No se pudo reabrir la ronda","err");
    const rc=Array.isArray(data?.rondas_cerradas)?data.rondas_cerradas:JSON.parse(data?.rondas_cerradas||"[]");
    let nuevoEstado;
    if(ronda==="C1")nuevoEstado="enCurso";
    else if(ronda==="C2")nuevoEstado=rc.includes("C1")?"cerradoC1":"enCurso";
    else if(ronda==="C3")nuevoEstado="diferencia";
    G.conteos=G.conteos.map(x=>x.id===c.id?{...x,estado:nuevoEstado,rondasCerradas:rc,c1Cerrado:rc.includes("C1"),c2Cerrado:rc.includes("C2"),c3Cerrado:rc.includes("C3")}:x);
    setModalReabrir(null);rerender();showToast(`${ronda} reabierto ✓`,"warn");
  };
  // Eliminar un conteo completo (cualquier estado) + todas sus capturas.
  const borrarConteo=(c)=>{
    const nCaps=Object.values(G.capturas).filter(x=>x.conteoId===c.id).length;
    if(!window.confirm(`¿Eliminar el conteo «${c.nombre}»${nCaps?` y sus ${nCaps} captura${nCaps===1?"":"s"}`:""}? Esta acción no se puede deshacer.`))return;
    G.conteos=G.conteos.filter(x=>x.id!==c.id);
    Object.keys(G.capturas).forEach(k=>{if(G.capturas[k].conteoId===c.id)delete G.capturas[k];});
    rerender();showToast("Conteo eliminado","warn");
  };
  // Qué rondas se pueden reabrir según lo ya cerrado
  const rondasReabribles=(c)=>{
    const r=[];const rc=c.rondasCerradas||[];
    if(rc.includes("C3"))return r;
    if(rondaCerrada(c,"C1"))r.push("C1");
    if(c.tipo==="2conteos"&&rondaCerrada(c,"C2"))r.push("C2");
    if(c.usuarioC3&&c.estado==="completado")r.push("C3");
    return r;
  };

  const stC={pendiente:"#64748b",enCurso:"#2563eb",cerradoC1:"#d97706",cerradoC2:"#16a34a",diferencia:"#dc2626",enC3:"#7c3aed",completado:"#16a34a"};
  const stL={pendiente:"Pendiente",enCurso:"En curso",cerradoC1:"C1 cerrado",cerradoC2:"C2 cerrado",diferencia:"Diferencia",enC3:"En C3",completado:"Completado"};

  return(
    <Section>
      <PageHeader
        label="Rondas"
        title="Programación de Conteos"
        icon={FolderOpen}
        subtitle={G.inventario?.nombre||"Sin inventario activo"}
        count={G.conteos.length}
        countLabel="conteos"
      />

       <div className="view-sticky-controls flex items-center gap-3 mb-4 flex-wrap">
        <Button onClick={()=>setModal(true)} disabled={!G.inventario||G.productos.length===0}><Plus size={15}/> Programar Conteo</Button>
        {!G.inventario&&<span className="inline-flex items-center gap-1.5 rounded-md bg-red-50 px-2.5 py-1.5 text-xs text-destructive"><AlertTriangle size={13}/> Primero crea un inventario.</span>}
        {G.inventario&&G.productos.length===0&&<span className="inline-flex items-center gap-1.5 rounded-md bg-red-50 px-2.5 py-1.5 text-xs text-destructive"><AlertTriangle size={13}/> Primero carga la base de productos.</span>}
      </div>

      {G.conteos.length===0?(
        <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-white py-12 px-5 text-center text-muted-foreground">
          <FolderOpen size={48} className="text-slate-400 mb-3"/>
          <div className="text-base font-bold text-slate-900 mb-1.5">Sin conteos programados</div>
          <div className="text-sm">Crea el primer conteo para comenzar.</div>
        </div>
      ):(
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-[13px] min-w-[800px]">
              <thead>
                <tr className="bg-slate-50 text-slate-600 border-b border-slate-200">
                  {["Nombre","Ubicación","Tipo","C1","Estado C1","C2","Estado C2","C3","Estado C3","Estado","Acciones"].map(h=>(
                    <th key={h} className="px-3 py-1.5 text-left font-semibold whitespace-nowrap text-[11px]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {conteosReales().map((c)=>{
                  const rc=c.rondasCerradas||[];
                   const c1Cerrado=rondaCerrada(c,"C1");
                   const c2Cerrado=rondaCerrada(c,"C2");
                  const estCol=stC[c.estado]||"#6b7280";
                  const c3Caps=getCapsRonda(c.id,"C3").length;
                  return(
                    <tr key={c.id} className="border-b last:border-0 hover:bg-slate-50 align-middle">
                      <td className="px-3 py-1.5">
                        <div className="font-bold text-slate-900">{c.nombre}</div>
                        {c.obs&&<div className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1"><FileText size={10}/> {c.obs}</div>}
                      </td>
                      <td className="px-3 py-1.5 text-xs text-muted-foreground">{c.locLabel}</td>
                      <td className="px-3 py-1.5"><UIBadge className="border-transparent" style={{background:(c.tipo==="2conteos"?"#2563eb":"#16a34a")+"22",color:c.tipo==="2conteos"?"#2563eb":"#16a34a"}}>{c.tipo==="2conteos"?"2 Conteos":"1 Conteo"}</UIBadge></td>
                      <td className="px-3 py-1.5 font-semibold text-primary">{c.usuarioC1||"—"}</td>
                      <td className="px-3 py-1.5">
                        <button onClick={()=>c1Cerrado&&setModalCaps({conteoId:c.id,ronda:"C1",nombre:c.nombre})} title={c1Cerrado?"Ver capturas C1":""} disabled={!c1Cerrado}
                          className={`inline-flex items-center justify-center gap-1 min-w-[40px] h-6 rounded-md px-2 text-[10px] font-extrabold text-white ${c1Cerrado?"bg-green-600 hover:bg-green-700 cursor-pointer":"bg-slate-400 cursor-default"}`}>
                          {c1Cerrado?<>OK <Eye size={11}/></>:"?"}
                        </button>
                      </td>
                      <td className="px-3 py-1.5 font-semibold text-green-600">
                        {c.tipo==="2conteos"?(
                          c.usuarioC2?c.usuarioC2:(
                            <Button variant="outline" size="sm" className="h-7 px-2.5 text-xs text-amber-700 border-amber-300 bg-amber-50 hover:bg-amber-100 hover:text-amber-700" onClick={()=>{setEditC2(c.id);setC2Val("");}}><Plus size={12}/> Asignar</Button>
                          )
                        ):<span className="text-slate-300">N/A</span>}
                      </td>
                      <td className="px-3 py-1.5">
                        {c.tipo==="2conteos"&&c.usuarioC2?(
                          <button onClick={()=>c2Cerrado&&setModalCaps({conteoId:c.id,ronda:"C2",nombre:c.nombre})} title={c2Cerrado?"Ver capturas C2":""} disabled={!c2Cerrado}
                            className={`inline-flex items-center justify-center gap-1 min-w-[40px] h-6 rounded-md px-2 text-[10px] font-extrabold text-white ${c2Cerrado?"bg-green-600 hover:bg-green-700 cursor-pointer":"bg-slate-400 cursor-default"}`}>
                            {c2Cerrado?<>OK <Eye size={11}/></>:"?"}
                          </button>
                        ):<span className="text-slate-300 text-[11px]">—</span>}
                      </td>
                      <td className="px-3 py-1.5 font-semibold text-purple-600">
                        {c.usuarioC3?c.usuarioC3:(
                          c.estado==="diferencia"?<span className="text-destructive text-[11px] font-bold">Por asignar</span>:<span className="text-slate-300 text-[11px]">—</span>
                        )}
                      </td>
                      <td className="px-3 py-1.5">
                        {c.usuarioC3?(
                          <button onClick={()=>c3Caps>0&&setModalCaps({conteoId:c.id,ronda:"C3",nombre:c.nombre})} title="Ver capturas C3" disabled={c3Caps===0}
                            className={`inline-flex items-center justify-center gap-1 min-w-[40px] h-6 rounded-md px-2 text-[10px] font-extrabold text-white ${c.estado==="completado"?"bg-green-600 hover:bg-green-700":"bg-purple-600"} ${c3Caps>0?"cursor-pointer":"cursor-default"}`}>
                            {c.estado==="completado"?<>OK <Eye size={11}/></>:"…"}
                          </button>
                        ):<span className="text-slate-300 text-[11px]">—</span>}
                      </td>
                       <td className="px-3 py-1.5"><span title={stL[c.estado]||c.estado} aria-label={stL[c.estado]||c.estado} className="inline-flex h-7 w-7 items-center justify-center rounded-full" style={{background:estCol+"22",color:estCol}}>{conteoCompleto(c)?<CheckCircle size={15}/>:c.estado==="diferencia"?<AlertTriangle size={15}/>:<RefreshCw size={14}/>}</span></td>
                      <td className="px-3 py-1.5 whitespace-nowrap">
                        <div className="flex gap-1.5 items-center">
                           <Button variant="outline" size="icon" className="h-7 w-7" title="Modificar" aria-label="Modificar" onClick={()=>{setModalMod(c);setModForm({obs:c.obs||"",usuarioC1:c.usuarioC1,usuarioC2:c.usuarioC2||""});}}><Pencil size={13}/></Button>
                          {rondasReabribles(c).length>0&&(
                             <Button variant="outline" size="icon" className="h-7 w-7 text-amber-700 border-amber-200 hover:bg-amber-50 hover:text-amber-700" title="Reabrir" aria-label="Reabrir" onClick={()=>setModalReabrir(c)}><RefreshCw size={13}/></Button>
                          )}
                          {c.tipo==="2conteos"&&(
                             <Button variant="outline" size="icon" className="h-7 w-7 text-purple-700 border-purple-200 hover:bg-purple-50 hover:text-purple-700" title="Comparar" aria-label="Comparar" onClick={()=>{setBusqComp("");setModalComp(c);}}><Scale size={13}/></Button>
                          )}
                          {c.estado==="diferencia"&&!c.usuarioC3&&(
                            <Select onValueChange={v=>v&&asignarC3(c.id,v)}>
                              <SelectTrigger className="h-7 w-auto gap-1 px-2 text-xs"><SelectValue placeholder="+ C3"/></SelectTrigger>
                              <SelectContent>
                                 {usuariosInv.map(u=><SelectItem key={u.id} value={u.nombre}>{u.nombre}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          )}
                           <Button variant="outline" size="icon" className="h-7 w-7 text-destructive border-red-200 hover:bg-red-50 hover:text-destructive" title="Eliminar" aria-label="Eliminar" onClick={()=>borrarConteo(c)}><Trash2 size={13}/></Button>
                        </div>
                        {editC2===c.id&&(
                          <div className="mt-1.5 flex gap-1.5 items-center">
                            <Select value={c2Val||undefined} onValueChange={setC2Val}>
                              <SelectTrigger className="h-8 w-auto text-xs"><SelectValue placeholder="Usuario C2…"/></SelectTrigger>
                              <SelectContent>
                                 {usuariosInv.map(u=><SelectItem key={u.id} value={u.nombre}>{u.nombre}</SelectItem>)}
                              </SelectContent>
                            </Select>
                            <Button size="sm" className="h-8" onClick={()=>guardarC2(c.id)}>OK</Button>
                            <Button size="sm" variant="outline" className="h-8 px-2.5" onClick={()=>setEditC2(null)}><X size={13}/></Button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Modal programar */}
      <Dialog open={modal} onOpenChange={setModal}>
        <DialogContent className="max-w-md max-h-[92vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Programar Nuevo Conteo</DialogTitle></DialogHeader>
          <div className="space-y-3.5">
            <div className="space-y-1.5">
              <Label>Nombre del conteo</Label>
              <Input value={form.nombre} onChange={e=>setForm(p=>({...p,nombre:e.target.value}))} placeholder="Ej: Conteo Bodega Turno Mañana"/>
            </div>
             <div className="space-y-1.5">
               <Label>Ubicación pendiente de conteo</Label>
               <div className="max-h-56 space-y-1 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50 p-1.5">
                 {locDisponibles.length===0?<div className="px-3 py-4 text-center text-xs text-muted-foreground">No hay ubicaciones pendientes por programar.</div>:locDisponibles.map(l=>{
                   const abierta=locExpandida===l.id;
                   return <div key={l.id} className={`rounded-md ${form.locId===l.id?"bg-blue-100 ring-1 ring-blue-400":"bg-white"}`}>
                     <button type="button" onClick={()=>{setForm(p=>({...p,locId:l.id}));setLocExpandida(abierta?null:l.id);}} className="flex w-full items-start gap-2 rounded-md px-3 py-2 text-left text-xs hover:bg-slate-100"><MapPin size={14} className="mt-0.5 shrink-0 text-blue-700"/><span className="flex-1"><b>{l.ubicacion} › {l.localizacion} › {l.nro}</b>{l.observacion&&<span className="mt-0.5 block text-[11px] text-slate-500">{l.observacion}</span>}</span><span className="text-[11px] text-slate-500">{abierta?"⌃":"⌄"}</span></button>
                     {abierta&&<div className="grid gap-2 border-t border-blue-200 px-3 pb-3 pt-2 sm:grid-cols-2">
                       <Select value={form.usuarioC1||undefined} onValueChange={v=>setForm(p=>({...p,usuarioC1:v}))}><SelectTrigger className="h-8 bg-white text-xs"><SelectValue placeholder="Usuario C1 *"/></SelectTrigger><SelectContent>{usuariosInv.map(u=><SelectItem key={u.id} value={u.nombre}>{u.nombre}</SelectItem>)}</SelectContent></Select>
                       {G.inventario?.tipo==="2conteos"&&<Select value={form.usuarioC2||undefined} onValueChange={v=>setForm(p=>({...p,usuarioC2:v}))}><SelectTrigger className="h-8 bg-white text-xs"><SelectValue placeholder="Usuario C2 (opcional)"/></SelectTrigger><SelectContent>{usuariosInv.map(u=><SelectItem key={u.id} value={u.nombre}>{u.nombre}</SelectItem>)}</SelectContent></Select>}
                     </div>}
                   </div>;
                 })}
               </div>
             </div>
            <Button className="w-full" onClick={crear}><Plus size={16}/> Programar Conteo</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal modificar */}
      <Dialog open={!!modalMod} onOpenChange={(v)=>!v&&setModalMod(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Modificar: {modalMod?.nombre}</DialogTitle></DialogHeader>
          {modalMod&&(
          <div className="space-y-3.5">
            <div className="space-y-1.5">
              <Label>Observación del conteo</Label>
              <Input value={modForm.obs} onChange={e=>setModForm(p=>({...p,obs:e.target.value}))} placeholder="Ej: Contar productos de refrigeración"/>
            </div>
            <div className="space-y-1.5">
              <Label>Usuario — Conteo 1</Label>
              <Select value={modForm.usuarioC1||undefined} onValueChange={v=>setModForm(p=>({...p,usuarioC1:v}))}>
                <SelectTrigger><SelectValue placeholder="Seleccionar…"/></SelectTrigger>
                <SelectContent>{usuariosInv.map(u=><SelectItem key={u.id} value={u.nombre}>{u.nombre}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            {modalMod.tipo==="2conteos"&&(
              <div className="space-y-1.5">
                <Label>Usuario — Conteo 2</Label>
                <Select value={modForm.usuarioC2||undefined} onValueChange={v=>setModForm(p=>({...p,usuarioC2:v}))}>
                  <SelectTrigger><SelectValue placeholder="Sin asignar…"/></SelectTrigger>
                <SelectContent>{usuariosInv.map(u=><SelectItem key={u.id} value={u.nombre}>{u.nombre}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}
            <Button className="w-full" onClick={guardarMod}><CheckCircle size={16}/> Guardar cambios</Button>
          </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!modalReabrir} onOpenChange={(v)=>!v&&setModalReabrir(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>¿Qué conteo deseas reabrir?</DialogTitle></DialogHeader>
          {modalReabrir&&(<>
            <div className="text-sm text-muted-foreground -mt-1">
              Conteo: <b className="text-slate-900">{modalReabrir.nombre}</b> · {modalReabrir.locLabel}
            </div>
            <div className="flex flex-col gap-2.5">
              {rondasReabribles(modalReabrir).map(r=>{
                const col={C1:"#2563eb",C2:"#16a34a",C3:"#7c3aed"}[r];
                const quien=r==="C1"?modalReabrir.usuarioC1:r==="C2"?modalReabrir.usuarioC2:modalReabrir.usuarioC3;
                const txt={C1:"Conteo 1",C2:"Conteo 2",C3:"Conteo 3"}[r];
                return(
                  <button key={r} onClick={()=>reabrirRonda(modalReabrir,r)}
                    className="flex items-center justify-between rounded-lg border-2 bg-white px-4 py-3.5 text-left transition-colors hover:bg-slate-50" style={{borderColor:col}}>
                    <div>
                      <div className="flex items-center gap-1.5 font-bold text-[15px]" style={{color:col}}><RefreshCw size={15}/> Reabrir {txt}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">Usuario: {quien||"—"}</div>
                    </div>
                    <ChevronRight size={18} style={{color:col}}/>
                  </button>
                );
              })}
            </div>
            <Button variant="outline" className="w-full" onClick={()=>setModalReabrir(null)}>Cancelar</Button>
          </>)}
        </DialogContent>
      </Dialog>
      {modalCaps&&(()=>{
        const {conteoId,ronda,nombre}=modalCaps;
        const rCaps=getCapsRonda(conteoId,ronda);
        const porProd={};rCaps.forEach(c=>{if(!porProd[c.productoId])porProd[c.productoId]={...c,total:0};porProd[c.productoId].total+=c.cantidad;});
        const todo=Object.values(porProd);
        const q=busqCaps.trim().toLowerCase();
        const lista=q?todo.filter(c=>(c.codigo&&c.codigo.toLowerCase().includes(q))||(c.ean&&String(c.ean).toLowerCase().includes(q))||(c.nombre&&c.nombre.toLowerCase().includes(q))):todo;
        const cerrar=()=>{setBusqCaps("");setModalCaps(null);};
        return(
          <Dialog open onOpenChange={(v)=>!v&&cerrar()}>
            <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
              <DialogHeader><DialogTitle>{`${ronda} — ${nombre} (${lista.length}${q?" de "+todo.length:""} productos)`}</DialogTitle></DialogHeader>
              <Input value={busqCaps} onChange={e=>setBusqCaps(e.target.value)} placeholder="Buscar por código de barras o nombre…" autoFocus className="border-primary"/>
              <div className="max-h-[460px] overflow-y-auto rounded-lg border">
                <table className="w-full text-xs">
                  <thead><tr className="bg-slate-50 text-slate-600 border-b border-slate-200 sticky top-0">{["Código","Nombre","Referencia","Total","Estado","Usuario"].map(h=><th key={h} className="px-2.5 py-2 text-left font-semibold">{h}</th>)}</tr></thead>
                  <tbody>
                    {lista.length===0?(<tr><td colSpan={6} className="p-5 text-center text-muted-foreground">{q?`No se encontró "${busqCaps}"`:"Sin capturas"}</td></tr>):lista.map((c,i)=>(
                      <tr key={i} className="border-b last:border-0 hover:bg-slate-50">
                        <td className="px-2.5 py-1.5 font-mono text-primary font-bold">{c.codigo}</td>
                        <td className="px-2.5 py-1.5 font-medium">{c.nombre}</td>
                        <td className="px-2.5 py-1.5 text-muted-foreground text-[11px]">{c.referencia}</td>
                        <td className="px-2.5 py-1.5 text-center font-extrabold text-primary text-[15px]">{c.total}</td>
                        <td className="px-2.5 py-1.5"><EstBadge e={c.estado}/></td>
                        <td className="px-2.5 py-1.5 text-muted-foreground">{c.usuario}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </DialogContent>
          </Dialog>
        );
      })()}
      {modalComp&&(()=>{
        const c=modalComp;
        const ids=new Set(caps.filter(x=>x.conteoId===c.id).map(x=>x.productoId));
        const tot=(pid,r)=>caps.filter(x=>x.conteoId===c.id&&x.productoId===pid&&x.ronda===r).reduce((s,x)=>s+x.cantidad,0);
        const filas=[...ids].map(pid=>{
          const p=G.productos.find(x=>x.id===pid)||caps.find(x=>x.productoId===pid)||{};
          const t1=tot(pid,"C1"),t2=tot(pid,"C2"),t3=tot(pid,"C3");
          const difiere=t1!==t2;
          return{codigo:p.codigo||"",nombre:p.nombre||"",ean:p.ean||"",t1,t2,t3,difiere};
        }).sort((a,b)=>(a.nombre||"").localeCompare(b.nombre||""));
        const q=busqComp.trim().toLowerCase();
        const lista=q?filas.filter(f=>(f.codigo&&f.codigo.toLowerCase().includes(q))||(f.ean&&String(f.ean).toLowerCase().includes(q))||(f.nombre&&f.nombre.toLowerCase().includes(q))):filas;
        const nDif=filas.filter(f=>f.difiere).length;
        const cerrar=()=>{setBusqComp("");setModalComp(null);};
        return(
          <Dialog open onOpenChange={(v)=>!v&&cerrar()}>
            <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
              <DialogHeader><DialogTitle>Comparativo — {c.nombre}</DialogTitle></DialogHeader>
              <div className="flex gap-2 flex-wrap">
                <UIBadge className="border-transparent" style={{background:"#2563eb22",color:"#2563eb"}}>C1: {c.usuarioC1||"—"}</UIBadge>
                <UIBadge className="border-transparent" style={{background:"#16a34a22",color:"#16a34a"}}>C2: {c.usuarioC2||"—"}</UIBadge>
                {c.usuarioC3&&<UIBadge className="border-transparent" style={{background:"#7c3aed22",color:"#7c3aed"}}>C3: {c.usuarioC3}</UIBadge>}
                <UIBadge className="border-transparent" style={{background:(nDif>0?"#dc2626":"#16a34a")+"22",color:nDif>0?"#dc2626":"#16a34a"}}>{nDif} con diferencia</UIBadge>
              </div>
              <Input value={busqComp} onChange={e=>setBusqComp(e.target.value)} placeholder="Buscar por código o nombre…" className="border-purple-500"/>
              <div className="max-h-[460px] overflow-y-auto rounded-lg border">
                <table className="w-full text-xs">
                  <thead><tr className="bg-slate-50 text-slate-600 border-b border-slate-200 sticky top-0">{["Código","Nombre","C1","C2","C3","Dif"].map(h=><th key={h} className={`px-2.5 py-2 font-semibold ${h==="Código"||h==="Nombre"?"text-left":"text-center"}`}>{h}</th>)}</tr></thead>
                  <tbody>
                    {lista.length===0?(<tr><td colSpan={6} className="p-5 text-center text-muted-foreground">{q?`No se encontró "${busqComp}"`:"Sin capturas"}</td></tr>):lista.map((f,i)=>(
                      <tr key={i} className={`border-b last:border-0 ${f.difiere?"bg-red-50":"hover:bg-slate-50"}`}>
                        <td className="px-2.5 py-1.5 font-mono text-primary font-bold">{f.codigo}</td>
                        <td className="px-2.5 py-1.5 font-medium">{f.nombre}</td>
                        <td className="px-2.5 py-1.5 text-center font-bold text-primary">{f.t1||"—"}</td>
                        <td className="px-2.5 py-1.5 text-center font-bold text-green-600">{f.t2||"—"}</td>
                        <td className="px-2.5 py-1.5 text-center font-bold text-purple-600">{f.t3||"—"}</td>
                        <td className={`px-2.5 py-1.5 text-center font-extrabold ${f.difiere?"text-destructive":"text-green-600"}`}>{f.difiere?(f.t1-f.t2>0?"+":"")+(f.t1-f.t2):<CheckCircle size={14} className="inline"/>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </DialogContent>
          </Dialog>
        );
      })()}
    </Section>
  );
}
