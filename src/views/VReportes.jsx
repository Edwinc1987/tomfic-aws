import { useState } from "react";
import * as XLSX from "xlsx";
import {
  BarChart2, MapPin, RefreshCw, CheckCircle, Circle, Scale,
  Wrench, FileText, Download, Printer,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import Section from "@/components/Section";
import { G, TODAY, HOUR, exportSheet, SIIGO_AJUSTE_COLS } from "@/lib/data";

// ── REPORTES ──
export function VReportes({G,showToast,usuario}){
  const [verDifs,setVerDifs]=useState(false);
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
    const last=misC[misC.length-1];
    const conteo=G.conteos.find(c=>c.id===last.conteoId);
    const estados=[...new Set(misC.map(c=>(c.estado||"BUENO")))];
    return estados.map(est=>{
      const ce=misC.filter(c=>(c.estado||"BUENO")===est);
      const sumC1=ce.filter(c=>c.ronda==="C1").reduce((s,c)=>s+c.cantidad,0);
      const sumC2=ce.filter(c=>c.ronda==="C2").reduce((s,c)=>s+c.cantidad,0);
      const sumC3=ce.filter(c=>c.ronda==="C3").reduce((s,c)=>s+c.cantidad,0);
      const final=sumC3||sumC2||sumC1;
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
      estado:contado?(last.estado||""):"SIN CONTAR",
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

      <div className="grid gap-4" style={{gridTemplateColumns:"repeat(auto-fit,minmax(240px,1fr))"}}>

        {/* Diferencias de Conteos — expandible */}
        <Card className="p-4">
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{background:"#fef2f2"}}><RefreshCw size={20} style={{color:"#dc2626"}}/></div>
            <div>
              <div className="font-bold text-sm text-slate-900">Diferencias de Conteos</div>
              <div className="text-[11px] text-muted-foreground">C1 ≠ C2 — por conteo</div>
            </div>
          </div>
          <div className="mb-2.5 text-[32px] font-black leading-none tabular-nums" style={{color:"#dc2626"}}>{totalDifs}</div>
          <Button className="w-full" style={{background:"#dc2626"}} onClick={()=>setVerDifs(v=>!v)}>{verDifs?"Ocultar diferencias":"Ver diferencias"}</Button>
          {verDifs&&(
            <div className="mt-3">
              {conteosDifs.length===0?(
                <div className="flex items-center gap-1.5 rounded-lg bg-green-50 px-3.5 py-1.5 text-[13px] font-semibold text-green-700"><CheckCircle size={14}/> Ningún conteo presentó diferencias</div>
              ):conteosDifs.map(({conteo:c,difs},i)=>(
                <div key={i} className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-1.5 mb-2.5">
                  <div className="flex justify-between items-center mb-2 gap-2">
                    <div>
                      <div className="font-bold text-[13px] text-destructive">{c.nombre}</div>
                      <div className="text-[11px] text-muted-foreground flex items-center gap-1"><MapPin size={11}/> {c.locLabel} · {difs.length} productos</div>
                    </div>
                    <div className="flex gap-1.5">
                      <button onClick={()=>expPDF(difs,c.nombre)}
                        className="inline-flex items-center gap-1 rounded-md bg-red-600 text-white px-2.5 py-1 text-[11px] font-bold hover:bg-red-700"><Printer size={11}/> PDF</button>
                      <button onClick={()=>expXLSX(difs.map(d=>[d.codigo,d.ean||"",d.nombre,d.referencia,d.c1,d.c2,d.dif,d.u1,d.u2]),["CODIGO","EAN","NOMBRE","REFERENCIA","C1","C2","DIFERENCIA","USUARIO_C1","USUARIO_C2"],`difs_${c.nombre?.replace(/ /g,"_")}.xlsx`,`DIFERENCIAS ${c.nombre}`)}
                        className="inline-flex items-center gap-1 rounded-md bg-blue-800 text-white px-2.5 py-1 text-[11px] font-bold hover:bg-blue-900"><Download size={10}/> Excel</button>
                    </div>
                  </div>
                  <table className="w-full text-[11px]">
                    <thead><tr className="bg-red-200">
                      {["Código","EAN","Nombre","C1","C2","Dif","U.C1","U.C2"].map(h=><th key={h} className="px-2 py-1 text-left font-bold">{h}</th>)}
                    </tr></thead>
                    <tbody>
                      {difs.map((d,j)=>(
                        <tr key={j} className="border-b border-red-100">
                          <td className="px-2 py-1 font-mono">{d.codigo}</td>
                          <td className="px-2 py-1 text-[10px] text-muted-foreground">{d.ean||"—"}</td>
                          <td className="px-2 py-1 font-medium">{d.nombre.substring(0,25)}</td>
                          <td className="px-2 py-1 text-center font-bold">{d.c1}</td>
                          <td className="px-2 py-1 text-center font-bold">{d.c2}</td>
                          <td className="px-2 py-1 text-center font-bold text-destructive">{d.dif>0?"+"+d.dif:d.dif}</td>
                          <td className="px-2 py-1 text-muted-foreground">{d.u1}</td>
                          <td className="px-2 py-1 text-muted-foreground">{d.u2}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Sin Conteo */}
        <Card className="p-4">
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{background:"#fffbeb"}}><Circle size={20} style={{color:"#d97706"}}/></div>
            <div><div className="font-bold text-sm text-slate-900">Sin Conteo</div><div className="text-[11px] text-muted-foreground">Productos no inventariados</div></div>
          </div>
          <div className="mb-2.5 text-[32px] font-black leading-none tabular-nums" style={{color:"#d97706"}}>{sinConteo.length}</div>
          <Button className="w-full" onClick={()=>expXLSX(sinConteo.map(p=>[p.codigo,p.nombre,p.referencia,p.categoria,p.subcategoria,p.subgrupo,p.saldo,p.costo,p.nit,p.proveedor]),["CODIGO","NOMBRE","REFERENCIA","CATEGORIA","SUBCATEGORIA","SUBGRUPO","SALDO","COSTO","NIT","PROVEEDOR"],"sin_conteo.xlsx","REPORTE SIN CONTEOS")}><Download size={15}/> Exportar Excel</Button>
        </Card>

        {/* Diferencia Inventario */}
        <Card className="p-4">
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{background:"#eff6ff"}}><Scale size={20} style={{color:"#2563eb"}}/></div>
            <div><div className="font-bold text-sm text-slate-900">Diferencia Inventario</div><div className="text-[11px] text-muted-foreground">Físico vs Sistema · base completa</div></div>
          </div>
          <div className="mb-2.5 text-[32px] font-black leading-none tabular-nums" style={{color:"#2563eb"}}>{baseCompleta.length}</div>
          <Button className="w-full" onClick={()=>expXLSX(baseCompleta.map(c=>[c.codigo,c.nombre,c.referencia,c.costo||0,c.saldo,c.cantFinal,c.diferencia,Math.round(c.valDif),c.categoria||"",c.subcategoria||"",c.subgrupo||"",c.nit||"",c.proveedor||""]),["CODIGO","NOMBRE","REFERENCIA","COSTO","SALDO","CANTIDAD","DIFERENCIA","VALOR_DIF","CATEGORIA","SUBCATEGORIA","SUBGRUPO","NIT","PROVEEDOR"],"diferencia_inventario.xlsx","DIFERENCIA INVENTARIOS")} disabled={baseCompleta.length===0}><Download size={15}/> Exportar Excel</Button>
        </Card>

        {/* Ajuste */}
        <Card className="p-4">
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{background:"#f0fdf4"}}><Wrench size={20} style={{color:"#16a34a"}}/></div>
            <div><div className="font-bold text-sm text-slate-900">Ajuste de Inventario</div><div className="text-[11px] text-muted-foreground">Código · Cantidad · Fecha · base completa</div></div>
          </div>
          <div className="mb-2.5 text-[32px] font-black leading-none tabular-nums" style={{color:"#16a34a"}}>{baseCompleta.length}</div>
          <Button className="w-full" onClick={()=>expXLSX(baseCompleta.map(c=>[c.codigo,c.cantFinal,c.saldo,c.diferencia,TODAY(),c.ubicacion||"BODEGA"]),["CODIGO","CANTIDAD","SALDO","DIFERENCIA","FECH_CORTE","BODEGA"],"ajuste_inventario.xlsx","AJUSTE INVENTARIO")} disabled={baseCompleta.length===0}><Download size={15}/> Exportar Excel</Button>
          <Button className="w-full mt-2" variant="outline" onClick={expSiigo} disabled={baseCompleta.length===0}><Download size={15}/> Formato Siigo</Button>
        </Card>

        {/* Reporte de Captura */}
        <Card className="p-4">
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{background:"#faf5ff"}}><FileText size={20} style={{color:"#7c3aed"}}/></div>
            <div><div className="font-bold text-sm text-slate-900">Reporte de Captura</div><div className="text-[11px] text-muted-foreground">C1·C2·C3 · una fila por estado</div></div>
          </div>
          <div className="mb-2.5 text-[32px] font-black leading-none tabular-nums" style={{color:"#7c3aed"}}>{capFinal.length}</div>
          <Button className="w-full" onClick={()=>expXLSX(
            capFinal.map(c=>[c.ean,c.codigo,c.nombre,c.referencia,c.categoria,c.subcategoria,c.subgrupo,c.ubicacion,c.localizacion,c.nro,c.c1||"",c.c2||"",c.c3||"",c.cantFinal,c.costo,c.fecha||TODAY(),c.estado,c.obs||"",c.usuario,c.nit,c.proveedor]),
            ["EAN","CODIGO","NOMBRE","REFERENCIA","CATEGORIA","SUBCATEGORIA","SUBGRUPO","UBICACION","LOCALIZACION","N_LOCAL","CONTEO_1","CONTEO_2","CONTEO_3","CANTIDAD_FINAL","COSTO","FECHA","ESTADO","OBS","USUARIO","NIT","PROVEEDOR"],
            "captura_inventario.xlsx","CAPTURA INVENTARIO"
          )} disabled={capFinal.length===0}><Download size={15}/> Exportar Excel</Button>
        </Card>

      </div>
    </Section>
  );
}
