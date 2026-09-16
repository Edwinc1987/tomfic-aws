import { useState, useEffect } from "react";

export default function OfflineBanner(){
  const [online,setOnline]=useState(typeof navigator!=="undefined"?navigator.onLine:true);
  useEffect(()=>{
    const on=()=>setOnline(true), off=()=>setOnline(false);
    window.addEventListener("online",on);
    window.addEventListener("offline",off);
    return ()=>{window.removeEventListener("online",on);window.removeEventListener("offline",off);};
  },[]);
  if(online)return null;
  return(
    <div style={{position:"fixed",bottom:14,left:"50%",transform:"translateX(-50%)",zIndex:9998,background:"#b45309",color:"white",fontSize:12.5,fontWeight:700,padding:"8px 18px",borderRadius:22,boxShadow:"0 4px 16px rgba(0,0,0,0.28)",display:"flex",alignItems:"center",gap:8,pointerEvents:"none",maxWidth:"92vw"}}>
      <span style={{width:8,height:8,borderRadius:99,background:"#fca5a5",display:"inline-block",flexShrink:0}}/>
      Sin conexión — sigues contando; se sincroniza al reconectar
    </div>
  );
}
