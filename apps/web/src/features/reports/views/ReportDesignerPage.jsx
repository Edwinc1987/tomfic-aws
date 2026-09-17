import { useEffect, useRef, useState } from "react";
import { reportsApi } from "../api/reportsApi";

const dataSource=[
  {label:"Número de inventario",field:"inventoryNumber"},
  {label:"Fecha de cierre",field:"closedAt"},
  {label:"Bodega",field:"warehouse"},
  {label:"Responsable",field:"owner"},
  {label:"Resumen",field:"summary",children:[
    {label:"Exactitud",field:"accuracy"},
    {label:"Diferencia monetaria",field:"valueDifference"},
  ]},
  {label:"Detalle",field:"lines",children:[
    {label:"Código",field:"code"},
    {label:"Producto",field:"product"},
    {label:"Diferencia",field:"difference"},
    {label:"Valor diferencia",field:"differenceValue"},
  ]},
];

const initialLayout={
  width:760,
  headerSection:{height:110,items:[]},
  contentSection:{height:120,binding:"lines",items:[]},
  footerSection:{height:45,items:[]},
};

export function ReportDesignerPage({tenantId,onSave}){
  const elementRef=useRef(null);
  const [saved,setSaved]=useState(null);
  const [error,setError]=useState("");
  useEffect(()=>{
    if(!elementRef.current)return undefined;
    let instance;
    let disposed=false;
    Promise.all([import("ankareport"),import("ankareport/dist/ankareport.css")]).then(([module])=>{
      if(disposed)return;
       instance=module.designer({element:elementRef.current,dataSource,layout:initialLayout,onSaveButtonClick:async layout=>{try{await reportsApi.saveTemplate(tenantId,"Acta de inventario",layout);setSaved(layout);onSave?.(layout);setError("");}catch(saveError){setError(saveError.message||"No se pudo guardar la plantilla");}}});
    });
    return()=>{disposed=true;instance?.element?.replaceChildren?.();};
  },[tenantId,onSave]);
  return <section className="space-y-4"><header><p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">Reportes</p><h1 className="text-2xl font-bold text-slate-900">Diseñador de actas de inventario</h1><p className="text-sm text-slate-500">Diseña una plantilla reutilizable para PDF y Excel.</p></header>{error&&<div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}<div ref={elementRef} className="min-h-[680px] overflow-hidden rounded-xl border border-slate-200 bg-white"/>{saved&&<p className="text-xs text-green-700">Plantilla guardada correctamente.</p>}</section>;
}
