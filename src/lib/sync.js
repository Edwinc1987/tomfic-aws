// ─────────────────────────────────────────
// sync.js — Sincronización a la nube (Supabase).
// Extraído de App.jsx (Fase 2.2 de la modularización).
// ─────────────────────────────────────────
import { G, SB, serConteo, serInv, prodCols, userCols, resetTenantConfig, deserConteo, rememberSelectedInventory, selectInventory } from "@/lib/data";

// --- Snapshot para sincronización por diferencias ---
export const initSnap=()=>{
  rememberSelectedInventory();
  _snap={u:{},c:{},invs:{},hist:{},prods:{},cfgs:{}};
  G.usuarios.forEach(u=>{_snap.u[u.id]=JSON.stringify(userCols(u));});
  G.inventarios.forEach(inv=>{const d=G._inventarioDatos[inv.id]||{};(d.productos||[]).forEach(p=>{_snap.prods[p.id]=JSON.stringify(prodCols(p,inv.id));});});
  G.inventarios.forEach(inv=>{_snap.invs[inv.id]=JSON.stringify(serInv(inv,"abierto"));});
  G.historial.forEach(h=>{_snap.hist[h.id]=JSON.stringify(serInv(h,"cerrado"));});
  G.inventarios.forEach(inv=>{const d=G._inventarioDatos[inv.id]||{conteos:[],capturas:{}};d.conteos.forEach(c=>{_snap.c[c.id]=JSON.stringify(serConteo(c,inv.id,d.capturas));});});
  G.inventarios.forEach(inv=>{const d=G._inventarioDatos[inv.id]||{};_snap.cfgs[inv.id]=JSON.stringify({localizaciones:d.localizaciones||[],ubicacionesTipos:d.ubicacionesTipos||[],localizacionTipos:d.localizacionTipos||[],alertas:d.alertas||[]});});
};

export let _snap={u:{},c:{},invs:{},hist:{},prods:{},cfgs:{}};
let _syncing=false,_pending=false,_syncTimer=null;
let _dirty=false;
let _clearBase=false;
let _busy=false;
let _loadingTenant=false;

export const getBusy=()=>_busy;
export const setBusy=(v)=>{_busy=v;};
export const setClearBase=(v)=>{_clearBase=v;};
export const getDirty=()=>_dirty;
export const getSyncing=()=>_syncing;

