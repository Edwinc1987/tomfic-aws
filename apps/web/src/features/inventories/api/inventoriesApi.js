import { apiRequest } from "@/core/network/apiClient";

export const inventoriesApi={
  list:tenantId=>apiRequest("/v1/inventories",{headers:{"x-tenant-id":tenantId}}),
  create:(tenantId,name)=>apiRequest("/v1/inventories",{method:"POST",headers:{"x-tenant-id":tenantId,"x-user-role":"ADMIN"},body:{name}}),
};
