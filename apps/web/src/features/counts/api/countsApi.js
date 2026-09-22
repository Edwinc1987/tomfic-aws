import { apiRequest } from "@/core/network/apiClient";

export const countsApi={
  list:(tenantId,inventoryId)=>apiRequest(`/v1/counts?inventoryId=${encodeURIComponent(inventoryId)}`,{headers:{"x-tenant-id":tenantId}}),
  create:(tenantId,body)=>apiRequest("/v1/counts",{method:"POST",headers:{"x-tenant-id":tenantId,"x-user-role":"ADMIN"},body}),
  captures:(tenantId,countId)=>apiRequest(`/v1/captures/by-count/${encodeURIComponent(countId)}`,{headers:{"x-tenant-id":tenantId}}),
  capture:(tenantId,payload)=>apiRequest("/v1/captures",{method:"POST",headers:{"x-tenant-id":tenantId,"x-user-role":"CAPTURER"},body:payload}),
  captureDetails:(tenantId,captureId)=>apiRequest(`/v1/captures/${encodeURIComponent(captureId)}`,{headers:{"x-tenant-id":tenantId}}),
};
