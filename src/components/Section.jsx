export default function Section({titulo,children,subtitle}){
  return(
    <div style={{marginBottom:24}}>
      {titulo&&(
        <div style={{marginBottom:18,paddingBottom:14,borderBottom:"2px solid #f1f5f9"}}>
          <h2 style={{margin:0,fontSize:21,fontWeight:800,color:"#0f172a",letterSpacing:-0.5}}>{titulo}</h2>
          {subtitle&&<div style={{fontSize:12,color:"#64748b",marginTop:4}}>{subtitle}</div>}
        </div>
      )}
      {children}
    </div>
  );
}
