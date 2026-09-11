-- Cierre atómico de una ronda para evitar que C1 y C2 se sobrescriban.
-- Ejecutar en Supabase SQL Editor.
alter table public.conteos add column if not exists c1_cerrado boolean not null default false;
alter table public.conteos add column if not exists c2_cerrado boolean not null default false;
alter table public.conteos add column if not exists c3_cerrado boolean not null default false;

update public.conteos
set c1_cerrado = c1_cerrado or coalesce(rondas_cerradas like '%"C1"%',false),
    c2_cerrado = c2_cerrado or coalesce(rondas_cerradas like '%"C2"%',false),
    c3_cerrado = c3_cerrado or coalesce(rondas_cerradas like '%"C3"%',false);
create or replace function public.close_count_round(p_count_id text, p_round text)
returns json language plpgsql security definer
set search_path = public, auth as $$
declare v_tenant text; v_rounds jsonb; v_merged text;
begin
  if p_round not in ('C1','C2','C3') then raise exception 'Ronda inválida.'; end if;
  v_tenant:=public.auth_tenant_id();
  if v_tenant is null then raise exception 'No tienes una empresa asociada.'; end if;
  select coalesce(nullif(rondas_cerradas,'')::jsonb,'[]'::jsonb)
    into v_rounds from public.conteos
    where id=p_count_id and tenant_id=v_tenant for update;
  if not found then raise exception 'Conteo no encontrado.'; end if;
  select jsonb_agg(to_jsonb(round_name) order by round_name)::text into v_merged
  from (select distinct value as round_name from jsonb_array_elements_text(v_rounds||jsonb_build_array(p_round))) rounds;
  update public.conteos
  set rondas_cerradas=v_merged,
      c1_cerrado=case when p_round='C1' then true else c1_cerrado end,
      c2_cerrado=case when p_round='C2' then true else c2_cerrado end,
      c3_cerrado=case when p_round='C3' then true else c3_cerrado end
  where id=p_count_id and tenant_id=v_tenant;
  return json_build_object('id',p_count_id,'rondas_cerradas',v_merged::jsonb,'c1_cerrado',case when p_round='C1' then true else false end,'c2_cerrado',case when p_round='C2' then true else false end,'c3_cerrado',case when p_round='C3' then true else false end);
end; $$;
grant execute on function public.close_count_round(text,text) to authenticated;

create or replace function public.reopen_count_round(p_count_id text, p_round text)
returns json language plpgsql security definer
set search_path = public, auth as $$
declare v_tenant text; v_rounds jsonb; v_merged text;
begin
  if p_round not in ('C1','C2','C3') then raise exception 'Ronda inválida.'; end if;
  v_tenant:=public.auth_tenant_id();
  if v_tenant is null then raise exception 'No tienes una empresa asociada.'; end if;
  select coalesce(nullif(rondas_cerradas,'')::jsonb,'[]'::jsonb)
    into v_rounds from public.conteos
    where id=p_count_id and tenant_id=v_tenant for update;
  if not found then raise exception 'Conteo no encontrado.'; end if;
  select coalesce(jsonb_agg(to_jsonb(round_name) order by round_name),'[]'::jsonb)::text into v_merged
  from (select distinct value as round_name from jsonb_array_elements_text(v_rounds) where value<>p_round) rounds;
  update public.conteos
  set rondas_cerradas=v_merged,
      c1_cerrado=case when p_round='C1' then false else c1_cerrado end,
      c2_cerrado=case when p_round='C2' then false else c2_cerrado end,
      c3_cerrado=case when p_round='C3' then false else c3_cerrado end
  where id=p_count_id and tenant_id=v_tenant;
  return json_build_object('id',p_count_id,'rondas_cerradas',v_merged::jsonb);
end; $$;
grant execute on function public.reopen_count_round(text,text) to authenticated;
