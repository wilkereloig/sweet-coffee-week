-- Caça: aviso da campanha "Ter com quem contar" (Sicredi). ADITIVA sobre 20261232. Nada é enviado por esta migration:
-- o gerador só trabalha com `caca_config.avisos_auto` ligado E `caca_config.campanha_sicredi.ligada = true` (padrão: desligada).
--
-- O que muda:
--   1. categoria nova 'campanha' (preferência própria, padrão DESLIGADA: só chega como push para quem escolheu; na central aparece sempre);
--   2. caca_campanha_gerar(): uma mensagem por pessoa por dia, só dentro da janela do dia (hora de Fortaleza), até a data final da campanha
--      (padrão 2026-11-11), no máximo uma por dia (dedupe `camp:sicredi:<dia>`); quem entra no mapa depois, no mesmo dia, entra no mesmo aviso;
--   3. o ciclo (15 min) passa a chamar o gerador, com erro isolado como os outros.
-- Configuração (caca_config 'campanha_sicredi'): {"ligada":false,"fim":"2026-11-11","hora":10,"janela_horas":4,"destino":"/cartoon/ter-com-quem-contar"}.
-- Regras de texto: nunca "sorteio" (jornalistas escolhem 10 histórias; cada uma ganha um par de vouchers); não promete resultado nem data.
-- reverter: restaurar caca_avisos_ciclo, caca_push_prefs_norm e caca_push_registrar de 20261232; drop function public.caca_campanha_gerar(timestamptz);
--   delete from caca_aviso where categoria = 'campanha'; restaurar a constraint de categoria sem 'campanha'.

-- ---------------------------------------------------------------- 1. categoria + preferência
alter table public.caca_aviso drop constraint if exists caca_aviso_categoria_check;
alter table public.caca_aviso add constraint caca_aviso_categoria_check
  check (categoria in ('avaliacao_pendente', 'meta', 'grupo', 'edicao', 'voucher', 'imprevisto', 'incentivo', 'premio', 'campanha'));

create or replace function public.caca_push_prefs_norm(p jsonb)
 returns jsonb language sql immutable set search_path to 'public'
as $$
  select coalesce(jsonb_object_agg(k, p -> k), '{}'::jsonb)
    from unnest(array['avaliacao_pendente', 'meta', 'grupo', 'edicao', 'voucher', 'imprevisto', 'incentivo', 'premio', 'campanha']) k
   where jsonb_typeof(p -> k) = 'boolean'
$$;
revoke all on function public.caca_push_prefs_norm(jsonb) from public, anon, authenticated;

create or replace function public.caca_push_registrar(p_chave text, p_subscription jsonb, p_prefs jsonb default null)
 returns jsonb language plpgsql security definer set search_path to 'public'
as $$
declare m public.mapas_lover%rowtype; v_ep text; v_p text; v_a text; v_hash text; v_prefs jsonb; v_n int;
  v_padrao constant jsonb := '{"avaliacao_pendente":true,"meta":true,"grupo":true,"edicao":false,"voucher":false,"imprevisto":true,"incentivo":true,"premio":true,"campanha":false}';
