const apiBase=()=>import.meta.env.VITE_API_URL||"http://localhost:3000";

let authTokenGetter=null;
export const setAuthTokenGetter=(fn)=>{authTokenGetter=fn;};

export const apiRequest=async(path,{method="GET",headers={},body}={})=>{
  const authHeaders={};
  if(authTokenGetter){
    try{const token=await authTokenGetter();if(token)authHeaders["Authorization"]=`Bearer ${token}`;}catch(e){}
  }
  const response=await fetch(`${apiBase()}${path}`,{method,headers:{"content-type":"application/json",...authHeaders,...headers},body:body===undefined?undefined:JSON.stringify(body)});
  const text=await response.text();
  let data=null;try{data=text?JSON.parse(text):null;}catch(e){data=text;}
  if(!response.ok){const error=new Error(data?.message||`API ${response.status}`);error.status=response.status;error.data=data;throw error;}
  return data;
};
