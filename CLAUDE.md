# TOMFIC — Guía del proyecto

SaaS de **tomas físicas y control de inventarios**. Empresas (tiendas, bodegas,
distribuidoras) cuentan su inventario real: un administrador programa conteos por
ubicación y varios "capturadores" cuentan a la vez desde el móvil escaneando
códigos de barras. El sistema compara conteos (C1 / C2 / C3 de desempate),
detecta diferencias contra el saldo del sistema y exporta reportes a Excel.

## Cómo correr
```bash
npm install
npm run dev      # arranca en localhost:5173 (o 5174 si está ocupado)
npm run build    # build de producción (debe quedar verde antes de desplegar)
```
> ⚠️ **Requiere un archivo `.env`** en la raíz con `VITE_SUPABASE_URL` y
> `VITE_SUPABASE_KEY` (la publishable key de Supabase). El `.env` **NO está en
> git** (.gitignore) — sin él la app carga en blanco. Ver `.env.example`.

## Stack
React 18 + Vite 4 + Supabase + Tailwind v3 + shadcn/ui + lucide-react + xlsx.
Tailwind es **v3** (no v4) porque el proyecto usa Vite 4. Alias `@/` → `./src`.

## Estructura
- `src/App.jsx` — **monolito** (~5700 líneas), casi toda la app. Componentes
  principales: `Login`, `ModAdmin`, `ModCapturador`, `ModGerente`, `PanelDueno`,
  y vistas `VBaseDatos`, `VConteos`, `VProcesos`, `VUbicaciones`, `VUsuarios`,
  `VClientes`, `VClienteDetalle`, `VPaginaWeb`, `VLeads`, `VPagos`, `VResumen`.
- `src/Landing.jsx` — web pública (landing). Componente `Logo` (ícono de marca).
- `src/landingContent.js` — contenido editable de la landing (hero, about,
  features, steps, casos, articulos, planes, contacto) + `mergeLanding`.
- `supabase/*.sql` — scripts SQL de referencia (multi-tenant, RPCs, RLS, etc.).
- `public/` — favicon.svg, og-image.svg, robots.txt, sitemap.xml.

## Supabase (producción)
Proyecto ref `tyulypjzfiabaywusopd`. Multi-tenant con Supabase Auth + RLS.
El objeto global `G` mantiene el estado; `SB` encapsula las llamadas; `doSync`
sincroniza a la nube. Datos scopeados por `tenant_id`.
> **Claude NO corre SQL en producción.** Si algo necesita SQL, se ENTREGA el
> script y **el usuario lo corre** en el SQL Editor de Supabase.

## Despliegue
- Repo: `github.com/Edwinc1987/tomfic` (branch `main`).
- Push a `main` → **Vercel redespliega solo** (~1–2 min).
- En vivo: **https://www.tomfic.com** (dominio en GoDaddy, apuntado a Vercel).
  También `tomfic.vercel.app`. Correo corporativo `@tomfic.com` en GoDaddy (M365).

## Marca
- Logo: **código de barras** (barras blancas sólidas de ancho variable + línea de
  escáner roja) sobre cuadro con degradado azul→cian. Wordmark "TOMFIC" en
  degradado cian→verde. Subtítulo "Tomas físicas de inventario".
- Paleta: azul `#2563eb`, cian `#0891b2`, verde `#16a34a`, rojo escáner `#f43f5e`,
  navy `#0f172a`. Tema CLARO (capturadores trabajan con luz directa).
- **Morado `#7c3aed` = ajuste/desempate** (rol semántico oficial): badge "AJUSTE",
  ronda C3 y botones del conteo de ajuste. No es un desvío de marca.
- Fuente única de la paleta en `src/theme.js` (`import { C } from "@/theme"`).
  Código nuevo debe usarla; los estilos inline viejos se migran incremental.
- Accesibilidad: sobre fondo BLANCO, texto gris mínimo `slate-500 #64748b` (AA);
  `slate-400 #94a3b8` solo sobre fondos OSCUROS (navbar/sidebar).

## Convenciones de trabajo
- **Planear/proponer primero; no editar código, commit, push ni deploy hasta que
  el usuario apruebe** ("dale/hazlo").
- Correr `npm run build` (verde) antes de cada push.
- Terminología del usuario: decir **"móvil"** (no "celular").
- No exponer secretos (keys, contraseñas) en el repo.

## Estado / pendientes (al 2026-08-06)
- ✅ En producción: multi-tenant, panel del dueño, landing con CMS, conteo de
  ajuste, "sube saldos", eliminar conteos, secciones web (Casos de éxito,
  Artículos), logo nuevo, SEO técnico (meta tags, sitemap, indexado en Google).
- ✅ PWA offline: service worker (vite-plugin-pwa) precachea la app + escáner;
  abre e instala sin señal. Datos: capturas se guardan en localStorage y se
  sincronizan solas al reconectar (listener `online` + `OfflineBanner`). Escáner
  ZXing empaquetado (ya no depende de unpkg). Íconos PWA + `og-image.png` 1200×630.
- ⏳ Pendientes: dar URL propia a cada artículo (mejora de SEO); Facturación
  cliente Parte 2 (Mi plan + subir soporte de pago, requiere SQL + bucket
  Storage); fotos/evidencia en el capturador; dark theme real del capturador
  (hoy es `filter:invert`); `xlsx` con `import()` dinámico; migrar estilos inline
  a `src/theme.js`.
- 🔒 Seguridad: rotar la secret key de Supabase y cambiar la clave del dueño.
