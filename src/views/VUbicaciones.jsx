import { useState } from "react";
import {
  MapPin, Settings, ChevronUp, ChevronDown, RefreshCw,
  AlertTriangle, Plus, Printer, Pencil, Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge as UIBadge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { PageHeader } from "@/components/ui/page-header";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import Section from "@/components/Section";
import { G, ID, TODAY } from "@/lib/data";

// ── UBICACIONES (3 niveles) ──
export function VUbicaciones({G,rerender,showToast}){
  const [form,setForm]=useState({ubicacion:"",localizacion:"",nro:"",observacion:""});
  const [newUbicTipo,setNewUbicTipo]=useState("");
  const [newLocTipo,setNewLocTipo]=useState("");
  const [editLoc,setEditLoc]=useState(null); // localización en edición
  const [editForm,setEditFormLoc]=useState({nro:"",observacion:""});
  const [verTipos,setVerTipos]=useState(false);     // panel de tipos, oculto por defecto (libera pantalla)
  const [verRecuperar,setVerRecuperar]=useState(false); // panel de recuperar, oculto por defecto

  const siguienteNro=()=>{
    if(!form.ubicacion||!form.localizacion)return "";
    const existentes=G.localizaciones.filter(l=>l.ubicacion===form.ubicacion&&l.localizacion===form.localizacion);
    return `${form.localizacion} ${existentes.length+1}`;
  };

  const agregar=()=>{
    if(!form.ubicacion||!form.localizacion)return showToast("Selecciona ubicación y localización","err");
    const nro=form.nro||siguienteNro();
    const existe=G.localizaciones.find(l=>l.ubicacion===form.ubicacion&&l.localizacion===form.localizacion&&l.nro===nro);
    if(existe)return showToast("Ya existe esa localización","err");
    G.localizaciones.push({id:ID(),ubicacion:form.ubicacion,localizacion:form.localizacion,nro,observacion:form.observacion});
    setForm(p=>({...p,nro:"",observacion:""}));
    rerender();showToast("Localización agregada ✓");
  };

  const eliminar=(id)=>{
    G.localizaciones=G.localizaciones.filter(l=>l.id!==id);
    rerender();showToast("Eliminada ✓","warn");
  };

  const agregarUbicTipo=()=>{
    const n=newUbicTipo.trim().toUpperCase();
    if(!n||G.ubicacionesTipos.includes(n))return;
    G.ubicacionesTipos.push(n);setNewUbicTipo("");rerender();showToast("Tipo de ubicación creado ✓");
  };

  const agregarLocTipo=()=>{
    const n=newLocTipo.trim().toUpperCase();
    if(!n||G.localizacionTipos.includes(n))return;
    G.localizacionTipos.push(n);setNewLocTipo("");rerender();showToast("Tipo de localización creado ✓");
  };

  // Recupera ubicaciones desde los conteos (activos e historial), que guardan ubicacion/localizacion/nro.
  // Útil si la config se perdió: reconstruye lo que se usó en los inventarios.
  const recuperarDesdeConteos=()=>{
    const fuentes=[...G.conteos];
    (G.historial||[]).forEach(h=>{(h.conteos||[]).forEach(c=>fuentes.push(c));});
    const vistos=new Set(G.localizaciones.map(l=>`${l.ubicacion}|${l.localizacion}|${l.nro}`));
    let n=0;
    fuentes.forEach(c=>{
      if(c.tipo==="ajuste")return;
      const ub=(c.ubicacion||"").trim(),lo=(c.localizacion||"").trim(),nr=(c.nro||"").trim();
      if(!ub||!lo)return;
      const key=`${ub}|${lo}|${nr}`;
      if(vistos.has(key))return;
      vistos.add(key);
      G.localizaciones.push({id:ID(),ubicacion:ub,localizacion:lo,nro:nr,observacion:c.observacion||""});
      if(!G.ubicacionesTipos.includes(ub))G.ubicacionesTipos.push(ub);
      if(!G.localizacionTipos.includes(lo))G.localizacionTipos.push(lo);
      n++;
    });
    rerender();showToast(n>0?`Recuperadas ${n} ubicación(es) desde los conteos ✓`:"No se hallaron ubicaciones en los conteos","warn");
  };

  const imprimirEtiqueta=(l)=>{
    const html=`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Etiqueta ${l.nro}</title>
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap');
      *{margin:0;padding:0;box-sizing:border-box;}
      body{font-family:Inter,Arial,sans-serif;background:white;padding:30px;}
      .header{display:flex;align-items:center;gap:16px;border-bottom:3px solid #1e40af;padding-bottom:16px;margin-bottom:24px;}
      .logo{width:56px;height:56px;background:linear-gradient(135deg,#1e40af,#0891b2);border-radius:12px;display:flex;align-items:center;justify-content:center;}
      .logo svg{width:36px;height:36px;}
      .brand h1{font-size:28px;font-weight:900;color:#0f172a;letter-spacing:-1px;}
      .brand p{font-size:13px;color:#64748b;margin-top:2px;}
      .ubicacion-box{background:#eff6ff;border:2px solid #2563eb;border-radius:14px;padding:24px;margin-bottom:24px;text-align:center;}
      .ubi-label{font-size:12px;font-weight:700;color:#2563eb;text-transform:uppercase;letter-spacing:2px;margin-bottom:8px;}
      .ubi-name{font-size:36px;font-weight:900;color:#0f172a;letter-spacing:-1px;}
      .ubi-path{font-size:16px;color:#64748b;margin-top:6px;}
      .obs{background:#f8fafc;border-radius:10px;padding:12px 18px;margin-bottom:24px;font-size:15px;color:#374151;text-align:center;}
      .obs span{font-weight:700;color:#0f172a;}
      table{width:100%;border-collapse:collapse;font-size:14px;}
      th{background:#0f172a;color:white;padding:12px 16px;text-align:center;font-weight:700;font-size:13px;}
      td{padding:16px;border:2px solid #e2e8f0;text-align:center;vertical-align:top;}
      td.label{font-weight:700;color:#374151;background:#f8fafc;text-align:left;width:120px;}
      .footer{margin-top:24px;text-align:center;font-size:11px;color:#64748b;border-top:1px solid #e2e8f0;padding-top:12px;}
    </style></head>
    <body>
      <div class="header">
        <div class="logo">
          <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="20" y="38" width="60" height="42" rx="4" fill="white" fill-opacity="0.3" stroke="white" stroke-width="3"/>
            <path d="M20 46 L50 54 L80 46" stroke="white" stroke-width="3" fill="none"/>
            <path d="M50 54 L50 80" stroke="white" stroke-width="3"/>
            <path d="M24 38 L50 28 L76 38" stroke="white" stroke-width="3" fill="none"/>
            <circle cx="72" cy="28" r="14" fill="#10b981"/>
            <path d="M65 28 L70 33 L79 23" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
        <div class="brand">
          <h1>TOMFIC</h1>
          <p>Tomas Físicas · Control de Inventarios</p>
        </div>
      </div>
      <div class="ubicacion-box">
        <div class="ubi-label">Localización</div>
        <div class="ubi-name">${l.nro}</div>
        <div class="ubi-path">${l.ubicacion} › ${l.localizacion} › ${l.nro}</div>
      </div>
      ${l.observacion?`<div class="obs">📝 Observación: <span>${l.observacion}</span></div>`:""}
      <table>
        <thead>
          <tr>
            <th style="text-align:left;width:120px"></th>
            <th>Conteo 1</th>
            <th>Conteo 2</th>
          </tr>
        </thead>
        <tbody>
          <tr><td class="label">👤 Usuario</td><td></td><td></td></tr>
          <tr><td class="label">✍️ Firma</td><td style="height:50px"></td><td style="height:50px"></td></tr>
          <tr><td class="label">📅 Fecha</td><td></td><td></td></tr>
          <tr><td class="label">🕐 Hora inicio</td><td></td><td></td></tr>
          <tr><td class="label">🕐 Hora fin</td><td></td><td></td></tr>
        </tbody>
      </table>
      <div class="footer">Fecha impresión: ${TODAY()} · TOMFIC Sistema de Inventarios Físicos</div>
      <script>window.onload=()=>window.print();</script>
    </body></html>`;
    const w=window.open("","_blank");w.document.write(html);w.document.close();
  };

  return(
    <Section>
      {/* Header */}
      <PageHeader
        label="Localizaciones"
        title="Ubicaciones"
        icon={MapPin}
        subtitle={G.ubicacionesTipos.join(" · ")||"Sin tipos registrados"}
        count={G.localizaciones.length}
        countLabel="localizaciones"
      />

      {/* Barra de acciones: tipos y recuperar quedan OCULTOS por defecto para liberar pantalla */}
      <div className="mb-3 flex gap-2 flex-wrap">
        <Button variant="outline" size="sm" onClick={()=>setVerTipos(v=>!v)}><Settings size={14}/> Gestionar tipos {verTipos?<ChevronUp size={14}/>:<ChevronDown size={14}/>}</Button>
        {(G.conteos.length>0||(G.historial||[]).length>0)&&(
          <Button variant="outline" size="sm" onClick={()=>setVerRecuperar(v=>!v)}><RefreshCw size={14}/> Recuperar ubicaciones {verRecuperar?<ChevronUp size={14}/>:<ChevronDown size={14}/>}</Button>
        )}
      </div>

      {verRecuperar&&(
        <div className="mb-3 flex items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-2 flex-wrap">
          <div className="flex items-center gap-2 text-[12.5px] text-amber-800"><AlertTriangle size={14} className="shrink-0"/><span><b>¿Se perdieron ubicaciones?</b> Reconstrúyelas desde tus conteos (sin duplicar las que ya tengas).</span></div>
          <Button variant="outline" size="sm" className="h-7 border-amber-300 text-amber-800 hover:bg-amber-100 shrink-0" onClick={recuperarDesdeConteos}><RefreshCw size={13}/> Recuperar</Button>
        </div>
      )}

      {/* Tipos — panel compacto (dropdown) que solo aparece al tocar "Gestionar tipos" */}
      {verTipos&&(
        <Card className="mb-3">
          <CardContent className="grid grid-cols-1 gap-x-6 gap-y-3 p-3.5 md:grid-cols-2">
            <div>
              <div className="mb-2 text-[12px] font-semibold text-slate-600">Tipos de Ubicación</div>
              <div className="mb-2 flex min-h-[22px] flex-wrap gap-1.5">
                {G.ubicacionesTipos.map(u=><UIBadge key={u} variant="secondary" className="bg-blue-100 text-blue-700">{u}</UIBadge>)}
                {G.ubicacionesTipos.length===0&&<span className="text-xs text-muted-foreground">Sin tipos</span>}
              </div>
              <div className="flex gap-2">
                <Input value={newUbicTipo} onChange={e=>setNewUbicTipo(e.target.value.toUpperCase())} placeholder="Nuevo tipo…" onKeyDown={e=>e.key==="Enter"&&agregarUbicTipo()} className="h-8"/>
                <Button size="icon" className="h-8 w-8 shrink-0" onClick={agregarUbicTipo}><Plus size={16}/></Button>
              </div>
            </div>
            <div>
              <div className="mb-2 text-[12px] font-semibold text-slate-600">Tipos de Localización</div>
              <div className="mb-2 flex min-h-[22px] flex-wrap gap-1.5">
                {G.localizacionTipos.map(l=><UIBadge key={l} variant="secondary" className="bg-amber-100 text-amber-700">{l}</UIBadge>)}
                {G.localizacionTipos.length===0&&<span className="text-xs text-muted-foreground">Sin tipos</span>}
              </div>
              <div className="flex gap-2">
                <Input value={newLocTipo} onChange={e=>setNewLocTipo(e.target.value.toUpperCase())} placeholder="Nuevo tipo…" onKeyDown={e=>e.key==="Enter"&&agregarLocTipo()} className="h-8"/>
                <Button size="icon" className="h-8 w-8 shrink-0" onClick={agregarLocTipo}><Plus size={16}/></Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Agregar */}
      <Card className="mb-3">
        <CardContent className="p-4">
          <div className="text-[13px] font-semibold text-slate-700 mb-3">Agregar nueva localización</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_1fr_auto] gap-3 items-end">
            <div className="space-y-1.5">
              <Label>Ubicación</Label>
              <Select value={form.ubicacion} onValueChange={v=>setForm(p=>({...p,ubicacion:v,nro:""}))}>
                <SelectTrigger><SelectValue placeholder="Seleccionar…"/></SelectTrigger>
                <SelectContent>
                  {G.ubicacionesTipos.map(u=><SelectItem key={u} value={u}>{u}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Localización</Label>
              <Select value={form.localizacion} onValueChange={v=>setForm(p=>({...p,localizacion:v,nro:""}))}>
                <SelectTrigger><SelectValue placeholder="Seleccionar…"/></SelectTrigger>
                <SelectContent>
                  {G.localizacionTipos.map(l=><SelectItem key={l} value={l}>{l}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>N° (auto: {siguienteNro()||"—"})</Label>
              <Input value={form.nro} onChange={e=>setForm(p=>({...p,nro:e.target.value.toUpperCase()}))} placeholder={siguienteNro()||"Automático"}/>
            </div>
            <div className="space-y-1.5">
              <Label>Observación</Label>
              <Input value={form.observacion} onChange={e=>setForm(p=>({...p,observacion:e.target.value}))} placeholder="Ej: DETERGENTES"/>
            </div>
            <Button onClick={agregar}><Plus size={16}/> Agregar</Button>
          </div>
        </CardContent>
      </Card>

      {/* Tabla */}
      <Card>
        <CardContent className="p-4">
          <div className="mb-3 text-[13px] font-semibold text-slate-700">
            Localizaciones registradas ({G.localizaciones.length})
          </div>
          {G.localizaciones.length===0?(
            <div className="text-center py-12 text-muted-foreground text-sm border-2 border-dashed rounded-xl">
              <MapPin className="mx-auto mb-2 opacity-30" size={34}/>
              Agrega localizaciones usando el formulario de arriba
            </div>
          ):(
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 border-b border-slate-200">
                    {["Ubicación","Localización","N° Localización","Observación","Acciones"].map(h=><th key={h} className="px-4 py-1.5 text-left font-semibold whitespace-nowrap">{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {G.localizaciones.map((l)=>(
                    <tr key={l.id} className="border-b last:border-0 hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-1.5 font-bold text-primary whitespace-nowrap">{l.ubicacion}</td>
                      <td className="px-4 py-1.5 text-muted-foreground">{l.localizacion}</td>
                      <td className="px-4 py-1.5 font-semibold">{l.nro}</td>
                      <td className="px-4 py-1.5 text-muted-foreground">{l.observacion||"—"}</td>
                      <td className="px-4 py-1.5">
                        <div className="flex gap-2 items-center">
                          <Button variant="outline" size="sm" className="h-7 px-2.5 text-xs bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100 hover:text-blue-700" onClick={()=>imprimirEtiqueta(l)}><Printer size={11}/> Etiqueta</Button>
                          <Button variant="outline" size="sm" className="h-7 px-2.5 text-xs bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100" onClick={()=>{setEditLoc(l);setEditFormLoc({nro:l.nro,observacion:l.observacion||"",ubicacion:l.ubicacion,localizacion:l.localizacion});}}><Pencil size={11}/> Editar</Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive hover:bg-red-50" onClick={()=>eliminar(l.id)} title="Eliminar"><Trash2 size={14}/></Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal editar localización */}
      <Dialog open={!!editLoc} onOpenChange={(v)=>!v&&setEditLoc(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar localización</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <div className="text-[11px] font-bold uppercase text-muted-foreground mb-1">Ubicación</div>
              <div className="px-3 py-2 bg-muted rounded-md text-sm text-slate-700">{editForm.ubicacion}</div>
            </div>
            <div>
              <div className="text-[11px] font-bold uppercase text-muted-foreground mb-1">Localización</div>
              <div className="px-3 py-2 bg-muted rounded-md text-sm text-slate-700">{editForm.localizacion}</div>
            </div>
            <div className="space-y-1.5">
              <Label>N° Localización</Label>
              <Input value={editForm.nro} onChange={e=>setEditFormLoc(f=>({...f,nro:e.target.value.toUpperCase()}))}/>
            </div>
            <div className="space-y-1.5">
              <Label>Observación</Label>
              <Input value={editForm.observacion} onChange={e=>setEditFormLoc(f=>({...f,observacion:e.target.value}))} placeholder="Ej: Tienda Gourmet"/>
            </div>
          </div>
          <div className="flex gap-2 mt-2">
            <Button className="flex-1" onClick={()=>{
              if(!editForm.nro.trim())return showToast("El N° no puede estar vacío","err");
              G.localizaciones=G.localizaciones.map(l=>l.id===editLoc.id?{...l,nro:editForm.nro.trim(),observacion:editForm.observacion.trim()}:l);
              rerender();showToast("Localización actualizada");setEditLoc(null);
            }}>Guardar</Button>
            <Button variant="outline" className="flex-1" onClick={()=>setEditLoc(null)}>Cancelar</Button>
          </div>
        </DialogContent>
      </Dialog>
    </Section>
  );
}
