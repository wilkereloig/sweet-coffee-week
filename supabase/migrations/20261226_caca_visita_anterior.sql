-- Caça aos Carimbos: pedido de CARIMBO DE VISITA ANTERIOR, aceito só em 05/11/2026 até 23h59:59 (America/Fortaleza). (05/11/2026)
-- Quem visitou uma casa antes de conhecer a Caça e não carimbou na hora pede, no app, que a ORGANIZAÇÃO analise a visita. O pedido
-- NÃO carimba nem conta nada; só vira carimbo se a organização aprovar no painel, e o carimbo só vira casa VALIDADA depois da avaliação do
-- combo daquela casa com o mesmo e-mail do mapa (regra que já vale para todo carimbo).
--
-- Reaproveita a fila de revisão de presença (caca_carimbo_excecao, 20261214/20261217): mesma tabela, mesma tela do painel, mesma auditoria.
-- A diferença é o `motivo = 'visita_anterior'` (+ `visita_data`), e o carimbo aprovado nasce com `origem = 'visita_anterior'`
-- (inequívoca na revisão e no resumo "sem GPS"). Aditivo: caca_excecao_pedir, mapa_carimbar e mapa_carimbar_casa não mudam.
--
-- O que entra:
--  1. tabela: motivo aceita 'visita_anterior'; coluna visita_data; carimbos.origem aceita 'visita_anterior'.
--  2. caca_visita_anterior_prazo() (público): o prazo e o relógio do SERVIDOR. Só este pedido tem prazo; as datas da edição e dos vouchers não mudam.
--  3. caca_visita_anterior_pedir (visitante, por mapa): grava o pedido; o prazo e a regra de uma por casa são validados aqui.
--  4. caca_excecao_minhas (visitante): passa a devolver motivo e visita_data (consulta segue aberta depois do prazo).
--  5. caca_excecao_listar / caca_excecao_decidir (painel): mostram visita_data; aprovar cria o carimbo AGORA (criado_em = now(): conta a
--     partir da aprovação, nunca retroage a apuração de voucher já fotografada), recusa se a pessoa já tem carimbo na casa.
--
-- Reverter: supabase/reverter/20261226_caca_visita_anterior.sql

-- ---------------------------------------------------------------- 1. tabela e origem
alter table public.caca_carimbo_excecao drop constraint if exists caca_carimbo_excecao_motivo_check;
alter table public.caca_carimbo_excecao add constraint caca_carimbo_excecao_motivo_check
  check (motivo in ('sem_localizacao', 'imprecisa', 'longe', 'visita_anterior'));
alter table public.caca_carimbo_excecao add column if not exists visita_data date;
alter table public.caca_carimbo_excecao drop constraint if exists caca_carimbo_excecao_visita_check;
alter table public.caca_carimbo_excecao add constraint caca_carimbo_excecao_visita_check
  check ((motivo = 'visita_anterior') = (visita_data is not null));

alter table public.carimbos drop constraint if exists carimbos_origem_check;
alter table public.carimbos add constraint carimbos_origem_check
  check (origem in ('gps', 'unidade_sem_coordenada', 'excecao_painel', 'visita_anterior'));

-- O gatilho de origem sobrescrevia toda origem que não fosse 'excecao_painel' (gps × unidade_sem_coordenada): 'visita_anterior' precisa sobreviver.
-- (Aplicado no banco como segunda migration, `caca_visita_anterior_origem`, depois de o teste acusar o problema.)
create or replace function public.carimbos_origem_definir()
 returns trigger language plpgsql set search_path to 'public'
as $function$
begin
  if new.origem not in ('excecao_painel', 'visita_anterior') then
    new.origem := case when new.conferido then 'gps' else 'unidade_sem_coordenada' end;
  end if;
  return new;
end $function$;

