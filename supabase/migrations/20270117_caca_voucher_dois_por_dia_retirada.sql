-- Caça aos Carimbos: 2 vouchers por dia, de 9 a 13/11, em voucher FÍSICO retirado no Espaço Reduzido (10/11/2026, decisão do Wilker).
--
-- O que NÃO muda: a ordem (mais casas diferentes validadas no corte; empate: carimbos extras; persistindo, sorteio), um voucher por
-- pessoa, e-mail confirmado, prazos, foto imutável do dia. Os dias 7 e 8, já apurados, seguem com 1 voucher e no fluxo digital.
-- O que muda: a quantidade por dia e a forma de entrega passam a ser CONFIGURAÇÃO (caca_premiacao_config), e o dia aceita mais de um
-- ganhador (o 2º é quem vem a seguir na mesma foto do dia, já sem o 1º).
--
-- Única parte não aditiva: sai o índice único "um prêmio ativo por dia"; a trava passa a ser a contagem contra a quantidade do dia,
-- dentro do mesmo cadeado (advisory lock) que a apuração já usa. O índice "um voucher por pessoa" fica.

insert into public.caca_premiacao_config (chave, valor, proposta, nota) values
  ('voucher_qtd_por_dia', '{"padrao":1,"2026-11-09":2,"2026-11-10":2,"2026-11-11":2,"2026-11-12":2,"2026-11-13":2}'::jsonb, false,
   'Vouchers por dia. "padrao" vale para os dias sem valor próprio (7 e 8/11 ficaram com 1).'),
  ('voucher_retirada', '{"desde":"2026-11-09","local":"Espaço Reduzido","endereco":"Av. Abel Cabral, 366, Nova Parnamirim, Parnamirim/RN"}'::jsonb, false,
   'Voucher físico: a partir de "desde", o ganhador retira no local. Antes disso o voucher é digital.')
on conflict (chave) do nothing;

update public.caca_premiacao_config
   set valor = '["2026-11-07","2026-11-08","2026-11-09","2026-11-10","2026-11-11","2026-11-12","2026-11-13"]'::jsonb,
       nota = 'Dias de voucher: 7 e 8/11 com 1; de 9 a 13/11 com 2 (voucher_qtd_por_dia).', atualizado_em = now()
 where chave = 'voucher_dias';

create or replace function public.caca_voucher_qtd(p_dia date)
returns integer language sql stable security definer set search_path to 'public' as $$
  select greatest(coalesce((public.caca_pcfg('voucher_qtd_por_dia') ->> p_dia::text)::int,
                           (public.caca_pcfg('voucher_qtd_por_dia') ->> 'padrao')::int, 1), 1)
$$;

create or replace function public.caca_voucher_fisico(p_dia date)
returns boolean language sql stable security definer set search_path to 'public' as $$
  select coalesce(p_dia >= (public.caca_pcfg('voucher_retirada') ->> 'desde')::date, false)
$$;

revoke all on function public.caca_voucher_qtd(date), public.caca_voucher_fisico(date) from public, anon, authenticated;

drop index if exists public.caca_premio_voucher_dia_ativo;
create index if not exists caca_premio_voucher_dia on public.caca_premio (edicao_codigo, dia) where tipo = 'voucher_dia';

