-- Caça aos Carimbos — link pessoal por e-mail, SÓ depois de confirmar o e-mail (05/11/2026, pedido do Wilker).
--
-- O servidor guarda só o HASH da chave do mapa (mapas_lover.chave_hash), então não consegue montar o link sozinho:
-- o app manda a chave no pedido e a edge function `caca-email` (finalidade 'link') só envia depois desta função confirmar
-- que (1) a chave é de um mapa desta edição, (2) o e-mail do pedido é o e-mail desse mapa e (3) esse e-mail JÁ foi
-- confirmado por código. Quem cria um mapa com o e-mail de outra pessoa nunca passa do passo 3 (não lê o código).
--
-- Resposta uniforme: nada aqui diz se o mapa existe. Limites: 1 por minuto e 5 por hora por mapa; 40 por 10 minutos por IP
-- (hash, a mesma tabela do pedido de código). Função interna: só service_role executa; anon e authenticated não.
-- Reverter: supabase/reverter/20261222_caca_link_por_email.sql

create or replace function public.mapa_link_validar_interno(p_edicao text, p_email text, p_chave text, p_ip text default null)
 returns jsonb language plpgsql volatile security definer set search_path to 'public'
as $$
declare v_email text := lower(btrim(coalesce(p_email, ''))); v_ip text; v_h text; v_mapa public.mapas_lover%rowtype;
  v_b bytea; v_pad text;
begin
  if char_length(v_email) > 254 or v_email !~ '^[a-z0-9._%+-]{1,64}@[a-z0-9.-]{1,190}\.[a-z]{2,24}$'
     or nullif(btrim(coalesce(p_chave, '')), '') is null or char_length(p_chave) > 200
     or not exists (select 1 from public.edicao_publicacao where edicao_codigo = p_edicao) then
    return jsonb_build_object('ok', true, 'enviar', false);
  end if;

  if nullif(btrim(coalesce(p_ip, '')), '') is not null then
    v_ip := public.caca_hash_texto('link-ip:' || btrim(p_ip));
    delete from public.mapa_criar_ip where criado_em < now() - interval '2 days';
    if (select count(*) from public.mapa_criar_ip where ip_hash = v_ip and criado_em > now() - interval '10 minutes') >= 40 then
      return jsonb_build_object('ok', true, 'enviar', false, 'limitado', true);
    end if;
    insert into public.mapa_criar_ip (ip_hash) values (v_ip);
  end if;

  select * into v_mapa from public.mapas_lover
   where chave_hash = public.mapa_hash(p_chave) and edicao_codigo = p_edicao and email_norm = v_email;

  -- Limite por mapa (por e-mail quando não há mapa, para a resposta não mudar): 1/min e 5/h.
  v_h := public.caca_hash_texto('link:' || p_edicao || ':' || coalesce(v_mapa.id::text, v_email));
  perform pg_advisory_xact_lock(hashtext(v_h));
  delete from public.mapa_codigo_pedido where criado_em < now() - interval '2 days';
  if exists (select 1 from public.mapa_codigo_pedido where email_hash = v_h and criado_em > now() - interval '1 minute')
     or (select count(*) from public.mapa_codigo_pedido where email_hash = v_h and criado_em > now() - interval '1 hour') >= 5 then
    return jsonb_build_object('ok', true, 'enviar', false, 'limitado', true);
  end if;
  insert into public.mapa_codigo_pedido (email_hash) values (v_h);

  -- Sem mapa, ou e-mail ainda não confirmado: não envia. Faz o mesmo trabalho de gravação para a resposta ter o mesmo tempo.
  if v_mapa.id is null or v_mapa.email_confirmado_em is null then
    v_b := extensions.gen_random_bytes(4);
    v_pad := public.caca_hash_texto('padding-link:' || gen_random_uuid() || ':' || get_byte(v_b, 0));
    insert into public.mapa_codigo_pedido (email_hash) values ('pad:' || v_pad);
    return jsonb_build_object('ok', true, 'enviar', false);
  end if;
  return jsonb_build_object('ok', true, 'enviar', true);
end $$;

revoke all on function public.mapa_link_validar_interno(text, text, text, text) from public, anon, authenticated;
grant execute on function public.mapa_link_validar_interno(text, text, text, text) to service_role;
