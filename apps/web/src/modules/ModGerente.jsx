import { useState, useEffect } from "react";
import { Package, BarChart2, FileText, Landmark, AlertTriangle, Scale, DollarSign, Calendar, ChevronLeft, ChevronRight, RefreshCw, LogOut, Target, Percent, Camera, ClipboardList } from "lucide-react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { PageHeader } from "@/components/ui/page-header";
import BannerVencimiento from "@/components/BannerVencimiento";
import { G, nU, getStInv, getKPIsInv, TODAY, HOUR, ID, selectInventory, rondaCerrada } from "@/lib/data";

export function ModGerente({usuario,setUsuario,logout,G,rerender,recargar,showToast}){
  const [view,setView]=useState("resumen");
const [modalSalir,setModalSalir]=useState(false);
const [hSel,setHSel]=useState(null); // inventario del historial seleccionado (detalle)

useEffect(()=>{
const t=setInterval(()=>{if(!document.hidden)recargar();},30000);
return()=>clearInterval(t);
},[]);

  const nav=[
    {id:"resumen",icon:BarChart2,label:"Resumen"},
    {id:"notas",icon:FileText,  label:"Notas"},
    {id:"historial",icon:Landmark,label:"Historial"},
  ];

  const pct=G.conteos.length>0?Math.round(G.conteos.filter(c=>c.estado==="completado").length/G.conteos.length*100):0;
  const notasInv=G.notas.filter(n=>n.inventarioId===(G.inventario?.id||""));
  const inventariosVisibles=G.inventarios.filter(inv=>!usuario.inventario_id||inv.id===usuario.inventario_id);

  // ── Métricas financieras del inventario (tablero gerencial) ──
  const _caps=Object.values(G.capturas);
  const _fmtCOP=(n)=>new Intl.NumberFormat("es-CO",{style:"currency",currency:"COP",maximumFractionDigits:0}).format(Math.round(n||0));
  const analisis=G.productos.map(p=>{
    const misC=_caps.filter(c=>c.productoId===p.id&&["C1","C2","C3"].includes(c.ronda));
    if(!misC.length)return null;
    const s1=misC.filter(c=>c.ronda==="C1").reduce((s,c)=>s+c.cantidad,0);
    const s2=misC.filter(c=>c.ronda==="C2").reduce((s,c)=>s+c.cantidad,0);
    const s3=misC.filter(c=>c.ronda==="C3").reduce((s,c)=>s+c.cantidad,0);
    const fisico=s3||s2||s1;
    const fr=s3>0?"C3":s2>0?"C2":"C1"; // ronda final: no sumar rondas repetidas
    let eBueno=0,eVencido=0,eAveriado=0;
    misC.filter(c=>c.ronda===fr).forEach(c=>{const e=(c.estado||"BUENO").toUpperCase(); if(e==="BUENO")eBueno+=c.cantidad; else if(e==="VENCIDO")eVencido+=c.cantidad; else eAveriado+=c.cantidad;});
    const dif=fisico-(p.saldo||0);
    return {...p,fisico,dif,valDif:dif*(p.costo||0),eBueno,eVencido,eAveriado,riesgoVal:(eVencido+eAveriado)*(p.costo||0)};
  }).filter(Boolean);
  const contados=analisis.length;
  const cobertura=G.productos.length?Math.round(contados/G.productos.length*100):0;
  const valorAjuste=analisis.reduce((s,a)=>s+a.valDif,0);
  const valorFisico=analisis.reduce((s,a)=>s+a.fisico*(a.costo||0),0);
  const valorTeorico=analisis.reduce((s,a)=>s+(a.saldo||0)*(a.costo||0),0);
  const costoRiesgo=analisis.reduce((s,a)=>s+a.riesgoVal,0);
  const ere=valorTeorico>0?Math.max(0,(1-Math.abs(valorAjuste)/valorTeorico)*100):100;
  const conDif=analisis.filter(a=>a.dif!==0).length;
  const top5=[...analisis].filter(a=>a.dif!==0).sort((a,b)=>Math.abs(b.valDif)-Math.abs(a.valDif)).slice(0,5);
  const top5Max=Math.max(1,...top5.map(a=>Math.abs(a.valDif)));
  // Sanidad del stock: unidades por estado (ronda final)
  const salud={bueno:analisis.reduce((s,a)=>s+a.eBueno,0),vencido:analisis.reduce((s,a)=>s+a.eVencido,0),averiado:analisis.reduce((s,a)=>s+a.eAveriado,0)};
  const saludTotal=salud.bueno+salud.vencido+salud.averiado;
  // Diferencia por categoría (valor)
  const porCat={};
  analisis.forEach(a=>{const k=a.categoria||"Sin categoría"; porCat[k]=(porCat[k]||0)+a.valDif;});
  const cats=Object.entries(porCat).map(([cat,val])=>({cat,val})).filter(c=>c.val!==0).sort((a,b)=>Math.abs(b.val)-Math.abs(a.val)).slice(0,6);
  const catMax=Math.max(1,...cats.map(c=>Math.abs(c.val)));

  return(
    <div style={{minHeight:"100vh",background:"#f0f4f8",fontFamily:"system-ui,sans-serif"}}>
      {/* Topbar */}
      <div style={{background:"linear-gradient(135deg,#7c3aed 0%,#4f46e5 100%)",color:"white",padding:"0 20px",display:"flex",alignItems:"center",justifyContent:"space-between",height:58,position:"sticky",top:0,zIndex:100,boxShadow:"0 2px 12px rgba(0,0,0,0.25)"}}>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <div style={{width:32,height:32,background:"rgba(255,255,255,0.2)",borderRadius:9,display:"flex",alignItems:"center",justifyContent:"center"}}><Package size={18} color="white"/></div>
          <div>
            <div style={{fontWeight:800,fontSize:15,letterSpacing:-0.5}}>tomfic</div>
            <div style={{fontSize:9,color:"rgba(255,255,255,0.6)",letterSpacing:1,textTransform:"uppercase"}}>Vista Gerente</div>
          </div>
          {G.inventario&&<select value={G.inventario.id} onChange={e=>{selectInventory(e.target.value);rerender();}} aria-label="Inventario activo seleccionado"
            style={{background:"rgba(255,255,255,0.15)",border:"1px solid rgba(255,255,255,0.25)",color:"white",fontSize:11,padding:"4px 10px",borderRadius:20,fontWeight:700,maxWidth:220}}>
            {inventariosVisibles.map(inv=><option key={inv.id} value={inv.id} style={{color:"#0f172a"}}>{inv.nombre}</option>)}
          </select>}
        </div>
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          <button onClick={async()=>{await recargar();showToast("Actualizado ✓");}} style={{background:"rgba(255,255,255,0.1)",border:"1px solid rgba(255,255,255,0.15)",color:"white",padding:"5px 12px",borderRadius:8,fontSize:11,cursor:"pointer"}}><RefreshCw size={11} style={{display:"inline",marginRight:4}}/> Sync</button>
          <div style={{display:"flex",alignItems:"center",gap:6,background:"rgba(255,255,255,0.1)",borderRadius:9,padding:"5px 10px"}}>
            <div style={{width:24,height:24,background:"linear-gradient(135deg,#7c3aed,#2563eb)",borderRadius:99,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700}}>{usuario.nombre[0]}</div>
            <span style={{fontSize:12,fontWeight:600}}>{usuario.nombre}</span>
          </div>
          <button onClick={()=>setModalSalir(true)} style={{background:"rgba(220,38,38,0.2)",border:"1px solid rgba(220,38,38,0.3)",color:"#fca5a5",padding:"6px 14px",borderRadius:8,fontSize:12,fontWeight:700,cursor:"pointer"}}>Salir</button>
        </div>
      </div>

      <div style={{display:"flex",height:"calc(100vh - 58px)",overflow:"hidden"}}>
        {/* Sidebar */}
        <div style={{width:160,background:"linear-gradient(180deg,#4f46e5,#7c3aed)",flexShrink:0,padding:"16px 8px",display:"flex",flexDirection:"column",gap:4,height:"100%",overflowY:"auto"}}>
          {nav.map(n=>{
            const active=view===n.id;
            return(
              <button key={n.id} onClick={()=>setView(n.id)}
                style={{width:"100%",display:"flex",alignItems:"center",gap:8,padding:"10px 12px",background:active?"rgba(255,255,255,0.2)":"transparent",color:"white",border:"none",cursor:"pointer",fontSize:13,borderRadius:10,fontWeight:active?700:400,opacity:active?1:0.7}}>
                <n.icon size={16}/><span>{n.label}</span>
              </button>
            );
          })}
        </div>

        {/* Contenido */}
        <div style={{flex:1,padding:24,overflowY:"auto"}}>
          <BannerVencimiento G={G}/>
          {view==="resumen"&&(
            <div>
              <PageHeader
                label="Vista Gerente"
                title={G.inventario?.nombre||"Sin inventario activo"}
                icon={BarChart2}
                subtitle={`Solo lectura · ${TODAY()}`}
                right={<div className="text-right"><div className="text-3xl font-extrabold leading-none">{pct}%</div><div className="text-[11px] text-white/80 mt-1">completado</div></div>}
              />
              {!G.inventario?(
                <div style={{textAlign:"center",padding:"48px 20px",background:"white",borderRadius:14,border:"2px dashed #e2e8f0",color:"#64748b"}}>
                  <div style={{display:"flex",justifyContent:"center",marginBottom:12}}><ClipboardList size={48} color="#64748b"/></div>
                  <div style={{fontSize:15,fontWeight:700}}>Sin inventario activo</div>
                </div>
              ):(
                <>
                  {/* Bloque financiero — impacto en dinero (lo primero para el gerente) */}
                  <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(210px,1fr))",gap:14,marginBottom:16}}>
                    {[
                      {l:"Valor de Ajuste",v:_fmtCOP(valorAjuste),c:valorAjuste<0?"#dc2626":valorAjuste>0?"#16a34a":"#475569",sub:`${conDif} producto${conDif===1?"":"s"} con diferencia`,top:valorAjuste<0?"#dc2626":valorAjuste>0?"#16a34a":"#94a3b8"},
                      {l:"Valor Físico Real",v:_fmtCOP(valorFisico),c:"#2563eb",sub:`Teórico: ${_fmtCOP(valorTeorico)}`,top:"#2563eb"},
                      {l:"Costo en Riesgo",v:_fmtCOP(costoRiesgo),c:costoRiesgo>0?"#d97706":"#16a34a",sub:"Vencidos + averiados",top:costoRiesgo>0?"#d97706":"#16a34a"},
                      {l:"Exactitud (ERE)",v:ere.toFixed(1)+"%",c:ere>=95?"#16a34a":ere>=85?"#d97706":"#dc2626",sub:"Valor físico vs sistema",top:ere>=95?"#16a34a":ere>=85?"#d97706":"#dc2626"},
                    ].map(k=>(
                      <div key={k.l} style={{position:"relative",background:"white",borderRadius:14,padding:"18px 18px 15px",boxShadow:"0 2px 8px rgba(15,23,42,0.06)",border:"1px solid #e8ecf1",overflow:"hidden"}}>
                        <div style={{position:"absolute",top:0,left:0,right:0,height:4,background:k.top}}/>
                        <div style={{fontSize:11,color:"#64748b",fontWeight:700,textTransform:"uppercase",letterSpacing:0.4}}>{k.l}</div>
                        <div style={{fontSize:23,fontWeight:900,color:k.c,margin:"8px 0 4px",fontVariantNumeric:"tabular-nums"}}>{k.v}</div>
                        <div style={{fontSize:11.5,color:"#94a3b8"}}>{k.sub}</div>
                      </div>
                    ))}
                  </div>

                  {/* Cobertura del inventario */}
                  <div style={{background:"white",borderRadius:14,padding:"16px 20px",marginBottom:16,boxShadow:"0 2px 8px rgba(15,23,42,0.06)",border:"1px solid #e8ecf1"}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10,flexWrap:"wrap",gap:8}}>
                      <div>
                        <div style={{fontSize:13,fontWeight:800,color:"#0f172a"}}>Cobertura del inventario</div>
                        <div style={{fontSize:11.5,color:"#64748b",marginTop:1}}><b>{contados}</b> de <b>{G.productos.length}</b> productos contados · {G.inventario.apertura} {G.inventario.horaApertura||""}{G.inventario.cierre?` → ${G.inventario.cierre} ${G.inventario.horaCierre||""}`:" · en curso"}</div>
                      </div>
                      <div style={{background:"linear-gradient(135deg,#7c3aed,#4f46e5)",borderRadius:10,padding:"6px 14px"}}><span style={{fontSize:18,fontWeight:900,color:"white"}}>{cobertura}%</span></div>
                    </div>
                    <div style={{background:"#e2e8f0",borderRadius:99,height:12,overflow:"hidden"}}>
                      <div style={{width:cobertura+"%",background:"linear-gradient(90deg,#7c3aed,#4f46e5,#2563eb)",borderRadius:99,height:"100%",transition:"width 0.6s ease"}}/>
                    </div>
                  </div>

                  {/* Gráficas: dona de sanidad + barras top descuadres */}
                  {contados>0&&(
                  <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(320px,1fr))",gap:14,marginBottom:16}}>
                    <div style={{background:"white",borderRadius:14,padding:"16px 18px",boxShadow:"0 2px 8px rgba(15,23,42,0.06)",border:"1px solid #e8ecf1"}}>
                      <div style={{fontSize:13,fontWeight:800,color:"#0f172a",marginBottom:12}}>Sanidad del stock</div>
                      <div style={{display:"flex",alignItems:"center",gap:20,flexWrap:"wrap"}}>
                        {(()=>{const r=52,C=2*Math.PI*r,T=saludTotal||1;let acc=0;const segs=[{v:salud.bueno,c:"#16a34a"},{v:salud.vencido,c:"#dc2626"},{v:salud.averiado,c:"#d97706"}];return(
                          <div style={{position:"relative",width:130,height:130,flexShrink:0}}>
                            <svg width="130" height="130" viewBox="0 0 130 130">
                              <circle cx="65" cy="65" r={r} fill="none" stroke="#eef1f5" strokeWidth="15"/>
                              {segs.map((s,i)=>{const len=(s.v/T)*C;const off=-acc;acc+=len;return <circle key={i} cx="65" cy="65" r={r} fill="none" stroke={s.c} strokeWidth="15" strokeDasharray={`${len} ${C}`} strokeDashoffset={off} strokeLinecap="butt" transform="rotate(-90 65 65)"/>;})}
                            </svg>
                            <div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>
                              <div style={{fontSize:20,fontWeight:900,color:"#16a34a"}}>{saludTotal?Math.round(salud.bueno/saludTotal*100):0}%</div>
                              <div style={{fontSize:10,color:"#94a3b8",fontWeight:700}}>BUENO</div>
                            </div>
                          </div>
                        );})()}
                        <div style={{display:"flex",flexDirection:"column",gap:9}}>
                          {[{l:"Bueno",v:salud.bueno,c:"#16a34a"},{l:"Vencido",v:salud.vencido,c:"#dc2626"},{l:"Averiado",v:salud.averiado,c:"#d97706"}].map(x=>(
                            <div key={x.l} style={{display:"flex",alignItems:"center",gap:8,fontSize:12.5}}>
                              <span style={{width:10,height:10,borderRadius:3,background:x.c}}/>
                              <span style={{color:"#475569",fontWeight:600}}>{x.l}</span>
                              <b style={{color:"#0f172a",marginLeft:2}}>{x.v}</b>
                              <span style={{color:"#94a3b8",fontSize:11}}>({saludTotal?Math.round(x.v/saludTotal*100):0}%)</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div style={{background:"white",borderRadius:14,padding:"16px 18px",boxShadow:"0 2px 8px rgba(15,23,42,0.06)",border:"1px solid #e8ecf1"}}>
                      <div style={{fontSize:13,fontWeight:800,color:"#0f172a",marginBottom:12,display:"flex",alignItems:"center",gap:7}}><AlertTriangle size={14} color="#dc2626"/> Top descuadres (impacto en $)</div>
                      {top5.length===0?<div style={{fontSize:12.5,color:"#94a3b8",padding:"8px 0"}}>Sin diferencias todavía.</div>:top5.map((a,i)=>{const w=Math.round(Math.abs(a.valDif)/top5Max*100);const neg=a.valDif<0;return(
                        <div key={i} style={{marginBottom:10}}>
                          <div style={{display:"flex",justifyContent:"space-between",gap:8,fontSize:12,marginBottom:3}}>
                            <span style={{fontWeight:600,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{a.nombre}</span>
                            <span style={{fontWeight:800,color:neg?"#dc2626":"#16a34a",whiteSpace:"nowrap"}}>{_fmtCOP(a.valDif)}</span>
                          </div>
                          <div style={{background:"#eef1f5",borderRadius:6,height:8,overflow:"hidden"}}><div style={{width:w+"%",height:"100%",borderRadius:6,background:neg?"#dc2626":"#16a34a"}}/></div>
                        </div>
                      );})}
                    </div>
                  </div>
                  )}

                  {/* Barras: diferencia por categoría */}
                  {cats.length>0&&(
                    <div style={{background:"white",borderRadius:14,padding:"16px 18px",boxShadow:"0 2px 8px rgba(15,23,42,0.06)",border:"1px solid #e8ecf1",marginBottom:16}}>
                      <div style={{fontSize:13,fontWeight:800,color:"#0f172a",marginBottom:12}}>Diferencia por categoría (valor)</div>
                      {cats.map((c,i)=>{const w=Math.round(Math.abs(c.val)/catMax*100);const neg=c.val<0;return(
                        <div key={i} style={{marginBottom:10}}>
                          <div style={{display:"flex",justifyContent:"space-between",gap:8,fontSize:12,marginBottom:3}}>
                            <span style={{fontWeight:600}}>{c.cat}</span>
                            <span style={{fontWeight:800,color:neg?"#dc2626":"#16a34a"}}>{_fmtCOP(c.val)}</span>
                          </div>
                          <div style={{background:"#eef1f5",borderRadius:6,height:8,overflow:"hidden"}}><div style={{width:w+"%",height:"100%",borderRadius:6,background:neg?"#dc2626":"#16a34a"}}/></div>
                        </div>
                      );})}
                    </div>
                  )}
                  {/* Tabla conteos */}
                  <div style={{background:"white",borderRadius:14,overflow:"hidden",boxShadow:"0 1px 4px rgba(0,0,0,0.06)",border:"1px solid #e2e8f0"}}>
                    <div style={{padding:"14px 18px",borderBottom:"1px solid #f1f5f9",fontWeight:700,fontSize:13,color:"#0f172a"}}>Estado de conteos</div>
                    <div style={{overflowX:"auto"}}>
                      <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
                        <thead><tr style={{background:"#f8fafc"}}>
                          {["Nombre","Ubicación","C1","Estado C1","C2","Estado C2","Estado"].map(h=>(
                            <th key={h} style={{padding:"10px 14px",textAlign:"left",fontWeight:600,color:"#64748b",fontSize:11,whiteSpace:"nowrap"}}>{h}</th>
                          ))}
                        </tr></thead>
                        <tbody>
                          {G.conteos.map((c,i)=>(
                            <tr key={c.id} style={{borderBottom:"1px solid #f1f5f9",background:i%2?"#fafafa":"white"}}>
                              <td style={{padding:"10px 14px",fontWeight:700,color:"#0f172a"}}>{c.nombre}</td>
                              <td style={{padding:"10px 14px",fontSize:12,color:"#64748b"}}>{c.locLabel||"—"}</td>
                              <td style={{padding:"10px 14px",color:"#2563eb",fontWeight:600}}>{c.usuarioC1||"—"}</td>
                              <td style={{padding:"10px 14px"}}>{c.usuarioC1?<span style={{background:rondaCerrada(c,"C1")?"#f0fdf4":"#fffbeb",color:rondaCerrada(c,"C1")?"#16a34a":"#d97706",borderRadius:6,padding:"2px 8px",fontSize:11,fontWeight:700}}>{rondaCerrada(c,"C1")?"OK":"En curso"}</span>:"—"}</td>
                              <td style={{padding:"10px 14px",color:"#16a34a",fontWeight:600}}>{c.usuarioC2||"N/A"}</td>
                              <td style={{padding:"10px 14px"}}>{c.usuarioC2?<span style={{background:rondaCerrada(c,"C2")?"#f0fdf4":"#fffbeb",color:rondaCerrada(c,"C2")?"#16a34a":"#d97706",borderRadius:6,padding:"2px 8px",fontSize:11,fontWeight:700}}>{rondaCerrada(c,"C2")?"OK":"Pendiente"}</span>:"—"}</td>
                              <td style={{padding:"10px 14px"}}><span style={{background:c.estado==="completado"?"#f0fdf4":c.estado==="diferencia"?"#fef2f2":"#f8fafc",color:c.estado==="completado"?"#16a34a":c.estado==="diferencia"?"#dc2626":"#64748b",borderRadius:6,padding:"3px 8px",fontSize:11,fontWeight:700}}>{c.estado}</span></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {view==="notas"&&(
            <div>
              <PageHeader
                label="Observaciones"
                title="Notas del inventario"
                icon={FileText}
                count={notasInv.length}
                countLabel="notas"
              />
              {notasInv.length===0?(
                <div style={{textAlign:"center",padding:"48px 20px",background:"white",borderRadius:14,border:"2px dashed #e2e8f0",color:"#64748b"}}>
                  <div style={{display:"flex",justifyContent:"center",marginBottom:12}}><FileText size={48} color="#64748b"/></div>
                  <div style={{fontSize:15,fontWeight:700}}>Sin notas aún</div>
                  <div style={{fontSize:13,marginTop:4}}>El admin y los capturadores pueden agregar notas durante el inventario.</div>
                </div>
              ):(
                <div style={{display:"flex",flexDirection:"column",gap:12}}>
                  {notasInv.map(n=>(
                    <div key={n.id} style={{background:"white",borderRadius:14,padding:"16px 18px",boxShadow:"0 1px 4px rgba(0,0,0,0.06)",border:"1px solid #e2e8f0"}}>
                      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
                        <div style={{width:32,height:32,borderRadius:99,background:n.rol==="admin"?"#1e40af":n.rol==="gerente"?"#7c3aed":"#16a34a",color:"white",fontSize:13,fontWeight:800,display:"flex",alignItems:"center",justifyContent:"center"}}>{n.usuario[0]}</div>
                        <div>
                          <div style={{fontWeight:700,fontSize:13,color:"#0f172a"}}>{n.usuario} <span style={{fontSize:10,color:"#64748b",fontWeight:400,textTransform:"uppercase"}}>{n.rol}</span></div>
                          <div style={{fontSize:11,color:"#64748b"}}>{n.fecha} · {n.hora}</div>
                        </div>
                      </div>
                      {n.texto&&<div style={{fontSize:14,color:"#374151",lineHeight:1.6,background:"#f8fafc",borderRadius:8,padding:"10px 12px"}}>{n.texto}</div>}
                      {n.fotos?.length>0&&(
                        <div style={{display:"flex",flexWrap:"wrap",gap:8,marginTop:10}}>
                          {n.fotos.map((f,i)=>(
                            <img key={i} src={f.data} alt={f.name} onClick={()=>window.open(f.data)} style={{width:80,height:80,objectFit:"cover",borderRadius:8,cursor:"pointer",border:"1px solid #e2e8f0",boxShadow:"0 1px 4px rgba(0,0,0,0.08)"}}/>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {view==="historial"&&(
            <div>
              <PageHeader
                label="Inventarios"
                title="Historial"
                icon={Landmark}
                count={G.historial.length}
                countLabel="inventarios"
              />
              {G.historial.length===0?(
                <div style={{textAlign:"center",padding:"48px 20px",background:"white",borderRadius:14,border:"2px dashed #e2e8f0",color:"#64748b"}}>
                  <div style={{display:"flex",justifyContent:"center",marginBottom:12}}><Landmark size={48} color="#64748b"/></div>
                  <div style={{fontSize:15,fontWeight:700}}>Sin historial</div>
                  <div style={{fontSize:13,marginTop:4}}>Los inventarios cerrados aparecerán aquí.</div>
                </div>
              ):!hSel?(
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
                    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:12,marginBottom:18}}>
                      {kpis.map((k,i)=>(
                        <div key={i} style={{background:"white",borderRadius:14,padding:"14px 16px",boxShadow:"0 1px 4px rgba(0,0,0,0.06)",border:"1px solid "+k.c+"22"}}>
                          <div style={{width:34,height:34,borderRadius:10,background:k.bg,color:k.c,display:"flex",alignItems:"center",justifyContent:"center",marginBottom:8}}><k.icon size={17}/></div>
                          <div style={{fontWeight:800,fontSize:18,color:k.c,lineHeight:1.1,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{k.v}</div>
                          <div style={{fontSize:11,color:"#64748b",fontWeight:600,marginTop:3}}>{k.l}</div>
                        </div>
                      ))}
                    </div>
                  );
                })()}

                {/* Lista de inventarios con mini-estadísticas */}
                <div style={{display:"flex",flexDirection:"column",gap:12}}>
                  {G.historial.map((h,i)=>{
                    const st=getStInv(h);
                    const notasH=G.notas.filter(n=>n.inventarioId===h.id);
                    const fotosN=notasH.reduce((s,n)=>s+(n.fotos?.length||0),0);
                    const invP=h.productos||[];
                    const sobU=st.resumen.reduce((s,r)=>{const p=invP.find(x=>x.id===r.productoId);const d=r.cantFinal-(p?.saldo||0);return s+(d>0?d:0);},0);
                    const falU=st.resumen.reduce((s,r)=>{const p=invP.find(x=>x.id===r.productoId);const d=r.cantFinal-(p?.saldo||0);return s+(d<0?-d:0);},0);
                    return(
                      <div key={i} style={{background:"white",borderRadius:14,padding:"16px 18px",boxShadow:"0 1px 4px rgba(0,0,0,0.06)",border:"1px solid #e2e8f0",borderLeft:"4px solid #7c3aed",cursor:"pointer"}} onClick={()=>setHSel(h)}>
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:8}}>
                          <div>
                            <div style={{fontWeight:800,fontSize:15,color:"#0f172a"}}>{h.nombre}</div>
                            <div style={{fontSize:12,color:"#64748b",marginTop:3}}>{h.apertura} → {h.cierre} · Por: {h.usuarioApertura||"—"}</div>
                          </div>
                          <span style={{background:h.tipo==="2conteos"?"#eff6ff":"#f0fdf4",color:h.tipo==="2conteos"?"#2563eb":"#16a34a",borderRadius:8,padding:"3px 10px",fontSize:11,fontWeight:700}}>{h.tipo==="2conteos"?"2 Conteos":"1 Conteo"}</span>
                        </div>
                        <div style={{display:"flex",gap:16,flexWrap:"wrap",marginTop:10}}>
                          <span style={{fontSize:12,fontWeight:700,color:"#16a34a"}}><DollarSign size={11} style={{display:"inline",marginRight:3}}/>{_fmtCOP(st.totalFisico)}</span>
                          <span style={{fontSize:12,fontWeight:700,color:st.ajuste>=0?"#16a34a":"#dc2626"}}><Scale size={11} style={{display:"inline",marginRight:3}}/>{st.ajuste>=0?"+":""}{_fmtCOP(st.ajuste)}</span>
                          <span style={{fontSize:12,color:"#64748b"}}>{st.contados}/{st.totalProductos} productos</span>
                          {st.conDif.length>0&&<span style={{fontSize:12,fontWeight:700,color:"#dc2626"}}><AlertTriangle size={11} style={{display:"inline",marginRight:3}}/>{st.conDif.length} difs</span>}
                          {(sobU>0||falU>0)&&<span style={{fontSize:12,fontWeight:700,color:sobU>=falU?"#16a34a":"#dc2626"}}>+{nU(sobU)} / −{nU(falU)} und</span>}
                        </div>
                        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginTop:10,paddingTop:10,borderTop:"1px solid #f1f5f9"}}>
                          <div style={{display:"flex",gap:14,fontSize:11,color:"#64748b",fontWeight:600}}>
                            <span><FileText size={11} style={{display:"inline",marginRight:3}}/>{notasH.length} notas</span>
                            <span><Camera size={11} style={{display:"inline",marginRight:3}}/>{fotosN} fotos</span>
                          </div>
                          <span style={{fontSize:12,fontWeight:700,color:"#7c3aed",display:"flex",alignItems:"center",gap:2}}>Ver detalle <ChevronRight size={13}/></span>
                        </div>
                      </div>
                    );
                  })}
                </div>
                </>
              ):(
                (()=>{
                  const inv=hSel;
                  // KPIs centralizadas en lib/data (getKPIsInv): misma cifra que VHistorial.
                  const {st,analH,coincide,exactitud,cobertura,es2,conC2,coincC1C2,desempates,precision,sobU,falU,sobV,falV,hayCosto}=getKPIsInv(inv);
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
                  return(
                    <div>
                      <button onClick={()=>setHSel(null)} style={{background:"white",border:"1px solid #e2e8f0",color:"#0f172a",padding:"6px 14px",borderRadius:8,fontSize:12,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",gap:5,marginBottom:12}}><ChevronLeft size={13}/> Historial</button>
                      <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap",marginBottom:6}}>
                        <div style={{fontWeight:800,fontSize:20,color:"#0f172a"}}>{inv.nombre}</div>
                        <span style={{background:inv.tipo==="2conteos"?"#eff6ff":"#f0fdf4",color:inv.tipo==="2conteos"?"#2563eb":"#16a34a",borderRadius:8,padding:"3px 10px",fontSize:11,fontWeight:700}}>{inv.tipo==="2conteos"?"2 Conteos":"1 Conteo"}</span>
                      </div>
                      <div style={{fontSize:12,color:"#64748b",marginBottom:18}}><Calendar size={12} style={{display:"inline",marginRight:4}}/>{inv.apertura} {inv.horaApertura} → {inv.cierre} {inv.horaCierre} · Por: {inv.usuarioApertura}</div>

                      {st.contados>0&&(
                      <>
                      <div style={{fontSize:11,fontWeight:700,color:"#94a3b8",marginBottom:10,textTransform:"uppercase",letterSpacing:0.5}}>Resultado del inventario</div>
                      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(210px,1fr))",gap:12,marginBottom:16}}>
                        <div style={{background:"white",borderRadius:14,padding:"14px 16px",boxShadow:"0 1px 4px rgba(0,0,0,0.06)",border:"1px solid #e2e8f0"}}>
                          <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:8}}><span style={{width:28,height:28,borderRadius:8,background:"#eff6ff",color:"#2563eb",display:"flex",alignItems:"center",justifyContent:"center"}}><Target size={15}/></span><span style={{fontSize:12,fontWeight:700,color:"#334155"}}>Exactitud del inventario</span></div>
                          <div style={{fontSize:28,fontWeight:800,color:"#2563eb",lineHeight:1}}>{exactitud}%</div>
                          <div style={{height:7,borderRadius:99,background:"#eef1f5",overflow:"hidden",marginTop:8}}><div style={{width:exactitud+"%",height:"100%",borderRadius:99,background:"#2563eb"}}/></div>
                          <div style={{fontSize:12,color:"#64748b",marginTop:6,fontWeight:600}}>{coincide} de {st.contados} coinciden · <b style={{color:"#dc2626"}}>{st.conDif.length}</b> con diferencia</div>
                        </div>
                        {es2&&conC2.length>0&&(
                        <div style={{background:"white",borderRadius:14,padding:"14px 16px",boxShadow:"0 1px 4px rgba(0,0,0,0.06)",border:"1px solid #e2e8f0"}}>
                          <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:8}}><span style={{width:28,height:28,borderRadius:8,background:"#f0fdf4",color:"#16a34a",display:"flex",alignItems:"center",justifyContent:"center"}}><Percent size={15}/></span><span style={{fontSize:12,fontWeight:700,color:"#334155"}}>Precisión de conteo (C1 = C2)</span></div>
                          <div style={{fontSize:28,fontWeight:800,color:"#16a34a",lineHeight:1}}>{precision}%</div>
                          <div style={{height:7,borderRadius:99,background:"#eef1f5",overflow:"hidden",marginTop:8}}><div style={{width:precision+"%",height:"100%",borderRadius:99,background:"#16a34a"}}/></div>
                          <div style={{fontSize:12,color:"#64748b",marginTop:6,fontWeight:600}}>{coincC1C2} coincidieron · <b style={{color:"#7c3aed"}}>{desempates.length}</b> a desempate C3</div>
                        </div>
                        )}
                        <div style={{background:"white",borderRadius:14,padding:"14px 16px",boxShadow:"0 1px 4px rgba(0,0,0,0.06)",border:"1px solid #e2e8f0"}}>
                          <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:8}}><span style={{width:28,height:28,borderRadius:8,background:"#ecfeff",color:"#0891b2",display:"flex",alignItems:"center",justifyContent:"center"}}><Package size={15}/></span><span style={{fontSize:12,fontWeight:700,color:"#334155"}}>Cobertura del conteo</span></div>
                          <div style={{fontSize:28,fontWeight:800,color:"#0891b2",lineHeight:1}}>{cobertura}%</div>
                          <div style={{height:7,borderRadius:99,background:"#eef1f5",overflow:"hidden",marginTop:8}}><div style={{width:cobertura+"%",height:"100%",borderRadius:99,background:"#0891b2"}}/></div>
                          <div style={{fontSize:12,color:"#64748b",marginTop:6,fontWeight:600}}>{st.contados}/{st.totalProductos} productos</div>
                        </div>
                        <div style={{background:"white",borderRadius:14,padding:"14px 16px",boxShadow:"0 1px 4px rgba(0,0,0,0.06)",border:"1px solid #e2e8f0"}}>
                          <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:8}}><span style={{width:28,height:28,borderRadius:8,background:"#f5f0ff",color:"#7c3aed",display:"flex",alignItems:"center",justifyContent:"center"}}><Scale size={15}/></span><span style={{fontSize:12,fontWeight:700,color:"#334155"}}>Ajuste: sobrante vs faltante</span></div>
                          <div style={{display:"flex",gap:12}}>
                            <div style={{flex:1}}>
                              <div style={{fontSize:10,fontWeight:700,color:"#94a3b8",textTransform:"uppercase",letterSpacing:0.5}}>Sobrante</div>
                              <div style={{fontSize:16,fontWeight:800,color:"#16a34a"}}>+{nU(sobU)} <span style={{fontSize:10,color:"#94a3b8"}}>und</span></div>
                              {hayCosto&&<div style={{fontSize:11,fontWeight:700,color:"#16a34a"}}>{_fmtCOP(sobV)}</div>}
                            </div>
                            <div style={{width:1,background:"#e2e8f0"}}/>
                            <div style={{flex:1}}>
                              <div style={{fontSize:10,fontWeight:700,color:"#94a3b8",textTransform:"uppercase",letterSpacing:0.5}}>Faltante</div>
                              <div style={{fontSize:16,fontWeight:800,color:"#dc2626"}}>−{nU(falU)} <span style={{fontSize:10,color:"#94a3b8"}}>und</span></div>
                              {hayCosto&&<div style={{fontSize:11,fontWeight:700,color:"#dc2626"}}>{_fmtCOP(falV)}</div>}
                            </div>
                          </div>
                          <div style={{fontSize:12,color:"#64748b",marginTop:8,fontWeight:600}}>Neto <b style={{color:(sobU-falU)>=0?"#16a34a":"#dc2626"}}>{(sobU-falU)>=0?"+":"−"}{nU(Math.abs(sobU-falU))} und</b>{hayCosto?` · ${(st.ajuste>=0?"+":"")+_fmtCOP(st.ajuste)}`:" · sin costos"}</div>
                        </div>
                      </div>
                      </>
                      )}

                      {/* Dashboard visual: sanidad + descuadres */}
                      {st.contados>0&&(
                      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(320px,1fr))",gap:12,marginBottom:16}}>
                        <div style={{background:"white",borderRadius:14,padding:"16px 18px",boxShadow:"0 1px 4px rgba(0,0,0,0.06)",border:"1px solid #e2e8f0"}}>
                          <div style={{fontSize:13,fontWeight:800,color:"#0f172a",marginBottom:12}}>Sanidad del stock</div>
                          <div style={{display:"flex",alignItems:"center",gap:20,flexWrap:"wrap"}}>
                            {(()=>{const r=52,C=2*Math.PI*r,T=saludHTot||1;let acc=0;const segs=[{v:saludH.bueno,c:"#16a34a"},{v:saludH.vencido,c:"#dc2626"},{v:saludH.averiado,c:"#d97706"}];return(
                              <div style={{position:"relative",width:126,height:126,flexShrink:0}}>
                                <svg width="126" height="126" viewBox="0 0 126 126">
                                  <circle cx="63" cy="63" r={r} fill="none" stroke="#eef1f5" strokeWidth="15"/>
                                  {segs.map((s,i)=>{const len=(s.v/T)*C;const off=-acc;acc+=len;return <circle key={i} cx="63" cy="63" r={r} fill="none" stroke={s.c} strokeWidth="15" strokeDasharray={`${len} ${C}`} strokeDashoffset={off} strokeLinecap="butt" transform="rotate(-90 63 63)"/>;})}
                                </svg>
                                <div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>
                                  <div style={{fontSize:19,fontWeight:900,color:"#16a34a"}}>{saludHTot?Math.round(saludH.bueno/saludHTot*100):0}%</div>
                                  <div style={{fontSize:10,fontWeight:700,color:"#94a3b8"}}>BUENO</div>
                                </div>
                              </div>
                            );})()}
                            <div style={{display:"flex",flexDirection:"column",gap:8}}>
                              {[{l:"Bueno",v:saludH.bueno,c:"#16a34a"},{l:"Vencido",v:saludH.vencido,c:"#dc2626"},{l:"Averiado",v:saludH.averiado,c:"#d97706"}].map(x=>(
                                <div key={x.l} style={{display:"flex",alignItems:"center",gap:8,fontSize:12.5}}>
                                  <span style={{width:10,height:10,borderRadius:3,background:x.c}}/>
                                  <span style={{color:"#475569",fontWeight:600}}>{x.l}</span><b style={{color:"#0f172a",marginLeft:2}}>{x.v}</b>
                                  <span style={{color:"#94a3b8",fontSize:11}}>({saludHTot?Math.round(x.v/saludHTot*100):0}%)</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                        <div style={{background:"white",borderRadius:14,padding:"16px 18px",boxShadow:"0 1px 4px rgba(0,0,0,0.06)",border:"1px solid #e2e8f0"}}>
                          <div style={{fontSize:13,fontWeight:800,color:"#0f172a",marginBottom:12,display:"flex",alignItems:"center",gap:6}}><AlertTriangle size={14} color="#dc2626"/> Top descuadres (unidades)</div>
                          {topDH.length===0?<div style={{fontSize:12.5,color:"#94a3b8",padding:"8px 0"}}>Sin diferencias.</div>:topDH.map((a,i)=>{const w=Math.round(Math.abs(a.dif)/topDHMax*100);const neg=a.dif<0;return(
                            <div key={i} style={{marginBottom:10}}>
                              <div style={{display:"flex",justifyContent:"space-between",gap:8,fontSize:12,marginBottom:3}}><span style={{fontWeight:600,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{a.nombre}</span><span style={{fontWeight:800,color:neg?"#dc2626":"#2563eb",whiteSpace:"nowrap"}}>{a.dif>0?"+":""}{a.dif} und</span></div>
                              <div style={{background:"#eef1f5",borderRadius:6,height:8,overflow:"hidden"}}><div style={{width:w+"%",height:"100%",borderRadius:6,background:neg?"#dc2626":"#2563eb"}}/></div>
                            </div>
                          );})}
                        </div>
                      </div>
                      )}

                      {/* Diferencia por categoría */}
                      {catsH.length>0&&(
                        <div style={{background:"white",borderRadius:14,padding:"16px 18px",boxShadow:"0 1px 4px rgba(0,0,0,0.06)",border:"1px solid #e2e8f0",marginBottom:16}}>
                          <div style={{fontSize:13,fontWeight:800,color:"#0f172a",marginBottom:12}}>Diferencia por categoría (unidades)</div>
                          {catsH.map((c,i)=>{const w=Math.round(Math.abs(c.val)/catHMax*100);const neg=c.val<0;return(
                            <div key={i} style={{marginBottom:10}}>
                              <div style={{display:"flex",justifyContent:"space-between",gap:8,fontSize:12,marginBottom:3}}><span style={{fontWeight:600}}>{c.cat}</span><span style={{fontWeight:800,color:neg?"#dc2626":"#2563eb"}}>{c.val>0?"+":""}{c.val} und</span></div>
                              <div style={{background:"#eef1f5",borderRadius:6,height:8,overflow:"hidden"}}><div style={{width:w+"%",height:"100%",borderRadius:6,background:neg?"#dc2626":"#2563eb"}}/></div>
                            </div>
                          );})}
                        </div>
                      )}

                      {/* Tabla de conteos */}
                      <div style={{background:"white",borderRadius:14,overflow:"hidden",boxShadow:"0 1px 4px rgba(0,0,0,0.06)",border:"1px solid #e2e8f0",marginBottom:16}}>
                        <div style={{padding:"14px 18px",borderBottom:"1px solid #f1f5f9",fontWeight:700,fontSize:13,color:"#0f172a"}}>Estado de conteos</div>
                        <div style={{overflowX:"auto"}}>
                          <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
                            <thead><tr style={{background:"#f8fafc"}}>
                              {["Nombre","Ubicación","C1","Estado C1","C2","Estado C2","Estado"].map(h=>(
                                <th key={h} style={{padding:"10px 14px",textAlign:"left",fontWeight:600,color:"#64748b",fontSize:11,whiteSpace:"nowrap"}}>{h}</th>
                              ))}
                            </tr></thead>
                            <tbody>
                              {(inv.conteos||[]).length===0?(
                                <tr><td colSpan={7} style={{padding:"16px 14px",textAlign:"center",color:"#94a3b8",fontSize:12}}>Sin conteos registrados en este inventario.</td></tr>
                              ):(inv.conteos||[]).map((c,i)=>(
                                <tr key={c.id} style={{borderBottom:"1px solid #f1f5f9",background:i%2?"#fafafa":"white"}}>
                                  <td style={{padding:"10px 14px",fontWeight:700,color:"#0f172a"}}>{c.nombre}</td>
                                  <td style={{padding:"10px 14px",fontSize:12,color:"#64748b"}}>{c.locLabel||"—"}</td>
                                  <td style={{padding:"10px 14px",color:"#2563eb",fontWeight:600}}>{c.usuarioC1||"—"}</td>
                                  <td style={{padding:"10px 14px"}}>{c.usuarioC1?<span style={{background:rondaCerrada(c,"C1")?"#f0fdf4":"#fffbeb",color:rondaCerrada(c,"C1")?"#16a34a":"#d97706",borderRadius:6,padding:"2px 8px",fontSize:11,fontWeight:700}}>{rondaCerrada(c,"C1")?"OK":"En curso"}</span>:"—"}</td>
                                  <td style={{padding:"10px 14px",color:"#16a34a",fontWeight:600}}>{c.usuarioC2||"N/A"}</td>
                                  <td style={{padding:"10px 14px"}}>{c.usuarioC2?<span style={{background:rondaCerrada(c,"C2")?"#f0fdf4":"#fffbeb",color:rondaCerrada(c,"C2")?"#16a34a":"#d97706",borderRadius:6,padding:"2px 8px",fontSize:11,fontWeight:700}}>{rondaCerrada(c,"C2")?"OK":"Pendiente"}</span>:"—"}</td>
                                  <td style={{padding:"10px 14px"}}><span style={{background:c.estado==="completado"?"#f0fdf4":c.estado==="diferencia"?"#fef2f2":"#f8fafc",color:c.estado==="completado"?"#16a34a":c.estado==="diferencia"?"#dc2626":"#64748b",borderRadius:6,padding:"3px 8px",fontSize:11,fontWeight:700}}>{c.estado}</span></td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* La historia del inventario: notas con fotos */}
                      <div style={{background:"white",borderRadius:14,padding:"16px 18px",boxShadow:"0 1px 4px rgba(0,0,0,0.06)",border:"1px solid #e2e8f0"}}>
                        <div style={{fontSize:13,fontWeight:800,color:"#0f172a",marginBottom:4,display:"flex",alignItems:"center",gap:6}}><FileText size={14} color="#7c3aed"/> La historia de este inventario</div>
                        <div style={{fontSize:11,color:"#94a3b8",marginBottom:12}}>Fotos y observaciones que dejaron los usuarios durante el inventario.</div>
                        {notasH.length===0?(
                          <div style={{fontSize:12.5,color:"#94a3b8",padding:"8px 0"}}>Sin notas en este inventario.</div>
                        ):(
                          <div style={{display:"flex",flexDirection:"column",gap:12}}>
                            {notasH.map(n=>(
                              <div key={n.id} style={{background:"#f8fafc",borderRadius:10,padding:"12px 14px"}}>
                                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
                                  <div style={{width:30,height:30,borderRadius:99,background:rolC[n.rol]||"#64748b",color:"white",fontSize:12,fontWeight:800,display:"flex",alignItems:"center",justifyContent:"center"}}>{n.usuario[0]}</div>
                                  <div>
                                    <div style={{fontWeight:700,fontSize:13,color:"#0f172a"}}>{n.usuario} <span style={{fontSize:10,color:"#64748b",fontWeight:400,textTransform:"uppercase"}}>{n.rol}</span></div>
                                    <div style={{fontSize:11,color:"#64748b"}}>{n.fecha} · {n.hora}</div>
                                  </div>
                                </div>
                                {n.texto&&<div style={{fontSize:13.5,color:"#374151",lineHeight:1.6}}>{n.texto}</div>}
                                {n.fotos?.length>0&&(
                                  <div style={{display:"flex",flexWrap:"wrap",gap:8,marginTop:8}}>
                                    {n.fotos.map((f,i)=>(
                                      <img key={i} src={f.data} alt={f.name} onClick={()=>window.open(f.data)} style={{width:80,height:80,objectFit:"cover",borderRadius:8,cursor:"pointer",border:"1px solid #e2e8f0",boxShadow:"0 1px 4px rgba(0,0,0,0.08)"}}/>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()
              )}
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={modalSalir}
        onOpenChange={setModalSalir}
        icon={LogOut}
        title="¿Cerrar sesión?"
        description="Vas a salir de TOMFIC. Tus datos ya están guardados en la nube."
        confirmText="Sí, salir"
        onConfirm={logout}
      />
    </div>
  );
}
