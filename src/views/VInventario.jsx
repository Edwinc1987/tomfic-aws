import { useState } from "react";
import {
  CheckCircle, AlertTriangle, Pencil, Trash2, Lock, Plus,
  ClipboardList, Package, FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import Section from "@/components/Section";
import { setBusy, initSnap } from "@/lib/sync";
import { G, TODAY, HOUR, ID, finalAjustado, supabase, SB, rememberSelectedInventory } from "@/lib/data";

// ── INVENTARIO ──
export function VInventario({G,rerender,showToast,usuario}){
  const [modal,setModal]=useState(false);
  const [modalEdit,setModalEdit]=useState(false);
  const [modalEliminar,setModalEliminar]=useState(false);
  const [modalCerrar,setModalCerrar]=useState(false);
  const [eliminando,setEliminando]=useState(false);
  const [form,setForm]=useState({nombre:"",tipo:"2conteos",obs:"",fecha:TODAY()});
  const [editForm,setEditForm]=useState({nombre:"",obs:""});

  // Determina qué conteos NO están completados (para bloquear el cierre)
  const estadoConteo=(c)=>{
    // ¿completo? un conteo está completo solo si su estado final es "completado"
    if(c.estado==="completado")return null; // ok, completo
    // Razón por la que no está completo:
    if(c.estado==="pendiente")return "sin iniciar";
    if(c.estado==="enCurso")return "C1 en curso";
    if(c.estado==="cerradoC1")return c.tipo==="2conteos"?"falta C2":null; // si es 1 conteo, cerradoC1 = completo
    if(c.estado==="cerradoC2")return null; // 2 conteos sin diferencia = completo
    if(c.estado==="diferencia")return "tiene diferencias, falta C3";
    if(c.estado==="enC3")return "C3 en curso";
    return "incompleto";
  };
  const conteosIncompletos=()=>G.conteos.filter(c=>c.tipo!=="ajuste").map(c=>({c,razon:estadoConteo(c)})).filter(x=>x.razon!==null);
  const crear=()=>{
    if(!form.nombre.trim())return showToast("Ingresa un nombre","err");
    const limite=Math.max(1,Number(G.tenant?.limite_inventarios||1));
    if(G.inventarios.length>=limite)return showToast(`Tu plan permite ${limite} inventario${limite===1?"":"s"} activo${limite===1?"":"s"}.` ,"err");
    const inv={id:ID(),nombre:form.nombre,tipo:form.tipo,obs:form.obs,fecha:form.fecha,apertura:TODAY(),horaApertura:HOUR(),usuarioApertura:usuario.nombre};
    rememberSelectedInventory();
    G.inventarios=[...G.inventarios,inv];
    G.inventario=inv;
    G._inventarioDatos[inv.id]={conteos:[],capturas:{}};
    G.conteos=[];G.capturas={};G.alertas=[];
    setModal(false);setForm({nombre:"",tipo:"2conteos",obs:"",fecha:TODAY()});
    rerender();showToast("Inventario creado. Ahora carga la base de productos ✓");
  };
  const guardarEdit=()=>{
    if(!editForm.nombre.trim())return showToast("El nombre no puede estar vacío","err");
    G.inventario={...G.inventario,nombre:editForm.nombre,obs:editForm.obs};
    G.inventarios=G.inventarios.map(i=>i.id===G.inventario.id?G.inventario:i);
    setModalEdit(false);rerender();showToast("Inventario actualizado ✓");
  };
  const intentarCerrar=()=>{
    if(!G.inventario)return;
    if(G.conteos.length===0)return showToast("No hay conteos en este inventario","err");
    const incompletos=conteosIncompletos();
    if(incompletos.length>0){
      const nombres=incompletos.map(x=>`• ${x.c.nombre} (${x.razon})`).join("\n");
      showToast(`⚠️ Faltan ${incompletos.length} conteo(s) por completar. No se puede cerrar.`,"err");
      G.alertas=[{id:ID(),tipo:"cierre",msg:`No se cerró el inventario: faltan conteos por completar:\n${nombres}`,fecha:HOUR(),leida:false},...G.alertas];
      rerender();
      return;
    }
    setModalCerrar(true);
  };
  const cerrar=()=>{
    if(!G.inventario)return;
    setModalCerrar(false);
    setBusy(true);
    const capsSnapshot=JSON.parse(JSON.stringify(G.capturas));
    const prodsSnapshot=JSON.parse(JSON.stringify(G.productos));
    const conteosSnapshot=JSON.parse(JSON.stringify(G.conteos));
    G.historial.unshift({
      ...G.inventario,cierre:TODAY(),horaCierre:HOUR(),usuarioCierre:usuario.nombre,
      conteos:conteosSnapshot,capturas:capsSnapshot,productos:prodsSnapshot,
      totalProductos:G.productos.length,totalCapturas:Object.keys(G.capturas).length,
    });
    const cerradoId=G.inventario.id;
    G.productos=G.productos.map(p=>{
      const caps=Object.values(G.capturas).filter(c=>c.productoId===p.id);
      const sumC3=caps.filter(c=>c.ronda==="C3").reduce((s,c)=>s+c.cantidad,0);
      const sumC2=caps.filter(c=>c.ronda==="C2").reduce((s,c)=>s+c.cantidad,0);
      const sumC1=caps.filter(c=>c.ronda==="C1").reduce((s,c)=>s+c.cantidad,0);
      const final=finalAjustado(caps,sumC3||sumC2||sumC1);
      const tieneAjuste=caps.some(c=>c.ronda==="AJU");
      return (final>0||tieneAjuste)?{...p,saldo:final}:p; // un ajuste (aunque sea 0) siempre manda
    });
    G.inventario=null;G.conteos=[];G.capturas={};G.alertas=[];
    G.inventarios=G.inventarios.filter(i=>i.id!==cerradoId);
    delete G._inventarioDatos[cerradoId];
    const siguiente=G.inventarios[0]||null;
    if(siguiente){G.inventario=siguiente;G.conteos=G._inventarioDatos[siguiente.id]?.conteos||[];G.capturas=G._inventarioDatos[siguiente.id]?.capturas||{};}
    setBusy(false);
    rerender();showToast("Inventario cerrado. Saldos actualizados ✓");
  };
  const eliminarInventario=async()=>{
    if(!G.inventario)return;
    setEliminando(true);setBusy(true);
    const invId=G.inventario.id;
    try{
      // Borrar de la nube: conteos del inventario + el inventario
      for(const c of G.conteos){try{await SB.deleteConteo(c.id);}catch(e){}}
      try{await supabase.from("inventarios").delete().eq("id",invId);}catch(e){}
    }catch(e){console.warn("Error al eliminar de la nube:",e);}
    // Limpiar localmente y resetear el snapshot de sincronización
    G.inventario=null;G.conteos=[];G.capturas={};G.alertas=[];
    G.inventarios=G.inventarios.filter(i=>i.id!==invId);
    delete G._inventarioDatos[invId];
    const siguiente=G.inventarios[0]||null;
    if(siguiente){G.inventario=siguiente;G.conteos=G._inventarioDatos[siguiente.id]?.conteos||[];G.capturas=G._inventarioDatos[siguiente.id]?.capturas||{};}
    G.conteos.forEach(()=>{});
    initSnap();
    setEliminando(false);setModalEliminar(false);setBusy(false);
    rerender();showToast("Inventario eliminado por completo ✓","warn");
  };
  const st=G.conteos.reduce((a,c)=>{if(c.estado==="completado"||c.estado==="cerradoC2")a.comp++;if(c.estado==="diferencia")a.dif++;return a;},{comp:0,dif:0});
  return(
    <Section>
      {!G.inventario?(
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-white py-16 px-5 text-center shadow-sm">
          <ClipboardList size={64} className="text-slate-400 mb-4"/>
          <div className="text-xl font-extrabold text-slate-900 mb-2">Sin inventario activo</div>
          <div className="text-sm text-muted-foreground mb-6 max-w-sm">Crea un nuevo inventario para comenzar a registrar conteos de productos.</div>
          <Button onClick={()=>setModal(true)}><Plus size={16}/> Crear Inventario</Button>
        </div>
      ):(
        <>
          {/* Banner principal del inventario */}
          <div style={{background:"linear-gradient(135deg,#0f172a 0%,#1e3a5f 100%)",borderRadius:18,padding:"24px 28px",marginBottom:16,color:"white",position:"relative",overflow:"hidden"}}>
            <div style={{position:"absolute",right:-20,top:-20,width:120,height:120,background:"rgba(255,255,255,0.04)",borderRadius:99}}/>
            <div style={{position:"absolute",right:40,bottom:-30,width:80,height:80,background:"rgba(255,255,255,0.03)",borderRadius:99}}/>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:12}}>
              <div>
                <div style={{fontSize:11,color:"#64748b",fontWeight:700,textTransform:"uppercase",letterSpacing:1,marginBottom:6}}>Inventario Activo</div>
                <div style={{fontSize:26,fontWeight:900,letterSpacing:-0.5,marginBottom:6}}>{G.inventario.nombre}</div>
                <div style={{fontSize:12,color:"#64748b"}}>Abierto el {G.inventario.apertura} {G.inventario.horaApertura&&`a las ${G.inventario.horaApertura}`} · por <span style={{color:"#60a5fa",fontWeight:700}}>{G.inventario.usuarioApertura}</span></div>
              </div>
              <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                <div style={{background:"rgba(22,163,74,0.2)",border:"1px solid rgba(22,163,74,0.4)",borderRadius:20,padding:"4px 14px",fontSize:12,fontWeight:700,color:"#4ade80",display:"flex",alignItems:"center",gap:5}}>
                  <span style={{width:7,height:7,background:"#4ade80",borderRadius:99,display:"inline-block"}}/>
                  ACTIVO
                </div>
                <div style={{background:"rgba(255,255,255,0.1)",border:"1px solid rgba(255,255,255,0.15)",borderRadius:20,padding:"4px 14px",fontSize:12,fontWeight:700,color:"white"}}>
                  {G.inventario.tipo==="2conteos"?"2 Conteos":"1 Conteo"}
                </div>
              </div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(110px,1fr))",gap:10,marginTop:20}}>
              {[
                {l:"Productos",v:G.productos.length,icon:Package},
                {l:"Conteos",v:G.conteos.length,icon:ClipboardList},
                {l:"Completados",v:st.comp,icon:CheckCircle},
                {l:"Diferencias",v:st.dif,icon:AlertTriangle},
              ].map(s=>(
                <div key={s.l} style={{background:"rgba(255,255,255,0.07)",borderRadius:12,padding:"12px 14px",border:"1px solid rgba(255,255,255,0.08)"}}>
                  <div style={{marginBottom:4}}><s.icon size={16} color="white"/></div>
                  <div style={{fontSize:22,fontWeight:900,color:"white"}}>{s.v}</div>
                  <div style={{fontSize:10,color:"#64748b",marginTop:2,textTransform:"uppercase",letterSpacing:0.5}}>{s.l}</div>
                </div>
              ))}
            </div>
          </div>
          {/* Acciones */}
           <div className="flex gap-2.5 mb-4 flex-wrap">
             <Button variant="outline" onClick={()=>setModal(true)}><Plus size={15}/> Nuevo inventario</Button>
             <Button variant="destructive" onClick={intentarCerrar}><Lock size={15}/> Cerrar Inventario</Button>
            <Button variant="outline" onClick={()=>{setEditForm({nombre:G.inventario.nombre,obs:G.inventario.obs||""});setModalEdit(true);}}><Pencil size={15}/> Editar</Button>
            <Button variant="outline" className="text-destructive border-red-200 hover:bg-red-50 hover:text-destructive" onClick={()=>setModalEliminar(true)}><Trash2 size={15}/> Eliminar</Button>
          </div>
          {G.inventario.obs&&<div className="mb-3 flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-1.5 text-sm text-muted-foreground"><FileText size={15} className="shrink-0"/> {G.inventario.obs}</div>}
          {G.productos.length===0&&<div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-700"><AlertTriangle size={15} className="shrink-0"/> La base de productos está vacía. Ve a "Base de datos" y carga el Excel del cliente antes de programar conteos.</div>}
          {G.productos.length>0&&<div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm font-semibold text-green-700"><CheckCircle size={15} className="shrink-0"/> Base lista: {G.productos.length} productos disponibles. Puedes programar los conteos.</div>}
        </>
      )}
      <Dialog open={modal} onOpenChange={setModal}>
        <DialogContent className="max-w-md max-h-[92vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Nuevo Inventario</DialogTitle></DialogHeader>
          <div className="space-y-3.5">
            <div className="space-y-1.5">
              <Label>Nombre del inventario</Label>
              <Input value={form.nombre} onChange={e=>setForm(p=>({...p,nombre:e.target.value}))} placeholder="Ej: Inventario General Junio 2025"/>
            </div>
            <div className="space-y-1.5">
              <Label>Fecha</Label>
              <Input value={form.fecha} onChange={e=>setForm(p=>({...p,fecha:e.target.value}))}/>
            </div>
            <div className="space-y-1.5">
              <Label>Tipo de conteo</Label>
              <div className="grid grid-cols-2 gap-2.5">
                {[["1conteo","1 Conteo","Un solo pase"],["2conteos","2 Conteos","C1 + C2 + C3 si hay diferencia"]].map(([v,t,s])=>(
                  <div key={v} onClick={()=>setForm(p=>({...p,tipo:v}))} className={`rounded-lg border-2 p-3 cursor-pointer transition-colors ${form.tipo===v?"border-primary bg-blue-50":"border-slate-200 hover:border-slate-300"}`}>
                    <div className={`font-bold text-sm ${form.tipo===v?"text-primary":"text-slate-900"}`}>{t}</div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">{s}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Observaciones</Label>
              <Input value={form.obs} onChange={e=>setForm(p=>({...p,obs:e.target.value}))} placeholder="Opcional..."/>
            </div>
            <Button className="w-full" onClick={crear}><Plus size={16}/> Crear Inventario</Button>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={modalEdit} onOpenChange={setModalEdit}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Editar Inventario</DialogTitle></DialogHeader>
          <div className="space-y-3.5">
            <div className="space-y-1.5">
              <Label>Nombre del inventario</Label>
              <Input value={editForm.nombre} onChange={e=>setEditForm(p=>({...p,nombre:e.target.value}))}/>
            </div>
            <div className="space-y-1.5">
              <Label>Observaciones</Label>
              <Input value={editForm.obs} onChange={e=>setEditForm(p=>({...p,obs:e.target.value}))} placeholder="Opcional..."/>
            </div>
            <Button className="w-full" onClick={guardarEdit}><CheckCircle size={16}/> Guardar cambios</Button>
          </div>
        </DialogContent>
      </Dialog>
      <ConfirmDialog
        open={modalCerrar}
        onOpenChange={setModalCerrar}
        icon={CheckCircle}
        iconClassName="text-green-600"
        iconBg="bg-green-50"
        title="Cerrar Inventario"
        description={<>Todos los conteos están completos. Al cerrar, se guardará el inventario en el <b>historial</b>, se actualizarán los <b>saldos</b> con las cantidades contadas, y dejará de estar activo.</>}
        confirmText="Sí, cerrar inventario"
        confirmVariant="default"
        onConfirm={cerrar}
      />
      <ConfirmDialog
        open={modalEliminar}
        onOpenChange={setModalEliminar}
        icon={Trash2}
        title="Eliminar Inventario"
        description={<>Esto borrará <b>por completo</b> el inventario <b>{G.inventario?.nombre}</b> junto con <b>todos sus conteos y capturas</b>, en este dispositivo y en la nube. Esta acción <b>no se puede deshacer</b>.</>}
        confirmText="Sí, eliminar todo"
        onConfirm={eliminarInventario}
        loading={eliminando}
      />
    </Section>
  );
}
