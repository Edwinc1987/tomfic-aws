// ─────────────────────────────────────────
// reporteXLSX.js — Exporta reportes a Excel con ESTILO profesional (tipo grid ERP):
// título, encabezado con color, jerarquía por categoría con subtotales, fila de
// Total general, formato de números con separadores, colores por signo y anchos.
// Usa xlsx-js-style (superset de SheetJS con estilos de celda).
// ─────────────────────────────────────────
import * as XLSX from "xlsx-js-style";

const CLR = {
  navy:"0F172A", head:"1E293B", grupo:"F1F5F9", line:"E2E8F0", lineSoft:"EEF1F5",
  white:"FFFFFF", ink:"0F172A", ink2:"475569", azul:"2563EB", rojo:"DC2626", cero:"64748B",
};
const thin  = { style:"thin",   color:{ rgb:CLR.line } };
const soft  = { style:"thin",   color:{ rgb:CLR.lineSoft } };
const heavy = { style:"medium", color:{ rgb:CLR.ink } };
const NUM = new Set(["num","money"]);
const fmtFor = (t)=> t==="money" ? '"$"#,##0' : t==="num" ? '#,##0' : undefined;

// columns: [{key,label,type:'text'|'num'|'money',width,colorSign,subtotal:false,total:false}]
// Incluye una columna {key:"__nivel"} como primera para la jerarquía.
export function exportReporteXLSX({ title, meta, columns, rows, groupBy, nameKey="nombre", sheetName="Reporte", fname, showToast }){
  try{
    const sum = (arr,key)=>arr.reduce((s,r)=>s+(Number(r[key])||0),0);
    const rowToArr = (obj)=> columns.map(c=>{
      if(c.key==="__nivel") return "Producto";
      let v = obj[c.key];
      if(v===undefined||v===null||v==="") v = NUM.has(c.type)?0:"";
      return v;
    });

    const matrix=[], kinds=[];
    matrix.push([title]);       kinds.push("title");
    matrix.push([meta||""]);    kinds.push("meta");
    matrix.push([]);            kinds.push("blank");
    matrix.push(columns.map(c=>c.label)); kinds.push("head");

    if(groupBy){
      const groups={};
      rows.forEach(r=>{ const k=(r[groupBy]||"Sin categoría"); (groups[k]=groups[k]||[]).push(r); });
      let gi=0;
      Object.keys(groups).sort((a,b)=>a.localeCompare(b)).forEach(gname=>{
        gi++; const grows=groups[gname];
        matrix.push(columns.map(c=>{
          if(c.key==="__nivel") return "Categoría";
          if(c.key==="codigo")  return String(gi).padStart(2,"0");
          if(c.key===nameKey)   return gname;
          if(NUM.has(c.type) && c.subtotal!==false) return sum(grows,c.key);
          return "";
        }));
        kinds.push("group");
        grows.forEach(r=>{ matrix.push(rowToArr(r)); kinds.push("detail"); });
      });
    } else {
      rows.forEach(r=>{ matrix.push(rowToArr(r)); kinds.push("detail"); });
    }

    matrix.push(columns.map(c=>{
      if(c.key==="__nivel") return "Total general";
      if(NUM.has(c.type) && c.total!==false) return sum(rows,c.key);
      return "";
    }));
    kinds.push("total");

    const ws = XLSX.utils.aoa_to_sheet(matrix);
    const range = XLSX.utils.decode_range(ws["!ref"]);
    for(let R=range.s.r; R<=range.e.r; R++){
      const kind=kinds[R];
      for(let Cc=range.s.c; Cc<=range.e.c; Cc++){
        const addr=XLSX.utils.encode_cell({r:R,c:Cc});
        let cell=ws[addr]; if(!cell){ cell=ws[addr]={t:"s",v:""}; }
        const col=columns[Cc]; const isNum=col&&NUM.has(col.type);
        const s={ alignment:{vertical:"center",horizontal:isNum?"right":"left"}, font:{sz:10,color:{rgb:CLR.ink}} };
        if(kind==="title"){ s.font={bold:true,sz:14,color:{rgb:CLR.white}}; s.fill={fgColor:{rgb:CLR.navy}}; s.alignment={horizontal:"left",vertical:"center"}; }
        else if(kind==="meta"){ s.font={sz:10,color:{rgb:CLR.ink2}}; }
        else if(kind==="head"){ s.font={bold:true,sz:10,color:{rgb:CLR.white}}; s.fill={fgColor:{rgb:CLR.head}}; s.border={top:thin,bottom:thin,left:thin,right:thin}; }
        else if(kind==="group"){ s.font={bold:true,sz:10,color:{rgb:CLR.ink}}; s.fill={fgColor:{rgb:CLR.grupo}}; s.border={bottom:thin}; if(isNum)cell.z=fmtFor(col.type); }
        else if(kind==="total"){ s.font={bold:true,sz:11,color:{rgb:CLR.ink}}; s.border={top:heavy}; if(isNum)cell.z=fmtFor(col.type); }
        else { // detail
          s.border={bottom:soft};
          if(isNum)cell.z=fmtFor(col.type);
          if(col&&col.key==="codigo") s.font={sz:10,bold:true,color:{rgb:CLR.azul}};
        }
        // color por signo (diferencia/valor) en detalle, grupo y total
        if(col&&col.colorSign&&isNum&&kind!=="head"){
          const val=Number(cell.v)||0;
          s.font={ ...(s.font||{}), bold:true, color:{ rgb: val<0?CLR.rojo:(val>0?CLR.azul:CLR.cero) } };
        }
        cell.s=s;
      }
    }
    ws["!cols"]=columns.map(c=>({ wch: c.width || (NUM.has(c.type)?12:20) }));
    ws["!merges"]=[ {s:{r:0,c:0},e:{r:0,c:columns.length-1}}, {s:{r:1,c:0},e:{r:1,c:columns.length-1}} ];
    ws["!rows"]=[{hpt:24},{hpt:16}]; // alto del título y meta

    const wb=XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    XLSX.writeFile(wb, fname);
    showToast&&showToast("Exportado ✓");
  }catch(e){ console.warn("exportReporteXLSX:",e); showToast&&showToast("No se pudo exportar","err"); }
}
