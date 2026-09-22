import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";

export default function CameraScanner({onDetect,onClose,color="#2563eb"}){
  const [err,setErr]=useState("");
  const [cargando,setCargando]=useState(true);
  const scannerRef=useRef(null);
  const containerId="camscanner-"+Math.random().toString(36).slice(2,8);

  useEffect(()=>{
    letactivo=true;
    let scanner=null;
    (async()=>{
      try{
        scanner=new Html5Qrcode(containerId);
        scannerRef.current=scanner;
        setCargando(false);
        await scanner.start(
          {facingMode:"environment"},
          {fps:10,qrbox:{width:280,height:160},aspectRatio:1.333},
          (decodedText)=>{
            if(!activo)return;
            activo=false;
            try{if(navigator.vibrate)navigator.vibrate(120);}catch(e){}
            scanner.stop().catch(()=>{});
            onDetect(decodedText);
          },
          ()=>{}
        );
      }catch(e){
        if(activo){
          setCargando(false);
          setErr(e?.message||"No se pudo abrir la cámara. Revisa los permisos del navegador.");
        }
      }
    })();
    return ()=>{
      activo=false;
      try{scannerRef.current?.stop?.();}catch(e){}
      try{scannerRef.current?.clear?.();}catch(e){}
    };
  },[]);

  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.92)",zIndex:2000,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:16}}>
      <div style={{position:"relative",width:"100%",maxWidth:400,background:"#000",borderRadius:16,overflow:"hidden",aspectRatio:"4/3"}}>
        <div id={containerId} style={{width:"100%",height:"100%"}}/>
        {!cargando&&!err&&<div style={{position:"absolute",top:"30%",bottom:"30%",left:"10%",right:"10%",border:`3px solid ${color}`,borderRadius:12,boxShadow:"0 0 0 9999px rgba(0,0,0,0.3)",pointerEvents:"none"}}/>}
        {cargando&&<div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",color:"white",fontSize:14}}>Iniciando cámara…</div>}
      </div>
      <div style={{color:err?"#fca5a5":"white",marginTop:16,fontSize:14,fontWeight:600,textAlign:"center",maxWidth:340,lineHeight:1.5}}>{err||"Centra el código de barras o QR dentro del recuadro"}</div>
      <button onClick={onClose} style={{marginTop:18,padding:"12px 28px",background:"white",color:"#0f172a",border:"none",borderRadius:10,fontWeight:700,fontSize:14,cursor:"pointer"}}>Cancelar</button>
    </div>
  );
}
