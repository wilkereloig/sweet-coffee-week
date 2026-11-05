-- Caça aos Carimbos, quais casas e quais carimbos contam (achados CACA-SEC-03, SEC-04 e SEC-05; Wilker autorizou aplicar em 05/11/2026).
-- Contrato: docs/cartoon-2026-2/15-caca-contrato-identidade.md (seção "O que conta"). Teste: supabase/testes/caca-casas-validas.sql.
-- Depende de 20261210 (caca_mapa_principal). Não altera tabela nem apaga dado.
--
-- SEC-04/SEC-05: o TOTAL de casas e as casas VALIDADAS agora saem da mesma fonte, caca_casas_conta(edicao):
--   casa não encerrada, com publicação vigente de nível 'marca_e_combo' (a mesma exigência de submit_avaliacao).
--   · encerrar uma casa depois de receber carimbos tira os carimbos dela do progresso junto com o total (ninguém "completa"
--     sem ter visitado uma casa ativa);
--   · casa só 'marca' (sem combo para avaliar) não entra no total nem aceita carimbo ('casa_sem_combo'): antes o carimbo ficava
--     "pendente" para sempre e o prêmio final era inalcançável.
--   Efeito hoje: o total cai de 27 para 26 enquanto caroli-douces estiver só 'marca'; volta a 27 sozinho quando ela virar
--   'marca_e_combo'.
-- SEC-03: carimbo sem prova de GPS (origem 'unidade_sem_coordenada') só conta quando a casa NÃO tem nenhuma unidade com coordenada
--   conferida. Em casa com unidade conferida o GPS é exigido: mapa_carimbar_casa passa a escolher SEMPRE a unidade conferida
--   (antes, sem localização, caía numa unidade sem coordenada e carimbava de graça). Casas em que NENHUMA unidade tem coordenada
--   conferida (9 de 27 hoje) seguem carimbando sem GPS até a organização conferir as coordenadas ou decidir a exceção
--   (docs/cartoon-2026-2/15-caca-gps-excecao.md): isso é decisão e dado do Wilker, não do banco.
--
-- Reverter: restaurar as definições de 20261203 (placar, mapa_ler_v2, apuração v2), 20261204 (caca_total_casas), 20261206
-- (caca_grupo_total, caca_grupo_casas), 20261207 (caca_metas_ler), 20261130 (mapa_carimbar) e 20261202 (mapa_carimbar_casa);
-- drop function public.caca_casas_conta(text), public.caca_carimbo_conta(uuid, text).

-- ---------------------------------------------------------------- fontes únicas (internas)
create or replace function public.caca_casas_conta(p_edicao text)
 returns setof uuid language sql stable security definer set search_path to 'public'
as $$
  select pa.id from public.participacoes pa
   where pa.edicao_codigo = p_edicao and pa.status_cadastro <> 'encerrado'
     and exists (select 1 from public.publicacoes pb
                  where pb.participacao_id = pa.id and pb.vigente and pb.nivel = 'marca_e_combo')
$$;

-- Um carimbo vale para o progresso? Sem prova de GPS só vale se a casa não tem unidade com coordenada conferida.
create or replace function public.caca_carimbo_conta(p_participacao uuid, p_origem text)
 returns boolean language sql stable security definer set search_path to 'public'
as $$
  select p_origem <> 'unidade_sem_coordenada'
      or not exists (select 1 from public.participacao_unidades pu join public.unidades u on u.id = pu.unidade_id
                      where pu.participacao_id = p_participacao and pu.participa
                        and u.coordenada_verificada_em is not null and u.lat is not null)
$$;

revoke all on function public.caca_casas_conta(text), public.caca_carimbo_conta(uuid, text) from public, anon, authenticated;

create or replace function public.caca_total_casas(p_edicao text) returns int
 language sql stable security definer set search_path to 'public'
as $$ select count(*)::int from public.caca_casas_conta(p_edicao) $$;

create or replace function public.caca_grupo_total(p_edicao text)
 returns int language sql stable security definer set search_path to 'public'
as $$ select count(*)::int from public.caca_casas_conta(p_edicao) $$;

-- ---------------------------------------------------------------- placar, mapa, grupos
create or replace function public.caca_placar_v2(p_edicao text, p_ate timestamptz default null)
 returns table (pessoa text, mapa_id uuid, apelido text, whatsapp text, no_ranking boolean,
                casas int, extras int, carimbos int, ultimo timestamptz)
 language sql stable security definer set search_path to 'public'