begin
  select * into m from public.mapas_lover where chave_hash = public.mapa_hash(p_chave);
  if m.id is null then return jsonb_build_object('ok', false, 'motivo', 'mapa_desconhecido'); end if;

  v_ep := p_subscription ->> 'endpoint'; v_p := p_subscription -> 'keys' ->> 'p256dh'; v_a := p_subscription -> 'keys' ->> 'auth';
  if v_ep is null or char_length(v_ep) > 2048
     or v_ep !~ '^https://(fcm\.googleapis\.com|android\.googleapis\.com|updates\.push\.services\.mozilla\.com|[a-z0-9.-]+\.push\.services\.mozilla\.com|web\.push\.apple\.com|[a-z0-9.-]+\.push\.apple\.com|[a-z0-9.-]+\.notify\.windows\.com)/[^\s]+$'
     or v_p is null or v_p !~ '^[A-Za-z0-9_-]{80,100}$'
     or v_a is null or v_a !~ '^[A-Za-z0-9_-]{16,32}$'
  then return jsonb_build_object('ok', false, 'motivo', 'assinatura_invalida'); end if;
  v_hash := public.mapa_hash(v_ep);

  perform pg_advisory_xact_lock(hashtextextended('caca_push:' || m.id::text, 0));
  select count(*) into v_n from public.caca_push where mapa_id = m.id and ativo and endpoint_hash <> v_hash;
  if v_n >= 5 then return jsonb_build_object('ok', false, 'motivo', 'limite_dispositivos'); end if;

  v_prefs := v_padrao
          || coalesce((select c.prefs from public.caca_push c where c.mapa_id = m.id and c.ativo
                        order by c.atualizado_em desc limit 1), '{}'::jsonb)
          || public.caca_push_prefs_norm(p_prefs);
  insert into public.caca_push (mapa_id, endpoint_hash, endpoint, p256dh, auth_chave, prefs)
  values (m.id, v_hash, v_ep, v_p, v_a, v_prefs)
  on conflict (endpoint_hash) do update
     set mapa_id = excluded.mapa_id, endpoint = excluded.endpoint, p256dh = excluded.p256dh, auth_chave = excluded.auth_chave,
         prefs = excluded.prefs, ativo = true, atualizado_em = now();
  return jsonb_build_object('ok', true, 'prefs', v_prefs, 'dispositivos', v_n + 1);
