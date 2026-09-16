import { useState } from "react";
import { Eye, EyeOff, AlertTriangle, Key } from "lucide-react";
import { authService } from "@/core/auth/authService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function SetNewPassword({onDone}){
  const [p1,setP1]=useState("");
  const [p2,setP2]=useState("");
  const [show,setShow]=useState(false);
  const [busy,setBusy]=useState(false);
  const [err,setErr]=useState("");
  const guardar=async()=>{
    setErr("");
    if(p1.length<6)return setErr("La contraseña debe tener al menos 6 caracteres.");
    if(p1!==p2)return setErr("Las contraseñas no coinciden.");
    setBusy(true);
    const {error}=await authService.updatePassword(p1);
    if(error){setBusy(false);return setErr(error.message||"No se pudo actualizar la contraseña.");}
    try{await authService.signOut();}catch(e){}
    setBusy(false);
    onDone&&onDone();
  };
  return(
    <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"#0f172a",fontFamily:"system-ui,sans-serif",padding:"1.5rem"}}>
      <div style={{width:"100%",maxWidth:380,background:"white",borderRadius:16,padding:28,boxShadow:"0 4px 24px rgba(0,0,0,0.25)"}}>
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:6}}>
          <div style={{width:34,height:34,background:"linear-gradient(135deg,#2563eb,#0891b2)",borderRadius:9,display:"flex",alignItems:"center",justifyContent:"center"}}><Key size={17} color="white"/></div>
          <span style={{fontSize:20,fontWeight:900,color:"#0f172a"}}>Nueva contraseña</span>
        </div>
        <p style={{fontSize:13,color:"#64748b",marginBottom:18}}>Escribe tu nueva contraseña para tu cuenta TOMFIC.</p>
        <div className="space-y-3">
          <div className="space-y-1.5"><Label>Nueva contraseña</Label>
            <div className="relative">
              <Input type={show?"text":"password"} value={p1} onChange={e=>setP1(e.target.value)} placeholder="mín. 6 caracteres" className="h-11 pr-11"/>
              <button onClick={()=>setShow(v=>!v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">{show?<EyeOff size={18}/>:<Eye size={18}/>}</button>
            </div>
          </div>
          <div className="space-y-1.5"><Label>Confirmar contraseña</Label>
            <Input type={show?"text":"password"} value={p2} onChange={e=>setP2(e.target.value)} onKeyDown={e=>e.key==="Enter"&&guardar()} placeholder="repite la contraseña" className="h-11"/>
          </div>
          {err&&<div style={{background:"#fef2f2",color:"#dc2626",padding:"10px 14px",borderRadius:8,fontSize:13,fontWeight:600,display:"flex",alignItems:"center",gap:8}}><AlertTriangle size={14}/> {err}</div>}
          <Button className="w-full h-11" onClick={guardar} disabled={busy}>{busy?"Guardando…":<><Key size={15}/> Guardar contraseña</>}</Button>
        </div>
      </div>
    </div>
  );
}