as $$
  with val as (
    select m.email_norm, k.participacao_id, k.criado_em
      from public.carimbos k join public.mapas_lover m on m.id = k.mapa_id
     where m.edicao_codigo = p_edicao and k.anulado_em is null
       and (p_ate is null or k.criado_em < p_ate)
       and k.participacao_id in (select public.caca_casas_conta(p_edicao))
       and public.caca_carimbo_conta(k.participacao_id, k.origem)
       and exists (select 1 from public.avaliacoes a
                    where a.edicao_codigo = p_edicao and a.participacao_id = k.participacao_id
                      and a.email_norm = m.email_norm and (p_ate is null or a.criado_em < p_ate))
  ), por_pessoa as (
    select v.email_norm, count(distinct v.participacao_id)::int casas, count(*)::int carimbos, max(v.criado_em) ultimo
      from val v group by v.email_norm
  ), perfil as (
    select distinct on (m.email_norm) m.email_norm, m.id, m.apelido, m.whatsapp, m.no_ranking
      from public.mapas_lover m where m.edicao_codigo = p_edicao
     order by m.email_norm, (m.email_confirmado_em is null), m.email_confirmado_em, m.criado_em, m.id
  )
  select p.email_norm, f.id, f.apelido, f.whatsapp, f.no_ranking, p.casas, p.carimbos - p.casas, p.carimbos, p.ultimo
    from por_pessoa p join perfil f on f.email_norm = p.email_norm
$$;

create or replace function public.mapa_ler_v2(p_chave text)
 returns jsonb language plpgsql stable security definer set search_path to 'public'
as $$
declare m public.mapas_lover%rowtype; v_total int; v_pos int; v_cs int := 0; v_exr int := 0; v_emp int := 0; v_princ boolean;
  v_casas jsonb; v_val int; v_ext int;
begin
  select * into m from public.mapas_lover where chave_hash = public.mapa_hash(p_chave);
  if m.id is null then return null; end if;
  v_princ := m.id = public.caca_mapa_principal(m.edicao_codigo, m.email_norm);
  v_total := public.caca_total_casas(m.edicao_codigo);
  select coalesce(jsonb_agg(jsonb_build_object(
            'slug', pa.slug_publico, 'carimbos', x.n, 'ultimo', x.ultimo,
            'liberado_em', x.ultimo + interval '12 hours',
            'avaliou', x.avaliou, 'estado', case when x.avaliou then 'validada' else 'pendente' end,
            'extras', case when x.avaliou then x.n - 1 else 0 end) order by x.ultimo desc), '[]'::jsonb),
         (count(*) filter (where x.avaliou))::int,
         coalesce(sum(case when x.avaliou then x.n - 1 else 0 end), 0)::int
    into v_casas, v_val, v_ext
    from (select k.participacao_id, count(*)::int n, max(k.criado_em) ultimo,
                 exists (select 1 from public.avaliacoes a where a.edicao_codigo = m.edicao_codigo
                           and a.participacao_id = k.participacao_id and a.email_norm = m.email_norm) avaliou
            from public.carimbos k join public.mapas_lover m2 on m2.id = k.mapa_id
           where m2.edicao_codigo = m.edicao_codigo and m2.email_norm = m.email_norm and k.anulado_em is null
             and (v_princ or k.mapa_id = m.id)
             and k.participacao_id in (select public.caca_casas_conta(m.edicao_codigo))
             and public.caca_carimbo_conta(k.participacao_id, k.origem)
           group by k.participacao_id) x
    join public.participacoes pa on pa.id = x.participacao_id;
  if v_princ then
    select r.pos, r.casas, r.extras into v_pos, v_cs, v_exr from public.caca_ranking_v2(m.edicao_codigo) r where r.pessoa = m.email_norm;
    v_cs := coalesce(v_cs, 0); v_exr := coalesce(v_exr, 0);
    if v_pos is not null then
      select count(*)::int into v_emp from public.caca_ranking_v2(m.edicao_codigo) r where r.pos = v_pos;
    end if;
  end if;
  return jsonb_build_object(
    'edicao', m.edicao_codigo, 'apelido', m.apelido, 'email', m.email_norm, 'whatsapp', m.whatsapp,
    'no_ranking', m.no_ranking, 'principal', v_princ,
    'total_casas', v_total,
    'casas_validadas', case when v_princ then v_cs else v_val end,
    'extras', case when v_princ then v_exr else v_ext end,
    'faltam', greatest(v_total - case when v_princ then v_cs else v_val end, 0),
    'posicao', v_pos, 'empatados', v_emp, 'casas', v_casas);
