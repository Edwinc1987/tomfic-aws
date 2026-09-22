import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'
import { lazy, Suspense } from 'react'

const App=lazy(()=>import('./App.jsx'));

const fallback=<div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"#0f172a"}}><div className="text-center text-white"><div className="text-3xl font-black mb-2">tomfic</div><div className="text-sm text-slate-400">Cargando...</div></div></div>;

ReactDOM.createRoot(document.getElementById('root')).render(<Suspense fallback={fallback}><App/></Suspense>)
