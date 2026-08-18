import { useState } from "react";
import * as XLSX from "xlsx";
import {
  Radio, Package, ClipboardList, Settings, Bell, AlertTriangle,
  CheckCircle, Eye, RefreshCw, ChevronRight, X, Plus, Printer,
  MapPin, Wrench, Trash2, Scale,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge as UIBadge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { PageHeader } from "@/components/ui/page-header";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import EstBadge from "@/components/EstBadge";
import { G, TODAY, ID, conteosReales, conteoAjusteActivo, todosConteosCerrados } from "@/lib/data";

// ── PROCESOS ──
export function VProcesos({G,rerender,showToast,usuario}){
  const [modalAsignar,setModalAsignar]=useState(null);
  const [modalCaps,setModalCaps]=useState(null); // {conteoId, ronda, nombre}
  const [busqCaps,setBusqCaps]=useState("");
  const [modalReabrir,setModalReabrir]=useState(null); // {conteo}
  const [usuariosExtra,setUsuariosExtra]=useState({});
  const [verPendientes,setVerPendientes]=useState(false);
  const [verAlertas,setVerAlertas]=useState(false);
  const [pendForm,setPendForm]=useState(null); // {tipo:'crear'|'c2'|'c3', id/locId, nombre, c1, c2}
  const [modalAjuste,setModalAjuste]=useState(false);
  const [ajusteUser,setAjusteUser]=useState("");
  const caps=Object.values(G.capturas);
  const usuariosActivos=()=>G.usuarios.filter(u=>u.activo);
  // Crea el Conteo de Ajuste (correcciones post-diferencias) y lo asigna a un usuario.
  const crearAjuste=()=>{
    if(!ajusteUser)return showToast("Selecciona el usuario que hará el ajuste","err");
    if(conteoAjusteActivo())return showToast("Ya hay un conteo de ajuste en curso","err");
    G.conteos.push({
      id:ID(),nombre:"AJUSTE DE DIFERENCIAS",tipo:"ajuste",
      locId:"",locLabel:"Ajuste de diferencias",ubicacion:"",localizacion:"",nro:"",
      obs:"",usuarioC1:ajusteUser,usuarioC2:"",usuarioC3:"",
      estado:"enCurso",rondasCerradas:[],fechaCreacion:TODAY(),
    });
    setModalAjuste(false);setAjusteUser("");rerender();showToast(`Ajuste asignado a ${ajusteUser} ✓`);
  };
  const borrarAjuste=()=>{
    const a=conteoAjusteActivo();if(!a)return;
    G.conteos=G.conteos.filter(c=>c.id!==a.id);
    Object.keys(G.capturas).forEach(k=>{if(G.capturas[k].conteoId===a.id)delete G.capturas[k];});
    rerender();showToast("Conteo de ajuste eliminado","warn");
  };
  // Crear conteo rápido desde el panel de pendientes
  const crearConteoRapido=(loc,nombre,c1,c2)=>{
    if(!nombre.trim()||!c1)return showToast("Completa nombre y usuario C1","err");
    G.conteos.push({
      id:ID(),nombre:nombre.trim(),locId:loc.id,
      locLabel:`${loc.ubicacion} › ${loc.localizacion} › ${loc.nro}`,
      ubicacion:loc.ubicacion,localizacion:loc.localizacion,nro:loc.nro,
      obs:"",tipo:G.inventario.tipo,
      usuarioC1:c1,usuarioC2:c2||"",usuarioC3:"",
      estado:"pendiente",rondasCerradas:[],fechaCreacion:TODAY(),
    });
    setPendForm(null);rerender();showToast("Conteo programado ✓");
  };
  const asignarC2Rapido=(id,u)=>{
    if(!u)return showToast("Selecciona un usuario","err");
    G.conteos=G.conteos.map(c=>c.id===id?{...c,usuarioC2:u}:c);
    setPendForm(null);rerender();showToast("Usuario C2 asignado ✓");
  };
  const total=G.productos.length;

  const conteosVis=conteosReales(); // excluye el conteo de ajuste de las vistas normales
  const ajuste=conteoAjusteActivo();
  const totalConteos=conteosVis.length;
  const conteosCompletos=conteosVis.filter(c=>{
    if(c.tipo==="1conteo") return ["cerradoC1","completado"].includes(c.estado);
    return ["completado","cerradoC2"].includes(c.estado);
  }).length;
  const pct=totalConteos?Math.round(conteosCompletos/totalConteos*100):0;

  // Pendientes por completar (ahora se muestran dentro del botón "Alertas").
  const conteosPend=G.conteos.filter(c=>c.estado!=="completado"&&c.tipo!=="ajuste").map(c=>{
    let razon="";
    if(c.estado==="pendiente")razon="Sin iniciar";
    else if(c.estado==="enCurso")razon="C1 en curso";
    else if(c.estado==="cerradoC1")razon=c.tipo==="2conteos"?"Falta C2":"";
    else if(c.estado==="diferencia")razon="Tiene diferencias, falta C3";
    else if(c.estado==="enC3")razon="C3 en curso";
    return {c,razon};
  }).filter(x=>x.razon!=="");
  // Ubicaciones sin conteo: comparar por RUTA (ubicación›localización›nro), NO por id.
  // Tras "Recuperar desde conteos" los ids de ubicación cambian y no matchean el locId viejo
  // → antes marcaba como "sin conteo" ubicaciones que sí tenían conteo.
  const _norm=s=>(s||"").toString().trim().toUpperCase();
  const _locKey=x=>`${_norm(x.ubicacion)}|${_norm(x.localizacion)}|${_norm(x.nro)}`;
  const _locConConteo=new Set(G.conteos.filter(c=>c.tipo!=="ajuste").map(_locKey));
  const locSinConteo=G.localizaciones.filter(l=>!_locConConteo.has(_locKey(l)));
  const nAlertas=G.alertas.filter(a=>!a.leida).length;
  const totalPend=conteosPend.length+locSinConteo.length;

  const expXLSX=(data,cols,fname,titulo)=>{
    const ws=XLSX.utils.aoa_to_sheet([[titulo],["Usuario: "+usuario.nombre+" | "+TODAY()],[],cols,...data]);
    const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,"Datos");XLSX.writeFile(wb,fname);showToast("Exportado ✓");
  };

  const expPDF=(difs,conteoNombre)=>{
    // Generate printable HTML and open in new window
    const rows=difs.map(d=>`<tr><td>${d.codigo}</td><td>${d.nombre}</td><td>${d.referencia}</td><td style="text-align:center">${d.c1}</td><td style="text-align:center">${d.c2}</td><td style="text-align:center;color:red;font-weight:bold">${d.dif>0?"+"+d.dif:d.dif}</td><td>${d.u1}</td><td>${d.u2}</td></tr>`).join("");
    const html=`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Diferencias ${conteoNombre}</title>
    <style>body{font-family:Arial,sans-serif;padding:20px;font-size:12px}h2{color:#1e40af}table{width:100%;border-collapse:collapse}th{background:#0f172a;color:white;padding:8px}td{padding:6px;border:1px solid #e2e8f0}tr:nth-child(even){background:#f8fafc}.header{margin-bottom:16px}</style></head>
    <body><div class="header"><h2>Reporte Diferencias de Conteos</h2><p><b>Conteo:</b> ${conteoNombre} &nbsp;|&nbsp; <b>Fecha:</b> ${TODAY()} &nbsp;|&nbsp; <b>Usuario:</b> ${usuario.nombre}</p></div>
    <table><thead><tr><th>Código</th><th>Nombre</th><th>Referencia</th><th>C1</th><th>C2</th><th>Diferencia</th><th>Usuario C1</th><th>Usuario C2</th></tr></thead><tbody>${rows}</tbody></table>
    <script>window.onload=()=>window.print();</script></body></html>`;
    const w=window.open("","_blank");w.document.write(html);w.document.close();
  };

  const getDifsConteo=(c)=>{
    if(c.tipo!=="2conteos") return [];
    const difs=[];
    G.productos.forEach(p=>{
      const t1=caps.filter(x=>x.conteoId===c.id&&x.productoId===p.id&&x.ronda==="C1").reduce((s,x)=>s+x.cantidad,0);
      const t2=caps.filter(x=>x.conteoId===c.id&&x.productoId===p.id&&x.ronda==="C2").reduce((s,x)=>s+x.cantidad,0);
      if((t1>0||t2>0)&&t1!==t2)
        difs.push({...p,c1:t1,c2:t2,dif:t1-t2,u1:caps.find(x=>x.conteoId===c.id&&x.productoId===p.id&&x.ronda==="C1")?.usuario||"",u2:caps.find(x=>x.conteoId===c.id&&x.productoId===p.id&&x.ronda==="C2")?.usuario||""});
    });
    return difs;
  };

  const getCapsRonda=(conteoId,ronda)=>caps.filter(c=>c.conteoId===conteoId&&c.ronda===ronda);

  const imprimirConteo=(c)=>{
    const w=window.open("","_blank");
    if(!w)return showToast("Habilita las ventanas emergentes para imprimir","err");
    const byProd={};
    caps.filter(x=>x.conteoId===c.id).forEach(x=>{
      if(!byProd[x.productoId])byProd[x.productoId]={codigo:x.codigo,nombre:x.nombre,referencia:x.referencia||"",categoria:x.categoria||"",c1:0,c2:0,c3:0,estado:x.estado||""};
      if(x.ronda==="C1")byProd[x.productoId].c1+=x.cantidad;
      else if(x.ronda==="C2")byProd[x.productoId].c2+=x.cantidad;
      else if(x.ronda==="C3")byProd[x.productoId].c3+=x.cantidad;
    });
    const lista=Object.values(byProd).sort((a,b)=>(a.nombre||"").localeCompare(b.nombre||""));
    const filas=lista.map(p=>{const fin=p.c3||p.c2||p.c1;return `<tr><td>${p.codigo}</td><td>${p.nombre}</td><td>${p.referencia}</td><td>${p.categoria}</td><td class="n">${p.c1||""}</td><td class="n">${p.c2||""}</td><td class="n">${p.c3||""}</td><td class="n" style="font-weight:bold">${fin}</td><td>${p.estado}</td></tr>`;}).join("");
    const dif2=c.tipo==="2conteos"?getDifsConteo(c).length:0;
    const html=`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${c.nombre}</title>
    <style>body{font-family:Arial,sans-serif;padding:22px;font-size:12px;color:#0f172a}h2{color:#1e40af;margin:0 0 4px}.meta{color:#475569;font-size:12px;margin-bottom:6px}.box{background:#f1f5f9;border-radius:8px;padding:8px 12px;display:inline-block;margin:4px 8px 12px 0;font-size:12px}table{width:100%;border-collapse:collapse;margin-top:8px}th{background:#0f172a;color:white;padding:7px;text-align:left;font-size:11px}td{padding:5px 7px;border-bottom:1px solid #e2e8f0}td.n{text-align:center}tr:nth-child(even) td{background:#f8fafc}@media print{button{display:none}}</style></head>
    <body>
      <h2 style={{display:"flex",alignItems:"center",gap:8,margin:0,fontSize:21,fontWeight:800,letterSpacing:-0.5}}><Package size={22}/> TOMFIC — Conteo por Ubicación</h2>
      <div class="meta"><b>Conteo:</b> ${c.nombre}</div>
      <div class="meta"><b>Ubicación:</b> ${c.locLabel||""}</div>
      <div class="meta"><b>Fecha:</b> ${TODAY()} &nbsp;·&nbsp; <b>Impreso por:</b> ${usuario.nombre}</div>
      <div>
        <span class="box"><b>C1:</b> ${c.usuarioC1||"—"}</span>
        <span class="box"><b>C2:</b> ${c.usuarioC2||"—"}</span>
        <span class="box"><b>Productos contados:</b> ${lista.length}</span>
        ${dif2?`<span class="box" style="background:#fee2e2;color:#dc2626"><b>Diferencias:</b> ${dif2}</span>`:""}
      </div>
      <table><thead><tr><th>Código</th><th>Nombre</th><th>Referencia</th><th>Categoría</th><th>C1</th><th>C2</th><th>C3</th><th>Final</th><th>Estado</th></tr></thead><tbody>${filas||'<tr><td colspan="9" style="text-align:center;color:#64748b;padding:20px">Sin capturas todavía</td></tr>'}</tbody></table>
    </body></html>`;
    w.document.write(html);w.document.close();w.focus();setTimeout(()=>{try{w.print();}catch(e){}},400);
  };

  const asignarC2=(id,u)=>{G.conteos=G.conteos.map(c=>c.id===id?{...c,usuarioC2:u}:c);rerender();showToast("C2 asignado ✓");};
  const asignarC3=(id,u)=>{G.conteos=G.conteos.map(c=>c.id===id?{...c,usuarioC3:u,estado:"enC3"}:c);rerender();showToast("C3 asignado ✓");};

  const reabrirRonda=(c,ronda)=>{
    // Debe QUITAR la ronda de rondasCerradas (no solo cambiar estado); si no, el capturador
    // la sigue viendo cerrada y no la puede abrir. Misma lógica que en Conteos.
    const rc=(c.rondasCerradas||[]).filter(r=>r!==ronda);
    let nuevoEstado;
    if(ronda==="C1")nuevoEstado="enCurso";
    else if(ronda==="C2")nuevoEstado=rc.includes("C1")?"cerradoC1":"enCurso";
    else if(ronda==="C3")nuevoEstado="diferencia";
    G.conteos=G.conteos.map(x=>x.id===c.id?{...x,estado:nuevoEstado,rondasCerradas:rc}:x);
    setModalReabrir(null);rerender();showToast(`${ronda} reabierto ✓`,"warn");
  };

  const agregarUsuarioExtra=(conteoId,u)=>{setUsuariosExtra(prev=>{const curr=prev[conteoId]||[];if(curr.includes(u))return prev;return{...prev,[conteoId]:[...curr,u]};});showToast(`${u} agregado ✓`);};
  const quitarUsuarioExtra=(conteoId,u)=>{setUsuariosExtra(prev=>({...prev,[conteoId]:(prev[conteoId]||[]).filter(x=>x!==u)}));};

  // Modal capturas de una ronda
  const ModalCaps=()=>{
    if(!modalCaps)return null;
    const {conteoId,ronda,nombre}=modalCaps;
    const rCaps=getCapsRonda(conteoId,ronda);
    // Agrupar por producto (sumatoria)
    const porProd={};
    rCaps.forEach(c=>{
      if(!porProd[c.productoId])porProd[c.productoId]={...c,total:0};
      porProd[c.productoId].total+=c.cantidad;
    });
    const listaTotal=Object.values(porProd);
    const q=busqCaps.trim().toLowerCase();
    const lista=q?listaTotal.filter(c=>
      (c.codigo&&c.codigo.toLowerCase().includes(q))||
      (c.ean&&String(c.ean).toLowerCase().includes(q))||
      (c.nombre&&c.nombre.toLowerCase().includes(q))
    ):listaTotal;
    const cerrar=()=>{setBusqCaps("");setModalCaps(null);};
    return(
      <Dialog open onOpenChange={(v)=>!v&&cerrar()}>
        <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{`${ronda} — ${nombre} (${lista.length}${q?" de "+listaTotal.length:""} productos)`}</DialogTitle></DialogHeader>
          <Input value={busqCaps} onChange={e=>setBusqCaps(e.target.value)} placeholder="Buscar por código de barras o nombre…" autoFocus className="border-primary"/>
          <div className="max-h-[480px] overflow-y-auto rounded-lg border">
            <table className="w-full text-xs">
              <thead><tr className="bg-slate-50 text-slate-600 border-b border-slate-200 sticky top-0">
                {["Código","Nombre","Referencia","Total","Estado","Obs","Usuario"].map(h=>(
                  <th key={h} className="px-2.5 py-2 text-left font-semibold">{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {lista.length===0?(
                  <tr><td colSpan={7} className="p-5 text-center text-muted-foreground">{q?`No se encontró "${busqCaps}"`:"Sin capturas registradas aún"}</td></tr>
                ):lista.map((c,i)=>(
                  <tr key={i} className="border-b last:border-0 hover:bg-slate-50">
                    <td className="px-2.5 py-1.5 font-mono text-primary font-bold">{c.codigo}</td>
                    <td className="px-2.5 py-1.5 font-medium">{c.nombre}</td>
                    <td className="px-2.5 py-1.5 text-muted-foreground text-[11px]">{c.referencia}</td>
                    <td className="px-2.5 py-1.5 text-center font-extrabold text-primary text-[15px]">{c.total}</td>
                    <td className="px-2.5 py-1.5"><EstBadge e={c.estado}/></td>
                    <td className="px-2.5 py-1.5 text-muted-foreground text-[11px]">{c.obs||"—"}</td>
                    <td className="px-2.5 py-1.5 text-muted-foreground">{c.usuario}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </DialogContent>
      </Dialog>
    );
  };

  return(
    <div>
      <ModalCaps/>

      {/* Modal reabrir con selección de ronda */}
      <Dialog open={!!modalReabrir} onOpenChange={(v)=>!v&&setModalReabrir(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>¿Qué conteo deseas reabrir?</DialogTitle></DialogHeader>
          {modalReabrir&&(<>
            <div className="text-sm text-muted-foreground -mt-1">Selecciona la ronda que quieres reabrir para que el usuario pueda seguir capturando.</div>
            <div className="flex flex-col gap-2.5">
              {["C1","C2","C3"].filter(r=>{
                const c=modalReabrir;
                if(r==="C1") return true;
                if(r==="C2") return c.tipo==="2conteos"&&c.usuarioC2;
                if(r==="C3") return c.usuarioC3;
                return false;
              }).map(r=>{
                const col={C1:"#2563eb",C2:"#16a34a",C3:"#7c3aed"}[r];
                return(
                  <button key={r} onClick={()=>reabrirRonda(modalReabrir,r)}
                    className="flex items-center justify-between rounded-lg border-2 bg-white px-4 py-3.5 text-left transition-colors hover:bg-slate-50" style={{borderColor:col}}>
                    <div>
                      <div className="flex items-center gap-1.5 font-bold text-[15px]" style={{color:col}}><RefreshCw size={15}/> Reabrir {r}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {r==="C1"&&`Usuario: ${modalReabrir.usuarioC1}`}
                        {r==="C2"&&`Usuario: ${modalReabrir.usuarioC2}`}
                        {r==="C3"&&`Usuario: ${modalReabrir.usuarioC3}`}
                      </div>
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

      <PageHeader
        label="Panel de Control"
        title="Vista de Procesos"
        icon={Radio}
        subtitle={G.inventario?.nombre||"Inventario activo"}
        right={<div className="text-right"><div className="text-3xl font-extrabold leading-none">{pct}%</div><div className="text-[11px] text-white/80 mt-1">completado</div></div>}
      />

      {/* Tarjetas KPI — mismos colores de marca; ícono mini junto al texto (variante C) */}
      <div className="grid gap-3 mb-4" style={{gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))"}}>
        {[
          {l:"Productos",v:total,c:"#2563eb",icon:Package},
          {l:"Total conteos",v:totalConteos,c:"#475569",icon:ClipboardList},
          {l:"Completados",v:conteosCompletos,total:totalConteos,c:"#16a34a",icon:CheckCircle},
          {l:"En progreso",v:totalConteos-conteosCompletos,total:totalConteos,c:"#0891b2",icon:Settings},
          {l:"Con diferencia",v:G.conteos.filter(c=>c.tipo==="2conteos"&&getDifsConteo(c).length>0).length,c:"#dc2626",icon:AlertTriangle},
          {l:"Alertas",v:nAlertas+totalPend,c:"#7c3aed",icon:Bell,onClick:()=>setVerAlertas(v=>!v)},
        ].map(s=>(
          <Card key={s.l} onClick={s.onClick} className={`rounded-2xl border bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md ${s.onClick?"cursor-pointer":""}`} style={{borderColor:"#eaecf1"}}>
            <div className="flex items-center gap-1.5 text-[12.5px] font-semibold text-slate-500">
              <s.icon size={14} style={{color:s.c}}/>
              {s.l}{s.onClick&&<span className="ml-0.5 text-slate-400">›</span>}
            </div>
            <div className="mt-1.5 text-[26px] font-black leading-none tabular-nums" style={{color:s.c}}>
              {s.v}{s.total!==undefined&&<span className="ml-0.5 text-base font-bold text-slate-400">/{s.total}</span>}
            </div>
          </Card>
        ))}
      </div>

      {/* Conteo de ajuste — correcciones tras revisar diferencias (solo con conteos cerrados) */}
      {todosConteosCerrados()&&(ajuste?(
        <Card className="mb-4 p-4 border-violet-300 bg-violet-50 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2 text-sm">
            <Wrench size={16} className="text-violet-700"/>
            <span className="font-bold text-violet-900">Conteo de ajuste en curso</span>
            <span className="text-violet-700">· asignado a <b>{ajuste.usuarioC1}</b></span>
          </div>
          <Button variant="outline" size="sm" className="text-destructive border-red-200 hover:bg-red-50 hover:text-destructive" onClick={borrarAjuste}><Trash2 size={13}/> Quitar ajuste</Button>
        </Card>
      ):(
        <Card className="mb-4 p-4 border-violet-200 flex items-center justify-between flex-wrap gap-3" style={{background:"#faf5ff"}}>
          <div className="text-sm text-violet-900"><b>¿Detectaste diferencias por corregir?</b> Crea un conteo de ajuste y asígnalo a un usuario para dejar el saldo físico real.</div>
          <Button className="bg-violet-600 hover:bg-violet-700 text-white" onClick={()=>{setAjusteUser("");setModalAjuste(true);}}><Wrench size={15}/> Conteo de ajuste</Button>
        </Card>
      ))}
      <Dialog open={modalAjuste} onOpenChange={setModalAjuste}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Wrench size={18}/> Conteo de ajuste</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="text-sm text-muted-foreground">El usuario asignado verá <b>todos los productos</b> con su cantidad contada y el saldo del sistema, y podrá corregir la <b>cantidad física real</b>.</div>
            <div className="space-y-1.5">
              <Label>Asignar a</Label>
              <Select value={ajusteUser||undefined} onValueChange={setAjusteUser}>
                <SelectTrigger><SelectValue placeholder="Selecciona un usuario…"/></SelectTrigger>
                <SelectContent>{usuariosActivos().map(u=><SelectItem key={u.id} value={u.nombre}>{u.nombre}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <Button className="w-full" onClick={crearAjuste}><CheckCircle size={15}/> Crear y asignar</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Alertas + pendientes — se muestran SOLO al hacer clic en la tarjeta "Alertas" */}
      {verAlertas&&(
        <Card className="mb-4 border-amber-300 bg-amber-50 p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-1.5 font-bold text-[13px] text-amber-800"><Bell size={14}/> Alertas y pendientes</div>
            <button onClick={()=>setVerAlertas(false)} className="text-amber-700 hover:text-amber-900"><X size={16}/></button>
          </div>
          {nAlertas===0&&totalPend===0?(
            <div className="flex items-center gap-1.5 text-xs text-green-700 px-3 py-2 bg-green-50 rounded-lg"><CheckCircle size={13}/> Todo al día — sin alertas ni pendientes.</div>
          ):(
            <div className="space-y-4">
              {/* Avisos: capturadores que terminaron una ronda */}
              {nAlertas>0&&(
                <div>
                  <div className="text-[11px] font-extrabold text-amber-800 uppercase tracking-wide mb-2">Avisos ({nAlertas})</div>
                  {G.alertas.filter(a=>!a.leida).map((a,i)=>(
                    <div key={i} className="flex justify-between items-center px-2.5 py-1.5 bg-amber-100 rounded-lg mb-1.5 text-xs">
                      <span><b>{a.usuario}</b> terminó {a.ronda} del conteo <b>{a.conteoNombre}</b> · {a.hora}</span>
                      <Button size="sm" className="h-7 px-2.5 bg-amber-600 hover:bg-amber-700" onClick={()=>{G.alertas=G.alertas.map(x=>x===a?{...x,leida:true}:x);rerender();}}>Visto</Button>
                    </div>
                  ))}
                </div>
              )}
              {/* Conteos sin terminar */}
              {conteosPend.length>0&&(
                <div>
                  <div className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wide mb-2">Conteos sin terminar ({conteosPend.length})</div>
                  <div className="flex flex-col gap-2">
                    {conteosPend.map(({c,razon})=>{
                      const abierto=pendForm&&pendForm.id===c.id;
                      const faltaC2=c.tipo==="2conteos"&&!c.usuarioC2;
                      const faltaC3=c.estado==="diferencia"&&!c.usuarioC3;
                      const accionable=faltaC2||faltaC3;
                      return(
                      <div key={c.id} className="rounded-lg border border-amber-200 bg-white px-3.5 py-1.5 text-xs shadow-sm">
                        <div onClick={()=>accionable&&setPendForm(abierto?null:{id:c.id,tipo:faltaC2?"c2":"c3",val:""})} className={accionable?"cursor-pointer":"cursor-default"}>
                          <div className="font-bold text-slate-900 flex justify-between items-center gap-2">
                            <span>{c.nombre}</span>
                            {accionable&&<span className="rounded-md bg-primary text-white px-2 py-0.5 text-[10px] font-bold">{abierto?"cerrar":faltaC2?"Asignar C2":"Asignar C3"}</span>}
                          </div>
                          <div className="text-muted-foreground text-[11px] mt-0.5 flex items-center gap-1"><MapPin size={11}/> {c.locLabel}</div>
                          <div className="inline-block rounded bg-amber-100 text-amber-800 px-1.5 py-0.5 text-[10px] font-bold mt-1">{razon}</div>
                        </div>
                        {abierto&&(
                          <div className="mt-2.5 flex gap-1.5 items-center pt-2 border-t border-amber-200">
                            <Select value={pendForm.val||undefined} onValueChange={v=>setPendForm({...pendForm,val:v})}>
                              <SelectTrigger className="h-8 text-xs flex-1"><SelectValue placeholder="Selecciona usuario…"/></SelectTrigger>
                              <SelectContent>{usuariosActivos().map(u=><SelectItem key={u.id} value={u.nombre}>{u.nombre}</SelectItem>)}</SelectContent>
                            </Select>
                            <Button size="sm" className="h-8 px-2.5" onClick={()=>pendForm.tipo==="c2"?asignarC2Rapido(c.id,pendForm.val):(pendForm.val&&asignarC3(c.id,pendForm.val),setPendForm(null))}><CheckCircle size={14}/></Button>
                            <Button size="sm" variant="outline" className="h-8 px-2.5" onClick={()=>setPendForm(null)}><X size={14}/></Button>
                          </div>
                        )}
                      </div>
                      );
                    })}
                  </div>
                </div>
              )}
              {/* Ubicaciones sin conteo */}
              {locSinConteo.length>0&&(
                <div>
                  <div className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wide mb-2">Ubicaciones sin conteo ({locSinConteo.length})</div>
                  <div className="flex flex-col gap-2">
                    {locSinConteo.map(l=>{
                      const abierto=pendForm&&pendForm.locId===l.id;
                      return(
                      <div key={l.id} className="rounded-lg border border-blue-200 bg-white px-3.5 py-1.5 text-xs shadow-sm">
                        <div onClick={()=>setPendForm(abierto?null:{locId:l.id,tipo:"crear",nombre:`${l.localizacion} ${l.nro}`,c1:"",c2:""})} className="cursor-pointer">
                          <div className="font-bold text-blue-800 flex justify-between items-center gap-2">
                            <span>{l.ubicacion} › {l.localizacion} › {l.nro}</span>
                            <span className="rounded-md bg-primary text-white px-2 py-0.5 text-[10px] font-bold">{abierto?"cerrar":"+ Crear"}</span>
                          </div>
                          {l.observacion&&<div className="text-muted-foreground text-[11px] mt-0.5">{l.observacion}</div>}
                          {!abierto&&<div className="inline-block rounded bg-blue-100 text-blue-800 px-1.5 py-0.5 text-[10px] font-bold mt-1">Sin conteo programado</div>}
                        </div>
                        {abierto&&(
                          <div className="mt-2.5 flex flex-col gap-1.5 pt-2 border-t border-blue-200">
                            <Input value={pendForm.nombre} onChange={e=>setPendForm({...pendForm,nombre:e.target.value})} placeholder="Nombre del conteo" className="h-8 text-xs"/>
                            <Select value={pendForm.c1||undefined} onValueChange={v=>setPendForm({...pendForm,c1:v})}>
                              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Usuario Conteo 1…"/></SelectTrigger>
                              <SelectContent>{usuariosActivos().map(u=><SelectItem key={u.id} value={u.nombre}>{u.nombre}</SelectItem>)}</SelectContent>
                            </Select>
                            {G.inventario.tipo==="2conteos"&&(
                              <Select value={pendForm.c2||undefined} onValueChange={v=>setPendForm({...pendForm,c2:v})}>
                                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Usuario Conteo 2 (opcional)…"/></SelectTrigger>
                                <SelectContent>{usuariosActivos().map(u=><SelectItem key={u.id} value={u.nombre}>{u.nombre}</SelectItem>)}</SelectContent>
                              </Select>
                            )}
                            <div className="flex gap-1.5">
                              <Button size="sm" className="h-8 flex-1" onClick={()=>crearConteoRapido(l,pendForm.nombre,pendForm.c1,pendForm.c2)}><Plus size={14}/> Crear conteo</Button>
                              <Button size="sm" variant="outline" className="h-8 flex-1" onClick={()=>setPendForm(null)}>Cancelar</Button>
                            </div>
                          </div>
                        )}
                      </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </Card>
      )}

      {/* TABLA CENTRAL */}
      {G.conteos.length===0?(
        <Card className="flex flex-col items-center justify-center rounded-xl py-14 text-center" style={{borderColor:"#e7e9ee"}}>
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
            <ClipboardList size={24} className="text-slate-400"/>
          </div>
          <div className="text-[15px] font-bold text-slate-700">Aún no hay conteos programados</div>
          <div className="mt-1 max-w-xs text-[13px] text-slate-500">Crea un conteo para empezar a registrar las rondas de este inventario.</div>
        </Card>
      ):(
        <Card className="overflow-hidden mb-4">
          <div className="overflow-x-auto">
            <table className="w-full text-[11px] min-w-[900px]">
              <thead>
                <tr className="bg-slate-50 text-slate-600 border-b border-slate-200">
                  {["Ubicación","Localización","N° Local.","Observación","Usuarios","Conteo 1","Obs C1","Conteo 2","Obs C2","Diferencia","Obs Dif","C3","Validador","Acciones"].map(h=>(
                    <th key={h} className="px-2 py-1.5 text-left font-semibold whitespace-nowrap text-[10px]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {conteosReales().map((c,i)=>{
                  const c1s=caps.filter(x=>x.conteoId===c.id&&x.ronda==="C1");
                  const c2s=caps.filter(x=>x.conteoId===c.id&&x.ronda==="C2");
                  const c3s=caps.filter(x=>x.conteoId===c.id&&x.ronda==="C3");
                  const p1=total?Math.round(new Set(c1s.map(x=>x.productoId)).size/total*100):0;
                  const p2=total?Math.round(new Set(c2s.map(x=>x.productoId)).size/total*100):0;
                  const difs=getDifsConteo(c);
                  const extras=usuariosExtra[c.id]||[];
                  const todosUsuarios=[c.usuarioC1,...extras].filter(Boolean);

                  // C1 cerrado si estado es cerradoC1/completado/diferencia/enC3/cerradoC2
                  const c1Cerrado=["cerradoC1","cerradoC2","completado","diferencia","enC3"].includes(c.estado);
                  // C2 cerrado solo si estado avanzó más allá de cerradoC1
                  const c2Cerrado=["cerradoC2","completado","diferencia","enC3"].includes(c.estado);
                  // Hay diferencia real
                  const hayDifs=difs.length>0&&c1Cerrado&&c2Cerrado;
                  // ¿El C3 ya se realizó? (hay capturas C3 registradas para este conteo)
                  const c3Terminado=c.usuarioC3&&c.estado==="completado"&&caps.some(x=>x.conteoId===c.id&&x.ronda==="C3");
                  // ¿Se puede hacer clic para asignar C3? Solo si hay diferencias y el C3 aún NO terminó
                  const puedeAsignarC3=(hayDifs||c.estado==="diferencia")&&!c3Terminado;

                  // Validador
                  const validColor=
                    c3Terminado?"#64748b":
                    c.estado==="completado"&&!hayDifs?"#16a34a":
                    puedeAsignarC3?"#dc2626":"#64748b";
                  const validContent=
                    c3Terminado?<span style={{color:"white",fontWeight:800,fontSize:13,display:"flex",alignItems:"center",justifyContent:"center"}}><Settings size={11}/></span>:
                    c.estado==="completado"&&!hayDifs?<span style={{color:"white",fontWeight:800,fontSize:13}}>OK</span>:
                    puedeAsignarC3?<span style={{color:"white",fontWeight:800,fontSize:11}}>CLIC</span>:
                    <span style={{color:"white",fontWeight:800,fontSize:16}}>?</span>;

                  return(
                    <tr key={c.id} className="border-b border-slate-100 align-top hover:bg-slate-50">
                      <td className="px-2.5 py-1.5 font-bold text-blue-800">{c.ubicacion}</td>
                      <td className="px-2.5 py-1.5 text-muted-foreground">{c.localizacion}</td>
                      <td className="px-2.5 py-1.5 font-semibold">{c.nro}</td>
                      <td className="px-2.5 py-1.5 text-muted-foreground text-[11px]">{c.obs||"—"}</td>

                      {/* Usuarios */}
                      <td className="px-2.5 py-1.5 min-w-[120px]">
                        <div className="flex flex-col gap-1 items-start">
                          {todosUsuarios.map(u=>(
                            <div key={u} className="flex items-center gap-1">
                              <span className="bg-blue-50 text-primary px-1.5 py-0.5 rounded-full text-[10px] font-bold">{u}</span>
                              {u!==c.usuarioC1&&<button onClick={()=>quitarUsuarioExtra(c.id,u)} className="text-destructive"><X size={11}/></button>}
                            </div>
                          ))}
                          {c.usuarioC2&&<span className="bg-green-50 text-green-600 px-1.5 py-0.5 rounded-full text-[10px] font-bold">C2: {c.usuarioC2}</span>}
                          {c.usuarioC3&&<span className="bg-purple-50 text-purple-600 px-1.5 py-0.5 rounded-full text-[10px] font-bold">C3: {c.usuarioC3}</span>}
                          <button onClick={()=>setModalAsignar({conteoId:c.id,tipo:"extra"})} className="rounded-md border border-dashed border-slate-400 text-slate-500 px-2 py-0.5 text-[10px] mt-0.5 hover:bg-slate-50">+ Apoyo</button>
                        </div>
                      </td>

                      {/* Conteo 1 — clickeable */}
                      <td className="px-2.5 py-1.5 min-w-[120px]">
                        <div className="text-[11px] font-semibold text-primary mb-1">{c.usuarioC1||"—"}</div>
                        <div className="bg-slate-200 rounded-full h-[5px] mb-1"><div className="bg-primary rounded-full h-full" style={{width:p1+"%"}}/></div>
                        <div className="text-[10px] text-muted-foreground mb-1">{new Set(c1s.map(x=>x.productoId)).size}/{total} · {p1}%</div>
                        <button onClick={()=>setModalCaps({conteoId:c.id,ronda:"C1",nombre:c.nombre})}
                          className={`inline-flex items-center justify-center gap-1 min-w-[40px] h-[22px] rounded-md px-2 text-[10px] font-extrabold text-white ${c1Cerrado?"bg-green-600 hover:bg-green-700":"bg-slate-400"}`}>
                          {c1Cerrado?<>OK <Eye size={11}/></>:"?"}
                        </button>
                      </td>
                      <td className="px-2.5 py-1.5 text-[11px]">
                        {(()=>{
                          const undTotal=c1s.reduce((a,x)=>a+(Number(x.cantidad)||0),0);
                          return undTotal>0?<div className="whitespace-nowrap font-bold text-primary">{undTotal} und</div>:<span className="text-slate-300">—</span>;
                        })()}
                      </td>

                      {/* Conteo 2 — clickeable */}
                      <td className="px-2.5 py-1.5 min-w-[120px]">
                        {c.tipo==="2conteos"?(
                          c.usuarioC2?(
                            <>
                              <div className="text-[11px] font-semibold text-green-600 mb-1">{c.usuarioC2}</div>
                              <div className="bg-slate-200 rounded-full h-[5px] mb-1"><div className="bg-green-600 rounded-full h-full" style={{width:p2+"%"}}/></div>
                              <div className="text-[10px] text-muted-foreground mb-1">{new Set(c2s.map(x=>x.productoId)).size}/{total} · {p2}%</div>
                              <button onClick={()=>setModalCaps({conteoId:c.id,ronda:"C2",nombre:c.nombre})}
                                className={`inline-flex items-center justify-center gap-1 min-w-[40px] h-[22px] rounded-md px-2 text-[10px] font-extrabold text-white ${c2Cerrado?"bg-green-600 hover:bg-green-700":"bg-slate-400"}`}>
                                {c2Cerrado?<>OK <Eye size={11}/></>:"?"}
                              </button>
                            </>
                          ):(
                            <Button variant="outline" size="sm" className="h-7 px-2.5 text-xs text-amber-700 border-amber-300 bg-amber-50 hover:bg-amber-100 hover:text-amber-700" onClick={()=>setModalAsignar({conteoId:c.id,tipo:"C2"})}><Plus size={12}/> Asignar C2</Button>
                          )
                        ):<span className="text-slate-300 text-[11px]">N/A</span>}
                      </td>
                      <td className="px-2.5 py-1.5 text-[11px]">
                        {(()=>{
                          const undTotal=c2s.reduce((a,x)=>a+(Number(x.cantidad)||0),0);
                          return undTotal>0?<div className="whitespace-nowrap font-bold text-green-600">{undTotal} und</div>:<span className="text-slate-300">—</span>;
                        })()}
                      </td>

                      {/* Diferencia — solo si ambos cerrados */}
                      <td className="px-2.5 py-1.5 min-w-[70px] text-center">
                        {c.tipo==="2conteos"&&c1Cerrado&&c2Cerrado?(
                          difs.length>0?(
                            <div>
                              <div className="text-lg font-extrabold text-destructive">{difs.length}</div>
                              <div className="text-[9px] text-destructive">productos</div>
                            </div>
                          ):(
                            <div className="text-lg font-extrabold text-green-600">0</div>
                          )
                        ):<span className="text-slate-300">—</span>}
                      </td>

                      {/* Obs Dif — PDF solo si hay diferencia */}
                      <td className="px-2.5 py-1.5 text-[11px] text-muted-foreground">
                        {difs.length>0&&c1Cerrado&&c2Cerrado&&(
                          <button onClick={()=>expPDF(difs,c.nombre)}
                            className="inline-flex items-center gap-1 rounded-md bg-red-100 text-destructive px-2.5 py-1 text-[11px] font-bold hover:bg-red-200">
                            <Printer size={11}/> PDF
                          </button>
                        )}
                      </td>

                      {/* C3 — solo si hay diferencia */}
                      <td className="px-2.5 py-1.5 min-w-[90px]">
                        {c.estado==="diferencia"&&!c.usuarioC3?(
                          <Button variant="outline" size="sm" className="h-7 px-2.5 text-xs text-purple-700 border-purple-300 bg-purple-50 hover:bg-purple-100 hover:text-purple-700" onClick={()=>setModalAsignar({conteoId:c.id,tipo:"C3"})}><Plus size={12}/> Asignar C3</Button>
                        ):c.usuarioC3?(
                          <div>
                            <div className="text-[10px] text-purple-600 font-bold mb-0.5">{c.usuarioC3}</div>
                            <div className="text-[10px] text-muted-foreground mb-1">{c3s.length} reg</div>
                            <button onClick={()=>setModalCaps({conteoId:c.id,ronda:"C3",nombre:c.nombre})}
                              className={`inline-flex items-center justify-center gap-1 min-w-[40px] h-[22px] rounded-md px-2 text-[10px] font-extrabold text-white ${c.estado==="completado"?"bg-green-600 hover:bg-green-700":"bg-purple-600"}`}>
                              {c.estado==="completado"?<>OK <Eye size={11}/></>:"?"}
                            </button>
                          </div>
                        ):<span className="text-slate-300 text-[11px]">—</span>}
                      </td>

                      {/* Validador */}
                      <td className="px-2.5 py-1.5 text-center min-w-[80px]">
                        <div onClick={()=>puedeAsignarC3&&setModalAsignar({conteoId:c.id,tipo:"C3"})}
                          className="w-11 h-11 rounded-full flex items-center justify-center mx-auto shadow-md" style={{background:validColor,cursor:puedeAsignarC3?"pointer":"default",opacity:c3Terminado?0.7:1}}>
                          {validContent}
                        </div>
                        <div className="text-[9px] text-muted-foreground mt-1 text-center">
                          {c3Terminado?"C3 validado":puedeAsignarC3?"→ C3":c.estado==="completado"?"Sin dif":"En proceso"}
                        </div>
                      </td>

                      {/* Acciones */}
                      <td className="px-2.5 py-1.5 whitespace-nowrap">
                        <div className="flex gap-1.5 items-center">
                          <Button variant="outline" size="sm" className="h-7 px-2.5 text-xs" title="Imprimir documento de esta ubicación" onClick={()=>imprimirConteo(c)}><Printer size={12}/> Imprimir</Button>
                          {["cerradoC1","cerradoC2","completado","diferencia","enC3"].includes(c.estado)&&(
                            <Button variant="outline" size="sm" className="h-7 px-2.5 text-xs text-amber-700 border-amber-200 hover:bg-amber-50 hover:text-amber-700" onClick={()=>setModalReabrir(c)}><RefreshCw size={12}/> Reabrir</Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Modal asignar */}
      <Dialog open={!!modalAsignar} onOpenChange={(v)=>!v&&setModalAsignar(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{modalAsignar?.tipo==="C2"?"Asignar Usuario C2":modalAsignar?.tipo==="C3"?"Asignar Usuario C3 (desempate)":"Agregar usuario de apoyo"}</DialogTitle></DialogHeader>
          {modalAsignar&&(
          <div className="space-y-3.5">
            <div className="text-sm text-muted-foreground">
              {modalAsignar.tipo==="C2"&&"Este usuario hará el segundo conteo. Puede empezar en paralelo con C1."}
              {modalAsignar.tipo==="C3"&&"Este usuario contará solo los productos con diferencia entre C1 y C2."}
              {modalAsignar.tipo==="extra"&&"Este usuario ayudará pero no podrá cerrar el conteo."}
            </div>
            <div className="space-y-1.5">
              <Label>Seleccionar usuario</Label>
              <Select onValueChange={u=>{
                if(!u)return;
                const{conteoId,tipo}=modalAsignar;
                if(tipo==="C2")asignarC2(conteoId,u);
                else if(tipo==="C3")asignarC3(conteoId,u);
                else agregarUsuarioExtra(conteoId,u);
                setModalAsignar(null);
              }}>
                <SelectTrigger><SelectValue placeholder="Seleccionar…"/></SelectTrigger>
                <SelectContent>
                  {G.usuarios.filter(u=>u.activo).map(u=><SelectItem key={u.id} value={u.nombre}>{u.nombre}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Button variant="outline" className="w-full" onClick={()=>setModalAsignar(null)}>Cancelar</Button>
          </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
