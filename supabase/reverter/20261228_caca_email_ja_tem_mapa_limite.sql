-- Reverte 20261228: `mapa_criar_v2` volta ao corpo de 20261225 (um mapa por e-mail, sem o segundo limite por IP da resposta `email_ja_tem_mapa`).
-- As linhas 'ja:' que ficarem em `mapa_criar_ip` são apagadas sozinhas pela limpeza de 2 dias da própria função.
create or replace function public.mapa_criar_v2(p_edicao text, p_apelido text, p_email text, p_whatsapp text, p_ranking boolean, p_aceite boolean)
 returns jsonb language plpgsql security definer set search_path to 'public'
as $$
declare v_email text := lower(btrim(coalesce(p_email, ''))); v_ip text; v_h text;
begin
  if v_email !~ '^[a-z0-9._%+-]{1,64}@[a-z0-9.-]{1,190}\.[a-z]{2,24}$' or char_length(v_email) > 254 then
    raise exception 'email_invalido';
  end if;
  perform pg_advisory_xact_lock(hashtext('mapa_criar:' || p_edicao || ':' || v_email));
  if (select count(*) from public.mapas_lover where edicao_codigo = p_edicao and email_norm = v_email
                                                and criado_em > now() - interval '24 hours') >= 5 then
    raise exception 'muitos_pedidos';
  end if;
  v_ip := nullif(btrim(coalesce((nullif(current_setting('request.headers', true), '')::json) ->> 'cf-connecting-ip', '')), '');
  if v_ip is not null then
    v_h := public.caca_hash_texto('ip:' || v_ip);
    delete from public.mapa_criar_ip where criado_em < now() - interval '2 days';
    if (select count(*) from public.mapa_criar_ip where ip_hash = v_h and criado_em > now() - interval '10 minutes') >= 60 then
      raise exception 'muitos_pedidos';
    end if;
    insert into public.mapa_criar_ip (ip_hash) values (v_h);
  end if;
  if exists (select 1 from public.mapas_lover where edicao_codigo = p_edicao and email_norm = v_email) then
    return jsonb_build_object('ok', false, 'motivo', 'email_ja_tem_mapa');
  end if;
  return public.mapa_criar(p_edicao, p_apelido, p_email, p_whatsapp, p_ranking, p_aceite);
end $$;
