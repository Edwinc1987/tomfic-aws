import { useState } from "react";
import * as XLSX from "xlsx";
import {
  Database, Upload, Download, ClipboardList, CheckCircle,
  Trash2, Search, AlertTriangle, Lightbulb,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge as UIBadge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { PageHeader } from "@/components/ui/page-header";
import Section from "@/components/Section";
import { setBusy, setClearBase, _snap } from "@/lib/sync";
import { G, SB, prodCols, exportSheet, saveLocalCache, todosConteosCerrados, conteosReales, conteoCompleto, ID } from "@/lib/data";

// Alias de columnas para autodetección + mapeo manual de rescate del importador.
const _normKey=(k)=>String(k).toUpperCase().normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/[^A-Z0-9]/g,"");
const IMPORT_ALIAS={
  ean:["EAN13OCODIGOBARRAS","EAN13","EAN","CODIGOBARRAS","CODIGO DE BARRAS","BARRAS"],
  codigo:["CODIGO","CODIGO INTERNO","CODIGOINTERNO","COD","CODIGO PRODUCTO","SKU","PLU"],
  nombre:["NOMBRE PRODUCTO","NOMBRE DEL PRODUCTO","NOMBRE","DESCRIPCION","PRODUCTO"],
  saldo:["SALDO","EXISTENCIA","EXISTENCIAS","STOCK","SALDO SISTEMA","SALDO ACTUAL","CANTIDAD SISTEMA","INVENTARIO","DISPONIBLE","CANTIDAD","CANT"],
  costo:["COSTO","COSTO UNITARIO","COSTO PROMEDIO","COSTO UND","COSTO UNIDAD","ULTIMO COSTO","COSTO ACTUAL","COSTO REAL","PRECIO COSTO","VALOR UNITARIO","VR UNITARIO"],
};
const IMPORT_FIELDS=[["codigo","Código"],["ean","EAN / cód. barras"],["nombre","Nombre"],["saldo","Saldo sistema"],["costo","Costo"]];
const detectCol=(cols,aliases)=>{const set=aliases.map(_normKey);for(const c of cols){if(set.includes(_normKey(c)))return c;}return null;};