const doSync=async()=>{
  if(!G.tenantId||_loadingTenant)return;
  if(typeof navigator!=="undefined"&&!navigator.onLine){_dirty=true;return;}
  if(_syncing){_pending=true;return;}
  _syncing=true;_dirty=false;
  try{
    rememberSelectedInventory();
    const curP={};
    G.inventarios.forEach(inv=>{const d=G._inventarioDatos[inv.id]||{};(d.productos||[]).forEach(p=>{curP[p.id]=prodCols(p,inv.id);});});
    const cambiados=[];for(const id in curP){const s=JSON.stringify(curP[id]);if(_snap.prods[id]!==s)cambiados.push(curP[id]);}
    const eliminados=[];for(const id in _snap.prods){if(!curP[id])eliminados.push(id);}
    // Anti-borrado DEFINITIVO: el sync jamás hace borrados masivos de productos.
    // Eso solo pasa con "Limpiar base" (_clearBase) o desde el import (que ya
    // maneja la nube directamente). Si un desajuste haría desaparecer toda o casi
    // toda la base, se aborta el sync SIN borrar nada — la nube queda intacta.
    if(eliminados.length && !_clearBase && (Object.keys(curP).length===0 || eliminados.length>curP.length)){
      throw new Error("Sync cancelado: borrado masivo de productos evitado (posible desajuste local/nube).");
    }
    if(cambiados.length)await SB.upsertProductosBulk(cambiados);
    if(eliminados.length)await SB.deleteProductosByIds(eliminados);
    for(const id in curP)_snap.prods[id]=JSON.stringify(curP[id]);
    for(const id in _snap.prods){if(!curP[id])delete _snap.prods[id];}
    _clearBase=false;
    const curInv={};
    G.inventarios.forEach(inv=>{curInv[inv.id]=serInv(inv,"abierto");});
    for(const id in curInv){const s=JSON.stringify(curInv[id]);if(_snap.invs[id]!==s){await SB.upsertInventario(curInv[id]);_snap.invs[id]=s;}}
    for(const id in _snap.invs){if(!curInv[id]){await SB.deleteInventario(id);delete _snap.invs[id];}}
    const curH={};G.historial.forEach(h=>{curH[h.id]=serInv(h,"cerrado");});
    for(const id in curH){const s=JSON.stringify(curH[id]);if(_snap.hist[id]!==s){await SB.upsertInventario(curH[id]);_snap.hist[id]=s;}}
    // Un inventario puede pasar de cerrado a abierto sin cambiar de id.
    for(const id in _snap.hist){if(!curH[id]&&!curInv[id]){await SB.deleteInventario(id);delete _snap.hist[id];}}
    const curC={};
    G.inventarios.forEach(inv=>{const d=G._inventarioDatos[inv.id]||{conteos:[],capturas:{}};d.conteos.forEach(c=>{curC[c.id]=serConteo(c,inv.id,d.capturas);});});
    for(const id in curC){const s=JSON.stringify(curC[id]);if(_snap.c[id]!==s){await SB.upsertConteo(curC[id]);_snap.c[id]=s;}}
    for(const id in _snap.c){if(!curC[id]){await SB.deleteConteo(id);delete _snap.c[id];}}
    if(G.tenantId){
      for(const inv of G.inventarios){
        const d=G._inventarioDatos[inv.id]||{};
        const cfgObj={localizaciones:d.localizaciones||[],ubicacionesTipos:d.ubicacionesTipos||[],localizacionTipos:d.localizacionTipos||[],alertas:d.alertas||[],notas:(G.notas||[]).filter(n=>n.inventarioId===inv.id)};
        const cfg=JSON.stringify(cfgObj);
        if(cfg!==_snap.cfgs[inv.id]){await SB.setConfig(`tenant:${G.tenantId}:inventario:${inv.id}:config`,cfgObj);_snap.cfgs[inv.id]=cfg;}
      }
    }
  }catch(e){_dirty=true;console.warn("Error de sincronización:",e);}
  _syncing=false;
  if(_pending){_pending=false;doSync();}
};
export { doSync };

export const scheduleSync=()=>{_dirty=true;if(_syncTimer)clearTimeout(_syncTimer);_syncTimer=setTimeout(doSync,400);};

if(typeof window!=="undefined"){
  window.addEventListener("beforeunload",()=>{try{doSync();}catch(e){}});
  window.addEventListener("online",()=>{if(_dirty){try{doSync();}catch(e){}}});
}

export const loadBootstrap=async()=>{
  G.landingContent=await SB.getConfig("landing");
};

export const setLoadingTenant=(v)=>{_loadingTenant=v;};

