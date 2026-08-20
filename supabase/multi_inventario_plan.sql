-- TOMFIC · Multi-inventario y base de planes
-- Ejecutar completo en Supabase → SQL Editor.
-- Es idempotente y no modifica datos existentes.

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
create index if not exists conteos_inventario_idx
  on public.conteos (tenant_id, inventario_id);

create index if not exists inventarios_tenant_estado_idx
  on public.inventarios (tenant_id, estado);

comment on column public.tenants.plan is
  'Plan comercial vigente: gratis, pro, enterprise, etc.';
comment on column public.tenants.limite_inventarios is
  'Cantidad máxima de inventarios abiertos permitidos por el plan.';
