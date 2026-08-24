import { AlertCircle, Clock } from "lucide-react";
import { diasHasta, fmtFechaCorta, GRACIA_DIAS, AVISO_DIAS } from "@/lib/data";

export default function BannerVencimiento({G}){
  const v=G.tenant&&G.tenant.vence;
  const d=diasHasta(v);
  if(d===null||d>AVISO_DIAS)return null;
  const vencido=d<0;
  const restan=GRACIA_DIAS+d;
   const bg=vencido?"#fff1f2":"#fffbeb", bd=vencido?"#fda4af":"#fcd34d", fg=vencido?"#be123c":"#b45309";
  const Icono=vencido?AlertCircle:Clock;
  let msg;
  if(!vencido) msg = d===0
    ? <>Tu plan <b>vence hoy</b> ({fmtFechaCorta(v)}). Realiza el pago para no perder el acceso.</>
    : <>Tu plan vence en <b>{d} día{d===1?"":"s"}</b> ({fmtFechaCorta(v)}). Renueva a tiempo para no perder el acceso.</>;
  else msg = <>Tu plan <b>venció el {fmtFechaCorta(v)}</b>. Tu acceso se bloqueará {restan<=0?<b>hoy</b>:<>en <b>{restan} día{restan===1?"":"s"}</b></>} si no se registra el pago. Contacta a tu proveedor.</>;
  return(
     <div style={{display:"flex",alignItems:"center",gap:9,background:bg,borderLeft:`4px solid ${bd}`,color:fg,padding:"9px 12px",fontSize:12.5,fontWeight:600,marginBottom:14}}>
       <Icono size={17} style={{flexShrink:0}}/>
       <div style={{lineHeight:1.45}}>{msg}</div>
    </div>
  );
}
