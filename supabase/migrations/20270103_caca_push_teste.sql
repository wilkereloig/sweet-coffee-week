-- Teste de push apenas para o aparelho associado ao mapa; o provedor aceitar não garante exibição.
alter table public.caca_push add column if not exists ultimo_teste_em timestamptz;

create or replace function public.caca_push_verificar_aparelho(p_chave text, p_endpoint text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_mapa uuid; v_prefs jsonb; v_n integer;
begin
  select id into v_mapa from public.mapas_lover where chave_hash = public.mapa_hash(p_chave);
  if v_mapa is null or p_endpoint is null then return jsonb_build_object('ok', false, 'motivo', 'sem_assinatura'); end if;
  select prefs into v_prefs from public.caca_push where mapa_id = v_mapa and ativo and endpoint_hash = public.mapa_hash(p_endpoint);
  if v_prefs is null then return jsonb_build_object('ok', false, 'motivo', 'sem_assinatura'); end if;
  select count(*) into v_n from public.caca_push where mapa_id = v_mapa and ativo;
  return jsonb_build_object('ok', true, 'prefs', v_prefs, 'dispositivos', v_n);
end $$;
revoke all on function public.caca_push_verificar_aparelho(text, text) from public, anon, authenticated;
grant execute on function public.caca_push_verificar_aparelho(text, text) to anon, authenticated;

create or replace function public.caca_push_preparar_teste(p_chave text, p_endpoint text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_mapa uuid; v_push public.caca_push%rowtype;
begin
  select id into v_mapa from public.mapas_lover where chave_hash = public.mapa_hash(p_chave);
  if v_mapa is null or p_endpoint is null then return jsonb_build_object('ok', false, 'motivo', 'sem_assinatura'); end if;
  select * into v_push from public.caca_push where mapa_id = v_mapa and ativo and endpoint_hash = public.mapa_hash(p_endpoint) for update;
  if v_push.id is null then return jsonb_build_object('ok', false, 'motivo', 'sem_assinatura'); end if;
  if v_push.ultimo_teste_em > now() - interval '1 minute' then return jsonb_build_object('ok', false, 'motivo', 'limitado'); end if;
  update public.caca_push set ultimo_teste_em = now() where id = v_push.id;
  return jsonb_build_object('ok', true, 'aparelho', jsonb_build_object('endpoint', v_push.endpoint, 'p256dh', v_push.p256dh, 'auth_chave', v_push.auth_chave));
end $$;
revoke all on function public.caca_push_preparar_teste(text, text) from public, anon, authenticated;
grant execute on function public.caca_push_preparar_teste(text, text) to service_role;
