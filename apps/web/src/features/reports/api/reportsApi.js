import { apiRequest } from "@/core/network/apiClient";

export const reportsApi={
  inventory:(tenantId,inventoryId)=>apiRequest(`/v1/reports/inventory?inventoryId=${encodeURIComponent(inventoryId)}`,{headers:{"x-tenant-id":tenantId}}),
};
