-- Caça: aviso diário do voucher em disputa, para TODOS os mapas (sino da central). ADITIVA sobre 20261232 / 20261234.
-- Pedido do Wilker (06/11/2026): "alertar que amanhã todo mundo está concorrendo a um voucher". Hoje o aviso de prêmio
-- (caca_avisos_gerar_premios) só chega a quem já foi SELECIONADO; ninguém recebia "tem voucher em disputa".
--
-- O que muda:
--   1. caca_voucher_aviso_gerar(): um aviso por dia, às 10h de Fortaleza (janela de 4 h), enquanto houver voucher em disputa:
--        · dia de voucher (caca_premiacao_config.voucher_dias)  → "Hoje tem 1 voucher em disputa";
--        · véspera de um dia de voucher                          → "Amanhã tem 1 voucher em disputa".
--      Categoria 'voucher' (já existe; push dela é opt-in no aparelho, a central mostra sempre). Destino: aba Prêmios do mapa.
--      Dedupe `voucher:aviso:<dia>`; quem cria o mapa depois, no mesmo dia, entra no mesmo aviso. Uma entrega por pessoa (mapa principal).
--   2. o ciclo (15 min) passa a chamar o gerador, com erro isolado como os outros.
-- Configuração (caca_config 'voucher_aviso'): {"ligado":true,"hora":10,"janela_horas":4}. `ligado:false` desliga só este aviso;
--   `avisos_auto.ligado:false` desliga todos os automáticos.
-- Regras de texto (regulamento): NUNCA diz que "todos concorrem" nem "sorteio": quem fica com o voucher do dia é quem tem mais casas
--   diferentes validadas até o corte (empate: extras; depois sorteio entre empatados). Não anuncia resultado, não promete.
-- reverter: supabase/reverter/20270105_caca_voucher_aviso_diario.sql

-- ---------------------------------------------------------------- 1. gerador
create or replace function public.caca_voucher_aviso_gerar(p_agora timestamptz default now())
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare v_auto jsonb; v_cfg jsonb; v_ed text; v_loc timestamp; v_dia date; v_h int; v_hora int; v_jan int;
  v_dias jsonb; v_ini date; v_fim date; v_quando text; v_corte text; v_titulo text; v_corpo text; v_ate timestamptz;
  v_chave text; v_id uuid; v_novo boolean := false; v_n int; v_ids jsonb;
