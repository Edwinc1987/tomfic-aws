import { useEffect, useRef, useState } from "react";
import { reportsApi } from "../api/reportsApi";

export function ReportViewerPage({tenantId,inventoryId}){
  const elementRef=useRef(null);const rendererRef=useRef(null);const [report,setReport]=useState(null);const [error,setError]=useState("");
  useEffect(()=>{reportsApi.inventory(tenantId,inventoryId).then(setReport).catch(e=>setError(e.message||"No se pudo cargar el reporte"));},[tenantId,inventoryId]);
  useEffect(()=>{
    if(!report||!elementRef.current)return undefined;
    let disposed=false;
    Promise.all([import("ankareport"),import("ankareport/dist/ankareport.css")]).then(([module])=>{
      if(disposed)return;
      rendererRef.current=module.render({element:elementRef.current,layout:{width:760,headerSection:{height:100,items:[]},contentSection:{height:120,binding:"lines",items:[]},footerSection:{height:40,items:[]}},data:{inventoryNumber:report.inventoryId,accuracy:`${report.metrics.accuracyPercentage.toFixed(2)}%`,valueDifference:report.metrics.monetaryDifference,lines:report.lines.slice(0,500).map(line=>({code:line.code,product:line.name,difference:line.difference,differenceValue:line.differenceValue}))}});
    });
    return()=>{disposed=true;elementRef.current?.replaceChildren();rendererRef.current=null;};
  },[report]);
  const exportFile=async(type)=>{if(!rendererRef.current)return;await rendererRef.current[type==="pdf"?"exportToPdf":"exportToXlsx"](`resultado_inventario_${report?.inventoryId||"reporte"}.${type}`);};
  return <section className="space-y-4"><header><p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">Reportes</p><h1 className="text-2xl font-bold text-slate-900">Visor de resultado</h1></header>{error&&<div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}<div className="flex gap-2"><button onClick={()=>exportFile("pdf")} className="rounded bg-indigo-600 px-3 py-2 text-sm font-semibold text-white">Exportar PDF</button><button onClick={()=>exportFile("xlsx")} className="rounded border px-3 py-2 text-sm font-semibold">Exportar Excel</button></div><div ref={elementRef} className="min-h-[500px] overflow-auto rounded-xl border bg-white"/></section>;
}
