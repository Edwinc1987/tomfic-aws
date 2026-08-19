import { useState } from "react";
import {
  Package, ClipboardList, Users, BarChart2, Landmark, MapPin, Download,
  ScanLine, CheckCircle, ArrowRight, Cloud, Smartphone, LayoutGrid,
  ShieldCheck, RefreshCw, X, Eye, EyeOff, Building2, Mail, Lock, AlertTriangle, Hash,
  Quote, Newspaper,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DEFAULT_LANDING } from "@/landingContent";

// slugify equivalente al de App.jsx y al SQL (para mostrar el identificador sugerido).
const slugify = (s) => (s||"").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/(^-|-$)/g,"");

// ── Modal de registro autoservicio de empresa ──
function RegisterModal({ onClose, onRegister, onGoLogin }) {
  const [f, setF] = useState({ empresa: "", nit: "", nombre: "", email: "", pass: "" });
  const [showPass, setShowPass] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [done, setDone] = useState(false);
  const slug = slugify(f.nit); // el identificador del equipo se deriva del NIT

  const submit = async () => {
    setErr("");
    if (!f.empresa.trim() || !f.nit.trim() || !f.nombre.trim() || !f.email.trim() || !f.pass) return setErr("Completa todos los campos.");
    if (f.pass.length < 6) return setErr("La contraseña debe tener al menos 6 caracteres.");
    setBusy(true);
    const r = await onRegister({ empresa: f.empresa.trim(), nit: f.nit.trim(), slug, email: f.email.trim(), pass: f.pass, nombre: f.nombre.trim() });
    setBusy(false);
    if (!r.ok) return setErr(r.error || "No se pudo completar el registro.");
    setDone(true);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute right-4 top-4 text-slate-400 hover:text-slate-700"><X size={20} /></button>
        {done ? (
          <div className="p-8 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100"><CheckCircle size={30} className="text-emerald-600" /></div>
            <h3 className="text-xl font-black text-slate-900">¡Registro recibido!</h3>
            <p className="mt-3 text-sm text-slate-600 leading-relaxed">
              Tu empresa <b>{f.empresa.trim()}</b> quedó <b>pendiente de aprobación</b>. Te avisaremos cuando esté activa y podrás entrar con tu email y contraseña.
            </p>
            <Button className="mt-6 w-full" onClick={onGoLogin}>Ir a iniciar sesión</Button>
          </div>
        ) : (
          <div className="p-7">
            <h3 className="text-xl font-black text-slate-900">Registra tu empresa</h3>
            <p className="mt-1 text-sm text-slate-500">Crea tu cuenta de administrador. La activación la aprueba el equipo de TOMFIC.</p>
            <div className="mt-5 space-y-4">
              <div className="space-y-1.5">
                <Label>Nombre de la empresa</Label>
                <div className="relative">
                  <Building2 size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <Input value={f.empresa} onChange={(e) => setF((p) => ({ ...p, empresa: e.target.value }))} placeholder="Mi Empresa S.A.S." className="h-11 pl-9" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>NIT</Label>
                <div className="relative">
                  <Hash size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <Input value={f.nit} onChange={(e) => setF((p) => ({ ...p, nit: e.target.value }))} placeholder="900.123.456-7" className="h-11 pl-9" />
                </div>
                {slug && <p className="text-xs text-slate-400">Identificador para tu equipo: <span className="font-mono text-slate-600">{slug}</span> <span className="text-slate-400">(con esto entran tus capturadores)</span></p>}
              </div>
              <div className="space-y-1.5">
                <Label>Tu nombre</Label>
                <Input value={f.nombre} onChange={(e) => setF((p) => ({ ...p, nombre: e.target.value }))} placeholder="Tu nombre" className="h-11" />
              </div>
              <div className="space-y-1.5">
                <Label>Email del administrador</Label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <Input type="email" value={f.email} onChange={(e) => setF((p) => ({ ...p, email: e.target.value }))} placeholder="admin@miempresa.com" className="h-11 pl-9" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Contraseña</Label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <Input type={showPass ? "text" : "password"} value={f.pass} onChange={(e) => setF((p) => ({ ...p, pass: e.target.value }))} onKeyDown={(e) => e.key === "Enter" && submit()} placeholder="Mínimo 6 caracteres" className="h-11 pl-9 pr-10" />
                  <button type="button" onClick={() => setShowPass((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">{showPass ? <EyeOff size={18} /> : <Eye size={18} />}</button>
                </div>
              </div>
              {err && <div className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2.5 text-sm font-semibold text-red-600"><AlertTriangle size={15} className="shrink-0" /> {err}</div>}
              <Button className="w-full" onClick={submit} disabled={busy}>{busy ? "Registrando…" : "Crear cuenta"}</Button>
              <p className="text-center text-sm text-slate-500">¿Ya tienes cuenta? <button onClick={onGoLogin} className="font-semibold text-blue-600 hover:underline">Inicia sesión</button></p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Formulario de captura de prospectos (lead) en la web pública ──
function LeadForm({ onLead, P }) {
  const [f, setF] = useState({ nombre: "", email: "", telefono: "", mensaje: "" });
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState("");
  const submit = async () => {
    setErr("");
    if (!f.nombre.trim() || (!f.email.trim() && !f.telefono.trim())) return setErr("Déjanos tu nombre y un email o teléfono.");
    setBusy(true);
    const r = onLead ? await onLead(f) : { ok: true };
    setBusy(false);
    if (!r.ok) return setErr(r.error || "No se pudo enviar. Intenta de nuevo.");
    setDone(true);
  };
  if (done) return (
    <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center max-w-lg mx-auto shadow-sm">
      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100"><CheckCircle size={26} className="text-emerald-600" /></div>
      <h3 className="text-lg font-black text-slate-900">¡Gracias! Te contactaremos pronto.</h3>
      <p className="mt-2 text-sm text-slate-600">Recibimos tus datos y te escribiremos muy pronto.</p>
    </div>
  );
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 md:p-8 max-w-lg mx-auto shadow-sm">
      <div className="grid sm:grid-cols-2 gap-3">
        <div className="space-y-1.5"><Label>Nombre</Label><Input value={f.nombre} onChange={e=>setF(p=>({...p,nombre:e.target.value}))} placeholder="Tu nombre" className="h-11" /></div>
        <div className="space-y-1.5"><Label>Teléfono</Label><Input value={f.telefono} onChange={e=>setF(p=>({...p,telefono:e.target.value}))} placeholder="+57 300 000 0000" className="h-11" /></div>
      </div>
      <div className="space-y-1.5 mt-3"><Label>Email</Label><Input type="email" value={f.email} onChange={e=>setF(p=>({...p,email:e.target.value}))} placeholder="tucorreo@empresa.com" className="h-11" /></div>
      <div className="space-y-1.5 mt-3"><Label>Mensaje (opcional)</Label>
        <textarea value={f.mensaje} onChange={e=>setF(p=>({...p,mensaje:e.target.value}))} rows={3} placeholder="¿En qué te ayudamos?" className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-y" />
      </div>
      {err && <div className="mt-3 flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2.5 text-sm font-semibold text-red-600"><AlertTriangle size={15} className="shrink-0" /> {err}</div>}
      <Button onClick={submit} disabled={busy} className="w-full mt-4" style={{ background: P }}>{busy ? "Enviando…" : "Enviar"}</Button>
    </div>
  );
}

// Iconos y colores por índice (no editables desde el panel)
const FEATURE_META = [
  { icon: MapPin, color: "#2563eb" },
  { icon: Users, color: "#16a34a" },
  { icon: ScanLine, color: "#7c3aed" },
  { icon: RefreshCw, color: "#dc2626" },
  { icon: Download, color: "#0891b2" },
  { icon: Landmark, color: "#d97706" },
];
const STEP_ICONS = [ClipboardList, Users, BarChart2];

// Logo SVG de la marca (mismo del login)
function Logo({ size = 40 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="shrink-0">
      <defs>
        <linearGradient id="lgrad" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#2563eb" />
          <stop offset="100%" stopColor="#0891b2" />
        </linearGradient>
      </defs>
      <rect width="100" height="100" rx="22" fill="url(#lgrad)" />
      <g stroke="white" strokeWidth="4.5" strokeLinejoin="round" strokeLinecap="round" fill="none">
        <path d="M50 26 L74 39 L74 65 L50 78 L26 65 L26 39 Z" />
        <path d="M26 39 L50 52 L74 39" />
        <path d="M50 52 L50 78" />
      </g>
    </svg>
  );
}

function SectionHead({ label, title, subtitle, light }) {
  return (
    <div className="max-w-2xl mx-auto text-center">
      <span className="text-xs font-bold uppercase tracking-widest text-blue-600">{label}</span>
      <h2 className={`mt-2 text-3xl md:text-4xl font-black tracking-tight ${light ? "text-white" : "text-slate-900"}`}>{title}</h2>
      {subtitle && <p className={`mt-4 text-base ${light ? "text-slate-300" : "text-slate-600"}`}>{subtitle}</p>}
    </div>
  );
}

function HeroMockup() {
  return (
    <div className="relative">
      <div className="absolute -inset-4 bg-blue-500/20 blur-3xl rounded-full" />
      <div className="relative rounded-2xl bg-white shadow-2xl ring-1 ring-black/5 overflow-hidden rotate-1">
        <div className="h-8 bg-slate-100 flex items-center gap-1.5 px-3">
          <span className="w-2.5 h-2.5 rounded-full bg-red-400" />
          <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
          <span className="w-2.5 h-2.5 rounded-full bg-green-400" />
        </div>
        <div className="flex h-64">
          <div className="w-20 bg-gradient-to-b from-slate-800 to-slate-900 p-2.5 flex flex-col gap-2">
            {[ClipboardList, MapPin, BarChart2, Landmark].map((Icon, i) => (
              <div key={i} className={`flex items-center justify-center h-9 rounded-lg ${i === 0 ? "bg-blue-600" : "bg-white/5"}`}>
                <Icon size={15} className="text-white/80" />
              </div>
            ))}
          </div>
          <div className="flex-1 p-3 bg-slate-50">
            <div className="rounded-lg bg-gradient-to-br from-slate-900 to-[#1e3a5f] px-3 py-2.5 mb-2.5 flex items-center justify-between">
              <div>
                <div className="h-1.5 w-12 bg-white/30 rounded mb-1" />
                <div className="h-2.5 w-24 bg-white/80 rounded" />
              </div>
              <div className="text-white text-lg font-black">87%</div>
            </div>
            <div className="grid grid-cols-3 gap-2 mb-2.5">
              {["#2563eb", "#16a34a", "#7c3aed"].map((c, i) => (
                <div key={i} className="rounded-lg bg-white border border-slate-100 p-2">
                  <div className="h-3 w-3 rounded mb-1.5" style={{ background: c }} />
                  <div className="h-3 w-6 rounded font-black" style={{ background: c, opacity: 0.85 }} />
                </div>
              ))}
            </div>
            <div className="rounded-lg bg-white border border-slate-100 overflow-hidden">
              <div className="h-5 bg-slate-900" />
              {[0, 1, 2].map((i) => (
                <div key={i} className="flex items-center gap-2 px-2 py-1.5 border-b border-slate-50">
                  <div className="h-2 w-10 bg-blue-200 rounded" />
                  <div className="h-2 flex-1 bg-slate-100 rounded" />
                  <div className="h-3 w-6 bg-green-100 rounded" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Landing({ onEnter, onRegister, onLead, content, preview }) {
  const c = content || DEFAULT_LANDING;
  const { hero, about, features, steps, planes, contacto } = c;
  const casos = Array.isArray(c.casos) ? c.casos : DEFAULT_LANDING.casos;
  const articulos = Array.isArray(c.articulos) ? c.articulos : DEFAULT_LANDING.articulos;
  const theme = { ...DEFAULT_LANDING.theme, ...(c.theme || {}) };
  const promo = { ...DEFAULT_LANDING.promo, ...(c.promo || {}) };
  const P = theme.primario, P2 = theme.secundario; // colores de marca editables
  const [showReg, setShowReg] = useState(false);
  const openReg = onRegister ? () => setShowReg(true) : (onEnter || (() => {}));
  const go = onEnter || (() => {}); // en modo preview los botones no navegan

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans antialiased">
      {promo.activo && promo.texto && (
        <div style={{ background: P2, color: "#fff" }} className="text-center text-sm font-semibold px-4 py-2">
          {promo.texto}
        </div>
      )}
      {showReg && onRegister && (
        <RegisterModal onClose={() => setShowReg(false)} onRegister={onRegister} onGoLogin={() => { setShowReg(false); onEnter(); }} />
      )}
      {/* NAVBAR */}
      <header className={`${preview ? "relative" : "sticky"} top-0 z-50 bg-white/90 backdrop-blur border-b border-slate-100`}>
        <nav className="mx-auto max-w-6xl px-5 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Logo size={46} />
            <div>
              <div className="font-extrabold text-lg tracking-tight leading-none bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">tomfic</div>
              <div className="text-[9px] uppercase tracking-[0.12em] text-slate-400 leading-tight">Tomas físicas de inventario</div>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
            <a href="#quienes" className="hover:text-slate-900 transition-colors">Quiénes somos</a>
            <a href="#caracteristicas" className="hover:text-slate-900 transition-colors">Características</a>
            <a href="#como" className="hover:text-slate-900 transition-colors">Cómo funciona</a>
            <a href="#casos" className="hover:text-slate-900 transition-colors">Casos de éxito</a>
            <a href="#articulos" className="hover:text-slate-900 transition-colors">Artículos</a>
            <a href="#precios" className="hover:text-slate-900 transition-colors">Precios</a>
          </div>
          <Button onClick={go} style={{ background: P }}>Ingresar <ArrowRight size={16} /></Button>
        </nav>
      </header>

      {/* HERO */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-[#1e3a5f] to-[#0f2d4a] text-white">
        <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-blue-500/10 pointer-events-none" />
        <div className="absolute -bottom-32 -right-20 w-80 h-80 rounded-full bg-emerald-500/10 pointer-events-none" />
        <div className="relative mx-auto max-w-6xl px-5 py-20 md:py-28 grid md:grid-cols-2 gap-12 items-center">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 border border-white/15 px-3 py-1 text-xs font-semibold text-blue-200 mb-5">
              <Cloud size={13} /> {hero.badge}
            </span>
            <h1 className="text-4xl md:text-[2.9rem] font-black leading-[1.1] tracking-tight">
              {hero.title} <span style={{ color: P }}>{hero.titleHighlight}</span>
            </h1>
            <p className="mt-5 text-lg text-slate-300 max-w-md">{hero.subtitle}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button size="lg" onClick={openReg} style={{ background: P }}>{hero.ctaPrimary} <ArrowRight size={18} /></Button>
              <Button size="lg" variant="outline" className="bg-transparent text-white border-white/30 hover:bg-white/10 hover:text-white" asChild>
                <a href="#caracteristicas">{hero.ctaSecondary}</a>
              </Button>
            </div>
            <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-400">
              <span className="inline-flex items-center gap-1.5"><CheckCircle size={15} className="text-emerald-400" /> Sin instalaciones</span>
              <span className="inline-flex items-center gap-1.5"><Smartphone size={15} className="text-emerald-400" /> Funciona en el celular</span>
              <span className="inline-flex items-center gap-1.5"><ShieldCheck size={15} className="text-emerald-400" /> Roles y accesos</span>
            </div>
          </div>
          <HeroMockup />
        </div>
      </section>

      {/* QUIÉNES SOMOS */}
      <section id="quienes" className="mx-auto max-w-6xl px-5 py-20 scroll-mt-16">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-blue-600">{about.label}</span>
            <h2 className="mt-2 text-3xl md:text-4xl font-black tracking-tight">{about.title}</h2>
            <p className="mt-5 text-slate-600 leading-relaxed">{about.p1}</p>
            <p className="mt-3 text-slate-600 leading-relaxed">{about.p2}</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {[
              { icon: LayoutGrid, n: "Conteos", t: "por ubicación", c: "#2563eb" },
              { icon: Users, n: "3 roles", t: "admin · capturador · gerente", c: "#16a34a" },
              { icon: RefreshCw, n: "C1·C2·C3", t: "con desempate", c: "#7c3aed" },
              { icon: Cloud, n: "Tiempo real", t: "respaldado en la nube", c: "#0891b2" },
            ].map((s, i) => (
              <div key={i} className="rounded-2xl border border-slate-100 bg-slate-50 p-5">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ background: s.c + "1a" }}>
                  <s.icon size={20} style={{ color: s.c }} />
                </div>
                <div className="text-xl font-black" style={{ color: s.c }}>{s.n}</div>
                <div className="text-xs text-slate-500 mt-0.5">{s.t}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CARACTERÍSTICAS */}
      <section id="caracteristicas" className="bg-slate-50 py-20 scroll-mt-16">
        <div className="mx-auto max-w-6xl px-5">
          <SectionHead
            label="Características"
            title="Todo para una toma física ordenada"
            subtitle="Desde la captura en campo hasta el reporte contable, en un solo lugar."
          />
          <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((f, i) => {
              const meta = FEATURE_META[i] || FEATURE_META[0];
              return (
                <div key={i} className="rounded-2xl bg-white border border-slate-100 p-6 shadow-sm hover:shadow-md transition-shadow">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4" style={{ background: meta.color + "1a" }}>
                    <meta.icon size={24} style={{ color: meta.color }} />
                  </div>
                  <h3 className="font-bold text-lg">{f.title}</h3>
                  <p className="mt-2 text-sm text-slate-600 leading-relaxed">{f.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CÓMO FUNCIONA */}
      <section id="como" className="py-20 scroll-mt-16">
        <div className="mx-auto max-w-6xl px-5">
          <SectionHead label="Cómo funciona" title="Tres pasos, cero papeles" />
          <div className="mt-12 grid md:grid-cols-3 gap-6">
            {steps.map((s, i) => {
              const Icon = STEP_ICONS[i] || STEP_ICONS[0];
              return (
                <div key={i} className="relative rounded-2xl border border-slate-100 bg-white p-7 shadow-sm">
                  <div style={{ background: P }} className="absolute -top-4 left-7 w-9 h-9 rounded-full text-white font-black flex items-center justify-center shadow-lg">{i + 1}</div>
                  <Icon size={26} style={{ color: P }} className="mt-3 mb-3" />
                  <h3 className="font-bold text-lg">{s.title}</h3>
                  <p className="mt-2 text-sm text-slate-600 leading-relaxed">{s.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CASOS DE ÉXITO */}
      <section id="casos" className="bg-slate-50 py-20 scroll-mt-16">
        <div className="mx-auto max-w-6xl px-5">
          <SectionHead label="Casos de éxito" title="Historias de quienes ya cuentan con TOMFIC" subtitle="Equipos que dejaron atrás el papel y ordenaron su toma física." />
          <div className="mt-12 grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {casos.map((cs, i) => (
              <div key={i} className="rounded-2xl border border-slate-100 bg-white p-7 shadow-sm">
                <Quote size={28} style={{ color: P }} className="opacity-40 mb-3" />
                <p className="text-slate-700 leading-relaxed">{cs.historia}</p>
                <div className="mt-5 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-black shrink-0" style={{ background: P }}>{(cs.nombre || "?").charAt(0)}</div>
                  <div>
                    <div className="font-bold text-sm">{cs.nombre}</div>
                    <div className="text-xs text-slate-500">{cs.empresa}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRECIOS */}
      <section id="precios" className="py-20 scroll-mt-16">
        <div className="mx-auto max-w-6xl px-5">
          <SectionHead label="Precios" title="Planes simples y claros" subtitle="Precios de ejemplo — los ajustamos a tu operación." />
          <div className="mt-12 grid md:grid-cols-3 gap-6 items-start">
            {planes.map((p, i) => (
              <div key={i} style={{ borderColor: p.destacado ? P : undefined }} className={`rounded-2xl border p-7 bg-white relative ${p.destacado ? "shadow-xl md:-mt-3 md:mb-3" : "border-slate-200 shadow-sm"}`}>
                {p.destacado && <div style={{ background: P }} className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full text-white text-[11px] font-bold px-3 py-1">Más popular</div>}
                <div className="font-bold text-slate-500 uppercase text-xs tracking-wider">{p.nombre}</div>
                <div className="mt-3 flex items-end gap-1">
                  <span className="text-4xl font-black">{p.precio}</span>
                  {p.periodo && <span className="text-slate-400 mb-1.5 text-sm">{p.periodo}</span>}
                </div>
                <p className="mt-2 text-sm text-slate-600">{p.desc}</p>
                <ul className="mt-5 space-y-2.5">
                  {(p.items || []).map((it, j) => (
                    <li key={j} className="flex items-start gap-2 text-sm text-slate-700">
                      <CheckCircle size={16} className="text-emerald-500 shrink-0 mt-0.5" /> {it}
                    </li>
                  ))}
                </ul>
                <Button onClick={openReg} className="w-full mt-7" variant={p.destacado ? "default" : "outline"} style={p.destacado ? { background: P } : undefined}>
                  Empezar
                </Button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ARTÍCULOS */}
      <section id="articulos" className="bg-slate-50 py-20 scroll-mt-16">
        <div className="mx-auto max-w-6xl px-5">
          <SectionHead label="Artículos" title="Novedades y buenas prácticas" subtitle="Consejos para que tu toma física sea más rápida y sin errores." />
          <div className="mt-12 grid md:grid-cols-3 gap-6">
            {articulos.map((a, i) => (
              <div key={i} className="rounded-2xl border border-slate-100 bg-white p-7 shadow-sm hover:shadow-md transition-shadow">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-4" style={{ background: P + "1a" }}>
                  <Newspaper size={22} style={{ color: P }} />
                </div>
                {a.fecha && <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">{a.fecha}</div>}
                <h3 className="mt-1 font-bold text-lg leading-snug">{a.titulo}</h3>
                <p className="mt-2 text-sm text-slate-600 leading-relaxed">{a.texto}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CONTACTO / LEADS */}
      <section id="contacto" className="py-20 scroll-mt-16">
        <div className="mx-auto max-w-6xl px-5">
          <SectionHead label="Contáctanos" title="¿Quieres una demo?" subtitle="Déjanos tus datos y te escribimos para mostrarte TOMFIC." />
          <div className="mt-10"><LeadForm onLead={onLead} P={P} /></div>
        </div>
      </section>

      {/* CTA FINAL */}
      <section style={{ background: P }} className="text-white py-16">
        <div className="mx-auto max-w-3xl px-5 text-center">
          <h2 className="text-3xl md:text-4xl font-black tracking-tight">¿Listo para tu próxima toma física?</h2>
          <p className="mt-4 text-white/80">Entra al sistema y crea tu primer inventario en minutos.</p>
          <Button size="lg" onClick={openReg} className="mt-8 bg-white hover:bg-white/90" style={{ color: P }}>
            {hero.ctaPrimary} <ArrowRight size={18} />
          </Button>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-slate-900 text-slate-400">
        <div className="mx-auto max-w-6xl px-5 py-12 grid md:grid-cols-3 gap-8">
          <div>
            <div className="flex items-center gap-2.5 mb-3">
              <Logo size={38} />
              <span className="font-extrabold text-white text-lg">TOMFIC</span>
            </div>
            <p className="text-sm leading-relaxed max-w-xs">Sistema de toma de inventarios físicos en la nube. Conteos por ubicación, multi-capturador y reportes exportables.</p>
          </div>
          <div>
            <div className="text-white font-semibold text-sm mb-3">Producto</div>
            <ul className="space-y-2 text-sm">
              <li><a href="#quienes" className="hover:text-white transition-colors">Quiénes somos</a></li>
              <li><a href="#caracteristicas" className="hover:text-white transition-colors">Características</a></li>
              <li><a href="#casos" className="hover:text-white transition-colors">Casos de éxito</a></li>
              <li><a href="#articulos" className="hover:text-white transition-colors">Artículos</a></li>
              <li><a href="#precios" className="hover:text-white transition-colors">Precios</a></li>
              <li><button onClick={go} className="hover:text-white transition-colors">Ingresar</button></li>
            </ul>
          </div>
          <div>
            <div className="text-white font-semibold text-sm mb-3">Contacto</div>
            <ul className="space-y-2 text-sm">
              <li>{contacto.email}</li>
              <li>WhatsApp: {contacto.whatsapp}</li>
            </ul>
          </div>
        </div>
        <div className="border-t border-white/10">
          <div className="mx-auto max-w-6xl px-5 py-5 text-xs text-slate-500 flex flex-col sm:flex-row justify-between gap-2">
            <span>© 2026 TOMFIC · Sistema de Inventarios Físicos</span>
            <span>Hecho para equipos que cuentan de verdad.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
