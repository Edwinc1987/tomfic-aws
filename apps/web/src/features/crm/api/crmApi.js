import { apiRequest } from "@/core/network/apiClient";

const headers=tenantId=>({"x-tenant-id":tenantId});

export const crmApi={
  contacts:(tenantId)=>apiRequest("/v1/crm/contacts",{headers:headers(tenantId)}),
  createContact:(tenantId,body)=>apiRequest("/v1/crm/contacts",{method:"POST",headers:{...headers(tenantId),"x-user-role":"ADMIN"},body}),
  activities:(tenantId)=>apiRequest("/v1/crm/activities",{headers:headers(tenantId)}),
  createActivity:(tenantId,body)=>apiRequest("/v1/crm/activities",{method:"POST",headers:{...headers(tenantId),"x-user-role":"ADMIN"},body}),
};