end $$;

create or replace function public.caca_grupo_casas(p_grupo uuid)
 returns table (participacao_id uuid, slug text)
 language sql stable security definer set search_path to 'public'
as $$
  select distinct k.participacao_id, pa.slug_publico
    from public.caca_grupo g
    join public.caca_grupo_membro gm on gm.grupo_id = g.id and gm.saiu_em is null
    join public.mapas_lover m on m.edicao_codigo = g.edicao_codigo and m.email_norm = gm.pessoa
    join public.carimbos k on k.mapa_id = m.id and k.anulado_em is null
    join public.participacoes pa on pa.id = k.participacao_id
   where g.id = p_grupo
     and k.participacao_id in (select public.caca_casas_conta(g.edicao_codigo))
     and public.caca_carimbo_conta(k.participacao_id, k.origem)
     and exists (select 1 from public.avaliacoes a
                  where a.edicao_codigo = g.edicao_codigo and a.participacao_id = k.participacao_id
                    and a.email_norm = m.email_norm)
$$;

-- ---------------------------------------------------------------- metas e apuração (total pela fonte única)
create or replace function public.caca_metas_ler(p_chave text)
 returns jsonb language plpgsql stable security definer set search_path to 'public'
as $$
declare m public.mapas_lover%rowtype; v_total int; v_casas int; v_cfg jsonb; v_metas jsonb;
begin
  select * into m from public.mapas_lover where chave_hash = public.mapa_hash(p_chave);
  if m.id is null then return null; end if;
  v_total := public.caca_total_casas(m.edicao_codigo);
  -- Progresso da pessoa só no mapa principal; mapa secundário não lê o da pessoa.
  select case when m.id = public.caca_mapa_principal(m.edicao_codigo, m.email_norm)
              then coalesce((select r.casas from public.caca_ranking_v2(m.edicao_codigo) r where r.pessoa = m.email_norm), 0)
              else 0 end into v_casas;
  select valor into v_cfg from public.caca_config where chave = 'metas';

  select coalesce(jsonb_agg(jsonb_build_object(
           'casas', x.casas, 'titulo', x.titulo, 'exemplo', x.exemplo,
           'alcancada', v_casas >= x.casas, 'faltam', greatest(x.casas - v_casas, 0)) order by x.casas), '[]'::jsonb)
    into v_metas
    from (select distinct on (n.casas) n.casas, n.titulo, n.exemplo
            from (select (e.j ->> 'casas')::int casas, left(btrim(coalesce(e.j ->> 'titulo', '')), 60) titulo,
                         coalesce(e.j ->> 'exemplo' = 'true', false) exemplo
                    from jsonb_array_elements(case when jsonb_typeof(v_cfg) = 'array' then v_cfg else '[]'::jsonb end) e(j)
                   where jsonb_typeof(e.j) = 'object' and (e.j ->> 'casas') ~ '^\d{1,3}$') n
           where n.casas between 1 and v_total
           order by n.casas) x;

  return jsonb_build_object(
    'total_casas', v_total, 'casas_validadas', v_casas, 'metas', v_metas,
    'alcancadas', (select coalesce(jsonb_agg(e) filter (where (e ->> 'alcancada')::boolean), '[]'::jsonb) from jsonb_array_elements(v_metas) e),
    'proxima', (select e from jsonb_array_elements(v_metas) e where not (e ->> 'alcancada')::boolean limit 1));
end $$;

create or replace function public.get_caca_apuracao_v2(p_secret text, p_edicao text)
 returns jsonb language plpgsql stable security definer set search_path to 'public'
