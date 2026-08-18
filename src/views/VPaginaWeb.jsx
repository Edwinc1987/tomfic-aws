import { useState } from "react";
import { FileText, Pencil, Bell, Eye, Plus, Trash2, CheckCircle, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import Section from "@/components/Section";
import Ta from "@/components/Ta";
import ColorField from "@/components/ColorField";
import Landing from "@/Landing";
import { mergeLanding } from "@/landingContent";
import { SB } from "@/lib/data";

export function VPaginaWeb({G,rerender,showToast}){
  const [form,setForm]=useState(()=>mergeLanding(G.landingContent));
  const [saving,setSaving]=useState(false);
  const [tab,setTab]=useState("contenido");

  const setHero=(k,v)=>setForm(f=>({...f,hero:{...f.hero,[k]:v}}));
  const setAbout=(k,v)=>setForm(f=>({...f,about:{...f.about,[k]:v}}));
  const setContacto=(k,v)=>setForm(f=>({...f,contacto:{...f.contacto,[k]:v}}));
  const setFeature=(i,k,v)=>setForm(f=>({...f,features:f.features.map((x,j)=>j===i?{...x,[k]:v}:x)}));
  const setStep=(i,k,v)=>setForm(f=>({...f,steps:f.steps.map((x,j)=>j===i?{...x,[k]:v}:x)}));
  const setPlan=(i,k,v)=>setForm(f=>({...f,planes:f.planes.map((x,j)=>j===i?{...x,[k]:v}:x)}));
  const setCaso=(i,k,v)=>setForm(f=>({...f,casos:(f.casos||[]).map((x,j)=>j===i?{...x,[k]:v}:x)}));
  const addCaso=()=>setForm(f=>({...f,casos:[...(f.casos||[]),{nombre:"",empresa:"",historia:""}]}));
  const delCaso=(i)=>setForm(f=>({...f,casos:(f.casos||[]).filter((_,j)=>j!==i)}));
  const setArticulo=(i,k,v)=>setForm(f=>({...f,articulos:(f.articulos||[]).map((x,j)=>j===i?{...x,[k]:v}:x)}));
  const addArticulo=()=>setForm(f=>({...f,articulos:[...(f.articulos||[]),{titulo:"",fecha:"",texto:""}]}));
  const delArticulo=(i)=>setForm(f=>({...f,articulos:(f.articulos||[]).filter((_,j)=>j!==i)}));
  const setTheme=(k,v)=>setForm(f=>({...f,theme:{...f.theme,[k]:v}}));
  const setPromo=(k,v)=>setForm(f=>({...f,promo:{...f.promo,[k]:v}}));
  const TABS=[["contenido","Contenido",FileText],["colores","Colores",Pencil],["promociones","Promociones",Bell],["preview","Vista previa",Eye]];

  const guardar=async()=>{
    setSaving(true);
    const clean={...form,planes:form.planes.map(p=>({...p,items:(p.items||[]).map(x=>x.trim()).filter(Boolean)}))};
    try{
      const {error}=await SB.setConfig("landing",clean);
      if(error)throw error;
      G.landingContent=clean;rerender();
      showToast("Página web actualizada y publicada ✓");
    }catch(e){
      console.warn("Error guardando landing:",e);
      showToast("No se pudo guardar. Verifica que exista la tabla 'app_config' en Supabase.","err");
    }
    setSaving(false);
  };

  const BtnGuardar=({className=""})=>(
    <Button onClick={guardar} disabled={saving} className={className}>
      {saving?"Guardando…":<><CheckCircle size={16}/> Guardar y publicar</>}
    </Button>
  );

  return(
    <Section>
      <PageHeader
        label="Web pública"
        title="Página web"
        icon={Globe}
        subtitle="Edita tu web y publícala cuando quieras."
        right={<BtnGuardar className="bg-white text-blue-700 hover:bg-blue-50"/>}
      />

      <div className="flex flex-wrap gap-1 mb-5 border-b border-slate-200">
        {TABS.map(([id,label,Ic])=>{const active=tab===id;return(
          <button key={id} onClick={()=>setTab(id)}
            className={`flex items-center gap-1.5 px-3.5 py-2 text-sm -mb-px border-b-2 transition-colors ${active?"border-indigo-600 text-indigo-700 font-semibold":"border-transparent text-slate-500 hover:text-slate-800"}`}>
            <Ic size={15}/> {label}
          </button>
        );})}
      </div>

      {tab==="contenido"&&(<>
      {/* HERO */}
      <Card className="p-5 mb-4">
        <div className="font-bold text-sm text-slate-900 mb-3">Encabezado principal (Hero)</div>
        <div className="space-y-3">
          <div className="space-y-1.5"><Label>Etiqueta superior</Label><Input value={form.hero.badge} onChange={e=>setHero("badge",e.target.value)}/></div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Título</Label><Input value={form.hero.title} onChange={e=>setHero("title",e.target.value)}/></div>
            <div className="space-y-1.5"><Label>Título (palabra resaltada)</Label><Input value={form.hero.titleHighlight} onChange={e=>setHero("titleHighlight",e.target.value)}/></div>
          </div>
          <div className="space-y-1.5"><Label>Subtítulo</Label><Ta value={form.hero.subtitle} onChange={e=>setHero("subtitle",e.target.value)} rows={2}/></div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Texto botón principal</Label><Input value={form.hero.ctaPrimary} onChange={e=>setHero("ctaPrimary",e.target.value)}/></div>
            <div className="space-y-1.5"><Label>Texto botón secundario</Label><Input value={form.hero.ctaSecondary} onChange={e=>setHero("ctaSecondary",e.target.value)}/></div>
          </div>
        </div>
      </Card>

      {/* QUIÉNES SOMOS */}
      <Card className="p-5 mb-4">
        <div className="font-bold text-sm text-slate-900 mb-3">Quiénes somos</div>
        <div className="space-y-3">
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Etiqueta</Label><Input value={form.about.label} onChange={e=>setAbout("label",e.target.value)}/></div>
            <div className="space-y-1.5"><Label>Título</Label><Input value={form.about.title} onChange={e=>setAbout("title",e.target.value)}/></div>
          </div>
          <div className="space-y-1.5"><Label>Párrafo 1</Label><Ta value={form.about.p1} onChange={e=>setAbout("p1",e.target.value)} rows={3}/></div>
          <div className="space-y-1.5"><Label>Párrafo 2</Label><Ta value={form.about.p2} onChange={e=>setAbout("p2",e.target.value)} rows={2}/></div>
        </div>
      </Card>

      {/* CARACTERÍSTICAS */}
      <Card className="p-5 mb-4">
        <div className="font-bold text-sm text-slate-900 mb-3">Características (6)</div>
        <div className="space-y-4">
          {form.features.map((f,i)=>(
            <div key={i} className="grid sm:grid-cols-[200px_1fr] gap-3 items-start border-b last:border-0 pb-4 last:pb-0">
              <div className="space-y-1.5"><Label>Título {i+1}</Label><Input value={f.title} onChange={e=>setFeature(i,"title",e.target.value)}/></div>
              <div className="space-y-1.5"><Label>Descripción</Label><Ta value={f.desc} onChange={e=>setFeature(i,"desc",e.target.value)} rows={2}/></div>
            </div>
          ))}
        </div>
      </Card>

      {/* CÓMO FUNCIONA */}
      <Card className="p-5 mb-4">
        <div className="font-bold text-sm text-slate-900 mb-3">Cómo funciona (3 pasos)</div>
        <div className="space-y-4">
          {form.steps.map((s,i)=>(
            <div key={i} className="grid sm:grid-cols-[200px_1fr] gap-3 items-start border-b last:border-0 pb-4 last:pb-0">
              <div className="space-y-1.5"><Label>Paso {i+1}</Label><Input value={s.title} onChange={e=>setStep(i,"title",e.target.value)}/></div>
              <div className="space-y-1.5"><Label>Descripción</Label><Ta value={s.desc} onChange={e=>setStep(i,"desc",e.target.value)} rows={2}/></div>
            </div>
          ))}
        </div>
      </Card>

      {/* CASOS DE ÉXITO */}
      <Card className="p-5 mb-4">
        <div className="flex items-center justify-between mb-3">
          <div className="font-bold text-sm text-slate-900">Casos de éxito ({(form.casos||[]).length})</div>
          <Button size="sm" variant="outline" onClick={addCaso}><Plus size={14}/> Agregar</Button>
        </div>
        <div className="text-xs text-muted-foreground mb-3">Historias de clientes que contrataron el servicio.</div>
        <div className="space-y-4">
          {(form.casos||[]).map((cs,i)=>(
            <div key={i} className="rounded-xl border border-slate-200 p-4 space-y-3">
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="space-y-1.5"><Label>Nombre</Label><Input value={cs.nombre} onChange={e=>setCaso(i,"nombre",e.target.value)}/></div>
                <div className="space-y-1.5"><Label>Empresa</Label><Input value={cs.empresa} onChange={e=>setCaso(i,"empresa",e.target.value)}/></div>
              </div>
              <div className="space-y-1.5"><Label>Historia</Label><Ta value={cs.historia} onChange={e=>setCaso(i,"historia",e.target.value)} rows={3}/></div>
              <Button size="sm" variant="outline" className="text-destructive border-red-200 hover:bg-red-50 hover:text-destructive" onClick={()=>delCaso(i)}><Trash2 size={13}/> Quitar</Button>
            </div>
          ))}
          {(form.casos||[]).length===0&&<div className="text-xs text-muted-foreground">Sin casos. Agrega el primero con el botón de arriba.</div>}
        </div>
      </Card>

      {/* ARTÍCULOS */}
      <Card className="p-5 mb-4">
        <div className="flex items-center justify-between mb-3">
          <div className="font-bold text-sm text-slate-900">Artículos ({(form.articulos||[]).length})</div>
          <Button size="sm" variant="outline" onClick={addArticulo}><Plus size={14}/> Agregar</Button>
        </div>
        <div className="text-xs text-muted-foreground mb-3">Blog / novedades de la web.</div>
        <div className="space-y-4">
          {(form.articulos||[]).map((a,i)=>(
            <div key={i} className="rounded-xl border border-slate-200 p-4 space-y-3">
              <div className="grid sm:grid-cols-[1fr_160px] gap-3">
                <div className="space-y-1.5"><Label>Título</Label><Input value={a.titulo} onChange={e=>setArticulo(i,"titulo",e.target.value)}/></div>
                <div className="space-y-1.5"><Label>Fecha</Label><Input value={a.fecha} onChange={e=>setArticulo(i,"fecha",e.target.value)} placeholder="Julio 2026"/></div>
              </div>
              <div className="space-y-1.5"><Label>Texto</Label><Ta value={a.texto} onChange={e=>setArticulo(i,"texto",e.target.value)} rows={3}/></div>
              <Button size="sm" variant="outline" className="text-destructive border-red-200 hover:bg-red-50 hover:text-destructive" onClick={()=>delArticulo(i)}><Trash2 size={13}/> Quitar</Button>
            </div>
          ))}
          {(form.articulos||[]).length===0&&<div className="text-xs text-muted-foreground">Sin artículos. Agrega el primero con el botón de arriba.</div>}
        </div>
      </Card>

      {/* PRECIOS */}
      <Card className="p-5 mb-4">
        <div className="font-bold text-sm text-slate-900 mb-3">Precios (3 planes)</div>
        <div className="grid md:grid-cols-3 gap-4">
          {form.planes.map((p,i)=>(
            <div key={i} className="rounded-xl border border-slate-200 p-4 space-y-3">
              <div className="space-y-1.5"><Label>Nombre del plan</Label><Input value={p.nombre} onChange={e=>setPlan(i,"nombre",e.target.value)}/></div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5"><Label>Precio</Label><Input value={p.precio} onChange={e=>setPlan(i,"precio",e.target.value)}/></div>
                <div className="space-y-1.5"><Label>Periodo</Label><Input value={p.periodo} onChange={e=>setPlan(i,"periodo",e.target.value)} placeholder="/mes"/></div>
              </div>
              <div className="space-y-1.5"><Label>Descripción</Label><Ta value={p.desc} onChange={e=>setPlan(i,"desc",e.target.value)} rows={2}/></div>
              <div className="space-y-1.5"><Label>Beneficios (uno por línea)</Label><Ta value={(p.items||[]).join("\n")} onChange={e=>setPlan(i,"items",e.target.value.split("\n"))} rows={5}/></div>
              <label className="flex items-center gap-2 text-sm font-medium text-slate-700 cursor-pointer">
                <input type="checkbox" checked={!!p.destacado} onChange={e=>setPlan(i,"destacado",e.target.checked)} className="h-4 w-4 accent-blue-600"/>
                Marcar como "Más popular"
              </label>
            </div>
          ))}
        </div>
      </Card>

      {/* CONTACTO */}
      <Card className="p-5 mb-4">
        <div className="font-bold text-sm text-slate-900 mb-3">Contacto (footer)</div>
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="space-y-1.5"><Label>Email</Label><Input value={form.contacto.email} onChange={e=>setContacto("email",e.target.value)}/></div>
          <div className="space-y-1.5"><Label>WhatsApp</Label><Input value={form.contacto.whatsapp} onChange={e=>setContacto("whatsapp",e.target.value)}/></div>
        </div>
      </Card>
      </>)}

      {tab==="colores"&&(
        <Card className="p-5 mb-4">
          <div className="font-bold text-sm text-slate-900 mb-1">Colores de la marca</div>
          <p className="text-xs text-muted-foreground mb-4">Se aplican a botones, resaltados y acentos de tu web. Míralos en la pestaña «Vista previa» antes de publicar.</p>
          <div className="grid sm:grid-cols-2 gap-4 max-w-lg">
            <ColorField label="Color principal" value={form.theme.primario} onChange={v=>setTheme("primario",v)}/>
            <ColorField label="Color secundario (promos)" value={form.theme.secundario} onChange={v=>setTheme("secundario",v)}/>
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            <button onClick={()=>{setTheme("primario","#2563eb");setTheme("secundario","#0891b2");}} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50">Azul (por defecto)</button>
            <button onClick={()=>{setTheme("primario","#059669");setTheme("secundario","#0d9488");}} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50">Verde</button>
            <button onClick={()=>{setTheme("primario","#7c3aed");setTheme("secundario","#c026d3");}} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50">Morado</button>
            <button onClick={()=>{setTheme("primario","#ea580c");setTheme("secundario","#d97706");}} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50">Naranja</button>
          </div>
        </Card>
      )}

      {tab==="promociones"&&(
        <Card className="p-5 mb-4 max-w-lg">
          <div className="font-bold text-sm text-slate-900 mb-1">Banner de promoción</div>
          <p className="text-xs text-muted-foreground mb-4">Aparece como una franja en la parte superior de tu web.</p>
          <label className="flex items-center gap-2 text-sm font-medium text-slate-700 cursor-pointer mb-3">
            <input type="checkbox" checked={!!form.promo.activo} onChange={e=>setPromo("activo",e.target.checked)} className="h-4 w-4 accent-blue-600"/>
            Mostrar el banner en la web
          </label>
          <div className="space-y-1.5"><Label>Texto de la promoción</Label><Input value={form.promo.texto} onChange={e=>setPromo("texto",e.target.value)} placeholder="Ej: ¡2 meses gratis en tu primer plan!"/></div>
          {form.promo.activo&&form.promo.texto&&(
            <div className="mt-4"><div className="text-xs text-muted-foreground mb-1.5">Así se verá:</div>
              <div className="rounded-lg text-center text-sm font-semibold px-4 py-2 text-white" style={{background:form.theme.secundario}}>{form.promo.texto}</div>
            </div>
          )}
        </Card>
      )}

      {tab==="preview"&&(
        <div>
          <div className="flex items-center gap-2 mb-3 text-xs text-muted-foreground"><Eye size={14}/> Vista previa de tus cambios <b>sin publicar</b>. La barra del navegador es solo del preview — no aparece en tu web real.</div>
          <div className="rounded-xl border border-slate-200 overflow-hidden bg-white shadow-sm">
            <div className="h-9 bg-slate-100 border-b border-slate-200 flex items-center gap-1.5 px-3">
              <span className="w-3 h-3 rounded-full bg-red-400"/><span className="w-3 h-3 rounded-full bg-amber-400"/><span className="w-3 h-3 rounded-full bg-green-400"/>
              <span className="ml-2 text-xs text-slate-400">tomfic.vercel.app · vista previa</span>
            </div>
            <div style={{height:540,overflow:"auto"}}>
              <div style={{transform:"scale(0.62)",transformOrigin:"top left",width:"161.3%"}}>
                <Landing content={form} preview/>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-end gap-2 mb-2 mt-5">
        <Button variant="outline" onClick={()=>setForm(mergeLanding(null))}>Restaurar por defecto</Button>
        <BtnGuardar/>
      </div>
    </Section>
  );
}
