-- TOMFIC: permitir configuración por inventario en app_config.
-- Ejecutar en Supabase SQL Editor.

drop policy if exists appconfig_select on public.app_config;
create policy appconfig_select on public.app_config for select using (
  key = 'landing'
  or public.auth_rol() = 'dueno'
  or key = 'tenant:' || coalesce(public.auth_tenant_id(), '') || ':config'
  or key like 'tenant:' || coalesce(public.auth_tenant_id(), '') || ':inventario:%'
);

drop policy if exists appconfig_write on public.app_config;
create policy appconfig_write on public.app_config for all using (
  public.auth_rol() = 'dueno'
  or (public.auth_tenant_id() is not null
      and (key = 'tenant:' || public.auth_tenant_id() || ':config'
        or key like 'tenant:' || public.auth_tenant_id() || ':inventario:%'))
) with check (
  public.auth_rol() = 'dueno'
  or (public.auth_tenant_id() is not null
      and (key = 'tenant:' || public.auth_tenant_id() || ':config'
        or key like 'tenant:' || public.auth_tenant_id() || ':inventario:%'))
);

select policyname, tablename
from pg_policies
where schemaname = 'public'
and tablename = 'app_config';
