-- Cierre atómico de una ronda para evitar que C1 y C2 se sobrescriban.
-- Ejecutar en Supabase SQL Editor.
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
  update public.conteos set rondas_cerradas=v_merged where id=p_count_id and tenant_id=v_tenant;
  return json_build_object('id',p_count_id,'rondas_cerradas',v_merged::jsonb);
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
  update public.conteos set rondas_cerradas=v_merged where id=p_count_id and tenant_id=v_tenant;
  return json_build_object('id',p_count_id,'rondas_cerradas',v_merged::jsonb);
end; $$;
grant execute on function public.reopen_count_round(text,text) to authenticated;
