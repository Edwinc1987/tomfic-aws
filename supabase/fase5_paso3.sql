-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  FASE 5 · PASO 3 — Slice 1: gestión de clientes + pagos (Panel del Dueño)  ║
-- ║  Corre este bloque completo en el SQL Editor de Supabase.                  ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

-- 1. Columnas de plan / cobro en tenants
alter table public.tenants add column if not exists vence        date;
alter table public.tenants add column if not exists precio       numeric(12,2) default 0;
alter table public.tenants add column if not exists max_usuarios int default 5;
alter table public.tenants add column if not exists notas        text;

-- 2. Historial de pagos
create table if not exists public.pagos (
  id            bigint generated always as identity primary key,
  tenant_id     text not null references public.tenants(id) on delete cascade,
  fecha         date not null default current_date,
  monto         numeric(12,2) not null default 0,
  periodo_desde date,
  periodo_hasta date,
  metodo        text,
  comprobante   text,
  nota          text,
  created_at    timestamptz default now()
);
create index if not exists pagos_tenant_idx on public.pagos(tenant_id);

alter table public.pagos enable row level security;
-- El dueño gestiona todos los pagos.
drop policy if exists pagos_dueno on public.pagos;
create policy pagos_dueno on public.pagos for all
  using (public.auth_rol() = 'dueno') with check (public.auth_rol() = 'dueno');
-- Un miembro puede LEER los pagos de su propia empresa (opcional; solo lectura).
drop policy if exists pagos_tenant_read on public.pagos;
create policy pagos_tenant_read on public.pagos for select
  using (tenant_id = public.auth_tenant_id());

-- 3. RPC: activar / bloquear un usuario. Dueño = cualquier empresa; admin = la suya.
create or replace function public.set_member_active(p_user_id text, p_activo boolean)
returns json language plpgsql security definer
set search_path = public, auth as $$
declare v_tid text; v_rol text; v_target_tid text;
begin
  v_tid := public.auth_tenant_id();
  v_rol := public.auth_rol();
  if v_rol is distinct from 'admin' and v_rol is distinct from 'dueno' then
    raise exception 'Solo un administrador puede cambiar el estado de un usuario.';
  end if;
  select tenant_id into v_target_tid from public.usuarios where id = p_user_id;
  if v_target_tid is null then raise exception 'Usuario no encontrado.'; end if;
  if v_rol = 'admin' and v_target_tid is distinct from v_tid then
    raise exception 'No puedes modificar usuarios de otra empresa.';
  end if;
  update public.usuarios set activo = p_activo where id = p_user_id;
  return json_build_object('ok', true);
end; $$;
grant execute on function public.set_member_active(text, boolean) to authenticated;
