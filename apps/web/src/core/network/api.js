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

  listInventories:async(tid)=>{
    const r=await apiRequest("/v1/inventories",{headers:h(tid)});
    const arr=Array.isArray(r)?r:(r?[r]:[]);
    return arr.map(i=>api._mapInventory(i));
  },
  createInventory:async(tid,body)=>{
    const payload=typeof body==="string"?{name:body}:{name:body.name||body.nombre,tipo:body.tipo,meta:body.meta,id:body.id};
    const r=await apiRequest("/v1/inventories",{method:"POST",headers:h(tid),body:payload});
    return api._mapInventory(r);
  },
  _mapInventory:(i)=>{
    if(!i)return i;
    const meta=i.meta||i.snapshotsJson?.meta||{};
    return{
      id:i.id,
      nombre:i.name||i.nombre||"",
      tipo:i.tipo||meta.tipo||"2conteos",
      obs:meta.obs??i.obs??"",
      fecha:meta.fecha??i.fecha??"",
      apertura:meta.apertura??i.apertura??"",
      horaApertura:meta.horaApertura??meta.hora_apertura??i.horaApertura??i.hora_apertura??"",
      usuarioApertura:meta.usuarioApertura??meta.usuario_apertura??i.usuarioApertura??i.usuario_apertura??"",
      cierre:meta.cierre??i.cierre??i.closedAt??"",
      horaCierre:meta.horaCierre??meta.hora_cierre??i.horaCierre??i.hora_cierre??"",
      usuarioCierre:meta.usuarioCierre??meta.usuario_cierre??i.usuarioCierre??i.usuario_cierre??"",
      status:i.status||"OPEN",
      _raw:i,
    };
  },

  listCounts:async(tid,invId)=>{const r=await apiRequest(`/v1/counts?inventoryId=${encodeURIComponent(invId)}`,{headers:h(tid)});return Array.isArray(r)?r:r?.value||[];},
  createCount:(tid,body)=>apiRequest("/v1/counts",{method:"POST",headers:h(tid),body}),

  listProducts:async(tid,invId,page=1,pageSize=50,search="")=>{
    const size=Math.min(Math.max(1,Number(pageSize)||50),500);
    const r=await apiRequest(`/v1/products?inventoryId=${encodeURIComponent(invId)}&page=${page}&pageSize=${size}&search=${encodeURIComponent(search)}`,{headers:h(tid)});
    return Array.isArray(r)?r:r?.items||[];
  },
  listProductsPage:async(tid,invId,page=1,pageSize=50,search="")=>{
    const size=Math.min(Math.max(1,Number(pageSize)||50),500);
    const r=await apiRequest(`/v1/products?inventoryId=${encodeURIComponent(invId)}&page=${page}&pageSize=${size}&search=${encodeURIComponent(search)}`,{headers:h(tid)});
    return {items:Array.isArray(r)?r:r?.items||[],total:Number(r?.total||0),page:Number(r?.page||page),pageSize:Number(r?.pageSize||size)};
  },
  listAllProducts:async(tid,invId,search="")=>{
    const all=[];
    for(let page=1;page<=100;page++){
      const r=await apiRequest(`/v1/products?inventoryId=${encodeURIComponent(invId)}&page=${page}&pageSize=500&search=${encodeURIComponent(search)}`,{headers:h(tid)});
      const items=Array.isArray(r)?r:r?.items||[];
      all.push(...items);
      const total=Number(r?.total||0);
      if(!items.length||(total>0&&all.length>=total))break;
    }
    return all;
  },

  reportsInventory:(tid,invId)=>apiRequest(`/v1/reports/inventory?inventoryId=${encodeURIComponent(invId)}`,{headers:h(tid)}),
};