end $$;
revoke all on function public.caca_push_registrar(text, jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.caca_push_registrar(text, jsonb, jsonb) to anon, authenticated;

-- aparelhos já assinados ganham a chave desligada (o que a pessoa já escolheu não muda)
update public.caca_push set prefs = '{"campanha":false}'::jsonb || prefs where not (prefs ? 'campanha');

-- ---------------------------------------------------------------- 2. gerador da campanha
create or replace function public.caca_campanha_gerar(p_agora timestamptz default now())
 returns jsonb language plpgsql volatile security definer set search_path to 'public'
as $$
declare v_auto jsonb; v_cfg jsonb; v_ed text; v_loc timestamp; v_dia date; v_h int; v_hora int; v_jan int; v_fim date;
  v_dest text; v_chave text; v_titulo text; v_corpo text; v_ate timestamptz; v_id uuid; v_novo boolean := false; v_n int; v_ids jsonb;
begin
  select valor into v_auto from public.caca_config where chave = 'avisos_auto';
  if coalesce((v_auto ->> 'ligado')::boolean, false) is not true then return jsonb_build_object('ok', true, 'ligado', false); end if;
  v_cfg := '{"ligada":false,"fim":"2026-11-11","hora":10,"janela_horas":4,"destino":"/cartoon/ter-com-quem-contar"}'::jsonb
        || coalesce((select case when jsonb_typeof(valor) = 'object' then valor end from public.caca_config where chave = 'campanha_sicredi'), '{}'::jsonb);
  if coalesce((v_cfg ->> 'ligada')::boolean, false) is not true then return jsonb_build_object('ok', true, 'campanha', false); end if;

  select edicao_codigo into v_ed from public.edicao_publicacao order by edicao_codigo desc limit 1;
  if v_ed is null then return jsonb_build_object('ok', true, 'sem_edicao', true); end if;

  v_fim := (v_cfg ->> 'fim')::date;
  v_dest := v_cfg ->> 'destino';
  if v_dest is null or v_dest !~ '^/(?!/)[A-Za-z0-9/_-]*$' then return jsonb_build_object('ok', false, 'destino_invalido', true); end if;
  v_loc := p_agora at time zone 'America/Fortaleza'; v_dia := v_loc::date; v_h := extract(hour from v_loc)::int;
  v_hora := least(greatest((v_cfg ->> 'hora')::int, 8), 20); v_jan := least(greatest((v_cfg ->> 'janela_horas')::int, 1), 8);
  if v_dia > v_fim then return jsonb_build_object('ok', true, 'encerrada', true, 'dia', v_dia); end if;
  if v_h < v_hora or v_h >= v_hora + v_jan then return jsonb_build_object('ok', true, 'fora_do_horario', true, 'dia', v_dia); end if;

  if v_dia = v_fim then
    v_titulo := 'Último dia: Ter com quem contar';
    v_corpo := 'Hoje termina o prazo para publicar o seu vídeo no feed com #TerComQuemContar. Dez histórias ganham um par de vouchers. Veja como participar.';
  else
    v_titulo := 'Ter com quem contar';
    v_corpo := 'Grave um vídeo de até 1 minuto sobre quem esteve ao seu lado e publique no feed até 11/11 com #TerComQuemContar. Dez histórias ganham um par de vouchers.';
  end if;
  v_ate := ((v_dia + 1)::timestamp at time zone 'America/Fortaleza');
  v_chave := 'camp:sicredi:' || v_dia;

  select coalesce(jsonb_agg(to_jsonb(m2.id)), '[]'::jsonb), count(*)::int into v_ids, v_n
    from public.mapas_lover m2
   where m2.edicao_codigo = v_ed and m2.id = public.caca_mapa_principal(v_ed, m2.email_norm);
  if v_n = 0 then return jsonb_build_object('ok', true, 'sem_mapas', true); end if;

  insert into public.caca_aviso (edicao_codigo, categoria, titulo, corpo, destino, publico, vigente_ate, estado, origem, chave_dedupe,
                                 criado_por, enviado_em, enviado_por, alvos)
  values (v_ed, 'campanha', left(v_titulo, 80), left(v_corpo, 240), v_dest, jsonb_build_object('tipo', 'mapas', 'ids', v_ids), v_ate,
          'enviado', 'automatico', v_chave, 'campanha', p_agora, 'campanha', v_n)
  on conflict (chave_dedupe) do nothing returning id into v_id;
  if v_id is not null then
    v_novo := true;
  else
    select a.id into v_id from public.caca_aviso a where a.chave_dedupe = v_chave;
  end if;
  -- quem ainda não está no aviso (mapa novo do dia) entra nele; quem já está não muda
  insert into public.caca_aviso_entrega (aviso_id, mapa_id)
  select v_id, (j #>> '{}')::uuid from jsonb_array_elements(v_ids) j on conflict do nothing;
  update public.caca_aviso set alvos = (select count(*) from public.caca_aviso_entrega e where e.aviso_id = v_id) where id = v_id;
  return jsonb_build_object('ok', true, 'dia', v_dia, 'avisos', case when v_novo then 1 else 0 end, 'pessoas', v_n);
end $$;
revoke all on function public.caca_campanha_gerar(timestamptz) from public, anon, authenticated;

-- ---------------------------------------------------------------- 3. o ciclo chama o gerador (o resto é idêntico a 20261232)
create or replace function public.caca_avisos_ciclo()
 returns void language plpgsql security definer set search_path to 'public', 'extensions'
as $$
declare v_erros jsonb := '{}'::jsonb; v_pend int; v_push text := 'nada_a_enviar';
begin
  begin perform public.caca_avisos_gerar_automaticos(); exception when others then v_erros := v_erros || jsonb_build_object('automaticos', sqlerrm); end;
  begin perform public.caca_avisos_gerar_premios(); exception when others then v_erros := v_erros || jsonb_build_object('premios', sqlerrm); end;
  begin perform public.caca_programacao_gerar(); exception when others then v_erros := v_erros || jsonb_build_object('programacao', sqlerrm); end;
  begin perform public.caca_campanha_gerar(); exception when others then v_erros := v_erros || jsonb_build_object('campanha', sqlerrm); end;
  v_pend := cardinality(public.caca_avisos_para_processar());
  if v_pend > 0 then
    begin
      perform net.http_post(url := 'https://dgfmoibynftadsyjcclg.supabase.co/functions/v1/caca-push',
        body := jsonb_build_object('ciclo', true), headers := jsonb_build_object('Content-Type', 'application/json'));
      v_push := 'pedido_enviado';
    exception when others then v_erros := v_erros || jsonb_build_object('push', sqlerrm); v_push := 'falhou';
    end;
  end if;
  insert into public.caca_config (chave, valor, nota, atualizado_em, atualizado_por)
  values ('avisos_ciclo_estado', jsonb_build_object('em', now(), 'avisos_com_push_pendente', v_pend, 'push', v_push, 'erros', v_erros),
          'Último ciclo do agendador dos avisos (só leitura: o ciclo grava aqui).', now(), 'agendador')
  on conflict (chave) do update set valor = excluded.valor, atualizado_em = now(), atualizado_por = 'agendador';
end $$;
revoke all on function public.caca_avisos_ciclo() from public, anon, authenticated;