-- ---------------------------------------------------------------- 2. prazo (o relógio é o do servidor)
-- `ate` é o instante em que o prazo ACABA (00:00 de 06/11 em Natal = 23h59:59 de 05/11 inclusive). Mudar o prazo = mudar só esta função.
create or replace function public.caca_visita_anterior_prazo()
 returns jsonb language sql stable security definer set search_path to 'public'
as $$
  select jsonb_build_object(
    'aberto', now() < (timestamp '2026-11-06 00:00:00' at time zone 'America/Fortaleza'),
    'ate', (timestamp '2026-11-06 00:00:00' at time zone 'America/Fortaleza'),
    'ultimo_instante_local', '2026-11-05 23:59:59',
    'fuso', 'America/Fortaleza',
    'agora', now())
$$;

-- ---------------------------------------------------------------- 3. visitante: pedir
-- Retorno: {ok:true, id, estado:'pendente'} ou {ok:false, motivo}:
--   mapa_desconhecido · email_nao_confirmado · prazo_encerrado (ate) · qr_invalido (casa desconhecida) · casa_sem_combo · encerrada ·
--   data_invalida · data_futura · unidade_obrigatoria (a casa tem mais de um endereço) · unidade_invalida ·
--   ja_carimbou (a pessoa já tem carimbo nessa casa: não é caso de visita anterior) · ja_pedido (pendente ou aprovado nessa casa) ·
--   limite_pedidos (2 por casa, contando os não aprovados) · muitos_pendentes (5 esperando) · fila_cheia (60 por casa).
-- p_unidade: id público da unidade (participacao_unidades.id_publico); opcional quando a casa tem um endereço só.
create or replace function public.caca_visita_anterior_pedir(p_chave text, p_slug text, p_unidade text, p_data date, p_nota text)
 returns jsonb language plpgsql security definer set search_path to 'public'
as $$
declare m public.mapas_lover%rowtype; v_slug text := lower(btrim(coalesce(p_slug, ''))); v_pa uuid; v_c public.edicao_publicacao%rowtype;
  v_pu uuid; v_n int; v_id uuid; v_nota text; v_hoje date := (now() at time zone 'America/Fortaleza')::date; v_ini date;
  v_un text := nullif(lower(btrim(coalesce(p_unidade, ''))), '');
