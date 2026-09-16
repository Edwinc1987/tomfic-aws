import Dexie from "dexie";

export const offlineDb=new Dexie("tomfic_aws_offline_v1");
offlineDb.version(1).stores({
  outbox:"operationId,tenantId,status,createdAt,nextAttemptAt",
});

export const enqueueOperation=async(operation)=>{
  const record={
    operationId:operation.operationId,
    tenantId:operation.tenantId,
    type:operation.type,
    payload:operation.payload,
    status:"PENDING",
    attempts:0,
    createdAt:operation.createdAt||new Date().toISOString(),
    nextAttemptAt:null,
    lastError:null,
  };
  await offlineDb.outbox.put(record);
  return record;
};

export const listPendingOperations=async(tenantId)=>offlineDb.outbox
  .where("tenantId").equals(tenantId)
  .and(operation=>operation.status==="PENDING"||operation.status==="RETRY")
  .sortBy("createdAt");

export const markOperationRetry=async(operationId,error,nextAttemptAt)=>{
  const current=await offlineDb.outbox.get(operationId);
  if(!current)return 0;
  return offlineDb.outbox.update(operationId,{status:"RETRY",attempts:current.attempts+1,lastError:String(error),nextAttemptAt});
};

export const markOperationDone=async(operationId)=>offlineDb.outbox.update(operationId,{status:"DONE",lastError:null,nextAttemptAt:null});
