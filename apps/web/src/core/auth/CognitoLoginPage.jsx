import { useState } from "react";
import { useAuth } from "./AuthContext";

export function CognitoLoginPage(){
  const {signIn}=useAuth();
  const [email,setEmail]=useState("");
  const [password,setPassword]=useState("");
  const [error,setError]=useState("");
  const [loading,setLoading]=useState(false);

  const handleSubmit=async(e)=>{
    e.preventDefault();
    setError("");
    setLoading(true);
    try{
      await signIn(email.trim().toLowerCase(),password);
    }catch(err){
      setError(err.message==="Se requiere cambio de contraseña"?"Debes cambiar tu contraseña. Revisa tu correo.":"Email o contraseña incorrectos");
    }finally{setLoading(false);}
  };

  return <div className="flex min-h-screen items-center justify-center bg-slate-900 px-4"><form onSubmit={handleSubmit} className="w-full max-w-sm space-y-5 rounded-2xl border border-slate-700 bg-slate-800 p-8 shadow-2xl"><div className="text-center"><p className="text-xs font-semibold uppercase tracking-wide text-indigo-400">TOMFIC AWS</p><h1 className="mt-1 text-2xl font-bold text-white">Iniciar sesión</h1><p className="mt-1 text-sm text-slate-400">Ingresa con tu cuenta de empresa</p></div>{error&&<div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{error}</div>}<div className="space-y-1.5"><label className="text-sm font-medium text-slate-300">Email</label><input type="email" required autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} className="w-full rounded-lg border border-slate-600 bg-slate-700 px-3 py-2.5 text-sm text-white placeholder-slate-500 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"/></div><div className="space-y-1.5"><label className="text-sm font-medium text-slate-300">Contraseña</label><input type="password" required autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} className="w-full rounded-lg border border-slate-600 bg-slate-700 px-3 py-2.5 text-sm text-white placeholder-slate-500 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"/></div><button disabled={loading} className="w-full rounded-lg bg-indigo-600 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:opacity-50">{loading?"Ingresando…":"Iniciar sesión"}</button><p className="text-center text-xs text-slate-500">Solo usuarios autorizados por el administrador</p></form></div>;
}
