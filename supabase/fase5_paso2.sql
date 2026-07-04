-- ============================================================================
-- TOMFIC · FASE 5 · PASO 2 — Auth real + RLS por tenant + login por empresa
-- ----------------------------------------------------------------------------
-- Cómo usarlo:
--   1. Abre Supabase → SQL Editor → New query.
--   2. Lee el bloque "ANTES DE EMPEZAR" y edita las 2 variables del DUEÑO.
--   3. Corre las ETAPAS 1 (este archivo de arriba hasta "FIN ETAPA 1").
--   4. Pasa la app a Auth (frontend) y verifica TODO con RLS aún apagado.
--   5. Cuando todo funcione, corre la ETAPA 3 (habilitar RLS) y verifica.
--   6. Por último, la ETAPA 4 (limpieza).
--
-- Diseño:
--   - Todos los actores (dueño, admin, gerente, capturador) son usuarios de
--     Supabase Auth. Capturadores/gerentes usan email SINTÉTICO derivado de
--     empresa(slug)+nombre: slugify(nombre)@<slug>.tomfic.app.
--   - La tabla `usuarios` es el PERFIL: su `id` = auth.uid() (texto del UUID).
--   - La creación de usuarios NO usa signUp: se hace con RPCs SECURITY DEFINER
--     que crean la credencial Auth ya confirmada. Login = signInWithPassword.
-- ============================================================================


-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  ETAPA 1 — ESQUEMA, FUNCIONES, RPCs, MIGRACIÓN Y POLÍTICAS (RLS APAGADO)   ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

-- ── 0. Extensiones ──────────────────────────────────────────────────────────
create extension if not exists pgcrypto with schema extensions;

-- ── 1. Ajustes de esquema ───────────────────────────────────────────────────
-- `usuarios` ya existe (id text, tenant_id, nombre, pass, rol, activo, creado,
--  correo, telefono, ...). Añadimos `email` (la credencial de login).
alter table public.usuarios add column if not exists email text;
create unique index if not exists usuarios_email_uq on public.usuarios (lower(email)) where email is not null;
-- Admins y dueño ya NO guardan clave en claro (viven en Auth) → pass puede ser nula.
alter table public.usuarios alter column pass drop not null;
-- `tenants` ya tiene slug y activo (activo=false ⇒ pendiente de aprobación). Añadimos `nit`.
create unique index if not exists tenants_slug_uq on public.tenants (slug) where slug is not null;
alter table public.tenants add column if not exists nit text;


-- ── 2. Helpers de texto ─────────────────────────────────────────────────────
-- slugify equivalente al del frontend (minúsculas, sin acentos, [^a-z0-9]→'-').
create or replace function public.slugify(p text)
returns text language sql immutable as $$
  select trim(both '-' from regexp_replace(
    lower(translate(coalesce(p,''),
      'áàäâãéèëêíìïîóòöôõúùüûñçÁÀÄÂÃÉÈËÊÍÌÏÎÓÒÖÔÕÚÙÜÛÑÇ',
      'aaaaaeeeeiiiiooooouuuuncAAAAAEEEEIIIIOOOOOUUUUNC')),
    '[^a-z0-9]+', '-', 'g'));
$$;

-- Email sintético de un miembro de empresa.
create or replace function public.member_email(p_nombre text, p_slug text)
returns text language sql immutable as $$
  select public.slugify(p_nombre) || '@' || p_slug || '.tomfic.app';
$$;


-- ── 3. Helpers de identidad (los usan las políticas RLS) ─────────────────────
-- SECURITY DEFINER + search_path fijo para que NO recursen sobre la RLS de
-- `usuarios` (se ejecutan como owner, saltándose las políticas).
create or replace function public.auth_tenant_id()
returns text language sql stable security definer set search_path = public as $$
  select tenant_id from public.usuarios where id = auth.uid()::text limit 1;
$$;

create or replace function public.auth_rol()
returns text language sql stable security definer set search_path = public as $$
  select rol from public.usuarios where id = auth.uid()::text limit 1;
$$;


