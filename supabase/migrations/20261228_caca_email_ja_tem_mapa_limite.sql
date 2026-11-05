-- Caça aos Carimbos — limite próprio para "este e-mail já tem mapa" (06/11/2026, revisão de código; ok do Wilker no plano A).
--
-- Problema: `mapa_criar_v2` responde `email_ja_tem_mapa` (JSON, não exceção, para contar no limite por IP). Com apelido e aceite válidos,
-- qualquer pessoa descobre se um e-mail participa da Caça; o teto geral de 60 pedidos / 10 min por IP permitia ~8.600 consultas por dia.
-- A tela PRECISA dessa resposta (leva à recuperação por código), então a resposta fica; a consulta é que encarece.
--
-- Mudança: quando a resposta é `email_ja_tem_mapa`, conta um SEGUNDO limite por IP — 10 respostas dessas em 10 minutos; a 11ª vira
-- `muitos_pedidos`. Usa a tabela `mapa_criar_ip` com outro hash (prefixo 'ja:'), sem tabela nem coluna nova. Quem erra o e-mail
-- uma ou duas vezes não percebe. Reduz a varredura de ~8.600 para ~1.400 por dia por IP; não impede quem usa muitos IPs.
-- Corpo igual ao de 20261225 + o bloco marcado. Reverter: supabase/reverter/20261228_caca_email_ja_tem_mapa_limite.sql

create or replace function public.mapa_criar_v2(p_edicao text, p_apelido text, p_email text, p_whatsapp text, p_ranking boolean, p_aceite boolean)
 returns jsonb language plpgsql security definer set search_path to 'public'
as $$
declare v_email text := lower(btrim(coalesce(p_email, ''))); v_ip text; v_h text; v_hj text;
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
    -- >>> novo: segundo limite por IP só para a resposta que revela que o e-mail participa
    if v_ip is not null then
      v_hj := public.caca_hash_texto('ja:' || v_ip);
      if (select count(*) from public.mapa_criar_ip where ip_hash = v_hj and criado_em > now() - interval '10 minutes') >= 10 then
        raise exception 'muitos_pedidos';
      end if;
      insert into public.mapa_criar_ip (ip_hash) values (v_hj);
    end if;
    -- <<< fim do novo
    return jsonb_build_object('ok', false, 'motivo', 'email_ja_tem_mapa');
  end if;
  return public.mapa_criar(p_edicao, p_apelido, p_email, p_whatsapp, p_ranking, p_aceite);
end $$;
