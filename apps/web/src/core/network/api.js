import { apiRequest } from "./apiClient";

const h=(tenantId,role)=>({"x-tenant-id":tenantId,"x-user-role":role||"ADMIN"});

export const api={
  me:()=>apiRequest("/v1/users/me"),
  loadUsuarios:(tid)=>apiRequest("/v1/users",{headers:h(tid)}),
  createUsuario:(tid,body)=>apiRequest("/v1/users",{method:"POST",headers:h(tid),body}),
  updateUsuario:(tid,id,body)=>apiRequest(`/v1/users/${id}`,{method:"PATCH",headers:h(tid),body}),
  deleteUsuario:(tid,id)=>apiRequest(`/v1/users/${id}`,{method:"DELETE",headers:h(tid)}),

  listTenants:()=>apiRequest("/v1/tenants"),
  getTenant:(tid)=>apiRequest(`/v1/tenants/${tid}`),
  updateTenant:(tid,body)=>apiRequest(`/v1/tenants/${tid}`,{method:"PATCH",headers:h(tid,"OWNER"),body}),
  setTenantActive:(tid,active)=>apiRequest(`/v1/tenants/${tid}/active`,{method:"PATCH",headers:h(tid,"OWNER"),body:{active}}),
  deleteTenant:(tid)=>apiRequest(`/v1/tenants/${tid}`,{method:"DELETE",headers:h(tid,"OWNER")}),
  listPagos:(tid)=>apiRequest(`/v1/tenants/${tid}/payments`),
  listAllPagos:async()=>{
    const tenants=await apiRequest("/v1/tenants");
    const all=[];
    for(const t of tenants){const p=await apiRequest(`/v1/tenants/${t.id}/payments`);all.push(...(p||[]));}
    return all;
  },
  insertPago:(tid,body)=>apiRequest(`/v1/tenants/${tid}/payments`,{method:"POST",headers:h(tid),body}),
  deletePago:(tid,pid)=>apiRequest(`/v1/tenants/${tid}/payments/${pid}`,{method:"DELETE",headers:h(tid)}),

  dashboard:(tid)=>apiRequest("/v1/crm/dashboard",{headers:h(tid,"OWNER")}),
  profile:(tid)=>apiRequest("/v1/crm/profile",{headers:h(tid)}),
  contacts:(tid)=>apiRequest("/v1/crm/contacts",{headers:h(tid)}),
  createContact:(tid,body)=>apiRequest("/v1/crm/contacts",{method:"POST",headers:h(tid),body}),
  activities:(tid)=>apiRequest("/v1/crm/activities",{headers:h(tid)}),
  createActivity:(tid,body)=>apiRequest("/v1/crm/activities",{method:"POST",headers:h(tid),body}),
  payments:(tid)=>apiRequest("/v1/crm/payments",{headers:h(tid)}),
  createPayment:(tid,body)=>apiRequest("/v1/crm/payments",{method:"POST",headers:h(tid),body}),
  tickets:(tid)=>apiRequest("/v1/crm/tickets",{headers:h(tid)}),
  createTicket:(tid,body)=>apiRequest("/v1/crm/tickets",{method:"POST",headers:h(tid),body}),
  crmHealth:(tid)=>apiRequest("/v1/crm/health",{headers:h(tid)}),
  changeStage:(tid,stage)=>apiRequest("/v1/crm/profile/stage",{method:"POST",headers:h(tid),body:{stage}}),

  listInventories:async(tid)=>{const r=await apiRequest("/v1/inventories",{headers:h(tid)});return Array.isArray(r)?r:r?[r]:[];},
  createInventory:(tid,name)=>apiRequest("/v1/inventories",{method:"POST",headers:h(tid),body:{name}}),

  listCounts:async(tid,invId)=>{const r=await apiRequest(`/v1/counts?inventoryId=${encodeURIComponent(invId)}`,{headers:h(tid)});return Array.isArray(r)?r:r?.value||[];},
  createCount:(tid,body)=>apiRequest("/v1/counts",{method:"POST",headers:h(tid),body}),

  listProducts:async(tid,invId,page=1,pageSize=50,search="")=>{
    const r=await apiRequest(`/v1/products?inventoryId=${encodeURIComponent(invId)}&page=${page}&pageSize=${pageSize}&search=${encodeURIComponent(search)}`,{headers:h(tid)});
    return Array.isArray(r)?r:r?.items||[];
  },

  reportsInventory:(tid,invId)=>apiRequest(`/v1/reports/inventory?inventoryId=${encodeURIComponent(invId)}`,{headers:h(tid)}),
};