begin
  select * into m from public.mapas_lover where chave_hash = public.mapa_hash(p_chave);
  if m.id is null then return jsonb_build_object('ok', false, 'motivo', 'mapa_desconhecido'); end if;
  if m.id is distinct from public.caca_mapa_principal(m.edicao_codigo, m.email_norm)
     or not public.caca_email_confirmado(m.edicao_codigo, m.email_norm) then
    return jsonb_build_object('ok', false, 'motivo', 'email_nao_confirmado');
  end if;
  -- Prazo no servidor: o relógio do celular não vale.
  if not (public.caca_visita_anterior_prazo() ->> 'aberto')::boolean then
    return jsonb_build_object('ok', false, 'motivo', 'prazo_encerrado', 'ate', public.caca_visita_anterior_prazo() -> 'ate');
  end if;

  select pa.id into v_pa from public.participacoes pa
   where pa.edicao_codigo = m.edicao_codigo and pa.slug_publico = v_slug and pa.status_cadastro <> 'encerrado'
     and exists (select 1 from public.publicacoes pb where pb.participacao_id = pa.id and pb.vigente);
  if v_pa is null then return jsonb_build_object('ok', false, 'motivo', 'qr_invalido'); end if;
  if not (v_pa in (select public.caca_casas_conta(m.edicao_codigo))) then
    return jsonb_build_object('ok', false, 'motivo', 'casa_sem_combo', 'slug', v_slug);
  end if;
  select * into v_c from public.edicao_publicacao where edicao_codigo = m.edicao_codigo;
  if now() > v_c.avaliacao_fecha_em then return jsonb_build_object('ok', false, 'motivo', 'encerrada', 'slug', v_slug); end if;

  -- Data da visita: dentro do festival e não no futuro (dia de Natal).
  select e.festival_inicio into v_ini from public.edicoes e where e.codigo = m.edicao_codigo;
  if p_data is null or (v_ini is not null and p_data < v_ini) then return jsonb_build_object('ok', false, 'motivo', 'data_invalida'); end if;
  if p_data > v_hoje then return jsonb_build_object('ok', false, 'motivo', 'data_futura'); end if;

  -- Unidade: a escolhida (precisa participar e ter QR ativo, que é o código que o carimbo guarda) ou a única da casa.
  select count(*) into v_n from public.participacao_unidades pu where pu.participacao_id = v_pa and pu.participa;
  if v_un is null then
    if v_n > 1 then return jsonb_build_object('ok', false, 'motivo', 'unidade_obrigatoria', 'slug', v_slug); end if;
    v_pu := public.caca_excecao_unidade(v_pa, null, null);
  else
    select pu.id into v_pu from public.participacao_unidades pu
      join public.carimbo_qr cq on cq.participacao_unidade_id = pu.id and cq.ativo
     where pu.participacao_id = v_pa and pu.participa and lower(pu.id_publico::text) = v_un limit 1;
  end if;
  if v_pu is null then return jsonb_build_object('ok', false, 'motivo', case when v_un is null then 'qr_invalido' else 'unidade_invalida' end); end if;
  v_nota := public.caca_texto_limpo(p_nota, 200);

  perform pg_advisory_xact_lock(hashtextextended('carimbo:' || m.edicao_codigo || ':' || m.email_norm, 0));

  if exists (select 1 from public.carimbos k join public.mapas_lover m2 on m2.id = k.mapa_id
              where k.participacao_id = v_pa and m2.edicao_codigo = m.edicao_codigo and k.anulado_em is null
                and (k.mapa_id = m.id or m2.email_norm = m.email_norm)) then
    return jsonb_build_object('ok', false, 'motivo', 'ja_carimbou', 'slug', v_slug);
  end if;
  if exists (select 1 from public.caca_carimbo_excecao e
              where e.edicao_codigo = m.edicao_codigo and e.pessoa = m.email_norm and e.participacao_id = v_pa
                and e.motivo = 'visita_anterior' and e.estado in ('pendente', 'aprovado')) then
    return jsonb_build_object('ok', false, 'motivo', 'ja_pedido', 'slug', v_slug);
  end if;
  if (select count(*) from public.caca_carimbo_excecao e
       where e.edicao_codigo = m.edicao_codigo and e.pessoa = m.email_norm and e.participacao_id = v_pa and e.motivo = 'visita_anterior') >= 2 then
    return jsonb_build_object('ok', false, 'motivo', 'limite_pedidos', 'slug', v_slug);
  end if;
  if (select count(*) from public.caca_carimbo_excecao e
       where e.edicao_codigo = m.edicao_codigo and e.pessoa = m.email_norm and e.motivo = 'visita_anterior' and e.estado = 'pendente') >= 5 then
    return jsonb_build_object('ok', false, 'motivo', 'muitos_pendentes');
  end if;
  if (select count(*) from public.caca_carimbo_excecao e
       where e.edicao_codigo = m.edicao_codigo and e.participacao_id = v_pa and e.motivo = 'visita_anterior' and e.estado = 'pendente') >= 60 then
    return jsonb_build_object('ok', false, 'motivo', 'fila_cheia');
  end if;

  insert into public.caca_carimbo_excecao (edicao_codigo, mapa_id, pessoa, participacao_id, participacao_unidade_id, motivo, visita_data, nota)
  values (m.edicao_codigo, m.id, m.email_norm, v_pa, v_pu, 'visita_anterior', p_data, v_nota)
  returning id into v_id;
  insert into public.caca_evento (edicao_codigo, acao, ator, depois)
  values (m.edicao_codigo, 'visita_anterior_pedida', 'visitante', jsonb_build_object('pedido', v_id, 'casa', v_slug, 'visita_data', p_data));
  return jsonb_build_object('ok', true, 'id', v_id, 'estado', 'pendente', 'slug', v_slug);