as $$
declare v_rel boolean; v_total int;
begin
  if not public.pode(p_secret, 'dado.ler') then raise exception 'nao_autorizado'; end if;
  v_rel := public.pode(p_secret, 'relatorio.ler');
  v_total := public.caca_total_casas(p_edicao);
  return jsonb_build_object(
    'total_casas', v_total,
    'apuracoes', (select coalesce(jsonb_agg(jsonb_build_object('dia', d.dia, 'corte', d.fim, 'ranking', (
        select coalesce(jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
                 'posicao', r.pos, 'apelido', r.apelido, 'casas', r.casas, 'extras', r.extras,
                 'email', case when v_rel then r.pessoa end, 'whatsapp', case when v_rel then r.whatsapp end))
                 order by r.pos, r.apelido), '[]'::jsonb)
          from public.caca_ranking_v2(p_edicao, d.fim) r where r.pos <= 10)) order by d.dia), '[]'::jsonb)
      from (select g::date dia, ((g::date + 1)::timestamp at time zone 'America/Fortaleza') fim
              from generate_series(timestamp '2026-11-07', timestamp '2026-11-11', interval '1 day') g) d),
    'sorteio_final', (select coalesce(jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
                        'apelido', r.apelido, 'casas', r.casas, 'extras', r.extras, 'peso', 100 + r.extras,
                        'email', case when v_rel then r.pessoa end, 'whatsapp', case when v_rel then r.whatsapp end))
                        order by r.extras desc, r.apelido), '[]'::jsonb)
                        from public.caca_ranking_v2(p_edicao) r where v_total > 0 and r.casas >= v_total),
    'reservas', (select coalesce(jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
                   'posicao', x.pos, 'apelido', x.apelido, 'casas', x.casas, 'extras', x.extras,
                   'email', case when v_rel then x.pessoa end, 'whatsapp', case when v_rel then x.whatsapp end))
                   order by x.pos, x.apelido), '[]'::jsonb)
                   from (select r.* from public.caca_ranking_v2(p_edicao) r where r.casas < v_total
                          order by r.pos, r.apelido limit 10) x));
end $$;

-- ---------------------------------------------------------------- carimbar
-- mapa_carimbar_casa: sempre a unidade com coordenada conferida primeiro (mesmo sem localização do celular, aí
-- mapa_carimbar responde 'sem_localizacao'); casa sem combo recusa com 'casa_sem_combo'.
create or replace function public.mapa_carimbar_casa(p_chave text, p_slug text, p_lat numeric, p_lng numeric, p_precisao numeric)
 returns jsonb language plpgsql security definer set search_path to 'public'
as $$
declare m public.mapas_lover%rowtype; v_qr text; v_slug text := lower(btrim(coalesce(p_slug, '')));
begin
  select * into m from public.mapas_lover where chave_hash = public.mapa_hash(p_chave);
  if m.id is null then return jsonb_build_object('ok', false, 'motivo', 'mapa_desconhecido'); end if;
  if exists (select 1 from public.participacoes pa
              where pa.edicao_codigo = m.edicao_codigo and pa.slug_publico = v_slug and pa.status_cadastro <> 'encerrado'
                and exists (select 1 from public.publicacoes pb where pb.participacao_id = pa.id and pb.vigente)
                and not (pa.id in (select public.caca_casas_conta(m.edicao_codigo)))) then
    return jsonb_build_object('ok', false, 'motivo', 'casa_sem_combo', 'slug', v_slug);
  end if;
  select cq.codigo into v_qr
    from public.carimbo_qr cq
    join public.participacao_unidades pu on pu.id = cq.participacao_unidade_id and pu.participa
    join public.participacoes pa on pa.id = pu.participacao_id
    left join public.unidades u on u.id = pu.unidade_id
   where cq.ativo and pa.edicao_codigo = m.edicao_codigo and pa.slug_publico = v_slug
   order by case when u.coordenada_verificada_em is not null and u.lat is not null then 0 else 1 end,
            case when p_lat is null or p_lng is null or u.lat is null or u.lng is null then null
                 else public.carimbo_distancia(u.lat::float8, u.lng::float8, p_lat::float8, p_lng::float8) end nulls last,
            cq.codigo
   limit 1;
  if v_qr is null then return jsonb_build_object('ok', false, 'motivo', 'qr_invalido'); end if;
  return public.mapa_carimbar(p_chave, v_qr, p_lat, p_lng, p_precisao);
end $$;

-- mapa_carimbar: igual a 20261130 + recusa 'casa_sem_combo' (QR de casa que não tem combo para avaliar).
create or replace function public.mapa_carimbar(p_chave text, p_qr text, p_lat numeric, p_lng numeric, p_precisao numeric)
 returns jsonb language plpgsql security definer set search_path to 'public'
as $$
declare m public.mapas_lover%rowtype; q record; v_c public.edicao_publicacao%rowtype;
  v_raio constant int := 200; v_folga_max constant int := 300; v_espera constant interval := interval '12 hours';
  v_dist int; v_prec int; v_conf boolean; v_ult timestamptz; v_primeira boolean; v_avaliou boolean;
