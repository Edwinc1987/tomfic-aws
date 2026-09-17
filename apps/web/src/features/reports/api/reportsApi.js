import { apiRequest } from "@/core/network/apiClient";

export const reportsApi={
  inventory:(tenantId,inventoryId)=>apiRequest(`/v1/reports/inventory?inventoryId=${encodeURIComponent(inventoryId)}`,{headers:{"x-tenant-id":tenantId}}),
  templates:(tenantId)=>apiRequest("/v1/reports/templates",{headers:{"x-tenant-id":tenantId}}),
  saveTemplate:(tenantId,name,layout)=>apiRequest("/v1/reports/templates",{method:"POST",headers:{"x-tenant-id":tenantId,"x-user-role":"ADMIN"},body:{name,layout}}),
};
