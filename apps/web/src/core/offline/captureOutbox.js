import { enqueueOperation, listPendingOperations, markOperationDone, markOperationRetry } from "./outbox";

export const queueCapture=({operationId,tenantId,productId,roundId,countId,round,quantity,condition="BUENO"})=>enqueueOperation({
  operationId,
  tenantId,
  type:"CAPTURE",
  payload:{operationId,productId,roundId,countId,round,quantity,condition},
});

const retryAt=(attempts)=>new Date(Date.now()+Math.min(60000,1000*2**attempts).valueOf()).toISOString();

export const flushCaptureOutbox=async({tenantId,apiUrl="http://localhost:3000",headers={}})=>{
  const pending=await listPendingOperations(tenantId);
  let done=0,failed=0;
  for(const operation of pending){
    try{
      const response=await fetch(`${apiUrl}/v1/captures`,{method:"POST",headers:{"content-type":"application/json",...headers},body:JSON.stringify(operation.payload)});
      if(!response.ok)throw new Error(`API ${response.status}: ${await response.text()}`);
      await markOperationDone(operation.operationId);done++;
    }catch(error){
      await markOperationRetry(operation.operationId,error,retryAt(operation.attempts));failed++;
    }
  }
  return{total:pending.length,done,failed};
};
