import { useState } from "react";
import * as XLSX from "xlsx-js-style";
import {
  BarChart2, MapPin, RefreshCw, CheckCircle, Circle, Scale,
  Wrench, FileText, Download, Printer, ChevronLeft, Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import Section from "@/components/Section";
import { G, TODAY, HOUR, exportSheet, SIIGO_AJUSTE_COLS } from "@/lib/data";
import { exportReporteXLSX } from "@/lib/reporteXLSX";
import { ReporteGrid } from "@/components/ReporteGrid";

// ── REPORTES ──
export function VReportes({G,showToast,usuario}){
  const [verDifs,setVerDifs]=useState(false);
  const [vista,setVista]=useState(null); // reporte abierto en pantalla: 'diferencias'|'captura'|'sinconteo'
  const caps=Object.values(G.capturas);

  const expXLSX=(data,cols,fname,titulo)=>{
    const ws=XLSX.utils.aoa_to_sheet([[titulo],["Usuario: "+usuario.nombre+" | "+TODAY()+" | "+HOUR()],[],cols,...data]);
    const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,"Reporte");XLSX.writeFile(wb,fname);showToast("Exportado ✓");
  };

  const expPDF=(difs,conteoNombre)=>{
    const rows=difs.map(d=>`<tr><td>${d.codigo}</td><td>${d.ean||""}</td><td>${d.nombre}</td><td>${d.referencia}</td><td style="text-align:center">${d.c1}</td><td style="text-align:center">${d.c2}</td><td style="text-align:center;color:red;font-weight:bold">${d.dif>0?"+"+d.dif:d.dif}</td><td>${d.u1}</td><td>${d.u2}</td><td style="border:2px solid #000;min-width:80px">&nbsp;</td></tr>`).join("");
    const html=`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Diferencias ${conteoNombre}</title>
    <style>body{font-family:Arial,sans-serif;padding:20px;font-size:11px}h2{color:#1e40af}table{width:100%;border-collapse:collapse}th{background:#0f172a;color:white;padding:7px}td{padding:6px;border:1px solid #e2e8f0}tr:nth-child(even){background:#f8fafc}</style></head>
    <body><h2>Reporte Diferencias de Conteos</h2><p><b>Conteo:</b> ${conteoNombre} &nbsp;|&nbsp; <b>Fecha:</b> ${TODAY()} &nbsp;|&nbsp; <b>Usuario:</b> ${usuario.nombre}</p>
    <table><thead><tr><th>Código</th><th>EAN</th><th>Nombre</th><th>Referencia</th><th>C1</th><th>C2</th><th>Diferencia</th><th>Usuario C1</th><th>Usuario C2</th><th>Conteo 3</th></tr></thead><tbody>${rows}</tbody></table>
    <script>window.onload=()=>window.print();</script></body></html>`;
    const w=window.open("","_blank");w.document.write(html);w.document.close();
  };

  // Diferencias por conteo
  const conteosDifs=G.conteos.map(c=>{
    if(c.tipo!=="2conteos")return null;
    const difs=[];
    G.productos.forEach(p=>{
      const t1=caps.filter(x=>x.conteoId===c.id&&x.productoId===p.id&&x.ronda==="C1").reduce((s,x)=>s+x.cantidad,0);
      const t2=caps.filter(x=>x.conteoId===c.id&&x.productoId===p.id&&x.ronda==="C2").reduce((s,x)=>s+x.cantidad,0);
      if((t1>0||t2>0)&&t1!==t2){
        const u1=caps.find(x=>x.conteoId===c.id&&x.productoId===p.id&&x.ronda==="C1")?.usuario||"";
        const u2=caps.find(x=>x.conteoId===c.id&&x.productoId===p.id&&x.ronda==="C2")?.usuario||"";
        difs.push({...p,c1:t1,c2:t2,dif:t1-t2,u1,u2});
      }
    });
    return difs.length>0?{conteo:c,difs}:null;
  }).filter(Boolean);

  const totalDifs=conteosDifs.reduce((s,x)=>s+x.difs.length,0);

  const contadoIds=new Set(caps.map(c=>c.productoId));
  const sinConteo=G.productos.filter(p=>!contadoIds.has(p.id));

  // REPORTE DE CAPTURA — una fila por (producto + ESTADO). Si un producto se
  // capturó en varios estados (ej. BUENO y VENCIDO), sale un renglón por cada
  // estado con sus C1/C2/C3 sumados. Solo rondas de conteo (no el ajuste).
  const capFinal=G.productos.flatMap(p=>{
    const misC=caps.filter(c=>c.productoId===p.id&&["C1","C2","C3"].includes(c.ronda));
    if(!misC.length)return [];
     const finalRonda=misC.some(c=>c.ronda==="C3")?"C3":misC.some(c=>c.ronda==="C2")?"C2":"C1";
     const last=misC[misC.length-1];
    const conteo=G.conteos.find(c=>c.id===last.conteoId);
    const estados=[...new Set(misC.map(c=>(c.estado||"BUENO")))];
    return estados.map(est=>{
      const ce=misC.filter(c=>(c.estado||"BUENO")===est);
      const sumC1=ce.filter(c=>c.ronda==="C1").reduce((s,c)=>s+c.cantidad,0);
      const sumC2=ce.filter(c=>c.ronda==="C2").reduce((s,c)=>s+c.cantidad,0);
      const sumC3=ce.filter(c=>c.ronda==="C3").reduce((s,c)=>s+c.cantidad,0);
       // El estado final debe salir de la última ronda disponible completa,
       // no de sumar estados de rondas distintas.
       const final=ce.filter(c=>c.ronda===finalRonda).reduce((s,c)=>s+c.cantidad,0);
      const le=ce[ce.length-1];
      return{
        ...p,
        ubicacion:conteo?.ubicacion||"",
        localizacion:conteo?.localizacion||"",
        nro:conteo?.nro||"",
        c1:sumC1||"",c2:sumC2||"",c3:sumC3||"",
        cantFinal:final,
        diferencia:final-(p.saldo||0),
        valDif:(final-(p.saldo||0))*(p.costo||0),
         estado:est,
         rondaFinal:finalRonda,
        obs:le?.obs||"",
        usuario:le?.usuario||"",
      };
    });
  });

  // BASE COMPLETA: recorre TODOS los productos de la base de datos.
  // Los no contados cuentan como físico = 0 (faltante total).
  const capByProd={};
  caps.forEach(c=>{
    if(!capByProd[c.productoId])capByProd[c.productoId]={c1:0,c2:0,c3:0,last:null,aju:null};
    const r=capByProd[c.productoId];
    if(c.ronda==="C1")r.c1+=c.cantidad;else if(c.ronda==="C2")r.c2+=c.cantidad;else if(c.ronda==="C3")r.c3+=c.cantidad;else if(c.ronda==="AJU")r.aju=c.cantidad;
    r.last=c;
  });
   const baseCompleta=G.productos.map(p=>{
    const r=capByProd[p.id];
    const sumC1=r?r.c1:0,sumC2=r?r.c2:0,sumC3=r?r.c3:0;
    const contado=!!r;
    const final=(r&&r.aju!==null)?r.aju:(contado?(sumC3||sumC2||sumC1):0); // el ajuste manda
     const last=r?r.last:null;
     const capsProd=r?caps.filter(c=>c.productoId===p.id&&["C1","C2","C3"].includes(c.ronda)):[];
     const rondaFinal=capsProd.some(c=>c.ronda==="C3")?"C3":capsProd.some(c=>c.ronda==="C2")?"C2":"C1";
     const estadosFinal={};
     capsProd.filter(c=>c.ronda===rondaFinal).forEach(c=>{const estado=c.estado||"BUENO";estadosFinal[estado]=(estadosFinal[estado]||0)+c.cantidad;});
    const conteo=last?G.conteos.find(c=>c.id===last.conteoId):null;
    return{
      ...p,
      ubicacion:conteo?.ubicacion||p.ubicacion||"",
      localizacion:conteo?.localizacion||p.localizacion||"",
      nro:conteo?.nro||"",
      c1:sumC1||"",c2:sumC2||"",c3:sumC3||"",
      cantFinal:final,
      contado,
      diferencia:final-(p.saldo||0),
      valDif:(final-(p.saldo||0))*(p.costo||0),
       estado:contado?Object.entries(estadosFinal).map(([estado,cantidad])=>`${estado}: ${cantidad}`).join(" | "):"SIN CONTAR",
       estadoDesglose:estadosFinal,
      obs:last?.obs||"",
      usuario:last?.usuario||"",
    };
  });
  // Diferencia sobre toda la base: cualquier producto cuyo físico != saldo sistema
  const difBase=baseCompleta.filter(c=>c.diferencia!==0);

  // Exporta el comprobante de ajuste en el formato de importación de Siigo.
  // TODA la base con diferencia ≠ 0 (contados o no; un producto no contado con saldo
  // en sistema sale como Disminuye por su saldo). diferencia>0 ⇒ Aumenta, <0 ⇒ Disminuye.
  const expSiigo=()=>{
    const rows=difBase
      .map(c=>[c.codigo,c.nombre,c.referencia||"",c.diferencia>0?"Aumenta":"Disminuye",Math.abs(c.diferencia),c.costo||0]);
    if(!rows.length)return showToast("No hay diferencias para ajustar","warn");
    exportSheet(rows,SIIGO_AJUSTE_COLS,`ajuste_siigo_${TODAY().replace(/\//g,"-")}.xlsx`,"Datos");
    showToast(`Ajuste Siigo generado (${rows.length} productos) ✓`);
  };
  const valorAjusteTotal=baseCompleta.reduce((s,c)=>s+c.valDif,0);

  // Config compartida de reportes: MISMA definición para la pantalla (ReporteGrid)
  // y el Excel (reporteXLSX). Regla de estados: diferencias SIN estado (consolidado),
  // captura CON estado.
  const metaRep=`Inventario ${G.inventario?.nombre||""} · ${TODAY()} ${HOUR()} · Por: ${usuario?.nombre||""}`;
  const repCfg={
    diferencias:{ title:"Reporte de diferencias — consolidado por producto", groupBy:"categoria", sheetName:"Diferencias", nombreArch:"diferencias_inventario", rows:baseCompleta,
      columns:[
        {key:"__nivel",label:"Nivel",type:"text",width:11},
        {key:"codigo",label:"Código",type:"text",width:12},
        {key:"nombre",label:"Nombre del producto",type:"text",width:30},
        {key:"proveedor",label:"Proveedor",type:"text",width:16},
        {key:"saldo",label:"Saldo sistema",type:"num",width:13},
        {key:"cantFinal",label:"Físico",type:"num",width:10},
        {key:"diferencia",label:"Diferencia",type:"num",width:12,colorSign:true},
        {key:"valDif",label:"Valor diferencia",type:"money",width:16,colorSign:true},
      ]},
    captura:{ title:"Reporte de captura — por producto y estado", groupBy:"categoria", sheetName:"Captura", nombreArch:"captura_inventario", rows:capFinal,
      columns:[
        {key:"__nivel",label:"Nivel",type:"text",width:11},
        {key:"codigo",label:"Código",type:"text",width:12},
        {key:"nombre",label:"Nombre del producto",type:"text",width:32},
        {key:"estado",label:"Estado",type:"estado",width:14},
        {key:"c1",label:"C1",type:"num",width:8,subtotal:false},
        {key:"c2",label:"C2",type:"num",width:8,subtotal:false},
        {key:"c3",label:"C3",type:"num",width:8,subtotal:false},
        {key:"cantFinal",label:"Cant. final",type:"num",width:11},
        {key:"saldo",label:"Saldo",type:"num",width:11,subtotal:false},
        {key:"diferencia",label:"Diferencia",type:"num",width:12,colorSign:true},
        {key:"valDif",label:"Valor dif.",type:"money",width:15,colorSign:true},
      ]},
    sinconteo:{ title:"Reporte de productos sin conteo", groupBy:"categoria", sheetName:"Sin conteo", nombreArch:"sin_conteo",
      rows:sinConteo.map(p=>({...p,valSis:(p.saldo||0)*(p.costo||0)})),
      columns:[
        {key:"__nivel",label:"Nivel",type:"text",width:11},
        {key:"codigo",label:"Código",type:"text",width:12},
        {key:"nombre",label:"Nombre del producto",type:"text",width:34},
        {key:"saldo",label:"Saldo sistema",type:"num",width:13},
        {key:"costo",label:"Costo",type:"money",width:13,subtotal:false},
        {key:"valSis",label:"Valor sistema",type:"money",width:16},
      ]},
  };
  const exportar=(key)=>{const r=repCfg[key];exportReporteXLSX({title:r.title,meta:metaRep,columns:r.columns,rows:r.rows,groupBy:r.groupBy,sheetName:r.sheetName,fname:`${r.nombreArch}_${TODAY().replace(/\//g,"-")}.xlsx`,showToast});};

  return(
    <Section>
      <PageHeader
        label="Análisis"
        title="Reportes"
        icon={BarChart2}
        subtitle={G.inventario?.nombre||"Inventario activo"}
        count={G.productos.length}
        countLabel="productos base"
      />

      {vista&&(
        <div>
          <Button variant="outline" size="sm" className="mb-3" onClick={()=>setVista(null)}><ChevronLeft size={15}/> Volver a reportes</Button>
          <ReporteGrid title={repCfg[vista].title} meta={metaRep} columns={repCfg[vista].columns} rows={repCfg[vista].rows} groupBy={repCfg[vista].groupBy} onExport={()=>exportar(vista)}/>
        </div>
      )}

      <div className="grid gap-4" style={{gridTemplateColumns:"repeat(auto-fit,minmax(300px,1fr))",display:vista?"none":undefined}}>

        {/* Hub de reportes — estilo Linear: cards fila (icono suave + título + subtítulo + chevron) */}
        {[
          {id:"difs",      icon:RefreshCw, tone:"danger",  title:"Diferencias de Conteos", desc:"C1 ≠ C2 — detalladas por conteo, con PDF y Excel"},
          {id:"diferencias",icon:Scale,    tone:"brand",   title:"Diferencia Inventario",  desc:"Físico vs Sistema · base completa"},
          {id:"captura",   icon:FileText,  tone:"violet",  title:"Reporte de captura",     desc:"Por producto y estado · C1·C2·C3"},
          {id:"sinconteo", icon:Circle,    tone:"warning", title:"Sin Conteo",             desc:"Productos no inventariados"},
          {id:"ajuste",    icon:Wrench,    tone:"success", title:"Ajuste de Inventario",   desc:"Formato Siigo · Excel plano"},
          {id:"siigo",     icon:Download,  tone:"brand",   title:"Formato Siigo",          desc:"Exportación directa para el ERP"},
        ].map(r=>{
          const Icon=r.icon;
          const tone={
            danger:{background:"#fef2f2",color:"#dc2626"},
            brand:{background:"#eff6ff",color:"#2563eb"},
            violet:{background:"#faf5ff",color:"#7c3aed"},
            warning:{background:"#fffbeb",color:"#d97706"},
            success:{background:"#f0fdf4",color:"#16a34a"},
          }[r.tone];
          const disabled=[
            ["difs",totalDifs===0],
            ["diferencias",baseCompleta.length===0],
            ["captura",capFinal.length===0],
            ["sinconteo",sinConteo.length===0],
            ["ajuste",baseCompleta.length===0],
            ["siigo",baseCompleta.length===0],
          ].find(x=>x[0]===r.id)?.[1];
          const onClick=()=>{
            if(disabled)return;
            if(r.id==="difs")return setVerDifs(v=>!v);
            if(r.id==="ajuste")return expXLSX(baseCompleta.map(c=>[c.codigo,c.cantFinal,c.saldo,c.diferencia,TODAY(),c.ubicacion||"BODEGA"]),["CODIGO","CANTIDAD","SALDO","DIFERENCIA","FECH_CORTE","BODEGA"],"ajuste_inventario.xlsx","AJUSTE INVENTARIO");
            if(r.id==="siigo")return expSiigo();
            return setVista(r.id);
          };
          return(
            <button key={r.id} onClick={onClick} disabled={disabled}
              className="group flex items-center gap-3.5 rounded-xl border border-border-subtle bg-surface-raised px-4 py-4 text-left transition-colors hover:border-border-strong hover:bg-surface-overlay disabled:cursor-not-allowed disabled:opacity-50 dark:bg-surface-raised">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg" style={tone}>
                <Icon size={18}/>
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-slate-900 dark:text-[hsl(220_10%_96%)]">{r.title}</span>
                <span className="mt-0.5 block text-xs text-muted-foreground truncate">{r.desc}</span>
              </span>
              <ChevronLeft size={16} className="rotate-180 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-slate-400"/>
            </button>
          );
        })}
      {/* Diferencias de Conteos — panel expandido por conteo */}
      {verDifs&&(
        <div className="mt-4">
          <div className="mb-3 flex items-center justify-between">
            <Button variant="outline" size="sm" onClick={()=>setVerDifs(false)}><ChevronLeft size={15}/> Ocultar diferencias</Button>
          </div>
          {conteosDifs.length===0?(
            <div className="flex w-full items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-[13px] font-semibold" style={{background:"hsl(139_84%_96%)",color:"#1B9D4A"}}>
              <CheckCircle size={14}/> Ningún conteo presentó diferencias
            </div>
          ):conteosDifs.map(({conteo:c,difs},i)=>(
            <div key={i} className="mb-3 rounded-xl border p-3" style={{borderColor:"#fecaca",background:"#fef2f2"}}>
              <div className="mb-2 flex items-center justify-between gap-2">
                <div>
                  <div className="text-[13px] font-bold" style={{color:"#C52020"}}>{c.nombre}</div>
                  <div className="flex items-center gap-1 text-[11px] text-muted-foreground"><MapPin size={11}/> {c.locLabel} · {difs.length} productos</div>
                </div>
                <div className="flex gap-1.5">
                  <button onClick={()=>expPDF(difs,c.nombre)} className="inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-[11px] font-bold text-white" style={{background:"#DC2626"}}><Printer size={11}/> PDF</button>
                  <button onClick={()=>expXLSX(difs.map(d=>[d.codigo,d.ean||"",d.nombre,d.referencia,d.c1,d.c2,d.dif,d.u1,d.u2]),["CODIGO","EAN","NOMBRE","REFERENCIA","C1","C2","DIFERENCIA","USUARIO_C1","USUARIO_C2"],`difs_${c.nombre?.replace(/ /g,"_")}.xlsx`,`DIFERENCIAS ${c.nombre}`)} className="inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-[11px] font-bold text-white" style={{background:"#1e40af"}}><Download size={10}/> Excel</button>
                </div>
              </div>
              <table className="w-full text-[11px]">
                <thead><tr style={{background:"#fee2e2"}}>{["Código","EAN","Nombre","C1","C2","Dif","U.C1","U.C2"].map(h=><th key={h} className="px-2 py-1 text-left font-bold">{h}</th>)}</tr></thead>
                <tbody>{difs.map((d,j)=>(
                  <tr key={j} className="border-b" style={{borderColor:"#fecaca"}}>
                    <td className="px-2 py-1 font-mono">{d.codigo}</td>
                    <td className="px-2 py-1 text-[10px] text-muted-foreground">{d.ean||"—"}</td>
                    <td className="px-2 py-1 font-medium">{d.nombre.substring(0,25)}</td>
                    <td className="px-2 py-1 text-center font-bold">{d.c1}</td>
                    <td className="px-2 py-1 text-center font-bold">{d.c2}</td>
                    <td className="px-2 py-1 text-center font-bold" style={{color:"#C52020"}}>{d.dif>0?"+"+d.dif:d.dif}</td>
                    <td className="px-2 py-1 text-muted-foreground">{d.u1}</td>
                    <td className="px-2 py-1 text-muted-foreground">{d.u2}</td>
                  </tr>))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}
      </Section>
  );
}
