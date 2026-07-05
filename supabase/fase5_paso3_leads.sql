-- ╔═══════════════════════════════════════════════════════════════════════╗
-- ║  FASE 5 · PASO 3 — Leads (prospectos capturados desde la web pública)  ║
-- ╚═══════════════════════════════════════════════════════════════════════╝
-- Correr COMPLETO en Supabase → SQL Editor. Es idempotente (se puede repetir).
-- Depende de que ya exista el helper public.auth_rol() (creado en fase5_paso2.sql)
-- y de pgcrypto para gen_random_uuid() (ya habilitado en fase5_paso2.sql).

-- 1. Tabla de leads
create table if not exists public.leads (
  id         uuid primary key default gen_random_uuid(),
  nombre     text,
  email      text,
  telefono   text,
  mensaje    text,
  origen     text default 'landing',   -- de dónde llegó (por ahora, la web)
  estado     text default 'nuevo',     -- nuevo | contactado | descartado
  created_at timestamptz default now()
);
create index if not exists leads_created_idx on public.leads (created_at desc);

-- 2. RLS: solo el dueño ve/gestiona los leads.
alter table public.leads enable row level security;
drop policy if exists leads_dueno on public.leads;
create policy leads_dueno on public.leads for all
  using (public.auth_rol() = 'dueno')
  with check (public.auth_rol() = 'dueno');

-- 3. Captura pública: un visitante ANÓNIMO (sin sesión) inserta su lead vía RPC.
--    SECURITY DEFINER = corre con permisos del dueño de la función, saltándose RLS
--    solo para este insert controlado. No expone lectura de la tabla.
create or replace function public.capturar_lead(
  p_nombre text, p_email text, p_telefono text, p_mensaje text
) returns void
language plpgsql security definer set search_path = public as $$
begin
  -- Validación mínima: nombre + (email o teléfono).
  if coalesce(trim(p_nombre),'') = '' then
    raise exception 'Falta el nombre';
  end if;
  if coalesce(trim(p_email),'') = '' and coalesce(trim(p_telefono),'') = '' then
    raise exception 'Falta email o teléfono';
  end if;
  insert into public.leads (nombre, email, telefono, mensaje, origen, estado)
  values (
    nullif(trim(p_nombre),''),
    nullif(trim(p_email),''),
    nullif(trim(p_telefono),''),
    nullif(trim(p_mensaje),''),
    'landing', 'nuevo'
  );
end; $$;

grant execute on function public.capturar_lead(text, text, text, text) to anon, authenticated;