export const loadTenantData=async(tid,preferredInvId=null)=>{
 _loadingTenant=true;
 try{
  G.tenantId=tid;
   resetTenantConfig();
   const legacyCfg=await SB.getConfig(`tenant:${tid}:config`);
   const {usuarios,productos,inventarios,conteos}=await SB.loadAll(tid);
  if(usuarios.length)G.usuarios=usuarios;
   const activos=inventarios.filter(i=>i.estado==="abierto").map(i=>({id:i.id,nombre:i.nombre,tipo:i.tipo,obs:i.obs,fecha:i.fecha,apertura:i.apertura,horaApertura:i.hora_apertura,usuarioApertura:i.usuario_apertura}));
   const previo=preferredInvId||G.inventario?.id;
   G.inventarios=activos;
   G._inventarioDatos={};
    const configsTodos=await Promise.all(inventarios.map(inv=>SB.getConfig(`tenant:${tid}:inventario:${inv.id}:config`)));
    const cfgById={};inventarios.forEach((inv,index)=>{cfgById[inv.id]=configsTodos[index]||null;});
    const configs=activos.map((inv,index)=>cfgById[inv.id]||((!index)?legacyCfg:null)||{});
    G.notas=inventarios.flatMap((inv,index)=>{
      if(inv.notas_snapshot){try{return typeof inv.notas_snapshot==="string"?JSON.parse(inv.notas_snapshot):inv.notas_snapshot;}catch(e){}}
      return (cfgById[inv.id]||((!index)?legacyCfg:null)||{}).notas||[];
    });
   activos.forEach((inv,index)=>{
     const cfg=configs[index]||((!index)?legacyCfg:null)||{};
     const filas=productos||[];
     const legacy=filas.filter(p=>!p.inventario_id);
     const propios=filas.filter(p=>p.inventario_id===inv.id);
     const d={productos:propios.length?propios:(index===0?legacy:[]),localizaciones:cfg.localizaciones||[],ubicacionesTipos:cfg.ubicacionesTipos||[],localizacionTipos:cfg.localizacionTipos||[],alertas:cfg.alertas||[],conteos:[],capturas:{}};
     conteos.filter(r=>r.inventario_id===inv.id).forEach(r=>{const{c,caps}=deserConteo(r);d.conteos.push(c);Object.assign(d.capturas,caps);});
     G._inventarioDatos[inv.id]=d;
   });
   const seleccionado=activos.find(i=>i.id===previo)||activos[0]||null;
   G.inventario=null;G.conteos=[];G.capturas={};G.productos=[];G.localizaciones=[];G.ubicacionesTipos=[];G.localizacionTipos=[];G.alertas=[];
   if(seleccionado)selectInventory(seleccionado.id);
  G.historial=inventarios.filter(i=>i.estado==="cerrado").map(i=>{
    const cs=i.conteos_snapshot?JSON.parse(i.conteos_snapshot):[];
    const ca=i.capturas_snapshot?JSON.parse(i.capturas_snapshot):{};
     const pr=i.productos_snapshot?JSON.parse(i.productos_snapshot):[];
     const loc=i.localizaciones_snapshot?(typeof i.localizaciones_snapshot==="string"?JSON.parse(i.localizaciones_snapshot):i.localizaciones_snapshot):[];
     const ubi=i.ubicaciones_tipos_snapshot?(typeof i.ubicaciones_tipos_snapshot==="string"?JSON.parse(i.ubicaciones_tipos_snapshot):i.ubicaciones_tipos_snapshot):[];
      const ltip=i.localizacion_tipos_snapshot?(typeof i.localizacion_tipos_snapshot==="string"?JSON.parse(i.localizacion_tipos_snapshot):i.localizacion_tipos_snapshot):[];
      const notas=i.notas_snapshot?(typeof i.notas_snapshot==="string"?JSON.parse(i.notas_snapshot):i.notas_snapshot):[];
      return {id:i.id,nombre:i.nombre,tipo:i.tipo,obs:i.obs,fecha:i.fecha,apertura:i.apertura,horaApertura:i.hora_apertura,usuarioApertura:i.usuario_apertura,cierre:i.cierre,horaCierre:i.hora_cierre,usuarioCierre:i.usuario_cierre,conteos:cs,capturas:ca,productos:pr,localizaciones:loc,ubicacionesTipos:ubi,localizacionTipos:ltip,notas,totalProductos:pr.length,totalCapturas:Object.keys(ca).length};
  }).sort((a,b)=>(b.cierre||"").localeCompare(a.cierre||""));
  initSnap();
 } finally { _loadingTenant=false; }
};

export const loadTenants=async()=>{const t=await SB.listTenants();G.tenants=t.data||[];};