-- ── 4. Creación de credencial Auth (interno, NO expuesto a la API) ───────────
-- Inserta en auth.users (+ auth.identities) un usuario email/clave ya confirmado.
-- Es la pieza más delicada (depende de la estructura interna de GoTrue).
create or replace function public._create_auth_user(p_email text, p_pass text)
returns uuid language plpgsql security definer
set search_path = public, auth, extensions as $$
declare v_id uuid := gen_random_uuid();
begin
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, created_at, updated_at,
    raw_app_meta_data, raw_user_meta_data, is_super_admin,
    confirmation_token, recovery_token, email_change_token_new, email_change
  ) values (
    '00000000-0000-0000-0000-000000000000', v_id, 'authenticated', 'authenticated',
    lower(trim(p_email)), extensions.crypt(p_pass, extensions.gen_salt('bf')),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, false,
    '', '', '', ''
  );
  insert into auth.identities (
    provider_id, user_id, identity_data, provider,
    last_sign_in_at, created_at, updated_at
  ) values (
    v_id::text, v_id,
    jsonb_build_object('sub', v_id::text, 'email', lower(trim(p_email))),
    'email', now(), now(), now()
  );
  return v_id;
end; $$;
revoke all on function public._create_auth_user(text, text) from public, anon, authenticated;


-- ── 5. RPCs públicas ─────────────────────────────────────────────────────────

-- 5a. Registro autoservicio de empresa (desde la landing, rol anon).
--     Crea: credencial admin + tenant (activo=false, pendiente) + perfil admin.
--     Seguro desde anon porque solo crea una empresa NUEVA y aislada.
drop function if exists public.register_tenant(text, text, text, text, text);
create or replace function public.register_tenant(
  p_empresa text, p_slug text, p_email text, p_pass text, p_admin_nombre text default '', p_nit text default ''
) returns json language plpgsql security definer
set search_path = public, auth, extensions as $$
declare v_uid uuid; v_tid text; v_slug text; v_email text; v_nombre text;
begin
  v_email := lower(trim(p_email));
  if coalesce(trim(p_empresa),'') = '' or v_email = '' or coalesce(p_pass,'') = '' then
    raise exception 'Faltan datos (empresa, email o clave).';
  end if;
  if length(p_pass) < 6 then raise exception 'La clave debe tener al menos 6 caracteres.'; end if;
  if coalesce(trim(p_nit),'') = '' then raise exception 'El NIT es obligatorio.'; end if;
  -- El identificador de la empresa (slug) se deriva del NIT (es lo que el equipo escribe al entrar).
  v_slug := nullif(public.slugify(p_nit), '');
  if v_slug is null then raise exception 'NIT invalido.'; end if;
  if exists (select 1 from auth.users where email = v_email) then
    raise exception 'Ese email ya esta registrado.';
  end if;
  if exists (select 1 from public.tenants where slug = v_slug) then
    raise exception 'Ya existe una empresa registrada con ese NIT.';
  end if;

  v_uid := public._create_auth_user(v_email, p_pass);
  v_tid := 't_' || replace(gen_random_uuid()::text, '-', '');
  v_nombre := upper(coalesce(nullif(trim(p_admin_nombre), ''), split_part(v_email, '@', 1)));

  insert into public.tenants (id, nombre, nit, slug, plan, activo, created_at)
    values (v_tid, trim(p_empresa), nullif(trim(p_nit),''), v_slug, 'basico', false, now());
  insert into public.usuarios (id, tenant_id, nombre, rol, activo, creado, correo, email)
    values (v_uid::text, v_tid, v_nombre, 'admin', true, to_char(now(), 'DD/MM/YYYY'), v_email, v_email);

  return json_build_object('ok', true, 'tenant_id', v_tid, 'slug', v_slug);
end; $$;
grant execute on function public.register_tenant(text, text, text, text, text, text) to anon, authenticated;

