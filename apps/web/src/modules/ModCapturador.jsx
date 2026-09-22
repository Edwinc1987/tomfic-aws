import { useState, useRef, useEffect } from "react";
import { Package, Camera, Search, AlertTriangle, ChevronLeft, LogOut, RefreshCw, Users, FolderOpen, MapPin, Settings, Pencil, Minus, CornerDownLeft, Sun, Moon, CheckCircle } from "lucide-react";
import { Badge as UIBadge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { PageHeader } from "@/components/ui/page-header";
import CameraScanner from "@/components/CameraScanner";
import BtnNotas from "@/components/BtnNotas";
import SyncStatus from "@/components/SyncStatus";
import { G, SB, ID, TODAY, HOUR, conteoCompleto, nU, getStInv, card, inp, selectInventory } from "@/lib/data";
import { useCaptureOutbox } from "@/features/counts/hooks/useCaptureOutbox";

function EstBadge({e}){
  const m={BUENO:["#dcfce7","#166534"],VENCIDO:["#fee2e2","#dc2626"],AVERIADO:["#fef3c7","#92400e"],"NO APTO VENTA":["#fee2e2","#991b1b"],BAJAS:["#fef9c3","#854d0e"],"SIN REVISAR":["#f1f5f9","#475569"]};
  const [bg,tc]=m[e]||["#f1f5f9","#475569"];
  return <span style={{background:bg,color:tc,padding:"2px 8px",borderRadius:12,fontSize:11,fontWeight:700}}>{e||"—"}</span>;
}

const comprimirFoto=(file)=>new Promise((resolve,reject)=>{
  const reader=new FileReader();
  reader.onload=()=>{
    const img=new Image();
    img.onload=()=>{
      const scale=Math.min(1,1280/Math.max(img.width,img.height));
      const canvas=document.createElement("canvas");
      canvas.width=Math.round(img.width*scale);canvas.height=Math.round(img.height*scale);
      canvas.getContext("2d").drawImage(img,0,0,canvas.width,canvas.height);
      resolve({name:file.name,data:canvas.toDataURL("image/jpeg",0.72)});
    };
    img.onerror=reject;img.src=reader.result;
  };
  reader.onerror=reject;reader.readAsDataURL(file);
});

export function ModCapturador({usuario,setUsuario,logout,G,rerender,recargar,showToast}){
  const outboxEnabled=import.meta.env.VITE_CAPTURE_OUTBOX_ENABLED==="true";
  const captureOutbox=useCaptureOutbox({tenantId:G.tenantId,apiUrl:import.meta.env.VITE_API_URL||"http://localhost:3000",headers:{"x-tenant-id":G.tenantId||"","x-user-id":usuario?.id||usuario?.nombre||"","x-user-role":usuario?.rol||"CAPTURER"}});
  const [conteoActivo,setConteoActivo]=useState(()=>{try{return sessionStorage.getItem("tomfic_cap_conteo")||null;}catch(e){return null;}});
  const [rondaActiva,setRondaActiva]=useState(()=>{try{return sessionStorage.getItem("tomfic_cap_ronda")||null;}catch(e){return null;}}); // ronda elegida cuando el usuario tiene varias
  const [scanInput,setScanInput]=useState("");
  const [productoActivo,setProductoActivo]=useState(null);
   const [form,setForm]=useState({unidades:"",embalaje:"",cajas:"",estado:"BUENO",obs:"",fotos:[]});
  const [c3Vals,setC3Vals]=useState({}); // {productoId: cantidad}
  const [notFound,setNotFound]=useState(false);
  const [modalCerrar,setModalCerrar]=useState(false);
  const [showCam,setShowCam]=useState(false);
  const [modalSalir,setModalSalir]=useState(false);
  const [busqCap,setBusqCap]=useState("");
  const [editCap,setEditCap]=useState(null); // {p, cap} cuando se edita una captura
  const [busquedaUnif,setBusquedaUnif]=useState("");
  // Modo Día/Noche del capturador (recordado). De noche el fondo blanco cansa la vista;
  // se oscurece SOLO el contenido (no la barra ni la cámara) con un filtro suave.
  const [dark,setDark]=useState(()=>{try{return localStorage.getItem("tomfic_capdark")==="1";}catch(e){return false;}});
  const toggleDark=()=>setDark(d=>{const nv=!d;try{localStorage.setItem("tomfic_capdark",nv?"1":"0");}catch(e){}return nv;});
  useEffect(()=>{try{if(conteoActivo)sessionStorage.setItem("tomfic_cap_conteo",conteoActivo);else sessionStorage.removeItem("tomfic_cap_conteo");if(rondaActiva)sessionStorage.setItem("tomfic_cap_ronda",rondaActiva);else sessionStorage.removeItem("tomfic_cap_ronda");}catch(e){}},[conteoActivo,rondaActiva]);
  const pageBg=dark?"#0b1220":"#f1f5f9";
   const nightFilter=dark?{className:"cap-dark"}:{};
   const agregarFoto=async(e)=>{
     const files=Array.from(e.target.files||[]);
     for(const file of files){
       try{const foto=await comprimirFoto(file);setForm(f=>({...f,fotos:[...(f.fotos||[]),foto]}));}
       catch(err){showToast("No se pudo cargar la foto","err");}
     }
     e.target.value="";
   };
   const resetForm=()=>setForm({unidades:"",embalaje:"",cajas:"",estado:"BUENO",obs:"",fotos:[]});
  const [ajusteVals,setAjusteVals]=useState({}); // {productId: string} inputs del conteo de ajuste
  const [soloDif,setSoloDif]=useState(true); // ajuste: por defecto solo productos con diferencia
  const scanRef=useRef(null);
  const unidadesRef=useRef(null);
  const queueRemoteCapture=(capture)=>{if(outboxEnabled)void captureOutbox.capture(capture);};

  // Auto-refresco desde la nube cada 10s. Se pausa si el capturador está
  // escribiendo una captura o tiene la cámara abierta, para no interrumpir.
  useEffect(()=>{
    const t=setInterval(()=>{
      if(productoActivo||showCam||document.hidden)return;
      recargar();
    },15000);
    return ()=>clearInterval(t);
  },[productoActivo,showCam]);

  // Todos los conteos asignados a este usuario
  const misConteos=G.conteos.filter(c=>
    c.usuarioC1===usuario.nombre||c.usuarioC2===usuario.nombre||c.usuarioC3===usuario.nombre
  );
  const inventariosVisibles=G.inventarios.filter(inv=>!usuario.inventario_id||inv.id===usuario.inventario_id);

  const getConteo=()=>G.conteos.find(c=>c.id===conteoActivo)||null;
  const miConteo=getConteo();

  // TODAS las rondas de las que este usuario es responsable en el conteo
  const misRondasEn=(c)=>{
    if(!c)return [];
    const r=[];
    if(c.usuarioC1===usuario.nombre)r.push("C1");
    if(c.usuarioC2===usuario.nombre)r.push("C2");
    if(c.usuarioC3===usuario.nombre&&c.estado==="enC3")r.push("C3");
    return r;
  };
  const getMiRonda=(c)=>{
    if(!c)return null;
    const rondas=misRondasEn(c);
    if(rondas.length===0)return null;
    // Si hay una ronda elegida explícitamente y es válida, usarla
    if(rondaActiva&&rondas.includes(rondaActiva))return rondaActiva;
    // Si solo tiene una, esa
    if(rondas.length===1)return rondas[0];
    // Varias y ninguna elegida aún: priorizar C3 si está en curso, si no la primera no cerrada
    if(rondas.includes("C3"))return "C3";
    const noCerrada=rondas.find(r=>!(c.rondasCerradas||[]).includes(r));
    return noCerrada||rondas[0];
  };
  const miRonda=getMiRonda(miConteo);

  // Rondas cerradas independientes por usuario
  const getRondasCerradas=(c)=>c?.rondasCerradas||[];
  const miRondaCerrada=(c)=>{
    const r=getMiRonda(c);
    return getRondasCerradas(c).includes(r)||
      (r==="C3"&&c?.estado==="completado");
  };

  const puedoCapturar=(c)=>{
    if(!c)return false;
    if(miRondaCerrada(c))return false;
    const r=getMiRonda(c);
    if(r==="C3")return c.estado==="enC3";
    return true;
  };

  const soyPrincipal=(c)=>{
    if(!c)return false;
    const r=getMiRonda(c);
    if(r==="C1")return c.usuarioC1===usuario.nombre;
    if(r==="C2")return c.usuarioC2===usuario.nombre;
    return c.usuarioC3===usuario.nombre;
  };

  const getEstadoParaMi=(c)=>{
    if(miRondaCerrada(c))return "cerrado";
    return "activo";
  };

  // Productos para C3 — los que tuvieron diferencia
  const prodsC3=miConteo?G.productos.filter(p=>{
    const t1=Object.values(G.capturas).filter(c=>c.conteoId===miConteo.id&&c.productoId===p.id&&c.ronda==="C1").reduce((s,c)=>s+c.cantidad,0);
    const t2=Object.values(G.capturas).filter(c=>c.conteoId===miConteo.id&&c.productoId===p.id&&c.ronda==="C2").reduce((s,c)=>s+c.cantidad,0);
    return(t1>0||t2>0)&&t1!==t2;
  }):[];

  const prods=miConteo?(miRonda==="C3"?prodsC3:G.productos):[];

  const getCaps=(conteoId,ronda,prodId)=>Object.values(G.capturas).filter(c=>c.conteoId===conteoId&&c.ronda===ronda&&c.productoId===prodId);
  const getTotal=(conteoId,ronda,prodId)=>getCaps(conteoId,ronda,prodId).reduce((s,c)=>s+c.cantidad,0);

  const capturasRealizadas=miConteo?prods.map(p=>({
    p,total:getTotal(miConteo.id,miRonda,p.id),
    caps:getCaps(miConteo.id,miRonda,p.id)
  })).filter(x=>x.caps.length>0):[];

  const buscarProd=(q)=>{
    const s=q.trim().toLowerCase();
    return prods.find(p=>p.ean===s||p.ean===q.trim()||p.codigo.toLowerCase()===s||p.nombre.toLowerCase().includes(s)||(p.referencia||"").toLowerCase()===s)||null;
  };

  const handleScan=(e)=>{
    if(e.key!=="Enter"&&e.key!=="NumpadEnter")return;
    const p=buscarProd(scanInput);
    setNotFound(!p);
     if(p){setProductoActivo(p);resetForm();setTimeout(()=>unidadesRef.current?.focus(),80);}
    setScanInput("");
  };

  const handleUnifiedSearch=(e)=>{
    if(e.key!=="Enter"&&e.key!=="NumpadEnter")return;
    const q=busquedaUnif.trim();
    if(!q)return;
    const p=buscarProd(q);
    setNotFound(!p);
    if(p){setProductoActivo(p);resetForm();setBusquedaUnif("");setTimeout(()=>unidadesRef.current?.focus(),80);}
  };

  const onCamDetect=(code)=>{
    setShowCam(false);
    const p=buscarProd(code);
    setNotFound(!p);
     if(p){setProductoActivo(p);resetForm();setTimeout(()=>unidadesRef.current?.focus(),200);showToast(`📷 ${p.nombre}`);}
    else{showToast(`Código ${code} no está en la base`,"err");setBusquedaUnif(code);setTimeout(()=>scanRef.current?.focus(),120);}
  };

  const calcTotal=(f)=>(parseFloat(f.unidades)||0)+(parseFloat(f.cajas)||0)*(parseFloat(f.embalaje)||1);

  const guardar=()=>{
    if(!productoActivo||!miConteo||!miRonda)return;
    const total=calcTotal(form);
    if(miRonda!=="C3"&&total<=0)return showToast("Ingresa al menos las unidades","err");
    if(miConteo.estado==="pendiente"){G.conteos=G.conteos.map(c=>c.id===miConteo.id?{...c,estado:"enCurso"}:c);}
    // Si hay editCap, actualizar la captura existente
    if(editCap){
      const key=Object.keys(G.capturas).find(k=>{
        const c=G.capturas[k];
        return c.conteoId===miConteo.id&&c.productoId===productoActivo.id&&c.ronda===miRonda&&c===editCap.cap;
      });
      if(key){
        G.capturas[key]={...G.capturas[key],
          cantidad:total,unidades:parseFloat(form.unidades)||0,
          cajas:parseFloat(form.cajas)||0,embalaje:parseFloat(form.embalaje)||0,
           estado:form.estado,obs:form.obs,fotos:form.fotos||[],
          fecha:TODAY(),hora:HOUR(),
        };
        rerender();showToast(`✓ Editado: ${productoActivo.nombre} — ${total} und`);
         setProductoActivo(null);resetForm();
        setEditCap(null);
        setTimeout(()=>scanRef.current?.focus(),80);
        return;
      }
    }
    const key=`${miConteo.id}_${productoActivo.id}_${miRonda}_${ID()}`;
    G.capturas[key]={
      conteoId:miConteo.id,productoId:productoActivo.id,ronda:miRonda,
      ean:productoActivo.ean,codigo:productoActivo.codigo,nombre:productoActivo.nombre,
      referencia:productoActivo.referencia,categoria:productoActivo.categoria,
      subcategoria:productoActivo.subcategoria,subgrupo:productoActivo.subgrupo,
      saldo:productoActivo.saldo,costo:productoActivo.costo,
      proveedor:productoActivo.proveedor,nit:productoActivo.nit,
      cantidad:total,unidades:parseFloat(form.unidades)||0,
      cajas:parseFloat(form.cajas)||0,embalaje:parseFloat(form.embalaje)||0,
       estado:form.estado,obs:form.obs,fotos:form.fotos||[],
      usuario:usuario.nombre,fecha:TODAY(),hora:HOUR(),
    };
    queueRemoteCapture({operationId:key,productId:productoActivo.id,countId:miConteo.id,round:miRonda,quantity:total,condition:form.estado});
    rerender();showToast(`✓ ${productoActivo.nombre} — ${total} und`);
     setProductoActivo(null);resetForm();
    setEditCap(null);
    setTimeout(()=>scanRef.current?.focus(),80);
  };

  // Ajuste (−): resta unidades de un producto YA capturado, guardando una entrada negativa
  // (queda como registro auditable). Permite corregir hacia abajo sin borrar capturas.
  const guardarResta=()=>{
    if(!productoActivo||!miConteo||!miRonda)return;
    const cant=calcTotal(form);
    if(cant<=0)return showToast("Ingresa cuántas unidades restar","err");
    const totalAnt=getTotal(miConteo.id,miRonda,productoActivo.id);
    if(cant>totalAnt)return showToast(`Solo hay ${totalAnt} capturadas; no puedes restar ${cant}`,"err");
    if(miConteo.estado==="pendiente"){G.conteos=G.conteos.map(c=>c.id===miConteo.id?{...c,estado:"enCurso"}:c);}
    const key=`${miConteo.id}_${productoActivo.id}_${miRonda}_${ID()}`;
    G.capturas[key]={
      conteoId:miConteo.id,productoId:productoActivo.id,ronda:miRonda,
      ean:productoActivo.ean,codigo:productoActivo.codigo,nombre:productoActivo.nombre,
      referencia:productoActivo.referencia,categoria:productoActivo.categoria,
      subcategoria:productoActivo.subcategoria,subgrupo:productoActivo.subgrupo,
      saldo:productoActivo.saldo,costo:productoActivo.costo,
      proveedor:productoActivo.proveedor,nit:productoActivo.nit,
      cantidad:-cant,unidades:-(parseFloat(form.unidades)||0),
      cajas:parseFloat(form.cajas)||0,embalaje:parseFloat(form.embalaje)||0,
       estado:form.estado,obs:form.obs?("(ajuste) "+form.obs):"Ajuste: resta de unidades",fotos:form.fotos||[],
      usuario:usuario.nombre,fecha:TODAY(),hora:HOUR(),ajuste:true,
    };
    queueRemoteCapture({operationId:key,productId:productoActivo.id,countId:miConteo.id,round:miRonda,quantity:-cant,condition:form.estado});
    rerender();showToast(`➖ ${productoActivo.nombre} — restadas ${cant} und (queda ${totalAnt-cant})`);
     setProductoActivo(null);resetForm();
    setEditCap(null);
    setTimeout(()=>scanRef.current?.focus(),80);
  };

  // Guardar C3 desde la tabla directa
  const guardarC3Fila=(p,val)=>{
    const cantidad=parseFloat(val);
    if(isNaN(cantidad)||cantidad<0)return showToast("Valor inválido","err");
    if(miConteo.estado==="pendiente"){G.conteos=G.conteos.map(c=>c.id===miConteo.id?{...c,estado:"enCurso"}:c);}
    const key=`${miConteo.id}_${p.id}_C3_${ID()}`;
    G.capturas[key]={
      conteoId:miConteo.id,productoId:p.id,ronda:"C3",
      ean:p.ean,codigo:p.codigo,nombre:p.nombre,referencia:p.referencia,
      categoria:p.categoria,subcategoria:p.subcategoria,subgrupo:p.subgrupo,
      saldo:p.saldo,costo:p.costo,proveedor:p.proveedor,nit:p.nit,
      cantidad,estado:"BUENO",obs:"",
      usuario:usuario.nombre,fecha:TODAY(),hora:HOUR(),
    };
    queueRemoteCapture({operationId:key,productId:p.id,countId:miConteo.id,round:"C3",quantity,condition:"BUENO"});
    setC3Vals(prev=>({...prev,[p.id]:""}));
    rerender();showToast(`✓ ${p.nombre} — ${cantidad}`);
  };

  const cerrarConteo=async()=>{
    if(!miConteo||!miRonda||!soyPrincipal(miConteo))return;
    try{
      const {data,error}=await SB.closeConteoRound(miConteo.id,miRonda);
      if(error)throw error;
      const rondasCerradas=Array.isArray(data?.rondas_cerradas)?data.rondas_cerradas:JSON.parse(data?.rondas_cerradas||"[]");
      let nuevoEstado=miConteo.estado;

    if(miRonda==="C1"){
      // Si C2 también ya cerró, comparar
      if(rondasCerradas.includes("C2")){
        const hayDif=G.productos.some(p=>{
          const t1=Object.values(G.capturas).filter(c=>c.conteoId===miConteo.id&&c.productoId===p.id&&c.ronda==="C1").reduce((s,c)=>s+c.cantidad,0);
          const t2=Object.values(G.capturas).filter(c=>c.conteoId===miConteo.id&&c.productoId===p.id&&c.ronda==="C2").reduce((s,c)=>s+c.cantidad,0);
          return(t1>0||t2>0)&&t1!==t2;
        });
        nuevoEstado=hayDif?"diferencia":"completado";
      } else {
        nuevoEstado="cerradoC1";
      }
    } else if(miRonda==="C2"){
      // Si C1 también ya cerró, comparar
      if(rondasCerradas.includes("C1")){
        const hayDif=G.productos.some(p=>{
          const t1=Object.values(G.capturas).filter(c=>c.conteoId===miConteo.id&&c.productoId===p.id&&c.ronda==="C1").reduce((s,c)=>s+c.cantidad,0);
          const t2=Object.values(G.capturas).filter(c=>c.conteoId===miConteo.id&&c.productoId===p.id&&c.ronda==="C2").reduce((s,c)=>s+c.cantidad,0);
          return(t1>0||t2>0)&&t1!==t2;
        });
        nuevoEstado=hayDif?"diferencia":"completado";
      } else {
        nuevoEstado="cerradoC2";
      }
    } else if(miRonda==="C3"){
      nuevoEstado="completado";
    }

      G.conteos=G.conteos.map(c=>c.id===miConteo.id?{...c,estado:nuevoEstado,rondasCerradas,c1Cerrado:rondasCerradas.includes("C1"),c2Cerrado:rondasCerradas.includes("C2"),c3Cerrado:rondasCerradas.includes("C3")}:c);
      G.alertas.push({usuario:usuario.nombre,conteoNombre:miConteo.nombre,conteoId:miConteo.id,ronda:miRonda,hora:HOUR(),leida:false});
      setModalCerrar(false);setConteoActivo(null);setRondaActiva(null);
      rerender();showToast("Conteo terminado ✓");
    }catch(e){showToast(e.message||"No se pudo cerrar esta ronda. Ejecuta la actualización SQL e inténtalo de nuevo.","err");}
  };

  const rcol={C1:"#2563eb",C2:"#16a34a",C3:"#7c3aed"};
  const rlbl={C1:"CONTEO 1",C2:"CONTEO 2",C3:"CONTEO 3"};

  const modalSalirJSX=(
    <ConfirmDialog
      open={modalSalir}
      onOpenChange={setModalSalir}
      icon={LogOut}
      title="¿Cerrar sesión?"
      description="Vas a salir de TOMFIC. Tus capturas ya están guardadas en la nube."
      confirmText="Sí, salir"
      onConfirm={logout}
    />
  );

  // ── VISTA LISTA COMPACTA ──
  if(!conteoActivo||!miConteo){
    // Una entrada por cada (conteo, ronda) de la que el usuario es responsable
    const entradas=[];
    misConteos.forEach(c=>{
      misRondasEn(c).forEach(r=>{
        const cerrada=(c.rondasCerradas||[]).includes(r)||(r==="C3"&&c.estado==="completado");
        entradas.push({c,r,cerrada});
      });
    });
    const activos=entradas.filter(e=>!e.cerrada);
    const cerrados=entradas.filter(e=>e.cerrada);
    return(
      <div className={dark?"cap-shell cap-dark-shell":"cap-shell"} style={{minHeight:"100vh",background:pageBg,fontFamily:"system-ui,sans-serif"}}>
         <div style={{background:"#ffffff",color:"#1e293b",padding:"0 16px",display:"flex",alignItems:"center",justifyContent:"space-between",height:52,position:"sticky",top:0,zIndex:100,borderBottom:"1px solid #e2e8f0",boxShadow:"0 1px 4px rgba(15,23,42,0.08)"}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
             <Package size={20} color="#2563eb"/>
             <span style={{fontWeight:800,fontSize:15,color:"#0f172a"}}>tomfic</span>
            {G.inventario&&<select value={G.inventario.id} onChange={e=>{setConteoActivo(null);setRondaActiva(null);selectInventory(e.target.value);rerender();}} aria-label="Inventario activo seleccionado"
               style={{background:"#f8fafc",border:"1px solid #cbd5e1",color:"#475569",fontSize:10,padding:"3px 8px",borderRadius:5,fontWeight:700,maxWidth:180}}>
              {inventariosVisibles.map(inv=><option key={inv.id} value={inv.id} style={{color:"#0f172a"}}>{inv.nombre}</option>)}
            </select>}
          </div>
          <div style={{display:"flex",gap:10,alignItems:"center"}}>
             <SyncStatus/>
             <button onClick={toggleDark} title={dark?"Modo día":"Modo noche"} style={{background:"#ffffff",border:"1px solid #cbd5e1",color:"#64748b",padding:"4px 10px",borderRadius:6,fontSize:11,cursor:"pointer",display:"inline-flex",alignItems:"center"}}>{dark?<Sun size={14}/>:<Moon size={14}/>}</button>
             <button onClick={async()=>{await recargar();showToast("Actualizado ✓");}} style={{background:"#ffffff",border:"1px solid #cbd5e1",color:"#64748b",padding:"4px 10px",borderRadius:6,fontSize:11,cursor:"pointer",display:"flex",alignItems:"center"}}><RefreshCw size={13}/></button>
             <span style={{fontSize:11,color:"#64748b",display:"flex",alignItems:"center",gap:4}}><Users size={11}/> {usuario.nombre}</span>
             <button onClick={()=>setModalSalir(true)} style={{background:"#fff1f2",border:"1px solid #fecdd3",color:"#be123c",padding:"6px 16px",borderRadius:6,fontSize:12,fontWeight:700,cursor:"pointer",display:"inline-flex",alignItems:"center",gap:4}}><LogOut size={13}/> Salir</button>
          </div>
        </div>
        <div style={{maxWidth:700,margin:"0 auto",padding:"20px 14px",...nightFilter}}>
          <h2 style={{margin:"0 0 16px",fontSize:20,fontWeight:700,color:"#0f172a"}}>Mis conteos asignados</h2>

          {/* Activos */}
          <div style={{marginBottom:20}}>
            <div style={{fontSize:11,fontWeight:700,color:"#374151",textTransform:"uppercase",letterSpacing:1,marginBottom:10}}>Activos / Pendientes</div>
            {activos.length===0?(
              <div style={{...card,padding:"20px 18px",color:"#64748b",textAlign:"center"}}>
                <div style={{marginBottom:8,display:"flex",justifyContent:"center"}}><FolderOpen size={32} color="#64748b"/></div>
                <div style={{fontSize:14,fontWeight:600,marginBottom:4}}>No tienes conteos asignados</div>
                <div style={{fontSize:12}}>El administrador te asignará uno cuando sea necesario.</div>
              </div>
            ):(
              <div style={{...card,padding:0,overflow:"hidden"}}>
                {activos.map((e,i)=>{
                  const c=e.c, r=e.r;
                  const caps=Object.values(G.capturas).filter(x=>x.conteoId===c.id&&x.ronda===r);
                  // Para C3 solo se puede si el conteo está en enC3
                  const puedeIniciar=r==="C3"?c.estado==="enC3":true;
                  const abrir=()=>{
                    if(!puedeIniciar){showToast("No disponible aún","warn");return;}
                    setRondaActiva(r);
                    setConteoActivo(c.id);
                  };
                  return(
                    <div key={c.id+"_"+r} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"12px 16px",borderBottom:i<activos.length-1?"1px solid #f1f5f9":"none",background:"white",gap:12}}>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontWeight:700,fontSize:14,color:"#0f172a",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{c.nombre}</div>
                        <div style={{fontSize:11,color:"#64748b",marginTop:2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}><MapPin size={11} style={{display:"inline",marginRight:2}}/> {c.locLabel}</div>
                        <div style={{display:"flex",gap:6,marginTop:6,flexWrap:"wrap"}}>
                          <UIBadge className="border-transparent text-[10px] px-2 py-0.5" style={{background:(c.tipo==="ajuste"?"#7c3aed":rcol[r])+"22",color:c.tipo==="ajuste"?"#7c3aed":rcol[r]}}>{c.tipo==="ajuste"?"AJUSTE":rlbl[r]}</UIBadge>
                          {caps.length>0&&<UIBadge className="border-transparent text-[10px] px-2 py-0.5" style={{background:"#64748b22",color:"#64748b"}}>{new Set(caps.map(x=>x.productoId)).size} capturados</UIBadge>}
                          {!puedeIniciar&&<UIBadge className="border-transparent text-[10px] px-2 py-0.5" style={{background:"#64748b22",color:"#64748b"}}>No disponible aún</UIBadge>}
                        </div>
                      </div>
                      <button onClick={abrir}
                        style={{padding:"8px 16px",background:puedeIniciar?rcol[r]:"#e2e8f0",color:puedeIniciar?"white":"#64748b",border:"none",borderRadius:8,cursor:puedeIniciar?"pointer":"not-allowed",fontWeight:700,fontSize:13,flexShrink:0}}>
                        {caps.length>0?"Continuar":"Iniciar"}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Cerrados */}
          {cerrados.length>0&&(
            <div>
              <div style={{fontSize:11,fontWeight:700,color:"#374151",textTransform:"uppercase",letterSpacing:1,marginBottom:10}}>Completados</div>
              <div style={{...card,padding:0,overflow:"hidden"}}>
                {cerrados.map((e,i)=>{
                  const c=e.c, r=e.r;
                  const caps=Object.values(G.capturas).filter(x=>x.conteoId===c.id&&x.ronda===r);
                  return(
                    <div key={c.id+"_"+r} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 16px",borderBottom:i<cerrados.length-1?"1px solid #f1f5f9":"none",opacity:0.7}}>
                      <div style={{flex:1}}>
                        <div style={{fontWeight:600,fontSize:13,color:"#64748b"}}>{c.nombre}</div>
                        <div style={{fontSize:11,color:"#64748b",marginTop:1}}><MapPin size={11} style={{display:"inline",marginRight:2}}/> {c.locLabel}</div>
                        <div style={{display:"flex",gap:6,marginTop:4}}>
                          <UIBadge className="border-transparent text-[10px] px-2 py-0.5" style={{background:"#64748b22",color:"#64748b"}}>{rlbl[r]}</UIBadge>
                          <UIBadge className="border-transparent text-[10px] px-2 py-0.5 gap-1" style={{background:"#16a34a22",color:"#16a34a"}}><Settings size={9}/> Cerrado</UIBadge>
                          <UIBadge className="border-transparent text-[10px] px-2 py-0.5" style={{background:"#64748b22",color:"#64748b"}}>{new Set(caps.map(x=>x.productoId)).size} productos</UIBadge>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
        {modalSalirJSX}
      </div>
    );
  }

  // ── VISTA CONTEO DE AJUSTE ──
  if(miConteo.tipo==="ajuste"){
    const contadoDe=(pid)=>{
      const cs=Object.values(G.capturas).filter(c=>c.productoId===pid&&c.ronda!=="AJU");
      const s3=cs.filter(c=>c.ronda==="C3").reduce((s,c)=>s+c.cantidad,0);
      const s2=cs.filter(c=>c.ronda==="C2").reduce((s,c)=>s+c.cantidad,0);
      const s1=cs.filter(c=>c.ronda==="C1").reduce((s,c)=>s+c.cantidad,0);
      return s3||s2||s1;
    };
    const ajusteDe=(pid)=>{const a=Object.values(G.capturas).filter(c=>c.conteoId===miConteo.id&&c.productoId===pid&&c.ronda==="AJU");return a.length?a[a.length-1].cantidad:null;};
    const guardarAjuste=(p)=>{
      const raw=ajusteVals[p.id];
      const v=parseFloat(raw);
      if(raw===undefined||raw===""||isNaN(v)||v<0)return showToast("Escribe una cantidad válida","err");
      Object.keys(G.capturas).forEach(k=>{const c=G.capturas[k];if(c.conteoId===miConteo.id&&c.productoId===p.id&&c.ronda==="AJU")delete G.capturas[k];});
      const key=`${miConteo.id}_${p.id}_AJU_${ID()}`;
      G.capturas[key]={conteoId:miConteo.id,productoId:p.id,ronda:"AJU",ean:p.ean,codigo:p.codigo,nombre:p.nombre,referencia:p.referencia,categoria:p.categoria,subcategoria:p.subcategoria,subgrupo:p.subgrupo,saldo:p.saldo,costo:p.costo,proveedor:p.proveedor,nit:p.nit,cantidad:v,estado:"BUENO",obs:"Ajuste manual",usuario:usuario.nombre,fecha:TODAY(),hora:HOUR(),ajuste:true};
      setAjusteVals(prev=>{const n={...prev};delete n[p.id];return n;});
      rerender();showToast(`✓ ${p.nombre}: ${v}`);
    };
    const q=(busqCap||"").trim().toLowerCase();
    // Diferencia real de un producto: cantidad final (ajuste si existe, si no lo contado) menos el saldo del sistema.
    const difProd=(p)=>{const aju=ajusteDe(p.id);const fa=aju!==null?aju:contadoDe(p.id);return fa-(p.saldo||0);};
    const nConDif=G.productos.filter(p=>difProd(p)!==0).length;
    const listaAj=G.productos.filter(p=>{
      const matchQ=!q||p.nombre.toLowerCase().includes(q)||(p.codigo||"").toLowerCase().includes(q)||String(p.ean||"").toLowerCase().includes(q);
      if(!matchQ)return false;
      // Con buscador activo se muestran todos los coincidentes; sin buscador y en modo "solo diferencias", solo los que difieren.
      if(soloDif&&!q&&difProd(p)===0)return false;
      return true;
    // Orden: del más negativo (faltantes) al más positivo (sobrantes).
    }).sort((a,b)=>difProd(a)-difProd(b));
    return(
      <div className={dark?"cap-shell cap-dark-shell":"cap-shell"} style={{minHeight:"100vh",background:pageBg,fontFamily:"system-ui,sans-serif"}}>
         <div style={{background:"#ffffff",color:"#1e293b",padding:"0 16px",display:"flex",alignItems:"center",justifyContent:"space-between",height:52,position:"sticky",top:0,zIndex:100,borderBottom:"1px solid #e2e8f0",boxShadow:"0 1px 4px rgba(15,23,42,0.08)"}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
             <button onClick={()=>{setConteoActivo(null);setRondaActiva(null);}} style={{background:"#ffffff",border:"1px solid #cbd5e1",color:"#64748b",padding:"4px 10px",borderRadius:6,fontSize:11,cursor:"pointer",display:"inline-flex",alignItems:"center",gap:3}}><ChevronLeft size={13}/> Mis conteos</button>
             <span style={{fontWeight:800,fontSize:15,color:"#0f172a"}}>tomfic</span>
            <span style={{background:"#7c3aed",fontSize:10,padding:"2px 10px",borderRadius:20,fontWeight:700}}>AJUSTE</span>
          </div>
          <div style={{display:"flex",gap:10,alignItems:"center"}}>
             <SyncStatus/>
             <button onClick={toggleDark} title={dark?"Modo día":"Modo noche"} style={{background:"#ffffff",border:"1px solid #cbd5e1",color:"#64748b",padding:"4px 10px",borderRadius:6,fontSize:11,cursor:"pointer",display:"inline-flex",alignItems:"center"}}>{dark?<Sun size={14}/>:<Moon size={14}/>}</button>
             <span style={{fontSize:11,color:"#64748b",display:"flex",alignItems:"center",gap:4}}><Users size={11}/> {usuario.nombre}</span>
           <button onClick={()=>setModalSalir(true)} style={{background:"#fff1f2",border:"1px solid #fecdd3",color:"#be123c",padding:"6px 16px",borderRadius:6,fontSize:12,fontWeight:700,cursor:"pointer",display:"inline-flex",alignItems:"center",gap:4}}><LogOut size={13}/> Salir</button>
          </div>
        </div>
        <div style={{maxWidth:1000,margin:"0 auto",padding:"14px",...nightFilter}}>
          {/* Cabecera fija: título + buscador + filtro (sticky bajo la barra superior) */}
          <div style={{background:"white",borderRadius:10,padding:"12px 14px",marginBottom:10,boxShadow:"0 1px 4px rgba(0,0,0,0.06)",position:"sticky",top:52,zIndex:20}}>
            <div style={{fontWeight:800,fontSize:16,color:"#0f172a"}}>Conteo de Ajuste</div>
            <div style={{fontSize:12,color:"#64748b",marginTop:2}}>Corrige la <b>cantidad física real</b> de los productos con novedad. Lo que escribas reemplaza lo contado.</div>
            <input value={busqCap} onChange={e=>setBusqCap(e.target.value)} placeholder="Buscar por nombre, código o código de barras…" style={{...inp,marginTop:10,border:"2px solid #7c3aed"}} autoFocus/>
            <div style={{display:"flex",alignItems:"center",gap:10,marginTop:10,flexWrap:"wrap"}}>
              <button onClick={()=>setSoloDif(v=>!v)} style={{background:soloDif?"#7c3aed":"#eef2ff",color:soloDif?"white":"#4338ca",border:"none",borderRadius:20,padding:"5px 14px",fontSize:12,fontWeight:700,cursor:"pointer"}}>
                {soloDif?"● Solo diferencias":"○ Ver todos"}
              </button>
              <span style={{fontSize:12,color:"#64748b"}}><b style={{color:nConDif>0?"#dc2626":"#16a34a"}}>{nConDif}</b> producto{nConDif===1?"":"s"} con diferencia{soloDif&&busqCap?" · buscando en toda la base":""}</span>
            </div>
          </div>
          {/* Lista en tarjetas: se ve completa en celular, sin scroll lateral */}
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {listaAj.slice(0,300).map((p)=>{
              const cont=contadoDe(p.id);
              const aju=ajusteDe(p.id);
              const finalActual=aju!==null?aju:cont;
              const dif=finalActual-(p.saldo||0);
              const difCol=dif<0?"#dc2626":dif>0?"#2563eb":"#16a34a";
              return(
                <div key={p.id} style={{background:"white",borderRadius:10,padding:"10px 12px",boxShadow:"0 1px 4px rgba(0,0,0,0.06)",borderLeft:`4px solid ${difCol}`}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8}}>
                    <div style={{minWidth:0}}>
                      <div style={{fontFamily:"monospace",color:"#2563eb",fontWeight:700,fontSize:11}}>{p.codigo}</div>
                      <div style={{fontWeight:700,fontSize:14,color:"#0f172a",lineHeight:1.2}}>{p.nombre}</div>
                    </div>
                    <div style={{textAlign:"right",flexShrink:0}}>
                      <div style={{fontSize:10,color:"#64748b",textTransform:"uppercase",letterSpacing:0.5}}>Diferencia</div>
                      <div style={{fontWeight:800,fontSize:18,color:difCol}}>{dif>0?"+":""}{dif}</div>
                    </div>
                  </div>
                  <div style={{display:"flex",gap:14,marginTop:6,fontSize:12,color:"#64748b"}}>
                    <span>Contado: <b style={{color:"#0f172a"}}>{cont}</b></span>
                    <span>Sistema: <b style={{color:"#0f172a"}}>{p.saldo||0}</b></span>
                  </div>
                  <div style={{display:"flex",gap:8,marginTop:8,alignItems:"center"}}>
                    <input type="number" min="0" value={ajusteVals[p.id]??(aju!==null?String(aju):"")} onChange={e=>setAjusteVals(prev=>({...prev,[p.id]:e.target.value}))}
                      onKeyDown={e=>{if(e.key==="Enter")guardarAjuste(p);}}
                      placeholder={`Real (${finalActual})`} style={{flex:1,minWidth:0,padding:"8px 10px",border:`2px solid ${aju!==null?"#16a34a":"#7c3aed"}`,borderRadius:8,fontSize:16,fontWeight:700,textAlign:"center",outline:"none"}}/>
                    <button onClick={()=>guardarAjuste(p)} style={{background:aju!==null?"#16a34a":"#7c3aed",color:"white",border:"none",borderRadius:8,padding:"9px 16px",cursor:"pointer",fontWeight:700,fontSize:13,flexShrink:0}}>{aju!==null?"Actualizar":"Guardar"}</button>
                  </div>
                </div>
              );
            })}
            {listaAj.length===0&&<div style={{background:"white",borderRadius:10,padding:16,textAlign:"center",color:"#64748b",fontSize:13,boxShadow:"0 1px 4px rgba(0,0,0,0.06)"}}>{soloDif&&!busqCap?"No hay productos con diferencia. Toca «Ver todos» para ajustar cualquier producto.":"Sin resultados"}</div>}
            {listaAj.length>300&&<div style={{padding:"8px 12px",fontSize:11,color:"#64748b",textAlign:"center"}}>Mostrando 300 de {listaAj.length}. Usa el buscador para encontrar un producto.</div>}
          </div>
        </div>
        {modalSalirJSX}
      </div>
    );
  }

  // ── VISTA CAPTURA ──
  const total=calcTotal(form);
  return(
    <div className={dark?"cap-shell cap-dark-shell":"cap-shell"} style={{minHeight:"100vh",background:pageBg,fontFamily:"system-ui,sans-serif"}}>
       <div style={{background:"#ffffff",color:"#1e293b",padding:"0 16px",display:"flex",alignItems:"center",justifyContent:"space-between",height:52,position:"sticky",top:0,zIndex:100,borderBottom:"1px solid #e2e8f0",boxShadow:"0 1px 4px rgba(15,23,42,0.08)"}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
           <button onClick={()=>{setConteoActivo(null);setRondaActiva(null);setProductoActivo(null);setScanInput("");setBusquedaUnif("");}}
             style={{background:"#ffffff",border:"1px solid #cbd5e1",color:"#64748b",padding:"4px 10px",borderRadius:6,fontSize:11,cursor:"pointer",display:"inline-flex",alignItems:"center",gap:3}}><ChevronLeft size={13}/> Mis conteos</button>
           <span style={{fontWeight:800,fontSize:15,color:"#0f172a"}}>TOMFIC</span>
          <span style={{background:rcol[miRonda],fontSize:10,padding:"2px 10px",borderRadius:20,fontWeight:700}}>{rlbl[miRonda]}</span>
        </div>
        <div style={{display:"flex",gap:10,alignItems:"center"}}>
           <button onClick={toggleDark} title={dark?"Modo día":"Modo noche"} style={{background:"#ffffff",border:"1px solid #cbd5e1",color:"#64748b",padding:"4px 10px",borderRadius:6,fontSize:11,cursor:"pointer",display:"inline-flex",alignItems:"center"}}>{dark?<Sun size={14}/>:<Moon size={14}/>}</button>
           <button onClick={async()=>{await recargar();showToast("Actualizado ✓");}} title="Traer lo último de la nube" style={{background:"#ffffff",border:"1px solid #cbd5e1",color:"#64748b",padding:"4px 10px",borderRadius:6,fontSize:11,cursor:"pointer",display:"flex",alignItems:"center"}}><RefreshCw size={13}/></button>
           <span style={{fontSize:11,color:"#64748b",display:"flex",alignItems:"center",gap:4}}><Users size={11}/> {usuario.nombre}</span>
          {soyPrincipal(miConteo)&&<button onClick={()=>setModalCerrar(true)} style={{background:"#dc2626",color:"white",border:"none",padding:"6px 14px",borderRadius:8,cursor:"pointer",fontSize:12,fontWeight:700}}>Terminar conteo</button>}
           <button onClick={()=>setModalSalir(true)} style={{background:"#fff1f2",border:"1px solid #fecdd3",color:"#be123c",padding:"6px 16px",borderRadius:6,fontSize:12,fontWeight:700,cursor:"pointer",display:"inline-flex",alignItems:"center",gap:4}}><LogOut size={13}/> Salir</button>
        </div>
      </div>

       <div style={{padding:"8px 10px",maxWidth:1200,margin:"0 auto",...nightFilter}}>
        {/* Info */}
         <div style={{background:"white",borderRadius:9,padding:"8px 12px",marginBottom:8,boxShadow:"0 1px 4px rgba(0,0,0,0.06)"}}>
           <div className="cap-count-header" style={{display:"grid",gridTemplateColumns:"1fr auto",gap:12,alignItems:"center"}}>
            <div>
              <div style={{fontWeight:800,fontSize:13,color:"#0f172a"}}>{miConteo.nombre}</div>
              <div style={{fontSize:12,color:"#64748b",marginTop:2,display:"flex",alignItems:"center",gap:4}}><MapPin size={11}/> {miConteo.locLabel}</div>
              {miRonda==="C3"&&<div style={{marginTop:4,background:"#faf5ff",borderRadius:6,padding:"3px 8px",fontSize:11,color:"#7c3aed",fontWeight:600,display:"inline-block"}}>Solo diferencias C1/C2 · {prodsC3.length} productos</div>}
            </div>
            <div style={{textAlign:"right",maxWidth:200}}>
              <div style={{fontSize:10,color:"#64748b",marginBottom:4,textTransform:"uppercase",letterSpacing:0.8}}>Mis otros conteos</div>
              {misConteos.filter(c=>c.id!==miConteo.id).slice(0,3).map((c,i)=>{
                const r=getMiRonda(c);const est=getEstadoParaMi(c);
                return(
                  <div key={i} style={{fontSize:11,background:"#f8fafc",borderRadius:6,padding:"3px 8px",marginBottom:3,textAlign:"left",display:"flex",gap:6,alignItems:"center"}}>
                    <span style={{background:est==="cerrado"?"#e2e8f0":rcol[r],color:"white",borderRadius:4,padding:"0 4px",fontSize:9,fontWeight:700}}>{rlbl[r]}</span>
                    <span style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",color:est==="cerrado"?"#64748b":"#374151",fontSize:11}}>{c.nombre}</span>
                    {est==="cerrado"&&<span style={{color:"#16a34a",fontSize:10,display:"flex",alignItems:"center"}}><Settings size={9}/></span>}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* C3 — tabla directa de productos con diferencia */}
        {miRonda==="C3"&&prodsC3.length>0&&(
          <div style={{background:"white",borderRadius:10,overflow:"hidden",boxShadow:"0 1px 4px rgba(0,0,0,0.06)",marginBottom:10}}>
            <div style={{padding:"10px 16px",background:"#faf5ff",borderBottom:"1px solid #e9d5ff",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <span style={{fontWeight:700,fontSize:13,color:"#7c3aed"}}>Productos con diferencia — ingresa el conteo real</span>
              <span style={{fontSize:12,color:"#7c3aed"}}>{prodsC3.length} productos</span>
            </div>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
              <thead><tr style={{background:"#f3e8ff"}}>
                {["Código","EAN","Nombre","Referencia","C1","C2","Diferencia","Conteo 3",""].map(h=>(
                  <th key={h} style={{padding:"8px 10px",textAlign:"left",fontWeight:700,color:"#7c3aed",borderBottom:"1px solid #e9d5ff"}}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {prodsC3.map((p,i)=>{
                  const t1=Object.values(G.capturas).filter(c=>c.conteoId===miConteo.id&&c.productoId===p.id&&c.ronda==="C1").reduce((s,c)=>s+c.cantidad,0);
                  const t2=Object.values(G.capturas).filter(c=>c.conteoId===miConteo.id&&c.productoId===p.id&&c.ronda==="C2").reduce((s,c)=>s+c.cantidad,0);
                  const t3=getTotal(miConteo.id,"C3",p.id);
                  const yaCapturado=t3>0||Object.values(G.capturas).some(c=>c.conteoId===miConteo.id&&c.productoId===p.id&&c.ronda==="C3"&&c.cantidad===0);
                  return(
                    <tr key={p.id} style={{background:yaCapturado?"#f0fdf4":i%2?"#faf5ff":"white",borderBottom:"1px solid #f3e8ff"}}>
                      <td style={{padding:"8px 10px",fontFamily:"monospace",color:"#7c3aed",fontWeight:700}}>{p.codigo}</td>
                      <td style={{padding:"8px 10px",fontSize:10,color:"#64748b"}}>{p.ean}</td>
                      <td style={{padding:"8px 10px",fontWeight:600}}>{p.nombre}</td>
                      <td style={{padding:"8px 10px",color:"#64748b",fontSize:11}}>{p.referencia}</td>
                      <td style={{padding:"8px 10px",textAlign:"center",fontWeight:700,color:"#2563eb"}}>{t1}</td>
                      <td style={{padding:"8px 10px",textAlign:"center",fontWeight:700,color:"#16a34a"}}>{t2}</td>
                      <td style={{padding:"8px 10px",textAlign:"center",fontWeight:700,color:"#dc2626"}}>{t1-t2>0?"+":""}{ t1-t2}</td>
                      <td style={{padding:"6px 8px"}}>
                        {yaCapturado?(
                          <span style={{fontWeight:800,fontSize:14,color:"#16a34a"}}>{t3} ✓</span>
                        ):(
                          <input type="number" min="0" value={c3Vals[p.id]??""} onChange={e=>setC3Vals(prev=>({...prev,[p.id]:e.target.value}))}
                            onKeyDown={e=>{if(e.key==="Enter"&&(c3Vals[p.id]!==undefined&&c3Vals[p.id]!==""))guardarC3Fila(p,c3Vals[p.id]);}}
                            placeholder="0" style={{...inp,width:80,padding:"6px 8px",fontSize:15,fontWeight:700,textAlign:"center",border:"2px solid #7c3aed"}}/>
                        )}
                      </td>
                      <td style={{padding:"6px 8px"}}>
                        {!yaCapturado&&(
                          <button onClick={()=>{const v=c3Vals[p.id];if(v!==undefined&&v!=="")guardarC3Fila(p,v);}}
                            disabled={c3Vals[p.id]===undefined||c3Vals[p.id]===""}
                            style={{background:c3Vals[p.id]!==undefined&&c3Vals[p.id]!==""?"#7c3aed":"#e2e8f0",color:c3Vals[p.id]!==undefined&&c3Vals[p.id]!==""?"white":"#64748b",border:"none",borderRadius:6,padding:"5px 12px",cursor:"pointer",fontWeight:700,fontSize:11}}>
                            Guardar
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div style={{padding:"10px 16px",background:"#f8fafc",borderTop:"1px solid #e2e8f0",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <span style={{fontSize:12,color:"#7c3aed"}}>{Object.values(G.capturas).filter(c=>c.conteoId===miConteo.id&&c.ronda==="C3").length} de {prodsC3.length} validados</span>
              {soyPrincipal(miConteo)&&<button onClick={()=>setModalCerrar(true)} style={{background:"#dc2626",color:"white",border:"none",borderRadius:8,padding:"8px 20px",cursor:"pointer",fontWeight:700,fontSize:13}}>TERMINAR CONTEO</button>}
            </div>
          </div>
        )}

        {/* Scanner + búsqueda unificada */}
         <div style={{background:"white",borderRadius:12,padding:"10px 12px",marginBottom:8,boxShadow:"0 1px 4px rgba(0,0,0,0.06)"}}>
           <div style={{position:"relative"}}>
              <div style={{display:"flex",alignItems:"center",gap:6}}>
                <div style={{flex:1,position:"relative"}}>
                  <div style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",color:scanInput||busquedaUnif?"#2563eb":"#94a3b8",pointerEvents:"none"}}>
                    <Search 
size={18}/>
                  </div>
                  <input ref={scanRef} value={busquedaUnif} onChange={e=>{setBusquedaUnif(e.target.value);setProductoActivo(null);setNotFound(false);}}
                    onKeyDown={handleUnifiedSearch} enterKeyHint="go"
                    placeholder={busquedaUnif.length>=3?"Buscando…":"Escanee código de barras, QR o escriba nombre, código, referencia…"}
                    style={{...inp,width:"100%",padding:"10px 12px 10px 36px",border:`2px solid ${busquedaUnif?"#2563eb":"#e2e8f0"}`,borderRadius:10,fontSize:14,transition:"border-color 0.15s"}}
                    autoComplete="off" autoFocus/>
                </div>
                <button onClick={()=>handleUnifiedSearch({key:"Enter"})} title="Buscar"
                  style={{padding:"10px 14px",background:rcol[miRonda],color:"white",border:"none",borderRadius:10,cursor:"pointer",fontWeight:700,display:"inline-flex",alignItems:"center",flexShrink:0}}>
                  <CornerDownLeft size={17}/>
                </button>
                <button onClick={()=>setShowCam(true)} title="Escanear con cámara (barras / QR)"
                  style={{padding:"10px 14px",background:"white",color:rcol[miRonda],border:`2px solid ${rcol[miRonda]}`,borderRadius:10,cursor:"pointer",fontWeight:700,display:"inline-flex",alignItems:"center",flexShrink:0}}>
                  <Camera size={17}/>
                </button>
              </div>
              {notFound&&<div style={{marginTop:6,color:"#dc2626",fontSize:12,fontWeight:600,display:"flex",alignItems:"center",gap:4}}><AlertTriangle size={12}/> Código "{busquedaUnif}" no encontrado en la base</div>}
              {/* Dropdown de resultados */}
              {busquedaUnif.length>=2&&!productoActivo&&(()=>{
                const q=busquedaUnif.toLowerCase();
                const sugs=prods.filter(p=>(p.nombre||"").toLowerCase().includes(q)||(p.codigo||"").toLowerCase().includes(q)||(p.ean||"").includes(busquedaUnif)||(p.referencia||"").toLowerCase().includes(q)).slice(0,8);
                if(!sugs.length)return(
                  <div style={{position:"absolute",top:"100%",left:0,right:0,background:"white",border:"1.5px solid #e2e8f0",borderRadius:10,boxShadow:"0 4px 16px rgba(0,0,0,0.12)",zIndex:200,padding:"10px 14px",fontSize:12,color:"#64748b",marginTop:4}}>
                    No se encontró "{busquedaUnif}"
                  </div>
                );
                return(
                  <div style={{position:"absolute",top:"100%",left:0,right:60,background:"white",border:`1.5px solid ${rcol[miRonda]}`,borderRadius:10,boxShadow:"0 4px 16px rgba(0,0,0,0.15)",zIndex:200,maxHeight:280,overflowY:"auto",marginTop:4}}>
                    {sugs.map((p,i)=>{
                      const tot=getTotal(miConteo.id,miRonda,p.id);
                      const isEan=(p.ean||"").includes(busquedaUnif);
                      return(
                        <div key={p.id} onClick={()=>{setProductoActivo(p);resetForm();setBusquedaUnif("");setTimeout(()=>unidadesRef.current?.focus(),80);}}
                          style={{padding:"10px 14px",cursor:"pointer",borderBottom:i<sugs.length-1?"1px solid #f1f5f9":"none",display:"flex",justifyContent:"space-between",alignItems:"center"}}
                          onMouseEnter={e=>e.currentTarget.style.background="#eff6ff"}
                          onMouseLeave={e=>e.currentTarget.style.background="white"}>
                          <div style={{minWidth:0}}>
                            <div style={{fontWeight:700,fontSize:13,color:"#0f172a",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.nombre}</div>
                            <div style={{fontSize:11,color:"#64748b",marginTop:1,display:"flex",gap:6,alignItems:"center",flexWrap:"wrap"}}>
                              <span style={{fontFamily:"monospace",color:"#2563eb",fontWeight:600}}>{p.codigo}</span>
                              {p.referencia&&<span>Ref: {p.referencia}</span>}
                              {isEan&&<span style={{background:"#dbeafe",color:"#1d4ed8",padding:"0 5px",borderRadius:4,fontSize:10,fontWeight:700}}>EAN</span>}
                            </div>
                          </div>
                          {tot>0?<div style={{background:rcol[miRonda]+"22",color:rcol[miRonda],padding:"2px 8px",borderRadius:12,fontSize:11,fontWeight:700,flexShrink:0}}>✓ {tot}</div>:<div style={{color:"#d1d5db",fontSize:11,flexShrink:0}}>Sin captura</div>}
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
           </div>
         </div>

        {/* Ficha del producto */}
        {productoActivo&&(()=>{
          const caps=getCaps(miConteo.id,miRonda,productoActivo.id);
          const totalAnt=getTotal(miConteo.id,miRonda,productoActivo.id);
          return(
             <div style={{background:"white",borderRadius:9,padding:14,marginBottom:8,boxShadow:"0 2px 8px rgba(0,0,0,0.1)",border:`2px solid ${rcol[miRonda]}`}}>
               <div className="cap-product-meta" style={{display:"grid",gridTemplateColumns:"minmax(0,1.3fr) minmax(230px,.7fr)",gap:12,marginBottom:10,paddingBottom:10,borderBottom:"1px solid #f1f5f9"}}>
                <div>
                  <div style={{fontSize:11,color:"#64748b",marginBottom:2}}>CÓDIGO</div>
                  <div style={{fontFamily:"monospace",fontSize:16,fontWeight:800,color:"#2563eb"}}>{productoActivo.codigo}</div>
                   <div style={{marginTop:5}}>
                    <div style={{fontSize:11,color:"#64748b"}}>CÓD. BARRAS (EAN)</div>
                    <div style={{fontFamily:"monospace",fontSize:14,fontWeight:700,color:"#0f172a"}}>{productoActivo.ean||"—"}</div>
                  </div>
                   <div style={{marginTop:5}}>
                    <div style={{fontSize:11,color:"#64748b"}}>NOMBRE PRODUCTO</div>
                    <div style={{fontWeight:700,fontSize:15,color:"#0f172a"}}>{productoActivo.nombre}</div>
                  </div>
                   <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6,marginTop:5}}>
                    <div><div style={{fontSize:10,color:"#64748b"}}>REFERENCIA</div><div style={{fontSize:13,fontWeight:600}}>{productoActivo.referencia||"—"}</div></div>
                    <div><div style={{fontSize:10,color:"#64748b"}}>PROVEEDOR</div><div style={{fontSize:13,fontWeight:600}}>{productoActivo.proveedor||"—"}</div></div>
                  </div>
                  {totalAnt>0&&<div style={{marginTop:8,background:"#f0fdf4",borderRadius:8,padding:"8px 12px",border:"1px solid #bbf7d0",display:"flex",alignItems:"center",gap:16}}>
                    <div><div style={{fontSize:9,color:"#64748b",fontWeight:700}}>YA CAPTURADO</div><div style={{fontSize:15,fontWeight:800,color:"#16a34a"}}>{totalAnt} und</div></div>
                    <div style={{color:"#d1d5db"}}>|</div>
                    <div><div style={{fontSize:9,color:"#64748b",fontWeight:700}}>ENTRADAS</div><div style={{fontSize:15,fontWeight:800,color:"#374151"}}>{caps.length}</div></div>
                  </div>}
                  {miRonda==="C3"&&(()=>{
                    const t1=Object.values(G.capturas).filter(c=>c.conteoId===miConteo.id&&c.productoId===productoActivo.id&&c.ronda==="C1").reduce((s,c)=>s+c.cantidad,0);
                    const t2=Object.values(G.capturas).filter(c=>c.conteoId===miConteo.id&&c.productoId===productoActivo.id&&c.ronda==="C2").reduce((s,c)=>s+c.cantidad,0);
                    return<div style={{marginTop:8,background:"#fef2f2",borderRadius:8,padding:"6px 10px",fontSize:12,color:"#dc2626",fontWeight:600}}>C1:{t1} vs C2:{t2} → Dif:{t1-t2}</div>;
                  })()}
                </div>
                <div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                    <div><div style={{fontSize:10,color:"#64748b"}}>UBICACIÓN</div><div style={{fontSize:12,fontWeight:600}}>{miConteo.ubicacion}</div></div>
                    <div><div style={{fontSize:10,color:"#64748b"}}>LOCALIZACIÓN</div><div style={{fontSize:12,fontWeight:600}}>{miConteo.localizacion}</div></div>
                    <div><div style={{fontSize:10,color:"#64748b"}}>N° LOCALIZACIÓN</div><div style={{fontSize:12,fontWeight:600}}>{miConteo.nro}</div></div>
                    <div><div style={{fontSize:10,color:"#64748b"}}>CONTEO N°</div><div style={{fontSize:12,fontWeight:600}}>{miRonda==="C1"?1:miRonda==="C2"?2:3}</div></div>
                  </div>
                   <div style={{marginTop:5}}>
                    <div style={{fontSize:10,color:"#64748b"}}>LÍNEA / SUBLÍNEA / SUBGRUPO</div>
                    <div style={{fontSize:12,color:"#374151"}}>{productoActivo.categoria||"—"} / {productoActivo.subcategoria||"—"} / {productoActivo.subgrupo||"—"}</div>
                  </div>
                </div>
              </div>
               <div className="cap-form-grid" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                <div>
                   <div style={{fontWeight:700,fontSize:11,color:"#374151",marginBottom:6,textTransform:"uppercase",letterSpacing:1}}>Cantidades</div>
                   <div style={{display:"grid",gridTemplateColumns:"90px 1fr",gap:6,alignItems:"center"}}>
                    <label style={{fontSize:12,fontWeight:600,color:"#374151"}}>UNIDADES</label>
                    <input ref={unidadesRef} type="number" min="0" value={form.unidades}
                      onChange={e=>setForm(f=>({...f,unidades:e.target.value}))}
                       onKeyDown={e=>{if(e.key==="Enter"||e.key==="NumpadEnter"){if(form.cajas||form.embalaje){document.getElementById("inp-emb2")?.focus();}else{guardar();}}}}
                       placeholder="0" style={{...inp,padding:"6px 8px",fontSize:15,fontWeight:700,textAlign:"center"}}/>
                    <label style={{fontSize:12,fontWeight:600,color:"#374151"}}>EMBALAJE</label>
                    <input id="inp-emb2" type="number" min="0" value={form.embalaje}
                      onChange={e=>setForm(f=>({...f,embalaje:e.target.value}))}
                       onKeyDown={e=>{if(e.key==="Enter"||e.key==="NumpadEnter")document.getElementById("inp-caj2")?.focus();}}
                       placeholder="Und/caja" style={{...inp,padding:"6px 8px",fontSize:13,textAlign:"center"}}/>
                    <label style={{fontSize:12,fontWeight:600,color:"#374151"}}>CAJAS</label>
                    <input id="inp-caj2" type="number" min="0" value={form.cajas}
                      onChange={e=>setForm(f=>({...f,cajas:e.target.value}))}
                       onKeyDown={e=>{if(e.key==="Enter"||e.key==="NumpadEnter")guardar();}}
                       placeholder="Cajas" style={{...inp,padding:"6px 8px",fontSize:13,textAlign:"center"}}/>
                    <label style={{fontSize:14,fontWeight:800,color:"#0f172a"}}>TOTAL</label>
                     <div style={{...inp,padding:"7px",fontSize:20,fontWeight:800,textAlign:"center",background:total>0?"#eff6ff":"#f8fafc",color:total>0?rcol[miRonda]:"#64748b",border:`2px solid ${total>0?rcol[miRonda]:"#e2e8f0"}`,cursor:"default",userSelect:"none"}}>
                      {total||0}
                    </div>
                  </div>
                </div>
                <div>
                   <div style={{fontWeight:700,fontSize:11,color:"#374151",marginBottom:6,textTransform:"uppercase",letterSpacing:1}}>Estado y observación</div>
                  <div style={{marginBottom:10}}>
                    <div style={{fontSize:11,color:"#64748b",marginBottom:4}}>ESTADO DEL PRODUCTO</div>
                    <select value={form.estado} onChange={e=>setForm(f=>({...f,estado:e.target.value}))} style={{...inp,fontSize:13}}>
                      {["BUENO","VENCIDO","AVERIADO","NO APTO VENTA","BAJAS","SIN REVISAR"].map(s=><option key={s}>{s}</option>)}
                    </select>
                  </div>
                   <div>
                     <div style={{fontSize:11,color:"#64748b",marginBottom:4}}>OBSERVACIÓN</div>
                     <input type="text" value={form.obs} onChange={e=>setForm(f=>({...f,obs:e.target.value}))}
                        onKeyDown={e=>{if(e.key==="Enter"||e.key==="NumpadEnter")guardar();}}
                       placeholder="Opcional…" style={{...inp,fontSize:13}}/>
                   </div>
                   <div style={{marginTop:10}}>
                     <div style={{fontSize:11,color:"#64748b",marginBottom:4}}>EVIDENCIA FOTOGRÁFICA</div>
                     <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
                       <label style={{padding:"7px 10px",background:"#f1f5f9",border:"1px solid #cbd5e1",borderRadius:7,cursor:"pointer",fontSize:12,fontWeight:700,color:"#374151",display:"inline-flex",alignItems:"center",gap:5}}>
                         <Camera size={14}/> Agregar foto<input type="file" accept="image/*" capture="environment" multiple onChange={agregarFoto} style={{display:"none"}}/>
                       </label>
                       {form.fotos?.length>0&&<span style={{fontSize:11,color:"#64748b"}}>{form.fotos.length} foto{form.fotos.length===1?"":"s"}</span>}
                     </div>
                     {form.fotos?.length>0&&<div style={{display:"flex",gap:6,flexWrap:"wrap",marginTop:6}}>
                       {form.fotos.map((foto,i)=><div key={i} style={{position:"relative"}}>
                         <img src={foto.data} alt={foto.name} style={{width:54,height:54,objectFit:"cover",borderRadius:6,border:"1px solid #cbd5e1"}}/>
                         <button type="button" onClick={()=>setForm(f=>({...f,fotos:f.fotos.filter((_,j)=>j!==i)}))} aria-label="Quitar foto" style={{position:"absolute",top:-5,right:-5,width:17,height:17,border:0,borderRadius:99,background:"#dc2626",color:"white",fontSize:12,cursor:"pointer"}}>×</button>
                       </div>)}
                     </div>}
                   </div>
                  {miRonda==="C3"&&<div style={{marginTop:10,background:"#faf5ff",borderRadius:8,padding:"8px 12px",fontSize:12,color:"#7c3aed"}}>En C3 se permite guardar 0 unidades.</div>}
                </div>
              </div>
               <div style={{display:"flex",gap:8,marginTop:10,flexWrap:"wrap",alignItems:"center"}}>
                <button onClick={guardar} disabled={miRonda!=="C3"&&total<=0}
                  style={{padding:"10px 28px",background:miRonda==="C3"||total>0?"#16a34a":"#e2e8f0",color:miRonda==="C3"||total>0?"white":"#64748b",border:"none",borderRadius:8,cursor:miRonda==="C3"||total>0?"pointer":"not-allowed",fontWeight:700,fontSize:14}}>
                  GUARDAR
                </button>
                {totalAnt>0&&miRonda!=="C3"&&<button onClick={guardarResta} disabled={total<=0} title="Restar unidades de lo ya capturado"
                  style={{padding:"10px 20px",background:total>0?"#ea580c":"#e2e8f0",color:total>0?"white":"#64748b",border:"none",borderRadius:8,cursor:total>0?"pointer":"not-allowed",fontWeight:700,fontSize:13,display:"inline-flex",alignItems:"center",gap:6}}>
                  <Minus size={15}/> RESTAR
                </button>}
                <button onClick={()=>{setProductoActivo(null);setForm({unidades:"",embalaje:"",cajas:"",estado:"BUENO",obs:""});setEditCap(null);setTimeout(()=>scanRef.current?.focus(),80);}}
                  style={{padding:"10px 20px",background:"#64748b",color:"white",border:"none",borderRadius:8,cursor:"pointer",fontWeight:700,fontSize:13}}>CANCELAR</button>
                <div style={{flex:1}}/>
                {soyPrincipal(miConteo)&&<button onClick={()=>setModalCerrar(true)} style={{padding:"10px 20px",background:"#dc2626",color:"white",border:"none",borderRadius:8,cursor:"pointer",fontWeight:700,fontSize:13}}>TERMINAR CONTEO</button>}
              </div>
            </div>
          );
        })()}

        {/* Capturas realizadas */}
        {miRonda!=="C3"&&capturasRealizadas.length>0&&(
          <div style={{background:"white",borderRadius:10,overflow:"hidden",boxShadow:"0 1px 4px rgba(0,0,0,0.06)",marginBottom:10}}>
            <div style={{padding:"10px 16px",background:"#f8fafc",borderBottom:"1px solid #e2e8f0",display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8}}>
              <span style={{fontWeight:700,fontSize:13,color:"#0f172a"}}>Capturas realizadas — {capturasRealizadas.length} productos</span>
              <input value={busqCap} onChange={e=>setBusqCap(e.target.value)} placeholder="Buscar por código o nombre…"
                style={{padding:"5px 10px",borderRadius:7,border:"1.5px solid #2563eb",fontSize:12,outline:"none",minWidth:200}}/>
            </div>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
              <thead><tr style={{background:"#f1f5f9"}}>
                {["Código","Cód. barras","Nombre","Ref.","Total","Estado","Obs","Acciones"].map(h=>(
                  <th key={h} style={{padding:"7px 10px",textAlign:"left",fontWeight:700,color:"#374151",borderBottom:"1px solid #e2e8f0",fontSize:11}}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {capturasRealizadas.filter(({p})=>!busqCap||p.nombre.toLowerCase().includes(busqCap.toLowerCase())||p.codigo.toLowerCase().includes(busqCap.toLowerCase())).map(({p,caps,total:tot},i)=>(
                  <tr key={p.id} style={{background:i%2?"#f8fafc":"white",borderBottom:"1px solid #f1f5f9"}}>
                    <td style={{padding:"7px 10px",fontFamily:"monospace",color:"#2563eb",fontWeight:700,fontSize:11}}>{p.codigo}</td>
                    <td style={{padding:"7px 10px",fontFamily:"monospace",color:"#64748b",fontSize:11}}>{p.ean||"—"}</td>
                    <td style={{padding:"7px 10px",fontWeight:600}}>{p.nombre}</td>
                    <td style={{padding:"7px 10px",color:"#64748b",fontSize:11}}>{p.referencia}</td>
                    <td style={{padding:"7px 10px",textAlign:"center"}}>
                      <span style={{fontWeight:800,fontSize:14,color:rcol[miRonda]}}>{tot}</span>
                      {caps.length>1&&<span style={{fontSize:10,color:"#64748b",marginLeft:4}}>({caps.length})</span>}
                    </td>
                    <td style={{padding:"7px 10px"}}><EstBadge e={caps[0]?.estado}/></td>
                    <td style={{padding:"7px 10px",color:"#64748b",fontSize:11,maxWidth:100,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{caps[0]?.obs||"—"}</td>
                    <td style={{padding:"7px 10px"}}>
                      <button onClick={()=>{
                        setProductoActivo(p);
                        const lastCap=caps[caps.length-1];
                        if(lastCap){
                          const emb=lastCap.embalaje||"";
                          const caj=lastCap.cajas||"";
                          const und=emb&&caj?"":(lastCap.cantidad||"");
                           setForm({unidades:String(und),embalaje:String(emb),cajas:String(caj),estado:lastCap.estado||"BUENO",obs:lastCap.obs||"",fotos:lastCap.fotos||[]});
                          setEditCap({p,cap:lastCap});
                        }else{
                           resetForm();
                          setEditCap(null);
                        }
                        setTimeout(()=>unidadesRef.current?.focus(),80);
                      }}
                        style={{background:"#fef9c3",color:"#92400e",border:"1px solid #fde047",borderRadius:6,padding:"3px 10px",cursor:"pointer",fontWeight:700,fontSize:11,marginRight:4,display:"inline-flex",alignItems:"center",gap:3}}><Pencil size={10}/> Editar</button>
                      <button onClick={()=>{caps.forEach(c=>{const k=Object.keys(G.capturas).find(k=>G.capturas[k]===c);if(k)delete G.capturas[k];});rerender();showToast("Eliminado","warn");}}
                        style={{background:"#fef2f2",color:"#dc2626",border:"1px solid #fecaca",borderRadius:6,padding:"3px 10px",cursor:"pointer",fontWeight:700,fontSize:11}}>Borrar</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{padding:"10px 16px",background:"#f8fafc",borderTop:"1px solid #e2e8f0",display:"flex",justifyContent:"flex-end"}}>
              {soyPrincipal(miConteo)&&<button onClick={()=>setModalCerrar(true)} style={{background:"#dc2626",color:"white",border:"none",borderRadius:8,padding:"8px 24px",cursor:"pointer",fontWeight:700,fontSize:13}}>TERMINAR CONTEO</button>}
            </div>
          </div>
        )}

        {capturasRealizadas.length===0&&!productoActivo&&miRonda!=="C3"&&(
          <div style={{...card,textAlign:"center",padding:36,color:"#64748b"}}>
            <div style={{marginBottom:8,display:"flex",justifyContent:"center"}}><Camera size={36} color="#64748b"/></div>
            <div style={{fontSize:14,fontWeight:600}}>Escanea o busca un producto para comenzar</div>
            <div style={{fontSize:12,marginTop:4}}>{prods.length} productos disponibles</div>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={modalCerrar}
        onOpenChange={setModalCerrar}
        icon={CheckCircle}
        iconClassName="text-primary"
        iconBg="bg-blue-50"
        title="Terminar conteo"
        description="¿Estás seguro de que deseas terminar este conteo?"
        confirmText="Sí, terminar conteo"
        confirmVariant="default"
        onConfirm={cerrarConteo}
      />
      <BtnNotas G={G} usuario={usuario} rerender={rerender} showToast={showToast}/>
      {showCam&&<CameraScanner 
color={rcol[miRonda]} onClose={()=>setShowCam(false)} onDetect={onCamDetect}/>}
      {modalSalirJSX}
    </div>
  );
}
