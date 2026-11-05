-- Caça aos Carimbos, placar v2 (Wilker, 04/11/2026; docs/cartoon-2026-2/14-mapa-da-docura.md §14.14).
-- ADITIVA: cria funções novas ao lado das atuais. NÃO altera carimbo_placar, mapa_ler, ranking_mapa nem get_caca_apuracao,
-- então o site e o painel de hoje seguem iguais até a troca dos chamadores (etapa E4, migration própria).
--
-- Regra nova (decidida em 04/11):
--   · PESSOA = e-mail normalizado (lower + btrim). Dois mapas com o mesmo e-mail são uma pessoa só.
--   · progresso = casas DIFERENTES validadas (0..total); revisita válida na mesma casa = carimbo EXTRA.
--   · carimbo válido = não anulado e a casa avaliada pelo mesmo e-mail (a ordem entre carimbar e avaliar não importa).
--     Com corte (p_ate), só vale o que foi feito E avaliado antes do corte.
--   · não há mais "+2 por avaliação": só casas e extras contam.
--   · ordem: mais casas, depois mais extras. Empate = MESMA posição (rank(), sem desempate por hora).
--   · prêmio final: quem validou todas as casas; peso = 100 + extras (1 ponto de peso por extra).
-- A avaliação reenviada não mexe em criado_em (só atualizado_em), então não empurra a casa para depois do corte.
-- Não altera tabela nenhuma. Reverter: drop das 5 funções abaixo.

-- ---------------------------------------------------------------- internas (sem grant)
-- Uma linha por pessoa que tem ao menos um carimbo válido. O perfil (apelido, WhatsApp, aparecer no ranking) é o do mapa
-- mais recente da pessoa.
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
       and exists (select 1 from public.avaliacoes a
                    where a.edicao_codigo = p_edicao and a.participacao_id = k.participacao_id
                      and a.email_norm = m.email_norm and (p_ate is null or a.criado_em < p_ate))
  ), por_pessoa as (
    select v.email_norm, count(distinct v.participacao_id)::int casas, count(*)::int carimbos, max(v.criado_em) ultimo
      from val v group by v.email_norm
  ), perfil as (
    select distinct on (m.email_norm) m.email_norm, m.id, m.apelido, m.whatsapp, m.no_ranking
      from public.mapas_lover m where m.edicao_codigo = p_edicao
     order by m.email_norm, m.criado_em desc, m.id
  )
  select p.email_norm, f.id, f.apelido, f.whatsapp, f.no_ranking, p.casas, p.carimbos - p.casas, p.carimbos, p.ultimo
    from por_pessoa p join perfil f on f.email_norm = p.email_norm
$$;

create or replace function public.caca_ranking_v2(p_edicao text, p_ate timestamptz default null)
 returns table (pos int, pessoa text, mapa_id uuid, apelido text, whatsapp text, no_ranking boolean,
                casas int, extras int, carimbos int, ultimo timestamptz)
 language sql stable security definer set search_path to 'public'
as $$
  select (rank() over (order by p.casas desc, p.extras desc))::int,
         p.pessoa, p.mapa_id, p.apelido, p.whatsapp, p.no_ranking, p.casas, p.extras, p.carimbos, p.ultimo
    from public.caca_placar_v2(p_edicao, p_ate) p
$$;

revoke all on function public.caca_placar_v2(text, timestamptz) from public, anon, authenticated;
revoke all on function public.caca_ranking_v2(text, timestamptz) from public, anon, authenticated;

-- ---------------------------------------------------------------- visitante (anônimo)
-- Ranking geral: só quem marcou "quero aparecer", só apelido e progresso. A posição é a real entre TODAS as pessoas
-- (quem escondeu o apelido ainda ocupa a sua posição). Até p_limite pessoas (1 a 50).
create or replace function public.caca_ranking_publico(p_edicao text, p_limite int default 10)
 returns jsonb language sql stable security definer set search_path to 'public'
as $$
  select coalesce(jsonb_agg(jsonb_build_object('posicao', x.pos, 'apelido', x.apelido, 'casas', x.casas, 'extras', x.extras)
                            order by x.rn), '[]'::jsonb)
    from (select r.*, row_number() over (order by r.pos, r.apelido) rn
            from public.caca_ranking_v2(p_edicao) r where r.no_ranking) x
   where x.rn <= least(greatest(coalesce(p_limite, 10), 1), 50)
$$;