-- 5b. Crear miembro de la empresa (capturador/gerente/admin). Solo admin/dueño.
--     El tenant se deriva del LLAMANTE: nunca se confía en un tenant del cliente.
create or replace function public.create_member(
  p_nombre text, p_pass text, p_rol text,
  p_correo text default '', p_telefono text default ''
) returns json language plpgsql security definer
set search_path = public, auth, extensions as $$
declare v_tid text; v_rol text; v_slug text; v_email text; v_uid uuid; v_nombre text;
begin
  v_tid := public.auth_tenant_id();
  v_rol := public.auth_rol();
  if v_rol is distinct from 'admin' and v_rol is distinct from 'dueno' then
    raise exception 'Solo un administrador puede crear usuarios.';
  end if;
  if v_tid is null then raise exception 'No tienes una empresa asociada.'; end if;
  if not exists (select 1 from public.tenants where id = v_tid and activo) then
    raise exception 'La empresa está inactiva.';
  end if;

  v_nombre := upper(trim(p_nombre));
  if v_nombre = '' or coalesce(p_pass,'') = '' then raise exception 'Nombre y clave requeridos.'; end if;
  if p_rol not in ('capturador','gerente','admin') then raise exception 'Rol inválido.'; end if;
  if exists (select 1 from public.usuarios where tenant_id = v_tid and nombre = v_nombre) then
    raise exception 'Ya existe el usuario % en esta empresa.', v_nombre;
  end if;

  select slug into v_slug from public.tenants where id = v_tid;
  v_email := public.member_email(v_nombre, v_slug);
  if exists (select 1 from auth.users where email = v_email) then
    raise exception 'Conflicto de email para %.', v_nombre;
  end if;

  v_uid := public._create_auth_user(v_email, p_pass);
  insert into public.usuarios (id, tenant_id, nombre, rol, activo, creado, correo, telefono, email, pass)
    values (v_uid::text, v_tid, v_nombre, p_rol, true, to_char(now(),'DD/MM/YYYY'),
            nullif(trim(p_correo),''), nullif(trim(p_telefono),''), v_email, p_pass);

  return json_build_object('ok', true, 'email', v_email, 'nombre', v_nombre, 'pass', p_pass);
end; $$;
grant execute on function public.create_member(text, text, text, text, text) to authenticated;

-- 5c. Restablecer la clave de un miembro (solo admin de la misma empresa / dueño).
create or replace function public.reset_member_password(p_user_id text, p_pass text)
returns json language plpgsql security definer
set search_path = public, auth, extensions as $$
declare v_tid text; v_rol text; v_target_tid text;
begin
  v_tid := public.auth_tenant_id();
  v_rol := public.auth_rol();
  if v_rol is distinct from 'admin' and v_rol is distinct from 'dueno' then
    raise exception 'Solo un administrador puede restablecer claves.';
  end if;
  if coalesce(p_pass,'') = '' then raise exception 'Clave requerida.'; end if;
  select tenant_id into v_target_tid from public.usuarios where id = p_user_id;
  if v_target_tid is null then raise exception 'Usuario no encontrado.'; end if;
  if v_rol = 'admin' and v_target_tid is distinct from v_tid then
    raise exception 'No puedes modificar usuarios de otra empresa.';
  end if;
  update auth.users
    set encrypted_password = extensions.crypt(p_pass, extensions.gen_salt('bf')), updated_at = now()
    where id = p_user_id::uuid;
  update public.usuarios set pass = p_pass where id = p_user_id;
  return json_build_object('ok', true);
end; $$;
grant execute on function public.reset_member_password(text, text) to authenticated;

-- 5c-bis. Eliminar un miembro (perfil + credencial Auth). Solo admin de la misma
--     empresa / dueño. Borra también auth.users para poder reusar el nombre.
create or replace function public.delete_member(p_user_id text)
returns json language plpgsql security definer
set search_path = public, auth, extensions as $$
declare v_tid text; v_rol text; v_target_tid text;
begin
  v_tid := public.auth_tenant_id();
  v_rol := public.auth_rol();
  if v_rol is distinct from 'admin' and v_rol is distinct from 'dueno' then
    raise exception 'Solo un administrador puede eliminar usuarios.';
  end if;
  if p_user_id = auth.uid()::text then raise exception 'No puedes eliminar tu propia cuenta.'; end if;
  select tenant_id into v_target_tid from public.usuarios where id = p_user_id;
  if v_target_tid is null then raise exception 'Usuario no encontrado.'; end if;
  if v_rol = 'admin' and v_target_tid is distinct from v_tid then
    raise exception 'No puedes eliminar usuarios de otra empresa.';
  end if;
  delete from public.usuarios where id = p_user_id;
  delete from auth.users where id = p_user_id::uuid;
  return json_build_object('ok', true);
