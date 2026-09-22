import { useState } from "react";
import * as XLSX from "xlsx-js-style";
import {
  Landmark, DollarSign, BarChart2, Scale, AlertTriangle, CheckCircle,
  Package, FileText, ChevronLeft, ChevronRight, Camera, Trash2, Download,
  Target, Percent, AlertCircle, XCircle, Calendar, RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge as UIBadge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DataTable } from "@/components/ui/data-table";
import { StatTile } from "@/components/ui/stat-tile";
import { G, TODAY, getStInv, getKPIsInv, nU, SB, selectInventory } from "@/lib/data";
import { _snap } from "@/lib/sync";
export function VHistorial({G,showToast,usuario,rerender}){
  const [invSel,setInvSel]=useState(null);
  const [cardDetalle,setCardDetalle]=useState(null);
  const [confirmElim,setConfirmElim]=useState(null); // índice del historial a eliminar

  const fmt=(n)=>"$"+Math.round(n).toLocaleString("es-CO");
  const _fmtCOP=(n)=>new Intl.NumberFormat("es-CO",{style:"currency",currency:"COP",maximumFractionDigits:0}).format(Math.round(n||0));

  const reabrir=inv=>{
    const limite=Math.max(1,Number(G.tenant?.limite_inventarios||1));
    if(G.inventarios.length>=limite)return showToast(`No puedes reabrirlo: el plan permite ${limite} inventario${limite===1?"":"s"} activo${limite===1?"":"s"}.` ,"err");
    if(G.inventarios.some(x=>x.id===inv.id))return showToast("Este inventario ya está activo","warn");
    const activo={...inv,apertura:TODAY(),horaApertura:new Date().toLocaleTimeString("es-CO"),usuarioApertura:usuario?.nombre||inv.usuarioApertura,cierre:"",horaCierre:"",usuarioCierre:""};
    G.inventarios=[...G.inventarios,activo];
    G._inventarioDatos[inv.id]={
      productos:JSON.parse(JSON.stringify(inv.productos||[])),
      localizaciones:JSON.parse(JSON.stringify(inv.localizaciones||[])),
      ubicacionesTipos:[...(inv.ubicacionesTipos||[])],localizacionTipos:[...(inv.localizacionTipos||[])],
      alertas:[],conteos:JSON.parse(JSON.stringify(inv.conteos||[])),capturas:JSON.parse(JSON.stringify(inv.capturas||{})),
    };
    G.historial=G.historial.filter(x=>x.id!==inv.id);
    selectInventory(inv.id);
    rerender();showToast(`Inventario "${inv.nombre}" reabierto`);
  };

  const expXLSX=(data,cols,fname,titulo)=>{
    const ws=XLSX.utils.aoa_to_sheet([[titulo],[TODAY()],[],cols,...data]);
    const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,"Historial");XLSX.writeFile(wb,fname);showToast("Exportado ✓");
  };

  // Modal detalle de tarjeta
  if(cardDetalle){
    return(
      <div>
        <div className="flex gap-3 items-center mb-4">
          <Button variant="outline" size="sm" onClick={()=>setCardDetalle(null)}><ChevronLeft size={15}/> Volver</Button>
          <h2 className="text-lg font-bold">{cardDetalle.titulo}</h2>
        </div>
        <DataTable
          columns={cardDetalle.cols.map((h,i)=>({key:i,label:h}))}
          rows={(cardDetalle.lista||[]).map(row=>{const obj={};cardDetalle.cols.forEach((c,j)=>{obj[j]=row[j];});return obj;})}
          emptyText="Sin registros"
        />
      </div>
    );
  }

  // Detalle de un inventario
  if(invSel){
    const inv=invSel;
    // KPIs de gerencia centralizadas en lib/data (getKPIsInv): una sola verdad
    // compartida con el dashboard del gerente (ModGerente).
    const {st,analH,coincide,exactitud,cobertura,noContados,es2,conC2,coincC1C2,desempates,precision,sobU,falU,sobV,falV,hayCosto}=getKPIsInv(inv);
    // Datos para las gráficas del detalle (por unidades: sirven con o sin costo cargado)
    const invP=inv.productos||[];
    const topDH=[...analH].filter(a=>a.dif!==0).sort((a,b)=>Math.abs(b.dif)-Math.abs(a.dif)).slice(0,5);
    const topDHMax=Math.max(1,...topDH.map(a=>Math.abs(a.dif)));
    const saludH={bueno:st.buenos.reduce((s,r)=>s+r.cantFinal,0),vencido:st.vencidos.reduce((s,r)=>s+r.cantFinal,0),averiado:st.averiados.reduce((s,r)=>s+r.cantFinal,0)};
    const saludHTot=saludH.bueno+saludH.vencido+saludH.averiado;
    const catHMap={};analH.forEach(a=>{const k=a.categoria||"Sin categoría";catHMap[k]=(catHMap[k]||0)+a.dif;});
    const catsH=Object.entries(catHMap).map(([cat,val])=>({cat,val})).filter(c=>c.val!==0).sort((a,b)=>Math.abs(b.val)-Math.abs(a.val)).slice(0,6);
    const catHMax=Math.max(1,...catsH.map(c=>Math.abs(c.val)));
    const notasH=G.notas.filter(n=>n.inventarioId===inv.id);
    const rolC={admin:"#1e40af",gerente:"#7c3aed",capturador:"#16a34a"};
    const estOK=["cerradoC1","cerradoC2","completado"];
    const stCards=[
      {l:"Valor físico total",v:fmt(st.totalFisico),c:"#16a34a",
       lista:st.resumen.map(r=>[r.codigo,r.nombre,r.referencia,r.cantFinal,r.costo>0?fmt(r.cantFinal*r.costo):"—"]),
       cols:["Código","Nombre","Referencia","Cantidad","Valor"]},
      {l:"Valor sistema",v:fmt(st.totalSistema),c:"#2563eb",
       lista:st.resumen.map(r=>{const p=(inv.productos||[]).find(x=>x.id===r.productoId);return[r.codigo,r.nombre,r.referencia,p?.saldo||0,p?.costo>0?fmt((p?.saldo||0)*p.costo):"—"];}),
       cols:["Código","Nombre","Referencia","Saldo Sistema","Valor Sistema"]},
      {l:"Valor ajuste",v:(st.ajuste>=0?"+":"")+fmt(st.ajuste),c:st.ajuste>=0?"#16a34a":"#dc2626",
       lista:st.conDif.map(r=>{const p=(inv.productos||[]).find(x=>x.id===r.productoId);const dif=r.cantFinal-(p?.saldo||0);return[r.codigo,r.nombre,p?.saldo||0,r.cantFinal,dif>0?"+"+dif:dif,fmt(dif*(p?.costo||0))];}),
       cols:["Código","Nombre","Saldo","Físico","Diferencia","Valor Dif"]},
      {l:"Productos contados",v:`${st.contados}/${st.totalProductos}`,c:"#0891b2",
       lista:st.resumen.map(r=>[r.codigo,r.nombre,r.referencia,r.cantFinal,r.estado||""]),
       cols:["Código","Nombre","Referencia","Cantidad","Estado"]},
      {l:"Productos buenos",v:st.buenos.length,c:"#16a34a",
       lista:st.buenos.map(r=>[r.codigo,r.nombre,r.referencia,r.cantFinal]),
       cols:["Código","Nombre","Referencia","Cantidad"]},
      {l:"Vencidos",v:st.vencidos.length,c:"#dc2626",
       lista:st.vencidos.map(r=>[r.codigo,r.nombre,r.referencia,r.cantFinal]),
       cols:["Código","Nombre","Referencia","Cantidad"]},
      {l:"Averiados/No aptos",v:st.averiados.length,c:"#d97706",
       lista:st.averiados.map(r=>[r.codigo,r.nombre,r.referencia,r.cantFinal]),
       cols:["Código","Nombre","Referencia","Cantidad"]},
      {l:"Con diferencia",v:st.conDif.length,c:"#ef4444",
       lista:st.conDif.map(r=>{const p=(inv.productos||[]).find(x=>x.id===r.productoId);const dif=r.cantFinal-(p?.saldo||0);return[r.codigo,r.nombre,p?.saldo||0,r.cantFinal,dif>0?"+"+dif:dif];}),
       cols:["Código","Nombre","Saldo","Físico","Diferencia"]},
    ];
    return(
      <div>
        <div className="flex items-center gap-3 mb-4 flex-wrap">
          <Button variant="outline" size="sm" onClick={()=>setInvSel(null)}><ChevronLeft size={15}/> Historial</Button>
          <h2 className="text-xl font-bold">{inv.nombre}</h2>
          <UIBadge className="border-transparent" style={{background:(inv.tipo==="2conteos"?"#2563eb":"#16a34a")+"22",color:inv.tipo==="2conteos"?"#2563eb":"#16a34a"}}>{inv.tipo==="2conteos"?"2 CONTEOS":"1 CONTEO"}</UIBadge>
        </div>
         <div className="text-xs text-muted-foreground mb-4 flex items-center gap-1"><Calendar size={12}/> {inv.apertura} {inv.horaApertura} → {inv.cierre} {inv.horaCierre} · Por: {inv.usuarioApertura}</div>

         {/* RESULTADO DEL INVENTARIO: KPIs de gerencia */}
        {st.contados>0&&(<>
        <div className="text-[11px] font-extrabold tracking-wider uppercase text-slate-400 mb-2.5">Resultado del inventario</div>
        <div className="grid gap-3 mb-4" style={{gridTemplateColumns:"repeat(auto-fit,minmax(214px,1fr))"}}>
          {/* Exactitud */}
          <Card onClick={()=>setCardDetalle({titulo:"Productos con diferencia (no coinciden con el sistema)",cols:["Código","Nombre","Saldo","Físico","Diferencia"],lista:st.conDif.map(r=>{const p=invP.find(x=>x.id===r.productoId);const d=r.cantFinal-(p?.saldo||0);return[r.codigo,r.nombre,p?.saldo||0,r.cantFinal,d>0?"+"+nU(d):nU(d)];})})}
            className="px-4 py-3.5 cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-md">
            <div className="flex items-center gap-2 mb-2">
              <span className="grid place-items-center rounded-lg shrink-0" style={{width:30,height:30,background:"#eff6ff",color:"#2563eb"}}><Target size={16}/></span>
              <span className="text-[12px] font-bold text-slate-700 leading-tight">Exactitud del inventario</span>
            </div>
            <div className="text-[30px] font-extrabold leading-none tracking-tight" style={{color:"#2563eb"}}>{exactitud}%</div>
            <div className="h-[7px] rounded-full bg-slate-100 overflow-hidden mt-2.5"><div className="h-full rounded-full" style={{width:exactitud+"%",background:"#2563eb"}}/></div>
            <div className="text-[12px] text-slate-500 mt-2 font-semibold"><b className="font-extrabold text-slate-700">{coincide}</b> de {st.contados} coinciden · <b className="font-extrabold" style={{color:"#dc2626"}}>{st.conDif.length}</b> con diferencia</div>
          </Card>
          {/* Precisión C1=C2 (solo 2 conteos) */}
          {es2&&conC2.length>0&&(
          <Card onClick={()=>setCardDetalle({titulo:"Productos que fueron a desempate (C3)",cols:["Código","Nombre","C1","C2","C3","Final"],lista:desempates.map(r=>[r.codigo,r.nombre,r.totalC1||0,r.totalC2||0,r.totalC3||0,r.cantFinal])})}
            className="px-4 py-3.5 cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-md">
            <div className="flex items-center gap-2 mb-2">
              <span className="grid place-items-center rounded-lg shrink-0" style={{width:30,height:30,background:"#f0fdf4",color:"#16a34a"}}><Percent size={16}/></span>
              <span className="text-[12px] font-bold text-slate-700 leading-tight">Precisión de conteo (C1 = C2)</span>
            </div>
            <div className="text-[30px] font-extrabold leading-none tracking-tight" style={{color:"#16a34a"}}>{precision}%</div>
            <div className="h-[7px] rounded-full bg-slate-100 overflow-hidden mt-2.5"><div className="h-full rounded-full" style={{width:precision+"%",background:"#16a34a"}}/></div>
            <div className="text-[12px] text-slate-500 mt-2 font-semibold"><b className="font-extrabold text-slate-700">{coincC1C2}</b> coincidieron · <b className="font-extrabold" style={{color:"#7c3aed"}}>{desempates.length}</b> a desempate C3</div>
          </Card>
          )}
          {/* Cobertura */}
          <Card onClick={()=>setCardDetalle({titulo:"Productos sin contar",cols:["Código","Nombre","Referencia","Saldo Sistema"],lista:noContados.map(p=>[p.codigo,p.nombre,p.referencia||"",p.saldo||0])})}
            className="px-4 py-3.5 cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-md">
            <div className="flex items-center gap-2 mb-2">
              <span className="grid place-items-center rounded-lg shrink-0" style={{width:30,height:30,background:"#ecfeff",color:"#0891b2"}}><Package size={16}/></span>
              <span className="text-[12px] font-bold text-slate-700 leading-tight">Cobertura del conteo</span>
            </div>
            <div className="text-[30px] font-extrabold leading-none tracking-tight" style={{color:"#0891b2"}}>{cobertura}%</div>
            <div className="h-[7px] rounded-full bg-slate-100 overflow-hidden mt-2.5"><div className="h-full rounded-full" style={{width:cobertura+"%",background:"#0891b2"}}/></div>
            <div className="text-[12px] text-slate-500 mt-2 font-semibold"><b className="font-extrabold text-slate-700">{st.contados}</b>/{st.totalProductos} · faltan <b className="font-extrabold" style={{color:"#d97706"}}>{noContados.length}</b></div>
          </Card>
          {/* Ajuste: sobrante vs faltante */}
          <Card className="px-4 py-3.5">
            <div className="flex items-center gap-2 mb-2">
              <span className="grid place-items-center rounded-lg shrink-0" style={{width:30,height:30,background:"#f5f0ff",color:"#7c3aed"}}><Scale size={16}/></span>
              <span className="text-[12px] font-bold text-slate-700 leading-tight">Ajuste: sobrante vs faltante</span>
            </div>
            <div className="flex items-stretch gap-3 mt-1">
              <div className="flex-1 min-w-0">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Sobrante</div>
                <div className="text-[18px] font-extrabold leading-tight truncate" style={{color:"#16a34a"}}>+{nU(sobU)}<span className="text-[11px] text-slate-400 font-bold"> und</span></div>
                {hayCosto&&<div className="text-[11px] font-bold truncate" style={{color:"#16a34a"}}>{fmt(sobV)}</div>}
              </div>
              <div className="w-px bg-slate-200"/>
              <div className="flex-1 min-w-0">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Faltante</div>
                <div className="text-[18px] font-extrabold leading-tight truncate" style={{color:"#dc2626"}}>−{nU(falU)}<span className="text-[11px] text-slate-400 font-bold"> und</span></div>
                {hayCosto&&<div className="text-[11px] font-bold truncate" style={{color:"#dc2626"}}>{fmt(falV)}</div>}
              </div>
            </div>
             <div className="text-[12px] text-slate-500 mt-2.5 font-semibold">Neto <b className="font-extrabold" style={{color:(sobU-falU)>=0?"#16a34a":"#dc2626"}}>{(sobU-falU)>=0?"+":"−"}{nU(Math.abs(sobU-falU))} und</b>{hayCosto?` · ${(st.ajuste>=0?"+":"")+fmt(st.ajuste)}`:" · sin costos"}</div>
          </Card>
        </div>
        <div className="text-[11px] font-extrabold tracking-wider uppercase text-slate-400 mb-2.5">Detalle <span className="normal-case font-semibold text-slate-400">· clic en una tarjeta para ver los productos</span></div>
        </>)}
        <div className="grid gap-3 mb-5" style={{gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))"}}>
          {stCards.map((s,i)=>(
            <Card key={i} onClick={()=>setCardDetalle({titulo:s.l,lista:s.lista,cols:s.cols})}
              className="relative px-4 py-3.5 cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-md" style={{borderTop:`3px solid ${s.c}`}}>
              <ChevronRight size={14} className="absolute right-3 top-3 text-slate-300"/>
              <div className="font-extrabold" style={{color:s.c,fontSize:typeof s.v==="string"&&s.v.length>8?14:22}}>{s.v}</div>
              <div className="text-[11px] text-slate-500 mt-1 font-medium">{s.l}</div>
            </Card>
          ))}
        </div>

        {/* Dashboard visual: dona de sanidad + barras de descuadres */}
        {st.contados>0&&(
        <div className="grid gap-3 mb-4" style={{gridTemplateColumns:"repeat(auto-fit,minmax(320px,1fr))"}}>
          <Card className="p-4">
            <div className="text-[13px] font-bold text-slate-900 mb-3">Sanidad del stock</div>
            <div className="flex items-center gap-5 flex-wrap">
              {(()=>{const r=52,C=2*Math.PI*r,T=saludHTot||1;let acc=0;const segs=[{v:saludH.bueno,c:"#16a34a"},{v:saludH.vencido,c:"#dc2626"},{v:saludH.averiado,c:"#d97706"}];return(
                <div className="relative shrink-0" style={{width:126,height:126}}>
                  <svg width="126" height="126" viewBox="0 0 126 126">
                    <circle cx="63" cy="63" r={r} fill="none" stroke="#eef1f5" strokeWidth="15"/>
                    {segs.map((s,i)=>{const len=(s.v/T)*C;const off=-acc;acc+=len;return <circle key={i} cx="63" cy="63" r={r} fill="none" stroke={s.c} strokeWidth="15" strokeDasharray={`${len} ${C}`} strokeDashoffset={off} strokeLinecap="butt" transform="rotate(-90 63 63)"/>;})}
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <div className="text-[19px] font-black text-green-600">{saludHTot?Math.round(saludH.bueno/saludHTot*100):0}%</div>
                    <div className="text-[10px] text-slate-400 font-bold">BUENO</div>
                  </div>
                </div>
              );})()}
              <div className="flex flex-col gap-2">
                {[{l:"Bueno",v:saludH.bueno,c:"#16a34a"},{l:"Vencido",v:saludH.vencido,c:"#dc2626"},{l:"Averiado",v:saludH.averiado,c:"#d97706"}].map(x=>(
                  <div key={x.l} className="flex items-center gap-2 text-[12.5px]">
                    <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{background:x.c}}/>
                    <span className="text-slate-600 font-medium">{x.l}</span><b className="text-slate-900 ml-0.5">{x.v}</b>
                    <span className="text-slate-400 text-[11px]">({saludHTot?Math.round(x.v/saludHTot*100):0}%)</span>
                  </div>
                ))}
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="text-[13px] font-bold text-slate-900 mb-3 flex items-center gap-1.5"><AlertTriangle size={14} className="text-red-600"/> Top descuadres (unidades)</div>
            {topDH.length===0?<div className="text-[12.5px] text-slate-400 py-2">Sin diferencias.</div>:topDH.map((a,i)=>{const w=Math.round(Math.abs(a.dif)/topDHMax*100);const neg=a.dif<0;return(
              <div key={i} className="mb-2.5">
                <div className="flex justify-between gap-2 text-xs mb-1"><span className="font-semibold truncate">{a.nombre}</span><span className="font-extrabold whitespace-nowrap" style={{color:neg?"#dc2626":"#2563eb"}}>{a.dif>0?"+":""}{a.dif} und</span></div>
                <div className="h-2 rounded bg-slate-100 overflow-hidden"><div className="h-full rounded" style={{width:w+"%",background:neg?"#dc2626":"#2563eb"}}/></div>
              </div>
            );})}
          </Card>
        </div>
        )}
        {catsH.length>0&&(
          <Card className="p-4 mb-4">
            <div className="text-[13px] font-bold text-slate-900 mb-3">Diferencia por categoría (unidades)</div>
            {catsH.map((c,i)=>{const w=Math.round(Math.abs(c.val)/catHMax*100);const neg=c.val<0;return(
              <div key={i} className="mb-2.5">
                <div className="flex justify-between gap-2 text-xs mb-1"><span className="font-semibold">{c.cat}</span><span className="font-extrabold" style={{color:neg?"#dc2626":"#2563eb"}}>{c.val>0?"+":""}{c.val} und</span></div>
                <div className="h-2 rounded bg-slate-100 overflow-hidden"><div className="h-full rounded" style={{width:w+"%",background:neg?"#dc2626":"#2563eb"}}/></div>
              </div>
            );})}
          </Card>
        )}

        {/* Estado de conteos */}
        <Card className="mb-4 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 font-bold text-[13px] text-slate-900">Estado de conteos</div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead><tr className="bg-slate-50 text-slate-500 border-b border-slate-100">
                {["Nombre","Ubicación","C1","Estado C1","C2","Estado C2","Estado"].map(h=>(
                  <th key={h} className="px-3.5 py-2.5 text-left font-semibold whitespace-nowrap">{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {(inv.conteos||[]).length===0?(
                  <tr><td colSpan={7} className="px-3.5 py-4 text-center text-muted-foreground">Sin conteos registrados en este inventario.</td></tr>
                ):(inv.conteos||[]).map((c,i)=>(
                  <tr key={c.id} className="border-b last:border-0" style={{background:i%2?"#fafafa":"white"}}>
                    <td className="px-3.5 py-2.5 font-bold text-slate-900">{c.nombre}</td>
                    <td className="px-3.5 py-2.5 text-muted-foreground">{c.locLabel||"—"}</td>
                    <td className="px-3.5 py-2.5 text-blue-600 font-semibold">{c.usuarioC1||"—"}</td>
                    <td className="px-3.5 py-2.5">{c.usuarioC1?<UIBadge className="border-transparent" style={{background:estOK.includes(c.estado)?"#f0fdf4":"#fffbeb",color:estOK.includes(c.estado)?"#16a34a":"#d97706"}}>{estOK.includes(c.estado)?"OK":"En curso"}</UIBadge>:"—"}</td>
                    <td className="px-3.5 py-2.5 text-green-600 font-semibold">{c.usuarioC2||"N/A"}</td>
                    <td className="px-3.5 py-2.5">{c.usuarioC2?<UIBadge className="border-transparent" style={{background:["cerradoC2","completado"].includes(c.estado)?"#f0fdf4":"#fffbeb",color:["cerradoC2","completado"].includes(c.estado)?"#16a34a":"#d97706"}}>{["cerradoC2","completado"].includes(c.estado)?"OK":"Pendiente"}</UIBadge>:"—"}</td>
                    <td className="px-3.5 py-2.5"><UIBadge className="border-transparent" style={{background:c.estado==="completado"?"#f0fdf4":c.estado==="diferencia"?"#fef2f2":"#f8fafc",color:c.estado==="completado"?"#16a34a":c.estado==="diferencia"?"#dc2626":"#64748b"}}>{c.estado}</UIBadge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* La historia de este inventario */}
        <Card className="p-4 mb-4">
          <div className="text-[13px] font-bold text-slate-900 mb-0.5 flex items-center gap-1.5"><FileText size={14} className="text-purple-600"/> La historia de este inventario</div>
          <div className="text-[11px] text-muted-foreground mb-3">Fotos y observaciones que dejaron los usuarios durante el inventario.</div>
          {notasH.length===0?(
            <div className="text-[12.5px] text-slate-400 py-1.5">Sin notas en este inventario.</div>
          ):(
            <div className="flex flex-col gap-3">
              {notasH.map(n=>(
                <div key={n.id} className="bg-slate-50 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="grid place-items-center rounded-full text-white font-extrabold text-xs shrink-0" style={{width:30,height:30,background:rolC[n.rol]||"#64748b"}}>{n.usuario[0]}</div>
                    <div>
                      <div className="font-bold text-[13px] text-slate-900">{n.usuario} <span className="text-[10px] text-muted-foreground font-normal uppercase">{n.rol}</span></div>
                      <div className="text-[11px] text-muted-foreground">{n.fecha} · {n.hora}</div>
                    </div>
                  </div>
                  {n.texto&&<div className="text-[13.5px] text-slate-700 leading-relaxed">{n.texto}</div>}
                  {n.fotos?.length>0&&(
                    <div className="flex flex-wrap gap-2 mt-2">
                      {n.fotos.map((f,i)=>(
                        <img key={i} src={f.data} alt={f.name} onClick={()=>window.open(f.data)} className="w-20 h-20 object-cover rounded-lg cursor-pointer border border-slate-200 shadow-sm" style={{background:"#fff"}}/>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>
        <div className="flex gap-2.5 flex-wrap">
          <Button onClick={()=>expXLSX(
            st.resumen.map(r=>{const p=(inv.productos||[]).find(x=>x.id===r.productoId);return[r.ean||"",r.codigo,r.nombre,r.referencia,r.totalC1||"",r.totalC2||"",r.totalC3||"",r.cantFinal,r.estado||"",p?.saldo||0,r.costo>0?fmt(r.cantFinal*r.costo):"—",r.usuario];}),
            ["EAN","CODIGO","NOMBRE","REFERENCIA","C1","C2","C3","CANTIDAD_FINAL","ESTADO","SALDO_SISTEMA","VALOR","USUARIO"],
            `captura_${inv.nombre?.replace(/ /g,"_")}.xlsx`,`CAPTURA INVENTARIO ${inv.nombre}`)}><Download size={15}/> Excel capturas</Button>
          <Button style={{background:"#16a34a"}} onClick={()=>expXLSX(
            st.conDif.map(r=>{const p=(inv.productos||[]).find(x=>x.id===r.productoId);const dif=r.cantFinal-(p?.saldo||0);return[r.codigo,r.nombre,r.referencia,r.estado||"",p?.saldo||0,r.cantFinal,dif,Math.round(dif*(p?.costo||0)),p?.costo||0];}),
            ["CODIGO","NOMBRE","REFERENCIA","ESTADO","SALDO","FISICO","DIFERENCIA","VALOR_DIF","COSTO"],
            `ajuste_${inv.nombre?.replace(/ /g,"_")}.xlsx`,`AJUSTE ${inv.nombre}`)}><Download size={15}/> Excel ajuste</Button>
        </div>
      </div>
    );
  }

  // Vista global
  return(
    <div>
      <PageHeader
        label="Inventarios"
        title="Historial"
        icon={Landmark}
        subtitle={G.historial[0]?.nombre||"Sin inventarios cerrados"}
        count={G.historial.length}
        countLabel="inventarios"
      />
      {G.historial.length===0?(
        <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-white py-12 px-5 text-center text-muted-foreground">
          <Landmark size={48} className="text-slate-400 mb-3"/>
          <div className="text-base font-bold text-slate-900 mb-1.5">Sin historial</div>
          <div className="text-sm">Los inventarios cerrados aparecerán aquí.</div>
        </div>
       ):G.historial.length===1?(
         (()=>{const inv=G.historial[0];const st=getStInv(inv);const notasH=G.notas.filter(n=>n.inventarioId===inv.id);const fotosN=notasH.reduce((s,n)=>s+(n.fotos?.length||0),0);const cobertura=st.totalProductos?Math.round(st.contados/st.totalProductos*1000)/10:0;const coinciden=st.contados-st.conDif.length;const kpis=[
           {l:"Cobertura del conteo",v:`${cobertura}%`,detail:`${st.contados} de ${st.totalProductos} productos`,c:"#0891b2",icon:Target},
           {l:"Exactitud contra sistema",v:st.contados?`${Math.round(coinciden/st.contados*1000)/10}%`:"0%",detail:`${coinciden} coinciden · ${st.conDif.length} con diferencia`,c:st.conDif.length?"#dc2626":"#16a34a",icon:CheckCircle},
           {l:"Valor físico contado",v:_fmtCOP(st.totalFisico),detail:"Valor de las existencias contadas",c:"#2563eb",icon:DollarSign},
           {l:"Ajuste neto",v:_fmtCOP(st.ajuste),detail:st.ajuste<0?"Faltante frente al sistema":"Sobrante frente al sistema",c:st.ajuste<0?"#dc2626":"#16a34a",icon:Scale},
           {l:"Incidencias registradas",v:`${st.conDif.length}`,detail:`${notasH.length} notas · ${fotosN} fotos`,c:st.conDif.length?"#d97706":"#64748b",icon:AlertTriangle},
         ];return(
           <div>
             <div className="mb-4 flex items-center justify-between gap-3 flex-wrap">
               <div><div className="text-[11px] font-extrabold tracking-wider uppercase text-slate-400">Resumen gerencial</div><div className="text-sm text-slate-500 mt-1">Resultado del último inventario cerrado</div></div>
               <Button variant="outline" size="sm" onClick={()=>setInvSel(inv)}>Ver análisis completo <ChevronRight size={14}/></Button>
             </div>
              <div className="grid gap-3 mb-4" style={{gridTemplateColumns:"repeat(auto-fit,minmax(190px,1fr))"}}>
                {kpis.map((k,i)=>(
                  <StatTile key={i} label={k.l} value={k.v} detail={k.detail} icon={<k.icon size={16}/>}
                    iconTone={k.c==="#dc2626"?"danger":k.c==="#16a34a"?"success":k.c==="#d97706"?"warning":"info"}
                    className="border-l-4" style={{borderLeftColor:k.c}}/>
                ))}
              </div>
             <Card className="p-4 mb-4 border-l-4 border-l-primary">
               <div className="flex items-center justify-between gap-3 flex-wrap"><div><div className="font-bold text-base">{inv.nombre}</div><div className="text-xs text-muted-foreground mt-0.5">{inv.apertura} → {inv.cierre} · Responsable: {inv.usuarioApertura||"—"}</div></div><Button variant="outline" size="sm" onClick={()=>reabrir(inv)}><RotateCcw size={14}/> Reabrir</Button></div>
             </Card>
           </div>
        );})()
      ):(
        <>
          {/* KPIs acumulados del historial */}
          {(()=>{
            const sts=G.historial.map(h=>getStInv(h));
            const ajusteNeto=sts.reduce((s,x)=>s+(x.ajuste||0),0);
            const notasH=G.notas.filter(n=>G.historial.some(h=>h.id===n.inventarioId));
            const fotosN=notasH.reduce((s,n)=>s+(n.fotos?.length||0),0);
            const conDif=sts.filter(x=>x.conDif.length>0).length;
            const ult=sts[0]||{totalFisico:0};
            const kpis=[
              {l:"Inventarios cerrados",v:G.historial.length,c:"#7c3aed",bg:"#f5f0ff",icon:Landmark},
              {l:"Ajuste acumulado",v:_fmtCOP(ajusteNeto),c:ajusteNeto>=0?"#16a34a":"#dc2626",bg:ajusteNeto>=0?"#f0fdf4":"#fef2f2",icon:Scale},
              {l:"Valor físico último",v:_fmtCOP(ult.totalFisico),c:"#2563eb",bg:"#eff6ff",icon:DollarSign},
              {l:"Con diferencias",v:conDif+" de "+G.historial.length,c:conDif>0?"#dc2626":"#16a34a",bg:conDif>0?"#fef2f2":"#f0fdf4",icon:AlertTriangle},
              {l:"Notas y fotos",v:notasH.length+" notas · "+fotosN+" fotos",c:"#0891b2",bg:"#ecfeff",icon:FileText},
            ];
            return(
              <div className="grid gap-3 mb-4" style={{gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))"}}>
                {kpis.map((k,i)=>(
                  <Card key={i} className="px-4 py-3.5" style={{background:k.bg,borderColor:k.c+"22"}}>
                    <span className="grid place-items-center rounded-lg mb-2" style={{width:34,height:34,background:"white",color:k.c,border:`1px solid ${k.c}22`}}><k.icon size={17}/></span>
                    <div className="font-black leading-tight truncate" style={{color:k.c,fontSize:typeof k.v==="string"&&k.v.length>9?13:18}}>{k.v}</div>
                    <div className="text-[11px] text-muted-foreground mt-1 font-semibold">{k.l}</div>
                  </Card>
                ))}
              </div>
            );
          })()}
          <div className="flex flex-col gap-3">
            {G.historial.map((h,i)=>{
              const st=getStInv(h);
              const notasH=G.notas.filter(n=>n.inventarioId===h.id);
              const fotosN=notasH.reduce((s,n)=>s+(n.fotos?.length||0),0);
              const invP=h.productos||[];
              const sobU=st.resumen.reduce((s,r)=>{const p=invP.find(x=>x.id===r.productoId);const d=r.cantFinal-(p?.saldo||0);return s+(d>0?d:0);},0);
              const falU=st.resumen.reduce((s,r)=>{const p=invP.find(x=>x.id===r.productoId);const d=r.cantFinal-(p?.saldo||0);return s+(d<0?-d:0);},0);
              return(
                <Card key={i} className="p-5 border-l-4 border-l-primary hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start">
                    <div className="flex-1 cursor-pointer" onClick={()=>setInvSel(h)}>
                      <div className="font-bold text-[15px] text-slate-900">{h.nombre}</div>
                      <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5 flex-wrap">
                        <UIBadge className="border-transparent" style={{background:(h.tipo==="2conteos"?"#2563eb":"#16a34a")+"22",color:h.tipo==="2conteos"?"#2563eb":"#16a34a"}}>{h.tipo==="2conteos"?"2 CONTEOS":"1 CONTEO"}</UIBadge>
                        {h.apertura} → {h.cierre} · Por: {h.usuarioApertura||"—"}
                      </div>
                      <div className="flex gap-4 mt-2 flex-wrap">
                        <span className="text-xs text-green-600 font-bold inline-flex items-center gap-1"><DollarSign size={11}/> {_fmtCOP(st.totalFisico)}</span>
                        <span className="text-xs font-bold inline-flex items-center gap-1" style={{color:st.ajuste>=0?"#16a34a":"#dc2626"}}><Scale size={11}/> {(st.ajuste>=0?"+":"")+_fmtCOP(st.ajuste)}</span>
                        <span className="text-xs text-muted-foreground">{st.contados}/{st.totalProductos} productos</span>
                        {st.conDif.length>0&&<span className="text-xs text-destructive font-bold inline-flex items-center gap-1"><AlertTriangle size={11}/> {st.conDif.length} difs</span>}
                        {(sobU>0||falU>0)&&<span className="text-xs font-bold" style={{color:sobU>=falU?"#16a34a":"#dc2626"}}>+{nU(sobU)} / −{nU(falU)} und</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2.5 shrink-0 ml-3">
                      <span className="text-[11px] text-muted-foreground font-semibold hidden sm:inline-flex items-center gap-1.5"><FileText size={11}/> {notasH.length} · <Camera size={11}/> {fotosN}</span>
                      <div className="text-xs text-primary font-semibold cursor-pointer inline-flex items-center gap-0.5" onClick={()=>setInvSel(h)}>Ver detalle <ChevronRight size={13}/></div>
                      <Button variant="outline" size="sm" className="h-8 px-2.5" onClick={e=>{e.stopPropagation();reabrir(h);}}><RotateCcw size={14}/> Reabrir</Button>
                      <Button variant="outline" size="sm" className="h-8 px-2.5 text-destructive border-red-200 hover:bg-red-50 hover:text-destructive" onClick={e=>{e.stopPropagation();setConfirmElim(i);}}><Trash2 size={14}/></Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </>
      )}

      {/* Modal confirmar eliminación historial */}
      <ConfirmDialog
        open={confirmElim!==null}
        onOpenChange={(v)=>!v&&setConfirmElim(null)}
        icon={Trash2}
        title="Eliminar inventario"
        description={<>¿Estás seguro de eliminar <strong>{G.historial[confirmElim]?.nombre}</strong> del historial? Esta acción no se puede deshacer.</>}
        confirmText="Sí, eliminar"
        onConfirm={async()=>{
          const inv=G.historial[confirmElim];
          if(inv){
            // Eliminar en Supabase primero
            try{await SB.deleteInventario(inv.id);}catch(e){console.warn("Error al eliminar en Supabase:",e);}
            // Eliminar del snap para que doSync no lo restaure
            delete _snap.hist[inv.id];
          }
          G.historial=G.historial.filter((_,idx)=>idx!==confirmElim);
          setConfirmElim(null);
            showToast("Inventario eliminado ✓","warn");
        }}
      />
    </div>
  );
}

