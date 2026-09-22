const apiBase=()=>import.meta.env.VITE_API_URL||"http://localhost:3000";
const isLocal=()=>{try{return new URL(apiBase()).hostname==="localhost";}catch(e){return true;}};

let authTokenGetter=null;
let extraHeaders={};
export const setAuthTokenGetter=(fn)=>{authTokenGetter=fn;};
export const setExtraHeaders=(h)=>{extraHeaders={...extraHeaders,...h};};
export const clearExtraHeaders=()=>{extraHeaders={};};

export const teamLogin=async(nit,name,password)=>{
  const base=apiBase();
  const r=await fetch(`${base}/v1/auth/team-login`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({nit,name,password})});
  const data=await r.json();
  if(!r.ok)throw new Error(data?.message||"Credenciales incorrectas");
  return data;
};

export const apiRequest=async(path,{method="GET",headers={},body}={})=>{
  const authHeaders={};
  if(authTokenGetter){
    try{const token=await authTokenGetter();if(token)authHeaders["Authorization"]=`Bearer ${token}`;}catch(e){}
  }
  // En local, enviar headers de dev como fallback (el API los usa cuando AUTH_MODE no es "cognito")
  if(isLocal()&&!authHeaders["Authorization"]){
    authHeaders["x-tenant-id"]=authHeaders["x-tenant-id"]||"tenant-demo-a";
    authHeaders["x-user-id"]=authHeaders["x-user-id"]||"edwin-cognito-sub";
    authHeaders["x-user-role"]=authHeaders["x-user-role"]||"OWNER";
  }
  const response=await fetch(`${apiBase()}${path}`,{method,headers:{"content-type":"application/json",...authHeaders,...extraHeaders,...headers},body:body===undefined?undefined:JSON.stringify(body)});
  const text=await response.text();
  let data=null;try{data=text?JSON.parse(text):null;}catch(e){data=text;}
  if(!response.ok){const error=new Error(data?.message||`API ${response.status}`);error.status=response.status;error.data=data;throw error;}
  return data;
};
