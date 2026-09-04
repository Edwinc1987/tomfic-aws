import { useState } from "react";
import * as XLSX from "xlsx";
import {
  Users, UserPlus, Upload, Download, Search, Mail, Smartphone, Send,
  Key, ClipboardList, Lightbulb, AlertTriangle, CheckCircle, Trash2, FolderOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge as UIBadge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { PageHeader } from "@/components/ui/page-header";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import Section from "@/components/Section";
import { G, SB } from "@/lib/data";

// ── USUARIOS ──
export function VUsuarios({usuario,G,rerender,showToast}){
  const [modal,setModal]=useState(false);
  const [modalImport,setModalImport]=useState(false);
  const [modalConfirmDel,setModalConfirmDel]=useState(null);
  const [form,setForm]=useState({nombre:"",pass:"",rol:"capturador",correo:"",telefono:"",editId:null});
  const [previewUsuarios,setPreviewUsuarios]=useState(null);
  const [credCreada,setCredCreada]=useState(null); // credencial recién creada/reseteada para compartir
  const [envioOpen,setEnvioOpen]=useState(false); // modal de envío masivo de accesos
  const [busy,setBusy]=useState(false);
  const [busqUser,setBusqUser]=useState(""); // filtro de la tabla de usuarios
  const [usuarioExistente,setUsuarioExistente]=useState("");
  // El admin es transversal; los demás usuarios pertenecen al inventario activo.
  const usuariosInventario=G.usuarios.filter(u=>u.rol==="admin"||u.inventario_id===G.inventario?.id);
  const usuariosFiltrados=usuariosInventario.filter(u=>{
    const q=busqUser.trim().toLowerCase();
    if(!q)return true;
    return (u.nombre||"").toLowerCase().includes(q)||(u.correo||"").toLowerCase().includes(q)||(u.telefono||"").includes(q)||(u.rol||"").toLowerCase().includes(q);
  });

  // Generar contraseña automática: primeras 3 letras del nombre + últimos 4 del teléfono
  const generarPass=(nombre,telefono)=>{
    const n=(nombre||"").toUpperCase().replace(/[^A-Z]/g,"").substring(0,3).padEnd(3,"X");
    const t=(telefono||"").replace(/\D/g,"");
    const nums=t.length>=4?t.slice(-4):"1234";
    return n+nums;
  };

  // Recargar la lista de usuarios de esta empresa desde la nube.
  const refresh=async()=>{try{const {data}=await SB.loadUsuarios(G.tenantId);if(data)G.usuarios=data;}catch(e){}};

  // Mensaje de acceso para compartir por WhatsApp (sin URL hardcoded; incluye el slug de la empresa).
  const buildShareMsg=(u)=>{
    const origin=(typeof window!=="undefined"&&window.location.origin)||"";
    const slug=((u.email||"").split("@")[1]||"").replace(".tomfic.app","");
    return `Hola ${u.nombre}! Tus datos para TOMFIC:\n🔗 ${origin}\n🏢 Empresa: ${slug}\n👤 Usuario: ${u.nombre}\n🔑 Clave: ${u.pass}\n\nIngresa en la pestaña «Equipo».`;
  };

  const guardar=async()=>{
    if(!form.nombre.trim()||(!form.editId&&!form.pass.trim()))return showToast("Completa nombre y contraseña","err");
    if(!form.editId){
      const duplicado=G.usuarios.find(u=>(u.nombre||"").toUpperCase()===form.nombre.trim().toUpperCase());
      if(duplicado){
        setModal(false);
        setUsuarioExistente(duplicado.id);
        return showToast(`Ya existe ${duplicado.nombre}. Quedó seleccionado en "Usuarios existentes"; pulsa "Asignar aquí".`,"warn");
      }
    }
    setBusy(true);
    try{
      if(form.editId){
        const {error}=await SB.updateUsuario(form.editId,{rol:form.rol,correo:form.correo||null,telefono:form.telefono||null});
        if(error)throw error;
        await refresh();showToast("Actualizado ✓");
      }else{
        const nombreCreado=form.nombre.toUpperCase().trim();
        const {data,error}=await SB.createMember(nombreCreado,form.pass,form.rol,form.correo,form.telefono);
        if(error)throw error;
        // El RPC puede devolver solo la credencial. Recargamos el perfil para
        // obtener su id real antes de vincularlo al inventario seleccionado.
        await refresh();
        const creado=G.usuarios.find(u=>(u.nombre||"").toUpperCase()===nombreCreado)||data;
        if(!creado?.id)throw new Error("El usuario fue creado, pero no se pudo vincular al inventario.");
        if(G.inventario&&form.rol!=="admin"){
          const {error:eInv}=await SB.updateUsuario(creado.id,{inventario_id:G.inventario.id});
          if(eInv)throw eInv;
          await refresh();
        }
        setCredCreada({nombre:creado.nombre||nombreCreado,pass:data?.pass||form.pass,email:data?.email||creado.email});
        showToast("Usuario creado ✓");
      }
      setModal(false);setForm({nombre:"",pass:"",rol:"capturador",correo:"",telefono:"",editId:null});
      rerender();
    }catch(e){console.warn(e);showToast(e.message||"No se pudo guardar","err");}
    setBusy(false);
  };

  const copiarAcceso=(u)=>{
    navigator.clipboard?.writeText(buildShareMsg(u)).then(()=>showToast("Copiado al portapapeles ✓")).catch(()=>showToast("No se pudo copiar","err"));
  };

  // Envío de accesos por WhatsApp / correo (individual y masivo).
  // Normaliza el teléfono a formato internacional (Colombia +57 si son 10 dígitos).
  const waPhone=(tel)=>{let d=String(tel||"").replace(/\D/g,"");if(!d)return"";if(d.length===10)d="57"+d;return d;};
  const waHref=(u)=>`https://wa.me/${waPhone(u.telefono)}?text=${encodeURIComponent(buildShareMsg(u))}`;
  const mailHref=(u)=>`mailto:${u.correo}?subject=${encodeURIComponent("Tu acceso a TOMFIC")}&body=${encodeURIComponent(buildShareMsg(u))}`;
  const copiarTodos=(list)=>{const txt=list.map(u=>buildShareMsg(u)).join("\n\n———\n\n");navigator.clipboard?.writeText(txt).then(()=>showToast(`Copiados ${list.length} accesos ✓`)).catch(()=>showToast("No se pudo copiar","err"));};

  const resetClave=async(u)=>{
    const nueva=generarPass(u.nombre,u.telefono);
    try{const {error}=await SB.resetMemberPassword(u.id,nueva);if(error)throw error;await refresh();rerender();setCredCreada({nombre:u.nombre,pass:nueva,email:u.email});showToast("Clave restablecida ✓");}
    catch(e){showToast(e.message||"No se pudo restablecer","err");}
  };

  const toggleActivo=async(u)=>{
    try{const {error}=await SB.updateUsuario(u.id,{activo:!u.activo});if(error)throw error;await refresh();rerender();}
    catch(e){showToast(e.message||"No se pudo actualizar","err");}
  };

  // Reutiliza la cuenta de la empresa y la vincula al inventario seleccionado.
  const asignarExistente=async()=>{
    const u=G.usuarios.find(x=>x.id===usuarioExistente);
    if(!u||!G.inventario)return showToast("Selecciona un usuario y un inventario","err");
    if(u.inventario_id&&u.inventario_id!==G.inventario.id&&!window.confirm(`${u.nombre} está asignado a otro inventario. ¿Moverlo a ${G.inventario.nombre}?`))return;
    setBusy(true);
    try{
      const {error}=await SB.updateUsuario(u.id,{inventario_id:G.inventario.id});
      if(error)throw error;
      await refresh();setUsuarioExistente("");rerender();showToast(`${u.nombre} asignado a ${G.inventario.nombre} ✓`);
    }catch(e){showToast(e.message||"No se pudo asignar el usuario","err");}
    setBusy(false);
  };

  const eliminar=async(u)=>{
    const tieneConteos=G.conteos.some(c=>
      (c.usuarioC1===u.nombre||c.usuarioC2===u.nombre||c.usuarioC3===u.nombre)&&
      !["completado"].includes(c.estado)
    );
    if(tieneConteos)return showToast("Este usuario tiene conteos activos. Reasígnalos antes de eliminar.","err");
    try{const {error}=await SB.deleteMember(u.id);if(error)throw error;await refresh();}
    catch(e){return showToast(e.message||"No se pudo eliminar","err");}
    setModalConfirmDel(null);rerender();showToast("Usuario eliminado ✓","warn");
  };

  // Importar usuarios desde Excel
  const importarExcel=(e)=>{
    const file=e.target.files[0];if(!file)return;
    const reader=new FileReader();
    reader.onload=(ev)=>{
      const wb=XLSX.read(ev.target.result,{type:"binary"});
      const ws=wb.Sheets[wb.SheetNames[0]];
      const data=XLSX.utils.sheet_to_json(ws,{defval:""});
      if(!data.length)return showToast("Archivo vacío","err");
      // Normalizar columnas
      const normalize=(row)=>{const n={};Object.keys(row).forEach(k=>{n[k.trim().toUpperCase()]=row[k];});return n;};
      const usuarios=data.map((rawRow,i)=>{
        const row=normalize(rawRow);
        const nombre=String(row.NOMBRE||row.USUARIO||row.NAME||"").trim().toUpperCase();
        const correo=String(row.CORREO||row.EMAIL||row.MAIL||"").trim();
        const telefono=String(row.TELEFONO||row.CELULAR||row.WHATSAPP||row.TEL||"").trim();
        const rol=(String(row.ROL||row.ROLE||"capturador").trim().toLowerCase().includes("admin"))?"admin":"capturador";
        if(!nombre)return null;
        const pass=generarPass(nombre,telefono);
        return{nombre,correo,telefono,rol,pass};
      }).filter(Boolean);
      if(!usuarios.length)return showToast("No se encontraron usuarios válidos","err");
      setPreviewUsuarios(usuarios);
    };
    reader.readAsBinaryString(file);
    e.target.value="";
  };

  const confirmarImportUsuarios=async()=>{
    setBusy(true);
    let creados=0,fallidos=0;
    for(const u of previewUsuarios){
      try{const {error}=await SB.createMember(u.nombre,u.pass,u.rol,u.correo,u.telefono);if(error)throw error;creados++;}
      catch(e){fallidos++;}
    }
    await refresh();
    setBusy(false);
    setPreviewUsuarios(null);setModalImport(false);rerender();
    showToast(`✓ ${creados} usuarios creados${fallidos>0?` · ${fallidos} omitidos`:""}`);
  };

  // Descargar plantilla Excel
  const descargarPlantilla=()=>{
    const ws=XLSX.utils.aoa_to_sheet([
      ["NOMBRE","CORREO","TELEFONO","ROL"],
      ["JUAN PEREZ","juan@ejemplo.com","3001234567","capturador"],
      ["MARIA LOPEZ","maria@ejemplo.com","3109876543","capturador"],
      ["PEDRO ADMIN","pedro@empresa.com","3201111111","admin"],
    ]);
    const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,"Usuarios");
    XLSX.writeFile(wb,"plantilla_usuarios_tomfic.xlsx");
    showToast("Plantilla descargada ✓");
  };

  const admins=usuariosInventario.filter(u=>u.rol==="admin");
  const caps=usuariosInventario.filter(u=>u.rol==="capturador");
  const activos=usuariosInventario.filter(u=>u.activo);
  const disponibles=G.usuarios.filter(u=>u.rol!=="admin"&&u.id!==usuario.id&&u.inventario_id!==G.inventario?.id);
  return(
    <Section>
      {/* Header */}
      <PageHeader
        label="Accesos"
        title="Gestión de Usuarios"
        icon={Users}
        subtitle={`${activos.length} activos · ${admins.length} admin · ${caps.length} capturadores`}
        count={usuariosInventario.length}
        countLabel="usuarios"
      />
       <div className="view-sticky-controls flex gap-2.5 mb-3 flex-wrap items-center">
        <Button onClick={()=>{setForm({nombre:"",pass:"",rol:"capturador",correo:"",telefono:"",editId:null});setModal(true);}}><UserPlus size={16}/> Crear Usuario</Button>
        <Button variant="outline" onClick={()=>setModalImport(true)}><Upload size={15}/> Importar desde Excel</Button>
        <Button variant="outline" onClick={()=>setEnvioOpen(true)}><Send size={15}/> Enviar accesos</Button>
        <div className="relative ml-auto w-full sm:w-64">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
          <Input value={busqUser} onChange={e=>setBusqUser(e.target.value)} placeholder="Buscar usuario, correo, rol…" className="pl-9"/>
        </div>
      </div>
      {G.inventario&&disponibles.length>0&&<Card className="mb-3 border-blue-200 bg-blue-50/50">
        <div className="flex flex-wrap items-center gap-2.5 px-3.5 py-3">
          <div className="mr-auto"><div className="text-[12px] font-bold text-blue-900">Usuarios existentes</div><div className="text-[11px] text-blue-700">Asigna una cuenta ya creada a <b>{G.inventario.nombre}</b>, sin duplicarla.</div></div>
          <Select value={usuarioExistente} onValueChange={setUsuarioExistente}>
            <SelectTrigger className="w-52 bg-white"><SelectValue placeholder="Seleccionar usuario…"/></SelectTrigger>
            <SelectContent>{disponibles.map(u=><SelectItem key={u.id} value={u.id}>{u.nombre}{u.inventario_id?" · otro inventario":" · sin asignar"}</SelectItem>)}</SelectContent>
          </Select>
          <Button size="sm" onClick={asignarExistente} disabled={!usuarioExistente||busy}>Asignar aquí</Button>
        </div>
      </Card>}

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="bg-slate-50 text-slate-600 border-b border-slate-200">
              {["Usuario","Contraseña","Contacto","Rol","Creado","Estado","Acciones"].map(h=>(
                <th key={h} className="px-3.5 py-1.5 text-left font-semibold whitespace-nowrap">{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {usuariosFiltrados.length===0&&(
                <tr><td colSpan={7} className="px-3.5 py-8 text-center text-sm text-slate-400">Sin usuarios que coincidan con "{busqUser}".</td></tr>
              )}
              {usuariosFiltrados.map((u)=>(
                <tr key={u.id} className="border-b last:border-0 hover:bg-slate-50 transition-colors">
                  <td className="px-3.5 py-1.5">
                    <div className="flex items-center gap-2">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-extrabold shrink-0 ${u.rol==="admin"?"bg-blue-700":u.rol==="gerente"?"bg-purple-600":"bg-green-600"}`}>{u.nombre[0]}</div>
                      <b>{u.nombre}</b>
                    </div>
                  </td>
                  <td className="px-3.5 py-1.5 font-mono text-xs text-muted-foreground">{u.pass||"—"}</td>
                  <td className="px-3.5 py-1.5 text-xs text-muted-foreground">
                    {u.correo&&<div className="flex items-center gap-1"><Mail size={11}/> {u.correo}</div>}
                    {u.telefono&&<div className="flex items-center gap-1"><Smartphone size={11}/> {u.telefono}</div>}
                    {!u.correo&&!u.telefono&&<span className="text-slate-300">—</span>}
                  </td>
                  <td className="px-3.5 py-1.5"><UIBadge variant="secondary" className={u.rol==="admin"?"bg-blue-100 text-blue-700":u.rol==="gerente"?"bg-purple-100 text-purple-700":"bg-green-100 text-green-700"}>{u.rol==="admin"?"ADMIN":u.rol==="gerente"?"GERENTE":"CAPTURADOR"}</UIBadge></td>
                  <td className="px-3.5 py-1.5 text-muted-foreground whitespace-nowrap">{u.creado}</td>
                  <td className="px-3.5 py-1.5"><UIBadge variant={u.activo?"success":"destructive"}>{u.activo?"ACTIVO":"INACTIVO"}</UIBadge></td>
                  <td className="px-3.5 py-1.5">
                    <div className="flex gap-1.5 flex-wrap">
                      <Button variant="outline" size="sm" className="h-7 px-2.5 text-xs" onClick={()=>{setForm({nombre:u.nombre,pass:"",rol:u.rol,correo:u.correo||"",telefono:u.telefono||"",editId:u.id});setModal(true);}}>Editar</Button>
                      <Button size="sm" className="h-7 px-2.5 text-xs bg-[#25d366] hover:bg-[#1da851]" onClick={()=>copiarAcceso(u)}><ClipboardList size={11}/> Copiar</Button>
                      <Button variant="outline" size="sm" className="h-7 px-2.5 text-xs" onClick={()=>resetClave(u)}><Key size={11}/> Clave</Button>
                      {u.id!==usuario.id&&<Button variant="outline" size="sm" className={`h-7 px-2.5 text-xs ${u.activo?"text-amber-600 border-amber-200 hover:bg-amber-50 hover:text-amber-700":"text-green-600 border-green-200 hover:bg-green-50 hover:text-green-700"}`} onClick={()=>toggleActivo(u)}>{u.activo?"Desactivar":"Activar"}</Button>}
                      {u.id!==usuario.id&&<Button variant="outline" size="sm" className="h-7 px-2.5 text-xs text-destructive border-red-200 hover:bg-red-50 hover:text-destructive" onClick={()=>setModalConfirmDel(u)}>Eliminar</Button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Modal crear/editar */}
      <Dialog open={modal} onOpenChange={setModal}>
        <DialogContent className="max-w-lg max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{form.editId?"Editar Usuario":"Crear Usuario"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3.5">
            <div className="space-y-1.5">
              <Label>Nombre de usuario</Label>
              <Input value={form.nombre} onChange={e=>{
                const n=e.target.value.toUpperCase();
                const autoPass=generarPass(n,form.telefono);
                setForm(p=>({...p,nombre:n,...(!p.editId?{pass:autoPass}:{})}));
              }} disabled={!!form.editId} placeholder="Ej: JUAN"/>
            </div>
            {!form.editId?(
              <div className="space-y-1.5">
                <Label>Contraseña (auto-generada, puedes cambiarla)</Label>
                <Input value={form.pass} onChange={e=>setForm(p=>({...p,pass:e.target.value}))} placeholder="••••••"/>
              </div>
            ):(
              <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
                <Key size={14} className="shrink-0"/><span>Para cambiar la clave usa <b>Clave</b> en la fila del usuario.</span>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Correo electrónico</Label>
                <Input value={form.correo} onChange={e=>setForm(p=>({...p,correo:e.target.value}))} placeholder="correo@ejemplo.com"/>
              </div>
              <div className="space-y-1.5">
                <Label>Teléfono / WhatsApp</Label>
                <Input value={form.telefono} onChange={e=>{
                  const t=e.target.value;
                  const autoPass=generarPass(form.nombre,t);
                  setForm(p=>({...p,telefono:t,...(!p.editId?{pass:autoPass}:{})}));
                }} placeholder="3001234567"/>
              </div>
            </div>
            {!form.editId&&(
              <div className="flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-2 text-xs text-blue-700">
                <Key size={14} className="shrink-0"/><span>Contraseña auto-generada: <b>{generarPass(form.nombre,form.telefono)}</b> · Puedes cambiarla manualmente arriba.</span>
              </div>
            )}
            <div className="space-y-1.5">
              <Label>Rol</Label>
              <div className="grid grid-cols-2 gap-2.5">
                 {[["capturador","Capturador","Solo captura"],["admin","Administrador","Acceso total"],["gerente","Gerente","Solo lectura"],["comercial","Comercial","Gestiona clientes y renovaciones"]].map(([v,t,s])=>(
                  <div key={v} onClick={()=>setForm(p=>({...p,rol:v}))} className={`rounded-lg border-2 p-3 cursor-pointer transition-colors ${form.rol===v?"border-primary bg-blue-50":"border-slate-200 hover:border-slate-300"}`}>
                    <div className={`font-bold text-sm ${form.rol===v?"text-primary":"text-slate-900"}`}>{t}</div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">{s}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex items-start gap-2 rounded-lg bg-green-50 px-3 py-1.5 text-xs text-green-800">
              <ClipboardList size={14} className="shrink-0 mt-0.5"/><span>Después de crear el usuario usa el botón <b>Copiar</b> para enviarle los datos por WhatsApp.</span>
            </div>
            <Button className="w-full" onClick={guardar} disabled={busy}>{busy?"Guardando…":form.editId?"Actualizar":"Crear Usuario"}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal importar */}
      <Dialog open={modalImport} onOpenChange={(v)=>{setModalImport(v);if(!v)setPreviewUsuarios(null);}}>
        <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Importar Usuarios desde Excel</DialogTitle>
          </DialogHeader>
          {!previewUsuarios?(
            <div className="space-y-4">
              <div className="rounded-lg bg-blue-50 p-3.5 text-sm text-blue-800">
                <b>Columnas requeridas en el Excel:</b><br/>
                <span className="font-mono">NOMBRE · CORREO · TELEFONO · ROL</span><br/>
                <span className="text-xs text-muted-foreground mt-1 block">
                  La contraseña se genera automáticamente: primeras 3 letras del nombre + últimos 4 dígitos del teléfono.<br/>
                  Ejemplo: JUAN con tel. 3001234567 → contraseña: <b className="font-mono">JUA4567</b>
                </span>
              </div>
              <div className="flex gap-2.5">
                <Button asChild className="flex-1">
                  <label className="cursor-pointer">
                    <FolderOpen size={15}/> Seleccionar archivo Excel
                    <input type="file" accept=".xlsx,.xls" onChange={importarExcel} className="hidden"/>
                  </label>
                </Button>
                <Button variant="outline" onClick={descargarPlantilla}><Download size={15}/> Plantilla</Button>
              </div>
              <div className="flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
                <Lightbulb size={14} className="shrink-0"/> Descarga la plantilla de ejemplo para ver el formato correcto.
              </div>
            </div>
          ):(
            <div>
              <div className="font-bold text-sm text-slate-900 mb-3">
                Vista previa — {previewUsuarios.length} usuarios detectados
              </div>
              <div className="max-h-[320px] overflow-y-auto mb-4 rounded-lg border">
                <table className="w-full text-xs">
                  <thead><tr className="bg-slate-50 text-slate-600 border-b border-slate-200 sticky top-0">
                    {["Nombre","Contraseña","Correo","Teléfono","Rol"].map(h=>(
                      <th key={h} className="px-2.5 py-2 text-left font-semibold">{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {previewUsuarios.map((u,i)=>{
                      const duplicado=G.usuarios.find(x=>x.nombre===u.nombre);
                      return(
                        <tr key={i} className={`border-b last:border-0 ${duplicado?"bg-amber-50":""}`}>
                          <td className="px-2.5 py-1.5 font-bold">{u.nombre}{duplicado&&<span className="text-[10px] text-amber-600 ml-1.5 inline-flex items-center gap-0.5"><AlertTriangle size={10}/> Duplicado</span>}</td>
                          <td className="px-2.5 py-1.5 font-mono text-primary">{u.pass}</td>
                          <td className="px-2.5 py-1.5 text-muted-foreground">{u.correo||"—"}</td>
                          <td className="px-2.5 py-1.5 text-muted-foreground">{u.telefono||"—"}</td>
                          <td className="px-2.5 py-1.5"><UIBadge variant="secondary" className={u.rol==="admin"?"bg-blue-100 text-blue-700":"bg-green-100 text-green-700"}>{u.rol==="admin"?"ADMIN":"CAPTURADOR"}</UIBadge></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="flex gap-2.5">
                <Button className="flex-1" onClick={confirmarImportUsuarios} disabled={busy}>{busy?"Creando…":<><CheckCircle size={15}/> Confirmar importación</>}</Button>
                <Button variant="outline" className="flex-1" onClick={()=>setPreviewUsuarios(null)} disabled={busy}>← Volver</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal confirmar eliminación */}
      <ConfirmDialog
        open={!!modalConfirmDel}
        onOpenChange={(v)=>!v&&setModalConfirmDel(null)}
        icon={Trash2}
        title="Eliminar Usuario"
        description={<>¿Estás seguro de que deseas eliminar al usuario <b>{modalConfirmDel?.nombre}</b>? Esta acción no se puede deshacer.</>}
        confirmText="Sí, eliminar"
        onConfirm={()=>eliminar(modalConfirmDel)}
      />

      {/* Modal credencial creada / reseteada — mostrar y compartir */}
      <Dialog open={envioOpen} onOpenChange={setEnvioOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Enviar accesos al equipo</DialogTitle></DialogHeader>
          {(()=>{const equipo=(G.usuarios||[]).filter(u=>u.activo!==false&&u.rol!=="admin");return(
            <div>
              <div className="flex items-center justify-between gap-2 mb-2.5">
                <div className="text-xs text-slate-500">{equipo.length} usuario{equipo.length===1?"":"s"} · envía por WhatsApp o correo</div>
                <Button size="sm" variant="outline" onClick={()=>copiarTodos(equipo)} disabled={equipo.length===0}><ClipboardList size={13}/> Copiar todos</Button>
              </div>
              <div className="rounded-lg border divide-y max-h-[360px] overflow-auto">
                {equipo.length===0?(
                  <div className="p-5 text-center text-sm text-muted-foreground">No hay capturadores o gerentes activos.</div>
                ):equipo.map(u=>(
                  <div key={u.id} className="flex items-center gap-2 px-3 py-2">
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold truncate">{u.nombre} <span className="text-[10px] font-normal text-slate-400 uppercase">{u.rol}</span></div>
                      <div className="text-[11px] text-slate-400 truncate">{u.telefono||"sin teléfono"} · {u.correo||"sin correo"}</div>
                    </div>
                    <a href={u.telefono?waHref(u):undefined} target="_blank" rel="noopener noreferrer"
                       className={"inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-bold text-white "+(u.telefono?"bg-[#25d366] hover:bg-[#1da851]":"bg-slate-200 !text-slate-400 pointer-events-none")}>
                      <Smartphone size={13}/> WhatsApp
                    </a>
                    <a href={u.correo?mailHref(u):undefined}
                       className={"inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-bold "+(u.correo?"border border-slate-300 text-slate-700 hover:bg-slate-50":"bg-slate-100 text-slate-300 pointer-events-none")}>
                      <Mail size={13}/> Correo
                    </a>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-[11px] text-amber-800">
                <AlertTriangle size={13} className="shrink-0 mt-0.5"/><span>Cada botón abre WhatsApp o tu correo con el mensaje listo — tú confirmas el envío. Comparte las claves con cuidado; para uno sin teléfono o correo, edítalo y agrégaselo.</span>
              </div>
            </div>
          );})()}
        </DialogContent>
      </Dialog>

      <Dialog open={!!credCreada} onOpenChange={(v)=>!v&&setCredCreada(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Acceso de {credCreada?.nombre}</DialogTitle></DialogHeader>
          {credCreada&&(
            <div className="space-y-3">
              <div className="rounded-lg bg-slate-50 border p-3 text-sm space-y-1">
                <div><span className="text-slate-500">Empresa:</span> <b className="font-mono">{((credCreada.email||"").split("@")[1]||"").replace(".tomfic.app","")}</b></div>
                <div><span className="text-slate-500">Usuario:</span> <b>{credCreada.nombre}</b></div>
                <div><span className="text-slate-500">Clave:</span> <b className="font-mono">{credCreada.pass}</b></div>
              </div>
              <div className="flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
                <AlertTriangle size={14} className="shrink-0"/> Comparte esta clave ahora: por seguridad podría no estar visible después.
              </div>
              <div className="flex gap-2">
                <Button className="flex-1 bg-[#25d366] hover:bg-[#1da851]" onClick={()=>copiarAcceso(credCreada)}><ClipboardList size={15}/> Copiar acceso</Button>
                <Button variant="outline" className="flex-1" onClick={()=>setCredCreada(null)}>Cerrar</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Section>
  );
}
