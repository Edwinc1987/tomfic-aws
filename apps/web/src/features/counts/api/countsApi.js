import { apiRequest } from "@/core/network/apiClient";

export const countsApi={
  list:(tenantId,inventoryId)=>apiRequest(`/v1/counts?inventoryId=${encodeURIComponent(inventoryId)}`,{headers:{"x-tenant-id":tenantId}}),
  capture:(tenantId,payload)=>apiRequest("/v1/captures",{method:"POST",headers:{"x-tenant-id":tenantId,"x-user-role":"CAPTURER"},body:payload}),
  captureDetails:(tenantId,captureId)=>apiRequest(`/v1/captures/${encodeURIComponent(captureId)}`,{headers:{"x-tenant-id":tenantId}}),
};
