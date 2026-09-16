export default function EstBadge({e}){
  const m={BUENO:["#dcfce7","#166534"],VENCIDO:["#fee2e2","#dc2626"],AVERIADO:["#fef3c7","#92400e"],"NO APTO VENTA":["#fee2e2","#991b1b"],BAJAS:["#fef9c3","#854d0e"],"SIN REVISAR":["#f1f5f9","#475569"]};
  const [bg,tc]=m[e]||["#f1f5f9","#475569"];
  return <span style={{background:bg,color:tc,padding:"2px 8px",borderRadius:12,fontSize:11,fontWeight:700}}>{e||"—"}</span>;
}
