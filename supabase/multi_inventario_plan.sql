-- TOMFIC · Multi-inventario y base de planes
-- Ejecutar completo en Supabase → SQL Editor.
-- Es idempotente. La sección de compatibilidad asigna datos antiguos al
-- primer inventario abierto para no dejarlos sin propietario.

-- Entitlements básicos. Los valores son configurables por empresa desde el
-- panel del dueño y servirán como base para los planes de suscripción.
alter table public.tenants add column if not exists plan text default 'gratis';
alter table public.tenants add column if not exists limite_inventarios integer default 1;

update public.tenants
set plan = coalesce(nullif(plan, ''), 'gratis'),
    limite_inventarios = greatest(coalesce(limite_inventarios, 1), 1)
where plan is null or plan = '' or limite_inventarios is null or limite_inventarios < 1;

-- Los conteos ya se relacionan conceptualmente con su inventario. Esta
-- columna permite que varios inventarios abiertos convivan en la misma empresa.
alter table public.conteos add column if not exists inventario_id text;
alter table public.productos add column if not exists inventario_id text;
alter table public.usuarios add column if not exists inventario_id text;
alter table public.inventarios add column if not exists localizaciones_snapshot jsonb;
alter table public.inventarios add column if not exists ubicaciones_tipos_snapshot jsonb;
alter table public.inventarios add column if not exists localizacion_tipos_snapshot jsonb;
alter table public.inventarios add column if not exists notas_snapshot jsonb;

-- Compatibilidad: los datos del modelo anterior pertenecían al único
-- inventario abierto. Se asignan solo cuando aún no tienen inventario.
update public.productos p
set inventario_id = i.id
from (select id from public.inventarios where estado = 'abierto' order by apertura nulls last, id limit 1) i
where p.inventario_id is null;

update public.usuarios u
set inventario_id = i.id
from (select id from public.inventarios where estado = 'abierto' order by apertura nulls last, id limit 1) i
where u.inventario_id is null
  and u.rol in ('capturador', 'gerente');
create index if not exists conteos_inventario_idx
  on public.conteos (tenant_id, inventario_id);

create index if not exists productos_inventario_idx
  on public.productos (tenant_id, inventario_id);

create index if not exists usuarios_inventario_idx
  on public.usuarios (tenant_id, inventario_id);

create index if not exists inventarios_tenant_estado_idx
  on public.inventarios (tenant_id, estado);

comment on column public.tenants.plan is
  'Plan comercial vigente: gratis, pro, enterprise, etc.';
comment on column public.tenants.limite_inventarios is
  'Cantidad máxima de inventarios abiertos permitidos por el plan.';

comment on column public.productos.inventario_id is
  'Inventario al que pertenece esta base de productos.';
comment on column public.usuarios.inventario_id is
  'Inventario asignado al usuario; null = acceso transversal de administrador.';
