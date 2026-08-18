import { useState, useEffect } from "react";
import { BarChart2, Users, CheckCircle, Clock, AlertCircle, DollarSign, ChevronRight } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import Section from "@/components/Section";
import { SB, G, TODAY, ISO_HOY, diasHasta, AVISO_DIAS, fmtFechaCorta, card } from "@/lib/data";

export function VResumen({G,showToast,onOpenCliente,onGo}){
  const [pagos,setPagos]=useState([]);
  const [loading,setLoading]=useState(true);
  const cargar=async()=>{
    setLoading(true);
    const {data,error}=await SB.listAllPagos();
    if(error)console.warn("No se pudieron cargar los pagos:",error.message);
    setPagos(data||[]); setLoading(false);
  };
  useEffect(()=>{cargar();/* eslint-disable-next-line */},[]);

  const tenants=G.tenants||[];
  const fmt=(n)=>"$"+Math.round(n||0).toLocaleString("es-CO");
  const conFecha=tenants.filter(t=>t.vence);
  const porVencer=conFecha.filter(t=>{const d=diasHasta(t.vence);return d>=0&&d<=AVISO_DIAS;}).sort((a,b)=>a.vence.localeCompare(b.vence));
  const vencidas=conFecha.filter(t=>diasHasta(t.vence)<0).sort((a,b)=>a.vence.localeCompare(b.vence));
  const activas=tenants.filter(t=>t.activo).length;

  const mesAct=ISO_HOY().slice(0,7);
  const ingresosMes=pagos.filter(p=>(p.fecha||"").slice(0,7)===mesAct).reduce((s,p)=>s+(Number(p.monto)||0),0);
  // Ingresos de los últimos 6 meses (para el mini-gráfico).
  const meses=[];{const d=new Date();for(let i=5;i>=0;i--){const m=new Date(d.getFullYear(),d.getMonth()-i,1);meses.push(m.toISOString().slice(0,7));}}
  const ingXMes=meses.map(m=>({m,total:pagos.filter(p=>(p.fecha||"").slice(0,7)===m).reduce((s,p)=>s+(Number(p.monto)||0),0)}));
  const maxIng=Math.max(1,...ingXMes.map(x=>x.total));
  const NM=["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
  const nombreMes=(ym)=>{const [y,mm]=ym.split("-");return NM[+mm-1]+" '"+y.slice(2);};
  const ultimos=pagos.slice(0,6);
  const tName=(tid)=>{const t=tenants.find(x=>x.id===tid);return t?t.nombre:"—";};

  const Metric=({icon:Ic,label,value,color,sub,onClick,border})=>(
    <button type="button" onClick={onClick} disabled={!onClick}
      style={{textAlign:"left",background:"white",border:`1px solid ${border||"#e2e8f0"}`,borderRadius:14,padding:"16px 18px",flex:"1 1 150px",minWidth:150,boxShadow:"0 1px 3px rgba(0,0,0,0.04)",cursor:onClick?"pointer":"default",transition:"box-shadow .15s,transform .15s"}}
      onMouseEnter={e=>{if(onClick){e.currentTarget.style.boxShadow="0 4px 14px rgba(0,0,0,0.10)";e.currentTarget.style.transform="translateY(-1px)";}}}
      onMouseLeave={e=>{e.currentTarget.style.boxShadow="0 1px 3px rgba(0,0,0,0.04)";e.currentTarget.style.transform="none";}}>
      <div style={{display:"flex",alignItems:"center",gap:7,color:color||"#64748b"}}><Ic size={15}/><span style={{fontSize:11,fontWeight:700,textTransform:"uppercase",letterSpacing:0.5}}>{label}</span>{onClick&&<ChevronRight size={13} style={{marginLeft:"auto",opacity:0.5}}/>}</div>
      <div style={{fontSize:25,fontWeight:800,color:"#0f172a",marginTop:6,lineHeight:1}}>{value}</div>
      {sub&&<div style={{fontSize:11,color:"#64748b",marginTop:4}}>{sub}</div>}
    </button>
  );
  const FilaEmpresa=({t})=>{const d=diasHasta(t.vence);return(
    <button onClick={()=>onOpenCliente&&onOpenCliente(t)} style={{width:"100%",display:"flex",alignItems:"center",justifyContent:"space-between",gap:8,padding:"9px 12px",background:"white",border:"1px solid #f1f5f9",borderRadius:10,cursor:"pointer",textAlign:"left"}}>
      <div style={{minWidth:0}}><div style={{fontWeight:700,fontSize:13,color:"#0f172a",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{t.nombre}</div><div style={{fontSize:11,color:"#64748b"}}>Vence {fmtFechaCorta(t.vence)}</div></div>
      <span style={{flexShrink:0,fontSize:11,fontWeight:700,padding:"3px 9px",borderRadius:20,background:d<0?"#fee2e2":"#fef3c7",color:d<0?"#b91c1c":"#b45309"}}>{d<0?`hace ${Math.abs(d)}d`:d===0?"hoy":`en ${d}d`}</span>
    </button>
  );};

  return(
    <Section>
      <PageHeader label="Panel del Dueño" title="Resumen" icon={BarChart2} subtitle={loading?"Cargando…":`${tenants.length} empresas · ${TODAY()}`}/>
      {/* Tarjetas de métricas */}
      <div style={{display:"flex",flexWrap:"wrap",gap:12,marginBottom:20}}>
        <Metric icon={Users} label="Empresas" value={tenants.length} color="#4f46e5" onClick={()=>onGo&&onGo("clientes",{pago:"todos"})}/>
        <Metric icon={CheckCircle} label="Al día" value={conFecha.filter(t=>diasHasta(t.vence)>AVISO_DIAS).length} color="#16a34a" sub={`${tenants.length-activas} inactivas`} onClick={()=>onGo&&onGo("clientes",{pago:"aldia"})}/>
        <Metric icon={Clock} label="Por vencer" value={porVencer.length} color="#b45309" sub={`próximos ${AVISO_DIAS} días`} border="#fde68a" onClick={()=>onGo&&onGo("clientes",{pago:"porvencer"})}/>
        <Metric icon={AlertCircle} label="Vencidas" value={vencidas.length} color="#dc2626" border="#fecaca" onClick={()=>onGo&&onGo("clientes",{pago:"vencido"})}/>
        <Metric icon={DollarSign} label="Ingresos del mes" value={fmt(ingresosMes)} color="#0891b2" sub={nombreMes(mesAct)} onClick={()=>onGo&&onGo("pagos")}/>
      </div>

      {/* Listas de vencimientos */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))",gap:16,marginBottom:20}}>
        <div style={card}>
          <div style={{fontWeight:800,fontSize:14,color:"#0f172a",marginBottom:12,display:"flex",alignItems:"center",gap:7}}><Clock size={16} color="#b45309"/> Por vencer <span style={{marginLeft:"auto",fontSize:12,color:"#64748b",fontWeight:600}}>{porVencer.length}</span></div>
          <div style={{display:"flex",flexDirection:"column",gap:7,maxHeight:230,overflowY:"auto"}}>
            {porVencer.length===0?<div style={{fontSize:13,color:"#64748b",padding:"8px 0"}}>Nada por vencer en los próximos {AVISO_DIAS} días. 👍</div>:porVencer.map(t=><FilaEmpresa key={t.id} t={t}/>)}
          </div>
        </div>
        <div style={card}>
          <div style={{fontWeight:800,fontSize:14,color:"#0f172a",marginBottom:12,display:"flex",alignItems:"center",gap:7}}><AlertCircle size={16} color="#dc2626"/> Vencidas <span style={{marginLeft:"auto",fontSize:12,color:"#64748b",fontWeight:600}}>{vencidas.length}</span></div>
          <div style={{display:"flex",flexDirection:"column",gap:7,maxHeight:230,overflowY:"auto"}}>
            {vencidas.length===0?<div style={{fontSize:13,color:"#64748b",padding:"8px 0"}}>Ninguna empresa vencida. ✅</div>:vencidas.map(t=><FilaEmpresa key={t.id} t={t}/>)}
          </div>
        </div>
      </div>

      {/* Gráfico de ingresos + últimos pagos */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))",gap:16}}>
        <div style={card}>
          <div style={{fontWeight:800,fontSize:14,color:"#0f172a",marginBottom:16,display:"flex",alignItems:"center",gap:7}}><BarChart2 size={16} color="#4f46e5"/> Ingresos (últimos 6 meses)</div>
          <div style={{display:"flex",alignItems:"flex-end",gap:10,height:130}}>
            {ingXMes.map(x=>(
              <div key={x.m} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"flex-end",gap:6,height:"100%"}}>
                <div style={{fontSize:9,fontWeight:700,color:"#475569",whiteSpace:"nowrap"}}>{x.total?fmt(x.total).replace("$",""):""}</div>
                <div style={{width:"68%",height:`${Math.max(3,(x.total/maxIng)*90)}px`,background:x.total?"linear-gradient(180deg,#6366f1,#4338ca)":"#e2e8f0",borderRadius:"6px 6px 0 0",transition:"height .3s"}}/>
                <div style={{fontSize:10,color:"#64748b",whiteSpace:"nowrap"}}>{nombreMes(x.m)}</div>
              </div>
            ))}
          </div>
        </div>
        <div style={card}>
          <div style={{fontWeight:800,fontSize:14,color:"#0f172a",marginBottom:12,display:"flex",alignItems:"center",gap:7}}><DollarSign size={16} color="#0891b2"/> Últimos pagos <button onClick={()=>onGo&&onGo("pagos")} style={{marginLeft:"auto",fontSize:12,fontWeight:600,color:"#4f46e5",background:"none",border:"none",cursor:"pointer",display:"flex",alignItems:"center",gap:2}}>Ver todos <ChevronRight size={13}/></button></div>
          <div style={{display:"flex",flexDirection:"column",gap:2,maxHeight:200,overflowY:"auto"}}>
            {ultimos.length===0?<div style={{fontSize:13,color:"#64748b",padding:"8px 0"}}>Aún no hay pagos registrados.</div>:ultimos.map(p=>(
              <div key={p.id} style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:8,padding:"7px 4px",borderBottom:"1px solid #f8fafc"}}>
                <div style={{minWidth:0}}><div style={{fontSize:13,fontWeight:600,color:"#0f172a",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{tName(p.tenant_id)}</div><div style={{fontSize:11,color:"#64748b"}}>{fmtFechaCorta(p.fecha)}{p.metodo?" · "+p.metodo:""}</div></div>
                <div style={{fontSize:13,fontWeight:800,color:"#16a34a",whiteSpace:"nowrap"}}>{fmt(p.monto)}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Section>
  );
}
