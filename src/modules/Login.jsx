import { useState } from "react";
import { Eye, EyeOff, AlertTriangle, Cloud, ChevronLeft, Package, Users, BarChart2, Landmark } from "lucide-react";
import { supabase } from "@/lib/data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function Login({lf,setLf,err,onLogin,lastSaved,onBack}){
  const [showPass,setShowPass]=useState(false);
  const [showRecuperar,setShowRecuperar]=useState(false);
  const [recEmail,setRecEmail]=useState("");
  const [recMsg,setRecMsg]=useState(null); // {ok:boolean, txt:string}
  const [recBusy,setRecBusy]=useState(false);
  const enviarRecuperacion=async()=>{
    const email=(recEmail||lf.email||"").trim().toLowerCase();
    setRecMsg(null);
    if(!email||!email.includes("@"))return setRecMsg({ok:false,txt:"Escribe un email válido."});
    setRecBusy(true);
    const {error}=await supabase.auth.resetPasswordForEmail(email,{redirectTo:window.location.origin});
    setRecBusy(false);
    setRecMsg(error
      ?{ok:false,txt:"No se pudo enviar: "+(error.message||"intenta de nuevo")}
      :{ok:true,txt:"Listo ✓ Te enviamos un enlace a "+email+". Revisa tu correo (y la carpeta de spam)."});
  };
  return(
    <div style={{minHeight:"100vh",display:"flex",fontFamily:"system-ui,sans-serif",background:"#0f172a"}}>
      {/* Panel izquierdo — branding (oculto en móvil) */}
      <div className="hidden md:flex" style={{flex:1,flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"3rem",background:"linear-gradient(145deg,#0f172a 0%,#1e3a5f 50%,#0f2d4a 100%)",position:"relative",overflow:"hidden",minWidth:0}}>
        {/* Círculos decorativos */}
        <div style={{position:"absolute",top:-80,left:-80,width:320,height:320,borderRadius:"50%",background:"rgba(37,99,235,0.08)",pointerEvents:"none"}}/>
        <div style={{position:"absolute",bottom:-60,right:-60,width:240,height:240,borderRadius:"50%",background:"rgba(16,163,74,0.07)",pointerEvents:"none"}}/>
        <div style={{position:"absolute",top:"40%",right:-40,width:180,height:180,borderRadius:"50%",background:"rgba(37,99,235,0.05)",pointerEvents:"none"}}/>

        {/* Logo grande — cubo (caja) de marca */}
        <div style={{marginBottom:24,textAlign:"center"}}>
          <Package size={78} color="#2563eb" strokeWidth={1.5}/>
        </div>

        <h1 style={{fontSize:42,fontWeight:900,color:"white",margin:"0 0 8px",letterSpacing:-1.5,textAlign:"center"}}>tomfic</h1>
        <div style={{fontSize:15,color:"#93c5fd",fontWeight:600,marginBottom:8,textAlign:"center",letterSpacing:0.5}}>Tomas físicas de inventario</div>

        {/* Features */}
        <div style={{marginTop:40,display:"flex",flexDirection:"column",gap:12,width:"100%",maxWidth:300}}>
          {[
            {icon:Package,   "txt":"Gestión de conteos por ubicación"},
            {icon:Users,     "txt":"Múltiples capturadores simultáneos"},
            {icon:BarChart2, "txt":"Reportes y diferencias en tiempo real"},
            {icon:Landmark,  "txt":"Historial permanente de inventarios"},
          ].map((f,i)=>(
            <div key={i} style={{display:"flex",alignItems:"center",gap:12,background:"rgba(255,255,255,0.05)",borderRadius:10,padding:"10px 14px",border:"1px solid rgba(255,255,255,0.08)"}}>
              <f.icon size={18} color="#93c5fd" />
              <span style={{fontSize:13,color:"#cbd5e1"}}>{f.txt}</span>
            </div>
          ))}
        </div>

        <div style={{position:"absolute",bottom:20,fontSize:11,color:"#334155",textAlign:"center"}}>
          © 2026 TOMFIC · Sistema de Inventarios
        </div>
      </div>

      {/* Panel derecho — formulario (full-width en móvil) */}
      <div className="w-full md:w-[420px] md:shrink-0" style={{display:"flex",alignItems:"center",justifyContent:"center",padding:"2rem",background:"#f8fafc"}}>
        <div style={{width:"100%",maxWidth:360}}>
          {/* Logo pequeño móvil */}
          <div style={{textAlign:"center",marginBottom:32}}>
            <div style={{display:"inline-flex",alignItems:"center",gap:10,marginBottom:8}}>
              <Package size={30} color="#2563eb"/>
              <span style={{fontSize:24,fontWeight:900,color:"#2563eb",letterSpacing:-1}}>tomfic</span>
            </div>
            <div style={{fontSize:13,color:"#64748b"}}>Bienvenido · Inicia sesión para continuar</div>
          </div>

          {/* Form */}
          <div style={{background:"white",borderRadius:16,padding:"28px 28px",boxShadow:"0 4px 24px rgba(0,0,0,0.08)",border:"1px solid #e2e8f0"}}>
            {onBack&&(
              <button onClick={onBack} className="mb-4 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900 transition-colors">
                <ChevronLeft size={16}/> Volver al inicio
              </button>
            )}
            <div style={{marginBottom:16,background:"#eff6ff",border:"1px solid #bfdbfe",borderRadius:10,padding:"10px 14px",fontSize:12,color:"#1e40af",display:"flex",alignItems:"center",gap:8}}>
              <Cloud size={16} color="#2563eb" />
              <div>
                <b>Conectado a la nube</b><br/>
                <span style={{fontSize:11,color:"#64748b"}}>Datos sincronizados en tiempo real</span>
              </div>
            </div>
            {/* Selector de tipo de acceso */}
            <div className="mb-5 grid grid-cols-2 gap-1 rounded-lg bg-slate-100 p-1">
              {[["equipo","Equipo"],["admin","Administrador"]].map(([v,t])=>(
                <button key={v} type="button" onClick={()=>setLf(p=>({...p,tab:v}))}
                  className={`h-9 rounded-md text-sm font-bold transition-colors ${lf.tab===v?"bg-white text-primary shadow-sm":"text-slate-500 hover:text-slate-700"}`}>
                  {t}
                </button>
              ))}
            </div>

            {lf.tab==="admin"?(
              <div className="mb-5 space-y-1.5">
                <Label>Email</Label>
                <Input type="email" value={lf.email} onChange={e=>setLf(p=>({...p,email:e.target.value}))}
                  placeholder="tucorreo@empresa.com" onKeyDown={e=>e.key==="Enter"&&onLogin()}
                  className="h-11 text-[15px]"/>
              </div>
            ):(
              <>
                <div className="mb-4 space-y-1.5">
                  <Label>Empresa (NIT)</Label>
                  <Input value={lf.empresa} onChange={e=>setLf(p=>({...p,empresa:e.target.value}))}
                    placeholder="NIT de tu empresa" onKeyDown={e=>e.key==="Enter"&&onLogin()}
                    className="h-11 text-[15px]"/>
                </div>
                <div className="mb-5 space-y-1.5">
                  <Label>Usuario</Label>
                  <Input value={lf.user} onChange={e=>setLf(p=>({...p,user:e.target.value}))}
                    placeholder="Tu nombre de usuario" onKeyDown={e=>e.key==="Enter"&&onLogin()}
                    className="h-11 text-[15px]"/>
                </div>
              </>
            )}

            <div className="mb-5 space-y-1.5">
              <Label>Contraseña</Label>
              <div className="relative">
                <Input type={showPass?"text":"password"} value={lf.pass}
                  onChange={e=>setLf(p=>({...p,pass:e.target.value}))}
                  onKeyDown={e=>e.key==="Enter"&&onLogin()}
                  placeholder="••••••••"
                  className="h-11 pr-11 text-[15px]"/>
                <button onClick={()=>setShowPass(v=>!v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                  {showPass?<EyeOff size={18}/>:<Eye size={18}/>}
                </button>
              </div>
            </div>

            {err&&(
              <div style={{background:"#fef2f2",color:"#dc2626",padding:"10px 14px",borderRadius:8,marginBottom:16,fontSize:13,fontWeight:600,display:"flex",alignItems:"center",gap:8}}>
                <AlertTriangle size={14} style={{flexShrink:0}}/> {err}
              </div>
            )}

            <button onClick={onLogin}
              style={{width:"100%",padding:"13px",background:"linear-gradient(135deg,#1e40af,#2563eb)",color:"white",border:"none",borderRadius:10,fontSize:16,fontWeight:700,cursor:"pointer",boxShadow:"0 4px 14px rgba(37,99,235,0.35)",transition:"opacity 0.15s"}}
              onMouseEnter={e=>e.currentTarget.style.opacity="0.92"}
              onMouseLeave={e=>e.currentTarget.style.opacity="1"}>
              Ingresar al sistema →
            </button>

            <div style={{textAlign:"center",marginTop:16}}>
              <button onClick={()=>setShowRecuperar(v=>!v)}
                style={{background:"transparent",border:"none",color:"#2563eb",fontSize:13,cursor:"pointer",textDecoration:"underline"}}>
                ¿Olvidaste tu contraseña?
              </button>
            </div>
            {showRecuperar&&(lf.tab==="admin"?(
              <div style={{marginTop:12,background:"#eff6ff",border:"1px solid #bfdbfe",borderRadius:10,padding:14,fontSize:13,color:"#1e40af",lineHeight:1.6}}>
                <b>Recuperar contraseña</b><br/>
                <span style={{fontSize:12,color:"#475569"}}>Te enviaremos un enlace a tu correo para crear una clave nueva.</span>
                <div style={{marginTop:10}} className="space-y-2">
                  <Input type="email" value={recEmail||lf.email} onChange={e=>setRecEmail(e.target.value)}
                    placeholder="tucorreo@empresa.com" onKeyDown={e=>e.key==="Enter"&&enviarRecuperacion()} className="h-10 bg-white"/>
                  <Button className="w-full h-10" onClick={enviarRecuperacion} disabled={recBusy}>{recBusy?"Enviando…":"Enviarme el correo"}</Button>
                </div>
                {recMsg&&<div style={{marginTop:8,fontSize:12,fontWeight:600,color:recMsg.ok?"#15803d":"#dc2626"}}>{recMsg.txt}</div>}
              </div>
            ):(
              <div style={{marginTop:12,background:"#eff6ff",border:"1px solid #bfdbfe",borderRadius:10,padding:14,fontSize:13,color:"#1e40af",lineHeight:1.6}}>
                <b>¿Olvidaste tu usuario o contraseña?</b><br/>
                <span style={{fontSize:12,color:"#475569"}}>Pídele a tu <b>administrador</b> que te recuerde el usuario o restablezca tu clave desde el módulo <b>Usuarios</b>. Los accesos de equipo se recuperan por el administrador, no por correo.</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