end; $$;
grant execute on function public.delete_member(text) to authenticated;

-- 5d. Activar / desactivar una empresa (solo dueño).
create or replace function public.set_tenant_active(p_tid text, p_activo boolean)
returns json language plpgsql security definer
set search_path = public as $$
begin
  if public.auth_rol() is distinct from 'dueno' then
    raise exception 'Solo el dueño puede cambiar el estado de una empresa.';
  end if;
  update public.tenants set activo = p_activo where id = p_tid;
  return json_build_object('ok', true);
end; $$;
grant execute on function public.set_tenant_active(text, boolean) to authenticated;


-- ── 6. MIGRACIÓN one-time de usuarios existentes a Auth ──────────────────────
-- *** ANTES DE EMPEZAR: edita estas 2 líneas con el correo y la clave NUEVA
--     del DUEÑO (reemplaza el viejo CAMBIA_ESTA_CLAVE). ***
do $migra$
declare
  v_dueno_email text := 'CAMBIAME@tu-correo.com';   -- <<< EDITA (no subir credenciales reales al repo)
  v_dueno_pass  text := 'CAMBIA-esta-clave-fuerte';  -- <<< EDITA (no subir credenciales reales al repo)
  r record; v_email text; v_pass text; v_slug text; v_uid uuid;
begin
  if v_dueno_email = 'CAMBIAME@tu-correo.com' or v_dueno_pass = 'CAMBIA-esta-clave-fuerte' then
    raise exception 'Edita v_dueno_email y v_dueno_pass antes de correr la migración.';
  end if;

  for r in select * from public.usuarios loop
    -- ¿ya migrado? (id ya es un UUID válido y existe en auth.users)
    begin
      if exists (select 1 from auth.users au where au.id = r.id::uuid) then
        continue;
      end if;
    exception when invalid_text_representation then
      null; -- r.id no es UUID ⇒ aún sin migrar, seguimos
    end;

    if r.rol = 'dueno' then
      v_email := lower(trim(v_dueno_email));
      v_pass  := v_dueno_pass;
    else
      select slug into v_slug from public.tenants where id = r.tenant_id;
      v_slug  := coalesce(nullif(v_slug,''), 'empresa');
      -- SIEMPRE email sintético: capturadores/gerentes entran por «Equipo» y la
      -- app arma nombre@slug.tomfic.app. Ignoramos su correo de contacto.
      v_email := public.member_email(r.nombre, v_slug);
      v_pass  := coalesce(nullif(r.pass,''), 'tomfic123');
    end if;

    if exists (select 1 from auth.users where email = v_email) then
      raise notice 'Email ya existe, se omite usuario %', r.nombre;
      continue;
    end if;

    v_uid := public._create_auth_user(v_email, v_pass);
    update public.usuarios set id = v_uid::text, email = v_email where id = r.id;
    raise notice 'Migrado usuario % rol % email %', r.nombre, r.rol, v_email;
  end loop;
end $migra$;


-- ── 7. POLÍTICAS RLS (se CREAN aquí, pero RLS queda APAGADO hasta la Etapa 3) ─
-- Predicados base: auth_tenant_id() = empresa del que llama · auth_rol()='dueno'.

-- usuarios
drop policy if exists usuarios_select on public.usuarios;
create policy usuarios_select on public.usuarios for select using (
  id = auth.uid()::text or tenant_id = public.auth_tenant_id() or public.auth_rol() = 'dueno'
);
drop policy if exists usuarios_update on public.usuarios;
create policy usuarios_update on public.usuarios for update using (
  public.auth_rol() = 'dueno'
  or (tenant_id = public.auth_tenant_id() and public.auth_rol() in ('admin'))
  or id = auth.uid()::text
) with check (
  public.auth_rol() = 'dueno'
  or (tenant_id = public.auth_tenant_id() and public.auth_rol() in ('admin'))
  or id = auth.uid()::text
);
drop policy if exists usuarios_delete on public.usuarios;
create policy usuarios_delete on public.usuarios for delete using (
  public.auth_rol() = 'dueno' or (tenant_id = public.auth_tenant_id() and public.auth_rol() = 'admin')
);
drop policy if exists usuarios_insert on public.usuarios;
create policy usuarios_insert on public.usuarios for insert with check (public.auth_rol() = 'dueno');

