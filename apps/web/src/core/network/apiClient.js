const apiBase=()=>import.meta.env.VITE_API_URL||"http://localhost:3000";

export const apiRequest=async(path,{method="GET",headers={},body}={})=>{
  const response=await fetch(`${apiBase()}${path}`,{method,headers:{"content-type":"application/json",...headers},body:body===undefined?undefined:JSON.stringify(body)});
  const text=await response.text();
  let data=null;try{data=text?JSON.parse(text):null;}catch(e){data=text;}
  if(!response.ok){const error=new Error(data?.message||`API ${response.status}`);error.status=response.status;error.data=data;throw error;}
  return data;
};