begin
  select * into m from public.mapas_lover where chave_hash = public.mapa_hash(p_chave);
  if m.id is null then return jsonb_build_object('ok', false, 'motivo', 'mapa_desconhecido'); end if;

  select cq.codigo, pu.id pu_id, pu.id_publico, pu.participacao_id, pa.edicao_codigo, pa.slug_publico,
         u.lat, u.lng, (u.coordenada_verificada_em is not null and u.lat is not null) conferida,
         exists (select 1 from public.publicacoes pb2 where pb2.participacao_id = pa.id and pb2.vigente
                    and pb2.nivel = 'marca_e_combo') tem_combo
    into q
    from public.carimbo_qr cq
    join public.participacao_unidades pu on pu.id = cq.participacao_unidade_id and pu.participa
    join public.participacoes pa on pa.id = pu.participacao_id and pa.status_cadastro <> 'encerrado'
    left join public.unidades u on u.id = pu.unidade_id
   where cq.codigo = lower(btrim(coalesce(p_qr, ''))) and cq.ativo
     and exists (select 1 from public.publicacoes pb where pb.participacao_id = pa.id and pb.vigente);
  if not found or q.edicao_codigo <> m.edicao_codigo then
    return jsonb_build_object('ok', false, 'motivo', 'qr_invalido');
  end if;
  if not q.tem_combo then
    return jsonb_build_object('ok', false, 'motivo', 'casa_sem_combo', 'slug', q.slug_publico);
  end if;

  select * into v_c from public.edicao_publicacao where edicao_codigo = m.edicao_codigo;
  if not coalesce(v_c.avaliacao_aberta, false) or now() < v_c.avaliacao_abre_em then
    return jsonb_build_object('ok', false, 'motivo', 'nao_aberta', 'abre_em', v_c.avaliacao_abre_em, 'slug', q.slug_publico);
  end if;
  if now() > v_c.avaliacao_fecha_em then
    return jsonb_build_object('ok', false, 'motivo', 'encerrada', 'slug', q.slug_publico);
  end if;

  v_conf := q.conferida;
  if v_conf then
    if p_lat is null or p_lng is null or p_lat not between -90 and 90 or p_lng not between -180 and 180 then
      return jsonb_build_object('ok', false, 'motivo', 'sem_localizacao', 'slug', q.slug_publico);
    end if;
    v_prec := least(greatest(coalesce(p_precisao, 0), 0), 100000)::int;
    v_dist := round(public.carimbo_distancia(q.lat::float8, q.lng::float8, p_lat::float8, p_lng::float8))::int;
    if v_dist > v_raio + least(v_prec, v_folga_max) then
      return jsonb_build_object('ok', false, 'motivo', 'longe', 'distancia_m', v_dist, 'slug', q.slug_publico);
    end if;
  end if;

  -- Um e-mail por vez: duas leituras simultâneas (ou dois mapas com o mesmo e-mail) não passam juntas.
  perform pg_advisory_xact_lock(hashtextextended('carimbo:' || m.edicao_codigo || ':' || m.email_norm, 0));
  select max(k.criado_em) into v_ult
    from public.carimbos k join public.mapas_lover m2 on m2.id = k.mapa_id
   where k.participacao_id = q.participacao_id and m2.edicao_codigo = m.edicao_codigo
     and (k.mapa_id = m.id or m2.email_norm = m.email_norm);
  if v_ult is not null and now() < v_ult + v_espera then
    return jsonb_build_object('ok', false, 'motivo', 'cedo', 'liberado_em', v_ult + v_espera, 'slug', q.slug_publico);
  end if;

  v_primeira := not exists (select 1 from public.carimbos k where k.mapa_id = m.id and k.participacao_id = q.participacao_id
                               and k.anulado_em is null);
  insert into public.carimbos (mapa_id, participacao_id, participacao_unidade_id, qr_codigo, distancia_m, precisao_m, conferido)
  values (m.id, q.participacao_id, q.pu_id, q.codigo, v_dist, v_prec, v_conf);
  v_avaliou := exists (select 1 from public.avaliacoes a where a.edicao_codigo = m.edicao_codigo
                         and a.participacao_id = q.participacao_id and a.email_norm = m.email_norm);
  return jsonb_build_object('ok', true, 'slug', q.slug_publico, 'unidade', q.id_publico, 'primeira', v_primeira, 'avaliou', v_avaliou,
                            'liberado_em', now() + v_espera,
                            'pontos', coalesce((select p.pontos from public.carimbo_placar(m.edicao_codigo) p where p.mapa_id = m.id), 0));
end $$;
