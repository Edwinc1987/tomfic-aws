import { apiRequest } from "@/core/network/apiClient";

const headers=tenantId=>({"x-tenant-id":tenantId});

export const crmApi={
  dashboard:(tenantId,role="OWNER")=>apiRequest("/v1/crm/dashboard",{headers:{...headers(tenantId),"x-user-role":role}}),
  profile:(tenantId)=>apiRequest("/v1/crm/profile",{headers:headers(tenantId)}),
  changeStage:(tenantId,stage)=>apiRequest("/v1/crm/profile/stage",{method:"POST",headers:{...headers(tenantId),"x-user-role":"ADMIN"},body:{stage}}),
  contacts:(tenantId)=>apiRequest("/v1/crm/contacts",{headers:headers(tenantId)}),
  createContact:(tenantId,body)=>apiRequest("/v1/crm/contacts",{method:"POST",headers:{...headers(tenantId),"x-user-role":"ADMIN"},body}),
  activities:(tenantId)=>apiRequest("/v1/crm/activities",{headers:headers(tenantId)}),
  createActivity:(tenantId,body)=>apiRequest("/v1/crm/activities",{method:"POST",headers:{...headers(tenantId),"x-user-role":"ADMIN"},body}),
  payments:(tenantId)=>apiRequest("/v1/crm/payments",{headers:headers(tenantId)}),
  createPayment:(tenantId,body)=>apiRequest("/v1/crm/payments",{method:"POST",headers:{...headers(tenantId),"x-user-role":"ADMIN"},body}),
  tickets:(tenantId)=>apiRequest("/v1/crm/tickets",{headers:headers(tenantId)}),
  createTicket:(tenantId,body)=>apiRequest("/v1/crm/tickets",{method:"POST",headers:{...headers(tenantId),"x-user-role":"ADMIN"},body}),
  health:(tenantId)=>apiRequest("/v1/crm/health",{headers:headers(tenantId)}),
};