-- Datos de empresa: productos / inventarios / conteos (mismo patrón).
do $pol$
declare t text;
begin
  foreach t in array array['productos','inventarios','conteos'] loop
    execute format('drop policy if exists %1$s_all on public.%1$s', t);
    execute format($p$
      create policy %1$s_all on public.%1$s for all
      using (tenant_id = public.auth_tenant_id() or public.auth_rol() = 'dueno')
      with check (tenant_id = public.auth_tenant_id() or public.auth_rol() = 'dueno');
    $p$, t);
  end loop;
end $pol$;

-- tenants: el dueño todo; un miembro solo lee su propia empresa.
drop policy if exists tenants_select on public.tenants;
create policy tenants_select on public.tenants for select using (
  public.auth_rol() = 'dueno' or id = public.auth_tenant_id()
);
drop policy if exists tenants_write on public.tenants;
create policy tenants_write on public.tenants for all using (public.auth_rol() = 'dueno')
  with check (public.auth_rol() = 'dueno');

-- app_config: 'landing' es público (la web lo lee sin sesión). Config por-tenant
-- accesible por sus miembros. Escritura: dueño (landing) o el propio tenant.
drop policy if exists appconfig_select on public.app_config;
create policy appconfig_select on public.app_config for select using (
  key = 'landing'
  or public.auth_rol() = 'dueno'
  or key = 'tenant:' || coalesce(public.auth_tenant_id(), '') || ':config'
);
drop policy if exists appconfig_write on public.app_config;
create policy appconfig_write on public.app_config for all using (
  public.auth_rol() = 'dueno'
  or (public.auth_tenant_id() is not null
      and key = 'tenant:' || public.auth_tenant_id() || ':config')
) with check (
  public.auth_rol() = 'dueno'
  or (public.auth_tenant_id() is not null
      and key = 'tenant:' || public.auth_tenant_id() || ':config')
);

-- ============================  FIN ETAPA 1  =================================
-- Detente aquí. Pasa la app a Auth (frontend) y verifica TODO con RLS apagado.



-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  ETAPA 3 — HABILITAR RLS  (corre esto SOLO cuando el frontend ya funciona) ║
-- ╚══════════════════════════════════════════════════════════════════════════╝
-- alter table public.usuarios   enable row level security;
-- alter table public.productos  enable row level security;
-- alter table public.inventarios enable row level security;
-- alter table public.conteos    enable row level security;
-- alter table public.tenants    enable row level security;
-- alter table public.app_config enable row level security;
--
-- Si algo se rompe, se revierte al instante con:
--   alter table public.<tabla> disable row level security;



-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  ETAPA 4 — LIMPIEZA Y CIERRE DE SEGURIDAD  (al final de todo)              ║
-- ╚══════════════════════════════════════════════════════════════════════════╝
-- Nota: la columna `pass` se mantiene SOLO para los códigos de acceso de
-- capturadores/gerentes (que el admin necesita re-compartir). Las claves de
-- admin/dueño NO se guardan en texto: viven hasheadas en auth.users.
-- Si prefieres no guardar NINGUNA clave en claro, descomenta:
--   update public.usuarios set pass = null;        -- borra todos los códigos
--   alter table public.usuarios drop column pass;   -- y elimina la columna
--
-- Verificación final:
--   - El DUEÑO entra con su email + clave nueva; CAMBIA_ESTA_CLAVE y admin123 ya no sirven.
--   - Sin sesión, `select * from app_config where key='landing'` funciona (web pública).
--   - Con sesión de una empresa, `select * from productos` solo devuelve los suyos.
