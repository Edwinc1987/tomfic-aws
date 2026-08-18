import { AlertCircle, Clock } from "lucide-react";
import { diasHasta, fmtFechaCorta, GRACIA_DIAS, AVISO_DIAS } from "@/lib/data";

export default function BannerVencimiento({G}){
  const v=G.tenant&&G.tenant.vence;
  const d=diasHasta(v);
  if(d===null||d>AVISO_DIAS)return null;
  const vencido=d<0;
  const restan=GRACIA_DIAS+d;
  const bg=vencido?"#fef2f2":"#fffbeb", bd=vencido?"#fecaca":"#fde68a", fg=vencido?"#b91c1c":"#b45309";
  const Icono=vencido?AlertCircle:Clock;
  let msg;
  if(!vencido) msg = d===0
    ? <>Tu plan <b>vence hoy</b> ({fmtFechaCorta(v)}). Realiza el pago para no perder el acceso.</>
    : <>Tu plan vence en <b>{d} día{d===1?"":"s"}</b> ({fmtFechaCorta(v)}). Renueva a tiempo para no perder el acceso.</>;
  else msg = <>Tu plan <b>venció el {fmtFechaCorta(v)}</b>. Tu acceso se bloqueará {restan<=0?<b>hoy</b>:<>en <b>{restan} día{restan===1?"":"s"}</b></>} si no se registra el pago. Contacta a tu proveedor.</>;
  return(
    <div style={{display:"flex",alignItems:"center",gap:10,background:bg,border:`1px solid ${bd}`,color:fg,borderRadius:10,padding:"10px 14px",fontSize:13,fontWeight:600,marginBottom:16}}>
      <Icono size={18} style={{flexShrink:0}}/>
      <div>{msg}</div>
    </div>
  );
}