// ── BASE DE DATOS ──
export function VBaseDatos({G,rerender,showToast}){
  const [search,setSearch]=useState("");
  const [catF,setCatF]=useState("");
  const [preview,setPreview]=useState(null);
  const [rawData,setRawData]=useState(null);
  const [importando,setImportando]=useState(false);
  const [importProgress,setImportProgress]=useState({done:0,total:0});
  const [colMap,setColMap]=useState({}); // override manual de columnas {campo:"NombreColumnaExcel"}

  const cargarPreview=(e)=>{
    const file=e.target.files[0];if(!file)return;
    const reader=new FileReader();
    reader.onload=(ev)=>{
      const wb=XLSX.read(ev.target.result,{type:"binary"});
      const ws=wb.Sheets[wb.SheetNames[0]];
      const data=XLSX.utils.sheet_to_json(ws,{defval:""});
      if(!data.length)return showToast("Archivo vacío","err");
      setRawData(data);
      setPreview(data.slice(0,8));
      setColMap({});
    };
    reader.readAsBinaryString(file);
    e.target.value="";
  };

  const confirmarImport=async()=>{
     if(!rawData||importando)return;
     setBusy(true);
     setImportando(true);
     setImportProgress({done:0,total:rawData.length});
    const normKey=(k)=>String(k).toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^A-Z0-9]/g,"");
    const toNum=(v)=>{if(v===undefined||v===null||v==="")return 0;if(typeof v==="number")return isNaN(v)?0:v;let s=String(v).replace(/[^\d.,-]/g,"").trim();if(s==="")return 0;if(s.includes(".")&&s.includes(","))s=s.replace(/\./g,"").replace(",",".");else if(s.includes(","))s=s.replace(",",".");const n=parseFloat(s);return isNaN(n)?0:n;};
    const mapped=rawData.map((rawRow,i)=>{
      const row={};Object.keys(rawRow).forEach(k=>{row[normKey(k)]=rawRow[k];});
      const get=(...keys)=>{for(const k of keys){const nk=normKey(k);if(row[nk]!==undefined&&row[nk]!==null&&String(row[nk]).trim()!=="")return String(row[nk]).trim();}return "";};
      const getNum=(...keys)=>{for(const k of keys){const nk=normKey(k);if(row[nk]!==undefined&&row[nk]!==null&&String(row[nk]).trim()!=="")return toNum(row[nk]);}return 0;};
      // Override manual: si el usuario asignó una columna en el mapeo, esa manda; si no, cae en la autodetección por alias.
      const _ov=(field)=>{const c=colMap[field];return c?normKey(c):null;};
      const getM=(field,...keys)=>{const k=_ov(field);if(k&&row[k]!==undefined&&row[k]!==null&&String(row[k]).trim()!=="")return String(row[k]).trim();return get(...keys);};
      const getNumM=(field,...keys)=>{const k=_ov(field);if(k&&row[k]!==undefined&&row[k]!==null&&String(row[k]).trim()!=="")return toNum(row[k]);return getNum(...keys);};
      return{
         id:ID()+"-"+i,
        ean:getM("ean",...IMPORT_ALIAS.ean),
        codigo:getM("codigo",...IMPORT_ALIAS.codigo),
        nombre:getM("nombre",...IMPORT_ALIAS.nombre),
        referencia:get("NOMBRE REFERENCIA","REFERENCIA","REF","PRESENTACION"),
        categoria:get("NOMBRE CATEGORIA","CATEGORIA","LINEA","GRUPO"),
        subcategoria:get("NOMBRE SUBCATEGORIA","SUBCATEGORIA","SUB CATEGORIA"),
        subgrupo:get("NOMBRE SUBGRUPO","SUBGRUPO","SUB GRUPO"),
        determinada:get("NOMBRE DETERMINADA","DETERMINADA"),
        localizacion:get("NOMBRE LOCALIZACION","LOCALIZACION"),
        ubicacion:get("NOMBRE UBICACION","UBICACION"),
        observacion:get("OBSERVACION","OBS"),
        saldo:getNumM("saldo",...IMPORT_ALIAS.saldo),
        costo:getNumM("costo",...IMPORT_ALIAS.costo),
        nit:get("NIT"),
        proveedor:get("NOMBRE PROVEEDOR","PROVEEDOR"),
      };
    }).filter(r=>r.nombre);
     // Seguridad anti-borrado: NUNCA reemplazar la base con una importación rota.
     // (Si el NOMBRE no se mapeó bien, casi todas las filas se caen del filtro.)
     const rawReales=rawData.filter(r=>Object.values(r).some(v=>String(v??"").trim()!=="")).length;
     if(mapped.length===0){setBusy(false);setImportando(false);return showToast("No se detectó la columna NOMBRE en ninguna fila. Corrige el mapeo de columnas. Tu base actual NO se tocó.","err");}
     if(rawReales>1&&mapped.length<rawReales*0.5&&G.productos.length>0){setBusy(false);setImportando(false);return showToast(`Solo ${mapped.length} de ${rawReales} filas tienen NOMBRE — parece un mapeo mal asignado. Corrige "Nombre" en el mapeo. Tu base NO se reemplazó.`,"err");}
     G.productos=mapped;
    // Subir directamente a la nube y ESPERAR a que termine, antes de permitir refrescos.
    try{
       await SB.deleteAllProductos(G.tenantId,G.inventario?.id);
       // No usar mapped.map(prodCols): Array.map pasa el índice como segundo argumento
       // y prodCols lo interpreta como inventario_id.
       if(mapped.length)await SB.upsertProductosBulk(mapped.map(p=>prodCols(p,G.inventario?.id)),(done,total)=>setImportProgress({done,total}));
       _snap.prods={};mapped.forEach(p=>{_snap.prods[p.id]=JSON.stringify(prodCols(p));}); // marca como ya sincronizado
       setPreview(null);setRawData(null);
     }catch(e){console.warn("Error subiendo productos:",e);showToast("Error subiendo a la nube, revisa tu conexión","err");}
     saveLocalCache();
     setBusy(false);setImportando(false);
    rerender();
    const conCosto=mapped.filter(p=>p.costo>0).length,conSaldo=mapped.filter(p=>p.saldo>0).length;
    if(conCosto===0||conSaldo===0)showToast(`Importados ${mapped.length}, pero ${conCosto===0?"COSTO":""}${conCosto===0&&conSaldo===0?" y ":""}${conSaldo===0?"SALDO":""} salieron en 0 — revisa el nombre de esas columnas`,"warn");
    else showToast(`✓ ${mapped.length} productos importados y guardados en la nube`);
  };

  // "Sube saldos" (post-toma): actualiza saldo + costo de la base ACTUAL emparejando por
  // código, SIN borrar ni regenerar ids (así no toca las capturas). Solo con conteos cerrados.
  const subirSaldos=(e)=>{
    const file=e.target.files[0];e.target.value="";if(!file)return;
    if(!todosConteosCerrados())return showToast("Solo cuando TODOS los conteos estén cerrados","err");
    if(!G.productos.length)return showToast("No hay base de productos que actualizar","err");
    const reader=new FileReader();
    reader.onload=(ev)=>{
      const wb=XLSX.read(ev.target.result,{type:"binary"});
      const ws=wb.Sheets[wb.SheetNames[0]];
      const data=XLSX.utils.sheet_to_json(ws,{defval:""});
      if(!data.length)return showToast("Archivo vacío","err");
      const normKey=(k)=>String(k).toUpperCase().normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/[^A-Z0-9]/g,"");
      const toNum=(v)=>{if(v===undefined||v===null||v==="")return 0;if(typeof v==="number")return isNaN(v)?0:v;let s=String(v).replace(/[^\d.,-]/g,"").trim();if(s==="")return 0;if(s.includes(".")&&s.includes(","))s=s.replace(/\./g,"").replace(",",".");else if(s.includes(","))s=s.replace(",",".");const n=parseFloat(s);return isNaN(n)?0:n;};
      const norm=(s)=>String(s||"").trim().toUpperCase();
      const saldoCols=["SALDO","EXISTENCIA","EXISTENCIAS","STOCK","SALDO SISTEMA","SALDO ACTUAL","CANTIDAD SISTEMA","INVENTARIO","DISPONIBLE","CANTIDAD","CANT"];
      const costoCols=["COSTO","COSTO UNITARIO","COSTO PROMEDIO","COSTO UND","COSTO UNIDAD","ULTIMO COSTO","COSTO ACTUAL","COSTO REAL","PRECIO COSTO","VALOR UNITARIO","VR UNITARIO"];
      const codCols=["CODIGO","CODIGO INTERNO","CODIGOINTERNO","COD","CODIGO PRODUCTO","SKU","PLU"];
      const idx={};G.productos.forEach(p=>{if(p.codigo)idx[norm(p.codigo)]=p;});
      let act=0,ign=0,tocaCosto=false;
      data.forEach(rawRow=>{
        const row={};Object.keys(rawRow).forEach(k=>{row[normKey(k)]=rawRow[k];});
        const has=(...keys)=>keys.some(k=>{const nk=normKey(k);return row[nk]!==undefined&&row[nk]!==null&&String(row[nk]).trim()!=="";});
        const get=(...keys)=>{for(const k of keys){const nk=normKey(k);if(row[nk]!==undefined&&row[nk]!==null&&String(row[nk]).trim()!=="")return String(row[nk]).trim();}return "";};
        const getNum=(...keys)=>{for(const k of keys){const nk=normKey(k);if(row[nk]!==undefined&&row[nk]!==null&&String(row[nk]).trim()!=="")return toNum(row[nk]);}return 0;};
        const cod=get(...codCols);
        const prod=cod?idx[norm(cod)]:null;
        if(!prod){ign++;return;} // no está en la base → se ignora
        if(has(...saldoCols))prod.saldo=getNum(...saldoCols);
        if(has(...costoCols)){prod.costo=getNum(...costoCols);tocaCosto=true;}
        act++;
      });
      if(act===0)return showToast("Ningún código del archivo coincide con la base","err");
      rerender();
      showToast(`✓ Saldos actualizados: ${act} producto(s)${tocaCosto?" (saldo+costo)":" (saldo)"}${ign?` · ${ign} ignorado(s)`:""}`);
    };
    reader.readAsBinaryString(file);
  };

  const [mostrarEstructura,setMostrarEstructura]=useState(false);
  const cats=[...new Set(G.productos.map(p=>p.categoria).filter(Boolean))].sort();
  const filtrados=G.productos.filter(p=>{
    const q=search.toLowerCase();
    return(!q||(p.nombre.toLowerCase().includes(q)||p.ean.includes(q)||p.codigo.toLowerCase().includes(q)))&&(!catF||p.categoria===catF);
  });

  const ESTRUCTURA=[
    {col:"EAN13",desc:"Código de barras del producto",ej:"7701101300176",req:"Recomendado"},
    {col:"CODIGOINTERNO",desc:"Código interno del sistema",ej:"00009",req:"Recomendado"},
    {col:"NOMBRE PRODUCTO",desc:"Nombre del producto",ej:"HAMBURGUESA ZENU",req:"Obligatorio"},
    {col:"NOMBRE REFERENCIA",desc:"Presentación o referencia",ej:"30 und",req:"Opcional"},
    {col:"NOMBRE CATEGORIA",desc:"Categoría del producto",ej:"CARNES FRIAS",req:"Recomendado"},
    {col:"NOMBRE SUBCATEGORIA",desc:"Subcategoría",ej:"HAMBURGUESA",req:"Opcional"},
    {col:"NOMBRE SUBGRUPO",desc:"Subgrupo",ej:"RES",req:"Opcional"},
    {col:"NOMBRE DETERMINADA",desc:"Ubicación física",ej:"CAVA 1",req:"Recomendado"},
    {col:"CANTIDAD",desc:"Cantidad en sistema",ej:"12",req:"Recomendado"},
    {col:"COSTO",desc:"Costo unitario",ej:"18500",req:"Recomendado"},
    {col:"NIT",desc:"NIT del proveedor",ej:"860001697",req:"Opcional"},
    {col:"NOMBRE PROVEEDOR",desc:"Nombre del proveedor",ej:"ZENU",req:"Opcional"},
    {col:"LOCALIZACION",desc:"Tipo de localización",ej:"NEVERA",req:"Opcional"},
    {col:"UBICACION",desc:"Tipo de ubicación",ej:"SALA DE VENTAS",req:"Opcional"},
    {col:"OBSERVACION",desc:"Observación del producto",ej:"IMPORTADO",req:"Opcional"},
  ];

  const descargarPlantilla=()=>{
    const cols=["EAN13","CODIGOINTERNO","NOMBRE PRODUCTO","NOMBRE REFERENCIA","NOMBRE CATEGORIA","NOMBRE SUBCATEGORIA","NOMBRE SUBGRUPO","NOMBRE DETERMINADA","CANTIDAD","COSTO","NIT","NOMBRE PROVEEDOR","LOCALIZACION","UBICACION","OBSERVACION"];
    const ej=["7701101300176","00009","HAMBURGUESA ZENU X 30 UND","30 und","CARNES FRIAS","HAMBURGUESA","RES","CAVA 1",12,18500,"860001697","ZENU","NEVERA","SALA DE VENTAS","IMPORTADO"];
    exportSheet([ej],cols,"plantilla_productos_TOMFIC.xlsx","PRODUCTOS");
    showToast("Plantilla descargada ✓");
  };

  // "Llévate tus datos": respaldo COMPLETO del tenant en un JSON (anti lock-in).
  const exportarTodo=()=>{
    const dump={
      exportadoEn:new Date().toISOString(),
      empresa:G.tenant?.nombre||"",
      nit:G.tenant?.nit||"",
      productos:G.productos||[],
      inventario:G.inventario||null,
      inventarios:G.inventarios||[],
      conteos:G.conteos||[],
      capturas:G.capturas||{},
      historial:G.historial||[],
      notas:G.notas||[],
    };
    const blob=new Blob([JSON.stringify(dump,null,2)],{type:"application/json"});
    const url=URL.createObjectURL(blob);
    const a=document.createElement("a");
    a.href=url;a.download=`tomfic_respaldo_${G.tenant?.slug||"datos"}_${new Date().toISOString().slice(0,10)}.json`;
    document.body.appendChild(a);a.click();document.body.removeChild(a);
    setTimeout(()=>URL.revokeObjectURL(url),1000);
    showToast("Respaldo descargado ✓");
  };

  const conEAN=G.productos.filter(p=>p.ean).length;
  return(
    <Section>
      {/* Header */}
      <PageHeader
        label="Productos"
        title="Base de Datos"
        icon={Database}
        subtitle={cats.length>0?cats.slice(0,3).join(" · ")+(cats.length>3?" …":""):"Sin categorías"}
        count={G.productos.length}
        countLabel="productos"
      />
      {/* Acciones */}
      <div className="flex gap-2.5 mb-4 items-center flex-wrap">
        <Button asChild>
          <label className="cursor-pointer">
            <Upload size={15}/> Cargar / Actualizar Excel
            <input type="file" accept=".xlsx,.xls" onChange={cargarPreview} className="hidden"/>
          </label>
        </Button>
        <Button variant="outline" onClick={()=>setMostrarEstructura(v=>!v)}>
          <ClipboardList size={15}/> {mostrarEstructura?"Ocultar":"Ver"} estructura
        </Button>
        <Button variant="outline" onClick={descargarPlantilla}>
          <Download size={15}/> Plantilla
        </Button>
        <Button variant="outline" onClick={exportarTodo} title="Descarga TODOS tus datos (productos, conteos, capturas, historial) en un archivo JSON. Son tuyos: puedes llevártelos cuando quieras.">
          <Download size={15}/> Respaldar todo
        </Button>
        {G.productos.length>0&&(todosConteosCerrados()?(
          <Button asChild className="bg-emerald-600 hover:bg-emerald-700 text-white">
            <label className="cursor-pointer" title="Sube la misma base con saldos frescos: actualiza saldo y costo por código, sin tocar las capturas">
              <Upload size={15}/> Sube saldos (post-toma)
              <input type="file" accept=".xlsx,.xls" onChange={subirSaldos} className="hidden"/>
            </label>
          </Button>
        ):(
          // Visible siempre (para que no parezca que "desapareció"), pero deshabilitado
          // hasta que TODOS los conteos estén cerrados. El tooltip dice qué falta.
          <Button disabled className="bg-emerald-600 text-white opacity-50 cursor-not-allowed hover:bg-emerald-600"
            title={conteosReales().length===0
              ? "Disponible cuando haya conteos y estén todos cerrados"
              : `Disponible cuando cierres todos los conteos (falta: ${conteosReales().filter(c=>!conteoCompleto(c)).map(c=>c.nombre).join(", ")})`}>
            <Upload size={15}/> Sube saldos (post-toma)
          </Button>
        ))}
        {G.productos.length>0&&(
          <Button variant="outline" className="text-destructive border-red-200 hover:bg-red-50 hover:text-destructive" onClick={()=>{if(!window.confirm("¿BORRAR toda la base de productos? Esta acción no se puede deshacer."))return;setClearBase(true);G.productos=[];rerender();showToast("Base de datos limpiada","warn");}}>
            <Trash2 size={15}/> Limpiar base
          </Button>
        )}
        {G.productos.length===0&&!preview&&(
          <div className="flex items-center gap-2 rounded-lg bg-amber-50 border border-amber-200 px-4 py-2 text-sm font-semibold text-amber-700">
            <AlertTriangle size={15}/> Base vacía — carga el Excel del cliente
          </div>
        )}
      </div>

      {/* Estructura del Excel */}
      {mostrarEstructura&&(
        <Card className="mb-4 border-blue-200">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 text-sm font-bold text-blue-800 mb-3"><ClipboardList size={15}/> Estructura requerida del Excel</div>
            <div className="text-xs text-muted-foreground mb-3">
              La primera fila del archivo debe ser el encabezado con los nombres de columna exactamente como se muestran abajo. Las columnas marcadas como <b className="text-destructive">Obligatorio</b> son necesarias para importar correctamente.
            </div>
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-blue-700 text-white">
                    {["Nombre de columna en Excel","Descripción","Ejemplo","Requerido"].map(h=>(
                      <th key={h} className="px-3 py-2 text-left font-semibold whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {ESTRUCTURA.map((e,i)=>(
                    <tr key={i} className="border-b last:border-0 hover:bg-slate-50">
                      <td className="px-3 py-1.5 font-mono font-bold text-blue-700">{e.col}</td>
                      <td className="px-3 py-1.5 text-slate-700">{e.desc}</td>
                      <td className="px-3 py-1.5 text-muted-foreground italic">{e.ej}</td>
                      <td className="px-3 py-1.5">
                        <UIBadge variant={e.req==="Obligatorio"?"destructive":e.req==="Recomendado"?"warning":"secondary"}>{e.req}</UIBadge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-3 flex items-start gap-2 rounded-lg bg-blue-50 px-3 py-2 text-xs text-blue-800">
              <Lightbulb size={14} className="shrink-0 mt-0.5"/><span><b>Tip:</b> Los nombres de las columnas pueden tener espacios al final — el sistema los elimina automáticamente al importar.</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Vista previa */}
      {preview&&(
        <Card className="mb-4 border-2 border-primary">
          <CardContent className="p-5">
            <div className="flex justify-between items-center mb-3 gap-3 flex-wrap">
              <div className="font-bold text-base text-blue-800">Vista previa — {rawData.length} filas detectadas</div>
              <div className="flex gap-2">
                 <Button variant="outline" disabled={importando} onClick={()=>{setPreview(null);setRawData(null);}}>Cancelar</Button>
                 <Button disabled={importando} onClick={confirmarImport}><CheckCircle size={15}/> {importando?"Importando…":"Confirmar importación"}</Button>
               </div>
             </div>
             {!importando&&(()=>{const cols=Object.keys(preview[0]||{});return(
               <div className="mb-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
                 <div className="text-xs font-bold text-slate-700 mb-2">Mapeo de columnas <span className="font-medium text-slate-500">— se detectan solas; corrige solo si alguna salió mal (⚠)</span></div>
                 <div className="grid gap-2.5" style={{gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))"}}>
                   {IMPORT_FIELDS.map(([f,label])=>{const auto=detectCol(cols,IMPORT_ALIAS[f]);const cur=colMap[f]!==undefined?colMap[f]:(auto||"");const missing=!cur;return(
                     <label key={f} className="block">
                       <span className={"text-[11px] font-semibold "+(missing?"text-amber-700":"text-slate-600")}>{label}{missing?" ⚠":""}</span>
                       <select value={cur} onChange={e=>setColMap(m=>({...m,[f]:e.target.value}))} className="mt-1 w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-700">
                         <option value="">— sin asignar —</option>
                         {cols.map(c=><option key={c} value={c}>{c}</option>)}
                       </select>
                     </label>
                   );})}
                 </div>
               </div>
             );})()}
             {importando&&(
               <div className="mb-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-2.5">
                 <div className="mb-1.5 flex items-center justify-between gap-3 text-xs text-slate-600">
                   <span>Guardando productos en la nube</span>
                   <b className="text-slate-700">{Math.round((importProgress.done/Math.max(importProgress.total,1))*100)}%</b>
                 </div>
                 <div className="h-1.5 overflow-hidden rounded-full bg-slate-200">
                   <div className="h-full rounded-full bg-blue-600 transition-all duration-300" style={{width:`${(importProgress.done/Math.max(importProgress.total,1))*100}%`}}/>
                 </div>
                 <div className="mt-1 text-[11px] text-slate-500">{importProgress.done.toLocaleString("es-CO")} de {importProgress.total.toLocaleString("es-CO")} productos procesados</div>
               </div>
             )}
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-blue-50">
                    {Object.keys(preview[0]||{}).slice(0,10).map(k=><th key={k} className="px-2.5 py-2 text-left font-bold text-blue-800 whitespace-nowrap">{k}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {preview.map((row,i)=>(
                    <tr key={i} className="border-b last:border-0">
                      {Object.keys(row).slice(0,10).map(k=><td key={k} className="px-2.5 py-1.5 text-slate-700">{String(row[k]).substring(0,30)}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-2 text-xs text-muted-foreground">Mostrando las primeras {preview.length} filas de {rawData.length} · Solo se muestran las primeras 10 columnas</div>
          </CardContent>
        </Card>
      )}

      {/* Filtros y tabla */}
      {G.productos.length>0&&(
        <>
          <div className="flex gap-3 mb-3.5 flex-wrap items-center">
            <div className="relative flex-1 min-w-[200px]">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"/>
              <Input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar nombre, código, EAN…" className="pl-9"/>
            </div>
            <Select value={catF||"all"} onValueChange={v=>setCatF(v==="all"?"":v)}>
              <SelectTrigger className="w-[200px]"><SelectValue/></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las categorías</SelectItem>
                {cats.map(c=><SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
            <UIBadge variant="secondary" className="bg-sky-100 text-sky-700 h-9 px-3 text-sm rounded-md">{filtrados.length}</UIBadge>
          </div>
          <Card className="overflow-hidden">
            <div className="overflow-auto max-h-[500px]">
              <table className="w-full text-xs">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-slate-50 text-slate-600 border-b border-slate-200">
                    {["Código","EAN","Nombre","Referencia","Categoría","Proveedor","Saldo","Costo"].map(h=>(
                      <th key={h} className="px-3 py-1.5 text-left font-semibold whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtrados.slice(0,500).map((p)=>(
                    <tr key={p.id} className="border-b last:border-0 hover:bg-slate-50 transition-colors">
                      <td className="px-3 py-1.5 font-mono text-primary font-bold whitespace-nowrap">{p.codigo}</td>
                      <td className="px-3 py-1.5 text-muted-foreground text-[10px]">{p.ean}</td>
                      <td className="px-3 py-1.5 font-medium">{p.nombre}</td>
                      <td className="px-3 py-1.5 text-muted-foreground">{p.referencia}</td>
                      <td className="px-3 py-1.5"><UIBadge variant="secondary">{p.categoria||"—"}</UIBadge></td>
                      <td className="px-3 py-1.5 text-muted-foreground">{p.proveedor||"—"}</td>
                      <td className={`px-3 py-1.5 text-center font-bold ${p.saldo>0?"text-green-600":"text-muted-foreground"}`}>{p.saldo}</td>
                      <td className="px-3 py-1.5 text-right text-muted-foreground">{p.costo>0?"$"+p.costo.toLocaleString("es-CO"):"—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </Section>
  );
}