-- O mapa da pessoa. Mesmas chaves de mapa_ler (edicao, apelido, email, whatsapp, no_ranking, casas[]) mais o progresso novo:
-- total_casas, casas_validadas, faltam, extras, posicao (null enquanto não há casa validada), empatados.
-- casas[]: uma entrada por casa carimbada (todos os mapas da mesma pessoa), estado 'validada' | 'pendente' (falta avaliar).
create or replace function public.mapa_ler_v2(p_chave text)
 returns jsonb language plpgsql stable security definer set search_path to 'public'
as $$
declare m public.mapas_lover%rowtype; v_total int; v_me record; v_emp int := 0;
begin
  select * into m from public.mapas_lover where chave_hash = public.mapa_hash(p_chave);
  if m.id is null then return null; end if;
  select count(*) into v_total from public.participacoes pa
   where pa.edicao_codigo = m.edicao_codigo and pa.status_cadastro <> 'encerrado'
     and exists (select 1 from public.publicacoes pb where pb.participacao_id = pa.id and pb.vigente);
  select r.* into v_me from public.caca_ranking_v2(m.edicao_codigo) r where r.pessoa = m.email_norm;
  if v_me.pos is not null then
    select count(*)::int into v_emp from public.caca_ranking_v2(m.edicao_codigo) r where r.pos = v_me.pos;
  end if;
  return jsonb_build_object(
    'edicao', m.edicao_codigo, 'apelido', m.apelido, 'email', m.email_norm, 'whatsapp', m.whatsapp,
    'no_ranking', m.no_ranking,
    'total_casas', v_total, 'casas_validadas', coalesce(v_me.casas, 0), 'extras', coalesce(v_me.extras, 0),
    'faltam', greatest(v_total - coalesce(v_me.casas, 0), 0),
    'posicao', v_me.pos, 'empatados', v_emp,
    'casas', (select coalesce(jsonb_agg(jsonb_build_object(
                'slug', pa.slug_publico, 'carimbos', x.n, 'ultimo', x.ultimo,
                'liberado_em', x.ultimo + interval '12 hours',
                'avaliou', x.avaliou, 'estado', case when x.avaliou then 'validada' else 'pendente' end,
                'extras', case when x.avaliou then x.n - 1 else 0 end)
                order by x.ultimo desc), '[]'::jsonb)
                from (select k.participacao_id, count(*)::int n, max(k.criado_em) ultimo,
                             exists (select 1 from public.avaliacoes a where a.edicao_codigo = m.edicao_codigo
                                       and a.participacao_id = k.participacao_id and a.email_norm = m.email_norm) avaliou
                        from public.carimbos k join public.mapas_lover m2 on m2.id = k.mapa_id
                       where m2.edicao_codigo = m.edicao_codigo and m2.email_norm = m.email_norm and k.anulado_em is null
                       group by k.participacao_id) x
                join public.participacoes pa on pa.id = x.participacao_id));
end $$;

revoke all on function public.caca_ranking_publico(text, int) from public, anon, authenticated;
grant execute on function public.caca_ranking_publico(text, int) to anon, authenticated;
revoke all on function public.mapa_ler_v2(text) from public, anon, authenticated;
grant execute on function public.mapa_ler_v2(text) to anon, authenticated;

-- ---------------------------------------------------------------- painel (segredo)
-- Apuração com a regra nova. Só relatório: o sistema ainda NÃO guarda ganhador (isso é a etapa E3), então quem já ganhou
-- voucher é excluído à mão pela organização olhando a lista. Contato só com relatorio.ler.
--   · apuracoes: dias 7 a 11/11, corte 23h59 de Natal, top 10 por casas e extras (empate = mesma posição).
--   · sorteio_final: quem validou todas as casas; peso = 100 + extras.
--   · reservas: se faltar mapa completo, os 10 seguintes por casas e extras.
-- ponytail: datas e peso base (100) escritos aqui; a etapa E3 passa para configuração.
create or replace function public.get_caca_apuracao_v2(p_secret text, p_edicao text)
 returns jsonb language plpgsql stable security definer set search_path to 'public'
as $$
declare v_rel boolean; v_total int;
begin
  if not public.pode(p_secret, 'dado.ler') then raise exception 'nao_autorizado'; end if;
  v_rel := public.pode(p_secret, 'relatorio.ler');
  select count(*) into v_total from public.participacoes pa
   where pa.edicao_codigo = p_edicao and pa.status_cadastro <> 'encerrado'
     and exists (select 1 from public.publicacoes pb where pb.participacao_id = pa.id and pb.vigente);
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

revoke all on function public.get_caca_apuracao_v2(text, text) from public, anon, authenticated;
grant execute on function public.get_caca_apuracao_v2(text, text) to anon, authenticated;