begin
  select valor into v_auto from public.caca_config where chave = 'avisos_auto';
  if coalesce((v_auto ->> 'ligado')::boolean, false) is not true then return jsonb_build_object('ok', true, 'ligado', false); end if;
  v_cfg := '{"ligado":true,"hora":10,"janela_horas":4}'::jsonb
        || coalesce((select case when jsonb_typeof(valor) = 'object' then valor end from public.caca_config where chave = 'voucher_aviso'), '{}'::jsonb);
  if coalesce((v_cfg ->> 'ligado')::boolean, false) is not true then return jsonb_build_object('ok', true, 'voucher_aviso', false); end if;

  select edicao_codigo into v_ed from public.edicao_publicacao order by edicao_codigo desc limit 1;
  if v_ed is null then return jsonb_build_object('ok', true, 'sem_edicao', true); end if;

  v_loc := p_agora at time zone 'America/Fortaleza'; v_dia := v_loc::date; v_h := extract(hour from v_loc)::int;
  v_hora := least(greatest((v_cfg ->> 'hora')::int, 8), 20); v_jan := least(greatest((v_cfg ->> 'janela_horas')::int, 1), 8);
  if v_h < v_hora or v_h >= v_hora + v_jan then return jsonb_build_object('ok', true, 'fora_do_horario', true, 'dia', v_dia); end if;

  v_ini := (public.caca_pcfg('caca_inicio') #>> '{}')::date; v_fim := (public.caca_pcfg('caca_fim') #>> '{}')::date;
  if v_ini is null or v_fim is null or v_dia < v_ini or v_dia > v_fim then return jsonb_build_object('ok', true, 'fora_do_periodo', true, 'dia', v_dia); end if;

  v_dias := coalesce(public.caca_pcfg('voucher_dias'), '[]'::jsonb);
  if jsonb_typeof(v_dias) <> 'array' then return jsonb_build_object('ok', true, 'sem_voucher', true, 'dia', v_dia); end if;
  if v_dias @> to_jsonb(v_dia::text) then v_quando := 'hoje';
  elsif v_dias @> to_jsonb((v_dia + 1)::text) then v_quando := 'amanha';
  else return jsonb_build_object('ok', true, 'sem_voucher', true, 'dia', v_dia);
  end if;

  v_corte := regexp_replace(coalesce(public.caca_pcfg('corte_hora_local') #>> '{}', ''), '^(\d{1,2}):(\d{2}).*$', '\1h\2');
  if v_corte !~ '^\d{1,2}h\d{2}$' then v_corte := null; end if;

  if v_quando = 'hoje' then
    v_titulo := 'Hoje tem 1 voucher em disputa';
    v_corpo := 'Fica com o voucher de hoje quem tiver mais casas diferentes validadas até ' || coalesce('as ' || v_corte, 'o fim do dia')
            || ' (horário de Natal). Quem valida a primeira casa já entra na disputa. Veja em Prêmios.';
  else
    v_titulo := 'Amanhã tem 1 voucher em disputa';
    v_corpo := 'Os carimbos validados a partir de agora já contam. Fica com o voucher de amanhã quem tiver mais casas diferentes validadas até '
            || coalesce('as ' || v_corte, 'o fim do dia') || ' (horário de Natal). Veja em Prêmios.';
  end if;
  v_ate := ((v_dia + 1)::timestamp at time zone 'America/Fortaleza');
  v_chave := 'voucher:aviso:' || v_dia;

  select coalesce(jsonb_agg(to_jsonb(m2.id)), '[]'::jsonb), count(*)::int into v_ids, v_n
    from public.mapas_lover m2
   where m2.edicao_codigo = v_ed and m2.id = public.caca_mapa_principal(v_ed, m2.email_norm);
  if v_n = 0 then return jsonb_build_object('ok', true, 'sem_mapas', true); end if;

  insert into public.caca_aviso (edicao_codigo, categoria, titulo, corpo, destino, publico, vigente_ate, estado, origem, chave_dedupe,
                                 criado_por, enviado_em, enviado_por, alvos)
  values (v_ed, 'voucher', left(v_titulo, 80), left(v_corpo, 240), '/cartoon/mapa?painel=premios', jsonb_build_object('tipo', 'mapas', 'ids', v_ids), v_ate,
          'enviado', 'automatico', v_chave, 'voucher', p_agora, 'voucher', v_n)
  on conflict (chave_dedupe) do nothing returning id into v_id;
  if v_id is not null then
    v_novo := true;
  else
    select a.id into v_id from public.caca_aviso a where a.chave_dedupe = v_chave;
  end if;
  insert into public.caca_aviso_entrega (aviso_id, mapa_id)
  select v_id, (j #>> '{}')::uuid from jsonb_array_elements(v_ids) j on conflict do nothing;
  update public.caca_aviso set alvos = (select count(*) from public.caca_aviso_entrega e where e.aviso_id = v_id) where id = v_id;
  return jsonb_build_object('ok', true, 'dia', v_dia, 'quando', v_quando, 'avisos', case when v_novo then 1 else 0 end, 'pessoas', v_n);
end $function$;
revoke all on function public.caca_voucher_aviso_gerar(timestamptz) from public, anon, authenticated;

-- ---------------------------------------------------------------- 2. o ciclo chama o gerador
create or replace function public.caca_avisos_ciclo()
returns void
language plpgsql
security definer
set search_path to 'public', 'extensions'
as $function$
declare v_erros jsonb := '{}'::jsonb; v_pend int; v_push text := 'nada_a_enviar';
begin
  begin perform public.caca_avisos_gerar_automaticos(); exception when others then v_erros := v_erros || jsonb_build_object('automaticos', sqlerrm); end;
  begin perform public.caca_avisos_gerar_premios(); exception when others then v_erros := v_erros || jsonb_build_object('premios', sqlerrm); end;
  begin perform public.caca_programacao_gerar(); exception when others then v_erros := v_erros || jsonb_build_object('programacao', sqlerrm); end;
  begin perform public.caca_campanha_gerar(); exception when others then v_erros := v_erros || jsonb_build_object('campanha', sqlerrm); end;
  begin perform public.caca_voucher_aviso_gerar(); exception when others then v_erros := v_erros || jsonb_build_object('voucher_aviso', sqlerrm); end;
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
end $function$;
revoke all on function public.caca_avisos_ciclo() from public, anon, authenticated;

-- ---------------------------------------------------------------- 3. configuração visível no painel
insert into public.caca_config (chave, valor, nota, atualizado_em, atualizado_por)
values ('voucher_aviso', '{"ligado":true,"hora":10,"janela_horas":4}'::jsonb,
        'Aviso diário do voucher em disputa (central de todos os mapas; push só para quem ligou "voucher"). ligado=false desliga só este aviso.', now(), 'migration')
on conflict (chave) do nothing;
