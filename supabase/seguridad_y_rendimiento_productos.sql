-- TOMFIC: seguridad y rendimiento para crecer la base de productos
-- Ejecutar en Supabase SQL Editor.
-- Este script no elimina ni modifica registros existentes.
-- IMPORTANTE: ejecutarlo después de crear las políticas RLS de fase5_paso2.sql.

-- 1) Activar RLS en las tablas multi-tenant.
alter table public.usuarios enable row level security;
alter table public.productos enable row level security;
alter table public.inventarios enable row level security;
alter table public.conteos enable row level security;
alter table public.tenants enable row level security;
alter table public.app_config enable row level security;

-- 2) Índices para las consultas que usa TOMFIC.
create index if not exists productos_tenant_inventario_idx
  on public.productos (tenant_id, inventario_id);

create index if not exists productos_tenant_codigo_idx
  on public.productos (tenant_id, codigo);

create index if not exists productos_tenant_ean_idx
  on public.productos (tenant_id, ean);

create index if not exists inventarios_tenant_estado_idx
  on public.inventarios (tenant_id, estado);

create index if not exists conteos_tenant_inventario_idx
  on public.conteos (tenant_id, inventario_id);

create index if not exists usuarios_tenant_inventario_idx
  on public.usuarios (tenant_id, inventario_id);

-- 3) Actualizar estadísticas para que PostgreSQL elija mejores planes.
analyze public.productos;
analyze public.inventarios;
analyze public.conteos;
analyze public.usuarios;

-- 4) Comprobaciones. Deben devolver índices y RLS habilitado.
select schemaname, tablename, rowsecurity
from pg_tables
where schemaname = 'public'
  and tablename in ('usuarios','productos','inventarios','conteos','tenants','app_config')
order by tablename;

select indexname, tablename
from pg_indexes
where schemaname = 'public'
  and tablename in ('productos','inventarios','conteos','usuarios')
order by tablename, indexname;
