import { useEffect, useState } from "react";
import { flushCaptureOutbox, queueCapture } from "@/core/offline/captureOutbox";

export const useCaptureOutbox=({tenantId,apiUrl,headers={}})=>{
  const [syncing,setSyncing]=useState(false);
  const [lastResult,setLastResult]=useState(null);

  const sync=async()=>{
    if(!tenantId||syncing)return null;
    setSyncing(true);
    try{
      const result=await flushCaptureOutbox({tenantId,apiUrl,headers});
      setLastResult(result);
      return result;
    }finally{setSyncing(false);}
  };

  const capture=async(input)=>{
    const record=await queueCapture({...input,tenantId});
    if(typeof navigator!=="undefined"&&navigator.onLine)await sync();
    return record;
  };

  useEffect(()=>{
    const onOnline=()=>{sync();};
    window.addEventListener("online",onOnline);
    return()=>window.removeEventListener("online",onOnline);
  },[tenantId,apiUrl,JSON.stringify(headers)]);

  return{capture,sync,syncing,lastResult};
};