end $$;

-- ---------------------------------------------------------------- 4. visitante: acompanhar (a consulta não tem prazo)
create or replace function public.caca_excecao_minhas(p_chave text)
 returns jsonb language plpgsql stable security definer set search_path to 'public'
as $$
declare m public.mapas_lover%rowtype;
begin
  select * into m from public.mapas_lover where chave_hash = public.mapa_hash(p_chave);
  if m.id is null then return jsonb_build_object('ok', false, 'motivo', 'mapa_desconhecido'); end if;
  return jsonb_build_object('ok', true, 'pedidos', (
    select coalesce(jsonb_agg(jsonb_strip_nulls(jsonb_build_object('slug', pa.slug_publico, 'estado', x.estado, 'criado_em', x.criado_em,
                                                 'decidido_em', x.decidido_em, 'motivo', x.motivo, 'visita_data', x.visita_data,
                                                 'unidade', pu.id_publico)) order by x.criado_em desc), '[]'::jsonb)
      from (select * from public.caca_carimbo_excecao e
             where e.edicao_codigo = m.edicao_codigo and e.pessoa = m.email_norm order by e.criado_em desc limit 30) x
      join public.participacoes pa on pa.id = x.participacao_id
      left join public.participacao_unidades pu on pu.id = x.participacao_unidade_id));
end $$;

-- ---------------------------------------------------------------- 5. painel
create or replace function public.caca_excecao_listar(p_secret text, p_edicao text, p_estado text default null)
 returns jsonb language plpgsql stable security definer set search_path to 'public'
as $$
declare v_rel boolean; v_est text := nullif(btrim(coalesce(p_estado, '')), '');
begin
  if not public.pode(p_secret, 'dado.ler') then raise exception 'nao_autorizado'; end if;
  if v_est is not null and v_est not in ('pendente', 'aprovado', 'negado') then raise exception 'parametro_invalido'; end if;
  v_rel := public.pode(p_secret, 'relatorio.ler');
  return jsonb_build_object(
    'pendentes', (select count(*) from public.caca_carimbo_excecao e where e.edicao_codigo = p_edicao and e.estado = 'pendente'),
    'pendentes_visita_anterior', (select count(*) from public.caca_carimbo_excecao e
                                   where e.edicao_codigo = p_edicao and e.estado = 'pendente' and e.motivo = 'visita_anterior'),
    'itens', (select coalesce(jsonb_agg(x.o order by x.ordem, x.fila), '[]'::jsonb) from (
        select case when e.estado = 'pendente' then 0 else 1 end ordem,
               case when e.estado = 'pendente' then extract(epoch from e.criado_em) else -extract(epoch from e.criado_em) end fila,
               jsonb_strip_nulls(jsonb_build_object(
                 'id', e.id, 'estado', e.estado, 'criado_em', e.criado_em, 'motivo', e.motivo, 'visita_data', e.visita_data,
                 'apelido', m.apelido, 'casa', pt.nome_marca, 'slug', pa.slug_publico,
                 'unidade', pu.id_publico, 'nome_unidade', u.nome_unidade, 'unidades_na_casa', (select count(*) from public.participacao_unidades p2
                                                                                                  where p2.participacao_id = e.participacao_id and p2.participa),
                 'distancia_m', e.distancia_m, 'precisao_m', e.precisao_m, 'nota', e.nota,
                 'avaliou', exists (select 1 from public.avaliacoes a where a.edicao_codigo = e.edicao_codigo
                                      and a.participacao_id = e.participacao_id and a.email_norm = e.pessoa),
                 'carimbos_na_casa', (select count(*) from public.carimbos k join public.mapas_lover m2 on m2.id = k.mapa_id
                                       where k.participacao_id = e.participacao_id and m2.email_norm = e.pessoa
                                         and m2.edicao_codigo = e.edicao_codigo and k.anulado_em is null),
                 'pedidos_da_pessoa', (select count(*) from public.caca_carimbo_excecao e2
                                        where e2.edicao_codigo = e.edicao_codigo and e2.pessoa = e.pessoa),
                 'decidido_por', e.decidido_por, 'decidido_em', e.decidido_em, 'decisao_nota', e.decisao_nota, 'carimbo_id', e.carimbo_id,
                 'email', case when v_rel then e.pessoa end, 'whatsapp', case when v_rel then m.whatsapp end)) o
          from public.caca_carimbo_excecao e
          join public.mapas_lover m on m.id = e.mapa_id
          join public.participacoes pa on pa.id = e.participacao_id
          join public.participantes pt on pt.id = pa.participante_id
          left join public.participacao_unidades pu on pu.id = e.participacao_unidade_id
          left join public.unidades u on u.id = pu.unidade_id
         where e.edicao_codigo = p_edicao and (v_est is null or e.estado = v_est)
         order by case when e.estado = 'pendente' then 0 else 1 end, case when e.estado = 'pendente' then e.criado_em end,
                  e.criado_em desc
         limit 300) x));
