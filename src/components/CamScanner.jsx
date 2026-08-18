import { useState, useRef, useEffect } from "react";
import { BrowserMultiFormatReader, DecodeHintType, BarcodeFormat } from "@zxing/library";

export default function CamScanner({onDetect,onClose,color="#2563eb"}){
  const videoRef=useRef(null);
  const readerRef=useRef(null);
  const lastRef=useRef({code:null,count:0});
  const [err,setErr]=useState("");
  const [cargando,setCargando]=useState(true);
  useEffect(()=>{
    let activo=true;
    (async()=>{
      try{
        const hints=new Map();
        hints.set(DecodeHintType.POSSIBLE_FORMATS,[BarcodeFormat.EAN_13,BarcodeFormat.EAN_8,BarcodeFormat.UPC_A,BarcodeFormat.UPC_E,BarcodeFormat.CODE_128,BarcodeFormat.CODE_39,BarcodeFormat.ITF]);
        hints.set(DecodeHintType.TRY_HARDER,true);
        const reader=new BrowserMultiFormatReader(hints,300);
        readerRef.current=reader;setCargando(false);
        await reader.decodeFromConstraints({video:{facingMode:{ideal:"environment"}}},videoRef.current,(result)=>{
          if(!result||!activo)return;
          const text=result.getText();const L=lastRef.current;
          if(text===L.code){L.count++;}else{L.code=text;L.count=1;}
          if(L.count>=2){activo=false;try{if(navigator.vibrate)navigator.vibrate(120);}catch(e){}try{reader.reset();}catch(e){}onDetect(text);}
        });
      }catch(e){if(activo){setCargando(false);setErr(e&&e.message?e.message:"No se pudo abrir la cámara. Revisa los permisos del navegador.");}}
    })();
    return ()=>{activo=false;try{readerRef.current&&readerRef.current.reset();}catch(e){}};
  },[]);
  return(<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.88)",zIndex:2000,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:16}}>
    <div style={{position:"relative",width:"100%",maxWidth:420,background:"#000",borderRadius:16,overflow:"hidden",aspectRatio:"3/4"}}>
      <video ref={videoRef} muted playsInline style={{width:"100%",height:"100%",objectFit:"cover",display:"block"}}/>
      {!cargando&&!err&&<div style={{position:"absolute",top:"34%",bottom:"34%",left:"8%",right:"8%",border:`3px solid ${color}`,borderRadius:12,boxShadow:"0 0 0 9999px rgba(0,0,0,0.25)"}}/>}
      {cargando&&<div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",color:"white",fontSize:14}}>Iniciando cámara…</div>}
    </div>
    <div style={{color:err?"#fca5a5":"white",marginTop:16,fontSize:14,fontWeight:600,textAlign:"center",maxWidth:340,lineHeight:1.5}}>{err||"Centra el código dentro del recuadro y mantén firme el celular"}</div>
    <button onClick={onClose} style={{marginTop:18,padding:"12px 34px",background:"white",color:"#0f172a",border:"none",borderRadius:10,fontWeight:700,fontSize:15,cursor:"pointer"}}>Cancelar</button>
  </div>);
}
