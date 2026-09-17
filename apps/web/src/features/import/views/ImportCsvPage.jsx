import { useEffect, useRef, useState } from "react";
import { apiRequest } from "@/core/network/apiClient";

export function ImportCsvPage({tenantId,inventoryId}){
  const fileRef=useRef(null);
  const [uploading,setUploading]=useState(false);
  const [result,setResult]=useState(null);
  const [error,setError]=useState("");

  const handleUpload=async()=>{
    setError("");setResult(null);
    const file=fileRef.current?.files?.[0];
    if(!file)return setError("Selecciona un archivo CSV");
    if(!file.name.endsWith(".csv"))return setError("El archivo debe ser .csv");
    if(file.size>50*1024*1024)return setError("El archivo no puede superar 50 MB");

    setUploading(true);
    try{
      const{uploadUrl,key}=await apiRequest("/v1/import/csv",{method:"POST",headers:{"x-tenant-id":tenantId,"x-user-role":"ADMIN"},body:{inventoryId,fileName:file.name}});

      await fetch(uploadUrl,{method:"PUT",headers:{"Content-Type":"text/csv"},body:file});

      setResult({key,fileName:file.name,size:(file.size/1024).toFixed(1)+" KB",message:"CSV subido correctamente. Procesando en segundo plano..."});
    }catch(e){
      setError(e.message||"Error subiendo el archivo");
    }finally{setUploading(false);}
  };

  return <section className="space-y-5">
    <header>
      <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">Datos</p>
      <h1 className="text-2xl font-bold text-slate-900">Importar productos CSV</h1>
      <p className="text-sm text-slate-500">Formato: code, barcode, name, balance, cost (encabezados en la primera fila)</p>
    </header>

    <div className="rounded-xl border bg-white p-6 shadow-sm">
      <div className="space-y-4">
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">Archivo CSV</label>
          <input ref={fileRef} type="file" accept=".csv" className="block w-full text-sm text-slate-600 file:mr-4 file:rounded-lg file:border-0 file:bg-indigo-600 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-indigo-500"/>
        </div>

        {error&&<div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
        {result&&<div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">
          <p className="font-semibold">{result.fileName}</p>
          <p>Tamaño: {result.size}</p>
          <p>{result.message}</p>
        </div>}

        <button onClick={handleUpload} disabled={uploading} className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:opacity-50">
          {uploading?"Subiendo...":"Subir y procesar"}
        </button>
      </div>
    </div>

    <div className="rounded-xl border bg-white p-6 shadow-sm">
      <h2 className="mb-3 text-sm font-bold text-slate-900">Formato esperado del CSV</h2>
      <pre className="overflow-x-auto rounded-lg bg-slate-50 p-4 text-xs text-slate-700">{`code,barcode,name,balance,cost
P001,7701234567890,Arroz 1kg,150,2500
P002,7709876543210,Aceite vegetal,80,8500
P003,,Harina de trigo,200,3200`}</pre>
    </div>
  </section>;
}