end $$;

-- Igual à versão anterior (20261217+), com: pedido de visita anterior cria o carimbo com origem 'visita_anterior', recusa quando a pessoa
-- já tem carimbo na casa (ja_carimbou) e grava eventos/auditoria próprios. Erros (exception): os de antes + ja_carimbou.
create or replace function public.caca_excecao_decidir(p_secret text, p_id uuid, p_decisao text, p_nota text default null)
 returns jsonb language plpgsql security definer set search_path to 'public'
as $$
declare e public.caca_carimbo_excecao%rowtype; v_dec text := lower(btrim(coalesce(p_decisao, ''))); v_nota text;
  v_c public.edicao_publicacao%rowtype; v_pu uuid; v_qr text; v_ult timestamptz; v_k uuid;
  v_ator text := coalesce(public.ator_rotulo_atual(), 'Painel'); v_slug text; v_visita boolean; v_origem text;
begin
  if not public.pode(p_secret, 'producao.gerir') then raise exception 'nao_autorizado'; end if;
  if v_dec not in ('aprovar', 'negar') then raise exception 'parametro_invalido'; end if;
  v_nota := public.caca_texto_limpo(p_nota, 200);
  select * into e from public.caca_carimbo_excecao where id = p_id for update;
  if e.id is null then raise exception 'pedido_nao_encontrado'; end if;
  if e.estado <> 'pendente' then raise exception 'transicao_invalida'; end if;
  v_visita := e.motivo = 'visita_anterior';
  v_origem := case when v_visita then 'visita_anterior' else 'excecao_painel' end;
  select pa.slug_publico into v_slug from public.participacoes pa where pa.id = e.participacao_id;

  if v_dec = 'negar' then
    if v_nota is null then raise exception 'nota_obrigatoria'; end if;
    update public.caca_carimbo_excecao set estado = 'negado', decidido_por = v_ator, decidido_user = auth.uid(),
           decidido_em = now(), decisao_nota = v_nota where id = e.id;
    perform public.caca_evento_gravar(e.edicao_codigo, null, case when v_visita then 'visita_anterior_negada' else 'excecao_negada' end,
      jsonb_build_object('estado', 'pendente'), jsonb_build_object('estado', 'negado', 'pedido', e.id, 'casa', v_slug), v_nota);
    return jsonb_build_object('ok', true, 'estado', 'negado');
  end if;

  select * into v_c from public.edicao_publicacao where edicao_codigo = e.edicao_codigo;
  if not coalesce(v_c.avaliacao_aberta, false) or now() < v_c.avaliacao_abre_em then raise exception 'nao_aberta'; end if;
  if now() > v_c.avaliacao_fecha_em then raise exception 'encerrada'; end if;
  if not (e.participacao_id in (select public.caca_casas_conta(e.edicao_codigo))) then raise exception 'casa_sem_combo'; end if;

  perform pg_advisory_xact_lock(hashtextextended('carimbo:' || e.edicao_codigo || ':' || e.pessoa, 0));
  -- Visita anterior é para quem NÃO tem carimbo na casa: se já tem (carimbou depois de pedir), aprovar viraria um carimbo extra sem visita.
  if v_visita and exists (select 1 from public.carimbos k join public.mapas_lover m2 on m2.id = k.mapa_id
                           where k.participacao_id = e.participacao_id and m2.edicao_codigo = e.edicao_codigo and k.anulado_em is null
                             and (k.mapa_id = e.mapa_id or m2.email_norm = e.pessoa)) then
    raise exception 'ja_carimbou';
  end if;
  select max(k.criado_em) into v_ult
    from public.carimbos k join public.mapas_lover m2 on m2.id = k.mapa_id
   where k.participacao_id = e.participacao_id and m2.edicao_codigo = e.edicao_codigo and k.anulado_em is null
     and (k.mapa_id = e.mapa_id or m2.email_norm = e.pessoa);
  if v_ult is not null and now() < v_ult + interval '12 hours' then raise exception 'cedo'; end if;

  v_pu := coalesce(e.participacao_unidade_id, public.caca_excecao_unidade(e.participacao_id, null, null));
  select cq.codigo into v_qr from public.carimbo_qr cq where cq.participacao_unidade_id = v_pu and cq.ativo;
  if v_qr is null then
    v_pu := public.caca_excecao_unidade(e.participacao_id, null, null);
    select cq.codigo into v_qr from public.carimbo_qr cq where cq.participacao_unidade_id = v_pu and cq.ativo;
  end if;
  if v_qr is null then raise exception 'qr_invalido'; end if;

  insert into public.carimbos (mapa_id, participacao_id, participacao_unidade_id, qr_codigo, distancia_m, precisao_m, conferido, origem)
  values (e.mapa_id, e.participacao_id, v_pu, v_qr, e.distancia_m, e.precisao_m, false, v_origem)
  returning id into v_k;
  update public.caca_carimbo_excecao set estado = 'aprovado', decidido_por = v_ator, decidido_user = auth.uid(),
         decidido_em = now(), decisao_nota = v_nota, carimbo_id = v_k, participacao_unidade_id = v_pu where id = e.id;
  perform public.caca_evento_gravar(e.edicao_codigo, null, case when v_visita then 'visita_anterior_aprovada' else 'excecao_aprovada' end,
    jsonb_build_object('estado', 'pendente'), jsonb_build_object('estado', 'aprovado', 'pedido', e.id, 'casa', v_slug, 'carimbo', v_k), v_nota);
  insert into public.auditoria (acao, alvo_tabela, alvo_id, participacao_id, detalhe)
  values (case when v_visita then 'carimbo.visita_anterior' else 'carimbo.excecao' end, 'carimbos', v_k::text, e.participacao_id,
          jsonb_build_object('pedido', e.id, 'nota', v_nota, 'visita_data', e.visita_data));
  return jsonb_build_object('ok', true, 'estado', 'aprovado', 'carimbo_id', v_k);
end $$;

-- ---------------------------------------------------------------- permissões
revoke all on function public.caca_visita_anterior_prazo(), public.caca_visita_anterior_pedir(text, text, text, date, text) from public, anon, authenticated;
grant execute on function public.caca_visita_anterior_prazo(), public.caca_visita_anterior_pedir(text, text, text, date, text) to anon, authenticated;
-- caca_excecao_minhas / _listar / _decidir mantêm os grants de antes (create or replace não os altera).
