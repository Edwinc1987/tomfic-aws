-- ─────────────────────────────────────────────────────────────────────────────
-- BORRAR EMPRESA (tenant) — RPC para el panel del dueño
--
-- Elimina de forma PERMANENTE una empresa y TODO lo suyo:
--   auth.users + usuarios · productos · conteos · inventarios · pagos ·
--   app_config (tenant:<id>:config) · tenants
--
-- Solo el DUEÑO puede ejecutarlo (guard con auth_rol()). No se puede deshacer.
-- Correr una vez en: Supabase → SQL Editor.
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.delete_tenant(p_tid text)
returns json language plpgsql security definer
set search_path = public, auth, extensions
as $fn$
declare v_rol text;
begin
  v_rol := public.auth_rol();
  if v_rol is distinct from 'dueno' then
    raise exception 'Solo el dueño puede eliminar empresas.';
  end if;

  -- 1) Credenciales de acceso (auth.users) de los miembros de la empresa.
  --    Solo ids con forma de UUID (los migrados a Auth); ignora ids legacy.
  delete from auth.users where id in (
    select u.id::uuid
    from public.usuarios u
    where u.tenant_id = p_tid
      and u.id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  );

  -- 2) Datos de la empresa. conteos antes que inventarios por si hay FK.
  delete from public.usuarios    where tenant_id = p_tid;
  delete from public.productos   where tenant_id = p_tid;
  delete from public.conteos     where tenant_id = p_tid;
  delete from public.inventarios where tenant_id = p_tid;
  delete from public.pagos       where tenant_id = p_tid;

  -- 3) Configuración por-empresa (ubicaciones/tipos/notas).
  delete from public.app_config  where key = 'tenant:' || p_tid || ':config';

  -- 4) La empresa en sí.
  delete from public.tenants     where id = p_tid;

  return json_build_object('ok', true);
end;
$fn$;

grant execute on function public.delete_tenant(text) to authenticated;
