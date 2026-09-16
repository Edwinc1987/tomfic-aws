import { apiRequest } from "@/core/network/apiClient";

export const productsApi={
  list:({tenantId,inventoryId,page=1,pageSize=50,search=""})=>apiRequest(`/v1/products?inventoryId=${encodeURIComponent(inventoryId)}&page=${page}&pageSize=${pageSize}&search=${encodeURIComponent(search)}`,{headers:{"x-tenant-id":tenantId}}),
};