-- Cria o prêmio do dia: agora recusa quando o dia já tem todos os ganhadores e, no voucher físico, guarda o local de retirada.
create or replace function public.caca_premio_dia_criar(p_edicao text, p_dia date, p_pick jsonb, p_substitui uuid, p_segunda boolean, p_nota text)
returns uuid language plpgsql security definer set search_path to 'public' as $function$
declare v_conf boolean; v_estado text; v_prazo timestamptz; v_id uuid; v_ator text := coalesce(public.ator_rotulo_atual(), 'Painel');
begin
  if (select count(*) from public.caca_premio
       where edicao_codigo = p_edicao and tipo = 'voucher_dia' and dia = p_dia and estado in ('selecionado', 'confirmado', 'entregue'))
     >= public.caca_voucher_qtd(p_dia) then
    raise exception 'dia_completo';
  end if;
  v_conf := public.caca_premio_email_ok(p_edicao, p_pick ->> 'pessoa');
  v_estado := case when v_conf then 'confirmado' else 'selecionado' end;
  if not v_conf then
    v_prazo := case when p_segunda
      then now() + make_interval(mins => (public.caca_pcfg('prazo_segunda_chamada_min') #>> '{}')::int)
      else ((p_dia + 1) + make_time((public.caca_pcfg('prazo_confirmacao_proximo_dia_hora') #>> '{}')::int, 0, 0))
           at time zone (public.caca_pcfg('fuso') #>> '{}') end;
  end if;
  insert into public.caca_premio (edicao_codigo, tipo, dia, pessoa, mapa_id, apelido, posicao, estado, prazo_ate, substitui_id,
                                  motivo, semente, detalhe, atualizado_por)
  values (p_edicao, 'voucher_dia', p_dia, p_pick ->> 'pessoa', (p_pick ->> 'mapa_id')::uuid, p_pick ->> 'apelido',
          (p_pick ->> 'pos')::int, v_estado, v_prazo, p_substitui, nullif(btrim(coalesce(p_nota, '')), ''), p_pick ->> 'semente',
          jsonb_build_object('casas', (p_pick ->> 'casas')::int, 'extras', (p_pick ->> 'extras')::int,
                             'desempate', (p_pick ->> 'desempate')::boolean, 'empatados', (p_pick ->> 'empatados')::int,
                             'email_confirmado', v_conf, 'segunda_chamada', p_segunda,
                             'valido_ate', public.caca_pcfg('voucher_validade_ate'))
            || case when public.caca_voucher_fisico(p_dia) then jsonb_build_object('retirada', public.caca_pcfg('voucher_retirada')) else '{}'::jsonb end,
          v_ator)
  returning id into v_id;
  perform public.caca_evento_gravar(p_edicao, v_id, case when p_segunda then 'chamar_proximo' else 'selecionar' end,
                                    null, jsonb_build_object('estado', v_estado, 'prazo_ate', v_prazo, 'dia', p_dia), p_nota);
  return v_id;
end $function$;

-- Apura o dia: chama os próximos da ordem até completar a quantidade do dia. Rodar de novo num dia incompleto só completa.
create or replace function public.caca_apurar_dia(p_secret text, p_edicao text, p_dia date, p_semente text default null::text)
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare v_rel boolean; v_corte timestamptz; v_snap public.caca_apuracao_dia%rowtype; v_rank jsonb; v_ja boolean := true;
        v_ex public.caca_premio%rowtype; v_pick jsonb; v_qtd int; v_ativos int; v_novos int := 0;
begin
  if not public.pode(p_secret, 'edicao.gerir') then raise exception 'nao_autorizado'; end if;
  v_rel := public.pode(p_secret, 'relatorio.ler');
  if coalesce(btrim(p_edicao), '') = '' or p_dia is null then raise exception 'parametro_invalido'; end if;
  if not (public.caca_pcfg('voucher_dias') @> to_jsonb(p_dia::text)) then raise exception 'dia_fora_do_periodo'; end if;
  v_corte := public.caca_corte(p_dia);
  if v_corte > now() then raise exception 'dia_nao_encerrado'; end if;
  perform pg_advisory_xact_lock(hashtext('caca_premio:' || p_edicao));

  select * into v_snap from public.caca_apuracao_dia where edicao_codigo = p_edicao and dia = p_dia;
  if v_snap.dia is null then
    v_ja := false;
    select coalesce(jsonb_agg(jsonb_build_object('pos', r.pos, 'pessoa', r.pessoa, 'mapa_id', r.mapa_id, 'apelido', r.apelido,
             'casas', r.casas, 'extras', r.extras, 'carimbos', r.carimbos) order by r.pos, r.pessoa), '[]'::jsonb)
      into v_rank from public.caca_ranking_v2(p_edicao, v_corte) r;
    insert into public.caca_apuracao_dia (edicao_codigo, dia, corte, total_casas, ranking, hash, criado_por)
    values (p_edicao, p_dia, v_corte, public.caca_total_casas(p_edicao), v_rank,
            encode(extensions.digest(p_edicao || '|' || p_dia::text || '|' || v_corte::text || '|' || v_rank::text, 'sha256'), 'hex'),
            coalesce(public.ator_rotulo_atual(), 'Painel'))
    returning * into v_snap;
    perform public.caca_evento_gravar(p_edicao, null, 'apurar_dia', null,
              jsonb_build_object('dia', p_dia, 'corte', v_corte, 'hash', v_snap.hash, 'participantes', jsonb_array_length(v_rank)));
  end if;

  v_qtd := public.caca_voucher_qtd(p_dia);
  loop
    select count(*) into v_ativos from public.caca_premio
     where edicao_codigo = p_edicao and tipo = 'voucher_dia' and dia = p_dia and estado in ('selecionado', 'confirmado', 'entregue');
    exit when v_ativos >= v_qtd;
    v_pick := public.caca_escolher_dia(p_edicao, p_dia, p_semente);
    exit when v_pick is null;
    perform public.caca_premio_dia_criar(p_edicao, p_dia, v_pick, null, false, null);
    v_novos := v_novos + 1;
  end loop;

  select * into v_ex from public.caca_premio
   where edicao_codigo = p_edicao and tipo = 'voucher_dia' and dia = p_dia and estado in ('selecionado', 'confirmado', 'entregue')
   order by criado_em, id limit 1;

  return jsonb_build_object('ok', true, 'edicao', p_edicao, 'dia', p_dia,
    'snapshot', jsonb_build_object('hash', v_snap.hash, 'corte', v_snap.corte, 'criado_em', v_snap.criado_em,
                                   'participantes', jsonb_array_length(v_snap.ranking), 'ja_existia', v_ja),
    'ja_apurado', (v_ex.id is not null and v_ja and v_novos = 0),
    'quantidade', v_qtd, 'novos', v_novos,
    'premio', case when v_ex.id is not null then public.caca_premio_json(v_ex, v_rel) end,
    'premios', coalesce((select jsonb_agg(public.caca_premio_json(p, v_rel) order by p.criado_em, p.id) from public.caca_premio p
                          where p.edicao_codigo = p_edicao and p.tipo = 'voucher_dia' and p.dia = p_dia
                            and p.estado in ('selecionado', 'confirmado', 'entregue')), '[]'::jsonb),
    'motivo', case when v_ex.id is null then 'sem_elegivel' end);
end $function$;

-- Voucher físico não depende da reserva de vouchers digitais.
create or replace function public.caca_premio_voucher_pool_exigir()
returns trigger language plpgsql security definer set search_path to 'public' as $function$
begin
  if new.tipo = 'voucher_dia' and public.caca_voucher_fisico(new.dia) then return new; end if;
  perform pg_advisory_xact_lock(hashtext('caca_voucher_pool:' || new.edicao_codigo));
  if new.tipo = 'voucher_dia' and new.estado in ('selecionado', 'confirmado')
     and not exists (select 1 from public.caca_premio_voucher_pool cp join public.vouchers v on v.id = cp.voucher_id
                      where cp.edicao_codigo = new.edicao_codigo and cp.estado = 'disponivel'
                        and v.canal = 'virtual' and v.status = 'destinado' and v.responsavel_rotulo = 'Caça aos Carimbos'
                        and v.link_token is not null) then
    raise exception 'vouchers_premio_indisponiveis';
  end if;
  return new;
end $function$;

-- Aviso ao ganhador: no voucher físico diz onde retirar.
create or replace function public.caca_premio_aviso_confirmado()
returns trigger language plpgsql security definer set search_path to 'public' as $function$
declare v_aviso uuid; v_titulo text; v_corpo text; v_ret jsonb := new.detalhe -> 'retirada';
begin
  if new.tipo <> 'voucher_dia' or new.mapa_id is null or new.estado not in ('selecionado', 'confirmado') then return new; end if;
  if tg_op = 'UPDATE' and old.estado is not distinct from new.estado then return new; end if;

  if v_ret is not null then
    v_titulo := 'Você ganhou um voucher!';
    v_corpo := 'O resultado do dia ' || to_char(new.dia, 'DD/MM') || ' saiu. Abra Prêmios para confirmar seu e-mail, se necessário. A retirada é no '
               || coalesce(v_ret ->> 'local', 'local informado pela organização') || coalesce(' (' || (v_ret ->> 'endereco') || ')', '') || '.';
  else
    v_titulo := 'Você ganhou o direito de escolher um voucher!';
    v_corpo := 'O resultado do dia ' || to_char(new.dia, 'DD/MM') || ' saiu. Abra Prêmios para confirmar seu e-mail, se necessário, e escolher um combo entre as casas disponíveis.';
  end if;
  insert into public.caca_aviso (edicao_codigo, categoria, titulo, corpo, destino, publico, estado, origem, chave_dedupe,
                                 criado_por, enviado_em, enviado_por, alvos)
  values (new.edicao_codigo, 'premio', left(v_titulo, 80), left(v_corpo, 240), '/cartoon/mapa?painel=premios',
          jsonb_build_object('tipo', 'mapas', 'ids', jsonb_build_array(new.mapa_id)), 'enviado', 'automatico',
          'premio:' || new.id || ':selecionado', 'premio', now(), 'premio', 1)
  on conflict (chave_dedupe) do nothing returning id into v_aviso;
  if v_aviso is not null then
    insert into public.caca_aviso_entrega (aviso_id, mapa_id) values (v_aviso, new.mapa_id) on conflict do nothing;
  end if;
  return new;
end $function$;

-- Leitura pública: quantos vouchers por dia, se é físico, o local de retirada; "resultado" só com TODOS os do dia confirmados.
create or replace function public.caca_premios_publico(p_edicao text)
returns jsonb language sql stable security definer set search_path to 'public' as $function$
  with cfg as (
    select (public.caca_pcfg('fuso') #>> '{}') as fuso
  ), dias as (
    select (v #>> '{}')::date as dia
      from jsonb_array_elements(coalesce(public.caca_pcfg('voucher_dias'), '[]'::jsonb)) v
  )
  select jsonb_build_object(
    'agora', now(),
    'fuso', (select fuso from cfg),
    'corte_hora_local', public.caca_pcfg('corte_hora_local'),
    'voucher_validade_ate', public.caca_pcfg('voucher_validade_ate'),
    'voucher_retirada', public.caca_pcfg('voucher_retirada'),
    'ganhadores_final', public.caca_pcfg('ganhadores_final'),
    'periodo', jsonb_build_object(
      'inicio', public.caca_pcfg('caca_inicio'),
      'fim', public.caca_pcfg('caca_fim'),
      'estado', case
        when public.caca_pcfg('caca_inicio') is null or public.caca_pcfg('caca_fim') is null then null
        when now() < ((public.caca_pcfg('caca_inicio') #>> '{}')::date::timestamp at time zone (select fuso from cfg)) then 'antes'
        when now() >= public.caca_corte((public.caca_pcfg('caca_fim') #>> '{}')::date) then 'encerrada'
        else 'aberta' end),
    'dias', coalesce((
      select jsonb_agg(jsonb_build_object(
        'dia', d.dia,
        'corte', public.caca_corte(d.dia),
        'vouchers', public.caca_voucher_qtd(d.dia),
        'fisico', public.caca_voucher_fisico(d.dia),
        'estado', case
          when now() >= public.caca_corte(d.dia) then
            case when (select count(*) from public.caca_premio p
                        where p.edicao_codigo = p_edicao and p.tipo = 'voucher_dia' and p.dia = d.dia
                          and p.estado in ('confirmado', 'entregue')) >= public.caca_voucher_qtd(d.dia)
                 then 'resultado' else 'em_apuracao' end
          when now() >= (d.dia::timestamp at time zone (select fuso from cfg)) then 'em_disputa'
          else 'proximo' end
      ) order by d.dia) from dias d
    ), '[]'::jsonb)
  )
$function$;

-- Prêmios da própria pessoa: com retirada, vai o local e não há escolha de casa.
create or replace function public.caca_meus_premios(p_chave text)
returns jsonb language plpgsql stable security definer set search_path to 'public' as $function$
declare m public.mapas_lover%rowtype;
begin
  select * into m from public.mapas_lover where chave_hash = public.mapa_hash(p_chave);
  if m.id is null then return null; end if;
  if m.id is distinct from public.caca_mapa_principal(m.edicao_codigo, m.email_norm) then
    return jsonb_build_object('premios', '[]'::jsonb);
  end if;

  return jsonb_build_object('premios', coalesce((
    select jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
      'id', p.id, 'tipo', p.tipo, 'dia', p.dia, 'estado', p.estado, 'prazo_ate', p.prazo_ate,
      'valido_ate', p.detalhe ->> 'valido_ate', 'recebido_em', p.recebido_em,
      'retirada', p.detalhe -> 'retirada',
      'email_confirmado', public.caca_premio_email_ok(p.edicao_codigo, p.pessoa),
      'voucher', (select jsonb_strip_nulls(jsonb_build_object(
                    'marca', marca.nome_marca, 'token', v.link_token, 'estado', v.status, 'utilizado_em', v.utilizado_em))
                    from public.caca_premio_voucher_pool cp
                    join public.vouchers v on v.id = cp.voucher_id
                    join public.participacoes pa on pa.id = cp.participacao_id
                    join public.participantes marca on marca.id = pa.participante_id
                   where cp.premio_id = p.id and cp.mapa_id = m.id),
      'opcoes', case when p.tipo = 'voucher_dia' and p.estado = 'confirmado' and (p.detalhe -> 'retirada') is null
                           and public.caca_premio_email_ok(p.edicao_codigo, p.pessoa)
        then (select coalesce(jsonb_agg(jsonb_build_object('id', cp.id, 'marca', marca.nome_marca) order by marca.nome_marca), '[]'::jsonb)
                from public.caca_premio_voucher_pool cp
                join public.participacoes pa on pa.id = cp.participacao_id
                join public.participantes marca on marca.id = pa.participante_id
               where cp.edicao_codigo = p.edicao_codigo and cp.estado = 'disponivel')
        else '[]'::jsonb end
    )) order by p.criado_em desc)
      from public.caca_premio p
     where p.edicao_codigo = m.edicao_codigo and p.mapa_id = m.id
       and p.estado in ('selecionado', 'confirmado', 'entregue')), '[]'::jsonb));
end $function$;

-- Aviso diário: sem número fixo no título (a quantidade do dia aparece na tela de Prêmios).
do $$
declare v_def text;
begin
  select pg_get_functiondef(p.oid) into v_def from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.proname = 'caca_voucher_aviso_gerar';
  if v_def is not null and v_def like '%tem 1 voucher em disputa%' then
    execute replace(v_def, 'tem 1 voucher em disputa', 'tem voucher em disputa');
  end if;
end $$;
