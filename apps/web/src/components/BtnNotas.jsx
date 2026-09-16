import { useState } from "react";
import { FileText, X, Camera } from "lucide-react";
import { G, ID, TODAY, HOUR } from "@/lib/data";

export default function BtnNotas({G,usuario,rerender,showToast}){
  const [open,setOpen]=useState(false);
  const [texto,setTexto]=useState("");
  const [fotos,setFotos]=useState([]);
  const notasInv=G.notas.filter(n=>n.inventarioId===(G.inventario?.id||""));

  const agregarFoto=(e)=>{
    const files=Array.from(e.target.files);
    files.forEach(file=>{
      const reader=new FileReader();
      reader.onload=(ev)=>setFotos(f=>[...f,{name:file.name,data:ev.target.result}]);
      reader.readAsDataURL(file);
    });
    e.target.value="";
  };

  const guardar=()=>{
    if(!texto.trim()&&fotos.length===0)return showToast("Escribe algo o agrega una foto","err");
    G.notas.push({id:ID(),texto:texto.trim(),fotos:[...fotos],usuario:usuario.nombre,rol:usuario.rol,fecha:TODAY(),hora:HOUR(),inventarioId:G.inventario?.id||""});
    setTexto("");setFotos([]);rerender();showToast("Nota guardada ✓");
  };

  const eliminar=(id)=>{G.notas=G.notas.filter(n=>n.id!==id);rerender();};

  if(!open)return(
    <button onClick={()=>setOpen(true)} style={{position:"fixed",bottom:24,right:24,width:52,height:52,borderRadius:99,background:"linear-gradient(135deg,#2563eb,#7c3aed)",color:"white",border:"none",cursor:"pointer",boxShadow:"0 4px 20px rgba(37,99,235,0.5)",zIndex:900,display:"flex",alignItems:"center",justifyContent:"center"}}>
      <FileText size={22}/>
      {notasInv.length>0&&<span style={{position:"absolute",top:-4,right:-4,background:"#dc2626",color:"white",borderRadius:99,fontSize:9,fontWeight:800,width:18,height:18,display:"flex",alignItems:"center",justifyContent:"center"}}>{notasInv.length}</span>}
    </button>
  );

  return(
    <div style={{position:"fixed",bottom:24,right:24,width:380,maxWidth:"95vw",background:"white",borderRadius:20,boxShadow:"0 20px 60px rgba(0,0,0,0.25)",zIndex:900,overflow:"hidden"}}>
      <div style={{background:"linear-gradient(135deg,#2563eb,#7c3aed)",padding:"14px 18px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div style={{color:"white"}}>
          <div style={{fontWeight:800,fontSize:14,display:"flex",alignItems:"center",gap:6}}><FileText size={14}/> Notas del inventario</div>
          <div style={{fontSize:11,opacity:0.8}}>{G.inventario?.nombre||"Sin inventario activo"}</div>
        </div>
        <button onClick={()=>setOpen(false)} style={{background:"rgba(255,255,255,0.2)",border:"none",color:"white",width:28,height:28,borderRadius:99,cursor:"pointer",fontSize:14,display:"flex",alignItems:"center",justifyContent:"center"}}><X size={15}/></button>
      </div>
      <div style={{maxHeight:220,overflowY:"auto",padding:"10px 14px",display:"flex",flexDirection:"column",gap:8}}>
        {notasInv.length===0&&<div style={{textAlign:"center",color:"#64748b",fontSize:13,padding:"12px 0"}}>Sin notas aún. Agrega la primera.</div>}
        {notasInv.map(n=>(
          <div key={n.id} style={{background:"#f8fafc",borderRadius:10,padding:"10px 12px",border:"1px solid #e2e8f0"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
              <div style={{display:"flex",alignItems:"center",gap:6}}>
                <div style={{width:22,height:22,borderRadius:99,background:n.rol==="admin"?"#1e40af":n.rol==="gerente"?"#7c3aed":"#16a34a",color:"white",fontSize:10,fontWeight:800,display:"flex",alignItems:"center",justifyContent:"center"}}>{n.usuario[0]}</div>
                <span style={{fontSize:11,fontWeight:700,color:"#374151"}}>{n.usuario}</span>
                <span style={{fontSize:10,color:"#64748b"}}>{n.fecha} {n.hora}</span>
              </div>
              {(usuario.rol==="admin"||n.usuario===usuario.nombre)&&<button onClick={()=>eliminar(n.id)} style={{background:"none",border:"none",color:"#dc2626",cursor:"pointer",display:"inline-flex",alignItems:"center"}}><X size={14}/></button>}
            </div>
            {n.texto&&<div style={{fontSize:13,color:"#374151",lineHeight:1.5}}>{n.texto}</div>}
            {n.fotos?.length>0&&(
              <div style={{display:"flex",flexWrap:"wrap",gap:6,marginTop:6}}>
                {n.fotos.map((f,i)=>(
                  <img key={i} src={f.data} alt={f.name} onClick={()=>window.open(f.data)} style={{width:60,height:60,objectFit:"cover",borderRadius:6,cursor:"pointer",border:"1px solid #e2e8f0"}}/>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
      {G.inventario&&(
        <div style={{padding:"10px 14px",borderTop:"1px solid #f1f5f9"}}>
          <textarea value={texto} onChange={e=>setTexto(e.target.value)} placeholder="Escribe una nota u observación…" rows={2}
            style={{width:"100%",padding:"8px 10px",border:"1.5px solid #e2e8f0",borderRadius:8,fontSize:13,resize:"vertical",boxSizing:"border-box",outline:"none",fontFamily:"inherit"}}/>
          {fotos.length>0&&(
            <div style={{display:"flex",flexWrap:"wrap",gap:4,marginTop:6}}>
              {fotos.map((f,i)=>(
                <div key={i} style={{position:"relative"}}>
                  <img src={f.data} alt={f.name} style={{width:48,height:48,objectFit:"cover",borderRadius:6,border:"1px solid #e2e8f0"}}/>
                  <button onClick={()=>setFotos(fs=>fs.filter((_,j)=>j!==i))} style={{position:"absolute",top:-4,right:-4,width:16,height:16,background:"#dc2626",color:"white",border:"none",borderRadius:99,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}><X size={10}/></button>
                </div>
              ))}
            </div>
          )}
          <div style={{display:"flex",gap:8,marginTop:8}}>
            <label style={{padding:"7px 12px",background:"#f1f5f9",border:"1px solid #e2e8f0",borderRadius:8,cursor:"pointer",fontSize:12,fontWeight:600,color:"#374151",display:"inline-flex",alignItems:"center",gap:5}}>
              <Camera size={14}/> Foto<input type="file" accept="image/*" multiple onChange={agregarFoto} style={{display:"none"}}/>
            </label>
            <button onClick={guardar} style={{flex:1,padding:"7px",background:"linear-gradient(135deg,#2563eb,#7c3aed)",color:"white",border:"none",borderRadius:8,fontWeight:700,cursor:"pointer",fontSize:13}}>
              Guardar nota
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
